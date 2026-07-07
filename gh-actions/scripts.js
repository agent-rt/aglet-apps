// GitHub Actions —— 查看 + 执行,按 repo 组织(自动发现你**管理的**仓)。
//
// 凭据(同 gh app 探测,统一走 REST + token):
//   1. auth.github_token(PAT,登录门贴)→ 直接用。
//   2. 否则 gh CLI 已登录 → `gh auth token` 取它的 token(scope 已全)。
//   3. 都没有 → state.needs_auth=true → 宿主弹登录门。
//
// 范围(关键):默认只取**我能 push/admin/maintain 的仓**(= 我管理/参与的),
// 滤掉组织里我只读的一堆仓(用户反馈:org 下很多仓我不管理,别全量)。设置
// show_all_repos=true 可放开;repos 手动 pin 可覆盖。
//
// 自动发现 = /user/repos(按 pushed 排)→ 权限过滤 → 取前 N → 逐仓查 workflows,
// 只留有 ≥1 个的仓。维护三表:repos(每仓一行 + 聚合)/ workflows / runs。
//
// 后台 job:
//   discover(30min):repos → workflows + runs + repo 聚合。首 tick 即跑。
//   refreshRuns(2min):刷已知仓的 runs + repo 的 last_status。
//
// 执行(UI 按钮):rerunRun / cancelRun / runWorkflow。点击即 human-in-loop。
//
// 注:fetchAll GET-only 无 header(见 scripts-fetch-concurrency),GitHub 要 Authorization,
// 故串行 ghGet(只取我管理的仓后,数量通常很小,后台跑可接受)。

const APP_ID = "gh-actions";
const API = "https://api.github.com";

// ── 凭据 ─────────────────────────────────────────────────────────────────────

function ghCliReady() {
  try { const r = host.spawn("gh", ["auth", "status"]); return !!(r && r.ok); } catch (_e) { return false; }
}
function ghCliToken() {
  try { const r = host.spawn("gh", ["auth", "token"]); return r && r.ok ? (r.stdout || "").trim() : ""; } catch (_e) { return ""; }
}
function pat() {
  try { return aglet.secrets.get(APP_ID, "github_token").value || ""; } catch (_e) { return ""; }
}
function resolveToken() {
  const p = pat();
  if (p) return { token: p, source: "token" };
  if (ghCliReady()) { const t = ghCliToken(); if (t) return { token: t, source: "gh-cli" }; }
  return { token: "", source: "" };
}

function cfg(key) { try { return aglet.settings.get(APP_ID, key).value || ""; } catch (_e) { return ""; } }
function cfgBool(key) { const v = cfg(key); return v === true || v === "true" || v === 1; }
function setState(ctx, path, v) { if (ctx && ctx.setStateAt) ctx.setStateAt(path, v); }
function msg(e) { return String((e && e.message) || e).slice(0, 200); }
function shortName(full) { const i = full.indexOf("/"); return i >= 0 ? full.slice(i + 1) : full; }

// ── REST ─────────────────────────────────────────────────────────────────────

