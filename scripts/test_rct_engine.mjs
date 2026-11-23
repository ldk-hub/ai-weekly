import test from "node:test";
import assert from "node:assert/strict";

import {
  ISO_METRICS,
  TRACK_PIECE_CATALOG,
  RIDE_CATALOG,
  COASTER_BLUEPRINTS,
} from "../site/src/pages/rct/RctConstants.js";
import {
  worldToIso,
  isoToWorld,
  CoasterTrack,
} from "../site/src/pages/rct/RctCoasterEngine.js";

test("test_isometric_roundtrip_all_rotations", () => {
  const heightMap = new Map();
  heightMap.set("12,8", 4);
  heightMap.set("5,20", 1);
  heightMap.set("19,17", 7);

  const getH = (x, y) => heightMap.get(`${x},${y}`) ?? 2;

  for (let rot = 0; rot < 4; rot++) {
    for (const [tx, ty] of [[12, 8], [5, 20], [19, 17], [14, 14]]) {
      const h = getH(tx, ty);
      const iso = worldToIso(tx, ty, h, rot, ISO_METRICS.MAP_SIZE);
      const picked = isoToWorld(iso.screenX, iso.screenY, rot, ISO_METRICS.MAP_SIZE, getH);
      assert.equal(picked.tileX, tx, `rot=${rot} tileX mismatch`);
      assert.equal(picked.tileY, ty, `rot=${rot} tileY mismatch`);
    }
  }
});

test("test_incomplete_coaster_track_rejected", () => {
  const track = new CoasterTrack({
    rideCatalogId: "wooden_coaster",
    originX: 10,
    originY: 10,
    originZ: 2,
    facing: 0,
    mode: "circuit",
  });
  track.appendPiece("station");
  track.appendPiece("station");
  track.appendPiece("chain_up_gentle");
  track.appendPiece("flat");

  const result = track.validateAndComputeStats();
  assert.equal(result.valid, false);
  assert.equal(result.reason, "트랙이 승강장으로 연결되지 않았습니다 (폐곡선 미완성)");
});

test("test_coaster_uphill_energy_conservation_no_nan", () => {
  const track = new CoasterTrack({
    rideCatalogId: "wooden_coaster",
    originX: 8,
    originY: 8,
    originZ: 2,
    facing: 0,
    mode: "circuit",
  });
  // Station -> steep climb without chain -> cannot make it over high crest
  track.appendPiece("station");
  track.appendPiece("station");
  track.appendPiece("slope_up_steep");
  track.appendPiece("slope_up_steep");
  track.appendPiece("slope_up_steep");
  track.appendPiece("slope_down_steep");
  track.appendPiece("slope_down_steep");
  track.appendPiece("slope_down_steep");
  track.appendPiece("turn_right");
  track.appendPiece("flat");
  track.appendPiece("turn_right");
  for (let i = 0; i < 8; i++) track.appendPiece("flat");
  track.appendPiece("turn_right");
  track.appendPiece("flat");
  track.appendPiece("turn_right");

  assert.equal(track.isClosed(), true);
  const validation = track.validateAndComputeStats();
  assert.equal(validation.valid, false);
  assert.ok(validation.reason.includes("언덕"), `unexpected reason: ${validation.reason}`);

  // Also ensure stepping train in real-time never produces NaN
  track.spawnDefaultTrain(2);
  for (let i = 0; i < 120; i++) {
    track.stepTrains(0.05, true);
  }
  for (const train of track.trains) {
    assert.equal(Number.isFinite(train.speed), true);
    assert.equal(Number.isFinite(train.distance), true);
    assert.equal(Number.isNaN(train.speed), false);
  }
});

