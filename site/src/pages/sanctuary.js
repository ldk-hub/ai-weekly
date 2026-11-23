/**
 * AI위클리 — 위클리 타이쿤 · 1999 오리지널 테마파크 시뮬레이터 (Sanctuary Entry)
 */

import { RctParkSimulation } from "./rct/RctParkSimulation.js";
import { RctIsoRenderer } from "./rct/RctIsoRenderer.js";
import { RctAudio } from "./rct/RctAudio.js";
import { RctWindowsUI } from "./rct/RctWindowsUI.js";
import { SanctuaryChat } from "./sanctuary/SanctuaryChat.js";
import { RIDE_CATALOG, COASTER_BLUEPRINTS } from "./rct/RctConstants.js";
import { worldToIso } from "./rct/RctCoasterEngine.js";

const THEME_KEY = "aiw-theme";
const SAVE_KEY = "aiw-rct1-save-v1";

class RctSanctuaryApp {
  constructor() {
    this.canvas = document.getElementById("rct-canvas");
    this.sim = new RctParkSimulation();
    this.audio = new RctAudio();
    this.renderer = null;
    this.windows = null;
    this.chat = null;

    this.keys = new Set();
    this._panning = false;
    this._panStart = { x: 0, y: 0, camX: 0, camY: 0 };
    this._pointerDown = null;
    this._painting = false;
    this._lastPaintKey = null;
    this._lastMinimapDraw = 0;
    this._povStepCooldown = 0;
    this._lastTime = performance.now();
    this._lastAutosave = performance.now();
  }

