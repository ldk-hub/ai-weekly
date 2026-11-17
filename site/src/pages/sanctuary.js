/**
 * NEXUS ARCADIA — AI위클리 3D 플레이어블 에이전트 월드
 * - Playable 4-legged 3D Voxel Claude Character (WASD/Arrows + Click-to-Move + Jump + Emotes)
 * - 3rd-Person Follow / Shoulder / Overview Camera with 360° Orbit Drag & Wheel Zoom
 * - 20 Autonomous Roaming Agent NPCs with State Machine & 3D Speech Bubbles
 * - 4 Original Interactive 3D Landmarks backed by live AI Weekly JSON data
 * - Web Audio API 0KB Synth Arp, SFX & 4-Channel Ambient Mixer
 */

const STORAGE_KEY = "aiw-arcadia-v2";
const THEME_KEY = "aiw-theme";

const AVATAR_ADJECTIVES = [
  "질주하는", "바이브타는", "명쾌한", "초고속", "호기심많은", "단단한",
  "빛나는", "낭만적인", "날렵한", "유쾌한", "무결점의", "깨어있는",
];
const AVATAR_NOUNS = [
  "클로드", "에이전트", "컴파일러", "빌더", "네비게이터", "해커",
  "탐험가", "파이프라인", "리팩토러", "옵저버", "아키텍트", "코더",
];
const NPC_BUBBLES = [
  "오늘 스타보드 1위 엄청 치열하네!",
  "가챠에서 꿀 플러그인 뽑았다!",
  "1M 컨텍스트 버프 시원하다~",
  "새벽 디버깅 중 잠깐 산책!",
  "DJ 부스 신스 비트 좋네요 🎧",
  "프론티어 코딩 Elo 경쟁 대박!",
  "무한 루프 없이 원샷 빌드 가자!",
  "누가 드론 쐈다! 🚀",
];

const BEACON_SUBJECTS = [
  "내 클로드 코드가",
  "우리 백엔드 파이프라인이",
  "방금 짠 에이전트 스킬이",
  "오늘의 오픈소스 커밋이",
  "프론트엔드 3D 빌드가",
  "주간 스타보드 순위가",
  "지친 야근 개발자가",
  "로컬호스트 서버가",
];
const BEACON_CONTEXTS = [
  "넥서스 아카디아에서",
  "1M 컨텍스트 과충전 받고",
  "에스프레소 더블샷 마시고",
  "DJ 비트에 맞춰 코딩하다가",
  "금요일 오후 배포 직전에",
  "PR 리뷰 0코멘트로",
  "테스트 100% 통과하며",
  "새벽 산책 한 바퀴 돌고",
];
const BEACON_WISHES = [
  "단 한 번에 프로덕션 순항 중!",
  "새로운 사이드 프로젝트 영감 충전!",
  "레전더리 오픈소스 캡슐 획득 기원!",
  "컨텍스트 오염 없이 맑게 동작 중!",
  "메모리 누수 0건으로 쾌속 질주!",
  "오늘도 즐거운 바이브 코딩 완주!",
  "모든 팀원에게 칼퇴를 선물하소서!",
  "넥서스 월드에서 함께 리프레시 중!",
];

const LANDMARKS = {
  fountain: { id: "fountain", x: 0, z: 0, label: "CENTER · 코어 넥서스 파운틴 [0, 0]", actionLabel: "[E] 1M 컨텍스트 과충전" },
  arena: { id: "arena", x: -220, z: -120, label: "WEST · 프론티어 아레나 [-220, -120]", actionLabel: "[E] 진영 에너지 빔 발사" },
  gacha: { id: "gacha", x: 220, z: -120, label: "EAST · 스타보드 가챠 포털 [220, -120]", actionLabel: "[E] 오픈소스 캡슐 뽑기" },
  dj: { id: "dj", x: 0, z: -220, label: "NORTH · 루프탑 DJ & 에스프레소 [0, -220]", actionLabel: "[E] 에스프레소 & 비트 드롭" },
};

const FACTIONS_DEFAULT = [
  { id: "claude", name: "Claude Fable 5.2", provider: "Anthropic", elo: 1605, skinLabel: "Claude 테라코타 스킨", basePower: 420 },
  { id: "gemini", name: "Gemini 4 Carbon", provider: "Google", elo: 1598, skinLabel: "Gemini 코발트 스킨", basePower: 395 },
  { id: "gpt", name: "GPT-5.6 Sol", provider: "OpenAI", elo: 1510, skinLabel: "GPT 에메랄드 스킨", basePower: 360 },
];

const MIXER_CHANNELS = [
  { id: "synth", title: "사이버 신스 아르페지오", sub: "Procedural 118 BPM Pluck Arp", defaultVol: 45 },
  { id: "rain", title: "로파이 빗소리 그루브", sub: "Warm Filtered Pink Noise", defaultVol: 35 },
  { id: "drone", title: "딥 스페이스 55Hz 드론", sub: "Ambient Sub Pad", defaultVol: 25 },
  { id: "clicks", title: "코딩 타건 리듬", sub: "Soft Mechanical Keystrokes", defaultVol: 20 },
];

const SOUND_PRESETS = {
  synth: { synth: 55, rain: 20, drone: 30, clicks: 15 },
  focus: { synth: 0, rain: 45, drone: 25, clicks: 40 },
  rain: { synth: 20, rain: 75, drone: 20, clicks: 0 },
  mute: { synth: 0, rain: 0, drone: 0, clicks: 0 },
};

/* ---------- Deterministic PRNG & Utilities ---------- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function getKstNow() {
  const kstMs = Date.now() + 9 * 3600 * 1000;
  const d = new Date(kstMs);
  return {
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    bucket5m: Math.floor(kstMs / 300000),
    daySeed: d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(),
  };
}

function randomIdentity(seed) {
  const rng = mulberry32(seed);
  const adj = AVATAR_ADJECTIVES[Math.floor(rng() * AVATAR_ADJECTIVES.length)];
  const noun = AVATAR_NOUNS[Math.floor(rng() * AVATAR_NOUNS.length)];
  const roles = ["claude", "gemini", "gpt"];
  return { name: `${adj} ${noun}`, faction: roles[Math.floor(rng() * roles.length)] };
}

/* ---------- Persistent User State ---------- */
function loadUserState() {
  const id = randomIdentity((Date.now() & 0xfffffff) ^ 0x4242);
  const defaults = {
    name: id.name,
    faction: "claude",
    drones: [],
    factionPower: { claude: 0, gemini: 0, gpt: 0 },
    capsules: [],
    espressos: 0,
    mixer: { synth: 45, rain: 35, drone: 25, clicks: 20 },
  };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw || typeof raw !== "object") return defaults;
    return {
      ...defaults,
      ...raw,
      drones: Array.isArray(raw.drones) ? raw.drones.slice(0, 12) : [],
      capsules: Array.isArray(raw.capsules) ? raw.capsules.slice(0, 20) : [],
      factionPower: { ...defaults.factionPower, ...(raw.factionPower || {}) },
      mixer: { ...defaults.mixer, ...(raw.mixer || {}) },
    };
  } catch {
    return defaults;
  }
}

function saveUserState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(USER));
  } catch {}
}

const USER = loadUserState();
let ACTIVE_ZONE = "fountain";
let REDUCED_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
let FACTIONS = FACTIONS_DEFAULT.map((f) => ({ ...f }));
let GACHA_POOL = [];
let TELEMETRY = { temp: "38.2°C", news: "18건", topPlugin: "bla (+1,948★)", topModel: "Claude Fable 5.2 (1588 Elo)" };

