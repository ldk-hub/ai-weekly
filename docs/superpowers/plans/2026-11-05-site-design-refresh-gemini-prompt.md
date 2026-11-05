# AI위클리 사이트 디자인·UX 개선 — Gemini 3.8 실행 프롬프트 (Implementation Plan)

> **For agentic workers:** 이 문서 전체를 Gemini 3.8 에 그대로 붙여넣는다. 태스크는 P0 → P1 → P2 순서로 실행하고, 태스크마다 검증 후 커밋한다. 진행 상황은 체크박스(`- [ ]`)로 표시한다.

**Goal:** https://ldk-hub.github.io/ai-weekly/ 의 4개 탭(인기 플러그인, AI 뉴스, 스타보드, 점유율·성능)을 같은 디자인 시스템 안에서 일관되고 읽기 쉽게 다듬는다. 라운지는 제거하고, 화면에 잘못 보이는 데이터 표기를 바로잡는다.

**Architecture:** Vite 멀티 페이지 정적 사이트다(`site/*.html` + `site/styles.css` 3,745줄 + `site/src/main.js`). 디자인 토큰은 `design-system/ai-weekly-weeklaude/MASTER.md`(다크)와 `design-system/ai-weekly-weeklaude-light/MASTER.md`(라이트)에 정의돼 있다. 기존 Weeklaude 웜톤 다크 시스템을 유지하면서 다듬는 **진화형**이 본안이고, 브랜드 리프레시는 부록 시안으로만 제출한다.

**Tech Stack:** Vite, 바닐라 JS(ES Modules), 순수 CSS(커스텀 프로퍼티), Giscus(제거 대상), GitHub Pages.

## Global Constraints

- 언어: UI 라벨은 모두 KO/EN 두 벌로 쓴다. 기존 `data-i18n-ko` / `data-i18n-en` 속성 패턴과 `getLang()` + `lang === "en" ? … : …` 패턴을 그대로 쓴다.
- 새 의존성 추가 금지. 프레임워크(React, Tailwind 등) 도입 금지.
- 데이터 파일(`site/public/data/**`, `data/**`)과 수집 스크립트(`scripts/**`)는 수정 금지. 표시 로직(`site/src/**`)만 고친다.
- 색은 토큰(`var(--…)`)만 쓴다. 하드코딩 hex를 새로 추가하지 않는다.
- 대비: 본문 4.5:1 이상, 큰 글자(18.66px bold / 24px 이상) 3:1 이상. 다크·라이트 모두 지킨다.
- 반응형 기준 폭은 375 / 768 / 1024 / 1440px이다. 어느 폭에서도 `document.documentElement.scrollWidth <= innerWidth` 이어야 한다.
- `prefers-reduced-motion: reduce` 일 때 애니메이션을 끈다.
- 커밋은 태스크마다 1개씩, Conventional Commits 형식으로 남긴다(`fix(ui): …`, `feat(ui): …`).
- 시작 전과 끝난 뒤 `npm run build` 가 성공해야 한다.

---

## 0. 현황 실측 요약 (2026-11-05, 1440×900 · 375×812, 다크 모드)

