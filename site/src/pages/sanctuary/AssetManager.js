import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

const OPTIONAL_CHARACTER_ATTACHMENTS = new Set([
  "1H_Sword_Offhand", "Badge_Shield", "Rectangle_Shield", "Round_Shield", "Spike_Shield",
  "1H_Sword", "2H_Sword", "Knight_Helmet", "Knight_Cape",
  "Spellbook", "Spellbook_open", "1H_Wand", "2H_Staff", "Mage_Hat", "Mage_Cape",
  "Knife_Offhand", "1H_Crossbow", "2H_Crossbow", "Knife", "Throwable", "Rogue_Cape",
  "1H_Axe_Offhand", "Barbarian_Round_Shield", "1H_Axe", "2H_Axe", "Mug", "Barbarian_Hat", "Barbarian_Cape",
]);

const LOGICAL_TO_KAYKIT_CLIP = {
  Idle: ["Idle", "Unarmed_Idle"],
  Walk: ["Walking_A", "Walking_B", "Walking_C"],
  Run: ["Running_A", "Running_B"],
  Cast: ["Spellcast_Raise", "Spellcasting", "Spellcast_Shoot"],
  Attack: ["1H_Melee_Attack_Slice_Diagonal", "Unarmed_Melee_Attack_Punch_A"],
  Sit: ["Sit_Floor_Idle", "Sit_Chair_Idle"],
  SitChair: ["Sit_Chair_Idle", "Sit_Chair_Pose"],
  Cheer: ["Cheer"],
  Interact: ["Interact", "Use_Item", "PickUp"],
  Jump: ["Jump_Full_Short", "Jump_Idle"],
};

const ONESHOT_ACTIONS = new Set(["Cheer", "Interact", "Jump", "Attack", "Cast"]);

const glbCache = new Map();
const tintedTexCache = new Map();

function rgbToHsl01(r, g, b) {
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

function hslToRgb01(h, s, l) {
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

function getTintedCharacterTexture(sourceTex, cacheKey, hueShift = 0, satMult = 1) {
  if (!sourceTex?.image || (!hueShift && satMult === 1)) return sourceTex;
  const key = `${cacheKey}|${hueShift.toFixed(3)}|${satMult.toFixed(2)}`;
  if (tintedTexCache.has(key)) return tintedTexCache.get(key);

  const img = sourceTex.image;
  const w = img.width || 256;
  const h = img.height || 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const [hue, sat, lum] = rgbToHsl01(r, g, b);
    const isSkinOrGold = r > 175 && g > 118 && b > 68 && r >= g && g >= b - 10 && (r - g) < 88 && (r - b) < 135;
    if (!isSkinOrGold && sat > 0.14 && lum > 0.12 && lum < 0.9) {
      const nh = (hue + hueShift + 1) % 1;
      const ns = Math.min(1, sat * satMult);
      [r, g, b] = hslToRgb01(nh, ns, lum);
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const nextTex = new THREE.CanvasTexture(canvas);
  nextTex.colorSpace = THREE.SRGBColorSpace;
  nextTex.flipY = sourceTex.flipY;
  nextTex.magFilter = sourceTex.magFilter;
  nextTex.minFilter = sourceTex.minFilter;
  nextTex.wrapS = sourceTex.wrapS;
  nextTex.wrapT = sourceTex.wrapT;
  nextTex.needsUpdate = true;
  tintedTexCache.set(key, nextTex);
  return nextTex;
}

/**
 * Full-3D Rigged CC0 KayKit Character Actor with smooth cross-faded skeletal animations,
 * yaw interpolation, modular equipment visibility, and fast capsule hitMesh picking.
 */
export class GlbCharacterActor {
  constructor(rootGroup, modelRoot, hitMesh, animations, attachments = []) {
    this.mesh = rootGroup;
    this.modelRoot = modelRoot;
    this.hitMesh = hitMesh;
    this.mixer = new THREE.AnimationMixer(modelRoot);
    this.actions = new Map();
    this.currentAction = "Idle";
    this.currentClipAction = null;
    this.facingAngle = 0;
    this.currentYaw = 0;
    this.lastSector = 0;
    this.onActionComplete = null;

    const clipByName = new Map(animations.map((c) => [c.name, c]));
    for (const [logicalName, candidates] of Object.entries(LOGICAL_TO_KAYKIT_CLIP)) {
      const found = candidates.map((n) => clipByName.get(n)).find(Boolean);
      if (found) {
        const act = this.mixer.clipAction(found);
        this.actions.set(logicalName, act);
      }
    }

    // Apply modular equipment & headwear filtering
    const allowedSet = new Set(attachments);
    modelRoot.traverse((obj) => {
      if (OPTIONAL_CHARACTER_ATTACHMENTS.has(obj.name)) {
        obj.visible = allowedSet.has(obj.name);
      }
    });

    this.mixer.addEventListener("finished", (ev) => {
      if (ev.action === this.currentClipAction && ONESHOT_ACTIONS.has(this.currentAction)) {
        const cb = this.onActionComplete;
        this.onActionComplete = null;
        this.playAction("Idle", null, true);
        if (cb) cb();
      }
    });

    this.playAction("Idle", null, true);
  }

  setUserData(key, value) {
    this.mesh.userData[key] = value;
    if (this.hitMesh) this.hitMesh.userData[key] = value;
  }

  playAction(actionName, onComplete = null, restart = false) {
    const resolvedName = this.actions.has(actionName) ? actionName : "Idle";
    const nextClip = this.actions.get(resolvedName);
    if (!nextClip) return;
    if (this.currentAction === resolvedName && !restart) return;

    const prevClip = this.currentClipAction;
    this.currentAction = resolvedName;
    this.onActionComplete = onComplete;

    const isOneShot = ONESHOT_ACTIONS.has(resolvedName);
    nextClip.reset();
    nextClip.setLoop(isOneShot ? THREE.LoopOnce : THREE.LoopRepeat, isOneShot ? 1 : Infinity);
    nextClip.clampWhenFinished = isOneShot;
    nextClip.enabled = true;
    nextClip.play();

    if (prevClip && prevClip !== nextClip) {
      nextClip.crossFadeFrom(prevClip, 0.2, false);
    }
    this.currentClipAction = nextClip;
  }

  update(dt, cameraAzimuth, facingAngle = this.facingAngle) {
    this.facingAngle = facingAngle;

    let diff = (facingAngle - this.currentYaw) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    this.currentYaw += diff * Math.min(1, dt * 13);
    this.modelRoot.rotation.y = this.currentYaw;

    this.mixer.update(dt);

    const twoPi = Math.PI * 2;
    let rel = (cameraAzimuth - facingAngle) % twoPi;
    if (rel < 0) rel += twoPi;
    const sector = Math.round(rel / (Math.PI / 4)) % 8;
    this.lastSector = sector;
    return sector;
  }

  dispose() {
    this.mixer?.stopAllAction();
    this.mesh.traverse((child) => {
      if (child.isMesh && !child.isSkinnedMesh && child !== this.hitMesh) {
        // Keep shared GLB geometries, only dispose cloned materials & hit/shadow helpers
      }
      if (child.material && child.material._isClonedCharMat) {
        child.material.dispose();
      }
    });
    this.hitMesh?.geometry?.dispose();
    this.hitMesh?.material?.dispose();
  }
}

async function getCachedGlb(glbUrl) {
  if (!glbCache.has(glbUrl)) {
    const loader = new GLTFLoader();
    glbCache.set(
      glbUrl,
      new Promise((resolve, reject) => loader.load(glbUrl, resolve, undefined, reject))
    );
  }
  return glbCache.get(glbUrl);
}

/**
 * Load and clone a rigged CC0 KayKit character GLB with modular attachments & optional hue tint.
 */
export async function loadGlbCharacter({
  glbUrl,
  attachments = [],
  hueShift = 0,
  satMult = 1.0,
  targetHeight = 2.05,
} = {}) {
  const gltf = await getCachedGlb(glbUrl);
  const modelRoot = SkeletonUtils.clone(gltf.scene);

  const clonedMatCache = new Map();
  const allowedSet = new Set(attachments);
  const coreBox = new THREE.Box3();
  modelRoot.traverse((child) => {
    if (OPTIONAL_CHARACTER_ATTACHMENTS.has(child.name)) {
      child.visible = allowedSet.has(child.name);
    }
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = false;

      if (child.material) {
        const origMat = child.material;
        if (!clonedMatCache.has(origMat.uuid)) {
          const mat = origMat.clone();
          mat._isClonedCharMat = true;
          if (mat.map && (hueShift || satMult !== 1.0)) {
            mat.map = getTintedCharacterTexture(mat.map, glbUrl, hueShift, satMult);
          }
          mat.roughness = Math.max(0.55, mat.roughness ?? 0.72);
          clonedMatCache.set(origMat.uuid, mat);
        }
        child.material = clonedMatCache.get(origMat.uuid);
      }

      if (/_Body$|_Head|_Leg/.test(child.name)) {
        coreBox.expandByObject(child);
      }
    }
  });

  // Measure core humanoid proportions (independent of tall wizard hats or staves)
  const fallbackBox = coreBox.isEmpty() ? new THREE.Box3().setFromObject(modelRoot) : coreBox;
  const rawH = Math.max(1.1, fallbackBox.max.y - fallbackBox.min.y);
  const scaleFactor = THREE.MathUtils.clamp(targetHeight / rawH, 0.55, 1.35);
  modelRoot.scale.setScalar(scaleFactor);

  const rootGroup = new THREE.Group();
  rootGroup.add(modelRoot);

  // Soft radial contact shadow anchored at feet
  const shadowGeo = new THREE.CircleGeometry(0.62, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: createContactShadowTexture(),
    transparent: true,
    opacity: 0.76,
    depthWrite: false,
  });
  shadowMat._isClonedCharMat = true;
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  shadowDisc.castShadow = false;
  shadowDisc.receiveShadow = false;
  shadowDisc.raycast = () => {};
  rootGroup.add(shadowDisc);

  // Fast invisible capsule hitbox for effortless pointer picking
  const hitMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, targetHeight + 0.2, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })
  );
  hitMesh.position.y = (targetHeight + 0.2) * 0.5;
  rootGroup.add(hitMesh);

  return new GlbCharacterActor(rootGroup, modelRoot, hitMesh, gltf.animations || [], attachments);
}

