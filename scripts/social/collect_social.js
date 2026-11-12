#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const Parser = require("rss-parser");
const cheerio = require("cheerio");
const { loadSeeds } = require("./seeds");
const { collectInstagramEgo, parseMetaCounts } = require("./ig_profile");
const { searchX } = require("../core/agent_reach");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "data", "social_candidates.json");
const UV_BIN = "/Users/nhn/.local/bin/uv";
const THREADS_SCRIPT = path.join(__dirname, "threads_profile.py");
const X_SCRIPT = path.join(__dirname, "x_profile.py");
const WINDOW_H = Number(process.env.SOCIAL_WINDOW_HOURS || 24);
const FALLBACK_WINDOW_H = Number(process.env.SOCIAL_FALLBACK_HOURS || 48);
const X_DELAY_MS = Number(process.env.SOCIAL_X_DELAY_MS || 4000);
const REDDIT_DELAY_MS = Number(process.env.SOCIAL_REDDIT_DELAY_MS || 8000);
const REDDIT_PER_SUB = Number(process.env.SOCIAL_REDDIT_LIMIT || 5);
const rssParser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "ai-weekly/1.0 (+https://github.com/ai-weekly)" },
  customFields: { item: [["media:thumbnail", "mediaThumbnail"]] },
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const execFileAsync = promisify(execFile);

function normalizeTweet(t) {
  const handle = (t.author && t.author.screenName) || "i";
  const m = t.metrics || {};
  return {
    id: `x:${t.id}`,
    platform: "x",
    author: `@${handle}`,
    url: `https://x.com/${handle}/status/${t.id}`,
    text: String(t.text || ""),
    thumbnail: (t.media && t.media[0] && t.media[0].url) || "",
    publishedAt: t.createdAtISO,
    metrics: { likes: m.likes || 0, reposts: m.retweets || 0, replies: m.replies || 0, views: m.views || 0 },
  };
}

function normalizeScrapedX(item) {
  const m = item.metrics || {};
  const author = String(item.author || "").replace(/^@/, "");
  return {
    id: `x:${item.id}`,
    platform: "x",
    author: `@${author}`,
    url: item.url,
    text: String(item.body || ""),
    thumbnail: item.thumbnail || "",
    publishedAt: item.publish_date || "",
    metrics: { likes: m.likes || 0, reposts: m.reposts || 0, replies: m.replies || 0, views: m.views || 0 },
  };
}

function normalizeThread(item) {
  const postId = String(item.url || "").split("/post/")[1] || item.url;
  const m = item.metrics || {};
  return {
    id: `threads:${postId}`,
    platform: "threads",
    author: `@${String(item.author || "").replace(/^@/, "")}`,
    url: item.url,
    text: String(item.body || ""),
    thumbnail: item.thumbnail || "",
    publishedAt: item.publish_date || "",
    metrics: { likes: m.likes || 0, reposts: m.reposts || 0, replies: m.replies || 0, views: 0 },
  };
}

