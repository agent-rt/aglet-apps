// NetSpeed —— per-app 常驻模型（default export = setup 函数）。
// 采样节奏由 manifest.jobs 驱动：{id:"sample", run:"sample", every:"1s", while:"always"}
// —— host 事件驱动调度器每秒调 sample()，窗口关了也跑（while:always 持久后台）。
// 安装即纳入后台活跃集（install 时 setBackgroundActive），无需先手动打开，daemon 重启也续跑。
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

  return {
    // job {run:"sample", every:"1s"} 每秒调这个 —— 采样 + 写 state + append sparkline 点。
    sample,
    // 右键菜单「Refresh now」——手动补一拍。
    refresh: sample,
  };
};
