#!/usr/bin/env node
/**
 * 옵시디언 볼트(ai-weekly) 동기화 및 작업 이력 문서화 스크립트
 * 대상 경로: /Users/nhn/Documents/Obsidian Vault/ai-weekly
 * 작업일지 데이터 소스: data/worklogs/YYYY-MM-DD.md
 */

const fs = require("fs");
const path = require("path");

const WORKLOGS_DIR = path.join(__dirname, "..", "data", "worklogs");

function getVaultDir() {
  if (process.env.OBSIDIAN_VAULT_DIR) return process.env.OBSIDIAN_VAULT_DIR;
  const macPath = "/Users/nhn/Documents/Obsidian Vault/ai-weekly";
  if (fs.existsSync(path.dirname(macPath))) return macPath;
  const winPaths = [
    path.join(process.env.USERPROFILE || "C:\\Users\\ok601", "OneDrive", "문서", "Obsidian Vault", "ai-weekly"),
    path.join(process.env.USERPROFILE || "C:\\Users\\ok601", "Documents", "Obsidian Vault", "ai-weekly"),
    path.join(process.env.USERPROFILE || "C:\\Users\\ok601", "OneDrive", "바탕 화면", "ObsidianVault", "ai-weekly"),
  ];
  for (const wp of winPaths) {
    if (fs.existsSync(path.dirname(wp))) return wp;
  }
  return macPath;
}

const VAULT_DIR = getVaultDir();

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content.trim() + "\n", "utf8");
  console.log(`✓ Created: ${filePath}`);
}

function loadWorklogs(dir = WORKLOGS_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse()
    .map((f) => {
      const date = f.replace(/\.md$/, "");
      return {
        date,
        filename: `${date} 작업일지.md`,
        content: fs.readFileSync(path.join(dir, f), "utf8"),
      };
    });
}

