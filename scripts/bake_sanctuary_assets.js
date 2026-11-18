#!/usr/bin/env node
/**
 * Sanctuary 2.5D Beautified Anime Chibi Sprite & Environment Baker
 * Generates:
 *  - 6x Beautified 8-Directional Anime SD Sprite Sheets (3072x1024 RGBA PNG, 24x8, 128x128 native cell)
 *    - Playable Avatars: Solar_Guard, Astral_Sage, Shadow_Reaper
 *    - Archive Curators: Curator_Ella, Curator_Luna, Poring_Slime
 *  - 6x Atlas Metadata JSONs (*_8dir_atlas.json)
 *  - 1x Binary glTF 2.0 Medieval Sanctuary Environment (sanctuary_environment.glb)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const SPRITE_DIR = path.join(ROOT_DIR, "site/public/assets/sprites");
const MODEL_DIR = path.join(ROOT_DIR, "site/public/assets/models");

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

function hexToRgba(hex, a = 255) {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
    a,
  ];
}

const OUTLINE_RGBA = hexToRgba("#362024"); // Warm cocoa-plum outline
const WHITE = hexToRgba("#ffffff");
const SKIN = {
  hi: hexToRgba("#fff6f0"),
  base: hexToRgba("#ffe4d2"),
  sh: hexToRgba("#f0bfa5"),
};
const BLUSH = hexToRgba("#fca5a5");
const MOUTH = hexToRgba("#d47a7a");
const LASH = hexToRgba("#2f1a20");

/* ---------- 128x128 High-Detail Pixel Canvas ---------- */
class HiResPixelGrid {
  constructor(size = CELL_SIZE) {
    this.size = size;
    this.data = new Uint8Array(size * size * 4);
    this.lockedMask = new Uint8Array(size * size);
  }

  set(x, y, rgba, isVfx = false) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.size || iy >= this.size || rgba[3] === 0) return;
    const idx = (iy * this.size + ix) * 4;
    this.data[idx] = rgba[0];
    this.data[idx + 1] = rgba[1];
    this.data[idx + 2] = rgba[2];
    this.data[idx + 3] = rgba[3];
    if (isVfx) this.lockedMask[iy * this.size + ix] = 1;
  }

  rect(x, y, w, h, rgba, isVfx = false) {
    const x0 = Math.round(x);
    const y0 = Math.round(y);
    const x1 = x0 + Math.round(w);
    const y1 = y0 + Math.round(h);
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        this.set(px, py, rgba, isVfx);
      }
    }
  }

  ellipse(cx, cy, rx, ry, ramp, lightBias = -0.25, isVfx = false) {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const nx = (px - cx) / Math.max(0.5, rx);
        const ny = (py - cy) / Math.max(0.5, ry);
        if (nx * nx + ny * ny <= 1.0) {
          let col = ramp.base;
          if (ny < -0.35 && nx < 0.35 - lightBias) col = ramp.hi;
          if (ny > 0.5 || nx > 0.6 - lightBias) col = ramp.sh;
          this.set(px, py, col, isVfx);
        }
      }
    }
  }

  flaredShape(cx, topY, topW, botW, height, ramp, lightShift = 0, waveAmp = 0) {
    const h = Math.max(1, Math.round(height));
    for (let dy = 0; dy < h; dy++) {
      const t = h > 1 ? dy / (h - 1) : 0;
      const curve = Math.pow(t, 0.85);
      const w = Math.max(1, Math.round(topW + (botW - topW) * curve));
      const xStart = Math.round(cx - w * 0.5);
      for (let dx = 0; dx < w; dx++) {
        const nx = w > 1 ? (dx / (w - 1)) * 2 - 1 : 0;
        // Scalloped hem at bottom
        if (waveAmp > 0 && dy >= h - 3) {
          const scallop = Math.sin((dx / Math.max(1, w)) * Math.PI * 5);
          if (scallop < -0.35 && dy === h - 1) continue;
        }
        let col = ramp.base;
        if (dy <= 1 || nx < -0.55 + lightShift * 0.25) col = ramp.hi;
        if (dy >= h - 2 || nx > 0.55 + lightShift * 0.25) col = ramp.sh;
        this.set(xStart + dx, topY + dy, col);
      }
    }
  }

  line(x0, y0, x1, y1, rgba, thickness = 2, isVfx = false) {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.4));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      if (thickness <= 1) this.set(px, py, rgba, isVfx);
      else this.rect(px - thickness * 0.5, py - thickness * 0.5, thickness, thickness, rgba, isVfx);
    }
  }

  applyOutline(outlineRgba = OUTLINE_RGBA) {
    const copy = new Uint8Array(this.data);
    const s = this.size;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
    // 2px crisp warm outline around opaque character body
    for (let pass = 0; pass < 2; pass++) {
      const snap = pass === 0 ? copy : new Uint8Array(this.data);
      const stepDirs = pass === 0 ? dirs.slice(0, 4) : dirs.slice(0, 4);
      for (let y = 2; y < s - 2; y++) {
        for (let x = 2; x < s - 2; x++) {
          const i = (y * s + x) * 4;
          if (snap[i + 3] > 0) continue;
          let touch = false;
          for (const [dx, dy] of stepDirs) {
            const nIdx = (y + dy) * s + (x + dx);
            if (snap[nIdx * 4 + 3] > 0 && this.lockedMask[nIdx] === 0) {
              touch = true;
              break;
            }
          }
          if (touch) {
            this.data[i] = outlineRgba[0];
            this.data[i + 1] = outlineRgba[1];
            this.data[i + 2] = outlineRgba[2];
            this.data[i + 3] = 255;
          }
        }
      }
    }
  }
}

