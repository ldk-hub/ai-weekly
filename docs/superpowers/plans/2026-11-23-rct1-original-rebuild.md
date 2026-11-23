# RollerCoaster Tycoon (1999 Original Clean-Room Edition) Complete Sanctuary Rebuild Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` (inline execution per workspace `0-A Autonomous Execution Policy`) to implement this plan task-by-task to 100% verified completion in a single turn. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completely wipe the existing 2.5D RPG/Survival-Project Sanctuary at `/sanctuary` (`site/sanctuary.html`, `site/src/pages/sanctuary.js`, `site/src/pages/sanctuary/*`, and ~25MB of legacy 3D GLB/RPG sprite/VFX assets) and replace it with an authentic, 100% playable, copyright-safe clean-room **Original RollerCoaster Tycoon (1999 Style)** isometric theme park & roller coaster tycoon simulator (`위클리 타이쿤 · 1999 오리지널 테마파크 시뮬레이터`).

**Architecture:**
1. **Clean-Room Copyright & License Isolation**: Original *RollerCoaster Tycoon* (1999, Chris Sawyer / Atari) proprietary data files (`g1.dat`, `css1.dat`) and GPL-3.0 `OpenGraphics` assets cannot be bundled in an MIT-licensed GitHub Pages repo without copyright/license violation. Instead, we replicate 100% of the uncopyrightable game mechanics, 2:1 dimetric isometric projection (`64×32 px` base diamond, `16 px` per `3m` elevation step, 4-direction 90° camera rotation), roller coaster physics & Excitement/Intensity/Nausea (E/I/N) rating formulas, autonomous Peep/Staff state machines, and classic 1999 Windows 95 beveled UI windows using a procedural 256-color dithered pixel-art sprite baker (`RctSpriteAtlas.js`) and procedural WebAudio Fairground Organ & SFX synthesizer (`RctAudio.js`).
2. **Pure Deterministic Simulation Core (`RctConstants.js`, `RctCoasterEngine.js`, `RctParkSimulation.js`)**: Separated from DOM/Canvas so all park mechanics (terrain elevation, footpath bitmask auto-tiling, custom piece-by-piece coaster construction + blueprint placement, closed-loop energy physics, E/I/N rating calculation, ride breakdowns & mechanic repair, peep pathfinding/thoughts/vomiting/pincer pickup, staff patrol/sweeping, loans/marketing/awards, and `localStorage` save/load) can be unit-tested in Node.js (`scripts/test_rct_engine.mjs`).
3. **2:1 Isometric Pixel Renderer & 1999 Beveled Window Manager (`RctSpriteAtlas.js`, `RctIsoRenderer.js`, `RctAudio.js`, `RctWindowsUI.js`, `site/src/pages/sanctuary.js`, `site/sanctuary.html`, `site/styles.css`)**: Renders depth-sorted isometric terrain, underground cliff cutaways, animated rides, multi-car coaster trains with rider peeps, 4-direction peeps with balloons/umbrellas/vomit, top toolbar, draggable stackable RCT1 beveled windows with live viewport cameras, bottom news ticker, and optional AI Weekly live data kiosk (`latest.json`, `news_latest.json`, `social_latest.json`, `benchmarks.json`) + multiplayer Park Radio chat (`SanctuaryChat.js`).

**Tech Stack:** Vanilla ES Modules (Vite 8 multi-page build), HTML5 Canvas 2D (`image-rendering: pixelated`), WebAudio API procedural synthesis, Trystero/Nostr/BroadcastChannel (`SanctuaryChat.js`), Node.js `node:test` + Playwright headless Chromium E2E verification.

**Spec:** `docs/superpowers/plans/2026-11-23-rct1-original-rebuild.md`

---

## Global Constraints