// 1. 메인 개요 (README.md)
const README_CONTENT = `---
title: AI위클리 (AI Weekly) — 프로젝트 총괄 대시보드
date: 2026-09-14
type: project-hub
tags: [ai-weekly, dashboard, architecture, automated-pipeline]
status: active
author: ldk-hub <orm6711@gmail.com>
repository: https://github.com/ldk-hub/ai-weekly
---

# 🚀 AI위클리 (AI Weekly) 총괄 대시보드

> **AI 기술의 홍수 속에서 개발자에게 꼭 필요한 핵심 신호와 오픈소스 트렌드를 매일/매주 엄선하여 배포하는 자율 큐레이션 플랫폼**

---

## 📌 핵심 구성 요소

\`\`\`mermaid
graph TD
    subgraph "데이터 수집 (Phase 1)"
        A1[GeekNews RSS] --> S[Collector]
        A2[Hacker News Algolia] --> S
        A3[AI타임스 RSS] --> S
        A4[Reddit 5대 서브] --> S
        A5[GitHub Search API] --> S
        A6[Bluesky Search] --> S
        A7[HF Daily Papers] --> S
        A8[598개 OSS Repo Stars] --> S
        A9[3대 점유율·3대 리더보드] --> S
    end

    subgraph "정밀 큐레이션 & 품질 게이트 (Phase 2)"
        S --> C[cc-news Curator]
        S --> ST[cc-star Ledger]
        S --> TR[cc-trends Scoring]
        S --> BM[cc-benchmarks Staleness Gate]
        C --> V{품질 게이트 검증<br/>3불릿 / 5~10문장 / 메타일치}
        BM --> V
        V -- 통과 --> B[Vite Multi-Page Build]
    end

    subgraph "사이트 배포 & 커뮤니티 (Phase 3)"
        B --> D1[🔥 인기 트렌드 index.html]
        B --> D2[📰 AI 뉴스 news.html]
        B --> D3[📈 스타보드 starboard.html]
        B --> D4[📊 점유율·성능 benchmarks.html]
        B --> D5[💬 AI 라운지 lounge.html]
        D5 <--> G[GitHub Discussions / Giscus]
        B --> RSS[RSS & Sitemap 자동 생성]
    end
\`\`\`

---

## 🧭 문서 네비게이션

### ⚙️ 시스템 및 파이프라인 명세
- [[01-cc-news 데일리 뉴스 파이프라인|📰 cc-news 데일리 뉴스 파이프라인 명세]]
- [[02-cc-star 오픈소스 스타보드 파이프라인|📈 cc-star 오픈소스 스타보드 파이프라인 명세]]
- [[03-cc-trends 주간 트렌드 인덱싱|🔥 cc-trends 주간 트렌드 인덱싱 명세]]
- [[04-giscus 라운지 및 커뮤니티 연동|💬 giscus 라운지 및 커뮤니티 연동 명세]]
- [[05-benchmarks 점유율·성능 파이프라인|📊 benchmarks 점유율·성능 파이프라인 명세]]

### 📅 날짜별 작업 일지 (Work Logs)
- [[2026-11-26 작업일지|📅 2026-11-26 작업일지 (평일 cc-daily 완수: 스타보드 650개 100% 갱신, 데일리 뉴스 18건·소셜 피드 20건 큐레이션 및 검증 통과, RSS/OG/라운지·빌드·옵시디언 동기화)]]
- [[2026-11-23 작업일지|📅 2026-11-23 작업일지 (주간 cc-weekly 완수 및 5대 아키텍처 개선: Scrapling 우선 수집 전환, 스캐너 오탐 정밀화, 트렌드 rank_delta 주입, 작업일지 분리, Vite 청크 최적화)]]
- [[2026-11-19 작업일지|📅 2026-11-19 작업일지 (평일 cc-daily 완수: 스타보드 626개 100% 갱신, 데일리 뉴스 18건·소셜 피드 20건 큐레이션 및 검증 통과, RSS/OG/라운지·빌드·옵시디언 동기화)]]
- [[2026-11-18 작업일지|📅 2026-11-18 작업일지 (평일 cc-daily 완수: 스타보드 626개 100% 갱신, 데일리 뉴스 18건·소셜 피드 20건 큐레이션 및 검증 통과, RSS/OG/라운지·빌드·옵시디언 동기화)]]
- [[2026-11-17 작업일지|📅 2026-11-17 작업일지 (주간 cc-weekly 완수 및 파이프라인 6대 취약점 패치: 스타보드 622개 100%, 트렌드 33건·신규 13종 사전 확충, 벤치마크 검증, 뉴스 18건·소셜 19건 배포, 빌드·테스트 10/10 통과)]]
- [[2026-11-16 작업일지|📅 2026-11-16 작업일지 (주간 cc-weekly: 스타보드 622개 추적, 트렌드 33건, 벤치마크 검증, 뉴스 18건 배포)]]
- [[2026-11-13 작업일지|📅 2026-11-13 작업일지 (평일 cc-daily: 스타보드 618개 100% 갱신, 데일리 AI 뉴스 18건·소셜 피드 6건 큐레이션 및 검증, RSS/OG/라운지·옵시디언 동기화)]]
- [[2026-11-05 작업일지|📅 2026-11-05 작업일지 (주간 cc-weekly: 스타보드 610개 최신화, 트렌드 33건 큐레이션·보안 스캔, cc-benchmarks 동기화·게이트 검증, 데일리 뉴스 15건 큐레이션 배포 및 옵시디언 동기화)]]
- [[2026-11-02 작업일지|📅 2026-11-02 작업일지 (주간 cc-weekly: 스타보드 601개 최신화, 트렌드 35건 큐레이션·보안 스캔, cc-benchmarks 동기화·게이트 검증, 데일리 뉴스 16건 큐레이션 배포 및 옵시디언 동기화)]]
- [[2026-10-30 작업일지|📅 2026-10-30 작업일지 (평일 cc-daily: 스타보드 601개 100% 최신화, cc-benchmarks 가격/메타 검증, 17건 전 매체 균형 큐레이션 및 배포, 옵시디언 동기화)]]
- [[2026-10-29 작업일지|📅 2026-10-29 작업일지 (평일 cc-daily: 스타보드 601개 100% 최신화, 18건 전 매체 균형 큐레이션 및 배포, 옵시디언 동기화)]]
- [[2026-10-26 작업일지|📅 2026-10-26 작업일지 (주간 cc-weekly: 스타보드 598개 최신화, 트렌드 35건 큐레이션·보안 스캔, 데일리 뉴스 18건 큐레이션 및 옵시디언 동기화)]]
- [[2026-10-23 작업일지|📅 2026-10-23 작업일지 (평일 cc-daily: 벤치마크 검증 스크립트 정정, 데일리 뉴스 17건 큐레이션 및 배포, 옵시디언 동기화)]]
- [[2026-10-22 작업일지|📅 2026-10-22 작업일지 (신규 '점유율·성능' 탭 전면 구현, 2026-10 데이터 검수, 수치 신뢰성 보완 및 원격 푸시)]]
- [[2026-10-21 작업일지|📅 2026-10-21 작업일지 (평일 cc-daily: 스타보드 597개 최신화, 15건 전 매체 균형 큐레이션 및 배포)]]
- [[2026-10-12 작업일지|📅 2026-10-12 작업일지 (주간 cc-weekly: 스타보드 592개 최신화, 트렌드 33건 선별·순위 반영·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)]]
- [[2026-10-08 작업일지|📅 2026-10-08 작업일지 (평일 cc-daily: 스타보드 586개 갱신, 7개 매체 데일리 뉴스 18건 정밀 큐레이션 및 배포)]]
- [[2026-10-06 작업일지|📅 2026-10-06 작업일지 (주간 cc-weekly: 스타보드 584개 최신화, 트렌드 35건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)]]
- [[2026-10-04 작업일지|📅 2026-10-04 작업일지 (주간 cc-weekly: 스타보드 579개 최신화, 트렌드 31건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)]]
- [[2026-10-02 작업일지|📅 2026-10-02 작업일지 (주간 cc-weekly: 스타보드 576개 최신화, 트렌드 35건 선별, 데일리 뉴스 18건 큐레이션 배포)]]
- [[2026-09-16 작업일지|📅 2026-09-16 작업일지 (평일 cc-daily: 스타보드 569개 최신화, 데일리 AI 뉴스 16건 배포, 7대 매체 100% 수집)]]
- [[2026-09-15 작업일지|📅 2026-09-15 작업일지 (평일 cc-daily: 스타보드 569개 최신화, 데일리 AI 뉴스 16건 배포, 7대 매체 100% 수집)]]
- [[2026-09-14 작업일지|📅 2026-09-14 작업일지 (주간 cc-weekly: 스타보드 564개 100% 최신화, 트렌드 32건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)]]
- [[2026-09-10 작업일지|📅 2026-09-10 작업일지 (평일 cc-daily: 스타보드 561개 최신화, 데일리 AI 뉴스 15건 배포, 7대 매체 100% 수집)]]
- [[2026-09-09 작업일지|📅 2026-09-09 작업일지 (평일 cc-daily: 스타보드 561개 최신화, 데일리 AI 뉴스 15건 배포, 7대 매체 100% 수집)]]
- [[2026-09-08 작업일지|📅 2026-09-08 작업일지 (평일 cc-daily: 스타보드 561개 최신화, 데일리 AI 뉴스 15건 배포, 7대 매체 100% 수집)]]
- [[2026-09-07 작업일지|📅 2026-09-07 작업일지 (주간 cc-weekly: 스타보드 561개, 트렌드 35건, 뉴스 15건, 진입점 보안 스캔 완수)]]
- [[2026-09-03 작업일지|📅 2026-09-03 작업일지 (아카이브 날짜/버전 일관성 전수 정비 및 평일 데일리 파이프라인 완수)]]
- [[2026-08-31 작업일지|📅 2026-08-31 작업일지 (주간 cc-trends, cc-star 559개 갱신, cc-news 20건 배포)]]
- [[2026-08-27 작업일지|📅 2026-08-27 작업일지 (GLM-5.3-Flash 큐레이션, 474개 스타 갱신)]]
- [[2026-08-26 작업일지|📅 2026-08-26 작업일지 (AI 트렌드 요약 #키워드 규격 혁신, AI 라운지 신규 구축)]]
- [[2026-08-25 작업일지|📅 2026-08-25 작업일지 (주간 트렌드 큐레이션, 뉴스 파이프라인 최적화)]]
- [[2026-08-24 작업일지|📅 2026-08-24 작업일지 (아카이브 드롭다운, 갱신주기 표기 개선)]]
- [[2026-08-20 작업일지|📅 2026-08-20 작업일지 (Dooray 웹훅 알림 연동 및 스케줄링)]]

---

## 📊 플랫폼 주요 스펙 요약

| 항목 | 내용 |
|---|---|
| **배포 사이트** | Vite 기반 정적 웹 애플리케이션 (GitHub Pages) |
| **페이지 구성** | 6종 멀티페이지 (\`index.html\`, \`news.html\`, \`social.html\`, \`starboard.html\`, \`benchmarks.html\`, \`lounge.html\`) |
| **수집 매체** | 9대 플랫폼 (GeekNews, Hacker News, AI타임스, Reddit, Bluesky, X, Threads, Instagram, HF Daily Papers) |
| **스타보드 대상** | 626개 주요 AI/에이전트 오픈소스 리포지토리 전수 추적 |
| **신호 분류** | 8축 (\`model\`, \`product\`, \`devtool\`, \`oss\`, \`research\`, \`practice\`, \`policy\`, \`insight\`) |
| **커뮤니티 연동** | GitHub Discussions 기반 Giscus 실시간 댓글/반응 시스템 |
| **작성자 계정** | \`ldk-hub <orm6711@gmail.com>\` |
`;

