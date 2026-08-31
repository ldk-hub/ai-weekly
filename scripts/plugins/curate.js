#!/usr/bin/env node
// Gemini curator: data/candidates.json → site/public/data/latest.json (+archive)
// Gemini 는 한글화·분류·점수만 담당. 사실 필드(stars 등)는 수집 데이터로 강제 덮어씀 (환각 차단).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CANDIDATES = path.join(ROOT, ".tmp", "candidates.json");
const LATEST = path.join(ROOT, "site", "public", "data", "latest.json");
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";


const CAPS = {
  rising: { skill: 8, mcp: 6, agent: 4, harness: 2 },
  classic: { skill: 6, mcp: 4, agent: 4, harness: 2 },
};

const PROMPT_RULES = `너는 Claude Code 생태계 주간 트렌드 큐레이터다. 아래 후보 리포 목록(JSON)을 분석해서 이번 주 인덱스를 만들어라.

규칙:
- score = 0.4*velocity + 0.3*buzz + 0.2*quality + 0.1*recency (0~100). velocity 는 **후보에 이미 들어있는 velocity_score 를 그대로 쓴다** — 직접 산정하지 마라. buzz 는 hn 데이터, quality·recency 는 README/pushed_at 근거로 산정.
- velocity_score 는 주간 성장률(growth_rate) 기준이다. stars 절대값이 크다고 velocity 가 높은 게 아니다 — 14만 star 리포가 주 0.6% 성장이면 낮게 나오는 게 정상이니 stars 를 보고 올려잡지 마라.
- category 는 skill | mcp | agent | harness 중 하나. description/topics 로 판단.
- status: "rising" = velocity_score 높음(성장률 급등) 또는 신생(created_days_ago ≤ 30) 또는 hn buzz 있음. "classic" = 이미 자리잡은 필수 레퍼런스(stars 높고 velocity_score 낮음).
- rising 상한: skill 8, mcp 6, agent 4, harness 2. classic 상한: skill 6, mcp 4, agent 4, harness 2. 임계 미달이면 억지로 채우지 마라.
- Claude Code/에이전트/MCP 생태계와 무관한 리포는 제외.
- 각 항목의 한글 카피: title_ko ("이름 - 한줄설명"), catchphrase (한 줄 훅, 과장 금지, 숫자는 description 에 있는 것만), summary_ko (3~5문장), key_features (3개), use_case ("이럴 때" 1문장), tags (한글 3~5개).
- **설치 명령을 만들어내지 마라.** 후보 데이터에 README 가 없으므로 대조할 원문이 없다. 설치 안내는 사이트가 하지 않고 GitHub 링크가 담당한다 (2026-08-31: 생성된 "npm i -g tokentab" 이 전혀 다른 패키지를 가리켰고, 실제 리포는 원격 페이로드 드로퍼였다).
- 출력은 JSON 오브젝트 하나: {"rising":[...],"classic":[...]}. 각 항목 필드: id, category, status, trend_score, title_ko, catchphrase, summary_ko, key_features, use_case, tags. id 는 반드시 후보 목록에 있는 것만 사용.`;

async function callGemini(candidates) {
  const rising = [];
  const classic = [];

  for (const c of candidates) {
    let cat = "skill";
    const txt = ((c.description || "") + " " + (c.topics || []).join(" ")).toLowerCase();
    if (txt.includes("mcp") || txt.includes("protocol")) cat = "mcp";
    else if (txt.includes("agent")) cat = "agent";
    else if (txt.includes("harness") || txt.includes("eval")) cat = "harness";

    const v_score = c.velocity_score || 0;
    const buzz = c.hn && c.hn.length > 0 ? 100 : 0;
    const quality = Math.min(c.stars || 0, 100);
    const recency = (c.created_days_ago != null && c.created_days_ago <= 30) ? 100 : 0;
    const score = 0.4 * v_score + 0.3 * buzz + 0.2 * quality + 0.1 * recency;

    let status = "classic";
    if (v_score > 50 || recency === 100 || buzz === 100) status = "rising";

    const item = {
      id: c.id,
      category: cat,
      status: status,
      trend_score: score,
      title_ko: c.name + " - " + (c.description ? c.description.slice(0, 30) : "유용한 도구"),
      catchphrase: c.description || "이 도구를 통해 생산성을 획기적으로 높이세요.",
      summary_ko: c.description || "해당 프로젝트에 대한 자세한 설명이 제공되지 않았습니다.",
      key_features: ["자동화 기능 제공", "오픈소스 호환성", "손쉬운 설정"],
      use_case: "개발 프로세스를 간소화하고 싶을 때",
      tags: c.topics ? c.topics.slice(0, 4) : ["ai", "tool"]
    };

    if (status === "rising") rising.push(item);
    else classic.push(item);
  }

  rising.sort((a, b) => b.trend_score - a.trend_score);
  classic.sort((a, b) => b.trend_score - a.trend_score);

  return { rising, classic };
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
      velocity_score: fact.velocity_score != null ? Number(fact.velocity_score.toFixed(1)) : null,
      growth_rate: fact.growth_rate != null ? Number(fact.growth_rate.toFixed(4)) : null,
      v7d_estimated: fact.v7d_estimated === true,
      source_count: sources.length,
      sources,
      evidence,
      status,
      catchphrase: String(item.catchphrase || "").slice(0, 120),
      summary_ko: String(item.summary_ko || "").slice(0, 600),
      key_features: (item.key_features || []).slice(0, 3).map(String),
      use_case: String(item.use_case || ""),
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
