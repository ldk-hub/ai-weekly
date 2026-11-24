/**
 * WeeklyLand Single Source of Truth World Store
 * Manages park_world.json state, 50-step Undo/Redo command history,
 * IndexedDB draft persistence, and blueprint export/import validation.
 */

const DB_NAME = "weeklyland-db-v2";
const STORE_NAME = "drafts";
const DRAFT_KEY = "active-park-world";
const MAX_HISTORY = 50;

function deepClone(obj) {
  return typeof structuredClone === "function"
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj));
}

function openDraftDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function validateParkWorld(data) {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.coasters) || !Array.isArray(data.rides)) return false;
  if (!data.terrain || typeof data.terrain !== "object") return false;
  return true;
}

export class ParkWorldState {
  constructor(initialData) {
    this.data = deepClone(initialData);
    this.baseline = deepClone(initialData);
    this.undoStack = [];
    this.redoStack = [];
    this.listeners = new Map();
    this.dirty = false;
    this.mode = "guest"; // "guest" | "architect"
    this.selected = null; // { kind: 'coaster'|'node'|'ride'|'scenery'|'pavilion', id, nodeIndex? }
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[ParkWorldState] listener error on ${event}:`, err);
      }
    }
  }

  getSnapshot() {
    return this.data;
  }

  setMode(nextMode) {
    if (nextMode !== "guest" && nextMode !== "architect") return;
    if (this.mode === nextMode) return;
    this.mode = nextMode;
    this.emit("mode:changed", nextMode);
  }

  setSelection(sel) {
    this.selected = sel;
    this.emit("selection:changed", sel);
  }

  /**
   * Commit a mutation with automatic Undo snapshot and IndexedDB draft save.
   */
  mutate(scope, mutatorFn, { recordHistory = true, broadcast = true } = {}) {
    if (recordHistory) {
      this.undoStack.push(deepClone(this.data));
      if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
      this.redoStack.length = 0;
    }

    mutatorFn(this.data);
    this.data.parkMeta = this.data.parkMeta || {};
    this.data.parkMeta.updatedAt = new Date().toISOString();
    this.dirty = true;

    this.emit("world:changed", { scope, data: this.data, broadcast });
    if (scope && scope !== "all") {
      this.emit(`${scope}:changed`, this.data);
    }
    this.saveDraft().catch(() => {});
  }

  applyRemotePatch(nextWorldData) {
    if (!validateParkWorld(nextWorldData)) return false;
    this.data = deepClone(nextWorldData);
    this.emit("world:changed", { scope: "all", data: this.data, broadcast: false });
    return true;
  }

  undo() {
    if (!this.undoStack.length) return false;
    this.redoStack.push(deepClone(this.data));
    this.data = this.undoStack.pop();
    this.dirty = true;
    this.emit("world:changed", { scope: "all", data: this.data, broadcast: true });
    this.saveDraft().catch(() => {});
    return true;
  }

  redo() {
    if (!this.redoStack.length) return false;
    this.undoStack.push(deepClone(this.data));
    this.data = this.redoStack.pop();
    this.dirty = true;
    this.emit("world:changed", { scope: "all", data: this.data, broadcast: true });
    this.saveDraft().catch(() => {});
    return true;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  resetToBaseline() {
    this.undoStack.push(deepClone(this.data));
    this.redoStack.length = 0;
    this.data = deepClone(this.baseline);
    this.dirty = false;
    this.clearDraft().catch(() => {});
    this.emit("world:changed", { scope: "all", data: this.data, broadcast: true });
  }

  markPublished() {
    this.baseline = deepClone(this.data);
    this.dirty = false;
    this.clearDraft().catch(() => {});
    this.emit("publish:done", this.data);
  }

  async saveDraft() {
    const db = await openDraftDb();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(this.data, DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadDraft() {
    const db = await openDraftDb();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(DRAFT_KEY);
      req.onsuccess = () => resolve(validateParkWorld(req.result) ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  }

  async clearDraft() {
    const db = await openDraftDb();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  exportBlueprintString() {
    return JSON.stringify(this.data, null, 2);
  }

  importBlueprintString(rawText) {
    const parsed = JSON.parse(rawText);
    if (!validateParkWorld(parsed)) {
      throw new Error("유효한 위클리랜드 park_world.json 형식이 아닙니다.");
    }
    this.mutate("all", () => {
      this.data = deepClone(parsed);
    });
  }
}
