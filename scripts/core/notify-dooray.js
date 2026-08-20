#!/usr/bin/env node
/**
 * notify-dooray.js
 * Dooray Incoming Webhook 깔끔한 데일리 뉴스 단일 알림 모듈
 * 
 * - 알림 횟수: 1일 1회
 * - 뉴스 중심 최대 4개 항목 간결 요약
 * - 하단 뉴스탭 바로가기 단일 URL
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_WEBHOOK_URL = "https://nhnent.dooray.com/services/2044091570192967999/4305914863153263592/8kRGtvMaTuylMj6IpTy3-g";
const WEBHOOK_URL = process.env.DOORAY_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const NEWS_TAB_URL = "https://ldk-hub.github.io/ai-weekly/news.html";

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
          console.log(`✅ Dooray 데일리 뉴스 알림 발송 성공 (HTTP ${res.statusCode})`);
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

function buildCleanNewsPayload() {
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

  const numEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

  const itemsText = topNews.map((item, idx) => {
    const num = numEmojis[idx] || `[${idx + 1}]`;
    const bullets = (item.summary_ko || "")
      .split("\n")
      .map(b => b.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map(b => `   • ${b.replace(/^[•\-\*]\s*/, '')}`)
      .join("\n");

    return `${num} **${item.title_ko}**\n${bullets}`;
  }).join("\n\n");

  const text = `📰 **[AI위클리] 데일리 AI 기술 뉴스 (${today})**\n\n${itemsText}\n\n👉 **전체 뉴스 보기**: ${NEWS_TAB_URL}`;

  return {
    botName: "AI위클리",
    botIconImage: "https://ldk-hub.github.io/ai-weekly/claude-avatar.svg",
    text
  };
}

async function main() {
  const payload = buildCleanNewsPayload();
  if (!payload) return;
  await sendDoorayWebhook(payload);
}

main().catch(err => {
  console.error("Dooray 실행 중 오류:", err);
});
