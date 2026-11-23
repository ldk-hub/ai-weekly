/**
 * Clean-Room 1999 Theme Park Simulation Core (Pure JS, Zero DOM Dependencies)
 * Manages 28x28 terrain & water, auto-tiling footpaths, rides, coasters, breakdowns,
 * autonomous Peep AI (needs, thoughts, vomiting, pincer recovery), Staff AI, finances, awards, and save/load.
 */

import {
  ISO_METRICS,
  DIR_DX,
  DIR_DY,
  RIDE_CATALOG,
  SCENERY_CATALOG,
  PATH_TYPES,
  STAFF_TYPES,
  MARKETING_CAMPAIGNS,
  COASTER_BLUEPRINTS,
  SCENARIO_PRESETS,
  PEEP_SHIRT_COLORS,
  PEEP_FIRST_NAMES,
  PEEP_LAST_NAMES,
} from "./RctConstants.js";
import { CoasterTrack } from "./RctCoasterEngine.js";

let _uidSeq = 1;
function nextUid(prefix = "id") {
  return `${prefix}-${_uidSeq++}`;
}

export class RctParkSimulation {
  constructor() {
    this.mapSize = ISO_METRICS.MAP_SIZE;
    this.grid = [];
    this.scenarioId = "ai_weekly_park";
    this.parkName = "AI위클리 메가 타이쿤 파크";
    this.cash = 4500;
    this.loan = 1000;
    this.maxLoan = 10000;
    this.parkEntryFee = 10;
    this.parkRating = 700;
    this.parkValue = 0;
    this.companyValue = 0;
    this.speedMultiplier = 1; // 0 = pause, 1, 2, 4
    this.date = { year: 1, month: 3, day: 1, dayProgress: 0 };
    this.weather = "sunny"; // "sunny" | "cloudy" | "rain"
    this.weatherTimer = 45;
    this.entrance = { x: 14, y: 26 };

    this.rides = [];
    this.peeps = [];
    this.staff = [];
    this.newsFeed = [];
    this.awards = [];
    this.activeCampaigns = [];
    this.floatingTexts = [];
    this.monthlyFinances = this._createEmptyFinances();
    this.financeHistory = [];

    this.aiArchive = {
      plugins: [],
      news: [],
      social: [],
      benchmarks: [],
    };

    this._guestSpawnAccum = 0;
    this._breakdownCheckAccum = 0;
    this._totalAdmissions = 0;
    this.onSfx = null; // Optional callback (eventName, payload)
  }

  _createEmptyFinances() {
    return {
      rideIncome: 0,
      shopIncome: 0,
      entryIncome: 0,
      staffWages: 0,
      rideUpkeep: 0,
      marketingCost: 0,
      loanInterest: 0,
      constructionCost: 0,
    };
  }

  getTile(x, y) {
    if (x < 0 || y < 0 || x >= this.mapSize || y >= this.mapSize) return null;
    return this.grid[y]?.[x] || null;
  }

  _isOwnedBuildable(x, y) {
    const t = this.getTile(x, y);
    return Boolean(t && t.owned && x >= 1 && x <= this.mapSize - 2 && y >= 1 && y <= this.mapSize - 2);
  }

  _initGrid(surface = "grass", baseHeight = 2) {
    this.grid = [];
    for (let y = 0; y < this.mapSize; y++) {
      const row = [];
      for (let x = 0; x < this.mapSize; x++) {
        const isBorder = x === 0 || y === 0 || x === this.mapSize - 1 || y === this.mapSize - 1;
        row.push({
          x,
          y,
          height: baseHeight,
          waterHeight: 0,
          surface,
          owned: !isBorder,
          path: null,
          pathAddition: null,
          scenery: null,
          rideId: null,
          litter: 0,
          vomit: 0,
        });
      }
      this.grid.push(row);
    }
  }

  loadScenario(scenarioId = "ai_weekly_park", archiveData = null) {
    const preset = SCENARIO_PRESETS[scenarioId] || SCENARIO_PRESETS.ai_weekly_park;
    this.scenarioId = preset.id;
    this.parkName = preset.name;
    this.cash = preset.startingCash;
    this.loan = preset.startingLoan;
    this.maxLoan = preset.maxLoan;
    this.parkEntryFee = preset.parkEntryFee;
    this.entrance = { ...preset.entrance };
    this.date = { year: 1, month: 3, day: 1, dayProgress: 0 };
    this.weather = "sunny";
    this.weatherTimer = 45;
    this.speedMultiplier = 1;

    this.rides = [];
    this.peeps = [];
    this.staff = [];
    this.newsFeed = [];
    this.awards = [];
    this.activeCampaigns = [];
    this.floatingTexts = [];
    this.monthlyFinances = this._createEmptyFinances();
    this.financeHistory = [];
    this._totalAdmissions = 0;

    if (archiveData) {
      this.syncAiWeeklyData(archiveData);
    }

    this._initGrid(preset.terrainTheme, 2);

    // Outer entrance approach road (unowned tile at y = 27)
    const approach = this.getTile(this.entrance.x, this.entrance.y + 1);
    if (approach) {
      approach.path = { type: "tarmac", isQueue: false, mask: 0 };
    }
    // Park gate tile
    const gate = this.getTile(this.entrance.x, this.entrance.y);
    if (gate) {
      gate.path = { type: "crazy", isQueue: false, mask: 0 };
    }

    if (preset.id === "ai_weekly_park") {
      this._buildAiWeeklyParkPreset();
    } else if (preset.id === "dynamite_dunes") {
      this._buildDynamiteDunesPreset();
    } else {
      this._buildForestFrontiersPreset();
    }

    this._recomputeAllPathMasks();
    this._updateParkValuation();
    this.pushNews(`${preset.name} 시나리오를 시작했습니다! (${preset.objectiveText})`, "good");
  }

  _buildForestFrontiersPreset() {
    // Starter footpath plaza from entrance
    for (let y = 18; y <= 25; y++) {
      this._setPathRaw(14, y, "tarmac", false);
    }
    for (let x = 11; x <= 17; x++) {
      this._setPathRaw(x, 18, "crazy", false);
    }
    // Natural terrain hills & pond on far corner
    for (let y = 3; y <= 6; y++) {
      for (let x = 20; x <= 23; x++) {
        const t = this.getTile(x, y);
        if (t) {
          t.height = 1;
          t.waterHeight = 2;
        }
      }
    }
    for (let y = 3; y <= 7; y++) {
      for (let x = 3; x <= 7; x++) {
        const t = this.getTile(x, y);
        if (t) t.height = x === 5 && y === 5 ? 4 : 3;
      }
    }
    // Lush forest perimeter trees
    for (let x = 2; x <= 25; x += 2) {
      for (let y = 2; y <= 24; y += 3) {
        if (Math.abs(x - 14) <= 4 && y >= 16) continue;
        const t = this.getTile(x, y);
        if (t && t.waterHeight === 0 && !t.path) {
          t.scenery = { id: (x + y) % 3 === 0 ? "tree_oak" : "tree_pine" };
        }
      }
    }
    this._placeSceneryRaw(12, 24, "flowerbed");
    this._placeSceneryRaw(16, 24, "flowerbed");
    this._placeSceneryRaw(14, 17, "fountain");
    this.hireStaff("handyman", 14, 21, { free: true });
    for (let i = 0; i < 8; i++) {
      this._spawnGuest(14, 24 - (i % 4));
    }
  }

  _buildDynamiteDunesPreset() {
    // Central oasis pond & gentle desert dunes
    for (let y = 12; y <= 15; y++) {
      for (let x = 16; x <= 20; x++) {
        const t = this.getTile(x, y);
        if (t) {
          t.height = 1;
          t.waterHeight = 2;
        }
      }
    }
    for (let y = 3; y <= 6; y++) {
      for (let x = 21; x <= 24; x++) {
        const t = this.getTile(x, y);
        if (t) t.height = 4;
      }
    }
    // Desert avenue
    for (let y = 16; y <= 25; y++) this._setPathRaw(14, y, "dirt", false);
    for (let x = 6; x <= 14; x++) this._setPathRaw(x, 17, "dirt", false);
    this._setPathRaw(6, 18, "queue", false);

    // Starter Mine Train Coaster
    this.placeRideOrShop(6, 18, "mine_train", {
      blueprintId: "mine_express",
      free: true,
      initialStatus: "open",
      customName: "사막 협곡 마인 익스프레스",
    });
    this.placeRideOrShop(12, 22, "drink_stall", { free: true, initialStatus: "open" });
    this.placeRideOrShop(16, 22, "burger_bar", { free: true, initialStatus: "open" });

    // Palm trees & dune flowers
    const palms = [[15, 11], [21, 12], [21, 15], [15, 16], [10, 23], [18, 24], [4, 10], [8, 8]];
    for (const [px, py] of palms) this._placeSceneryRaw(px, py, "tree_palm");
    this.hireStaff("handyman", 14, 20, { free: true });
    this.hireStaff("mechanic", 13, 18, { free: true });
    for (let i = 0; i < 16; i++) {
      this._spawnGuest(14, 24 - (i % 7));
    }
  }

