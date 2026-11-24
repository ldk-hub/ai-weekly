import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { createToonMaterial, addToonOutline, getCarnivalStripeTexture } from "./ToonMaterials.js";

const CHARACTER_MODELS = {
  Knight: "assets/models/characters/Knight.glb",
  Mage: "assets/models/characters/Mage.glb",
  Rogue: "assets/models/characters/Rogue.glb",
  Rogue_Hooded: "assets/models/characters/Rogue_Hooded.glb",
  Barbarian: "assets/models/characters/Barbarian.glb",
};

export const AVATAR_KEYS = Object.keys(CHARACTER_MODELS);
export const AVATAR_LABELS = {
  Knight: "기사 나이트",
  Mage: "아스트랄 메이지",
  Rogue: "스카웃 로그",
  Rogue_Hooded: "후드 탐험가",
  Barbarian: "하이퍼 바바리안",
};

const OUTFIT_COLORS = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7, 0xf9a8d4, 0xc4b5fd, 0xfb923c, 0x38bdf8];
const PANTS_COLORS = [0x334155, 0x475569, 0x4c3d5e, 0x2c4a6b, 0x6b4c3b];
const SKIN_COLORS = [0xffe4c8, 0xffd7b5, 0xf8cfa9];
const HAIR_COLORS = [0x2a1f2d, 0x5c3a28, 0xc98a4b, 0x3b4d7a, 0x8b5cf6, 0xe06d88];
const HAIR_STYLES = ["bob", "ponytail", "twin_buns", "spiky", "wavy"];
const HAT_STYLES = ["bunny", "beret", "cap", "bow", "star", "none"];
const UMBRELLA_PAIRS = [
  ["#ff7657", "#fff7eb"],
  ["#38bdf8", "#e0f2fe"],
  ["#f472b6", "#fff1f2"],
  ["#fbbf24", "#fefce8"],
  ["#34d399", "#ecfdf5"],
  ["#a78bfa", "#f5f3ff"],
];

const PERSONAS = [
  { key: "thrill", label: "스릴 매니아", pref: ["ride", "coaster"], favRide: "스타보드 하이퍼 코스터" },
  { key: "foodie", label: "공원 미식가", pref: ["food", "bench"], favRide: "아이스크림 카페" },
  { key: "photo", label: "포토그래퍼", pref: ["photo", "ride"], favRide: "위클리 동화 성" },
  { key: "tech", label: "AI 덕후", pref: ["pavilion", "billboard"], favRide: "AI위클리 파빌리온" },
  { key: "chill", label: "여유 산책러", pref: ["bench", "photo", "ride"], favRide: "위클리 대관람차" },
];

const GUEST_NAMES = [
  "민지", "준호", "서연", "도윤", "하린", "시우", "지아", "현우",
  "유나", "건우", "소율", "태윤", "채원", "은우", "다은", "지훈",
  "수빈", "예준", "아린", "민서", "윤호", "지유", "승현", "하은",
];

const CHAT_PAIRS = [
  ["안녕! 하이퍼 코스터 타봤어?", "응! 뱅크턴 구간 진짜 짜릿해!"],
  ["저기 동화 성 앞에서 사진 찍을까?", "좋아! 불꽃놀이 때 또 찍자!"],
  ["아이스크림 카페 민트초코 맛있대!", "오 나도 먹으러 가야겠다!"],
  ["오늘 AI위클리 1위 플러그인 봤어?", "방금 전광판에서 확인했지!"],
  ["대관람차 위에서 공원 다 보이더라!", "노을 질 때 타면 최고겠네!"],
];

const STATE_LABELS = {
  WALKING_TO_POI: "보행로 따라 이동 중",
  QUEUING_RIDE: "티켓 구매 · 대기열 줄 서는 중",
  RIDING_RIDE: "놀이기구 탑승 중!",
  WATCHING_RIDE: "놀이기구 구경 · 환호 중",
  EATING_SNACK: "달콤한 간식 먹는 중",
  RESTING: "벤치·광장에서 휴식 중",
  TAKING_PHOTO: "기념사진 촬영 중",
  READING_AI: "AI위클리 보드 감상 중",
  CHATTING: "친구와 즐겁게 대화 중",
  TALKING_TO_PLAYER: "당신과 대화 중",
};

/**
 * Creates a colorful scalloped cartoon rain umbrella mesh (starts collapsed scale 0).
 */
function createCartoonUmbrella(variantIdx = 0) {
  const g = new THREE.Group();
  const [c1, c2] = UMBRELLA_PAIRS[variantIdx % UMBRELLA_PAIRS.length];
  const poleMat = createToonMaterial(0xe2e8f0);
  const handleMat = createToonMaterial(0x8d5b3c);
  const canopyMat = createToonMaterial(0xffffff, {
    map: getCarnivalStripeTexture(c1, c2, 8),
    side: THREE.DoubleSide,
  });

  // Handle + vertical shaft
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 6, 10, Math.PI), handleMat);
  handle.position.set(0, -0.05, 0);
  handle.rotation.z = Math.PI;
  g.add(handle);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.38, 6), poleMat);
  shaft.position.y = 0.68;
  g.add(shaft);

  // Scalloped dome canopy
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.86, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.44),
    canopyMat
  );
  canopy.position.y = 0.72;
  canopy.scale.set(1.0, 0.78, 1.0);
  canopy.castShadow = true;
  addToonOutline(canopy, 1.045);
  g.add(canopy);

  // Golden top finial tip
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), createToonMaterial(0xffd166));
  tip.position.y = 1.44;
  g.add(tip);

  g.visible = false;
  g.scale.setScalar(0.001);
  return g;
}

/**
 * Creates a floating pastel balloon prop on a string.
 */
function createBalloonProp(colorHex = 0xf9a8d4) {
  const bg = new THREE.Group();
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.011, 0.011, 1.25, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  string.position.set(0, 0.62, 0);
  bg.add(string);

  const balloon = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 10),
    createToonMaterial(colorHex, { emissive: 0x331122, emissiveIntensity: 0.12 })
  );
  balloon.scale.set(0.9, 1.14, 0.9);
  balloon.position.set(0, 1.48, 0);
  addToonOutline(balloon, 1.07);
  bg.add(balloon);

  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.08, 6), createToonMaterial(colorHex));
  knot.position.set(0, 1.14, 0);
  bg.add(knot);
  return bg;
}

/**
 * Expressive, Articulated Stylized Cartoon Chibi Guest (Animal Crossing × Planet Coaster aesthetic).
 * Includes articulated legs, arms, head, 5 sculpted hairstyles, park hats, backpack,
 * rain umbrella, ice cream snack, retro camera with flash, and balloon.
 */
