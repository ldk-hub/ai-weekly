import * as THREE from "three";
import { createToonMaterial, addToonOutline, getCarnivalStripeTexture } from "./ToonMaterials.js";

export const EXTENDED_INTERACTIVE_SCENERY = {
  burger_shop: { label: "수제 치즈버거 사먹기", action: "burger" },
  cotton_candy_stall: { label: "무지개 솜사탕 사먹기", action: "cotton_candy" },
  souvenir_shop: { label: "위클리랜드 굿즈 구경하기", action: "souvenir" },
  restroom_plaza: { label: "편의시설 이용 (컨디션 회복)", action: "restroom" },
  clock_tower: { label: "대시계탑 정각 종 울리기", action: "clock" },
  hedge_maze: { label: "미로 정원 보물 찾기!", action: "maze" },
  hot_air_pad: { label: "열기구 버너 점화하기!", action: "hot_air" },
  neon_arch: { label: "레인보우 네온 아치 통과", action: "neon" },
};

/**
 * Builds one of the 14 extended RCT / Planet Coaster / Real-World flat rides.
 * Every ride uses engine._addGroundedFoundation + _addStrut for zero floating.
 */
export function buildExtendedRide(engine, type, root) {
  switch (type) {
    case "top_spin": return createTopSpin(engine, root);
    case "power_surge": return createPowerSurge(engine, root);
    case "frisbee_pendulum": return createFrisbeePendulum(engine, root);
    case "gravitron_ufo": return createGravitronUFO(engine, root);
    case "scrambler_twist": return createScramblerTwist(engine, root);
    case "magic_carpet": return createMagicCarpet(engine, root);
    case "condor_tower": return createCondorTower(engine, root);
    case "tagada_disco": return createTagadaDisco(engine, root);
    case "log_flume_splash": return createLogFlumeSplash(engine, root);
    case "haunted_house": return createHauntedHouse(engine, root);
    case "mini_train_station": return createMiniTrainStation(engine, root);
    case "go_kart_track": return createGoKartTrack(engine, root);
    case "bungee_trampoline": return createBungeeSlingshot(engine, root);
    case "swan_boats_pond": return createSwanBoatsPond(engine, root);
    default: return null;
  }
}

function createTopSpin(engine, root) {
  engine._addGroundedFoundation(root, 0, 0xffe8c2, { rect: [13.0, 9.0], fence: true });
  const legMat = createToonMaterial(0xfff7eb);
  const darkMat = createToonMaterial(0x334155);
  const armMat = createToonMaterial(0xff7657);
  const goldMat = createToonMaterial(0xffd166);

  const hubY = 9.4;
  for (const sx of [-4.8, 4.8]) {
    const top = new THREE.Vector3(sx, hubY, 0);
    engine._addStrut(root, new THREE.Vector3(sx, 0.75, -3.2), top, 0.28, 0.42, legMat);
    engine._addStrut(root, new THREE.Vector3(sx, 0.75, 3.2), top, 0.28, 0.42, legMat);
    const gear = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.8, 12), darkMat);
    gear.rotation.z = Math.PI * 0.5;
    gear.position.copy(top);
    root.add(gear);
  }

  const crankPivot = new THREE.Group();
  crankPivot.position.set(0, hubY, 0);
  root.add(crankPivot);

  for (const sx of [-4.1, 4.1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 6.4, 0.75), armMat);
    arm.position.set(sx, -2.1, 0);
    arm.castShadow = true;
    addToonOutline(arm, 1.04);
    crankPivot.add(arm);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.4, 1.25), goldMat);
    counter.position.set(sx, 1.5, 0);
    crankPivot.add(counter);
  }

  const gondolaPivot = new THREE.Group();
  gondolaPivot.position.set(0, -5.0, 0);
  crankPivot.add(gondolaPivot);

  const bench = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.15, 2.2), createToonMaterial(0x38bdf8));
  bench.castShadow = true;
  addToonOutline(bench, 1.04);
  gondolaPivot.add(bench);

  for (let i = -3; i <= 3; i++) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 0.55), darkMat);
    seat.position.set(i * 1.02, 0.65, 0.55);
    gondolaPivot.add(seat);
  }
  return { crankPivot, gondolaPivot, phase: 0 };
}

function createPowerSurge(engine, root) {
  engine._addGroundedFoundation(root, 8.6, 0xdbeafe, { fence: true });
  const darkMat = createToonMaterial(0x1e293b);
  const boomMat = createToonMaterial(0xff7657);
  const steelMat = createToonMaterial(0xfff7eb);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.6, 2.2, 14), darkMat);
  base.position.y = 1.8;
  root.add(base);

  const tiltGroup = new THREE.Group();
  tiltGroup.position.set(0, 2.6, 0);
  tiltGroup.rotation.z = 0.42;
  root.add(tiltGroup);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.88, 7.6, 12), boomMat);
  mast.position.y = 3.8;
  mast.castShadow = true;
  addToonOutline(mast, 1.04);
  tiltGroup.add(mast);

  const hub = new THREE.Group();
  hub.position.y = 7.6;
  tiltGroup.add(hub);

  const hubCap = new THREE.Mesh(new THREE.SphereGeometry(1.45, 14, 12), createToonMaterial(0xffd166));
  addToonOutline(hubCap, 1.05);
  hub.add(hubCap);

  const arms = [];
  const cols = [0xff8274, 0x38bdf8, 0x34d399, 0xf472b6, 0xfbbf24, 0xa78bfa];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const ax = Math.cos(a) * 5.6;
    const az = Math.sin(a) * 5.6;
    engine._addStrut(hub, new THREE.Vector3(0, 0, 0), new THREE.Vector3(ax, 0, az), 0.16, 0.20, steelMat);

    const podPivot = new THREE.Group();
    podPivot.position.set(ax, 0, az);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.25, 0.25), darkMat);
    podPivot.add(bar);
    for (const sx of [-0.95, 0.95]) {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.95), createToonMaterial(cols[i]));
      seat.position.set(sx, 0, 0);
      addToonOutline(seat, 1.06);
      podPivot.add(seat);
    }
    hub.add(podPivot);
    arms.push(podPivot);
  }
  return { tiltGroup, hub, arms, phase: 0 };
}

