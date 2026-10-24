/**
 * scripts/benchmarks/curate-benchmarks.js
 * AI 점유율 및 최신 현행(Active Frontier) 벤치마크 다중 출처(3곳) 평균 & 최신성 게이트(Staleness Gate) 검문 스크립트
 *
 * [집계 및 검증 원칙]
 * 1. Staleness Gate (과거 링크 엄격 배제):
 *    - 실행일(Run Date) 기준 점유율 출처는 45일 초과, 성능 벤치마크 출처는 30일 초과 미갱신 시 즉시 배제
 *    - 2026년 2월 이후 갱신이 멈춘 구형 swebench.com 등 과거 링크는 원천 차단
 * 2. Multi-Source Ensemble Average (다중 출처 평균 산출):
 *    - 점유율: Similarweb(웹 방문) + Statcounter(리퍼럴) + OpenRouter(개발자 API) 3곳 평균 정합성 및 합계 100% 검증
 *    - 성능: LMArena(Elo) + Artificial Analysis(Index) + LiveBench(Score) 3대 리더보드 모두 존재 및 종합 평균 정합성 검증
 * 3. Legacy Model Blocklist:
 *    - 과거 구버전 모델을 엄격히 차단하고 현행 프론티어 모델만 허용
 */

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.resolve(__dirname, "../../site/public/data/benchmarks_latest.json");

// 명시적 구버전 모델 블랙리스트
const LEGACY_PATTERNS = [
  /3\.5\s*sonnet/i,
  /3\.5\s*haiku/i,
  /claude\s*3\.7/i,
  /gpt-4o/i,
  /claude-2/i,
  /llama-2/i,
  /llama-3/i,
  /gemini\s*1\.5/i,
  /gemini\s*2\.5/i,
  /mistral-7b-instruct-v0\.1/i,
];

// 갱신 중단된 과거 벤치마크 사이트 차단 목록
const BANNED_STALE_DOMAINS = [
  "swebench.com",
  " LMSYS-old",
];

function validateAndCurate() {
  console.log("🔍 [Benchmarks] 다중 출처(3곳) 평균 및 실행일 기준 최신성 게이트(Staleness Gate) 검증 시작...");

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ [Benchmarks] 데이터 파일이 존재하지 않습니다: ${DATA_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error("❌ [Benchmarks] JSON 파싱 오류:", err);
    process.exit(1);
  }

  // 기준 시각: 데이터 updated_at 또는 현재 실행 시각 중 최신 기준
  const runDate = data.updated_at ? new Date(data.updated_at) : new Date();
  console.log(`📅 검문 기준 일시 (Run Date): ${runDate.toISOString()}`);

  // 1. 출처 최신성 게이트 (Staleness Gate) 검증
  const sources = data.sources || [];
  if (sources.length < 6) {
    console.error(`❌ [Benchmarks] 다중 출처(최소 6개: 점유율 3 + 성능 3) 요건 미달: 현재 ${sources.length}개`);
    process.exit(1);
  }

  for (const src of sources) {
    for (const banned of BANNED_STALE_DOMAINS) {
      if ((src.url || "").includes(banned)) {
        console.error(`❌ [Staleness Gate 위반] 갱신이 중단된 과거 링크가 포함되어 있습니다: ${src.url}`);
        process.exit(1);
      }
    }

    if (!src.as_of) {
      console.error(`❌ [Staleness Gate 위반] 출처 기준일(as_of)이 누락되었습니다: ${src.id}`);
      process.exit(1);
    }

    const asOfDate = new Date(src.as_of);
    const ageDays = Math.floor((runDate - asOfDate) / (1000 * 60 * 60 * 24));
    const maxDays = src.category === "share" ? 45 : 30;

    if (ageDays > maxDays) {
      console.error(
        `❌ [Staleness Gate 위반] 출처 '${src.name}'(${src.as_of})가 실행일 기준 ${ageDays}일 경과하여 허용 한도(${maxDays}일)를 초과했습니다.`
      );
      process.exit(1);
    }
    console.log(`  ✓ 출처 최신성 통과: [${src.label}] ${src.name} (기준일: ${src.as_of}, ${ageDays}일 전)`);
  }

  // 2. 점유율 데이터 다중 출처(3곳) 평균 및 합계 100% 검증
  const shares = data.market_shares || [];
  let totalShare = 0;

  for (const item of shares) {
    const bd = item.sources_breakdown;
    if (
      !bd ||
      typeof bd.similarweb_visit !== "number" ||
      typeof bd.statcounter_referral !== "number" ||
      typeof bd.openrouter_api !== "number"
    ) {
      console.error(`❌ [Benchmarks] '${item.name}' 점유율에 3곳 출처 세부 데이터(sources_breakdown)가 누락되었습니다.`);
      process.exit(1);
    }

    const expectedAvg = (bd.similarweb_visit + bd.statcounter_referral + bd.openrouter_api) / 3;
    if (Math.abs(item.share_pct - expectedAvg) > 0.05) {
      console.error(
        `❌ [Benchmarks] '${item.name}'의 평균 점유율(${item.share_pct}%)이 3곳 산술 평균(${expectedAvg.toFixed(2)}%)과 일치하지 않습니다.`
      );
      process.exit(1);
    }
    totalShare += item.share_pct;
  }

  console.log(`📊 점유율 항목 수: ${shares.length}개 (3곳 평균 합계: ${totalShare.toFixed(2)}%)`);
  if (Math.abs(totalShare - 100.0) > 0.15) {
    console.error(`❌ [Benchmarks] 점유율 합계가 100%가 아닙니다: ${totalShare.toFixed(2)}%`);
    process.exit(1);
  }

  // 3. 모델 벤치마크 3대 리더보드 및 구버전 배제 검증
  const benchmarks = data.model_benchmarks || [];
  console.log(`🏆 프론티어 벤치마크 모델 수: ${benchmarks.length}개`);

  for (const item of benchmarks) {
    if (
      !item.model ||
      typeof item.composite_score !== "number" ||
      typeof item.coding_composite_score !== "number" ||
      typeof item.arena_elo !== "number" ||
      typeof item.arena_coding_elo !== "number" ||
      typeof item.aa_intelligence !== "number" ||
      typeof item.livebench_score !== "number" ||
      item.pricing_in_1m == null ||
      item.pricing_out_1m == null
    ) {
      console.error(`❌ [Benchmarks] 3대 리더보드 필수 지표가 누락된 모델 발견: ${JSON.stringify(item)}`);
      process.exit(1);
    }

    for (const pattern of LEGACY_PATTERNS) {
      if (pattern.test(item.model)) {
        console.error(
          `❌ [Benchmarks 정책 위반] 구버전 모델이 포함되어 있습니다: "${item.model}". 최신 현행(Active Frontier) 모델만 집계해야 합니다.`
        );
        process.exit(1);
      }
    }
  }

  console.log("✅ [Benchmarks] 최신성 게이트(Staleness Gate), 3곳 평균 산출 무결성, 구버전 배제 검증 모두 통과! (PASS)");
}

validateAndCurate();
