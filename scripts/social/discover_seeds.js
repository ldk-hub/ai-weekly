#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const Parser = require("rss-parser");
const { PLATFORMS, normalizeHandle, loadSeedRegistry, saveSeedRegistry } = require("./seeds");
const { normalizeScrapedX, normalizeThread, normalizeRedditItem, normalizeInstagram } = require("./collect_social");
const { collectInstagramEgo } = require("./ig_profile");
const { searchX } = require("../core/agent_reach");
const { fetchRawWithScrapling, scrapeSocial } = require("../core/scrapling_fetch");

const ROOT = path.join(__dirname, "..", "..");
const SEEDS_FILE = path.join(ROOT, "data", "social", "seeds.json");
const REPORT_FILE = path.join(ROOT, "data", "social", "seed_discovery_report.json");
const SOCIAL_DIR = path.join(ROOT, "data", "social");
const CANDIDATES_FILE = path.join(ROOT, "data", "social_candidates.json");
const NEWS_LATEST_FILE = path.join(ROOT, "site", "public", "data", "news_latest.json");
const NEWS_ARCHIVE_DIR = path.join(ROOT, "data", "archive");

const UV_BIN = process.env.UV_BIN || (fs.existsSync("/Users/nhn/.local/bin/uv") ? "/Users/nhn/.local/bin/uv" : "uv");
const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";
const X_SCRIPT = path.join(__dirname, "x_profile.py");
const THREADS_SCRIPT = path.join(__dirname, "threads_profile.py");

const MAX_ACTIVE_PER_PLATFORM = Number(process.env.SOCIAL_MAX_SEEDS_PER_PLATFORM || 10);
const MAX_VERIFY_PER_PLATFORM = Number(process.env.SOCIAL_DISCOVER_VERIFY_LIMIT || 5);
const REDDIT_DELAY_MS = Number(process.env.SOCIAL_REDDIT_DELAY_MS || 4000);
const MAX_INACTIVE_DAYS = Number(process.env.SOCIAL_DISCOVER_MAX_AGE_DAYS || 21);

const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rssParser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "ai-weekly/1.0 (+https://github.com/ldk-hub/ai-weekly)" },
  customFields: { item: [["media:thumbnail", "mediaThumbnail"]] },
});

const RESERVED_HANDLES = new Set([
  "i", "home", "explore", "search", "notifications", "messages", "settings",
  "compose", "intent", "hashtag", "share", "login", "signup", "tos", "privacy",
  "reel", "reels", "p", "tv", "stories", "accounts", "about", "help", "legal",
  "all", "popular", "submit", "wiki", "user", "u", "r",
]);

const AI_SIGNAL_TERMS = [
  "claude", "anthropic", "openai", "chatgpt", "gemini", "gpt", "llm", "ai",
  "prompt", "agent", "agents", "mcp", "workflow", "cursor", "codex", "llama",
  "ollama", "rag", "benchmark", "reasoning", "vibe coding", "harness", "skill",
  "open source", "opensource", "neural", "transformer", "inference", "deepmind",
  "클로드", "프롬프트", "에이전트", "워크플로우", "인공지능", "제미나이", "챗gpt",
  "오픈소스", "자동화", "바이브코딩", "로컬 ai", "모델", "추론", "하네스",
];

const SPAM_TERMS = [
  "벌기, 모으기, 쓰기", "자는 동안 놓친 뉴스", "재테크", "주식 추천", "코인 시그널",
  "airdrop", "giveaway", "crypto signal", "dm me for", "100x gem", "forex",
];

