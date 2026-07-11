// 倒计时 —— per-app 常驻模型（default export = setup 函数）。
// tick 用 setInterval：start 时 setInterval(tick,1000)、pause/reset/归零时 clearInterval。
// 闭包持 intervalId（常驻 runtime 跨 invoke 复用）。常驻 loop 定时 pump 让后台 tick 生效。
// 环色随剩余比例由冷转暖：>50% 青 / >20% 琥珀 / 其余 珊瑚 / 归零 绿（colorFor）。

export default (aglet) => {
  let intervalId = null;

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  // 剩余比例 → 环 accent 色（暖化：截止临近仪表升温）。
  const colorFor = (rem, sec, isDone) => {
    if (isDone) return "#45E09A";           // done 绿
    const frac = sec > 0 ? rem / sec : 0;
    if (frac > 0.5) return "#4FD1C5";        // 从容 青
    if (frac > 0.2) return "#F5B14C";        // 过半 琥珀
    return "#FF6B6B";                        // 告急 珊瑚
  };

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // 每秒一拍：递减 remaining，到 0 停表 + done。
  const tick = () => {
    const sec = Number(aglet.getState("/state/seconds")) || 60;
    const remaining = Number(aglet.getState("/state/remaining")) || 0;
    const next = remaining - 1;
    if (next <= 0) {
      stop();
      aglet.setState({ remaining: 0, display: fmt(0), running: false, done: true, ringColor: colorFor(0, sec, true) });
      return;
    }
    aglet.setState({ remaining: next, display: fmt(next), ringColor: colorFor(next, sec, false) });
  };

  return {
    // 选预设：停表并重置到该秒数。
    preset({ s, label }) {
      stop();
      aglet.setState({ seconds: s, remaining: s, display: fmt(s), preset: label, running: false, done: false, ringColor: colorFor(s, s, false) });
    },

    // 开始/暂停切换。开始 → setInterval(tick,1000)；暂停 → clearInterval。
    toggle() {
      const running = aglet.getState("/state/running") === true;
      if (running) {
        stop();
        aglet.setState({ running: false });
        return;
      }
      const sec = Number(aglet.getState("/state/seconds")) || 60;
      const rem = (Number(aglet.getState("/state/remaining")) || 0) > 0
        ? Number(aglet.getState("/state/remaining"))
        : sec;
      aglet.setState({ remaining: rem, display: fmt(rem), running: true, done: false, ringColor: colorFor(rem, sec, false) });
      intervalId = setInterval(tick, 1000);
    },

    // 复位：停表回到预设秒数。
    reset() {
      stop();
      const s = Number(aglet.getState("/state/seconds")) || 60;
      aglet.setState({ remaining: s, display: fmt(s), running: false, done: false, ringColor: colorFor(s, s, false) });
    },
  };
};
