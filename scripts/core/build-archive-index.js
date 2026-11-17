#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ARCHIVE_DIRS = [
  path.join(__dirname, "..", "..", "site", "public", "data", "archive"),
  path.join(__dirname, "..", "..", "data", "archive"),
];

const DATE_JSON_RE = /^\d{4}-\d{2}-\d{2}\.json$/;

// 양쪽 아카이브 디렉터리 간 누락된 스냅샷을 상호 동기화한다.
for (const dir of ARCHIVE_DIRS) fs.mkdirSync(dir, { recursive: true });
for (const srcDir of ARCHIVE_DIRS) {
  for (const dstDir of ARCHIVE_DIRS) {
    if (srcDir === dstDir) continue;
    for (const f of fs.readdirSync(srcDir).filter(n => DATE_JSON_RE.test(n))) {
      const dstFile = path.join(dstDir, f);
      if (!fs.existsSync(dstFile)) {
        fs.copyFileSync(path.join(srcDir, f), dstFile);
      }
    }
  }
}

const sourceDir = ARCHIVE_DIRS[0];
const files = fs.readdirSync(sourceDir)
  .filter(f => DATE_JSON_RE.test(f))
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
