// tokstat scripts.js — AI coding token usage (data-driven, N providers).
//
// 数据流：refresh job → 对每个「已启用」provider 读凭据(aicreds 插件) → app 内 HTTP
// 拉用量 → upsert `current`(每 provider 一行, by_field source, 含 enabled 标志) +
// append `samples`。`current` 是**持久缓存**：
//   - 未启用：只标 enabled=false(不删行、保留缓存值);弹层按 enabled 过滤隐藏,
//     菜单栏按 ui.tsx 守卫 `enable_X && tray_X` 隐藏。
//   - 瞬时失败(429/网断/未登录)：保留上次真值;current 缺失但有历史 sample → 从最新
//     sample 重建(covers 旧版本删过 current 的情况),再启用即可见。
//   - 弹层：<DataList collection=current where enabled=true orderBy order> 数据驱动渲染。
//   - 菜单栏：TrayLabel 用 <Image logo>+<Progress bar> 直接读 `current`(见 ui.tsx)。
//   - 全走 SQLite(walker 可读)，不用 setState。
//
// 加新 provider(gemini…)：PROVIDERS 加一条 + aicreds 支持其 token + settings 两组
// 各加一个开关 + ui.tsx 加一组 logo/bar 与弹层块。
//
// Layer 2 jobs.js（宿主 per-invoke，data-only）:default export = { refresh }（object 形态）。
// 顶层 helper 用**全局 app-bound aglet**（宿主注入已绑 app_id，dispatch/now/plugins/data/settings
// 不用手传 app_id）——与会话同一套授权，唯一区别是 setState 被 data-only 门拒（本 app 全走 SQLite）。

// ── 展示格式化 ─────────────────────────────────────────────────────────────

function pctText(pct) { return typeof pct === "number" ? `${pct}%` : "—"; }
function numOr0(pct) { return typeof pct === "number" ? pct : 0; }

// 颜色不再 bake:阈值分档(<80 主色/系统、80–95 橙、≥95 红)与主色都在 ui.tsx
// 用 <Progress bands>/<Meter bands> + coalesce(primary_color, "primary") 渲染时算,
// 故改主色/用量即时同步(无需重算 provider),空主色 → "primary" token → 跟随系统强调色。

// 剩余时长 → 语言中立紧凑格式：`45s` `12m` `3h 28m` `3h` `2d 5h` `4d`。
// 前缀("重置还剩"/"resets in"/"リセットまで")由 ui.tsx 的 {t.resets} 按 locale 补。
function untilText(ms) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return null;
  const s = Math.max(0, Math.round((ms - Date.now()) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) {
    const mm = m % 60;
    return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
  }
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh > 0 ? `${d}d ${hh}h` : `${d}d`;
}

function resetLine(ms) { return untilText(ms) || "—"; }

// settings bool(存成 "true"/"false" 串或 bool)。未设 = 默认。
function boolSetting(key, def) {
  try {
    const v = aglet.settings.get(key).value;
    if (v === undefined || v === null || v === "") return def;
    return v === true || v === "true";
  } catch (_e) { return def; }
}

// settings number(存成串)。未设/非数 = 默认。
function numSetting(key, def) {
  try {
    const v = aglet.settings.get(key).value;
    if (v === undefined || v === null || v === "") return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  } catch (_e) { return def; }
}

// 用量阈值通知(即时:notifications.schedule 省 at)。文案语言中立(scripts 无 t()):
// 品牌 label + 窗口 emoji(⏱会话/📅每周)+ 百分比 + ↺重置时间。id 稳定 → 重发替换不堆叠。
async function warnNotify(ctx, p, win, emoji, pct, resetText) {
  try {
    await aglet.dispatch("notifications.schedule", {
      id: `warn-${p.id}-${win}`,
      title: `${p.label} ${emoji} ${pct}%`,
      body: resetText && resetText !== "—" ? `↺ ${resetText}` : "",
    });
  } catch (e) {
    console.warn(`[tokstat] notify(${p.id},${win}) failed:`, String(e));
  }
}

// ── 凭据 + HTTP ────────────────────────────────────────────────────────────

