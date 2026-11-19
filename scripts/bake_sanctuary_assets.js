#!/usr/bin/env node
/**
 * Sanctuary 2.5D Survival-Project-Style Chibi Sprite & Environment Baker
 * Generates 100% original 8-directional 32-column sprite sheets (3072x768 RGBA PNG, 96x96 cell)
 * from 3-pose (Front | Profile | Back) magenta-chroma turnaround sheets under scripts/turnarounds/.
 * Applies 2.2-head Chibi arcade SD re-proportioning, bold dark-ink outline, and distinct keyframes:
 *   Idle (0..3), Walk (4..9), Run (10..15), Dash/Slide (16..19), Jump (20..23),
 *   Attack 4-frame Slash (24..27), Cast (28..29), Guard (30), Sit (31).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const TURNAROUND_DIR = path.join(__dirname, "turnarounds");
const SPRITE_DIR = path.join(ROOT_DIR, "site/public/assets/sprites");
const MODEL_DIR = path.join(ROOT_DIR, "site/public/assets/models");

const DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
const ACTION_COLUMNS = {
  Idle: { start: 0, end: 3, fps: 7, loop: true },
  Walk: { start: 4, end: 9, fps: 12, loop: true },
  Run: { start: 10, end: 15, fps: 16, loop: true },
  Dash: { start: 16, end: 19, fps: 18, loop: false },
  Jump: { start: 20, end: 23, fps: 11, loop: false },
  Attack: { start: 24, end: 27, fps: 16, loop: false },
  Cast: { start: 28, end: 29, fps: 10, loop: false },
  Cheer: { start: 28, end: 29, fps: 8, loop: false },
  Interact: { start: 28, end: 29, fps: 8, loop: false },
  Guard: { start: 30, end: 30, fps: 8, loop: true },
  Sit: { start: 31, end: 31, fps: 4, loop: true },
  SitChair: { start: 31, end: 31, fps: 4, loop: true },
};

const TOTAL_COLS = 32;
const TOTAL_ROWS = 8;
const CELL_SIZE = 96;

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

function isMagentaBg(r, g, b, strict = false) {
  const rbMin = Math.min(r, b);
  const diffRB = Math.abs(r - b);
  if (strict) {
    return r > 200 && b > 200 && g < 70 && diffRB < 48;
  }
  return r > 152 && b > 152 && rbMin - g > 58 && diffRB < 82;
}

function findTwoSplitColumns(rgb, w, h) {
  const colHasFg = new Uint8Array(w);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 3;
      if (!isMagentaBg(rgb[i], rgb[i + 1], rgb[i + 2], false)) {
        colHasFg[x] = 1;
        break;
      }
    }
  }

  const pickWidestGapCenter = (minX, maxX) => {
    let bestStart = -1;
    let bestLen = 0;
    let curStart = -1;
    for (let x = minX; x <= maxX; x++) {
      if (!colHasFg[x]) {
        if (curStart < 0) curStart = x;
      } else if (curStart >= 0) {
        const len = x - curStart;
        if (len > bestLen) {
          bestLen = len;
          bestStart = curStart;
        }
        curStart = -1;
      }
    }
    if (curStart >= 0 && maxX - curStart + 1 > bestLen) {
      bestLen = maxX - curStart + 1;
      bestStart = curStart;
    }
    if (bestStart < 0 || bestLen === 0) return Math.round((minX + maxX) * 0.5);
    return Math.round(bestStart + bestLen * 0.5);
  };

  const s1 = pickWidestGapCenter(Math.floor(w * 0.24), Math.floor(w * 0.44));
  const s2 = pickWidestGapCenter(Math.floor(w * 0.56), Math.floor(w * 0.76));
  return [s1, s2];
}

async function extractAndResizePose(rgb, rw, rh, x0, x1, targetMaxH = 82, targetMaxW = 84) {
  const pw = x1 - x0;
  const rgba = new Uint8Array(pw * rh * 4);
  const bgMask = new Uint8Array(pw * rh);

  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < pw; x++) {
      const si = (y * rw + (x0 + x)) * 3;
      const di = (y * pw + x) * 4;
      rgba[di] = rgb[si];
      rgba[di + 1] = rgb[si + 1];
      rgba[di + 2] = rgb[si + 2];
      rgba[di + 3] = 255;
    }
  }

  // 1. BFS flood-fill from borders
  const queue = [];
  const push = (px, py) => {
    if (px < 0 || py < 0 || px >= pw || py >= rh) return;
    const idx = py * pw + px;
    if (bgMask[idx]) return;
    const di = idx * 4;
    if (isMagentaBg(rgba[di], rgba[di + 1], rgba[di + 2], false)) {
      bgMask[idx] = 1;
      queue.push(idx);
    }
  };
  for (let x = 0; x < pw; x++) { push(x, 0); push(x, rh - 1); }
  for (let y = 0; y < rh; y++) { push(0, y); push(pw - 1, y); }
  let head = 0;
  while (head < queue.length) {
    const idx = queue[head++];
    const px = idx % pw;
    const py = Math.floor(idx / pw);
    push(px + 1, py);
    push(px - 1, py);
    push(px, py + 1);
    push(px, py - 1);
  }

  // 2. Clear enclosed pure-magenta pockets
  for (let i = 0; i < pw * rh; i++) {
    if (bgMask[i]) continue;
    const di = i * 4;
    if (isMagentaBg(rgba[di], rgba[di + 1], rgba[di + 2], true)) {
      bgMask[i] = 1;
    }
  }

  for (let i = 0; i < pw * rh; i++) {
    if (bgMask[i]) rgba[i * 4 + 3] = 0;
  }

  // 2b. Remove tiny isolated stray pixel islands (< 28 px)
  const visited = new Uint8Array(pw * rh);
  for (let i = 0; i < pw * rh; i++) {
    if (visited[i] || rgba[i * 4 + 3] === 0) continue;
    const comp = [i];
    visited[i] = 1;
    let cHead = 0;
    while (cHead < comp.length) {
      const cur = comp[cHead++];
      const cx = cur % pw;
      const cy = Math.floor(cur / pw);
      const neighbors = [
        cx > 0 ? cur - 1 : -1,
        cx + 1 < pw ? cur + 1 : -1,
        cy > 0 ? cur - pw : -1,
        cy + 1 < rh ? cur + pw : -1,
      ];
      for (const nb of neighbors) {
        if (nb >= 0 && !visited[nb] && rgba[nb * 4 + 3] > 0) {
          visited[nb] = 1;
          comp.push(nb);
        }
      }
    }
    if (comp.length < 28) {
      for (const idx of comp) rgba[idx * 4 + 3] = 0;
    }
  }

  // 3. Despill magenta fringe
  for (let pass = 0; pass < 2; pass++) {
    for (let py = 1; py < rh - 1; py++) {
      for (let px = 1; px < pw - 1; px++) {
        const idx = py * pw + px;
        const di = idx * 4;
        if (rgba[di + 3] === 0) continue;
        const touchesBg =
          rgba[((py - 1) * pw + px) * 4 + 3] === 0 ||
          rgba[((py + 1) * pw + px) * 4 + 3] === 0 ||
          rgba[(py * pw + px - 1) * 4 + 3] === 0 ||
          rgba[(py * pw + px + 1) * 4 + 3] === 0;
        if (!touchesBg) continue;
        const r = rgba[di];
        const g = rgba[di + 1];
        const b = rgba[di + 2];
        const spill = Math.min(r, b) - g;
        if (spill > 42 && Math.abs(r - b) < 85 && r > 130 && b > 130) {
          rgba[di + 3] = 0;
        } else if (spill > 16 && Math.abs(r - b) < 85) {
          rgba[di] = Math.max(0, Math.round(r - spill * 0.94));
          rgba[di + 2] = Math.max(0, Math.round(b - spill * 0.94));
        }
      }
    }
  }

  // 4. Trim transparent bounding box
  let minX = pw, maxX = -1, minY = rh, maxY = -1;
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < pw; x++) {
      if (rgba[(y * pw + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const tw = Math.max(1, maxX - minX + 1);
  const th = Math.max(1, maxY - minY + 1);
  const cropped = Buffer.alloc(tw * th * 4);
  for (let y = 0; y < th; y++) {
    const srcOff = ((minY + y) * pw + minX) * 4;
    const dstOff = y * tw * 4;
    Buffer.from(rgba.buffer, srcOff, tw * 4).copy(cropped, dstOff);
  }

  // 5. Resize proportionally with Lanczos3 + Chibi 2.2-Head SD Re-Proportioning + Crisp Cartoon Outline
  const scale = Math.min(targetMaxH / th, targetMaxW / tw);
  const rwOut = Math.max(1, Math.round(tw * scale));
  const rhOut = Math.max(1, Math.round(th * scale));

  const { data: resized, info } = await sharp(cropped, {
    raw: { width: tw, height: th, channels: 4 },
  })
    .resize(rwOut, rhOut, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const rawOut = new Uint8Array(resized);
  const ow = info.width;
  const oh = info.height;

  // Survival Project bright arcade cel vibrancy boost + threshold
  for (let i = 0; i < rawOut.length; i += 4) {
    if (rawOut[i + 3] < 140) {
      rawOut[i] = 0; rawOut[i + 1] = 0; rawOut[i + 2] = 0; rawOut[i + 3] = 0;
    } else {
      rawOut[i + 3] = 255;
      let r = rawOut[i], g = rawOut[i + 1], b = rawOut[i + 2];
      const spill = Math.min(r, b) - g;
      if (spill > 38 && Math.abs(r - b) < 75 && r > 135 && b > 135) {
        r = Math.max(0, r - spill);
        b = Math.max(0, b - spill);
      }
      const [h, s, l] = rgbToHsl(r, g, b);
      if (l > 0.14 && l < 0.92 && s > 0.1) {
        [r, g, b] = hslToRgb(h, Math.min(1, s * 1.14), Math.min(0.95, l * 1.04));
      }
      rawOut[i] = r; rawOut[i + 1] = g; rawOut[i + 2] = b;
    }
  }

  // Re-proportion vertically into cute 2.2-head Survival Project Chibi proportions:
  // Expand head band (top 0..42% -> 48%), slightly widen head & torso, compact legs (72..100% -> 22%)
  const cw = ow + 8;
  const ch = oh;
  const chibi = new Uint8Array(cw * ch * 4);
  for (let dy = 0; dy < ch; dy++) {
    const ny = dy / ch;
    let srcNy;
    let bandScaleX;
    if (ny < 0.48) {
      srcNy = (ny / 0.48) * 0.42;
      bandScaleX = 1.12;
    } else if (ny < 0.78) {
      srcNy = 0.42 + ((ny - 0.48) / 0.30) * 0.31;
      bandScaleX = 1.05;
    } else {
      srcNy = 0.73 + ((ny - 0.78) / 0.22) * 0.27;
      bandScaleX = 1.02;
    }
    const sy = Math.min(oh - 1, Math.floor(srcNy * oh));
    const halfCw = cw * 0.5;
    const halfOw = ow * 0.5;
    for (let dx = 0; dx < cw; dx++) {
      const sx = Math.round(halfOw + (dx - halfCw) / bandScaleX);
      if (sx < 0 || sx >= ow) continue;
      const si = (sy * ow + sx) * 4;
      if (rawOut[si + 3] === 0) continue;
      const di = (dy * cw + dx) * 4;
      chibi[di] = rawOut[si];
      chibi[di + 1] = rawOut[si + 1];
      chibi[di + 2] = rawOut[si + 2];
      chibi[di + 3] = 255;
    }
  }

  // Add crisp 1px dark arcade cartoon rim outline where transparent borders opaque pixels
  const outlined = new Uint8Array(chibi);
  for (let py = 1; py < ch - 1; py++) {
    for (let px = 1; px < cw - 1; px++) {
      const idx = py * cw + px;
      const di = idx * 4;
      if (chibi[di + 3] > 0) {
        // Darken rim pixels slightly for clean cartoon crispness
        const rim =
          chibi[((py - 1) * cw + px) * 4 + 3] === 0 ||
          chibi[((py + 1) * cw + px) * 4 + 3] === 0 ||
          chibi[(py * cw + px - 1) * 4 + 3] === 0 ||
          chibi[(py * cw + px + 1) * 4 + 3] === 0;
        if (rim) {
          const luma = (chibi[di] + chibi[di + 1] + chibi[di + 2]) / 3;
          if (luma < 115) {
            outlined[di] = 28; outlined[di + 1] = 20; outlined[di + 2] = 34;
          }
        }
        continue;
      }
      const touchesOpaque =
        chibi[((py - 1) * cw + px) * 4 + 3] > 0 ||
        chibi[((py + 1) * cw + px) * 4 + 3] > 0 ||
        chibi[(py * cw + px - 1) * 4 + 3] > 0 ||
        chibi[(py * cw + px + 1) * 4 + 3] > 0;
      if (touchesOpaque) {
        outlined[di] = 30;
        outlined[di + 1] = 22;
        outlined[di + 2] = 36;
        outlined[di + 3] = 255;
      }
    }
  }

  return { w: cw, h: ch, data: outlined };
}

function adaptPoseColors(cut, { hueShift = 0, satMult = 1.0 } = {}) {
  if (!hueShift && satMult === 1.0) return cut;
  const out = new Uint8Array(cut.data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    let r = out[i], g = out[i + 1], b = out[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);
    const isSkin = r > 170 && g > 118 && b > 82 && r >= g && g >= b - 12 && (r - g) < 82 && (r - b) < 125;
    if (!isSkin && s > 0.16 && l > 0.16 && l < 0.9) {
      const nh = (h + hueShift + 1) % 1;
      const ns = Math.min(1, s * satMult);
      [r, g, b] = hslToRgb(nh, ns, l);
    }
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }
  return { w: cut.w, h: cut.h, data: out };
}

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

function drawArcSlash(cell, facingSign, phase, auraRgb) {
  const [ar, ag, ab] = auraRgb;
  const cx = CELL_SIZE * 0.5 + facingSign * 14;
  const cy = CELL_SIZE * 0.56;
  const radius = 26 + phase * 6;
  const startA = facingSign >= 0 ? -1.45 + phase * 1.1 : Math.PI - 0.65 + phase * 1.1;
  const sweep = 2.05;
  for (let step = 0; step <= 48; step++) {
    const t = step / 48;
    const ang = startA + t * sweep * (facingSign >= 0 ? 1 : -1);
    const thickness = Math.round((1 - Math.abs(t - 0.5) * 1.5) * 5) + 1;
    for (let rOff = -thickness; rOff <= thickness; rOff++) {
      const px = cx + Math.cos(ang) * (radius + rOff * 0.9);
      const py = cy + Math.sin(ang) * (radius * 0.68 + rOff * 0.7);
      const isCore = Math.abs(rOff) <= 1;
      putPixelBlend(
        cell,
        CELL_SIZE,
        CELL_SIZE,
        px,
        py,
        isCore ? 255 : ar,
        isCore ? 255 : ag,
        isCore ? 245 : ab,
        isCore ? 245 : 190
      );
    }
  }
}

function drawGuardBarrier(cell, facingSign) {
  const cx = CELL_SIZE * 0.5 + facingSign * 14;
  const cy = CELL_SIZE * 0.58;
  const rx = 20;
  const ry = 28;
  for (let step = 0; step <= 64; step++) {
    const a = -Math.PI * 0.45 + (step / 64) * Math.PI * 0.9;
    const dir = facingSign >= 0 ? 1 : -1;
    for (let thick = -2; thick <= 2; thick++) {
      const px = cx + dir * Math.cos(a) * (rx + thick);
      const py = cy + Math.sin(a) * (ry + thick * 0.5);
      const isEdge = Math.abs(thick) === 2;
      putPixelBlend(
        cell,
        CELL_SIZE,
        CELL_SIZE,
        px,
        py,
        isEdge ? 255 : 56,
        isEdge ? 255 : 189,
        248,
        isEdge ? 240 : 185
      );
    }
  }
}

function renderCellFrom3Views(frontCut, sideCut, backCut, dir, col, auraRgb, sideFacesRight = false) {
  const cell = new Uint8Array(CELL_SIZE * CELL_SIZE * 4);

  let src = frontCut;
  let flipX = false;
  let widthScale = 1.0;

  if (dir === 0) {
    src = frontCut;
  } else if (dir === 1) {
    src = frontCut;
    widthScale = 0.96;
  } else if (dir === 2) {
    src = sideCut; // W (left)
    flipX = sideFacesRight;
  } else if (dir === 3) {
    src = backCut;
    widthScale = 0.96;
  } else if (dir === 4) {
    src = backCut;
  } else if (dir === 5) {
    src = backCut;
    flipX = true;
    widthScale = 0.96;
  } else if (dir === 6) {
    src = sideCut; // E (right)
    flipX = !sideFacesRight;
  } else if (dir === 7) {
    src = frontCut;
    flipX = true;
    widthScale = 0.96;
  }

  const sw = src.w;
  const sh = src.h;

  // Map col (0..31) to Survival Project Action & phase
  let action = "Idle", phase = 0;
  if (col <= 3) { action = "Idle"; phase = col / 4; }
  else if (col <= 9) { action = "Walk"; phase = (col - 4) / 6; }
  else if (col <= 15) { action = "Run"; phase = (col - 10) / 6; }
  else if (col <= 19) { action = "Dash"; phase = (col - 16) / 4; }
  else if (col <= 23) { action = "Jump"; phase = (col - 20) / 4; }
  else if (col <= 27) { action = "Attack"; phase = (col - 24) / 4; }
  else if (col <= 29) { action = "Cast"; phase = (col - 28) / 2; }
  else if (col === 30) { action = "Guard"; phase = 0; }
  else { action = "Sit"; phase = 0; }

  const facingSign = (dir === 6 || dir === 7 || dir === 5) ? 1 : (dir === 2 || dir === 1 || dir === 3) ? -1 : 0;
  const idleBob = action === "Idle" ? (col === 1 || col === 2 ? 1.5 : 0) : 0;
  const walkWave = action === "Walk" ? Math.sin(phase * Math.PI * 2) : 0;
  const walkLift = action === "Walk" ? -Math.abs(Math.round(Math.cos(phase * Math.PI * 2) * 2.2)) : 0;

  const runWave = action === "Run" ? Math.sin(phase * Math.PI * 2) : 0;
  const runLift = action === "Run" ? -Math.abs(Math.round(Math.cos(phase * Math.PI * 2) * 4.2)) : 0;

  const dashSurge = action === "Dash" ? (0.75 + 0.25 * Math.sin(phase * Math.PI)) : 0;

  // Jump: 20 = launch squat, 21..22 = tucked knees high, 23 = landing stretch
  let jumpScaleY = 1.0, jumpScaleX = 1.0, jumpLiftY = 0;
  if (action === "Jump") {
    if (col === 20) { jumpScaleY = 0.80; jumpScaleX = 1.16; jumpLiftY = 2; }
    else if (col === 21) { jumpScaleY = 1.06; jumpScaleX = 0.94; jumpLiftY = -7; }
    else if (col === 22) { jumpScaleY = 1.02; jumpScaleX = 0.98; jumpLiftY = -9; }
    else { jumpScaleY = 0.88; jumpScaleX = 1.10; jumpLiftY = -1; }
  }

  // Attack 4-frame lunge & squash
  let atkScaleX = 1.0, atkScaleY = 1.0, atkShiftX = 0;
  if (action === "Attack") {
    if (col === 24) { atkScaleX = 0.94; atkScaleY = 1.04; atkShiftX = -facingSign * 4; }
    else if (col === 25) { atkScaleX = 1.14; atkScaleY = 0.90; atkShiftX = facingSign * 8; }
    else if (col === 26) { atkScaleX = 1.10; atkScaleY = 0.94; atkShiftX = facingSign * 6; }
    else { atkScaleX = 1.02; atkScaleY = 0.98; atkShiftX = facingSign * 2; }
  }

  const castLift = action === "Cast" ? -Math.round(Math.sin((phase + 0.25) * Math.PI) * 3.8) : 0;
  const guardScaleX = action === "Guard" ? 1.12 : 1.0;
  const guardScaleY = action === "Guard" ? 0.88 : 1.0;
  const sitScaleY = action === "Sit" ? 0.84 : 1.0;

  const dashCompressY = action === "Dash" ? 0.78 : 1.0;
  const dashStretchX = action === "Dash" ? 1.16 : 1.0;

  const baseBottomY = CELL_SIZE - 4;
  const targetH = Math.min(84, sh) * sitScaleY * jumpScaleY * atkScaleY * guardScaleY * dashCompressY;
  const scaleY = targetH / sh;
  const targetW = Math.round(sw * widthScale * jumpScaleX * atkScaleX * guardScaleX * dashStretchX);

  for (let dy = 0; dy < Math.round(targetH); dy++) {
    const syFloat = dy / scaleY;
    const sy = Math.min(sh - 1, Math.floor(syFloat));
    const normY = sy / sh;

    let rowOffsetX = atkShiftX;
    let rowOffsetY = idleBob + walkLift + runLift + jumpLiftY + castLift;

    if (action === "Walk") {
      if (normY > 0.74) {
        rowOffsetX += walkWave * 3.4;
        rowOffsetY += normY > 0.85 ? Math.round(Math.abs(walkWave) * -2.2) : 0;
      } else if (normY > 0.44) {
        rowOffsetX += walkWave * 0.9;
      }
    } else if (action === "Run") {
      const leanDir = facingSign !== 0 ? facingSign : 0.45;
      rowOffsetX += leanDir * (1 - normY) * 6.5;
      if (normY > 0.70) {
        rowOffsetX += runWave * 5.6;
        rowOffsetY += normY > 0.82 ? Math.round(Math.abs(runWave) * -3.5) : 0;
      } else if (normY < 0.38) {
        rowOffsetX -= leanDir * Math.abs(runWave) * 1.4;
      }
    } else if (action === "Dash") {
      // Iconic Survival Project crouched skating forward slide!
      const leanDir = facingSign !== 0 ? facingSign : 0.85;
      rowOffsetX += leanDir * ((1 - normY) * 12.5 * dashSurge - 4.0);
      if (normY > 0.76) {
        // Rear trailing skate kick!
        rowOffsetX -= leanDir * (normY - 0.76) * 26;
        rowOffsetY -= Math.round((normY - 0.76) * 8);
      }
    } else if (action === "Jump") {
      if ((col === 21 || col === 22) && normY > 0.72) {
        rowOffsetY -= Math.round((normY - 0.72) * 18);
      }
    } else if (action === "Attack") {
      const leanDir = facingSign !== 0 ? facingSign : 0.6;
      const swingFactor = col === 24 ? -0.5 : col === 25 ? 1.1 : col === 26 ? 0.7 : 0.2;
      if (normY < 0.72) {
        rowOffsetX += leanDir * (1 - normY) * 6.5 * swingFactor;
      }
    } else if (action === "Sit") {
      if (normY > 0.72) {
        rowOffsetX += (flipX ? 4.5 : -4.5) * ((normY - 0.72) / 0.28);
      }
      rowOffsetY += 1;
    }

    const destY = Math.round(baseBottomY - targetH + dy + rowOffsetY);
    if (destY < 0 || destY >= CELL_SIZE) continue;

    for (let dx = 0; dx < targetW; dx++) {
      const sxRaw = Math.floor((dx / targetW) * sw);
      const sx = flipX ? (sw - 1 - sxRaw) : sxRaw;
      const si = (sy * sw + sx) * 4;
      const a = src.data[si + 3];
      if (a === 0) continue;

      let localX = dx;
      if ((action === "Walk" || action === "Run") && normY > 0.72) {
        const wave = action === "Run" ? runWave * 4.5 : walkWave * 2.6;
        const isLeftHalf = dx < targetW * 0.5;
        localX += isLeftHalf ? wave : -wave;
      } else if (action === "Jump" && (col === 21 || col === 22) && normY > 0.74) {
        const spread = (normY - 0.74) * 10;
        const isLeftHalf = dx < targetW * 0.5;
        localX += isLeftHalf ? -spread : spread;
      } else if (action === "Guard" && normY > 0.72) {
        const isLeftHalf = dx < targetW * 0.5;
        localX += isLeftHalf ? -3.5 : 3.5;
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

  // Dash speed streaks & tan dust wisps
  if (action === "Dash") {
    const [ar, ag, ab] = auraRgb;
    const trailDir = facingSign !== 0 ? -facingSign : -1;
    const lines = [
      { y: 36, len: 20, off: 10 },
      { y: 54, len: 26, off: 14 },
      { y: 70, len: 22, off: 12 },
      { y: 84, len: 18, off: 8 },
    ];
    for (const ln of lines) {
      const startX = CELL_SIZE * 0.5 + trailDir * (ln.off + phase * 6);
      for (let t = 0; t < ln.len; t++) {
        const fade = Math.round((1 - t / ln.len) * 210 * dashSurge);
        const px = startX + trailDir * t;
        putPixelBlend(cell, CELL_SIZE, CELL_SIZE, px, ln.y, ar, ag, ab, fade);
        if (t < ln.len * 0.5) {
          putPixelBlend(cell, CELL_SIZE, CELL_SIZE, px, ln.y - 1, 255, 252, 238, Math.round(fade * 0.75));
        }
      }
    }
  }

  // Attack crescent weapon arc right on the action frames
  if (action === "Attack" && (col === 25 || col === 26)) {
    drawArcSlash(cell, facingSign !== 0 ? facingSign : 1, (col - 25) * 0.5, auraRgb);
  }

  // Guard energy shield right in front
  if (action === "Guard") {
    drawGuardBarrier(cell, facingSign !== 0 ? facingSign : 1);
  }

  // Cast celebratory / elemental charge sparkles
  if (action === "Cast") {
    const [ar, ag, ab] = auraRgb;
    const pulse = 0.7 + 0.3 * Math.sin(phase * Math.PI);
    const sparkles = [[20, 26], [76, 22], [24, 58], [72, 54], [48, 10]];
    sparkles.forEach(([sx, sy], idx) => {
      const syAnim = sy - Math.round((phase * 10 + idx * 2) % 12);
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim, 255, 255, 255, Math.round(240 * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx - 1, syAnim, ar, ag, ab, Math.round(180 * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx + 1, syAnim, ar, ag, ab, Math.round(180 * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim - 1, ar, ag, ab, Math.round(180 * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim + 1, ar, ag, ab, Math.round(180 * pulse));
    });
  }

  return cell;
}

async function bakeCharacter({ name, file, aura, height = 2.52, sideFacesRight = false, adapt = null }) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [s1, s2] = findTwoSplitColumns(data, info.width, info.height);

  let frontCut = await extractAndResizePose(data, info.width, info.height, 0, s1);
  let sideCut = await extractAndResizePose(data, info.width, info.height, s1, s2);
  let backCut = await extractAndResizePose(data, info.width, info.height, s2, info.width);

  if (adapt) {
    frontCut = adaptPoseColors(frontCut, adapt);
    sideCut = adaptPoseColors(sideCut, adapt);
    backCut = adaptPoseColors(backCut, adapt);
  }

  const sheetW = TOTAL_COLS * CELL_SIZE;
  const sheetH = TOTAL_ROWS * CELL_SIZE;
  const sheetBuf = Buffer.alloc(sheetW * sheetH * 4, 0);

  for (let row = 0; row < TOTAL_ROWS; row++) {
    for (let col = 0; col < TOTAL_COLS; col++) {
      const cell = renderCellFrom3Views(frontCut, sideCut, backCut, row, col, aura, sideFacesRight);
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
    world_height: height,
    directions: DIRECTIONS,
    columns: ACTION_COLUMNS,
  };
  fs.writeFileSync(atlasPath, JSON.stringify(atlas, null, 2), "utf8");
  console.log(`[Bake] ${name}: chibi=${frontCut.w}x${frontCut.h} cols=${TOTAL_COLS} -> ${path.relative(ROOT_DIR, sheetPath)}`);
}

/* ---------- Minimal Valid Binary glTF 2.0 Placeholder ---------- */
function buildMinimalGlb(outPath) {
  const positions = new Float32Array([-42, 0, 42, 42, 0, 42, 42, 0, -42, -42, 0, -42]);
  const normals = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
  const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
  const binBuf = Buffer.concat([
    Buffer.from(positions.buffer),
    Buffer.from(normals.buffer),
    Buffer.from(indices.buffer),
    Buffer.alloc(2, 0),
  ]);
  const gltf = {
    asset: { version: "2.0", generator: "Sanctuary25D-CityStub" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: "Walkable_Base", mesh: 0 }],
    meshes: [{ name: "Walkable_Base", primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 4, type: "VEC3", min: [-42, 0, -42], max: [42, 0, 42] },
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

  const specs = [
    { name: "Solar_Guard", file: path.join(TURNAROUND_DIR, "Solar_Guard_turnaround.jpg"), aura: [251, 191, 36], height: 2.52 },
    { name: "Astral_Sage", file: path.join(TURNAROUND_DIR, "Astral_Sage_turnaround.jpg"), aura: [56, 189, 248], height: 2.48 },
    { name: "Shadow_Reaper", file: path.join(TURNAROUND_DIR, "Shadow_Reaper_turnaround.jpg"), aura: [244, 63, 94], height: 2.52 },
    { name: "Curator_Ella", file: path.join(TURNAROUND_DIR, "Curator_Ella_turnaround.jpg"), aura: [251, 191, 36], height: 2.48 },
    { name: "Curator_Luna", file: path.join(TURNAROUND_DIR, "Curator_Luna_turnaround.jpg"), aura: [251, 113, 133], height: 2.48 },
    { name: "Curator_Leon", file: path.join(TURNAROUND_DIR, "Curator_Leon_turnaround.jpg"), aura: [52, 211, 153], height: 2.55, sideFacesRight: true },
    { name: "Citizen_Ranger", file: path.join(TURNAROUND_DIR, "Citizen_Ranger_turnaround.jpg"), aura: [250, 204, 21], height: 2.45 },
    { name: "Citizen_Minstrel", file: path.join(TURNAROUND_DIR, "Citizen_Minstrel_turnaround.jpg"), aura: [251, 113, 133], height: 2.46 },
    { name: "Citizen_Sura", file: path.join(TURNAROUND_DIR, "Citizen_Ranger_turnaround.jpg"), aura: [251, 146, 60], height: 2.46, adapt: { hueShift: 0.34, satMult: 1.1 } },
    { name: "Citizen_Mechanic", file: path.join(TURNAROUND_DIR, "Curator_Ella_turnaround.jpg"), aura: [56, 189, 248], height: 2.46, adapt: { hueShift: 0.16, satMult: 1.1 } },
  ];

  for (const sp of specs) {
    await bakeCharacter(sp);
  }

  const glbPath = path.join(MODEL_DIR, "sanctuary_environment.glb");
  buildMinimalGlb(glbPath);
  console.log(`[Bake] Environment GLB: ${path.relative(ROOT_DIR, glbPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
