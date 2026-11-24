import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import { createToonMaterial, addToonOutline } from "./ToonMaterials.js";

const CHARACTER_MODELS = {
  Knight: "assets/models/characters/Knight.glb",
  Mage: "assets/models/characters/Mage.glb",
  Rogue: "assets/models/characters/Rogue.glb",
  Rogue_Hooded: "assets/models/characters/Rogue_Hooded.glb",
  Barbarian: "assets/models/characters/Barbarian.glb",
};

export const AVATAR_KEYS = Object.keys(CHARACTER_MODELS);
export const AVATAR_LABELS = {
  Knight: "기사 나이트",
  Mage: "아스트랄 메이지",
  Rogue: "스카웃 로그",
  Rogue_Hooded: "후드 탐험가",
  Barbarian: "하이퍼 바바리안",
};

const GUEST_COLORS = [0xff8274, 0x60c5f1, 0xffd166, 0x6ee7b7, 0xf9a8d4, 0xc4b5fd];
const HAT_STYLES = ["bunny", "beret", "cap", "bow", "star"];

/**
 * Cute 2.2-head SD Chibi Cartoon Park Guest with expressive eyes, blush cheeks,
 * themed amusement-park hats (bunny ears, ribbon, beret, cap), and floating pastel balloons!
 */
function createCuteCartoonGuest(colorHex = 0xff8274, variantIdx = 0) {
  const g = new THREE.Group();
  const outfitMat = createToonMaterial(colorHex);
  const skinMat = createToonMaterial(0xffe4c8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x261d2e });
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3 });
  const shoeMat = createToonMaterial(0x3f334d);

  // Cute stubby legs/shoes
  const shoeGeo = new THREE.SphereGeometry(0.14, 8, 8);
  for (const sx of [-0.15, 0.15]) {
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(sx, 0.14, 0.04);
    shoe.scale.set(1, 0.78, 1.25);
    g.add(shoe);
  }

  // Round chibi dress/tunic body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.62, 12), outfitMat);
  body.position.y = 0.56;
  body.castShadow = true;
  addToonOutline(body, 1.07);
  g.add(body);

  // Tiny swinging cartoon hands
  const handGeo = new THREE.SphereGeometry(0.11, 8, 8);
  for (const sx of [-0.34, 0.34]) {
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.set(sx, 0.62, 0.06);
    addToonOutline(hand, 1.12);
    g.add(hand);
  }

  // Big round chibi head (2.2-head proportion)
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), skinMat);
  head.position.y = 1.22;
  head.scale.set(1.06, 0.96, 1.0);
  head.castShadow = true;
  addToonOutline(head, 1.06);
  g.add(head);

  // Glossy cartoon eyes + white sparkle highlight + rosy cheeks (+Z front)
  const eyeGeo = new THREE.SphereGeometry(0.055, 8, 8);
  const shineGeo = new THREE.SphereGeometry(0.02, 6, 6);
  const blushGeo = new THREE.CircleGeometry(0.068, 10);
  for (const sx of [-0.15, 0.15]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx, 1.24, 0.38);
    g.add(eye);

    const shine = new THREE.Mesh(shineGeo, shineMat);
    shine.position.set(sx + 0.018, 1.265, 0.428);
    g.add(shine);

    const blush = new THREE.Mesh(blushGeo, blushMat);
    blush.position.set(sx * 1.48, 1.15, 0.365);
    blush.rotation.y = sx * 0.6;
    g.add(blush);
  }

  // Hair cap / cute amusement park hat
  const hatStyle = HAT_STYLES[variantIdx % HAT_STYLES.length];
  const hatAccent = createToonMaterial(GUEST_COLORS[(variantIdx + 2) % GUEST_COLORS.length]);
  if (hatStyle === "bunny") {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.045, 8, 20, Math.PI), hatAccent);
    band.position.set(0, 1.28, 0);
    g.add(band);
    for (const sx of [-0.16, 0.16]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 6, 8), createToonMaterial(0xfff5f7));
      ear.position.set(sx, 1.78, 0);
      ear.rotation.z = sx * -0.45;
      addToonOutline(ear, 1.09);
      g.add(ear);
    }
  } else if (hatStyle === "beret") {
    const beret = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), hatAccent);
    beret.scale.set(1.12, 0.46, 1.12);
    beret.position.set(0.04, 1.56, -0.02);
    beret.rotation.z = -0.18;
    addToonOutline(beret, 1.06);
    g.add(beret);
  } else if (hatStyle === "bow") {
    for (const sx of [-0.15, 0.15]) {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 6), hatAccent);
      wing.position.set(sx, 1.62, 0.05);
      wing.rotation.z = sx > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
      g.add(wing);
    }
  } else if (hatStyle === "star") {
    const starHat = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), createToonMaterial(0xfde047));
    starHat.position.set(0, 1.72, 0);
    addToonOutline(starHat, 1.09);
    g.add(starHat);
  } else {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.41, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hatAccent);
    dome.position.y = 1.32;
    g.add(dome);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.34), hatAccent);
    brim.position.set(0, 1.36, 0.32);
    g.add(brim);
  }

  // Every 3rd park guest carries a floating pastel theme-park balloon!
  if (variantIdx % 3 === 0) {
    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1.35, 4),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    string.position.set(0.36, 1.35, 0.08);
    g.add(string);

    const balloon = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 12, 12),
      createToonMaterial(GUEST_COLORS[(variantIdx + 4) % GUEST_COLORS.length], { emissive: 0x331122, emissiveIntensity: 0.12 })
    );
    balloon.scale.set(0.92, 1.12, 0.92);
    balloon.position.set(0.36, 2.22, 0.08);
    addToonOutline(balloon, 1.07);
    g.add(balloon);
  }

  return g;
}

