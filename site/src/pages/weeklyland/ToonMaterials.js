import * as THREE from "three";

let _gradientMap = null;
const _stripeTextures = new Map();
const _toonMaterialPool = new Map();
const _outlineMaterialPool = new Map();
let _grassTexture = null;

/**
 * Shared 4-band stylized cel-shading gradient map (NearestFilter for crisp cartoon light steps).
 */
export function getToonGradientMap() {
  if (_gradientMap) return _gradientMap;
  const data = new Uint8Array([
    118, 118, 128, 255,
    176, 176, 184, 255,
    226, 226, 232, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  _gradientMap = tex;
  return tex;
}

/**
 * Create (or fetch from GPU material pool) a warm cel-shaded MeshToonMaterial.
 * Pooling cuts WebGL shader uniform uploads & material switches by >90% across 26+ rides.
 */
export function createToonMaterial(color, extra = {}) {
  const { uncached = false, ...matOpts } = extra || {};
  const hex = typeof color === "number" ? color : new THREE.Color(color).getHex();
  const hasEmissive = matOpts.emissive !== undefined;

  if (!uncached && !hasEmissive && !matOpts.vertexColors) {
    const mapId = matOpts.map ? matOpts.map.uuid : "none";
    const side = matOpts.side ?? THREE.FrontSide;
    const transp = matOpts.transparent ? 1 : 0;
    const opac = matOpts.opacity ?? 1;
    const key = `${hex}|${mapId}|${side}|${transp}|${opac}`;
    const cached = _toonMaterialPool.get(key);
    if (cached) return cached;

    const mat = new THREE.MeshToonMaterial({
      color: hex,
      gradientMap: getToonGradientMap(),
      ...matOpts,
    });
    mat.userData.isSharedPool = true;
    _toonMaterialPool.set(key, mat);
    return mat;
  }

  return new THREE.MeshToonMaterial({
    color: hex,
    gradientMap: getToonGradientMap(),
    ...matOpts,
  });
}

/**
 * Attach a crisp soft-ink cartoon outline (inverted hull) reusing a single pooled BackSide material.
 */
export function addToonOutline(mesh, thickness = 1.055, inkColor = 0x2c2238) {
  if (!mesh?.geometry) return null;
  let outlineMat = _outlineMaterialPool.get(inkColor);
  if (!outlineMat) {
    outlineMat = new THREE.MeshBasicMaterial({
      color: inkColor,
      side: THREE.BackSide,
    });
    outlineMat.userData.isSharedPool = true;
    _outlineMaterialPool.set(inkColor, outlineMat);
  }
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(thickness);
  outline.userData.isToonOutline = true;
  mesh.add(outline);
  return outline;
}

/**
 * Safely disposes a Three.js subtree without destroying shared GPU-pooled materials/textures.
 */
export function safeDisposeObjectTree(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry && !obj.geometry.userData?.isSharedPool) {
      obj.geometry.dispose();
    }
    if (Array.isArray(obj.material)) {
      obj.material.forEach((m) => {
        if (m && !m.userData?.isSharedPool) m.dispose();
      });
    } else if (obj.material && !obj.material.userData?.isSharedPool) {
      obj.material.dispose();
    }
  });
}

export function getPoolStats() {
  return {
    toonMaterials: _toonMaterialPool.size,
    outlineMaterials: _outlineMaterialPool.size,
    stripeTextures: _stripeTextures.size,
  };
}

/**
 * Procedural striped carnival tent/awning canvas texture.
 */
export function getCarnivalStripeTexture(colorA = "#ff7657", colorB = "#fff7eb", stripes = 12) {
  const key = `${colorA}|${colorB}|${stripes}`;
  if (_stripeTextures.has(key)) return _stripeTextures.get(key);
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const ctx = c.getContext("2d");
  const w = c.width / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * w, 0, w + 1, c.height);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  _stripeTextures.set(key, tex);
  return tex;
}

/**
 * Soft storybook stylized grass texture with subtle pastel clovers & brush dabs.
 */
