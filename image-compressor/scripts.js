// 图片压缩 —— per-app 常驻模型，对标 sonnylazuardi/compressor：单图工作流、输出 WebP、
// 质量 Slider + Light/Medium/Heavy 预设、前后大小对比、原生文件面板选图。
// File/Blob 句柄：字节留原生，JS 只编排。image.process 真异步（await）+ 二进制通道（无 b64）。
// 路径全走 aglet.path(core/paths.zig)。文案走 aglet.t()。
export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);

  function fmtBytes(n) {
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    return (n / 1048576).toFixed(2) + " MB";
  }
  // 输出恒 WebP：webp 输入 → {stem}.compressed.webp（不覆盖原）；其它 → {stem}.webp。
  function outPath(src) {
    return aglet.path.ext(src) === "webp"
      ? aglet.path.withSuffix(src, ".compressed")
      : aglet.path.replaceExt(src, "webp");
  }
  function friendly(e) {
    const m = String((e && e.message) || e || "");
    if (m.indexOf("OutOfFuel") >= 0) return t("errTooLarge");
    if (m.indexOf("PERMISSION_DENIED") >= 0) return t("errNoPerm");
    if (m.indexOf("failed") >= 0) return t("errProcess");
    return t("errGeneric") + " " + m;
  }
  function toastErr(e) {
    aglet.setState({ working: false, hasError: true, errorText: friendly(e), status: t("statusFailed") });
    aglet.app.toast({ title: t("errTitle"), description: friendly(e), color: "danger", duration: 6000 });
  }

  function select(path) {
    aglet.setState({
      srcPath: path, srcName: aglet.path.basename(path), srcUrl: "file://" + path,
      hasFile: true, hasResult: false, resultLine: "", outName: "",
      hasError: false, errorText: "", status: t("statusSelected"),
      canCompress: true,   // 选到新图 → 显示压缩按钮
    });
  }

  // 质量单值在 /state/quality（SegmentedControl bind 直写）。settings 是持久层：init 读回、
  // 变更订阅写回（宿主设置 sheet 的 slider 也改这个 setting）。compress 用 /state/quality。
  function settingQuality() {
    try { return parseInt((aglet.settings.get("quality") || {}).value, 10) || 80; }
    catch (_e) { return 80; }
  }
  function readQuality() {
    return parseInt(aglet.getState("/state/quality"), 10) || settingQuality();
  }

  async function run() {
    const src = aglet.getState("/state/srcPath");
    if (!src) {
      aglet.app.toast({ title: t("noFileTitle"), color: "warning", duration: 3000 });
      return { error: "no file" };
    }
    const quality = readQuality();
    aglet.setState({ working: true, canCompress: false, hasError: false, errorText: "", status: t("statusCompressing") });

    const inBytes = aglet.fs.stat(src).size;
    const f = aglet.fs.open(src);                              // File(字节留原生)
    // image.process 真异步（Promise）：worker 跑 wasm、原始字节直传（无 b64），JS 线程不阻塞。
    const out = await aglet.image.process(f, { format: "webp", quality, lossless: false });
    const dst = outPath(src);
    aglet.fs.save(out, dst);
    const outBytes = out.size;
    const saved = inBytes > 0 ? Math.round(100 - (outBytes * 100) / inBytes) : 0;
    // 徽章文案 + 色：变小=绿"−N%"、变大=黄"+N%"(已优化过的图高质量重编码会变大)、持平=灰"0%"。
    const savedText = saved > 0 ? "−" + saved + "%" : saved < 0 ? "+" + (-saved) + "%" : "0%";
    const savedColor = saved > 0 ? "success" : saved < 0 ? "warning" : "secondary";
    // 结构化结果字段：UI 分别样式化（节省徽章 / 前后大小 / 输出名），不再拼一整串。
    aglet.setState({
      working: false, hasResult: true,
      sizeBefore: fmtBytes(inBytes),
      sizeAfter: fmtBytes(outBytes),
      savedText: savedText,
      savedColor: savedColor,
      outName: aglet.path.basename(dst),
      status: t("statusSaved"),
    });
    return { ok: true, path: dst };
  }

  return {
    // onEnter：settings.quality → /state/quality（分段控件初值）；订阅变更持久化回 settings。
    init() {
      aglet.setState({ quality: String(settingQuality()), status: t("statusIdle"), canCompress: false });
      try { aglet.subscribe("/state/quality", (v) => { try { aglet.settings.set("quality", String(v)); } catch (_e) {} }); } catch (_e) {}
    },
    pick() {
      try {
        // 仅解码器真支持的格式(stb_image: jpg/png/bmp/gif + libwebp: webp)。别用 "image"
        // 泛类——那会放进 HEIC/AVIF/TIFF,解码器不支持、选了必压缩失败(误导用户)。
        const r = aglet.plugins.fs.pick({ mode: "open", accept: "jpg,jpeg,png,webp,gif,bmp" });
        if (!r || !r.found) return { cancelled: true };
        select(r.path);
        return { path: r.path };
      } catch (e) { toastErr(e); return { error: true }; }
    },
    setSource({ path }) { select(path); },                    // 拖拽 / 自动化入口(headless 验用)
    async compress() {
      try { return await run(); }
      catch (e) { toastErr(e); aglet.setState({ canCompress: true }); return { error: true }; }  // 出错留退路：重新显示按钮可重试
    },
  };
};
