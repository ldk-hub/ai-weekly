#!/usr/bin/env node
/**
 * Sanctuary 2.5D High-Fidelity RO Sprite Sheet Extractor & Adapter
 * Extracts crisp 3-1/3-2 tier anime sprites from the reference sprite sheet,
 * performs BFS border flood-fill chroma-key + green spill removal,
 * applies Sanctuary color grading + back-view hair/cape synthesis + 8-dir / 24-col animation,
 * and outputs 128x128 cell sheets (3072x1024 PNG) + JSON atlases + GLB base model.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SPRITE_DIR = path.join(ROOT_DIR, "site/public/assets/sprites");
const MODEL_DIR = path.join(ROOT_DIR, "site/public/assets/models");
const REF_SHEET_PATH = "/Users/nhn/.gemini/antigravity/brain/d316a7ec-f4d5-4ad2-b231-36c313e3750e/.user_uploaded/media_1794979593228_1b776b9f.jpg";

const DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
const ACTION_COLUMNS = {
  Idle: { start: 0, end: 3, fps: 6, loop: true },
  Walk: { start: 4, end: 9, fps: 10, loop: true },
  Attack: { start: 10, end: 15, fps: 12, loop: false },
  Cast: { start: 16, end: 20, fps: 10, loop: true },
  Sit: { start: 21, end: 23, fps: 4, loop: true },
};

const TOTAL_COLS = 24;
const TOTAL_ROWS = 8;
const CELL_SIZE = 128;

const REF_BOXES = {
  RuneKnight_M: { x: 49, y: 63, w: 49, h: 102 },
  RuneKnight_F: { x: 119, y: 61, w: 43, h: 101 },
  RoyalGuard_M: { x: 247, y: 59, w: 51, h: 101 },
  RoyalGuard_F: { x: 319, y: 62, w: 55, h: 97 },
  Mechanic_M: { x: 51, y: 192, w: 46, h: 101 },
  Mechanic_F: { x: 120, y: 195, w: 47, h: 99 },
  Genetic_M: { x: 252, y: 195, w: 46, h: 100 },
  Genetic_F: { x: 315, y: 192, w: 48, h: 102 },
  GuillotineCross_M: { x: 46, y: 327, w: 51, h: 99 },
  GuillotineCross_F: { x: 122, y: 327, w: 46, h: 101 },
  ShadowChaser_M: { x: 239, y: 323, w: 69, h: 108 },
  ShadowChaser_F: { x: 319, y: 328, w: 57, h: 102 },
  ArchBishop_M: { x: 52, y: 462, w: 48, h: 100 },
  ArchBishop_F: { x: 113, y: 464, w: 49, h: 96 },
  Sura_M: { x: 251, y: 465, w: 50, h: 97 },
  Sura_F: { x: 313, y: 466, w: 48, h: 98 },
  Ranger_M: { x: 47, y: 597, w: 51, h: 103 },
  Ranger_F: { x: 114, y: 598, w: 46, h: 100 },
  Minstrel: { x: 255, y: 598, w: 45, h: 98 },
  Wanderer: { x: 318, y: 600, w: 48, h: 98 },
};

/* ---------- Color & Chroma-Key Helpers ---------- */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function isMintBg(r, g, b, strict = false) {
  const dist = Math.hypot(r - 213, g - 236, b - 210);
  if (strict) return dist < 30 && g > r + 8 && g > b + 6;
  return dist < 44 || (g > r + 10 && g > b + 8 && r + g + b > 520);
}

/**
 * Extract sprite box from reference sheet and strip mint-green background via BFS flood-fill + despill.
 */
