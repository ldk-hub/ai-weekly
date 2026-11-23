#!/usr/bin/env node
/**
 * Sanctuary Spatial Audio Manifest & Asset Builder
 *
 * Usage:
 *   node scripts/sanctuary/build_audio.mjs --dry-run
 *   ELEVENLABS_API_KEY=... node scripts/sanctuary/build_audio.mjs
 *
 * Validates `site/public/sanctuary-assets/audio/audio_manifest.json` and optionally generates
 * drop-in MP3 sound effects via ElevenLabs Sound Generation API. Without API keys,
 * preserves clean procedural Web Audio synths (`url: null`).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const AUDIO_DIR = path.join(ROOT, "site", "public", "sanctuary-assets", "audio");
const MANIFEST_PATH = path.join(AUDIO_DIR, "audio_manifest.json");

const TRACK_PROMPTS = {
  bgm_waltz: { prompt: "Nostalgic 1990s mechanical theme park carousel fairground organ waltz loop, warm pipes", durationSeconds: 16 },
  ambient_crowd: { prompt: "Gentle distant amusement park crowd chatter and cheerful boardwalk ambience loop", durationSeconds: 12 },
  ambient_rain: { prompt: "Soft steady summer rain falling on pavement and umbrellas in an outdoor park, loopable", durationSeconds: 10 },
  sfx_click: { prompt: "Crisp tactile retro beige UI plastic bevel button click sound", durationSeconds: 0.5 },
  sfx_place: { prompt: "Satisfying wooden-metallic isometric theme park attraction thud placement sound", durationSeconds: 0.7 },
  sfx_bulldoze: { prompt: "Quick retro construction crumble demolish crunch sound effect", durationSeconds: 0.8 },
  sfx_cash: { prompt: "Classic mechanical cash register coin ding cha-ching sound effect", durationSeconds: 0.8 },
  sfx_pop: { prompt: "Light rubber helium balloon pop sound", durationSeconds: 0.5 },
  sfx_firework: { prompt: "Ascending skyrocket whistle followed by crisp sparkling firework burst", durationSeconds: 2.2 },
  sfx_chainlift: { prompt: "Mechanical steel ratchet chain lift clack-clack climbing roller coaster hill", durationSeconds: 1.2 },
  sfx_scream: { prompt: "Joyful excited roller coaster riders cheering and whooping on drop", durationSeconds: 1.5 },
  sfx_breakdown: { prompt: "Short mechanical gear sputter and gentle descending alert chime", durationSeconds: 1.0 },
  sfx_repair: { prompt: "Metallic wrench ratchet tighten followed by bright positive chime", durationSeconds: 1.0 },
  sfx_award: { prompt: "Triumphant short brass park award trophy fanfare", durationSeconds: 2.0 },
};

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const isStrict = args.has("--strict");

async function generateElevenLabsClip(trackId, spec, apiKey) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: spec.prompt,
      duration_seconds: Math.max(0.5, Math.min(22, spec.durationSeconds)),
      prompt_influence: 0.4,
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs HTTP ${res.status} for ${trackId}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const fileName = `${trackId}.mp3`;
  fs.writeFileSync(path.join(AUDIO_DIR, fileName), buf);
  return fileName;
}

async function main() {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const trackKeys = Object.keys(manifest.tracks || {});
  const missingPrompts = trackKeys.filter((k) => !TRACK_PROMPTS[k]);
  if (missingPrompts.length > 0) {
    console.warn("[build_audio] Warning: tracks missing generator prompts:", missingPrompts.join(", "));
  }

  const elevenKey = process.env.ELEVENLABS_API_KEY || "";
  if (isDryRun) {
    console.log("[build_audio] DRY RUN — Spatial Audio Manifest Validated:");
    console.log(`  Base Path : ${manifest.basePath}`);
    console.log(`  Tracks    : ${trackKeys.length} defined (${trackKeys.filter((k) => manifest.tracks[k].url).length} custom file overrides)`);
    for (const k of trackKeys) {
      const t = manifest.tracks[k];
      console.log(`    - ${k} [ch=${t.channel}, vol=${t.volume}, loop=${!!t.loop}] -> ${t.url || "procedural-webaudio"}`);
    }
    return;
  }

  if (!elevenKey) {
    const msg = "[build_audio] No ELEVENLABS_API_KEY set; keeping procedural Web Audio manifest.";
    if (isStrict) {
      console.error(msg);
      process.exit(1);
    }
    console.log(msg);
    return;
  }

  console.log("[build_audio] ELEVENLABS_API_KEY detected — synthesizing external audio assets...");
  for (const k of trackKeys) {
    if (!TRACK_PROMPTS[k] || manifest.tracks[k].url) continue;
    const outFile = await generateElevenLabsClip(k, TRACK_PROMPTS[k], elevenKey);
    manifest.tracks[k].url = outFile;
    console.log(`  [ok] ${k} -> ${outFile}`);
  }
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

main().catch((err) => {
  console.error("[build_audio] Fatal:", err.message);
  process.exit(1);
});