// 2. 파이프라인 명세서들
const SPEC_NEWS = `---
title: cc-news 데일리 뉴스 파이프라인 명세
date: 2026-08-27
type: system-spec
tags: [ai-weekly, cc-news, pipeline, specification, hard-rules]
---

# 📰 cc-news 데일리 뉴스 파이프라인 명세

## 1. 개요
- **목적:** 지난 24시간 동안 발생한 AI 기술 신호를 주요 매체에서 수집하여, 원문 단순 스크랩이 아닌 **한국어로 깊이 있게 재작성된 고품질 요약과 해설**로 배포.
- **실행 주기:** 매일 오전 (09:00 KST 기준)

---

## 2. 고정 수집 매체 (Scrapling 1차 우선 + 기존 수집기 2차 폴백)

| 매체 | 수집 방식 | 특징 및 규칙 |
|---|---|---|
| **GeekNews** | Scrapling Raw → RSS 폴백 \`news.hada.io/rss/news\` | 국내 개발자 커뮤니티 핵심 이슈 |
| **Hacker News** | Scrapling Raw → Algolia API 폴백 (\`points >= 15\`) | 글로벌 기술 트렌드 및 토론 |
| **AI타임스** | Scrapling Raw → RSS 폴백 \`aitimes.com/rss/allArticle.xml\` | 국내외 산업 및 기업 심층 보도 |
| **Reddit** | Scrapling TLS → 5대 서브레딧 Top RSS 폴백 | \`r/LocalLLaMA\`, \`r/ClaudeAI\`, \`r/OpenAI\` 등 |
| **Bluesky** | Scrapling Raw → Search API (\`searchPosts\`) 폴백 | 링크 카드가 포함된 글만 채택하여 원문 발굴 창구로 활용 |
| **X** | Scrapling 스텔스 크롤러 1차 → Agent-Reach (\`twitter-cli\`) 폴백 | 시드 타임라인 및 링크 발굴 |
| **Threads** | Scrapling 스텔스 크롤러 (\`threads_profile.py\`) | 공식 AI 연구소 및 인플루언서 포스트 |
| **Instagram** | Scrapling 스텔스 크롤러 1차 → \`ego-browser\` 세션 폴백 | AI 인플루언서 릴스·카드뉴스 캡션 수집 |
| **HF Daily Papers** | Scrapling Raw → Hugging Face API (최대 3일 주말 폴백) | 연구 논문 전용 (21일 이내 원문만 허용) |

---

## 3. 기술 신호 분류

1. \`model\`: 새 모델·버전 출시·프리뷰·벤치마크 (빅테크/오픈소스)
2. \`product\`: 제품 신기능
3. \`devtool\`: 개발자 도구·코딩 에이전트·MCP·CLI
4. \`oss\`: 개인·소규모 개발자의 오픈소스·라이브러리·실험 도구
5. \`research\`: 논문·연구·새 기법
6. \`practice\`: AI 실제 활용 사례·워크플로우 팁
7. \`policy\`: 기술 영향이 큰 정책·규제·인프라
8. \`insight\`: 소셜 인사이트·실무 활용 팁·모델 체감 리뷰

---

## 4. 엄격한 품질 게이트 (Hard Rules)

> [!IMPORTANT]
> 아래 조건 중 하나라도 위반 시 \`curate_news.js --validate\` 게이트에서 빌드가 즉시 차단됩니다.

- **3불릿 요약 (\`summary_ko\`):** 정확히 3개 불릿(\`• **키워드**: \` 시작, 줄바꿈, 각 15자 이상).
  1. 무엇이 일어났는가
  2. 기술적으로 무엇이 새로운가 (수치, 벤치마크, 아키텍처)
  3. 개발자에게 왜 중요한가
- **본문 해설 (\`body_ko\`):** 마침표 기준 **정확히 5~10문장** 한국어 심층 해설.
- **메타데이터 무결성:** \`id\`, \`url\`, \`publish_date\`, \`author_profile\`은 수집 후보 파일의 값과 100% 일치해야 함.
- **최상위 AI 트렌드 요약 (\`summary\`):**
  - 단순 건수 나열 금지.
  - 구조: \`🔥 오늘의 핵심 이슈: #[키워드1] #[키워드2] #[키워드3] — [전체 기술 흐름 한줄 해설].\` (불필요한 사족 크레딧 문구 미포함)
- **배제 대상:** 주식/투자/펀딩 중심 기사, 24시간 창 밖 과거 기사, 최근 7일 내 중복 배포 URL.
`;

