import * as THREE from "three";

/**
 * PixelVFXEngine — Lightweight, zero-leak 2.5D Pixel-Art VFX Sprite Engine.
 * Renders MIT-licensed sprite sheets baked from patch-gg/pixelfx & skulitom/Pixelbolt
 * onto shared PlaneGeometry instances with NearestFilter pixel crispness.
 */
export class PixelVFXEngine {
  constructor(scene, manifestUrl = "assets/vfx/manifest.json") {
    this.scene = scene;
    this.manifestUrl = manifestUrl;
    this.manifest = null;
    this._baseTexCache = new Map(); // key -> THREE.Texture (shared GPU Image)
    this._loadingMap = new Map();
    this._loader = new THREE.TextureLoader();

    // Shared geometries (zero geometry leak across hundreds of VFX spawns)
    this._unitPlaneGeo = new THREE.PlaneGeometry(1, 1);
    this._groundPlaneGeo = new THREE.PlaneGeometry(1, 1);
    this._groundPlaneGeo.rotateX(-Math.PI / 2);

    this.activeBursts = [];
    this.activeProjectiles = [];
    this.activeLoops = [];
    this._readyPromise = this._loadManifest();
  }

  async _loadManifest() {
    try {
      const res = await fetch(this.manifestUrl);
      if (!res.ok) throw new Error(`VFX manifest HTTP ${res.status}`);
      this.manifest = await res.json();
      // Pre-warm the most frequently used arcade FX quietly
      const prewarm = ["sword_slash", "crit_hit", "poof", "coin_spin", "collect_burst", "fireball", "ice_lance", "tornado", "boulder"];
      for (const k of prewarm) {
        if (this.manifest[k]) this._ensureBaseTexture(k);
      }
    } catch (err) {
      console.warn("[PixelVFXEngine] Failed to load manifest:", err);
      this.manifest = {};
    }
  }

