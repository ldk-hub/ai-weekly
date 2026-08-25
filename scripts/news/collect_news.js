#!/usr/bin/env node
// Deterministic daily collector: 기술 신호 6축 소스 → data/news_candidates.json
// LLM 없음. 사실 수집 + 본문 확보 + 중복 제거만 담당.
// 번역·요약·분류는 curate_news.js(Gemini) 가 담당.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Parser = require("rss-parser");
const cheerio = require("cheerio");
const moment = require("moment-timezone");
const { execFile, execFileSync } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, ".tmp", "news_candidates.json");

const WINDOW_HOURS = Number(process.env.NEWS_WINDOW_HOURS || 24);
const SINCE = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000);
const SINCE_DATE = SINCE.toISOString().slice(0, 10);
const SINCE_EPOCH = Math.floor(SINCE.getTime() / 1000);
const NOW_KST = moment().tz("Asia/Seoul");

const UA = "Mozilla/5.0 (compatible; ai-weekly-newsbot/1.0)";
const NET_TIMEOUT_MS = Number(process.env.NEWS_NET_TIMEOUT_MS || 12000);
const SOCIAL_TIMEOUT_MS = Number(process.env.NEWS_SOCIAL_TIMEOUT_MS || 180000);
const BODY_MIN_CHARS = 400;
const BODY_MAX_CHARS = 6000;
const BODY_FETCH_TIMEOUT_MS = 8000;
const BODY_FETCH_CONCURRENCY = 6;
const NO_FETCH_HOSTS = [
  "x.com", "twitter.com", "instagram.com", "threads.net", "threads.com", "bsky.app",
  "youtube.com", "youtu.be", "reddit.com", "linkedin.com", "facebook.com",
];

const LEGACY_KEYWORDS = [
  "throwback", "icymi", "in case you missed it", "years ago", "months ago",
  "last year", "지난번", "회고", "추억", "지난 기사", "지난해",
];

// ── 유틸 ──────────────────────────────────────────────────────────────
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 10);

// 날짜가 없거나 파싱 불가한 항목은 시간창 판정이 불가능해 제외한다.
// 조용히 사라지면 "날짜 필드명이 다른 피드"가 전량 누락돼도 알 수 없으므로 건수를 집계해 main 에서 보고한다.
const dateless = {};
function inWindow(dateLike, sourceLabel = "unknown") {
  if (!dateLike || Number.isNaN(new Date(dateLike).getTime())) {
    dateless[sourceLabel] = (dateless[sourceLabel] || 0) + 1;
    return false;
  }
  return new Date(dateLike) >= SINCE;
}

function isLegacy(text) {
  const t = (text || "").toLowerCase();
  return LEGACY_KEYWORDS.some((k) => t.includes(k));
}

// 소셜 경유 링크는 추적 파라미터를 잔뜩 달고 온다(실측 thenewstack: link_source·taid·utm_* 4종).
// 남겨두면 같은 기사가 매체마다 다른 URL 로 보여 중복 판정이 새고, 독자에게 노출되는 링크도 지저분해진다.
const TRACKING_PARAM_RE = /^utm_|^ref$|^ref_src$|^s$|^igshid$|^fbclid$|^gclid$|^msclkid$|^mc_cid$|^mc_eid$|^link_source$|^taid$|^spm$|^scid$|^at_medium$|^at_campaign$/i;

function stripTracking(u) {
  try {
    const url = new URL(u);
    url.hash = "";
    [...url.searchParams.keys()].filter((k) => TRACKING_PARAM_RE.test(k)).forEach((k) => url.searchParams.delete(k));
    return url.toString();
  } catch {
    return u;
  }
}

function normalizeUrl(u) {
  try {
    const url = new URL(stripTracking(u));
    return `${url.host.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}${url.search}`;
  } catch {
    return (u || "").trim();
  }
}

function normalizeTitle(t) {
  return (t || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 60);
}

// ── 최근 배포본 이력 (크로스데이 중복 차단) ───────────────────────────
// dedupe() 는 한 번의 실행 안에서만 비교한다. 어제 배포한 항목은 오늘 후보로 그대로 다시 올라오고,
// GitHub 은 넓은 생성 창 + 절대 star 정렬이라 같은 리포가 매일 상위에 고정됐다
// (실측 2026-08-18~25: 고유 URL 104건 중 재등장 11건, 그중 10건이 GitHub).
// archive/news_*.json 은 커밋되어 있으므로 CI 체크아웃에서도 그대로 읽힌다.
const REPEAT_LOOKBACK_DAYS = Number(process.env.NEWS_REPEAT_LOOKBACK_DAYS || 7);
// 같은 리포라도 그동안 이만큼 더 컸으면 "업데이트" 로 다시 다룰 가치가 있다 (신규 발표로 위장하지 않는다).
const UPDATE_STAR_GROWTH = Number(process.env.NEWS_UPDATE_STAR_GROWTH || 0.3);

