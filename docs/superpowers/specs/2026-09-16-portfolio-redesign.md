# Technical Portfolio Redesign Specification

- **Document Date**: 2026-09-16
- **Target Repository**: `ldk-hub/ldk-hub.github.io`
- **Target Page**: `https://ldk-hub.github.io/portfolio/` (`_pages/portfolio.md`)
- **Author Identity**: Senior Full-Stack & AI Systems Engineer (8+ Years)

---

## 1. Overview & Goals

포트폴리오 페이지를 방문하는 엔지니어링 리드, 채용 담당자, 동료 개발자가 **3초 만에 핵심 역량과 엔지니어링 임팩트를 직관적으로 파악**할 수 있도록 전면 리뉴얼합니다.

### 핵심 목표
1. **아이덴티티 재정립**: 기존 "AI Harness Engineer"에서 2025~2026 테크 트렌드에 부합하는 **"Senior Full-Stack & AI Systems Engineer"**로 전문성을 명확히 선언.
2. **이모티콘 전면 배제 (No Emojis)**: 유치하거나 가벼워 보일 수 있는 이모지를 일체 제거하고, 정갈한 넘버링(`01`, `02`, `03`)과 절제된 모노톤 뱃지, 정밀한 타이포그래피 중심의 시니어 엔지니어링 룩앤필 구축.
3. **모던 반응형 정보 구조 (Information Architecture)**:
   - 상단 **임팩트 메트릭 히어로 쇼케이스 (Hero Showcase)** 신설
   - 기존 마크다운 테이블의 모바일 찌그러짐을 해결하는 **3열 반응형 프로젝트 매트릭스 카드 (Overview Cards)** 도입
   - 각 프로젝트별 문제-해결-성과 중심의 **STAR 구조 엔지니어링 하이라이트** 고도화 (스타보드 3대 체급 개편 등 최신 성과 반영)
4. **모듈형 유지보수 아키텍처**: 스타일을 `_sass/_portfolio.scss`로 분리하여 Minimal Mistakes 다크 테마와 100% 호환되며 유지보수가 용이한 구조 확립.

---

## 2. Component Specifications

### 2.1. Hero Showcase Section (`.pf-hero`)
- **Category Pill**: `SENIOR FULL-STACK & AI SYSTEMS ENGINEER` (대문자 모노스페이스 캡슐 배지)
- **Main Heading**: "견고한 분산 아키텍처와 자율 AI 에이전트 시스템을 결합하여 실용적인 비즈니스 난제를 해결합니다."
- **Intro Paragraph**: 8+년차 백엔드 코어 엔지니어링 기반 위에 최신 LLM 자율 에이전트 오케스트레이션과 2D Canvas 시각화를 결합한 가치 제언.
- **4 Key Impact Metrics Strip (`.pf-metrics`)**:
  - `8+ Years`: 금융·이커머스·AI 플랫폼 코어 백엔드 & 풀스택
  - `99.9% Uptime`: 24시간 자율 AI 수집·큐레이션 및 일 50만 트래픽 서빙
  - `60 FPS Canvas`: 2.5D 공간 Y-Sorting 알고리즘 및 DOM 병목 돌파
  - `Zero-Downtime`: 이기종 DB(Oracle ➔ PG) 무중단 이관 & JPA 쿼리 최적화
- **Quick Links Bar (`.pf-quick-links`)**:
  - `AI Weekly Live`, `GitHub Profile`, `About Me`, `Direct Email`

### 2.2. Project Overview Matrix Cards (`.pf-matrix`)
기존 마크다운 테이블을 반응형 카드 그리드(`display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem;`)로 전면 교체.

1. **Card 1: AI Weekly 2.0**
   - 태그: `AUTONOMOUS AI PLATFORM` · `SOLO FULL-STACK`
   - 핵심 성과: 7개 글로벌 매체 24h 무중단 수집, 3초 스캐닝 인포메이션 아키텍처, 580개 OSS 스타보드 3대 체급 모멘텀 추적, Obsidian Vault 양방향 동기화
   - 기술 스택: `Claude Code`, `Node.js 24`, `GitHub Actions`, `HTML5 Canvas`, `Obsidian`
   - 링크 버튼: Live Service, Tech Review, GitHub
