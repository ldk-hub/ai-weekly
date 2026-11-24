import * as THREE from "three";

const PLACE_CATALOG = [
  { kind: "ride", type: "ferris_wheel", name: "대관람차", meta: "12 곤돌라 POV" },
  { kind: "ride", type: "drop_tower", name: "벤치마크 드롭타워", meta: "30m 자유낙하" },
  { kind: "ride", type: "carousel", name: "그랜드 회전목마", meta: "클래식 브라스" },
  { kind: "scenery", type: "grand_arch", name: "그랜드 입구 아치", meta: "야간 발광" },
  { kind: "scenery", type: "fountain", name: "중앙 분수대", meta: "수경 조형물" },
  { kind: "scenery", type: "ai_billboard", name: "AI 라이브 전광판", meta: "실시간 데이터" },
  { kind: "scenery", type: "tree_sakura", name: "벚나무", meta: "조경 수목" },
  { kind: "scenery", type: "tree_oak", name: "활엽수", meta: "조경 수목" },
  { kind: "scenery", type: "tree_pine", name: "침엽수", meta: "조경 수목" },
  { kind: "scenery", type: "lamp_post", name: "페어리 가로등", meta: "야간 조명" },
  { kind: "scenery", type: "kiosk", name: "파크 키오스크", meta: "테마 상점" },
];

/**
 * WeeklyLand Architect Mode (God Mode) 3D Builder Controller
 * - Spline Coaster Editor: add/move/delete nodes, adjust Y height, bank angle, segment type,
 *   spawn real-world Scrapling coaster presets, live EFN ratings
 * - Place Catalog: place rides & scenery with live raycast ghost preview & R rotation
 * - Path Tool: click waypoints to extend sandstone walkways
 * - Terrain Sculpt Brush: raise / lower / flatten / pond
 * - Undo/Redo + Local Dev Save / GitHub PAT One-Click Publish / Blueprint JSON Export & Import
 */
export class ArchitectBuilder {
  constructor({ scene, canvas, cameraRig, worldState, terrainEngine, coasterEngine, flatRideEngine, publisher, audio, onToast }) {
    this.scene = scene;
    this.canvas = canvas;
    this.cameraRig = cameraRig;
    this.worldState = worldState;
    this.terrain = terrainEngine;
    this.coaster = coasterEngine;
    this.flatRide = flatRideEngine;
    this.publisher = publisher;
    this.audio = audio;
    this.onToast = onToast;

    this.active = false;
    this.activeTool = "coaster"; // coaster | place | path | terrain
    this.selectedCoasterId = null;
    this.selectedNodeIndex = 0;
    this.selectedPlaceItem = PLACE_CATALOG[0];
    this.placeRotY = 0;
    this.terrainBrushMode = "raise"; // raise | lower | flatten | pond
    this.terrainBrushRadius = 10;
    this.terrainBrushStrength = 0.55;
    this.presets = [];

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.isDraggingNode = false;
    this.isSculpting = false;
    this.activePathPoints = [];

    this.cursorRing = this._buildCursorRing();
    this.scene.add(this.cursorRing);

    this.els = {
      dock: document.getElementById("wl-builder-dock"),
      inspector: document.getElementById("wl-architect-inspector"),
      inspectorBody: document.getElementById("wl-inspector-body"),
      publishModal: document.getElementById("wl-publish-modal"),
      patInput: document.getElementById("wl-gh-pat"),
      commitInput: document.getElementById("wl-gh-commit-msg"),
      publishStatus: document.getElementById("wl-publish-status"),
      importFile: document.getElementById("wl-import-file"),
    };

    this._bindDom();
    this._bindCanvas();
  }