const REDDIT_EXPANSION_POOL = [
  "MachineLearning", "OpenAI", "singularity", "vibecoding", "cursor",
  "Ollama", "LLMDevs", "AI_Agents", "AIAssisted", "AINewsRumors",
];

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function buildAnchorProfile(opts = {}) {
  const socialDir = opts.socialDir || SOCIAL_DIR;
  const candidatesPath = opts.candidatesPath || CANDIDATES_FILE;
  const tagCounts = new Map();
  const accountStats = new Map();

  const ensureStat = (platform, handle) => {
    const key = `${platform}:${normalizeHandle(handle)}`;
    if (!accountStats.has(key)) {
      accountStats.set(key, {
        platform,
        handle: normalizeHandle(handle),
        curatedCount: 0,
        candidatesSeen: 0,
        spamCount: 0,
        totalRelevance: 0,
      });
    }
    return accountStats.get(key);
  };

  if (fs.existsSync(socialDir)) {
    const files = fs.readdirSync(socialDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of files) {
      const data = readJsonSafe(path.join(socialDir, f));
      for (const it of data?.items || []) {
        if (!it?.platform || !it?.author) continue;
        const rawHandle = it.platform === "reddit"
          ? String(it.author).match(/^r\/([^·\s]+)/i)?.[1] || it.author
          : it.author;
        const st = ensureStat(it.platform, rawHandle);
        st.curatedCount += 1;
        st.totalRelevance += Number(it.relevance || 0);
        for (const tag of it.tags || []) {
          const t = String(tag).trim().toLowerCase();
          if (t.length >= 2) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
        }
      }
    }
  }

  const candData = readJsonSafe(candidatesPath);
  for (const p of candData?.posts || []) {
    if (!p?.platform || !p?.author) continue;
    const rawHandle = p.platform === "reddit"
      ? String(p.author).match(/^r\/([^·\s]+)/i)?.[1] || p.author
      : p.author;
    const st = ensureStat(p.platform, rawHandle);
    st.candidatesSeen += 1;
    const lowText = String(p.text || "").toLowerCase();
    if (SPAM_TERMS.some((term) => lowText.includes(term.toLowerCase()))) {
      st.spamCount += 1;
    }
  }

  const statsOut = {};
  for (const [k, st] of accountStats.entries()) {
    const denom = Math.max(st.candidatesSeen, st.curatedCount, 1);
    statsOut[k] = {
      ...st,
      survivalRate: Number((st.curatedCount / denom).toFixed(2)),
      avgRelevance: st.curatedCount ? Math.round(st.totalRelevance / st.curatedCount) : 0,
    };
  }

  const anchorKeywords = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([k]) => k);

  return { anchorKeywords, accountStats: statsOut };
}

function scorePostAiSignal(text, anchorKeywords = []) {
  const raw = String(text || "").trim();
  const low = raw.toLowerCase();
  if (!raw) return { score: 0, isAi: false, isSpam: false, anchorMatches: 0 };

  const isSpam = SPAM_TERMS.some((term) => low.includes(term.toLowerCase()));
  let aiHits = 0;
  for (const term of AI_SIGNAL_TERMS) {
    const re = /^[a-z0-9 ]+$/i.test(term) && term.length <= 3
      ? new RegExp(`\\b${term}\\b`, "i")
      : null;
    if (re ? re.test(low) : low.includes(term.toLowerCase())) {
      aiHits += 1;
    }
  }

  let anchorMatches = 0;
  for (const kw of anchorKeywords) {
    if (kw.length >= 2 && low.includes(kw.toLowerCase())) {
      anchorMatches += 1;
    }
  }

  const lengthBonus = raw.length >= 140 ? 20 : raw.length >= 60 ? 12 : 0;
  let score = Math.min(100, aiHits * 22 + Math.min(anchorMatches, 3) * 10 + lengthBonus);
  if (isSpam) score = Math.max(0, score - 70);

  return {
    score,
    isAi: !isSpam && (aiHits >= 1 || anchorMatches >= 2) && score >= 35,
    isSpam,
    anchorMatches,
  };
}

