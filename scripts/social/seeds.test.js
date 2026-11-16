const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadSeeds, loadSeedRegistry, saveSeedRegistry } = require("./seeds");

const tmp = path.join(os.tmpdir(), "seeds-test.json");
fs.writeFileSync(tmp, JSON.stringify({ x: ["@Foo", "foo", "bar"], threads: ["Baz"], reddit: ["r/ClaudeAI", "claudeai"] }));
const s = loadSeeds(tmp);
assert.deepStrictEqual(s.x, ["foo", "bar"]);
assert.deepStrictEqual(s.threads, ["baz"]);
assert.deepStrictEqual(s.instagram, []);
assert.deepStrictEqual(s.reddit, ["claudeai"]);

// v2 registry merging & retired filtering
const tmpV2 = path.join(os.tmpdir(), "seeds-v2-test.json");
saveSeedRegistry({
  core: { x: ["minchoi", "dropme"], threads: ["choi.openai"], instagram: [], reddit: ["claudeai"] },
  discovered: {
    x: [{ handle: "new_ai_builder", verifyScore: 84, aiRatio: 0.8 }],
    threads: [],
    instagram: [],
    reddit: [{ handle: "vibecoding", verifyScore: 78, aiRatio: 0.75 }],
  },
  retired: { x: [{ handle: "dropme", reason: "low_yield" }], threads: [], instagram: [], reddit: [] },
}, tmpV2);
const v2 = loadSeeds(tmpV2);
assert.deepStrictEqual(v2.x, ["minchoi", "new_ai_builder"]);
assert.deepStrictEqual(v2.reddit, ["claudeai", "vibecoding"]);
const regV2 = loadSeedRegistry(tmpV2);
assert.strictEqual(regV2.discovered.x[0].verifyScore, 84);
assert.strictEqual(regV2.retired.x[0].handle, "dropme");

assert.ok(loadSeeds().x.length > 0, "기본 시드 파일 로드");
assert.ok(loadSeeds().reddit.length > 0, "레딧 시드 로드");
assert.ok(loadSeeds().instagram.length >= 5, "인스타그램 시드 로드");
console.log("✅ seeds.test.js 통과");