/**
 * 8-Directional Y-Axis Cylindrical Billboard Actor backed by atlas JSON + NearestFilter PNG sheet.
 */
export class SpriteActor {
  constructor(mesh, texture, atlas) {
    this.mesh = mesh;
    this.texture = texture;
    this.atlas = atlas;
    this.currentAction = "Idle";
    this.frameTimer = 0;
    this.currentCol = atlas.columns.Idle?.start ?? 0;
    this.facingAngle = 0;
    this.lastSector = 0;
    this.onActionComplete = null;
  }

  playAction(actionName, onComplete = null, restart = false) {
    const spec = this.atlas.columns[actionName];
    if (!spec) return;
    if (this.currentAction === actionName && !restart) return;
    this.currentAction = actionName;
    this.frameTimer = 0;
    this.currentCol = spec.start;
    this.onActionComplete = onComplete;
  }

  update(dt, cameraAzimuth, facingAngle = this.facingAngle) {
    this.facingAngle = facingAngle;
    this.mesh.rotation.y = cameraAzimuth;

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
        this.playAction("Idle", null, true);
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
    this.mesh.geometry?.dispose();
    this.mesh.material?.dispose();
    this.mesh.customDepthMaterial?.dispose();
    this.texture?.dispose();
  }
}

function loadTextureAsync(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

export async function loadSpriteActor(atlasJsonUrl) {
  const res = await fetch(atlasJsonUrl);
  if (!res.ok) throw new Error(`Failed to fetch atlas JSON: ${atlasJsonUrl} (${res.status})`);
  const atlas = await res.json();

  const textureLoader = new THREE.TextureLoader();
  const sheetUrl = new URL(atlas.sheet, document.baseURI).href;
  const spriteTexture = await loadTextureAsync(textureLoader, sheetUrl);

  spriteTexture.magFilter = THREE.NearestFilter;
  spriteTexture.minFilter = THREE.NearestFilter;
  spriteTexture.generateMipmaps = false;
  spriteTexture.colorSpace = THREE.SRGBColorSpace;
  spriteTexture.wrapS = THREE.ClampToEdgeWrapping;
  spriteTexture.wrapT = THREE.ClampToEdgeWrapping;
  spriteTexture.repeat.set(1 / atlas.cols, 1 / atlas.rows);
  spriteTexture.offset.set(0, (atlas.rows - 1) / atlas.rows);

  const worldHeight = atlas.world_height || 2.35;
  const aspect = (atlas.cell_width || 128) / (atlas.cell_height || 128);
  const worldWidth = worldHeight * aspect;

  const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
  geometry.translate(0, worldHeight / 2, 0);

  const material = new THREE.MeshStandardMaterial({
    map: spriteTexture,
    alphaTest: 0.5,
    transparent: false,
    roughness: 0.88,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: spriteTexture,
    alphaTest: 0.5,
  });

  // Ground contact shadow disc to anchor HD-2D sprites cleanly without blurring alpha silhouette
  const shadowGeo = new THREE.CircleGeometry(Math.max(0.56, worldWidth * 0.34), 24);
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
  mesh.add(shadowDisc);

  return new SpriteActor(mesh, spriteTexture, atlas);
}

/* ---------- High-Res Procedural Sandstone Masonry & Bump Textures ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createContactShadowTexture() {
  if (createContactShadowTexture._tex) return createContactShadowTexture._tex;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const cx = size / 2;
  const g = ctx.createRadialGradient(cx, cx, 4, cx, cx, cx - 2);
  g.addColorStop(0, "rgba(18, 12, 6, 0.58)");
  g.addColorStop(0.55, "rgba(18, 12, 6, 0.28)");
  g.addColorStop(1, "rgba(18, 12, 6, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  createContactShadowTexture._tex = tex;
  return tex;
}

function createAvenuePaverTexture(horizontal = false) {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const rng = mulberry32(90812);

  if (horizontal) {
    ctx.translate(size / 2, size / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-size / 2, -size / 2);
  }

  // Dressed limestone base + dark side curb borders
  ctx.fillStyle = "#b99c6e";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#d9c297";
  ctx.fillRect(0, 0, 36, size);
  ctx.fillRect(size - 36, 0, 36, size);
  ctx.fillStyle = "#8a6d45";
  ctx.fillRect(36, 0, 5, size);
  ctx.fillRect(size - 41, 0, 5, size);

  const innerW = size - 82;
  const cols = 4;
  const rows = 6;
  const cellW = innerW / cols;
  const cellH = size / rows;
  const tones = ["#efe0be", "#e7d3aa", "#f3e6ca", "#dec496"];

  for (let r = 0; r < rows; r++) {
    const shift = (r % 2) * (cellW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const px = 41 + col * cellW + shift;
      const py = r * cellH;
      const drawX = Math.max(41, px);
      const drawW = Math.min(41 + innerW, px + cellW) - drawX;
      if (drawW <= 4) continue;
      ctx.fillStyle = tones[Math.floor(rng() * tones.length)];
      ctx.beginPath();
      ctx.roundRect(drawX + 2, py + 2, drawW - 4, cellH - 4, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 250, 232, 0.42)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Carved curb joints
  ctx.strokeStyle = "rgba(110, 84, 48, 0.45)";
  ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(36, y);
    ctx.moveTo(size - 36, y); ctx.lineTo(size, y);
    ctx.stroke();
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
  const w = 512;
  const h = 288;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  // Dark obsidian monitor UI surface
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#0b1220");
  bg.addColorStop(1, "#111c33");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle dashboard grid lines
  ctx.strokeStyle = "rgba(148, 163, 184, 0.12)";
  ctx.lineWidth = 1;
  for (let gx = 32; gx < w; gx += 48) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
  }
  for (let gy = 32; gy < h; gy += 48) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
  }

  // Top header bar
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(14, 14, w - 28, 52);
  ctx.strokeStyle = hexAccent;
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, w - 28, 52);

  ctx.fillStyle = hexAccent;
  ctx.font = "700 13px monospace";
  ctx.fillText(badge, 28, 36);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 20px sans-serif";
  ctx.fillText(title, 28, 57);

  // 3 Mini KPI cards + chart bars preview
  const cardW = (w - 56) / 3;
  for (let i = 0; i < 3; i++) {
    const cx = 14 + i * (cardW + 14);
    ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
    ctx.beginPath();
    ctx.roundRect(cx, 82, cardW, 72, 8);
    ctx.fill();
    ctx.fillStyle = i === 0 ? hexAccent : "rgba(248, 250, 252, 0.82)";
    ctx.fillRect(cx + 12, 98, cardW * 0.45, 8);
    ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
    ctx.fillRect(cx + 12, 118, cardW * 0.72, 6);
    ctx.fillRect(cx + 12, 132, cardW * 0.56, 6);
  }

  // Lower main chart / article feed panel
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.beginPath();
  ctx.roundRect(14, 168, w - 28, 102, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const barHeights = [34, 52, 40, 64, 48, 72, 58, 66];
  barHeights.forEach((bh, idx) => {
    const bx = 32 + idx * 28;
    const by = 252 - bh;
    ctx.fillStyle = idx === 5 ? hexAccent : "rgba(56, 189, 248, 0.65)";
    ctx.beginPath();
    ctx.roundRect(bx, by, 18, bh, 4);
    ctx.fill();
  });

  // Right feed lines + CTA hint
  for (let row = 0; row < 3; row++) {
    ctx.fillStyle = "rgba(248, 250, 252, 0.75)";
    ctx.fillRect(275, 186 + row * 24, 200, 7);
    ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
    ctx.fillRect(275, 198 + row * 24, 145, 5);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSandstoneTextures() {
  const size = 1024;
  const diff = document.createElement("canvas");
  diff.width = size; diff.height = size;
  const dCtx = diff.getContext("2d");

  const bump = document.createElement("canvas");
  bump.width = size; bump.height = size;
  const bCtx = bump.getContext("2d");

  // Warm mortar grout background
  dCtx.fillStyle = "#7a5e3c";
  dCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = "#353535";
  bCtx.fillRect(0, 0, size, size);

  const rng = mulberry32(20261118);
  const stoneTones = ["#eddcb7", "#e2c794", "#d6b57c", "#c8a368", "#f1e2c4", "#dbb882"];
  const rows = 16;
  const rowH = size / rows;

  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * -38;
    while (x < size) {
      const bw = 64 + Math.floor(rng() * 52);
      const tone = stoneTones[Math.floor(rng() * stoneTones.length)];
      const gap = 4;

      dCtx.fillStyle = tone;
      dCtx.beginPath();
      dCtx.roundRect(x + gap, r * rowH + gap, bw - gap * 2, rowH - gap * 2, 5);
      dCtx.fill();

      // Sunlit upper-left bevel & lower-right shadow edge
      dCtx.strokeStyle = "rgba(255, 248, 224, 0.45)";
      dCtx.lineWidth = 2;
      dCtx.stroke();

      // Subtle mineral grain speckles
      for (let s = 0; s < 14; s++) {
        dCtx.fillStyle = rng() > 0.5 ? "rgba(120, 88, 52, 0.14)" : "rgba(255, 250, 235, 0.16)";
        dCtx.fillRect(x + gap + rng() * (bw - 12), r * rowH + gap + rng() * (rowH - 12), 3, 2);
      }

      // Matching bump block
      const bVal = 175 + Math.floor(rng() * 55);
      bCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      bCtx.beginPath();
      bCtx.roundRect(x + gap, r * rowH + gap, bw - gap * 2, rowH - gap * 2, 5);
      bCtx.fill();

      x += bw;
    }
  }

  // Soft mossy green accents near tile crevices
  for (let m = 0; m < 45; m++) {
    const mx = rng() * size;
    const my = rng() * size;
    const rad = 10 + rng() * 24;
    const grad = dCtx.createRadialGradient(mx, my, 2, mx, my, rad);
    grad.addColorStop(0, "rgba(96, 134, 48, 0.34)");
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
  diffTex.repeat.set(3.2, 3.2);
  diffTex.rotation = Math.PI / 4; // Diagonal masonry like concept art!

  const bumpTex = new THREE.CanvasTexture(bump);
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(3.2, 3.2);
  bumpTex.rotation = Math.PI / 4;

  return { diffTex, bumpTex };
}

function createPermanentRuneTexture() {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const glow = ctx.createRadialGradient(cx, cy, 80, cx, cy, 485);
  glow.addColorStop(0, "rgba(186, 230, 253, 0.14)");
  glow.addColorStop(0.55, "rgba(254, 240, 138, 0.22)");
  glow.addColorStop(0.85, "rgba(251, 191, 36, 0.14)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 490, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#fff7d6";
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 16;

  for (const [r, lw] of [[452, 6], [392, 4], [320, 3], [220, 4]]) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Intersecting sacred square & rotated star lines
  ctx.lineWidth = 3.5;
  for (const rot of [0, Math.PI / 4]) {
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const a = rot + (i * Math.PI) / 2;
      const x = cx + Math.cos(a) * 392;
      const y = cy + Math.sin(a) * 392;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Ancient Runic Glyphs around outer ring
  ctx.fillStyle = "#fffbeb";
  ctx.font = "bold 28px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const runes = "ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊ";
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * 422, cy + Math.sin(a) * 422);
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
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(224, 242, 254, 0.92)");
  g.addColorStop(0.5, "rgba(56, 189, 248, 0.68)");
  g.addColorStop(1, "rgba(255, 255, 255, 0.88)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  for (let x = 4; x < 128; x += 14) {
    ctx.fillRect(x, 0, 4, 128);
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
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  const rng = mulberry32(seed);
  for (let i = 0; i < 420; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 4 + rng() * 9;
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
  c.width = 128; c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "rgba(255, 246, 200, 0.55)");
  g.addColorStop(0.65, "rgba(255, 238, 175, 0.2)");
  g.addColorStop(1, "rgba(255, 238, 175, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 256);
  const mask = ctx.createLinearGradient(0, 0, 128, 0);
  mask.addColorStop(0, "rgba(0,0,0,1)");
  mask.addColorStop(0.2, "rgba(0,0,0,0)");
  mask.addColorStop(0.8, "rgba(0,0,0,0)");
  mask.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, 128, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ---------- Diorama Geometry Builders ---------- */
function buildCrystalFountain(group, stoneMat, trimMat) {
  const fGroup = new THREE.Group();

  // Base stepped basin
  const baseStep = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.35, 0.24, 36), stoneMat);
  baseStep.position.y = 0.12;
  baseStep.castShadow = true; baseStep.receiveShadow = true;
  fGroup.add(baseStep);

  const basinWall = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.78, 0.62, 36), stoneMat);
  basinWall.position.y = 0.45;
  basinWall.castShadow = true; basinWall.receiveShadow = true;
  fGroup.add(basinWall);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.14, 12, 36), trimMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.76;
  rim.castShadow = true; rim.receiveShadow = true;
  fGroup.add(rim);

  // Glowing turquoise pool surface
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.72,
    roughness: 0.12,
    metalness: 0.15,
    transparent: true,
    opacity: 0.94,
  });
  const pool = new THREE.Mesh(new THREE.CircleGeometry(1.48, 36), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.y = 0.74;
  fGroup.add(pool);

  // Tiered center pillar & chalice bowl
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.44, 0.95, 20), trimMat);
  stem.position.y = 1.05;
  stem.castShadow = true;
  fGroup.add(stem);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.36, 0.28, 24), trimMat);
  bowl.position.y = 1.48;
  bowl.castShadow = true;
  fGroup.add(bowl);

  // Flowing water veil curtains
  const waterTex = createWaterStreakTexture();
  const waterMat = new THREE.MeshBasicMaterial({
    map: waterTex,
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const waterFall = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.96, 0.74, 24, 1, true), waterMat);
  waterFall.position.y = 1.08;
  fGroup.add(waterFall);

  // Floating glowing cyan Sanctuary Crystal
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

  // Permanent glowing golden rune magic circle around fountain
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

