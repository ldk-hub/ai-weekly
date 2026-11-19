import * as THREE from "three";

const MAGIC_CIRCLE_PALETTES = {
  holy: { primary: "#fbbf24", secondary: "#fef08a" },
  arcane: { primary: "#38bdf8", secondary: "#e0f2fe" },
  shadow: { primary: "#fb7185", secondary: "#fbcfe8" },
  emerald: { primary: "#34d399", secondary: "#a7f3d0" },
};

function createMagicCircleTexture(paletteKey) {
  const pal = MAGIC_CIRCLE_PALETTES[paletteKey] || MAGIC_CIRCLE_PALETTES.holy;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  ctx.clearRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(cx, cy, 15, cx, cy, size * 0.48);
  grad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
  grad.addColorStop(0.55, `${pal.primary}33`);
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = pal.primary;
  ctx.shadowColor = pal.primary;
  ctx.shadowBlur = 7;

  for (const [r, lw] of [[115, 2.5], [105, 1], [82, 2], [52, 1.5]]) {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 1.5;
  for (const rotOffset of [0, Math.PI / 3]) {
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = rotOffset + (i * Math.PI * 2) / 3;
      const x = cx + Math.cos(a) * 81;
      const y = cy + Math.sin(a) * 81;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = pal.secondary;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * 87, cy + Math.sin(a) * 87);
    ctx.lineTo(cx + Math.cos(a) * 102, cy + Math.sin(a) * 102);
    ctx.stroke();
    ctx.fillStyle = pal.secondary;
    ctx.fillRect(cx + Math.cos(a + 0.12) * 94 - 1.5, cy + Math.sin(a + 0.12) * 94 - 1.5, 3, 3);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPillarAlphaTexture(hexColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, hexColor);
  grad.addColorStop(0.35, `${hexColor}88`);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 128);

  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  for (let x = 6; x < 64; x += 14) {
    ctx.fillRect(x, 20, 3, 108);
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
 * Manages 3D ground magic circles, light pillars, dash afterimages, jump/run dust puffs,
 * click markers, and cached zero-churn 3D-to-2D archive overlays.
 */
export class SanctuaryVFX {
  constructor(scene, overlayLayerEl) {
    this.scene = scene;
    this.overlayLayer = overlayLayerEl;
    this.activeCircles = [];
    this.activeGhosts = [];
    this.activePuffs = [];
    this.textureCache = new Map();
    this.pillarTexCache = new Map();
    this.trackedElements = new Map();
    this._projVec = new THREE.Vector3();
    this._seenIds = new Set();

    // Shared geometries for dust puffs & dash afterimages (zero geometry leak!)
    this._puffGeo = new THREE.RingGeometry(0.18, 0.42, 18);
    this._puffGeo.rotateX(-Math.PI / 2);

    this.moveMarker = this._createMoveMarker();
    this.scene.add(this.moveMarker);
  }

  _createMoveMarker() {
    const geom = new THREE.RingGeometry(0.32, 0.48, 24);
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

    const pillarGeom = new THREE.CylinderGeometry(radius * 0.68, radius * 0.78, pillarHeight, 24, 1, true);
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

  /**
   * Spawn a translucent glowing billboard afterimage ghost behind a dashing SpriteActor.
   */
  spawnAfterimage(spriteActor, tintHex = 0x38bdf8) {
    if (!spriteActor?.spriteMesh || !spriteActor.texture) return;
    if (this.activeGhosts.length >= 12) return;

    const ghostTex = spriteActor.texture.clone();
    ghostTex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({
      map: ghostTex,
      color: tintHex,
      transparent: true,
      opacity: 0.54,
      alphaTest: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(spriteActor.spriteMesh.geometry, mat);
    mesh.position.set(
      spriteActor.mesh.position.x,
      spriteActor.mesh.position.y + (spriteActor.jumpHeight || 0),
      spriteActor.mesh.position.z
    );
    mesh.rotation.y = spriteActor.spriteMesh.rotation.y;
    mesh.scale.copy(spriteActor.spriteMesh.scale);
    this.scene.add(mesh);

    this.activeGhosts.push({
      mesh,
      mat,
      tex: ghostTex,
      age: 0,
      life: 0.28,
    });
  }

  /**
   * Spawn an expanding ring dust puff at feet for Run, Dash takeoff, and Jump landing.
   */
  spawnDustPuff(worldPos, { color = 0xfef3c7, maxScale = 1.85, opacity = 0.65, life = 0.36 } = {}) {
    if (this.activePuffs.length >= 16) return;
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this._puffGeo, mat);
    mesh.position.set(worldPos.x, 0.04, worldPos.z);
    mesh.scale.setScalar(0.55);
    this.scene.add(mesh);

    this.activePuffs.push({
      mesh,
      mat,
      age: 0,
      life,
      maxScale,
      startOpacity: opacity,
    });
  }

  projectToPixel(worldX, worldY, worldZ, camera, width, height) {
    this._projVec.set(worldX, worldY, worldZ).project(camera);
    if (this._projVec.z > 1 || this._projVec.z < -1) return null;
    return {
      x: (this._projVec.x * 0.5 + 0.5) * width,
      y: (-this._projVec.y * 0.5 + 0.5) * height,
    };
  }

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
      lastName: "",
      lastRole: "",
      lastRoleHidden: null,
      lastTargeted: null,
      lastClickable: null,
      lastSpeaking: null,
      lastTransform: "",
      onClick: null,
    };
    const handlePick = (ev) => {
      if (typeof entry.onClick === "function") {
        ev.stopPropagation();
        entry.onClick();
      }
    };
    plateEl.addEventListener("click", handlePick);
    tickerEl.addEventListener("click", handlePick);
    this.trackedElements.set(id, entry);
    return entry;
  }

  removeActorOverlay(id) {
    const entry = this.trackedElements.get(id);
    if (!entry) return;
    entry.root.remove();
    this.trackedElements.delete(id);
  }

  updateTrackedOverlays(actors, camera, width, height, nowMs) {
    if (!this.overlayLayer || !camera) return;
    this._seenIds.clear();
    const wallNow = Date.now();

    for (const actor of actors) {
      this._seenIds.add(actor.id);
      const entry = this._ensureActorOverlay(actor.id, actor.role);
      const headOffset = (actor.overlayHeight || 2.4) + (actor.jumpY || 0);
      const px = this.projectToPixel(actor.position.x, actor.position.y + headOffset, actor.position.z, camera, width, height);

      if (!px || actor.hiddenOverlay || px.x < 12 || px.x > width - 12 || px.y < 16 || px.y > height - 10) {
        if (!entry.root.hidden) entry.root.hidden = true;
        continue;
      }

      if (entry.root.hidden) entry.root.hidden = false;
      entry.onClick = actor.onClick || null;
      const clickable = typeof actor.onClick === "function";
      if (entry.lastClickable !== clickable) {
        entry.lastClickable = clickable;
        entry.root.classList.toggle("is-clickable", clickable);
      }

      const tf = `translate3d(${px.x.toFixed(1)}px, ${px.y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      if (entry.lastTransform !== tf) {
        entry.lastTransform = tf;
        entry.root.style.transform = tf;
      }

      const showChat = Boolean(actor.chatText) && wallNow < (actor.chatUntil || 0);
      if (entry.chatEl.hidden !== !showChat) entry.chatEl.hidden = !showChat;
      if (entry.lastSpeaking !== showChat) {
        entry.lastSpeaking = showChat;
        entry.root.classList.toggle("is-speaking", showChat);
      }
      if (showChat && entry.lastChat !== actor.chatText) {
        entry.lastChat = actor.chatText;
        entry.chatEl.textContent = actor.chatText;
      }

      const showEmote = Boolean(actor.emoteText) && nowMs < (actor.emoteUntil || 0);
      if (entry.emoteEl.hidden !== !showEmote) entry.emoteEl.hidden = !showEmote;
      if (showEmote && entry.lastEmote !== actor.emoteText) {
        entry.lastEmote = actor.emoteText;
        entry.emoteEl.dataset.emote = actor.emoteText;
        entry.emoteEl.innerHTML = EMOTE_TEMPLATES[actor.emoteText] || `<span>${actor.emoteText}</span>`;
      }

      const showTicker = Boolean(actor.tickerText) && Boolean(actor.isActiveShrine) && !showEmote && !showChat;
      if (entry.tickerEl.hidden !== !showTicker) entry.tickerEl.hidden = !showTicker;
      if (showTicker && entry.lastTicker !== actor.tickerText) {
        entry.lastTicker = actor.tickerText;
        entry.tickerEl.textContent = actor.tickerText;
      }

      const isCasting = Boolean(actor.castState && actor.castState.duration > 0);
      if (entry.castWrap.hidden !== !isCasting) entry.castWrap.hidden = !isCasting;
      if (isCasting) {
        const ratio = Math.min(1, Math.max(0, actor.castState.elapsed / actor.castState.duration));
        entry.castLabel.textContent = actor.castState.label;
        entry.castFill.style.transform = `scaleX(${ratio.toFixed(3)})`;
      }

      const showPlate = Boolean(actor.displayName);
      if (entry.plateEl.hidden !== !showPlate) entry.plateEl.hidden = !showPlate;
      if (showPlate) {
        const nextRole = actor.roleBadge || "";
        if (entry.lastRole !== nextRole) {
          entry.lastRole = nextRole;
          entry.roleBadge.textContent = nextRole;
        }
        const roleHidden = !actor.roleBadge || (!actor.isActiveShrine && actor.role !== "building");
        if (entry.lastRoleHidden !== roleHidden) {
          entry.lastRoleHidden = roleHidden;
          entry.roleBadge.hidden = roleHidden;
        }
        if (entry.lastName !== actor.displayName) {
          entry.lastName = actor.displayName;
          entry.nameText.textContent = actor.displayName;
        }
        const targeted = Boolean(actor.isActiveShrine);
        if (entry.lastTargeted !== targeted) {
          entry.lastTargeted = targeted;
          entry.plateEl.classList.toggle("is-targeted", targeted);
        }
      }
    }

    for (const id of this.trackedElements.keys()) {
      if (!this._seenIds.has(id)) this.removeActorOverlay(id);
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
      fx.pillarMesh.rotation.y += dt * 0.9;

      if (fx.remaining <= 0) {
        this.scene.remove(fx.decalMesh);
        this.scene.remove(fx.pillarMesh);
        fx.decalMesh.geometry.dispose();
        fx.decalMat.dispose();
        fx.pillarMesh.geometry.dispose();
        fx.pillarMat.dispose();
        this.activeCircles.splice(i, 1);
      } else if (fx.remaining < 0.5) {
        const fade = fx.remaining / 0.5;
        fx.decalMat.opacity = fx.maxDecalOpacity * fade;
        fx.pillarMat.opacity = fx.maxPillarOpacity * fade;
      }
    }

    for (let i = this.activeGhosts.length - 1; i >= 0; i--) {
      const g = this.activeGhosts[i];
      g.age += dt;
      const p = g.age / g.life;
      if (p >= 1) {
        this.scene.remove(g.mesh);
        g.mat.dispose();
        g.tex.dispose();
        this.activeGhosts.splice(i, 1);
      } else {
        g.mat.opacity = 0.54 * (1 - p);
      }
    }

    for (let i = this.activePuffs.length - 1; i >= 0; i--) {
      const pf = this.activePuffs[i];
      pf.age += dt;
      const p = pf.age / pf.life;
      if (p >= 1) {
        this.scene.remove(pf.mesh);
        pf.mat.dispose();
        this.activePuffs.splice(i, 1);
      } else {
        const s = 0.55 + (pf.maxScale - 0.55) * (1 - Math.pow(1 - p, 2));
        pf.mesh.scale.setScalar(s);
        pf.mat.opacity = pf.startOpacity * (1 - p);
      }
    }
  }

  dispose() {
    for (const fx of this.activeCircles) {
      this.scene.remove(fx.decalMesh);
      this.scene.remove(fx.pillarMesh);
      fx.decalMesh.geometry.dispose();
      fx.decalMat.dispose();
      fx.pillarMesh.geometry.dispose();
      fx.pillarMat.dispose();
    }
    this.activeCircles.length = 0;

    for (const g of this.activeGhosts) {
      this.scene.remove(g.mesh);
      g.mat.dispose();
      g.tex.dispose();
    }
    this.activeGhosts.length = 0;

    for (const pf of this.activePuffs) {
      this.scene.remove(pf.mesh);
      pf.mat.dispose();
    }
    this.activePuffs.length = 0;

    this._puffGeo?.dispose();
    this.moveMarker?.geometry?.dispose();
    this.moveMarker?.material?.dispose();
    for (const tex of this.textureCache.values()) tex.dispose();
    for (const tex of this.pillarTexCache.values()) tex.dispose();
    this.textureCache.clear();
    this.pillarTexCache.clear();
    for (const entry of this.trackedElements.values()) entry.root.remove();
    this.trackedElements.clear();
  }
}
