/**
 * Clean-Room 1999 Isometric Projection & Roller Coaster Physics / E·I·N Rating Engine
 */

import {
  ISO_METRICS,
  DIR_DX,
  DIR_DY,
  TRACK_PIECE_CATALOG,
  RIDE_CATALOG,
} from "./RctConstants.js";

const GRAVITY = 9.81;
const STEP_HEIGHT_M = 3.0;
const FRICTION_COEFF = 0.015;

export function rotateTileCoords(tileX, tileY, rotation, mapSize = ISO_METRICS.MAP_SIZE) {
  const n = mapSize - 1;
  const rot = ((rotation % 4) + 4) % 4;
  if (rot === 0) return { rX: tileX, rY: tileY };
  if (rot === 1) return { rX: n - tileY, rY: tileX };
  if (rot === 2) return { rX: n - tileX, rY: n - tileY };
  return { rX: tileY, rY: n - tileX };
}

export function unrotateTileCoords(rX, rY, rotation, mapSize = ISO_METRICS.MAP_SIZE) {
  const n = mapSize - 1;
  const rot = ((rotation % 4) + 4) % 4;
  if (rot === 0) return { tileX: rX, tileY: rY };
  if (rot === 1) return { tileX: rY, tileY: n - rX };
  if (rot === 2) return { tileX: n - rX, tileY: n - rY };
  return { tileX: n - rY, tileY: rX };
}

/**
 * 2:1 dimetric isometric projection (64x32 diamond, 16px per height step).
 * Returns pixel coordinates of the diamond CENTER at elevation heightZ.
 */
export function worldToIso(tileX, tileY, heightZ = 0, rotation = 0, mapSize = ISO_METRICS.MAP_SIZE) {
  const { rX, rY } = rotateTileCoords(tileX, tileY, rotation, mapSize);
  const halfW = ISO_METRICS.TILE_W * 0.5;
  const halfH = ISO_METRICS.TILE_H * 0.5;
  const screenX = (rX - rY) * halfW;
  const screenY = (rX + rY) * halfH - heightZ * ISO_METRICS.HEIGHT_STEP_PX;
  const depthKey = rX + rY;
  return { screenX, screenY, depthKey, rX, rY };
}

/**
 * Exact reverse isometric picker scanning front-to-back in depthKey order
 * so elevated cliff tiles win when their diamond overlaps lower rear tiles.
 */
export function isoToWorld(screenX, screenY, rotation = 0, mapSize = ISO_METRICS.MAP_SIZE, getTileHeightFn = null) {
  const halfW = ISO_METRICS.TILE_W * 0.5;
  const halfH = ISO_METRICS.TILE_H * 0.5;

  if (typeof getTileHeightFn === "function") {
    let bestMatch = null;
    let bestDepth = -Infinity;

    for (let rX = 0; rX < mapSize; rX++) {
      for (let rY = 0; rY < mapSize; rY++) {
        const depth = rX + rY;
        const { tileX, tileY } = unrotateTileCoords(rX, rY, rotation, mapSize);
        const h = getTileHeightFn(tileX, tileY);
        const cx = (rX - rY) * halfW;
        const cy = (rX + rY) * halfH - h * ISO_METRICS.HEIGHT_STEP_PX;
        const dx = Math.abs(screenX - cx) / halfW;
        const dy = Math.abs(screenY - cy) / halfH;
        const dist = dx + dy;
        if (dist < 0.995 && (depth > bestDepth || (depth === bestDepth && dist < 0.5))) {
          bestDepth = depth;
          bestMatch = { tileX, tileY, rX, rY, h };
        }
      }
    }
    if (bestMatch) return bestMatch;
  }

  // Analytical flat-plane fallback (z = 0)
  const rXFloat = (screenX / halfW + screenY / halfH) * 0.5;
  const rYFloat = (screenY / halfH - screenX / halfW) * 0.5;
  const rX = Math.max(0, Math.min(mapSize - 1, Math.round(rXFloat)));
  const rY = Math.max(0, Math.min(mapSize - 1, Math.round(rYFloat)));
  const { tileX, tileY } = unrotateTileCoords(rX, rY, rotation, mapSize);
  return { tileX, tileY, rX, rY, h: 0 };
}

