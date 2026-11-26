#!/usr/bin/env node
/**
 * Generate RSS 2.0 feed from current week's data + archived snapshots.
 * Each week becomes one feed entry summarizing that week's curation.
 */
const fs = require("fs");
const path = require("path");

const SITE_URL = "https://ldk-hub.github.io/ai-weekly/";
const ROOT = path.resolve(__dirname, "..", "..");
const LATEST = path.join(ROOT, "site/public/data/latest.json");
const ARCHIVE_DIR = path.join(ROOT, "data/archive");
const OUT = path.join(ROOT, "site", "public", "feed.xml");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(d) {
  return new Date(d).toUTCString();
}

function loadJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function pickWeeks() {
  // Combine archive snapshots (oldest→newest) + latest at end.
  const weeks = [];
  if (fs.existsSync(ARCHIVE_DIR)) {
    for (const f of fs.readdirSync(ARCHIVE_DIR).sort()) {
      if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(f)) continue;
      const data = loadJSON(path.join(ARCHIVE_DIR, f));
      if (data && data.generated_at) weeks.push({ date: f.replace(".json", ""), data });
    }
  }
  const latest = loadJSON(LATEST);
  if (latest && latest.generated_at) {
    const dt = latest.generated_at.slice(0, 10);
    if (!weeks.find(w => w.date === dt)) weeks.push({ date: dt, data: latest });
  }
  // Newest first, max 12 entries
  return weeks.reverse().slice(0, 12);
}

function summarizeWeek(week) {
  const { data, date } = week;
  const rising = (data.rising || []).slice(0, 5);
  const classic = (data.classic || []).slice(0, 3);
  const total = (data.rising?.length || 0) + (data.classic?.length || 0);

  let html = `<p><strong>${esc(date)} 업데이트</strong> · 총 ${total}개 프로젝트.</p>`;
  if (rising.length) {
    html += `<h3>이번 주 뜨는 Top ${rising.length}</h3><ol>`;
    for (const it of rising) {
      html += `<li><a href="${esc(it.official_url)}"><strong>${esc(it.title_ko || it.id)}</strong></a> — ${esc(it.catchphrase || "")} <em>(${esc(it.id)} · ★${it.stars || "—"})</em></li>`;
    }
    html += `</ol>`;
  }
  if (classic.length) {
    html += `<h3>이미 유명한 (Top ${classic.length})</h3><ul>`;
    for (const it of classic) {
      html += `<li><a href="${esc(it.official_url)}">${esc(it.title_ko || it.id)}</a> — ${esc(it.catchphrase || "")} <em>(★${it.stars || "—"})</em></li>`;
    }
    html += `</ul>`;
  }
  html += `<p><a href="${SITE_URL}">전체 인덱스 보기</a></p>`;
  return html;
}

