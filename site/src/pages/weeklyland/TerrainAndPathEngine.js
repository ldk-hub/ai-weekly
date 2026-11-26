import * as THREE from "three";
import { createToonMaterial, getCartoonGrassTexture, safeDisposeObjectTree } from "./ToonMaterials.js";
import { STAGE_PALETTES, STAGE_IDS, getBiomeWeightsAt } from "./ParkThemeStages.js";

const PATH_STYLES = {
  sandstone: { main: 0xffe8c2, curb: 0xd9a76a },
  wood: { main: 0xc98a55, curb: 0x7c4d2b },
  pastel_pink: { main: 0xffd1e6, curb: 0xf472b6 },
  brick: { main: 0xe89a78, curb: 0x9a4a32 },
};

/**
 * WeeklyLand 3D Terrain, Water & Park Path Engine
 * - 300m x 300m sculpted cartoon terrain with bilinear height sampling
 * - Interactive Architect brush (raise / lower / flatten / pond)
 * - Multi-style cartoon park walkways (double-sided upward normals!) + live path drawing preview
 */
export class TerrainAndPathEngine {
  constructor(scene, terrainConfig, pathsConfig = []) {
    this.scene = scene;
    this.size = terrainConfig?.size || 300;
    this.res = terrainConfig?.resolution || 72;
    this.waterLevel = terrainConfig?.waterLevel ?? -0.6;
    this.heights = new Float32Array((this.res + 1) * (this.res + 1));

    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_Terrain";
    this.scene.add(this.group);

    this.pathGroup = new THREE.Group();
    this.pathGroup.name = "WeeklyLand_Paths";
    this.group.add(this.pathGroup);

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = "WeeklyLand_PathPreview";
    this.group.add(this.previewGroup);

    this.walkWaypoints = [];
    this.walkEdges = new Map();
    this._waterTime = 0;
    this.themePalette = STAGE_PALETTES["sunlit-meadow"];
    this.unifiedBiomeMode = true;
    this._waterTintDay = new THREE.Color(0xffffff);
    this._waterTintNight = new THREE.Color(0x4b6285);

    this._initHeights(terrainConfig);
    this._buildTerrainMesh();
    this._buildWaterMesh();
    this.rebuildPaths(pathsConfig);
  }

  setThemePalette(stageId) {
    this.themePalette = STAGE_PALETTES[stageId] || STAGE_PALETTES["sunlit-meadow"];
    if (!this.unifiedBiomeMode) {
      this._syncGeometryFromHeights();
    }
  }

  _initHeights(cfg) {
    const stride = this.res + 1;
    const saved = cfg?.heights;
    if (Array.isArray(saved) && saved.length === this.heights.length) {
      for (let i = 0; i < saved.length; i++) {
        this.heights[i] = Number(saved[i]) || 0;
      }
      return;
    }

    this.heights.fill(0);
    const hills = Array.isArray(cfg?.hills) ? cfg.hills : [];
    for (let iz = 0; iz <= this.res; iz++) {
      const wz = (iz / this.res - 0.5) * this.size;
      for (let ix = 0; ix <= this.res; ix++) {
        const wx = (ix / this.res - 0.5) * this.size;
        let h = 0;
        for (const hill of hills) {
          const dx = wx - hill.x;
          const dz = wz - hill.z;
          const d = Math.hypot(dx, dz);
          if (d < hill.radius) {
            const k = Math.cos((d / hill.radius) * Math.PI * 0.5);
            h += hill.height * k * k;
          }
        }
        // Subtle perimeter berm framing the park bowl
        const edgeDist = Math.max(Math.abs(wx), Math.abs(wz)) / (this.size * 0.5);
        if (edgeDist > 0.84) {
          const t = (edgeDist - 0.84) / 0.16;
          h += t * t * 3.8;
        }
        this.heights[iz * stride + ix] = Number(h.toFixed(3));
      }
    }
  }