/* ---------- Web Audio API Synth & SFX Engine ---------- */
class ArcadiaAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.masterEnabled = false;
    this.nodes = {};
    this.arpTimer = null;
    this.clickTimer = null;
    this.arpStep = 0;
    this.beatLevel = 0;
  }

  ensureContext() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.65;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMasterEnabled(enabled) {
    this.masterEnabled = enabled;
    if (enabled) {
      this.ensureContext();
      this.syncMixer();
      this.startLoops();
    } else {
      this.stopLoops();
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
      }
    }
    updateAudioButtonUI();
  }

  playTone(freqStart, freqEnd, dur = 0.18, type = "triangle", vol = 0.18) {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (!this.masterEnabled) this.masterGain.gain.setTargetAtTime(0.65, ctx.currentTime, 0.02);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, now + dur);
    }
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(vol, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0006, now + dur);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  playJump() {
    this.playTone(240, 520, 0.16, "sine", 0.16);
  }

  playEmote(id) {
    if (id === 1) this.playTone(440, 880, 0.25, "triangle", 0.18);
    else if (id === 2) {
      this.playTone(523.25, 523.25, 0.2, "sine", 0.16);
      setTimeout(() => this.playTone(659.25, 659.25, 0.28, "sine", 0.16), 90);
    } else if (id === 3) {
      this.playTone(180, 740, 0.32, "sawtooth", 0.1);
    } else {
      this.playTone(587.33, 783.99, 0.22, "triangle", 0.15);
    }
  }

  playGachaFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, f, 0.28, "triangle", 0.18), i * 75);
    });
  }

  playOverclock() {
    const notes = [329.63, 440, 554.37, 659.25];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, f * 1.02, 0.35, "sine", 0.16), i * 55);
    });
  }

  initContinuousNodes() {
    if (!this.ctx || this.nodes.rainGain) return;
    const ctx = this.ctx;
    this.masterGain.gain.setTargetAtTime(0.65, ctx.currentTime, 0.05);

    const bufLen = ctx.sampleRate * 3;
    const noiseBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const out = noiseBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.029;
      b1 = 0.985 * b1 + white * 0.032;
      b2 = 0.950 * b2 + white * 0.048;
      out[i] = (b0 + b1 + b2 + white * 0.015) * 0.35;
    }
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = noiseBuf;
    rainSrc.loop = true;
    const rainFlt = ctx.createBiquadFilter();
    rainFlt.type = "lowpass";
    rainFlt.frequency.value = 950;
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0;
    rainSrc.connect(rainFlt);
    rainFlt.connect(rainGain);
    rainGain.connect(this.masterGain);
    rainSrc.start();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const dFlt = ctx.createBiquadFilter();
    const droneGain = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.value = 55;
    osc2.type = "triangle";
    osc2.frequency.value = 110;
    dFlt.type = "lowpass";
    dFlt.frequency.value = 210;
    droneGain.gain.value = 0;
    osc1.connect(dFlt);
    osc2.connect(dFlt);
    dFlt.connect(droneGain);
    droneGain.connect(this.masterGain);
    osc1.start();
    osc2.start();

    this.nodes = { rainGain, droneGain };
  }

  syncMixer() {
    if (!this.masterEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.initContinuousNodes();
    this.masterGain.gain.setTargetAtTime(0.65, ctx.currentTime, 0.05);
    this.nodes.rainGain?.gain.setTargetAtTime(((USER.mixer.rain || 0) / 100) * 0.5, ctx.currentTime, 0.1);
    this.nodes.droneGain?.gain.setTargetAtTime(((USER.mixer.drone || 0) / 100) * 0.14, ctx.currentTime, 0.1);
  }

  startLoops() {
    this.stopLoops();
    const scale = [220, 261.63, 329.63, 392, 440, 392, 329.63, 293.66]; // Am9 Cyber Synth Arp
    this.arpTimer = setInterval(() => {
      if (!this.masterEnabled) return;
      const v = (USER.mixer.synth || 0) / 100;
      if (v > 0.02) {
        const note = scale[this.arpStep % scale.length];
        this.playTone(note, note, 0.22, "triangle", v * 0.12);
        this.beatLevel = 1;
        this.arpStep += 1;
      }
    }, 254);

    this.clickTimer = setInterval(() => {
      if (!this.masterEnabled) return;
      const v = (USER.mixer.clicks || 0) / 100;
      if (v > 0.02 && Math.random() < 0.65) {
        this.playTone(1200 + Math.random() * 500, 800, 0.03, "square", v * 0.035);
      }
    }, 220);
  }

  stopLoops() {
    if (this.arpTimer) { clearInterval(this.arpTimer); this.arpTimer = null; }
    if (this.clickTimer) { clearInterval(this.clickTimer); this.clickTimer = null; }
  }
}

const AUDIO = new ArcadiaAudio();