export class CoasterTrack {
  constructor({
    rideCatalogId = "wooden_coaster",
    originX = 10,
    originY = 10,
    originZ = 2,
    facing = 0,
    mode = "circuit",
    name = null,
    colorPrimary = null,
    colorTrack = null,
  } = {}) {
    const def = RIDE_CATALOG[rideCatalogId] || RIDE_CATALOG.wooden_coaster;
    this.rideCatalogId = def.id;
    this.origin = { x: originX, y: originY, z: originZ, dir: ((facing % 4) + 4) % 4 };
    this.mode = mode; // "circuit" | "shuttle"
    this.name = name || def.name;
    this.colorPrimary = colorPrimary || def.colorPrimary;
    this.colorTrack = colorTrack || def.colorTrack;
    this.nodes = [];
    this.cursor = { ...this.origin };
    this.trains = [];
    this.totalLengthM = 0;
    this.lastStats = null;
    this.onScreamTrigger = null;
  }

  static fromBlueprint(blueprint, originX, originY, originZ, facing = 0) {
    const track = new CoasterTrack({
      rideCatalogId: blueprint.rideCatalogId,
      originX,
      originY,
      originZ,
      facing,
      mode: "circuit",
      name: blueprint.name,
    });
    for (const pieceId of blueprint.pieces) {
      const res = track.appendPiece(pieceId);
      if (!res.ok) {
        throw new Error(`Blueprint build failed at ${pieceId}: ${res.reason}`);
      }
    }
    return track;
  }

  isClosed() {
    if (this.nodes.length < 4) return false;
    return (
      this.cursor.x === this.origin.x &&
      this.cursor.y === this.origin.y &&
      this.cursor.z === this.origin.z &&
      this.cursor.dir === this.origin.dir
    );
  }

  _hasCollisionAt(x, y, z, allowClosingAtOrigin = false) {
    if (
      allowClosingAtOrigin &&
      x === this.origin.x &&
      y === this.origin.y &&
      Math.abs(z - this.origin.z) === 0
    ) {
      return false;
    }
    for (const n of this.nodes) {
      if (n.x === x && n.y === y && Math.abs(n.z - z) < 2) {
        return true;
      }
    }
    return false;
  }

  appendPiece(pieceId, options = {}) {
    const piece = TRACK_PIECE_CATALOG[pieceId];
    if (!piece) {
      return { ok: false, reason: `알 수 없는 트랙 조각: ${pieceId}` };
    }
    const def = RIDE_CATALOG[this.rideCatalogId] || RIDE_CATALOG.wooden_coaster;
    if (piece.isLoop && !def.allowLoop) {
      return { ok: false, reason: `${def.name}는 수직 루프를 지원하지 않습니다` };
    }
    if (this.isClosed()) {
      return { ok: false, reason: "이미 승강장 폐곡선이 완성된 트랙입니다" };
    }

    const { x, y, z, dir } = this.cursor;
    const minBound = 1;
    const maxBound = ISO_METRICS.MAP_SIZE - 2;
    if (x < minBound || x > maxBound || y < minBound || y > maxBound) {
      return { ok: false, reason: "맵 경계를 벗어날 수 없습니다" };
    }

    const nextDir = (dir + piece.dDir) % 4;
    const nextX = x + DIR_DX[nextDir];
    const nextY = y + DIR_DY[nextDir];
    const nextZ = z + piece.dz;

    if (nextZ < ISO_METRICS.MIN_HEIGHT || nextZ > ISO_METRICS.MAX_HEIGHT) {
      return { ok: false, reason: `허용 높이(${ISO_METRICS.MIN_HEIGHT}~${ISO_METRICS.MAX_HEIGHT})를 벗어났습니다` };
    }
    if (nextX < minBound || nextX > maxBound || nextY < minBound || nextY > maxBound) {
      return { ok: false, reason: "다음 트랙이 맵 경계를 벗어납니다" };
    }
    if (!options.skipCollision && this.nodes.length > 0 && this._hasCollisionAt(x, y, z, false)) {
      return { ok: false, reason: "기존 트랙과 높이가 겹쳐 충돌합니다" };
    }

    const startDist = this.totalLengthM;
    const endDist = startDist + piece.lengthM;
    const node = {
      index: this.nodes.length,
      pieceId: piece.id,
      piece,
      x,
      y,
      z,
      dir,
      nextX,
      nextY,
      nextZ,
      nextDir,
      startDist,
      endDist,
    };

    this.nodes.push(node);
    this.cursor = { x: nextX, y: nextY, z: nextZ, dir: nextDir };
    this.totalLengthM = endDist;
    this.lastStats = null;
    return { ok: true, node };
  }

