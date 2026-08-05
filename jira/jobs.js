// jira jobs.js —— Layer 2 后台任务（宿主 per-invoke，data-only）。
//
// 数据流：ingest job → 读凭据(settings site/email + secrets jira_token) → Atlassian
// Cloud REST API 拉「分配给我」的 issue(JQL assignee=currentUser()) → upsert `issues`
// (by_field key，原子去重) + 写一行 `sync` 记同步结果。**全走 SQLite，不碰 /state**
// （data-only 门会拒 setState；且 manifest.state 声明的顶层 key 会被重播种，写不持久）。
//
// UI 纯数据驱动：错误横幅读 `sync` 单行，看板读 `issues` 三桶。未配置凭据时宿主的
// 通用 auth 门（manifest.auth required 未填）自己会挡在前面，app 不手搓引导页。
//
// 认证：Basic base64(email:api_token)。token 在平台 Keychain(secrets:*)，site/email 在
// settings —— 都由宿主原生设置面写入，本脚本只读。

// status.statusCategory.key 是 Jira 官方三类:new / indeterminate / done —— 精确分桶
// (比按状态名关键词靠谱)。缺失时回退关键词。
function bucketOf(catKey, statusName) {
  if (catKey === "done") return "done";
  if (catKey === "new") return "todo";
  if (catKey === "indeterminate") return "doing";
  const s = (statusName || "").toLowerCase();
  if (/(done|fixed|closed|resolved|released|complete|cancel|reject)/.test(s)) return "done";
  if (/(to ?do|backlog|icebox|open|new|investigat|ready|待|未)/.test(s)) return "todo";
  return "doing";
}

function typeOf(key) {
  const p = ((key || "").split("-")[0] || "").toUpperCase();
  if (p === "INC") return "incident";
  if (p === "PJM") return "project";
  return "dev";
}

// Jira ISO("2024-08-05T16:19:48.597+0900")→ "2024-08-05 16:19"(切片,不走 Date 解析)。
function fmtIso(iso) {
  if (!iso || iso.length < 16) return iso || "";
  return iso.slice(0, 10) + " " + iso.slice(11, 16);
}

// 截止日(fields.duedate)是**纯日期** "YYYY-MM-DD"、无时区 → 按**本地日终**判逾期
// (当天 23:59 前不算迟)。已完成的桶不标逾期(事后追责没意义)。
// 拆成两个互斥布尔给 UI 用:TSX 守卫只有正向可靠(否定式会编出无 when 的 If),
// 所以「逾期」「未逾期」各给一个 flag,而不是让 ui.tsx 去写 !overdue。
function dueInfo(due, bucket) {
  if (!due) return { due: "", due_overdue: false, due_ok: false };
  const end = new Date(`${due}T23:59:59`).getTime();
  const overdue = bucket !== "done" && Number.isFinite(end) && end < Date.now();
  return { due, due_overdue: overdue, due_ok: !overdue };
}

function clockText(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

// settings/secrets 读取是同步的（宿主已绑 app_id，不手传）。缺失 → null.value → "".
function readCreds() {
  let site = "", email = "", token = "";
  try { site = aglet.settings.get("site").value || ""; } catch (_e) {}
  try { email = aglet.settings.get("email").value || ""; } catch (_e) {}
  try { token = aglet.secrets.get("jira_token").value || ""; } catch (_e) {}
  site = site.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return { site, email, token };
}

// `sync` 单行（by_field id，恒 "state"）= UI 读的同步状态。has_error 供 ui.tsx 正向守卫
// （守卫只有正向 `{item.has_error && ...}` 可靠，否则会编出无 when 的 If）。
async function writeSync(patch) {
  try {
    await aglet.dispatch("data.upsert", {
      collection: "sync",
      by_field: "id",
      data: Object.assign({ id: "state", ts: Date.now() }, patch),
    });
  } catch (e) {
    console.warn("[jira] upsert sync failed:", String(e));
  }
}

export default {
  async ingest(_args, _ctx) {
    const { site, email, token } = readCreds();
    if (!site || !email || !token) {
      // 未配置：宿主 auth 门已挡在 UI 前面，这里只记状态、不联网。
      await writeSync({ has_error: false, err: "", needs_auth: true, connected_email: "", refreshed_text: "" });
      return { needs_auth: true };
    }

    let data;
    try {
      const auth = "Basic " + btoa(`${email}:${token}`);
      // ⚠️ 宿主 fetch 返回 Promise —— 必须 await（漏了会拿到 Promise，r.ok 是 undefined，
      // 报出 "Jira HTTP undefined" 这种假错）。r.json() 反而是同步的。
      const r = await fetch(`https://${site}/rest/api/3/search/jql`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          jql: "assignee = currentUser() ORDER BY updated DESC",
          fields: ["summary", "status", "created", "updated", "duedate"],
          maxResults: 100,
        }),
      });
      if (r.status === 401 || r.status === 403) {
        console.warn(`[jira] auth rejected: HTTP ${r.status}`);
        await writeSync({ has_error: true, err: `HTTP ${r.status}`, needs_auth: true, connected_email: email });
        return { needs_auth: true };
      }
      if (!r.ok) throw new Error(`Jira HTTP ${r.status}`);
      data = r.json();
    } catch (e) {
      const msg = String((e && e.message) || e).slice(0, 200);
      console.warn("[jira] ingest failed:", msg);
      await writeSync({ has_error: true, err: msg, needs_auth: false, connected_email: email });
      return { error: true };
    }

    const issues = (data && data.issues) || [];
    const seen = new Set();
    let added = 0, updated = 0, removed = 0;
    for (const it of issues) {
      const key = it.key;
      if (!key) continue;
      seen.add(key);
      const fld = it.fields || {};
      const statusName = (fld.status && fld.status.name) || "";
      const cat = (fld.status && fld.status.statusCategory && fld.status.statusCategory.key) || "";
      const bucket = bucketOf(cat, statusName);
      const row = Object.assign({
        key,
        summary: fld.summary || "",
        status: statusName,
        bucket,
        type: typeOf(key),
        url: `https://${site}/browse/${key}`,
        created: fmtIso(fld.created),
        updated: fmtIso(fld.updated),
      }, dueInfo(fld.duedate, bucket));
      // 原子 upsert by key —— 取代旧的 list-then-create/update（两次往返 + 竞态）。
      try {
        const res = await aglet.dispatch("data.upsert", { collection: "issues", by_field: "key", data: row });
        if (res && res.upserted === "created") added++; else updated++;
      } catch (e) {
        console.warn(`[jira] upsert issue ${key} failed:`, String(e));
      }
    }

    // 已不在「分配给我」结果里的 → 删（data.list 同步，写操作走 dispatch）。
    try {
      const all = aglet.data.list("issues", { limit: 1000 });
      for (const rec of (all && all.items) || []) {
        const k = rec.data && rec.data.key;
        if (k && !seen.has(k)) {
          await aglet.dispatch("data.delete", { collection: "issues", id: rec.id });
          removed++;
        }
      }
    } catch (e) {
      console.warn("[jira] prune failed:", String(e));
    }

    const ts = Date.now();
    await writeSync({
      has_error: false, err: "", needs_auth: false,
      connected_email: email, refreshed_text: clockText(ts),
    });
    return { total: issues.length, added, updated, removed };
  },
};