test("test_coaster_auto_close_and_ein_ratings", () => {
  const track = new CoasterTrack({
    rideCatalogId: "steel_looping",
    originX: 8,
    originY: 10,
    originZ: 2,
    facing: 0,
    mode: "circuit",
  });

  assert.equal(track.appendPiece("station").ok, true);
  assert.equal(track.appendPiece("station").ok, true);
  assert.equal(track.appendPiece("chain_up_steep").ok, true);
  assert.equal(track.appendPiece("chain_up_steep").ok, true);
  assert.equal(track.appendPiece("slope_down_steep").ok, true);
  assert.equal(track.appendPiece("slope_down_steep").ok, true);
  assert.equal(track.appendPiece("vertical_loop").ok, true);
  assert.equal(track.appendPiece("bank_right").ok, true);

  const closed = track.autoCloseToStation();
  assert.equal(closed.ok, true, closed.reason);
  assert.equal(track.isClosed(), true);

  const statsRes = track.validateAndComputeStats({ nearbySceneryCount: 6 });
  assert.equal(statsRes.valid, true, statsRes.reason);
  assert.ok(statsRes.stats.excitement >= 4.0, `Excitement too low: ${statsRes.stats.excitement}`);
  assert.ok(statsRes.stats.intensity >= 3.0, `Intensity too low: ${statsRes.stats.intensity}`);
  assert.ok(statsRes.stats.nausea >= 1.0, `Nausea too low: ${statsRes.stats.nausea}`);
  assert.equal(statsRes.stats.inversions, 1);
  assert.ok(statsRes.stats.maxSpeedKmh > 45);
});

test("test_all_coaster_blueprints_valid_closed_circuits", () => {
  assert.ok(Object.keys(COASTER_BLUEPRINTS).length >= 3);
  assert.ok(Object.keys(TRACK_PIECE_CATALOG).length >= 16);
  assert.ok(RIDE_CATALOG.wooden_coaster && RIDE_CATALOG.steel_looping && RIDE_CATALOG.mine_train);

  for (const bp of Object.values(COASTER_BLUEPRINTS)) {
    const track = CoasterTrack.fromBlueprint(bp, bp.defaultOrigin.x, bp.defaultOrigin.y, bp.defaultOrigin.z, bp.defaultOrigin.facing);
    assert.equal(track.isClosed(), true, `Blueprint ${bp.id} is not a closed loop`);
    const stats = track.validateAndComputeStats({ nearbySceneryCount: 4 });
    assert.equal(stats.valid, true, `Blueprint ${bp.id} invalid: ${stats.reason}`);
    assert.ok(stats.stats.excitement > 3.5);
  }
});

import { RctParkSimulation } from "../site/src/pages/rct/RctParkSimulation.js";

test("test_terrain_water_footpath_bitmask_and_scenery", () => {
  const sim = new RctParkSimulation();
  sim.loadScenario("forest_frontiers");

  const startCash = sim.cash;
  const hBefore55 = sim.getTile(5, 5).height;
  const landRes = sim.raiseLowerLand(5, 5, 1);
  assert.equal(landRes.ok, true);
  assert.equal(sim.getTile(5, 5).height, hBefore55 + 1);
  assert.ok(sim.cash < startCash);

  const hBefore12 = sim.getTile(12, 12).height;
  const lowerRes = sim.raiseLowerLand(12, 12, -1);
  assert.equal(lowerRes.ok, true);
  assert.equal(sim.getTile(12, 12).height, hBefore12 - 1);

  const waterRes = sim.setWaterLevel(12, 12, hBefore12);
  assert.equal(waterRes.ok, true);
  assert.equal(sim.getTile(12, 12).waterHeight, hBefore12);

  // Place cross intersection of footpaths and verify 4-bit bitmask auto-tiling
  assert.equal(sim.placeFootpath(10, 10, "tarmac", false).ok, true);
  assert.equal(sim.placeFootpath(10, 9, "tarmac", false).ok, true);  // North (-Y)
  assert.equal(sim.placeFootpath(11, 10, "tarmac", false).ok, true); // East (+X)
  assert.equal(sim.placeFootpath(10, 11, "tarmac", false).ok, true); // South (+Y)
  assert.equal(sim.placeFootpath(9, 10, "tarmac", false).ok, true);  // West (-X)
  assert.equal(sim.getTile(10, 10).path.mask, 15); // N(1)|E(2)|S(4)|W(8) = 15

  assert.equal(sim.placePathAddition(10, 10, "bench").ok, true);
  assert.equal(sim.getTile(10, 10).pathAddition, "bench");

  assert.equal(sim.placeScenery(8, 8, "fountain").ok, true);
  assert.equal(sim.getTile(8, 8).scenery.id, "fountain");
});

