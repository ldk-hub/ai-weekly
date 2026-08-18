# Design Spec: GitHub Profile README Modernization (`ldk-hub/ldk-hub`)

**Date:** 2026-08-18  
**Target Repository:** `ldk-hub/ldk-hub`  
**Audience:** Technical Hiring Managers, Tech Recruiters, Senior Engineers  
**Goal:** Highlight real-world engineering problem-solving, AI & Backend architecture expertise, and quantitative project outcomes.

---

## 1. Structure & Layout Strategy

### 1.1 Header & Value Proposition
- **Title**: `👋 Hi, I'm Lee Dongok (ldk-hub)`
- **Identity**: `Full-Stack Software Engineer & AI Integration Architect`
- **One-Liner**: *"대규모 데이터 트래픽의 안정적 백엔드 아키텍처와 생성형 AI/에이전틱 실무 프로덕트화를 주도하는 문제 해결사입니다."*
- **Quick Links**: 🌐 [Portfolio](https://ldk-hub.github.io/portfolio/) · ✍️ [Devlog](https://ldk-hub.github.io/) · 👤 [About](https://ldk-hub.github.io/about/) · 📧 [Email](mailto:contact@ldk-hub.com)

---

## 2. Core Competencies (3대 엔지니어링 강점)

1. **🚀 End-to-End AI & Agentic Pipeline Architecture**
   - LLM 환각(Hallucination) 원천 차단 아키텍처(사실 데이터 강제 오버라이드)
   - 다단계 자동화 품질 게이트(`--validate`) 및 7개 매체 수집 크롤러 구축
   - MCP(Model Context Protocol) 및 Claude Code 기반 서브에이전트 오케스트레이션
2. **⚙️ Scalable Backend & Data Reliability**
   - Spring Boot & Java 기반 대용량 트랜잭션 및 JPA N+1 쿼리 튜닝
   - PostgreSQL/MySQL 데이터 마이그레이션 및 시계열 원장(Ledger) 무결성 설계
   - Redis 캐싱 및 이벤트 기반 비동기 파이프라인
3. **🎨 High-Performance Frontend & Rendering Optimization**
   - Canvas/WebGL(Konva.js) 기반 2.5D Y-Sorting & 60FPS 렌더링 최적화
   - Vite 기반 0.2초 초고속 정적 사이트 번들링 및 완벽한 반응형 SPA 구현

---

## 3. Featured Projects (엔지니어링 문제해결 & 정량 성과 테이블)

| 프로젝트명 | 문제 정의 (Problem) | 핵심 아키텍처 및 해결책 (Engineering Solution) | 정량 성과 및 특징 | 링크 |
|---|---|---|---|:---:|
| **📰 AI위클리 (AI Weekly)** | 수많은 AI 뉴스/도구 속 정보 과잉과 잦은 LLM 환각 | • 7개 매체 결정적 수집 + Cheerio 본문 확보<br>• 사실 데이터 강제 덮어쓰기로 **환각 0% 격리**<br>• `--validate` 품질 게이트 & 성장률 코호트 정규화 수식 설계 | • 170+ 오픈소스 실시간 트래킹<br>• 0.2초 초고속 Vite 빌드<br>• GitHub Actions 100% 무인 자동화 | [GitHub](https://github.com/ldk-hub/ai-weekly) / [Live](https://ldk-hub.github.io/ai-weekly/) |
| **🎮 BMAD 2D Monitor** | 복잡한 다중 에이전트 상태를 텍스트로 파악하기 어려움 | • Konva.js(HTML5 Canvas) 2.5D 쿼터뷰 렌더러<br>• 깊이 버퍼 없는 **Y-Sorting 렌더링 파이프라인** 구현<br>• Spring AI + 실시간 웹소켓 이벤트 큐 연동 | • 60FPS 부드러운 픽셀아트 애니메이션<br>• 에이전트 상태 실시간 시각화 | [GitHub](https://github.com/ldk-hub/bmad-2d-monitor) / [Review](https://ldk-hub.github.io/project/ai/bmad-ai-monitor-system/) |
| **📊 Enterprise Dashboard** | 분산된 다중 이기종 DB(Oracle/Postgres) 조회 병목 | • Oracle → PostgreSQL 무중단 마이그레이션<br>• JPA Fetch Join & Batch Size로 **N+1 쿼리 병목 해소**<br>• 실시간 모니터링 프록시 아키텍처 설계 | • 응답 지연 시간 65% 단축<br>• 다중 서브시스템 통합 관제 | [GitHub](https://github.com/ldk-hub/DashBoard) / [Review](https://ldk-hub.github.io/%EB%8C%80%EC%8B%9C%EB%B3%B4%EB%93%9C/realtime_system/) |

---

## 4. Tech Stack (분야별 체계적 배지)

- **AI & LLM Orchestration**: Claude Code, Gemini, Spring AI, MCP (Model Context Protocol), RAG Architecture, LangChain
- **Backend & Database**: Java 17/21, Spring Boot, Node.js, PostgreSQL, MySQL, Redis, JPA/Hibernate
- **DevOps & CI/CD**: GitHub Actions, Docker, Jenkins, Git, Vite, Linux
- **Frontend**: TypeScript, React, Vue.js, Vanilla JS (ES6+), Canvas API (Konva.js), HTML5/CSS3

---

## 5. Visual Stats & Activity Widgets
- GitHub Streak Stats Card + Top Languages / Contribution summary with clean dark/radical theme.

---

## 6. Verification
- Validate all hyperlinks (`portfolio`, `devlog`, `ai-weekly`, `bmad-2d-monitor`, `DashBoard`, etc.)
- Ensure mobile/desktop markdown layout renders cleanly on GitHub.