function buildDiagonalStaircase(x, z, rotY, stoneMat, trimMat, walkableMeshes) {
  const stair = new THREE.Group();
  stair.position.set(x, 0, z);
  stair.rotation.y = rotY;

  const steps = 7;
  const stepW = 3.5;
  const stepD = 0.46;
  const stepH = 0.2;

  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * stepH;
    const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepW, h, stepD), trimMat);
    stepMesh.position.set(0, h * 0.5, i * stepD - (steps * stepD) * 0.5);
    stepMesh.castShadow = true;
    stepMesh.receiveShadow = true;
    stair.add(stepMesh);
    walkableMeshes.push(stepMesh);
  }

  // Left & Right Stepped Balustrade Cheek Walls + Plinth Posts
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.52, 1.55, steps * stepD + 0.6), stoneMat);
    wall.position.set(side * (stepW * 0.5 + 0.26), 0.77, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    stair.add(wall);

    const postLow = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.15, 0.72), trimMat);
    postLow.position.set(side * (stepW * 0.5 + 0.26), 0.58, -(steps * stepD) * 0.5 - 0.15);
    postLow.castShadow = true; postLow.receiveShadow = true;
    stair.add(postLow);

    const postTop = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.9, 0.72), trimMat);
    postTop.position.set(side * (stepW * 0.5 + 0.26), 0.95, (steps * stepD) * 0.5 + 0.15);
    postTop.castShadow = true; postTop.receiveShadow = true;
    stair.add(postTop);
  }

  return stair;
}