/* ---------- Action Pose Solver ---------- */
function getActionPose(col) {
  if (col <= 3) {
    return { action: "Idle", phase: col / 4, bob: col === 1 || col === 2 ? -2 : 0, stride: 0, armSwing: 0, atk: 0, cast: 0, sitDrop: 0 };
  }
  if (col <= 9) {
    const idx = col - 4;
    const phase = idx / 6;
    const wave = Math.sin(phase * Math.PI * 2);
    return { action: "Walk", phase, bob: idx % 3 === 1 ? -2 : 0, stride: Math.round(wave * 6), armSwing: Math.round(wave * 4), atk: 0, cast: 0, sitDrop: 0 };
  }
  if (col <= 15) {
    const idx = col - 10;
    return { action: "Attack", phase: idx / 5, bob: idx === 2 || idx === 3 ? -2 : 0, stride: idx >= 2 ? 4 : -2, armSwing: -4, atk: idx / 5, cast: 0, sitDrop: 0 };
  }
  if (col <= 20) {
    const idx = col - 16;
    return { action: "Cast", phase: idx / 4, bob: idx % 2 === 0 ? -2 : 0, stride: 0, armSwing: -8, atk: 0, cast: 0.6 + 0.4 * Math.sin((idx / 4) * Math.PI), sitDrop: 0 };
  }
  const idx = col - 21;
  return { action: "Sit", phase: idx / 3, bob: idx === 1 ? 1 : 0, stride: 0, armSwing: 0, atk: 0, cast: 0, sitDrop: 14 };
}