function evaluateCandidate(handle, posts, anchorKeywords = [], opts = {}) {
  const nowMs = opts.nowMs || Date.now();
  const minSamples = opts.minSamples || 2;
  const minAiRatio = opts.minAiRatio || 0.5;
  const minVerifyScore = opts.minVerifyScore || 60;
  const maxAgeMs = (opts.maxInactiveDays || MAX_INACTIVE_DAYS) * 24 * 3600 * 1000;

  const validPosts = (posts || []).filter((p) => String(p?.text || "").trim().length >= 15);
  if (validPosts.length < minSamples) {
    return {
      handle,
      passed: false,
      reason: "insufficient_samples",
      verifyScore: 0,
      aiRatio: 0,
      spamRatio: 0,
      sampleCount: validPosts.length,
      freshCount: 0,
      latestPostAt: null,
    };
  }

  let freshCount = 0;
  let datedCount = 0;
  let latestMs = 0;
  let aiCount = 0;
  let spamCount = 0;
  let signalSum = 0;
  let lengthSum = 0;
  let engagementSum = 0;

  for (const p of validPosts) {
    const ms = Date.parse(p.publishedAt || "");
    if (Number.isFinite(ms)) {
      datedCount += 1;
      if (ms > latestMs) latestMs = ms;
      if (nowMs - ms <= maxAgeMs) freshCount += 1;
    }
    const sig = scorePostAiSignal(p.text, anchorKeywords);
    if (sig.isAi) aiCount += 1;
    if (sig.isSpam) spamCount += 1;
    signalSum += sig.score;
    lengthSum += String(p.text || "").trim().length;
    const m = p.metrics || {};
    const engRaw = (m.likes || 0) + 3 * (m.reposts || 0) + 2 * (m.replies || 0);
    engagementSum += engRaw > 0 ? Math.min(100, Math.round(Math.log10(engRaw + 1) * 20)) : 0;
  }

  const n = validPosts.length;
  const aiRatio = Number((aiCount / n).toFixed(2));
  const spamRatio = Number((spamCount / n).toFixed(2));
  const avgSignal = signalSum / n;
  const avgLength = lengthSum / n;
  const avgEngagement = engagementSum / n;
  const verifyScore = Math.round(0.55 * (aiRatio * 100) + 0.3 * avgSignal + 0.15 * avgEngagement);
  const latestPostAt = latestMs ? new Date(latestMs).toISOString() : null;

  let passed = true;
  let reason = "verified";
  if (datedCount > 0 && freshCount === 0) {
    passed = false;
    reason = "stale_account";
  } else if (spamRatio > 0.25) {
    passed = false;
    reason = "spam_detected";
  } else if (avgLength < 45) {
    passed = false;
    reason = "low_substance";
  } else if (aiRatio < minAiRatio) {
    passed = false;
    reason = "low_ai_ratio";
  } else if (verifyScore < minVerifyScore) {
    passed = false;
    reason = "low_verify_score";
  }

  return {
    handle,
    passed,
    reason,
    verifyScore,
    aiRatio,
    spamRatio,
    sampleCount: n,
    freshCount,
    latestPostAt,
  };
}

function addCandidate(map, platform, rawHandle, source) {
  const h = normalizeHandle(rawHandle);
  if (!h || h.length < 2 || h.length > 30 || RESERVED_HANDLES.has(h)) return;
  if (!map[platform].has(h)) {
    map[platform].set(h, { handle: h, sources: new Set() });
  }
  map[platform].get(h).sources.add(source);
}

