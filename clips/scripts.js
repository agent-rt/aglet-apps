// 剪贴板历史 —— 窗口侧交互(recopy/remove/clearAll)。捕获在 jobs.js(事件驱动)。
// 全走 SQLite(DataList 数据驱动),不用 setState。
export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);
  return {
    // 回填:把历史项写回系统剪贴板。写回会触发 clipboard.changed → capture,但内容与最新项
    // 相同 → jobs 去重跳过,不产生重复条目。
    recopy({ text }) {
      if (!text) return;
      try {
        aglet.plugins.clipboard.writeText({ text: String(text) });
        aglet.app.toast({ title: t("copied"), color: "success" });
      } catch (e) {
        aglet.app.toast({ title: t("copyFail"), description: String(e), color: "danger" });
      }
    },
    remove({ id }) {
      if (!id) return;
      try { aglet.data.delete("clips", id); } catch (_e) {}
    },
    clearAll() {
      try {
        const r = aglet.data.list("clips", { limit: 1000 });
        (r.records || []).forEach((rec) => { try { aglet.data.delete("clips", rec.id); } catch (_e) {} });
        aglet.app.toast({ title: t("cleared"), color: "success" });
      } catch (e) {
        aglet.app.toast({ title: t("clearFail"), description: String(e), color: "danger" });
      }
    },
  };
};
