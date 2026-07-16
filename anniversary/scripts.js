// 纪念日 —— per-app 常驻模型 (aglet)=>({...})。纯日期算术 + 农历换算(1900–2100 表)。
// 表单走 /state/draft/*(app scope,script 可读写;/form 是 window scope 读写不到)。
// 编辑复用同一 sheet:openAdd 清 draft、openEdit 填 draft+editingId、saveEvent 按 editingId create/update。

// ── 农历数据表 1900–2100(canonical lunarInfo:高位月大小位图 + 低 4 位闰月号;0x10000 位=闰月大小)──
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
  0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
  0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
  0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
  0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,
  0x0d520,
];
const LBASE = Date.UTC(1900, 0, 31); // 1900-01-31 = 农历 1900 正月初一

function leapMonth(y) { return LUNAR_INFO[y - 1900] & 0xf; }
function leapDays(y) { return leapMonth(y) ? ((LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29) : 0; }
function monthDays(y, m) { return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29; } // m=1..12
function lYearDays(y) {
  let sum = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) sum += (LUNAR_INFO[y - 1900] & i) ? 1 : 0;
  return sum + leapDays(y);
}

// 公历 → 农历 {lYear,lMonth,lDay,isLeap}(标准算法)。
function solarToLunar(y, m, d) {
  let offset = Math.round((Date.UTC(y, m - 1, d) - LBASE) / 86400000);
  let temp = 0, i;
  for (i = 1900; i < 2101 && offset > 0; i++) { temp = lYearDays(i); offset -= temp; }
  if (offset < 0) { offset += temp; i--; }
  const year = i;
  const leap = leapMonth(i);
  let isLeap = false, j;
  for (j = 1; j < 13 && offset > 0; j++) {
    if (leap > 0 && j === leap + 1 && !isLeap) { --j; isLeap = true; temp = leapDays(i); }
    else { temp = monthDays(i, j); }
    if (isLeap && j === leap + 1) isLeap = false;
    offset -= temp;
  }
  if (offset === 0 && leap > 0 && j === leap + 1) {
    if (isLeap) isLeap = false; else { isLeap = true; --j; }
  }
  if (offset < 0) { offset += temp; --j; }
  return { lYear: year, lMonth: j, lDay: offset + 1, isLeap };
}

