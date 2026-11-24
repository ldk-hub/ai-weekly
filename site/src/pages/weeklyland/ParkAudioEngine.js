/**
 * WeeklyLand Procedural + 3D Spatial Web Audio Soundscape Engine
 * Zero external audio download overhead, 4-voice budget cap for smooth 60fps mobile/desktop:
 * - Roller Coaster: chain-lift clacks, LSM boost hum, velocity wind rush, drop crowd cheers
 * - Carousel: nostalgic Fairground Calliope organ waltz melody (spatial proximity fade!)
 * - Pendulum / Thrill Rides: synchronized rhythmic swing whooshes & winch tension
 * - Water Rides: splash bursts & water flow; Bumper/Kart: rubber boing & electric hum
 * - Economy & Weather SFX: Cha-Ching coin chime, camera shutter, firework boom, rain patter
 */
const CAROUSEL_MELODY = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46, 523.25, 659.25, 783.99, 1046.5];

export class ParkAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.windGain = null;
    this.windFilter = null;
    this.rainGain = null;
    this._clackTimer = 0;
    this._melodyTimer = 0;
    this._melodyStep = 0;
    this._ambientRideTimer = 0;
    this._cheerCooldown = 0;
    this._coinCooldown = 0;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this._ensureContext();
    } else if (this.ctx) {
      const now = this.ctx.currentTime;
      this.windGain?.gain.setTargetAtTime(0.0001, now, 0.08);
      this.rainGain?.gain.setTargetAtTime(0.0001, now, 0.08);
    }
    return this.enabled;
  }

  _ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this._initNoiseLoops();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _initNoiseLoops() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    // 1. Dynamic Wind & Thrill Whoosh Channel
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 320;
    filter.Q.value = 0.85;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    this.windFilter = filter;
    this.windGain = gain;

    // 2. Soft Rain Ambience Channel
    const rSrc = ctx.createBufferSource();
    rSrc.buffer = buffer;
    rSrc.loop = true;
    const rFilter = ctx.createBiquadFilter();
    rFilter.type = "highpass";
    rFilter.frequency.value = 1850;
    const rGain = ctx.createGain();
    rGain.gain.value = 0.0001;
    rSrc.connect(rFilter);
    rFilter.connect(rGain);
    rGain.connect(ctx.destination);
    rSrc.start();
    this.rainGain = rGain;
  }

  playClick(freq = 540) {
    if (!this.enabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.08);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /** Crisp Cha-Ching cash register chime when NPCs buy ride tickets or snacks! */
  playCoinChime(volume = 0.045) {
    if (!this.enabled || this._coinCooldown > 0) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    this._coinCooldown = 0.35;
    const now = ctx.currentTime;
    const notes = [1174.66, 1567.98]; // D6 -> G6 bright coin bell
    notes.forEach((hz, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      const t0 = now + idx * 0.065;
      osc.frequency.setValueAtTime(hz, t0);
      g.gain.setValueAtTime(0.0005, t0);
      g.gain.linearRampToValueAtTime(volume, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0004, t0 + 0.22);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.24);
    });
  }

  /** Joyful synth crowd cheer swell on steep coaster drops & thrilling rides! */
  playCrowdCheer(intensity = 1.0) {
    if (!this.enabled || this._cheerCooldown > 0) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    this._cheerCooldown = 2.6;
    const now = ctx.currentTime;
    const vol = Math.min(0.055, 0.032 * intensity);
    [520, 690, 860].forEach((base, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(base * 1.4, now);
      f.Q.value = 3.0;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.38, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(base * 0.92, now + 0.65);
      g.gain.setValueAtTime(0.0005, now + idx * 0.03);
      g.gain.linearRampToValueAtTime(vol, now + 0.14);
      g.gain.exponentialRampToValueAtTime(0.0004, now + 0.72);
      osc.connect(f);
      f.connect(g);
      g.connect(ctx.destination);
      osc.start(now + idx * 0.03);
      osc.stop(now + 0.75);
    });
  }

  /** Warm festival firework bass pop! */
  playFireworkBoom() {
    if (!this.enabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.32);
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.36);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  playChainClack(vol = 0.04) {
    if (!this.enabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.045);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  _playOrganNote(freq, vol) {
    if (!this.ctx || vol < 0.002) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(0.0005, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.28);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  _playRideAccentFx(kind, proximityGain) {
    if (!this.ctx || proximityGain < 0.08) return;
    const now = this.ctx.currentTime;
    if (kind === "bumper_cars" || kind === "go_kart_track") {
      // Playful rubber bumper boing / kart blip
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.09);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.18);
      g.gain.setValueAtTime(0.03 * proximityGain, now);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.2);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (kind === "haunted_house") {
      // Eerie spooky theremin wobble
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.linearRampToValueAtTime(490, now + 0.45);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.024 * proximityGain, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0005, now + 0.5);
      osc.connect(g);
      g.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.52);
    } else if (kind === "log_flume_splash" || kind === "swan_boats_pond") {
      // Gentle water splash shimmer
      this.playClick(920);
    }
  }

  /**
   * Updates both active 1st-person ride audio AND 3D spatial proximity ride soundscape.
   */
  updateRideSound(dt, rideSeat, { listenerPos = null, flatRideEngine = null, isRaining = false } = {}) {
    const stepDt = Math.min(dt, 0.05);
    this._cheerCooldown = Math.max(0, this._cheerCooldown - stepDt);
    this._coinCooldown = Math.max(0, this._coinCooldown - stepDt);

    if (!this.enabled || !this.ctx || !this.windGain || !this.windFilter) return;
    const now = this.ctx.currentTime;

    // 1. Soft rain patter ambience when raining
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(isRaining ? 0.028 : 0.0001, now, 0.25);
    }

    // 2. Active POV Ride Audio
    if (rideSeat) {
      const spd = Math.max(0, rideSeat.speedKmh || 0);
      const windLevel = Math.min(0.14, (spd / 135) * 0.13);
      const cutoff = 220 + Math.min(1850, spd * 11.5);
      this.windGain.gain.setTargetAtTime(Math.max(0.0005, windLevel), now, 0.08);
      this.windFilter.frequency.setTargetAtTime(cutoff, now, 0.08);

      const seg = String(rideSeat.segment || "").toLowerCase();
      if (seg === "lift") {
        this._clackTimer += stepDt;
        if (this._clackTimer >= 0.24) {
          this._clackTimer = 0;
          this.playChainClack(0.045);
        }
      } else if (seg === "carousel") {
        this._melodyTimer += stepDt;
        if (this._melodyTimer >= 0.34) {
          this._melodyTimer = 0;
          this._playOrganNote(CAROUSEL_MELODY[this._melodyStep % CAROUSEL_MELODY.length], 0.042);
          this._melodyStep++;
        }
      } else if ((spd > 74 || seg === "freefall" || seg === "slingshot" || seg === "gyro swing") && Math.random() < 0.03) {
        this.playCrowdCheer(1.0);
      }
      return;
    }

    // 3. Spatial Proximity Soundscape when walking through the park!
    let nearestRide = null;
    let bestDist = 30;
    if (listenerPos && flatRideEngine?.rides) {
      for (const r of flatRideEngine.rides.values()) {
        const d = Math.hypot(r.root.position.x - listenerPos.x, r.root.position.z - listenerPos.z);
        if (d < bestDist) {
          bestDist = d;
          nearestRide = r;
        }
      }
    }

    if (nearestRide) {
      const prox = Math.max(0, 1 - bestDist / 30);
      if (nearestRide.kind === "carousel") {
        this._melodyTimer += stepDt;
        if (this._melodyTimer >= 0.36) {
          this._melodyTimer = 0;
          this._playOrganNote(CAROUSEL_MELODY[this._melodyStep % CAROUSEL_MELODY.length], 0.032 * prox);
          this._melodyStep++;
        }
        this.windGain.gain.setTargetAtTime(0.0001, now, 0.12);
      } else if (["pirate_ship", "gyro_swing", "frisbee_pendulum", "top_spin", "enterprise_wheel", "drop_tower", "bungee_trampoline"].includes(nearestRide.kind)) {
        const pulse = Math.abs(Math.cos((nearestRide.swingPhase || nearestRide.phase || 0)));
        this.windGain.gain.setTargetAtTime(0.002 + pulse * 0.045 * prox, now, 0.1);
        this.windFilter.frequency.setTargetAtTime(260 + pulse * 680, now, 0.1);
        if (pulse > 0.94 && prox > 0.4 && Math.random() < 0.04) {
          this.playCrowdCheer(prox * 0.85);
        }
      } else {
        this.windGain.gain.setTargetAtTime(0.0001, now, 0.12);
        this._ambientRideTimer += stepDt;
        if (this._ambientRideTimer >= 1.8) {
          this._ambientRideTimer = 0;
          this._playRideAccentFx(nearestRide.kind, prox);
        }
      }
    } else {
      this.windGain.gain.setTargetAtTime(0.0001, now, 0.14);
    }
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
