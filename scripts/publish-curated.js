#!/usr/bin/env node
// One-shot: _workspace/04_curated.json → site/public/data/latest.json + archive
// stars 를 gh api 로 재동기화한 뒤 발행. site-builder 수동 대체용 (1회성).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const CURATED = path.join(ROOT, "_workspace", "04_curated.json");
const LATEST = path.join(ROOT, "site", "public", "data", "latest.json");
const TODAY = "2026-07-13";

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

console.log(`published: rising=${d.rising.length} classic=${d.classic.length}`);
