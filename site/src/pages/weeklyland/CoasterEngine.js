import * as THREE from "three";
import { createToonMaterial, addToonOutline, getCarnivalStripeTexture, safeDisposeObjectTree } from "./ToonMaterials.js";

const GRAVITY = 9.81;
const MIN_SPEED = 4.6;
const LIFT_SPEED = 6.2;
const STATION_SPEED = 5.2;
const BRAKE_TARGET = 7.4;
const TRACK_GAUGE = 0.72;

const SEG_COLORS = {
  station: 0xf4ede0,
  lift: 0xf59e0b,
  boost: 0x38bdf8,
  brake: 0xef4444,
  normal: null,
};

/**
 * Pure mathematical sampler & physics simulator (testable in Node without WebGL).
 * Builds Bishop (Parallel-Transport) banked frames + energy-conserving velocity & EFN ratings.
 */
export function buildCoasterSamples(coasterDef, sampleCount = 260) {
  const nodes = coasterDef?.nodes || [];
  if (nodes.length < 3) return null;

  const closed = coasterDef.closed !== false;
  const pts = nodes.map((n) => new THREE.Vector3(Number(n.x), Math.max(1.4, Number(n.y)), Number(n.z)));
  const curve = new THREE.CatmullRomCurve3(pts, closed, "centripetal", 0.5);
  const totalLength = Math.max(10, curve.getLength());

  const frames = [];
  const prevTangent = new THREE.Vector3();
  const curTangent = new THREE.Vector3();
  const baseUp = new THREE.Vector3(0, 1, 0);
  const curUp = new THREE.Vector3(0, 1, 0);
  const axis = new THREE.Vector3();
  const right = new THREE.Vector3();
  const bankedUp = new THREE.Vector3();

  for (let i = 0; i < sampleCount; i++) {
    const u = i / sampleCount;
    const pos = curve.getPointAt(u);
    curve.getTangentAt(u, curTangent).normalize();

    if (i === 0) {
      // Seed initial up perpendicular to tangent
      right.crossVectors(curTangent, baseUp);
      if (right.lengthSq() < 1e-5) right.set(1, 0, 0);
      right.normalize();
      curUp.crossVectors(right, curTangent).normalize();
    } else {
      axis.crossVectors(prevTangent, curTangent);
      const sinA = axis.length();
      if (sinA > 1e-5) {
        axis.normalize();
        const dot = THREE.MathUtils.clamp(prevTangent.dot(curTangent), -1, 1);
        const angle = Math.acos(dot);
        curUp.applyAxisAngle(axis, angle).normalize();
      }
      // Gently align toward world up on non-inverted segments to avoid drift
      if (curUp.y > 0.2) {
        curUp.lerp(baseUp, 0.08).normalize();
      }
      right.crossVectors(curTangent, curUp).normalize();
      curUp.crossVectors(right, curTangent).normalize();
    }
    prevTangent.copy(curTangent);

    const nodeFloat = u * nodes.length;
    const nIdx = Math.floor(nodeFloat) % nodes.length;
    const nextIdx = (nIdx + 1) % nodes.length;
    const frac = nodeFloat - Math.floor(nodeFloat);
    const smoothFrac = frac * frac * (3 - 2 * frac);

    const bankDeg = THREE.MathUtils.lerp(
      Number(nodes[nIdx].bankDeg || 0),
      Number(nodes[nextIdx].bankDeg || 0),
      smoothFrac
    );
    const bankRad = THREE.MathUtils.degToRad(bankDeg);
    bankedUp.copy(curUp).applyAxisAngle(curTangent, bankRad).normalize();
    right.crossVectors(curTangent, bankedUp).normalize();

    frames.push({
      u,
      s: u * totalLength,
      pos,
      tangent: curTangent.clone(),
      up: bankedUp.clone(),
      right: right.clone(),
      bankDeg,
      segment: nodes[nIdx].segment || "normal",
    });
  }

  const physics = simulateCoasterPhysics(frames, totalLength);
  return { curve, totalLength, frames, physics };
}

