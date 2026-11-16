const fs = require("fs");
const path = require("path");

const DEFAULT_FILE = path.join(__dirname, "..", "..", "data", "social", "seeds.json");
const PLATFORMS = ["x", "threads", "instagram", "reddit"];

const normalizeHandle = (h) =>
  String(h || "")
    .replace(/^(@|r\/)/i, "")
    .trim()
    .toLowerCase();

const normList = (list) => [...new Set((list || []).map(normalizeHandle).filter(Boolean))];

function extractHandle(entry) {
  if (!entry) return "";
  return typeof entry === "string" ? normalizeHandle(entry) : normalizeHandle(entry.handle);
}

function loadSeedRegistry(file = DEFAULT_FILE) {
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  const registry = {
    version: raw.version || 2,
    updatedAt: raw.updatedAt || null,
    lastDiscoveryAt: raw.lastDiscoveryAt || null,
    core: {},
    discovered: {},
    retired: {},
  };

  for (const p of PLATFORMS) {
    const retiredEntries = (raw.retired?.[p] || []).map((e) =>
      typeof e === "string" ? { handle: normalizeHandle(e), retiredAt: null, reason: "manual" } : { ...e, handle: normalizeHandle(e.handle) }
    ).filter((e) => e.handle);
    const retiredSet = new Set(retiredEntries.map((e) => e.handle));

    const coreList = normList(raw.core?.[p] || raw[p] || []);
    const discoveredEntries = (raw.discovered?.[p] || [])
      .map((e) => (typeof e === "string" ? { handle: normalizeHandle(e) } : { ...e, handle: normalizeHandle(e.handle) }))
      .filter((e) => e.handle && !coreList.includes(e.handle) && !retiredSet.has(e.handle));

    const active = [...new Set([
      ...coreList.filter((h) => !retiredSet.has(h)),
      ...discoveredEntries.filter((e) => e.status !== "retired").map((e) => e.handle),
      ...normList(raw[p] || []).filter((h) => !retiredSet.has(h)),
    ])];

    registry.core[p] = coreList;
    registry.discovered[p] = discoveredEntries;
    registry.retired[p] = retiredEntries;
    registry[p] = active;
  }

  return registry;
}

function saveSeedRegistry(registry, file = DEFAULT_FILE) {
  const out = {
    version: 2,
    updatedAt: registry.updatedAt || new Date().toISOString(),
    lastDiscoveryAt: registry.lastDiscoveryAt || null,
    core: {},
    discovered: {},
    retired: {},
  };

  for (const p of PLATFORMS) {
    const retiredEntries = (registry.retired?.[p] || [])
      .map((e) => (typeof e === "string" ? { handle: normalizeHandle(e) } : { ...e, handle: normalizeHandle(e.handle) }))
      .filter((e) => e.handle);
    const retiredSet = new Set(retiredEntries.map((e) => e.handle));
    const coreList = normList(registry.core?.[p] || []);
    const discoveredEntries = (registry.discovered?.[p] || [])
      .map((e) => ({ ...e, handle: normalizeHandle(e.handle) }))
      .filter((e) => e.handle && !coreList.includes(e.handle) && !retiredSet.has(e.handle));

    out.core[p] = coreList;
    out.discovered[p] = discoveredEntries;
    out.retired[p] = retiredEntries;
    out[p] = [...new Set([
      ...coreList.filter((h) => !retiredSet.has(h)),
      ...discoveredEntries.filter((e) => e.status !== "retired").map((e) => e.handle),
    ])];
  }

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  return out;
}

function loadSeeds(file = DEFAULT_FILE) {
  const reg = loadSeedRegistry(file);
  return { x: reg.x, threads: reg.threads, instagram: reg.instagram, reddit: reg.reddit };
}

module.exports = { PLATFORMS, normalizeHandle, extractHandle, loadSeeds, loadSeedRegistry, saveSeedRegistry };