function loadRecentlyPublished() {
  const dir = path.join(ROOT, "site", "public", "data", "archive");
  const seen = new Map(); // normalizeUrl(url) → { date, stars }
  if (!fs.existsSync(dir)) return seen;
  const cutoff = new Date(Date.now() - REPEAT_LOOKBACK_DAYS * 864e5).toISOString().slice(0, 10);
  const files = fs.readdirSync(dir)
    .filter((f) => /^news_\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .filter((f) => f.slice(5, 15) >= cutoff);
  for (const f of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    } catch (e) {
      console.warn(`[repeat] ${f} 파싱 실패: ${e.message}`);
      continue;
    }
    const date = f.slice(5, 15);
    for (const n of data.news || []) {
      if (!n.url) continue;
      const key = normalizeUrl(n.url);
      const prev = seen.get(key);
      if (!prev || date > prev.date) seen.set(key, { date, stars: Number(n.metrics && n.metrics.stars) || 0 });
    }
  }
  console.log(`[repeat] 최근 ${REPEAT_LOOKBACK_DAYS}일 배포본 ${files.length}개 → URL ${seen.size}건 로드`);
  return seen;
}

// 이미 배포한 항목은 버린다. GitHub 리포만 예외 — star 가 크게 늘었으면 업데이트 표식을 달아 남긴다.
function dropRepeats(candidates, published) {
  const kept = [];
  let dropped = 0;
  let updates = 0;
  for (const c of candidates) {
    const prev = published.get(normalizeUrl(c.url));
    if (!prev) {
      kept.push(c);
      continue;
    }
    const stars = Number(c.metrics && c.metrics.stars) || 0;
    const grew = prev.stars > 0 && stars >= prev.stars * (1 + UPDATE_STAR_GROWTH);
    if (c.source === "github" && grew) {
      c.is_update = true;
      c.prev_published_date = prev.date;
      c.prev_stars = prev.stars;
      c.star_growth_pct = Number(((stars / prev.stars - 1) * 100).toFixed(1));
      kept.push(c);
      updates++;
      continue;
    }
    dropped++;
  }
  console.log(`[repeat] 최근 배포분과 겹쳐 제외 ${dropped}건 · 업데이트로 유지 ${updates}건`);
  return { kept, dropped, updates };
}

// 전역 fetch 는 기본 타임아웃이 없다. 한 호스트가 응답을 끌면 main 의 Promise.all 이 영구 대기하므로
// 모든 네트워크 경로는 이 래퍼를 거친다.
async function fetchWithTimeout(url, { headers = {}, timeoutMs = NET_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, headers = {}) {
  return (await fetchWithTimeout(url, { headers })).json();
}

// rss-parser 의 내장 http 클라이언트는 이 환경에서 타임아웃 나므로 fetch 로 받아 파싱만 위임
async function parseFeed(url) {
  const res = await fetchWithTimeout(url);
  return new Parser().parseString(await res.text());
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pMap(items, limit, fn) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        await fn(items[i], i);
      }
    })
  );
}

function ghToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

function makeCandidate({ source, sourceName, url, title, author, publishDate, body, metrics, signalHint, lang }) {
  const text = (body || "").trim();
  const cleanUrl = stripTracking(url);
  return {
    id: `${source}_${sha(normalizeUrl(cleanUrl) || title)}`,
    source,
    source_name: sourceName,
    url: cleanUrl,
    title: (title || "").trim(),
    author: author || sourceName,
    publish_date: new Date(publishDate || Date.now()).toISOString(),
    lang: lang || "en",
    body: text,
    body_chars: text.length,
    metrics: metrics || {},
    signal_hint: signalHint || null,
  };
}

