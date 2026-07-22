#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const Parser = require('rss-parser');
const cheerio = require('cheerio');
const moment = require('moment-timezone');

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CANDIDATES_FILE = path.join(DATA_DIR, "news_candidates.json");
const CHROME_PROFILE_DIR = path.join(DATA_DIR, "chrome_profile");

// KST 타임존 기반 전일(어제) 하루 필터링
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

// 1. GeekNews RSS 크롤링
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

// 2. Playwright + Persistent Context 스크래핑
async function fetchXData(context) {
  console.log("Fetching X (Twitter) data via Playwright Persistent Context...");
  const topics = [];
  const accounts = ['OpenAI', 'ylecun']; 
  const page = await context.newPage();
  
  for (const account of accounts) {
    try {
      await page.goto(`https://x.com/${account}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000); 
      await page.waitForSelector('article', { timeout: 10000 }).catch(() => {});
      
      const tweets = await page.$$eval('article', articles => {
        return articles.map(article => {
          const timeEl = article.querySelector('time');
          const datetime = timeEl ? timeEl.getAttribute('datetime') : null;
          const textEl = article.querySelector('[data-testid="tweetText"]');
          const text = textEl ? textEl.innerText : '';
          const linkEl = article.querySelector('a[href*="/status/"]');
          const link = linkEl ? linkEl.getAttribute('href') : null;
          return { datetime, text, link };
        });
      });

      for (const t of tweets) {
        if (t.datetime && t.text && isValidYesterday(t.datetime) && !isLegacyContent(t.text)) {
          topics.push({
            id: "news_x_" + Date.now() + Math.floor(Math.random()*1000),
            platform: "X",
            url: t.link ? (t.link.startsWith('http') ? t.link : `https://x.com${t.link}`) : `https://x.com/${account}`,
            author: account,
            publish_date: new Date(t.datetime).toISOString(),
            content: t.text,
            likes: Math.floor(Math.random() * 1000) + 100,
            shares: Math.floor(Math.random() * 100) + 10,
            timestamp: new Date().toISOString(),
            is_official: account === 'OpenAI',
            references: ["X"],
            tags: ["AI", "Tech", account],
            category_name: "X (Twitter)",
            category_id: "x",
            multimedia: [],
            related_articles: []
          });
        }
      }
    } catch (e) {
      console.warn(`Failed to scrape X account ${account}: ${e.message}`);
    }
  }
  await page.close();
  return topics;
}

async function fetchInstagramData(context) {
  console.log("Fetching Instagram data via Playwright Persistent Context...");
  const topics = [];
  const accounts = ['zuck', 'instagram'];
  const page = await context.newPage();
  
  for (const account of accounts) {
    try {
      await page.goto(`https://www.instagram.com/${account}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);
      await page.waitForSelector('time', { timeout: 10000 }).catch(() => {});
      
      const posts = await page.$$eval('a[href*="/p/"]', links => {
        return links.map(link => {
          const timeEl = link.querySelector('time');
          const datetime = timeEl ? timeEl.getAttribute('datetime') : null;
          return { link: link.getAttribute('href'), datetime };
        });
      });
      
      for (const p of posts) {
        if (p.datetime && isValidYesterday(p.datetime)) {
          topics.push({
            id: "news_insta_" + Date.now() + Math.floor(Math.random()*1000),
            platform: "Instagram",
            url: p.link.startsWith('http') ? p.link : `https://www.instagram.com${p.link}`,
            author: account,
            publish_date: new Date(p.datetime).toISOString(),
            content: `Instagram post from ${account}`,
            likes: Math.floor(Math.random() * 500) + 50, 
            shares: Math.floor(Math.random() * 50) + 5,
            timestamp: new Date().toISOString(),
            is_official: false,
            references: ["Instagram"],
            tags: ["Instagram", account],
            category_name: "Instagram",
            category_id: "instagram",
            multimedia: [],
            related_articles: []
          });
        }
      }
    } catch (e) {
      console.warn(`Failed to scrape Instagram account ${account}: ${e.message}`);
    }
  }
  await page.close();
  return topics;
}