  removeLastPiece() {
    if (this.nodes.length === 0) return false;
    const popped = this.nodes.pop();
    this.cursor = { x: popped.x, y: popped.y, z: popped.z, dir: popped.dir };
    this.totalLengthM = popped.startDist;
    this.lastStats = null;
    return true;
  }

  /**
   * Shortest valid path back to station start (origin.x, origin.y, origin.z, origin.dir)
   * using safe return pieces (flat, turns, gentle slopes, chain lift).
   */
  autoCloseToStation() {
    if (this.nodes.length === 0) {
      return { ok: false, addedCount: 0, reason: "승강장을 먼저 배치해야 자동 연결할 수 있습니다" };
    }
    if (this.isClosed()) {
      return { ok: true, addedCount: 0, reason: "이미 폐곡선으로 연결되어 있습니다" };
    }

    const goalKey = `${this.origin.x},${this.origin.y},${this.origin.z},${this.origin.dir}`;
    const candidatePieces = ["flat", "turn_right", "turn_left", "slope_down_gentle", "chain_up_gentle"];
    const maxBound = ISO_METRICS.MAP_SIZE - 2;

    // Key existing nodes for fast collision avoidance
    const occupied = new Map();
    for (const n of this.nodes) {
      const k = `${n.x},${n.y}`;
      if (!occupied.has(k)) occupied.set(k, []);
      occupied.get(k).push(n.z);
    }

    const isBlocked = (x, y, z) => {
      const zs = occupied.get(`${x},${y}`);
      if (!zs) return false;
      for (const ez of zs) {
        if (Math.abs(ez - z) < 2) return true;
      }
      return false;
    };

    // Priority A* search using Manhattan + height heuristic
    const startKey = `${this.cursor.x},${this.cursor.y},${this.cursor.z},${this.cursor.dir}`;
    const queue = [
      {
        x: this.cursor.x,
        y: this.cursor.y,
        z: this.cursor.z,
        dir: this.cursor.dir,
        g: 0,
        f: Math.abs(this.cursor.x - this.origin.x) + Math.abs(this.cursor.y - this.origin.y) + Math.abs(this.cursor.z - this.origin.z) * 2,
        path: [],
      },
    ];
    const visited = new Map([[startKey, 0]]);
    let expansions = 0;

    while (queue.length > 0 && expansions < 6000) {
      // Pop lowest f-score
      let bestIdx = 0;
      for (let i = 1; i < queue.length; i++) {
        if (queue[i].f < queue[bestIdx].f) bestIdx = i;
      }
      const cur = queue.splice(bestIdx, 1)[0];
      expansions++;

      const curKey = `${cur.x},${cur.y},${cur.z},${cur.dir}`;
      if (curKey === goalKey && cur.path.length > 0) {
        for (const pId of cur.path) {
          const res = this.appendPiece(pId);
          if (!res.ok) {
            return { ok: false, addedCount: 0, reason: res.reason };
          }
        }
        return { ok: true, addedCount: cur.path.length, reason: `트랙 ${cur.path.length}조각 자동 연결 완료` };
      }

      if (cur.path.length >= 44) continue;
      if (isBlocked(cur.x, cur.y, cur.z)) continue;

      for (const pId of candidatePieces) {
        const p = TRACK_PIECE_CATALOG[pId];
        const nextDir = (cur.dir + p.dDir) % 4;
        const nextX = cur.x + DIR_DX[nextDir];
        const nextY = cur.y + DIR_DY[nextDir];
        const nextZ = cur.z + p.dz;

        if (nextX < 1 || nextX > maxBound || nextY < 1 || nextY > maxBound) continue;
        if (nextZ < ISO_METRICS.MIN_HEIGHT || nextZ > ISO_METRICS.MAX_HEIGHT) continue;

        const nextKey = `${nextX},${nextY},${nextZ},${nextDir}`;
        const nextG = cur.g + 1 + (p.dDir !== 0 ? 0.25 : 0);
        if (visited.has(nextKey) && visited.get(nextKey) <= nextG) continue;

        // Avoid stepping onto already-occupied cell unless reaching the exact origin
        if (nextKey !== goalKey && isBlocked(nextX, nextY, nextZ)) continue;

        visited.set(nextKey, nextG);
        const h =
          Math.abs(nextX - this.origin.x) +
          Math.abs(nextY - this.origin.y) +
          Math.abs(nextZ - this.origin.z) * 2;
        queue.push({
          x: nextX,
          y: nextY,
          z: nextZ,
          dir: nextDir,
          g: nextG,
          f: nextG + h,
          path: [...cur.path, pId],
        });
      }
    }

    return { ok: false, addedCount: 0, reason: "현재 위치에서 승강장까지 충돌 없는 연결 경로를 찾지 못했습니다" };
  }