function buildFeed() {
  const weeks = pickWeeks();
  const lastBuild = weeks[0]?.data?.generated_at || new Date().toISOString();

  const items = weeks.map(week => {
    const title = `AI위클리 · ${week.date} 주간 업데이트`;
    const link = `${SITE_URL}?w=${week.date}`;
    const desc = summarizeWeek(week);
    return `    <item>
      <title>${esc(title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="false">cc-trends-${week.date}</guid>
      <pubDate>${rfc822(week.data.generated_at)}</pubDate>
      <description>${esc(desc)}</description>
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI위클리 — Claude Code 도구 주간 인덱스</title>
    <link>${SITE_URL}</link>
    <atom:link href="${SITE_URL}feed.xml" rel="self" type="application/rss+xml" />
    <description>매주 월요일 갱신되는 Claude Code 에이전트 · 스킬 · 하네스 · MCP 큐레이션.</description>
    <language>ko</language>
    <lastBuildDate>${rfc822(lastBuild)}</lastBuildDate>
    <ttl>10080</ttl>
${items}
  </channel>
</rss>
`;
}

const xml = buildFeed();
fs.writeFileSync(OUT, xml);
console.log(`✓ RSS feed written: ${OUT} (${xml.length} bytes)`);

// 뉴스 전용 피드. 없으면 news.html 이 주간 플러그인 피드를 자기 피드처럼 광고하게 된다.
// 항목 단위(기사 1건 = 1 entry)로 내보낸다 — 주간 피드는 주차 단위라 성격이 다르다.
function buildNewsFeed() {
  const latest = loadJSON(path.join(ROOT, "site/public/data/news_latest.json"));
  if (!latest || !Array.isArray(latest.news) || latest.news.length === 0) return null;

  const items = latest.news
    .slice(0, 50)
    .map((n) => {
      const desc = [n.summary_ko, n.body_ko].filter(Boolean).join("\n\n");
      const cats = [n.signal_name, n.category_name, ...(n.tags || [])].filter(Boolean);
      return `    <item>
      <title>${esc(n.title_ko || n.headline)}</title>
      <link>${esc(n.url)}</link>
      <guid isPermaLink="false">${esc(n.id)}</guid>
      <pubDate>${rfc822(n.publish_date || latest.generated_at)}</pubDate>
${cats.map((c) => `      <category>${esc(c)}</category>`).join("\n")}
      <description>${esc(desc)}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI위클리 — AI 뉴스</title>
    <link>${SITE_URL}news.html</link>
    <atom:link href="${SITE_URL}news-feed.xml" rel="self" type="application/rss+xml" />
    <description>모델 릴리스 · 개발자 도구 · 오픈소스 · 연구 소식의 3줄 한국어 요약.</description>
    <language>ko</language>
    <lastBuildDate>${rfc822(latest.generated_at || Date.now())}</lastBuildDate>
${items}
  </channel>
</rss>
`;
}

const newsXml = buildNewsFeed();
if (newsXml) {
  const newsOut = path.join(ROOT, "site", "public", "news-feed.xml");
  fs.writeFileSync(newsOut, newsXml);
  console.log(`✓ news RSS written: ${newsOut} (${newsXml.length} bytes)`);
} else {
  console.warn("· news_latest.json 없음/빈 배열 — 뉴스 피드 생략");
}

function kstDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d);
}

// sitemap 의 lastmod 를 각 페이지의 실제 데이터 갱신일로 다시 쓴다.
// 하드코딩해 두면 데이터만 갱신될 때 lastmod 가 거짓이 된다.
function dataDate(relPath, fallback) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
    const ts = d.date || d.generated_at || d.generated || d.generatedAt || d.updated_at;
    if (typeof ts === "string" && /^\d{4}-\d{2}-\d{2}$/.test(ts)) return ts;
    if (ts) {
      const parsed = new Date(ts);
      if (!Number.isNaN(parsed.getTime())) return kstDate(parsed);
    }
  } catch { /* 파일 없으면 fallback */ }
  return fallback;
}

