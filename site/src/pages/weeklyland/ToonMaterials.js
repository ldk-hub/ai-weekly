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

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vWorldDir;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uZenithColor;
  uniform vec3 uMidColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uRainFactor;
  uniform float uNightFactor;
  uniform float uLightning;
  uniform float uTime;

  varying vec3 vWorldDir;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      v += amp * noise2(p);
      p = p * 2.05 + vec2(13.1, 7.7);
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, 0.0, 1.0);

    // 1. Rich 3-stop emotional vertical sky gradient (Horizon -> Mid -> Zenith)
    vec3 lower = mix(uHorizonColor, uMidColor, smoothstep(0.0, 0.28, h));
    vec3 sky = mix(lower, uZenithColor, smoothstep(0.20, 0.85, h));

    // 2. Solar Mie Scattering Halo + Crisp Glowing Sun Disc (Sunrise, Day, Sunset!)
    vec3 sunDir = normalize(uSunDir);
    float sunDot = max(dot(dir, sunDir), 0.0);
    float sunVis = uSunIntensity * (1.0 - uRainFactor * 0.86);

    // Wide warm horizon atmospheric scatter around the sun
    float wideGlow = pow(sunDot, 4.0) * 0.42 * sunVis;
    float tightHalo = pow(sunDot, 36.0) * 0.65 * sunVis;
    float sunDisc = smoothstep(0.9965, 0.9988, sunDot) * 1.45 * sunVis;
    sky += uSunColor * (wideGlow + tightHalo + sunDisc);

    // Horizon warm belt when sun is low (dawn / sunset magic hour!)
    float lowSun = clamp(1.0 - abs(sunDir.y) * 2.4, 0.0, 1.0) * (1.0 - uNightFactor) * (1.0 - uRainFactor * 0.85);
    float horizonBand = exp(-h * 7.5) * (0.35 + 0.65 * pow(sunDot, 2.0));
    sky += uSunColor * horizonBand * lowSun * 0.42;

    // 3. Procedural Upper Sky Cloud Layer (Soft wispy cirrus in clear sky -> Heavy storm clouds in rain!)
    if (dir.y > 0.015) {
      vec2 cloudUv = dir.xz / (dir.y + 0.24) * 1.15;
      float drift = uTime * (0.012 + uRainFactor * 0.022);
      float n1 = fbm(cloudUv + vec2(drift, drift * 0.35));
      float n2 = fbm(cloudUv * 2.1 - vec2(drift * 0.7, -drift * 0.4));
      float cloudField = n1 * 0.68 + n2 * 0.32;

      float horizonFade = smoothstep(0.015, 0.20, dir.y);

      // Clear/sunset wispy high clouds
      float wispMask = smoothstep(0.56, 0.80, cloudField) * horizonFade * (1.0 - uRainFactor) * (1.0 - uNightFactor * 0.75);
      vec3 wispCol = mix(vec3(1.0, 0.99, 0.98), uSunColor * 1.08, clamp(lowSun * 0.85 + pow(sunDot, 3.0) * 0.45, 0.0, 1.0));
      sky = mix(sky, wispCol, wispMask * 0.48);

      // Rain / Storm heavy dark rolling overcast cloud deck!
      float stormMask = smoothstep(0.28, 0.74, cloudField) * horizonFade * uRainFactor;
      vec3 stormDark = vec3(0.14, 0.18, 0.26);
      vec3 stormMid = vec3(0.27, 0.33, 0.43);
      vec3 stormCol = mix(stormMid, stormDark, smoothstep(0.42, 0.78, n1));
      // Subtle under-cloud lightning glow during rainstorms
      stormCol += vec3(0.55, 0.72, 1.0) * uLightning * smoothstep(0.45, 0.8, n2) * 0.9;
      sky = mix(sky, stormCol, stormMask * 0.88);
    }

    // 4. Night Twinkling Circular Starfield + Subtle Aurora Veil (strictly night only!)
    if (uNightFactor > 0.62 && uRainFactor < 0.7 && dir.y > 0.06) {
      float starVis = smoothstep(0.62, 0.95, uNightFactor) * (1.0 - uRainFactor) * smoothstep(0.06, 0.26, dir.y);
      vec2 starUv = (dir.xz / (dir.y + 0.42)) * 95.0;
      vec2 starCell = floor(starUv);
      vec2 starLocal = fract(starUv) - 0.5;
      float rnd = hash21(starCell);
      if (rnd > 0.965) {
        vec2 jitter = vec2(hash21(starCell + 3.1) - 0.5, hash21(starCell + 7.7) - 0.5) * 0.55;
        float dStar = length(starLocal - jitter);
        float starDot = smoothstep(0.16, 0.02, dStar);
        float twinkle = 0.55 + 0.45 * sin(uTime * 3.0 + rnd * 120.0);
        sky += vec3(0.88, 0.95, 1.0) * starDot * twinkle * starVis * 1.15;
      }
      // Subtle dreamy emerald-violet aurora shimmer high in the northern sky
      float auroraWave = sin(dir.x * 5.0 + uTime * 0.25) * cos(dir.z * 4.0 - uTime * 0.18);
      float auroraBand = exp(-pow((dir.y - 0.38 + auroraWave * 0.08) * 7.0, 2.0)) * smoothstep(-0.2, 0.5, -dir.z);
      vec3 auroraCol = mix(vec3(0.12, 0.85, 0.68), vec3(0.55, 0.38, 0.95), 0.5 + 0.5 * auroraWave);
      sky += auroraCol * auroraBand * starVis * 0.28;
    }

    // Distant lightning sky flash when raining
    sky += vec3(0.45, 0.58, 0.78) * uLightning * uRainFactor * 0.35;

    // Below horizon blends smoothly into horizon color so no dark void seam appears
    if (dir.y < 0.0) {
      sky = mix(uHorizonColor, uHorizonColor * 0.78, smoothstep(0.0, -0.35, dir.y));
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

/**
 * Emotional Atmospheric 3D Sky Dome + Sun/Moon + Volumetric Fluffy & Storm Clouds + Hot Air Balloons.
 * Dynamically morphs across Sunrise (일출), Clear Azure Day (맑은 낮), Magic Sunset (노을),
 * Starry Night (밤), and Dark Overcast Rain Storm Clouds (비 · 먹구름)!
 */
export class CartoonSkyDecor {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_CartoonSkyDecor";
    this.scene.add(this.group);

    this.clouds = [];
    this.stormClouds = [];
    this.balloons = [];
    this._time = 0;
    this._rainBlend = 0;

    this._tmpCloudBase = new THREE.Color();
    this._tmpCloudEmissive = new THREE.Color();
    this._cCloudDay = new THREE.Color(0xffffff);
    this._cCloudDawn = new THREE.Color(0xffe0cf);
    this._cCloudSunset = new THREE.Color(0xffad85);
    this._cCloudNight = new THREE.Color(0x283a62);
    this._cCloudRain = new THREE.Color(0x5a6b82);
    this._cStormDark = new THREE.Color(0x52627a);

    this._buildSkyDome();
    this._buildMoon();
    this._buildFluffyClouds();
    this._buildStormClouds();
    this._buildHotAirBalloons();
  }

  _buildSkyDome() {
    this.skyUniforms = {
      uZenithColor: { value: new THREE.Color(0x1d76e8) },
      uMidColor: { value: new THREE.Color(0x5db8ff) },
      uHorizonColor: { value: new THREE.Color(0xd6f4ff) },
      uSunDir: { value: new THREE.Vector3(0.45, 0.65, -0.58).normalize() },
      uSunColor: { value: new THREE.Color(0xfff4cc) },
      uSunIntensity: { value: 1.0 },
      uRainFactor: { value: 0.0 },
      uNightFactor: { value: 0.0 },
      uLightning: { value: 0.0 },
      uTime: { value: 0.0 },
    };

    const skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERTEX_SHADER,
      fragmentShader: SKY_FRAGMENT_SHADER,
      uniforms: this.skyUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), skyMat);
    this.skyDome.renderOrder = -10;
    this.skyDome.frustumCulled = false;
    this.group.add(this.skyDome);
  }

  _buildMoon() {
    this.moonGroup = new THREE.Group();
    const moonDisc = new THREE.Mesh(
      new THREE.SphereGeometry(9.5, 18, 14),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3, fog: false })
    );
    const moonHalo = new THREE.Mesh(
      new THREE.SphereGeometry(16.5, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xbae6fd,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    this.moonGroup.add(moonDisc, moonHalo);
    this.moonGroup.position.set(-140, 145, -240);
    this.moonGroup.visible = false;
    this.group.add(this.moonGroup);
  }

  _buildFluffyClouds() {
    this.cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0xdbeafe,
      emissiveIntensity: 0.16,
      fog: true,
    });
    const puffGeo = new THREE.SphereGeometry(1, 12, 10);

    for (let i = 0; i < 24; i++) {
      const cGroup = new THREE.Group();
      const angle = (i / 24) * Math.PI * 2 + (i % 2) * 0.12;
      const radius = 64 + (i % 4) * 34;
      const y = 38 + (i % 5) * 9;
      const scaleMul = 1.0 + (i % 3) * 0.38;

      const puffs = [
        [0, 0, 0, 5.2, 3.1, 3.8],
        [-4.0, -0.6, 0.4, 3.8, 2.4, 3.0],
        [4.1, -0.5, -0.3, 4.0, 2.5, 3.1],
        [1.2, 1.8, 0.2, 3.2, 2.4, 2.8],
        [-1.9, 1.4, -0.4, 2.9, 2.2, 2.6],
        [-6.6, -1.0, 0.1, 2.4, 1.6, 2.2],
        [6.8, -0.9, -0.2, 2.5, 1.7, 2.2],
      ];
      for (const [px, py, pz, sx, sy, sz] of puffs) {
        const m = new THREE.Mesh(puffGeo, this.cloudMat);
        m.position.set(px * scaleMul, py * scaleMul, pz * scaleMul);
        m.scale.set(sx * scaleMul, sy * scaleMul, sz * scaleMul);
        cGroup.add(m);
      }

      cGroup.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      cGroup.rotation.y = angle + Math.PI * 0.5;
      this.group.add(cGroup);
      this.clouds.push({ group: cGroup, angle, radius, baseY: y, speed: 0.010 + (i % 4) * 0.004 });
    }
  }

  _buildStormClouds() {
    this.stormGroup = new THREE.Group();
    this.stormMat = new THREE.MeshLambertMaterial({
      color: 0x2f3b4e,
      emissive: 0x1e293b,
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.0,
      fog: true,
    });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);

    // Dense lower brooding rainclouds gathering overhead across the park when raining!
    for (let i = 0; i < 16; i++) {
      const sGroup = new THREE.Group();
      const angle = (i / 16) * Math.PI * 2;
      const radius = 22 + (i % 4) * 32;
      const y = 33 + (i % 3) * 5.0;
      const sc = 1.25 + (i % 3) * 0.32;

      const puffs = [
        [0, 0, 0, 7.5, 2.9, 5.8],
        [-5.2, -0.4, 1.2, 5.4, 2.4, 4.4],
        [5.4, -0.3, -1.0, 5.8, 2.5, 4.6],
        [0.8, 1.5, 0.5, 4.8, 2.3, 4.0],
        [-2.8, 1.2, -1.4, 4.2, 2.1, 3.6],
      ];
      for (const [px, py, pz, sx, sy, sz] of puffs) {
        const m = new THREE.Mesh(puffGeo, this.stormMat);
        m.position.set(px * sc, py * sc, pz * sc);
        m.scale.set(sx * sc, sy * sc, sz * sc);
        sGroup.add(m);
      }

      sGroup.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      this.stormGroup.add(sGroup);
      this.stormClouds.push({ group: sGroup, angle, radius, baseY: y, speed: 0.018 + (i % 3) * 0.006 });
    }
    this.stormGroup.visible = false;
    this.group.add(this.stormGroup);
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

  update(dt, skyStateOrNight, cameraPos = null) {
    const stepDt = Math.min(dt, 0.05);
    this._time += stepDt;

    // Support both legacy boolean and rich atmosphere skyState object
    const st =
      typeof skyStateOrNight === "object" && skyStateOrNight
        ? skyStateOrNight
        : {
            isNight: Boolean(skyStateOrNight),
            isRain: false,
            dawnFactor: 0,
            sunsetFactor: 0,
            dayFactor: skyStateOrNight ? 0 : 1,
            nightFactor: skyStateOrNight ? 1 : 0,
            lightning: 0,
          };

    // Smooth rain storm cloud buildup/dissipation
    const targetRain = st.isRain ? 1.0 : 0.0;
    this._rainBlend += (targetRain - this._rainBlend) * Math.min(1, stepDt * 2.4);

    if (this.skyDome && cameraPos) {
      this.skyDome.position.set(cameraPos.x, Math.min(0, cameraPos.y - 10), cameraPos.z);
    }

    if (this.skyUniforms) {
      if (st.zenithColor) this.skyUniforms.uZenithColor.value.copy(st.zenithColor);
      if (st.midColor) this.skyUniforms.uMidColor.value.copy(st.midColor);
      if (st.horizonColor) this.skyUniforms.uHorizonColor.value.copy(st.horizonColor);
      if (st.sunDir) this.skyUniforms.uSunDir.value.copy(st.sunDir);
      if (st.sunColor) this.skyUniforms.uSunColor.value.copy(st.sunColor);
      this.skyUniforms.uSunIntensity.value = st.sunIntensity ?? (st.isNight ? 0 : 1);
      this.skyUniforms.uRainFactor.value = this._rainBlend;
      this.skyUniforms.uNightFactor.value = st.nightFactor ?? (st.isNight ? 1 : 0);
      this.skyUniforms.uLightning.value = st.lightning || 0;
      this.skyUniforms.uTime.value = this._time;
    }

    // Moon visibility at night / clear skies
    if (this.moonGroup) {
      this.moonGroup.visible = (st.nightFactor || 0) > 0.35 && this._rainBlend < 0.75;
      if (cameraPos && this.moonGroup.visible) {
        this.moonGroup.position.set(cameraPos.x - 135, 138, cameraPos.z - 235);
      }
    }

    // Dynamic emotional cloud tinting (Day pure white -> Sunrise peach -> Sunset coral -> Rain dark storm -> Night indigo!)
    this._tmpCloudBase
      .copy(this._cCloudNight)
      .lerp(this._cCloudDay, st.dayFactor ?? 1)
      .lerp(this._cCloudDawn, Math.min(0.9, (st.dawnFactor || 0) * 0.92))
      .lerp(this._cCloudSunset, Math.min(0.95, (st.sunsetFactor || 0) * 0.95))
      .lerp(this._cCloudRain, this._rainBlend * 0.92);

    this.cloudMat.color.copy(this._tmpCloudBase);
    this._tmpCloudEmissive.copy(this._tmpCloudBase).multiplyScalar(0.68);
    if (st.lightning > 0.05 && this._rainBlend > 0.2) {
      this._tmpCloudEmissive.offsetHSL(0, 0, st.lightning * 0.35);
    }
    this.cloudMat.emissive.copy(this._tmpCloudEmissive);
    const dayGlow = (st.dayFactor || 0) * (1 - this._rainBlend * 0.65);
    this.cloudMat.emissiveIntensity = 0.26 + dayGlow * 0.42 + (st.dawnFactor || 0) * 0.42 + (st.sunsetFactor || 0) * 0.45;

    for (const c of this.clouds) {
      c.angle += c.speed * stepDt * (1 + this._rainBlend * 0.8);
      c.group.position.set(
        Math.cos(c.angle) * c.radius,
        c.baseY - this._rainBlend * 5.0 + Math.sin(this._time * 0.55 + c.angle) * 0.7,
        Math.sin(c.angle) * c.radius
      );
      c.group.rotation.y = c.angle + Math.PI * 0.5;
      c.group.visible = true;
    }

    // Overcast dark storm cloud deck gathering when raining!
    if (this.stormGroup) {
      this.stormGroup.visible = this._rainBlend > 0.03;
      if (this.stormGroup.visible) {
        this.stormMat.opacity = Math.min(0.90, this._rainBlend * 0.90);
        this.stormMat.color.copy(this._cStormDark);
        this.stormMat.emissive.setHex(st.lightning > 0.15 ? 0x7c93b0 : 0x354459);
        this.stormMat.emissiveIntensity = 0.42 + (st.lightning || 0) * 0.75;
        for (const sc of this.stormClouds) {
          sc.angle += sc.speed * stepDt;
          sc.group.position.set(
            Math.cos(sc.angle) * sc.radius,
            sc.baseY + (1 - this._rainBlend) * 14 + Math.sin(this._time * 0.7 + sc.angle) * 0.5,
            Math.sin(sc.angle) * sc.radius
          );
        }
      }
    }

    for (const b of this.balloons) {
      b.angle -= b.speed * stepDt;
      b.group.position.set(
        Math.cos(b.angle) * b.radius,
        b.baseY + Math.sin(this._time * 1.1 + b.phase) * 1.5,
        Math.sin(b.angle) * b.radius
      );
      b.group.rotation.y += stepDt * 0.15;
      b.group.visible = this._rainBlend < 0.65;
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
