import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const spriteAtlasCache = new Map();
const sharedGeoCache = new Map();

function getSharedGeo(key, factory) {
  if (!sharedGeoCache.has(key)) {
    sharedGeoCache.set(key, factory());
  }
  return sharedGeoCache.get(key);
}

function loadTextureAsync(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function createContactShadowTexture() {
  if (createContactShadowTexture._tex) return createContactShadowTexture._tex;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 4, cx, cx, cx - 2);
  g.addColorStop(0, "rgba(18, 12, 6, 0.56)");
  g.addColorStop(0.55, "rgba(18, 12, 6, 0.26)");
  g.addColorStop(1, "rgba(18, 12, 6, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  createContactShadowTexture._tex = tex;
  return tex;
}

/**
 * 8-Directional Y-Axis Cylindrical Billboard Actor backed by shared GPU Texture source + NearestFilter.
 * Supports smooth Jump elevation (with ground-locked dynamic shadow), Dash squash/stretch, and fast picking.
 */
export class SpriteActor {
  constructor(rootGroup, spriteMesh, shadowDisc, hitMesh, texture, atlas, worldWidth, worldHeight) {
    this.mesh = rootGroup;
    this.spriteMesh = spriteMesh;
    this.shadowDisc = shadowDisc;
    this.hitMesh = hitMesh;
    this.texture = texture;
    this.atlas = atlas;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;

    this.currentAction = "Idle";
    this.frameTimer = 0;
    this.currentCol = atlas.columns.Idle?.start ?? 0;
    this.facingAngle = 0;
    this.lastSector = 0;
    this.onActionComplete = null;
    this.jumpHeight = 0;
  }

  setUserData(key, value) {
    this.mesh.userData[key] = value;
    if (this.spriteMesh) this.spriteMesh.userData[key] = value;
    if (this.hitMesh) this.hitMesh.userData[key] = value;
  }

  /**
   * Elevate the character billboard while keeping the ground shadow anchored at y = 0.025.
   */
  setJumpHeight(heightY = 0, scaleX = 1, scaleY = 1) {
    const h = Math.max(0, heightY);
    this.jumpHeight = h;
    this.spriteMesh.position.y = h;
    this.spriteMesh.scale.set(scaleX, scaleY, 1);
    if (this.hitMesh) {
      this.hitMesh.position.y = h + (this.worldHeight + 0.15) * 0.5;
    }
    if (this.shadowDisc) {
      const shrink = Math.max(0.45, 1 - h * 0.24);
      this.shadowDisc.scale.setScalar(shrink);
      this.shadowDisc.material.opacity = Math.max(0.24, 0.72 * shrink);
    }
  }

  playAction(actionName, onComplete = null, restart = false) {
    const resolved = this.atlas.columns[actionName] ? actionName : "Idle";
    const spec = this.atlas.columns[resolved];
    if (!spec) return;
    if (this.currentAction === resolved && !restart) return;
    this.currentAction = resolved;
    this.frameTimer = 0;
    this.currentCol = spec.start;
    this.onActionComplete = onComplete;
  }

  update(dt, cameraAzimuth, facingAngle = this.facingAngle) {
    this.facingAngle = facingAngle;
    this.spriteMesh.rotation.y = cameraAzimuth;

    const spec = this.atlas.columns[this.currentAction] || this.atlas.columns.Idle;
    const frameDuration = 1 / Math.max(1, spec.fps || 8);
    this.frameTimer += dt;

    while (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      if (this.currentCol < spec.end) {
        this.currentCol += 1;
      } else if (spec.loop !== false) {
        this.currentCol = spec.start;
      } else {
        const cb = this.onActionComplete;
        this.onActionComplete = null;
        if (this.currentAction !== "Jump" && this.currentAction !== "Dash") {
          this.playAction("Idle", null, true);
        }
        if (cb) cb();
        break;
      }
    }

    const twoPi = Math.PI * 2;
    let rel = (cameraAzimuth - facingAngle) % twoPi;
    if (rel < 0) rel += twoPi;
    const sector = Math.round(rel / (Math.PI / 4)) % 8;
    this.lastSector = sector;

    this.texture.offset.set(
      this.currentCol / this.atlas.cols,
      (this.atlas.rows - 1 - sector) / this.atlas.rows
    );
    return sector;
  }

  dispose() {
    this.spriteMesh.material?.dispose();
    this.spriteMesh.customDepthMaterial?.dispose();
    this.shadowDisc?.material?.dispose();
    this.hitMesh?.material?.dispose();
    // Dispose per-instance UV wrapper only; shared GPU Texture source remains cached in spriteAtlasCache
    if (this.texture && this.texture._isClonedAtlasView) {
      this.texture.dispose();
    }
  }
}

async function getCachedSpriteBundle(atlasJsonUrl) {
  if (!spriteAtlasCache.has(atlasJsonUrl)) {
    spriteAtlasCache.set(
      atlasJsonUrl,
      (async () => {
        const res = await fetch(atlasJsonUrl);
        if (!res.ok) throw new Error(`Failed to fetch atlas JSON: ${atlasJsonUrl} (${res.status})`);
        const atlas = await res.json();

        const textureLoader = new THREE.TextureLoader();
        const sheetUrl = new URL(atlas.sheet, document.baseURI).href;
        const baseTexture = await loadTextureAsync(textureLoader, sheetUrl);
        baseTexture.magFilter = THREE.NearestFilter;
        baseTexture.minFilter = THREE.NearestFilter;
        baseTexture.generateMipmaps = false;
        baseTexture.colorSpace = THREE.SRGBColorSpace;
        baseTexture.wrapS = THREE.ClampToEdgeWrapping;
        baseTexture.wrapT = THREE.ClampToEdgeWrapping;
        return { atlas, baseTexture };
      })()
    );
  }
  return spriteAtlasCache.get(atlasJsonUrl);
}

/**
 * Load an original HD-2D 8-directional SpriteActor sharing a single cached GPU sheet per character type.
 */
export async function loadSpriteActor(atlasJsonUrl, { targetHeight = null } = {}) {
  const { atlas, baseTexture } = await getCachedSpriteBundle(atlasJsonUrl);

  // Clone shares the underlying GPU Image source while maintaining independent UV offset per actor
  const spriteTexture = baseTexture.clone();
  spriteTexture._isClonedAtlasView = true;
  spriteTexture.magFilter = THREE.NearestFilter;
  spriteTexture.minFilter = THREE.NearestFilter;
  spriteTexture.generateMipmaps = false;
  spriteTexture.colorSpace = THREE.SRGBColorSpace;
  spriteTexture.repeat.set(1 / atlas.cols, 1 / atlas.rows);
  spriteTexture.offset.set(0, (atlas.rows - 1) / atlas.rows);
  spriteTexture.needsUpdate = true;

  const worldHeight = targetHeight || atlas.world_height || 2.3;
  const aspect = (atlas.cell_width || 96) / (atlas.cell_height || 96);
  const worldWidth = worldHeight * aspect;

  const geoKey = `sprite-plane-${worldWidth.toFixed(2)}x${worldHeight.toFixed(2)}`;
  const geometry = getSharedGeo(geoKey, () => {
    const g = new THREE.PlaneGeometry(worldWidth, worldHeight);
    g.translate(0, worldHeight / 2, 0);
    return g;
  });

  const material = new THREE.MeshStandardMaterial({
    map: spriteTexture,
    alphaTest: 0.5,
    transparent: false,
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const spriteMesh = new THREE.Mesh(geometry, material);
  spriteMesh.castShadow = true;
  spriteMesh.receiveShadow = true;
  spriteMesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: spriteTexture,
    alphaTest: 0.5,
  });

  const rootGroup = new THREE.Group();
  rootGroup.add(spriteMesh);

  // Ground-anchored contact shadow disc (stays on floor when character jumps)
  const shadowGeo = getSharedGeo("char-shadow-disc", () => new THREE.CircleGeometry(0.62, 20));
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  shadowDisc.castShadow = false;
  shadowDisc.receiveShadow = false;
  shadowDisc.raycast = () => {};
  rootGroup.add(shadowDisc);

  // Fast invisible capsule hitbox for reliable pointer picking
  const hitGeo = getSharedGeo("char-hitbox", () => new THREE.CylinderGeometry(0.55, 0.55, 2.35, 8));
  const hitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
  });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.position.y = 1.18;
  rootGroup.add(hitMesh);

  return new SpriteActor(rootGroup, spriteMesh, shadowDisc, hitMesh, spriteTexture, atlas, worldWidth, worldHeight);
}

