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

    // Arcade Combat / Action gauges
    this.booster = 100;
    this.maxBooster = 100;
    this.mp = 60;
    this.maxMp = 100;
    this.combo = 0;
    this.comboTimer = 0;
    this.meleeCooldown = 0;
    this.magicCooldown = 0;
    this.ultCooldown = 0;
    this.screenShake = 0;

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
    this.coins = [];
    this.heroAuraLoop = null;
    this.heroAuraElement = null;
    this._ballSyncTimer = 0;

    // Shared disposable resources
    this._disposables = [];

    this._buildSoccerPitch();
    this._buildElementalCrystals();
    this._spawnInitialPlazaCoins();
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
   * Action [A]: Survival Project Melee Slash / Power Soccer Kick!
   */
  triggerMeleeAction(heroPos, facingAngle, isDashing = false) {
    if (this.meleeCooldown > 0) return false;
    this.meleeCooldown = 0.28;
    const stats = this.getPlayerStats();
    const dirX = Math.sin(facingAngle);
    const dirZ = Math.cos(facingAngle);
    const hitX = heroPos.x + dirX * 1.35;
    const hitZ = heroPos.z + dirZ * 1.35;

    // 1. Spawn MIT pixelfx sword_slash
    const flipX = dirX < -0.2;
    this.pixelVfx?.spawnBurst("sword_slash", {
      x: hitX,
      y: 1.0 + (heroPos.y || 0),
      z: hitZ,
      scale: isDashing ? 2.85 : 2.35,
      fps: 22,
      tint: ELEMENT_DEFS[stats.element].colorInt,
      flipX,
    });

    let hitSomething = false;

    // 2. Check Soccer Ball Power Kick ("강진 슈팅!")
    const bdx = this.ball.x - hitX;
    const bdz = this.ball.z - hitZ;
    const bDist = Math.hypot(bdx, bdz);
    const heroBallDist = Math.hypot(this.ball.x - heroPos.x, this.ball.z - heroPos.z);
    if (bDist < 1.85 || heroBallDist < 1.75) {
      const kickPower = (isDashing ? 17.5 : 14.5) * stats.kickPowerMul;
      this.ball.vx = dirX * kickPower;
      this.ball.vz = dirZ * kickPower;
      this.ball.vy = isDashing ? 5.2 : 3.6;
      this.ball.lastTouchElement = stats.element;
      this.ball.curveForceZ = 0;
      this.screenShake = Math.max(this.screenShake, 0.16);
      this.mp = Math.min(this.maxMp, this.mp + 10);

      this.pixelVfx?.spawnBurst("crit_hit", { x: this.ball.x, y: 0.7, z: this.ball.z, scale: 2.4, fps: 20 });
      this.vfx?.spawnDamageNumber(this.ball.x, 1.35, this.ball.z, isDashing ? "DASH SPIKE!!" : "POWER SHOT!", isDashing ? "crit" : "magic");
      this._addCombo(1);
      this.callbacks.onBallKick?.(this.ball);
      hitSomething = true;
    }

    // 3. Check Elemental Spirit Crystals
    for (const c of this.crystals) {
      if (!c.alive) continue;
      if (Math.hypot(c.x - hitX, c.z - hitZ) < 1.95) {
        const dmg = Math.round((28 + stats.magicPower * 0.45) * (isDashing ? 1.35 : 1.0));
        this._damageCrystal(c, dmg, stats.element, stats.critChance);
        hitSomething = true;
      }
    }

    this.callbacks.onSkillCast?.("melee", stats.element, heroPos.x, heroPos.z, facingAngle);
    return hitSomething || true;
  }

  /**
   * Action [S]: Survival Project 4-Element Magic Projectile!
   */
  triggerMagicAction(heroPos, facingAngle) {
    if (this.magicCooldown > 0 || this.mp < 16) return false;
    this.magicCooldown = 0.42;
    this.mp = Math.max(0, this.mp - 16);

    const stats = this.getPlayerStats();
    const edef = ELEMENT_DEFS[stats.element];
    const dirX = Math.sin(facingAngle);
    const dirZ = Math.cos(facingAngle);
    const projSpeed = stats.element === "wind" ? 15.5 : stats.element === "water" ? 14.0 : stats.element === "fire" ? 13.5 : 11.5;

    this.pixelVfx?.spawnBurst("magic_circle", {
      x: heroPos.x,
      y: 0.08,
      z: heroPos.z,
      scale: 2.2,
      fps: 18,
      groundFlat: true,
      tint: edef.colorInt,
      additive: true,
    });

    this.pixelVfx?.spawnProjectile(edef.projKey, {
      x: heroPos.x + dirX * 0.85,
      y: 1.05 + (heroPos.y || 0),
      z: heroPos.z + dirZ * 0.85,
      vx: dirX * projSpeed,
      vz: dirZ * projSpeed,
      scale: stats.element === "tornado" ? 2.1 : 1.9,
      element: stats.element,
      power: stats.magicPower,
      radius: 1.15,
      maxAge: 1.45,
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
    if (this.magicCooldown > 0) this.magicCooldown = Math.max(0, this.magicCooldown - dt);
    if (this.ultCooldown > 0) this.ultCooldown = Math.max(0, this.ultCooldown - dt);
    if (this.goalCooldown > 0) this.goalCooldown = Math.max(0, this.goalCooldown - dt);
    if (this.screenShake > 0) this.screenShake = Math.max(0, this.screenShake - dt * 1.4);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    // Booster & MP regeneration
    if (heroState?.isRunning && heroState.isMoving) {
      this.booster = Math.max(0, this.booster - 26 * dt);
    } else if (!heroState?.isDashing) {
      this.booster = Math.min(this.maxBooster, this.booster + 22 * stats.boosterRegenMul * dt);
    }
    this.mp = Math.min(this.maxMp, this.mp + 7.5 * stats.mpRegenMul * dt);

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

  dispose() {
    if (this.heroAuraLoop) this.heroAuraLoop.dispose();
    for (const c of this.coins) c.loop.dispose();
    this.coins.length = 0;
    this.scene.remove(this.group);
    for (const d of this._disposables) {
      if (typeof d?.dispose === "function") d.dispose();
    }
    this._disposables.length = 0;
  }
}