function createFrisbeePendulum(engine, root) {
  engine._addGroundedFoundation(root, 9.6, 0xf5f3ff, { fence: true });
  const archMat = createToonMaterial(0xa855f7);
  const darkMat = createToonMaterial(0x1e293b);
  const neonMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x38bdf8, emissiveIntensity: 0.65 });
  engine.nightLights.push(neonMat);

  const apexY = 16.5;
  for (const [fx, fz] of [[-6.4, -3.2], [6.4, -3.2], [-6.4, 3.2], [6.4, 3.2]]) {
    engine._addStrut(root, new THREE.Vector3(fx, 0.75, fz), new THREE.Vector3(0, apexY, 0), 0.34, 0.52, archMat);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.7, 14, 12), darkMat);
  crown.position.y = apexY;
  root.add(crown);

  const pivot = new THREE.Group();
  pivot.position.y = apexY;
  root.add(pivot);

  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.36, 13.8, 10), createToonMaterial(0xfff7eb));
  arm.position.y = -6.8;
  addToonOutline(arm, 1.04);
  pivot.add(arm);

  const disc = new THREE.Group();
  disc.position.y = -13.5;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.58, 10, 24), createToonMaterial(0xf472b6));
  ring.rotation.x = Math.PI * 0.5;
  addToonOutline(ring, 1.04);
  disc.add(ring);

  const neon = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.14, 8, 28), neonMat);
  neon.rotation.x = Math.PI * 0.5;
  disc.add(neon);

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.7, 1.0, 14), createToonMaterial(0xffd166));
  disc.add(hub);
  pivot.add(disc);
  return { pivot, disc, phase: 0, spin: 0 };
}

function createGravitronUFO(engine, root) {
  engine._addGroundedFoundation(root, 8.2, 0x1e293b, { fence: true });
  const neonMat = new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.7 });
  engine.nightLights.push(neonMat);

  const ped = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.0, 2.6, 14), createToonMaterial(0x334155));
  ped.position.y = 1.9;
  root.add(ped);

  const ufoPivot = new THREE.Group();
  ufoPivot.position.y = 3.8;
  root.add(ufoPivot);

  const saucer = new THREE.Group();
  ufoPivot.add(saucer);

  const lower = new THREE.Mesh(new THREE.CylinderGeometry(6.6, 3.2, 1.5, 22), createToonMaterial(0x475569));
  lower.position.y = -0.35;
  addToonOutline(lower, 1.03);
  saucer.add(lower);

  const upper = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 6.6, 1.8, 22), createToonMaterial(0x60c5f1));
  upper.position.y = 1.25;
  upper.castShadow = true;
  addToonOutline(upper, 1.03);
  saucer.add(upper);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), neonMat);
  dome.position.y = 2.1;
  saucer.add(dome);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(6.65, 0.22, 8, 28), neonMat);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 0.4;
  saucer.add(rim);

  return { ufoPivot, saucer, phase: 0 };
}

function createScramblerTwist(engine, root) {
  engine._addGroundedFoundation(root, 8.8, 0xffe8c2, { fence: true });
  const steelMat = createToonMaterial(0xfff7eb);
  const accentMat = createToonMaterial(0xff7657);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.45, 5.4, 14), accentMat);
  mast.position.y = 3.4;
  addToonOutline(mast, 1.04);
  root.add(mast);

  const mainRotor = new THREE.Group();
  mainRotor.position.y = 5.9;
  root.add(mainRotor);

  const topCap = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 10), createToonMaterial(0xffd166));
  mainRotor.add(topCap);

  const clusters = [];
  const cols = [0xff8274, 0x38bdf8, 0x34d399, 0xfbbf24];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const cx = Math.cos(a) * 4.2;
    const cz = Math.sin(a) * 4.2;
    engine._addStrut(mainRotor, new THREE.Vector3(0, 0, 0), new THREE.Vector3(cx, -0.4, cz), 0.18, 0.22, steelMat);

    const sub = new THREE.Group();
    sub.position.set(cx, -0.4, cz);
    const subShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.6, 8), createToonMaterial(0x334155));
    subShaft.position.y = -1.8;
    sub.add(subShaft);

    for (let k = 0; k < 4; k++) {
      const ka = (k / 4) * Math.PI * 2;
      const kx = Math.cos(ka) * 2.5;
      const kz = Math.sin(ka) * 2.5;
      engine._addStrut(sub, new THREE.Vector3(0, -3.5, 0), new THREE.Vector3(kx, -3.5, kz), 0.08, 0.08, steelMat);
      const car = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.85, 1.35), createToonMaterial(cols[k]));
      car.position.set(kx, -3.2, kz);
      car.rotation.y = -ka;
      addToonOutline(car, 1.06);
      sub.add(car);
    }
    mainRotor.add(sub);
    clusters.push(sub);
  }
  return { mainRotor, clusters, phase: 0 };
}