// ── 본문 확보 ─────────────────────────────────────────────────────────
function extractText(html) {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, aside, noscript, form, iframe").remove();
  const scoped = $("article").text() || $("main").text() || $('[role="main"]').text();
  const raw = (scoped && scoped.trim().length > 200 ? scoped : $("body").text()) || "";
  return raw.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

async function fetchBody(url) {
  let host;
  try {
    host = new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (NO_FETCH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BODY_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: controller.signal, redirect: "follow" });
    if (!res.ok) return null;
    if (!(res.headers.get("content-type") || "").includes("text/html")) return null;
    return extractText(await res.text()).slice(0, BODY_MAX_CHARS);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichBodies(candidates) {
  const targets = candidates.filter((c) => c.body_chars < BODY_MIN_CHARS && /^https?:/.test(c.url));
  console.log(`[body] 본문 부족 ${targets.length}건 원문 fetch 시도`);
  let ok = 0;
  await pMap(targets, BODY_FETCH_CONCURRENCY, async (c) => {
    const text = await fetchBody(c.url);
    if (text && text.length > c.body_chars) {
      c.body = text;
      c.body_chars = text.length;
      c.body_source = "fulltext";
      ok++;
    }
  });
  console.log(`[body] 본문 보강 성공 ${ok}/${targets.length}건`);
}

// ── 소스별 수집 ───────────────────────────────────────────────────────
// 수집 매체 7종: GeekNews · Hacker News · AI타임스 · Reddit · GitHub · Bluesky · HF Daily Papers.
// X·Threads 는 목록에서 내렸다 — last30days 가 두 매체를 상시 0건으로 반환해(2026-08-18~25 실측 7일 연속)
// "7매체" 라는 문서상 약속만 남고 실물이 없었다. 소셜 축은 Bluesky 직접 수집이 대신한다.
// 목록 밖 피드를 함부로 늘리지 않는다 — 발행 주기가 24시간보다 길면 창 안에 글이 없어 창 밖 과거 기사를 끌어오게 된다
// (2026-08-03 회귀 지점). 추가 조건은 하나: **일 단위로 신규 항목이 나오는 매체만.**
const FEED_PER_SOURCE = Number(process.env.NEWS_FEED_PER_SOURCE || 5);

const CURATED_FEEDS = [
  { source: "geeknews", name: "GeekNews", url: "https://news.hada.io/rss/news", lang: "ko" },
  { source: "aitimes", name: "AI타임스", url: "https://www.aitimes.com/rss/allArticle.xml", lang: "ko" },
];

// 지정 7매체. 최종 건수가 0인 소스는 main 에서 [MISSING] 으로 보고한다 — 조용한 누락 금지
const REQUIRED_SOURCES = {
  geeknews: "GeekNews", hackernews: "Hacker News", aitimes: "AI타임스",
  reddit: "Reddit", github: "GitHub", bluesky: "Bluesky", hfpapers: "HF Daily Papers",
};

function normalizeFeedItems(feed) {
  return (feed.items || []).map((item) => ({
    title: item.title,
    link: item.link,
    pubDate: item.isoDate || item.pubDate,
    body: item.contentSnippet || item.content || item.summary || "",
    author: item.creator || item.author || "",
  }));
}

// 창 밖 보충(floor-fill)은 두지 않는다. 24시간 창이 이 파이프라인의 유일한 신선도 계약이고,
// 보충분은 큐레이터까지 표식이 전달되지 않아 과거 기사가 오늘치로 배포됐다.
async function fetchCuratedFeed(def) {
  let raw;
  try {
    raw = normalizeFeedItems(await parseFeed(def.url));
  } catch (e) {
    console.warn(`[${def.source}] 실패: ${e.message}`);
    return [];
  }

  return raw
    .filter((i) => i.title && i.link && !isLegacy(i.title) && !isLegacy(i.body))
    .filter((i) => inWindow(i.pubDate, def.source))
    .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0))
    .slice(0, FEED_PER_SOURCE)
    .map((i) => makeCandidate({
      source: def.source,
      sourceName: def.name,
      url: i.link,
      title: i.title,
      author: i.author || def.name,
      publishDate: i.pubDate,
      body: i.body,
      lang: def.lang,
    }));
}

// ①②③⑤⑥ (기술 커뮤니티 화제성)
const HN_QUERIES = [
  "LLM", "AI agent", "coding agent", "MCP server", "open source LLM",
  "benchmark model", "transformer paper", "Claude", "GPT", "Gemini",
];
async function fetchHackerNews() {
  const seen = new Set();
  const out = [];
  for (const q of HN_QUERIES) {
    try {
      const url = `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(q)}`
        + `&tags=story&numericFilters=created_at_i>${SINCE_EPOCH},points>=15&hitsPerPage=25`;
      const body = await getJson(url);
      for (const hit of body.hits || []) {
        if (seen.has(hit.objectID)) continue;
        seen.add(hit.objectID);
        const link = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        out.push(makeCandidate({
          source: "hackernews",
          sourceName: "Hacker News",
          url: link,
          title: hit.title,
          author: hit.author ? `@${hit.author}` : "Hacker News",
          publishDate: hit.created_at,
          body: hit.story_text || "",
          metrics: {
            points: hit.points || 0,
            comments: hit.num_comments || 0,
            discussion_url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
          },
        }));
      }
    } catch (e) {
      console.warn(`[hn] "${q}" 실패:`, e.message);
    }
  }
  return out;
}

// ④ 개인·소규모 오픈소스 (핵심 신호 — 신생 저star 리포까지 발굴)
// 생성 창을 넓히면 그 안의 고star 노장 리포가 매일 상위를 차지한다. 창은 좁게 두고,
// "지금 뜨고 있는가" 판정은 ghMomentum(하루평균 star) 이 맡는다.
// 대형 리포(stars>=5000) 를 쓸어오던 4번째 쿼리는 GitHub API 가 422 Validation Failed 로
// 상시 거부(경고만 찍히고 무시)해 왔고, 문법을 고쳐도 20만 star 급 리포만 반환해 뉴스 가치가 없어 삭제했다.
const GH_QUERIES = [
  // 커뮤니티 핫이슈 (최근 7일 생성, 별 20개 이상)
  `created:>=${new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)} pushed:>=${SINCE_DATE} stars:>=20 "llm" OR "ai" OR "agent" in:name,description,topics`,
  // 급상승 핫이슈 (최근 10일 생성, 별 100개 이상)
  `created:>=${new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10)} pushed:>=${SINCE_DATE} stars:>=100 "llm" OR "ai" OR "agent" OR "mcp" in:name,description,topics`,
  // 특정 주요 키워드 급상승 (최근 14일 생성, 별 10개 이상)
  `created:>=${new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)} pushed:>=${SINCE_DATE} stars:>=10 "coding agent" OR "claude code" OR "mcp" in:name,description,topics`,
];