  _buildAiWeeklyParkPreset() {
    // 1. Multi-tiered scenic ridges & lake
    for (let y = 2; y <= 24; y++) {
      for (let x = 1; x <= 3; x++) {
        const t = this.getTile(x, y);
        if (t) t.height = x <= 2 && y >= 4 && y <= 14 ? 4 : 3;
      }
    }
    for (let y = 2; y <= 4; y++) {
      for (let x = 21; x <= 25; x++) {
        const t = this.getTile(x, y);
        if (t) {
          t.height = y <= 3 && x >= 23 ? 5 : 4;
          if (t.height >= 5) t.surface = "rock";
        }
      }
    }
    // Scenic lakeside & cliff overlook
    for (let y = 5; y <= 9; y++) {
      for (let x = 19; x <= 24; x++) {
        const t = this.getTile(x, y);
        if (t) {
          t.height = 1;
          t.waterHeight = 2;
        }
      }
    }
    for (let y = 17; y <= 24; y++) {
      for (let x = 24; x <= 25; x++) {
        const t = this.getTile(x, y);
        if (t) t.height = 3;
      }
    }

    // 2. Main spine, avenues, lake wooden pier bridge & coaster connectors
    for (let y = 11; y <= 25; y++) this._setPathRaw(14, y, "crazy", false);
    for (let x = 4; x <= 24; x++) this._setPathRaw(x, 15, "tarmac", false);
    for (let x = 4; x <= 22; x++) this._setPathRaw(x, 11, "tarmac", false);

    // Wooden pier bridge over the NE lake
    for (let y = 5; y <= 10; y++) this._setPathRaw(21, y, "dirt", false);

    // West path connector up to cyber_looper station (6,6)
    for (let y = 5; y <= 14; y++) this._setPathRaw(4, y, "tarmac", false);
    for (let x = 4; x <= 8; x++) this._setPathRaw(x, 5, "tarmac", false);
    this._setPathRaw(6, 5, "queue", false);

    // Connector avenue at y=17 for southern coasters (titan_woodie & mine_express)
    for (let x = 6; x <= 17; x++) this._setPathRaw(x, 17, "tarmac", false);
    this._setPathRaw(14, 16, "crazy", false);
    this._setPathRaw(16, 17, "queue", false);
    this._setPathRaw(6, 17, "queue", false);

    // Go-karts avenue at y=22
    for (let x = 7; x <= 14; x++) this._setPathRaw(x, 22, "tarmac", false);
    this._setPathRaw(7, 22, "queue", false);

    // Benches, bins & street lamps along avenues
    for (const bx of [8, 12, 16, 19, 22]) {
      const t = this.getTile(bx, 15);
      if (t?.path) t.pathAddition = bx % 4 === 0 ? "bench" : "bin";
    }
    for (const ly of [24, 21, 19, 13]) {
      const t = this.getTile(14, ly);
      if (t?.path) t.pathAddition = ly === 21 ? "bin" : "lamp";
    }
    for (const lx of [6, 10, 18]) {
      const t = this.getTile(lx, 11);
      if (t?.path) t.pathAddition = "lamp";
    }

    // 3. All 3 Roller Coasters + 6 Flat/Thrill/Water Rides + All 7 Shops
    this.placeRideOrShop(16, 18, "wooden_coaster", {
      blueprintId: "titan_woodie",
      free: true,
      initialStatus: "open",
      customName: "타이탄 우드 코스터",
    });
    this.placeRideOrShop(6, 6, "steel_looping", {
      blueprintId: "cyber_looper",
      free: true,
      initialStatus: "open",
      customName: "더블 루프 사이버 코스터",
    });
    this.placeRideOrShop(6, 18, "mine_train", {
      blueprintId: "mine_express",
      free: true,
      initialStatus: "open",
      customName: "협곡 마인 익스프레스",
    });

    this._setPathRaw(7, 14, "queue", false);
    this.placeRideOrShop(7, 12, "merry_go_round", { free: true, initialStatus: "open" });

    this._setPathRaw(10, 14, "queue", false);
    this.placeRideOrShop(10, 12, "pirate_ship", { free: true, initialStatus: "open" });

    this._setPathRaw(17, 14, "queue", false);
    this.placeRideOrShop(17, 12, "ferris_wheel", { free: true, initialStatus: "open" });

    this._setPathRaw(20, 14, "queue", false);
    this.placeRideOrShop(20, 12, "launched_freefall", { free: true, initialStatus: "open" });

    this._setPathRaw(23, 14, "queue", false);
    this.placeRideOrShop(23, 12, "log_flume", { free: true, initialStatus: "open" });

    this.placeRideOrShop(7, 23, "go_karts", { free: true, initialStatus: "open" });

    // Stalls & services along y=16 and entrance
    this.placeRideOrShop(10, 16, "burger_bar", { free: true, initialStatus: "open" });
    this.placeRideOrShop(12, 16, "drink_stall", { free: true, initialStatus: "open" });
    this.placeRideOrShop(16, 16, "balloon_stall", { free: true, initialStatus: "open" });
    this.placeRideOrShop(18, 16, "restroom", { free: true, initialStatus: "open" });
    this.placeRideOrShop(20, 16, "first_aid", { free: true, initialStatus: "open" });
    this.placeRideOrShop(13, 24, "info_kiosk", { free: true, initialStatus: "open" });
    this.placeRideOrShop(15, 24, "atm", { free: true, initialStatus: "open" });

    // 4. Lush Scenery, Fountains, Gardens & AI Weekly Billboards
    this._placeSceneryRaw(13, 21, "ai_billboard");
    this._placeSceneryRaw(15, 21, "statue_sawyer");
    this._placeSceneryRaw(13, 14, "fountain");
    this._placeSceneryRaw(15, 14, "fountain");
    this._placeSceneryRaw(20, 4, "statue_sawyer");
    for (const [tx, ty, sid] of [
      [2, 4, "tree_pine"], [2, 7, "tree_oak"], [2, 10, "tree_pine"], [2, 13, "tree_oak"],
      [2, 17, "tree_pine"], [2, 20, "tree_oak"], [2, 23, "tree_pine"],
      [3, 4, "tree_oak"], [3, 9, "tree_pine"], [3, 16, "tree_oak"], [3, 22, "tree_pine"],
      [18, 4, "tree_oak"], [19, 3, "tree_pine"], [25, 6, "tree_pine"], [25, 10, "tree_oak"],
      [24, 17, "tree_pine"], [24, 20, "tree_oak"], [24, 23, "tree_pine"],
      [12, 23, "flowerbed"], [16, 23, "flowerbed"], [12, 25, "flowerbed"], [16, 25, "flowerbed"],
      [8, 16, "flowerbed"], [22, 16, "flowerbed"], [12, 12, "flowerbed"], [16, 12, "flowerbed"],
      [12, 18, "tree_oak"], [13, 19, "flowerbed"], [15, 19, "flowerbed"],
    ]) {
      this._placeSceneryRaw(tx, ty, sid);
    }

    // 5. Staff
    this.hireStaff("handyman", 14, 18, { free: true });
    this.hireStaff("handyman", 14, 12, { free: true });
    this.hireStaff("mechanic", 14, 14, { free: true });
    this.hireStaff("entertainer", 11, 15, { free: true });
    this.hireStaff("guard", 14, 23, { free: true });

    // 6. Guests
    const walkSpots = [
      [14, 24], [14, 22], [14, 19], [14, 15], [12, 15], [10, 15],
      [8, 15], [16, 15], [18, 15], [20, 15], [22, 15], [14, 11],
      [10, 11], [17, 11], [21, 9], [21, 7], [4, 11], [4, 7], [6, 5],
      [9, 22], [11, 17],
    ];
    for (let i = 0; i < 36; i++) {
      const [gx, gy] = walkSpots[i % walkSpots.length];
      this._spawnGuest(gx, gy, i % 6 === 0);
    }
  }

  _setPathRaw(x, y, pathType, isQueue = false) {
    const t = this.getTile(x, y);
    if (!t || !t.owned) return;
    t.scenery = null;
    t.path = { type: pathType, isQueue: isQueue || pathType === "queue", mask: 0 };
  }

  _placeSceneryRaw(x, y, sceneryId) {
    const t = this.getTile(x, y);
    if (!t || !t.owned || t.path || t.rideId || t.waterHeight > t.height) return;
    t.scenery = { id: sceneryId };
  }

  _recomputeAllPathMasks() {
    for (let y = 0; y < this.mapSize; y++) {
      for (let x = 0; x < this.mapSize; x++) {
        const t = this.grid[y][x];
        if (!t.path) continue;
        let mask = 0;
        const hasConn = (nx, ny) => {
          const nt = this.getTile(nx, ny);
          if (!nt) return false;
          return Boolean(nt.path || nt.rideId);
        };
        if (hasConn(x, y - 1)) mask |= 1; // North (-Y)
        if (hasConn(x + 1, y)) mask |= 2; // East (+X)
        if (hasConn(x, y + 1)) mask |= 4; // South (+Y)
        if (hasConn(x - 1, y)) mask |= 8; // West (-X)
        t.path.mask = mask;
      }
    }
  }

  _spend(amount) {
    if (this.cash < amount) return false;
    this.cash = Math.round((this.cash - amount) * 100) / 100;
    this.monthlyFinances.constructionCost += amount;
    return true;
  }