const SPEC_STAR = `---
title: cc-star 오픈소스 스타보드 파이프라인 명세
date: 2026-08-27
type: system-spec
tags: [ai-weekly, cc-star, starboard, ledger, github-stars]
---

# 📈 cc-star 오픈소스 스타보드 파이프라인 명세

## 1. 개요
- **목적:** AI/에이전트/코딩도구 생태계의 주요 오픈소스 리포지토리(626개+)의 일일 스타(Star) 증감 추이를 정확히 기록하고 모멘텀을 시각화.
- **실행 스크립트:** \`node scripts/stars/collect-stars.js\`

---

## 2. 데이터 원장 (Ledger) 구조

- \`data/stars/stars_ledger.json\`: 날짜별 각 리포지토리의 누적 스타수 기록
- \`data/stars/stars_meta.json\`: 리포지토리 설명, 토픽, 생성일, 최종 커밋일 메타데이터
- \`site/public/data/stars_*.json\`: 프론트엔드 실시간 서빙용 데이터 동기화

---

## 3. 랭킹 및 분류 알고리즘

- **Heavyweight (클래식 강자):** 누적 스타 수 상위의 안정적인 핵심 프레임워크
- **Rising Star (급상승 유망주):** 최근 7일/30일 스타 성장률 및 일일 평균 스타 획득량(\`stars_per_day\`) 기준 정렬
- **카테고리 분류:** Agent, Skill, Harness, MCP, Framework 등
`;

