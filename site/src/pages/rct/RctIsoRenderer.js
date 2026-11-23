/**
 * Clean-Room 1999 High-Detail 2:1 Isometric Canvas Renderer
 * Features 3D dual-rail coaster tracks with crossties, full lattice trestles,
 * articulated multi-car trains, detailed 2x2 ride plazas, and lively peeps/staff.
 */

import { ISO_METRICS, DIR_DX, DIR_DY, RIDE_CATALOG, STAFF_TYPES } from "./RctConstants.js";
import { worldToIso, isoToWorld } from "./RctCoasterEngine.js";
import { RctSpriteAtlas } from "./RctSpriteAtlas.js";

const PEEP_HAIR_COLORS = ["#1e293b", "#451a03", "#78350f", "#ca8a04", "#9a3412"];

export class RctIsoRenderer {
  constructor(canvas, simulation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.sim = simulation;
    this.atlas = new RctSpriteAtlas();

    this.rotation = 0; // 0..3 (90 deg steps)
    this.zoom = 1.25;
    this.camX = 0;
    this.camY = 210;

    this.seeThroughRides = false;
    this.seeThroughScenery = false;
    this.showGrid = false;
    this.showHeightMarks = false;

    this.hoverTile = null;
    this.activeTool = { type: "inspect", subId: null, facing: 0 };
    this.pincerCarry = null;
    this.customCoasterId = null;

    this._hitBoxes = [];
    this._rainDrops = Array.from({ length: 65 }, () => ({
      x: Math.random(),
      y: Math.random(),
      speed: 0.75 + Math.random() * 0.55,
    }));

    this.centerOnTile(14, 15);
  }

  centerOnTile(tileX, tileY) {
    const t = this.sim.getTile(tileX, tileY);
    const iso = worldToIso(tileX, tileY, t ? t.height : 2, this.rotation, this.sim.mapSize);
    this.camX = iso.screenX;
    this.camY = iso.screenY;
  }

  rotateCamera(delta = 1) {
    this.rotation = (((this.rotation + delta) % 4) + 4) % 4;
  }

  zoomBy(factor, anchorCssX = null, anchorCssY = null) {
    const prevZoom = this.zoom;
    const nextZoom = Math.max(0.65, Math.min(2.6, prevZoom * factor));
    if (anchorCssX !== null && anchorCssY !== null) {
      const rect = this.canvas.getBoundingClientRect();
      const dx = anchorCssX - rect.width * 0.5;
      const dy = anchorCssY - rect.height * 0.5;
      this.camX += dx / prevZoom - dx / nextZoom;
      this.camY += dy / prevZoom - dy / nextZoom;
    }
    this.zoom = nextZoom;
  }

  screenToWorldIso(cssX, cssY) {
    const rect = this.canvas.getBoundingClientRect();
    const worldIsoX = (cssX - rect.width * 0.5) / this.zoom + this.camX;
    const worldIsoY = (cssY - rect.height * 0.5) / this.zoom + this.camY;
    return { worldIsoX, worldIsoY };
  }

  pickTileAtScreen(cssX, cssY) {
    const { worldIsoX, worldIsoY } = this.screenToWorldIso(cssX, cssY);
    return isoToWorld(
      worldIsoX,
      worldIsoY,
      this.rotation,
      this.sim.mapSize,
      (x, y) => {
        const t = this.sim.getTile(x, y);
        return t ? Math.max(t.height, t.waterHeight || 0) : 2;
      }
    );
  }

  pickEntityAtScreen(cssX, cssY) {
    for (let i = this._hitBoxes.length - 1; i >= 0; i--) {
      const hb = this._hitBoxes[i];
      if (cssX >= hb.x && cssX <= hb.x + hb.w && cssY >= hb.y && cssY <= hb.y + hb.h) {
        return hb;
      }
    }
    const tile = this.pickTileAtScreen(cssX, cssY);
    const tObj = this.sim.getTile(tile.tileX, tile.tileY);
    if (tObj?.rideId) {
      return { kind: "ride", id: tObj.rideId, tileX: tile.tileX, tileY: tile.tileY };
    }
    return { kind: "tile", tileX: tile.tileX, tileY: tile.tileY };
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(240, Math.round(rect.height));
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    return { w, h, dpr };
  }

  render(nowSec) {
    this.atlas.ensureBaked();
    const { w, h, dpr } = this.resize();
    this._hitBoxes = [];

    this.ctx.save();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    this._renderWorld({
      ctx: this.ctx,
      viewW: w,
      viewH: h,
      camX: this.camX,
      camY: this.camY,
      zoom: this.zoom,
      nowSec,
      collectHitboxes: true,
      drawOverlays: true,
    });

    this.ctx.restore();
  }

  renderMiniViewport(targetCanvas, worldTileX, worldTileY, heightZ = 2, nowSec = 0) {
    if (!targetCanvas) return;
    this.atlas.ensureBaked();
    const ctx = targetCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const iso = worldToIso(worldTileX, worldTileY, heightZ, this.rotation, this.sim.mapSize);
    this._renderWorld({
      ctx,
      viewW: targetCanvas.width,
      viewH: targetCanvas.height,
      camX: iso.screenX,
      camY: iso.screenY - 10,
      zoom: 1.55,
      nowSec,
      collectHitboxes: false,
      drawOverlays: false,
    });
  }

  _rotateMask(mask) {
    let out = 0;
    for (let i = 0; i < 4; i++) {
      if (mask & (1 << i)) {
        out |= 1 << ((i + this.rotation) % 4);
      }
    }
    return out;
  }