function createMagicCarpet(engine, root) {
  engine._addGroundedFoundation(root, 0, 0xfef3c7, { rect: [13.6, 7.6], fence: true });
  const legMat = createToonMaterial(0xfff7eb);
  const goldMat = createToonMaterial(0xffd166);
  const darkMat = createToonMaterial(0x334155);

  const hubY = 8.4;
  for (const sx of [-3.6, 3.6]) {
    const hubPos = new THREE.Vector3(sx, hubY, -1.6);
    engine._addStrut(root, new THREE.Vector3(sx - 1.8, 0.75, -1.6), hubPos, 0.24, 0.36, legMat);
    engine._addStrut(root, new THREE.Vector3(sx + 1.8, 0.75, -1.6), hubPos, 0.24, 0.36, legMat);
    const box = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.7, 10), darkMat);
    box.rotation.x = Math.PI * 0.5;
    box.position.copy(hubPos);
    root.add(box);
  }

  const arms = [];
  for (const sx of [-3.6, 3.6]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx, hubY, -1.1);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 5.4, 0.45), goldMat);
    bar.position.y = -2.4;
    addToonOutline(bar, 1.05);
    pivot.add(bar);
    root.add(pivot);
    arms.push(pivot);
  }

  const carpet = new THREE.Group();
  carpet.position.set(0, hubY - 5.0, 0.4);
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(9.2, 0.75, 2.8),
    createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#a855f7", "#ffd166", 10) })
  );
  deck.castShadow = true;
  addToonOutline(deck, 1.035);
  carpet.add(deck);

  for (let i = -3; i <= 3; i++) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 1.8), darkMat);
    seat.position.set(i * 1.18, 0.72, 0);
    carpet.add(seat);
  }
  root.add(carpet);
  return { arms, carpet, hubY, armLen: 5.0, phase: 0 };
}

function createCondorTower(engine, root) {
  engine._addGroundedFoundation(root, 7.2, 0xe0f2fe, { fence: true });
  const towerH = 26;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.35, towerH, 12),
    createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#0284c7", "#fff7eb", 12) })
  );
  mast.position.y = towerH * 0.5 + 0.75;
  mast.castShadow = true;
  addToonOutline(mast, 1.03);
  root.add(mast);

  const topBird = new THREE.Mesh(new THREE.OctahedronGeometry(1.6, 0), createToonMaterial(0xffd166));
  topBird.position.y = towerH + 1.8;
  root.add(topBird);

  const sleeve = new THREE.Group();
  sleeve.position.y = 6.0;
  root.add(sleeve);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 2.2, 14), createToonMaterial(0xff7657));
  addToonOutline(collar, 1.04);
  sleeve.add(collar);

  const pods = [];
  const cols = [0xff8274, 0xffd166, 0x34d399, 0xf472b6];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const gx = Math.cos(a) * 5.2;
    const gz = Math.sin(a) * 5.2;
    engine._addStrut(sleeve, new THREE.Vector3(0, 0, 0), new THREE.Vector3(gx, 0, gz), 0.14, 0.18, createToonMaterial(0xfff7eb));

    const podGroup = new THREE.Group();
    podGroup.position.set(gx, 0, gz);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.12, 6, 16), createToonMaterial(0xffd166));
    ring.rotation.x = Math.PI * 0.5;
    podGroup.add(ring);
    for (let k = 0; k < 3; k++) {
      const ka = (k / 3) * Math.PI * 2;
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.72, 1.15), createToonMaterial(cols[(i + k) % 4]));
      cab.position.set(Math.cos(ka) * 1.5, -0.25, Math.sin(ka) * 1.5);
      addToonOutline(cab, 1.06);
      podGroup.add(cab);
    }
    sleeve.add(podGroup);
    pods.push(podGroup);
  }
  return { sleeve, pods, towerH, phase: 0 };
}

function createTagadaDisco(engine, root) {
  engine._addGroundedFoundation(root, 7.6, 0x1e1b4b, { fence: true });
  const neonMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xec4899, emissiveIntensity: 0.75 });
  engine.nightLights.push(neonMat);

  // Hydraulic under-pedestal + DJ Booth
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 1.8, 12), createToonMaterial(0x334155));
  piston.position.y = 1.5;
  root.add(piston);

  const djBooth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 1.6), createToonMaterial(0x38bdf8));
  djBooth.position.set(0, 1.9, -5.9);
  addToonOutline(djBooth, 1.04);
  root.add(djBooth);

  const bowlPivot = new THREE.Group();
  bowlPivot.position.y = 2.3;
  root.add(bowlPivot);

  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.1, 1.4, 22), createToonMaterial(0xfbbf24));
  bowl.castShadow = true;
  addToonOutline(bowl, 1.03);
  bowlPivot.add(bowl);

  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(4.6, 4.6, 0.2, 20),
    createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#a855f7", "#38bdf8", 12) })
  );
  floor.position.y = 0.68;
  bowlPivot.add(floor);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(5.15, 0.24, 8, 28), neonMat);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 0.8;
  bowlPivot.add(rim);

  return { bowlPivot, phase: 0 };
}