/* ---------- 3D Math Helpers ---------- */
function norm3(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function parseHex(hex) {
  const clean = (hex || "").trim();
  if (clean.startsWith("#")) {
    let h = clean.slice(1);
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (h.length === 6) {
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
  }
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(clean);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [245, 158, 11];
}
function shadeRgb(rgb, factor, alpha = 1) {
  const r = Math.min(255, Math.max(0, Math.round(rgb[0] * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb[1] * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb[2] * factor)));
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/* ---------- 3D Playable World State ---------- */
const KEYS = new Set();

const PLAYER = {
  x: 0,
  y: 0,
  z: 75,
  vy: 0,
  yaw: Math.PI, // facing center core at (0,0)
  walkCycle: 0,
  moving: false,
  clickTarget: null, // { x, z }
  overclockUntil: 0,
  espressoUntil: 0,
  bubbleText: "",
  bubbleUntil: 0,
  beamTo: null, // { x, y, z, colorRgb, until }
};

const WORLD = {
  cam: {
    mode: "follow", // 'follow' | 'shoulder' | 'overview'
    yaw: 0.25,
    pitch: 0.42,
    dist: 235,
    tx: 0,
    ty: 18,
    tz: 75,
    targetYaw: 0.25,
    targetPitch: 0.42,
    targetDist: 235,
    targetTx: 0,
    targetTy: 18,
    targetTz: 75,
  },
  npcs: [],
  drones3d: [],
  ripples3d: [],
  particles3d: [],
  stars3d: [],
  nearestZone: "fountain",
  gachaDropAnim: 0,
  dragging: false,
  dragMoved: 0,
  lastX: 0,
  lastY: 0,
  lastFrameTime: performance.now(),
  cameraBasis: null,
};

function buildRoamingNPCs(kst) {
  const rng = mulberry32(kst.bucket5m ^ 0x85ebca6b);
  const targets = Object.values(LANDMARKS);
  const count = 18 + Math.floor(rng() * 8);
  const npcs = [];
  for (let i = 0; i < count; i++) {
    const startLm = targets[i % targets.length];
    const angle = rng() * Math.PI * 2;
    const rad = 35 + rng() * 50;
    const identity = randomIdentity(kst.bucket5m + i * 977);
    const destLm = targets[Math.floor(rng() * targets.length)];
    npcs.push({
      id: i,
      name: identity.name,
      faction: identity.faction,
      x: startLm.x + Math.cos(angle) * rad,
      y: 0,
      z: startLm.z + Math.sin(angle) * rad,
      vy: 0,
      yaw: rng() * Math.PI * 2,
      walkCycle: rng() * Math.PI * 2,
      destX: destLm.x + (rng() - 0.5) * 90,
      destZ: destLm.z + (rng() - 0.5) * 90,
      pauseTimer: rng() * 140,
      speed: 0.72 + rng() * 0.45,
      bubbleText: i % 4 === 0 ? NPC_BUBBLES[i % NPC_BUBBLES.length] : "",
      bubbleUntil: i % 4 === 0 ? performance.now() + 9000 + rng() * 8000 : 0,
    });
  }
  WORLD.npcs = npcs;
}

function init3DStars() {
  const rng = mulberry32(20261116);
  WORLD.stars3d = Array.from({ length: 120 }, () => {
    const th = rng() * Math.PI * 2;
    const ph = 0.08 + rng() * 0.9;
    const r = 720 + rng() * 240;
    return {
      x: Math.cos(th) * Math.cos(ph) * r,
      y: 110 + Math.sin(ph) * r * 0.75,
      z: Math.sin(th) * Math.cos(ph) * r,
      size: 1 + rng() * 1.6,
      phase: rng() * Math.PI * 2,
    };
  });
}

function spawn3DRipple(wx, wz, colorKey = "amber", maxR = 120) {
  WORLD.ripples3d.push({ wx, wz, colorKey, r: 8, maxR, alpha: 0.95 });
}

function spawnBurstParticles(x, y, z, colorKey = "amber", count = 16) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const spd = 1.2 + Math.random() * 2.2;
    WORLD.particles3d.push({
      x, y, z,
      vx: Math.cos(a) * spd,
      vy: 2.2 + Math.random() * 3.0,
      vz: Math.sin(a) * spd,
      life: 1,
      colorKey,
    });
  }
}

function spawn3DDrone(text, isMine = false) {
  const angle = Math.random() * Math.PI * 2;
  WORLD.drones3d.push({
    angle,
    radius: 65 + Math.random() * 75,
    y: 45 + Math.random() * 70,
    speed: 0.008 + Math.random() * 0.008,
    text: text.slice(0, 26),
    isMine,
  });
  if (WORLD.drones3d.length > 10) WORLD.drones3d.shift();
}

function getThemePalette() {
  const style = getComputedStyle(document.documentElement);
  const read = (v, fb) => style.getPropertyValue(v).trim() || fb;
  const isLight = document.documentElement.dataset.theme === "light";
  return {
    isLight,
    bg: read("--sc-stage-bg", isLight ? "#f6f2e9" : "#06090e"),
    border: read("--border", isLight ? "#e0d9cc" : "#1e2d40"),
    amberHex: read("--sc-amber", isLight ? "#b45309" : "#fbbf24"),
    emeraldHex: read("--sc-emerald", isLight ? "#0f5132" : "#34d399"),
    terracottaHex: read("--sc-terracotta", isLight ? "#b95b3d" : "#e58768"),
    inkHex: read("--sc-canvas-ink", isLight ? "#181512" : "#f0f6fc"),
    mutedHex: read("--sc-canvas-muted", isLight ? "#5e584f" : "#8b949e"),
    stoneRgb: isLight ? [222, 214, 198] : [28, 41, 58],
    floorRgb: isLight ? [232, 224, 208] : [18, 28, 42],
    amberRgb: parseHex(read("--sc-amber", isLight ? "#b45309" : "#fbbf24")),
    emeraldRgb: parseHex(read("--sc-emerald", isLight ? "#0f5132" : "#34d399")),
    terracottaRgb: parseHex(read("--sc-terracotta", isLight ? "#b95b3d" : "#e58768")),
    geminiRgb: isLight ? [29, 78, 216] : [96, 165, 250],
    whiteRgb: isLight ? [255, 253, 248] : [240, 246, 252],
    darkEyeRgb: isLight ? [24, 21, 18] : [15, 23, 42],
  };
}

/* ---------- Physics & AI Roaming Update ---------- */
function stepSimulation(dt, now) {
  const dtNorm = Math.min(2.5, dt / 16.67);

  // 1. Player Movement (Keyboard WASD/Arrows relative to camera yaw OR Click-to-Move)
  let moveX = 0;
  let moveZ = 0;
  const cy = WORLD.cam.yaw;
  const fwdX = -Math.sin(cy);
  const fwdZ = -Math.cos(cy);
  const rightX = Math.cos(cy);
  const rightZ = -Math.sin(cy);

  if (KEYS.has("KeyW") || KEYS.has("ArrowUp")) { moveX += fwdX; moveZ += fwdZ; }
  if (KEYS.has("KeyS") || KEYS.has("ArrowDown")) { moveX -= fwdX; moveZ -= fwdZ; }
  if (KEYS.has("KeyD") || KEYS.has("ArrowRight")) { moveX += rightX; moveZ += rightZ; }
  if (KEYS.has("KeyA") || KEYS.has("ArrowLeft")) { moveX -= rightX; moveZ -= rightZ; }

  const hasKeyMove = Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01;
  if (hasKeyMove) {
    PLAYER.clickTarget = null;
  } else if (PLAYER.clickTarget) {
    const dx = PLAYER.clickTarget.x - PLAYER.x;
    const dz = PLAYER.clickTarget.z - PLAYER.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 6) {
      moveX = dx / dist;
      moveZ = dz / dist;
    } else {
      PLAYER.clickTarget = null;
    }
  }

  const speedMult = (now < PLAYER.overclockUntil ? 1.45 : 1) * (now < PLAYER.espressoUntil ? 1.3 : 1);
  const baseSpeed = 2.4 * speedMult * dtNorm;
  const mLen = Math.hypot(moveX, moveZ);
  if (mLen > 0.01) {
    const nx = moveX / mLen;
    const nz = moveZ / mLen;
    PLAYER.x = Math.max(-340, Math.min(340, PLAYER.x + nx * baseSpeed));
    PLAYER.z = Math.max(-330, Math.min(210, PLAYER.z + nz * baseSpeed));
    const targetYaw = Math.atan2(nx, nz);
    // Smoothly turn character toward movement direction
    let diff = targetYaw - PLAYER.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    PLAYER.yaw += diff * 0.22;
    PLAYER.walkCycle += 0.28 * speedMult * dtNorm;
    PLAYER.moving = true;
  } else {
    PLAYER.moving = false;
  }

  // Player Jump Gravity
  if (PLAYER.y > 0 || PLAYER.vy !== 0) {
    PLAYER.y += PLAYER.vy * dtNorm;
    PLAYER.vy -= 0.36 * dtNorm;
    if (PLAYER.y <= 0) {
      PLAYER.y = 0;
      PLAYER.vy = 0;
    }
  }

  // 2. Nearest Landmark Proximity Detection
  let nearestId = "fountain";
  let nearestDist = Infinity;
  for (const lm of Object.values(LANDMARKS)) {
    const d = Math.hypot(PLAYER.x - lm.x, PLAYER.z - lm.z);
    if (d < nearestDist) {
      nearestDist = d;
      nearestId = lm.id;
    }
  }
  WORLD.nearestZone = nearestId;
  const isNear = nearestDist < 105;
  const interactBtn = document.getElementById("btn-interact-zone");
  const interactLabel = document.getElementById("interact-btn-label");
  if (interactBtn && interactLabel) {
    interactBtn.classList.toggle("is-nearby", isNear);
    interactLabel.textContent = LANDMARKS[nearestId].actionLabel;
  }
  const tagEl = document.getElementById("station-status-tag");
  if (tagEl) tagEl.textContent = `POS (${Math.round(PLAYER.x)}, ${Math.round(PLAYER.z)})`;
  const hudPill = document.getElementById("hud-zone-label");
  if (hudPill && isNear) {
    hudPill.textContent = LANDMARKS[nearestId].label;
  }

  // Update buff badge
  const buffBadge = document.getElementById("buff-status-badge");
  if (buffBadge) {
    const leftSec = Math.max(0, Math.ceil((PLAYER.overclockUntil - now) / 1000));
    buffBadge.textContent = leftSec > 0 ? `⚡ 1M 과충전 (${leftSec}s)` : "버프 대기";
  }

  // 3. Autonomous Roaming Agent NPCs
  const lmList = Object.values(LANDMARKS);
  for (const npc of WORLD.npcs) {
    if (npc.y > 0 || npc.vy !== 0) {
      npc.y += npc.vy * dtNorm;
      npc.vy -= 0.35 * dtNorm;
      if (npc.y <= 0) { npc.y = 0; npc.vy = 0; }
    }
    if (npc.pauseTimer > 0) {
      npc.pauseTimer -= dtNorm;
      continue;
    }
    const dx = npc.destX - npc.x;
    const dz = npc.destZ - npc.z;
    const d = Math.hypot(dx, dz);
    if (d < 8) {
      npc.pauseTimer = 90 + Math.random() * 140;
      const nextLm = lmList[Math.floor(Math.random() * lmList.length)];
      npc.destX = nextLm.x + (Math.random() - 0.5) * 110;
      npc.destZ = nextLm.z + (Math.random() - 0.5) * 110;
      if (Math.random() < 0.35) {
        npc.bubbleText = NPC_BUBBLES[Math.floor(Math.random() * NPC_BUBBLES.length)];
        npc.bubbleUntil = now + 5500;
      }
    } else {
      const nx = dx / d;
      const nz = dz / d;
      npc.x += nx * npc.speed * dtNorm;
      npc.z += nz * npc.speed * dtNorm;
      npc.yaw = Math.atan2(nx, nz);
      npc.walkCycle += 0.2 * npc.speed * dtNorm;
    }
  }

  // 4. Particles & Gacha Drop Decay
  if (WORLD.gachaDropAnim > 0) WORLD.gachaDropAnim = Math.max(0, WORLD.gachaDropAnim - 0.02 * dtNorm);
  AUDIO.beatLevel = Math.max(0, AUDIO.beatLevel - 0.05 * dtNorm);

  for (let i = WORLD.particles3d.length - 1; i >= 0; i--) {
    const pt = WORLD.particles3d[i];
    pt.x += pt.vx * dtNorm;
    pt.y += pt.vy * dtNorm;
    pt.z += pt.vz * dtNorm;
    pt.vy -= 0.14 * dtNorm;
    pt.life -= 0.024 * dtNorm;
    if (pt.life <= 0 || pt.y < 0) WORLD.particles3d.splice(i, 1);
  }
}