const SPEC_TRENDS = `---
title: cc-trends 주간 트렌드 인덱싱 명세
date: 2026-08-27
type: system-spec
tags: [ai-weekly, cc-trends, weekly-curation, cross-indexing]
---

# 🔥 cc-trends 주간 트렌드 인덱싱 명세

## 1. 개요
- **목적:** 주간 단위로 가장 주목받은 AI 오픈소스 프로젝트를 선별하고, 커뮤니티(Hacker News, Reddit, X, Threads, Instagram 등)의 교차 언급을 인덱싱하여 다각도로 분석.
- **산출물:** \`site/public/data/latest.json\`, \`data/archive/YYYY-MM-DD.json\`

---

## 2. 큐레이션 기준
- 단순 스타 순위가 아닌 **실제 개발자 커뮤니티의 실사용 반응 및 교차 바이럴 지수** 반영
- 직전 주 스냅샷과 자동 비교하여 \`rank\`, \`prev_rank\`, \`is_new\`, \`rank_delta\` 메타데이터 자동 주입
- 프로젝트별 한 줄 캐치프레이즈, 3대 핵심 기능, 한국어 심층 소개 제공
`;

const SPEC_LOUNGE = `---
title: giscus 라운지 및 커뮤니티 연동 명세
date: 2026-08-27
type: system-spec
tags: [ai-weekly, lounge, giscus, github-discussions, community]
---

# 💬 giscus 라운지 및 커뮤니티 연동 명세

## 1. 개요
- **목적:** 사이트 방문자 및 AI 개발자들이 자유롭게 대화를 나누고, 뉴스 기사별로 실시간 피드백을 남길 수 있는 커뮤니티 환경 제공.
- **페이지:** \`site/lounge.html\`

---

## 2. GitHub Discussions & Giscus 아키텍처

- **백엔드:** GitHub Discussions (\`ldk-hub/ai-weekly\`)
- **인터페이스:** Giscus (\`https://giscus.app/client.js\`)
- **설정값 (\`site/src/state.js\`):**
  - \`repo\`: \`"ldk-hub/ai-weekly"\`
  - \`repoId\`: \`"R_kgDOTXrViw"\`
  - \`loungeCategory\`: \`"General"\`
  - \`loungeCategoryId\`: \`"DIC_kwDOTXrVi84DENxe"\`
  - \`newsCategory\`: \`"General"\`
  - \`newsCategoryId\`: \`"DIC_kwDOTXrVi84DENxe"\`

---

## 3. 주요 기능
1. **자유 대화 스레드:** 라운지 메인에서 실시간 댓글 및 이모지 반응 작성
2. **뉴스 항목별 댓글:** 뉴스 카드 하단의 '댓글' 버튼 클릭 시 온디맨드 Giscus iframe 동적 마운트 (초기 로딩 최적화)
3. **다크/라이트 테마 자동 동기화:** 사이트 테마 변경 시 \`postMessage\`를 통해 Giscus iframe 테마 실시간 전환
`;

