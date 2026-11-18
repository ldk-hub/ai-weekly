import * as THREE from "three";
import { loadSpriteActor, loadSanctuaryEnvironment } from "./sanctuary/AssetManager.js";
import { QuarterViewController } from "./sanctuary/QuarterViewController.js";
import { SanctuaryVFX } from "./sanctuary/SanctuaryVFX.js";

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
    title: "인기 플러그인 성소",
    curatorName: "연금술사 엘라",
    roleBadge: "PLUGIN SHRINE",
    atlasUrl: "assets/sprites/Curator_Ella_8dir_atlas.json",
    x: -4.4,
    z: -1.6,
    facing: 1.0,
    palette: "holy",
    pageHref: "./",
    pageLabel: "인기 플러그인 ↗",
    overlayHeight: 2.35,
  },
  {
    id: "news",
    title: "AI 뉴스 중앙 제단",
    curatorName: "뉴스 사서 셀레네",
    roleBadge: "NEWS ALTAR",
    atlasUrl: "assets/sprites/Astral_Sage_8dir_atlas.json",
    x: 0.2,
    z: -4.6,
    facing: 0.1,
    palette: "arcane",
    pageHref: "news",
    pageLabel: "AI 뉴스 ↗",
    overlayHeight: 2.35,
  },
  {
    id: "social",
    title: "소셜 피드 라운지",
    curatorName: "소셜 바드 루나",
    roleBadge: "SOCIAL LOUNGE",
    atlasUrl: "assets/sprites/Curator_Luna_8dir_atlas.json",
    x: 4.5,
    z: -1.4,
    facing: -1.1,
    palette: "shadow",
    pageHref: "social",
    pageLabel: "소셜 피드 ↗",
    overlayHeight: 2.35,
  },
  {
    id: "benchmarks",
    title: "스타보드·벤치마크 성소",
    curatorName: "벤치마크 나이트 레온",
    roleBadge: "BENCHMARKS & STAR",
    atlasUrl: "assets/sprites/Curator_Leon_8dir_atlas.json",
    x: 3.5,
    z: 3.2,
    facing: -2.4,
    palette: "emerald",
    pageHref: "benchmarks",
    pageLabel: "점유율·성능 ↗",
    overlayHeight: 2.45,
  },
];

