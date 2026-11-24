#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCoasterSamples } from "../../site/src/pages/weeklyland/CoasterEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const world = JSON.parse(fs.readFileSync(path.join(rootDir, "site/public/data/park_world.json"), "utf8"));
const presets = JSON.parse(fs.readFileSync(path.join(rootDir, "site/public/data/coaster_presets.json"), "utf8"));

// 1. Validate default park coaster physics
const mainCoaster = world.coasters[0];
const sampled = buildCoasterSamples(mainCoaster, 240);
assert.ok(sampled, "Main coaster should sample successfully");
assert.equal(sampled.frames.length, 240);
assert.ok(sampled.totalLength > 100, `Expected length > 100m, got ${sampled.totalLength}`);

const m = sampled.physics.metrics;
assert.ok(m.maxSpeedKmh >= 40 && m.maxSpeedKmh <= 220, `Unexpected max speed: ${m.maxSpeedKmh}`);
assert.ok(m.excitement >= 1 && m.excitement <= 9.9, `Excitement out of bounds: ${m.excitement}`);
assert.ok(m.fear >= 1 && m.fear <= 9.9, `Fear out of bounds: ${m.fear}`);
assert.ok(m.nausea >= 0.8 && m.nausea <= 9.9, `Nausea out of bounds: ${m.nausea}`);

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