// 쿼리 실패는 조용히 넘어가면 축 하나가 통째로 죽어도 알 수 없다 — main 에서 보고한다.
const ghQueryErrors = [];
async function fetchGitHub() {
  const token = ghToken();
  if (!token) {
    console.warn("[github] GH_TOKEN/GITHUB_TOKEN/gh auth 없음 — 오픈소스 신호(④) 건너뜀");
    return [];
  }
  const repos = new Map();
  for (const q of GH_QUERIES) {
    try {
      const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`;
      const body = await getJson(url, {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      });
      for (const r of body.items || []) {
        if (r.fork || r.archived || repos.has(r.full_name)) continue;
        repos.set(r.full_name, r);
      }
    } catch (e) {
      console.warn(`[github] 쿼리 실패 (${e.message}): ${q}`);
      ghQueryErrors.push(`${e.message}: ${q.slice(0, 60)}`);
    }
  }

  const out = [...repos.values()].map((r) => makeCandidate({
    source: "github",
    sourceName: "GitHub",
    url: r.html_url,
    title: `${r.full_name} — ${r.description || "(설명 없음)"}`,
    author: r.owner.login,
    // 급상승 쿼리는 30일 내 생성 리포까지 잡는다. 신호 발생 시점은 생성일이 아니라 최근 push 다 —
    // created_at 을 쓰면 한 달 전 날짜가 오늘치 뉴스로 표시된다 (실측 34건)
    publishDate: r.pushed_at || r.created_at,
    body: [r.description || "", `topics: ${(r.topics || []).join(", ")}`, `language: ${r.language || "n/a"}`].join("\n"),
    metrics: {
      stars: r.stargazers_count,
      forks: r.forks_count,
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      repo: r.full_name,
      // 생성 이후 하루평균 획득 star. 절대 star 는 "오래됨" 과 구분이 안 돼 급상승 판정에 못 쓴다.
      stars_per_day: Math.round(r.stargazers_count / Math.max(1, (Date.now() - new Date(r.created_at).getTime()) / 864e5)),
    },
    signalHint: "oss",
  }));

  // README 를 본문으로 채워 큐레이터가 "무엇을 하는 도구인지" 요약할 수 있게 함
  await pMap(out, BODY_FETCH_CONCURRENCY, async (c) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${c.metrics.repo}/readme`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github.raw", "User-Agent": UA },
      });
      if (!res.ok) return;
      const text = (await res.text()).slice(0, BODY_MAX_CHARS);
      if (text.length > 0) {
        c.body = `${c.body}\n\n---README---\n${text}`;
        c.body_chars = c.body.length;
        c.body_source = "readme";
      }
    } catch { /* README 없으면 description 만으로 진행 */ }
  });

  return out;
}

// ③④⑥ 실사용·워크플로우 논의
const SUBREDDITS = ["LocalLLaMA", "MachineLearning", "ClaudeAI", "OpenAI", "singularity"];

// reddit.com 의 `.json` 엔드포인트는 비인증 403 이지만 `top/.rss?t=day` 는 무인증 200 이다 (OAuth 불필요).
// 대신 IP 단위 throttle 이 강해 연속 요청은 429 를 받는다 → 순차 + 지연 + 429 재시도 필수.
// RSS 에는 점수 필드가 없으므로 "당일 top 정렬" 자체를 품질 프록시로 쓰고 상위 N 개만 취한다.
const REDDIT_DELAY_MS = Number(process.env.NEWS_REDDIT_DELAY_MS || 20000);
const REDDIT_PER_SUB = Number(process.env.NEWS_REDDIT_PER_SUB || 8);
const REDDIT_ATTEMPTS = Number(process.env.NEWS_REDDIT_ATTEMPTS || 3);

// throttle 은 몇 분 단위로 풀린다. 1회 재시도로는 서브 전량이 빠져 Reddit 이 통째로 0건이 됐다 → 지연을 늘려가며 3회.
async function fetchRedditSub(sub) {
  const url = `https://www.reddit.com/r/${sub}/top/.rss?t=day`;
  for (let attempt = 0; attempt < REDDIT_ATTEMPTS; attempt++) {
    try {
      return await parseFeed(url);
    } catch (e) {
      const last = attempt === REDDIT_ATTEMPTS - 1;
      if (last || (e.status !== 429 && e.name !== "AbortError")) throw e;
      const wait = REDDIT_DELAY_MS * (attempt + 1);
      console.warn(`[reddit] r/${sub} ${e.status || e.name} — ${wait / 1000}s 후 재시도 (${attempt + 2}/${REDDIT_ATTEMPTS})`);
      await sleep(wait);
    }
  }
  return null;
}

