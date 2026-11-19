import * as THREE from "three";

const PROFILE_STORAGE_KEY = "aiw-sp-profile-v1";

export const ELEMENT_DEFS = {
  fire: {
    id: "fire",
    label: "불",
    en: "FIRE",
    colorHex: "#f97316",
    colorInt: 0xf97316,
    accentHex: "#fef08a",
    beats: "wind",
    projKey: "fireball",
    ultKey: "flame_pillar",
    contentDomain: "AI 뉴스 속보",
    palette: "holy",
  },
  water: {
    id: "water",
    label: "물",
    en: "WATER",
    colorHex: "#38bdf8",
    colorInt: 0x38bdf8,
    accentHex: "#e0f2fe",
    beats: "fire",
    projKey: "ice_lance",
    ultKey: "frost_nova",
    contentDomain: "벤치마크·리서치",
    palette: "arcane",
  },
  wind: {
    id: "wind",
    label: "바람",
    en: "WIND",
    colorHex: "#34d399",
    colorInt: 0x34d399,
    accentHex: "#d1fae5",
    beats: "earth",
    projKey: "tornado",
    ultKey: "lightning_strike",
    contentDomain: "스타보드·플러그인",
    palette: "emerald",
  },
  earth: {
    id: "earth",
    label: "땅",
    en: "EARTH",
    colorHex: "#eab308",
    colorInt: 0xeab308,
    accentHex: "#fef9c3",
    beats: "water",
    projKey: "boulder",
    ultKey: "earth_spike",
    contentDomain: "소셜·개발 도구",
    palette: "holy",
  },
};

export const CARD_CATALOG = [
  // MAGIC slot (determines S projectile & D ultimate element + power)
  { id: "magic_fire", slot: "magic", element: "fire", name: "플레임 브레이킹 뉴스", desc: "화염구(S) & 불기둥(D) 발사 · 직선 화염 강슈팅", basePower: 26 },
  { id: "magic_water", slot: "magic", element: "water", name: "프로스트 벤치마크 랜스", desc: "아이스 랜스(S) & 프로스트 노바(D) · 유도 커브 슛", basePower: 24 },
  { id: "magic_wind", slot: "magic", element: "wind", name: "템페스트 스타 토네이도", desc: "회오리(S) & 낙뢰(D) · 초고속 스핀 로빙 슛", basePower: 25 },
  { id: "magic_earth", slot: "magic", element: "earth", name: "가이아 소셜 메테오", desc: "거대 바위(S) & 대지 가시(D) · 강력 바운스 슛", basePower: 28 },

  // BOOTS slot (determines movement speed, booster regen, dash cooldown, kick power)
  { id: "boots_fire", slot: "boots", element: "fire", name: "블레이즈 스트라이커 부츠", desc: "강진 슈팅 파워 +22% · 이동속도 +8%", speed: 1.08, kick: 1.22, booster: 1.05, dashCd: 0.95, jump: 1.04 },
  { id: "boots_water", slot: "boots", element: "water", name: "글래셔 글라이드 부츠", desc: "부스터 회복 +35% · 매끄러운 드리블 가속", speed: 1.09, kick: 1.08, booster: 1.35, dashCd: 0.90, jump: 1.05 },
  { id: "boots_wind", slot: "boots", element: "wind", name: "제피르 스피드 부츠", desc: "최고 이동속도 +18% · 대시 쿨타임 -28%", speed: 1.18, kick: 1.10, booster: 1.18, dashCd: 0.72, jump: 1.08 },
  { id: "boots_earth", slot: "boots", element: "earth", name: "타이탄 점프 부츠", desc: "점프력 +18% · 슈팅 파워 +18% · 안정적 드리블", speed: 1.06, kick: 1.18, booster: 1.12, dashCd: 0.92, jump: 1.18 },

  // AURA slot (determines ground/body pixel aura, MP regen, coin magnet & bonus)
  { id: "aura_fire", slot: "aura", element: "fire", name: "솔라 엠버 정령", desc: "크리티컬 확률 +18% · 콤보 보너스 극대화", mpRegen: 1.12, coinMul: 1.15, magnet: 2.2, critBonus: 0.18 },
  { id: "aura_water", slot: "aura", element: "water", name: "아쿠아 쉴드 정령", desc: "필살기 MP 충전 +40% · 푸른 픽셀 배리어", mpRegen: 1.40, coinMul: 1.10, magnet: 2.0, critBonus: 0.08 },
  { id: "aura_wind", slot: "aura", element: "wind", name: "스파크 페어리 정령", desc: "CODE 코인 자석 흡수 범위 2배 확대", mpRegen: 1.18, coinMul: 1.15, magnet: 4.2, critBonus: 0.10 },
  { id: "aura_earth", slot: "aura", element: "earth", name: "골드 크리스탈 정령", desc: "모든 CODE 코인 획득량 +40% 증폭", mpRegen: 1.10, coinMul: 1.40, magnet: 2.6, critBonus: 0.06 },
];

export function getCardTier(level) {
  const lv = Math.max(1, Math.min(9, Number(level) || 1));
  if (lv >= 8) return { id: "black", label: "BLACK", badge: "블랙" };
  if (lv >= 5) return { id: "gold", label: "GOLD", badge: "골드" };
  if (lv >= 3) return { id: "silver", label: "SILVER", badge: "실버" };
  return { id: "white", label: "WHITE", badge: "화이트" };
}

export function getUpgradeCost(level) {
  const lv = Math.max(1, Math.min(9, Number(level) || 1));
  return 25 + lv * 20;
}

function createDefaultProfile() {
  return {
    code: 120,
    exp: 0,
    goalsScored: 0,
    crystalsBroken: 0,
    cards: {
      magic_fire: 1,
      magic_water: 1,
      magic_wind: 1,
      magic_earth: 1,
      boots_wind: 1,
      boots_fire: 1,
      aura_water: 1,
      aura_fire: 1,
    },
    equipped: {
      magic: "magic_fire",
      boots: "boots_wind",
      aura: "aura_water",
    },
    visitedDistricts: [],
  };
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return createDefaultProfile();
    const parsed = JSON.parse(raw);
    const def = createDefaultProfile();
    return {
      ...def,
      ...parsed,
      cards: { ...def.cards, ...(parsed.cards || {}) },
      equipped: { ...def.equipped, ...(parsed.equipped || {}) },
      visitedDistricts: Array.isArray(parsed.visitedDistricts) ? parsed.visitedDistricts : [],
    };
  } catch {
    return createDefaultProfile();
  }
}

function createArcadePitchTexture() {
  const w = 512;
  const h = 256;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  // Bright Survival Project vibrant striped turf
  const stripes = 10;
  const sw = w / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#38b55d" : "#44c76b";
    ctx.fillRect(i * sw, 0, sw + 1, h);
  }

  // Subtle sunny pixel-grid grass texture
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  for (let y = 0; y < h; y += 8) {
    for (let x = (y % 16 === 0 ? 0 : 4); x < w; x += 8) {
      ctx.fillRect(x, y, 3, 3);
    }
  }

  // Blue & Red team half subtle tint near goals
  const blueG = ctx.createLinearGradient(0, 0, 82, 0);
  blueG.addColorStop(0, "rgba(56, 189, 248, 0.34)");
  blueG.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = blueG;
  ctx.fillRect(0, 0, 82, h);

  const redG = ctx.createLinearGradient(w, 0, w - 82, 0);
  redG.addColorStop(0, "rgba(244, 63, 94, 0.34)");
  redG.addColorStop(1, "rgba(244, 63, 94, 0)");
  ctx.fillStyle = redG;
  ctx.fillRect(w - 82, 0, 82, h);

  // Crisp white pitch lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 4;
  ctx.strokeRect(14, 12, w - 28, h - 24);

  // Center line & circle
  ctx.beginPath();
  ctx.moveTo(w / 2, 12);
  ctx.lineTo(w / 2, h - 12);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 42, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // Penalty boxes
  ctx.strokeRect(14, h / 2 - 58, 66, 116);
  ctx.strokeRect(w - 80, h / 2 - 58, 66, 116);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createGoalNetTexture() {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = s; c.height = s;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, s, s);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= s; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(s, i); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  return tex;
}

