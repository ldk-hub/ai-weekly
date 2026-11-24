import * as THREE from "three";

/**
 * Unified 4-Mode 3D Park Camera Controller
 * - guest_third: Smooth 3rd-person avatar follow with orbit & zoom
 * - ride_pov: 1st-person coaster/ride seat POV synced to banked track up-vector
 * - ride_chase: 3rd-person dynamic chase camera behind coaster train
 * - drone / architect: Free Planet-Coaster god camera (WASD pan + right-drag orbit/pitch + zoom)
 */
export class ParkCameraRig {
  constructor(domElement, aspect = 16 / 9) {
    this.domElement = domElement;
    this.camera = new THREE.PerspectiveCamera(52, aspect, 0.15, 680);

    this.mode = "guest_third"; // guest_third | drone | architect | ride_pov | ride_chase
    this.azimuth = 0.0;
    this.targetAzimuth = 0.0;
    this.pitch = 0.42;
    this.targetPitch = 0.42;
    this.distance = 16.5;
    this.targetDistance = 16.5;

    this.focus = new THREE.Vector3(0, 1.8, 124);
    this.targetFocus = new THREE.Vector3(0, 1.8, 124);
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._smoothedUp = new THREE.Vector3(0, 1, 0);
    this._lookTarget = new THREE.Vector3();

    this.isOrbitDragging = false;
    this.isPanDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this._touchPointers = new Map();
    this._pinchDist = 0;
    this._touchStartPos = null;
    this._justDragged = false;

    this._bindEvents();
  }

  consumeJustDragged() {
    if (!this._justDragged) return false;
    this._justDragged = false;
    return true;
  }