const today = kstDate();
const pages = [
  { loc: SITE_URL, lastmod: dataDate("site/public/data/latest.json", today), extra: "    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>" },
  { loc: `${SITE_URL}news`, lastmod: dataDate("site/public/data/news_latest.json", today), extra: "    <priority>0.9</priority>" },
  { loc: `${SITE_URL}social`, lastmod: dataDate("site/public/data/social_latest.json", today), extra: "    <changefreq>daily</changefreq>\n    <priority>0.8</priority>" },
  { loc: `${SITE_URL}starboard`, lastmod: dataDate("site/public/data/stars_meta.json", today), extra: "    <changefreq>daily</changefreq>\n    <priority>0.8</priority>" },
  { loc: `${SITE_URL}benchmarks`, lastmod: dataDate("site/public/data/benchmarks_latest.json", today), extra: "    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>" },
  { loc: `${SITE_URL}sanctuary`, lastmod: dataDate("site/public/data/park_world.json", today), extra: "    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>" },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n${p.extra}\n  </url>`).join("\n")}
</urlset>
`;
const sitemapPath = path.join(ROOT, "site", "public", "sitemap.xml");
fs.writeFileSync(sitemapPath, sitemap);
console.log(`✓ sitemap written: ${sitemapPath}`);

const llmsTxt = `# AI위클리 (AI Weekly)

> Claude Code 에이전트·스킬·하네스·MCP 주간 트렌드 인덱스, 일일 AI 기술 뉴스 3줄 요약, 오픈소스 스타 성장 순위표(Starboard), 프론티어 LLM 점유율·성능 벤치마크를 제공하는 정적 웹 서비스입니다.

## Core Pages

- [인기 플러그인 (홈)](${SITE_URL}): 매주 엄선하는 Claude Code 스킬·MCP·에이전트·하네스 Rising/Classic 인덱스
- [AI 뉴스](${SITE_URL}news): 10개 기술·소셜 매체에서 수집한 최근 24시간 AI 기술 신호 한국어 3줄 요약
- [소셜 피드](${SITE_URL}social): X·Threads·Reddit·Instagram AI 실무 팁과 프롬프트 데일리 큐레이션
- [스타보드 (Starboard)](${SITE_URL}starboard): 600+ AI 오픈소스 리포지토리의 체급별 주간 스타 증감 및 활동성 순위표
- [점유율·성능 (Benchmarks)](${SITE_URL}benchmarks): Similarweb·Trakkr·OpenRouter 3출처 평균 AI 점유율 및 프론티어 LLM 리더보드
- [위클리랜드 3D](${SITE_URL}sanctuary): AI위클리 실시간 데이터를 3D 파빌리온·전광판으로 탐색하는 인터랙티브 테마파크

## Feeds & Machine-Readable Data

- [주간 플러그인 RSS](${SITE_URL}feed.xml): 매주 갱신되는 도구 인덱스 Atom/RSS 피드
- [일일 AI 뉴스 RSS](${SITE_URL}news-feed.xml): 매일 갱신되는 AI 기술 신호 RSS 피드
- [최신 플러그인 JSON](${SITE_URL}data/latest.json): 이번 주 Rising & Classic 구조화 데이터
- [최신 AI 뉴스 JSON](${SITE_URL}data/news_latest.json): 일일 AI 기술 신호 구조화 데이터
- [스타보드 요약 JSON](${SITE_URL}data/stars_summary.json): 오픈소스 메타데이터 및 최근 14일 스타 추이
- [벤치마크 JSON](${SITE_URL}data/benchmarks_latest.json): AI 서비스 점유율 및 프론티어 LLM 성능 지표
- [Sitemap](${SITE_URL}sitemap.xml): 사이트 전체 URL 및 최신 갱신일 목록
`;
const llmsPath = path.join(ROOT, "site", "public", "llms.txt");
fs.writeFileSync(llmsPath, llmsTxt);
console.log(`✓ llms.txt written: ${llmsPath}`);

const ardManifest = {
  entries: [
    {
      identifier: "urn:air:ldk-hub.github.io:feed:ai-weekly-plugins",
      displayName: "AI Weekly — Claude Code Tools Index",
      type: "application/json",
      url: `${SITE_URL}data/latest.json`,
      representativeQueries: [
        "이번 주 뜨는 Claude Code 플러그인과 스킬 목록",
        "최신 MCP 서버 및 에이전트 하네스 추천",
        "Trending Claude Code skills and MCP tools this week",
      ],
    },
    {
      identifier: "urn:air:ldk-hub.github.io:feed:ai-weekly-news",
      displayName: "AI Weekly — Daily AI Technical News",
      type: "application/json",
      url: `${SITE_URL}data/news_latest.json`,
      representativeQueries: [
        "오늘의 최신 AI 모델 출시 및 개발자 도구 뉴스 요약",
        "최근 24시간 AI 기술 신호 한국어 요약",
        "Daily AI engineering news summary in Korean",
      ],
    },
    {
      identifier: "urn:air:ldk-hub.github.io:dataset:ai-weekly-benchmarks",
      displayName: "AI Weekly — AI Market Share & Frontier LLM Benchmarks",
      type: "application/json",
      url: `${SITE_URL}data/benchmarks_latest.json`,
      representativeQueries: [
        "최신 AI 챗봇 서비스 점유율 및 OpenRouter API 사용량",
        "프론티어 LLM 코딩 성능과 가격 대비 가성비 비교",
        "Latest LLM coding benchmark scores and pricing comparison",
      ],
    },
    {
      identifier: "urn:air:ldk-hub.github.io:dataset:ai-weekly-starboard",
      displayName: "AI Weekly — AI Open-Source Starboard Velocity",
      type: "application/json",
      url: `${SITE_URL}data/stars_summary.json`,
      representativeQueries: [
        "최근 7일간 GitHub 스타가 가장 빠르게 성장한 AI 오픈소스",
        "AI 에이전트 오픈소스 리포지토리 주간 성장률 순위",
      ],
    },
  ],
};
const wellKnownDir = path.join(ROOT, "site", "public", ".well-known");
fs.mkdirSync(wellKnownDir, { recursive: true });
const ardPath = path.join(wellKnownDir, "ard.json");
fs.writeFileSync(ardPath, JSON.stringify(ardManifest, null, 2) + "\n");
console.log(`✓ ARD manifest written: ${ardPath}`);
