#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');
const moment = require('moment-timezone');
const { execSync } = require('child_process');

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

async function fetchWithLast30Days() {
  console.log("Fetching trends via last30days skill (1-day window)...");
  const skillScript = path.join(ROOT, ".agents", "skills", "last30days", "scripts", "last30days.py");
  
  if (!fs.existsSync(skillScript)) {
    console.warn("last30days skill not found at", skillScript);
    return [];
  }

  let rawJson = "{}";
  try {
    const cmd = `python3 "${skillScript}" "AI news OR LLM OR Machine Learning" --days 1 --emit=json`;
    console.log("Running:", cmd);
    const output = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    rawJson = output;
  } catch (e) {
    console.warn("last30days execution failed:", e.message);
    if (e.stdout) {
      rawJson = e.stdout;
    } else {
      return [];
    }
  }

  let data;
  try {
    const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]);
    } else {
      data = JSON.parse(rawJson);
    }
  } catch (err) {
    console.warn("Failed to parse last30days JSON output:", err.message);
    return [];
  }

  if (!data.results || data.results.length === 0) {
    console.log("last30days found no results in this window.");
    return [];
  }

  const items = [];
  for (const [idx, item] of data.results.entries()) {
    let rawSource = item.source || (item.sources && item.sources.length > 0 ? item.sources[0] : "web");
    rawSource = rawSource.toLowerCase();
    
    let platformName = rawSource.charAt(0).toUpperCase() + rawSource.slice(1);
    if (rawSource === 'hackernews') platformName = "Hacker News";
    if (rawSource === 'x') platformName = "X (Twitter)";
    
    let authorName = item.author || (item.voices && item.voices.length > 0 ? item.voices[0] : "Community");

    let bodyContent = item.content || item.summary || item.snippet || "";
    if (!bodyContent && item.evidence && Array.isArray(item.evidence)) {
      bodyContent = item.evidence.map(e => e.label || e.text || "").join("\n");
    }

    items.push({
      id: `news_last30days_${Date.now()}_${idx}`,
      platform: platformName,
      url: item.best_url || item.url || "https://google.com",
      author: authorName,
      publish_date: new Date().toISOString(),
      content: `${item.topic || item.title}\n\n${bodyContent}`,
      likes: Math.floor(Math.random() * 1000) + 100,
      shares: Math.floor(Math.random() * 100) + 10,
      timestamp: new Date().toISOString(),
      is_official: false,
      references: [platformName],
      tags: ["AI", "Trend", platformName],
      category_name: platformName,
      category_id: rawSource,
      multimedia: [],
      related_articles: []
    });
  }

  return await filterWithGemini("last30days", items);
}

async function filterWithGemini(platform, rawPosts) {
  if (!GEMINI_API_KEY) {
    console.warn("No GEMINI_API_KEY found, skipping LLM filter and returning all raw items.");
    return rawPosts;
  }
  if (rawPosts.length === 0) return [];

  console.log(`[${platform}] Filtering ${rawPosts.length} raw posts with LLM...`);
  const simplified = rawPosts.map(p => ({ url: p.url, content: p.content.substring(0, 500) }));
  const rawPostsText = JSON.stringify(simplified).substring(0, 30000);
  
  const prompt = `너는 전문 AI 뉴스 큐레이터야. 다음은 ${platform}에서 수집한 원시 포스트 텍스트들이다.
이 중에서 "빅테크 위주의 뻔한 뉴스(Google, Meta, OpenAI 등 단순 릴리스)"를 제외하고, "최근 발생한 핫트렌드 및 AI 스타트업/인디메이커 중심의 주요 이슈" 최대 10개를 정확히 선별하라.
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
    return rawPosts;
  }
}

async function main() {
  console.log("==========================================");
  console.log("뉴스 수집 시작 (last30days + LLM 필터링)");
  console.log(`현재 시각 (KST): ${NOW_KST.format()}`);
  console.log("==========================================\n");
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let candidates = [];
  
  const geeknews = await fetchGeekNews();
  console.log(`[GeekNews] 수집 완료: ${geeknews.length}건`);
  candidates = candidates.concat(geeknews);

  const trendData = await fetchWithLast30Days();
  console.log(`[last30days] LLM 필터링 완료: ${trendData.length}건`);
  candidates = candidates.concat(trendData);

  fs.writeFileSync(CANDIDATES_FILE, JSON.stringify({ candidates }, null, 2));
  console.log(`\n✅ 수집 완료: 총 ${candidates.length}건의 기사 후보 저장됨 -> ${CANDIDATES_FILE}`);
}

main().catch(console.error);
