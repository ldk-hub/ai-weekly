#!/usr/bin/env node
// Deterministic collector: GitHub search + HN Algolia → data/candidates.json
// LLM 없이 사실 데이터만 수집. 큐레이션(한글화·분류)은 curate.js 가 담당.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, ".tmp", "candidates.json");
const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!GH_TOKEN) {
  console.error("GH_TOKEN (or GITHUB_TOKEN) is required");
  process.exit(1);
}

const WEEK_AGO = new Date(Date.now() - 7 * 24 * 3600 * 1000);
const WEEK_AGO_ISO = WEEK_AGO.toISOString().slice(0, 10);

const GH_QUERIES = [
  `claude-code in:name,description,topics pushed:>${WEEK_AGO_ISO}`,
  `topic:claude-code`,
  `topic:mcp-server pushed:>${WEEK_AGO_ISO}`,
  `"claude code" skill in:name,description created:>${WEEK_AGO_ISO}`,
  `"claude" agent harness in:name,description pushed:>${WEEK_AGO_ISO}`,
  `topic:claude-skills`,
];

const HN_QUERIES = ["claude code", "mcp server", "claude skill", "claude agent"];

async function ghSearch(q) {
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=30`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
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

async function main() {
  const prevStars = loadPrevStars();
  const repos = new Map();

  for (const q of GH_QUERIES) {
    for (const r of await ghSearch(q)) {
      if (r.fork || r.archived) continue;
      if (repos.has(r.full_name)) continue;
      repos.set(r.full_name, {
        id: r.full_name,
        name: r.name,
        owner: r.owner.login,
        url: r.html_url,
        description: r.description || "",
        topics: r.topics || [],
        stars: r.stargazers_count,
        prev_stars: prevStars[r.full_name] ?? null,
        velocity_7d:
          prevStars[r.full_name] != null ? r.stargazers_count - prevStars[r.full_name] : null,
        created_at: r.created_at,
        pushed_at: r.pushed_at,
        language: r.language,
        hn: [],
      });
    }
  }

  // 이전 주 등재 리포도 유지 대상 (classic 연속성 + velocity 추적)
  for (const id of Object.keys(prevStars)) {
    if (repos.has(id)) continue;
    const res = await fetch(`https://api.github.com/repos/${id}`, {
      headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) continue; // 404 = 죽은 리포, 자연 탈락
    const r = await res.json();
    if (r.fork || r.archived) continue;
    repos.set(r.full_name, {
      id: r.full_name,
      name: r.name,
      owner: r.owner.login,
      url: r.html_url,
      description: r.description || "",
      topics: r.topics || [],
      stars: r.stargazers_count,
      prev_stars: prevStars[id],
      velocity_7d: r.stargazers_count - prevStars[id],
      created_at: r.created_at,
      pushed_at: r.pushed_at,
      language: r.language,
      hn: [],
    });
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

  // 상위 후보만 유지 (프롬프트 크기 제한): velocity 우선, 없으면 stars
  const candidates = [...repos.values()]
    .sort((a, b) => (b.velocity_7d ?? b.stars / 100) - (a.velocity_7d ?? a.stars / 100))
    .slice(0, 60);

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(
    OUT,
    JSON.stringify({ collected_at: new Date().toISOString(), candidates }, null, 2)
  );
  console.log(`collected ${candidates.length} candidates → ${OUT}`);
  if (candidates.length === 0) {
    console.error("no candidates collected — aborting so last week's data stays intact");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
