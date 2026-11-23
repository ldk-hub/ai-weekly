/**
 * Clean-Room 1999 RCT1 Beveled Windows Manager & HUD Controller
 * Manages draggable/stackable/pinnable windows, live mini-viewports, coaster track builder,
 * ride/guest/staff/finance/scenario panels, and AI Weekly live data kiosk.
 */

import {
  TRACK_PIECE_CATALOG,
  RIDE_CATALOG,
  SCENERY_CATALOG,
  PATH_TYPES,
  STAFF_TYPES,
  MARKETING_CAMPAIGNS,
  COASTER_BLUEPRINTS,
  SCENARIO_PRESETS,
  DIR_LABELS,
} from "./RctConstants.js";

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

function formatMoney(n) {
  const num = Number(n || 0);
  const abs = Math.abs(num).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return num < 0 ? `-$${abs}` : `$${abs}`;
}

export class RctWindowsUI {
  constructor({ sim, renderer, audio, onToolChange, onSaveLocal, onLoadLocal, onSwitchScenario }) {
    this.sim = sim;
    this.renderer = renderer;
    this.audio = audio;
    this.onToolChange = onToolChange;
    this.onSaveLocal = onSaveLocal;
    this.onLoadLocal = onLoadLocal;
    this.onSwitchScenario = onSwitchScenario;

    this.layerEl = document.getElementById("rct-window-layer");
    this.windows = new Map(); // key -> { key, el, titleTheme, pinned, state }
    this._zCounter = 20;
    this._buildTab = "coaster";
    this._staffTab = "handyman";
    this._aiTab = "plugins";
    this._aiQuery = "";
    this._lastStatusSync = 0;
  }

  openWindow(key, state = {}) {
    if (!this.layerEl) return;

    // Close existing non-pinned window if same key re-opened with new state, or focus if identical
    const existing = this.windows.get(key);
    if (existing) {
      existing.state = { ...existing.state, ...state };
      this._focusWindow(existing.el);
      this._renderWindowContent(key);
      return;
    }

    const offsetIdx = this.windows.size % 6;
    const winEl = document.createElement("aside");
    winEl.className = "rct-window";
    winEl.dataset.winKey = key;
    const cascadeX = window.innerWidth >= 1024 ? 18 + (offsetIdx % 3) * 290 : 12 + offsetIdx * 20;
    const cascadeY = window.innerWidth >= 1024 ? 14 + Math.floor(offsetIdx / 3) * 42 : 14 + offsetIdx * 24;
    winEl.style.left = `${Math.min(cascadeX, Math.max(12, window.innerWidth - 400))}px`;
    winEl.style.top = `${cascadeY}px`;
    winEl.style.width = key === "ai-archive" || key === "build" ? "450px" : key === "coaster-builder" ? "390px" : "340px";
    winEl.style.zIndex = String(++this._zCounter);

    this.layerEl.appendChild(winEl);
    this.windows.set(key, { key, el: winEl, pinned: false, state });
    this._renderWindowContent(key);
    this._makeDraggable(winEl, key);
    this.audio.playClick();
  }

  closeWindow(key) {
    const entry = this.windows.get(key);
    if (!entry) return;
    entry.el.remove();
    this.windows.delete(key);
    if (key === "coaster-builder") {
      this.renderer.customCoasterId = null;
    }
    this.audio.playClick();
  }

  closeUnpinned() {
    for (const [k, entry] of [...this.windows.entries()]) {
      if (!entry.pinned) this.closeWindow(k);
    }
  }

  _focusWindow(el) {
    el.style.zIndex = String(++this._zCounter);
  }