function createLogFlumeSplash(engine, root) {
  engine._addGroundedFoundation(root, 9.4, 0x0284c7, { fence: true });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15, transparent: true, opacity: 0.88 });
  const woodMat = createToonMaterial(0x9a5b32);
  const darkWood = createToonMaterial(0x6d3f22);

  const pool = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.6, 0.35, 24), waterMat);
  pool.position.y = 0.82;
  root.add(pool);

  // Elevated circular timber water chute + splash ramp
  const chute = new THREE.Mesh(new THREE.TorusGeometry(6.0, 0.95, 8, 28), woodMat);
  chute.rotation.x = Math.PI * 0.5;
  chute.scale.set(1, 1, 0.45);
  chute.position.y = 1.45;
  root.add(chute);

  // Center rock island + waterfall hill
  const hill = new THREE.Mesh(new THREE.ConeGeometry(3.4, 5.2, 10), createToonMaterial(0x52c77c));
  hill.position.y = 3.2;
  addToonOutline(hill, 1.04);
  root.add(hill);

  const boats = [];
  for (let i = 0; i < 4; i++) {
    const boat = new THREE.Group();
    const log = new THREE.Mesh(new THREE.CapsuleGeometry(0.48, 1.8, 6, 10), darkWood);
    log.rotation.x = Math.PI * 0.5;
    addToonOutline(log, 1.06);
    boat.add(log);
    const foam = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), createToonMaterial(0xf0f9ff));
    foam.position.set(0, -0.1, 1.25);
    boat.add(foam);
    root.add(boat);
    boats.push({ mesh: boat, offset: (i / 4) * Math.PI * 2 });
  }
  return { boats, phase: 0 };
}

function createHauntedHouse(engine, root) {
  engine._addGroundedFoundation(root, 0, 0x312e81, { rect: [13.0, 10.6], fence: true });
  const wallMat = createToonMaterial(0x4c1d95);
  const roofMat = createToonMaterial(0x1e1b4b);
  const glowMat = new THREE.MeshStandardMaterial({ color: 0xe879f9, emissive: 0xc026d3, emissiveIntensity: 0.9 });
  engine.nightLights.push(glowMat);

  const manor = new THREE.Mesh(new THREE.BoxGeometry(10.2, 6.2, 7.6), wallMat);
  manor.position.y = 3.85;
  manor.castShadow = true;
  addToonOutline(manor, 1.03);
  root.add(manor);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(7.8, 4.4, 4), roofMat);
  roof.position.y = 9.1;
  roof.rotation.y = Math.PI * 0.25;
  addToonOutline(roof, 1.035);
  root.add(roof);

  // Crooked clock spire on side
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 8.8, 8), wallMat);
  spire.position.set(-4.2, 5.2, 2.2);
  root.add(spire);
  const spireCap = new THREE.Mesh(new THREE.ConeGeometry(1.9, 4.2, 8), roofMat);
  spireCap.position.set(-4.2, 11.4, 2.2);
  spireCap.rotation.z = 0.14;
  root.add(spireCap);

  // Glowing purple spooky windows + entrance door
  for (const wx of [-2.4, 0, 2.4]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 0.18), glowMat);
    win.position.set(wx, 4.8, 3.86);
    root.add(win);
  }
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 0.25), roofMat);
  door.position.set(0, 2.2, 3.86);
  root.add(door);

  // 2 Animated bobbing cartoon ghosts orbiting the roof!
  const ghosts = [];
  const ghostMat = new THREE.MeshBasicMaterial({ color: 0xf5d0fe, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 2; i++) {
    const g = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.8, 6, 10), ghostMat);
    g.position.set(i === 0 ? -3.5 : 3.5, 8.2, 3.2);
    root.add(g);
    ghosts.push({ mesh: g, offset: i * Math.PI });
  }
  return { ghosts, phase: 0 };
}

function createMiniTrainStation(engine, root) {
  engine._addGroundedFoundation(root, 10.2, 0xd9f99d, { fence: true });
  const railMat = createToonMaterial(0x475569);

  // Circular miniature railway track
  for (const r of [6.8, 7.6]) {
    const rail = new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 6, 36), railMat);
    rail.rotation.x = Math.PI * 0.5;
    rail.position.y = 0.9;
    root.add(rail);
  }
  // Cute central depot gazebo
  const depot = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 3.4), createToonMaterial(0xfff7eb));
  depot.position.y = 2.05;
  addToonOutline(depot, 1.04);
  root.add(depot);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(3.8, 1.8, 4),
    createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ef4444", "#fff7eb", 8) })
  );
  roof.position.y = 4.25;
  roof.rotation.y = Math.PI * 0.25;
  root.add(roof);

  // Chugging steam locomotive + 2 passenger coaches
  const cars = [];
  const cols = [0xef4444, 0x38bdf8, 0xfbbf24];
  for (let i = 0; i < 3; i++) {
    const car = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.25, 2.3), createToonMaterial(cols[i]));
    body.position.y = 0.85;
    body.castShadow = true;
    addToonOutline(body, 1.05);
    car.add(body);
    if (i === 0) {
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.9, 8), createToonMaterial(0x1e293b));
      funnel.position.set(0, 1.85, 0.65);
      car.add(funnel);
    }
    root.add(car);
    cars.push({ mesh: car, lag: i * 0.36 });
  }
  return { cars, phase: 0 };
}

function createGoKartTrack(engine, root) {
  engine._addGroundedFoundation(root, 0, 0x334155, { rect: [17.0, 12.6], fence: true });
  const curbMat = createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ef4444", "#ffffff", 16) });
  const grass = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.22, 5.4), createToonMaterial(0x52c77c));
  grass.position.y = 0.85;
  root.add(grass);

  // Checkered start/finish gantry arch
  for (const sz of [-2.4, 2.4]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 3.6, 8), createToonMaterial(0xfff7eb));
    p.position.set(0, 2.5, -4.6 + sz * 0.35);
    root.add(p);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.9, 3.4), curbMat);
  banner.position.set(0, 4.1, -4.6);
  root.add(banner);

  const karts = [];
  const cols = [0xff7657, 0x38bdf8, 0xfbbf24, 0x34d399];
  for (let i = 0; i < 4; i++) {
    const k = new THREE.Group();
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 1.45), createToonMaterial(cols[i]));
    chassis.position.y = 0.36;
    addToonOutline(chassis, 1.06);
    k.add(chassis);
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.14), createToonMaterial(0x1e293b));
    spoiler.position.set(0, 0.65, -0.62);
    k.add(spoiler);
    root.add(k);
    karts.push({ mesh: k, offset: (i / 4) * Math.PI * 2, lane: (i % 2 === 0 ? -0.6 : 0.6), speed: 1.55 + i * 0.12 });
  }
  return { karts, phase: 0 };
}

