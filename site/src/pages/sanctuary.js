import * as THREE from "three";
import { loadSpriteActor, loadSanctuaryEnvironment } from "./sanctuary/AssetManager.js";
import { QuarterViewController } from "./sanctuary/QuarterViewController.js";
import { SanctuaryVFX } from "./sanctuary/SanctuaryVFX.js";
import { SanctuaryChat } from "./sanctuary/SanctuaryChat.js";
import { SanctuaryAtmosphere } from "./sanctuary/SanctuaryAtmosphere.js";
import { PixelVFXEngine } from "./sanctuary/PixelVFXEngine.js";
import {
  SurvivalArena,
  CARD_CATALOG,
  ELEMENT_DEFS,
  getCardTier,
  getUpgradeCost,
} from "./sanctuary/SurvivalArena.js";

const THEME_KEY = "aiw-theme";
const DIR_NAMES = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
const SPRITE_DIR = "assets/sprites";

const HERO_CLASS_ORDER = ["Solar_Guard", "Astral_Sage", "Shadow_Reaper", "Curator_Leon"];

const AVATAR_DEFS = {
  Solar_Guard: {
    shortLabel: "아키비스트",
    displayName: "솔라 아키비스트",
    roleBadge: "ROYAL ARCHIVIST",
    atlasUrl: `${SPRITE_DIR}/Solar_Guard_8dir_atlas.json`,
    dashTint: 0xfbbf24,
    speed: 5.7,
  },
  Astral_Sage: {
    shortLabel: "메이지",
    displayName: "아스트랄 메이지",
    roleBadge: "ASTRAL WEAVER",
    atlasUrl: `${SPRITE_DIR}/Astral_Sage_8dir_atlas.json`,
    dashTint: 0x38bdf8,
    speed: 5.5,
  },
  Shadow_Reaper: {
    shortLabel: "크로니클러",
    displayName: "섀도우 크로니클러",
    roleBadge: "CHRONICLE SCOUT",
    atlasUrl: `${SPRITE_DIR}/Shadow_Reaper_8dir_atlas.json`,
    dashTint: 0xfb7185,
    speed: 6.2,
  },
  Curator_Leon: {
    shortLabel: "나이트",
    displayName: "에메랄드 나이트",
    roleBadge: "ARCHIVE GUARDIAN",
    atlasUrl: `${SPRITE_DIR}/Curator_Leon_8dir_atlas.json`,
    dashTint: 0x34d399,
    speed: 5.9,
  },
};

const SHRINE_DEFS = [
  {
    id: "plugins",
    title: "인기 플러그인 공방",
    curatorName: "연금술사 엘라",
    roleBadge: "PLUGIN FORGE",
    atlasUrl: `${SPRITE_DIR}/Curator_Ella_8dir_atlas.json`,
    x: -15.0,
    z: -16.2,
    facing: 0.0,
    palette: "holy",
    pageHref: "./",
    pageLabel: "인기 플러그인",
    overlayHeight: 2.55,
  },
  {
    id: "news",
    title: "AI 뉴스 대도서관",
    curatorName: "뉴스 사서 셀레네",
    roleBadge: "NEWS LIBRARY",
    atlasUrl: `${SPRITE_DIR}/Astral_Sage_8dir_atlas.json`,
    x: 15.0,
    z: -16.2,
    facing: 0.0,
    palette: "arcane",
    pageHref: "news",
    pageLabel: "AI 뉴스",
    overlayHeight: 2.5,
  },
  {
    id: "social",
    title: "소셜 피드 라운지",
    curatorName: "소셜 바드 루나",
    roleBadge: "SOCIAL SALON",
    atlasUrl: `${SPRITE_DIR}/Curator_Luna_8dir_atlas.json`,
    x: -15.0,
    z: 16.2,
    facing: Math.PI,
    palette: "shadow",
    pageHref: "social",
    pageLabel: "소셜 피드",
    overlayHeight: 2.5,
  },
  {
    id: "benchmarks",
    title: "벤치마크 관측소",
    curatorName: "관측 기사 레온",
    roleBadge: "OBSERVATORY",
    atlasUrl: `${SPRITE_DIR}/Curator_Leon_8dir_atlas.json`,
    x: 15.0,
    z: 16.2,
    facing: Math.PI,
    palette: "emerald",
    pageHref: "benchmarks",
    pageLabel: "점유율·성능",
    overlayHeight: 2.55,
  },
  {
    id: "tavern",
    title: "서쪽 여행자 여관",
    curatorName: "여관 마스터 브론",
    roleBadge: "TRAVELER TAVERN",
    atlasUrl: `${SPRITE_DIR}/Solar_Guard_8dir_atlas.json`,
    x: -24.8,
    z: -1.4,
    facing: Math.PI * 0.5,
    palette: "holy",
    pageHref: "./",
    pageLabel: "위클리 브리핑",
    overlayHeight: 2.55,
  },
  {
    id: "workshop",
    title: "동쪽 장인 아틀리에",
    curatorName: "수석 장인 카일",
    roleBadge: "MASTER ATELIER",
    atlasUrl: `${SPRITE_DIR}/Citizen_Mechanic_8dir_atlas.json`,
    x: 24.8,
    z: -1.4,
    facing: -Math.PI * 0.5,
    palette: "arcane",
    pageHref: "starboard",
    pageLabel: "스타보드",
    overlayHeight: 2.5,
  },
];

const ROOM_DEFS = {
  plugins: { badge: "1 · PLUGIN FORGE", title: "인기 플러그인 공방", pageHref: "./", pageLabel: "인기 플러그인" },
  news: { badge: "2 · NEWS LIBRARY", title: "AI 뉴스 대도서관", pageHref: "news", pageLabel: "AI 뉴스" },
  social: { badge: "3 · SOCIAL SALON", title: "소셜 피드 라운지", pageHref: "social", pageLabel: "소셜 피드" },
  benchmarks: { badge: "4 · OBSERVATORY", title: "벤치마크 관측소", pageHref: "benchmarks", pageLabel: "점유율·성능" },
  tavern: { badge: "5 · TRAVELER TAVERN", title: "서쪽 여행자 여관", pageHref: "./", pageLabel: "위클리 브리핑" },
  workshop: { badge: "6 · MASTER ATELIER", title: "동쪽 장인 아틀리에", pageHref: "starboard", pageLabel: "스타보드" },
};