test("test_ride_breakdown_and_mechanic_repair_cycle", () => {
  const sim = new RctParkSimulation();
  sim.loadScenario("ai_weekly_park");

  const openRide = sim.rides.find((r) => r.status === "open" && r.category !== "shop");
  assert.ok(openRide, "Expected at least one open ride in ai_weekly_park");

  // Ensure a mechanic exists
  if (!sim.staff.some((s) => s.role === "mechanic")) {
    sim.hireStaff("mechanic", 14, 24);
  }

  sim.triggerRideBreakdown(openRide.id, "브레이크 유압 고장 (Brakes Failure)");
  assert.equal(openRide.broken, true);
  assert.equal(openRide.status, "broken");

  const mech = sim.staff.find((s) => s.role === "mechanic" && s.targetRideId === openRide.id);
  assert.ok(mech, "Expected a mechanic to be dispatched to the broken ride");
  assert.equal(mech.targetRideId, openRide.id);

  // Step simulation enough seconds for mechanic to arrive and finish repair
  for (let i = 0; i < 400; i++) {
    sim.step(0.1);
    if (!openRide.broken) break;
  }

  assert.equal(openRide.broken, false, "Mechanic should repair broken ride");
  assert.equal(openRide.status, "open");
  assert.equal(openRide.reliability, 100);
});

test("test_peep_pincer_drop_and_stranded_path_recovery", () => {
  const sim = new RctParkSimulation();
  sim.loadScenario("ai_weekly_park");

  const peep = sim.peeps[0];
  assert.ok(peep, "Expected initial guests in ai_weekly_park");

  // Drop peep on water / unowned edge tile (0, 0)
  const dropRes = sim.dropPeepWithPincer(peep.id, 0, 0);
  assert.equal(dropRes.ok, true);
  assert.ok(dropRes.snappedTile, "Should snap to nearest valid footpath");
  const snapped = sim.getTile(dropRes.snappedTile.x, dropRes.snappedTile.y);
  assert.ok(snapped && snapped.path, "Snapped tile must have a footpath");

  // Now place an isolated footpath, move peep onto it, bulldoze it, and verify recovery
  sim.placeFootpath(4, 4, "tarmac", false);
  peep.x = 4;
  peep.y = 4;
  const bz = sim.bulldozeTile(4, 4);
  assert.equal(bz.ok, true);
  assert.equal(sim.getTile(4, 4).path, null);

  // Tick peeps: peep must survive without NaN and recover onto valid path
  for (let i = 0; i < 20; i++) sim.step(0.1);
  assert.equal(Number.isFinite(peep.x), true);
  assert.equal(Number.isFinite(peep.y), true);
  const currentTile = sim.getTile(Math.round(peep.x), Math.round(peep.y));
  assert.ok(currentTile && currentTile.path, "Stranded peep should recover to a valid path tile");
});

test("test_handyman_sweeping_finances_and_marketing", () => {
  const sim = new RctParkSimulation();
  sim.loadScenario("forest_frontiers");

  sim.placeFootpath(14, 24, "tarmac", false);
  const tile = sim.getTile(14, 24);
  tile.vomit = 1;
  tile.litter = 2;

  const hm = sim.hireStaff("handyman", 14, 24);
  assert.equal(hm.ok, true);
  for (let i = 0; i < 50; i++) sim.step(0.1);
  assert.equal(tile.vomit, 0);
  assert.equal(tile.litter, 0);

  const cashBefore = sim.cash;
  const loanRes = sim.adjustLoan(1000);
  assert.equal(loanRes.ok, true);
  assert.equal(sim.cash, cashBefore + 1000);

  const mktRes = sim.startMarketingCampaign("free_entry");
  assert.equal(mktRes.ok, true);
  assert.equal(sim.activeCampaigns.length, 1);
});

