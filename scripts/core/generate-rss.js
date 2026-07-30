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
const OUT = path.join(ROOT, "site/feed.xml");

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
    const title = `cc-trends · ${week.date} 주간 업데이트`;
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
    <title>cc-trends — Claude Code 도구 주간 인덱스</title>
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
  const newsOut = path.join(ROOT, "site", "news-feed.xml");
  fs.writeFileSync(newsOut, newsXml);
  console.log(`✓ news RSS written: ${newsOut} (${newsXml.length} bytes)`);
} else {
  console.warn("· news_latest.json 없음/빈 배열 — 뉴스 피드 생략");
}

// sitemap 의 lastmod 를 각 페이지의 실제 데이터 갱신일로 다시 쓴다.
// 하드코딩해 두면 데이터만 갱신될 때 lastmod 가 거짓이 된다.
function dataDate(relPath, fallback) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
    const ts = d.generated_at || d.generated;
    if (ts) return new Date(ts).toISOString().slice(0, 10);
  } catch { /* 파일 없으면 fallback */ }
  return fallback;
}

const today = new Date().toISOString().slice(0, 10);
const pages = [
  { loc: SITE_URL, lastmod: dataDate("site/public/data/latest.json", today), extra: "    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>" },
  { loc: `${SITE_URL}news.html`, lastmod: dataDate("site/public/data/news_latest.json", today), extra: "    <priority>0.9</priority>" },
  { loc: `${SITE_URL}starboard.html`, lastmod: dataDate("data/stars_meta.json", today), extra: "    <changefreq>daily</changefreq>\n    <priority>0.8</priority>" },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>\n    <loc>${p.loc}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n${p.extra}\n  </url>`).join("\n")}
</urlset>
`;
const sitemapPath = path.join(ROOT, "site", "sitemap.xml");
fs.writeFileSync(sitemapPath, sitemap);
console.log(`✓ sitemap written: ${sitemapPath}`);