/* ---------- 3D World Renderer ---------- */
function render3DWorld(now = performance.now()) {
  const dt = Math.min(50, Math.max(4, now - WORLD.lastFrameTime));
  WORLD.lastFrameTime = now;
  stepSimulation(dt, now);

  const canvas = document.getElementById("sanctuary-canvas");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const tw = Math.round(rect.width * dpr);
  const th = Math.round(rect.height * dpr);
  if (canvas.width !== tw || canvas.height !== th) {
    canvas.width = tw;
    canvas.height = th;
  }

  // Camera Target Follows Player (unless overview mode)
  const c = WORLD.cam;
  if (c.mode === "follow") {
    c.targetTx = PLAYER.x;
    c.targetTy = PLAYER.y + 16;
    c.targetTz = PLAYER.z;
    c.targetDist = Math.min(340, Math.max(140, c.targetDist));
  } else if (c.mode === "shoulder") {
    c.targetTx = PLAYER.x;
    c.targetTy = PLAYER.y + 20;
    c.targetTz = PLAYER.z;
  }
  const lerp = REDUCED_MOTION ? 1 : 0.12;
  c.yaw += (c.targetYaw - c.yaw) * lerp;
  c.pitch += (c.targetPitch - c.pitch) * lerp;
  c.dist += (c.targetDist - c.dist) * lerp;
  c.tx += (c.targetTx - c.tx) * lerp;
  c.ty += (c.targetTy - c.ty) * lerp;
  c.tz += (c.targetTz - c.tz) * lerp;

  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const cx = W / 2;
  const cy = H / 2;
  const fov = Math.min(W, H) * 1.15;
  const pal = getThemePalette();

  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);

  const grad = ctx.createRadialGradient(cx, cy * 0.85, 30, cx, cy, Math.max(W, H) * 0.75);
  grad.addColorStop(0, pal.isLight ? "rgba(180, 83, 9, 0.08)" : "rgba(16, 185, 129, 0.08)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const cosP = Math.cos(c.pitch);
  const sinP = Math.sin(c.pitch);
  const cosY = Math.cos(c.yaw);
  const sinY = Math.sin(c.yaw);
  const eye = [
    c.tx + c.dist * cosP * sinY,
    c.ty + c.dist * sinP,
    c.tz + c.dist * cosP * cosY,
  ];
  const forward = norm3([c.tx - eye[0], c.ty - eye[1], c.tz - eye[2]]);
  const right = norm3(cross3(forward, [0, 1, 0]));
  const up = cross3(right, forward);
  const lightDir = norm3([0.45, 0.82, 0.35]);

  WORLD.cameraBasis = { eye, forward, right, up, W, H, cx, cy, fov };

  function projectPoint(wx, wy, wz) {
    const dx = wx - eye[0];
    const dy = wy - eye[1];
    const dz = wz - eye[2];
    const vx = dx * right[0] + dy * right[1] + dz * right[2];
    const vy = dx * up[0] + dy * up[1] + dz * up[2];
    const vz = dx * forward[0] + dy * forward[1] + dz * forward[2];
    if (vz < 12) return null;
    const s = fov / vz;
    return { x: cx + vx * s, y: cy - vy * s, z: vz, s };
  }

  // Stars
  for (const st of WORLD.stars3d) {
    const p = projectPoint(st.x, st.y, st.z);
    if (!p) continue;
    const tw = REDUCED_MOTION ? 0.5 : 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.0015 + st.phase));
    ctx.fillStyle = pal.mutedHex;
    ctx.globalAlpha = tw * 0.6;
    ctx.fillRect(p.x, p.y, st.size, st.size);
  }
  ctx.globalAlpha = 1;

  // Ground Grid & Neon Pathways
  ctx.lineWidth = 1;
  ctx.strokeStyle = pal.isLight ? "rgba(24, 21, 18, 0.07)" : "rgba(245, 158, 11, 0.07)";
  for (let g = -360; g <= 360; g += 60) {
    const a1 = projectPoint(g, 0, -340);
    const a2 = projectPoint(g, 0, 220);
    if (a1 && a2) { ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(a2.x, a2.y); ctx.stroke(); }
    const b1 = projectPoint(-360, 0, g - 60);
    const b2 = projectPoint(360, 0, g - 60);
    if (b1 && b2) { ctx.beginPath(); ctx.moveTo(b1.x, b1.y); ctx.lineTo(b2.x, b2.y); ctx.stroke(); }
  }

  // Landmark Roads
  ctx.strokeStyle = pal.isLight ? "rgba(15, 81, 50, 0.25)" : "rgba(16, 185, 129, 0.25)";
  ctx.lineWidth = 2.2;
  for (const lm of [LANDMARKS.arena, LANDMARKS.gacha, LANDMARKS.dj]) {
    const p0 = projectPoint(0, 1, 0);
    const p1 = projectPoint(lm.x, 1, lm.z);
    if (p0 && p1) { ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
  }

  // Click-to-Move Target Marker
  if (PLAYER.clickTarget) {
    const tp = projectPoint(PLAYER.clickTarget.x, 1, PLAYER.clickTarget.z);
    if (tp) {
      ctx.strokeStyle = pal.emeraldHex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(tp.x, tp.y, 12, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Ground Ripples
  for (let i = WORLD.ripples3d.length - 1; i >= 0; i--) {
    const rp = WORLD.ripples3d[i];
    ctx.save();
    ctx.strokeStyle = rp.colorKey === "emerald" ? pal.emeraldHex : rp.colorKey === "gemini" ? "#60a5fa" : pal.amberHex;
    ctx.globalAlpha = Math.max(0, rp.alpha);
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let k = 0; k <= 24; k++) {
      const th = (k / 24) * Math.PI * 2;
      const pt = projectPoint(rp.wx + Math.cos(th) * rp.r, 2, rp.wz + Math.sin(th) * rp.r);
      if (pt) {
        if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
        else ctx.lineTo(pt.x, pt.y);
      }
    }
    if (started) ctx.stroke();
    ctx.restore();
    rp.r += 2.6;
    rp.alpha -= 0.02;
    if (rp.alpha <= 0 || rp.r >= rp.maxR) WORLD.ripples3d.splice(i, 1);
  }

  // Depth-Sorted Draw Collector
  const drawList = [];

  function pushBox(bx, by, bz, w, h, d, rgb, yawRad = 0, tiltX = 0, alpha = 1) {
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const lv = [
      [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd],
      [-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd],
    ];
    const cosA = Math.cos(yawRad), sinA = Math.sin(yawRad);
    const cosT = Math.cos(tiltX), sinT = Math.sin(tiltX);
    const wv = lv.map(([lx, ly, lz]) => {
      const ty = ly * cosT - lz * sinT;
      const tz = ly * sinT + lz * cosT;
      return [bx + lx * cosA + tz * sinA, by + ty, bz - lx * sinA + tz * cosA];
    });
    const pv = wv.map((v) => projectPoint(v[0], v[1], v[2]));
    const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]];

    for (const f of faces) {
      const p0 = pv[f[0]], p1 = pv[f[1]], p2 = pv[f[2]], p3 = pv[f[3]];
      if (!p0 || !p1 || !p2 || !p3) continue;
      const v0 = wv[f[0]], v1 = wv[f[1]], v2 = wv[f[2]], v3 = wv[f[3]];
      const n = norm3(cross3(
        [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]],
        [v3[0] - v0[0], v3[1] - v0[1], v3[2] - v0[2]]
      ));
      const fc = [(v0[0] + v2[0]) * 0.5, (v0[1] + v2[1]) * 0.5, (v0[2] + v2[2]) * 0.5];
      if (dot3(n, [eye[0] - fc[0], eye[1] - fc[1], eye[2] - fc[2]]) <= 0) continue;
      const light = 0.58 + Math.max(0, dot3(n, lightDir)) * 0.52;
      const depth = (p0.z + p1.z + p2.z + p3.z) * 0.25;
      drawList.push({
        type: "poly",
        depth,
        pts: [p0, p1, p2, p3],
        fill: shadeRgb(rgb, light, alpha),
        stroke: shadeRgb(rgb, 0.52, alpha * 0.45),
      });
    }
  }

  function pushText3D(wx, wy, wz, text, color, bubble = false) {
    const p = projectPoint(wx, wy, wz);
    if (!p || p.z > 650) return;
    drawList.push({ type: "text", depth: p.z - 2, x: p.x, y: p.y, text, color, bubble });
  }

  function drawVoxelClaude(x, y, z, yaw, walkCycle, faction, isPlayer, bubbleText) {
    const bodyRgb = faction === "gemini"
      ? pal.geminiRgb
      : faction === "gpt"
        ? pal.emeraldRgb
        : pal.terracottaRgb;
    const legSwing = Math.sin(walkCycle) * 0.45;
    const cosY2 = Math.cos(yaw), sinY2 = Math.sin(yaw);
    const rotOffset = (lx, lz) => [x + lx * cosY2 + lz * sinY2, z - lx * sinY2 + lz * cosY2];

    // 4 Legs (Walking Animation!)
    const legs = [
      [-4.5, -2.5, legSwing],
      [4.5, -2.5, -legSwing],
      [-4.5, 2.5, -legSwing],
      [4.5, 2.5, legSwing],
    ];
    for (const [lx, lz, swing] of legs) {
      const [wx, wz] = rotOffset(lx, lz);
      pushBox(wx, y + 3, wz, 2.6, 6, 2.6, bodyRgb, yaw, swing);
    }

    // Main Squat Terracotta / Faction Body
    pushBox(x, y + 11.5, z, 15, 11, 10, bodyRgb, yaw);
    // Left & Right Cheering Arms
    const armBob = isPlayer && now < PLAYER.overclockUntil ? Math.sin(now * 0.015) * 2.5 : 0;
    for (const side of [-1, 1]) {
      const [ax, az] = rotOffset(side * 9.5, 0);
      pushBox(ax, y + 12 + armBob * side, az, 3, 6, 3, bodyRgb, yaw);
    }

    // Two Stoic Pixel Eyes on Front Face (+Z in local coords)
    for (const side of [-3, 3]) {
      const [ex, ez] = rotOffset(side, 5.2);
      pushBox(ex, y + 12, ez, 2.1, 3.6, 0.8, pal.darkEyeRgb, yaw);
    }

    // Player Overclock Halo / Crown
    if (isPlayer) {
      const crownRgb = now < PLAYER.overclockUntil ? [253, 224, 71] : pal.amberRgb;
      pushBox(x, y + 21 + Math.sin(now * 0.005) * 1.2, z, 4.5, 4.5, 4.5, crownRgb, now * 0.003);
      pushText3D(x, y + 29, z, `YOU · ${USER.name}`, pal.amberHex);
    }
    if (bubbleText) {
      pushText3D(x, y + (isPlayer ? 39 : 27), z, bubbleText, pal.inkHex, true);
    }
  }

  /* ---- LANDMARK 1: CENTER CORE NEXUS FOUNTAIN [0, 0, 0] ---- */
  pushBox(0, 4, 0, 104, 8, 104, pal.stoneRgb, 0.785);
  pushBox(0, 10, 0, 66, 5, 66, pal.floorRgb, 0);
  const fY = 38 + Math.sin(now * 0.0028) * 5;
  pushBox(0, fY, 0, 20, 20, 20, pal.amberRgb, now * 0.0014, 0.45, 0.94);
  pushBox(0, fY, 0, 13, 13, 13, pal.emeraldRgb, -now * 0.002, -0.35, 0.95);
  pushText3D(0, fY + 24, 0, "⚡ CORE FOUNTAIN [E]", pal.amberHex);

  // Orbiting 3D Signal Drones
  for (const dr of WORLD.drones3d) {
    dr.angle += dr.speed;
    const dx = Math.cos(dr.angle) * dr.radius;
    const dz = Math.sin(dr.angle) * dr.radius;
    const dy = dr.y + Math.sin(now * 0.003 + dr.angle) * 4;
    pushBox(dx, dy, dz, 9, 5, 9, dr.isMine ? pal.amberRgb : pal.emeraldRgb, -dr.angle);
    pushText3D(dx, dy + 11, dz, dr.text, dr.isMine ? pal.amberHex : pal.inkHex);
  }

  /* ---- LANDMARK 2: WEST FRONTIER ARENA [-220, 0, -120] ---- */
  const ax = LANDMARKS.arena.x, az = LANDMARKS.arena.z;
  pushBox(ax, 4, az, 150, 8, 110, pal.stoneRgb, 0);
  pushText3D(ax, 84, az - 10, "⚔️ FRONTIER ARENA [E]", pal.amberHex);
  const towerOffsets = [-46, 0, 46];
  FACTIONS.forEach((f, idx) => {
    const tx = ax + towerOffsets[idx];
    const tz = az - 14;
    const rgb = f.id === "gemini" ? pal.geminiRgb : f.id === "gpt" ? pal.emeraldRgb : pal.terracottaRgb;
    const h = 34 + Math.max(0, (f.elo - 1480) * 0.25);
    pushBox(tx, h / 2 + 8, tz, 20, h, 20, rgb, USER.faction === f.id ? now * 0.001 : 0);
    pushBox(tx, h + 16, tz, 10, 10, 10, pal.amberRgb, now * 0.0025 + idx);
    pushText3D(tx, h + 28, tz, `${f.name.split(" ")[0]} ${f.elo}`, pal.inkHex);
  });

  /* ---- LANDMARK 3: EAST OSS GACHA PORTAL [220, 0, -120] ---- */
  const gx = LANDMARKS.gacha.x, gz = LANDMARKS.gacha.z;
  pushBox(gx, 4, gz, 120, 8, 110, pal.stoneRgb, 0);
  pushBox(gx, 28, gz - 12, 34, 42, 28, pal.terracottaRgb, 0);
  pushBox(gx, 32, gz + 3, 24, 20, 4, pal.whiteRgb, 0, 0, 0.88); // Display glass
  const starScale = 1 + WORLD.gachaDropAnim * 0.45;
  pushBox(gx, 62, gz - 12, 16 * starScale, 16 * starScale, 16 * starScale, pal.amberRgb, now * 0.0025, 0.6);
  pushText3D(gx, 82, gz - 12, "🕹️ OSS GACHA [E]", pal.emeraldHex);

  /* ---- LANDMARK 4: NORTH ROOFTOP DJ & ESPRESSO [0, 0, -220] ---- */
  const dx = LANDMARKS.dj.x, dz = LANDMARKS.dj.z;
  pushBox(dx, 5, dz, 146, 10, 88, pal.floorRgb, 0);
  pushBox(dx, 17, dz - 8, 56, 14, 20, pal.stoneRgb, 0); // DJ Deck
  for (let b = 0; b < 8; b++) {
    const bx = dx - 49 + b * 14;
    const eqH = 14 + (AUDIO.masterEnabled ? (10 + Math.sin(now * 0.015 + b * 0.9) * 14 + AUDIO.beatLevel * 18) : 6 + b % 3 * 4);
    const barRgb = b % 2 === 0 ? pal.emeraldRgb : pal.amberRgb;
    pushBox(bx, 10 + eqH / 2, dz - 28, 9, eqH, 9, barRgb, 0);
  }
  pushText3D(dx, 68, dz - 24, `🎧 DJ & BAR · ${TELEMETRY.temp} [E]`, pal.emeraldHex);

  /* ---- PLAYER & AUTONOMOUS NPCS ---- */
  const playerBubble = now < PLAYER.bubbleUntil ? PLAYER.bubbleText : "";
  drawVoxelClaude(PLAYER.x, PLAYER.y, PLAYER.z, PLAYER.yaw, PLAYER.walkCycle, USER.faction, true, playerBubble);

  for (const npc of WORLD.npcs) {
    const npcBubble = now < npc.bubbleUntil ? npc.bubbleText : "";
    drawVoxelClaude(npc.x, npc.y, npc.z, npc.yaw, npc.walkCycle, npc.faction, false, npcBubble);
  }

  // Particle Bursts
  for (const pt of WORLD.particles3d) {
    const rgb = pt.colorKey === "emerald" ? pal.emeraldRgb : pt.colorKey === "terracotta" ? pal.terracottaRgb : pal.amberRgb;
    pushBox(pt.x, pt.y, pt.z, 3.5, 3.5, 3.5, rgb, 0, 0, Math.max(0.1, pt.life));
  }

  // Energy Beam from Player to Faction Tower
  if (PLAYER.beamTo && now < PLAYER.beamTo.until) {
    const pA = projectPoint(PLAYER.x, PLAYER.y + 14, PLAYER.z);
    const pB = projectPoint(PLAYER.beamTo.x, PLAYER.beamTo.y, PLAYER.beamTo.z);
    if (pA && pB) {
      drawList.push({ type: "beam", depth: Math.min(pA.z, pB.z), a: pA, b: pB, color: PLAYER.beamTo.color });
    }
  }

  // Sort & Draw All 3D Primitives Back-to-Front
  drawList.sort((a, b) => b.depth - a.depth);
  for (const it of drawList) {
    if (it.type === "poly") {
      ctx.beginPath();
      ctx.moveTo(it.pts[0].x, it.pts[0].y);
      ctx.lineTo(it.pts[1].x, it.pts[1].y);
      ctx.lineTo(it.pts[2].x, it.pts[2].y);
      ctx.lineTo(it.pts[3].x, it.pts[3].y);
      ctx.closePath();
      ctx.fillStyle = it.fill;
      ctx.fill();
      ctx.strokeStyle = it.stroke;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else if (it.type === "beam") {
      ctx.save();
      ctx.strokeStyle = it.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(it.a.x, it.a.y);
      ctx.lineTo(it.b.x, it.b.y);
      ctx.stroke();
      ctx.restore();
    } else if (it.type === "text") {
      ctx.font = "700 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      if (it.bubble) {
        const tw2 = ctx.measureText(it.text).width + 12;
        ctx.fillStyle = pal.isLight ? "rgba(255,255,255,0.92)" : "rgba(14,20,29,0.92)";
        ctx.fillRect(it.x - tw2 / 2, it.y - 13, tw2, 18);
        ctx.strokeStyle = pal.amberHex;
        ctx.lineWidth = 1;
        ctx.strokeRect(it.x - tw2 / 2, it.y - 13, tw2, 18);
      }
      ctx.fillStyle = it.color;
      ctx.fillText(it.text, it.x, it.y);
    }
  }

  ctx.restore();
}