test("test_serialize_roundtrip_and_corrupted_save_payload_graceful_fallback", () => {
  const sim = new RctParkSimulation();
  sim.loadScenario("dynamite_dunes");
  sim.setRidePrice(sim.rides[0]?.id, 7.5);
  const saved = sim.serialize();

  const sim2 = new RctParkSimulation();
  const ok = sim2.deserialize(saved);
  assert.equal(ok, true);
  assert.equal(sim2.scenarioId, "dynamite_dunes");

  // Corrupted payloads must fall back gracefully without throwing
  const sim3 = new RctParkSimulation();
  assert.equal(sim3.deserialize("{invalid-json"), false);
  assert.equal(sim3.scenarioId, "ai_weekly_park");

  const sim4 = new RctParkSimulation();
  assert.equal(sim4.deserialize(JSON.stringify({ version: 1, tiles: "bad", cash: NaN })), false);
  assert.equal(sim4.scenarioId, "ai_weekly_park");
});

test("test_map_expansion_44x44_and_28_attractions_roster", async () => {
  const {
    ISO_METRICS,
    RIDE_CATALOG,
    SCENERY_CATALOG,
    COASTER_BLUEPRINTS,
    RIDE_COLOR_PALETTES,
  } = await import("../site/src/pages/rct/RctConstants.js");
  const { CoasterTrack } = await import("../site/src/pages/rct/RctCoasterEngine.js");

  assert.equal(ISO_METRICS.MAP_SIZE, 44);
  assert.equal(Object.keys(RIDE_CATALOG).length, 28);
  assert.equal(Object.keys(SCENERY_CATALOG).length, 18);
  assert.equal(Object.keys(COASTER_BLUEPRINTS).length, 5);
  assert.equal(RIDE_COLOR_PALETTES.length, 6);

  const sim = new RctParkSimulation();
  sim.loadScenario("ai_weekly_park");
  assert.equal(sim.entrance.x, 22);
  assert.equal(sim.entrance.y, 42);
  assert.equal(sim.rides.length >= 16, true, `Expected >= 16 rides, got ${sim.rides.length}`);

  for (const [bpId, bp] of Object.entries(COASTER_BLUEPRINTS)) {
    const track = CoasterTrack.fromBlueprint(
      bp,
      bp.defaultOrigin.x,
      bp.defaultOrigin.y,
      bp.defaultOrigin.z,
      bp.defaultOrigin.facing
    );
    assert.equal(track.isClosed(), true, `Blueprint ${bpId} did not form a complete circuit`);
    const stats = track.validateAndComputeStats({ nearbySceneryCount: 4 });
    assert.equal(stats.valid, true, `Blueprint ${bpId} invalid: ${stats.reason}`);
  }
});