function createDetailedCartoonGuest(variantIdx = 0) {
  const root = new THREE.Group();

  const outfitHex = OUTFIT_COLORS[variantIdx % OUTFIT_COLORS.length];
  const accentHex = OUTFIT_COLORS[(variantIdx + 3) % OUTFIT_COLORS.length];
  const pantsHex = PANTS_COLORS[variantIdx % PANTS_COLORS.length];
  const skinHex = SKIN_COLORS[variantIdx % SKIN_COLORS.length];
  const hairHex = HAIR_COLORS[variantIdx % HAIR_COLORS.length];

  const outfitMat = createToonMaterial(outfitHex);
  const accentMat = createToonMaterial(accentHex);
  const pantsMat = createToonMaterial(pantsHex);
  const skinMat = createToonMaterial(skinHex);
  const hairMat = createToonMaterial(hairHex);
  const whiteMat = createToonMaterial(0xfffbf5);
  const shoeMat = createToonMaterial(0x283142);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e1629 });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.78 });

  // 1. Articulated Left & Right Legs (hip pivot at y = 0.54)
  const buildLeg = (sx) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(sx, 0.54, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.24, 6, 8), pantsMat);
    thigh.position.y = -0.18;
    thigh.castShadow = true;
    addToonOutline(thigh, 1.09);
    legPivot.add(thigh);

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.12, 8), whiteMat);
    sock.position.y = -0.36;
    legPivot.add(sock);

    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), shoeMat);
    shoe.position.set(0, -0.45, 0.05);
    shoe.scale.set(0.95, 0.72, 1.38);
    addToonOutline(shoe, 1.09);
    legPivot.add(shoe);

    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.04, 0.29), whiteMat);
    sole.position.set(0, -0.51, 0.05);
    legPivot.add(sole);

    return legPivot;
  };

  const leftLeg = buildLeg(-0.13);
  const rightLeg = buildLeg(0.13);
  root.add(leftLeg, rightLeg);

  // 2. Sculpted Torso + Layered Jacket/Dress + Collar + Mini Backpack
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.56;
  root.add(torsoGroup);

  const isDress = variantIdx % 2 === 1;
  const torsoMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.21, isDress ? 0.34 : 0.25, 0.54, 14),
    outfitMat
  );
  torsoMesh.position.y = 0.27;
  torsoMesh.castShadow = true;
  addToonOutline(torsoMesh, 1.065);
  torsoGroup.add(torsoMesh);

  // Cute shirt collar / scarf rim
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 8, 16), whiteMat);
  collar.rotation.x = Math.PI * 0.5;
  collar.position.y = 0.52;
  torsoGroup.add(collar);

  // Decorative outfit hem / belt stripe
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(isDress ? 0.31 : 0.255, isDress ? 0.33 : 0.26, 0.08, 14), accentMat);
  belt.position.y = isDress ? 0.08 : 0.14;
  torsoGroup.add(belt);

  // Cute theme-park mini backpack on back!
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.17), accentMat);
  pack.position.set(0, 0.28, -0.26);
  pack.castShadow = true;
  addToonOutline(pack, 1.08);
  torsoGroup.add(pack);
  const packPocket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.06), whiteMat);
  packPocket.position.set(0, 0.19, -0.35);
  torsoGroup.add(packPocket);

  // 3. Articulated Left & Right Arms (shoulder pivot at y = 0.48 inside torsoGroup)
  const buildArm = (sx) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(sx, 0.46, 0);

    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.082, 0.22, 6, 8), outfitMat);
    sleeve.position.y = -0.15;
    sleeve.castShadow = true;
    addToonOutline(sleeve, 1.1);
    armPivot.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.088, 10, 8), skinMat);
    hand.position.set(0, -0.32, 0.02);
    addToonOutline(hand, 1.12);
    armPivot.add(hand);

    return armPivot;
  };

  const leftArm = buildArm(-0.29);
  const rightArm = buildArm(0.29);
  torsoGroup.add(leftArm, rightArm);

  // Attach interactive props to hands
  const umbrellaGroup = createCartoonUmbrella(variantIdx);
  umbrellaGroup.position.set(0.02, -0.28, 0.12);
  // Counter-rotate when arm lifts forward so umbrella stays straight upright
  rightArm.add(umbrellaGroup);

  // Snack prop (pastel double-scoop ice cream cone) on right hand
  const snackGroup = new THREE.Group();
  snackGroup.position.set(0, -0.30, 0.14);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.20, 8), createToonMaterial(0xeab676));
  cone.rotation.x = Math.PI;
  snackGroup.add(cone);
  const scoop1 = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), createToonMaterial(0xffb3d9));
  scoop1.position.y = 0.12;
  snackGroup.add(scoop1);
  const scoop2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), createToonMaterial(0x99f6e4));
  scoop2.position.y = 0.22;
  snackGroup.add(scoop2);
  snackGroup.visible = false;
  rightArm.add(snackGroup);

  // Camera prop + flash sphere on right hand
  const cameraGroup = new THREE.Group();
  cameraGroup.position.set(-0.08, -0.28, 0.22);
  const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.12), shoeMat);
  cameraGroup.add(camBody);
  const camLens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.08, 10), createToonMaterial(0x94a3b8));
  camLens.rotation.x = Math.PI * 0.5;
  camLens.position.z = 0.08;
  cameraGroup.add(camLens);
  const flashSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xfffff0, transparent: true, opacity: 0.9 })
  );
  flashSphere.position.set(0, 0.06, 0.16);
  flashSphere.visible = false;
  cameraGroup.add(flashSphere);
  cameraGroup.visible = false;
  rightArm.add(cameraGroup);

  // Floating pastel park balloon on left hand
  const balloonGroup = createBalloonProp(OUTFIT_COLORS[(variantIdx + 4) % OUTFIT_COLORS.length]);
  balloonGroup.position.set(-0.05, -0.28, 0.05);
  balloonGroup.visible = variantIdx % 3 === 0;
  leftArm.add(balloonGroup);

  // 4. Expressive Chibi Head + Sculpted Hairstyle + Face + Park Hat
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.58;
  torsoGroup.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), skinMat);
  head.position.y = 0.34;
  head.scale.set(1.04, 0.96, 0.98);
  head.castShadow = true;
  addToonOutline(head, 1.055);
  headGroup.add(head);

  // Cute side ears
  for (const sx of [-0.35, 0.35]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), skinMat);
    ear.position.set(sx, 0.32, 0.0);
    headGroup.add(ear);
  }

  // Glossy eyes + sparkles + rosy cheeks + tiny smile (+Z face)
  const eyeGeo = new THREE.SphereGeometry(0.052, 10, 8);
  const shineGeo = new THREE.SphereGeometry(0.019, 6, 6);
  const blushGeo = new THREE.CircleGeometry(0.062, 10);
  for (const sx of [-0.135, 0.135]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx, 0.35, 0.33);
    eye.scale.set(0.95, 1.15, 0.8);
    headGroup.add(eye);

    const shine = new THREE.Mesh(shineGeo, shineMat);
    shine.position.set(sx + 0.017, 0.376, 0.372);
    headGroup.add(shine);

    const blush = new THREE.Mesh(blushGeo, blushMat);
    blush.position.set(sx * 1.48, 0.27, 0.318);
    blush.rotation.y = sx * 0.55;
    headGroup.add(blush);
  }

  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.014, 6, 10, Math.PI), eyeMat);
  smile.position.set(0, 0.24, 0.345);
  smile.rotation.z = Math.PI;
  headGroup.add(smile);

  // Sculpted Hairstyles (full hair cap + front bangs + distinctive silhouette!)
  const hairStyle = HAIR_STYLES[variantIdx % HAIR_STYLES.length];
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.385, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.position.set(0, 0.37, -0.025);
  hairCap.rotation.x = -0.22;
  addToonOutline(hairCap, 1.05);
  headGroup.add(hairCap);

  // Front bangs tuft
  for (const bx of [-0.16, 0, 0.16]) {
    const bang = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), hairMat);
    bang.scale.set(1.1, 0.72, 0.7);
    bang.position.set(bx, 0.54, 0.27 - Math.abs(bx) * 0.35);
    headGroup.add(bang);
  }

  if (hairStyle === "bob") {
    for (const sx of [-0.29, 0.29]) {
      const side = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.24, 6, 8), hairMat);
      side.position.set(sx, 0.26, -0.04);
      addToonOutline(side, 1.07);
      headGroup.add(side);
    }
    const backBob = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), hairMat);
    backBob.position.set(0, 0.26, -0.18);
    headGroup.add(backBob);
  } else if (hairStyle === "ponytail") {
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 6, 10), accentMat);
    tie.position.set(0, 0.44, -0.38);
    headGroup.add(tie);
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.32, 6, 10), hairMat);
    tail.position.set(0, 0.28, -0.46);
    tail.rotation.x = 0.45;
    addToonOutline(tail, 1.08);
    headGroup.add(tail);
  } else if (hairStyle === "twin_buns") {
    for (const sx of [-0.30, 0.30]) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), hairMat);
      bun.position.set(sx, 0.62, -0.08);
      addToonOutline(bun, 1.08);
      headGroup.add(bun);
      const ribbon = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 6, 10), accentMat);
      ribbon.position.set(sx * 0.92, 0.56, -0.06);
      ribbon.rotation.y = sx > 0 ? 0.5 : -0.5;
      headGroup.add(ribbon);
    }
  } else if (hairStyle === "spiky") {
    for (let k = -2; k <= 2; k++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.10, 0.26, 6), hairMat);
      spike.position.set(k * 0.11, 0.72 - Math.abs(k) * 0.04, 0.04 - Math.abs(k) * 0.05);
      spike.rotation.z = -k * 0.26;
      headGroup.add(spike);
    }
  } else {
    // Wavy layered locks
    for (const sx of [-0.31, 0.31]) {
      const curl1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), hairMat);
      curl1.position.set(sx, 0.24, -0.06);
      headGroup.add(curl1);
      const curl2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), hairMat);
      curl2.position.set(sx * 0.95, 0.08, -0.10);
      headGroup.add(curl2);
    }
  }

  // Park Hat / Headband Accessories (cleanly layered on hair)
  const hatStyle = HAT_STYLES[variantIdx % HAT_STYLES.length];
  if (hatStyle === "bunny") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.04, 8, 20, Math.PI), accentMat);
    band.position.set(0, 0.42, 0);
    headGroup.add(band);
    for (const sx of [-0.15, 0.15]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.072, 0.26, 6, 8), whiteMat);
      ear.position.set(sx, 0.88, 0);
      ear.rotation.z = sx * -0.45;
      addToonOutline(ear, 1.09);
      headGroup.add(ear);
    }
  } else if (hatStyle === "beret") {
    const beret = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 10), accentMat);
    beret.scale.set(1.12, 0.44, 1.12);
    beret.position.set(0.05, 0.72, -0.03);
    beret.rotation.z = -0.18;
    addToonOutline(beret, 1.06);
    headGroup.add(beret);
  } else if (hatStyle === "cap") {
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.39, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.46), accentMat);
    capTop.position.y = 0.44;
    headGroup.add(capTop);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.048, 0.34), accentMat);
    brim.position.set(0, 0.52, 0.34);
    headGroup.add(brim);
  } else if (hatStyle === "bow") {
    for (const sx of [-0.14, 0.14]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.21, 6), accentMat);
      wing.position.set(sx, 0.76, 0.06);
      wing.rotation.z = sx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      headGroup.add(wing);
    }
  } else if (hatStyle === "star") {
    const starPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), createToonMaterial(0xfde047));
    starPin.position.set(0.24, 0.68, 0.16);
    addToonOutline(starPin, 1.09);
    headGroup.add(starPin);
  }

  // Floating 3D Emote Sparkle/Heart above head (hidden unless cheering/interacting)
  const emoteMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16, 0),
    new THREE.MeshBasicMaterial({ color: 0xff6b9d })
  );
  emoteMesh.position.set(0, 2.08, 0);
  emoteMesh.visible = false;
  root.add(emoteMesh);

  return {
    root,
    parts: {
      leftLeg,
      rightLeg,
      torsoGroup,
      leftArm,
      rightArm,
      headGroup,
      umbrellaGroup,
      snackGroup,
      cameraGroup,
      flashSphere,
      balloonGroup,
      emoteMesh,
    },
  };
}