function extractCorpusCandidates(opts = {}) {
  const socialDir = opts.socialDir || SOCIAL_DIR;
  const candidatesPath = opts.candidatesPath || CANDIDATES_FILE;
  const newsLatestPath = opts.newsLatestPath || NEWS_LATEST_FILE;
  const newsArchiveDir = opts.newsArchiveDir || NEWS_ARCHIVE_DIR;

  const out = { x: new Map(), threads: new Map(), instagram: new Map(), reddit: new Map() };
  const files = [];

  if (fs.existsSync(candidatesPath)) files.push(candidatesPath);
  if (fs.existsSync(newsLatestPath)) files.push(newsLatestPath);
  if (fs.existsSync(socialDir)) {
    for (const f of fs.readdirSync(socialDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).slice(-14)) {
      files.push(path.join(socialDir, f));
    }
  }
  if (fs.existsSync(newsArchiveDir)) {
    for (const f of fs.readdirSync(newsArchiveDir).filter((f) => /^news_\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(-7)) {
      files.push(path.join(newsArchiveDir, f));
    }
  }

  for (const file of files) {
    let raw = "";
    try { raw = fs.readFileSync(file, "utf-8"); } catch { continue; }
    const tag = `corpus:${path.basename(file)}`;

    for (const m of raw.matchAll(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{2,25})(?:\/status|\b)/gi)) {
      addCandidate(out, "x", m[1], tag);
    }
    for (const m of raw.matchAll(/https?:\/\/(?:www\.)?threads\.(?:com|net)\/@([A-Za-z0-9_.]{2,30})/gi)) {
      addCandidate(out, "threads", m[1], tag);
    }
    for (const m of raw.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]{2,30})(?:\/p\/|\/reel\/|\/)/gi)) {
      addCandidate(out, "instagram", m[1], tag);
    }
    for (const m of raw.matchAll(/\br\/([A-Za-z0-9_]{3,25})\b/gi)) {
      addCandidate(out, "reddit", m[1], tag);
    }
  }

  // Also check explicit @mentions inside social candidate texts (same-platform context)
  const candData = readJsonSafe(candidatesPath);
  for (const p of candData?.posts || []) {
    if (!["x", "threads", "instagram"].includes(p.platform)) continue;
    for (const m of String(p.text || "").matchAll(/(?<![A-Za-z0-9_.])@([A-Za-z0-9_.]{2,30})\b/g)) {
      addCandidate(out, p.platform, m[1], `mention:${p.author}`);
    }
  }

  return out;
}

async function runPythonJson(scriptPath, args) {
  const { stdout } = await execFileAsync(
    UV_BIN,
    ["run", "--with", "scrapling[ai]", PYTHON_CMD, scriptPath, ...args],
    { cwd: ROOT, timeout: 600000, maxBuffer: 15 * 1024 * 1024 },
  );
  const line = stdout.trim().split("\n").reverse().find((l) => l.startsWith("{"));
  return line ? JSON.parse(line) : {};
}

async function fetchCandidatePosts(platform, handle) {
  if (platform === "reddit") {
    const url = `https://www.reddit.com/r/${encodeURIComponent(handle)}/top/.rss?t=week`;
    const altUrl = `https://old.reddit.com/r/${encodeURIComponent(handle)}/top/.rss?t=week`;
    // 1차 우선 시도: Scrapling (curl-cffi 브라우저 TLS 위장)
    for (const targetUrl of [url, altUrl]) {
      try {
        const rawXml = fetchRawWithScrapling(targetUrl, { timeoutMs: 15000, silent: true });
        if (rawXml && rawXml.includes("<")) {
          const feed = await rssParser.parseString(rawXml);
          return (feed.items || []).slice(0, 5).map((it) => normalizeRedditItem(it, handle));
        }
      } catch {}
    }
    // 2차 폴백: 기존 rssParser.parseURL
    const feed = await rssParser.parseURL(url);
    return (feed.items || []).slice(0, 5).map((it) => normalizeRedditItem(it, handle));
  }
  if (platform === "threads") {
    const res = await runPythonJson(THREADS_SCRIPT, ["--users", handle, "--limit", "4"]);
    return (res.items || []).map(normalizeThread);
  }
  if (platform === "x") {
    // 1차 우선 시도: Scrapling X 프로필 스텔스 크롤러
    try {
      const res = await runPythonJson(X_SCRIPT, ["--users", handle, "--limit", "4"]);
      if (res && Array.isArray(res.items) && res.items.length > 0) {
        return res.items.map(normalizeScrapedX);
      }
    } catch {
      // 1차 실패 시 2차 Agent-Reach(searchX) 폴백
    }
    const tweets = await searchX(`from:${handle}`, { max: 5, type: "Latest", exclude: ["replies", "retweets"] });
    return (tweets || []).map((t) => ({
      id: `x:${t.id}`,
      platform: "x",
      author: `@${(t.author && t.author.screenName) || handle}`,
      text: String(t.text || ""),
      publishedAt: t.createdAtISO || "",
      metrics: t.metrics || {},
    }));
  }
  if (platform === "instagram") {
    // 1차 우선 시도: Scrapling Instagram 크롤러
    try {
      const scraped = scrapeSocial("instagram", { users: [handle], limit: 4 }).map(normalizeInstagram);
      if (scraped.length >= 2) {
        return scraped;
      }
    } catch {
      // 1차 실패 시 2차 ego-browser 폴백
    }
    const items = await collectInstagramEgo([handle], 4, MAX_INACTIVE_DAYS * 24);
    return items.map(normalizeInstagram);
  }
  return [];
}