  validateAndComputeStats({ nearbySceneryCount = 0 } = {}) {
    const hasStation = this.nodes.some((n) => n.piece.isStation);
    if (!hasStation) {
      return { valid: false, reason: "승강장 트랙이 최소 1개 이상 필요합니다", stats: null };
    }
    if (this.mode !== "shuttle" && !this.isClosed()) {
      return { valid: false, reason: "트랙이 승강장으로 연결되지 않았습니다 (폐곡선 미완성)", stats: null };
    }
    if (this.nodes.length < 4) {
      return { valid: false, reason: "트랙이 너무 짧습니다 (최소 4조각 이상 필요)", stats: null };
    }

    const def = RIDE_CATALOG[this.rideCatalogId] || RIDE_CATALOG.wooden_coaster;
    let v = 7.8; // Initial station dispatch speed (m/s)
    let maxSpeed = v;
    let sumSpeed = 0;
    let totalTime = 0;
    let totalLen = 0;
    let maxPosG = 1.0;
    let maxNegG = 1.0;
    let maxLatG = 0.0;
    let inversions = 0;
    let drops = 0;
    let currentDropM = 0;
    let highestDropM = 0;
    let airtimeCount = 0;
    let prevDz = 0;

    for (const node of this.nodes) {
      const p = node.piece;
      const dh = p.dz * STEP_HEIGHT_M;
      totalLen += p.lengthM;

      let ek = 0.5 * v * v;
      const frictionLoss = FRICTION_COEFF * GRAVITY * p.lengthM;

      if (p.hasChain) {
        v = Math.max(v, 5.4);
        ek = 0.5 * v * v;
      } else if (p.isBooster) {
        ek += 130;
        v = Math.sqrt(Math.max(0.25, 2 * ek));
      } else if (p.isBrake) {
        v = Math.min(v, 8.5);
        ek = 0.5 * v * v;
      } else {
        const nextEk = ek - GRAVITY * dh - frictionLoss;
        if (nextEk <= 0.45 && dh > 0) {
          return {
            valid: false,
            reason: "열차가 언덕을 넘지 못하고 멈췄습니다 (체인 리프트 또는 속도 부족)",
            stats: null,
          };
        }
        v = Math.sqrt(Math.max(1.8, 2 * nextEk));
      }

      if (v > maxSpeed) maxSpeed = v;
      sumSpeed += v;
      totalTime += p.lengthM / Math.max(1.0, v);

      if (p.dz < 0) {
        if (prevDz >= 0) drops++;
        currentDropM += Math.abs(dh);
        if (currentDropM > highestDropM) highestDropM = currentDropM;
      } else {
        currentDropM = 0;
      }

      // Vertical G-forces
      let posG = 1.0 + (v * v) / 210;
      let negG = 1.0;
      if (p.isLoop) {
        inversions++;
        posG += 2.35;
      }
      if (prevDz < 0 && p.dz >= 0) {
        // Pull-out at bottom of drop
        posG += 1.45;
      }
      if (p.isAirtime || (prevDz > 0 && p.dz < 0)) {
        airtimeCount++;
        negG = Math.min(0.4, 1.0 - (v * v) / 160);
      }
      if (posG > maxPosG) maxPosG = posG;
      if (negG < maxNegG) maxNegG = negG;

      // Lateral G-forces on corners
      if (p.curveTurn !== 0) {
        const turnRadius = 18.0;
        let latG = (v * v) / (turnRadius * GRAVITY);
        if (p.isBanked) latG *= 0.35;
        if (latG > maxLatG) maxLatG = latG;
      }

      prevDz = p.dz;
    }

    const avgSpeed = sumSpeed / this.nodes.length;
    const maxSpeedKmh = Math.round(maxSpeed * 3.6);
    const avgSpeedKmh = Math.round(avgSpeed * 3.6);

    const intensityRaw =
      1.35 +
      (maxPosG - 1.0) * 0.62 +
      maxLatG * 1.15 +
      Math.max(0, 1.0 - maxNegG) * 0.85 +
      highestDropM * 0.08 +
      inversions * 0.95;

    const nauseaRaw =
      0.85 +
      maxLatG * 1.4 +
      inversions * 0.62 +
      Math.max(0, intensityRaw - 5.5) * 0.35 +
      drops * 0.14;

    let excitementRaw =
      def.baseExcitement +
      Math.min(2.4, maxSpeedKmh / 48) +
      Math.min(1.8, highestDropM * 0.11) +
      Math.min(2.0, inversions * 0.9) +
      Math.min(1.0, airtimeCount * 0.35) +
      Math.min(1.2, nearbySceneryCount * 0.12);

    // Classic RCT1 penalty if Intensity exceeds 10.0
    if (intensityRaw > 10.0) {
      excitementRaw *= 0.72;
    }

    const round2 = (n) => Math.round(n * 100) / 100;
    const stats = {
      excitement: round2(Math.max(0.8, Math.min(11.5, excitementRaw))),
      intensity: round2(Math.max(0.7, Math.min(13.0, intensityRaw))),
      nausea: round2(Math.max(0.4, Math.min(11.0, nauseaRaw))),
      maxSpeedKmh,
      avgSpeedKmh,
      rideTimeSec: Math.round(totalTime),
      trackLengthM: Math.round(totalLen),
      maxPosG: round2(maxPosG),
      maxNegG: round2(maxNegG),
      maxLatG: round2(maxLatG),
      drops,
      highestDropM: Math.round(highestDropM),
      inversions,
    };

    this.lastStats = stats;
    return { valid: true, reason: "정상 운행 검증 완료", stats };
  }

