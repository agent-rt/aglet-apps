// tokstat scripts.js — 会话（Layer 1）。**取数/写库全在 jobs.js**（Layer 2，data-only per-invoke）。
// 这里只有一个手动触发：右键「Refresh now」/ 弹层 reauth 按钮 → kick 本 app 的后台 refresh job。
//   aglet.dispatch("scheduler.run_app", {})：app-scoped，只跑自己声明的 jobs（宿主用调用方身份，
//   忽略 app_id）。fire-and-forget，job 落库后 UI 经 data.subscribe 实时刷（<DataList collection=current>）。
// UI 纯数据驱动（读 `current` 集合），不用 setState、不在会话取数。
export default (aglet) => ({
  // 右键菜单 "Refresh now" + 弹层 reauth 按钮 → 立即跑 refresh job。
  async refreshNow(_payload) {
    await aglet.dispatch("scheduler.run_app", {});
  },
});