/* ---------- Landmark & Character Interactions ---------- */
function triggerJump() {
  if (PLAYER.y <= 0.1) {
    PLAYER.vy = 5.4;
    AUDIO.playJump();
    spawn3DRipple(PLAYER.x, PLAYER.z, "emerald", 55);
  }
}

function triggerEmote(id) {
  const now = performance.now();
  const labels = {
    1: "⚡ 컨텍스트 풀가동!",
    2: "❤️ 팀원들 모두 화이팅!",
    3: "🚀 무결점 배포 가즈아!",
    4: "☕ 새벽 에스프레소 치얼스!",
  };
  const colors = { 1: "amber", 2: "terracotta", 3: "emerald", 4: "amber" };
  PLAYER.bubbleText = labels[id] || "✨";
  PLAYER.bubbleUntil = now + 3500;
  triggerJump();
  spawnBurstParticles(PLAYER.x, PLAYER.y + 18, PLAYER.z, colors[id], 18);
  AUDIO.playEmote(id);

  // Nearby NPCs cheer back!
  for (const npc of WORLD.npcs) {
    if (Math.hypot(npc.x - PLAYER.x, npc.z - PLAYER.z) < 165) {
      npc.vy = 4.2;
      npc.yaw = Math.atan2(PLAYER.x - npc.x, PLAYER.z - npc.z);
      npc.bubbleText = id === 2 ? "❤️ 최고!" : id === 4 ? "☕ 건배!" : "⚡ 오오!";
      npc.bubbleUntil = now + 3000;
    }
  }
}

function activateOverclock() {
  const now = performance.now();
  PLAYER.overclockUntil = now + 20000;
  spawn3DRipple(0, 0, "amber", 190);
  spawnBurstParticles(PLAYER.x, PLAYER.y + 16, PLAYER.z, "amber", 24);
  PLAYER.bubbleText = "⚡ 1M 컨텍스트 과충전!";
  PLAYER.bubbleUntil = now + 3500;
  AUDIO.playOverclock();
  const fb = document.getElementById("ritual-feedback");
  if (fb) fb.textContent = "1M 컨텍스트 버프 발동! 이동 속도가 20초간 증가합니다";
}