function buildSandstoneBench(x, z, rotY, stoneMat, trimMat) {
  const b = new THREE.Group();
  b.position.set(x, 0, z);
  b.rotation.y = rotY;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.16, 0.68), trimMat);
  seat.position.y = 0.44;
  seat.castShadow = true; seat.receiveShadow = true;
  b.add(seat);

  for (const lx of [-0.72, 0.72]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.4, 0.58), stoneMat);
    leg.position.set(lx, 0.2, 0);
    leg.castShadow = true; leg.receiveShadow = true;
    b.add(leg);
  }
  return b;
}

function buildAncientColumn(x, z, baseY, height, broken, stoneMat, trimMat, leafMat) {
  const col = new THREE.Group();
  col.position.set(x, baseY, z);

  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.34, 1.05), trimMat);
  plinth.position.y = 0.17;
  plinth.castShadow = true; plinth.receiveShadow = true;
  col.add(plinth);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, height, 14), stoneMat);
  shaft.position.y = 0.34 + height * 0.5;
  shaft.castShadow = true; shaft.receiveShadow = true;
  col.add(shaft);

  if (!broken) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.32, 1.08), trimMat);
    cap.position.y = 0.34 + height + 0.16;
    cap.castShadow = true; cap.receiveShadow = true;
    col.add(cap);
  }

  // Mossy ivy vine wrap
  const ivy = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35, 1), leafMat);
  ivy.scale.set(1.1, 1.6, 1.1);
  ivy.position.set(0.28, 0.75, 0.22);
  ivy.castShadow = true;
  col.add(ivy);

  return col;
}