// aicreds 插件：只读凭据 → { access_token, account_id? }。读不到(未登录)返回 null。
async function readCred(ctx, provider) {
  try {
    const c = await aglet.plugins.aicreds.read({ provider });
    if (c && typeof c.access_token === "string" && c.access_token) return c;
    return null;
  } catch (e) {
    console.warn(`[tokstat] aicreds.read(${provider}) failed:`, String(e));
    return null;
  }
}

// 异步 fetch(宿主 fetch 现返回 Promise)。429/非2xx/网断/body 非预期 → { transient:true }。
async function getJson(url, headers) {
  let r;
  try { r = await fetch(url, { headers }); }
  catch (e) { console.warn(`[tokstat] fetch ${url} threw:`, String(e)); return { transient: true, err: "network" }; }
  if (r.status === 429 || !r.ok) {
    console.warn(`[tokstat] fetch ${url} → HTTP ${r.status}`); // 异常处理:transient 非 2xx 也 log(不再静默)
    return { transient: true, status: r.status, err: `HTTP ${r.status}` };
  }
  let d;
  try { d = r.json(); } catch (e) { console.warn(`[tokstat] ${url} body not JSON:`, String(e)); return { transient: true, err: "bad-body" }; }
  if (!d || d.error) { console.warn(`[tokstat] ${url} body error:`, JSON.stringify(d?.error ?? null)); return { transient: true, err: "api-error" }; }
  return { ok: true, data: d };
}

// Claude：{ utilization(%), resets_at(ISO) } → { used_pct, resets_at_ms }。
function claudeWindow(w) {
  if (!w) return {};
  const pct = typeof w.utilization === "number" ? Math.round(w.utilization) : undefined;
  const ms = typeof w.resets_at === "string" ? Date.parse(w.resets_at) : NaN;
  return { used_pct: pct, resets_at_ms: Number.isFinite(ms) ? ms : undefined };
}

async function fetchClaude(cred) {
  if (!cred) return { needs_auth: true };
  const res = await getJson("https://api.anthropic.com/api/oauth/usage", {
    Authorization: "Bearer " + cred.access_token,
    Accept: "application/json",
    "User-Agent": "tokstat",
  });
  if (res.status === 401 || res.status === 403) return { needs_auth: true }; // token 过期/失效 → 提示重登
  if (!res.ok) return res;
  const d = res.data;
  if (!d.five_hour && !d.seven_day) return { transient: true };
  return { ok: true, session: claudeWindow(d.five_hour), weekly: claudeWindow(d.seven_day) };
}

// Codex：{ used_percent(%), reset_at|resets_at(epoch 秒) } → { used_pct, resets_at_ms }。
function codexWindow(w) {
  if (!w) return {};
  const pct = typeof w.used_percent === "number" ? Math.round(w.used_percent) : undefined;
  const secs = typeof w.reset_at === "number" ? w.reset_at
    : (typeof w.resets_at === "number" ? w.resets_at : undefined);
  return { used_pct: pct, resets_at_ms: secs !== undefined ? secs * 1000 : undefined };
}

async function fetchCodex(cred) {
  if (!cred) return { needs_auth: true };
  const headers = {
    Authorization: "Bearer " + cred.access_token,
    Accept: "application/json",
    "User-Agent": "tokstat",
  };
  if (cred.account_id) headers["ChatGPT-Account-Id"] = cred.account_id;
  const res = await getJson("https://chatgpt.com/backend-api/wham/usage", headers);
  if (res.status === 401 || res.status === 403) return { needs_auth: true }; // token 过期/失效 → 提示重登
  if (!res.ok) return res;
  const rl = res.data.rate_limit;
  if (!rl) return { transient: true };
  // 不按位置(primary/secondary)认窗:Codex 2026-07 去掉 5h 限制后 primary_window 变成周窗、
  // secondary_window=null,位置假设会张冠李戴(把周数据当 session、weekly 读到 null 恒 0)。
  // 改按 limit_window_seconds 归类:≤6h → session、否则 → weekly;缺失的窗 → 该侧留空(不渲染)。
  // 第一性:读窗口本身代表多长,别假设它在哪个槽。窗口若都在则各归其位,与 Claude 语义一致。
  let session, weekly;
  for (const w of [rl.primary_window, rl.secondary_window]) {
    if (!w || typeof w.limit_window_seconds !== "number") continue;
    if (w.limit_window_seconds <= 6 * 3600) session = codexWindow(w);
    else weekly = codexWindow(w);
  }
  return { ok: true, session, weekly };
}

