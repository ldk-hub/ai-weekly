const fs = require("fs");
const path = require("path");

const DEFAULT_FILE = path.join(__dirname, "..", "..", "data", "social", "seeds.json");
const norm = (list) => [...new Set((list || []).map((h) => String(h).replace(/^(@|r\/)/i, "").trim().toLowerCase()).filter(Boolean))];

function loadSeeds(file = DEFAULT_FILE) {
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  return { x: norm(raw.x), threads: norm(raw.threads), instagram: norm(raw.instagram), reddit: norm(raw.reddit) };
}

module.exports = { loadSeeds };