1. **Preserve Site-Wide Header Navigation Contract**: Keep `.sanctuary-entry-btn` and `.sc-entry-dot` CSS rules in `site/styles.css` (and `--sc-amber`, `--sc-emerald`, `--sc-entry-*` root variables) intact so `index.html`, `news.html`, `social.html`, `starboard.html`, and `benchmarks.html` header links to `sanctuary` do not break (`scripts/verify_production.cjs` must pass 100%).
2. **Complete Legacy Wipe**: Delete all legacy RPG/Survival-Project files (`AssetManager.js`, `PixelVFXEngine.js`, `QuarterViewController.js`, `SanctuaryAtmosphere.js`, `SanctuaryVFX.js`, `SurvivalArena.js`, `scripts/bake_sanctuary_assets.js`, `scripts/blender_8dir_sprite_baker.py`, `scripts/turnarounds/*`, `site/public/assets/models/*`, `site/public/assets/sprites/*`, `site/public/assets/vfx/*`) and update `THIRD_PARTY_NOTICES.md` and `package.json`.
3. **Authentic 1999 RCT1 Isometric Math**: `TILE_W = 64`, `TILE_H = 32`, `HEIGHT_STEP_PX = 16` (`3m` per height step), `MAP_SIZE = 28` (`28×28` tiles), 4 cardinal camera rotations (`0..3`, 90° steps), underground brown dirt/rock cliff cutaway on map border edges.
4. **Zero External Copyrighted Binaries**: 100% of graphics and audio must be procedurally generated in clean-room MIT code (`RctSpriteAtlas.js`, `RctAudio.js`).
5. **XSS & Untrusted Input Hardening**: All dynamic strings from `site/public/data/*.json`, custom ride/guest names, and multiplayer chat messages rendered into HTML windows must pass through `esc()` HTML escaping and `safeHref()` URL validation.

---

## Review Focus (5 Edge-Case Failure Modes & Pinning Tests)

1. **Unclosed / Incomplete Custom Coaster Track Tested or Opened**: When a player opens a custom coaster whose track does not form a closed loop back to the station (and is not in Shuttle Launch mode), `RctCoasterEngine.validateAndComputeStats()` must return `{ valid: false, reason: "트랙이 승강장으로 연결되지 않았습니다 (폐곡선 미완성)" }` instead of dividing by zero or crashing train interpolation. *(Pinned in Task 2 test `test_incomplete_coaster_track_rejected`)*
2. **Coaster Train Stalling on Uphill Slope Without Chain Lift**: If a coaster car's kinetic energy drops to `v <= 0` on an upward slope that lacks a chain lift, the train must safely reverse/roll back down to the station rather than producing `NaN` from `Math.sqrt(negative)`. *(Pinned in Task 2 test `test_coaster_uphill_energy_conservation_no_nan`)*
3. **Peep Stranded on Deleted Footpath or Unowned Tile**: When a player bulldozes a footpath tile while Peeps are standing on it, or drops a Peep via the Pincer onto an unowned/water tile, `RctParkSimulation.dropPeepWithPincer()` and `tickPeeps()` must clamp/snap the Peep to the nearest valid footpath tile or allow emergency walk-to-nearest-path without infinite loop or crash. *(Pinned in Task 3 test `test_peep_pincer_drop_and_stranded_path_recovery`)*
4. **Ride Breakdown While Guests Are Queuing / Riding**: When an open ride breaks down (`Safety Cut-Out`, `Brakes Failure`, etc.), it must immediately stop boarding, dispatch the nearest available Mechanic via footpath routing, emit a red ticker alert, and upon mechanic arrival restore status to `'open'` and `reliability = 100`. *(Pinned in Task 3 test `test_ride_breakdown_and_mechanic_repair_cycle`)*
5. **Corrupted or Outdated `localStorage` Save Payload**: Loading malformed JSON or out-of-bounds tile coordinates from `localStorage` (`aiw-rct1-save-v1`) must gracefully fall back to the default scenario (`ai_weekly_park`) without throwing an unhandled exception. *(Pinned in Task 3 test `test_corrupted_save_payload_graceful_fallback`)*

---

## 4-Pillar Engineering Review (`plan-eng-review` Audit)

