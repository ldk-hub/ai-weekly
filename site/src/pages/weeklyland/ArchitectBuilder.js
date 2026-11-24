import * as THREE from "three";

const PLACE_CATALOG = [
  // 7 Animated POV Rides
  { cat: "ride", kind: "ride", type: "ferris_wheel", name: "위클리 대관람차", meta: "12 캔디 곤돌라" },
  { cat: "ride", kind: "ride", type: "drop_tower", name: "벤치마크 드롭타워", meta: "32m 자유낙하" },
  { cat: "ride", kind: "ride", type: "carousel", name: "그랜드 회전목마", meta: "줄무늬 서커스" },
  { cat: "ride", kind: "ride", type: "pirate_ship", name: "바이킹 어드벤처", meta: "65° 스윙 POV" },
  { cat: "ride", kind: "ride", type: "teacups", name: "파스텔 회전 티컵", meta: "이중 회전 POV" },
  { cat: "ride", kind: "ride", type: "swing_tower", name: "하늘 회전 그네", meta: "공중 회전 POV" },
  { cat: "ride", kind: "ride", type: "sky_tower", name: "하늘 전망대 타워", meta: "38m 360° 전망" },
  { cat: "ride", kind: "ride", type: "gyro_swing", name: "자이로 스윙 360", meta: "회전 진자 스릴" },
  { cat: "ride", kind: "ride", type: "enterprise_wheel", name: "엔터프라이즈 360", meta: "85° 수직 루프" },
  { cat: "ride", kind: "ride", type: "octopus_ride", name: "카툰 문어 라이드", meta: "6다리 웨이브 POV" },
  { cat: "ride", kind: "ride", type: "bumper_cars", name: "파스텔 범퍼카장", meta: "6대 충돌 질주" },
  { cat: "ride", kind: "ride", type: "rocket_spinner", name: "우주 로켓 스피너", meta: "행성 공전 POV" },
  // 10 Interactive Buildings & Shops
  { cat: "building", kind: "scenery", type: "fairy_castle", name: "위클리 동화 성", meta: "상호작용 랜드마크" },
  { cat: "building", kind: "scenery", type: "cafe_icecream", name: "아이스크림 카페", meta: "클릭 간식 구매" },
  { cat: "building", kind: "scenery", type: "popcorn_cart", name: "카라멜 팝콘 카트", meta: "클릭 팝콘 구매" },
  { cat: "building", kind: "scenery", type: "balloon_stall", name: "파스텔 풍선 가판", meta: "클릭 풍선 장착" },
  { cat: "building", kind: "scenery", type: "firework_launcher", name: "불꽃 폭죽 발사대", meta: "클릭 즉시 발사!" },
  { cat: "building", kind: "scenery", type: "kiosk", name: "테마 스낵 키오스크", meta: "상호작용 상점" },
  { cat: "building", kind: "scenery", type: "grand_arch", name: "그랜드 입구 아치", meta: "야간 발광 아치" },
  { cat: "building", kind: "scenery", type: "garland_arch", name: "만국기 페넌트 아치", meta: "축제 깃발" },
  { cat: "building", kind: "scenery", type: "heart_photozone", name: "하트 포토존", meta: "기념촬영 스팟" },
  { cat: "building", kind: "scenery", type: "ai_billboard", name: "AI 라이브 전광판", meta: "실시간 데이터" },
  // 7 Nature & Park Decor
  { cat: "decor", kind: "scenery", type: "fountain", name: "소원 분수대", meta: "클릭 소원 빌기" },
  { cat: "decor", kind: "scenery", type: "mascot_statue", name: "클로드 마스코트 동상", meta: "랜드마크 조형물" },
  { cat: "decor", kind: "scenery", type: "flower_bed", name: "파스텔 튤립 화단", meta: "정원 조경" },
  { cat: "decor", kind: "scenery", type: "bench", name: "공원 원목 벤치", meta: "휴식 공간" },
  { cat: "decor", kind: "scenery", type: "wood_bridge", name: "연못 나무다리", meta: "호수 횡단" },
  { cat: "decor", kind: "scenery", type: "tree_sakura", name: "솜사탕 벚나무", meta: "카툰 수목" },
  { cat: "decor", kind: "scenery", type: "tree_oak", name: "민트 활엽수", meta: "카툰 수목" },
  { cat: "decor", kind: "scenery", type: "tree_pine", name: "동화 침엽수", meta: "카툰 수목" },
  { cat: "decor", kind: "scenery", type: "tree_palm", name: "리조트 야자수", meta: "열대 수목" },
  { cat: "decor", kind: "scenery", type: "lamp_post", name: "페어리 가로등", meta: "야간 조명" },
];

