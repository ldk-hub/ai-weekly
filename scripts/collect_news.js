#!/usr/bin/env node
/**
 * collect_news.js
 * AI 산업 동향(뉴스) 수집 스크립트.
 * 타겟: GeekNews, X(Twitter), Instagram, Threads
 * 
 * TODO: 실제 API 키 또는 Apify Actor 연동 필요.
 * 현재는 검증 및 파이프라인 구동 테스트를 위한 Mock Data를 생성합니다.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CANDIDATES_FILE = path.join(DATA_DIR, "news_candidates.json");

// 임시 Mock 데이터 생성 (검증 로직 구동용)
function generateMockCandidates() {
  return [
    {
      id: "news_001",
      platform: "X",
      url: "https://x.com/OpenAI/status/123456789",
      author: "OpenAI",
      content: "GPT-4.5 Architecture finally revealed. We are moving towards a sparse MoE model with 10T parameters. Exciting times for AI developers! #GPT45 #OpenAI",
      likes: 45000,
      shares: 12000,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      is_official: true,
      references: ["X"]
    },
    {
      id: "news_002",
      platform: "GeekNews",
      url: "https://news.hada.io/topic?id=12345",
      author: "user_ai_geek",
      content: "Anthropic, Claude 3.5 Sonnet의 코딩 성능 극대화 업데이트. 프롬프트 캐싱 비용 인하 및 시스템 프롬프트 가이드 개정.",
      likes: 120,
      shares: 15,
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
      is_official: false,
      references: ["GeekNews", "Threads"]
    },
    {
      id: "news_003",
      platform: "Instagram",
      url: "https://instagram.com/p/abcdefg",
      author: "ai_daily_trends",
      content: "Midjourney v7 Sneak Peek! 미드저니 7버전 테스트 이미지 유출. 놀라운 텍스처와 프롬프트 이해도. (Swipe to see images)",
      likes: 8500,
      shares: 200,
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
      is_official: false,
      references: ["Instagram"]
    },
    {
      id: "news_004",
      platform: "Threads",
      url: "https://threads.net/t/xyz123",
      author: "karpathy",
      content: "Building LLMs from scratch is getting easier but also more complex at the orchestration level. The new trend is compounding AI systems.",
      likes: 15400,
      shares: 3400,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      is_official: true,
      references: ["Threads", "X", "GeekNews"]
    }
  ];
}

async function main() {
  console.log("뉴스 수집 시작 (GeekNews, X, Insta, Threads)...");
  
  // 실제 환경에서는 여기서 Apify/API 호출 등을 수행합니다.
  const candidates = generateMockCandidates();
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(CANDIDATES_FILE, JSON.stringify({ candidates }, null, 2));
  console.log(`수집 완료: 총 ${candidates.length}건의 기사 후보 저장됨 -> ${CANDIDATES_FILE}`);
}

main().catch(console.error);
