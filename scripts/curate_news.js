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
const MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

const PROMPT_RULES = `너는 AI 산업 트렌드 전문 큐레이터다. 아래 뉴스 후보 목록(JSON)을 분석해서 오늘 자 데일리 스냅샷 인덱스를 만들어라.

[핵심 규칙 (Single Pass Pipeline)]
1. 주식, 증시, 투자, 단순 재무 실적과 관련된 기사는 배열에서 완전히 배제(Drop)할 것.
2. 오직 "신기술, 신기능, 개발자 도구" 중심의 기사만 남길 것.
3. [중요] 수집된 기사의 작성일은 최근이더라도, 내용이 과거 기술의 회고(Retrospective), 예전 기사의 단순 재공유, 혹은 이미 며칠 전에 끝난 이슈의 뒷북 요약인 경우(Legacy Content) 목록에서 완전히 제거(Drop)할 것. 오직 '어제' 새롭게 공개된 릴리즈, 기능 발표, 핫이슈만을 선정할 것.
4. 남은 기사들은 글로벌 언급 빈도와 기술적 중요도(Signal Strength)를 종합 평가하여 가장 주목받는(핫한) 순서대로 정렬할 것.
5. [제한] 위 조건을 모두 충족하는 '진짜 핫이슈'들을 모두 선별하되, 특히 X(Twitter)와 Threads 매체에서 넘어온 기사는 유실되지 않도록 가급적 모두 포함시켜 전체 배열을 구성할 것. (전체 최대 30개까지 포함 가능)
6. 각 뉴스는 3문장 이내로 핵심만 요약(summary_ko)하고, 원문 또는 상세 내용은 본문(body_ko)에 최대한 풍부하게 담을 것.
7. 출력은 아래 JSON 스키마를 엄격히 따를 것 (8가지 필수 필드 보장):

{
  "summary": "전체 뉴스 흐름 한 줄 요약 (예: 새로운 AI 개발 도구와 오픈소스 모델의 약진)...",
  "news": [
    {
      "id": "고유ID",
      "category_id": "geeknews | instagram | x | threads 중 하나",
      "category_name": "GeekNews | Instagram | X (Twitter) | Threads",
      "headline": "기사의 주요 제목 및 부제목",
      "summary_ko": "한글 요약 (3줄)",
      "body_ko": "기사의 본문 텍스트 전체",
      "author": "콘텐츠를 작성한 작가 또는 기자 이름",
      "publish_date": "발행일 (ISO)",
      "tags": ["기술", "오픈소스", "개발자도구"],
      "multimedia": ["이미지 URL 등 시각적 요소 (영상 제외)"],
      "url": "원문 링크",
      "related_articles": [ {"title": "관련 기사 제목", "url": "링크"} ]
    }
  ]
}`;

const MOCK_TRANSLATIONS = {
  "news_x_001": {
    title: "GPT-4.5 아키텍처 구조 유출, 10T 파라미터 희소 MoE 모델 도입",
    summary: "오픈AI의 GPT-4.5가 10조 개(10T)의 파라미터를 갖춘 희소 MoE 구조를 택했다는 소식이 유출되며 AI 개발자들 사이에서 큰 기대를 모으고 있습니다."
  },
  "news_x_002": {
    title: "일론 머스크, 그록(Grok) 2.0 배포 개시 선언",
    summary: "X(트위터)의 실시간 데이터를 무제한으로 학습한 검열 없는 Grok 2.0 모델이 배포를 시작했으며, 다수의 벤치마크에서 GPT-4를 능가한다는 소식입니다."
  },
  "news_x_003": {
    title: "얀 르쿤(Yann LeCun), 'LLM은 AGI가 아니다' 재차 강조",
    summary: "메타의 수석 과학자 얀 르쿤이 현재의 자기회귀(Auto-regressive) 기반 LLM은 곧 한계에 도달할 것이며, AGI를 위해선 목적 기반 아키텍처가 필요하다고 역설했습니다."
  },
  "news_insta_001": {
    title: "미드저니(Midjourney) v7 초기 테스트 이미지 유출",
    summary: "놀라운 텍스처 표현력과 프롬프트 이해도를 보여주는 미드저니 7버전의 초기 테스트 이미지가 유출되어 크리에이터들 사이에서 화제가 되고 있습니다."
  },
  "news_insta_002": {
    title: "Figma AI 업데이트: 5초 만에 UI 시스템 구축",
    summary: "피그마(Figma)의 새로운 AI 기능이 UI/UX 디자인의 패러다임을 바꿨습니다. 프롬프트 하나로 전체 UI 시스템을 생성하는 릴스가 큰 인기를 끌고 있습니다."
  },
  "news_insta_003": {
    title: "Runway Gen-3 Alpha, 텍스트-비디오의 영화적 극사실주의 달성",
    summary: "런웨이의 최신 모델 Gen-3 Alpha가 생성한 사이버펑크 도시 비디오가 공개되었습니다. 영화에 가까운 극사실주의 품질로 비디오 생성 AI의 도약을 알렸습니다."
  },
  "news_threads_001": {
    title: "LLM 오케스트레이션의 복잡성과 '컴파운딩 시스템' 트렌드",
    summary: "안드레이 카파시(Andrej Karpathy)가 스크래치부터 LLM을 구축하는 것은 쉬워졌으나 오케스트레이션이 복잡해졌으며, 이제는 복합 AI 시스템(Compounding AI)이 대세라고 평가했습니다."
  },
  "news_threads_002": {
    title: "프롬프트 엔지니어링의 종말, '플로우(Flow) 엔지니어링' 부상",
    summary: "2026 AI 엔지니어 서밋의 핵심 화두는 에이전트 구축 시 단순 프롬프팅이 아닌 '플로우(Flow) 엔지니어링'이 새로운 표준으로 자리잡았다는 점입니다."
  },
  "news_threads_003": {
    title: "LangChain 1.0 정식 출시: 10배 빠른 코어 런타임",
    summary: "랭체인(LangChain) 1.0이 정식으로 배포되었습니다. 코어를 전면 재작성하여 타입 안정성을 확보하고 속도를 10배 향상시킨 마이그레이션 가이드가 화제입니다."
  }
};