  setAspect(w, h) {
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setMode(nextMode) {
    this.mode = nextMode;
    if (nextMode === "drone" || nextMode === "architect") {
      this.targetPitch = Math.max(0.45, Math.min(1.22, this.targetPitch));
      this.targetDistance = THREE.MathUtils.clamp(this.targetDistance, 22, 95);
      this.camera.fov = 48;
      this.camera.updateProjectionMatrix();
    } else if (nextMode === "ride_pov") {
      this.camera.fov = 70;
      this.camera.updateProjectionMatrix();
    } else if (nextMode === "ride_chase") {
      this.camera.fov = 58;
      this.camera.updateProjectionMatrix();
    } else {
      this.targetDistance = 15.5;
      this.targetPitch = 0.38;
      this.camera.fov = 52;
      this.camera.updateProjectionMatrix();
    }
  }

  focusOn(pos, dist = 36) {
    this.targetFocus.copy(pos);
    this.targetDistance = THREE.MathUtils.clamp(dist, 12, 110);
  }

  getGroundBasis() {
    this._forward.set(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth)).normalize();
    this._right.set(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth)).normalize();
    return { forward: this._forward, right: this._right };
  }

  update(dt, { playerPos, rideSeat, panInput }) {
    const stepDt = Math.min(dt, 0.05);
    const damp = 1 - Math.exp(-10 * stepDt);

    if (this.mode === "ride_pov" && rideSeat) {
      const eyePos = rideSeat.position.clone().addScaledVector(rideSeat.up, 0.52).addScaledVector(rideSeat.tangent, 0.35);
      this.camera.position.lerp(eyePos, 1 - Math.exp(-26 * stepDt));
      this._smoothedUp.lerp(rideSeat.up, 1 - Math.exp(-14 * stepDt)).normalize();
      this.camera.up.copy(this._smoothedUp);
      this._lookTarget.copy(eyePos).addScaledVector(rideSeat.tangent, 18);
      this.camera.lookAt(this._lookTarget);
      return;
    }

    if (this.mode === "ride_chase" && rideSeat) {
      // Dynamic orbitable 3/4 action cam showing the seated rider's face, pose, and ride motion!
      this.azimuth += (this.targetAzimuth - this.azimuth) * damp;
      this.pitch += (this.targetPitch - this.pitch) * damp;
      const chaseDist = THREE.MathUtils.clamp(this.distance, 3.8, 12.0);
      this.distance += (THREE.MathUtils.clamp(this.targetDistance, 3.8, 12.0) - this.distance) * damp;

      // Default offset is side-front 3/4 view (55 deg) so player clearly sees bent seated knees, lapbar, arms & face!
      const fwd = rideSeat.tangent;
      const up = rideSeat.up || new THREE.Vector3(0, 1, 0);
      const side = new THREE.Vector3().crossVectors(up, fwd).normalize();
      const yawOff = this.azimuth;
      const cY = Math.cos(yawOff);
      const sY = Math.sin(yawOff);
      const camDir = new THREE.Vector3()
        .addScaledVector(fwd, cY * 0.55 - sY * 0.83)
        .addScaledVector(side, sY * 0.55 + cY * 0.83)
        .normalize();

      const desiredPos = rideSeat.position
        .clone()
        .addScaledVector(camDir, chaseDist)
        .addScaledVector(new THREE.Vector3(0, 1, 0), 1.15 + Math.sin(this.pitch) * 1.1);

      this.camera.position.lerp(desiredPos, 1 - Math.exp(-11 * stepDt));
      this.camera.up.set(0, 1, 0);
      this._lookTarget.copy(rideSeat.position).addScaledVector(up, 0.08);
      this.camera.lookAt(this._lookTarget);
      return;
    }

    this.camera.up.set(0, 1, 0);

    if (this.mode === "guest_third" && playerPos) {
      this.targetFocus.set(playerPos.x, playerPos.y + 1.5, playerPos.z);
    } else if ((this.mode === "drone" || this.mode === "architect") && panInput) {
      const moveX = (panInput.right ? 1 : 0) - (panInput.left ? 1 : 0);
      const moveZ = (panInput.forward ? 1 : 0) - (panInput.backward ? 1 : 0);
      if (moveX !== 0 || moveZ !== 0) {
        const { forward, right } = this.getGroundBasis();
        const panSpeed = (panInput.sprint ? 72 : 38) * stepDt;
        this.targetFocus.addScaledVector(forward, moveZ * panSpeed);
        this.targetFocus.addScaledVector(right, moveX * panSpeed);
        this.targetFocus.x = THREE.MathUtils.clamp(this.targetFocus.x, -142, 142);
        this.targetFocus.z = THREE.MathUtils.clamp(this.targetFocus.z, -142, 142);
      }
    }

    this.azimuth += (this.targetAzimuth - this.azimuth) * damp;
    this.pitch += (this.targetPitch - this.pitch) * damp;
    this.distance += (this.targetDistance - this.distance) * damp;
    this.focus.lerp(this.targetFocus, damp);

    const horiz = Math.cos(this.pitch) * this.distance;
    const vert = Math.sin(this.pitch) * this.distance;
    this.camera.position.set(
      this.focus.x + Math.sin(this.azimuth) * horiz,
      Math.max(1.2, this.focus.y + vert),
      this.focus.z + Math.cos(this.azimuth) * horiz
    );
    this.camera.lookAt(this.focus);
  }

  _bindEvents() {
    this._onContext = (ev) => ev.preventDefault();
    this._onPointerDown = (ev) => {
      if (ev.pointerType === "touch") {
        this._touchPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (this._touchPointers.size === 1) {
          this._touchStartPos = { x: ev.clientX, y: ev.clientY };
          this.lastX = ev.clientX;
          this.lastY = ev.clientY;
          this._justDragged = false;
        } else if (this._touchPointers.size === 2) {
          const pts = [...this._touchPointers.values()];
          this._pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          this._justDragged = true;
        }
        return;
      }

      if (ev.button === 2 || (ev.button === 0 && ev.altKey)) {
        this.isOrbitDragging = true;
        this.lastX = ev.clientX;
        this.lastY = ev.clientY;
        this.domElement.setPointerCapture?.(ev.pointerId);
      } else if (ev.button === 1) {
        this.isPanDragging = true;
        this.lastX = ev.clientX;
        this.lastY = ev.clientY;
        this.domElement.setPointerCapture?.(ev.pointerId);
      }
    };
    this._onPointerMove = (ev) => {
      if (ev.pointerType === "touch" && this._touchPointers.has(ev.pointerId)) {
        this._touchPointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (this._touchPointers.size === 1) {
          const dx = ev.clientX - this.lastX;
          const dy = ev.clientY - this.lastY;
          this.lastX = ev.clientX;
          this.lastY = ev.clientY;
          if (this._touchStartPos && Math.hypot(ev.clientX - this._touchStartPos.x, ev.clientY - this._touchStartPos.y) > 8) {
            this._justDragged = true;
          }
          if (this._justDragged && this.mode !== "ride_pov") {
            this.targetAzimuth -= dx * 0.0085;
            this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.0065, 0.14, 1.32);
          }
        } else if (this._touchPointers.size === 2 && this.mode !== "ride_pov") {
          const pts = [...this._touchPointers.values()];
          const nextDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          if (this._pinchDist > 0) {
            const delta = this._pinchDist - nextDist;
            const minD = this.mode === "ride_chase" ? 3.8 : this.mode === "guest_third" ? 6 : 12;
            const maxD = this.mode === "ride_chase" ? 12 : this.mode === "guest_third" ? 56 : 195;
            this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + delta * 0.08, minD, maxD);
          }
          this._pinchDist = nextDist;
          this._justDragged = true;
        }
        return;
      }

      const dx = ev.clientX - this.lastX;
      const dy = ev.clientY - this.lastY;
      this.lastX = ev.clientX;
      this.lastY = ev.clientY;

      if (this.isOrbitDragging) {
        this.targetAzimuth -= dx * 0.007;
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.006, 0.14, 1.32);
      } else if (this.isPanDragging && (this.mode === "drone" || this.mode === "architect")) {
        const { forward, right } = this.getGroundBasis();
        const scale = this.distance * 0.0022;
        this.targetFocus.addScaledVector(right, -dx * scale);
        this.targetFocus.addScaledVector(forward, dy * scale);
      }
    };
    this._onPointerUp = (ev) => {
      if (ev?.pointerType === "touch") {
        this._touchPointers.delete(ev.pointerId);
        if (this._touchPointers.size < 2) this._pinchDist = 0;
        if (this._touchPointers.size === 0) this._touchStartPos = null;
      }
      this.isOrbitDragging = false;
      this.isPanDragging = false;
    };
    this._onWheel = (ev) => {
      if (this.mode === "ride_pov") return;
      ev.preventDefault();
      const minD = this.mode === "ride_chase" ? 3.8 : this.mode === "guest_third" ? 6 : 12;
      const maxD = this.mode === "ride_chase" ? 12 : this.mode === "guest_third" ? 56 : 195;
      this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + ev.deltaY * 0.03, minD, maxD);
    };

    this.domElement.addEventListener("contextmenu", this._onContext);
    this.domElement.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    window.addEventListener("pointercancel", this._onPointerUp);
    this.domElement.addEventListener("wheel", this._onWheel, { passive: false });
  }

  dispose() {
    this.domElement.removeEventListener("contextmenu", this._onContext);
    this.domElement.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    window.removeEventListener("pointercancel", this._onPointerUp);
    this.domElement.removeEventListener("wheel", this._onWheel);
  }
}
