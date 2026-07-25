// 单位换算 —— 纯计算,无插件。输入值以「输入单位」(base，高亮行)计,列表实时换算成同类
// 每个单位。改 cat → 重置 base;改 val / base → 重算 rows。
//
// 非温度类=线性因子(factor = 该单位对基准 SI 单位的倍数);温度类=偏移换算(特殊)。
export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);

  // 每类:units[{id,label,f}](f=对基准单位的因子)。base(默认输入单位)。温度用 special。
  const CATS = {
    length: {
      base: "m",
      units: [
        { id: "mm", label: "mm", f: 0.001 },
        { id: "cm", label: "cm", f: 0.01 },
        { id: "m", label: "m", f: 1 },
        { id: "km", label: "km", f: 1000 },
        { id: "in", label: "in", f: 0.0254 },
        { id: "ft", label: "ft", f: 0.3048 },
        { id: "yd", label: "yd", f: 0.9144 },
        { id: "mi", label: "mi", f: 1609.344 },
      ],
    },
    weight: {
      base: "kg",
      units: [
        { id: "mg", label: "mg", f: 0.000001 },
        { id: "g", label: "g", f: 0.001 },
        { id: "kg", label: "kg", f: 1 },
        { id: "t", label: "t", f: 1000 },
        { id: "oz", label: "oz", f: 0.0283495 },
        { id: "lb", label: "lb", f: 0.453592 },
      ],
    },
    data: {
      base: "MB",
      units: [
        { id: "B", label: "B", f: 1 },
        { id: "KB", label: "KB", f: 1024 },
        { id: "MB", label: "MB", f: 1048576 },
        { id: "GB", label: "GB", f: 1073741824 },
        { id: "TB", label: "TB", f: 1099511627776 },
      ],
    },
    temp: {
      base: "C",
      special: true,
      units: [
        { id: "C", label: "°C" },
        { id: "F", label: "°F" },
        { id: "K", label: "K" },
      ],
    },
  };

  // 温度:先归一到摄氏,再转目标。
  function tempToC(v, from) {
    if (from === "F") return (v - 32) * 5 / 9;
    if (from === "K") return v - 273.15;
    return v;
  }
  function tempFromC(c, to) {
    if (to === "F") return c * 9 / 5 + 32;
    if (to === "K") return c + 273.15;
    return c;
  }

  // 数值格式化:6 位有效数字,去尾零;超大/超小用指数。
  function fmt(x) {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    const ax = Math.abs(x);
    if (ax >= 1e12 || ax < 1e-6) return x.toExponential(4);
    let s = Number(x.toPrecision(7)).toString();
    return s;
  }

  function catOf() { return CATS[String(aglet.getState("/state/cat") || "length")] || CATS.length; }
  function valOf() { const v = parseFloat(aglet.getState("/state/val")); return isFinite(v) ? v : 0; }
  function baseOf() { return String(aglet.getState("/state/base") || catOf().base); }

  // 重算列表:把 val(以 base 计)换算成本类每个单位。
  function recompute() {
    const cat = catOf();
    const val = valOf();
    const base = baseOf();
    let rows;
    if (cat.special) {
      const c = tempToC(val, base);
      rows = cat.units.map((u) => ({
        id: u.id, label: u.label, value: fmt(tempFromC(c, u.id)), active: u.id === base,
      }));
    } else {
      const bf = (cat.units.find((u) => u.id === base) || cat.units[0]).f;
      const si = val * bf;
      rows = cat.units.map((u) => ({
        id: u.id, label: u.label, value: fmt(si / u.f), active: u.id === base,
      }));
    }
    const baseLabel = (cat.units.find((u) => u.id === base) || cat.units[0]).label.split(" ").pop();
    aglet.setState({ rows, baseLabel });
  }

  // 切类:base 归位到该类默认输入单位,再重算。
  function applyCat() {
    const cat = catOf();
    aglet.setState({ base: cat.base });
    recompute();
  }

  return {
    init() {
      applyCat();
      try {
        aglet.subscribe("/state/cat", () => applyCat());
        aglet.subscribe("/state/val", () => recompute());
        aglet.subscribe("/state/base", () => recompute());
      } catch (_e) {}
    },
    // 点某行 → 设为输入单位(val 数值不变,重新解读)。
    setBase({ id }) {
      if (!id) return;
      aglet.setState({ base: String(id) });
    },
  };
};
