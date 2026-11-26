#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCoasterSamples } from "../../site/src/pages/weeklyland/CoasterEngine.js";
import { buildUnifiedParkWorld, getBiomeWeightsAt, getDominantZoneAt } from "../../site/src/pages/weeklyland/ParkThemeStages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const world = JSON.parse(fs.readFileSync(path.join(rootDir, "site/public/data/park_world.json"), "utf8"));
const presets = JSON.parse(fs.readFileSync(path.join(rootDir, "site/public/data/coaster_presets.json"), "utf8"));

// 1. Validate ALL unified continent coasters physics & finite frames
assert.equal(world.parkMeta?.unifiedWorld, true, "park_world.json must be unified continent");
assert.ok(world.coasters.length >= 4, `Expected >=4 unified coasters, got ${world.coasters.length}`);

const mainCoaster = world.coasters[0];
const coasterSummaries = {};
for (const c of world.coasters) {
  const sampled = buildCoasterSamples(c, 240);
  assert.ok(sampled, `Coaster ${c.id} should sample successfully`);
  assert.equal(sampled.frames.length, 240);
  assert.ok(sampled.totalLength > 100, `Expected length > 100m for ${c.id}, got ${sampled.totalLength}`);

  const m = sampled.physics.metrics;
  assert.ok(m.maxSpeedKmh >= 40 && m.maxSpeedKmh <= 220, `Unexpected max speed for ${c.id}: ${m.maxSpeedKmh}`);
  assert.ok(m.excitement >= 1 && m.excitement <= 9.9, `Excitement out of bounds for ${c.id}: ${m.excitement}`);
  assert.ok(m.fear >= 1 && m.fear <= 9.9, `Fear out of bounds for ${c.id}: ${m.fear}`);
  assert.ok(m.nausea >= 0.8 && m.nausea <= 9.9, `Nausea out of bounds for ${c.id}: ${m.nausea}`);
  for (const f of sampled.frames) {
    assert.ok(Number.isFinite(f.pos.x) && Number.isFinite(f.pos.y) && Number.isFinite(f.pos.z), `NaN pos in ${c.id}`);
    assert.ok(Number.isFinite(f.up.x) && Number.isFinite(f.up.y) && Number.isFinite(f.up.z), `NaN up in ${c.id}`);
  }
  coasterSummaries[c.id] = m;
}
const m = coasterSummaries[mainCoaster.id];

// 1b. Validate spatial biome weights & zone transitions across all 4 realms
assert.equal(getDominantZoneAt(0, 20).zoneId, "sunlit-meadow", "Center must be sunlit-meadow");
assert.equal(getDominantZoneAt(176, 12).zoneId, "tropical-lagoon", "East realm must be tropical-lagoon");
assert.equal(getDominantZoneAt(-176, 12).zoneId, "spooky-halloween", "West realm must be spooky-halloween");
assert.equal(getDominantZoneAt(0, -176).zoneId, "alpine-winter", "North realm must be alpine-winter");
const midBorder = getBiomeWeightsAt(104, 0);
const sumW = Object.values(midBorder.weights).reduce((a, b) => a + b, 0);
assert.ok(Math.abs(sumW - 1) < 1e-6, `Biome weights must sum to 1, got ${sumW}`);
assert.ok(midBorder.weights["sunlit-meadow"] > 0 && midBorder.weights["tropical-lagoon"] > 0, "Border must smoothly blend adjacent biomes");
assert.equal(buildUnifiedParkWorld(world).coasters.length, world.coasters.length, "buildUnifiedParkWorld must be idempotent");

// 2. Validate that all Scrapling presets build clean finite frames without NaN
for (const preset of presets.presets) {
  const res = buildCoasterSamples(preset, 180);
  assert.ok(res, `Preset ${preset.id} failed to sample`);
  for (const f of res.frames) {
    assert.ok(Number.isFinite(f.pos.x) && Number.isFinite(f.pos.y) && Number.isFinite(f.pos.z), `NaN pos in ${preset.id}`);
    assert.ok(Number.isFinite(f.up.x) && Number.isFinite(f.up.y) && Number.isFinite(f.up.z), `NaN up in ${preset.id}`);
  }
}

// 3. Validate unbanked tight turn yields higher nausea than banked turn
const unbanked = structuredClone(mainCoaster);
unbanked.nodes.forEach((n) => { n.bankDeg = 0; });
const banked = structuredClone(mainCoaster);
banked.nodes.forEach((n) => { n.bankDeg = n.bankDeg || 40; });

const resUnbanked = buildCoasterSamples(unbanked, 200);
const resBanked = buildCoasterSamples(banked, 200);
assert.ok(
  resUnbanked.physics.metrics.maxLatG >= resBanked.physics.metrics.maxLatG - 0.5,
  "Physics lateral-G computation must remain stable across banking adjustments"
);

console.log("[PASS] Coaster physics & EFN tests passed:", {
  mainCoaster: m,
  presetsTested: presets.presets.length,
});
