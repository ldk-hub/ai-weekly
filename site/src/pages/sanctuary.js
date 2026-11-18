import * as THREE from "three";
import { loadSpriteActor, loadSanctuaryEnvironment } from "./sanctuary/AssetManager.js";
import { QuarterViewController } from "./sanctuary/QuarterViewController.js";
import { SanctuaryVFX } from "./sanctuary/SanctuaryVFX.js";
import { SanctuaryChat } from "./sanctuary/SanctuaryChat.js";
import { SanctuaryAtmosphere } from "./sanctuary/SanctuaryAtmosphere.js";

const THEME_KEY = "aiw-theme";
const DIR_NAMES = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];

const AVATAR_DEFS = {
  Solar_Guard: {
    displayName: "로얄 아키비스트",
    roleBadge: "ROYAL ARCHIVIST",
    atlasUrl: "assets/sprites/Solar_Guard_8dir_atlas.json",
    speed: 5.5,
  },
  Astral_Sage: {
    displayName: "아스트랄 위버",
    roleBadge: "ASTRAL WEAVER",
    atlasUrl: "assets/sprites/Astral_Sage_8dir_atlas.json",
    speed: 5.2,
  },
  Shadow_Reaper: {
    displayName: "섀도우 크로니클러",
    roleBadge: "CHRONICLE KEEPER",
    atlasUrl: "assets/sprites/Shadow_Reaper_8dir_atlas.json",
    speed: 6.1,
  },
};

const SHRINE_DEFS = [
  {
    id: "plugins",
    title: "인기 플러그인 공방",
    curatorName: "연금술사 엘라",
    roleBadge: "PLUGIN FORGE",
    atlasUrl: "assets/sprites/Curator_Ella_8dir_atlas.json",
    x: -15.0,
    z: -16.2,
    facing: 0.0,
    palette: "holy",
    pageHref: "./",
    pageLabel: "인기 플러그인 ↗",
    overlayHeight: 2.35,
  },
  {
    id: "news",
    title: "AI 뉴스 대도서관",
    curatorName: "뉴스 사서 셀레네",
    roleBadge: "NEWS LIBRARY",
    atlasUrl: "assets/sprites/Astral_Sage_8dir_atlas.json",
    x: 15.0,
    z: -16.2,
    facing: 0.0,
    palette: "arcane",
    pageHref: "news",
    pageLabel: "AI 뉴스 ↗",
    overlayHeight: 2.35,
  },
  {
    id: "social",
    title: "소셜 피드 라운지",
    curatorName: "소셜 바드 루나",
    roleBadge: "SOCIAL SALON",
    atlasUrl: "assets/sprites/Curator_Luna_8dir_atlas.json",
    x: -15.0,
    z: 16.2,
    facing: Math.PI,
    palette: "shadow",
    pageHref: "social",
    pageLabel: "소셜 피드 ↗",
    overlayHeight: 2.35,
  },
  {
    id: "benchmarks",
    title: "벤치마크 관측소",
    curatorName: "벤치마크 나이트 레온",
    roleBadge: "OBSERVATORY",
    atlasUrl: "assets/sprites/Curator_Leon_8dir_atlas.json",
    x: 15.0,
    z: 16.2,
    facing: Math.PI,
    palette: "emerald",
    pageHref: "benchmarks",
    pageLabel: "점유율·성능 ↗",
    overlayHeight: 2.45,
  },
];

const CITIZEN_SPAWNS = [
  { id: "cit-1", atlas: "assets/sprites/Citizen_Ranger_8dir_atlas.json", x: -5.5, y: 0.36, z: -5.5, facing: Math.PI * 0.25, action: "Sit", roam: false },
  { id: "cit-2", atlas: "assets/sprites/Citizen_Minstrel_8dir_atlas.json", x: -6.2, y: 0, z: 2.2, facing: 0.6, action: "Idle", roam: true, roamRadius: 5.5 },
  { id: "cit-3", atlas: "assets/sprites/Citizen_Sura_8dir_atlas.json", x: 5.5, y: 0.36, z: 5.5, facing: -Math.PI * 0.75, action: "Sit", roam: false },
  { id: "cit-4", atlas: "assets/sprites/Citizen_Mechanic_8dir_atlas.json", x: -4.2, y: 0.36, z: -16.0, facing: Math.PI * 0.5, action: "Sit", roam: false },
  { id: "cit-5", atlas: "assets/sprites/Citizen_Ranger_8dir_atlas.json", x: 0.0, y: 0, z: -13.5, facing: 0.0, action: "Idle", roam: true, roamRadius: 7.0 },
  { id: "cit-6", atlas: "assets/sprites/Citizen_Minstrel_8dir_atlas.json", x: 0.0, y: 0, z: 14.5, facing: Math.PI, action: "Idle", roam: true, roamRadius: 7.0 },
  { id: "cit-7", atlas: "assets/sprites/Citizen_Sura_8dir_atlas.json", x: -13.0, y: 0, z: 0.2, facing: Math.PI * 0.5, action: "Idle", roam: true, roamRadius: 6.0 },
  { id: "cit-8", atlas: "assets/sprites/Citizen_Mechanic_8dir_atlas.json", x: 13.0, y: 0, z: -0.2, facing: -Math.PI * 0.5, action: "Idle", roam: true, roamRadius: 6.0 },
  { id: "cit-9", atlas: "assets/sprites/Citizen_Minstrel_8dir_atlas.json", x: -24.5, y: 0.04, z: -0.6, facing: 0.2, action: "Idle", roam: false },
  { id: "cit-10", atlas: "assets/sprites/Citizen_Mechanic_8dir_atlas.json", x: 24.5, y: 0.04, z: -0.6, facing: -0.2, action: "Idle", roam: false },
  { id: "cit-11", atlas: "assets/sprites/Citizen_Ranger_8dir_atlas.json", x: -15.0, y: 0, z: -8.0, facing: Math.PI, action: "Idle", roam: true, roamRadius: 4.5 },
  { id: "cit-12", atlas: "assets/sprites/Citizen_Sura_8dir_atlas.json", x: 15.0, y: 0, z: 8.0, facing: 0, action: "Idle", roam: true, roamRadius: 4.5 },
];

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function safeHref(url) {
  const s = String(url || "").trim();
  return /^https?:\/\//i.test(s) ? s : "#";
}

function formatCompact(n) {
  const num = Number(n || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

/* ---------- Soft Sanctuary Chime Audio ---------- */
class SanctuaryAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) this._ensure();
    return this.enabled;
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx?.state === "suspended") this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  playTone(f0, f1, dur = 0.16, type = "sine", peak = 0.08) {
    if (!this.enabled) return;
    const ctx = this._ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, now);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, now + dur);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0004, now + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  playResonate(shrineId) {
    const chords = {
      plugins: [523.25, 659.25, 783.99],
      news: [440, 554.37, 659.25],
      social: [493.88, 622.25, 739.99],
      benchmarks: [392, 493.88, 587.33],
    };
    (chords[shrineId] || chords.plugins).forEach((f, idx) => {
      setTimeout(() => this.playTone(f, f * 1.01, 0.22, "sine", 0.07), idx * 60);
    });
  }
}

