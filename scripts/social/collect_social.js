#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const Parser = require("rss-parser");
const { loadSeeds, loadSeedRegistry } = require("./seeds");
const { collectInstagramEgo } = require("./ig_profile");
const { loadRecentCuratedIds } = require("./curate_social");
const { searchX } = require("../core/agent_reach");
const { fetchRawWithScrapling, scrapeSocial } = require("../core/scrapling_fetch");
const {
  normalizeTweet,
  normalizeScrapedX,
  normalizeThread,
  normalizeRedditItem,
  normalizeInstagram,
} = require("./normalize");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "data", "social_candidates.json");
const UV_BIN = process.env.UV_BIN || (fs.existsSync("/Users/nhn/.local/bin/uv") ? "/Users/nhn/.local/bin/uv" : "uv");
const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";
const THREADS_SCRIPT = path.join(__dirname, "threads_profile.py");
const X_SCRIPT = path.join(__dirname, "x_profile.py");
const WINDOW_H = Number(process.env.SOCIAL_WINDOW_HOURS || 24);
const FALLBACK_WINDOW_H = Number(process.env.SOCIAL_FALLBACK_HOURS || 48);
const MIN_PER_REQUIRED_PLATFORM = Number(process.env.SOCIAL_MIN_PER_PLATFORM || 3);
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

async function fetchRedditSub(sub) {
  const url = `https://www.reddit.com/r/${encodeURIComponent(sub)}/top/.rss?t=day`;
  const altUrl = `https://old.reddit.com/r/${encodeURIComponent(sub)}/top/.rss?t=day`;

  // 1차 우선 시도: Scrapling (curl-cffi 브라우저 TLS 핑거프린트 위장)
  for (const targetUrl of [url, altUrl]) {
    try {
      const rawXml = fetchRawWithScrapling(targetUrl, { timeoutMs: 15000, silent: true });
      if (rawXml && rawXml.includes("<")) {
        return await rssParser.parseString(rawXml);
      }
    } catch {
      // 다음 URL 또는 폴백으로 진행
    }
  }

  // 2차 폴백: 기존 rssParser.parseURL
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
    ["run", "--with", "scrapling[ai]", PYTHON_CMD, scriptPath, "--users", handles.join(","), "--limit", String(limit)],
    { cwd: ROOT, timeout: 600000, maxBuffer: 15 * 1024 * 1024 },
  );
  const line = stdout.trim().split("\n").reverse().find((l) => l.startsWith("{"));
  return line ? JSON.parse(line).items || [] : [];
}

async function collectX(handles, since) {
  const out = [];
  // 1차 우선 수집: Scrapling X 프로필 스텔스 크롤러
  console.log("[social:x] 1차 Scrapling X 프로필 크롤러 우선 실행...");
  try {
    const scraped = await runPythonScraper(X_SCRIPT, handles, 5);
    out.push(...scraped.map(normalizeScrapedX));
  } catch (err) {
    console.warn(`[social:x] 1차 Scrapling 경고 (폴백 진행): ${err.message}`);
  }

  // 2차 폴백: Scrapling 수집 결과가 없을 경우 기존 Agent-Reach(searchX) 폴백
  if (!out.length) {
    console.log("[social:x] 1차 Scrapling 0건 → 2차 Agent-Reach(searchX) 폴백 실행...");
    for (const [i, h] of handles.entries()) {
      if (i > 0) await sleep(X_DELAY_MS);
      try {
        const tweets = await searchX(`from:${h}`, { since, max: 10, type: "Latest", exclude: ["replies", "retweets"] });
        out.push(...(tweets || []).map(normalizeTweet));
      } catch (e) {
        console.warn(`[social:x:fallback] ${h} 실패: ${e.message}`);
        if (
          e.message.includes("쿠키 없음") ||
          e.message.includes("not_authenticated") ||
          e.message.includes("ENOENT") ||
          e.message.includes("실행 실패")
        ) {
          break;
        }
      }
    }
  }
  return out;
}

async function collectInstagram(handles, maxWindow) {
  if (!handles || !handles.length) return [];
  // 1차 우선 수집: Scrapling Instagram 크롤러
  console.log("[social:instagram] 1차 Scrapling Instagram 크롤러 우선 실행...");
  try {
    const scraped = scrapeSocial("instagram", { users: handles, limit: 4 }).map(normalizeInstagram);
    const validDated = filterByWindow(scraped, maxWindow);
    if (validDated.length > 0) {
      return scraped;
    }
  } catch (e) {
    console.warn(`[social:instagram] 1차 Scrapling 경고 (폴백 진행): ${e.message}`);
  }

  // 2차 폴백: 기존 ego-browser 로그인 세션
  console.log("[social:instagram] 1차 Scrapling 유효 게시물 부족 → 2차 ego-browser 로그인 세션 폴백 실행...");
  try {
    const egoItems = await collectInstagramEgo(handles, 4, maxWindow);
    return egoItems.map(normalizeInstagram);
  } catch (e) {
    console.warn(`[social:instagram:fallback] 실패: ${e.message}`);
    return [];
  }
}

