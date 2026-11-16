const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { slimItem, countPlatforms, buildSocialArchive } = require("./build_social_archive");

// 1. slimItem strips raw text while preserving UI fields
const slim = slimItem({
  id: "x:1",
  platform: "x",
  author: "@tester",
  text: "very long raw original text".repeat(50),
  title_ko: "테스트 제목",
  summary_ko: "테스트 요약",
  tags: ["AI"],
  score: 80,
});
assert.strictEqual("text" in slim, false);
assert.strictEqual(slim.title_ko, "테스트 제목");

// 2. countPlatforms aggregates correctly
assert.deepStrictEqual(
  countPlatforms([{ platform: "x" }, { platform: "x" }, { platform: "instagram" }]),
  { x: 2, instagram: 1 },
);

// 3. buildSocialArchive deduplicates oldest -> newest & sorts index newest -> oldest
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiw-social-test-"));
try {
  const sourceDir = path.join(tmpDir, "data_social");
  const publicArchiveDir = path.join(tmpDir, "public_archive");
  const dataArchiveDir = path.join(tmpDir, "data_archive");
  fs.mkdirSync(sourceDir, { recursive: true });

  fs.writeFileSync(
    path.join(sourceDir, "2026-11-12.json"),
    JSON.stringify({
      date: "2026-11-12",
      generatedAt: "2026-11-12T05:00:00.000Z",
      items: [
        { id: "ig:1", platform: "instagram", author: "@a", text: "raw1", title_ko: "첫째날1", summary_ko: "요약1", tags: ["AI"], score: 80 },
        { id: "x:1", platform: "x", author: "@b", text: "raw2", title_ko: "첫째날2", summary_ko: "요약2", tags: ["AI"], score: 75 },
      ],
    }),
  );
  fs.writeFileSync(
    path.join(sourceDir, "2026-11-13.json"),
    JSON.stringify({
      date: "2026-11-13",
      generatedAt: "2026-11-13T05:00:00.000Z",
      items: [
        { id: "ig:1", platform: "instagram", author: "@a", text: "raw1_dup", title_ko: "중복항목", summary_ko: "요약1", tags: ["AI"], score: 85 },
        { id: "th:1", platform: "threads", author: "@c", text: "raw3", title_ko: "둘째날1", summary_ko: "요약3", tags: ["AI"], score: 70 },
      ],
    }),
  );

  const res = buildSocialArchive({ sourceDir, publicArchiveDir, dataArchiveDir, latestPath: path.join(tmpDir, "missing.json") });
  assert.strictEqual(res.total_days, 2);
  assert.strictEqual(res.total_items, 3);
  assert.strictEqual(res.deduped_count, 1);
  assert.strictEqual(res.days[0].date, "2026-11-13");
  assert.strictEqual(res.days[0].count, 1);
  assert.strictEqual(res.days[1].date, "2026-11-12");
  assert.strictEqual(res.days[1].count, 2);

  const day13 = JSON.parse(fs.readFileSync(path.join(publicArchiveDir, "social_2026-11-13.json"), "utf8"));
  assert.strictEqual(day13.items.length, 1);
  assert.strictEqual(day13.items[0].id, "th:1");
  assert.strictEqual("text" in day13.items[0], false);

  const idx = JSON.parse(fs.readFileSync(path.join(publicArchiveDir, "social_index.json"), "utf8"));
  assert.strictEqual(idx.total_days, 2);
  assert.strictEqual(idx.total_items, 3);
  assert.strictEqual(idx.days[0].file, "social_2026-11-13.json");
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log("✅ build_social_archive.test.js 통과");