test("test_perimeter_billboards_sandbox_freebuild_and_customization", () => {
  const sim = new RctParkSimulation();
  sim.syncAiWeeklyData({
    plugins: [
      { id: "p1", name: "SuperTool", repo: "org/supertool", description: "AI 도구", totalStars: 1200, weeklyDelta: 320, url: "https://example.com/p1" },
      { id: "p2", name: "CodeGraph", repo: "org/codegraph", description: "그래프 엔진", totalStars: 850, weeklyDelta: 110, url: "https://example.com/p2" },
    ],
    news: [
      { id: "n1", title: "Gemini 4 발표", summary: "차세대 모델 공개", source: "AI타임스", url: "https://example.com/n1" },
    ],
    social: [
      { id: "s1", author: "@dev_kr", text: "로컬 에이전트 벤치 결과 공유", source: "X", url: "https://example.com/s1" },
    ],
    benchmarks: [
      { id: "b1", model: "Gemini-4-Argon", org: "Google", elo: 1420, summary: "코딩 1위", url: "https://example.com/b1" },
    ],
  });

  assert.equal(sim.perimeterBillboards.length, 24);
  for (const bb of sim.perimeterBillboards) {
    const onPerimeter = bb.tileY === 1 || bb.tileX === 1 || bb.tileX === 42;
    assert.equal(onPerimeter, true, `Billboard ${bb.id} not on perimeter: (${bb.tileX}, ${bb.tileY})`);
    assert.equal(typeof bb.title, "string");
  }

  sim.loadScenario("sandbox_canvas");
  assert.equal(sim.scenarioId, "sandbox_canvas");
  const freeOn = sim.toggleFreeBuildMode(true);
  assert.equal(freeOn, true);
  const cashStart = sim.cash;

  const paintRes = sim.paintSurface(15, 15, "sand");
  assert.equal(paintRes.ok, true);
  assert.equal(sim.getTile(15, 15).surface, "sand");
  assert.equal(sim.cash, cashStart);

  const flatRes = sim.placeRideOrShop(18, 18, "haunted_house");
  assert.equal(flatRes.ok, true, flatRes.reason);
  assert.equal(sim.cash, cashStart);

  const custRes = sim.customizeRide(flatRes.ride.id, {
    name: "사이버 유령성",
    colorPrimary: "#06b6d4",
    colorTrack: "#ec4899",
  });
  assert.equal(custRes.ok, true);
  assert.equal(flatRes.ride.name, "사이버 유령성");
  assert.equal(flatRes.ride.colorPrimary, "#06b6d4");

  sim.launchFireworksAt(20, 20);
  assert.equal(sim.fireworks.length > 0, true);

  const saved = sim.serialize();
  const simReloaded = new RctParkSimulation();
  assert.equal(simReloaded.deserialize(saved), true);
  const reloadedRide = simReloaded.rides.find((r) => r.id === flatRes.ride.id);
  assert.ok(reloadedRide);
  assert.equal(reloadedRide.name, "사이버 유령성");
  assert.equal(reloadedRide.colorPrimary, "#06b6d4");
  assert.equal(simReloaded.getTile(15, 15).surface, "sand");
});

test("test_external_route_guests_and_manual_pov_control", async () => {
  const { GUEST_ORIGIN_ROUTES } = await import("../site/src/pages/rct/RctConstants.js");
  assert.ok(GUEST_ORIGIN_ROUTES.news && GUEST_ORIGIN_ROUTES.github);
  assert.equal(GUEST_ORIGIN_ROUTES.news.isExternal, true);
  assert.equal(GUEST_ORIGIN_ROUTES.direct.isExternal, false);

  const sim = new RctParkSimulation();
  sim.loadScenario("sandbox_canvas");

  const extPeep = sim.spawnExternalRouteGuest("github", "테스터G", true);
  assert.ok(extPeep);
  assert.equal(extPeep.isExternalRoute, true);
  assert.equal(extPeep.originRouteId, "github");
  assert.equal(sim.controlledPeepId, extPeep.id);

  // Move controlled guest north along main plaza path (-Y -> dir 3)
  const startY = Math.round(extPeep.y);
  const moveRes = sim.moveControlledPeepByDir(3);
  assert.equal(moveRes.ok, true, moveRes.reason);
  for (let i = 0; i < 15; i++) sim.step(0.05);
  assert.equal(Math.round(extPeep.y) <= startY - 1, true);

  // Walk via BFS to plaza tile (22, 35) and verify arrival stays under manual control
  const walkRes = sim.walkControlledPeepToTile(22, 35);
  assert.equal(walkRes.ok, true);
  for (let i = 0; i < 80; i++) sim.step(0.05);
  assert.equal(Math.round(extPeep.x), 22);
  assert.equal(Math.round(extPeep.y), 35);

  // Place ice_cream_stall at adjacent open grass (23, 35) and trigger manual shop interaction
  const stallRes = sim.placeRideOrShop(23, 35, "ice_cream_stall");
  assert.equal(stallRes.ok, true, stallRes.reason);
  extPeep.facing = 0; // Face east toward (23, 35)
  const actRes = sim.interactControlledPeepWithAdjacent();
  assert.equal(actRes.ok, true, actRes.reason);
  assert.equal(actRes.kind, "shop");
  assert.equal(extPeep.hasIceCream, true);

  // Cycle external-route guest & serialize roundtrip preserves controlled guest & route
  const cycled = sim.cycleControlledExternalPeep();
  assert.ok(cycled);
  assert.equal(cycled.isExternalRoute, true);
  const saved = sim.serialize();
  const sim2 = new RctParkSimulation();
  assert.equal(sim2.deserialize(saved), true);
  const restoredExt = sim2.peeps.find((p) => p.originRouteId === "github" && p.name === "테스터G");
  assert.ok(restoredExt);
  assert.equal(restoredExt.isExternalRoute, true);
});

