# AI위클리 브랜드 리프레시 디자인 제안서 (Design Refresh Proposal)

> **Document Version:** v1.0.0 (2026-11-05)  
> **Target System:** AI위클리 (Claude Code 도구 주간 인덱스 & AI 생태계 대시보드)  
> **Reference Plan:** `docs/superpowers/plans/2026-11-05-site-design-refresh-gemini-prompt.md` 부록 A

---

## 1. 개요 (Executive Summary)

본 문서는 AI위클리(ai-weekly)의 현행 **Weeklaude 진화형(Evolutionary Enhancement)** 베이스라인 위에 추가 검토 가능한 2가지 브랜드 리프레시 시안(**A안: Signal Terminal**, **B안: Editorial Weekly**)의 디자인 토큰, 타이포그래피, 와이어프레임 및 구현 상세를 정의합니다.

모든 시안은 **WCAG 2.1 AA(명암비 4.5:1 이상)** 준수, 반응형 레이아웃(375px / 768px / 1024px / 1440px), 그리고 실측 검증된 15대 개선 과제(A1~A15)를 공통 기반으로 채택합니다.

---

## 2. 디자인 시안 비교 요약표 (Comparison Matrix)

| 구분 | 현행 진화형 (Weeklaude Base) | Concept A: Signal Terminal | Concept B: Editorial Weekly |
| :--- | :--- | :--- | :--- |
| **디자인 무드** | 웜톤 차콜 & 테라코타 클로드 일관성 | 개발자 텔레메트리, 고성능 터미널 레이더 | 주간 기술 매거진, 정갈한 활판 인쇄미 |
| **배경 (다크)** | `#161410` (Warm Dark) | `#0B0F14` (Deep Graphite Obsidian) | `#141416` (Deep Ink Black) |
| **배경 (라이트)** | `#FBFAF6` (Warm Paper) | `#F0F4F8` (Cool Slate Canvas) | `#FCFAF4` (Warm Cream Editorial) |
| **핵심 포인트 컬러** | `#D97757` (Anthropic Terracotta) | `#F59E0B` (Amber Phosphor) | `#0284C7` / `#1E293B` (Refined Ink/Cyan) |
| **상태 표시 (Up/Down)** | Up `#4FD4A3` / Down `#8C857B` (Muted) | Up `#10B981` / Down `#64748B` (Muted) | Up `#0D9488` / Down `#94A3B8` (Muted) |
| **타이포그래피** | Sans (Inter / Pretendard) | Mono Accents (JetBrains Mono + Sans) | Editorial Serif (Newsreader/Merriweather + Sans) |
| **히어로 스타일** | 부드러운 형광펜 언더라인 강조 | 모노스페이스 실시간 텔레메트리 메트릭스 | 볼드 세리프 헤드라인 & Vol. 번호 배지 |
| **적합 사용자층** | 기존 사용자 및 일반 AI 개발자 | 하드코어 CLI/인프라/에이전트 엔지니어 | 기술 리드, 기획자, 심층 리서처 |
| **마이그레이션 비용** | **최소 (0~5% 변동)** — 즉시 배포 가능 | **낮음 (CSS 변수 15개 교체)** | **보통 (폰트 로드 1종 추가 + 토큰 교체)** |

---

## 3. Concept A: "Signal Terminal" (개발자 터미널 대시보드)

### 3.1. 컨셉 정의 및 페르소나
- **컨셉 모토:** *"Every signal in the AI runtime, monitored."*
- 개발자 콘솔, Bloomberg 터미널, 고성능 모니터링 대시보드의 정밀성과 기능성을 극대화한 테마입니다.
- 불필요한 장식을 배제하고 고대비 앰버(Amber)와 에메랄드(Emerald) 발광 인디케이터, 모노스페이스 수치 정렬로 실시간 신호 감지 느낌을 전달합니다.

### 3.2. 디자인 토큰 사양 (Design Tokens)

```css
/* Concept A: Signal Terminal Token Set */
:root[data-theme="terminal"] {
  --bg:           #0b0f14;
  --card:         #111822;
  --card-hover:   #172230;
  --pill:         #16202c;
  --border:       #1e2d3d;
  --border-hover: #2b3e54;

  --ink:          #f0f6fc;
  --ink-2:        #c9d1d9;
  --muted:        #8b949e;
  --soft:         #30363d;

  --accent:       #f59e0b; /* Amber Phosphor */
  --accent-text:  #fbbf24;
  --accent-glow:  rgba(245, 158, 11, 0.18);

  --mint:         #10b981; /* Terminal Green */
  --coral:        #f43f5e;
  --bm-up:        #10b981;
  --bm-down:      #8b949e; /* 중립 하락색 */

  --hl-mint:      linear-gradient(transparent 65%, rgba(16, 185, 129, 0.35) 0);
  --hl-lemon:     linear-gradient(transparent 65%, rgba(245, 158, 11, 0.35) 0);
  --hl-mint-ink:  #34d399;
  --hl-lemon-ink: #fbbf24;

  --font-mono:    "JetBrains Mono", "SF Mono", Consolas, monospace;
}
```

