// jira scripts.js —— 会话（Layer 1）。**取数/写库全在 jobs.js**（Layer 2，data-only per-invoke）。
// 这里只有手动触发：Page.onEnter / 工具栏刷新 → kick 本 app 的后台 ingest job。
//   aglet.dispatch("scheduler.run_app", {})：app-scoped（只跑自己声明的 jobs，宿主用调用方
//   身份），fire-and-forget，落库后 UI 经 data 订阅实时刷（<DataList collection="issues">）。
// UI 纯数据驱动（读 issues / sync 集合），不用 setState。
export default (aglet) => ({
  // 打开窗口 + 「刷新」→ 立即跑 ingest job（不等结果，UI 靠数据订阅刷）。
  async refreshNow(_payload) {
    await aglet.dispatch("scheduler.run_app", {});
  },
});