const PATH_STYLE_OPTIONS = [
  { id: "sandstone", label: "사암 돌길" },
  { id: "wood", label: "우드 데크" },
  { id: "pastel_pink", label: "핑크 로드" },
  { id: "brick", label: "벽돌 산책로" },
];

/**
 * WeeklyLand Architect Mode (God Mode) 3D Builder Controller
 * - Multi-Coaster Spline Editor (+ Add New Coaster, color, height/bank/segment, Scrapling presets, EFN)
 * - 27-item Categorized Place Catalog (Rides / Interactive Buildings / Decor) + Delete/Demolish Tool
 * - Multi-Style Path Spline Builder with real-time pins & preview line
 * - 300m Terrain Sculpt Brush (raise / lower / pond / flatten)
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
    this.activeTool = "coaster"; // coaster | place | path | terrain | delete
    this.placeCategory = "all";
    this.selectedCoasterId = null;
    this.selectedNodeIndex = 0;
    this.selectedPlaceItem = PLACE_CATALOG[0];
    this.placeRotY = 0;
    this.terrainBrushMode = "raise";
    this.terrainBrushRadius = 12;
    this.terrainBrushStrength = 0.65;
    this.pathStyle = "sandstone";
    this.pathWidth = 4.2;
    this.activePathId = null;
    this.activePathPoints = [];
    this.presets = [];

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.isDraggingNode = false;
    this.isSculpting = false;

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
    const geo = new THREE.RingGeometry(0.84, 1.0, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.78,
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
    if (!this.active) this.terrain.setPathPreview([]);

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
    if (tool !== "path") {
      this.activePathPoints = [];
      this.activePathId = null;
      this.terrain.setPathPreview([]);
    }
    this.cursorRing.material.color.setHex(tool === "delete" ? 0xf87171 : 0x38bdf8);
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
        await this.publisher.publishToGitHub(pat, msg);
        this._setPublishStatus("배포 커밋 완료! GitHub Actions에서 자동 반영됩니다.");
        this.onToast?.("GitHub 원클릭 배포 커밋 완료!");
      } catch (err) {
        this._setPublishStatus(`GitHub 커밋 실패: ${err.message}`);
      }
    });

    document.getElementById("btn-blueprint-export")?.addEventListener("click", () => {
      this.publisher.downloadBlueprint();
      this.onToast?.("Blueprint JSON 파일이 다운로드되었습니다.");
    });

    document.getElementById("btn-blueprint-import")?.addEventListener("click", () => this.els.importFile?.click());

    this.els.importFile?.addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        this.worldState.importBlueprintString(await file.text());
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
      } else if (this.activeTool === "delete") {
        const hits = this.raycaster.intersectObjects(this.flatRide.pickables, false);
        if (hits.length) {
          const ud = hits[0].object.userData;
          if (ud?.id) this._deleteObject(ud.pickKind, ud.id);
        }
      }
    });

    window.addEventListener("pointermove", (ev) => {
      if (!this.active) return;
      this._updatePointer(ev);

      if (this.isDraggingNode && this.selectedCoasterId != null) {
        const hitPt = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.dragPlane, hitPt)) {
          const cx = THREE.MathUtils.clamp(Number(hitPt.x.toFixed(1)), -140, 140);
          const cz = THREE.MathUtils.clamp(Number(hitPt.z.toFixed(1)), -140, 140);
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
      if (pt && ["terrain", "place", "path", "delete"].includes(this.activeTool)) {
        this.cursorRing.visible = true;
        this.cursorRing.position.set(pt.x, pt.y + 0.22, pt.z);
        const r = this.activeTool === "terrain" ? this.terrainBrushRadius : this.activeTool === "path" ? this.pathWidth * 0.55 : 3.4;
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

  _deleteObject(pickKind, id) {
    this.worldState.mutate("rides", (d) => {
      if (pickKind === "ride") d.rides = (d.rides || []).filter((r) => r.id !== id);
      else d.scenery = (d.scenery || []).filter((s) => s.id !== id);
    });
    this.audio?.playClick(320);
    this.onToast?.("선택한 오브젝트를 철거했습니다. (Ctrl+Z 되돌리기 가능)");
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

  _addNewCoaster() {
    const idx = (this.worldState.getSnapshot().coasters?.length || 0) + 1;
    const offsetX = (idx % 2 === 0 ? 1 : -1) * 68;
    const offsetZ = 48 + idx * 8;
    const id = `coaster-custom-${Date.now().toString(36).slice(-4)}`;
    const colors = ["#38bdf8", "#f472b6", "#34d399", "#fbbf24", "#a78bfa"];
    this.worldState.mutate("coasters", (d) => {
      d.coasters.push({
        id,
        name: `위클리 코스터 ${idx}호기`,
        trackColor: colors[idx % colors.length],
        spineColor: "#fff7eb",
        supportColor: "#475569",
        trainCount: 1,
        carsPerTrain: 4,
        closed: true,
        nodes: [
          { x: offsetX - 18, y: 2.4, z: offsetZ + 12, bankDeg: 0, segment: "station" },
          { x: offsetX - 20, y: 2.8, z: offsetZ - 6, bankDeg: 0, segment: "lift" },
          { x: offsetX - 14, y: 24.0, z: offsetZ - 26, bankDeg: 0, segment: "normal" },
          { x: offsetX + 12, y: 4.5, z: offsetZ - 24, bankDeg: 42, segment: "boost" },
          { x: offsetX + 20, y: 15.0, z: offsetZ + 4, bankDeg: -34, segment: "normal" },
          { x: offsetX + 2, y: 4.5, z: offsetZ + 18, bankDeg: 24, segment: "brake" },
        ],
      });
    });
    this.selectedCoasterId = id;
    this.selectedNodeIndex = 0;
    this.coaster.setSelectedNode(id, 0);
    this.cameraRig.focusOn(new THREE.Vector3(offsetX, 8, offsetZ), 68);
    this.audio?.playClick(780);
    this.onToast?.(`'위클리 코스터 ${idx}호기' 신설 완료!`);
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
    const pt = [Number(x.toFixed(1)), Number(z.toFixed(1))];
    if (!this.activePathId) {
      this.activePathId = `path-custom-${Date.now().toString(36).slice(-4)}`;
      this.activePathPoints = [];
    }
    this.activePathPoints.push(pt);
    this.terrain.setPathPreview(this.activePathPoints);

    if (this.activePathPoints.length >= 2) {
      const pathId = this.activePathId;
      const pts = this.activePathPoints.map((p) => [...p]);
      const style = this.pathStyle;
      const width = this.pathWidth;
      this.worldState.mutate("paths", (d) => {
        if (!Array.isArray(d.paths)) d.paths = [];
        const existing = d.paths.find((p) => p.id === pathId);
        if (existing) {
          existing.points = pts;
          existing.style = style;
          existing.width = width;
        } else {
          d.paths.push({ id: pathId, width, style, closed: false, points: pts });
        }
      });
      this.audio?.playClick(540);
      this.onToast?.(`보행로 연결됨 (${pts.length}지점) — 계속 클릭해 연장하세요.`);
    } else {
      this.audio?.playClick(460);
      this.onToast?.("보행로 시작 핀 배치됨 — 다음 지점을 클릭하면 길이 깔립니다!");
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
    if (this.activeTool === "coaster") this._renderCoasterInspector(body);
    else if (this.activeTool === "place") this._renderPlaceInspector(body);
    else if (this.activeTool === "terrain") this._renderTerrainInspector(body);
    else if (this.activeTool === "path") this._renderPathInspector(body);
    else this._renderDeleteInspector(body);
  }

  _renderCoasterInspector(body) {
    const snap = this.worldState.getSnapshot();
    const coaster = snap.coasters.find((c) => c.id === this.selectedCoasterId) || snap.coasters[0];
    if (!coaster) {
      body.innerHTML = `<button type="button" id="btn-coaster-new" class="wl-hud-btn is-active">+ 첫 코스터 건설</button>`;
      body.querySelector("#btn-coaster-new")?.addEventListener("click", () => this._addNewCoaster());
      return;
    }
    this.selectedCoasterId = coaster.id;
    this.selectedNodeIndex = Math.max(0, Math.min(this.selectedNodeIndex, coaster.nodes.length - 1));
    const node = coaster.nodes[this.selectedNodeIndex];
    const metrics = this.coaster.getMetrics(coaster.id);

    body.innerHTML = `
      <div style="display:flex;gap:4px;margin-bottom:8px;">
        <select id="arch-coaster-select" class="wl-input" style="flex:1;">
          ${snap.coasters.map((c) => `<option value="${c.id}" ${c.id === coaster.id ? "selected" : ""}>${c.name}</option>`).join("")}
        </select>
        <button type="button" id="btn-coaster-new" class="wl-hud-btn is-active">+ 신설</button>
      </div>
      <div class="wl-efn-grid">
        <div class="wl-efn-cell"><div class="wl-pov-label">흥분도</div><div class="wl-efn-num is-excite">${metrics?.excitement ?? "—"}</div></div>
        <div class="wl-efn-cell"><div class="wl-pov-label">공포도</div><div class="wl-efn-num is-fear">${metrics?.fear ?? "—"}</div></div>
        <div class="wl-efn-cell"><div class="wl-pov-label">멀미도</div><div class="wl-efn-num is-nausea">${metrics?.nausea ?? "—"}</div></div>
      </div>
      <div class="wl-stat-mono" style="margin-bottom:12px;">
        최고 ${metrics?.maxSpeedKmh ?? 0}km/h · 길이 ${metrics?.lengthM ?? 0}m · ${metrics?.grade ?? "—"}
      </div>

      <div class="wl-section-heading">노드 #${this.selectedNodeIndex + 1} / ${coaster.nodes.length} (Shift+클릭 추가 · 드래그)</div>
      <div class="wl-field-row">
        <div class="wl-field-label"><span>트랙 고도 (Y)</span><span id="arch-lbl-y" class="wl-stat-mono">${node.y}m</span></div>
        <input id="arch-node-y" class="wl-range" type="range" min="2" max="48" step="0.5" value="${node.y}" />
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
      <div style="display:flex;gap:4px;margin-bottom:12px;flex-wrap:wrap;">
        <button type="button" id="btn-node-prev" class="wl-hud-btn">이전</button>
        <button type="button" id="btn-node-next" class="wl-hud-btn">다음</button>
        <button type="button" id="btn-node-add" class="wl-hud-btn is-active">+ 삽입</button>
        <button type="button" id="btn-node-del" class="wl-hud-btn is-danger">노드삭제</button>
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

    body.querySelector("#arch-coaster-select")?.addEventListener("change", (ev) => {
      this.selectedCoasterId = ev.target.value;
      this.selectedNodeIndex = 0;
      this.coaster.setSelectedNode(this.selectedCoasterId, 0);
      this.renderInspector();
    });
    body.querySelector("#btn-coaster-new")?.addEventListener("click", () => this._addNewCoaster());

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
    const cats = [
      { id: "all", label: `전체(${PLACE_CATALOG.length})` },
      { id: "ride", label: "놀이기구(12)" },
      { id: "building", label: "건물·상점(10)" },
      { id: "decor", label: "조경(10)" },
    ];
    const list = this.placeCategory === "all" ? PLACE_CATALOG : PLACE_CATALOG.filter((i) => i.cat === this.placeCategory);

    body.innerHTML = `
      <div class="wl-section-heading">건설 카탈로그 (클릭 배치 · R 회전)</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;">
        ${cats.map((c) => `<button type="button" class="wl-hud-btn ${this.placeCategory === c.id ? "is-active" : ""}" data-pcat="${c.id}">${c.label}</button>`).join("")}
      </div>
      <div class="wl-catalog-grid">
        ${list
          .map(
            (item) => `
          <button type="button" class="wl-catalog-item ${this.selectedPlaceItem === item ? "is-selected" : ""}" data-place-type="${item.type}">
            <span class="wl-catalog-name">${item.name}</span>
            <span class="wl-catalog-meta">${item.meta}</span>
          </button>`
          )
          .join("")}
      </div>
    `;
    body.querySelectorAll("[data-pcat]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.placeCategory = btn.dataset.pcat;
        this.renderInspector();
      });
    });
    body.querySelectorAll("[data-place-type]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedPlaceItem = PLACE_CATALOG.find((i) => i.type === btn.dataset.placeType) || PLACE_CATALOG[0];
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
      <div class="wl-section-heading">300m 지형 스컬프팅 (좌클릭 드래그)</div>
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
        <input id="arch-brush-r" class="wl-range" type="range" min="4" max="32" value="${this.terrainBrushRadius}" />
      </div>
      <div class="wl-field-row">
        <div class="wl-field-label"><span>브러시 강도</span><span class="wl-stat-mono">${Math.round(this.terrainBrushStrength * 100)}%</span></div>
        <input id="arch-brush-s" class="wl-range" type="range" min="0.15" max="1.4" step="0.05" value="${this.terrainBrushStrength}" />
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
      <div class="wl-section-heading">보행로(Path) 빌더 — 지면을 연속 클릭!</div>
      <div class="wl-catalog-grid" style="margin-bottom:12px;">
        ${PATH_STYLE_OPTIONS.map(
          (st) => `
          <button type="button" class="wl-catalog-item ${this.pathStyle === st.id ? "is-selected" : ""}" data-pstyle="${st.id}">
            <span class="wl-catalog-name">${st.label}</span>
          </button>`
        ).join("")}
      </div>
      <div class="wl-field-row">
        <div class="wl-field-label"><span>도로 폭</span><span class="wl-stat-mono">${this.pathWidth}m</span></div>
        <input id="arch-path-w" class="wl-range" type="range" min="2.4" max="7.2" step="0.4" value="${this.pathWidth}" />
      </div>
      <p class="wl-stat-mono" style="margin-bottom:12px;line-height:1.5;">
        지면을 순서대로 좌클릭하면 하늘색 핀과 함께 길이 즉시 깔립니다. (현재 ${this.activePathPoints.length}지점)
      </p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button type="button" id="btn-path-new" class="wl-hud-btn is-active">현재 길 확정 · 새 길 시작</button>
        <button type="button" id="btn-path-clear" class="wl-hud-btn is-danger">커스텀 길 전부 삭제</button>
      </div>
    `;
    body.querySelectorAll("[data-pstyle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.pathStyle = btn.dataset.pstyle;
        this.renderInspector();
      });
    });
    body.querySelector("#arch-path-w")?.addEventListener("input", (ev) => {
      this.pathWidth = Number(ev.target.value);
      this.renderInspector();
    });
    body.querySelector("#btn-path-new")?.addEventListener("click", () => {
      this.activePathPoints = [];
      this.activePathId = null;
      this.terrain.setPathPreview([]);
      this.renderInspector();
      this.onToast?.("새 보행로를 시작할 지점을 클릭하세요.");
    });
    body.querySelector("#btn-path-clear")?.addEventListener("click", () => {
      this.activePathPoints = [];
      this.activePathId = null;
      this.terrain.setPathPreview([]);
      this.worldState.mutate("paths", (d) => {
        d.paths = (d.paths || []).filter((p) => !String(p.id).startsWith("path-custom-"));
      });
      this.renderInspector();
      this.onToast?.("직접 깐 커스텀 보행로를 모두 정리했습니다.");
    });
  }

  _renderDeleteInspector(body) {
    body.innerHTML = `
      <div class="wl-section-heading">오브젝트 철거(지우개) 도구</div>
      <p class="wl-stat-mono" style="line-height:1.6;">
        공원 위에 배치된 어트랙션·건물·상점·나무·장식을 좌클릭하면 즉시 철거됩니다.<br/>
        실수로 지웠다면 하단 [되돌리기] 또는 Ctrl+Z로 즉시 복구할 수 있습니다.
      </p>
    `;
  }

  dispose() {
    this.cursorRing.geometry?.dispose();
    this.cursorRing.material?.dispose();
    this.scene.remove(this.cursorRing);
  }
}
