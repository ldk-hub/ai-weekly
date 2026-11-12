const assert = require("assert");
const { popularity, rank, qualityIssues } = require("./curate_social");

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

console.log("✅ curate_social.test.js 통과");
