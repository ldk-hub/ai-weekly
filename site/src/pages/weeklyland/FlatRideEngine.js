import * as THREE from "three";
import { createToonMaterial, addToonOutline, getCarnivalStripeTexture } from "./ToonMaterials.js";

/**
 * WeeklyLand Flat Rides & Scenery Props Engine
 * - Ferris Wheel (12 gravity-leveled gondolas + night rim LEDs)
 * - Frontier Benchmark Drop Tower (live LLM benchmark LED gauge + freefall physics)
 * - Claude Grand Carousel (rotating brass canopy + bobbing mounts)
 * - Park Scenery Catalog (grand arch, fountain, AI live billboard, trees, lamps, kiosks)
 */
export class FlatRideEngine {
  constructor(scene, terrainEngine) {
    this.scene = scene;
    this.terrain = terrainEngine;
    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_RidesAndScenery";
    this.scene.add(this.group);

    this.rides = new Map();
    this.sceneryObjects = new Map();
    this.pickables = [];
    this.nightLights = [];
    this.billboardCanvases = [];
    this.dropTowerGaugeMat = null;
    this._time = 0;
  }

  syncAll(ridesList, sceneryList) {
    this._clear();
    for (const r of ridesList || []) {
      this._buildRide(r);
    }
    for (const s of sceneryList || []) {
      this._buildScenery(s);
    }
  }