| # | 탭 | 문제 | 근거 |
|---|---|---|---|
| A1 | 전 탭 | 히어로 h1 하이라이트(`.hl-mint`, `.hl-lemon`)가 다크 모드에서 반투명 배경 위 흰 글자라 "뜨고", "AI 소식", "성장하는", "점유율" 같은 핵심어가 오히려 흐리게 보인다 | `styles.css:182-213` |
| A2 | 전 탭 | 헤더 2행(갱신일·수집 수·지난 주차·구독)의 배치가 탭마다 다르다. 홈·뉴스는 별도 행에서 우측 정렬, 스타보드·라운지는 h1과 같은 행, 점유율은 h1 아래에서 우측 정렬 | 각 `site/*.html` 헤더 |
| A3 | 전 탭 | 구독 문구가 모든 탭에서 "매주 월요일, 이번 주 도구 요약을 메일로"로 같다. 뉴스·스타보드·점유율 맥락과 맞지 않는다 | `*.html:94~111` `.subscribe-hint` |
| A4 | 전 탭 | 탭 바 "점유율·성능" 옆 `NEW` 배지 → 제거 대상 | `*.html` `.pn-badge-new` |
| A5 | 전 탭 | 라운지는 상단 탭에 없고 푸터에만 링크가 있다 → **라운지 전체 제거** | `site/lounge.html`, 푸터 링크, `vite.config.js` input |
| A6 | 점유율 | 본문 컨테이너 폭이 푸터 폭과 달라 좌우 정렬선이 어긋난다. 콘텐츠가 짧아 푸터 위로 빈 공간이 크다 | benchmarks 풀페이지 |
| A7 | 점유율 | 변동 표기가 `▼ 2.0p`이다. aria-label은 `%p`인데 화면에는 `p`만 보인다. 1위 하락이 빨간색이라 경고처럼 읽힌다 | `main.js:3086` |
| A8 | 홈 | 카드 푸터(★ 수 / 태그 / GITHUB 버튼)의 세로 위치가 카드마다 다르고(태그 줄 수 차이), ★ 아이콘과 숫자가 위아래로 쪼개져 있다 | 홈 카드 그리드 |
| A9 | 홈 | `+39,484/w`(morluto/rea, 총 419k★)처럼 비정상 급증 값이 경고 표시 없이 메인 배지로 노출된다 | 홈 #02 카드 |
| A10 | 홈 | h3 카드 제목이 2줄 말줄임(…)으로 잘려 핵심 명사가 사라진다 | 홈 카드 |
| A11 | 스타보드 | 카드 좌상단 저장(☆) 버튼이 기본 체크박스처럼 보이고 순위 배지와 따로 논다(홈 카드는 우상단 원형 버튼) | starboard 카드 |
| A12 | 스타보드 | 범례(활발/둔화/방치)가 필터 바 아래 오른쪽에 떠 있어 어느 컨트롤에 대한 설명인지 알기 어렵다 | starboard |
| A13 | 뉴스 | AI타임스 기자 아바타가 빈 회색 사각형으로 나온다(fallback 없음) | news 3번째 카드 |
| A14 | 뉴스 | 카테고리 칩 9개가 한 줄에 꽉 차 있어 1024px 이하에서 줄바꿈이 불규칙하다 | news 칩 바 |
| A15 | 전 탭 | 칩·필터 컨트롤 높이와 radius가 탭마다 조금씩 다르다(세그먼트 탭, 칩, 드롭다운, 검색창) | 시각 비교 |

---

## P0 — 깨짐·오표기·구조 정리 (먼저 끝낼 것)

### Task 1: 라운지 제거 + NEW 배지 제거

**Files:**
- Delete: `site/lounge.html`
- Modify: `vite.config.js`(rollup `input`에서 lounge 항목 삭제), `site/index.html`, `site/news.html`, `site/starboard.html`, `site/benchmarks.html`(푸터 "라운지" 링크와 `.pn-badge-new` span 삭제)
- Modify: `site/src/**`에서 lounge, giscus 전용 코드(페이지 분기, Giscus 스크립트 로더, 라운지 카운트 fetch) 삭제
- Modify: `site/styles.css`에서 라운지·giscus 전용 셀렉터와 `.pn-badge-new` 규칙 삭제
- Modify: `site/public/sitemap.xml`에 lounge 항목이 있으면 삭제

- [ ] Step 1: `grep -rn "lounge\|giscus\|pn-badge-new" site vite.config.js` 결과를 기록한다.
- [ ] Step 2: 위 파일을 수정하고 `site/lounge.html`을 삭제한다(`git rm`).
- [ ] Step 3: 같은 grep을 다시 돌려 결과가 0건인지 확인한다(옵시디언·docs 문서는 대상 아님).
- [ ] Step 4: `npm run build` 성공, `dist/lounge.html`이 없는지 확인한다.
- [ ] Step 5: `git commit -m "feat(ui): remove lounge page and NEW badge"`

### Task 2: 점유율 변동 표기 수정

**Files:** Modify `site/src/main.js:3080-3090` 부근 변동 렌더 함수

- [ ] Step 1: 화면 텍스트를 `${arrow} ${abs}%p`로 바꾼다(KO/EN 공통).
- [ ] Step 2: 색 규칙: 상승 `--mint` 계열, 하락은 경고색 대신 중립 톤(`--ink-muted` 계열)을 쓴다. 0이거나 null이면 `—`와 muted 색을 쓴다.
- [ ] Step 3: 상단 KPI 카드("3곳 평균 점유율 1위 ▼ 2.0p")에도 같은 함수를 쓰게 한다. 중복 구현이 있으면 하나로 합친다.
- [ ] Step 4: 검증: benchmarks에서 6행 + KPI 카드가 모두 `%p`로 보이고, 라이트 모드에서 색 대비가 4.5:1 이상인지 확인한다.
- [ ] Step 5: 커밋

### Task 3: 비정상 증가량 표시 가드

**Files:** Modify `site/src/main.js`(홈 카드 velocity 배지 렌더부, 스타보드 카드 증가량 렌더부)

