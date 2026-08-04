// Up Next —— 菜单栏显示接下来的日程。**只读**系统日历（macOS EventKit）。
//
// 数据不落 SQLite：日历的真相源在系统里，缓存一份只会引入过期与同步问题。每次
// refresh 直接 calendar.listEvents 拉当前窗口，结果只写 /state（进程内）。
//
// 菜单栏内容必须由这里算好写进 /state/trayText —— TrayLabel 的服务端 walker 只认
// Text/Icon，不支持在 UI 里查数据或写条件分支。

// 未授权时的状态集合：这些都不该反复弹窗，UI 显示引导按钮由用户主动触发。
function needsAuth(status) {
  return status !== "authorized";
}

// "14:30" —— 菜单栏空间有限，只给开始时间；全天事件给个占位。
function hhmm(ms) {
  const d = new Date(ms);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return h + ":" + m;
}

// 菜单栏文本：最近一条未开始（或正在进行）的事件 → "14:30 站会"。
// 标题截断到 14 字符，避免把菜单栏挤走（多语言下按字符数比字节数直观）。
function trayTextOf(events, nowMs) {
  if (!events || events.length === 0) return "";
  const next = events.find((e) => (e.end || e.start || 0) >= nowMs) || events[0];
  if (!next) return "";
  const title = String(next.title || "").slice(0, 14);
  if (next.allDay) return title;
  return next.start ? hhmm(next.start) + " " + title : title;
}

// 行内展示用的时间文本："14:30 – 15:00" / 全天。
function timeTextOf(ev, allDayLabel) {
  if (ev.allDay) return allDayLabel;
  const s = ev.start ? hhmm(ev.start) : "";
  const e = ev.end ? hhmm(ev.end) : "";
  return e ? s + " – " + e : s;
}

async function load(ctx) {
  const nowMs = ctx.now();
  // 窗口取「此刻 → 24h 后」：菜单栏关心的是接下来，不是整周。
  const r = await ctx.dispatch("calendar.listEvents", {
    from: nowMs,
    to: nowMs + 24 * 60 * 60 * 1000,
    limit: 50,
  });
  const raw = (r && r.events) || [];
  const status = (r && r.status) || "unavailable";
  const authorized = status === "authorized";

  // 每行预派生 timeText —— UI 里不能做时间格式化。
  const allDayLabel = ctx.t ? ctx.t("allDay") : "All day";
  const events = raw.map((e) => ({
    id: e.id,
    title: e.title,
    location: e.location || "",
    calendar: e.calendar || "",
    timeText: timeTextOf(e, allDayLabel),
  }));

  // UI 的 JSX 守卫只有**正向** {x && …} 可靠（`!x` / `===` 会编出无 when 的 If，
  // web 显示而 native 隐藏 —— 已知陷阱）。所以这里把所有分支条件派生成布尔。
  await ctx.setState({
    events: events,
    status: status,
    authorized: authorized,
    needsAuth: !authorized,
    denied: status === "denied" || status === "restricted",
    empty: authorized && events.length === 0,
    trayText: authorized ? trayTextOf(raw, nowMs) : "",
    loading: false,
  });
  return { ok: true, count: events.length, status: status };
}

export default {
  // job（every 5m）+ Page onEnter 都调这个。
  async refresh(_args, ctx) {
    return await load(ctx);
  },

  // 用户点「允许访问日历」→ 触发系统授权弹窗，回来后立刻拉一次。
  // requestAccess 在已决定过的情况下不会重复弹窗（host 侧直接回当前态）。
  async grantAccess(_args, ctx) {
    await ctx.setState({ loading: true });
    const g = await ctx.dispatch("calendar.requestAccess", {});
    const r = await load(ctx);
    return { ok: true, granted: !!(g && g.granted), count: r.count };
  },
};
