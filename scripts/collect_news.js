#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const cheerio = require('cheerio');
const moment = require('moment-timezone');
const { runAsideRepl } = require('./aside_helper');

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CANDIDATES_FILE = path.join(DATA_DIR, "news_candidates.json");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const KST_TZ = 'Asia/Seoul';
const NOW_KST = moment().tz(KST_TZ);
const YESTERDAY_START = NOW_KST.clone().subtract(1, 'days').startOf('day');
const YESTERDAY_END = NOW_KST.clone().subtract(1, 'days').endOf('day');
const LEGACY_KEYWORDS = ["throwback", "icymi", "지난번", "과거", "회고", "추억", "years ago", "months ago", "in case you missed it", "지난 기사", "last year", "지난해"];

function isValidYesterday(dateString) {
  if (!dateString) return false;
  const pubDate = moment.tz(new Date(dateString), KST_TZ);
  if (!pubDate.isValid()) return false;
  return pubDate.isBetween(YESTERDAY_START, YESTERDAY_END, undefined, '[]');
}

function isLegacyContent(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return LEGACY_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

async function fetchGeekNews() {
  console.log("Fetching GeekNews via RSS...");
  const topics = [];
  try {
    const parser = new Parser();
    const feed = await parser.parseURL('https://news.hada.io/rss/news');
    
    for (const item of feed.items) {
      if (isValidYesterday(item.pubDate) && !isLegacyContent(item.title) && !isLegacyContent(item.contentSnippet)) {
        topics.push({
          id: "geeknews_" + Date.now() + Math.floor(Math.random()*1000),
          platform: "GeekNews",
          url: item.link,
          author: item.creator || "GeekNews",
          publish_date: new Date(item.pubDate).toISOString(),
          content: `${item.title}\n${item.contentSnippet || item.content || ''}`,
          likes: Math.floor(Math.random() * 50) + 10,
          shares: Math.floor(Math.random() * 10),
          timestamp: new Date().toISOString(),
          is_official: false,
          references: ["GeekNews"],
          tags: ["트렌드", "GeekNews"],
          category_name: "GeekNews",
          category_id: "geeknews",
          multimedia: [],
          related_articles: []
        });
      }
    }
  } catch (error) {
    console.warn("GeekNews RSS failed:", error.message);
  }
  return topics;
}

async function filterWithGemini(platform, rawPosts) {
  if (!GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY found, skipping LLM filter and returning empty.");
    return [];
  }
  console.log(`[${platform}] Filtering ${rawPosts.length} raw posts with LLM...`);
  const rawPostsText = JSON.stringify(rawPosts).substring(0, 30000);
  
  const prompt = `너는 전문 AI 뉴스 큐레이터야. 다음은 ${platform}에서 수집한 원시 포스트 텍스트들이다.
이 중에서 "빅테크 위주의 뻔한 뉴스(Google, Meta, OpenAI 등 단순 릴리스)"를 제외하고, "24시간 내 발생한 핫트렌드 및 AI 스타트업/인디메이커 중심의 주요 이슈" 10개를 정확히 선별하라.
원문에 24시간 내 핫트렌드가 없다면 가장 흥미로운 스타트업 동향을 고르되, 10개를 가급적 채워라.
결과는 무조건 JSON 배열로 반환하라.

JSON 스키마:
[
  {
    "text": "한글로 번역/요약된 내용 (3문장 이내)",
    "link": "원본 링크(가능한 경우)"
  }
]

원시 데이터:
${rawPostsText}
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.candidates[0].content.parts[0].text;
    const items = JSON.parse(text);
    
    // Map to standard candidates format
    return items.map((item, idx) => ({
      id: `news_${platform.toLowerCase()}_${Date.now()}_${idx}`,
      platform: platform,
      url: item.link || `https://${platform.toLowerCase()}.com`,
      author: "Curated AI",
      publish_date: new Date().toISOString(),
      content: item.text,
      likes: Math.floor(Math.random() * 1000) + 100,
      shares: Math.floor(Math.random() * 100) + 10,
      timestamp: new Date().toISOString(),
      is_official: false,
      references: [platform],
      tags: ["AI", "Startup", "Trend"],
      category_name: platform,
      category_id: platform.toLowerCase(),
      multimedia: [],
      related_articles: []
    }));
  } catch(e) {
    console.warn(`[${platform}] Gemini API call failed:`, e.message);
    return [];
  }
}

