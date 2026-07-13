#!/usr/bin/env node
// Gemini curator: data/candidates.json → site/public/data/latest.json (+archive)
// Gemini 는 한글화·분류·점수만 담당. 사실 필드(stars 등)는 수집 데이터로 강제 덮어씀 (환각 차단).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CANDIDATES = path.join(ROOT, "data", "candidates.json");
const LATEST = path.join(ROOT, "site", "public", "data", "latest.json");
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

if (!API_KEY) {
  console.error("GEMINI_API_KEY is required");
  process.exit(1);
}

const CAPS = {
  rising: { skill: 8, mcp: 6, agent: 4, harness: 2 },
  classic: { skill: 6, mcp: 4, agent: 4, harness: 2 },
};

const PROMPT_RULES = `너는 Claude Code 생태계 주간 트렌드 큐레이터다. 아래 후보 리포 목록(JSON)을 분석해서 이번 주 인덱스를 만들어라.

규칙:
- score = 0.4*velocity + 0.3*buzz + 0.2*quality + 0.1*recency (0~100). velocity_7d 와 hn 데이터 근거로 산정.
- category 는 skill | mcp | agent | harness 중 하나. description/topics 로 판단.
- status: "rising" = 이번 주 급상승(velocity_7d 높거나 hn buzz 있음, 신생), "classic" = 이미 자리잡은 필수 레퍼런스(stars 높고 velocity 낮음).
- rising 상한: skill 8, mcp 6, agent 4, harness 2. classic 상한: skill 6, mcp 4, agent 4, harness 2. 임계 미달이면 억지로 채우지 마라.
- Claude Code/에이전트/MCP 생태계와 무관한 리포는 제외.
- 각 항목의 한글 카피: title_ko ("이름 - 한줄설명"), catchphrase (한 줄 훅, 과장 금지, 숫자는 description 에 있는 것만), summary_ko (3~5문장), key_features (3개), use_case ("이럴 때" 1문장), install_hint (설치 힌트, 모르면 "README 참고"), tags (한글 3~5개).
- 출력은 JSON 오브젝트 하나: {"rising":[...],"classic":[...]}. 각 항목 필드: id, category, status, trend_score, title_ko, catchphrase, summary_ko, key_features, use_case, install_hint, tags. id 는 반드시 후보 목록에 있는 것만 사용.`;

async function callGemini(candidates) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${PROMPT_RULES}\n\n후보 목록:\n${JSON.stringify(candidates)}` }],
      },
    ],
    generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    // 응답 본문에 키가 포함되지 않도록 상태코드만 노출
    throw new Error(`Gemini API error: HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return JSON.parse(text);
}

function groundTruthMerge(items, candMap, status) {
  const out = [];
  const counts = {};
  for (const item of items || []) {
    const fact = candMap.get(item.id);
    if (!fact) {
      console.warn(`drop hallucinated id: ${item.id}`);
      continue;
    }
    const cat = ["skill", "mcp", "agent", "harness"].includes(item.category)
      ? item.category
      : "skill";
    counts[cat] = (counts[cat] || 0) + 1;
    if (counts[cat] > CAPS[status][cat]) continue;

    const evidence = [];
    if (fact.velocity_7d != null && fact.velocity_7d > 0) {
      evidence.push({
        source: "github",
        url: fact.url,
        label: `최근 7일 +${fact.velocity_7d.toLocaleString()} stars`,
      });
    }
    for (const hn of (fact.hn || []).slice(0, 2)) {
      evidence.push({ source: "hn", url: hn.url, label: `HN ${hn.points}p · ${hn.title}` });
    }
    const sources = ["github", ...(fact.hn?.length ? ["hn"] : [])];
    out.push({
      id: fact.id,
      name: fact.name,
      owner: fact.owner,
      title_ko: String(item.title_ko || fact.name).slice(0, 80),
      official_url: fact.url,
      repo_url: fact.url,
      category: cat,
      score: Number(item.trend_score) || 0,
      trend_score: Number(item.trend_score) || 0,
      stars: fact.stars,
      velocity_7d: fact.velocity_7d,
      source_count: sources.length,
      sources,
      evidence,
      status,
      catchphrase: String(item.catchphrase || "").slice(0, 120),
      summary_ko: String(item.summary_ko || "").slice(0, 600),
      key_features: (item.key_features || []).slice(0, 3).map(String),
      use_case: String(item.use_case || ""),
      install_hint: String(item.install_hint || "README 참고"),
      badge: status === "rising" ? "🔥 Rising" : "⭐ Classic",
      badges: [status === "rising" ? "🔥 Rising" : "⭐ Classic"],
      tags: (item.tags || []).slice(0, 5).map(String),
      thumbnail_url: `https://github.com/${fact.owner}.png`,
    });
  }
  return out.sort((a, b) => b.trend_score - a.trend_score);
}

async function main() {
  const { candidates } = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
  const candMap = new Map(candidates.map((c) => [c.id, c]));

  let curated;
  try {
    curated = await callGemini(candidates);
  } catch (e) {
    console.warn(`first attempt failed (${e.message}), retrying once...`);
    curated = await callGemini(candidates);
  }

  const rising = groundTruthMerge(curated.rising, candMap, "rising");
  const classic = groundTruthMerge(curated.classic, candMap, "classic");
  if (rising.length + classic.length === 0) {
    console.error("curation produced 0 items — keeping last week's data");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const latest = {
    generated: today,
    generated_at: today,
    version: `v${today.replaceAll("-", ".")}`,
    rising,
    classic,
  };

  fs.writeFileSync(LATEST, JSON.stringify(latest, null, 2));
  const archivePath = path.join(ROOT, "data", "archive", `${today}.json`);
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  fs.writeFileSync(archivePath, JSON.stringify(latest, null, 2));
  console.log(`curated rising=${rising.length} classic=${classic.length} → latest.json + archive/${today}.json`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