  _renderWorld({ ctx, viewW, viewH, camX, camY, zoom, nowSec, collectHitboxes, drawOverlays }) {
    ctx.fillStyle = this.sim.weather === "rain" ? "#131b24" : "#0e131b";
    ctx.fillRect(0, 0, viewW, viewH);

    const toScreenX = (isoX) => (isoX - camX) * zoom + viewW * 0.5;
    const toScreenY = (isoY) => (isoY - camY) * zoom + viewH * 0.5;

    const W = ISO_METRICS.TILE_W;
    const H = ISO_METRICS.TILE_H;
    const STEP = ISO_METRICS.HEIGHT_STEP_PX;
    const N = this.sim.mapSize;
    const waterFrame = Math.floor(nowSec * 3.8) % 4;

    const buckets = new Map();
    const pushBucket = (depth, item) => {
      const key = Math.max(0, Math.min(N * 2, Math.round(depth)));
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(item);
    };

    for (const ride of this.sim.rides) {
      if (ride.track) {
        for (const node of ride.track.nodes) {
          const iso1 = worldToIso(node.x, node.y, node.z, this.rotation, N);
          const iso2 = worldToIso(node.nextX, node.nextY, node.nextZ, this.rotation, N);
          pushBucket(Math.max(iso1.depthKey, iso2.depthKey), { type: "track", ride, node });
        }
        for (const train of ride.track.trains) {
          const baseDist = train.distance;
          for (let c = train.carCount - 1; c >= 0; c--) {
            const carDist = baseDist - c * 4.8;
            const pose = ride.track.samplePoseAtDistance(carDist);
            const ahead = ride.track.samplePoseAtDistance(carDist + 1.8);
            const behind = ride.track.samplePoseAtDistance(carDist - 1.8);
            const iso = worldToIso(pose.x, pose.y, pose.z, this.rotation, N);
            const isoAhead = worldToIso(ahead.x, ahead.y, ahead.z, this.rotation, N);
            const isoBehind = worldToIso(behind.x, behind.y, behind.z, this.rotation, N);
            const screenAngle = Math.atan2(isoAhead.screenY - isoBehind.screenY, isoAhead.screenX - isoBehind.screenX);
            pushBucket(iso.rX + iso.rY + 0.16, {
              type: "coaster_car",
              ride,
              pose,
              iso,
              screenAngle,
              isLead: c === 0,
            });
          }
        }
      } else if (ride.category !== "shop") {
        const frontIso = worldToIso(ride.x + ride.w - 1, ride.y + ride.h - 1, ride.z, this.rotation, N);
        const centerIso = worldToIso(ride.x + (ride.w - 1) * 0.5, ride.y + (ride.h - 1) * 0.5, ride.z, this.rotation, N);
        pushBucket(frontIso.depthKey, { type: "flat_ride", ride, iso: centerIso });
      }
    }

    for (const p of this.sim.peeps) {
      if (p.state === "riding") continue;
      const t = this.sim.getTile(Math.round(p.x), Math.round(p.y));
      const hz = t ? Math.max(t.height, t.waterHeight || 0) : 2;
      const iso = worldToIso(p.x, p.y, hz, this.rotation, N);
      pushBucket(iso.rX + iso.rY + 0.05, { type: "peep", peep: p, iso });
    }
    for (const s of this.sim.staff) {
      const t = this.sim.getTile(Math.round(s.x), Math.round(s.y));
      const hz = t ? Math.max(t.height, t.waterHeight || 0) : 2;
      const iso = worldToIso(s.x, s.y, hz, this.rotation, N);
      pushBucket(iso.rX + iso.rY + 0.08, { type: "staff", staff: s, iso });
    }

    const frontLeftOffset =
      this.rotation === 0 ? [0, 1] : this.rotation === 1 ? [1, 0] : this.rotation === 2 ? [0, -1] : [-1, 0];
    const frontRightOffset =
      this.rotation === 0 ? [1, 0] : this.rotation === 1 ? [0, -1] : this.rotation === 2 ? [-1, 0] : [0, 1];

    for (let depth = 0; depth <= (N - 1) * 2; depth++) {
      for (let rX = 0; rX < N; rX++) {
        const rY = depth - rX;
        if (rY < 0 || rY >= N) continue;

        const m = N - 1;
        const gx = this.rotation === 0 ? rX : this.rotation === 1 ? rY : this.rotation === 2 ? m - rX : m - rY;
        const gy = this.rotation === 0 ? rY : this.rotation === 1 ? m - rX : this.rotation === 2 ? m - rY : rX;
        const tile = this.sim.getTile(gx, gy);
        if (!tile) continue;

        const iso = worldToIso(tile.x, tile.y, tile.height, this.rotation, N);
        const sx = Math.round(toScreenX(iso.screenX - W * 0.5));
        const sy = Math.round(toScreenY(iso.screenY - H * 0.5));
        const dw = Math.round(W * zoom);
        const dh = Math.round(H * zoom);

        if (sx + dw < -45 || sx > viewW + 45 || sy + dh < -180 || sy > viewH + 180) continue;

        // 1. Stratified Cliffs
        const nLeft = this.sim.getTile(tile.x + frontLeftOffset[0], tile.y + frontLeftOffset[1]);
        const nRight = this.sim.getTile(tile.x + frontRightOffset[0], tile.y + frontRightOffset[1]);
        const leftTargetH = nLeft ? nLeft.height : 0;
        const rightTargetH = nRight ? nRight.height : 0;

        if (tile.height > leftTargetH) {
          const diff = tile.height - leftTargetH;
          for (let sIdx = 0; sIdx < diff; sIdx++) {
            ctx.drawImage(
              this.atlas.cliffLeft,
              sx,
              Math.round(sy + H * 0.5 * zoom + sIdx * STEP * zoom),
              Math.round(W * 0.5 * zoom),
              Math.round(STEP * 2 * zoom)
            );
          }
        }
        if (tile.height > rightTargetH) {
          const diff = tile.height - rightTargetH;
          for (let sIdx = 0; sIdx < diff; sIdx++) {
            ctx.drawImage(
              this.atlas.cliffRight,
              Math.round(sx + W * 0.5 * zoom),
              Math.round(sy + H * 0.5 * zoom + sIdx * STEP * zoom),
              Math.round(W * 0.5 * zoom),
              Math.round(STEP * 2 * zoom)
            );
          }
        }

        // 2. Terrain Diamond
        const variant = (tile.x + tile.y) & 1;
        const sprKey = `${tile.surface}_${tile.surface === "grass" || tile.surface === "sand" ? variant : 0}`;
        ctx.drawImage(this.atlas.terrain[sprKey] || this.atlas.terrain.grass_0, sx, sy, dw, dh);

        // Wooden Park Boundary Fence Posts on Park Perimeter
        if (tile.owned && (tile.x === 1 || tile.y === 1 || tile.x === N - 2 || tile.y === N - 2)) {
          ctx.strokeStyle = "rgba(250, 204, 21, 0.34)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + dw * 0.5, sy);
          ctx.lineTo(sx + dw, sy + dh * 0.5);
          ctx.lineTo(sx + dw * 0.5, sy + dh);
          ctx.lineTo(sx, sy + dh * 0.5);
          ctx.closePath();
          ctx.stroke();
        }

        if (this.showGrid) {
          ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sx + dw * 0.5, sy);
          ctx.lineTo(sx + dw, sy + dh * 0.5);
          ctx.lineTo(sx + dw * 0.5, sy + dh);
          ctx.lineTo(sx, sy + dh * 0.5);
          ctx.closePath();
          ctx.stroke();
        }

        if (this.showHeightMarks && tile.owned && (tile.x + tile.y) % 2 === 0) {
          ctx.fillStyle = "#fde047";
          ctx.font = `bold ${Math.max(8, Math.round(9 * zoom))}px monospace`;
          ctx.textAlign = "center";
          ctx.fillText(`${tile.height * 3}m`, sx + dw * 0.5, sy + dh * 0.56);
        }

        // 3. Water Surface
        let topSurfaceY = sy;
        if (tile.waterHeight > tile.height) {
          const wDiff = tile.waterHeight - tile.height;
          const wy = Math.round(sy - wDiff * STEP * zoom);
          ctx.fillStyle = "rgba(26, 92, 152, 0.58)";
          ctx.fillRect(sx + dw * 0.1, wy + dh * 0.5, dw * 0.8, wDiff * STEP * zoom);
          ctx.drawImage(this.atlas.waterFrames[waterFrame], sx, wy, dw, dh);
          topSurfaceY = wy;
        }

        // 4. Footpath + Bridge + Path Additions
        if (tile.path) {
          const rotMask = this._rotateMask(tile.path.mask);
          const pSpr = this.atlas.paths[tile.path.type]?.[rotMask] || this.atlas.paths.tarmac[rotMask];
          if (tile.waterHeight > tile.height) {
            ctx.fillStyle = "#78350f";
            ctx.fillRect(sx + dw * 0.22, topSurfaceY + dh * 0.5, 4 * zoom, 12 * zoom);
            ctx.fillRect(sx + dw * 0.72, topSurfaceY + dh * 0.5, 4 * zoom, 12 * zoom);
          }
          ctx.drawImage(pSpr, sx, topSurfaceY, dw, dh);

          if (tile.vomit > 0) {
            ctx.fillStyle = "#84cc16";
            ctx.beginPath();
            ctx.ellipse(sx + dw * 0.45, topSurfaceY + dh * 0.54, 4.5 * zoom, 2.5 * zoom, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#4d7c0f";
            ctx.fillRect(sx + dw * 0.48, topSurfaceY + dh * 0.52, 2 * zoom, 2 * zoom);
          }
          if (tile.litter > 0) {
            ctx.fillStyle = "#f8fafc";
            ctx.fillRect(sx + dw * 0.62, topSurfaceY + dh * 0.48, 3.5 * zoom, 2 * zoom);
            ctx.fillStyle = "#ef4444";
            ctx.fillRect(sx + dw * 0.64, topSurfaceY + dh * 0.49, 2 * zoom, 1.2 * zoom);
          }

          if (tile.pathAddition === "bench") {
            ctx.fillStyle = "#451a03";
            ctx.fillRect(sx + dw * 0.3, topSurfaceY + dh * 0.3, 13 * zoom, 4 * zoom);
            ctx.fillStyle = "#b45309";
            ctx.fillRect(sx + dw * 0.3, topSurfaceY + dh * 0.22, 13 * zoom, 3.5 * zoom);
            ctx.fillStyle = "#d97706";
            ctx.fillRect(sx + dw * 0.31, topSurfaceY + dh * 0.23, 11 * zoom, 1.5 * zoom);
          } else if (tile.pathAddition === "bin") {
            ctx.fillStyle = "#14532d";
            ctx.fillRect(sx + dw * 0.65, topSurfaceY + dh * 0.22, 6 * zoom, 9 * zoom);
            ctx.fillStyle = "#22c55e";
            ctx.fillRect(sx + dw * 0.66, topSurfaceY + dh * 0.24, 4 * zoom, 6 * zoom);
            ctx.fillStyle = "#facc15";
            ctx.fillRect(sx + dw * 0.64, topSurfaceY + dh * 0.2, 8 * zoom, 2.5 * zoom);
          } else if (tile.pathAddition === "lamp") {
            ctx.fillStyle = "#1e293b";
            ctx.fillRect(sx + dw * 0.21, topSurfaceY + dh * 0.02 - 14 * zoom, 2.8 * zoom, 18 * zoom);
            ctx.fillStyle = "rgba(254, 240, 138, 0.32)";
            ctx.beginPath();
            ctx.arc(sx + dw * 0.225, topSurfaceY + dh * 0.02 - 15 * zoom, 6 * zoom, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#fef08a";
            ctx.fillRect(sx + dw * 0.19, topSurfaceY + dh * 0.02 - 17 * zoom, 5 * zoom, 4 * zoom);
          }
        }

        // 5. Park Entrance Gate
        if (tile.x === this.sim.entrance.x && tile.y === this.sim.entrance.y) {
          const ew = this.atlas.entrance.width * zoom;
          const eh = this.atlas.entrance.height * zoom;
          ctx.drawImage(this.atlas.entrance, sx + dw * 0.5 - ew * 0.5, sy + dh * 0.72 - eh, ew, eh);
        }

        // 6. Scenery
        if (tile.scenery && !this.seeThroughScenery) {
          const scSpr = this.atlas.scenery[tile.scenery.id];
          if (scSpr) {
            const sw = scSpr.width * zoom;
            const sh = scSpr.height * zoom;
            ctx.drawImage(scSpr, sx + dw * 0.5 - sw * 0.5, sy + dh * 0.72 - sh, sw, sh);
            if (tile.scenery.id === "ai_billboard") {
              ctx.fillStyle = "#f8fafc";
              ctx.font = `bold ${Math.max(7, Math.round(7 * zoom))}px monospace`;
              ctx.textAlign = "center";
              const headline = this.sim.aiArchive.news[0]?.title_ko || "AI WEEKLY LIVE";
              ctx.fillText(headline.slice(0, 11), sx + dw * 0.5, sy + dh * 0.72 - sh + 22 * zoom);
            }
          }
        }

        // 7. 1x1 Shops
        if (tile.rideId) {
          const ride = this.sim.rides.find((r) => r.id === tile.rideId);
          if (ride && ride.category === "shop" && ride.x === tile.x && ride.y === tile.y && !this.seeThroughRides) {
            const sSpr = this.atlas.shops[ride.catalogId];
            if (sSpr) {
              const sw = sSpr.width * zoom;
              const sh = sSpr.height * zoom;
              const drawX = sx + dw * 0.5 - sw * 0.5;
              const drawY = sy + dh * 0.88 - sh;
              ctx.drawImage(sSpr, drawX, drawY, sw, sh);
              if (collectHitboxes) {
                this._hitBoxes.push({ kind: "ride", id: ride.id, x: drawX + 10 * zoom, y: drawY + 12 * zoom, w: sw - 20 * zoom, h: sh - 16 * zoom });
              }
            }
          }
        }
      }

      const list = buckets.get(depth);
      if (list) {
        for (const item of list) {
          if (item.type === "track" && !this.seeThroughRides) {
            this._drawTrackNode(ctx, item.ride, item.node, toScreenX, toScreenY, zoom, nowSec, collectHitboxes);
          } else if (item.type === "flat_ride" && !this.seeThroughRides) {
            this._drawFlatRide(ctx, item.ride, item.iso, toScreenX, toScreenY, zoom, nowSec, collectHitboxes);
          } else if (item.type === "coaster_car" && !this.seeThroughRides) {
            this._drawCoasterCar(ctx, item.ride, item.pose, item.iso, item.screenAngle, toScreenX, toScreenY, zoom, item.isLead, collectHitboxes);
          } else if (item.type === "peep") {
            this._drawPeep(ctx, item.peep, item.iso, toScreenX, toScreenY, zoom, nowSec, collectHitboxes);
          } else if (item.type === "staff") {
            this._drawStaff(ctx, item.staff, item.iso, toScreenX, toScreenY, zoom, collectHitboxes);
          }
        }
      }
    }

    for (const ft of this.sim.floatingTexts) {
      const iso = worldToIso(ft.tileX, ft.tileY, ft.heightZ, this.rotation, N);
      const fx = toScreenX(iso.screenX);
      const fy = toScreenY(iso.screenY);
      ctx.globalAlpha = Math.max(0, Math.min(1, ft.life / ft.maxLife));
      ctx.font = `bold ${Math.max(10, Math.round(12 * zoom))}px monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = "#090d13";
      ctx.fillText(ft.text, fx + 1, fy + 1);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, fx, fy);
      ctx.globalAlpha = 1;
    }

    if (drawOverlays && this.sim.weather === "rain") {
      ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
      ctx.fillRect(0, 0, viewW, viewH);
      ctx.strokeStyle = "rgba(186, 230, 253, 0.48)";
      ctx.lineWidth = 1;
      for (const drop of this._rainDrops) {
        const dx = (drop.x * viewW + nowSec * 120) % viewW;
        const dy = (drop.y * viewH + nowSec * 440 * drop.speed) % viewH;
        ctx.beginPath();
        ctx.moveTo(dx, dy);
        ctx.lineTo(dx - 3, dy + 11);
        ctx.stroke();
      }
    }

    if (drawOverlays && this.hoverTile) {
      this._drawToolOverlay(ctx, toScreenX, toScreenY, zoom);
    }
  }

  _drawDualRailSegment(ctx, x1, y1, x2, y2, zoom, def, piece, nowSec) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = (-dy / len) * 3.6 * zoom;
    const ny = (dx / len) * 3.6 * zoom;

    // 1. Lower box spine or wooden catwalk bed
    ctx.strokeStyle = def.id === "wooden_coaster" ? "#5c2e0e" : "#334155";
    ctx.lineWidth = Math.max(4, 7 * zoom);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x1, y1 + 1.5 * zoom);
    ctx.lineTo(x2, y2 + 1.5 * zoom);
    ctx.stroke();

    // 2. Perpendicular crossties (침목)
    const tieCount = Math.max(3, Math.floor(len / (6 * zoom)));
    ctx.strokeStyle = def.id === "wooden_coaster" ? "#78350f" : def.colorTrack;
    ctx.lineWidth = Math.max(1.5, 2.2 * zoom);
    for (let i = 0; i <= tieCount; i++) {
      const t = i / tieCount;
      const mx = x1 + dx * t;
      const my = y1 + dy * t;
      ctx.beginPath();
      ctx.moveTo(mx - nx * 1.45, my - ny * 1.45);
      ctx.lineTo(mx + nx * 1.45, my + ny * 1.45);
      ctx.stroke();
    }

    // 3. Left & Right twin running rails
    const railCol = piece.isBooster ? "#38bdf8" : piece.isBrake ? "#ef4444" : def.colorRail;
    ctx.strokeStyle = def.colorTrack;
    ctx.lineWidth = Math.max(1.8, 2.6 * zoom);
    ctx.beginPath();
    ctx.moveTo(x1 - nx, y1 - ny); ctx.lineTo(x2 - nx, y2 - ny);
    ctx.moveTo(x1 + nx, y1 + ny); ctx.lineTo(x2 + nx, y2 + ny);
    ctx.stroke();

    ctx.strokeStyle = railCol;
    ctx.lineWidth = Math.max(0.9, 1.3 * zoom);
    ctx.beginPath();
    ctx.moveTo(x1 - nx, y1 - ny - 0.5 * zoom); ctx.lineTo(x2 - nx, y2 - ny - 0.5 * zoom);
    ctx.moveTo(x1 + nx, y1 + ny - 0.5 * zoom); ctx.lineTo(x2 + nx, y2 + ny - 0.5 * zoom);
    ctx.stroke();

    // 4. Chain lift center trough & moving chain dots
    if (piece.hasChain) {
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = Math.max(1, 1.4 * zoom);
      ctx.beginPath();
      ctx.moveTo(x1 + nx * 1.6, y1 + ny * 1.6 - 4 * zoom);
      ctx.lineTo(x2 + nx * 1.6, y2 + ny * 1.6 - 4 * zoom);
      ctx.stroke();

      const pulse = (nowSec * 3.4) % 1;
      ctx.fillStyle = "#facc15";
      for (let k = 0; k < 4; k++) {
        const t = (k / 4 + pulse) % 1;
        ctx.fillRect(x1 + dx * t - 1.5 * zoom, y1 + dy * t - 1.5 * zoom, 3 * zoom, 2 * zoom);
      }
    }
  }

  _drawTrackNode(ctx, ride, node, toScreenX, toScreenY, zoom, nowSec, collectHitboxes) {
    const N = this.sim.mapSize;
    const def = RIDE_CATALOG[ride.catalogId] || RIDE_CATALOG.wooden_coaster;
    const groundTile = this.sim.getTile(node.x, node.y);
    const groundH = groundTile ? groundTile.height : 1;

    const p1 = worldToIso(node.x, node.y, node.z, this.rotation, N);
    const p2 = worldToIso(node.nextX, node.nextY, node.nextZ, this.rotation, N);
    const x1 = toScreenX(p1.screenX);
    const y1 = toScreenY(p1.screenY);
    const x2 = toScreenX(p2.screenX);
    const y2 = toScreenY(p2.screenY);

    const pG1 = worldToIso(node.x, node.y, groundH, this.rotation, N);
    const pG2 = worldToIso(node.nextX, node.nextY, groundH, this.rotation, N);
    const gy1 = toScreenY(pG1.screenY);
    const gy2 = toScreenY(pG2.screenY);

    // 1. Ground Shadow under elevated track
    if (node.z > groundH) {
      ctx.strokeStyle = "rgba(0, 0, 0, 0.24)";
      ctx.lineWidth = Math.max(3, 6 * zoom);
      ctx.beginPath();
      ctx.moveTo(toScreenX(pG1.screenX), gy1);
      ctx.lineTo(toScreenX(pG2.screenX), gy2);
      ctx.stroke();
    }

    // 2. Full 3D Trestle / Steel Supports with horizontal ledgers & X-bracing
    if (node.z > groundH || node.piece.isStation) {
      const levels = Math.max(1, node.z - groundH);
      const stepPx = (gy1 - y1) / levels;
      if (ride.catalogId === "wooden_coaster") {
        const hw = 7.5 * zoom;
        // Footing blocks
        ctx.fillStyle = "#64748b";
        ctx.fillRect(x1 - hw - 2, gy1 - 2, 4, 3);
        ctx.fillRect(x1 + hw - 2, gy1 - 2, 4, 3);
        // Main twin timber posts
        ctx.strokeStyle = "#6b3c1a";
        ctx.lineWidth = Math.max(1.5, 2.2 * zoom);
        ctx.beginPath();
        ctx.moveTo(x1 - hw, y1 + 3 * zoom); ctx.lineTo(x1 - hw, gy1);
        ctx.moveTo(x1 + hw, y1 + 3 * zoom); ctx.lineTo(x1 + hw, gy1);
        ctx.stroke();
        // Horizontal ledgers + X-bracing every elevation step
        ctx.strokeStyle = "#8f5324";
        ctx.lineWidth = Math.max(1, 1.3 * zoom);
        for (let lv = 0; lv < levels; lv++) {
          const topLv = y1 + 3 * zoom + lv * stepPx;
          const botLv = y1 + 3 * zoom + (lv + 1) * stepPx;
          ctx.beginPath();
          ctx.moveTo(x1 - hw, botLv); ctx.lineTo(x1 + hw, botLv);
          ctx.moveTo(x1 - hw, topLv); ctx.lineTo(x1 + hw, botLv);
          ctx.moveTo(x1 + hw, topLv); ctx.lineTo(x1 - hw, botLv);
          ctx.stroke();
        }
      } else {
        // Tubular steel column + footing + Y-yoke top bracket
        ctx.fillStyle = "#64748b";
        ctx.fillRect(x1 - 3 * zoom, gy1 - 2, 6 * zoom, 3);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = Math.max(2.5, 3.6 * zoom);
        ctx.beginPath();
        ctx.moveTo(x1, y1 + 3 * zoom); ctx.lineTo(x1, gy1);
        ctx.stroke();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = Math.max(1, 1.3 * zoom);
        ctx.beginPath();
        ctx.moveTo(x1 - 0.8 * zoom, y1 + 3 * zoom); ctx.lineTo(x1 - 0.8 * zoom, gy1);
        ctx.stroke();
      }
    }

    // 3. Track Segment Rendering
    if (node.piece.isLoop) {
      this._drawDualRailSegment(ctx, x1, y1, x2, y2, zoom, def, node.piece, nowSec);
      const mx = (x1 + x2) * 0.5;
      const my = (y1 + y2) * 0.5;
      const r = 24 * zoom;

      // Diagonal A-frame loop support struts
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = Math.max(2, 2.8 * zoom);
      ctx.beginPath();
      ctx.moveTo(mx - r * 0.7, my - r); ctx.lineTo(mx - r * 0.9, my + 2 * zoom);
      ctx.moveTo(mx + r * 0.7, my - r); ctx.lineTo(mx + r * 0.9, my + 2 * zoom);
      ctx.stroke();

      // Radial loop cross-ties
      ctx.strokeStyle = def.colorTrack;
      ctx.lineWidth = Math.max(1.2, 1.8 * zoom);
      for (let k = 0; k < 16; k++) {
        const a = (k * Math.PI * 2) / 16;
        ctx.beginPath();
        ctx.moveTo(mx + Math.cos(a) * (r - 3 * zoom), my - r + Math.sin(a) * (r - 3 * zoom));
        ctx.lineTo(mx + Math.cos(a) * (r + 1.5 * zoom), my - r + Math.sin(a) * (r + 1.5 * zoom));
        ctx.stroke();
      }

      // Twin concentric loop rails
      ctx.strokeStyle = def.colorTrack;
      ctx.lineWidth = Math.max(2.5, 4 * zoom);
      ctx.beginPath(); ctx.arc(mx, my - r, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = def.colorRail;
      ctx.lineWidth = Math.max(1.2, 1.8 * zoom);
      ctx.beginPath(); ctx.arc(mx, my - r, r - 2.5 * zoom, 0, Math.PI * 2); ctx.stroke();
    } else if (node.piece.isAirtime) {
      const mx = (x1 + x2) * 0.5;
      const my = (y1 + y2) * 0.5 - 26 * zoom;
      const qx = (t) => (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * mx + t * t * x2;
      const qy = (t) => (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * my + t * t * y2;
      for (let s = 0; s < 5; s++) {
        this._drawDualRailSegment(ctx, qx(s / 5), qy(s / 5), qx((s + 1) / 5), qy((s + 1) / 5), zoom, def, node.piece, nowSec);
      }
    } else {
      this._drawDualRailSegment(ctx, x1, y1, x2, y2, zoom, def, node.piece, nowSec);
    }

    // 4. Victorian Boarding Station Platform & Canopy
    if (node.piece.isStation) {
      // Brick platform deck
      ctx.fillStyle = "#334155";
      ctx.fillRect(x1 - 15 * zoom, y1 - 3 * zoom, 30 * zoom, 7 * zoom);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(x1 - 15 * zoom, y1 - 3 * zoom, 30 * zoom, 1.5 * zoom);
      // Canopy posts
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(x1 - 14 * zoom, y1 - 21 * zoom, 2 * zoom, 18 * zoom);
      ctx.fillRect(x1 + 12 * zoom, y1 - 21 * zoom, 2 * zoom, 18 * zoom);
      // Striped Victorian pitched roof
      ctx.fillStyle = ride.broken ? "#ef4444" : def.colorPrimary;
      ctx.beginPath();
      ctx.moveTo(x1 - 17 * zoom, y1 - 20 * zoom);
      ctx.lineTo(x1, y1 - 29 * zoom);
      ctx.lineTo(x1 + 17 * zoom, y1 - 20 * zoom);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fef3c7";
      ctx.fillRect(x1 - 8 * zoom, y1 - 23 * zoom, 4 * zoom, 3 * zoom);
      ctx.fillRect(x1 + 4 * zoom, y1 - 23 * zoom, 4 * zoom, 3 * zoom);

      if (node.index === 0) {
        // Green IN / Red OUT mini turnstile booths at station start
        ctx.fillStyle = "#15803d";
        ctx.fillRect(x1 - 18 * zoom, y1 - 11 * zoom, 7 * zoom, 9 * zoom);
        ctx.fillStyle = "#86efac";
        ctx.fillRect(x1 - 17 * zoom, y1 - 10 * zoom, 5 * zoom, 2 * zoom);
      }
    }

    if (collectHitboxes) {
      const bx = Math.min(x1, x2) - 10 * zoom;
      const by = Math.min(y1, y2) - 12 * zoom;
      this._hitBoxes.push({
        kind: "ride",
        id: ride.id,
        x: bx,
        y: by,
        w: Math.abs(x2 - x1) + 20 * zoom,
        h: Math.abs(y2 - y1) + 24 * zoom,
      });
    }
  }

  _drawCoasterCar(ctx, ride, pose, iso, screenAngle, toScreenX, toScreenY, zoom, isLead, collectHitboxes) {
    const cx = toScreenX(iso.screenX);
    const cy = toScreenY(iso.screenY) - 4 * zoom;
    const def = RIDE_CATALOG[ride.catalogId] || RIDE_CATALOG.wooden_coaster;
    const handsUp = pose.piece.dz < 0 || pose.piece.isLoop || pose.piece.isAirtime;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((screenAngle || 0) + (pose.roll || 0));

    const w = 15 * zoom;
    const h = 8.5 * zoom;

    // Undercarriage wheel bogies
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(-w * 0.35, h * 0.35, 3 * zoom, 2.5 * zoom);
    ctx.fillRect(w * 0.15, h * 0.35, 3 * zoom, 2.5 * zoom);

    // 3D Shaded Car Body + Nose Cone
    ctx.fillStyle = "#090d13";
    ctx.fillRect(-w * 0.5 - 1, -h * 0.5 - 1, w + 2, h + 2);
    ctx.fillStyle = def.colorPrimary;
    ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
    ctx.fillStyle = isLead ? "#fde047" : "#f8fafc";
    ctx.fillRect(-w * 0.5, -1 * zoom, w, 2 * zoom);

    // Nose accent on lead car
    if (isLead) {
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.moveTo(w * 0.5, -h * 0.5);
      ctx.lineTo(w * 0.5 + 4 * zoom, 0);
      ctx.lineTo(w * 0.5, h * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    // Two riders with waving hands on drops!
    for (const rx of [-3 * zoom, 2 * zoom]) {
      ctx.fillStyle = "#fed7aa";
      ctx.fillRect(rx, -h * 0.5 - 3.5 * zoom, 3 * zoom, 3 * zoom);
      if (handsUp) {
        ctx.fillStyle = "#fed7aa";
        ctx.fillRect(rx - 1 * zoom, -h * 0.5 - 6 * zoom, 1.2 * zoom, 3 * zoom);
        ctx.fillRect(rx + 2.8 * zoom, -h * 0.5 - 6 * zoom, 1.2 * zoom, 3 * zoom);
      }
    }
    ctx.restore();

    if (collectHitboxes) {
      this._hitBoxes.push({ kind: "ride", id: ride.id, x: cx - 10 * zoom, y: cy - 10 * zoom, w: 20 * zoom, h: 20 * zoom });
    }
  }

  _drawFlatRide(ctx, ride, iso, toScreenX, toScreenY, zoom, nowSec, collectHitboxes) {
    const cx = toScreenX(iso.screenX);
    const cy = toScreenY(iso.screenY) + 4 * zoom;
    const phase = ride.animPhase || 0;
    const def = RIDE_CATALOG[ride.catalogId] || RIDE_CATALOG.merry_go_round;

    // 1. Beveled 2x2 Stone/Brick Plaza Base + Perimeter Wrought-Iron Fence
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 26 * zoom);
    ctx.lineTo(cx + 50 * zoom, cy);
    ctx.lineTo(cx + 50 * zoom, cy + 5 * zoom);
    ctx.lineTo(cx, cy + 31 * zoom);
    ctx.lineTo(cx - 50 * zoom, cy + 5 * zoom);
    ctx.lineTo(cx - 50 * zoom, cy);
    ctx.closePath();
    ctx.fill();

    // Plaza deck surface
    ctx.fillStyle = "#475569";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 25 * zoom);
    ctx.lineTo(cx + 48 * zoom, cy);
    ctx.lineTo(cx, cy + 25 * zoom);
    ctx.lineTo(cx - 48 * zoom, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Inner tiled plaza ring
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(cx, cy - 20 * zoom);
    ctx.lineTo(cx + 38 * zoom, cy);
    ctx.lineTo(cx, cy + 20 * zoom);
    ctx.lineTo(cx - 38 * zoom, cy);
    ctx.closePath();
    ctx.fill();

    // Corner IN (Green) / OUT (Red) Ticket Huts
    ctx.fillStyle = "#15803d";
    ctx.fillRect(cx - 28 * zoom, cy + 7 * zoom, 8 * zoom, 10 * zoom);
    ctx.fillStyle = "#b91c1c";
    ctx.fillRect(cx + 20 * zoom, cy + 7 * zoom, 8 * zoom, 10 * zoom);

    if (ride.catalogId === "merry_go_round") {
      // Brass Drum Platform & Central Mirror Pillar
      ctx.fillStyle = "#b45309";
      ctx.beginPath(); ctx.ellipse(cx, cy, 30 * zoom, 15 * zoom, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.fillRect(cx - 4 * zoom, cy - 28 * zoom, 8 * zoom, 28 * zoom);

      // 8 Orbiting Carousel Horses on Brass Poles
      for (let i = 0; i < 8; i++) {
        const ang = phase + (i * Math.PI * 2) / 8;
        const hx = cx + Math.cos(ang) * 23 * zoom;
        const hy = cy + Math.sin(ang) * 11 * zoom - (7 + Math.sin(ang * 2 + phase * 2.5) * 3.5) * zoom;
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(hx, cy + Math.sin(ang) * 11 * zoom); ctx.lineTo(hx, cy - 20 * zoom + Math.sin(ang) * 8 * zoom); ctx.stroke();
        ctx.fillStyle = i % 2 === 0 ? "#f8fafc" : "#f59e0b";
        ctx.fillRect(hx - 3 * zoom, hy - 5 * zoom, 6 * zoom, 4 * zoom);
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(hx - 1.5 * zoom, hy - 6 * zoom, 3 * zoom, 2 * zoom);
      }

      // 12-Segment Scalloped Conical Tent Canopy + Rim Bulbs + Pennant
      ctx.fillStyle = "#dc2626";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 48 * zoom);
      ctx.lineTo(cx + 33 * zoom, cy - 19 * zoom);
      ctx.lineTo(cx, cy - 6 * zoom);
      ctx.lineTo(cx - 33 * zoom, cy - 19 * zoom);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 48 * zoom);
      ctx.lineTo(cx + 12 * zoom, cy - 10 * zoom);
      ctx.lineTo(cx - 12 * zoom, cy - 10 * zoom);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fde047";
      ctx.beginPath();
      ctx.moveTo(cx, cy - 48 * zoom);
      ctx.lineTo(cx + 4 * zoom, cy - 8 * zoom);
      ctx.lineTo(cx - 4 * zoom, cy - 8 * zoom);
      ctx.closePath();
      ctx.fill();
      // Top flag
      ctx.fillStyle = "#fde047";
      ctx.fillRect(cx - 0.5, cy - 58 * zoom, 1.5, 11 * zoom);
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(cx + 1, cy - 57 * zoom, 7 * zoom, 4 * zoom);
    } else if (ride.catalogId === "ferris_wheel") {
      const wheelY = cy - 48 * zoom;
      const r = 34 * zoom;
      // Back & Front Twin A-Frame Steel Support Towers
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 2.6 * zoom;
      ctx.beginPath();
      ctx.moveTo(cx - 18 * zoom, cy + 2 * zoom); ctx.lineTo(cx - 3 * zoom, wheelY); ctx.lineTo(cx + 12 * zoom, cy - 2 * zoom);
      ctx.stroke();

      // Dual 3D Wheel Rims + Cross Spokes + Star Hub
      for (const offset of [-3 * zoom, 3 * zoom]) {
        ctx.strokeStyle = offset < 0 ? "#1d4ed8" : def.colorPrimary;
        ctx.lineWidth = 2.2 * zoom;
        ctx.beginPath();
        ctx.arc(cx + offset, wheelY, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 10; i++) {
        const a = phase * 0.5 + (i * Math.PI * 2) / 10;
        const gx = cx + Math.cos(a) * r;
        const gy = wheelY + Math.sin(a) * r;
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, wheelY); ctx.lineTo(gx, gy); ctx.stroke();
        // Hanging cabin gondola (roof + cabin)
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(gx - 4.5 * zoom, gy + 1 * zoom, 9 * zoom, 7 * zoom);
        ctx.fillStyle = i % 2 === 0 ? "#fde047" : "#f43f5e";
        ctx.fillRect(gx - 4.5 * zoom, gy, 9 * zoom, 3 * zoom);
        ctx.fillStyle = "#bae6fd";
        ctx.fillRect(gx - 3 * zoom, gy + 3.5 * zoom, 6 * zoom, 2.5 * zoom);
      }
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.8 * zoom;
      ctx.beginPath();
      ctx.moveTo(cx - 14 * zoom, cy + 6 * zoom); ctx.lineTo(cx + 3 * zoom, wheelY); ctx.lineTo(cx + 18 * zoom, cy + 2 * zoom);
      ctx.stroke();
      ctx.fillStyle = "#fde047";
      ctx.beginPath(); ctx.arc(cx, wheelY, 5 * zoom, 0, Math.PI * 2); ctx.fill();
    } else if (ride.catalogId === "pirate_ship") {
      const swing = Math.sin(phase * 1.45) * 0.92;
      const pivotY = cy - 42 * zoom;
      // Timber A-frame Cradle
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 3.5 * zoom;
      ctx.beginPath();
      ctx.moveTo(cx - 22 * zoom, cy + 2 * zoom); ctx.lineTo(cx, pivotY); ctx.lineTo(cx + 22 * zoom, cy + 2 * zoom);
      ctx.stroke();
      ctx.fillStyle = "#fde047";
      ctx.beginPath(); ctx.arc(cx, pivotY, 4 * zoom, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      ctx.translate(cx, pivotY);
      ctx.rotate(swing);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 1.6 * zoom;
      ctx.beginPath();
      ctx.moveTo(-5 * zoom, 0); ctx.lineTo(-14 * zoom, 28 * zoom);
      ctx.moveTo(5 * zoom, 0); ctx.lineTo(14 * zoom, 28 * zoom);
      ctx.stroke();
      // Detailed Viking Galleon Hull
      ctx.fillStyle = "#78350f";
      ctx.beginPath();
      ctx.arc(0, 26 * zoom, 21 * zoom, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = "#b45309";
      ctx.fillRect(-20 * zoom, 24 * zoom, 40 * zoom, 4 * zoom);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-22 * zoom, 20 * zoom, 6 * zoom, 6 * zoom);
      ctx.fillRect(16 * zoom, 20 * zoom, 6 * zoom, 6 * zoom);
      // Tiny passengers inside ship
      for (let p = -12; p <= 12; p += 6) {
        ctx.fillStyle = "#fed7aa";
        ctx.fillRect(p * zoom, 21 * zoom, 2.5 * zoom, 2.5 * zoom);
      }
      ctx.restore();
    } else if (ride.catalogId === "launched_freefall" || ride.catalogId === "observation_tower") {
      const towerH = 98 * zoom;
      const isDrop = ride.catalogId === "launched_freefall";
      // 4-Post Lattice Tower Spine
      ctx.fillStyle = isDrop ? "#4c1d95" : "#0f766e";
      ctx.fillRect(cx - 6 * zoom, cy - towerH, 12 * zoom, towerH);
      ctx.strokeStyle = isDrop ? "#a78bfa" : "#5eead4";
      ctx.lineWidth = 1.2;
      for (let seg = 0; seg < 8; seg++) {
        const sy0 = cy - (seg * towerH) / 8;
        const sy1 = cy - ((seg + 1) * towerH) / 8;
        ctx.beginPath();
        ctx.moveTo(cx - 6 * zoom, sy0); ctx.lineTo(cx + 6 * zoom, sy1);
        ctx.moveTo(cx + 6 * zoom, sy0); ctx.lineTo(cx - 6 * zoom, sy1);
        ctx.stroke();
      }
      // Summit Crown
      ctx.fillStyle = "#facc15";
      ctx.fillRect(cx - 10 * zoom, cy - towerH - 6 * zoom, 20 * zoom, 6 * zoom);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(cx - 1.5, cy - towerH - 16 * zoom, 3, 10 * zoom);

      const tNorm = (phase * 0.36) % 1;
      const carLift = isDrop
        ? tNorm < 0.72 ? tNorm / 0.72 : Math.max(0, 1 - (tNorm - 0.72) * 5.2)
        : 0.5 + 0.45 * Math.sin(phase * 0.7);
      const carY = cy - 12 * zoom - carLift * (towerH - 24 * zoom);

      ctx.fillStyle = isDrop ? "#ef4444" : "#38bdf8";
      ctx.fillRect(cx - 15 * zoom, carY, 30 * zoom, 8 * zoom);
      ctx.fillStyle = "#fef08a";
      ctx.fillRect(cx - 12 * zoom, carY + 1.5 * zoom, 24 * zoom, 3 * zoom);
    } else if (ride.catalogId === "go_karts") {
      // Oval asphalt track + red/white curbs + checkered start arch
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 13 * zoom;
      ctx.beginPath(); ctx.ellipse(cx, cy, 27 * zoom, 13 * zoom, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 10 * zoom;
      ctx.beginPath(); ctx.ellipse(cx, cy, 27 * zoom, 13 * zoom, 0, 0, Math.PI * 2); ctx.stroke();

      // Start arch
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(cx - 8 * zoom, cy + 5 * zoom, 16 * zoom, 3 * zoom);
      ctx.fillStyle = "#090d13";
      ctx.fillRect(cx - 5 * zoom, cy + 5 * zoom, 3 * zoom, 3 * zoom);
      ctx.fillRect(cx + 1 * zoom, cy + 5 * zoom, 3 * zoom, 3 * zoom);

      for (let k = 0; k < 4; k++) {
        const ka = phase * 1.9 + k * 1.57;
        const kx = cx + Math.cos(ka) * 27 * zoom;
        const ky = cy + Math.sin(ka) * 13 * zoom;
        ctx.fillStyle = ["#ef4444", "#fde047", "#38bdf8", "#22c55e"][k];
        ctx.fillRect(kx - 3.5 * zoom, ky - 2.5 * zoom, 7 * zoom, 5 * zoom);
      }
    } else {
      // Log Flume elevated timber chute + water + splashing log boat
      ctx.strokeStyle = "#78350f";
      ctx.lineWidth = 11 * zoom;
      ctx.beginPath(); ctx.ellipse(cx, cy - 6 * zoom, 26 * zoom, 13 * zoom, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 7 * zoom;
      ctx.beginPath(); ctx.ellipse(cx, cy - 6 * zoom, 26 * zoom, 13 * zoom, 0, 0, Math.PI * 2); ctx.stroke();
      const la = phase * 1.4;
      const bx = cx + Math.cos(la) * 26 * zoom;
      const by = cy - 6 * zoom + Math.sin(la) * 13 * zoom;
      ctx.fillStyle = "#5c270b";
      ctx.fillRect(bx - 4.5 * zoom, by - 2.5 * zoom, 9 * zoom, 5 * zoom);
      ctx.fillStyle = "#e0f2fe";
      ctx.fillRect(bx - 6 * zoom, by + 1 * zoom, 3 * zoom, 2 * zoom);
    }

    if (ride.broken) {
      const bob = Math.sin(nowSec * 6) * 3;
      ctx.fillStyle = "#dc2626";
      ctx.fillRect(cx - 14 * zoom, cy - 68 * zoom + bob, 28 * zoom, 15 * zoom);
      ctx.strokeStyle = "#fde047";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - 14 * zoom, cy - 68 * zoom + bob, 28 * zoom, 15 * zoom);
      ctx.fillStyle = "#ffffff";
      ctx.font = `bold ${Math.max(8, Math.round(9 * zoom))}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("FIX!", cx, cy - 57 * zoom + bob);
    }

    if (collectHitboxes) {
      this._hitBoxes.push({
        kind: "ride",
        id: ride.id,
        x: cx - 40 * zoom,
        y: cy - 68 * zoom,
        w: 80 * zoom,
        h: 84 * zoom,
      });
    }
  }

  _drawPeep(ctx, p, iso, toScreenX, toScreenY, zoom, nowSec, collectHitboxes) {
    const px = toScreenX(iso.screenX);
    const swing = p.state === "sitting" ? 0 : Math.sin(p.walkPhase) * 1.5 * zoom;
    const bounce = p.state === "sitting" ? 0 : Math.abs(Math.sin(p.walkPhase)) * 2 * zoom;
    const py = toScreenY(iso.screenY) - bounce;

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(px - 3 * zoom, py - 1 * zoom, 6 * zoom, 2 * zoom);

    // Legs with walk stride
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(px - 2.2 * zoom, py - 6 * zoom + swing * 0.5, 2 * zoom, 5 * zoom);
    ctx.fillRect(px + 0.2 * zoom, py - 6 * zoom - swing * 0.5, 2 * zoom, 5 * zoom);

    // Shirt & Arms
    ctx.fillStyle = p.shirtColor;
    ctx.fillRect(px - 3 * zoom, py - 12 * zoom, 6 * zoom, 6 * zoom);

    // Head & Hair
    const hair = PEEP_HAIR_COLORS[(p.name.charCodeAt(0) || 0) % PEEP_HAIR_COLORS.length];
    ctx.fillStyle = p.nausea > 65 ? "#86efac" : "#fed7aa";
    ctx.fillRect(px - 2.5 * zoom, py - 16.5 * zoom, 5 * zoom, 4.5 * zoom);
    ctx.fillStyle = hair;
    ctx.fillRect(px - 2.5 * zoom, py - 17.5 * zoom, 5 * zoom, 2 * zoom);

    // Held Burger or Drink
    if (p.hasBurger) {
      ctx.fillStyle = "#f59e0b";
      ctx.fillRect(px + 3 * zoom, py - 10 * zoom, 2.5 * zoom, 2 * zoom);
    } else if (p.hasDrink) {
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(px - 5 * zoom, py - 11 * zoom, 2 * zoom, 3 * zoom);
    }

    if (this.sim.weather === "rain" && p.hasUmbrella) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(px, py - 17 * zoom, 7.5 * zoom, Math.PI, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(px, py - 17 * zoom, 3.5 * zoom, Math.PI, Math.PI * 2); ctx.fill();
    }

    if (p.hasBalloon) {
      const sway = Math.sin(nowSec * 3.2 + p.walkPhase) * 2.2 * zoom;
      const bx = px + 4.5 * zoom + sway;
      const by = py - 27 * zoom;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px + 2 * zoom, py - 10 * zoom); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = p.balloonColor;
      ctx.beginPath(); ctx.arc(bx, by, 4.2 * zoom, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(bx - 1.5 * zoom, by - 2 * zoom, 1.4 * zoom, 1.4 * zoom);
      if (collectHitboxes) {
        this._hitBoxes.push({ kind: "balloon", id: p.id, x: bx - 6 * zoom, y: by - 6 * zoom, w: 12 * zoom, h: 12 * zoom });
      }
    }

    if (collectHitboxes) {
      this._hitBoxes.push({ kind: "peep", id: p.id, x: px - 6 * zoom, y: py - 18 * zoom, w: 12 * zoom, h: 20 * zoom });
    }
  }

  _drawStaff(ctx, s, iso, toScreenX, toScreenY, zoom, collectHitboxes) {
    const px = toScreenX(iso.screenX);
    const py = toScreenY(iso.screenY) - Math.abs(Math.sin(s.walkPhase)) * 2 * zoom;
    const def = STAFF_TYPES[s.role] || STAFF_TYPES.handyman;

    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(px - 3.5 * zoom, py - 1 * zoom, 7 * zoom, 2 * zoom);

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(px - 2.5 * zoom, py - 6 * zoom, 5 * zoom, 5 * zoom);
    ctx.fillStyle = def.shirtColor;
    ctx.fillRect(px - 3.5 * zoom, py - 13 * zoom, 7 * zoom, 7 * zoom);
    ctx.fillStyle = s.role === "entertainer" ? "#ffffff" : "#fed7aa";
    ctx.fillRect(px - 3 * zoom, py - 18 * zoom, 6 * zoom, 5 * zoom);

    if (s.role === "mechanic") {
      ctx.fillStyle = "#facc15";
      ctx.fillRect(px - 3.5 * zoom, py - 20 * zoom, 7 * zoom, 2.5 * zoom);
      // Wrench in hand
      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(px + 3.5 * zoom, py - 13 * zoom, 2 * zoom, 5 * zoom);
    } else if (s.role === "handyman") {
      ctx.fillStyle = "#60a5fa";
      ctx.fillRect(px - 3.5 * zoom, py - 20 * zoom, 7 * zoom, 2 * zoom);
      // Broom in hand
      ctx.strokeStyle = "#a16207";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px + 4 * zoom, py - 15 * zoom); ctx.lineTo(px + 6 * zoom, py - 3 * zoom); ctx.stroke();
      ctx.fillStyle = "#fde047";
      ctx.fillRect(px + 4.5 * zoom, py - 4 * zoom, 3.5 * zoom, 2.5 * zoom);
    } else if (s.role === "entertainer") {
      ctx.fillStyle = "#090d13";
      ctx.fillRect(px - 4.2 * zoom, py - 20.5 * zoom, 2.5 * zoom, 2.5 * zoom);
      ctx.fillRect(px + 1.7 * zoom, py - 20.5 * zoom, 2.5 * zoom, 2.5 * zoom);
      ctx.fillRect(px - 2 * zoom, py - 17 * zoom, 1.2 * zoom, 1.2 * zoom);
      ctx.fillRect(px + 0.8 * zoom, py - 17 * zoom, 1.2 * zoom, 1.2 * zoom);
    } else if (s.role === "guard") {
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(px - 3.5 * zoom, py - 20 * zoom, 7 * zoom, 2.5 * zoom);
    }

    if (collectHitboxes) {
      this._hitBoxes.push({ kind: "staff", id: s.id, x: px - 7 * zoom, y: py - 22 * zoom, w: 14 * zoom, h: 24 * zoom });
    }
  }

