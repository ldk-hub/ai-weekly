#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ARCHIVE_DIRS = [
  path.join(__dirname, "..", "..", "site", "public", "data", "archive"),
  path.join(__dirname, "..", "..", "data", "archive"),
];

const sourceDir = ARCHIVE_DIRS[0];
if (!fs.existsSync(sourceDir)) {
  console.error("archive dir not found:", sourceDir);
  process.exit(0);
}

const files = fs.readdirSync(sourceDir)
  .filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
  .sort()
  .reverse();

const archives = [];
for (const f of files) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(sourceDir, f), "utf8"));
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

for (const dir of ARCHIVE_DIRS) {
  if (fs.existsSync(dir)) {
    fs.writeFileSync(
      path.join(dir, "index.json"),
      JSON.stringify({ archives }, null, 2),
      "utf8"
    );
  }
}
console.log(`wrote archive index with ${archives.length} entries to both directories`);
