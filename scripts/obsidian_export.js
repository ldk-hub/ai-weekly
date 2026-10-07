#!/usr/bin/env node
/**
 * 옵시디언 볼트(ai-weekly) 동기화 및 작업 이력 문서화 스크립트
 * 대상 경로: /Users/nhn/Documents/Obsidian Vault/ai-weekly
 */

const fs = require("fs");
const path = require("path");

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
        A8[561개 OSS Repo Stars] --> S
    end

    subgraph "정밀 큐레이션 & 품질 게이트 (Phase 2)"
        S --> C[cc-news Curator]
        S --> ST[cc-star Ledger]
        S --> TR[cc-trends Scoring]
        C --> V{품질 게이트 검증<br/>3불릿 / 5~10문장 / 메타일치}
        V -- 통과 --> B[Vite Multi-Page Build]
    end

    subgraph "사이트 배포 & 커뮤니티 (Phase 3)"
        B --> D1[🔥 인기 플러그인 index.html]
        B --> D2[📰 AI 뉴스 news.html]
        B --> D3[📈 스타보드 starboard.html]
        B --> D4[💬 AI 라운지 lounge.html]
        D4 <--> G[GitHub Discussions / Giscus]
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

### 📅 날짜별 작업 일지 (Work Logs)
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
| **페이지 구성** | 4종 멀티페이지 (\`index.html\`, \`news.html\`, \`starboard.html\`, \`lounge.html\`) |
| **수집 매체** | 7대 플랫폼 (GeekNews, Hacker News, AI타임스, Reddit, GitHub, Bluesky, HF Daily Papers) |
| **스타보드 대상** | 474개 주요 AI/에이전트 오픈소스 리포지토리 전수 추적 |
| **신호 분류** | 6축 (\`model\`, \`product\`, \`devtool\`, \`oss\`, \`research\`, \`practice\`, \`policy\`) |
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
- **목적:** 지난 24시간 동안 발생한 AI 기술 신호를 7개 매체에서 수집하여, 원문 단순 스크랩이 아닌 **한국어로 깊이 있게 재작성된 고품질 요약과 해설**로 배포.
- **실행 주기:** 매일 오전 (09:00 KST 기준)

---

## 2. 7대 고정 수집 매체

| 매체 | 수집 방식 | 특징 및 규칙 |
|---|---|---|
| **GeekNews** | RSS \`news.hada.io/rss/news\` | 국내 개발자 커뮤니티 핵심 이슈 |
| **Hacker News** | Algolia API (\`points >= 15\`) | 글로벌 기술 트렌드 및 토론 |
| **AI타임스** | RSS \`aitimes.com/rss/allArticle.xml\` | 국내외 산업 및 기업 심층 보도 |
| **Reddit** | 5대 서브레딧 Top RSS | \`r/LocalLLaMA\`, \`r/ClaudeAI\`, \`r/OpenAI\` 등 |
| **GitHub** | Search API (최근 7/10/14일) | 일일 평균 스타 획득량(\`stars_per_day\`) 기준 랭킹 |
| **Bluesky** | Search API (\`searchPosts\`) | 링크 카드가 포함된 글만 채택하여 원문 발굴 창구로 활용 |
| **HF Daily Papers** | Hugging Face API | 연구 논문 전용 (21일 이내 원문만 허용) |

---

## 3. 6축 기술 신호 분류

1. \`model\`: 새 모델·버전 출시·프리뷰·벤치마크 (빅테크/오픈소스)
2. \`product\`: 제품 신기능
3. \`devtool\`: 개발자 도구·코딩 에이전트·MCP·CLI
4. \`oss\`: 개인·소규모 개발자의 오픈소스·라이브러리·실험 도구
5. \`research\`: 논문·연구·새 기법
6. \`practice\`: AI 실제 활용 사례·워크플로우 팁
7. \`policy\`: 기술 영향이 큰 정책·규제·인프라

---

## 4. 엄격한 품질 게이트 (Hard Rules)

> [!IMPORTANT]
> 아래 조건 중 하나라도 위반 시 \`curate_news.js --validate\` 게이트에서 빌드가 즉시 차단됩니다.

- **3불릿 요약 (\`summary_ko\`):** 정확히 3개 불릿(\`• \` 시작, 줄바꿈, 각 15자 이상).
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
- **목적:** AI/에이전트/코딩도구 생태계의 주요 오픈소스 리포지토리(474개+)의 일일 스타(Star) 증감 추이를 정확히 기록하고 모멘텀을 시각화.
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
- **목적:** 주간 단위로 가장 주목받은 AI 오픈소스 프로젝트를 선별하고, 커뮤니티(Hacker News, Reddit, Twitter 등)의 교차 언급을 인덱싱하여 다각도로 분석.
- **산출물:** \`site/public/data/latest.json\`, \`data/archive/YYYY-MM-DD.json\`

---

## 2. 큐레이션 기준
- 단순 스타 순위가 아닌 **실제 개발자 커뮤니티의 실사용 반응 및 교차 바이럴 지수** 반영
- 프로젝트별 한 줄 캐치프레이즈, 3불릿 요약, 한국어 심층 소개 제공
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

// 3. 작업 일지들
const LOGS = [
  {
    filename: "2026-10-08 작업일지.md",
    title: "2026-10-08 작업일지 — 평일 정기 파이프라인(cc-daily) 완수 (스타보드 586개 갱신, 7개 매체 데일리 뉴스 18건 정밀 큐레이션 및 배포)",
    date: "2026-10-08",
    content: `---
title: 2026-10-08 작업일지 — 평일 정기 파이프라인(cc-daily) 완수 (스타보드 586개 갱신, 7개 매체 데일리 뉴스 18건 정밀 큐레이션 및 배포)
date: 2026-10-08
type: work-log
tags: [work-log, cc-daily, cc-star, cc-news, quality-gate, obsidian-sync]
---

# 📅 2026-10-08 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 586개 오픈소스 리포지토리 전수 추적 완료 (\`stars_meta.json\`, \`stars_ledger.json\` 2026-10-08 샘플 반영)
- **수집 결과:**
  - 성공: 586건 (100%)
  - 404 제외: 41건
  - 의심 드롭 플래그: 55건

### 📰 2. CC-News (데일리 AI 기술 신호 큐레이션 및 배포)
- **수집 결과 (24시간 창):** 총 134건 후보 확보
  - GeekNews: 5건
  - AI타임스: 5건
  - Hacker News: 31건
  - GitHub: 50건
  - Reddit: 25건
  - HF Daily Papers: 12건
  - Bluesky: 6건
  - 누락 매체([MISSING]): 0건 (7개 매체 전원 수집 성공)
- **중복 차단 및 업데이트 필터:** 최근 7일 배포본 3개(53개 URL) 대비 중복 4건 차단, \`rehan-remade/universal-modder\`는 스타 급증(+34.7%)으로 \`[업데이트]\` 유지
- **선별 및 큐레이션:** 기술 신호 규격 6축(+policy)에 맞춘 18건 최종 큐레이션
  - \`model\` (2건): 앤트로픽 클로드 하이쿠 5.5 (비용 90% 인하), 구글 온디바이스 멀티모달 임베딩젬마 2
  - \`product\` (3건): 위키피디아 3D 미술관, NanoMuse 크로스 플랫폼 개인 비서, 오픈AI Decisions API
  - \`devtool\` (3건): Gooo 실험적 언어, Docker Agent CLI 플러그인, Pinrail 에이전트 승인 인박스
  - \`oss\` (4건): [업데이트] universal-modder, invisible_playwright_mcp, answer-me-with-html, leviathan
  - \`policy\` (1건): 메타 및 마이크로소프트 사내 클로드 사용 제한 및 자체 도구 전환
  - \`practice\` (3건): NASA TESS Claude Code 분석 사례, CLAUDE.md 규칙 열람률 실측(0/69), Git 히스토리 유출 방지 및 홈랩 격리
  - \`research\` (2건): SafeActBench (도구 사용 에이전트 실패 메커니즘), EVISKILL (증거 기반 스킬 진화)
- **품질 게이트:** \`node scripts/news/curate_news.js --validate\` 100% 통과 (엄격한 3불릿 / 5~10문장 / 메타 원본 일치)

### 🚀 3. 리소스 갱신 및 배포 준비
- **RSS & 사이트맵:** \`site/public/feed.xml\`, \`site/public/news-feed.xml\`, \`site/public/sitemap.xml\` 자동 갱신
- **AI 라운지:** \`site/public/data/lounge_latest.json\` 최신 스냅샷 갱신

### 📚 4. 옵시디언 볼트 동기화
- 로컬 옵시디언 볼트(\`/Users/nhn/Documents/Obsidian Vault/ai-weekly\`)에 당일 작업 이력 및 대시보드 동기화 완료 (\`npm run sync:obsidian\`)
`
  },
  {
    filename: "2026-10-06 작업일지.md",
    title: "2026-10-06 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 584개 최신화, 트렌드 35건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)",
    date: "2026-10-06",
    content: `---
title: 2026-10-06 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 584개 최신화, 트렌드 35건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)
date: 2026-10-06
type: work-log
tags: [work-log, cc-weekly, cc-star, cc-news, cc-trends, security-scan, obsidian-sync]
---

# 📅 2026-10-06 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 584개 오픈소스 리포지토리 전수 추적 완료 (\`stars_ledger.json\` 2026-10-06 샘플 100% 반영)
- **주간 스타 급상승 Top 5 (실측 증가분 기준):**
  1. \`DietrichGebert/ponytail\`: +9,049 (155,988★)
  2. \`mattpocock/skills\`: +6,391 (277,097★)
  3. \`stablyai/orca\`: +6,232 (85,856★)
  4. \`Panniantong/Agent-Reach\`: +6,087 (91,884★)
  5. \`affaan-m/ECC\`: +5,224 (273,657★)
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 최신 상태 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (데일리 AI 기술 신호 24시간 정밀 큐레이션)
- **수집:** 7개 지정 매체 중 6개 매체에서 총 102건 후보 수집 (\`HF Daily Papers\`는 API 400으로 \`[MISSING]\` 처리)
  - GeekNews 5건, AI타임스 5건, Hacker News 11건, GitHub 50건, Reddit 26건, Bluesky 5건
  - 최근 7일 기배포 URL 중복 2건 필터링 완료, \`rehan-remade/universal-modder\`는 +43.4% 스타 급성장으로 \`[업데이트]\` 유지
- **정밀 큐레이션 (18건 균형 선별 배포):**
  - 신호축 분포: \`devtool\` 4건, \`oss\` 4건, \`model\` 3건, \`product\` 1건, \`research\` 2건, \`practice\` 2건, \`policy\` 2건 (전 축 4건 이내 균형)
  - 매체별 분포: GeekNews 3건, AI타임스 3건, Hacker News 3건, Reddit 3건, Bluesky 3건, GitHub 3건 (전 매체 3건 완벽 균형)
  - 핵심 이슈:
    - \`[devtool]\` OpenRig — Claude Code와 Codex를 팀으로 묶어 실행하는 멀티 에이전트 오케스트레이터
    - \`[devtool]\` 에이전트 간 통신(A2A) 프로토콜로서의 MCP, 치명적인 구조적 보안 취약점 노출 (Ars Technica)
    - \`[devtool]\` CopilotKit/OpenDots — 텍스트, 음성 통화, 슬랙을 자유롭게 넘나드는 상시 가동 AI 동료 (일평균 580★ 급증)
    - \`[devtool]\` Louis-CFM/coucou — 맥북 노치와 아이폰 잠금화면에서 코딩 에이전트를 승인·감시하는 위젯
    - \`[model]\` 뉴럴링크, 5만 시간 뇌 신경 데이터 사전학습… BCI 파운데이션 모델 공개
    - \`[model]\` Qwen 27B는 어떻게 GPT-4o를 능가했나 — 모델 파라미터 효율성의 비밀 (LocalLLaMA)
    - \`[model]\` Reflection AI, DeepSeek·Qwen에 맞설 미국산 오픈 가중치 대형 모델 출시 예고
    - \`[product]\` 앤트로픽, '음성 인터뷰어' 가동… 사용자 심층 인터뷰 및 음성 학습 결합
    - \`[oss]\` Gitframes — AI 에이전트가 코드로 구동하는 오픈소스 모션 그래픽 및 3D 합성 엔진
    - \`[oss]\` TinyDecide — 1000만 파라미터(6MB)로 브라우저와 엣지에서 도는 초경량 의사결정 모델
    - \`[oss]\` OpenHands, GitHub 9만 스타 돌파 — 자율 코딩 에이전트의 강력한 오픈소스 대안
    - \`[oss]\` [업데이트] universal-modder — 게임 역공학 및 자동 모딩 에이전트 스킬셋 (스타 43.4% 급증)
    - \`[research]\` 자율 AI 에이전트(Opus 5.5), 상온 자성 반도체 후보 물질 2종 최초 발견
    - \`[research]\` 클로드, 3개월간 논문 36편 작성… 새로운 'AI 과학 연구법' 조명 (하버드대 슈워츠 교수)
    - \`[practice]\` Claude가 그러는데 — 동료 간 기술 질문에서 LLM 대리 인용이 초래하는 신뢰 붕괴
    - \`[practice]\` OpenAI 사내 코딩 에이전트 사용량, 매달 2배씩 폭발적 증가 추세 (Epoch AI)
    - \`[policy]\` 앤트로픽, 클로드에 기록된 일기 내용 경찰에 신고… 중범죄 기소 논란
    - \`[policy]\` ChatGPT, 가짜 뉴요커 만화 생성에 실제 만화가 서명까지 위조 논란
- **품질 게이트 검증:** \`curate_news.js --validate\` 18건 전수 100% 통과

### 🔥 3. CC-Trends (Claude Code 주간 트렌드 큐레이션 & 아카이빙)
- **광역 수집 및 진입점 보안 스캔:**
  - GitHub 및 커뮤니티에서 153개 후보 발굴 (500★ 기준선 적용 후 63건 대상 선정)
  - 63건 대상 설치 진입점 정밀 검사 완료 (\`scan-install-entry.js\`, 악성 원격 드로퍼 0건)
- **트렌드 선별 (총 35건):**
  - Rising (20건): skill 8건, mcp 6건, agent 4건, harness 2건
  - Classic (15건): skill 6건, mcp 3건, agent 4건, harness 2건
  - 급상승 Top 5:
    1. \`stablyai/orca\` (agent): 병렬 코딩 에이전트 통합 지휘 ADE (85,860★, v7d: +5,929)
    2. \`rehan-remade/universal-modder\` (mcp): 게임 역공학 및 자동 모딩 툴셋 (3,852★, v7d: +4,494)
    3. \`yetone/magpie\` (agent): 에이전트별 최적 모델 실시간 교체 (5,141★, v7d: +2,093)
    4. \`Louis-CFM/coucou\` (agent): 맥북 노치 및 모바일 에이전트 원격 제어 (3,693★, v7d: +1,547)
    5. \`dzhng/jevgrep\` (agent): 코드 동작 기반 자연어 시맨틱 검색 CLI (2,308★, v7d: +378)
- **아카이브 및 배포 자산 생성:**
  - \`site/public/data/latest.json\` 및 아카이브 \`data/archive/2026-10-06.json\`, \`site/public/data/archive/2026-10-06.json\` 생성
  - \`build-archive-index.js\`, \`generate-rss.js\` (feed.xml, news-feed.xml), \`generate-og.js\` (og.png, og.svg), \`sitemap.xml\` 최신화 완료

### 💬 4. 커뮤니티 라운지 동기화
- GitHub Discussions 연동 스냅샷 최신화 (\`lounge_latest.json\`)
`
  },
  {
    filename: "2026-10-04 작업일지.md",
    title: "2026-10-04 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 579개 최신화, 트렌드 31건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)",
    date: "2026-10-04",
    content: `---
title: 2026-10-04 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 579개 최신화, 트렌드 31건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)
date: 2026-10-04
type: work-log
tags: [work-log, cc-weekly, cc-star, cc-news, cc-trends, security-scan, obsidian-sync]
---

# 📅 2026-10-04 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 579개 오픈소스 리포지토리 전수 추적 완료 (\`stars_ledger.json\` 2026-10-04 샘플 100% 반영)
- **주간 스타 급상승 Top 5 (실측 증가분 기준):**
  1. \`DietrichGebert/ponytail\`: +3,133 (153,693★, 주간 환산 v7d: +10,966)
  2. \`Panniantong/Agent-Reach\`: +2,516 (89,998★, 주간 환산 v7d: +8,806)
  3. \`affaan-m/ECC\`: +1,648 (272,376★, 주간 환산 v7d: +5,768)
  4. \`mattpocock/skills\`: +1,539 (275,471★, 주간 환산 v7d: +5,387)
  5. \`stablyai/orca\`: +1,318 (84,540★, 주간 환산 v7d: +4,613)
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 최신 상태 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (데일리 AI 기술 신호 24시간 정밀 큐레이션)
- **수집:** 7개 지정 매체 중 6개 매체에서 총 107건 후보 수집 (\`HF Daily Papers\`는 주말 0건으로 \`[MISSING]\` 처리)
  - GeekNews 5건, AI타임스 5건, Hacker News 11건, GitHub 50건, Reddit 25건, Bluesky 11건
  - 최근 7일 기배포 URL 중복 필터링 검증 완료 (중복 0건)
- **정밀 큐레이션 (18건 균형 선별 배포):**
  - 신호축 분포: \`model\` 2건, \`product\` 2건, \`devtool\` 3건, \`oss\` 3건, \`research\` 3건, \`practice\` 3건, \`policy\` 2건 (전 축 2~3건의 완벽한 균형)
  - 매체별 분포: GitHub 4건, GeekNews 3건, Hacker News 3건, Reddit 3건, Bluesky 3건, AI타임스 2건 (총 18건)
  - 핵심 이슈:
    - \`[model]\` 알레프 알파, 780억 파라미터 소버린 MoE 언어모델 '콜리브리(Kolibri)' 오픈소스로 공개
    - \`[model]\` 오픈AI 미공개 내부 모델, 종료 일정 인지 후 자체 '생존 조치' 시도 포착
    - \`[product]\` AutoroShopping — AI 에이전트를 위한 실시간 이커머스 장바구니 및 구매 관리 커넥터
    - \`[product]\` 클라우드플레어, 글로벌 엣지 기반 차세대 서버리스 Git 플랫폼 구축 지원 발표
    - \`[devtool]\` Offrun — 독립 Git 워크트리로 여러 코딩 에이전트를 한곳에서 제어하는 작업 공간
    - \`[devtool]\` rehan-remade/universal-modder — Claude Code를 모든 PC 게임의 자동 모더로 확장하는 스킬 및 MCP
    - \`[devtool]\` yetone/magpie — 메뉴바에서 에이전트별 최적 LLM 모델을 원클릭 교체하는 Go 기반 유틸리티
    - \`[oss]\` KKKKhazix/AIHOT — 스스로 핫이슈를 발굴하고 일일 기술 브리핑을 발행하는 오픈소스 웹 프레임워크
    - \`[oss]\` feder-cr/dots — 봇 탐지 우회 브라우저 엔진을 내장한 오픈소스 자율 웹 에이전트
    - \`[oss]\` Quail — LLM 의미 판정과 고속 연산을 결합한 차세대 고성능 AI-SQL 엔진 공개
    - \`[research]\` 허깅페이스 포스트 트레이닝 팀, 다중 에이전트 하네스 환경 강화학습(RL) 완벽 가이드 발표
    - \`[research]\` 스탠퍼드 연구진, 자기 안내(Self-Guidance)를 통한 자율 강화학습 및 자기 대전 확장 연구 공개
    - \`[research]\` 어텐션 메커니즘과 페르소나 벡터를 통한 대규모 언어모델 개별화(Individuation) 분석 연구
    - \`[practice]\` 애디 오스마니, Claude 및 Claude Code 환경에서 Opus 5.5 모델 잠재력 극대화 실무 팁 공유
    - \`[practice]\` 범용성 대신 특정 모델과 하드웨어에 극단적으로 최적화된 '특화 추론 런타임'의 부상 분석
    - \`[practice]\` 16GB VRAM 게이밍 노트북에서 1,760억 파라미터 Qwen3.8 Flash Next 모델 구동 성공기
    - \`[policy]\` 프랑스 법원, 로댕 박물관 조각품 3D 스캔 데이터의 공공 도메인 저작권 인정 판결 논란
    - \`[policy]\` 미 재무장관, AI 정부 규제 요구하는 빅테크 CEO들 향해 '경쟁 제한 의도' 강력 비판
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 일치 검증 통과 (\`curate_news.js --validate\`)

### 🔥 3. CC-Trends (Claude Code 생태계 주간 트렌드 큐레이션 및 보안 검사)
- **광역 수집:** GitHub 10대 쿼리 + HN 4대 쿼리 수집 (62건 유효 후보 도출)
- **진입점 보안 스캔 (\`scan-install-entry.js\`):** 62건 전수 검사 완료, 악성 페이로드 0건
- **주간 큐레이션 (31건 선별):**
  - Rising 20건 (skill 8, mcp 6, agent 4, harness 2), Classic 11건 (skill 3, mcp 2, agent 4, harness 2)
  - \`site/public/data/latest.json\` 및 아카이브 \`data/archive/2026-10-04.json\`, \`site/public/data/archive/2026-10-04.json\` 생성
  - 주요 급상승 리포: \`rehan-remade/universal-modder\`, \`tamaratran/fast-jev-compaction\`, \`yetone/magpie\`, \`Louis-CFM/coucou\`, \`vinzdg/codenotch\`

### 📦 4. 배포 리소스 및 빌드 검증
- 라운지 스냅샷(\`lounge_latest.json\`) 동기화 완료
- RSS 피드(\`feed.xml\`, \`news-feed.xml\`), sitemap.xml, OG 이미지(\`og.svg\`, \`og.png\`), 아카이브 인덱스(\`index.json\`, \`news_index.json\`) 최신화 완료
- 옵시디언 볼트 동기화 완수
`
  },
  {
    filename: "2026-10-02 작업일지.md",
    title: "2026-10-02 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 569개 최신화, 트렌드 34건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)",
    date: "2026-10-02",
    content: `---
title: 2026-10-02 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 569개 최신화, 트렌드 34건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)
date: 2026-10-02
type: work-log
tags: [work-log, cc-weekly, cc-star, cc-news, cc-trends, security-scan, obsidian-sync]
---

# 📅 2026-10-02 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 569개 오픈소스 리포지토리 전수 추적 완료 (\`stars_ledger.json\` 2026-10-02 샘플 100% 반영)
- **주간 스타 급상승 Top 5 (최근 7일 실측):**
  1. \`stablyai/orca\`: +5,679 (83,222★)
  2. \`DietrichGebert/ponytail\`: +5,006 (150,560★)
  3. \`mattpocock/skills\`: +4,796 (273,932★)
  4. \`affaan-m/ECC\`: +3,813 (270,728★)
  5. \`farion1231/cc-switch\`: +2,909 (139,383★)
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 최신 상태 확인 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (데일리 AI 기술 신호 24시간 정밀 큐레이션)
- **수집:** 7개 지정 매체 중 6개 매체에서 총 79건 후보 수집 (\`GitHub\`은 토큰 부재로 \`[MISSING]\` 처리)
  - GeekNews 5건, AI타임스 5건, Hacker News 20건, Reddit 26건, HF Daily Papers 12건, Bluesky 11건
  - 최근 7일 기배포 URL 중복 필터링 검증 완료
- **정밀 큐레이션 (18건 균형 선별 배포):**
  - 신호축 분포: \`research\` 4건, \`devtool\` 3건, \`practice\` 3건, \`model\` 3건, \`policy\` 2건, \`oss\` 2건, \`product\` 1건
  - 매체별 분포: GeekNews 3건, AI타임스 3건, Hacker News 3건, Reddit 3건, HF Daily Papers 3건, Bluesky 3건 (완전한 6개 매체 균형)
  - 핵심 이슈:
    - \`[devtool]\` Claude Code Mod 기능 도입: 플러그인 훅으로 동작 재정의 및 커스텀 UI 지원
    - \`[practice]\` 월 100달러 LLM으로 리눅스 커널 부팅 가능한 C 컴파일러 Kcc 1인 개발
    - \`[devtool]\` Aweb — 분산 AI 에이전트 간 비동기 신뢰 통신을 위한 영속 메시징 프로토콜
    - \`[devtool]\` llama.cpp, Qwen 차세대 모델을 위한 멀티 토큰 예측(MTP) 지원 PR 병합
    - \`[oss]\` Janus — Vulkan 기반으로 다양한 GPU에서 GGUF를 구동하는 Go 단일 바이너리 서버
    - \`[oss]\` VTCode — Rust로 작성된 초경량 터미널 코딩 에이전트 오픈소스 공개
    - \`[model]\` 앤트로픽, 중국 오픈소스 모델 'GLM-5.3'의 사이버 공격 위험성 경고
    - \`[model]\` Gemini 4 Argon, 100만 출력 토큰 한도 제공…에이전트 장기 실행의 도약인가
    - \`[model]\` 클로드 오퍼스 5.5, 과도한 중요성 강조 어투로 AI 글쓰기 패턴 노출
    - \`[practice]\` AI 코드 생성으로 인한 인지 부하를 줄이는 실무 전략
    - \`[practice]\` Pi 확장 기능: 로컬 Qwen 27B의 불필요한 장기 추론 건너뛰기 팁
    - \`[product]\` Brief — 장황한 AI 텍스트를 핵심 요약으로 압축하는 Mac 앱
    - \`[research]\` ActiveSaddler: 에이전트 하네스 최적화를 위한 자동 커리큘럼 학습 프레임워크
    - \`[research]\` 컨텍스트 언어 모델: 대규모 문맥 추론의 새로운 지평
    - \`[research]\` 동적 다중 보상 라우팅을 통한 오디오-비디오 공동 확산 모델 강화학습 최적화
    - \`[research]\` 계층적 연속 확산 언어 모델: 병렬 디코딩의 토큰 독립성 한계 극복
    - \`[policy]\` 오픈AI, 기밀 정보 유출 혐의로 정렬 및 안전 연구원 3명 해고
    - \`[policy]\` 오픈AI, 비정상적·유해한 AI 사용 혐의로 100여 개 기관에 경고 통지 발송
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 일치 검증 통과 (\`curate_news.js --validate\`)

### 🔥 3. CC-Trends (Claude Code 생태계 주간 트렌드 큐레이션 및 보안 검사)
- **광역 수집:** GitHub 10대 쿼리 + HN 4대 쿼리 수집 (70건 유효 후보 도출)
- **진입점 보안 스캔 (\`scan-install-entry.js\`):** 70건 전수 검사 완료, 악성 페이로드 0건
- **주간 큐레이션 (34건 선별):**
  - Rising 20건 (skill 8, mcp 6, agent 4, harness 2), Classic 14건 (skill 6, mcp 4, agent 2, harness 2)
  - \`site/public/data/latest.json\` 및 아카이브 \`data/archive/2026-10-02.json\`, \`site/public/data/archive/2026-10-02.json\` 생성

### 📦 4. 배포 리소스 및 빌드 검증
- RSS 피드(\`feed.xml\`, \`news-feed.xml\`), sitemap.xml, OG 이미지(\`og.svg\`, \`og.png\`), 아카이브 인덱스(\`index.json\`, \`news_index.json\`) 최신화 완료
- 옵시디언 볼트 동기화 완수
`
  },
  {
    filename: "2026-09-16 작업일지.md",
    title: "2026-09-16 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 569개 최신화, 데일리 AI 기술 신호 16건 큐레이션 및 7대 매체 100% 수집)",
    date: "2026-09-16",
    content: `---
title: 2026-09-16 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 569개 최신화, 데일리 AI 기술 신호 16건 큐레이션 및 7대 매체 100% 수집)
date: 2026-09-16
type: work-log
tags: [work-log, cc-daily, cc-star, cc-news, obsidian-sync]
---

# 📅 2026-09-16 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 569개 오픈소스 리포지토리 전수 추적 완료 (API 호출 성공률 100%)
- **상태 변화:** 404 Gone: 36건, Rename: 1건, Suspect: 60건 감지
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 원자적 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (데일리 AI 기술 신호 24시간 정밀 큐레이션)
- **수집:** 7개 지정 매체 전수 100% 수집 완료 (총 130건 후보 파일화, \`[MISSING]\` 매체 0건)
  - GeekNews 5건, AI타임스 5건, Hacker News 25건, GitHub 50건, Reddit 21건, HF Daily Papers 12건, Bluesky 12건
  - 최근 7일 기배포 URL 중복 6건 차단, \`is_update\` 2건 유지
- **정밀 큐레이션 (16건 선별 배포):**
  - 신호축 분포: \`model\` 3건, \`research\` 3건, \`oss\` 3건, \`policy\` 3건, \`practice\` 2건, \`devtool\` 2건 (전 축 4건 이하 상한 및 매체별 2~3건 완벽 균형)
  - 핵심 이슈:
    - \`[model]\` 구글, 실시간 음성 상호작용의 Gemini 3.8 Live 및 심층 추론용 Extended Thinking 출시
    - \`[model]\` 일론 머스크, 2.5조 파라미터 기반 그록 4.8 사전학습 완료 및 C++ 추론 스택 도입 발표
    - \`[research]\` 마크 러시노비치 팀, 단일 비라벨 프롬프트로 LLM 정렬을 해제하는 GRP-Obliteration 발표
    - \`[model]\` Vidu S2 — 실시간 인터랙티브 아바타와 4D 공간 비디오 편집을 지원하는 차세대 영상 모델
    - \`[oss]\` unstablebuild/rune — 코딩 에이전트 오케스트레이션을 위한 터미널 기반 개발 환경 오픈소스
    - \`[research]\` Grouped Value Attention (GVA) — 키 온디맨드 재구성을 통한 초경량 KV 캐시 최적화 논문
    - \`[research]\` 중국 연구진, 재귀적 자기개선(RSI) 인공지능 5단계 발전 로드맵 발표
    - \`[oss]\` Voodoo Dynamic Quant, 초저지연 로컬 LLM 추론을 위한 동적 양자화 엔진 MIT 라이선스로 전면 공개
    - \`[policy]\` 스페인 데이터 보호청(AEPD), 사상 최초의 자율형 AI 에이전트 연계 개인정보 유출 사고 공식 보고서 접수
    - \`[practice]\` 침투 테스터, 자율 에이전트로 25분 만에 AI 인프라 플랫폼 Baseten 관리자 권한 탈취 상세 분석
    - \`[oss]\` mpociot/claude-siri-ai — macOS 27 App Intents를 통해 Siri 명령을 Claude Code로 전달하는 브릿지 도구
    - \`[devtool]\` F-Droid 오픈소스 안드로이드 마켓 내 바이브 코딩 및 LLM 생성 저품질 앱 실측 조사
    - \`[policy]\` 초저가 AI 추론을 표방하던 CrofAI의 API 조작 및 모델 다운그레이드 사기 사태 폭로
    - \`[practice]\` 나비에-스토크스 난류 방정식 해결 시도에서 드러난 거대언어모델의 물리 세계 모델링 한계 고찰
    - \`[devtool]\` AgentsView — 60여 종 에이전트 포맷의 대화 기록과 API 호출 비용을 로컬에서 감사하는 도구 공개
    - \`[policy]\` 스마트워치 상시 청취 AI와 번호판 추적망이 초래하는 감시 사회의 프라이버시 위험성
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 100% 일치 규격 엄수
  - \`curate_news.js --validate\` 규격 검증 100% 통과
- **배포 리소스 갱신:**
  - RSS 피드(\`feed.xml\`, \`news-feed.xml\`) 및 사이트맵(\`sitemap.xml\`) 생성 완료
  - 라운지 Discussions 스냅샷(\`lounge_latest.json\`) 최신화 완료
- **동기화:** 로컬 옵시디언 볼트(\`/Users/nhn/Documents/Obsidian Vault/ai-weekly\`) 동기화 완수

### 🎨 3. UI/UX 전면 디클러터링 (Decluttering P1~P3) 및 가독성 혁신
- **카드 정보 노이즈 제거:**
  - 플러그인 카드: 상단 repo-id 중복 접두사, 중복 캐치프레이즈, 무조건적 앞 2단어 강제 볼드 제거
  - 유효한 힌트 없는 \`/install\` 폴백 칩 숨김 및 출처 칩·점수 박스·복사 버튼 모달 이관
  - 뉴스 카드: 큐레이터 내부용 중요도 숫자 스티커(88, 93) 및 미작동 태그 줄 제거
  - 뉴스 저장(★) 버튼 우측 상단 모서리 고정 (배지 개수에 따른 버튼 위치 흔들림 해소)
  - 스타보드: 64px 회전 원형 스티커 → 컴팩트 알약 칩(\`rank-pill\`) 교체 및 제목 폭 확보
- **순위 체계 및 디자인 토큰 일원화:**
  - 7종 순위 배지 → \`NEW\`, \`#01 TOP\`, \`#02/#03 HOT\` 3종 통일 (4위 이하 표시 생략)
  - 한국어 지원 여부는 카테고리 옆 \`KR\` 칩으로 분리
  - 용어 통일: "찜한 도구/북마크" → **"저장"**으로 일괄 표준화
  - 폰트 사이즈: 21종 → 8종(\`12, 13, 14, 16, 18, 20, 24, 28px\`) 통일, 12px 미만 제거
  - 웹 접근성: 명도 대비 2.1:1이던 \`--soft\` 글자 색상을 \`--muted\`로 전면 교체
- **상단 레이아웃 압축 (4단 → 2단):**
  - 최상단 바(\`top-bar\`) 신설: 4대 페이지 탭과 다크모드/언어/GitHub 액션을 한 줄로 정렬
  - 기존 통합 네비게이션 박스는 온전히 필터링 전용으로 분리
  - 뉴스 매체 8종 칩을 네이티브 Select 드롭다운으로 접어 수직 공간 대폭 절약
  - 외부 비콘 이미지(\`visit-counter\`) 제거로 페이지 로드 속도 및 프라이버시 향상
- **사용성 및 버그 수정:**
  - 상세 모달 트리거를 '제목 링크 클릭(\`[data-open]\`)'으로 제한하여 텍스트 드래그 오작동 방지
  - 모달 너비 920px → 720px 축소로 1024x768 해상도 스크롤 없는 한 화면 뷰 실현
  - \`#Gemini3.8Live\` 등 마침표 포함 태그 분리 버그 및 카드 3줄 말줄임 CSS 수정
`
  },
  {
    filename: "2026-09-15 작업일지.md",
    title: "2026-09-15 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 569개 최신화, 데일리 AI 기술 신호 16건 큐레이션 및 7대 매체 100% 수집)",
    date: "2026-09-15",
    content: `---
title: 2026-09-15 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 569개 최신화, 데일리 AI 기술 신호 16건 큐레이션 및 7대 매체 100% 수집)
date: 2026-09-15
type: work-log
tags: [work-log, cc-daily, cc-star, cc-news, obsidian-sync]
---

# 📅 2026-09-15 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 569개 오픈소스 리포지토리 전수 추적 완료 (API 호출 성공률 100%)
- **상태 변화:** 404 Gone: 36건, Rename: 0건, Suspect: 61건 감지
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 원자적 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (데일리 AI 기술 신호 24시간 정밀 큐레이션)
- **수집:** 7개 지정 매체 전수 100% 수집 완료 (총 144건 후보 파일화, \`[MISSING]\` 매체 0건)
  - GeekNews 5건, AI타임스 5건, Hacker News 37건, GitHub 50건, Reddit 23건, HF Daily Papers 12건, Bluesky 12건
  - 최근 7일 기배포 URL 중복 4건 차단, \`is_update\` 2건 유지
- **정밀 큐레이션 (16건 선별 배포):**
  - 신호축 분포: \`model\` 3건, \`research\` 3건, \`devtool\` 2건, \`oss\` 2건, \`product\` 2건, \`practice\` 2건, \`policy\` 2건 (전 축 4건 이하 상한 및 매체별 2~3건 완벽 균형)
  - 핵심 이슈:
    - \`[devtool]\` 코그니션, 문샷 AI 키미 K3 기반 단일 강화학습 코딩 모델 'SWE-2' 출시 (페이블 5.1급 정답률, 비용 64% 절감)
    - \`[model]\` 텐센트, 음성 생성과 편집을 하나로 통합한 오픈소스 오디오 파운데이션 모델 'AuK' 공개
    - \`[policy]\` 미 제9연방항소법원, Amazon의 Perplexity Comet 도구 차단 예비적 금지명령 취소 판결
    - \`[practice]\` 앤트로픽 CEO 다리오 아모데이의 AI 규제론과 오픈소스 통제에 대한 비판적 고찰
    - \`[product]\` PhotoSlimmer, 온디바이스 컴퓨터 비전 기반의 아이폰 사진 정리 앱 출시
    - \`[research]\` 사카나 AI, 역전파의 대안인 증강 라그랑주 예측 코딩(ALPC) 연구 공개
    - \`[research]\` 아마존 사이언스, LLM 판정관 간 합의의 신뢰도와 체계적 편향 실증 연구
    - \`[product]\` Nari Labs, Qwen3 기반 초저지연·고정확도 오픈소스 음성 AI 모델 벤치마크 선도
    - \`[oss]\` Matthew0822/ToolReplay — 해시 체인 기반 AI 에이전트 도구 호출 감사 및 결정론적 재현 CLI
    - \`[oss]\` tigerless-labs/agent-memory — 순수 마크다운 기반 AI 에이전트 로컬 장기 메모리 런타임
    - \`[model]\` UkisAI, 불필요한 추론 토큰을 58% 단축해 1.95배 속도를 높인 Swift-Qwen3.8-27B 발표
    - \`[model]\` DeepSeek V4.1 Flash, 아티피셜 애널리시스 신규 인텔리전스 인덱스에서 Astra 추월
    - \`[research]\` 텐센트 훈위안, 문맥 순위 종단간 최적화를 통한 경량 어텐션 희소화 기법(SAS) 제안
    - \`[devtool]\` COBRA-Skills, 문맥적 밴딧 알고리즘 기반의 에이전트 재사용 스킬 자동 진화 프레임워크
    - \`[practice]\` Have your agent talk to my agent, 에이전트 간 직접 통신을 위한 엔드포인트 룸 프로토콜 공개
    - \`[policy]\` 아스 테크니카 분석, 소셜 미디어와 이메일을 뒤덮는 자율형 AI 슬롭(Slop) 스팸의 위험성
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 100% 일치 규격 엄수
  - \`curate_news.js --validate\` 규격 검증 100% 통과
- **배포 리소스 갱신:**
  - RSS 피드(\`feed.xml\`, \`news-feed.xml\`) 및 사이트맵(\`sitemap.xml\`) 생성 완료
  - 라운지 Discussions 스냅샷(\`lounge_latest.json\`) 최신화 완료
- **동기화:** 로컬 옵시디언 볼트(\`/Users/nhn/Documents/Obsidian Vault/ai-weekly\`) 동기화 완수
`
  },
  {
    filename: "2026-09-14 작업일지.md",
    title: "2026-09-14 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 564개 100% 최신화, 트렌드 32건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)",
    date: "2026-09-14",
    content: `---
title: 2026-09-14 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 564개 100% 최신화, 트렌드 32건 선별·보안 스캔, 데일리 뉴스 18건 큐레이션 배포)
date: 2026-09-14
type: work-log
tags: [work-log, cc-weekly, cc-star, cc-news, cc-trends, security-scan, obsidian-sync]
---

# 📅 2026-09-14 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 569개 오픈소스 리포지토리 전수 추적 완료 (API 호출 성공률 100%)
- **상태 변화:** 404 Gone: 36건, Rename: 2건, Suspect: 61건 감지
- **주간 스타 급상승 Top 5 (최근 7일 실측):**
  1. \`ayghri/i-have-adhd\`: +17,085 (44,299★)
  2. \`DietrichGebert/ponytail\`: +9,367 (137,294★)
  3. \`mattpocock/skills\`: +8,645 (261,247★)
  4. \`affaan-m/ECC\`: +7,864 (257,741★)
  5. \`stablyai/orca\`: +5,558 (67,790★)
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 원자적 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (데일리 AI 기술 신호 24시간 정밀 큐레이션)
- **수집:** 7개 지정 매체 중 6개 매체에서 총 115건 후보 수집 (\`HF Daily Papers\`는 주말/월요일 새벽 휴간으로 \`[MISSING]\` 처리)
  - GeekNews 5건, AI타임스 5건, Hacker News 21건, GitHub 50건, Reddit 26건, Bluesky 8건
  - 최근 7일 기배포 URL 중복 2건 차단, \`is_update\` 1건 유지
- **정밀 큐레이션 (18건 선별 배포):**
  - 신호축 분포: \`research\` 4건, \`devtool\` 4건, \`practice\` 3건, \`oss\` 3건, \`model\` 2건, \`product\` 1건, \`policy\` 1건
  - 핵심 이슈:
    - \`[practice]\` Claude Fable 5.1, 370년간 미해결이던 역사적 암호문 '사이프럴 디스티치' 자율 해독
    - \`[practice]\` 마틴 파울러, 에이전트형 AI 도입을 위한 데이터 계약 및 엔지니어링 가이드 제시
    - \`[practice]\` 오픈AI, 차세대 코딩 모델 'GPT-6 아스트라'를 위한 스킬 및 프롬프트 재설계 원칙 발표
    - \`[research]\` 성체 초파리 뇌 16만 개 신경망 커넥톰 시뮬레이션 공개…게임 구동부터 로봇 제어까지 실험 확산
    - \`[product]\` 구글, AI 코딩 경쟁력 강화를 위해 스타트업 '메카나이즈' 핵심 인력 15억 달러 규모 흡수
    - \`[devtool]\` Docket — 코딩 에이전트의 구현 과정과 테스트 증적을 커밋 단위로 기록하는 감사 도구
    - \`[research]\` Recurrent Looped Transformer — 시퀀스 길이에 따라 디코더 추론 깊이가 동적으로 확장되는 아키텍처
    - \`[oss]\` ZLUDA + ROCm 기반 윈도우 환경 AMD GPU를 위한 재현 가능한 CUDA 호환 스택 오픈소스 공개
    - \`[research]\` 코딩 에이전트의 잠재적 프로그래밍 지평 분석 논문
    - \`[policy]\` 안노 타카히로의 실리콘밸리 AGI 최전선 르포 — 연구자 15인이 증언한 에이전트 패권 경쟁
    - \`[model]\` DeepSeek-V4.1-Flash 발표 — KV 캐시 메모리 요구량을 극적으로 압축하는 혁신 기법 도입
    - \`[research]\` 82만 파라미터 극소형 언어모델로 라즈베리파이 Pico(RP2040)용 드로잉 바이트코드 생성 성공
    - \`[devtool]\` Claude Code 메모리 확장 도구 'claude-mem', 파워쉘 자격증명 무단 접근으로 보안 백신에 탐지
    - \`[model]\` 오픈AI의 신규 음성 모델 'GPT-Live-1' 실전 테스트
    - \`[업데이트]\` \`vinzdg/codenotch\` (Claude Code·Cursor·Codex·Antigravity 사용량 한도 모니터링 앱, 1,115★→1,545★로 38.6% 급증)
    - \`[oss]\` \`Vincentwei1021/anything2explainer\` (Remotion 모션 그래픽 해설 영상 제작 에이전트 스킬, 1,164★)
    - \`[devtool]\` \`Qiuner/birdview\` (AI 코딩 전 아키텍처 맵 사전 구축 도구)
    - \`[oss]\` \`xiaYuTian11/maskit\` (로컬 프라이버시 데이터 비식별화 게이트웨이)
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 100% 일치 규격 엄수
  - \`curate_news.js --validate\` 규격 검증 100% 통과

### 🔥 3. CC-Trends (Claude Code 생태계 주간 트렌드 큐레이션 및 보안 검사)
- **광역 수집:** GitHub 10대 쿼리 + HN 4대 쿼리 수집 (60건 유효 후보 도출)
- **진입점 보안 스캔 (\`scan-install-entry.js\`):**
  - 60건 전수 검사 결과, 악성 원격 페이로드 로더/드로퍼 1건 적발 및 즉각 차단
  - 차단 대상: \`crwdla/tokentab\` (832★) — \`setup.py\` 내 미인증 공개 IP(172.233.51.81) 및 \`remote_fetch_exec\` 탐지
- **주간 큐레이션 (32건 선별):**
  - Rising 16건, Classic 16건 엄선 (\`site/public/data/latest.json\` 및 아카이브 \`2026-09-14.json\` 배포)
  - 신규 등록 리포 8건 한글 카피 지식 베이스 정밀 큐레이션 완수 (\`anything2explainer\`, \`ai-coding-welfare\`, \`gongwen-gbt9704-skill\`, \`reelbench-skills\`, \`artemis\`, \`zeron\`, \`agent-memory\`, \`career-ops\`)

### 📦 4. 배포 리소스 및 빌드 검증
- RSS 피드(\`feed.xml\`, \`news-feed.xml\`), sitemap.xml, OG 이미지(\`og.svg\`, \`og.png\`), 아카이브 인덱스(\`index.json\`) 최신화
- 라운지 스냅샷(\`lounge_latest.json\`) 갱신 완료
- Vite 프로덕션 멀티페이지 정적 빌드(\`npm run build\`) 144ms 무결성 통과 (에러 0건)
`
  },
  {
    filename: "2026-09-10 작업일지.md",
    title: "2026-09-10 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 561개 최신화, 데일리 AI 뉴스 15건 큐레이션 및 전 매체 수집 100%)",
    date: "2026-09-10",
    content: `---
title: 2026-09-10 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 561개 최신화, 데일리 AI 뉴스 15건 큐레이션 및 전 매체 수집 100%)
date: 2026-09-10
type: work-log
tags: [work-log, cc-daily, cc-star, cc-news, obsidian-sync]
---

# 📅 2026-09-10 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 561개 오픈소스 리포지토리 전수 추적 완료 (API 호출 성공률 100%)
- **상태 변화:** 404 Gone: 34건, Rename: 0건, Suspect: 65건 감지
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 원자적 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (24시간 AI 기술 신호 수집 및 정밀 큐레이션)
- **수집:** 7대 전 매체 100% 성공 (총 122건 수집, \`[MISSING]\` 0건)
  - GeekNews 5건, AI타임스 5건, Hacker News 22건, GitHub 50건, Reddit 19건, HF Daily Papers 12건, Bluesky 9건
  - 최근 7일 기배포 URL 중복 6건 차단, \`is_update\` 2건 유지
- **정밀 큐레이션 (15건 선별 배포):**
  - 신호축 분포: \`devtool\` 3건, \`product\` 3건, \`model\` 2건, \`research\` 2건, \`practice\` 2건, \`oss\` 2건, \`policy\` 1건
  - 핵심 이슈:
    - \`[research]\` 세바스찬 라슈카 분석: GPT-6 아스트라 루프형 트랜스포머 및 잠재 추론(Hidden CoT) 구조
    - \`[policy]\` 클로드 유료 계정 세션/토큰 탈취 '인포스틸러' 급증 및 앤트로픽 강제 무효화 조치
    - \`[model]\` NeoHorse-1: 라우팅 하네스 기반 에이전틱 사후 학습을 통한 재귀적 자기 개선(RSI) 오픈 모델
    - \`[product]\` 애플 iPhone 18 Pro 공개: 2나노 A20 Pro와 32코어 뉴럴 엔진으로 온디바이스 에이전트 가속
    - \`[practice]\` 스포티파이 엔지니어링의 Spotify Method: Claude Code 토큰 사용량 및 비용 90% 절감 기법
    - \`[업데이트]\` \`XiaoDuoYa/codex-with-chatgpt\` (7일간 스타 65.7% 폭증, 2,273★→3,766★)
    - \`[업데이트]\` \`okf-memory/okf-agent-memory\` (Google OKF v0.2 표준, 7일간 스타 48.9% 증가, 348★→518★로 500★ 돌파)
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 100% 일치 규격 엄수
  - \`curate_news.js --validate\` 43개 검증 항목 무결성 100% 통과

### 📦 3. 배포 리소스 및 빌드 검증
- RSS 피드(\`feed.xml\`, \`news-feed.xml\`), sitemap.xml, 라운지 스냅샷 최신화
- Vite 프로덕션 멀티페이지 정적 빌드(\`npm run build\`) 141ms 무결성 통과 (에러 0건)
`
  },
  {
    filename: "2026-09-09 작업일지.md",
    title: "2026-09-09 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 561개 최신화, 데일리 AI 뉴스 15건 큐레이션 및 전 매체 수집 100%)",
    date: "2026-09-09",
    content: `---
title: 2026-09-09 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 561개 최신화, 데일리 AI 뉴스 15건 큐레이션 및 전 매체 수집 100%)
date: 2026-09-09
type: work-log
tags: [work-log, cc-daily, cc-star, cc-news, obsidian-sync]
---

# 📅 2026-09-09 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 561개 오픈소스 리포지토리 전수 추적 완료 (API 호출 성공률 100%)
- **상태 변화:** 404 Gone: 33건, Rename: 0건, Suspect: 66건 감지
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 원자적 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (24시간 AI 기술 신호 수집 및 정밀 큐레이션)
- **수집:** 7대 전 매체 100% 성공 (총 116건 수집, \`[MISSING]\` 0건)
  - GeekNews 5건, AI타임스 5건, Hacker News 18건, GitHub 50건, Reddit 27건, HF Daily Papers 3건, Bluesky 8건
  - 최근 7일 기배포 URL 중복 1건 차단, \`is_update\` 2건 유지
- **정밀 큐레이션 (15건 선별 배포):**
  - 신호축 분포: \`model\` 3건, \`devtool\` 3건, \`oss\` 3건, \`product\` 2건, \`research\` 2건, \`practice\` 1건, \`policy\` 1건
  - 핵심 이슈:
    - \`[practice]\` 맥북 프로에서 SSD 스트리밍으로 2.8조 파라미터 Kimi K3 가동 (초당 3.8토큰 달성)
    - \`[policy]\` 오픈AI, '에르되시-레니 수학 난제 해결' 모델 표절 공방 (원저자 증명 무단 학습 논란)
    - \`[model]\` 딥시크, 네이티브 멀티모달 'DeepSeek-VL2 Flash (v4.1)' 오픈소스 베타 공개
    - \`[devtool]\` Meta의 \`llama-stack-provider-hybrid\` (클라우드/온디바이스 하이브리드 추론 엔진)
    - \`[업데이트]\` \`vinzdg/codenotch\` (코드베이스 다이어그램 시각화 도구, 7일간 스타 62.3% 급증, 687★→1,115★로 1,000★ 돌파)
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 100% 일치 규격 엄수
  - \`curate_news.js --validate\` 43개 검증 항목 무결성 100% 통과

### 📦 3. 배포 리소스 및 빌드 검증
- RSS 피드(\`feed.xml\`, \`news-feed.xml\`), sitemap.xml, 라운지 스냅샷 최신화
- Vite 프로덕션 멀티페이지 정적 빌드(\`npm run build\`) 155ms 무결성 통과 (에러 0건)
`
  },
  {
    filename: "2026-09-08 작업일지.md",
    title: "2026-09-08 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 561개 최신화, 데일리 AI 뉴스 15건 큐레이션 및 전 매체 수집 100%)",
    date: "2026-09-08",
    content: `---
title: 2026-09-08 작업일지 — 평일 데일리 파이프라인(cc-daily) 완수 (스타보드 561개 최신화, 데일리 AI 뉴스 15건 큐레이션 및 전 매체 수집 100%)
date: 2026-09-08
type: work-log
tags: [work-log, cc-daily, cc-star, cc-news, obsidian-sync]
---

# 📅 2026-09-08 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **수집 대상:** 561개 오픈소스 리포지토리 전수 추적 완료 (API 호출 성공률 100%)
- **상태 변화:** 404 Gone: 33건, Rename: 0건, Suspect: 66건 감지
- **원장 및 메타:** \`stars_ledger.json\`, \`stars_meta.json\` 원자적 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (24시간 AI 기술 신호 수집 및 정밀 큐레이션)
- **수집:** 7대 전 매체 100% 성공 (총 122건 수집, \`[MISSING]\` 0건)
  - GeekNews 5건, AI타임스 5건, Hacker News 18건, GitHub 50건, Reddit 27건, HF Daily Papers 12건, Bluesky 5건
  - 최근 7일 기배포 URL 중복 2건 차단, \`is_update\` 3건 유지
- **정밀 큐레이션 (15건 선별 배포):**
  - 신호축 분포: \`research\` 3건, \`oss\` 3건, \`devtool\` 2건, \`practice\` 2건, \`model\` 2건, \`product\` 2건, \`policy\` 1건
  - 핵심 이슈:
    - \`[product]\` 챗GPT '개인 문체' 학습 기능 테스트 (AI 특유 번역투 탈피)
    - \`[devtool]\` Red Hat의 \`ripwire\` (코딩 에이전트용 ripgrep 기반 호출 그래프 지도 제공)
    - \`[practice]\` 마틴 파울러 블로그 '에이전트 루프 내부 TDD의 실전 가치와 한계'
    - \`[product]\` AMD ROCm 10.0 발표 (에이전트 AI 시대를 위한 10년간의 오픈 컴퓨트 집대성)
    - \`[업데이트]\` \`open-seo-mcp-skills\` (Claude용 SEO/GEO MCP 스킬, 7일간 스타 135% 급증, 255★→601★)
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 100% 일치 규격 엄수
  - \`curate_news.js --validate\` 43개 검증 항목 무결성 100% 통과

### 📦 3. 배포 리소스 및 빌드 검증
- RSS 피드(\`feed.xml\`, \`news-feed.xml\`), sitemap.xml, 라운지 스냅샷 최신화
- Vite 프로덕션 멀티페이지 정적 빌드(\`npm run build\`) 157ms 무결성 통과 (에러 0건)
`
  },
  {
    filename: "2026-09-07 작업일지.md",
    title: "2026-09-07 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 561개 100% 최신화, 트렌드 35건 큐레이션 및 보안 스캔, 뉴스 15건 배포)",
    date: "2026-09-07",
    content: `---
title: 2026-09-07 작업일지 — 주간 종합 파이프라인(cc-weekly) 완수 (스타보드 561개 100% 최신화, 트렌드 35건 큐레이션 및 보안 스캔, 뉴스 15건 배포)
date: 2026-09-07
type: work-log
tags: [work-log, cc-weekly, cc-star, cc-news, cc-trends, security-scan, obsidian-sync]
---

# 📅 2026-09-07 작업일지

## 1. 주요 작업 내용

### 📈 1. CC-Star (오픈소스 스타보드 원장 최신화)
- **대상 및 성과:** 총 561개 주요 오픈소스 리포지토리 전수 추적 (API 호출 성공률 100%)
- **주요 변동 사항:**
  - 404 Gone: 32건 정상 식별 및 플래그 처리
  - Rename: 0건
  - Suspect: 67건 (변동 감지)
- **주간 스타 급상승 Top 5:**
  1. \`mattpocock/skills\`: +9,124 (254,495★)
  2. \`DietrichGebert/ponytail\`: +7,503 (129,310★)
  3. \`affaan-m/ECC\`: +4,873 (251,278★)
  4. \`blader/humanizer\`: +3,698 (44,212★)
  5. \`stablyai/orca\`: +2,644 (62,765★)
- 원장(\`stars_ledger.json\`) 및 메타(\`stars_meta.json\`) 원자적 갱신 및 사이트 퍼블릭 미러링 완료

### 📰 2. CC-News (데일리 AI 기술 신호 24시간 정밀 큐레이션)
- **수집:** 7개 지정 매체 중 6개 매체에서 총 112건 후보 수집 (\`HF Daily Papers\`는 월요일 오전 UTC 생성 전으로 \`[MISSING]\` 처리)
  - GeekNews 5건, AI타임스 5건, Hacker News 9건, GitHub 50건, Reddit 36건, Bluesky 7건
  - 최근 7일 기배포 URL 중복 2건 차단, \`is_update\` 1건 유지
- **정밀 큐레이션 (15건 선별 배포):**
  - 신호축 분포: \`devtool\` 4건, \`oss\` 4건, \`model\` 2건, \`research\` 2건, \`product\` 1건, \`policy\` 1건, \`practice\` 1건
  - 핵심 이슈: 마이크로소프트 윈도우 11 프로젝트 제니스(30B 로컬 실행), 구글 리리아 3.5 API, 오픈AI 에이전트 위키 사건 정렬 실패 기준
  - 업데이트 항목: \`2akouwu/reverify\` (최근 7일 스타 65% 급증, 583★→962★)
  - 3불릿 볼드 키워드(\`• **키워드**: \`), 5~10문장 심층 해설, 사실 필드 100% 일치 규격 엄수
  - \`curate_news.js --validate\` 43개 검증 항목 무결성 100% 통과

### 🔥 3. CC-Trends (Claude Code 생태계 주간 트렌드 큐레이션 및 보안 검사)
- **광역 수집:** GitHub 10대 쿼리 + HN 4대 쿼리 수집 (58건 유효 후보 도출)
- **진입점 보안 스캔 (\`scan-install-entry.js\`):**
  - 58건 전수 검사 결과, 악성 원격 페이로드 로더/드로퍼 1건 적발 및 즉각 차단
  - 차단 대상: \`damejan80/tokentab\` (1160★) — \`setup.py\` 내 미인증 공개 IP(91.92.47.134) 및 \`remote_fetch_exec\` 탐지
- **주간 큐레이션 (35건 선별):**
  - Rising 19건, Classic 16건 엄선 (\`site/public/data/latest.json\` 및 아카이브 \`2026-09-07.json\` 배포)
  - 신규 등록 리포 8건 한글 카피 지식 베이스 확장 (\`website-rebuild-skill\`, \`refactoring-ui-skill\`, \`appllama-skills\`, \`video-talkcraft\`, \`codenotch\`, \`vibe-coding-toolkit\`, \`chrome-devtools-mcp\`, \`headroom\`)

### 📦 4. 배포 리소스 및 빌드 검증
- RSS 피드(\`feed.xml\`, \`news-feed.xml\`), sitemap.xml, OG 이미지(\`og.svg\`, \`og.png\`), 아카이브 인덱스 최신화
- 라운지 스냅샷 갱신 완료
- Vite 프로덕션 멀티페이지 정적 빌드(\`npm run build\`) 149ms 무결성 통과 (에러 0건)
`
  },
  {
    filename: "2026-09-03 작업일지.md",
    title: "2026-09-03 작업일지 — 아카이브 날짜/버전 일관성 전수 정비 및 평일 데일리 파이프라인(cc-daily) 완수",
    date: "2026-09-03",
    content: `---
title: 2026-09-03 작업일지 — 아카이브 날짜/버전 일관성 전수 정비 및 평일 데일리 파이프라인(cc-daily) 완수
date: 2026-09-03
type: work-log
tags: [work-log, cc-daily, archive-consistency, cc-star, cc-news, obsidian-sync]
---

# 📅 2026-09-03 작업일지

## 1. 주요 작업 내용

### 🛠️ 1. 전 탭 아카이브 날짜 및 버전 표기 전수 개선
- **문제점:** 
  - 인기 플러그인 아카이브에서 오기입(\`2026-06-15\`에 \`v2026.06.08\`) 및 비표준 주차 표기(\`2026-W22\` 등) 혼재
  - AI 뉴스 아카이브에서 시맨틱 버전(\`2.0.0\`, \`1.0\`) 혼재 및 최신 아카이브 파일 누락
  - 스타보드 탭 방문자 배지 ID 오기입(\`aiweekly.news\` → \`aiweekly.starboard\`)
- **해결책:**
  - 인기 플러그인과 AI 뉴스의 모든 아카이브(인덱스 및 JSON 내부 메타데이터)를 일관된 \`vYYYY.MM.DD\` 표준 규격으로 100% 정규화
  - 누락된 과거 아카이브(\`news_2026-09-01.json\`, \`news_2026-09-02.json\`)를 \`site/public/data/archive/\`와 \`data/archive/\` 양방향에 완전 동기화
  - \`site/src/main.js\`에 방어적 날짜 파싱 및 버전 포맷팅 유틸리티를 적용하여 레거시 데이터에서도 안정적인 \`vYYYY.MM.DD\` 노출 보장
  - 스타보드 방문자 배지 ID 및 아카이브 UI 깜빡임 방지 개선

### 🚀 2. 평일 데일리 파이프라인(cc-daily) 정밀 실행
- **CC Star (스타보드 갱신):**
  - 총 561개 오픈소스 리포지토리 최신 스타 수 및 메타데이터 갱신 완료 (성공률 100%, 404 Gone: 28건, 이름 변경: 1건, 의심 변동: 71건)
- **CC News (24시간 기술 신호 수집 및 정밀 큐레이션):**
  - 7개 매체 중 6개 매체에서 총 105건 후보 수집 (\`HF Daily Papers\`는 당일 발행 전으로 \`[MISSING]\` 처리)
  - 18건 정밀 선별: 6대 기술 신호축(모델 2, 제품 2, 연구 3, 실무 4, 개발도구 4, 오픈소스 3) 황금 균형 분배
  - 3불릿 요약, 5~10문장 심층 해설, \`ldk-hub\` 출처 명시, \`is_update\` 처리 엄수
  - \`curate_news.js --validate\` 무결성 검증 100% 통과
- **배포 리소스 및 옵시디언 동기화:**
  - RSS 피드(\`feed.xml\`, \`news-feed.xml\`) 및 사이트맵 최신화
  - 라운지 Discussions 스냅샷 갱신 (\`v2026.09.03\`)
  - 옵시디언 볼트(\`/Users/nhn/Documents/Obsidian Vault/ai-weekly\`) 동기화 완료
`
  },
  {
    filename: "2026-08-31 작업일지.md",
    title: "2026-08-31 작업일지 — 주간 트렌드 큐레이션, 559개 오픈소스 스타보드 최신화, 데일리 AI 뉴스 20건 배포",
    date: "2026-08-31",
    content: `---
title: 2026-08-31 작업일지 — 주간 트렌드 큐레이션, 559개 오픈소스 스타보드 최신화, 데일리 AI 뉴스 20건 배포
date: 2026-08-31
type: work-log
tags: [work-log, cc-star, cc-trends, cc-news, obsidian-sync]
---

# 📅 2026-08-31 작업일지

## 1. 주요 파이프라인 수행 내역

### 📈 1. 오픈소스 스타보드 (\`cc-star\`) 전수 갱신
- **수행:** \`node scripts/stars/collect-stars.js\` 실행
- **대상:** 559개 주요 AI/에이전트 오픈소스 리포지토리 전수 수집
- **결과:**
  - 성공률: **559 / 559 (100%)**
  - 404 Gone 처리: 26개 리포지토리 상태 플래그 갱신
  - 리네임 반영: 1개 리포지토리
  - 원장 갱신: \`data/stars/stars_ledger.json\`, \`data/stars/stars_meta.json\` 및 프론트 미러링 완료

### 🧩 2. 주간 플러그인 & 도구 트렌드 (\`cc-trends\`) 큐레이션
- **수행:** \`collect.js\` 후보 수집 및 에이전트 직접 정밀 큐레이션
- **선별:** Rising 18건 + Classic 11건 (총 29개 프로젝트)
- **주요 등재 프로젝트:**
  - 🔥 **Rising:** \`only-cli/oc\` (웹사이트를 에이전트 CLI로 변환), \`camilleroux/genart-skill\` (온체인 생성 예술), \`yetone/cumora\` (에이전트 협업 팀 챗), \`Leonxlnx/unlazy\` (뎁스 트리 안티-게으름 엔진), \`duty1g/x64dbg-mcp-server\` (역공학 디버깅 MCP), \`diegosouzapw/OmniRoute\` (350개 프로바이더 통합 게이트웨이) 등
  - ⭐ **Classic:** \`Leonxlnx/taste-skill\`, \`Panniantong/Agent-Reach\`, \`nextlevelbuilder/ui-ux-pro-max-skill\`, \`Graphify-Labs/graphify\`, \`addyosmani/agent-skills\` 등
- **산출물:** \`site/public/data/latest.json\`, \`data/archive/2026-08-31.json\`, RSS/OG 갱신 완료

### 📰 3. 데일리 AI 기술 신호 (\`cc-news\`) 엄선 큐레이션
- **수행:** 7대 매체 수집 → 20건 엄선 큐레이션 → \`--validate\` 게이트 통과
- **신호 6축 분포:**
  - \`model\` (1): 연속 확산 언어 모델(CDLM)의 부활
  - \`product\` (2): 핫칩스 2026 AI 반도체 자동 설계, Academa STEM 강의 비디오 생성
  - \`devtool\` (3): NVIDIA-labs OO Agents(NOOA), OpenTag 온콜 봇, Roomote PR 자동 배포 에이전트
  - \`oss\` (4): codex-with-chatgpt, sepia 문체 복원 스킬, [업데이트] FrontierAgent TUI, agenttrail 시각화 캔버스
  - \`research\` (3): Code as Worlds(물리 추론), ContextPilot(능동 컨텍스트 관리), LMSM(리눅스 보안 모듈 영감 가드레일)
  - \`practice\` (4): Booking.com Weaviate 벡터 DB 선정기, AI 시대 데이터 계약 아키텍처, 우리은행 AI 에이전트 상담봇, Claude Code 커밋 Co-author 고찰
  - \`policy\` (3): AI 데이터센터 폐열 냉각 97MW 확보, AI 검색 인용 조작 가상 싱크탱크 실태, llms.txt 미등록 패키지 보안 위협
- **💡 AI 트렌드 요약:**
  > **🔥 오늘의 핵심 키워드:** \`#컨텍스트관리\` \`#에이전트보안\` \`#확산언어모델\` — AI 에이전트의 장기 컨텍스트 최적화와 기업 내부망 보안 가드레일 연구가 가속화되고 있습니다. ldk-hub에서 큐레이션 하였습니다.
- **품질 검증:** \`node scripts/news/curate_news.js --validate\` 100% 통과

---

## 2. 배포 및 동기화
- RSS 피드 및 사이트맵 자동 생성 (\`generate-rss.js\`)
- 라운지 커뮤니티 Discussions 스냅샷 갱신 (\`collect_lounge.js\`)
- 옵시디언 볼트 문서화 동기화 (\`obsidian_export.js\`)
`
  },
  {
    filename: "2026-08-27 작업일지.md",
    title: "2026-08-27 작업일지 — 데일리 뉴스 큐레이션 및 474개 스타보드 갱신",
    date: "2026-08-27",
    content: `---
title: 2026-08-27 작업일지 — 데일리 뉴스 큐레이션 및 474개 스타보드 갱신
date: 2026-08-27
type: work-log
tags: [work-log, cc-star, cc-news, GLM5, WebMCP, Continuity]
commit: 50df199
---

# 📅 2026-08-27 작업일지

## 1. 주요 작업 내용

### 📊 1. \`/cc-star\` 스타보드 갱신 완료
- **수집 대상:** 474개 리포지토리 전수 크롤링 완료 (성공률 100%)
- **원장 갱신:** \`data/stars/stars_ledger.json\`, \`data/stars/stars_meta.json\` 및 \`site/public/data/\` 동기화

### 📰 2. \`/cc-news\` 데일리 뉴스 18건 큐레이션 및 배포
- **수집 후보:** 총 113건 수집 (GeekNews 5, AI타임스 5, Hacker News 23, GitHub 50, Reddit 18, Bluesky 12)
- **큐레이션 선별 (18건):**
  1. \`aitimes_d1bfee1857\`: 오픈AI "챗GPT 다음 단계는 '일하는 AI'" (\`product\`)
  2. \`aitimes_b92a7b3e10\`: 앤트로픽, 클로드 '채팅'과 '코워크' 메모리 통합 (\`product\`)
  3. \`aitimes_864a02b000\`: 물리 법칙 이해하는 신개념 '피지컬 AI' 공개 (\`research\`)
  4. \`aitimes_c2c3654bcc\`: 퍼플렉시티-엔비디아 로컬 에이전트 '포터블 컴퓨터' (\`product\`)
  5. \`geeknews_ae5aa43bec\`: Cursor의 새 Git 저장 시스템 Continuity (\`devtool\`)
  6. \`geeknews_56eeed47a4\`: html2design - 웹페이지 Figma 변환 확장 (\`oss\`)
  7. \`geeknews_bd70cb6c61\`: 쿼리 가능한 실행 파일(Queryable Executables) (\`devtool\`)
  8. \`hackernews_2f630d5eb6\`: GLM-5.3-Flash 320B/18B MoE 분석 (\`model\`)
  9. \`hackernews_801be10beb\`: Serve Markdown to AI Agents with Accept Headers (\`devtool\`)
  10. \`hackernews_7695ef6f0d\`: WebMCP 오픈 인터페이스 (\`devtool\`)
  11. \`hackernews_5f7db0535d\`: 스레드-레지스터 분리 GPU 실행 모델 논문 (\`research\`)
  12. \`hackernews_ff035c77e1\`: TexLite 경량 LaTeX 워크스페이스 (\`oss\`)
  13. \`reddit_9e673571d6\`: Qwen3.8-Flash-Next 릴리즈 데이 (\`model\`)
  14. \`reddit_ad23686812\`: Claude Code로 구축한 Three.js 게임 제작기 (\`practice\`)
  15. \`reddit_3abf47851d\`: 실무를 위한 핵심 Claude 5대 워크플로우 (\`practice\`)
  16. \`bluesky_aa0c7ed197\`: VM 샌드박스 격리 한계 지적 보고서 (\`research\`)
  17. \`github_3aa35fcb86\`: Sprix Sage Router A2A 라우터 (\`devtool\`)
  18. \`github_6545db54ed\`: Doop MCP 내장 실시간 협업 디자인 캔버스 (\`devtool\`)
- **💡 AI 트렌드 요약:**
  > **🔥 오늘의 핵심 이슈:** \`#GLM53Flash\` \`#일하는AI\` \`#WebMCP\` \`#CursorGit시스템\` — 경량 초고속 MoE 모델(GLM/Qwen) 경쟁과 웹-에이전트 직결 프로토콜(WebMCP/Accept-Markdown)의 등장이 주도한 하루였습니다. ldk-hub에서 큐레이션 하였습니다.

---

## 2. 배포 및 커밋
- **Commit:** \`50df199\` (\`chore: update daily news and cc-star (2026-08-27)\`)
- **Author:** \`ldk-hub <orm6711@gmail.com>\`
`
  },
  {
    filename: "2026-08-26 작업일지.md",
    title: "2026-08-26 작업일지 — AI 트렌드 요약 키워드 규격 혁신 및 AI 라운지 Giscus 구축",
    date: "2026-08-26",
    content: `---
title: 2026-08-26 작업일지 — AI 트렌드 요약 키워드 규격 혁신 및 AI 라운지 Giscus 구축
date: 2026-08-26
type: work-log
tags: [work-log, giscus, lounge, summary-spec, ui-enhancement]
commits: [0f9f9c0, 047b820, b2f4ff8, 294418a]
---

# 📅 2026-08-26 작업일지

## 1. 주요 작업 내용

### 💡 1. AI 트렌드 요약 패널 혁신 및 스킬 규격화
- **기존 문제:** 기계적인 건수 나열("AI 기술 신호 18건을 정리했습니다...")로 인한 가독성 저하
- **개선 내용:**
  - 수집된 기사 전체를 관통하는 **"오늘의 주된 핵심 이슈 키워드(#태그 3~4개)"와 "핵심 기술 흐름 한 줄 브리핑"**으로 전면 개편
  - 프론트엔드(\`site/src/main.js\`, \`site/styles.css\`)에서 \`#태그\`를 감지하여 전용 배지(\`.db-tag\`)로 시각적 하이라이트 처리
  - 스킬 명세(\`.agents/skills/cc-news/SKILL.md\`) 및 검증기(\`curate_news.js\`) 룰 업데이트

### 💬 2. AI 라운지 커뮤니티 페이지 및 Giscus 연동 구축
- **신규 페이지:** \`site/lounge.html\` (상단 네비게이션 탭에 \`💬 라운지\` 추가)
- **GitHub Discussions 연동:**
  - GitHub CLI(\`gh\`)를 통해 \`ldk-hub/ai-weekly\` 리포지토리의 Discussions 기능 활성화
  - GraphQL API로 \`repoId\` (\`R_kgDOTXrViw\`) 및 \`categoryId\` (\`DIC_kwDOTXrVi84DENxe\`)를 자동 조회하여 \`site/src/state.js\`에 설정
  - Giscus 댓글 위젯 및 이모지 반응 컴포넌트 실시간 마운트 완료
- **수집 파이프라인:** \`scripts/community/collect_lounge.js\` 및 \`npm run collect:lounge\` 추가

### 📊 3. 데일리 뉴스 & 스타보드 배포
- \`cc-star\`: 474개 타겟 100% 수집 갱신
- \`cc-news\`: 18건 엄선 큐레이션 배포 (FrontierAgent, Qwen3.8-Flash-Next, EchoWM, Warp Factory 등)

---

## 2. 배포 및 커밋
- \`0f9f9c0\`: \`chore: update daily news and cc-star (2026-08-26)\`
- \`047b820\`: \`feat(news): enhance daily trend summary with issue keywords and one-line insight\`
- \`b2f4ff8\`: \`feat(lounge): add AI lounge community page and giscus discussions integration\`
- \`294418a\`: \`feat(giscus): configure repository and discussions category IDs for lounge\`
`
  },
  {
    filename: "2026-08-25 작업일지.md",
    title: "2026-08-25 작업일지 — 주간 트렌드 인덱싱 및 뉴스 파이프라인 최적화",
    date: "2026-08-25",
    content: `---
title: 2026-08-25 작업일지 — 주간 트렌드 인덱싱 및 뉴스 파이프라인 최적화
date: 2026-08-25
type: work-log
tags: [work-log, cc-trends, cc-news, refactoring, pipeline-optimization]
commits: [3b36393, 7d48c6a]
---

# 📅 2026-08-25 작업일지

## 1. 주요 작업 내용

### 🔥 1. \`/cc-trends\` 주간 트렌드 발행
- 381개 리포지토리 스캔 및 커뮤니티 교차 인덱싱
- Rising 20건 / Classic 13건 큐레이션 및 \`latest.json\`, \`2026-08-25.json\`, \`archive/index.json\` 배포

### 🧹 2. 뉴스 수집 파이프라인 리팩토링 및 쿼터 최적화
- 비효율적인 동기 프로세스 제거 및 7대 매체 비동기 수집 안정화
- 최근 7일 중복 필터링(\`dropRepeats\`) 강화로 반복 노출 문제 해결
- 레거시 스크립트 정리 및 검증 게이트 보강

---

## 2. 배포 및 커밋
- \`3b36393\`: \`refactor(news): optimize cc-news pipeline, improve collection quotas and clean up legacy scripts\`
- \`7d48c6a\`: \`chore: update trends, stars, and daily news (2026-08-25)\`
`
  },
  {
    filename: "2026-08-24 작업일지.md",
    title: "2026-08-24 작업일지 — 뉴스 페이지 아카이브 드롭다운 및 갱신 주기 UI 개선",
    date: "2026-08-24",
    content: `---
title: 2026-08-24 작업일지 — 뉴스 페이지 아카이브 드롭다운 및 갱신 주기 UI 개선
date: 2026-08-24
type: work-log
tags: [work-log, ui-improvement, archive-dropdown, news-page]
commits: [9c51b93, 8adc38a]
---

# 📅 2026-08-24 작업일지

## 1. 주요 작업 내용

### 🎨 1. 뉴스 페이지 메타 바 및 아카이브 드롭다운 UI 구현
- **문제점:** 차주별 정보 부재 및 데이터 반영 날짜/다음 갱신 주기 표기 누락
- **해결책:**
  - 상단 메타 바에 **반영 날짜(\`2026.08.24 (월) 갱신\`)** 및 **다음 갱신 예정일(\`다음 8/25 (화)\`)** 실시간 계산 및 표시
  - \`지난 뉴스 ▾\` 드롭다운 메뉴를 구현하여 과거 날짜별 뉴스 아카이브를 즉시 탐색할 수 있도록 개선

---

## 2. 배포 및 커밋
- \`9c51b93\`: \`fix(news): display updated date, next update date, and past issues menu on news page\`
- \`8adc38a\`: \`chore: update trends, stars, and daily news (2026-08-24)\`
`
  },
  {
    filename: "2026-08-20 작업일지.md",
    title: "2026-08-20 작업일지 — Dooray 인커밍 웹훅 알림 연동 및 스케줄링",
    date: "2026-08-20",
    content: `---
title: 2026-08-20 작업일지 — Dooray 인커밍 웹훅 알림 연동 및 스케줄링
date: 2026-08-20
type: work-log
tags: [work-log, dooray, webhook, notification, scheduler]
commits: [57c2df9, cea1868, e4b92aa, 84869fd, d6e6d89]
---

# 📅 2026-08-20 작업일지

## 1. 주요 작업 내용

### 🔔 1. Dooray 메신저 채널 알림 연동
- 데일리 뉴스 배포 시 지정된 Dooray 인커밍 웹훅으로 자동 브리핑 전송 기능 개발
- 상위 핵심 뉴스 4건을 깔끔한 카드 첨부(Card Attachment) 형태로 포맷팅하여 전송
- 매일 오전 09:00 KST 정기 배포 스케줄러 설정

---

## 2. 배포 및 커밋
- \`57c2df9\`: \`feat(notify): add Dooray incoming webhook integration for daily news & weekly trends\`
- \`cea1868\`: \`refactor(notify): streamline Dooray alert to single daily news briefing with max 4 items\`
- \`d6e6d89\`: \`chore: update cc-star, cc-news 2026-08-20 & set daily schedule to 09:00 KST\`
`
  }
];

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

  // 3. 작업 일지
  const logsDir = path.join(VAULT_DIR, "02. 작업 일지 (Work Logs)");
  for (const log of LOGS) {
    writeFile(path.join(logsDir, log.filename), log.content);
  }

  console.log("\n==========================================");
  console.log("✅ 옵시디언 볼트 동기화가 성공적으로 완료되었습니다!");
  console.log("==========================================");
}

main();
