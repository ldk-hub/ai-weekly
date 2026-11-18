import * as THREE from "three";

const SEASONS = ["spring", "summer", "autumn", "winter"];
const SEASON_LABELS = {
  spring: "🌸 봄 · 벚꽃",
  summer: "🎆 여름 · 반딧불",
  autumn: "🍂 가을 · 낙엽",
  winter: "❄️ 겨울 · 눈",
};

const TIME_PRESETS = {
  dawn: 0.24,
  day: 0.45,
  sunset: 0.72,
  night: 0.94,
};

function createSoftParticleTexture(shape = "circle") {
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
  return tex;
}

function lerpColor(cA, cB, t) {
  return new THREE.Color().copy(cA).lerp(cB, Math.max(0, Math.min(1, t)));
}

/**
 * Manages smooth Day/Night cycles, 4-Season foliage & weather particles
 * (cherry blossoms, fireflies, autumn leaves, snow), starry night sky, and 3D fireworks.
 */
export class SanctuaryAtmosphere {
  constructor(scene, lights, envFx) {
    this.scene = scene;
    this.lights = lights;
    this.envFx = envFx;
    this.mats = envFx.atmosphereMats || {};

    this.timeMode = "auto"; // "auto" | "dawn" | "day" | "sunset" | "night"
    this.timeOfDay = 0.42; // Starts in warm late morning/daylight
    this.dayCycleDurationSec = 90;

    this.seasonMode = "auto"; // "auto" | "spring" | "summer" | "autumn" | "winter"
    this.seasonIndex = 0; // Starts in Spring (cherry blossoms)
    this.seasonTimer = 0;
    this.seasonDurationSec = 28;

    this.fireworks = [];
    this.autoFireworkCooldown = 5.0;
    this._heroPos = new THREE.Vector3();

    this._buildSkyStars();
    this._buildWeatherParticles();
    this._applySeasonFoliage(this.getCurrentSeason(), 1.0);
  }

  getCurrentSeason() {
    if (this.seasonMode !== "auto") return this.seasonMode;
    return SEASONS[this.seasonIndex % SEASONS.length];
  }

  getTimeLabel() {
    const t = this.timeOfDay;
    if (t >= 0.18 && t < 0.32) return "🌅 새벽";
    if (t >= 0.32 && t < 0.65) return "☀️ 낮";
    if (t >= 0.65 && t < 0.80) return "🌇 노을";
    return "🌙 밤";
  }

