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
// importance 하한은 사실상 죽은 게이트다 — 실측 208건 중 40 미만 0건, 중앙값 85 (LLM 이 전부 80~95를 준다).
// 실제 선별은 아래 쿼터가 한다: 매체·신호축이 하루치를 독식하지 못하게 막고 상한을 건다.
const MAX_PER_SOURCE = Number(process.env.NEWS_MAX_PER_SOURCE || 5);
const MAX_PER_SIGNAL = Number(process.env.NEWS_MAX_PER_SIGNAL || 4);
const MAX_ITEMS = Number(process.env.NEWS_MAX_ITEMS || 18);
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

// 수집 매체 7종. 여기 없는 값은 collect 단계에서 이미 버려진다.
// x·threads 는 상시 0건이라 목록에서 내렸다 — 과거 아카이브에는 남아 있으므로 프론트의 해당 아이콘 분기는 유지한다.
const SOURCE_NAMES = {
  geeknews: "GeekNews",
  hackernews: "Hacker News",
  aitimes: "AI타임스",
  reddit: "Reddit",
  github: "GitHub",
  bluesky: "Bluesky",
  hfpapers: "HF Daily Papers",
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
  - summary_ko: 정확히 3개의 불릿("• "로 시작, 줄바꿈 구분). 각 불릿은 완결된 한국어 문장.
      1번째=무엇이 일어났나, 2번째=기술적으로 무엇이 새로운가(수치·모델명·벤치마크 등 구체값), 3번째=개발자에게 왜 중요한가.
      원문 문장을 잘라 붙이지 말고 이해한 내용을 새 문장으로 쓸 것.
  - body_ko: 한국어 해설 **5문장 이상 10문장 이하**. 배경·동작 방식·한계·비교 대상을 담는다. 원문 본문 통째 복사 금지. (5문장 미만은 자동 폐기된다)
  - oss 항목은 body_ko 에 "무엇을 하는 도구인지 / 어떻게 쓰는지 / 누가 만들었는지"를 반드시 포함.
  - GitHub 출처 항목은 **왜 지금 이 리포가 뜨는지**를 반드시 한 문장 넣는다. 근거는 후보의 metrics.stars_per_day(하루평균 획득 star)
    와 cross_sources(같은 이슈를 다룬 다른 매체) 뿐이다. 이 근거가 없으면 "화제" 같은 막연한 표현을 쓰지 말 것.
  - **is_update=true 인 항목은 이미 지난 며칠 안에 한 번 소개한 대상이다.** 신규 출시·최초 공개처럼 쓰면 안 된다.
    title_ko 를 "[업데이트] " 로 시작하고, summary_ko/body_ko 는 prev_stars → metrics.stars 증가분과
    그 사이 달라진 점(새 기능·릴리스·논쟁)에만 집중한다. 도구 소개를 처음부터 반복하지 않는다.
  - research 항목은 body_ko 에 "제안 기법 / 실험 결과 수치 / 기존 방법 대비 차이"를 반드시 포함.
  - HF Daily Papers 출처는 초록(abstract)만 주어진다. 초록에 없는 실험 수치를 지어내지 말고, 초록이 밝힌 범위 안에서만 쓴다.
    publish_date 는 "HF 가 오늘 데일리 목록에 올린 시각" 이고 metrics.paper_published_at 이 원 논문 발행일이다 — 둘을 혼동해 "오늘 공개된 논문" 이라 쓰지 말 것.
  - Bluesky 출처는 **글 자체가 아니라 그 글이 공유한 원문 링크**가 후보다. 게시글 문구는 발견 경로일 뿐이니
    요약은 링크된 원문 내용으로 쓰고, "누가 트윗했다" 식으로 쓰지 않는다.
  - 본문에 없는 수치·기능·인용은 만들어내지 말 것. 근거가 없으면 그 문장을 쓰지 않는다.

[4] importance: 0~100 정수. 기준 = 신규성(24h 내 최초 공개) · 기술적 실체 · 개발자 실사용 영향 · 교차 출처 언급.

[5] tags: 한국어 태그 3~5개 (예: "코딩 에이전트", "오픈소스", "벤치마크").

[6] 출력은 JSON 오브젝트 하나:
{"items":[{"id":"후보의 id 그대로","drop":false,"drop_reason":"","signal_id":"model","importance":72,"title_ko":"...","summary_ko":"• ...\\n• ...\\n• ...","body_ko":"...","tags":["..."]}]}
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
      is_update: c.is_update || false,
      prev_stars: c.prev_stars ?? null,
      prev_published_date: c.prev_published_date ?? null,
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
    summary_ko: String(item.summary_ko),
    body_ko: String(item.body_ko),
    // 재등장 표식 — 프론트가 "신규" 와 구분해 배지를 단다. 없는 항목엔 필드를 만들지 않는다.
    ...(fact.is_update ? {
      is_update: true,
      prev_published_date: fact.prev_published_date,
      prev_stars: fact.prev_stars,
      star_growth_pct: fact.star_growth_pct,
    } : {}),
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

// 매체·신호축 쿼터로 하루치를 선별한다.
// 이전 구현은 "매체별 상위 3건에 importance +1000" 가중치 해킹이었다. 정렬만 흔들 뿐 상한이 없어
// 특정 축이 하루를 독식했고(실측 08-25 devtool 6 / oss 1, 08-20 oss 7), importance 하한 40 은 아무것도 거르지 못했다.
// 매체별로 importance 내림차순 큐를 만들고 라운드로빈으로 뽑아 쿼터를 강제한다.
function selectBalanced(items) {
  const queues = new Map();
  for (const it of items) {
    if (!queues.has(it.category_id)) queues.set(it.category_id, []);
    queues.get(it.category_id).push(it);
  }
  for (const q of queues.values()) q.sort((a, b) => b.importance - a.importance);

  const perSource = {};
  const perSignal = {};
  const picked = [];
  const skipped = [];
  let progressed = true;
  while (picked.length < MAX_ITEMS && progressed) {
    progressed = false;
    for (const [source, q] of queues) {
      if (picked.length >= MAX_ITEMS) break;
      if ((perSource[source] || 0) >= MAX_PER_SOURCE) continue;
      while (q.length) {
        const it = q.shift();
        if ((perSignal[it.signal_id] || 0) >= MAX_PER_SIGNAL) {
          skipped.push(`${it.signal_id} 축 상한(${MAX_PER_SIGNAL}) 초과: ${it.headline.slice(0, 32)}`);
          continue;
        }
        perSource[source] = (perSource[source] || 0) + 1;
        perSignal[it.signal_id] = (perSignal[it.signal_id] || 0) + 1;
        picked.push(it);
        progressed = true;
        break;
      }
    }
  }

  const leftover = [...queues.values()].reduce((n, q) => n + q.length, 0);
  if (leftover || skipped.length) {
    console.log(`[quota] 매체당 ${MAX_PER_SOURCE} · 축당 ${MAX_PER_SIGNAL} · 총 ${MAX_ITEMS} 적용 → ${picked.length}건 선별 (미채택 ${leftover + skipped.length}건)`);
    for (const r of skipped.slice(0, 10)) console.log(`  skip(${r})`);
  }
  return picked.sort((a, b) => b.importance - a.importance);
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

  const news = selectBalanced(results);
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
  const { candidates, missing_sources = [], repeat_filter = null, source_errors = [] } = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
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
    // 재등장 항목을 신규 발표처럼 쓰는 것이 "매일 같은 글" 의 체감 원인이었다 — 표식과 제목을 강제한다
    if (fact.is_update && !n.is_update) violations.push(`${tag}: 최근 배포분 재등장인데 is_update 표식 없음`);
    if (n.is_update && !fact.is_update) violations.push(`${tag}: 후보에 없는 is_update 표식`);
    if (n.is_update && !String(n.title_ko || "").startsWith("[업데이트]")) {
      violations.push(`${tag}: is_update 항목의 title_ko 가 "[업데이트]" 로 시작하지 않음`);
    }
    if (Number(n.importance) < MIN_IMPORTANCE) violations.push(`${tag}: importance ${n.importance} < ${MIN_IMPORTANCE}`);
    for (const issue of qualityIssues(n, fact)) violations.push(`${tag}: ${issue}`);
  }

  console.log(`검증 대상 ${news.length}건 (${file})`);
  if (missing_sources.length) console.warn(`[MISSING] 수집 0건 매체: ${missing_sources.join(", ")} — 보고에 포함할 것`);
  if (source_errors.length) console.warn(`[QUERY-FAIL] 수집 쿼리 ${source_errors.length}건 실패 — 보고에 포함할 것`);
  if (repeat_filter) {
    console.log(`[repeat] 최근 ${repeat_filter.lookback_days}일 중복 ${repeat_filter.dropped}건 차단 · 업데이트 ${repeat_filter.kept_as_update}건 유지`);
  }
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
    summary_ko: "• 앤트로픽이 새 플래그십 모델 Claude Opus 5를 정식 공개했다.\n• 컨텍스트 창이 100만 토큰으로 늘고 에이전트형 코딩 벤치마크 점수가 올랐다.\n• 장문 리포지터리 전체를 한 번에 다루는 코딩 에이전트 구성이 쉬워진다.",
    body_ko: "앤트로픽이 플래그십 모델 계열을 갱신했다. 이번 버전은 컨텍스트 한도를 100만 토큰으로 넓혔다. 에이전트형 코딩 과제에서 이전 세대보다 높은 점수를 기록했다. 기존에는 파일 단위로 잘라 넣어야 했던 대형 저장소를 한 번에 올릴 수 있게 됐다. 코드베이스 전체 탐색이 필요한 작업의 구성이 그만큼 단순해진다. 다만 가격과 지연 시간은 별도 확인이 필요하다.",
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

  // 쿼터: 한 매체·한 축이 하루치를 독식하지 못한다
  const quotaItems = [
    ...Array.from({ length: 9 }, (_, i) => ({ id: `g${i}`, category_id: "github", signal_id: "oss", importance: 90 - i, headline: `g${i}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ id: `h${i}`, category_id: "hackernews", signal_id: "devtool", importance: 80 - i, headline: `h${i}` })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: `k${i}`, category_id: "geeknews", signal_id: "model", importance: 70 - i, headline: `k${i}` })),
  ];
  const balanced = selectBalanced(quotaItems);
  const bySource = {};
  const bySignal = {};
  for (const it of balanced) {
    bySource[it.category_id] = (bySource[it.category_id] || 0) + 1;
    bySignal[it.signal_id] = (bySignal[it.signal_id] || 0) + 1;
  }
  assert.ok(balanced.length <= MAX_ITEMS, `총 상한 ${MAX_ITEMS} 초과: ${balanced.length}`);
  assert.ok(Object.values(bySource).every((n) => n <= MAX_PER_SOURCE), `매체 쿼터 위반 ${JSON.stringify(bySource)}`);
  assert.ok(Object.values(bySignal).every((n) => n <= MAX_PER_SIGNAL), `축 쿼터 위반 ${JSON.stringify(bySignal)}`);
  assert.ok(Object.keys(bySource).length === 3, `매체 3종이 모두 포함돼야 함: ${JSON.stringify(bySource)}`);
  assert.ok(balanced.every((it, i, a) => i === 0 || a[i - 1].importance >= it.importance), "importance 내림차순 정렬 아님");

  const batches = toBatches(Array.from({ length: 25 }, (_, i) => ({
    id: `c${i}`, source_name: "Web", url: `https://e.com/${i}`, title: `t${i}`,
    author: "a", publish_date: "2026-01-01T00:00:00Z", metrics: {}, body: "x".repeat(500),
  })));
  assert.strictEqual(batches.length, 3, `배치 3개 기대, 실제 ${batches.length}`);
  assert.ok(batches.every((b) => b.length <= BATCH_ITEMS));

  console.log("✅ selfcheck 통과 (품질 게이트 + 쿼터 선별 + 배치 분할)");
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
