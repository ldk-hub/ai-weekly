#!/usr/bin/env node
/**
 * Sanctuary 2.5D Original HD-2D Chibi Sprite & Environment Baker
 * Generates 100% original 8-directional 28-column sprite sheets (2688x768 RGBA PNG, 96x96 cell)
 * from 3-pose (Front | Profile | Back) magenta-chroma turnaround sheets under scripts/turnarounds/.
 * Includes dedicated Idle, Walk, Run, Dash, Jump, Cast/Cheer, and Sit motions.
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
  Idle: { start: 0, end: 3, fps: 6, loop: true },
  Walk: { start: 4, end: 9, fps: 10, loop: true },
  Run: { start: 10, end: 15, fps: 14, loop: true },
  Dash: { start: 16, end: 19, fps: 16, loop: false },
  Jump: { start: 20, end: 23, fps: 10, loop: false },
  Cast: { start: 24, end: 26, fps: 9, loop: false },
  Cheer: { start: 24, end: 26, fps: 9, loop: false },
  Interact: { start: 24, end: 26, fps: 9, loop: false },
  Attack: { start: 16, end: 19, fps: 14, loop: false },
  Sit: { start: 27, end: 27, fps: 4, loop: true },
  SitChair: { start: 27, end: 27, fps: 4, loop: true },
};

const TOTAL_COLS = 28;
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

async function extractAndResizePose(rgb, rw, rh, x0, x1, targetMaxH = 80, targetMaxW = 82) {
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

  // 3. Despill magenta fringe on edge pixels
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

  // 5. Resize proportionally with crisp Lanczos3 + subtle vividness polish & alpha threshold
  const scale = Math.min(targetMaxH / th, targetMaxW / tw);
  const rwOut = Math.max(1, Math.round(tw * scale));
  const rhOut = Math.max(1, Math.round(th * scale));

  const { data: resized, info } = await sharp(cropped, {
    raw: { width: tw, height: th, channels: 4 },
  })
    .resize(rwOut, rhOut, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = new Uint8Array(resized);
  const ow = info.width;
  const oh = info.height;
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 145) {
      out[i] = 0; out[i + 1] = 0; out[i + 2] = 0; out[i + 3] = 0;
    } else {
      out[i + 3] = 255;
      let r = out[i], g = out[i + 1], b = out[i + 2];
      const spill = Math.min(r, b) - g;
      if (spill > 40 && Math.abs(r - b) < 75 && r > 135 && b > 135) {
        r = Math.max(0, r - spill);
        b = Math.max(0, b - spill);
      }
      // Gentle anime color vibrancy boost (keeps skin & dark outlines clean)
      const [h, s, l] = rgbToHsl(r, g, b);
      if (l > 0.14 && l < 0.92 && s > 0.12) {
        [r, g, b] = hslToRgb(h, Math.min(1, s * 1.08), Math.min(0.95, l * 1.02));
      }
      out[i] = r; out[i + 1] = g; out[i + 2] = b;
    }
  }

  // 6. Clean warm sepia outline smoothing on outer rim
  for (let py = 1; py < oh - 1; py++) {
    for (let px = 1; px < ow - 1; px++) {
      const idx = py * ow + px;
      const di = idx * 4;
      if (out[di + 3] === 0) continue;
      const touchesBg =
        out[((py - 1) * ow + px) * 4 + 3] === 0 ||
        out[((py + 1) * ow + px) * 4 + 3] === 0 ||
        out[(py * ow + px - 1) * 4 + 3] === 0 ||
        out[(py * ow + px + 1) * 4 + 3] === 0;
      if (touchesBg) {
        const luma = (out[di] + out[di + 1] + out[di + 2]) / 3;
        if (luma < 90) {
          out[di] = Math.min(68, Math.round(out[di] * 0.75 + 14));
          out[di + 1] = Math.min(48, Math.round(out[di + 1] * 0.72 + 8));
          out[di + 2] = Math.min(46, Math.round(out[di + 2] * 0.72 + 8));
        }
      }
    }
  }

  return { w: ow, h: oh, data: out };
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

  // Map col (0..27) to action & normalized phase
  let action = "Idle", phase = 0;
  if (col <= 3) { action = "Idle"; phase = col / 4; }
  else if (col <= 9) { action = "Walk"; phase = (col - 4) / 6; }
  else if (col <= 15) { action = "Run"; phase = (col - 10) / 6; }
  else if (col <= 19) { action = "Dash"; phase = (col - 16) / 4; }
  else if (col <= 23) { action = "Jump"; phase = (col - 20) / 4; }
  else if (col <= 26) { action = "Cast"; phase = (col - 24) / 3; }
  else { action = "Sit"; phase = 0; }

  const facingSign = (dir === 6 || dir === 7 || dir === 5) ? 1 : (dir === 2 || dir === 1 || dir === 3) ? -1 : 0;
  const idleBob = action === "Idle" ? (col === 1 || col === 2 ? 1 : 0) : 0;
  const walkWave = action === "Walk" ? Math.sin(phase * Math.PI * 2) : 0;
  const walkLift = action === "Walk" ? -Math.abs(Math.round(Math.cos(phase * Math.PI * 2) * 1.8)) : 0;

  // Run: faster bounce, dynamic forward lean, wider stride
  const runWave = action === "Run" ? Math.sin(phase * Math.PI * 2) : 0;
  const runLift = action === "Run" ? -Math.abs(Math.round(Math.cos(phase * Math.PI * 2) * 3.5)) : 0;

  // Dash: strong forward lean + aerodynamic stretch
  const dashSurge = action === "Dash" ? Math.sin((phase + 0.15) * Math.PI * 0.85) : 0;

  // Jump: 0 = squash takeoff, 1..2 = tucked airborne stretch, 3 = landing prep
  let jumpScaleY = 1.0;
  let jumpScaleX = 1.0;
  let jumpLiftY = 0;
  if (action === "Jump") {
    if (col === 20) {
      jumpScaleY = 0.86; jumpScaleX = 1.12; jumpLiftY = 1;
    } else if (col === 21) {
      jumpScaleY = 1.08; jumpScaleX = 0.93; jumpLiftY = -6;
    } else if (col === 22) {
      jumpScaleY = 1.04; jumpScaleX = 0.96; jumpLiftY = -8;
    } else {
      jumpScaleY = 0.92; jumpScaleX = 1.06; jumpLiftY = -2;
    }
  }

  const castLift = action === "Cast" ? -Math.round(Math.sin((phase + 0.2) * Math.PI) * 3.2) : 0;
  const sitScaleY = action === "Sit" ? 0.84 : 1.0;

  const baseBottomY = CELL_SIZE - 4;
  const targetH = Math.min(84, sh) * sitScaleY * jumpScaleY * (action === "Dash" ? 0.94 : 1.0);
  const scaleY = targetH / sh;
  const targetW = Math.round(sw * widthScale * jumpScaleX * (action === "Dash" ? 1.08 : 1.0));

  for (let dy = 0; dy < Math.round(targetH); dy++) {
    const syFloat = dy / scaleY;
    const sy = Math.min(sh - 1, Math.floor(syFloat));
    const normY = sy / sh;

    let rowOffsetX = 0;
    let rowOffsetY = idleBob + walkLift + runLift + jumpLiftY + castLift;

    if (action === "Walk") {
      if (normY > 0.78) {
        rowOffsetX += walkWave * 2.5;
        rowOffsetY += normY > 0.88 ? Math.round(Math.abs(walkWave) * -1.4) : 0;
      } else if (normY > 0.4) {
        rowOffsetX += walkWave * 0.6;
      }
    } else if (action === "Run") {
      // Forward torso lean in movement direction
      const leanDir = facingSign !== 0 ? facingSign : 0.4;
      rowOffsetX += leanDir * (1 - normY) * 4.5;
      if (normY > 0.74) {
        rowOffsetX += runWave * 4.2;
        rowOffsetY += normY > 0.85 ? Math.round(Math.abs(runWave) * -2.6) : 0;
      } else if (normY < 0.35) {
        // Hair flutter back slightly
        rowOffsetX -= leanDir * Math.abs(runWave) * 1.1;
      }
    } else if (action === "Dash") {
      const leanDir = facingSign !== 0 ? facingSign : 0.7;
      rowOffsetX += leanDir * (1 - normY) * (7.5 * dashSurge);
      rowOffsetY += Math.round(-2 * dashSurge);
    } else if (action === "Jump") {
      if ((col === 21 || col === 22) && normY > 0.76) {
        // Tuck legs up slightly mid-air
        rowOffsetY -= Math.round((normY - 0.76) * 14);
      }
    } else if (action === "Sit") {
      if (normY > 0.74) {
        rowOffsetX += (flipX ? 3.5 : -3.5) * ((normY - 0.74) / 0.26);
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
      if ((action === "Walk" || action === "Run") && normY > 0.76) {
        const wave = action === "Run" ? runWave * 3.4 : walkWave * 1.9;
        const isLeftHalf = dx < targetW * 0.5;
        localX += isLeftHalf ? wave : -wave;
      } else if (action === "Jump" && (col === 21 || col === 22) && normY > 0.76) {
        const spread = (normY - 0.76) * 8;
        const isLeftHalf = dx < targetW * 0.5;
        localX += isLeftHalf ? -spread : spread;
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

  // Dash speedlines & subtle glowing edge trail
  if (action === "Dash") {
    const [ar, ag, ab] = auraRgb;
    const trailDir = facingSign !== 0 ? -facingSign : -1;
    const lines = [
      { y: 28, len: 18, off: 12 },
      { y: 46, len: 24, off: 16 },
      { y: 64, len: 20, off: 14 },
      { y: 78, len: 16, off: 10 },
    ];
    for (const ln of lines) {
      const startX = CELL_SIZE * 0.5 + trailDir * (ln.off + phase * 6);
      for (let t = 0; t < ln.len; t++) {
        const fade = Math.round((1 - t / ln.len) * 190 * dashSurge);
        const px = startX + trailDir * t;
        putPixelBlend(cell, CELL_SIZE, CELL_SIZE, px, ln.y, ar, ag, ab, fade);
        if (t < ln.len * 0.5) {
          putPixelBlend(cell, CELL_SIZE, CELL_SIZE, px, ln.y - 1, 255, 252, 238, Math.round(fade * 0.7));
        }
      }
    }
  }

  // Cast / Cheer celebratory sparkle aura
  if (action === "Cast") {
    const [ar, ag, ab] = auraRgb;
    const pulse = 0.6 + 0.4 * Math.sin(phase * Math.PI);
    const sparkles = [[22, 30], [74, 26], [26, 60], [70, 56], [48, 12]];
    sparkles.forEach(([sx, sy], idx) => {
      const syAnim = sy - Math.round((phase * 10 + idx * 2) % 12);
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim, 255, 255, 255, Math.round(235 * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx - 1, syAnim, ar, ag, ab, Math.round(170 * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx + 1, syAnim, ar, ag, ab, Math.round(170 * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim - 1, ar, ag, ab, Math.round(170 * pulse));
      putPixelBlend(cell, CELL_SIZE, CELL_SIZE, sx, syAnim + 1, ar, ag, ab, Math.round(170 * pulse));
    });
  }

  return cell;
}

async function bakeCharacter({ name, file, aura, height = 2.32, sideFacesRight = false, adapt = null }) {
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
  console.log(`[Bake] ${name}: front=${frontCut.w}x${frontCut.h} side=${sideCut.w}x${sideCut.h} back=${backCut.w}x${backCut.h} -> ${path.relative(ROOT_DIR, sheetPath)}`);
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
    { name: "Solar_Guard", file: path.join(TURNAROUND_DIR, "Solar_Guard_turnaround.jpg"), aura: [251, 191, 36], height: 2.32 },
    { name: "Astral_Sage", file: path.join(TURNAROUND_DIR, "Astral_Sage_turnaround.jpg"), aura: [56, 189, 248], height: 2.28 },
    { name: "Shadow_Reaper", file: path.join(TURNAROUND_DIR, "Shadow_Reaper_turnaround.jpg"), aura: [244, 63, 94], height: 2.32 },
    { name: "Curator_Ella", file: path.join(TURNAROUND_DIR, "Curator_Ella_turnaround.jpg"), aura: [251, 191, 36], height: 2.28 },
    { name: "Curator_Luna", file: path.join(TURNAROUND_DIR, "Curator_Luna_turnaround.jpg"), aura: [251, 113, 133], height: 2.28 },
    { name: "Curator_Leon", file: path.join(TURNAROUND_DIR, "Curator_Leon_turnaround.jpg"), aura: [52, 211, 153], height: 2.38, sideFacesRight: true },
    { name: "Citizen_Ranger", file: path.join(TURNAROUND_DIR, "Citizen_Ranger_turnaround.jpg"), aura: [250, 204, 21], height: 2.24 },
    { name: "Citizen_Minstrel", file: path.join(TURNAROUND_DIR, "Citizen_Minstrel_turnaround.jpg"), aura: [251, 113, 133], height: 2.28 },
    { name: "Citizen_Sura", file: path.join(TURNAROUND_DIR, "Citizen_Ranger_turnaround.jpg"), aura: [251, 146, 60], height: 2.24, adapt: { hueShift: 0.34, satMult: 1.1 } },
    { name: "Citizen_Mechanic", file: path.join(TURNAROUND_DIR, "Curator_Ella_turnaround.jpg"), aura: [56, 189, 248], height: 2.24, adapt: { hueShift: 0.16, satMult: 1.1 } },
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
