#!/usr/bin/env node
// Deterministic collector: GitHub search + HN Algolia → data/candidates.json
// LLM 없이 사실 데이터만 수집. 큐레이션(한글화·분류)은 curate.js 가 담당.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, ".tmp", "candidates.json");
const { load: loadLedger, velocity, scoreVelocity } = require("../stars/build-stars-ledger");
const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!GH_TOKEN) {
  console.error("GH_TOKEN (or GITHUB_TOKEN) is required");
  
}

const WEEK_AGO = new Date(Date.now() - 7 * 24 * 3600 * 1000);
const WEEK_AGO_ISO = WEEK_AGO.toISOString().slice(0, 10);
const MONTH_AGO_ISO = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const TODAY = new Date().toISOString().slice(0, 10);

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

function daysAgo(iso) {
  if (!iso) return null;
  return Math.round((Date.now() - Date.parse(iso)) / 86400000);
}

async function main() {
  const prevStars = loadPrevStars();
  const ledger = loadLedger();
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
  });

  for (const { q, sort } of GH_QUERIES) {
    for (const r of await ghSearch(q, sort)) {
      if (r.fork || r.archived) continue;
      if (repos.has(r.full_name)) continue;
      repos.set(r.full_name, toCandidate(r));
    }
  }

  // 이전 주 등재 리포도 유지 대상 (classic 연속성 + velocity 추적)
  for (const id of Object.keys(prevStars)) {
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

  const all = [...repos.values()].filter((c) => c.stars >= 3); // 노이즈 컷
  const velMeta = scoreVelocity(all);
  for (const c of all) c.velocity_7d = c.v7d; // 하위 호환 필드명

  // 성장률만으로 자르면 신상이 100점에 몰려 풀 전체를 차지하고 classic 후보가 0 이 된다
  // (2026-08-04 실측: 60/60 이 30일 내 신상, 최대 1,658★, classic 발행 0건)
  const pick = new Map();
  const take = (list, n) => list.slice(0, n).forEach((c) => pick.set(c.id, c));
  const byVelocity = [...all].sort((a, b) => b.velocity_score - a.velocity_score || b.stars - a.stars);
  const byStars = [...all].sort((a, b) => b.stars - a.stars);
  take(all.filter((c) => prevStars[c.id] != null), 40); // 직전 주 등재분 = classic 연속성
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
    `collected ${candidates.length}/${all.length} candidates ` +
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
