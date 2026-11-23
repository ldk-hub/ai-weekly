/**
 * Clean-Room 1999 Isometric Theme Park & Roller Coaster Tycoon Constants
 * Expanded 44x44 map metrics, 28 rides/coasters/shops, 5 blueprints, 18 scenery props, and 4 scenarios.
 */

export const ISO_METRICS = Object.freeze({
  TILE_W: 64,
  TILE_H: 32,
  HEIGHT_STEP_PX: 16, // 3m per click step in RCT1
  MAP_SIZE: 44,
  MIN_HEIGHT: 1,
  MAX_HEIGHT: 14,
});

// Cardinal directions on grid: 0:+X, 1:+Y, 2:-X, 3:-Y
export const DIR_DX = [1, 0, -1, 0];
export const DIR_DY = [0, 1, 0, -1];
export const DIR_LABELS = ["동 (+X)", "남 (+Y)", "서 (-X)", "북 (-Y)"];

export const TRACK_PIECE_CATALOG = Object.freeze({
  station: { id: "station", name: "승강장", shortLabel: "승강장", cost: 40, lengthM: 12, dz: 0, dDir: 0, isStation: true, hasChain: false, curveTurn: 0 },
  flat: { id: "flat", name: "평지 트랙", shortLabel: "평지", cost: 20, lengthM: 12, dz: 0, dDir: 0, hasChain: false, curveTurn: 0 },
  chain_up_gentle: { id: "chain_up_gentle", name: "체인 완만 오르막 (+3m)", shortLabel: "체인↗", cost: 45, lengthM: 13, dz: 1, dDir: 0, hasChain: true, curveTurn: 0 },
  chain_up_steep: { id: "chain_up_steep", name: "체인 가파른 오르막 (+6m)", shortLabel: "체인⬆", cost: 60, lengthM: 15, dz: 2, dDir: 0, hasChain: true, curveTurn: 0 },
  slope_up_gentle: { id: "slope_up_gentle", name: "완만 오르막 (+3m)", shortLabel: "오름↗", cost: 30, lengthM: 13, dz: 1, dDir: 0, hasChain: false, curveTurn: 0 },
  slope_up_steep: { id: "slope_up_steep", name: "가파른 오르막 (+6m)", shortLabel: "오름⬆", cost: 45, lengthM: 15, dz: 2, dDir: 0, hasChain: false, curveTurn: 0 },
  slope_down_gentle: { id: "slope_down_gentle", name: "완만 내리막 (-3m)", shortLabel: "내림↘", cost: 30, lengthM: 13, dz: -1, dDir: 0, hasChain: false, curveTurn: 0 },
  slope_down_steep: { id: "slope_down_steep", name: "가파른 내리막 (-6m)", shortLabel: "내림⬇", cost: 45, lengthM: 15, dz: -2, dDir: 0, hasChain: false, curveTurn: 0 },
  turn_left: { id: "turn_left", name: "좌회전 90°", shortLabel: "좌회전↰", cost: 35, lengthM: 14, dz: 0, dDir: 3, hasChain: false, curveTurn: -1 },
  turn_right: { id: "turn_right", name: "우회전 90°", shortLabel: "우회전↱", cost: 35, lengthM: 14, dz: 0, dDir: 1, hasChain: false, curveTurn: 1 },
  bank_left: { id: "bank_left", name: "좌측 뱅크 커브", shortLabel: "좌뱅크", cost: 48, lengthM: 14, dz: 0, dDir: 3, hasChain: false, isBanked: true, curveTurn: -1 },
  bank_right: { id: "bank_right", name: "우측 뱅크 커브", shortLabel: "우뱅크", cost: 48, lengthM: 14, dz: 0, dDir: 1, hasChain: false, isBanked: true, curveTurn: 1 },
  vertical_loop: { id: "vertical_loop", name: "수직 360° 루프", shortLabel: "수직루프", cost: 160, lengthM: 28, dz: 0, dDir: 0, hasChain: false, isLoop: true, curveTurn: 0 },
  airtime_hill: { id: "airtime_hill", name: "에어타임 낙타등 언덕", shortLabel: "에어타임", cost: 55, lengthM: 16, dz: 0, dDir: 0, hasChain: false, isAirtime: true, curveTurn: 0 },
  brakes: { id: "brakes", name: "브레이크 구간", shortLabel: "브레이크", cost: 40, lengthM: 12, dz: 0, dDir: 0, hasChain: false, isBrake: true, curveTurn: 0 },
  booster: { id: "booster", name: "LSM 고속 부스터", shortLabel: "부스터", cost: 85, lengthM: 12, dz: 0, dDir: 0, hasChain: false, isBooster: true, curveTurn: 0 },
});

