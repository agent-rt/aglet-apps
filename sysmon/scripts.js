// Sysmon —— 纯会话 tray app（**无 jobs**）。采样是会话内工作（Layer 1）：
// 启动（open / tray 菜单 / store → 宿主 onLaunch 强制载入常驻 runtime → 跑本 setup）时
// 起 setInterval 每秒采样；退出（右键 Quit → quitApp 销常驻 runtime）即停。
// 不后台常驻、不随宿主自启、daemon 重启不自动出现 —— 只在用户主动开着时跑。
//
// 数据全来自 sysmon 插件（stdio native）。每项指标（网速 / 内存 / CPU）由对应的 enable_* 设置
// 开关控制：关闭的指标**不 poll**（省 IPC）也**不展示**（ui.tsx 用 settings.enable_* 守卫）。
// CPU 由 cpu_mode 决定读占用率（sysmon.cpu.used_pct，%）还是温度（sysmon.temp.cpu_c，°）。
// 网速由插件持上一刻累计 bytes 做差：首拍返 0（无基线），第二拍起是真速率。

export default (aglet) => {
  const CAP = 60; // sparkline 保留最近 ~60 采样点(≈60s)

  // 设置读取：值以字符串存（"true"/"false"/select value）。开关默认开 → 未设置视为开。
  const on = (k) => {
    try { return (aglet.settings.get(k) || {}).value !== "false"; } catch (_e) { return true; }
  };
  const sel = (k, d) => {
    try { return (aglet.settings.get(k) || {}).value || d; } catch (_e) { return d; }
  };

  // 人类可读速率：B/s → K/M/G（不带箭头 —— 箭头在 UI 里独立着色）。
  const fmtRate = (bps) => {
    const n = Number(bps) || 0;
    if (n < 1024) return `${Math.round(n)} B/s`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB/s`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB/s`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
  };

  // 每项指标独立 try/catch —— 单个 sysmon action 失败（未实现 / 平台不支持）不该拖垮其余指标，
  // 也不该丢整个 patch。失败项值保留上次（不覆盖）。
  const sample = async () => {
    const patch = {};

    if (on("enable_net")) {
      try {
        const n = await aglet.plugins.sysmon.network({});
        const down = n.rx_bytes_per_sec || 0;
        const up = n.tx_bytes_per_sec || 0;
        patch.down = down;
        patch.up = up;
        patch.rxTotal = n.rx_total || 0;
        patch.txTotal = n.tx_total || 0;
        patch.downText = fmtRate(down);
        patch.upText = fmtRate(up);
      } catch (e) { console.error("[sysmon] network failed:", String(e)); }
    }

    if (on("enable_mem")) {
      try {
        const m = await aglet.plugins.sysmon.memory({});
        const pct = Math.round(m.used_pct || 0);
        patch.memPct = pct;
        patch.memUsed = m.used_bytes || 0;
        patch.memTotal = m.total_bytes || 0;
        patch.memText = `${pct}%`;
      } catch (e) { console.error("[sysmon] memory failed:", String(e)); }
    }

    if (on("enable_cpu")) {
      try {
        // 占用率 + user/sys 拆分(弹层明细恒显);温度作次级信息(弹层显 + tray 在 temp 模式用)。
        const c = await aglet.plugins.sysmon.cpu({});
        const pct = Math.round(c.used_pct || 0);
        patch.cpuVal = pct;
        patch.cpuUser = Math.round(c.user_pct || 0);
        patch.cpuSys = Math.round(c.sys_pct || 0);
        let tc = 0;
        try {
          const t = await aglet.plugins.sysmon.temp({});
          if (t && t.present) {
            tc = Math.round(t.cpu_c || 0);
            patch.cpuTemp = tc;
            patch.cpuTempText = tc > 0 ? `${tc}°C` : "";
          }
        } catch (_e) {}
        // 菜单栏文本按 cpu_mode:温度模式且拿到温度 → 显 °,否则显占用率 %。
        if (sel("cpu_mode", "usage") === "temp" && tc > 0) {
          patch.cpuUnit = "°";
          patch.cpuText = `${tc}°`;
        } else {
          patch.cpuUnit = "%";
          patch.cpuText = `${pct}%`;
        }
      } catch (e) { console.error("[sysmon] cpu failed:", String(e)); }
    }

    aglet.setState(patch);

    // 趋势数据点(给弹层 sparkline)。裁到最近 CAP 点,免 collection 无界增长。入库失败不致命。
    try {
      aglet.data.create("samples", {
        ts: aglet.now(),
        down: patch.down || 0,
        up: patch.up || 0,
        cpu: patch.cpuVal || 0,
        mem: patch.memPct || 0,
      });
      const r = aglet.data.list("samples", { orderBy: [{ field: "ts", direction: "asc" }] });
      const items = (r && r.items) || [];
      for (let i = 0; i < items.length - CAP; i++) aglet.data.delete("samples", items[i].id);
    } catch (_e) {}
  };

  // 会话启动即采一拍（tray 立即出数，不必等第一个 interval），随后每秒。setInterval 注册在
  // setup 体内，随常驻 runtime 存活而后台 pump、随 quitApp 销毁而停 —— 无需 jobs / 后台活跃集。
  sample();
  setInterval(sample, 1000);

  return {
    // 右键菜单「Refresh now」——手动补一拍。
    refresh: sample,
  };
};
