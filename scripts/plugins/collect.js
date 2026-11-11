#!/usr/bin/env node
// Deterministic collector: GitHub search + HN Algolia → data/candidates.json
// LLM 없이 사실 데이터만 수집. 큐레이션(한글화·분류)은 curate.js 가 담당.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, ".tmp", "candidates.json");
const { load: loadLedger, velocity, scoreVelocity } = require("../stars/build-stars-ledger");
const { resolveGitHubToken } = require("../core/github-token");
const GH_TOKEN = resolveGitHubToken();
if (!GH_TOKEN) {
  console.warn("GH_TOKEN not found, unauthenticated GitHub Search may be rate limited");
}

const WEEK_AGO = new Date(Date.now() - 7 * 24 * 3600 * 1000);
const WEEK_AGO_ISO = WEEK_AGO.toISOString().slice(0, 10);
const MONTH_AGO_ISO = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

// sort=stars 로만 돌리면 후보 풀이 거대 리포로만 채워진다 — 신생 진입 경로를 함께 둔다
const GH_QUERIES = [
  { q: `claude-code in:name,description,topics pushed:>${WEEK_AGO_ISO}`, sort: "stars" },
  { q: `topic:claude-code`, sort: "stars" },
  { q: `topic:mcp-server pushed:>${WEEK_AGO_ISO}`, sort: "stars" },
  { q: `"claude code" skill in:name,description created:>${WEEK_AGO_ISO}`, sort: "stars" },
  { q: `"claude" agent harness in:name,description pushed:>${WEEK_AGO_ISO}`, sort: "stars" },
  { q: `topic:claude-skills`, sort: "stars" },
  { q: `claude-code in:name,description,topics pushed:>${WEEK_AGO_ISO}`, sort: "updated" },
  { q: `topic:claude-code pushed:>${WEEK_AGO_ISO}`, sort: "updated" },
  { q: `claude-code in:name,description,topics created:>${MONTH_AGO_ISO} stars:>=3`, sort: "stars" },
  { q: `"claude code" skill in:name,description created:>${MONTH_AGO_ISO} stars:>=3`, sort: "updated" },
];

const HN_QUERIES = ["claude code", "mcp server", "claude skill", "claude agent"];

async function ghSearch(q, sort = "stars") {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=${sort}&order=desc&per_page=30`;
  const res = await fetch(url, {
    headers: {
      ...(GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {}),
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    console.warn(`gh search failed (${res.status}): ${q}`);
    return [];
  }
  const body = await res.json();
  return body.items || [];
}

async function hnSearch(q) {
  const since = Math.floor(WEEK_AGO.getTime() / 1000);
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=30`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`hn search failed (${res.status}): ${q}`);
    return [];
  }
  const body = await res.json();
  return body.hits || [];
}

function loadPrevStars() {
  const map = {};
  const latestPath = path.join(ROOT, "site", "public", "data", "latest.json");
  try {
    const d = JSON.parse(fs.readFileSync(latestPath, "utf8"));
    for (const item of [...(d.rising || []), ...(d.classic || [])]) {
      if (item.id && typeof item.stars === "number") map[item.id] = item.stars;
    }
  } catch (e) {
    console.warn("no previous latest.json:", e.message);
  }
  return map;
}

function loadStarsMeta() {
  const metaPath = path.join(ROOT, "data", "stars", "stars_meta.json");
  try {
    return JSON.parse(fs.readFileSync(metaPath, "utf8"));
  } catch (e) {
    return { repos: {} };
  }
}

function daysAgo(iso) {
  if (!iso) return null;
  return Math.round((Date.now() - Date.parse(iso)) / 86400000);
}