  getStatusLabels() {
    return {
      timeLabel: `${this.getTimeLabel()}${this.timeMode === "auto" ? "" : " (고정)"}`,
      seasonLabel: `${SEASON_LABELS[this.getCurrentSeason()]}${this.seasonMode === "auto" ? "" : " (고정)"}`,
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
  }

  cycleSeasonMode() {
    const order = ["auto", "spring", "summer", "autumn", "winter"];
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
    const count = 320;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 28 + Math.random() * 48;
      pos[i * 3] = Math.cos(ang) * rad;
      pos[i * 3 + 1] = 22 + Math.random() * 24;
      pos[i * 3 + 2] = Math.sin(ang) * rad;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({
      map: createSoftParticleTexture("circle"),
      color: 0xe0f2fe,
      size: 0.45,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.stars = new THREE.Points(geom, this.starMat);
    this.scene.add(this.stars);
  }

  _buildWeatherParticles() {
    const count = 720;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vel = [];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 38;
      pos[i * 3 + 1] = Math.random() * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 38;
      vel.push({
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(1.0 + Math.random() * 1.4),
        vz: (Math.random() - 0.5) * 0.8,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.weatherGeom = new THREE.BufferGeometry();
    this.weatherGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.weatherGeom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    this.weatherVel = vel;

    this.weatherMat = new THREE.PointsMaterial({
      map: createSoftParticleTexture("petal"),
      size: 0.52,
      vertexColors: true,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
    });
    this.weatherPoints = new THREE.Points(this.weatherGeom, this.weatherMat);
    this.scene.add(this.weatherPoints);
    this._reseedWeatherColors(this.getCurrentSeason());
  }

  _reseedWeatherColors(season) {
    if (!this.weatherGeom) return;
    const colAttr = this.weatherGeom.attributes.color;
    const palettes = {
      spring: [[1.0, 0.72, 0.86], [0.99, 0.58, 0.78], [1.0, 0.92, 0.96]],
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
      this.weatherMat.size = season === "winter" ? 0.48 : season === "summer" ? 0.36 : 0.56;
      this.weatherMat.blending = season === "summer" ? THREE.AdditiveBlending : THREE.NormalBlending;
      this.weatherMat.needsUpdate = true;
    }
  }

  /**
   * Launch a 3D physics firework rocket that ascends and bursts into colorful sparks.
   */
  launchFirework(originX = null, originZ = null) {
    const x = originX !== null ? originX : this._heroPos.x + (Math.random() - 0.5) * 18;
    const z = originZ !== null ? originZ : this._heroPos.z - 5 + (Math.random() - 0.5) * 12;
    const targetY = 5.0 + Math.random() * 2.6;
    const palettes = [
      [0xfbbf24, 0xfef08a, 0xf97316],
      [0x38bdf8, 0xa5f3fc, 0x818cf8],
      [0xf43f5e, 0xfbcfe8, 0xfbbf24],
      [0x34d399, 0x6ee7b7, 0x38bdf8],
    ];
    const pal = palettes[Math.floor(Math.random() * palettes.length)];

    const rocketGeom = new THREE.SphereGeometry(0.22, 8, 8);
    const rocketMat = new THREE.MeshBasicMaterial({ color: pal[0] });
    const rocketMesh = new THREE.Mesh(rocketGeom, rocketMat);
    rocketMesh.position.set(x, 1.2, z);
    this.scene.add(rocketMesh);

    this.fireworks.push({
      phase: "rising",
      rocketMesh,
      rocketMat,
      x,
      y: 1.2,
      z,
      vy: 9.5 + Math.random() * 2.5,
      targetY,
      pal,
      burstPoints: null,
      burstMat: null,
      flashLight: null,
      sparks: [],
      age: 0,
      life: 1.85,
    });
  }

  _explodeFirework(fw) {
    this.scene.remove(fw.rocketMesh);
    fw.rocketMesh.geometry.dispose();
    fw.rocketMat.dispose();
    fw.rocketMesh = null;

    const count = 72;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const sparks = [];
    const cList = fw.pal.map((hex) => new THREE.Color(hex));

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 3.6 + Math.random() * 4.4;
      pos[i * 3] = fw.x;
      pos[i * 3 + 1] = fw.y;
      pos[i * 3 + 2] = fw.z;
      const c = cList[i % cList.length];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      sparks.push({
        vx: Math.sin(phi) * Math.cos(theta) * speed,
        vy: Math.cos(phi) * speed + 1.2,
        vz: Math.sin(phi) * Math.sin(theta) * speed,
      });
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geom.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      map: createSoftParticleTexture("circle"),
      size: 0.92,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pts = new THREE.Points(geom, mat);
    this.scene.add(pts);

    const flash = new THREE.PointLight(fw.pal[0], 5.5, 28);
    flash.position.set(fw.x, fw.y, fw.z);
    this.scene.add(flash);

    fw.phase = "burst";
    fw.burstPoints = pts;
    fw.burstMat = mat;
    fw.flashLight = flash;
    fw.sparks = sparks;
    fw.age = 0;
  }

  _updateFireworks(dt) {
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
          if (fw.flashLight) this.scene.remove(fw.flashLight);
          this.fireworks.splice(i, 1);
          continue;
        }
        const posAttr = fw.burstPoints.geometry.attributes.position;
        const drag = Math.exp(-1.25 * dt);
        for (let k = 0; k < fw.sparks.length; k++) {
          const sp = fw.sparks[k];
          sp.vx *= drag;
          sp.vz *= drag;
          sp.vy = sp.vy * drag - 4.2 * dt;
          posAttr.setXYZ(
            k,
            posAttr.getX(k) + sp.vx * dt,
            posAttr.getY(k) + sp.vy * dt,
            posAttr.getZ(k) + sp.vz * dt
          );
        }
        posAttr.needsUpdate = true;
        fw.burstMat.opacity = Math.max(0, 1 - p * p);
        if (fw.flashLight) fw.flashLight.intensity = Math.max(0, 5.5 * (1 - p * 2.5));
      }
    }
  }

  _applySeasonFoliage(season, blendSpeed = 0.14) {
    const targets = {
      spring: { hi: 0xffb8d9, mid: 0xf9a8d4, dark: 0x6ee7b7, ground: 0xffffff, ave: 0xebd7b0 },
      summer: { hi: 0xffffff, mid: 0xffffff, dark: 0xffffff, ground: 0xffffff, ave: 0xebd7b0 },
      autumn: { hi: 0xfbbf24, mid: 0xf97316, dark: 0x9a3412, ground: 0xfde68a, ave: 0xe6c79c },
      winter: { hi: 0xffffff, mid: 0xe2e8f0, dark: 0x64748b, ground: 0xdbeafe, ave: 0xf1f5f9 },
    }[season] || {};

    const lerpMat = (mat, hex) => {
      if (!mat || hex === undefined) return;
      mat.color.lerp(new THREE.Color(hex), blendSpeed);
    };
    lerpMat(this.mats.leafHiMat, targets.hi);
    lerpMat(this.mats.leafMidMat, targets.mid);
    lerpMat(this.mats.leafDarkMat, targets.dark);
    lerpMat(this.mats.plazaMat, targets.ground);
    lerpMat(this.mats.avenueMat, targets.ave);
  }

  update(dt, heroPos) {
    if (heroPos) this._heroPos.copy(heroPos);

    // 1. Advance Time of Day
    if (this.timeMode === "auto") {
      this.timeOfDay = (this.timeOfDay + dt / this.dayCycleDurationSec) % 1;
    }

    // Compute smooth daylight factor (0 = midnight, 1 = noon)
    const t = this.timeOfDay;
    const sunElev = Math.sin((t - 0.25) * Math.PI * 2); // -1 midnight .. +1 noon
    const dayFactor = THREE.MathUtils.clamp((sunElev + 0.25) / 1.25, 0, 1);
    const duskFactor = Math.exp(-Math.pow((t - 0.72) / 0.075, 2)) + Math.exp(-Math.pow((t - 0.24) / 0.075, 2));
    const nightFactor = 1 - dayFactor;

    const cNight = new THREE.Color(0x0b1325);
    const cDusk = new THREE.Color(0xd98664);
    const cDay = new THREE.Color(0xd9caa4);
    const skyColor = lerpColor(lerpColor(cNight, cDay, dayFactor), cDusk, Math.min(0.85, duskFactor * 0.85));

    if (this.scene.background?.isColor) this.scene.background.copy(skyColor);
    if (this.scene.fog) this.scene.fog.color.copy(skyColor);

    if (this.lights.dirLight) {
      const sunCol = lerpColor(lerpColor(new THREE.Color(0x8bb4ff), new THREE.Color(0xffefc2), dayFactor), new THREE.Color(0xff9b66), Math.min(0.8, duskFactor));
      this.lights.dirLight.color.copy(sunCol);
      this.lights.dirLight.intensity = 0.42 + dayFactor * 2.15;
    }
    if (this.lights.ambientLight) {
      this.lights.ambientLight.color.copy(lerpColor(new THREE.Color(0x3b4d70), new THREE.Color(0xfff5db), dayFactor));
      this.lights.ambientLight.intensity = 0.26 + dayFactor * 0.48;
    }
    if (this.lights.hemiLight) {
      this.lights.hemiLight.intensity = 0.30 + dayFactor * 0.58;
    }
    if (this.mats.lampGlowMat) {
      this.mats.lampGlowMat.emissiveIntensity = 0.5 + nightFactor * 2.8;
    }
    if (this.mats.rayMat) {
      this.mats.rayMat.opacity = dayFactor * 0.095;
    }
    if (this.starMat) {
      this.starMat.opacity = Math.max(0, (nightFactor - 0.35) / 0.65) * 0.92;
      this.stars.position.set(this._heroPos.x, 0, this._heroPos.z);
    }
    for (const b of this.envFx.buildings || []) {
      if (b.intLight) {
        b.intLight.intensity = 1.6 + nightFactor * 1.8;
      }
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

    // 3. Animate Seasonal Weather Particles around Hero/City
    if (this.weatherGeom) {
      const posAttr = this.weatherGeom.attributes.position;
      const nowSec = performance.now() * 0.001;
      for (let i = 0; i < posAttr.count; i++) {
        const v = this.weatherVel[i];
        let x = posAttr.getX(i);
        let y = posAttr.getY(i);
        let z = posAttr.getZ(i);

        if (season === "summer") {
          // Rising/drifting glowing fireflies
          x += Math.sin(nowSec * 1.4 + v.phase) * 0.8 * dt;
          y += Math.abs(v.vy) * 0.35 * dt;
          z += Math.cos(nowSec * 1.2 + v.phase) * 0.8 * dt;
          if (y > 9) y = 0.4;
        } else if (season === "spring") {
          // Diagonal fluttering cherry blossom petals
          x += (0.85 + Math.sin(nowSec * 2.1 + v.phase) * 0.65) * dt;
          y += v.vy * 0.85 * dt;
          z += (0.45 + Math.cos(nowSec * 1.7 + v.phase) * 0.5) * dt;
          if (y < 0.1) { y = 10 + Math.random() * 3; x = this._heroPos.x + (Math.random() - 0.5) * 38; z = this._heroPos.z + (Math.random() - 0.5) * 38; }
        } else if (season === "autumn") {
          // Swirling gusting autumn leaves
          x += (1.35 + Math.sin(nowSec * 2.6 + v.phase) * 1.1) * dt;
          y += v.vy * 1.05 * dt;
          z += Math.cos(nowSec * 2.2 + v.phase) * 0.9 * dt;
          if (y < 0.1) { y = 10 + Math.random() * 3; x = this._heroPos.x + (Math.random() - 0.5) * 38; z = this._heroPos.z + (Math.random() - 0.5) * 38; }
        } else {
          // Gentle crisp winter snowfall
          x += Math.sin(nowSec * 1.2 + v.phase) * 0.45 * dt;
          y += v.vy * 1.25 * dt;
          z += Math.cos(nowSec * 1.1 + v.phase) * 0.45 * dt;
          if (y < 0.1) { y = 11 + Math.random() * 3; x = this._heroPos.x + (Math.random() - 0.5) * 38; z = this._heroPos.z + (Math.random() - 0.5) * 38; }
        }
        posAttr.setXYZ(i, x, y, z);
      }
      posAttr.needsUpdate = true;
    }

    // 4. Night & Summer Periodic Fireworks + Active Burst Simulation
    if (nightFactor > 0.55 || season === "summer") {
      this.autoFireworkCooldown -= dt;
      if (this.autoFireworkCooldown <= 0) {
        this.launchFirework();
        this.autoFireworkCooldown = nightFactor > 0.55 ? 4.5 + Math.random() * 3.5 : 8.5 + Math.random() * 4.5;
      }
    }
    this._updateFireworks(dt);
  }
}
