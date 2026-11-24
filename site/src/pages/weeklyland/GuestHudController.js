import { AVATAR_KEYS, AVATAR_LABELS } from "./CrowdAndAvatarEngine.js";

/**
 * WeeklyLand Guest Mode HUD & Ride Telemetry Controller
 * Manages top warp/ride bar, live Ride POV telemetry strip, camera view switches,
 * atmosphere/audio toggles, and toast notifications.
 */
export class GuestHudController {
  constructor(callbacks) {
    this.cb = callbacks;
    this.toastTimer = null;
    this.avatarIdx = 0;

    this.els = {
      povHud: document.getElementById("wl-pov-hud"),
      povRideName: document.getElementById("wl-pov-ride-name"),
      povSpeed: document.getElementById("wl-pov-speed"),
      povAlt: document.getElementById("wl-pov-alt"),
      povG: document.getElementById("wl-pov-g"),
      povSeg: document.getElementById("wl-pov-seg"),
      btnCamPov: document.getElementById("btn-wl-cam-pov"),
      btnCamChase: document.getElementById("btn-wl-cam-chase"),
      btnLeaveRide: document.getElementById("btn-wl-leave-ride"),
      btnDrone: document.getElementById("btn-wl-drone"),
      btnArchitect: document.getElementById("btn-wl-architect"),
      btnAvatar: document.getElementById("btn-wl-avatar"),
      avatarLabel: document.getElementById("wl-avatar-label"),
      btnAudio: document.getElementById("btn-wl-audio"),
      audioLabel: document.getElementById("wl-audio-label"),
      guestStat: document.getElementById("wl-park-stat"),
      toast: document.getElementById("wl-toast"),
    };

    this._bindEvents();
  }

  _bindEvents() {
    document.querySelectorAll("[data-wl-ride]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.wlKind || "ride";
        const id = btn.dataset.wlRide;
        this.cb.onBoardRide?.(kind, id);
      });
    });

    document.querySelectorAll("[data-wl-pavilion]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.cb.onOpenPavilion?.(btn.dataset.wlPavilion);
      });
    });

    this.els.btnCamPov?.addEventListener("click", () => this.cb.onSetCameraMode?.("ride_pov"));
    this.els.btnCamChase?.addEventListener("click", () => this.cb.onSetCameraMode?.("ride_chase"));
    this.els.btnLeaveRide?.addEventListener("click", () => this.cb.onLeaveRide?.());
    this.els.btnDrone?.addEventListener("click", () => this.cb.onToggleDrone?.());
    this.els.btnArchitect?.addEventListener("click", () => this.cb.onToggleArchitect?.());

    this.els.btnAvatar?.addEventListener("click", () => {
      this.avatarIdx = (this.avatarIdx + 1) % AVATAR_KEYS.length;
      const key = AVATAR_KEYS[this.avatarIdx];
      if (this.els.avatarLabel) this.els.avatarLabel.textContent = AVATAR_LABELS[key] || key;
      this.cb.onChangeAvatar?.(key);
    });

    this.els.btnAudio?.addEventListener("click", () => {
      const enabled = this.cb.onToggleAudio?.();
      if (this.els.audioLabel) this.els.audioLabel.textContent = enabled ? "사운드 켜짐" : "사운드 꺼짐";
      this.els.btnAudio?.classList.toggle("is-active", Boolean(enabled));
    });
  }

  syncMode(mode, cameraMode) {
    const isArch = mode === "architect";
    this.els.btnArchitect?.classList.toggle("is-active", isArch);
    this.els.btnDrone?.classList.toggle("is-active", cameraMode === "drone");
    this.els.btnCamPov?.classList.toggle("is-active", cameraMode === "ride_pov");
    this.els.btnCamChase?.classList.toggle("is-active", cameraMode === "ride_chase");
  }

  updateRideTelemetry(seat) {
    if (!this.els.povHud) return;
    if (!seat) {
      this.els.povHud.hidden = true;
      return;
    }
    this.els.povHud.hidden = false;
    if (this.els.povRideName) this.els.povRideName.textContent = seat.coasterName || "어트랙션";
    if (this.els.povSpeed) this.els.povSpeed.textContent = `${seat.speedKmh}`;
    if (this.els.povAlt) this.els.povAlt.textContent = `${seat.altitudeM}m`;
    if (this.els.povG) this.els.povG.textContent = `${seat.vertG}G`;
    if (this.els.povSeg) this.els.povSeg.textContent = String(seat.segment || "RIDE").toUpperCase();
  }

  updateParkStat(onlineUsers, aiGuests) {
    if (this.els.guestStat) {
      this.els.guestStat.textContent = `방문자 ${onlineUsers} · AI 관람객 ${aiGuests}`;
    }
  }

  showToast(message, durationMs = 2800) {
    if (!this.els.toast) return;
    this.els.toast.textContent = message;
    this.els.toast.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      if (this.els.toast) this.els.toast.hidden = true;
    }, durationMs);
  }
}
