/**
 * Clean-Room 1999 Fairground Wurlitzer Organ & Park Sound Effects Synthesizer
 * 100% Procedural WebAudio API (Zero copyrighted audio binaries).
 */

export class RctAudio {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.bgmEnabled = true;
    this._bgmTimer = null;
    this._bgmStep = 0;
    this._bgmBus = null;
    this._ambientSource = null;
    this._ambientGain = null;
    this._gestureBound = false;
  }

  _ensureCtx() {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
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
    if (this.sfxEnabled) this.playClick();
    return this.sfxEnabled;
  }

  toggleOrganBgm() {
    this.bgmEnabled = !this.bgmEnabled;
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

      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start();
      this._ambientSource = src;
      this._ambientGain = gain;
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
    bus.gain.setValueAtTime(0.65, ctx.currentTime);
    filter.connect(bus).connect(ctx.destination);
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

  _tone(freqStart, freqEnd, duration = 0.1, type = "square", volume = 0.04) {
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
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  playClick() {
    this._tone(920, 620, 0.045, "square", 0.025);
  }

  playPlace() {
    this._tone(240, 420, 0.09, "triangle", 0.05);
  }

  playBulldoze() {
    this._tone(160, 55, 0.16, "sawtooth", 0.05);
  }

  playCash() {
    this._tone(1318.5, 1760, 0.09, "sine", 0.035);
    setTimeout(() => this._tone(1760, 2093, 0.11, "sine", 0.03), 65);
  }

  playPop() {
    this._tone(580, 120, 0.075, "triangle", 0.06);
  }

  playScream() {
    this._tone(740, 480, 0.28, "sawtooth", 0.02);
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