2. **Card 2: bmad-2d-monitor**
   - 태그: `2.5D CANVAS & AGENTIC MONITOR` · `SOLO DESIGN & DEV`
   - 핵심 성과: Konva.js 2D Canvas 60FPS 방어, 2.5D Y-Sorting 알고리즘 자체 구현, FSM 기반 자율 에이전트 애니메이션, Spring AI & pgvector 시맨틱 검색
   - 기술 스택: `Java 21`, `Spring Boot 3.4`, `Spring AI`, `pgvector`, `React 18`, `Konva.js`
   - 링크 버튼: Tech Review, Architecture System, GitHub
3. **Card 3: DashBoard**
   - 태그: `ENTERPRISE REAL-TIME MONITORING` · `CORE LEAD`
   - 핵심 성과: Oracle ➔ PostgreSQL 무중단 마이그레이션, JPA N+1 쿼리 Fetch Join 최적화, Spring Proxy 패턴 CORS 방어, SpotBugs 보안 패치
   - 기술 스택: `Java 8/17`, `Spring Boot`, `Spring Security`, `PostgreSQL`, `JPA`, `WebSocket`
   - 링크 버튼: Migration Review, GitHub

### 2.3. Detailed Engineering Storytelling Sections (`.pf-detail`)
각 프로젝트 상세 항목에 대해 넘버링(`01`, `02`, `03`)과 함께 다음 하위 요소를 표준화:
- **Project Header**: 프로젝트명, 영문 서브타이틀, 진행 기간, 담당 역할, 주요 기술 스택 태그 그룹
- **Action Buttons**: 실서비스/리뷰/깃허브 다이렉트 버튼 그룹
- **System Screenshots & Captions**: 시스템 렌더링 화면 그리드
- **STAR Architecture & Troubleshooting**:
  - `.pf-star-block`:
    - `.pf-problem`: 문제 상황 및 기술적 제약 조건 (원인 분석)
    - `.pf-solution`: 해결 방식 및 엔지니어링 결정 근거 (도입 기술 및 아키텍처 패턴)
    - `.pf-result`: 정량적/정성적 성과 및 임팩트

---

## 3. Style System & SCSS Architecture

- **파일 위치**: `_sass/_portfolio.scss`
- **임포트 위치**: `assets/css/main.scss`
- **주요 CSS 토큰 및 디자인 규칙**:
  - `var(--background-color)` 및 Minimal Mistakes의 다크 테마 변수 활용
  - 카드 배경: `rgba(255, 255, 255, 0.03)` + 보더 `1px solid rgba(255, 255, 255, 0.08)`
  - 카드 호버: `transform: translateY(-2px); border-color: rgba(255, 255, 255, 0.2); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);`
  - 폰트 계층: 타이틀 26px/20px/16px, 본문 15px, 뱃지/라벨 11~12px (일관된 line-height 적용)
  - 모바일 반응형(`@media (max-width: 768px)`):
    - 메트릭 4분할 ➔ 2x2 그리드 자동 전환
    - 매트릭스 카드 ➔ 1열 스택 정렬
    - 패딩 최적화로 모바일 가독성 극대화

---

## 4. Cross-Page Consistency Updates

1. **`_pages/about.md`**:
   - `Senior Full-Stack & AI Harness Engineer` ➔ `Senior Full-Stack & AI Systems Engineer` 동기화
2. **`_data/authors.yml`**:
   - `bio: "Senior Full-Stack & AI Systems Engineer (8+ Years)"` 동기화

---

## 5. Verification Plan

1. **Jekyll 빌드 & 린트 검증**:
   - SCSS 문법 유효성 확인
   - 마크다운 파싱 및 kramdown 태그 에러 여부 확인
2. **반응형 뷰포트 렌더링 검증**:
   - 데스크톱 (1200px+): 3열 매트릭스, 4열 메트릭 바, 스크린샷 3열 정렬 정상 동작
   - 태블릿 (768px): 2열 매트릭스, 2x2 메트릭 바 정상 동작
   - 모바일 (375px): 1열 스택 정렬, 여백 및 텍스트 줄바꿈 정상 동작
3. **링크 및 미디어 점검**:
   - 모든 프로젝트 버튼 링크(`ai-weekly`, `bmad-2d-monitor`, `DashBoard`) 정상 동작 확인
   - 이미지 경로 유효성 확인
