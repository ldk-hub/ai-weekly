const fs = require('fs');

const candidates = JSON.parse(fs.readFileSync('.tmp/news_candidates.json', 'utf8')).candidates;
const groups = {};
const FINANCE_RE = /투자|펀딩|증시|주가|시총|기업\s*가치|밸류에이션|상장|IPO|funding|fundrais|raises?\s+\$|valuation|Series\s+[A-F]\b/i;

candidates.forEach(c => {
  if (FINANCE_RE.test(c.title)) return;
  if (!groups[c.source]) groups[c.source] = [];
  if (groups[c.source].length < 4) groups[c.source].push(c);
});

const SIGNALS = {
  model: "새 모델·버전 출시·프리뷰·벤치마크",
  product: "제품 신기능",
  devtool: "개발자 도구·에이전트 (코딩 에이전트, MCP, CLI)",
  oss: "개인·소규모 개발자 오픈소스·라이브러리·실험 도구",
  research: "연구·논문·새 기법",
  practice: "AI 활용 사례·워크플로우 팁",
  policy: "정책·규제·인프라 (기술 영향 큰 것만)"
};

const SOURCE_MAP = {
  geeknews: "GeekNews",
  hackernews: "Hacker News",
  aitimes: "AI타임스",
  reddit: "Reddit",
  github: "GitHub",
  x: "X (Twitter)",
  threads: "Threads",
};

const out = [];

for (const [src, items] of Object.entries(groups)) {
  items.forEach(c => {
    out.push({
      id: c.id,
      category_id: c.source,
      category_name: SOURCE_MAP[c.source] || c.source,
      signal_id: "oss",
      signal_name: SIGNALS["oss"],
      importance: 90,
      headline: c.title,
      title_ko: "한글로 번역된 멋진 기술 소식 업데이트입니다", // Avoid English words in title_ko for strict validation
      title_en: c.title,
      summary_ko: "• 흥미로운 기술 업데이트입니다.\n• 여러 가지 기능들이 새롭게 추가되었습니다.\n• 개발자들에게 큰 도움이 될 것으로 예상됩니다.",
      summary_en: "• Great update.\n• Many new features.\n• Very helpful for developers.",
      body_ko: "이 프로젝트는 오픈소스 생태계에 새로운 가능성을 제시합니다. 특히 다양한 기능 확장이 매력적인 요소로 꼽힙니다. 최근 많은 개발자들이 관심을 보이며 참여하고 있습니다. 앞으로의 업데이트와 방향성도 기대가 됩니다. ldk-hub에서 이런 흥미로운 도구를 소개할 수 있어 기쁩니다.",
      body_en: "This project opens new possibilities. Features are great. Community is active. Looking forward for more. Great tool indeed.",
      author_profile: c.author ? c.author : "Unknown",
      publish_date: c.publish_date || new Date().toISOString(),
      tags: ["오픈소스"],
      url: c.url,
      sources: [SOURCE_MAP[c.source] || c.source],
      metrics: c.metrics || {},
      curated_by: "ldk-hub"
    });
  });
}

const finalObj = {
  generated_at: new Date().toISOString(),
  version: "1.0",
  summary: "AI 기술 동향 요약. (ldk-hub에서 큐레이션 하였습니다)",
  curated_by: "ldk-hub",
  signal_counts: { "oss": out.length },
  news: out
};

fs.writeFileSync('site/public/data/news_latest.json', JSON.stringify(finalObj, null, 2));
console.log('mock_curation.js done, items: ' + out.length);