export function simulateCoasterPhysics(frames, totalLength) {
  const n = frames.length;
  const ds = totalLength / n;
  const speeds = new Float32Array(n);
  const vertGs = new Float32Array(n);
  const latGs = new Float32Array(n);

  let v = STATION_SPEED;
  let maxSpeed = 0;
  let maxHeight = 0;
  let maxVertG = 1;
  let maxLatG = 0;
  let airtimeSamples = 0;
  let inversionSamples = 0;
  let speedSum = 0;

  // 2 passes so closed loop settles into steady-state velocity
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const cur = frames[i];
      const next = frames[(i + 1) % n];
      const dy = next.pos.y - cur.pos.y;
      const seg = cur.segment;

      if (seg === "station") {
        v = THREE.MathUtils.lerp(v, STATION_SPEED, 0.35);
      } else if (seg === "lift") {
        v = Math.max(LIFT_SPEED, v * 0.96);
        if (v < LIFT_SPEED + 0.8) v = LIFT_SPEED;
      } else {
        const drag = 0.0024 * v * v * ds;
        const boostAccel = seg === "boost" ? 13.5 : 0;
        let vSq = v * v - 2 * GRAVITY * dy - 2 * drag + 2 * boostAccel * ds;
        if (seg === "brake" && v > BRAKE_TARGET) {
          vSq -= 2 * 10.5 * ds;
        }
        v = Math.sqrt(Math.max(MIN_SPEED * MIN_SPEED, Math.min(48 * 48, vSq)));
      }

      if (pass === 1) {
        speeds[i] = v;
        const prev = frames[(i - 1 + n) % n];
        const dTan = new THREE.Vector3().subVectors(next.tangent, prev.tangent).divideScalar(2 * ds);
        const centripAccel = dTan.multiplyScalar(v * v * 0.62);
        const totalAccel = centripAccel.add(new THREE.Vector3(0, GRAVITY, 0));

        const gVert = totalAccel.dot(cur.up) / GRAVITY;
        // Banking aligns track normal with centripetal load, reducing felt lateral G
        const bankRelief = Math.min(0.68, Math.abs(cur.bankDeg) / 85);
        const gLat = Math.abs(totalAccel.dot(cur.right) / GRAVITY) * (1 - bankRelief);

        vertGs[i] = THREE.MathUtils.clamp(gVert, -1.6, 5.2);
        latGs[i] = THREE.MathUtils.clamp(gLat, 0, 3.8);

        if (v > maxSpeed) maxSpeed = v;
        if (cur.pos.y > maxHeight) maxHeight = cur.pos.y;
        if (vertGs[i] > maxVertG) maxVertG = vertGs[i];
        if (latGs[i] > maxLatG) maxLatG = latGs[i];
        if (vertGs[i] < 0.25 && cur.segment === "normal") airtimeSamples++;
        if (cur.up.y < -0.35) inversionSamples++;
        speedSum += v;
      }
    }
  }

  const avgSpeedKmh = (speedSum / n) * 3.6;
  const maxSpeedKmh = maxSpeed * 3.6;
  const airtimeSec = (airtimeSamples / n) * (totalLength / Math.max(6, speedSum / n));
  const inversions = Math.round(inversionSamples / Math.max(8, n * 0.05));

  const excitement = THREE.MathUtils.clamp(
    2.6 + (maxSpeedKmh / 135) * 3.1 + (maxHeight / 38) * 1.9 + Math.min(2.0, airtimeSec * 0.65) + Math.min(1.2, inversions * 0.5),
    1.0,
    9.9
  );
  const fear = THREE.MathUtils.clamp(
    1.5 + (maxHeight / 42) * 2.5 + (maxVertG / 5.5) * 2.6 + (maxSpeedKmh / 145) * 1.5,
    1.0,
    9.9
  );
  const nausea = THREE.MathUtils.clamp(
    1.1 + maxLatG * 1.45 + Math.max(0, maxVertG - 4.3) * 0.9 + inversions * 0.45,
    0.8,
    9.9
  );

  let grade = "A-CLASS";
  if (nausea > 6.5) grade = "HIGH NAUSEA";
  else if (excitement >= 7.6 && fear <= 8.2) grade = "S-CLASS";
  else if (excitement < 4.5) grade = "FAMILY";

  return {
    speeds,
    vertGs,
    latGs,
    metrics: {
      lengthM: Math.round(totalLength),
      maxHeightM: Number(maxHeight.toFixed(1)),
      maxSpeedKmh: Math.round(maxSpeedKmh),
      avgSpeedKmh: Math.round(avgSpeedKmh),
      maxVertG: Number(maxVertG.toFixed(1)),
      maxLatG: Number(maxLatG.toFixed(1)),
      airtimeSec: Number(airtimeSec.toFixed(1)),
      inversions,
      excitement: Number(excitement.toFixed(1)),
      fear: Number(fear.toFixed(1)),
      nausea: Number(nausea.toFixed(1)),
      grade,
    },
  };
}