  raiseLowerLand(tileX, tileY, delta) {
    if (!this._isOwnedBuildable(tileX, tileY)) {
      return { ok: false, cost: 0, reason: "공원 소유 영역 밖의 지형은 수정할 수 없습니다" };
    }
    const t = this.getTile(tileX, tileY);
    if (t.rideId || t.path) {
      return { ok: false, cost: 0, reason: "건물이나 보도가 있는 타일은 지형을 변경할 수 없습니다" };
    }
    const nextH = Math.max(ISO_METRICS.MIN_HEIGHT, Math.min(ISO_METRICS.MAX_HEIGHT, t.height + delta));
    if (nextH === t.height) {
      return { ok: false, cost: 0, reason: "최대/최소 지형 높이에 도달했습니다" };
    }
    const cost = 20;
    if (!this._spend(cost)) {
      return { ok: false, cost: 0, reason: "현금이 부족합니다 ($20 필요)" };
    }
    t.height = nextH;
    if (t.waterHeight <= t.height) t.waterHeight = 0;
    this.onSfx?.("place");
    return { ok: true, cost, reason: `지형 높이 ${nextH * 3}m` };
  }

  setWaterLevel(tileX, tileY, targetHeight) {
    if (!this._isOwnedBuildable(tileX, tileY)) {
      return { ok: false, cost: 0, reason: "공원 소유 영역 밖에는 물을 채울 수 없습니다" };
    }
    const t = this.getTile(tileX, tileY);
    if (t.rideId || t.path || t.scenery) {
      return { ok: false, cost: 0, reason: "시설물이나 보도를 먼저 철거하세요" };
    }
    const cost = 25;
    if (targetHeight <= t.height) {
      if (t.waterHeight === 0) return { ok: true, cost: 0, reason: "이미 마른 땅입니다" };
      if (!this._spend(cost)) return { ok: false, cost: 0, reason: "현금이 부족합니다" };
      t.waterHeight = 0;
      this.onSfx?.("place");
      return { ok: true, cost, reason: "물 배수 완료" };
    }
    if (!this._spend(cost)) return { ok: false, cost: 0, reason: "현금이 부족합니다 ($25 필요)" };
    t.waterHeight = Math.min(ISO_METRICS.MAX_HEIGHT, targetHeight);
    this.onSfx?.("place");
    return { ok: true, cost, reason: "물 채우기 완료" };
  }

  placeFootpath(tileX, tileY, pathType = "tarmac", isQueue = false) {
    if (!this._isOwnedBuildable(tileX, tileY)) {
      return { ok: false, cost: 0, reason: "공원 경계 밖에는 보도를 깔 수 없습니다" };
    }
    const t = this.getTile(tileX, tileY);
    if (t.rideId) {
      return { ok: false, cost: 0, reason: "이미 놀이기구나 상점이 설치된 타일입니다" };
    }
    const def = PATH_TYPES[isQueue ? "queue" : pathType] || PATH_TYPES.tarmac;
    const cost = t.path ? 5 : def.cost + (t.waterHeight > t.height ? 12 : 0);
    if (!this._spend(cost)) {
      return { ok: false, cost: 0, reason: `현금이 부족합니다 ($${cost} 필요)` };
    }
    t.scenery = null;
    t.path = { type: def.id, isQueue: Boolean(isQueue || def.isQueue), mask: 0 };
    this._recomputeAllPathMasks();
    this.onSfx?.("place");
    return { ok: true, cost, reason: `${def.name} 설치 완료` };
  }

  placePathAddition(tileX, tileY, additionType) {
    const t = this.getTile(tileX, tileY);
    if (!t || !t.path) {
      return { ok: false, cost: 0, reason: "보도 타일 위에만 벤치·쓰레기통·가로등을 놓을 수 있습니다" };
    }
    if (t.path.isQueue && additionType !== "lamp") {
      return { ok: false, cost: 0, reason: "대기열에는 가로등만 설치할 수 있습니다" };
    }
    const cost = 15;
    if (!this._spend(cost)) {
      return { ok: false, cost: 0, reason: "현금이 부족합니다 ($15 필요)" };
    }
    t.pathAddition = additionType;
    this.onSfx?.("place");
    return { ok: true, cost, reason: `${additionType} 설치 완료` };
  }

  placeScenery(tileX, tileY, sceneryId) {
    if (!this._isOwnedBuildable(tileX, tileY)) {
      return { ok: false, cost: 0, reason: "공원 소유 영역 밖입니다" };
    }
    const def = SCENERY_CATALOG[sceneryId];
    if (!def) return { ok: false, cost: 0, reason: "알 수 없는 풍경 소품" };
    const t = this.getTile(tileX, tileY);
    if (t.path || t.rideId || t.waterHeight > t.height) {
      return { ok: false, cost: 0, reason: "보도, 놀이기구 또는 물 위에는 설치할 수 없습니다" };
    }
    if (!this._spend(def.cost)) {
      return { ok: false, cost: 0, reason: `현금이 부족합니다 ($${def.cost} 필요)` };
    }
    t.scenery = { id: def.id };
    this.onSfx?.("place");
    return { ok: true, cost: def.cost, reason: `${def.name} 배치 완료` };
  }

