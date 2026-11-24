import * as THREE from "three";
import { createToonMaterial, addToonOutline, getCarnivalStripeTexture } from "./ToonMaterials.js";

export const INTERACTIVE_SCENERY = {
  fairy_castle: { label: "위클리 동화 성 구경하기", action: "castle" },
  cafe_icecream: { label: "딸기 아이스크림 사먹기", action: "icecream" },
  popcorn_cart: { label: "카라멜 팝콘 사먹기", action: "popcorn" },
  balloon_stall: { label: "파스텔 풍선 장착/해제", action: "balloon" },
  firework_launcher: { label: "불꽃 폭죽 즉시 발사!", action: "firework" },
  fountain: { label: "분수대에 소원 빌기", action: "fountain" },
  heart_photozone: { label: "하트 포토존 기념촬영", action: "photo" },
  mascot_statue: { label: "클로드 동상 인사하기", action: "statue" },
  kiosk: { label: "파크 스낵 구매하기", action: "snack" },
};

/**
 * WeeklyLand Flat Rides (7 Animated POV Rides) & Rich Cartoon Scenery/Buildings Engine (20+ Props)
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
    this.interactiveSpots = [];
    this.pickables = [];
    this.nightLights = [];
    this.billboardCanvases = [];
    this.dropTowerGaugeMat = null;
    this._time = 0;
  }

  syncAll(ridesList, sceneryList) {
    this._clear();
    for (const r of ridesList || []) this._buildRide(r);
    for (const s of sceneryList || []) this._buildScenery(s);
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
    this.interactiveSpots = [];
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
    this.group.add(root);

    let runtime = { def, root, kind: def.type };
    if (def.type === "ferris_wheel") runtime = { ...runtime, ...this._createFerrisWheel(root) };
    else if (def.type === "drop_tower") runtime = { ...runtime, ...this._createDropTower(root) };
    else if (def.type === "carousel") runtime = { ...runtime, ...this._createCarousel(root) };
    else if (def.type === "pirate_ship") runtime = { ...runtime, ...this._createPirateShip(root) };
    else if (def.type === "teacups") runtime = { ...runtime, ...this._createTeacups(root) };
    else if (def.type === "swing_tower") runtime = { ...runtime, ...this._createSwingTower(root) };
    else if (def.type === "sky_tower") runtime = { ...runtime, ...this._createSkyTower(root) };
    else if (def.type === "gyro_swing") runtime = { ...runtime, ...this._createGyroSwing(root) };
    else if (def.type === "enterprise_wheel") runtime = { ...runtime, ...this._createEnterprise(root) };
    else if (def.type === "octopus_ride") runtime = { ...runtime, ...this._createOctopusRide(root) };
    else if (def.type === "bumper_cars") runtime = { ...runtime, ...this._createBumperCars(root) };
    else if (def.type === "rocket_spinner") runtime = { ...runtime, ...this._createRocketSpinner(root) };

    root.traverse((obj) => {
      if (obj.isMesh && !obj.userData.isToonOutline) {
        obj.userData = { pickKind: "ride", id: def.id, rideType: def.type, name: def.name };
        this.pickables.push(obj);
      }
    });

    this.interactiveSpots.push({
      kind: "ride",
      id: def.id,
      label: `${def.name} 탑승`,
      pos: root.position.clone(),
      radius: 10.5,
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

    const base = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.8, 0.7, 18), createToonMaterial(0xffe8c2));
    base.position.y = 0.35;
    base.receiveShadow = true;
    addToonOutline(base, 1.025);
    root.add(base);

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

    const wheel = new THREE.Group();
    wheel.position.set(0, hubY, 0);
    root.add(wheel);

    for (const zOff of [-1.25, 1.25]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.22, 10, 32), rimMat);
      rim.position.z = zOff;
      rim.castShadow = true;
      wheel.add(rim);

      const ledRing = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.45, 0.08, 8, 32), glowMat);
      ledRing.position.z = zOff * 1.05;
      wheel.add(ledRing);
    }

    const spokeGeo = new THREE.CylinderGeometry(0.08, 0.08, radius * 2, 6);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(spokeGeo, legMat);
      spoke.rotation.z = (i / 6) * Math.PI;
      wheel.add(spoke);
    }

    const hubDisc = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 2.9, 16), createToonMaterial(0xffd166));
    hubDisc.rotation.x = Math.PI * 0.5;
    addToonOutline(hubDisc, 1.05);
    wheel.add(hubDisc);

    const gondolas = [];
    const colors = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7, 0xf9a8d4, 0xc4b5fd];
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const gPivot = new THREE.Group();
      gPivot.position.set(Math.cos(ang) * radius, Math.sin(ang) * radius, 0);

      const cabin = new THREE.Mesh(new THREE.SphereGeometry(1.08, 12, 10), createToonMaterial(colors[i % colors.length]));
      cabin.scale.set(0.95, 1.05, 1.15);
      cabin.position.y = -1.05;
      cabin.castShadow = true;
      addToonOutline(cabin, 1.06);
      gPivot.add(cabin);

      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(1.08, 1.08, 0.48, 12),
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
    const towerH = 32;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.4, 0.8, 14), createToonMaterial(0x475569));
    base.position.y = 0.4;
    base.receiveShadow = true;
    root.add(base);

    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.5, towerH, 12),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#334155", "#60c5f1", 12) })
    );
    spire.position.y = towerH * 0.5 + 0.5;
    spire.castShadow = true;
    root.add(spire);

    const gaugeMat = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 0.75 });
    this.nightLights.push(gaugeMat);
    this.dropTowerGaugeMat = gaugeMat;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.18, towerH - 2, 0.18), gaugeMat);
      strip.position.set(Math.cos(a) * 1.45, towerH * 0.5 + 0.5, Math.sin(a) * 1.45);
      root.add(strip);
    }

    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(2.1, 0), createToonMaterial(0xffd166));
    crown.position.y = towerH + 2.2;
    addToonOutline(crown, 1.06);
    root.add(crown);

    const carriage = new THREE.Group();
    carriage.position.y = 2.4;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.48, 10, 20), createToonMaterial(0xff7657));
    ring.rotation.x = Math.PI * 0.5;
    ring.castShadow = true;
    addToonOutline(ring, 1.06);
    carriage.add(ring);
    root.add(carriage);

    return { carriage, towerH, phaseTime: 0, currentY: 2.4, velY: 0 };
  }

  _createCarousel(root) {
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.2, 0.7, 24), createToonMaterial(0xfff7eb));
    deck.position.y = 0.35;
    deck.receiveShadow = true;
    root.add(deck);

    const rotor = new THREE.Group();
    rotor.position.y = 0.7;
    root.add(rotor);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 5.4, 16), createToonMaterial(0xffd166));
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

    const starTop = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.85, 0),
      createToonMaterial(0xffd166, { emissive: 0xf59e0b, emissiveIntensity: 0.35 })
    );
    starTop.position.y = 8.1;
    addToonOutline(starTop, 1.08);
    rotor.add(starTop);

    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.55 });
    this.nightLights.push(bulbMat);
    const bulbRing = new THREE.Mesh(new THREE.TorusGeometry(7.05, 0.14, 8, 28), bulbMat);
    bulbRing.rotation.x = Math.PI * 0.5;
    bulbRing.position.y = 4.9;
    rotor.add(bulbRing);

    const mounts = [];
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 4.8, 6);
    const poleMat = createToonMaterial(0xffd166);
    const mountColors = [0xfff7eb, 0xff8274, 0x60c5f1, 0x6ee7b7];

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const mx = Math.cos(a) * 4.9;
      const mz = Math.sin(a) * 4.9;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(mx, 2.5, mz);
      rotor.add(pole);

      const horse = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 1.45), createToonMaterial(mountColors[i % mountColors.length]));
      horse.position.set(mx, 1.55, mz);
      horse.rotation.y = -a;
      horse.castShadow = true;
      addToonOutline(horse, 1.06);
      rotor.add(horse);
      mounts.push({ mesh: horse, phase: i * 0.8 });
    }
    return { rotor, mounts, angle: 0 };
  }

  _createPirateShip(root) {
    const legMat = createToonMaterial(0xfff7eb);
    const base = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.6, 7.2), createToonMaterial(0xffe8c2));
    base.position.y = 0.3;
    base.receiveShadow = true;
    root.add(base);

    const legGeo = new THREE.CylinderGeometry(0.28, 0.36, 12.2, 8);
    for (const sz of [-2.4, 2.4]) {
      for (const tilt of [-0.28, 0.28]) {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(tilt * 10, 6.2, sz);
        leg.rotation.z = tilt;
        leg.castShadow = true;
        root.add(leg);
      }
    }

    const pivot = new THREE.Group();
    pivot.position.set(0, 11.4, 0);
    root.add(pivot);

    for (const sz of [-1.4, 1.4]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 8.6, 8), createToonMaterial(0xffd166));
      arm.position.set(0, -4.3, sz);
      pivot.add(arm);
    }

    const hull = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.9, 3.0), createToonMaterial(0xd97757));
    hull.position.y = -8.6;
    hull.castShadow = true;
    addToonOutline(hull, 1.045);
    pivot.add(hull);

    // Prow & stern curved figureheads
    for (const sx of [-4.6, 4.6]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(1.4, 2.6, 6), createToonMaterial(0xffd166));
      tip.position.set(sx, -7.8, 0);
      tip.rotation.z = sx > 0 ? -0.55 : 0.55;
      addToonOutline(tip, 1.06);
      pivot.add(tip);
    }

    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 3.4),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#fff7eb", 6), side: THREE.DoubleSide })
    );
    sail.position.set(0, -5.6, 0);
    pivot.add(sail);

    return { pivot, swingPhase: 0 };
  }

  _createTeacups(root) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.2, 0.65, 24), createToonMaterial(0xffe8c2));
    base.position.y = 0.325;
    base.receiveShadow = true;
    addToonOutline(base, 1.025);
    root.add(base);

    const platter = new THREE.Group();
    platter.position.y = 0.7;
    root.add(platter);

    // Giant center teapot!
    const pot = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 12), createToonMaterial(0xffd166));
    pot.position.y = 1.6;
    pot.castShadow = true;
    addToonOutline(pot, 1.05);
    platter.add(pot);

    const cups = [];
    const cupColors = [0xff8274, 0x60c5f1, 0xf9a8d4, 0x6ee7b7];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const cupGroup = new THREE.Group();
      cupGroup.position.set(Math.cos(a) * 4.2, 0, Math.sin(a) * 4.2);

      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.05, 1.25, 14), createToonMaterial(cupColors[i]));
      bowl.position.y = 0.65;
      bowl.castShadow = true;
      addToonOutline(bowl, 1.055);
      cupGroup.add(bowl);

      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.14, 6, 12), createToonMaterial(0xfff7eb));
      handle.position.set(1.45, 0.75, 0);
      cupGroup.add(handle);

      platter.add(cupGroup);
      cups.push(cupGroup);
    }
    return { platter, cups, angle: 0 };
  }

  _createSwingTower(root) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 6.0, 0.7, 16), createToonMaterial(0xffe8c2));
    base.position.y = 0.35;
    base.receiveShadow = true;
    root.add(base);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(1.0, 1.35, 17, 12),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#60c5f1", "#fff7eb", 10) })
    );
    mast.position.y = 8.9;
    mast.castShadow = true;
    root.add(mast);

    const crown = new THREE.Group();
    crown.position.y = 16.5;
    root.add(crown);

    const umbrella = new THREE.Mesh(
      new THREE.ConeGeometry(5.6, 2.2, 16),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#ffd166", 12) })
    );
    umbrella.position.y = 1.1;
    addToonOutline(umbrella, 1.04);
    crown.add(umbrella);

    const chairs = [];
    const colors = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const armPivot = new THREE.Group();
      armPivot.position.set(Math.cos(a) * 4.6, 0, Math.sin(a) * 4.6);
      armPivot.rotation.y = -a;

      const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.4, 5), createToonMaterial(0xfff7eb));
      chain.position.y = -2.7;
      armPivot.add(chain);

      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), createToonMaterial(colors[i % colors.length]));
      seat.position.y = -5.5;
      addToonOutline(seat, 1.08);
      armPivot.add(seat);

      crown.add(armPivot);
      chairs.push(armPivot);
    }
    return { crown, chairs, angle: 0 };
  }

  _createSkyTower(root) {
    const towerH = 38;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 0.8, 16), createToonMaterial(0xffe8c2));
    base.position.y = 0.4;
    root.add(base);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, towerH, 14), createToonMaterial(0xfff7eb));
    shaft.position.y = towerH * 0.5 + 0.5;
    shaft.castShadow = true;
    addToonOutline(shaft, 1.04);
    root.add(shaft);

    const cabin = new THREE.Group();
    cabin.position.y = 4;
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.3, 2.2, 18), createToonMaterial(0x60c5f1));
    pod.castShadow = true;
    addToonOutline(pod, 1.04);
    cabin.add(pod);

    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(3.68, 3.68, 0.95, 18),
      new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.78 })
    );
    cabin.add(glass);
    root.add(cabin);

    return { cabin, towerH, phase: 0 };
  }

  _createGyroSwing(root) {
    const legMat = createToonMaterial(0xfff7eb);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 8.8, 0.7, 18), createToonMaterial(0xffe8c2));
    base.position.y = 0.35;
    root.add(base);

    const legGeo = new THREE.CylinderGeometry(0.38, 0.48, 17.5, 8);
    for (const [sx, sz, rz, rx] of [
      [-4.2, -3.2, -0.22, 0.18], [4.2, -3.2, 0.22, 0.18],
      [-4.2, 3.2, -0.22, -0.18], [4.2, 3.2, 0.22, -0.18],
    ]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(sx, 8.6, sz);
      leg.rotation.set(rx, 0, rz);
      leg.castShadow = true;
      root.add(leg);
    }

    const pivot = new THREE.Group();
    pivot.position.set(0, 16.5, 0);
    root.add(pivot);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 13.0, 10), createToonMaterial(0xff7657));
    arm.position.y = -6.5;
    addToonOutline(arm, 1.05);
    pivot.add(arm);

    const disc = new THREE.Group();
    disc.position.y = -13.0;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.8, 0.65, 10, 22), createToonMaterial(0x60c5f1));
    ring.rotation.x = Math.PI * 0.5;
    addToonOutline(ring, 1.045);
    disc.add(ring);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 0.8, 16), createToonMaterial(0xffd166));
    disc.add(hub);
    pivot.add(disc);

    return { pivot, disc, swingPhase: 0, spin: 0 };
  }

  _createEnterprise(root) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 8.2, 0.7, 20), createToonMaterial(0xffe8c2));
    base.position.y = 0.35;
    root.add(base);

    const tiltPivot = new THREE.Group();
    tiltPivot.position.set(0, 6.2, 0);
    root.add(tiltPivot);

    const wheel = new THREE.Group();
    tiltPivot.add(wheel);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(7.2, 0.28, 10, 28), createToonMaterial(0xf472b6));
    rim.rotation.x = Math.PI * 0.5;
    addToonOutline(rim, 1.04);
    wheel.add(rim);

    const gondolas = [];
    const cols = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7, 0xc4b5fd];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const pod = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.7), createToonMaterial(cols[i % cols.length]));
      pod.position.set(Math.cos(a) * 7.2, 0, Math.sin(a) * 7.2);
      pod.rotation.y = -a;
      addToonOutline(pod, 1.06);
      wheel.add(pod);
      gondolas.push(pod);
    }
    return { tiltPivot, wheel, gondolas, phase: 0 };
  }

  _createOctopusRide(root) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 8.0, 0.7, 20), createToonMaterial(0xbae6fd));
    base.position.y = 0.35;
    root.add(base);

    const rotor = new THREE.Group();
    rotor.position.y = 1.0;
    root.add(rotor);

    // Cute Cartoon Octopus Center Head with Eyes!
    const head = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 14), createToonMaterial(0xa855f7));
    head.position.y = 2.6;
    head.scale.set(1.05, 0.95, 1.05);
    addToonOutline(head, 1.05);
    rotor.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1e1b4b });
    for (const sx of [-0.75, 0.75]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), eyeMat);
      eye.position.set(sx, 2.8, 2.05);
      rotor.add(eye);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), pupilMat);
      pup.position.set(sx, 2.8, 2.38);
      rotor.add(pup);
    }

    const arms = [];
    const carCols = [0xff8274, 0xffd166, 0x60c5f1, 0x6ee7b7, 0xf9a8d4, 0xfb923c];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const armPivot = new THREE.Group();
      armPivot.position.set(Math.cos(a) * 1.4, 1.8, Math.sin(a) * 1.4);
      armPivot.rotation.y = -a;

      const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 5.2, 8), createToonMaterial(0xc084fc));
      tentacle.rotation.z = -Math.PI * 0.5;
      tentacle.position.x = 2.6;
      addToonOutline(tentacle, 1.06);
      armPivot.add(tentacle);

      const car = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), createToonMaterial(carCols[i]));
      car.scale.set(1.0, 0.65, 1.0);
      car.position.set(5.4, 0.1, 0);
      addToonOutline(car, 1.06);
      armPivot.add(car);

      rotor.add(armPivot);
      arms.push({ pivot: armPivot, car, phase: i * 1.05 });
    }
    return { rotor, arms, angle: 0 };
  }

  _createBumperCars(root) {
    const floor = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.55, 10.5), createToonMaterial(0x334155));
    floor.position.y = 0.275;
    floor.receiveShadow = true;
    root.add(floor);

    const roofMat = createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#60c5f1", "#fff7eb", 12) });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.7, 11.2), roofMat);
    roof.position.y = 5.2;
    addToonOutline(roof, 1.025);
    root.add(roof);

    for (const [px, pz] of [[-6.8, -4.8], [6.8, -4.8], [-6.8, 4.8], [6.8, 4.8]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.0, 8), createToonMaterial(0xffd166));
      col.position.set(px, 2.6, pz);
      root.add(col);
    }

    const cars = [];
    const cols = [0xff7657, 0x38bdf8, 0xffd166, 0x34d399, 0xf472b6, 0xa78bfa];
    for (let i = 0; i < 6; i++) {
      const cGroup = new THREE.Group();
      const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.24, 8, 16), createToonMaterial(0x1e293b));
      bumper.rotation.x = Math.PI * 0.5;
      bumper.position.y = 0.35;
      cGroup.add(bumper);

      const shell = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.65, 1.55), createToonMaterial(cols[i]));
      shell.position.y = 0.62;
      addToonOutline(shell, 1.06);
      cGroup.add(shell);

      const x = -4.2 + (i % 3) * 4.2;
      const z = i < 3 ? -2.2 : 2.2;
      cGroup.position.set(x, 0.55, z);
      root.add(cGroup);
      cars.push({
        mesh: cGroup,
        x,
        z,
        vx: (i % 2 === 0 ? 1 : -1) * (3.2 + (i % 3) * 0.6),
        vz: (i < 3 ? 1 : -1) * (2.6 + (i % 2) * 0.8),
      });
    }
    return { cars };
  }

  _createRocketSpinner(root) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.8, 0.7, 20), createToonMaterial(0x1e293b));
    base.position.y = 0.35;
    root.add(base);

    const center = new THREE.Group();
    center.position.y = 1.0;
    root.add(center);

    // Glowing ringed planet center!
    const planet = new THREE.Mesh(new THREE.SphereGeometry(2.1, 16, 14), createToonMaterial(0x38bdf8));
    planet.position.y = 5.4;
    addToonOutline(planet, 1.045);
    center.add(planet);

    const saturnRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.28, 8, 28), createToonMaterial(0xffd166));
    saturnRing.rotation.set(Math.PI * 0.42, 0.2, 0.2);
    saturnRing.position.y = 5.4;
    center.add(saturnRing);

    const rockets = [];
    const cols = [0xff7657, 0xffd166, 0x6ee7b7, 0xf472b6, 0x60c5f1, 0xc4b5fd];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rPivot = new THREE.Group();
      rPivot.position.y = 4.6;
      rPivot.rotation.y = a;

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6.2, 6), createToonMaterial(0xfff7eb));
      arm.rotation.z = Math.PI * 0.5;
      arm.position.x = 3.1;
      rPivot.add(arm);

      const rocket = new THREE.Group();
      rocket.position.set(6.2, 0, 0);
      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.35, 6, 10), createToonMaterial(cols[i]));
      hull.rotation.x = Math.PI * 0.5;
      addToonOutline(hull, 1.06);
      rocket.add(hull);
      rPivot.add(rocket);

      center.add(rPivot);
      rockets.push({ pivot: rPivot, rocket, phase: i * 1.04 });
    }
    return { center, rockets, angle: 0 };
  }

  _buildScenery(def) {
    const root = new THREE.Group();
    const gy = this._groundY(def.x, def.z);
    root.position.set(def.x, gy, def.z);
    root.rotation.y = def.rotY || 0;
    root.scale.setScalar(def.scale || 1);
    this.group.add(root);

    const builders = {
      grand_arch: () => this._buildGrandArch(root),
      garland_arch: () => this._buildGarlandArch(root),
      fairy_castle: () => this._buildFairyCastle(root),
      fountain: () => this._buildFountain(root),
      ai_billboard: () => this._buildAIBillboard(root),
      cafe_icecream: () => this._buildIceCreamCafe(root),
      popcorn_cart: () => this._buildPopcornCart(root),
      balloon_stall: () => this._buildBalloonStall(root),
      firework_launcher: () => this._buildFireworkLauncher(root),
      heart_photozone: () => this._buildHeartPhotozone(root),
      mascot_statue: () => this._buildMascotStatue(root),
      flower_bed: () => this._buildFlowerBed(root),
      bench: () => this._buildBench(root),
      wood_bridge: () => this._buildWoodBridge(root),
      tree_oak: () => this._buildTree(root, "tree_oak"),
      tree_sakura: () => this._buildTree(root, "tree_sakura"),
      tree_pine: () => this._buildTree(root, "tree_pine"),
      tree_palm: () => this._buildPalmTree(root),
      lamp_post: () => this._buildLampPost(root),
      kiosk: () => this._buildKiosk(root),
    };
    (builders[def.type] || builders.kiosk)();

    const interact = INTERACTIVE_SCENERY[def.type] || null;
    root.traverse((obj) => {
      if (obj.isMesh && !obj.userData.isToonOutline) {
        obj.userData = {
          pickKind: "scenery",
          id: def.id,
          sceneryType: def.type,
          interactiveAction: interact?.action || null,
          interactiveLabel: interact?.label || null,
        };
        this.pickables.push(obj);
      }
    });

    if (interact) {
      this.interactiveSpots.push({
        kind: "scenery",
        id: def.id,
        action: interact.action,
        label: interact.label,
        pos: root.position.clone(),
        radius: def.type === "fairy_castle" ? 14 : 6.5,
      });
    }
    this.sceneryObjects.set(def.id, root);
  }

  _buildFairyCastle(root) {
    const wall = createToonMaterial(0xfff5f8);
    const roof = createToonMaterial(0x60a5fa);
    const pinkRoof = createToonMaterial(0xf472b6);
    const gold = createToonMaterial(0xffd166);

    const keep = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 9), wall);
    keep.position.y = 4;
    keep.castShadow = true;
    addToonOutline(keep, 1.025);
    root.add(keep);

    // Grand central spire
    const midTower = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 12, 12), wall);
    midTower.position.y = 12;
    midTower.castShadow = true;
    addToonOutline(midTower, 1.03);
    root.add(midTower);

    const midSpire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 7.5, 12), pinkRoof);
    midSpire.position.y = 21.5;
    midSpire.castShadow = true;
    addToonOutline(midSpire, 1.035);
    root.add(midSpire);

    const star = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), gold);
    star.position.y = 26;
    addToonOutline(star, 1.08);
    root.add(star);

    // 4 Corner turrets
    for (const [tx, tz] of [[-5.6, -4.0], [5.6, -4.0], [-5.6, 4.0], [5.6, 4.0]]) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 11, 10), wall);
      t.position.set(tx, 5.5, tz);
      t.castShadow = true;
      addToonOutline(t, 1.04);
      root.add(t);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(2.1, 4.6, 10), roof);
      cone.position.set(tx, 13.3, tz);
      addToonOutline(cone, 1.045);
      root.add(cone);
    }

    // Castle arch gate
    const gate = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.2, 0.5), createToonMaterial(0x4a3552));
    gate.position.set(0, 2.1, 4.4);
    root.add(gate);
  }

  _buildGarlandArch(root) {
    const poleMat = createToonMaterial(0xfff7eb);
    for (const px of [-4.6, 4.6]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 6.2, 8), poleMat);
      pole.position.set(px, 3.1, 0);
      addToonOutline(pole, 1.07);
      root.add(pole);
    }
    const flagColors = [0xff7657, 0xffd166, 0x60c5f1, 0xf9a8d4, 0x6ee7b7];
    for (let i = 0; i < 9; i++) {
      const t = i / 8;
      const fx = THREE.MathUtils.lerp(-4.2, 4.2, t);
      const fy = 5.8 - Math.sin(t * Math.PI) * 1.1;
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 3), createToonMaterial(flagColors[i % flagColors.length]));
      flag.position.set(fx, fy, 0);
      flag.rotation.z = Math.PI;
      addToonOutline(flag, 1.08);
      root.add(flag);
    }
  }

  _buildIceCreamCafe(root) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.0, 3.4), createToonMaterial(0xfff5f8));
    body.position.y = 1.5;
    body.castShadow = true;
    addToonOutline(body, 1.04);
    root.add(body);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(4.9, 0.7, 3.9),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#f472b6", "#fff7eb", 10) })
    );
    roof.position.y = 3.3;
    addToonOutline(roof, 1.04);
    root.add(roof);

    // Giant pastel ice-cream cone on roof
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.65, 1.5, 10), createToonMaterial(0xeab676));
    cone.position.y = 4.35;
    cone.rotation.x = Math.PI;
    root.add(cone);
    const scoop1 = new THREE.Mesh(new THREE.SphereGeometry(0.72, 12, 10), createToonMaterial(0xffb3d9));
    scoop1.position.y = 5.3;
    addToonOutline(scoop1, 1.06);
    root.add(scoop1);
    const scoop2 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), createToonMaterial(0x99f6e4));
    scoop2.position.y = 6.1;
    addToonOutline(scoop2, 1.07);
    root.add(scoop2);
  }

  _buildPopcornCart(root) {
    const cart = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.5), createToonMaterial(0xff7657));
    cart.position.y = 1.0;
    addToonOutline(cart, 1.06);
    root.add(cart);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.2, 1.3),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3, transparent: true, opacity: 0.85 })
    );
    glass.position.y = 2.3;
    root.add(glass);

    const top = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 0.8, 4),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ef4444", "#fff7eb", 8) })
    );
    top.position.y = 3.3;
    top.rotation.y = Math.PI * 0.25;
    addToonOutline(top, 1.06);
    root.add(top);
  }

  _buildBalloonStall(root) {
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.4, 12), createToonMaterial(0x60c5f1));
    stand.position.y = 0.7;
    addToonOutline(stand, 1.06);
    root.add(stand);

    const colors = [0xff8274, 0xffd166, 0x6ee7b7, 0xf9a8d4, 0xc4b5fd, 0x60c5f1];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), createToonMaterial(colors[i]));
      b.scale.set(0.92, 1.12, 0.92);
      b.position.set(Math.cos(a) * 0.9, 3.1 + (i % 2) * 0.55, Math.sin(a) * 0.9);
      addToonOutline(b, 1.07);
      root.add(b);
    }
  }

  _buildFireworkLauncher(root) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 0.45, 12), createToonMaterial(0x334155));
    pad.position.y = 0.22;
    root.add(pad);

    const tubeMat = createToonMaterial(0xff7657);
    for (const [tx, tz] of [[-0.6, 0], [0.6, 0], [0, 0.6]]) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 1.8, 10), tubeMat);
      tube.position.set(tx, 1.2, tz);
      addToonOutline(tube, 1.07);
      root.add(tube);
    }
    const star = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      createToonMaterial(0xfde047, { emissive: 0xf59e0b, emissiveIntensity: 0.7 })
    );
    star.position.y = 2.6;
    this.nightLights.push(star.material);
    root.add(star);
  }

  _buildHeartPhotozone(root) {
    const mat = createToonMaterial(0xf472b6);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.36, 10, 24, Math.PI), mat);
    arch.position.y = 2.2;
    addToonOutline(arch, 1.06);
    root.add(arch);

    for (const sx of [-2.6, 2.6]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 2.4, 10), mat);
      col.position.set(sx, 1.2, 0);
      addToonOutline(col, 1.07);
      root.add(col);
    }
    const base = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.35, 2.0), createToonMaterial(0xfff5f8));
    base.position.y = 0.175;
    root.add(base);
  }

  _buildMascotStatue(root) {
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 1.2, 12), createToonMaterial(0xffe8c2));
    plinth.position.y = 0.6;
    addToonOutline(plinth, 1.04);
    root.add(plinth);

    // Cute Claude mascot voxel statue!
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 1.4), createToonMaterial(0xe07a52));
    body.position.y = 2.4;
    addToonOutline(body, 1.05);
    root.add(body);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x241a2e });
    for (const sx of [-0.45, 0.45]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 0.1), eyeMat);
      eye.position.set(sx, 2.45, 0.72);
      root.add(eye);
    }
  }

  _buildFlowerBed(root) {
    const rim = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.45, 2.4), createToonMaterial(0xffe8c2));
    rim.position.y = 0.22;
    root.add(rim);

    const soil = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.48, 2.0), createToonMaterial(0x52c77c));
    soil.position.y = 0.25;
    root.add(soil);

    const colors = [0xff7657, 0xffd166, 0xf9a8d4, 0x60c5f1, 0xc4b5fd];
    for (let i = 0; i < 10; i++) {
      const fx = -1.5 + (i % 5) * 0.75;
      const fz = i < 5 ? -0.45 : 0.45;
      const blossom = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), createToonMaterial(colors[i % colors.length]));
      blossom.position.set(fx, 0.75, fz);
      root.add(blossom);
    }
  }

  _buildBench(root) {
    const wood = createToonMaterial(0xd99b66);
    const leg = createToonMaterial(0x475569);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 0.8), wood);
    seat.position.y = 0.65;
    addToonOutline(seat, 1.06);
    root.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.65, 0.16), wood);
    back.position.set(0, 1.05, -0.34);
    addToonOutline(back, 1.06);
    root.add(back);
    for (const sx of [-1.05, 1.05]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.65, 0.7), leg);
      l.position.set(sx, 0.32, 0);
      root.add(l);
    }
  }

  _buildWoodBridge(root) {
    const wood = createToonMaterial(0xc98a55);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.35, 9.5), wood);
    deck.position.y = 0.8;
    addToonOutline(deck, 1.03);
    root.add(deck);
    for (const sx of [-1.95, 1.95]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 9.5), createToonMaterial(0x8d5b3c));
      rail.position.set(sx, 1.4, 0);
      root.add(rail);
    }
  }

  _buildPalmTree(root) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.44, 5.2, 8), createToonMaterial(0xb07c4f));
    trunk.position.y = 2.6;
    trunk.rotation.z = 0.12;
    addToonOutline(trunk, 1.06);
    root.add(trunk);

    const leafMat = createToonMaterial(0x4ade80);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.16, 2.6), leafMat);
      frond.position.set(Math.cos(a) * 1.15 - 0.3, 5.1, Math.sin(a) * 1.15);
      frond.rotation.y = -a + Math.PI * 0.5;
      frond.rotation.x = 0.35;
      addToonOutline(frond, 1.06);
      root.add(frond);
    }
  }

  _buildGrandArch(root) {
    const stoneMat = createToonMaterial(0xfff7eb);
    const brassMat = createToonMaterial(0xffd166);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.6 });
    this.nightLights.push(lightMat);

    for (const px of [-5.4, 5.4]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.6, 1.6), stoneMat);
      pillar.position.set(px, 3.8, 0);
      pillar.castShadow = true;
      addToonOutline(pillar, 1.04);
      root.add(pillar);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.8, 4), brassMat);
      cap.position.set(px, 8.5, 0);
      cap.rotation.y = Math.PI * 0.25;
      addToonOutline(cap, 1.06);
      root.add(cap);
    }

    const arch = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.52, 10, 24, Math.PI), brassMat);
    arch.position.set(0, 6.2, 0);
    arch.castShadow = true;
    root.add(arch);

    const signTex = this._makeTextCanvas("WEEKLYLAND · 위클리랜드", "3D CARTOON THEME PARK", "#1a1714", "#fcf9f3", "#ff7657");
    const sign = new THREE.Mesh(new THREE.BoxGeometry(8.0, 1.5, 0.38), stoneMat);
    sign.position.set(0, 7.2, 0.35);
    root.add(sign);

    const face = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 1.3), new THREE.MeshBasicMaterial({ map: signTex }));
    face.position.set(0, 7.2, 0.56);
    root.add(face);
    const faceBack = face.clone();
    faceBack.rotation.y = Math.PI;
    faceBack.position.z = 0.14;
    root.add(faceBack);
  }

  _buildFountain(root) {
    const stone = createToonMaterial(0xfff7eb);
    const water = new THREE.MeshStandardMaterial({ color: 0x67e8f9, roughness: 0.15, transparent: true, opacity: 0.88 });
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.1, 0.8, 22), stone);
    basin.position.y = 0.4;
    addToonOutline(basin, 1.03);
    root.add(basin);

    const pool = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.15, 22), water);
    pool.position.y = 0.78;
    root.add(pool);

    const tier = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.75, 2.4, 14), stone);
    tier.position.y = 1.6;
    root.add(tier);

    const jet = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xe0f7ff, emissive: 0x38bdf8, emissiveIntensity: 0.55 })
    );
    jet.position.y = 3.15;
    this.nightLights.push(jet.material);
    root.add(jet);
  }

  _buildAIBillboard(root) {
    const frameMat = createToonMaterial(0x334155);
    for (const px of [-4.5, 4.5]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 7.5, 10), frameMat);
      leg.position.set(px, 3.75, 0);
      leg.castShadow = true;
      root.add(leg);
    }

    const board = new THREE.Mesh(new THREE.BoxGeometry(11.6, 5.2, 0.55), frameMat);
    board.position.set(0, 7.8, 0);
    addToonOutline(board, 1.025);
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

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(10.9, 4.6), new THREE.MeshBasicMaterial({ map: tex }));
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
    grad.addColorStop(1, "#1a2947");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#ff7657";
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "600 22px monospace";
    ctx.fillText(info.ticker || "WEEKLYLAND LIVE", 36, 62);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "700 34px sans-serif";
    ctx.fillText(String(info.headline || "").slice(0, 34), 36, 148);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "500 22px sans-serif";
    ctx.fillText(String(info.sub || "").slice(0, 52), 36, 212);
    ctx.fillStyle = "#ffd166";
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
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.42, 2.4, 8), createToonMaterial(0x8d5b3c));
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
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      puff.position.set(px, py, pz);
      puff.castShadow = true;
      addToonOutline(puff, 1.055);
      root.add(puff);
    }
  }

  _buildLampPost(root) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4.2, 8), createToonMaterial(0x334155));
    pole.position.y = 2.1;
    root.add(pole);

    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xfbbf24, emissiveIntensity: 0.4 });
    this.nightLights.push(bulbMat);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 10), bulbMat);
    lantern.position.y = 4.35;
    root.add(lantern);
  }

  _buildKiosk(root) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.5, 2.4), createToonMaterial(0xfff7eb));
    body.position.y = 1.25;
    body.castShadow = true;
    addToonOutline(body, 1.045);
    root.add(body);

    const awning = new THREE.Mesh(
      new THREE.ConeGeometry(2.75, 1.35, 4),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#fff7eb", 8) })
    );
    awning.position.y = 3.15;
    awning.rotation.y = Math.PI * 0.25;
    addToonOutline(awning, 1.045);
    root.add(awning);
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

  findNearestInteractable(worldPos) {
    let best = null;
    let bestDist = Infinity;
    for (const spot of this.interactiveSpots) {
      const d = Math.hypot(worldPos.x - spot.pos.x, worldPos.z - spot.pos.z);
      if (d <= spot.radius && d < bestDist) {
        bestDist = d;
        best = spot;
      }
    }
    return best;
  }

  getRidePosition(rideId) {
    return this.rides.get(rideId)?.root?.position?.clone() || new THREE.Vector3(0, 0, 0);
  }

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
      return { position: pos, tangent: forward, up, speedKmh: 9, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.0, latG: 0, segment: "PANORAMA", coasterName: r.def.name };
    }
    if (r.kind === "drop_tower" && r.carriage) {
      r.carriage.getWorldPosition(pos);
      pos.z += 2.35;
      pos.y += 0.45;
      forward.set(-pos.x, -6, -pos.z).normalize();
      const speedKmh = Math.round(Math.abs(r.velY || 0) * 3.6);
      return { position: pos, tangent: forward, up, speedKmh, altitudeM: Number(pos.y.toFixed(1)), vertG: r.velY < -3 ? 0.1 : 1.1, latG: 0, segment: r.velY < -3 ? "FREEFALL" : "TOWER", coasterName: r.def.name };
    }
    if (r.kind === "carousel" && r.mounts?.[0]) {
      r.mounts[0].mesh.getWorldPosition(pos);
      pos.y += 0.85;
      const a = r.angle + Math.PI * 0.5;
      forward.set(Math.cos(a), 0, -Math.sin(a)).normalize();
      return { position: pos, tangent: forward, up, speedKmh: 16, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.1, latG: 0.3, segment: "CAROUSEL", coasterName: r.def.name };
    }
    if (r.kind === "pirate_ship" && r.pivot) {
      const swing = Math.sin(r.swingPhase) * 1.05;
      pos.set(Math.sin(swing) * 8.4, 11.4 - Math.cos(swing) * 8.4 + 0.9, 0);
      r.root.localToWorld(pos);
      forward.set(Math.cos(swing), Math.sin(swing) * 0.6, 0).normalize();
      const spd = Math.round(Math.abs(Math.cos(r.swingPhase)) * 58);
      return { position: pos, tangent: forward, up, speedKmh: spd, altitudeM: Number(pos.y.toFixed(1)), vertG: Number((1 + Math.abs(Math.cos(r.swingPhase)) * 1.6).toFixed(1)), latG: 0.2, segment: "SWING", coasterName: r.def.name };
    }
    if (r.kind === "teacups" && r.cups?.[0]) {
      r.cups[0].getWorldPosition(pos);
      pos.y += 1.25;
      const a = r.angle * 3.2;
      forward.set(Math.cos(a), 0, Math.sin(a)).normalize();
      return { position: pos, tangent: forward, up, speedKmh: 24, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.0, latG: 1.4, segment: "SPIN", coasterName: r.def.name };
    }
    if (r.kind === "swing_tower" && r.chairs?.[0]) {
      r.chairs[0].children[1].getWorldPosition(pos);
      pos.y += 0.6;
      const a = r.angle + Math.PI * 0.5;
      forward.set(Math.cos(a), -0.15, -Math.sin(a)).normalize();
      return { position: pos, tangent: forward, up, speedKmh: 38, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.3, latG: 0.9, segment: "FLYING", coasterName: r.def.name };
    }
    if (r.kind === "sky_tower" && r.cabin) {
      r.cabin.getWorldPosition(pos);
      pos.z += 3.1;
      const a = r.phase * 0.5;
      forward.set(Math.cos(a), -0.25, Math.sin(a)).normalize();
      return { position: pos, tangent: forward, up, speedKmh: 8, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.0, latG: 0, segment: "SKY VIEW", coasterName: r.def.name };
    }
    if (r.kind === "gyro_swing" && r.disc) {
      r.disc.getWorldPosition(pos);
      pos.y += 1.0;
      const swing = Math.sin(r.swingPhase) * 1.15;
      forward.set(Math.cos(r.spin), Math.sin(swing) * 0.4, Math.sin(r.spin)).normalize();
      const spd = Math.round(Math.abs(Math.cos(r.swingPhase)) * 78);
      return { position: pos, tangent: forward, up, speedKmh: spd, altitudeM: Number(pos.y.toFixed(1)), vertG: Number((1 + Math.abs(Math.cos(r.swingPhase)) * 2.1).toFixed(1)), latG: 0.6, segment: "GYRO SWING", coasterName: r.def.name };
    }
    if (r.kind === "enterprise_wheel" && r.gondolas?.[0]) {
      r.gondolas[0].getWorldPosition(pos);
      pos.y += 0.6;
      const a = r.phase * 2.2;
      forward.set(-Math.sin(a), 0.25, Math.cos(a)).normalize();
      return { position: pos, tangent: forward, up, speedKmh: 52, altitudeM: Number(pos.y.toFixed(1)), vertG: 2.3, latG: 0.4, segment: "360 LOOP", coasterName: r.def.name };
    }
    if (r.kind === "octopus_ride" && r.arms?.[0]) {
      r.arms[0].car.getWorldPosition(pos);
      pos.y += 0.9;
      const a = r.angle + Math.PI * 0.5;
      forward.set(Math.cos(a), 0, -Math.sin(a)).normalize();
      return { position: pos, tangent: forward, up, speedKmh: 34, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.4, latG: 0.8, segment: "OCTOPUS", coasterName: r.def.name };
    }
    if (r.kind === "bumper_cars" && r.cars?.[0]) {
      r.cars[0].mesh.getWorldPosition(pos);
      pos.y += 1.05;
      const c = r.cars[0];
      forward.set(c.vx, 0, c.vz).normalize();
      return { position: pos, tangent: forward, up, speedKmh: 22, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.0, latG: 0.9, segment: "BUMPER", coasterName: r.def.name };
    }
    if (r.kind === "rocket_spinner" && r.rockets?.[0]) {
      r.rockets[0].rocket.getWorldPosition(pos);
      pos.y += 0.85;
      const a = r.angle + Math.PI * 0.5;
      forward.set(Math.cos(a), 0.1, -Math.sin(a)).normalize();
      return { position: pos, tangent: forward, up, speedKmh: 44, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.6, latG: 0.7, segment: "ORBIT", coasterName: r.def.name };
    }
    return null;
  }

  update(dt, isNight) {
    const stepDt = Math.min(dt, 0.05);
    this._time += stepDt;

    for (const mat of this.nightLights) {
      mat.emissiveIntensity = isNight ? 1.65 : 0.3;
    }

    for (const r of this.rides.values()) {
      if (r.kind === "ferris_wheel" && r.wheel) {
        r.angle += stepDt * 0.24;
        r.wheel.rotation.z = r.angle;
        for (const g of r.gondolas) g.rotation.z = -r.angle;
      } else if (r.kind === "drop_tower" && r.carriage) {
        r.phaseTime = (r.phaseTime + stepDt) % 14.0;
        const prevY = r.currentY;
        const topY = r.towerH - 2.2;
        if (r.phaseTime < 6.5) r.currentY = THREE.MathUtils.lerp(2.4, topY, r.phaseTime / 6.5);
        else if (r.phaseTime < 8.6) r.currentY = topY;
        else if (r.phaseTime < 10.4) {
          const dropT = (r.phaseTime - 8.6) / 1.8;
          r.currentY = Math.max(2.4, topY - 0.5 * 24 * dropT * dropT);
        } else r.currentY = THREE.MathUtils.lerp(r.currentY, 2.4, Math.min(1, stepDt * 5));
        r.velY = (r.currentY - prevY) / Math.max(0.008, stepDt);
        r.carriage.position.y = r.currentY;
      } else if (r.kind === "carousel" && r.rotor) {
        r.angle += stepDt * 0.55;
        r.rotor.rotation.y = r.angle;
        for (const m of r.mounts) m.mesh.position.y = 1.55 + Math.sin(this._time * 2.6 + m.phase) * 0.36;
      } else if (r.kind === "pirate_ship" && r.pivot) {
        r.swingPhase += stepDt * 1.45;
        r.pivot.rotation.z = Math.sin(r.swingPhase) * 1.05;
      } else if (r.kind === "teacups" && r.platter) {
        r.angle += stepDt * 0.85;
        r.platter.rotation.y = r.angle;
        r.cups.forEach((cup, idx) => { cup.rotation.y = -r.angle * (2.2 + idx * 0.3); });
      } else if (r.kind === "swing_tower" && r.crown) {
        r.angle += stepDt * 1.35;
        r.crown.rotation.y = r.angle;
        const lift = 11.5 + Math.sin(this._time * 0.45) * 4.5;
        r.crown.position.y = lift;
        const flare = 0.25 + ((lift - 7) / 9) * 0.42;
        for (const ch of r.chairs) ch.rotation.z = flare;
      } else if (r.kind === "sky_tower" && r.cabin) {
        r.phase += stepDt * 0.35;
        r.cabin.position.y = 4 + (Math.sin(r.phase - Math.PI * 0.5) * 0.5 + 0.5) * (r.towerH - 7);
        r.cabin.rotation.y += stepDt * 0.35;
      } else if (r.kind === "gyro_swing" && r.pivot) {
        r.swingPhase += stepDt * 1.35;
        r.spin += stepDt * 2.1;
        r.pivot.rotation.z = Math.sin(r.swingPhase) * 1.15;
        r.disc.rotation.y = r.spin;
      } else if (r.kind === "enterprise_wheel" && r.wheel) {
        r.phase += stepDt;
        r.wheel.rotation.y += stepDt * 2.4;
        r.tiltPivot.rotation.z = (Math.sin(r.phase * 0.35) * 0.5 + 0.5) * 1.32;
      } else if (r.kind === "octopus_ride" && r.rotor) {
        r.angle += stepDt * 0.95;
        r.rotor.rotation.y = r.angle;
        for (const a of r.arms) {
          a.pivot.rotation.z = Math.sin(this._time * 2.2 + a.phase) * 0.36;
          a.car.rotation.y += stepDt * 1.8;
        }
      } else if (r.kind === "bumper_cars" && r.cars) {
        for (const c of r.cars) {
          c.x += c.vx * stepDt;
          c.z += c.vz * stepDt;
          if (c.x > 5.8 || c.x < -5.8) { c.vx *= -1; c.x = THREE.MathUtils.clamp(c.x, -5.8, 5.8); }
          if (c.z > 3.8 || c.z < -3.8) { c.vz *= -1; c.z = THREE.MathUtils.clamp(c.z, -3.8, 3.8); }
          c.mesh.position.set(c.x, 0.55, c.z);
          c.mesh.rotation.y = Math.atan2(c.vx, c.vz);
        }
      } else if (r.kind === "rocket_spinner" && r.center) {
        r.angle += stepDt * 1.35;
        r.center.rotation.y = r.angle;
        for (const rk of r.rockets) {
          rk.pivot.rotation.z = Math.sin(this._time * 2.0 + rk.phase) * 0.32;
        }
      }
    }
  }

  dispose() {
    this._clear();
    this.scene.remove(this.group);
  }
}
