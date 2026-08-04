#!/usr/bin/env node
/**
 * Weekly OG image generator
 * Reads site/public/data/latest.json and generates site/og.png (1200x630)
 * featuring the top 3 rising items as cards.
 *
 * Requires: sharp (npm i -D sharp) — falls back to SVG-only output.
 */
const fs = require("fs");
const path = require("path");

const SITE_DIR = path.join(__dirname, "..", "..", "site");
const DATA_PATH = path.join(SITE_DIR, "public", "data", "latest.json");
const OUT_SVG = path.join(SITE_DIR, "public", "og.svg");
const OUT_PNG = path.join(SITE_DIR, "public", "og.png");

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

function buildSvg(data) {
  const version = data.version || "";
  const updatedAt = fmtDate(data.generated_at);
  const rising = (data.rising || []).slice(0, 3);

  // Color palette (matches site)
  const BG = "#fbfaf6";
  const INK = "#0e0e0e";
  const MUTED = "#6b6860";
  const ACCENT = "#d97757";
  const CARD = "#ffffff";
  const BORDER = "#e8e3d3";
  const PILL = "#f2efe5";
  const MINT = "#d8edd0";
  const LEMON = "#ffeca0";
  const PEACH = "#ffd8bd";

  const cardColors = [LEMON, MINT, PEACH];

  let cardSVG = "";
  rising.forEach((item, i) => {
    const x = 60 + i * 367;
    const y = 290;
    const w = 347;
    const h = 280;
    const bgC = cardColors[i] || CARD;
    const title = truncate(item.title_ko || item.id || "", 16);
    const catch_ = truncate(item.catchphrase || "", 38);
    const cat = item.category || "skill";
    const stars = fmtStars(item.stars);
    const repoOwner = (item.id || "").split("/")[0];
    const repoName = (item.id || "").split("/").slice(1).join("/");

    cardSVG += `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="20" fill="${bgC}" stroke="${INK}" stroke-width="1.5"/>
      <text x="24" y="40" font-size="11" font-weight="700" fill="${INK}" letter-spacing="2">#0${i + 1} · ${cat.toUpperCase()}</text>
      <text x="24" y="92" font-size="28" font-weight="700" fill="${INK}" letter-spacing="-0.5">${escapeXml(title)}</text>
      <text x="24" y="138" font-size="14" font-weight="500" fill="${INK}" opacity="0.85">${escapeXml(catch_)}</text>
      <text x="24" y="172" font-size="14" font-weight="500" fill="${INK}" opacity="0.85">${escapeXml(truncate(item.catchphrase || "", 70).split(",").slice(1).join(",").trim() || "")}</text>

      <g transform="translate(24, ${h - 60})">
        <text x="0" y="0" font-size="12" font-weight="600" fill="${INK}" opacity="0.7">${escapeXml(truncate(repoOwner, 14))}/${escapeXml(truncate(repoName, 14))}</text>
        <text x="0" y="22" font-size="14" font-weight="700" fill="${INK}">★ ${stars}</text>
      </g>
    </g>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0e0e0e" flood-opacity="0.10"/>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="${BG}"/>

  <!-- Header brand -->
  <text x="60" y="80" font-size="32" font-weight="700" fill="${INK}" letter-spacing="-0.8">AI위클리 · AI Weekly</text>
  <text x="60" y="108" font-size="14" font-weight="500" fill="${MUTED}">Claude Code 주간 인덱스</text>

  <!-- Version pill (right side) -->
  <g transform="translate(${1200 - 60 - 200}, 64)">
    <rect x="0" y="0" width="200" height="36" rx="18" fill="${PILL}"/>
    <text x="100" y="23" font-size="13" font-weight="600" fill="${INK}" text-anchor="middle">📅 ${escapeXml(updatedAt)} · ${escapeXml(version)}</text>
  </g>

  <!-- Main title -->
  <text x="60" y="200" font-size="48" font-weight="700" fill="${INK}" letter-spacing="-1.5">이번 주 뜨는 도구 TOP 3</text>
  <text x="60" y="245" font-size="18" font-weight="500" fill="${MUTED}">매주 월요일 자동 갱신 · ldk-hub.github.io/</text>

  <!-- Top 3 cards -->
  ${cardSVG}

  <!-- Footer -->
  <text x="60" y="${630 - 30}" font-size="12" font-weight="600" fill="${MUTED}">Made with Claude Code · 5명의 서브에이전트가 자동 큐레이션</text>
  <text x="${1200 - 60}" y="${630 - 30}" font-size="12" font-weight="600" fill="${ACCENT}" text-anchor="end">★ Star on GitHub: ldk-hub/ldk-hub.github.io</text>
</svg>`;
}

async function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error("latest.json not found at", DATA_PATH);
    process.exit(0);
  }
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const svg = buildSvg(data);
  fs.writeFileSync(OUT_SVG, svg, "utf8");
  console.log(`✓ wrote ${path.relative(process.cwd(), OUT_SVG)}`);

  // Try PNG conversion via sharp; skip if not installed
  try {
    const sharp = require("sharp");
    await sharp(Buffer.from(svg)).png().toFile(OUT_PNG);
    console.log(`✓ wrote ${path.relative(process.cwd(), OUT_PNG)}`);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      console.log("ℹ sharp not installed — SVG only. Run: npm i -D sharp");
    } else {
      console.error("PNG conversion failed:", e.message);
    }
  }
}

main();