function buildLushTree(x, y, z, scale, trunkMat, leafHiMat, leafMidMat, leafDarkMat) {
  const tree = new THREE.Group();
  tree.position.set(x, y, z);
  tree.scale.setScalar(scale);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.4, 2.2, 10), trunkMat);
  trunk.position.y = 1.1;
  trunk.castShadow = true; trunk.receiveShadow = true;
  tree.add(trunk);

  const puffs = [
    { pos: [0, 2.9, 0], r: 1.55, mat: leafDarkMat },
    { pos: [-0.95, 2.55, 0.6], r: 1.15, mat: leafMidMat },
    { pos: [0.95, 2.6, -0.45], r: 1.2, mat: leafMidMat },
    { pos: [-0.4, 3.45, 0.35], r: 1.15, mat: leafHiMat },
    { pos: [0.45, 3.2, 0.5], r: 1.0, mat: leafHiMat },
    { pos: [0, 3.7, -0.25], r: 0.95, mat: leafHiMat },
  ];
  for (const p of puffs) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(p.r, 1), p.mat);
    m.position.set(...p.pos);
    m.castShadow = true; m.receiveShadow = true;
    tree.add(m);
  }
  return tree;
}

function buildFlowerBush(x, y, z, rng, leafMat, flowerColors) {
  const bush = new THREE.Group();
  bush.position.set(x, y, z);

  const mound = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65 + rng() * 0.35, 1), leafMat);
  mound.scale.set(1.3, 0.75, 1.15);
  mound.position.y = 0.32;
  mound.castShadow = true; mound.receiveShadow = true;
  bush.add(mound);

  const fColor = flowerColors[Math.floor(rng() * flowerColors.length)];
  const fColor2 = flowerColors[Math.floor(rng() * flowerColors.length)];
  const bMat1 = new THREE.MeshStandardMaterial({ color: fColor, emissive: fColor, emissiveIntensity: 0.22, roughness: 0.65 });
  const bMat2 = new THREE.MeshStandardMaterial({ color: fColor2, emissive: fColor2, emissiveIntensity: 0.22, roughness: 0.65 });
  for (let i = 0; i < 11; i++) {
    const ang = (i / 11) * Math.PI * 2 + rng() * 0.4;
    const rad = 0.35 + rng() * 0.45;
    const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 + rng() * 0.06, 0), i % 2 === 0 ? bMat1 : bMat2);
    fl.position.set(Math.cos(ang) * rad, 0.45 + rng() * 0.32, Math.sin(ang) * rad * 0.9);
    bush.add(fl);
  }
  return bush;
}

