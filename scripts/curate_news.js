#!/usr/bin/env node
/**
 * curate_news.js
 * 뉴스 후보 데이터를 읽어 Gemini를 통해 3줄 요약, 한글화, 4축 검증 스코어링을 진행합니다.
 * 출력: site/public/data/news_latest.json
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, "..");
const CANDIDATES = path.join(ROOT, "data", "news_candidates.json");
const LATEST = path.join(ROOT, "site", "public", "data", "news_latest.json");
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const PROMPT_RULES = `너는 AI 산업 트렌드 전문 큐레이터다. 아래 뉴스 후보 목록(JSON)을 분석해서 오늘 자 데일리 뉴스 인덱스를 만들어라.

규칙:
- score = 0.4*velocity + 0.3*buzz + 0.2*quality + 0.1*recency (0~100). 각 플랫폼(GeekNews, X, Insta, Threads) 특성에 맞춰 가중치를 부여.
- 교차 검증(Buzz): 여러 플랫폼(references)에서 언급된 경우 가산점.
- 공식 출처(Quality): is_official이 true면 신뢰도 점수 부여.
- 모든 뉴스는 3문장 이내로 핵심만 요약 (summary_ko).
- 각 항목의 필드: id, platform, title_ko, summary_ko, score, tags, url, author.
- 출력은 JSON 오브젝트 하나: {"news":[...]}. score 내림차순 정렬.`;

// Mock Response for UI Testing when API Key is absent
function getMockGeminiResponse() {
  return {
    news: [
      {
        id: "news_001",
        platform: "X",
        title_ko: "OpenAI, GPT-4.5 아키텍처 공식 발표",
        summary_ko: "OpenAI가 마침내 10조 개의 파라미터를 가진 희소(Sparse) MoE 기반의 GPT-4.5 모델 아키텍처를 공개했습니다. AI 개발 생태계에 큰 변화를 예고하며, 개발자들의 엄청난 관심을 모으고 있습니다.",
        score: 95,
        tags: ["OpenAI", "GPT-4.5", "LLM"],
        url: "https://x.com/OpenAI/status/123456789",
        author: "OpenAI",
        is_official: true
      },
      {
        id: "news_004",
        platform: "Threads",
        title_ko: "안드레이 카파시의 AI 시스템 전망",
        summary_ko: "초기 LLM 구축은 쉬워졌지만, 복잡한 시스템 단위의 오케스트레이션 난이도는 높아지고 있습니다. 이에 따라 여러 모델이 상호작용하는 복합 AI 시스템(Compounding AI)이 새로운 트렌드로 자리잡고 있습니다.",
        score: 88,
        tags: ["Andrej Karpathy", "AI Systems", "Trends"],
        url: "https://threads.net/t/xyz123",
        author: "karpathy",
        is_official: true
      },
      {
        id: "news_002",
        platform: "GeekNews",
        title_ko: "Claude 3.5 Sonnet 프롬프트 캐싱 비용 인하",
        summary_ko: "Anthropic이 Claude 3.5 Sonnet의 코딩 성능을 극대화하는 새로운 가이드를 배포함과 동시에 프롬프트 캐싱 비용을 인하했습니다. 개발자 친화적인 행보가 주목받고 있습니다.",
        score: 82,
        tags: ["Anthropic", "Claude 3.5", "Pricing"],
        url: "https://news.hada.io/topic?id=12345",
        author: "user_ai_geek",
        is_official: false
      },
      {
        id: "news_003",
        platform: "Instagram",
        title_ko: "미드저니 v7 초기 테스트 이미지 유출",
        summary_ko: "놀라운 텍스처와 프롬프트 이해도를 보여주는 Midjourney v7의 초기 테스트 이미지가 유출되었습니다. 이미지 생성 AI의 새로운 기준이 될 것으로 기대됩니다.",
        score: 75,
        tags: ["Midjourney", "Image Generation", "v7"],
        url: "https://instagram.com/p/abcdefg",
        author: "ai_daily_trends",
        is_official: false
      }
    ]
  };
}

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
    throw new Error(`Gemini API error: HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty response");
  return JSON.parse(text);
}

async function main() {
  if (!fs.existsSync(CANDIDATES)) {
    console.error("뉴스 후보 파일이 없습니다. collect_news.js를 먼저 실행하세요.");
    process.exit(1);
  }

  const { candidates } = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
  let curated;

  if (!API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY가 없습니다. 프론트엔드 UI/UX 테스트를 위해 Mock 데이터를 생성합니다.");
    curated = getMockGeminiResponse();
  } else {
    console.log("Gemini를 통한 뉴스 요약 및 스코어링 진행 중...");
    try {
      curated = await callGemini(candidates);
    } catch (e) {
      console.warn(`첫 시도 실패 (${e.message}), 재시도...`);
      curated = await callGemini(candidates);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const latest = {
    generated: today,
    version: `v${today.replaceAll("-", ".")}`,
    news: curated.news
  };

  const outputDir = path.dirname(LATEST);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(LATEST, JSON.stringify(latest, null, 2));
  console.log(`큐레이션 완료: 총 ${latest.news.length}개 뉴스 기사 -> ${LATEST}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