/**
 * Manages Full-3D KayKit Rigged Player Avatar, Remote Multi-User Ride-Along Avatars,
 * and Autonomous Multi-State AI Park Guests with Rain Umbrellas & Direct Social Interaction.
 */
export class CrowdAndAvatarEngine {
  constructor(scene, terrainEngine, overlayLayerEl) {
    this.scene = scene;
    this.terrain = terrainEngine;
    this.overlayLayer = overlayLayerEl;
    this.loader = new GLTFLoader();
    this.modelCache = new Map();

    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_Actors";
    this.scene.add(this.group);

    this.player = {
      classKey: "Knight",
      root: new THREE.Group(),
      model: null,
      mixer: null,
      actions: {},
      activeAction: "",
      position: new THREE.Vector3(0, 0, 124),
      velocity: new THREE.Vector3(),
      facing: Math.PI,
      vy: 0,
      grounded: true,
      riding: null,
      umbrellaGroup: null,
      umbrellaOpen: 0,
      balloonGroup: null,
      moveTarget: null,
      bubbleEl: null,
      bubbleRemaining: 0,
    };
    this.player.root.position.copy(this.player.position);
    this.group.add(this.player.root);
    this.player.bubbleEl = this._createBubbleEl();

    // Animated Tap/Click-to-Move destination beacon ring on ground
    const markerGeo = new THREE.RingGeometry(0.45, 0.72, 24);
    markerGeo.rotateX(-Math.PI * 0.5);
    this.moveMarker = new THREE.Mesh(
      markerGeo,
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    this.moveMarker.visible = false;
    this.group.add(this.moveMarker);

    // Give the player a cute automatic rain umbrella too!
    this.player.umbrellaGroup = createCartoonUmbrella(1);
    this.player.umbrellaGroup.position.set(0.42, 1.05, 0.15);
    this.player.root.add(this.player.umbrellaGroup);

    this.remotePeers = new Map();
    this.aiGuests = [];
    this.guestPickables = [];
    this.poiList = [];
    this.activeTalkingGuestId = null;

    // Real Money-Based Theme Park Economy (RCT / Planet Coaster Finance Loop)
    this.economy = {
      balance: 250000,
      totalRevenue: 0,
      ticketsSold: 0,
      snacksSold: 0,
      entranceFee: 5000,
      coasterPrice: 5500,
      ridePrice: 4000,
      snackPrice: 3500,
      rideEarnings: new Map(), // name -> { revenue, riders }
    };
    this.onPayment = null;
    this.coinPopups = []; // { el, pos, age }
    this._seatCounters = new Map(); // rideId -> next seat slot index
    this.guestLines = [
      "스타보드 코스터 뱅크턴 진짜 부드럽다!",
      "밤에 대관람차에서 보는 불꽃놀이 기대돼요!",
      "벤치마크 드롭타워 낙하 스릴 최고!",
      "AI위클리 파빌리온에서 오늘의 뉴스도 보고 가야지!",
    ];
    this._projVec = new THREE.Vector3();
    this._moveDir = new THREE.Vector3();
    this._bubbleTimer = 0;
    this._simTime = 0;
    this._frameTick = 0;

    this._mountFallbackToPlayer();
    this._spawnAIGuests(24);
  }

  setSpawnPosition(x, z) {
    const gy = this.terrain ? Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(x, z)) : 0;
    this.player.position.set(x, gy, z);
    this.player.facing = Math.PI; // Facing North (-Z) through Grand Arch into the park!
    this.player.root.position.copy(this.player.position);
    this.player.root.rotation.y = this.player.facing;
  }

  /**
   * Feeds live park rides, food stalls, photo spots, benches, and pavilions into Guest AI brains.
   */
  setParkWorldContext(worldData) {
    const list = [];
    if (!worldData) return;

    for (const c of worldData.coasters || []) {
      const n0 = c.nodes?.[0];
      if (n0) {
        list.push({
          id: c.id,
          category: "coaster",
          name: c.name || "롤러코스터",
          x: n0.x + 5,
          z: n0.z + 6,
          lookX: n0.x,
          lookZ: n0.z,
          radius: 7.5,
        });
      }
    }
    for (const r of worldData.rides || []) {
      list.push({
        id: r.id,
        category: "ride",
        name: r.name || "놀이기구",
        x: r.x,
        z: r.z + 10.5,
        lookX: r.x,
        lookZ: r.z,
        radius: 5.5,
      });
    }
    for (const p of worldData.pavilions || []) {
      list.push({
        id: p.id,
        category: "pavilion",
        name: p.title || "AI 파빌리온",
        x: p.x,
        z: p.z + 6.5,
        lookX: p.x,
        lookZ: p.z,
        radius: 4.5,
      });
    }
    for (const s of worldData.scenery || []) {
      if (["cafe_icecream", "popcorn_cart", "balloon_stall", "kiosk"].includes(s.type)) {
        list.push({
          id: s.id,
          category: "food",
          name: s.type === "cafe_icecream" ? "아이스크림 카페" : s.type === "popcorn_cart" ? "팝콘 카트" : "풍선 상점",
          x: s.x,
          z: s.z + 3.4,
          lookX: s.x,
          lookZ: s.z,
          radius: 3.0,
        });
      } else if (["heart_photozone", "fairy_castle", "grand_arch", "fountain", "mascot_statue"].includes(s.type)) {
        list.push({
          id: s.id,
          category: "photo",
          name: s.type === "fairy_castle" ? "동화 성" : s.type === "grand_arch" ? "위클리랜드 정문" : "포토존",
          x: s.x,
          z: s.z + (s.type === "fairy_castle" ? 13 : 6.2),
          lookX: s.x,
          lookZ: s.z,
          radius: 5.0,
        });
      } else if (s.type === "bench") {
        list.push({
          id: s.id,
          category: "bench",
          name: "공원 벤치",
          x: s.x,
          z: s.z + 1.5,
          lookX: s.x,
          lookZ: s.z + 4,
          radius: 2.2,
        });
      }
    }
    this.poiList = list;

    // Assign fresh intelligent goals to all guests immediately!
    for (const g of this.aiGuests) {
      if (g.state !== "TALKING_TO_PLAYER") {
        this._pickNextGoal(g, false);
      }
    }
  }

  _mountFallbackToPlayer() {
    const built = createDetailedCartoonGuest(0);
    this.player.model = built.root;
    this.player.root.add(this.player.model);
  }