  spawnDefaultTrain(carCount = 3) {
    this.trains = [
      {
        id: "train-1",
        distance: 0,
        speed: 7.5,
        direction: 1,
        carCount,
        state: "station_wait", // "station_wait" | "running"
        waitTimer: 1.5,
        lastNodeIndex: 0,
      },
    ];
  }

  samplePoseAtDistance(distance) {
    if (this.nodes.length === 0 || this.totalLengthM <= 0) {
      return { x: this.origin.x, y: this.origin.y, z: this.origin.z, dir: this.origin.dir, roll: 0, loopAngle: 0, piece: TRACK_PIECE_CATALOG.flat, nodeIndex: 0 };
    }
    let d = ((distance % this.totalLengthM) + this.totalLengthM) % this.totalLengthM;
    let node = this.nodes[this.nodes.length - 1];
    for (let i = 0; i < this.nodes.length; i++) {
      if (d <= this.nodes[i].endDist || i === this.nodes.length - 1) {
        node = this.nodes[i];
        break;
      }
    }
    const span = Math.max(0.01, node.endDist - node.startDist);
    const t = Math.max(0, Math.min(1, (d - node.startDist) / span));

    const ix = node.x + (node.nextX - node.x) * t;
    const iy = node.y + (node.nextY - node.y) * t;
    let iz = node.z + (node.nextZ - node.z) * t;
    let loopAngle = 0;

    if (node.piece.isLoop) {
      loopAngle = t * Math.PI * 2;
      iz += (1 - Math.cos(loopAngle)) * 1.45;
    } else if (node.piece.isAirtime) {
      iz += Math.sin(t * Math.PI) * 1.1;
    }

    const roll = node.piece.isBanked ? node.piece.curveTurn * 0.45 * Math.sin(t * Math.PI) : 0;
    return {
      x: ix,
      y: iy,
      z: iz,
      dir: t > 0.5 ? node.nextDir : node.dir,
      roll,
      loopAngle,
      piece: node.piece,
      nodeIndex: node.index,
    };
  }

