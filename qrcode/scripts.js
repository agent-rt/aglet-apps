// 二维码工具 —— 生成(barcode.encode → dataUrl → <Image>)+ 识别(task 4：Blob 通道)。
// 生成链路全同步（aglet.plugins.* 走 bridge，非异步二进制通道）：barcode.encode 返回
// {dataUrl:"data:image/png;base64,..."}，直接塞 state.qrUrl 给 native <Image> 显示
// （AgImage 已支持 data: URI）。复制走 clipboard.writeImage、保存走 fs.pick(save)+fs.write。
export default (aglet) => {
  const t = (k, p) => aglet.t(k, p);

  // ZXing setEccLevel(0..8)。QR 四级 L/M/Q/H 映射到区间内的代表值（近似，QR 仍正常生成）。
  const ECC = { L: 2, M: 4, Q: 6, H: 8 };

  function readText()   { return String(aglet.getState("/state/text") || ""); }
  function readFormat() { return String(aglet.getState("/state/format") || "QRCode"); }
  function readEcc()    { return ECC[String(aglet.getState("/state/ecc") || "M")] ?? 4; }
  function readSize()   { return parseInt(aglet.getState("/state/size"), 10) || 256; }

  function friendly(e) {
    const m = String((e && e.message) || e || "");
    if (m.indexOf("PERMISSION_DENIED") >= 0) return t("errNoPerm");
    if (m.indexOf("empty") >= 0 || m.indexOf("no ") >= 0) return t("errEmpty");
    return t("errGeneric") + " " + m;
  }

  // 生成：读全量 state → barcode.encode → 写 qrUrl。空文本 = 清空预览。
  function generate() {
    const text = readText().trim();
    if (!text) { aglet.setState({ qrUrl: "", hasQr: false, genError: "" }); return; }
    // 2× 目标尺寸生成，显示端(224pt)缩放更锐利；margin=2 安静区。
    const size = Math.max(128, Math.min(1024, readSize() * 2));
    try {
      const r = aglet.plugins.barcode.encode({
        text, format: readFormat(), ecc: readEcc(), margin: 2, width: size, height: size,
      });
      const url = r && r.dataUrl;
      if (!url) throw new Error("no dataUrl");
      aglet.setState({ qrUrl: url, hasQr: true, genError: "" });
    } catch (e) {
      aglet.setState({ qrUrl: "", hasQr: false, genError: friendly(e) });
    }
  }

  function b64Of(dataUrl) {
    const s = String(dataUrl || "");
    const i = s.indexOf(",");
    return i >= 0 ? s.slice(i + 1) : "";
  }

  // 识别：barcode.readImage 内部用 stb_image 解码文件 → ZXing 读码，像素永不出 wasm，
  // 调用方只递交小小的编码文件（b64），不搬运数 MB 像素。
  function scanFromPath(path) {
    if (!path) return { error: "no path" };
    aglet.setState({ hasScan: false, scanError: "" });
    try {
      const f = aglet.plugins.fs.read({ path });
      if (!f || !f.found) { aglet.setState({ scanError: t("scanErrTitle") }); return { error: "read" }; }
      const r = aglet.plugins.barcode.readImage({ image_b64: f.bytes_b64 });
      if (r && r.found) {
        aglet.setState({ hasScan: true, scanText: String(r.text || ""), scanFormat: String(r.format || ""), scanError: "" });
        return { ok: true, text: r.text };
      }
      aglet.setState({ hasScan: false, scanError: t("scanErrTitle") });
      return { ok: true, found: false };
    } catch (e) {
      aglet.setState({ hasScan: false, scanError: friendly(e) });
      aglet.app.toast({ title: t("scanErrTitle"), description: friendly(e), color: "danger", duration: 5000 });
      return { error: true };
    }
  }

  function persist(key, val) { try { aglet.settings.set(key, String(val)); } catch (_e) {} }
  function restore(key, fallback) {
    try { const v = (aglet.settings.get(key) || {}).value; return (v == null || v === "") ? fallback : v; }
    catch (_e) { return fallback; }
  }

  return {
    init() {
      // 先回灌持久化偏好（format/ecc/size）——在注册订阅之前，避免每个 setState 触发级联 generate。
      aglet.setState({
        format: restore("format", "QRCode"),
        ecc: restore("ecc", "M"),
        size: parseInt(restore("size", "256"), 10) || 256,
      });
      // 模式 → 正向布尔（native 守卫）。
      const applyMode = (m) => aglet.setState({ genMode: m === "gen", scanMode: m === "scan" });
      applyMode(String(aglet.getState("/state/mode") || "gen"));
      // 注册订阅：输入/参数任一变 → 重新生成（同步、快）。参数变更同时持久化偏好。
      try {
        aglet.subscribe("/state/mode",   (v) => applyMode(String(v)));
        aglet.subscribe("/state/text",   () => generate());
        aglet.subscribe("/state/format", (v) => { persist("format", v); generate(); });
        aglet.subscribe("/state/ecc",    (v) => { persist("ecc", v); generate(); });
        aglet.subscribe("/state/size",   (v) => { persist("size", v); generate(); });
      } catch (_e) {}
      generate(); // 首帧出图（此时订阅已就位，但初值不再各自触发）
    },

    copyImage() {
      const url = aglet.getState("/state/qrUrl");
      if (!url) { aglet.app.toast({ title: t("noQr"), color: "warning" }); return; }
      try {
        aglet.plugins.clipboard.writeImage({ bytes_b64: b64Of(url) }); // type 省略 = public.png
        aglet.app.toast({ title: t("copied"), color: "success" });
      } catch (e) {
        aglet.app.toast({ title: t("copyFail"), description: String(e), color: "danger" });
      }
    },

    savePng() {
      const url = aglet.getState("/state/qrUrl");
      if (!url) { aglet.app.toast({ title: t("noQr"), color: "warning" }); return; }
      try {
        const p = aglet.plugins.fs.pick({ mode: "save", name: "qr.png" });
        if (!p || !p.found) return; // 取消
        aglet.plugins.fs.write({ path: p.path, bytes_b64: b64Of(url) });
        aglet.app.toast({ title: t("saved"), description: aglet.path.basename(p.path), color: "success" });
      } catch (e) {
        aglet.app.toast({ title: t("saveFail"), description: String(e), color: "danger" });
      }
    },

    // ===== 识别 =====
    scanFromPath({ path }) { return scanFromPath(path); },        // 自动化/测试入口
    scanPick() {
      try {
        const p = aglet.plugins.fs.pick({ mode: "open", accept: "png,jpg,jpeg,webp,bmp,gif" });
        if (!p || !p.found) return { cancelled: true };
        return scanFromPath(p.path);
      } catch (e) { aglet.app.toast({ title: t("scanErrTitle"), description: friendly(e), color: "danger" }); return { error: true }; }
    },
    scanDropped({ path }) { return scanFromPath(path); },          // onDrop 注入 path
    // 从剪贴板识别：clipboard.readImage(优先 PNG)→ barcode.readImage。screenshot 粘贴即扫。
    pasteScan() {
      try {
        const img = aglet.plugins.clipboard.readImage();
        if (!img || !img.found || !img.bytes_b64) {
          aglet.app.toast({ title: t("noClipImage"), color: "warning" });
          return { empty: true };
        }
        aglet.setState({ mode: "scan", hasScan: false, scanError: "" }); // ⌘V 从任意模式都跳到 Read 显结果
        const r = aglet.plugins.barcode.readImage({ image_b64: img.bytes_b64 });
        if (r && r.found) {
          aglet.setState({ hasScan: true, scanText: String(r.text || ""), scanFormat: String(r.format || ""), scanError: "" });
          return { ok: true, text: r.text };
        }
        aglet.setState({ hasScan: false, scanError: t("scanErrTitle") });
        return { ok: true, found: false };
      } catch (e) {
        aglet.setState({ hasScan: false, scanError: friendly(e) });
        aglet.app.toast({ title: t("scanErrTitle"), description: friendly(e), color: "danger", duration: 5000 });
        return { error: true };
      }
    },
    copyScanText() {
      const txt = aglet.getState("/state/scanText");
      if (!txt) return;
      try { aglet.plugins.clipboard.writeText({ text: String(txt) }); aglet.app.toast({ title: t("copied"), color: "success" }); }
      catch (e) { aglet.app.toast({ title: t("copyFail"), description: String(e), color: "danger" }); }
    },
  };
};