export const RIDE_COLOR_PALETTES = [
  { id: "classic", name: "클래식 레드", primary: "#c2410c", track: "#92400e", rail: "#fef3c7" },
  { id: "cobalt", name: "코발트 블루", primary: "#0284c7", track: "#dc2626", rail: "#f8fafc" },
  { id: "neon", name: "사이버 네온", primary: "#a855f7", track: "#06b6d4", rail: "#fde047" },
  { id: "emerald", name: "에메랄드 포레스트", primary: "#10b981", track: "#065f46", rail: "#fef08a" },
  { id: "gold", name: "로열 골드", primary: "#eab308", track: "#b91c1c", rail: "#ffffff" },
  { id: "obsidian", name: "옵시디언 스텔스", primary: "#1e293b", track: "#f43f5e", rail: "#e2e8f0" },
];

export const RIDE_CATALOG = Object.freeze({
  // 5 Roller Coasters
  wooden_coaster: {
    id: "wooden_coaster", category: "coaster", name: "우든 롤러코스터", nameEn: "Wooden Roller Coaster",
    description: "클래식 목재 트러스 구조의 고전 롤러코스터. 거친 진동과 큰 낙차가 특징입니다.",
    baseCost: 850, runningCostPerMonth: 95, defaultPrice: 4.5, capacity: 12, baseExcitement: 2.35,
    colorPrimary: "#c2410c", colorTrack: "#92400e", colorRail: "#fef3c7", allowLoop: false, footprintW: 1, footprintH: 1, defaultDuration: 36,
  },
  steel_looping: {
    id: "steel_looping", category: "coaster", name: "스틸 루핑 코스터", nameEn: "Looping Roller Coaster",
    description: "360도 수직 루프와 고속 뱅크 코너를 소화하는 강철 관형 트랙 코스터.",
    baseCost: 1150, runningCostPerMonth: 125, defaultPrice: 5.5, capacity: 16, baseExcitement: 2.55,
    colorPrimary: "#0284c7", colorTrack: "#dc2626", colorRail: "#f8fafc", allowLoop: true, footprintW: 1, footprintH: 1, defaultDuration: 32,
  },
  mine_train: {
    id: "mine_train", category: "coaster", name: "마인 트레인 코스터", nameEn: "Mine Train Coaster",
    description: "광산 열차 스타일의 가족·스릴 겸용 코스터. 낮은 멀미도로 인기가 높습니다.",
    baseCost: 780, runningCostPerMonth: 85, defaultPrice: 4.0, capacity: 14, baseExcitement: 2.05,
    colorPrimary: "#78350f", colorTrack: "#57534e", colorRail: "#d97706", allowLoop: false, footprintW: 1, footprintH: 1, defaultDuration: 34,
  },
  inverted_coaster: {
    id: "inverted_coaster", category: "coaster", name: "인버티드 네온 코스터", nameEn: "Inverted Coaster",
    description: "트랙 아래에 매달려 비행하며 수직 루프를 돌파하는 첨단 서스펜디드 코스터.",
    baseCost: 1320, runningCostPerMonth: 140, defaultPrice: 6.5, capacity: 16, baseExcitement: 2.8,
    colorPrimary: "#a855f7", colorTrack: "#38bdf8", colorRail: "#fde047", allowLoop: true, isInverted: true, footprintW: 1, footprintH: 1, defaultDuration: 30,
  },
  hyper_coaster: {
    id: "hyper_coaster", category: "coaster", name: "기가 하이퍼 코스터", nameEn: "Hyper Coaster",
    description: "30m 상공에서 수직에 가까운 낙하와 연속 에어타임 언덕을 질주하는 초대형 코스터.",
    baseCost: 1480, runningCostPerMonth: 155, defaultPrice: 7.0, capacity: 20, baseExcitement: 2.95,
    colorPrimary: "#eab308", colorTrack: "#dc2626", colorRail: "#ffffff", allowLoop: true, footprintW: 1, footprintH: 1, defaultDuration: 35,
  },

  // 6 Gentle Rides
  merry_go_round: {
    id: "merry_go_round", category: "gentle", name: "회전목마", nameEn: "Merry-Go-Round",
    description: "전통 유원지 오르간 선율에 맞춰 도는 화려한 목마. 모든 연령대에게 사랑받습니다.",
    baseCost: 420, runningCostPerMonth: 35, defaultPrice: 1.5, capacity: 12,
    excitement: 2.35, intensity: 0.75, nausea: 0.45,
    colorPrimary: "#e11d48", colorSecondary: "#fbbf24", footprintW: 2, footprintH: 2, defaultDuration: 18,
  },
  ferris_wheel: {
    id: "ferris_wheel", category: "gentle", name: "대관람차", nameEn: "Ferris Wheel",
    description: "공원 전경을 한눈에 내려다보는 대형 관람차. 비 오는 날에도 인기가 있습니다.",
    baseCost: 580, runningCostPerMonth: 45, defaultPrice: 2.0, capacity: 16,
    excitement: 2.9, intensity: 0.9, nausea: 0.65,
    colorPrimary: "#2563eb", colorSecondary: "#fde047", footprintW: 2, footprintH: 2, defaultDuration: 26,
  },
  observation_tower: {
    id: "observation_tower", category: "gentle", name: "자유전망대", nameEn: "Observation Tower",
    description: "빙글빙글 회전하며 상공으로 올라가 공원 전체를 조망하는 타워.",
    baseCost: 620, runningCostPerMonth: 48, defaultPrice: 2.2, capacity: 18,
    excitement: 3.15, intensity: 1.05, nausea: 0.55,
    colorPrimary: "#0d9488", colorSecondary: "#f8fafc", footprintW: 2, footprintH: 2, defaultDuration: 22,
  },
  haunted_house: {
    id: "haunted_house", category: "gentle", name: "유령의 집 (고딕 저택)", nameEn: "Haunted House",
    description: "번개가 번쩍이고 박쥐가 맴도는 빅토리아 고딕풍 공포 체험 저택.",
    baseCost: 490, runningCostPerMonth: 42, defaultPrice: 2.5, capacity: 14,
    excitement: 3.45, intensity: 1.85, nausea: 0.35,
    colorPrimary: "#4c1d95", colorSecondary: "#94a3b8", footprintW: 2, footprintH: 2, defaultDuration: 20,
  },
  spiral_slide: {
    id: "spiral_slide", category: "gentle", name: "스파이럴 미끄럼틀", nameEn: "Spiral Slide",
    description: "빨간색과 하얀색 줄무늬 원뿔 타워를 따라 빙글빙글 미끄러져 내려오는 인기 시설.",
    baseCost: 360, runningCostPerMonth: 28, defaultPrice: 1.5, capacity: 10,
    excitement: 2.85, intensity: 1.15, nausea: 0.6,
    colorPrimary: "#ef4444", colorSecondary: "#f8fafc", footprintW: 2, footprintH: 2, defaultDuration: 14,
  },
  spinning_teacups: {
    id: "spinning_teacups", category: "gentle", name: "회전 찻잔 (티컵)", nameEn: "Teacups",
    description: "알록달록한 6개의 대형 찻잔이 2중 회전판 위에서 경쾌하게 도는 가족 놀이기구.",
    baseCost: 410, runningCostPerMonth: 34, defaultPrice: 1.8, capacity: 16,
    excitement: 2.95, intensity: 1.75, nausea: 1.95,
    colorPrimary: "#ec4899", colorSecondary: "#fde047", footprintW: 2, footprintH: 2, defaultDuration: 18,
  },

  // 6 Thrill Rides
  pirate_ship: {
    id: "pirate_ship", category: "thrill", name: "바이킹 (해적선)", nameEn: "Swinging Ship",
    description: "거대한 해적선이 좌우 75도까지 솟구치는 클래식 스릴 어트랙션.",
    baseCost: 640, runningCostPerMonth: 58, defaultPrice: 2.5, capacity: 16,
    excitement: 4.15, intensity: 3.25, nausea: 2.15,
    colorPrimary: "#92400e", colorSecondary: "#f59e0b", footprintW: 2, footprintH: 2, defaultDuration: 20,
  },
  launched_freefall: {
    id: "launched_freefall", category: "thrill", name: "자이로드롭 (프리폴)", nameEn: "Launched Freefall",
    description: "탑 꼭대기까지 천천히 상승한 뒤 순식간에 수직 낙하하는 극한 스릴 타워.",
    baseCost: 790, runningCostPerMonth: 72, defaultPrice: 3.5, capacity: 12,
    excitement: 5.4, intensity: 4.95, nausea: 1.9,
    colorPrimary: "#7c3aed", colorSecondary: "#facc15", footprintW: 2, footprintH: 2, defaultDuration: 16,
  },
  go_karts: {
    id: "go_karts", category: "thrill", name: "고카트 레이싱", nameEn: "Go Karts",
    description: "관람객들이 직접 엔진 카트를 몰고 트랙 경주를 펼치는 인기 레이싱 존.",
    baseCost: 720, runningCostPerMonth: 65, defaultPrice: 3.0, capacity: 8,
    excitement: 4.45, intensity: 2.65, nausea: 1.15,
    colorPrimary: "#334155", colorSecondary: "#ef4444", footprintW: 2, footprintH: 2, defaultDuration: 22,
  },
  enterprise_wheel: {
    id: "enterprise_wheel", category: "thrill", name: "엔터프라이즈 휠", nameEn: "Enterprise",
    description: "거대한 원형 관람 바퀴가 고속 회전하며 수직에 가깝게 기립하는 중력 체험 기구.",
    baseCost: 760, runningCostPerMonth: 68, defaultPrice: 3.2, capacity: 16,
    excitement: 4.75, intensity: 4.35, nausea: 2.6,
    colorPrimary: "#f97316", colorSecondary: "#38bdf8", footprintW: 2, footprintH: 2, defaultDuration: 20,
  },
  top_spin: {
    id: "top_spin", category: "thrill", name: "탑스핀 (360° 플립)", nameEn: "Top Spin",
    description: "거대한 유압 암 두 개가 와이드 곤돌라를 공중에서 360도 연속 회전시키는 스릴 기구.",
    baseCost: 820, runningCostPerMonth: 74, defaultPrice: 3.5, capacity: 16,
    excitement: 5.1, intensity: 5.25, nausea: 3.1,
    colorPrimary: "#e11d48", colorSecondary: "#facc15", footprintW: 2, footprintH: 2, defaultDuration: 18,
  },
  roto_drop: {
    id: "roto_drop", category: "thrill", name: "자이로 스윙 (진자)", nameEn: "Gyro Swing",
    description: "초대형 회전 원반이 양쪽으로 120도 솟구치며 무중력을 선사하는 하이 스릴 진자 기구.",
    baseCost: 890, runningCostPerMonth: 78, defaultPrice: 4.0, capacity: 18,
    excitement: 5.25, intensity: 4.85, nausea: 2.7,
    colorPrimary: "#06b6d4", colorSecondary: "#f43f5e", footprintW: 2, footprintH: 2, defaultDuration: 20,
  },

  // 3 Water Rides
  log_flume: {
    id: "log_flume", category: "water", name: "통나무 급류타기", nameEn: "Log Flume",
    description: "물길을 따라 떠다니다 시원한 물보라와 함께 하강하는 워터 라이드.",
    baseCost: 840, runningCostPerMonth: 70, defaultPrice: 3.5, capacity: 12,
    excitement: 4.95, intensity: 3.05, nausea: 1.25,
    colorPrimary: "#0ea5e9", colorSecondary: "#78350f", footprintW: 2, footprintH: 2, defaultDuration: 24,
  },
  river_rapids: {
    id: "river_rapids", category: "water", name: "리버래피드 급류보트", nameEn: "River Rapids",
    description: "거친 급류 수로를 원형 튜브 보트를 타고 빙글빙글 돌며 헤쳐나가는 워터 어트랙션.",
    baseCost: 880, runningCostPerMonth: 72, defaultPrice: 3.5, capacity: 14,
    excitement: 4.85, intensity: 2.95, nausea: 1.45,
    colorPrimary: "#0284c7", colorSecondary: "#f97316", footprintW: 2, footprintH: 2, defaultDuration: 24,
  },
  bumper_boats: {
    id: "bumper_boats", category: "water", name: "수상 범퍼보트", nameEn: "Bumper Boats",
    description: "물 위 풀장에서 보트를 몰고 부딪히며 더위를 식히는 여름 인기 시설.",
    baseCost: 540, runningCostPerMonth: 45, defaultPrice: 2.2, capacity: 10,
    excitement: 3.2, intensity: 1.65, nausea: 0.95,
    colorPrimary: "#38bdf8", colorSecondary: "#facc15", footprintW: 2, footprintH: 2, defaultDuration: 18,
  },

  // 8 Shops & Facilities (1x1)
  burger_bar: {
    id: "burger_bar", category: "shop", name: "버거 가판대", nameEn: "Burger Bar",
    description: "거대한 햄버거 모양 지붕의 매점. 손님의 허기를 채우고 쓰레기를 발생시킵니다.",
    baseCost: 160, runningCostPerMonth: 18, defaultPrice: 2.2, capacity: 1, sells: "food",
    colorPrimary: "#f59e0b", colorSecondary: "#b91c1c", footprintW: 1, footprintH: 1,
  },
  drink_stall: {
    id: "drink_stall", category: "shop", name: "음료 가판대", nameEn: "Drinks Stall",
    description: "거대한 탄산음료 컵 모양 지붕의 가판대. 손님의 갈증을 해소합니다.",
    baseCost: 140, runningCostPerMonth: 16, defaultPrice: 1.8, capacity: 1, sells: "drink",
    colorPrimary: "#0ea5e9", colorSecondary: "#f43f5e", footprintW: 1, footprintH: 1,
  },
  ice_cream_stall: {
    id: "ice_cream_stall", category: "shop", name: "소프트 아이스크림 가게", nameEn: "Ice Cream Stall",
    description: "거대한 콘 아이스크림 지붕이 돋보이는 디저트 상점. 행복도와 포만감을 높입니다.",
    baseCost: 170, runningCostPerMonth: 16, defaultPrice: 2.0, capacity: 1, sells: "food",
    colorPrimary: "#f472b6", colorSecondary: "#fef08a", footprintW: 1, footprintH: 1,
  },
  balloon_stall: {
    id: "balloon_stall", category: "shop", name: "풍선 상점", nameEn: "Balloon Stall",
    description: "알록달록한 헬륨 풍선을 판매해 관람객의 행복도를 높입니다 (클릭해 터뜨릴 수 있음).",
    baseCost: 180, runningCostPerMonth: 15, defaultPrice: 2.0, capacity: 1, sells: "balloon",
    colorPrimary: "#ec4899", colorSecondary: "#facc15", footprintW: 1, footprintH: 1,
  },
  info_kiosk: {
    id: "info_kiosk", category: "shop", name: "안내소 (우산·지도)", nameEn: "Information Kiosk",
    description: "공원 지도와 비 오는 날 필수품 우산을 판매합니다.",
    baseCost: 190, runningCostPerMonth: 16, defaultPrice: 2.5, capacity: 1, sells: "umbrella_map",
    colorPrimary: "#dc2626", colorSecondary: "#f8fafc", footprintW: 1, footprintH: 1,
  },
  restroom: {
    id: "restroom", category: "shop", name: "화장실", nameEn: "Restrooms",
    description: "음료를 마신 손님들의 화장실 욕구를 해소해 공원 만족도를 유지합니다.",
    baseCost: 150, runningCostPerMonth: 12, defaultPrice: 0.3, capacity: 2, sells: "restroom",
    colorPrimary: "#64748b", colorSecondary: "#e2e8f0", footprintW: 1, footprintH: 1,
  },
  first_aid: {
    id: "first_aid", category: "shop", name: "의무실", nameEn: "First Aid Room",
    description: "고강도 코스터를 타고 멀미가 난 손님들의 구토를 예방하고 회복시킵니다.",
    baseCost: 220, runningCostPerMonth: 20, defaultPrice: 0.0, capacity: 2, sells: "first_aid",
    colorPrimary: "#ffffff", colorSecondary: "#ef4444", footprintW: 1, footprintH: 1,
  },
  atm: {
    id: "atm", category: "shop", name: "현금인출기 (ATM)", nameEn: "Cash Machine",
    description: "현금이 떨어진 관람객이 추가로 돈을 인출해 공원에 더 오래 머물게 합니다.",
    baseCost: 280, runningCostPerMonth: 22, defaultPrice: 0.5, capacity: 1, sells: "atm",
    colorPrimary: "#1e40af", colorSecondary: "#22c55e", footprintW: 1, footprintH: 1,
  },
});

