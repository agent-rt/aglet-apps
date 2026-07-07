// GitHub PR ingest —— 自动探测,三档凭据,**开箱即用(不强依赖 gh CLI)**:
//   1. gh CLI 已装且已登录(`gh auth status` ok)→ 用 gh CLI(开发者零配置)。
//   2. 否则 PAT(auth 里 github_token,用户在登录门贴)→ GitHub REST API 直连。
//   3. 都没有 → state.needs_auth=true → 宿主弹登录门(填 token)。
// (OAuth 路线待官方 client_id,见 docs/OAUTH.md;届时加 oauth 字段 + oauth.token。)
//
// 两条查询:review-requested:@me / author:@me,落 reviewed_by_me / authored_by_me 旗标。
// 同 PR 命中两条 → merge。dedup by pr_id="<owner/repo>#<number>"。本轮未命中 → 删。

const APP_ID = "gh-prs";

// ── 凭据探测 ─────────────────────────────────────────────────────────────────

/// gh CLI 已装且已登录?`gh auth status` 退 0 即可。未装(spawn 抛)→ false。
function ghCliReady() {
  try {
    const r = host.spawn("gh", ["auth", "status"]);
    return !!(r && r.ok);
  } catch (_e) {
    return false;
  }
}

function pat() {
  try { return aglet.secrets.get(APP_ID, "github_token").value || ""; } catch (_e) { return ""; }
}

function setState(ctx, path, v) { if (ctx && ctx.setStateAt) ctx.setStateAt(path, v); }

// ── gh CLI 路径 ──────────────────────────────────────────────────────────────

const CLI_FIELDS = "number,title,url,repository,author,state,isDraft,updatedAt,commentsCount,labels";

function viaCli(filter) {
  const r = host.spawn("gh", ["search", "prs", filter, "--state=open", "--json", CLI_FIELDS, "--limit", "100"]);
  if (!r.ok) throw new Error(`gh search ${filter} failed (code=${r.code}): ${(r.stderr || "").slice(0, 200)}`);
  return JSON.parse(r.stdout).map((pr) => ({
    pr_id: `${pr.repository.nameWithOwner}#${pr.number}`,
    number: pr.number,
    title: pr.title,
    url: pr.url,
    repo: pr.repository.nameWithOwner,
    author: (pr.author && pr.author.login) || "",
    state: pr.state,
    is_draft: !!pr.isDraft,
    comments_count: pr.commentsCount || 0,
    labels: (pr.labels || []).map((l) => l.name).join(", "),
    updated_at: pr.updatedAt,
  }));
}

// ── REST 路径(PAT)──────────────────────────────────────────────────────────

// search/issues 的 item 没有 nameWithOwner;从 repository_url
// "https://api.github.com/repos/OWNER/REPO" 末两段拼。
function repoFromUrl(u) {
  const parts = (u || "").split("/");
  if (parts.length < 2) return "";
  return parts[parts.length - 2] + "/" + parts[parts.length - 1];
}

async function viaRest(token, q) {
  const url = "https://api.github.com/search/issues?per_page=100&q=" + encodeURIComponent(q);
  const r = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "aglet",
    },
  });
  if (!r.ok) throw new Error(`GitHub HTTP ${r.status}`);
  const data = r.json();
  return (data.items || []).map((it) => ({
    pr_id: `${repoFromUrl(it.repository_url)}#${it.number}`,
    number: it.number,
    title: it.title || "",
    url: it.html_url || "",
    repo: repoFromUrl(it.repository_url),
    author: (it.user && it.user.login) || "",
    state: it.state || "open",
    is_draft: !!it.draft,
    comments_count: it.comments || 0,
    labels: (it.labels || []).map((l) => (typeof l === "string" ? l : l.name)).join(", "),
    updated_at: it.updated_at || "",
  }));
}

// ── upsert / dedup(凭据无关)─────────────────────────────────────────────────

function upsert(row, kind, seen, counters) {
  seen.add(row.pr_id);
  let reviewed = kind === "review";
  let authored = kind === "mine";
  const existing = aglet.data.list(APP_ID, "prs", { where: { pr_id: row.pr_id }, limit: 1 });
  if (existing.items.length > 0) {
    const ex = existing.items[0].data;
    if (ex.reviewed_by_me) reviewed = true;
    if (ex.authored_by_me) authored = true;
  }
  const data = { ...row, reviewed_by_me: reviewed, authored_by_me: authored };
  if (existing.items.length > 0) {
    aglet.data.update(APP_ID, "prs", existing.items[0].id, data);
    counters.updated++;
  } else {
    aglet.data.create(APP_ID, "prs", data);
    counters.added++;
  }
}

export default {
  async ingest(_args, ctx) {
    // 自动探测:gh CLI > PAT > needs_auth。
    const cli = ghCliReady();
    const token = cli ? "" : pat();
    if (!cli && !token) {
      setState(ctx, "/state/needs_auth", true); // 宿主据此弹登录门(填 token)
      return { needs_auth: true };
    }
    setState(ctx, "/state/needs_auth", false);
    setState(ctx, "/state/source", cli ? "gh-cli" : "token");

    let reviews, mine;
    try {
      if (cli) {
        reviews = viaCli("--review-requested=@me");
        mine = viaCli("--author=@me");
      } else {
        reviews = await viaRest(token, "is:pr is:open review-requested:@me");
        mine = await viaRest(token, "is:pr is:open author:@me");
      }
    } catch (e) {
      setState(ctx, "/state/sync_error", String((e && e.message) || e).slice(0, 200));
      return { error: true };
    }
    setState(ctx, "/state/sync_error", "");

    const counters = { added: 0, updated: 0, removed: 0 };
    const seen = new Set();
    for (const pr of reviews) upsert(pr, "review", seen, counters);
    for (const pr of mine) upsert(pr, "mine", seen, counters);

    const all = aglet.data.list(APP_ID, "prs", { limit: 500 });
    for (const row of all.items) {
      if (!seen.has(row.data.pr_id)) {
        aglet.data.delete(APP_ID, "prs", row.id);
        counters.removed++;
      }
    }
    return { reviewed: reviews.length, mine: mine.length, ...counters };
  },
};
