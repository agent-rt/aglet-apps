// 剪贴板历史 —— 窗口侧交互(粘回 / 删除 / 清空 / 键盘快贴)。捕获在 jobs.js(事件驱动)。
// 数据全走 SQLite(DataList 数据驱动),不用 setState。
//
// 快贴:⌘1–9 / Enter(manifest.keys)→ pasteN → app.pasteToFrontmost(宿主写剪贴板 +
// 还焦上个前台 app + 合成 ⌘V + hide 本窗)。⌘N 按 ts 倒序取第 N 条(与 DataList 同序)。
export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);

  // 与 UI DataList 同序(ts desc)取最近若干条,供 ⌘N 定位。
  function recent(limit) {
    try {
      const r = aglet.data.list("clips", { orderBy: [{ field: "ts", direction: "desc" }], limit });
      return (r && r.records) || [];
    } catch (_e) { return []; }
  }

  // 回填:委托宿主 app.pasteToFrontmost(写剪贴板→还焦→⌘V→hide)。不自己 writeText:
  // 宿主端已写,重复写会多触发一次 clipboard.changed。
  function pasteBack(text) {
    if (!text) return;
    try {
      aglet.dispatch("app.pasteToFrontmost", { text: String(text) });
    } catch (e) {
      aglet.app.toast({ title: t("pasteFail"), description: String(e), color: "danger" });
    }
  }

  // ⌘N:取第 n(0-based)条回填。越界静默。
  function pasteNth(n) {
    const recs = recent(9);
    const r = recs[n];
    if (r) pasteBack(r.text);
  }

  return {
    pasteItem({ text }) { pasteBack(text); },
    pasteTop() { pasteNth(0); },
    paste1() { pasteNth(0); },
    paste2() { pasteNth(1); },
    paste3() { pasteNth(2); },
    paste4() { pasteNth(3); },
    paste5() { pasteNth(4); },
    paste6() { pasteNth(5); },
    paste7() { pasteNth(6); },
    paste8() { pasteNth(7); },
    paste9() { pasteNth(8); },

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