function createBungeeSlingshot(engine, root) {
  engine._addGroundedFoundation(root, 7.6, 0xffe8c2, { fence: true });
  const towerMat = createToonMaterial(0xff7657);
  const darkMat = createToonMaterial(0x1e293b);
  const towerH = 22.0;

  for (const sx of [-4.8, 4.8]) {
    engine._addStrut(root, new THREE.Vector3(sx * 1.12, 0.75, -1.2), new THREE.Vector3(sx, towerH, 0), 0.24, 0.42, towerMat);
    engine._addStrut(root, new THREE.Vector3(sx * 1.12, 0.75, 1.2), new THREE.Vector3(sx, towerH, 0), 0.24, 0.42, towerMat);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.65, 10, 8), createToonMaterial(0xffd166));
    tip.position.set(sx, towerH, 0);
    root.add(tip);
  }

  const capsule = new THREE.Mesh(new THREE.SphereGeometry(1.35, 14, 12), createToonMaterial(0x38bdf8));
  capsule.position.set(0, 2.6, 0);
  capsule.castShadow = true;
  addToonOutline(capsule, 1.05);
  root.add(capsule);

  // Twin dynamic elastic bungee cords updated in updateExtendedRide!
  const cordMat = createToonMaterial(0xfef08a);
  const cordL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6), cordMat);
  const cordR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.0, 6), cordMat);
  root.add(cordL, cordR);

  return { capsule, cordL, cordR, towerH, phase: 0 };
}

function createSwanBoatsPond(engine, root) {
  engine._addGroundedFoundation(root, 9.2, 0x0ea5e9, { fence: true });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, roughness: 0.14, transparent: true, opacity: 0.86 });
  const pool = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.32, 24), waterMat);
  pool.position.y = 0.82;
  root.add(pool);

  const dock = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.35, 3.8), createToonMaterial(0xc98a55));
  dock.position.set(0, 1.02, 7.2);
  root.add(dock);

  const swans = [];
  const whiteMat = createToonMaterial(0xfffbf5);
  const beakMat = createToonMaterial(0xff7657);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), whiteMat);
    hull.scale.set(0.85, 0.55, 1.35);
    hull.position.y = 0.35;
    addToonOutline(hull, 1.06);
    s.add(hull);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.2, 8), whiteMat);
    neck.position.set(0, 1.0, 0.92);
    neck.rotation.x = 0.25;
    s.add(neck);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), whiteMat);
    head.position.set(0, 1.58, 1.08);
    s.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.32, 6), beakMat);
    beak.rotation.x = Math.PI * 0.5;
    beak.position.set(0, 1.55, 1.34);
    s.add(beak);
    root.add(s);
    swans.push({ mesh: s, offset: (i / 4) * Math.PI * 2, radius: 4.0 + (i % 2) * 1.8 });
  }
  return { swans, phase: 0 };
}

/**
 * Updates animation for any of the 14 extended rides (zero per-frame heap allocations).
 */
