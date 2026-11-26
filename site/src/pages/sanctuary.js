import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import "../styles/weeklyland.css";

import { SanctuaryAtmosphere } from "./sanctuary/SanctuaryAtmosphere.js";
import { SanctuaryChat } from "./sanctuary/SanctuaryChat.js";
import { ParkWorldState } from "./weeklyland/ParkWorldState.js";
import { TerrainAndPathEngine } from "./weeklyland/TerrainAndPathEngine.js";
import { CoasterEngine } from "./weeklyland/CoasterEngine.js";
import { FlatRideEngine } from "./weeklyland/FlatRideEngine.js";
import { AIPavilionEngine } from "./weeklyland/AIPavilionEngine.js";
import { CrowdAndAvatarEngine } from "./weeklyland/CrowdAndAvatarEngine.js";
import { ParkCameraRig } from "./weeklyland/ParkCameraRig.js";
import { ParkAudioEngine } from "./weeklyland/ParkAudioEngine.js";
import { ParkPublisher } from "./weeklyland/ParkPublisher.js";
import { ArchitectBuilder } from "./weeklyland/ArchitectBuilder.js";
import { GuestHudController } from "./weeklyland/GuestHudController.js";
import { PavilionDashboard } from "./weeklyland/PavilionDashboard.js";
import { CartoonSkyDecor, getPoolStats } from "./weeklyland/ToonMaterials.js";
import { STAGE_LIST, STAGE_PALETTES, buildUnifiedParkWorld, getDominantZoneAt } from "./weeklyland/ParkThemeStages.js";

const THEME_KEY = "aiw-theme";

function initThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  const sync = () => {
    const isDark = document.documentElement.dataset.theme !== "light";
    if (btn) btn.textContent = isDark ? "라이트" : "다크";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.content = isDark ? "#080d18" : "#fcfaf6";
    });
  };
  btn?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    sync();
  });
  sync();
}

class WeeklyLandApp {
  constructor() {
    this.canvas = document.getElementById("sanctuary-canvas");
    this.overlayLayer = document.getElementById("overlay-layer");
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9bdcff);
    this.scene.fog = new THREE.FogExp2(0xc4ecff, 0.0022);
    this.skyDecor = new CartoonSkyDecor(this.scene);