  _drawToolOverlay(ctx, toScreenX, toScreenY, zoom) {
    const { tileX, tileY } = this.hoverTile;
    const t = this.sim.getTile(tileX, tileY);
    if (!t) return;

    const W = ISO_METRICS.TILE_W;
    const H = ISO_METRICS.TILE_H;
    const iso = worldToIso(tileX, tileY, Math.max(t.height, t.waterHeight || 0), this.rotation, this.sim.mapSize);
    const sx = toScreenX(iso.screenX - W * 0.5);
    const sy = toScreenY(iso.screenY - H * 0.5);
    const dw = W * zoom;
    const dh = H * zoom;

    ctx.strokeStyle =
      this.activeTool.type === "bulldoze" ? "#ef4444" : this.pincerCarry ? "#fde047" : "#38bdf8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx + dw * 0.5, sy);
    ctx.lineTo(sx + dw, sy + dh * 0.5);
    ctx.lineTo(sx + dw * 0.5, sy + dh);
    ctx.lineTo(sx, sy + dh * 0.5);
    ctx.closePath();
    ctx.stroke();

    if (this.customCoasterId) {
      const ride = this.sim.rides.find((r) => r.id === this.customCoasterId);
      if (ride?.track) {
        const cur = ride.track.cursor;
        const cIso = worldToIso(cur.x, cur.y, cur.z, this.rotation, this.sim.mapSize);
        const nIso = worldToIso(cur.x + DIR_DX[cur.dir], cur.y + DIR_DY[cur.dir], cur.z, this.rotation, this.sim.mapSize);
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(toScreenX(cIso.screenX), toScreenY(cIso.screenY));
        ctx.lineTo(toScreenX(nIso.screenX), toScreenY(nIso.screenY));
        ctx.stroke();
      }
    }
  }
}