function parseRedditContent(item) {
  const cleanTitle = String(item.title || "").trim();
  const fallbackBody = String(item.contentSnippet || "").replace(/\s*submitted by\s+\/?u\/\S+[\s\S]*$/i, "").trim();
  let bodyText = "";
  let imgSrc = "";
  if (item.content) {
    const $ = cheerio.load(item.content);
    bodyText = $(".md").text().replace(/\s+/g, " ").trim();
    imgSrc = $("img").map((_, el) => $(el).attr("src")).get().find((u) => /^https:\/\//.test(u || "")) || "";
  }
  const mediaThumb = item.mediaThumbnail?.$?.url || "";
  const thumbnail = /^https:\/\//.test(mediaThumb) ? mediaThumb : imgSrc;
  const body = bodyText || fallbackBody;
  const text = body && body !== cleanTitle ? `${cleanTitle}\n${body}` : cleanTitle || body;
  return { text: text.slice(0, 2000), thumbnail };
}

function normalizeRedditItem(item, fallbackSub = "") {
  const url = String(item.link || "");
  const sub = url.match(/\/r\/([^/]+)\//i)?.[1] || fallbackSub || "reddit";
  const postId = String(item.id || "").replace(/^t3_/, "") || url.match(/\/comments\/([a-z0-9]+)/i)?.[1] || url;
  const user = String(item.author || "").replace(/^\/?u\//i, "").trim();
  const { text, thumbnail } = parseRedditContent(item);
  return {
    id: `reddit:${postId}`,
    platform: "reddit",
    author: user ? `r/${sub} · u/${user}` : `r/${sub}`,
    url,
    text,
    thumbnail,
    publishedAt: item.isoDate || item.pubDate || "",
    metrics: { likes: 0, reposts: 0, replies: 0, views: 0 },
  };
}

async function fetchRedditSub(sub) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/top/.rss?t=day`;
  try {
    return await rssParser.parseURL(url);
  } catch (e) {
    if (!String(e.message).includes("429")) throw e;
    console.warn(`[social:reddit] r/${sub} 429 → 대기 후 재시도`);
    await sleep(Math.max(REDDIT_DELAY_MS * 2, 10000));
    return rssParser.parseURL(url);
  }
}

async function collectReddit(subs) {
  const out = [];
  for (const [i, sub] of subs.entries()) {
    if (i > 0) await sleep(REDDIT_DELAY_MS);
    try {
      const feed = await fetchRedditSub(sub);
      out.push(...(feed.items || []).slice(0, REDDIT_PER_SUB).map((it) => normalizeRedditItem(it, sub)));
    } catch (e) {
      console.warn(`[social:reddit] r/${sub} 실패: ${e.message}`);
    }
  }
  return out;
}

function dedupe(posts) {
  const seen = new Set();
  return posts.filter((p) => {
    const key = p.text.trim() || p.id;
    if (seen.has(p.id) || seen.has(key)) return false;
    seen.add(p.id).add(key);
    return true;
  });
}

async function runPythonScraper(scriptPath, handles, limit = 3) {
  if (!handles.length) return [];
  const { stdout } = await execFileAsync(
    UV_BIN,
    ["run", "--with", "scrapling[ai]", "python3", scriptPath, "--users", handles.join(","), "--limit", String(limit)],
    { cwd: ROOT, timeout: 600000, maxBuffer: 15 * 1024 * 1024 },
  );
  const line = stdout.trim().split("\n").reverse().find((l) => l.startsWith("{"));
  return line ? JSON.parse(line).items || [] : [];
}

async function collectX(handles, since) {
  const out = [];
  for (const [i, h] of handles.entries()) {
    if (i > 0) await sleep(X_DELAY_MS);
    try {
      const tweets = await searchX(`from:${h}`, { since, max: 10, type: "Latest", exclude: ["replies", "retweets"] });
      out.push(...(tweets || []).map(normalizeTweet));
    } catch (e) {
      console.warn(`[social:x] ${h} 실패: ${e.message}`);
      if (e.message.includes("쿠키 없음") || e.message.includes("not_authenticated")) {
        console.log("[social:x] Scrapling X 프로필 폴백 실행...");
        try {
          const scraped = await runPythonScraper(X_SCRIPT, handles, 5);
          return scraped.map(normalizeScrapedX);
        } catch (err) {
          console.warn(`[social:x] Scrapling 폴백 실패: ${err.message}`);
        }
        break;
      }
    }
  }
  return out;
}

function normalizeInstagram(item) {
  const m = item.metrics || parseMetaCounts(item.metaDesc, item.likesText);
  const shortcode = String(item.url || "").match(/\/(?:p|reel)\/([^/?#]+)/)?.[1] || item.url;
  const author = String(item.author || "").replace(/^@/, "");
  return {
    id: `instagram:${shortcode}`,
    platform: "instagram",
    author: `@${author}`,
    url: item.url,
    text: String(item.body || ""),
    thumbnail: item.thumbnail || "",
    publishedAt: item.publish_date || "",
    metrics: { likes: m.likes || 0, reposts: 0, replies: m.replies || 0, views: 0 },
  };
}

function filterByWindow(posts, hours) {
  const sinceMs = Date.now() - hours * 3600 * 1000;
  return posts.filter((p) => !p.publishedAt || Date.parse(p.publishedAt) >= sinceMs);
}

async function collect() {
  const seeds = loadSeeds();
  const maxWindow = Math.max(WINDOW_H, FALLBACK_WINDOW_H);
  const since = new Date(Date.now() - maxWindow * 3600 * 1000).toISOString().slice(0, 10);
  const [xPosts, threadPosts, redditPosts, igPosts] = await Promise.all([
    process.env.SOCIAL_SKIP_X === "1" ? [] : collectX(seeds.x, since),
    process.env.SOCIAL_SKIP_THREADS === "1"
      ? []
      : runPythonScraper(THREADS_SCRIPT, seeds.threads, 3).then((items) => items.map(normalizeThread)).catch((e) => {
          console.warn(`[social:threads] 실패: ${e.message}`);
          return [];
        }),
    process.env.SOCIAL_SKIP_REDDIT === "1" ? [] : collectReddit(seeds.reddit || []),
    process.env.SOCIAL_SKIP_INSTAGRAM === "1"
      ? []
      : collectInstagramEgo(seeds.instagram || [], 3, maxWindow)
          .then((items) => items.map(normalizeInstagram))
          .catch((e) => {
            console.warn(`[social:instagram] 실패: ${e.message}`);
            return [];
          }),
  ]);

  const unique = dedupe([...xPosts, ...threadPosts, ...redditPosts, ...igPosts]);
  let windowUsed = WINDOW_H;
  let posts = filterByWindow(unique, WINDOW_H);
  if (posts.length === 0 && FALLBACK_WINDOW_H > WINDOW_H) {
    windowUsed = FALLBACK_WINDOW_H;
    posts = filterByWindow(unique, FALLBACK_WINDOW_H);
    console.log(`[social] ${WINDOW_H}h 창 0건 → ${FALLBACK_WINDOW_H}h 창으로 1회 확장`);
  }
  console.log(`[social] x=${xPosts.length} threads=${threadPosts.length} reddit=${redditPosts.length} instagram=${igPosts.length} → ${windowUsed}h 창 내 ${posts.length}건`);
  return posts;
}

module.exports = { normalizeTweet, normalizeScrapedX, normalizeThread, normalizeRedditItem, normalizeInstagram, dedupe, filterByWindow, collect };

if (require.main === module) {
  collect().then((posts) => {
    fs.writeFileSync(OUT, JSON.stringify({ collectedAt: new Date().toISOString(), posts }, null, 2));
    console.log(`[social] 저장: ${OUT}`);
  });
}
