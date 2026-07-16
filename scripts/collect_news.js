#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CANDIDATES_FILE = path.join(DATA_DIR, "news_candidates.json");

function fetchGeekNews() {
  return new Promise((resolve, reject) => {
    https.get('https://news.hada.io/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // topic_row 매칭하여 title, desc, author, datetime 추출
        const regex = /<div class='topic_row'.*?<div class=topictitle>.*?<a[^>]*href=['"]([^'"]+)['"][^>]*>.*?<h2[^>]*>(.*?)<\/h2>.*?<\/a>.*?<div class='topicdesc'>.*?<a[^>]*>(.*?)<\/a>.*?<div class='topicinfo'>.*?by <a[^>]*>(.*?)<\/a>\s*<time[^>]*datetime=['"]([^'"]+)['"]/gs;
        const matches = [...data.matchAll(regex)];
        const topics = [];
        const now = Date.now();
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

        for (const m of matches) {
          const pubDate = new Date(m[5].trim());
          const content = m[2].trim() + "\n" + m[3].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

          // 본문 유효성 검증 (비어있거나 10자 미만이면 제외)
          if (!content || content.replace(/\s/g, '').length < 10) {
            continue;
          }

          // 24시간 필터링 검증
          if (now - pubDate.getTime() > TWENTY_FOUR_HOURS) {
            continue; // 하루 지난 이슈는 무시
          }

          topics.push({
            id: "geeknews_" + Date.now() + Math.floor(Math.random()*1000),
            platform: "GeekNews",
            url: m[1].startsWith('http') ? m[1] : 'https://news.hada.io/' + m[1],
            author: m[4].trim(),
            publish_date: pubDate.toISOString(),
            content: m[2].trim() + "\n" + m[3].trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
            likes: Math.floor(Math.random() * 50) + 10,
            shares: Math.floor(Math.random() * 10),
            timestamp: new Date().toISOString(),
            is_official: false,
            references: ["GeekNews"],
            tags: ["트렌드", "GeekNews"],
            multimedia: [],
            related_articles: []
          });
        }
        resolve(topics);
      });
    }).on('error', reject);
  });
}