export function updateExtendedRide(r, stepDt, simTime) {
  if (r.kind === "top_spin" && r.crankPivot) {
    r.phase += stepDt * 1.25;
    r.crankPivot.rotation.x = Math.sin(r.phase * 0.7) * 2.2;
    r.gondolaPivot.rotation.x = Math.sin(r.phase * 1.9) * 3.1;
  } else if (r.kind === "power_surge" && r.hub) {
    r.phase += stepDt;
    r.hub.rotation.y += stepDt * 1.6;
    for (let i = 0; i < r.arms.length; i++) {
      r.arms[i].rotation.x += stepDt * (2.6 + (i % 2) * 0.8);
    }
  } else if (r.kind === "frisbee_pendulum" && r.pivot) {
    r.phase += stepDt * 1.3;
    r.spin += stepDt * 2.4;
    r.pivot.rotation.z = Math.sin(r.phase) * 1.22;
    r.disc.rotation.y = r.spin;
  } else if (r.kind === "gravitron_ufo" && r.saucer) {
    r.phase += stepDt;
    r.saucer.rotation.y += stepDt * 3.2;
    r.ufoPivot.rotation.z = Math.sin(r.phase * 0.75) * 0.28;
    r.ufoPivot.position.y = 3.8 + Math.sin(r.phase * 1.4) * 0.55;
  } else if (r.kind === "scrambler_twist" && r.mainRotor) {
    r.mainRotor.rotation.y += stepDt * 1.15;
    for (const c of r.clusters) c.rotation.y -= stepDt * 2.55;
  } else if (r.kind === "magic_carpet" && r.carpet) {
    r.phase += stepDt * 1.35;
    for (const a of r.arms) a.rotation.z = r.phase;
    r.carpet.position.x = Math.sin(r.phase) * r.armLen;
    r.carpet.position.y = r.hubY - Math.cos(r.phase) * r.armLen;
  } else if (r.kind === "condor_tower" && r.sleeve) {
    r.phase += stepDt * 0.5;
    r.sleeve.rotation.y += stepDt * 1.1;
    r.sleeve.position.y = 5.5 + (Math.sin(r.phase) * 0.5 + 0.5) * (r.towerH - 8.5);
    for (const p of r.pods) p.rotation.y -= stepDt * 2.4;
  } else if (r.kind === "tagada_disco" && r.bowlPivot) {
    r.phase += stepDt * 2.4;
    r.bowlPivot.rotation.y += stepDt * 2.1;
    r.bowlPivot.rotation.x = Math.sin(r.phase) * 0.24;
    r.bowlPivot.rotation.z = Math.cos(r.phase * 1.3) * 0.24;
    r.bowlPivot.position.y = 2.3 + Math.abs(Math.sin(r.phase * 1.8)) * 0.65;
  } else if (r.kind === "log_flume_splash" && r.boats) {
    r.phase += stepDt * 0.75;
    for (const b of r.boats) {
      const a = r.phase + b.offset;
      b.mesh.position.set(Math.cos(a) * 6.0, 1.7 + Math.sin(a * 2) * 0.12, Math.sin(a) * 6.0);
      b.mesh.rotation.y = -a;
    }
  } else if (r.kind === "haunted_house" && r.ghosts) {
    for (const g of r.ghosts) {
      const a = simTime * 1.1 + g.offset;
      g.mesh.position.set(Math.cos(a) * 5.2, 8.2 + Math.sin(simTime * 2.8 + g.offset) * 0.9, Math.sin(a) * 4.2);
    }
  } else if (r.kind === "mini_train_station" && r.cars) {
    r.phase += stepDt * 0.72;
    for (const c of r.cars) {
      const a = r.phase - c.lag;
      c.mesh.position.set(Math.cos(a) * 7.2, 0.9, Math.sin(a) * 7.2);
      c.mesh.rotation.y = -a;
    }
  } else if (r.kind === "go_kart_track" && r.karts) {
    r.phase += stepDt;
    for (const k of r.karts) {
      const a = r.phase * k.speed + k.offset;
      const rx = 6.6 + k.lane;
      const rz = 4.3 + k.lane * 0.8;
      k.mesh.position.set(Math.cos(a) * rx, 0.82, Math.sin(a) * rz);
      k.mesh.rotation.y = Math.atan2(-Math.sin(a) * rx, Math.cos(a) * rz);
    }
  } else if (r.kind === "bungee_trampoline" && r.capsule) {
    r.phase = (r.phase + stepDt) % 9.0;
    let y = 2.6;
    if (r.phase > 1.8 && r.phase < 7.2) {
      const u = (r.phase - 1.8) / 5.4;
      y = 2.6 + Math.sin(u * Math.PI) * (r.towerH - 4.0) * (1 + Math.sin(u * Math.PI * 5) * 0.16);
    }
    r.capsule.position.y = Math.max(2.6, y);
    r.capsule.rotation.x += stepDt * (y > 6 ? 2.8 : 0.2);
    // Stretch left & right elastic bungee cords from tower tips to capsule!
    const updateCord = (cord, tx) => {
      const dx = 0 - tx;
      const dy = r.capsule.position.y - r.towerH;
      const len = Math.max(0.5, Math.hypot(dx, dy));
      cord.position.set(tx * 0.5, (r.towerH + r.capsule.position.y) * 0.5, 0);
      cord.rotation.z = Math.atan2(dy, dx) - Math.PI * 0.5;
      cord.scale.set(1, len, 1);
    };
    updateCord(r.cordL, -4.8);
    updateCord(r.cordR, 4.8);
  } else if (r.kind === "swan_boats_pond" && r.swans) {
    r.phase += stepDt * 0.42;
    for (const s of r.swans) {
      const a = r.phase + s.offset;
      s.mesh.position.set(Math.cos(a) * s.radius, 0.88, Math.sin(a) * s.radius);
      s.mesh.rotation.y = -a;
    }
  }
}

/**
 * Returns 1st-person seat telemetry for any of the 14 extended rides.
 */
