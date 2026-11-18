import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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

/**
 * Construct the complete Sunlit Sandstone Sanctuary Diorama matching the concept art.
 */
export async function loadSanctuaryEnvironment(glbUrl, scene) {
  // Verify optional GLB path cleanly while building full high-res procedural diorama
  const loader = new GLTFLoader();
  try {
    await new Promise((resolve) => loader.load(glbUrl, resolve, undefined, resolve));
  } catch {}

  const rng = mulberry32(424242);
  const envGroup = new THREE.Group();
  const walkableMeshes = [];

  const { diffTex, bumpTex } = createSandstoneTextures();
  const plazaMat = new THREE.MeshStandardMaterial({
    map: diffTex,
    bumpMap: bumpTex,
    bumpScale: 0.06,
    roughness: 0.86,
    metalness: 0.04,
  });
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

  // 1. Sunken Plaza Floor (y = 0)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(24, 0.5, 24), plazaMat);
  floor.name = "Walkable_PlazaFloor";
  floor.position.y = -0.25;
  floor.receiveShadow = true;
  envGroup.add(floor);
  walkableMeshes.push(floor);

  // 2. Elevated Outer Terraces framing the sunken plaza (y = 1.4)
  const terraceConfigs = [
    [0, 0.7, -14.5, 36, 1.4, 11],  // North terrace
    [0, 0.7, 14.5, 36, 1.4, 11],   // South terrace
    [-14.5, 0.7, 0, 11, 1.4, 24],  // West terrace
    [14.5, 0.7, 0, 11, 1.4, 24],   // East terrace
  ];
  for (const [x, y, z, w, h, d] of terraceConfigs) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plazaMat);
    t.position.set(x, y, z);
    t.receiveShadow = true; t.castShadow = true;
    envGroup.add(t);
  }

  // Low mossy retaining wall borders along North/South/West/East edges of plaza
  const borderWallSpecs = [
    [0, 0.85, -9.2, 8.6, 1.7, 0.7],
    [0, 0.85, 9.2, 8.6, 1.7, 0.7],
    [-9.2, 0.85, 0, 0.7, 1.7, 8.6],
    [9.2, 0.85, 0, 0.7, 1.7, 8.6],
  ];
  for (const [x, y, z, w, h, d] of borderWallSpecs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneWallMat);
    wall.position.set(x, y, z);
    wall.castShadow = true; wall.receiveShadow = true;
    envGroup.add(wall);

    const coping = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.18, d + 0.16), trimMat);
    coping.position.set(x, 1.72, z);
    coping.castShadow = true; coping.receiveShadow = true;
    envGroup.add(coping);
  }

  // 3. Four Diagonal 7-Step Staircases (NW, NE, SW, SE)
  const stairConfigs = [
    [-7.3, -7.3, Math.PI * 0.25],   // NW
    [7.3, -7.3, -Math.PI * 0.25],   // NE
    [-7.3, 7.3, Math.PI * 0.75],    // SW
    [7.3, 7.3, -Math.PI * 0.75],    // SE
  ];
  for (const [sx, sz, sRot] of stairConfigs) {
    envGroup.add(buildDiagonalStaircase(sx, sz, sRot, stoneWallMat, trimMat, walkableMeshes));
  }

  // 4. Central Crystal Fountain + Permanent Glowing Golden Rune Circle
  const { crystalMesh, runeDisc, waterTex } = buildCrystalFountain(envGroup, stoneWallMat, trimMat);

  // 5. Six Carved Sandstone Benches along plaza perimeter
  const benchConfigs = [
    [0, -7.2, 0],
    [-2.4, 7.2, Math.PI],
    [2.4, 7.2, Math.PI],
    [-7.2, -0.5, Math.PI * 0.5],
    [7.2, 0.2, -Math.PI * 0.5],
    [0, 7.2, Math.PI],
  ];
  // Use 5-6 well-spaced benches matching concept art layout
  for (const [bx, bz, bRot] of benchConfigs.slice(0, 5)) {
    envGroup.add(buildSandstoneBench(bx, bz, bRot, stoneWallMat, trimMat));
  }

  // 6. Lush Leaf-Textured Foliage Materials & Canopy Trees + Ancient Columns + Flower Beds
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.92 });
  const leafHiTex = createFoliageTexture("#8db93d", "#cde05c", "#5c8529", 11);
  const leafMidTex = createFoliageTexture("#5c8a32", "#84b344", "#375c1c", 22);
  const leafDarkTex = createFoliageTexture("#355c20", "#558030", "#1e3a12", 33);
  const leafHiMat = new THREE.MeshStandardMaterial({ map: leafHiTex, bumpMap: leafHiTex, bumpScale: 0.05, roughness: 0.86 });
  const leafMidMat = new THREE.MeshStandardMaterial({ map: leafMidTex, bumpMap: leafMidTex, bumpScale: 0.05, roughness: 0.88 });
  const leafDarkMat = new THREE.MeshStandardMaterial({ map: leafDarkTex, bumpMap: leafDarkTex, bumpScale: 0.05, roughness: 0.9 });

  const columns = [
    [-9.8, -5.2, 1.4, 2.8, false], [9.8, -5.0, 1.4, 3.2, false],
    [-5.0, -9.8, 1.4, 2.1, true], [5.4, -9.8, 1.4, 2.9, false],
    [-9.8, 4.8, 1.4, 2.2, true], [9.8, 4.6, 1.4, 2.7, false],
    [-4.8, 9.8, 1.4, 1.8, true], [5.2, 9.8, 1.4, 2.4, true],
  ];
  for (const [cx, cz, cy, ch, brk] of columns) {
    envGroup.add(buildAncientColumn(cx, cz, cy, ch, brk, stoneWallMat, trimMat, leafMidMat));
  }

  // Framing trees positioned cleanly along upper/outer corners & low bottom accent without blocking front stairs/benches
  const trees = [
    [-11.2, 1.4, -2.4, 1.25], [-11.8, 1.4, 4.2, 1.18], [-10.8, 1.4, -9.6, 1.22],
    [-3.4, 1.4, -11.4, 1.18], [3.6, 1.4, -11.6, 1.26], [11.0, 1.4, -9.4, 1.22],
    [11.6, 1.4, -1.8, 1.28], [11.8, 1.4, 4.4, 1.15], [10.8, 1.4, 9.8, 1.05],
    [-10.8, 1.4, 9.8, 1.08], [-1.8, 1.4, 12.6, 0.82],
  ];
  for (const [tx, ty, tz, ts] of trees) {
    envGroup.add(buildLushTree(tx, ty, tz, ts, trunkMat, leafHiMat, leafMidMat, leafDarkMat));
  }

  const flowerColors = [0xfde047, 0xfb7185, 0xfb923c, 0xc084fc, 0xfef08a];
  const flowerSpots = [
    [-8.3, 0, -3.5], [-8.3, 0, 2.6], [8.3, 0, -2.8], [8.3, 0, 2.9],
    [-3.4, 0, -8.3], [3.4, 0, -8.3], [-4.1, 0, 8.2], [4.1, 0, 8.2],
    [-6.6, 0, -5.2], [6.6, 0, -5.2], [-6.5, 0, 5.1], [6.5, 0, 5.1],
    [-1.4, 0, 8.2], [1.4, 0, 8.2], [-9.8, 1.4, -7.2], [9.8, 1.4, -7.2],
    [-7.2, 1.4, -9.8], [7.2, 1.4, -9.8], [-9.8, 1.4, 7.2], [9.8, 1.4, 7.2],
  ];
  for (const [fx, fy, fz] of flowerSpots) {
    envGroup.add(buildFlowerBush(fx, fy, fz, rng, leafMidMat, flowerColors));
  }

  // 7. Volumetric Sunbeam Shafts (God Rays from upper-left sun)
  const rayTex = createGodRayTexture();
  const rayMat = new THREE.MeshBasicMaterial({
    map: rayTex,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  for (const [rx, rz, rw] of [[-4, -2, 6.5], [1, 0, 7.5], [-2, 4, 6.0], [4, -3, 5.5]]) {
    const ray = new THREE.Mesh(new THREE.PlaneGeometry(rw, 22), rayMat);
    ray.position.set(rx - 2, 7.5, rz - 1);
    ray.rotation.set(0.35, 0.35, -0.52);
    envGroup.add(ray);
  }

  // 8. Golden Atmospheric Dust / Firefly Motes
  const moteCount = 90;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (rng() - 0.5) * 18;
    motePos[i * 3 + 1] = 0.4 + rng() * 4.2;
    motePos[i * 3 + 2] = (rng() - 0.5) * 18;
  }
  const moteGeom = new THREE.BufferGeometry();
  moteGeom.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({
    map: createSoftGlowTexture(),
    size: 0.24,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const motes = new THREE.Points(moteGeom, moteMat);
  envGroup.add(motes);

  scene.add(envGroup);
  return { environmentGroup: envGroup, walkableMeshes, crystalMesh, runeDisc, waterTex, motes };
}