async function fetchReddit() {
  if (process.env.NEWS_SKIP_REDDIT === "1") {
    console.warn("[reddit] NEWS_SKIP_REDDIT=1 — 건너뜀");
    return [];
  }
  const out = [];
  for (const [idx, sub] of SUBREDDITS.entries()) {
    if (idx > 0) await sleep(REDDIT_DELAY_MS); // throttle 회피: 서브레딧 간 간격 확보
    try {
      const feed = await fetchRedditSub(sub);
      let taken = 0;
      for (const item of feed?.items || []) {
        if (taken >= REDDIT_PER_SUB) break;
        const date = item.isoDate || item.pubDate || item.updated;
        if (!inWindow(date, "reddit")) continue;
        const author = (item.author || "").replace(/^\/u\//, "");
        out.push(makeCandidate({
          source: "reddit",
          sourceName: "Reddit",
          url: item.link,
          title: item.title,
          author: `r/${sub}${author ? ` · u/${author}` : ""}`,
          publishDate: date,
          body: (item.contentSnippet || item.content || "").replace(/\s+/g, " ").trim(),
          metrics: { rank_in_sub: taken + 1, discussion_url: item.link },
        }));
        taken++;
      }
    } catch (e) {
      console.warn(`[reddit] r/${sub} 실패:`, e.message);
    }
  }
  return out;
}

// ⑤ 연구 — HF Daily Papers (arXiv 직접 수집의 대안)
// arXiv 를 직접 붙였다가 발행량·주기가 24시간 창과 안 맞아 뺐다. HF 는 **매일** 큐레이션 목록을 새로 내고
// upvote 가 품질 프록시라 창에 맞는다. 다만 응답의 publishedAt 은 arXiv 원 발행일(수 주 전일 수 있다)이므로
// 신호 시각은 "HF 가 오늘 목록에 올린 날"로 잡고, 원 발행일이 너무 오래된 논문은 재조명이지 신규 신호가 아니라 버린다.
const HF_PAPER_MAX_AGE_DAYS = Number(process.env.NEWS_HF_PAPER_MAX_AGE_DAYS || 21);

async function fetchHuggingFacePapers() {
  const listDate = new Date().toISOString().slice(0, 10); // HF 데일리 목록은 UTC 날짜 단위
  let list;
  try {
    list = await getJson(`https://huggingface.co/api/daily_papers?date=${listDate}&limit=50`);
  } catch (e) {
    console.warn(`[hfpapers] ${listDate} 목록 조회 실패:`, e.message);
    return [];
  }
  if (!Array.isArray(list)) {
    console.warn(`[hfpapers] 예상 밖 응답 형태 — 건너뜀`);
    return [];
  }

  const signalTime = `${listDate}T00:00:00.000Z`;
  const ageCutoff = Date.now() - HF_PAPER_MAX_AGE_DAYS * 864e5;
  const out = [];
  let stale = 0;
  for (const entry of list) {
    const paper = entry.paper || {};
    if (!paper.id || !paper.title) continue;
    const arxivDate = new Date(paper.publishedAt || entry.publishedAt || 0).getTime();
    if (Number.isFinite(arxivDate) && arxivDate > 0 && arxivDate < ageCutoff) {
      stale++; // 오늘 목록에 올랐어도 원 논문이 3주 넘게 묵었으면 재조명이지 오늘의 신호가 아니다
      continue;
    }
    const authors = (paper.authors || []).map((a) => a.name).filter(Boolean);
    out.push(makeCandidate({
      source: "hfpapers",
      sourceName: "HF Daily Papers",
      url: `https://huggingface.co/papers/${paper.id}`,
      title: paper.title,
      author: (entry.submittedBy && entry.submittedBy.name) || authors[0] || "HF Daily Papers",
      publishDate: signalTime,
      body: [paper.summary || "", authors.length ? `authors: ${authors.slice(0, 8).join(", ")}` : ""].filter(Boolean).join("\n\n"),
      metrics: {
        upvotes: paper.upvotes || 0,
        comments: entry.numComments || 0,
        arxiv_id: paper.id,
        paper_published_at: paper.publishedAt || null,
        github_repo: paper.githubRepo || null,
      },
      signalHint: "research",
    }));
  }
  if (stale) console.log(`[hfpapers] 원 발행일 ${HF_PAPER_MAX_AGE_DAYS}일 초과 ${stale}건 제외`);
  return out;
}

// ①②③⑥ Bluesky — X·Threads 가 last30days 에서 상시 0건이라 직접 수집하는 소셜 축
// 인용/농담이 인기 상위를 차지하는 매체라 "좋아요 상위" 만으로는 뉴스가 안 잡힌다(실측: like>=10 상위 10건이 전부 잡담).
// 링크 카드를 단 글만 남기면 발표·블로그·릴리스 공유가 걸러져 나온다 — 이 매체는 **링크 발굴 창구**로 쓴다.
// 후보 url 은 그래서 bsky 퍼머링크가 아니라 공유된 원문 링크다. 본문 보강(enrichBodies)과
// 타 매체 교차 중복(cross_sources = 화제성 근거)이 그대로 동작한다. 발견 출처는 metrics.bluesky_url 로 남긴다.
const BSKY_QUERIES = ["LLM", "AI agent", "coding agent", "Claude Code"];
// 소셜 공유 링크는 단축 URL 인 경우가 잦다. 그대로 두면 같은 기사를 다른 매체가 다뤄도 중복 판정이 안 되고
// (normalizeUrl 은 호스트+경로 비교다) 크로스데이 차단도 새는다. 최종 목적지로 펼쳐서 저장한다.
const URL_SHORTENERS = ["bit.ly", "t.co", "buff.ly", "dlvr.it", "ow.ly", "lnkd.in", "tinyurl.com", "trib.al", "ift.tt"];

async function resolveShortUrl(url) {
  let host;
  try { host = new URL(url).host.replace(/^www\./, ""); } catch { return url; }
  if (!URL_SHORTENERS.includes(host)) return url;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BODY_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { method: "GET", headers: { "User-Agent": UA }, signal: controller.signal, redirect: "follow" });
    return res.url || url;
  } catch {
    return url;
  } finally {
    clearTimeout(timer);
  }
}
const BSKY_MIN_LIKES = Number(process.env.NEWS_BSKY_MIN_LIKES || 3);
const BSKY_DELAY_MS = Number(process.env.NEWS_BSKY_DELAY_MS || 6000);
const BSKY_ATTEMPTS = Number(process.env.NEWS_BSKY_ATTEMPTS || 3);

