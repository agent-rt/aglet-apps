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

const APP_ID = "tokstat";

// ── 展示格式化 ─────────────────────────────────────────────────────────────

function pctText(pct) { return typeof pct === "number" ? `${pct}%` : "—"; }
function numOr0(pct) { return typeof pct === "number" ? pct : 0; }

function pctColor(pct) {
  if (typeof pct !== "number") return "default";
  if (pct >= 95) return "danger";   // 阈值预警保留(高用量变红)
  if (pct >= 80) return "warning";  // (变橙)
  return primaryColor();            // 正常档 = 用户主色(#hex,取色器设置)
}

// 主色设置(#rrggbb);未设置回退默认蓝。colorToken 直接吃 #hex。
function primaryColor() {
  try {
    const v = aglet.settings.get(APP_ID, "primary_color").value;
    if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) return v;
  } catch (_e) {}
  return "#3b82f6";
}

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
    const v = aglet.settings.get(APP_ID, key).value;
    if (v === undefined || v === null || v === "") return def;
    return v === true || v === "true";
  } catch (_e) { return def; }
}

// settings number(存成串)。未设/非数 = 默认。
function numSetting(key, def) {
  try {
    const v = aglet.settings.get(APP_ID, key).value;
    if (v === undefined || v === null || v === "") return def;
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
  } catch (_e) { return def; }
}

