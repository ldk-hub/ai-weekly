#!/usr/bin/env node
/**
 * 옵시디언 볼트(ai-weekly) 동기화 및 작업 이력 문서화 스크립트
 * 대상 경로: /Users/nhn/Documents/Obsidian Vault/ai-weekly
 */

const fs = require("fs");
const path = require("path");

const VAULT_DIR = "/Users/nhn/Documents/Obsidian Vault/ai-weekly";

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
date: 2026-08-31
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
        A8[559개 OSS Repo Stars] --> S
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
  - 구조: \`🔥 오늘의 핵심 이슈: #[키워드1] #[키워드2] #[키워드3] — [전체 기술 흐름 한줄 해설]. ldk-hub에서 큐레이션 하였습니다.\`
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