function getMockGeminiResponse(candidates) {
  const sortedCandidates = [...(candidates || [])].sort((a, b) => (b.likes || 0) - (a.likes || 0));
  const news = sortedCandidates.map(c => {
    let catId = "x";
    let catName = "X (Twitter)";
    if (c.platform === "GeekNews") { catId = "geeknews"; catName = "GeekNews"; }
    else if (c.platform === "Instagram") { catId = "instagram"; catName = "Instagram"; }
    else if (c.platform === "Threads") { catId = "threads"; catName = "Threads"; }

    let titleKo = "";
    let summaryKo = "";

    if (c.platform === "GeekNews") {
      const parts = c.content.split('\n');
      titleKo = parts[0] || c.content;
      summaryKo = parts.slice(1).join('\n') || titleKo;
    } else {
      const tr = MOCK_TRANSLATIONS[c.id];
      if (tr) {
        titleKo = tr.title;
        summaryKo = tr.summary;
      } else {
        titleKo = c.content.slice(0, 60);
        summaryKo = c.content;
      }
    }

    return {
      id: c.id,
      category_id: catId,
      category_name: catName,
      headline: titleKo,
      summary_ko: summaryKo,
      body_ko: summaryKo + "\n" + (c.content.length > 20 ? "상세 본문: " + c.content : ""),
      author: c.author || "Unknown",
      publish_date: c.publish_date || new Date().toISOString(),
      tags: c.tags || [catName, "트렌드"],
      multimedia: c.multimedia || [],
      url: c.url,
      related_articles: c.related_articles || [],
      sources: c.references || [c.platform]
    };
  }).slice(0, 5); // Mock 데이터도 최대 5개로 제한
  
  const dynamicSummary = candidates.length > 0
    ? `오늘의 주요 AI 트렌드: '${news[0].headline}' 등을 포함하여 총 ${candidates.length}건의 핫이슈가 수집되었습니다.`
    : "오늘 수집된 새로운 AI 트렌드가 없습니다.";

  return {
    summary: dynamicSummary,
    news: news
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
    console.warn("⚠️ GEMINI_API_KEY가 없습니다. 프론트엔드 UI/UX 테스트를 위해 실시간 Mock 데이터를 생성합니다.");
    curated = getMockGeminiResponse(candidates);
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
    generated_at: new Date().toISOString(),
    version: `v${today.replaceAll("-", ".")}`,
    summary: curated.summary || "",
    news: curated.news
  };

  const outputDir = path.dirname(LATEST);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(LATEST, JSON.stringify(latest, null, 2));
  console.log(`큐레이션 완료: 총 ${latest.news.length}개 뉴스 기사 -> ${LATEST}`);

  // Archiving logic
  const archiveDir = path.join(outputDir, "archive");
  if (!fs.existsSync(archiveDir)) {
    fs.mkdirSync(archiveDir, { recursive: true });
  }
  
  const archiveFile = path.join(archiveDir, `news_${today}.json`);
  fs.writeFileSync(archiveFile, JSON.stringify(latest, null, 2));
  
  const newsIndexFile = path.join(archiveDir, "news_index.json");
  let newsIndex = { archives: [] };
  if (fs.existsSync(newsIndexFile)) {
    try {
      newsIndex = JSON.parse(fs.readFileSync(newsIndexFile, "utf8"));
      if (!newsIndex.archives) newsIndex.archives = [];
    } catch (e) {
      console.warn("news_index.json 파싱 오류:", e);
    }
  }
  
  const existingArchive = newsIndex.archives.find(a => a.file === `news_${today}.json` || a.file === `${today}.json`);
  if (!existingArchive) {
    newsIndex.archives.unshift({
      file: `news_${today}.json`,
      version: `v${today.replaceAll("-", ".")}`,
      generated_at: new Date().toISOString()
    });
    fs.writeFileSync(newsIndexFile, JSON.stringify(newsIndex, null, 2));
  }
  
  console.log(`아카이빙 완료: ${archiveFile} 및 news_index.json 업데이트됨.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
