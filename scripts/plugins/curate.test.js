#!/usr/bin/env node
// node scripts/plugins/curate.test.js
const assert = require("assert");
const { curate, toItem, readmeSimilarity, qualityScore, buzzScore, recencyScore, normalizeName, MAX_PER_OWNER } = require("./curate");

const base = (over) => ({
  id: "o/r",
  name: "r",
  owner: "o",
  url: "https://github.com/o/r",
  description: "a claude code skill that does something useful for developers",
  topics: ["claude-code", "skill", "ai", "agent", "tool"],
  stars: 800,
  license: "MIT",
  created_days_ago: 10,
  pushed_days_ago: 2,
  velocity_score: 100,
  readme_len: 2000,
  readme_sections: 5,
  readme_install: true,
  readme_examples: 3,
  readme_media: true,
  root_names: ["README.md", "tests", ".github", "src"],
  hn: [],
  ...over,
});

// quality 즉시컷 — 스펙의 세 조건이 실제로 발행을 막는다
assert.strictEqual(qualityScore(base({ readme_len: 150 })).score, 0);
assert.strictEqual(qualityScore(base({ root_names: ["README.md"] })).score, 0);
assert.strictEqual(qualityScore(base({ license: null, stars: 99 })).score, 0);
assert.ok(qualityScore(base({ license: null, stars: 100 })).score > 0, "stars 100 이상은 라이선스 없어도 통과");

// quality 는 stars 를 재사용하지 않는다 — 별 많은 빈 리포가 만점받던 회귀 방지
assert.ok(qualityScore(base({ stars: 200000, readme_len: 300, readme_sections: 0, readme_install: false, readme_examples: 0, readme_media: false, root_names: ["README.md", "a.js"] })).score < 50);

// recency 는 마지막 커밋 기준 — 방치된 신상이 만점받던 회귀 방지
assert.strictEqual(recencyScore(base({ pushed_days_ago: 60 })), 0);
assert.strictEqual(recencyScore(base({ pushed_days_ago: 0 })), 100);

// buzz 는 engagement 로그 가중 — 언급 유무 이진값이 아니다
assert.strictEqual(buzzScore(base({ hn: [] })), 0);
assert.ok(buzzScore(base({ hn: [{ points: 3, comments: 0 }] })) < buzzScore(base({ hn: [{ points: 300, comments: 120 }] })));

// 이름 정규화: 파생 접미사와 생태계 공통 꼬리를 떼고 원본과 충돌시킨다
assert.strictEqual(normalizeName("ponytail-improved"), normalizeName("ponytail"));
assert.strictEqual(normalizeName("foo_v2"), normalizeName("foo"));

// 재업로드 컷: 같은 이름의 원본이 풀에 있으면 stars 높은 쪽만 남는다
{
  const { rising, pending } = curate([
    base({ id: "orig/ponytail", name: "ponytail", owner: "orig", stars: 95000 }),
    base({ id: "copy/ponytail-improved", name: "ponytail-improved", owner: "copy", stars: 586 }),
  ]);
  assert.deepStrictEqual(rising.map((r) => r.id), ["orig/ponytail"]);
  assert.match(pending.find((p) => p.id === "copy/ponytail-improved").reason, /원본 채택/);
}

// 원본이 풀에 없어도 파생 이름은 자동 발행하지 않는다 (수동 검토로 넘김)
{
  const { rising, pending } = curate([base({ id: "copy/openclaude-improved", name: "openclaude-improved", owner: "copy" })]);
  assert.strictEqual(rising.length, 0);
  assert.match(pending[0].reason, /파생 이름/);
}

// owner 상한: 한 owner 가 카테고리를 갈아타도 섹션을 잠식하지 못한다
{
  const cats = [
    { description: "mcp server for claude", topics: ["mcp"] },
    { description: "agent orchestration", topics: ["agent"] },
    { description: "a claude skill pack", topics: ["skill"] },
    { description: "harness for eval", topics: ["harness"] },
  ];
  const { rising, pending } = curate(
    cats.map((c, i) => base({ id: `dup/r${i}`, name: `r${i}`, owner: "dup", stars: 900 - i, ...c }))
  );
  assert.strictEqual(rising.filter((r) => r.owner === "dup").length, MAX_PER_OWNER);
  assert.strictEqual(pending.filter((p) => /owner 상한/.test(p.reason)).length, cats.length - MAX_PER_OWNER);
}