### 3.3. 타이포그래피 페어링
- **헤딩:** Inter 700 / Semi-bold (letter-spacing: -0.02em)
- **수치·지표·코드:** JetBrains Mono 500 / 700 (고정폭 tabular-nums)
- **본문:** Pretendard / Inter 400 (line-height: 1.55)

### 3.4. 히어로 배너 와이어프레임
```
+---------------------------------------------------------------------------------------+
|  [SYS_STATUS: ONLINE]   ● LIVE FEED: 2026-11-05   NEXT: 2026-11-12   NODES: 48 REPOS  |
|                                                                                       |
|  > SYSTEM: WHAT'S _RISING_ IN CLAUDE CODE, WHAT'S _STABLE_.                           |
|  Telemetry index of AGENTS · SKILLS · HARNESSES · MCPS (latency: 12ms)                |
|                                                                                       |
|  [ 🔥 RISING: 18 ]  [ ⭐ CLASSIC: 30 ]           [ SEARCH: / ]  [ SORT: VELOCITY ▼ ]  |
+---------------------------------------------------------------------------------------+
```

### 3.5. 카드 목업 (HTML 스니펫)
```html
<article class="card terminal-card" data-id="morluto/rea">
  <div class="card-head">
    <span class="term-prompt">REC://</span>
    <span class="rank-pill is-top">#01</span>
    <span class="badge-anomaly" title="추정치·검증 필요">≈ +27,943/w ⚠️</span>
    <button class="plugin-save-btn" aria-label="리포지토리 저장">☆</button>
  </div>
  <h3 class="card-title font-mono">morluto/rea</h3>
  <p class="card-desc">앱 동작 분석부터 네이티브 바이너리까지 자율 조사하는 역공학 에이전트</p>
  <div class="card-foot">
    <span class="stars-line font-mono">★ 430.8k</span>
    <span class="card-tags-inline">#reverse-engineering #binary #agent</span>
    <a class="repo-link font-mono" href="https://github.com/morluto/rea">EXEC GITHUB →</a>
  </div>
</article>
```

---

## 4. Concept B: "Editorial Weekly" (프리미엄 기술 매거진)

### 4.1. 컨셉 정의 및 페르소나
- **컨셉 모토:** *"The curated journal of the Claude Code renaissance."*
- 뉴욕타임스 테크 에디션, 더 버지(The Verge), 스트래티처리(Stratechery) 스타일의 정제된 주간 간행물 테마입니다.
- 섬세한 세리프 헤드라인과 정돈된 마진, 크림톤 라이트 모드를 전면에 내세워 긴 글과 주간 요약을 편안하게 정독할 수 있도록 최적화했습니다.

### 4.2. 디자인 토큰 사양 (Design Tokens)

```css
/* Concept B: Editorial Weekly Token Set */
:root[data-theme="editorial"] {
  --bg:           #fcfaf4;
  --card:         #ffffff;
  --card-hover:   #f7f4ec;
  --pill:         #f1ece0;
  --border:       #e5dec9;
  --border-hover: #d2c8ae;

  --ink:          #18181b;
  --ink-2:        #3f3f46;
  --muted:        #71717a;
  --soft:         #d4d4d8;

  --accent:       #0f172a; /* Editorial Deep Slate */
  --accent-text:  #0f172a;
  --brand-serif:  "Newsreader", "Georgia", "Iowan Old Style", serif;

  --mint:         #0d9488;
  --coral:        #e11d48;
  --bm-up:        #0d9488;
  --bm-down:      #71717a; /* 중립 하락색 */

  --hl-mint:      #e6f4ea;
  --hl-lemon:     #fef3c7;
  --hl-mint-ink:  #0f5132;
  --hl-lemon-ink: #854d0e;
}
```

### 4.3. 타이포그래피 페어링
- **헤딩:** Newsreader / Georgia (Serif, Italic 강조 결합)
- **메타 및 레이블:** Inter / 산돌 에이투지체 (고선명 Sans)
- **본문:** Pretendard 400 (line-height: 1.68, 자간 -0.01em)

### 4.4. 히어로 배너 와이어프레임
```
+---------------------------------------------------------------------------------------+
|  THE AI WEEKLY GAZETTE                        VOL. 35 · ISSUE NOV 05, 2026 · CURATED  |
|  ===================================================================================  |
|                                                                                       |
|   What's Rising in Claude Code, and What's Here to Stay.                              |
|   A thoughtful weekly digest of agents, skills, harnesses, and MCP infrastructure.    |
|                                                                                       |
|  ● Updated: Today, 09:00 AM   ·   Next Issue: Nov 12   ·   48 Selected Curations      |
|  [ Past Issues ▾ ]  "Every Monday: this week's tools, by email" [ Subscribe ]         |
+---------------------------------------------------------------------------------------+
```

