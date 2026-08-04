#!/usr/bin/env node
// node scripts/stars/build-stars-ledger.test.js
const assert = require("assert");
const { estimateV7d, growthRate, scoreVelocity } = require("./build-stars-ledger");

// 첫 관측 추정: 신상만, 주간 환산은 stars 를 넘지 않는다
assert.strictEqual(estimateV7d(1000, 14), 500);
assert.strictEqual(estimateV7d(500, 3), 500, "7일 미만이면 누적 stars 전량이 주간 획득분");
assert.strictEqual(estimateV7d(1000, 61), null, "60일 초과는 추정 근거 없음");
assert.strictEqual(estimateV7d(1000, null), null);

// 성장률: 규모가 아니라 비율
assert.ok(growthRate(1000, 200) > growthRate(200000, 3000), "소형 고성장 > 거대 저성장");
assert.strictEqual(growthRate(1000, 0), 0);
assert.strictEqual(growthRate(1000, null), 0);
assert.strictEqual(growthRate(1, 7), 1, "1★ 신상이 700% 로 튀지 않고 100% 에서 멈춘다");

// 거대 리포 저성장이 소형 고성장에 밀린다 — 이 역전이 이번 변경의 목적
const items = [
  { id: "mega", stars: 224356, v7d: 3539 }, //  1.6%/week
  { id: "mid", stars: 37958, v7d: 6718 }, // 21.5%/week
  { id: "fresh", stars: 974, v7d: null, created_days_ago: 21 }, // 추정
  { id: "stale", stars: 50000, v7d: null, created_days_ago: 400 }, // 추정 불가
];
const meta = scoreVelocity(items);
const by = Object.fromEntries(items.map((i) => [i.id, i]));

assert.ok(meta.median_growth_rate > 0);
assert.strictEqual(meta.measured, 2, "실측 2건(mega·mid)만 — 추정·성장률0 은 중앙값 표본 밖");
assert.strictEqual(by.fresh.v7d, 325);
assert.strictEqual(by.fresh.v7d_estimated, true);
assert.strictEqual(by.stale.velocity_score, 0);
assert.ok(by.mid.velocity_score > by.mega.velocity_score, "고성장이 저성장을 이긴다");
assert.ok(by.fresh.velocity_score > by.mega.velocity_score, "신상 추정치가 0점으로 죽지 않는다");
assert.ok(items.every((i) => i.velocity_score <= 100));

// 중앙값은 실측분만 — 추정치가 섞이면 기성 리포가 전부 0점 근처로 눌린다 (2026-08-04 회귀)
const flooded = [
  { id: "mega", stars: 224356, v7d: 3539 },
  { id: "mid", stars: 37958, v7d: 6718 },
  ...Array.from({ length: 50 }, (_, n) => ({
    id: `new${n}`,
    stars: 5 + n,
    v7d: null,
    created_days_ago: 3,
  })),
];
const fm = scoreVelocity(flooded);
assert.strictEqual(fm.cohort, "fallback_all", "실측 5건 미만이면 전체로 폴백");
const flat = [
  ...Array.from({ length: 6 }, (_, n) => ({ id: `m${n}`, stars: 50000, v7d: 500 + n * 50 })),
  ...Array.from({ length: 50 }, (_, n) => ({ id: `n${n}`, stars: 5, v7d: null, created_days_ago: 2 })),
];
const fm2 = scoreVelocity(flat);
assert.strictEqual(fm2.cohort, "measured");
assert.ok(fm2.median_growth_rate < 0.1, "신상 50건이 중앙값을 100% 로 끌어올리지 못한다");
assert.ok(flat.find((i) => i.id === "m0").velocity_score > 10, "기성 리포가 0점으로 눌리지 않는다");

console.log("ok — velocity 성장률 채점 11/11");