function joinFaction(factionId) {
  const f = FACTIONS.find((x) => x.id === factionId);
  if (!f) return;
  USER.faction = f.id;
  USER.factionPower[f.id] = (USER.factionPower[f.id] || 0) + 10;
  saveUserState();

  const idx = FACTIONS.findIndex((x) => x.id === f.id);
  const tx = LANDMARKS.arena.x + [-46, 0, 46][idx];
  const color = f.id === "gemini" ? "#60a5fa" : f.id === "gpt" ? "#34d399" : "#e58768";
  PLAYER.beamTo = { x: tx, y: 45, z: LANDMARKS.arena.z - 14, color, until: performance.now() + 900 };
  PLAYER.bubbleText = `${f.name.split(" ")[0]} 진영 합류!`;
  PLAYER.bubbleUntil = performance.now() + 3000;
  spawn3DRipple(tx, LANDMARKS.arena.z - 14, f.id === "gemini" ? "gemini" : f.id === "gpt" ? "emerald" : "amber", 110);
  AUDIO.playOverclock();
  renderArenaFactions();
  updateTopStats();
}

function pullOpenSourceGacha() {
  if (!GACHA_POOL.length) {
    GACHA_POOL = [
      { name: "bla", title_ko: "bla — AI 역공학 방어 쉴드", stars: 5795, velocity_7d: 1948, summary_ko: "AI 코딩 에이전트의 역공학 시도를 난독화로 차단하는 보안 도구입니다.", official_url: "https://github.com/qybaihe/bla" },
      { name: "rea", title_ko: "rea — 네이티브 바이너리 역공학 에이전트", stars: 461912, velocity_7d: 17938, summary_ko: "바이너리와 앱 동작을 자율 조사하는 에이전트 도구입니다.", official_url: "https://github.com/morluto/rea" },
    ];
  }
  const pick = GACHA_POOL[Math.floor(Math.random() * GACHA_POOL.length)];
  const item = {
    name: pick.name || pick.id || "OSS Tool",
    title_ko: pick.title_ko || pick.name || "오픈소스 도구",
    stars: Number(pick.stars || 0),
    velocity: Number(pick.velocity_7d || 0),
    summary: (pick.summary_ko || pick.catchphrase || "AI위클리 검증 추천 오픈소스입니다.").slice(0, 140),
    url: pick.official_url || pick.repo_url || "https://github.com/ldk-hub/ai-weekly",
    pulledAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
  };
  USER.capsules.unshift(item);
  USER.capsules = USER.capsules.slice(0, 20);
  saveUserState();

  WORLD.gachaDropAnim = 1;
  spawn3DRipple(LANDMARKS.gacha.x, LANDMARKS.gacha.z, "emerald", 130);
  spawnBurstParticles(LANDMARKS.gacha.x, 35, LANDMARKS.gacha.z, "amber", 24);
  PLAYER.bubbleText = `🕹️ [${item.name}] 획득!`;
  PLAYER.bubbleUntil = performance.now() + 4000;
  AUDIO.playGachaFanfare();
  renderGachaUI(item);
  updateTopStats();
}

function brewEspressoAndDropBeat() {
  USER.espressos = (USER.espressos || 0) + 1;
  saveUserState();
  PLAYER.espressoUntil = performance.now() + 20000;
  PLAYER.bubbleText = "☕ 에스프레소 대시 ON!";
  PLAYER.bubbleUntil = performance.now() + 3500;
  spawn3DRipple(LANDMARKS.dj.x, LANDMARKS.dj.z, "emerald", 130);
  spawnBurstParticles(LANDMARKS.dj.x, 28, LANDMARKS.dj.z, "emerald", 20);
  if (!AUDIO.masterEnabled) AUDIO.setMasterEnabled(true);
  else AUDIO.playOverclock();
  updateEspressoUI();
}

function interactWithNearestLandmark() {
  const z = WORLD.nearestZone;
  if (ACTIVE_ZONE !== z) switchZone(z, true, false);
  if (z === "fountain") activateOverclock();
  else if (z === "arena") joinFaction(USER.faction || "claude");
  else if (z === "gacha") pullOpenSourceGacha();
  else if (z === "dj") brewEspressoAndDropBeat();
}

/* ---------- UI Rendering ---------- */
function renderArenaFactions() {
  const grid = document.getElementById("faction-grid");
  const powerBadge = document.getElementById("arena-power-badge");
  if (!grid) return;

  const totalUserPower = Object.values(USER.factionPower).reduce((a, b) => a + b, 0);
  if (powerBadge) powerBadge.textContent = `내 진영 기여 ${totalUserPower}`;

  grid.innerHTML = FACTIONS.map((f) => {
    const joined = USER.faction === f.id;
    const p = f.basePower + (USER.factionPower[f.id] || 0);
    const pct = Math.min(100, Math.round((p / 600) * 100));
    return `
      <button type="button" class="sc-faction-card ${joined ? "is-joined" : ""}" data-join-faction="${esc(f.id)}">
        <div class="sc-faction-name">${esc(f.name)}</div>
        <div class="sc-faction-elo">${esc(f.provider)} · Arena ${f.elo} Elo</div>
        <div class="sc-faction-bar"><div class="sc-faction-fill" style="width:${pct}%"></div></div>
        <span class="sc-station-hint">${joined ? "✓ 현재 내 3D 스킨" : "클릭하여 진영 변신"} · 파워 ${p}</span>
      </button>
    `;
  }).join("");
}

function renderGachaUI(latest = USER.capsules[0]) {
  const badge = document.getElementById("gacha-count-badge");
  const card = document.getElementById("gacha-latest-card");
  const inv = document.getElementById("gacha-inventory");
  if (badge) badge.textContent = `수집 ${USER.capsules.length}종`;

  if (card && latest) {
    card.innerHTML = `
      <div class="sc-gacha-meta">획득 완료 · ★ ${latest.stars.toLocaleString()} (+${latest.velocity.toLocaleString()}/7d)</div>
      <div class="sc-gacha-title">${esc(latest.title_ko)}</div>
      <div class="sc-gacha-summary">${esc(latest.summary)}</div>
      <a class="sc-gacha-link" href="${esc(latest.url)}" target="_blank" rel="noopener noreferrer">GitHub 저장소 열기 ↗</a>
    `;
  }

  if (inv) {
    inv.innerHTML = USER.capsules.length
      ? USER.capsules.map((c) => `
          <div class="sc-beacon-item is-mine">
            <div class="sc-beacon-meta">
              <span class="sc-beacon-author">${esc(c.name)}</span>
              <span>★ ${c.stars.toLocaleString()} · ${esc(c.pulledAt)}</span>
            </div>
            <p class="sc-beacon-text">${esc(c.title_ko)}</p>
          </div>
        `).join("")
      : `<div class="sc-beacon-item"><p class="sc-beacon-text">아직 뽑은 캡슐이 없습니다. 위 버튼이나 [E] 키로 뽑아보세요!</p></div>`;
  }
}

function renderDrones() {
  const listEl = document.getElementById("beacon-feed");
  if (!listEl) return;
  const kst = getKstNow();
  const rng = mulberry32(kst.bucket5m ^ 0xdeadbeef);
  const seeded = Array.from({ length: 4 }, (_, i) => {
    const id = randomIdentity(kst.daySeed + i * 313);
    const s = BEACON_SUBJECTS[Math.floor(rng() * BEACON_SUBJECTS.length)];
    const c = BEACON_CONTEXTS[Math.floor(rng() * BEACON_CONTEXTS.length)];
    const w = BEACON_WISHES[Math.floor(rng() * BEACON_WISHES.length)];
    return { author: id.name, text: `${s} ${c} ${w}`, ago: `${(i + 1) * 3}분 전`, isMine: false };
  });
  const all = [...USER.drones.map((d) => ({ ...d, isMine: true })), ...seeded].slice(0, 10);

  listEl.innerHTML = all.map((b) => `
    <div class="sc-beacon-item ${b.isMine ? "is-mine" : ""}">
      <div class="sc-beacon-meta">
        <span class="sc-beacon-author">${esc(b.author)}${b.isMine ? " (나)" : ""}</span>
        <span>${esc(b.ago)}</span>
      </div>
      <p class="sc-beacon-text">${esc(b.text)}</p>
    </div>
  `).join("");
}

function populateBeaconSelects() {
  const fill = (id, items) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map((t, idx) => `<option value="${idx}">${esc(t)}</option>`).join("");
  };
  fill("beacon-subject", BEACON_SUBJECTS);
  fill("beacon-context", BEACON_CONTEXTS);
  fill("beacon-wish", BEACON_WISHES);
  updateBeaconPreview();
}

