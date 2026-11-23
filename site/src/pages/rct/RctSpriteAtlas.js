/**
 * Clean-Room 1999 High-Detail 256-Color Dithered Isometric Pixel Sprite Atlas
 * Pre-bakes rich Simon-Foster-inspired terrain, stratified cliffs, 3D curbed paths,
 * lush multi-tone trees, ornate fountains, detailed shop stalls, and Victorian castle entrance.
 */

import { ISO_METRICS } from "./RctConstants.js";

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function insideDiamond(px, py, cx, cy, halfW, halfH) {
  return Math.abs(px - cx) / halfW + Math.abs(py - cy) / halfH <= 1.001;
}

function fillIsoPrism(ctx, cx, topY, rx, ry, h, topCol, leftCol, rightCol, outline = "#111827") {
  // Left face
  ctx.fillStyle = leftCol;
  ctx.beginPath();
  ctx.moveTo(cx - rx, topY + ry);
  ctx.lineTo(cx, topY + ry * 2);
  ctx.lineTo(cx, topY + ry * 2 + h);
  ctx.lineTo(cx - rx, topY + ry + h);
  ctx.closePath();
  ctx.fill();

  // Right face (shaded)
  ctx.fillStyle = rightCol;
  ctx.beginPath();
  ctx.moveTo(cx, topY + ry * 2);
  ctx.lineTo(cx + rx, topY + ry);
  ctx.lineTo(cx + rx, topY + ry + h);
  ctx.lineTo(cx, topY + ry * 2 + h);
  ctx.closePath();
  ctx.fill();

  // Top diamond
  ctx.fillStyle = topCol;
  ctx.beginPath();
  ctx.moveTo(cx, topY);
  ctx.lineTo(cx + rx, topY + ry);
  ctx.lineTo(cx, topY + ry * 2);
  ctx.lineTo(cx - rx, topY + ry);
  ctx.closePath();
  ctx.fill();

  // Crisp 1px pixel ink edge
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, topY);
    ctx.lineTo(cx + rx, topY + ry);
    ctx.lineTo(cx + rx, topY + ry + h);
    ctx.lineTo(cx, topY + ry * 2 + h);
    ctx.lineTo(cx - rx, topY + ry + h);
    ctx.lineTo(cx - rx, topY + ry);
    ctx.closePath();
    ctx.stroke();
  }
}

export class RctSpriteAtlas {
  constructor() {
    this.terrain = {};
    this.waterFrames = [];
    this.cliffLeft = null;
    this.cliffRight = null;
    this.paths = {};
    this.scenery = {};
    this.shops = {};
    this.entrance = null;
    this._baked = false;
  }

  ensureBaked() {
    if (this._baked) return;
    this._baked = true;
    this._bakeTerrain();
    this._bakeWater();
    this._bakeCliffs();
    this._bakePaths();
    this._bakeScenery();
    this._bakeShops();
    this._bakeEntrance();
  }

