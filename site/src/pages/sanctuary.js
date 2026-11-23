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
    this._painting = false;
    this._lastPaintKey = null;
    this._lastMinimapDraw = 0;
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
        this.renderer.centerOnTile(22, 24);
        this.windows.closeUnpinned();
        this._syncModeButtons?.();
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
      this.renderer.centerOnTile(22, 24);
      this._syncModeButtons?.();
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

    const freeBtn = document.getElementById("rct-btn-freebuild");
    const nightBtn = document.getElementById("rct-btn-night");
    const minimapBtn = document.getElementById("rct-btn-minimap");
    const minimapPod = document.getElementById("rct-minimap-pod");
    const minimapCanvas = document.getElementById("rct-minimap-canvas");

    this._syncModeButtons = () => {
      freeBtn?.classList.toggle("is-active", Boolean(this.sim.freeBuildMode));
      nightBtn?.classList.toggle("is-active", Boolean(this.sim.nightMode));
      if (minimapPod) {
        minimapBtn?.classList.toggle("is-active", !minimapPod.classList.contains("is-hidden"));
      }
    };
    this._syncModeButtons();

    freeBtn?.addEventListener("click", () => {
      const on = this.sim.toggleFreeBuildMode();
      this._syncModeButtons();
      this.audio.playCash();
      if (this.windows.windows.has("build")) this.windows._renderWindowContent("build");
      if (this.windows.windows.has("scenery")) this.windows._renderWindowContent("scenery");
      if (on && this.sim.rides.length === 0) this.renderer.centerOnTile(22, 24);
    });

    nightBtn?.addEventListener("click", () => {
      this.sim.nightMode = !this.sim.nightMode;
      if (this.sim.nightMode) {
        this.sim.launchFireworksAt(22, 18);
        this.sim.pushNews("🌙 야간 조명 및 불꽃놀이 모드가 활성화되었습니다!", "good");
      } else {
        this.sim.pushNews("☀️ 주간 모드로 전환했습니다.", "info");
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
        const dx = ev.clientX - this._panStart.x;
        const dy = ev.clientY - this._panStart.y;
        this.renderer.camX = this._panStart.camX - dx / this.renderer.zoom;
        this.renderer.camY = this._panStart.camY - dy / this.renderer.zoom;
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
      }
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

    if (nowMs - this._lastMinimapDraw > 120) {
      this._lastMinimapDraw = nowMs;
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
