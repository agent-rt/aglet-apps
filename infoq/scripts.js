const APP_ID = "infoq";

const FEED = {
  collection: "recommended_articles",
  source: "InfoQ Recommend",
  url: "https://rsshub.rssforever.com/infoq/recommend",
  limit: 50,
};

function setSyncError(ctx, value) {
  try {
    if (ctx && ctx.setStateAt) ctx.setStateAt("/state/sync_error", value || "");
  } catch (_e) {}
}

function decodeEntities(s) {
  if (!s) return "";
  return String(s)
    .replace(/&\s*lt;/g, "<")
    .replace(/&\s*gt;/g, ">")
    .replace(/&\s*amp;/g, "&")
    .replace(/&\s*quot;/g, '"')
    .replace(/&\s*apos;/g, "'")
    .replace(/&\s*nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripHtml(s) {
  return decodeEntities(s)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(s, max) {
  const clean = stripHtml(s);
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trim() + "...";
}

async function parseFeed(ctx, xml, limit) {
  return await ctx.plugins.xml.rss({ text: xml, limit });
}

function cleanAuthor(author) {
  return stripHtml(author || "").replace(/^作者[：:]\s*/, "").trim();
}

function normalizeItem(item) {
  const url = item.link || item.url || item.guid || "";
  const guid = item.guid || url || item.title;
  const categories = (item.categories || []).map(stripHtml).filter(Boolean);
  const published = item.pubDate || item.published || item.updated || "";
  const ts = Date.parse(published);
  const hasTime = !isNaN(ts);
  return {
    guid,
    title: stripHtml(item.title || ""),
    url,
    summary: excerpt(item.description || item.summary || "", 280),
    author: cleanAuthor(item.author || ""),
    category: categories[0] || "",
    categories: categories.join(" / "),
    published_at: hasTime ? new Date(ts).toISOString() : published,
    published_ts: hasTime ? ts : 0,
    source: FEED.source,
  };
}

function upsertByGuid(collection, row, counters) {
  if (!row.guid || !row.title) return;
  const up = aglet.data.upsert(APP_ID, collection, "guid", row);
  if (up.upserted === "created") counters.added++;
  else counters.updated++;
}

export default {
  async ingest(_args, ctx) {
    const counters = { added: 0, updated: 0 };
    try {
      const resp = await fetch(FEED.url);
      if (!resp.ok) throw new Error(`${FEED.source} HTTP ${resp.status}`);
      const parsed = await parseFeed(ctx, resp.body || "", FEED.limit);
      for (const item of (parsed && parsed.items) || []) {
        upsertByGuid(FEED.collection, normalizeItem(item), counters);
      }
      setSyncError(ctx, "");
      return counters;
    } catch (e) {
      const msg = String((e && e.message) || e).slice(0, 200);
      setSyncError(ctx, msg);
      throw e;
    }
  },
};
