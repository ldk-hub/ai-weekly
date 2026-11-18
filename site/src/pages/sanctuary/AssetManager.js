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
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.55,
    roughness: 0.35,
  });

  const makeWall = (lx, lz, lw, ld, lh = wallH, addCol = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(lw, lh, ld), wallMat);
    m.position.set(lx, lh * 0.5, lz);
    m.castShadow = true;
    m.receiveShadow = true;
    bGroup.add(m);
    if (addCol) addWallCollider(colliders, x + lx, z + lz, lw, ld);
    return m;
  };

  // Build 4 perimeter walls, leaving an open 3.0-unit doorway on doorDir
  const sides = ["N", "S", "W", "E"];
  for (const s of sides) {
    const isNS = s === "N" || s === "S";
    const span = isNS ? w : d;
    const lx = s === "W" ? -halfW + wallThick * 0.5 : s === "E" ? halfW - wallThick * 0.5 : 0;
    const lz = s === "N" ? -halfD + wallThick * 0.5 : s === "S" ? halfD - wallThick * 0.5 : 0;

    if (s !== doorDir) {
      makeWall(lx, lz, isNS ? span : wallThick, isNS ? wallThick : span);
    } else {
      const wing = (span - doorW) * 0.5;
      if (wing > 0.1) {
        if (isNS) {
          makeWall(-doorW * 0.5 - wing * 0.5, lz, wing, wallThick);
          makeWall(doorW * 0.5 + wing * 0.5, lz, wing, wallThick);
        } else {
          makeWall(lx, -doorW * 0.5 - wing * 0.5, wallThick, wing);
          makeWall(lx, doorW * 0.5 + wing * 0.5, wallThick, wing);
        }
      }
      // Door lintel above doorway (no collider so hero walks right underneath!)
      const lintelH = wallH - doorH;
      const lintel = new THREE.Mesh(
        new THREE.BoxGeometry(isNS ? doorW + 0.3 : wallThick + 0.14, lintelH, isNS ? wallThick + 0.14 : doorW + 0.3),
        timberMat
      );
      lintel.position.set(lx, doorH + lintelH * 0.5, lz);
      lintel.castShadow = true;
      bGroup.add(lintel);

      // Doorway side pillars + glowing lantern sign
      for (const sign of [-1, 1]) {
        const px = isNS ? sign * (doorW * 0.5 + 0.12) : lx;
        const pz = isNS ? lz : sign * (doorW * 0.5 + 0.12);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, doorH + 0.1, 0.32), timberMat);
        post.position.set(px, (doorH + 0.1) * 0.5, pz);
        post.castShadow = true;
        bGroup.add(post);
      }
      const signX = s === "W" ? lx - 0.45 : s === "E" ? lx + 0.45 : 0;
      const signZ = s === "N" ? lz - 0.45 : s === "S" ? lz + 0.45 : 0;
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), accentMat);
      lantern.position.set(signX, doorH + 0.25, signZ);
      bGroup.add(lantern);
    }
  }

  // Timber corner beams & exterior warm-lit windows
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.36, wallH + 0.12, 0.36), timberMat);
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
    addBookshelf(0, -halfD + 0.8, 0);
    for (const tx of [-halfW + 1.7, halfW - 1.7]) {
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.08, 18), woodMat);
      table.position.set(tx, 0.76, -0.8);
      table.castShadow = true;
      bGroup.add(table);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.72, 10), darkWoodMat);
      leg.position.set(tx, 0.4, -0.8);
      bGroup.add(leg);
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8), accentMat);
      candle.position.set(tx, 0.9, -0.8);
      bGroup.add(candle);
    }
  } else if (interiorType === "observatory") {
    addBookshelf(-halfW + 1.6, -halfD + 0.8, 0);
    addBookshelf(halfW - 1.6, -halfD + 0.8, 0);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.06, 10, 28), accentMat);
    ring.position.set(halfW - 1.8, 1.45, 0.6);
    ring.rotation.set(0.4, 0.6, 0);
    bGroup.add(ring);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.55, 0.85, 16), mats.trimMat);
    ped.position.set(halfW - 1.8, 0.46, 0.6);
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
    addBookshelf(0, -halfD + 0.8, 0);
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.84, 0.9), woodMat);
    bench.position.set(0.8, 0.46, 1.5);
    bench.castShadow = true;
    bGroup.add(bench);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), darkWoodMat);
    crate.position.set(-halfW + 1.2, 0.44, -0.2);
    crate.castShadow = true;
    bGroup.add(crate);
  }

  // Interior warm bounce light
  const intLight = new THREE.PointLight(accentColor, 2.2, 11);
  intLight.position.set(0, 2.6, 0);
  bGroup.add(intLight);

  // Separate Cutaway Roof Group (fades away cleanly when player enters!)
  const roofGroup = new THREE.Group();
  const roofMat = new THREE.MeshStandardMaterial({
    color: roofColor,
    roughness: 0.72,
    transparent: true,
    opacity: 1,
  });
  const roofTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf4e4c1,
    roughness: 0.78,
    transparent: true,
    opacity: 1,
  });

  const roofH = 2.0;
  const roofBase = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.28, d + 0.8), roofTrimMat);
  roofBase.position.y = wallH + 0.14;
  roofBase.castShadow = true;
  roofBase.userData.enterBuildingId = id;
  roofGroup.add(roofBase);

  // Stepped hipped roof tiers (clean, warm sandstone/RPG aesthetic)
  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const ratio = 1 - t * 0.22;
    const tierW = (w + 0.5) * ratio;
    const tierD = (d + 0.5) * ratio;
    const tierH = roofH / tiers;
    const tierMesh = new THREE.Mesh(new THREE.BoxGeometry(tierW, tierH, tierD), roofMat);
    tierMesh.position.y = wallH + 0.28 + tierH * (t + 0.5);
    tierMesh.castShadow = true;
    tierMesh.receiveShadow = true;
    tierMesh.userData.enterBuildingId = id;
    roofGroup.add(tierMesh);
  }
  const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), accentMat.clone());
  spire.position.y = wallH + 0.28 + roofH + 0.42;
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