function extractCutout(refRaw, box) {
  const { data, width: rw } = refRaw;
  const { x: bx, y: by, w, h } = box;
  const rgba = new Uint8Array(w * h * 4);
  const bgMask = new Uint8Array(w * h);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const si = ((by + py) * rw + (bx + px)) * 3;
      const di = (py * w + px) * 4;
      rgba[di] = data[si];
      rgba[di + 1] = data[si + 1];
      rgba[di + 2] = data[si + 2];
      rgba[di + 3] = 255;
    }
  }

  // 1. BFS flood fill from borders
  const queue = [];
  const push = (px, py) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const idx = py * w + px;
    if (bgMask[idx]) return;
    const di = idx * 4;
    if (isMintBg(rgba[di], rgba[di + 1], rgba[di + 2], false)) {
      bgMask[idx] = 1;
      queue.push(idx);
    }
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }

  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const px = idx % w;
    const py = Math.floor(idx / w);
    push(px + 1, py);
    push(px - 1, py);
    push(px, py + 1);
    push(px, py - 1);
  }

  // 2. Clear enclosed gaps between legs/arms using strict mint check
  for (let i = 0; i < w * h; i++) {
    if (bgMask[i]) continue;
    const di = i * 4;
    if (isMintBg(rgba[di], rgba[di + 1], rgba[di + 2], true)) {
      bgMask[i] = 1;
    }
  }

  // 3. Apply alpha and trim stray isolated 1-2px noise
  for (let i = 0; i < w * h; i++) {
    if (bgMask[i]) rgba[i * 4 + 3] = 0;
  }

  // 4. Despill green fringe on pixels adjacent to transparent background
  for (let py = 1; py < h - 1; py++) {
    for (let px = 1; px < w - 1; px++) {
      const idx = py * w + px;
      const di = idx * 4;
      if (rgba[di + 3] === 0) continue;
      const touchesBg =
        rgba[((py - 1) * w + px) * 4 + 3] === 0 ||
        rgba[((py + 1) * w + px) * 4 + 3] === 0 ||
        rgba[(py * w + px - 1) * 4 + 3] === 0 ||
        rgba[(py * w + px + 1) * 4 + 3] === 0;
      if (touchesBg) {
        const r = rgba[di], g = rgba[di + 1], b = rgba[di + 2];
        const dist = Math.hypot(r - 213, g - 236, b - 210);
        if (dist < 62 && g > Math.max(r, b) + 4) {
          rgba[di + 3] = 0;
          continue;
        }
        if (g > Math.max(r, b) + 4) {
          rgba[di + 1] = Math.round((r + b) * 0.5);
        }
        // Subtle warm sepia outline reinforcement on outer silhouette
        const luma = (r + g + b) / 3;
        if (luma > 135 && luma < 200) {
          rgba[di] = Math.round(r * 0.72);
          rgba[di + 1] = Math.round(g * 0.65);
          rgba[di + 2] = Math.round(b * 0.62);
        }
      }
    }
  }

  // Trim bottom empty space so feet sit flush at bottom of cutout
  let maxOpaqueY = 0;
  let minOpaqueY = h;
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (rgba[(py * w + px) * 4 + 3] > 0) {
        if (py > maxOpaqueY) maxOpaqueY = py;
        if (py < minOpaqueY) minOpaqueY = py;
      }
    }
  }
  const trimH = Math.max(1, maxOpaqueY - minOpaqueY + 1);
  const trimmed = new Uint8Array(w * trimH * 4);
  trimmed.set(rgba.subarray(minOpaqueY * w * 4, (maxOpaqueY + 1) * w * 4));
  return { w, h: trimH, data: trimmed };
}

/**
 * Sample dominant hair & coat colors from extracted sprite for authentic Back-View synthesis.
 */