function initThemeToggle(onThemeChange) {
  const btn = document.getElementById("theme-toggle");
  const syncLabel = () => {
    const isDark = document.documentElement.dataset.theme !== "light";
    if (btn) btn.textContent = isDark ? "라이트" : "다크";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.content = isDark ? "#090d13" : "#fcfaf6";
    });
    onThemeChange(isDark);
  };
  btn?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    syncLabel();
  });
  syncLabel();
}

/* ---------- Main Sanctuary 2.5D Sunlit Diorama Application ---------- */
class SanctuaryArchiveApp {
  constructor() {
    this.canvas = document.getElementById("sanctuary-canvas");
    this.overlayLayer = document.getElementById("overlay-layer");
    if (!this.canvas || !this.overlayLayer) return;

    this.audio = new SanctuaryAudio();
    this.scene = new THREE.Scene();
    this.renderer = this._createRenderer(this.canvas);
    this.controller = new QuarterViewController(this.canvas, this.canvas.clientWidth / Math.max(1, this.canvas.clientHeight));
    this.vfx = new SanctuaryVFX(this.scene, this.overlayLayer);

    this.raycaster = new THREE.Raycaster();
    this.walkableMeshes = [];
    this.colliders = [];
    this.buildings = [];
    this.envFx = {};
    this.shrines = [];
    this.citizens = [];
    this.remotePeers = new Map(); // clientId -> peer actor record
    this.keys = new Set();
    this.currentZoneName = "중앙 분수 광장";

    this.chat = new SanctuaryChat({
      onNicknameChange: (nick) => {
        this.hero.displayName = nick;
      },
      onSelfPublicChat: (text) => {
        this.hero.chatText = text;
        this.hero.chatUntil = Date.now() + 10000;
      },
      onPeerUpdate: (peerData) => this._upsertRemotePeer(peerData),
      onPeerLeave: (clientId) => this._removeRemotePeer(clientId),
      onPeerPublicChat: (clientId, text) => {
        const p = this.remotePeers.get(clientId);
        if (p) {
          p.chatText = text;
          p.chatUntil = Date.now() + 10000;
        }
      },
      onRemoteFx: (fx) => {
        if (fx?.kind === "firework" && this.atmosphere) {
          this.atmosphere.launchFirework(fx.x ?? null, fx.z ?? null);
        }
      },
      onCommand: (cmd, arg) => this._handleAtmosphereCommand(cmd, arg),
    });

    this.archiveData = {
      plugins: { updated: "최신", items: [] },
      news: { updated: "최신", summary: "", items: [] },
      social: { updated: "최신", items: [] },
      benchmarks: { updated: "최신", shares: [], models: [] },
    };

    this.activeShrineId = "plugins";
    this.selectedPostIndex = -1;
    this.tickerStep = 0;

    this.hero = {
      id: "hero-avatar",
      role: "hero",
      classKey: "Solar_Guard",
      displayName: this.chat?.nickname || AVATAR_DEFS.Solar_Guard.displayName,
      roleBadge: AVATAR_DEFS.Solar_Guard.roleBadge,
      actor: null,
      position: new THREE.Vector3(0, 0, 3.6),
      facingAngle: Math.PI,
      moveTarget: null,
      moveQueue: [],
      pendingShrineId: null,
      isSitting: false,
      castState: null,
      emoteText: "",
      emoteUntil: 0,
      chatText: "",
      chatUntil: 0,
      tickerText: "",
      isActiveShrine: false,
      overlayHeight: 2.5,
    };

    this._lastTime = performance.now();
    this._elapsed = 0;
    this._pointerDownPos = null;
  }