  async preloadCharacterModels() {
    const entries = Object.entries(CHARACTER_MODELS);
    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const gltf = await this.loader.loadAsync(url);
          this.modelCache.set(key, gltf);
        } catch (err) {
          console.warn(`[CrowdAndAvatarEngine] GLB fallback for ${key}:`, err?.message || err);
        }
      })
    );
    this.setPlayerClass(this.player.classKey);
  }

  setPlayerClass(classKey) {
    const key = CHARACTER_MODELS[classKey] ? classKey : "Knight";
    this.player.classKey = key;

    if (this.player.model) {
      this.player.root.remove(this.player.model);
      this.player.model = null;
    }
    this.player.mixer = null;
    this.player.actions = {};
    this.player.activeAction = "";

    const cached = this.modelCache.get(key);
    if (!cached) {
      this._mountFallbackToPlayer();
      return;
    }

    const cloned = SkeletonUtils.clone(cached.scene);
    cloned.scale.setScalar(0.88);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.player.root.add(cloned);
    this.player.model = cloned;

    if (cached.animations?.length) {
      const mixer = new THREE.AnimationMixer(cloned);
      const findClip = (patterns) =>
        cached.animations.find((c) => patterns.some((p) => c.name.toLowerCase().includes(p))) || cached.animations[0];
      const map = {
        idle: findClip(["idle", "standing"]),
        walk: findClip(["walk", "jog"]),
        run: findClip(["run", "sprint"]),
        sit: findClip(["sit", "cheer", "idle"]),
      };
      for (const [name, clip] of Object.entries(map)) {
        if (clip) this.player.actions[name] = mixer.clipAction(clip);
      }
      this.player.mixer = mixer;
      this._playPlayerAnim("idle");
    }
  }

  _playPlayerAnim(name) {
    if (!this.player.mixer || this.player.activeAction === name) return;
    const next = this.player.actions[name];
    if (!next) return;
    const prev = this.player.actions[this.player.activeAction];
    if (prev) prev.fadeOut(0.18);
    next.reset().fadeIn(0.18).play();
    this.player.activeAction = name;
  }

  setGuestReactionLines(lines) {
    if (Array.isArray(lines) && lines.length) {
      this.guestLines = lines;
    }
  }

  _spawnAIGuests(count) {
    this.guestPickables = [];
    for (let i = 0; i < count; i++) {
      const built = createDetailedCartoonGuest(i);
      const mesh = built.root;
      mesh.scale.setScalar(0.92 + (i % 3) * 0.05);

      const id = `ai-guest-${i}`;
      mesh.traverse((obj) => {
        if (obj.isMesh && !obj.userData.isToonOutline) {
          obj.userData = { pickKind: "guest", guestId: id };
          this.guestPickables.push(obj);
        }
      });

      // Spawn strictly ON laid park walkways (first 5 near South Entrance Promenade!)
      let startWpIdx = 0;
      let startPos;
      if (i < 5) {
        const near = this.terrain.findNearestWaypointIndex(0, 96 + (i % 4) * 6.5);
        startWpIdx = near.index;
        startPos = near.position.clone();
        startPos.x += ((i % 3) - 1) * 0.9;
      } else {
        const wp = this.terrain.getRandomWaypoint();
        startWpIdx = wp.index;
        startPos = wp.position.clone();
      }
      mesh.position.copy(startPos);
      this.group.add(mesh);

      const persona = PERSONAS[i % PERSONAS.length];
      const bubbleEl = i < 10 ? this._createBubbleEl() : null;
      const g = {
        id,
        index: i,
        name: `${GUEST_NAMES[i % GUEST_NAMES.length]} #${i + 1}`,
        persona,
        mesh,
        parts: built.parts,
        pos: startPos.clone(),
        facing: Math.PI,
        currentWpIdx: startWpIdx,
        routeQueue: [],
        laneOffset: ((i % 5) - 2) * 0.36,
        targetPos: startPos.clone(),
        lookPos: new THREE.Vector3(0, 0, 0),
        targetPoi: null,
        speed: 2.3 + (i % 4) * 0.35,
        phase: Math.random() * Math.PI * 2,
        state: "WALKING_TO_POI",
        stateTimer: 4 + Math.random() * 6,
        chatCooldown: 4 + Math.random() * 10,
        chatPartner: null,
        happiness: 72 + (i * 7) % 24,
        energy: 65 + (i * 11) % 30,
        fullness: 58 + (i * 13) % 34,
        wallet: 34000 + (i % 7) * 6500,
        ridesRidden: 0,
        ridingAttr: null,
        umbrellaOpen: 0,
        emoteTimer: 0,
        flashTimer: 0,
        hasBalloon: built.parts.balloonGroup.visible,
        quote: "위클리랜드 오늘 날씨도 좋고 완전 신나요!",
        bubbleEl,
        bubbleRemaining: 0,
      };
      this.aiGuests.push(g);
    }
  }

  onPathsChanged() {
    for (const g of this.aiGuests) {
      if (g.state === "RIDING_RIDE") continue;
      const near = this.terrain.findNearestWaypointIndex(g.pos.x, g.pos.z);
      g.currentWpIdx = near.index;
      g.routeQueue = [];
      if (g.state === "WALKING_TO_POI") {
        this._pickNextGoal(g, g.umbrellaOpen > 0.5);
      }
    }
  }

  resetGuestsToCurrentPaths() {
    for (let i = 0; i < this.aiGuests.length; i++) {
      const g = this.aiGuests[i];
      g.ridingAttr = null;
      g.routeQueue = [];
      let wp;
      if (i < 5) {
        wp = this.terrain.findNearestWaypointIndex(0, 96 + (i % 4) * 6.5);
      } else {
        wp = this.terrain.getRandomWaypoint();
      }
      g.currentWpIdx = wp.index;
      g.pos.copy(wp.position);
      g.mesh.position.copy(g.pos);
      this._pickNextGoal(g, false);
    }
    this.seedInitialParkActivity();
  }

  /**
   * Immediately populates rides & ride queues on park entry / stage switch
   * so coasters & flat rides have cheering NPC riders and live ticket sales right away!
   */
  seedInitialParkActivity() {
    const ridePois = this.poiList.filter((p) => (p.category === "coaster" || p.category === "ride") && p.id);
    if (!ridePois.length || this.aiGuests.length < 14) return;

    // 1. Place 4 guests right at ride entrances in QUEUING_RIDE (pay & board within 0.8~2.2s)
    for (let k = 0; k < 4; k++) {
      const g = this.aiGuests[5 + k];
      const poi = ridePois[k % ridePois.length];
      const wp = this.terrain.findNearestWaypointIndex(poi.x, poi.z);
      g.currentWpIdx = wp.index;
      g.routeQueue = [];
      g.pos.copy(wp.position);
      g.mesh.position.copy(g.pos);
      g.targetPoi = poi;
      g.lookPos.set(poi.lookX, 0, poi.lookZ);
      g.facing = Math.atan2(poi.lookX - g.pos.x, poi.lookZ - g.pos.z);
      g.state = "QUEUING_RIDE";
      g.stateTimer = 0.65 + k * 0.45;
      g.quote = `${poi.name} 탑승 대기 중!`;
    }

    // 2. Place 5 guests ALREADY seated & riding on the coaster and top flat rides!
    for (let k = 0; k < 5; k++) {
      const g = this.aiGuests[9 + k];
      const poi = ridePois[k % ridePois.length];
      const wp = this.terrain.findNearestWaypointIndex(poi.x, poi.z);
      g.currentWpIdx = wp.index;
      g.routeQueue = [];
      g.pos.copy(wp.position);
      g.targetPoi = poi;
      const isCoaster = poi.category === "coaster";
      const prevSlot = this._seatCounters.get(poi.id) || 0;
      this._seatCounters.set(poi.id, (prevSlot + 1) % 8);
      g.ridingAttr = {
        kind: isCoaster ? "coaster" : "ride",
        id: poi.id,
        name: poi.name,
        seatSlot: prevSlot,
        exitWpIdx: wp.index,
      };
      g.ridesRidden = Math.max(1, g.ridesRidden);
      g.state = "RIDING_RIDE";
      g.stateTimer = 8.5 + k * 1.4;
      g.emoteTimer = 3.0;
      g.parts.umbrellaGroup.visible = false;
      g.parts.snackGroup.visible = false;
      g.parts.cameraGroup.visible = false;
    }
  }

  setEconomyPrices({ entranceFee, coasterPrice, ridePrice, snackPrice } = {}) {
    if (Number.isFinite(entranceFee)) this.economy.entranceFee = Math.max(0, Math.min(20000, entranceFee));
    if (Number.isFinite(coasterPrice)) this.economy.coasterPrice = Math.max(0, Math.min(15000, coasterPrice));
    if (Number.isFinite(ridePrice)) this.economy.ridePrice = Math.max(0, Math.min(12000, ridePrice));
    if (Number.isFinite(snackPrice)) this.economy.snackPrice = Math.max(0, Math.min(10000, snackPrice));
  }

  getEconomySnapshot() {
    const topRides = [...this.economy.rideEarnings.entries()]
      .map(([name, stat]) => ({ name, revenue: stat.revenue, riders: stat.riders }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
    const ridingNow = this.aiGuests.filter((g) => g.state === "RIDING_RIDE").length;
    const queuingNow = this.aiGuests.filter((g) => g.state === "QUEUING_RIDE").length;
    return {
      balance: this.economy.balance,
      totalRevenue: this.economy.totalRevenue,
      ticketsSold: this.economy.ticketsSold,
      snacksSold: this.economy.snacksSold,
      entranceFee: this.economy.entranceFee,
      coasterPrice: this.economy.coasterPrice,
      ridePrice: this.economy.ridePrice,
      snackPrice: this.economy.snackPrice,
      ridingNow,
      queuingNow,
      topRides,
    };
  }

  _recordPayment(g, amount, poiName, worldPos, isSnack = false) {
    if (amount <= 0) return;
    g.wallet = Math.max(0, g.wallet - amount);
    this.economy.balance += amount;
    this.economy.totalRevenue += amount;
    if (isSnack) this.economy.snacksSold++;
    else this.economy.ticketsSold++;

    const prev = this.economy.rideEarnings.get(poiName) || { revenue: 0, riders: 0 };
    prev.revenue += amount;
    prev.riders += 1;
    this.economy.rideEarnings.set(poiName, prev);

    this._spawnCoinPopup(worldPos, `+₩${amount.toLocaleString()}`);
    this.onPayment?.({ amount, poiName, balance: this.economy.balance, isSnack });

    // Refill guest wallet at ATM/gate loop so park economy stays lively indefinitely
    if (g.wallet < 4000) {
      g.wallet += 35000;
      this.economy.balance += this.economy.entranceFee;
      this.economy.totalRevenue += this.economy.entranceFee;
    }
  }

  _spawnCoinPopup(worldPos, text) {
    if (!this.overlayLayer || this.coinPopups.length >= 12) return;
    const el = document.createElement("div");
    el.className = "wl-coin-popup";
    el.textContent = text;
    this.overlayLayer.appendChild(el);
    this.coinPopups.push({
      el,
      pos: new THREE.Vector3(worldPos.x, (worldPos.y || 0) + 2.2, worldPos.z),
      age: 0,
      life: 1.55,
    });
  }

  _setPathStepTarget(g, wpIdx) {
    const wp = this.terrain.getWaypointPosition(wpIdx);
    // Keep sidewalk lane offset tiny (±0.72m) so guests stay strictly on the laid 4~5.4m walkway!
    const nextWp = g.routeQueue.length > 0 ? this.terrain.getWaypointPosition(g.routeQueue[0]) : wp;
    let dx = nextWp.x - wp.x;
    let dz = nextWp.z - wp.z;
    const len = Math.hypot(dx, dz);
    if (len > 0.05) {
      dx /= len;
      dz /= len;
      g.targetPos.set(wp.x - dz * g.laneOffset, wp.y, wp.z + dx * g.laneOffset);
    } else {
      g.targetPos.set(wp.x + g.laneOffset * 0.5, wp.y, wp.z);
    }
  }

  _pickNextGoal(g, isRaining = false) {
    g.chatPartner = null;
    g.parts.snackGroup.visible = false;
    g.parts.cameraGroup.visible = false;
    g.parts.flashSphere.visible = false;

    const nearCur = this.terrain.findNearestWaypointIndex(g.pos.x, g.pos.z);
    g.currentWpIdx = nearCur.index;

    // Need-driven & personality-weighted POI selection snapped to laid walkways!
    let desiredCats = [...g.persona.pref];
    if (isRaining && Math.random() < 0.55) {
      desiredCats = ["pavilion", "food"];
    } else if (g.energy < 38) {
      desiredCats = ["bench", "photo"];
    } else if (g.fullness < 40) {
      desiredCats = ["food"];
    }

    const candidates = this.poiList.filter((p) => desiredCats.includes(p.category) && p.id !== g.targetPoi?.id);
    const pool = candidates.length ? candidates : this.poiList;

    // Try up to 4 POIs to find a connected path-only route along laid walkways
    let chosenPoi = null;
    let route = [];
    for (let attempt = 0; attempt < 4 && pool.length > 0; attempt++) {
      const picked = pool[Math.floor(Math.random() * pool.length)];
      const goalNear = this.terrain.findNearestWaypointIndex(picked.x, picked.z);
      const r = this.terrain.findPathRoute(g.currentWpIdx, goalNear.index);
      if (r.length > 0) {
        chosenPoi = picked;
        route = r;
        break;
      }
    }

    // Fallback: pick another reachable random waypoint on the connected path graph
    if (!route.length) {
      const rnd = this.terrain.getRandomWaypoint();
      route = this.terrain.findPathRoute(g.currentWpIdx, rnd.index);
      if (!route.length) {
        const nxt = this.terrain.getNextWaypoint(g.currentWpIdx);
        route = [nxt.index];
      }
      chosenPoi = null;
    }

    g.targetPoi = chosenPoi;
    g.routeQueue = route;
    const firstWp = g.routeQueue.shift();
    if (firstWp !== undefined) {
      this._setPathStepTarget(g, firstWp);
      g.nextWpIdx = firstWp;
    } else {
      g.targetPos.copy(nearCur.position);
      g.nextWpIdx = g.currentWpIdx;
    }
    g.lookPos.set(chosenPoi?.lookX ?? g.targetPos.x, 0, chosenPoi?.lookZ ?? g.targetPos.z);
    g.state = "WALKING_TO_POI";
    g.stateTimer = 45;
  }

  _enterPoiActivity(g, isRaining) {
    const cat = g.targetPoi?.category || "ride";
    const poiName = g.targetPoi?.name || "위클리랜드";

    if (cat === "food") {
      const price = this.economy.snackPrice;
      if (g.wallet >= price && price <= 7500) {
        this._recordPayment(g, price, poiName, g.pos, true);
        g.state = "EATING_SNACK";
        g.stateTimer = 5.5 + Math.random() * 3.5;
        g.parts.snackGroup.visible = true;
        g.quote = `${poiName} (₩${price.toLocaleString()}) 꿀맛이에요!`;
        this._showGuestBubble(g, g.quote, 4.5);
      } else {
        g.quote = `${poiName} 가격이 조금 비싸네요…`;
        this._showGuestBubble(g, g.quote, 3.5);
        this._pickNextGoal(g, isRaining);
      }
    } else if (cat === "bench") {
      g.state = "RESTING";
      g.stateTimer = 6.5 + Math.random() * 3.5;
      g.quote = isRaining ? "우산 쓰고 잠깐 쉬었다 가야지~" : "바람도 시원하고 잠깐 쉬니까 좋네요!";
      this._showGuestBubble(g, g.quote, 4.2);
    } else if (cat === "photo") {
      g.state = "TAKING_PHOTO";
      g.stateTimer = 5.0 + Math.random() * 3.0;
      g.parts.cameraGroup.visible = true;
      g.flashTimer = 0.8;
      g.quote = `${poiName} 배경으로 인생샷 찰칵!`;
      this._showGuestBubble(g, g.quote, 4.5);
    } else if (cat === "pavilion" || cat === "billboard") {
      g.state = "READING_AI";
      g.stateTimer = 6.0 + Math.random() * 3.5;
      const line = this.guestLines[Math.floor(Math.random() * this.guestLines.length)];
      g.quote = isRaining ? `${poiName}에서 비도 피하고 AI 뉴스도 보고!` : line;
      this._showGuestBubble(g, g.quote, 4.8);
    } else if ((cat === "ride" || cat === "coaster") && g.targetPoi?.id) {
      const price = cat === "coaster" ? this.economy.coasterPrice : this.economy.ridePrice;
      const maxWilling = (cat === "coaster" ? 9500 : 7500) + g.happiness * 25;
      if (g.wallet >= price && price <= maxWilling) {
        g.state = "QUEUING_RIDE";
        g.stateTimer = 2.2 + Math.random() * 2.4;
        g.quote = `${poiName} 대기열 줄 서는 중! (₩${price.toLocaleString()})`;
        this._showGuestBubble(g, g.quote, 3.6);
      } else {
        g.state = "WATCHING_RIDE";
        g.stateTimer = 4.0;
        g.quote = `${poiName} 티켓이 조금 비싸네요… 구경만 할래요!`;
        this._showGuestBubble(g, g.quote, 4.0);
      }
    } else {
      g.state = "WATCHING_RIDE";
      g.stateTimer = 5.0 + Math.random() * 3.5;
      g.emoteTimer = 2.5;
      g.quote = `${poiName} 엄청 신나 보인다!`;
      this._showGuestBubble(g, g.quote, 4.2);
    }
  }

  _boardGuestOntoPoiRide(g) {
    const poi = g.targetPoi;
    if (!poi?.id) {
      this._pickNextGoal(g, false);
      return;
    }
    const isCoaster = poi.category === "coaster";
    const price = isCoaster ? this.economy.coasterPrice : this.economy.ridePrice;
    this._recordPayment(g, price, poi.name, g.pos, false);

    const prevSlot = this._seatCounters.get(poi.id) || 0;
    this._seatCounters.set(poi.id, (prevSlot + 1) % 8);
    g.ridingAttr = {
      kind: isCoaster ? "coaster" : "ride",
      id: poi.id,
      name: poi.name,
      seatSlot: prevSlot,
      exitWpIdx: g.currentWpIdx,
    };
    g.ridesRidden++;
    g.state = "RIDING_RIDE";
    g.stateTimer = 9.5 + Math.random() * 4.5;
    g.emoteTimer = 3.5;
    g.parts.umbrellaGroup.visible = false;
    g.parts.snackGroup.visible = false;
    g.parts.cameraGroup.visible = false;
    this._showGuestBubble(g, `와아! ${poi.name} 탑승 출발!!`, 3.5);
  }

  _disembarkGuest(g, isRaining) {
    const attr = g.ridingAttr;
    g.ridingAttr = null;
    const wpPos = this.terrain.getWaypointPosition(attr?.exitWpIdx ?? g.currentWpIdx);
    g.pos.copy(wpPos);
    g.mesh.position.copy(wpPos);
    g.happiness = Math.min(100, g.happiness + 18);
    g.energy = Math.max(15, g.energy - 12);
    g.emoteTimer = 2.5;
    if (attr?.name) {
      this._showGuestBubble(g, `${attr.name} 진짜 재밌었다! 또 타고 싶어!`, 4.2);
    }
    this._pickNextGoal(g, isRaining);
  }

  _showGuestBubble(g, text, duration = 4.5) {
    g.quote = text;
    if (!g.bubbleEl) return;
    g.bubbleEl.textContent = `${g.name.split(" ")[0]}: ${text}`;
    g.bubbleEl.hidden = false;
    g.bubbleRemaining = duration;
  }

  getGuestPickables() {
    return this.guestPickables;
  }

  findNearestGuest(worldPos, maxRadius = 4.5) {
    let best = null;
    let bestDist = Infinity;
    for (const g of this.aiGuests) {
      if (!g.mesh.visible) continue;
      const d = Math.hypot(worldPos.x - g.pos.x, worldPos.z - g.pos.z);
      if (d <= maxRadius && d < bestDist) {
        bestDist = d;
        best = g;
      }
    }
    if (!best) return null;
    return {
      kind: "guest",
      id: best.id,
      label: `${best.name} (${best.persona.label})와 대화하기`,
      pos: best.pos.clone(),
    };
  }

  getGuestSnapshot(guestId) {
    const g = this.aiGuests.find((x) => x.id === guestId);
    if (!g) return null;
    return {
      id: g.id,
      name: g.name,
      persona: g.persona.label,
      stateLabel: g.umbrellaOpen > 0.5 ? `우산 착용 · ${STATE_LABELS[g.state] || g.state}` : (STATE_LABELS[g.state] || g.state),
      quote: g.quote,
      happiness: Math.round(g.happiness),
      energy: Math.round(g.energy),
      fullness: Math.round(g.fullness),
      wallet: g.wallet,
      ridesRidden: g.ridesRidden,
      hasBalloon: g.hasBalloon,
    };
  }

  interactWithGuest(guestId, playerPos) {
    if (this.activeTalkingGuestId && this.activeTalkingGuestId !== guestId) {
      this.releaseTalkingGuest(this.activeTalkingGuestId);
    }
    const g = this.aiGuests.find((x) => x.id === guestId);
    if (!g) return null;
    this.activeTalkingGuestId = guestId;
    g.state = "TALKING_TO_PLAYER";
    g.stateTimer = 30;
    g.parts.snackGroup.visible = false;
    g.parts.cameraGroup.visible = false;
    g.emoteTimer = 2.6;
    if (playerPos) {
      g.lookPos.copy(playerPos);
      g.facing = Math.atan2(playerPos.x - g.pos.x, playerPos.z - g.pos.z);
    }
    const greet = g.umbrellaOpen > 0.5
      ? "어머, 안녕하세요! 비가 와서 우산 썼어요. 공원 구경 재밌으신가요?"
      : `안녕하세요! 저는 ${g.persona.label} ${g.name.split(" ")[0]}예요. 지금 ${g.targetPoi?.name || "공원"} 구경 중이에요!`;
    this._showGuestBubble(g, greet, 5.5);
    return this.getGuestSnapshot(guestId);
  }

  performGuestAction(guestId, action, playerPos) {
    const g = this.aiGuests.find((x) => x.id === guestId);
    if (!g) return null;
    if (playerPos) {
      g.lookPos.copy(playerPos);
      g.facing = Math.atan2(playerPos.x - g.pos.x, playerPos.z - g.pos.z);
    }
    g.emoteTimer = 3.2;

    if (action === "wave") {
      g.happiness = Math.min(100, g.happiness + 8);
      g.stateTimer = 18;
      this._showGuestBubble(g, "반가워요! 오늘 위클리랜드에서 신나게 놀아요!", 5.0);
    } else if (action === "balloon") {
      g.hasBalloon = true;
      g.parts.balloonGroup.visible = true;
      g.happiness = Math.min(100, g.happiness + 16);
      g.stateTimer = 18;
      this._showGuestBubble(g, "와아! 예쁜 파스텔 풍선 선물 정말 고마워요!", 5.2);
    } else if (action === "photo") {
      g.parts.cameraGroup.visible = true;
      g.flashTimer = 0.25;
      g.happiness = Math.min(100, g.happiness + 12);
      g.stateTimer = 15;
      this._showGuestBubble(g, "하나, 둘, 셋, 치즈~! 찰칵! 멋진 추억 남겼어요!", 5.2);
    } else if (action === "recommend") {
      g.happiness = Math.min(100, g.happiness + 10);
      g.energy = Math.min(100, g.energy + 12);
      const coasterPoi = this.poiList.find((p) => p.category === "coaster") || this.poiList[0];
      this.activeTalkingGuestId = null;
      if (coasterPoi) {
        g.targetPoi = coasterPoi;
        const nearCur = this.terrain.findNearestWaypointIndex(g.pos.x, g.pos.z);
        const goalNear = this.terrain.findNearestWaypointIndex(coasterPoi.x, coasterPoi.z);
        const route = this.terrain.findPathRoute(nearCur.index, goalNear.index);
        g.currentWpIdx = nearCur.index;
        g.routeQueue = route;
        const firstWp = g.routeQueue.shift();
        if (firstWp !== undefined) {
          g.nextWpIdx = firstWp;
          this._setPathStepTarget(g, firstWp);
        }
        g.lookPos.set(coasterPoi.lookX, 0, coasterPoi.lookZ);
        g.state = "WALKING_TO_POI";
        g.stateTimer = 45;
      }
      this._showGuestBubble(g, "스타보드 하이퍼 코스터요?! 지금 바로 달려가 볼게요!", 5.2);
    }
    return this.getGuestSnapshot(guestId);
  }

  releaseTalkingGuest(guestId) {
    const g = this.aiGuests.find((x) => x.id === guestId);
    if (g && g.state === "TALKING_TO_PLAYER") {
      this._pickNextGoal(g, g.umbrellaOpen > 0.5);
    }
    if (this.activeTalkingGuestId === guestId) {
      this.activeTalkingGuestId = null;
    }
  }

  _createBubbleEl() {
    if (!this.overlayLayer) return null;
    const el = document.createElement("div");
    el.className = "wl-guest-bubble";
    el.hidden = true;
    this.overlayLayer.appendChild(el);
    return el;
  }

  _createTagEl(label) {
    if (!this.overlayLayer) return null;
    const el = document.createElement("div");
    el.className = "wl-world-tag";
    el.textContent = label;
    this.overlayLayer.appendChild(el);
    return el;
  }

  setPlayerMoveTarget(worldPos) {
    if (!worldPos || this.player.riding) {
      this.player.moveTarget = null;
      if (this.moveMarker) this.moveMarker.visible = false;
      return;
    }
    const tx = THREE.MathUtils.clamp(worldPos.x, -142, 142);
    const tz = THREE.MathUtils.clamp(worldPos.z, -142, 142);
    const ty = this.terrain ? Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(tx, tz)) : 0;
    this.player.moveTarget = new THREE.Vector3(tx, ty, tz);
    if (this.moveMarker) {
      this.moveMarker.position.set(tx, ty + 0.22, tz);
      this.moveMarker.visible = true;
    }
  }

  clearPlayerMoveTarget() {
    this.player.moveTarget = null;
    if (this.moveMarker) this.moveMarker.visible = false;
  }

  showPlayerChatBubble(text, duration = 4.5) {
    if (!this.player.bubbleEl || !text) return;
    this.player.bubbleEl.textContent = text;
    this.player.bubbleEl.hidden = false;
    this.player.bubbleRemaining = duration;
  }

  showRemotePeerChatBubble(clientId, text, duration = 4.8) {
    const rec = this.remotePeers.get(clientId);
    if (!rec || !rec.bubbleEl || !text) return;
    rec.bubbleEl.textContent = `${rec.nickname || "방문객"}: ${text}`;
    rec.bubbleEl.hidden = false;
    rec.bubbleRemaining = duration;
  }

  upsertRemotePeer(peer) {
    if (!peer?.clientId) return;
    let rec = this.remotePeers.get(peer.clientId);
    if (!rec) {
      const root = new THREE.Group();
      const built = createDetailedCartoonGuest(peer.clientId.charCodeAt(0) % 8);
      root.add(built.root);
      this.group.add(root);
      rec = {
        clientId: peer.clientId,
        nickname: peer.nickname || "방문객",
        root,
        parts: built.parts,
        pos: new THREE.Vector3(peer.x || 0, peer.y || 0, peer.z || 120),
        targetPos: new THREE.Vector3(peer.x || 0, peer.y || 0, peer.z || 120),
        facing: peer.facing || Math.PI,
        riding: peer.riding || null,
        phase: 0,
        umbrellaOpen: 0,
        tagEl: this._createTagEl(peer.nickname || "방문객"),
        bubbleEl: this._createBubbleEl(),
        bubbleRemaining: 0,
      };
      this.remotePeers.set(peer.clientId, rec);
    }
    rec.nickname = peer.nickname || rec.nickname;
    rec.targetPos.set(Number(peer.x || 0), Number(peer.y || 0), Number(peer.z || 0));
    rec.facing = Number(peer.facing || 0);
    rec.riding = peer.riding || null;
    if (rec.tagEl) {
      rec.tagEl.textContent = peer.riding ? `${rec.nickname} · 탑승 중` : rec.nickname;
    }
  }

  removeRemotePeer(clientId) {
    const rec = this.remotePeers.get(clientId);
    if (!rec) return;
    this.group.remove(rec.root);
    rec.tagEl?.remove();
    rec.bubbleEl?.remove();
    this.remotePeers.delete(clientId);
  }

  boardRide(kind, id, carIndex = 0) {
    this.player.riding = { kind, id, carIndex };
    this._playPlayerAnim("sit");
  }

  leaveRide(dropPosition) {
    this.player.riding = null;
    if (dropPosition) {
      this.player.position.copy(dropPosition);
      this.player.position.y = this.terrain.getHeightAt(dropPosition.x, dropPosition.z);
    }
    this._playPlayerAnim("idle");
  }

  update(dt, input, cameraBasis, coasterEngine, flatRideEngine, camera, viewportW, viewportH, { isRaining = false } = {}) {
    const stepDt = Math.min(dt, 0.05);
    this._simTime += stepDt;

    // 1. Update local player (walking vs riding) + auto rain umbrella
    if (this.player.riding) {
      const seat =
        this.player.riding.kind === "coaster"
          ? coasterEngine.getSeatState(this.player.riding.id, 0, this.player.riding.carIndex || 0)
          : flatRideEngine.getRideSeatState(this.player.riding.id);
      if (seat) {
        this.player.position.copy(seat.position);
        this.player.root.position.copy(seat.position);
        this.player.root.position.y -= 0.42;
        this.player.facing = Math.atan2(seat.tangent.x, seat.tangent.z);
        this.player.root.rotation.y = this.player.facing;
      }
    } else if (input) {
      const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0) + (input.analogX || 0);
      const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0) + (input.analogY || 0);
      const isManualMove = Math.abs(moveX) > 0.08 || Math.abs(moveZ) > 0.08;

      if (isManualMove) {
        this.clearPlayerMoveTarget();
        const mag = Math.min(1, Math.hypot(moveX, moveZ));
        const speed = (input.sprint ? 11.2 : 6.4) * Math.max(0.45, mag);
        const dir = this._moveDir
          .set(0, 0, 0)
          .addScaledVector(cameraBasis.forward, moveZ)
          .addScaledVector(cameraBasis.right, moveX)
          .normalize();
        this.player.position.x = THREE.MathUtils.clamp(this.player.position.x + dir.x * speed * stepDt, -142, 142);
        this.player.position.z = THREE.MathUtils.clamp(this.player.position.z + dir.z * speed * stepDt, -142, 142);
        this.player.facing = Math.atan2(dir.x, dir.z);
        this._playPlayerAnim(input.sprint ? "run" : "walk");
      } else if (this.player.moveTarget) {
        const dx = this.player.moveTarget.x - this.player.position.x;
        const dz = this.player.moveTarget.z - this.player.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.72) {
          this.clearPlayerMoveTarget();
          this._playPlayerAnim("idle");
        } else {
          const speed = dist > 14 ? 9.2 : 6.6;
          const step = Math.min(dist, speed * stepDt);
          this.player.position.x = THREE.MathUtils.clamp(this.player.position.x + (dx / dist) * step, -142, 142);
          this.player.position.z = THREE.MathUtils.clamp(this.player.position.z + (dz / dist) * step, -142, 142);
          this.player.facing = this._lerpAngle(this.player.facing, Math.atan2(dx, dz), Math.min(1, stepDt * 10));
          this._playPlayerAnim(dist > 14 ? "run" : "walk");
          if (this.moveMarker && this.moveMarker.visible) {
            const pulse = 1 + Math.sin(this._simTime * 7) * 0.16;
            this.moveMarker.scale.setScalar(pulse);
          }
        }
      } else {
        this._playPlayerAnim("idle");
      }

      const groundY = Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(this.player.position.x, this.player.position.z));
      if (input.jump && this.player.grounded) {
        this.player.vy = 6.8;
        this.player.grounded = false;
      }
      if (!this.player.grounded) {
        this.player.vy -= 18.5 * stepDt;
        this.player.position.y += this.player.vy * stepDt;
        if (this.player.position.y <= groundY) {
          this.player.position.y = groundY;
          this.player.vy = 0;
          this.player.grounded = true;
        }
      } else {
        this.player.position.y = groundY;
      }

      this.player.root.position.copy(this.player.position);
      this.player.root.rotation.y = this.player.facing;
    }

    if (this.player.umbrellaGroup) {
      const wantOpen = isRaining && !this.player.riding ? 1 : 0;
      this.player.umbrellaOpen += (wantOpen - this.player.umbrellaOpen) * Math.min(1, stepDt * 7.5);
      const open = this.player.umbrellaOpen;
      this.player.umbrellaGroup.visible = open > 0.03;
      if (open > 0.03) this.player.umbrellaGroup.scale.setScalar(open * 1.15);
    }

    if (this.player.mixer) {
      this.player.mixer.update(stepDt);
    }

    if (this.player.bubbleEl) {
      if (this.player.bubbleRemaining > 0) {
        this.player.bubbleRemaining -= stepDt;
        if (this.player.bubbleRemaining <= 0) this.player.bubbleEl.hidden = true;
        else this._projectOverlayEl(this.player.bubbleEl, this.player.position, 2.55, camera, viewportW, viewportH);
      }
    }

    // 2. Update Remote Multi-user Avatars (walking limbs + rain umbrella + chat bubbles!)
    for (const rec of this.remotePeers.values()) {
      if (rec.riding?.kind === "coaster") {
        const seat = coasterEngine.getSeatState(rec.riding.id, 0, Math.min(3, (rec.riding.carIndex || 1)));
        if (seat) {
          rec.pos.copy(seat.position);
          rec.root.position.copy(seat.position);
          rec.root.rotation.y = Math.atan2(seat.tangent.x, seat.tangent.z);
        }
      } else {
        const distMove = Math.hypot(rec.targetPos.x - rec.pos.x, rec.targetPos.z - rec.pos.z);
        rec.pos.lerp(rec.targetPos, Math.min(1, stepDt * 9));
        rec.pos.y = Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(rec.pos.x, rec.pos.z)) + 0.12;
        rec.root.position.copy(rec.pos);
        rec.root.rotation.y = rec.facing;
        if (rec.parts) {
          const moving = distMove > 0.12;
          rec.phase += stepDt * (moving ? 9.0 : 2.5);
          const sw = moving ? Math.sin(rec.phase) * 0.6 : 0;
          rec.parts.leftLeg.rotation.x = sw;
          rec.parts.rightLeg.rotation.x = -sw;
          rec.parts.leftArm.rotation.x = -sw * 0.65;
          const wantU = isRaining ? 1 : 0;
          rec.umbrellaOpen += (wantU - rec.umbrellaOpen) * Math.min(1, stepDt * 6.5);
          rec.parts.umbrellaGroup.visible = rec.umbrellaOpen > 0.03;
          if (rec.umbrellaOpen > 0.03) {
            rec.parts.umbrellaGroup.scale.setScalar(rec.umbrellaOpen);
            rec.parts.rightArm.rotation.set(-0.82, 0, -0.14);
            rec.parts.umbrellaGroup.rotation.x = 0.82;
          } else {
            rec.parts.rightArm.rotation.set(sw * 0.65, 0, -0.12);
          }
        }
      }
      this._projectOverlayEl(rec.tagEl, rec.root.position, 2.25, camera, viewportW, viewportH);
      if (rec.bubbleEl && rec.bubbleRemaining > 0) {
        rec.bubbleRemaining -= stepDt;
        if (rec.bubbleRemaining <= 0) rec.bubbleEl.hidden = true;
        else this._projectOverlayEl(rec.bubbleEl, rec.root.position, 2.85, camera, viewportW, viewportH);
      }
    }

    // 3. Autonomous AI Park Guests (State Machine + Needs + Rain Umbrellas + Distance LOD)
    this._bubbleTimer += stepDt;
    this._frameTick++;
    const camPos = camera?.position;
    for (let idx = 0; idx < this.aiGuests.length; idx++) {
      const g = this.aiGuests[idx];
      if (!g.mesh.visible) continue;

      // Distance LOD: guests >95m from camera throttle skeletal update to every 2nd frame
      let gDt = stepDt;
      if (camPos && g.state !== "TALKING_TO_PLAYER") {
        const cdx = g.pos.x - camPos.x;
        const cdz = g.pos.z - camPos.z;
        if (cdx * cdx + cdz * cdz > 9025) {
          if (((this._frameTick + idx) & 1) === 1) continue;
          gDt = stepDt * 2;
        }
      }

      // Handle live 3D NPC riding inside moving coaster trains / flat rides!
      if (g.state === "RIDING_RIDE" && g.ridingAttr) {
        const seat =
          g.ridingAttr.kind === "coaster"
            ? coasterEngine.getSeatState(g.ridingAttr.id, g.ridingAttr.seatSlot % 2, g.ridingAttr.seatSlot % 4)
            : flatRideEngine.getRideSeatState(g.ridingAttr.id, g.ridingAttr.seatSlot);
        if (!seat || g.stateTimer <= 0) {
          this._disembarkGuest(g, isRaining);
        } else {
          g.pos.copy(seat.position);
          g.mesh.position.set(seat.position.x, seat.position.y - 0.55, seat.position.z);
          g.mesh.rotation.y = Math.atan2(seat.tangent.x, seat.tangent.z);
          g.parts.umbrellaGroup.visible = false;
          g.parts.leftLeg.rotation.x = -1.2;
          g.parts.rightLeg.rotation.x = -1.2;
          g.phase += stepDt * 8.5;
          g.parts.leftArm.rotation.set(-2.55 + Math.sin(g.phase) * 0.25, 0, 0.22);
          g.parts.rightArm.rotation.set(-2.55 - Math.sin(g.phase) * 0.25, 0, -0.22);
          g.parts.torsoGroup.position.y = 0.42;
          if (g.bubbleEl && g.bubbleRemaining > 0) {
            g.bubbleRemaining -= stepDt;
            if (g.bubbleRemaining <= 0) g.bubbleEl.hidden = true;
            else this._projectOverlayEl(g.bubbleEl, g.pos, 1.85, camera, viewportW, viewportH);
          }
        }
        continue;
      }

      // Smoothly open/close umbrella when raining!
      const targetUmbrella = isRaining ? 1 : 0;
      g.umbrellaOpen += (targetUmbrella - g.umbrellaOpen) * Math.min(1, stepDt * 6.5);
      const u = g.umbrellaOpen;
      g.parts.umbrellaGroup.visible = u > 0.03;
      if (u > 0.03) {
        g.parts.umbrellaGroup.scale.setScalar(u);
      }

      // Passive needs simulation
      g.energy = THREE.MathUtils.clamp(g.energy + (g.state === "RESTING" ? 4.8 : -0.35) * stepDt, 15, 100);
      g.fullness = THREE.MathUtils.clamp(g.fullness + (g.state === "EATING_SNACK" ? 7.5 : -0.28) * stepDt, 18, 100);
      g.happiness = THREE.MathUtils.clamp(
        g.happiness + (g.state === "WATCHING_RIDE" || g.state === "CHATTING" ? 1.5 : isRaining ? -0.15 : 0.1) * stepDt,
        40,
        100
      );
      g.chatCooldown = Math.max(0, g.chatCooldown - stepDt);
      g.stateTimer -= stepDt;

      let walking = false;
      if (g.state === "WALKING_TO_POI") {
        const dx = g.targetPos.x - g.pos.x;
        const dz = g.targetPos.z - g.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.95) {
          if (g.nextWpIdx !== undefined) g.currentWpIdx = g.nextWpIdx;
          if (g.routeQueue && g.routeQueue.length > 0) {
            const nxtIdx = g.routeQueue.shift();
            g.nextWpIdx = nxtIdx;
            this._setPathStepTarget(g, nxtIdx);
          } else {
            this._enterPoiActivity(g, isRaining);
          }
        } else if (g.stateTimer <= 0) {
          this._pickNextGoal(g, isRaining);
        } else {
          walking = true;
          const spd = g.speed * (isRaining ? 1.18 : 1.0);
          const step = Math.min(dist, spd * stepDt);
          g.pos.x += (dx / dist) * step;
          g.pos.z += (dz / dist) * step;
          const desiredYaw = Math.atan2(dx, dz);
          g.facing = this._lerpAngle(g.facing, desiredYaw, Math.min(1, stepDt * 8));

          // Check for friendly spontaneous chat with another nearby walking guest
          if (g.chatCooldown <= 0) {
            for (let j = idx + 1; j < this.aiGuests.length; j++) {
              const other = this.aiGuests[j];
              if (!other.mesh.visible || other.state !== "WALKING_TO_POI" || other.chatCooldown > 0) continue;
              const dPeer = Math.hypot(other.pos.x - g.pos.x, other.pos.z - g.pos.z);
              if (dPeer < 3.0) {
                const pair = CHAT_PAIRS[(idx + j) % CHAT_PAIRS.length];
                g.state = "CHATTING";
                other.state = "CHATTING";
                g.stateTimer = 4.6;
                other.stateTimer = 4.6;
                g.chatCooldown = 26;
                other.chatCooldown = 26;
                g.lookPos.copy(other.pos);
                other.lookPos.copy(g.pos);
                this._showGuestBubble(g, pair[0], 4.2);
                this._showGuestBubble(other, pair[1], 4.2);
                break;
              }
            }
          }
        }
      } else if (g.state === "QUEUING_RIDE") {
        const dx = g.lookPos.x - g.pos.x;
        const dz = g.lookPos.z - g.pos.z;
        if (Math.hypot(dx, dz) > 0.2) {
          g.facing = this._lerpAngle(g.facing, Math.atan2(dx, dz), Math.min(1, stepDt * 6));
        }
        if (g.stateTimer <= 0) {
          this._boardGuestOntoPoiRide(g);
          continue;
        }
      } else if (g.state === "TALKING_TO_PLAYER") {
        const dx = this.player.position.x - g.pos.x;
        const dz = this.player.position.z - g.pos.z;
        g.facing = this._lerpAngle(g.facing, Math.atan2(dx, dz), Math.min(1, stepDt * 9));
        if (Math.hypot(dx, dz) > 15 || g.stateTimer <= 0) {
          this.releaseTalkingGuest(g.id);
        }
      } else {
        // Look at POI target (ride, castle, pavilion, friend)
        const dx = g.lookPos.x - g.pos.x;
        const dz = g.lookPos.z - g.pos.z;
        if (Math.hypot(dx, dz) > 0.2) {
          g.facing = this._lerpAngle(g.facing, Math.atan2(dx, dz), Math.min(1, stepDt * 6));
        }
        if (g.stateTimer <= 0) {
          this._pickNextGoal(g, isRaining);
        }
      }

      // Expressive Procedural Articulated Character Animation
      const gy = Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(g.pos.x, g.pos.z));
      const p = g.parts;
      g.phase += stepDt * (walking ? 9.2 : 3.8);

      let bounceY = 0;
      let legSwing = 0;
      let leftArmX = 0;
      let leftArmZ = 0.12;
      let rightArmX = 0;
      let rightArmZ = -0.12;
      let headPitch = 0;
      let headYaw = 0;
      let sitDrop = 0;

      if (walking) {
        legSwing = Math.sin(g.phase) * 0.65;
        bounceY = Math.abs(Math.sin(g.phase)) * 0.08;
        leftArmX = -legSwing * 0.68;
        rightArmX = legSwing * 0.68;
        headYaw = Math.sin(g.phase * 0.35) * 0.14;
      } else if (g.state === "WATCHING_RIDE") {
        bounceY = Math.max(0, Math.sin(g.phase * 2.2)) * 0.24;
        leftArmX = -2.4 + Math.sin(g.phase * 3) * 0.25;
        rightArmX = -2.4 - Math.sin(g.phase * 3) * 0.25;
        headPitch = -0.28;
      } else if (g.state === "EATING_SNACK") {
        bounceY = Math.abs(Math.sin(g.phase * 1.1)) * 0.05;
        rightArmX = -1.25 + Math.sin(g.phase * 1.8) * 0.22;
        headPitch = Math.sin(g.phase * 1.8) * 0.1;
      } else if (g.state === "RESTING") {
        sitDrop = -0.22;
        p.leftLeg.rotation.x = -1.15;
        p.rightLeg.rotation.x = -1.15;
        headYaw = Math.sin(g.phase * 0.5) * 0.22;
      } else if (g.state === "TAKING_PHOTO") {
        rightArmX = -1.45;
        leftArmX = -1.2;
        g.flashTimer -= stepDt;
        if (g.flashTimer <= 0) {
          g.flashTimer = 2.6;
        }
        p.flashSphere.visible = g.flashTimer > 2.42;
      } else if (g.state === "READING_AI") {
        headPitch = -0.18 + Math.sin(g.phase * 0.9) * 0.1;
        headYaw = Math.sin(g.phase * 0.5) * 0.2;
      } else if (g.state === "CHATTING" || g.state === "TALKING_TO_PLAYER") {
        bounceY = Math.abs(Math.sin(g.phase * 1.5)) * 0.07;
        rightArmZ = -2.35 + Math.sin(g.phase * 3.4) * 0.35;
        rightArmX = -0.45;
        if (g.state === "TALKING_TO_PLAYER" && g.parts.cameraGroup.visible) {
          g.flashTimer -= stepDt;
          p.flashSphere.visible = g.flashTimer > 0 && g.flashTimer < 0.2;
          if (g.flashTimer < -1.0) g.parts.cameraGroup.visible = false;
        }
      }

      // Override right arm hold angle cleanly when carrying an open rain umbrella!
      if (u > 0.25) {
        rightArmX = -0.82;
        rightArmZ = -0.14;
        p.umbrellaGroup.rotation.x = 0.82; // Keeps umbrella shaft vertical!
      } else {
        p.umbrellaGroup.rotation.x = 0;
      }

      if (g.state !== "RESTING") {
        p.leftLeg.rotation.x = legSwing;
        p.rightLeg.rotation.x = -legSwing;
      }
      p.leftArm.rotation.set(leftArmX, 0, leftArmZ);
      p.rightArm.rotation.set(rightArmX, 0, rightArmZ);
      p.headGroup.rotation.set(headPitch, headYaw, 0);
      p.torsoGroup.position.y = 0.56 + sitDrop;

      // Floating emote heart/sparkle animation
      if (g.emoteTimer > 0) {
        g.emoteTimer -= stepDt;
        p.emoteMesh.visible = true;
        p.emoteMesh.position.y = 2.08 + Math.sin(this._simTime * 7 + idx) * 0.12;
        p.emoteMesh.rotation.y += stepDt * 3.2;
      } else {
        p.emoteMesh.visible = false;
      }

      // Gentle balloon sway
      if (g.hasBalloon && p.balloonGroup.visible) {
        p.balloonGroup.rotation.z = Math.sin(this._simTime * 2.2 + idx) * 0.09;
      }

      g.pos.y = gy + 0.12 + bounceY;
      g.mesh.position.copy(g.pos);
      g.mesh.rotation.y = g.facing;

      // Speech bubble projection
      if (g.bubbleEl) {
        if (g.bubbleRemaining > 0) {
          g.bubbleRemaining -= stepDt;
          if (g.bubbleRemaining <= 0) {
            g.bubbleEl.hidden = true;
          } else {
            this._projectOverlayEl(g.bubbleEl, g.pos, u > 0.5 ? 2.85 : 2.25, camera, viewportW, viewportH);
          }
        } else if (isRaining && this._bubbleTimer > 4.0 && Math.random() < 0.025) {
          this._showGuestBubble(g, "앗 소나기다! 얼른 우산 써야지!", 4.5);
          this._bubbleTimer = 0;
        }
      }
    }
    // 4. Animate rising +₩ gold coin payment popups in screen space
    for (let i = this.coinPopups.length - 1; i >= 0; i--) {
      const cp = this.coinPopups[i];
      cp.age += stepDt;
      if (cp.age >= cp.life) {
        cp.el.remove();
        this.coinPopups.splice(i, 1);
        continue;
      }
      cp.pos.y += stepDt * 1.45;
      const alpha = Math.max(0, 1 - Math.pow(cp.age / cp.life, 1.8));
      cp.el.style.opacity = alpha.toFixed(2);
      this._projectOverlayEl(cp.el, cp.pos, 0, camera, viewportW, viewportH);
    }
  }

  _lerpAngle(a, b, t) {
    let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  _projectOverlayEl(el, worldPos, yOff, camera, w, h) {
    if (!el || !camera) return;
    this._projVec.set(worldPos.x, worldPos.y + yOff, worldPos.z).project(camera);
    if (this._projVec.z > 1 || this._projVec.z < -1) {
      el.hidden = true;
      return;
    }
    const sx = (this._projVec.x * 0.5 + 0.5) * w;
    const sy = (-this._projVec.y * 0.5 + 0.5) * h;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  togglePlayerBalloon() {
    if (this.player.balloonGroup) {
      this.player.root.remove(this.player.balloonGroup);
      this.player.balloonGroup = null;
      return false;
    }
    const bg = createBalloonProp(0xf9a8d4);
    bg.position.set(0.46, 1.05, 0.12);
    this.player.root.add(bg);
    this.player.balloonGroup = bg;
    return true;
  }

  celebratePlayer() {
    if (this.player.grounded && !this.player.riding) {
      this.player.vy = 7.6;
      this.player.grounded = false;
    }
  }

  setGuestLimit(maxVisible) {
    this.aiGuests.forEach((g, idx) => {
      const show = idx < maxVisible;
      g.mesh.visible = show;
      if (!show && g.bubbleEl) g.bubbleEl.hidden = true;
    });
  }

  getGuestCount() {
    return this.aiGuests.filter((g) => g.mesh.visible).length;
  }

  dispose() {
    for (const rec of this.remotePeers.values()) rec.tagEl?.remove();
    for (const g of this.aiGuests) g.bubbleEl?.remove();
    for (const cp of this.coinPopups) cp.el?.remove();
    this.coinPopups = [];
    this.remotePeers.clear();
    this.aiGuests = [];
    this.guestPickables = [];
    this.scene.remove(this.group);
  }
}
