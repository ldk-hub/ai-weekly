/**
 * WeeklyLand Theme Park Stage Presets (Planet Coaster / RollerCoaster Tycoon Style)
 * 4 curated 300m x 300m worlds with custom terrain palettes, lighting moods,
 * signature coasters, rides, shops, and connected walkway networks.
 */

export const STAGE_PALETTES = {
  "sunlit-meadow": {
    name: "위클리 썬릿 초원",
    badge: "CLASSIC",
    subtitle: "화창한 파스텔 초원과 16종 어트랙션·스타보드 하이퍼 코스터",
    defaultTime: "day",
    defaultSeason: "spring",
    waterColorDay: 0x2a86a8,
    waterColorNight: 0x163e5c,
    terrainColors: {
      waterBed: [0.34, 0.72, 0.76],
      lowGrass: [0.46, 0.84, 0.50],
      midGrass: [0.56, 0.89, 0.56],
      highPeak: [0.76, 0.72, 0.84],
    },
  },
  "tropical-lagoon": {
    name: "트로피컬 아일랜드 라군",
    badge: "TROPICAL",
    subtitle: "에메랄드 해변·야자수·아틀란티스 런치 코스터·수상 어트랙션",
    defaultTime: "day",
    defaultSeason: "summer",
    waterColorDay: 0x06b6d4,
    waterColorNight: 0x0e4f66,
    terrainColors: {
      waterBed: [0.88, 0.82, 0.62],
      lowGrass: [0.95, 0.88, 0.66], // Golden sandy beach near shore!
      midGrass: [0.36, 0.82, 0.48], // Lush tropical island palms
      highPeak: [0.28, 0.68, 0.42],
    },
  },
  "spooky-halloween": {
    name: "스푸키 할로윈 매너",
    badge: "SPOOKY",
    subtitle: "보랏빛 황혼·드라켄 90° 다이브 코스터·유령의 집·고스릴 라인업",
    defaultTime: "sunset",
    defaultSeason: "autumn",
    waterColorDay: 0x3b2f63,
    waterColorNight: 0x1e1638,
    terrainColors: {
      waterBed: [0.24, 0.22, 0.36],
      lowGrass: [0.42, 0.36, 0.44],
      midGrass: [0.52, 0.40, 0.34], // Warm autumn dusk earth
      highPeak: [0.36, 0.28, 0.46],
    },
  },
  "alpine-winter": {
    name: "알파인 윈터 원더랜드",
    badge: "WINTER",
    subtitle: "눈 덮인 설원 마을·티익스프레스 우든 코스터·미니 증기열차",
    defaultTime: "day",
    defaultSeason: "winter",
    waterColorDay: 0x7dd3fc,
    waterColorNight: 0x1e3a5f,
    terrainColors: {
      waterBed: [0.72, 0.86, 0.96],
      lowGrass: [0.88, 0.94, 0.99],
      midGrass: [0.94, 0.97, 1.0], // Crisp snowfield!
      highPeak: [0.84, 0.90, 0.98],
    },
  },
};

export const STAGE_LIST = Object.entries(STAGE_PALETTES).map(([id, meta]) => ({ id, ...meta }));

