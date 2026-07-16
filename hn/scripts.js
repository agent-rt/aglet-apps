// HN —— Scheduler C jobs 模式：interval 触发 ingest handler。
//
// 产品目标：打开 hn 即看到「当前 HN 热榜」列表，中文标题/摘要随后补上。
// 据此把 ingest 拆两段、解耦「抓取存储」与「翻译」（旧版每条 upsert 后同步跑 2 次
// llmctl 才到下一条 → 列表一条一条慢慢冒，要好几分钟才满）：
//   Phase 1（快）：fetch topstories + 各 item，批量 upsert 元数据，**不调 LLM**
//                  → ~30 条记录几秒内全落库，列表立即满（title 空时 UI 显 title_en）。
//   Phase 2（渐进）：扫未翻译的 story（title 空），逐条 llmctl 翻译标题+摘要并 update
//                  → 中文渐进出现；崩了/没跑完的下次 ingest 会补。
//
// 数据源：HN 官方 JSON API（topstories.json → ids；item/<id>.json → 详情）。
// 翻译：title_en → title + 一句 summary，走 llmctl (local provider)。
// 幂等：data.upsert(by_field: "hn_id") 原子 dedup；用户字段 liked/disliked 仅 create 初始化。

// per-app 常驻模型:default export = setup 函数 (aglet)=>({...})。顶层 helper 用全局 aglet
// (installAppCtx 后 = app-bound,settings/secrets/data 不用手传 app_id);fetch 全局照旧,
// 并发抓用原生 Promise.all(urls.map(fetch))(fetchAll 别名已删,见 PER_APP_SCRIPTS_MODEL)。
const DEFAULT_MAX = 30;

function domainOf(u) {
  if (!u) return "";
  const m = /^https?:\/\/([^\/]+)/.exec(u);
  return m ? m[1].replace(/^www\./, "") : "";
}

// 翻译可配(settings):LLM 端点/模型/提示词/key。**不再硬依赖 llmctl CLI**。
// 没配端点 → 跳过翻译(纯英文榜)。endpoint/model/prompts 走 settings,key 走 secrets。
function cfg(key) { try { return aglet.settings.get(key).value || ""; } catch (_e) { return ""; } }
function apiKey() { try { return aglet.secrets.get("api_key").value || ""; } catch (_e) { return ""; } }

const DEF_TITLE_PROMPT = "把英文 HN 标题翻成中文。技术名词（Rust / Kafka / GPU / OAuth 等）保留英文。仅输出译文一行，不加引号、不加前后缀。";
const DEF_SUMMARY_PROMPT = "下面给出一条 HN story 的标题和它的正文或评论讨论。基于这些内容用 1 句中文（≤60 字）写看点：核心结论、争议点或值得看的地方。不要复述标题、不要脑补内容里没有的信息。仅输出一行中文。";

// HN 评论/正文是 HTML（<p> <a> &gt; 等）。粗去标签 + 解常见实体,给 LLM 当摘要素材。
function stripHtml(s) {
  if (!s) return "";
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#39;/g, "'").replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ").trim();
}

// OpenAI-compat chat completion(sync fetch,同本文件 Phase1 风格)。失败返空串。
async function llmcall(endpoint, model, key, system, user) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (key) headers["Authorization"] = "Bearer " + key;
    const r = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.3,
        max_tokens: 256,
        stream: false,
        // 关掉推理模型的思考(Qwen3 等):这些是翻译/摘要工具调用,只要答案不要 think。
        // 非推理模型/不支持的服务会忽略此字段。
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
    if (!r.ok) return "";
    const data = JSON.parse(r.body);
    return ((data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "").trim();
  } catch (_e) {
    return "";
  }
}

