/**
 * AI위클리 — 위클리 타이쿤 · 1999 오리지널 테마파크 시뮬레이터 (Sanctuary Entry)
 */

import { RctParkSimulation } from "./rct/RctParkSimulation.js";
import { RctIsoRenderer } from "./rct/RctIsoRenderer.js";
import { RctAudio } from "./rct/RctAudio.js";
import { RctWindowsUI } from "./rct/RctWindowsUI.js";
import { SanctuaryChat } from "./sanctuary/SanctuaryChat.js";
import { RIDE_CATALOG, COASTER_BLUEPRINTS } from "./rct/RctConstants.js";

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
      else if (evt === "pop") this.audio.playPop();
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
        this.renderer.centerOnTile(14, 16);
        this.windows.closeUnpinned();
        this.audio.playClick();
      },
    });

    this._initChat();
    this._bindEvents();
    this._loadLiveAiData();

    this._loop(performance.now());
  }

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
        if (isNew) {
          this.sim._spawnGuest(this.sim.entrance.x, Math.max(1, this.sim.entrance.y - 1), true);
          this.sim.pushNews(`📻 [무전기] ${peer.nickname} 님이 공원에 방문했습니다!`, "good");
        }
      },
    });
    this.chat.start();
    this.chat.setCollapsed(true);

    document.getElementById("rct-btn-radio")?.addEventListener("click", () => {
      this.chat.setCollapsed(!this.chat.collapsed);
      this.audio.playClick();
    });
  }

  async _loadLiveAiData() {
    try {
      const [pluginsRes, newsRes, socialRes, benchRes] = await Promise.allSettled([
        fetch("data/latest.json").then((r) => (r.ok ? r.json() : null)),
        fetch("data/news_latest.json").then((r) => (r.ok ? r.json() : null)),
        fetch("data/social_latest.json").then((r) => (r.ok ? r.json() : null)),
        fetch("data/benchmarks_latest.json").then((r) => (r.ok ? r.json() : null)),
      ]);
      const pVal = pluginsRes.status === "fulfilled" ? pluginsRes.value : null;
      const nVal = newsRes.status === "fulfilled" ? newsRes.value : null;
      const sVal = socialRes.status === "fulfilled" ? socialRes.value : null;
      const bVal = benchRes.status === "fulfilled" ? benchRes.value : null;
      const pluginsList = pVal
        ? [...(pVal.rising || []), ...(pVal.classic || []), ...(pVal.plugins || pVal.items || [])]
        : [];
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
      this.renderer.centerOnTile(14, 16);
      this.audio.playCash();
    } catch {}
  }

  setActiveTool(tool) {
    this.renderer.activeTool = { facing: 0, ...tool };
    if (tool.type !== "pincer") this.renderer.pincerCarry = null;

    const indText = document.getElementById("rct-tool-text");
    const cancelBtn = document.getElementById("rct-btn-cancel-tool");
    const bulldozeBtn = document.getElementById("rct-btn-bulldoze");
    bulldozeBtn?.classList.toggle("is-active", tool.type === "bulldoze");

    const labelMap = {
      inspect: "👆 클릭: 기구·손님·직원 정보 확인 | 우클릭 드래그: 화면 이동 | 휠: 확대/축소",
      bulldoze: "💣 철거 모드: 제거할 보도·나무·기구를 클릭하세요",
      land_up: "⛰ 지형 올리기: 높일 타일을 클릭하세요 (+3m · $20)",
      land_down: "🕳 지형 내리기: 낮출 타일을 클릭하세요 (-3m · $20)",
      water_up: "💧 물 채우기: 연못을 만들 타일을 클릭하세요 ($25)",
      water_down: "🏜 물 배수: 물을 뺄 타일을 클릭하세요 ($25)",
      path: `🛤 보도 설치 (${tool.subId}): 보도를 깔 타일을 클릭하세요`,
      path_add: `🪑 보도 소품 (${tool.subId}): 보도 위를 클릭하세요`,
      scenery: `🌲 풍경 배치 (${tool.subId}): 빈 땅을 클릭하세요`,
      place_ride: `🎡 시설 배치 (${RIDE_CATALOG[tool.subId]?.name || tool.subId}): 부지를 클릭하세요`,
      blueprint: `📐 설계도 배치 (${COASTER_BLUEPRINTS[tool.subId]?.name || tool.subId}): 시작 타일을 클릭하세요`,
      custom_coaster: `🎢 커스텀 코스터 시작: 승강장을 놓을 빈 타일을 클릭하세요`,
      pincer: `🦀 집게 이동 중 (${this.renderer.pincerCarry?.label || ""}): 내려놓을 보도 타일을 클릭하세요`,
    };
    if (indText) indText.textContent = labelMap[tool.type] || labelMap.inspect;
    if (cancelBtn) cancelBtn.hidden = tool.type === "inspect";
    this.audio.playClick();
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
        this.canvas.setPointerCapture?.(ev.pointerId);
        return;
      }
      if (ev.button === 0) {
        this._pointerDown = { x: cssX, y: cssY, rawX: ev.clientX, rawY: ev.clientY };
      }
    });

    window.addEventListener("pointermove", (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      const cssX = ev.clientX - rect.left;
      const cssY = ev.clientY - rect.top;

      if (this._panning) {
        const dx = ev.clientX - this._panStart.x;
        const dy = ev.clientY - this._panStart.y;
        this.renderer.camX = this._panStart.camX - dx / this.renderer.zoom;
        this.renderer.camY = this._panStart.camY - dy / this.renderer.zoom;
        return;
      }

      if (cssX >= 0 && cssY >= 0 && cssX <= rect.width && cssY <= rect.height) {
        this.renderer.hoverTile = this.renderer.pickTileAtScreen(cssX, cssY);
      }
    });

    window.addEventListener("pointerup", (ev) => {
      if (this._panning && (ev.button === 2 || ev.button === 1)) {
        this._panning = false;
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
      if (ev.code === "KeyR") {
        this.renderer.rotateCamera(1);
        this.audio.playClick();
      } else if (ev.code === "Space") {
        ev.preventDefault();
        pauseBtn?.click();
      } else if (ev.code === "Escape") {
        if (this.renderer.activeTool.type !== "inspect") {
          this.setActiveTool({ type: "inspect" });
        } else {
          this.windows.closeUnpinned();
        }
      }
    });
    window.addEventListener("keyup", (ev) => this.keys.delete(ev.code));
    window.addEventListener("blur", () => this.keys.clear());
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
      let res = null;
      if (tool.type === "bulldoze") res = this.sim.bulldozeTile(tileX, tileY);
      else if (tool.type === "land_up") res = this.sim.raiseLowerLand(tileX, tileY, 1);
      else if (tool.type === "land_down") res = this.sim.raiseLowerLand(tileX, tileY, -1);
      else if (tool.type === "water_up") {
        const cur = this.sim.getTile(tileX, tileY);
        res = this.sim.setWaterLevel(tileX, tileY, Math.max((cur?.height || 2) + 1, cur?.waterHeight || 2));
      } else if (tool.type === "water_down") {
        res = this.sim.setWaterLevel(tileX, tileY, 0);
      } else if (tool.type === "path") {
        res = this.sim.placeFootpath(tileX, tileY, tool.subId, tool.subId === "queue");
      } else if (tool.type === "path_add") {
        res = this.sim.placePathAddition(tileX, tileY, tool.subId);
      } else if (tool.type === "scenery") {
        res = this.sim.placeScenery(tileX, tileY, tool.subId);
      } else if (tool.type === "place_ride") {
        res = this.sim.placeRideOrShop(tileX, tileY, tool.subId);
        if (res?.ok) {
          this.setActiveTool({ type: "inspect" });
          this.windows.openWindow("ride-detail", { rideId: res.ride.id });
        }
      } else if (tool.type === "blueprint") {
        const bp = COASTER_BLUEPRINTS[tool.subId];
        res = this.sim.placeRideOrShop(tileX, tileY, bp?.rideCatalogId || "wooden_coaster", {
          blueprintId: tool.subId,
        });
        if (res?.ok) {
          this.setActiveTool({ type: "inspect" });
          this.windows.openWindow("ride-detail", { rideId: res.ride.id });
        }
      } else if (tool.type === "custom_coaster") {
        res = this.sim.startCustomCoaster(tileX, tileY, tool.subId, tool.facing || 0);
        if (res?.ok) {
          this.setActiveTool({ type: "inspect" });
          this.windows.openWindow("coaster-builder", { rideId: res.ride.id });
        }
      }

      if (res && !res.ok && res.reason) {
        this.sim.pushNews(res.reason, "warn");
      }
      return;
    }

    // Inspect mode: pop balloon, inspect guest, staff, or ride
    const hit = this.renderer.pickEntityAtScreen(cssX, cssY);
    if (!hit) return;
    if (hit.kind === "balloon") {
      this.sim.popBalloonAt(hit.id);
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
    }
  }

  _loop(nowMs) {
    const dt = Math.min(0.05, Math.max(0.001, (nowMs - this._lastTime) / 1000));
    this._lastTime = nowMs;

    // Keyboard WASD / Arrow smooth camera pan
    const panSpeed = 420 / this.renderer.zoom;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) this.renderer.camY -= panSpeed * dt;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) this.renderer.camY += panSpeed * dt;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) this.renderer.camX -= panSpeed * dt;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) this.renderer.camX += panSpeed * dt;

    this.sim.step(dt);
    const nowSec = nowMs / 1000;
    this.renderer.render(nowSec);
    this.windows.refreshLiveState(nowSec);

    if (nowMs - this._lastAutosave > 25000) {
      this._lastAutosave = nowMs;
      this.saveToLocal(false);
    }

    requestAnimationFrame((t) => this._loop(t));
  }
}

const app = new RctSanctuaryApp();
app.start().catch((err) => console.error("[RCT1Sanctuary] Boot error:", err));