- [ ] Step 1: 렌더 단계에서만 판정한다(데이터는 수정하지 않는다). `velocity_7d / max(stars - velocity_7d, 1) > 0.5` 이거나 `v7d_estimated === true` 이면 배지에 `≈` 접두와 `title`/`aria-label` "추정치·검증 필요"(EN: "Estimated, unverified")를 붙이고 색을 muted로 바꾼다.
- [ ] Step 2: 판정 함수 `isSuspiciousVelocity(item)`를 `site/src/utils/`에 두고 홈과 스타보드가 함께 쓰게 한다.
- [ ] Step 3: 검증: 홈 #02(morluto/rea)에 가드가 적용되고 #01, #03은 그대로인지 확인한다.
- [ ] Step 4: 커밋

### Task 4: 히어로 하이라이트 가독성

**Files:** Modify `site/styles.css:180-215`

- [ ] Step 1: 다크 모드에서는 배경 박스를 빼고 형광펜 밑줄로 바꾼다. 예: `background: linear-gradient(transparent 62%, rgba(122,199,150,.35) 0)`, 글자색은 `--hl-mint-ink`처럼 채도 높은 밝은 토큰(대비 4.5:1 이상)을 쓴다. lemon도 같은 방식으로 바꾼다.
- [ ] Step 2: 라이트 모드는 기존 박스형을 유지하되 글자색을 `--ink`로 고정한다.
- [ ] Step 3: 새 토큰은 `:root` 다크·라이트 블록과 두 `MASTER.md`에 같이 등록한다.
- [ ] Step 4: 검증: 4개 탭 h1 스크린샷을 비교하고, 하이라이트 단어가 주변 글자보다 눈에 잘 띄는지 확인한다.
- [ ] Step 5: 커밋

### Task 5: 뉴스 아바타 fallback

**Files:** Modify `site/src/main.js`(뉴스 카드 아바타 렌더)

- [ ] Step 1: `img` `onerror`가 나거나 src가 없으면 매체 이니셜 원형 배지(예: "AI", 배경 `--surface-2`)로 대체한다. `alt`에는 기자명 또는 매체명을 넣는다.
- [ ] Step 2: 검증: AI타임스 카드에 빈 사각형이 없는지 확인한다.
- [ ] Step 3: 커밋

---

## P1 — 일관성(공통 헤더·컨트롤·카드)

### Task 6: 공통 페이지 헤더 레이아웃

**Files:** Modify 4개 `site/*.html` 헤더 마크업, `site/styles.css` `.hero-*`/`.unb-*` 규칙

- [ ] Step 1: 4개 탭 모두 같은 구조를 쓴다: 1행은 h1 + 서브카피(좌), 2행은 상태 메타(● 갱신일 · 다음 갱신 · 수집 수, 좌)와 액션(지난 주차/지난 뉴스 드롭다운 · 구독, 우).
- [ ] Step 2: 구독 문구를 탭 맥락에 맞게 바꾼다(KO/EN):
  - 홈: "매주 월요일, 이번 주 도구 요약을 메일로"(유지)
  - 뉴스: "매일 아침, 어제의 AI 신호 요약을 메일로" / "Every morning: yesterday's AI signals, by email"
  - 스타보드: "매주, 급성장 리포지토리 Top 10을 메일로" / "Weekly: top 10 fastest-growing repos, by email"
  - 점유율: "점유율·성능 변동이 생기면 메일로" / "Email me when share or rankings change"
  - 실제 구독 대상이 같은 리스트이면 문구만 바꾸고 폼 동작은 건드리지 않는다.
- [ ] Step 3: 메인 컨테이너와 푸터의 `max-width`·좌우 패딩을 같은 토큰 하나(`--container`)로 통일한다(A6 해결).
- [ ] Step 4: 콘텐츠가 짧은 페이지에서 푸터가 바닥에 붙도록 `body { min-height:100dvh; display:flex; flex-direction:column }` + `main { flex:1 }`을 적용한다.
- [ ] Step 5: 검증: 4개 탭 1440·768·375 스크린샷 12장에서 헤더 정렬선이 같은지 확인한다.
- [ ] Step 6: 커밋

### Task 7: 컨트롤 토큰 통일(세그먼트·칩·드롭다운·검색)

**Files:** Modify `site/styles.css`

- [ ] Step 1: 컨트롤 토큰을 정의한다: `--ctl-h: 36px`, `--ctl-h-sm: 30px`, `--ctl-radius: 999px`(칩·세그먼트) / `10px`(드롭다운·검색), `--ctl-gap: 8px`.
- [ ] Step 2: 홈 세그먼트(이번 주 뜨는/이미 유명한), 스타보드 체급 탭, 점유율 탭(3곳 평균/3대 리더보드)을 모두 같은 `.segmented` 스타일로 맞춘다.
- [ ] Step 3: 카테고리 칩(홈 5개, 뉴스 9개)은 1024px 이하에서 `flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x proximity`로 바꾸고 좌우 페이드 마스크를 넣는다(A14).
- [ ] Step 4: 모든 인터랙티브 요소에 `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }`를 적용한다.
- [ ] Step 5: 터치 타깃은 최소 44×44px로 한다(모바일).
- [ ] Step 6: 커밋