  stepTrains(dt, active = true) {
    if (!active || this.nodes.length === 0 || this.totalLengthM <= 0) return;
    if (this.trains.length === 0) this.spawnDefaultTrain(3);

    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    for (const train of this.trains) {
      if (train.state === "station_wait") {
        train.waitTimer -= safeDt;
        if (train.waitTimer <= 0) {
          train.state = "running";
          train.speed = 7.8;
          train.direction = 1;
        }
        continue;
      }

      const pose = this.samplePoseAtDistance(train.distance);
      const p = pose.piece;

      // Energy conservation integration along local slope
      const slopeRatio = (p.dz * STEP_HEIGHT_M) / Math.max(1, p.lengthM);
      const accel = -GRAVITY * slopeRatio * train.direction - FRICTION_COEFF * GRAVITY * Math.sign(train.speed || 1);

      if (p.hasChain && train.direction > 0) {
        train.speed = Math.max(train.speed, 5.4);
      } else if (p.isBooster) {
        train.speed = Math.min(34, train.speed + 26 * safeDt);
      } else if (p.isBrake) {
        train.speed = Math.max(6.5, train.speed - 18 * safeDt);
      } else {
        train.speed += accel * safeDt;
      }

      // Guard against NaN or uphill stall without chain: safe rollback
      if (!Number.isFinite(train.speed)) {
        train.speed = 4.0;
        train.direction = -1;
      }
      if (train.direction > 0 && train.speed <= 0.1 && p.dz > 0 && !p.hasChain) {
        train.direction = -1;
        train.speed = 2.0;
      }
      train.speed = Math.max(1.5, Math.min(38, Math.abs(train.speed)));

      const prevDist = train.distance;
      train.distance += train.speed * train.direction * safeDt;

      // Scream sound trigger on steep drop
      if (pose.nodeIndex !== train.lastNodeIndex) {
        if (p.dz <= -2 || p.isLoop) {
          this.onScreamTrigger?.(this, pose);
        }
        train.lastNodeIndex = pose.nodeIndex;
      }

      // Check circuit wrap back to station
      if (train.direction > 0 && train.distance >= this.totalLengthM) {
        if (this.isClosed()) {
          train.distance = 0;
          train.state = "station_wait";
          train.waitTimer = 2.2;
        } else {
          // Unclosed track during live testing: bounce gently back to station
          train.distance = Math.max(0, prevDist);
          train.direction = -1;
        }
      } else if (train.direction < 0 && train.distance <= 0) {
        train.distance = 0;
        train.direction = 1;
        train.state = "station_wait";
        train.waitTimer = 2.2;
      }
    }
  }
}
