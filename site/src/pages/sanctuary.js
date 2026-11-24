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
    dirLight.shadow.camera.far = 360;
    const d = 148;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0004;

    this.scene.add(ambientLight, hemiLight, dirLight);
    return { ambientLight, hemiLight, dirLight };
  }

  async boot() {
    const worldRes = await fetch("data/park_world.json", { cache: "no-cache" });
    const baseWorld = await worldRes.json();

    this.worldState = new ParkWorldState(baseWorld);
    this.publisher = new ParkPublisher(this.worldState);

    if (this.publisher.isLocalDev()) {
      const draft = await this.worldState.loadDraft().catch(() => null);
      if (draft) {
        this.worldState.data = draft;
        this.worldState.dirty = true;
      }
    }

    const snap = this.worldState.getSnapshot();
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
    this.crowd.setSpawnPosition(entrance.x, entrance.z);
    this.crowd.setParkWorldContext(snap);
    this.cameraRig.focus.set(entrance.x, 3.0, entrance.z - 6);
    this.cameraRig.targetFocus.set(entrance.x, 3.0, entrance.z - 6);
    this.cameraRig.distance = 22;
    this.cameraRig.targetDistance = 22;
    this.cameraRig.pitch = 0.28;
    this.cameraRig.targetPitch = 0.28;

    this.atmosphere = new SanctuaryAtmosphere(this.scene, this.lights, {}, {
      onFestivalEvent: (ev) => this._handleFestivalEvent(ev),
    });
    this.atmosphere.setTimeMode("day");

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
    this._bindWelcomeGate();
    this._bindGuestCard();
    this._bindMobileControls();
    this._bindKeyboardAndPick();
    this._bindResize();

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

    if (mode === "drone") {
      this.cameraRig.setMode("drone");
      this.cameraRig.focusOn(new THREE.Vector3(0, 6, 12), 96);
      this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
      this.hud.showToast("드론 시점으로 위클리랜드에 입장했습니다! WASD로 자유롭게 비행하세요.", 4000);
    } else {
      this.cameraRig.setMode("guest_third");
      this.cameraRig.targetDistance = 14.5;
      this.cameraRig.targetPitch = 0.34;
      this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
      this.hud.showToast("위클리랜드 정문에 입장했습니다! 앞쪽 아치를 지나 놀이기구·AI 손님과 상호작용해 보세요.", 4200);
    }
    this.chat?.updateZoneLabel("위클리랜드 정문 광장");
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
      this.atmosphere.cycleTimeMode();
      this._syncAtmoLabels();
    });
    document.getElementById("btn-atmo-season")?.addEventListener("click", () => {
      const labels = this.atmosphere.cycleSeasonMode();
      this._syncAtmoLabels();
      if (labels.seasonKey === "rain") {
        this.hud.showToast("장마 소나기가 내립니다! 공원의 모든 AI 손님과 캐릭터가 우산을 펼칩니다.");
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
    const targetId = kind === "coaster" ? (this.coaster.instances.has(id) ? id : this.coaster.getPrimaryCoasterId()) : id;
    if (!targetId) return;
    this.crowd.boardRide(kind, targetId, 0);
    this.cameraRig.setMode("ride_pov");
    this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
    this.audio.playClick(740);
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
        ? "관리자(Architect) 모드 — 코스터·27종 건물/기구·보행로·300m 지형·철거 도구를 자유롭게 사용하세요."
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
        if (this.activeGuestId) this._closeGuestCard();
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
    this._rafId = requestAnimationFrame(() => this._loop());
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    this._updateFpsAndAutoGuard(rawDt);

    // Track weather & fireworks around active focus (works smoothly in Guest, Drone & Architect!)
    const atmoCenter = this.cameraRig.mode === "guest_third" ? this.crowd.player.position : this.cameraRig.focus;
    this.atmosphere.update(dt, atmoCenter);

    const isNight = this.atmosphere.getTimeKey() === "night";
    if (this.bloomPass) {
      const targetStrength = isNight ? 0.56 : 0.12;
      this.bloomPass.strength += (targetStrength - this.bloomPass.strength) * Math.min(1, dt * 4);
    }

    this.terrain.update(dt, isNight);
    this.skyDecor.update(dt, isNight);
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
    this.audio.updateRideSound(dt, rideSeat);
    this._updateProximityPrompt();

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
        zone: p.riding ? "어트랙션 탑승" : "위클리랜드 광장",
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
window.__weeklyland = new WeeklyLandApp();
