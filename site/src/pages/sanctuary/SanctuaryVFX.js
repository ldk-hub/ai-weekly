import * as THREE from "three";

const MAGIC_CIRCLE_PALETTES = {
  holy: { primary: "#fbbf24", secondary: "#fef08a" },
  arcane: { primary: "#38bdf8", secondary: "#e0f2fe" },
  shadow: { primary: "#fb7185", secondary: "#fbcfe8" },
  emerald: { primary: "#34d399", secondary: "#a7f3d0" },
};

function createMagicCircleTexture(paletteKey) {
  const pal = MAGIC_CIRCLE_PALETTES[paletteKey] || MAGIC_CIRCLE_PALETTES.holy;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, size * 0.48);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  grad.addColorStop(0.55, `${pal.primary}33`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pal.primary;
  ctx.shadowColor = pal.primary;
  ctx.shadowBlur = 14;

  for (const [r, lw] of [[230, 5], [210, 2], [164, 4], [105, 2.5]]) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 3;
  for (const rotOffset of [0, Math.PI / 3]) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = rotOffset + (i * Math.PI * 2) / 3;
      const x = cx + Math.cos(a) * 162;
      const y = cy + Math.sin(a) * 162;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 174, cy + Math.sin(a) * 174);
    ctx.lineTo(cx + Math.cos(a) * 204, cy + Math.sin(a) * 204);
    ctx.stroke();
    ctx.fillStyle = pal.secondary;
    ctx.fillRect(cx + Math.cos(a + 0.12) * 188 - 3, cy + Math.sin(a + 0.12) * 188 - 3, 6, 6);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPillarAlphaTexture(hexColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 256, 0, 0);
  grad.addColorStop(0, hexColor);
  grad.addColorStop(0.35, `${hexColor}88`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 256);

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  for (let x = 6; x < 64; x += 14) {
    ctx.fillRect(x, 40, 3, 216);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const EMOTE_TEMPLATES = {
  "/lv": `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span>/lv</span>`,
  "/swt": `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5C12 2.5 5.5 10.2 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10.2 12 2.5 12 2.5Z"/></svg><span>/swt</span>`,
  "/!": `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 4h2v11h-2V4Zm0 14h2v2.5h-2V18Z"/></svg><span>/!</span>`,
};

/**
 * Manages 3D ground magic circles, light pillars, click markers, and 3D-to-2D archive overlays.
 */
export class SanctuaryVFX {
  constructor(scene, overlayLayerEl) {
    this.scene = scene;
    this.overlayLayer = overlayLayerEl;
    this.activeCircles = [];
    this.textureCache = new Map();
    this.pillarTexCache = new Map();
    this.trackedElements = new Map();
    this._projVec = new THREE.Vector3();

    this.moveMarker = this._createMoveMarker();
    this.scene.add(this.moveMarker);
  }

  _createMoveMarker() {
    const geom = new THREE.RingGeometry(0.32, 0.48, 28);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.visible = false;
    return mesh;
  }

  setMoveTargetMarker(pos) {
    if (!pos) {
      this.moveMarker.visible = false;
      return;
    }
    this.moveMarker.position.set(pos.x, Math.max(0.05, (pos.y || 0) + 0.05), pos.z);
    this.moveMarker.visible = true;
  }

  _getCircleTex(paletteKey) {
    if (!this.textureCache.has(paletteKey)) {
      this.textureCache.set(paletteKey, createMagicCircleTexture(paletteKey));
    }
    return this.textureCache.get(paletteKey);
  }

  _getPillarTex(paletteKey) {
    if (!this.pillarTexCache.has(paletteKey)) {
      const hex = (MAGIC_CIRCLE_PALETTES[paletteKey] || MAGIC_CIRCLE_PALETTES.holy).primary;
      this.pillarTexCache.set(paletteKey, createPillarAlphaTexture(hex));
    }
    return this.pillarTexCache.get(paletteKey);
  }

  /**
   * Spawn a rotating ground magic circle decal and vertical light pillar at an Archive Shrine.
   */
  spawnMagicCircle(worldPos, { radius = 2.6, duration = 2.4, palette = "holy", pillarHeight = 5.4 } = {}) {
    const tex = this._getCircleTex(palette);
    const pTex = this._getPillarTex(palette);
    const yBase = Math.max(0.05, (worldPos.y || 0) + 0.05);

    const decalGeom = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const decalMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const decalMesh = new THREE.Mesh(decalGeom, decalMat);
    decalMesh.rotation.x = -Math.PI / 2;
    decalMesh.position.set(worldPos.x, yBase, worldPos.z);
    this.scene.add(decalMesh);

    const pillarGeom = new THREE.CylinderGeometry(radius * 0.68, radius * 0.78, pillarHeight, 28, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      map: pTex,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const pillarMesh = new THREE.Mesh(pillarGeom, pillarMat);
    pillarMesh.position.set(worldPos.x, yBase + pillarHeight * 0.5, worldPos.z);
    this.scene.add(pillarMesh);

    this.activeCircles.push({
      decalMesh,
      pillarMesh,
      decalMat,
      pillarMat,
      remaining: duration,
      maxDecalOpacity: 0.92,
      maxPillarOpacity: 0.45,
    });
  }

  projectToPixel(worldX, worldY, worldZ, camera, width, height) {
    this._projVec.set(worldX, worldY, worldZ).project(camera);
    if (this._projVec.z > 1) return null;
    return {
      x: (this._projVec.x * 0.5 + 0.5) * width,
      y: (-this._projVec.y * 0.5 + 0.5) * height,
    };
  }

  /**
   * Project 3D coordinates (x, y + 1.8, z) to #overlay-layer for elastic floating insight badges.
   * Types: 'normal' (metrics), 'crit' (HOT/rising badge), 'magic' (AI news/model), 'heal' (saved/emerald).
   */
  spawnFloatingBadge(worldPos, text, type = "normal", badgeTag = "", camera, width, height) {
    if (!this.overlayLayer || !camera) return;
    const screen = this.projectToPixel(worldPos.x, (worldPos.y || 0) + 1.8, worldPos.z, camera, width, height);
    if (!screen) return;

    const jitterX = (Math.random() - 0.5) * 24;
    const el = document.createElement("div");
    el.className = `ro-damage is-${type}`;
    el.style.left = `${Math.round(screen.x + jitterX)}px`;
    el.style.top = `${Math.round(screen.y)}px`;

    if (badgeTag) {
      const badge = document.createElement("span");
      badge.className = "ro-crit-badge";
      badge.textContent = badgeTag;
      el.appendChild(badge);
    }

    const numSpan = document.createElement("span");
    numSpan.className = "ro-damage-num";
    numSpan.textContent = String(text);
    el.appendChild(numSpan);

    const removeEl = () => el.remove();
    el.addEventListener("animationend", removeEl, { once: true });
    setTimeout(removeEl, 1300);
    this.overlayLayer.appendChild(el);
  }

  _ensureActorOverlay(id, role) {
    if (this.trackedElements.has(id)) return this.trackedElements.get(id);

    const root = document.createElement("div");
    root.className = `ro-actor-overlay is-${role}`;

    const emoteEl = document.createElement("div");
    emoteEl.className = "ro-emote-bubble";
    emoteEl.hidden = true;

    const chatEl = document.createElement("div");
    chatEl.className = "ro-chat-bubble";
    chatEl.hidden = true;

    const tickerEl = document.createElement("div");
    tickerEl.className = "ro-post-bubble";
    tickerEl.hidden = true;

    const castWrap = document.createElement("div");
    castWrap.className = "ro-castbar-wrap";
    castWrap.hidden = true;
    const castLabel = document.createElement("span");
    castLabel.className = "ro-castbar-label";
    const castTrack = document.createElement("div");
    castTrack.className = "ro-castbar-track";
    const castFill = document.createElement("div");
    castFill.className = "ro-castbar-fill";
    castTrack.appendChild(castFill);
    castWrap.append(castLabel, castTrack);

    const plateEl = document.createElement("div");
    plateEl.className = "ro-nameplate";
    const roleBadge = document.createElement("span");
    roleBadge.className = "ro-nameplate-role";
    const nameText = document.createElement("span");
    nameText.className = "ro-nameplate-title";
    plateEl.append(roleBadge, nameText);

    root.append(chatEl, emoteEl, tickerEl, castWrap, plateEl);
    this.overlayLayer.appendChild(root);

    const entry = {
      root,
      chatEl,
      emoteEl,
      tickerEl,
      castWrap,
      castLabel,
      castFill,
      plateEl,
      roleBadge,
      nameText,
      lastChat: "",
      lastEmote: "",
      lastTicker: "",
    };
    this.trackedElements.set(id, entry);
    return entry;
  }

  removeActorOverlay(id) {
    const entry = this.trackedElements.get(id);
    if (!entry) return;
    entry.root.remove();
    this.trackedElements.delete(id);
  }

  /**
   * Sync overhead emotes (/lv, /swt, /!), archive post tickers, castbars, and curator nameplates.
   */
  updateTrackedOverlays(actors, camera, width, height, nowMs) {
    if (!this.overlayLayer || !camera) return;
    const seen = new Set();

    for (const actor of actors) {
      seen.add(actor.id);
      const entry = this._ensureActorOverlay(actor.id, actor.role);
      const headOffset = actor.overlayHeight || 2.4;
      const px = this.projectToPixel(actor.position.x, actor.position.y + headOffset, actor.position.z, camera, width, height);

      if (!px || px.x < -80 || px.x > width + 80 || px.y < -80 || px.y > height + 80) {
        entry.root.hidden = true;
        continue;
      }

      entry.root.hidden = false;
      entry.root.style.transform = `translate3d(${px.x.toFixed(1)}px, ${px.y.toFixed(1)}px, 0) translate(-50%, -100%)`;

      const wallNow = Date.now();
      const showChat = Boolean(actor.chatText) && wallNow < (actor.chatUntil || 0);
      entry.chatEl.hidden = !showChat;
      if (showChat && entry.lastChat !== actor.chatText) {
        entry.lastChat = actor.chatText;
        entry.chatEl.textContent = actor.chatText;
      }

      const showEmote = actor.emoteText && nowMs < actor.emoteUntil;
      entry.emoteEl.hidden = !showEmote;
      if (showEmote && entry.lastEmote !== actor.emoteText) {
        entry.lastEmote = actor.emoteText;
        entry.emoteEl.dataset.emote = actor.emoteText;
        entry.emoteEl.innerHTML = EMOTE_TEMPLATES[actor.emoteText] || `<span>${actor.emoteText}</span>`;
      }

      const showTicker = Boolean(actor.tickerText) && Boolean(actor.isActiveShrine) && !showEmote && !showChat;
      entry.tickerEl.hidden = !showTicker;
      if (showTicker && entry.lastTicker !== actor.tickerText) {
        entry.lastTicker = actor.tickerText;
        entry.tickerEl.textContent = actor.tickerText;
      }

      const isCasting = actor.castState && actor.castState.duration > 0;
      entry.castWrap.hidden = !isCasting;
      if (isCasting) {
        const ratio = Math.min(1, Math.max(0, actor.castState.elapsed / actor.castState.duration));
        entry.castLabel.textContent = actor.castState.label;
        entry.castFill.style.transform = `scaleX(${ratio.toFixed(3)})`;
      }

      const showPlate = actor.role !== "citizen";
      entry.plateEl.hidden = !showPlate;
      if (showPlate) {
        entry.roleBadge.textContent = actor.roleBadge || "";
        entry.roleBadge.hidden = !actor.roleBadge || !actor.isActiveShrine;
        entry.nameText.textContent = actor.displayName;
        entry.plateEl.classList.toggle("is-targeted", Boolean(actor.isActiveShrine));
      }
    }

    for (const id of [...this.trackedElements.keys()]) {
      if (!seen.has(id)) this.removeActorOverlay(id);
    }
  }

  update(dt, elapsedSec) {
    if (this.moveMarker.visible) {
      const pulse = 0.85 + Math.sin(elapsedSec * 7) * 0.15;
      this.moveMarker.scale.set(pulse, 1, pulse);
      this.moveMarker.rotation.y += dt * 2.2;
    }

    for (let i = this.activeCircles.length - 1; i >= 0; i--) {
      const fx = this.activeCircles[i];
      fx.remaining -= dt;
      fx.decalMesh.rotation.z += dt * 1.8;
      fx.pillarMesh.rotation.y -= dt * 0.9;

      if (fx.remaining <= 0.5) {
        const fade = Math.max(0, fx.remaining / 0.5);
        fx.decalMat.opacity = fx.maxDecalOpacity * fade;
        fx.pillarMat.opacity = fx.maxPillarOpacity * fade;
      }

      if (fx.remaining <= 0) {
        this.scene.remove(fx.decalMesh);
        this.scene.remove(fx.pillarMesh);
        fx.decalMesh.geometry.dispose();
        fx.pillarMesh.geometry.dispose();
        fx.decalMat.dispose();
        fx.pillarMat.dispose();
        this.activeCircles.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const fx of this.activeCircles) {
      this.scene.remove(fx.decalMesh);
      this.scene.remove(fx.pillarMesh);
      fx.decalMesh.geometry.dispose();
      fx.pillarMesh.geometry.dispose();
      fx.decalMat.dispose();
      fx.pillarMat.dispose();
    }
    this.activeCircles = [];
    this.textureCache.forEach((t) => t.dispose());
    this.pillarTexCache.forEach((t) => t.dispose());
    this.textureCache.clear();
    this.pillarTexCache.clear();
    this.moveMarker.geometry.dispose();
    this.moveMarker.material.dispose();
    this.trackedElements.forEach((e) => e.root.remove());
    this.trackedElements.clear();
  }
}