/* ---------- Beautified Character Archetypes ---------- */
const ARCHETYPES = {
  Solar_Guard: {
    // Royal Archivist: Coral-blonde wavy long hair, ruby eyes, ivory & rose-gold frilled coat + winged tiara
    hair: { hi: hexToRgba("#fbd0bd"), base: hexToRgba("#e88f76"), sh: hexToRgba("#ad5243") },
    eyeTop: hexToRgba("#9f1239"),
    eyeBot: hexToRgba("#fb7185"),
    dress: { hi: hexToRgba("#fffbf2"), base: hexToRgba("#f2e4ce"), sh: hexToRgba("#c7b293") },
    coat: { hi: hexToRgba("#f43f5e"), base: hexToRgba("#be123c"), sh: hexToRgba("#7f1d1d") },
    trim: { hi: hexToRgba("#fef08a"), base: hexToRgba("#f59e0b"), sh: hexToRgba("#b45309") },
    lace: { hi: WHITE, base: hexToRgba("#f8fafc"), sh: hexToRgba("#e2e8f0") },
    cape: { hi: hexToRgba("#3b5998"), base: hexToRgba("#1e3a6e"), sh: hexToRgba("#112142") },
    boots: { hi: hexToRgba("#f5ebd6"), base: hexToRgba("#c9b08a"), sh: hexToRgba("#7d6544") },
    vfx: hexToRgba("#fbbf24"),
    hairStyle: "wavy_long",
    hatStyle: "winged_tiara",
    propStyle: "grimoire_quill",
  },
  Astral_Sage: {
    // Astral Weaver: Pastel mint-silver waist-length hair, emerald-sapphire eyes, cobalt-ivory robe + halo
    hair: { hi: hexToRgba("#f0fdfa"), base: hexToRgba("#a7e8d8"), sh: hexToRgba("#5ca89a") },
    eyeTop: hexToRgba("#0369a1"),
    eyeBot: hexToRgba("#34d399"),
    dress: { hi: WHITE, base: hexToRgba("#e0ecfa"), sh: hexToRgba("#a8c2e6") },
    coat: { hi: hexToRgba("#476ec4"), base: hexToRgba("#29458a"), sh: hexToRgba("#172754") },
    trim: { hi: hexToRgba("#fef08a"), base: hexToRgba("#eab308"), sh: hexToRgba("#a16207") },
    lace: { hi: WHITE, base: hexToRgba("#f1f5f9"), sh: hexToRgba("#cbd5e1") },
    cape: { hi: hexToRgba("#60a5fa"), base: hexToRgba("#2563eb"), sh: hexToRgba("#1e3a8a") },
    boots: { hi: hexToRgba("#b87c56"), base: hexToRgba("#855233"), sh: hexToRgba("#52301b") },
    vfx: hexToRgba("#38bdf8"),
    hairStyle: "straight_long",
    hatStyle: "star_halo",
    propStyle: "astral_staff",
  },
  Shadow_Reaper: {
    // Shadow Chronicler: Lavender-silver ponytail, amethyst eyes, fluffy white fur capelet + velvet plum dress
    hair: { hi: hexToRgba("#faf5ff"), base: hexToRgba("#cfc5f2"), sh: hexToRgba("#7e6fa8") },
    eyeTop: hexToRgba("#6d28d9"),
    eyeBot: hexToRgba("#f472b6"),
    dress: { hi: hexToRgba("#6b4f85"), base: hexToRgba("#432f57"), sh: hexToRgba("#241733") },
    coat: { hi: hexToRgba("#fb7185"), base: hexToRgba("#be185d"), sh: hexToRgba("#6b0b34") },
    trim: { hi: WHITE, base: hexToRgba("#f5ebe6"), sh: hexToRgba("#cbb9b2") }, // Fluffy white fur capelet
    lace: { hi: hexToRgba("#fdf2f8"), base: hexToRgba("#fbcfe8"), sh: hexToRgba("#f472b6") },
    cape: { hi: hexToRgba("#523a69"), base: hexToRgba("#2e1e3d"), sh: hexToRgba("#170d21") },
    boots: { hi: hexToRgba("#475569"), base: hexToRgba("#293345"), sh: hexToRgba("#141a24") },
    vfx: hexToRgba("#f43f5e"),
    hairStyle: "ponytail",
    hatStyle: "ribbon_bow",
    propStyle: "lantern_ribbon",
  },
  Curator_Ella: {
    // Plugin Alchemist Ella: Honey-gold twintails, emerald eyes, ivory-gold scholar coat + beret
    hair: { hi: hexToRgba("#fef9c3"), base: hexToRgba("#fcd34d"), sh: hexToRgba("#d97706") },
    eyeTop: hexToRgba("#047857"),
    eyeBot: hexToRgba("#6ee7b7"),
    dress: { hi: WHITE, base: hexToRgba("#f5efe2"), sh: hexToRgba("#d4c5aa") },
    coat: { hi: hexToRgba("#34d399"), base: hexToRgba("#059669"), sh: hexToRgba("#065f46") },
    trim: { hi: hexToRgba("#fef08a"), base: hexToRgba("#f59e0b"), sh: hexToRgba("#b45309") },
    lace: { hi: WHITE, base: hexToRgba("#f8fafc"), sh: hexToRgba("#e2e8f0") },
    cape: { hi: hexToRgba("#10b981"), base: hexToRgba("#047857"), sh: hexToRgba("#064e3b") },
    boots: { hi: hexToRgba("#a16207"), base: hexToRgba("#78350f"), sh: hexToRgba("#451a03") },
    vfx: hexToRgba("#fbbf24"),
    hairStyle: "twintails",
    hatStyle: "scholar_beret",
    propStyle: "grimoire_quill",
  },
  Curator_Luna: {
    // Social Minstrel Luna: Sakura-pink twin curls, sky-blue eyes, rose-white minstrel dress + flower bow
    hair: { hi: hexToRgba("#fff1f2"), base: hexToRgba("#fda4af"), sh: hexToRgba("#e11d48") },
    eyeTop: hexToRgba("#0284c7"),
    eyeBot: hexToRgba("#7dd3fc"),
    dress: { hi: WHITE, base: hexToRgba("#fff1f2"), sh: hexToRgba("#fecdd3") },
    coat: { hi: hexToRgba("#fb7185"), base: hexToRgba("#e11d48"), sh: hexToRgba("#9f1239") },
    trim: { hi: hexToRgba("#fef08a"), base: hexToRgba("#fbbf24"), sh: hexToRgba("#b45309") },
    lace: { hi: WHITE, base: hexToRgba("#fff1f2"), sh: hexToRgba("#ffe4e6") },
    cape: { hi: hexToRgba("#f43f5e"), base: hexToRgba("#be123c"), sh: hexToRgba("#881337") },
    boots: { hi: hexToRgba("#fda4af"), base: hexToRgba("#e11d48"), sh: hexToRgba("#881337") },
    vfx: hexToRgba("#fb7185"),
    hairStyle: "wavy_long",
    hatStyle: "ribbon_bow",
    propStyle: "rose_harp",
  },
};

function drawAnimeEye(g, ex, ey, pal) {
  // Eyelash arch
  g.rect(ex - 1, ey, 6, 1, LASH);
  g.rect(ex, ey + 1, 5, 1, LASH);
  // Saturated iris gradient
  g.rect(ex, ey + 2, 5, 3, pal.eyeTop);
  g.rect(ex + 1, ey + 5, 4, 2, pal.eyeBot);
  // Crisp anime eye sparkle
  g.rect(ex + 1, ey + 2, 2, 2, WHITE);
  g.set(ex + 4, ey + 5, WHITE);
}

