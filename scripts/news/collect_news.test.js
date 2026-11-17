#!/usr/bin/env node
// scripts/news/collect_news.test.js
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { extractDynamicSeeds, RADAR_STOPWORDS, inWindow, loadRecentlyPublished } = require("./collect_news");

console.log("🧪 [collect_news.test.js] 단위 테스트 시작...");

// 1. 빈 입력값 안전성 검증
assert.deepStrictEqual(extractDynamicSeeds([]), [], "빈 배열 입력 시 빈 배열 반환");
assert.deepStrictEqual(extractDynamicSeeds(null), [], "null 입력 시 빈 배열 반환");
assert.deepStrictEqual(extractDynamicSeeds(undefined), [], "undefined 입력 시 빈 배열 반환");

// 2. 불용어(Stopwords) 필터링 검증
const stopwordCandidates = [
  { title: "GitHub and Google with OpenAI Python LLM", body: "New AI model agent released today." },
  { title: "Linux Microsoft tool for Claude and Gemini", body: "Check out this free open source server." }
];
assert.deepStrictEqual(
  extractDynamicSeeds(stopwordCandidates),
  [],
  "일반 불용어(github, google, llm, ai 등)만 존재하는 경우 시드로 추출되지 않아야 함"
);

// 3. 날짜 및 순수 숫자 포맷 필터링 검증
const dateCandidates = [
  { title: "Weekly report 2026-11-02", body: "Issue numbers 12345-6789 and 2026-10-31 details." }
];
assert.deepStrictEqual(
  extractDynamicSeeds(dateCandidates),
  [],
  "YYYY-MM-DD 날짜 형식이나 숫자 패턴은 시드로 추출되지 않아야 함"
);

// 4. CamelCase 및 하이픈 결합 신조어 추출 및 빈도 정렬 검증
const techCandidates = [
  { title: "Show HN: OmniDiff - Super fast Git diff tool", body: "OmniDiff parses binary files seamlessly." },
  { title: "MIT SwaT: Swarm Telepathy between models", body: "SwaT transfers KV cache directly." },
  { title: "DeepSeek releases dsh-superagent-prototype", body: "The dsh-superagent-prototype is modular." },
  { title: "DeepSeek team expands research on dsh-superagent-prototype", body: "Further benchmarks on dsh-superagent-prototype." },
  { title: "Another discussion on OmniDiff", body: "OmniDiff is written in Rust." }
];

const extracted = extractDynamicSeeds(techCandidates, 3);
console.log("✓ 추출된 상위 시드:", extracted);

// 빈도 검증:
// dsh-superagent-prototype: 3회
// OmniDiff: 3회
// SwaT: 2회
assert.strictEqual(extracted.length, 3, "최대 3개 시드 반환");
assert.ok(extracted.includes("dsh-superagent-prototype"), "dsh-superagent-prototype 포함");
assert.ok(extracted.includes("OmniDiff"), "OmniDiff 포함");
assert.ok(extracted.includes("SwaT"), "SwaT 포함");

// 5. maxSeeds 상한 제한 검증
const max1 = extractDynamicSeeds(techCandidates, 1);
assert.strictEqual(max1.length, 1, "maxSeeds 1개 요청 시 정확히 1개 반환");

// 6. inWindow 시간창 및 날짜 누락 차단 검증
assert.strictEqual(inWindow("", "instagram"), false, "빈 날짜는 시간창 통과 금지");
assert.strictEqual(inWindow("not-a-date", "x"), false, "잘못된 날짜는 시간창 통과 금지");
assert.strictEqual(inWindow(new Date().toISOString(), "threads"), true, "현재 시각은 24시간 창 통과");
assert.strictEqual(inWindow(new Date(Date.now() - 48 * 3600 * 1000).toISOString(), "threads"), false, "48시간 전 게시물은 24시간 창 차단");

// 7. loadRecentlyPublished 양쪽 아카이브 디렉터리 합산 검증
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aiw-news-repeat-"));
try {
  const dirA = path.join(tmpRoot, "a");
  const dirB = path.join(tmpRoot, "b");
  fs.mkdirSync(dirA);
  fs.mkdirSync(dirB);
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  fs.writeFileSync(path.join(dirA, `news_${todayStr}.json`), JSON.stringify({ news: [{ url: "https://example.com/a" }] }));
  fs.writeFileSync(path.join(dirB, `news_${todayStr}.json`), JSON.stringify({ news: [{ url: "https://example.com/b" }] }));
  const seen = loadRecentlyPublished([dirA, dirB]);
  assert.strictEqual(seen.has("example.com/a"), true);
  assert.strictEqual(seen.has("example.com/b"), true);
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

console.log("✅ [collect_news.test.js] 모든 단위 테스트 통과 (PASS)");
