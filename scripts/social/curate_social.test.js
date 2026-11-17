const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { popularity, rank, qualityIssues, loadRecentCuratedIds, validate } = require("./curate_social");

assert.strictEqual(popularity({}), 0);
assert.ok(popularity({ likes: 10000, reposts: 1000 }) > popularity({ likes: 100 }));
assert.ok(popularity({ likes: 1e9 }) <= 100);

const items = Array.from({ length: 30 }, (_, i) => ({ id: String(i), relevance: i, metrics: { likes: i * 10 } }));
const r = rank(items, 20);
assert.strictEqual(r.length, 20);
assert.strictEqual(r[0].id, "29");
assert.ok(r.every((x, i) => i === 0 || r[i - 1].score >= x.score));

const fact = { id: "t1", text: "Prompt engineering guide for Claude Code agents and workflows." };
const good = { id: "t1", title_ko: "클로드 코드 프롬프트 가이드", summary_ko: "에이전트 워크플로우 설계 팁 요약.", tags: ["프롬프트"], relevance: 85 };
assert.deepStrictEqual(qualityIssues(good, fact), []);
assert.ok(qualityIssues({ ...good, title_ko: "English only title" }, fact).includes("title_ko 미번역"));
assert.ok(qualityIssues({ ...good, relevance: 20 }, fact).some((s) => s.includes("relevance")));
assert.ok(qualityIssues({ ...good, tags: [] }, fact).includes("tags 누락"));

// loadRecentCuratedIds excludes today and collects prior archive IDs
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiw-curate-test-"));
try {
  fs.writeFileSync(path.join(tmpDir, "2026-11-12.json"), JSON.stringify({ items: [{ id: "x:1" }, { id: "ig:1" }] }));
  fs.writeFileSync(path.join(tmpDir, "2026-11-13.json"), JSON.stringify({ items: [{ id: "th:1" }] }));
  const recent = loadRecentCuratedIds(tmpDir, "2026-11-13");
  assert.strictEqual(recent.has("x:1"), true);
  assert.strictEqual(recent.has("ig:1"), true);
  assert.strictEqual(recent.has("th:1"), false);

  // validate rejects item already curated within prior 7 days
  const candFile = path.join(tmpDir, "candidates.json");
  const latestFile = path.join(tmpDir, "latest.json");
  const candFact = { id: "x:1", platform: "x", author: "@a", url: "https://x.com/a/status/1", text: "Prompt engineering guide." };
  fs.writeFileSync(candFile, JSON.stringify({ posts: [candFact] }));
  fs.writeFileSync(latestFile, JSON.stringify({
    date: "2026-11-13",
    items: [{ ...candFact, title_ko: "프롬프트 가이드", summary_ko: "프롬프트 요약 문장입니다.", tags: ["프롬프트"], relevance: 85 }],
  }));
  const origExit = process.exit;
  let exitCode = 0;
  process.exit = (code) => { exitCode = code; throw new Error("EXIT"); };
  try {
    validate(latestFile, { candidatesFile: candFile, archiveDir: tmpDir });
    assert.fail("7일 중복 항목은 validate 를 통과하면 안 됨");
  } catch (e) {
    if (e.message !== "EXIT") throw e;
    assert.strictEqual(exitCode, 1);
  } finally {
    process.exit = origExit;
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log("✅ curate_social.test.js 통과");