function samplePaletteFromCutout(cut) {
  const { w, h, data } = cut;
  const hairPixels = [];
  const coatPixels = [];

  for (let py = 2; py < Math.floor(h * 0.25); py++) {
    for (let px = Math.floor(w * 0.25); px < Math.floor(w * 0.75); px++) {
      const i = (py * w + px) * 4;
      if (data[i + 3] > 0 && data[i] + data[i + 1] + data[i + 2] > 180) {
        hairPixels.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
  }
  for (let py = Math.floor(h * 0.42); py < Math.floor(h * 0.72); py++) {
    for (let px = Math.floor(w * 0.28); px < Math.floor(w * 0.72); px++) {
      const i = (py * w + px) * 4;
      if (data[i + 3] > 0 && data[i] + data[i + 1] + data[i + 2] > 150) {
        coatPixels.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
  }

  const pickAvg = (arr, fallback) => {
    if (!arr.length) return fallback;
    let r = 0, g = 0, b = 0;
    for (const p of arr) { r += p[0]; g += p[1]; b += p[2]; }
    return [Math.round(r / arr.length), Math.round(g / arr.length), Math.round(b / arr.length)];
  };

  const hairBase = pickAvg(hairPixels, [215, 165, 130]);
  const coatBase = pickAvg(coatPixels, [130, 65, 85]);
  return { hairBase, coatBase };
}

/**
 * Apply color grading adaptation to personalize each Sanctuary class & NPC.
 */
function adaptCutoutColors(cut, { hueShift = 0, satMult = 1.08, warmGlow = 0 }) {
  const out = new Uint8Array(cut.data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    let r = out[i], g = out[i + 1], b = out[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);
    // Keep skin tones and dark outlines natural; shift saturated outfit/hair hues
    const isSkin = h >= 0.02 && h <= 0.12 && s < 0.65 && l > 0.62;
    if (!isSkin && s > 0.16 && l > 0.18 && l < 0.88) {
      const nh = (h + hueShift + 1) % 1;
      const ns = Math.min(1, s * satMult);
      [r, g, b] = hslToRgb(nh, ns, l);
    }
    if (warmGlow > 0 && l > 0.25) {
      r = Math.min(255, Math.round(r + warmGlow * 10));
      g = Math.min(255, Math.round(g + warmGlow * 6));
    }
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }
  return { w: cut.w, h: cut.h, data: out };
}

/**
 * Build an authentic Back-View variant (N / NW / NE) from a front-facing sprite.
 */
function buildBackViewCutout(cut, pal) {
  const { w, h, data } = cut;
  const back = new Uint8Array(data);
  const { hairBase, coatBase } = pal;

  const isSkinTone = (r, g, b) => {
    const [hh, s, l] = rgbToHsl(r, g, b);
    return l > 0.54 && r >= g && g >= b - 8 && (hh <= 0.13 || hh >= 0.94) && s > 0.08;
  };

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (back[i + 3] === 0) continue;
      const r = back[i], g = back[i + 1], b = back[i + 2];
      const luma = (r + g + b) / 3;

      // Replace face skin/eyes in upper head region (y: 12%..42%) with lush shaded back hair
      if (py >= Math.floor(h * 0.08) && py <= Math.floor(h * 0.43)) {
        const isEyeOrFace = isSkinTone(r, g, b) || (py >= h * 0.18 && py <= h * 0.34 && luma < 120 && px > w * 0.3 && px < w * 0.7);
        if (isEyeOrFace) {
          const band = Math.sin((px / w) * Math.PI * 6 + py * 0.15) * 14;
          const vGrad = py < h * 0.22 ? 1.08 : py > h * 0.34 ? 0.78 : 0.94;
          back[i] = Math.min(255, Math.max(25, Math.round(hairBase[0] * vGrad + band)));
          back[i + 1] = Math.min(255, Math.max(20, Math.round(hairBase[1] * vGrad + band * 0.8)));
          back[i + 2] = Math.min(255, Math.max(20, Math.round(hairBase[2] * vGrad + band * 0.7)));
        }
      }
      // Replace front open chest/neck skin in torso region (y: 42%..64%) with back cape/coat weave
      if (py > Math.floor(h * 0.42) && py < Math.floor(h * 0.65) && isSkinTone(r, g, b)) {
        back[i] = Math.max(25, Math.round(coatBase[0] * 0.88));
        back[i + 1] = Math.max(20, Math.round(coatBase[1] * 0.88));
        back[i + 2] = Math.max(20, Math.round(coatBase[2] * 0.88));
      }
    }
  }
  return { w, h, data: back };
}

/* ---------- Action Pose & 8-Direction Compositor into 128x128 Cell ---------- */
function putPixelBlend(buf, w, h, x, y, r, g, b, a) {
  const ix = Math.round(x), iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= w || iy >= h || a <= 0) return;
  const i = (iy * w + ix) * 4;
  const alpha = a / 255;
  const inv = 1 - alpha;
  if (buf[i + 3] === 0) {
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
  } else {
    buf[i] = Math.round(buf[i] * inv + r * alpha);
    buf[i + 1] = Math.round(buf[i + 1] * inv + g * alpha);
    buf[i + 2] = Math.round(buf[i + 2] * inv + b * alpha);
    buf[i + 3] = Math.min(255, Math.max(buf[i + 3], a));
  }
}

function renderCellFromCutout(frontCut, backCut, dir, col, auraRgb) {
  const cell = new Uint8Array(CELL_SIZE * CELL_SIZE * 4);

  // Direction mapping: 0:S, 1:SW, 2:W, 3:NW, 4:N, 5:NE, 6:E, 7:SE
  const isBack = dir === 3 || dir === 4 || dir === 5;
  const flipX = dir === 5 || dir === 6 || dir === 7;
  const widthScale = (dir === 0 || dir === 4) ? 0.95 : (dir === 2 || dir === 6) ? 0.88 : 1.0;

  const src = isBack ? backCut : frontCut;
  const sw = src.w, sh = src.h;

  // Determine animation parameters per column
  let action = "Idle", phase = 0;
  if (col <= 3) { action = "Idle"; phase = col / 4; }
  else if (col <= 9) { action = "Walk"; phase = (col - 4) / 6; }
  else if (col <= 15) { action = "Attack"; phase = (col - 10) / 5; }
  else if (col <= 20) { action = "Cast"; phase = (col - 16) / 4; }
  else { action = "Sit"; phase = (col - 21) / 3; }

  const idleBob = action === "Idle" ? (col === 1 || col === 2 ? 1 : 0) : 0;
  const walkWave = action === "Walk" ? Math.sin(phase * Math.PI * 2) : 0;
  const walkLift = action === "Walk" ? -Math.abs(Math.round(Math.cos(phase * Math.PI * 2) * 2)) : 0;
  const castLift = action === "Cast" ? -2 - Math.round(Math.sin(phase * Math.PI) * 2) : 0;
  const atkLeanX = action === "Attack" ? (flipX ? 3 : -3) * Math.sin(phase * Math.PI) : 0;
  const sitSquash = action === "Sit" ? 1 : 0;

  const baseBottomY = CELL_SIZE - 5;
  const targetH = Math.min(112, sh) * (action === "Sit" ? 0.86 : 1.0);
  const scaleY = targetH / sh;
  const targetW = Math.round(sw * widthScale);

  // Render transformed sprite centered horizontally and anchored at bottom
  for (let dy = 0; dy < Math.round(targetH); dy++) {
    const syFloat = dy / scaleY;
    const sy = Math.min(sh - 1, Math.floor(syFloat));
    const normY = sy / sh; // 0 = head top, 1 = boot sole

    // Articulated vertical/horizontal deformation for lifelike animation
    let rowOffsetX = 0;
    let rowOffsetY = idleBob + walkLift + castLift;

    if (action === "Walk") {
      if (normY > 0.72) {
        // Legs stride left/right independently
        const legHalf = walkWave * 3.0;
        rowOffsetX += legHalf;
        rowOffsetY += normY > 0.84 ? Math.round(Math.abs(walkWave) * -1.5) : 0;
      } else if (normY > 0.35) {
        rowOffsetX += walkWave * 0.7;
      }
    } else if (action === "Attack") {
      rowOffsetX += atkLeanX * (1 - normY);
    } else if (action === "Sit") {
      if (normY > 0.72) {
        rowOffsetX += (flipX ? 4 : -4) * ((normY - 0.72) / 0.28);
      }
      rowOffsetY += sitSquash;
    }

    // Keep sole grounded during Idle/Walk/Sit
    const destY = Math.round(baseBottomY - targetH + dy + rowOffsetY);
    if (destY < 0 || destY >= CELL_SIZE) continue;

    for (let dx = 0; dx < targetW; dx++) {
      const sxRaw = Math.floor((dx / targetW) * sw);
      const sx = flipX ? (sw - 1 - sxRaw) : sxRaw;
      const si = (sy * sw + sx) * 4;
      const a = src.data[si + 3];
      if (a === 0) continue;

      let localX = dx;
      // Alternating leg split during Walk for extra crisp step motion
      if (action === "Walk" && normY > 0.72) {
        const isLeftHalf = dx < targetW * 0.5;
        localX += isLeftHalf ? walkWave * 2.2 : -walkWave * 2.2;
      }

      const destX = Math.round(CELL_SIZE * 0.5 - targetW * 0.5 + localX + rowOffsetX);
      if (destX < 0 || destX >= CELL_SIZE) continue;
      const di = (destY * CELL_SIZE + destX) * 4;
      cell[di] = src.data[si];
      cell[di + 1] = src.data[si + 1];
      cell[di + 2] = src.data[si + 2];
      cell[di + 3] = a;
    }
  }

  // Soft Sanctuary Magic Aura & Sparkles during Cast / Attack
  if (action === "Cast" || (action === "Attack" && phase > 0.2 && phase < 0.85)) {
    const [ar, ag, ab] = auraRgb;
    const pulse = 0.55 + 0.45 * Math.sin(phase * Math.PI);
    const ringY = baseBottomY - 2;
    for (let rx = -22; rx <= 22; rx++) {
      const falloff = 1 - Math.abs(rx) / 23;
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, 64 + rx, ringY, ar, ag, ab, Math.round(210 * falloff * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, 64 + rx, ringY - 1, 255, 252, 235, Math.round(130 * falloff * pulse));
    }
    const sparkles = [[38, 42], [90, 36], [42, 78], [88, 72], [64, 18]];
    sparkles.forEach(([sx, sy], idx) => {
      const syAnim = sy - Math.round((phase * 14 + idx * 3) % 16);
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim, 255, 255, 255, 230);
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx - 1, syAnim, ar, ag, ab, 175);
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx + 1, syAnim, ar, ag, ab, 175);
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim - 1, ar, ag, ab, 175);
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim + 1, ar, ag, ab, 175);
    });
  }

  return cell;
}

