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
import { CartoonSkyDecor } from "./weeklyland/ToonMaterials.js";

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
    this.scene.fog = new THREE.FogExp2(0xc4ecff, 0.0036);
    this.skyDecor = new CartoonSkyDecor(this.scene);

    this.renderer = this._createRenderer(this.canvas);
    this.cameraRig = new ParkCameraRig(
      this.canvas,
      this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight)
    );
    this.composer = this._createPostFX();
    this.lights = this._createLights();
    this.audio = new ParkAudioEngine();

    this.keys = { forward: false, backward: false, left: false, right: false, sprint: false, jump: false };
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this._rafId = 0;
    this._presenceAccum = 0;
    this._broadcastPatchTimer = null;

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
    dirLight.position.set(46, 68, 38);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 210;
    const d = 82;
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

    // Restore local unpublished Architect draft automatically on local dev
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
      onCommand: (cmd, arg) => this._handleChatCommand(cmd, arg),
      onRemoteFx: (fx) => this._handleRemoteFx(fx),
    });

    this._bindWorldEvents();
    this._bindAtmosphereButtons();
    this._bindKeyboardAndPick();
    this._bindResize();

    this.hud.updateParkStat(1, this.crowd.getGuestCount());
    this.hud.showToast("위클리랜드 3D에 오신 것을 환영합니다! 어트랙션을 클릭해 바로 탑승해 보세요.", 3800);

    // Non-blocking async enrichment: KayKit 3D GLBs, AI Weekly live feeds, Scrapling coaster presets
    this.crowd.preloadCharacterModels();
    this.architect.loadPresets();
    this.pavilion.loadArchiveData().then(() => {
      const hl = this.pavilion.getLiveParkHighlights();
      this.flatRide.updateBillboardData(hl);
      this.crowd.setGuestReactionLines(hl.guestLines);
    });

    // Optional URL param ?architect=1 for instant builder entry
    if (new URLSearchParams(window.location.search).get("architect") === "1") {
      this.toggleArchitectMode(true);
    }

    this._loop();
  }

  _bindWorldEvents() {
    this.worldState.on("world:changed", ({ scope, data, broadcast }) => {
      if (scope === "all" || scope === "terrain") {
        this.terrain.syncFromConfig(data.terrain, data.paths);
      } else if (scope === "paths") {
        this.terrain.rebuildPaths(data.paths);
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
      if (broadcast && this.worldState.mode === "architect") {
        this._scheduleLiveWorldBroadcast(data);
      }
    });
  }

  _scheduleLiveWorldBroadcast(data) {
    clearTimeout(this._broadcastPatchTimer);
    this._broadcastPatchTimer = setTimeout(() => {
      try {
        // Keep Nostr relay packet light by omitting dense terrain height array in live previews
        const lite = {
          ...data,
          terrain: { ...data.terrain, heights: undefined },
        };
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
    if (ev.type === "countdown") {
      banner.hidden = false;
      text.textContent = `잠시 후 위클리랜드 밤하늘에 불꽃축제가 시작됩니다! (${ev.countdown}초 전)`;
    } else if (ev.type === "start") {
      banner.hidden = false;
      text.textContent = "위클리랜드 야간 불꽃축제가 시작되었습니다!";
    } else if (ev.type === "end") {
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
      this.atmosphere.setTimeMode("night");
      this._syncAtmoLabels();
      this.hud.showToast("밤하늘로 전환했습니다. 곧 야간 불꽃축제가 열립니다!");
    }
  }

  _bindAtmosphereButtons() {
    document.getElementById("btn-atmo-time")?.addEventListener("click", () => {
      this.atmosphere.cycleTimeMode();
      this._syncAtmoLabels();
    });
    document.getElementById("btn-atmo-season")?.addEventListener("click", () => {
      this.atmosphere.cycleSeasonMode();
      this._syncAtmoLabels();
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

  boardAttraction(kind, id) {
    if (this.worldState.mode === "architect") {
      this.toggleArchitectMode(false);
    }
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
      this.cameraRig.focusOn(pos, 26);
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
    if (next === "drone") this.cameraRig.focusOn(new THREE.Vector3(0, 4, 0), 62);
    this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
  }

  toggleArchitectMode(forceState) {
    const next = typeof forceState === "boolean" ? forceState : this.worldState.mode !== "architect";
    if (next && this.crowd.player.riding) this.leaveAttraction();
    this.worldState.setMode(next ? "architect" : "guest");
    this.architect.setActive(next);
    this.cameraRig.setMode(next ? "architect" : "guest_third");
    if (next) this.cameraRig.focusOn(new THREE.Vector3(0, 4, 0), 66);
    this.hud.syncMode(this.worldState.mode, this.cameraRig.mode);
    this.hud.showToast(
      next
        ? "관리자(Architect) 모드 활성화 — 코스터 노드를 드래그하거나 어트랙션을 자유롭게 배치하세요."
        : "방문객(Guest) 모드로 전환되었습니다."
    );
  }

  _bindKeyboardAndPick() {
    const mapKey = (code, down) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (code === "KeyW" || code === "ArrowUp") this.keys.forward = down;
      else if (code === "KeyS" || code === "ArrowDown") this.keys.backward = down;
      else if (code === "KeyA" || code === "ArrowLeft") this.keys.left = down;
      else if (code === "KeyD" || code === "ArrowRight") this.keys.right = down;
      else if (code === "ShiftLeft" || code === "ShiftRight") this.keys.sprint = down;
      else if (code === "Space") this.keys.jump = down;
      else if (down && code === "Escape") {
        if (this.dashboard.isOpen()) this.dashboard.close();
        else if (this.crowd.player.riding) this.leaveAttraction();
      }
    };

    window.addEventListener("keydown", (ev) => mapKey(ev.code, true));
    window.addEventListener("keyup", (ev) => mapKey(ev.code, false));

    // Guest mode 3D picking: click rides to board, click pavilions to open AI Weekly dashboard
    this.canvas.addEventListener("click", (ev) => {
      if (this.worldState.mode === "architect" || ev.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      this.pointer.y = -((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.cameraRig.camera);

      const targets = [...this.pavilion.pickables, ...this.flatRide.pickables];
      const hits = this.raycaster.intersectObjects(targets, false);
      if (!hits.length) return;
      const ud = hits[0].object.userData;
      if (ud.pickKind === "pavilion") {
        this.openPavilion(ud.archiveKey);
      } else if (ud.pickKind === "ride") {
        this.boardAttraction("ride", ud.id);
      }
    });
  }

  _bindResize() {
    const onResize = () => {
      const parent = this.canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth;
      const h = parent?.clientHeight || Math.max(560, window.innerHeight - 58);
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

  _loop() {
    this._rafId = requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.atmosphere.update(dt, this.crowd.player.position);
    const isNight = this.atmosphere.getTimeKey() === "night";
    if (this.bloomPass) {
      const targetStrength = isNight ? 0.56 : 0.12;
      this.bloomPass.strength += (targetStrength - this.bloomPass.strength) * Math.min(1, dt * 4);
    }

    this.terrain.update(dt, isNight);
    this.skyDecor.update(dt, isNight);
    this.coaster.update(dt, isNight);
    this.flatRide.update(dt, isNight);
    this.pavilion.update(isNight);

    const basis = this.cameraRig.getGroundBasis();
    const walkInput = this.cameraRig.mode === "guest_third" ? this.keys : null;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || 640;

    this.crowd.player.root.visible = this.cameraRig.mode !== "ride_pov";
    this.crowd.update(dt, walkInput, basis, this.coaster, this.flatRide, this.cameraRig.camera, w, h);

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

    // Sync multiplayer avatar presence at ~6Hz
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
        action: p.riding ? "Sit" : this.keys.forward || this.keys.backward || this.keys.left || this.keys.right ? "Walk" : "Idle",
        zone: p.riding ? "어트랙션 탑승" : "위클리랜드 광장",
        riding: p.riding,
      });
    }

    this.composer.render();
  }
}

initThemeToggle();
window.__weeklyland = new WeeklyLandApp();