// ── Provider 注册表 ────────────────────────────────────────────────────────
// 加 provider：加一条 {id, label, abbrev, order, fetch} + aicreds 支持 id 的 token
// + settings 两组各加 enable_<id> / tray_<id> 开关。

const PROVIDERS = [
  { id: "claude", label: "Claude", abbrev: "CL", order: 1, fetch: fetchClaude },
  { id: "codex", label: "Codex", abbrev: "CX", order: 2, fetch: fetchCodex },
];

// ── 入库 ───────────────────────────────────────────────────────────────────

// 刷新时刻 → 本地 HH:MM(绝对时间,不随时间变旧;前缀「更新于」由 ui.tsx {t.updated} 按 locale 补)。
function clockText(ms) {
  const d = new Date(typeof ms === "number" ? ms : Date.now());
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

async function upsertProvider(p, side, ts, ctx) {
  const sess = side.session ?? {};
  const week = side.weekly ?? {};
  const sPct = sess.used_pct;
  const wPct = week.used_pct;

  // 阈值通知去重:读上次 current 的 notified_* 标志,过阈值时通知一次;跌回阈值下(如窗口
  // 重置用量归零)→ 复位标志,下次再越线可再通知。标志随 row 存回(否则每次 upsert 会丢)。
  let old = {};
  try {
    const r = aglet.data.list("current", { where: { source: p.id }, limit: 1 });
    if (r && r.items && r.items.length) old = r.items[0].data;
  } catch (_e) {}
  let nS = !!old.notified_session;
  let nW = !!old.notified_weekly;
  if (boolSetting("notify_enabled", true)) {
    const thr = numSetting("notify_at", 90);
    if (typeof sPct === "number") {
      if (sPct >= thr) { if (!nS) { await warnNotify(ctx, p, "session", "⏱", Math.round(sPct), resetLine(sess.resets_at_ms)); nS = true; } }
      else nS = false;
    }
    if (typeof wPct === "number") {
      if (wPct >= thr) { if (!nW) { await warnNotify(ctx, p, "weekly", "📅", Math.round(wPct), resetLine(week.resets_at_ms)); nW = true; } }
      else nW = false;
    }
  }

  const row = {
    source: p.id,
    label: p.label,
    abbrev: p.abbrev,
    order: p.order,
    ts,
    refreshed_text: clockText(ts),
    enabled: true,
    ok: true,
    needs_auth: false,
    notified_session: nS,
    notified_weekly: nW,
    err: "",
    // 该 provider 是否有 session(短)窗:Codex 2026-07 去掉 5h 后只剩周窗 → false,UI 据此
    // 隐藏 session 行(popover 是 DataList 单模板迭代,只能数据驱动隐藏,正向守卫见 ui.tsx)。
    has_session: typeof sPct === "number",
    session_pct: numOr0(sPct),
    session_pct_text: pctText(sPct),
    session_reset_text: resetLine(sess.resets_at_ms),
    weekly_pct: numOr0(wPct),
    weekly_pct_text: pctText(wPct),
    weekly_reset_text: resetLine(week.resets_at_ms),
  };
  try {
    await aglet.dispatch("data.upsert", { collection: "current", by_field: "source", data: row });
  } catch (e) {
    console.warn(`[tokstat] upsert current(${p.id}) failed:`, e);
  }
  try {
    await aglet.dispatch("data.create", {
      collection: "samples",
      data: {
        ts, source: p.id, ok: true,
        session_pct: numOr0(sPct),
        weekly_pct: numOr0(wPct),
        session_resets_ms: typeof sess.resets_at_ms === "number" ? sess.resets_at_ms : 0,
        weekly_resets_ms: typeof week.resets_at_ms === "number" ? week.resets_at_ms : 0,
      },
    });
  } catch (e) {
    console.warn(`[tokstat] data.create samples(${p.id}) failed:`, e);
  }
}

// **总是** upsert 一个 current 行(建 or 合并),再叠 patch。**enabled 与数据解耦**:
// enabled 由调用方按【设置】传;数据字段(pct/ok/needs_auth/err)是另一条轴。无现有行时从最近
// sample 取缓存值填底,避免首刷失败占位空白。这是根治「fetch 失败 → 无行 → 误显示未启用」的地基:
// 启用的 provider 在**任何** fetch 结果下都保证有 enabled=true 的行 → UI 永远显示它。
async function ensureCurrent(p, patch) {
  let base = null;
  try {
    const r = aglet.data.list("current", { where: { source: p.id }, limit: 1 });
    if (r && r.items && r.items.length) base = r.items[0].data;
  } catch (_e) {}
  if (!base) {
    try {
      const r = aglet.data.list("samples", { where: { source: p.id }, orderBy: [{ field: "ts", direction: "desc" }], limit: 1 });
      const s = r && r.items && r.items[0] && r.items[0].data;
      if (s) base = {
        ts: s.ts, refreshed_text: clockText(s.ts),
        session_pct: numOr0(s.session_pct), session_pct_text: pctText(s.session_pct), session_reset_text: resetLine(s.session_resets_ms),
        weekly_pct: numOr0(s.weekly_pct), weekly_pct_text: pctText(s.weekly_pct), weekly_reset_text: resetLine(s.weekly_resets_ms),
      };
    } catch (_e) {}
  }
  const row = { source: p.id, label: p.label, abbrev: p.abbrev, order: p.order, ...(base || {}), ...patch };
  try {
    await aglet.dispatch("data.upsert", { collection: "current", by_field: "source", data: row });
  } catch (e) {
    console.warn(`[tokstat] ensureCurrent(${p.id}) failed:`, String(e));
  }
}

// ── 一拍 ───────────────────────────────────────────────────────────────────
// **enabled = 设置(唯一真相),恒在每个分支写;数据可用性是独立轴。** 三态:
//   有数据 → upsertProvider(pct + notify + sample);需重登 → ok=false/needs_auth=true;
//   暂不可用(429/网断/API 异常)→ ok=false/needs_auth=false/err(保留缓存值)。
// 三态都保证 enabled=true 的行存在 → 启用的 provider 永不「消失成未启用」。
// 「No providers enabled」只在设置里全部关掉(enabled=false)时出现 —— 纯设置条件,与 fetch 无关。
async function runRefresh() {
  const ts = aglet.now ? aglet.now() : Date.now();
  for (const p of PROVIDERS) {
    const on = boolSetting("enable_" + p.id, true); // 唯一真相 = 设置
    if (!on) { await ensureCurrent(p, { enabled: false }); continue; } // 禁用:标记隐藏,保留缓存值
    const cred = await readCred(null, p.id);
    const side = await p.fetch(cred);
    if (side.ok) {
      await upsertProvider(p, side, ts, null); // 有数据:enabled=true + 数据 + notify + sample
    } else if (side.needs_auth) {
      await ensureCurrent(p, { enabled: true, ok: false, needs_auth: true, err: "" }); // 需重登(保留缓存 pct)
    } else {
      await ensureCurrent(p, { enabled: true, ok: false, needs_auth: false, err: side.err || "unavailable" }); // 暂不可用
    }
  }
}

// jobs.js（Layer 2，data-only per-invoke）——object 形态导出。所有顶层 helper 用**全局 app-bound
// aglet.\***（data/settings/plugins/dispatch/now，宿主注入已绑 app_id），与会话同一套授权（减 /state）。
// refreshNow（右键"Refresh now"）在会话 scripts.js，dispatch scheduler.run_app 回来跑本 refresh。
export default {
  // 定时 job(every 5min)+ 开窗即刷 + 会话 refreshNow kick。
  async refresh(_payload) { await runRefresh(); },
};
