/**
 * WeeklyLand Unified Mega-Continent World & Seamless Multi-Biome System
 * Unifies all 4 curated theme worlds (Sunlit Meadow, Tropical Lagoon, Spooky Halloween,
 * Alpine Winter) into ONE continuous 520m x 520m open-world theme park continent.
 *
 * Entering any realm smoothly morphs sky, fog, lighting, weather particles, ambient audio,
 * and HUD theming while terrain & water vertex colors blend continuously across borders.
 */

export const UNIFIED_WORLD_SIZE = 520;
export const UNIFIED_WORLD_RES = 112;

export const STAGE_PALETTES = {
  "sunlit-meadow": {
    name: "위클리 썬릿 초원",
    shortName: "썬릿 초원",
    badge: "CENTRAL HUB",
    direction: "중앙 · 정문 광장",
    subtitle: "화창한 파스텔 초원 · 스타보드 하이퍼 코스터 · AI위클리 4대 파빌리온",
    accentHex: "#65d472",
    defaultTime: "day",
    defaultSeason: "spring",
    preferredTimeOfDay: 0.45,
    center: { x: 0, z: 16 },
    spawn: { x: 0, z: 118, facing: Math.PI },
    primaryCoasterId: "coaster-starboard-hyper",
    waterColorDay: 0x2a86a8,
    waterColorNight: 0x163e5c,
    terrainColors: {
      waterBed: [0.34, 0.72, 0.76],
      lowGrass: [0.46, 0.84, 0.50],
      midGrass: [0.56, 0.89, 0.56],
      highPeak: [0.76, 0.72, 0.84],
    },
    atmosphere: {
      skyZenithTint: 0x0f5bd6,
      skyMidTint: 0x45a8ff,
      skyHorizonTint: 0xc9eeff,
      sunTint: 0xfff5dc,
      ambientTint: 0xeaf5ff,
      hemiTint: 0x7cc8ff,
      tintStrength: 0.12,
      fogDensity: 0.00145,
      nightLightBoost: 0.0,
      bloomBoost: 0.0,
    },
  },
  "tropical-lagoon": {
    name: "트로피컬 아일랜드 라군",
    shortName: "트로피컬 라군",
    badge: "EAST REALM",
    direction: "동쪽 · 에메랄드 해변",
    subtitle: "에메랄드 해변 · 야자수 · 아틀란티스 런치 코스터 · 수상 어트랙션",
    accentHex: "#06b6d4",
    defaultTime: "day",
    defaultSeason: "summer",
    preferredTimeOfDay: 0.48,
    center: { x: 176, z: 12 },
    spawn: { x: 116, z: 4, facing: Math.PI * 0.5 },
    primaryCoasterId: "coaster-atlantis-lagoon",
    waterColorDay: 0x06b6d4,
    waterColorNight: 0x0e4f66,
    terrainColors: {
      waterBed: [0.88, 0.82, 0.62],
      lowGrass: [0.95, 0.88, 0.66],
      midGrass: [0.36, 0.82, 0.48],
      highPeak: [0.28, 0.68, 0.42],
    },
    atmosphere: {
      skyZenithTint: 0x0284c7,
      skyMidTint: 0x22d3ee,
      skyHorizonTint: 0xfff0c4,
      sunTint: 0xfff3c4,
      ambientTint: 0xe0fbff,
      hemiTint: 0x38bdf8,
      tintStrength: 0.48,
      fogDensity: 0.00135,
      nightLightBoost: 0.0,
      bloomBoost: 0.04,
    },
  },
  "spooky-halloween": {
    name: "스푸키 할로윈 매너",
    shortName: "스푸키 매너",
    badge: "WEST REALM",
    direction: "서쪽 · 황혼 고딕 계곡",
    subtitle: "보랏빛 황혼 · 드라켄 90° 다이브 코스터 · 유령의 집 · 고스릴 라인업",
    accentHex: "#a855f7",
    defaultTime: "sunset",
    defaultSeason: "autumn",
    preferredTimeOfDay: 0.735,
    center: { x: -176, z: 12 },
    spawn: { x: -116, z: 4, facing: -Math.PI * 0.5 },
    primaryCoasterId: "coaster-draken-spooky",
    waterColorDay: 0x3b2f63,
    waterColorNight: 0x1e1638,
    terrainColors: {
      waterBed: [0.24, 0.22, 0.36],
      lowGrass: [0.42, 0.36, 0.44],
      midGrass: [0.52, 0.40, 0.34],
      highPeak: [0.36, 0.28, 0.46],
    },
    atmosphere: {
      skyZenithTint: 0x1d1145,
      skyMidTint: 0x6b21a8,
      skyHorizonTint: 0xd97746,
      sunTint: 0xff8c5a,
      ambientTint: 0xc4a1e8,
      hemiTint: 0x8b5cf6,
      tintStrength: 0.68,
      fogDensity: 0.00245,
      nightLightBoost: 0.85,
      bloomBoost: 0.24,
    },
  },
  "alpine-winter": {
    name: "알파인 윈터 원더랜드",
    shortName: "알파인 윈터",
    badge: "NORTH REALM",
    direction: "북쪽 · 눈꽃 설원",
    subtitle: "눈 덮인 설원 마을 · T-Express 우든 코스터 · 북극 미니 증기열차",
    accentHex: "#7dd3fc",
    defaultTime: "day",
    defaultSeason: "winter",
    preferredTimeOfDay: 0.40,
    center: { x: 0, z: -176 },
    spawn: { x: 0, z: -120, facing: Math.PI },
    primaryCoasterId: "coaster-texpress-alpine",
    waterColorDay: 0x7dd3fc,
    waterColorNight: 0x1e3a5f,
    terrainColors: {
      waterBed: [0.72, 0.86, 0.96],
      lowGrass: [0.88, 0.94, 0.99],
      midGrass: [0.94, 0.97, 1.0],
      highPeak: [0.84, 0.90, 0.98],
    },
    atmosphere: {
      skyZenithTint: 0x2563eb,
      skyMidTint: 0x93c5fd,
      skyHorizonTint: 0xe6f4ff,
      sunTint: 0xeff8ff,
      ambientTint: 0xdbeafe,
      hemiTint: 0xbae6fd,
      tintStrength: 0.52,
      fogDensity: 0.00195,
      nightLightBoost: 0.18,
      bloomBoost: 0.08,
    },
  },
};

