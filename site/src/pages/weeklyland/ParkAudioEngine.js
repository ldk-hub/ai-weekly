/**
 * WeeklyLand Procedural Web Audio Engine
 * Synthesizes zero-download roller coaster wind rush, rail rumble,
 * chain-lift clack, builder placement clicks, and gentle UI chimes.
 */
export class ParkAudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.windGain = null;
    this.windFilter = null;
    this._clackTimer = 0;
  }

  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this._ensureContext();
    } else if (this.windGain && this.ctx) {
      this.windGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
    }
    return this.enabled;
  }

  _ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this._initWindLoop();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _initWindLoop() {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }

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
    gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  playChainClack() {
    if (!this.enabled) return;
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.045);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  updateRideSound(dt, rideSeat) {
    if (!this.enabled || !this.ctx || !this.windGain || !this.windFilter) return;
    const now = this.ctx.currentTime;
    if (!rideSeat) {
      this.windGain.gain.setTargetAtTime(0.0001, now, 0.12);
      return;
    }

    const spd = Math.max(0, rideSeat.speedKmh || 0);
    const windLevel = Math.min(0.14, (spd / 140) * 0.13);
    const cutoff = 220 + Math.min(1800, spd * 11);
    this.windGain.gain.setTargetAtTime(Math.max(0.0005, windLevel), now, 0.08);
    this.windFilter.frequency.setTargetAtTime(cutoff, now, 0.08);

    if (rideSeat.segment === "lift") {
      this._clackTimer += dt;
      if (this._clackTimer >= 0.24) {
        this._clackTimer = 0;
        this.playChainClack();
      }
    }
  }

  dispose() {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