// classic 은 stars≥500 · 60일+ · 30일 내 커밋 세 조건 모두, rising 과 겹치면 rising 우선
{
  const old = base({ id: "old/lib", name: "lib", created_days_ago: 400, velocity_score: 40, stars: 90000 });
  assert.strictEqual(curate([old]).classic.length, 1);
  assert.strictEqual(curate([base({ ...old, pushed_days_ago: 45 })]).classic.length, 0, "1년 방치는 classic 아님");
  assert.strictEqual(curate([base({ ...old, stars: 499 })]).classic.length, 0);
  assert.strictEqual(curate([base({ ...old, created_days_ago: 20, velocity_score: 95 })]).rising.length, 1, "신상이면 rising 우선");
  assert.strictEqual(curate([base({ ...old, created_days_ago: 20 })]).pending[0].reason, "임계치 미달", "신상이라도 성장 근거 없으면 보류");
}

// 단일출처 rising 은 폭발 성장(velocity≥90)일 때만 통과하고 low_confidence 로 표기된다
{
  const weak = base({ velocity_score: 85, created_days_ago: 5 });
  assert.strictEqual(curate([weak]).rising.length, 0);
  assert.strictEqual(curate([weak]).pending[0].reason, "단일출처 + score<70");
  const strong = curate([base({ velocity_score: 95, created_days_ago: 5 })]).rising[0];
  assert.strictEqual(strong.low_confidence, true);
}

// buzz 는 플랫폼 수에 따라 가산되고, 단일 플랫폼은 가산이 없다
{
  const one = base({ mentions: [{ platform: "hn", points: 10, comments: 5 }] });
  const two = base({ mentions: [{ platform: "hn", points: 10, comments: 5 }, { platform: "reddit", points: 0, comments: 0 }] });
  assert.ok(buzzScore(two) - buzzScore(one) >= 10, "2개 플랫폼이면 +10");
  const three = base({ mentions: [...two.mentions, { platform: "devto", points: 0, comments: 0 }] });
  assert.ok(buzzScore(three) - buzzScore(one) >= 15, "3개 플랫폼이면 +15");
}

// 다중출처는 단일출처 강등을 면한다 — 강등 규칙이 sources 를 실제로 본다는 확인
{
  const weak = { velocity_score: 85, created_days_ago: 5 };
  assert.strictEqual(curate([base(weak)]).rising.length, 0);
  const withBuzz = curate([base({ ...weak, mentions: [{ platform: "reddit", points: 40, comments: 12 }] })]).rising;
  assert.strictEqual(withBuzz.length, 1);
  assert.deepStrictEqual(withBuzz[0].sources, ["github", "reddit"]);
  assert.strictEqual(withBuzz[0].low_confidence, false);
}

// README 최소해시 추정기 — 동일 문서는 1, 무관 문서는 0 근처
{
  const a = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.strictEqual(readmeSimilarity(a, a), 1);
  assert.ok(readmeSimilarity(a, [91, 92, 93, 94, 95, 96, 97, 98]) < 0.2);
  assert.strictEqual(readmeSimilarity(a, []), 0);
}

// description 완전 동일 → 재업로드로 보고 stars 높은 쪽만 (README 를 새로 쓴 사본을 잡는 실제 신호)
{
  const desc = "Makes your AI agent think like the laziest senior dev in the room, never over-engineer";
  const { rising, pending } = curate([
    base({ id: "orig/tool", name: "tool", owner: "orig", stars: 95000, description: desc }),
    base({ id: "copy/other-name", name: "othername", owner: "copy", stars: 500, description: desc }),
  ]);
  assert.deepStrictEqual(rising.map((r) => r.id), ["orig/tool"]);
  assert.match(pending.find((p) => p.id === "copy/other-name").reason, /description 완전 동일/);
}

// 사이트가 읽는 필드 계약 — 하나라도 빠지면 카드가 조용히 빈다
{
  const item = toItem(curate([base()]).rising[0]);
  for (const k of ["id", "name", "owner", "title_ko", "official_url", "repo_url", "category", "score", "trend_score",
    "stars", "velocity_7d", "velocity_score", "growth_rate", "v7d_estimated", "source_count", "sources", "evidence",
    "status", "catchphrase", "summary_ko", "key_features", "use_case", "install_hint", "badge", "badges", "tags", "thumbnail_url"]) {
    assert.ok(k in item, `latest.json 필드 누락: ${k}`);
  }
  assert.ok(item.badges.includes("🆕 신상"), "생성 30일 이내는 신상 배지");
}

console.log("curate.test.js — all assertions passed");