  _countNearbyScenery(x, y, radius = 3) {
    let count = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const t = this.getTile(x + dx, y + dy);
        if (t?.scenery) count++;
        if (t?.waterHeight > t?.height) count += 0.5;
      }
    }
    return Math.round(count);
  }

  placeRideOrShop(tileX, tileY, catalogId, options = {}) {
    const def = RIDE_CATALOG[catalogId];
    if (!def) return { ok: false, ride: null, cost: 0, reason: "알 수 없는 어트랙션" };

    if (options.blueprintId) {
      const bp = COASTER_BLUEPRINTS[options.blueprintId];
      if (!bp) return { ok: false, ride: null, cost: 0, reason: "블루프린트를 찾을 수 없습니다" };
      const bpDef = RIDE_CATALOG[bp.rideCatalogId] || def;
      const startTile = this.getTile(tileX, tileY);
      const originZ = startTile ? Math.max(2, startTile.height) : 2;
      let track;
      try {
        track = CoasterTrack.fromBlueprint(bp, tileX, tileY, originZ, options.facing || 0);
      } catch (err) {
        return { ok: false, ride: null, cost: 0, reason: `블루프린트 배치 불가: ${err.message}` };
      }
      // Verify station tiles don't collide with existing rides or footpaths
      for (const n of track.nodes) {
        if (n.piece.isStation) {
          const st = this.getTile(n.x, n.y);
          if (!st || !st.owned || st.rideId || st.path) {
            return { ok: false, ride: null, cost: 0, reason: "승강장 위치가 다른 시설물이나 보도와 겹칩니다" };
          }
        }
      }
      const totalCost = bpDef.baseCost + track.nodes.length * 22;

      if (!options.free && !this._spend(totalCost)) {
        return { ok: false, ride: null, cost: 0, reason: `현금이 부족합니다 ($${totalCost} 필요)` };
      }

      const nearbyScenery = this._countNearbyScenery(tileX, tileY, 5);
      const statsRes = track.validateAndComputeStats({ nearbySceneryCount: nearbyScenery });
      track.spawnDefaultTrain(3);

      const ride = {
        id: nextUid("ride"),
        catalogId: bpDef.id,
        category: bpDef.category,
        name: options.customName || bp.name,
        x: tileX,
        y: tileY,
        w: 1,
        h: 1,
        z: originZ,
        status: options.initialStatus || "open",
        price: bpDef.defaultPrice,
        runningCostPerMonth: bpDef.runningCostPerMonth,
        capacity: bpDef.capacity,
        inspectionIntervalMin: 20,
        reliability: 100,
        broken: false,
        breakdownReason: null,
        totalRiders: 0,
        totalProfit: 0,
        cycleTimer: 0,
        animPhase: 0,
        passengers: [],
        track,
        stats: statsRes.stats || { excitement: 5.5, intensity: 4.5, nausea: 2.2 },
        sponsorLabel: null,
      };
      track.onScreamTrigger = () => this.onSfx?.("scream");

      // Mark station tiles as ride-occupied
      for (const n of track.nodes) {
        if (n.piece.isStation) {
          const st = this.getTile(n.x, n.y);
          if (st) {
            st.scenery = null;
            st.rideId = ride.id;
          }
        }
      }

      this.rides.push(ride);
      this._recomputeAllPathMasks();
      this._updateParkValuation();
      if (!options.free) {
        this.onSfx?.("place");
        this.pushNews(`🎢 신규 롤러코스터 [${ride.name}] 완공! (흥미도 ${ride.stats.excitement})`, "good", { rideId: ride.id });
      }
      return { ok: true, ride, cost: totalCost, reason: `${ride.name} 건설 완료` };
    }

    // Flat ride or shop (1x1 or 2x2)
    const w = def.footprintW || 1;
    const h = def.footprintH || 1;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const tx = tileX + dx;
        const ty = tileY + dy;
        if (!this._isOwnedBuildable(tx, ty)) {
          return { ok: false, ride: null, cost: 0, reason: "건설 부지가 공원 경계를 벗어났습니다" };
        }
        const t = this.getTile(tx, ty);
        if (t.rideId || t.path || t.waterHeight > t.height) {
          return { ok: false, ride: null, cost: 0, reason: "부지에 보도·물·다른 시설물이 있습니다" };
        }
      }
    }

    const totalCost = def.baseCost;
    if (!options.free && !this._spend(totalCost)) {
      return { ok: false, ride: null, cost: 0, reason: `현금이 부족합니다 ($${totalCost} 필요)` };
    }

    const baseTile = this.getTile(tileX, tileY);
    const baseZ = baseTile.height;
    const ride = {
      id: nextUid("ride"),
      catalogId: def.id,
      category: def.category,
      name: options.customName || `${def.name} #${this.rides.filter((r) => r.catalogId === def.id).length + 1}`,
      x: tileX,
      y: tileY,
      w,
      h,
      z: baseZ,
      status: options.initialStatus || "open",
      price: def.defaultPrice,
      runningCostPerMonth: def.runningCostPerMonth,
      capacity: def.capacity || 1,
      inspectionIntervalMin: 20,
      reliability: 100,
      broken: false,
      breakdownReason: null,
      totalRiders: 0,
      totalProfit: 0,
      cycleTimer: 0,
      animPhase: 0,
      passengers: [],
      track: null,
      stats: {
        excitement: def.excitement || 0,
        intensity: def.intensity || 0,
        nausea: def.nausea || 0,
      },
      sponsorLabel: null,
    };

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const t = this.getTile(tileX + dx, tileY + dy);
        t.height = baseZ;
        t.scenery = null;
        t.rideId = ride.id;
      }
    }

    this.rides.push(ride);
    this._recomputeAllPathMasks();
    this._updateParkValuation();
    if (!options.free) {
      this.onSfx?.("place");
      this.pushNews(`🎡 신규 시설 [${ride.name}] 배치 완료!`, "good", { rideId: ride.id });
    }
    return { ok: true, ride, cost: totalCost, reason: `${ride.name} 배치 완료` };
  }

  startCustomCoaster(tileX, tileY, coasterCatalogId = "wooden_coaster", facing = 0) {
    const def = RIDE_CATALOG[coasterCatalogId];
    if (!def || def.category !== "coaster") {
      return { ok: false, ride: null, cost: 0, reason: "롤러코스터 종류가 아닙니다" };
    }
    if (!this._isOwnedBuildable(tileX, tileY)) {
      return { ok: false, ride: null, cost: 0, reason: "건설 위치가 공원 경계를 벗어났습니다" };
    }
    const t = this.getTile(tileX, tileY);
    if (t.rideId || t.path || t.waterHeight > t.height) {
      return { ok: false, ride: null, cost: 0, reason: "시작 타일에 기존 시설이나 보도가 있습니다" };
    }
    const startCost = 180;
    if (!this._spend(startCost)) {
      return { ok: false, ride: null, cost: 0, reason: "현금이 부족합니다 ($180 필요)" };
    }

    const track = new CoasterTrack({
      rideCatalogId: def.id,
      originX: tileX,
      originY: tileY,
      originZ: t.height,
      facing,
      mode: "circuit",
    });
    track.appendPiece("station");

    const ride = {
      id: nextUid("ride"),
      catalogId: def.id,
      category: "coaster",
      name: `${def.name} #${this.rides.filter((r) => r.catalogId === def.id).length + 1}`,
      x: tileX,
      y: tileY,
      w: 1,
      h: 1,
      z: t.height,
      status: "closed",
      price: def.defaultPrice,
      runningCostPerMonth: def.runningCostPerMonth,
      capacity: def.capacity,
      inspectionIntervalMin: 20,
      reliability: 100,
      broken: false,
      breakdownReason: null,
      totalRiders: 0,
      totalProfit: 0,
      cycleTimer: 0,
      animPhase: 0,
      passengers: [],
      track,
      stats: { excitement: 0, intensity: 0, nausea: 0 },
      sponsorLabel: null,
    };
    track.onScreamTrigger = () => this.onSfx?.("scream");
    t.rideId = ride.id;
    t.scenery = null;

    this.rides.push(ride);
    this._recomputeAllPathMasks();
    this.onSfx?.("place");
    return { ok: true, ride, cost: startCost, reason: "커스텀 승강장 배치 완료" };
  }

  appendCustomTrackPiece(rideId, pieceId) {
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride || !ride.track) return { ok: false, reason: "코스터를 찾을 수 없습니다" };
    const pieceCost = pieceId === "vertical_loop" ? 160 : 35;
    if (this.cash < pieceCost) {
      return { ok: false, reason: `현금이 부족합니다 ($${pieceCost} 필요)` };
    }
    const res = ride.track.appendPiece(pieceId);
    if (!res.ok) return res;
    this._spend(pieceCost);

    if (res.node.piece.isStation) {
      const st = this.getTile(res.node.x, res.node.y);
      if (st && !st.rideId) st.rideId = ride.id;
    }
    this._recomputeAllPathMasks();
    this.onSfx?.("place");

    if (ride.track.isClosed()) {
      const statsRes = ride.track.validateAndComputeStats({
        nearbySceneryCount: this._countNearbyScenery(ride.x, ride.y, 5),
      });
      if (statsRes.valid) ride.stats = statsRes.stats;
    }
    return { ok: true, node: res.node, closed: ride.track.isClosed() };
  }

  removeLastCustomTrackPiece(rideId) {
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride || !ride.track || ride.track.nodes.length <= 1) {
      return { ok: false, reason: "최소 1개의 승강장 조각은 유지되어야 합니다" };
    }
    const last = ride.track.nodes[ride.track.nodes.length - 1];
    const ok = ride.track.removeLastPiece();
    if (!ok) return { ok: false, reason: "제거 실패" };
    if (last.piece.isStation) {
      const st = this.getTile(last.x, last.y);
      if (st && st.rideId === ride.id && (last.x !== ride.x || last.y !== ride.y)) {
        st.rideId = null;
      }
    }
    if (ride.status !== "closed") ride.status = "closed";
    this.cash += 15;
    this.onSfx?.("bulldoze");
    return { ok: true };
  }

  autoCloseCustomCoaster(rideId) {
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride || !ride.track) return { ok: false, reason: "코스터를 찾을 수 없습니다" };
    const res = ride.track.autoCloseToStation();
    if (!res.ok) return res;
    const cost = res.addedCount * 30;
    this.cash = Math.max(0, this.cash - cost);
    const statsRes = ride.track.validateAndComputeStats({
      nearbySceneryCount: this._countNearbyScenery(ride.x, ride.y, 5),
    });
    if (statsRes.valid) {
      ride.stats = statsRes.stats;
      ride.track.spawnDefaultTrain(3);
    }
    this.onSfx?.("place");
    return { ok: true, addedCount: res.addedCount, reason: res.reason, stats: statsRes.stats };
  }

  setRideStatus(rideId, status) {
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride) return { ok: false, reason: "놀이기구를 찾을 수 없습니다" };

    if (ride.broken && status === "open") {
      return { ok: false, reason: "고장 상태입니다! 정비사의 수리가 완료될 때까지 개장할 수 없습니다" };
    }

    if (ride.track && (status === "open" || status === "testing")) {
      const nearby = this._countNearbyScenery(ride.x, ride.y, 5);
      const validation = ride.track.validateAndComputeStats({ nearbySceneryCount: nearby });
      if (!validation.valid) {
        return { ok: false, reason: validation.reason };
      }
      ride.stats = validation.stats;
      if (ride.track.trains.length === 0) ride.track.spawnDefaultTrain(3);
    }

    ride.status = status;
    this.onSfx?.("click");
    return { ok: true, status: ride.status, stats: ride.stats };
  }

  setRidePrice(rideId, price) {
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride) return;
    ride.price = Math.max(0, Math.min(25, Math.round(Number(price) * 10) / 10));
  }

  bulldozeTile(tileX, tileY) {
    if (!this._isOwnedBuildable(tileX, tileY)) {
      return { ok: false, refund: 0, reason: "공원 소유 영역 밖은 철거할 수 없습니다" };
    }
    const t = this.getTile(tileX, tileY);
    if (tileX === this.entrance.x && tileY === this.entrance.y) {
      return { ok: false, refund: 0, reason: "공원 정문은 철거할 수 없습니다" };
    }

    let refund = 0;
    let what = "";

    if (t.rideId) {
      const idx = this.rides.findIndex((r) => r.id === t.rideId);
      if (idx >= 0) {
        const ride = this.rides[idx];
        // Release passengers back to nearest path
        for (const p of ride.passengers) {
          p.state = "walking";
          p.ridingRideId = null;
          this._snapPeepToNearestPath(p);
        }
        // Clear all tiles occupied by ride
        for (let y = 0; y < this.mapSize; y++) {
          for (let x = 0; x < this.mapSize; x++) {
            if (this.grid[y][x].rideId === ride.id) this.grid[y][x].rideId = null;
          }
        }
        this.rides.splice(idx, 1);
        refund = 150;
        what = ride.name;
      }
    } else if (t.scenery) {
      refund = 10;
      what = SCENERY_CATALOG[t.scenery.id]?.name || "풍경 소품";
      t.scenery = null;
    } else if (t.pathAddition) {
      refund = 5;
      what = t.pathAddition;
      t.pathAddition = null;
    } else if (t.path) {
      refund = 6;
      what = "보도";
      t.path = null;
      t.litter = 0;
      t.vomit = 0;
      // Relocate any stranded peeps/staff on this bulldozed tile immediately
      for (const p of this.peeps) {
        if (Math.round(p.x) === tileX && Math.round(p.y) === tileY) {
          this._snapPeepToNearestPath(p);
        }
      }
      for (const s of this.staff) {
        if (Math.round(s.x) === tileX && Math.round(s.y) === tileY) {
          this._snapPeepToNearestPath(s);
        }
      }
    } else {
      return { ok: false, refund: 0, reason: "철거할 시설물이 없습니다" };
    }

    this.cash += refund;
    this._recomputeAllPathMasks();
    this._updateParkValuation();
    this.onSfx?.("bulldoze");
    return { ok: true, refund, reason: `${what} 철거 완료 (+$${refund})` };
  }

  hireStaff(role = "handyman", tileX = null, tileY = null, options = {}) {
    const def = STAFF_TYPES[role];
    if (!def) return { ok: false, staff: null, reason: "알 수 없는 직원 직무" };
    if (!options.free && !this._spend(def.hireCost)) {
      return { ok: false, staff: null, reason: `현금이 부족합니다 ($${def.hireCost} 필요)` };
    }

    let spawnX = tileX ?? this.entrance.x;
    let spawnY = tileY ?? Math.max(1, this.entrance.y - 1);
    const tile = this.getTile(spawnX, spawnY);
    if (!tile || !tile.path) {
      const nearest = this._findNearestPathTile(spawnX, spawnY);
      if (nearest) {
        spawnX = nearest.x;
        spawnY = nearest.y;
      }
    }

    const num = this.staff.filter((s) => s.role === role).length + 1;
    const member = {
      id: nextUid("staff"),
      role,
      name: `${def.name.split(" ")[0]} ${num}`,
      x: spawnX,
      y: spawnY,
      targetX: spawnX,
      targetY: spawnY,
      facing: 0,
      walkPhase: 0,
      state: "patrolling", // "patrolling" | "heading_to_repair" | "repairing" | "sweeping"
      targetRideId: null,
      repairTimer: 0,
      sweptCount: 0,
      repairedCount: 0,
    };
    this.staff.push(member);
    if (!options.free) this.onSfx?.("place");
    return { ok: true, staff: member };
  }

  fireStaff(staffId) {
    const idx = this.staff.findIndex((s) => s.id === staffId);
    if (idx < 0) return false;
    this.staff.splice(idx, 1);
    this.onSfx?.("click");
    return true;
  }

  dropStaffWithPincer(staffId, tileX, tileY) {
    const member = this.staff.find((s) => s.id === staffId);
    if (!member) return { ok: false };
    const t = this.getTile(tileX, tileY);
    if (t && t.path) {
      member.x = tileX;
      member.y = tileY;
      member.targetX = tileX;
      member.targetY = tileY;
    } else {
      const snapped = this._findNearestPathTile(tileX, tileY);
      if (snapped) {
        member.x = snapped.x;
        member.y = snapped.y;
        member.targetX = snapped.x;
        member.targetY = snapped.y;
      }
    }
    this.onSfx?.("place");
    return { ok: true };
  }

  dropPeepWithPincer(peepId, tileX, tileY) {
    const peep = this.peeps.find((p) => p.id === peepId);
    if (!peep) return { ok: false, snappedTile: null };
    peep.state = "walking";
    peep.ridingRideId = null;

    const target = this.getTile(tileX, tileY);
    if (target && target.owned && target.path && target.waterHeight <= target.height) {
      peep.x = tileX;
      peep.y = tileY;
      peep.targetX = tileX;
      peep.targetY = tileY;
      peep.thoughts.unshift("집게에 들렸다가 내려왔다!");
      peep.thoughts = peep.thoughts.slice(0, 6);
      this.onSfx?.("place");
      return { ok: true, snappedTile: { x: tileX, y: tileY } };
    }

    const nearest = this._findNearestPathTile(tileX, tileY);
    if (nearest) {
      peep.x = nearest.x;
      peep.y = nearest.y;
      peep.targetX = nearest.x;
      peep.targetY = nearest.y;
      peep.thoughts.unshift("보도 위로 안전하게 돌아왔다.");
      peep.thoughts = peep.thoughts.slice(0, 6);
    }
    this.onSfx?.("place");
    return { ok: true, snappedTile: nearest };
  }

  popBalloonAt(peepId) {
    const peep = this.peeps.find((p) => p.id === peepId);
    if (!peep || !peep.hasBalloon) return false;
    peep.hasBalloon = false;
    peep.happiness = Math.max(0, peep.happiness - 18);
    peep.thoughts.unshift("앗! 내 풍선이 터졌어!");
    peep.thoughts = peep.thoughts.slice(0, 6);
    const tile = this.getTile(Math.round(peep.x), Math.round(peep.y));
    this.addFloatingText(peep.x, peep.y, (tile?.height || 2) + 1.5, "POP!", "#f43f5e");
    this.onSfx?.("pop");
    return true;
  }

  adjustLoan(deltaAmount) {
    const nextLoan = this.loan + deltaAmount;
    if (nextLoan < 0) {
      return { ok: false, loan: this.loan, cash: this.cash, reason: "상환액이 대출 잔액보다 큽니다" };
    }
    if (nextLoan > this.maxLoan) {
      return { ok: false, loan: this.loan, cash: this.cash, reason: `최대 대출 한도($${this.maxLoan.toLocaleString()})를 초과했습니다` };
    }
    if (deltaAmount < 0 && this.cash < Math.abs(deltaAmount)) {
      return { ok: false, loan: this.loan, cash: this.cash, reason: "상환할 현금이 부족합니다" };
    }
    this.loan = nextLoan;
    this.cash += deltaAmount;
    this.onSfx?.("cash");
    return { ok: true, loan: this.loan, cash: this.cash };
  }

  startMarketingCampaign(campaignId) {
    const camp = MARKETING_CAMPAIGNS[campaignId];
    if (!camp) return { ok: false, reason: "알 수 없는 마케팅 캠페인" };
    if (!this._spend(camp.cost)) {
      return { ok: false, reason: `광고 비용($${camp.cost})이 부족합니다` };
    }
    this.monthlyFinances.marketingCost += camp.cost;
    this.activeCampaigns.push({
      id: camp.id,
      name: camp.name,
      daysLeft: camp.durationDays,
      guestBoost: camp.guestBoost,
    });
    this.pushNews(`📣 마케팅 시작: ${camp.name} (${camp.durationDays}일간 진행)`, "good");
    this.onSfx?.("cash");
    return { ok: true };
  }

  triggerRideBreakdown(rideId, reason = "안전 차단기 작동 (Safety Cut-Out)") {
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride || ride.category === "shop") return false;
    ride.broken = true;
    ride.status = "broken";
    ride.breakdownReason = reason;
    ride.reliability = Math.max(0, ride.reliability - 45);
    this.pushNews(`🚨 [${ride.name}] 고장 발생! (${reason})`, "alert", { rideId: ride.id });
    this.onSfx?.("breakdown");

    // Dispatch nearest available mechanic
    const mechanics = this.staff.filter((s) => s.role === "mechanic" && !s.targetRideId);
    if (mechanics.length > 0) {
      mechanics.sort((a, b) => Math.hypot(a.x - ride.x, a.y - ride.y) - Math.hypot(b.x - ride.x, b.y - ride.y));
      const mech = mechanics[0];
      mech.targetRideId = ride.id;
      mech.state = "heading_to_repair";
    }
    return true;
  }

  callMechanicToRide(rideId) {
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride) return { ok: false, reason: "놀이기구 없음" };
    const mech = this.staff.find((s) => s.role === "mechanic");
    if (!mech) return { ok: false, reason: "고용된 정비사가 없습니다! 직원 창에서 정비사를 고용하세요." };
    mech.targetRideId = ride.id;
    mech.state = "heading_to_repair";
    return { ok: true, reason: `${mech.name}가 수리/점검을 위해 이동 중입니다` };
  }

  addFloatingText(tileX, tileY, heightZ, text, color = "#fde047") {
    this.floatingTexts.push({
      id: nextUid("ft"),
      tileX,
      tileY,
      heightZ,
      text,
      color,
      life: 1.5,
      maxLife: 1.5,
    });
    if (this.floatingTexts.length > 36) this.floatingTexts.shift();
  }

  pushNews(text, severity = "info", target = null) {
    const label = `Y${this.date.year} ${this.date.month}/${this.date.day}`;
    this.newsFeed.unshift({ id: nextUid("news"), timeLabel: label, text, severity, target });
    if (this.newsFeed.length > 40) this.newsFeed.length = 40;
  }

  syncAiWeeklyData(archiveData) {
    if (!archiveData) return;
    this.aiArchive = {
      plugins: Array.isArray(archiveData.plugins) ? archiveData.plugins : [],
      news: Array.isArray(archiveData.news) ? archiveData.news : [],
      social: Array.isArray(archiveData.social) ? archiveData.social : [],
      benchmarks: Array.isArray(archiveData.benchmarks) ? archiveData.benchmarks : [],
    };
    const topNews = this.aiArchive.news[0];
    if (topNews) {
      this.pushNews(`📡 [AI위클리 특보] ${topNews.title_ko || topNews.headline}`, "info");
    }
  }

  _findNearestPathTile(fromX, fromY) {
    let best = null;
    let bestDist = Infinity;
    for (let y = 1; y < this.mapSize - 1; y++) {
      for (let x = 1; x < this.mapSize - 1; x++) {
        const t = this.grid[y][x];
        if (!t.path) continue;
        const d = Math.abs(x - fromX) + Math.abs(y - fromY);
        if (d < bestDist) {
          bestDist = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  _snapPeepToNearestPath(entity) {
    const nearest = this._findNearestPathTile(Math.round(entity.x), Math.round(entity.y));
    if (nearest) {
      entity.x = nearest.x;
      entity.y = nearest.y;
      entity.targetX = nearest.x;
      entity.targetY = nearest.y;
    }
  }

  _spawnGuest(spawnX = null, spawnY = null, vip = false) {
    if (this.peeps.length >= 160) return null;
    const x = spawnX ?? this.entrance.x;
    const y = spawnY ?? Math.max(1, this.entrance.y - 1);
    const first = PEEP_FIRST_NAMES[Math.floor(Math.random() * PEEP_FIRST_NAMES.length)];
    const last = PEEP_LAST_NAMES[Math.floor(Math.random() * PEEP_LAST_NAMES.length)];
    const balloonColors = ["#ef4444", "#3b82f6", "#eab308", "#ec4899", "#22c55e"];

    const peep = {
      id: nextUid("peep"),
      name: `${last}${first}`,
      shirtColor: PEEP_SHIRT_COLORS[Math.floor(Math.random() * PEEP_SHIRT_COLORS.length)],
      x,
      y,
      targetX: x,
      targetY: y,
      facing: 2,
      walkPhase: Math.random() * 6,
      cash: 45 + Math.floor(Math.random() * 65),
      happiness: 78 + Math.floor(Math.random() * 18),
      energy: 90,
      hunger: 15 + Math.floor(Math.random() * 20),
      thirst: 15 + Math.floor(Math.random() * 20),
      nausea: 0,
      toilet: 10,
      hasBalloon: vip || Math.random() < 0.18,
      balloonColor: balloonColors[Math.floor(Math.random() * balloonColors.length)],
      hasUmbrella: false,
      hasBurger: false,
      hasDrink: false,
      state: "walking", // "walking" | "riding" | "sitting" | "leaving"
      ridingRideId: null,
      rideTimer: 0,
      sitTimer: 0,
      cooldownTimer: 0,
      thoughts: ["여기에 오니 정말 신난다!", "어떤 롤러코스터부터 타볼까?"],
      ridesRidden: 0,
      isVipPeer: vip,
    };
    this.peeps.push(peep);
    this._totalAdmissions++;
    return peep;
  }

  step(dtSeconds) {
    if (this.speedMultiplier <= 0) return;
    const simDt = Math.min(0.1, dtSeconds) * this.speedMultiplier;

    // 1. Floating text decay
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].life -= dtSeconds;
      this.floatingTexts[i].heightZ += dtSeconds * 0.85;
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }

    // 2. Calendar & Weather progression (1 game day = ~4.5 real sec at 1x)
    this.date.dayProgress += simDt / 4.5;
    if (this.date.dayProgress >= 1) {
      this.date.dayProgress -= 1;
      this._advanceDay();
    }

    this.weatherTimer -= simDt;
    if (this.weatherTimer <= 0) {
      this.weatherTimer = 35 + Math.random() * 35;
      const roll = Math.random();
      const prev = this.weather;
      this.weather = this.scenarioId === "dynamite_dunes"
        ? (roll < 0.85 ? "sunny" : "cloudy")
        : (roll < 0.62 ? "sunny" : roll < 0.85 ? "cloudy" : "rain");
      if (this.weather !== prev && this.weather === "rain") {
        this.pushNews("🌧️ 공원에 비가 내리기 시작했습니다! 안내소 우산 판매량이 급증합니다.", "info");
      }
    }

    // 3. Guest spawning from Entrance based on Park Rating + Marketing Campaigns
    const openRidesCount = this.rides.filter((r) => r.status === "open" && r.category !== "shop").length;
    const campBoost = this.activeCampaigns.reduce((acc, c) => acc + c.guestBoost, 0);
    const targetGuests = Math.min(130, 12 + openRidesCount * 11 + Math.round(campBoost * 8));
    this._guestSpawnAccum += simDt * (0.45 + campBoost * 0.35);
    if (this._guestSpawnAccum >= 1 && this.peeps.length < targetGuests) {
      this._guestSpawnAccum = 0;
      const g = this._spawnGuest(this.entrance.x, Math.max(1, this.entrance.y - 1));
      if (g && this.parkEntryFee > 0) {
        this.cash += this.parkEntryFee;
        this.monthlyFinances.entryIncome += this.parkEntryFee;
        g.cash = Math.max(10, g.cash - this.parkEntryFee);
        this.addFloatingText(this.entrance.x, this.entrance.y, 3.2, `+$${this.parkEntryFee}`, "#4ade80");
      }
    }

    // 4. Step Rides & Coaster Physics
    this._tickRides(simDt);

    // 5. Step Staff AI (Handyman, Mechanic, Guard, Entertainer)
    this._tickStaff(simDt);

    // 6. Step Peep AI (Pathfinding, boarding, eating, vomiting, thoughts)
    this._tickPeeps(simDt);

    // 7. Breakdown check (periodic chance based on reliability)
    this._breakdownCheckAccum += simDt;
    if (this._breakdownCheckAccum >= 18) {
      this._breakdownCheckAccum = 0;
      for (const r of this.rides) {
        if (r.category === "shop" || r.status !== "open" || r.broken) continue;
        r.reliability = Math.max(15, r.reliability - 2.2);
        const failProb = Math.max(0.01, (100 - r.reliability) * 0.0028);
        if (Math.random() < failProb) {
          this.triggerRideBreakdown(r.id, r.track ? "체인/브레이크 안전 정지" : "구동 모터 과열 정지");
        }
      }
    }
  }

  _advanceDay() {
    this.date.day += 1;
    // Update active marketing campaigns
    for (let i = this.activeCampaigns.length - 1; i >= 0; i--) {
      this.activeCampaigns[i].daysLeft -= 1;
      if (this.activeCampaigns[i].daysLeft <= 0) {
        this.pushNews(`📣 마케팅 종료: ${this.activeCampaigns[i].name}`, "info");
        this.activeCampaigns.splice(i, 1);
      }
    }

    if (this.date.day > 30) {
      this.date.day = 1;
      this.date.month += 1;
      if (this.date.month > 10) {
        this.date.month = 3; // RCT1 season runs Mar..Oct
        this.date.year += 1;
      }
      this._processMonthEnd();
    }
    this._updateParkRatingAndAwards();
  }

  _processMonthEnd() {
    const wages = this.staff.reduce((sum, s) => sum + (STAFF_TYPES[s.role]?.wagePerMonth || 50), 0);
    const upkeep = this.rides
      .filter((r) => r.status === "open")
      .reduce((sum, r) => sum + (r.runningCostPerMonth || 20), 0);
    const interest = Math.round(this.loan * 0.015);

    this.monthlyFinances.staffWages = wages;
    this.monthlyFinances.rideUpkeep = upkeep;
    this.monthlyFinances.loanInterest = interest;

    const totalExpense = wages + upkeep + interest;
    this.cash = Math.round((this.cash - totalExpense) * 100) / 100;

    this.financeHistory.unshift({
      dateLabel: `Y${this.date.year} ${this.date.month}월`,
      ...this.monthlyFinances,
      net: Math.round(
        this.monthlyFinances.rideIncome +
          this.monthlyFinances.shopIncome +
          this.monthlyFinances.entryIncome -
          totalExpense
      ),
    });
    if (this.financeHistory.length > 12) this.financeHistory.length = 12;
    this.monthlyFinances = this._createEmptyFinances();
    this._updateParkValuation();
  }

  _updateParkRatingAndAwards() {
    let dirtyPenalty = 0;
    for (let y = 1; y < this.mapSize - 1; y++) {
      for (let x = 1; x < this.mapSize - 1; x++) {
        const t = this.grid[y][x];
        dirtyPenalty += t.litter * 4 + t.vomit * 12;
      }
    }
    const avgHappy =
      this.peeps.length > 0
        ? this.peeps.reduce((acc, p) => acc + p.happiness, 0) / this.peeps.length
        : 75;
    const openRides = this.rides.filter((r) => r.status === "open" && r.category !== "shop").length;
    const brokenCount = this.rides.filter((r) => r.broken).length;

    const raw =
      340 +
      avgHappy * 4.4 +
      Math.min(180, openRides * 28) +
      Math.min(120, this.peeps.length * 1.5) -
      dirtyPenalty -
      brokenCount * 45;
    this.parkRating = Math.max(0, Math.min(999, Math.round(raw)));

    // Check awards
    if (dirtyPenalty === 0 && this.peeps.length >= 20 && !this.awards.includes("가장 깨끗한 공원상")) {
      this.awards.push("가장 깨끗한 공원상");
      this.pushNews("🏆 [수상] 우리 공원이 '가장 깨끗한 공원상'을 수상했습니다!", "good");
      this.onSfx?.("award");
    }
    if (
      this.rides.some((r) => r.track && r.stats?.excitement >= 6.0) &&
      !this.awards.includes("최고의 롤러코스터상")
    ) {
      this.awards.push("최고의 롤러코스터상");
      this.pushNews("🏆 [수상] 극강 스릴 코스터로 '최고의 롤러코스터상' 수상!", "good");
      this.onSfx?.("award");
    }
    if (this.parkRating >= 850 && !this.awards.includes("AI위클리 올해의 테마파크상")) {
      this.awards.push("AI위클리 올해의 테마파크상");
      this.pushNews("🏆 [수상] 공원 평점 850+ 돌파! 'AI위클리 올해의 테마파크상' 수상!", "good");
      this.onSfx?.("award");
    }
  }

  _updateParkValuation() {
    const ridesVal = this.rides.reduce((acc, r) => acc + (RIDE_CATALOG[r.catalogId]?.baseCost || 200) * 0.85, 0);
    this.parkValue = Math.round(ridesVal + this.peeps.length * 25 + this.parkRating * 2);
    this.companyValue = Math.round(this.parkValue + this.cash - this.loan);
  }

  _tickRides(dt) {
    for (const r of this.rides) {
      if (r.category === "shop") continue;
      const active = r.status === "open" || r.status === "testing";
      if (r.track) {
        r.track.stepTrains(dt, active && !r.broken);
      } else if (active && !r.broken) {
        r.animPhase += dt * (r.catalogId === "launched_freefall" ? 1.4 : 2.1);
      }

      // Release passengers whose ride duration ended
      if (r.passengers.length > 0 && !r.broken) {
        r.cycleTimer += dt;
        const dur = RIDE_CATALOG[r.catalogId]?.defaultDuration || 18;
        if (r.cycleTimer >= dur * 0.35) {
          r.cycleTimer = 0;
          const exiting = r.passengers.splice(0, Math.min(4, r.passengers.length));
          for (const p of exiting) {
            p.state = "walking";
            p.ridingRideId = null;
            p.ridesRidden += 1;
            p.cooldownTimer = 6;
            const exc = r.stats?.excitement || 3;
            const nau = r.stats?.nausea || 1;
            p.happiness = Math.min(100, p.happiness + Math.round(exc * 3.5));
            p.nausea = Math.min(100, p.nausea + Math.round(nau * 7.5));
            p.energy = Math.max(10, p.energy - 8);
            p.thoughts.unshift(
              nau >= 4.0
                ? `${r.name} 타고 속이 울렁거려…`
                : `${r.name} 정말 최고였어!`
            );
            p.thoughts = p.thoughts.slice(0, 6);
            this._snapPeepToNearestPath(p);
          }
        }
      }
    }
  }

  _tickStaff(dt) {
    for (const s of this.staff) {
      // Repair cycle for mechanics
      if (s.role === "mechanic" && s.targetRideId) {
        const ride = this.rides.find((r) => r.id === s.targetRideId);
        if (!ride) {
          s.targetRideId = null;
          s.state = "patrolling";
          continue;
        }
        const dist = Math.hypot(ride.x - s.x, ride.y - s.y);
        if (s.state === "repairing") {
          s.repairTimer -= dt;
          if (s.repairTimer <= 0) {
            ride.broken = false;
            ride.breakdownReason = null;
            ride.status = "open";
            ride.reliability = 100;
            s.repairedCount += 1;
            s.targetRideId = null;
            s.state = "patrolling";
            this.addFloatingText(ride.x, ride.y, ride.z + 1.5, "🔧 수리 완료!", "#38bdf8");
            this.pushNews(`🔧 ${s.name}가 [${ride.name}] 수리를 완료해 재개장했습니다.`, "good");
            this.onSfx?.("repair");
          }
          continue;
        }
        if (dist <= 1.8) {
          s.state = "repairing";
          s.repairTimer = 1.6;
          continue;
        }
        // Move quickly toward broken ride along Manhattan step
        const stepSpeed = 4.2 * dt;
        const dx = ride.x - s.x;
        const dy = ride.y - s.y;
        const len = Math.max(0.01, Math.hypot(dx, dy));
        s.x += (dx / len) * Math.min(stepSpeed, len);
        s.y += (dy / len) * Math.min(stepSpeed, len);
        s.walkPhase += dt * 8;
        continue;
      }

      // Handyman sweeps vomit & litter on current and adjacent tiles
      if (s.role === "handyman") {
        const cx = Math.round(s.x);
        const cy = Math.round(s.y);
        const curTile = this.getTile(cx, cy);
        if (curTile && (curTile.vomit > 0 || curTile.litter > 0)) {
          curTile.vomit = 0;
          curTile.litter = 0;
          s.sweptCount += 1;
          this.onSfx?.("sweep");
        }
      }

      // Entertainer boosts happiness of nearby peeps
      if (s.role === "entertainer") {
        for (const p of this.peeps) {
          if (Math.abs(p.x - s.x) <= 2.5 && Math.abs(p.y - s.y) <= 2.5) {
            p.happiness = Math.min(100, p.happiness + 4 * dt);
          }
        }
      }

      // Patrol along adjacent path tiles
      const dToTarget = Math.hypot(s.targetX - s.x, s.targetY - s.y);
      if (dToTarget < 0.08) {
        s.x = s.targetX;
        s.y = s.targetY;
        const next = this._pickAdjacentPathTile(Math.round(s.x), Math.round(s.y), s.facing);
        if (next) {
          s.targetX = next.x;
          s.targetY = next.y;
          s.facing = next.dir;
        } else {
          this._snapPeepToNearestPath(s);
        }
      } else {
        const move = Math.min(dToTarget, 1.8 * dt);
        s.x += ((s.targetX - s.x) / dToTarget) * move;
        s.y += ((s.targetY - s.y) / dToTarget) * move;
        s.walkPhase += dt * 6.5;
      }
    }
  }

  _tickPeeps(dt) {
    for (const p of this.peeps) {
      if (p.state === "riding") continue;
      if (p.cooldownTimer > 0) p.cooldownTimer -= dt;

      // Needs progression
      p.hunger = Math.min(100, p.hunger + 0.65 * dt);
      p.thirst = Math.min(100, p.thirst + 0.85 * dt);
      p.energy = Math.max(0, p.energy - 0.35 * dt);
      if (p.nausea > 0) p.nausea = Math.max(0, p.nausea - 0.4 * dt);

      if (this.weather === "rain" && !p.hasUmbrella) {
        p.happiness = Math.max(5, p.happiness - 1.1 * dt);
      }

      // Sitting on bench recovery
      if (p.state === "sitting") {
        p.sitTimer -= dt;
        p.energy = Math.min(100, p.energy + 12 * dt);
        p.nausea = Math.max(0, p.nausea - 8 * dt);
        if (p.sitTimer <= 0) p.state = "walking";
        continue;
      }

      const cx = Math.round(p.x);
      const cy = Math.round(p.y);
      const tile = this.getTile(cx, cy);

      // Stranded recovery if path under peep was bulldozed
      if (!tile || !tile.path) {
        this._snapPeepToNearestPath(p);
        continue;
      }

      // Reaction to dirty path
      if (tile.vomit > 0) {
        p.happiness = Math.max(0, p.happiness - 4 * dt);
        if (!p.thoughts[0]?.includes("더럽")) {
          p.thoughts.unshift("길이 구토물 때문에 너무 더럽다!");
          p.thoughts = p.thoughts.slice(0, 6);
        }
      }

      // Vomiting if extreme nausea
      if (p.nausea >= 82 && Math.random() < 0.06 * dt) {
        tile.vomit = Math.min(2, tile.vomit + 1);
        p.nausea = 25;
        p.happiness = Math.max(0, p.happiness - 15);
        p.thoughts.unshift("으악! 속이 너무 안 좋아서 토했어…");
        p.thoughts = p.thoughts.slice(0, 6);
      }

      // Bench rest
      if (tile.pathAddition === "bench" && p.energy < 45 && Math.random() < 0.25) {
        p.state = "sitting";
        p.sitTimer = 4.0;
        continue;
      }

      // Interact with adjacent rides or shops when arriving at a tile
      const dToTarget = Math.hypot(p.targetX - p.x, p.targetY - p.y);
      if (dToTarget < 0.08) {
        p.x = p.targetX;
        p.y = p.targetY;
        const interacted = this._tryPeepInteractAdjacent(p, Math.round(p.x), Math.round(p.y));
        if (interacted) continue;

        const next = this._pickAdjacentPathTile(Math.round(p.x), Math.round(p.y), p.facing);
        if (next) {
          p.targetX = next.x;
          p.targetY = next.y;
          p.facing = next.dir;
        }
      } else {
        const speed = p.energy < 25 ? 1.15 : 1.75;
        const move = Math.min(dToTarget, speed * dt);
        p.x += ((p.targetX - p.x) / dToTarget) * move;
        p.y += ((p.targetY - p.y) / dToTarget) * move;
        p.walkPhase += dt * 7.5;
      }
    }
  }

  _tryPeepInteractAdjacent(peep, tx, ty) {
    if (peep.cooldownTimer > 0) return false;
    for (let dir = 0; dir < 4; dir++) {
      const nt = this.getTile(tx + DIR_DX[dir], ty + DIR_DY[dir]);
      if (!nt || !nt.rideId) continue;
      const ride = this.rides.find((r) => r.id === nt.rideId);
      if (!ride || ride.status !== "open" || ride.broken) continue;

      if (ride.category === "shop") {
        const def = RIDE_CATALOG[ride.catalogId];
        if (!def) continue;
        if (def.sells === "food" && peep.hunger > 45 && peep.cash >= ride.price) {
          peep.cash -= ride.price;
          peep.hunger = 0;
          peep.hasBurger = true;
          peep.toilet = Math.min(100, peep.toilet + 25);
          this._recordShopSale(ride, peep);
          return true;
        }
        if (def.sells === "drink" && peep.thirst > 45 && peep.cash >= ride.price) {
          peep.cash -= ride.price;
          peep.thirst = 0;
          peep.hasDrink = true;
          peep.toilet = Math.min(100, peep.toilet + 35);
          this._recordShopSale(ride, peep);
          return true;
        }
        if (def.sells === "balloon" && !peep.hasBalloon && peep.cash >= ride.price && Math.random() < 0.35) {
          peep.cash -= ride.price;
          peep.hasBalloon = true;
          peep.happiness = Math.min(100, peep.happiness + 12);
          this._recordShopSale(ride, peep);
          return true;
        }
        if (def.sells === "umbrella_map" && this.weather === "rain" && !peep.hasUmbrella && peep.cash >= ride.price) {
          peep.cash -= ride.price;
          peep.hasUmbrella = true;
          this._recordShopSale(ride, peep);
          return true;
        }
        if (def.sells === "restroom" && peep.toilet > 55 && peep.cash >= ride.price) {
          peep.cash -= ride.price;
          peep.toilet = 0;
          peep.happiness = Math.min(100, peep.happiness + 10);
          this._recordShopSale(ride, peep);
          return true;
        }
        if (def.sells === "first_aid" && peep.nausea > 35) {
          peep.nausea = 0;
          peep.happiness = Math.min(100, peep.happiness + 10);
          peep.cooldownTimer = 8;
          return true;
        }
        if (def.sells === "atm" && peep.cash < 15) {
          peep.cash += 50;
          this._recordShopSale(ride, peep);
          return true;
        }
        continue;
      }

      // Ride boarding
      if (ride.passengers.length < ride.capacity && peep.cash >= ride.price) {
        const intensity = ride.stats?.intensity || 2;
        if (intensity > 9.5 && Math.random() < 0.7) {
          peep.thoughts.unshift(`${ride.name}은 나에게 너무 무서워 보인다.`);
          peep.thoughts = peep.thoughts.slice(0, 6);
          peep.cooldownTimer = 4;
          continue;
        }
        peep.cash -= ride.price;
        this.cash = Math.round((this.cash + ride.price) * 100) / 100;
        ride.totalRiders += 1;
        ride.totalProfit = Math.round((ride.totalProfit + ride.price) * 100) / 100;
        this.monthlyFinances.rideIncome += ride.price;
        peep.state = "riding";
        peep.ridingRideId = ride.id;
        ride.passengers.push(peep);
        this.addFloatingText(ride.x, ride.y, ride.z + 1.5, `+$${ride.price.toFixed(1)}`, "#fde047");
        this.onSfx?.("cash");
        return true;
      }
    }
    return false;
  }

  _recordShopSale(shop, peep) {
    this.cash = Math.round((this.cash + shop.price) * 100) / 100;
    shop.totalRiders += 1;
    shop.totalProfit = Math.round((shop.totalProfit + shop.price) * 100) / 100;
    this.monthlyFinances.shopIncome += shop.price;
    peep.cooldownTimer = 6;
    if (shop.price > 0) {
      this.addFloatingText(shop.x, shop.y, shop.z + 1.4, `+$${shop.price.toFixed(1)}`, "#86efac");
      this.onSfx?.("cash");
    }
  }

  _pickAdjacentPathTile(tx, ty, currentDir) {
    const candidates = [];
    for (let dir = 0; dir < 4; dir++) {
      const nx = tx + DIR_DX[dir];
      const ny = ty + DIR_DY[dir];
      const t = this.getTile(nx, ny);
      if (t && t.path && t.owned) {
        // Slightly prefer continuing straight rather than bouncing back 180 deg
        const isReverse = (dir + 2) % 4 === currentDir;
        candidates.push({ x: nx, y: ny, dir, weight: isReverse ? 1 : 5 });
      }
    }
    if (candidates.length === 0) return null;
    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * totalWeight;
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) return c;
    }
    return candidates[0];
  }

  serialize() {
    const tiles = [];
    for (let y = 0; y < this.mapSize; y++) {
      for (let x = 0; x < this.mapSize; x++) {
        const t = this.grid[y][x];
        tiles.push({
          h: t.height,
          w: t.waterHeight,
          s: t.surface,
          o: t.owned ? 1 : 0,
          p: t.path ? [t.path.type, t.path.isQueue ? 1 : 0] : null,
          pa: t.pathAddition,
          sc: t.scenery ? t.scenery.id : null,
          ri: t.rideId,
          l: t.litter,
          v: t.vomit,
        });
      }
    }

    const rides = this.rides.map((r) => ({
      id: r.id,
      catalogId: r.catalogId,
      category: r.category,
      name: r.name,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      z: r.z,
      status: r.status,
      price: r.price,
      runningCostPerMonth: r.runningCostPerMonth,
      capacity: r.capacity,
      inspectionIntervalMin: r.inspectionIntervalMin,
      reliability: r.reliability,
      broken: r.broken,
      breakdownReason: r.breakdownReason,
      totalRiders: r.totalRiders,
      totalProfit: r.totalProfit,
      stats: r.stats,
      sponsorLabel: r.sponsorLabel,
      track: r.track
        ? {
            origin: r.track.origin,
            mode: r.track.mode,
            pieces: r.track.nodes.map((n) => n.pieceId),
          }
        : null,
    }));

    return JSON.stringify({
      version: 1,
      scenarioId: this.scenarioId,
      parkName: this.parkName,
      cash: this.cash,
      loan: this.loan,
      maxLoan: this.maxLoan,
      parkEntryFee: this.parkEntryFee,
      parkRating: this.parkRating,
      date: this.date,
      weather: this.weather,
      awards: this.awards,
      tiles,
      rides,
      staff: this.staff,
    });
  }

  deserialize(jsonString) {
    try {
      if (typeof jsonString !== "string" || jsonString.length < 10) {
        this.loadScenario("ai_weekly_park");
        return false;
      }
      const data = JSON.parse(jsonString);
      if (
        !data ||
        data.version !== 1 ||
        !Array.isArray(data.tiles) ||
        data.tiles.length !== this.mapSize * this.mapSize ||
        !Number.isFinite(Number(data.cash)) ||
        !Number.isFinite(Number(data.loan))
      ) {
        this.loadScenario("ai_weekly_park");
        return false;
      }

      const preset = SCENARIO_PRESETS[data.scenarioId] || SCENARIO_PRESETS.ai_weekly_park;
      this.scenarioId = preset.id;
      this.parkName = String(data.parkName || preset.name).slice(0, 48);
      this.cash = Number(data.cash);
      this.loan = Number(data.loan);
      this.maxLoan = Number(data.maxLoan || preset.maxLoan);
      this.parkEntryFee = Number(data.parkEntryFee ?? preset.parkEntryFee);
      this.parkRating = Number(data.parkRating ?? 700);
      this.date = data.date && Number.isFinite(data.date.year) ? data.date : { year: 1, month: 3, day: 1, dayProgress: 0 };
      this.weather = data.weather || "sunny";
      this.awards = Array.isArray(data.awards) ? data.awards : [];
      this.entrance = { ...preset.entrance };

      this.grid = [];
      for (let y = 0; y < this.mapSize; y++) {
        const row = [];
        for (let x = 0; x < this.mapSize; x++) {
          const raw = data.tiles[y * this.mapSize + x];
          row.push({
            x,
            y,
            height: Math.max(ISO_METRICS.MIN_HEIGHT, Math.min(ISO_METRICS.MAX_HEIGHT, Number(raw.h) || 2)),
            waterHeight: Number(raw.w) || 0,
            surface: raw.s || preset.terrainTheme,
            owned: Boolean(raw.o),
            path: raw.p ? { type: raw.p[0], isQueue: Boolean(raw.p[1]), mask: 0 } : null,
            pathAddition: raw.pa || null,
            scenery: raw.sc ? { id: raw.sc } : null,
            rideId: raw.ri || null,
            litter: Number(raw.l) || 0,
            vomit: Number(raw.v) || 0,
          });
        }
        this.grid.push(row);
      }

      this.rides = [];
      for (const r of Array.isArray(data.rides) ? data.rides : []) {
        let track = null;
        if (r.track && Array.isArray(r.track.pieces)) {
          track = new CoasterTrack({
            rideCatalogId: r.catalogId,
            originX: r.track.origin.x,
            originY: r.track.origin.y,
            originZ: r.track.origin.z,
            facing: r.track.origin.dir,
            mode: r.track.mode || "circuit",
            name: r.name,
          });
          for (const pId of r.track.pieces) track.appendPiece(pId, { skipCollision: true });
          track.spawnDefaultTrain(3);
          track.onScreamTrigger = () => this.onSfx?.("scream");
        }
        this.rides.push({
          ...r,
          passengers: [],
          cycleTimer: 0,
          animPhase: 0,
          track,
        });
      }

      this.staff = Array.isArray(data.staff) ? data.staff : [];
      this.peeps = [];
      for (let i = 0; i < 18; i++) {
        const spot = this._findNearestPathTile(this.entrance.x, this.entrance.y - 2);
        if (spot) this._spawnGuest(spot.x, spot.y);
      }

      this._recomputeAllPathMasks();
      this._updateParkValuation();
      this.pushNews(`💾 저장된 파크 [${this.parkName}] 불러오기 완료`, "good");
      return true;
    } catch {
      this.loadScenario("ai_weekly_park");
      return false;
    }
  }
}
