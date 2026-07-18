// NetSpeed —— 纯会话 tray app（**无 jobs**）。采样是会话内工作（Layer 1）：
// 启动（open / tray 菜单 / store → 宿主 onLaunch 强制载入常驻 runtime → 跑本 setup）时
// 起 setInterval 每秒采样；退出（右键 Quit → quitApp 销常驻 runtime）即停。
// 不后台常驻、不随宿主自启、daemon 重启不自动出现 —— 只在用户主动开着时跑。
// 速率由 sysmon 插件（stdio native）持上一刻累计 bytes 做差：首拍返 0（无基线），第二拍起是真速率。
// 每拍还把 {ts,down,up} append 进 samples collection（裁到最近 CAP 点），给菜单栏 sparkline 用。

export default (aglet) => {
  const CAP = 90; // sparkline 保留最近 ~90 采样点（≈90s），免 collection 无界增长

  // 人类可读速率：B/s → K/M/G（不带箭头 —— 箭头是 UI 里独立着色的 <Text>）。
  const fmt = (bps) => {
    const n = Number(bps) || 0;
    if (n < 1024) return `${Math.round(n)} B/s`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB/s`;
    if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB/s`;
    return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
  };

  const sample = async () => {
    const n = await aglet.plugins.sysmon.network({});
    const down = n.rx_bytes_per_sec || 0;
    const up = n.tx_bytes_per_sec || 0;
    aglet.setState({
      down,
      up,
      rxTotal: n.rx_total || 0,
      txTotal: n.tx_total || 0,
      downText: fmt(down),
      upText: fmt(up),
    });
    // sparkline 数据点。入库失败不致命（图空而已，文字模式不受影响）。
    try {
      aglet.data.create("samples", { ts: aglet.now(), down, up });
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