/* ---------- Optimized Procedural Masonry, Roof, Foliage & Screen Textures ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createAvenuePaverTexture(horizontal = false) {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const rng = mulberry32(90812);

  if (horizontal) {
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-size / 2, -size / 2);
  }

  ctx.fillStyle = "#b99c6e";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#d9c297";
  ctx.fillRect(0, 0, 18, size);
  ctx.fillRect(size - 18, 0, 18, size);
  ctx.fillStyle = "#8a6d45";
  ctx.fillRect(18, 0, 3, size);
  ctx.fillRect(size - 21, 0, 3, size);

  const innerW = size - 42;
  const cols = 4;
  const rows = 6;
  const cellW = innerW / cols;
  const cellH = size / rows;
  const tones = ["#efe0be", "#e7d3aa", "#f3e6ca", "#dec496"];

  for (let r = 0; r < rows; r++) {
    const shift = (r % 2) * (cellW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const px = 21 + col * cellW + shift;
      const py = r * cellH;
      const drawX = Math.max(21, px);
      const drawW = Math.min(21 + innerW, px + cellW) - drawX;
      if (drawW <= 2) continue;
      ctx.fillStyle = tones[Math.floor(rng() * tones.length)];
      ctx.beginPath();
      ctx.roundRect(drawX + 1, py + 1, drawW - 2, cellH - 2, 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 250, 232, 0.42)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createRoofTileTexture() {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#c8c8c8";
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 8;
  const rowH = size / rows;
  const colW = size / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (colW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const x = col * colW + offset;
      const y = r * rowH;
      const g = ctx.createLinearGradient(x, y, x, y + rowH);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.7, "#dfdfdf");
      g.addColorStop(1, "#9b9b9b");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(x + 1.5, y + 1, colW - 3, rowH - 2, [3, 3, 8, 8]);
      ctx.fill();
      ctx.strokeStyle = "rgba(60, 60, 60, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function createWallScreenTexture(title, badge, hexAccent = "#fbbf24") {
  const w = 384;
  const h = 216;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#111c33");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;
  for (let gx = 24; gx < w; gx += 36) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
  }
  for (let gy = 24; gy < h; gy += 36) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(10, 10, w - 20, 40);
  ctx.strokeStyle = hexAccent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(10, 10, w - 20, 40);

  ctx.fillStyle = hexAccent;
  ctx.font = "700 10px monospace";
  ctx.fillText(badge, 20, 26);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 15px sans-serif";
  ctx.fillText(title, 20, 43);

  const cardW = (w - 40) / 3;
  for (let i = 0; i < 3; i++) {
    const cx = 10 + i * (cardW + 10);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.roundRect(cx, 62, cardW, 54, 6);
    ctx.fill();
    ctx.fillStyle = i === 0 ? hexAccent : "rgba(248, 250, 252, 0.82)";
    ctx.fillRect(cx + 9, 74, cardW * 0.45, 6);
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.fillRect(cx + 9, 88, cardW * 0.72, 4);
    ctx.fillRect(cx + 9, 98, cardW * 0.56, 4);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.beginPath();
  ctx.roundRect(10, 126, w - 20, 76, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.stroke();

  const barHeights = [26, 38, 30, 48, 36, 54, 44, 50];
  barHeights.forEach((bh, idx) => {
    const bx = 24 + idx * 21;
    const by = 188 - bh;
    ctx.fillStyle = idx === 5 ? hexAccent : "rgba(56, 189, 248, 0.65)";
    ctx.beginPath();
    ctx.roundRect(bx, by, 14, bh, 3);
    ctx.fill();
  });

  for (let row = 0; row < 3; row++) {
    ctx.fillStyle = "rgba(248, 250, 252, 0.75)";
    ctx.fillRect(206, 140 + row * 18, 150, 5);
    ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
    ctx.fillRect(206, 149 + row * 18, 108, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSandstoneTextures() {
  // 512x512 saves 75% VRAM over 1024x1024 while remaining crisp under 10x tiling
  const size = 512;
  const diff = document.createElement("canvas");
  diff.width = size; diff.height = size;
  const dCtx = diff.getContext("2d");

  const bump = document.createElement("canvas");
  bump.width = size; bump.height = size;
  const bCtx = bump.getContext("2d");

  dCtx.fillStyle = "#7a5e3c";
  dCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = "#353535";
  bCtx.fillRect(0, 0, size, size);

  const rng = mulberry32(20261118);
  const stoneTones = ["#eddcb7", "#e2c794", "#d6b57c", "#c8a368", "#f1e2c4", "#dbb882"];
  const rows = 16;
  const rowH = size / rows;

  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * -19;
    while (x < size) {
      const bw = 32 + Math.floor(rng() * 26);
      const tone = stoneTones[Math.floor(rng() * stoneTones.length)];
      const gap = 2;

      dCtx.fillStyle = tone;
      dCtx.beginPath();
      dCtx.roundRect(x + gap, r * rowH + gap, bw - gap * 2, rowH - gap * 2, 3);
      dCtx.fill();

      dCtx.strokeStyle = "rgba(255, 248, 224, 0.45)";
      dCtx.lineWidth = 1;
      dCtx.stroke();

      for (let s = 0; s < 8; s++) {
        dCtx.fillStyle = rng() > 0.5 ? "rgba(120, 88, 52, 0.14)" : "rgba(255, 250, 235, 0.16)";
        dCtx.fillRect(x + gap + rng() * (bw - 6), r * rowH + gap + rng() * (rowH - 6), 2, 1.5);
      }

      const bVal = 175 + Math.floor(rng() * 55);
      bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      bCtx.beginPath();
      bCtx.roundRect(x + gap, r * rowH + gap, bw - gap * 2, rowH - gap * 2, 3);
      bCtx.fill();

      x += bw;
    }
  }

  for (let m = 0; m < 36; m++) {
    const mx = rng() * size;
    const my = rng() * size;
    const rad = 6 + rng() * 14;
    const grad = dCtx.createRadialGradient(mx, my, 1, mx, my, rad);
    grad.addColorStop(0, "rgba(96, 134, 48, 0.32)");
    grad.addColorStop(1, "rgba(96, 134, 48, 0)");
    dCtx.fillStyle = grad;
    dCtx.beginPath();
    dCtx.arc(mx, my, rad, 0, Math.PI * 2);
    dCtx.fill();
  }

  const diffTex = new THREE.CanvasTexture(diff);
  diffTex.colorSpace = THREE.SRGBColorSpace;
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.RepeatWrapping;
  diffTex.repeat.set(10, 10);
  diffTex.rotation = Math.PI / 4;

  const bumpTex = new THREE.CanvasTexture(bump);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(10, 10);
  bumpTex.rotation = Math.PI / 4;

  return { diffTex, bumpTex };
}

function createPermanentRuneTexture() {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(cx, cy, 40, cx, cy, 242);
  glow.addColorStop(0, "rgba(186, 230, 253, 0.14)");
  glow.addColorStop(0.55, "rgba(254, 240, 138, 0.22)");
  glow.addColorStop(0.85, "rgba(251, 191, 36, 0.14)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 245, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fff7d6";
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 8;

  for (const [r, lw] of [[226, 3], [196, 2], [160, 1.5], [110, 2]]) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.lineWidth = 2;
  for (const rot of [0, Math.PI / 4]) {
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const a = rot + (i * Math.PI) / 2;
      const x = cx + Math.cos(a) * 196;
      const y = cy + Math.sin(a) * 196;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.fillStyle = "#fffbeb";
  ctx.font = "bold 14px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const runes = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * 211, cy + Math.sin(a) * 211);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(runes[i % runes.length], 0, 0);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWaterStreakTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(224, 242, 254, 0.92)");
  g.addColorStop(0.5, "rgba(56, 189, 248, 0.68)");
  g.addColorStop(1, "rgba(255, 255, 255, 0.88)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let x = 2; x < 64; x += 10) {
    ctx.fillRect(x, 0, 3, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSoftGlowTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, "rgba(255, 248, 200, 1)");
  g.addColorStop(0.35, "rgba(253, 224, 71, 0.7)");
  g.addColorStop(1, "rgba(253, 224, 71, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFoliageTexture(baseHex, hiHex, shHex, seed = 77) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  const rng = mulberry32(seed);
  for (let i = 0; i < 240; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 2.5 + rng() * 5.5;
    const pick = rng();
    ctx.fillStyle = pick > 0.62 ? hiHex : pick < 0.34 ? shHex : baseHex;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createGodRayTexture() {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(255, 246, 200, 0.55)");
  g.addColorStop(0.65, "rgba(255, 238, 175, 0.2)");
  g.addColorStop(1, "rgba(255, 238, 175, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 128);
  const mask = ctx.createLinearGradient(0, 0, 64, 0);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.2, "rgba(0,0,0,0)");
  mask.addColorStop(0.8, "rgba(0,0,0,0)");
  mask.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, 64, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWoodFloorTexture(baseHex = "#8c6239", plankHex = "#734e2a") {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  const plankH = 16;
  for (let row = 0; row < 8; row++) {
    ctx.fillStyle = row % 2 === 0 ? baseHex : plankHex;
    ctx.fillRect(0, row * plankH, size, plankH - 1);
    ctx.fillStyle = "rgba(40, 22, 10, 0.35)";
    ctx.fillRect(0, (row + 1) * plankH - 1, size, 1);
    const seamX = ((row * 49) % 100) + 14;
    ctx.fillRect(seamX, row * plankH, 1.5, plankH);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

/* ---------- Diorama Geometry Builders (Shared Geometry Pool for Low VRAM) ---------- */
function buildCrystalFountain(group, stoneMat, trimMat) {
  const fGroup = new THREE.Group();

  const baseStep = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.35, 0.24, 28), stoneMat);
  baseStep.position.y = 0.12;
  baseStep.castShadow = true; baseStep.receiveShadow = true;
  fGroup.add(baseStep);

  const basinWall = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.78, 0.62, 28), stoneMat);
  basinWall.position.y = 0.45;
  basinWall.castShadow = true; basinWall.receiveShadow = true;
  fGroup.add(basinWall);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.14, 10, 28), trimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.76;
  rim.castShadow = true; rim.receiveShadow = true;
  fGroup.add(rim);

  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.72,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.94,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.48, 28), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.74;
  fGroup.add(pool);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.95, 16), trimMat);
  stem.position.y = 1.05;
  stem.castShadow = true;
  fGroup.add(stem);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.36, 0.28, 20), trimMat);
  bowl.position.y = 1.48;
  bowl.castShadow = true;
  fGroup.add(bowl);

  const waterTex = createWaterStreakTexture();
  const waterMat = new THREE.MeshBasicMaterial({
    map: waterTex,
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waterFall = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.96, 0.74, 20, 1, true), waterMat);
  waterFall.position.y = 1.08;
  fGroup.add(waterFall);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xa5f3fc,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.45,
    roughness: 0.1,
    metalness: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const crystalMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), crystalMat);
  crystalMesh.scale.set(0.85, 1.45, 0.85);
  crystalMesh.position.y = 2.25;
  fGroup.add(crystalMesh);

  const runeTex = createPermanentRuneTexture();
  const runeMat = new THREE.MeshBasicMaterial({
    map: runeTex,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const runeDisc = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 8.8), runeMat);
  runeDisc.rotation.x = -Math.PI / 2;
  runeDisc.position.y = 0.035;
  fGroup.add(runeDisc);

  group.add(fGroup);
  return { crystalMesh, runeDisc, waterTex };
}

