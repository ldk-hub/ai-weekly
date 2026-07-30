#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ARCHIVE_DIR = path.join(__dirname, "..", "..", "site", "public", "data", "archive");
if (!fs.existsSync(ARCHIVE_DIR)) {
  console.error("archive dir not found:", ARCHIVE_DIR);
  process.exit(0);
}

const files = fs.readdirSync(ARCHIVE_DIR)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .reverse();

const archives = [];
for (const f of files) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, f), "utf8"));
    archives.push({
      file: f,
      version: d.version || f.replace(".json", ""),
      generated_at: d.generated_at || null,
      rising_count: (d.rising || []).length,
      classic_count: (d.classic || []).length,
    });
  } catch (e) {
    console.warn("skip", f, e.message);
  }
}

fs.writeFileSync(
  path.join(ARCHIVE_DIR, "index.json"),
  JSON.stringify({ archives }, null, 2),
  "utf8"
);
console.log(`wrote archive index with ${archives.length} entries`);
