#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const ROOT = path.join(__dirname, "..", "..");
const IN = path.join(ROOT, "data", "social_candidates.json");
const LATEST = path.join(ROOT, "site", "public", "data", "social_latest.json");
const ARCHIVE_DIR = path.join(ROOT, "data", "social");
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const LIMIT = Number(process.env.SOCIAL_LIMIT || 20);
const MIN_RELEVANCE = Number(process.env.SOCIAL_MIN_RELEVANCE || 40);

const PROMPT = `너는 AI 활용 팁 큐레이터다. 각 게시물에 대해 판단하라.
- drop: AI(생성형 AI, 프롬프트, AI 도구 활용, 에이전트, 모델 소식)와 무관하거나 광고·잡담·단순홍보면 true
- relevance: 0~100 (실용적 프롬프트/워크플로우/도구 팁일수록 높게)
- title_ko: 30자 이내 한국어 제목 (원문이 영어면 반드시 한국어로 번역)
- summary_ko: 한국어 2~3줄 요약(원문 복제 금지, 핵심만 재서술, 본문에 없는 내용 금지)
- tags: 한국어 태그 2~4개
출력: {"items":[{"id":"...","drop":false,"relevance":80,"title_ko":"...","summary_ko":"...","tags":["..."]}]}
id 는 입력값 그대로, 입력 전부에 대해 반환.`;

const PLACEHOLDER_RE = /\[임시\s*번역\]|\bTODO\b|\bTBD\b/i;
const KO_RE = /[가-힣]/;

function popularity(m = {}) {
  const raw = (m.likes || 0) + 3 * (m.reposts || 0) + 2 * (m.replies || 0);
  return raw <= 0 ? 0 : Math.min(100, Math.round(Math.log10(raw + 1) * 20));
}

function rank(items, limit = LIMIT) {
  return items
    .map((it) => ({ ...it, score: Math.round(0.6 * (it.relevance || 0) + 0.4 * popularity(it.metrics)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function qualityIssues(item, fact) {
  const issues = [];
  const title = String(item.title_ko || "").trim();
  const summary = String(item.summary_ko || "").trim();
  if (!title) issues.push("title_ko 누락");
  else if (!KO_RE.test(title)) issues.push("title_ko 미번역");
  if (!summary) issues.push("summary_ko 누락");
  else if (!KO_RE.test(summary)) issues.push("summary_ko 미번역");
  if (PLACEHOLDER_RE.test(title) || PLACEHOLDER_RE.test(summary)) issues.push("플레이스홀더 잔존");
  if (Number(item.relevance || 0) < MIN_RELEVANCE) issues.push(`relevance ${item.relevance} < ${MIN_RELEVANCE}`);
  if (!Array.isArray(item.tags) || item.tags.length === 0) issues.push("tags 누락");
  if (fact && fact.text && summary && summary.length >= 40 && fact.text.includes(summary)) {
    issues.push("summary_ko 원문 그대로 복사");
  }
  return issues;
}

async function callGemini(posts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const payload = posts.map((p) => ({ id: p.id, author: p.author, text: p.text.slice(0, 1500) }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\n게시물:\n${JSON.stringify(payload)}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: HTTP ${res.status}`); // 본문에 키가 섞이지 않도록 상태코드만
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return JSON.parse(text).items || [];
}

function validate(file = LATEST) {
  if (!fs.existsSync(IN)) {
    console.error(`검증 불가: ${IN} 없음 — collect_social.js 를 먼저 실행할 것`);
    process.exit(1);
  }
  const { posts = [] } = JSON.parse(fs.readFileSync(IN, "utf-8"));
  const factMap = new Map(posts.map((p) => [p.id, p]));
  const data = JSON.parse(fs.readFileSync(file, "utf-8"));
  const items = data.items || [];
  const violations = [];

  if (!items.length) violations.push("(전체) items 0건");
  if (items.length > LIMIT) violations.push(`(전체) items ${items.length} > 상한 ${LIMIT}`);

  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.id)) violations.push(`${it.id}: 중복 id`);
    seen.add(it.id);
    const fact = factMap.get(it.id);
    if (!fact) {
      violations.push(`${it.id}: 후보에 없는 id`);
      continue;
    }
    if (it.url !== fact.url) violations.push(`${it.id}: url 불일치 (${it.url} ≠ ${fact.url})`);
    if (it.author !== fact.author) violations.push(`${it.id}: author 불일치 (${it.author} ≠ ${fact.author})`);
    for (const issue of qualityIssues(it, fact)) violations.push(`${it.id}: ${issue}`);
  }

  console.log(`검증 대상 ${items.length}건 (${file})`);
  if (violations.length) {
    console.error(`❌ 규격 위반 ${violations.length}건:`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log("✅ 규격 통과 — 배포 가능");
}

async function main() {
  if (!API_KEY) {
    throw new Error("GEMINI_API_KEY 미설정 — `GEMINI_API_KEY=... node scripts/social/curate_social.js` 로 실행하거나 수동 큐레이션 후 `--validate` 를 실행하세요.");
  }
  const { posts = [] } = JSON.parse(fs.readFileSync(IN, "utf-8"));
  const byId = new Map(posts.map((p) => [p.id, p]));
  const judged = [];
  for (let i = 0; i < posts.length; i += 15) {
    const batch = posts.slice(i, i + 15);
    try {
      judged.push(...(await callGemini(batch)));
    } catch (e) {
      console.warn(`[social:curate] 배치 ${i / 15 + 1} 실패 재시도: ${e.message}`);
      judged.push(...(await callGemini(batch)));
    }
  }
  const kept = [];
  const seen = new Set();
  for (const j of judged) {
    if (j.drop || !byId.has(j.id) || seen.has(j.id)) continue;
    const fact = byId.get(j.id);
    const { drop, ...rest } = j;
    const merged = { ...fact, ...rest };
    if (qualityIssues(merged, fact).length) continue;
    seen.add(j.id);
    kept.push(merged);
  }
  const items = rank(kept);
  const date = moment().tz("Asia/Seoul").format("YYYY-MM-DD");
  const out = { date, generatedAt: new Date().toISOString(), count: items.length, items };
  fs.mkdirSync(path.dirname(LATEST), { recursive: true });
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.writeFileSync(LATEST, JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(ARCHIVE_DIR, `${date}.json`), JSON.stringify(out, null, 2));
  console.log(`[social:curate] ${posts.length} → 유지 ${kept.length} → 게시 ${items.length}`);
}

module.exports = { popularity, rank, qualityIssues, validate };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes("--validate")) {
    const target = args.find((a) => !a.startsWith("-")) || LATEST;
    validate(target);
  } else {
    main().catch((e) => { console.error(e.message); process.exit(1); });
  }
}
