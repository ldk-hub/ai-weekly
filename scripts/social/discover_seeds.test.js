const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  buildAnchorProfile,
  scorePostAiSignal,
  evaluateCandidate,
  extractCorpusCandidates,
  evolveSeedRegistry,
} = require("./discover_seeds");

const nowIso = new Date().toISOString();
const oldIso = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();

// 1. scorePostAiSignal distinguishes real AI tips vs promo spam
const goodSig = scorePostAiSignal(
  "Claude Code MCP workflow tips: use deterministic steps for reliable AI agents and prompt evals.",
  ["클로드 코드", "mcp"],
);
assert.strictEqual(goodSig.isAi, true);
assert.strictEqual(goodSig.isSpam, false);
assert.ok(goodSig.score >= 60);

const spamSig = scorePostAiSignal(
  "자는 동안 놓친 뉴스 💸 벌기, 모으기, 쓰기와 관련된 가장 트렌디한 소식 받아보기",
  ["클로드 코드"],
);
assert.strictEqual(spamSig.isSpam, true);
assert.strictEqual(spamSig.isAi, false);

// 2. evaluateCandidate gates
const passEval = evaluateCandidate(
  "good_builder",
  [
    { text: "How to build reliable Claude Code MCP workflows with deterministic verification gates.", publishedAt: nowIso, metrics: { likes: 120, reposts: 15, replies: 8 } },
    { text: "Benchmarking Gemini 4 and Claude agents on real repository refactoring tasks.", publishedAt: nowIso, metrics: { likes: 80, reposts: 10, replies: 5 } },
  ],
  ["claude", "mcp"],
);
assert.strictEqual(passEval.passed, true);
assert.ok(passEval.verifyScore >= 60);

const staleEval = evaluateCandidate(
  "old_account",
  [
    { text: "Claude prompt engineering guide for multi-step coding agents.", publishedAt: oldIso },
    { text: "Another LLM prompt engineering breakdown with benchmarks.", publishedAt: oldIso },
  ],
  ["claude"],
);
assert.strictEqual(staleEval.passed, false);
assert.strictEqual(staleEval.reason, "stale_account");

const spamEval = evaluateCandidate(
  "spam_account",
  [
    { text: "자는 동안 놓친 뉴스 벌기, 모으기, 쓰기 재테크 트렌드 정리", publishedAt: nowIso },
    { text: "자가증식 재테크 무료 airdrop giveaway 지금 DM 주세요!", publishedAt: nowIso },
  ],
  ["claude"],
);
assert.strictEqual(spamEval.passed, false);
assert.strictEqual(spamEval.reason, "spam_detected");

// 3. extractCorpusCandidates & buildAnchorProfile on temp workspace
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiw-discover-test-"));
try {
  const socialDir = path.join(tmpDir, "social");
  const newsDir = path.join(tmpDir, "archive");
  fs.mkdirSync(socialDir, { recursive: true });
  fs.mkdirSync(newsDir, { recursive: true });

  fs.writeFileSync(
    path.join(socialDir, "2026-11-16.json"),
    JSON.stringify({
      items: [
        { id: "x:1", platform: "x", author: "@minchoi", relevance: 90, tags: ["클로드 코드", "에이전트"] },
      ],
    }),
  );
  const candPath = path.join(tmpDir, "candidates.json");
  fs.writeFileSync(
    candPath,
    JSON.stringify({
      posts: [
        { platform: "x", author: "@minchoi", text: "Check out @new_ai_dev and https://x.com/karpathy/status/123" },
        { platform: "threads", author: "@ekke.now", text: "자는 동안 놓친 뉴스 벌기, 모으기, 쓰기" },
      ],
    }),
  );
  const newsPath = path.join(tmpDir, "news_latest.json");
  fs.writeFileSync(newsPath, JSON.stringify({ news: [{ url: "https://threads.com/@subinium/post/1", body_ko: "r/vibecoding" }] }));

  const profile = buildAnchorProfile({ socialDir, candidatesPath: candPath });
  assert.ok(profile.anchorKeywords.includes("클로드 코드"));
  assert.strictEqual(profile.accountStats["threads:ekke.now"].spamCount, 1);

  const cands = extractCorpusCandidates({ socialDir, candidatesPath: candPath, newsLatestPath: newsPath, newsArchiveDir: newsDir });
  assert.ok(cands.x.has("karpathy"));
  assert.ok(cands.x.has("new_ai_dev"));
  assert.ok(cands.threads.has("subinium"));
  assert.ok(cands.reddit.has("vibecoding"));

  // 4. evolveSeedRegistry retires spam core & promotes verified
  const baseReg = {
    core: { x: ["minchoi"], threads: ["choi.openai", "ekke.now"], instagram: [], reddit: ["claudeai"] },
    discovered: { x: [], threads: [], instagram: [], reddit: [] },
    retired: { x: [], threads: [], instagram: [], reddit: [] },
  };
  const { registry: evolved, promotedEvents, retiredEvents } = evolveSeedRegistry(
    baseReg,
    {
      x: [{ handle: "karpathy", verifyScore: 88, aiRatio: 1, sampleCount: 4, discoveredFrom: "corpus" }],
      threads: [{ handle: "subinium", verifyScore: 82, aiRatio: 0.75, sampleCount: 4, discoveredFrom: "corpus" }],
      instagram: [],
      reddit: [],
    },
    profile.accountStats,
  );
  assert.ok(retiredEvents.some((e) => e.platform === "threads" && e.handle === "ekke.now"));
  assert.ok(promotedEvents.some((e) => e.platform === "x" && e.handle === "karpathy"));
  assert.ok(evolved.discovered.threads.some((d) => d.handle === "subinium"));
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

console.log("✅ discover_seeds.test.js 통과");
