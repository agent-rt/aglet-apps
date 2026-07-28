// 番茄钟 —— 常驻菜单栏 app(setup 体起 setInterval 每秒推进状态机 → setState → tray/popover 刷新)。
// 相位:idle → focus(专注) → short/long break(休息) → focus …;每 4 个专注后长休。
// 休息开始 → 触发全屏锁(app.focus.lock,Phase 2 能力,try/catch 兜底);休息结束 → 解锁。
export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);
  const EMOJI = { idle: "🍅", focus: "🍅", short: "☕", long: "🌴" };

  const num = (k, d) => { const v = parseInt(aglet.getState("/state/" + k), 10); return isFinite(v) ? v : d; };
  const durOf = (phase) => (phase === "focus" ? num("focusMin", 25) : phase === "long" ? num("longMin", 15) : num("shortMin", 5)) * 60;
  const mmss = (s) => { const m = Math.floor(s / 60), r = s % 60; return m + ":" + String(r).padStart(2, "0"); };

  // 写一份完整快照(含派生布尔 + tray 文本),tray label / popover 守卫都读它。
  function paint(phase, running, remaining, round, locked) {
    const disp = mmss(remaining);
    aglet.setState({
      phase, running, remaining, round, locked,
      display: disp,
      trayText: (EMOJI[phase] || "🍅") + " " + disp,
      isFocus: phase === "focus",
      isBreak: phase === "short" || phase === "long",
      isIdle: phase === "idle",
      isRunning: running,
      phaseLabel: t(phase === "focus" ? "focus" : phase === "short" ? "shortBreak" : phase === "long" ? "longBreak" : "idle"),
    });
  }

  const get = (k, d) => { const v = aglet.getState("/state/" + k); return v == null ? d : v; };

  // 进入休息:触发全屏锁(Phase 2 能力)。失败静默(Phase 1 无该能力也能跑)。
  function lock(phase, seconds) {
    try { aglet.dispatch("app.focus.lock", { title: t("breakTime"), seconds, phase }); } catch (_e) {}
  }
  function unlock() { try { aglet.dispatch("app.focus.unlock", {}); } catch (_e) {} }

  // 相位到点 → 切下一相位(专注↔休息;4 个专注后长休)。
  function advance() {
    const phase = String(get("phase", "idle"));
    let round = num("round", 0);
    if (phase === "focus") {
      round += 1;
      const next = round % 4 === 0 ? "long" : "short";
      const secs = durOf(next);
      paint(next, true, secs, round, true);
      lock(next, secs);
    } else {
      // 休息结束(或 idle 首启)→ 回到专注
      unlock();
      paint("focus", true, durOf("focus"), phase === "long" ? 0 : num("round", 0), false);
    }
  }

  // 每秒 tick:运行中且相位是计时相位才递减;到 0 切相位。
  function tick() {
    if (!(get("running", false) === true)) return;
    const phase = String(get("phase", "idle"));
    if (phase === "idle") return;
    let remaining = num("remaining", 0);
    if (remaining > 1) { paint(phase, true, remaining - 1, num("round", 0), get("locked", false) === true); return; }
    advance(); // remaining 到 0
  }

  // 初始 paint:让派生布尔 / phaseLabel / tray 文本与初始 state 一致(idle 也显 "Ready")。
  paint(String(get("phase", "idle")), get("running", false) === true, num("remaining", durOf("focus")), num("round", 0), get("locked", false) === true);
  setInterval(tick, 1000);

  return {
    // 开始/继续:idle → 起首个专注;暂停中 → 继续当前相位。
    start() {
      const phase = String(get("phase", "idle"));
      if (phase === "idle") { paint("focus", true, durOf("focus"), 0, false); }
      else { paint(phase, true, num("remaining", durOf(phase)), num("round", 0), get("locked", false) === true); }
    },
    pause() {
      const phase = String(get("phase", "idle"));
      paint(phase, false, num("remaining", 0), num("round", 0), get("locked", false) === true);
    },
    toggle() { if (get("running", false) === true) this.pause(); else this.start(); },
    // 跳过当前相位 → 立即切下一相位(验转换用,也是用户「跳过休息/提前结束专注」)。
    skip() {
      const phase = String(get("phase", "idle"));
      if (phase === "idle") { this.start(); return; }
      advance();
    },
    // 重置到 idle(停 + 解锁 + 归零)。
    reset() { unlock(); paint("idle", false, durOf("focus"), 0, false); },
  };
};