function drawCuratorProps(g, pal, pose, dir, cx, shoulderY, isFront) {
  const dirRad = (dir * Math.PI) / 4;
  const sinD = Math.sin(dirRad);
  const cosD = Math.cos(dirRad);

  const rX = Math.round(cx - 14 * cosD - 3 * sinD);
  const lX = Math.round(cx + 14 * cosD - 3 * sinD);
  const rZ = 14 * sinD + 2 * cosD;
  const lZ = -14 * sinD + 2 * cosD;

  const drawArm = (isMain, ax, zVal) => {
    if ((zVal >= -1) !== isFront) return;
    const lift = pose.action === "Cast" ? -9 : pose.action === "Attack" && isMain ? -6 : Math.round(pose.armSwing * 0.5);
    const ay = shoulderY + 3 + lift;

    // Ruffled cute sleeve + skin hand
    g.ellipse(ax, ay + 4, 4, 6, pal.dress, -sinD * 0.2);
    g.ellipse(ax, ay + 10, 3, 3, SKIN);

    if (!isMain) {
      if (pal.propStyle === "grimoire_quill") {
        // Open Floating Gold Grimoire
        g.rect(ax - 5, ay + 5, 10, 8, pal.trim.base);
        g.rect(ax - 4, ay + 6, 8, 6, WHITE);
        g.set(ax, ay + 8, pal.vfx, true);
      }
      return;
    }

    if (pal.propStyle === "grimoire_quill") {
      const sign = dir >= 5 ? 1 : -1;
      g.line(ax, ay + 9, ax + sign * 12, ay - 12, pal.trim.hi, 2);
      g.ellipse(ax + sign * 12, ay - 13, 3, 3, { hi: WHITE, base: pal.vfx, sh: pal.trim.sh }, 0, true);
    } else if (pal.propStyle === "astral_staff") {
      const sign = dir >= 5 ? 1 : -1;
      const sx = ax + sign * 5;
      const topY = ay - (pose.action === "Cast" ? 22 : 16);
      g.line(sx, ay + 18, sx, topY + 4, hexToRgba("#9a6544"), 3);
      g.ellipse(sx, topY, 5, 5, pal.trim);
      g.ellipse(sx, topY, 3, 3, { hi: WHITE, base: pal.vfx, sh: pal.cape.base }, 0, true);
    } else if (pal.propStyle === "lantern_ribbon") {
      const lx = ax + (dir === 2 ? -5 : 5);
      g.line(ax, ay + 9, lx, ay + 13, pal.trim.base, 2);
      g.ellipse(lx, ay + 16, 4, 5, { hi: WHITE, base: pal.vfx, sh: pal.coat.sh }, 0, true);
    } else if (pal.propStyle === "rose_harp") {
      const hx = ax + (dir === 2 ? -5 : 5);
      g.ellipse(hx, ay + 7, 5, 7, pal.trim);
      g.line(hx - 2, ay + 3, hx - 2, ay + 11, WHITE, 1);
      g.line(hx + 1, ay + 3, hx + 1, ay + 11, WHITE, 1);
    }
  };

  drawArm(true, rX, rZ);
  drawArm(false, lX, lZ);
}