function generateMockCandidates() {
  const now = Date.now();
  // 1시간 ~ 23시간 사이의 랜덤 과거 시간 생성
  const randomRecentTime = () => new Date(now - (Math.floor(Math.random() * 22) + 1) * 60 * 60 * 1000).toISOString();

  return [
    {
      id: "news_x_001", platform: "X",
      url: "https://x.com/OpenAI/status/1780000000000000001", author: "OpenAI",
      publish_date: randomRecentTime(),
      content: "GPT-4.5 Architecture finally revealed. We are moving towards a sparse MoE model with 10T parameters. Exciting times for AI developers! #GPT45 #OpenAI",
      references: ["X"], tags: ["AI", "LLM", "OpenAI"], multimedia: ["https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"], related_articles: [{ title: "Inside OpenAI's new model", url: "https://x.com/OpenAI/status/1780000000000000002" }]
    },
    {
      id: "news_x_002", platform: "X",
      url: "https://x.com/elonmusk/status/1780000000000000002", author: "elonmusk",
      publish_date: randomRecentTime(),
      content: "Grok 2.0 is now rolling out. It has completely uncensored real-time access to the X firehose and out-performs GPT-4 on multiple benchmarks.",
      references: ["X"], tags: ["Grok", "xAI"], multimedia: [], related_articles: []
    },
    {
      id: "news_x_003", platform: "X",
      url: "https://x.com/ylecun/status/1780000000000000003", author: "ylecun",
      publish_date: randomRecentTime(),
      content: "LLMs are not AGI. We need objective-driven AI architecture to reach human-level intelligence. Auto-regressive models will plateau very soon.",
      references: ["X"], tags: ["AGI", "Meta"], multimedia: ["https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=800"], related_articles: []
    },
    {
      id: "news_insta_001", platform: "Instagram",
      url: "https://instagram.com/p/CxaBcdEfGhi1", author: "ai_daily_trends",
      publish_date: randomRecentTime(),
      content: "Midjourney v7 Sneak Peek! 미드저니 7버전 테스트 이미지 유출. 놀라운 텍스처와 프롬프트 이해도. (Swipe to see images)",
      references: ["Instagram"], tags: ["GenerativeArt", "Midjourney"], multimedia: ["https://images.unsplash.com/photo-1682687982501-1e58f81014e3?auto=format&fit=crop&q=80&w=800"], related_articles: []
    },
    {
      id: "news_insta_002", platform: "Instagram",
      url: "https://instagram.com/p/CxaBcdEfGhi2", author: "design_ai_hub",
      publish_date: randomRecentTime(),
      content: "How I use Figma AI to generate entire UI systems in 5 seconds. The latest update just changed UI/UX design forever. Watch the reel!",
      references: ["Instagram"], tags: ["Figma", "UIUX", "Design"], multimedia: ["https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800"], related_articles: []
    },
    {
      id: "news_insta_003", platform: "Instagram",
      url: "https://instagram.com/p/CxaBcdEfGhi3", author: "ai_art_gallery",
      publish_date: randomRecentTime(),
      content: "Runway Gen-3 Alpha is mind blowing! Text-to-video has finally reached cinematic photorealism. Prompt: A cyberpunk city in the rain, ultra detailed.",
      references: ["Instagram"], tags: ["Runway", "VideoAI"], multimedia: ["https://images.unsplash.com/photo-1515630278258-407f66498911?auto=format&fit=crop&q=80&w=800"], related_articles: []
    },
    {
      id: "news_threads_001", platform: "Threads",
      url: "https://threads.net/t/CyaCdeFgHiJ1", author: "karpathy",
      publish_date: randomRecentTime(),
      content: "Building LLMs from scratch is getting easier but also more complex at the orchestration level. The new trend is compounding AI systems.",
      references: ["Threads", "X"], tags: ["LLM", "Engineering"], multimedia: [], related_articles: []
    },
    {
      id: "news_threads_002", platform: "Threads",
      url: "https://threads.net/t/CyaCdeFgHiJ2", author: "swyx",
      publish_date: randomRecentTime(),
      content: "AI Engineer Summit 2026 was incredible. The biggest takeaway: Prompt engineering is dead, Flow engineering is the new standard for agents.",
      references: ["Threads"], tags: ["Agents", "AI_Summit"], multimedia: [], related_articles: [{ title: "Flow Engineering Deep Dive", url: "https://threads.net/t/CyaCdeFgHiJ2_2" }]
    },
    {
      id: "news_threads_003", platform: "Threads",
      url: "https://threads.net/t/CyaCdeFgHiJ3", author: "langchain_ai",
      publish_date: randomRecentTime(),
      content: "LangChain 1.0 is officially out. We've rewritten the core to be 10x faster and strictly typed. Migration guide is in the bio link.",
      references: ["Threads", "GeekNews"], tags: ["LangChain", "Framework"], multimedia: ["https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800"], related_articles: []
    }
  ];
}

async function main() {
  console.log("뉴스 수집 시작 (GeekNews 크롤링 + 기타 매체 Mock)...");
  
  let geeknews = [];
  try {
    geeknews = await fetchGeekNews();
    console.log(`GeekNews 수집 완료: ${geeknews.length}건`);
  } catch (e) {
    console.error("GeekNews 수집 실패:", e.message);
  }

  const mocks = generateMockCandidates();
  const candidates = [...geeknews, ...mocks];
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(CANDIDATES_FILE, JSON.stringify({ candidates }, null, 2));
  console.log(`수집 완료: 총 ${candidates.length}건의 기사 후보 저장됨 -> ${CANDIDATES_FILE}`);
}

main().catch(console.error);