- **`[BLOCKER-PREVENTED]`**: `scripts/verify_production.cjs` tests `index.html`, `news.html`, `starboard.html`, and `benchmarks.html` across 5 viewports (`360px` to `1440px`). Deleting `--sc-*` root tokens or `.sanctuary-entry-btn` from `site/styles.css` would break the header button on those 4 pages. We preserve lines 5297–5346 of `site/styles.css` and root `--sc-*` tokens while replacing lines 5348–8655 with clean RCT1 styles (`.rct-*`).
- **`[RISK-MITIGATED]`**: Rendering a `28×28` isometric grid with trees, paths, rides, coaster supports, trains, and 150+ Peeps at 60 FPS on Canvas 2D can bottleneck if sprites are drawn with per-frame path strokes. `RctSpriteAtlas.js` pre-bakes all dithered isometric tile diamonds, sloped tiles, trees, path bitmasks, stall buildings, ride frames, coaster cars, and 4-dir peep frames onto offscreen `<canvas>` spritesheets once at startup so `RctIsoRenderer.js` executes fast `ctx.drawImage()` blits.
- **`[SIMPLIFY]`**: Reuse existing `site/src/pages/sanctuary/SanctuaryChat.js` for multiplayer visitor presence & chat (bridging connected peers into the park as VIP Guests and mounting the chat UI inside a collapsible RCT1 "공원 무전기 · 실시간 관람객 채팅" window).

---

### Task 1: Wipe Legacy RPG/Survival-Project Sanctuary Files & Save Plan Artifacts
- Save implementation plan to `docs/superpowers/plans/2026-11-23-rct1-original-rebuild.md` and artifact `implementation_plan.md`.
- Remove legacy RPG modules (`AssetManager.js`, `PixelVFXEngine.js`, `QuarterViewController.js`, `SanctuaryAtmosphere.js`, `SanctuaryVFX.js`, `SurvivalArena.js`), baking scripts (`scripts/bake_sanctuary_assets.js`, `scripts/blender_8dir_sprite_baker.py`, `scripts/turnarounds/`), and legacy assets (`site/public/assets/models/`, `site/public/assets/sprites/`, `site/public/assets/vfx/`).
- Update `package.json` and `THIRD_PARTY_NOTICES.md`.

### Task 2: Implement `RctConstants.js` & `RctCoasterEngine.js`
- `site/src/pages/rct/RctConstants.js`: Tile/height metrics, 16 coaster track pieces, 17 ride/shop definitions, 7 scenery types, 4 staff types, 3 coaster blueprints, 3 scenarios.
- `site/src/pages/rct/RctCoasterEngine.js`: 2:1 isometric projection (`worldToIso` / `isoToWorld`), modular `CoasterTrack`, `autoCloseToStation`, energy physics simulation (`stepTrains`), E/I/N rating formulas (`validateAndComputeStats`).
- Unit tests in `scripts/test_rct_engine.mjs`.

### Task 3: Implement `RctParkSimulation.js`
- Terrain elevation, water level, footpath bitmask auto-tiling, path additions (bench/bin/lamp), scenery, rides/shops, breakdowns & mechanic repair, Peep AI (needs, thoughts, vomiting, pincer pickup/drop, stranded recovery), Staff AI, loans & marketing, scenarios, `serialize()` / `deserialize()`, and AI Weekly data sync.

### Task 4: Implement `RctSpriteAtlas.js`, `RctIsoRenderer.js`, & `RctAudio.js`
- Procedural 256-color dithered pixel sprite baker (`RctSpriteAtlas.js`).
- Painter's algorithm isometric renderer with cliff cutaways, animated rides, multi-car trains, 4-dir peeps, hit-testing, floating bubbles, ghost previews, and live mini-viewport camera (`RctIsoRenderer.js`).
- WebAudio Fairground Wurlitzer Organ & SFX synthesizer (`RctAudio.js`).

### Task 5: Implement 1999 RCT1 Beveled Windows UI, Page, & Styles
- `site/src/pages/rct/RctWindowsUI.js`: Draggable/stackable/pinnable RCT1 windows (Build, Custom Coaster Builder, Ride Detail + Live Viewport, Peep Detail + Pincer + Thoughts, Terraform, Scenery, Footpaths, Staff, Park Info/Awards, Finances/Loans/Marketing, Scenario/Save, AI Weekly Research Kiosk).
- `site/sanctuary.html`, `site/src/pages/sanctuary.js`, `site/styles.css`.

### Task 6: Build, Automated Verification Suite, Production Regression Check & Walkthrough Artifact
- `node --test scripts/test_rct_engine.mjs`
- `npm run build`
- `node scripts/verify_rct_sanctuary.mjs` (Playwright E2E + screenshots)
- `node scripts/verify_production.cjs`
- `<Artifact Directory>/walkthrough.md`