### Task 8: 카드 컴포넌트 정렬(홈·스타보드·뉴스)

**Files:** Modify `site/styles.css` 카드 규칙, `site/src/main.js` 카드 템플릿

- [ ] Step 1: 카드를 `display:flex; flex-direction:column`으로 만들고 푸터에 `margin-top:auto`를 줘서 같은 행의 카드 푸터 높이를 맞춘다(A8).
- [ ] Step 2: 푸터를 한 줄로 정리한다: `★ 1.1k`(아이콘과 숫자를 inline으로 붙임) · 태그 최대 3개(넘치면 `+N`) · GITHUB 버튼.
- [ ] Step 3: 제목은 2줄 clamp를 유지하되 `title` 속성에 전체 제목을 넣는다. 카드 데이터에 짧은 제목 필드가 있으면 그것을 우선 쓴다(A10).
- [ ] Step 4: 스타보드 저장 버튼을 홈과 같은 우상단 원형 아이콘 버튼으로 바꾸고 `aria-pressed`를 단다. 순위 배지는 좌상단으로 옮긴다(A11). 홈 카드도 같은 배치(순위 좌, 저장 우)로 맞춘다.
- [ ] Step 5: 스타보드 범례를 "상태" 드롭다운 옆 ⓘ 툴팁/팝오버로 옮긴다(A12).
- [ ] Step 6: 검증: 1440px 3열에서 같은 행 카드의 푸터 y좌표 차이가 0~1px인지 `getBoundingClientRect`로 확인한다.
- [ ] Step 7: 커밋

---

## P2 — 완성도·접근성·퍼포먼스

### Task 9: 접근성 마감

- [ ] 탭 링크에는 `aria-current="page"`, 세그먼트에는 `role="tablist"`/`aria-selected`/`aria-controls`, 칩에는 `aria-pressed`를 단다.
- [ ] h1 다음에 h3로 건너뛰지 않게 heading 계층을 정리한다(카드 그리드 위에 시각적으로 숨긴 h2를 둔다).
- [ ] 상세 모달을 열면 포커스를 모달 안으로 옮기고, 닫으면 트리거로 되돌리고, Esc로 닫히게 한다.
- [ ] 라이트 모드 저대비 토큰(`--accent` 12px 텍스트, `--mint` 숫자, `.rank-pill.is-top`)을 4.5:1 이상으로 보정한다.
- [ ] 검증: Chrome DevTools Lighthouse Accessibility 95 이상(4개 탭).

### Task 10: 스타보드 렌더 성능

- [ ] 체급 탭당 첫 렌더는 30개로 하고, `IntersectionObserver`로 무한 스크롤 또는 "더 보기"를 붙인다(라이트급 339개를 한 번에 그리지 않게).
- [ ] 검증: 라이트급 탭 DOM 노드 수가 2,000 이하, Lighthouse Performance 85 이상.

### Task 11: 마이크로 인터랙션(선택)

- [ ] 카드 hover 시 `translateY(-2px)` + 그림자 단계 상승(150ms ease-out).
- [ ] 점유율 바는 첫 진입 시 0에서 실제 값까지 600ms로 채운다. 둘 다 `prefers-reduced-motion`이면 끈다.

---

## 부록 A — 브랜드 리프레시 시안 (구현하지 말고 제안서로만 제출)

`docs/design-refresh-proposal.md`에 다음을 작성한다.

1. **컨셉 2안**
   - A안 "Signal Terminal": 터미널·모노스페이스 악센트, 다크 그라파이트 + 앰버 하나만 포인트로 쓴다. 개발자 신호 대시보드 느낌.
   - B안 "Editorial Weekly": 매거진형 큰 세리프 헤드라인, 이슈 번호(Vol. 35), 크림 라이트 기본.
2. 안마다 토큰 표(배경/표면/잉크/악센트/상태색 hex와 대비비), 타이포 페어링, 히어로 배너 와이어프레임(1440×360, 375×280), 홈 카드 1개 목업(HTML 스니펫)을 넣는다.
3. 현행 대비 장단점과 이행 비용(변경할 셀렉터 수 추정)을 적는다.

---

## 완료 보고 형식 (Gemini가 마지막에 출력)

1. 태스크별 완료 여부 표(Task, 커밋 해시, 검증 결과)
2. 4개 탭 × 3개 폭 Before/After 스크린샷 경로
3. Lighthouse 점수 표(Perf / A11y / Best Practices / SEO, 탭별)
4. 판단을 바꾼 지점과 그 이유, 남은 이슈
5. `npm run sync:obsidian` 실행 결과(옵시디언 볼트 작업일지 반영)
