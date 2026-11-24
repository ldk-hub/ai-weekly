import * as THREE from "three";
import { createToonMaterial, addToonOutline, getCarnivalStripeTexture, safeDisposeObjectTree } from "./ToonMaterials.js";
import {
  EXTENDED_INTERACTIVE_SCENERY,
  buildExtendedRide,
  updateExtendedRide,
  getExtendedRideSeatState,
  buildExtendedScenery,
} from "./ExtendedRidesPack.js";

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
  ...EXTENDED_INTERACTIVE_SCENERY,
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
    this._frameTick = 0;
    this._lastIsNight = null;
  }

  syncAll(ridesList, sceneryList) {
    this._clear();
    for (const r of ridesList || []) this._buildRide(r);
    for (const s of sceneryList || []) this._buildScenery(s);
    this._lastIsNight = null;
  }

  _clear() {
    while (this.group.children.length > 0) {
      const ch = this.group.children.pop();
      safeDisposeObjectTree(ch);
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
    else {
      const ext = buildExtendedRide(this, def.type, root);
      if (ext) runtime = { ...runtime, ...ext, isExtended: true };
    }

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

  /**
   * Deep-anchored (-3.8m) foundation plinth + top deck + safety perimeter fence & entry gate.
   * Guarantees zero floating even on steep terrain hills.
   */
  _addGroundedFoundation(root, radius, deckColor = 0xffe8c2, { rect = null, fence = true } = {}) {
    const concreteMat = createToonMaterial(0xd5cbb8);
    const deckMat = createToonMaterial(deckColor);
    const postMat = createToonMaterial(0xfff7eb);
    const railMat = createToonMaterial(0xff7657);

    if (rect) {
      const [w, d] = rect;
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 4.0, d + 0.6), concreteMat);
      skirt.position.y = -1.65;
      skirt.receiveShadow = true;
      root.add(skirt);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, d), deckMat);
      deck.position.y = 0.55;
      deck.receiveShadow = true;
      addToonOutline(deck, 1.015);
      root.add(deck);

      if (fence) {
        const halfW = w * 0.48;
        const halfD = d * 0.48;
        for (const sx of [-halfW, halfW]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, d * 0.94), railMat);
          bar.position.set(sx, 1.45, 0);
          root.add(bar);
          for (let iz = -2; iz <= 2; iz++) {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.95, 6), postMat);
            p.position.set(sx, 1.15, (iz / 2) * halfD * 0.92);
            root.add(p);
          }
        }
        const backBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.12, 0.12), railMat);
        backBar.position.set(0, 1.45, -halfD);
        root.add(backBar);
      }
      return;
    }

    // Circular underground anchor foundation + raised deck
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.2, radius + 0.65, 4.0, 22), concreteMat);
    skirt.position.y = -1.65;
    skirt.receiveShadow = true;
    root.add(skirt);

    const deck = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 0.2, 0.55, 24), deckMat);
    deck.position.y = 0.52;
    deck.receiveShadow = true;
    addToonOutline(deck, 1.018);
    root.add(deck);

    // Entry steps on +Z side
    const step = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 1.4), concreteMat);
    step.position.set(0, 0.25, radius + 0.45);
    root.add(step);

    if (fence) {
      const fRadius = radius - 0.25;
      const postCount = 16;
      const postGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.95, 6);
      for (let i = 0; i < postCount; i++) {
        const a = (i / postCount) * Math.PI * 2;
        // Leave front entry gap around +Z (a ~ PI/2)
        if (Math.abs(a - Math.PI * 0.5) < 0.28) continue;
        const p = new THREE.Mesh(postGeo, postMat);
        p.position.set(Math.cos(a) * fRadius, 1.2, Math.sin(a) * fRadius);
        root.add(p);
      }
      const railRing = new THREE.Mesh(new THREE.TorusGeometry(fRadius, 0.075, 6, 32, Math.PI * 1.78), railMat);
      railRing.rotation.x = Math.PI * 0.5;
      railRing.rotation.z = Math.PI * 0.61;
      railRing.position.y = 1.52;
      root.add(railRing);
    }
  }

  /** Helper: build a rigid cylinder strut connecting exact 3D points A and B. */
  _addStrut(parent, pA, pB, rTop, rBot, mat) {
    const dir = new THREE.Vector3().subVectors(pB, pA);
    const len = dir.length();
    if (len < 0.01) return null;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 8), mat);
    mesh.position.addVectors(pA, pB).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  _createFerrisWheel(root) {
    const radius = 10.6;
    const hubY = 13.0;
    const legMat = createToonMaterial(0xfff7eb);
    const rimMat = createToonMaterial(0xff7657);
    const darkMat = createToonMaterial(0x334155);
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x38bdf8, emissiveIntensity: 0.45 });
    this.nightLights.push(glowMat);

    this._addGroundedFoundation(root, 8.6, 0xffe8c2, { fence: true });

    // Precision A-frame legs connecting deck footings directly to main steel axle hubs!
    for (const sideZ of [-2.4, 2.4]) {
      const topHub = new THREE.Vector3(0, hubY, sideZ);
      this._addStrut(root, new THREE.Vector3(-4.6, 0.7, sideZ), topHub, 0.30, 0.42, legMat);
      this._addStrut(root, new THREE.Vector3(4.6, 0.7, sideZ), topHub, 0.30, 0.42, legMat);
      // Horizontal mid-crossbar bracing the A-frame
      this._addStrut(root, new THREE.Vector3(-2.7, 5.8, sideZ), new THREE.Vector3(2.7, 5.8, sideZ), 0.16, 0.16, rimMat);
      // Bearing pillow block at hub
      const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.7, 12), darkMat);
      bearing.rotation.x = Math.PI * 0.5;
      bearing.position.copy(topHub);
      root.add(bearing);
    }

    // Solid steel central axle shaft bridging front and rear A-frames
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 5.4, 12), darkMat);
    axle.rotation.x = Math.PI * 0.5;
    axle.position.set(0, hubY, 0);
    root.add(axle);

    // Boarding platform deck under lowest gondola
    const platform = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.65, 3.6), createToonMaterial(0xd99b66));
    platform.position.set(0, 1.05, 0);
    root.add(platform);

    const wheel = new THREE.Group();
    wheel.position.set(0, hubY, 0);
    root.add(wheel);

    for (const zOff of [-1.25, 1.25]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.24, 10, 36), rimMat);
      rim.position.z = zOff;
      rim.castShadow = true;
      wheel.add(rim);

      const innerRim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.62, 0.12, 8, 28), legMat);
      innerRim.position.z = zOff;
      wheel.add(innerRim);

      const ledRing = new THREE.Mesh(new THREE.TorusGeometry(radius - 0.42, 0.08, 8, 36), glowMat);
      ledRing.position.z = zOff * 1.05;
      wheel.add(ledRing);
    }

    // 12 radial spokes + crossbars holding each gondola
    const colors = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7, 0xf9a8d4, 0xc4b5fd];
    const gondolas = [];
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const gx = Math.cos(ang) * radius;
      const gy = Math.sin(ang) * radius;
      for (const zOff of [-1.25, 1.25]) {
        this._addStrut(wheel, new THREE.Vector3(0, 0, zOff), new THREE.Vector3(gx, gy, zOff), 0.08, 0.08, legMat);
      }
      // Gondola horizontal pivot bar between rims
      this._addStrut(wheel, new THREE.Vector3(gx, gy, -1.25), new THREE.Vector3(gx, gy, 1.25), 0.09, 0.09, darkMat);

      const gPivot = new THREE.Group();
      gPivot.position.set(gx, gy, 0);

      // Hanger rod + roof + panoramic glass cabin + colored tub
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.7, 6), darkMat);
      hanger.position.y = -0.35;
      gPivot.add(hanger);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.18, 0.48, 8), createToonMaterial(colors[i % colors.length]));
      roof.position.y = -0.68;
      gPivot.add(roof);

      const glass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.96, 0.96, 0.72, 10),
        new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.75 })
      );
      glass.position.y = -1.2;
      gPivot.add(glass);

      const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 0.88, 0.75, 10), createToonMaterial(colors[i % colors.length]));
      tub.position.y = -1.82;
      tub.castShadow = true;
      addToonOutline(tub, 1.055);
      gPivot.add(tub);

      wheel.add(gPivot);
      gondolas.push(gPivot);
    }

    const hubDisc = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 3.0, 16), createToonMaterial(0xffd166));
    hubDisc.rotation.x = Math.PI * 0.5;
    addToonOutline(hubDisc, 1.045);
    wheel.add(hubDisc);

    return { wheel, gondolas, angle: 0 };
  }

  _createDropTower(root) {
    const towerH = 33;
    const steelMat = createToonMaterial(0x334155);
    const accentMat = createToonMaterial(0x60c5f1);
    const darkMat = createToonMaterial(0x1e293b);

    this._addGroundedFoundation(root, 6.2, 0xdbeafe, { fence: true });

    // Central core + 4 outer truss corner columns + diagonal lattice rings
    const core = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.4, towerH, 12),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#334155", "#60c5f1", 12) })
    );
    core.position.y = towerH * 0.5 + 0.7;
    core.castShadow = true;
    root.add(core);

    const gaugeMat = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x34d399, emissiveIntensity: 0.75 });
    this.nightLights.push(gaugeMat);
    this.dropTowerGaugeMat = gaugeMat;

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI * 0.25;
      const cx = Math.cos(a) * 1.65;
      const cz = Math.sin(a) * 1.65;
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, towerH, 6), steelMat);
      rail.position.set(cx, towerH * 0.5 + 0.7, cz);
      root.add(rail);

      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.16, towerH - 2, 0.16), gaugeMat);
      strip.position.set(Math.cos(a - Math.PI * 0.25) * 1.45, towerH * 0.5 + 0.7, Math.sin(a - Math.PI * 0.25) * 1.45);
      root.add(strip);
    }

    // Horizontal truss collars every 6m
    for (let y = 4; y < towerH; y += 6) {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.12, 6, 16), accentMat);
      collar.rotation.x = Math.PI * 0.5;
      collar.position.y = y;
      root.add(collar);
    }

    // Top cable hoist winch house + golden beacon crown
    const winchHouse = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.1, 2.2, 12), darkMat);
    winchHouse.position.y = towerH + 1.4;
    addToonOutline(winchHouse, 1.03);
    root.add(winchHouse);

    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(1.8, 0), createToonMaterial(0xffd166));
    crown.position.y = towerH + 4.0;
    addToonOutline(crown, 1.06);
    root.add(crown);

    // 12-seat ring gondola with seats & shoulder restraints
    const carriage = new THREE.Group();
    carriage.position.y = 2.6;
    const chassis = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.42, 10, 24), createToonMaterial(0xff7657));
    chassis.rotation.x = Math.PI * 0.5;
    addToonOutline(chassis, 1.04);
    carriage.add(chassis);

    const seatMat = createToonMaterial(0x1e293b);
    const barMat = createToonMaterial(0xffd166);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const sx = Math.cos(a) * 3.05;
      const sz = Math.sin(a) * 3.05;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.45), seatMat);
      seat.position.set(sx, 0.35, sz);
      seat.rotation.y = -a + Math.PI * 0.5;
      carriage.add(seat);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.52), barMat);
      bar.position.set(Math.cos(a) * 3.25, 0.55, Math.sin(a) * 3.25);
      bar.rotation.y = -a + Math.PI * 0.5;
      carriage.add(bar);
    }
    root.add(carriage);

    return { carriage, towerH, phaseTime: 0, currentY: 2.6, velY: 0 };
  }

  _createCarousel(root) {
    this._addGroundedFoundation(root, 7.6, 0xfff7eb, { fence: true });

    const rotor = new THREE.Group();
    rotor.position.y = 0.8;
    root.add(rotor);

    const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 6.7, 0.25, 24), createToonMaterial(0xffe8c2));
    floor.position.y = 0.12;
    rotor.add(floor);

    const column = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 5.2, 16), createToonMaterial(0xffd166));
    column.position.y = 2.7;
    column.castShadow = true;
    addToonOutline(column, 1.03);
    rotor.add(column);

    // Scalloped decorative cornice drum + striped carnival cone roof
    const frieze = new THREE.Mesh(new THREE.CylinderGeometry(7.05, 7.05, 0.72, 24), createToonMaterial(0xffd166));
    frieze.position.y = 5.1;
    addToonOutline(frieze, 1.02);
    rotor.add(frieze);

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(7.4, 3.1, 24),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#fff7eb", 16) })
    );
    canopy.position.y = 6.95;
    canopy.castShadow = true;
    addToonOutline(canopy, 1.025);
    rotor.add(canopy);

    const starTop = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.88, 0),
      createToonMaterial(0xffd166, { emissive: 0xf59e0b, emissiveIntensity: 0.35 })
    );
    starTop.position.y = 8.95;
    addToonOutline(starTop, 1.08);
    rotor.add(starTop);

    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfbbf24, emissiveIntensity: 0.55 });
    this.nightLights.push(bulbMat);
    const bulbRing = new THREE.Mesh(new THREE.TorusGeometry(7.15, 0.14, 8, 28), bulbMat);
    bulbRing.rotation.x = Math.PI * 0.5;
    bulbRing.position.y = 4.78;
    rotor.add(bulbRing);

    const mounts = [];
    const poleGeo = new THREE.CylinderGeometry(0.065, 0.065, 4.9, 6);
    const poleMat = createToonMaterial(0xffd166);
    const mountColors = [0xfff7eb, 0xff8274, 0x60c5f1, 0xf9a8d4];
    const saddleMat = createToonMaterial(0xc85a32);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const mx = Math.cos(a) * 4.9;
      const mz = Math.sin(a) * 4.9;
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(mx, 2.55, mz);
      rotor.add(pole);

      // Sculpted cute cartoon carousel horse (body + neck + head + ears + saddle + legs)
      const horse = new THREE.Group();
      horse.position.set(mx, 1.55, mz);
      horse.rotation.y = -a;
      const hMat = createToonMaterial(mountColors[i % mountColors.length]);

      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.85, 6, 8), hMat);
      torso.rotation.x = Math.PI * 0.5;
      addToonOutline(torso, 1.07);
      horse.add(torso);

      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.45), saddleMat);
      saddle.position.y = 0.28;
      horse.add(saddle);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.65, 8), hMat);
      neck.position.set(0, 0.46, 0.52);
      neck.rotation.x = 0.35;
      horse.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.30, 0.52), hMat);
      head.position.set(0, 0.72, 0.74);
      head.rotation.x = 0.22;
      addToonOutline(head, 1.08);
      horse.add(head);

      rotor.add(horse);
      mounts.push({ mesh: horse, phase: i * 0.8 });
    }
    return { rotor, mounts, angle: 0 };
  }

  _createPirateShip(root) {
    const legMat = createToonMaterial(0xfff7eb);
    const darkMat = createToonMaterial(0x334155);
    const woodMat = createToonMaterial(0xc86d42);
    const trimMat = createToonMaterial(0xffd166);

    this._addGroundedFoundation(root, 0, 0xffe8c2, { rect: [13.2, 8.2], fence: true });

    // Tire drive motor box directly under ship keel
    const driveBox = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 2.2), darkMat);
    driveBox.position.set(0, 1.35, 0);
    root.add(driveBox);

    // Front & rear A-frame steel towers meeting accurately at top pivot crossbeam
    const pivotY = 12.2;
    for (const sz of [-2.8, 2.8]) {
      const apex = new THREE.Vector3(0, pivotY, sz);
      this._addStrut(root, new THREE.Vector3(-4.6, 0.75, sz), apex, 0.30, 0.42, legMat);
      this._addStrut(root, new THREE.Vector3(4.6, 0.75, sz), apex, 0.30, 0.42, legMat);
      this._addStrut(root, new THREE.Vector3(-2.8, 5.4, sz), new THREE.Vector3(2.8, 5.4, sz), 0.16, 0.16, trimMat);
    }

    // Main horizontal swing shaft joining the two A-frames
    const crossBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 6.4, 12), darkMat);
    crossBeam.rotation.x = Math.PI * 0.5;
    crossBeam.position.set(0, pivotY, 0);
    root.add(crossBeam);

    const pivot = new THREE.Group();
    pivot.position.set(0, pivotY, 0);
    root.add(pivot);

    // Heavy steel swing arms down to boat deck
    for (const sz of [-1.45, 1.45]) {
      this._addStrut(pivot, new THREE.Vector3(0, 0, sz), new THREE.Vector3(-1.4, -8.5, sz), 0.16, 0.18, trimMat);
      this._addStrut(pivot, new THREE.Vector3(0, 0, sz), new THREE.Vector3(1.4, -8.5, sz), 0.16, 0.18, trimMat);
    }

    // Layered Viking/Pirate boat hull + raised stern/prow decks + 5 seating rows + figureheads
    const keel = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.35, 2.8), woodMat);
    keel.position.y = -9.15;
    keel.castShadow = true;
    addToonOutline(keel, 1.035);
    pivot.add(keel);

    const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.95, 3.1), createToonMaterial(0xe07a52));
    upperDeck.position.y = -8.35;
    addToonOutline(upperDeck, 1.035);
    pivot.add(upperDeck);

    // 5 Passenger bench rows inside boat
    for (let r = -2; r <= 2; r++) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 2.4), darkMat);
      bench.position.set(r * 1.55, -7.7, 0);
      pivot.add(bench);
    }

    for (const sx of [-5.2, 5.2]) {
      const deckRise = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.45, 2.9), woodMat);
      deckRise.position.set(sx, -7.8, 0);
      deckRise.rotation.z = sx > 0 ? 0.25 : -0.25;
      addToonOutline(deckRise, 1.05);
      pivot.add(deckRise);

      const dragonTip = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.2, 6), trimMat);
      dragonTip.position.set(sx * 1.18, -6.7, 0);
      dragonTip.rotation.z = sx > 0 ? -0.45 : 0.45;
      addToonOutline(dragonTip, 1.06);
      pivot.add(dragonTip);
    }

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6.2, 8), woodMat);
    mast.position.set(0, -5.8, 0);
    pivot.add(mast);

    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.4),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#fff7eb", 6), side: THREE.DoubleSide })
    );
    sail.position.set(0, -5.2, 0.16);
    pivot.add(sail);

    return { pivot, swingPhase: 0 };
  }

  _createTeacups(root) {
    this._addGroundedFoundation(root, 7.6, 0xffe8c2, { fence: true });

    const platter = new THREE.Group();
    platter.position.y = 0.85;
    root.add(platter);

    const floor = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 6.9, 0.24, 24), createToonMaterial(0xfef3c7));
    floor.position.y = 0.12;
    platter.add(floor);

    // Center ornate teapot (body + lid + knob + spout + handle)
    const potMat = createToonMaterial(0xffd166);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(1.65, 16, 14), potMat);
    pot.position.y = 1.7;
    pot.castShadow = true;
    addToonOutline(pot, 1.045);
    platter.add(pot);

    const lid = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 12), createToonMaterial(0xff7657));
    lid.position.y = 3.35;
    platter.add(lid);

    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 1.6, 8), potMat);
    spout.position.set(1.55, 2.05, 0);
    spout.rotation.z = -0.65;
    platter.add(spout);

    const potHandle = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.2, 8, 14), potMat);
    potHandle.position.set(-1.55, 1.85, 0);
    platter.add(potHandle);

    const cups = [];
    const cupColors = [0xff8274, 0x60c5f1, 0xf9a8d4, 0x6ee7b7];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const cupGroup = new THREE.Group();
      cupGroup.position.set(Math.cos(a) * 4.3, 0.24, Math.sin(a) * 4.3);

      // Porcelain saucer under each teacup
      const saucer = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.65, 0.18, 16), createToonMaterial(0xfff7eb));
      saucer.position.y = 0.1;
      cupGroup.add(saucer);

      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.05, 1.25, 16), createToonMaterial(cupColors[i]));
      bowl.position.y = 0.78;
      bowl.castShadow = true;
      addToonOutline(bowl, 1.05);
      cupGroup.add(bowl);

      // Inner dark seat cushion + central spin steering wheel
      const innerSeat = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.16, 14), createToonMaterial(0x3f334d));
      innerSeat.position.y = 1.35;
      cupGroup.add(innerSeat);

      const wheelPost = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.65, 8), createToonMaterial(0xffd166));
      wheelPost.position.y = 1.6;
      cupGroup.add(wheelPost);

      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.08, 6, 14), createToonMaterial(0xffd166));
      wheel.rotation.x = Math.PI * 0.5;
      wheel.position.y = 1.92;
      cupGroup.add(wheel);

      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.15, 6, 12), createToonMaterial(0xfff7eb));
      handle.position.set(1.48, 0.86, 0);
      cupGroup.add(handle);

      platter.add(cupGroup);
      cups.push(cupGroup);
    }
    return { platter, cups, angle: 0 };
  }

  _createSwingTower(root) {
    this._addGroundedFoundation(root, 6.8, 0xffe8c2, { fence: true });

    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.7, 2.2, 16), createToonMaterial(0xff7657));
    pedestal.position.y = 1.8;
    addToonOutline(pedestal, 1.03);
    root.add(pedestal);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.45, 17.5, 14),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#60c5f1", "#fff7eb", 10) })
    );
    mast.position.y = 9.5;
    mast.castShadow = true;
    addToonOutline(mast, 1.025);
    root.add(mast);

    const crown = new THREE.Group();
    crown.position.y = 16.5;
    root.add(crown);

    // Sliding hydraulic sleeve collar gripping the mast
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 2.2, 16), createToonMaterial(0xffd166));
    sleeve.position.y = -0.6;
    addToonOutline(sleeve, 1.04);
    crown.add(sleeve);

    const umbrella = new THREE.Mesh(
      new THREE.ConeGeometry(5.8, 2.4, 18),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#ffd166", 14) })
    );
    umbrella.position.y = 1.25;
    addToonOutline(umbrella, 1.035);
    crown.add(umbrella);

    const chairs = [];
    const colors = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7];
    const chainMat = createToonMaterial(0xfff7eb);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const armPivot = new THREE.Group();
      armPivot.position.set(Math.cos(a) * 4.8, 0.1, Math.sin(a) * 4.8);
      armPivot.rotation.y = -a;

      // Twin suspension chains
      for (const cz of [-0.36, 0.36]) {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 5.4, 5), chainMat);
        chain.position.set(0, -2.7, cz);
        armPivot.add(chain);
      }

      // Chair seat + backrest
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.22, 0.92), createToonMaterial(colors[i % colors.length]));
      seat.position.y = -5.5;
      addToonOutline(seat, 1.07);
      armPivot.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.85, 0.88), createToonMaterial(colors[i % colors.length]));
      back.position.set(-0.38, -5.05, 0);
      armPivot.add(back);

      crown.add(armPivot);
      chairs.push({ pivot: armPivot, seat });
    }
    return { crown, chairs, angle: 0 };
  }

  _createSkyTower(root) {
    const towerH = 38;
    this._addGroundedFoundation(root, 6.2, 0xe0f2fe, { fence: true });

    const collarBase = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.0, 2.4, 16), createToonMaterial(0x60c5f1));
    collarBase.position.y = 1.8;
    addToonOutline(collarBase, 1.03);
    root.add(collarBase);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.4, towerH, 14), createToonMaterial(0xfff7eb));
    shaft.position.y = towerH * 0.5 + 0.8;
    shaft.castShadow = true;
    addToonOutline(shaft, 1.03);
    root.add(shaft);

    // 3 vertical elevator guide rails
    const railMat = createToonMaterial(0x334155);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, towerH, 0.18), railMat);
      rail.position.set(Math.cos(a) * 1.42, towerH * 0.5 + 0.8, Math.sin(a) * 1.42);
      root.add(rail);
    }

    // Top spire dome & antenna
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(2.1, 14, 10), createToonMaterial(0xffd166));
    topCap.position.y = towerH + 1.4;
    addToonOutline(topCap, 1.04);
    root.add(topCap);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 6.5, 8), railMat);
    antenna.position.y = towerH + 5.5;
    root.add(antenna);

    const cabin = new THREE.Group();
    cabin.position.y = 4.5;
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.4, 2.3, 18), createToonMaterial(0x60c5f1));
    pod.castShadow = true;
    addToonOutline(pod, 1.035);
    cabin.add(pod);

    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(3.88, 3.88, 1.05, 18),
      new THREE.MeshBasicMaterial({ color: 0xe0f7ff, transparent: true, opacity: 0.78 })
    );
    cabin.add(glass);
    root.add(cabin);

    return { cabin, towerH, phase: 0 };
  }

  _createGyroSwing(root) {
    const legMat = createToonMaterial(0xfff7eb);
    const darkMat = createToonMaterial(0x334155);
    const accentMat = createToonMaterial(0xff7657);

    this._addGroundedFoundation(root, 9.2, 0xffe8c2, { fence: true });

    // 4 heavy steel A-frame legs meeting cleanly at top central motor gearbox!
    const apexY = 17.0;
    const apex = new THREE.Vector3(0, apexY, 0);
    const footCoords = [[-5.8, -4.6], [5.8, -4.6], [-5.8, 4.6], [5.8, 4.6]];
    for (const [fx, fz] of footCoords) {
      this._addStrut(root, new THREE.Vector3(fx, 0.75, fz), apex, 0.36, 0.52, legMat);
      const footPad = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 0.65, 10), darkMat);
      footPad.position.set(fx, 0.95, fz);
      root.add(footPad);
    }
    // Cross-bracing rings between legs
    this._addStrut(root, new THREE.Vector3(-3.4, 7.2, -2.7), new THREE.Vector3(3.4, 7.2, -2.7), 0.18, 0.18, accentMat);
    this._addStrut(root, new THREE.Vector3(-3.4, 7.2, 2.7), new THREE.Vector3(3.4, 7.2, 2.7), 0.18, 0.18, accentMat);

    // Top motor gearbox housing
    const motorBox = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 2.6, 14), darkMat);
    motorBox.rotation.x = Math.PI * 0.5;
    motorBox.position.copy(apex);
    addToonOutline(motorBox, 1.04);
    root.add(motorBox);

    const pivot = new THREE.Group();
    pivot.position.copy(apex);
    root.add(pivot);

    // Counterweight cap on top of pendulum
    const counter = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 10), createToonMaterial(0xffd166));
    counter.position.y = 2.4;
    addToonOutline(counter, 1.05);
    pivot.add(counter);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.40, 15.6, 10), accentMat);
    arm.position.y = -5.4;
    addToonOutline(arm, 1.045);
    pivot.add(arm);

    const disc = new THREE.Group();
    disc.position.y = -13.2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.62, 10, 24), createToonMaterial(0x60c5f1));
    ring.rotation.x = Math.PI * 0.5;
    addToonOutline(ring, 1.04);
    disc.add(ring);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.0, 1.1, 16), createToonMaterial(0xffd166));
    disc.add(hub);

    // 12 outward-facing thrill seats with yellow shoulder restraints
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.95, 0.52), darkMat);
      seat.position.set(Math.cos(a) * 4.45, 0.25, Math.sin(a) * 4.45);
      seat.rotation.y = -a + Math.PI * 0.5;
      disc.add(seat);
    }
    pivot.add(disc);

    return { pivot, disc, swingPhase: 0, spin: 0 };
  }

  _createEnterprise(root) {
    const darkMat = createToonMaterial(0x334155);
    const steelMat = createToonMaterial(0xfff7eb);
    const accentMat = createToonMaterial(0xf472b6);

    this._addGroundedFoundation(root, 8.6, 0xffe8c2, { fence: true });

    // Heavy stationary hydraulic machinery pedestal on ground (Zero Floating!)
    const machineHouse = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.5, 3.6), darkMat);
    machineHouse.position.set(-2.8, 1.95, 0);
    addToonOutline(machineHouse, 1.03);
    root.add(machineHouse);

    // Ground hydraulic ram anchor base directly under the lifting boom
    const ramAnchor = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.6), darkMat);
    ramAnchor.position.set(1.4, 1.2, 0);
    root.add(ramAnchor);

    // Tilting hydraulic lift boom anchored directly to machineHouse hinge!
    const liftArmPivot = new THREE.Group();
    liftArmPivot.position.set(-2.8, 3.25, 0);
    root.add(liftArmPivot);

    // Heavy steel lift boom arm connecting hinge -> wheel center hub
    const boomLen = 6.8;
    const boom = new THREE.Mesh(new THREE.BoxGeometry(boomLen, 0.85, 1.15), steelMat);
    boom.position.set(boomLen * 0.5, 0.35, 0);
    addToonOutline(boom, 1.04);
    liftArmPivot.add(boom);

    // Articulated hydraulic ram (outer cylinder + shiny piston rod) connecting ground anchor -> boom underside
    const pistonOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.34, 1.0, 10), createToonMaterial(0xffd166));
    root.add(pistonOuter);
    const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.0, 10), createToonMaterial(0xe2e8f0));
    root.add(pistonRod);

    // Wheel assembly mounted firmly on the end of the lift boom!
    const wheelMount = new THREE.Group();
    wheelMount.position.set(boomLen, 0.95, 0);
    liftArmPivot.add(wheelMount);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 1.1, 16), createToonMaterial(0xffd166));
    addToonOutline(hub, 1.045);
    wheelMount.add(hub);

    const wheel = new THREE.Group();
    wheelMount.add(wheel);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.28, 10, 32), accentMat);
    rim.rotation.x = Math.PI * 0.5;
    addToonOutline(rim, 1.035);
    wheel.add(rim);

    const gondolas = [];
    const cols = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7, 0xc4b5fd];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const gx = Math.cos(a) * 6.8;
      const gz = Math.sin(a) * 6.8;
      this._addStrut(wheel, new THREE.Vector3(0, 0, 0), new THREE.Vector3(gx, 0, gz), 0.11, 0.11, steelMat);

      const pod = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 1.75), createToonMaterial(cols[i % cols.length]));
      pod.position.set(gx, 0.1, gz);
      pod.rotation.y = -a;
      addToonOutline(pod, 1.055);
      wheel.add(pod);
      gondolas.push(pod);
    }
    return { liftArmPivot, pistonOuter, pistonRod, wheel, gondolas, phase: 0 };
  }

  _createOctopusRide(root) {
    this._addGroundedFoundation(root, 8.2, 0xbae6fd, { fence: true });

    // Solid central turntable housing
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.6, 1.6, 16), createToonMaterial(0x7e22ce));
    housing.position.y = 1.5;
    addToonOutline(housing, 1.03);
    root.add(housing);

    const rotor = new THREE.Group();
    rotor.position.y = 2.2;
    root.add(rotor);

    // Cute Cartoon Octopus Center Head with Eyes & Crown!
    const head = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 14), createToonMaterial(0xa855f7));
    head.position.y = 2.1;
    head.scale.set(1.05, 0.95, 1.05);
    addToonOutline(head, 1.045);
    rotor.add(head);

    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.1, 6), createToonMaterial(0xffd166));
    crown.position.y = 4.4;
    addToonOutline(crown, 1.07);
    rotor.add(crown);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1e1b4b });
    for (const sx of [-0.75, 0.75]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 10), eyeMat);
      eye.position.set(sx, 2.3, 2.05);
      rotor.add(eye);
      const pup = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), pupilMat);
      pup.position.set(sx, 2.3, 2.38);
      rotor.add(pup);
    }

    const arms = [];
    const carCols = [0xff8274, 0xffd166, 0x60c5f1, 0x6ee7b7, 0xf9a8d4, 0xfb923c];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const armPivot = new THREE.Group();
      armPivot.position.set(Math.cos(a) * 1.4, 1.1, Math.sin(a) * 1.4);
      armPivot.rotation.y = -a;

      const tentacle = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 5.4, 8), createToonMaterial(0xc084fc));
      tentacle.rotation.z = -Math.PI * 0.5;
      tentacle.position.x = 2.7;
      addToonOutline(tentacle, 1.055);
      armPivot.add(tentacle);

      // Hydraulic lift cylinder strut connecting central hub to underside of tentacle arm
      this._addStrut(armPivot, new THREE.Vector3(0.25, -1.35, 0), new THREE.Vector3(2.4, -0.05, 0), 0.12, 0.16, createToonMaterial(0xffd166));

      const car = new THREE.Group();
      car.position.set(5.5, 0.15, 0);
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), createToonMaterial(carCols[i]));
      shell.scale.set(1.0, 0.65, 1.0);
      addToonOutline(shell, 1.055);
      car.add(shell);
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.25, 10), createToonMaterial(0x334155));
      seat.position.y = 0.55;
      car.add(seat);

      armPivot.add(car);
      rotor.add(armPivot);
      arms.push({ pivot: armPivot, car, phase: i * 1.05 });
    }
    return { rotor, arms, angle: 0 };
  }

  _createBumperCars(root) {
    this._addGroundedFoundation(root, 0, 0x334155, { rect: [15.4, 11.4], fence: true });

    const roofMat = createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#60c5f1", "#fff7eb", 14) });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(16.0, 0.8, 12.0), roofMat);
    roof.position.y = 5.6;
    addToonOutline(roof, 1.02);
    root.add(roof);

    // 8 Perimeter steel columns connecting floor to roof solidly
    const colMat = createToonMaterial(0xffd166);
    for (const px of [-7.2, 0, 7.2]) {
      for (const pz of [-5.2, 5.2]) {
        if (px === 0 && pz > 0) continue; // Keep front entrance open
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.2, 8), colMat);
        col.position.set(px, 3.0, pz);
        addToonOutline(col, 1.06);
        root.add(col);
      }
    }

    // Marquee sign above entrance
    const signTex = this._makeTextCanvas("BUMPER CARS · 범퍼카", "DODGEM ARENA", "#1e293b", "#fff7eb", "#60c5f1");
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.15), new THREE.MeshBasicMaterial({ map: signTex }));
    sign.position.set(0, 5.55, 6.08);
    root.add(sign);

    const cars = [];
    const cols = [0xff7657, 0x38bdf8, 0xffd166, 0x34d399, 0xf472b6, 0xa78bfa];
    const poleMat = createToonMaterial(0xe2e8f0);
    for (let i = 0; i < 6; i++) {
      const cGroup = new THREE.Group();
      const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.26, 8, 16), createToonMaterial(0x1e293b));
      bumper.rotation.x = Math.PI * 0.5;
      bumper.position.y = 0.35;
      cGroup.add(bumper);

      const shell = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.65, 1.62), createToonMaterial(cols[i]));
      shell.position.y = 0.65;
      addToonOutline(shell, 1.055);
      cGroup.add(shell);

      // Steering wheel + tall electric trolley pole reaching ceiling power grid!
      const trolleyPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 4.35, 5), poleMat);
      trolleyPole.position.set(0, 2.75, -0.68);
      cGroup.add(trolleyPole);

      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lamp.position.set(0, 0.72, 0.85);
      cGroup.add(lamp);

      const x = -4.2 + (i % 3) * 4.2;
      const z = i < 3 ? -2.2 : 2.2;
      cGroup.position.set(x, 0.78, z);
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
    this._addGroundedFoundation(root, 8.2, 0x1e293b, { fence: true });

    // Solid central launch tower pillar anchored to floor supporting planet & rotor! (Zero Floating!)
    const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.3, 1.8, 16), createToonMaterial(0x475569));
    towerBase.position.y = 1.6;
    addToonOutline(towerBase, 1.03);
    root.add(towerBase);

    const centralPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 7.6, 14), createToonMaterial(0xfff7eb));
    centralPillar.position.y = 5.4;
    centralPillar.castShadow = true;
    addToonOutline(centralPillar, 1.035);
    root.add(centralPillar);

    const center = new THREE.Group();
    center.position.y = 1.0;
    root.add(center);

    // Ringed planet firmly mounted atop the central pillar!
    const planet = new THREE.Mesh(new THREE.SphereGeometry(2.15, 16, 14), createToonMaterial(0x38bdf8));
    planet.position.y = 8.4;
    addToonOutline(planet, 1.04);
    center.add(planet);

    const saturnRing = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.28, 8, 28), createToonMaterial(0xffd166));
    saturnRing.rotation.set(Math.PI * 0.42, 0.2, 0.2);
    saturnRing.position.y = 8.4;
    center.add(saturnRing);

    // Mechanical hub collar where all 6 rocket arms hinge
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 1.2, 14), createToonMaterial(0xff7657));
    collar.position.y = 4.6;
    addToonOutline(collar, 1.04);
    center.add(collar);

    const rockets = [];
    const cols = [0xff7657, 0xffd166, 0x6ee7b7, 0xf472b6, 0x60c5f1, 0xc4b5fd];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const rPivot = new THREE.Group();
      rPivot.position.y = 4.6;
      rPivot.rotation.y = a;

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 6.2, 8), createToonMaterial(0xfff7eb));
      arm.rotation.z = Math.PI * 0.5;
      arm.position.x = 3.1;
      rPivot.add(arm);

      // Precision diagonal hydraulic strut connecting central launch pillar to rocket arm
      this._addStrut(rPivot, new THREE.Vector3(0.95, -2.05, 0), new THREE.Vector3(3.15, -0.04, 0), 0.10, 0.12, createToonMaterial(0xffd166));

      // Detailed Retro Cartoon Rocket (fuselage + nose cone + cockpit glass + wings + thruster!)
      const rocket = new THREE.Group();
      rocket.position.set(6.2, 0, 0);

      const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.35, 6, 10), createToonMaterial(cols[i]));
      hull.rotation.x = Math.PI * 0.5;
      addToonOutline(hull, 1.055);
      rocket.add(hull);

      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.85, 10), createToonMaterial(0xfff7eb));
      nose.rotation.x = Math.PI * 0.5;
      nose.position.z = 1.25;
      rocket.add(nose);

      const cockpit = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xe0f7ff })
      );
      cockpit.position.set(0, 0.36, 0.25);
      rocket.add(cockpit);

      const wings = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.10, 0.72), createToonMaterial(0xffd166));
      wings.position.set(0, -0.05, -0.45);
      rocket.add(wings);

      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.38, 8), createToonMaterial(0x334155));
      nozzle.rotation.x = Math.PI * 0.5;
      nozzle.position.z = -1.15;
      rocket.add(nozzle);

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
    if (builders[def.type]) {
      builders[def.type]();
    } else if (!buildExtendedScenery(this, def.type, root)) {
      builders.kiosk();
    }

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

    // Underground stone terrace plinth so castle never floats on hills
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(15.2, 3.6, 12.2), createToonMaterial(0xd6d3d1));
    skirt.position.y = -1.6;
    skirt.receiveShadow = true;
    root.add(skirt);

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
    const roofStripe = createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#fff7eb", 8) });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 0.6 });
    this.nightLights.push(lightMat);

    // Underground stone plaza apron so entrance gate never floats
    const apron = new THREE.Mesh(new THREE.BoxGeometry(19.0, 2.6, 5.4), createToonMaterial(0xe7e5e4));
    apron.position.y = -1.2;
    apron.receiveShadow = true;
    root.add(apron);

    // Red welcome carpet runner through the gate
    const carpet = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.08, 6.4), createToonMaterial(0xff7657));
    carpet.position.y = 0.14;
    root.add(carpet);

    for (const px of [-5.4, 5.4]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 7.8, 1.7), stoneMat);
      pillar.position.set(px, 3.9, 0);
      pillar.castShadow = true;
      addToonOutline(pillar, 1.04);
      root.add(pillar);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(1.45, 2.0, 4), brassMat);
      cap.position.set(px, 8.75, 0);
      cap.rotation.y = Math.PI * 0.25;
      addToonOutline(cap, 1.06);
      root.add(cap);

      // Flanking cartoon Ticket Booth (매표소) beside each entrance pillar
      const bx = px > 0 ? px + 2.4 : px - 2.4;
      const booth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 2.4), stoneMat);
      booth.position.set(bx, 1.5, 0.35);
      booth.castShadow = true;
      addToonOutline(booth, 1.04);
      root.add(booth);

      const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.12), new THREE.MeshBasicMaterial({ color: 0xbae6fd }));
      win.position.set(bx, 1.85, 1.58);
      root.add(win);

      const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 0.65), brassMat);
      counter.position.set(bx, 1.25, 1.75);
      root.add(counter);

      const boothRoof = new THREE.Mesh(new THREE.ConeGeometry(2.35, 1.45, 4), roofStripe);
      boothRoof.position.set(bx, 3.7, 0.35);
      boothRoof.rotation.y = Math.PI * 0.25;
      addToonOutline(boothRoof, 1.05);
      root.add(boothRoof);
    }

    const arch = new THREE.Mesh(new THREE.TorusGeometry(5.4, 0.54, 10, 24, Math.PI), brassMat);
    arch.position.set(0, 6.2, 0);
    arch.castShadow = true;
    root.add(arch);

    const signTex = this._makeTextCanvas("WEEKLYLAND · 위클리랜드", "MAIN ENTRANCE · 3D THEME PARK", "#1a1714", "#fcf9f3", "#ff7657");
    const sign = new THREE.Mesh(new THREE.BoxGeometry(8.6, 1.6, 0.42), stoneMat);
    sign.position.set(0, 7.2, 0.35);
    root.add(sign);

    const face = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.38), new THREE.MeshBasicMaterial({ map: signTex }));
    face.position.set(0, 7.2, 0.58);
    root.add(face);
    const faceBack = face.clone();
    faceBack.rotation.y = Math.PI;
    faceBack.position.z = 0.12;
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
      pos.set(Math.sin(swing) * 8.2, 12.2 - Math.cos(swing) * 8.2 + 0.85, 0);
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
      (r.chairs[0].seat || r.chairs[0]).getWorldPosition(pos);
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
    if (r.isExtended) {
      return getExtendedRideSeatState(r, pos, forward, up);
    }
    return null;
  }

  update(dt, isNight, cameraPos = null) {
    const rawStep = Math.min(dt, 0.05);
    this._time += rawStep;
    this._frameTick++;

    if (this._lastIsNight !== isNight) {
      this._lastIsNight = isNight;
      const intensity = isNight ? 1.65 : 0.3;
      for (const mat of this.nightLights) {
        mat.emissiveIntensity = intensity;
      }
    }

    let rideIdx = 0;
    for (const r of this.rides.values()) {
      rideIdx++;
      // Distance-based LOD animation throttling: rides >125m away update smoothly every 2nd frame
      let stepDt = rawStep;
      if (cameraPos) {
        const dx = r.root.position.x - cameraPos.x;
        const dz = r.root.position.z - cameraPos.z;
        if (dx * dx + dz * dz > 15625) {
          if (((this._frameTick + rideIdx) & 1) === 1) continue;
          stepDt = rawStep * 2;
        }
      }

      if (r.isExtended) {
        updateExtendedRide(r, stepDt, this._time);
        continue;
      }
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
        for (const ch of r.chairs) (ch.pivot || ch).rotation.z = flare;
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
        if (r.liftArmPivot) {
          const tilt = 0.08 + (Math.sin(r.phase * 0.35) * 0.5 + 0.5) * 1.24;
          r.liftArmPivot.rotation.z = tilt;
          // Articulated hydraulic ram connecting ground anchor (1.4, 1.4) -> boom pin
          if (r.pistonOuter && r.pistonRod) {
            const p0x = 1.4;
            const p0y = 1.4;
            const pinDist = 4.4;
            const p1x = -2.8 + Math.cos(tilt) * pinDist;
            const p1y = 3.25 + Math.sin(tilt) * pinDist;
            const dx = p1x - p0x;
            const dy = p1y - p0y;
            const len = Math.max(0.5, Math.hypot(dx, dy));
            const ang = Math.atan2(dy, dx) - Math.PI * 0.5;
            const outerLen = Math.min(len * 0.65, 3.0);
            const ux = dx / len;
            const uy = dy / len;
            r.pistonOuter.position.set(p0x + ux * outerLen * 0.5, p0y + uy * outerLen * 0.5, 0);
            r.pistonOuter.rotation.z = ang;
            r.pistonOuter.scale.set(1, outerLen, 1);
            r.pistonRod.position.set(p0x + ux * len * 0.5, p0y + uy * len * 0.5, 0);
            r.pistonRod.rotation.z = ang;
            r.pistonRod.scale.set(1, len, 1);
          }
        }
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
          c.mesh.position.set(c.x, 0.78, c.z);
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