/* ---------- Grand City Architecture & Enterable Building Builders ---------- */
function createWoodFloorTexture(baseHex = "#8c6239", plankHex = "#734e2a") {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);
  const plankH = 32;
  for (let row = 0; row < 8; row++) {
    ctx.fillStyle = row % 2 === 0 ? baseHex : plankHex;
    ctx.fillRect(0, row * plankH, size, plankH - 2);
    ctx.fillStyle = "rgba(40, 22, 10, 0.35)";
    ctx.fillRect(0, (row + 1) * plankH - 2, size, 2);
    const seamX = ((row * 97) % 200) + 28;
    ctx.fillRect(seamX, row * plankH, 2, plankH);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

function addWallCollider(colliders, cx, cz, w, d) {
  colliders.push({
    minX: cx - w * 0.5,
    maxX: cx + w * 0.5,
    minZ: cz - d * 0.5,
    maxZ: cz + d * 0.5,
  });
}

/**
 * Build a full 3D Enterable Building with open doorway, solid wall colliders,
 * furnished interior, interior light, and auto-cutaway roofGroup.
 */
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

  // Interior hardwood/stone floor (slightly raised y = 0.04, clickable to walk inside)
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

  // Outer foundation plinth step
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.14, d + 0.6), mats.trimMat);
  plinth.position.y = -0.02;
  plinth.receiveShadow = true;
  bGroup.add(plinth);

  const wallMat = new THREE.MeshStandardMaterial({
    map: mats.wallTex,
    color: 0xf0dfbd,
    roughness: 0.85,
  });
  const frontWallMat = wallMat.clone();
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
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

  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  const frontWindowGlassMat = windowGlassMat.clone();
  const planterLeafMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.88 });

  // Build 4 perimeter walls (South wall uses frontCutawayMaterials for clean camera sightlines inside)
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
      // Warm framed exterior windows on non-door walls
      for (const sideSign of [-1, 1]) {
        const offsetAlong = sideSign * (span * 0.24);
        const wx = isNS ? offsetAlong : lx + outX * (wallThick * 0.5 + 0.04);
        const wz = isNS ? lz + outZ * (wallThick * 0.5 + 0.04) : offsetAlong;
        const winFrame = new THREE.Mesh(
          new THREE.BoxGeometry(isNS ? 1.15 : 0.12, 1.25, isNS ? 0.12 : 1.15),
          tMat
        );
        winFrame.position.set(wx, 1.85, wz);
        bGroup.add(winFrame);
        const winPane = new THREE.Mesh(
          new THREE.BoxGeometry(isNS ? 0.88 : 0.14, 0.96, isNS ? 0.14 : 0.88),
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
      // Door lintel above doorway (no collider so hero walks right underneath!)
      const lintelH = wallH - doorH;
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(isNS ? doorW + 0.3 : wallThick + 0.14, lintelH, isNS ? wallThick + 0.14 : doorW + 0.3),
        tMat
      );
      lintel.position.set(lx, doorH + lintelH * 0.5, lz);
      lintel.castShadow = true;
      bGroup.add(lintel);

      // Doorway side pillars, warm lantern sign, porch awning & flanking flower planters
      for (const sign of [-1, 1]) {
        const px = isNS ? sign * (doorW * 0.5 + 0.12) : lx;
        const pz = isNS ? lz : sign * (doorW * 0.5 + 0.12);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, doorH + 0.1, 0.32), tMat);
        post.position.set(px, (doorH + 0.1) * 0.5, pz);
        post.castShadow = true;
        bGroup.add(post);

        const plantOff = sign * (doorW * 0.5 + 0.82);
        const plX = isNS ? plantOff : lx + outX * 0.56;
        const plZ = isNS ? lz + outZ * 0.56 : plantOff;
        const planter = new THREE.Mesh(
          new THREE.BoxGeometry(isNS ? 0.62 : 0.44, 0.34, isNS ? 0.44 : 0.62),
          timberMat
        );
        planter.position.set(plX, 0.17, plZ);
        planter.castShadow = true;
        bGroup.add(planter);
        const foliage = new THREE.Mesh(
          new THREE.BoxGeometry(isNS ? 0.54 : 0.36, 0.24, isNS ? 0.36 : 0.54),
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
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), isSouthCutaway ? frontAccentMat : accentMat);
      lantern.position.set(signX, doorH + 0.04, signZ);
      bGroup.add(lantern);
    }
  }

  // Timber corner beams (South corner beams fade gently when hero is inside)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, wallH + 0.12, 0.36),
        sz > 0 ? frontTimberMat : timberMat
      );
      beam.position.set(sx * (halfW - 0.12), (wallH + 0.12) * 0.5, sz * (halfD - 0.12));
      beam.castShadow = true;
      bGroup.add(beam);
    }
  }

  // Furnished Interior Props (kept near rear/side walls so center stays spacious)
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.78 });
  const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e19, roughness: 0.85 });
  const rugMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.9 });

  const rug = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.03, 28), rugMat);
  rug.position.y = 0.095;
  rug.receiveShadow = true;
  bGroup.add(rug);

  const addBookshelf = (bx, bz, rotY) => {
    const shelf = new THREE.Group();
    shelf.position.set(bx, 0.08, bz);
    shelf.rotation.y = rotY;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.35, 0.5), darkWoodMat);
    frame.position.y = 1.18;
    frame.castShadow = true; frame.receiveShadow = true;
    shelf.add(frame);
    const bookColors = [0xd97757, 0x38bdf8, 0xfbbf24, 0x34d399, 0xf43f5e];
    for (let row = 0; row < 3; row++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.32, 0.36),
        new THREE.MeshStandardMaterial({ color: bookColors[(row + bx.length) % bookColors.length] || bookColors[row], roughness: 0.7 })
      );
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
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), accentMat);
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
    for (const tx of [-halfW + 1.9, halfW - 1.9]) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 18), woodMat);
      table.position.set(tx, 0.76, 1.2);
      table.castShadow = true;
      bGroup.add(table);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.72, 10), darkWoodMat);
      leg.position.set(tx, 0.4, 1.2);
      bGroup.add(leg);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), accentMat);
      candle.position.set(tx, 0.9, 1.2);
      bGroup.add(candle);
    }
  } else if (interiorType === "observatory") {
    addBookshelf(-halfW + 0.85, 0.6, Math.PI * 0.5);
    addBookshelf(halfW - 0.85, 0.6, -Math.PI * 0.5);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.06, 10, 28), accentMat);
    ring.position.set(halfW - 1.8, 1.45, -halfD + 1.5);
    ring.rotation.set(0.4, 0.6, 0);
    bGroup.add(ring);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, 0.85, 16), mats.trimMat);
    ped.position.set(halfW - 1.8, 0.46, -halfD + 1.5);
    ped.castShadow = true;
    bGroup.add(ped);
  } else if (interiorType === "tavern") {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.95, 0.85), woodMat);
    bar.position.set(-0.5, 0.52, -halfD + 1.3);
    bar.castShadow = true;
    bGroup.add(bar);
    for (const sx of [-1.6, -0.5, 0.6]) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.52, 12), darkWoodMat);
      stool.position.set(sx, 0.3, -halfD + 2.2);
      bGroup.add(stool);
    }
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.08, 18), woodMat);
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

  // Interior Giant Dashboard Wall Screen Terminal (clickable inside room!)
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
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(scrW + 0.2, scrH + 0.2, 0.14),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.45 })
  );
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

  // Interior warm bounce light
  const intLight = new THREE.PointLight(accentColor, 2.2, 11);
  intLight.position.set(0, 2.6, 0);
  bGroup.add(intLight);

  // Separate Cutaway Roof Group (fades away cleanly when player enters!)
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

  // Crisp overhanging pitched hipped roof (non-indexed for sharp architectural roof slopes)
  const hippedGeo = new THREE.ConeGeometry(1, roofH, 4).toNonIndexed();
  hippedGeo.computeVertexNormals();
  const hippedRoof = new THREE.Mesh(hippedGeo, roofMat);
  hippedRoof.rotation.y = Math.PI * 0.25;
  hippedRoof.scale.set((w + 0.65) / Math.SQRT2, 1, (d + 0.65) / Math.SQRT2);
  hippedRoof.position.y = wallH + 0.26 + roofH * 0.5;
  hippedRoof.castShadow = true;
  hippedRoof.receiveShadow = true;
  hippedRoof.userData.enterBuildingId = id;
  roofGroup.add(hippedRoof);

  // Crown finial plinth & glowing emblem spire
  const crownCap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.9), roofTrimMat);
  crownCap.position.y = wallH + 0.26 + roofH + 0.04;
  crownCap.userData.enterBuildingId = id;
  roofGroup.add(crownCap);

  const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), accentMat.clone());
  spire.position.y = wallH + 0.26 + roofH + 0.48;
  spire.userData.enterBuildingId = id;
  roofGroup.add(spire);

  bGroup.add(roofGroup);

  // Compute doorway approach point (outside) & interior stand center
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
    group: bGroup,
    roofGroup,
    roofMaterials: [roofMat, roofTrimMat, spire.material],
    frontCutawayMaterials: [frontWallMat, frontTimberMat, awningMat, frontAccentMat, frontWindowGlassMat],
    screenMeshes: [bezel, displayPlane],
    roofOpacity: 1,
    intLight,
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
  for (const sx of [-3.6, 3.6]) {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.6, 1.6), stoneMat);
    tower.position.set(sx, 2.3, 0);
    tower.castShadow = true; tower.receiveShadow = true;
    g.add(tower);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 1.9), trimMat);
    cap.position.set(sx, 4.8, 0);
    cap.castShadow = true;
    g.add(cap);
  }
  const archBeam = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.9, 1.3), trimMat);
  archBeam.position.set(0, 4.05, 0);
  archBeam.castShadow = true;
  g.add(archBeam);
  return g;
}

function buildStreetLamp(x, z, trimMat, glowMat) {
  const lamp = new THREE.Group();
  lamp.position.set(x, 0, z);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.6, 10), trimMat);
  post.position.y = 1.3;
  post.castShadow = true;
  lamp.add(post);
  const bulb = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), glowMat);
  bulb.position.y = 2.75;
  lamp.add(bulb);
  return lamp;
}

function buildTownhouseSkyline(x, z, w, d, h, roofHex, stoneMat, trimMat, roofTileTex = null, winMat = null) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat);
  body.position.y = h * 0.5;
  body.castShadow = true; body.receiveShadow = true;
  t.add(body);

  const roofGeo = new THREE.ConeGeometry(1, 2.2, 4).toNonIndexed();
  roofGeo.computeVertexNormals();
  const roof = new THREE.Mesh(
    roofGeo,
    new THREE.MeshStandardMaterial({ map: roofTileTex, color: roofHex, roughness: 0.72 })
  );
  roof.rotation.y = Math.PI * 0.25;
  roof.scale.set((w + 0.5) / Math.SQRT2, 1, (d + 0.5) / Math.SQRT2);
  roof.position.y = h + 1.1;
  roof.castShadow = true;
  t.add(roof);

  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.35, 0.26, d + 0.35), trimMat);
  cornice.position.y = h;
  t.add(cornice);

  if (winMat) {
    for (const wy of [1.4, h - 1.1]) {
      if (wy > h - 0.55) continue;
      for (const sx of [-w * 0.22, w * 0.22]) {
        const wFront = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.08), winMat);
        wFront.position.set(sx, wy, d * 0.5 + 0.02);
        t.add(wFront);
        const wBack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.08), winMat);
        wBack.position.set(sx, wy, -d * 0.5 - 0.02);
        t.add(wBack);
      }
      for (const sz of [-d * 0.22, d * 0.22]) {
        const wSideL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.7), winMat);
        wSideL.position.set(-w * 0.5 - 0.02, wy, sz);
        t.add(wSideL);
        const wSideR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.7), winMat);
        wSideR.position.set(w * 0.5 + 0.02, wy, sz);
        t.add(wSideR);
      }
    }
  }
  return t;
}