function buildSandstoneBench(x, z, rotY, stoneMat, trimMat) {
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  b.rotation.y = rotY;

  const seat = new THREE.Mesh(getSharedGeo("bench-seat", () => new THREE.BoxGeometry(2.05, 0.16, 0.68)), trimMat);
  seat.position.y = 0.44;
  seat.castShadow = true; seat.receiveShadow = true;
  b.add(seat);

  const legGeo = getSharedGeo("bench-leg", () => new THREE.BoxGeometry(0.24, 0.4, 0.58));
  for (const lx of [-0.72, 0.72]) {
    const leg = new THREE.Mesh(legGeo, stoneMat);
    leg.position.set(lx, 0.2, 0);
    leg.castShadow = true; leg.receiveShadow = true;
    b.add(leg);
  }
  return b;
}

function buildAncientColumn(x, z, baseY, height, broken, stoneMat, trimMat, leafMat) {
  const col = new THREE.Group();
  col.position.set(x, baseY, z);

  const plinth = new THREE.Mesh(getSharedGeo("col-plinth", () => new THREE.BoxGeometry(1.05, 0.34, 1.05)), trimMat);
  plinth.position.y = 0.17;
  plinth.castShadow = true; plinth.receiveShadow = true;
  col.add(plinth);

  const shaft = new THREE.Mesh(getSharedGeo("col-shaft", () => new THREE.CylinderGeometry(0.36, 0.42, 1, 12)), stoneMat);
  shaft.scale.y = height;
  shaft.position.y = 0.34 + height * 0.5;
  shaft.castShadow = true; shaft.receiveShadow = true;
  col.add(shaft);

  if (!broken) {
    const cap = new THREE.Mesh(getSharedGeo("col-cap", () => new THREE.BoxGeometry(1.08, 0.32, 1.08)), trimMat);
    cap.position.y = 0.34 + height + 0.16;
    cap.castShadow = true; cap.receiveShadow = true;
    col.add(cap);
  }

  const ivy = new THREE.Mesh(getSharedGeo("unit-ico-1", () => new THREE.IcosahedronGeometry(1, 1)), leafMat);
  ivy.scale.set(0.38, 0.56, 0.38);
  ivy.position.set(0.28, 0.75, 0.22);
  ivy.castShadow = true;
  col.add(ivy);

  return col;
}

function buildLushTree(x, y, z, scale, trunkMat, leafHiMat, leafMidMat, leafDarkMat) {
  const tree = new THREE.Group();
  tree.position.set(x, y, z);
  tree.scale.setScalar(scale);

  const trunk = new THREE.Mesh(getSharedGeo("tree-trunk", () => new THREE.CylinderGeometry(0.26, 0.4, 2.2, 8)), trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true; trunk.receiveShadow = true;
  tree.add(trunk);

  const unitIco = getSharedGeo("unit-ico-1", () => new THREE.IcosahedronGeometry(1, 1));
  const puffs = [
    { pos: [0, 2.9, 0], r: 1.55, mat: leafDarkMat },
    { pos: [-0.95, 2.55, 0.6], r: 1.15, mat: leafMidMat },
    { pos: [0.95, 2.6, -0.45], r: 1.2, mat: leafMidMat },
    { pos: [-0.4, 3.45, 0.35], r: 1.15, mat: leafHiMat },
    { pos: [0.45, 3.2, 0.5], r: 1.0, mat: leafHiMat },
    { pos: [0, 3.7, -0.25], r: 0.95, mat: leafHiMat },
  ];
  for (const p of puffs) {
    const m = new THREE.Mesh(unitIco, p.mat);
    m.scale.setScalar(p.r);
    m.position.set(...p.pos);
    m.castShadow = true; m.receiveShadow = true;
    tree.add(m);
  }
  return tree;
}

function buildFlowerBush(x, y, z, rng, leafMat, flowerMats) {
  const bush = new THREE.Group();
  bush.position.set(x, y, z);

  const moundR = 0.65 + rng() * 0.35;
  const mound = new THREE.Mesh(getSharedGeo("unit-ico-1", () => new THREE.IcosahedronGeometry(1, 1)), leafMat);
  mound.scale.set(1.3 * moundR, 0.75 * moundR, 1.15 * moundR);
  mound.position.y = 0.32;
  mound.castShadow = true; mound.receiveShadow = true;
  bush.add(mound);

  const bMat1 = flowerMats[Math.floor(rng() * flowerMats.length)];
  const bMat2 = flowerMats[Math.floor(rng() * flowerMats.length)];
  const dodecGeo = getSharedGeo("unit-dodec", () => new THREE.DodecahedronGeometry(1, 0));

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + rng() * 0.4;
    const rad = 0.35 + rng() * 0.45;
    const fl = new THREE.Mesh(dodecGeo, i % 2 === 0 ? bMat1 : bMat2);
    fl.scale.setScalar(0.14 + rng() * 0.06);
    fl.position.set(Math.cos(ang) * rad, 0.45 + rng() * 0.32, Math.sin(ang) * rad * 0.9);
    bush.add(fl);
  }
  return bush;
}