async function main() {
  const prevStars = loadPrevStars();
  const ledger = loadLedger();
  const starsMeta = loadStarsMeta();
  const repos = new Map();

  const toCandidate = (r) => ({
    id: r.full_name,
    name: r.name,
    owner: r.owner.login,
    url: r.html_url,
    description: r.description || "",
    topics: r.topics || [],
    stars: r.stargazers_count,
    prev_stars: prevStars[r.full_name] ?? null,
    v7d: velocity(ledger, r.full_name, r.stargazers_count, TODAY).v7d,
    created_at: r.created_at,
    created_days_ago: daysAgo(r.created_at),
    pushed_at: r.pushed_at,
    language: r.language,
    hn: [],
    x: [],
    reddit: [],
    threads: [],
    instagram: [],
  });

  for (const { q, sort } of GH_QUERIES) {
    for (const r of await ghSearch(q, sort)) {
      if (r.fork || r.archived) continue;
      if (starsMeta.repos?.[r.full_name]?.suspect) {
        console.warn(`[collect] skipping suspect repo: ${r.full_name} (${starsMeta.repos[r.full_name].suspect})`);
        continue;
      }
      if (repos.has(r.full_name)) continue;
      repos.set(r.full_name, toCandidate(r));
    }
  }

  // 이전 주 등재 리포도 유지 대상 (classic 연속성 + velocity 추적)
  for (const id of Object.keys(prevStars)) {
    if (starsMeta.repos?.[id]?.suspect) {
      console.warn(`[collect] skipping suspect prev repo: ${id}`);
      continue;
    }
    if (repos.has(id)) continue;
    const res = await fetch(`https://api.github.com/repos/${id}`, {
      headers: { ...(GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : {}), Accept: "application/vnd.github+json" },
    });
    if (!res.ok) continue; // 404 = 죽은 리포, 자연 탈락
    const r = await res.json();
    if (r.fork || r.archived) continue;
    repos.set(r.full_name, toCandidate(r));
  }

  // HN buzz 매칭: 스토리 URL/제목에 리포가 언급되면 evidence 로 붙임
  for (const q of HN_QUERIES) {
    for (const hit of await hnSearch(q)) {
      const text = `${hit.title || ""} ${hit.url || ""}`.toLowerCase();
      for (const repo of repos.values()) {
        if (text.includes(repo.id.toLowerCase()) || text.includes(repo.name.toLowerCase())) {
          repo.hn.push({
            title: hit.title,
            url: `https://news.ycombinator.com/item?id=${hit.objectID}`,
            points: hit.points || 0,
            comments: hit.num_comments || 0,
          });
        }
      }
    }
  }

  // X / Reddit buzz 매칭: Agent-Reach (twitter-cli / rdt-cli) 가용 시 evidence 로 보강
  let agentReach = null;
  try {
    agentReach = require("../core/agent_reach");
  } catch (e) {}

  if (agentReach) {
    const SOCIAL_QUERIES = ["claude code", "mcp server", "claude skill"];
    try {
      for (const q of SOCIAL_QUERIES) {
        const tweets = await agentReach.searchX(q, { max: 15 });
        for (const t of tweets || []) {
          const text = `${t.text || ""} ${(t.urls || []).join(" ")}`.toLowerCase();
          for (const repo of repos.values()) {
            if (text.includes(repo.id.toLowerCase()) || text.includes(repo.name.toLowerCase())) {
              repo.x.push({
                title: (t.text || "").slice(0, 100),
                url: t.url || `https://x.com/i/web/status/${t.id}`,
                author: t.author || "",
                likes: t.likes || 0,
                retweets: t.retweets || 0,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("[collect] X buzz skipped:", e.message);
    }

    try {
      for (const q of SOCIAL_QUERIES) {
        const posts = await agentReach.searchReddit(q, { limit: 15 });
        for (const p of posts || []) {
          const text = `${p.title || ""} ${p.url || ""} ${p.selftext || ""}`.toLowerCase();
          for (const repo of repos.values()) {
            if (text.includes(repo.id.toLowerCase()) || text.includes(repo.name.toLowerCase())) {
              repo.reddit.push({
                title: p.title || "",
                url: p.url || `https://reddit.com${p.permalink}`,
                points: p.score || 0,
                comments: p.num_comments || 0,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("[collect] Reddit buzz skipped:", e.message);
    }
  }

  // Scrapling & 데일리 아카이브 소셜 미디어(Threads, X, Instagram, Reddit) 주간 크로스 매칭
  const archiveDir = path.join(ROOT, "data", "archive");
  const recentNewsItems = [];
  try {
    const files = fs.readdirSync(archiveDir)
      .filter((f) => /^news_\d{4}-\d{2}-\d{2}\.json$/.test(f))
      .sort()
      .slice(-7);
    for (const f of files) {
      try {
        const d = JSON.parse(fs.readFileSync(path.join(archiveDir, f), "utf8"));
        for (const item of d.news || []) recentNewsItems.push(item);
      } catch {}
    }
  } catch {}

  const newsCandidatesPath = path.join(ROOT, ".tmp", "news_candidates.json");
  if (fs.existsSync(newsCandidatesPath)) {
    try {
      const nc = JSON.parse(fs.readFileSync(newsCandidatesPath, "utf8"));
      for (const item of (nc.candidates || nc || [])) recentNewsItems.push(item);
    } catch {}
  }

  for (const n of recentNewsItems) {
    const text = `${n.headline || n.title || ""} ${n.title_ko || ""} ${n.summary_ko || ""} ${n.body || n.body_ko || ""} ${n.url || ""}`.toLowerCase();
    const sourceLabel = (n.source || (n.sources && n.sources[0]) || "").toLowerCase();

    for (const repo of repos.values()) {
      const idLower = repo.id.toLowerCase();
      const nameLower = repo.name.toLowerCase();
      if (text.includes(idLower) || text.includes(nameLower)) {
        const evidenceItem = {
          title: (n.headline || n.title_ko || n.title || "").slice(0, 100),
          url: n.url || `https://github.com/${repo.id}`,
          author: n.author || n.author_profile || "",
          points: (n.metrics?.likes || n.metrics?.points || 0),
          comments: (n.metrics?.comments || 0),
        };

        if (sourceLabel.includes("thread")) {
          if (!repo.threads.some((t) => t.url === evidenceItem.url)) repo.threads.push(evidenceItem);
        } else if (sourceLabel.includes("insta")) {
          if (!repo.instagram.some((i) => i.url === evidenceItem.url)) repo.instagram.push(evidenceItem);
        } else if (sourceLabel.includes("x") || sourceLabel.includes("twitter")) {
          if (!repo.x.some((x) => x.url === evidenceItem.url)) repo.x.push(evidenceItem);
        } else if (sourceLabel.includes("reddit")) {
          if (!repo.reddit.some((r) => r.url === evidenceItem.url)) repo.reddit.push(evidenceItem);
        }
      }
    }
  }

  const all = [...repos.values()].filter((c) => c.stars >= 3); // 노이즈 컷
  const velMeta = scoreVelocity(all);
  for (const c of all) c.velocity_7d = c.v7d; // 하위 호환 필드명

  // 성장률만으로 자르면 신상이 100점에 몰려 풀 전체를 차지하고 classic 후보가 0 이 된다
  // (2026-08-04 실측: 60/60 이 30일 내 신상, 최대 1,658★, classic 발행 0건)
  // 발행 하한선 — scoreVelocity **뒤**에 적용한다. 위 `all` 풀에서 빼면 코호트 중앙값이
  // 움직여 무관한 항목의 velocity_score 까지 흔들린다 (velocity_score = 33.3*gr/med).
  //
  // 500★ 기본 하한선 + 초신성 패스 (Supernova Fast-Track):
  // 신생 리포(created_days_ago <= 30)이면서 다중 소셜 검증(threads, x, instagram, reddit, hn 중 2곳 이상)을
  // 획득한 경우 200★ 이상부터 발행 후보에 편입. (악성코드는 Phase 2 scan-install-entry.js에서 전수 차단)
  const MIN_PUBLISH_STARS = 500;
  const SUPERNOVA_MIN_STARS = 200;

  function isEligibleCandidate(c) {
    if (c.stars >= MIN_PUBLISH_STARS) return true;
    const socialSourcesCount = (c.threads?.length ? 1 : 0) +
      (c.instagram?.length ? 1 : 0) +
      (c.x?.length ? 1 : 0) +
      (c.reddit?.length ? 1 : 0) +
      (c.hn?.length ? 1 : 0);
    const isNew = c.created_days_ago != null && c.created_days_ago <= 30;
    return isNew && socialSourcesCount >= 2 && c.stars >= SUPERNOVA_MIN_STARS;
  }

  const listed = all.filter(isEligibleCandidate);

  const pick = new Map();
  const take = (list, n) => list.slice(0, n).forEach((c) => pick.set(c.id, c));
  const byVelocity = [...listed].sort((a, b) => b.velocity_score - a.velocity_score || b.stars - a.stars);
  const byStars = [...listed].sort((a, b) => b.stars - a.stars);
  take(listed.filter((c) => prevStars[c.id] != null), 40); // 직전 주 등재분 = classic 연속성
  take(byVelocity, 40); // rising 후보
  take(byStars, 20); // classic 후보 (성장률 낮아도 풀에 남긴다)
  const candidates = [...pick.values()].sort((a, b) => b.velocity_score - a.velocity_score);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify(
      { collected_at: new Date().toISOString(), velocity: velMeta, candidates },
      null,
      2
    )
  );
  console.log(
    `collected ${candidates.length}/${listed.length} candidates ` +
      `(${all.length - listed.length} cut by ${MIN_PUBLISH_STARS}★ floor) ` +
      `(median growth ${(velMeta.median_growth_rate * 100).toFixed(2)}%/week, ` +
      `${velMeta.measured} measured) → ${OUT}`
  );
  if (candidates.length === 0) {
    console.error("no candidates collected — aborting so last week's data stays intact");
    
  }
}

main().catch((e) => {
  console.error(e);
  
});