function createFallbackAvatar(colorHex = 0xff8274, variantIdx = 0) {
  return createCuteCartoonGuest(colorHex, variantIdx);
}

/**
 * Manages Full-3D KayKit Rigged Player Avatar, Remote Multi-User Ride-Along Avatars,
 * and Autonomous AI Park Guest Crowd walking the paths & reacting to rides.
 */
export class CrowdAndAvatarEngine {
  constructor(scene, terrainEngine, overlayLayerEl) {
    this.scene = scene;
    this.terrain = terrainEngine;
    this.overlayLayer = overlayLayerEl;
    this.loader = new GLTFLoader();
    this.modelCache = new Map();

    this.group = new THREE.Group();
    this.group.name = "WeeklyLand_Actors";
    this.scene.add(this.group);

    this.player = {
      classKey: "Knight",
      root: new THREE.Group(),
      model: null,
      mixer: null,
      actions: {},
      activeAction: "",
      position: new THREE.Vector3(0, 0, 34),
      velocity: new THREE.Vector3(),
      facing: Math.PI,
      vy: 0,
      grounded: true,
      riding: null, // { kind: 'coaster'|'ride', id, carIndex }
    };
    this.player.root.position.copy(this.player.position);
    this.group.add(this.player.root);

    this.remotePeers = new Map(); // clientId -> { root, pos, targetPos, facing, riding, tagEl, nick }
    this.aiGuests = [];
    this.guestLines = [
      "스타보드 코스터 뱅크턴 진짜 부드럽다!",
      "밤에 대관람차에서 보는 불꽃놀이 기대돼요!",
      "벤치마크 드롭타워 낙하 스릴 최고!",
      "AI위클리 파빌리온에서 오늘의 뉴스도 보고 가야지!",
    ];
    this._projVec = new THREE.Vector3();
    this._bubbleTimer = 0;

    this._mountFallbackToPlayer();
    this._spawnAIGuests(24);
  }