// 무인증 공개 엔드포인트지만 IP 단위 rate limit 이 있다 — 연속 질의는 403 을 받는다(실측 5번째 쿼리부터).
async function fetchBlueskyQuery(q) {
  const since = SINCE.toISOString();
  const url = `https://api.bsky.app/xrpc/app.bsky.feed.searchPosts`
    + `?q=${encodeURIComponent(q)}&limit=100&sort=latest&since=${encodeURIComponent(since)}`;
  for (let attempt = 0; attempt < BSKY_ATTEMPTS; attempt++) {
    try {
      return await getJson(url);
    } catch (e) {
      const last = attempt === BSKY_ATTEMPTS - 1;
      if (last || (e.status !== 403 && e.status !== 429 && e.name !== "AbortError")) throw e;
      const wait = BSKY_DELAY_MS * (attempt + 2);
      console.warn(`[bluesky] "${q}" ${e.status || e.name} — ${wait / 1000}s 후 재시도 (${attempt + 2}/${BSKY_ATTEMPTS})`);
      await sleep(wait);
    }
  }
  return null;
}

async function fetchBluesky() {
  if (process.env.NEWS_SKIP_BLUESKY === "1") {
    console.warn("[bluesky] NEWS_SKIP_BLUESKY=1 — 건너뜀");
    return [];
  }
  const seen = new Set();
  const out = [];
  let scanned = 0;
  for (const [idx, q] of BSKY_QUERIES.entries()) {
    if (idx > 0) await sleep(BSKY_DELAY_MS);
    let body;
    try {
      body = await fetchBlueskyQuery(q);
    } catch (e) {
      console.warn(`[bluesky] "${q}" 실패:`, e.message);
      continue;
    }
    for (const post of (body && body.posts) || []) {
      scanned++;
      const ext = post.embed && post.embed.external;
      if (!ext || !ext.uri) continue;          // 링크 없는 글은 잡담일 확률이 압도적이다
      if ((post.likeCount || 0) < BSKY_MIN_LIKES) continue;
      if (seen.has(ext.uri)) continue;
      seen.add(ext.uri);
      const rkey = String(post.uri || "").split("/").pop();
      out.push(makeCandidate({
        source: "bluesky",
        sourceName: "Bluesky",
        url: ext.uri,
        title: ext.title || post.record.text || "",
        author: `@${post.author.handle}`,
        publishDate: post.record.createdAt || post.indexedAt,
        body: [post.record.text || "", ext.title || "", ext.description || ""].filter(Boolean).join("\n"),
        metrics: {
          likes: post.likeCount || 0,
          reposts: post.repostCount || 0,
          replies: post.replyCount || 0,
          bluesky_url: `https://bsky.app/profile/${post.author.handle}/post/${rkey}`,
        },
      }));
    }
  }
  await pMap(out, BODY_FETCH_CONCURRENCY, async (c) => {
    const resolved = await resolveShortUrl(c.url);
    if (resolved !== c.url) {
      c.url = resolved;
      c.id = `bluesky_${sha(normalizeUrl(resolved))}`; // id 는 url 파생이라 함께 갱신해야 한다
    }
  });
  console.log(`[bluesky] ${scanned}건 훑어 링크+좋아요${BSKY_MIN_LIKES} 이상 ${out.length}건`);
  return out;
}