function createSoccerBallTexture() {
  const w = 128;
  const h = 64;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#1e293b";
  const spots = [
    [16, 16], [48, 16], [80, 16], [112, 16],
    [32, 34], [64, 34], [96, 34], [0, 34],
    [16, 50], [48, 50], [80, 50], [112, 50],
  ];
  for (const [sx, sy] of spots) {
    ctx.beginPath();
    ctx.arc(sx, sy, 6.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Golden Survival Project star stripe
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * SurvivalArena — Survival Project (서바이벌 프로젝트) Arcade Core for WeeklyWorld.
 * Includes:
 *  - Mini Arcade Soccer Pitch ("강진축구") with dribbling, power shots, elemental curve shots, goal celebration & score
 *  - 4-Element Spirit Crystals (Fire/Water/Wind/Earth) with elemental counter crits & coin bursts
 *  - Collectible spinning CODE coins (MIT pixelfx coin_spin) with magnet pickup & combo meter
 *  - 4-Element Card Deck (White/Silver/Gold/Black Lv.1..9) persisted in localStorage
 */
export class SurvivalArena {
  constructor(scene, pixelVfx, vfx, callbacks = {}) {
    this.scene = scene;
    this.pixelVfx = pixelVfx;
    this.vfx = vfx;
    this.callbacks = callbacks;

    this.profile = loadProfile();
    this.group = new THREE.Group();
    this.group.name = "SurvivalProjectArena";
    this.scene.add(this.group);

    // Pitch geometry bounds (wide-open south arena between Social Lounge & Observatory)
    this.pitch = {
      cx: 0,
      cz: 16.2,
      halfW: 7.4,
      halfD: 3.8,
      goalHalfZ: 1.48,
      goalDepth: 1.25,
    };

    this.score = { blue: 0, red: 0 };
    this.goalCooldown = 0;

    // Arcade Combat / Action gauges & Combo State Machine
    this.booster = 100;
    this.maxBooster = 100;
    this.mp = 65;
    this.maxMp = 100;
    this.combo = 0;
    this.comboTimer = 0;
    this.meleeCooldown = 0;
    this.meleeComboStep = 0;      // 0 -> 1 -> 2 (3-hit Survival Project combo)
    this.meleeComboWindow = 0;    // time left to chain next melee hit
    this.magicCooldown = 0;
    this.ultCooldown = 0;
    this.screenShake = 0;
    this.hitstopTimer = 0;        // crisp arcade hit-freeze frames (30~75ms)

    // Guard / Just-Parry & Magic Charge state
    this.isGuarding = false;
    this.guardElapsed = 0;
    this.guardShieldLoop = null;
    this.chargeLoop = null;

    // Ball state
    this.ball = {
      x: this.pitch.cx,
      y: 0.34,
      z: this.pitch.cz,
      vx: 0,
      vy: 0,
      vz: 0,
      radius: 0.34,
      lastTouchElement: null,
      curveForceZ: 0,
      trailTimer: 0,
      mesh: null,
      shadow: null,
    };

    this.crystals = [];
    this.slimes = [];
    this.enemyOrbs = [];
    this.coins = [];
    this.heroAuraLoop = null;
    this.heroAuraElement = null;
    this._ballSyncTimer = 0;

    // Shared disposable resources
    this._disposables = [];

    this._buildSoccerPitch();
    this._buildElementalCrystals();
    this._spawnSparringSlimes();
    this._spawnInitialPlazaCoins();
  }

  getComboRank() {
    if (this.combo >= 15) return { grade: "SS", label: "SURVIVAL KING" };
    if (this.combo >= 10) return { grade: "S", label: "SUPER" };
    if (this.combo >= 6) return { grade: "A", label: "GREAT" };
    if (this.combo >= 3) return { grade: "B", label: "NICE" };
    return { grade: "C", label: "HIT" };
  }

  _saveProfile() {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(this.profile));
    } catch {
      // ignore quota errors
    }
  }

  getEquippedCard(slot) {
    const id = this.profile.equipped[slot];
    const def = CARD_CATALOG.find((c) => c.id === id) || CARD_CATALOG.find((c) => c.slot === slot);
    const level = this.profile.cards[def.id] || 1;
    return { ...def, level, tier: getCardTier(level) };
  }

  getPlayerStats() {
    const magic = this.getEquippedCard("magic");
    const boots = this.getEquippedCard("boots");
    const aura = this.getEquippedCard("aura");
    const mScale = 1 + (magic.level - 1) * 0.14;
    const bScale = 1 + (boots.level - 1) * 0.04;
    const aScale = 1 + (aura.level - 1) * 0.06;

    return {
      element: magic.element,
      magicCard: magic,
      bootsCard: boots,
      auraCard: aura,
      magicPower: Math.round(magic.basePower * mScale),
      speedMul: (boots.speed || 1.05) * (1 + (boots.level - 1) * 0.025),
      kickPowerMul: (boots.kick || 1.1) * bScale,
      boosterRegenMul: (boots.booster || 1.05) * bScale,
      dashCooldownMul: Math.max(0.55, (boots.dashCd || 0.95) - (boots.level - 1) * 0.02),
      jumpMul: (boots.jump || 1.05) * (1 + (boots.level - 1) * 0.015),
      mpRegenMul: (aura.mpRegen || 1.1) * aScale,
      coinBonusMul: (aura.coinMul || 1.1) * aScale,
      magnetRadius: (aura.magnet || 2.2) + (aura.level - 1) * 0.16,
      critChance: Math.min(0.65, 0.14 + (aura.critBonus || 0.06) + (magic.level - 1) * 0.02),
    };
  }

  equipCard(cardId) {
    const def = CARD_CATALOG.find((c) => c.id === cardId);
    if (!def || !this.profile.cards[cardId]) return false;
    this.profile.equipped[def.slot] = cardId;
    this._saveProfile();
    this.callbacks.onProfileChanged?.(this.profile, this.getPlayerStats());
    return true;
  }

  upgradeCard(cardId, heroPos) {
    const def = CARD_CATALOG.find((c) => c.id === cardId);
    if (!def) return { ok: false, reason: "존재하지 않는 카드입니다." };
    const curLv = this.profile.cards[cardId] || 0;
    if (curLv <= 0) return { ok: false, reason: "미보유 카드입니다. 먼저 카드 팩을 열어 획득하세요." };
    if (curLv >= 9) return { ok: false, reason: "이미 최고 등급(Lv.9 BLACK)입니다!" };
    const cost = getUpgradeCost(curLv);
    if (this.profile.code < cost) {
      return { ok: false, reason: `CODE가 부족합니다 (필요 ${cost} / 보유 ${this.profile.code}).` };
    }
    this.profile.code -= cost;
    this.profile.cards[cardId] = curLv + 1;
    this.profile.exp += 45;
    this._saveProfile();

    const nextTier = getCardTier(curLv + 1);
    if (heroPos) {
      this.pixelVfx?.spawnBurst("level_up", { x: heroPos.x, y: 1.5, z: heroPos.z, scale: 3.1, additive: false });
      this.vfx?.spawnDamageNumber(heroPos.x, 2.2, heroPos.z, `${def.name} Lv.${curLv + 1} ${nextTier.label}!`, "crit");
    }
    this.callbacks.onProfileChanged?.(this.profile, this.getPlayerStats());
    return { ok: true, newLevel: curLv + 1, tier: nextTier };
  }

  openCardPack(heroPos) {
    const cost = 50;
    if (this.profile.code < cost) {
      return { ok: false, reason: `카드 팩 개봉에는 ${cost} CODE가 필요합니다.` };
    }
    this.profile.code -= cost;
    // Prefer unowned cards first (65% bias) so collection feels rewarding
    const unowned = CARD_CATALOG.filter((c) => !this.profile.cards[c.id]);
    const pick = unowned.length && Math.random() < 0.65
      ? unowned[Math.floor(Math.random() * unowned.length)]
      : CARD_CATALOG[Math.floor(Math.random() * CARD_CATALOG.length)];

    let isNew = false;
    let bonusCode = 0;
    if (!this.profile.cards[pick.id]) {
      this.profile.cards[pick.id] = 1;
      isNew = true;
    } else if (this.profile.cards[pick.id] < 9) {
      this.profile.cards[pick.id] += 1;
    } else {
      bonusCode = 35;
      this.profile.code += bonusCode;
    }
    this.profile.exp += 35;
    this._saveProfile();

    const lv = this.profile.cards[pick.id];
    const tier = getCardTier(lv);
    if (heroPos) {
      this.pixelVfx?.spawnBurst("collect_burst", { x: heroPos.x, y: 1.4, z: heroPos.z, scale: 2.8, additive: true });
      this.pixelVfx?.spawnBurst("level_up", { x: heroPos.x, y: 1.7, z: heroPos.z, scale: 2.9 });
      this.vfx?.spawnDamageNumber(heroPos.x, 2.3, heroPos.z, isNew ? `NEW! ${pick.name}` : `${pick.name} Lv.${lv}!`, "magic");
    }
    this.callbacks.onProfileChanged?.(this.profile, this.getPlayerStats());
    return { ok: true, card: pick, level: lv, tier, isNew, bonusCode };
  }

  grantContentVisitReward(districtId, label, heroPos) {
    const firstTime = !this.profile.visitedDistricts.includes(districtId);
    const baseReward = firstTime ? 45 : 15;
    const reward = Math.round(baseReward * this.getPlayerStats().coinBonusMul);
    if (firstTime) this.profile.visitedDistricts.push(districtId);
    this.profile.code += reward;
    this.profile.exp += firstTime ? 60 : 20;
    this._saveProfile();

    if (heroPos) {
      this.pixelVfx?.spawnBurst("collect_burst", { x: heroPos.x, y: 1.4, z: heroPos.z, scale: 2.4, additive: true });
      this.vfx?.spawnDamageNumber(heroPos.x, 2.1, heroPos.z, `+${reward} CODE (${label})`, "heal");
    }
    this.callbacks.onProfileChanged?.(this.profile, this.getPlayerStats());
    return reward;
  }

  _buildSoccerPitch() {
    const { cx, cz, halfW, halfD, goalHalfZ, goalDepth } = this.pitch;

    // 1. Bright arcade striped turf plane
    const pitchTex = createArcadePitchTexture();
    const pitchGeo = new THREE.PlaneGeometry(halfW * 2, halfD * 2);
    pitchGeo.rotateX(-Math.PI / 2);
    const pitchMat = new THREE.MeshStandardMaterial({
      map: pitchTex,
      roughness: 0.88,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
    pitchMesh.position.set(cx, 0.032, cz);
    pitchMesh.receiveShadow = true;
    pitchMesh.userData.walkable = true;
    this.group.add(pitchMesh);
    this._disposables.push(pitchTex, pitchGeo, pitchMat);

    // 2. Decorative low wooden arcade pitch border curbs (north & south sidelines)
    const curbGeo = new THREE.BoxGeometry(halfW * 2 + 0.3, 0.16, 0.18);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.72 });
    for (const signZ of [-1, 1]) {
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(cx, 0.09, cz + signZ * (halfD + 0.08));
      curb.castShadow = true;
      curb.receiveShadow = true;
      this.group.add(curb);
    }
    this._disposables.push(curbGeo, curbMat);

    // 3. Blue Goal (West: -halfW) & Red Goal (East: +halfW)
    const postGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.55, 8);
    const crossbarGeo = new THREE.CylinderGeometry(0.065, 0.065, goalHalfZ * 2 + 0.12, 8);
    crossbarGeo.rotateX(Math.PI / 2);
    const backNetGeo = new THREE.PlaneGeometry(goalHalfZ * 2, 1.5);
    const sideNetGeo = new THREE.PlaneGeometry(goalDepth, 1.5);

    const netTex = createGoalNetTexture();
    this._disposables.push(postGeo, crossbarGeo, backNetGeo, sideNetGeo, netTex);

    for (const side of [
      { id: "blue", sign: -1, color: 0x38bdf8, emissive: 0x0284c7 },
      { id: "red", sign: 1, color: 0xf43f5e, emissive: 0xbe123c },
    ]) {
      const frameMat = new THREE.MeshStandardMaterial({
        color: side.color,
        emissive: side.emissive,
        emissiveIntensity: 0.32,
        roughness: 0.35,
        metalness: 0.3,
      });
      const netMat = new THREE.MeshBasicMaterial({
        map: netTex,
        color: side.color,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this._disposables.push(frameMat, netMat);

      const gx = cx + side.sign * halfW;
      const gGroup = new THREE.Group();
      gGroup.position.set(gx, 0, cz);

      // Front posts
      for (const sz of [-goalHalfZ, goalHalfZ]) {
        const post = new THREE.Mesh(postGeo, frameMat);
        post.position.set(0, 0.78, sz);
        post.castShadow = true;
        gGroup.add(post);

        const backPost = new THREE.Mesh(postGeo, frameMat);
        backPost.position.set(side.sign * goalDepth, 0.78, sz);
        gGroup.add(backPost);

        const sideNet = new THREE.Mesh(sideNetGeo, netMat);
        sideNet.position.set(side.sign * goalDepth * 0.5, 0.75, sz);
        gGroup.add(sideNet);
      }

      // Crossbar
      const bar = new THREE.Mesh(crossbarGeo, frameMat);
      bar.position.set(0, 1.55, 0);
      gGroup.add(bar);

      // Back net
      const backNet = new THREE.Mesh(backNetGeo, netMat);
      backNet.rotation.y = Math.PI / 2;
      backNet.position.set(side.sign * goalDepth, 0.75, 0);
      gGroup.add(backNet);

      this.group.add(gGroup);
    }

    // 4. Arcade Soccer Ball + dynamic ground shadow
    const ballTex = createSoccerBallTexture();
    const ballGeo = new THREE.SphereGeometry(this.ball.radius, 18, 14);
    const ballMat = new THREE.MeshStandardMaterial({
      map: ballTex,
      roughness: 0.38,
      metalness: 0.08,
    });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.position.set(this.ball.x, this.ball.y, this.ball.z);
    ballMesh.castShadow = true;
    this.group.add(ballMesh);

    const shadowGeo = new THREE.CircleGeometry(this.ball.radius * 1.15, 16);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.set(this.ball.x, 0.045, this.ball.z);
    this.group.add(shadowMesh);

    this.ball.mesh = ballMesh;
    this.ball.shadow = shadowMesh;
    this._disposables.push(ballTex, ballGeo, ballMat, shadowGeo, shadowMat);
  }

  _buildElementalCrystals() {
    const placements = [
      { id: "crys-fire", element: "fire", x: -6.4, z: -2.4 },
      { id: "crys-water", element: "water", x: 6.4, z: -2.4 },
      { id: "crys-wind", element: "wind", x: -6.4, z: 2.8 },
      { id: "crys-earth", element: "earth", x: 6.4, z: 2.8 },
    ];

    const crysGeo = new THREE.OctahedronGeometry(0.68, 0);
    const baseGeo = new THREE.CylinderGeometry(0.75, 0.92, 0.24, 6);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xe7dcc6, roughness: 0.85 });
    this._disposables.push(crysGeo, baseGeo, baseMat);

    for (const p of placements) {
      const edef = ELEMENT_DEFS[p.element];
      const mat = new THREE.MeshStandardMaterial({
        color: edef.colorInt,
        emissive: edef.colorInt,
        emissiveIntensity: 0.48,
        roughness: 0.22,
        metalness: 0.15,
      });
      this._disposables.push(mat);

      const ped = new THREE.Mesh(baseGeo, baseMat);
      ped.position.set(p.x, 0.12, p.z);
      ped.castShadow = true;
      ped.receiveShadow = true;
      this.group.add(ped);

      const mesh = new THREE.Mesh(crysGeo, mat);
      mesh.position.set(p.x, 1.15, p.z);
      mesh.scale.set(0.85, 1.45, 0.85);
      mesh.castShadow = true;
      this.group.add(mesh);

      this.crystals.push({
        id: p.id,
        element: p.element,
        x: p.x,
        z: p.z,
        hp: 100,
        maxHp: 100,
        alive: true,
        respawnTimer: 0,
        hitFlash: 0,
        phase: Math.random() * Math.PI * 2,
        mesh,
        mat,
      });
    }
  }

  _spawnSparringSlimes() {
    const spawns = [
      { id: "slime-fire", element: "fire", x: -4.2, z: -4.4 },
      { id: "slime-water", element: "water", x: 4.2, z: -4.4 },
      { id: "slime-wind", element: "wind", x: -4.8, z: 4.8 },
      { id: "slime-earth", element: "earth", x: 4.8, z: 4.8 },
    ];
    const shadowGeo = new THREE.CircleGeometry(0.55, 14);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    this._disposables.push(shadowGeo, shadowMat);

    for (const s of spawns) {
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.set(s.x, 0.04, s.z);
      this.group.add(shadow);
      this.slimes.push({
        id: s.id,
        element: s.element,
        homeX: s.x,
        homeZ: s.z,
        x: s.x,
        y: 0.55,
        z: s.z,
        vx: 0,
        vy: 0,
        vz: 0,
        hp: 120,
        maxHp: 120,
        alive: true,
        respawnTimer: 0,
        stunTimer: 0,
        hitFlash: 0,
        attackTimer: 3.2 + Math.random() * 2.8,
        telegraphTimer: 0,
        hopPhase: Math.random() * Math.PI * 2,
        loop: null, // lazily attached once pixelVfx manifest is ready
        shadow,
      });
    }
  }

  _ensureSlimeSprites() {
    if (!this.pixelVfx?.manifest?.slime) return;
    for (const sl of this.slimes) {
      if (sl.loop) continue;
      const edef = ELEMENT_DEFS[sl.element] || ELEMENT_DEFS.fire;
      sl.loop = this.pixelVfx.createLoopBillboard("slime", {
        x: sl.x,
        y: sl.y,
        z: sl.z,
        scale: 1.55,
        fps: 11,
        tint: edef.colorInt,
        renderOrder: 10,
      });
    }
  }

  setGuard(active, heroPos) {
    const next = Boolean(active);
    if (next && !this.isGuarding) {
      this.isGuarding = true;
      this.guardElapsed = 0;
      if (heroPos && this.pixelVfx?.manifest?.pb_shield && !this.guardShieldLoop) {
        const edef = ELEMENT_DEFS[this.getPlayerStats().element] || ELEMENT_DEFS.water;
        this.guardShieldLoop = this.pixelVfx.createLoopBillboard("pb_shield", {
          x: heroPos.x,
          y: (heroPos.y || 0) + 1.05,
          z: heroPos.z,
          scale: 2.15,
          fps: 18,
          tint: edef.colorInt,
          opacity: 0.85,
          additive: true,
          renderOrder: 15,
        });
      }
    } else if (!next && this.isGuarding) {
      this.isGuarding = false;
      this.guardElapsed = 0;
      if (this.guardShieldLoop) {
        this.guardShieldLoop.dispose();
        this.guardShieldLoop = null;
      }
    }
  }

  setMagicChargeVisual(active, heroPos) {
    if (active && heroPos && this.pixelVfx?.manifest?.spell_charge) {
      if (!this.chargeLoop) {
        const edef = ELEMENT_DEFS[this.getPlayerStats().element] || ELEMENT_DEFS.fire;
        this.chargeLoop = this.pixelVfx.createLoopBillboard("spell_charge", {
          x: heroPos.x,
          y: (heroPos.y || 0) + 1.05,
          z: heroPos.z,
          scale: 2.35,
          fps: 16,
          tint: edef.colorInt,
          opacity: 0.9,
          additive: true,
          renderOrder: 14,
        });
      } else if (this.chargeLoop.alive) {
        this.chargeLoop.mesh.position.set(heroPos.x, (heroPos.y || 0) + 1.05, heroPos.z);
      }
    } else if (!active && this.chargeLoop) {
      this.chargeLoop.dispose();
      this.chargeLoop = null;
    }
  }

  _spawnInitialPlazaCoins() {
    const spots = [
      [-6.0, -7.8], [6.0, -7.8], [-8.0, 0.0], [8.0, 0.0],
      [-4.2, 6.2], [4.2, 6.2],
    ];
    for (const [x, z] of spots) {
      this.spawnCoin(x, z, 0, 0, 1.6);
    }
  }

  spawnCoin(x, z, vx = 0, vz = 0, vy = 4.2, value = 12) {
    if (this.coins.length >= 24) return; // strict cap for low memory
    const loop = this.pixelVfx?.createLoopBillboard("coin_spin", {
      x,
      y: 0.65,
      z,
      scale: 0.82,
      fps: 14,
      renderOrder: 11,
    });
    if (!loop) return;
    this.coins.push({
      x,
      y: 0.65,
      z,
      vx,
      vy,
      vz,
      value,
      age: 0,
      loop,
    });
  }

  /**
   * Action [Z / J]: Authentic Survival Project 3-Hit Combo, Dash-Slide Attack & Aerial Jump Attack!
   * Returns lunge/dive physics directive for the hero controller.
   */
  triggerMeleeAction(heroPos, facingAngle, opts = {}) {
    const isSliding = Boolean(opts.isSliding);
    const isAirborne = (heroPos.y || 0) > 0.32;
    if (this.meleeCooldown > 0) return null;

    const stats = this.getPlayerStats();
    const edef = ELEMENT_DEFS[stats.element];
    const dirX = Math.sin(facingAngle);
    const dirZ = Math.cos(facingAngle);
    const flipX = dirX < -0.15;

    let attackKind = "combo1";
    let vfxKey = "sword_slash";
    let vfxScale = 2.65;
    let lungeSpeed = 7.5;
    let diveVy = 0;
    let hitRadius = 2.25;
    let knockHoriz = 7.2;
    let knockUp = 3.2;
    let dmgMul = 1.0;
    let hitstop = 0.032;

    if (isAirborne) {
      attackKind = "air_slam";
      vfxKey = "spin_slash";
      vfxScale = 3.35;
      lungeSpeed = 6.0;
      diveVy = -19.5;
      hitRadius = 3.1;
      knockHoriz = 9.5;
      knockUp = 7.8;
      dmgMul = 1.45;
      hitstop = 0.055;
      this.meleeCooldown = 0.32;
      this.meleeComboStep = 0;
      this.meleeComboWindow = 0;
    } else if (isSliding) {
      attackKind = "dash_slide";
      vfxKey = "thrust";
      vfxScale = 3.4;
      lungeSpeed = 16.5;
      hitRadius = 2.75;
      knockHoriz = 15.5;
      knockUp = 4.6;
      dmgMul = 1.4;
      hitstop = 0.052;
      this.meleeCooldown = 0.24;
      this.meleeComboStep = 1;
      this.meleeComboWindow = 0.65;
      this.pixelVfx?.spawnBurst("dash_strike", {
        x: heroPos.x + dirX * 0.6,
        y: 0.9,
        z: heroPos.z + dirZ * 0.6,
        scale: 3.1,
        fps: 22,
        tint: edef.colorInt,
        flipX,
        additive: true,
      });
    } else {
      const step = this.meleeComboWindow > 0 ? this.meleeComboStep : 0;
      if (step === 0) {
        attackKind = "combo1";
        vfxKey = "sword_slash";
        vfxScale = 2.65;
        lungeSpeed = 7.2;
        knockHoriz = 6.8;
        knockUp = 2.8;
        dmgMul = 1.0;
        hitstop = 0.030;
        this.meleeCooldown = 0.17;
        this.meleeComboStep = 1;
        this.meleeComboWindow = 0.68;
      } else if (step === 1) {
        attackKind = "combo2";
        vfxKey = "double_slash";
        vfxScale = 2.95;
        lungeSpeed = 9.2;
        knockHoriz = 8.8;
        knockUp = 4.2;
        dmgMul = 1.25;
        hitstop = 0.038;
        this.meleeCooldown = 0.18;
        this.meleeComboStep = 2;
        this.meleeComboWindow = 0.68;
      } else {
        attackKind = "combo3";
        vfxKey = "heavy_cleave";
        vfxScale = 3.6;
        lungeSpeed = 11.8;
        hitRadius = 2.85;
        knockHoriz = 15.8;
        knockUp = 8.6;
        dmgMul = 1.75;
        hitstop = 0.068;
        this.meleeCooldown = 0.34;
        this.meleeComboStep = 0;
        this.meleeComboWindow = 0;
      }
    }

    const hitX = heroPos.x + dirX * (attackKind === "dash_slide" ? 1.85 : 1.45);
    const hitZ = heroPos.z + dirZ * (attackKind === "dash_slide" ? 1.85 : 1.45);

    this.pixelVfx?.spawnBurst(vfxKey, {
      x: hitX,
      y: 1.0 + (heroPos.y || 0),
      z: hitZ,
      scale: vfxScale,
      fps: 22,
      tint: edef.colorInt,
      flipX,
    });

    let landedHit = false;

    // 1. Check Soccer Ball Kick ("강진 슈팅 / 대시 스파이크 / 피니시 슛!")
    const bDist = Math.hypot(this.ball.x - hitX, this.ball.z - hitZ);
    const heroBallDist = Math.hypot(this.ball.x - heroPos.x, this.ball.z - heroPos.z);
    if (bDist < hitRadius || heroBallDist < 1.85) {
      const baseKick = attackKind === "dash_slide" ? 20.5 : attackKind === "combo3" ? 19.0 : attackKind === "air_slam" ? 17.5 : 14.5;
      const kickPower = baseKick * stats.kickPowerMul;
      this.ball.vx = dirX * kickPower;
      this.ball.vz = dirZ * kickPower;
      this.ball.vy = attackKind === "combo3" ? 6.4 : attackKind === "dash_slide" ? 4.4 : 3.6;
      this.ball.lastTouchElement = stats.element;
      this.ball.curveForceZ = 0;
      this.screenShake = Math.max(this.screenShake, attackKind === "combo3" || attackKind === "dash_slide" ? 0.24 : 0.14);
      this.mp = Math.min(this.maxMp, this.mp + 12);

      this.pixelVfx?.spawnBurst("crit_hit", { x: this.ball.x, y: 0.75, z: this.ball.z, scale: 2.6, fps: 20 });
      const shotText =
        attackKind === "dash_slide" ? "SLIDE SPIKE!!"
          : attackKind === "combo3" ? "FINISH SHOT!!"
          : attackKind === "air_slam" ? "AIR VOLLEY!!"
          : "POWER SHOT!";
      this.vfx?.spawnDamageNumber(this.ball.x, 1.45, this.ball.z, shotText, attackKind === "combo1" ? "magic" : "crit");
      this._addCombo(1);
      this.callbacks.onBallKick?.(this.ball);
      landedHit = true;
    }

    // 2. Check Juggleable Elemental Sparring Slimes (Knockback + Skid + Air Juggle!)
    for (const sl of this.slimes) {
      if (!sl.alive) continue;
      if (Math.hypot(sl.x - hitX, sl.z - hitZ) < hitRadius + 0.35) {
        const dmg = Math.round((26 + stats.magicPower * 0.5) * dmgMul);
        const isAirJuggle = sl.y > 1.05;
        this._damageSlime(sl, dmg, stats.element, stats.critChance, {
          kx: dirX * knockHoriz,
          kz: dirZ * knockHoriz,
          ky: isAirJuggle ? Math.max(6.8, knockUp) : knockUp,
          tag: isAirJuggle ? "AIR JUGGLE!!" : attackKind === "dash_slide" ? "SLIDE HIT!" : attackKind === "combo3" ? "FINISH!!" : "",
        });
        landedHit = true;
      }
    }

    // 3. Check Elemental Spirit Crystals
    for (const c of this.crystals) {
      if (!c.alive) continue;
      if (Math.hypot(c.x - hitX, c.z - hitZ) < hitRadius) {
        const dmg = Math.round((28 + stats.magicPower * 0.45) * dmgMul);
        this._damageCrystal(c, dmg, stats.element, stats.critChance);
        landedHit = true;
      }
    }

    if (landedHit) {
      this.hitstopTimer = Math.max(this.hitstopTimer, hitstop);
      this.screenShake = Math.max(this.screenShake, attackKind === "combo3" || attackKind === "dash_slide" ? 0.22 : 0.12);
    }

    this.callbacks.onSkillCast?.("melee", stats.element, heroPos.x, heroPos.z, facingAngle);
    return { attackKind, lungeX: dirX * lungeSpeed, lungeZ: dirZ * lungeSpeed, diveVy, landedHit };
  }

  /**
   * Called when hero lands from an Aerial Jump Attack! Triggers Survival Project Ground-Slam AoE launcher!
   */
  triggerAirSlamImpact(heroPos) {
    const stats = this.getPlayerStats();
    const edef = ELEMENT_DEFS[stats.element];
    this.screenShake = Math.max(this.screenShake, 0.28);
    this.hitstopTimer = Math.max(this.hitstopTimer, 0.055);

    this.pixelVfx?.spawnBurst("ground_slam", {
      x: heroPos.x,
      y: 0.95,
      z: heroPos.z,
      scale: 3.8,
      fps: 18,
      tint: edef.colorInt,
    });
    this.pixelVfx?.spawnBurst("poof", { x: heroPos.x, y: 0.45, z: heroPos.z, scale: 2.6, fps: 18 });

    // Launch nearby slimes & ball skyward for juggle chains!
    const radius = 3.8;
    const bDist = Math.hypot(this.ball.x - heroPos.x, this.ball.z - heroPos.z);
    if (bDist < radius) {
      const nx = (this.ball.x - heroPos.x) / Math.max(0.1, bDist);
      const nz = (this.ball.z - heroPos.z) / Math.max(0.1, bDist);
      this.ball.vx = nx * 13.5 * stats.kickPowerMul;
      this.ball.vz = nz * 13.5 * stats.kickPowerMul;
      this.ball.vy = 8.4;
      this.vfx?.spawnDamageNumber(this.ball.x, 1.6, this.ball.z, "SLAM LAUNCH!!", "crit");
      this.callbacks.onBallKick?.(this.ball);
    }
    for (const sl of this.slimes) {
      if (!sl.alive) continue;
      const d = Math.hypot(sl.x - heroPos.x, sl.z - heroPos.z);
      if (d < radius) {
        const nx = (sl.x - heroPos.x) / Math.max(0.1, d);
        const nz = (sl.z - heroPos.z) / Math.max(0.1, d);
        this._damageSlime(sl, Math.round(stats.magicPower * 1.45), stats.element, stats.critChance + 0.15, {
          kx: nx * 9.5,
          kz: nz * 9.5,
          ky: 9.2,
          tag: "LAUNCH!!",
        });
      }
    }
    for (const c of this.crystals) {
      if (!c.alive) continue;
      if (Math.hypot(c.x - heroPos.x, c.z - heroPos.z) < radius) {
        this._damageCrystal(c, Math.round(stats.magicPower * 1.3), stats.element, stats.critChance);
      }
    }
  }

  /**
   * Action [X / K]: Fast Shot (tap) OR Overcharged Elemental Cannon (hold >= 0.42s)!
   */
  triggerMagicAction(heroPos, facingAngle, chargeRatio = 0) {
    const isCharged = chargeRatio >= 0.85;
    const mpCost = isCharged ? 28 : 14;
    if (this.magicCooldown > 0 || this.mp < mpCost) return false;
    this.magicCooldown = isCharged ? 0.52 : 0.34;
    this.mp = Math.max(0, this.mp - mpCost);

    const stats = this.getPlayerStats();
    const edef = ELEMENT_DEFS[stats.element];
    const dirX = Math.sin(facingAngle);
    const dirZ = Math.cos(facingAngle);
    const baseSpeed = stats.element === "wind" ? 16.5 : stats.element === "water" ? 15.0 : stats.element === "fire" ? 14.5 : 12.5;
    const projSpeed = baseSpeed * (isCharged ? 1.25 : 1.0);

    this.pixelVfx?.spawnBurst("magic_circle", {
      x: heroPos.x,
      y: 0.08,
      z: heroPos.z,
      scale: isCharged ? 3.2 : 2.2,
      fps: 18,
      groundFlat: true,
      tint: edef.colorInt,
      additive: true,
    });

    if (isCharged) {
      this.screenShake = Math.max(this.screenShake, 0.2);
      this.vfx?.spawnDamageNumber(heroPos.x, 2.35, heroPos.z, `OVERCHARGE ${edef.en}!!`, "crit");
    }

    this.pixelVfx?.spawnProjectile(edef.projKey, {
      x: heroPos.x + dirX * 0.9,
      y: 1.05 + (heroPos.y || 0),
      z: heroPos.z + dirZ * 0.9,
      vx: dirX * projSpeed,
      vz: dirZ * projSpeed,
      scale: (stats.element === "wind" ? 2.2 : 1.95) * (isCharged ? 1.75 : 1.0),
      element: stats.element,
      power: Math.round(stats.magicPower * (isCharged ? 2.2 : 1.0)),
      radius: isCharged ? 1.75 : 1.15,
      maxAge: isCharged ? 1.75 : 1.4,
      additive: stats.element === "fire" || stats.element === "water",
    });

    this.callbacks.onSkillCast?.("magic", stats.element, heroPos.x, heroPos.z, facingAngle);
    return true;
  }

  /**
   * Action [D]: Survival Project Elemental Ultimate Burst!
   */
  triggerUltimateAction(heroPos, facingAngle) {
    if (this.ultCooldown > 0 || this.mp < 50) return false;
    this.ultCooldown = 2.6;
    this.mp = Math.max(0, this.mp - 50);

    const stats = this.getPlayerStats();
    const edef = ELEMENT_DEFS[stats.element];
    const dirX = Math.sin(facingAngle);
    const dirZ = Math.cos(facingAngle);
    const targetX = heroPos.x + dirX * 3.4;
    const targetZ = heroPos.z + dirZ * 3.4;

    this.screenShake = Math.max(this.screenShake, 0.28);
    this.pixelVfx?.spawnBurst(edef.ultKey, {
      x: targetX,
      y: stats.element === "frost_nova" || stats.element === "earth" ? 1.1 : 2.1,
      z: targetZ,
      scale: 4.2,
      fps: 15,
      additive: stats.element === "fire" || stats.element === "wind",
    });
    this.pixelVfx?.spawnBurst("magic_circle", {
      x: targetX,
      y: 0.08,
      z: targetZ,
      scale: 4.5,
      fps: 14,
      groundFlat: true,
      tint: edef.colorInt,
      additive: true,
    });
    this.vfx?.spawnDamageNumber(heroPos.x, 2.5, heroPos.z, `${edef.en} BURST!!`, "crit");

    // Blast soccer ball if in AoE!
    const bDist = Math.hypot(this.ball.x - targetX, this.ball.z - targetZ);
    if (bDist < 4.4) {
      const aimX = Math.abs(this.ball.x - targetX) < 0.2 ? dirX : (this.ball.x - targetX) / Math.max(0.1, bDist);
      const aimZ = Math.abs(this.ball.z - targetZ) < 0.2 ? dirZ : (this.ball.z - targetZ) / Math.max(0.1, bDist);
      const superSpd = 20.5 * stats.kickPowerMul;
      this.ball.vx = (dirX * 0.7 + aimX * 0.3) * superSpd;
      this.ball.vz = (dirZ * 0.7 + aimZ * 0.3) * superSpd;
      this.ball.vy = 6.2;
      this.ball.lastTouchElement = stats.element;
      this.vfx?.spawnDamageNumber(this.ball.x, 1.6, this.ball.z, "SUPER ELEMENT SHOT!", "crit");
      this.callbacks.onBallKick?.(this.ball);
    }

    // Blast slimes in AoE!
    for (const sl of this.slimes) {
      if (!sl.alive) continue;
      const d = Math.hypot(sl.x - targetX, sl.z - targetZ);
      if (d < 5.0) {
        const nx = (sl.x - targetX) / Math.max(0.1, d);
        const nz = (sl.z - targetZ) / Math.max(0.1, d);
        this._damageSlime(sl, Math.round(stats.magicPower * 2.5), stats.element, Math.min(0.9, stats.critChance + 0.3), {
          kx: nx * 16.0,
          kz: nz * 16.0,
          ky: 10.2,
          tag: `${edef.en} LAUNCH!!`,
        });
      }
    }

    // Blast crystals in AoE!
    for (const c of this.crystals) {
      if (!c.alive) continue;
      if (Math.hypot(c.x - targetX, c.z - targetZ) < 4.8) {
        this._damageCrystal(c, Math.round(stats.magicPower * 2.4), stats.element, Math.min(0.85, stats.critChance + 0.25));
      }
    }

    this.callbacks.onSkillCast?.("ult", stats.element, targetX, targetZ, facingAngle);
    return true;
  }

  /**
   * Play remote player's Survival Project skill VFX over WSS relay.
   */
  playRemoteSkill(kind, element, x, z, facing = 0) {
    const edef = ELEMENT_DEFS[element] || ELEMENT_DEFS.fire;
    if (kind === "melee") {
      this.pixelVfx?.spawnBurst("sword_slash", {
        x: x + Math.sin(facing) * 1.2,
        y: 1.0,
        z: z + Math.cos(facing) * 1.2,
        scale: 2.2,
        fps: 20,
        tint: edef.colorInt,
      });
    } else if (kind === "magic") {
      this.pixelVfx?.spawnProjectile(edef.projKey, {
        x: x + Math.sin(facing) * 0.8,
        y: 1.05,
        z: z + Math.cos(facing) * 0.8,
        vx: Math.sin(facing) * 13.5,
        vz: Math.cos(facing) * 13.5,
        scale: 1.85,
        element,
        ownerId: "remote",
        maxAge: 1.35,
      });
    } else if (kind === "ult") {
      this.pixelVfx?.spawnBurst(edef.ultKey, { x, y: 1.9, z, scale: 3.8, fps: 15, additive: true });
    }
  }

  applyRemoteBallState(msg) {
    if (!msg || typeof msg.x !== "number" || typeof msg.z !== "number") return;
    this.ball.x = msg.x;
    this.ball.y = typeof msg.y === "number" ? msg.y : 0.34;
    this.ball.z = msg.z;
    this.ball.vx = typeof msg.vx === "number" ? msg.vx : 0;
    this.ball.vy = typeof msg.vy === "number" ? msg.vy : 0;
    this.ball.vz = typeof msg.vz === "number" ? msg.vz : 0;
    if (typeof msg.blue === "number") this.score.blue = msg.blue;
    if (typeof msg.red === "number") this.score.red = msg.red;
    this.callbacks.onScoreChanged?.(this.score);
  }

  _addCombo(amount = 1) {
    this.combo += amount;
    this.comboTimer = 4.2;
  }

  _damageSlime(slime, baseDmg, attackElement, critChance = 0.15, knock = {}) {
    const edef = ELEMENT_DEFS[attackElement] || ELEMENT_DEFS.fire;
    const isAdvantage = edef.beats === slime.element;
    const isCrit = isAdvantage || Math.random() < critChance;
    const finalDmg = Math.round(baseDmg * (isAdvantage ? 1.85 : isCrit ? 1.45 : 1.0));

    slime.hp = Math.max(0, slime.hp - finalDmg);
    slime.hitFlash = 0.22;
    slime.stunTimer = 0.45;
    slime.telegraphTimer = 0;
    slime.vx = (knock.kx ?? 0) + (Math.random() - 0.5) * 1.4;
    slime.vz = (knock.kz ?? 0) + (Math.random() - 0.5) * 1.4;
    slime.vy = Math.max(slime.vy * 0.4, knock.ky ?? 4.0);
    this._addCombo(1);
    this.mp = Math.min(this.maxMp, this.mp + 9);

    this.pixelVfx?.spawnBurst(isCrit ? "crit_hit" : "hit_spark", {
      x: slime.x,
      y: slime.y + 0.35,
      z: slime.z,
      scale: isCrit ? 2.5 : 1.9,
      fps: 20,
    });

    const prefix = knock.tag ? `${knock.tag} ` : "";
    const label = isAdvantage ? `${prefix}${finalDmg} 상성!` : isCrit ? `${prefix}${finalDmg} CRIT!` : `${prefix}${finalDmg}`;
    this.vfx?.spawnDamageNumber(slime.x, slime.y + 1.15, slime.z, label, isCrit || knock.tag ? "crit" : "normal");

    if (slime.hp <= 0) {
      slime.alive = false;
      slime.respawnTimer = 9.0;
      if (slime.loop?.mesh) slime.loop.mesh.visible = false;
      if (slime.shadow) slime.shadow.visible = false;
      this.profile.crystalsBroken += 1;
      this.hitstopTimer = Math.max(this.hitstopTimer, 0.065);
      this.screenShake = Math.max(this.screenShake, 0.24);

      const sDef = ELEMENT_DEFS[slime.element];
      this.pixelVfx?.spawnBurst(sDef.ultKey, {
        x: slime.x,
        y: 1.5,
        z: slime.z,
        scale: 3.0,
        fps: 16,
        additive: true,
      });

      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.random() * 0.4;
        const spd = 2.6 + Math.random() * 2.0;
        this.spawnCoin(slime.x, slime.z, Math.cos(ang) * spd, Math.sin(ang) * spd, 4.8 + Math.random() * 1.4, 16);
      }
      this._saveProfile();
    }
  }

  _damageCrystal(crystal, baseDmg, attackElement, critChance = 0.15) {
    const edef = ELEMENT_DEFS[attackElement] || ELEMENT_DEFS.fire;
    const isAdvantage = edef.beats === crystal.element;
    const isCrit = isAdvantage || Math.random() < critChance;
    const finalDmg = Math.round(baseDmg * (isAdvantage ? 1.85 : isCrit ? 1.45 : 1.0));

    crystal.hp = Math.max(0, crystal.hp - finalDmg);
    crystal.hitFlash = 0.18;
    this._addCombo(1);
    this.mp = Math.min(this.maxMp, this.mp + 8);

    this.pixelVfx?.spawnBurst(isCrit ? "crit_hit" : "hit_spark", {
      x: crystal.x,
      y: 1.25,
      z: crystal.z,
      scale: isCrit ? 2.4 : 1.8,
      fps: 18,
    });

    const label = isAdvantage ? `${finalDmg} 상성 CRIT!` : isCrit ? `${finalDmg} CRIT!` : `${finalDmg}`;
    this.vfx?.spawnDamageNumber(crystal.x, 1.9, crystal.z, label, isCrit ? "crit" : "normal");

    if (crystal.hp <= 0) {
      crystal.alive = false;
      crystal.respawnTimer = 11.5;
      crystal.mesh.visible = false;
      this.profile.crystalsBroken += 1;
      this.screenShake = Math.max(this.screenShake, 0.22);

      const cDef = ELEMENT_DEFS[crystal.element];
      this.pixelVfx?.spawnBurst(cDef.ultKey, {
        x: crystal.x,
        y: 1.6,
        z: crystal.z,
        scale: 3.1,
        fps: 16,
        additive: true,
      });

      // Pop 4 spinning CODE coins!
      const coinCount = 4;
      for (let i = 0; i < coinCount; i++) {
        const ang = (i / coinCount) * Math.PI * 2 + Math.random() * 0.5;
        const spd = 2.4 + Math.random() * 1.8;
        this.spawnCoin(crystal.x, crystal.z, Math.cos(ang) * spd, Math.sin(ang) * spd, 4.4 + Math.random() * 1.4, 14);
      }
      this._saveProfile();
    }
  }

  _resetBall(toCenter = true) {
    this.ball.x = this.pitch.cx;
    this.ball.y = 1.6;
    this.ball.z = this.pitch.cz;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;
    this.ball.curveForceZ = 0;
    this.ball.lastTouchElement = null;
    if (toCenter) {
      this.pixelVfx?.spawnBurst("poof", { x: this.pitch.cx, y: 0.6, z: this.pitch.cz, scale: 1.8 });
    }
  }

  _handleGoal(scoringTeam) {
    if (this.goalCooldown > 0) return;
    this.goalCooldown = 2.2;
    if (scoringTeam === "blue") this.score.blue += 1;
    else this.score.red += 1;

    const gx = this.pitch.cx + (scoringTeam === "blue" ? this.pitch.halfW : -this.pitch.halfW);
    const gz = this.pitch.cz;

    const reward = Math.round(50 * this.getPlayerStats().coinBonusMul);
    this.profile.code += reward;
    this.profile.exp += 120;
    this.profile.goalsScored += 1;
    this._saveProfile();

    this.screenShake = 0.34;
    this.pixelVfx?.spawnBurst("confetti", { x: gx, y: 1.9, z: gz, scale: 4.0, fps: 14 });
    this.pixelVfx?.spawnBurst("firework_burst", { x: gx, y: 2.6, z: gz, scale: 4.2, fps: 14, additive: true });
    this.pixelVfx?.spawnBurst("level_up", { x: this.pitch.cx, y: 1.8, z: this.pitch.cz, scale: 3.4, fps: 14 });
    this.vfx?.spawnDamageNumber(gx, 2.3, gz, `GOAL!! +${reward} CODE`, "crit");

    this.callbacks.onGoal?.(scoringTeam, this.score, reward);
    this.callbacks.onScoreChanged?.(this.score);
    this.callbacks.onProfileChanged?.(this.profile, this.getPlayerStats());

    this._resetBall(true);
  }

  _syncHeroAura(heroPos, stats) {
    if (!heroPos || !this.pixelVfx?.manifest?.pb_shield) return;
    const auraEl = stats.auraCard.element;
    if (!this.heroAuraLoop || this.heroAuraElement !== auraEl) {
      if (this.heroAuraLoop) this.heroAuraLoop.dispose();
      const edef = ELEMENT_DEFS[auraEl] || ELEMENT_DEFS.water;
      this.heroAuraLoop = this.pixelVfx.createLoopBillboard("pb_shield", {
        x: heroPos.x,
        y: 0.09,
        z: heroPos.z,
        scale: 1.85,
        fps: 11,
        groundFlat: true,
        tint: edef.colorInt,
        opacity: 0.58,
        additive: true,
        spinSpeed: 0.85,
        renderOrder: 6,
      });
      this.heroAuraElement = auraEl;
    }
    if (this.heroAuraLoop && this.heroAuraLoop.alive) {
      this.heroAuraLoop.mesh.position.set(heroPos.x, 0.085, heroPos.z);
    }
  }

  update(dt, elapsed, heroState, citizens = []) {
    const stats = this.getPlayerStats();

    // Cooldowns & combo decay
    if (this.meleeCooldown > 0) this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    if (this.meleeComboWindow > 0) {
      this.meleeComboWindow = Math.max(0, this.meleeComboWindow - dt);
      if (this.meleeComboWindow <= 0) this.meleeComboStep = 0;
    }
    if (this.magicCooldown > 0) this.magicCooldown = Math.max(0, this.magicCooldown - dt);
    if (this.ultCooldown > 0) this.ultCooldown = Math.max(0, this.ultCooldown - dt);
    if (this.goalCooldown > 0) this.goalCooldown = Math.max(0, this.goalCooldown - dt);
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 1.5);
    if (this.isGuarding) {
      this.guardElapsed += dt;
      if (this.guardShieldLoop?.alive && heroState?.pos) {
        this.guardShieldLoop.mesh.position.set(heroState.pos.x, (heroState.pos.y || 0) + 1.05, heroState.pos.z);
      }
    }
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Booster & MP regeneration (generous Survival Project rhythm!)
    if (heroState?.isRunning && heroState.isMoving) {
      this.booster = Math.max(0, this.booster - 18 * dt);
    } else if (!heroState?.isDashing) {
      this.booster = Math.min(this.maxBooster, this.booster + 34 * stats.boosterRegenMul * dt);
    }
    this.mp = Math.min(this.maxMp, this.mp + 9.5 * stats.mpRegenMul * dt);

    this._ensureSlimeSprites();

    // Sync hero pixel aura ring
    if (heroState?.pos) {
      this._syncHeroAura(heroState.pos, stats);
    }

    // 1. Update Active Elemental Projectiles collisions (ball & crystals)
    if (this.pixelVfx?.activeProjectiles?.length) {
      for (const proj of this.pixelVfx.activeProjectiles) {
        if (!proj.alive) continue;
        const px = proj.mesh.position.x;
        const pz = proj.mesh.position.z;

        // Projectile hits Soccer Ball -> Elemental Special Shot!
        if (Math.hypot(this.ball.x - px, this.ball.z - pz) < this.ball.radius + proj.radius * 0.9) {
          proj.alive = false;
          const pSpeed = Math.hypot(proj.vx, proj.vz) || 1;
          const nx = proj.vx / pSpeed;
          const nz = proj.vz / pSpeed;
          const shotMul = stats.kickPowerMul;
          if (proj.element === "fire") {
            this.ball.vx = nx * 19.5 * shotMul;
            this.ball.vz = nz * 19.5 * shotMul;
            this.ball.vy = 2.8;
            this.ball.curveForceZ = 0;
            this.vfx?.spawnDamageNumber(this.ball.x, 1.5, this.ball.z, "FLAME LASER SHOT!", "crit");
          } else if (proj.element === "water") {
            this.ball.vx = nx * 16.5 * shotMul;
            this.ball.vz = nz * 16.5 * shotMul;
            this.ball.vy = 3.2;
            this.ball.curveForceZ = (this.pitch.cz - this.ball.z) * 4.5;
            this.vfx?.spawnDamageNumber(this.ball.x, 1.5, this.ball.z, "FROST CURVE SHOT!", "magic");
          } else if (proj.element === "wind") {
            this.ball.vx = nx * 21.0 * shotMul;
            this.ball.vz = nz * 21.0 * shotMul;
            this.ball.vy = 6.2;
            this.ball.curveForceZ = 0;
            this.vfx?.spawnDamageNumber(this.ball.x, 1.5, this.ball.z, "TORNADO LOB!!", "heal");
          } else {
            this.ball.vx = nx * 17.0 * shotMul;
            this.ball.vz = nz * 17.0 * shotMul;
            this.ball.vy = 7.4;
            this.ball.curveForceZ = 0;
            this.vfx?.spawnDamageNumber(this.ball.x, 1.5, this.ball.z, "MEGA BOUNCE SHOT!", "crit");
          }
          this.ball.lastTouchElement = proj.element;
          this.pixelVfx.spawnBurst("crit_hit", { x: this.ball.x, y: 0.9, z: this.ball.z, scale: 2.5 });
          this._addCombo(1);
          this.callbacks.onBallKick?.(this.ball);
          continue;
        }

        // Projectile hits Juggleable Slimes!
        let hitSlime = false;
        for (const sl of this.slimes) {
          if (!sl.alive) continue;
          if (Math.hypot(sl.x - px, sl.z - pz) < 1.15 + proj.radius * 0.45) {
            proj.alive = false;
            hitSlime = true;
            if (proj.ownerId === "local") {
              const spd = Math.hypot(proj.vx, proj.vz) || 1;
              this._damageSlime(sl, Math.round(proj.power * 1.4), proj.element, stats.critChance, {
                kx: (proj.vx / spd) * 11.5,
                kz: (proj.vz / spd) * 11.5,
                ky: 6.2,
                tag: proj.power > stats.magicPower * 1.5 ? "OVERCHARGE!!" : "",
              });
              this.hitstopTimer = Math.max(this.hitstopTimer, 0.036);
            }
            break;
          }
        }
        if (hitSlime) continue;

        // Projectile hits Elemental Crystals
        for (const c of this.crystals) {
          if (!c.alive) continue;
          if (Math.hypot(c.x - px, c.z - pz) < 1.25) {
            proj.alive = false;
            if (proj.ownerId === "local") {
              this._damageCrystal(c, Math.round(proj.power * 1.35), proj.element, stats.critChance);
            }
            break;
          }
        }
      }
    }

    // 2. Update Soccer Ball Physics & Hero/Bot Dribble
    this._updateSoccerBall(dt, heroState, citizens);

    // 2.5 Update Juggleable Elemental Sparring Slimes & Dodge/Parry Orbs
    this._updateSlimesAndOrbs(dt, elapsed, heroState, stats);

    // 3. Update Elemental Crystals bobbing & respawn
    for (const c of this.crystals) {
      if (!c.alive) {
        c.respawnTimer -= dt;
        if (c.respawnTimer <= 0) {
          c.alive = true;
          c.hp = c.maxHp;
          c.mesh.visible = true;
          this.pixelVfx?.spawnBurst("collect_burst", { x: c.x, y: 1.2, z: c.z, scale: 2.2, additive: true });
        }
        continue;
      }
      c.mesh.rotation.y += dt * 1.15;
      c.mesh.position.y = 1.15 + Math.sin(elapsed * 2.6 + c.phase) * 0.14;
      if (c.hitFlash > 0) {
        c.hitFlash = Math.max(0, c.hitFlash - dt);
        c.mat.emissiveIntensity = 1.65;
        const jitter = Math.sin(elapsed * 60) * 0.08;
        c.mesh.position.x = c.x + jitter;
      } else {
        c.mat.emissiveIntensity = 0.48 + Math.sin(elapsed * 3.0 + c.phase) * 0.15;
        c.mesh.position.x = c.x;
      }
    }

    // 4. Update Collectible CODE Coins (gravity + magnet pickup!)
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.age += dt;
      coin.vy -= 14.5 * dt;
      coin.x += coin.vx * dt;
      coin.z += coin.vz * dt;
      coin.y += coin.vy * dt;
      if (coin.y < 0.52) {
        coin.y = 0.52;
        coin.vy = Math.abs(coin.vy) > 1.2 ? -coin.vy * 0.45 : 0;
        coin.vx *= 0.84;
        coin.vz *= 0.84;
      }

      if (heroState?.pos) {
        const dx = heroState.pos.x - coin.x;
        const dz = heroState.pos.z - coin.z;
        const dist = Math.hypot(dx, dz);
        if (dist < stats.magnetRadius) {
          const pull = Math.min(18, (stats.magnetRadius - dist) * 6.5 + 4.5);
          coin.x += (dx / Math.max(0.05, dist)) * pull * dt;
          coin.z += (dz / Math.max(0.05, dist)) * pull * dt;
        }
        if (dist < 0.95) {
          const comboMul = 1 + Math.min(1.0, this.combo * 0.08);
          const gained = Math.round(coin.value * stats.coinBonusMul * comboMul);
          this.profile.code += gained;
          this.profile.exp += 10;
          this.mp = Math.min(this.maxMp, this.mp + 5);
          this._addCombo(1);
          this._saveProfile();

          this.pixelVfx?.spawnBurst("collect_burst", { x: coin.x, y: 0.9, z: coin.z, scale: 1.6, additive: true });
          this.vfx?.spawnDamageNumber(coin.x, 1.5, coin.z, `+${gained} CODE`, "heal");
          coin.loop.dispose();
          this.coins.splice(i, 1);
          this.callbacks.onProfileChanged?.(this.profile, stats);
          continue;
        }
      }

      coin.loop.mesh.position.set(coin.x, coin.y + Math.sin(elapsed * 4.5 + i) * 0.08, coin.z);
    }

    // Periodically spawn a fresh ambient coin if plaza is low
    if (this.coins.length < 4 && Math.random() < dt * 0.22) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 5.5 + Math.random() * 5.2;
      this.spawnCoin(Math.cos(ang) * rad, Math.sin(ang) * rad, 0, 0, 2.5, 10);
    }
  }

  _updateSoccerBall(dt, heroState, citizens) {
    const b = this.ball;
    const { cx, cz, halfW, halfD, goalHalfZ } = this.pitch;

    // Hero collision -> smooth dribble or dash pass
    if (heroState?.pos) {
      const dx = b.x - heroState.pos.x;
      const dz = b.z - heroState.pos.z;
      const dist = Math.hypot(dx, dz);
      const touchR = b.radius + 0.62;
      if (dist < touchR && dist > 0.001 && (heroState.pos.y || 0) < 1.2) {
        const nx = dx / dist;
        const nz = dz / dist;
        b.x = heroState.pos.x + nx * touchR;
        b.z = heroState.pos.z + nz * touchR;
        const push = heroState.isDashing ? 11.5 : heroState.isRunning ? 7.6 : 5.4;
        b.vx = nx * push + (heroState.vx || 0) * 0.45;
        b.vz = nz * push + (heroState.vz || 0) * 0.45;
        if (heroState.isDashing) {
          b.vy = Math.max(b.vy, 2.8);
          this.pixelVfx?.spawnBurst("poof", { x: b.x, y: 0.4, z: b.z, scale: 1.2 });
        }
        this.callbacks.onBallKick?.(b);
      }
    }

    // Gentle pitch-bot interaction: citizens inside pitch bounce the ball toward center/opponent goal
    for (const cit of citizens) {
      const cp = cit?.position || cit?.actor?.mesh?.position;
      if (!cp) continue;
      const dx = b.x - cp.x;
      const dz = b.z - cp.z;
      const dist = Math.hypot(dx, dz);
      if (dist < b.radius + 0.55 && dist > 0.001) {
        const nx = dx / dist;
        const nz = dz / dist;
        b.vx = nx * 7.2;
        b.vz = nz * 7.2;
        b.vy = 2.2;
      }
    }

    // Curve force & gravity
    if (Math.abs(b.curveForceZ) > 0.05) {
      b.vz += b.curveForceZ * dt;
      b.curveForceZ *= Math.pow(0.2, dt);
    }

    b.vy -= 18.5 * dt;
    b.x += b.vx * dt;
    b.z += b.vz * dt;
    b.y += b.vy * dt;

    // Ground bounce & rolling friction
    if (b.y < b.radius) {
      b.y = b.radius;
      if (Math.abs(b.vy) > 1.4) {
        b.vy = -b.vy * 0.58;
        if (b.lastTouchElement === "earth" && Math.abs(b.vy) > 2.2) {
          this.pixelVfx?.spawnBurst("poof", { x: b.x, y: 0.35, z: b.z, scale: 1.5 });
        }
      } else {
        b.vy = 0;
      }
      const friction = Math.pow(0.24, dt);
      b.vx *= friction;
      b.vz *= friction;
    } else {
      const airDrag = Math.pow(0.86, dt);
      b.vx *= airDrag;
      b.vz *= airDrag;
    }

    // Goal check (crosses West Blue Goal -> Red scores; crosses East Red Goal -> Blue scores)
    const inGoalMouthZ = Math.abs(b.z - cz) < goalHalfZ - 0.12 && b.y < 1.58;
    if (inGoalMouthZ && b.x < cx - halfW - 0.18) {
      this._handleGoal("red");
    } else if (inGoalMouthZ && b.x > cx + halfW + 0.18) {
      this._handleGoal("blue");
    } else {
      // Bounce off pitch boundaries cleanly so ball never flies away out of the pitch!
      const maxX = cx + halfW - b.radius;
      const minX = cx - halfW + b.radius;
      const maxZ = cz + halfD - b.radius;
      const minZ = cz - halfD + b.radius;
      if (!inGoalMouthZ) {
        if (b.x > maxX) { b.x = maxX; b.vx = -Math.abs(b.vx) * 0.72; }
        if (b.x < minX) { b.x = minX; b.vx = Math.abs(b.vx) * 0.72; }
      }
      if (b.z > maxZ) { b.z = maxZ; b.vz = -Math.abs(b.vz) * 0.75; }
      if (b.z < minZ) { b.z = minZ; b.vz = Math.abs(b.vz) * 0.75; }
    }

    // Elemental trail puffs when moving fast
    const speed = Math.hypot(b.vx, b.vz);
    if (speed > 8.5) {
      b.trailTimer += dt;
      if (b.trailTimer >= 0.085) {
        b.trailTimer = 0;
        const tint = b.lastTouchElement ? ELEMENT_DEFS[b.lastTouchElement].colorInt : 0xffffff;
        this.pixelVfx?.spawnBurst("hit_spark", { x: b.x, y: b.y, z: b.z, scale: 0.95, fps: 24, tint, additive: true });
      }
    } else {
      b.lastTouchElement = null;
    }

    // Update 3D ball transform + rolling spin + shadow
    b.mesh.position.set(b.x, b.y, b.z);
    b.mesh.rotation.z -= b.vx * dt * 2.1;
    b.mesh.rotation.x += b.vz * dt * 2.1;
    b.shadow.position.set(b.x, 0.045, b.z);
    const heightScale = Math.max(0.45, 1 - (b.y - b.radius) * 0.16);
    b.shadow.scale.set(heightScale, heightScale, 1);

    // Periodic WSS ball sync while ball is moving
    if (speed > 0.6) {
      this._ballSyncTimer += dt;
      if (this._ballSyncTimer >= 0.14) {
        this._ballSyncTimer = 0;
        this.callbacks.onBallSync?.(b, this.score);
      }
    }
  }

  _updateSlimesAndOrbs(dt, elapsed, heroState, stats) {
    // 1. Update Slimes (knockback, floor skidding, air-juggle gravity, bounce, and sparring orb telegraph!)
    for (const sl of this.slimes) {
      if (!sl.alive) {
        sl.respawnTimer -= dt;
        if (sl.respawnTimer <= 0) {
          sl.alive = true;
          sl.hp = sl.maxHp;
          sl.x = sl.homeX;
          sl.z = sl.homeZ;
          sl.y = 0.55;
          sl.vx = 0; sl.vy = 0; sl.vz = 0;
          if (sl.loop?.mesh) sl.loop.mesh.visible = true;
          if (sl.shadow) sl.shadow.visible = true;
          this.pixelVfx?.spawnBurst("collect_burst", { x: sl.x, y: 1.0, z: sl.z, scale: 2.0, additive: true });
        }
        continue;
      }

      if (sl.hitFlash > 0) sl.hitFlash = Math.max(0, sl.hitFlash - dt);
      if (sl.stunTimer > 0) sl.stunTimer = Math.max(0, sl.stunTimer - dt);

      // Gravity & knockback sliding physics
      sl.vy -= 21.0 * dt;
      sl.x += sl.vx * dt;
      sl.z += sl.vz * dt;
      sl.y += sl.vy * dt;

      if (sl.y < 0.55) {
        sl.y = 0.55;
        if (Math.abs(sl.vy) > 2.2) {
          sl.vy = -sl.vy * 0.48;
          this.pixelVfx?.spawnBurst("poof", { x: sl.x, y: 0.3, z: sl.z, scale: 1.2, fps: 22 });
        } else {
          sl.vy = 0;
        }
        const skidFriction = Math.pow(0.08, dt);
        sl.vx *= skidFriction;
        sl.vz *= skidFriction;
      } else {
        const airDrag = Math.pow(0.75, dt);
        sl.vx *= airDrag;
        sl.vz *= airDrag;
      }

      // Soft plaza wall bounce so knocked-back slimes ricochet crisply!
      const bound = 8.4;
      if (sl.x > bound) { sl.x = bound; sl.vx = -Math.abs(sl.vx) * 0.65; }
      if (sl.x < -bound) { sl.x = -bound; sl.vx = Math.abs(sl.vx) * 0.65; }
      if (sl.z > bound) { sl.z = bound; sl.vz = -Math.abs(sl.vz) * 0.65; }
      if (sl.z < -bound) { sl.z = -bound; sl.vz = Math.abs(sl.vz) * 0.65; }

      // Fountain push-out
      const fr = Math.hypot(sl.x, sl.z);
      if (fr < 2.6 && fr > 0.01) {
        sl.x = (sl.x / fr) * 2.6;
        sl.z = (sl.z / fr) * 2.6;
      }

      // Gentle return hop + sparring orb telegraph when hero is in plaza
      if (sl.stunTimer <= 0 && sl.y <= 0.58) {
        const dxH = sl.homeX - sl.x;
        const dzH = sl.homeZ - sl.z;
        const distHome = Math.hypot(dxH, dzH);
        if (distHome > 2.5) {
          sl.x += (dxH / distHome) * 1.4 * dt;
          sl.z += (dzH / distHome) * 1.4 * dt;
        }
        if (heroState?.pos) {
          const distHero = Math.hypot(heroState.pos.x - sl.x, heroState.pos.z - sl.z);
          if (distHero < 8.5 && distHero > 2.4 && this.enemyOrbs.length < 3) {
            if (sl.telegraphTimer > 0) {
              sl.telegraphTimer -= dt;
              if (sl.telegraphTimer <= 0) {
                // Fire a slow, dodgeable/parryable elemental sparring orb!
                const nx = (heroState.pos.x - sl.x) / Math.max(0.1, distHero);
                const nz = (heroState.pos.z - sl.z) / Math.max(0.1, distHero);
                const edef = ELEMENT_DEFS[sl.element] || ELEMENT_DEFS.fire;
                const orbLoop = this.pixelVfx?.createLoopBillboard(edef.projKey, {
                  x: sl.x + nx * 0.8,
                  y: 0.95,
                  z: sl.z + nz * 0.8,
                  scale: 1.45,
                  fps: 15,
                  additive: true,
                  renderOrder: 13,
                });
                if (orbLoop) {
                  this.enemyOrbs.push({
                    x: sl.x + nx * 0.8,
                    z: sl.z + nz * 0.8,
                    vx: nx * 6.8,
                    vz: nz * 6.8,
                    element: sl.element,
                    sourceSlime: sl,
                    reflected: false,
                    age: 0,
                    dodged: false,
                    loop: orbLoop,
                  });
                }
                sl.attackTimer = 5.5 + Math.random() * 3.5;
              }
            } else {
              sl.attackTimer -= dt;
              if (sl.attackTimer <= 0) {
                sl.telegraphTimer = 0.72;
                this.pixelVfx?.spawnBurst("hit_spark", { x: sl.x, y: 1.15, z: sl.z, scale: 1.6, tint: 0xffffff });
              }
            }
          }
        }
      }

      if (sl.loop?.alive) {
        const bob = sl.y <= 0.58 ? Math.abs(Math.sin(elapsed * 3.4 + sl.hopPhase)) * 0.18 : 0;
        const jitterX = sl.hitFlash > 0 ? Math.sin(elapsed * 75) * 0.09 : 0;
        sl.loop.mesh.position.set(sl.x + jitterX, sl.y + bob, sl.z);
        const edef = ELEMENT_DEFS[sl.element] || ELEMENT_DEFS.fire;
        sl.loop.mat.color.setHex(sl.hitFlash > 0 || sl.telegraphTimer > 0 ? 0xffffff : edef.colorInt);
      }
      if (sl.shadow) {
        sl.shadow.position.set(sl.x, 0.04, sl.z);
        const shScale = Math.max(0.45, 1 - (sl.y - 0.55) * 0.16);
        sl.shadow.scale.set(shScale, shScale, 1);
      }
    }

    // 2. Update Sparring Orbs -> JUST PARRY (E) or JUST DODGE (Dash-Slide)!
    for (let i = this.enemyOrbs.length - 1; i >= 0; i--) {
      const orb = this.enemyOrbs[i];
      orb.age += dt;
      orb.x += orb.vx * dt;
      orb.z += orb.vz * dt;
      if (orb.loop?.alive) orb.loop.mesh.position.set(orb.x, 0.95, orb.z);

      let removeOrb = orb.age > 3.2;

      if (!removeOrb && orb.reflected) {
        // Reflected orb slams into slimes for massive counter damage!
        for (const sl of this.slimes) {
          if (!sl.alive) continue;
          if (Math.hypot(sl.x - orb.x, sl.z - orb.z) < 1.35) {
            this._damageSlime(sl, Math.round(stats.magicPower * 2.6), stats.element, 1.0, {
              kx: orb.vx * 0.85,
              kz: orb.vz * 0.85,
              ky: 8.5,
              tag: "PARRY COUNTER!!",
            });
            this.hitstopTimer = 0.065;
            removeOrb = true;
            break;
          }
        }
      } else if (!removeOrb && heroState?.pos) {
        const dHero = Math.hypot(heroState.pos.x - orb.x, heroState.pos.z - orb.z);
        if (dHero < 1.25 && (heroState.pos.y || 0) < 1.1) {
          if (this.isGuarding) {
            if (this.guardElapsed <= 0.35) {
              // JUST PARRY!! Reflect back at 2.3x speed!
              orb.reflected = true;
              orb.age = 0;
              orb.vx = -orb.vx * 2.3;
              orb.vz = -orb.vz * 2.3;
              this.hitstopTimer = 0.072;
              this.screenShake = 0.24;
              this.mp = Math.min(this.maxMp, this.mp + 30);
              const bonus = Math.round(25 * stats.coinBonusMul);
              this.profile.code += bonus;
              this._saveProfile();
              this._addCombo(2);
              this.pixelVfx?.spawnBurst("parry", { x: heroState.pos.x, y: 1.1, z: heroState.pos.z, scale: 3.0, fps: 18 });
              this.vfx?.spawnDamageNumber(heroState.pos.x, 2.2, heroState.pos.z, `JUST PARRY!! +${bonus} CODE`, "crit");
              this.callbacks.onProfileChanged?.(this.profile, stats);
            } else {
              // Normal Guard block
              this.mp = Math.min(this.maxMp, this.mp + 10);
              this.pixelVfx?.spawnBurst("hit_spark", { x: orb.x, y: 1.0, z: orb.z, scale: 2.0 });
              this.vfx?.spawnDamageNumber(heroState.pos.x, 2.0, heroState.pos.z, "GUARD! +10 MP", "magic");
              removeOrb = true;
            }
          } else if (heroState.isSliding) {
            // JUST DODGE via Survival Project Dash-Slide!
            if (!orb.dodged) {
              orb.dodged = true;
              this.mp = Math.min(this.maxMp, this.mp + 15);
              const bonus = Math.round(15 * stats.coinBonusMul);
              this.profile.code += bonus;
              this._saveProfile();
              this._addCombo(1);
              this.pixelVfx?.spawnBurst("collect_burst", { x: heroState.pos.x, y: 1.0, z: heroState.pos.z, scale: 2.0, additive: true });
              this.vfx?.spawnDamageNumber(heroState.pos.x, 2.1, heroState.pos.z, `SLIDE DODGE!! +${bonus}`, "heal");
              this.callbacks.onProfileChanged?.(this.profile, stats);
            }
          } else {
            // Soft sparring knockback flash (no death / frustration — pure arcade fun!)
            this.pixelVfx?.spawnBurst("hit_spark", { x: orb.x, y: 1.0, z: orb.z, scale: 1.8 });
            this.vfx?.spawnDamageNumber(heroState.pos.x, 2.0, heroState.pos.z, "HIT! (F=가드·패리 / Shift=슬라이드)", "normal");
            removeOrb = true;
          }
        }
      }

      if (removeOrb) {
        orb.loop.dispose();
        this.enemyOrbs.splice(i, 1);
      }
    }
  }

  dispose() {
    if (this.heroAuraLoop) this.heroAuraLoop.dispose();
    if (this.guardShieldLoop) this.guardShieldLoop.dispose();
    if (this.chargeLoop) this.chargeLoop.dispose();
    for (const sl of this.slimes) sl.loop?.dispose();
    this.slimes.length = 0;
    for (const orb of this.enemyOrbs) orb.loop?.dispose();
    this.enemyOrbs.length = 0;
    for (const c of this.coins) c.loop.dispose();
    this.coins.length = 0;
    this.scene.remove(this.group);
    for (const d of this._disposables) {
      if (typeof d?.dispose === "function") d.dispose();
    }
    this._disposables.length = 0;
  }
}