function addWallCollider(colliders, cx, cz, w, d) {
  colliders.push({
    minX: cx - w * 0.5,
    maxX: cx + w * 0.5,
    minZ: cz - d * 0.5,
    maxZ: cz + d * 0.5,
  });
}

function buildEnterableBuilding(spec, mats, walkableMeshes, colliders) {
  const {
    id,
    title,
    x,
    z,
    w,
    d,
    wallH = 3.3,
    doorDir = "S",
    roofColor = 0xb45309,
    accentColor = 0xfbbf24,
    interiorType = "forge",
  } = spec;

  const bGroup = new THREE.Group();
  bGroup.position.set(x, 0, z);

  const wallThick = 0.55;
  const doorW = 3.0;
  const doorH = 2.45;
  const halfW = w * 0.5;
  const halfD = d * 0.5;

  const floorMat = new THREE.MeshStandardMaterial({
    map: mats.woodTex,
    color: interiorType === "observatory" ? 0xcbd5e1 : interiorType === "library" ? 0xd6b892 : 0xe5c9a3,
    roughness: 0.78,
  });
  const intFloor = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.08, d - 0.3), floorMat);
  intFloor.position.y = 0.04;
  intFloor.receiveShadow = true;
  intFloor.userData.buildingId = id;
  bGroup.add(intFloor);
  walkableMeshes.push(intFloor);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.14, d + 0.6), mats.trimMat);
  plinth.position.y = -0.02;
  plinth.receiveShadow = true;
  bGroup.add(plinth);

  const wallMat = mats.bldgWallMat;
  const frontWallMat = wallMat.clone();
  const timberMat = mats.timberMat;
  const frontTimberMat = timberMat.clone();
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });
  const frontAccentMat = accentMat.clone();
  const awningMat = new THREE.MeshStandardMaterial({
    map: mats.roofTileTex || null,
    color: roofColor,
    roughness: 0.68,
  });

  const makeWall = (lx, lz, lw, ld, lh = wallH, addCol = true, customMat = wallMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, ld), customMat);
    m.position.set(lx, lh * 0.5, lz);
    m.castShadow = true;
    m.receiveShadow = true;
    bGroup.add(m);
    if (addCol) addWallCollider(colliders, x + lx, z + lz, lw, ld);
    return m;
  };

  const windowGlassMat = mats.windowGlassMat;
  const frontWindowGlassMat = windowGlassMat.clone();
  const planterLeafMat = mats.planterLeafMat;

  const sides = ["N", "S", "W", "E"];
  for (const s of sides) {
    const isNS = s === "N" || s === "S";
    const isSouthCutaway = s === "S";
    const span = isNS ? w : d;
    const lx = s === "W" ? -halfW + wallThick * 0.5 : s === "E" ? halfW - wallThick * 0.5 : 0;
    const lz = s === "N" ? -halfD + wallThick * 0.5 : s === "S" ? halfD - wallThick * 0.5 : 0;
    const outX = s === "W" ? -1 : s === "E" ? 1 : 0;
    const outZ = s === "N" ? -1 : s === "S" ? 1 : 0;
    const wMat = isSouthCutaway ? frontWallMat : wallMat;
    const tMat = isSouthCutaway ? frontTimberMat : timberMat;
    const gMat = isSouthCutaway ? frontWindowGlassMat : windowGlassMat;

    if (s !== doorDir) {
      makeWall(lx, lz, isNS ? span : wallThick, isNS ? wallThick : span, wallH, true, wMat);
      for (const sideSign of [-1, 1]) {
        const offsetAlong = sideSign * (span * 0.24);
        const wx = isNS ? offsetAlong : lx + outX * (wallThick * 0.5 + 0.04);
        const wz = isNS ? lz + outZ * (wallThick * 0.5 + 0.04) : offsetAlong;
        const winFrame = new THREE.Mesh(
          getSharedGeo(isNS ? "win-frame-ns" : "win-frame-ew", () => new THREE.BoxGeometry(isNS ? 1.15 : 0.12, 1.25, isNS ? 0.12 : 1.15)),
          tMat
        );
        winFrame.position.set(wx, 1.85, wz);
        bGroup.add(winFrame);
        const winPane = new THREE.Mesh(
          getSharedGeo(isNS ? "win-pane-ns" : "win-pane-ew", () => new THREE.BoxGeometry(isNS ? 0.88 : 0.14, 0.96, isNS ? 0.14 : 0.88)),
          gMat
        );
        winPane.position.set(wx, 1.85, wz);
        bGroup.add(winPane);
      }
    } else {
      const wing = (span - doorW) * 0.5;
      if (wing > 0.1) {
        if (isNS) {
          makeWall(-doorW * 0.5 - wing * 0.5, lz, wing, wallThick, wallH, true, wMat);
          makeWall(doorW * 0.5 + wing * 0.5, lz, wing, wallThick, wallH, true, wMat);
        } else {
          makeWall(lx, -doorW * 0.5 - wing * 0.5, wallThick, wing, wallH, true, wMat);
          makeWall(lx, doorW * 0.5 + wing * 0.5, wallThick, wing, wallH, true, wMat);
        }
      }
      const lintelH = wallH - doorH;
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(isNS ? doorW + 0.3 : wallThick + 0.14, lintelH, isNS ? wallThick + 0.14 : doorW + 0.3),
        tMat
      );
      lintel.position.set(lx, doorH + lintelH * 0.5, lz);
      lintel.castShadow = true;
      bGroup.add(lintel);

      const postGeo = getSharedGeo("door-post", () => new THREE.BoxGeometry(0.32, doorH + 0.1, 0.32));
      for (const sign of [-1, 1]) {
        const px = isNS ? sign * (doorW * 0.5 + 0.12) : lx;
        const pz = isNS ? lz : sign * (doorW * 0.5 + 0.12);
        const post = new THREE.Mesh(postGeo, tMat);
        post.position.set(px, (doorH + 0.1) * 0.5, pz);
        post.castShadow = true;
        bGroup.add(post);

        const plantOff = sign * (doorW * 0.5 + 0.82);
        const plX = isNS ? plantOff : lx + outX * 0.56;
        const plZ = isNS ? lz + outZ * 0.56 : plantOff;
        const planter = new THREE.Mesh(
          getSharedGeo(isNS ? "planter-ns" : "planter-ew", () => new THREE.BoxGeometry(isNS ? 0.62 : 0.44, 0.34, isNS ? 0.44 : 0.62)),
          timberMat
        );
        planter.position.set(plX, 0.17, plZ);
        planter.castShadow = true;
        bGroup.add(planter);
        const foliage = new THREE.Mesh(
          getSharedGeo(isNS ? "planter-leaf-ns" : "planter-leaf-ew", () => new THREE.BoxGeometry(isNS ? 0.54 : 0.36, 0.24, isNS ? 0.36 : 0.54)),
          planterLeafMat
        );
        foliage.position.set(plX, 0.42, plZ);
        bGroup.add(foliage);
      }

      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(isNS ? doorW + 0.9 : 1.05, 0.14, isNS ? 1.05 : doorW + 0.9),
        isSouthCutaway ? awningMat : new THREE.MeshStandardMaterial({ map: mats.roofTileTex || null, color: roofColor, roughness: 0.68 })
      );
      awning.position.set(lx + outX * 0.58, doorH + 0.24, lz + outZ * 0.58);
      awning.rotation.x = outZ * 0.22;
      awning.rotation.z = -outX * 0.22;
      awning.castShadow = true;
      awning.userData.enterBuildingId = id;
      bGroup.add(awning);

      const signX = lx + outX * 0.48;
      const signZ = lz + outZ * 0.48;
      const lantern = new THREE.Mesh(getSharedGeo("lantern-octa", () => new THREE.OctahedronGeometry(0.22, 0)), isSouthCutaway ? frontAccentMat : accentMat);
      lantern.position.set(signX, doorH + 0.04, signZ);
      bGroup.add(lantern);
    }
  }

  const cornerBeamGeo = getSharedGeo("corner-beam", () => new THREE.BoxGeometry(0.36, wallH + 0.12, 0.36));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const beam = new THREE.Mesh(cornerBeamGeo, sz > 0 ? frontTimberMat : timberMat);
      beam.position.set(sx * (halfW - 0.12), (wallH + 0.12) * 0.5, sz * (halfD - 0.12));
      beam.castShadow = true;
      bGroup.add(beam);
    }
  }

  const woodMat = mats.woodMat;
  const darkWoodMat = mats.darkWoodMat;
  const rugMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.9 });

  const rug = new THREE.Mesh(getSharedGeo("room-rug", () => new THREE.CylinderGeometry(2.1, 2.1, 0.03, 24)), rugMat);
  rug.position.y = 0.095;
  rug.receiveShadow = true;
  bGroup.add(rug);

  const shelfFrameGeo = getSharedGeo("shelf-frame", () => new THREE.BoxGeometry(2.0, 2.35, 0.5));
  const shelfBookGeo = getSharedGeo("shelf-book", () => new THREE.BoxGeometry(1.75, 0.32, 0.36));
  const addBookshelf = (bx, bz, rotY) => {
    const shelf = new THREE.Group();
    shelf.position.set(bx, 0.08, bz);
    shelf.rotation.y = rotY;
    const frame = new THREE.Mesh(shelfFrameGeo, darkWoodMat);
    frame.position.y = 1.18;
    frame.castShadow = true; frame.receiveShadow = true;
    shelf.add(frame);
    for (let row = 0; row < 3; row++) {
      const bar = new THREE.Mesh(shelfBookGeo, mats.bookMats[row % mats.bookMats.length]);
      bar.position.set(0, 0.55 + row * 0.68, 0.12);
      shelf.add(bar);
    }
    bGroup.add(shelf);
  };

  if (interiorType === "forge") {
    addBookshelf(-halfW + 1.6, -halfD + 0.8, 0);
    addBookshelf(halfW - 1.6, -halfD + 0.8, 0);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.82, 0.9), woodMat);
    desk.position.set(-halfW + 1.4, 0.45, 0.6);
    desk.castShadow = true;
    bGroup.add(desk);
    const crystal = new THREE.Mesh(getSharedGeo("prop-crystal", () => new THREE.OctahedronGeometry(0.32, 0)), accentMat);
    crystal.position.set(-halfW + 1.4, 1.25, 0.6);
    bGroup.add(crystal);
  } else if (interiorType === "library") {
    addBookshelf(-halfW + 1.7, -halfD + 0.8, 0);
    addBookshelf(halfW - 1.7, -halfD + 0.8, 0);
    addBookshelf(-halfW + 0.8, 0.2, Math.PI * 0.5);
    addBookshelf(halfW - 0.8, 0.2, -Math.PI * 0.5);
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 1.0, 12), mats.trimMat);
    podium.position.set(halfW - 1.8, 0.54, 1.8);
    podium.castShadow = true;
    bGroup.add(podium);
  } else if (interiorType === "salon") {
    addBookshelf(-halfW + 0.85, 0.4, Math.PI * 0.5);
    addBookshelf(halfW - 0.85, 0.4, -Math.PI * 0.5);
    const tblGeo = getSharedGeo("salon-tbl", () => new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16));
    const legGeo = getSharedGeo("salon-leg", () => new THREE.CylinderGeometry(0.12, 0.22, 0.72, 10));
    const cdlGeo = getSharedGeo("salon-cdl", () => new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8));
    for (const tx of [-halfW + 1.9, halfW - 1.9]) {
      const table = new THREE.Mesh(tblGeo, woodMat);
      table.position.set(tx, 0.76, 1.2);
      table.castShadow = true;
      bGroup.add(table);
      const leg = new THREE.Mesh(legGeo, darkWoodMat);
      leg.position.set(tx, 0.4, 1.2);
      bGroup.add(leg);
      const candle = new THREE.Mesh(cdlGeo, accentMat);
      candle.position.set(tx, 0.9, 1.2);
      bGroup.add(candle);
    }
  } else if (interiorType === "observatory") {
    addBookshelf(-halfW + 0.85, 0.6, Math.PI * 0.5);
    addBookshelf(halfW - 0.85, 0.6, -Math.PI * 0.5);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.06, 8, 24), accentMat);
    ring.position.set(halfW - 1.8, 1.45, -halfD + 1.5);
    ring.rotation.set(0.4, 0.6, 0);
    bGroup.add(ring);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, 0.85, 14), mats.trimMat);
    ped.position.set(halfW - 1.8, 0.46, -halfD + 1.5);
    ped.castShadow = true;
    bGroup.add(ped);
  } else if (interiorType === "tavern") {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.95, 0.85), woodMat);
    bar.position.set(-0.5, 0.52, -halfD + 1.3);
    bar.castShadow = true;
    bGroup.add(bar);
    const stoolGeo = getSharedGeo("tavern-stool", () => new THREE.CylinderGeometry(0.24, 0.2, 0.52, 10));
    for (const sx of [-1.6, -0.5, 0.6]) {
      const stool = new THREE.Mesh(stoolGeo, darkWoodMat);
      stool.position.set(sx, 0.3, -halfD + 2.2);
      bGroup.add(stool);
    }
    const table = new THREE.Mesh(getSharedGeo("salon-tbl", () => new THREE.CylinderGeometry(0.7, 0.7, 0.08, 16)), woodMat);
    table.position.set(-1.4, 0.74, 1.5);
    bGroup.add(table);
  } else {
    addBookshelf(halfW - 1.5, -halfD + 0.8, 0);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.84, 0.9), woodMat);
    bench.position.set(0.8, 0.46, 1.5);
    bench.castShadow = true;
    bGroup.add(bench);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), darkWoodMat);
    crate.position.set(-halfW + 1.2, 0.44, -0.2);
    crate.castShadow = true;
    bGroup.add(crate);
  }

  // Interior Giant Dashboard Wall Screen Terminal
  const accentHex = `#${new THREE.Color(accentColor).getHexString()}`;
  const screenTex = createWallScreenTexture(title, id.toUpperCase(), accentHex);
  const screenGroup = new THREE.Group();
  const isNorthDoor = doorDir === "N";
  if (isNorthDoor) {
    screenGroup.position.set(interiorType === "salon" ? halfW - 2.2 : -halfW + 2.2, 1.65, -halfD + 1.25);
    screenGroup.rotation.y = interiorType === "salon" ? -0.34 : 0.34;
  } else {
    screenGroup.position.set(0, interiorType === "tavern" ? 2.15 : 1.85, -halfD + 0.72);
  }
  const scrW = isNorthDoor ? 2.6 : 3.4;
  const scrH = isNorthDoor ? 1.5 : 1.92;
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(scrW + 0.2, scrH + 0.2, 0.14), mats.screenBezelMat);
  bezel.userData.openDashboardBuildingId = id;
  screenGroup.add(bezel);
  const displayPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(scrW, scrH),
    new THREE.MeshBasicMaterial({ map: screenTex })
  );
  displayPlane.position.z = 0.08;
  displayPlane.userData.openDashboardBuildingId = id;
  screenGroup.add(displayPlane);
  bGroup.add(screenGroup);

  // Separate Cutaway Roof Group
  const roofGroup = new THREE.Group();
  const roofMat = new THREE.MeshStandardMaterial({
    map: mats.roofTileTex || null,
    color: roofColor,
    roughness: 0.68,
    metalness: 0.04,
    transparent: true,
    opacity: 1,
  });
  const roofTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf4e4c1,
    roughness: 0.76,
    transparent: true,
    opacity: 1,
  });

  const roofH = 2.25;
  const roofBase = new THREE.Mesh(new THREE.BoxGeometry(w + 0.85, 0.26, d + 0.85), roofTrimMat);
  roofBase.position.y = wallH + 0.13;
  roofBase.castShadow = true;
  roofBase.userData.enterBuildingId = id;
  roofGroup.add(roofBase);

  const hippedGeo = getSharedGeo("hipped-roof-unit", () => {
    const g = new THREE.ConeGeometry(1, 1, 4).toNonIndexed();
    g.computeVertexNormals();
    return g;
  });
  const hippedRoof = new THREE.Mesh(hippedGeo, roofMat);
  hippedRoof.rotation.y = Math.PI * 0.25;
  hippedRoof.scale.set((w + 0.65) / Math.SQRT2, roofH, (d + 0.65) / Math.SQRT2);
  hippedRoof.position.y = wallH + 0.26 + roofH * 0.5;
  hippedRoof.castShadow = true;
  hippedRoof.receiveShadow = true;
  hippedRoof.userData.enterBuildingId = id;
  roofGroup.add(hippedRoof);

  const crownCap = new THREE.Mesh(getSharedGeo("roof-crown", () => new THREE.BoxGeometry(0.9, 0.22, 0.9)), roofTrimMat);
  crownCap.position.y = wallH + 0.26 + roofH + 0.04;
  crownCap.userData.enterBuildingId = id;
  roofGroup.add(crownCap);

  const spire = new THREE.Mesh(getSharedGeo("roof-spire", () => new THREE.OctahedronGeometry(0.38, 0)), accentMat.clone());
  spire.position.y = wallH + 0.26 + roofH + 0.48;
  spire.userData.enterBuildingId = id;
  roofGroup.add(spire);

  bGroup.add(roofGroup);

  const offset = (doorDir === "N" || doorDir === "S" ? halfD : halfW) + 1.7;
  const doorApproach = new THREE.Vector3(
    x + (doorDir === "W" ? -offset : doorDir === "E" ? offset : 0),
    0,
    z + (doorDir === "N" ? -offset : doorDir === "S" ? offset : 0)
  );
  const doorThreshold = new THREE.Vector3(
    x + (doorDir === "W" ? -halfW + 1.2 : doorDir === "E" ? halfW - 1.2 : 0),
    0,
    z + (doorDir === "N" ? -halfD + 1.2 : doorDir === "S" ? halfD - 1.2 : 0)
  );

  return {
    id,
    title,
    accentColor,
    group: bGroup,
    roofGroup,
    roofMaterials: [roofMat, roofTrimMat, spire.material],
    frontCutawayMaterials: [frontWallMat, frontTimberMat, awningMat, frontAccentMat, frontWindowGlassMat],
    screenMeshes: [bezel, displayPlane],
    roofOpacity: 1,
    center: new THREE.Vector3(x, 0, z),
    doorApproach,
    doorThreshold,
    interiorBounds: {
      minX: x - halfW + 0.2,
      maxX: x + halfW - 0.2,
      minZ: z - halfD + 0.2,
      maxZ: z + halfD - 0.2,
    },
    revealBounds: {
      minX: x - halfW - (doorDir === "W" ? 1.8 : 0.4),
      maxX: x + halfW + (doorDir === "E" ? 1.8 : 0.4),
      minZ: z - halfD - (doorDir === "N" ? 1.8 : 0.4),
      maxZ: z + halfD + (doorDir === "S" ? 1.8 : 0.4),
    },
  };
}

