import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/**
 * 8-Directional Y-Axis Cylindrical Billboard Actor backed by atlas JSON + NearestFilter PNG sheet.
 */
export class SpriteActor {
  constructor(mesh, texture, atlas) {
    this.mesh = mesh;
    this.texture = texture;
    this.atlas = atlas;
    this.currentAction = "Idle";
    this.frameTimer = 0;
    this.currentCol = atlas.columns.Idle?.start ?? 0;
    this.facingAngle = 0;
    this.lastSector = 0;
    this.onActionComplete = null;
  }

  /**
   * Switch active sprite clip ('Idle' | 'Walk' | 'Attack' | 'Cast' | 'Sit').
   */
  playAction(actionName, onComplete = null, restart = false) {
    const spec = this.atlas.columns[actionName];
    if (!spec) return;
    if (this.currentAction === actionName && !restart) return;
    this.currentAction = actionName;
    this.frameTimer = 0;
    this.currentCol = spec.start;
    this.onActionComplete = onComplete;
  }

  /**
   * Update billboard Y-rotation, advance sprite animation frames, and quantize 8-dir UV row.
   * Row mapping: 0:S, 1:SW, 2:W, 3:NW, 4:N, 5:NE, 6:E, 7:SE
   */
  update(dt, cameraAzimuth, facingAngle = this.facingAngle) {
    this.facingAngle = facingAngle;
    this.mesh.rotation.y = cameraAzimuth;

    const spec = this.atlas.columns[this.currentAction] || this.atlas.columns.Idle;
    const frameDuration = 1 / Math.max(1, spec.fps || 8);
    this.frameTimer += dt;

    while (this.frameTimer >= frameDuration) {
      this.frameTimer -= frameDuration;
      if (this.currentCol < spec.end) {
        this.currentCol += 1;
      } else if (spec.loop !== false) {
        this.currentCol = spec.start;
      } else {
        const cb = this.onActionComplete;
        this.onActionComplete = null;
        this.playAction("Idle", null, true);
        if (cb) cb();
        break;
      }
    }

    const twoPi = Math.PI * 2;
    let rel = (cameraAzimuth - facingAngle) % twoPi;
    if (rel < 0) rel += twoPi;
    const sector = Math.round(rel / (Math.PI / 4)) % 8;
    this.lastSector = sector;

    this.texture.offset.set(
      this.currentCol / this.atlas.cols,
      (this.atlas.rows - 1 - sector) / this.atlas.rows
    );
    return sector;
  }

  dispose() {
    this.mesh.geometry?.dispose();
    this.mesh.material?.dispose();
    this.mesh.customDepthMaterial?.dispose();
    this.texture?.dispose();
  }
}

function loadTextureAsync(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

/**
 * Dynamically load an 8-directional sprite actor from its atlas JSON specification.
 */
export async function loadSpriteActor(atlasJsonUrl) {
  const res = await fetch(atlasJsonUrl);
  if (!res.ok) throw new Error(`Failed to fetch atlas JSON: ${atlasJsonUrl} (${res.status})`);
  const atlas = await res.json();

  const textureLoader = new THREE.TextureLoader();
  const sheetUrl = new URL(atlas.sheet, document.baseURI).href;
  const spriteTexture = await loadTextureAsync(textureLoader, sheetUrl);

  spriteTexture.magFilter = THREE.NearestFilter;
  spriteTexture.minFilter = THREE.NearestFilter;
  spriteTexture.generateMipmaps = false;
  spriteTexture.colorSpace = THREE.SRGBColorSpace;
  spriteTexture.wrapS = THREE.ClampToEdgeWrapping;
  spriteTexture.wrapT = THREE.ClampToEdgeWrapping;
  spriteTexture.repeat.set(1 / atlas.cols, 1 / atlas.rows);
  spriteTexture.offset.set(0, (atlas.rows - 1) / atlas.rows);

  const worldHeight = atlas.world_height || 2.5;
  const aspect = (atlas.cell_width || 128) / (atlas.cell_height || 128);
  const worldWidth = worldHeight * aspect;

  const geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);
  geometry.translate(0, worldHeight / 2, 0);

  const material = new THREE.MeshStandardMaterial({
    map: spriteTexture,
    alphaTest: 0.5,
    transparent: false,
    roughness: 0.9,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: spriteTexture,
    alphaTest: 0.5,
  });

  return new SpriteActor(mesh, spriteTexture, atlas);
}

/**
 * Create subtle carved tile lines across the Sanctuary floor for HD-2D spatial depth.
 */
function buildSanctuaryTileOverlay(parentGroup) {
  const grid = new THREE.GridHelper(32, 16, 0x475569, 0x1e293b);
  grid.position.y = 0.015;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  parentGroup.add(grid);

  const innerRingGeom = new THREE.RingGeometry(4.6, 4.8, 48);
  innerRingGeom.rotateX(-Math.PI / 2);
  const innerRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(innerRingGeom, innerRingMat);
  ring.position.y = 0.088;
  parentGroup.add(ring);
}

function buildFallbackEnvironment(scene) {
  const group = new THREE.Group();
  const floorGeom = new THREE.BoxGeometry(34, 0.5, 34);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x263142, roughness: 0.9 });
  const floor = new THREE.Mesh(floorGeom, floorMat);
  floor.name = "Walkable_FallbackFloor";
  floor.position.y = -0.25;
  floor.receiveShadow = true;
  group.add(floor);
  buildSanctuaryTileOverlay(group);
  scene.add(group);
  return { environmentGroup: group, walkableMeshes: [floor], crystalMesh: null };
}

/**
 * Load the medieval Sanctuary 3D environment (.glb), enable shadows, and register walkable floor meshes.
 */
export async function loadSanctuaryEnvironment(glbUrl, scene) {
  const loader = new GLTFLoader();
  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(glbUrl, resolve, undefined, reject);
    });

    const envGroup = gltf.scene || new THREE.Group();
    const walkableMeshes = [];
    let crystalMesh = null;

    envGroup.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const lower = (child.name || "").toLowerCase();
      if (lower.includes("walkable") || lower.includes("floor") || lower.includes("ground")) {
        walkableMeshes.push(child);
      }
      if (lower.includes("crystal")) {
        crystalMesh = child;
      }
    });

    buildSanctuaryTileOverlay(envGroup);
    scene.add(envGroup);
    return { environmentGroup: envGroup, walkableMeshes, crystalMesh };
  } catch (err) {
    console.warn("[AssetManager] GLB load failed, using procedural Sanctuary fallback:", err);
    return buildFallbackEnvironment(scene);
  }
}
