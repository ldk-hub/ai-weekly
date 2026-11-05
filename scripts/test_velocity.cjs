const assert = require('assert');

(async () => {
  console.log('Testing isSuspiciousVelocity logic...');
  const { isSuspiciousVelocity } = await import('../site/src/utils/velocity.js');

  // Test cases:
  // 1. null / undefined / empty
  assert.strictEqual(isSuspiciousVelocity(null), false, 'null should return false');
  assert.strictEqual(isSuspiciousVelocity(undefined), false, 'undefined should return false');
  assert.strictEqual(isSuspiciousVelocity({}), false, 'empty object should return false');

  // 2. v7d_estimated === true
  assert.strictEqual(isSuspiciousVelocity({ stars: 100, velocity_7d: 5, v7d_estimated: true }), true, 'v7d_estimated: true should trigger anomaly');

  // 3. morluto/rea anomaly (high absolute weekly growth)
  assert.strictEqual(isSuspiciousVelocity({ stars: 430812, velocity_7d: 27943 }), true, 'velocity_7d >= 10000 should trigger anomaly');
  assert.strictEqual(isSuspiciousVelocity({ currentStars: 430812, velocity: 27943 }), true, 'currentStars/velocity compatibility >= 10000 should trigger anomaly');

  // 4. Sudden spike: >50% of baseline
  // baseline = 100 - 60 = 40. ratio = 60/40 = 1.5 > 0.5
  assert.strictEqual(isSuspiciousVelocity({ stars: 100, velocity_7d: 60 }), true, 'surge > 50% baseline should trigger anomaly');

  // 5. Normal steady growth:
  // stars: 2000, velocity_7d: 50 -> baseline = 1950, ratio = 50/1950 = 0.025 <= 0.5
  assert.strictEqual(isSuspiciousVelocity({ stars: 2000, velocity_7d: 50 }), false, 'normal steady growth should not trigger anomaly');

  // 6. Zero or negative velocity:
  assert.strictEqual(isSuspiciousVelocity({ stars: 500, velocity_7d: 0 }), false, 'zero growth should not trigger anomaly');
  assert.strictEqual(isSuspiciousVelocity({ stars: 500, velocity_7d: -10 }), false, 'negative growth should not trigger anomaly');

  console.log('✅ All velocity anomaly unit tests passed!');
})();