  _buildCursorRing() {
    const geo = new THREE.RingGeometry(0.85, 1.0, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    mesh.renderOrder = 999;
    return mesh;
  }

  async loadPresets() {
    try {
      const res = await fetch("data/coaster_presets.json", { cache: "no-cache" });
      if (res.ok) {
        const json = await res.json();
        this.presets = json.presets || [];
      }
    } catch {
      this.presets = [];
    }
  }

  setActive(flag) {
    this.active = Boolean(flag);
    this.coaster.setArchitectMode(this.active);
    this.canvas.classList.toggle("is-building", this.active);
    this.cursorRing.visible = false;

    if (this.els.dock) this.els.dock.hidden = !this.active;
    if (this.els.inspector) this.els.inspector.hidden = !this.active;

    if (this.active) {
      if (!this.selectedCoasterId) {
        this.selectedCoasterId = this.worldState.getSnapshot().coasters[0]?.id || null;
        this.selectedNodeIndex = 0;
      }
      this.coaster.setSelectedNode(this.selectedCoasterId, this.selectedNodeIndex);
      this.renderInspector();
    }
  }

  setTool(tool) {
    this.activeTool = tool;
    this.activePathPoints = [];
    document.querySelectorAll("[data-arch-tool]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.archTool === tool);
    });
    this.renderInspector();
  }