function cloneBase(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generates a full valid `park_world` snapshot for the requested theme stage.
 */
export function buildThemeStageWorld(stageId, baseMeadowWorld) {
  if (stageId === "sunlit-meadow" || !STAGE_PALETTES[stageId]) {
    const w = cloneBase(baseMeadowWorld);
    w.parkMeta = { ...(w.parkMeta || {}), themePreset: "sunlit-meadow", stageName: STAGE_PALETTES["sunlit-meadow"].name };
    return w;
  }

  const basePavilions = cloneBase(baseMeadowWorld.pavilions || []);

  if (stageId === "tropical-lagoon") {
    return {
      schemaVersion: 2,
      parkMeta: {
        name: "위클리랜드 · 트로피컬 라군",
        updatedAt: new Date().toISOString(),
        author: "ldk-hub",
        themePreset: "tropical-lagoon",
        stageName: STAGE_PALETTES["tropical-lagoon"].name,
        entrance: { x: 0, z: 124 },
      },
      terrain: {
        size: 300,
        resolution: 72,
        waterLevel: 0.2,
        hills: [
          { x: 0, z: 0, radius: 112, height: 1.8 },
          { x: 0, z: 108, radius: 46, height: 1.4 },
          { x: -96, z: -86, radius: 34, height: 12.0 },
          { x: 96, z: -84, radius: 36, height: 10.5 },
          { x: -64, z: 54, radius: 26, height: -2.2 },
          { x: 66, z: 54, radius: 26, height: -2.2 },
        ],
      },
      paths: [
        {
          id: "path-trop-main",
          width: 5.4,
          style: "wood",
          points: [[0, 130], [0, 110], [0, 84], [0, 56], [0, 28], [0, 0], [0, -32], [0, -60]],
        },
        {
          id: "path-trop-ring",
          width: 4.4,
          style: "sandstone",
          closed: true,
          points: [[0, 34], [-34, 24], [-42, 0], [-32, -30], [0, -36], [32, -30], [42, 0], [34, 24]],
        },
        {
          id: "path-trop-pier",
          width: 4.0,
          style: "wood",
          points: [[-76, 0], [-42, 0], [42, 0], [76, 0]],
        },
      ],
      coasters: [
        {
          id: "coaster-atlantis-lagoon",
          name: "아틀란티스 아쿠아 런치 코스터",
          trackColor: "#06b6d4",
          spineColor: "#fde047",
          supportColor: "#0f766e",
          trainCount: 2,
          carsPerTrain: 4,
          closed: true,
          nodes: [
            { x: -38, y: 3.2, z: 24, bankDeg: 0, segment: "station" },
            { x: -42, y: 3.4, z: 2, bankDeg: 0, segment: "boost" },
            { x: -36, y: 26.0, z: -32, bankDeg: 30, segment: "normal" },
            { x: -6, y: 4.6, z: -50, bankDeg: -46, segment: "boost" },
            { x: 26, y: 22.0, z: -42, bankDeg: 40, segment: "normal" },
            { x: 48, y: 5.2, z: -10, bankDeg: -48, segment: "normal" },
            { x: 34, y: 15.0, z: 26, bankDeg: 32, segment: "normal" },
            { x: -8, y: 4.4, z: 38, bankDeg: 18, segment: "brake" },
          ],
        },
      ],
      rides: [
        { id: "ride-logflume", type: "log_flume_splash", name: "라군 후룸라이드", x: -48, z: 24, rotY: 0, scale: 1.0 },
        { id: "ride-swans", type: "swan_boats_pond", name: "에메랄드 백조 보트", x: 48, z: 24, rotY: 0, scale: 1.0 },
        { id: "ride-pirate", type: "pirate_ship", name: "카리브 바이킹", x: -58, z: -18, rotY: 0.5, scale: 1.0 },
        { id: "ride-ferris", type: "ferris_wheel", name: "선셋 비치 대관람차", x: 58, z: -18, rotY: -0.4, scale: 1.0 },
        { id: "ride-octopus", type: "octopus_ride", name: "트로피컬 문어 라이드", x: 0, z: 0, rotY: 0, scale: 1.0 },
        { id: "ride-enterprise", type: "enterprise_wheel", name: "오션 엔터프라이즈 360", x: -36, z: -64, rotY: 0.2, scale: 1.0 },
        { id: "ride-condor", type: "condor_tower", name: "아일랜드 콘도르 타워", x: 36, z: -64, rotY: 0, scale: 1.0 },
        { id: "ride-tagada", type: "tagada_disco", name: "비치 디스코 타가다", x: 52, z: 58, rotY: -0.3, scale: 1.0 },
        { id: "ride-bungee", type: "bungee_trampoline", name: "라군 슬링샷 번지", x: -52, z: 58, rotY: 0.3, scale: 1.0 },
      ],
      pavilions: basePavilions,
      scenery: [
        { id: "scn-gate", type: "grand_arch", x: 0, z: 110, rotY: 0, scale: 1.28 },
        { id: "scn-garland-1", type: "garland_arch", x: 0, z: 82, rotY: 0, scale: 1.05 },
        { id: "scn-neon-1", type: "neon_arch", x: 0, z: 54, rotY: 0, scale: 1.0 },
        { id: "scn-fountain", type: "fountain", x: 0, z: 24, rotY: 0, scale: 1.0 },
        { id: "scn-hotair", type: "hot_air_pad", x: 0, z: -84, rotY: 0, scale: 1.15 },
        { id: "scn-cafe", type: "cafe_icecream", x: -13, z: 40, rotY: 0.4, scale: 1.0 },
        { id: "scn-burger", type: "burger_shop", x: 13, z: 40, rotY: -0.4, scale: 1.0 },
        { id: "scn-souvenir", type: "souvenir_shop", x: -15, z: 90, rotY: 0.3, scale: 1.0 },
        { id: "scn-photo", type: "heart_photozone", x: 15, z: 90, rotY: -0.3, scale: 1.0 },
        { id: "scn-bench-1", type: "bench", x: -7, z: 70, rotY: 1.57, scale: 1.0 },
        { id: "scn-bench-2", type: "bench", x: 7, z: 70, rotY: -1.57, scale: 1.0 },
        { id: "scn-palm-1", type: "tree_palm", x: -16, z: 116, rotY: 0.2, scale: 1.35 },
        { id: "scn-palm-2", type: "tree_palm", x: 16, z: 116, rotY: 2.1, scale: 1.35 },
        { id: "scn-palm-3", type: "tree_palm", x: -18, z: 98, rotY: 1.1, scale: 1.3 },
        { id: "scn-palm-4", type: "tree_palm", x: 18, z: 98, rotY: 0.5, scale: 1.3 },
        { id: "scn-palm-5", type: "tree_palm", x: -24, z: 12, rotY: 0.8, scale: 1.25 },
        { id: "scn-palm-6", type: "tree_palm", x: 24, z: 12, rotY: 1.9, scale: 1.25 },
        { id: "scn-palm-7", type: "tree_palm", x: -64, z: 12, rotY: 0.4, scale: 1.4 },
        { id: "scn-palm-8", type: "tree_palm", x: 64, z: 12, rotY: 2.4, scale: 1.4 },
        { id: "scn-lamp-1", type: "lamp_post", x: -5.5, z: 96, rotY: 0, scale: 1.0 },
        { id: "scn-lamp-2", type: "lamp_post", x: 5.5, z: 96, rotY: 0, scale: 1.0 },
      ],
    };
  }

  if (stageId === "spooky-halloween") {
    return {
      schemaVersion: 2,
      parkMeta: {
        name: "위클리랜드 · 스푸키 매너",
        updatedAt: new Date().toISOString(),
        author: "ldk-hub",
        themePreset: "spooky-halloween",
        stageName: STAGE_PALETTES["spooky-halloween"].name,
        entrance: { x: 0, z: 124 },
      },
      terrain: {
        size: 300,
        resolution: 72,
        waterLevel: -0.8,
        hills: [
          { x: -94, z: -86, radius: 42, height: 12.5 },
          { x: 96, z: -82, radius: 42, height: 13.0 },
          { x: -102, z: 62, radius: 34, height: 8.5 },
          { x: 102, z: 62, radius: 34, height: 8.5 },
        ],
      },
      paths: [
        {
          id: "path-spooky-main",
          width: 5.4,
          style: "brick",
          points: [[0, 130], [0, 110], [0, 84], [0, 56], [0, 28], [0, 0], [0, -32], [0, -64]],
        },
        {
          id: "path-spooky-ring",
          width: 4.4,
          style: "brick",
          closed: true,
          points: [[0, 32], [-30, 26], [-38, 0], [-30, -28], [0, -36], [30, -28], [38, 0], [30, 26]],
        },
        {
          id: "path-spooky-cross",
          width: 3.8,
          style: "pastel_pink",
          points: [[-72, 0], [-38, 0], [38, 0], [72, 0]],
        },
      ],
      coasters: [
        {
          id: "coaster-draken-spooky",
          name: "드라켄 90° 미드나잇 다이브",
          trackColor: "#dc2626",
          spineColor: "#fef3c7",
          supportColor: "#1e1b4b",
          trainCount: 2,
          carsPerTrain: 4,
          closed: true,
          nodes: [
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
        },
      ],
      rides: [
        { id: "ride-haunted", type: "haunted_house", name: "유령의 집 스푸키 매너", x: 0, z: -76, rotY: 0, scale: 1.15 },
        { id: "ride-frisbee", type: "frisbee_pendulum", name: "미드나잇 자이언트 프리즈비", x: -56, z: -12, rotY: 0.4, scale: 1.0 },
        { id: "ride-topspin", type: "top_spin", name: "고딕 탑 스핀 360", x: 56, z: -12, rotY: -0.4, scale: 1.0 },
        { id: "ride-gravitron", type: "gravitron_ufo", name: "팬텀 그래비톤 UFO", x: 0, z: 0, rotY: 0, scale: 1.0 },
        { id: "ride-powersurge", type: "power_surge", name: "다크 파워 서지", x: -58, z: 26, rotY: 0.3, scale: 1.0 },
        { id: "ride-magiccarpet", type: "magic_carpet", name: "마녀의 매직카펫", x: 58, z: 26, rotY: -0.3, scale: 1.0 },
        { id: "ride-drop", type: "drop_tower", name: "공포의 드롭타워", x: -48, z: -56, rotY: 0.3, scale: 1.0 },
        { id: "ride-bungee", type: "bungee_trampoline", name: "문라이트 번지 슬링샷", x: 48, z: -56, rotY: -0.3, scale: 1.0 },
        { id: "ride-scrambler", type: "scrambler_twist", name: "스파이더 스크램블러", x: -50, z: 62, rotY: 0, scale: 1.0 },
      ],
      pavilions: basePavilions,
      scenery: [
        { id: "scn-gate", type: "grand_arch", x: 0, z: 110, rotY: 0, scale: 1.28 },
        { id: "scn-neon-1", type: "neon_arch", x: 0, z: 82, rotY: 0, scale: 1.08 },
        { id: "scn-neon-2", type: "neon_arch", x: 0, z: 54, rotY: 0, scale: 1.02 },
        { id: "scn-clock", type: "clock_tower", x: -16, z: 88, rotY: 0.4, scale: 1.15 },
        { id: "scn-maze", type: "hedge_maze", x: 18, z: 88, rotY: 0, scale: 1.0 },
        { id: "scn-fw", type: "firework_launcher", x: 0, z: 24, rotY: 0, scale: 1.0 },
        { id: "scn-popcorn", type: "popcorn_cart", x: -12, z: 38, rotY: 0.4, scale: 1.0 },
        { id: "scn-cotton", type: "cotton_candy_stall", x: 12, z: 38, rotY: -0.4, scale: 1.0 },
        { id: "scn-bench-1", type: "bench", x: -7, z: 68, rotY: 1.57, scale: 1.0 },
        { id: "scn-bench-2", type: "bench", x: 7, z: 68, rotY: -1.57, scale: 1.0 },
        { id: "scn-pine-1", type: "tree_pine", x: -16, z: 118, rotY: 0.2, scale: 1.4 },
        { id: "scn-pine-2", type: "tree_pine", x: 16, z: 118, rotY: 1.2, scale: 1.4 },
        { id: "scn-pine-3", type: "tree_pine", x: -24, z: 66, rotY: 0.8, scale: 1.35 },
        { id: "scn-pine-4", type: "tree_pine", x: 24, z: 66, rotY: 2.1, scale: 1.35 },
        { id: "scn-lamp-1", type: "lamp_post", x: -5.5, z: 96, rotY: 0, scale: 1.0 },
        { id: "scn-lamp-2", type: "lamp_post", x: 5.5, z: 96, rotY: 0, scale: 1.0 },
        { id: "scn-lamp-3", type: "lamp_post", x: -5.5, z: 66, rotY: 0, scale: 1.0 },
        { id: "scn-lamp-4", type: "lamp_post", x: 5.5, z: 66, rotY: 0, scale: 1.0 },
      ],
    };
  }

  // alpine-winter
  return {
    schemaVersion: 2,
    parkMeta: {
      name: "위클리랜드 · 알파인 윈터",
      updatedAt: new Date().toISOString(),
      author: "ldk-hub",
      themePreset: "alpine-winter",
      stageName: STAGE_PALETTES["alpine-winter"].name,
      entrance: { x: 0, z: 124 },
    },
    terrain: {
      size: 300,
      resolution: 72,
      waterLevel: -0.5,
      hills: [
        { x: -102, z: -88, radius: 46, height: 16.0 },
        { x: 102, z: -86, radius: 48, height: 15.5 },
        { x: 0, z: -128, radius: 40, height: 13.0 },
        { x: -106, z: 54, radius: 36, height: 10.0 },
        { x: 106, z: 54, radius: 36, height: 10.0 },
      ],
    },
    paths: [
      {
        id: "path-winter-main",
        width: 5.4,
        style: "sandstone",
        points: [[0, 130], [0, 110], [0, 84], [0, 56], [0, 28], [0, 0], [0, -32], [0, -64]],
      },
      {
        id: "path-winter-ring",
        width: 4.4,
        style: "pastel_pink",
        closed: true,
        points: [[0, 32], [-30, 26], [-38, 0], [-30, -28], [0, -36], [30, -28], [38, 0], [30, 26]],
      },
      {
        id: "path-winter-ave",
        width: 4.0,
        style: "wood",
        points: [[-74, 0], [-38, 0], [38, 0], [74, 0]],
      },
    ],
    coasters: [
      {
        id: "coaster-texpress-alpine",
        name: "알파인 T-Express 우든 코스터",
        trackColor: "#b45309",
        spineColor: "#fef3c7",
        supportColor: "#78350f",
        trainCount: 2,
        carsPerTrain: 4,
        closed: true,
        nodes: [
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
      },
    ],
    rides: [
      { id: "ride-carousel", type: "carousel", name: "눈꽃 그랜드 회전목마", x: 0, z: 0, rotY: 0, scale: 1.0 },
      { id: "ride-train", type: "mini_train_station", name: "북극 익스프레스 미니열차", x: -56, z: 22, rotY: 0, scale: 1.0 },
      { id: "ride-gokart", type: "go_kart_track", name: "아이스 고카트 서킷", x: 56, z: 22, rotY: 0, scale: 1.0 },
      { id: "ride-ferris", type: "ferris_wheel", name: "설원 대관람차", x: -58, z: -16, rotY: 0.4, scale: 1.0 },
      { id: "ride-skytower", type: "sky_tower", name: "알파인 전망대 타워", x: 58, z: -16, rotY: 0, scale: 1.0 },
      { id: "ride-teacups", type: "teacups", name: "코코아 회전 티컵", x: -34, z: -60, rotY: 0, scale: 1.0 },
      { id: "ride-bumper", type: "bumper_cars", name: "스노우 범퍼카장", x: 34, z: -60, rotY: 0, scale: 1.0 },
      { id: "ride-swing", type: "swing_tower", name: "스노우플라이어 그네", x: 0, z: -62, rotY: 0, scale: 1.0 },
      { id: "ride-rocket", type: "rocket_spinner", name: "오로라 로켓 스피너", x: 54, z: 62, rotY: 0, scale: 1.0 },
    ],
    pavilions: basePavilions,
    scenery: [
      { id: "scn-gate", type: "grand_arch", x: 0, z: 110, rotY: 0, scale: 1.28 },
      { id: "scn-garland-1", type: "garland_arch", x: 0, z: 82, rotY: 0, scale: 1.05 },
      { id: "scn-castle", type: "fairy_castle", x: 0, z: -90, rotY: 0, scale: 1.2 },
      { id: "scn-fountain", type: "fountain", x: 0, z: 24, rotY: 0, scale: 1.0 },
      { id: "scn-clock", type: "clock_tower", x: -16, z: 88, rotY: 0.4, scale: 1.1 },
      { id: "scn-souvenir", type: "souvenir_shop", x: 16, z: 88, rotY: -0.4, scale: 1.0 },
      { id: "scn-cotton", type: "cotton_candy_stall", x: -12, z: 38, rotY: 0.4, scale: 1.0 },
      { id: "scn-restroom", type: "restroom_plaza", x: 13, z: 38, rotY: -0.4, scale: 1.0 },
      { id: "scn-bench-1", type: "bench", x: -7, z: 70, rotY: 1.57, scale: 1.0 },
      { id: "scn-bench-2", type: "bench", x: 7, z: 70, rotY: -1.57, scale: 1.0 },
      { id: "scn-pine-1", type: "tree_pine", x: -16, z: 118, rotY: 0.2, scale: 1.45 },
      { id: "scn-pine-2", type: "tree_pine", x: 16, z: 118, rotY: 1.2, scale: 1.45 },
      { id: "scn-pine-3", type: "tree_pine", x: -18, z: 98, rotY: 0.6, scale: 1.35 },
      { id: "scn-pine-4", type: "tree_pine", x: 18, z: 98, rotY: 2.0, scale: 1.35 },
      { id: "scn-pine-5", type: "tree_pine", x: -72, z: -42, rotY: 0.4, scale: 1.6 },
      { id: "scn-pine-6", type: "tree_pine", x: 72, z: -42, rotY: 1.5, scale: 1.6 },
      { id: "scn-lamp-1", type: "lamp_post", x: -5.5, z: 96, rotY: 0, scale: 1.0 },
      { id: "scn-lamp-2", type: "lamp_post", x: 5.5, z: 96, rotY: 0, scale: 1.0 },
    ],
  };
}