test("test_lighting_cycle_and_rainbow_weather", () => {
  const sim = new RctParkSimulation();
  sim.loadScenario("ai_weekly_park");
  assert.equal(sim.lightingMode, "day");

  assert.equal(sim.cycleLightingMode(), "golden");
  assert.equal(sim.nightMode, false);

  assert.equal(sim.cycleLightingMode(), "night");
  assert.equal(sim.nightMode, true);

  assert.equal(sim.cycleLightingMode(), "cycle");
  assert.equal(sim.cycleLightingMode(), "day");
  assert.equal(sim.nightMode, false);

  sim.setWeather("rain");
  assert.equal(sim.weather, "rain");
  const umbrellaCount = sim.peeps.filter((p) => p.hasUmbrella).length;
  assert.ok(umbrellaCount > 0, "Guests should open umbrellas in rain");

  sim.setWeather("rainbow");
  assert.equal(sim.weather, "rainbow");
});

test("test_ai_supernova_pavilion_and_champion_model", () => {
  const sim = new RctParkSimulation();
  sim.loadScenario("ai_weekly_park");

  sim.syncAiWeeklyData({
    plugins: [
      {
        id: "org/super-agent",
        name: "SuperAgent",
        repo: "org/super-agent",
        stars: 4200,
        velocity_7d: 340,
        summary_ko: "초신성 200★+ 급상승 테스트 저장소",
        official_url: "https://github.com/org/super-agent",
      },
    ],
    news: [{ title_ko: "Gemini 4 Argon 출시", summary_ko: "초고속 코딩 모델", url: "https://example.com" }],
    benchmarks: [{ model: "Gemini 4 Argon", provider: "Google", arena_coding_elo: 1425 }],
  });

  assert.ok(sim.supernovaPavilion, "Supernova pavilion should be populated");
  assert.equal(sim.supernovaPavilion.tileX, 22);
  assert.equal(sim.supernovaPavilion.tileY, 23);
  assert.equal(sim.supernovaPavilion.isSupernova, true);
  assert.ok(sim.supernovaPavilion.installCmd.includes("org/super-agent"));

  assert.equal(sim.championModel.name, "Gemini 4 Argon");
  assert.equal(sim.championModel.elo, 1425);
  assert.ok(sim.championModel.accent.startsWith("#"));
  assert.ok((sim._newsHeadlines || []).length > 0);
});

test("test_multiplayer_vip_avatars_emotes_and_fireworks", () => {
  const sim = new RctParkSimulation();
  sim.loadScenario("ai_weekly_park");

  const vip = sim.syncPeerAvatar({ clientId: "peer-99", name: "아키텍트K" }, true);
  assert.ok(vip);
  assert.equal(vip.peerClientId, "peer-99");
  assert.equal(vip.isVipPeer, true);
  assert.equal(vip.hatType, "crown");

  sim.triggerPeerChatBubble("peer-99", "코스터 스릴 넘치네요!");
  assert.equal(vip.speechBubble, "코스터 스릴 넘치네요!");

  sim.triggerPeerEmote("peer-99", "🚀");
  assert.equal(vip.speechBubble, "🚀");

  const beforeFw = (sim.fireworks || []).length;
  sim.spawnMultiplayerFinaleFireworks();
  assert.ok((sim.fireworks || []).length > beforeFw);

  sim.removePeerAvatar("peer-99");
  assert.equal(sim.peeps.some((p) => p.peerClientId === "peer-99"), false);
});

