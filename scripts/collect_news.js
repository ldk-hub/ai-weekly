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

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "data", "news_candidates.json");

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
  "x.com", "twitter.com", "instagram.com", "threads.net", "threads.com",
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

function normalizeUrl(u) {
  try {
    const url = new URL(u);
    url.hash = "";
    [...url.searchParams.keys()]
      .filter((k) => /^utm_|^ref$|^ref_src$|^s$|^igshid$/i.test(k))
      .forEach((k) => url.searchParams.delete(k));
    return `${url.host.replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}${url.search}`;
  } catch {
    return (u || "").trim();
  }
}

function normalizeTitle(t) {
  return (t || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 60);
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
  return {
    id: `${source}_${sha(normalizeUrl(url) || title)}`,
    source,
    source_name: sourceName,
    url,
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
// ①~⑥ 혼합 (국내 개발자 커뮤니티)
async function fetchGeekNews() {
  const out = [];
  try {
    const feed = await parseFeed("https://news.hada.io/rss/news");
    for (const item of feed.items) {
      if (!inWindow(item.pubDate, "geeknews")) continue;
      if (isLegacy(item.title) || isLegacy(item.contentSnippet)) continue;
      out.push(makeCandidate({
        source: "geeknews",
        sourceName: "GeekNews",
        url: item.link,
        title: item.title,
        author: item.creator || "GeekNews",
        publishDate: item.pubDate,
        body: item.contentSnippet || item.content || "",
        lang: "ko",
      }));
    }
  } catch (e) {
    console.warn("[geeknews] 실패:", e.message);
  }
  return out;
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
const GH_QUERIES = [
  `created:>=${SINCE_DATE} stars:>=3 llm in:name,description,topics`,
  `created:>=${SINCE_DATE} stars:>=3 "ai agent" in:name,description`,
  `created:>=${SINCE_DATE} stars:>=2 mcp in:name,description,topics`,
  `created:>=${SINCE_DATE} stars:>=3 "coding agent" OR "claude code" in:name,description`,
  `pushed:>=${SINCE_DATE} created:>=${new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)} stars:>=20 topic:llm`,
];
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
      console.warn(`[github] "${q}" 실패:`, e.message);
    }
  }

  const out = [...repos.values()].map((r) => makeCandidate({
    source: "github",
    sourceName: "GitHub",
    url: r.html_url,
    title: `${r.full_name} — ${r.description || "(설명 없음)"}`,
    author: r.owner.login,
    publishDate: r.created_at,
    body: [r.description || "", `topics: ${(r.topics || []).join(", ")}`, `language: ${r.language || "n/a"}`].join("\n"),
    metrics: { stars: r.stargazers_count, forks: r.forks_count, created_at: r.created_at, pushed_at: r.pushed_at, repo: r.full_name },
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

// ⑤ 연구·논문
const ARXIV_CATEGORIES = ["cs.AI", "cs.CL", "cs.LG", "cs.MA"];
async function fetchArxiv() {
  const out = [];
  try {
    const q = ARXIV_CATEGORIES.map((c) => `cat:${c}`).join("+OR+");
    const feed = await parseFeed(
      `http://export.arxiv.org/api/query?search_query=${q}&sortBy=submittedDate&sortOrder=descending&max_results=60`
    );
    for (const item of feed.items) {
      const date = item.isoDate || item.pubDate || item.published;
      if (!inWindow(date, "arxiv")) continue;
      out.push(makeCandidate({
        source: "arxiv",
        sourceName: "arXiv",
        url: item.link,
        title: (item.title || "").replace(/\s+/g, " ").trim(),
        author: String(item.creator || item.author || "arXiv").replace(/\s+/g, " ").trim(),
        publishDate: date,
        body: (item.summary || item.contentSnippet || "").replace(/\s+/g, " ").trim(),
        signalHint: "research",
      }));
    }
  } catch (e) {
    console.warn("[arxiv] 실패:", e.message);
  }
  return out;
}

// ③④⑥ 실사용·워크플로우 논의
const SUBREDDITS = ["LocalLLaMA", "MachineLearning", "ClaudeAI", "OpenAI", "singularity"];

// reddit.com 의 `.json` 엔드포인트는 비인증 403 이지만 `top/.rss?t=day` 는 무인증 200 이다 (OAuth 불필요).
// 대신 IP 단위 throttle 이 강해 연속 요청은 429 를 받는다 → 순차 + 지연 + 429 재시도 필수.
// RSS 에는 점수 필드가 없으므로 "당일 top 정렬" 자체를 품질 프록시로 쓰고 상위 N 개만 취한다.
const REDDIT_DELAY_MS = Number(process.env.NEWS_REDDIT_DELAY_MS || 20000);
const REDDIT_PER_SUB = Number(process.env.NEWS_REDDIT_PER_SUB || 8);

async function fetchRedditSub(sub) {
  const url = `https://www.reddit.com/r/${sub}/top/.rss?t=day`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await parseFeed(url);
    } catch (e) {
      if (e.status === 429 && attempt === 0) {
        console.warn(`[reddit] r/${sub} 429 — ${REDDIT_DELAY_MS / 1000}s 후 재시도`);
        await sleep(REDDIT_DELAY_MS);
        continue;
      }
      throw e;
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

// ①②⑥ 소셜(X·Threads 등) — last30days 스킬 경유
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

  const PLATFORM = {
    x: ["x", "X (Twitter)"],
    twitter: ["x", "X (Twitter)"],
    threads: ["threads", "Threads"],
    instagram: ["instagram", "Instagram"],
    reddit: ["reddit", "Reddit"],
    hackernews: ["hackernews", "Hacker News"],
    youtube: ["youtube", "YouTube"],
    github: ["github", "GitHub"],
  };

  const out = [];
  for (const item of data.results || []) {
    const url = item.best_url || item.url;
    if (!url) continue; // 원문 링크 없는 항목은 폐기 (링크 검증 원칙)
    // 링크 호스트가 곧 출처 — last30days 의 source 라벨이 링크와 어긋나는 사례가 많아 URL 을 신뢰
    let host = "";
    try { host = new URL(url).host.replace(/^www\./, ""); } catch { /* noop */ }
    const hostKey = host.includes("twitter") || host.includes("x.com") ? "x"
      : host.includes("threads") ? "threads"
      : host.includes("instagram") ? "instagram"
      : host.includes("reddit") ? "reddit"
      : host.includes("ycombinator") ? "hackernews"
      : host.includes("youtu") ? "youtube"
      : host.includes("github.com") ? "github"
      : null;
    const rawSource = String(item.source || (item.sources || [])[0] || "web").toLowerCase();
    const [source, sourceName] = PLATFORM[hostKey] || PLATFORM[rawSource] || ["web", host || "Web"];

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
      publishDate: item.published_at || item.date || Date.now(),
      body,
      metrics: { engagement: item.engagement ?? null },
    }));
  }
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
// arXiv·GitHub 은 하루치가 수십~수백 건이라 그대로 넘기면 Gemini 호출이 폭증한다.
// 신호 자체를 죽이지 않도록 상한만 두고, 소스 내부 랭킹으로 상위를 남긴다.
const SOURCE_CAPS = {
  arxiv: Number(process.env.NEWS_CAP_ARXIV || 30),
  github: Number(process.env.NEWS_CAP_GITHUB || 50),
};
const SOURCE_RANK = {
  arxiv: (a, b) => new Date(b.publish_date) - new Date(a.publish_date),
  github: (a, b) => (b.metrics.stars || 0) - (a.metrics.stars || 0),
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

  const labels = ["geeknews", "hackernews", "github", "arxiv", "reddit", "social"];
  const groups = await Promise.all([
    fetchGeekNews(),
    fetchHackerNews(),
    fetchGitHub(),
    fetchArxiv(),
    fetchReddit(),
    fetchSocial(),
  ]);
  groups.forEach((g, i) => console.log(`[${labels[i]}] ${g.length}건`));
  if (Object.keys(dateless).length) {
    console.warn(`[window] 발행일 없음/파싱불가로 제외: ${JSON.stringify(dateless)} — 특정 소스에 몰려 있으면 그 피드의 날짜 필드명을 확인할 것`);
  }

  const candidates = dedupe(groups.flat());
  console.log(`중복 제거 후 ${candidates.length}건`);

  await enrichBodies(candidates);

  const withBody = candidates.filter((c) => c.body_chars >= 120);
  console.log(`본문 확보 기준(120자) 통과: ${withBody.length}/${candidates.length}건`);

  const selected = capPerSource(withBody);
  if (selected.length < withBody.length) {
    console.log(`소스별 상한 적용: ${withBody.length} → ${selected.length}건`);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    collected_at: new Date().toISOString(),
    window: { hours: WINDOW_HOURS, since: SINCE.toISOString() },
    source_counts: Object.fromEntries(labels.map((l, i) => [l, groups[i].length])),
    candidates: selected,
  }, null, 2));

  console.log(`\n✅ 수집 완료: ${selected.length}건 → ${OUT}`);
  if (selected.length === 0) {
    console.error("수집 0건 — 큐레이션 중단 (기존 데이터 보존)");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