  _ensureBaseTexture(key) {
    if (this._baseTexCache.has(key)) return this._baseTexCache.get(key);
    const meta = this.manifest?.[key];
    if (!meta) return null;

    const tex = this._loader.load(meta.file);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1 / meta.cols, 1 / meta.rows);
    this._baseTexCache.set(key, tex);
    return tex;
  }

  _cloneSpriteTex(key) {
    const base = this._ensureBaseTexture(key);
    const meta = this.manifest?.[key];
    if (!base || !meta) return null;
    const tex = base.clone();
    tex.image = base.image;
    tex.source = base.source; // Share GPU image backing store (zero VRAM duplication)
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.repeat.set(1 / meta.cols, 1 / meta.rows);
    tex.needsUpdate = true;
    return { tex, meta };
  }

  _setFrame(tex, meta, frameIdx, flipX = false) {
    const clamped = Math.max(0, Math.min(meta.frames - 1, frameIdx));
    const col = clamped % meta.cols;
    const row = Math.floor(clamped / meta.cols);
    const uStep = 1 / meta.cols;
    const vStep = 1 / meta.rows;
    if (flipX) {
      tex.repeat.set(-uStep, vStep);
      tex.offset.set((col + 1) * uStep, (meta.rows - 1 - row) * vStep);
    } else {
      tex.repeat.set(uStep, vStep);
      tex.offset.set(col * uStep, (meta.rows - 1 - row) * vStep);
    }
  }

  /**
   * Spawn a one-shot animated pixel-art VFX in 3D space.
   */
  spawnBurst(key, opts = {}) {
    const pack = this._cloneSpriteTex(key);
    if (!pack) return null;
    const { tex, meta } = pack;
    const scale = opts.scale ?? 2.4;
    const aspect = meta.frameW / Math.max(1, meta.frameH);
    const w = aspect >= 1 ? scale : scale * aspect;
    const h = aspect >= 1 ? scale / aspect : scale;
    const groundFlat = Boolean(opts.groundFlat);

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: opts.opacity ?? 1.0,
      color: opts.tint ?? 0xffffff,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const mesh = new THREE.Mesh(groundFlat ? this._groundPlaneGeo : this._unitPlaneGeo, mat);
    mesh.scale.set(w, groundFlat ? 1 : h, groundFlat ? h : 1);
    mesh.position.set(opts.x ?? 0, opts.y ?? (groundFlat ? 0.08 : h * 0.48), opts.z ?? 0);
    mesh.renderOrder = opts.renderOrder ?? 12;
    this._setFrame(tex, meta, 0, Boolean(opts.flipX));
    this.scene.add(mesh);

    const item = {
      mesh,
      mat,
      tex,
      meta,
      age: 0,
      fps: opts.fps ?? meta.fps ?? 15,
      flipX: Boolean(opts.flipX),
      groundFlat,
      spinSpeed: opts.spinSpeed ?? 0,
      riseSpeed: opts.riseSpeed ?? 0,
      fadeOutTail: opts.fadeOutTail ?? true,
      baseOpacity: opts.opacity ?? 1.0,
    };
    this.activeBursts.push(item);
    return item;
  }

  /**
   * Spawn a moving pixel-art elemental projectile (Fireball, Ice Lance, Tornado, Boulder).
   */
  spawnProjectile(key, opts = {}) {
    const pack = this._cloneSpriteTex(key);
    if (!pack) return null;
    const { tex, meta } = pack;
    const scale = opts.scale ?? 1.85;
    const aspect = meta.frameW / Math.max(1, meta.frameH);
    const w = aspect >= 1 ? scale : scale * aspect;
    const h = aspect >= 1 ? scale / aspect : scale;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 1.0,
      color: opts.tint ?? 0xffffff,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const mesh = new THREE.Mesh(this._unitPlaneGeo, mat);
    mesh.scale.set(w, h, 1);
    mesh.position.set(opts.x ?? 0, opts.y ?? 1.05, opts.z ?? 0);
    mesh.renderOrder = 14;
    this._setFrame(tex, meta, 0, Boolean(opts.flipX));
    this.scene.add(mesh);

    const proj = {
      mesh,
      mat,
      tex,
      meta,
      vx: opts.vx ?? 0,
      vz: opts.vz ?? 0,
      element: opts.element ?? "fire",
      power: opts.power ?? 1.0,
      radius: opts.radius ?? 0.95,
      age: 0,
      maxAge: opts.maxAge ?? 1.45,
      fps: opts.fps ?? 16,
      ownerId: opts.ownerId ?? "local",
      onHit: opts.onHit ?? null,
      alive: true,
    };
    this.activeProjectiles.push(proj);
    return proj;
  }

  /**
   * Create a persistent looping pixel-art billboard (collectible coin, spirit aura, sparkle).
   */
  createLoopBillboard(key, opts = {}) {
    const pack = this._cloneSpriteTex(key);
    if (!pack) return null;
    const { tex, meta } = pack;
    const scale = opts.scale ?? 1.1;
    const aspect = meta.frameW / Math.max(1, meta.frameH);
    const w = aspect >= 1 ? scale : scale * aspect;
    const h = aspect >= 1 ? scale / aspect : scale;
    const groundFlat = Boolean(opts.groundFlat);

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: opts.opacity ?? 1.0,
      color: opts.tint ?? 0xffffff,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const mesh = new THREE.Mesh(groundFlat ? this._groundPlaneGeo : this._unitPlaneGeo, mat);
    mesh.scale.set(w, groundFlat ? 1 : h, groundFlat ? h : 1);
    mesh.position.set(opts.x ?? 0, opts.y ?? 0.75, opts.z ?? 0);
    mesh.renderOrder = opts.renderOrder ?? 10;
    this._setFrame(tex, meta, 0, false);
    this.scene.add(mesh);

    const loopObj = {
      mesh,
      mat,
      tex,
      meta,
      age: Math.random() * 2,
      fps: opts.fps ?? meta.fps ?? 12,
      groundFlat,
      spinSpeed: opts.spinSpeed ?? 0,
      alive: true,
      dispose: () => {
        if (!loopObj.alive) return;
        loopObj.alive = false;
        this.scene.remove(mesh);
        mat.dispose();
        tex.dispose();
      },
    };
    this.activeLoops.push(loopObj);
    return loopObj;
  }

  update(dt, cameraAzimuth = 0) {
    // 1. One-shot bursts
    for (let i = this.activeBursts.length - 1; i >= 0; i--) {
      const b = this.activeBursts[i];
      b.age += dt;
      const frameFloat = b.age * b.fps;
      const frameIdx = Math.floor(frameFloat);
      if (frameIdx >= b.meta.frames) {
        this.scene.remove(b.mesh);
        b.mat.dispose();
        b.tex.dispose();
        this.activeBursts.splice(i, 1);
        continue;
      }
      this._setFrame(b.tex, b.meta, frameIdx, b.flipX);
      if (b.riseSpeed) b.mesh.position.y += b.riseSpeed * dt;
      if (b.groundFlat) {
        if (b.spinSpeed) b.mesh.rotation.y += b.spinSpeed * dt;
      } else {
        b.mesh.rotation.y = cameraAzimuth;
      }
      if (b.fadeOutTail) {
        const progress = frameFloat / b.meta.frames;
        if (progress > 0.75) {
          b.mat.opacity = b.baseOpacity * Math.max(0, 1 - (progress - 0.75) / 0.25);
        }
      }
    }

    // 2. Moving elemental projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const p = this.activeProjectiles[i];
      p.age += dt;
      if (!p.alive || p.age >= p.maxAge) {
        this.scene.remove(p.mesh);
        p.mat.dispose();
        p.tex.dispose();
        this.activeProjectiles.splice(i, 1);
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      // Compute screen-relative left/right flip so fireball/ice-lance always points in travel dir
      const cosA = Math.cos(cameraAzimuth);
      const sinA = Math.sin(cameraAzimuth);
      const screenVx = p.vx * cosA - p.vz * sinA;
      const flipX = screenVx < -0.15;
      const frameIdx = Math.floor(p.age * p.fps) % p.meta.frames;
      this._setFrame(p.tex, p.meta, frameIdx, flipX);
      p.mesh.rotation.y = cameraAzimuth;
    }

    // 3. Persistent loops
    for (let i = this.activeLoops.length - 1; i >= 0; i--) {
      const l = this.activeLoops[i];
      if (!l.alive) {
        this.activeLoops.splice(i, 1);
        continue;
      }
      l.age += dt;
      const frameIdx = Math.floor(l.age * l.fps) % l.meta.frames;
      this._setFrame(l.tex, l.meta, frameIdx, false);
      if (l.groundFlat) {
        if (l.spinSpeed) l.mesh.rotation.y += l.spinSpeed * dt;
      } else {
        l.mesh.rotation.y = cameraAzimuth;
      }
    }
  }

  dispose() {
    for (const b of this.activeBursts) {
      this.scene.remove(b.mesh);
      b.mat.dispose();
      b.tex.dispose();
    }
    this.activeBursts.length = 0;

    for (const p of this.activeProjectiles) {
      this.scene.remove(p.mesh);
      p.mat.dispose();
      p.tex.dispose();
    }
    this.activeProjectiles.length = 0;

    for (const l of this.activeLoops) {
      if (l.alive) l.dispose();
    }
    this.activeLoops.length = 0;

    for (const tex of this._baseTexCache.values()) tex.dispose();
    this._baseTexCache.clear();
    this._unitPlaneGeo.dispose();
    this._groundPlaneGeo.dispose();
  }
}
