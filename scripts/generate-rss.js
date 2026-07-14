#!/usr/bin/env node
/**
 * Generate RSS 2.0 feed from current week's data + archived snapshots.
 * Each week becomes one feed entry summarizing that week's curation.
 */
const fs = require("fs");
const path = require("path");

const SITE_URL = "https://ldk-hub.github.io/ai-weekly/";
const ROOT = path.resolve(__dirname, "..");
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
