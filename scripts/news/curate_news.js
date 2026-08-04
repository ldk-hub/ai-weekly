#!/usr/bin/env node
/**
 * curate_news.js
 * data/news_candidates.json → Gemini 로 기술신호 분류 + 한국어 번역 + 재작성 요약
 * → site/public/data/news_latest.json (+ archive)
 *
 * 사실 필드(url·author·publish_date·source·metrics)는 수집 데이터로 강제 덮어씀 (환각 차단).
 * Mock 데이터 없음 — 키가 없거나 결과가 0건이면 실패로 종료해 기존 데이터를 보존한다.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CANDIDATES = path.join(ROOT, ".tmp", "news_candidates.json");
const LATEST = path.join(ROOT, "site", "public", "data", "news_latest.json");
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const MIN_IMPORTANCE = Number(process.env.NEWS_MIN_IMPORTANCE || 40);
const BATCH_ITEMS = 10;
const BATCH_CHARS = 60000;
const BODY_SLICE = 5000;

const SELFCHECK = process.argv.includes("--selfcheck");
const VALIDATE = process.argv.includes("--validate");

// 출처 표기 — 결과물에 "봇"·"에이전트"가 썼다는 표현을 쓰지 않는다
const CURATED_BY = "ldk-hub";
const BODY_MIN_SENTENCES = 5;

// 투자·재무 중심 기사 하드 룰. LLM 프롬프트만으로는 새는 게 확인돼(중국 VC 50조 기사) 코드로도 막는다
const FINANCE_RE = /투자|펀딩|증시|주가|시총|기업\s*가치|밸류에이션|상장|IPO|funding|fundrais|raises?\s+\$|valuation|Series\s+[A-F]\b/i;

if (!API_KEY && !SELFCHECK && !VALIDATE) {
  console.error("GEMINI_API_KEY is required (mock 대체 없음 — 기존 데이터 보존을 위해 중단)");
  process.exit(1);
}

// 수집 대상 기술 신호 6축 (+ 정책은 기술 영향 큰 것만 간략히)
const SIGNALS = {
  model: "새 모델·버전 출시·프리뷰·벤치마크",
  product: "제품 신기능",
  devtool: "개발자 도구·에이전트 (코딩 에이전트, MCP, CLI)",
  oss: "개인·소규모 개발자 오픈소스·라이브러리·실험 도구",
  research: "연구·논문·새 기법",
  practice: "AI 활용 사례·워크플로우 팁",
  policy: "정책·규제·인프라 (기술 영향 큰 것만)",
};
const SIGNAL_IDS = Object.keys(SIGNALS);

// 수집 매체 7종. 여기 없는 값은 collect 단계에서 이미 버려진다
const SOURCE_NAMES = {
  geeknews: "GeekNews",
  hackernews: "Hacker News",
  aitimes: "AI타임스",
  reddit: "Reddit",
  github: "GitHub",
  x: "X (Twitter)",
  threads: "Threads",
};

const PROMPT_RULES = `너는 AI 기술 신호 전문 큐레이터다. 아래 후보 목록(JSON)의 **각 항목을 개별적으로** 판정·번역·요약하라.

[1] 신호 분류 — 각 항목에 signal_id 를 정확히 하나 배정한다:
${SIGNAL_IDS.map((k) => `  - ${k}: ${SIGNALS[k]}`).join("\n")}

[2] 제외(drop=true) 대상 — 다음이면 drop_reason 과 함께 버린다:
  - 주식·증시·투자·기업 재무 실적·펀딩 라운드 금액 중심 기사
  - AI 기술과 무관한 일반 뉴스, 광고, 어뷰징, 낚시성 제목만 있고 실체 없는 글
  - 24시간 이내 신규 사건이 아닌 과거 회고·재탕
  - 본문이 사실상 제목 반복뿐이라 요약할 내용이 없는 항목
  ※ 빅테크(OpenAI·Google·Meta·Anthropic 등)의 신규 모델/기능 발표는 **제외 대상이 아니다.** model/product 에 해당하는 1급 신호다.
  ※ policy 는 기술에 직접 영향이 큰 경우만 남기고, 남기더라도 요약을 짧게 한다.

[3] 번역·요약 — **스크랩 금지, 반드시 재작성한다:**
  - title_ko: 한국어 제목. 원문이 영어면 번역, 한국어면 다듬기. "[임시 번역]" 같은 접두사 절대 금지.
  - title_en: 영어 제목.
  - summary_ko: 정확히 3개의 불릿("• "로 시작, 줄바꿈 구분). 각 불릿은 완결된 한국어 문장.
      1번째=무엇이 일어났나, 2번째=기술적으로 무엇이 새로운가(수치·모델명·벤치마크 등 구체값), 3번째=개발자에게 왜 중요한가.
      원문 문장을 잘라 붙이지 말고 이해한 내용을 새 문장으로 쓸 것.
  - summary_en: 위 요약의 영어판 3문장.
  - body_ko: 한국어 해설 **5문장 이상 10문장 이하**. 배경·동작 방식·한계·비교 대상을 담는다. 원문 본문 통째 복사 금지. (5문장 미만은 자동 폐기된다)
  - body_en: body_ko 의 영어판.
  - oss 항목은 body_ko 에 "무엇을 하는 도구인지 / 어떻게 쓰는지 / 누가 만들었는지"를 반드시 포함.
  - research 항목은 body_ko 에 "제안 기법 / 실험 결과 수치 / 기존 방법 대비 차이"를 반드시 포함.
  - 본문에 없는 수치·기능·인용은 만들어내지 말 것. 근거가 없으면 그 문장을 쓰지 않는다.

[4] importance: 0~100 정수. 기준 = 신규성(24h 내 최초 공개) · 기술적 실체 · 개발자 실사용 영향 · 교차 출처 언급.

[5] tags: 한국어 태그 3~5개 (예: "코딩 에이전트", "오픈소스", "벤치마크").

[6] 출력은 JSON 오브젝트 하나:
{"items":[{"id":"후보의 id 그대로","drop":false,"drop_reason":"","signal_id":"model","importance":72,"title_ko":"...","title_en":"...","summary_ko":"• ...\\n• ...\\n• ...","summary_en":"...","body_ko":"...","body_en":"...","tags":["..."]}]}
id 는 반드시 후보 목록에 있는 값만 사용한다. 후보 전부에 대해 항목을 하나씩 반환하라(버릴 것은 drop=true 로).`;

async function callGemini(payload) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${PROMPT_RULES}\n\n후보 목록:\n${JSON.stringify(payload)}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: HTTP ${res.status}`); // 본문에 키가 섞이지 않도록 상태코드만
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return JSON.parse(text);
}

function toBatches(candidates) {
  const batches = [];
  let cur = [];
  let chars = 0;
  for (const c of candidates) {
    const slim = {
      id: c.id,
      source: c.source_name,
      cross_sources: c.cross_sources || null,
      url: c.url,
      title: c.title,
      author: c.author,
      publish_date: c.publish_date,
      metrics: c.metrics,
      signal_hint: c.signal_hint,
      body: (c.body || "").slice(0, BODY_SLICE),
    };
    const size = JSON.stringify(slim).length;
    if (cur.length >= BATCH_ITEMS || (chars + size > BATCH_CHARS && cur.length > 0)) {
      batches.push(cur);
      cur = [];
      chars = 0;
    }
    cur.push(slim);
    chars += size;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

const koreanRatio = (s) => {
  const t = (s || "").replace(/\s/g, "");
  if (!t) return 0;
  return (t.match(/[가-힣]/g) || []).length / t.length;
};

// 번역·요약이 실제로 수행됐는지 검증. 실패하면 그 항목은 버린다 (가짜 요약 노출 방지).
function qualityIssues(item, fact) {
  const issues = [];
  const titleKo = String(item.title_ko || "");
  const summaryKo = String(item.summary_ko || "");
  const bodyKo = String(item.body_ko || "");

  if (!titleKo.trim()) issues.push("title_ko 없음");
  if (/\[?임시\s*번역\]?|TODO|LOREM/i.test(titleKo + summaryKo + bodyKo)) issues.push("플레이스홀더 잔존");
  if (koreanRatio(titleKo) < 0.2) issues.push("title_ko 미번역");
  if (koreanRatio(summaryKo) < 0.25) issues.push("summary_ko 미번역");

  const bullets = summaryKo.split("\n").map((s) => s.trim()).filter(Boolean);
  if (bullets.length < 3) issues.push(`summary_ko 불릿 ${bullets.length}개`);
  if (bullets.some((b) => b.replace(/^[•\-\d.\s]+/, "").length < 15)) issues.push("summary_ko 불릿 과단축");

  // 원문 스크랩 탐지: 요약 문장이 원문 본문에 그대로 들어있으면 재작성이 아니다
  const flatBody = (fact.body || "").replace(/\s+/g, " ");
  const isCopy = bullets.some((b) => {
    const core = b.replace(/^[•\-\d.\s]+/, "").replace(/\s+/g, " ").slice(0, 40);
    return core.length >= 20 && flatBody.includes(core);
  });
  if (isCopy) issues.push("summary_ko 원문 복붙");

  const sentences = bodyKo.split(/(?<=[.!?])\s+/).filter((s) => s.replace(/\s/g, "").length >= 10);
  if (sentences.length < BODY_MIN_SENTENCES) issues.push(`body_ko ${sentences.length}문장 (규격 ${BODY_MIN_SENTENCES}~10)`);
  if (koreanRatio(bodyKo) < 0.25) issues.push("body_ko 미번역");
  if (!SIGNAL_IDS.includes(item.signal_id)) issues.push(`signal_id 불명(${item.signal_id})`);
  if (FINANCE_RE.test(fact.title) || FINANCE_RE.test(titleKo)) issues.push("투자·재무 중심 기사(하드 룰)");

  return issues;
}

function merge(item, fact) {
  const source = fact.source in SOURCE_NAMES ? fact.source : "web";
  return {
    id: fact.id,
    // 프론트 플랫폼 필터가 쓰는 기존 필드 유지
    category_id: source,
    category_name: SOURCE_NAMES[source] || fact.source_name,
    // 기술 신호 축 (신규)
    signal_id: item.signal_id,
    signal_name: SIGNALS[item.signal_id],
    importance: Math.max(0, Math.min(100, Number(item.importance) || 0)),
    headline: String(item.title_ko).slice(0, 160),
    title_ko: String(item.title_ko).slice(0, 160),
    title_en: String(item.title_en || "").slice(0, 200),
    summary_ko: String(item.summary_ko),
    summary_en: String(item.summary_en || ""),
    body_ko: String(item.body_ko),
    body_en: String(item.body_en || ""),
    author_profile: fact.author,
    publish_date: fact.publish_date,
    tags: (item.tags || []).slice(0, 5).map(String),
    url: fact.url,
    sources: fact.cross_sources || [fact.source_name],
    metrics: fact.metrics || {},
    curated_by: CURATED_BY,
  };
}

async function curateBatch(batch, factMap, idx, total) {
  let res;
  try {
    res = await callGemini(batch);
  } catch (e) {
    console.warn(`[batch ${idx + 1}/${total}] 실패 (${e.message}) — 1회 재시도`);
    res = await callGemini(batch);
  }

  const kept = [];
  for (const item of res.items || []) {
    const fact = factMap.get(item.id);
    if (!fact) {
      console.warn(`  drop(환각 id): ${item.id}`);
      continue;
    }
    if (item.drop) {
      console.log(`  drop(${item.drop_reason || "사유 없음"}): ${fact.title.slice(0, 50)}`);
      continue;
    }
    const issues = qualityIssues(item, fact);
    if (issues.length) {
      console.warn(`  drop(품질: ${issues.join(", ")}): ${fact.title.slice(0, 50)}`);
      continue;
    }
    const merged = merge(item, fact);
    if (merged.importance < MIN_IMPORTANCE) {
      console.log(`  drop(importance ${merged.importance} < ${MIN_IMPORTANCE}): ${merged.headline.slice(0, 40)}`);
      continue;
    }
    kept.push(merged);
  }
  console.log(`[batch ${idx + 1}/${total}] ${batch.length}건 중 ${kept.length}건 통과`);
  return kept;
}

function buildSummary(news) {
  const counts = {};
  for (const n of news) counts[n.signal_id] = (counts[n.signal_id] || 0) + 1;
  const breakdown = SIGNAL_IDS.filter((k) => counts[k])
    .map((k) => `${SIGNALS[k].split("·")[0]} ${counts[k]}건`)
    .join(" · ");
  return `AI 기술 신호 ${news.length}건 — ${breakdown}. 최상위 이슈: ${news[0].headline}. ${CURATED_BY}에서 큐레이션 하였습니다.`;
}

async function main() {
  if (!fs.existsSync(CANDIDATES)) {
    console.error("뉴스 후보 파일이 없습니다. collect_news.js를 먼저 실행하세요.");
    process.exit(1);
  }
  const { candidates } = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
  if (!candidates?.length) {
    console.error("후보 0건 — 중단 (기존 데이터 보존)");
    process.exit(1);
  }

  const factMap = new Map(candidates.map((c) => [c.id, c]));
  const batches = toBatches(candidates);
  console.log(`후보 ${candidates.length}건 → ${batches.length}개 배치로 큐레이션 (${MODEL})`);

  const results = [];
  for (const [idx, batch] of batches.entries()) {
    results.push(...(await curateBatch(batch, factMap, idx, batches.length)));
  }

  const news = results.sort((a, b) => b.importance - a.importance);
  if (news.length === 0) {
    console.error("큐레이션 결과 0건 — 기존 news_latest.json 유지");
    process.exit(1);
  }

  const signalCounts = {};
  for (const n of news) signalCounts[n.signal_id] = (signalCounts[n.signal_id] || 0) + 1;

  const today = new Date().toISOString().slice(0, 10);
  const latest = {
    generated_at: new Date().toISOString(),
    version: `v${today.replaceAll("-", ".")}`,
    summary: buildSummary(news),
    curated_by: CURATED_BY,
    signal_counts: signalCounts,
    news,
  };

  fs.mkdirSync(path.dirname(LATEST), { recursive: true });
  fs.writeFileSync(LATEST, JSON.stringify(latest, null, 2));
  console.log(`\n✅ 큐레이션 완료: ${news.length}건 → ${LATEST}`);
  console.log(`   신호 분포: ${JSON.stringify(signalCounts)}`);

  const archiveDir = path.join(path.dirname(LATEST), "archive");
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.writeFileSync(path.join(archiveDir, `news_${today}.json`), JSON.stringify(latest, null, 2));

  const indexFile = path.join(archiveDir, "news_index.json");
  let index = { archives: [] };
  if (fs.existsSync(indexFile)) {
    try {
      index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
      if (!index.archives) index.archives = [];
    } catch (e) {
      console.warn("news_index.json 파싱 오류:", e.message);
    }
  }
  if (!index.archives.some((a) => a.file === `news_${today}.json`)) {
    index.archives.unshift({
      file: `news_${today}.json`,
      version: latest.version,
      generated_at: latest.generated_at,
    });
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  }
  console.log(`   아카이브: archive/news_${today}.json`);
}

// Gemini 없이 사람·에이전트가 news_latest.json 을 직접 쓴 경우에도 같은 게이트를 통과해야 배포한다
function validate(file) {
  if (!fs.existsSync(CANDIDATES)) {
    console.error(`검증 불가: ${CANDIDATES} 없음 — collect_news.js 를 먼저 실행할 것`);
    process.exit(1);
  }
  const { candidates, missing_sources = [] } = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
  const factMap = new Map(candidates.map((c) => [c.id, c]));
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const news = data.news || [];

  const violations = [];
  if (data.curated_by !== CURATED_BY) violations.push(`(전체) curated_by 가 "${CURATED_BY}" 아님: ${data.curated_by}`);
  if (!String(data.summary || "").includes(CURATED_BY)) violations.push(`(전체) summary 에 "${CURATED_BY}" 출처 표기 없음`);
  if (/봇|bot|에이전트|agent/i.test(data.summary || "")) violations.push("(전체) summary 에 봇·에이전트 표현");
  if (!news.length) violations.push("(전체) news 0건");

  for (const n of news) {
    const tag = `${n.id}`;
    const fact = factMap.get(n.id);
    if (!fact) {
      violations.push(`${tag}: 후보에 없는 id — 수집되지 않은 항목(환각 또는 손으로 지어낸 id)`);
      continue;
    }
    for (const [field, expected] of [["url", fact.url], ["publish_date", fact.publish_date], ["author_profile", fact.author]]) {
      if (n[field] !== expected) violations.push(`${tag}: ${field} 가 수집값과 다름 (${n[field]} ≠ ${expected})`);
    }
    for (const field of ["signal_name", "sources", "metrics", "category_id", "curated_by"]) {
      if (n[field] === undefined) violations.push(`${tag}: 필수 필드 ${field} 누락`);
    }
    if (n.signal_name && n.signal_name !== SIGNALS[n.signal_id]) violations.push(`${tag}: signal_name 이 signal_id 와 불일치`);
    if (Number(n.importance) < MIN_IMPORTANCE) violations.push(`${tag}: importance ${n.importance} < ${MIN_IMPORTANCE}`);
    for (const issue of qualityIssues(n, fact)) violations.push(`${tag}: ${issue}`);
  }

  console.log(`검증 대상 ${news.length}건 (${file})`);
  if (missing_sources.length) console.warn(`[MISSING] 수집 0건 매체: ${missing_sources.join(", ")} — 보고에 포함할 것`);
  if (violations.length) {
    console.error(`\n❌ 규격 위반 ${violations.length}건 — 배포 금지:`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }
  console.log("✅ 규격 통과 — 배포 가능");
}

// 품질 게이트 자기검증: node scripts/news/curate_news.js --selfcheck (Gemini 호출 없음)
function selfcheck() {
  const assert = require("assert");
  const fact = {
    id: "hn_x", source: "hackernews", source_name: "Hacker News", url: "https://e.com/a",
    author: "@a", publish_date: new Date().toISOString(),
    body: "Anthropic released Claude Opus 5 with a 1M token context window and improved agentic coding benchmarks.",
  };
  const good = {
    id: "hn_x", signal_id: "model", importance: 80,
    title_ko: "앤트로픽, 컨텍스트 100만 토큰의 Claude Opus 5 공개",
    title_en: "Anthropic ships Claude Opus 5",
    summary_ko: "• 앤트로픽이 새 플래그십 모델 Claude Opus 5를 정식 공개했다.\n• 컨텍스트 창이 100만 토큰으로 늘고 에이전트형 코딩 벤치마크 점수가 올랐다.\n• 장문 리포지터리 전체를 한 번에 다루는 코딩 에이전트 구성이 쉬워진다.",
    summary_en: "Anthropic shipped Claude Opus 5 with a 1M context window.",
    body_ko: "앤트로픽이 플래그십 모델 계열을 갱신했다. 이번 버전은 컨텍스트 한도를 100만 토큰으로 넓혔다. 에이전트형 코딩 과제에서 이전 세대보다 높은 점수를 기록했다. 기존에는 파일 단위로 잘라 넣어야 했던 대형 저장소를 한 번에 올릴 수 있게 됐다. 코드베이스 전체 탐색이 필요한 작업의 구성이 그만큼 단순해진다. 다만 가격과 지연 시간은 별도 확인이 필요하다.",
    body_en: "Anthropic refreshed its flagship line...",
    tags: ["모델 출시", "컨텍스트", "코딩 에이전트"],
  };
  assert.deepStrictEqual(qualityIssues(good, fact), [], "정상 항목이 게이트에 걸리면 안 됨");

  const cases = [
    ["미번역", { ...good, title_ko: "Anthropic ships Claude Opus 5" }, "title_ko 미번역"],
    ["플레이스홀더", { ...good, title_ko: "[임시 번역] 어쩌고 저쩌고 한국어 제목" }, "플레이스홀더 잔존"],
    ["불릿 부족", { ...good, summary_ko: "• 앤트로픽이 새 모델을 공개했다." }, "summary_ko 불릿 1개"],
    ["원문 복붙", { ...good, summary_ko: `• Anthropic released Claude Opus 5 with a 1M token context window\n• 두 번째 불릿 문장은 충분히 길게 작성한다.\n• 세 번째 불릿 문장도 충분히 길게 작성한다.` }, null],
    ["signal 불명", { ...good, signal_id: "unknown" }, "signal_id 불명(unknown)"],
    ["body 과단축", { ...good, body_ko: "짧게 두 문장만 쓴 해설이다. 규격은 다섯 문장이다." }, "body_ko 2문장 (규격 5~10)"],
    ["투자 기사", { ...good, title_ko: "중국 VC, 3년 한파 깨고 50조 투자 총력전" }, "투자·재무 중심 기사(하드 룰)"],
  ];
  for (const [label, item, expected] of cases) {
    const issues = qualityIssues(item, fact);
    assert.ok(issues.length > 0, `${label}: 게이트가 통과시키면 안 됨`);
    if (expected) assert.ok(issues.includes(expected), `${label}: "${expected}" 기대, 실제 ${JSON.stringify(issues)}`);
  }

  const batches = toBatches(Array.from({ length: 25 }, (_, i) => ({
    id: `c${i}`, source_name: "Web", url: `https://e.com/${i}`, title: `t${i}`,
    author: "a", publish_date: "2026-01-01T00:00:00Z", metrics: {}, body: "x".repeat(500),
  })));
  assert.strictEqual(batches.length, 3, `배치 3개 기대, 실제 ${batches.length}`);
  assert.ok(batches.every((b) => b.length <= BATCH_ITEMS));

  console.log("✅ selfcheck 통과 (품질 게이트 + 배치 분할)");
}

if (SELFCHECK) {
  selfcheck();
} else if (VALIDATE) {
  const i = process.argv.indexOf("--validate");
  validate(process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : LATEST);
} else {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