function buildCityGate(x, z, rotY, stoneMat, trimMat) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  const towerGeo = getSharedGeo("gate-tower", () => new THREE.BoxGeometry(1.6, 4.6, 1.6));
  const capGeo = getSharedGeo("gate-cap", () => new THREE.BoxGeometry(1.9, 0.42, 1.9));
  for (const sx of [-3.6, 3.6]) {
    const tower = new THREE.Mesh(towerGeo, stoneMat);
    tower.position.set(sx, 2.3, 0);
    tower.castShadow = true; tower.receiveShadow = true;
    g.add(tower);
    const cap = new THREE.Mesh(capGeo, trimMat);
    cap.position.set(sx, 4.8, 0);
    cap.castShadow = true;
    g.add(cap);
  }
  const archBeam = new THREE.Mesh(getSharedGeo("gate-beam", () => new THREE.BoxGeometry(8.8, 0.9, 1.3)), trimMat);
  archBeam.position.set(0, 4.05, 0);
  archBeam.castShadow = true;
  g.add(archBeam);
  return g;
}

function buildStreetLamp(x, z, trimMat, glowMat) {
  const lamp = new THREE.Group();
  lamp.position.set(x, 0, z);
  const post = new THREE.Mesh(getSharedGeo("lamp-post", () => new THREE.CylinderGeometry(0.11, 0.16, 2.6, 8)), trimMat);
  post.position.y = 1.3;
  post.castShadow = true;
  lamp.add(post);
  const bulb = new THREE.Mesh(getSharedGeo("lamp-bulb", () => new THREE.OctahedronGeometry(0.24, 0)), glowMat);
  bulb.position.y = 2.75;
  lamp.add(bulb);
  return lamp;
}