// 用量阈值通知(即时:notifications.schedule 省 at)。文案语言中立(scripts 无 t()):
// 品牌 label + 窗口 emoji(⏱会话/📅每周)+ 百分比 + ↺重置时间。id 稳定 → 重发替换不堆叠。
async function warnNotify(ctx, p, win, emoji, pct, resetText) {
  try {
    await ctx.dispatch("notifications.schedule", {
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
    const c = await ctx.plugins.aicreds.read({ provider });
    if (c && typeof c.access_token === "string" && c.access_token) return c;
    return null;
  } catch (e) {
    console.warn(`[tokstat] aicreds.read(${provider}) failed:`, String(e));
    return null;
  }
}

// 同步 fetch(宿主 fetch 是同步)。429/非2xx/网断/body 非预期 → { transient:true }。
function getJson(url, headers) {
  let r;
  try { r = fetch(url, { headers }); }
  catch (e) { console.warn(`[tokstat] fetch ${url} threw:`, String(e)); return { transient: true }; }
  if (r.status === 429 || !r.ok) return { transient: true, status: r.status };
  let d;
  try { d = r.json(); } catch (_e) { return { transient: true }; }
  if (!d || d.error) return { transient: true };
  return { ok: true, data: d };
}

// Claude：{ utilization(%), resets_at(ISO) } → { used_pct, resets_at_ms }。
function claudeWindow(w) {
  if (!w) return {};
  const pct = typeof w.utilization === "number" ? Math.round(w.utilization) : undefined;
  const ms = typeof w.resets_at === "string" ? Date.parse(w.resets_at) : NaN;
  return { used_pct: pct, resets_at_ms: Number.isFinite(ms) ? ms : undefined };
}

function fetchClaude(cred) {
  if (!cred) return { needs_auth: true };
  const res = getJson("https://api.anthropic.com/api/oauth/usage", {
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

function fetchCodex(cred) {
  if (!cred) return { needs_auth: true };
  const headers = {
    Authorization: "Bearer " + cred.access_token,
    Accept: "application/json",
    "User-Agent": "tokstat",
  };
  if (cred.account_id) headers["ChatGPT-Account-Id"] = cred.account_id;
  const res = getJson("https://chatgpt.com/backend-api/wham/usage", headers);
  if (res.status === 401 || res.status === 403) return { needs_auth: true }; // token 过期/失效 → 提示重登
  if (!res.ok) return res;
  const rl = res.data.rate_limit;
  if (!rl) return { transient: true };
  return { ok: true, session: codexWindow(rl.primary_window), weekly: codexWindow(rl.secondary_window) };
}

// ── Provider 注册表 ────────────────────────────────────────────────────────
// 加 provider：加一条 {id, label, abbrev, order, fetch} + aicreds 支持 id 的 token
// + settings 两组各加 enable_<id> / tray_<id> 开关。

const PROVIDERS = [
  { id: "claude", label: "Claude", abbrev: "CL", order: 1, fetch: fetchClaude },
  { id: "codex", label: "Codex", abbrev: "CX", order: 2, fetch: fetchCodex },
];

// ── 入库 ───────────────────────────────────────────────────────────────────

async function upsertProvider(p, side, ts, ctx) {
  const sess = side.session ?? {};
  const week = side.weekly ?? {};
  const sPct = sess.used_pct;
  const wPct = week.used_pct;

  // 阈值通知去重:读上次 current 的 notified_* 标志,过阈值时通知一次;跌回阈值下(如窗口
  // 重置用量归零)→ 复位标志,下次再越线可再通知。标志随 row 存回(否则每次 upsert 会丢)。
  let old = {};
  try {
    const r = aglet.data.list(APP_ID, "current", { where: { source: p.id }, limit: 1 });
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
    enabled: true,
    ok: true,
    needs_auth: false,
    notified_session: nS,
    notified_weekly: nW,
    err: "",
    session_pct: numOr0(sPct),
    session_pct_text: pctText(sPct),
    session_color: pctColor(sPct),
    session_reset_text: resetLine(sess.resets_at_ms),
    weekly_pct: numOr0(wPct),
    weekly_pct_text: pctText(wPct),
    weekly_color: pctColor(wPct),
    weekly_reset_text: resetLine(week.resets_at_ms),
  };
  try {
    await ctx.dispatch("data.upsert", { collection: "current", by_field: "source", data: row });
  } catch (e) {
    console.warn(`[tokstat] upsert current(${p.id}) failed:`, e);
  }
  try {
    await ctx.dispatch("data.create", {
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

// 设某 provider current 行的 enabled 标志(不删行、不动缓存值)。
// current 是**持久缓存**:禁用只标记 enabled=false(弹层按 enabled 过滤隐藏、菜单栏按
// 设置守卫隐藏),值保留 → 再启用时即便 fetch 命中 429 也能立刻显示上次真值,历史不丢。
async function setEnabled(id, enabled, ctx) {
  try {
    const r = aglet.data.list(APP_ID, "current", { where: { source: id }, limit: 1 });
    if (r && r.items && r.items.length) {
      const row = { ...r.items[0].data, enabled };
      await ctx.dispatch("data.upsert", { collection: "current", by_field: "source", data: row });
      return true;
    }
  } catch (e) {
    console.warn(`[tokstat] setEnabled current(${id}) failed:`, String(e));
  }
  return false;
}

// 从最近一条 sample 重建 current 行(启用但 fetch 失败[429/需登录]且 current 缺失时的兜底)。
// current 可能被历史上的禁用删掉、或旧版本清过 —— 只要 samples 有历史,就用它显示上次真值。
// 派生字段(text/color/reset)从 sample 原始值重算。返回是否重建成功。
async function restoreFromSample(p, ctx) {
  try {
    const r = aglet.data.list(APP_ID, "samples", { where: { source: p.id }, orderBy: [{ field: "ts", direction: "desc" }], limit: 1 });
    const s = r && r.items && r.items[0] && r.items[0].data;
    if (!s) return false;
    const row = {
      source: p.id, label: p.label, abbrev: p.abbrev, order: p.order,
      ts: s.ts, enabled: true, ok: true, needs_auth: false, err: "",
      session_pct: numOr0(s.session_pct), session_pct_text: pctText(s.session_pct),
      session_color: pctColor(s.session_pct), session_reset_text: resetLine(s.session_resets_ms),
      weekly_pct: numOr0(s.weekly_pct), weekly_pct_text: pctText(s.weekly_pct),
      weekly_color: pctColor(s.weekly_pct), weekly_reset_text: resetLine(s.weekly_resets_ms),
    };
    await ctx.dispatch("data.upsert", { collection: "current", by_field: "source", data: row });
    return true;
  } catch (e) {
    console.warn(`[tokstat] restoreFromSample(${p.id}) failed:`, String(e));
    return false;
  }
}

// ── 一拍 ───────────────────────────────────────────────────────────────────

async function runRefresh(ctx) {
  const ts = ctx.now ? ctx.now() : Date.now();
  for (const p of PROVIDERS) {
    if (!boolSetting("enable_" + p.id, true)) {
      await setEnabled(p.id, false, ctx); // 未启用：不轮询,标记隐藏,保留缓存值
      continue;
    }
    const cred = await readCred(ctx, p.id);
    const side = p.fetch(cred);
    if (side.ok) {
      await upsertProvider(p, side, ts, ctx);
    } else if (side.needs_auth) {
      // token 过期/未登录:不替用户刷新(边界),标记 needs_auth → 弹层提示重登 codex。
      await markNeedsAuth(p, ctx);
    } else {
      // transient(429/网断):保留上次真值。current 在 → 翻 enabled=true;current 缺失
      // 但有历史 sample → 从 sample 重建(覆盖旧版本删过 current 的情况),再启用即可见。
      const had = await setEnabled(p.id, true, ctx);
      if (!had) await restoreFromSample(p, ctx);
    }
  }
}

// 标记某 provider 需重新登录(token 过期/失效)。保留上次 pct(若有),置 ok=false+needs_auth=true
// → 弹层 <Item> 里 {item.needs_auth && ...} 显示重登提示 + 刷新按钮。不动凭据、不代刷新。
async function markNeedsAuth(p, ctx) {
  let base = {};
  try {
    const r = aglet.data.list(APP_ID, "current", { where: { source: p.id }, limit: 1 });
    if (r && r.items && r.items.length) base = r.items[0].data;
  } catch (_e) {}
  const row = { ...base, source: p.id, label: p.label, abbrev: p.abbrev, order: p.order, enabled: true, ok: false, needs_auth: true };
  try {
    await ctx.dispatch("data.upsert", { collection: "current", by_field: "source", data: row });
  } catch (e) {
    console.warn(`[tokstat] markNeedsAuth(${p.id}) failed:`, String(e));
  }
}

export default {
  // 定时 job(every 5min)+ 开窗即刷。
  async refresh(_payload, ctx) { await runRefresh(ctx); },
  // 右键菜单 "Refresh now"。
  async refreshNow(_payload, ctx) { await runRefresh(ctx); },
};