function evolveSeedRegistry(registry, verifiedByPlatform, accountStats = {}, opts = {}) {
  const maxActive = opts.maxActive || MAX_ACTIVE_PER_PLATFORM;
  const nowIso = opts.nowIso || new Date().toISOString();
  const next = JSON.parse(JSON.stringify(registry));
  next.retired = next.retired || {};
  next.discovered = next.discovered || {};
  next.core = next.core || {};

  const retiredEvents = [];
  const promotedEvents = [];

  for (const p of PLATFORMS) {
    const retiredSet = new Set((next.retired[p] || []).map((e) => normalizeHandle(e.handle || e)));

    // 1. Retire clearly non-AI promo accounts or zero-yield discovered accounts
    const keepDiscovered = [];
    for (const d of next.discovered[p] || []) {
      const h = normalizeHandle(d.handle);
      const st = accountStats[`${p}:${h}`];
      if (st && st.candidatesSeen >= 4 && st.curatedCount === 0) {
        retiredSet.add(h);
        next.retired[p].push({ handle: h, retiredAt: nowIso, reason: "zero_curation_yield" });
        retiredEvents.push({ platform: p, handle: h, reason: "zero_curation_yield" });
      } else {
        keepDiscovered.push({ ...d, handle: h });
      }
    }
    next.discovered[p] = keepDiscovered;

    // Retire core accounts only if repeatedly emitting non-AI spam with 0 curations
    for (const coreHandle of next.core[p] || []) {
      const h = normalizeHandle(coreHandle);
      if (retiredSet.has(h)) continue;
      const st = accountStats[`${p}:${h}`];
      if (st && st.curatedCount === 0 && st.spamCount >= 1 && st.candidatesSeen >= 1) {
        retiredSet.add(h);
        next.retired[p].push({ handle: h, retiredAt: nowIso, reason: "non_ai_promo" });
        retiredEvents.push({ platform: p, handle: h, reason: "non_ai_promo" });
      }
    }

    // 2. Promote verified candidates up to active capacity
    const activeCore = (next.core[p] || []).filter((h) => !retiredSet.has(normalizeHandle(h)));
    const existingDiscoveredMap = new Map(next.discovered[p].map((d) => [d.handle, d]));
    const slotsAvailable = Math.max(0, maxActive - activeCore.length);

    const sortedVerified = [...(verifiedByPlatform[p] || [])].sort((a, b) => b.verifyScore - a.verifyScore);
    for (const cand of sortedVerified) {
      const h = normalizeHandle(cand.handle);
      if (activeCore.includes(h) || retiredSet.has(h)) continue;
      const record = {
        handle: h,
        verifiedAt: nowIso,
        discoveredFrom: cand.discoveredFrom || "anchor",
        verifyScore: cand.verifyScore,
        aiRatio: cand.aiRatio,
        sampleCount: cand.sampleCount,
      };
      if (!existingDiscoveredMap.has(h)) {
        promotedEvents.push({ platform: p, ...record });
      }
      existingDiscoveredMap.set(h, record);
    }

    next.discovered[p] = [...existingDiscoveredMap.values()]
      .sort((a, b) => (b.verifyScore || 0) - (a.verifyScore || 0))
      .slice(0, slotsAvailable);
  }

  next.updatedAt = nowIso;
  next.lastDiscoveryAt = nowIso;
  return { registry: next, promotedEvents, retiredEvents };
}