export function getCartoonGrassTexture() {
  if (_grassTexture) return _grassTexture;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 256, 256);

  // Gentle organic meadow dabs (multiplied with vertexColors)
  for (let i = 0; i < 140; i++) {
    const x = (i * 53) % 256;
    const y = (i * 97) % 256;
    ctx.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.22)" : "rgba(215,245,210,0.20)";
    ctx.beginPath();
    ctx.ellipse(x, y, 10, 4, (i % 5) * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tiny pastel wildflowers
  const flowerColors = ["#ffe599", "#ffb3c6", "#ffffff", "#bde0fe"];
  for (let i = 0; i < 24; i++) {
    const x = (i * 71 + 19) % 240 + 8;
    const y = (i * 43 + 11) % 240 + 8;
    ctx.fillStyle = flowerColors[i % flowerColors.length];
    ctx.beginPath();
    ctx.arc(x, y, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  _grassTexture = tex;
  return tex;
}

/**
 * Storybook Pastel Sky Dome + Floating Fluffy Cartoon Clouds + Drifting Hot Air Balloons.
 */
export class CartoonSkyDecor {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_CartoonSkyDecor";
    this.scene.add(this.group);

    this.clouds = [];
    this.balloons = [];
    this._time = 0;

    this._buildFluffyClouds();
    this._buildHotAirBalloons();
  }

  _buildFluffyClouds() {
    const cloudMat = createToonMaterial(0xfffdf8, { emissive: 0xfff8eb, emissiveIntensity: 0.14 });
    const puffGeo = new THREE.SphereGeometry(1, 12, 10);

    for (let i = 0; i < 14; i++) {
      const cGroup = new THREE.Group();
      const angle = (i / 14) * Math.PI * 2;
      const radius = 58 + (i % 3) * 24;
      const y = 38 + (i % 4) * 7;

      const puffs = [
        [0, 0, 0, 4.2, 2.8, 3.4],
        [-3.2, -0.5, 0.4, 3.1, 2.2, 2.7],
        [3.3, -0.4, -0.3, 3.3, 2.3, 2.8],
        [1.0, 1.4, 0.2, 2.6, 2.1, 2.4],
        [-1.6, 1.1, -0.4, 2.4, 1.9, 2.2],
      ];
      for (const [px, py, pz, sx, sy, sz] of puffs) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        m.position.set(px, py, pz);
        m.scale.set(sx, sy, sz);
        cGroup.add(m);
      }

      cGroup.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      cGroup.rotation.y = angle + Math.PI * 0.5;
      this.group.add(cGroup);
      this.clouds.push({ group: cGroup, angle, radius, baseY: y, speed: 0.014 + (i % 3) * 0.005 });
    }
  }

  _buildHotAirBalloons() {
    const palettes = [
      ["#ff7b6b", "#fff5e1"],
      ["#57c7e8", "#ffe066"],
      ["#c084fc", "#fbcfe8"],
    ];
    for (let i = 0; i < 3; i++) {
      const bGroup = new THREE.Group();
      const [cA, cB] = palettes[i];
      const tex = getCarnivalStripeTexture(cA, cB, 10);

      const envelope = new THREE.Mesh(
        new THREE.SphereGeometry(4.2, 18, 14),
        createToonMaterial(0xffffff, { map: tex })
      );
      envelope.scale.set(1, 1.18, 1);
      addToonOutline(envelope, 1.035);
      bGroup.add(envelope);

      const neck = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 0.9, 1.4, 12),
        createToonMaterial(0xfff5e1)
      );
      neck.position.y = -4.6;
      bGroup.add(neck);

      const basket = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 1.4, 1.7),
        createToonMaterial(0xd99b66)
      );
      basket.position.y = -6.8;
      addToonOutline(basket, 1.06);
      bGroup.add(basket);

      // Warm burner glow inside balloon at night
      const burnerMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
      const burner = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), burnerMat);
      burner.position.y = -5.5;
      bGroup.add(burner);

      const angle = i * 2.1 + 0.6;
      const radius = 56 + i * 11;
      const baseY = 30 + i * 5;
      bGroup.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius);
      this.group.add(bGroup);
      this.balloons.push({ group: bGroup, angle, radius, baseY, speed: 0.025 + i * 0.006, phase: i * 1.9 });
    }
  }

  update(dt, isNight) {
    this._time += Math.min(dt, 0.05);
    for (const c of this.clouds) {
      c.angle += c.speed * dt;
      c.group.position.set(
        Math.cos(c.angle) * c.radius,
        c.baseY + Math.sin(this._time * 0.6 + c.angle) * 0.6,
        Math.sin(c.angle) * c.radius
      );
      c.group.rotation.y = c.angle + Math.PI * 0.5;
      c.group.visible = !isNight;
    }
    for (const b of this.balloons) {
      b.angle -= b.speed * dt;
      b.group.position.set(
        Math.cos(b.angle) * b.radius,
        b.baseY + Math.sin(this._time * 1.1 + b.phase) * 1.5,
        Math.sin(b.angle) * b.radius
      );
      b.group.rotation.y += dt * 0.15;
    }
  }

  dispose() {
    this.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    this.scene.remove(this.group);
  }
}