function drawBeautifiedHero(archetype, dir, col) {
  const pal = ARCHETYPES[archetype];
  const pose = getActionPose(col);
  const g = new HiResPixelGrid(CELL_SIZE);

  const dirRad = (dir * Math.PI) / 4;
  const sinD = Math.sin(dirRad); // +1: W(left), -1: E(right)
  const cosD = Math.cos(dirRad); // +1: S(front), -1: N(back)
  const facingBack = cosD < -0.25;
  const facingSide = Math.abs(sinD) > 0.65;

  const cx = 64;
  const shiftY = pose.bob + pose.sitDrop;
  const headY = 44 + shiftY;
  const neckY = 63 + shiftY;
  const waistY = 82 + shiftY;

  // 1. Flowing Back Long Hair (visible behind body in front/side views too!)
  if (!facingBack) {
    if (pal.hairStyle === "wavy_long" || pal.hairStyle === "straight_long") {
      const sway = pose.action === "Walk" ? Math.round(Math.sin(pose.phase * Math.PI * 2) * 3) : 0;
      g.flaredShape(cx + Math.round(sinD * 5) + sway, headY + 4, 28, 38, 42 - Math.floor(pose.sitDrop * 0.4), pal.hair, sinD, 2);
    } else if (pal.hairStyle === "twintails") {
      const sway = pose.action === "Walk" ? Math.round(Math.sin(pose.phase * Math.PI * 2) * 3) : 0;
      g.flaredShape(cx - 18 + sway, headY + 2, 8, 15, 34, pal.hair, sinD);
      g.flaredShape(cx + 18 - sway, headY + 2, 8, 15, 34, pal.hair, sinD);
    } else if (pal.hairStyle === "ponytail") {
      const pX = cx + Math.round(sinD * 10) + 8;
      g.flaredShape(pX, headY - 2, 9, 17, 36, pal.hair, sinD);
    }
  }

  // 2. Back Layer Arms & Props
  drawCuratorProps(g, pal, pose, dir, cx, neckY, false);

  // 3. Trailing Flared Cape
  if (!facingBack) {
    const capeH = Math.max(16, 36 - Math.floor(pose.sitDrop * 0.6));
    g.flaredShape(cx + Math.round(sinD * 6), neckY + 4, 24, 34, capeH, pal.cape, sinD);
  }

  // 4. Slender Anime Legs, Stockings & Buckled Boots
  if (pose.action === "Sit") {
    g.flaredShape(cx - 8, 110, 9, 11, 10, pal.boots);
    g.flaredShape(cx + 8, 110, 9, 11, 10, pal.boots);
    g.flaredShape(cx, 103, 28, 34, 8, pal.coat);
  } else {
    const spread = facingSide ? 3 : 7;
    const lx = cx - spread + Math.round(pose.stride * (facingSide ? 1 : 0.35));
    const rx = cx + spread - Math.round(pose.stride * (facingSide ? 1 : 0.35));
    const ly = waistY + 14 + (pose.stride > 0 ? -2 : 0);
    const ry = waistY + 14 + (pose.stride < 0 ? -2 : 0);
    // Warm thigh skin + knee stockings + cute boots
    g.rect(lx - 3, waistY + 4, 6, 12, SKIN.base);
    g.rect(rx - 3, waistY + 4, 6, 12, SKIN.base);
    g.flaredShape(lx, ly, 7, 9, 17, pal.boots, sinD);
    g.flaredShape(rx, ry, 7, 9, 17, pal.boots, sinD);
    g.rect(lx - 3, ly + 2, 6, 3, pal.trim.base);
    g.rect(rx - 3, ry + 2, 6, 3, pal.trim.base);
  }

  // 5. Frilled Petticoat Lace + A-Line Coat/Dress
  const skirtH = Math.max(12, 24 - Math.floor(pose.sitDrop * 0.45));
  g.flaredShape(cx, waistY - 1, 22, 40, skirtH + 4, pal.lace, sinD, 3);
  g.flaredShape(cx, waistY - 2, 20, 36, skirtH, pal.coat, sinD, 2);

  // Fitted Bodice + Ribbons
  const chestW = facingSide ? 18 : 22;
  g.flaredShape(cx, neckY, chestW - 2, chestW + 2, 20, pal.dress, sinD);
  // Gold waist sash & bow
  g.rect(cx - Math.floor(chestW / 2), waistY - 3, chestW, 4, pal.trim.base);
  g.rect(cx - 4 + Math.round(-sinD * 3), waistY - 4, 8, 5, pal.coat.hi);
  g.set(cx + Math.round(-sinD * 3), waistY - 2, pal.trim.hi);

  // 6. Capelet / Fur Mantle / Royal Collar
  const mantleW = facingSide ? 18 : 30;
  g.flaredShape(cx, neckY - 2, mantleW - 4, mantleW + 4, 10, pal.trim, sinD, 2);

  // 7. Full Back Cape & Hair (N / NW / NE)
  if (facingBack) {
    const backCapeH = Math.max(18, 38 - Math.floor(pose.sitDrop * 0.55));
    g.flaredShape(cx, neckY + 2, 24, 38, backCapeH, pal.cape, sinD, 2);
    g.flaredShape(cx, neckY + 8, 8, 12, 10, pal.trim, sinD);
  }

  // 8. Cute Sculpted Anime Head, Sparkling Eyes, Blush & Smile
  const headRx = facingSide ? 13 : 16;
  if (!facingBack) {
    g.ellipse(cx, headY + 2, headRx, 14, SKIN, -sinD * 0.25);
    // Soft jaw shadow
    g.rect(cx - 6, headY + 14, 12, 2, SKIN.sh);

    const eyeCenter = cx + Math.round(-sinD * 6);
    if (facingSide) {
      const ex = cx + (sinD > 0 ? -7 : 2);
      drawAnimeEye(g, ex, headY + 1, pal);
      g.rect(ex + (sinD > 0 ? 1 : -1), headY + 9, 4, 2, BLUSH);
    } else {
      drawAnimeEye(g, eyeCenter - 10, headY + 1, pal);
      drawAnimeEye(g, eyeCenter + 5, headY + 1, pal);
      // Rosy Anime Cheek Blush & Cute Smile
      g.rect(eyeCenter - 12, headY + 9, 5, 2, BLUSH);
      g.rect(eyeCenter + 7, headY + 9, 5, 2, BLUSH);
      g.rect(eyeCenter - 1, headY + 11, 3, 1, MOUTH);
    }
  }

  // 9. Glossy Layered Hair Crown, Bangs & Angel Halo Highlight
  g.ellipse(cx, headY - 7, headRx + 3, facingBack ? 14 : 10, pal.hair, -sinD * 0.25);
  if (!facingBack) {
    // Graceful framing side-locks (애교머리)
    g.flaredShape(cx - headRx - 1, headY - 4, 6, 4, 21, pal.hair);
    g.flaredShape(cx + headRx + 1, headY - 4, 6, 4, 21, pal.hair);
    // Wispy parted anime bangs
    g.flaredShape(cx - 7, headY - 11, 9, 6, 11, pal.hair);
    g.flaredShape(cx + 6, headY - 11, 9, 6, 11, pal.hair);
    g.flaredShape(cx, headY - 11, 6, 3, 12, pal.hair);
    // Glossy Hair Angel Ring Highlight
    g.rect(cx - 10, headY - 10, 8, 2, pal.hair.hi);
    g.rect(cx + 2, headY - 10, 8, 2, pal.hair.hi);
  } else {
    g.flaredShape(cx, headY - 6, 34, 38, 30, pal.hair, sinD, 2);
    g.rect(cx - 10, headY - 8, 20, 3, pal.hair.hi);
  }

  // Cute Hair Ornament / Tiara / Halo / Beret
  if (pal.hatStyle === "winged_tiara") {
    g.rect(cx - 10, headY - 14, 20, 4, pal.trim.hi);
    g.rect(cx - 13, headY - 17, 4, 5, WHITE);
    g.rect(cx + 9, headY - 17, 4, 5, WHITE);
    g.rect(cx - 2, headY - 16, 4, 4, hexToRgba("#f43f5e"));
  } else if (pal.hatStyle === "star_halo") {
    g.ellipse(cx, headY - 22, 12, 3, { hi: WHITE, base: pal.trim.hi, sh: pal.trim.base }, 0, true);
  } else if (pal.hatStyle === "ribbon_bow") {
    g.rect(cx - 11, headY - 16, 8, 5, pal.coat.hi);
    g.rect(cx + 3, headY - 16, 8, 5, pal.coat.hi);
    g.rect(cx - 3, headY - 15, 6, 4, pal.trim.hi);
  } else if (pal.hatStyle === "scholar_beret") {
    g.ellipse(cx + 3, headY - 15, 13, 6, pal.coat, -0.2);
    g.rect(cx + 2, headY - 22, 3, 3, pal.trim.hi);
  }

  // 10. Front Layer Arms & Props
  drawCuratorProps(g, pal, pose, dir, cx, neckY, true);

  // 11. Warm 2px Cocoa-Plum Silhouette Outline
  g.applyOutline();

  // 12. Soft Starlight VFX Sparkles during Cast/Interact
  if (pose.action === "Cast" || (pose.action === "Attack" && pose.atk >= 0.3 && pose.atk <= 0.8)) {
    const sx = cx + Math.round(-sinD * 18);
    g.rect(sx - 5, neckY + 2, 10, 2, WHITE, true);
    g.rect(sx - 1, neckY - 2, 2, 10, pal.vfx, true);
    g.rect(cx - 22, headY - 8, 4, 4, pal.vfx, true);
    g.rect(cx + 20, headY - 14, 3, 3, WHITE, true);
  }

  return g.data;
}