/**
 * Construct the Grand Sunlit Sanctuary City with 4 Avenue Districts and 6 Enterable Buildings.
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
  diffTex.repeat.set(10, 10);
  bumpTex.repeat.set(10, 10);

  const plazaMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    bumpMap: bumpTex,
    bumpScale: 0.06,
    roughness: 0.86,
    metalness: 0.04,
  });
  const roofTileTex = createRoofTileTexture();
  const avenueTexNS = createAvenuePaverTexture(false);
  avenueTexNS.repeat.set(1, 16);
  const avenueTexEW = createAvenuePaverTexture(true);
  avenueTexEW.repeat.set(16, 1);
  const ringTexEW = avenueTexEW.clone();
  ringTexEW.repeat.set(12, 1);
  ringTexEW.needsUpdate = true;
  const ringTexNS = avenueTexNS.clone();
  ringTexNS.repeat.set(1, 12);
  ringTexNS.needsUpdate = true;

  const avenueMats = [];
  const makeAvenueMat = (tex) => {
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.78,
      metalness: 0.05,
    });
    avenueMats.push(mat);
    return mat;
  };
  const aveMatNS = makeAvenueMat(avenueTexNS);
  const aveMatEW = makeAvenueMat(avenueTexEW);
  const ringMatEW = makeAvenueMat(ringTexEW);
  const ringMatNS = makeAvenueMat(ringTexNS);
  const avenueMat = aveMatNS;
  const wallTex = diffTex.clone();
  wallTex.repeat.set(2.2, 0.6);
  wallTex.rotation = 0;
  wallTex.needsUpdate = true;
  const stoneWallMat = new THREE.MeshStandardMaterial({
    map: wallTex,
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

  // 1. Vast Walkable City Cobblestone Floor (76 x 76, walkable [-32.5, 32.5])
  const floor = new THREE.Mesh(new THREE.BoxGeometry(76, 0.5, 76), plazaMat);
  floor.name = "Walkable_CityFloor";
  floor.position.y = -0.25;
  floor.receiveShadow = true;
  envGroup.add(floor);
  walkableMeshes.push(floor);

  // Cardinal Grand Avenues & Ring Boulevard Stone Runners (staggered Y prevents overlap Z-fighting)
  const avenueConfigs = [
    [0, 0.016, 0, 5.4, 0.03, 68, aveMatNS],   // N-S Grand Avenue
    [0, 0.013, 0, 68, 0.03, 5.4, aveMatEW],   // E-W Grand Avenue
    [0, 0.009, -24.5, 52, 0.03, 4.0, ringMatEW], // North Ring Road
    [0, 0.009, 24.5, 52, 0.03, 4.0, ringMatEW],  // South Ring Road
    [-24.5, 0.006, 0, 4.0, 0.03, 52, ringMatNS], // West Ring Road
    [24.5, 0.006, 0, 4.0, 0.03, 52, ringMatNS],  // East Ring Road
  ];
  for (const [ax, ay, az, aw, ah, ad, mat] of avenueConfigs) {
    const av = new THREE.Mesh(new THREE.BoxGeometry(aw, ah, ad), mat);
    av.position.set(ax, ay, az);
    av.receiveShadow = true;
    envGroup.add(av);
    walkableMeshes.push(av);
  }

  // 2. Central Plaza Corner Balustrades (leaving wide 6.4-unit open gates N/S/E/W!)
  const plazaCorners = [
    [-6.6, 0.65, -9.2, 5.4, 1.3, 0.6], [6.6, 0.65, -9.2, 5.4, 1.3, 0.6],
    [-6.6, 0.65, 9.2, 5.4, 1.3, 0.6],  [6.6, 0.65, 9.2, 5.4, 1.3, 0.6],
    [-9.2, 0.65, -6.6, 0.6, 1.3, 5.4], [-9.2, 0.65, 6.6, 0.6, 1.3, 5.4],
    [9.2, 0.65, -6.6, 0.6, 1.3, 5.4],  [9.2, 0.65, 6.6, 0.6, 1.3, 5.4],
  ];
  for (const [wx, wy, wz, ww, wh, wd] of plazaCorners) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, wh, wd), stoneWallMat);
    wall.position.set(wx, wy, wz);
    wall.castShadow = true; wall.receiveShadow = true;
    envGroup.add(wall);
    const coping = new THREE.Mesh(new THREE.BoxGeometry(ww + 0.16, 0.16, wd + 0.16), trimMat);
    coping.position.set(wx, 1.36, wz);
    coping.castShadow = true;
    envGroup.add(coping);
    addWallCollider(colliders, wx, wz, ww, wd);
  }

  // 3. Outer City Battlement Walls & 4 Grand City Gates (at +-35)
  const outerWalls = [
    [-19.5, 1.3, -35.0, 29, 2.6, 1.4], [19.5, 1.3, -35.0, 29, 2.6, 1.4],
    [-19.5, 1.3, 35.0, 29, 2.6, 1.4],  [19.5, 1.3, 35.0, 29, 2.6, 1.4],
    [-35.0, 1.3, -19.5, 1.4, 2.6, 29], [-35.0, 1.3, 19.5, 1.4, 2.6, 29],
    [35.0, 1.3, -19.5, 1.4, 2.6, 29],  [35.0, 1.3, 19.5, 1.4, 2.6, 29],
  ];
  for (const [ox, oy, oz, ow, oh, od] of outerWalls) {
    const owMesh = new THREE.Mesh(new THREE.BoxGeometry(ow, oh, od), stoneWallMat);
    owMesh.position.set(ox, oy, oz);
    owMesh.castShadow = true; owMesh.receiveShadow = true;
    envGroup.add(owMesh);
    const topTrim = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.25, 0.28, od + 0.25), trimMat);
    topTrim.position.set(ox, oh + 0.14, oz);
    envGroup.add(topTrim);
  }
  envGroup.add(buildCityGate(0, -35.0, 0, stoneWallMat, trimMat));
  envGroup.add(buildCityGate(0, 35.0, 0, stoneWallMat, trimMat));
  envGroup.add(buildCityGate(-35.0, 0, Math.PI * 0.5, stoneWallMat, trimMat));
  envGroup.add(buildCityGate(35.0, 0, Math.PI * 0.5, stoneWallMat, trimMat));

  // 4. Central Crystal Fountain + Permanent Glowing Golden Rune Circle
  const { crystalMesh, runeDisc, waterTex } = buildCrystalFountain(envGroup, stoneWallMat, trimMat);

  // 5. Six Enterable Buildings (4 District Archive Halls + West Tavern + East Workshop)
  const mats = { wallTex, trimMat, woodTex, roofTileTex };
  const buildingSpecs = [
    { id: "plugins", title: "인기 플러그인 공방", x: -15, z: -15, w: 10, d: 9, doorDir: "S", roofColor: 0xd97757, accentColor: 0xfbbf24, interiorType: "forge" },
    { id: "news", title: "AI 뉴스 대도서관", x: 15, z: -15, w: 11, d: 9, doorDir: "S", roofColor: 0x2563eb, accentColor: 0x38bdf8, interiorType: "library" },
    { id: "social", title: "소셜 피드 라운지", x: -15, z: 15, w: 10, d: 9, doorDir: "N", roofColor: 0xbe185d, accentColor: 0xfb7185, interiorType: "salon" },
    { id: "benchmarks", title: "벤치마크 관측소", x: 15, z: 15, w: 10, d: 9, doorDir: "N", roofColor: 0x059669, accentColor: 0x34d399, interiorType: "observatory" },
    { id: "tavern", title: "서쪽 여행자 여관", x: -24, z: 0, w: 8, d: 8, doorDir: "E", roofColor: 0xb45309, accentColor: 0xf59e0b, interiorType: "tavern" },
    { id: "workshop", title: "동쪽 장인 아틀리에", x: 24, z: 0, w: 8, d: 8, doorDir: "W", roofColor: 0x0f766e, accentColor: 0x2dd4bf, interiorType: "workshop" },
  ];
  for (const spec of buildingSpecs) {
    const built = buildEnterableBuilding(spec, mats, walkableMeshes, colliders);
    envGroup.add(built.group);
    buildings.push(built);
  }

  // 6. Outer District Skyline Townhouses (framing the perimeter avenues)
  const skylineWinMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.42,
    roughness: 0.28,
  });
  const skylineSpecs = [
    [-28, -28, 7, 7, 4.4, 0xc2410c], [28, -28, 7, 7, 4.8, 0x1d4ed8],
    [-28, 28, 7, 7, 4.2, 0x9d174d],  [28, 28, 7, 7, 4.6, 0x047857],
    [-8, -29, 6, 5, 3.6, 0xb45309],  [8, -29, 6, 5, 3.8, 0x0369a1],
    [-8, 29, 6, 5, 3.6, 0x9f1239],   [8, 29, 6, 5, 3.8, 0x065f46],
    [-29, -9, 5, 6, 3.5, 0xa16207],  [29, -9, 5, 6, 3.7, 0x1e40af],
    [-29, 9, 5, 6, 3.5, 0xbe123c],   [29, 9, 5, 6, 3.7, 0x0f766e],
  ];
  for (const [tx, tz, tw, td, th, rc] of skylineSpecs) {
    envGroup.add(buildTownhouseSkyline(tx, tz, tw, td, th, rc, stoneWallMat, trimMat, roofTileTex, skylineWinMat));
    addWallCollider(colliders, tx, tz, tw, td);
  }

  // 7. Plaza & Avenue Benches + Streetlamps
  const benchConfigs = [
    [-5.5, -5.5, Math.PI * 0.25], [5.5, -5.5, -Math.PI * 0.25],
    [-5.5, 5.5, Math.PI * 0.75],  [5.5, 5.5, -Math.PI * 0.75],
    [-4.2, -16.0, Math.PI * 0.5], [4.2, -16.0, -Math.PI * 0.5],
    [-4.2, 16.0, Math.PI * 0.5],  [4.2, 16.0, -Math.PI * 0.5],
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

  // 8. Lush Foliage Trees, Ancient Columns & Flower Beds across the Grand City
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.92 });
  const leafHiTex = createFoliageTexture("#8db93d", "#cde05c", "#5c8529", 11);
  const leafMidTex = createFoliageTexture("#5c8a32", "#84b344", "#375c1c", 22);
  const leafDarkTex = createFoliageTexture("#355c20", "#558030", "#1e3a12", 33);
  const leafHiMat = new THREE.MeshStandardMaterial({ map: leafHiTex, bumpMap: leafHiTex, bumpScale: 0.05, roughness: 0.86 });
  const leafMidMat = new THREE.MeshStandardMaterial({ map: leafMidTex, bumpMap: leafMidTex, bumpScale: 0.05, roughness: 0.88 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ map: leafDarkTex, bumpMap: leafDarkTex, bumpScale: 0.05, roughness: 0.9 });

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
    [-7.5, 0, -11.5, 1.15], [7.5, 0, -11.5, 1.18], [-7.5, 0, 11.5, 1.15], [7.5, 0, 11.5, 1.18],
    [-22.5, 0, -15.5, 1.25], [22.5, 0, -15.5, 1.25], [-22.5, 0, 15.5, 1.2], [22.5, 0, 15.5, 1.2],
    [-15.5, 0, -22.0, 1.15], [15.5, 0, -22.0, 1.15], [-15.5, 0, 22.0, 1.15], [15.5, 0, 22.0, 1.15],
    [-31.0, 0, -21.0, 1.3], [31.0, 0, -21.0, 1.3], [-31.0, 0, 21.0, 1.3], [31.0, 0, 21.0, 1.3],
    [-20.5, 0, -31.0, 1.25], [20.5, 0, -31.0, 1.25], [-20.5, 0, 31.0, 1.25], [20.5, 0, 31.0, 1.25],
  ];
  for (const [tx, ty, tz, ts] of trees) {
    envGroup.add(buildLushTree(tx, ty, tz, ts, trunkMat, leafHiMat, leafMidMat, leafDarkMat));
  }

  const flowerColors = [0xfde047, 0xfb7185, 0xfb923c, 0xc084fc, 0xfef08a];
  const flowerSpots = [
    [-7.5, 0, -4.5], [7.5, 0, -4.5], [-7.5, 0, 4.5], [7.5, 0, 4.5],
    [-4.5, 0, -7.5], [4.5, 0, -7.5], [-4.5, 0, 7.5], [4.5, 0, 7.5],
    [-11.5, 0, -10.0], [11.5, 0, -10.0], [-11.5, 0, 10.0], [11.5, 0, 10.0],
    [-19.5, 0, -10.0], [19.5, 0, -10.0], [-19.5, 0, 10.0], [19.5, 0, 10.0],
    [-18.0, 0, -4.5], [-18.0, 0, 4.5], [18.0, 0, -4.5], [18.0, 0, 4.5],
  ];
  for (const [fx, fy, fz] of flowerSpots) {
    envGroup.add(buildFlowerBush(fx, fy, fz, rng, leafMidMat, flowerColors));
  }

  // 9. Volumetric Sunbeam Shafts & Golden Firefly Motes across City
  const rayTex = createGodRayTexture();
  const rayMat = new THREE.MeshBasicMaterial({
    map: rayTex,
    transparent: true,
    opacity: 0.09,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const [rx, rz, rw] of [[-4, -2, 7.5], [14, -14, 7.0], [-14, 14, 7.0], [14, 14, 6.5], [-14, -14, 6.5]]) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(rw, 24), rayMat);
    ray.position.set(rx - 2, 8.0, rz - 1);
    ray.rotation.set(0.35, 0.35, -0.52);
    envGroup.add(ray);
  }

  const moteCount = 180;
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
    size: 0.25,
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
    },
  };
}