function updateBeaconPreview() {
  const s = BEACON_SUBJECTS[Number(document.getElementById("beacon-subject")?.value || 0)];
  const c = BEACON_CONTEXTS[Number(document.getElementById("beacon-context")?.value || 0)];
  const w = BEACON_WISHES[Number(document.getElementById("beacon-wish")?.value || 0)];
  const preview = document.getElementById("beacon-preview");
  if (preview) preview.textContent = `"${s} ${c} ${w}"`;
}

function renderMixer() {
  const list = document.getElementById("mixer-list");
  if (!list) return;
  list.innerHTML = MIXER_CHANNELS.map((ch) => {
    const val = Number(USER.mixer[ch.id] ?? ch.defaultVol);
    const active = val > 0;
    return `
      <div class="sc-channel-row" data-channel="${esc(ch.id)}">
        <div class="sc-channel-top">
          <div>
            <div class="sc-channel-title">${esc(ch.title)}</div>
            <div class="sc-channel-sub">${esc(ch.sub)}</div>
          </div>
          <button type="button" class="sc-channel-toggle" data-ch-toggle="${esc(ch.id)}" aria-pressed="${active ? "true" : "false"}">
            ${active ? `${val}%` : "OFF"}
          </button>
        </div>
        <input type="range" class="sc-range" min="0" max="100" value="${val}" data-ch-range="${esc(ch.id)}" aria-label="${esc(ch.title)} 볼륨" />
      </div>
    `;
  }).join("");
}

function updateEspressoUI() {
  const badge = document.getElementById("espresso-badge");
  if (badge) badge.textContent = `에스프레소 ${USER.espressos || 0}잔`;
}

function updateTopStats() {
  const kst = getKstNow();
  const coEl = document.getElementById("sc-copresence-count");
  const capEl = document.getElementById("sc-capsule-count");
  const clockEl = document.getElementById("sc-kst-clock");
  const avLabel = document.getElementById("my-avatar-label");
  const facLabel = document.getElementById("player-faction-label");

  if (coEl) coEl.textContent = String(WORLD.npcs.length + 1);
  if (capEl) capEl.textContent = String(USER.capsules.length);
  if (clockEl) {
    const hh = String(kst.hour).padStart(2, "0");
    const mm = String(kst.minute).padStart(2, "0");
    clockEl.textContent = `KST ${hh}:${mm} · 넥서스 아카디아 온라인`;
  }
  if (avLabel) avLabel.textContent = USER.name;
  const f = FACTIONS.find((x) => x.id === USER.faction);
  if (facLabel && f) facLabel.textContent = f.skinLabel;
}

function updateAudioButtonUI() {
  const btn = document.getElementById("btn-master-audio");
  const label = document.getElementById("master-audio-label");
  if (!btn || !label) return;
  btn.setAttribute("aria-pressed", AUDIO.masterEnabled ? "true" : "false");
  label.textContent = AUDIO.masterEnabled ? "사운드 켜짐" : "사운드 꺼짐";
}

function setCameraMode(mode) {
  WORLD.cam.mode = mode;
  document.querySelectorAll("[data-cam-mode]").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.camMode === mode);
  });
  if (mode === "shoulder") {
    WORLD.cam.targetPitch = 0.24;
    WORLD.cam.targetDist = 140;
  } else if (mode === "overview") {
    WORLD.cam.targetTx = 0;
    WORLD.cam.targetTy = 15;
    WORLD.cam.targetTz = -95;
    WORLD.cam.targetPitch = 0.68;
    WORLD.cam.targetDist = 470;
  } else {
    WORLD.cam.targetPitch = 0.42;
    WORLD.cam.targetDist = 235;
  }
}

function switchZone(zone, syncUrl = true, teleportPlayer = true) {
  if (!LANDMARKS[zone]) zone = "fountain";
  ACTIVE_ZONE = zone;

  document.querySelectorAll(".sc-zone-tab").forEach((btn) => {
    const active = btn.dataset.zone === zone;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.querySelectorAll(".sc-zone-panel").forEach((panel) => {
    panel.hidden = panel.id !== `zone-${zone}`;
  });

  const lm = LANDMARKS[zone];
  if (teleportPlayer) {
    // Walk/warp player gracefully in front of the selected 3D landmark
    PLAYER.clickTarget = null;
    PLAYER.x = lm.x;
    PLAYER.z = lm.z + 58;
    PLAYER.yaw = Math.PI;
    spawn3DRipple(PLAYER.x, PLAYER.z, "emerald", 95);
    if (WORLD.cam.mode === "overview") setCameraMode("follow");
  }

  const hudLabel = document.getElementById("hud-zone-label");
  if (hudLabel) hudLabel.textContent = lm.label;

  if (syncUrl) {
    try {
      const p = new URLSearchParams(window.location.search);
      if (zone === "fountain") p.delete("zone");
      else p.set("zone", zone);
      const qs = p.toString();
      history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
    } catch {}
  }
}

/* ---------- Live AI Weekly Data Loader ---------- */
async function fetchJsonSafe(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function loadLiveWorldData() {
  const [newsRes, pluginsRes, benchRes] = await Promise.allSettled([
    fetchJsonSafe("data/news_latest.json"),
    fetchJsonSafe("data/latest.json"),
    fetchJsonSafe("data/benchmarks_latest.json"),
  ]);

  let newsCount = 0;
  let modelSignals = 0;
  if (newsRes.status === "fulfilled" && newsRes.value) {
    const arr = Array.isArray(newsRes.value.news) ? newsRes.value.news : [];
    newsCount = arr.length;
    modelSignals = newsRes.value.signal_counts?.model || 0;
  }

  let topPluginText = "데이터 확인 중";
  let topVel = 0;
  if (pluginsRes.status === "fulfilled" && pluginsRes.value) {
    const rising = Array.isArray(pluginsRes.value.rising) ? pluginsRes.value.rising : [];
    const classic = Array.isArray(pluginsRes.value.classic) ? pluginsRes.value.classic : [];
    GACHA_POOL = [...rising, ...classic].slice(0, 40);
    if (rising.length > 0) {
      const p = rising[0];
      topVel = Number(p.velocity_7d || 0);
      topPluginText = `${p.name || p.id} (+${topVel.toLocaleString()}★)`;
    }
  }

  let topModelText = "Claude Fable 5.2";
  if (benchRes.status === "fulfilled" && Array.isArray(benchRes.value?.model_benchmarks)) {
    const models = benchRes.value.model_benchmarks;
    const findModel = (kw) => models.find((m) => (m.model || "").toLowerCase().includes(kw));
    const claudeM = findModel("claude");
    const geminiM = findModel("gemini");
    const gptM = findModel("gpt");
    if (claudeM) { FACTIONS[0].name = claudeM.model; FACTIONS[0].elo = claudeM.arena_coding_elo || claudeM.arena_elo || 1605; }
    if (geminiM) { FACTIONS[1].name = geminiM.model; FACTIONS[1].elo = geminiM.arena_coding_elo || geminiM.arena_elo || 1598; }
    if (gptM) { FACTIONS[2].name = gptM.model; FACTIONS[2].elo = gptM.arena_coding_elo || gptM.arena_elo || 1510; }
    renderArenaFactions();

    const sorted = [...models].sort((a, b) => Number(b.arena_coding_elo || 0) - Number(a.arena_coding_elo || 0));
    if (sorted[0]) topModelText = `${sorted[0].model} (${sorted[0].arena_coding_elo || "—"} Elo)`;
  }

  const temp = (35.8 + Math.min(2.4, newsCount * 0.08 + modelSignals * 0.25 + (topVel > 1000 ? 0.4 : 0.1))).toFixed(1);
  TELEMETRY = { temp: `${temp}°C`, news: `${newsCount}건`, topPlugin: topPluginText, topModel: topModelText };

  const newsEl = document.getElementById("tele-news-count");
  const plugEl = document.getElementById("tele-top-plugin");
  const modelEl = document.getElementById("tele-top-model");
  const tempEl = document.getElementById("vibe-temp-val");
  const statusEl = document.getElementById("vibe-temp-status");

  if (newsEl) newsEl.textContent = newsCount > 0 ? `${newsCount}건 (모델 ${modelSignals}건)` : "실시간 대기";
  if (plugEl) plugEl.textContent = topPluginText;
  if (modelEl) modelEl.textContent = topModelText;
  if (tempEl) tempEl.textContent = `${temp}°C`;
  if (statusEl) {
    statusEl.textContent = Number(temp) >= 37.8
      ? "신규 모델 릴리스 열기 · 핫한 심야 코딩"
      : "원샷 컴파일 쾌적 · 순항 중";
  }
}

/* ---------- Raycast Floor Click-to-Move ---------- */
function intersectGround(mx, my) {
  const b = WORLD.cameraBasis;
  if (!b) return null;
  const ndcX = (mx - b.cx) / b.fov;
  const ndcY = (b.cy - my) / b.fov;
  const dir = norm3([
    b.forward[0] + ndcX * b.right[0] + ndcY * b.up[0],
    b.forward[1] + ndcX * b.right[1] + ndcY * b.up[1],
    b.forward[2] + ndcX * b.right[2] + ndcY * b.up[2],
  ]);
  if (Math.abs(dir[1]) < 0.01) return null;
  const t = -b.eye[1] / dir[1];
  if (t <= 0 || t > 1200) return null;
  const hx = Math.max(-340, Math.min(340, b.eye[0] + dir[0] * t));
  const hz = Math.max(-330, Math.min(210, b.eye[2] + dir[2] * t));
  return { x: hx, z: hz };
}

function initTheme() {
  const btn = document.getElementById("theme-toggle");
  const paint = () => {
    const isDark = document.documentElement.dataset.theme !== "light";
    if (btn) btn.textContent = isDark ? "☀️ 라이트" : "🌙 다크";
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.content = isDark ? "#090d13" : "#fcfaf6";
    });
  };
  btn?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    paint();
  });
  paint();
}