/* ---------- Star Poring Mascot Sprite ---------- */
function drawCutePoring(dir, col) {
  const pose = getActionPose(col);
  const g = new HiResPixelGrid(CELL_SIZE);
  const dirRad = (dir * Math.PI) / 4;
  const sinD = Math.sin(dirRad);
  const cosD = Math.cos(dirRad);
  const facingBack = cosD < -0.25;
  const cx = 64;

  const jelly = { hi: hexToRgba("#fff1f2"), base: hexToRgba("#fda4af"), sh: hexToRgba("#f43f5e") };
  const wing = { hi: WHITE, base: hexToRgba("#f8fafc"), sh: hexToRgba("#cbd5e1") };
  const crown = { hi: hexToRgba("#fef08a"), base: hexToRgba("#fbbf24"), sh: hexToRgba("#b45309") };

  const hop = pose.action === "Walk" || pose.action === "Attack" ? Math.round(Math.abs(Math.sin(pose.phase * Math.PI)) * -14) : pose.bob;
  const squat = hop < -4 ? -2 : 2;
  const cy = 98 + hop;

  // Cute Angel Mini Wings
  g.ellipse(cx - 26, cy - 6, 7, 5, wing);
  g.ellipse(cx + 26, cy - 6, 7, 5, wing);
  // Soft Jelly Dome
  g.ellipse(cx, cy, 24 + squat, 20 - squat, jelly);
  // Gloss Highlight
  g.ellipse(cx - 10, cy - 11, 5, 3, { hi: WHITE, base: WHITE, sh: WHITE });

  // Mini Golden Star Crown
  g.rect(cx - 8, cy - 25, 16, 6, crown.base);
  g.rect(cx - 9, cy - 29, 4, 5, crown.hi);
  g.rect(cx - 2, cy - 31, 4, 7, crown.hi);
  g.rect(cx + 5, cy - 29, 4, 5, crown.hi);

  if (!facingBack) {
    const ex = cx + Math.round(-sinD * 8);
    // Cute Sparkling Poring Eyes + Cheek Blush
    g.rect(ex - 9, cy - 3, 4, 6, LASH);
    g.rect(ex + 5, cy - 3, 4, 6, LASH);
    g.rect(ex - 8, cy - 2, 2, 2, WHITE);
    g.rect(ex + 6, cy - 2, 2, 2, WHITE);
    g.rect(ex - 14, cy + 4, 5, 3, hexToRgba("#fb7185"));
    g.rect(ex + 9, cy + 4, 5, 3, hexToRgba("#fb7185"));
    g.rect(ex - 2, cy + 4, 4, 2, MOUTH);
  }

  g.applyOutline();
  return g.data;
}