function buildTownhouseSkyline(x, z, w, d, h, roofMat, stoneMat, trimMat, winMat = null) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);

  const unitBox = getSharedGeo("unit-box", () => new THREE.BoxGeometry(1, 1, 1));
  const body = new THREE.Mesh(unitBox, stoneMat);
  body.scale.set(w, h, d);
  body.position.y = h * 0.5;
  body.castShadow = true; body.receiveShadow = true;
  t.add(body);

  const roofGeo = getSharedGeo("hipped-roof-unit", () => {
    const g = new THREE.ConeGeometry(1, 1, 4).toNonIndexed();
    g.computeVertexNormals();
    return g;
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.rotation.y = Math.PI * 0.25;
  roof.scale.set((w + 0.5) / Math.SQRT2, 2.2, (d + 0.5) / Math.SQRT2);
  roof.position.y = h + 1.1;
  roof.castShadow = true;
  t.add(roof);

  const cornice = new THREE.Mesh(unitBox, trimMat);
  cornice.scale.set(w + 0.35, 0.26, d + 0.35);
  cornice.position.y = h;
  t.add(cornice);

  if (winMat) {
    const winNS = getSharedGeo("sky-win-ns", () => new THREE.BoxGeometry(0.7, 0.8, 0.08));
    const winEW = getSharedGeo("sky-win-ew", () => new THREE.BoxGeometry(0.08, 0.8, 0.7));
    for (const wy of [1.4, h - 1.1]) {
      if (wy > h - 0.55) continue;
      for (const sx of [-w * 0.22, w * 0.22]) {
        const wFront = new THREE.Mesh(winNS, winMat);
        wFront.position.set(sx, wy, d * 0.5 + 0.02);
        t.add(wFront);
        const wBack = new THREE.Mesh(winNS, winMat);
        wBack.position.set(sx, wy, -d * 0.5 - 0.02);
        t.add(wBack);
      }
      for (const sz of [-d * 0.22, d * 0.22]) {
        const wSideL = new THREE.Mesh(winEW, winMat);
        wSideL.position.set(-w * 0.5 - 0.02, wy, sz);
        t.add(wSideL);
        const wSideR = new THREE.Mesh(winEW, winMat);
        wSideR.position.set(w * 0.5 + 0.02, wy, sz);
        t.add(wSideR);
      }
    }
  }
  return t;
}

/**
 * Construct the Grand Sunlit Sanctuary City with Shared Geometries, Optimized 512px Textures,
 * and a Single Relocatable Interior PointLight (drastically cutting VRAM & shader compilation cost).
 */
export async function loadSanctuaryEnvironment(glbUrl, scene) {
  const loader = new GLTFLoader();
  try {
    await new Promise((resolve) => loader.load(glbUrl, resolve, undefined, resolve));
  } catch {}

  const rng = mulberry32(424242);
  const envGroup = new THREE.Group();
  const walkableMeshes = [];
  const colliders = [];
  const buildings = [];

  const { diffTex, bumpTex } = createSandstoneTextures();

  const plazaMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    bumpMap: bumpTex,
    bumpScale: 0.055,
    roughness: 0.86,
    metalness: 0.04,
  });
  const roofTileTex = createRoofTileTexture();
  const avenueTexNS = createAvenuePaverTexture(false);
  avenueTexNS.repeat.set(1, 16);
  const avenueTexEW = createAvenuePaverTexture(true);
  avenueTexEW.repeat.set(16, 1);

  const aveMatNS = new THREE.MeshStandardMaterial({ map: avenueTexNS, roughness: 0.78, metalness: 0.05 });
  const aveMatEW = new THREE.MeshStandardMaterial({ map: avenueTexEW, roughness: 0.78, metalness: 0.05 });
  const avenueMats = [aveMatNS, aveMatEW];
  const avenueMat = aveMatNS;

  const stoneWallMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    color: 0xd9be8c,
    roughness: 0.88,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xe6cfa4,
    roughness: 0.75,
    metalness: 0.05,
  });
  const woodTex = createWoodFloorTexture();
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });

  // 1. Vast Walkable City Cobblestone Floor (76 x 76)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(76, 0.5, 76), plazaMat);
  floor.name = "Walkable_CityFloor";
  floor.position.y = -0.25;
  floor.receiveShadow = true;
  envGroup.add(floor);
  walkableMeshes.push(floor);

  // Cardinal Grand Avenues & Ring Boulevard Stone Runners (reuse 2 avenue textures!)
  const avenueConfigs = [
    [0, 0.016, 0, 5.4, 0.03, 68, aveMatNS],
    [0, 0.013, 0, 68, 0.03, 5.4, aveMatEW],
    [0, 0.009, -24.5, 52, 0.03, 4.0, aveMatEW],
    [0, 0.009, 24.5, 52, 0.03, 4.0, aveMatEW],
    [-24.5, 0.006, 0, 4.0, 0.03, 52, aveMatNS],
    [24.5, 0.006, 0, 4.0, 0.03, 52, aveMatNS],
  ];
  for (const [ax, ay, az, aw, ah, ad, mat] of avenueConfigs) {
    const av = new THREE.Mesh(new THREE.BoxGeometry(aw, ah, ad), mat);
    av.position.set(ax, ay, az);
    av.receiveShadow = true;
    envGroup.add(av);
    walkableMeshes.push(av);
  }

  // 2. Central Plaza Corner Balustrades
  const unitBox = getSharedGeo("unit-box", () => new THREE.BoxGeometry(1, 1, 1));
  const plazaCorners = [
    [-6.6, 0.65, -9.2, 5.4, 1.3, 0.6], [6.6, 0.65, -9.2, 5.4, 1.3, 0.6],
    [-6.6, 0.65, 9.2, 5.4, 1.3, 0.6],  [6.6, 0.65, 9.2, 5.4, 1.3, 0.6],
    [-9.2, 0.65, -6.6, 0.6, 1.3, 5.4], [-9.2, 0.65, 6.6, 0.6, 1.3, 5.4],
    [9.2, 0.65, -6.6, 0.6, 1.3, 5.4],  [9.2, 0.65, 6.6, 0.6, 1.3, 5.4],
  ];
  for (const [wx, wy, wz, ww, wh, wd] of plazaCorners) {
    const wall = new THREE.Mesh(unitBox, stoneWallMat);
    wall.scale.set(ww, wh, wd);
    wall.position.set(wx, wy, wz);
    wall.castShadow = true; wall.receiveShadow = true;
    envGroup.add(wall);
    const coping = new THREE.Mesh(unitBox, trimMat);
    coping.scale.set(ww + 0.16, 0.16, wd + 0.16);
    coping.position.set(wx, 1.36, wz);
    coping.castShadow = true;
    envGroup.add(coping);
    addWallCollider(colliders, wx, wz, ww, wd);
  }

  // 3. Outer City Battlement Walls & 4 Grand City Gates
  const outerWalls = [
    [-19.5, 1.3, -35.0, 29, 2.6, 1.4], [19.5, 1.3, -35.0, 29, 2.6, 1.4],
    [-19.5, 1.3, 35.0, 29, 2.6, 1.4],  [19.5, 1.3, 35.0, 29, 2.6, 1.4],
    [-35.0, 1.3, -19.5, 1.4, 2.6, 29], [-35.0, 1.3, 19.5, 1.4, 2.6, 29],
    [35.0, 1.3, -19.5, 1.4, 2.6, 29],  [35.0, 1.3, 19.5, 1.4, 2.6, 29],
  ];
  for (const [ox, oy, oz, ow, oh, od] of outerWalls) {
    const owMesh = new THREE.Mesh(unitBox, stoneWallMat);
    owMesh.scale.set(ow, oh, od);
    owMesh.position.set(ox, oy, oz);
    owMesh.castShadow = true; owMesh.receiveShadow = true;
    envGroup.add(owMesh);
    const topTrim = new THREE.Mesh(unitBox, trimMat);
    topTrim.scale.set(ow + 0.25, 0.28, od + 0.25);
    topTrim.position.set(ox, oh + 0.14, oz);
    envGroup.add(topTrim);
  }
  envGroup.add(buildCityGate(0, -35.0, 0, stoneWallMat, trimMat));
  envGroup.add(buildCityGate(0, 35.0, 0, stoneWallMat, trimMat));
  envGroup.add(buildCityGate(-35.0, 0, Math.PI * 0.5, stoneWallMat, trimMat));
  envGroup.add(buildCityGate(35.0, 0, Math.PI * 0.5, stoneWallMat, trimMat));

  // 4. Central Crystal Fountain + Permanent Glowing Golden Rune Circle
  const { crystalMesh, runeDisc, waterTex } = buildCrystalFountain(envGroup, stoneWallMat, trimMat);

  // 5. Six Enterable Buildings + Single Relocatable Interior PointLight
  const sharedBuildingMats = {
    bldgWallMat: new THREE.MeshStandardMaterial({ map: diffTex, color: 0xf0dfbd, roughness: 0.85 }),
    timberMat: new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 }),
    windowGlassMat: new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.45, roughness: 0.25 }),
    planterLeafMat: new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.88 }),
    woodMat: new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.78 }),
    darkWoodMat: new THREE.MeshStandardMaterial({ color: 0x4a2e19, roughness: 0.85 }),
    screenBezelMat: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.45 }),
    bookMats: [0xd97757, 0x38bdf8, 0xfbbf24, 0x34d399, 0xf43f5e].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })),
    trimMat,
    woodTex,
    roofTileTex,
  };

  const buildingSpecs = [
    { id: "plugins", title: "인기 플러그인 공방", x: -15, z: -15, w: 10, d: 9, doorDir: "S", roofColor: 0xd97757, accentColor: 0xfbbf24, interiorType: "forge" },
    { id: "news", title: "AI 뉴스 대도서관", x: 15, z: -15, w: 11, d: 9, doorDir: "S", roofColor: 0x2563eb, accentColor: 0x38bdf8, interiorType: "library" },
    { id: "social", title: "소셜 피드 라운지", x: -15, z: 15, w: 10, d: 9, doorDir: "N", roofColor: 0xbe185d, accentColor: 0xfb7185, interiorType: "salon" },
    { id: "benchmarks", title: "벤치마크 관측소", x: 15, z: 15, w: 10, d: 9, doorDir: "N", roofColor: 0x059669, accentColor: 0x34d399, interiorType: "observatory" },
    { id: "tavern", title: "서쪽 여행자 여관", x: -24, z: 0, w: 8, d: 8, doorDir: "E", roofColor: 0xb45309, accentColor: 0xf59e0b, interiorType: "tavern" },
    { id: "workshop", title: "동쪽 장인 아틀리에", x: 24, z: 0, w: 8, d: 8, doorDir: "W", roofColor: 0x0f766e, accentColor: 0x2dd4bf, interiorType: "workshop" },
  ];
  for (const spec of buildingSpecs) {
    const built = buildEnterableBuilding(spec, sharedBuildingMats, walkableMeshes, colliders);
    envGroup.add(built.group);
    buildings.push(built);
  }

  // Single shared interior light moved to active room (replaces 6 static PointLights -> 6x faster shaders!)
  const interiorLight = new THREE.PointLight(0xfbbf24, 0, 12);
  interiorLight.position.set(0, 2.6, 0);
  envGroup.add(interiorLight);

  // 6. Outer District Skyline Townhouses (shared roof materials by theme color)
  const skylineWinMat = sharedBuildingMats.windowGlassMat;
  const skylineRoofCache = new Map();
  const getSkyRoofMat = (hex) => {
    if (!skylineRoofCache.has(hex)) {
      skylineRoofCache.set(hex, new THREE.MeshStandardMaterial({ map: roofTileTex, color: hex, roughness: 0.72 }));
    }
    return skylineRoofCache.get(hex);
  };
  const skylineSpecs = [
    [-28, -28, 7, 7, 4.4, 0xc2410c], [28, -28, 7, 7, 4.8, 0x1d4ed8],
    [-28, 28, 7, 7, 4.2, 0x9d174d],  [28, 28, 7, 7, 4.6, 0x047857],
    [-8, -29, 6, 5, 3.6, 0xb45309],  [8, -29, 6, 5, 3.8, 0x0369a1],
    [-8, 29, 6, 5, 3.6, 0x9f1239],   [8, 29, 6, 5, 3.8, 0x065f46],
    [-29, -9, 5, 6, 3.5, 0xa16207],  [29, -9, 5, 6, 3.7, 0x1e40af],
    [-29, 9, 5, 6, 3.5, 0xbe123c],   [29, 9, 5, 6, 3.7, 0x0f766e],
  ];
  for (const [tx, tz, tw, td, th, rc] of skylineSpecs) {
    envGroup.add(buildTownhouseSkyline(tx, tz, tw, td, th, getSkyRoofMat(rc), stoneWallMat, trimMat, skylineWinMat));
    addWallCollider(colliders, tx, tz, tw, td);
  }

  // 7. Plaza & Avenue Benches + Streetlamps
  const benchConfigs = [
    [-5.5, -5.5, Math.PI * 0.25], [5.5, -5.5, -Math.PI * 0.25],
    [-5.5, 5.5, Math.PI * 0.75],  [5.5, 5.5, -Math.PI * 0.75],
    [-4.2, -16.0, Math.PI * 0.5], [4.2, -16.0, -Math.PI * 0.5],
    [-4.2, 22.8, Math.PI * 0.5],  [4.2, 22.8, -Math.PI * 0.5],
  ];
  for (const [bx, bz, bRot] of benchConfigs) {
    envGroup.add(buildSandstoneBench(bx, bz, bRot, stoneWallMat, trimMat));
  }

  const lampSpots = [
    [-3.4, -10.5], [3.4, -10.5], [-3.4, 10.5], [3.4, 10.5],
    [-10.5, -3.4], [-10.5, 3.4], [10.5, -3.4], [10.5, 3.4],
    [-3.4, -22.0], [3.4, -22.0], [-3.4, 22.0], [3.4, 22.0],
    [-16.5, -9.2], [16.5, -9.2], [-16.5, 9.2], [16.5, 9.2],
  ];
  for (const [lx, lz] of lampSpots) {
    envGroup.add(buildStreetLamp(lx, lz, trimMat, lampGlowMat));
  }

  // 8. Lush Foliage Trees, Ancient Columns & Flower Beds
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.92 });
  const leafHiTex = createFoliageTexture("#8db93d", "#cde05c", "#5c8529", 11);
  const leafMidTex = createFoliageTexture("#5c8a32", "#84b344", "#375c1c", 22);
  const leafDarkTex = createFoliageTexture("#355c20", "#558030", "#1e3a12", 33);
  const leafHiMat = new THREE.MeshStandardMaterial({ map: leafHiTex, roughness: 0.86 });
  const leafMidMat = new THREE.MeshStandardMaterial({ map: leafMidTex, roughness: 0.88 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ map: leafDarkTex, roughness: 0.9 });

  const columns = [
    [-8.6, -8.6, 0, 2.8, false], [8.6, -8.6, 0, 2.8, false],
    [-8.6, 8.6, 0, 2.8, false],  [8.6, 8.6, 0, 2.8, false],
    [-4.8, -28.0, 0, 3.0, false], [4.8, -28.0, 0, 3.0, false],
    [-4.8, 28.0, 0, 3.0, false],  [4.8, 28.0, 0, 3.0, false],
  ];
  for (const [cx, cz, cy, ch, brk] of columns) {
    envGroup.add(buildAncientColumn(cx, cz, cy, ch, brk, stoneWallMat, trimMat, leafMidMat));
  }

  const trees = [
    [-7.5, 0, -11.5, 1.15], [7.5, 0, -11.5, 1.18], [-8.8, 0, 11.2, 1.15], [8.8, 0, 11.2, 1.18],
    [-22.5, 0, -15.5, 1.25], [22.5, 0, -15.5, 1.25], [-22.5, 0, 15.5, 1.2], [22.5, 0, 15.5, 1.2],
    [-15.5, 0, -22.0, 1.15], [15.5, 0, -22.0, 1.15], [-15.5, 0, 22.0, 1.15], [15.5, 0, 22.0, 1.15],
    [-31.0, 0, -21.0, 1.3], [31.0, 0, -21.0, 1.3], [-31.0, 0, 21.0, 1.3], [31.0, 0, 21.0, 1.3],
    [-20.5, 0, -31.0, 1.25], [20.5, 0, -31.0, 1.25], [-20.5, 0, 31.0, 1.25], [20.5, 0, 31.0, 1.25],
  ];
  for (const [tx, ty, tz, ts] of trees) {
    envGroup.add(buildLushTree(tx, ty, tz, ts, trunkMat, leafHiMat, leafMidMat, leafDarkMat));
  }

  // Share 5 flower materials across all 20 flower bushes (instead of creating 40 separate materials)
  const flowerMats = [0xfde047, 0xfb7185, 0xfb923c, 0xc084fc, 0xfef08a].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.22, roughness: 0.65 })
  );
  const flowerSpots = [
    [-7.5, 0, -4.5], [7.5, 0, -4.5], [-7.5, 0, 4.5], [7.5, 0, 4.5],
    [-4.5, 0, -7.5], [4.5, 0, -7.5], [-4.5, 0, 7.5], [4.5, 0, 7.5],
    [-11.5, 0, -10.0], [11.5, 0, -10.0], [-11.5, 0, 10.0], [11.5, 0, 10.0],
    [-19.5, 0, -10.0], [19.5, 0, -10.0], [-19.5, 0, 10.0], [19.5, 0, 10.0],
    [-18.0, 0, -4.5], [-18.0, 0, 4.5], [18.0, 0, -4.5], [18.0, 0, 4.5],
  ];
  for (const [fx, fy, fz] of flowerSpots) {
    envGroup.add(buildFlowerBush(fx, fy, fz, rng, leafMidMat, flowerMats));
  }

  // 9. Volumetric Sunbeam Shafts & Golden Firefly Motes
  const rayTex = createGodRayTexture();
  const rayMat = new THREE.MeshBasicMaterial({
    map: rayTex,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const rayGeo = getSharedGeo("sun-ray-plane", () => new THREE.PlaneGeometry(7.0, 24));
  for (const [rx, rz] of [[-4, -2], [14, -14], [-14, 14], [14, 14], [-14, -14]]) {
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.position.set(rx - 2, 8.0, rz - 1);
    ray.rotation.set(0.35, 0.35, -0.52);
    envGroup.add(ray);
  }

  const moteCount = 96;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (rng() - 0.5) * 60;
    motePos[i * 3 + 1] = 0.4 + rng() * 4.5;
    motePos[i * 3 + 2] = (rng() - 0.5) * 60;
  }
  const moteGeom = new THREE.BufferGeometry();
  moteGeom.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({
    map: createSoftGlowTexture(),
    size: 0.28,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const motes = new THREE.Points(moteGeom, moteMat);
  envGroup.add(motes);

  scene.add(envGroup);
  return {
    environmentGroup: envGroup,
    walkableMeshes,
    colliders,
    buildings,
    interiorLight,
    crystalMesh,
    runeDisc,
    waterTex,
    motes,
    atmosphereMats: {
      plazaMat,
      avenueMat,
      avenueMats,
      leafHiMat,
      leafMidMat,
      leafDarkMat,
      lampGlowMat,
      rayMat,
      moteMat,
      windowGlassMat: skylineWinMat,
    },
  };
}