  _mountFallbackToPlayer() {
    this.player.model = createFallbackAvatar(0xe07a52);
    this.player.root.add(this.player.model);
  }

  async preloadCharacterModels() {
    const entries = Object.entries(CHARACTER_MODELS);
    await Promise.all(
      entries.map(async ([key, url]) => {
        try {
          const gltf = await this.loader.loadAsync(url);
          this.modelCache.set(key, gltf);
        } catch (err) {
          console.warn(`[CrowdAndAvatarEngine] GLB fallback for ${key}:`, err?.message || err);
        }
      })
    );
    this.setPlayerClass(this.player.classKey);
  }

  setPlayerClass(classKey) {
    const key = CHARACTER_MODELS[classKey] ? classKey : "Knight";
    this.player.classKey = key;

    if (this.player.model) {
      this.player.root.remove(this.player.model);
      this.player.model = null;
    }
    this.player.mixer = null;
    this.player.actions = {};
    this.player.activeAction = "";

    const cached = this.modelCache.get(key);
    if (!cached) {
      this._mountFallbackToPlayer();
      return;
    }

    const cloned = SkeletonUtils.clone(cached.scene);
    cloned.scale.setScalar(0.88);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    this.player.root.add(cloned);
    this.player.model = cloned;

    if (cached.animations?.length) {
      const mixer = new THREE.AnimationMixer(cloned);
      const findClip = (patterns) =>
        cached.animations.find((c) => patterns.some((p) => c.name.toLowerCase().includes(p))) || cached.animations[0];
      const map = {
        idle: findClip(["idle", "standing"]),
        walk: findClip(["walk", "jog"]),
        run: findClip(["run", "sprint"]),
        sit: findClip(["sit", "cheer", "idle"]),
      };
      for (const [name, clip] of Object.entries(map)) {
        if (clip) this.player.actions[name] = mixer.clipAction(clip);
      }
      this.player.mixer = mixer;
      this._playPlayerAnim("idle");
    }
  }

  _playPlayerAnim(name) {
    if (!this.player.mixer || this.player.activeAction === name) return;
    const next = this.player.actions[name];
    if (!next) return;
    const prev = this.player.actions[this.player.activeAction];
    if (prev) prev.fadeOut(0.18);
    next.reset().fadeIn(0.18).play();
    this.player.activeAction = name;
  }

  setGuestReactionLines(lines) {
    if (Array.isArray(lines) && lines.length) {
      this.guestLines = lines;
    }
  }

  _spawnAIGuests(count) {
    const names = ["민지", "준호", "서연", "도윤", "하린", "시우", "지아", "현우", "유나", "건우"];
    for (let i = 0; i < count; i++) {
      const color = GUEST_COLORS[i % GUEST_COLORS.length];
      const mesh = createFallbackAvatar(color, i);
      mesh.scale.setScalar(0.84 + (i % 3) * 0.06);
      const wp = this.terrain.getRandomWaypoint();
      mesh.position.copy(wp.position);
      this.group.add(mesh);

      const nextWp = this.terrain.getNextWaypoint(wp.index);
      const bubbleEl = i < 4 ? this._createBubbleEl() : null;
      this.aiGuests.push({
        id: `ai-guest-${i}`,
        name: `${names[i % names.length]} #${i + 1}`,
        mesh,
        pos: wp.position.clone(),
        targetIndex: nextWp.index,
        targetPos: nextWp.position.clone(),
        speed: 2.0 + (i % 4) * 0.45,
        phase: Math.random() * Math.PI * 2,
        bubbleEl,
        bubbleText: "",
        bubbleRemaining: 0,
      });
    }
  }

  _createBubbleEl() {
    if (!this.overlayLayer) return null;
    const el = document.createElement("div");
    el.className = "wl-guest-bubble";
    el.hidden = true;
    this.overlayLayer.appendChild(el);
    return el;
  }