  async start() {
    this._initThemeToggle();

    // Wire audio SFX hook
    this.sim.onSfx = (evt) => {
      if (evt === "place") this.audio.playPlace();
      else if (evt === "bulldoze") this.audio.playBulldoze();
      else if (evt === "cash") this.audio.playCash();
      else if (evt === "pop") {
        if ((this.sim.fireworks || []).length > 0) this.audio.playFireworkBurst();
        else this.audio.playPop();
      }
      else if (evt === "scream") this.audio.playScream();
      else if (evt === "breakdown") this.audio.playBreakdown();
      else if (evt === "repair") this.audio.playRepair();
      else if (evt === "sweep") this.audio.playSweep();
      else if (evt === "award") this.audio.playAward();
      else this.audio.playClick();
    };

    // Restore saved park if present, else boot default scenario
    let restored = false;
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) restored = this.sim.deserialize(saved);
    } catch {}
    if (!restored) {
      this.sim.loadScenario("ai_weekly_park");
    }

    this.renderer = new RctIsoRenderer(this.canvas, this.sim);
    this.windows = new RctWindowsUI({
      sim: this.sim,
      renderer: this.renderer,
      audio: this.audio,
      onToolChange: (tool) => this.setActiveTool(tool),
      onSaveLocal: () => this.saveToLocal(true),
      onLoadLocal: () => this.loadFromLocal(),
      onSwitchScenario: (id) => {
        this.sim.loadScenario(id);
        this.renderer.centerOnTile(22, 24);
        this.windows.closeUnpinned();
        this._syncModeButtons?.();
        this.audio.playClick();
      },
      onControlPeep: (peepId) => this._setControlledPeep(peepId),
    });

    this.audio.startAmbientOnFirstGesture();
    this.audio.loadManifest();
    this._spawnReferrerGuest();
    this._initChat();
    this._bindEvents();
    this._loadLiveAiData();

    this._loop(performance.now());
  }

  _spawnReferrerGuest() {
    try {
      const params = new URLSearchParams(window.location.search);
      const explicit = params.get("from") || params.get("route");
      const ref = (document.referrer || "").toLowerCase();
      let routeId = null;
      if (explicit && ["plugins", "news", "social", "starboard", "benchmarks", "github", "search", "radio"].includes(explicit)) {
        routeId = explicit;
      } else if (ref.includes("news")) routeId = "news";
      else if (ref.includes("social")) routeId = "social";
      else if (ref.includes("starboard")) routeId = "starboard";
      else if (ref.includes("benchmark")) routeId = "benchmarks";
      else if (ref.includes("github.com")) routeId = "github";
      else if (ref && !ref.includes("sanctuary")) routeId = ref.includes("ai-weekly") || ref.includes("localhost") ? "plugins" : "search";
      if (routeId) {
        this.sim.spawnExternalRouteGuest(routeId, "내 아바타", false);
      }
    } catch {}
  }

  _setControlledPeep(peepId) {
    const p = this.sim.setControlledPeep(peepId);
    this._syncModeButtons?.();
    this._syncGuestPovHud?.();
    if (p) {
      this.renderer.centerOnTile(Math.round(p.x), Math.round(p.y));
    }
    if (this.windows?.windows?.has("guests-list")) this.windows._renderWindowContent("guests-list");
    if (this.windows?.windows?.has("peep-detail")) this.windows._renderWindowContent("peep-detail");
    this.audio.playClick();
    return p;
  }

  _movePovScreenDirection(dirName) {
    const baseDir = { right: 0, down: 1, left: 2, up: 3 }[dirName];
    if (baseDir === undefined) return;
    const worldDir = (baseDir - this.renderer.rotation + 4) % 4;
    const res = this.sim.moveControlledPeepByDir(worldDir);
    if (res?.ok) {
      this.audio.playFootstep();
      if (res.kind === "billboard" && res.billboard) {
        this.windows.openWindow("billboard-post", { billboardId: res.billboard.id });
      }
    } else if (res?.reason && res.kind !== "ride") {
      this.sim.pushNews(res.reason, "warn");
    }
    this._syncGuestPovHud?.();
  }

  _syncGuestPovHud() {
    const hud = document.getElementById("rct-guest-pov-hud");
    if (!hud) return;
    const p = this.sim.getControlledPeep();
    hud.hidden = !p;
    const badgeEl = document.getElementById("rct-pov-badge");
    const nameEl = document.getElementById("rct-pov-name");
    const thoughtEl = document.getElementById("rct-pov-thought");
    if (badgeEl) badgeEl.textContent = p ? `🕹️ 손님체험 · ${p.name}` : "🕹️ 손님체험";
    if (!p) return;
    const stateTxt = p.state === "riding" ? "🎢 탑승 중" : "🚶 걷는 중";
    if (nameEl) {
      nameEl.textContent = "";
      const routeSpan = document.createElement("span");
      routeSpan.className = "rct-route-badge";
      routeSpan.style.color = p.originColor || "#94a3b8";
      routeSpan.textContent = p.originBadge || "🎟 정문";
      const metaSpan = document.createElement("span");
      metaSpan.textContent = ` ${stateTxt} · $${Math.round(p.cash)}`;
      nameEl.append(routeSpan, metaSpan);
    }
    if (thoughtEl) thoughtEl.textContent = p.thoughts[0] || "WASD · 방향키 · 바닥 클릭으로 공원을 자유롭게 걸어보세요!";
  }

  _syncThemeTogglePlaceholder() {}

  _initThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    const syncLabel = () => {
      const cur = document.documentElement.dataset.theme || "dark";
      if (btn) btn.textContent = cur === "dark" ? "라이트" : "다크";
    };
    syncLabel();
    btn?.addEventListener("click", () => {
      const cur = document.documentElement.dataset.theme || "dark";
      const next = cur === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
      syncLabel();
    });
  }

  _initChat() {
    this.chat = new SanctuaryChat({
      onPeerUpdate: (peer, isNew) => {
        this.sim.syncPeerAvatar(peer, isNew);
      },
      onPeerLeave: (clientId) => {
        this.sim.removePeerAvatar(clientId);
      },
      onSelfPublicChat: (text) => {
        this.sim.triggerPeerChatBubble(null, text, this.chat?.nickname);
      },
      onPeerPublicChat: (clientId, text) => {
        this.sim.triggerPeerChatBubble(clientId, text);
      },
      onRemoteFx: (data) => {
        if (data?.kind === "emote") {
          this.sim.triggerPeerEmote(data.clientId, data.emoji || "🎉");
        } else if (data?.kind === "finale_fireworks") {
          this.sim.spawnMultiplayerFinaleFireworks();
        }
      },
    });
    this.chat.start();
    this.chat.setCollapsed(true);

    document.getElementById("rct-btn-radio")?.addEventListener("click", () => {
      this.chat.setCollapsed(!this.chat.collapsed);
      this.audio.playClick();
    });
    document.querySelectorAll("[data-chat-emote]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const emoji = btn.dataset.chatEmote || "🎉";
        this.sim.triggerPeerEmote(null, emoji);
        this.chat?.broadcastFx("emote", { emoji });
        this.audio.playPop();
      });
    });
    document.getElementById("chat-user-tabs")?.addEventListener("click", (ev) => {
      const tab = ev.target.closest("[data-thread-id]");
      const tid = tab?.dataset?.threadId;
      if (tid && tid !== "global") {
        const vip = this.sim.peeps.find((p) => p.peerClientId === tid);
        if (vip) this.renderer.centerOnTile(Math.round(vip.x), Math.round(vip.y));
      }
    });
  }

  async _loadLiveAiData() {
    try {
      const [pluginsRes, newsRes, socialRes, benchRes, ledgerRes] = await Promise.allSettled([
        fetch("data/latest.json").then((r) => (r.ok ? r.json() : null)),
        fetch("data/news_latest.json").then((r) => (r.ok ? r.json() : null)),
        fetch("data/social_latest.json").then((r) => (r.ok ? r.json() : null)),
        fetch("data/benchmarks_latest.json").then((r) => (r.ok ? r.json() : null)),
        fetch("data/stars_ledger.json").then((r) => (r.ok ? r.json() : null)),
      ]);
      const pVal = pluginsRes.status === "fulfilled" ? pluginsRes.value : null;
      const nVal = newsRes.status === "fulfilled" ? newsRes.value : null;
      const sVal = socialRes.status === "fulfilled" ? socialRes.value : null;
      const bVal = benchRes.status === "fulfilled" ? benchRes.value : null;
      const lVal = ledgerRes.status === "fulfilled" ? ledgerRes.value : null;
      const pluginsList = pVal
        ? [...(pVal.rising || []), ...(pVal.classic || []), ...(pVal.plugins || pVal.items || [])]
        : [];
      if (lVal && typeof lVal === "object") {
        for (const it of pluginsList) {
          const hist = lVal[it.repo];
          if (Array.isArray(hist) && hist.length >= 2 && !it.velocity_7d) {
            it.velocity_7d = Math.max(0, Number(hist[hist.length - 1]?.stars || 0) - Number(hist[hist.length - 2]?.stars || 0));
          }
        }
      }
      this.sim.syncAiWeeklyData({
        plugins: pluginsList,
        news: nVal ? nVal.news || nVal.items || [] : [],
        social: sVal ? sVal.items || sVal.posts || [] : [],
        benchmarks: bVal ? bVal.model_benchmarks || bVal.leaderboard || bVal.models || [] : [],
      });
    } catch {}
  }

  saveToLocal(announce = false) {
    try {
      localStorage.setItem(SAVE_KEY, this.sim.serialize());
      if (announce) {
        this.sim.pushNews("💾 공원 상태를 브라우저에 안전하게 저장했습니다.", "good");
        this.audio.playCash();
      }
    } catch {}
  }

  loadFromLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        this.sim.pushNews("저장된 공원 파일이 없습니다.", "warn");
        return;
      }
      this.sim.deserialize(raw);
      this.renderer.centerOnTile(22, 24);
      this._syncModeButtons?.();
      this.audio.playCash();
    } catch {}
  }

  setActiveTool(tool, silent = false) {
    this.renderer.activeTool = { facing: 0, ...tool };
    if (tool.type !== "pincer") this.renderer.pincerCarry = null;

    if (this.canvas) {
      let cursorKind = "inspect";
      if (tool.type === "bulldoze") cursorKind = "bulldoze";
      else if (["land_up", "land_down", "water_up", "water_down", "surface"].includes(tool.type)) cursorKind = "terrain";
      else if (["path", "path_add", "scenery", "place_ride", "blueprint", "custom_coaster"].includes(tool.type)) cursorKind = "build";
      else if (tool.type === "pincer") cursorKind = "pincer";
      this.canvas.dataset.toolCursor = cursorKind;
    }

    const indText = document.getElementById("rct-tool-text");
    const cancelBtn = document.getElementById("rct-btn-cancel-tool");
    document.getElementById("rct-btn-bulldoze")?.classList.toggle("is-active", tool.type === "bulldoze");
    document.querySelector('[data-win="terraform"]')?.classList.toggle(
      "is-active",
      ["land_up", "land_down", "water_up", "water_down", "surface"].includes(tool.type)
    );
    document.querySelector('[data-win="footpath"]')?.classList.toggle(
      "is-active",
      tool.type === "path" || tool.type === "path_add"
    );
    document.querySelector('[data-win="scenery"]')?.classList.toggle("is-active", tool.type === "scenery");
    document.querySelector('[data-win="build"]')?.classList.toggle(
      "is-active",
      ["place_ride", "blueprint", "custom_coaster"].includes(tool.type)
    );

    const labelMap = {
      inspect: "👆 클릭: 기구·손님·직원·외곽 광고판 확인 | 우클릭 드래그: 이동 | 휠: 줌",
      bulldoze: "💣 철거 모드: 클릭 또는 드래그해 보도·나무·기구를 철거하세요",
      land_up: `⛰ 지형 올리기 (${tool.brushSize || 1}×${tool.brushSize || 1}): 클릭/드래그하세요 (+3m · $20)`,
      land_down: `🕳 지형 내리기 (${tool.brushSize || 1}×${tool.brushSize || 1}): 클릭/드래그하세요 (-3m · $20)`,
      water_up: `💧 물 채우기 (${tool.brushSize || 1}×${tool.brushSize || 1}): 클릭/드래그하세요 ($25)`,
      water_down: `🏜 물 배수 (${tool.brushSize || 1}×${tool.brushSize || 1}): 클릭/드래그하세요 ($25)`,
      surface: `🎨 지면 칠하기 (${tool.subId} · ${tool.brushSize || 1}×${tool.brushSize || 1}): 마우스 드래그로 칠하세요`,
      path: `🛤 보도 설치 (${tool.subId}): 클릭·드래그로 보도를 이어 그리세요`,
      path_add: `🪑 보도 소품 (${tool.subId}): 보도 위를 클릭하세요`,
      scenery: `🌲 풍경 배치 (${tool.subId}): 클릭·드래그로 빈 땅에 배치하세요`,
      place_ride: `🎡 시설 배치 (${RIDE_CATALOG[tool.subId]?.name || tool.subId}): 부지를 클릭하세요`,
      blueprint: `📐 설계도 배치 (${COASTER_BLUEPRINTS[tool.subId]?.name || tool.subId}): 시작 타일을 클릭하세요`,
      custom_coaster: `🎢 커스텀 코스터 시작: 승강장을 놓을 빈 타일을 클릭하세요`,
      pincer: `🦀 집게 이동 중 (${this.renderer.pincerCarry?.label || ""}): 내려놓을 보도 타일을 클릭하세요`,
    };
    if (indText) indText.textContent = labelMap[tool.type] || labelMap.inspect;
    if (cancelBtn) cancelBtn.hidden = tool.type === "inspect";
    if (!silent) this.audio.playClick();
  }

  _bindEvents() {
    // Top Toolbar Actions
    const pauseBtn = document.getElementById("rct-btn-pause");
    const speedBtn = document.getElementById("rct-btn-speed");
    const speedLbl = document.getElementById("rct-speed-label");

    const syncSpeedBtns = () => {
      pauseBtn?.classList.toggle("is-active", this.sim.speedMultiplier === 0);
      speedBtn?.classList.toggle("is-active", this.sim.speedMultiplier > 0);
      if (speedLbl) speedLbl.textContent = this.sim.speedMultiplier === 0 ? "0x" : `${this.sim.speedMultiplier}x`;
    };

    pauseBtn?.addEventListener("click", () => {
      this.sim.speedMultiplier = this.sim.speedMultiplier === 0 ? 1 : 0;
      syncSpeedBtns();
      this.audio.playClick();
    });

    speedBtn?.addEventListener("click", () => {
      const order = [1, 2, 4];
      const next = order[(order.indexOf(this.sim.speedMultiplier) + 1) % order.length];
      this.sim.speedMultiplier = next;
      syncSpeedBtns();
      this.audio.playClick();
    });

    const sfxBtn = document.getElementById("rct-btn-sfx");
    sfxBtn?.addEventListener("click", () => {
      const on = this.audio.toggleSfx();
      sfxBtn.classList.toggle("is-active", on);
    });

    const bgmBtn = document.getElementById("rct-btn-bgm");
    bgmBtn?.addEventListener("click", () => {
      const on = this.audio.toggleOrganBgm();
      bgmBtn.classList.toggle("is-active", on);
    });

    document.getElementById("rct-btn-zoom-in")?.addEventListener("click", () => {
      this.renderer.zoomBy(1.2);
      this.audio.playClick();
    });
    document.getElementById("rct-btn-zoom-out")?.addEventListener("click", () => {
      this.renderer.zoomBy(0.83);
      this.audio.playClick();
    });
    document.getElementById("rct-btn-rotate")?.addEventListener("click", () => {
      this.renderer.rotateCamera(1);
      this.audio.playClick();
    });
    document.getElementById("rct-btn-view-opts")?.addEventListener("click", () => {
      this.windows.openWindow("view-opts");
    });
    document.getElementById("rct-btn-bulldoze")?.addEventListener("click", () => {
      this.setActiveTool(
        this.renderer.activeTool.type === "bulldoze" ? { type: "inspect" } : { type: "bulldoze" }
      );
    });
    document.getElementById("rct-btn-cancel-tool")?.addEventListener("click", () => {
      this.setActiveTool({ type: "inspect" });
    });

    const freeBtn = document.getElementById("rct-btn-freebuild");
    const nightBtn = document.getElementById("rct-btn-night");
    const minimapBtn = document.getElementById("rct-btn-minimap");
    const minimapPod = document.getElementById("rct-minimap-pod");
    const minimapCanvas = document.getElementById("rct-minimap-canvas");
    const povBtn = document.getElementById("rct-btn-guest-pov");
    const nightLabel = document.getElementById("rct-night-label");

    this._syncModeButtons = () => {
      const lm = this.sim.lightingMode || (this.sim.nightMode ? "night" : "day");
      const lmNames = { day: "야간·폭죽", golden: "골든아워", night: "야간쇼", cycle: "자동주야간" };
      freeBtn?.classList.toggle("is-active", Boolean(this.sim.freeBuildMode));
      nightBtn?.classList.toggle("is-active", lm !== "day" || Boolean(this.sim.nightMode));
      if (nightLabel) nightLabel.textContent = lmNames[lm] || "야간·폭죽";
      bgmBtn?.classList.toggle("is-active", Boolean(this.audio.bgmEnabled));
      povBtn?.classList.toggle("is-active", Boolean(this.sim.controlledPeepId));
      if (minimapPod) {
        minimapBtn?.classList.toggle("is-active", !minimapPod.classList.contains("is-hidden"));
      }
      this._syncGuestPovHud?.();
    };
    this._syncModeButtons();
    this.setActiveTool({ type: "inspect" }, true);
    document.addEventListener("rct-sync-hud", () => this._syncModeButtons?.());

    // Right-click SFX or BGM button opens 4-channel Spatial Audio Mixer
    for (const ab of [sfxBtn, bgmBtn]) {
      ab?.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        this.windows.openWindow("audio-mixer");
      });
    }

    document.getElementById("rct-btn-photo")?.addEventListener("click", () => {
      const dataUrl = this.renderer.renderPhotoSnapshot();
      this.windows.openWindow("photo-preview", { dataUrl });
      try {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "ai-weekly-sanctuary-photo.png";
        a.click();
      } catch {}
      this.audio.playAward();
      this.sim.pushNews("📸 위클리월드 폴라로이드 기념 사진이 촬영되었습니다!", "good");
    });

    povBtn?.addEventListener("click", () => {
      if (this.sim.controlledPeepId) {
        this._setControlledPeep(null);
      } else {
        const ext = this.sim.peeps.find((p) => p.isExternalRoute) || this.sim.peeps[0] || this.sim.spawnExternalRouteGuest("news");
        if (ext) {
          this.setActiveTool({ type: "inspect" });
          this._setControlledPeep(ext.id);
        }
      }
    });

    document.getElementById("rct-pov-exit")?.addEventListener("click", () => {
      this._setControlledPeep(null);
    });
    document.querySelectorAll("[data-pov-move]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._movePovScreenDirection(btn.dataset.povMove);
      });
    });
    document.getElementById("rct-pov-interact")?.addEventListener("click", () => {
      const res = this.sim.interactControlledPeepWithAdjacent();
      if (!res.ok && res.reason) this.sim.pushNews(res.reason, "warn");
      if (res.kind === "billboard" && res.billboard) {
        this.windows.openWindow("billboard-post", { billboardId: res.billboard.id });
      }
      this._syncGuestPovHud?.();
    });
    document.getElementById("rct-pov-next-guest")?.addEventListener("click", () => {
      const p = this.sim.cycleControlledExternalPeep();
      this._syncModeButtons?.();
      if (p) this.renderer.centerOnTile(Math.round(p.x), Math.round(p.y));
      this.audio.playClick();
    });
    document.getElementById("rct-pov-spawn-route")?.addEventListener("click", () => {
      this.windows._guestTab = "external";
      this.windows.openWindow("guests-list");
    });

    freeBtn?.addEventListener("click", () => {
      const on = this.sim.toggleFreeBuildMode();
      this._syncModeButtons();
      this.audio.playCash();
      if (this.windows.windows.has("build")) this.windows._renderWindowContent("build");
      if (this.windows.windows.has("scenery")) this.windows._renderWindowContent("scenery");
      if (on && this.sim.rides.length === 0) this.renderer.centerOnTile(22, 24);
    });

    nightBtn?.addEventListener("click", () => {
      const nextMode = this.sim.cycleLightingMode();
      if (nextMode === "night") {
        this.sim.spawnMultiplayerFinaleFireworks();
        this.audio.playFireworkBurst();
        this.chat?.broadcastFx("finale_fireworks");
      } else if (nextMode === "golden") {
        this.sim.pushNews("🌇 황금빛 골든아워 조명으로 전환했습니다!", "info");
      } else if (nextMode === "cycle") {
        this.sim.pushNews("🌅 자동 주야간 순환 사이클이 시작되었습니다!", "info");
      } else {
        this.sim.pushNews("☀️ 맑은 낮 조명으로 복귀했습니다.", "info");
      }
      this._syncModeButtons();
      this.audio.playClick();
    });

    const toggleMinimap = () => {
      minimapPod?.classList.toggle("is-hidden");
      this._syncModeButtons();
      this.audio.playClick();
    };
    minimapBtn?.addEventListener("click", toggleMinimap);
    document.getElementById("rct-minimap-close")?.addEventListener("click", toggleMinimap);

    if (minimapCanvas) {
      let miniDragging = false;
      const jumpFromMini = (ev) => {
        const rect = minimapCanvas.getBoundingClientRect();
        const pos = this.renderer.minimapPointToTile(minimapCanvas, ev.clientX - rect.left, ev.clientY - rect.top);
        this.renderer.centerOnTile(pos.tileX, pos.tileY);
      };
      minimapCanvas.addEventListener("pointerdown", (ev) => {
        if (ev.button !== 0) return;
        miniDragging = true;
        jumpFromMini(ev);
        this.audio.playClick();
      });
      window.addEventListener("pointermove", (ev) => {
        if (miniDragging) jumpFromMini(ev);
      });
      window.addEventListener("pointerup", () => {
        miniDragging = false;
      });
    }

    document.getElementById("rct-jump-billboards")?.addEventListener("click", () => {
      const firstBb = this.sim.perimeterBillboards?.[0];
      if (firstBb) {
        this.renderer.centerOnTile(firstBb.tileX, firstBb.tileY);
        this.windows.openWindow("billboard-post", { billboardId: firstBb.id });
      }
    });
    document.getElementById("rct-jump-plaza")?.addEventListener("click", () => {
      this.renderer.centerOnTile(22, 24);
      this.audio.playClick();
    });

    document.querySelectorAll("#rct-top-toolbar [data-win]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.windows.openWindow(btn.dataset.win);
      });
    });

    document.getElementById("rct-ticker-pod")?.addEventListener("click", () => {
      this.windows.openWindow("park");
    });

    // Canvas Mouse & Wheel Interactions
    this.canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

    this.canvas.addEventListener("pointerdown", (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      const cssX = ev.clientX - rect.left;
      const cssY = ev.clientY - rect.top;

      if (ev.button === 2 || ev.button === 1) {
        this._panning = true;
        this._panStart = { x: ev.clientX, y: ev.clientY, camX: this.renderer.camX, camY: this.renderer.camY };
        this._panPrev = { x: ev.clientX, y: ev.clientY, t: performance.now() };
        this.renderer.panVelX = 0;
        this.renderer.panVelY = 0;
        this.canvas.setPointerCapture?.(ev.pointerId);
        return;
      }
      if (ev.button === 0) {
        const dragTools = new Set(["bulldoze", "path", "surface", "scenery", "land_up", "land_down", "water_up", "water_down"]);
        const toolType = this.renderer.activeTool.type;
        if (dragTools.has(toolType)) {
          this._painting = true;
          this._lastPaintKey = null;
          const { tileX, tileY } = this.renderer.pickTileAtScreen(cssX, cssY);
          this._lastPaintKey = `${tileX},${tileY}`;
          this._applyActiveToolAtTile(tileX, tileY);
        } else {
          this._pointerDown = { x: cssX, y: cssY, rawX: ev.clientX, rawY: ev.clientY };
        }
      }
    });

    window.addEventListener("pointermove", (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      const cssX = ev.clientX - rect.left;
      const cssY = ev.clientY - rect.top;

      if (this._panning) {
        const nowT = performance.now();
        const dx = ev.clientX - this._panStart.x;
        const dy = ev.clientY - this._panStart.y;
        this.renderer.camX = this._panStart.camX - dx / this.renderer.zoom;
        this.renderer.camY = this._panStart.camY - dy / this.renderer.zoom;
        if (this._panPrev && nowT > this._panPrev.t) {
          const dtMove = Math.max(0.008, (nowT - this._panPrev.t) / 1000);
          this.renderer.panVelX = (-(ev.clientX - this._panPrev.x) / this.renderer.zoom) / dtMove;
          this.renderer.panVelY = (-(ev.clientY - this._panPrev.y) / this.renderer.zoom) / dtMove;
        }
        this._panPrev = { x: ev.clientX, y: ev.clientY, t: nowT };
        return;
      }

      if (cssX >= 0 && cssY >= 0 && cssX <= rect.width && cssY <= rect.height) {
        const picked = this.renderer.pickTileAtScreen(cssX, cssY);
        this.renderer.hoverTile = picked;
        if (this._painting) {
          const pKey = `${picked.tileX},${picked.tileY}`;
          if (pKey !== this._lastPaintKey) {
            this._lastPaintKey = pKey;
            this._applyActiveToolAtTile(picked.tileX, picked.tileY);
          }
        }
      }
    });

    window.addEventListener("pointerup", (ev) => {
      if (this._panning && (ev.button === 2 || ev.button === 1)) {
        this._panning = false;
        if (!this._panPrev || (performance.now() - this._panPrev.t) > 90) {
          this.renderer.panVelX = 0;
          this.renderer.panVelY = 0;
        }
        this._panPrev = null;
        return;
      }
      if (ev.button === 0 && this._painting) {
        this._painting = false;
        this._lastPaintKey = null;
        return;
      }
      if (ev.button === 0 && this._pointerDown) {
        const dist = Math.hypot(ev.clientX - this._pointerDown.rawX, ev.clientY - this._pointerDown.rawY);
        const { x, y } = this._pointerDown;
        this._pointerDown = null;
        if (dist < 7) this._handleCanvasClick(x, y);
      }
    });

    this.canvas.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      this.renderer.zoomBy(ev.deltaY < 0 ? 1.12 : 0.89, ev.clientX - rect.left, ev.clientY - rect.top);
    }, { passive: false });

    // Keyboard shortcuts
    window.addEventListener("keydown", (ev) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (ev.key === "Escape") document.activeElement.blur();
        return;
      }
      this.keys.add(ev.code);
      if (this.sim.controlledPeepId && !ev.repeat) {
        if (ev.code === "KeyW" || ev.code === "ArrowUp") { ev.preventDefault(); this._movePovScreenDirection("up"); this._povStepCooldown = 0.22; return; }
        if (ev.code === "KeyS" || ev.code === "ArrowDown") { ev.preventDefault(); this._movePovScreenDirection("down"); this._povStepCooldown = 0.22; return; }
        if (ev.code === "KeyA" || ev.code === "ArrowLeft") { ev.preventDefault(); this._movePovScreenDirection("left"); this._povStepCooldown = 0.22; return; }
        if (ev.code === "KeyD" || ev.code === "ArrowRight") { ev.preventDefault(); this._movePovScreenDirection("right"); this._povStepCooldown = 0.22; return; }
        if (ev.code === "KeyE") {
          const res = this.sim.interactControlledPeepWithAdjacent();
          if (res.kind === "billboard" && res.billboard) this.windows.openWindow("billboard-post", { billboardId: res.billboard.id });
          this._syncGuestPovHud?.();
          return;
        }
      }
      if (ev.code === "KeyR") {
        this.renderer.rotateCamera(1);
        this.audio.playClick();
      } else if (ev.code === "Space") {
        ev.preventDefault();
        pauseBtn?.click();
      } else if (ev.code === "Escape") {
        if (this.sim.controlledPeepId) {
          this._setControlledPeep(null);
        } else if (this.renderer.activeTool.type !== "inspect") {
          this.setActiveTool({ type: "inspect" });
        } else {
          this.windows.closeTopUnpinned();
        }
      } else {
        const hotkeyMap = {
          Digit1: "terraform",
          Digit2: "footpath",
          Digit3: "scenery",
          Digit4: "build",
          Digit5: "rides-list",
          Digit6: "park",
          Digit7: "staff",
          Digit8: "guests-list",
          Digit9: "finances",
        };
        const targetWin = hotkeyMap[ev.code];
        if (targetWin) {
          if (this.windows.windows.has(targetWin)) this.windows.closeWindow(targetWin);
          else this.windows.openWindow(targetWin);
        }
      }
    });
    window.addEventListener("keyup", (ev) => this.keys.delete(ev.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  _applyActiveToolAtTile(tileX, tileY) {
    const tool = this.renderer.activeTool;
    const brush = tool.brushSize === 3 ? [-1, 0, 1] : [0];
    let lastRes = null;

    if (tool.type === "surface") {
      for (const dy of brush) {
        for (const dx of brush) {
          lastRes = this.sim.paintSurface(tileX + dx, tileY + dy, tool.subId || "grass");
        }
      }
      if (lastRes?.ok) this.audio.playClick();
    } else if (["land_up", "land_down", "water_up", "water_down"].includes(tool.type)) {
      for (const dy of brush) {
        for (const dx of brush) {
          const tx = tileX + dx;
          const ty = tileY + dy;
          if (tool.type === "land_up") lastRes = this.sim.raiseLowerLand(tx, ty, 1);
          else if (tool.type === "land_down") lastRes = this.sim.raiseLowerLand(tx, ty, -1);
          else if (tool.type === "water_up") {
            const cur = this.sim.getTile(tx, ty);
            lastRes = this.sim.setWaterLevel(tx, ty, Math.max((cur?.height || 2) + 1, cur?.waterHeight || 2));
          } else {
            lastRes = this.sim.setWaterLevel(tx, ty, 0);
          }
        }
      }
    } else if (tool.type === "bulldoze") {
      lastRes = this.sim.bulldozeTile(tileX, tileY);
    } else if (tool.type === "path") {
      lastRes = this.sim.placeFootpath(tileX, tileY, tool.subId, tool.subId === "queue");
    } else if (tool.type === "path_add") {
      lastRes = this.sim.placePathAddition(tileX, tileY, tool.subId);
    } else if (tool.type === "scenery") {
      lastRes = this.sim.placeScenery(tileX, tileY, tool.subId);
    } else if (tool.type === "place_ride") {
      lastRes = this.sim.placeRideOrShop(tileX, tileY, tool.subId);
      if (lastRes?.ok) {
        this.setActiveTool({ type: "inspect" });
        this.windows.openWindow("ride-detail", { rideId: lastRes.ride.id });
      }
    } else if (tool.type === "blueprint") {
      const bp = COASTER_BLUEPRINTS[tool.subId];
      lastRes = this.sim.placeRideOrShop(tileX, tileY, bp?.rideCatalogId || "wooden_coaster", {
        blueprintId: tool.subId,
      });
      if (lastRes?.ok) {
        this.setActiveTool({ type: "inspect" });
        this.windows.openWindow("ride-detail", { rideId: lastRes.ride.id });
      }
    } else if (tool.type === "custom_coaster") {
      lastRes = this.sim.startCustomCoaster(tileX, tileY, tool.subId, tool.facing || 0);
      if (lastRes?.ok) {
        this.setActiveTool({ type: "inspect" });
        this.windows.openWindow("coaster-builder", { rideId: lastRes.ride.id });
      }
    }

    if (lastRes && !lastRes.ok && lastRes.reason && !this._painting) {
      this.sim.pushNews(lastRes.reason, "warn");
    }
  }

  _handleCanvasClick(cssX, cssY) {
    const tool = this.renderer.activeTool;

    if (tool.type === "pincer" && this.renderer.pincerCarry) {
      const tile = this.renderer.pickTileAtScreen(cssX, cssY);
      const carry = this.renderer.pincerCarry;
      if (carry.kind === "peep") {
        this.sim.dropPeepWithPincer(carry.id, tile.tileX, tile.tileY);
      } else if (carry.kind === "staff") {
        this.sim.dropStaffWithPincer(carry.id, tile.tileX, tile.tileY);
      }
      this.setActiveTool({ type: "inspect" });
      return;
    }

    if (tool.type !== "inspect") {
      const { tileX, tileY } = this.renderer.pickTileAtScreen(cssX, cssY);
      this._applyActiveToolAtTile(tileX, tileY);
      return;
    }

    // Inspect mode: pop balloon, read billboard, fire mortar, inspect guest/staff/ride
    const hit = this.renderer.pickEntityAtScreen(cssX, cssY);
    if (!hit) return;
    if (hit.kind === "balloon") {
      this.sim.popBalloonAt(hit.id);
      return;
    }
    if (hit.kind === "billboard") {
      this.windows.openWindow("billboard-post", { billboardId: hit.id });
      return;
    }
    if (hit.kind === "supernova") {
      this.windows.openWindow("supernova");
      return;
    }
    if (hit.kind === "peep") {
      this.windows.openWindow("peep-detail", { peepId: hit.id });
      return;
    }
    if (hit.kind === "staff") {
      this.windows.openWindow("staff");
      return;
    }
    if (hit.kind === "ride") {
      this.windows.openWindow("ride-detail", { rideId: hit.id });
      return;
    }
    if (hit.kind === "tile") {
      const t = this.sim.getTile(hit.tileX, hit.tileY);
      if (t?.scenery?.id === "firework_launcher") {
        this.sim.launchFireworksAt(hit.tileX, hit.tileY);
        return;
      }
      if (this.sim.controlledPeepId) {
        const res = this.sim.walkControlledPeepToTile(hit.tileX, hit.tileY);
        if (res?.ok) this.audio.playFootstep();
        this._syncGuestPovHud?.();
      }
    }
  }

  _loop(nowMs) {
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - this._lastTime) / 1000));
    this._lastTime = nowMs;

    const ctrlPeep = this.sim.getControlledPeep();
    if (ctrlPeep) {
      if (this._povStepCooldown > 0) this._povStepCooldown -= dt;
      if (this._povStepCooldown <= 0) {
        if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) { this._movePovScreenDirection("up"); this._povStepCooldown = 0.22; }
        else if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) { this._movePovScreenDirection("down"); this._povStepCooldown = 0.22; }
        else if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) { this._movePovScreenDirection("left"); this._povStepCooldown = 0.22; }
        else if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) { this._movePovScreenDirection("right"); this._povStepCooldown = 0.22; }
      }
    } else {
      // Keyboard WASD / Arrow smooth camera pan
      const panSpeed = 420 / this.renderer.zoom;
      if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this.renderer.camY -= panSpeed * dt;
      if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this.renderer.camY += panSpeed * dt;
      if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this.renderer.camX -= panSpeed * dt;
      if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this.renderer.camX += panSpeed * dt;
    }

    this.renderer.stepCamera(dt);
    this.sim.step(dt);
    this.audio.updateSpatialField({
      camX: this.renderer.camX,
      camY: this.renderer.camY,
      zoom: this.renderer.zoom,
      rides: this.sim.rides,
      rotation: this.renderer.rotation,
      mapSize: this.sim.mapSize,
      weather: this.sim.weather,
      nowMs,
    });

    // Smooth camera follow when Guest POV Manual Mode is active
    const followPeep = this.sim.getControlledPeep();
    if (followPeep) {
      let fx = followPeep.x;
      let fy = followPeep.y;
      let fz = this.sim.getTile(Math.round(fx), Math.round(fy))?.height || 2;
      if (followPeep.state === "riding" && followPeep.ridingRideId) {
        const ride = this.sim.rides.find((r) => r.id === followPeep.ridingRideId);
        if (ride?.track?.trains?.[0]) {
          const pose = ride.track.samplePoseAtDistance(ride.track.trains[0].distance);
          fx = pose.x;
          fy = pose.y;
          fz = pose.z;
        } else if (ride) {
          fx = ride.x;
          fy = ride.y;
          fz = ride.z;
        }
      }
      const isoTarget = worldToIso(fx, fy, fz, this.renderer.rotation, this.sim.mapSize);
      const lerpFactor = Math.min(1, dt * 6);
      this.renderer.camX += (isoTarget.screenX - this.renderer.camX) * lerpFactor;
      this.renderer.camY += (isoTarget.screenY - this.renderer.camY) * lerpFactor;
    }

    const nowSec = nowMs / 1000;
    this.renderer.render(nowSec);
    this.windows.refreshLiveState(nowSec);

    if (nowMs - this._lastMinimapDraw > 120) {
      this._lastMinimapDraw = nowMs;
      if (followPeep) this._syncGuestPovHud?.();
      const mmCanvas = document.getElementById("rct-minimap-canvas");
      if (mmCanvas && !mmCanvas.closest(".rct-minimap-pod")?.classList.contains("is-hidden")) {
        this.renderer.renderMinimap(mmCanvas);
      }
    }

    if (nowMs - this._lastAutosave > 25000) {
      this._lastAutosave = nowMs;
      this.saveToLocal(false);
    }

    requestAnimationFrame((t) => this._loop(t));
  }
}

const app = new RctSanctuaryApp();
app.start().catch((err) => console.error("[RCT1Sanctuary] Boot error:", err));