function buildTownhouseSkyline(x, z, w, d, h, roofHex, stoneMat, trimMat) {
  const t = new THREE.Group();
  t.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), stoneMat);
  body.position.y = h * 0.5;
  body.castShadow = true; body.receiveShadow = true;
  t.add(body);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.2, 4),
    new THREE.MeshStandardMaterial({ color: roofHex, roughness: 0.75 })
  );
  roof.rotation.y = Math.PI * 0.25;
  roof.position.y = h + 1.1;
  roof.castShadow = true;
  t.add(roof);
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.25, d + 0.3), trimMat);
  cornice.position.y = h;
  t.add(cornice);
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
  const avenueMat = new THREE.MeshStandardMaterial({
    color: 0xebd7b0,
    roughness: 0.82,
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

  // Cardinal Grand Avenues & Ring Boulevard Stone Runners (y = 0.015)
  const avenueConfigs = [
    [0, 0.01, 0, 5.4, 0.03, 68],   // N-S Grand Avenue
    [0, 0.01, 0, 68, 0.03, 5.4],   // E-W Grand Avenue
    [0, 0.01, -24.5, 52, 0.03, 4.0], // North Ring Road
    [0, 0.01, 24.5, 52, 0.03, 4.0],  // South Ring Road
    [-24.5, 0.01, 0, 4.0, 0.03, 52], // West Ring Road
    [24.5, 0.01, 0, 4.0, 0.03, 52],  // East Ring Road
  ];
  for (const [ax, ay, az, aw, ah, ad] of avenueConfigs) {
    const av = new THREE.Mesh(new THREE.BoxGeometry(aw, ah, ad), avenueMat);
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
  const mats = { wallTex, trimMat, woodTex };
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
  const skylineSpecs = [
    [-28, -28, 7, 7, 4.4, 0xc2410c], [28, -28, 7, 7, 4.8, 0x1d4ed8],
    [-28, 28, 7, 7, 4.2, 0x9d174d],  [28, 28, 7, 7, 4.6, 0x047857],
    [-8, -29, 6, 5, 3.6, 0xb45309],  [8, -29, 6, 5, 3.8, 0x0369a1],
    [-8, 29, 6, 5, 3.6, 0x9f1239],   [8, 29, 6, 5, 3.8, 0x065f46],
    [-29, -9, 5, 6, 3.5, 0xa16207],  [29, -9, 5, 6, 3.7, 0x1e40af],
    [-29, 9, 5, 6, 3.5, 0xbe123c],   [29, 9, 5, 6, 3.7, 0x0f766e],
  ];
  for (const [tx, tz, tw, td, th, rc] of skylineSpecs) {
    envGroup.add(buildTownhouseSkyline(tx, tz, tw, td, th, rc, stoneWallMat, trimMat));
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
      leafHiMat,
      leafMidMat,
      leafDarkMat,
      lampGlowMat,
      rayMat,
      moteMat,
    },
  };
}