  _createTagEl(label) {
    if (!this.overlayLayer) return null;
    const el = document.createElement("div");
    el.className = "wl-world-tag";
    el.textContent = label;
    this.overlayLayer.appendChild(el);
    return el;
  }

  upsertRemotePeer(peer) {
    if (!peer?.clientId) return;
    let rec = this.remotePeers.get(peer.clientId);
    if (!rec) {
      const root = new THREE.Group();
      const avatar = createFallbackAvatar(0x38bdf8);
      root.add(avatar);
      this.group.add(root);
      rec = {
        clientId: peer.clientId,
        root,
        pos: new THREE.Vector3(peer.x || 0, peer.y || 0, peer.z || 40),
        targetPos: new THREE.Vector3(peer.x || 0, peer.y || 0, peer.z || 40),
        facing: peer.facing || 0,
        riding: peer.riding || null,
        tagEl: this._createTagEl(peer.nickname || "방문객"),
      };
      this.remotePeers.set(peer.clientId, rec);
    }
    rec.targetPos.set(Number(peer.x || 0), Number(peer.y || 0), Number(peer.z || 0));
    rec.facing = Number(peer.facing || 0);
    rec.riding = peer.riding || null;
    if (rec.tagEl) {
      rec.tagEl.textContent = peer.riding ? `${peer.nickname} · 탑승 중` : peer.nickname || "방문객";
    }
  }

  removeRemotePeer(clientId) {
    const rec = this.remotePeers.get(clientId);
    if (!rec) return;
    this.group.remove(rec.root);
    rec.tagEl?.remove();
    this.remotePeers.delete(clientId);
  }

  boardRide(kind, id, carIndex = 0) {
    this.player.riding = { kind, id, carIndex };
    this._playPlayerAnim("sit");
  }

  leaveRide(dropPosition) {
    this.player.riding = null;
    if (dropPosition) {
      this.player.position.copy(dropPosition);
      this.player.position.y = this.terrain.getHeightAt(dropPosition.x, dropPosition.z);
    }
    this._playPlayerAnim("idle");
  }

  update(dt, input, cameraBasis, coasterEngine, flatRideEngine, camera, viewportW, viewportH) {
    const stepDt = Math.min(dt, 0.05);

    // 1. Update local player (walking vs riding)
    if (this.player.riding) {
      const seat =
        this.player.riding.kind === "coaster"
          ? coasterEngine.getSeatState(this.player.riding.id, 0, this.player.riding.carIndex || 0)
          : flatRideEngine.getRideSeatState(this.player.riding.id);
      if (seat) {
        this.player.position.copy(seat.position);
        this.player.root.position.copy(seat.position);
        this.player.root.position.y -= 0.42;
        this.player.facing = Math.atan2(seat.tangent.x, seat.tangent.z);
        this.player.root.rotation.y = this.player.facing;
      }
    } else if (input) {
      const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const moveZ = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      const isMoving = moveX !== 0 || moveZ !== 0;

      if (isMoving) {
        const speed = input.sprint ? 11.2 : 6.4;
        const dir = new THREE.Vector3()
          .addScaledVector(cameraBasis.forward, moveZ)
          .addScaledVector(cameraBasis.right, moveX)
          .normalize();
        this.player.position.x = THREE.MathUtils.clamp(this.player.position.x + dir.x * speed * stepDt, -74, 74);
        this.player.position.z = THREE.MathUtils.clamp(this.player.position.z + dir.z * speed * stepDt, -74, 74);
        this.player.facing = Math.atan2(dir.x, dir.z);
        this._playPlayerAnim(input.sprint ? "run" : "walk");
      } else {
        this._playPlayerAnim("idle");
      }

      const groundY = Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(this.player.position.x, this.player.position.z));
      if (input.jump && this.player.grounded) {
        this.player.vy = 6.8;
        this.player.grounded = false;
      }
      if (!this.player.grounded) {
        this.player.vy -= 18.5 * stepDt;
        this.player.position.y += this.player.vy * stepDt;
        if (this.player.position.y <= groundY) {
          this.player.position.y = groundY;
          this.player.vy = 0;
          this.player.grounded = true;
        }
      } else {
        this.player.position.y = groundY;
      }

      this.player.root.position.copy(this.player.position);
      this.player.root.rotation.y = this.player.facing;
    }