### 4.5. 카드 목업 (HTML 스니펫)
```html
<article class="card editorial-card" data-id="nateherkai/roast-room">
  <div class="card-head">
    <span class="vol-stamp">VOL.35 · NO.01</span>
    <span class="category-label">AI SKILL</span>
    <button class="plugin-save-btn" aria-label="북마크">☆</button>
  </div>
  <h3 class="card-title font-serif">roast-room: 7인의 가상 멘토가 제공하는 혹독한 제품 피드백</h3>
  <p class="card-usecase">💡 이런 분께 추천: 출시 전 사업 모델의 치명적 맹점을 혹독하게 점검받고 싶을 때</p>
  <div class="card-foot">
    <span class="stars-line">★ 1,872</span>
    <span class="card-tags-inline">#roast-room #feedback #claude-skill</span>
    <a class="repo-link font-serif" href="https://github.com/nateherkai/roast-room">Read on GitHub →</a>
  </div>
</article>
```

---

## 5. 15대 개선 과제(A1~A15) 반영 내역

본 프로토타입(`site/prototype.html`)은 위 컨셉 2종과 더불어 실측 분석된 15대 문제점을 단 하나도 누락 없이 구현 및 검증했습니다:

1. **A1 (히어로 h1 하이라이트)**: 다크 모드 형광펜 언더라인 그라디언트 + 고채도 밝은 토큰(`--hl-mint-ink: #5eedbe`, `--hl-lemon-ink: #ffe066`) 적용으로 명암비 6.5:1 이상 확보.
2. **A2 (공통 헤더 2행 레이아웃)**: 4개 탭 모두 [1행: 타이틀+서브카피, 2행: 상태메타(좌) + 지난주차·구독(우)] 완전 일원화.
3. **A3 (탭별 맞춤 구독 문구)**: 홈(도구 요약), 뉴스(데일리 AI 신호), 스타보드(급성장 Top 10), 점유율(순위 변동) 맥락형 카피 반영.
4. **A4 (NEW 배지 제거)**: 네비게이션 점유율·성능 탭의 불필요한 `NEW` 배지 완전 제거.
5. **A5 (라운지 제거)**: 상단 탭, 푸터, 스크립트에서 라운지 완전 제거 (4개 탭 고정).
6. **A6 (컨테이너 폭 정렬 & 스티키 푸터)**: `--container: min(1200px, calc(100vw - 48px))`로 헤더/본문/푸터 정렬선 일치 및 `min-height: 100dvh`로 푸터 뜸 방지.
7. **A7 (점유율 %p 표기 & 중립 하락색)**: `▼ 2.0%p` 화면 표기 및 하락 시 경고성 빨강 대신 차분한 중립 톤(`--ink-muted`) 적용.
8. **A8 (카드 푸터 세로 정렬)**: `display: flex; flex-direction: column;` 및 `.card-foot { margin-top: auto; }`로 행별 하단 라인 100% 일치.
9. **A9 (비정상 급증치 가드)**: `morluto/rea` 등 비정상 급증치에 `≈` 접두, `⚠️ 추정치·검증 필요` 툴팁 및 중립 배지 처리.
10. **A10 (제목 2줄 clamp + 전체 제목)**: 제목 말줄임 유지 및 hover 시 `title` 툴팁으로 전체 제목 제공.
11. **A11 (스타보드 저장/순위 배지 통일)**: 좌상단 순위 배지, 우상단 원형 아이콘 북마크 버튼(`aria-pressed`)으로 홈 카드와 통일.
12. **A12 (스타보드 범례 팝오버)**: 둥둥 떠 있던 범례를 상태 드롭다운 옆 `ⓘ` 버튼 팝오버로 정돈.
13. **A13 (뉴스 아바타 fallback)**: 외부 이미지 실패 시 매체 이니셜 원형 배지(`AI`, `GN`, `HN`) 순수 CSS/SVG 즉각 렌더링.
14. **A14 (뉴스 카테고리 칩 1024px 스크롤)**: 태블릿/모바일에서 1줄 가로 스크롤 및 좌우 페이드 마스크 적용.
15. **A15 (컨트롤 토큰 통일)**: `--ctl-h: 36px`, `--ctl-radius: 999px / 10px`, `:focus-visible` 링 일원화.

---

## 6. 결론 및 추천 경로 (Recommendation)

- **1차 릴리스 권장안:** 현행 **Weeklaude 진화형(Base)** 테마에 A1~A15 개선 사항을 우선 반영하여 배포. 기존 사용자의 익숙함을 해치지 않으면서 완성도와 가독성을 즉각 극대화합니다.
- **2차 확장안:** 상단 테마 토글에 "Signal Terminal" 테마 옵션을 추가하여 CLI 및 에이전트 사용자들의 취향에 맞춘 하이퍼-테크 뷰를 제공하는 방안을 제안합니다.
- 본 프로토타입은 브라우저에서 `site/prototype.html`을 열어 4개 탭, 테마 전환, 언어 전환 및 A1~A15 검증 인스펙터를 즉시 시연할 수 있습니다.