// data.list 在 script 侧返回 { items: [...] }（call 解 envelope.data）。容错处理。
export default (aglet) => ({
  async ingest(args) {
    const MAX = (args && args.max) || DEFAULT_MAX;

    const ids_resp = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    if (!ids_resp.ok) throw new Error(`topstories fetch failed: ${ids_resp.status}`);
    const ids = JSON.parse(ids_resp.body).slice(0, MAX);

    // ── Phase 1（快）：抓 + 批量 upsert 元数据，不翻译。列表立即满。────────────
    // 顺手把「需翻译」的记录收进 pending（id + 英文标题），Phase 2 直接用 ——
    // 不回头 data.list（其 item 形态/字段嵌套不保证，曾因 s.title_en 取不到而整轮跳过）。
    let added = 0;
    let refreshed = 0;
    const pending = []; // { id, title_en }
    // 官方源没有批量接口,30 个 item 用 Promise.all 并发抓(fetch 真异步,~1 个往返而非 30×)。
    const itemResps = await Promise.all(
      ids.map((id) => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)),
    );
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const r = itemResps[i];
      if (!r || !r.ok) continue;
      const item = JSON.parse(r.body);
      if (!item || item.type !== "story" || !item.title) continue;

      // 摘要不再脑补标题:自帖用 item.text 正文,链接帖用 top 评论(kids)。Phase1 白拿 kids。
      const kids = Array.isArray(item.kids) ? item.kids.slice(0, 5) : [];
      const selfText = item.text || "";

      const up = aglet.data.upsert("stories", "hn_id", {
        hn_id: id,
        title_en: item.title,
        url: item.url || `https://news.ycombinator.com/item?id=${id}`,
        domain: domainOf(item.url),
        author: item.by || "",
        points: item.score || 0,
        comments: item.descendants || 0,
        time: item.time || 0, // HN 发布 Unix 秒 → UI `| relative` 渲成「几分钟前」
      });

      if (up.upserted === "created") {
        // 初次见到：初始化用户字段 + 留空 title/summary 给 Phase 2 翻译补。
        aglet.data.update("stories", up.id, {
          title: "",
          summary: "",
          liked: false,
          disliked: false,
        });
        added++;
        pending.push({ id: up.id, title_en: item.title, kids, text: selfText });
      } else {
        refreshed++;
        // 已存在但还没译（up.data 是现有记录）→ 也补译；已译的不动（保留用户/已有内容）。
        const cur = up.data || {};
        if (!cur.title || !cur.summary) pending.push({ id: up.id, title_en: item.title, kids, text: selfText });
      }
    }

    // ── Phase 2（渐进）：翻译标题 + 基于真实内容的摘要。未配 LLM → 跳过(纯英文榜)。──
    const endpoint = cfg("llm_endpoint");
    let translated = 0;
    if (endpoint) {
      const model = cfg("llm_model");
      const key = apiKey();
      const titlePrompt = cfg("title_prompt") || DEF_TITLE_PROMPT;
      const summaryPrompt = cfg("summary_prompt") || DEF_SUMMARY_PROMPT;

      // 一把并发抓所有「需评论摘要」story 的 top 评论(自帖有 text 不抓评论)。
      const commentUrls = [];
      const ranges = []; // 每条 pending: { start, count }
      for (const p of pending) {
        const need = !p.text && p.kids && p.kids.length > 0;
        ranges.push({ start: commentUrls.length, count: need ? p.kids.length : 0 });
        if (need) for (const kid of p.kids) commentUrls.push(`https://hacker-news.firebaseio.com/v0/item/${kid}.json`);
      }
      const commentResps = commentUrls.length > 0 ? await Promise.all(commentUrls.map((u) => fetch(u))) : [];

      for (let i = 0; i < pending.length; i++) {
        const p = pending[i];
        const tzh = await llmcall(endpoint, model, key, titlePrompt, p.title_en);

        // 摘要内容来源:自帖正文 > top 评论拼接 > 无(不脑补)。
        let content = "";
        if (p.text) {
          content = stripHtml(p.text);
        } else {
          const rg = ranges[i];
          const parts = [];
          for (let j = rg.start; j < rg.start + rg.count; j++) {
            const cr = commentResps[j];
            if (!cr || !cr.ok) continue;
            try {
              const c = JSON.parse(cr.body);
              if (c && c.text && !c.deleted && !c.dead) parts.push(stripHtml(c.text));
            } catch (_e) {}
          }
          content = parts.join("\n---\n");
        }
        content = content.slice(0, 1500);

        let szh = "";
        if (content) {
          szh = await llmcall(endpoint, model, key, summaryPrompt, `标题：${p.title_en}\n\n讨论/正文：\n${content}`);
        }

        const patch = {};
        if (tzh) patch.title = tzh;
        if (szh) patch.summary = szh;
        if (Object.keys(patch).length > 0) {
          aglet.data.update("stories", p.id, patch);
          translated++;
        }
      }
    }

    return { fetched: ids.length, added, refreshed, translated, llm: endpoint ? "on" : "off" };
  },
});