    if (this.player.mixer) {
      this.player.mixer.update(stepDt);
    }

    // 2. Update Remote Multi-user Avatars (including ride-along seats)
    for (const rec of this.remotePeers.values()) {
      if (rec.riding?.kind === "coaster") {
        const seat = coasterEngine.getSeatState(rec.riding.id, 0, Math.min(3, (rec.riding.carIndex || 1)));
        if (seat) {
          rec.pos.copy(seat.position);
          rec.root.position.copy(seat.position);
          rec.root.rotation.y = Math.atan2(seat.tangent.x, seat.tangent.z);
        }
      } else {
        rec.pos.lerp(rec.targetPos, Math.min(1, stepDt * 9));
        rec.pos.y = Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(rec.pos.x, rec.pos.z));
        rec.root.position.copy(rec.pos);
        rec.root.rotation.y = rec.facing;
      }
      this._projectOverlayEl(rec.tagEl, rec.root.position, 2.2, camera, viewportW, viewportH);
    }

    // 3. Autonomous AI Crowd walking paths + reaction speech bubbles
    this._bubbleTimer += stepDt;
    for (const g of this.aiGuests) {
      const dx = g.targetPos.x - g.pos.x;
      const dz = g.targetPos.z - g.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1.1) {
        const nxt = this.terrain.getNextWaypoint(g.targetIndex);
        g.targetIndex = nxt.index;
        g.targetPos.copy(nxt.position);
      } else {
        const step = Math.min(dist, g.speed * stepDt);
        g.pos.x += (dx / dist) * step;
        g.pos.z += (dz / dist) * step;
        g.mesh.rotation.y = Math.atan2(dx, dz);
      }

      const gy = Math.max(this.terrain.waterLevel + 0.15, this.terrain.getHeightAt(g.pos.x, g.pos.z));
      g.phase += stepDt * 7.5;
      g.pos.y = gy + Math.abs(Math.sin(g.phase)) * 0.12;
      g.mesh.position.copy(g.pos);

      if (g.bubbleEl) {
        if (g.bubbleRemaining > 0) {
          g.bubbleRemaining -= stepDt;
          if (g.bubbleRemaining <= 0) {
            g.bubbleEl.hidden = true;
          } else {
            this._projectOverlayEl(g.bubbleEl, g.pos, 2.1, camera, viewportW, viewportH);
          }
        } else if (this._bubbleTimer > 3.5 && Math.random() < 0.015) {
          g.bubbleText = this.guestLines[Math.floor(Math.random() * this.guestLines.length)];
          g.bubbleEl.textContent = g.bubbleText;
          g.bubbleEl.hidden = false;
          g.bubbleRemaining = 5.5;
          this._bubbleTimer = 0;
        }
      }
    }
  }

  _projectOverlayEl(el, worldPos, yOff, camera, w, h) {
    if (!el || !camera) return;
    this._projVec.set(worldPos.x, worldPos.y + yOff, worldPos.z).project(camera);
    if (this._projVec.z > 1 || this._projVec.z < -1) {
      el.hidden = true;
      return;
    }
    const sx = (this._projVec.x * 0.5 + 0.5) * w;
    const sy = (-this._projVec.y * 0.5 + 0.5) * h;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
  }

  getGuestCount() {
    return this.aiGuests.length;
  }

  dispose() {
    for (const rec of this.remotePeers.values()) rec.tagEl?.remove();
    for (const g of this.aiGuests) g.bubbleEl?.remove();
    this.remotePeers.clear();
    this.aiGuests = [];
    this.scene.remove(this.group);
  }
}
