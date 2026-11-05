/**
 * Velocity anomaly detection guard
 * Flags sudden suspicious growth (e.g. morluto/rea) or estimated figures.
 */
export function isSuspiciousVelocity(item) {
  if (!item) return false;
  if (item.v7d_estimated === true) return true;
  const stars = Number(item.stars ?? item.currentStars) || 0;
  const v7d = Number(item.velocity_7d ?? item.weekly_stars ?? item.velocity) || 0;
  if (v7d <= 0) return false;
  if (v7d >= 10000) return true;
  const baseline = Math.max(stars - v7d, 1);
  return (v7d / baseline) > 0.5;
}