  _buildTerrainMesh() {
    this.terrainGeo = new THREE.PlaneGeometry(this.size, this.size, this.res, this.res);
    this.terrainGeo.rotateX(-Math.PI / 2);

    const count = this.terrainGeo.attributes.position.count;
    this.colorAttr = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    this.terrainGeo.setAttribute("color", this.colorAttr);

    const grassTex = getCartoonGrassTexture();
    const rep = Math.max(18, Math.round(this.size / 16));
    grassTex.repeat.set(rep, rep);

    this.terrainMat = createToonMaterial(0xffffff, {
      vertexColors: true,
      map: grassTex,
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeo, this.terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.name = "ParkTerrainMesh";
    this.group.add(this.terrainMesh);

    this._syncGeometryFromHeights();
  }

  _buildWaterMesh() {
    const waterGeo = new THREE.PlaneGeometry(this.size * 0.98, this.size * 0.98, 36, 36);
    waterGeo.rotateX(-Math.PI / 2);
    const wPos = waterGeo.attributes.position;
    const wColors = new Float32Array(wPos.count * 3);
    const tmpCol = new THREE.Color();
    const palColors = {};
    for (const id of STAGE_IDS) {
      palColors[id] = new THREE.Color(STAGE_PALETTES[id].waterColorDay);
    }

    for (let i = 0; i < wPos.count; i++) {
      const wx = wPos.getX(i);
      const wz = wPos.getZ(i);
      const { weights } = getBiomeWeightsAt(wx, wz);
      let r = 0, g = 0, b = 0;
      for (const id of STAGE_IDS) {
        const w = weights[id];
        if (w <= 0) continue;
        r += palColors[id].r * w;
        g += palColors[id].g * w;
        b += palColors[id].b * w;
      }
      tmpCol.setRGB(r, g, b);
      wColors[i * 3] = tmpCol.r;
      wColors[i * 3 + 1] = tmpCol.g;
      wColors[i * 3 + 2] = tmpCol.b;
    }
    waterGeo.setAttribute("color", new THREE.BufferAttribute(wColors, 3));

    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.84,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMat);
    this.waterMesh.position.y = this.waterLevel;
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);
  }