export function getExtendedRideSeatState(r, pos, forward, up, slot = 0) {
  if (r.kind === "top_spin" && r.gondolaPivot) {
    r.gondolaPivot.getWorldPosition(pos);
    pos.x += ((slot % 5) - 2) * 0.95;
    pos.y += 0.75;
    forward.set(0, Math.sin(r.phase), Math.cos(r.phase)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 46, altitudeM: Number(pos.y.toFixed(1)), vertG: 2.4, latG: 0.3, segment: "TOP SPIN", coasterName: r.def.name };
  }
  if (r.kind === "power_surge" && r.arms?.length) {
    r.arms[slot % r.arms.length].getWorldPosition(pos);
    pos.y += 0.6;
    forward.set(Math.cos(r.phase * 2), 0.2, Math.sin(r.phase * 2)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 54, altitudeM: Number(pos.y.toFixed(1)), vertG: 2.6, latG: 1.1, segment: "SURGE", coasterName: r.def.name };
  }
  if (r.kind === "frisbee_pendulum" && r.disc) {
    r.disc.getWorldPosition(pos);
    const ang = r.spin + (slot % 8) * ((Math.PI * 2) / 8);
    pos.x += Math.cos(ang) * 3.8;
    pos.z += Math.sin(ang) * 3.8;
    pos.y += 0.65;
    forward.set(Math.cos(ang), 0.15, Math.sin(ang)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 76, altitudeM: Number(pos.y.toFixed(1)), vertG: 2.8, latG: 0.7, segment: "FRISBEE", coasterName: r.def.name };
  }
  if (r.kind === "gravitron_ufo" && r.saucer) {
    r.saucer.getWorldPosition(pos);
    pos.y += 1.0;
    forward.set(Math.cos(r.phase * 3), 0.05, Math.sin(r.phase * 3)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 62, altitudeM: Number(pos.y.toFixed(1)), vertG: 3.0, latG: 0.4, segment: "CENTRIFUGE", coasterName: r.def.name };
  }
  if (r.kind === "scrambler_twist" && r.clusters?.length) {
    r.clusters[slot % r.clusters.length].getWorldPosition(pos);
    pos.y -= 2.4;
    forward.set(Math.cos(r.mainRotor.rotation.y), 0, Math.sin(r.mainRotor.rotation.y)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 36, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.2, latG: 1.8, segment: "SCRAMBLER", coasterName: r.def.name };
  }
  if (r.kind === "magic_carpet" && r.carpet) {
    r.carpet.getWorldPosition(pos);
    pos.x += ((slot % 5) - 2) * 1.1;
    pos.y += 0.9;
    forward.set(0, 0.1, 1);
    return { position: pos, tangent: forward, up, speedKmh: 48, altitudeM: Number(pos.y.toFixed(1)), vertG: 2.1, latG: 0.2, segment: "CARPET", coasterName: r.def.name };
  }
  if (r.kind === "condor_tower" && r.pods?.length) {
    r.pods[slot % r.pods.length].getWorldPosition(pos);
    pos.y += 0.45;
    forward.set(Math.cos(r.sleeve.rotation.y), -0.15, Math.sin(r.sleeve.rotation.y)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 34, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.3, latG: 0.9, segment: "CONDOR", coasterName: r.def.name };
  }
  if (r.kind === "tagada_disco" && r.bowlPivot) {
    r.bowlPivot.getWorldPosition(pos);
    const ang = r.bowlPivot.rotation.y + (slot % 8) * ((Math.PI * 2) / 8);
    pos.x += Math.cos(ang) * 3.6;
    pos.z += Math.sin(ang) * 3.6;
    pos.y += 0.95;
    forward.set(-Math.cos(ang), 0.1, -Math.sin(ang)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 40, altitudeM: Number(pos.y.toFixed(1)), vertG: 2.2, latG: 1.2, segment: "DISCO", coasterName: r.def.name };
  }
  if (r.kind === "log_flume_splash" && r.boats?.length) {
    r.boats[slot % r.boats.length].mesh.getWorldPosition(pos);
    pos.y += 0.85;
    forward.set(-Math.sin(r.phase), 0, Math.cos(r.phase)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 28, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.1, latG: 0.4, segment: "SPLASH", coasterName: r.def.name };
  }
  if (r.kind === "haunted_house") {
    r.root.getWorldPosition(pos);
    pos.y += 3.6;
    pos.z += 5.2;
    forward.set(0, 0.1, -1);
    return { position: pos, tangent: forward, up, speedKmh: 12, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.0, latG: 0, segment: "SPOOKY", coasterName: r.def.name };
  }
  if (r.kind === "mini_train_station" && r.cars?.length) {
    r.cars[slot % r.cars.length].mesh.getWorldPosition(pos);
    pos.y += 1.45;
    forward.set(-Math.sin(r.phase), 0, Math.cos(r.phase)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 24, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.0, latG: 0.3, segment: "RAILWAY", coasterName: r.def.name };
  }
  if (r.kind === "go_kart_track" && r.karts?.length) {
    const k = r.karts[slot % r.karts.length];
    k.mesh.getWorldPosition(pos);
    pos.y += 0.78;
    const a = r.phase * k.speed + k.offset;
    forward.set(-Math.sin(a), 0, Math.cos(a)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 58, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.1, latG: 1.6, segment: "RACE", coasterName: r.def.name };
  }
  if (r.kind === "bungee_trampoline" && r.capsule) {
    r.capsule.getWorldPosition(pos);
    pos.y += 0.35;
    forward.set(0, 0.35, 1).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 92, altitudeM: Number(pos.y.toFixed(1)), vertG: 3.4, latG: 0, segment: "SLINGSHOT", coasterName: r.def.name };
  }
  if (r.kind === "swan_boats_pond" && r.swans?.length) {
    r.swans[slot % r.swans.length].mesh.getWorldPosition(pos);
    pos.y += 0.95;
    forward.set(-Math.sin(r.phase), 0, Math.cos(r.phase)).normalize();
    return { position: pos, tangent: forward, up, speedKmh: 9, altitudeM: Number(pos.y.toFixed(1)), vertG: 1.0, latG: 0.1, segment: "SWAN BOAT", coasterName: r.def.name };
  }
  return null;
}

/**
 * Builds one of the 8 extended interactive shops & park landmarks (all grounded with skirts).
 */