// 农历 → 公历 {y,m,d}。
function lunarToSolar(ly, lm, ld, isLeap) {
  let offset = 0;
  for (let i = 1900; i < ly; i++) offset += lYearDays(i);
  const leap = leapMonth(ly);
  for (let j = 1; j < lm; j++) { offset += monthDays(ly, j); if (leap === j) offset += leapDays(ly); }
  if (isLeap && leap === lm) offset += monthDays(ly, lm); // 目标是闰月本身 → 先跨过常规月
  offset += ld - 1;
  const dt = new Date(LBASE + offset * 86400000);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// ── 纯日期工具 ──
function parseYMD(s) {
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null;
}
function dayNum(y, mo, d) { return Math.floor(Date.UTC(y, mo - 1, d) / 86400000); }

// 下一次「公历循环」发生:今年的 mo/d,过了则明年;非循环则原年。
function nextSolarOccur(ev, todayNum) {
  const today = new Date(todayNum * 86400000);
  let ny = today.getUTCFullYear();
  if (dayNum(ny, ev.mo, ev.d) < todayNum) ny += 1;
  const days = dayNum(ny, ev.mo, ev.d) - todayNum;
  return { days, y: ny, mo: ev.mo, d: ev.d, years: ny - ev.y };
}
// 下一次「农历循环」发生:出生公历 → 农历月/日,取今年农历该月/日→公历,过了则下一农历年。
function nextLunarOccur(ev, todayNum) {
  const born = solarToLunar(ev.y, ev.mo, ev.d);
  const today = new Date(todayNum * 86400000);
  let ly = today.getUTCFullYear(); // 农历年号约等于公历年(正月在年初)
  for (let tries = 0; tries < 3; tries++) {
    const s = lunarToSolar(ly, born.lMonth, Math.min(born.lDay, monthDays(ly, born.lMonth)), false);
    const dn = dayNum(s.y, s.m, s.d);
    if (dn >= todayNum) return { days: dn - todayNum, y: s.y, mo: s.m, d: s.d, lMonth: born.lMonth, lDay: born.lDay, years: ly - born.lYear };
    ly += 1;
  }
  return null;
}

// 派生 {days_until, next_at, milestone, age_label, which, secondary}。t = aglet.t。
function derive(e, nowMs, t) {
  const ev = parseYMD(e.date);
  if (!ev) return { days_until: 99999, next_at: "", milestone: "", age_label: "", which: "", secondary: "" };
  const today = new Date(nowMs);
  const todayNum = dayNum(today.getUTCFullYear(), today.getUTCMonth() + 1, today.getUTCDate());
  const cal = e.calendar || "solar";

  const sol = nextSolarOccur(ev, todayNum);
  const lun = (cal === "lunar" || cal === "both") ? nextLunarOccur(ev, todayNum) : null;

  // 主/次:solar→仅公历;lunar→仅农历;both→较近者为主、另一为次。
  let primary, which, secondaryOccur = null, secWhich = "";
  if (cal === "lunar" && lun) { primary = lun; which = "lunar"; }
  else if (cal === "both" && lun) {
    if (lun.days < sol.days) { primary = lun; which = "lunar"; secondaryOccur = sol; secWhich = "solar"; }
    else { primary = sol; which = "solar"; secondaryOccur = lun; secWhich = "lunar"; }
  } else { primary = sol; which = "solar"; }

  const milestone = milestoneOf(e.kind, primary.years, t);
  const label = occurLabel(primary, which, t);
  const secondary = secondaryOccur ? t("secondary", { at: occurLabel(secondaryOccur, secWhich, t), n: secondaryOccur.days }) : "";
  const cal_badge = cal === "lunar" ? t("calLunar") : cal === "both" ? t("calBoth") : ""; // 正向字符串守卫用(避 === 渲染守卫坑)

  // 实龄(生日+循环+不满一岁):按公历出生
  let age_label = "";
  if (e.kind === "birthday" && e.recurring !== false) {
    const ageDays = todayNum - dayNum(ev.y, ev.mo, ev.d);
    if (ageDays >= 0 && ageDays < 365) age_label = ageDays < 100 ? t("ageDays", { n: ageDays }) : t("ageMonths", { n: Math.floor(ageDays / 30.44) });
  }
  return { days_until: primary.days, next_at: label, milestone, age_label, which, secondary, cal_badge };
}

function milestoneOf(kind, years, t) {
  if (kind === "birthday") return years > 0 ? t("msBirthday", { n: years }) : t("msBorn");
  if (kind === "anniversary") return years > 0 ? t("msAnniversary", { n: years }) : "";
  return "";
}
// 发生标签:公历 "8/15";农历 "农历八月十五"。
function occurLabel(occ, which, t) {
  if (which === "lunar") return t("lunarAt", { mo: LUNAR_MONTHS[occ.lMonth - 1] || occ.lMonth, d: lunarDayName(occ.lDay) });
  return t("nextAt", { mo: occ.mo, d: occ.d });
}
const LUNAR_MONTHS = ["正","二","三","四","五","六","七","八","九","十","冬","腊"];
function lunarDayName(d) {
  const t1 = ["初", "十", "廿", "三"];
  const t2 = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
  if (d === 10) return "初十";
  if (d === 20) return "二十";
  if (d === 30) return "三十";
  return t1[Math.floor(d / 10)] + t2[d % 10];
}

export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);
  const dGet = (k) => aglet.getState("/state/draft/" + k);
  const dSet = (k, v) => aglet.setStateAt("/state/draft/" + k, v);
  const clearDraft = () => {
    dSet("title", ""); dSet("note", ""); dSet("date", "");
    dSet("kind", "birthday"); dSet("calendar", "solar"); dSet("recurring", true);
  };

  function refresh() {
    const nowMs = aglet.now();
    const resp = aglet.data.list("events", {});
    const items = (resp && resp.items) || [];
    for (const rec of items) aglet.data.update("events", rec.id, derive(rec.data || rec, nowMs, t));
    return { count: items.length };
  }

  // FAB → 新增:清 draft + 清 editingId + 开 sheet(全 /state,script 可写)。
  function openAdd() {
    clearDraft();
    aglet.setStateAt("/state/editingId", "");
    aglet.setStateAt("/state/_ui/drawers/add", true);
    return { ok: true };
  }
  // 右键 Edit → 用该条填 draft + 记 editingId + 开 sheet。payload = {id,title,date,kind,calendar,note,recurring}。
  function openEdit(p) {
    p = p || {};
    dSet("title", p.title || ""); dSet("note", p.note || ""); dSet("date", p.date || "");
    dSet("kind", p.kind || "birthday"); dSet("calendar", p.calendar || "solar"); dSet("recurring", p.recurring !== false);
    aglet.setStateAt("/state/editingId", p.id || "");
    aglet.setStateAt("/state/_ui/drawers/add", true);
    return { ok: true };
  }
  // 保存:editingId 有则 update 否则 create;存后清 draft + 关 sheet。
  function saveEvent() {
    const title = ((dGet("title") || "") + "").trim();
    const date = dGet("date") || "";
    if (!title || !date) return { ok: false, reason: "need title + date" };
    const rec = {
      title, date, note: (dGet("note") || "") + "",
      kind: dGet("kind") || "birthday", calendar: dGet("calendar") || "solar",
      recurring: dGet("recurring") !== false,
    };
    const editingId = aglet.getState("/state/editingId");
    if (editingId) aglet.data.update("events", editingId, rec);
    else { rec.created_at = new Date(aglet.now()).toISOString(); aglet.data.create("events", rec); }
    aglet.setStateAt("/state/_ui/drawers/add", false);
    aglet.setStateAt("/state/editingId", "");
    clearDraft();
    refresh();
    return { ok: true };
  }
  function removeEvent(p) { if (p && p.id) aglet.data.delete("events", p.id); return { ok: true }; }

  return { refresh, openAdd, openEdit, saveEvent, removeEvent };
};
