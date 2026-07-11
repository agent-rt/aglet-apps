// 倒计时 —— per-app 常驻模型（default export = setup 函数）。
// tick 用 setInterval：start 时 setInterval(tick,1000)、pause/reset/归零时 clearInterval。
// 闭包持 intervalId（常驻 runtime 跨 invoke 复用）。常驻 loop 定时 pump 让后台 tick 生效。

export default (aglet) => {
  let intervalId = null;

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  };

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  // 每秒一拍：递减 remaining，到 0 停表 + done。
  const tick = () => {
    const remaining = Number(aglet.getState("/state/remaining")) || 0;
    const next = remaining - 1;
    if (next <= 0) {
      stop();
      aglet.setState({ remaining: 0, display: fmt(0), running: false, done: true });
      return;
    }
    aglet.setState({ remaining: next, display: fmt(next) });
  };

  return {
    // 选预设：停表并重置到该秒数。
    preset({ s, label }) {
      stop();
      aglet.setState({ seconds: s, remaining: s, display: fmt(s), preset: label, running: false, done: false });
    },

    // 开始/暂停切换。开始 → setInterval(tick,1000)；暂停 → clearInterval。
    toggle() {
      const running = aglet.getState("/state/running") === true;
      if (running) {
        stop();
        aglet.setState({ running: false });
        return;
      }
      const rem = (Number(aglet.getState("/state/remaining")) || 0) > 0
        ? Number(aglet.getState("/state/remaining"))
        : (Number(aglet.getState("/state/seconds")) || 60);
      aglet.setState({ remaining: rem, display: fmt(rem), running: true, done: false });
      intervalId = setInterval(tick, 1000);
    },

    // 复位：停表回到预设秒数。
    reset() {
      stop();
      const s = Number(aglet.getState("/state/seconds")) || 60;
      aglet.setState({ remaining: s, display: fmt(s), running: false, done: false });
    },
  };
};