/* ---------- Bake Sprite Sheet & JSON ---------- */
async function bakeActorSprite(actorName, worldHeight = 2.5) {
  const sheetW = TOTAL_COLS * CELL_SIZE;
  const sheetH = TOTAL_ROWS * CELL_SIZE;
  const sheetBuf = Buffer.alloc(sheetW * sheetH * 4, 0);

  for (let row = 0; row < TOTAL_ROWS; row++) {
    for (let col = 0; col < TOTAL_COLS; col++) {
      const cell = actorName === "Poring_Slime" ? drawCutePoring(row, col) : drawBeautifiedHero(actorName, row, col);
      for (let py = 0; py < CELL_SIZE; py++) {
        const srcOff = py * CELL_SIZE * 4;
        const dstOff = ((row * CELL_SIZE + py) * sheetW + col * CELL_SIZE) * 4;
        Buffer.from(cell.buffer, srcOff, CELL_SIZE * 4).copy(sheetBuf, dstOff);
      }
    }
  }

  const sheetFilename = `${actorName}_8dir_sheet.png`;
  const atlasFilename = `${actorName}_8dir_atlas.json`;
  const sheetPath = path.join(SPRITE_DIR, sheetFilename);
  const atlasPath = path.join(SPRITE_DIR, atlasFilename);

  await sharp(sheetBuf, { raw: { width: sheetW, height: sheetH, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(sheetPath);

  const atlas = {
    name: actorName,
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

/* ---------- Binary glTF 2.0 (.glb) Medieval Sanctuary Builder ---------- */
function createBoxGeometryData(cx, cy, cz, sx, sy, sz) {
  const hx = sx * 0.5, hy = sy * 0.5, hz = sz * 0.5;
  const faces = [
    { n: [0, 0, 1], v: [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]] },
    { n: [0, 0, -1], v: [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]] },
    { n: [0, 1, 0], v: [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]] },
    { n: [0, -1, 0], v: [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]] },
    { n: [1, 0, 0], v: [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]] },
    { n: [-1, 0, 0], v: [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]] },
  ];

  const positions = [];
  const normals = [];
  const indices = [];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  faces.forEach((f, fi) => {
    const base = fi * 4;
    for (const [vx, vy, vz] of f.v) {
      const px = cx + vx, py = cy + vy, pz = cz + vz;
      positions.push(px, py, pz);
      normals.push(f.n[0], f.n[1], f.n[2]);
      min[0] = Math.min(min[0], px); min[1] = Math.min(min[1], py); min[2] = Math.min(min[2], pz);
      max[0] = Math.max(max[0], px); max[1] = Math.max(max[1], py); max[2] = Math.max(max[2], pz);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  });

  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices), min, max };
}

