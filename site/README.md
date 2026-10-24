<div align="center">

# AI위클리 — 프론트엔드 뷰어 (`site/`)

**이 디렉토리는 AI위클리의 5대 핵심 탭(`인기 플러그인 · AI 뉴스 · 스타보드 · 라운지 · 점유율/성능`)을 렌더링하는 Vite 기반 초경량 멀티페이지 정적 웹 프론트엔드입니다.**<br>
전체 데이터 수집·보안 검증 파이프라인 및 아키텍처 상세는 [루트 README](../README.md)를 참고하세요.

</div>

---

## 🛠 기술 스택 및 특징
- **번들러 & 런타임**: Vite 8, HTML5, Vanilla ES Modules (`src/main.js`, `src/state.js`), CSS3 (`styles.css`)
- **글로벌 UX**: 다크/라이트 테마 전환(`localStorage`), 한/영 실시간 다국어 전환(`EN / KO`), 로컬 북마크(`⭐ 저장`), 단축키 `/` 즉시 검색
- **데이터 소스 (`public/data/`)**:
  - `latest.json`: 주간 인기 플러그인 (Rising / Classic)
  - `news_latest.json`: 일간 AI 뉴스 (8개 매체, 3대 포인트 & 심층 해설)
  - `stars_meta.json` & `stars_ledger.json`: 620개 오픈소스 메타데이터 및 시계열 스타 원장 (헤비·미들·라이트 3체급)
  - `lounge_latest.json`: GitHub Discussions 커뮤니티 스냅샷
  - `benchmarks_latest.json`: Statcounter AI 리퍼럴 점유율 및 LMArena·OpenRouter 프론티어 모델 벤치마크

## 💻 로컬 실행 및 빌드

프로젝트 루트 디렉토리에서 아래 명령어를 실행합니다:

```bash
npm run dev      # Vite 개발 서버 실행 (http://localhost:5173)
npm run build    # 프로덕션 정적 번들 빌드 (루트 dist/ 생성)
npm run preview  # 빌드 결과물 로컬 프리뷰
```

## 📂 디렉토리 구조
```text
site/
├── index.html          # 🧩 인기 플러그인 (메인 홈)
├── news.html           # 📰 AI 뉴스 뷰어
├── starboard.html      # 📈 스타보드 3체급 랭킹 뷰어
├── lounge.html         # 💬 AI 라운지 커뮤니티 뷰어
├── benchmarks.html     # 📊 점유율·성능 벤치마크 뷰어
├── styles.css          # 통합 스타일시트 (다크/라이트 테마 토큰)
├── src/
│   ├── main.js         # 5대 탭 데이터 로더, 필터링, 렌더링 및 이벤트 핸들러
│   └── state.js        # 전역 상태, 다국어 사전, 카테고리/시그널 상수, 로컬 북마크 저장소
└── public/
    ├── feed.xml        # 주간 플러그인 RSS 피드
    ├── news-feed.xml   # 데일리 AI 뉴스 RSS 피드
    └── data/           # 최신 JSON 데이터 및 주차별/일자별 아카이브(archive/)
```
