const APP_ID = "sspai";

const FEEDS = [
  {
    collection: "index_articles",
    source: "SSPAI Index",
    url: "https://rsshub.rssforever.com/sspai/index",
    limit: 50,
  },
  {
    collection: "matrix_articles",
    source: "SSPAI Matrix",
    url: "https://rsshub.rssforever.com/sspai/matrix",
    limit: 50,
  },
];

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
  const clean = stripHtml(s)
    .replace(/^Matrix\s+首页推荐\s*/i, "")
    .replace(/^摘要\s*/i, "")
    .trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trim() + "...";
}

async function parseFeed(ctx, xml, limit) {
  return await ctx.plugins.xml.rss({ text: xml, limit });
}

function normalizeItem(item, source) {
  const url = item.link || item.url || item.guid || "";
  const guid = item.guid || url || item.title;
  const published = item.pubDate || item.published || item.updated || "";
  const ts = Date.parse(published);
  const hasTime = !isNaN(ts);
  return {
    guid,
    title: stripHtml(item.title || ""),
    url,
    summary: excerpt(item.description || item.summary || "", 280),
    author: stripHtml(item.author || ""),
    published_at: hasTime ? new Date(ts).toISOString() : published,
    published_ts: hasTime ? ts : 0,
    source,
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
    let added = 0;
    let updated = 0;
    try {
      for (const feed of FEEDS) {
        const resp = await fetch(feed.url);
        if (!resp.ok) throw new Error(`${feed.source} HTTP ${resp.status}`);
        const parsed = await parseFeed(ctx, resp.body || "", feed.limit);
        const counters = { added: 0, updated: 0 };
        for (const item of (parsed && parsed.items) || []) {
          upsertByGuid(feed.collection, normalizeItem(item, feed.source), counters);
        }
        added += counters.added;
        updated += counters.updated;
      }
      setSyncError(ctx, "");
      return { added, updated };
    } catch (e) {
      const msg = String((e && e.message) || e).slice(0, 200);
      setSyncError(ctx, msg);
      throw e;
    }
  },
};
