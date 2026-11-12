#!/usr/bin/env node
/**
 * OG image generator
 * - Reads site/public/data/latest.json -> generates site/public/og.svg & og.png (1200x630)
 * - Reads site/public/data/social_latest.json -> generates site/public/og-social.svg & og-social.png (1200x630)
 */
const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "..", "site", "public");
const MAIN_DATA = path.join(PUBLIC_DIR, "data", "latest.json");
const SOCIAL_DATA = path.join(PUBLIC_DIR, "data", "social_latest.json");
const FONT_STACK = "'Apple SD Gothic Neo', 'Pretendard', 'Noto Sans KR', 'Malgun Gothic', sans-serif";

function escapeXml(s) {
  return String(s ?? "").replace(/[<>&"']/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
  }[c]));
}

function truncate(s, n) {
  s = String(s ?? "");
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function charUnits(ch) {
  const code = ch.charCodeAt(0);
  if (code >= 0x1100 && code <= 0xd7af) return 1.85;
  if (code > 0x2e80) return 1.85;
  if (/[A-ZMW@]/.test(ch)) return 1.15;
  if (/[iljtI1.,:;| ]/.test(ch)) return 0.6;
  return 0.95;
}

function wrapText(text, maxUnits, maxLines) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const lines = [];
  let cur = "";
  let units = 0;

  for (const ch of clean) {
    const u = charUnits(ch);
    if (units + u > maxUnits && cur.length > 0) {
      const breakAt = cur.lastIndexOf(" ");
      if (breakAt > cur.length * 0.45) {
        lines.push(cur.slice(0, breakAt).trimEnd());
        cur = cur.slice(breakAt + 1) + ch;
        units = [...cur].reduce((acc, c) => acc + charUnits(c), 0);
      } else {
        lines.push(cur.trimEnd());
        cur = ch === " " ? "" : ch;
        units = ch === " " ? 0 : u;
      }
      if (lines.length === maxLines) {
        const last = lines[maxLines - 1];
        lines[maxLines - 1] = last.slice(0, Math.max(1, last.length - 1)) + "…";
        return lines;
      }
    } else {
      cur += ch;
      units += u;
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, maxLines);
}

function renderLines(lines, x, startY, lineHeight, attrs) {
  return lines
    .map((line, idx) => `<text x="${x}" y="${startY + idx * lineHeight}" ${attrs}>${escapeXml(line)}</text>`)
    .join("\n      ");
}

function fmtStars(n) {
  if (!n || isNaN(n)) return "—";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function buildMainSvg(data) {
  const version = data.version || "";
  const updatedAt = fmtDate(data.generated_at);
  const rising = (data.rising || []).slice(0, 3);
  const BG = "#fbfaf6";
  const INK = "#0e0e0e";
  const MUTED = "#6b6860";
  const ACCENT = "#d97757";
  const PILL = "#f2efe5";
  const cardColors = ["#ffeca0", "#d8edd0", "#ffd8bd"];

  const clips = rising
    .map((_, i) => `<clipPath id="mainCardClip${i}"><rect x="0" y="0" width="347" height="280" rx="20"/></clipPath>`)
    .join("\n    ");

  let cardSVG = "";
  rising.forEach((item, i) => {
    const x = 60 + i * 367;
    const y = 290;
    const w = 347;
    const h = 280;
    const bgC = cardColors[i] || "#ffffff";
    const titleLines = wrapText(item.title_ko || item.id || "", 20, 2);
    const catchLines = wrapText(item.catchphrase || "", 32, 3);
    const cat = (item.category || "skill").toUpperCase();
    const stars = fmtStars(item.stars);
    const [repoOwner, ...rest] = (item.id || "").split("/");
    const repoName = rest.join("/");

    cardSVG += `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="20" fill="${bgC}" stroke="${INK}" stroke-width="1.5"/>
      <g clip-path="url(#mainCardClip${i})">
        <text x="24" y="38" font-size="11" font-weight="700" fill="${INK}" letter-spacing="1.6">#0${i + 1} · ${escapeXml(cat)}</text>
        ${renderLines(titleLines, 24, 78, 30, `font-size="22" font-weight="700" fill="${INK}" letter-spacing="-0.4"`)}
        ${renderLines(catchLines, 24, 144, 21, `font-size="13.5" font-weight="500" fill="${INK}" opacity="0.85"`)}
        <g transform="translate(24, ${h - 52})">
          <text x="0" y="0" font-size="12" font-weight="600" fill="${INK}" opacity="0.7">${escapeXml(truncate(repoOwner, 14))}/${escapeXml(truncate(repoName, 16))}</text>
          <text x="0" y="22" font-size="14" font-weight="700" fill="${INK}">★ ${stars}</text>
        </g>
      </g>
    </g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" font-family="${FONT_STACK}">
  <defs>${clips}</defs>
  <rect width="1200" height="630" fill="${BG}"/>
  <text x="60" y="80" font-size="32" font-weight="700" fill="${INK}" letter-spacing="-0.8">AI위클리 · AI Weekly</text>
  <text x="60" y="108" font-size="14" font-weight="500" fill="${MUTED}">Claude Code 주간 인덱스</text>
  <g transform="translate(${1200 - 60 - 210}, 64)">
    <rect x="0" y="0" width="210" height="36" rx="18" fill="${PILL}"/>
    <circle cx="22" cy="18" r="4" fill="${ACCENT}"/>
    <text x="112" y="23" font-size="13" font-weight="600" fill="${INK}" text-anchor="middle">${escapeXml(updatedAt)} · ${escapeXml(version)}</text>
  </g>
  <text x="60" y="200" font-size="48" font-weight="700" fill="${INK}" letter-spacing="-1.5">이번 주 뜨는 도구 TOP 3</text>
  <text x="60" y="245" font-size="18" font-weight="500" fill="${MUTED}">매주 월요일 자동 갱신 · ldk-hub.github.io/ai-weekly</text>
  ${cardSVG}
  <text x="60" y="600" font-size="12" font-weight="600" fill="${MUTED}">Made with Claude Code · AI Weekly</text>
  <text x="1140" y="600" font-size="12" font-weight="600" fill="${ACCENT}" text-anchor="end">Star on GitHub: ldk-hub/ai-weekly</text>
</svg>`;
}

const SOCIAL_BADGE = {
  instagram: { label: "Instagram", bg: "#db2777", fg: "#ffffff" },
  x: { label: "X", bg: "#0284c7", fg: "#ffffff" },
  threads: { label: "Threads", bg: "#6d28d9", fg: "#ffffff" },
  reddit: { label: "Reddit", bg: "#ea580c", fg: "#ffffff" },
};

function buildSocialSvg(data) {
  const items = (data.items || []).slice(0, 3);
  const dateLabel = data.date || fmtDate(data.generatedAt);
  const countLabel = `선별 ${data.count || (data.items || []).length}건`;
  const BG = "#090d13";
  const CARD = "#111827";
  const BORDER = "#243044";
  const INK = "#f8fafc";
  const MUTED = "#94a3b8";
  const MINT = "#3dd6b5";
  const LEMON = "#f8e473";

  const clips = items
    .map((_, i) => `<clipPath id="socCardClip${i}"><rect x="0" y="0" width="347" height="292" rx="18"/></clipPath>`)
    .join("\n    ");

  let cardSVG = "";
  items.forEach((item, i) => {
    const x = 60 + i * 367;
    const y = 276;
    const w = 347;
    const h = 292;
    const badge = SOCIAL_BADGE[item.platform] || { label: String(item.platform || "Social"), bg: "#334155", fg: "#ffffff" };
    const badgeW = Math.max(46, badge.label.length * 9 + 22);
    const author = truncate(item.author || "", 20);
    const titleLines = wrapText(item.title_ko || "", 23, 2);
    const summaryLines = wrapText(item.summary_ko || "", 32, 3);
    const likes = item.metrics?.likes > 0 ? `♥ ${item.metrics.likes.toLocaleString()}` : "";

    cardSVG += `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="18" fill="${CARD}" stroke="${BORDER}" stroke-width="1.5"/>
      <g clip-path="url(#socCardClip${i})">
        <rect x="22" y="22" width="${badgeW}" height="24" rx="6" fill="${badge.bg}"/>
        <text x="${22 + badgeW / 2}" y="38" font-size="11.5" font-weight="700" fill="${badge.fg}" text-anchor="middle">${escapeXml(badge.label)}</text>
        <text x="${22 + badgeW + 10}" y="38" font-size="13" font-weight="600" fill="${MUTED}">${escapeXml(author)}</text>
        ${renderLines(titleLines, 22, 82, 27, `font-size="19" font-weight="700" fill="${INK}" letter-spacing="-0.3"`)}
        ${renderLines(summaryLines, 22, 148, 21, `font-size="13" font-weight="500" fill="#cbd5e1"`)}
        <line x1="22" y1="${h - 48}" x2="${w - 22}" y2="${h - 48}" stroke="${BORDER}" stroke-width="1"/>
        <text x="22" y="${h - 22}" font-size="12.5" font-weight="700" fill="${MINT}">점수 ${Number(item.score || 0)}</text>
        ${likes ? `<text x="${w - 22}" y="${h - 22}" font-size="12.5" font-weight="600" fill="${LEMON}" text-anchor="end">${escapeXml(likes)}</text>` : ""}
      </g>
    </g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" font-family="${FONT_STACK}">
  <defs>${clips}</defs>
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="0" y="0" width="1200" height="4" fill="${MINT}"/>
  <text x="60" y="76" font-size="30" font-weight="700" fill="${INK}" letter-spacing="-0.6">AI위클리 · 소셜 피드</text>
  <text x="60" y="104" font-size="14" font-weight="500" fill="${MUTED}">X · Instagram · Threads · Reddit AI 인플루언서 큐레이션</text>
  <g transform="translate(${1200 - 60 - 230}, 58)">
    <rect x="0" y="0" width="230" height="36" rx="18" fill="#162032" stroke="${BORDER}" stroke-width="1"/>
    <circle cx="20" cy="18" r="4.5" fill="${MINT}"/>
    <text x="124" y="23" font-size="13" font-weight="600" fill="${INK}" text-anchor="middle">${escapeXml(dateLabel)} · ${escapeXml(countLabel)}</text>
  </g>
  <text x="60" y="186" font-size="44" font-weight="700" fill="${INK}" letter-spacing="-1.2">AI <tspan fill="${MINT}">인플루언서</tspan>의 오늘 <tspan fill="${LEMON}">한 수</tspan></text>
  <text x="60" y="230" font-size="17" font-weight="500" fill="${MUTED}">매일 골라 정리하는 실전 프롬프트 · 워크플로우 · AI 활용 팁</text>
  ${cardSVG}
  <text x="60" y="602" font-size="12" font-weight="600" fill="${MUTED}">매일 자동 수집 · 한국어 요약 · AI Weekly Social Feed</text>
  <text x="1140" y="602" font-size="12" font-weight="600" fill="${MINT}" text-anchor="end">ldk-hub.github.io/ai-weekly/social</text>
</svg>`;
}

async function writeOgAsset(svg, svgName, pngName) {
  const outSvg = path.join(PUBLIC_DIR, svgName);
  const outPng = path.join(PUBLIC_DIR, pngName);
  fs.writeFileSync(outSvg, svg, "utf8");
  console.log(`✓ wrote ${path.relative(process.cwd(), outSvg)}`);
  try {
    const sharp = require("sharp");
    await sharp(Buffer.from(svg)).png().toFile(outPng);
    console.log(`✓ wrote ${path.relative(process.cwd(), outPng)}`);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      console.log("ℹ sharp not installed — SVG only. Run: npm i -D sharp");
    } else {
      console.error(`PNG conversion failed (${pngName}):`, e.message);
    }
  }
}

async function main() {
  if (fs.existsSync(MAIN_DATA)) {
    const mainData = JSON.parse(fs.readFileSync(MAIN_DATA, "utf8"));
    await writeOgAsset(buildMainSvg(mainData), "og.svg", "og.png");
  }
  if (fs.existsSync(SOCIAL_DATA)) {
    const socialData = JSON.parse(fs.readFileSync(SOCIAL_DATA, "utf8"));
    await writeOgAsset(buildSocialSvg(socialData), "og-social.svg", "og-social.png");
  }
}

main();