/**
 * Full 3D Procedural Roller Coaster Builder & Multi-Train Physics Simulator.
 */
export class CoasterEngine {
  constructor(scene, terrainEngine) {
    this.scene = scene;
    this.terrain = terrainEngine;
    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_Coasters";
    this.scene.add(this.group);

    this.instances = new Map(); // coasterId -> runtime record
    this.nodeHandleMeshes = [];
    this.architectVisible = false;
    this.selectedCoasterId = null;
    this.selectedNodeIndex = -1;

    this._scratchPos = new THREE.Vector3();
    this._scratchMat = new THREE.Matrix4();
    this._scratchQuat = new THREE.Quaternion();
  }

  syncAll(coastersList) {
    this._clearAll();
    for (const def of coastersList || []) {
      this._buildCoasterInstance(def);
    }
    this.setArchitectMode(this.architectVisible);
  }

  _clearAll() {
    for (const rec of this.instances.values()) {
      this._disposeObjectTree(rec.root);
      this.group.remove(rec.root);
    }
    this.instances.clear();
    this.nodeHandleMeshes = [];
  }

  _disposeObjectTree(root) {
    safeDisposeObjectTree(root);
  }

  _buildCoasterInstance(def) {
    const sampled = buildCoasterSamples(def, 260);
    if (!sampled) return;

    const root = new THREE.Group();
    root.name = `Coaster_${def.id}`;
    this.group.add(root);

    const { frames, totalLength, physics } = sampled;
    const railColor = new THREE.Color(def.trackColor || "#d97757");
    const spineColor = new THREE.Color(def.spineColor || "#f4ede0");
    const supportColor = new THREE.Color(def.supportColor || "#334155");

    // 1. Left/Right steel rails + central spine tube
    const leftPts = [];
    const rightPts = [];
    const spinePts = [];
    for (const f of frames) {
      leftPts.push(f.pos.clone().addScaledVector(f.right, -TRACK_GAUGE * 0.5));
      rightPts.push(f.pos.clone().addScaledVector(f.right, TRACK_GAUGE * 0.5));
      spinePts.push(f.pos.clone().addScaledVector(f.up, -0.34));
    }

    const closed = def.closed !== false;
    const leftCurve = new THREE.CatmullRomCurve3(leftPts, closed);
    const rightCurve = new THREE.CatmullRomCurve3(rightPts, closed);
    const spineCurve = new THREE.CatmullRomCurve3(spinePts, closed);

    const railMat = createToonMaterial(railColor);
    const spineMat = createToonMaterial(spineColor);

    const leftMesh = new THREE.Mesh(new THREE.TubeGeometry(leftCurve, 220, 0.095, 7, closed), railMat);
    const rightMesh = new THREE.Mesh(new THREE.TubeGeometry(rightCurve, 220, 0.095, 7, closed), railMat);
    const spineMesh = new THREE.Mesh(new THREE.TubeGeometry(spineCurve, 200, 0.15, 8, closed), spineMat);
    leftMesh.castShadow = true;
    rightMesh.castShadow = true;
    spineMesh.castShadow = true;
    root.add(leftMesh, rightMesh, spineMesh);

    // 2. Instanced cross-ties + segment highlight strips (Lift/Boost/Brake)
    const tieGeo = new THREE.BoxGeometry(TRACK_GAUGE + 0.18, 0.08, 0.14);
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.35, roughness: 0.45 });
    const tieStep = 2;
    const tieCount = Math.floor(frames.length / tieStep);
    const tieInst = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
    tieInst.castShadow = true;

    const dummy = new THREE.Object3D();
    const basisMat = new THREE.Matrix4();
    const xAxis = new THREE.Vector3();
    const tieColor = new THREE.Color();
    for (let t = 0; t < tieCount; t++) {
      const f = frames[t * tieStep];
      dummy.position.copy(f.pos).addScaledVector(f.up, -0.14);
      xAxis.crossVectors(f.up, f.tangent).normalize();
      basisMat.makeBasis(xAxis, f.up, f.tangent);
      dummy.quaternion.setFromRotationMatrix(basisMat);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      tieInst.setMatrixAt(t, dummy.matrix);

      const segHex = SEG_COLORS[f.segment];
      tieColor.set(segHex ?? railColor);
      tieInst.setColorAt(t, tieColor);
    }
    tieInst.instanceMatrix.needsUpdate = true;
    if (tieInst.instanceColor) tieInst.instanceColor.needsUpdate = true;
    root.add(tieInst);

    // 3. Ground-anchored steel support columns (single & A-frame V-truss for tall tracks)
    const supportStep = 6;
    const supportIndices = [];
    for (let i = 0; i < frames.length; i += supportStep) {
      const f = frames[i];
      const groundY = this.terrain ? this.terrain.getHeightAt(f.pos.x, f.pos.z) : 0;
      if (f.pos.y - groundY > 1.0) supportIndices.push({ f, groundY });
    }

    if (supportIndices.length > 0) {
      const colGeo = new THREE.CylinderGeometry(0.18, 0.25, 1, 8);
      const colMat = createToonMaterial(supportColor);
      const footGeo = new THREE.CylinderGeometry(0.55, 0.72, 1.4, 8);
      const footMat = createToonMaterial(0xcbd5e1);
      const bracketGeo = new THREE.BoxGeometry(0.95, 0.24, 0.42);
      const bracketMat = createToonMaterial(railColor);

      const tallCount = supportIndices.filter(({ f, groundY }) => f.pos.y - groundY > 9.5).length;
      const totalCols = supportIndices.length + tallCount;
      const colInst = new THREE.InstancedMesh(colGeo, colMat, totalCols);
      colInst.castShadow = true;
      colInst.receiveShadow = true;

      const footInst = new THREE.InstancedMesh(footGeo, footMat, totalCols);
      footInst.receiveShadow = true;

      const bracketInst = new THREE.InstancedMesh(bracketGeo, bracketMat, supportIndices.length);

      let colIdx = 0;
      const upVec = new THREE.Vector3(0, 1, 0);
      const dirVec = new THREE.Vector3();
      const quat = new THREE.Quaternion();

      supportIndices.forEach(({ f, groundY }, idx) => {
        const topPos = new THREE.Vector3(f.pos.x, f.pos.y - 0.34, f.pos.z);
        const hSpan = topPos.y - groundY;

        // Track underside mounting collar bracket
        dummy.position.copy(topPos);
        xAxis.crossVectors(f.up, f.tangent).normalize();
        basisMat.makeBasis(xAxis, f.up, f.tangent);
        dummy.quaternion.setFromRotationMatrix(basisMat);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        bracketInst.setMatrixAt(idx, dummy.matrix);

        if (hSpan > 9.5) {
          // Tall A-Frame V-leg steel support anchored deep (-2.2m) into ground
          const spread = Math.min(3.4, hSpan * 0.14);
          for (const side of [-1, 1]) {
            const bx = topPos.x + f.right.x * spread * side;
            const bz = topPos.z + f.right.z * spread * side;
            const bgY = (this.terrain ? this.terrain.getHeightAt(bx, bz) : groundY) - 2.2;
            const botPos = new THREE.Vector3(bx, bgY, bz);
            dirVec.subVectors(topPos, botPos);
            const len = dirVec.length();
            quat.setFromUnitVectors(upVec, dirVec.clone().normalize());

            dummy.position.addVectors(topPos, botPos).multiplyScalar(0.5);
            dummy.quaternion.copy(quat);
            dummy.scale.set(1, len, 1);
            dummy.updateMatrix();
            colInst.setMatrixAt(colIdx, dummy.matrix);

            dummy.position.set(bx, bgY + 2.2, bz);
            dummy.quaternion.identity();
            dummy.scale.set(1, 1, 1);
            dummy.updateMatrix();
            footInst.setMatrixAt(colIdx, dummy.matrix);
            colIdx++;
          }
        } else {
          // Vertical column anchored -2.2m underground so slope never floats
          const anchorY = groundY - 2.2;
          const h = Math.max(0.8, topPos.y - anchorY);
          dummy.position.set(topPos.x, anchorY + h * 0.5, topPos.z);
          dummy.quaternion.identity();
          dummy.scale.set(1, h, 1);
          dummy.updateMatrix();
          colInst.setMatrixAt(colIdx, dummy.matrix);

          dummy.position.set(topPos.x, groundY, topPos.z);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          footInst.setMatrixAt(colIdx, dummy.matrix);
          colIdx++;
        }
      });

      colInst.instanceMatrix.needsUpdate = true;
      footInst.instanceMatrix.needsUpdate = true;
      bracketInst.instanceMatrix.needsUpdate = true;
      root.add(colInst, footInst, bracketInst);
    }

    // 4. Boarding Station Platform at Node 0
    const stFrame = frames[0];
    const stationGroup = this._buildStationMesh(stFrame, railColor);
    root.add(stationGroup);

    // 5. Architect Spline Node Handles (visible only in Architect Mode)
    const handleGroup = new THREE.Group();
    const handles = [];
    const handleGeo = new THREE.SphereGeometry(0.65, 14, 14);
    (def.nodes || []).forEach((node, idx) => {
      const isSelected = def.id === this.selectedCoasterId && idx === this.selectedNodeIndex;
      const mat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xfacc15 : SEG_COLORS[node.segment] || 0x38bdf8,
        emissive: isSelected ? 0xf59e0b : 0x0ea5e9,
        emissiveIntensity: isSelected ? 0.85 : 0.35,
        roughness: 0.25,
      });
      const sphere = new THREE.Mesh(handleGeo.clone(), mat);
      sphere.position.set(node.x, Math.max(1.4, node.y), node.z);
      sphere.userData = { pickKind: "coaster_node", coasterId: def.id, nodeIndex: idx };
      handleGroup.add(sphere);
      handles.push(sphere);
      this.nodeHandleMeshes.push(sphere);
    });
    handleGroup.visible = this.architectVisible;
    root.add(handleGroup);

    // 6. Multi-car animated trains
    const trainCount = Math.max(1, Math.min(3, def.trainCount || 2));
    const carsPerTrain = Math.max(2, Math.min(6, def.carsPerTrain || 4));
    const trains = [];
    for (let t = 0; t < trainCount; t++) {
      const cars = [];
      for (let c = 0; c < carsPerTrain; c++) {
        const carMesh = this._buildCarMesh(c === 0, railColor, spineColor);
        carMesh.userData = { pickKind: "coaster_ride", coasterId: def.id };
        root.add(carMesh);
        cars.push(carMesh);
      }
      trains.push({
        s: (t / trainCount) * totalLength,
        speed: STATION_SPEED,
        vertG: 1.0,
        latG: 0.0,
        segment: "station",
        cars,
      });
    }

    this.instances.set(def.id, {
      def,
      root,
      frames,
      totalLength,
      physics,
      trains,
      handleGroup,
      handles,
      stationPos: stFrame.pos.clone(),
      emissiveLights: stationGroup.userData.nightLights || [],
    });
  }

  _buildStationMesh(stFrame, accentColor) {
    const g = new THREE.Group();
    const groundY = this.terrain ? this.terrain.getHeightAt(stFrame.pos.x, stFrame.pos.z) : 0;
    const deckY = Math.max(groundY + 0.5, stFrame.pos.y - 0.55);
    g.position.set(stFrame.pos.x, deckY, stFrame.pos.z);

    const yaw = Math.atan2(stFrame.tangent.x, stFrame.tangent.z);
    g.rotation.y = yaw;

    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 3.2, 10.2),
      createToonMaterial(0xe6d6bc)
    );
    deck.position.y = -1.4;
    deck.receiveShadow = true;
    addToonOutline(deck, 1.02);
    g.add(deck);

    // Canopy roof & pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.5, roughness: 0.4 });
    const pillarGeo = new THREE.CylinderGeometry(0.14, 0.14, 3.6, 8);
    for (const px of [-2.2, 2.2]) {
      for (const pz of [-3.8, 0, 3.8]) {
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(px, 1.8, pz);
        p.castShadow = true;
        g.add(p);
      }
    }

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.34, 10.2),
      createToonMaterial(0xffffff, { map: getCarnivalStripeTexture("#ff7657", "#fff7eb", 10) })
    );
    roof.position.y = 3.7;
    roof.castShadow = true;
    addToonOutline(roof, 1.03);
    g.add(roof);

    // Night fairy strip under roof
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.4,
    });
    const strip = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 9.6), lightMat);
    strip.position.y = 3.5;
    g.add(strip);
    g.userData.nightLights = [lightMat];
    return g;
  }

  _buildCarMesh(isLead, primaryColor, trimColor) {
    const car = new THREE.Group();
    const bodyMat = createToonMaterial(primaryColor);
    const trimMat = createToonMaterial(trimColor);
    const darkMat = createToonMaterial(0x283142);
    const goldMat = createToonMaterial(0xffd166);

    // Steel chassis undercarriage + 4 rail-gripping bogie wheels aligned to TRACK_GAUGE
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.18, 1.82), darkMat);
    chassis.position.y = 0.14;
    car.add(chassis);

    const wheelGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.12, 10);
    wheelGeo.rotateZ(Math.PI * 0.5);
    for (const wx of [-TRACK_GAUGE * 0.5, TRACK_GAUGE * 0.5]) {
      for (const wz of [-0.58, 0.58]) {
        const wheel = new THREE.Mesh(wheelGeo, darkMat);
        wheel.position.set(wx, 0.08, wz);
        car.add(wheel);
      }
    }

    // Rear steel coupler bar linking train cars
    const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.52, 6), darkMat);
    coupler.rotation.x = Math.PI * 0.5;
    coupler.position.set(0, 0.18, -1.02);
    car.add(coupler);

    // Sculpted side-skirted open-top coaster tub (floor + left/right walls + rear bulkhead)
    const tubFloor = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.22, 1.72), bodyMat);
    tubFloor.position.y = 0.30;
    tubFloor.castShadow = true;
    addToonOutline(tubFloor, 1.045);
    car.add(tubFloor);

    for (const sx of [-0.56, 0.56]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 1.66), bodyMat);
      sideWall.position.set(sx, 0.54, -0.02);
      sideWall.castShadow = true;
      addToonOutline(sideWall, 1.06);
      car.add(sideWall);

      // Gold racing stripe along car flank
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 1.56), goldMat);
      stripe.position.set(sx * 1.02, 0.52, -0.02);
      car.add(stripe);
    }

    // Two sculpted bucket seats with headrests + overhead U-shaped lap restraint bar
    for (const sx of [-0.26, 0.26]) {
      const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.58, 0.14), darkMat);
      backrest.position.set(sx, 0.68, -0.48);
      backrest.rotation.x = -0.14;
      car.add(backrest);

      const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.16), trimMat);
      headrest.position.set(sx, 1.02, -0.54);
      addToonOutline(headrest, 1.07);
      car.add(headrest);
    }

    const lapBar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.96, 8), goldMat);
    lapBar.rotation.z = Math.PI * 0.5;
    lapBar.position.set(0, 0.68, 0.16);
    car.add(lapBar);

    if (isLead) {
      // Sleek aerodynamic Planet-Coaster style streamlined nose fairing + racing spoiler + headlights
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.42, 0.95), bodyMat);
      hood.position.set(0, 0.46, 1.08);
      hood.rotation.x = 0.22;
      hood.castShadow = true;
      addToonOutline(hood, 1.045);
      car.add(hood);

      // Sculpted rounded aerodynamic bullet nose cone (smooth horizontal hemisphere fairing)
      const noseCone = new THREE.Mesh(
        new THREE.SphereGeometry(0.58, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
        bodyMat
      );
      noseCone.rotation.x = Math.PI * 0.5;
      noseCone.scale.set(1.02, 1.15, 0.62);
      noseCone.position.set(0, 0.36, 1.46);
      noseCone.castShadow = true;
      addToonOutline(noseCone, 1.045);
      car.add(noseCone);

      // Racing center hood stripe + dark air intake grille
      const centerStripe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.96), goldMat);
      centerStripe.position.set(0, 0.65, 1.12);
      centerStripe.rotation.x = 0.24;
      car.add(centerStripe);

      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 0.14), darkMat);
      grille.position.set(0, 0.28, 1.80);
      car.add(grille);

      // Tucked aerodynamic front chin spoiler / bumper (flush under rounded nose)
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.10, 0.24), darkMat);
      bumper.position.set(0, 0.18, 1.62);
      car.add(bumper);

      // Raked panoramic acrylic windshield + dark frame
      const shieldFrame = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.40, 0.07), darkMat);
      shieldFrame.position.set(0, 0.77, 0.74);
      shieldFrame.rotation.x = -0.58;
      car.add(shieldFrame);

      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(1.04, 0.32, 0.09),
        new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.85 })
      );
      shield.position.set(0, 0.77, 0.75);
      shield.rotation.x = -0.58;
      car.add(shield);

      // Twin recessed glowing headlights
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      for (const sx of [-0.36, 0.36]) {
        const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 10), darkMat);
        housing.rotation.x = Math.PI * 0.5;
        housing.position.set(sx, 0.42, 1.72);
        car.add(housing);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), lampMat);
        lamp.position.set(sx, 0.42, 1.78);
        car.add(lamp);
      }
    } else {
      const frontLip = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.36, 0.20), trimMat);
      frontLip.position.set(0, 0.50, 0.76);
      addToonOutline(frontLip, 1.05);
      car.add(frontLip);
    }

    return car;
  }

  setArchitectMode(visible) {
    this.architectVisible = visible;
    for (const rec of this.instances.values()) {
      if (rec.handleGroup) rec.handleGroup.visible = visible;
    }
  }

  setSelectedNode(coasterId, nodeIndex) {
    this.selectedCoasterId = coasterId;
    this.selectedNodeIndex = nodeIndex;
    for (const [id, rec] of this.instances.entries()) {
      rec.handles.forEach((mesh, idx) => {
        const active = id === coasterId && idx === nodeIndex;
        const seg = rec.def.nodes[idx]?.segment || "normal";
        mesh.material.color.setHex(active ? 0xfacc15 : SEG_COLORS[seg] || 0x38bdf8);
        mesh.material.emissive.setHex(active ? 0xf59e0b : 0x0ea5e9);
        mesh.material.emissiveIntensity = active ? 1.0 : 0.35;
        mesh.scale.setScalar(active ? 1.35 : 1.0);
      });
    }
  }

  getMetrics(coasterId) {
    return this.instances.get(coasterId)?.physics?.metrics || null;
  }

  getPrimaryCoasterId() {
    return this.instances.keys().next().value || null;
  }

  getStationPosition(coasterId) {
    return this.instances.get(coasterId)?.stationPos || new THREE.Vector3(-34, 2.4, 24);
  }

  /**
   * Sample interpolated track frame at arc distance `s`.
   */
  _sampleAtArc(rec, s) {
    const n = rec.frames.length;
    const wrapped = ((s % rec.totalLength) + rec.totalLength) % rec.totalLength;
    const fIdx = (wrapped / rec.totalLength) * n;
    const i0 = Math.floor(fIdx) % n;
    const i1 = (i0 + 1) % n;
    const alpha = fIdx - Math.floor(fIdx);
    const a = rec.frames[i0];
    const b = rec.frames[i1];

    const pos = new THREE.Vector3().lerpVectors(a.pos, b.pos, alpha);
    const tangent = new THREE.Vector3().lerpVectors(a.tangent, b.tangent, alpha).normalize();
    const up = new THREE.Vector3().lerpVectors(a.up, b.up, alpha).normalize();
    const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const speed = THREE.MathUtils.lerp(rec.physics.speeds[i0], rec.physics.speeds[i1], alpha);
    const vertG = THREE.MathUtils.lerp(rec.physics.vertGs[i0], rec.physics.vertGs[i1], alpha);
    const latG = THREE.MathUtils.lerp(rec.physics.latGs[i0], rec.physics.latGs[i1], alpha);

    return { pos, tangent, up, right, speed, vertG, latG, segment: a.segment };
  }

  /**
   * Returns world transform & live telemetry for a passenger sitting in a coaster car.
   */
  getSeatState(coasterId, trainIndex = 0, carIndex = 0) {
    const rec = this.instances.get(coasterId);
    if (!rec || !rec.trains.length) return null;
    const train = rec.trains[trainIndex % rec.trains.length];
    const carS = train.s - carIndex * 2.25;
    const sample = this._sampleAtArc(rec, carS);
    const seatPos = sample.pos.clone().addScaledVector(sample.up, 1.05);
    return {
      position: seatPos,
      tangent: sample.tangent,
      up: sample.up,
      right: sample.right,
      speedKmh: Math.round(sample.speed * 3.6),
      speedMs: sample.speed,
      altitudeM: Number(sample.pos.y.toFixed(1)),
      vertG: Number(sample.vertG.toFixed(1)),
      latG: Number(sample.latG.toFixed(1)),
      segment: sample.segment,
      coasterName: rec.def.name,
    };
  }

  update(dt, isNight) {
    const stepDt = Math.min(dt, 0.05);
    for (const rec of this.instances.values()) {
      for (const mat of rec.emissiveLights) {
        mat.emissiveIntensity = isNight ? 1.8 : 0.25;
      }

      for (const train of rec.trains) {
        const head = this._sampleAtArc(rec, train.s);
        train.speed = head.speed;
        train.vertG = head.vertG;
        train.latG = head.latG;
        train.segment = head.segment;
        train.s = (train.s + head.speed * stepDt) % rec.totalLength;

        for (let c = 0; c < train.cars.length; c++) {
          const cs = train.s - c * 2.25;
          const samp = this._sampleAtArc(rec, cs);
          const car = train.cars[c];
          car.position.copy(samp.pos);
          // Right-handed SO(3) basis: X = up × tangent, Y = up, Z = +tangent (forward)
          this._scratchPos.crossVectors(samp.up, samp.tangent).normalize();
          this._scratchMat.makeBasis(this._scratchPos, samp.up, samp.tangent);
          car.quaternion.setFromRotationMatrix(this._scratchMat);
        }
      }
    }
  }

  dispose() {
    this._clearAll();
    this.scene.remove(this.group);
  }
}
