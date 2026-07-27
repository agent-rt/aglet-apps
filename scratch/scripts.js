// 随手记 —— 记一段话 / 拖个文件进来。
//
// ⚠️ **必须是 `export default (aglet) => ({...})` 这个「setup-函数模型」**:
//    只有它会被常驻 runtime 接管(`ffi.residentTryInvoke`),从而拿到 app-bound 的
//    `aglet` 面(getState / setState / plugins.* / share / pickFile / t)。
//    写成一堆 `export function` 会回落 per-invoke 低层 prelude —— 那里 `aglet.getState`
//    根本不存在,报「not a function」。踩过一次,别改回去。
//
// 附件策略:**只存引用,不复制副本**(att_path = 原路径)。理由:
//   · 记录有 256KB 上限(record_bytes_max),照片根本塞不进去
//   · 用户想要的通常是「指针」——「那个合同在哪」,而不是又一份副本
//   · 权限面最小:只要 fs:read
//   ⚠️ `fs` 虽是 bundled-static,**仍必须写进 manifest.requires** —— 只声明 permissions
//      不够,fs.stat 会直接 PERMISSION_DENIED(踩过;image-compressor 也是两处都写)。
// 代价:原文件被移动/删除 → 引用悬空(att_missing 字段留给后续 stat 巡检)。
//
// 图片缩略图:走 **原始插件 action**(aglet.plugins.image.*),不是 File 句柄版 shim ——
// 后者只透出 format/quality/lossless,没有 resize。见下面 thumbOf 的注释。

