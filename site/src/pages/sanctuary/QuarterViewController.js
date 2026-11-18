import * as THREE from "three";

const DEFAULT_DISTANCE = 24.5;
const DEFAULT_HEIGHT = 17.2;
const PITCH_RATIO = DEFAULT_HEIGHT / DEFAULT_DISTANCE; // ~35.07 deg pitch

/**
 * Ragnarok Online / HD-2D Fixed-Pitch Quarter-View Orbit Controller.
 * Keeps FOV 30° and Pitch (~35.2°) locked while orbiting cameraAzimuth 360° via Right-Drag or Q/E keys.
 */
export class QuarterViewController {
  constructor(domElement, aspect = 16 / 9) {
    this.domElement = domElement;
    this.camera = new THREE.PerspectiveCamera(30, aspect, 0.1, 200);

    this.distance = DEFAULT_DISTANCE;
    this.targetDistance = DEFAULT_DISTANCE;
    this.cameraAzimuth = 0;
    this.targetAzimuth = 0;
    this.targetPos = new THREE.Vector3(0, 0, 2);
    this.smoothedTarget = new THREE.Vector3(0, 0, 2);

    this.isRightDragging = false;
    this.lastPointerX = 0;
    this.keys = { q: false, e: false };

    this._bindEvents();
    this.update(0.016, this.targetPos);
  }

  setAspect(width, height) {
    if (width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  rotateBy(deltaRad) {
    this.targetAzimuth += deltaRad;
  }

  zoomBy(deltaDist) {
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + deltaDist, 12, 48);
  }

  resetView() {
    this.targetAzimuth = 0;
    this.targetDistance = DEFAULT_DISTANCE;
  }

  getAzimuthDegrees() {
    let deg = Math.round(((this.cameraAzimuth * 180) / Math.PI) % 360);
    if (deg < 0) deg += 360;
    return deg;
  }

  /**
   * Project screen-aligned movement vector (right, up/forward) onto world XZ plane.
   */
  getGroundBasis() {
    const az = this.cameraAzimuth;
    // Camera looks from (+sin(az), 0, +cos(az)) toward origin
    const forward = new THREE.Vector3(-Math.sin(az), 0, -Math.cos(az));
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
    return { forward, right };
  }

  update(dt, focusPosition) {
    if (focusPosition) {
      this.targetPos.copy(focusPosition);
    }

    const orbitSpeed = 2.15;
    if (this.keys.q) this.targetAzimuth -= orbitSpeed * dt;
    if (this.keys.e) this.targetAzimuth += orbitSpeed * dt;

    const damp = 1 - Math.exp(-10 * Math.min(dt, 0.05));
    this.cameraAzimuth += (this.targetAzimuth - this.cameraAzimuth) * damp;
    this.distance += (this.targetDistance - this.distance) * damp;
    this.smoothedTarget.lerp(this.targetPos, damp);

    const height = this.distance * PITCH_RATIO;
    const tx = this.smoothedTarget.x;
    const ty = this.smoothedTarget.y;
    const tz = this.smoothedTarget.z;

    this.camera.position.set(
      tx + Math.sin(this.cameraAzimuth) * this.distance,
      ty + height,
      tz + Math.cos(this.cameraAzimuth) * this.distance
    );
    this.camera.lookAt(tx, ty + 0.9, tz);
  }

  _bindEvents() {
    this._onContextMenu = (ev) => ev.preventDefault();
    this._onPointerDown = (ev) => {
      if (ev.button === 2) {
        this.isRightDragging = true;
        this.lastPointerX = ev.clientX;
        this.domElement.setPointerCapture?.(ev.pointerId);
      }
    };
    this._onPointerMove = (ev) => {
      if (!this.isRightDragging) return;
      const dx = ev.clientX - this.lastPointerX;
      this.lastPointerX = ev.clientX;
      this.targetAzimuth -= dx * 0.0085;
    };
    this._onPointerUp = (ev) => {
      if (ev.button === 2 || this.isRightDragging) {
        this.isRightDragging = false;
      }
    };
    this._onWheel = (ev) => {
      ev.preventDefault();
      this.zoomBy(ev.deltaY * 0.012);
    };
    this._onKeyDown = (ev) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (ev.code === "KeyQ") this.keys.q = true;
      if (ev.code === "KeyE") this.keys.e = true;
    };
    this._onKeyUp = (ev) => {
      if (ev.code === "KeyQ") this.keys.q = false;
      if (ev.code === "KeyE") this.keys.e = false;
    };
    this._onBlur = () => {
      this.keys.q = false;
      this.keys.e = false;
      this.isRightDragging = false;
    };

    this.domElement.addEventListener("contextmenu", this._onContextMenu);
    this.domElement.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointermove", this._onPointerMove);
    window.addEventListener("pointerup", this._onPointerUp);
    this.domElement.addEventListener("wheel", this._onWheel, { passive: false });
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("blur", this._onBlur);
  }

  dispose() {
    this.domElement.removeEventListener("contextmenu", this._onContextMenu);
    this.domElement.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointermove", this._onPointerMove);
    window.removeEventListener("pointerup", this._onPointerUp);
    this.domElement.removeEventListener("wheel", this._onWheel);
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("blur", this._onBlur);
  }
}