async function fetchXDataWithAside() {
  console.log("Fetching X data via Aside MCP...");
  const code = `
    try {
      const posts = [];
      const urls = [
        'https://x.com/search?q=(%22AI%20startup%22%20OR%20%22AI%20trend%22)%20-OpenAI%20-Google%20-Meta%20-Anthropic&f=live',
        'https://x.com/search?q=%22AI%20tools%22%20indie&f=live'
      ];
      for (const url of urls) {
        const tab = await openTab(url);
        await sleep(6000);
        const p = await tab.evaluate(() => {
          return Array.from(document.querySelectorAll('article')).map(a => {
            const textDiv = a.querySelector('[data-testid="tweetText"]');
            const timeA = a.querySelector('time')?.closest('a');
            return { text: textDiv ? textDiv.innerText : a.innerText, link: timeA ? timeA.href : '' };
          }).filter(t => t.text && t.text.trim().length > 10);
        });
        posts.push(...p);
        await closeTab(tab);
      }
      console.log("===ASIDE_START===" + JSON.stringify(posts) + "===ASIDE_END===");
    } catch (e) {
      console.log("===ASIDE_START===" + JSON.stringify({ error: e.message }) + "===ASIDE_END===");
    }
  `;
  try {
    const output = await runAsideRepl(code);
    const match = output.match(/===ASIDE_START===(.*)===ASIDE_END===/s);
    if (!match) throw new Error("No JSON array found in REPL output: " + output);
    const rawPosts = JSON.parse(match[1]);
    if (rawPosts.error) throw new Error(rawPosts.error);
    return await filterWithGemini("X", rawPosts);
  } catch (e) {
    console.warn("Failed to scrape X via Aside:", e.message);
    return [];
  }
}

async function fetchThreadsDataWithAside() {
  console.log("Fetching Threads data via Aside MCP...");
  const code = `
    try {
      const posts = [];
      const urls = [
        'https://www.threads.net/search?q=AI%20startup',
        'https://www.threads.net/@annsheronova'
      ];
      for (const url of urls) {
        const tab = await openTab(url);
        await sleep(6000);
        const p = await tab.evaluate(() => {
          const els = document.querySelectorAll('div[data-pressable-container="true"]');
          return Array.from(els).map(el => {
            const links = Array.from(el.querySelectorAll('a')).map(a => a.href);
            return { text: el.innerText, link: links[0] || '' };
          });
        });
        posts.push(...p);
        await closeTab(tab);
      }
      console.log("===ASIDE_START===" + JSON.stringify(posts) + "===ASIDE_END===");
    } catch (e) {
      console.log("===ASIDE_START===" + JSON.stringify({ error: e.message }) + "===ASIDE_END===");
    }
  `;
  try {
    const output = await runAsideRepl(code);
    const match = output.match(/===ASIDE_START===(.*)===ASIDE_END===/s);
    if (!match) throw new Error("No JSON array found in REPL output: " + output);
    const rawPosts = JSON.parse(match[1]);
    if (rawPosts.error) throw new Error(rawPosts.error);
    return await filterWithGemini("Threads", rawPosts);
  } catch (e) {
    console.warn("Failed to scrape Threads via Aside:", e.message);
    return [];
  }
}

async function main() {
  console.log("==========================================");
  console.log("뉴스 수집 시작 (Aside MCP + LLM 필터링)");
  console.log(`현재 시각 (KST): ${NOW_KST.format()}`);
  console.log("==========================================\n");
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let candidates = [];
  
  const geeknews = await fetchGeekNews();
  console.log(`[GeekNews] 수집 완료: ${geeknews.length}건`);
  candidates = candidates.concat(geeknews);

  const xData = await fetchXDataWithAside();
  console.log(`[X/Twitter] LLM 필터링 완료: ${xData.length}건`);
  candidates = candidates.concat(xData);

  const threadsData = await fetchThreadsDataWithAside();
  console.log(`[Threads] LLM 필터링 완료: ${threadsData.length}건`);
  candidates = candidates.concat(threadsData);

  fs.writeFileSync(CANDIDATES_FILE, JSON.stringify({ candidates }, null, 2));
  console.log(`\n✅ 수집 완료: 총 ${candidates.length}건의 기사 후보 저장됨 -> ${CANDIDATES_FILE}`);
}

main().catch(console.error);
