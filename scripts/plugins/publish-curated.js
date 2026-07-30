#!/usr/bin/env node
// .tmp/04_curated.json → latest.json + 아카이브 양쪽 트리 + 인덱스 + RSS + OG.
// 주간 발행의 정식 경로. site-builder 는 이 스크립트 1콜 + 검증만 담당한다.
//
// 사용: node scripts/publish-curated.js [YYYY-MM-DD]   (기본값: 오늘)
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const CURATED = path.join(ROOT, ".tmp", "04_curated.json");
const LATEST = path.join(ROOT, "site", "public", "data", "latest.json");
const TODAY = process.argv[2] || new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(TODAY)) {
  console.error(`bad date: ${TODAY} (expected YYYY-MM-DD)`);
  process.exit(1);
}

const d = JSON.parse(fs.readFileSync(CURATED, "utf8"));
const all = [...(d.rising || []), ...(d.classic || [])];

for (const item of all) {
  if (item.needs_review || item.dropped_reason) {
    throw new Error(`publish gate violation: ${item.id}`);
  }
  try {
    const stars = execFileSync(
      "gh",
      ["api", `repos/${item.id}`, "--jq", ".stargazers_count"],
      { encoding: "utf8", env: { ...process.env, GH_HOST: "github.com" } }
    ).trim();
    const newStars = Number(stars);
    if (Number.isFinite(newStars)) {
      item.velocity_7d =
        typeof item.velocity_7d === "number" && typeof item.stars === "number"
          ? item.velocity_7d + (newStars - item.stars)
          : item.velocity_7d;
      item.stars = newStars;
    }
  } catch (e) {
    console.warn(`star resync skip (${item.id}): ${e.message.split("\n")[0]}`);
  }
}

const latest = {
  generated: TODAY,
  generated_at: TODAY,
  version: `v${TODAY.replaceAll("-", ".")}`,
  rising: d.rising,
  classic: d.classic,
};

fs.writeFileSync(LATEST, JSON.stringify(latest, null, 2));
const archiveDataPath = path.join(ROOT, "data", "archive", `${TODAY}.json`);
const archiveSitePath = path.join(ROOT, "site", "public", "data", "archive", `${TODAY}.json`);
fs.mkdirSync(path.dirname(archiveDataPath), { recursive: true });
fs.mkdirSync(path.dirname(archiveSitePath), { recursive: true });
fs.writeFileSync(archiveDataPath, JSON.stringify(latest, null, 2));
fs.writeFileSync(archiveSitePath, JSON.stringify(latest, null, 2));

// 아카이브 파일명 = 그 파일이 담은 발행분의 날짜 (자기 내용을 가리킨다).
// "직전 발행분을 새 날짜로 백업" 규약과 섞지 말 것 — 2026-07-20.json 안에
// v2026.07.13 이 들어가는 사고가 그렇게 났고, velocity 기준선이 2주로 밀렸다.
// velocity 기준선은 아카이브가 아니라 data/stars_ledger.json 이 담당한다.

// 매주 사람이 기억해야 하는 후속 단계 3개를 여기서 함께 처리한다.
for (const s of ["build-archive-index.js", "generate-rss.js", "generate-og.js"]) {
  try {
    execFileSync("node", [path.join(__dirname, "..", "core", s)], { stdio: "inherit" });
  } catch (e) {
    console.warn(`post-step failed (${s}): ${e.message.split("\n")[0]}`);
  }
}

console.log(`published ${TODAY}: rising=${d.rising.length} classic=${d.classic.length}`);