    this.renderer = this._createRenderer(this.canvas);
    this.cameraRig = new ParkCameraRig(
      this.canvas,
      this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight)
    );
    this.composer = this._createPostFX();
    this.lights = this._createLights();
    this.audio = new ParkAudioEngine();

    this.keys = { forward: false, backward: false, left: false, right: false, sprint: false, jump: false, analogX: 0, analogY: 0 };
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this._rafId = 0;
    this._presenceAccum = 0;
    this._broadcastPatchTimer = null;
    this.nearbySpot = null;
    this.hasEntered = false;
    this.activeGuestId = null;
    this.activeStageId = "sunlit-meadow";
    this.baseMeadowWorld = null;
    this._financeUiAccum = 0;
    this._zoneBannerTimer = null;

    // Real-time Performance Optimizer State
    this.perf = {
      preset: "high",
      autoGuard: true,
      bloom: true,
      shadows: true,
      outlines: true,
      weather: true,
      guests: 24,
      fpsFrames: 0,
      fpsAccum: 0,
      currentFps: 60,
      lowFpsStreak: 0,
    };

    this.boot().catch((err) => console.error("[WeeklyLand] boot failed:", err));
  }

  _createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || 640, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.info.autoReset = false;
    return renderer;
  }

  _createPostFX() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || 640;
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.cameraRig.camera));
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.14, 0.5, 0.82);
    composer.addPass(this.bloomPass);
    return composer;
  }

  _createLights() {
    const ambientLight = new THREE.AmbientLight(0xfff5e4, 0.58);
    const hemiLight = new THREE.HemisphereLight(0xcbe8ff, 0x6f8c67, 0.66);
    const dirLight = new THREE.DirectionalLight(0xfff2d6, 2.15);
    dirLight.position.set(78, 108, 62);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 420;
    const d = 138;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0004;

    this.scene.add(ambientLight, hemiLight, dirLight, dirLight.target);
    return { ambientLight, hemiLight, dirLight };
  }

  async boot() {
    const worldRes = await fetch("data/park_world.json", { cache: "no-cache" });
    const rawWorld = await worldRes.json();
    const unifiedWorld = buildUnifiedParkWorld(rawWorld);
    this.baseMeadowWorld = unifiedWorld;
    this.activeStageId = "sunlit-meadow";

    this.worldState = new ParkWorldState(unifiedWorld);
    this.publisher = new ParkPublisher(this.worldState);

    if (this.publisher.isLocalDev()) {
      const draft = await this.worldState.loadDraft().catch(() => null);
      if (draft && draft.parkMeta?.unifiedWorld === true && (draft.terrain?.size || 0) >= 480) {
        this.worldState.data = draft;
        this.worldState.dirty = true;
      }
    }

    const snap = this.worldState.getSnapshot();
    this.cameraRig.setWorldSize(snap.terrain?.size || 520);
    this.terrain = new TerrainAndPathEngine(this.scene, snap.terrain, snap.paths);
    this.coaster = new CoasterEngine(this.scene, this.terrain);
    this.flatRide = new FlatRideEngine(this.scene, this.terrain);
    this.pavilion = new AIPavilionEngine(this.scene, this.terrain);
    this.crowd = new CrowdAndAvatarEngine(this.scene, this.terrain, this.overlayLayer);
    this.dashboard = new PavilionDashboard(this.pavilion);

    this.coaster.syncAll(snap.coasters);
    this.flatRide.syncAll(snap.rides, snap.scenery);
    this.pavilion.syncAll(snap.pavilions);

    const entrance = snap.parkMeta?.entrance || { x: 0, z: 124 };
    this.crowd.setSpawnPosition(entrance.x, entrance.z, Math.PI);
    this.crowd.setParkWorldContext(snap);
    this.crowd.seedInitialParkActivity();
    this.crowd.onPayment = () => {
      this.audio.playCoinChime();
      this._updateFinanceUi();
    };
    this.cameraRig.focus.set(entrance.x, 3.0, entrance.z - 6);
    this.cameraRig.targetFocus.set(entrance.x, 3.0, entrance.z - 6);
    this.cameraRig.distance = 22;
    this.cameraRig.targetDistance = 22;
    this.cameraRig.pitch = 0.28;
    this.cameraRig.targetPitch = 0.28;

    this.atmosphere = new SanctuaryAtmosphere(this.scene, this.lights, {}, {
      onFestivalEvent: (ev) => this._handleFestivalEvent(ev),
    });
    this.atmosphere.setTimeMode("zone");
    this.atmosphere.setSeasonMode("zone");

    this.hud = new GuestHudController({
      onBoardRide: (kind, id) => this.boardAttraction(kind, id),
      onOpenPavilion: (key) => this.openPavilion(key),
      onSetCameraMode: (mode) => this.setCameraMode(mode),
      onLeaveRide: () => this.leaveAttraction(),
      onToggleDrone: () => this.toggleDroneCamera(),
      onToggleArchitect: () => this.toggleArchitectMode(),
      onChangeAvatar: (key) => this.crowd.setPlayerClass(key),
      onToggleAudio: () => this.audio.toggle(),
    });

    this.architect = new ArchitectBuilder({
      scene: this.scene,
      canvas: this.canvas,
      cameraRig: this.cameraRig,
      worldState: this.worldState,
      terrainEngine: this.terrain,
      coasterEngine: this.coaster,
      flatRideEngine: this.flatRide,
      publisher: this.publisher,
      audio: this.audio,
      onToast: (msg) => this.hud.showToast(msg),
    });

    this.chat = new SanctuaryChat({
      onPeerUpdate: (peer) => {
        this.crowd.upsertRemotePeer(peer);
        this.hud.updateParkStat(1 + this.chat.peers.size, this.crowd.getGuestCount());
      },
      onPeerLeave: (clientId) => {
        this.crowd.removeRemotePeer(clientId);
        this.hud.updateParkStat(1 + this.chat.peers.size, this.crowd.getGuestCount());
      },
      onSelfPublicChat: (text) => this.crowd.showPlayerChatBubble(text),
      onPeerPublicChat: (clientId, text) => this.crowd.showRemotePeerChatBubble(clientId, text),
      onCommand: (cmd, arg) => this._handleChatCommand(cmd, arg),
      onRemoteFx: (fx) => this._handleRemoteFx(fx),
    });
    // Start multi-user Triple-Transport lobby (Nostr WSS Relays + Trystero WebRTC + BroadcastChannel)!
    this.chat.start();
    if (window.innerWidth <= 768) {
      this.chat.setCollapsed(true);
    }
    const pInit = this.crowd.player;
    this.chat.broadcastState({
      classKey: pInit.classKey,
      x: pInit.position.x,
      y: pInit.position.y,
      z: pInit.position.z,
      facing: pInit.facing,
      action: "Idle",
      zone: "위클리랜드 정문 광장",
      riding: null,
    }, true, true);

    this._bindWorldEvents();
    this._bindAtmosphereButtons();
    this._bindPerfOptimizer();
    this._bindInteractPrompt();
    this._bindStageSelector();
    this._bindFinancePanel();
    this._bindWelcomeGate();
    this._bindGuestCard();
    this._bindMobileControls();
    this._bindKeyboardAndPick();
    this._bindResize();

    this._updateFinanceUi();
    this.hud.updateParkStat(1, this.crowd.getGuestCount());

    this.crowd.preloadCharacterModels();
    this.architect.loadPresets();
    this.pavilion.loadArchiveData().then(() => {
      const hl = this.pavilion.getLiveParkHighlights();
      this.flatRide.updateBillboardData(hl);
      this.crowd.setGuestReactionLines(hl.guestLines);
    });

    if (new URLSearchParams(window.location.search).get("architect") === "1") {
      this._enterPark("guest");
      this.toggleArchitectMode(true);
    }

    this._loop();
  }

  _bindStageSelector() {
    this._renderStageCards("wl-welcome-stage-grid", false);
    this._renderStageCards("wl-stage-modal-grid", true);
    this._syncRealmUi(this.activeStageId);

    const modal = document.getElementById("wl-stage-modal");
    document.getElementById("btn-wl-stage")?.addEventListener("click", () => {
      const fin = document.getElementById("wl-finance-popover");
      if (fin) fin.hidden = true;
      if (modal) modal.hidden = !modal.hidden;
    });
    document.getElementById("btn-stage-close")?.addEventListener("click", () => {
      if (modal) modal.hidden = true;
    });
    modal?.addEventListener("click", (ev) => {
      if (ev.target === modal) modal.hidden = true;
    });

    // Interactive cardinal compass pins inside World Map modal
    document.querySelectorAll("[data-compass-zone]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const zid = btn.dataset.compassZone;
        this.travelToRealm(zid);
        if (modal) modal.hidden = true;
      });
    });
  }

  _renderStageCards(containerId, closeOnSelect) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = STAGE_LIST.map(
      (st) => `
      <button type="button" class="wl-stage-card ${st.id === this.activeStageId ? "is-active" : ""}" data-stage-id="${st.id}">
        <div class="wl-stage-card-head">
          <span class="wl-stage-card-title">
            <span class="wl-stage-swatch" style="background:${st.accentHex || "#fb923c"}"></span>
            <span>${st.name}</span>
          </span>
          <span class="wl-stage-badge">${st.direction || st.badge}</span>
        </div>
        <span class="wl-stage-desc">${st.subtitle}</span>
      </button>`
    ).join("");

    grid.querySelectorAll("[data-stage-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const sid = btn.dataset.stageId;
        this.travelToRealm(sid, { silent: !this.hasEntered });
        if (closeOnSelect) {
          const modal = document.getElementById("wl-stage-modal");
          if (modal) modal.hidden = true;
        }
      });
    });
  }

  /**
   * Seamless Fast-Travel across the ONE Unified 520m Continent (no map reload or reset!).
   * Players can also walk/fly naturally across bridges between all 4 themed realms.
   */
  travelToRealm(zoneId, { silent = false } = {}) {
    const pal = STAGE_PALETTES[zoneId];
    if (!pal) return;
    if (this.crowd.player.riding) this.leaveAttraction();
    if (this.activeGuestId) this._closeGuestCard();

    const sp = pal.spawn || pal.center || { x: 0, z: 118, facing: Math.PI };
    this.crowd.clearPlayerMoveTarget();
    this.crowd.setSpawnPosition(sp.x, sp.z, sp.facing ?? Math.PI);

    const gy = this.terrain ? Math.max(this.terrain.waterLevel + 0.2, this.terrain.getHeightAt(sp.x, sp.z)) : 0;
    const lookX = pal.center?.x ?? sp.x;
    const lookZ = pal.center?.z ?? (sp.z - 10);
    const camAz = Math.atan2(sp.x - lookX, sp.z - lookZ);

    if (this.cameraRig.mode === "drone" || this.cameraRig.mode === "architect") {
      this.cameraRig.focusOn(new THREE.Vector3(lookX, gy + 6, lookZ), 82);
    } else {
      this.cameraRig.focus.set(sp.x, gy + 2.2, sp.z);
      this.cameraRig.targetFocus.set(sp.x, gy + 2.2, sp.z);
      this.cameraRig.azimuth = camAz;
      this.cameraRig.targetAzimuth = camAz;
    }

    this._onEnterRealm(zoneId, { fromFastTravel: true, silent });
  }

  /**
   * Triggered automatically when walking, riding, or flying across a biome border (or via fast travel).
   */
  _onEnterRealm(zoneId, { fromFastTravel = false, silent = false } = {}) {
    const pal = STAGE_PALETTES[zoneId];
    if (!pal) return;
    const changed = this.activeStageId !== zoneId;
    this.activeStageId = zoneId;
    this._syncRealmUi(zoneId);
    this._syncAtmoLabels();

    if (silent) return;
    if (changed || fromFastTravel) {
      this.audio.playZoneTransitionChime(zoneId);
      this._showZoneBanner(pal);
      if (fromFastTravel) {
        this.hud.showToast(`'${pal.name}' 영역으로 빠른 이동했습니다! 걸어서 다른 영역으로 자유롭게 넘나들 수 있어요.`, 3400);
      }
    }
  }

  _syncRealmUi(zoneId) {
    const pal = STAGE_PALETTES[zoneId] || STAGE_PALETTES["sunlit-meadow"];
    const shell = document.querySelector(".wl-stage-shell");
    if (shell) shell.style.setProperty("--wl-zone-accent", pal.accentHex || "#ff7657");

    const btnLabel = document.getElementById("wl-stage-btn-label");
    if (btnLabel) btnLabel.textContent = pal.shortName || pal.name;
    const btnDot = document.getElementById("wl-stage-btn-dot");
    if (btnDot) btnDot.style.background = pal.accentHex || "#ff7657";

    document.querySelectorAll("[data-stage-id]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.stageId === zoneId);
    });
    document.querySelectorAll("[data-compass-zone]").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.compassZone === zoneId);
    });
    const finStage = document.getElementById("wl-fin-stage-name");
    if (finStage) finStage.textContent = `통합 대륙 · 현재: ${pal.name}`;
    this.chat?.updateZoneLabel(pal.name);
  }

  _showZoneBanner(pal) {
    const banner = document.getElementById("wl-zone-banner");
    const badge = document.getElementById("wl-zone-banner-badge");
    const title = document.getElementById("wl-zone-banner-title");
    const sub = document.getElementById("wl-zone-banner-sub");
    if (!banner || !title) return;
    if (badge) badge.textContent = `${pal.badge} · ${pal.direction}`;
    title.textContent = pal.name;
    if (sub) sub.textContent = pal.subtitle;
    banner.style.setProperty("--wl-zone-accent", pal.accentHex || "#ff7657");
    banner.hidden = false;
    banner.classList.remove("is-showing");
    void banner.offsetWidth;
    banner.classList.add("is-showing");
    clearTimeout(this._zoneBannerTimer);
    this._zoneBannerTimer = setTimeout(() => {
      banner.classList.remove("is-showing");
      setTimeout(() => {
        if (!banner.classList.contains("is-showing")) banner.hidden = true;
      }, 380);
    }, 3200);
  }

  _bindFinancePanel() {
    const pop = document.getElementById("wl-finance-popover");
    document.getElementById("btn-wl-finance")?.addEventListener("click", () => {
      if (!pop) return;
      pop.hidden = !pop.hidden;
      if (!pop.hidden) this._updateFinanceUi();
    });
    document.getElementById("btn-fin-close")?.addEventListener("click", () => {
      if (pop) pop.hidden = true;
    });

    const bindPrice = (inputId, labelId, key) => {
      const el = document.getElementById(inputId);
      const lbl = document.getElementById(labelId);
      el?.addEventListener("input", () => {
        const v = Number(el.value);
        if (lbl) lbl.textContent = `₩${v.toLocaleString()}`;
        this.crowd.setEconomyPrices({ [key]: v });
      });
    };
    bindPrice("wl-price-coaster", "wl-price-coaster-lbl", "coasterPrice");
    bindPrice("wl-price-ride", "wl-price-ride-lbl", "ridePrice");
    bindPrice("wl-price-snack", "wl-price-snack-lbl", "snackPrice");
  }

  _updateFinanceUi() {
    if (!this.crowd) return;
    const eco = this.crowd.getEconomySnapshot();
    const topBal = document.getElementById("wl-finance-balance");
    if (topBal) topBal.textContent = `₩${eco.balance.toLocaleString()}`;

    const pop = document.getElementById("wl-finance-popover");
    if (!pop || pop.hidden) return;

    const setT = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setT("wl-fin-stage-name", `통합 대륙 · 현재: ${STAGE_PALETTES[this.activeStageId]?.name || "위클리 썬릿 초원"}`);
    setT("wl-fin-balance", `₩${eco.balance.toLocaleString()}`);
    setT("wl-fin-revenue", `₩${eco.totalRevenue.toLocaleString()}`);
    setT("wl-fin-sales", `${eco.ticketsSold}매 · ${eco.snacksSold}건`);
    setT("wl-fin-riders", `${eco.ridingNow}명 · ${eco.queuingNow}명`);

    const listEl = document.getElementById("wl-fin-top-rides");
    if (listEl) {
      if (!eco.topRides.length) {
        listEl.innerHTML = `<span class="wl-fin-empty">AI 손님들이 곧 첫 티켓을 구매하고 탑승합니다…</span>`;
      } else {
        listEl.innerHTML = eco.topRides
          .map(
            (r, i) => `
          <div class="wl-fin-top-row">
            <span>${i + 1}. ${r.name} (${r.riders}명)</span>
            <strong>₩${r.revenue.toLocaleString()}</strong>
          </div>`
          )
          .join("");
      }
    }
  }

  _bindWelcomeGate() {
    document.getElementById("btn-wl-enter-park")?.addEventListener("click", () => this._enterPark("guest"));
    document.getElementById("btn-wl-enter-drone")?.addEventListener("click", () => this._enterPark("drone"));
  }

  _enterPark(mode = "guest") {
    if (this.hasEntered) return;
    this.hasEntered = true;
    const modal = document.getElementById("wl-welcome-modal");
    if (modal) modal.hidden = true;
    this.audio.playClick(720);

    const pal = STAGE_PALETTES[this.activeStageId] || STAGE_PALETTES["sunlit-meadow"];
    const center = pal.center || { x: 0, z: 12 };

    if (mode === "drone") {
      this.cameraRig.setMode("drone");
      this.cameraRig.focusOn(new THREE.Vector3(center.x, 6, center.z), 108);
      this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
      this.hud.showToast("드론 시점으로 통합 대륙에 입장했습니다! WASD로 4개 테마 영역을 자유롭게 비행하세요.", 4200);
    } else {
      this.cameraRig.setMode("guest_third");
      this.cameraRig.targetDistance = 14.5;
      this.cameraRig.targetPitch = 0.34;
      this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
      this.hud.showToast(`'${pal.name}'에 입장했습니다! 동·서·북 포털 아치를 지나면 각 영역의 테마로 실시간 전환됩니다.`, 4400);
    }
    this._showZoneBanner(pal);
    this.chat?.updateZoneLabel(pal.name);
    const mobPad = document.getElementById("wl-mobile-pad");
    if (mobPad && mode === "guest") mobPad.hidden = false;
    this.canvas.focus?.();
  }

  _bindMobileControls() {
    const stick = document.getElementById("wl-touch-stick");
    const knob = document.getElementById("wl-touch-knob");
    if (stick && knob) {
      let stickPid = null;
      const maxR = 34;
      const updateStick = (clientX, clientY) => {
        const rect = stick.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        let dx = clientX - cx;
        let dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
          dx = (dx / dist) * maxR;
          dy = (dy / dist) * maxR;
        }
        knob.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
        this.keys.analogX = dx / maxR;
        this.keys.analogY = -dy / maxR;
      };
      const resetStick = () => {
        stickPid = null;
        knob.style.transform = "translate3d(0, 0, 0)";
        this.keys.analogX = 0;
        this.keys.analogY = 0;
      };
      stick.addEventListener("pointerdown", (ev) => {
        ev.stopPropagation();
        stickPid = ev.pointerId;
        stick.setPointerCapture?.(ev.pointerId);
        updateStick(ev.clientX, ev.clientY);
      });
      stick.addEventListener("pointermove", (ev) => {
        if (stickPid !== ev.pointerId) return;
        ev.stopPropagation();
        updateStick(ev.clientX, ev.clientY);
      });
      stick.addEventListener("pointerup", (ev) => {
        if (stickPid !== ev.pointerId) return;
        resetStick();
      });
      stick.addEventListener("pointercancel", resetStick);
    }

    document.getElementById("btn-mob-jump")?.addEventListener("click", () => {
      if (!this.hasEntered) return;
      this.crowd.celebratePlayer();
    });
    document.getElementById("btn-mob-season")?.addEventListener("click", () => {
      const labels = this.atmosphere.cycleSeasonMode();
      this._syncAtmoLabels();
      this.hud.showToast(
        labels.seasonKey === "rain"
          ? "장마 소나기가 내립니다! 공원의 모든 캐릭터가 우산을 펼칩니다."
          : `날씨 전환: ${labels.seasonLabel}`
      );
    });
    document.getElementById("btn-mob-firework")?.addEventListener("click", () => {
      const f = this.cameraRig.focus;
      this.atmosphere.launchManualFirework(f.x, f.z - 16, 4);
      this.audio.playClick(760);
      this.hud.showToast("축하 불꽃 폭죽 발사!");
    });
    document.getElementById("btn-mob-chat")?.addEventListener("click", () => {
      if (!this.chat) return;
      this.chat.setCollapsed(!this.chat.collapsed);
      if (!this.chat.collapsed) this.chat.focusInput();
    });
  }

  _bindGuestCard() {
    document.getElementById("btn-wl-gc-close")?.addEventListener("click", () => this._closeGuestCard());
    document.querySelectorAll("[data-guest-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!this.activeGuestId) return;
        const act = btn.dataset.guestAct;
        this.audio.playClick(740);
        const snap = this.crowd.performGuestAction(this.activeGuestId, act, this.crowd.player.position);
        if (act === "photo" || act === "wave") this.crowd.celebratePlayer();
        if (snap) this._renderGuestCard(snap);
        if (act === "recommend") {
          this.hud.showToast(`${snap?.name || "손님"}에게 하이퍼 코스터를 추천했습니다! 신나서 달려갑니다.`);
          setTimeout(() => this._closeGuestCard(), 1600);
        }
      });
    });
  }

  _openGuestCard(guestId) {
    const snap = this.crowd.interactWithGuest(guestId, this.crowd.player.position);
    if (!snap) return;
    this.activeGuestId = guestId;
    this.audio.playClick(680);
    this._renderGuestCard(snap);
    const card = document.getElementById("wl-guest-card");
    if (card) card.hidden = false;
  }

  _renderGuestCard(snap) {
    const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    const setW = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`; };
    setText("wl-gc-name", snap.name);
    setText("wl-gc-persona", snap.persona);
    setText("wl-gc-state", snap.stateLabel);
    setText("wl-gc-wallet", `소지금 ₩${(snap.wallet || 0).toLocaleString()} · 탑승 ${snap.ridesRidden || 0}회`);
    setText("wl-gc-quote", `"${snap.quote}"`);
    setW("wl-gc-happy", snap.happiness);
    setW("wl-gc-energy", snap.energy);
    setW("wl-gc-full", snap.fullness);
  }

  _closeGuestCard() {
    if (this.activeGuestId) {
      this.crowd.releaseTalkingGuest(this.activeGuestId);
      this.activeGuestId = null;
    }
    const card = document.getElementById("wl-guest-card");
    if (card) card.hidden = true;
  }

  _bindWorldEvents() {
    this.worldState.on("world:changed", ({ scope, data, broadcast }) => {
      if (scope === "all" || scope === "terrain") {
        this.terrain.syncFromConfig(data.terrain, data.paths);
        this.crowd.onPathsChanged();
      } else if (scope === "paths") {
        this.terrain.rebuildPaths(data.paths);
        this.crowd.onPathsChanged();
      }
      if (scope === "all" || scope === "coasters" || scope === "terrain") {
        this.coaster.syncAll(data.coasters);
      }
      if (scope === "all" || scope === "rides" || scope === "terrain") {
        this.flatRide.syncAll(data.rides, data.scenery);
        const hl = this.pavilion.getLiveParkHighlights();
        this.flatRide.updateBillboardData(hl);
      }
      if (scope === "all") {
        this.pavilion.syncAll(data.pavilions);
      }
      if (scope === "all" || scope === "rides" || scope === "coasters") {
        this.crowd.setParkWorldContext(data);
      }
      if (!this.perf.outlines) this._applyOutlineVisibility(false);
      if (broadcast && this.worldState.mode === "architect") {
        this._scheduleLiveWorldBroadcast(data);
      }
    });
  }

  _scheduleLiveWorldBroadcast(data) {
    clearTimeout(this._broadcastPatchTimer);
    this._broadcastPatchTimer = setTimeout(() => {
      try {
        const lite = { ...data, terrain: { ...data.terrain, heights: undefined } };
        this.chat?.broadcastFx("world_patch", { world: lite });
      } catch {}
    }, 450);
  }

  _handleRemoteFx(fx) {
    if (fx?.kind === "world_patch" && fx.world && this.worldState.mode !== "architect") {
      this.worldState.applyRemotePatch(fx.world);
      this.hud.showToast("관리자가 공원을 실시간으로 업데이트했습니다!");
    }
  }

  _handleFestivalEvent(ev) {
    const banner = document.getElementById("sanctuary-festival-banner");
    const text = document.getElementById("festival-banner-text");
    if (!banner || !text) return;
    const phase = ev.phase || ev.type;
    if (phase === "announcing" || phase === "countdown") {
      banner.hidden = false;
      text.textContent = `잠시 후 위클리랜드 밤하늘에 불꽃축제가 시작됩니다! (${ev.countdown}초 전)`;
    } else if (phase === "show" || phase === "start") {
      banner.hidden = false;
      text.textContent = "위클리랜드 야간 불꽃축제가 시작되었습니다!";
      this.audio.playFireworkBoom();
    } else if (phase === "burst") {
      this.audio.playFireworkBoom();
    } else if (phase === "ended" || phase === "end") {
      banner.hidden = true;
    }
  }

  _handleChatCommand(cmd, arg) {
    if (cmd === "time" && arg) {
      this.atmosphere.setTimeMode(arg);
      this._syncAtmoLabels();
    } else if (cmd === "season" && arg) {
      this.atmosphere.setSeasonMode(arg);
      this._syncAtmoLabels();
    } else if (cmd === "firework") {
      const p = this.crowd.player.position;
      this.atmosphere.launchManualFirework(p.x, p.z - 12, 4);
      this.hud.showToast("하늘로 화려한 불꽃 폭죽 4발을 발사했습니다!");
    }
  }

  _bindAtmosphereButtons() {
    document.getElementById("btn-atmo-time")?.addEventListener("click", () => {
      const labels = this.atmosphere.cycleTimeMode();
      this._syncAtmoLabels();
      const hints = {
        dawn: "동쪽 지평선에서 따스한 일출이 떠오릅니다!",
        day: "청명한 파란 하늘과 뭉게구름이 펼쳐졌습니다.",
        sunset: "하늘이 붉고 따뜻한 감성 노을로 물듭니다.",
        night: "별빛과 초승달, 오로라가 수놓은 밤하늘입니다.",
      };
      this.hud.showToast(`${labels.timeLabel} — ${hints[labels.timeKey] || ""}`);
    });
    document.getElementById("btn-atmo-season")?.addEventListener("click", () => {
      const labels = this.atmosphere.cycleSeasonMode();
      this._syncAtmoLabels();
      if (labels.seasonKey === "rain") {
        this.hud.showToast("하늘에 짙은 먹구름이 몰려오고 소나기가 내립니다! 모든 캐릭터가 우산을 펼칩니다.");
      }
    });
    document.getElementById("btn-wl-firework")?.addEventListener("click", () => {
      const f = this.cameraRig.focus;
      this.atmosphere.launchManualFirework(f.x, f.z - 16, 4);
      this.audio.playClick(760);
      this.hud.showToast("축하 불꽃 폭죽을 하늘로 쏘아 올렸습니다!");
    });
    this._syncAtmoLabels();
  }

  _syncAtmoLabels() {
    const labels = this.atmosphere.getStatusLabels();
    const tEl = document.getElementById("atmo-time-text");
    const sEl = document.getElementById("atmo-season-text");
    if (tEl) tEl.textContent = labels.timeLabel;
    if (sEl) sEl.textContent = labels.seasonLabel;
  }

  _bindPerfOptimizer() {
    const panel = document.getElementById("wl-perf-panel");
    document.getElementById("btn-wl-perf")?.addEventListener("click", () => {
      if (panel) panel.hidden = !panel.hidden;
    });
    document.getElementById("btn-perf-close")?.addEventListener("click", () => {
      if (panel) panel.hidden = true;
    });

    document.querySelectorAll("[data-perf-preset]").forEach((btn) => {
      btn.addEventListener("click", () => this.applyPerfPreset(btn.dataset.perfPreset));
    });

    const autoBtn = document.getElementById("btn-perf-auto");
    autoBtn?.addEventListener("click", () => {
      this.perf.autoGuard = !this.perf.autoGuard;
      autoBtn.textContent = `자동 가드: ${this.perf.autoGuard ? "켜짐" : "꺼짐"}`;
    });

    document.getElementById("opt-perf-bloom")?.addEventListener("change", (ev) => {
      this.perf.bloom = Boolean(ev.target.checked);
    });
    document.getElementById("opt-perf-shadows")?.addEventListener("change", (ev) => {
      this.perf.shadows = Boolean(ev.target.checked);
      this.renderer.shadowMap.enabled = this.perf.shadows;
      this.lights.dirLight.castShadow = this.perf.shadows;
    });
    document.getElementById("opt-perf-outlines")?.addEventListener("change", (ev) => {
      this.perf.outlines = Boolean(ev.target.checked);
      this._applyOutlineVisibility(this.perf.outlines);
    });
    document.getElementById("opt-perf-weather")?.addEventListener("change", (ev) => {
      this.perf.weather = Boolean(ev.target.checked);
      this.atmosphere.setWeatherEnabled(this.perf.weather);
    });
    document.getElementById("opt-perf-guests")?.addEventListener("input", (ev) => {
      const n = Number(ev.target.value);
      this.perf.guests = n;
      const lbl = document.getElementById("opt-perf-guests-lbl");
      if (lbl) lbl.textContent = `${n}명`;
      this.crowd.setGuestLimit(n);
      this.hud.updateParkStat(1 + (this.chat?.peers?.size || 0), this.crowd.getGuestCount());
    });
  }

  _applyOutlineVisibility(visible) {
    this.scene.traverse((obj) => {
      if (obj.userData?.isToonOutline) obj.visible = visible;
    });
  }

  applyPerfPreset(preset) {
    this.perf.preset = preset;
    if (preset === "high") {
      this.perf.bloom = true;
      this.perf.shadows = true;
      this.perf.outlines = true;
      this.perf.weather = true;
      this.perf.guests = 24;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    } else if (preset === "balanced") {
      this.perf.bloom = true;
      this.perf.shadows = true;
      this.perf.outlines = false;
      this.perf.weather = true;
      this.perf.guests = 16;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    } else {
      this.perf.bloom = false;
      this.perf.shadows = false;
      this.perf.outlines = false;
      this.perf.weather = true;
      this.perf.guests = 8;
      this.renderer.setPixelRatio(1);
    }

    this.renderer.shadowMap.enabled = this.perf.shadows;
    this.lights.dirLight.castShadow = this.perf.shadows;
    if (this.perf.shadows && this.lights.dirLight.shadow) {
      const targetSize = preset === "high" ? 2048 : 1024;
      if (this.lights.dirLight.shadow.mapSize.x !== targetSize) {
        this.lights.dirLight.shadow.mapSize.set(targetSize, targetSize);
        this.lights.dirLight.shadow.map?.dispose();
        this.lights.dirLight.shadow.map = null;
      }
    }
    this._applyOutlineVisibility(this.perf.outlines);
    this.atmosphere.setWeatherEnabled(this.perf.weather);
    this.crowd.setGuestLimit(this.perf.guests);

    // Sync checkboxes & buttons
    const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = v; };
    setChk("opt-perf-bloom", this.perf.bloom);
    setChk("opt-perf-shadows", this.perf.shadows);
    setChk("opt-perf-outlines", this.perf.outlines);
    setChk("opt-perf-weather", this.perf.weather);
    const gl = document.getElementById("opt-perf-guests");
    if (gl) gl.value = String(this.perf.guests);
    const gLbl = document.getElementById("opt-perf-guests-lbl");
    if (gLbl) gLbl.textContent = `${this.perf.guests}명`;
    document.querySelectorAll("[data-perf-preset]").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.perfPreset === preset);
    });
    this.hud.updateParkStat(1 + (this.chat?.peers?.size || 0), this.crowd.getGuestCount());
    this.hud.showToast(`그래픽 품질을 '${preset === "high" ? "높음" : preset === "balanced" ? "보통" : "저사양 60fps"}'으로 최적화했습니다.`);
  }

  _bindInteractPrompt() {
    document.getElementById("wl-interact-prompt")?.addEventListener("click", () => {
      if (this.nearbySpot) this._triggerInteraction(this.nearbySpot);
    });
  }

  _triggerInteraction(spot) {
    if (!spot) return;
    this.audio.playClick(680);

    if (spot.kind === "guest") {
      this._openGuestCard(spot.id);
      return;
    }
    if (spot.kind === "pavilion" || spot.kind === "mega_billboard") {
      this.openPavilion(spot.archiveKey);
      return;
    }
    if (spot.kind === "ride") {
      this.boardAttraction("ride", spot.id);
      return;
    }

    const pos = spot.pos || this.crowd.player.position;
    if (spot.action === "firework") {
      this.atmosphere.launchManualFirework(pos.x, pos.z, 4);
      this.crowd.celebratePlayer();
      this.hud.showToast("불꽃 발사대에서 화려한 카툰 폭죽 4발이 터졌습니다!");
    } else if (spot.action === "castle") {
      this.atmosphere.launchManualFirework(pos.x, pos.z, 5);
      this.crowd.celebratePlayer();
      const snap = this.worldState.getSnapshot();
      this.hud.showToast(`위클리 동화 성 도착! 현재 어트랙션 ${snap.rides.length}종 · 코스터 ${snap.coasters.length}기 운영 중!`);
    } else if (spot.action === "balloon") {
      const equipped = this.crowd.togglePlayerBalloon();
      this.crowd.celebratePlayer();
      this.hud.showToast(equipped ? "귀여운 파스텔 풍선을 손에 들었습니다!" : "파스텔 풍선을 내려놓았습니다.");
    } else if (spot.action === "icecream") {
      this.crowd.celebratePlayer();
      this.hud.showToast("딸기·민트 더블 아이스크림을 맛있게 먹었습니다! 기분 +20");
    } else if (spot.action === "popcorn") {
      this.crowd.celebratePlayer();
      this.hud.showToast("따끈한 카라멜 팝콘을 손에 들었습니다! 코스터 탈 준비 완료!");
    } else if (spot.action === "fountain") {
      this.crowd.celebratePlayer();
      this.hud.showToast("소원 분수대에 동전을 던졌습니다! 오늘의 AI 프로젝트 대박 기원!");
    } else if (spot.action === "photo") {
      this.crowd.celebratePlayer();
      this.hud.showToast("하트 포토존에서 기념사진을 찰칵 찍었습니다!");
    } else if (spot.action === "statue") {
      this.crowd.celebratePlayer();
      this.hud.showToast("클로드 마스코트 동상: '북쪽 맵 끝 5대 메가 전광판을 눌러 실시간 대시보드를 확인해 보세요!'");
    } else if (spot.action === "burger") {
      this.crowd.celebratePlayer();
      this.hud.showToast("갓 구운 수제 치즈버거 세트를 맛있게 먹었습니다! 에너지 +25");
    } else if (spot.action === "cotton_candy") {
      this.crowd.celebratePlayer();
      this.hud.showToast("폭신폭신 무지개 솜사탕을 손에 들었습니다!");
    } else if (spot.action === "souvenir") {
      this.crowd.celebratePlayer();
      this.hud.showToast("위클리랜드 한정판 코스터 뱃지 & 마스코트 키링을 획득했습니다!");
    } else if (spot.action === "restroom") {
      this.hud.showToast("깔끔한 공원 편의시설 이용 완료! 컨디션이 상쾌해졌습니다.");
    } else if (spot.action === "clock") {
      this.audio.playClick(880);
      this.hud.showToast("댕~ 댕~ 위클리 대시계탑의 정각 종소리가 공원 전체에 울려 퍼집니다!");
    } else if (spot.action === "maze") {
      this.crowd.celebratePlayer();
      this.hud.showToast("동화 미로 정원 한가운데 황금 트로피를 발견했습니다!");
    } else if (spot.action === "hot_air") {
      this.atmosphere.launchManualFirework(pos.x, pos.z, 2);
      this.hud.showToast("열기구 버너 점화! 따뜻한 불꽃과 함께 하늘로 떠 오를 준비 완료!");
    } else {
      this.crowd.celebratePlayer();
      this.hud.showToast(`${spot.label || "시설 이용"} 완료!`);
    }
  }

  boardAttraction(kind, id) {
    if (this.worldState.mode === "architect") this.toggleArchitectMode(false);
    let targetId = id;
    if (kind === "coaster") {
      const realmCoaster = STAGE_PALETTES[this.activeStageId]?.primaryCoasterId;
      if (!id || id === "auto") {
        targetId = (realmCoaster && this.coaster.instances.has(realmCoaster))
          ? realmCoaster
          : this.coaster.getPrimaryCoasterId();
      } else {
        targetId = this.coaster.instances.has(id) ? id : this.coaster.getPrimaryCoasterId();
      }
    }
    if (!targetId) return;
    this.crowd.boardRide(kind, targetId, 0);
    // Start in 3/4 Chase Action Cam so player immediately sees their seated posture, facial expressions & ride reactions!
    this.cameraRig.setMode("ride_chase");
    this.cameraRig.azimuth = 0.0;
    this.cameraRig.targetAzimuth = 0.0;
    this.cameraRig.pitch = 0.16;
    this.cameraRig.targetPitch = 0.16;
    this.cameraRig.distance = 4.8;
    this.cameraRig.targetDistance = 4.8;
    this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
    this.audio.playClick(740);
    this.hud.showToast(
      kind === "coaster"
        ? "코스터 좌석에 착석했습니다! 드래그로 360° 회전하거나 하단 [1인칭 POV]로 전환해 보세요."
        : "놀이기구에 착석했습니다! 하단에서 [1인칭 POV]·[체이스 캠]을 자유롭게 전환할 수 있습니다.",
      3800
    );
    this.chat?.updateZoneLabel(kind === "coaster" ? "하이퍼 코스터 탑승 중" : "어트랙션 탑승 중");
  }

  leaveAttraction() {
    const prev = this.crowd.player.riding;
    if (!prev) return;
    const dropPos =
      prev.kind === "coaster"
        ? this.coaster.getStationPosition(prev.id)
        : this.flatRide.getRidePosition(prev.id).add(new THREE.Vector3(0, 0, 10));
    this.crowd.leaveRide(dropPos);
    this.cameraRig.setMode("guest_third");
    this.hud.updateRideTelemetry(null);
    this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
    this.chat?.updateZoneLabel("위클리랜드 중앙 광장");
  }

  openPavilion(archiveKey) {
    this.dashboard.open(archiveKey);
    const pos = this.pavilion.getPavilionPosition(archiveKey);
    if (!this.crowd.player.riding && this.worldState.mode === "guest") {
      this.cameraRig.focusOn(pos, 38);
    }
  }

  setCameraMode(mode) {
    this.cameraRig.setMode(mode);
    this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
  }

  toggleDroneCamera() {
    if (this.crowd.player.riding) this.leaveAttraction();
    const next = this.cameraRig.mode === "drone" ? "guest_third" : "drone";
    this.cameraRig.setMode(next);
    if (next === "drone") this.cameraRig.focusOn(new THREE.Vector3(0, 6, -10), 92);
    this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
  }

  toggleArchitectMode(forceState) {
    const next = typeof forceState === "boolean" ? forceState : this.worldState.mode !== "architect";
    if (next && this.crowd.player.riding) this.leaveAttraction();
    this.worldState.setMode(next ? "architect" : "guest");
    this.architect.setActive(next);
    this.cameraRig.setMode(next ? "architect" : "guest_third");
    if (next) this.cameraRig.focusOn(new THREE.Vector3(0, 6, 0), 86);
    this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
    this.hud.showToast(
      next
        ? "관리자(Architect) 모드 — 520m 통합 대륙에서 코스터·27종 건물/기구·보행로·지형·철거 도구를 자유롭게 사용하세요."
        : "방문객(Guest) 모드로 전환되었습니다."
    );
  }

  _bindKeyboardAndPick() {
    const mapKey = (code, down) => {
      if (!this.hasEntered) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (code === "KeyW" || code === "ArrowUp") this.keys.forward = down;
      else if (code === "KeyS" || code === "ArrowDown") this.keys.backward = down;
      else if (code === "KeyA" || code === "ArrowLeft") this.keys.left = down;
      else if (code === "KeyD" || code === "ArrowRight") this.keys.right = down;
      else if (code === "ShiftLeft" || code === "ShiftRight") this.keys.sprint = down;
      else if (code === "Space") this.keys.jump = down;
      else if (down && code === "KeyE" && this.worldState.mode === "guest" && this.nearbySpot) {
        this._triggerInteraction(this.nearbySpot);
      } else if (down && code === "Escape") {
        const stageModal = document.getElementById("wl-stage-modal");
        const finPop = document.getElementById("wl-finance-popover");
        if (stageModal && !stageModal.hidden) stageModal.hidden = true;
        else if (finPop && !finPop.hidden) finPop.hidden = true;
        else if (this.activeGuestId) this._closeGuestCard();
        else if (this.dashboard.isOpen()) this.dashboard.close();
        else if (this.crowd.player.riding) this.leaveAttraction();
      }
    };

    window.addEventListener("keydown", (ev) => mapKey(ev.code, true));
    window.addEventListener("keyup", (ev) => mapKey(ev.code, false));

    this.canvas.addEventListener("click", (ev) => {
      if (!this.hasEntered || this.worldState.mode === "architect" || ev.button !== 0) return;
      if (this.cameraRig.consumeJustDragged()) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.cameraRig.camera);

      const targets = [
        ...this.crowd.getGuestPickables(),
        ...this.pavilion.pickables,
        ...this.flatRide.pickables,
      ];
      const hits = this.raycaster.intersectObjects(targets, false);
      if (hits.length) {
        const ud = hits[0].object.userData;
        if (ud.pickKind === "guest") {
          this._openGuestCard(ud.guestId);
          return;
        } else if (ud.pickKind === "pavilion" || ud.pickKind === "mega_billboard") {
          this.openPavilion(ud.archiveKey);
          return;
        } else if (ud.pickKind === "ride") {
          this.boardAttraction("ride", ud.id);
          return;
        } else if (ud.pickKind === "scenery" && ud.interactiveAction) {
          this._triggerInteraction({
            kind: "scenery",
            id: ud.id,
            action: ud.interactiveAction,
            label: ud.interactiveLabel,
            pos: hits[0].point,
          });
          return;
        }
      }

      // Tap/Click on ground or paths -> smooth Tap-to-Move walking!
      if (this.cameraRig.mode === "guest_third" && !this.crowd.player.riding && this.terrain?.terrainMesh) {
        const groundHits = this.raycaster.intersectObject(this.terrain.terrainMesh, false);
        if (groundHits.length) {
          this.crowd.setPlayerMoveTarget(groundHits[0].point);
        }
      }
    });
  }

  _bindResize() {
    const onResize = () => {
      const parent = this.canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || Math.max(560, window.innerHeight - 64);
      this.renderer.setSize(w, h, false);
      this.composer.setSize(w, h);
      this.cameraRig.setAspect(w, h);
    };
    window.addEventListener("resize", onResize);
    if (typeof ResizeObserver !== "undefined" && this.canvas.parentElement) {
      new ResizeObserver(onResize).observe(this.canvas.parentElement);
    }
    onResize();
  }

  _updateFpsAndAutoGuard(rawDt) {
    this.perf.fpsFrames++;
    this.perf.fpsAccum += rawDt;
    if (this.perf.fpsAccum < 0.75) return;

    const fps = Math.round(this.perf.fpsFrames / Math.max(0.01, this.perf.fpsAccum));
    this.perf.currentFps = fps;
    this.perf.fpsFrames = 0;
    this.perf.fpsAccum = 0;

    const badge = document.getElementById("wl-fps-badge");
    if (badge) badge.textContent = `${fps} FPS`;

    const tele = document.getElementById("wl-perf-telemetry");
    if (tele) {
      const info = this.renderer.info.render;
      const pool = getPoolStats();
      tele.textContent = `Draw ${info.calls} · Tri ${Math.round(info.triangles / 1000)}k · Pool ${pool.toonMaterials}mat`;
    }

    if (this.perf.autoGuard && fps < 24) {
      this.perf.lowFpsStreak++;
      if (this.perf.lowFpsStreak >= 4) {
        this.perf.lowFpsStreak = 0;
        if (this.perf.preset === "high") this.applyPerfPreset("balanced");
        else if (this.perf.preset === "balanced") this.applyPerfPreset("low");
      }
    } else {
      this.perf.lowFpsStreak = 0;
    }
  }

  _updateProximityPrompt() {
    const promptBtn = document.getElementById("wl-interact-prompt");
    const labelEl = document.getElementById("wl-interact-label");
    if (!promptBtn || !labelEl) return;
    if (!this.hasEntered || this.worldState.mode !== "guest" || this.crowd.player.riding) {
      this.nearbySpot = null;
      promptBtn.hidden = true;
      return;
    }

    const pos = this.crowd.player.position;
    const candidates = [
      this.crowd.findNearestGuest(pos, 4.6),
      this.pavilion.findNearestInteractable(pos),
      this.flatRide.findNearestInteractable(pos),
    ].filter(Boolean);

    let chosen = null;
    let bestDist = Infinity;
    for (const c of candidates) {
      const d = pos.distanceTo(c.pos);
      if (d < bestDist) {
        bestDist = d;
        chosen = c;
      }
    }
    this.nearbySpot = chosen;
    if (chosen) {
      labelEl.textContent = chosen.label;
      promptBtn.hidden = false;
    } else {
      promptBtn.hidden = true;
    }
  }

  _loop() {
    if (document.hidden) {
      this._rafId = null;
      return;
    }
    this._rafId = requestAnimationFrame(() => this._loop());
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this._updateFpsAndAutoGuard(rawDt);

    // Track continuous spatial biome blending & auto-morph theme on realm entry!
    const atmoCenter = this.cameraRig.mode === "guest_third" ? this.crowd.player.position : this.cameraRig.focus;
    const biomeState = getDominantZoneAt(atmoCenter.x, atmoCenter.z, this.activeStageId);
    if (this.hasEntered && biomeState.zoneId !== this.activeStageId) {
      this._onEnterRealm(biomeState.zoneId);
    }
    this.atmosphere.update(dt, atmoCenter, biomeState);

    const skyState = this.atmosphere.getSkyState();
    const isNight = Boolean(skyState.isNight);
    if (this.bloomPass) {
      const targetStrength = (this.atmosphere.getTimeKey() === "night" ? 0.56 : 0.12) + (skyState.bloomBoost || 0);
      this.bloomPass.strength += (targetStrength - this.bloomPass.strength) * Math.min(1, dt * 4);
    }

    this.terrain.update(dt, isNight);
    this.skyDecor.update(dt, skyState, this.cameraRig.camera.position);
    this.coaster.update(dt, isNight);
    this.flatRide.update(dt, isNight, this.cameraRig.camera.position);
    this.pavilion.update(isNight);

    const basis = this.cameraRig.getGroundBasis();
    const walkInput = this.hasEntered && this.cameraRig.mode === "guest_third" ? this.keys : null;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || 640;

    this.crowd.player.root.visible = this.cameraRig.mode !== "ride_pov";
    this.crowd.update(dt, walkInput, basis, this.coaster, this.flatRide, this.cameraRig.camera, w, h, {
      isRaining: this.atmosphere.isRaining(),
    });

    if (this.activeGuestId) {
      const gSnap = this.crowd.getGuestSnapshot(this.activeGuestId);
      if (gSnap && gSnap.stateLabel.includes("대화 중")) {
        this._renderGuestCard(gSnap);
      } else if (!this.crowd.activeTalkingGuestId) {
        const card = document.getElementById("wl-guest-card");
        if (card) card.hidden = true;
        this.activeGuestId = null;
      }
    }

    const riding = this.crowd.player.riding;
    const rideSeat = riding
      ? riding.kind === "coaster"
        ? this.coaster.getSeatState(riding.id, 0, riding.carIndex || 0)
        : this.flatRide.getRideSeatState(riding.id)
      : null;

    this.cameraRig.update(dt, {
      playerPos: this.crowd.player.position,
      rideSeat,
      panInput: this.cameraRig.mode === "drone" || this.cameraRig.mode === "architect" ? this.keys : null,
    });

    this.hud.updateRideTelemetry(rideSeat);
    this.audio.updateRideSound(dt, rideSeat, {
      listenerPos: this.cameraRig.camera.position,
      flatRideEngine: this.flatRide,
      isRaining: this.atmosphere.isRaining(),
      zoneId: this.activeStageId,
    });
    this._updateProximityPrompt();

    this._financeUiAccum += dt;
    if (this._financeUiAccum >= 0.85) {
      this._financeUiAccum = 0;
      this._updateFinanceUi();
    }

    this._presenceAccum += dt;
    if (this._presenceAccum >= 0.16 && this.chat) {
      this._presenceAccum = 0;
      const p = this.crowd.player;
      this.chat.broadcastState({
        classKey: p.classKey,
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        facing: p.facing,
        action: p.riding
          ? "Sit"
          : this.keys.forward ||
              this.keys.backward ||
              this.keys.left ||
              this.keys.right ||
              Math.abs(this.keys.analogX) > 0.08 ||
              Math.abs(this.keys.analogY) > 0.08 ||
              Boolean(p.moveTarget)
            ? "Walk"
            : "Idle",
        zone: p.riding ? "어트랙션 탑승" : (STAGE_PALETTES[this.activeStageId]?.name || "위클리랜드 통합 대륙"),
        riding: p.riding,
      });
    }

    this.renderer.info.reset();
    if (this.perf.bloom) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.cameraRig.camera);
    }
  }
}

initThemeToggle();
const weeklyLandApp = new WeeklyLandApp();
window.__weeklyland = weeklyLandApp;
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && !weeklyLandApp._rafId) {
    weeklyLandApp.clock.getDelta();
    weeklyLandApp._loop();
  }
});