function filterByWindow(posts, hours) {
  const sinceMs = Date.now() - hours * 3600 * 1000;
  return posts.filter((p) => {
    const ms = Date.parse(p.publishedAt || "");
    return Number.isFinite(ms) && ms >= sinceMs;
  });
}

async function collect(opts = {}) {
  const seeds = loadSeeds();
  const archiveDir = opts.archiveDir || path.join(ROOT, "data", "social");
  const todayKst = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  const recentIds = loadRecentCuratedIds(archiveDir, todayKst);
  try {
    const reg = loadSeedRegistry();
    const discoveredCounts = Object.fromEntries(
      ["x", "threads", "instagram", "reddit"].map((p) => [p, (reg.discovered?.[p] || []).length]),
    );
    console.log(`[social] 활성 시드 (core+discovered): ${JSON.stringify({ x: seeds.x.length, threads: seeds.threads.length, instagram: seeds.instagram.length, reddit: seeds.reddit.length })} · 신규발굴 포함 ${JSON.stringify(discoveredCounts)}`);
  } catch {}
  const maxWindow = Math.max(WINDOW_H, FALLBACK_WINDOW_H);
  const since = new Date(Date.now() - maxWindow * 3600 * 1000).toISOString().slice(0, 10);
  const [xPosts, threadPosts, redditPosts, igPosts] = await Promise.all([
    process.env.SOCIAL_SKIP_X === "1" ? [] : collectX(seeds.x, since),
    process.env.SOCIAL_SKIP_THREADS === "1"
      ? []
      : runPythonScraper(THREADS_SCRIPT, seeds.threads, 5).then((items) => items.map(normalizeThread)).catch((e) => {
          console.warn(`[social:threads] 실패: ${e.message}`);
          return [];
        }),
    process.env.SOCIAL_SKIP_REDDIT === "1" ? [] : collectReddit(seeds.reddit || []),
    process.env.SOCIAL_SKIP_INSTAGRAM === "1"
      ? []
      : collectInstagram(seeds.instagram || [], maxWindow),
  ]);

  const deduped = dedupe([...xPosts, ...threadPosts, ...redditPosts, ...igPosts]);
  const unique = deduped.filter((p) => !recentIds.has(p.id));
  const recentSkipped = deduped.length - unique.length;
  if (recentSkipped > 0) {
    console.log(`[social] 최근 7일 기배포 중복 ${recentSkipped}건 제외`);
  }
  let windowUsed = WINDOW_H;
  let posts = filterByWindow(unique, WINDOW_H);
  if (posts.length === 0 && FALLBACK_WINDOW_H > WINDOW_H) {
    windowUsed = FALLBACK_WINDOW_H;
    posts = filterByWindow(unique, FALLBACK_WINDOW_H);
    console.log(`[social] ${WINDOW_H}h 창 0건 → ${FALLBACK_WINDOW_H}h 창으로 1회 확장`);
  } else if (FALLBACK_WINDOW_H > WINDOW_H) {
    const fallbackPool = filterByWindow(unique, FALLBACK_WINDOW_H);
    const seenIds = new Set(posts.map((p) => p.id));
    for (const reqPlatform of ["instagram", "x", "threads"]) {
      const currentCount = posts.filter((p) => p.platform === reqPlatform).length;
      if (currentCount < MIN_PER_REQUIRED_PLATFORM) {
        const extras = fallbackPool
          .filter((p) => p.platform === reqPlatform && !seenIds.has(p.id))
          .slice(0, MIN_PER_REQUIRED_PLATFORM - currentCount);
        for (const ex of extras) {
          posts.push(ex);
          seenIds.add(ex.id);
        }
        if (extras.length) {
          console.log(`[social:${reqPlatform}] ${WINDOW_H}h 창 ${currentCount}건 → ${FALLBACK_WINDOW_H}h 보충 +${extras.length}건`);
        }
      }
    }
  }
  const finalDist = posts.reduce((acc, p) => ({ ...acc, [p.platform]: (acc[p.platform] || 0) + 1 }), {});
  console.log(`[social] 수집 원본 x=${xPosts.length} threads=${threadPosts.length} reddit=${redditPosts.length} instagram=${igPosts.length} → ${windowUsed}h 최종 ${posts.length}건 (${JSON.stringify(finalDist)})`);
  return posts;
}

module.exports = { normalizeTweet, normalizeScrapedX, normalizeThread, normalizeRedditItem, normalizeInstagram, dedupe, filterByWindow, collect };

if (require.main === module) {
  (async () => {
    if (process.argv.includes("--discover")) {
      const { discoverSeeds } = require("./discover_seeds");
      await discoverSeeds();
    }
    const posts = await collect();
    fs.writeFileSync(OUT, JSON.stringify({ collectedAt: new Date().toISOString(), posts }, null, 2));
    console.log(`[social] 저장: ${OUT}`);
  })();
}
