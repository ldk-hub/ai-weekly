"use strict";

const cheerio = require("cheerio");
const { parseMetaCounts } = require("./ig_profile");

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

module.exports = {
  normalizeTweet,
  normalizeScrapedX,
  normalizeThread,
  parseRedditContent,
  normalizeRedditItem,
  normalizeInstagram,
};
