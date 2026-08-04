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
assert.strictEqual(meta.measured, 3, "stale 은 성장률 0 이라 중앙값 표본에서 빠진다");
assert.strictEqual(by.fresh.v7d, 325);
assert.strictEqual(by.fresh.v7d_estimated, true);
assert.strictEqual(by.stale.velocity_score, 0);
assert.ok(by.mid.velocity_score > by.mega.velocity_score, "21.5% 성장이 1.6% 성장을 이긴다");
assert.ok(by.fresh.velocity_score > by.mega.velocity_score, "신상 추정치가 0점으로 죽지 않는다");
assert.ok(items.every((i) => i.velocity_score <= 100));

console.log("ok — velocity 성장률 채점 6/6");
