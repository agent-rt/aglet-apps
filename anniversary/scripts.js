// 纪念日计算 —— 纯日期算术(aglet.now() + Date),refresh 把派生字段写回记录。
// per-app 常驻模型:default export = setup(aglet)=>({...})。顶层 helper 用全局 aglet
// (installAppCtx 后 = app-bound,data/now/t 不用手传 app_id/ctx);data.* 同步返回。

function parseYMD(s) {
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return { y: +m[1], mo: +m[2], d: +m[3] };
}

// 按日历日(忽略时区)算天数序号 —— 走 Date.UTC,diff 即整日数。
function dayNum(y, mo, d) {
  return Math.floor(Date.UTC(y, mo - 1, d) / 86400000);
}

// 给定一条 event 的字段 + 当前 epoch ms + i18n 函数 t → 派生
// {days_until, next_at, milestone, age_label}。t = aglet.t('key',{params})。
function derive(e, nowMs, t) {
  const ev = parseYMD(e.date);
  if (!ev) return { days_until: 99999, next_at: "", milestone: "", age_label: "" };

  const today = new Date(nowMs);
  const todayNum = dayNum(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const recurring = e.recurring !== false;

  // 下一次发生日：循环 → 今年的月日,过了就明年;一次性 → 原日期。
  let nxt;
  if (recurring) {
    nxt = { y: today.getFullYear(), mo: ev.mo, d: ev.d };
    if (dayNum(nxt.y, nxt.mo, nxt.d) < todayNum) nxt.y += 1;
  } else {
    nxt = { y: ev.y, mo: ev.mo, d: ev.d };
  }

  const days_until = dayNum(nxt.y, nxt.mo, nxt.d) - todayNum;
  const years = nxt.y - ev.y; // 下次发生时要满的岁数 / 第几周年

  let milestone = "";
  if (e.kind === "birthday") milestone = years > 0 ? t("msBirthday", { n: years }) : t("msBorn");
  else if (e.kind === "anniversary") milestone = years > 0 ? t("msAnniversary", { n: years }) : "";

  // 不满一岁(生日、循环):额外显示当前实龄。
  let age_label = "";
  if (e.kind === "birthday" && recurring) {
    const ageDays = todayNum - dayNum(ev.y, ev.mo, ev.d);
    if (ageDays >= 0 && ageDays < 365) {
      age_label = ageDays < 100
        ? t("ageDays", { n: ageDays })
        : t("ageMonths", { n: Math.floor(ageDays / 30.44) });
    }
  }

  return { days_until, next_at: t("nextAt", { mo: nxt.mo, d: nxt.d }), milestone, age_label };
}

export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);

  // 重算所有 events 的派生字段。app 打开(onEnter) + 添加后触发。
  // 表单初始默认(kind=birthday / recurring=on)走 widget 声明式默认(ui.tsx 的
  // SegmentedControl defaultValue / Switch checked),不在此 seed —— /form 是 window scope,
  // app-scoped script 写不进(见 view_tree formBindPath 缺省回退 checked/defaultValue)。
  function refresh() {
    const nowMs = aglet.now();
    const resp = aglet.data.list("events", {});
    const items = (resp && resp.items) || [];
    for (const rec of items) {
      aglet.data.update("events", rec.id, derive(rec.data || rec, nowMs, t));
    }
    return { count: items.length };
  }

  // 从表单加一条。form 值由 UI 作为 payload 传入(ui.tsx onClick 传 {title,date,kind,recurring})
  // —— /form 是 window scope,app-scoped script 的 getState/setStateAt 读写不到,必须走 payload。
  function addEvent(payload) {
    const p = payload || {};
    const title = ((p.title || "") + "").trim();
    const date = p.date || "";
    if (!title || !date) return { ok: false, reason: "need title + date" };
    aglet.data.create("events", {
      title,
      date,
      kind: p.kind || "birthday",
      recurring: p.recurring !== false,
      created_at: new Date(aglet.now()).toISOString(),
    });
    aglet.setStateAt("/state/_ui/drawers/add", false); // 关闭底部 sheet(/state 可写)
    refresh();
    return { ok: true };
  }

  return { refresh, addEvent };
};