const CITIZEN_SPAWNS = [
  { id: "cit-1", atlas: "assets/sprites/Citizen_Ranger_8dir_atlas.json", x: -7.2, y: 0.36, z: -0.6, facing: Math.PI * 0.5, action: "Sit", roam: false },
  { id: "cit-2", atlas: "assets/sprites/Citizen_Minstrel_8dir_atlas.json", x: -6.1, y: 0, z: -1.1, facing: -0.6, action: "Idle", roam: false },
  { id: "cit-3", atlas: "assets/sprites/Citizen_Sura_8dir_atlas.json", x: 7.2, y: 0.36, z: 0.2, facing: -Math.PI * 0.5, action: "Sit", roam: false },
  { id: "cit-4", atlas: "assets/sprites/Citizen_Mechanic_8dir_atlas.json", x: 0.1, y: 0.36, z: -7.2, facing: 0, action: "Sit", roam: false },
  { id: "cit-5", atlas: "assets/sprites/Citizen_Ranger_8dir_atlas.json", x: -3.6, y: 0, z: 4.4, facing: 0.9, action: "Idle", roam: true },
  { id: "cit-6", atlas: "assets/sprites/Citizen_Minstrel_8dir_atlas.json", x: -2.4, y: 0.36, z: 7.15, facing: Math.PI, action: "Sit", roam: false },
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
    this.envFx = {};
    this.shrines = [];
    this.citizens = [];
    this.keys = new Set();

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
      displayName: AVATAR_DEFS.Solar_Guard.displayName,
      roleBadge: AVATAR_DEFS.Solar_Guard.roleBadge,
      actor: null,
      position: new THREE.Vector3(-1.4, 0, 3.0),
      facingAngle: 2.5,
      moveTarget: null,
      pendingShrineId: null,
      isSitting: false,
      castState: null,
      emoteText: "",
      emoteUntil: 0,
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
    this.dirLight.position.set(-15, 22, 11);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.camera.near = 4;
    this.dirLight.shadow.camera.far = 60;
    const d = 17;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0004;
    this.scene.add(this.dirLight);

    // Glowing Cyan Crystal Fountain Bounce Light
    this.fountainLight = new THREE.PointLight(0x67e8f9, 2.8, 9.5);
    this.fountainLight.position.set(0, 2.2, 0);
    this.scene.add(this.fountainLight);
  }

  applyTheme() {
    // Keep outdoor plaza warmly sunlit like the concept art across both UI themes
    const hazeHex = 0xd9caa4;
    this.scene.background = new THREE.Color(hazeHex);
    this.scene.fog = new THREE.FogExp2(hazeHex, 0.011);
  }

  async start() {
    this._setupLights();
    initThemeToggle(() => this.applyTheme());
    this._handleResize();

    this.envFx = await loadSanctuaryEnvironment("assets/models/sanctuary_environment.glb", this.scene);
    this.walkableMeshes = this.envFx.walkableMeshes;

    await Promise.all([
      this.switchAvatar("Solar_Guard"),
      this._spawnShrines(),
      this._spawnCitizens(),
      this._loadWebsiteDatasets(),
    ]);

    this._bindEvents();
    this.activateShrine("plugins", false);
    this._startTickerLoop();
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
    this.hero.displayName = spec.displayName;
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

  activateShrine(shrineId, walkToIt = true) {
    const shrine = this.shrines.find((s) => s.id === shrineId);
    if (!shrine) return;

    this.activeShrineId = shrineId;
    this.selectedPostIndex = 0;
    this.shrines.forEach((s) => { s.isActiveShrine = s.id === shrineId; });

    document.querySelectorAll("[data-shrine]").forEach((btn) => {
      btn.classList.toggle("is-primary", btn.dataset.shrine === shrineId);
    });

    this.renderReaderPanel();

    const dist = this.hero.position.distanceTo(shrine.position);
    if (walkToIt && dist > 2.2) {
      const dir = new THREE.Vector3().subVectors(this.hero.position, shrine.position).setY(0).normalize();
      if (dir.lengthSq() < 0.01) dir.set(0, 0, 1);
      const dest = shrine.position.clone().addScaledVector(dir, 1.55);
      dest.y = 0;
      this.hero.moveTarget = dest;
      this.hero.pendingShrineId = shrineId;
      this.hero.isSitting = false;
      document.getElementById("btn-sit")?.classList.remove("is-active");
      this.vfx.setMoveTargetMarker(dest);
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

  _handleLeftClick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.controller.camera);

    const curatorMeshes = this.shrines.map((s) => s.actor.mesh);
    const shrineHits = this.raycaster.intersectObjects(curatorMeshes, false);
    if (shrineHits.length > 0) {
      this.activateShrine(shrineHits[0].object.userData.shrineId, true);
      return;
    }

    const groundHits = this.raycaster.intersectObjects(this.walkableMeshes, false);
    if (groundHits.length > 0) {
      const pt = groundHits[0].point.clone();
      pt.x = THREE.MathUtils.clamp(pt.x, -8.3, 8.3);
      pt.z = THREE.MathUtils.clamp(pt.z, -8.3, 8.3);
      // Push outside central crystal fountain basin (radius 2.25)
      const rFromCenter = Math.hypot(pt.x, pt.z);
      if (rFromCenter < 2.25) {
        const scale = 2.25 / Math.max(0.01, rFromCenter);
        pt.x *= scale;
        pt.z *= scale;
      }
      this.hero.isSitting = false;
      this.hero.pendingShrineId = null;
      document.getElementById("btn-sit")?.classList.remove("is-active");
      this.hero.moveTarget = pt;
      this.vfx.setMoveTargetMarker(pt);
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
      let nx = THREE.MathUtils.clamp(this.hero.position.x + moveVec.x * speed * dt, -8.3, 8.3);
      let nz = THREE.MathUtils.clamp(this.hero.position.z + moveVec.z * speed * dt, -8.3, 8.3);
      // Fountain collision circle
      const rF = Math.hypot(nx, nz);
      if (rF < 2.2) {
        nx *= 2.2 / Math.max(0.01, rF);
        nz *= 2.2 / Math.max(0.01, rF);
      }
      this.hero.position.set(nx, 0, nz);
      this.hero.facingAngle = Math.atan2(moveVec.x, moveVec.z);
      this.hero.actor?.playAction("Walk");

      for (const sh of this.shrines) {
        if (sh.id !== this.activeShrineId && this.hero.position.distanceTo(sh.position) < 2.1) {
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
  }

  _updateCitizens(dt) {
    for (const cit of this.citizens) {
      if (cit.roam) {
        if (cit.pauseTimer > 0) {
          cit.pauseTimer -= dt;
          if (cit.actor.currentAction === "Walk") cit.actor.playAction("Idle");
        } else if (!cit.dest) {
          const ang = Math.random() * Math.PI * 2;
          const r = 3.2 + Math.random() * 2.4;
          cit.dest = new THREE.Vector3(Math.cos(ang) * r, 0, Math.sin(ang) * r);
        } else {
          const d = new THREE.Vector3().subVectors(cit.dest, cit.position);
          d.y = 0;
          if (d.length() < 0.25) {
            cit.dest = null;
            cit.pauseTimer = 2.4 + Math.random() * 2.5;
          } else {
            d.normalize();
            cit.position.x += d.x * 1.45 * dt;
            cit.position.z += d.z * 1.45 * dt;
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
    // Keep camera centered gently between hero and fountain so entire sunlit plaza stays framed
    const camFocus = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 0, 0), this.hero.position, 0.35);
    this.controller.update(dt, camFocus);

    const heroSector = this.hero.actor ? this.hero.actor.update(dt, this.controller.cameraAzimuth, this.hero.facingAngle) : 0;
    for (const sh of this.shrines) {
      sh.actor.update(dt, this.controller.cameraAzimuth, sh.facingAngle);
    }
    this._updateCitizens(dt);
    this.vfx.update(dt, this._elapsed);

    const tele = document.getElementById("hud-cam-telemetry");
    if (tele) {
      tele.textContent = `Azimuth ${this.controller.getAzimuthDegrees()}° · ${DIR_NAMES[heroSector]}`;
    }

    this.renderer.render(this.scene, this.controller.camera);
    this.vfx.updateTrackedOverlays(
      [this.hero, ...this.shrines, ...this.citizens],
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

  _bindEvents() {
    window.addEventListener("resize", () => this._handleResize());

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
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
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
