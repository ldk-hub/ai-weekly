/**
 * scripts/benchmarks/curate-benchmarks.js
 * AI 점유율 및 최신 현행(Active Frontier) 벤치마크 데이터 유효성 검증 및 큐레이션 스크립트
 * 
 * [집계 원칙]
 * 1. 과거 구버전(Legacy/Deprecated) 모델은 집계에서 완전히 제외하고 현재 활성(Active Latest) 플래그십만 수집
 * 2. 시장 점유율은 합계 100% 무결성을 유지하며 현재 운영 엔진 명칭 반영
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.resolve(__dirname, '../../site/public/data/benchmarks_latest.json');

// 명시적 구버전 블랙리스트 (집계 포함 시 에러 처리)
const LEGACY_PATTERNS = [
  /3\.5\s*sonnet/i,
  /3\.5\s*haiku/i,
  /gpt-4o.*2024/i,
  /claude-2/i,
  /llama-2/i,
  /mistral-7b-instruct-v0\.1/i
];

function validateAndCurate() {
  console.log('🔍 [Benchmarks] 최신 현행(Active Frontier) 데이터 유효성 검증 시작...');

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ [Benchmarks] 데이터 파일이 존재하지 않습니다: ${DATA_PATH}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error('❌ [Benchmarks] JSON 파싱 오류:', err);
    process.exit(1);
  }

  // 1. 점유율 데이터 검사
  const shares = data.market_shares || [];
  const totalShare = shares.reduce((acc, cur) => acc + (cur.share_pct || 0), 0);
  console.log(`📊 점유율 항목 수: ${shares.length}개 (합계 점유율: ${totalShare.toFixed(1)}%)`);

  if (Math.abs(totalShare - 100.0) > 0.1) {
    console.error(`❌ [Benchmarks] 점유율 합계가 100%가 아닙니다: ${totalShare}%`);
    process.exit(1);
  }

  // 2. 모델 벤치마크 검사 (구버전 필터링 규칙 적용)
  const benchmarks = data.model_benchmarks || [];
  console.log(`🏆 벤치마크 모델 수: ${benchmarks.length}개`);

  for (const item of benchmarks) {
    // 필수 필드 체크
    if (!item.model || !item.arena_elo || !item.swe_bench_verified) {
      console.error(`❌ [Benchmarks] 필수 값이 누락된 모델 발견: ${JSON.stringify(item)}`);
      process.exit(1);
    }

    // 구버전 포함 여부 엄격 검사
    for (const pattern of LEGACY_PATTERNS) {
      if (pattern.test(item.model)) {
        console.error(`❌ [Benchmarks 정책 위반] 구버전 모델이 포함되어 있습니다: "${item.model}". 최신 현행(Active Frontier) 모델만 집계해야 합니다.`);
        process.exit(1);
      }
    }
  }

  console.log('✅ [Benchmarks] 과거 구버전 배제 및 최신 현행(Active Frontier) 집계 원칙 검증 완료! (정상)');
}

validateAndCurate();