function buildSanctuaryGlb(outPath) {
  const materials = [
    { name: "StoneFloor", pbrMetallicRoughness: { baseColorFactor: [0.16, 0.2, 0.27, 1], roughnessFactor: 0.9, metallicFactor: 0.08 } },
    { name: "DaisMarble", pbrMetallicRoughness: { baseColorFactor: [0.27, 0.31, 0.38, 1], roughnessFactor: 0.78, metallicFactor: 0.14 } },
    { name: "GoldTrim", pbrMetallicRoughness: { baseColorFactor: [0.88, 0.68, 0.22, 1], roughnessFactor: 0.35, metallicFactor: 0.75 } },
    { name: "RuneCrystal", pbrMetallicRoughness: { baseColorFactor: [0.22, 0.78, 0.96, 1], roughnessFactor: 0.2, metallicFactor: 0.2 }, emissiveFactor: [0.08, 0.32, 0.45] },
    { name: "EmberCore", pbrMetallicRoughness: { baseColorFactor: [0.96, 0.48, 0.14, 1], roughnessFactor: 0.3, metallicFactor: 0.1 }, emissiveFactor: [0.65, 0.24, 0.04] },
  ];

  const objects = [
    { name: "Walkable_MainFloor", mat: 0, box: [0, -0.25, 0, 34, 0.5, 34] },
    { name: "Walkable_InnerDais", mat: 1, box: [0, 0.04, 0, 13, 0.08, 13] },
    { name: "Walkable_AltarStep", mat: 1, box: [0, 0.12, -5.2, 6.2, 0.16, 3.8] },
    { name: "Sanctuary_AltarBase", mat: 1, box: [0, 0.65, -5.6, 3.2, 0.9, 1.8] },
    { name: "Sanctuary_AltarTrim", mat: 2, box: [0, 1.14, -5.6, 3.4, 0.12, 2.0] },
    { name: "Sanctuary_Crystal", mat: 3, box: [0, 2.15, -5.6, 0.7, 1.2, 0.7] },
    { name: "Arch_LeftPillar", mat: 1, box: [-3.4, 2.8, -6.8, 0.95, 5.6, 0.95] },
    { name: "Arch_RightPillar", mat: 1, box: [3.4, 2.8, -6.8, 0.95, 5.6, 0.95] },
    { name: "Arch_Lintel", mat: 2, box: [0, 5.7, -6.8, 8.2, 0.7, 1.1] },
  ];

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(ang) * 12.2;
    const pz = Math.sin(ang) * 12.2;
    objects.push({ name: `Gothic_Pillar_${i}`, mat: 1, box: [px, 2.2, pz, 1.1, 4.4, 1.1] });
    objects.push({ name: `Gothic_Cap_${i}`, mat: 2, box: [px, 4.5, pz, 1.45, 0.3, 1.45] });
  }

  for (const [idx, [bx, bz]] of [[-5.6, -4.6], [5.6, -4.6], [-5.6, 4.6], [5.6, 4.6]].entries()) {
    objects.push({ name: `Brazier_Stand_${idx}`, mat: 1, box: [bx, 0.55, bz, 0.9, 1.1, 0.9] });
    objects.push({ name: `Brazier_Ember_${idx}`, mat: 4, box: [bx, 1.22, bz, 0.55, 0.35, 0.55] });
  }

  const binChunks = [];
  let binByteOffset = 0;
  const bufferViews = [];
  const accessors = [];
  const meshes = [];
  const nodes = [];

  for (const obj of objects) {
    const geom = createBoxGeometryData(...obj.box);
    const posBuf = Buffer.from(geom.positions.buffer);
    const normBuf = Buffer.from(geom.normals.buffer);
    const idxBuf = Buffer.from(geom.indices.buffer);

    const posView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: binByteOffset, byteLength: posBuf.length, target: 34962 });
    binChunks.push(posBuf);
    binByteOffset += posBuf.length;

    const normView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: binByteOffset, byteLength: normBuf.length, target: 34962 });
    binChunks.push(normBuf);
    binByteOffset += normBuf.length;

    const idxView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset: binByteOffset, byteLength: idxBuf.length, target: 34963 });
    binChunks.push(idxBuf);
    binByteOffset += idxBuf.length;

    const pad = (4 - (binByteOffset % 4)) % 4;
    if (pad > 0) {
      binChunks.push(Buffer.alloc(pad, 0));
      binByteOffset += pad;
    }

    const posAcc = accessors.length;
    accessors.push({ bufferView: posView, componentType: 5126, count: 24, type: "VEC3", min: geom.min, max: geom.max });
    const normAcc = accessors.length;
    accessors.push({ bufferView: normView, componentType: 5126, count: 24, type: "VEC3" });
    const idxAcc = accessors.length;
    accessors.push({ bufferView: idxView, componentType: 5123, count: 36, type: "SCALAR" });

    const meshIdx = meshes.length;
    meshes.push({
      name: obj.name,
      primitives: [{ attributes: { POSITION: posAcc, NORMAL: normAcc }, indices: idxAcc, material: obj.mat }],
    });
    nodes.push({ name: obj.name, mesh: meshIdx });
  }

  const gltf = {
    asset: { version: "2.0", generator: "Sanctuary25D-AssetBaker" },
    scene: 0,
    scenes: [{ name: "SanctuaryScene", nodes: nodes.map((_, i) => i) }],
    nodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength: binByteOffset }],
  };

  let jsonBuf = Buffer.from(JSON.stringify(gltf), "utf8");
  const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
  if (jsonPad > 0) jsonBuf = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);

  const binBuf = Buffer.concat(binChunks);
  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);

  const jsonChunkHead = Buffer.alloc(8);
  jsonChunkHead.writeUInt32LE(jsonBuf.length, 0);
  jsonChunkHead.writeUInt32LE(0x4e4f534a, 4);

  const binChunkHead = Buffer.alloc(8);
  binChunkHead.writeUInt32LE(binBuf.length, 0);
  binChunkHead.writeUInt32LE(0x004e4942, 4);

  fs.writeFileSync(outPath, Buffer.concat([header, jsonChunkHead, jsonBuf, binChunkHead, binBuf]));
}

async function main() {
  fs.mkdirSync(SPRITE_DIR, { recursive: true });
  fs.mkdirSync(MODEL_DIR, { recursive: true });

  const actors = [
    { name: "Solar_Guard", height: 2.55 },
    { name: "Astral_Sage", height: 2.55 },
    { name: "Shadow_Reaper", height: 2.55 },
    { name: "Curator_Ella", height: 2.45 },
    { name: "Curator_Luna", height: 2.45 },
    { name: "Poring_Slime", height: 1.55 },
  ];

  for (const a of actors) {
    const res = await bakeActorSprite(a.name, a.height);
    console.log(`[Bake] ${a.name}: ${path.relative(ROOT_DIR, res.sheetPath)}`);
  }

  const glbPath = path.join(MODEL_DIR, "sanctuary_environment.glb");
  buildSanctuaryGlb(glbPath);
  console.log(`[Bake] Environment GLB: ${path.relative(ROOT_DIR, glbPath)} (${fs.statSync(glbPath).size} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