async function bakeSpriteFromRef(name, refRaw, boxKey, adaptOpts, auraRgb, worldHeight = 2.45) {
  const rawCut = extractCutout(refRaw, REF_BOXES[boxKey]);
  const adapted = adaptCutoutColors(rawCut, adaptOpts);
  const pal = samplePaletteFromCutout(adapted);
  const backCut = buildBackViewCutout(adapted, pal);

  const sheetW = TOTAL_COLS * CELL_SIZE;
  const sheetH = TOTAL_ROWS * CELL_SIZE;
  const sheetBuf = Buffer.alloc(sheetW * sheetH * 4, 0);

  for (let row = 0; row < TOTAL_ROWS; row++) {
    for (let col = 0; col < TOTAL_COLS; col++) {
      const cell = renderCellFromCutout(adapted, backCut, row, col, auraRgb);
      for (let py = 0; py < CELL_SIZE; py++) {
        const srcOff = py * CELL_SIZE * 4;
        const dstOff = ((row * CELL_SIZE + py) * sheetW + col * CELL_SIZE) * 4;
        Buffer.from(cell.buffer, srcOff, CELL_SIZE * 4).copy(sheetBuf, dstOff);
      }
    }
  }

  const sheetFilename = `${name}_8dir_sheet.png`;
  const atlasFilename = `${name}_8dir_atlas.json`;
  const sheetPath = path.join(SPRITE_DIR, sheetFilename);
  const atlasPath = path.join(SPRITE_DIR, atlasFilename);

  await sharp(sheetBuf, { raw: { width: sheetW, height: sheetH, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(sheetPath);

  const atlas = {
    name,
    sheet: `assets/sprites/${sheetFilename}`,
    cols: TOTAL_COLS,
    rows: TOTAL_ROWS,
    cell_width: CELL_SIZE,
    cell_height: CELL_SIZE,
    world_height: worldHeight,
    directions: DIRECTIONS,
    columns: ACTION_COLUMNS,
  };
  fs.writeFileSync(atlasPath, JSON.stringify(atlas, null, 2), "utf8");
  return { sheetPath, atlasPath };
}

/* ---------- Minimal Valid Binary glTF 2.0 Placeholder (walkable mesh stub) ---------- */
function buildMinimalGlb(outPath) {
  const positions = new Float32Array([
    -18, 0, 18, 18, 0, 18, 18, 0, -18, -18, 0, -18,
  ]);
  const normals = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const binBuf = Buffer.concat([
    Buffer.from(positions.buffer),
    Buffer.from(normals.buffer),
    Buffer.from(indices.buffer),
    Buffer.alloc(2, 0),
  ]);
  const gltf = {
    asset: { version: "2.0", generator: "Sanctuary25D-DioramaStub" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "Walkable_Base", mesh: 0 }],
    meshes: [{ name: "Walkable_Base", primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", min: [-18, 0, -18], max: [18, 0, 18] },
      { bufferView: 1, componentType: 5126, count: 4, type: "VEC3" },
      { bufferView: 2, componentType: 5123, count: 6, type: "SCALAR" },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 48, target: 34962 },
      { buffer: 0, byteOffset: 48, byteLength: 48, target: 34962 },
      { buffer: 0, byteOffset: 96, byteLength: 12, target: 34963 },
    ],
    buffers: [{ byteLength: binBuf.length }],
  };
  let jsonBuf = Buffer.from(JSON.stringify(gltf), "utf8");
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  if (jsonPad > 0) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
  const totalLen = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLen, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonBuf.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binBuf.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  fs.writeFileSync(outPath, Buffer.concat([header, jh, jsonBuf, bh, binBuf]));
}

async function main() {
  fs.mkdirSync(SPRITE_DIR, { recursive: true });
  fs.mkdirSync(MODEL_DIR, { recursive: true });

  const { data, info } = await sharp(REF_SHEET_PATH).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const refRaw = { data, width: info.width, height: info.height };

  const specs = [
    // Playable 3 Sanctuary Avatars (adapted from RO 3rd-tier Royal Guard, Arch Bishop, Shadow Chaser)
    { name: "Solar_Guard", box: "RoyalGuard_F", adapt: { hueShift: 0.02, satMult: 1.12, warmGlow: 1 }, aura: [251, 191, 36], height: 2.35 },
    { name: "Astral_Sage", box: "ArchBishop_F", adapt: { hueShift: -0.03, satMult: 1.1, warmGlow: 0.5 }, aura: [56, 189, 248], height: 2.3 },
    { name: "Shadow_Reaper", box: "ShadowChaser_F", adapt: { hueShift: -0.04, satMult: 1.12, warmGlow: 0.4 }, aura: [244, 63, 94], height: 2.35 },
    // 4 Archive Shrine Curators
    { name: "Curator_Ella", box: "Genetic_F", adapt: { hueShift: 0.01, satMult: 1.1, warmGlow: 1 }, aura: [251, 191, 36], height: 2.3 },
    { name: "Curator_Luna", box: "Wanderer", adapt: { hueShift: -0.02, satMult: 1.1, warmGlow: 0.8 }, aura: [251, 113, 133], height: 2.3 },
    { name: "Curator_Leon", box: "RuneKnight_M", adapt: { hueShift: 0.03, satMult: 1.12, warmGlow: 1 }, aura: [52, 211, 153], height: 2.4 },
    // 4 Plaza Ambient Citizens (sitting on benches & strolling around crystal fountain)
    { name: "Citizen_Ranger", box: "Ranger_F", adapt: { hueShift: 0, satMult: 1.06, warmGlow: 0.7 }, aura: [250, 204, 21], height: 2.25 },
    { name: "Citizen_Minstrel", box: "Minstrel", adapt: { hueShift: 0, satMult: 1.08, warmGlow: 0.7 }, aura: [251, 113, 133], height: 2.3 },
    { name: "Citizen_Sura", box: "Sura_F", adapt: { hueShift: 0, satMult: 1.08, warmGlow: 0.8 }, aura: [251, 146, 60], height: 2.25 },
    { name: "Citizen_Mechanic", box: "Mechanic_F", adapt: { hueShift: 0, satMult: 1.06, warmGlow: 0.7 }, aura: [56, 189, 248], height: 2.25 },
  ];

  for (const sp of specs) {
    const res = await bakeSpriteFromRef(sp.name, refRaw, sp.box, sp.adapt, sp.aura, sp.height);
    console.log(`[Bake] ${sp.name} (${sp.box}): ${path.relative(ROOT_DIR, res.sheetPath)}`);
  }

  const glbPath = path.join(MODEL_DIR, "sanctuary_environment.glb");
  buildMinimalGlb(glbPath);
  console.log(`[Bake] Environment GLB: ${path.relative(ROOT_DIR, glbPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