// ①②⑥ 소셜 보조 — last30days 스킬 경유 (X·Threads 제거 후 Reddit·HN·GitHub 중복분만 보탠다)
async function fetchSocial() {
  const skill = path.join(ROOT, ".agents", "skills", "last30days", "scripts", "last30days.py");
  if (!fs.existsSync(skill)) {
    console.warn("[social] last30days 스킬 없음 — 건너뜀");
    return [];
  }
  // 반드시 비동기로 실행한다. execFileSync 는 이벤트 루프를 파이썬이 끝날 때까지 블록해서
  // 같은 Promise.all 안의 다른 소스들의 fetch 타임아웃을 일제히 발화시킨다 (전량 abort 원인).
  let raw;
  try {
    const { stdout } = await execFileAsync(
      "python3",
      [skill, "AI model release OR LLM OR AI agent OR developer tool", "--days", "1", "--emit=json"],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024, timeout: SOCIAL_TIMEOUT_MS }
    );
    raw = stdout;
  } catch (e) {
    raw = e.stdout || "";
    if (!raw) {
      console.warn("[social] last30days 실행 실패:", e.message);
      return [];
    }
  }

  let data;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    data = JSON.parse(m ? m[0] : raw);
  } catch (e) {
    console.warn("[social] JSON 파싱 실패:", e.message);
    return [];
  }

  // 지정 매체만 남긴다. last30days 는 YouTube·web 등도 섞어 반환하는데 그대로 통과시키면
  // 목록 밖 매체가 하루치 상당량을 차지한다 (실측 youtube 9건).
  // X·Threads 를 목록에서 내린 뒤로 이 경로가 보태는 건 Reddit·HN·GitHub 뿐이고 그 셋은 직접 수집이 더 촘촘하다.
  const PLATFORM = {
    reddit: ["reddit", "Reddit"],
    hackernews: ["hackernews", "Hacker News"],
    github: ["github", "GitHub"],
  };

  const out = [];
  let offlist = 0;
  for (const item of data.results || []) {
    const url = item.best_url || item.url;
    if (!url) continue; // 원문 링크 없는 항목은 폐기 (링크 검증 원칙)
    // 링크 호스트가 곧 출처 — last30days 의 source 라벨이 링크와 어긋나는 사례가 많아 URL 을 신뢰
    let host = "";
    try { host = new URL(url).host.replace(/^www\./, ""); } catch { /* noop */ }
    const hostKey = host.includes("reddit") ? "reddit"
      : host.includes("ycombinator") ? "hackernews"
      : host.includes("github.com") ? "github"
      : null;
    const rawSource = String(item.source || (item.sources || [])[0] || "").toLowerCase();
    const platform = PLATFORM[hostKey] || PLATFORM[rawSource];
    if (!platform) {
      offlist++;
      continue;
    }
    const [source, sourceName] = platform;

    const published = item.published_at || item.date;
    if (published && !inWindow(published, "social")) continue; // --days 1 을 신뢰하지 않는다

    let body = item.content || item.summary || item.snippet || "";
    if (!body && Array.isArray(item.evidence)) {
      body = item.evidence.map((e) => e.label || e.text || "").filter(Boolean).join("\n");
    }
    out.push(makeCandidate({
      source,
      sourceName,
      url,
      title: item.topic || item.title || String(body).slice(0, 80),
      author: item.author || (item.voices || [])[0] || sourceName,
      publishDate: published || Date.now(),
      body,
      metrics: { engagement: item.engagement ?? null },
    }));
  }
  if (offlist) console.log(`[social] 지정 매체 밖 ${offlist}건 제외`);
  return out;
}

// ── 중복 제거 ─────────────────────────────────────────────────────────
function dedupe(candidates) {
  const byUrl = new Map();
  const byTitle = new Map();
  const kept = [];
  for (const c of candidates) {
    if (!c.title || !c.url) continue;
    const uKey = normalizeUrl(c.url);
    const tKey = normalizeTitle(c.title);
    const dupe = byUrl.get(uKey) || (tKey.length >= 20 ? byTitle.get(tKey) : null);
    if (dupe) {
      // 같은 이슈를 여러 매체가 다룸 = 화제성 근거. 본문이 더 긴 쪽을 남기고 교차 출처로 기록
      dupe.cross_sources = [...new Set([...(dupe.cross_sources || [dupe.source_name]), c.source_name])];
      if (c.body_chars > dupe.body_chars) {
        dupe.body = c.body;
        dupe.body_chars = c.body_chars;
      }
      continue;
    }
    byUrl.set(uKey, c);
    if (tKey.length >= 20) byTitle.set(tKey, c);
    kept.push(c);
  }
  return kept;
}

// ── 소스별 상한 (큐레이션 배치 폭주 방지) ─────────────────────────────
// GitHub 은 하루치가 수십~수백 건이라 그대로 넘기면 Gemini 호출이 폭증한다.
// 신호 자체를 죽이지 않도록 상한만 두고, 소스 내부 랭킹으로 상위를 남긴다.
const SOURCE_CAPS = {
  github: Number(process.env.NEWS_CAP_GITHUB || 50),
  hfpapers: Number(process.env.NEWS_CAP_HFPAPERS || 12),
  bluesky: Number(process.env.NEWS_CAP_BLUESKY || 12),
};
// 절대 star 로 정렬하면 창 안의 노장 리포가 매일 상위에 고정된다 (재등장의 직접 원인).
// "지금 뜨고 있는가" = 하루평균 star 획득량. 직전 배포본과 비교 가능하면 실측 증가분을 쓰고,
// 없으면 생성 이후 평균으로 근사한다. 둘 다 stars/day 단위라 섞어 정렬해도 일관된다.
function ghMomentum(c) {
  const stars = Number(c.metrics && c.metrics.stars) || 0;
  if (c.prev_stars > 0 && c.prev_published_date) {
    const days = Math.max(1, (Date.now() - new Date(c.prev_published_date).getTime()) / 864e5);
    return (stars - c.prev_stars) / days;
  }
  return Number(c.metrics && c.metrics.stars_per_day) || 0;
}