const CITIZEN_SPAWNS = [
  { id: "cit-1", name: "독서가 마일로", roleBadge: "SCHOLAR", persona: "scholar", atlasUrl: `${SPRITE_DIR}/Citizen_Minstrel_8dir_atlas.json`, x: -5.5, y: 0.22, z: -5.5, facing: Math.PI * 0.25, action: "Sit", roam: false },
  { id: "cit-2", name: "음유시인 아리아", roleBadge: "BARD", persona: "bard", atlasUrl: `${SPRITE_DIR}/Curator_Luna_8dir_atlas.json`, x: -6.2, y: 0, z: 2.2, facing: 0.6, action: "Idle", roam: true, roamRadius: 5.5 },
  { id: "cit-3", name: "명상가 하린", roleBadge: "SCHOLAR", persona: "scholar", atlasUrl: `${SPRITE_DIR}/Astral_Sage_8dir_atlas.json`, x: 5.5, y: 0.22, z: 5.5, facing: -Math.PI * 0.75, action: "Sit", roam: false },
  { id: "cit-4", name: "개발자 다온", roleBadge: "ARTISAN", persona: "artisan", atlasUrl: `${SPRITE_DIR}/Citizen_Mechanic_8dir_atlas.json`, x: -4.2, y: 0.22, z: -16.0, facing: Math.PI * 0.5, action: "Sit", roam: false },
  { id: "cit-5", name: "탐험가 카이", roleBadge: "SCOUT", persona: "scout", atlasUrl: `${SPRITE_DIR}/Citizen_Ranger_8dir_atlas.json`, x: 0.0, y: 0, z: -13.5, facing: 0.0, action: "Idle", roam: true, roamRadius: 7.0 },
  { id: "cit-6", name: "학자 유나", roleBadge: "SCHOLAR", persona: "scholar", atlasUrl: `${SPRITE_DIR}/Curator_Ella_8dir_atlas.json`, x: 0.0, y: 0, z: 14.5, facing: Math.PI, action: "Idle", roam: true, roamRadius: 7.0 },
  { id: "cit-7", name: "모험가 지크", roleBadge: "SCOUT", persona: "scout", atlasUrl: `${SPRITE_DIR}/Citizen_Sura_8dir_atlas.json`, x: -13.0, y: 0, z: 0.2, facing: Math.PI * 0.5, action: "Idle", roam: true, roamRadius: 6.0 },
  { id: "cit-8", name: "연금술사 리오", roleBadge: "ARTISAN", persona: "artisan", atlasUrl: `${SPRITE_DIR}/Solar_Guard_8dir_atlas.json`, x: 13.0, y: 0, z: -0.2, facing: -Math.PI * 0.5, action: "Idle", roam: true, roamRadius: 6.0 },
  { id: "cit-9", name: "단골 기사 가렌", roleBadge: "PATRON", persona: "patron", atlasUrl: `${SPRITE_DIR}/Curator_Leon_8dir_atlas.json`, x: -21.2, y: 0, z: 1.5, facing: -0.4, action: "Idle", roam: false },
  { id: "cit-10", name: "모형 장인 테오", roleBadge: "ARTISAN", persona: "artisan", atlasUrl: `${SPRITE_DIR}/Citizen_Minstrel_8dir_atlas.json`, x: 21.2, y: 0, z: 1.5, facing: 0.4, action: "Idle", roam: false },
  { id: "cit-11", name: "수집가 민지", roleBadge: "ARTISAN", persona: "artisan", atlasUrl: `${SPRITE_DIR}/Shadow_Reaper_8dir_atlas.json`, x: -15.0, y: 0, z: -8.0, facing: Math.PI, action: "Idle", roam: true, roamRadius: 4.5 },
  { id: "cit-12", name: "연구원 세준", roleBadge: "SCHOLAR", persona: "scholar", atlasUrl: `${SPRITE_DIR}/Citizen_Ranger_8dir_atlas.json`, x: 15.0, y: 0, z: 8.0, facing: 0, action: "Idle", roam: true, roamRadius: 4.5 },
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
    this.pixelVfx = new PixelVFXEngine(this.scene);
    this._spDeckSlotFilter = "all";
    this._goalBannerTimer = null;
    this.arena = new SurvivalArena(this.scene, this.pixelVfx, this.vfx, {
      onProfileChanged: () => {
        this._syncSurvivalHud();
        const modal = document.getElementById("sp-card-modal");
        if (modal && !modal.hidden) this.renderCardDeckModal();
      },
      onScoreChanged: (score) => {
        const el = document.getElementById("sp-soccer-score");
        if (el) el.textContent = `${score.blue}:${score.red}`;
      },
      onGoal: (team, score, reward) => {
        const label = team === "blue" ? "BLUE TEAM GOAL!!" : "RED TEAM GOAL!!";
        this.chat?.addSystemMessage(`⚽ ${label} (${score.blue} : ${score.red}) · +${reward} CODE 획득!`);
        this._showArcadeBanner("⚽ GOAL!!", `${label}  BLUE ${score.blue} : ${score.red} RED  (+${reward} CODE)`, 3200);
        this.audio.playTone(523.25, 783.99, 0.28, "triangle", 0.08);
        setTimeout(() => this.audio.playTone(659.25, 1046.5, 0.34, "triangle", 0.08), 120);
      },
      onSkillCast: (kind, element, x, z, facing) => {
        this.chat?.broadcastFx("sp_skill", { skillKind: kind, element, x: +x.toFixed(2), z: +z.toFixed(2), facing: +facing.toFixed(2) });
      },
      onBallKick: (b) => {
        this.chat?.broadcastFx("sp_ball", {
          x: +b.x.toFixed(2),
          y: +b.y.toFixed(2),
          z: +b.z.toFixed(2),
          vx: +b.vx.toFixed(2),
          vy: +b.vy.toFixed(2),
          vz: +b.vz.toFixed(2),
          blue: this.arena?.score.blue || 0,
          red: this.arena?.score.red || 0,
        });
      },
      onBallSync: (b, sc) => {
        this.chat?.broadcastFx("sp_ball", {
          x: +b.x.toFixed(2),
          y: +b.y.toFixed(2),
          z: +b.z.toFixed(2),
          vx: +b.vx.toFixed(2),
          vy: +b.vy.toFixed(2),
          vz: +b.vz.toFixed(2),
          blue: sc.blue,
          red: sc.red,
        });
      },
    });

    this.raycaster = new THREE.Raycaster();
    this.walkableMeshes = [];
    this.colliders = [];
    this.buildings = [];
    this.buildingSigns = [];
    this.screenMeshes = [];
    this.envFx = {};
    this.shrines = [];
    this.citizens = [];
    this.remotePeers = new Map(); // clientId -> peer actor record
    this.keys = new Set();
    this.currentZoneName = "중앙 분수 광장";
    this.currentBuildingId = null;
    this.dashboardDismissedInRoom = false;
    this.activeFilter = "all";
    this.searchQuery = "";

    this.chat = new SanctuaryChat({
      onNicknameChange: (nick) => {
        this.hero.displayName = nick;
        this._syncSurvivalHud();
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
      onRemoteFx: (data) => {
        if (!data) return;
        if (data.kind === "sp_skill") {
          this.arena?.playRemoteSkill(data.skillKind, data.element, data.x || 0, data.z || 0, data.facing || 0);
        } else if (data.kind === "sp_ball") {
          this.arena?.applyRemoteBallState(data);
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
      isRunning: false,
      isJumping: false,
      jumpY: 0,
      jumpVy: 0,
      landingSquashTimer: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashGhostTimer: 0,
      dashDir: new THREE.Vector3(0, 0, -1),
      runDustTimer: 0,
      castState: null,
      emoteText: "",
      emoteUntil: 0,
      chatText: "",
      chatUntil: 0,
      tickerText: "",
      isActiveShrine: false,
      overlayHeight: 2.55,
    };

    // Zero-allocation scratch objects for 60fps loop
    this._tmpMoveVec = new THREE.Vector3();
    this._tmpDiffVec = new THREE.Vector3();
    this._tmpCitDiffVec = new THREE.Vector3();
    this._overlayActors = [];
    this._lastDirTap = { code: "", at: 0 };
    this._tickerTimer = null;
    this._rafId = 0;
    this._disposed = false;

    this._lastTime = performance.now();
    this._elapsed = 0;
    this._pointerDownPos = null;
  }

  _createRenderer(canvas) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    // Cap pixelRatio at 1.5 to cut Retina GPU framebuffer memory by 44% with crisp visuals
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    return renderer;
  }

  _setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xfff5db, 0.72);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff4cf, 0x627838, 0.88);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffefc2, 2.55);
    this.dirLight.position.set(-18, 28, 14);
    this.dirLight.castShadow = true;
    // 1024x1024 shadow map cuts shadow VRAM by 75% (16MB -> 4MB) with soft PCF edges
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 4;
    this.dirLight.shadow.camera.far = 75;
    const d = 24;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

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
    this.screenMeshes = this.buildings.flatMap((b) => b.screenMeshes || []);
    this._spawnBuildingSigns();
    this.atmosphere = new SanctuaryAtmosphere(
      this.scene,
      { dirLight: this.dirLight, ambientLight: this.ambientLight, hemiLight: this.hemiLight },
      this.envFx,
      { onFestivalEvent: (ev) => this._handleFestivalEvent(ev) }
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
    this._syncSurvivalHud();
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

  _spawnBuildingSigns() {
    this.buildingSigns = this.buildings.map((b) => {
      const def = ROOM_DEFS[b.id] || { badge: b.id.toUpperCase(), title: b.title };
      const signPos = b.center.clone().lerp(b.doorApproach, 0.55);
      signPos.y = 0;
      return {
        id: `bldg-sign-${b.id}`,
        buildingId: b.id,
        role: "building",
        displayName: def.title,
        roleBadge: def.badge,
        position: signPos,
        overlayHeight: 4.25,
        hiddenOverlay: false,
        onClick: () => this.enterBuildingById(b.id, { warpToDoor: false }),
      };
    });
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
      const rising = (Array.isArray(d.rising) ? d.rising : []).map((p) => ({ ...p, _tier: "rising" }));
      const classic = (Array.isArray(d.classic) ? d.classic : []).map((p) => ({ ...p, _tier: "classic" }));
      this.archiveData.plugins = { updated: d.generated || "최신", items: [...rising, ...classic].slice(0, 24) };
    }
    if (newsRes.status === "fulfilled" && newsRes.value) {
      const d = newsRes.value;
      this.archiveData.news = {
        updated: String(d.generated_at || "").slice(0, 10) || "오늘",
        summary: d.summary || "",
        items: Array.isArray(d.news) ? d.news.slice(0, 24) : [],
      };
    }
    if (socRes.status === "fulfilled" && socRes.value) {
      const d = socRes.value;
      this.archiveData.social = { updated: d.date || "최신", items: Array.isArray(d.items) ? d.items.slice(0, 24) : [] };
    }
    if (bmRes.status === "fulfilled" && bmRes.value) {
      const d = bmRes.value;
      this.archiveData.benchmarks = {
        updated: String(d.updated_at || "").slice(0, 10) || "최신",
        shares: Array.isArray(d.market_shares) ? d.market_shares.slice(0, 8) : [],
        models: Array.isArray(d.model_benchmarks) ? d.model_benchmarks.slice(0, 12) : [],
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
        actor.setUserData("shrineId", def.id);
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
          chatText: "",
          chatUntil: 0,
          tickerText: def.title,
          isActiveShrine: def.id === this.activeShrineId,
          onClick: () => this.activateShrine(def.id, true, true),
        };
      })
    );
  }

  async _spawnCitizens() {
    const now = Date.now();
    this.citizens = await Promise.all(
      CITIZEN_SPAWNS.map(async (sp, idx) => {
        const actor = await loadSpriteActor(sp.atlasUrl);
        const pos = new THREE.Vector3(sp.x, sp.y, sp.z);
        actor.mesh.position.copy(pos);
        actor.setUserData("citizenId", sp.id);
        actor.playAction(sp.action || "Idle", null, true);
        this.scene.add(actor.mesh);
        return {
          ...sp,
          role: "citizen",
          displayName: sp.name || "",
          roleBadge: sp.roleBadge || "CITIZEN",
          actor,
          position: pos,
          homePos: pos.clone(),
          facingAngle: sp.facing,
          dest: null,
          overlayHeight: 2.38,
          chatText: "",
          chatUntil: 0,
          aiState: sp.roam ? "idle" : (sp.action === "Sit" ? "sit" : "idle"),
          stateUntil: 0,
          pauseTimer: 1.2 + idx * 0.55,
          nextSpeakAt: now + 2200 + idx * 1700,
          greetCooldownUntil: 0,
          socialCooldownUntil: now + 3500 + idx * 800,
          pendingReply: null,
        };
      })
    );
  }

  async switchAvatar(classKey) {
    const spec = AVATAR_DEFS[classKey] || AVATAR_DEFS.Solar_Guard;
    const resolvedKey = AVATAR_DEFS[classKey] ? classKey : "Solar_Guard";
    this.hero.classKey = resolvedKey;
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
    actor.setJumpHeight(this.hero.jumpY, 1, 1);
    this.scene.add(actor.mesh);

    const classLabel = document.getElementById("hero-class-text");
    if (classLabel) classLabel.textContent = spec.shortLabel;
    document.querySelectorAll(".ro-class-btn").forEach((btn) => {
      const active = btn.dataset.heroClass === resolvedKey;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.getElementById("btn-sit")?.classList.remove("is-active");
    this._syncSurvivalHud();

    this.chat?.broadcastState?.({
      classKey: this.hero.classKey,
      x: this.hero.position.x,
      z: this.hero.position.z,
      facing: this.hero.facingAngle,
      action: "Idle",
      zone: this.currentZoneName,
    }, true);
  }

  cycleHeroClass() {
    const curIdx = HERO_CLASS_ORDER.indexOf(this.hero.classKey);
    const nextKey = HERO_CLASS_ORDER[(curIdx + 1) % HERO_CLASS_ORDER.length];
    this.switchAvatar(nextKey);
  }

  _countActiveCitizenBubbles(now = Date.now()) {
    return this.citizens.filter((c) => c.chatText && now < (c.chatUntil || 0)).length;
  }

  _speakAsNpc(npc, text, durationMs = 5200) {
    if (!npc || !text) return;
    npc.chatText = text;
    npc.chatUntil = Date.now() + durationMs;
  }

  _pickNpcLine(cit, context = "ambient", peerCit = null) {
    const plugs = this.archiveData.plugins.items;
    const news = this.archiveData.news.items;
    const socials = this.archiveData.social.items;
    const models = this.archiveData.benchmarks.models;
    const topPlug = plugs.length ? plugs[Math.floor(Math.random() * Math.min(5, plugs.length))] : null;
    const topNews = news.length ? news[Math.floor(Math.random() * Math.min(5, news.length))] : null;
    const topSoc = socials.length ? socials[Math.floor(Math.random() * Math.min(5, socials.length))] : null;
    const topModel = models.length ? models[Math.floor(Math.random() * Math.min(4, models.length))] : null;
    const timeKey = this.atmosphere?.getTimeKey?.() || "day";
    const seasonKey = this.atmosphere?.getCurrentSeason?.() || "spring";

    if (context === "firework") {
      return [
        "와! 하늘 위로 불꽃이 터졌어요!",
        "축제 분위기 최고네요! 다 같이 구경해요!",
        "밤하늘이 화려해지니 정말 멋져요!",
      ][Math.floor(Math.random() * 3)];
    }

    if (context === "greet") {
      if (cit.persona === "scholar" && topNews) {
        return `어서 오세요! 방금 '${(topNews.title_ko || topNews.headline || "").slice(0, 18)}…' 소식 확인하셨나요?`;
      }
      if (cit.persona === "artisan" && topPlug) {
        return `반가워요! 요즘 '${topPlug.name}' (+${Number(topPlug.velocity_7d || 0).toLocaleString()}★) 인기가 대단하죠.`;
      }
      if (cit.persona === "patron") {
        return "모험가님! 여관 안쪽 대형 스크린에서 오늘 소식 한번 보고 가세요.";
      }
      return "안녕하세요! 위클리월드에 오신 걸 환영해요!";
    }

    if (context === "social_init" && peerCit) {
      const targetName = (peerCit.displayName || "").split(" ").pop();
      if (cit.persona === "scholar" && topModel) {
        return `${targetName}님, '${topModel.model}' 코딩 점수가 ${topModel.arena_coding_elo || topModel.arena_elo} Elo래요!`;
      }
      if (cit.persona === "artisan" && topPlug) {
        return `${targetName}님, 요즘 '${topPlug.name}' 프로젝트 써보셨어요?`;
      }
      if (cit.persona === "bard" && topSoc) {
        return `${targetName}님, 오늘 '${topSoc.author}'님 피드 보셨나요? 반응이 뜨겁던데요!`;
      }
      return `${targetName}님! 오늘 광장 날씨 정말 좋지 않나요?`;
    }

    if (context === "social_reply") {
      return [
        "오, 저도 방금 도서관 월스크린에서 봤어요!",
        "맞아요! 이번 주 AI 흐름이 정말 빠르네요.",
        "이따가 장인 아틀리에에서 자세히 비교해 봐야겠어요.",
        "그러게요! 덕분에 오늘도 새로운 인사이트 얻어 갑니다.",
      ][Math.floor(Math.random() * 4)];
    }

    const pool = [];
    if (topPlug) pool.push(`'${topPlug.name}' 7일 급상승 +${Number(topPlug.velocity_7d || 0).toLocaleString()}★ 기록 중!`);
    if (topNews) pool.push(`오늘의 헤드라인: ${(topNews.title_ko || topNews.headline || "").slice(0, 24)}…`);
    if (topSoc) pool.push(`${topSoc.author}: '${(topSoc.title_ko || "").slice(0, 20)}…' 화제 중!`);
    if (topModel) pool.push(`프론티어 코딩 ${topModel.model} · ${topModel.arena_coding_elo || topModel.arena_elo} Elo!`);

    if (timeKey === "night") pool.push("밤에는 조명이 켜진 도서관이나 여관 분위기가 최고죠.");
    if (timeKey === "sunset") pool.push("노을 질 때 광장 분수대 주변 산책이 제일 좋더라고요.");
    if (seasonKey === "spring") pool.push("봄 벚꽃잎 날리는 위클리월드 광장은 언제 봐도 예뻐요.");
    if (seasonKey === "winter") pool.push("눈이 포근하게 내리네요! 밤이 되면 화려한 불꽃축제도 열려요.");
    if (cit.persona === "patron") pool.push("여관 브론 사장님 특제 브리핑 들으면서 잠시 쉬어가세요.");
    pool.push("건물 안으로 들어가면 거대한 전면 대시보드가 바로 열려요!");

    return pool[Math.floor(Math.random() * pool.length)];
  }

  _onCitizenClick(citId) {
    const cit = this.citizens.find((c) => c.id === citId);
    if (!cit) return;
    cit.dest = null;
    cit.aiState = "greet_hero";
    cit.stateUntil = Date.now() + 3400;
    cit.greetCooldownUntil = Date.now() + 8000;
    cit.facingAngle = Math.atan2(
      this.hero.position.x - cit.position.x,
      this.hero.position.z - cit.position.z
    );
    const anim = cit.persona === "scholar" ? "Cast" : cit.persona === "bard" ? "Jump" : "Cheer";
    cit.actor?.playAction(anim, () => {
      if (cit.aiState === "greet_hero") {
        cit.actor?.playAction(cit.action === "SitChair" ? "SitChair" : "Idle", null, true);
      }
    }, true);
    this._speakAsNpc(cit, this._pickNpcLine(cit, "greet"), 5600);
    this.audio.playTone(580, 740, 0.12, "sine", 0.05);
  }

  _reactNpcsToFirework() {
    const now = Date.now();
    const candidates = [...this.citizens]
      .sort((a, b) => a.position.distanceTo(this.hero.position) - b.position.distanceTo(this.hero.position))
      .slice(0, 5);
    candidates.forEach((cit, idx) => {
      if (!cit.roam && cit.action === "SitChair") {
        cit.actor?.playAction("Cheer", () => cit.actor?.playAction("SitChair", null, true), true);
      } else {
        cit.dest = null;
        cit.aiState = "greet_hero";
        cit.stateUntil = now + 3200;
        cit.actor?.playAction(idx % 2 === 0 ? "Jump" : "Cheer", () => {
          cit.actor?.playAction("Idle", null, true);
        }, true);
      }
      if (idx < 3) {
        this._speakAsNpc(cit, this._pickNpcLine(cit, "firework"), 4600);
      }
    });
  }

  _reactNpcsToAtmosphere(kind) {
    const now = Date.now();
    const { timeLabel, seasonLabel } = this.atmosphere?.getStatusLabels?.() || {};
    const speaker = this.citizens.find((c) => c.position.distanceTo(this.hero.position) < 18) || this.citizens[0];
    if (!speaker) return;
    speaker.actor?.playAction(speaker.action === "SitChair" ? "SitChair" : "Interact", null, true);
    const msg = kind === "time"
      ? `지금 시각이 ${timeLabel} 분위기로 바뀌었네요!`
      : `계절이 ${seasonLabel}(으)로 바뀌니 풍경이 새롭네요!`;
    this._speakAsNpc(speaker, msg, 4500);
    speaker.nextSpeakAt = now + 10000;
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
      } else if (sh.id === "tavern") {
        sh.tickerText = `여관 라운지 · 접속 ${1 + (this.chat?.peers?.size || 0)}명`;
      } else if (sh.id === "workshop") {
        sh.tickerText = "4대 분야 통합 커맨드 아틀리에";
      }
    }
  }

  _startTickerLoop() {
    this._tickerTimer = setInterval(() => {
      if (!document.hidden) {
        this.tickerStep += 1;
        this._refreshShrineTickers();
      }
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
    this.hero.actor?.playAction("Cheer", () => this.hero.actor?.playAction("Idle", null, true), true);
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

    this._speakAsNpc(shrine, `${shrine.title} 스크린으로 안내해 드릴게요!`, 4200);
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

  enterBuildingById(buildingId, { warpToDoor = false } = {}) {
    const building = this.buildings.find((b) => b.id === buildingId);
    if (!building) return;

    this.hero.isSitting = false;
    document.getElementById("btn-sit")?.classList.remove("is-active");
    this.activeShrineId = buildingId;
    this.shrines.forEach((s) => { s.isActiveShrine = s.id === buildingId; });

    const shrine = this.shrines.find((s) => s.id === buildingId);
    const isEW = building.id === "tavern" || building.id === "workshop";
    const insideTarget = isEW
      ? building.center.clone()
      : shrine
        ? new THREE.Vector3(shrine.x, 0, shrine.z + (shrine.z < 0 ? 1.55 : -1.55))
        : building.center.clone();

    if (this._isPointInBounds(this.hero.position, building.interiorBounds)) {
      this.openRoomDashboard(buildingId);
      return;
    }

    if (warpToDoor) {
      this.closeRoomDashboard();
      this.hero.position.copy(building.doorApproach);
      this.hero.actor?.mesh.position.copy(this.hero.position);
      this.vfx.spawnMagicCircle(building.doorApproach, { radius: 1.5, duration: 1.1, palette: shrine?.palette || "holy", pillarHeight: 2.2 });
      this._setHeroMovePath([building.doorThreshold.clone(), insideTarget], shrine ? buildingId : null);
      return;
    }

    const heroBuilding = this.buildings.find((b) => this._isPointInBounds(this.hero.position, b.interiorBounds));
    const path = [];
    if (heroBuilding) {
      path.push(heroBuilding.doorThreshold.clone(), heroBuilding.doorApproach.clone());
    } else {
      path.push(...this._routePlazaToDoor(this.hero.position, building.doorApproach));
    }
    path.push(building.doorApproach.clone(), building.doorThreshold.clone(), insideTarget);
    this._setHeroMovePath(path, shrine ? buildingId : null);
  }

  exitCurrentBuilding() {
    const heroBuilding = this.buildings.find((b) => this._isPointInBounds(this.hero.position, b.interiorBounds));
    this.closeRoomDashboard();
    if (!heroBuilding) return;
    this.dashboardDismissedInRoom = true;
    this._setHeroMovePath([heroBuilding.doorThreshold.clone(), heroBuilding.doorApproach.clone()], null);
  }

  warpToPlaza() {
    this.closeRoomDashboard();
    this.closeCardDeckModal();
    this.dashboardDismissedInRoom = false;
    const target = new THREE.Vector3(0, 0, 3.6);
    if (this.hero.position.distanceTo(target) > 16) {
      this.hero.position.copy(target);
      this.hero.actor?.mesh.position.copy(target);
      this.vfx.spawnMagicCircle(target, { radius: 1.8, duration: 1.2, palette: "holy", pillarHeight: 2.5 });
      this.hero.moveTarget = null;
      this.hero.moveQueue = [];
      this.vfx.setMoveTargetMarker(null);
    } else {
      const heroBuilding = this.buildings.find((b) => this._isPointInBounds(this.hero.position, b.interiorBounds));
      const path = heroBuilding ? [heroBuilding.doorThreshold.clone(), heroBuilding.doorApproach.clone(), target] : [target];
      this._setHeroMovePath(path, null);
    }
    this._syncDistrictBar();
  }

  warpToSoccer() {
    this.closeRoomDashboard();
    this.closeCardDeckModal();
    this.dashboardDismissedInRoom = false;
    this.hero.isSitting = false;
    const target = new THREE.Vector3(-2.6, 0, 16.2);
    this.hero.position.copy(target);
    this.hero.facingAngle = Math.PI * 0.5;
    this.hero.actor?.mesh.position.copy(target);
    this.hero.moveTarget = null;
    this.hero.moveQueue = [];
    this.vfx.setMoveTargetMarker(null);
    this.pixelVfx?.spawnBurst("poof", { x: target.x, y: 0.9, z: target.z, scale: 2.0 });
    this.vfx.spawnDamageNumber(target.x, 2.2, target.z, "⚽ 강진축구장 입장! Z=슛 · X=속성슛", "magic");
    this._syncDistrictBar();
  }

  _showArcadeBanner(badgeText, mainText, durationMs = 3000) {
    const banner = document.getElementById("sanctuary-festival-banner");
    const badge = document.getElementById("festival-banner-badge");
    const text = document.getElementById("festival-banner-text");
    if (!banner) return;
    if (badge) badge.textContent = badgeText;
    if (text) text.textContent = mainText;
    banner.hidden = false;
    banner.classList.add("is-show");
    clearTimeout(this._goalBannerTimer);
    this._goalBannerTimer = setTimeout(() => {
      if (this.atmosphere?.festivalPhase === "idle" || this.atmosphere?.festivalPhase === "cooldown") {
        banner.hidden = true;
        banner.classList.remove("is-show");
      }
    }, durationMs);
  }

  triggerMelee() {
    if (!this.arena) return;
    this.hero.isSitting = false;
    const isDashing = this.hero.dashTimer > 0;
    const ok = this.arena.triggerMeleeAction(
      { x: this.hero.position.x, y: this.hero.jumpY, z: this.hero.position.z },
      this.hero.facingAngle,
      isDashing
    );
    if (ok) {
      this.hero.actor?.playAction("Cast", () => this.hero.actor?.playAction("Idle", null, true), true);
      this.audio.playTone(280, 520, 0.11, "triangle", 0.065);
    }
  }

  triggerMagic() {
    if (!this.arena) return;
    this.hero.isSitting = false;
    const ok = this.arena.triggerMagicAction(
      { x: this.hero.position.x, y: this.hero.jumpY, z: this.hero.position.z },
      this.hero.facingAngle
    );
    if (ok) {
      this.hero.actor?.playAction("Cast", () => this.hero.actor?.playAction("Idle", null, true), true);
      this.audio.playTone(440, 740, 0.14, "sine", 0.06);
    } else if (this.arena.mp < 16) {
      this.vfx.spawnDamageNumber(this.hero.position.x, 2.0, this.hero.position.z, "MP 부족!", "normal");
    }
  }

  triggerUltimate() {
    if (!this.arena) return;
    this.hero.isSitting = false;
    const ok = this.arena.triggerUltimateAction(
      { x: this.hero.position.x, y: this.hero.jumpY, z: this.hero.position.z },
      this.hero.facingAngle
    );
    if (ok) {
      this.hero.actor?.playAction("Cheer", () => this.hero.actor?.playAction("Idle", null, true), true);
      this.audio.playTone(330, 880, 0.24, "sawtooth", 0.055);
    } else if (this.arena.mp < 50) {
      this.vfx.spawnDamageNumber(this.hero.position.x, 2.0, this.hero.position.z, "필살기 MP 50 필요!", "normal");
    }
  }

  _getAiFlavorForElement(element) {
    if (element === "fire" && this.archiveData.news.items[0]) {
      return `🔥 ${this.archiveData.news.items[0].title_ko || this.archiveData.news.items[0].headline}`;
    }
    if (element === "water" && this.archiveData.benchmarks.models[0]) {
      const m = this.archiveData.benchmarks.models[0];
      return `💧 ${m.model} (${m.arena_coding_elo || m.arena_elo} Elo)`;
    }
    if (element === "wind" && this.archiveData.plugins.items[0]) {
      const p = this.archiveData.plugins.items[0];
      return `🌪️ ${p.name} (+${Number(p.velocity_7d || 0).toLocaleString()}★)`;
    }
    if (element === "earth" && this.archiveData.social.items[0]) {
      const s = this.archiveData.social.items[0];
      return `🪨 ${s.author}: ${s.title_ko}`;
    }
    return `✨ ${ELEMENT_DEFS[element]?.contentDomain || "AI 위클리 연동"}`;
  }

  _syncSurvivalHud() {
    if (!this.arena) return;
    const stats = this.arena.getPlayerStats();
    const spec = AVATAR_DEFS[this.hero.classKey] || AVATAR_DEFS.Solar_Guard;
    const edef = ELEMENT_DEFS[stats.element] || ELEMENT_DEFS.fire;

    const spriteEl = document.getElementById("sp-portrait-sprite");
    if (spriteEl) {
      const sheetUrl = `${SPRITE_DIR}/${this.hero.classKey}_8dir_sheet.png`;
      if (spriteEl.dataset.sheet !== sheetUrl) {
        spriteEl.dataset.sheet = sheetUrl;
        spriteEl.style.backgroundImage = `url("${sheetUrl}")`;
      }
    }
    const nameEl = document.getElementById("sp-hud-name");
    if (nameEl) nameEl.textContent = this.hero.displayName || spec.displayName;
    const pipEl = document.getElementById("sp-hud-el-pip");
    if (pipEl) {
      pipEl.dataset.el = edef.id;
      pipEl.textContent = edef.label;
    }
    const codeEl = document.getElementById("sp-code-badge");
    if (codeEl) codeEl.textContent = `${this.arena.profile.code.toLocaleString()} CODE`;

    const slotMap = [
      ["sp-slot-magic", "MAGIC", stats.magicCard],
      ["sp-slot-boots", "BOOTS", stats.bootsCard],
      ["sp-slot-aura", "AURA", stats.auraCard],
    ];
    for (const [elId, tag, card] of slotMap) {
      const btn = document.getElementById(elId);
      if (!btn || !card) continue;
      btn.className = `sp-slot-card is-tier-${card.tier.id}`;
      const shortName = card.name.split(" ")[0];
      btn.innerHTML = `<span class="sp-slot-head"><span class="sp-slot-tag">${tag}·${ELEMENT_DEFS[card.element].label}</span><span class="sp-slot-lv">Lv.${card.level}</span></span><span class="sp-slot-name">${esc(shortName)}</span>`;
    }
  }

  _syncSurvivalGauges() {
    if (!this.arena) return;
    const spBar = document.getElementById("sp-booster-bar");
    if (spBar) spBar.style.width = `${Math.round((this.arena.booster / this.arena.maxBooster) * 100)}%`;
    const mpBar = document.getElementById("sp-mp-bar");
    if (mpBar) mpBar.style.width = `${Math.round((this.arena.mp / this.arena.maxMp) * 100)}%`;
    const ultBtn = document.getElementById("btn-sp-ult");
    if (ultBtn) ultBtn.classList.toggle("is-ready", this.arena.mp >= 50 && this.arena.ultCooldown <= 0);

    const comboWrap = document.getElementById("sp-combo-badge");
    const comboNum = document.getElementById("sp-combo-num");
    if (comboWrap && comboNum) {
      const show = this.arena.combo >= 2;
      comboWrap.hidden = !show;
      if (show && comboNum.textContent !== String(this.arena.combo)) {
        comboNum.textContent = String(this.arena.combo);
      }
    }
  }

  openCardDeckModal(slotFilter = "all") {
    this.closeRoomDashboard();
    this._spDeckSlotFilter = slotFilter || "all";
    const modal = document.getElementById("sp-card-modal");
    if (modal) modal.hidden = false;
    this.renderCardDeckModal();
  }

  closeCardDeckModal() {
    const modal = document.getElementById("sp-card-modal");
    if (modal) modal.hidden = true;
  }

  _showDeckFeedback(msg) {
    const fb = document.getElementById("sp-deck-feedback");
    if (!fb) return;
    fb.textContent = msg;
    fb.hidden = false;
  }

  renderCardDeckModal() {
    if (!this.arena) return;
    const grid = document.getElementById("sp-card-grid");
    const codeEl = document.getElementById("sp-modal-code");
    if (codeEl) codeEl.textContent = `${this.arena.profile.code.toLocaleString()} CODE`;

    document.querySelectorAll("#sp-deck-tabs [data-slot]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.slot === this._spDeckSlotFilter);
    });
    if (!grid) return;

    const list = CARD_CATALOG.filter((c) => this._spDeckSlotFilter === "all" || c.slot === this._spDeckSlotFilter);
    grid.innerHTML = list.map((c) => {
      const lv = this.arena.profile.cards[c.id] || 0;
      const owned = lv > 0;
      const tier = getCardTier(lv || 1);
      const edef = ELEMENT_DEFS[c.element];
      const equipped = this.arena.profile.equipped[c.slot] === c.id;
      const upgCost = getUpgradeCost(lv || 1);
      const flavor = this._getAiFlavorForElement(c.element);

      return `
        <article class="sp-deck-card is-tier-${tier.id} ${equipped ? "is-equipped" : ""} ${owned ? "" : "is-locked"}">
          <div class="sp-deck-card-top">
            <span style="color:${edef.colorHex}">${c.slot.toUpperCase()} · ${edef.label} (${edef.en})</span>
            <span>${owned ? `Lv.${lv} ${tier.label}` : "미보유"}</span>
          </div>
          <div class="sp-deck-card-name">${esc(c.name)}</div>
          <div class="sp-deck-card-desc">${esc(c.desc)}</div>
          <div class="sp-deck-card-ai">${esc(flavor)}</div>
          <div class="sp-deck-card-foot">
            <button type="button" class="sp-deck-btn is-equip" data-card-equip="${esc(c.id)}" ${!owned || equipped ? "disabled" : ""}>
              ${equipped ? "장착 중" : owned ? "장착" : "잠김"}
            </button>
            <button type="button" class="sp-deck-btn is-upgrade" data-card-upgrade="${esc(c.id)}" ${!owned || lv >= 9 || this.arena.profile.code < upgCost ? "disabled" : ""}>
              ${lv >= 9 ? "MAX BLACK" : `강화 (${upgCost})`}
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  openRoomDashboard(roomId) {
    this.closeCardDeckModal();
    const id = roomId || this.activeShrineId || "plugins";
    if (this.arena && ROOM_DEFS[id]) {
      this.arena.grantContentVisitReward(id, ROOM_DEFS[id].title, this.hero.position);
    }
    if (this.activeShrineId !== id) {
      this.activeFilter = "all";
      this.searchQuery = "";
      this.selectedPostIndex = 0;
      const searchEl = document.getElementById("reader-search-input");
      if (searchEl) searchEl.value = "";
    }
    this.activeShrineId = id;
    this.dashboardDismissedInRoom = false;
    this.shrines.forEach((s) => { s.isActiveShrine = s.id === id; });

    this.renderReaderPanel();
    const readerEl = document.getElementById("sanctuary-reader");
    if (readerEl) readerEl.hidden = false;
    const reopenBtn = document.getElementById("btn-reopen-screen");
    if (reopenBtn) reopenBtn.hidden = true;
    this._syncDistrictBar();
  }

  minimizeRoomDashboard() {
    const readerEl = document.getElementById("sanctuary-reader");
    if (readerEl) readerEl.hidden = true;
    if (this.currentBuildingId) {
      this.dashboardDismissedInRoom = true;
      const reopenBtn = document.getElementById("btn-reopen-screen");
      if (reopenBtn) reopenBtn.hidden = false;
    }
  }

  closeRoomDashboard() {
    const readerEl = document.getElementById("sanctuary-reader");
    if (readerEl) readerEl.hidden = true;
    const reopenBtn = document.getElementById("btn-reopen-screen");
    if (reopenBtn) reopenBtn.hidden = true;
  }

  _syncDistrictBar() {
    let activeWarp = this.currentBuildingId || "plaza";
    if (!this.currentBuildingId && this.arena) {
      const p = this.arena.pitch;
      if (Math.abs(this.hero.position.x - p.cx) <= p.halfW + 1.5 && Math.abs(this.hero.position.z - p.cz) <= p.halfD + 1.8) {
        activeWarp = "soccer";
      }
    }
    document.querySelectorAll("#sanctuary-district-bar [data-warp]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.warp === activeWarp);
    });
  }

  _getRoomViewModel(roomId) {
    const def = ROOM_DEFS[roomId] || ROOM_DEFS.plugins;
    const onlineCount = 1 + (this.chat?.peers?.size || 0);
    const atmo = this.atmosphere?.getStatusLabels?.() || { timeLabel: "낮", seasonLabel: "봄 · 벚꽃" };

    if (roomId === "plugins") {
      const { updated, items } = this.archiveData.plugins;
      const risingCount = items.filter((p) => p._tier === "rising").length;
      const top = items[0];
      const totalVel = items.reduce((acc, p) => acc + Number(p.velocity_7d || 0), 0);
      return {
        ...def,
        sub: `data/latest.json · ${updated} · ${items.length}개 프로젝트 실시간 연동`,
        kpis: [
          { label: "TRENDING #1", value: top ? top.name : "대기 중", sub: top ? `+${Number(top.velocity_7d || 0).toLocaleString()}★ (7d)` : "데이터 로딩" },
          { label: "TRACKED REPOS", value: `${items.length}개`, sub: `급상승 ${risingCount} · 스테디 ${Math.max(0, items.length - risingCount)}` },
          { label: "7D STAR VELOCITY", value: `+${formatCompact(totalVel)}`, sub: "주간 누적 스타 증가량" },
          { label: "ARCHIVE SYNC", value: updated, sub: "GitHub & 커뮤니티 스캔 완료" },
        ],
        filters: [
          { id: "all", label: `전체 (${items.length})` },
          { id: "rising", label: `급상승 Rising (${risingCount})` },
          { id: "classic", label: `스테디 Classic (${Math.max(0, items.length - risingCount)})` },
        ],
        cards: items.map((p) => ({
          filterId: p._tier || "rising",
          badge: `${p.name} · ★ ${Number(p.stars || 0).toLocaleString()}`,
          metaRight: `+${Number(p.velocity_7d || 0).toLocaleString()}/7d`,
          title: p.title_ko || p.name,
          summary: p.catchphrase || p.summary_ko || "",
          body: `${p.summary_ko || p.catchphrase || ""}\n\n• 출처: ${(p.sources || []).join(", ") || "커뮤니티"}\n• 카테고리: ${p.category || "plugin"} (트렌드 점수 ${p.trend_score ?? p.score ?? "—"})`,
          tags: [p.category || "plugin", ...(p.sources || []).slice(0, 2)],
          linkUrl: safeHref(p.official_url || p.repo_url),
          linkLabel: "GitHub 저장소 열기",
          resonateLabel: `${p.name} · ★${Number(p.stars || 0).toLocaleString()}`,
          resonateTag: `+${Number(p.velocity_7d || 0).toLocaleString()}★`,
          searchHaystack: `${p.name} ${p.title_ko} ${p.catchphrase} ${p.summary_ko} ${p.category}`.toLowerCase(),
        })),
      };
    }

    if (roomId === "news") {
      const { updated, summary, items } = this.archiveData.news;
      const cats = [...new Set(items.map((n) => n.category_name).filter(Boolean))];
      const top = items[0];
      return {
        ...def,
        sub: `data/news_latest.json · ${updated} · ${items.length}건 브리핑${summary ? ` — ${summary.slice(0, 60)}` : ""}`,
        kpis: [
          { label: "HEADLINE #1", value: top ? `중요도 ${top.importance}` : "—", sub: top ? (top.title_ko || top.headline) : "로딩 중" },
          { label: "DAILY BRIEFINGS", value: `${items.length}건`, sub: `${cats.length}개 핵심 토픽` },
          { label: "HIGH SIGNAL (85+)", value: `${items.filter((n) => Number(n.importance) >= 85).length}건`, sub: "우선 주목 AI 기술 신호" },
          { label: "UPDATED", value: updated, sub: "매일 8대 소스 자동 큐레이션" },
        ],
        filters: [
          { id: "all", label: `전체 (${items.length})` },
          ...cats.slice(0, 4).map((c) => ({ id: c, label: c })),
        ],
        cards: items.map((n) => ({
          filterId: n.category_name || "all",
          badge: `${n.category_name || "뉴스"} · ${n.signal_name || ""}`,
          metaRight: `중요도 ${n.importance}`,
          title: n.title_ko || n.headline,
          summary: (n.summary_ko || "").replace(/\*\*/g, "").slice(0, 140),
          body: (n.body_ko || n.summary_ko || "").replace(/\*\*/g, ""),
          tags: Array.isArray(n.tags) ? n.tags : [],
          linkUrl: safeHref(n.url),
          linkLabel: "뉴스 원문 보기",
          resonateLabel: (n.title_ko || n.headline || "").slice(0, 22),
          resonateTag: n.category_name || "NEWS",
          searchHaystack: `${n.title_ko} ${n.headline} ${n.summary_ko} ${n.category_name} ${(n.tags || []).join(" ")}`.toLowerCase(),
        })),
      };
    }

    if (roomId === "social") {
      const { updated, items } = this.archiveData.social;
      const platforms = [...new Set(items.map((s) => String(s.platform || "").toUpperCase()).filter(Boolean))];
      const totalLikes = items.reduce((a, s) => a + Number(s.metrics?.likes || 0), 0);
      const top = items[0];
      return {
        ...def,
        sub: `data/social_latest.json · ${updated} · ${items.length}개 실시간 소셜 피드`,
        kpis: [
          { label: "HOT CREATOR", value: top ? top.author : "—", sub: top ? (top.title_ko || "") : "로딩 중" },
          { label: "CURATED POSTS", value: `${items.length}개`, sub: platforms.join(" · ") || "멀티 플랫폼" },
          { label: "TOTAL LIKES", value: formatCompact(totalLikes), sub: "화이트리스트 인플루언서 반응" },
          { label: "SYNC DATE", value: updated, sub: "X · Threads · Reddit · IG" },
        ],
        filters: [
          { id: "all", label: `전체 (${items.length})` },
          ...platforms.slice(0, 4).map((p) => ({ id: p, label: p })),
        ],
        cards: items.map((s) => {
          const plat = String(s.platform || "").toUpperCase();
          return {
            filterId: plat || "all",
            badge: `${plat} · ${s.author}`,
            metaRight: `좋아요 ${formatCompact(s.metrics?.likes || 0)} · 조회 ${formatCompact(s.metrics?.views || 0)}`,
            title: s.title_ko || s.author,
            summary: s.summary_ko || "",
            body: `${s.summary_ko || ""}\n\n${s.text || ""}`.trim(),
            tags: Array.isArray(s.tags) ? s.tags : [],
            linkUrl: safeHref(s.url),
            linkLabel: "원본 포스트 열기",
            resonateLabel: `${s.author} · ${formatCompact(s.metrics?.likes || 0)}`,
            resonateTag: plat || "SOCIAL",
            searchHaystack: `${s.author} ${s.platform} ${s.title_ko} ${s.summary_ko} ${s.text}`.toLowerCase(),
          };
        }),
      };
    }

    if (roomId === "benchmarks") {
      const { updated, shares, models } = this.archiveData.benchmarks;
      const topShare = shares[0];
      const topModel = models[0];
      const cards = [
        ...shares.map((m) => ({
          filterId: "shares",
          badge: `점유율 #${m.rank} · ${m.provider}`,
          metaRight: `${m.share_pct}% (${Number(m.mom_change) >= 0 ? "+" : ""}${m.mom_change}%)`,
          title: m.name,
          summary: m.description || "",
          body: `${m.description || ""}\n\n• 3사 평균 웹·API 점유율: ${m.share_pct}%\n• 전월 대비 증감: ${Number(m.mom_change) >= 0 ? "+" : ""}${m.mom_change}%`,
          tags: [m.provider, "점유율"],
          scoreBarPct: Math.min(100, (Number(m.share_pct || 0) / 65) * 100),
          linkUrl: "benchmarks",
          linkLabel: "점유율·성능 탭 이동",
          linkSameTab: true,
          resonateLabel: `${m.name} ${m.share_pct}%`,
          resonateTag: "SHARE",
          searchHaystack: `${m.name} ${m.provider} ${m.description}`.toLowerCase(),
        })),
        ...models.map((m) => ({
          filterId: "models",
          badge: `${m.provider} · Coding ${m.coding_composite_score}점`,
          metaRight: `Arena ${m.arena_coding_elo || m.arena_elo} Elo`,
          title: m.model,
          summary: `컨텍스트 ${m.context_window} · 입력 $${m.pricing_in_1m} / 출력 $${m.pricing_out_1m} (1M)`,
          body: `• 코딩 종합 점수: ${m.coding_composite_score}점\n• Arena Coding Elo: ${m.arena_coding_elo || m.arena_elo}\n• 컨텍스트 윈도우: ${m.context_window}\n• 토큰 단가 (1M 기준): 입력 $${m.pricing_in_1m} / 출력 $${m.pricing_out_1m}`,
          tags: [m.provider, "Coding", m.context_window].filter(Boolean),
          linkUrl: "benchmarks",
          linkLabel: "상세 리더보드 열기",
          linkSameTab: true,
          resonateLabel: `${m.model} (${m.arena_coding_elo || m.arena_elo})`,
          resonateTag: "BENCHMARK",
          searchHaystack: `${m.model} ${m.provider} ${m.context_window}`.toLowerCase(),
        })),
      ];
      return {
        ...def,
        sub: `data/benchmarks_latest.json · ${updated} · 점유율 ${shares.length}개 · 모델 ${models.length}개`,
        kpis: [
          { label: "MARKET LEADER", value: topShare ? `${topShare.name} (${topShare.share_pct}%)` : "—", sub: "글로벌 챗봇 점유율 1위" },
          { label: "CODING ELO #1", value: topModel ? topModel.model : "—", sub: topModel ? `${topModel.arena_coding_elo || topModel.arena_elo} Elo` : "로딩 중" },
          { label: "TRACKED MODELS", value: `${models.length}종`, sub: "프론티어 코딩 벤치마크" },
          { label: "UPDATED", value: updated, sub: "멀티 소스 실측 데이터" },
        ],
        filters: [
          { id: "all", label: `전체 (${cards.length})` },
          { id: "shares", label: `시장 점유율 (${shares.length})` },
          { id: "models", label: `코딩 성능 (${models.length})` },
        ],
        cards,
      };
    }

    if (roomId === "tavern") {
      const topPlug = this.archiveData.plugins.items[0];
      const topNews = this.archiveData.news.items[0];
      const totalItems = this.archiveData.plugins.items.length + this.archiveData.news.items.length + this.archiveData.social.items.length;
      const cards = [
        {
          filterId: "lounge",
          badge: "TAVERN GUIDE",
          metaRight: `현재 ${onlineCount}명 접속`,
          title: "위클리월드 다중 유저 채팅 & 야간 불꽃축제 안내",
          summary: "같은 도시나 건물에 접속한 다른 사용자와 실시간 대화하고, 밤마다 공지 후 펼쳐지는 화려한 불꽃축제를 함께 감상하세요.",
          body: "• 전체/1:1 채팅: 좌측 하단 채팅창에서 [전체] 또는 접속 유저 탭을 선택해 대화하세요.\n• 귓속말 명령어: `/w 닉네임 내용` 형태로 특정 유저에게만 메시지를 전달합니다.\n• 닉네임 변경: 채팅창 우측 상단 닉네임 버튼을 클릭해 즉시 변경할 수 있습니다.\n• 야간 불꽃축제: 밤 시간대에만 사전 공지 배너와 함께 화려한 3막 불꽃놀이 쇼가 자동으로 펼쳐집니다 (`/밤` 으로 밤하늘 전환 가능).",
          tags: ["멀티유저", "야간불꽃축제", "실시간"],
          customAction: { id: "night_festival", label: "밤하늘로 전환해 불꽃축제 기다리기" },
          searchHaystack: "채팅 귓속말 닉네임 불꽃놀이 불꽃축제 여관 멀티유저",
        },
        {
          filterId: "lounge",
          badge: "CITY CONTROLS",
          metaRight: `${atmo.timeLabel} · ${atmo.seasonLabel}`,
          title: "이동 · 대시 · 달리기 · 점프 단축키",
          summary: "WASD 이동, Shift 대시/달리기, Space 점프, 건물 퀵워프(0~6)를 지원합니다.",
          body: "• 이동: W/A/S/D 또는 방향키, 바닥/지붕 클릭\n• 대시 & 달리기: Shift 탭(또는 방향키 더블탭)으로 잔상 대시, Shift 홀드로 고속 달리기\n• 점프 & 앉기: Space 키로 도약 점프, X 키로 휴식 앉기\n• 카메라 회전/줌: 마우스 우클릭 드래그, Q/E, 휠 줌\n• 건물 바로 이동: 상단 구역 바 클릭 또는 숫자키 1~6 (0은 중앙 광장)",
          tags: ["대시", "달리기", "점프", "단축키"],
          customAction: { id: "greet", label: "광장 전체 채팅으로 인사 보내기" },
          searchHaystack: "조작법 단축키 이동 대시 달리기 점프 카메라 월스크린",
        },
        ...(topPlug ? [{
          filterId: "hot",
          badge: "TODAY PLUGIN #1",
          metaRight: `+${Number(topPlug.velocity_7d || 0).toLocaleString()}★`,
          title: topPlug.title_ko || topPlug.name,
          summary: topPlug.catchphrase || topPlug.summary_ko || "",
          body: topPlug.summary_ko || topPlug.catchphrase || "",
          tags: ["인기플러그인", topPlug.name],
          linkUrl: safeHref(topPlug.official_url || topPlug.repo_url),
          linkLabel: "GitHub 확인하기",
          searchHaystack: `${topPlug.name} ${topPlug.title_ko}`.toLowerCase(),
        }] : []),
        ...(topNews ? [{
          filterId: "hot",
          badge: "TODAY AI NEWS #1",
          metaRight: `중요도 ${topNews.importance}`,
          title: topNews.title_ko || topNews.headline,
          summary: (topNews.summary_ko || "").slice(0, 120),
          body: (topNews.body_ko || topNews.summary_ko || "").replace(/\*\*/g, ""),
          tags: ["AI뉴스", topNews.category_name].filter(Boolean),
          linkUrl: safeHref(topNews.url),
          linkLabel: "기사 원문 보기",
          searchHaystack: `${topNews.title_ko} ${topNews.category_name}`.toLowerCase(),
        }] : []),
      ];
      return {
        ...def,
        sub: `서쪽 여행자 여관 · 접속 ${onlineCount}명 · ${atmo.timeLabel} · ${atmo.seasonLabel}`,
        kpis: [
          { label: "ONLINE EXPLORERS", value: `${onlineCount}명`, sub: "실시간 P2P 채널 연결됨" },
          { label: "ATMOSPHERE", value: atmo.timeLabel, sub: atmo.seasonLabel },
          { label: "CURRENT ZONE", value: "여관 라운지", sub: "휴식·채팅·위클리 브리핑" },
          { label: "ARCHIVE INDEX", value: `${totalItems}건`, sub: "4대 데이터 피드 실시간 동기화" },
        ],
        filters: [
          { id: "all", label: `전체 (${cards.length})` },
          { id: "lounge", label: "여관 안내 & 단축키" },
          { id: "hot", label: "오늘의 핵심 토픽" },
        ],
        cards,
      };
    }

    // roomId === "workshop" -> 통합 아카이브 커맨드 센터
    const plugCards = this.archiveData.plugins.items.slice(0, 6).map((p) => ({
      filterId: "plugins",
      badge: `PLUGIN · ${p.name}`,
      metaRight: `+${Number(p.velocity_7d || 0).toLocaleString()}★`,
      title: p.title_ko || p.name,
      summary: p.catchphrase || p.summary_ko || "",
      body: p.summary_ko || p.catchphrase || "",
      tags: ["플러그인", p.category || "tool"],
      linkUrl: safeHref(p.official_url || p.repo_url),
      linkLabel: "GitHub 열기",
      searchHaystack: `${p.name} ${p.title_ko} ${p.summary_ko}`.toLowerCase(),
    }));
    const newsCards = this.archiveData.news.items.slice(0, 6).map((n) => ({
      filterId: "news",
      badge: `NEWS · ${n.category_name}`,
      metaRight: `중요도 ${n.importance}`,
      title: n.title_ko || n.headline,
      summary: (n.summary_ko || "").replace(/\*\*/g, "").slice(0, 120),
      body: (n.body_ko || n.summary_ko || "").replace(/\*\*/g, ""),
      tags: ["AI뉴스", ...(n.tags || []).slice(0, 2)],
      linkUrl: safeHref(n.url),
      linkLabel: "기사 원문 보기",
      searchHaystack: `${n.title_ko} ${n.summary_ko}`.toLowerCase(),
    }));
    const socialCards = this.archiveData.social.items.slice(0, 6).map((s) => ({
      filterId: "social",
      badge: `SOCIAL · ${s.author}`,
      metaRight: `좋아요 ${formatCompact(s.metrics?.likes || 0)}`,
      title: s.title_ko || s.author,
      summary: s.summary_ko || "",
      body: `${s.summary_ko || ""}\n\n${s.text || ""}`.trim(),
      tags: ["소셜", String(s.platform || "").toUpperCase()].filter(Boolean),
      linkUrl: safeHref(s.url),
      linkLabel: "포스트 원문 열기",
      searchHaystack: `${s.author} ${s.title_ko} ${s.summary_ko}`.toLowerCase(),
    }));
    const bmCards = this.archiveData.benchmarks.models.slice(0, 6).map((m) => ({
      filterId: "benchmarks",
      badge: `BENCHMARK · ${m.provider}`,
      metaRight: `${m.arena_coding_elo || m.arena_elo} Elo`,
      title: m.model,
      summary: `코딩 종합 ${m.coding_composite_score}점 · 컨텍스트 ${m.context_window}`,
      body: `• 코딩 종합 점수: ${m.coding_composite_score}점\n• Arena Coding Elo: ${m.arena_coding_elo || m.arena_elo}\n• 입력 $${m.pricing_in_1m} / 출력 $${m.pricing_out_1m} (1M)`,
      tags: ["벤치마크", m.provider],
      linkUrl: "benchmarks",
      linkLabel: "성능 탭 보기",
      linkSameTab: true,
      searchHaystack: `${m.model} ${m.provider}`.toLowerCase(),
    }));
    const allWorkshop = [...plugCards, ...newsCards, ...socialCards, ...bmCards];
    return {
      ...def,
      sub: `동쪽 장인 아틀리에 · 4대 위클리 데이터 통합 커맨드 대시보드 (${allWorkshop.length}개 핵심 카드)`,
      kpis: [
        { label: "PLUGINS LOADED", value: `${this.archiveData.plugins.items.length}개`, sub: this.archiveData.plugins.items[0]?.name || "—" },
        { label: "AI NEWS", value: `${this.archiveData.news.items.length}건`, sub: `최고 중요도 ${this.archiveData.news.items[0]?.importance || "—"}` },
        { label: "SOCIAL FEEDS", value: `${this.archiveData.social.items.length}건`, sub: this.archiveData.social.items[0]?.author || "—" },
        { label: "BENCHMARK TOP", value: this.archiveData.benchmarks.models[0]?.model || "—", sub: `${this.archiveData.benchmarks.models[0]?.arena_coding_elo || "—"} Elo` },
      ],
      filters: [
        { id: "all", label: `통합 전체 (${allWorkshop.length})` },
        { id: "plugins", label: `플러그인 (${plugCards.length})` },
        { id: "news", label: `AI 뉴스 (${newsCards.length})` },
        { id: "social", label: `소셜 (${socialCards.length})` },
        { id: "benchmarks", label: `벤치마크 (${bmCards.length})` },
      ],
      cards: allWorkshop,
    };
  }

  renderReaderPanel() {
    const vm = this._getRoomViewModel(this.activeShrineId);
    const badgeEl = document.getElementById("reader-room-badge");
    const titleEl = document.getElementById("reader-title");
    const subEl = document.getElementById("reader-sub");
    const linkEl = document.getElementById("reader-page-link");
    const kpiEl = document.getElementById("reader-kpi-strip");
    const filterEl = document.getElementById("reader-filter-tabs");
    const listEl = document.getElementById("reader-list");
    const detailEl = document.getElementById("reader-detail-pane");
    if (!listEl) return;

    if (badgeEl) badgeEl.textContent = vm.badge;
    if (titleEl) titleEl.textContent = vm.title;
    if (subEl) subEl.textContent = vm.sub;
    if (linkEl) {
      linkEl.href = vm.pageHref;
      const span = linkEl.querySelector("span");
      if (span) span.textContent = vm.pageLabel;
      else linkEl.textContent = vm.pageLabel;
    }

    if (kpiEl) {
      kpiEl.innerHTML = vm.kpis.map((k) => `
        <div class="sc-dash-kpi">
          <span class="sc-dash-kpi-label">${esc(k.label)}</span>
          <strong class="sc-dash-kpi-value">${esc(k.value)}</strong>
          <span class="sc-dash-kpi-sub">${esc(k.sub)}</span>
        </div>
      `).join("");
    }

    if (filterEl) {
      const validIds = new Set(vm.filters.map((f) => f.id));
      if (!validIds.has(this.activeFilter)) this.activeFilter = "all";
      filterEl.innerHTML = vm.filters.map((f) => `
        <button type="button" role="tab" aria-selected="${this.activeFilter === f.id ? "true" : "false"}" class="sc-dash-filter-pill ${this.activeFilter === f.id ? "is-active" : ""}" data-filter-id="${esc(f.id)}">${esc(f.label)}</button>
      `).join("");
    }

    const q = this.searchQuery.trim().toLowerCase();
    const filtered = vm.cards.filter((c) => {
      if (this.activeFilter !== "all" && c.filterId !== this.activeFilter) return false;
      if (q && !c.searchHaystack.includes(q)) return false;
      return true;
    });

    if (!filtered.length) {
      this._visibleCards = [];
      listEl.innerHTML = `<div class="sc-post-card"><div class="sc-post-title">조건에 맞는 항목이 없습니다.</div><div class="sc-post-summary">검색어를 지우거나 [전체] 필터를 선택하세요.</div></div>`;
      if (detailEl) {
        detailEl.innerHTML = `<span class="sc-detail-badge">${esc(vm.badge)}</span><h3 class="sc-detail-title">표시할 항목 없음</h3><p class="sc-detail-body">현재 필터 또는 검색 조건에 일치하는 데이터가 없습니다.</p>`;
      }
      return;
    }

    if (this.selectedPostIndex < 0 || this.selectedPostIndex >= filtered.length) {
      this.selectedPostIndex = 0;
    }
    this._visibleCards = filtered;

    listEl.innerHTML = filtered.map((c, idx) => `
      <button type="button" class="sc-post-card ${this.selectedPostIndex === idx ? "is-selected" : ""}" data-post-idx="${idx}">
        <div class="sc-post-meta">
          <span>${esc(c.badge)}</span>
          <span>${esc(c.metaRight)}</span>
        </div>
        ${typeof c.scoreBarPct === "number" ? `<div class="sc-bm-bar"><div class="sc-bm-fill" style="transform: scaleX(${(c.scoreBarPct / 100).toFixed(3)})"></div></div>` : ""}
        <div class="sc-post-title">${esc(c.title)}</div>
        <div class="sc-post-summary">${esc(c.summary)}</div>
      </button>
    `).join("");

    const sel = filtered[this.selectedPostIndex];
    if (detailEl && sel) {
      const tagText = (sel.tags || []).slice(0, 5).map((t) => `#${t}`).join("  ");
      let actionHtml = "";
      if (sel.customAction) {
        actionHtml = `<button type="button" class="sc-detail-cta" data-room-action="${esc(sel.customAction.id)}">${esc(sel.customAction.label)}</button>`;
      } else if (sel.linkUrl && sel.linkUrl !== "#") {
        const targetAttr = sel.linkSameTab ? "" : `target="_blank" rel="noopener noreferrer"`;
        actionHtml = `<a class="sc-detail-cta" href="${esc(sel.linkUrl)}" ${targetAttr}>${esc(sel.linkLabel || "원문 열기")}</a>`;
      }
      detailEl.innerHTML = `
        <span class="sc-detail-badge">${esc(sel.badge)}</span>
        <h3 class="sc-detail-title">${esc(sel.title)}</h3>
        <div class="sc-detail-meta">
          <span>${esc(sel.metaRight)}</span>
          ${tagText ? `<span>${esc(tagText)}</span>` : ""}
        </div>
        <div class="sc-detail-body">${esc(sel.body || sel.summary)}</div>
        <div class="sc-detail-actions">
          <span>${esc(this.selectedPostIndex + 1)} / ${filtered.length}</span>
          ${actionHtml}
        </div>
      `;
    }
  }

  _onReaderCardClick(idx) {
    this.selectedPostIndex = idx;
    this.renderReaderPanel();

    const shrine = this.shrines.find((s) => s.id === this.activeShrineId);
    const card = this._visibleCards?.[idx];
    if (shrine && card?.resonateLabel) {
      this._resonateShrine(shrine, card.resonateLabel, card.resonateTag || "");
    }
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

    const peerMeshes = [...this.remotePeers.values()].filter((p) => p.actor?.mesh).map((p) => p.actor.hitMesh || p.actor.mesh);
    if (peerMeshes.length) {
      const peerHits = this.raycaster.intersectObjects(peerMeshes, false);
      if (peerHits.length > 0) {
        const cid = peerHits[0].object.userData.peerClientId;
        if (cid) this.chat.selectUserThread(cid);
        return;
      }
    }

    const curatorMeshes = this.shrines.map((s) => s.actor.hitMesh || s.actor.mesh);
    const shrineHits = this.raycaster.intersectObjects(curatorMeshes, false);
    if (shrineHits.length > 0) {
      this.activateShrine(shrineHits[0].object.userData.shrineId, true, true);
      return;
    }

    const citizenMeshes = this.citizens.filter((c) => c.actor).map((c) => c.actor.hitMesh || c.actor.mesh);
    if (citizenMeshes.length) {
      const citHits = this.raycaster.intersectObjects(citizenMeshes, false);
      if (citHits.length > 0) {
        const citId = citHits[0].object.userData.citizenId;
        if (citId) {
          this._onCitizenClick(citId);
          return;
        }
      }
    }

    // Clicking the giant 3D Wall Screen inside a room immediately opens the Full-Screen Room Dashboard
    if (this.screenMeshes.length) {
      const scrHits = this.raycaster.intersectObjects(this.screenMeshes, false);
      if (scrHits.length > 0) {
        const bId = scrHits[0].object.userData.openDashboardBuildingId;
        if (bId) {
          this.enterBuildingById(bId, { warpToDoor: false });
          return;
        }
      }
    }

    // Clicking a closed building roof/awning walks the hero straight inside through its doorway
    const visibleRoofs = this.buildings.filter((b) => b.roofGroup.visible).map((b) => b.roofGroup);
    const roofHits = this.raycaster.intersectObjects(visibleRoofs, true);
    if (roofHits.length > 0) {
      const bId = roofHits[0].object.userData.enterBuildingId;
      if (bId) {
        this.enterBuildingById(bId, { warpToDoor: false });
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
        classKey: AVATAR_DEFS[peerData.classKey] ? peerData.classKey : "Solar_Guard",
        displayName: peerData.nickname,
        roleBadge: "USER",
        actor: null,
        loading: true,
        position: new THREE.Vector3(peerData.x || 0, 0, peerData.z || 0),
        targetPos: new THREE.Vector3(peerData.x || 0, 0, peerData.z || 0),
        jumpY: peerData.y || 0,
        targetJumpY: peerData.y || 0,
        facingAngle: peerData.facing || 0,
        action: peerData.action || "Idle",
        chatText: "",
        chatUntil: 0,
        overlayHeight: 2.55,
      };
      this.remotePeers.set(cid, rec);
      const spec = AVATAR_DEFS[rec.classKey] || AVATAR_DEFS.Solar_Guard;
      const actor = await loadSpriteActor(spec.atlasUrl);
      if (!this.remotePeers.has(cid)) {
        actor.dispose();
        return;
      }
      actor.mesh.position.copy(rec.position);
      actor.setUserData("peerClientId", cid);
      this.scene.add(actor.mesh);
      rec.actor = actor;
      rec.loading = false;
    } else {
      rec.displayName = peerData.nickname;
      rec.targetPos.set(peerData.x || 0, 0, peerData.z || 0);
      rec.targetJumpY = peerData.y || 0;
      rec.facingAngle = peerData.facing ?? rec.facingAngle;
      rec.action = peerData.action || "Idle";
      if (peerData.classKey && peerData.classKey !== rec.classKey && !rec.loading && AVATAR_DEFS[peerData.classKey]) {
        rec.classKey = peerData.classKey;
        rec.loading = true;
        const spec = AVATAR_DEFS[rec.classKey];
        const nextActor = await loadSpriteActor(spec.atlasUrl);
        if (!this.remotePeers.has(cid)) {
          nextActor.dispose();
          return;
        }
        if (rec.actor) {
          this.scene.remove(rec.actor.mesh);
          rec.actor.dispose();
        }
        nextActor.mesh.position.copy(rec.position);
        nextActor.setUserData("peerClientId", cid);
        this.scene.add(nextActor.mesh);
        rec.actor = nextActor;
        rec.loading = false;
      }
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
      rec.jumpY += ((rec.targetJumpY || 0) - rec.jumpY) * Math.min(1, dt * 14);
      rec.actor.mesh.position.copy(rec.position);
      rec.actor.setJumpHeight(rec.jumpY, 1, 1);
      const moving = rec.position.distanceTo(rec.targetPos) > 0.08;
      let anim = "Idle";
      if (rec.jumpY > 0.08 || rec.action === "Jump") anim = "Jump";
      else if (rec.action === "Dash") anim = "Dash";
      else if (rec.action === "Run") anim = "Run";
      else if (moving || rec.action === "Walk") anim = "Walk";
      else if (rec.action === "Sit") anim = "Sit";
      rec.actor.playAction(anim);
      rec.actor.update(dt, this.controller.cameraAzimuth, rec.facingAngle);
    }
  }

  _updateBuildings(dt) {
    let activeRoom = null;
    for (const b of this.buildings) {
      const insideReveal = this._isPointInBounds(this.hero.position, b.revealBounds);
      if (this._isPointInBounds(this.hero.position, b.interiorBounds)) {
        activeRoom = b;
      }

      const targetRoofOpacity = insideReveal ? 0.0 : 1.0;
      b.roofOpacity += (targetRoofOpacity - b.roofOpacity) * Math.min(1, dt * 10);
      b.roofGroup.visible = b.roofOpacity > 0.04;
      for (const m of b.roofMaterials) {
        m.opacity = b.roofOpacity;
      }

      const targetFrontOpacity = insideReveal ? 0.14 : 1.0;
      b.frontOpacity = (b.frontOpacity ?? 1.0) + (targetFrontOpacity - (b.frontOpacity ?? 1.0)) * Math.min(1, dt * 10);
      const isGhost = b.frontOpacity < 0.99;
      for (const fm of b.frontCutawayMaterials || []) {
        fm.opacity = b.frontOpacity;
        if (fm.transparent !== isGhost) {
          fm.transparent = isGhost;
          fm.depthWrite = !isGhost;
          fm.needsUpdate = true;
        }
      }
    }

    const nextRoomId = activeRoom?.id || null;
    if (this.envFx.interiorLight) {
      if (activeRoom) {
        this.envFx.interiorLight.position.set(activeRoom.center.x, 2.6, activeRoom.center.z);
        this.envFx.interiorLight.color.setHex(activeRoom.accentColor || 0xfbbf24);
        this.envFx.interiorLight.intensity = 2.6;
      } else {
        this.envFx.interiorLight.intensity = 0;
      }
    }

    if (nextRoomId !== this.currentBuildingId) {
      this.currentBuildingId = nextRoomId;
      for (const sign of this.buildingSigns) {
        sign.hiddenOverlay = Boolean(nextRoomId && sign.buildingId === nextRoomId);
      }
      if (nextRoomId) {
        this.controller.targetDistance = 19.5;
        this.openRoomDashboard(nextRoomId);
      } else {
        this.controller.targetDistance = 24.5;
        this.dashboardDismissedInRoom = false;
        this.closeRoomDashboard();
      }
      this._syncDistrictBar();
    }
  }

  triggerDash() {
    if (this.hero.dashCooldown > 0 || this.hero.dashTimer > 0) return;

    const { forward, right } = this.controller.getGroundBasis();
    const dir = this._tmpMoveVec.set(0, 0, 0);
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dir.add(forward);
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dir.sub(forward);
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dir.add(right);
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dir.sub(right);

    if (dir.lengthSq() > 0.001) {
      dir.normalize();
    } else if (this.hero.moveTarget) {
      dir.subVectors(this.hero.moveTarget, this.hero.position);
      dir.y = 0;
      if (dir.lengthSq() > 0.01) dir.normalize();
      else dir.set(Math.sin(this.hero.facingAngle), 0, Math.cos(this.hero.facingAngle));
    } else {
      dir.set(Math.sin(this.hero.facingAngle), 0, Math.cos(this.hero.facingAngle));
    }

    this.hero.isSitting = false;
    document.getElementById("btn-sit")?.classList.remove("is-active");
    const spStats = this.arena?.getPlayerStats();
    if (this.arena && this.arena.booster < 18) return;
    if (this.arena) this.arena.booster = Math.max(0, this.arena.booster - 22);

    this.hero.dashDir.copy(dir);
    this.hero.facingAngle = Math.atan2(dir.x, dir.z);
    this.hero.dashTimer = 0.26;
    this.hero.dashCooldown = 1.05 * (spStats?.dashCooldownMul || 1.0);
    this.hero.dashGhostTimer = 0;

    const spec = AVATAR_DEFS[this.hero.classKey] || AVATAR_DEFS.Solar_Guard;
    const elColor = spStats ? ELEMENT_DEFS[spStats.element].colorInt : (spec.dashTint || 0x38bdf8);
    this.hero.actor?.playAction("Dash", null, true);
    this.pixelVfx?.spawnBurst("poof", { x: this.hero.position.x, y: 0.65, z: this.hero.position.z, scale: 1.5, fps: 20 });
    this.vfx.spawnDustPuff(this.hero.position, { color: elColor, maxScale: 2.35, opacity: 0.78, life: 0.34 });
    this.vfx.spawnAfterimage(this.hero.actor, elColor);
    this.audio.playTone(320, 680, 0.14, "triangle", 0.06);
  }

  triggerJump() {
    if (this.hero.isJumping) return;
    const spStats = this.arena?.getPlayerStats();
    this.hero.isSitting = false;
    document.getElementById("btn-sit")?.classList.remove("is-active");
    this.hero.isJumping = true;
    this.hero.jumpVy = 9.2 * (spStats?.jumpMul || 1.0);
    this.hero.landingSquashTimer = 0;
    this.hero.actor?.playAction("Jump", null, true);
    this.pixelVfx?.spawnBurst("poof", { x: this.hero.position.x, y: 0.55, z: this.hero.position.z, scale: 1.25, fps: 20 });
    this.vfx.spawnDustPuff(this.hero.position, { color: 0xfef3c7, maxScale: 1.55, opacity: 0.62, life: 0.32 });
    this.audio.playTone(380, 580, 0.12, "sine", 0.055);
  }

  _updateHero(dt) {
    const { forward, right } = this.controller.getGroundBasis();
    const moveVec = this._tmpMoveVec.set(0, 0, 0);
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) moveVec.add(forward);
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) moveVec.sub(forward);
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) moveVec.add(right);
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) moveVec.sub(right);

    const hasKeyMove = moveVec.lengthSq() > 0.001;
    const isShiftHeld = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");

    if (this.hero.dashCooldown > 0) {
      this.hero.dashCooldown = Math.max(0, this.hero.dashCooldown - dt);
    }

    if (hasKeyMove) {
      this.hero.moveTarget = null;
      this.hero.moveQueue = [];
      this.hero.pendingShrineId = null;
      this.vfx.setMoveTargetMarker(null);
      this.hero.isSitting = false;
      document.getElementById("btn-sit")?.classList.remove("is-active");
      moveVec.normalize();
    } else if (this.hero.moveTarget) {
      const diff = this._tmpDiffVec.subVectors(this.hero.moveTarget, this.hero.position);
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

    const spec = AVATAR_DEFS[this.hero.classKey] || AVATAR_DEFS.Solar_Guard;
    const spStats = this.arena?.getPlayerStats();
    const baseSpeed = spec.speed * (spStats?.speedMul || 1.0);
    let isMoving = false;
    let isDashing = false;
    let isRunning = false;
    this.hero.vx = 0;
    this.hero.vz = 0;

    if (this.hero.dashTimer > 0) {
      isDashing = true;
      isMoving = true;
      this.hero.dashTimer = Math.max(0, this.hero.dashTimer - dt);
      const dashSpeed = baseSpeed * 2.75;
      this.hero.vx = this.hero.dashDir.x * dashSpeed;
      this.hero.vz = this.hero.dashDir.z * dashSpeed;
      const next = this._resolveCityCollisions(
        this.hero.position.x + this.hero.vx * dt,
        this.hero.position.z + this.hero.vz * dt
      );
      this.hero.position.set(next.x, 0, next.z);
      this.hero.facingAngle = Math.atan2(this.hero.dashDir.x, this.hero.dashDir.z);

      this.hero.dashGhostTimer += dt;
      if (this.hero.dashGhostTimer >= 0.07) {
        this.hero.dashGhostTimer = 0;
        const elColor = spStats ? ELEMENT_DEFS[spStats.element].colorInt : (spec.dashTint || 0x38bdf8);
        this.vfx.spawnAfterimage(this.hero.actor, elColor);
      }
    } else if (moveVec.lengthSq() > 0.001) {
      isMoving = true;
      isRunning = isShiftHeld && (!this.arena || this.arena.booster > 4);
      const speed = isRunning ? baseSpeed * 1.62 : baseSpeed;
      this.hero.vx = moveVec.x * speed;
      this.hero.vz = moveVec.z * speed;
      const next = this._resolveCityCollisions(
        this.hero.position.x + this.hero.vx * dt,
        this.hero.position.z + this.hero.vz * dt
      );
      this.hero.position.set(next.x, 0, next.z);
      this.hero.facingAngle = Math.atan2(moveVec.x, moveVec.z);

      if (isRunning && !this.hero.isJumping) {
        this.hero.runDustTimer += dt;
        if (this.hero.runDustTimer >= 0.24) {
          this.hero.runDustTimer = 0;
          this.vfx.spawnDustPuff(this.hero.position, { color: 0xfef3c7, maxScale: 1.3, opacity: 0.45, life: 0.28 });
        }
      }

      for (const sh of this.shrines) {
        if (sh.id !== this.activeShrineId && this.hero.position.distanceTo(sh.position) < 2.2) {
          this.activateShrine(sh.id, false);
          break;
        }
      }
    }
    this.hero.isRunning = isRunning;

    // Parabolic Jump Physics + Landing Squash/Stretch
    let scaleX = 1.0;
    let scaleY = 1.0;
    if (this.hero.isJumping) {
      this.hero.jumpY += this.hero.jumpVy * dt;
      this.hero.jumpVy -= 24.5 * dt;
      if (this.hero.jumpY <= 0) {
        this.hero.jumpY = 0;
        this.hero.jumpVy = 0;
        this.hero.isJumping = false;
        this.hero.landingSquashTimer = 0.14;
        this.vfx.spawnDustPuff(this.hero.position, { color: 0xfef3c7, maxScale: 1.75, opacity: 0.65, life: 0.34 });
        this.audio.playTone(220, 140, 0.08, "sine", 0.045);
      } else {
        const stretch = Math.min(0.11, Math.abs(this.hero.jumpVy) * 0.012);
        scaleY = 1 + stretch;
        scaleX = 1 - stretch * 0.65;
      }
    } else if (this.hero.landingSquashTimer > 0) {
      this.hero.landingSquashTimer = Math.max(0, this.hero.landingSquashTimer - dt);
      const tSq = this.hero.landingSquashTimer / 0.14;
      scaleY = 1 - 0.15 * tSq;
      scaleX = 1 + 0.14 * tSq;
    }

    // Priority Action State Machine: Jump > Dash > Run > Walk > Sit/Idle
    if (this.hero.actor) {
      if (this.hero.isJumping) {
        this.hero.actor.playAction("Jump");
      } else if (isDashing) {
        this.hero.actor.playAction("Dash");
      } else if (isMoving) {
        this.hero.actor.playAction(isRunning ? "Run" : "Walk");
      } else if (
        this.hero.actor.currentAction === "Walk" ||
        this.hero.actor.currentAction === "Run" ||
        this.hero.actor.currentAction === "Dash" ||
        this.hero.actor.currentAction === "Jump"
      ) {
        this.hero.actor.playAction(this.hero.isSitting ? "Sit" : "Idle");
      }

      this.hero.actor.mesh.position.copy(this.hero.position);
      this.hero.actor.setJumpHeight(this.hero.jumpY, scaleX, scaleY);
    }

    // Sync Dash / Jump button feedback
    const dashBtn = document.getElementById("btn-hero-dash");
    if (dashBtn) {
      dashBtn.classList.toggle("is-cooldown", this.hero.dashCooldown > 0 && !isDashing);
      dashBtn.classList.toggle("is-active-move", isDashing || isRunning);
    }
    const jumpBtn = document.getElementById("btn-hero-jump");
    if (jumpBtn) {
      jumpBtn.classList.toggle("is-active-move", this.hero.isJumping);
    }

    const nextZone = this._computeZoneName(this.hero.position);
    if (nextZone !== this.currentZoneName) {
      this.currentZoneName = nextZone;
      this.chat.updateZoneLabel(nextZone);
    }

    this.chat.broadcastState({
      classKey: this.hero.classKey,
      x: this.hero.position.x,
      y: this.hero.jumpY,
      z: this.hero.position.z,
      facing: this.hero.facingAngle,
      action: this.hero.actor?.currentAction || "Idle",
      zone: this.currentZoneName,
    }, false);
  }

  _updateCitizens(dt) {
    const now = Date.now();
    const activeBubbles = this._countActiveCitizenBubbles(now);

    for (const cit of this.citizens) {
      if (cit.pendingReply && now >= cit.pendingReply.at) {
        const rep = cit.pendingReply;
        cit.pendingReply = null;
        this._speakAsNpc(cit, rep.text, 4400);
        cit.actor?.playAction(rep.anim || "Cheer", () => {
          cit.actor?.playAction(cit.action === "SitChair" ? "SitChair" : "Idle", null, true);
        }, true);
      }

      if ((cit.aiState === "greet_hero" || cit.aiState === "social_talk") && now >= (cit.stateUntil || 0)) {
        cit.aiState = cit.action === "SitChair" ? "sit" : "idle";
        cit.pauseTimer = 1.2 + Math.random() * 1.8;
        cit.actor?.playAction(cit.action === "SitChair" ? "SitChair" : "Idle", null, true);
      }

      // 1. Proximity Greeting when Player walks close to a Citizen
      if (
        cit.aiState !== "social_talk" &&
        now >= (cit.greetCooldownUntil || 0) &&
        this.hero.position.distanceTo(cit.position) < 2.75 &&
        activeBubbles < 4
      ) {
        cit.greetCooldownUntil = now + 22000;
        cit.nextSpeakAt = now + 11000;
        cit.dest = null;
        cit.aiState = "greet_hero";
        cit.stateUntil = now + 3200;
        if (cit.roam) {
          cit.facingAngle = Math.atan2(
            this.hero.position.x - cit.position.x,
            this.hero.position.z - cit.position.z
          );
        }
        const waveAnim = cit.persona === "scholar" ? "Interact" : "Cheer";
        cit.actor?.playAction(waveAnim, () => {
          cit.actor?.playAction(cit.action === "SitChair" ? "SitChair" : "Idle", null, true);
        }, true);
        this._speakAsNpc(cit, this._pickNpcLine(cit, "greet"), 4800);
      }

      // 2. Ambient Live Data & Atmosphere Speech Bubbles
      if (now >= (cit.nextSpeakAt || 0) && (cit.aiState === "idle" || cit.aiState === "sit")) {
        cit.nextSpeakAt = now + 9500 + Math.random() * 8500;
        if (this._countActiveCitizenBubbles(now) < 3) {
          this._speakAsNpc(cit, this._pickNpcLine(cit, "ambient"), 4800);
          if (cit.aiState === "idle") {
            const idleAnim = cit.persona === "scholar" ? "Cast" : "Interact";
            cit.actor?.playAction(idleAnim, () => cit.actor?.playAction("Idle", null, true), true);
          }
        }
      }

      // 3. Autonomous City Roaming
      if (cit.roam && (cit.aiState === "idle" || cit.aiState === "walk")) {
        if (cit.pauseTimer > 0) {
          cit.pauseTimer -= dt;
          if (cit.actor.currentAction === "Walk") {
            cit.aiState = "idle";
            cit.actor.playAction("Idle");
          }
        } else if (!cit.dest) {
          const ang = Math.random() * Math.PI * 2;
          const r = 1.6 + Math.random() * (cit.roamRadius || 4.0);
          const resolved = this._resolveCityCollisions(
            cit.homePos.x + Math.cos(ang) * r,
            cit.homePos.z + Math.sin(ang) * r,
            0.5
          );
          cit.dest = new THREE.Vector3(resolved.x, 0, resolved.z);
          cit.aiState = "walk";
        } else {
          const d = this._tmpCitDiffVec.subVectors(cit.dest, cit.position);
          d.y = 0;
          if (d.length() < 0.25) {
            cit.dest = null;
            cit.aiState = "idle";
            cit.pauseTimer = 2.0 + Math.random() * 2.8;
          } else {
            d.normalize();
            const step = this._resolveCityCollisions(
              cit.position.x + d.x * 1.48 * dt,
              cit.position.z + d.z * 1.48 * dt,
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

    // 4. Periodic NPC-to-NPC 1:1 Social Conversations
    if (now >= (this._nextNpcSocialScan || 0)) {
      this._nextNpcSocialScan = now + 2200;
      if (this._countActiveCitizenBubbles(now) < 2) {
        const roamers = this.citizens.filter(
          (c) => c.roam && (c.aiState === "idle" || c.aiState === "walk") && now >= (c.socialCooldownUntil || 0)
        );
        for (let i = 0; i < roamers.length; i++) {
          const a = roamers[i];
          for (let j = i + 1; j < roamers.length; j++) {
            const b = roamers[j];
            if (a.position.distanceTo(b.position) < 2.8) {
              a.aiState = "social_talk";
              b.aiState = "social_talk";
              a.dest = null;
              b.dest = null;
              a.stateUntil = now + 4500;
              b.stateUntil = now + 4500;
              a.socialCooldownUntil = now + 26000;
              b.socialCooldownUntil = now + 26000;
              a.facingAngle = Math.atan2(b.position.x - a.position.x, b.position.z - a.position.z);
              b.facingAngle = Math.atan2(a.position.x - b.position.x, a.position.z - b.position.z);
              a.actor?.playAction("Interact", () => a.actor?.playAction("Idle", null, true), true);
              this._speakAsNpc(a, this._pickNpcLine(a, "social_init", b), 4200);
              b.pendingReply = {
                at: now + 1500,
                text: this._pickNpcLine(b, "social_reply", a),
                anim: "Cheer",
              };
              i = roamers.length;
              break;
            }
          }
        }
      }
    }
  }

  _loop(now) {
    if (this._disposed) return;
    this._rafId = requestAnimationFrame((t) => this._loop(t));

    // Pause heavy WebGL rendering & physics while tab is hidden in background
    if (document.hidden) {
      this._lastTime = now;
      return;
    }

    const dt = Math.min(0.05, Math.max(0.001, (now - this._lastTime) / 1000));
    this._lastTime = now;
    this._elapsed += dt;

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
    this.arena?.update(dt, this._elapsed, {
      pos: { x: this.hero.position.x, y: this.hero.jumpY, z: this.hero.position.z },
      vx: this.hero.vx || 0,
      vz: this.hero.vz || 0,
      isMoving: Math.hypot(this.hero.vx || 0, this.hero.vz || 0) > 0.2,
      isRunning: this.hero.isRunning,
      isDashing: this.hero.dashTimer > 0,
    }, this.citizens);
    this.pixelVfx?.update(dt, this.controller.cameraAzimuth);
    this._syncSurvivalGauges();
    this.atmosphere?.update(dt, this.hero.position);
    if (now - (this._lastAtmoUiSync || 0) > 400) {
      this._lastAtmoUiSync = now;
      this._syncAtmoLabels();
    }

    this.controller.update(dt, this.hero.position);
    if (this.arena?.screenShake > 0.005) {
      const s = this.arena.screenShake;
      this.controller.camera.position.x += (Math.random() - 0.5) * s * 0.9;
      this.controller.camera.position.y += (Math.random() - 0.5) * s * 0.7;
    }
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

    // Reuse pre-allocated overlay actor array to avoid 60fps array GC churn
    const actors = this._overlayActors;
    actors.length = 0;
    actors.push(this.hero);
    for (const p of this.remotePeers.values()) {
      if (p.actor) actors.push(p);
    }
    for (const sh of this.shrines) actors.push(sh);
    for (const s of this.buildingSigns) actors.push(s);
    for (const c of this.citizens) actors.push(c);

    this.renderer.render(this.scene, this.controller.camera);
    this.vfx.updateTrackedOverlays(
      actors,
      this.controller.camera,
      this.canvas.clientWidth,
      this.canvas.clientHeight,
      now
    );
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    cancelAnimationFrame(this._rafId);
    if (this._tickerTimer) clearInterval(this._tickerTimer);
    this._resizeObserver?.disconnect();
    this.controller?.dispose();
    this.atmosphere?.dispose();
    this.arena?.dispose();
    this.pixelVfx?.dispose();
    this.vfx?.dispose();
    this.hero.actor?.dispose();
    for (const sh of this.shrines) sh.actor?.dispose();
    for (const cit of this.citizens) cit.actor?.dispose();
    for (const p of this.remotePeers.values()) p.actor?.dispose();
    this.renderer?.dispose();
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
    const { timeKey, timeLabel, seasonKey, seasonLabel } = this.atmosphere.getStatusLabels();
    const TIME_SVGS = {
      dawn: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8m-7.07 1.93 1.41 1.41M2 18h2m16 0h2m-4.34-4.66 1.41-1.41M22 22H2m14-4a4 4 0 0 0-8 0"/></svg>`,
      day: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
      sunset: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10V2m-7.07 9.93 1.41 1.41M2 18h2m16 0h2m-4.34-4.66 1.41-1.41M22 22H2m14-4a4 4 0 0 0-8 0"/></svg>`,
      night: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
    };
    const SEASON_SVGS = {
      spring: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V9m-4.5 3a4.5 4.5 0 1 0 4.5 4.5M7.5 12H9m3 4.5a4.5 4.5 0 1 1 4.5-4.5M12 16.5V15m4.5-3H15"/><circle cx="12" cy="12" r="1.5"/></svg>`,
      summer: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,
      autumn: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
      winter: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M12 2v20m-5-17 5 5 5-5M7 21l5-5 5 5M3 7l5 5-5 5M21 7l-5 5 5 5"/></svg>`,
    };

    const tIcon = document.getElementById("atmo-time-icon");
    const tText = document.getElementById("atmo-time-text");
    if (tIcon && this._lastTimeKey !== timeKey) {
      tIcon.innerHTML = TIME_SVGS[timeKey] || TIME_SVGS.day;
      this._lastTimeKey = timeKey;
    }
    if (tText && tText.textContent !== timeLabel) tText.textContent = timeLabel;

    const sIcon = document.getElementById("atmo-season-icon");
    const sText = document.getElementById("atmo-season-text");
    if (sIcon && this._lastSeasonKey !== seasonKey) {
      sIcon.innerHTML = SEASON_SVGS[seasonKey] || SEASON_SVGS.spring;
      this._lastSeasonKey = seasonKey;
    }
    if (sText && sText.textContent !== seasonLabel) sText.textContent = seasonLabel;
  }

  _handleFestivalEvent(ev) {
    if (!ev) return;
    const banner = document.getElementById("sanctuary-festival-banner");
    const badge = document.getElementById("festival-banner-badge");
    const text = document.getElementById("festival-banner-text");

    if (ev.phase === "announcing") {
      if (banner) {
        banner.hidden = false;
        banner.classList.remove("is-show");
      }
      if (badge) badge.textContent = "야간 불꽃축제 공지";
      if (text) text.textContent = `잠시 후 위클리월드 밤하늘에 화려한 불꽃놀이가 시작됩니다! (${ev.countdown}초 전)`;
      if (ev.isStart) {
        this.chat.addSystemMessage("[야간 불꽃축제 공지] 잠시 후 위클리월드 밤하늘에 화려한 불꽃놀이가 펼쳐집니다!");
        this.audio.playTone(523.25, 659.25, 0.2, "sine", 0.055);
        this._reactNpcsToFirework();
      }
    } else if (ev.phase === "show") {
      if (banner) {
        banner.hidden = false;
        banner.classList.add("is-show");
      }
      if (badge) badge.textContent = "NIGHT FESTIVAL · LIVE";
      if (text) text.textContent = "위클리월드 야간 그랜드 불꽃축제가 밤하늘을 수놓고 있습니다!";
      this.chat.addSystemMessage("밤하늘에 야간 그랜드 불꽃축제가 시작되었습니다!");
      this._reactNpcsToFirework();
    } else if (ev.phase === "burst") {
      const f0 = ev.pattern === "willow" ? 392 : ev.pattern === "ring" ? 587.33 : 523.25;
      this.audio.playTone(f0, f0 * 1.45, 0.16, "sine", 0.04);
      if (typeof ev.x === "number" && typeof ev.z === "number") {
        this.pixelVfx?.spawnBurst("firework_burst", {
          x: ev.x,
          y: ev.y || 4.8,
          z: ev.z,
          scale: 3.6,
          fps: 14,
          additive: true,
        });
      }
    } else if (ev.phase === "ended") {
      if (banner) {
        banner.hidden = true;
        banner.classList.remove("is-show");
      }
      if (ev.reason === "complete") {
        this.chat.addSystemMessage("야간 불꽃축제가 마무리되었습니다. 밤이 이어지면 잠시 후 앵콜 축제가 공지됩니다.");
      }
    }
  }

  _handleAtmosphereCommand(cmd, arg = "") {
    if (!this.atmosphere) return;
    const a = String(arg || "").toLowerCase();
    if (cmd === "firework") {
      this.chat.addSystemMessage("불꽃놀이는 클릭 발사 대신 밤 시간대에만 사전 공지 후 화려하게 자동으로 펼쳐집니다. /밤 으로 밤하늘을 불러보세요!");
      return;
    }
    if (cmd === "time") {
      const map = { "새벽": "dawn", dawn: "dawn", "낮": "day", day: "day", "노을": "sunset", sunset: "sunset", "밤": "night", night: "night", "자동": "auto", auto: "auto" };
      const next = map[a];
      if (next) {
        this.atmosphere.setTimeMode(next);
        this._syncAtmoLabels();
        this._reactNpcsToAtmosphere("time");
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
        this._reactNpcsToAtmosphere("season");
        this.chat.addSystemMessage(`계절이 ${this.atmosphere.getStatusLabels().seasonLabel}(으)로 변경되었습니다.`);
      }
    }
  }

  _bindEvents() {
    window.addEventListener("resize", () => this._handleResize());
    window.addEventListener("beforeunload", () => this.dispose());
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
    for (const uiId of ["sp-player-hud", "sp-arcade-dock", "sp-card-modal"]) {
      const uiEl = document.getElementById(uiId);
      if (uiEl) {
        for (const evName of ["pointerdown", "pointerup", "wheel"]) {
          uiEl.addEventListener(evName, (ev) => ev.stopPropagation());
        }
      }
    }
    document.getElementById("sp-portrait-frame")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.cycleHeroClass();
    });
    document.getElementById("btn-sp-melee")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.triggerMelee();
    });
    document.getElementById("btn-sp-magic")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.triggerMagic();
    });
    document.getElementById("btn-sp-ult")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.triggerUltimate();
    });
    document.getElementById("btn-sp-deck")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const modal = document.getElementById("sp-card-modal");
      if (modal && !modal.hidden) this.closeCardDeckModal();
      else this.openCardDeckModal("all");
    });
    document.getElementById("sp-equipped-slots")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const slotBtn = ev.target.closest("[data-open-deck]");
      if (slotBtn) this.openCardDeckModal(slotBtn.dataset.openDeck || "all");
    });
    document.getElementById("btn-sp-close-deck")?.addEventListener("click", () => {
      this.closeCardDeckModal();
    });
    document.getElementById("btn-sp-open-pack")?.addEventListener("click", () => {
      const res = this.arena?.openCardPack(this.hero.position);
      if (!res) return;
      if (res.ok) {
        this._showDeckFeedback(
          res.isNew
            ? `🎉 신규 카드 획득! [${res.card.name}] Lv.${res.level} (${res.tier.label})`
            : `✨ 카드 합성 성공! [${res.card.name}] Lv.${res.level} (${res.tier.label})`
        );
        this.audio.playTone(523.25, 880, 0.22, "triangle", 0.07);
      } else {
        this._showDeckFeedback(res.reason);
      }
    });
    document.getElementById("sp-deck-tabs")?.addEventListener("click", (ev) => {
      const tab = ev.target.closest("[data-slot]");
      if (!tab) return;
      this._spDeckSlotFilter = tab.dataset.slot || "all";
      this.renderCardDeckModal();
    });
    document.getElementById("sp-card-grid")?.addEventListener("click", (ev) => {
      const eqBtn = ev.target.closest("[data-card-equip]");
      if (eqBtn) {
        const cid = eqBtn.dataset.cardEquip;
        if (this.arena?.equipCard(cid)) {
          this._showDeckFeedback("카드 장착을 완료했습니다! 캐릭터 오라와 속성이 즉시 반영됩니다.");
          this.audio.playTone(440, 660, 0.12, "sine", 0.055);
        }
        return;
      }
      const upBtn = ev.target.closest("[data-card-upgrade]");
      if (upBtn) {
        const cid = upBtn.dataset.cardUpgrade;
        const res = this.arena?.upgradeCard(cid, this.hero.position);
        if (res?.ok) {
          this._showDeckFeedback(`⚡ 합성 강화 성공! Lv.${res.newLevel} (${res.tier.label}) 달성!`);
          this.audio.playTone(587.33, 987.77, 0.2, "triangle", 0.07);
        } else if (res?.reason) {
          this._showDeckFeedback(res.reason);
        }
      }
    });
    document.getElementById("btn-hero-dash")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.triggerDash();
    });
    document.getElementById("btn-hero-jump")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      this.triggerJump();
    });
    document.getElementById("btn-hero-class")?.addEventListener("click", () => {
      this.cycleHeroClass();
    });
    document.getElementById("btn-atmo-time")?.addEventListener("click", () => {
      this.atmosphere?.cycleTimeMode();
      this._syncAtmoLabels();
      this._reactNpcsToAtmosphere("time");
    });
    document.getElementById("btn-atmo-season")?.addEventListener("click", () => {
      this.atmosphere?.cycleSeasonMode();
      this._syncAtmoLabels();
      this._reactNpcsToAtmosphere("season");
    });

    const districtBar = document.getElementById("sanctuary-district-bar");
    if (districtBar) {
      for (const evName of ["pointerdown", "pointerup", "wheel"]) {
        districtBar.addEventListener(evName, (ev) => ev.stopPropagation());
      }
      districtBar.addEventListener("click", (ev) => {
        ev.stopPropagation();
        const warpBtn = ev.target.closest("[data-warp]");
        if (warpBtn) {
          const targetId = warpBtn.dataset.warp;
          if (targetId === "plaza") this.warpToPlaza();
          else if (targetId === "soccer") this.warpToSoccer();
          else this.enterBuildingById(targetId, { warpToDoor: true });
          return;
        }
        if (ev.target.closest("#btn-reopen-screen")) {
          this.openRoomDashboard(this.currentBuildingId || this.activeShrineId);
        }
      });
    }

    const readerEl = document.getElementById("sanctuary-reader");
    if (readerEl) {
      for (const evName of ["pointerdown", "pointerup", "wheel"]) {
        readerEl.addEventListener(evName, (ev) => ev.stopPropagation());
      }
    }

    document.getElementById("btn-minimize-reader")?.addEventListener("click", () => {
      this.minimizeRoomDashboard();
    });
    document.getElementById("btn-exit-building")?.addEventListener("click", () => {
      this.exitCurrentBuilding();
    });
    document.getElementById("btn-close-reader")?.addEventListener("click", () => {
      this.minimizeRoomDashboard();
    });

    document.getElementById("reader-filter-tabs")?.addEventListener("click", (ev) => {
      const btn = ev.target.closest("[data-filter-id]");
      if (!btn) return;
      this.activeFilter = btn.dataset.filterId || "all";
      this.selectedPostIndex = 0;
      this.renderReaderPanel();
    });

    document.getElementById("reader-search-input")?.addEventListener("input", (ev) => {
      this.searchQuery = ev.target.value || "";
      this.selectedPostIndex = 0;
      this.renderReaderPanel();
    });

    document.getElementById("reader-detail-pane")?.addEventListener("click", (ev) => {
      const actBtn = ev.target.closest("[data-room-action]");
      if (!actBtn) return;
      const act = actBtn.dataset.roomAction;
      if (act === "night_festival") {
        this.minimizeRoomDashboard();
        this.atmosphere?.setTimeMode("night");
        this._syncAtmoLabels();
        this.chat?.addSystemMessage("밤하늘로 전환했습니다. 곧 야간 불꽃축제 공지가 시작됩니다!");
      } else if (act === "greet") {
        this.chat?.sendMessage("여관에서 모두에게 인사를 건넵니다!");
        this.minimizeRoomDashboard();
      }
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
      btn.addEventListener("click", () => this.enterBuildingById(btn.dataset.shrine, { warpToDoor: true }));
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

    const MOVE_CODES = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
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
      if (MOVE_CODES.includes(ev.code)) {
        if (ev.code.startsWith("Arrow")) ev.preventDefault();
        const isFirstPress = !this.keys.has(ev.code) && !ev.repeat;
        this.keys.add(ev.code);
        if (isFirstPress) {
          const now = performance.now();
          if (this._lastDirTap.code === ev.code && now - this._lastDirTap.at < 260) {
            this._lastDirTap.at = 0;
            this.triggerDash();
          } else {
            this._lastDirTap.code = ev.code;
            this._lastDirTap.at = now;
          }
        }
      } else if (ev.code === "ShiftLeft" || ev.code === "ShiftRight") {
        const firstShift = !this.keys.has(ev.code) && !ev.repeat;
        this.keys.add(ev.code);
        if (firstShift) {
          this.triggerDash();
        }
      } else if (ev.code === "Space" && tag !== "BUTTON") {
        ev.preventDefault();
        this.triggerJump();
      } else if (ev.code === "KeyZ" || ev.code === "KeyJ") {
        this.triggerMelee();
      } else if (ev.code === "KeyX" || ev.code === "KeyK") {
        this.triggerMagic();
      } else if (ev.code === "KeyV" || ev.code === "KeyL") {
        this.triggerUltimate();
      } else if (ev.code === "KeyC") {
        const modal = document.getElementById("sp-card-modal");
        if (modal && !modal.hidden) this.closeCardDeckModal();
        else this.openCardDeckModal("all");
      } else if (ev.code === "KeyB") {
        this.toggleSit();
      } else if (ev.code === "Digit0") {
        this.warpToPlaza();
      } else if (ev.code === "Digit7") {
        this.warpToSoccer();
      } else if (ev.code === "Digit1") {
        this.enterBuildingById("plugins", { warpToDoor: true });
      } else if (ev.code === "Digit2") {
        this.enterBuildingById("news", { warpToDoor: true });
      } else if (ev.code === "Digit3") {
        this.enterBuildingById("social", { warpToDoor: true });
      } else if (ev.code === "Digit4") {
        this.enterBuildingById("benchmarks", { warpToDoor: true });
      } else if (ev.code === "Digit5") {
        this.enterBuildingById("tavern", { warpToDoor: true });
      } else if (ev.code === "Digit6") {
        this.enterBuildingById("workshop", { warpToDoor: true });
      } else if (ev.code === "Escape") {
        const deckModal = document.getElementById("sp-card-modal");
        if (deckModal && !deckModal.hidden) {
          this.closeCardDeckModal();
          return;
        }
        const readerPanel = document.getElementById("sanctuary-reader");
        if (readerPanel && !readerPanel.hidden) this.minimizeRoomDashboard();
      }
    });
    window.addEventListener("keyup", (ev) => this.keys.delete(ev.code));
    window.addEventListener("blur", () => this.keys.clear());
  }
}

const app = new SanctuaryArchiveApp();
app.start().catch((err) => console.error("[Sanctuary25D] Boot error:", err));
