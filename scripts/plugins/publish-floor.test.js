#!/usr/bin/env node
// node scripts/plugins/publish-floor.test.js
// collect.js 의 MIN_PUBLISH_STARS 하한선이 scoreVelocity **뒤**에 있어야 하는 이유를 고정한다.
const assert = require("assert");
const { scoreVelocity } = require("../stars/build-stars-ledger");

const MIN_PUBLISH_STARS = 500;
const pool = () => [
  // 실체 없는 신상 — growth_rate 가 1 로 포화해 velocity 만점을 받는다
  { id: "junk/a", stars: 1, created_days_ago: 2 },
  { id: "junk/b", stars: 2, created_days_ago: 3 },
  { id: "junk/c", stars: 8, created_days_ago: 5 },
  // 하한선 경계: 377★ tokentab 드로퍼는 컷, 600★ 신상은 통과
  { id: "cut/tokentab-like", stars: 377, created_days_ago: 4 },
  { id: "keep/newcomer", stars: 600, created_days_ago: 6 },
  // 원장 기준선이 있는 하한선 미달 리포 — 중앙값 이동의 실제 원인.
  // scoreVelocity 는 measured.length >= 5 면 실측분만으로 중앙값을 내므로, 추정분(신상)을
  // 빼도 중앙값은 안 움직인다. 실제 2026-08-31 풀도 measured 58→55 로 줄며 이동했다.
  { id: "tiny/measured-a", stars: 120, v7d: 100, v7d_estimated: false },
  { id: "tiny/measured-b", stars: 50, v7d: 40, v7d_estimated: false },
  { id: "tiny/measured-c", stars: 150, v7d: 130, v7d_estimated: false },
  // 기성 리포 — 원장 실측 경로
  { id: "big/x", stars: 5000, v7d: 250, v7d_estimated: false },
  { id: "big/y", stars: 9000, v7d: 300, v7d_estimated: false },
  { id: "big/z", stars: 20000, v7d: 400, v7d_estimated: false },
  { id: "big/w", stars: 1500, v7d: 120, v7d_estimated: false },
  { id: "big/v", stars: 800, v7d: 40, v7d_estimated: false },
];

// 1) 하한선이 겨냥하는 병리: 1★ 신상이 성장률 상한 → velocity 만점
const scored = pool();
scoreVelocity(scored);
const junk = scored.find((c) => c.id === "junk/a");
assert.strictEqual(junk.growth_rate, 1, "1★ 신상은 growth_rate 가 1 로 포화한다");
assert.strictEqual(junk.velocity_score, 100, "그 결과 velocity 만점 — 20000★ 리포와 동일");

// 2) 점수 산정 **전에** 걸러내면 코호트 중앙값이 움직여 전 항목 점수가 오염된다.
//    그래서 collect.js 는 scoreVelocity 뒤에서 필터링한다.
const after = pool();
const metaAfter = scoreVelocity(after);
const before = pool().filter((c) => c.stars >= MIN_PUBLISH_STARS);
const metaBefore = scoreVelocity(before);
assert.notStrictEqual(
  metaAfter.median_growth_rate,
  metaBefore.median_growth_rate,
  "선(先)필터는 중앙값을 바꾼다 — 하한선을 scoreVelocity 앞으로 옮기면 안 되는 이유"
);
const survivor = (list) => list.find((c) => c.id === "big/x").velocity_score;
assert.notStrictEqual(survivor(after), survivor(before), "무관한 기성 리포의 점수까지 흔들린다");

// 3) 선택한 하한선이 잡음만 자른다
const kept = after.filter((c) => c.stars >= MIN_PUBLISH_STARS).map((c) => c.id);
assert.ok(kept.includes("keep/newcomer"), "600★ 신상은 남는다 — 나이로 자르지 않는다");
assert.ok(!kept.includes("cut/tokentab-like"), "377★ (tokentab 규모) 은 잘린다");
assert.ok(!kept.some((id) => id.startsWith("junk/")), "실체 없는 신상은 전부 잘린다");
assert.ok(!kept.some((id) => id.startsWith("tiny/")), "원장 있는 하한선 미달도 발행에서 제외된다");

console.log("publish-floor: 3 assertions groups ok");