const SOURCE_RANK = {
  github: (a, b) => ghMomentum(b) - ghMomentum(a),
  // 두 매체 모두 자체 인기 지표를 품질 프록시로 쓴다 (HF upvote, Bluesky 좋아요)
  hfpapers: (a, b) => (b.metrics.upvotes || 0) - (a.metrics.upvotes || 0),
  bluesky: (a, b) => (b.metrics.likes || 0) - (a.metrics.likes || 0),
};

function capPerSource(candidates) {
  const grouped = {};
  for (const c of candidates) (grouped[c.source] ||= []).push(c);
  const out = [];
  for (const [source, list] of Object.entries(grouped)) {
    const cap = SOURCE_CAPS[source];
    if (!cap || list.length <= cap) {
      out.push(...list);
      continue;
    }
    const sorted = [...list].sort(SOURCE_RANK[source] || (() => 0));
    console.log(`[${source}] ${list.length}건 중 상위 ${cap}건만 큐레이션 대상 (${list.length - cap}건 제외)`);
    out.push(...sorted.slice(0, cap));
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────
async function main() {
  console.log("==========================================");
  console.log(`뉴스 수집 시작 — 최근 ${WINDOW_HOURS}시간 (KST ${NOW_KST.format()})`);
  console.log("==========================================");

  const labels = [...CURATED_FEEDS.map((f) => f.source), "hackernews", "github", "reddit", "hfpapers", "bluesky", "social"];
  const groups = await Promise.all([
    ...CURATED_FEEDS.map((f) => fetchCuratedFeed(f)),
    fetchHackerNews(),
    fetchGitHub(),
    fetchReddit(),
    fetchHuggingFacePapers(),
    fetchBluesky(),
    fetchSocial(),
  ]);
  groups.forEach((g, i) => console.log(`[${labels[i]}] ${g.length}건`));

  if (Object.keys(dateless).length) {
    console.warn(`[window] 발행일 없음/파싱불가로 제외: ${JSON.stringify(dateless)} — 특정 소스에 몰려 있으면 그 피드의 날짜 필드명을 확인할 것`);
  }

  const deduped = dedupe(groups.flat());
  console.log(`중복 제거 후 ${deduped.length}건`);

  const repeat = dropRepeats(deduped, loadRecentlyPublished());
  const candidates = repeat.kept;

  await enrichBodies(candidates);

  const withBody = candidates.filter((c) => c.body_chars >= 120);
  console.log(`본문 확보 기준(120자) 통과: ${withBody.length}/${candidates.length}건`);

  const selected = capPerSource(withBody);
  if (selected.length < withBody.length) {
    console.log(`소스별 상한 적용: ${withBody.length} → ${selected.length}건`);
  }

  // 판정은 수집 직후가 아니라 본문 게이트까지 통과한 최종 건수로 한다 — 노출되는 건 이쪽이다
  const finalCounts = {};
  for (const c of selected) finalCounts[c.source] = (finalCounts[c.source] || 0) + 1;
  const missing = Object.entries(REQUIRED_SOURCES).filter(([s]) => !finalCounts[s]);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    collected_at: new Date().toISOString(),
    window: { hours: WINDOW_HOURS, since: SINCE.toISOString() },
    source_counts: Object.fromEntries(labels.map((l, i) => [l, groups[i].length])),
    final_counts: finalCounts,
    missing_sources: missing.map(([s]) => s),
    repeat_filter: { lookback_days: REPEAT_LOOKBACK_DAYS, dropped: repeat.dropped, kept_as_update: repeat.updates },
    source_errors: ghQueryErrors,
    candidates: selected,
  }, null, 2));

  console.log(`\n✅ 수집 완료: ${selected.length}건 → ${OUT}`);
  console.log(`   매체별 최종: ${JSON.stringify(finalCounts)}`);
  if (missing.length) {
    console.warn(`\n[MISSING] 지정 ${Object.keys(REQUIRED_SOURCES).length}매체 중 ${missing.length}개 0건 — 보고 필수:`);
    for (const [s, name] of missing) console.warn(`  - ${name} (${s})`);
  }
  if (ghQueryErrors.length) {
    console.warn(`\n[QUERY-FAIL] GitHub 쿼리 ${ghQueryErrors.length}/${GH_QUERIES.length}건 실패 — 보고 필수:`);
    for (const e of ghQueryErrors) console.warn(`  - ${e}`);
  }
  if (selected.length === 0) {
    console.error("수집 0건 — 큐레이션 중단 (기존 데이터 보존)");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