export const SCENERY_CATALOG = Object.freeze({
  tree_pine: { id: "tree_pine", group: "nature", name: "전나무", cost: 25, excitementBonus: 0.15 },
  tree_oak: { id: "tree_oak", group: "nature", name: "참나무", cost: 30, excitementBonus: 0.18 },
  tree_palm: { id: "tree_palm", group: "nature", name: "야자수", cost: 32, excitementBonus: 0.18 },
  tree_cherry: { id: "tree_cherry", group: "nature", name: "봄 벚꽃나무", cost: 40, excitementBonus: 0.25 },
  flowerbed: { id: "flowerbed", group: "nature", name: "꽃밭 화단", cost: 18, excitementBonus: 0.12 },
  rose_garden: { id: "rose_garden", group: "nature", name: "로열 장미 정원", cost: 28, excitementBonus: 0.18 },
  topiary_heart: { id: "topiary_heart", group: "nature", name: "하트 토피어리", cost: 35, excitementBonus: 0.22 },
  rock_boulder: { id: "rock_boulder", group: "nature", name: "조경 바위", cost: 22, excitementBonus: 0.14 },
  fountain: { id: "fountain", group: "monument", name: "3단 석조 분수대", cost: 85, excitementBonus: 0.35 },
  jumping_fountain: { id: "jumping_fountain", group: "monument", name: "무지개 점핑 분수", cost: 95, excitementBonus: 0.42 },
  statue_sawyer: { id: "statue_sawyer", group: "monument", name: "롤코 창업자 동상", cost: 110, excitementBonus: 0.45 },
  statue_mascot: { id: "statue_mascot", group: "monument", name: "AI위클리 마스코트 동상", cost: 120, excitementBonus: 0.50 },
  castle_tower: { id: "castle_tower", group: "monument", name: "중세 성곽 탑", cost: 130, excitementBonus: 0.45 },
  fence_white: { id: "fence_white", group: "monument", name: "화이트 정원 울타리", cost: 12, excitementBonus: 0.08 },
  neon_arch: { id: "neon_arch", group: "tech", name: "사이버 네온 아치", cost: 75, excitementBonus: 0.35 },
  banner_sign: { id: "banner_sign", group: "tech", name: "파크 환영 아치", cost: 80, excitementBonus: 0.30 },
  ai_billboard: { id: "ai_billboard", group: "tech", name: "미니 AI 뉴스 전광판", cost: 95, excitementBonus: 0.40 },
  firework_launcher: { id: "firework_launcher", group: "tech", name: "불꽃놀이 발사대 (클릭 시 발사)", cost: 140, excitementBonus: 0.55 },
});