  _syncGeometryFromHeights() {
    const pos = this.terrainGeo.attributes.position;
    const col = this.colorAttr;
    const cSand = new THREE.Color(0xfff0cf);
    const cGrass = new THREE.Color();
    const cLush = new THREE.Color();
    const cRock = new THREE.Color();
    const cPond = new THREE.Color();
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const h = this.heights[i] || 0;
      pos.setY(i, h);
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      const distCenter = Math.hypot(wx, wz);

      if (this.unifiedBiomeMode) {
        const { weights } = getBiomeWeightsAt(wx, wz);
        let gr = 0, gg = 0, gb = 0;
        let mr = 0, mg = 0, mb = 0;
        let hr = 0, hg = 0, hb = 0;
        let wr = 0, wg = 0, wb = 0;
        for (const id of STAGE_IDS) {
          const w = weights[id];
          if (w <= 0) continue;
          const tc = STAGE_PALETTES[id].terrainColors;
          gr += tc.lowGrass[0] * w; gg += tc.lowGrass[1] * w; gb += tc.lowGrass[2] * w;
          mr += tc.midGrass[0] * w; mg += tc.midGrass[1] * w; mb += tc.midGrass[2] * w;
          hr += tc.highPeak[0] * w; hg += tc.highPeak[1] * w; hb += tc.highPeak[2] * w;
          wr += tc.waterBed[0] * w; wg += tc.waterBed[1] * w; wb += tc.waterBed[2] * w;
        }
        cGrass.setRGB(gr, gg, gb);
        cLush.setRGB(mr, mg, mb);
        cRock.setRGB(hr, hg, hb);
        cPond.setRGB(wr, wg, wb);
      } else {
        const tc = this.themePalette?.terrainColors;
        cGrass.setRGB(tc ? tc.lowGrass[0] : 0.46, tc ? tc.lowGrass[1] : 0.84, tc ? tc.lowGrass[2] : 0.50);
        cLush.setRGB(tc ? tc.midGrass[0] : 0.56, tc ? tc.midGrass[1] : 0.89, tc ? tc.midGrass[2] : 0.56);
        cRock.setRGB(tc ? tc.highPeak[0] : 0.76, tc ? tc.highPeak[1] : 0.72, tc ? tc.highPeak[2] : 0.84);
        cPond.setRGB(tc ? tc.waterBed[0] : 0.34, tc ? tc.waterBed[1] : 0.72, tc ? tc.waterBed[2] : 0.76);
      }

      if (h < this.waterLevel + 0.14) {
        tmp.copy(cPond);
      } else if (h < 0.28 && distCenter < 26) {
        const plazaMix = THREE.MathUtils.clamp(1 - distCenter / 26, 0, 1);
        tmp.copy(cGrass).lerp(cSand, plazaMix * 0.55);
      } else if (h > 3.6) {
        const rockMix = THREE.MathUtils.clamp((h - 3.6) / 3.8, 0, 1);
        tmp.copy(cLush).lerp(cRock, rockMix);
      } else {
        const lushMix = THREE.MathUtils.clamp(Math.max(0, h) / 3.6, 0, 1);
        tmp.copy(cGrass).lerp(cLush, lushMix);
      }
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }

    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.terrainGeo.computeVertexNormals();
  }

  /**
   * Bilinear height query in world XZ coordinates.
   */
  getHeightAt(x, z) {
    const half = this.size * 0.5;
    const fx = THREE.MathUtils.clamp((x + half) / this.size, 0, 1) * this.res;
    const fz = THREE.MathUtils.clamp((z + half) / this.size, 0, 1) * this.res;
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const x1 = Math.min(this.res, x0 + 1);
    const z1 = Math.min(this.res, z0 + 1);
    const tx = fx - x0;
    const tz = fz - z0;
    const stride = this.res + 1;

    const h00 = this.heights[z0 * stride + x0];
    const h10 = this.heights[z0 * stride + x1];
    const h01 = this.heights[z1 * stride + x0];
    const h11 = this.heights[z1 * stride + x1];

    const hx0 = h00 + (h10 - h00) * tx;
    const hx1 = h01 + (h11 - h01) * tx;
    return hx0 + (hx1 - hx0) * tz;
  }

  /**
   * Interactive Architect terrain sculpt brush.
   */
  applyBrush(wx, wz, radius = 9, strength = 0.45, brushMode = "raise") {
    const stride = this.res + 1;
    let changed = false;

    for (let iz = 0; iz <= this.res; iz++) {
      const vz = (iz / this.res - 0.5) * this.size;
      for (let ix = 0; ix <= this.res; ix++) {
        const vx = (ix / this.res - 0.5) * this.size;
        const d = Math.hypot(vx - wx, vz - wz);
        if (d > radius) continue;
        const falloff = Math.cos((d / radius) * Math.PI * 0.5);
        const w = falloff * falloff;
        const idx = iz * stride + ix;
        let next = this.heights[idx];

        if (brushMode === "raise") next = Math.min(14, next + strength * w);
        else if (brushMode === "lower") next = Math.max(-4.2, next - strength * w);
        else if (brushMode === "pond") next = THREE.MathUtils.lerp(next, -2.4, Math.min(1, w * 0.45));
        else if (brushMode === "flatten") next = THREE.MathUtils.lerp(next, 0, Math.min(1, w * 0.55));

        if (Math.abs(next - this.heights[idx]) > 1e-4) {
          this.heights[idx] = Number(next.toFixed(3));
          changed = true;
        }
      }
    }

    if (changed) {
      this._syncGeometryFromHeights();
    }
    return changed;
  }

  exportHeightsArray() {
    return Array.from(this.heights);
  }

  syncFromConfig(terrainConfig, pathsConfig) {
    this.waterLevel = terrainConfig?.waterLevel ?? -0.6;
    if (this.waterMesh) this.waterMesh.position.y = this.waterLevel;
    this._initHeights(terrainConfig);
    this._syncGeometryFromHeights();
    this.rebuildPaths(pathsConfig || []);
  }

  rebuildPaths(pathsConfig) {
    while (this.pathGroup.children.length > 0) {
      const ch = this.pathGroup.children.pop();
      safeDisposeObjectTree(ch);
    }
    this.walkWaypoints = [];
    this.walkNodePathId = [];
    this.walkEdges.clear();

    // Central & Realm Hub Plazas
    const hubPlazas = [
      { x: 0, z: 0, r: 12.2, style: "sandstone" },
      { x: 176, z: 12, r: 10.6, style: "wood" },
      { x: -176, z: 12, r: 10.6, style: "brick" },
      { x: 0, z: -176, r: 10.6, style: "pastel_pink" },
    ];
    for (const hub of hubPlazas) {
      if (Math.abs(hub.x) > this.size * 0.45 || Math.abs(hub.z) > this.size * 0.45) continue;
      const pStyle = PATH_STYLES[hub.style] || PATH_STYLES.sandstone;
      const plazaMat = createToonMaterial(pStyle.main);
      const plazaGeo = new THREE.CylinderGeometry(hub.r, hub.r + 0.4, 0.22, 32);
      const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
      plazaMesh.position.set(hub.x, Math.max(0.08, this.getHeightAt(hub.x, hub.z) + 0.08), hub.z);
      plazaMesh.receiveShadow = true;
      this.pathGroup.add(plazaMesh);
    }

    for (const pathDef of pathsConfig || []) {
      const pts = (pathDef.points || []).map(([x, z]) => new THREE.Vector3(x, this.getHeightAt(x, z) + 0.16, z));
      if (pts.length < 2) continue;

      const palette = PATH_STYLES[pathDef.style] || PATH_STYLES.sandstone;
      const pathMat = createToonMaterial(palette.main, {
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      });
      const curbMat = createToonMaterial(palette.curb, {
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      });

      const curve = new THREE.CatmullRomCurve3(pts, Boolean(pathDef.closed), "centripetal", 0.35);
      const samples = Math.max(28, pts.length * 14);
      const halfW = (pathDef.width || 4.2) * 0.5;
      const ribbonGeo = this._buildRibbonGeometry(curve, samples, halfW, 0.04);
      const mesh = new THREE.Mesh(ribbonGeo, pathMat);
      mesh.receiveShadow = true;
      this.pathGroup.add(mesh);

      const borderGeo = this._buildRibbonGeometry(curve, samples, halfW + 0.34, 0.0);
      const borderMesh = new THREE.Mesh(borderGeo, curbMat);
      borderMesh.receiveShadow = true;
      this.pathGroup.add(borderMesh);

      this._extractWalkNodes(curve, Math.max(12, Math.round(curve.getLength() / 4.2)), Boolean(pathDef.closed), pathDef.id || `p-${this.walkWaypoints.length}`);
    }

    if (this.walkWaypoints.length < 4) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.walkWaypoints.push(
          new THREE.Vector3(Math.cos(a) * 16, this.getHeightAt(Math.cos(a) * 16, Math.sin(a) * 16), Math.sin(a) * 16)
        );
        this.walkNodePathId.push("fallback");
      }
      for (let i = 0; i < 8; i++) this._linkNodes(i, (i + 1) % 8);
    }

    // Stitch intersections & adjacent junctions between different paths into 1 connected walk graph!
    this._stitchIntersections(6.8);
  }

  setPathPreview(points = []) {
    while (this.previewGroup.children.length > 0) {
      const ch = this.previewGroup.children.pop();
      ch.geometry?.dispose?.();
      ch.material?.dispose?.();
    }
    if (!points.length) return;

    const pinGeo = new THREE.SphereGeometry(0.45, 10, 10);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const linePts = [];

    for (const [x, z] of points) {
      const y = Math.max(this.waterLevel + 0.25, this.getHeightAt(x, z)) + 0.35;
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(x, y, z);
      this.previewGroup.add(pin);
      linePts.push(new THREE.Vector3(x, y, z));
    }

    if (linePts.length >= 2) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xfacc15 });
      this.previewGroup.add(new THREE.Line(lineGeo, lineMat));
    }
  }

  _buildRibbonGeometry(curve, samples, halfW, yOffset = 0.0) {
    const positions = [];
    const normals = [];
    const indices = [];
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3();
    const right = new THREE.Vector3();

    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const p = curve.getPointAt(u);
      curve.getTangentAt(u, tangent);
      tangent.y = 0;
      if (tangent.lengthSq() < 1e-5) tangent.set(0, 0, 1);
      tangent.normalize();
      right.crossVectors(tangent, up).normalize();

      const lx = p.x - right.x * halfW;
      const lz = p.z - right.z * halfW;
      const rx = p.x + right.x * halfW;
      const rz = p.z + right.z * halfW;
      const ly = Math.max(this.waterLevel + 0.28, this.getHeightAt(lx, lz)) + 0.16 + yOffset;
      const ry = Math.max(this.waterLevel + 0.28, this.getHeightAt(rx, rz)) + 0.16 + yOffset;

      positions.push(lx, ly, lz, rx, ry, rz);
      normals.push(0, 1, 0, 0, 1, 0);

      if (i < samples) {
        const base = i * 2;
        // Counter-clockwise upward (+Y) facing triangles so paths are 100% visible from above!
        indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geo.setIndex(indices);
    return geo;
  }

  _extractWalkNodes(curve, count, closed, pathId = "path") {
    const startIdx = this.walkWaypoints.length;
    for (let i = 0; i < count; i++) {
      const u = closed ? i / count : i / Math.max(1, count - 1);
      const p = curve.getPointAt(u);
      p.y = Math.max(this.waterLevel + 0.25, this.getHeightAt(p.x, p.z));
      this.walkWaypoints.push(p);
      this.walkNodePathId.push(pathId);
    }
    for (let i = 0; i < count; i++) {
      const cur = startIdx + i;
      const next = i + 1 < count ? startIdx + i + 1 : closed ? startIdx : -1;
      if (next >= 0) {
        this._linkNodes(cur, next);
      }
    }
  }

  _stitchIntersections(maxDist = 6.8) {
    const n = this.walkWaypoints.length;
    const maxSq = maxDist * maxDist;
    for (let i = 0; i < n; i++) {
      const pi = this.walkWaypoints[i];
      const pidI = this.walkNodePathId[i];
      for (let j = i + 1; j < n; j++) {
        if (this.walkNodePathId[j] === pidI) continue;
        const pj = this.walkWaypoints[j];
        const dx = pi.x - pj.x;
        const dz = pi.z - pj.z;
        if (dx * dx + dz * dz <= maxSq) {
          this._linkNodes(i, j);
        }
      }
    }
  }

  _linkNodes(a, b) {
    if (!this.walkEdges.has(a)) this.walkEdges.set(a, []);
    if (!this.walkEdges.has(b)) this.walkEdges.set(b, []);
    const listA = this.walkEdges.get(a);
    const listB = this.walkEdges.get(b);
    if (!listA.includes(b)) listA.push(b);
    if (!listB.includes(a)) listB.push(a);
  }

  findNearestWaypointIndex(x, z) {
    let bestIdx = 0;
    let bestSq = Infinity;
    for (let i = 0; i < this.walkWaypoints.length; i++) {
      const p = this.walkWaypoints[i];
      const dSq = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (dSq < bestSq) {
        bestSq = dSq;
        bestIdx = i;
      }
    }
    return { index: bestIdx, dist: Math.sqrt(bestSq), position: this.walkWaypoints[bestIdx] };
  }

  /**
   * Shortest-path BFS along laid park walkways so NPCs NEVER cut across grass fields.
   */
  findPathRoute(startIdx, goalIdx) {
    const n = this.walkWaypoints.length;
    if (startIdx < 0 || goalIdx < 0 || startIdx >= n || goalIdx >= n) return [];
    if (startIdx === goalIdx) return [goalIdx];

    const visited = new Uint8Array(n);
    const parent = new Int32Array(n).fill(-1);
    const queue = [startIdx];
    visited[startIdx] = 1;
    let head = 0;

    while (head < queue.length) {
      const cur = queue[head++];
      if (cur === goalIdx) break;
      const neighbors = this.walkEdges.get(cur);
      if (!neighbors) continue;
      for (let k = 0; k < neighbors.length; k++) {
        const nxt = neighbors[k];
        if (!visited[nxt]) {
          visited[nxt] = 1;
          parent[nxt] = cur;
          queue.push(nxt);
        }
      }
    }

    if (!visited[goalIdx]) return [];
    const route = [];
    let cur = goalIdx;
    while (cur !== -1 && cur !== startIdx) {
      route.push(cur);
      cur = parent[cur];
    }
    route.reverse();
    return route;
  }

  getWaypointPosition(index) {
    return this.walkWaypoints[index] || this.walkWaypoints[0] || new THREE.Vector3(0, 0, 20);
  }

  getRandomWaypoint() {
    if (!this.walkWaypoints.length) return { index: 0, position: new THREE.Vector3(0, 0, 14) };
    const idx = Math.floor(Math.random() * this.walkWaypoints.length);
    return { index: idx, position: this.walkWaypoints[idx] };
  }

  getNextWaypoint(currentIndex) {
    const neighbors = this.walkEdges.get(currentIndex);
    if (!neighbors || !neighbors.length) return this.getRandomWaypoint();
    const nextIdx = neighbors[Math.floor(Math.random() * neighbors.length)];
    return { index: nextIdx, position: this.walkWaypoints[nextIdx] };
  }

  update(dt, isNight) {
    this._waterTime += dt;
    if (this.waterMesh) {
      this.waterMesh.position.y = this.waterLevel + Math.sin(this._waterTime * 1.4) * 0.03;
      if (this.unifiedBiomeMode) {
        this.waterMat.color.lerp(isNight ? this._waterTintNight : this._waterTintDay, Math.min(1, dt * 3.0));
      } else {
        const dayCol = this.themePalette?.waterColorDay ?? 0x2a86a8;
        const nightCol = this.themePalette?.waterColorNight ?? 0x163e5c;
        this.waterMat.color.setHex(isNight ? nightCol : dayCol);
      }
    }
  }

  dispose() {
    this.terrainGeo?.dispose();
    this.terrainMat?.dispose();
    this.waterMesh?.geometry?.dispose();
    this.waterMat?.dispose();
    while (this.pathGroup.children.length > 0) {
      const ch = this.pathGroup.children.pop();
      ch.geometry?.dispose?.();
      ch.material?.dispose?.();
    }
    this.scene.remove(this.group);
  }
}