function headers(token) {
  return {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "User-Agent": "aglet",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}
async function ghGet(token, path) {
  const r = await fetch(API + path, { headers: headers(token) });
  if (!r.ok) throw new Error(`GitHub HTTP ${r.status} GET ${path}`);
  return r.json();
}
async function ghPost(token, path, bodyObj) {
  const r = await fetch(API + path, { method: "POST", headers: headers(token), body: JSON.stringify(bodyObj || {}) });
  return { ok: r.ok, status: r.status, body: r.body || "" };
}

// ── 映射 ─────────────────────────────────────────────────────────────────────

function runEmoji(status, conclusion) {
  if (status !== "completed") return status === "in_progress" ? "🟡" : "⏳";
  switch (conclusion) {
    case "success": return "✅";
    case "cancelled": return "⏹";
    case "skipped": return "⏭";
    default: return "❌";
  }
}
function mapRun(rn, repo) {
  const status = rn.status || "";
  const conclusion = rn.conclusion || "";
  const active = status === "in_progress" || status === "queued" ||
    status === "requested" || status === "waiting" || status === "pending";
  return {
    run_id: String(rn.id),
    repo,
    workflow_name: rn.name || "",
    status,
    conclusion,
    branch: rn.head_branch || "",
    event: rn.event || "",
    actor: (rn.actor && rn.actor.login) || (rn.triggering_actor && rn.triggering_actor.login) || "",
    run_number: rn.run_number || 0,
    html_url: rn.html_url || "",
    updated_at: rn.updated_at || rn.created_at || "",
    can_rerun: status === "completed",
    can_cancel: active,
    state_emoji: runEmoji(status, conclusion),
  };
}
function mapWorkflow(w, repo, defaultBranch) {
  return {
    wf_id: String(w.id),
    repo,
    name: w.name || w.path || "",
    state: w.state || "",
    default_branch: defaultBranch,
    path: w.path || "",
    html_url: w.html_url || "",
  };
}

// ── upsert / prune ────────────────────────────────────────────────────────────

function upsertBy(collection, key, row, seen, counters) {
  seen.add(row[key]);
  const ex = aglet.data.list(APP_ID, collection, { where: { [key]: row[key] }, limit: 1 });
  if (ex.items.length > 0) {
    aglet.data.update(APP_ID, collection, ex.items[0].id, row);
    counters.updated++;
  } else {
    aglet.data.create(APP_ID, collection, row);
    counters.added++;
  }
}
// 删指定 key-set 内本轮未命中的行(只动 repoSet 内的 runs → execute 单仓刷新安全)。
function pruneStaleRuns(repoSet, seen, counters) {
  const all = aglet.data.list(APP_ID, "runs", { limit: 1000 });
  for (const row of all.items) {
    if (repoSet.has(row.data.repo) && !seen.has(row.data.run_id)) {
      aglet.data.delete(APP_ID, "runs", row.id);
      counters.removed++;
    }
  }
}
// 删掉不再属于活跃仓的 runs/workflows/repos(仓被移出发现范围)。
function pruneOrphans(activeRepoNames, counters) {
  const active = new Set(activeRepoNames);
  for (const coll of ["runs", "workflows", "repos"]) {
    const all = aglet.data.list(APP_ID, coll, { limit: 1000 });
    for (const row of all.items) {
      if (!active.has(row.data.repo)) { aglet.data.delete(APP_ID, coll, row.id); counters.removed++; }
    }
  }
}

// ── 仓列表 ───────────────────────────────────────────────────────────────────

// 候选仓:手动 pin 覆盖;否则 /user/repos 按 pushed 排,**权限过滤(默认只留我能写的)**,取前 N。
// 返回 [{ name, owner, default_branch }]。
async function candidateRepos(token) {
  const pinned = cfg("repos").split("\n").map((s) => s.trim()).filter(Boolean);
  if (pinned.length > 0) {
    // fetch 真异步 → 各 pin 仓并发拉(Promise.all)。
    return await Promise.all(pinned.map(async (name) => {
      let db = "main"; let owner = name.split("/")[0] || "";
      try { const r = await ghGet(token, `/repos/${name}`); db = r.default_branch || "main"; owner = (r.owner && r.owner.login) || owner; } catch (_e) {}
      return { name, owner, default_branch: db };
    }));
  }
  const max = Number(cfg("max_repos")) || 30;
  const showAll = cfgBool("show_all_repos");
  const repos = await ghGet(token, "/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member");
  const filtered = (repos || []).filter((r) => {
    if (showAll) return true;
    const p = r.permissions || {};
    return !!(p.admin || p.maintain || p.push); // 我管理/能 push 的仓(滤掉只读的 org 仓)
  });
  return filtered.slice(0, max).map((r) => ({
    name: r.full_name,
    owner: (r.owner && r.owner.login) || "",
    default_branch: r.default_branch || "main",
  }));
}

// workflows 表里去重仓(refreshRuns 用)。
function knownRepos() {
  const wfs = aglet.data.list(APP_ID, "workflows", { limit: 1000 });
  const s = new Set();
  for (const w of wfs.items) s.add(w.data.repo);
  return [...s];
}

// 当前登录用户 login(判「我近期有活动」用)。失败返空串。
async function myLogin(token) {
  try { return (await ghGet(token, "/user")).login || ""; } catch (_e) { return ""; }
}

// 拉一仓最近 runs(≤15)→ mapped(API 已按最近优先,runs[0]=最新)。不 upsert。
async function fetchRepoRuns(token, repo) {
  const data = await ghGet(token, `/repos/${repo}/actions/runs?per_page=15`);
  return (data.workflow_runs || []).map((rn) => mapRun(rn, repo));
}
// 拉 + upsert(refreshRuns / execAndRefresh 用)。返回 mapped runs。
async function syncRepoRuns(token, repo, seen, counters) {
  const runs = await fetchRepoRuns(token, repo);
  for (const r of runs) upsertBy("runs", "run_id", r, seen, counters);
  return runs;
}
// 该仓最近 runs 里有没有「我」触发/推送(mapRun.actor 已是 actor.login||triggering_actor.login)。
function activeForMe(me, owner, runs) {
  if (me && owner === me) return true; // 我自己的仓总留
  return !!me && runs.some((r) => r.actor && r.actor === me);
}

// 写/更新 repo 聚合行(name/owner/wf_count/last_status/last_run_at)。
function upsertRepoRow(repoObj, wfCount, runs, seen, counters) {
  const top = runs.length > 0 ? runs[0] : null;
  upsertBy("repos", "repo", {
    repo: repoObj.name,
    owner: repoObj.owner,
    name_short: shortName(repoObj.name),
    default_branch: repoObj.default_branch,
    wf_count: wfCount,
    last_status: top ? top.state_emoji : "",
    last_run_at: top ? top.updated_at : "",
    actions_url: `https://github.com/${repoObj.name}/actions`,
  }, seen, counters);
}
// 只更新已存在 repo 行的 last_status/last_run_at(refreshRuns 用,不碰 wf_count)。
function updateRepoStatus(repo, runs) {
  if (runs.length === 0) return;
  const rows = aglet.data.list(APP_ID, "repos", { where: { repo }, limit: 1 });
  if (rows.items.length === 0) return;
  const top = runs[0];
  aglet.data.update(APP_ID, "repos", rows.items[0].id, { last_status: top.state_emoji, last_run_at: top.updated_at });
}

// ── handlers ──────────────────────────────────────────────────────────────────

export default {
  // 发现仓 + workflows + runs + repo 聚合。每 30 分钟 + 启动即跑。
  async discover(_args, ctx) {
    const { token, source } = resolveToken();
    if (!token) { setState(ctx, "/state/needs_auth", true); return { needs_auth: true }; }
    setState(ctx, "/state/needs_auth", false);
    setState(ctx, "/state/source", source);

    let repos;
    try { repos = await candidateRepos(token); } catch (e) { setState(ctx, "/state/sync_error", msg(e)); return { error: true }; }

    const showAll = cfgBool("show_all_repos");
    const me = showAll ? "" : await myLogin(token); // 活动过滤需要我的 login(showAll 跳过)

    const counters = { added: 0, updated: 0, removed: 0 };
    const seenWf = new Set();
    const seenRuns = new Set();
    const seenRepos = new Set();
    const active = []; // 命中仓名

    for (const r of repos) {
      // 1) workflows:没有 → 该仓没 Actions,跳过。
      let wfs;
      try {
        const data = await ghGet(token, `/repos/${r.name}/actions/workflows?per_page=100`);
        wfs = (data.workflows || []).filter((w) => w.state === "active").map((w) => mapWorkflow(w, r.name, r.default_branch));
      } catch (_e) { continue; }
      if (wfs.length === 0) continue;

      // 2) runs:取来既判「我近期有活动」也做聚合(showAll 时不判,全留)。
      let runs = [];
      try { runs = await fetchRepoRuns(token, r.name); } catch (_e) {}
      if (!showAll && !activeForMe(me, r.owner, runs)) continue; // 我没参与 → 不入库

      // 3) 命中 → 落 workflows + runs + repo 聚合行。
      active.push(r.name);
      for (const w of wfs) upsertBy("workflows", "wf_id", w, seenWf, counters);
      for (const rn of runs) upsertBy("runs", "run_id", rn, seenRuns, counters);
      upsertRepoRow(r, wfs.length, runs, seenRepos, counters);
    }

    // 删本轮未命中的 workflows + runs(仓内被移除)+ 孤儿仓(不再命中)。
    const allWf = aglet.data.list(APP_ID, "workflows", { limit: 1000 });
    for (const row of allWf.items) {
      if (!seenWf.has(row.data.wf_id)) { aglet.data.delete(APP_ID, "workflows", row.id); counters.removed++; }
    }
    pruneStaleRuns(new Set(active), seenRuns, counters);
    pruneOrphans(active, counters);

    setState(ctx, "/state/sync_error", "");
    return { repos: active.length, ...counters };
  },

  // 刷已知仓的 runs + repo 的 last_status(高频)。
  async refreshRuns(_args, ctx) {
    const { token } = resolveToken();
    if (!token) { setState(ctx, "/state/needs_auth", true); return { needs_auth: true }; }
    const repos = knownRepos();
    if (repos.length === 0) return { repos: 0 };

    const counters = { added: 0, updated: 0, removed: 0 };
    const seen = new Set();
    const repoSet = new Set(repos);
    for (const repo of repos) {
      try { const runs = await syncRepoRuns(token, repo, seen, counters); updateRepoStatus(repo, runs); } catch (_e) {}
    }
    pruneStaleRuns(repoSet, seen, counters);
    setState(ctx, "/state/sync_error", "");
    return { repos: repos.length, ...counters };
  },

  // ── 导航(钻入/返回:列表 vs 详情两态)────────────────────────────────────────
  // TSX 编译器只可靠支持 `{state.x && ...}` 正向真值守卫(`!state.x` / `==` 作 JSX
  // 守卫会编出无 when 的 If → web 渲染器照显、native 渲染器隐藏 → 实测列表整片空白)。
  // 故用 browsing(真值布尔)守列表、repo(非空字符串真值)守详情,两态都正向;
  // 切换要同时改两个 state,经 handler 原子设置(onClick 单调用 + ctx.setStateAt)。
  async openRepo(args, ctx) {
    setState(ctx, "/state/repo", (args && args.repo) || "");
    setState(ctx, "/state/browsing", false);
    return { ok: true };
  },
  async backToList(_args, ctx) {
    setState(ctx, "/state/repo", "");
    setState(ctx, "/state/browsing", true);
    return { ok: true };
  },

  // ── 执行(按钮触发)──────────────────────────────────────────────────────────

  async rerunRun(args, ctx) {
    return execAndRefresh(ctx, args && args.repo, () =>
      ghPost(resolveToken().token, `/repos/${args.repo}/actions/runs/${args.run_id}/rerun`));
  },
  async cancelRun(args, ctx) {
    return execAndRefresh(ctx, args && args.repo, () =>
      ghPost(resolveToken().token, `/repos/${args.repo}/actions/runs/${args.run_id}/cancel`));
  },
  async runWorkflow(args, ctx) {
    const ref = (args && args.ref) || "main";
    return execAndRefresh(ctx, args && args.repo, () =>
      ghPost(resolveToken().token, `/repos/${args.repo}/actions/workflows/${args.wf_id}/dispatches`, { ref }));
  },
};

// 执行一个副作用调用 + 立即刷新该仓 runs/聚合回填;失败写 /state/action_error。
async function execAndRefresh(ctx, repo, doPost) {
  setState(ctx, "/state/action_error", "");
  const { token } = resolveToken();
  if (!token) { setState(ctx, "/state/needs_auth", true); return { needs_auth: true }; }
  let res;
  try { res = await doPost(); } catch (e) { setState(ctx, "/state/action_error", msg(e)); return { error: true }; }
  if (!res.ok) {
    setState(ctx, "/state/action_error", `GitHub HTTP ${res.status}`); // 422 常见:无 workflow_dispatch / 不可重跑
    return { error: true, status: res.status };
  }
  if (repo && token) {
    const seen = new Set();
    const counters = { added: 0, updated: 0, removed: 0 };
    try {
      const runs = await syncRepoRuns(token, repo, seen, counters);
      pruneStaleRuns(new Set([repo]), seen, counters);
      updateRepoStatus(repo, runs);
    } catch (_e) {}
  }
  return { ok: true };
}