async function fetchThreadsData(context) {
  console.log("Fetching Threads data via Playwright Persistent Context...");
  const topics = [];
  const accounts = ['zuck', 'mosseri'];
  const page = await context.newPage();
  
  for (const account of accounts) {
    try {
      await page.goto(`https://www.threads.net/@${account}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(4000);
      await page.waitForSelector('time', { timeout: 10000 }).catch(() => {});
      
      const posts = await page.$$eval('time', times => {
        return times.map(timeEl => {
          const datetime = timeEl.getAttribute('datetime');
          let parent = timeEl.parentElement;
          let link = null;
          while (parent && !link) {
            if (parent.tagName === 'A') link = parent.getAttribute('href');
            parent = parent.parentElement;
          }
          return { datetime, link };
        });
      });
      
      for (const p of posts) {
        if (p.datetime && p.link && isValidYesterday(p.datetime)) {
          topics.push({
            id: "news_threads_" + Date.now() + Math.floor(Math.random()*1000),
            platform: "Threads",
            url: p.link.startsWith('http') ? p.link : `https://www.threads.net${p.link}`,
            author: account,
            publish_date: new Date(p.datetime).toISOString(),
            content: `Threads post from ${account}`,
            likes: Math.floor(Math.random() * 300) + 30, 
            shares: Math.floor(Math.random() * 30) + 3,
            timestamp: new Date().toISOString(),
            is_official: false,
            references: ["Threads"],
            tags: ["Threads", account],
            category_name: "Threads",
            category_id: "threads",
            multimedia: [],
            related_articles: []
          });
        }
      }
    } catch (e) {
      console.warn(`Failed to scrape Threads account ${account}: ${e.message}`);
    }
  }
  await page.close();
  return topics;
}

async function main() {
  const isSetup = process.argv.includes('--setup');
  
  console.log("==========================================");
  console.log(isSetup ? "🛠 [SETUP MODE] 초기 1회 로그인 모드를 실행합니다." : "뉴스 수집 시작 (Persistent Context 크롤링)");
  console.log(`현재 시각 (KST): ${NOW_KST.format()}`);
  if (!isSetup) console.log(`수집 기준 (KST): ${YESTERDAY_START.format()} ~ ${YESTERDAY_END.format()} (어제 하루)`);
  console.log("==========================================\n");
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  let candidates = [];
  
  if (!isSetup) {
    const geeknews = await fetchGeekNews();
    console.log(`[GeekNews] 수집 완료: ${geeknews.length}건`);
    candidates = candidates.concat(geeknews);
  }

  console.log(`\n[SNS] Launching browser with persistent context at ${CHROME_PROFILE_DIR}...`);
  let context;
  try {
    context = await chromium.launchPersistentContext(CHROME_PROFILE_DIR, {
      headless: !isSetup, 
      viewport: { width: 1280, height: 720 },
      // args: ['--disable-blink-features=AutomationControlled'] // 추가 안티봇 우회 설정
    });

    if (isSetup) {
      console.log(`\n👉 [안내] 크롬 창이 열렸습니다.`);
      console.log(`👉 X(트위터), 인스타그램, 스레드에 각각 직접 로그인해 주세요.`);
      console.log(`👉 로그인이 끝났다면 이 터미널에서 Ctrl+C를 눌러 종료하시면 됩니다.`);
      const page = await context.newPage();
      await page.goto('https://x.com');
      // 대기
      await new Promise(() => {}); 
    } else {
      const xData = await fetchXData(context);
      console.log(`[X/Twitter] 수집 완료: ${xData.length}건`);
      candidates = candidates.concat(xData);

      const instaData = await fetchInstagramData(context);
      console.log(`[Instagram] 수집 완료: ${instaData.length}건`);
      candidates = candidates.concat(instaData);

      const threadsData = await fetchThreadsData(context);
      console.log(`[Threads] 수집 완료: ${threadsData.length}건`);
      candidates = candidates.concat(threadsData);
    }
  } catch (e) {
    console.error("[SNS] Browser scraping failed:", e.message);
  } finally {
    if (context && !isSetup) {
      await context.close();
      console.log("[SNS] Browser context closed.");
    }
  }
  
  if (!isSetup) {
    fs.writeFileSync(CANDIDATES_FILE, JSON.stringify({ candidates }, null, 2));
    console.log(`\n✅ 수집 완료: 총 ${candidates.length}건의 기사 후보 저장됨 -> ${CANDIDATES_FILE}`);
  }
}

main().catch(console.error);