const SPEC_BENCHMARKS = `---
title: benchmarks 점유율·성능 파이프라인 명세
date: 2026-10-26
type: system-spec
tags: [ai-weekly, benchmarks, frontier-models, market-share, pipeline, staleness-gate, multi-source]
---

# 📊 benchmarks — AI 챗봇 점유율 및 프론티어 모델 성능 파이프라인

## 1. 개요 및 목적
주요 AI 챗봇 서비스의 다중 출처(3곳) 웹 방문·리퍼럴·개발자 API 점유율과 최신 프론티어 LLM의 실제 코딩/선호도 3대 공신 리더보드(LMArena, Artificial Analysis, LiveBench)를 종합하여, 개발자와 엔지니어에게 편향 없는 정량적 AI 도입 기준을 제공한다.

## 2. 4대 핵심 집계 및 검증 원칙
1. **최신성 게이트 (Staleness Gate):**
   - 점유율 출처(Similarweb 45일, Trakkr·OpenRouter Rankings 21일) 및 성능 리더보드 출처(LMArena, Artificial Analysis, LiveBench 30일)의 최신성 검증.
   - 2026-02 이후 갱신이 중단된 과거 링크(\`swebench.com\` 등)는 원천 차단.
2. **다중 출처 3곳 앙상블 평균 (Multi-Source Ensemble Average):**
   - 점유율은 \`Similarweb\`(웹 방문) + \`Trakkr AI Index\`(리퍼럴) + \`OpenRouter Rankings\`(개발자 API) 3곳의 산술 평균으로 집계하고 합계 100.0% 정합성을 강제.
3. **3대 리더보드 필수 수록:**
   - \`LMArena\`(Arena Elo / Arena Coding Elo), \`Artificial Analysis\`(Quality Index), \`LiveBench\`(오염방지 점수) 및 100만 토큰당 가격(\`pricing_in_1m\`, \`pricing_out_1m\`) 누락 없는 모델만 수록.
4. **구버전(Legacy) 모델 배제 및 기업별 대표 모델 1개 원칙:**
   - Claude 3.5/3.7, GPT-4o, Llama 2/3, Gemini 1.5/2.5 등 구버전 배제.
   - 주요 AI 연구소(OpenAI, Anthropic, Google, DeepSeek, xAI, Meta 등)의 최고 순위 활성(Active) 플래그십 1개씩 선별.

## 3. 검증 및 자동 아카이빙
- \`npm run data:benchmarks\` (\`node scripts/benchmarks/curate-benchmarks.js\`):
  - 6대 출처 최신성, 점유율 3곳 평균(100%), 모델 메타데이터 전수 검증
  - 검증 통과 시 \`updated_at\` 갱신 및 \`data/archive/benchmarks_YYYY-MM-DD.json\`, \`site/public/data/archive/\` 양쪽 자동 아카이빙 및 \`benchmarks_index.json\` 갱신
`;