export const STAGE_IDS = Object.keys(STAGE_PALETTES);
export const STAGE_LIST = STAGE_IDS.map((id) => ({ id, ...STAGE_PALETTES[id] }));

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Computes continuous normalized biome blend weights at world position (x, z).
 * Smoothly blends terrain vertex colors, water tints, sky/fog moods, and weather
 * across the 520m unified continent without hard seams.
 */
export function getBiomeWeightsAt(x, z) {
  // Smooth outer realm influences with clean border transitions around ±98m
  const eastFactor = smoothstep(82, 126, x) * (1 - smoothstep(-108, -148, z) * 0.65);
  const westFactor = smoothstep(-82, -126, x) * (1 - smoothstep(-108, -148, z) * 0.65);
  const northFactor = smoothstep(-86, -128, z) * (1 - smoothstep(104, 152, Math.abs(x)) * 0.55);

  const rawTropical = eastFactor;
  const rawSpooky = westFactor;
  const rawAlpine = northFactor;
  const outerSum = rawTropical + rawSpooky + rawAlpine;
  const rawMeadow = Math.max(0, 1 - outerSum);

  const total = rawMeadow + outerSum || 1;
  const weights = {
    "sunlit-meadow": rawMeadow / total,
    "tropical-lagoon": rawTropical / total,
    "spooky-halloween": rawSpooky / total,
    "alpine-winter": rawAlpine / total,
  };

  let dominant = "sunlit-meadow";
  let best = -1;
  for (const id of STAGE_IDS) {
    if (weights[id] > best) {
      best = weights[id];
      dominant = id;
    }
  }

  return { weights, dominant, confidence: best };
}

/**
 * Hysteresis-stabilized dominant realm query for UI banners, audio shifts, and chat zone tags.
 */
export function getDominantZoneAt(x, z, previousZoneId = "sunlit-meadow") {
  const blend = getBiomeWeightsAt(x, z);
  const prevWeight = blend.weights[previousZoneId] ?? 0;
  if (previousZoneId && blend.dominant !== previousZoneId) {
    // Require clear dominance margin (0.14) before firing a discrete realm transition
    if (blend.confidence < prevWeight + 0.14) {
      return { ...blend, zoneId: previousZoneId };
    }
  }
  return { ...blend, zoneId: blend.dominant };
}

