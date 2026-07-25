// 汇率换算 —— 实时汇率(open.er-api.com,免 key,覆盖全币种)。金额以「基准币」(base,高亮行)
// 计,列表实时换算成各币种。改 amount → 纯乘算重算(用缓存汇率);改 base → 重新 fetch。
//
// fetch 真异步(await);fetchRates 末尾恒 recompute(成功/失败都刷新列表,失败值显 …)。
export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);
  const CURRENCIES = ["USD", "CNY", "JPY", "EUR", "GBP", "HKD", "KRW", "TWD", "SGD", "AUD", "CAD"];
  let rates = {};      // { CUR: 相对 curBase 的汇率 }
  let curBase = "USD";

  // 金额格式化:2 位小数 + 千分位。
  function fmt(x) {
    if (!isFinite(x)) return "…";
    return x.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function amountOf() {
    const v = parseFloat(aglet.getState("/state/amount"));
    return isFinite(v) ? v : 0;
  }
  // 用缓存汇率把金额换算成每个币种(纯乘算,无网络)。
  function recompute() {
    const amt = amountOf();
    const rows = CURRENCIES.map((c) => ({
      id: c,
      label: c,
      value: rates[c] != null ? fmt(amt * rates[c]) : "…",
      active: c === curBase,
    }));
    aglet.setState({ rows });
  }
  // 拉基准币对各币种的汇率(改 base / 手动刷新时);末尾恒 recompute。
  async function fetchRates(base) {
    aglet.setState({ loading: true, err: "" });
    try {
      const resp = await fetch("https://open.er-api.com/v6/latest/" + encodeURIComponent(base));
      const data = JSON.parse((resp && resp.body) || "{}");
      if (data.result !== "success" || !data.rates) throw new Error("bad response");
      rates = data.rates;
      rates[base] = 1;
      curBase = base;
      // 完整展示串在 JS 侧拼(TSX 里的 `+` 会被编译成数学加法 → NaN)。
      const when = String(data.time_last_update_utc || "").slice(0, 16);
      aglet.setState({ loading: false, updated: when ? t("updatedPrefix") + when : "" });
    } catch (_e) {
      aglet.setState({ loading: false, err: t("errFetch") });
    }
    recompute();
  }

  return {
    async init() {
      await fetchRates(String(aglet.getState("/state/base") || "USD"));
      try {
        aglet.subscribe("/state/amount", () => recompute());
        aglet.subscribe("/state/base", (v) => { fetchRates(String(v)); });
      } catch (_e) {}
    },
    // 点某币种 → 设为基准币(触发 base 订阅 → 重新 fetch)。
    setBase({ id }) { if (id) aglet.setState({ base: String(id) }); },
    refresh() { fetchRates(curBase); },
  };
};