export default (aglet) => {
  const IMAGE_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "heic", "heif", "tiff", "svg"];

  const extOf = (p) => {
    const dot = String(p).lastIndexOf(".");
    return dot < 0 ? "" : String(p).slice(dot + 1).toLowerCase();
  };
  const baseOf = (p) => {
    const parts = String(p).split("/");
    return parts[parts.length - 1] || String(p);
  };
  const isImage = (p) => IMAGE_EXTS.indexOf(extOf(p)) >= 0;
  const draft = () => String(aglet.getState("/state/draft") || "").trim();
  const clearDraft = () => aglet.setStateAt("/state/draft", "");

  const THUMB_W = 320;
  const THUMB_QUALITY = 70;
  // 原图字节要经 base64 进 JS 才能喂给 image.process,故设个闸:超过这个大小不做缩略图
  // (只显示文件名+大小)。50MP 照片 base64 ≈ 30MB 字符串,没必要为了缩略图付这个代价。
  const THUMB_MAX_BYTES = 12 * 1024 * 1024;

  /// 生成 data: URI 缩略图。任何一步失败 → null,条目退化成普通文件条目(不抛)。
  ///
  /// ⚠️ 必须走 **`aglet.plugins.image.*`(原始插件 action)**,不是 `aglet.image.process`
  ///    —— 后者是 File 句柄版 shim,只透出 format/quality/lossless,**没有 resize**。
  ///    原始 action 才有 `ops:[{kind:"resize",w,h}]`。
  /// ⚠️ opResize 要求 w/h **都** > 0(不自动保比例),所以先 metadata 拿原尺寸再算高。
  /// ⚠️ 缩略图必须是 data: URI —— native `<Image>` 只解 data:,本地路径走 AsyncImage
  ///    而 URLSession 不支持 file:。
  function thumbOf(path, size) {
    if (!isImage(path)) return "";
    if (size <= 0 || size > THUMB_MAX_BYTES) return "";
    try {
      const f = aglet.plugins.fs.read({ path });
      const b64 = f && f.bytes_b64;
      if (!b64) return "";
      const meta = aglet.plugins.image.metadata({ input_b64: b64 });
      const w = (meta && meta.width) || 0;
      const h = (meta && meta.height) || 0;
      if (w <= 0 || h <= 0) return "";
      const tw = Math.min(THUMB_W, w);
      const th = Math.max(1, Math.round((h * tw) / w));
      const out = aglet.plugins.image.process({
        input_b64: b64,
        ops: [{ kind: "resize", w: tw, h: th }],
        output_format: "jpeg",
        quality: THUMB_QUALITY,
      });
      const ob = out && out.output_b64;
      return ob ? "data:image/jpeg;base64," + ob : "";
    } catch (e) {
      console.log("thumb failed: " + path + " — " + e);
      return "";
    }
  }

  /// 待发队列:拖进来/选进来的文件先排队(带缩略图 + 大小),点发送才入库。
  /// ⚠️ `/state/pending` **不在 manifest.state 里声明** —— 声明过的顶层 key 被重播种,
  ///    setState 写不持久(踩过)。不声明 + setStateAt 写,读到 undefined 时 <For> 自然渲空。
  const pending = () => {
    const p = aglet.getState("/state/pending");
    return Array.isArray(p) ? p : [];
  };
  const setPending = (arr) => aglet.setStateAt("/state/pending", arr);

  function pend(path) {
    let size = 0;
    try {
      const st = aglet.plugins.fs.stat({ path });
      size = (st && st.size) || 0;
    } catch (e) {
      console.log("stat failed: " + path + " — " + e);
    }
    const thumb = thumbOf(path, size);
    const arr = pending();
    // i = 稳定序号(给 × 按钮用);noThumb 供 UI 正向守卫(TSX 里 !x 不可靠)
    arr.push({ i: arr.length, path, name: baseOf(path), size, thumb, noThumb: !thumb });
    setPending(arr);
  }

  const rowOf = (id) => {
    const r = aglet.data.list("notes", { where: { id }, limit: 1 });
    return (r && (r.records || r.items) || [])[0] || null;
  };

  return {
    /// 「发送」(⌘↵ 同此):待发附件各存一条,纯文字也存一条。
    ///
    /// 为什么每个附件一条、而不是「一条消息挂多附件」:随手记的每一项要能**独立**置顶/
    /// 删除/搜索。附件带同一段文字(当它的说明),这样搜文字能搜到那几个附件。
    /// **body 永不为空** —— 搜索走 `where {body:{$contains:q}}`,SQL 里 NULL LIKE '%%'
    /// 不匹配,body 空的条目在搜索框空着时也会整体消失。
    send() {
      const note = draft();
      const files = pending();
      if (!note && files.length === 0) return;

      for (const f of files) {
        aglet.data.create("notes", {
          body: note || f.name,
          kind: f.noThumb ? "file" : "image",
          pinned: false,
          att_path: f.path,
          att_name: f.name,
          att_size: f.size,
          att_thumb: f.thumb || "",
          att_missing: false,
          has_note: !!note,
        });
      }
      // 只有文字(没附件)→ 存一条纯文字
      if (note && files.length === 0) {
        aglet.data.create("notes", { body: note, kind: "text", pinned: false, att_missing: false, has_note: true });
      }
      setPending([]);
      clearDraft();
    },

    /// 「选个文件」—— 内置 app.pickFile(不需要插件),支持多选。进待发队列,不直接入库。
    pickFiles() {
      const picked = aglet.pickFile({ multiple: true });
      const paths = (picked && picked.paths) || [];
      for (const p of paths) pend(p);
    },

    /// 拖放:渲染器把拖入的文件路径注入 params.path(整窗 onDrop,挂在 Page 上)。
    attach(params) {
      const path = params && params.path;
      if (path) pend(path);
    },

    /// 待发列表里点 × —— 按稳定序号 i 移除,并重排剩余的 i。
    unpend(params) {
      const i = Number(params && params.i);
      const arr = pending().filter((f) => f.i !== i);
      setPending(arr.map((f, n) => ({ ...f, i: n })));
    },

    togglePin(params) {
      const row = rowOf(params.id);
      if (!row) return;
      const cur = (row.data || row).pinned;
      aglet.data.update("notes", params.id, { pinned: !cur });
    },

    remove(params) {
      aglet.data.delete("notes", params.id);
    },

    /// 分享:有附件分享文件,否则分享文字。
    share(params) {
      const row = rowOf(params.id);
      if (!row) return;
      const d = row.data || row;
      if (d.att_path) aglet.share({ files: [d.att_path], title: d.att_name });
      else aglet.share({ text: d.body });
    },
  };
};