function cloneBase(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function transformCoasterNodes(nodes, ox, oz, scaleXZ = 0.9) {
  return nodes.map((n) => ({
    ...n,
    x: Number((n.x * scaleXZ + ox).toFixed(1)),
    z: Number((n.z * scaleXZ + oz).toFixed(1)),
  }));
}

/**
 * Builds the ONE Unified 520m x 520m WeeklyLand Mega-Continent merging all 4 themed worlds:
 * - Center & South Entrance: Sunlit Meadow (Classic Hub + 4 AI Weekly Pavilions)
 * - East (+X): Tropical Island Lagoon
 * - West (-X): Spooky Halloween Manor
 * - North (-Z): Alpine Winter Wonderland
 */
export function buildUnifiedParkWorld(baseMeadowWorld) {
  // Already unified? Return clean clone preserving custom Architect edits!
  if (baseMeadowWorld?.parkMeta?.unifiedWorld === true && (baseMeadowWorld?.terrain?.size || 0) >= 480) {
    return cloneBase(baseMeadowWorld);
  }

  const meadow = cloneBase(baseMeadowWorld || {});
  const pavilions = cloneBase(meadow.pavilions || []);

  // Keep Meadow core rides and adjust Sky Tower slightly south-west of East Bridge for a wide open gateway
  const meadowRides = (meadow.rides || []).map((r) => {
    if (r.id === "ride-skytower") return { ...r, x: 74, z: 26 };
    if (r.id === "ride-gyro") return { ...r, x: -72, z: -48 };
    if (r.id === "ride-rocket") return { ...r, x: 72, z: -46 };
    if (r.id === "ride-topspin") return { ...r, x: -74, z: 48 };
    if (r.id === "ride-logflume") return { ...r, x: -66, z: 82 };
    if (r.id === "ride-gokart") return { ...r, x: 60, z: 90 };
    return r;
  });

  // Keep Meadow scenery and adjust Fairy Castle slightly to frame the twin Alpine promenades
  const meadowScenery = (meadow.scenery || []).map((s) => {
    if (s.id === "scn-castle") return { ...s, x: 0, z: -84, scale: 1.15 };
    return s;
  });

  const meadowCoasters = cloneBase(meadow.coasters || []);

  // --- EAST REALM: Tropical Island Lagoon (Center: +176, +12) ---
  const tropCoaster = {
    id: "coaster-atlantis-lagoon",
    name: "아틀란티스 아쿠아 런치 코스터",
    realmId: "tropical-lagoon",
    trackColor: "#06b6d4",
    spineColor: "#fde047",
    supportColor: "#0f766e",
    trainCount: 2,
    carsPerTrain: 4,
    closed: true,
    nodes: transformCoasterNodes(
      [
        { x: -38, y: 3.2, z: 24, bankDeg: 0, segment: "station" },
        { x: -42, y: 3.4, z: 2, bankDeg: 0, segment: "boost" },
        { x: -36, y: 26.0, z: -32, bankDeg: 30, segment: "normal" },
        { x: -6, y: 4.6, z: -50, bankDeg: -46, segment: "boost" },
        { x: 26, y: 22.0, z: -42, bankDeg: 40, segment: "normal" },
        { x: 48, y: 5.2, z: -10, bankDeg: -48, segment: "normal" },
        { x: 34, y: 15.0, z: 26, bankDeg: 32, segment: "normal" },
        { x: -8, y: 4.4, z: 38, bankDeg: 18, segment: "brake" },
      ],
      176,
      12,
      0.88
    ),
  };

  const tropRides = [
    { id: "ride-trop-octopus", type: "octopus_ride", name: "트로피컬 문어 라이드", x: 176, z: 12, rotY: 0, scale: 1.0 },
    { id: "ride-trop-logflume", type: "log_flume_splash", name: "라군 후룸라이드", x: 134, z: 42, rotY: 0, scale: 1.0 },
    { id: "ride-trop-swans", type: "swan_boats_pond", name: "에메랄드 백조 보트", x: 218, z: 42, rotY: 0, scale: 1.0 },
    { id: "ride-trop-pirate", type: "pirate_ship", name: "카리브 바이킹", x: 130, z: -14, rotY: 0.5, scale: 1.0 },
    { id: "ride-trop-ferris", type: "ferris_wheel", name: "선셋 비치 대관람차", x: 224, z: -12, rotY: -0.4, scale: 1.0 },
    { id: "ride-trop-enterprise", type: "enterprise_wheel", name: "오션 엔터프라이즈 360", x: 148, z: -54, rotY: 0.2, scale: 1.0 },
    { id: "ride-trop-condor", type: "condor_tower", name: "아일랜드 콘도르 타워", x: 206, z: -54, rotY: 0, scale: 1.0 },
    { id: "ride-trop-tagada", type: "tagada_disco", name: "비치 디스코 타가다", x: 212, z: 74, rotY: -0.3, scale: 1.0 },
    { id: "ride-trop-bungee", type: "bungee_trampoline", name: "라군 슬링샷 번지", x: 142, z: 74, rotY: 0.3, scale: 1.0 },
  ];

  const tropScenery = [
    { id: "scn-gate-tropical", type: "zone_gate_tropical", x: 102, z: 0, rotY: Math.PI * 0.5, scale: 1.15 },
    { id: "scn-trop-neon", type: "neon_arch", x: 132, z: 8, rotY: Math.PI * 0.42, scale: 1.0 },
    { id: "scn-trop-fountain", type: "fountain", x: 176, z: 36, rotY: 0, scale: 1.0 },
    { id: "scn-trop-hotair", type: "hot_air_pad", x: 176, z: -68, rotY: 0, scale: 1.12 },
    { id: "scn-trop-cafe", type: "cafe_icecream", x: 162, z: 54, rotY: 0.4, scale: 1.0 },
    { id: "scn-trop-burger", type: "burger_shop", x: 190, z: 54, rotY: -0.4, scale: 1.0 },
    { id: "scn-trop-souvenir", type: "souvenir_shop", x: 120, z: 16, rotY: 0.3, scale: 1.0 },
    { id: "scn-trop-photo", type: "heart_photozone", x: 176, z: 76, rotY: 0, scale: 1.0 },
    { id: "scn-trop-palm-1", type: "tree_palm", x: 112, z: -12, rotY: 0.2, scale: 1.35 },
    { id: "scn-trop-palm-2", type: "tree_palm", x: 112, z: 14, rotY: 2.1, scale: 1.35 },
    { id: "scn-trop-palm-3", type: "tree_palm", x: 152, z: 24, rotY: 0.8, scale: 1.3 },
    { id: "scn-trop-palm-4", type: "tree_palm", x: 200, z: 24, rotY: 1.9, scale: 1.3 },
    { id: "scn-trop-palm-5", type: "tree_palm", x: 234, z: 18, rotY: 0.5, scale: 1.4 },
    { id: "scn-trop-palm-6", type: "tree_palm", x: 156, z: -26, rotY: 2.5, scale: 1.35 },
    { id: "scn-trop-palm-7", type: "tree_palm", x: 198, z: -26, rotY: 1.1, scale: 1.35 },
    { id: "scn-trop-palm-8", type: "tree_palm", x: 234, z: 62, rotY: 2.8, scale: 1.45 },
    { id: "scn-trop-lamp-1", type: "lamp_post", x: 118, z: -6, rotY: 0, scale: 1.0 },
    { id: "scn-trop-lamp-2", type: "lamp_post", x: 118, z: 8, rotY: 0, scale: 1.0 },
  ];

  // --- WEST REALM: Spooky Halloween Manor (Center: -176, +12) ---
  const spookyCoaster = {
    id: "coaster-draken-spooky",
    name: "드라켄 90° 미드나잇 다이브",
    realmId: "spooky-halloween",
    trackColor: "#dc2626",
    spineColor: "#fef3c7",
    supportColor: "#1e1b4b",
    trainCount: 2,
    carsPerTrain: 4,
    closed: true,
    nodes: transformCoasterNodes(
      [
        { x: -38, y: 2.4, z: 24, bankDeg: 0, segment: "station" },
        { x: -42, y: 2.8, z: 4, bankDeg: 0, segment: "lift" },
        { x: -38, y: 34.0, z: -26, bankDeg: 0, segment: "brake" },
        { x: -20, y: 34.0, z: -40, bankDeg: 0, segment: "brake" },
        { x: -4, y: 4.2, z: -52, bankDeg: 46, segment: "boost" },
        { x: 28, y: 26.0, z: -40, bankDeg: -48, segment: "normal" },
        { x: 50, y: 5.5, z: -8, bankDeg: 54, segment: "normal" },
        { x: 26, y: 16.0, z: 28, bankDeg: -34, segment: "normal" },
        { x: -12, y: 3.6, z: 36, bankDeg: 14, segment: "brake" },
      ],
      -176,
      12,
      0.88
    ),
  };

  const spookyRides = [
    { id: "ride-spooky-haunted", type: "haunted_house", name: "유령의 집 스푸키 매너", x: -176, z: -64, rotY: 0, scale: 1.15 },
    { id: "ride-spooky-gravitron", type: "gravitron_ufo", name: "팬텀 그래비톤 UFO", x: -176, z: 12, rotY: 0, scale: 1.0 },
    { id: "ride-spooky-frisbee", type: "frisbee_pendulum", name: "미드나잇 자이언트 프리즈비", x: -224, z: -6, rotY: 0.4, scale: 1.0 },
    { id: "ride-spooky-topspin", type: "top_spin", name: "고딕 탑 스핀 360", x: -128, z: -14, rotY: -0.4, scale: 1.0 },
    { id: "ride-spooky-powersurge", type: "power_surge", name: "다크 파워 서지", x: -222, z: 38, rotY: 0.3, scale: 1.0 },
    { id: "ride-spooky-magiccarpet", type: "magic_carpet", name: "마녀의 매직카펫", x: -130, z: 38, rotY: -0.3, scale: 1.0 },
    { id: "ride-spooky-drop", type: "drop_tower", name: "공포의 드롭타워", x: -212, z: -52, rotY: 0.3, scale: 1.0 },
    { id: "ride-spooky-bungee", type: "bungee_trampoline", name: "문라이트 번지 슬링샷", x: -140, z: -52, rotY: -0.3, scale: 1.0 },
    { id: "ride-spooky-scrambler", type: "scrambler_twist", name: "스파이더 스크램블러", x: -176, z: 68, rotY: 0, scale: 1.0 },
  ];

  const spookyScenery = [
    { id: "scn-gate-spooky", type: "zone_gate_spooky", x: -102, z: 0, rotY: Math.PI * 0.5, scale: 1.15 },
    { id: "scn-spooky-neon", type: "neon_arch", x: -132, z: 8, rotY: -Math.PI * 0.42, scale: 1.05 },
    { id: "scn-spooky-clock", type: "clock_tower", x: -194, z: 54, rotY: 0.4, scale: 1.15 },
    { id: "scn-spooky-maze", type: "hedge_maze", x: -156, z: 54, rotY: 0, scale: 1.0 },
    { id: "scn-spooky-fw", type: "firework_launcher", x: -176, z: 36, rotY: 0, scale: 1.0 },
    { id: "scn-spooky-popcorn", type: "popcorn_cart", x: -162, z: 34, rotY: 0.4, scale: 1.0 },
    { id: "scn-spooky-cotton", type: "cotton_candy_stall", x: -190, z: 34, rotY: -0.4, scale: 1.0 },
    { id: "scn-spooky-pine-1", type: "tree_pine", x: -112, z: -12, rotY: 0.2, scale: 1.4 },
    { id: "scn-spooky-pine-2", type: "tree_pine", x: -112, z: 14, rotY: 1.2, scale: 1.4 },
    { id: "scn-spooky-pine-3", type: "tree_pine", x: -234, z: 18, rotY: 0.8, scale: 1.45 },
    { id: "scn-spooky-pine-4", type: "tree_pine", x: -234, z: 62, rotY: 2.1, scale: 1.5 },
    { id: "scn-spooky-pine-5", type: "tree_pine", x: -154, z: -28, rotY: 0.5, scale: 1.35 },
    { id: "scn-spooky-pine-6", type: "tree_pine", x: -198, z: -28, rotY: 1.7, scale: 1.35 },
    { id: "scn-spooky-lamp-1", type: "lamp_post", x: -118, z: -6, rotY: 0, scale: 1.0 },
    { id: "scn-spooky-lamp-2", type: "lamp_post", x: -118, z: 8, rotY: 0, scale: 1.0 },
    { id: "scn-spooky-lamp-3", type: "lamp_post", x: -170, z: -38, rotY: 0, scale: 1.0 },
    { id: "scn-spooky-lamp-4", type: "lamp_post", x: -182, z: -38, rotY: 0, scale: 1.0 },
  ];

  // --- NORTH REALM: Alpine Winter Wonderland (Center: 0, -176) ---
  const alpineCoaster = {
    id: "coaster-texpress-alpine",
    name: "알파인 T-Express 우든 코스터",
    realmId: "alpine-winter",
    trackColor: "#b45309",
    spineColor: "#fef3c7",
    supportColor: "#78350f",
    trainCount: 2,
    carsPerTrain: 4,
    closed: true,
    nodes: transformCoasterNodes(
      [
        { x: -40, y: 2.4, z: 26, bankDeg: 0, segment: "station" },
        { x: -44, y: 2.8, z: 4, bankDeg: 0, segment: "lift" },
        { x: -42, y: 31.0, z: -30, bankDeg: 0, segment: "normal" },
        { x: -12, y: 4.2, z: -50, bankDeg: 46, segment: "boost" },
        { x: 22, y: 23.0, z: -44, bankDeg: -34, segment: "normal" },
        { x: 48, y: 5.2, z: -12, bankDeg: 50, segment: "normal" },
        { x: 36, y: 17.0, z: 24, bankDeg: -28, segment: "normal" },
        { x: 4, y: 5.4, z: 40, bankDeg: 24, segment: "brake" },
        { x: -22, y: 3.4, z: 38, bankDeg: 10, segment: "brake" },
      ],
      0,
      -176,
      0.88
    ),
  };

  const alpineRides = [
    { id: "ride-alpine-carousel", type: "carousel", name: "눈꽃 그랜드 회전목마", x: 0, z: -176, rotY: 0, scale: 1.0 },
    { id: "ride-alpine-train", type: "mini_train_station", name: "북극 익스프레스 미니열차", x: -54, z: -156, rotY: 0, scale: 1.0 },
    { id: "ride-alpine-gokart", type: "go_kart_track", name: "아이스 고카트 서킷", x: 54, z: -156, rotY: 0, scale: 1.0 },
    { id: "ride-alpine-ferris", type: "ferris_wheel", name: "설원 대관람차", x: -58, z: -192, rotY: 0.4, scale: 1.0 },
    { id: "ride-alpine-skytower", type: "sky_tower", name: "알파인 전망대 타워", x: 58, z: -192, rotY: 0, scale: 1.0 },
    { id: "ride-alpine-teacups", type: "teacups", name: "코코아 회전 티컵", x: -34, z: -226, rotY: 0, scale: 1.0 },
    { id: "ride-alpine-bumper", type: "bumper_cars", name: "스노우 범퍼카장", x: 34, z: -226, rotY: 0, scale: 1.0 },
    { id: "ride-alpine-swing", type: "swing_tower", name: "스노우플라이어 그네", x: 0, z: -226, rotY: 0, scale: 1.0 },
    { id: "ride-alpine-rocket", type: "rocket_spinner", name: "오로라 로켓 스피너", x: 60, z: -124, rotY: 0, scale: 1.0 },
  ];

  const alpineScenery = [
    { id: "scn-gate-alpine", type: "zone_gate_alpine", x: 0, z: -106, rotY: 0, scale: 1.15 },
    { id: "scn-alpine-garland", type: "garland_arch", x: 0, z: -126, rotY: 0, scale: 1.05 },
    { id: "scn-alpine-fountain", type: "fountain", x: 0, z: -148, rotY: 0, scale: 1.0 },
    { id: "scn-alpine-clock", type: "clock_tower", x: -18, z: -130, rotY: 0.4, scale: 1.1 },
    { id: "scn-alpine-souvenir", type: "souvenir_shop", x: 18, z: -130, rotY: -0.4, scale: 1.0 },
    { id: "scn-alpine-cotton", type: "cotton_candy_stall", x: -14, z: -154, rotY: 0.4, scale: 1.0 },
    { id: "scn-alpine-restroom", type: "restroom_plaza", x: 14, z: -154, rotY: -0.4, scale: 1.0 },
    { id: "scn-alpine-pine-1", type: "tree_pine", x: -14, z: -112, rotY: 0.2, scale: 1.45 },
    { id: "scn-alpine-pine-2", type: "tree_pine", x: 14, z: -112, rotY: 1.2, scale: 1.45 },
    { id: "scn-alpine-pine-3", type: "tree_pine", x: -24, z: -142, rotY: 0.6, scale: 1.35 },
    { id: "scn-alpine-pine-4", type: "tree_pine", x: 24, z: -142, rotY: 2.0, scale: 1.35 },
    { id: "scn-alpine-pine-5", type: "tree_pine", x: -78, z: -178, rotY: 0.4, scale: 1.65 },
    { id: "scn-alpine-pine-6", type: "tree_pine", x: 78, z: -178, rotY: 1.5, scale: 1.65 },
    { id: "scn-alpine-pine-7", type: "tree_pine", x: -74, z: -212, rotY: 0.9, scale: 1.75 },
    { id: "scn-alpine-pine-8", type: "tree_pine", x: 74, z: -212, rotY: 2.3, scale: 1.75 },
    { id: "scn-alpine-lamp-1", type: "lamp_post", x: -6, z: -118, rotY: 0, scale: 1.0 },
    { id: "scn-alpine-lamp-2", type: "lamp_post", x: 6, z: -118, rotY: 0, scale: 1.0 },
  ];

  // Unified Continuous Path Network (Stitched into 1 connected BFS graph across all 4 realms!)
  const unifiedPaths = [
    // Central Sunlit Meadow Core
    {
      id: "path-grand-promenade",
      width: 5.4,
      style: "sandstone",
      points: [
        [0, 130], [0, 110], [0, 88], [0, 66], [0, 44], [0, 22], [0, 0], [0, -28], [0, -54],
      ],
    },
    {
      id: "path-plaza-ring",
      width: 4.2,
      style: "sandstone",
      closed: true,
      points: [
        [0, 32], [-28, 26], [-36, 0], [-28, -28], [0, -34], [28, -28], [36, 0], [28, 26],
      ],
    },
    // Continuous East-West Continental Boulevard (Spooky <-> Meadow <-> Tropical)
    {
      id: "path-continental-ew",
      width: 4.6,
      style: "pastel_pink",
      points: [
        [-138, 10], [-114, 2], [-88, 0], [-62, 0], [-36, 0], [0, 0], [36, 0], [62, 0], [88, 0], [114, 2], [138, 10],
      ],
    },
    // Twin Northern Castle Promenades (Meadow <-> Alpine Gate)
    {
      id: "path-castle-west-link",
      width: 3.8,
      style: "sandstone",
      points: [[-28, -28], [-28, -56], [-22, -84], [0, -106]],
    },
    {
      id: "path-castle-east-link",
      width: 3.8,
      style: "sandstone",
      points: [[28, -28], [28, -56], [22, -84], [0, -106]],
    },
    // East Tropical Lagoon Paths
    {
      id: "path-trop-ring",
      width: 4.4,
      style: "wood",
      closed: true,
      points: [
        [176, 46], [144, 36], [138, 12], [146, -16], [176, -24], [206, -16], [214, 12], [208, 36],
      ],
    },
    {
      id: "path-trop-spine",
      width: 4.2,
      style: "sandstone",
      points: [[176, 72], [176, 46], [176, 12], [176, -24], [176, -58]],
    },
    // West Spooky Manor Paths
    {
      id: "path-spooky-ring",
      width: 4.4,
      style: "brick",
      closed: true,
      points: [
        [-176, 46], [-208, 36], [-214, 12], [-206, -16], [-176, -24], [-146, -16], [-138, 12], [-144, 36],
      ],
    },
    {
      id: "path-spooky-spine",
      width: 4.2,
      style: "brick",
      points: [[-176, 66], [-176, 46], [-176, 12], [-176, -24], [-176, -56]],
    },
    // North Alpine Winter Paths
    {
      id: "path-alpine-spine",
      width: 4.6,
      style: "sandstone",
      points: [[0, -106], [0, -138], [0, -176], [0, -214]],
    },
    {
      id: "path-alpine-ring",
      width: 4.4,
      style: "pastel_pink",
      closed: true,
      points: [
        [0, -142], [-32, -150], [-38, -176], [-32, -204], [0, -212], [32, -204], [38, -176], [32, -150],
      ],
    },
    // Outer Scenic Ring Connecting All Realms Directly
    {
      id: "path-scenic-ne",
      width: 3.6,
      style: "wood",
      points: [[176, -24], [142, -62], [104, -98], [66, -134], [32, -150]],
    },
    {
      id: "path-scenic-nw",
      width: 3.6,
      style: "brick",
      points: [[-176, -24], [-142, -62], [-104, -98], [-66, -134], [-32, -150]],
    },
    {
      id: "path-scenic-se",
      width: 3.6,
      style: "sandstone",
      points: [[0, 96], [56, 98], [112, 86], [156, 56], [176, 46]],
    },
    {
      id: "path-scenic-sw",
      width: 3.6,
      style: "sandstone",
      points: [[0, 96], [-56, 98], [-112, 86], [-156, 56], [-176, 46]],
    },
  ];

  // Unified Multi-Biome Sculpted Terrain (520m x 520m)
  const unifiedHills = [
    // Central Meadow gentle scenic ponds & corner hills
    { x: 84, z: 72, radius: 22, height: -2.4 },
    { x: -84, z: 72, radius: 22, height: -2.4 },
    // East Tropical Lagoon: dry island plateau + emerald water basins + coastal volcanic peaks
    { x: 176, z: 12, radius: 66, height: 1.15 },
    { x: 132, z: 48, radius: 20, height: -2.5 },
    { x: 222, z: 48, radius: 20, height: -2.5 },
    { x: 242, z: -58, radius: 34, height: 12.5 },
    { x: 242, z: 86, radius: 34, height: 11.0 },
    // West Spooky Halloween: dramatic gothic ridges + misty twilight moat
    { x: -242, z: -58, radius: 36, height: 13.5 },
    { x: -242, z: 86, radius: 34, height: 11.5 },
    { x: -176, z: -98, radius: 26, height: 7.5 },
    { x: -132, z: 54, radius: 18, height: -2.2 },
    // North Alpine Winter: towering snow-capped Alpine peaks + glacial ponds
    { x: -90, z: -236, radius: 46, height: 17.5 },
    { x: 90, z: -236, radius: 46, height: 17.0 },
    { x: 0, z: -246, radius: 36, height: 13.0 },
    { x: -56, z: -130, radius: 16, height: -2.0 },
    { x: 56, z: -130, radius: 16, height: -2.0 },
    // Scenic perimeter framing peaks along South-West & South-East outer rims
    { x: -158, z: 168, radius: 40, height: 10.0 },
    { x: 158, z: 168, radius: 40, height: 10.0 },
  ];

  return {
    schemaVersion: 3,
    parkMeta: {
      name: "위클리랜드 통합 대륙 · WeeklyLand Grand World",
      updatedAt: new Date().toISOString(),
      author: "ldk-hub",
      themePreset: "unified-continent",
      unifiedWorld: true,
      stageName: "위클리랜드 4대 테마 통합 대륙",
      entrance: { x: 0, z: 124 },
    },
    terrain: {
      size: UNIFIED_WORLD_SIZE,
      resolution: UNIFIED_WORLD_RES,
      waterLevel: -0.6,
      hills: unifiedHills,
    },
    paths: unifiedPaths,
    coasters: [...meadowCoasters, tropCoaster, spookyCoaster, alpineCoaster],
    rides: [...meadowRides, ...tropRides, ...spookyRides, ...alpineRides],
    pavilions,
    scenery: [...meadowScenery, ...tropScenery, ...spookyScenery, ...alpineScenery],
  };
}

/**
 * Legacy helper retained for backwards compatibility — now returns the unified world
 * while preserving the requested starting realm metadata.
 */
export function buildThemeStageWorld(stageId, baseMeadowWorld) {
  const unified = buildUnifiedParkWorld(baseMeadowWorld);
  const pal = STAGE_PALETTES[stageId] || STAGE_PALETTES["sunlit-meadow"];
  unified.parkMeta = {
    ...unified.parkMeta,
    startingRealm: pal ? stageId : "sunlit-meadow",
  };
  return unified;
}