export const PATH_TYPES = Object.freeze({
  tarmac: { id: "tarmac", name: "아스팔트 보도", cost: 12, color: "#64748b", border: "#475569" },
  dirt: { id: "dirt", name: "황토·원목 산책로", cost: 10, color: "#a16207", border: "#713f12" },
  crazy: { id: "crazy", name: "모자이크 보도", cost: 16, color: "#94a3b8", border: "#cbd5e1" },
  queue: { id: "queue", name: "대기열 전용줄 (파란 보도)", cost: 15, color: "#1d4ed8", border: "#60a5fa", isQueue: true },
});

export const STAFF_TYPES = Object.freeze({
  handyman: { id: "handyman", name: "미화원 (Handyman)", wagePerMonth: 50, hireCost: 50, shirtColor: "#2563eb", desc: "쓰레기와 구토물을 쓸어 담고 쓰레기통을 비웁니다." },
  mechanic: { id: "mechanic", name: "정비사 (Mechanic)", wagePerMonth: 80, hireCost: 80, shirtColor: "#ea580c", desc: "기구를 정기 점검하고 고장 난 놀이기구를 즉시 수리합니다." },
  guard: { id: "guard", name: "경비원 (Security)", wagePerMonth: 60, hireCost: 60, shirtColor: "#1e293b", desc: "공원 내 기물 파손과 소란을 방지합니다." },
  entertainer: { id: "entertainer", name: "엔터테이너 (Panda)", wagePerMonth: 55, hireCost: 55, shirtColor: "#f8fafc", desc: "대기열에서 기다리는 손님들의 짜증을 달래고 행복도를 올립니다." },
});