  _createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    return renderer;
  }

  _setupLights() {
    // Golden-Hour Sunlit Plaza Lighting matching concept art
    this.ambientLight = new THREE.AmbientLight(0xfff5db, 0.72);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff4cf, 0x627838, 0.88);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffefc2, 2.55);
    this.dirLight.position.set(-18, 28, 14);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.near = 4;
    this.dirLight.shadow.camera.far = 80;
    const d = 26;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0004;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Glowing Cyan Crystal Fountain Bounce Light
    this.fountainLight = new THREE.PointLight(0x67e8f9, 2.8, 11);
    this.fountainLight.position.set(0, 2.2, 0);
    this.scene.add(this.fountainLight);
  }

  applyTheme() {
    // Keep outdoor city warmly sunlit with wide horizon clarity
    const hazeHex = 0xd9caa4;
    this.scene.background = new THREE.Color(hazeHex);
    this.scene.fog = new THREE.FogExp2(hazeHex, 0.0055);
  }

  async start() {
    this._setupLights();
    initThemeToggle(() => this.applyTheme());
    this._handleResize();

    this.envFx = await loadSanctuaryEnvironment("assets/models/sanctuary_environment.glb", this.scene);
    this.walkableMeshes = this.envFx.walkableMeshes;
    this.colliders = this.envFx.colliders || [];
    this.buildings = this.envFx.buildings || [];
    this.atmosphere = new SanctuaryAtmosphere(
      this.scene,
      { dirLight: this.dirLight, ambientLight: this.ambientLight, hemiLight: this.hemiLight },
      this.envFx
    );
    this._lastAtmoUiSync = 0;
    this._syncAtmoLabels();

    await Promise.all([
      this.switchAvatar("Solar_Guard"),
      this._spawnShrines(),
      this._spawnCitizens(),
      this._loadWebsiteDatasets(),
    ]);

    this._bindEvents();
    this.activateShrine("plugins", false);
    this._startTickerLoop();
    this.chat.start();
    this.chat.updateZoneLabel(this._computeZoneName(this.hero.position));
    this.chat.broadcastState({
      classKey: this.hero.classKey,
      x: this.hero.position.x,
      z: this.hero.position.z,
      facing: this.hero.facingAngle,
      action: "Idle",
      zone: this.currentZoneName,
    }, true);
    this._loop(performance.now());
  }

  async _loadWebsiteDatasets() {
    const fetchSafe = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    };

    const [plugRes, newsRes, socRes, bmRes] = await Promise.allSettled([
      fetchSafe("data/latest.json"),
      fetchSafe("data/news_latest.json"),
      fetchSafe("data/social_latest.json"),
      fetchSafe("data/benchmarks_latest.json"),
    ]);

    if (plugRes.status === "fulfilled" && plugRes.value) {
      const d = plugRes.value;
      const rising = Array.isArray(d.rising) ? d.rising : [];
      const classic = Array.isArray(d.classic) ? d.classic : [];
      this.archiveData.plugins = { updated: d.generated || "최신", items: [...rising, ...classic].slice(0, 16) };
    }
    if (newsRes.status === "fulfilled" && newsRes.value) {
      const d = newsRes.value;
      this.archiveData.news = {
        updated: String(d.generated_at || "").slice(0, 10) || "오늘",
        summary: d.summary || "",
        items: Array.isArray(d.news) ? d.news.slice(0, 16) : [],
      };
    }
    if (socRes.status === "fulfilled" && socRes.value) {
      const d = socRes.value;
      this.archiveData.social = { updated: d.date || "최신", items: Array.isArray(d.items) ? d.items.slice(0, 16) : [] };
    }
    if (bmRes.status === "fulfilled" && bmRes.value) {
      const d = bmRes.value;
      this.archiveData.benchmarks = {
        updated: String(d.updated_at || "").slice(0, 10) || "최신",
        shares: Array.isArray(d.market_shares) ? d.market_shares.slice(0, 6) : [],
        models: Array.isArray(d.model_benchmarks) ? d.model_benchmarks.slice(0, 8) : [],
      };
    }

    this._refreshShrineTickers();
    this.renderReaderPanel();
  }

  async _spawnShrines() {
    this.shrines = await Promise.all(
      SHRINE_DEFS.map(async (def) => {
        const actor = await loadSpriteActor(def.atlasUrl);
        const pos = new THREE.Vector3(def.x, 0, def.z);
        actor.mesh.position.copy(pos);
        actor.mesh.userData.shrineId = def.id;
        this.scene.add(actor.mesh);
        return {
          ...def,
          role: "curator",
          displayName: def.curatorName,
          actor,
          position: pos,
          facingAngle: def.facing,
          emoteText: "",
          emoteUntil: 0,
          tickerText: def.title,
          isActiveShrine: def.id === this.activeShrineId,
        };
      })
    );
  }

  async _spawnCitizens() {
    this.citizens = await Promise.all(
      CITIZEN_SPAWNS.map(async (sp, idx) => {
        const actor = await loadSpriteActor(sp.atlas);
        const pos = new THREE.Vector3(sp.x, sp.y, sp.z);
        actor.mesh.position.copy(pos);
        actor.playAction(sp.action, null, true);
        this.scene.add(actor.mesh);
        return {
          ...sp,
          role: "citizen",
          displayName: "",
          actor,
          position: pos,
          homePos: pos.clone(),
          facingAngle: sp.facing,
          dest: null,
          pauseTimer: 1.5 + idx * 0.7,
        };
      })
    );
  }

  async switchAvatar(classKey) {
    const spec = AVATAR_DEFS[classKey];
    if (!spec) return;
    this.hero.classKey = classKey;
    this.hero.displayName = this.chat?.nickname || spec.displayName;
    this.hero.roleBadge = spec.roleBadge;
    this.hero.isSitting = false;

    const actor = await loadSpriteActor(spec.atlasUrl);
    if (this.hero.actor) {
      this.scene.remove(this.hero.actor.mesh);
      this.hero.actor.dispose();
    }
    this.hero.actor = actor;
    actor.mesh.position.copy(this.hero.position);
    this.scene.add(actor.mesh);

    document.querySelectorAll(".ro-class-btn").forEach((btn) => {
      const active = btn.dataset.heroClass === classKey;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.getElementById("btn-sit")?.classList.remove("is-active");
  }

  _refreshShrineTickers() {
    const idx = this.tickerStep;
    for (const sh of this.shrines) {
      if (sh.id === "plugins" && this.archiveData.plugins.items.length) {
        const p = this.archiveData.plugins.items[idx % this.archiveData.plugins.items.length];
        sh.tickerText = `${p.name} (+${Number(p.velocity_7d || 0).toLocaleString()}★)`;
      } else if (sh.id === "news" && this.archiveData.news.items.length) {
        const n = this.archiveData.news.items[idx % this.archiveData.news.items.length];
        sh.tickerText = n.title_ko || n.headline;
      } else if (sh.id === "social" && this.archiveData.social.items.length) {
        const s = this.archiveData.social.items[idx % this.archiveData.social.items.length];
        sh.tickerText = `${s.author}: ${s.title_ko}`;
      } else if (sh.id === "benchmarks" && this.archiveData.benchmarks.models.length) {
        const m = this.archiveData.benchmarks.models[idx % this.archiveData.benchmarks.models.length];
        sh.tickerText = `${m.model} (${m.arena_coding_elo || m.arena_elo} Elo)`;
      }
    }
  }

  _startTickerLoop() {
    setInterval(() => {
      this.tickerStep += 1;
      this._refreshShrineTickers();
    }, 4500);
  }

  activateShrine(shrineId, walkToIt = true, openReader = false) {
    const shrine = this.shrines.find((s) => s.id === shrineId);
    if (!shrine) return;

    this.activeShrineId = shrineId;
    this.selectedPostIndex = 0;
    this.shrines.forEach((s) => { s.isActiveShrine = s.id === shrineId; });

    document.querySelectorAll("[data-shrine]").forEach((btn) => {
      btn.classList.toggle("is-primary", btn.dataset.shrine === shrineId);
    });

    this.renderReaderPanel();
    if (openReader) {
      const readerEl = document.getElementById("sanctuary-reader");
      if (readerEl) readerEl.hidden = false;
    }

    const dist = this.hero.position.distanceTo(shrine.position);
    if (walkToIt && dist > 2.2) {
      const building = this.buildings.find((b) => b.id === shrineId);
      const heroInSameBuilding = building && this._isPointInBounds(this.hero.position, building.interiorBounds);
      const dest = shrine.position.clone().add(new THREE.Vector3(0, 0, shrine.z < 0 ? 1.55 : -1.55));
      dest.y = 0;

      if (building && !heroInSameBuilding) {
        const prefix = this._routePlazaToDoor(this.hero.position, building.doorApproach);
        this._setHeroMovePath([...prefix, building.doorApproach.clone(), building.doorThreshold.clone(), dest], shrineId);
      } else {
        this._setHeroMovePath([dest], shrineId);
      }
      this.hero.isSitting = false;
      document.getElementById("btn-sit")?.classList.remove("is-active");
    } else {
      this._resonateShrine(shrine);
    }
  }

  _resonateShrine(shrine, customLabel = "", customBadge = "") {
    this.hero.facingAngle = Math.atan2(
      shrine.position.x - this.hero.position.x,
      shrine.position.z - this.hero.position.z
    );
    this.hero.actor?.playAction("Cast", () => this.hero.actor?.playAction("Idle", null, true), true);
    shrine.actor.playAction("Cast", () => shrine.actor.playAction("Idle", null, true), true);
    this.vfx.spawnMagicCircle(shrine.position, { radius: 2.2, duration: 2.3, palette: shrine.palette, pillarHeight: 4.5 });
    this.audio.playResonate(shrine.id);

    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    let text = customLabel;
    let tag = customBadge;
    let type = "magic";

    if (!text) {
      if (shrine.id === "plugins" && this.archiveData.plugins.items[0]) {
        const p = this.archiveData.plugins.items[0];
        text = `+${Number(p.velocity_7d || 0).toLocaleString()}★ ${p.name}`;
        tag = "RISING #1";
        type = "crit";
      } else if (shrine.id === "news" && this.archiveData.news.items[0]) {
        const n = this.archiveData.news.items[0];
        text = `${n.category_name} · 중요도 ${n.importance}`;
        tag = "TODAY AI";
        type = "magic";
      } else if (shrine.id === "social" && this.archiveData.social.items[0]) {
        const s = this.archiveData.social.items[0];
        text = `${s.author} ♥ ${formatCompact(s.metrics?.likes || 0)}`;
        tag = "HOT FEED";
        type = "heal";
      } else if (shrine.id === "benchmarks" && this.archiveData.benchmarks.models[0]) {
        const m = this.archiveData.benchmarks.models[0];
        text = `${m.model} · ${m.arena_coding_elo || m.arena_elo} Elo`;
        tag = "CODING #1";
        type = "crit";
      } else {
        text = shrine.title;
      }
    }

    this.vfx.spawnFloatingBadge(shrine.position, text, type, tag, this.controller.camera, w, h);
  }

  triggerEmote(code) {
    this.hero.emoteText = code;
    this.hero.emoteUntil = performance.now() + 2600;
    this.audio.playTone(code === "/lv" ? 660 : 520, 780, 0.14, "sine", 0.06);
  }

  toggleSit() {
    this.hero.isSitting = !this.hero.isSitting;
    if (this.hero.isSitting) {
      this.hero.moveTarget = null;
      this.hero.pendingShrineId = null;
      this.vfx.setMoveTargetMarker(null);
      this.hero.actor?.playAction("Sit", null, true);
    } else {
      this.hero.actor?.playAction("Idle", null, true);
    }
    document.getElementById("btn-sit")?.classList.toggle("is-active", this.hero.isSitting);
  }

  renderReaderPanel() {
    const shrine = SHRINE_DEFS.find((s) => s.id === this.activeShrineId) || SHRINE_DEFS[0];
    const titleEl = document.getElementById("reader-title");
    const subEl = document.getElementById("reader-sub");
    const linkEl = document.getElementById("reader-page-link");
    const listEl = document.getElementById("reader-list");
    if (!listEl) return;

    if (titleEl) titleEl.textContent = shrine.title;
    if (linkEl) {
      linkEl.href = shrine.pageHref;
      linkEl.textContent = shrine.pageLabel;
    }

    if (shrine.id === "plugins") {
      const { updated, items } = this.archiveData.plugins;
      if (subEl) subEl.textContent = `data/latest.json · ${updated} · ${items.length}개 프로젝트`;
      listEl.innerHTML = items.map((p, idx) => `
        <button type="button" class="sc-post-card ${this.selectedPostIndex === idx ? "is-selected" : ""}" data-post-idx="${idx}">
          <div class="sc-post-meta">
            <span>${esc(p.name)} · ★ ${Number(p.stars || 0).toLocaleString()} (+${Number(p.velocity_7d || 0).toLocaleString()}/7d)</span>
            <span>${esc((p.sources || []).join(", "))}</span>
          </div>
          <div class="sc-post-title">${esc(p.title_ko)}</div>
          <div class="sc-post-summary">${esc(p.catchphrase || p.summary_ko || "")}</div>
          ${this.selectedPostIndex === idx ? `
            <div class="sc-post-body">
              <div>${esc(p.summary_ko || p.catchphrase || "")}</div>
              <div class="sc-post-foot">
                <span>카테고리: ${esc(p.category || "plugin")} · 트렌드 점수 ${esc(p.trend_score ?? p.score ?? "—")}</span>
                <a class="sc-post-link" href="${esc(safeHref(p.official_url || p.repo_url))}" target="_blank" rel="noopener noreferrer">GitHub 열기 ↗</a>
              </div>
            </div>
          ` : ""}
        </button>
      `).join("");
    } else if (shrine.id === "news") {
      const { updated, items } = this.archiveData.news;
      if (subEl) subEl.textContent = `data/news_latest.json · ${updated} · ${items.length}건 브리핑`;
      listEl.innerHTML = items.map((n, idx) => `
        <button type="button" class="sc-post-card ${this.selectedPostIndex === idx ? "is-selected" : ""}" data-post-idx="${idx}">
          <div class="sc-post-meta">
            <span>${esc(n.category_name)} · ${esc(n.signal_name)}</span>
            <span>중요도 ${esc(n.importance)}</span>
          </div>
          <div class="sc-post-title">${esc(n.title_ko || n.headline)}</div>
          <div class="sc-post-summary">${esc((n.summary_ko || "").replace(/\*\*/g, "").slice(0, 140))}</div>
          ${this.selectedPostIndex === idx ? `
            <div class="sc-post-body">
              <div>${esc(n.body_ko || n.summary_ko || "")}</div>
              <div class="sc-post-foot">
                <span>${esc((n.tags || []).slice(0, 3).map((t) => `#${t}`).join(" "))}</span>
                <a class="sc-post-link" href="${esc(safeHref(n.url))}" target="_blank" rel="noopener noreferrer">기사 원문 ↗</a>
              </div>
            </div>
          ` : ""}
        </button>
      `).join("");
    } else if (shrine.id === "social") {
      const { updated, items } = this.archiveData.social;
      if (subEl) subEl.textContent = `data/social_latest.json · ${updated} · ${items.length}개 피드`;
      listEl.innerHTML = items.map((s, idx) => `
        <button type="button" class="sc-post-card ${this.selectedPostIndex === idx ? "is-selected" : ""}" data-post-idx="${idx}">
          <div class="sc-post-meta">
            <span>${esc(String(s.platform || "").toUpperCase())} · ${esc(s.author)}</span>
            <span>♥ ${esc(formatCompact(s.metrics?.likes || 0))} · 👁 ${esc(formatCompact(s.metrics?.views || 0))}</span>
          </div>
          <div class="sc-post-title">${esc(s.title_ko)}</div>
          <div class="sc-post-summary">${esc(s.summary_ko)}</div>
          ${this.selectedPostIndex === idx ? `
            <div class="sc-post-body">
              <div>${esc(s.text || "")}</div>
              <div class="sc-post-foot">
                <span>${esc((s.tags || []).slice(0, 3).map((t) => `#${t}`).join(" "))}</span>
                <a class="sc-post-link" href="${esc(safeHref(s.url))}" target="_blank" rel="noopener noreferrer">포스트 원문 ↗</a>
              </div>
            </div>
          ` : ""}
        </button>
      `).join("");
    } else {
      const { updated, shares, models } = this.archiveData.benchmarks;
      if (subEl) subEl.textContent = `data/benchmarks_latest.json · ${updated} · 점유율 & 코딩 성능`;
      const shareCards = shares.map((m, idx) => `
        <button type="button" class="sc-post-card ${this.selectedPostIndex === idx ? "is-selected" : ""}" data-post-idx="${idx}">
          <div class="sc-bm-row">
            <strong>#${esc(m.rank)} ${esc(m.name)} (${esc(m.provider)})</strong>
            <span>${esc(m.share_pct)}% (${Number(m.mom_change) >= 0 ? "+" : ""}${esc(m.mom_change)}%)</span>
          </div>
          <div class="sc-bm-bar"><div class="sc-bm-fill" style="transform: scaleX(${Math.min(1, Number(m.share_pct || 0) / 65).toFixed(3)})"></div></div>
          <div class="sc-post-summary">${esc(m.description)}</div>
        </button>
      `).join("");
      const modelCards = models.map((m, idx) => `
        <button type="button" class="sc-post-card ${this.selectedPostIndex === shares.length + idx ? "is-selected" : ""}" data-post-idx="${shares.length + idx}">
          <div class="sc-post-meta">
            <span>${esc(m.provider)} · Coding ${esc(m.coding_composite_score)}점</span>
            <span>Arena Coding ${esc(m.arena_coding_elo || m.arena_elo)} Elo</span>
          </div>
          <div class="sc-post-title">${esc(m.model)}</div>
          <div class="sc-post-summary">컨텍스트 ${esc(m.context_window)} · 입력 \$${esc(m.pricing_in_1m)} / 출력 \$${esc(m.pricing_out_1m)} (1M)</div>
        </button>
      `).join("");
      listEl.innerHTML = shareCards + modelCards;
    }
  }

  _onReaderCardClick(idx) {
    this.selectedPostIndex = this.selectedPostIndex === idx ? -1 : idx;
    this.renderReaderPanel();

    const shrine = this.shrines.find((s) => s.id === this.activeShrineId);
    if (!shrine) return;
    let label = "";
    let tag = "";
    if (shrine.id === "plugins" && this.archiveData.plugins.items[idx]) {
      const p = this.archiveData.plugins.items[idx];
      label = `${p.name} · ★${Number(p.stars || 0).toLocaleString()}`;
      tag = `+${Number(p.velocity_7d || 0).toLocaleString()}★`;
    } else if (shrine.id === "news" && this.archiveData.news.items[idx]) {
      const n = this.archiveData.news.items[idx];
      label = n.title_ko.slice(0, 22);
      tag = n.category_name;
    } else if (shrine.id === "social" && this.archiveData.social.items[idx]) {
      const s = this.archiveData.social.items[idx];
      label = `${s.author} ♥${formatCompact(s.metrics?.likes || 0)}`;
      tag = String(s.platform || "social").toUpperCase();
    } else if (shrine.id === "benchmarks") {
      const shares = this.archiveData.benchmarks.shares;
      if (idx < shares.length) {
        const m = shares[idx];
        label = `${m.name} ${m.share_pct}%`;
        tag = "SHARE";
      } else {
        const bm = this.archiveData.benchmarks.models[idx - shares.length];
        if (bm) {
          label = `${bm.model} (${bm.arena_coding_elo || bm.arena_elo})`;
          tag = "BENCHMARK";
        }
      }
    }
    if (label) this._resonateShrine(shrine, label, tag);
  }

  _isPointInBounds(pt, b) {
    return pt.x >= b.minX && pt.x <= b.maxX && pt.z >= b.minZ && pt.z <= b.maxZ;
  }

  _routePlazaToDoor(from, dest) {
    const inPlaza = Math.abs(from.x) < 9.4 && Math.abs(from.z) < 9.4;
    const destOutside = Math.abs(dest.x) > 9.4 || Math.abs(dest.z) > 9.4;
    if (!inPlaza || !destOutside) return [];
    // Exit via closest open cardinal avenue (W, E, N, or S) before turning into quadrant
    if (Math.abs(dest.x) >= Math.abs(dest.z)) {
      return [new THREE.Vector3(dest.x < 0 ? -12.0 : 12.0, 0, 0)];
    }
    return [new THREE.Vector3(0, 0, dest.z < 0 ? -12.0 : 12.0)];
  }

  _setHeroMovePath(points, pendingShrineId = null) {
    const queue = points.filter(Boolean).map((p) => p.clone());
    if (!queue.length) return;
    this.hero.moveTarget = queue.shift();
    this.hero.moveQueue = queue;
    this.hero.pendingShrineId = pendingShrineId;
    this.vfx.setMoveTargetMarker(queue.length ? queue[queue.length - 1] : this.hero.moveTarget);
  }

  _resolveCityCollisions(nx, nz, radius = 0.45) {
    let x = THREE.MathUtils.clamp(nx, -32.5, 32.5);
    let z = THREE.MathUtils.clamp(nz, -32.5, 32.5);

    // Central crystal fountain basin circle
    const rF = Math.hypot(x, z);
    if (rF < 2.2) {
      x *= 2.2 / Math.max(0.01, rF);
      z *= 2.2 / Math.max(0.01, rF);
    }

    // Solid building walls, plaza corners, and skyline blocks
    for (const box of this.colliders) {
      const closestX = THREE.MathUtils.clamp(x, box.minX, box.maxX);
      const closestZ = THREE.MathUtils.clamp(z, box.minZ, box.maxZ);
      const dx = x - closestX;
      const dz = z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq < radius * radius) {
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          x += (dx / dist) * push;
          z += (dz / dist) * push;
        } else {
          // Inside AABB: push out via nearest face
          const dLeft = Math.abs(x - box.minX);
          const dRight = Math.abs(box.maxX - x);
          const dTop = Math.abs(z - box.minZ);
          const dBot = Math.abs(box.maxZ - z);
          const m = Math.min(dLeft, dRight, dTop, dBot);
          if (m === dLeft) x = box.minX - radius;
          else if (m === dRight) x = box.maxX + radius;
          else if (m === dTop) z = box.minZ - radius;
          else z = box.maxZ + radius;
        }
      }
    }
    return { x, z };
  }

  _handleLeftClick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.controller.camera);

    const peerMeshes = [...this.remotePeers.values()].filter((p) => p.actor?.mesh).map((p) => p.actor.mesh);
    if (peerMeshes.length) {
      const peerHits = this.raycaster.intersectObjects(peerMeshes, false);
      if (peerHits.length > 0) {
        const cid = peerHits[0].object.userData.peerClientId;
        if (cid) this.chat.selectUserThread(cid);
        return;
      }
    }

    const curatorMeshes = this.shrines.map((s) => s.actor.mesh);
    const shrineHits = this.raycaster.intersectObjects(curatorMeshes, false);
    if (shrineHits.length > 0) {
      this.activateShrine(shrineHits[0].object.userData.shrineId, true, true);
      return;
    }

    // Clicking a closed building roof walks the hero straight inside through its doorway
    const visibleRoofs = this.buildings.filter((b) => b.roofGroup.visible).map((b) => b.roofGroup);
    const roofHits = this.raycaster.intersectObjects(visibleRoofs, true);
    if (roofHits.length > 0) {
      const bId = roofHits[0].object.userData.enterBuildingId;
      const building = this.buildings.find((b) => b.id === bId);
      if (building) {
        this.hero.isSitting = false;
        document.getElementById("btn-sit")?.classList.remove("is-active");
        const prefix = this._routePlazaToDoor(this.hero.position, building.doorApproach);
        this._setHeroMovePath([...prefix, building.doorApproach, building.doorThreshold, building.center], null);
        return;
      }
    }

    const groundHits = this.raycaster.intersectObjects(this.walkableMeshes, false);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point.clone();
      const clamped = this._resolveCityCollisions(pt.x, pt.z, 0.5);
      pt.x = clamped.x;
      pt.z = clamped.z;
      pt.y = 0;

      this.hero.isSitting = false;
      document.getElementById("btn-sit")?.classList.remove("is-active");

      const targetBuilding = this.buildings.find((b) => this._isPointInBounds(pt, b.interiorBounds));
      const heroBuilding = this.buildings.find((b) => this._isPointInBounds(this.hero.position, b.interiorBounds));

      if (targetBuilding && heroBuilding?.id !== targetBuilding.id) {
        const path = [];
        if (heroBuilding) {
          path.push(heroBuilding.doorThreshold, heroBuilding.doorApproach);
        } else {
          path.push(...this._routePlazaToDoor(this.hero.position, targetBuilding.doorApproach));
        }
        path.push(targetBuilding.doorApproach, targetBuilding.doorThreshold, pt);
        this._setHeroMovePath(path, null);
      } else if (heroBuilding && !targetBuilding) {
        this._setHeroMovePath([heroBuilding.doorThreshold, heroBuilding.doorApproach, pt], null);
      } else {
        const prefix = this._routePlazaToDoor(this.hero.position, pt);
        this._setHeroMovePath([...prefix, pt], null);
      }
    }
  }

  _computeZoneName(pos) {
    const inside = this.buildings.find((b) => this._isPointInBounds(pos, b.interiorBounds));
    if (inside) return `${inside.title} 내부`;
    if (Math.hypot(pos.x, pos.z) < 10.5) return "중앙 분수 광장";
    if (Math.abs(pos.x) <= 3.6) return pos.z < 0 ? "북쪽 대로" : "남쪽 대로";
    if (Math.abs(pos.z) <= 3.6) return pos.x < 0 ? "서쪽 대로" : "동쪽 대로";
    if (pos.x < 0 && pos.z < 0) return "북서 공방 지구";
    if (pos.x >= 0 && pos.z < 0) return "북동 도서관 지구";
    if (pos.x < 0 && pos.z >= 0) return "남서 라운지 지구";
    return "남동 관측 지구";
  }

  async _upsertRemotePeer(peerData) {
    const cid = peerData.clientId;
    if (!cid) return;
    let rec = this.remotePeers.get(cid);
    if (!rec) {
      rec = {
        id: `peer-${cid}`,
        clientId: cid,
        role: "hero",
        classKey: peerData.classKey || "Solar_Guard",
        displayName: peerData.nickname,
        roleBadge: "USER",
        actor: null,
        loading: true,
        position: new THREE.Vector3(peerData.x || 0, 0, peerData.z || 0),
        targetPos: new THREE.Vector3(peerData.x || 0, 0, peerData.z || 0),
        facingAngle: peerData.facing || 0,
        action: peerData.action || "Idle",
        chatText: "",
        chatUntil: 0,
        overlayHeight: 2.5,
      };
      this.remotePeers.set(cid, rec);
      const spec = AVATAR_DEFS[rec.classKey] || AVATAR_DEFS.Solar_Guard;
      const actor = await loadSpriteActor(spec.atlasUrl);
      if (!this.remotePeers.has(cid)) {
        actor.dispose();
        return;
      }
      actor.mesh.position.copy(rec.position);
      actor.mesh.userData.peerClientId = cid;
      this.scene.add(actor.mesh);
      rec.actor = actor;
      rec.loading = false;
    } else {
      rec.displayName = peerData.nickname;
      rec.targetPos.set(peerData.x || 0, 0, peerData.z || 0);
      rec.facingAngle = peerData.facing ?? rec.facingAngle;
      rec.action = peerData.action || "Idle";
    }
  }

  _removeRemotePeer(clientId) {
    const rec = this.remotePeers.get(clientId);
    if (!rec) return;
    if (rec.actor) {
      this.scene.remove(rec.actor.mesh);
      rec.actor.dispose();
    }
    this.remotePeers.delete(clientId);
  }

  _updateRemotePeers(dt) {
    const alpha = Math.min(1, dt * 10);
    for (const rec of this.remotePeers.values()) {
      if (!rec.actor) continue;
      rec.position.lerp(rec.targetPos, alpha);
      rec.actor.mesh.position.copy(rec.position);
      const moving = rec.position.distanceTo(rec.targetPos) > 0.08 || rec.action === "Walk";
      rec.actor.playAction(moving ? "Walk" : (rec.action === "Sit" ? "Sit" : "Idle"));
      rec.actor.update(dt, this.controller.cameraAzimuth, rec.facingAngle);
    }
  }

  _updateBuildings(dt) {
    for (const b of this.buildings) {
      const inside = this._isPointInBounds(this.hero.position, b.revealBounds);
      const targetOpacity = inside ? 0.0 : 1.0;
      b.roofOpacity += (targetOpacity - b.roofOpacity) * Math.min(1, dt * 10);
      b.roofGroup.visible = b.roofOpacity > 0.04;
      for (const m of b.roofMaterials) {
        m.opacity = b.roofOpacity;
      }
    }
  }

  _updateHero(dt) {
    const { forward, right } = this.controller.getGroundBasis();
    const moveVec = new THREE.Vector3();
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) moveVec.add(forward);
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) moveVec.sub(forward);
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) moveVec.add(right);
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) moveVec.sub(right);

    if (moveVec.lengthSq() > 0.001) {
      this.hero.moveTarget = null;
      this.hero.moveQueue = [];
      this.hero.pendingShrineId = null;
      this.vfx.setMoveTargetMarker(null);
      this.hero.isSitting = false;
      document.getElementById("btn-sit")?.classList.remove("is-active");
      moveVec.normalize();
    } else if (this.hero.moveTarget) {
      const diff = new THREE.Vector3().subVectors(this.hero.moveTarget, this.hero.position);
      diff.y = 0;
      if (diff.length() > 0.25) {
        moveVec.copy(diff.normalize());
      } else if (this.hero.moveQueue?.length) {
        this.hero.moveTarget = this.hero.moveQueue.shift();
      } else {
        this.hero.moveTarget = null;
        this.vfx.setMoveTargetMarker(null);
        if (this.hero.pendingShrineId) {
          const arrived = this.shrines.find((s) => s.id === this.hero.pendingShrineId);
          this.hero.pendingShrineId = null;
          if (arrived) this._resonateShrine(arrived);
        }
      }
    }

    const speed = AVATAR_DEFS[this.hero.classKey].speed;
    if (moveVec.lengthSq() > 0.001) {
      const next = this._resolveCityCollisions(
        this.hero.position.x + moveVec.x * speed * dt,
        this.hero.position.z + moveVec.z * speed * dt
      );
      this.hero.position.set(next.x, 0, next.z);
      this.hero.facingAngle = Math.atan2(moveVec.x, moveVec.z);
      this.hero.actor?.playAction("Walk");

      for (const sh of this.shrines) {
        if (sh.id !== this.activeShrineId && this.hero.position.distanceTo(sh.position) < 2.2) {
          this.activateShrine(sh.id, false);
          break;
        }
      }
    } else if (this.hero.actor && this.hero.actor.currentAction === "Walk") {
      this.hero.actor.playAction(this.hero.isSitting ? "Sit" : "Idle");
    }

    if (this.hero.actor) {
      this.hero.actor.mesh.position.copy(this.hero.position);
    }

    const nextZone = this._computeZoneName(this.hero.position);
    if (nextZone !== this.currentZoneName) {
      this.currentZoneName = nextZone;
      this.chat.updateZoneLabel(nextZone);
    }

    this.chat.broadcastState({
      classKey: this.hero.classKey,
      x: this.hero.position.x,
      z: this.hero.position.z,
      facing: this.hero.facingAngle,
      action: this.hero.actor?.currentAction || "Idle",
      zone: this.currentZoneName,
    }, false);
  }

  _updateCitizens(dt) {
    for (const cit of this.citizens) {
      if (cit.roam) {
        if (cit.pauseTimer > 0) {
          cit.pauseTimer -= dt;
          if (cit.actor.currentAction === "Walk") cit.actor.playAction("Idle");
        } else if (!cit.dest) {
          const ang = Math.random() * Math.PI * 2;
          const r = 1.5 + Math.random() * (cit.roamRadius || 4.0);
          const resolved = this._resolveCityCollisions(
            cit.homePos.x + Math.cos(ang) * r,
            cit.homePos.z + Math.sin(ang) * r,
            0.5
          );
          cit.dest = new THREE.Vector3(resolved.x, 0, resolved.z);
        } else {
          const d = new THREE.Vector3().subVectors(cit.dest, cit.position);
          d.y = 0;
          if (d.length() < 0.25) {
            cit.dest = null;
            cit.pauseTimer = 2.0 + Math.random() * 2.5;
          } else {
            d.normalize();
            const step = this._resolveCityCollisions(
              cit.position.x + d.x * 1.45 * dt,
              cit.position.z + d.z * 1.45 * dt,
              0.45
            );
            cit.position.x = step.x;
            cit.position.z = step.z;
            cit.facingAngle = Math.atan2(d.x, d.z);
            cit.actor.playAction("Walk");
          }
        }
      }
      cit.actor.mesh.position.copy(cit.position);
      cit.actor.update(dt, this.controller.cameraAzimuth, cit.facingAngle);
    }
  }

  _loop(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - this._lastTime) / 1000));
    this._lastTime = now;
    this._elapsed += dt;

    // Animate sunlit diorama fountain, rune circle, flowing water, and golden dust motes
    if (this.envFx.crystalMesh) {
      this.envFx.crystalMesh.rotation.y += dt * 0.9;
      this.envFx.crystalMesh.position.y = 2.25 + Math.sin(this._elapsed * 2.2) * 0.12;
    }
    if (this.envFx.runeDisc) {
      this.envFx.runeDisc.rotation.z += dt * 0.08;
    }
    if (this.envFx.waterTex) {
      this.envFx.waterTex.offset.y -= dt * 0.65;
    }
    if (this.envFx.motes) {
      const posAttr = this.envFx.motes.geometry.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        let y = posAttr.getY(i) + dt * 0.22;
        if (y > 4.6) y = 0.4;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
    }

    this._updateHero(dt);
    this._updateBuildings(dt);
    this.atmosphere?.update(dt, this.hero.position);
    if (now - (this._lastAtmoUiSync || 0) > 400) {
      this._lastAtmoUiSync = now;
      this._syncAtmoLabels();
    }

    // Camera & directional shadow frustum follow hero smoothly across the whole city
    this.controller.update(dt, this.hero.position);
    if (this.dirLight) {
      this.dirLight.position.set(this.hero.position.x - 18, 28, this.hero.position.z + 14);
      this.dirLight.target.position.set(this.hero.position.x, 0, this.hero.position.z);
      this.dirLight.target.updateMatrixWorld();
    }

    const heroSector = this.hero.actor ? this.hero.actor.update(dt, this.controller.cameraAzimuth, this.hero.facingAngle) : 0;
    for (const sh of this.shrines) {
      sh.actor.update(dt, this.controller.cameraAzimuth, sh.facingAngle);
    }
    this._updateCitizens(dt);
    this._updateRemotePeers(dt);
    this.vfx.update(dt, this._elapsed);

    const tele = document.getElementById("hud-cam-telemetry");
    if (tele) {
      tele.textContent = `Azimuth ${this.controller.getAzimuthDegrees()}° · ${DIR_NAMES[heroSector]}`;
    }

    const activePeers = [...this.remotePeers.values()].filter((p) => p.actor);
    this.renderer.render(this.scene, this.controller.camera);
    this.vfx.updateTrackedOverlays(
      [this.hero, ...activePeers, ...this.shrines, ...this.citizens],
      this.controller.camera,
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      now
    );

    requestAnimationFrame((t) => this._loop(t));
  }

  _handleResize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w > 0 && h > 0) {
      this.renderer.setSize(w, h, false);
      this.controller.setAspect(w, h);
    }
  }

  _syncAtmoLabels() {
    if (!this.atmosphere) return;
    const { timeLabel, seasonLabel } = this.atmosphere.getStatusLabels();
    const tBtn = document.getElementById("btn-atmo-time");
    const sBtn = document.getElementById("btn-atmo-season");
    if (tBtn) tBtn.textContent = timeLabel;
    if (sBtn) sBtn.textContent = seasonLabel;
  }

  _launchCelebrationFireworks() {
    if (!this.atmosphere) return;
    const fx1x = this.hero.position.x + (Math.random() - 0.5) * 14;
    const fx1z = this.hero.position.z - 8 + (Math.random() - 0.5) * 10;
    this.atmosphere.launchFirework(fx1x, fx1z);
    setTimeout(() => {
      const fx2x = this.hero.position.x + (Math.random() - 0.5) * 18;
      const fx2z = this.hero.position.z - 6 + (Math.random() - 0.5) * 12;
      this.atmosphere?.launchFirework(fx2x, fx2z);
    }, 260);
    this.chat.broadcastFx("firework", { x: fx1x, z: fx1z });
    this.audio.playTone(587.33, 880, 0.22, "sine", 0.06);
  }

  _handleAtmosphereCommand(cmd, arg = "") {
    if (!this.atmosphere) return;
    const a = String(arg || "").toLowerCase();
    if (cmd === "firework") {
      this._launchCelebrationFireworks();
      this.chat.addSystemMessage("하늘로 축하 불꽃놀이를 발사했습니다!");
      return;
    }
    if (cmd === "time") {
      const map = { "새벽": "dawn", dawn: "dawn", "낮": "day", day: "day", "노을": "sunset", sunset: "sunset", "밤": "night", night: "night", "자동": "auto", auto: "auto" };
      const next = map[a];
      if (next) {
        this.atmosphere.setTimeMode(next);
        this._syncAtmoLabels();
        this.chat.addSystemMessage(`시간대가 ${this.atmosphere.getStatusLabels().timeLabel}(으)로 변경되었습니다.`);
      }
      return;
    }
    if (cmd === "season") {
      const map = { "봄": "spring", spring: "spring", "여름": "summer", summer: "summer", "가을": "autumn", autumn: "autumn", "겨울": "winter", winter: "winter", "자동": "auto", auto: "auto" };
      const next = map[a];
      if (next) {
        this.atmosphere.setSeasonMode(next);
        this._syncAtmoLabels();
        this.chat.addSystemMessage(`계절이 ${this.atmosphere.getStatusLabels().seasonLabel}(으)로 변경되었습니다.`);
      }
    }
  }

  _bindEvents() {
    window.addEventListener("resize", () => this._handleResize());
    if (typeof ResizeObserver !== "undefined" && this.canvas.parentElement) {
      this._resizeObserver = new ResizeObserver(() => this._handleResize());
      this._resizeObserver.observe(this.canvas.parentElement);
    }

    const atmoPill = document.getElementById("sanctuary-atmo-pill");
    if (atmoPill) {
      for (const evName of ["pointerdown", "pointerup", "click"]) {
        atmoPill.addEventListener(evName, (ev) => ev.stopPropagation());
      }
    }
    document.getElementById("btn-atmo-time")?.addEventListener("click", () => {
      this.atmosphere?.cycleTimeMode();
      this._syncAtmoLabels();
    });
    document.getElementById("btn-atmo-season")?.addEventListener("click", () => {
      this.atmosphere?.cycleSeasonMode();
      this._syncAtmoLabels();
    });
    document.getElementById("btn-atmo-firework")?.addEventListener("click", () => {
      this._launchCelebrationFireworks();
    });

    document.getElementById("btn-close-reader")?.addEventListener("click", () => {
      const readerEl = document.getElementById("sanctuary-reader");
      if (readerEl) readerEl.hidden = true;
    });

    document.querySelectorAll(".ro-class-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.switchAvatar(btn.dataset.heroClass));
    });

    document.getElementById("btn-cam-left")?.addEventListener("click", () => this.controller.rotateBy(-Math.PI / 4));
    document.getElementById("btn-cam-right")?.addEventListener("click", () => this.controller.rotateBy(Math.PI / 4));
    document.getElementById("btn-cam-reset")?.addEventListener("click", () => this.controller.resetView());

    const audioBtn = document.getElementById("btn-master-audio");
    audioBtn?.addEventListener("click", () => {
      const on = this.audio.toggle();
      audioBtn.setAttribute("aria-pressed", on ? "true" : "false");
      audioBtn.textContent = on ? "효과음 ON" : "음소거";
    });

    const readerBtn = document.getElementById("btn-toggle-reader");
    const gridEl = document.querySelector(".sc-archive-grid");
    readerBtn?.addEventListener("click", () => {
      const wide = gridEl?.classList.toggle("is-wide");
      readerBtn.classList.toggle("is-active", !wide);
      readerBtn.setAttribute("aria-pressed", wide ? "false" : "true");
      readerBtn.textContent = wide ? "리더 열기" : "리더";
      requestAnimationFrame(() => this._handleResize());
    });

    document.querySelectorAll("[data-shrine]").forEach((btn) => {
      btn.addEventListener("click", () => this.activateShrine(btn.dataset.shrine, true));
    });

    document.getElementById("btn-sit")?.addEventListener("click", () => this.toggleSit());
    document.querySelectorAll("[data-emote]").forEach((btn) => {
      btn.addEventListener("click", () => this.triggerEmote(btn.dataset.emote));
    });

    document.getElementById("reader-list")?.addEventListener("click", (ev) => {
      if (ev.target.closest("a")) return;
      const card = ev.target.closest("[data-post-idx]");
      if (card) this._onReaderCardClick(Number(card.dataset.postIdx));
    });

    this.canvas.addEventListener("pointerdown", (ev) => {
      if (ev.button === 0) this._pointerDownPos = { x: ev.clientX, y: ev.clientY };
    });
    this.canvas.addEventListener("pointerup", (ev) => {
      if (ev.button === 0 && this._pointerDownPos) {
        const moved = Math.hypot(ev.clientX - this._pointerDownPos.x, ev.clientY - this._pointerDownPos.y);
        this._pointerDownPos = null;
        if (moved < 6) this._handleLeftClick(ev.clientX, ev.clientY);
      }
    });

    window.addEventListener("keydown", (ev) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (ev.code === "Escape") document.activeElement.blur();
        return;
      }
      if (ev.code === "Enter") {
        ev.preventDefault();
        this.chat.focusInput();
        return;
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(ev.code)) {
        if (ev.code.startsWith("Arrow")) ev.preventDefault();
        this.keys.add(ev.code);
      } else if (ev.code === "Digit1") {
        this.activateShrine("plugins", true);
      } else if (ev.code === "Digit2") {
        this.activateShrine("news", true);
      } else if (ev.code === "Digit3") {
        this.activateShrine("social", true);
      } else if (ev.code === "Digit4") {
        this.activateShrine("benchmarks", true);
      } else if (ev.code === "KeyF") {
        this._launchCelebrationFireworks();
      } else if (ev.code === "Escape") {
        const readerEl = document.getElementById("sanctuary-reader");
        if (readerEl && !readerEl.hidden) readerEl.hidden = true;
      } else if (ev.code === "Space" && tag !== "BUTTON") {
        ev.preventDefault();
        this.toggleSit();
      }
    });
    window.addEventListener("keyup", (ev) => this.keys.delete(ev.code));
    window.addEventListener("blur", () => this.keys.clear());
  }
}

const app = new SanctuaryArchiveApp();
app.start().catch((err) => console.error("[Sanctuary25D] Boot error:", err));
