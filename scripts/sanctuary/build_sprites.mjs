#!/usr/bin/env node
/**
 * Sanctuary Sprite Atlas Builder (RCT2 x Signal Terminal Isometric Asset Pipeline)
 *
 * Usage:
 *   node scripts/sanctuary/build_sprites.mjs --dry-run
 *   PIXELLAB_API_KEY=... node scripts/sanctuary/build_sprites.mjs
 *
 * When run without external API keys (or with --dry-run), generates a clean,
 * deterministic `site/public/sanctuary-assets/atlas.json` with `externalEnabled: false`
 * so `RctSpriteAtlas.loadExternalAtlas()` gracefully serves procedural 1999 canvas baking
 * with zero runtime 404s.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const CATALOG_PATH = path.join(__dirname, "asset_catalog.json");
const OUT_DIR = path.join(ROOT, "site", "public", "sanctuary-assets");
const OUT_ATLAS_JSON = path.join(OUT_DIR, "atlas.json");

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");
const isStrict = args.has("--strict");

function readCatalog() {
  const raw = fs.readFileSync(CATALOG_PATH, "utf8");
  return JSON.parse(raw);
}

async function generateWithPixelLab(catalog, apiKey) {
  // Future hook: submit prompt batch to PixelLab isometric generation endpoint when key is provided.
  // Kept strictly bounded & resumable; returns generated frame metadata map if succeeded.
  const endpoint = process.env.PIXELLAB_API_URL || "https://api.pixellab.ai/v1/generate-image-pixflux";
  const frames = {};
  const previewTargets = [...catalog.attractions.filter((a) => a.group === "shop").slice(0, 2)];

  for (const item of previewTargets) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        description: `${item.prompt}, ${catalog.styleSpec.lighting}`,
        image_size: { width: 64, height: 78 },
        no_background: true,
      }),
    });
    if (!res.ok) {
      throw new Error(`PixelLab API HTTP ${res.status} for ${item.id}`);
    }
    frames[item.id] = { group: item.group, x: 0, y: 0, w: 64, h: 78, status: "fetched" };
  }
  return frames;
}

async function main() {
  const catalog = readCatalog();
  const counts = {
    attractions: catalog.attractions.length,
    scenery: catalog.scenery.length,
    characters: catalog.characters.length,
    uiIcons: catalog.uiIcons.length,
    paletteColors: catalog.styleSpec.palette.length,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const pixelLabKey = process.env.PIXELLAB_API_KEY || "";
  const retroKey = process.env.RETRO_DIFFUSION_API_KEY || "";

  let mode = "procedural-fallback";
  let externalEnabled = false;
  let frames = {};

  if (isDryRun) {
    mode = "dry-run";
    console.log("[build_sprites] DRY RUN — Asset Catalog Validated:");
    console.log(`  Projection : ${catalog.styleSpec.projection}`);
    console.log(`  Palette    : ${catalog.styleSpec.paletteName} (${counts.paletteColors} colors)`);
    console.log(`  Counts     : ${counts.attractions} attractions, ${counts.scenery} scenery, ${counts.characters} characters, ${counts.uiIcons} UI icons`);
  } else if (pixelLabKey || retroKey) {
    if (pixelLabKey) {
      console.log("[build_sprites] PIXELLAB_API_KEY detected — running generation hook...");
      frames = await generateWithPixelLab(catalog, pixelLabKey);
      mode = "pixellab-live";
      externalEnabled = Object.keys(frames).length > 0;
    } else {
      console.log("[build_sprites] RETRO_DIFFUSION_API_KEY detected — external sheet packer placeholder ready.");
      mode = "retrodiffusion-ready";
    }
  } else {
    const msg = "[build_sprites] No PIXELLAB_API_KEY / RETRO_DIFFUSION_API_KEY set; keeping procedural atlas fallback.";
    if (isStrict) {
      console.error(msg);
      process.exit(1);
    }
    console.log(msg);
  }

  const atlasPayload = {
    version: catalog.version,
    mode,
    externalEnabled,
    sheet: externalEnabled ? "atlas.png" : null,
    styleSpec: catalog.styleSpec,
    counts,
    frames,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(OUT_ATLAS_JSON, `${JSON.stringify(atlasPayload, null, 2)}\n`, "utf8");
  console.log(`[build_sprites] Wrote ${path.relative(ROOT, OUT_ATLAS_JSON)} (externalEnabled=${externalEnabled})`);
}

main().catch((err) => {
  console.error("[build_sprites] Fatal:", err.message);
  process.exit(1);
});