export const MARKETING_CAMPAIGNS = Object.freeze({
  free_entry: { id: "free_entry", name: "공원 무료 입장 쿠폰 배포", cost: 220, durationDays: 14, guestBoost: 2.2 },
  half_price_rides: { id: "half_price_rides", name: "AI위클리 특집 SNS 광고 캠페인", cost: 350, durationDays: 21, guestBoost: 2.8 },
  coaster_tv_spot: { id: "coaster_tv_spot", name: "TV 스릴 코스터 스포트 광고", cost: 520, durationDays: 28, guestBoost: 3.5 },
});

export const COASTER_BLUEPRINTS = Object.freeze({
  titan_woodie: {
    id: "titan_woodie",
    rideCatalogId: "wooden_coaster",
    name: "타이탄 우드 코스터",
    defaultOrigin: { x: 24, y: 26, z: 2, facing: 0 },
    pieces: [
      "station", "station", "station",
      "chain_up_steep", "chain_up_steep", "chain_up_gentle",
      "turn_right",
      "slope_down_steep", "slope_down_steep", "slope_down_gentle", "airtime_hill",
      "bank_right",
      "flat", "chain_up_gentle", "slope_down_gentle", "airtime_hill", "flat", "brakes",
      "bank_right",
      "flat", "flat", "flat", "brakes",
      "turn_right",
    ],
  },
  cyber_looper: {
    id: "cyber_looper",
    rideCatalogId: "steel_looping",
    name: "더블 루프 사이버 코스터",
    defaultOrigin: { x: 6, y: 6, z: 2, facing: 0 },
    pieces: [
      "station", "station", "station",
      "chain_up_steep", "chain_up_steep", "chain_up_steep",
      "slope_down_steep", "slope_down_steep", "slope_down_steep",
      "vertical_loop",
      "bank_right",
      "booster", "vertical_loop", "flat",
      "bank_right",
      "flat", "chain_up_gentle", "slope_up_gentle", "slope_down_gentle", "slope_down_gentle", "airtime_hill", "flat", "brakes", "flat", "flat",
      "bank_right",
      "flat", "flat", "flat",
      "turn_right",
    ],
  },
  mine_express: {
    id: "mine_express",
    rideCatalogId: "mine_train",
    name: "협곡 마인 익스프레스",
    defaultOrigin: { x: 6, y: 26, z: 2, facing: 0 },
    pieces: [
      "station", "station",
      "chain_up_gentle", "chain_up_gentle", "chain_up_gentle",
      "turn_right",
      "slope_down_gentle", "slope_down_steep",
      "bank_right",
      "flat", "airtime_hill", "flat", "flat", "brakes",
      "turn_right",
      "flat", "flat",
      "turn_right",
    ],
  },
  neon_invert: {
    id: "neon_invert",
    rideCatalogId: "inverted_coaster",
    name: "네온 인버티드 비행 코스터",
    defaultOrigin: { x: 10, y: 12, z: 2, facing: 0 },
    pieces: [
      "station", "station", "station",
      "chain_up_steep", "chain_up_steep", "chain_up_steep",
      "turn_right",
      "slope_down_steep", "slope_down_steep", "slope_down_steep", "vertical_loop",
      "bank_right",
      "booster", "vertical_loop", "airtime_hill", "flat", "brakes", "flat",
      "bank_right",
      "flat", "flat", "flat", "flat",
      "turn_right",
    ],
  },
  giga_hyper: {
    id: "giga_hyper",
    rideCatalogId: "hyper_coaster",
    name: "기가 하이퍼 메가 코스터",
    defaultOrigin: { x: 26, y: 8, z: 2, facing: 0 },
    pieces: [
      "station", "station", "station",
      "chain_up_steep", "chain_up_steep", "chain_up_steep", "chain_up_steep", "flat",
      "turn_right",
      "slope_down_steep", "slope_down_steep", "slope_down_steep", "slope_down_steep", "airtime_hill",
      "bank_right",
      "airtime_hill", "chain_up_gentle", "slope_up_gentle", "slope_down_gentle", "slope_down_gentle", "airtime_hill", "brakes", "flat",
      "bank_right",
      "flat", "flat", "flat", "flat", "flat",
      "turn_right",
    ],
  },
});