async function discoverSeeds(opts = {}) {
  const seedsFile = opts.seedsFile || SEEDS_FILE;
  const reportFile = opts.reportFile || REPORT_FILE;
  const skipLiveGraph = Boolean(opts.skipLiveGraph || process.env.SOCIAL_DISCOVER_CORPUS_ONLY === "1");
  const skipInstagram = Boolean(opts.skipInstagram || process.env.SOCIAL_SKIP_INSTAGRAM === "1");

  const registry = loadSeedRegistry(seedsFile);
  const { anchorKeywords, accountStats } = buildAnchorProfile();
  const candidates = extractCorpusCandidates();

  // Seed expansion pool for Reddit
  for (const sub of REDDIT_EXPANSION_POOL) {
    addCandidate(candidates, "reddit", sub, "anchor_topic_pool");
  }

  // Live graph expansion from core seeds (X & Threads)
  if (!skipLiveGraph) {
    if (registry.core.x.length) {
      try {
        const res = await runPythonJson(X_SCRIPT, ["--users", registry.core.x.join(","), "--limit", "4", "--discover"]);
        for (const d of res.discovered_handles || []) {
          addCandidate(candidates, "x", d.handle, d.source || "x_graph");
        }
      } catch (e) {
        console.warn(`[social:discover:x] 그래프 확장 실패: ${e.message}`);
      }
    }
    if (registry.core.threads.length) {
      try {
        const res = await runPythonJson(THREADS_SCRIPT, ["--users", registry.core.threads.join(","), "--limit", "4", "--discover"]);
        for (const d of res.discovered_handles || []) {
          addCandidate(candidates, "threads", d.handle, d.source || "threads_graph");
        }
      } catch (e) {
        console.warn(`[social:discover:threads] 그래프 확장 실패: ${e.message}`);
      }
    }
  }

  const verifiedByPlatform = { x: [], threads: [], instagram: [], reddit: [] };
  const rejectedByPlatform = { x: [], threads: [], instagram: [], reddit: [] };

  for (const p of PLATFORMS) {
    const known = new Set([
      ...(registry.core[p] || []).map(normalizeHandle),
      ...(registry.discovered[p] || []).map((d) => normalizeHandle(d.handle)),
      ...(registry.retired[p] || []).map((r) => normalizeHandle(r.handle || r)),
    ]);

    const pool = [...candidates[p].values()]
      .filter((c) => !known.has(c.handle))
      .sort((a, b) => b.sources.size - a.sources.size)
      .slice(0, MAX_VERIFY_PER_PLATFORM);

    if (p === "instagram" && skipInstagram) continue;

    for (const [idx, cand] of pool.entries()) {
      if (p === "reddit" && idx > 0) await sleep(REDDIT_DELAY_MS);
      try {
        const posts = await fetchCandidatePosts(p, cand.handle);
        const evalRes = evaluateCandidate(cand.handle, posts, anchorKeywords);
        const entry = { ...evalRes, discoveredFrom: [...cand.sources].slice(0, 3).join(", ") };
        if (evalRes.passed) {
          verifiedByPlatform[p].push(entry);
        } else {
          rejectedByPlatform[p].push(entry);
        }
      } catch (e) {
        rejectedByPlatform[p].push({ handle: cand.handle, passed: false, reason: `fetch_error:${e.message}` });
      }
    }
  }

  const { registry: evolved, promotedEvents, retiredEvents } = evolveSeedRegistry(registry, verifiedByPlatform, accountStats);
  const saved = saveSeedRegistry(evolved, seedsFile);

  const report = {
    runAt: saved.lastDiscoveryAt,
    anchorKeywords: anchorKeywords.slice(0, 15),
    activeCounts: Object.fromEntries(PLATFORMS.map((p) => [p, saved[p].length])),
    promoted: promotedEvents,
    retired: retiredEvents,
    rejected: rejectedByPlatform,
    accountStats,
  };
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(
    `[social:discover] 승격 ${promotedEvents.length}건 · 퇴출 ${retiredEvents.length}건 · 활성 시드 ${JSON.stringify(report.activeCounts)}`,
  );
  return report;
}

module.exports = {
  buildAnchorProfile,
  scorePostAiSignal,
  evaluateCandidate,
  extractCorpusCandidates,
  evolveSeedRegistry,
  discoverSeeds,
};

if (require.main === module) {
  const args = process.argv.slice(2);
  discoverSeeds({
    skipLiveGraph: args.includes("--corpus-only"),
    skipInstagram: args.includes("--skip-instagram"),
  })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e.message);
      process.exit(1);
    });
}
