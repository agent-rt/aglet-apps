// World Clock —— 纯会话 tray app(无 jobs / 无插件)。城市为**用户管理的集合**(新建/删除/勾选进
// 菜单栏)。时区转换走**标准 Intl.DateTimeFormat**(运行时 native tz 绑定 + Intl polyfill 提供)。
//
// 数据:`catalog`(可选城市目录,seed 一次,给「新建」下拉用)+ `cities`(用户已添加,含 menubar 勾选)。
// 表单草稿走 /state/draft/*(app scope,script 可读写;/form 是 window scope 读写不到 —— 同 anniversary)。

export default (aglet) => {
  // 可选城市目录(tz=IANA,code=菜单栏短码,key=城市名 i18n 键)。tz="" 表示「本地」(用系统时区)。
  // 城市名不硬编码 —— 走 aglet.t(key) 按当前语言取,切语言时 refresh 自动改写(见 nameOf)。
  const CATALOG = [
    { tz: "",                    code: "LOC", key: "c_local" },
    { tz: "Pacific/Honolulu",    code: "HNL", key: "c_honolulu" },
    { tz: "America/Los_Angeles", code: "LAX", key: "c_losangeles" },
    { tz: "America/Denver",      code: "DEN", key: "c_denver" },
    { tz: "America/Chicago",     code: "CHI", key: "c_chicago" },
    { tz: "America/New_York",    code: "NYC", key: "c_newyork" },
    { tz: "America/Sao_Paulo",   code: "SAO", key: "c_saopaulo" },
    { tz: "Europe/London",       code: "LON", key: "c_london" },
    { tz: "Europe/Paris",        code: "PAR", key: "c_paris" },
    { tz: "Europe/Berlin",       code: "BER", key: "c_berlin" },
    { tz: "Europe/Moscow",       code: "MOW", key: "c_moscow" },
    { tz: "Asia/Dubai",          code: "DXB", key: "c_dubai" },
    { tz: "Asia/Kolkata",        code: "BOM", key: "c_mumbai" },
    { tz: "Asia/Bangkok",        code: "BKK", key: "c_bangkok" },
    { tz: "Asia/Singapore",      code: "SIN", key: "c_singapore" },
    { tz: "Asia/Shanghai",       code: "SHA", key: "c_shanghai" },
    { tz: "Asia/Hong_Kong",      code: "HKG", key: "c_hongkong" },
    { tz: "Asia/Tokyo",          code: "TYO", key: "c_tokyo" },
    { tz: "Asia/Seoul",          code: "SEL", key: "c_seoul" },
    { tz: "Australia/Sydney",    code: "SYD", key: "c_sydney" },
    { tz: "Pacific/Auckland",    code: "AKL", key: "c_auckland" },
    { tz: "UTC",                 code: "UTC", key: "c_utc" },
  ];
  const byTz = {};
  for (const c of CATALOG) byTz[c.tz] = c;

  // 城市显示名:按当前语言查 i18n 表(aglet.t)。查不到回退 code。
  const nameOf = (tz) => {
    const c = byTz[tz];
    if (!c) return tz;
    try { const n = aglet.t(c.key); if (n && n !== c.key) return n; } catch (_e) {}
    return c.code;
  };

  const on = (k) => { try { return (aglet.settings.get(k) || {}).value !== "false"; } catch (_e) { return true; } };
  const listCities = () => { try { return (aglet.data.list("cities", { orderBy: [{ field: "order", direction: "asc" }] }) || {}).items || []; } catch (_e) { return []; } };
  const rowOf = (it) => it.data || it; // data.list 行:{id, data:{...}} 或平铺

  // 当前语言的 BCP47 码(日期本地化用);缺失回退 en。
  const localeCode = () => {
    try { const l = aglet.t("_locale"); if (l && l !== "_locale") return l; } catch (_e) {}
    return "en";
  };
  const timeFmt = (tz, hour12) => {
    // 时间数字用 en-GB(稳定 24h HH:MM),仅由 hour12 控制 12/24 制。
    const o = { hour: "2-digit", minute: "2-digit", hour12 };
    if (tz) o.timeZone = tz;
    return new Intl.DateTimeFormat("en-GB", o).format(new Date());
  };
  // 日期按当前语言:标准 Intl.DateTimeFormat(运行时 polyfill 已支持 en/zh/ja 本地化)。
  const dateFmt = (tz) => {
    const o = { weekday: "short", month: "short", day: "numeric" };
    if (tz) o.timeZone = tz;
    return new Intl.DateTimeFormat(localeCode(), o).format(new Date());
  };

  // 拿某时区的小时 + GMT 偏移(秒):优先 native __ag_localtime,本地走 JS Date,回退 Intl 解析小时。
  const cityInfo = (tz, nowMs) => {
    if (!tz) {
      const d = new Date();
      return { hour: d.getHours(), gmtoff: -d.getTimezoneOffset() * 60 };
    }
    if (typeof __ag_localtime === "function") {
      try { const r = __ag_localtime(tz, nowMs); if (r) return { hour: r.hour, gmtoff: r.gmtoff }; } catch (_e) {}
    }
    let hh = parseInt(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }).format(new Date()), 10);
    if (isNaN(hh)) hh = 12;
    return { hour: hh, gmtoff: null };
  };
  // 白天=06:00–18:59 → 太阳(暖黄);否则月亮(靛蓝)。
  const dayNight = (hour) => (hour >= 6 && hour < 19)
    ? { icon: "sun-fill", color: "#f5b301" }
    : { icon: "moon-stars-fill", color: "#7c86c9" };
  // 相对本地时差:"+11h" / "−9h" / "+5.5h";本地(0)返空。
  const diffLabel = (cityOff, localOff) => {
    if (cityOff == null || localOff == null) return "";
    const dh = (cityOff - localOff) / 3600;
    if (dh === 0) return "";
    const abs = Math.abs(dh);
    const num = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
    return (dh > 0 ? "+" : "−") + num + "h";
  };

  // 目录 seed(idempotent,给「新建」下拉);tz="" 的本地项不进目录(本地唯一,默认已添加)。
  // name 按当前语言写(切语言时 refresh 里会重 seed)。
  const seedCatalog = () => {
    for (const c of CATALOG) {
      if (!c.tz) continue;
      try { aglet.data.upsert("catalog", "tz", { tz: c.tz, name: nameOf(c.tz), code: c.code }); } catch (_e) {}
    }
  };
  // 首次(空)播种默认城市:纽约 + 伦敦 + 东京(不含「本地」——系统菜单栏时钟已显本地时间,
  // 重复;时差仍以系统本地为基准算)。默认都不勾菜单栏 → 菜单栏显时钟图标,用户自行勾选。
  const seedDefaultCities = () => {
    if (listCities().length > 0) return;
    const defs = [
      { tz: "America/New_York", menubar: false },
      { tz: "Europe/London",    menubar: false },
      { tz: "Asia/Tokyo",       menubar: false },
    ];
    let order = 0;
    for (const d of defs) {
      const cat = byTz[d.tz] || { code: "LOC", key: "c_local" };
      // 存**城市身份 key**(i18n 键),不存 localized name —— 名字渲染时 t(item.key) 本地化。
      try { aglet.data.upsert("cities", "tz", { tz: d.tz, key: cat.key, code: cat.code, menubar: d.menubar, order: order++ }); } catch (_e) {}
    }
  };

  // 慢变派生(写 DB;seed + onEnter + 语言变时跑)。每城:GMT 偏移(给 render-time
  // now({offset}) 算时区时间/日期)、昼夜图标、相对时差标签、12/24h 标志、菜单栏星标。
  // **不写 time/date** —— 那俩是 render-time:ui.tsx 用 now({offset:item.gmtoff,format}) 渲染时
  // 才算,不入库、不逐拍刷(根治「时间存 DB + 10s churn」;localized/formatted 值不当数据存)。
  const refreshData = () => {
    const hour12 = !on("hour24");
    const nowMs = Date.now();
    const localOff = cityInfo("", nowMs).gmtoff;
    for (const it of listCities()) {
      const r = rowOf(it);
      const info = cityInfo(r.tz, nowMs);
      const dn = dayNight(info.hour);
      const diff = diffLabel(info.gmtoff, localOff);
      try {
        aglet.data.update("cities", it.id, {
          gmtoff: info.gmtoff || 0,
          dn: dn.icon, dnColor: dn.color,
          diffLabel: diff ? ("  ·  " + diff) : "",
          h12: hour12,
          star: r.menubar ? "star-fill" : "star",
        });
      } catch (_e) {}
    }
  };

  // 活钟(setState,**非 DB**):逐拍刷让分钟跳。① 菜单栏文本(勾选城市=本地化名+时间,tray 无法
  // render-time 故仍算)② _tick 触发 popover 重渲 → render-time now({offset}) 重烘时间/日期。零 DB 写。
  const tick = () => {
    const hour12 = !on("hour24");
    const nowMs = Date.now();
    const mb = [];
    for (const it of listCities()) {
      const r = rowOf(it);
      if (r.menubar) mb.push(nameOf(r.tz) + " " + timeFmt(r.tz, hour12));
    }
    aglet.setState({ menubarText: mb.length ? mb.join("  ") : "", _tick: nowMs });
  };

  const refresh = () => { seedCatalog(); refreshData(); tick(); };

  seedCatalog();
  seedDefaultCities();
  refreshData();
  tick();
  setInterval(tick, 10000); // 活钟:setState 触发重渲(不写 DB)
  // 语言变(set_locale)→ 重算菜单栏名(nameOf)+ 慢变数据;render-time 名(t(key))/日期(now)
  // 自动随 /t 重烘,无需数据重刷。
  try { aglet.subscribe("/t", function () { seedCatalog(); refreshData(); tick(); }); } catch (_e) {}

  return {
    refresh,
    // 主视图 ⇄ 管理页(状态驱动 Show 切换,非 Router;headless 可验、popover 必然可用)。
    openManage() { aglet.setStateAt("/state/_ui/managing", true); },
    closeManage() { aglet.setStateAt("/state/_ui/managing", false); },
    // FAB「+」→ 开新建抽屉(清草稿)。
    openAdd() {
      aglet.setStateAt("/state/draft/tz", "");
      aglet.setStateAt("/state/_ui/drawers/add", true);
    },
    // 抽屉里选好城市 → 添加(按 tz 去重,upsert)。
    addCity() {
      const tz = aglet.getState("/state/draft/tz");
      if (tz == null || tz === "") return;
      const cat = byTz[tz];
      if (!cat) return;
      const order = listCities().length;
      try {
        aglet.data.upsert("cities", "tz", { tz: cat.tz, key: cat.key, code: cat.code, menubar: false, order: order });
      } catch (_e) {}
      aglet.setStateAt("/state/_ui/drawers/add", false);
      aglet.setStateAt("/state/draft/tz", "");
      refresh();
    },
    // 删除某城市(app.confirm 的 onConfirm 调用)。
    removeCity(p) {
      if (!p || !p.id) return;
      try { aglet.data.delete("cities", p.id); } catch (_e) {}
      refresh();
    },
    // 勾选/取消菜单栏显示(item.id + 当前值 on 传入,翻转)。
    toggleMenubar(p) {
      if (!p || !p.id) return;
      try { aglet.data.update("cities", p.id, { menubar: !p.on }); } catch (_e) {}
      refresh();
    },
  };
};
