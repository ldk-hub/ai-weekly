import * as THREE from "three";
import { createToonMaterial, getCartoonGrassTexture } from "./ToonMaterials.js";

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

    this._initHeights(terrainConfig);
    this._buildTerrainMesh();
    this._buildWaterMesh();
    this.rebuildPaths(pathsConfig);
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

    this.terrainMat = createToonMaterial(0xffffff, {
      vertexColors: true,
      map: getCartoonGrassTexture(),
    });

    this.terrainMesh = new THREE.Mesh(this.terrainGeo, this.terrainMat);
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.name = "ParkTerrainMesh";
    this.group.add(this.terrainMesh);

    this._syncGeometryFromHeights();
  }

  _buildWaterMesh() {
    const waterGeo = new THREE.PlaneGeometry(this.size * 0.98, this.size * 0.98, 16, 16);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x2a86a8,
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.82,
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
    const cGrass = new THREE.Color(0x7ad67e);
    const cLush = new THREE.Color(0x55be6e);
    const cRock = new THREE.Color(0xb4a7c7);
    const cPond = new THREE.Color(0x6ad4e6);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const h = this.heights[i] || 0;
      pos.setY(i, h);
      const wx = pos.getX(i);
      const wz = pos.getZ(i);
      const distCenter = Math.hypot(wx, wz);

      if (h < this.waterLevel + 0.12) {
        tmp.copy(cPond);
      } else if (h < 0.25 && distCenter < 26) {
        const plazaMix = THREE.MathUtils.clamp(1 - distCenter / 26, 0, 1);
        tmp.copy(cGrass).lerp(cSand, plazaMix * 0.55);
      } else if (h > 3.6) {
        const rockMix = THREE.MathUtils.clamp((h - 3.6) / 3.8, 0, 1);
        tmp.copy(cLush).lerp(cRock, rockMix);
      } else {
        const lushMix = THREE.MathUtils.clamp(h / 3.6, 0, 1);
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
      ch.geometry?.dispose?.();
      ch.material?.dispose?.();
    }
    this.walkWaypoints = [];
    this.walkEdges.clear();

    const plazaMat = createToonMaterial(PATH_STYLES.sandstone.main);
    const plazaGeo = new THREE.CylinderGeometry(12.2, 12.6, 0.22, 36);
    const plazaMesh = new THREE.Mesh(plazaGeo, plazaMat);
    plazaMesh.position.set(0, Math.max(0.08, this.getHeightAt(0, 0) + 0.08), 0);
    plazaMesh.receiveShadow = true;
    this.pathGroup.add(plazaMesh);

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

      this._extractWalkNodes(curve, Math.max(8, pts.length * 3), Boolean(pathDef.closed));
    }

    if (this.walkWaypoints.length < 4) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        this.walkWaypoints.push(
          new THREE.Vector3(Math.cos(a) * 16, this.getHeightAt(Math.cos(a) * 16, Math.sin(a) * 16), Math.sin(a) * 16)
        );
      }
    }
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

  _extractWalkNodes(curve, count, closed) {
    const startIdx = this.walkWaypoints.length;
    for (let i = 0; i < count; i++) {
      const u = closed ? i / count : i / Math.max(1, count - 1);
      const p = curve.getPointAt(u);
      p.y = Math.max(this.waterLevel + 0.25, this.getHeightAt(p.x, p.z));
      this.walkWaypoints.push(p);
    }
    for (let i = 0; i < count; i++) {
      const cur = startIdx + i;
      const next = i + 1 < count ? startIdx + i + 1 : closed ? startIdx : -1;
      if (next >= 0) {
        this._linkNodes(cur, next);
      }
    }
  }

  _linkNodes(a, b) {
    if (!this.walkEdges.has(a)) this.walkEdges.set(a, []);
    if (!this.walkEdges.has(b)) this.walkEdges.set(b, []);
    this.walkEdges.get(a).push(b);
    this.walkEdges.get(b).push(a);
  }

  getRandomWaypoint() {
    if (!this.walkWaypoints.length) return new THREE.Vector3(0, 0, 14);
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
      this.waterMat.color.setHex(isNight ? 0x163e5c : 0x2a86a8);
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
