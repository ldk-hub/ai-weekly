/**
 * Clean-Room 1999 Spatial Fairground Audio Engine & Procedural Synthesizer
 * Features camera-aware stereo panning/attenuation, 4-channel volume mixer
 * (master, bgm, sfx, ambient), warm 3/4 carousel organ loop, and drop-in
 * audio_manifest.json buffer override support with zero-dependency procedural fallback.
 */

import { worldToIso } from "./RctCoasterEngine.js";

export class RctAudio {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.bgmEnabled = true;
    this.volumes = {
      master: 0.85,
      bgm: 0.72,
      sfx: 0.85,
      ambient: 0.68,
    };

    this._masterGain = null;
    this._bgmGain = null;
    this._sfxGain = null;
    this._ambientBusGain = null;

    this._bgmTimer = null;
    this._bgmStep = 0;
    this._bgmBus = null;
    this._ambientSource = null;
    this._ambientFilter = null;
    this._gestureBound = false;
    this._lastChainTickMs = 0;

    this.manifest = null;
    this._decodedBuffers = new Map();
  }

  _ensureCtx() {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this._masterGain = this.ctx.createGain();
      this._bgmGain = this.ctx.createGain();
      this._sfxGain = this.ctx.createGain();
      this._ambientBusGain = this.ctx.createGain();

      this._bgmGain.connect(this._masterGain);
      this._sfxGain.connect(this._masterGain);
      this._ambientBusGain.connect(this._masterGain);
      this._masterGain.connect(this.ctx.destination);
      this._syncGains();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _syncGains() {
    if (!this.ctx || !this._masterGain) return;
    const now = this.ctx.currentTime;
    this._masterGain.gain.setTargetAtTime(this.volumes.master, now, 0.03);
    this._bgmGain.gain.setTargetAtTime(this.bgmEnabled ? this.volumes.bgm : 0, now, 0.04);
    this._sfxGain.gain.setTargetAtTime(this.sfxEnabled ? this.volumes.sfx : 0, now, 0.03);
    this._ambientBusGain.gain.setTargetAtTime(this.bgmEnabled ? this.volumes.ambient : 0, now, 0.05);
  }

  setChannelVolume(channel, value) {
    if (!(channel in this.volumes)) return;
    this.volumes[channel] = Math.max(0, Math.min(1, Number(value) || 0));
    this._syncGains();
  }

  async loadManifest(url = "sanctuary-assets/audio/audio_manifest.json") {
    if (typeof fetch !== "function") return;
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      this.manifest = await res.json();
      const tracks = this.manifest?.tracks || {};
      const ctx = this._ensureCtx();
      if (!ctx) return;
      for (const [key, spec] of Object.entries(tracks)) {
        if (!spec?.url) continue;
        try {
          const r = await fetch(`${this.manifest.basePath || "sanctuary-assets/audio/"}${spec.url}`);
          if (!r.ok) continue;
          const buf = await r.arrayBuffer();
          const decoded = await ctx.decodeAudioData(buf);
          this._decodedBuffers.set(key, decoded);
        } catch {}
      }
    } catch {}
  }

  _playSampleBuffer(key, pan = 0, volumeMult = 1) {
    const buffer = this._decodedBuffers.get(key);
    const ctx = this._ensureCtx();
    if (!buffer || !ctx || !this._sfxGain) return false;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime((this.manifest?.tracks?.[key]?.volume || 0.7) * volumeMult, ctx.currentTime);
    if (typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, pan)), ctx.currentTime);
      src.connect(g).connect(panner).connect(this._sfxGain);
    } else {
      src.connect(g).connect(this._sfxGain);
    }
    src.start();
    return true;
  }

  startAmbientOnFirstGesture() {
    if (typeof window === "undefined" || this._gestureBound) return;
    this._gestureBound = true;
    const unlock = () => {
      if (this.bgmEnabled && !this._bgmTimer) {
        this._ensureCtx();
        this._startBgmLoop();
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
  }

  toggleSfx() {
    this.sfxEnabled = !this.sfxEnabled;
    this._syncGains();
    if (this.sfxEnabled) this.playClick();
    return this.sfxEnabled;
  }

  toggleOrganBgm() {
    this.bgmEnabled = !this.bgmEnabled;
    this._syncGains();
    if (this.bgmEnabled) {
      this._ensureCtx();
      this._startBgmLoop();
    } else {
      this._stopBgmLoop();
    }
    return this.bgmEnabled;
  }

  _startAmbientBed(ctx) {
    if (this._ambientSource) return;
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const length = Math.floor(sampleRate * 3.0);
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.035 * white) / 1.035;
        data[i] = last * 1.4;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(420, ctx.currentTime);
      filter.Q.setValueAtTime(0.65, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.018, ctx.currentTime);

      src.connect(filter).connect(gain).connect(this._ambientBusGain || ctx.destination);
      src.start();
      this._ambientSource = src;
      this._ambientGain = gain;
      this._ambientFilter = filter;
    } catch {}
  }

  _startBgmLoop() {
    this._stopBgmLoop();
    const ctx = this._ensureCtx();
    if (!ctx) return;

    // Warm lowpass master bus so fairground bells & organ stay soft and relaxing
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1450, ctx.currentTime);
    filter.Q.setValueAtTime(0.45, ctx.currentTime);

    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.68, ctx.currentTime);
    filter.connect(bus).connect(this._bgmGain || ctx.destination);
    this._bgmBus = filter;

    this._startAmbientBed(ctx);

    // Gentle 3/4 nostalgic amusement-park music-box & soft calliope waltz
    const melody = [
      523.25, 659.25, 783.99,  698.46, 659.25, 587.33,
      523.25, 0,      659.25,  783.99, 880.0,  783.99,
      698.46, 587.33, 659.25,  523.25, 0,      392.0,
      440.0,  523.25, 659.25,  587.33, 523.25, 493.88,
      523.25, 659.25, 783.99,  659.25, 587.33, 0,
      587.33, 659.25, 523.25,  440.0,  392.0,  0,
    ];
    const chords = [
      [130.81, 261.63, 329.63],
      [146.83, 293.66, 349.23],
      [130.81, 261.63, 329.63],
      [196.0,  293.66, 392.0],
      [174.61, 261.63, 349.23],
      [196.0,  293.66, 392.0],
      [220.0,  261.63, 329.63],
      [146.83, 246.94, 349.23],
      [130.81, 261.63, 329.63],
      [196.0,  293.66, 392.0],
      [174.61, 261.63, 329.63],
      [130.81, 261.63, 329.63],
    ];

    this._bgmTimer = setInterval(() => {
      if (!this.bgmEnabled) return;
      const ac = this._ensureCtx();
      if (!ac || !this._bgmBus) return;
      const now = ac.currentTime;
      const step = this._bgmStep++;
      const note = melody[step % melody.length];
      const barIdx = Math.floor(step / 3) % chords.length;
      const beatInBar = step % 3;
      const chord = chords[barIdx];

      // 1. Music-box / Carousel bell melody with soft attack & gentle tail
      if (note > 0) {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(note, now);
        gain.gain.setValueAtTime(0.0005, now);
        gain.gain.linearRampToValueAtTime(0.022, now + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0006, now + 0.56);
        osc.connect(gain).connect(this._bgmBus);
        osc.start(now);
        osc.stop(now + 0.58);

        // Soft upper shimmer
        const hOsc = ac.createOscillator();
        const hGain = ac.createGain();
        hOsc.type = "triangle";
        hOsc.frequency.setValueAtTime(note * 2, now);
        hGain.gain.setValueAtTime(0.0004, now);
        hGain.gain.linearRampToValueAtTime(0.0045, now + 0.02);
        hGain.gain.exponentialRampToValueAtTime(0.0004, now + 0.34);
        hOsc.connect(hGain).connect(this._bgmBus);
        hOsc.start(now);
        hOsc.stop(now + 0.36);
      }

      // 2. Soft 3/4 waltz bass & accordion-pad accompaniment
      if (beatInBar === 0) {
        const bOsc = ac.createOscillator();
        const bGain = ac.createGain();
        bOsc.type = "sine";
        bOsc.frequency.setValueAtTime(chord[0], now);
        bGain.gain.setValueAtTime(0.0005, now);
        bGain.gain.linearRampToValueAtTime(0.018, now + 0.04);
        bGain.gain.exponentialRampToValueAtTime(0.0006, now + 0.52);
        bOsc.connect(bGain).connect(this._bgmBus);
        bOsc.start(now);
        bOsc.stop(now + 0.54);
      } else {
        for (const freq of [chord[1], chord[2]]) {
          const pOsc = ac.createOscillator();
          const pGain = ac.createGain();
          pOsc.type = "triangle";
          pOsc.frequency.setValueAtTime(freq, now);
          pGain.gain.setValueAtTime(0.0004, now);
          pGain.gain.linearRampToValueAtTime(0.0085, now + 0.04);
          pGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.32);
          pOsc.connect(pGain).connect(this._bgmBus);
          pOsc.start(now);
          pOsc.stop(now + 0.34);
        }
      }

      // 3. Occasional distant park wind-chime / songbird twinkle
      if (step % 18 === 11) {
        const cOsc = ac.createOscillator();
        const cGain = ac.createGain();
        cOsc.type = "sine";
        cOsc.frequency.setValueAtTime(1567.98, now + 0.08);
        cOsc.frequency.exponentialRampToValueAtTime(1760.0, now + 0.24);
        cGain.gain.setValueAtTime(0.0004, now + 0.08);
        cGain.gain.linearRampToValueAtTime(0.006, now + 0.11);
        cGain.gain.exponentialRampToValueAtTime(0.0004, now + 0.36);
        cOsc.connect(cGain).connect(this._bgmBus);
        cOsc.start(now + 0.08);
        cOsc.stop(now + 0.38);
      }
    }, 380);
  }

  _stopBgmLoop() {
    if (this._bgmTimer) {
      clearInterval(this._bgmTimer);
      this._bgmTimer = null;
    }
    if (this._ambientSource) {
      try {
        this._ambientSource.stop();
        this._ambientSource.disconnect();
      } catch {}
      this._ambientSource = null;
    }
    if (this._bgmBus) {
      try {
        this._bgmBus.disconnect();
      } catch {}
      this._bgmBus = null;
    }
  }

  updateSpatialField({ camX, camY, zoom, rides, rotation, mapSize, weather, nowMs }) {
    if (!this.ctx || !this.bgmEnabled || this.ctx.state !== "running") return;
    const now = this.ctx.currentTime;
    if (this._ambientFilter && this._ambientGain) {
      const rainOn = weather === "rain";
      const targetFreq = rainOn ? 920 : zoom < 0.9 ? 460 : 380;
      const targetAmp = rainOn ? 0.036 : Math.max(0.012, Math.min(0.028, 0.024 / Math.max(0.7, zoom)));
      this._ambientFilter.frequency.setTargetAtTime(targetFreq, now, 0.25);
      this._ambientGain.gain.setTargetAtTime(targetAmp, now, 0.25);
    }

    // Periodic spatial coaster chain-lift click when focused near a climbing train
    if (this.sfxEnabled && rides && nowMs - this._lastChainTickMs > 280) {
      for (const r of rides) {
        if (!r.track || r.status !== "open" || r.broken || !r.track.trains?.[0]) continue;
        const pose = r.track.samplePoseAtDistance(r.track.trains[0].distance);
        if (!pose?.piece?.hasChain) continue;
        const iso = worldToIso(pose.x, pose.y, pose.z, rotation || 0, mapSize || 44);
        const distPx = Math.hypot(iso.screenX - camX, iso.screenY - camY);
        if (distPx < 520 / Math.max(0.6, zoom)) {
          this._lastChainTickMs = nowMs;
          const pan = Math.max(-0.85, Math.min(0.85, (iso.screenX - camX) / 420));
          const atten = Math.max(0.2, 1 - distPx / (540 / Math.max(0.6, zoom)));
          this.playChainLift(pan, 0.015 * atten);
          break;
        }
      }
    }
  }

  _tone(freqStart, freqEnd, duration = 0.1, type = "square", volume = 0.04, pan = 0) {
    if (!this.sfxEnabled) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);
    const dest = this._sfxGain || ctx.destination;
    if (pan !== 0 && typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, pan)), now);
      osc.connect(gain).connect(panner).connect(dest);
    } else {
      osc.connect(gain).connect(dest);
    }
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  playClick() {
    if (this._playSampleBuffer("sfx_click")) return;
    this._tone(920, 620, 0.045, "square", 0.025);
  }

  playPlace(pan = 0) {
    if (this._playSampleBuffer("sfx_place", pan)) return;
    this._tone(240, 420, 0.09, "triangle", 0.05, pan);
  }

  playBulldoze(pan = 0) {
    if (this._playSampleBuffer("sfx_bulldoze", pan)) return;
    this._tone(160, 55, 0.16, "sawtooth", 0.05, pan);
  }

  playCash(pan = 0) {
    if (this._playSampleBuffer("sfx_cash", pan)) return;
    this._tone(1318.5, 1760, 0.09, "sine", 0.035, pan);
    setTimeout(() => this._tone(1760, 2093, 0.11, "sine", 0.03, pan), 65);
  }

  playPop(pan = 0) {
    if (this._playSampleBuffer("sfx_pop", pan)) return;
    this._tone(580, 120, 0.075, "triangle", 0.06, pan);
  }

  playChainLift(pan = 0, vol = 0.014) {
    if (this._playSampleBuffer("sfx_chainlift", pan, 0.6)) return;
    this._tone(320, 140, 0.028, "square", vol, pan);
  }

  playFireworkBurst(pan = 0) {
    if (this._playSampleBuffer("sfx_firework", pan)) return;
    this._tone(680, 1180, 0.14, "sine", 0.022, pan);
    setTimeout(() => {
      const ctx = this._ensureCtx();
      if (!ctx || !this.sfxEnabled) return;
      try {
        const len = Math.floor((ctx.sampleRate || 44100) * 0.28);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate || 44100);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass";
        filt.frequency.setValueAtTime(750, ctx.currentTime);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.055, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.27);
        src.connect(filt).connect(g).connect(this._sfxGain || ctx.destination);
        src.start();
      } catch {}
    }, 110);
  }

  playScream(pan = 0) {
    if (this._playSampleBuffer("sfx_scream", pan)) return;
    this._tone(740, 480, 0.28, "sawtooth", 0.02, pan);
  }

  playBreakdown() {
    this._tone(440, 310, 0.18, "sawtooth", 0.05);
    setTimeout(() => this._tone(310, 220, 0.22, "sawtooth", 0.05), 180);
  }

  playRepair() {
    this._tone(523, 784, 0.1, "triangle", 0.045);
    setTimeout(() => this._tone(784, 1046, 0.14, "triangle", 0.045), 90);
  }

  playSweep() {
    this._tone(340, 210, 0.06, "triangle", 0.02);
  }

  playFootstep() {
    this._tone(185, 115, 0.045, "triangle", 0.016);
  }

  playAward() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this._tone(f, f, 0.18, "triangle", 0.05), idx * 95);
    });
  }

  dispose() {
    this._stopBgmLoop();
    try {
      this.ctx?.close();
    } catch {}
  }
}
