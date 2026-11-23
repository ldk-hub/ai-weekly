/**
 * Clean-Room 1999 Fairground Wurlitzer Organ & Park Sound Effects Synthesizer
 * 100% Procedural WebAudio API (Zero copyrighted audio binaries).
 */

export class RctAudio {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.bgmEnabled = false;
    this._bgmTimer = null;
    this._bgmStep = 0;
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

  _startBgmLoop() {
    this._stopBgmLoop();
    // Cheerful 3/4 Fairground Carousel Organ Waltz
    const melody = [
      523.25, 659.25, 783.99, 1046.5, 783.99, 659.25,
      587.33, 698.46, 880.0, 783.99, 659.25, 523.25,
      440.0, 523.25, 659.25, 587.33, 493.88, 392.0,
    ];
    const bass = [261.63, 196.0, 196.0, 220.0, 196.0, 196.0];
    this._bgmTimer = setInterval(() => {
      if (!this.bgmEnabled) return;
      const ctx = this._ensureCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const note = melody[this._bgmStep % melody.length];
      const bassNote = bass[this._bgmStep % bass.length];
      this._bgmStep++;

      // Pipe organ lead
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0.032, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);

      // Fairground waltz bass
      const bOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      bOsc.type = "sine";
      bOsc.frequency.setValueAtTime(bassNote * 0.5, now);
      bGain.gain.setValueAtTime(0.024, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      bOsc.connect(bGain).connect(ctx.destination);
      bOsc.start(now);
      bOsc.stop(now + 0.23);
    }, 260);
  }

  _stopBgmLoop() {
    if (this._bgmTimer) {
      clearInterval(this._bgmTimer);
      this._bgmTimer = null;
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