  _bindDom() {
    document.querySelectorAll("[data-arch-tool]").forEach((btn) => {
      btn.addEventListener("click", () => this.setTool(btn.dataset.archTool));
    });

    document.getElementById("btn-arch-undo")?.addEventListener("click", () => {
      if (this.worldState.undo()) {
        this.audio?.playClick(420);
        this.renderInspector();
      }
    });
    document.getElementById("btn-arch-redo")?.addEventListener("click", () => {
      if (this.worldState.redo()) {
        this.audio?.playClick(580);
        this.renderInspector();
      }
    });
    document.getElementById("btn-arch-publish")?.addEventListener("click", () => this.openPublishModal());
    document.getElementById("btn-publish-close")?.addEventListener("click", () => this.closePublishModal());

    document.getElementById("btn-publish-local")?.addEventListener("click", async () => {
      this._setPublishStatus("로컬 파일에 저장 중…");
      try {
        const res = await this.publisher.saveToLocalDev();
        this._setPublishStatus(`저장 완료: ${res.path}`);
        this.onToast?.("로컬 park_world.json 저장 완료!");
      } catch (err) {
        this._setPublishStatus(`저장 실패: ${err.message}`);
      }
    });

    document.getElementById("btn-publish-github")?.addEventListener("click", async () => {
      const pat = this.els.patInput?.value || "";
      const msg = this.els.commitInput?.value || "feat(sanctuary): update WeeklyLand 3D park world";
      this._setPublishStatus("GitHub Contents API 커밋 중…");
      try {
        const res = await this.publisher.publishToGitHub(pat, msg);
        this._setPublishStatus(`배포 커밋 완료! GitHub Actions에서 자동 반영됩니다.`);
        this.onToast?.("GitHub 원클릭 배포 커밋 완료!");
        console.info("[WeeklyLand] Published commit:", res.commitUrl);
      } catch (err) {
        this._setPublishStatus(`GitHub 커밋 실패: ${err.message}`);
      }
    });

    document.getElementById("btn-blueprint-export")?.addEventListener("click", () => {
      this.publisher.downloadBlueprint();
      this.onToast?.("Blueprint JSON 파일이 다운로드되었습니다.");
    });

    document.getElementById("btn-blueprint-import")?.addEventListener("click", () => {
      this.els.importFile?.click();
    });

    this.els.importFile?.addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        this.worldState.importBlueprintString(text);
        this.renderInspector();
        this.onToast?.("Blueprint 월드를 성공적으로 불러왔습니다!");
      } catch (err) {
        this.onToast?.(`불러오기 오류: ${err.message}`);
      }
      ev.target.value = "";
    });

    document.getElementById("btn-arch-reset")?.addEventListener("click", () => {
      this.worldState.resetToBaseline();
      this.renderInspector();
      this.onToast?.("마지막 배포 버전으로 초기화했습니다.");
    });

    window.addEventListener("keydown", (ev) => {
      if (!this.active) return;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === "z") {
        ev.preventDefault();
        if (ev.shiftKey) this.worldState.redo();
        else this.worldState.undo();
        this.renderInspector();
      } else if (ev.key.toLowerCase() === "r" && this.activeTool === "place") {
        this.placeRotY = (this.placeRotY + Math.PI * 0.25) % (Math.PI * 2);
        this.onToast?.(`배치 회전: ${Math.round((this.placeRotY * 180) / Math.PI)}°`);
      }
    });
  }

  _setPublishStatus(msg) {
    if (this.els.publishStatus) this.els.publishStatus.textContent = msg;
  }

  openPublishModal() {
    if (!this.els.publishModal) return;
    this.els.publishModal.hidden = false;
    const localBtn = document.getElementById("btn-publish-local");
    if (localBtn) localBtn.hidden = !this.publisher.isLocalDev();
    if (this.els.patInput) this.els.patInput.value = this.publisher.getSessionPat();
    this._setPublishStatus(
      this.publisher.isLocalDev()
        ? "로컬 개발 서버 감지됨: PAT 없이 즉시 파일 저장이 가능합니다."
        : "GitHub Fine-grained PAT(Contents 쓰기 권한)를 입력하면 원클릭 배포됩니다."
    );
  }

  closePublishModal() {
    if (this.els.publishModal) this.els.publishModal.hidden = true;
  }

  _updatePointer(ev) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    this.pointer.y = -((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.cameraRig.camera);
  }

  _hitTerrain() {
    const hits = this.raycaster.intersectObject(this.terrain.terrainMesh, false);
    return hits.length ? hits[0].point : null;
  }

  _bindCanvas() {
    this.canvas.addEventListener("pointerdown", (ev) => {
      if (!this.active || ev.button !== 0 || ev.altKey) return;
      this._updatePointer(ev);

      if (this.activeTool === "coaster") {
        const nodeHits = this.raycaster.intersectObjects(this.coaster.nodeHandleMeshes, false);
        if (nodeHits.length) {
          const ud = nodeHits[0].object.userData;
          this.selectedCoasterId = ud.coasterId;
          this.selectedNodeIndex = ud.nodeIndex;
          this.coaster.setSelectedNode(ud.coasterId, ud.nodeIndex);
          this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), nodeHits[0].object.position);
          this.isDraggingNode = true;
          this.renderInspector();
          this.audio?.playClick(640);
          return;
        }
        // Shift + Click on ground appends a new spline node to the selected coaster
        if (ev.shiftKey) {
          const pt = this._hitTerrain();
          if (pt) this._appendCoasterNode(pt.x, Math.max(4, pt.y + 8), pt.z);
        }
      } else if (this.activeTool === "place") {
        const pt = this._hitTerrain();
        if (pt) this._placeSelectedObject(pt.x, pt.z);
      } else if (this.activeTool === "path") {
        const pt = this._hitTerrain();
        if (pt) this._addPathPoint(pt.x, pt.z);
      } else if (this.activeTool === "terrain") {
        const pt = this._hitTerrain();
        if (pt) {
          this.isSculpting = true;
          this._applyTerrainStep(pt.x, pt.z);
        }
      }
    });

    window.addEventListener("pointermove", (ev) => {
      if (!this.active) return;
      this._updatePointer(ev);

      if (this.isDraggingNode && this.selectedCoasterId != null) {
        const hitPt = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, hitPt)) {
          const cx = THREE.MathUtils.clamp(Number(hitPt.x.toFixed(1)), -70, 70);
          const cz = THREE.MathUtils.clamp(Number(hitPt.z.toFixed(1)), -70, 70);
          this.worldState.mutate(
            "coasters",
            (d) => {
              const c = d.coasters.find((x) => x.id === this.selectedCoasterId);
              if (c?.nodes[this.selectedNodeIndex]) {
                c.nodes[this.selectedNodeIndex].x = cx;
                c.nodes[this.selectedNodeIndex].z = cz;
              }
            },
            { recordHistory: false, broadcast: false }
          );
        }
        return;
      }

      const pt = this._hitTerrain();
      if (pt && (this.activeTool === "terrain" || this.activeTool === "place" || this.activeTool === "path")) {
        this.cursorRing.visible = true;
        this.cursorRing.position.set(pt.x, pt.y + 0.18, pt.z);
        const r = this.activeTool === "terrain" ? this.terrainBrushRadius : this.activeTool === "path" ? 2.1 : 3.2;
        this.cursorRing.scale.set(r, r, r);
        if (this.isSculpting && this.activeTool === "terrain") {
          this._applyTerrainStep(pt.x, pt.z);
        }
      } else {
        this.cursorRing.visible = false;
      }
    });

    window.addEventListener("pointerup", () => {
      if (this.isDraggingNode) {
        this.isDraggingNode = false;
        this.worldState.emit("world:changed", { scope: "coasters", data: this.worldState.getSnapshot(), broadcast: true });
        this.renderInspector();
      }
      if (this.isSculpting) {
        this.isSculpting = false;
        const heights = this.terrain.exportHeightsArray();
        this.worldState.mutate("terrain", (d) => {
          d.terrain.heights = heights;
        });
      }
    });
  }

  _applyTerrainStep(x, z) {
    this.terrain.applyBrush(x, z, this.terrainBrushRadius, this.terrainBrushStrength, this.terrainBrushMode);
  }

  _appendCoasterNode(x, y, z) {
    this.worldState.mutate("coasters", (d) => {
      const c = d.coasters.find((item) => item.id === this.selectedCoasterId) || d.coasters[0];
      if (!c) return;
      const insertAt = Math.min(c.nodes.length, this.selectedNodeIndex + 1);
      c.nodes.splice(insertAt, 0, {
        x: Number(x.toFixed(1)),
        y: Number(y.toFixed(1)),
        z: Number(z.toFixed(1)),
        bankDeg: 20,
        segment: "normal",
      });
      this.selectedNodeIndex = insertAt;
    });
    this.coaster.setSelectedNode(this.selectedCoasterId, this.selectedNodeIndex);
    this.audio?.playClick(720);
    this.renderInspector();
  }

  _placeSelectedObject(x, z) {
    const item = this.selectedPlaceItem;
    if (!item) return;
    const id = `${item.kind}-${item.type}-${Date.now().toString(36).slice(-4)}`;
    this.worldState.mutate("rides", (d) => {
      if (item.kind === "ride") {
        d.rides.push({
          id,
          type: item.type,
          name: item.name,
          x: Number(x.toFixed(1)),
          z: Number(z.toFixed(1)),
          rotY: Number(this.placeRotY.toFixed(2)),
          scale: 1.0,
        });
      } else {
        d.scenery.push({
          id,
          type: item.type,
          x: Number(x.toFixed(1)),
          z: Number(z.toFixed(1)),
          rotY: Number(this.placeRotY.toFixed(2)),
          scale: 1.0,
        });
      }
    });
    this.audio?.playClick(620);
    this.onToast?.(`'${item.name}' 배치 완료`);
  }

  _addPathPoint(x, z) {
    this.activePathPoints.push([Number(x.toFixed(1)), Number(z.toFixed(1))]);
    if (this.activePathPoints.length >= 2) {
      const pts = [...this.activePathPoints];
      this.worldState.mutate("paths", (d) => {
        if (!Array.isArray(d.paths)) d.paths = [];
        const existing = d.paths.find((p) => p.id === "path-architect-custom");
        if (existing) existing.points = pts;
        else d.paths.push({ id: "path-architect-custom", width: 3.8, style: "sandstone", closed: false, points: pts });
      });
      this.audio?.playClick(500);
    } else {
      this.onToast?.("보행로 시작점 지정됨 — 다음 지점을 클릭해 길을 연결하세요.");
    }
  }

  applyPresetCoaster(presetId) {
    const preset = this.presets.find((p) => p.id === presetId);
    if (!preset) return;
    this.worldState.mutate("coasters", (d) => {
      const target = d.coasters.find((c) => c.id === this.selectedCoasterId) || d.coasters[0];
      if (!target) return;
      target.name = preset.name;
      target.trackColor = preset.trackColor;
      target.spineColor = preset.spineColor;
      target.supportColor = preset.supportColor;
      target.nodes = preset.nodes.map((n) => ({ ...n }));
      this.selectedCoasterId = target.id;
      this.selectedNodeIndex = 0;
    });
    this.coaster.setSelectedNode(this.selectedCoasterId, 0);
    this.audio?.playClick(760);
    this.onToast?.(`Scrapling 프리셋 '${preset.name}' 소환 완료!`);
    this.renderInspector();
  }

  renderInspector() {
    const body = this.els.inspectorBody;
    if (!body) return;

    if (this.activeTool === "coaster") {
      this._renderCoasterInspector(body);
    } else if (this.activeTool === "place") {
      this._renderPlaceInspector(body);
    } else if (this.activeTool === "terrain") {
      this._renderTerrainInspector(body);
    } else {
      this._renderPathInspector(body);
    }
  }

  _renderCoasterInspector(body) {
    const snap = this.worldState.getSnapshot();
    const coaster = snap.coasters.find((c) => c.id === this.selectedCoasterId) || snap.coasters[0];
    if (!coaster) {
      body.innerHTML = `<p class="wl-stat-mono">코스터가 없습니다.</p>`;
      return;
    }
    this.selectedCoasterId = coaster.id;
    this.selectedNodeIndex = Math.max(0, Math.min(this.selectedNodeIndex, coaster.nodes.length - 1));
    const node = coaster.nodes[this.selectedNodeIndex];
    const metrics = this.coaster.getMetrics(coaster.id);

    body.innerHTML = `
      <div class="wl-section-heading">${coaster.name} · EFN 시뮬레이션</div>
      <div class="wl-efn-grid">
        <div class="wl-efn-cell"><div class="wl-pov-label">흥분도</div><div class="wl-efn-num is-excite">${metrics?.excitement ?? "—"}</div></div>
        <div class="wl-efn-cell"><div class="wl-pov-label">공포도</div><div class="wl-efn-num is-fear">${metrics?.fear ?? "—"}</div></div>
        <div class="wl-efn-cell"><div class="wl-pov-label">멀미도</div><div class="wl-efn-num is-nausea">${metrics?.nausea ?? "—"}</div></div>
      </div>
      <div class="wl-stat-mono" style="margin-bottom:12px;">
        최고 ${metrics?.maxSpeedKmh ?? 0}km/h · 길이 ${metrics?.lengthM ?? 0}m · 등급 ${metrics?.grade ?? "—"}
      </div>

      <div class="wl-section-heading">노드 #${this.selectedNodeIndex + 1} / ${coaster.nodes.length} 편집 (Shift+클릭 추가 · 드래그 이동)</div>
      <div class="wl-field-row">
        <div class="wl-field-label"><span>트랙 고도 (Y)</span><span id="arch-lbl-y" class="wl-stat-mono">${node.y}m</span></div>
        <input id="arch-node-y" class="wl-range" type="range" min="2" max="46" step="0.5" value="${node.y}" />
      </div>
      <div class="wl-field-row">
        <div class="wl-field-label"><span>뱅킹 각도 (Roll)</span><span id="arch-lbl-bank" class="wl-stat-mono">${node.bankDeg || 0}°</span></div>
        <input id="arch-node-bank" class="wl-range" type="range" min="-75" max="75" step="2" value="${node.bankDeg || 0}" />
      </div>
      <div class="wl-field-row">
        <div class="wl-field-label"><span>트랙 구간 타입</span></div>
        <select id="arch-node-seg" class="wl-input">
          <option value="normal" ${node.segment === "normal" ? "selected" : ""}>일반 레일 (Normal)</option>
          <option value="station" ${node.segment === "station" ? "selected" : ""}>탑승 스테이션 (Station)</option>
          <option value="lift" ${node.segment === "lift" ? "selected" : ""}>체인 리프트 (Chain Lift)</option>
          <option value="boost" ${node.segment === "boost" ? "selected" : ""}>LSM 부스터 (Boost)</option>
          <option value="brake" ${node.segment === "brake" ? "selected" : ""}>자기 브레이크 (Brake)</option>
        </select>
      </div>
      <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;">
        <button type="button" id="btn-node-prev" class="wl-hud-btn">이전 노드</button>
        <button type="button" id="btn-node-next" class="wl-hud-btn">다음 노드</button>
        <button type="button" id="btn-node-add" class="wl-hud-btn is-active">+ 노드 삽입</button>
        <button type="button" id="btn-node-del" class="wl-hud-btn is-danger">삭제</button>
      </div>

      <div class="wl-section-heading">실존 유명 코스터 프리셋 (Scrapling)</div>
      <div class="wl-catalog-grid">
        ${this.presets
          .map(
            (p) => `
          <button type="button" class="wl-catalog-item" data-spawn-preset="${p.id}">
            <span class="wl-catalog-name">${p.name}</span>
            <span class="wl-catalog-meta">${p.specs.height_m}m · ${p.specs.speed_kmh}km/h</span>
          </button>`
          )
          .join("")}
      </div>
    `;

    body.querySelector("#arch-node-y")?.addEventListener("input", (ev) => {
      const val = Number(ev.target.value);
      const lbl = body.querySelector("#arch-lbl-y");
      if (lbl) lbl.textContent = `${val}m`;
      this.worldState.mutate("coasters", (d) => {
        const c = d.coasters.find((x) => x.id === this.selectedCoasterId);
        if (c?.nodes[this.selectedNodeIndex]) c.nodes[this.selectedNodeIndex].y = val;
      }, { recordHistory: false });
      this._refreshEfnNumbersOnly(body, coaster.id);
    });

    body.querySelector("#arch-node-bank")?.addEventListener("input", (ev) => {
      const val = Number(ev.target.value);
      const lbl = body.querySelector("#arch-lbl-bank");
      if (lbl) lbl.textContent = `${val}°`;
      this.worldState.mutate("coasters", (d) => {
        const c = d.coasters.find((x) => x.id === this.selectedCoasterId);
        if (c?.nodes[this.selectedNodeIndex]) c.nodes[this.selectedNodeIndex].bankDeg = val;
      }, { recordHistory: false });
      this._refreshEfnNumbersOnly(body, coaster.id);
    });

    body.querySelector("#arch-node-seg")?.addEventListener("change", (ev) => {
      const seg = ev.target.value;
      this.worldState.mutate("coasters", (d) => {
        const c = d.coasters.find((x) => x.id === this.selectedCoasterId);
        if (c?.nodes[this.selectedNodeIndex]) c.nodes[this.selectedNodeIndex].segment = seg;
      });
      this.coaster.setSelectedNode(this.selectedCoasterId, this.selectedNodeIndex);
      this.renderInspector();
    });

    body.querySelector("#btn-node-prev")?.addEventListener("click", () => {
      this.selectedNodeIndex = (this.selectedNodeIndex - 1 + coaster.nodes.length) % coaster.nodes.length;
      this.coaster.setSelectedNode(this.selectedCoasterId, this.selectedNodeIndex);
      this.renderInspector();
    });
    body.querySelector("#btn-node-next")?.addEventListener("click", () => {
      this.selectedNodeIndex = (this.selectedNodeIndex + 1) % coaster.nodes.length;
      this.coaster.setSelectedNode(this.selectedCoasterId, this.selectedNodeIndex);
      this.renderInspector();
    });
    body.querySelector("#btn-node-add")?.addEventListener("click", () => {
      const nextN = coaster.nodes[(this.selectedNodeIndex + 1) % coaster.nodes.length];
      this._appendCoasterNode((node.x + nextN.x) * 0.5, (node.y + nextN.y) * 0.5 + 3, (node.z + nextN.z) * 0.5);
    });
    body.querySelector("#btn-node-del")?.addEventListener("click", () => {
      if (coaster.nodes.length <= 4) {
        this.onToast?.("코스터는 최소 4개 이상의 노드가 필요합니다.");
        return;
      }
      this.worldState.mutate("coasters", (d) => {
        const c = d.coasters.find((x) => x.id === this.selectedCoasterId);
        c?.nodes.splice(this.selectedNodeIndex, 1);
      });
      this.selectedNodeIndex = Math.max(0, this.selectedNodeIndex - 1);
      this.renderInspector();
    });

    body.querySelectorAll("[data-spawn-preset]").forEach((btn) => {
      btn.addEventListener("click", () => this.applyPresetCoaster(btn.dataset.spawnPreset));
    });
  }

  _refreshEfnNumbersOnly(body, coasterId) {
    const m = this.coaster.getMetrics(coasterId);
    if (!m) return;
    const ex = body.querySelector(".is-excite");
    const fr = body.querySelector(".is-fear");
    const na = body.querySelector(".is-nausea");
    if (ex) ex.textContent = String(m.excitement);
    if (fr) fr.textContent = String(m.fear);
    if (na) na.textContent = String(m.nausea);
  }

  _renderPlaceInspector(body) {
    body.innerHTML = `
      <div class="wl-section-heading">어트랙션 & 조경 카탈로그 (클릭 배치 · R 회전)</div>
      <div class="wl-catalog-grid">
        ${PLACE_CATALOG.map(
          (item, idx) => `
          <button type="button" class="wl-catalog-item ${this.selectedPlaceItem === item ? "is-selected" : ""}" data-place-idx="${idx}">
            <span class="wl-catalog-name">${item.name}</span>
            <span class="wl-catalog-meta">${item.meta}</span>
          </button>`
        ).join("")}
      </div>
    `;
    body.querySelectorAll("[data-place-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedPlaceItem = PLACE_CATALOG[Number(btn.dataset.placeIdx)];
        this.renderInspector();
      });
    });
  }

  _renderTerrainInspector(body) {
    const modes = [
      { id: "raise", label: "언덕 올리기" },
      { id: "lower", label: "지형 내리기" },
      { id: "pond", label: "연못 파기" },
      { id: "flatten", label: "평탄화" },
    ];
    body.innerHTML = `
      <div class="wl-section-heading">지형 스컬프팅 브러시 (좌클릭 드래그)</div>
      <div class="wl-catalog-grid" style="margin-bottom:12px;">
        ${modes
          .map(
            (m) => `
          <button type="button" class="wl-catalog-item ${this.terrainBrushMode === m.id ? "is-selected" : ""}" data-brush="${m.id}">
            <span class="wl-catalog-name">${m.label}</span>
          </button>`
          )
          .join("")}
      </div>
      <div class="wl-field-row">
        <div class="wl-field-label"><span>브러시 반경</span><span class="wl-stat-mono">${this.terrainBrushRadius}m</span></div>
        <input id="arch-brush-r" class="wl-range" type="range" min="4" max="24" value="${this.terrainBrushRadius}" />
      </div>
      <div class="wl-field-row">
        <div class="wl-field-label"><span>브러시 강도</span><span class="wl-stat-mono">${Math.round(this.terrainBrushStrength * 100)}%</span></div>
        <input id="arch-brush-s" class="wl-range" type="range" min="0.15" max="1.2" step="0.05" value="${this.terrainBrushStrength}" />
      </div>
    `;
    body.querySelectorAll("[data-brush]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.terrainBrushMode = btn.dataset.brush;
        this.renderInspector();
      });
    });
    body.querySelector("#arch-brush-r")?.addEventListener("input", (ev) => {
      this.terrainBrushRadius = Number(ev.target.value);
      this.renderInspector();
    });
    body.querySelector("#arch-brush-s")?.addEventListener("input", (ev) => {
      this.terrainBrushStrength = Number(ev.target.value);
      this.renderInspector();
    });
  }

  _renderPathInspector(body) {
    body.innerHTML = `
      <div class="wl-section-heading">보행로(Path) 스플라인 빌더</div>
      <p class="wl-stat-mono" style="margin-bottom:12px;line-height:1.5;">
        지면 위를 순서대로 좌클릭하면 사암 산책로가 연결되고, AI 관람객들이 새 경로를 따라 자동으로 걸어다닙니다.
      </p>
      <div style="display:flex;gap:6px;">
        <button type="button" id="btn-path-new" class="wl-hud-btn is-active">새 보행로 시작</button>
        <button type="button" id="btn-path-clear" class="wl-hud-btn is-danger">커스텀 길 삭제</button>
      </div>
    `;
    body.querySelector("#btn-path-new")?.addEventListener("click", () => {
      this.activePathPoints = [];
      this.onToast?.("새 보행로 시작 — 지면을 클릭해 연결하세요.");
    });
    body.querySelector("#btn-path-clear")?.addEventListener("click", () => {
      this.activePathPoints = [];
      this.worldState.mutate("paths", (d) => {
        d.paths = (d.paths || []).filter((p) => p.id !== "path-architect-custom");
      });
      this.onToast?.("커스텀 보행로를 삭제했습니다.");
    });
  }

  dispose() {
    this.cursorRing.geometry?.dispose();
    this.cursorRing.material?.dispose();
    this.scene.remove(this.cursorRing);
  }
}