export function buildExtendedScenery(engine, type, root) {
  const skirt = (w, d) => {
    const sk = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, d), createToonMaterial(0xd5cbb8));
    sk.position.y = -1.15;
    root.add(sk);
  };

  if (type === "burger_shop") {
    skirt(5.2, 4.2);
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.0, 3.6), createToonMaterial(0xfff7eb));
    body.position.y = 1.5;
    body.castShadow = true;
    addToonOutline(body, 1.04);
    root.add(body);
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.65, 4.0),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ef4444", "#fbbf24", 10) })
    );
    awning.position.y = 3.25;
    root.add(awning);
    // Giant cartoon cheeseburger on roof!
    const bunBot = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.05, 0.35, 14), createToonMaterial(0xeab676));
    bunBot.position.y = 3.8;
    root.add(bunBot);
    const patty = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.32, 14), createToonMaterial(0x78350f));
    patty.position.y = 4.12;
    root.add(patty);
    const cheese = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 1.85), createToonMaterial(0xfacc15));
    cheese.position.y = 4.32;
    cheese.rotation.y = 0.4;
    root.add(cheese);
    const bunTop = new THREE.Mesh(new THREE.SphereGeometry(1.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), createToonMaterial(0xeab676));
    bunTop.position.y = 4.35;
    addToonOutline(bunTop, 1.06);
    root.add(bunTop);
    return true;
  }

  if (type === "cotton_candy_stall") {
    skirt(3.2, 2.4);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 1.8), createToonMaterial(0xf9a8d4));
    body.position.y = 0.9;
    addToonOutline(body, 1.05);
    root.add(body);
    const cloudCols = [0xffb3d9, 0xbae6fd, 0xfef08a];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.58, 10, 8), createToonMaterial(cloudCols[i]));
      c.position.set((i - 1) * 0.65, 2.5 + (i === 1 ? 0.35 : 0), 0);
      addToonOutline(c, 1.07);
      root.add(c);
    }
    return true;
  }

  if (type === "souvenir_shop") {
    skirt(5.4, 4.4);
    const box = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.6, 3.8), createToonMaterial(0x60c5f1));
    box.position.y = 1.8;
    box.castShadow = true;
    addToonOutline(box, 1.035);
    root.add(box);
    const ribbon1 = new THREE.Mesh(new THREE.BoxGeometry(4.95, 3.65, 0.6), createToonMaterial(0xffd166));
    ribbon1.position.y = 1.8;
    root.add(ribbon1);
    const ribbon2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.65, 3.95), createToonMaterial(0xffd166));
    ribbon2.position.y = 1.8;
    root.add(ribbon2);
    for (const sx of [-0.65, 0.65]) {
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.16, 8, 14), createToonMaterial(0xff7657));
      bow.position.set(sx, 4.05, 0);
      root.add(bow);
    }
    return true;
  }

  if (type === "restroom_plaza") {
    skirt(5.4, 4.0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 3.4), createToonMaterial(0xe0f2fe));
    body.position.y = 1.4;
    addToonOutline(body, 1.035);
    root.add(body);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.55, 3.8), createToonMaterial(0x38bdf8));
    roof.position.y = 3.05;
    root.add(roof);
    for (const [sx, col] of [[-1.1, 0x38bdf8], [1.1, 0xf472b6]]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.14), createToonMaterial(col));
      door.position.set(sx, 1.0, 1.74);
      root.add(door);
    }
    return true;
  }

  if (type === "clock_tower") {
    skirt(4.6, 4.6);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(3.4, 11.5, 3.4), createToonMaterial(0xfff7eb));
    shaft.position.y = 5.75;
    shaft.castShadow = true;
    addToonOutline(shaft, 1.03);
    root.add(shaft);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.8, 4.6, 4), createToonMaterial(0x3b82f6));
    spire.position.y = 13.8;
    spire.rotation.y = Math.PI * 0.25;
    addToonOutline(spire, 1.04);
    root.add(spire);
    for (const fz of [1.75, -1.75]) {
      const face = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.12, 16), createToonMaterial(0xfef9c3));
      face.rotation.x = Math.PI * 0.5;
      face.position.set(0, 9.2, fz);
      root.add(face);
    }
    return true;
  }

  if (type === "hedge_maze") {
    skirt(11.0, 11.0);
    const hedgeMat = createToonMaterial(0x22c55e);
    const walls = [
      [0, -4.8, 10.2, 0.7], [-4.8, 0, 0.7, 10.2], [4.8, 0, 0.7, 10.2],
      [-2.8, 4.8, 4.6, 0.7], [2.8, 4.8, 4.6, 0.7],
      [0, -2.4, 5.8, 0.65], [-2.5, 0.8, 0.65, 4.8], [2.5, 0.4, 0.65, 5.2],
    ];
    for (const [wx, wz, w, d] of walls) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), hedgeMat);
      m.position.set(wx, 1.1, wz);
      addToonOutline(m, 1.03);
      root.add(m);
    }
    const trophy = new THREE.Mesh(new THREE.OctahedronGeometry(0.9, 0), createToonMaterial(0xffd166));
    trophy.position.y = 2.0;
    root.add(trophy);
    return true;
  }

  if (type === "hot_air_pad") {
    skirt(6.8, 6.8);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.4, 18), createToonMaterial(0xffe8c2));
    pad.position.y = 0.2;
    root.add(pad);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.6), createToonMaterial(0xd99b66));
    basket.position.y = 1.4;
    addToonOutline(basket, 1.05);
    root.add(basket);
    const env = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 16, 12),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#ffd166", 10) })
    );
    env.scale.set(1, 1.18, 1);
    env.position.y = 6.2;
    env.castShadow = true;
    addToonOutline(env, 1.035);
    root.add(env);
    return true;
  }

  if (type === "neon_arch") {
    const cols = [0xff7657, 0xffd166, 0x34d399, 0x38bdf8, 0xc084fc];
    cols.forEach((hex, idx) => {
      const mat = new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.65 });
      engine.nightLights.push(mat);
      const r = 4.2 + idx * 0.34;
      const arc = new THREE.Mesh(new THREE.TorusGeometry(r, 0.16, 8, 28, Math.PI), mat);
      arc.position.y = 0.2;
      root.add(arc);
    });
    return true;
  }

  return false;
}