function main() {
  console.log("==========================================");
  console.log(`Obsidian Vault 동기화 시작: ${VAULT_DIR}`);
  console.log("==========================================");

  // 1. README.md
  writeFile(path.join(VAULT_DIR, "README.md"), README_CONTENT);
  writeFile(path.join(VAULT_DIR, "AI위클리 개요 및 시스템 대시보드.md"), README_CONTENT);

  // 2. 시스템 및 파이프라인 명세
  const specDir = path.join(VAULT_DIR, "01. 시스템 아키텍처 및 파이프라인");
  writeFile(path.join(specDir, "01-cc-news 데일리 뉴스 파이프라인.md"), SPEC_NEWS);
  writeFile(path.join(specDir, "02-cc-star 오픈소스 스타보드 파이프라인.md"), SPEC_STAR);
  writeFile(path.join(specDir, "03-cc-trends 주간 트렌드 인덱싱.md"), SPEC_TRENDS);
  writeFile(path.join(specDir, "04-giscus 라운지 및 커뮤니티 연동.md"), SPEC_LOUNGE);
  writeFile(path.join(specDir, "05-benchmarks 점유율·성능 파이프라인.md"), SPEC_BENCHMARKS);

  // 3. 작업 일지 (data/worklogs/YYYY-MM-DD.md 디렉터리 로드)
  const logsDir = path.join(VAULT_DIR, "02. 작업 일지 (Work Logs)");
  const logs = loadWorklogs();
  for (const log of logs) {
    writeFile(path.join(logsDir, log.filename), log.content);
  }

  console.log("\n==========================================");
  console.log(`✅ 옵시디언 볼트 동기화가 성공적으로 완료되었습니다! (작업일지 ${logs.length}건)`);
  console.log("==========================================");
}

if (require.main === module) {
  main();
}

module.exports = { loadWorklogs, WORKLOGS_DIR };
