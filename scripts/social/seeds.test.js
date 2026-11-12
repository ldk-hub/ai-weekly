const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadSeeds } = require("./seeds");

const tmp = path.join(os.tmpdir(), "seeds-test.json");
fs.writeFileSync(tmp, JSON.stringify({ x: ["@Foo", "foo", "bar"], threads: ["Baz"], reddit: ["r/ClaudeAI", "claudeai"] }));
const s = loadSeeds(tmp);
assert.deepStrictEqual(s.x, ["foo", "bar"]);
assert.deepStrictEqual(s.threads, ["baz"]);
assert.deepStrictEqual(s.instagram, []);
assert.deepStrictEqual(s.reddit, ["claudeai"]);
assert.ok(loadSeeds().x.length > 0, "기본 시드 파일 로드");
assert.ok(loadSeeds().reddit.length > 0, "레딧 시드 로드");
assert.ok(loadSeeds().instagram.length >= 5, "인스타그램 시드 로드");
console.log("✅ seeds.test.js 통과");
