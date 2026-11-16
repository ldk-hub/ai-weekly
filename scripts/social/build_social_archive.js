#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DATA_SOCIAL_DIR = path.join(ROOT, "data", "social");
const PUBLIC_ARCHIVE_DIR = path.join(ROOT, "site", "public", "data", "archive");
const DATA_ARCHIVE_DIR = path.join(ROOT, "data", "archive");
const LATEST_PATH = path.join(ROOT, "site", "public", "data", "social_latest.json");

const DATE_FILE_RE = /^(\d{4}-\d{2}-\d{2})\.json$/;

function slimItem(item) {
  if (!item || typeof item !== "object") return item;
  const { text, ...rest } = item;
  return rest;
}

function countPlatforms(items) {
  const counts = {};
  for (const it of items) {
    if (!it?.platform) continue;
    counts[it.platform] = (counts[it.platform] || 0) + 1;
  }
  return counts;
}

function loadJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function buildSocialArchive(opts = {}) {
  const sourceDir = opts.sourceDir || DATA_SOCIAL_DIR;
  const publicArchiveDir = opts.publicArchiveDir || PUBLIC_ARCHIVE_DIR;
  const dataArchiveDir = opts.dataArchiveDir || DATA_ARCHIVE_DIR;
  const latestPath = opts.latestPath || LATEST_PATH;

  const dayMap = new Map();

  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir).filter((f) => DATE_FILE_RE.test(f)).sort();
    for (const f of files) {
      const date = f.replace(".json", "");
      const parsed = loadJsonSafe(path.join(sourceDir, f));
      if (!parsed || !Array.isArray(parsed.items)) continue;
      dayMap.set(date, {
        date: parsed.date || date,
        generatedAt: parsed.generatedAt || null,
        items: parsed.items,
      });
    }
  }

  // Fallback: if social_latest.json has a newer date not yet written to data/social/
  if (latestPath && fs.existsSync(latestPath)) {
    const latest = loadJsonSafe(latestPath);
    if (latest && /^\d{4}-\d{2}-\d{2}$/.test(latest.date || "") && Array.isArray(latest.items) && !dayMap.has(latest.date)) {
      dayMap.set(latest.date, {
        date: latest.date,
        generatedAt: latest.generatedAt || null,
        items: latest.items,
      });
    }
  }

  const datesAsc = [...dayMap.keys()].sort();
  const seenIds = new Set();
  const dedupedDays = [];
  let dedupedCount = 0;

  // Deduplicate oldest -> newest so each post stays on the date it first appeared
  for (const date of datesAsc) {
    const entry = dayMap.get(date);
    const items = [];
    for (const rawItem of entry.items) {
      if (!rawItem || !rawItem.id) continue;
      if (seenIds.has(rawItem.id)) {
        dedupedCount++;
        continue;
      }
      seenIds.add(rawItem.id);
      items.push(slimItem(rawItem));
    }
    if (items.length === 0) continue;
    dedupedDays.push({
      date,
      generatedAt: entry.generatedAt,
      count: items.length,
      items,
    });
  }

  fs.mkdirSync(publicArchiveDir, { recursive: true });
  if (dataArchiveDir) fs.mkdirSync(dataArchiveDir, { recursive: true });

  // Write per-day slimmed shard JSONs to site/public/data/archive/social_YYYY-MM-DD.json
  const daysDesc = [...dedupedDays].reverse();
  const activeFiles = new Set();
  const indexDays = [];
  let totalItems = 0;

  for (const day of daysDesc) {
    const fileName = `social_${day.date}.json`;
    activeFiles.add(fileName);
    const shard = {
      date: day.date,
      generatedAt: day.generatedAt,
      count: day.count,
      items: day.items,
    };
    fs.writeFileSync(path.join(publicArchiveDir, fileName), JSON.stringify(shard, null, 2));

    totalItems += day.count;
    indexDays.push({
      date: day.date,
      file: fileName,
      count: day.count,
      platforms: countPlatforms(day.items),
      generatedAt: day.generatedAt,
    });
  }

  // Remove orphaned social_YYYY-MM-DD.json shards if a day became empty
  for (const existing of fs.readdirSync(publicArchiveDir)) {
    if (/^social_\d{4}-\d{2}-\d{2}\.json$/.test(existing) && !activeFiles.has(existing)) {
      fs.unlinkSync(path.join(publicArchiveDir, existing));
    }
  }

  const indexPayload = {
    updated_at: daysDesc[0]?.generatedAt || new Date().toISOString(),
    total_days: indexDays.length,
    total_items: totalItems,
    days: indexDays,
  };

  const indexJson = JSON.stringify(indexPayload, null, 2);
  fs.writeFileSync(path.join(publicArchiveDir, "social_index.json"), indexJson);
  if (dataArchiveDir) {
    fs.writeFileSync(path.join(dataArchiveDir, "social_index.json"), indexJson);
  }

  return {
    total_days: indexDays.length,
    total_items: totalItems,
    deduped_count: dedupedCount,
    days: indexDays,
  };
}

module.exports = { slimItem, countPlatforms, buildSocialArchive };

if (require.main === module) {
  const res = buildSocialArchive();
  console.log(`[social:archive] ${res.total_days}일 · 총 ${res.total_items}건 (중복 제거 ${res.deduped_count}건) → site/public/data/archive/social_index.json`);
}
