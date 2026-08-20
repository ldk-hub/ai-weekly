#!/usr/bin/env node
/**
 * notify-dooray.js
 * Dooray Incoming Webhook 알림 발송 모듈
 * 
 * Usage:
 *   node scripts/core/notify-dooray.js news      # 데일리 뉴스 알림 발송
 *   node scripts/core/notify-dooray.js trends    # 주간 트렌드 알림 발송
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_WEBHOOK_URL = "https://nhnent.dooray.com/services/2044091570192967999/4305914863153263592/8kRGtvMaTuylMj6IpTy3-g";
const WEBHOOK_URL = process.env.DOORAY_WEBHOOK_URL || DEFAULT_WEBHOOK_URL;
const SITE_URL = "https://ldk-hub.github.io/ai-weekly/";

function sendDoorayWebhook(payload) {
  if (!WEBHOOK_URL) {
    console.warn("⚠️ DOORAY_WEBHOOK_URL 환경변수가 없어 알림 발송을 건너뜁니다.");
    return Promise.resolve();
  }

  const url = new URL(WEBHOOK_URL);
  const data = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
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
          console.log(`✅ Dooray 알림 발송 성공 (HTTP ${res.statusCode})`);
          resolve();
        } else {
          console.warn(`⚠️ Dooray 알림 발송 실패 (HTTP ${res.statusCode}): ${body}`);
          resolve(); // 파이프라인 중단 방지
        }
      });
    });

    req.on("error", (err) => {
      console.warn(`⚠️ Dooray 알림 네트워크 에러: ${err.message}`);
      resolve(); // 파이프라인 중단 방지
    });

    req.write(data);
    req.end();
  });
}

function buildNewsPayload() {
  const newsPath = path.join(ROOT, 'site', 'public', 'data', 'news_latest.json');
  if (!fs.existsSync(newsPath)) {
    console.warn("news_latest.json 파일이 없습니다.");
    return null;
  }

  const data = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
  const news = data.news || [];
  if (news.length === 0) return null;

  const today = data.version ? data.version.replace(/^v/, '') : new Date().toISOString().slice(0, 10);
  const topNews = news.slice(0, 5); // 상위 5건 선정

  const signalBadge = (signalId) => {
    const map = {
      model: "🧠 모델",
      product: "✨ 제품",
      devtool: "🛠 도구",
      oss: "📦 오픈소스",
      research: "🔬 연구",
      practice: "💡 실무",
      policy: "🏛 정책"
    };
    return map[signalId] || "📌 기술";
  };

  const newsItemsText = topNews.map((item, idx) => {
    const bullets = (item.summary_ko || "")
      .split("\n")
      .map(b => b.trim())
      .filter(Boolean)
      .slice(0, 2) // 핵심 2불릿
      .map(b => `   ${b}`)
      .join("\n");

    return `**${idx + 1}. [${signalBadge(item.signal_id)}] ${item.title_ko}**\n${bullets}\n   🔗 [원문 링크](${item.url}) · [AI위클리에서 보기](${SITE_URL}news.html)`;
  }).join("\n\n");

  const breakdown = Object.entries(data.signal_counts || {})
    .map(([k, v]) => `${k} ${v}건`)
    .join(" · ");

  const text = `## 📰 [AI위클리] 데일리 AI 기술 신호 (${today})
> 7개 매체 수집 · 총 ${news.length}건 큐레이션 완료 (${breakdown})

🔥 **오늘의 핵심 AI 기술 이슈 TOP ${topNews.length}**

${newsItemsText}

---
👉 **[🌐 AI위클리 바로가기](${SITE_URL})** · **[📰 전체 뉴스 보기](${SITE_URL}news.html)** · **[📡 뉴스 RSS](${SITE_URL}news-feed.xml)**`;

  return {
    botName: "AI위클리 (AI Weekly)",
    botIconImage: "https://ldk-hub.github.io/ai-weekly/claude-avatar.svg",
    text
  };
}

function buildTrendsPayload() {
  const trendsPath = path.join(ROOT, 'site', 'public', 'data', 'latest.json');
  if (!fs.existsSync(trendsPath)) {
    console.warn("latest.json 파일이 없습니다.");
    return null;
  }

  const data = JSON.parse(fs.readFileSync(trendsPath, 'utf8'));
  const rising = (data.rising || []).slice(0, 4);
  const classic = (data.classic || []).slice(0, 3);
  const today = data.version ? data.version.replace(/^v/, '') : new Date().toISOString().slice(0, 10);

  const formatList = (list) => list.map((item, idx) => {
    return `**${idx + 1}. ${item.title_ko}** (\`${item.id}\` · ⭐ ${item.stars?.toLocaleString() || '—'})\n   • ${item.catchphrase || item.summary_ko?.split('\n')[0] || ''}\n   🔗 [GitHub 저장소](https://github.com/${item.id})`;
  }).join("\n\n");

  const text = `## 🧩 [AI위클리] 주간 Claude Code 트렌드 (${today})
> 이번 주 급상승 라이징 도구와 필수 클래식 프로젝트 인덱스

🔥 **이번 주 주목할 Rising 도구**
${formatList(rising)}

⭐ **검증된 Classic 레퍼런스**
${formatList(classic)}

---
👉 **[🌐 AI위클리 트렌드 보러가기](${SITE_URL})** · **[📈 스타보드 순위](${SITE_URL}starboard.html)**`;

  return {
    botName: "AI위클리 (AI Weekly)",
    botIconImage: "https://ldk-hub.github.io/ai-weekly/claude-avatar.svg",
    text
  };
}

async function main() {
  const mode = process.argv[2] || "news";
  console.log(`[Dooray Notification] 모드: ${mode}`);

  let payload;
  if (mode === "trends" || mode === "weekly") {
    payload = buildTrendsPayload();
  } else {
    payload = buildNewsPayload();
  }

  if (!payload) {
    console.warn("발송할 데이터 페이로드가 없습니다.");
    return;
  }

  await sendDoorayWebhook(payload);
}

main().catch(err => {
  console.error("Dooray 알림 실행 중 에러:", err);
});