  _clear() {
    while (this.group.children.length > 0) {
      const ch = this.group.children.pop();
      ch.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else if (obj.material) obj.material.dispose();
      });
    }
    this.rides.clear();
    this.sceneryObjects.clear();
    this.pickables = [];
    this.nightLights = [];
    this.billboardCanvases = [];
    this.dropTowerGaugeMat = null;
  }

  _groundY(x, z) {
    return this.terrain ? Math.max(this.terrain.waterLevel + 0.1, this.terrain.getHeightAt(x, z)) : 0;
  }

  _buildRide(def) {
    const root = new THREE.Group();
    const gy = this._groundY(def.x, def.z);
    root.position.set(def.x, gy, def.z);
    root.rotation.y = def.rotY || 0;
    root.scale.setScalar(def.scale || 1);
    root.userData = { pickKind: "ride", id: def.id, rideType: def.type, name: def.name };
    this.group.add(root);

    let runtime = { def, root, kind: def.type };

    if (def.type === "ferris_wheel") {
      runtime = { ...runtime, ...this._createFerrisWheel(root) };
    } else if (def.type === "drop_tower") {
      runtime = { ...runtime, ...this._createDropTower(root) };
    } else if (def.type === "carousel") {
      runtime = { ...runtime, ...this._createCarousel(root) };
    }

    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.userData = { pickKind: "ride", id: def.id, rideType: def.type, name: def.name };
        this.pickables.push(obj);
      }
    });

    this.rides.set(def.id, runtime);
  }

  _createFerrisWheel(root) {
    const radius = 10.5;
    const hubY = 12.6;
    const legMat = createToonMaterial(0xfff7eb);
    const rimMat = createToonMaterial(0xff7657);
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x38bdf8, emissiveIntensity: 0.45 });
    this.nightLights.push(glowMat);

    // Base plinth
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.8, 0.7, 18),
      createToonMaterial(0xffe8c2)
    );
    base.position.y = 0.35;
    base.receiveShadow = true;
    addToonOutline(base, 1.025);
    root.add(base);

    // A-frame support legs
    const legGeo = new THREE.CylinderGeometry(0.28, 0.36, 14.2, 8);
    for (const side of [-2.4, 2.4]) {
      for (const tilt of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(tilt * 12, hubY * 0.5 + 0.3, side);
        leg.rotation.z = tilt;
        leg.castShadow = true;
        root.add(leg);
      }
    }

    // Rotating wheel hub
    const wheel = new THREE.Group();
    wheel.position.set(0, hubY, 0);
    root.add(wheel);

    for (const zOff of [-1.25, 1.25]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.22, 10, 36), rimMat);
      rim.position.z = zOff;
      rim.castShadow = true;
      wheel.add(rim);

      const ledRing = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.45, 0.08, 8, 36), glowMat);
      ledRing.position.z = zOff * 1.05;
      wheel.add(ledRing);
    }

    const spokeGeo = new THREE.CylinderGeometry(0.08, 0.08, radius * 2, 6);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(spokeGeo, legMat);
      spoke.rotation.z = (i / 6) * Math.PI;
      wheel.add(spoke);
    }

    // Cute golden sun emblem at the Ferris Wheel hub
    const hubDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(2.0, 2.0, 2.9, 16),
      createToonMaterial(0xffd166)
    );
    hubDisc.rotation.x = Math.PI * 0.5;
    addToonOutline(hubDisc, 1.05);
    wheel.add(hubDisc);

    // 12 Cute Rounded Candy-Capsule Gondolas
    const gondolas = [];
    const colors = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7, 0xf9a8d4, 0xc4b5fd];
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const gPivot = new THREE.Group();
      gPivot.position.set(Math.cos(ang) * radius, Math.sin(ang) * radius, 0);

      const cabin = new THREE.Mesh(
        new THREE.SphereGeometry(1.08, 14, 12),
        createToonMaterial(colors[i % colors.length])
      );
      cabin.scale.set(0.95, 1.05, 1.15);
      cabin.position.y = -1.05;
      cabin.castShadow = true;
      addToonOutline(cabin, 1.06);
      gPivot.add(cabin);

      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(1.08, 1.08, 0.48, 14),
        new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.78 })
      );
      band.position.y = -0.92;
      gPivot.add(band);

      wheel.add(gPivot);
      gondolas.push(gPivot);
    }

    return { wheel, gondolas, angle: 0 };
  }

  _createDropTower(root) {
    const towerH = 30;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(4.6, 5.2, 0.8, 12),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.4, roughness: 0.6 })
    );
    base.position.y = 0.4;
    base.receiveShadow = true;
    root.add(base);

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.45, towerH, 12),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.32 })
    );
    spire.position.y = towerH * 0.5 + 0.5;
    spire.castShadow = true;
    root.add(spire);

    // Benchmark vertical glowing gauge strips
    const gaugeMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x34d399,
      emissiveIntensity: 0.7,
    });
    this.nightLights.push(gaugeMat);
    this.dropTowerGaugeMat = gaugeMat;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, towerH - 2, 0.18), gaugeMat);
      strip.position.set(Math.cos(a) * 1.38, towerH * 0.5 + 0.5, Math.sin(a) * 1.38);
      root.add(strip);
    }

    // Crown beacon
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 3.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.6, roughness: 0.25 })
    );
    crown.position.y = towerH + 2.0;
    root.add(crown);

    // Moving passenger gondola ring
    const carriage = new THREE.Group();
    carriage.position.y = 2.4;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.3, 0.45, 10, 20),
      new THREE.MeshStandardMaterial({ color: 0xe07a52, metalness: 0.45, roughness: 0.25 })
    );
    ring.rotation.x = Math.PI * 0.5;
    ring.castShadow = true;
    carriage.add(ring);
    root.add(carriage);

    return { carriage, towerH, phaseTime: 0, currentY: 2.4, velY: 0 };
  }

  _createCarousel(root) {
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(6.8, 7.2, 0.7, 24),
      new THREE.MeshStandardMaterial({ color: 0xf4ede0, roughness: 0.65 })
    );
    deck.position.y = 0.35;
    deck.receiveShadow = true;
    root.add(deck);

    const rotor = new THREE.Group();
    rotor.position.y = 0.7;
    root.add(rotor);

    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.3, 5.4, 16),
      new THREE.MeshStandardMaterial({ color: 0xc89b3c, metalness: 0.6, roughness: 0.25 })
    );
    column.position.y = 2.7;
    column.castShadow = true;
    rotor.add(column);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(7.4, 3.0, 20),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#fff7eb", 14) })
    );
    canopy.position.y = 6.2;
    canopy.castShadow = true;
    addToonOutline(canopy, 1.03);
    rotor.add(canopy);

    // Golden star topper on carousel roof
    const starTop = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85, 0),
      createToonMaterial(0xffd166, { emissive: 0xf59e0b, emissiveIntensity: 0.35 })
    );
    starTop.position.y = 8.1;
    addToonOutline(starTop, 1.08);
    rotor.add(starTop);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.55,
    });
    this.nightLights.push(bulbMat);
    const bulbRing = new THREE.Mesh(new THREE.TorusGeometry(7.05, 0.14, 8, 32), bulbMat);
    bulbRing.rotation.x = Math.PI * 0.5;
    bulbRing.position.y = 4.9;
    rotor.add(bulbRing);

    const mounts = [];
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.8, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.7, roughness: 0.2 });
    const mountColors = [0xfcf9f3, 0xe07a52, 0x38bdf8, 0x34d399];

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const mx = Math.cos(a) * 4.9;
      const mz = Math.sin(a) * 4.9;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(mx, 2.5, mz);
      rotor.add(pole);

      const horse = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.85, 1.45),
        new THREE.MeshStandardMaterial({ color: mountColors[i % mountColors.length], roughness: 0.35 })
      );
      horse.position.set(mx, 1.55, mz);
      horse.rotation.y = -a;
      horse.castShadow = true;
      rotor.add(horse);
      mounts.push({ mesh: horse, phase: i * 0.8 });
    }

    return { rotor, mounts, angle: 0 };
  }

  _buildScenery(def) {
    const root = new THREE.Group();
    const gy = this._groundY(def.x, def.z);
    root.position.set(def.x, gy, def.z);
    root.rotation.y = def.rotY || 0;
    root.scale.setScalar(def.scale || 1);
    this.group.add(root);

    if (def.type === "grand_arch") {
      this._buildGrandArch(root);
    } else if (def.type === "fountain") {
      this._buildFountain(root);
    } else if (def.type === "ai_billboard") {
      this._buildAIBillboard(root);
    } else if (def.type === "tree_oak" || def.type === "tree_sakura" || def.type === "tree_pine") {
      this._buildTree(root, def.type);
    } else if (def.type === "lamp_post") {
      this._buildLampPost(root);
    } else if (def.type === "kiosk") {
      this._buildKiosk(root);
    }

    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.userData = { pickKind: "scenery", id: def.id, sceneryType: def.type };
        this.pickables.push(obj);
      }
    });
    this.sceneryObjects.set(def.id, root);
  }

  _buildGrandArch(root) {
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0xf4ede0, roughness: 0.78 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc89b3c, metalness: 0.65, roughness: 0.25 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.6 });
    this.nightLights.push(lightMat);

    for (const px of [-5.2, 5.2]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7.6, 1.5), stoneMat);
      pillar.position.set(px, 3.8, 0);
      pillar.castShadow = true;
      root.add(pillar);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1.8, 4), brassMat);
      cap.position.set(px, 8.5, 0);
      cap.rotation.y = Math.PI * 0.25;
      root.add(cap);
    }

    const arch = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.52, 10, 24, Math.PI), brassMat);
    arch.position.set(0, 6.2, 0);
    arch.castShadow = true;
    root.add(arch);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.5, 0.35), stoneMat);
    sign.position.set(0, 7.2, 0.35);
    root.add(sign);

    const signTex = this._makeTextCanvas("WEEKLYLAND · 위클리랜드", "AI THEME PARK", "#1a1714", "#fcf9f3", "#c85a32");
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(7.4, 1.3),
      new THREE.MeshBasicMaterial({ map: signTex })
    );
    face.position.set(0, 7.2, 0.55);
    root.add(face);

    const faceBack = face.clone();
    faceBack.rotation.y = Math.PI;
    faceBack.position.z = 0.14;
    root.add(faceBack);

    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.16, 0.45), lightMat);
    glowStrip.position.set(0, 8.05, 0.35);
    root.add(glowStrip);
  }

  _buildFountain(root) {
    const stone = new THREE.MeshStandardMaterial({ color: 0xe7dfd1, roughness: 0.72 });
    const water = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 });

    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.1, 0.8, 24), stone);
    basin.position.y = 0.4;
    basin.receiveShadow = true;
    root.add(basin);

    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.15, 24), water);
    pool.position.y = 0.78;
    root.add(pool);

    const tier = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 2.4, 14), stone);
    tier.position.y = 1.6;
    tier.castShadow = true;
    root.add(tier);

    const jet = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.45 })
    );
    jet.position.y = 3.1;
    this.nightLights.push(jet.material);
    root.add(jet);
  }

  _buildAIBillboard(root) {
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.35 });
    for (const px of [-4.5, 4.5]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 7.5, 10), frameMat);
      leg.position.set(px, 3.75, 0);
      leg.castShadow = true;
      root.add(leg);
    }

    const board = new THREE.Mesh(new THREE.BoxGeometry(11.6, 5.2, 0.55), frameMat);
    board.position.set(0, 7.8, 0);
    board.castShadow = true;
    root.add(board);

    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 340;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    this._paintBillboard(canvas, {
      headline: "AI위클리 실시간 테마파크 전광판",
      sub: "최신 AI 뉴스 · 스타보드 급상승 · 프론티어 벤치마크 동기화 중",
      ticker: "WEEKLYLAND LIVE TELEMETRY",
    });
    tex.needsUpdate = true;

    const screenMat = new THREE.MeshBasicMaterial({ map: tex });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(10.9, 4.6), screenMat);
    screen.position.set(0, 7.8, 0.3);
    root.add(screen);

    this.billboardCanvases.push({ canvas, tex });
  }

  _paintBillboard(canvas, info) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#0b1324");
    grad.addColorStop(1, "#172542");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#e07a52";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "600 22px monospace";
    ctx.fillText(info.ticker || "WEEKLYLAND LIVE", 36, 62);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 34px sans-serif";
    const headline = String(info.headline || "").slice(0, 34);
    ctx.fillText(headline, 36, 148);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 22px sans-serif";
    const sub = String(info.sub || "").slice(0, 52);
    ctx.fillText(sub, 36, 212);

    ctx.fillStyle = "#eab308";
    ctx.font = "600 20px monospace";
    ctx.fillText(info.metricLine || "AI WEEKLY LIVE PARK FEED", 36, 286);
  }

  updateBillboardData(info) {
    for (const item of this.billboardCanvases) {
      this._paintBillboard(item.canvas, info);
      item.tex.needsUpdate = true;
    }
  }

  _buildTree(root, type) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.42, 2.4, 8),
      createToonMaterial(0x8d5b3c)
    );
    trunk.position.y = 1.2;
    trunk.castShadow = true;
    addToonOutline(trunk, 1.08);
    root.add(trunk);

    if (type === "tree_pine") {
      const mat = createToonMaterial(0x3ba874);
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(2.2 - i * 0.45, 2.4, 10), mat);
        cone.position.y = 2.5 + i * 1.4;
        cone.castShadow = true;
        addToonOutline(cone, 1.05);
        root.add(cone);
      }
      return;
    }

    // Fluffy multi-puff storybook cartoon canopy (Animal Crossing style!)
    const mainColor = type === "tree_sakura" ? 0xffb3d9 : 0x52c77c;
    const hiColor = type === "tree_sakura" ? 0xffd6ec : 0x7de39c;
    const mainMat = createToonMaterial(mainColor);
    const hiMat = createToonMaterial(hiColor);
    const puffs = [
      [0, 3.6, 0, 1.65, mainMat],
      [-1.05, 3.05, 0.5, 1.22, mainMat],
      [1.05, 3.1, -0.45, 1.25, mainMat],
      [0.25, 4.35, 0.35, 1.15, hiMat],
      [-0.4, 3.2, -0.9, 1.18, hiMat],
    ];
    for (const [px, py, pz, r, mat] of puffs) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
      puff.position.set(px, py, pz);
      puff.castShadow = true;
      addToonOutline(puff, 1.055);
      root.add(puff);
    }
  }

  _buildLampPost(root) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.35 })
    );
    pole.position.y = 2.1;
    pole.castShadow = true;
    root.add(pole);

    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.4,
    });
    this.nightLights.push(bulbMat);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), bulbMat);
    lantern.position.y = 4.35;
    root.add(lantern);
  }

  _buildKiosk(root) {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 2.5, 2.4),
      createToonMaterial(0xfff7eb)
    );
    body.position.y = 1.25;
    body.castShadow = true;
    body.receiveShadow = true;
    addToonOutline(body, 1.045);
    root.add(body);

    const awning = new THREE.Mesh(
      new THREE.ConeGeometry(2.75, 1.35, 4),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#fff7eb", 8) })
    );
    awning.position.y = 3.15;
    awning.rotation.y = Math.PI * 0.25;
    awning.castShadow = true;
    addToonOutline(awning, 1.045);
    root.add(awning);

    // Cute ice-cream cone sign on top of kiosk
    const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), createToonMaterial(0xffb3d9));
    scoop.position.y = 4.15;
    addToonOutline(scoop, 1.08);
    root.add(scoop);
  }

  _makeTextCanvas(title, subtitle, bg, fg, accent) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 96;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 512, 8);
    ctx.fillStyle = fg;
    ctx.font = "700 30px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, 256, 54);
    ctx.fillStyle = accent;
    ctx.font = "600 16px monospace";
    ctx.fillText(subtitle, 256, 80);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  getRidePosition(rideId) {
    const r = this.rides.get(rideId);
    return r ? r.root.position.clone() : new THREE.Vector3(0, 0, 0);
  }

  /**
   * Returns 1st-person POV transform & telemetry for Ferris Wheel, Drop Tower, or Carousel.
   */
  getRideSeatState(rideId) {
    const r = this.rides.get(rideId);
    if (!r) return null;
    const pos = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, 1);
    const up = new THREE.Vector3(0, 1, 0);

    if (r.kind === "ferris_wheel" && r.gondolas?.[0]) {
      r.gondolas[0].getWorldPosition(pos);
      pos.y -= 0.7;
      forward.set(-pos.x, -4, -pos.z).normalize();
      return {
        position: pos,
        tangent: forward,
        up,
        speedKmh: 9,
        altitudeM: Number(pos.y.toFixed(1)),
        vertG: 1.0,
        latG: 0.0,
        segment: "PANORAMA",
        coasterName: r.def.name,
      };
    }

    if (r.kind === "drop_tower" && r.carriage) {
      r.carriage.getWorldPosition(pos);
      pos.z += 2.35;
      pos.y += 0.45;
      forward.set(-pos.x, -6, -pos.z).normalize();
      const speedKmh = Math.round(Math.abs(r.velY || 0) * 3.6);
      const vertG = r.velY < -3 ? 0.1 : r.velY > 1 ? 1.2 : 1.0;
      return {
        position: pos,
        tangent: forward,
        up,
        speedKmh,
        altitudeM: Number(pos.y.toFixed(1)),
        vertG,
        latG: 0.0,
        segment: r.velY < -3 ? "FREEFALL" : r.velY > 0.5 ? "ASCEND" : "APEX HOLD",
        coasterName: r.def.name,
      };
    }

    if (r.kind === "carousel" && r.mounts?.[0]) {
      r.mounts[0].mesh.getWorldPosition(pos);
      pos.y += 0.85;
      const a = r.angle + Math.PI * 0.5;
      forward.set(Math.cos(a), 0, -Math.sin(a)).normalize();
      return {
        position: pos,
        tangent: forward,
        up,
        speedKmh: 16,
        altitudeM: Number(pos.y.toFixed(1)),
        vertG: 1.1,
        latG: 0.3,
        segment: "CAROUSEL",
        coasterName: r.def.name,
      };
    }

    return null;
  }

  update(dt, isNight) {
    const stepDt = Math.min(dt, 0.05);
    this._time += stepDt;

    for (const mat of this.nightLights) {
      mat.emissiveIntensity = isNight ? 1.65 : 0.25;
    }

    for (const r of this.rides.values()) {
      if (r.kind === "ferris_wheel" && r.wheel) {
        r.angle += stepDt * 0.24;
        r.wheel.rotation.z = r.angle;
        for (const g of r.gondolas) {
          g.rotation.z = -r.angle;
        }
      } else if (r.kind === "drop_tower" && r.carriage) {
        r.phaseTime = (r.phaseTime + stepDt) % 14.0;
        const prevY = r.currentY;
        const topY = r.towerH - 2.2;
        if (r.phaseTime < 6.5) {
          r.currentY = THREE.MathUtils.lerp(2.4, topY, r.phaseTime / 6.5);
        } else if (r.phaseTime < 8.6) {
          r.currentY = topY;
        } else if (r.phaseTime < 10.4) {
          const dropT = (r.phaseTime - 8.6) / 1.8;
          r.currentY = Math.max(2.4, topY - 0.5 * 22 * dropT * dropT);
        } else {
          r.currentY = THREE.MathUtils.lerp(r.currentY, 2.4, Math.min(1, stepDt * 5));
        }
        r.velY = (r.currentY - prevY) / Math.max(0.008, stepDt);
        r.carriage.position.y = r.currentY;
      } else if (r.kind === "carousel" && r.rotor) {
        r.angle += stepDt * 0.55;
        r.rotor.rotation.y = r.angle;
        for (const m of r.mounts) {
          m.mesh.position.y = 1.55 + Math.sin(this._time * 2.6 + m.phase) * 0.36;
        }
      }
    }
  }

  dispose() {
    this._clear();
    this.scene.remove(this.group);
  }
}
