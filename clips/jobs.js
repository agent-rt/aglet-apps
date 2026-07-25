// 剪贴板历史 —— 后台捕获(Layer 2 jobs.js,data-only,全局 app-bound aglet)。
// 事件驱动:manifest.jobs on "clipboard.changed"(daemon watcher 查 changeCount 变更即 emit)
// → capture 触发 → 仅此时 readText → 去重 → 入库。无 app 侧轮询。
//
// ⚠️排序只能用 schema 声明字段:内置 created_at/updated_at 不可 orderBy(NOT_FOUND_FIELD),
// 故自带 `ts`(epoch ms,upsert 时 bump)供 UI/prune 倒序。

// 简单字符串 hash(djb2)→ upsert 去重键。
function hashOf(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
// 单行预览(折行→空格,截断)。
function previewOf(s) {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > 140 ? one.slice(0, 140) + "…" : one;
}
function nowMs() { return aglet.now ? aglet.now() : Date.now(); }

export default {
  // 注册全局快捷键 ⌘⇧V(幂等)。once 装机跑一次 + rearm every 30s 补宿主重启后重注册
  // (Carbon RegisterEventHotKey 是进程级,宿主重启即丢)。
  arm(_payload) {
    try { aglet.plugins.hotkey.register({ id: "summon", key: "v", modifiers: ["cmd", "shift"] }); } catch (_e) {}
  },
  // 热键按下 → 唤出 clips 面板。前台 app 由宿主 FrontmostTracker 持续记录,回填时还焦。
  summon(_payload) {
    try { aglet.dispatch("aglet.open", { id: "clips" }); } catch (_e) {}
  },
  capture(_payload) {
    try {
      // 隐私:密码管理器/敏感来源标 concealed;临时内容标 transient —— 都不入库。
      try {
        const ty = aglet.plugins.clipboard.types();
        const list = (ty && ty.types) || [];
        if (list.some((x) => /concealed|transient|password/i.test(String(x)))) return;
      } catch (_e) {}

      const r = aglet.plugins.clipboard.readText();
      if (!r || !r.found) return;
      const text = String(r.text || "");
      if (!text.trim()) return;
      if (text.length > 50000) return; // 跳过超大文本

      // upsert by hash:事件只在内容变时触发,同内容再复制 → 同 hash → update(bump ts 置顶),
      // 不同内容 → insert。天然去重,无需先查 latest。
      aglet.data.upsert("clips", "hash", { hash: hashOf(text), text, preview: previewOf(text), kind: "text", ts: nowMs() });

      // 裁剪到 100 条:按 ts 倒序,删第 100 之后的旧项。
      const all = aglet.data.list("clips", { orderBy: [{ field: "ts", direction: "desc" }], limit: 1000 });
      const recs = (all && all.records) || [];
      for (let i = 100; i < recs.length; i++) { try { aglet.data.delete("clips", recs[i].id); } catch (_e) {} }
    } catch (_e) {}
  },
};
