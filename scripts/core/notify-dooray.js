#!/usr/bin/env node
/**
 * notify-dooray.js
 * Dooray Incoming Webhook 카드형(Attachment) 데일리 뉴스 단일 알림 모듈
 * 
 * - 두레이 메신저 카드 블록(Attachments) 지원으로 가독성 및 직관성 극대화
 * - 마크다운 특수문자(**) 노이즈 제거 및 깔끔한 2불릿 구조화
 * - 최대 4개 주요 뉴스 + 하단 전체 뉴스탭 링크 카드
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_WEBHOOK_URL = "https://nhnent.dooray.com/services/2044091570192967999/4305914863153263592/8kRGtvMaTuylMj6IpTy3-g";
const WEBHOOK_URL = process.env.DOORAY_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const NEWS_TAB_URL = "https://ldk-hub.github.io/ai-weekly/news.html";

const SIGNAL_COLORS = {
  model: "#D97757",    // 산호/테라코타
  product: "#8E75B2",  // 퍼플
  devtool: "#3178C6",  // 블루
  oss: "#6DB33F",      // 그린
  research: "#FF4F00", // 오렌지
  practice: "#0052CC", // 딥블루
  policy: "#718096"    // 그레이
};

const SIGNAL_LABELS = {
  model: "모델",
  product: "제품",
  devtool: "도구",
  oss: "오픈소스",
  research: "연구",
  practice: "실무",
  policy: "정책"
};

function sendDoorayWebhook(payload) {
  if (!WEBHOOK_URL) {
    console.warn("⚠️ DOORAY_WEBHOOK_URL이 없어 알림 발송을 건너뜁니다.");
    return Promise.resolve();
  }

  const url = new URL(WEBHOOK_URL);
  const data = JSON.stringify(payload);

  return new Promise((resolve) => {
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Dooray 데일리 뉴스 카드 알림 발송 성공 (HTTP ${res.statusCode})`);
          resolve();
        } else {
          console.warn(`⚠️ Dooray 알림 발송 실패 (HTTP ${res.statusCode}): ${body}`);
          resolve();
        }
      });
    });

    req.on("error", (err) => {
      console.warn(`⚠️ Dooray 네트워크 에러: ${err.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
}

function cleanText(str) {
  if (!str) return "";
  return str.replace(/\*\*/g, "").trim();
}

function buildCleanCardPayload() {
  const newsPath = path.join(ROOT, 'site', 'public', 'data', 'news_latest.json');
  if (!fs.existsSync(newsPath)) {
    console.warn("news_latest.json 파일이 없습니다.");
    return null;
  }

  const data = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
  const news = data.news || [];
  if (news.length === 0) return null;

  const today = data.version ? data.version.replace(/^v/, '') : new Date().toISOString().slice(0, 10);
  const topNews = news.slice(0, 4); // 최대 4개로 제한

  const attachments = topNews.map((item, idx) => {
    const label = SIGNAL_LABELS[item.signal_id] || "기술";
    const color = SIGNAL_COLORS[item.signal_id] || "#D97757";
    const title = `${idx + 1}. [${label}] ${cleanText(item.title_ko)}`;

    const bullets = (item.summary_ko || "")
      .split("\n")
      .map(b => b.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map(b => `• ${cleanText(b.replace(/^[•\-\*]\s*/, ''))}`)
      .join("\n");

    return {
      title,
      titleLink: item.url,
      text: bullets,
      color
    };
  });

  // 하단 전체 뉴스 바로가기 카드
  attachments.push({
    title: "👉 [AI위클리] 전체 뉴스 및 아카이브 보러가기",
    titleLink: NEWS_TAB_URL,
    text: NEWS_TAB_URL,
    color: "#20232A"
  });

  return {
    botName: "AI위클리",
    botIconImage: "https://ldk-hub.github.io/ai-weekly/claude-avatar.svg",
    text: `📰 **[AI위클리] 데일리 AI 기술 뉴스 (${today})**\n`,
    attachments
  };
}

async function main() {
  const payload = buildCleanCardPayload();
  if (!payload) return;
  await sendDoorayWebhook(payload);
}

main().catch(err => {
  console.error("Dooray 실행 중 오류:", err);
});
