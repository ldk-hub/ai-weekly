import * as THREE from "three";

const SEASONS = ["spring", "rain", "summer", "autumn", "winter"];
const SEASON_LABELS = {
  spring: "봄 · 벚꽃",
  rain: "장마 · 소나기",
  summer: "여름 · 반딧불",
  autumn: "가을 · 낙엽",
  winter: "겨울 · 눈",
};

const TIME_PRESETS = {
  dawn: 0.24,
  day: 0.45,
  sunset: 0.72,
  night: 0.94,
};

// Module-level texture cache: prevents GPU CanvasTexture leaks across thousands of firework bursts
const PARTICLE_TEX_CACHE = new Map();

function getSoftParticleTexture(shape = "circle") {
  if (PARTICLE_TEX_CACHE.has(shape)) return PARTICLE_TEX_CACHE.get(shape);

  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");

  if (shape === "petal") {
    ctx.translate(32, 32);
    ctx.rotate(-0.4);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.7, "rgba(255,235,245,0.92)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (shape === "rain") {
    const g = ctx.createLinearGradient(32, 4, 32, 60);
    g.addColorStop(0, "rgba(186,230,253,0)");
    g.addColorStop(0.35, "rgba(186,230,253,0.92)");
    g.addColorStop(0.8, "rgba(224,242,254,0.98)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(28, 4, 8, 56);
  } else if (shape === "star") {
    const g = ctx.createRadialGradient(32, 32, 1, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,250,220,0.95)");
    g.addColorStop(0.55, "rgba(255,230,180,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillRect(30, 8, 4, 48);
    ctx.fillRect(8, 30, 48, 4);
  } else {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  PARTICLE_TEX_CACHE.set(shape, tex);
  return tex;
}

const SEASON_TARGETS = {
  spring: { hi: new THREE.Color(0xffb8d9), mid: new THREE.Color(0xf9a8d4), dark: new THREE.Color(0x6ee7b7), ground: new THREE.Color(0xffffff), ave: new THREE.Color(0xebd7b0) },
  rain: { hi: new THREE.Color(0x86efac), mid: new THREE.Color(0x4ade80), dark: new THREE.Color(0x166534), ground: new THREE.Color(0xdbeafe), ave: new THREE.Color(0xcbd5e1) },
  summer: { hi: new THREE.Color(0xffffff), mid: new THREE.Color(0xffffff), dark: new THREE.Color(0xffffff), ground: new THREE.Color(0xffffff), ave: new THREE.Color(0xebd7b0) },
  autumn: { hi: new THREE.Color(0xfbbf24), mid: new THREE.Color(0xf97316), dark: new THREE.Color(0x9a3412), ground: new THREE.Color(0xfde68a), ave: new THREE.Color(0xe6c79c) },
  winter: { hi: new THREE.Color(0xffffff), mid: new THREE.Color(0xe2e8f0), dark: new THREE.Color(0x64748b), ground: new THREE.Color(0xdbeafe), ave: new THREE.Color(0xf1f5f9) },
};

const FIREWORK_PALETTES = [
  [0xfbbf24, 0xfef08a, 0xf97316], // Royal Gold & Amber
  [0x38bdf8, 0xe0f2fe, 0x818cf8], // Starlight Cyan & Indigo
  [0xf43f5e, 0xfbcfe8, 0xfbbf24], // Rose Crimson & Gold
  [0x34d399, 0xa7f3d0, 0x38bdf8], // Aurora Emerald & Sky
  [0xc084fc, 0xf5d0fe, 0x60a5fa], // Violet Nebula
];

const SHOW_SCRIPT = [
  { t: 0.0, pattern: "chrysanthemum", ox: -22, oz: -18, targetY: 28 },
  { t: 0.55, pattern: "chrysanthemum", ox: 22, oz: -18, targetY: 31 },
  { t: 1.2, pattern: "willow", ox: 0, oz: -26, targetY: 36 },
  { t: 2.0, pattern: "ring", ox: -30, oz: -10, targetY: 27 },
  { t: 2.6, pattern: "ring", ox: 30, oz: -10, targetY: 29 },
  { t: 3.4, pattern: "chrysanthemum", ox: -14, oz: -24, targetY: 34 },
  { t: 3.9, pattern: "willow", ox: 16, oz: -22, targetY: 33 },
  { t: 4.8, pattern: "ring", ox: 0, oz: -16, targetY: 31 },
  { t: 5.6, pattern: "chrysanthemum", ox: -32, oz: -16, targetY: 30 },
  { t: 6.1, pattern: "chrysanthemum", ox: 32, oz: -16, targetY: 30 },
  { t: 7.0, pattern: "willow", ox: -18, oz: -20, targetY: 37 },
  { t: 7.4, pattern: "willow", ox: 18, oz: -20, targetY: 37 },
  // Grand Finale Salvo!
  { t: 8.2, pattern: "chrysanthemum", ox: -28, oz: -16, targetY: 30 },
  { t: 8.45, pattern: "ring", ox: 0, oz: -24, targetY: 40 },
  { t: 8.7, pattern: "chrysanthemum", ox: 28, oz: -16, targetY: 30 },
  { t: 9.15, pattern: "willow", ox: -15, oz: -18, targetY: 35 },
  { t: 9.4, pattern: "willow", ox: 15, oz: -18, targetY: 35 },
  { t: 9.8, pattern: "chrysanthemum", ox: 0, oz: -14, targetY: 42 },
];

/**
 * Manages Day/Night cycles, 4-Season foliage & weather particles, starry night sky,
 * and a Night-Only Announced Grand Fireworks Festival with zero per-frame allocations.
 */
export class SanctuaryAtmosphere {
  constructor(scene, lights, envFx, callbacks = {}) {
    this.scene = scene;
    this.lights = lights;
    this.envFx = envFx;
    this.mats = envFx.atmosphereMats || {};
    this.onFestivalEvent = callbacks.onFestivalEvent || null;

    this.timeMode = "auto";
    this.timeOfDay = 0.42;
    this.dayCycleDurationSec = 90;

    this.seasonMode = "auto";
    this.seasonIndex = 0;
    this.seasonTimer = 0;
    this.seasonDurationSec = 28;

    this.fireworks = [];
    this._heroPos = new THREE.Vector3();

    // Night-only Festival State Machine: "idle" -> "announcing" -> "show" -> "cooldown"
    this.festivalPhase = "idle";
    this.festivalTimer = 0;
    this.nightWaitTimer = 2.0;
    this.festivalScriptIdx = 0;
    this.lastAnnouncedSec = -1;
    this._festivalCenter = new THREE.Vector3(0, 0, 0);

    // Pre-allocated Emotional Atmospheric Sky Palettes (Zero GC pressure in 60fps loop!)
    this._palDay = {
      zenith: new THREE.Color(0x0f5bd6),
      mid: new THREE.Color(0x45a8ff),
      horizon: new THREE.Color(0xc9eeff),
      sun: new THREE.Color(0xfff6d6),
    };
    this._palDawn = {
      zenith: new THREE.Color(0x2a3f85),
      mid: new THREE.Color(0xf28ca8),
      horizon: new THREE.Color(0xffd28c),
      sun: new THREE.Color(0xffc978),
    };
    this._palSunset = {
      zenith: new THREE.Color(0x24225e),
      mid: new THREE.Color(0xe65b73),
      horizon: new THREE.Color(0xffaa4d),
      sun: new THREE.Color(0xff8e42),
    };
    this._palNight = {
      zenith: new THREE.Color(0x04091b),
      mid: new THREE.Color(0x0d1b42),
      horizon: new THREE.Color(0x1b3060),
      sun: new THREE.Color(0x8bb4ff),
    };
    this._palRain = {
      zenith: new THREE.Color(0x202a3a),
      mid: new THREE.Color(0x3a485e),
      horizon: new THREE.Color(0x66778e),
    };

    this._cSunNight = new THREE.Color(0x8bb4ff);
    this._cSunDay = new THREE.Color(0xfff5dc);
    this._cSunDawn = new THREE.Color(0xffc88a);
    this._cSunSunset = new THREE.Color(0xff8f52);
    this._cAmbNight = new THREE.Color(0x2d3f66);
    this._cAmbDay = new THREE.Color(0xeaf5ff);
    this._cAmbSunset = new THREE.Color(0xffcab0);
    this._cAmbRain = new THREE.Color(0x8fa3ba);
    this._cHemiSkyDay = new THREE.Color(0x7cc8ff);
    this._cHemiSkySunset = new THREE.Color(0xff9b85);
    this._cHemiSkyNight = new THREE.Color(0x263b6b);
    this._cHemiSkyRain = new THREE.Color(0x5d6e85);

    this._tmpSky = new THREE.Color();
    this._tmpZenith = new THREE.Color();
    this._tmpMid = new THREE.Color();
    this._tmpHorizon = new THREE.Color();
    this._tmpSun = new THREE.Color();
    this._tmpAmb = new THREE.Color();
    this._tmpHemi = new THREE.Color();
    this._tmpBurstColor = new THREE.Color();
    this._sunDir = new THREE.Vector3(0.45, 0.65, -0.58).normalize();

    this._lightning = 0;
    this._lightningCooldown = 4.5;
    this._skyState = {
      isNight: false,
      isRain: false,
      dawnFactor: 0,
      sunsetFactor: 0,
      dayFactor: 1,
      nightFactor: 0,
      sunIntensity: 1,
      lightning: 0,
      zenithColor: this._tmpZenith,
      midColor: this._tmpMid,
      horizonColor: this._tmpHorizon,
      sunDir: this._sunDir,
      sunColor: this._tmpSun,
    };

    // Shared firework rocket geometry + single pre-allocated flash PointLight (no shader recompiles!)
    this._rocketGeo = new THREE.SphereGeometry(0.18, 6, 6);
    this.fireworkLight = new THREE.PointLight(0xfbbf24, 0, 34);
    this.fireworkLight.position.set(0, 10, 0);
    this.scene.add(this.fireworkLight);
    this._flashIntensity = 0;

    this._buildSkyStars();
    this._buildWeatherParticles();
    this._applySeasonFoliage(this.getCurrentSeason(), 1.0);
  }

  getCurrentSeason() {
    if (this.seasonMode !== "auto") return this.seasonMode;
    return SEASONS[this.seasonIndex % SEASONS.length];
  }

  isRaining() {
    return this.getCurrentSeason() === "rain";
  }

  getTimeKey() {
    const t = this.timeOfDay;
    if (t >= 0.18 && t < 0.32) return "dawn";
    if (t >= 0.32 && t < 0.65) return "day";
    if (t >= 0.65 && t < 0.80) return "sunset";
    return "night";
  }

  getTimeLabel() {
    const key = this.getTimeKey();
    if (key === "dawn") return "일출";
    if (key === "day") return "맑은 낮";
    if (key === "sunset") return "감성 노을";
    return "별빛 밤";
  }

  getSkyState() {
    return this._skyState;
  }

  getStatusLabels() {
    const timeKey = this.getTimeKey();
    const seasonKey = this.getCurrentSeason();
    return {
      timeKey,
      timeLabel: `${this.getTimeLabel()}${this.timeMode === "auto" ? "" : " (고정)"}`,
      seasonKey,
      seasonLabel: `${SEASON_LABELS[seasonKey]}${this.seasonMode === "auto" ? "" : " (고정)"}`,
    };
  }

  cycleTimeMode() {
    const order = ["auto", "day", "sunset", "night", "dawn"];
    const next = order[(order.indexOf(this.timeMode) + 1) % order.length];
    this.setTimeMode(next);
    return this.getStatusLabels();
  }

  setTimeMode(mode) {
    this.timeMode = mode;
    if (TIME_PRESETS[mode] !== undefined) {
      this.timeOfDay = TIME_PRESETS[mode];
    }
    if (this.getTimeKey() === "night" && this.festivalPhase === "idle") {
      this.nightWaitTimer = 1.4;
    }
  }

  cycleSeasonMode() {
    const order = ["auto", "spring", "rain", "summer", "autumn", "winter"];
    const next = order[(order.indexOf(this.seasonMode) + 1) % order.length];
    this.setSeasonMode(next);
    return this.getStatusLabels();
  }

  setSeasonMode(mode) {
    if (mode === "auto") {
      this.seasonMode = "auto";
    } else if (SEASONS.includes(mode)) {
      this.seasonMode = mode;
      this.seasonIndex = SEASONS.indexOf(mode);
    }
    this._reseedWeatherColors(this.getCurrentSeason());
  }

  _buildSkyStars() {
    const count = 240;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 28 + Math.random() * 44;
      pos[i * 3] = Math.cos(ang) * rad;
      pos[i * 3 + 1] = 20 + Math.random() * 24;
      pos[i * 3 + 2] = Math.sin(ang) * rad;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      map: getSoftParticleTexture("star"),
      color: 0xe0f2fe,
      size: 0.52,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geom, this.starMat);
    this.scene.add(this.stars);
  }

  _buildWeatherParticles() {
    const count = 420;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = [];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 96;
      pos[i * 3 + 1] = Math.random() * 26;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 96;
      vel.push({
        vx: (Math.random() - 0.5) * 1.1,
        vy: -(1.6 + Math.random() * 1.9),
        vz: (Math.random() - 0.5) * 1.1,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.weatherGeom = new THREE.BufferGeometry();
    this.weatherGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.weatherGeom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.weatherVel = vel;

    this.weatherMat = new THREE.PointsMaterial({
      map: getSoftParticleTexture("petal"),
      size: 0.72,
      vertexColors: true,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    });
    this.weatherPoints = new THREE.Points(this.weatherGeom, this.weatherMat);
    this.weatherPoints.frustumCulled = false;
    this.scene.add(this.weatherPoints);
    this._reseedWeatherColors(this.getCurrentSeason());
  }

  setWeatherEnabled(enabled) {
    if (this.weatherPoints) this.weatherPoints.visible = Boolean(enabled);
  }

  launchManualFirework(x, z, salvoCount = 3) {
    const patterns = ["chrysanthemum", "ring", "willow"];
    for (let i = 0; i < salvoCount; i++) {
      setTimeout(() => {
        this._festivalCenter.set(x, 0, z);
        this._spawnFestivalRocket({
          ox: (Math.random() - 0.5) * 14,
          oz: (Math.random() - 0.5) * 14,
          targetY: 26 + Math.random() * 14,
          pattern: patterns[i % patterns.length],
        });
      }, i * 240);
    }
  }

  _reseedWeatherColors(season) {
    if (!this.weatherGeom) return;
    const colAttr = this.weatherGeom.attributes.color;
    const palettes = {
      spring: [[1.0, 0.72, 0.86], [0.99, 0.58, 0.78], [1.0, 0.92, 0.96]],
      rain: [[0.72, 0.90, 1.0], [0.56, 0.82, 0.98], [0.88, 0.96, 1.0]],
      summer: [[0.85, 1.0, 0.55], [1.0, 0.92, 0.45], [0.45, 0.95, 0.8]],
      autumn: [[0.98, 0.72, 0.18], [0.94, 0.42, 0.14], [0.85, 0.22, 0.18]],
      winter: [[0.98, 0.99, 1.0], [0.88, 0.95, 1.0], [1.0, 1.0, 1.0]],
    };
    const pal = palettes[season] || palettes.spring;
    for (let i = 0; i < colAttr.count; i++) {
      const c = pal[i % pal.length];
      colAttr.setXYZ(i, c[0], c[1], c[2]);
    }
    colAttr.needsUpdate = true;

    if (this.weatherMat) {
      this.weatherMat.map = getSoftParticleTexture(season === "rain" ? "rain" : season === "winter" ? "circle" : "petal");
      this.weatherMat.size = season === "rain" ? 1.35 : season === "winter" ? 0.52 : season === "summer" ? 0.42 : 0.62;
      this.weatherMat.opacity = season === "rain" ? 0.86 : 0.96;
      this.weatherMat.blending = season === "summer" ? THREE.AdditiveBlending : THREE.NormalBlending;
      this.weatherMat.needsUpdate = true;
    }
  }

  /**
   * Internal Night-Festival firework launcher supporting chrysanthemum, willow, and ring patterns.
   */
  _spawnFestivalRocket({ ox = 0, oz = -10, targetY = 8.5, pattern = "chrysanthemum" } = {}) {
    const x = this._festivalCenter.x + ox + (Math.random() - 0.5) * 2.2;
    const z = this._festivalCenter.z + oz + (Math.random() - 0.5) * 2.2;
    const pal = FIREWORK_PALETTES[Math.floor(Math.random() * FIREWORK_PALETTES.length)];

    const rocketMat = new THREE.MeshBasicMaterial({ color: pal[0] });
    const rocketMesh = new THREE.Mesh(this._rocketGeo, rocketMat);
    rocketMesh.position.set(x, 1.4, z);
    this.scene.add(rocketMesh);

    this.fireworks.push({
      phase: "rising",
      pattern,
      rocketMesh,
      rocketMat,
      x,
      y: 2.0,
      z,
      vy: 24.0 + Math.random() * 6.0,
      targetY,
      pal,
      burstPoints: null,
      burstMat: null,
      sparks: [],
      age: 0,
      life: pattern === "willow" ? 2.8 : 2.3,
    });
  }

  _explodeFirework(fw) {
    if (fw.rocketMesh) {
      this.scene.remove(fw.rocketMesh);
      fw.rocketMat.dispose();
      fw.rocketMesh = null;
      fw.rocketMat = null;
    }

    const pattern = fw.pattern || "chrysanthemum";
    const count = pattern === "chrysanthemum" ? 104 : pattern === "willow" ? 88 : 84;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sparks = [];
    const cList = fw.pal.map((hex) => new THREE.Color(hex));
    const coreGold = new THREE.Color(0xfffbeb);

    const tiltX = (Math.random() - 0.5) * 0.7;
    const tiltZ = (Math.random() - 0.5) * 0.7;

    for (let i = 0; i < count; i++) {
      pos[i * 3] = fw.x;
      pos[i * 3 + 1] = fw.y;
      pos[i * 3 + 2] = fw.z;

      let vx = 0, vy = 0, vz = 0;
      let c = cList[i % cList.length];

      if (pattern === "ring") {
        if (i < 60) {
          // Crisp tilted glowing ring
          const ang = (i / 60) * Math.PI * 2;
          const spd = 6.2 + (Math.random() - 0.5) * 0.45;
          const rx = Math.cos(ang) * spd;
          const rz = Math.sin(ang) * spd;
          vx = rx;
          vy = rx * tiltX + rz * tiltZ + 1.0;
          vz = rz;
        } else {
          // Sparkling inner core
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const spd = 1.6 + Math.random() * 1.8;
          vx = Math.sin(phi) * Math.cos(theta) * spd;
          vy = Math.cos(phi) * spd + 1.0;
          vz = Math.sin(phi) * Math.sin(theta) * spd;
          c = coreGold;
        }
      } else if (pattern === "willow") {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const spd = 2.8 + Math.random() * 4.2;
        vx = Math.sin(phi) * Math.cos(theta) * spd;
        vy = Math.cos(phi) * spd + 2.2;
        vz = Math.sin(phi) * Math.sin(theta) * spd;
        c = i % 3 === 0 ? coreGold : cList[0];
      } else {
        // Chrysanthemum: dual concentric shells
        const isInner = i < 36;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const spd = isInner ? (2.2 + Math.random() * 1.4) : (5.0 + Math.random() * 2.2);
        vx = Math.sin(phi) * Math.cos(theta) * spd;
        vy = Math.cos(phi) * spd + 1.3;
        vz = Math.sin(phi) * Math.sin(theta) * spd;
        c = isInner ? coreGold : cList[i % cList.length];
      }

      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      sparks.push({ vx, vy, vz, gravity: pattern === "willow" ? 5.2 : 3.9, drag: pattern === "willow" ? 0.92 : 1.32 });
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      map: getSoftParticleTexture(pattern === "willow" ? "circle" : "star"),
      size: pattern === "willow" ? 2.4 : 2.9,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geom, mat);
    pts.frustumCulled = false;
    this.scene.add(pts);

    // Reuse single scene fireworkLight (zero shader recompilations!)
    this.fireworkLight.position.set(fw.x, fw.y, fw.z);
    this.fireworkLight.color.setHex(fw.pal[0]);
    this._flashIntensity = 7.5;
    this.fireworkLight.intensity = this._flashIntensity;

    fw.phase = "burst";
    fw.burstPoints = pts;
    fw.burstMat = mat;
    fw.sparks = sparks;
    fw.age = 0;

    this.onFestivalEvent?.({ phase: "burst", pattern });
  }

  _updateFireworks(dt) {
    if (this._flashIntensity > 0.01) {
      this._flashIntensity = Math.max(0, this._flashIntensity - dt * 13.5);
      this.fireworkLight.intensity = this._flashIntensity;
    }

    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];
      if (fw.phase === "rising") {
        fw.y += fw.vy * dt;
        fw.rocketMesh.position.y = fw.y;
        if (fw.y >= fw.targetY) {
          this._explodeFirework(fw);
        }
      } else {
        fw.age += dt;
        const p = fw.age / fw.life;
        if (p >= 1) {
          this.scene.remove(fw.burstPoints);
          fw.burstPoints.geometry.dispose();
          fw.burstMat.dispose();
          this.fireworks.splice(i, 1);
          continue;
        }
        const posAttr = fw.burstPoints.geometry.attributes.position;
        for (let k = 0; k < fw.sparks.length; k++) {
          const sp = fw.sparks[k];
          const drag = Math.exp(-sp.drag * dt);
          sp.vx *= drag;
          sp.vz *= drag;
          sp.vy = sp.vy * drag - sp.gravity * dt;
          posAttr.setXYZ(
            k,
            posAttr.getX(k) + sp.vx * dt,
            posAttr.getY(k) + sp.vy * dt,
            posAttr.getZ(k) + sp.vz * dt
          );
        }
        posAttr.needsUpdate = true;
        // Twinkle near end of burst
        const twinkle = p > 0.55 ? (0.78 + 0.22 * Math.sin(fw.age * 28 + i * 3)) : 1.0;
        fw.burstMat.opacity = Math.max(0, (1 - p * p) * twinkle);
      }
    }
  }

  _updateNightFestival(dt, isNight) {
    if (!isNight) {
      if (this.festivalPhase !== "idle") {
        this.festivalPhase = "idle";
        this.festivalTimer = 0;
        this.lastAnnouncedSec = -1;
        this.nightWaitTimer = 2.0;
        this.onFestivalEvent?.({ phase: "ended", reason: "daylight" });
      }
      return;
    }

    if (this.festivalPhase === "idle") {
      this.nightWaitTimer -= dt;
      if (this.nightWaitTimer <= 0) {
        this.festivalPhase = "announcing";
        this.festivalTimer = 4.0;
        this.lastAnnouncedSec = 4;
        this._festivalCenter.copy(this._heroPos);
        this.onFestivalEvent?.({
          phase: "announcing",
          countdown: 4,
          isStart: true,
        });
      }
    } else if (this.festivalPhase === "announcing") {
      this.festivalTimer -= dt;
      const ceilSec = Math.max(0, Math.ceil(this.festivalTimer));
      if (ceilSec !== this.lastAnnouncedSec && ceilSec > 0) {
        this.lastAnnouncedSec = ceilSec;
        this.onFestivalEvent?.({
          phase: "announcing",
          countdown: ceilSec,
          isStart: false,
        });
      }
      if (this.festivalTimer <= 0) {
        this.festivalPhase = "show";
        this.festivalTimer = 0;
        this.festivalScriptIdx = 0;
        this._festivalCenter.copy(this._heroPos);
        this.onFestivalEvent?.({ phase: "show" });
      }
    } else if (this.festivalPhase === "show") {
      this.festivalTimer += dt;
      while (
        this.festivalScriptIdx < SHOW_SCRIPT.length &&
        this.festivalTimer >= SHOW_SCRIPT[this.festivalScriptIdx].t
      ) {
        this._spawnFestivalRocket(SHOW_SCRIPT[this.festivalScriptIdx]);
        this.festivalScriptIdx += 1;
      }
      if (this.festivalScriptIdx >= SHOW_SCRIPT.length && this.festivalTimer > 13.5 && this.fireworks.length === 0) {
        this.festivalPhase = "cooldown";
        this.festivalTimer = 36.0;
        this.onFestivalEvent?.({ phase: "ended", reason: "complete" });
      }
    } else if (this.festivalPhase === "cooldown") {
      this.festivalTimer -= dt;
      if (this.festivalTimer <= 0) {
        this.festivalPhase = "idle";
        this.nightWaitTimer = 1.0;
      }
    }
  }

  _applySeasonFoliage(season, blendSpeed = 0.14) {
    const targets = SEASON_TARGETS[season];
    if (!targets) return;
    if (this.mats.leafHiMat) this.mats.leafHiMat.color.lerp(targets.hi, blendSpeed);
    if (this.mats.leafMidMat) this.mats.leafMidMat.color.lerp(targets.mid, blendSpeed);
    if (this.mats.leafDarkMat) this.mats.leafDarkMat.color.lerp(targets.dark, blendSpeed);
    if (this.mats.plazaMat) this.mats.plazaMat.color.lerp(targets.ground, blendSpeed);
    const aveList = this.mats.avenueMats || (this.mats.avenueMat ? [this.mats.avenueMat] : []);
    for (const aveMat of aveList) {
      if (aveMat) aveMat.color.lerp(targets.ave, blendSpeed);
    }
  }

  update(dt, heroPos) {
    if (heroPos) this._heroPos.copy(heroPos);

    // 1. Advance Time of Day (Zero-allocation color interpolation!)
    if (this.timeMode === "auto") {
      this.timeOfDay = (this.timeOfDay + dt / this.dayCycleDurationSec) % 1;
    }

    const t = this.timeOfDay;
    const sunElev = Math.sin((t - 0.25) * Math.PI * 2);
    const dayFactor = THREE.MathUtils.clamp((sunElev + 0.22) / 1.22, 0, 1);
    const dawnFactor = Math.exp(-Math.pow((t - 0.24) / 0.068, 2));
    const sunsetFactor = Math.exp(-Math.pow((t - 0.72) / 0.068, 2));
    const twilight = Math.min(1, dawnFactor + sunsetFactor);
    const nightFactor = 1 - dayFactor;

    const curSeason = this.getCurrentSeason();
    const isRain = curSeason === "rain";

    // Subtle distant storm lightning glow during rain
    if (isRain) {
      this._lightningCooldown -= dt;
      if (this._lightningCooldown <= 0) {
        this._lightning = 0.85;
        this._lightningCooldown = 5.5 + Math.random() * 7.5;
      }
      this._lightning = Math.max(0, this._lightning - dt * 3.8);
    } else {
      this._lightning = 0;
    }

    // Real solar arc: rises in North-East (dawn), arcs high overhead (day), sets in North-West (sunset)
    // Placed in the -Z northern vista hemisphere so guests looking into the park see sunrise & sunset directly!
    const arcProgress = THREE.MathUtils.clamp((t - 0.20) / 0.56, 0, 1); // 0 = dawn, 0.5 = noon, 1 = sunset
    const sunAz = THREE.MathUtils.lerp(0.62, -0.62, arcProgress); // East (+X) -> West (-X)
    const sunAlt = Math.max(0.06, Math.sin(arcProgress * Math.PI) * 0.72 + 0.06);
    this._sunDir
      .set(Math.sin(sunAz) * Math.cos(sunAlt), Math.sin(sunAlt), -Math.cos(sunAz) * Math.cos(sunAlt))
      .normalize();

    // Blend 3-stop Sky Dome Colors: Night -> Clear Azure Day -> Peach Sunrise -> Coral-Amber Sunset -> Storm Rain!
    this._tmpZenith
      .copy(this._palNight.zenith)
      .lerp(this._palDay.zenith, dayFactor)
      .lerp(this._palDawn.zenith, dawnFactor * 0.92)
      .lerp(this._palSunset.zenith, sunsetFactor * 0.95);
    this._tmpMid
      .copy(this._palNight.mid)
      .lerp(this._palDay.mid, dayFactor)
      .lerp(this._palDawn.mid, dawnFactor * 0.95)
      .lerp(this._palSunset.mid, sunsetFactor * 0.96);
    this._tmpHorizon
      .copy(this._palNight.horizon)
      .lerp(this._palDay.horizon, dayFactor)
      .lerp(this._palDawn.horizon, dawnFactor * 0.95)
      .lerp(this._palSunset.horizon, sunsetFactor * 0.98);

    if (isRain) {
      const rainMix = 0.78;
      this._tmpZenith.lerp(this._palRain.zenith, rainMix);
      this._tmpMid.lerp(this._palRain.mid, rainMix);
      this._tmpHorizon.lerp(this._palRain.horizon, rainMix);
    }

    if (this.scene.background?.isColor) this.scene.background.copy(this._tmpHorizon);
    if (this.scene.fog) {
      this.scene.fog.color.copy(this._tmpHorizon);
      this.scene.fog.density = isRain ? 0.0028 : 0.0016;
    }

    this._tmpSun
      .copy(this._cSunNight)
      .lerp(this._cSunDay, dayFactor)
      .lerp(this._cSunDawn, dawnFactor * 0.92)
      .lerp(this._cSunSunset, sunsetFactor * 0.95);

    if (this.lights.dirLight) {
      this.lights.dirLight.color.copy(this._tmpSun);
      this.lights.dirLight.position.set(this._sunDir.x * 135, Math.max(32, this._sunDir.y * 145), this._sunDir.z * 135);
      const baseInt = (0.45 + dayFactor * 1.95 + twilight * 0.35) * (isRain ? 0.62 : 1.0);
      this.lights.dirLight.intensity = baseInt + this._lightning * 0.9;
    }
    if (this.lights.ambientLight) {
      this._tmpAmb
        .copy(this._cAmbNight)
        .lerp(this._cAmbDay, dayFactor)
        .lerp(this._cAmbSunset, twilight * 0.62);
      if (isRain) this._tmpAmb.lerp(this._cAmbRain, 0.7);
      this.lights.ambientLight.color.copy(this._tmpAmb);
      this.lights.ambientLight.intensity = (0.34 + dayFactor * 0.44) * (isRain ? 0.85 : 1.0);
    }
    if (this.lights.hemiLight) {
      this._tmpHemi
        .copy(this._cHemiSkyNight)
        .lerp(this._cHemiSkyDay, dayFactor)
        .lerp(this._cHemiSkySunset, twilight * 0.72);
      if (isRain) this._tmpHemi.lerp(this._cHemiSkyRain, 0.78);
      this.lights.hemiLight.color.copy(this._tmpHemi);
      this.lights.hemiLight.intensity = (0.36 + dayFactor * 0.56) * (isRain ? 0.78 : 1.0);
    }

    // Export unified sky state snapshot for CartoonSkyDecor shader & volumetric clouds
    this._skyState.isNight = nightFactor > 0.6;
    this._skyState.isRain = isRain;
    this._skyState.dawnFactor = dawnFactor;
    this._skyState.sunsetFactor = sunsetFactor;
    this._skyState.dayFactor = dayFactor;
    this._skyState.nightFactor = nightFactor;
    this._skyState.sunIntensity = THREE.MathUtils.clamp((dayFactor + twilight * 0.85), 0, 1);
    this._skyState.lightning = this._lightning;
    if (this.mats.lampGlowMat) {
      this.mats.lampGlowMat.emissiveIntensity = 0.5 + nightFactor * 2.8;
    }
    if (this.mats.windowGlassMat) {
      this.mats.windowGlassMat.emissiveIntensity = 0.35 + nightFactor * 1.15;
    }
    if (this.mats.rayMat) {
      this.mats.rayMat.opacity = dayFactor * 0.095;
    }
    if (this.starMat) {
      this.starMat.opacity = Math.max(0, (nightFactor - 0.35) / 0.65) * 0.94;
      this.stars.position.set(this._heroPos.x, 0, this._heroPos.z);
    }

    // 2. Advance Season & Foliage Tint
    if (this.seasonMode === "auto") {
      this.seasonTimer += dt;
      if (this.seasonTimer >= this.seasonDurationSec) {
        this.seasonTimer = 0;
        this.seasonIndex = (this.seasonIndex + 1) % SEASONS.length;
        this._reseedWeatherColors(this.getCurrentSeason());
      }
    }
    const season = this.getCurrentSeason();
    this._applySeasonFoliage(season, Math.min(1, dt * 4.5));

    // 3. Animate Seasonal Weather Particles (tracks camera/hero seamlessly over 96m volume)
    if (this.weatherGeom && this.weatherPoints?.visible) {
      const posAttr = this.weatherGeom.attributes.position;
      const nowSec = performance.now() * 0.001;
      const span = 96;
      const halfSpan = span * 0.5;
      const cx = this._heroPos.x;
      const cz = this._heroPos.z;
      for (let i = 0; i < posAttr.count; i++) {
        const v = this.weatherVel[i];
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);

        if (season === "rain") {
          x += (-3.4 + v.vx * 0.35) * dt;
          y += (v.vy * 8.2 - 10.5) * dt;
          z += (-1.2 + v.vz * 0.35) * dt;
          if (y < 0.2) y = 26 + Math.random() * 6;
        } else if (season === "summer") {
          x += Math.sin(nowSec * 1.4 + v.phase) * 1.2 * dt;
          y += Math.abs(v.vy) * 0.45 * dt;
          z += Math.cos(nowSec * 1.2 + v.phase) * 1.2 * dt;
          if (y > 22) y = 0.5;
        } else if (season === "spring") {
          x += (1.2 + Math.sin(nowSec * 2.1 + v.phase) * 0.85) * dt;
          y += v.vy * 1.05 * dt;
          z += (0.6 + Math.cos(nowSec * 1.7 + v.phase) * 0.7) * dt;
          if (y < 0.2) y = 24 + Math.random() * 4;
        } else if (season === "autumn") {
          x += (1.8 + Math.sin(nowSec * 2.6 + v.phase) * 1.3) * dt;
          y += v.vy * 1.25 * dt;
          z += Math.cos(nowSec * 2.2 + v.phase) * 1.1 * dt;
          if (y < 0.2) y = 24 + Math.random() * 4;
        } else {
          x += Math.sin(nowSec * 1.3 + v.phase) * 0.85 * dt;
          y += v.vy * 1.55 * dt;
          z += Math.cos(nowSec * 1.1 + v.phase) * 0.85 * dt;
          if (y < 0.2) y = 25 + Math.random() * 4;
        }

        // Wrap XZ around current focus so snow/petals never freeze or vanish when moving across 300m map
        if (x < cx - halfSpan) x += span;
        else if (x > cx + halfSpan) x -= span;
        if (z < cz - halfSpan) z += span;
        else if (z > cz + halfSpan) z -= span;

        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // 4. Night-Only Announced Grand Fireworks Festival
    const isNight = this.getTimeKey() === "night" && nightFactor > 0.55;
    this._updateNightFestival(dt, isNight);
    this._updateFireworks(dt);
  }

  dispose() {
    for (const fw of this.fireworks) {
      if (fw.rocketMesh) {
        this.scene.remove(fw.rocketMesh);
        fw.rocketMat?.dispose();
      }
      if (fw.burstPoints) {
        this.scene.remove(fw.burstPoints);
        fw.burstPoints.geometry.dispose();
        fw.burstMat?.dispose();
      }
    }
    this.fireworks.length = 0;
    this._rocketGeo?.dispose();
    if (this.stars) {
      this.scene.remove(this.stars);
      this.stars.geometry.dispose();
      this.starMat?.dispose();
    }
    if (this.weatherPoints) {
      this.scene.remove(this.weatherPoints);
      this.weatherGeom?.dispose();
      this.weatherMat?.dispose();
    }
    if (this.fireworkLight) {
      this.scene.remove(this.fireworkLight);
    }
  }
}
