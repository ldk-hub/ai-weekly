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
  PEEP_PANTS_COLORS,
  PEEP_HAT_TYPES,
  GUEST_ORIGIN_ROUTES,
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
    this.weather = "sunny"; // "sunny" | "cloudy" | "rain" | "rainbow"
    this.weatherTimer = 45;
    this.entrance = { x: 22, y: 42 };
    this.freeBuildMode = false;
    this.nightMode = false;
    this.lightingMode = "day"; // "day" | "golden" | "night" | "cycle"
    this.dayNightPhase = 0.25;
    this.terrainVersion = 1;
    this.controlledPeepId = null;

    this.rides = [];
    this.peeps = [];
    this.staff = [];
    this.newsFeed = [];
    this.awards = [];
    this.activeCampaigns = [];
    this.floatingTexts = [];
    this.particles = [];
    this.fireworks = [];
    this.perimeterBillboards = [];
    this.supernovaPavilion = null;
    this.championModel = {
      name: "Claude / Gemini Frontier",
      provider: "AI Weekly",
      elo: 1410,
      accent: "#fde047",
    };
    this._newsHeadlines = [];
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
    this.freeBuildMode = Boolean(preset.freeBuildDefault);
    this.nightMode = false;

    this.rides = [];
    this.peeps = [];
    this.staff = [];
    this.newsFeed = [];
    this.awards = [];
    this.activeCampaigns = [];
    this.floatingTexts = [];
    this.particles = [];
    this.fireworks = [];
    this.terrainVersion += 1;
    this.controlledPeepId = null;
    this.monthlyFinances = this._createEmptyFinances();
    this.financeHistory = [];
    this._totalAdmissions = 0;

    if (archiveData) {
      this.syncAiWeeklyData(archiveData);
    }

    this._initGrid(preset.terrainTheme, 2);

    // Outer entrance approach road
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
    } else if (preset.id === "sandbox_canvas") {
      this._buildSandboxPreset();
    } else if (preset.id === "dynamite_dunes") {
      this._buildDynamiteDunesPreset();
    } else {
      this._buildForestFrontiersPreset();
    }

    this.rebuildPerimeterBillboards();
    this._recomputeAllPathMasks();
    this._updateParkValuation();
    this.pushNews(`${preset.name} 시나리오를 시작했습니다! (${preset.objectiveText})`, "good");
  }

  _buildForestFrontiersPreset() {
    for (let y = 26; y <= 41; y++) {
      this._setPathRaw(22, y, "tarmac", false);
    }
    for (let x = 18; x <= 26; x++) {
      this._setPathRaw(x, 26, "crazy", false);
    }
    for (let y = 4; y <= 10; y++) {
      for (let x = 32; x <= 38; x++) {
        const t = this.getTile(x, y);
        if (t) {
          t.height = 1;
          t.waterHeight = 2;
        }
      }
    }
    for (let y = 4; y <= 9; y++) {
      for (let x = 4; x <= 9; x++) {
        const t = this.getTile(x, y);
        if (t) t.height = x === 6 && y === 6 ? 4 : 3;
      }
    }
    for (let x = 3; x <= 40; x += 3) {
      for (let y = 3; y <= 39; y += 4) {
        if (Math.abs(x - 22) <= 5 && y >= 24) continue;
        const t = this.getTile(x, y);
        if (t && t.waterHeight === 0 && !t.path) {
          t.scenery = { id: (x + y) % 3 === 0 ? "tree_oak" : (x + y) % 5 === 0 ? "tree_cherry" : "tree_pine" };
        }
      }
    }
    this._placeSceneryRaw(20, 39, "flowerbed");
    this._placeSceneryRaw(24, 39, "flowerbed");
    this._placeSceneryRaw(22, 24, "fountain");
    this.hireStaff("handyman", 22, 34, { free: true });
    for (let i = 0; i < 12; i++) {
      this._spawnGuest(22, 40 - (i % 6));
    }
  }

  _buildSandboxPreset() {
    // Wide open customizable 44x44 park with clean central plaza and welcoming entrance gardens
    for (let y = 22; y <= 41; y++) {
      this._setPathRaw(21, y, "crazy", false);
      this._setPathRaw(22, y, "crazy", false);
    }
    for (let x = 18; x <= 25; x++) {
      this._setPathRaw(x, 22, "crazy", false);
      this._setPathRaw(x, 23, "crazy", false);
    }
    this._placeSceneryRaw(20, 21, "jumping_fountain");
    this._placeSceneryRaw(23, 21, "jumping_fountain");
    this._placeSceneryRaw(19, 39, "tree_cherry");
    this._placeSceneryRaw(24, 39, "tree_cherry");
    this._placeSceneryRaw(20, 37, "rose_garden");
    this._placeSceneryRaw(23, 37, "rose_garden");
    this._placeSceneryRaw(22, 34, "banner_sign");
    this.hireStaff("handyman", 21, 30, { free: true });
    this.hireStaff("mechanic", 22, 26, { free: true });
    for (let i = 0; i < 16; i++) {
      this._spawnGuest(21 + (i % 2), 40 - (i % 10), i % 4 === 0);
    }
  }

  _buildDynamiteDunesPreset() {
    for (let y = 16; y <= 22; y++) {
      for (let x = 24; x <= 32; x++) {
        const t = this.getTile(x, y);
        if (t) {
          t.height = 1;
          t.waterHeight = 2;
        }
      }
    }
    for (let y = 5; y <= 10; y++) {
      for (let x = 32; x <= 38; x++) {
        const t = this.getTile(x, y);
        if (t) t.height = 4;
      }
    }
    for (let y = 25; y <= 41; y++) this._setPathRaw(22, y, "dirt", false);
    for (let x = 6; x <= 22; x++) this._setPathRaw(x, 25, "dirt", false);
    this._setPathRaw(6, 25, "queue", false);

    this.placeRideOrShop(6, 26, "mine_train", {
      blueprintId: "mine_express",
      free: true,
      initialStatus: "open",
      customName: "사막 협곡 마인 익스프레스",
    });
    this.placeRideOrShop(19, 34, "drink_stall", { free: true, initialStatus: "open" });
    this.placeRideOrShop(24, 34, "burger_bar", { free: true, initialStatus: "open" });
    this.placeRideOrShop(19, 36, "ice_cream_stall", { free: true, initialStatus: "open" });

    const palms = [[23, 16], [33, 18], [33, 22], [23, 23], [16, 36], [28, 36], [5, 14], [12, 12], [18, 30]];
    for (const [px, py] of palms) this._placeSceneryRaw(px, py, "tree_palm");
    this.hireStaff("handyman", 22, 32, { free: true });
    this.hireStaff("mechanic", 20, 26, { free: true });
    for (let i = 0; i < 20; i++) {
      this._spawnGuest(22, 40 - (i % 10));
    }
  }

  _buildAiWeeklyParkPreset() {
    // 1. Multi-tiered scenic ridges & waterfall lake (keeping y=1, x=1, x=42 open for perimeter billboards)
    for (let y = 4; y <= 38; y++) {
      for (let x = 2; x <= 3; x++) {
        const t = this.getTile(x, y);
        if (t) t.height = x === 2 && y >= 6 && y <= 18 ? 4 : 3;
      }
    }
    for (let y = 4; y <= 6; y++) {
      for (let x = 36; x <= 40; x++) {
        const t = this.getTile(x, y);
        if (t) {
          t.height = y <= 5 && x >= 38 ? 5 : 4;
          if (t.height >= 5) t.surface = "rock";
        }
      }
    }
    for (let y = 7; y <= 14; y++) {
      for (let x = 35; x <= 40; x++) {
        const t = this.getTile(x, y);
        if (t) {
          t.height = 1;
          t.waterHeight = 2;
        }
      }
    }
    for (let y = 26; y <= 38; y++) {
      for (let x = 39; x <= 40; x++) {
        const t = this.getTile(x, y);
        if (t) t.height = 3;
      }
    }

    // 2. Grand Promenade & 3 Cross Avenues
    for (let y = 17; y <= 41; y++) {
      this._setPathRaw(21, y, "crazy", false);
      this._setPathRaw(22, y, "crazy", false);
    }
    for (let x = 6; x <= 38; x++) this._setPathRaw(x, 17, "tarmac", false);
    for (let x = 6; x <= 38; x++) this._setPathRaw(x, 24, "tarmac", false);
    for (let x = 6; x <= 38; x++) this._setPathRaw(x, 33, "tarmac", false);

    // Lakeside wooden pier bridge
    for (let x = 35; x <= 40; x++) this._setPathRaw(x, 11, "dirt", false);
    for (let y = 11; y <= 17; y++) this._setPathRaw(35, y, "dirt", false);

    // Top Coaster Trio access paths
    for (let y = 5; y <= 17; y++) this._setPathRaw(4, y, "tarmac", false);
    for (let x = 4; x <= 8; x++) this._setPathRaw(x, 5, "tarmac", false);
    this._setPathRaw(6, 5, "queue", false);

    for (let y = 5; y <= 17; y++) this._setPathRaw(17, y, "tarmac", false);
    for (let x = 17; x <= 22; x++) this._setPathRaw(x, 5, "tarmac", false);
    this._setPathRaw(18, 5, "queue", false);

    for (let y = 7; y <= 17; y++) this._setPathRaw(24, y, "tarmac", false);
    for (let x = 24; x <= 28; x++) this._setPathRaw(x, 7, "tarmac", false);
    this._setPathRaw(26, 7, "queue", false);

    // Mid-Park Ride Queues (y=22..23 connecting to y=24 Avenue)
    for (const qx of [6, 9, 12, 15, 18, 24, 27, 30, 33, 36]) {
      this._setPathRaw(qx, 22, "queue", false);
      this._setPathRaw(qx, 23, "queue", false);
    }

    // Southern Coasters & Water/Kart Queues
    this._setPathRaw(6, 25, "queue", false);
    this._setPathRaw(24, 25, "queue", false);
    for (const qx of [7, 11, 15, 25, 29]) {
      this._setPathRaw(qx, 34, "queue", false);
    }

    // Streetlamps, benches, bins along avenues
    for (const lx of [8, 14, 20, 26, 32, 37]) {
      const t = this.getTile(lx, 24);
      if (t?.path) t.pathAddition = lx % 3 === 0 ? "bench" : lx % 2 === 0 ? "lamp" : "bin";
    }
    for (const ly of [39, 36, 30, 27, 20]) {
      const t = this.getTile(21, ly);
      if (t?.path) t.pathAddition = ly % 2 === 0 ? "lamp" : "bin";
      const t2 = this.getTile(22, ly);
      if (t2?.path) t2.pathAddition = ly === 36 ? "bench" : "lamp";
    }

    // 3. All 5 Coasters + 15 Diverse Rides + 8 Shops
    this.placeRideOrShop(6, 6, "steel_looping", {
      blueprintId: "cyber_looper", free: true, initialStatus: "open", customName: "더블 루프 사이버 코스터",
    });
    this.placeRideOrShop(18, 6, "inverted_coaster", {
      blueprintId: "neon_invert", free: true, initialStatus: "open", customName: "네온 인버티드 비행 코스터",
    });
    this.placeRideOrShop(26, 8, "hyper_coaster", {
      blueprintId: "giga_hyper", free: true, initialStatus: "open", customName: "기가 하이퍼 메가 코스터",
    });
    this.placeRideOrShop(6, 26, "mine_train", {
      blueprintId: "mine_express", free: true, initialStatus: "open", customName: "협곡 마인 익스프레스",
    });
    this.placeRideOrShop(24, 26, "wooden_coaster", {
      blueprintId: "titan_woodie", free: true, initialStatus: "open", customName: "타이탄 우드 코스터",
    });

    // Mid-Park 2x2 Flat & Thrill Rides
    this.placeRideOrShop(6, 20, "merry_go_round", { free: true, initialStatus: "open" });
    this.placeRideOrShop(9, 20, "pirate_ship", { free: true, initialStatus: "open" });
    this.placeRideOrShop(12, 20, "ferris_wheel", { free: true, initialStatus: "open" });
    this.placeRideOrShop(15, 20, "haunted_house", { free: true, initialStatus: "open" });
    this.placeRideOrShop(18, 20, "spiral_slide", { free: true, initialStatus: "open" });
    this.placeRideOrShop(24, 20, "launched_freefall", { free: true, initialStatus: "open" });
    this.placeRideOrShop(27, 20, "enterprise_wheel", { free: true, initialStatus: "open" });
    this.placeRideOrShop(30, 20, "top_spin", { free: true, initialStatus: "open" });
    this.placeRideOrShop(33, 20, "roto_drop", { free: true, initialStatus: "open" });
    this.placeRideOrShop(36, 20, "observation_tower", { free: true, initialStatus: "open" });

    // Lower Park Water & Kart Rides
    this.placeRideOrShop(7, 35, "go_karts", { free: true, initialStatus: "open" });
    this.placeRideOrShop(11, 35, "spinning_teacups", { free: true, initialStatus: "open" });
    this.placeRideOrShop(15, 35, "bumper_boats", { free: true, initialStatus: "open" });
    this.placeRideOrShop(25, 35, "log_flume", { free: true, initialStatus: "open" });
    this.placeRideOrShop(29, 35, "river_rapids", { free: true, initialStatus: "open" });

    // All 8 Shops
    this.placeRideOrShop(14, 25, "burger_bar", { free: true, initialStatus: "open" });
    this.placeRideOrShop(16, 25, "drink_stall", { free: true, initialStatus: "open" });
    this.placeRideOrShop(18, 25, "ice_cream_stall", { free: true, initialStatus: "open" });
    this.placeRideOrShop(20, 25, "balloon_stall", { free: true, initialStatus: "open" });
    this.placeRideOrShop(15, 32, "restroom", { free: true, initialStatus: "open" });
    this.placeRideOrShop(17, 32, "first_aid", { free: true, initialStatus: "open" });
    this.placeRideOrShop(19, 40, "info_kiosk", { free: true, initialStatus: "open" });
    this.placeRideOrShop(24, 40, "atm", { free: true, initialStatus: "open" });

    // 4. Gardens, Fountains, Cherry Blossoms, Castles, Fireworks & Mascots
    this._placeSceneryRaw(20, 35, "ai_billboard");
    this._placeSceneryRaw(23, 35, "statue_mascot");
    this._placeSceneryRaw(20, 28, "jumping_fountain");
    this._placeSceneryRaw(23, 28, "jumping_fountain");
    this._placeSceneryRaw(20, 19, "fountain");
    this._placeSceneryRaw(23, 19, "fountain");
    this._placeSceneryRaw(20, 38, "firework_launcher");
    this._placeSceneryRaw(23, 38, "firework_launcher");
    this._placeSceneryRaw(19, 31, "castle_tower");
    this._placeSceneryRaw(24, 31, "castle_tower");
    this._placeSceneryRaw(20, 34, "neon_arch");
    this._placeSceneryRaw(23, 34, "neon_arch");

    for (const [tx, ty, sid] of [
      [2, 5, "tree_pine"], [2, 9, "tree_oak"], [2, 13, "tree_cherry"], [2, 17, "tree_pine"],
      [2, 22, "tree_oak"], [2, 27, "tree_cherry"], [2, 32, "tree_pine"], [2, 36, "tree_oak"],
      [3, 7, "tree_cherry"], [3, 15, "tree_pine"], [3, 25, "tree_oak"], [3, 34, "tree_cherry"],
      [35, 4, "statue_sawyer"], [34, 10, "rock_boulder"], [34, 13, "tree_cherry"],
      [39, 27, "tree_pine"], [39, 31, "tree_oak"], [39, 35, "tree_cherry"],
      [19, 37, "rose_garden"], [24, 37, "rose_garden"], [19, 39, "topiary_heart"], [24, 39, "topiary_heart"],
      [18, 22, "flowerbed"], [25, 22, "flowerbed"], [13, 18, "rose_garden"], [29, 18, "rose_garden"],
    ]) {
      this._placeSceneryRaw(tx, ty, sid);
    }

    // 5. Staff (including 2 mechanics near central hub for quick breakdown response)
    this.hireStaff("handyman", 21, 30, { free: true });
    this.hireStaff("handyman", 15, 24, { free: true });
    this.hireStaff("handyman", 30, 24, { free: true });
    this.hireStaff("mechanic", 21, 22, { free: true });
    this.hireStaff("mechanic", 12, 24, { free: true });
    this.hireStaff("entertainer", 21, 35, { free: true });
    this.hireStaff("guard", 22, 38, { free: true });

    // 6. Guests
    const walkSpots = [
      [21, 39], [22, 37], [21, 33], [14, 33], [28, 33], [21, 24], [10, 24], [16, 24],
      [28, 24], [34, 24], [21, 17], [10, 17], [17, 17], [24, 17], [37, 11], [39, 11],
      [4, 10], [6, 5], [18, 5], [26, 7],
    ];
    for (let i = 0; i < 48; i++) {
      const [gx, gy] = walkSpots[i % walkSpots.length];
      this._spawnGuest(gx, gy, i % 7 === 0);
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
    if (this.freeBuildMode) {
      this.cash = Math.max(this.cash, 99999);
      return true;
    }
    if (this.cash < amount) return false;
    this.cash = Math.round((this.cash - amount) * 100) / 100;
    this.monthlyFinances.constructionCost += amount;
    return true;
  }

  toggleFreeBuildMode(forceValue = null) {
    this.freeBuildMode = forceValue === null ? !this.freeBuildMode : Boolean(forceValue);
    if (this.freeBuildMode && this.cash < 99999) {
      this.cash = 99999;
    }
    this.pushNews(
      this.freeBuildMode
        ? "♾️ 자유 꾸미기 샌드박스 모드 ON — 자금 무제한으로 자유롭게 건설·꾸미기가 가능합니다!"
        : "💰 일반 타이쿤 경영 모드로 복귀했습니다.",
      "info"
    );
    this.onSfx?.("click");
    return this.freeBuildMode;
  }

  paintSurface(tileX, tileY, surfaceType = "grass") {
    if (!["grass", "sand", "dirt", "rock"].includes(surfaceType)) {
      return { ok: false, reason: "지원하지 않는 지면 재질입니다" };
    }
    if (!this._isOwnedBuildable(tileX, tileY)) {
      return { ok: false, reason: "공원 소유 영역 밖입니다" };
    }
    const t = this.getTile(tileX, tileY);
    if (t.surface === surfaceType) return { ok: true, reason: "이미 동일한 지면입니다" };
    if (!this._spend(5)) return { ok: false, reason: "현금이 부족합니다 ($5 필요)" };
    t.surface = surfaceType;
    this.terrainVersion += 1;
    this.onSfx?.("place");
    return { ok: true, reason: `${surfaceType} 지면 페인트 완료` };
  }

  setLightingMode(mode = "day") {
    const allowed = ["day", "golden", "night", "cycle"];
    this.lightingMode = allowed.includes(mode) ? mode : "day";
    if (this.lightingMode === "day") this.dayNightPhase = 0.25;
    else if (this.lightingMode === "golden") this.dayNightPhase = 0.56;
    else if (this.lightingMode === "night") this.dayNightPhase = 0.8;
    this.nightMode = this.lightingMode === "night" || (this.lightingMode === "cycle" && this.dayNightPhase >= 0.65);
    return this.lightingMode;
  }

  cycleLightingMode() {
    const order = ["day", "golden", "night", "cycle"];
    const next = order[(order.indexOf(this.lightingMode) + 1) % order.length];
    return this.setLightingMode(next);
  }

  setWeather(nextWeather) {
    const allowed = ["sunny", "cloudy", "rain", "rainbow"];
    if (!allowed.includes(nextWeather)) return this.weather;
    this.weather = nextWeather;
    if (nextWeather === "rain") {
      for (const p of this.peeps) {
        if (!p.hasUmbrella && Math.random() < 0.78) p.hasUmbrella = true;
      }
      this.pushNews("🌧️ 소나기가 내립니다! 관람객들이 형형색색 우산을 펼쳤습니다.", "info");
    } else if (nextWeather === "rainbow") {
      this.pushNews("🌈 비가 그치고 공원 하늘에 무지개가 떠올랐습니다! 관람객 행복도 상승!", "good");
      for (const p of this.peeps) {
        p.happiness = Math.min(100, p.happiness + 12);
      }
      this.spawnParticleBatch("confetti", 22, 24, 5, 24);
    }
    return this.weather;
  }

  spawnParticleBatch(kind, tileX, tileY, heightZ = 3, count = 12, color = null, text = null) {
    const palette = color ? [color] : ["#fde047", "#38bdf8", "#f472b6", "#4ade80", "#fb923c"];
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = kind === "dust" ? 0.5 + Math.random() * 0.7 : 0.7 + Math.random() * 1.1;
      this.particles.push({
        kind,
        x: tileX + (Math.random() - 0.5) * 0.4,
        y: tileY + (Math.random() - 0.5) * 0.4,
        z: heightZ,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.6,
        vz: kind === "confetti" ? 0.9 + Math.random() * 0.8 : 0.4 + Math.random() * 0.5,
        color: palette[i % palette.length],
        text: i === 0 ? text : null,
        life: kind === "emote" ? 1.8 : 0.85 + Math.random() * 0.5,
        maxLife: kind === "emote" ? 1.8 : 1.2,
      });
    }
    if (this.particles.length > 240) this.particles.splice(0, this.particles.length - 240);
  }

  spawnMultiplayerFinaleFireworks() {
    for (const [fx, fy] of [[18, 22], [26, 22], [22, 16], [16, 28], [28, 28]]) {
      this.launchFireworksAt(fx, fy);
    }
    this.pushNews("🎆 멀티플레이 협동 피날레 불꽃놀이가 밤하늘을 수놓습니다!", "good");
  }

  syncPeerAvatar(peer, isNew = false) {
    if (!peer?.clientId) return null;
    let avatar = this.peeps.find((p) => p.peerClientId === peer.clientId);
    if (!avatar) {
      const near = this._findNearestPathTile(22 + Math.round((Math.random() - 0.5) * 6), 24);
      const sx = near?.x ?? this.entrance.x;
      const sy = near?.y ?? Math.max(1, this.entrance.y - 1);
      avatar = this._spawnGuest(sx, sy, true, {
        originRouteId: "radio",
        name: peer.nickname,
      });
      if (!avatar) return null;
      avatar.peerClientId = peer.clientId;
      avatar.hatType = "crown";
      avatar.isVipPeer = true;
      avatar.speechBubble = `${peer.nickname} 입장!`;
      avatar.speechTimer = 3.5;
      if (isNew) {
        this.pushNews(`👑 [VIP 접속] ${peer.nickname} 님이 공원 중앙 광장에 나타났습니다!`, "good");
      }
    } else if (peer.nickname && avatar.name !== peer.nickname) {
      avatar.name = peer.nickname;
    }
    return avatar;
  }

  triggerPeerChatBubble(clientId, text, fallbackNick = null) {
    let target = clientId ? this.peeps.find((p) => p.peerClientId === clientId) : this.getControlledPeep();
    if (!target && fallbackNick) {
      target = this.peeps.find((p) => p.name === fallbackNick);
    }
    if (!target) {
      target = this.peeps.find((p) => p.isVipPeer) || this.peeps[0];
    }
    if (target) {
      target.speechBubble = String(text || "").trim().slice(0, 40);
      target.speechTimer = 4.2;
    }
    return target;
  }

  triggerPeerEmote(clientId, emoji = "🎉") {
    const target = clientId ? this.peeps.find((p) => p.peerClientId === clientId) : (this.getControlledPeep() || this.peeps[0]);
    if (!target) return null;
    const t = this.getTile(Math.round(target.x), Math.round(target.y));
    const hz = (t?.height || 2) + 1.5;
    target.speechBubble = emoji;
    target.speechTimer = 2.8;
    this.addFloatingText(target.x, target.y, hz, emoji, "#fde047");
    this.spawnParticleBatch("confetti", target.x, target.y, hz, 12);
    return target;
  }

  removePeerAvatar(clientId) {
    const idx = this.peeps.findIndex((p) => p.peerClientId === clientId);
    if (idx >= 0) {
      const removed = this.peeps[idx];
      if (this.controlledPeepId === removed.id) this.controlledPeepId = null;
      this.peeps.splice(idx, 1);
    }
  }

  customizeRide(rideId, { name, colorPrimary, colorTrack } = {}) {
    const ride = this.rides.find((r) => r.id === rideId);
    if (!ride) return { ok: false, reason: "놀이기구를 찾을 수 없습니다" };
    if (name && String(name).trim()) {
      ride.name = String(name).trim().slice(0, 36);
      if (ride.track) ride.track.name = ride.name;
    }
    if (colorPrimary) {
      ride.colorPrimary = colorPrimary;
      if (ride.track) ride.track.colorPrimary = colorPrimary;
    }
    if (colorTrack) {
      ride.colorTrack = colorTrack;
      if (ride.track) ride.track.colorTrack = colorTrack;
    }
    this.onSfx?.("click");
    return { ok: true };
  }

  launchFireworksAt(tileX, tileY) {
    const t = this.getTile(tileX, tileY);
    const hz = (t?.height || 2) + 4.2;
    const palette = ["#facc15", "#ef4444", "#38bdf8", "#a855f7", "#4ade80", "#f472b6"];
    const baseCol = palette[Math.floor(Math.random() * palette.length)];
    for (let i = 0; i < 18; i++) {
      const ang = (i / 18) * Math.PI * 2;
      const spd = 0.6 + Math.random() * 0.9;
      this.fireworks.push({
        x: tileX,
        y: tileY,
        z: hz,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd * 0.6,
        vz: 0.6 + Math.random() * 0.9,
        color: i % 2 === 0 ? baseCol : "#ffffff",
        life: 1.2 + Math.random() * 0.5,
        maxLife: 1.5,
      });
    }
    if (this.fireworks.length > 180) this.fireworks.splice(0, this.fireworks.length - 180);
    this.onSfx?.("pop");
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
    this.terrainVersion += 1;
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
      this.terrainVersion += 1;
      this.onSfx?.("place");
      return { ok: true, cost, reason: "물 배수 완료" };
    }
    if (!this._spend(cost)) return { ok: false, cost: 0, reason: "현금이 부족합니다 ($25 필요)" };
    t.waterHeight = Math.min(ISO_METRICS.MAX_HEIGHT, targetHeight);
    this.terrainVersion += 1;
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
    this.terrainVersion += 1;
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
      ride.placeBounce = options.free ? 0 : 1.0;
      this.rebuildPerimeterBillboards();
      this._recomputeAllPathMasks();
      this._updateParkValuation();
      if (!options.free) {
        this.spawnParticleBatch("dust", tileX, tileY, originZ + 0.5, 14, "#cbd5e1");
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
    ride.placeBounce = options.free ? 0 : 1.0;
    this._recomputeAllPathMasks();
    this._updateParkValuation();
    if (!options.free) {
      this.spawnParticleBatch("dust", tileX + w * 0.5, tileY + h * 0.5, baseZ + 0.5, 12, "#fde047");
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
    if (!this.freeBuildMode && this.cash < pieceCost) {
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
    if (!this.freeBuildMode) {
      this.cash = Math.max(0, this.cash - cost);
    }
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
    this.terrainVersion += 1;
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
    this.rebuildPerimeterBillboards();

    // Supernova 200+ weekly star spike pavilion near main plaza (22, 23)
    const rankedPlugins = [...this.aiArchive.plugins].sort(
      (a, b) => Number(b.velocity_7d || b.weeklyDelta || 0) - Number(a.velocity_7d || a.weeklyDelta || 0)
    );
    const starHero = rankedPlugins[0];
    if (starHero) {
      const repoSlug = starHero.repo || (starHero.repo_url ? String(starHero.repo_url).replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "") : starHero.name);
      const stars = Number(starHero.stars || starHero.totalStars || 0);
      const delta = Number(starHero.velocity_7d || starHero.weeklyDelta || 0);
      this.supernovaPavilion = {
        tileX: 22,
        tileY: 23,
        name: starHero.name || repoSlug || "Supernova AI Tool",
        repo: repoSlug || "ai-weekly/tool",
        stars,
        weeklyDelta: delta,
        isSupernova: delta >= 200 || stars >= 5000,
        summary: starHero.summary_ko || starHero.title_ko || starHero.catchphrase || "이번 주 급상승 초신성 오픈소스 AI 도구입니다.",
        installCmd: repoSlug && repoSlug.includes("/") ? `git clone https://github.com/${repoSlug}.git` : `npx skills add ${starHero.name}`,
        url: starHero.official_url || starHero.repo_url || "starboard",
      };
    }

    // Benchmark #1 Arena Accent Theme
    const champ = this.aiArchive.benchmarks[0];
    if (champ) {
      const prov = String(champ.provider || champ.org || "").toLowerCase();
      let accent = "#fde047";
      if (prov.includes("anthropic") || prov.includes("claude")) accent = "#f97316";
      else if (prov.includes("google") || prov.includes("gemini")) accent = "#38bdf8";
      else if (prov.includes("openai")) accent = "#10b981";
      else if (prov.includes("deepseek") || prov.includes("meta")) accent = "#60a5fa";
      this.championModel = {
        name: champ.model || "Frontier #1",
        provider: champ.provider || champ.org || "Leaderboard",
        elo: champ.arena_coding_elo || champ.arena_elo || champ.elo || "—",
        accent,
      };
    }

    // Headlines pool for guest speech bubbles
    this._newsHeadlines = [
      ...this.aiArchive.news.slice(0, 8).map((n) => `📰 "${String(n.title_ko || n.headline || "").slice(0, 26)}" 봤어?`),
      ...rankedPlugins.slice(0, 4).map((p) => `⭐ ${p.name} 이번 주 대박이네!`),
    ].filter(Boolean);

    const topNews = this.aiArchive.news[0];
    if (topNews) {
      this.pushNews(`📡 [AI위클리 특보] ${topNews.title_ko || topNews.headline}`, "info");
    }
  }

  rebuildPerimeterBillboards() {
    const slots = [];
    // North edge (y = 1): 9 mega-billboards
    for (const x of [5, 9, 13, 17, 21, 25, 29, 33, 37]) slots.push({ tileX: x, tileY: 1, edge: "N" });
    // West edge (x = 1): 7 mega-billboards
    for (const y of [6, 11, 16, 21, 26, 31, 36]) slots.push({ tileX: 1, tileY: y, edge: "W" });
    // East edge (x = 42): 8 mega-billboards
    for (const y of [6, 11, 16, 21, 26, 31, 36, 40]) slots.push({ tileX: 42, tileY: y, edge: "E" });

    const plugins = this.aiArchive.plugins || [];
    const news = this.aiArchive.news || [];
    const social = this.aiArchive.social || [];
    const benchmarks = this.aiArchive.benchmarks || [];

    const fallbacks = {
      plugins: [
        { name: "superpowers", title_ko: "에이전트 TDD·플래닝 핵심 워크플로우", stars: 18400, velocity_7d: 920, category: "workflow", summary_ko: "체계적 설계·브레인스토밍·검증 게이트 스킬 팩", official_url: "./" },
        { name: "career-copilot-kr", title_ko: "한국 시니어 백엔드 커리어 코파일럿", stars: 3420, velocity_7d: 410, category: "career", summary_ko: "채용공고 분석·이력서 맞춤 최적화 자동화", official_url: "./" },
      ],
      news: [
        { title_ko: "프론티어 코딩 모델 에이전트 벤치마크 신기록 경신", category_name: "모델 릴리스", importance: 94, summary_ko: "최신 프론티어 모델들의 추론 및 코드 생성 성능 대폭 향상", tags: ["LLM", "Coding"], url: "news" },
        { title_ko: "오픈소스 AI 에이전트 하네스 생태계 주간 동향", category_name: "개발자 도구", importance: 88, summary_ko: "MCP 서버와 샌드박스 도구 연동 표준화 가속", tags: ["MCP", "Agent"], url: "news" },
      ],
      social: [
        { author: "@ai_builder", title_ko: "클로드 코드 + 서브에이전트 병렬 실행 팁 요약", platform: "X", summary_ko: "컨텍스트 오염 없이 리팩토링을 끝내는 실전 팁", url: "social" },
        { author: "@dev_curator", title_ko: "로컬 에이전트 워크플로우 생산성 3배 루틴", platform: "Threads", summary_ko: "자동 검증 루프와 슬래시 커맨드 결합 사례", url: "social" },
      ],
      benchmarks: [
        { model: "Claude 4.5 / Opus Tier", provider: "Anthropic", arena_coding_elo: 1410, share_pct: 28.4 },
        { model: "Gemini 4 Argon", provider: "Google", arena_coding_elo: 1395, share_pct: 26.1 },
      ],
    };

    const pickFeed = (list, fb, idx) => (list.length > 0 ? list[idx % list.length] : fb[idx % fb.length]);

    let pIdx = 0;
    let nIdx = 0;
    let sIdx = 0;
    let bIdx = 0;

    this.perimeterBillboards = slots.map((slot, i) => {
      if (slot.edge === "N" && i % 2 === 0) {
        const it = pickFeed(plugins, fallbacks.plugins, pIdx++);
        return {
          id: `bb-${i}`,
          ...slot,
          category: "plugins",
          badge: "인기 플러그인",
          accent: "#fbbf24",
          title: it.name || it.title_ko || "인기 플러그인",
          subtitle: it.title_ko || it.catchphrase || "",
          summary: it.summary_ko || it.catchphrase || "GitHub 및 커뮤니티 급상승 플러그인 정보입니다.",
          metric: `★ ${Number(it.stars || 0).toLocaleString()} (+${Number(it.velocity_7d || 0).toLocaleString()})`,
          tags: [it.category || "plugin", ...(it.sources || []).slice(0, 2)],
          url: it.official_url || it.repo_url || "./",
        };
      }
      if (slot.edge === "N" || (slot.edge === "E" && bIdx >= 4)) {
        const it = pickFeed(news, fallbacks.news, nIdx++);
        return {
          id: `bb-${i}`,
          ...slot,
          category: "news",
          badge: "AI 뉴스",
          accent: "#38bdf8",
          title: it.title_ko || it.headline || "AI 위클리 뉴스",
          subtitle: `${it.category_name || "AI 기술 신호"} · 중요도 ${it.importance ?? 85}`,
          summary: String(it.body_ko || it.summary_ko || "").replace(/\*\*/g, ""),
          metric: `중요도 ${it.importance ?? 85}`,
          tags: Array.isArray(it.tags) ? it.tags : ["AI News"],
          url: it.url || "news",
        };
      }
      if (slot.edge === "W") {
        const it = pickFeed(social, fallbacks.social, sIdx++);
        return {
          id: `bb-${i}`,
          ...slot,
          category: "social",
          badge: "소셜 피드",
          accent: "#f472b6",
          title: it.title_ko || `${it.author || "크리에이터"} 포스트`,
          subtitle: `${it.author || "커뮤니티"} · ${it.platform || "Social"}`,
          summary: it.summary_ko || it.body_ko || it.title_ko || "실시간 AI 인플루언서 인사이트 요약입니다.",
          metric: it.platform || "Social",
          tags: Array.isArray(it.tags) ? it.tags : [it.platform || "Social"],
          url: it.url || "social",
        };
      }
      const it = pickFeed(benchmarks, fallbacks.benchmarks, bIdx++);
      return {
        id: `bb-${i}`,
        ...slot,
        category: "benchmarks",
        badge: "점유율·성능",
        accent: "#34d399",
        title: it.model || "Frontier LLM",
        subtitle: `${it.provider || "AI Lab"} · 점유율·성능 지표`,
        summary: `코딩 Elo ${it.arena_coding_elo || it.arena_elo || "—"} · SWE/추론 리더보드 프론티어 모델 성능 데이터`,
        metric: `Elo ${it.arena_coding_elo || it.arena_elo || "—"}`,
        tags: [it.provider || "Benchmark"],
        url: "benchmarks",
      };
    });
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

  _spawnGuest(spawnX = null, spawnY = null, vip = false, routeOptions = null) {
    if (this.peeps.length >= 160) return null;
    const x = spawnX ?? this.entrance.x;
    const y = spawnY ?? Math.max(1, this.entrance.y - 1);
    const first = PEEP_FIRST_NAMES[Math.floor(Math.random() * PEEP_FIRST_NAMES.length)];
    const last = PEEP_LAST_NAMES[Math.floor(Math.random() * PEEP_LAST_NAMES.length)];
    const balloonColors = ["#ef4444", "#3b82f6", "#eab308", "#ec4899", "#22c55e"];
    const skinTones = ["#fed7aa", "#f5d0a9", "#fde68a", "#e5b887"];

    const extRouteKeys = ["plugins", "news", "social", "starboard", "benchmarks", "github"];
    const routeKey =
      routeOptions?.originRouteId ||
      (vip
        ? "radio"
        : this._totalAdmissions % 3 !== 0
          ? extRouteKeys[this._totalAdmissions % extRouteKeys.length]
          : "direct");
    const route = GUEST_ORIGIN_ROUTES[routeKey] || GUEST_ORIGIN_ROUTES.direct;
    const hatType = vip
      ? "crown"
      : route.isExternal && this._totalAdmissions % 2 === 0
        ? PEEP_HAT_TYPES[1 + (this._totalAdmissions % (PEEP_HAT_TYPES.length - 1))]
        : Math.random() < 0.35
          ? PEEP_HAT_TYPES[1 + Math.floor(Math.random() * 3)]
          : "none";

    const peep = {
      id: nextUid("peep"),
      name: routeOptions?.name || `${last}${first}`,
      shirtColor: PEEP_SHIRT_COLORS[Math.floor(Math.random() * PEEP_SHIRT_COLORS.length)],
      pantsColor: PEEP_PANTS_COLORS[Math.floor(Math.random() * PEEP_PANTS_COLORS.length)],
      skinTone: skinTones[Math.floor(Math.random() * skinTones.length)],
      hatType,
      hatColor: route.isExternal ? route.accent : balloonColors[Math.floor(Math.random() * balloonColors.length)],
      backpackColor: route.isExternal ? route.accent : Math.random() < 0.35 ? "#475569" : null,
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
      hasUmbrella: Math.random() < 0.72,
      umbrellaColor: ["#ef4444", "#3b82f6", "#facc15", "#ec4899", "#22c55e", "#a855f7"][Math.floor(Math.random() * 6)],
      hasBurger: false,
      hasDrink: false,
      hasIceCream: false,
      hasMap: Boolean(route.isExternal),
      speechBubble: null,
      speechTimer: 0,
      state: "walking", // "walking" | "riding" | "sitting" | "leaving"
      ridingRideId: null,
      rideTimer: 0,
      sitTimer: 0,
      cooldownTimer: 0,
      originRouteId: route.id,
      originLabel: route.label,
      originBadge: route.badge,
      originColor: route.accent,
      isExternalRoute: Boolean(route.isExternal),
      manualPathQueue: [],
      thoughts: route.isExternal
        ? [`${route.label} 경로에서 놀러 왔다!`, "어떤 놀이기구부터 직접 타볼까?"]
        : ["여기에 오니 정말 신난다!", "어떤 롤러코스터부터 타볼까?"],
      ridesRidden: 0,
      isVipPeer: vip,
    };
    this.peeps.push(peep);
    this._totalAdmissions++;
    return peep;
  }

  spawnExternalRouteGuest(originRouteId = "news", customName = null, autoControl = false) {
    const spot = this._findNearestPathTile(this.entrance.x, Math.max(2, this.entrance.y - 2)) || {
      x: this.entrance.x,
      y: this.entrance.y,
    };
    const peep = this._spawnGuest(spot.x, spot.y, originRouteId === "radio", {
      originRouteId,
      name: customName,
    });
    if (!peep) return null;
    this.pushNews(`${peep.originBadge} 경로에서 손님 '${peep.name}' 님이 입장했습니다!`, "good");
    if (autoControl) this.setControlledPeep(peep.id);
    return peep;
  }

  getControlledPeep() {
    if (!this.controlledPeepId) return null;
    return this.peeps.find((p) => p.id === this.controlledPeepId) || null;
  }

  setControlledPeep(peepId) {
    if (!peepId) {
      this.controlledPeepId = null;
      return null;
    }
    const p = this.peeps.find((item) => item.id === peepId);
    if (!p) {
      this.controlledPeepId = null;
      return null;
    }
    this.controlledPeepId = p.id;
    if (p.state === "sitting") p.state = "walking";
    p.manualPathQueue = [];
    if (!p.thoughts[0]?.includes("직접 조작")) {
      p.thoughts.unshift("🕹 내가 직접 공원을 걸어다니는 중!");
      p.thoughts = p.thoughts.slice(0, 6);
    }
    return p;
  }

  cycleControlledExternalPeep() {
    const ext = this.peeps.filter((p) => p.isExternalRoute);
    if (ext.length === 0) {
      return this.spawnExternalRouteGuest("news", null, true);
    }
    const curIdx = ext.findIndex((p) => p.id === this.controlledPeepId);
    const next = ext[(curIdx + 1) % ext.length];
    return this.setControlledPeep(next.id);
  }

  _disembarkControlledPeep(p) {
    if (!p || p.state !== "riding") return;
    const ride = this.rides.find((r) => r.id === p.ridingRideId);
    if (ride) {
      ride.passengers = ride.passengers.filter((item) => item.id !== p.id);
    }
    const near = this._findNearestPathTile(Math.round(p.x), Math.round(p.y));
    if (near) {
      p.x = near.x;
      p.y = near.y;
      p.targetX = near.x;
      p.targetY = near.y;
    }
    p.state = "walking";
    p.ridingRideId = null;
    p.rideTimer = 0;
  }

  moveControlledPeepByDir(worldDir) {
    const p = this.getControlledPeep();
    if (!p) return { ok: false, reason: "조작 중인 손님이 없습니다." };
    if (p.state === "riding") {
      this._disembarkControlledPeep(p);
    }
    const curX = Math.round(p.x);
    const curY = Math.round(p.y);
    const curTile = this.getTile(curX, curY);
    const nx = curX + DIR_DX[worldDir];
    const ny = curY + DIR_DY[worldDir];
    const nt = this.getTile(nx, ny);
    p.facing = worldDir;
    p.state = "walking";

    if (!nt || !nt.owned) {
      return { ok: false, reason: "공원 경계 바깥입니다." };
    }
    if (nt.rideId) {
      return this.interactControlledPeepWithAdjacent();
    }
    if (nt.scenery) {
      if (nt.scenery.id === "firework_launcher") {
        this.launchFireworksAt(nx, ny);
        return { ok: true, kind: "firework" };
      }
      return { ok: false, reason: "조형물이 길을 막고 있습니다." };
    }
    if (nt.waterHeight > nt.height && !nt.path) {
      return { ok: false, reason: "물 위로는 걸을 수 없습니다." };
    }
    if (Math.abs(nt.height - (curTile?.height || 2)) > 1 && !nt.path) {
      return { ok: false, reason: "절벽이 너무 가파릅니다." };
    }

    p.targetX = nx;
    p.targetY = ny;
    p.manualPathQueue = [];
    return { ok: true, x: nx, y: ny };
  }

  walkControlledPeepToTile(destX, destY) {
    const p = this.getControlledPeep();
    if (!p) return { ok: false };
    if (p.state === "riding") this._disembarkControlledPeep(p);
    const startX = Math.round(p.x);
    const startY = Math.round(p.y);
    if (startX === destX && startY === destY) return { ok: true };

    const isWalkable = (tx, ty) => {
      const t = this.getTile(tx, ty);
      return Boolean(
        t &&
          t.owned &&
          (!t.waterHeight || t.waterHeight <= t.height || t.path) &&
          !t.rideId &&
          !t.scenery
      );
    };

    const destTile = this.getTile(destX, destY);
    if (!destTile || !destTile.owned) return { ok: false };

    const queue = [[startX, startY]];
    const parent = new Map();
    const startKey = `${startX},${startY}`;
    parent.set(startKey, null);
    let foundKey = null;
    let steps = 0;

    while (queue.length > 0 && steps < 900) {
      steps++;
      const [cx, cy] = queue.shift();
      const cTile = this.getTile(cx, cy);
      if (cx === destX && cy === destY) {
        foundKey = `${cx},${cy}`;
        break;
      }
      // If destination is a ride/scenery, stop right beside it
      if ((destTile.rideId || destTile.scenery) && Math.abs(cx - destX) + Math.abs(cy - destY) === 1) {
        foundKey = `${cx},${cy}`;
        break;
      }
      for (let dir = 0; dir < 4; dir++) {
        const nx = cx + DIR_DX[dir];
        const ny = cy + DIR_DY[dir];
        const key = `${nx},${ny}`;
        if (parent.has(key)) continue;
        if (!isWalkable(nx, ny)) continue;
        const nt = this.getTile(nx, ny);
        if (Math.abs(nt.height - (cTile?.height || 2)) > 1 && !nt.path) continue;
        parent.set(key, `${cx},${cy}`);
        queue.push([nx, ny]);
      }
    }

    if (!foundKey) {
      // Fallback: step directly toward target if nearby
      const dx = destX - startX;
      const dy = destY - startY;
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
        return this.moveControlledPeepByDir(dx > 0 ? 0 : 2);
      }
      if (dy !== 0) {
        return this.moveControlledPeepByDir(dy > 0 ? 1 : 3);
      }
      return { ok: false };
    }

    const waypoints = [];
    let cur = foundKey;
    while (cur && cur !== startKey) {
      const [wx, wy] = cur.split(",").map(Number);
      waypoints.unshift({ x: wx, y: wy });
      cur = parent.get(cur);
    }
    if (waypoints.length > 0) {
      const first = waypoints.shift();
      p.targetX = first.x;
      p.targetY = first.y;
      p.manualPathQueue = waypoints.slice(0, 44);
      const dx = first.x - startX;
      const dy = first.y - startY;
      p.facing = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 2) : (dy >= 0 ? 1 : 3);
    }
    return { ok: true, steps: waypoints.length + 1 };
  }

  interactControlledPeepWithAdjacent() {
    const p = this.getControlledPeep();
    if (!p) return { ok: false, reason: "조작 중인 손님이 없습니다." };
    if (p.state === "riding") {
      this._disembarkControlledPeep(p);
      return { ok: true, kind: "disembark", reason: "놀이기구에서 하차했습니다." };
    }
    if (p.cash < 25) p.cash += 50;
    const tx = Math.round(p.x);
    const ty = Math.round(p.y);
    const dirs = [p.facing, (p.facing + 1) % 4, (p.facing + 3) % 4, (p.facing + 2) % 4];

    for (const dir of dirs) {
      const nx = tx + DIR_DX[dir];
      const ny = ty + DIR_DY[dir];
      const bb = (this.perimeterBillboards || []).find((b) => b.tileX === nx && b.tileY === ny);
      if (bb) {
        p.thoughts.unshift(`📢 [${bb.badge}] ${bb.title} 광고판을 읽었다!`);
        p.thoughts = p.thoughts.slice(0, 6);
        return { ok: true, kind: "billboard", billboard: bb };
      }
      const nt = this.getTile(nx, ny);
      if (!nt || !nt.rideId) continue;
      const ride = this.rides.find((r) => r.id === nt.rideId);
      if (!ride || ride.status !== "open" || ride.broken) continue;

      if (ride.category === "shop") {
        if (ride.catalogId === "ice_cream_stall") {
          p.hasIceCream = true;
          p.hunger = Math.max(0, p.hunger - 35);
          p.happiness = Math.min(100, p.happiness + 10);
        } else if (ride.catalogId === "burger_bar") {
          p.hasBurger = true;
          p.hunger = 0;
        } else if (ride.catalogId === "drink_stall") {
          p.hasDrink = true;
          p.thirst = 0;
        } else if (ride.catalogId === "balloon_stall") {
          p.hasBalloon = true;
        } else if (ride.catalogId === "restroom") {
          p.toilet = 0;
        } else if (ride.catalogId === "first_aid") {
          p.nausea = 0;
        } else {
          p.hasMap = true;
        }
        p.cash = Math.max(0, p.cash - ride.price);
        this._recordShopSale(ride, p);
        p.thoughts.unshift(`🛍 ${ride.name}에서 신나게 쇼핑했다!`);
        p.thoughts = p.thoughts.slice(0, 6);
        return { ok: true, kind: "shop", ride };
      }

      if (ride.passengers.length < ride.capacity) {
        p.cash = Math.max(0, p.cash - ride.price);
        this.cash = Math.round((this.cash + ride.price) * 100) / 100;
        ride.totalRiders += 1;
        ride.totalProfit = Math.round((ride.totalProfit + ride.price) * 100) / 100;
        this.monthlyFinances.rideIncome += ride.price;
        p.state = "riding";
        p.ridingRideId = ride.id;
        p.ridesRidden += 1;
        ride.passengers.push(p);
        this.addFloatingText(ride.x, ride.y, ride.z + 1.5, `+$${ride.price.toFixed(1)}`, "#fde047");
        this.onSfx?.("cash");
        p.thoughts.unshift(`🎢 '${ride.name}' 직접 탑승 중! 최고예요!`);
        p.thoughts = p.thoughts.slice(0, 6);
        return { ok: true, kind: "ride", ride };
      }
    }
    return { ok: false, reason: "인접한 타일에 이용할 수 있는 기구·상점·광고판이 없습니다." };
  }

  step(dtSeconds) {
    if (this.speedMultiplier <= 0) return;
    const simDt = Math.min(0.1, dtSeconds) * this.speedMultiplier;

    // 1. Floating text, particle & firework decay + cycle day/night progression
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].life -= dtSeconds;
      this.floatingTexts[i].heightZ += dtSeconds * 0.85;
      if (this.floatingTexts[i].life <= 0) this.floatingTexts.splice(i, 1);
    }
    for (let i = (this.particles || []).length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dtSeconds;
      pt.x += pt.vx * dtSeconds;
      pt.y += pt.vy * dtSeconds;
      pt.z += pt.vz * dtSeconds;
      pt.vz -= (pt.kind === "confetti" ? 1.0 : 1.5) * dtSeconds;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];
      fw.life -= dtSeconds;
      fw.x += fw.vx * dtSeconds;
      fw.y += fw.vy * dtSeconds;
      fw.z += fw.vz * dtSeconds;
      fw.vz -= 1.4 * dtSeconds;
      if (fw.life <= 0) this.fireworks.splice(i, 1);
    }
    if (this.lightingMode === "cycle") {
      this.dayNightPhase = (this.dayNightPhase + simDt * 0.012) % 1;
      this.nightMode = this.dayNightPhase >= 0.65 && this.dayNightPhase < 0.92;
    }
    if (this.nightMode && Math.random() < 0.045) {
      const launchers = [];
      for (let y = 2; y < this.mapSize - 2; y++) {
        for (let x = 2; x < this.mapSize - 2; x++) {
          if (this.grid[y][x]?.scenery?.id === "firework_launcher") launchers.push([x, y]);
        }
      }
      if (launchers.length > 0) {
        const [lx, ly] = launchers[Math.floor(Math.random() * launchers.length)];
        this.launchFireworksAt(lx, ly);
      }
    }

    // Occasional guest AI news speech bubble
    if ((this._newsHeadlines || []).length > 0 && Math.random() < 0.025 * dtSeconds * 20) {
      const talkers = this.peeps.filter((p) => p.state === "walking" && !p.speechBubble && !p.peerClientId);
      if (talkers.length > 0) {
        const chosen = talkers[Math.floor(Math.random() * talkers.length)];
        chosen.speechBubble = this._newsHeadlines[Math.floor(Math.random() * this._newsHeadlines.length)];
        chosen.speechTimer = 4.2;
      }
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
      const next = prev === "rain" && roll < 0.55
        ? "rainbow"
        : this.scenarioId === "dynamite_dunes"
          ? (roll < 0.85 ? "sunny" : "cloudy")
          : (roll < 0.62 ? "sunny" : roll < 0.85 ? "cloudy" : "rain");
      if (next !== prev) this.setWeather(next);
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
      if (r.placeBounce > 0) {
        r.placeBounce = Math.max(0, r.placeBounce - dt * 2.8);
      }
      if (r.category === "shop") continue;
      const active = r.status === "open" || r.status === "testing";
      if (r.track) {
        r.track.stepTrains(dt, active && !r.broken);
        if (active && !r.broken && r.track.trains?.[0] && Math.random() < 0.35) {
          const pose = r.track.samplePoseAtDistance(r.track.trains[0].distance);
          if (pose?.piece?.dz < 0) {
            this.spawnParticleBatch("coaster_trail", pose.x, pose.y, pose.z + 0.3, 2, r.colorPrimary || "#fde047");
          }
        }
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
          if (exiting.length > 0 && (r.stats?.excitement || 0) >= 3.5) {
            this.spawnParticleBatch("confetti", r.x, r.y, (r.z || 2) + 1.2, 6);
          }
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
      if (p.speechTimer > 0) {
        p.speechTimer = Math.max(0, p.speechTimer - dt);
        if (p.speechTimer === 0) p.speechBubble = null;
      }
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
      const isControlled = p.id === this.controlledPeepId;

      if (isControlled) {
        const dToTarget = Math.hypot(p.targetX - p.x, p.targetY - p.y);
        if (dToTarget < 0.08) {
          p.x = p.targetX;
          p.y = p.targetY;
          if (Array.isArray(p.manualPathQueue) && p.manualPathQueue.length > 0) {
            const nxt = p.manualPathQueue.shift();
            const dx = nxt.x - Math.round(p.x);
            const dy = nxt.y - Math.round(p.y);
            p.facing = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 0 : 2) : (dy >= 0 ? 1 : 3);
            p.targetX = nxt.x;
            p.targetY = nxt.y;
          }
        } else {
          const move = Math.min(dToTarget, 2.85 * dt);
          p.x += ((p.targetX - p.x) / dToTarget) * move;
          p.y += ((p.targetY - p.y) / dToTarget) * move;
          p.walkPhase += dt * 10.5;
        }
        continue;
      }

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
          if (ride.catalogId === "ice_cream_stall") peep.hasIceCream = true;
          else peep.hasBurger = true;
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
      colorPrimary: r.colorPrimary,
      colorTrack: r.colorTrack,
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
      freeBuildMode: this.freeBuildMode,
      awards: this.awards,
      tiles,
      rides,
      staff: this.staff,
      controlledPeepId: this.controlledPeepId,
      peeps: this.peeps.slice(0, 60).map((p) => ({
        id: p.id,
        name: p.name,
        shirtColor: p.shirtColor,
        pantsColor: p.pantsColor,
        skinTone: p.skinTone,
        hatType: p.hatType,
        hatColor: p.hatColor,
        backpackColor: p.backpackColor,
        x: Math.round(p.x),
        y: Math.round(p.y),
        originRouteId: p.originRouteId,
        isExternalRoute: p.isExternalRoute,
        hasBalloon: p.hasBalloon,
        balloonColor: p.balloonColor,
        ridesRidden: p.ridesRidden,
        isVipPeer: p.isVipPeer,
      })),
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
      this.freeBuildMode = Boolean(data.freeBuildMode);
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
            colorPrimary: r.colorPrimary,
            colorTrack: r.colorTrack,
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
      this.controlledPeepId = null;
      if (Array.isArray(data.peeps) && data.peeps.length > 0) {
        for (const sp of data.peeps) {
          const spawned = this._spawnGuest(sp.x, sp.y, Boolean(sp.isVipPeer), {
            originRouteId: sp.originRouteId || "direct",
            name: sp.name,
          });
          if (spawned) {
            if (sp.id) spawned.id = sp.id;
            if (sp.shirtColor) spawned.shirtColor = sp.shirtColor;
            if (sp.pantsColor) spawned.pantsColor = sp.pantsColor;
            if (sp.skinTone) spawned.skinTone = sp.skinTone;
            if (sp.hatType) spawned.hatType = sp.hatType;
            if (sp.hatColor) spawned.hatColor = sp.hatColor;
            if (sp.backpackColor !== undefined) spawned.backpackColor = sp.backpackColor;
            spawned.hasBalloon = Boolean(sp.hasBalloon);
            if (sp.balloonColor) spawned.balloonColor = sp.balloonColor;
            if (typeof sp.ridesRidden === "number") spawned.ridesRidden = sp.ridesRidden;
          }
        }
        if (data.controlledPeepId && this.peeps.some((p) => p.id === data.controlledPeepId)) {
          this.controlledPeepId = data.controlledPeepId;
        }
      } else {
        for (let i = 0; i < 18; i++) {
          const spot = this._findNearestPathTile(this.entrance.x, this.entrance.y - 2);
          if (spot) this._spawnGuest(spot.x, spot.y);
        }
      }

      this.rebuildPerimeterBillboards();
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
