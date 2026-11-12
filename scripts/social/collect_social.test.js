const assert = require("assert");
const { normalizeTweet, normalizeScrapedX, normalizeThread, normalizeRedditItem, normalizeInstagram, dedupe, filterByWindow } = require("./collect_social");
const { parseCountToken, parseMetaCounts, enrichItem } = require("./ig_profile");

const nowIso = new Date().toISOString();
const oldIso = new Date(Date.now() - 36 * 3600 * 1000).toISOString();

const t = normalizeTweet({
  id: "1", text: "Prompt tip: ...", createdAtISO: nowIso,
  author: { screenName: "prompt_what" }, metrics: { likes: 900, retweets: 50, replies: 3, views: 10000 },
  media: [{ url: "https://pbs.twimg.com/a.jpg" }],
});
assert.strictEqual(t.id, "x:1");
assert.strictEqual(t.url, "https://x.com/prompt_what/status/1");
assert.strictEqual(t.metrics.reposts, 50);
assert.strictEqual(t.thumbnail, "https://pbs.twimg.com/a.jpg");

const sx = normalizeScrapedX({
  id: "212", author: "rowancheung", body: "AI roundup", publish_date: oldIso,
  url: "https://x.com/rowancheung/status/212", thumbnail: "", metrics: { likes: 500, reposts: 20, replies: 5, views: 9000 },
});
assert.strictEqual(sx.id, "x:212");
assert.strictEqual(sx.author, "@rowancheung");
assert.strictEqual(sx.metrics.views, 9000);

const th = normalizeThread({
  url: "https://www.threads.com/@ekke.now/post/ABC", author: "ekke.now",
  body: "Claude 활용법", publish_date: nowIso, metrics: { likes: 120 },
});
assert.strictEqual(th.id, "threads:ABC");
assert.strictEqual(th.author, "@ekke.now");
assert.strictEqual(th.metrics.likes, 120);

assert.strictEqual(dedupe([t, t, th]).length, 2);
assert.strictEqual(filterByWindow([t, sx], 24).length, 1);
assert.strictEqual(filterByWindow([t, sx], 48).length, 2);

const rd = normalizeRedditItem({
  id: "t3_1xtgkhj",
  title: "Structured prompt workflow",
  link: "https://www.reddit.com/r/PromptEngineering/comments/1xtgkhj/structured_prompt/",
  author: "/u/Cloudy_Day912",
  content: '<div class="md"><p>Use XML tags for evals.</p></div><img src="https://i.redd.it/demo.png"> submitted by /u/Cloudy_Day912',
  isoDate: nowIso,
}, "promptengineering");
assert.strictEqual(rd.id, "reddit:1xtgkhj");
assert.strictEqual(rd.platform, "reddit");
assert.strictEqual(rd.author, "r/PromptEngineering · u/Cloudy_Day912");
assert.strictEqual(rd.thumbnail, "https://i.redd.it/demo.png");
assert.ok(rd.text.includes("Structured prompt workflow") && rd.text.includes("Use XML tags"));
assert.strictEqual(dedupe([t, th, rd]).length, 3);

assert.strictEqual(parseCountToken("1.2K"), 1200);
assert.strictEqual(parseCountToken("1.5만"), 15000);
assert.deepStrictEqual(parseMetaCounts("13 likes, 7 comments - prompt_what", ""), { likes: 13, reposts: 0, replies: 7, views: 0 });
const ig = normalizeInstagram({
  url: "https://www.instagram.com/aiscene.kr/p/DfoCvaACU99/",
  author: "aiscene.kr",
  body: "Claude Whiteboards & Sheets guide",
  publish_date: nowIso,
  thumbnail: "https://scontent.cdninstagram.com/demo.jpg",
  metaDesc: "3 likes, 2 comments - aiscene.kr",
});
assert.strictEqual(ig.id, "instagram:DfoCvaACU99");
assert.strictEqual(ig.platform, "instagram");
assert.strictEqual(ig.author, "@aiscene.kr");
assert.strictEqual(ig.metrics.likes, 3);
assert.strictEqual(ig.metrics.replies, 2);
const enriched = enrichItem({
  author: "vibe.trender",
  body: "vibe.trender",
  publish_date: "",
  metaDesc: '7 likes, 26 comments - vibe.trender - November 10, 2026: "클로드 코드 오픈소스 4종 정리\n설치 가이드". ',
});
assert.ok(enriched.body.includes("클로드 코드 오픈소스 4종"));
assert.strictEqual(enriched.publish_date, "2026-11-10T12:00:00.000Z");
assert.strictEqual(dedupe([t, th, rd, ig]).length, 4);
console.log("✅ collect_social.test.js 통과");