function bindEvents() {
  document.querySelectorAll(".sc-zone-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchZone(btn.dataset.zone, true, true));
  });

  document.getElementById("btn-reroll-avatar")?.addEventListener("click", () => {
    const id = randomIdentity(Math.floor(Math.random() * 0xffffffff));
    USER.name = id.name;
    saveUserState();
    updateTopStats();
    PLAYER.bubbleText = `닉네임 변경: ${USER.name}`;
    PLAYER.bubbleUntil = performance.now() + 2500;
  });

  document.getElementById("btn-master-audio")?.addEventListener("click", () => {
    AUDIO.setMasterEnabled(!AUDIO.masterEnabled);
  });

  // Camera buttons
  document.querySelectorAll("[data-cam-mode]").forEach((btn) => {
    btn.addEventListener("click", () => setCameraMode(btn.dataset.camMode));
  });
  document.getElementById("btn-cam-zoom-in")?.addEventListener("click", () => {
    WORLD.cam.targetDist = Math.max(115, WORLD.cam.targetDist - 40);
  });
  document.getElementById("btn-cam-zoom-out")?.addEventListener("click", () => {
    WORLD.cam.targetDist = Math.min(540, WORLD.cam.targetDist + 40);
  });

  // In-game action buttons
  document.getElementById("btn-interact-zone")?.addEventListener("click", interactWithNearestLandmark);
  document.getElementById("btn-jump")?.addEventListener("click", triggerJump);
  document.querySelectorAll("[data-emote]").forEach((btn) => {
    btn.addEventListener("click", () => triggerEmote(Number(btn.dataset.emote)));
  });

  // Keyboard Controls
  window.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") return;

    if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
      if (e.code.startsWith("Arrow")) e.preventDefault();
      KEYS.add(e.code);
      return;
    }
    if (e.code === "Space") {
      if (tag === "BUTTON") return;
      e.preventDefault();
      triggerJump();
    } else if (e.code === "KeyE") {
      e.preventDefault();
      interactWithNearestLandmark();
    } else if (["Digit1", "Digit2", "Digit3", "Digit4"].includes(e.code)) {
      triggerEmote(Number(e.code.replace("Digit", "")));
    }
  });
  window.addEventListener("keyup", (e) => KEYS.delete(e.code));
  window.addEventListener("blur", () => KEYS.clear());

  // Canvas Orbit Drag & Click-to-Move
  const canvas = document.getElementById("sanctuary-canvas");
  canvas?.addEventListener("pointerdown", (ev) => {
    WORLD.dragging = true;
    WORLD.dragMoved = 0;
    WORLD.lastX = ev.clientX;
    WORLD.lastY = ev.clientY;
    canvas.setPointerCapture?.(ev.pointerId);
  });
  canvas?.addEventListener("pointermove", (ev) => {
    if (!WORLD.dragging) return;
    const dx = ev.clientX - WORLD.lastX;
    const dy = ev.clientY - WORLD.lastY;
    WORLD.dragMoved += Math.hypot(dx, dy);
    WORLD.lastX = ev.clientX;
    WORLD.lastY = ev.clientY;
    WORLD.cam.targetYaw -= dx * 0.008;
    WORLD.cam.targetPitch = Math.max(0.12, Math.min(1.15, WORLD.cam.targetPitch + dy * 0.006));
  });
  const endDrag = (ev) => {
    if (!WORLD.dragging) return;
    WORLD.dragging = false;
    if (WORLD.dragMoved > 6) return;

    const rect = canvas.getBoundingClientRect();
    const hit = intersectGround(ev.clientX - rect.left, ev.clientY - rect.top);
    if (hit) {
      PLAYER.clickTarget = hit;
      const detail = document.getElementById("station-detail");
      if (detail) detail.textContent = `목표 좌표 (${Math.round(hit.x)}, ${Math.round(hit.z)})(으)로 이동 중…`;
    }
  };
  canvas?.addEventListener("pointerup", endDrag);
  canvas?.addEventListener("pointercancel", () => { WORLD.dragging = false; });
  canvas?.addEventListener("wheel", (ev) => {
    ev.preventDefault();
    WORLD.cam.targetDist = Math.max(115, Math.min(540, WORLD.cam.targetDist + ev.deltaY * 0.35));
  }, { passive: false });

  // Dock Panel Actions
  document.getElementById("btn-overclock")?.addEventListener("click", activateOverclock);
  ["beacon-subject", "beacon-context", "beacon-wish"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", updateBeaconPreview);
  });
  document.getElementById("btn-launch-beacon")?.addEventListener("click", () => {
    const s = BEACON_SUBJECTS[Number(document.getElementById("beacon-subject")?.value || 0)];
    const c = BEACON_CONTEXTS[Number(document.getElementById("beacon-context")?.value || 0)];
    const w = BEACON_WISHES[Number(document.getElementById("beacon-wish")?.value || 0)];
    const text = `${s} ${c} ${w}`;
    USER.drones.unshift({ author: USER.name, text, ago: "방금" });
    USER.drones = USER.drones.slice(0, 12);
    saveUserState();
    renderDrones();
    spawn3DDrone(text, true);
    spawn3DRipple(0, 0, "emerald", 150);
    AUDIO.playOverclock();
  });

  document.getElementById("faction-grid")?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-join-faction]");
    if (btn) joinFaction(btn.dataset.joinFaction);
  });

  document.getElementById("btn-pull-gacha")?.addEventListener("click", pullOpenSourceGacha);
  document.getElementById("btn-brew-espresso")?.addEventListener("click", brewEspressoAndDropBeat);
  document.getElementById("btn-drop-beat")?.addEventListener("click", () => {
    AUDIO.setMasterEnabled(true);
    spawn3DRipple(LANDMARKS.dj.x, LANDMARKS.dj.z, "amber", 150);
    PLAYER.bubbleText = "🎧 사이버 신스 ON!";
    PLAYER.bubbleUntil = performance.now() + 3000;
  });

  document.querySelectorAll("[data-sound-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.soundPreset;
      const preset = SOUND_PRESETS[key];
      if (!preset) return;
      USER.mixer = { ...preset };
      saveUserState();
      renderMixer();
      AUDIO.setMasterEnabled(key !== "mute");
      document.querySelectorAll("[data-sound-preset]").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.soundPreset === key);
      });
    });
  });

  const mixerList = document.getElementById("mixer-list");
  mixerList?.addEventListener("input", (ev) => {
    const range = ev.target.closest("input[data-ch-range]");
    if (!range) return;
    const chId = range.dataset.chRange;
    const val = Number(range.value);
    USER.mixer[chId] = val;
    saveUserState();
    if (val > 0 && !AUDIO.masterEnabled) AUDIO.setMasterEnabled(true);
    else AUDIO.syncMixer();
    const toggleBtn = mixerList.querySelector(`button[data-ch-toggle="${chId}"]`);
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", val > 0 ? "true" : "false");
      toggleBtn.textContent = val > 0 ? `${val}%` : "OFF";
    }
  });
  mixerList?.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-ch-toggle]");
    if (!btn) return;
    const chId = btn.dataset.chToggle;
    const cur = Number(USER.mixer[chId] || 0);
    const next = cur > 0 ? 0 : (MIXER_CHANNELS.find((c) => c.id === chId)?.defaultVol || 35);
    USER.mixer[chId] = next;
    saveUserState();
    renderMixer();
    if (next > 0 && !AUDIO.masterEnabled) AUDIO.setMasterEnabled(true);
    else AUDIO.syncMixer();
  });
}

function startLoops() {
  const tick = (now) => {
    render3DWorld(now);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  setInterval(() => {
    buildRoamingNPCs(getKstNow());
    updateTopStats();
  }, 60000);
}

function init() {
  initTheme();
  const initialZone = new URLSearchParams(window.location.search).get("zone") || "fountain";
  const kst = getKstNow();

  init3DStars();
  buildRoamingNPCs(kst);
  populateBeaconSelects();
  renderDrones();
  USER.drones.slice(0, 3).forEach((d) => spawn3DDrone(d.text, true));
  spawn3DDrone("🚀 클로드 코드 에이전트 풀가동 중!", false);
  spawn3DDrone("🕹️ 오늘의 스타보드 캡슐 대박 기원", false);

  renderArenaFactions();
  renderGachaUI();
  renderMixer();
  updateEspressoUI();
  updateTopStats();
  updateAudioButtonUI();
  bindEvents();
  switchZone(initialZone, false, initialZone !== "fountain");
  loadLiveWorldData();
  startLoops();
}

init();