  _makeDraggable(winEl, key) {
    winEl.addEventListener("pointerdown", () => this._focusWindow(winEl));
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;

    winEl.addEventListener("pointerdown", (ev) => {
      const titlebar = ev.target.closest(".rct-win-titlebar");
      if (!titlebar || ev.target.closest("button")) return;
      dragging = true;
      startX = ev.clientX;
      startY = ev.clientY;
      origLeft = parseFloat(winEl.style.left) || 20;
      origTop = parseFloat(winEl.style.top) || 14;
      titlebar.setPointerCapture?.(ev.pointerId);
      ev.stopPropagation();
    });
    window.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      winEl.style.left = `${Math.max(4, Math.min(window.innerWidth - 180, origLeft + dx))}px`;
      winEl.style.top = `${Math.max(4, Math.min(window.innerHeight - 160, origTop + dy))}px`;
    });
    window.addEventListener("pointerup", () => {
      dragging = false;
    });

    // Event delegation inside window body
    winEl.addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (ev.target.closest("[data-win-close]")) {
        this.closeWindow(key);
        return;
      }
      if (ev.target.closest("[data-win-pin]")) {
        const entry = this.windows.get(key);
        if (entry) {
          entry.pinned = !entry.pinned;
          this._renderWindowContent(key);
        }
        return;
      }
      this._handleWindowAction(key, ev);
    });
    winEl.addEventListener("input", (ev) => {
      if (ev.target.id === "rct-ai-search") {
        this._aiQuery = ev.target.value || "";
        this._renderWindowContent("ai-archive");
      }
    });
  }

  _wrapWindow(key, title, themeClass, bodyHtml) {
    const entry = this.windows.get(key);
    const pinned = entry?.pinned ? "is-pinned" : "";
    return `
      <div class="rct-win-titlebar ${themeClass}">
        <span>${esc(title)}</span>
        <div class="rct-win-actions">
          <button type="button" class="rct-win-pin ${pinned}" data-win-pin title="창 고정 (ESC 시 유지)">📌</button>
          <button type="button" class="rct-win-close" data-win-close title="닫기">✕</button>
        </div>
      </div>
      <div class="rct-win-body">${bodyHtml}</div>
    `;
  }

  _renderWindowContent(key) {
    const entry = this.windows.get(key);
    if (!entry) return;
    const { el, state } = entry;

    if (key === "build") {
      const tabs = `
        <div class="rct-tabs">
          <button type="button" class="rct-tab ${this._buildTab === "coaster" ? "is-active" : ""}" data-build-tab="coaster">롤러코스터</button>
          <button type="button" class="rct-tab ${this._buildTab === "rides" ? "is-active" : ""}" data-build-tab="rides">보통·스릴·워터</button>
          <button type="button" class="rct-tab ${this._buildTab === "shop" ? "is-active" : ""}" data-build-tab="shop">상점·편의시설</button>
        </div>
      `;
      let rows = "";
      if (this._buildTab === "coaster") {
        const coasters = Object.values(RIDE_CATALOG).filter((r) => r.category === "coaster");
        const bps = Object.values(COASTER_BLUEPRINTS);
        rows = `
          <div class="rct-inset" style="font-size:11px; color:#fde047;">
            💡 <b>커스텀 승강장 건설</b>로 트랙을 1조각씩 직접 설계하거나, <b>완성 설계도</b>를 통째로 배치할 수 있습니다.
          </div>
          <div class="rct-list-grid">
            ${coasters.map((c) => `
              <div class="rct-card-row">
                <div>
                  <div style="font-weight:800;">🎢 ${esc(c.name)}</div>
                  <div style="font-size:10.5px; color:#cbd5e1;">${esc(c.description)}</div>
                </div>
                <button type="button" class="rct-btn is-primary" data-tool-custom-coaster="${esc(c.id)}">직접 건설 ($180~)</button>
              </div>
            `).join("")}
            ${bps.map((bp) => `
              <div class="rct-card-row">
                <div>
                  <div style="font-weight:800; color:#93c5fd;">📐 [설계도] ${esc(bp.name)}</div>
                  <div style="font-size:10.5px; color:#cbd5e1;">${bp.pieces.length}조각 완성 폐곡선 블루프린트</div>
                </div>
                <button type="button" class="rct-btn" data-tool-blueprint="${esc(bp.id)}">설계도 배치</button>
              </div>
            `).join("")}
          </div>
        `;
      } else if (this._buildTab === "rides") {
        const rides = Object.values(RIDE_CATALOG).filter((r) => ["gentle", "thrill", "water"].includes(r.category));
        rows = `<div class="rct-list-grid">` + rides.map((r) => `
          <div class="rct-card-row">
            <div>
              <div style="font-weight:800;">🎡 ${esc(r.name)} <span style="color:#fde047;">$${r.baseCost}</span></div>
              <div style="font-size:10.5px; color:#cbd5e1;">흥미 ${r.excitement} · 격렬 ${r.intensity} · 멀미 ${r.nausea} · ${r.footprintW}×${r.footprintH}</div>
            </div>
            <button type="button" class="rct-btn is-primary" data-tool-place-ride="${esc(r.id)}">선택</button>
          </div>
        `).join("") + `</div>`;
      } else {
        const shops = Object.values(RIDE_CATALOG).filter((r) => r.category === "shop");
        rows = `<div class="rct-list-grid">` + shops.map((r) => `
          <div class="rct-card-row">
            <div>
              <div style="font-weight:800;">🏪 ${esc(r.name)} <span style="color:#fde047;">$${r.baseCost}</span></div>
              <div style="font-size:10.5px; color:#cbd5e1;">${esc(r.description)}</div>
            </div>
            <button type="button" class="rct-btn is-primary" data-tool-place-ride="${esc(r.id)}">선택</button>
          </div>
        `).join("") + `</div>`;
      }
      el.innerHTML = this._wrapWindow(key, "🎢 신규 놀이기구 · 상점 건설", "is-maroon", tabs + rows);
      return;
    }

    if (key === "coaster-builder") {
      const ride = this.sim.rides.find((r) => r.id === state.rideId);
      if (!ride || !ride.track) {
        this.closeWindow(key);
        return;
      }
      this.renderer.customCoasterId = ride.id;
      const tr = ride.track;
      const closed = tr.isClosed();
      const pieceBtns = Object.values(TRACK_PIECE_CATALOG)
        .filter((p) => !p.isLoop || RIDE_CATALOG[ride.catalogId]?.allowLoop)
        .map((p) => `
          <button type="button" class="rct-btn" data-cb-add="${esc(p.id)}" ${closed ? "disabled" : ""} title="${esc(p.name)} ($${p.cost})">
            ${esc(p.shortLabel)}
          </button>
        `).join("");

      el.innerHTML = this._wrapWindow(key, `🎢 트랙 건설: ${ride.name}`, "is-maroon", `
        <div class="rct-inset" style="display:flex; justify-content:space-between; font-size:11px;">
          <span>방향: <b>${DIR_LABELS[tr.cursor.dir]}</b> · 고도: <b>${tr.cursor.z * 3}m</b></span>
          <span style="color:${closed ? "#4ade80" : "#fde047"}; font-weight:800;">
            ${closed ? "✅ 폐곡선 완성" : `조각: ${tr.nodes.length} (${Math.round(tr.totalLengthM)}m)`}
          </span>
        </div>
        <div class="rct-piece-grid">${pieceBtns}</div>
        <div style="display:flex; flex-wrap:wrap; gap:5px;">
          <button type="button" class="rct-btn is-danger" data-cb-undo ${tr.nodes.length <= 1 ? "disabled" : ""}>◀ 이전 철거</button>
          <button type="button" class="rct-btn is-warn" data-cb-autoclose ${closed ? "disabled" : ""}>🔄 승강장 자동 연결</button>
          <button type="button" class="rct-btn" data-cb-status="testing">🟡 시운전</button>
          <button type="button" class="rct-btn is-primary" data-cb-status="open">🟢 개장</button>
        </div>
        <div id="rct-cb-feedback" style="font-size:11px; color:#fef08a;">${esc(state.feedback || "원하는 트랙 조각을 눌러 이어 붙이세요.")}</div>
      `);
      return;
    }

    if (key === "ride-detail") {
      const ride = this.sim.rides.find((r) => r.id === state.rideId);
      if (!ride) {
        this.closeWindow(key);
        return;
      }
      const st = ride.stats || { excitement: 0, intensity: 0, nausea: 0 };
      const isShop = ride.category === "shop";
      el.innerHTML = this._wrapWindow(key, `🎡 ${ride.name}`, "is-blue", `
        <div style="display:grid; grid-template-columns:168px 1fr; gap:8px; align-items:start;">
          <div>
            <canvas class="rct-mini-cam" id="rct-ride-minicam" width="168" height="104" data-ride-id="${esc(ride.id)}"></canvas>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
              <div class="rct-traffic-lights">
                <button type="button" class="rct-light-btn is-red ${ride.status === "closed" || ride.broken ? "is-active" : ""}" data-ride-status="${esc(ride.id)}:closed" title="폐쇄"></button>
                ${!isShop ? `<button type="button" class="rct-light-btn is-amber ${ride.status === "testing" ? "is-active" : ""}" data-ride-status="${esc(ride.id)}:testing" title="시운전"></button>` : ""}
                <button type="button" class="rct-light-btn is-green ${ride.status === "open" && !ride.broken ? "is-active" : ""}" data-ride-status="${esc(ride.id)}:open" title="개장"></button>
              </div>
              <span style="font-size:10.5px; color:${ride.broken ? "#fca5a5" : "#4ade80"}; font-weight:800;">
                ${ride.broken ? "⚠ 고장!" : ride.status === "open" ? "운행 중" : ride.status === "testing" ? "시운전" : "폐쇄"}
              </span>
            </div>
          </div>
          <div class="rct-inset" style="font-size:11px; display:flex; flex-direction:column; gap:4px;">
            ${!isShop ? `
              <div>흥미도 (Excitement): <b style="color:#4ade80;">${Number(st.excitement || 0).toFixed(2)}</b></div>
              <div>격렬도 (Intensity): <b style="color:#fbbf24;">${Number(st.intensity || 0).toFixed(2)}</b></div>
              <div>멀미도 (Nausea): <b style="color:${st.nausea >= 4 ? "#f87171" : "#93c5fd"};">${Number(st.nausea || 0).toFixed(2)}</b></div>
              ${ride.track && st.maxSpeedKmh ? `<div>최고속도: <b>${st.maxSpeedKmh}km/h</b> · 낙하 <b>${st.drops}회</b> · 루프 <b>${st.inversions}</b></div>` : ""}
              <div>신뢰도: <b>${Math.round(ride.reliability)}%</b> · 탑승객: <b>${ride.passengers.length}/${ride.capacity}</b></div>
            ` : `<div>이용 횟수: <b>${ride.totalRiders}명</b></div>`}
            <div>누적 수익: <b style="color:#4ade80;">${formatMoney(ride.totalProfit)}</b></div>
            <div style="display:flex; align-items:center; gap:5px; margin-top:2px;">
              <span>요금: <b>$${ride.price.toFixed(1)}</b></span>
              <button type="button" class="rct-mini-btn" data-ride-price="${esc(ride.id)}:-0.5">-</button>
              <button type="button" class="rct-mini-btn" data-ride-price="${esc(ride.id)}:0.5">+</button>
            </div>
          </div>
        </div>
        ${ride.broken ? `<div class="rct-inset" style="background:#7f1d1d; color:#fecaca; font-size:11px;">🚨 ${esc(ride.breakdownReason)}</div>` : ""}
        <div style="display:flex; flex-wrap:wrap; gap:5px;">
          ${!isShop ? `<button type="button" class="rct-btn" data-ride-call-mech="${esc(ride.id)}">🔧 정비사 호출</button>` : ""}
          ${ride.track ? `<button type="button" class="rct-btn is-warn" data-ride-edit-track="${esc(ride.id)}">🎢 트랙 편집</button>` : ""}
          <button type="button" class="rct-btn is-danger" data-ride-bulldoze="${esc(ride.id)}">💣 철거</button>
        </div>
      `);
      return;
    }

    if (key === "peep-detail") {
      const peep = this.sim.peeps.find((p) => p.id === state.peepId);
      if (!peep) {
        this.closeWindow(key);
        return;
      }
      const mkBar = (label, val, inverseBad = false) => {
        const cls = inverseBad ? (val > 70 ? "is-bad" : val > 45 ? "is-warn" : "") : (val < 30 ? "is-bad" : val < 55 ? "is-warn" : "");
        return `<div class="rct-stat-bar"><span class="rct-stat-bar-label">${label}</span><div class="rct-stat-bar-track"><div class="rct-stat-bar-fill ${cls}" style="width:${Math.round(val)}%"></div></div></div>`;
      };
      el.innerHTML = this._wrapWindow(key, `🧑 관람객: ${peep.name}`, "is-gold", `
        <div style="display:grid; grid-template-columns:150px 1fr; gap:8px;">
          <div>
            <canvas class="rct-mini-cam" id="rct-peep-minicam" width="150" height="96" data-peep-id="${esc(peep.id)}"></canvas>
            <div style="display:flex; flex-direction:column; gap:4px; margin-top:5px;">
              <button type="button" class="rct-btn is-warn" data-peep-pincer="${esc(peep.id)}">🦀 집게로 집기</button>
              ${peep.hasBalloon ? `<button type="button" class="rct-btn is-danger" data-peep-pop="${esc(peep.id)}">🎈 풍선 터뜨리기</button>` : ""}
            </div>
          </div>
          <div class="rct-inset" style="display:flex; flex-direction:column; gap:4px;">
            ${mkBar("행복도", peep.happiness, false)}
            ${mkBar("체력", peep.energy, false)}
            ${mkBar("배고픔", peep.hunger, true)}
            ${mkBar("목마름", peep.thirst, true)}
            ${mkBar("멀미", peep.nausea, true)}
            ${mkBar("화장실", peep.toilet, true)}
            <div style="font-size:10.5px; margin-top:2px;">
              소지금: <b>$${Math.round(peep.cash)}</b> · 탑승: <b>${peep.ridesRidden}회</b>
            </div>
          </div>
        </div>
        <div class="rct-inset" style="font-size:11px;">
          <div style="font-weight:800; color:#fde047; margin-bottom:3px;">💭 최근 생각 (Thoughts)</div>
          ${peep.thoughts.map((t) => `<div>• ${esc(t)}</div>`).join("")}
        </div>
      `);
      return;
    }

    if (key === "terraform") {
      const cur = this.renderer.activeTool.type;
      el.innerHTML = this._wrapWindow(key, "⛰ 지형 및 물 편집", "is-green", `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
          <button type="button" class="rct-btn ${cur === "land_up" ? "is-active" : ""}" data-set-tool="land_up">⛰ 지형 올리기 (+3m · $20)</button>
          <button type="button" class="rct-btn ${cur === "land_down" ? "is-active" : ""}" data-set-tool="land_down">🕳 지형 내리기 (-3m · $20)</button>
          <button type="button" class="rct-btn ${cur === "water_up" ? "is-active" : ""}" data-set-tool="water_up">💧 물 채우기 ($25)</button>
          <button type="button" class="rct-btn ${cur === "water_down" ? "is-active" : ""}" data-set-tool="water_down">🏜 물 배수 ($25)</button>
        </div>
        <div class="rct-inset" style="font-size:11px;">도구를 선택한 후 공원 지면 타일을 클릭하세요.</div>
      `);
      return;
    }

    if (key === "footpath") {
      const activeSub = this.renderer.activeTool.subId;
      const activeType = this.renderer.activeTool.type;
      el.innerHTML = this._wrapWindow(key, "🛤 보도 · 대기열 · 편의시설", "is-gold", `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:5px;">
          ${Object.values(PATH_TYPES).map((pt) => `
            <button type="button" class="rct-btn ${activeType === "path" && activeSub === pt.id ? "is-active" : ""}" data-set-path="${esc(pt.id)}">
              ${esc(pt.name)} ($${pt.cost})
            </button>
          `).join("")}
        </div>
        <div style="font-size:11px; font-weight:800; color:#fde047;">보도 위 편의 소품 ($15)</div>
        <div style="display:flex; gap:5px;">
          <button type="button" class="rct-btn ${activeType === "path_add" && activeSub === "bench" ? "is-active" : ""}" data-set-path-add="bench">🪑 벤치</button>
          <button type="button" class="rct-btn ${activeType === "path_add" && activeSub === "bin" ? "is-active" : ""}" data-set-path-add="bin">🗑 쓰레기통</button>
          <button type="button" class="rct-btn ${activeType === "path_add" && activeSub === "lamp" ? "is-active" : ""}" data-set-path-add="lamp">💡 가로등</button>
        </div>
      `);
      return;
    }

    if (key === "scenery") {
      const activeSub = this.renderer.activeTool.subId;
      el.innerHTML = this._wrapWindow(key, "🌲 풍경 · 조각상 · 전광판", "is-green", `
        <div class="rct-list-grid">
          ${Object.values(SCENERY_CATALOG).map((sc) => `
            <div class="rct-card-row">
              <span>${esc(sc.name)} ($${sc.cost} · 흥미 보너스 +${sc.excitementBonus})</span>
              <button type="button" class="rct-btn ${this.renderer.activeTool.type === "scenery" && activeSub === sc.id ? "is-active" : ""}" data-set-scenery="${esc(sc.id)}">배치</button>
            </div>
          `).join("")}
        </div>
      `);
      return;
    }

    if (key === "rides-list") {
      el.innerHTML = this._wrapWindow(key, `🎡 놀이기구 전체 목록 (${this.sim.rides.length})`, "is-blue", `
        <div class="rct-list-grid">
          ${this.sim.rides.map((r) => `
            <div class="rct-card-row">
              <div>
                <div style="font-weight:800;">${r.broken ? "🔴" : r.status === "open" ? "🟢" : "🟡"} ${esc(r.name)}</div>
                <div style="font-size:10.5px; color:#cbd5e1;">
                  이용 ${r.totalRiders}명 · 수익 ${formatMoney(r.totalProfit)} ${r.category !== "shop" ? `· 흥미 ${Number(r.stats?.excitement || 0).toFixed(1)}` : ""}
                </div>
              </div>
              <button type="button" class="rct-mini-btn" data-open-ride="${esc(r.id)}">보기</button>
            </div>
          `).join("")}
        </div>
      `);
      return;
    }

    if (key === "guests-list") {
      el.innerHTML = this._wrapWindow(key, `🧑 관람객 목록 (${this.sim.peeps.length}명)`, "is-gold", `
        <div class="rct-list-grid">
          ${this.sim.peeps.slice(0, 40).map((p) => `
            <div class="rct-card-row">
              <div>
                <div style="font-weight:800;">${esc(p.name)} ${p.hasBalloon ? "🎈" : ""} ${p.nausea > 65 ? "🤢" : ""}</div>
                <div style="font-size:10.5px; color:#cbd5e1;">"${esc(p.thoughts[0] || "즐거운 하루!")}"</div>
              </div>
              <button type="button" class="rct-mini-btn" data-open-peep="${esc(p.id)}">추적</button>
            </div>
          `).join("")}
        </div>
      `);
      return;
    }

    if (key === "staff") {
      const def = STAFF_TYPES[this._staffTab] || STAFF_TYPES.handyman;
      const filtered = this.sim.staff.filter((s) => s.role === this._staffTab);
      el.innerHTML = this._wrapWindow(key, "🧹 직원 고용 및 순찰 관리", "is-purple", `
        <div class="rct-tabs">
          ${Object.values(STAFF_TYPES).map((st) => `
            <button type="button" class="rct-tab ${this._staffTab === st.id ? "is-active" : ""}" data-staff-tab="${esc(st.id)}">
              ${esc(st.name.split(" ")[0])} (${this.sim.staff.filter((s) => s.role === st.id).length})
            </button>
          `).join("")}
        </div>
        <div class="rct-inset" style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
          <span style="font-size:10.5px;">${esc(def.desc)}</span>
          <button type="button" class="rct-btn is-primary" data-staff-hire="${esc(def.id)}">+ 고용 ($${def.hireCost})</button>
        </div>
        <div class="rct-list-grid">
          ${filtered.length === 0 ? `<div class="rct-inset">고용된 ${esc(def.name)}가 없습니다.</div>` : filtered.map((s) => `
            <div class="rct-card-row">
              <div>
                <div style="font-weight:800;">${esc(s.name)}</div>
                <div style="font-size:10.5px; color:#cbd5e1;">
                  ${s.role === "handyman" ? `청소 ${s.sweptCount}회` : s.role === "mechanic" ? `수리 ${s.repairedCount}회` : "순찰 중"}
                </div>
              </div>
              <div style="display:flex; gap:4px;">
                <button type="button" class="rct-mini-btn" data-staff-pincer="${esc(s.id)}">🦀 배치</button>
                <button type="button" class="rct-mini-btn is-danger" data-staff-fire="${esc(s.id)}">해고</button>
              </div>
            </div>
          `).join("")}
        </div>
      `);
      return;
    }

    if (key === "park") {
      const preset = SCENARIO_PRESETS[this.sim.scenarioId] || SCENARIO_PRESETS.ai_weekly_park;
      el.innerHTML = this._wrapWindow(key, `🏰 ${this.sim.parkName}`, "is-green", `
        <div class="rct-inset" style="font-size:11px; display:flex; flex-direction:column; gap:4px;">
          <div>🎯 <b>목표:</b> ${esc(preset.objectiveText)}</div>
          <div>⭐ <b>공원 평점:</b> ${this.sim.parkRating} / 999</div>
          <div>💎 <b>공원 가치:</b> ${formatMoney(this.sim.parkValue)} · <b>회사 가치:</b> ${formatMoney(this.sim.companyValue)}</div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span>🎟 입장료: <b>$${this.sim.parkEntryFee}</b></span>
            <button type="button" class="rct-mini-btn" data-park-fee="-2">-2</button>
            <button type="button" class="rct-mini-btn" data-park-fee="2">+2</button>
          </div>
        </div>
        <div class="rct-inset" style="font-size:11px;">
          <div style="font-weight:800; color:#fde047; margin-bottom:3px;">🏆 수상 트로피</div>
          ${this.sim.awards.length ? this.sim.awards.map((a) => `<div>🏆 ${esc(a)}</div>`).join("") : "<div>아직 수상한 트로피가 없습니다. 공원을 청결하고 흥미롭게 가꾸세요!</div>"}
        </div>
        <div class="rct-inset" style="font-size:11px; max-height:110px; overflow-y:auto;">
          <div style="font-weight:800; color:#93c5fd; margin-bottom:3px;">📰 최근 소식 로그</div>
          ${this.sim.newsFeed.slice(0, 8).map((n) => `<div>[${esc(n.timeLabel)}] ${esc(n.text)}</div>`).join("")}
        </div>
      `);
      return;
    }

    if (key === "finances") {
      const mf = this.sim.monthlyFinances;
      el.innerHTML = this._wrapWindow(key, "💰 재무 · 은행 대출 · 마케팅", "is-green", `
        <div class="rct-inset" style="font-size:11px; display:flex; flex-direction:column; gap:4px;">
          <div>💵 보유 현금: <b style="color:#4ade80;">${formatMoney(this.sim.cash)}</b></div>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span>🏦 은행 대출: <b style="color:#fca5a5;">${formatMoney(this.sim.loan)}</b> / $${this.sim.maxLoan.toLocaleString()}</span>
            <span style="display:flex; gap:4px;">
              <button type="button" class="rct-mini-btn" data-loan-delta="-500">-$500 상환</button>
              <button type="button" class="rct-mini-btn" data-loan-delta="500">+$500 대출</button>
            </span>
          </div>
          <div>이번 달 수입: 탑승 <b>${formatMoney(mf.rideIncome)}</b> · 상점 <b>${formatMoney(mf.shopIncome)}</b> · 입장 <b>${formatMoney(mf.entryIncome)}</b></div>
        </div>
        <div style="font-size:11px; font-weight:800; color:#fde047;">📣 마케팅 캠페인 시작</div>
        <div class="rct-list-grid">
          ${Object.values(MARKETING_CAMPAIGNS).map((mc) => `
            <div class="rct-card-row">
              <span>${esc(mc.name)} (${mc.durationDays}일)</span>
              <button type="button" class="rct-mini-btn is-primary" data-mkt-start="${esc(mc.id)}">$${mc.cost}</button>
            </div>
          `).join("")}
        </div>
      `);
      return;
    }

    if (key === "scenario") {
      el.innerHTML = this._wrapWindow(key, "💾 시나리오 전환 & 저장/불러오기", "is-maroon", `
        <div style="display:flex; gap:5px; flex-wrap:wrap;">
          <button type="button" class="rct-btn is-primary" data-save-local>💾 브라우저 저장</button>
          <button type="button" class="rct-btn" data-load-local>📂 저장본 불러오기</button>
          <button type="button" class="rct-btn is-warn" data-reset-scenario>🔄 현재 파크 초기화</button>
        </div>
        <div class="rct-list-grid">
          ${Object.values(SCENARIO_PRESETS).map((sc) => `
            <div class="rct-card-row">
              <div>
                <div style="font-weight:800; color:${this.sim.scenarioId === sc.id ? "#fde047" : "#ffffff"};">${esc(sc.name)}</div>
                <div style="font-size:10.5px; color:#cbd5e1;">${esc(sc.subtitle)}</div>
              </div>
              <button type="button" class="rct-mini-btn is-primary" data-switch-scenario="${esc(sc.id)}">플레이</button>
            </div>
          `).join("")}
        </div>
      `);
      return;
    }

    if (key === "view-opts") {
      el.innerHTML = this._wrapWindow(key, "👁 화면 투시 및 보기 옵션", "is-blue", `
        <div style="display:flex; flex-direction:column; gap:6px;">
          <button type="button" class="rct-btn ${this.renderer.seeThroughRides ? "is-active" : ""}" data-view-toggle="seeThroughRides">놀이기구·코스터 투명화 (See-Through Rides)</button>
          <button type="button" class="rct-btn ${this.renderer.seeThroughScenery ? "is-active" : ""}" data-view-toggle="seeThroughScenery">나무·풍경 숨기기 (See-Through Scenery)</button>
          <button type="button" class="rct-btn ${this.renderer.showGrid ? "is-active" : ""}" data-view-toggle="showGrid">타일 격자선 표시 (Grid)</button>
          <button type="button" class="rct-btn ${this.renderer.showHeightMarks ? "is-active" : ""}" data-view-toggle="showHeightMarks">지형 고도 수치 표시 (Height Marks)</button>
        </div>
      `);
      return;
    }

    if (key === "ai-archive") {
      const q = this._aiQuery.toLowerCase();
      const tabs = `
        <div class="rct-tabs">
          <button type="button" class="rct-tab ${this._aiTab === "plugins" ? "is-active" : ""}" data-ai-tab="plugins">인기 플러그인</button>
          <button type="button" class="rct-tab ${this._aiTab === "news" ? "is-active" : ""}" data-ai-tab="news">AI 뉴스</button>
          <button type="button" class="rct-tab ${this._aiTab === "social" ? "is-active" : ""}" data-ai-tab="social">소셜 피드</button>
          <button type="button" class="rct-tab ${this._aiTab === "benchmarks" ? "is-active" : ""}" data-ai-tab="benchmarks">점유율·성능</button>
        </div>
        <input type="search" id="rct-ai-search" class="sc-chat-input" value="${esc(this._aiQuery)}" placeholder="실시간 AI위클리 데이터 검색…" />
      `;
      let items = [];
      if (this._aiTab === "plugins") {
        items = this.sim.aiArchive.plugins
          .filter((p) => !q || `${p.name} ${p.title_ko} ${p.summary_ko}`.toLowerCase().includes(q))
          .slice(0, 20)
          .map((p) => ({
            title: `${p.name} (★${Number(p.stars || 0).toLocaleString()})`,
            sub: p.title_ko || p.catchphrase || "",
            url: safeHref(p.official_url || p.repo_url),
            sponsor: p.name,
          }));
      } else if (this._aiTab === "news") {
        items = this.sim.aiArchive.news
          .filter((n) => !q || `${n.title_ko} ${n.headline}`.toLowerCase().includes(q))
          .slice(0, 20)
          .map((n) => ({
            title: n.title_ko || n.headline,
            sub: `중요도 ${n.importance} · ${n.category_name || "AI"}`,
            url: safeHref(n.url),
            sponsor: (n.title_ko || n.headline || "").slice(0, 14),
          }));
      } else if (this._aiTab === "social") {
        items = this.sim.aiArchive.social
          .filter((s) => !q || `${s.author} ${s.title_ko}`.toLowerCase().includes(q))
          .slice(0, 20)
          .map((s) => ({
            title: `${s.author}: ${s.title_ko}`,
            sub: s.platform || "social",
            url: safeHref(s.url),
            sponsor: s.author,
          }));
      } else {
        items = this.sim.aiArchive.benchmarks
          .filter((m) => !q || `${m.model} ${m.provider}`.toLowerCase().includes(q))
          .slice(0, 20)
          .map((m) => ({
            title: `${m.model} (Elo ${m.arena_coding_elo || m.arena_elo || "—"})`,
            sub: m.provider || "LLM",
            url: "benchmarks",
            sponsor: m.model,
          }));
      }
      const listHtml = items.length
        ? items.map((it) => `
          <div class="rct-card-row">
            <div style="min-width:0;">
              <div style="font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(it.title)}</div>
              <div style="font-size:10px; color:#cbd5e1;">${esc(it.sub)}</div>
            </div>
            <div style="display:flex; gap:4px; flex-shrink:0;">
              <button type="button" class="rct-mini-btn" data-ai-sponsor="${esc(it.sponsor)}" title="가장 인기 있는 롤러코스터 이름으로 스폰서 적용">🎢 명명</button>
              <a class="rct-mini-btn" href="${esc(it.url)}" target="_blank" rel="noopener" style="text-decoration:none;">원문</a>
            </div>
          </div>
        `).join("")
        : `<div class="rct-inset">데이터를 불러오는 중이거나 검색 결과가 없습니다.</div>`;

      el.innerHTML = this._wrapWindow(key, "🔬 AI위클리 실시간 데이터 연구소", "is-purple", `${tabs}<div class="rct-list-grid">${listHtml}</div>`);
    }
  }

  _handleWindowAction(key, ev) {
    const t = ev.target;

    // Build window tabs & tools
    const bTab = t.closest("[data-build-tab]");
    if (bTab) {
      this._buildTab = bTab.dataset.buildTab;
      this._renderWindowContent("build");
      return;
    }
    const customC = t.closest("[data-tool-custom-coaster]");
    if (customC) {
      this.onToolChange({ type: "custom_coaster", subId: customC.dataset.toolCustomCoaster });
      return;
    }
    const bpBtn = t.closest("[data-tool-blueprint]");
    if (bpBtn) {
      this.onToolChange({ type: "blueprint", subId: bpBtn.dataset.toolBlueprint });
      return;
    }
    const rideBtn = t.closest("[data-tool-place-ride]");
    if (rideBtn) {
      this.onToolChange({ type: "place_ride", subId: rideBtn.dataset.toolPlaceRide });
      return;
    }

    // Coaster Builder controls
    const cbAdd = t.closest("[data-cb-add]");
    if (cbAdd) {
      const entry = this.windows.get("coaster-builder");
      const rideId = entry?.state?.rideId;
      const res = this.sim.appendCustomTrackPiece(rideId, cbAdd.dataset.cbAdd);
      entry.state.feedback = res.ok ? (res.closed ? "🎉 폐곡선이 연결되었습니다! 시운전 또는 개장하세요." : "트랙 조각 연결 완료") : res.reason;
      this._renderWindowContent("coaster-builder");
      return;
    }
    if (t.closest("[data-cb-undo]")) {
      const entry = this.windows.get("coaster-builder");
      const res = this.sim.removeLastCustomTrackPiece(entry?.state?.rideId);
      entry.state.feedback = res.ok ? "마지막 트랙 조각을 철거했습니다." : res.reason;
      this._renderWindowContent("coaster-builder");
      return;
    }
    if (t.closest("[data-cb-autoclose]")) {
      const entry = this.windows.get("coaster-builder");
      const res = this.sim.autoCloseCustomCoaster(entry?.state?.rideId);
      entry.state.feedback = res.ok ? `✅ ${res.reason} (흥미 ${res.stats?.excitement ?? "-"})` : res.reason;
      this._renderWindowContent("coaster-builder");
      return;
    }
    const cbStatus = t.closest("[data-cb-status]");
    if (cbStatus) {
      const entry = this.windows.get("coaster-builder");
      const res = this.sim.setRideStatus(entry?.state?.rideId, cbStatus.dataset.cbStatus);
      entry.state.feedback = res.ok ? `🚦 상태 변경: ${res.status} (흥미 ${res.stats?.excitement})` : `❌ ${res.reason}`;
      this._renderWindowContent("coaster-builder");
      return;
    }

    // Ride detail actions
    const rsBtn = t.closest("[data-ride-status]");
    if (rsBtn) {
      const [rid, status] = rsBtn.dataset.rideStatus.split(":");
      const res = this.sim.setRideStatus(rid, status);
      if (!res.ok) this.sim.pushNews(res.reason, "warn");
      this._renderWindowContent("ride-detail");
      return;
    }
    const rpBtn = t.closest("[data-ride-price]");
    if (rpBtn) {
      const [rid, delta] = rpBtn.dataset.ridePrice.split(":");
      const ride = this.sim.rides.find((r) => r.id === rid);
      if (ride) {
        this.sim.setRidePrice(rid, ride.price + Number(delta));
        this._renderWindowContent("ride-detail");
      }
      return;
    }
    const mechCall = t.closest("[data-ride-call-mech]");
    if (mechCall) {
      const res = this.sim.callMechanicToRide(mechCall.dataset.rideCallMech);
      this.sim.pushNews(res.reason, res.ok ? "info" : "warn");
      return;
    }
    const editTr = t.closest("[data-ride-edit-track]");
    if (editTr) {
      this.openWindow("coaster-builder", { rideId: editTr.dataset.rideEditTrack });
      return;
    }
    const bzRide = t.closest("[data-ride-bulldoze]");
    if (bzRide) {
      const r = this.sim.rides.find((item) => item.id === bzRide.dataset.rideBulldoze);
      if (r) {
        this.sim.bulldozeTile(r.x, r.y);
        this.closeWindow("ride-detail");
      }
      return;
    }

    // Peep actions
    const pincerPeep = t.closest("[data-peep-pincer]");
    if (pincerPeep) {
      const peep = this.sim.peeps.find((p) => p.id === pincerPeep.dataset.peepPincer);
      if (peep) {
        this.renderer.pincerCarry = { kind: "peep", id: peep.id, label: peep.name };
        this.onToolChange({ type: "pincer" });
      }
      return;
    }
    const popPeep = t.closest("[data-peep-pop]");
    if (popPeep) {
      this.sim.popBalloonAt(popPeep.dataset.peepPop);
      this._renderWindowContent("peep-detail");
      return;
    }

    // Terraform / Path / Scenery / View tools
    const toolBtn = t.closest("[data-set-tool]");
    if (toolBtn) {
      this.onToolChange({ type: toolBtn.dataset.setTool });
      this._renderWindowContent("terraform");
      return;
    }
    const pathBtn = t.closest("[data-set-path]");
    if (pathBtn) {
      this.onToolChange({ type: "path", subId: pathBtn.dataset.setPath });
      this._renderWindowContent("footpath");
      return;
    }
    const pathAddBtn = t.closest("[data-set-path-add]");
    if (pathAddBtn) {
      this.onToolChange({ type: "path_add", subId: pathAddBtn.dataset.setPathAdd });
      this._renderWindowContent("footpath");
      return;
    }
    const scBtn = t.closest("[data-set-scenery]");
    if (scBtn) {
      this.onToolChange({ type: "scenery", subId: scBtn.dataset.setScenery });
      this._renderWindowContent("scenery");
      return;
    }
    const viewToggle = t.closest("[data-view-toggle]");
    if (viewToggle) {
      const prop = viewToggle.dataset.viewToggle;
      this.renderer[prop] = !this.renderer[prop];
      this._renderWindowContent("view-opts");
      return;
    }

    // Lists & Staff & Park & Finance & Scenario & AI
    const openRide = t.closest("[data-open-ride]");
    if (openRide) {
      const r = this.sim.rides.find((item) => item.id === openRide.dataset.openRide);
      if (r) {
        this.renderer.centerOnTile(r.x, r.y);
        this.openWindow("ride-detail", { rideId: r.id });
      }
      return;
    }
    const openPeep = t.closest("[data-open-peep]");
    if (openPeep) {
      const p = this.sim.peeps.find((item) => item.id === openPeep.dataset.openPeep);
      if (p) {
        this.renderer.centerOnTile(Math.round(p.x), Math.round(p.y));
        this.openWindow("peep-detail", { peepId: p.id });
      }
      return;
    }
    const sTab = t.closest("[data-staff-tab]");
    if (sTab) {
      this._staffTab = sTab.dataset.staffTab;
      this._renderWindowContent("staff");
      return;
    }
    const hireBtn = t.closest("[data-staff-hire]");
    if (hireBtn) {
      const res = this.sim.hireStaff(hireBtn.dataset.staffHire);
      if (!res.ok) this.sim.pushNews(res.reason, "warn");
      this._renderWindowContent("staff");
      return;
    }
    const pincerStaff = t.closest("[data-staff-pincer]");
    if (pincerStaff) {
      const s = this.sim.staff.find((st) => st.id === pincerStaff.dataset.staffPincer);
      if (s) {
        this.renderer.pincerCarry = { kind: "staff", id: s.id, label: s.name };
        this.onToolChange({ type: "pincer" });
      }
      return;
    }
    const fireBtn = t.closest("[data-staff-fire]");
    if (fireBtn) {
      this.sim.fireStaff(fireBtn.dataset.staffFire);
      this._renderWindowContent("staff");
      return;
    }
    const feeBtn = t.closest("[data-park-fee]");
    if (feeBtn) {
      this.sim.parkEntryFee = Math.max(0, Math.min(50, this.sim.parkEntryFee + Number(feeBtn.dataset.parkFee)));
      this._renderWindowContent("park");
      return;
    }
    const loanBtn = t.closest("[data-loan-delta]");
    if (loanBtn) {
      const res = this.sim.adjustLoan(Number(loanBtn.dataset.loanDelta));
      if (!res.ok) this.sim.pushNews(res.reason, "warn");
      this._renderWindowContent("finances");
      return;
    }
    const mktBtn = t.closest("[data-mkt-start]");
    if (mktBtn) {
      const res = this.sim.startMarketingCampaign(mktBtn.dataset.mktStart);
      if (!res.ok) this.sim.pushNews(res.reason, "warn");
      this._renderWindowContent("finances");
      return;
    }
    if (t.closest("[data-save-local]")) {
      this.onSaveLocal();
      return;
    }
    if (t.closest("[data-load-local]")) {
      this.onLoadLocal();
      return;
    }
    if (t.closest("[data-reset-scenario]")) {
      this.onSwitchScenario(this.sim.scenarioId);
      return;
    }
    const swBtn = t.closest("[data-switch-scenario]");
    if (swBtn) {
      this.onSwitchScenario(swBtn.dataset.switchScenario);
      return;
    }
    const aiTabBtn = t.closest("[data-ai-tab]");
    if (aiTabBtn) {
      this._aiTab = aiTabBtn.dataset.aiTab;
      this._renderWindowContent("ai-archive");
      return;
    }
    const spBtn = t.closest("[data-ai-sponsor]");
    if (spBtn) {
      const targetRide = this.sim.rides.find((r) => r.track) || this.sim.rides[0];
      if (targetRide) {
        targetRide.name = `${spBtn.dataset.aiSponsor} 익스프레스`;
        this.sim.pushNews(`🏷️ [${targetRide.name}] AI 스폰서십 명명 완료!`, "good");
        this.audio.playAward();
      }
    }
  }

  refreshLiveState(nowSec) {
    // Update Mini-Viewports
    const rideCam = document.getElementById("rct-ride-minicam");
    if (rideCam) {
      const ride = this.sim.rides.find((r) => r.id === rideCam.dataset.rideId);
      if (ride) {
        let fx = ride.x;
        let fy = ride.y;
        let fz = ride.z;
        if (ride.track?.trains?.[0]) {
          const pose = ride.track.samplePoseAtDistance(ride.track.trains[0].distance);
          fx = pose.x;
          fy = pose.y;
          fz = pose.z;
        }
        this.renderer.renderMiniViewport(rideCam, fx, fy, fz, nowSec);
      }
    }
    const peepCam = document.getElementById("rct-peep-minicam");
    if (peepCam) {
      const peep = this.sim.peeps.find((p) => p.id === peepCam.dataset.peepId);
      if (peep) {
        const t = this.sim.getTile(Math.round(peep.x), Math.round(peep.y));
        this.renderer.renderMiniViewport(peepCam, peep.x, peep.y, t?.height || 2, nowSec);
      }
    }

    // Throttle bottom bar & numeric updates to 5Hz
    if (nowSec - this._lastStatusSync < 0.2) return;
    this._lastStatusSync = nowSec;

    const wIcon = document.getElementById("rct-weather-icon");
    if (wIcon) wIcon.textContent = this.sim.weather === "rain" ? "🌧️" : this.sim.weather === "cloudy" ? "⛅" : "☀️";
    const dEl = document.getElementById("rct-date-text");
    if (dEl) dEl.textContent = `Year ${this.sim.date.year}, ${this.sim.date.month}월 ${this.sim.date.day}일`;

    const latestNews = this.sim.newsFeed[0];
    const tEl = document.getElementById("rct-ticker-text");
    if (tEl && latestNews) tEl.textContent = latestNews.text;

    const cashEl = document.getElementById("rct-cash-text");
    if (cashEl) {
      cashEl.textContent = formatMoney(this.sim.cash);
      cashEl.classList.toggle("is-negative", this.sim.cash < 0);
    }
    const gEl = document.getElementById("rct-guests-text");
    if (gEl) gEl.textContent = `🧑 ${this.sim.peeps.length}명`;

    const rFill = document.getElementById("rct-rating-fill");
    if (rFill) rFill.style.width = `${Math.round((this.sim.parkRating / 999) * 100)}%`;
    const rText = document.getElementById("rct-rating-text");
    if (rText) rText.textContent = String(this.sim.parkRating);
  }
}