  _bakeTerrain() {
    const W = ISO_METRICS.TILE_W;
    const H = ISO_METRICS.TILE_H;
    const themes = {
      grass_0: { base: [74, 134, 54], dark: [56, 108, 40], hi: [96, 158, 70], accent: [122, 176, 82] },
      grass_1: { base: [68, 126, 48], dark: [52, 100, 36], hi: [88, 148, 64], accent: [114, 168, 76] },
      sand_0: { base: [216, 180, 108], dark: [188, 148, 82], hi: [232, 198, 128], accent: [244, 214, 150] },
      sand_1: { base: [206, 170, 98], dark: [178, 138, 76], hi: [222, 188, 118], accent: [236, 206, 140] },
      dirt_0: { base: [138, 98, 60], dark: [108, 74, 42], hi: [158, 114, 72], accent: [176, 132, 88] },
      rock_0: { base: [112, 118, 126], dark: [84, 90, 98], hi: [136, 142, 150], accent: [158, 164, 172] },
    };

    for (const [key, pal] of Object.entries(themes)) {
      const { c, ctx } = makeCanvas(W, H);
      const img = ctx.createImageData(W, H);
      const d = img.data;
      const isGrass = key.startsWith("grass");

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!insideDiamond(x + 0.5, y + 0.5, W * 0.5, H * 0.5, W * 0.5, H * 0.5)) continue;
          const b = BAYER4[y & 3][x & 3];
          const hash = ((x * 73 + y * 37) ^ (x * y * 11)) & 63;

          let col = pal.base;
          if (hash > 48 && b > 8) col = pal.hi;
          else if (hash < 16 && b < 7) col = pal.dark;
          else if (hash === 29 || hash === 41) col = pal.accent;

          // Subtle directional sunlit bevel on isometric diamond rim
          const distEdge = Math.abs(x + 0.5 - W * 0.5) / (W * 0.5) + Math.abs(y + 0.5 - H * 0.5) / (H * 0.5);
          let shade = 0;
          if (distEdge > 0.94) {
            shade = y < H * 0.5 ? 14 : -16;
          }

          // Micro grass blade / clover speckle
          if (isGrass && ((x * 19 + y * 29) % 47 === 0)) {
            col = [152, 198, 92];
          }

          const idx = (y * W + x) * 4;
          d[idx] = Math.max(0, Math.min(255, col[0] + shade));
          d[idx + 1] = Math.max(0, Math.min(255, col[1] + shade));
          d[idx + 2] = Math.max(0, Math.min(255, col[2] + shade));
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      this.terrain[key] = c;
    }
  }

  _bakeWater() {
    const W = ISO_METRICS.TILE_W;
    const H = ISO_METRICS.TILE_H;
    for (let f = 0; f < 4; f++) {
      const { c, ctx } = makeCanvas(W, H);
      const img = ctx.createImageData(W, H);
      const d = img.data;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!insideDiamond(x + 0.5, y + 0.5, W * 0.5, H * 0.5, W * 0.5, H * 0.5)) continue;
          const wave = Math.sin((x + f * 5) * 0.34 + y * 0.52) + Math.cos((x - f * 4) * 0.22 - y * 0.3);
          const sparkle = wave > 1.38 && ((x + y + f * 2) % 7 === 0);
          const idx = (y * W + x) * 4;

          if (sparkle) {
            d[idx] = 224;
            d[idx + 1] = 248;
            d[idx + 2] = 255;
            d[idx + 3] = 245;
          } else {
            const band = wave > 0.25 ? 14 : wave < -0.5 ? -8 : 0;
            d[idx] = 32 + band;
            d[idx + 1] = 120 + band;
            d[idx + 2] = 182 + band;
            d[idx + 3] = 228;
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      this.waterFrames.push(c);
    }
  }

  _bakeCliffs() {
    const hw = ISO_METRICS.TILE_W * 0.5;
    const step = ISO_METRICS.HEIGHT_STEP_PX;

    const bakeSide = (isLeft) => {
      const { c, ctx } = makeCanvas(hw, step * 2);
      const img = ctx.createImageData(hw, step * 2);
      const d = img.data;
      for (let x = 0; x < hw; x++) {
        const yStart = isLeft ? Math.floor((x / hw) * step) : Math.floor(((hw - 1 - x) / hw) * step);
        for (let y = yStart; y < yStart + step; y++) {
          const depth = y - yStart;
          const b = BAYER4[y & 3][x & 3];
          const strata = Math.sin(depth * 0.8 + x * 0.25) > 0.5 ? -14 : 6;
          const crack = (x * 13 + depth * 7) % 23 === 0 ? -24 : 0;

          let base = isLeft ? [118, 86, 54] : [86, 62, 38];
          // Top 2px turf overhang lip
          if (depth < 2) {
            base = isLeft ? [64, 118, 46] : [48, 92, 34];
          }
          const delta = depth < 2 ? 0 : strata + crack + (b > 11 ? 8 : -4);

          const idx = (y * hw + x) * 4;
          d[idx] = Math.max(0, Math.min(255, base[0] + delta));
          d[idx + 1] = Math.max(0, Math.min(255, base[1] + delta));
          d[idx + 2] = Math.max(0, Math.min(255, base[2] + delta));
          d[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      return c;
    };

    this.cliffLeft = bakeSide(true);
    this.cliffRight = bakeSide(false);
  }

  _bakePaths() {
    const W = ISO_METRICS.TILE_W;
    const H = ISO_METRICS.TILE_H;
    const styles = {
      tarmac: { fill: "#626c7a", hi: "#8c96a6", curb: "#3b424d", border: "#1f242c" },
      dirt: { fill: "#a67442", hi: "#c4925a", curb: "#694624", border: "#3d2712" },
      crazy: { fill: "#9aa5b4", hi: "#d2dbe6", curb: "#586270", border: "#2c333d" },
      queue: { fill: "#2858b8", hi: "#6090ec", curb: "#163370", border: "#0c1d45" },
    };

    for (const [type, st] of Object.entries(styles)) {
      this.paths[type] = [];
      for (let mask = 0; mask < 16; mask++) {
        const { c, ctx } = makeCanvas(W, H);

        const drawIsoQuad = (pts, fillStyle, strokeStyle = null) => {
          ctx.fillStyle = fillStyle;
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
          ctx.closePath();
          ctx.fill();
          if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        };

        // Drop shadow under elevated path slab
        drawIsoQuad([[32, 4], [59, 17], [32, 30], [5, 17]], "rgba(0,0,0,0.28)");
        // Outer stone curb
        drawIsoQuad([[32, 2], [58, 15], [32, 28], [6, 15]], st.curb, st.border);
        // Inner paved surface
        drawIsoQuad([[32, 4], [55, 15], [32, 26], [9, 15]], st.fill);

        // Directional arms matching rotated mask (N=1, E=2, S=4, W=8)
        if (mask & 1) {
          drawIsoQuad([[32, 0], [48, 7], [36, 13], [20, 6]], st.curb);
          drawIsoQuad([[32, 1], [46, 7], [34, 13], [22, 6]], st.fill);
        }
        if (mask & 2) {
          drawIsoQuad([[45, 8], [64, 15], [51, 22], [35, 15]], st.curb);
          drawIsoQuad([[46, 9], [62, 15], [51, 21], [37, 15]], st.fill);
        }
        if (mask & 4) {
          drawIsoQuad([[31, 17], [46, 24], [32, 32], [17, 24]], st.curb);
          drawIsoQuad([[31, 18], [44, 24], [32, 31], [19, 24]], st.fill);
        }
        if (mask & 8) {
          drawIsoQuad([[13, 8], [29, 15], [17, 22], [0, 15]], st.curb);
          drawIsoQuad([[14, 9], [27, 15], [16, 21], [2, 15]], st.fill);
        }

        // Cobblestone / flagstone / asphalt texture details
        if (type === "crazy") {
          ctx.strokeStyle = st.curb;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(22, 12); ctx.lineTo(38, 20);
          ctx.moveTo(42, 12); ctx.lineTo(24, 20);
          ctx.stroke();
          ctx.fillStyle = st.hi;
          ctx.fillRect(28, 10, 4, 2);
          ctx.fillRect(36, 16, 5, 2);
          ctx.fillRect(21, 16, 4, 2);
        } else if (type === "tarmac") {
          ctx.fillStyle = st.hi;
          for (let i = 0; i < 10; i++) {
            ctx.fillRect(19 + ((i * 13) % 26), 10 + ((i * 7) % 10), 1, 1);
          }
        } else if (type === "queue") {
          // Bright metallic queue railings + yellow accent caps
          ctx.fillStyle = "#e2e8f0";
          for (const [px, py] of [[16, 13], [32, 7], [48, 13], [32, 21]]) {
            ctx.fillRect(px, py - 5, 2, 6);
            ctx.fillStyle = "#fde047";
            ctx.fillRect(px, py - 6, 2, 2);
            ctx.fillStyle = "#e2e8f0";
          }
          ctx.strokeStyle = "#94a3b8";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(17, 9); ctx.lineTo(32, 3); ctx.lineTo(48, 9);
          ctx.stroke();
        }
        this.paths[type][mask] = c;
      }
    }
  }

  _bakeScenery() {
    // Detailed 5-tier Pine Tree
    {
      const { c, ctx } = makeCanvas(56, 76);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(28, 66, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#4a2e16";
      ctx.fillRect(25, 52, 6, 14);
      const tiers = [
        [28, 8, 7, "#164e37", "#237852", "#359d6d"],
        [28, 16, 11, "#144530", "#1e6646", "#2d8a60"],
        [28, 25, 14, "#123c2a", "#1b593d", "#277953"],
        [28, 35, 17, "#0f3324", "#174d34", "#216948"],
        [28, 44, 19, "#0d2b1e", "#14422c", "#1c5a3e"],
      ];
      for (const [cx, top, r, dark, mid, hi] of tiers) {
        ctx.fillStyle = dark;
        ctx.beginPath();
        ctx.moveTo(cx, top); ctx.lineTo(cx + r, top + 16); ctx.lineTo(cx - r, top + 16);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = mid;
        ctx.beginPath();
        ctx.moveTo(cx, top); ctx.lineTo(cx + 2, top + 16); ctx.lineTo(cx - r, top + 16);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = hi;
        ctx.beginPath();
        ctx.moveTo(cx, top); ctx.lineTo(cx - 2, top + 12); ctx.lineTo(cx - r + 2, top + 14);
        ctx.closePath(); ctx.fill();
      }
      this.scenery.tree_pine = c;
    }

    // Lush Multi-Cluster Oak Tree
    {
      const { c, ctx } = makeCanvas(60, 74);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(30, 64, 15, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // Trunk + roots
      ctx.fillStyle = "#5c381c";
      ctx.fillRect(26, 40, 8, 24);
      ctx.fillStyle = "#7c4e29";
      ctx.fillRect(27, 42, 3, 21);
      // Foliage clusters back-to-front
      const clusters = [
        [30, 32, 16, "#14532d"],
        [18, 29, 11, "#166534"],
        [42, 30, 11, "#14532d"],
        [26, 22, 13, "#15803d"],
        [35, 22, 11, "#16a34a"],
        [25, 17, 9, "#22c55e"],
        [29, 14, 7, "#4ade80"],
      ];
      for (const [bx, by, br, col] of clusters) {
        ctx.fillStyle = "#0b2e19";
        ctx.beginPath(); ctx.arc(bx, by, br + 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
      this.scenery.tree_oak = c;
    }

    // Tropical Palm Tree
    {
      const { c, ctx } = makeCanvas(58, 76);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath(); ctx.ellipse(29, 66, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7c4e28";
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(28, 64); ctx.quadraticCurveTo(22, 42, 31, 20); ctx.stroke();
      ctx.strokeStyle = "#a16b3b";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(27, 64); ctx.quadraticCurveTo(21, 42, 30, 20); ctx.stroke();
      // Coconuts
      ctx.fillStyle = "#451a03";
      ctx.fillRect(28, 20, 4, 4); ctx.fillRect(32, 21, 3, 3);
      // Layered Fronds
      const fronds = [[-20, -4], [20, -3], [-16, 9], [18, 9], [-8, -14], [10, -13], [0, 12]];
      for (const [dx, dy] of fronds) {
        ctx.strokeStyle = "#15803d";
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(31, 20); ctx.quadraticCurveTo(31 + dx * 0.55, 11, 31 + dx, 21 + dy); ctx.stroke();
        ctx.strokeStyle = "#4ade80";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(31, 19); ctx.quadraticCurveTo(31 + dx * 0.55, 10, 31 + dx, 20 + dy); ctx.stroke();
      }
      this.scenery.tree_palm = c;
    }

    // Flowerbed Planter
    {
      const { c, ctx } = makeCanvas(52, 34);
      fillIsoPrism(ctx, 26, 8, 18, 9, 5, "#422c18", "#78350f", "#5c270b");
      ctx.fillStyle = "#15803d";
      ctx.beginPath(); ctx.moveTo(26, 10); ctx.lineTo(40, 17); ctx.lineTo(26, 24); ctx.lineTo(12, 17); ctx.closePath(); ctx.fill();
      const palette = ["#f43f5e", "#facc15", "#e879f9", "#fb923c", "#38bdf8", "#ffffff"];
      for (let r = 0; r < 14; r++) {
        ctx.fillStyle = palette[r % palette.length];
        const fx = 16 + ((r * 5) % 20);
        const fy = 13 + ((r * 3) % 8);
        ctx.fillRect(fx, fy, 2, 2);
      }
      this.scenery.flowerbed = c;
    }

    // 3-Tier Ornate Stone Fountain
    {
      const { c, ctx } = makeCanvas(58, 56);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath(); ctx.ellipse(29, 44, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
      // Stone rim
      ctx.fillStyle = "#64748b";
      ctx.beginPath(); ctx.ellipse(29, 40, 21, 10, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#cbd5e1";
      ctx.beginPath(); ctx.ellipse(29, 38, 20, 9.5, 0, 0, Math.PI * 2); ctx.fill();
      // Pool
      ctx.fillStyle = "#0284c7";
      ctx.beginPath(); ctx.ellipse(29, 38, 16, 7.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#38bdf8";
      ctx.beginPath(); ctx.ellipse(29, 37, 13, 5.5, 0, 0, Math.PI * 2); ctx.fill();
      // Pedestal & Upper Basin
      ctx.fillStyle = "#94a3b8";
      ctx.fillRect(26, 22, 6, 16);
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath(); ctx.ellipse(29, 24, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      // Water spray jets
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(28, 9, 2, 15);
      ctx.fillRect(23, 14, 12, 2);
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(21, 18, 2, 16);
      ctx.fillRect(35, 18, 2, 16);
      this.scenery.fountain = c;
    }

    // Golden Founder Statue
    {
      const { c, ctx } = makeCanvas(50, 64);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath(); ctx.ellipse(25, 54, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      fillIsoPrism(ctx, 25, 34, 11, 5.5, 14, "#cbd5e1", "#94a3b8", "#64748b");
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(21, 18, 8, 18);
      ctx.fillStyle = "#fde047";
      ctx.fillRect(22, 19, 4, 15);
      ctx.beginPath(); ctx.arc(25, 13, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(29, 20, 5, 2);
      this.scenery.statue_sawyer = c;
    }

    // Steel-Truss AI Weekly Portal Billboard
    {
      const { c, ctx } = makeCanvas(62, 62);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(31, 52, 18, 7, 0, 0, Math.PI * 2); ctx.fill();
      // Truss pillars
      ctx.fillStyle = "#334155";
      ctx.fillRect(14, 34, 4, 18);
      ctx.fillRect(44, 34, 4, 18);
      // LED frame
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(7, 9, 48, 28);
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 10, 46, 26);
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(11, 13, 40, 20);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(13, 15, 36, 6);
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(13, 25, 18, 4);
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(34, 25, 14, 4);
      this.scenery.ai_billboard = c;
    }
  }

  _bakeShops() {
    const drawBaseBooth = (ctx, wallL, wallR, roofTop, awningA, awningB) => {
      // Ground shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(32, 64, 25, 11, 0, 0, Math.PI * 2); ctx.fill();
      // 3D Isometric building block
      fillIsoPrism(ctx, 32, 32, 22, 11, 20, roofTop, wallL, wallR);
      // Striped shop awning over left front wall
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 === 0 ? awningA : awningB;
        ctx.beginPath();
        ctx.moveTo(11 + i * 5, 43 + i * 2.5);
        ctx.lineTo(16 + i * 5, 45.5 + i * 2.5);
        ctx.lineTo(14 + i * 5, 51 + i * 2.5);
        ctx.lineTo(9 + i * 5, 48.5 + i * 2.5);
        ctx.closePath();
        ctx.fill();
      }
      // Counter window & vendor silhouette
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(15, 49, 11, 8);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(16, 50, 9, 5);
      ctx.fillStyle = "#334155";
      ctx.fillRect(19, 51, 3, 4);
    };

    // Burger Bar
    {
      const { c, ctx } = makeCanvas(64, 78);
      drawBaseBooth(ctx, "#d97706", "#92400e", "#b45309", "#ef4444", "#ffffff");
      // Giant 3D sesame burger roof
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath(); ctx.ellipse(32, 36, 17, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#451a03";
      ctx.fillRect(16, 30, 32, 6);
      ctx.fillStyle = "#facc15"; // Melted cheese
      ctx.fillRect(18, 29, 28, 2);
      ctx.fillStyle = "#22c55e"; // Lettuce
      ctx.fillRect(17, 27, 30, 2);
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.ellipse(32, 25, 16, 11, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fef3c7";
      for (const [sx, sy] of [[24, 18], [31, 16], [38, 19], [28, 22], [35, 21]]) {
        ctx.fillRect(sx, sy, 2, 1.5);
      }
      this.shops.burger_bar = c;
    }

    // Drinks Stall
    {
      const { c, ctx } = makeCanvas(64, 78);
      drawBaseBooth(ctx, "#0284c7", "#075985", "#0369a1", "#38bdf8", "#ffffff");
      // Giant striped soda cup
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(23, 17, 18, 20);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(23, 21, 18, 4);
      ctx.fillRect(23, 29, 18, 4);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillRect(21, 15, 22, 3);
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(32, 15); ctx.lineTo(35, 7); ctx.lineTo(44, 5); ctx.stroke();
      this.shops.drink_stall = c;
    }

    // Balloon Stall
    {
      const { c, ctx } = makeCanvas(64, 78);
      drawBaseBooth(ctx, "#db2777", "#831843", "#be185d", "#ec4899", "#fde047");
      const bs = [
        [20, 18, "#ef4444"], [29, 10, "#3b82f6"], [39, 14, "#facc15"],
        [25, 22, "#22c55e"], [35, 21, "#a855f7"], [43, 22, "#38bdf8"],
      ];
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      for (const [bx, by, col] of bs) {
        ctx.beginPath(); ctx.moveTo(32, 36); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx - 2, by - 2, 1.5, 1.5);
      }
      this.shops.balloon_stall = c;
    }

    // Info Kiosk
    {
      const { c, ctx } = makeCanvas(64, 78);
      drawBaseBooth(ctx, "#e2e8f0", "#94a3b8", "#b91c1c", "#dc2626", "#ffffff");
      ctx.fillStyle = "#dc2626";
      ctx.beginPath(); ctx.arc(32, 32, 14, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "center";
      ctx.fillText("?", 32, 30);
      this.shops.info_kiosk = c;
    }

    // Restroom
    {
      const { c, ctx } = makeCanvas(64, 78);
      drawBaseBooth(ctx, "#94a3b8", "#475569", "#2563eb", "#3b82f6", "#e2e8f0");
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(22, 26, 20, 12);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("WC", 32, 36);
      this.shops.restroom = c;
    }

    // First Aid
    {
      const { c, ctx } = makeCanvas(64, 78);
      drawBaseBooth(ctx, "#f8fafc", "#cbd5e1", "#e2e8f0", "#ef4444", "#ffffff");
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(29, 21, 6, 16);
      ctx.fillRect(24, 26, 16, 6);
      this.shops.first_aid = c;
    }

    // ATM
    {
      const { c, ctx } = makeCanvas(64, 78);
      drawBaseBooth(ctx, "#1e40af", "#172554", "#2563eb", "#1d4ed8", "#22c55e");
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(23, 25, 18, 11);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ATM", 32, 34);
      this.shops.atm = c;
    }
  }

  _bakeEntrance() {
    const { c, ctx } = makeCanvas(84, 82);
    // Twin stone castle towers with battlements & red pennants
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath(); ctx.ellipse(42, 70, 32, 12, 0, 0, Math.PI * 2); ctx.fill();

    // Left & Right Stone Towers
    fillIsoPrism(ctx, 18, 26, 10, 5, 34, "#94a3b8", "#78350f", "#5c270b");
    fillIsoPrism(ctx, 66, 26, 10, 5, 34, "#94a3b8", "#78350f", "#5c270b");

    // Red pointed roofs on twin towers
    for (const tx of [18, 66]) {
      ctx.fillStyle = "#b91c1c";
      ctx.beginPath(); ctx.moveTo(tx, 10); ctx.lineTo(tx + 11, 26); ctx.lineTo(tx - 11, 26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.fillRect(tx - 1, 6, 2, 6);
    }

    // Turnstiles inside gate
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(30, 54, 24, 6);
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(34, 52, 3, 6);
    ctx.fillRect(46, 52, 3, 6);

    // Grand Marquee Arch Banner
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(14, 16, 56, 16);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 17, 54, 14);
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 8px monospace";
    ctx.textAlign = "center";
    ctx.fillText("AI WEEKLY", 42, 28);
    this.entrance = c;
  }
}