export const SCENARIO_PRESETS = Object.freeze({
  ai_weekly_park: {
    id: "ai_weekly_park",
    name: "AI위클리 메가 타이쿤 월드 (44×44)",
    subtitle: "5종 코스터·다채로운 놀이기구·외곽 AI 포스트 대형 광고판 24기가 설치된 대형 테마파크",
    terrainTheme: "grass",
    startingCash: 9500,
    startingLoan: 1000,
    maxLoan: 15000,
    parkEntryFee: 10,
    freeBuildDefault: false,
    objectiveText: "Year 2 10월까지 관람객 120명 및 공원 평점 800+ 달성",
    objectiveGuests: 120,
    objectiveRating: 800,
    entrance: { x: 22, y: 42 },
  },
  sandbox_canvas: {
    id: "sandbox_canvas",
    name: "🎨 자유 꾸미기 백지 샌드박스 (무제한 자금)",
    subtitle: "자금 무제한! 넓은 44×44 공원을 마음대로 칠하고 꾸미며 외곽 AI 포스트를 감상하세요.",
    terrainTheme: "grass",
    startingCash: 99999,
    startingLoan: 0,
    maxLoan: 0,
    parkEntryFee: 0,
    freeBuildDefault: true,
    objectiveText: "자유 창작 모드 — 무제한 예산으로 나만의 테마파크 디자인",
    objectiveGuests: 0,
    objectiveRating: 0,
    entrance: { x: 22, y: 42 },
  },
  forest_frontiers: {
    id: "forest_frontiers",
    name: "포레스트 프론티어 (44×44 확장판)",
    subtitle: "울창한 숲 한가운데 빈 땅에서 시작하는 1999년 오리지널 첫 번째 시나리오 확장판",
    terrainTheme: "grass",
    startingCash: 7500,
    startingLoan: 1500,
    maxLoan: 12000,
    parkEntryFee: 8,
    freeBuildDefault: false,
    objectiveText: "Year 2 10월까지 관람객 100명 및 공원 평점 700+ 달성",
    objectiveGuests: 100,
    objectiveRating: 700,
    entrance: { x: 22, y: 42 },
  },
  dynamite_dunes: {
    id: "dynamite_dunes",
    name: "다이너마이트 듄즈 (44×44 사막 확장판)",
    subtitle: "모래 사막과 중앙 오아시스 연못 주위에 사막 코스터를 건설하는 사막 시나리오",
    terrainTheme: "sand",
    startingCash: 7000,
    startingLoan: 2000,
    maxLoan: 12000,
    parkEntryFee: 12,
    freeBuildDefault: false,
    objectiveText: "Year 2 10월까지 관람객 110명 및 공원 평점 750+ 달성",
    objectiveGuests: 110,
    objectiveRating: 750,
    entrance: { x: 22, y: 42 },
  },
});

export const PEEP_SHIRT_COLORS = [
  "#ef4444", "#3b82f6", "#eab308", "#10b981", "#f97316",
  "#a855f7", "#ec4899", "#06b6d4", "#f43f5e", "#84cc16",
];

export const PEEP_FIRST_NAMES = [
  "민수", "지훈", "서연", "지은", "현우", "수빈", "도윤", "하은",
  "재현", "유진", "Chris", "Alex", "Mina", "Eric", "Yuna", "Sam",
];

export const PEEP_LAST_NAMES = [
  "김", "이", "박", "최", "정", "강", "윤", "임", "S.", "M.", "K.", "L.",
];
