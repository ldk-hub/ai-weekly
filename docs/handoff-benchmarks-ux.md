# 작업지시서 — 「점유율·성능」 페이지 한눈에 보기 개선 (2단계)

수행 주체: Gemini (Antigravity, ai-weekly 저장소를 연 상태)
설계·검수: Claude Code 세션
작성일: 2026-10-22
성격: **구현 작업.** 설계는 시안으로 확정됐다. 시안을 실제 페이지 코드로 옮긴다. 커밋과 배포는 하지 않는다.
선행 조건: 1단계 `docs/handoff-benchmarks-data.md` 가 끝나서 `node .tmp/handoff-benchmarks/verify-data.mjs` 가 PASS 인 상태에서 시작한다. 데이터는 1단계에서 새로 모은 값이라 시안 화면의 숫자와 다르다. 정상이다.

> **대안 비교는 생략한다.** 설계가 끝난 구현 작업이므로 `.agents/AGENTS.md` §1(대안 2~3개 비교, 트레이드오프 표)은 적용하지 않는다. 시안과 다르게 해야 할 이유가 생기면 그 부분만 멈추고, 이유를 보고서 6절에 적는다. §3 "수술적 변경" 원칙은 그대로 따른다.

---

## 0. 배경과 목표

**목표:** 처음 들어온 사람이 스크롤하지 않고 "누가 많이 쓰나, 누가 잘하나"를 바로 읽게 만든다.

**대상:** 커밋 전 신규 페이지 `site/benchmarks.html`. 점유율 탭과 성능 탭이 있다.

**시안(정답 레퍼런스):** `.tmp/handoff-benchmarks/benchmarks-proposal.html`
- 실제 사이트 CSS 를 `http://localhost:5173/styles.css` 에서 불러오는 정적 페이지다. `npm run dev` 가 5173 포트에 떠 있는 상태에서 브라우저로 연다(file:// 로 열어도 된다).
- 시안의 모습과 동작을 실제 페이지에서 똑같이 재현하는 것이 이번 작업이다. 시안의 숫자는 1단계 검수 때 원본으로 확인한 정정 예시이고, 실제 페이지는 1단계 결과 데이터를 그대로 쓴다.
- 시안의 주황 번호 핀, 맨 위 안내 바, 맨 아래 「변경점 목록」·「지금 vs 제안」은 리뷰용이다. 옮기지 않는다.
- 시안 소스에는 `[이식]`(옮길 것)과 `[리뷰 전용]`(옮기지 말 것) 주석이 붙어 있다.

**지금 문제와 목표** (번호는 리뷰 보고서의 우선순위 번호다. 이 문서 전체에서 같은 번호를 쓴다)

| 번호 | 문제 | 지금(실측) | 목표 |
|---|---|---|---|
| 1 | 다크 모드에서 1위 강조값과 배지 글자가 거의 안 보인다 | 대비 1.4~1.9 : 1 | 4.5 : 1 이상 (시안 5.4~9.0) |
| 1 | 라이트 모드에서 상승·하락 글자 대비가 낮다 | 2.9 · 3.1 : 1 | 4.5 : 1 이상 (시안 5.4 · 5.5) |
| 2 | 첫 화면에 데이터가 없다 | 표 첫 줄이 754px (1024×768), 1414px (375×812) | 1024×768 첫 화면 안에 점유율 목록 전체 (시안 기준 약 366~677px) |
| 3 | 같은 숫자를 세 번 그린다 | 누적 막대 + 범례 + 행별 막대 + 숫자 + 설명 열 | 막대 목록 하나 |
| 4 | 출처·기준일이 없다. 갱신 일정이 없는데 "다음 10/26 (월)"이 뜬다 | — | 출처 한 줄, "다음 갱신" 숨김 |
| 5 | 성능 표를 비교하기 어렵다 | 숫자 왼쪽 정렬, `73%`·`69.4%` 자릿수 혼재, 배지 때문에 모델명이 2~3줄 | 시안의 표 |
| 6 | 필터 칩이 탭과 맞지 않는다 | 점유율 탭에서 칩 2개가 무반응, 성능 탭에서 칩 2개의 결과가 같다 | 성능 탭에만 정렬 버튼 |
| 7 | KPI 칩의 의미가 섞이고, 하드코딩 기본값이 있다 | "Elo 1382"가 초록색 '상승'처럼 보인다. 로딩이 실패하면 가짜 값이 뜬다 | 요약 칩 4개, 기본값 없음 |
| 8 | 모바일에서 점유율 열이 잘린다 | 표 683px, 화면 349px | 한 줄 리스트 |
| 12 | 전월 대비 단위가 모호하다 | `+3.6%` | `▲ 3.6p` |
| 13 | 클릭하면 키보드 포커스가 사라진다 | 포커스가 body 로 이동 | 누른 버튼에 유지 |

---

## 1. 검증된 사실 — 이 전제로 작업하라

작업 전에 확인을 마친 것들이다. 다시 조사하거나 문제로 지적할 필요가 없다.

1. **시스템 다크 버그의 원인.** localStorage 에 테마 값(`aiw-theme`)이 없으면 `<html>` 에 `data-theme` 속성이 붙지 않는다. 테마 변수는 두 블록이 처리한다: `styles.css:37`(`html[data-theme="dark"]`)과 `styles.css:62~63`(`@media (prefers-color-scheme: dark) { html:not([data-theme="light"]) }`). 반면 `html[data-theme="dark"] .bm-…` 같은 컴포넌트 규칙은 시스템 다크에서 적용되지 않는다. 그래서 글자색을 고정 hex 로 쓰지 말고 변수로 써야 한다.
2. **`.hero-titles p` 도 같은 문제가 있다.** 이 규칙의 색(`#6F6A61`)은 시스템 다크에서 대비가 3.4:1 이다. 새로 만드는 출처 줄은 `.hero-titles .bm-source` 처럼 선택자를 두 단계로 써서 이 규칙보다 우선하게 한다.
3. **검색창을 지워도 안전하다.** `#search` 를 참조하는 코드(main.js:1168, 1264, 1697, 1704, 1779, 1981)는 모두 요소가 없을 때를 처리한다.
4. **HTML 요소만 지워도 숨겨진다.** `renderUpdateBar()`(main.js:193)와 `renderPageSummary()`(main.js:123)는 대상 요소가 없으면 그 부분을 건너뛴다. "다음 갱신"과 요약 문구는 HTML 에서 요소를 지우는 것만으로 숨길 수 있다. 공유 JS 는 고치지 않는다.
5. **`bm-*` 클래스는 이 페이지 전용이다.** `badge-coding`·`badge-open`·`badge-general` 도 마찬가지다. main.js 2090~2332행과 styles.css 2660~2964행 밖에서는 쓰이지 않고, 다른 HTML 4개에서도 쓰이지 않는다.
6. **언어 전환은 `render()` 를 다시 부른다**(main.js:1592~1601). 새 문구는 기존 코드처럼 `getLang() === "en" ? … : …` 로 쓰면 영문 전환이 된다.
7. **데이터는 1단계에서 새로 모았다.** 형식은 `docs/handoff-benchmarks-data.md` 4절을 따른다. 바뀐 점은 네 가지다.
   - `sources` 배열이 생겼다(트래픽·선호도·코딩·가격 출처).
   - `summary` 는 없다.
   - **코딩 지표는 `arena_coding_elo`(Arena Coding 카테고리 점수)다.** `swe_bench_verified` 는 쓰지 않는다. 최신 모델은 회사 발표에 SWE-bench Verified 를 더 이상 싣지 않는다.
   - `arena_coding_elo`·`gpqa_diamond`·`mmlu_pro`·`mom_change` 는 `null` 일 수 있다.

   이 작업에서는 데이터, `evidence/`, 검문 스크립트를 고치지 않는다.
8. **데이터 파일 해시:** 작업을 시작할 때 `shasum -a 256 site/public/data/benchmarks_latest.json` 값을 보고서에 적는다. 끝날 때 같은 값이어야 한다.
9. **데이터 검문은 `node .tmp/handoff-benchmarks/verify-data.mjs` 다.** 작업 전과 후 모두 PASS 여야 한다.
   - 옛 검증 스크립트 `scripts/benchmarks/curate-benchmarks.js` 는 새 형식과 맞지 않아 실패할 수 있다. 고치지 않는다.
   - `package.json` 에 `"type"` 을 추가하지 않는다(다른 CommonJS 스크립트가 깨진다).

---

## 2. 작업 범위

**고칠 파일은 4개다. 다른 파일은 고치지 않는다.**

| 파일 | 고칠 곳 |
|---|---|
| `site/benchmarks.html` | 헤더 영역(81~123행)만 |
| `site/src/main.js` | `load()` 의 benchmarks 분기(7~19행), `renderBenchmarks()` 와 그 클릭 핸들러(2090~2332행)만. 다른 함수는 건드리지 않는다. 137~144행의 benchmarks 분기는 요소가 없어 실행되지 않으니 그대로 둔다 |
| `site/styles.css` | 2660~2964행 Benchmarks 블록을 교체한다. 변수 블록 3곳(`:root` 1~35행, 37행, 62~63행)에 토큰 2개를 추가한다 |
| `site/src/state.js` | `STATE` 의 benchmark 필드만 |

**시안에서 옮기는 규칙**

- CSS: `[이식]` 주석이 붙은 블록만 옮긴다. 접두사 `pp-` 는 `bm-` 으로, 토큰 `--pp-up`·`--pp-down` 은 `--bm-up`·`--bm-down` 으로 바꾼다.
- JS: 시안의 포맷터(`f1`·`f2`·`fInt`·`fCtx`·`chg`·`blended`), `METRICS`, `renderSummary`·`renderShare`·`sortedModels`·`renderBench`·`renderTabs`·`refocus` 로직을 옮긴다. 다만 다음은 바꾼다.
  - `esc` 대신 main.js 에 있는 `escapeHTML` 을 쓴다.
  - 시안의 `DATA` 대신 `STATE.data` 를 쓴다.
  - 시안의 `state` 객체 대신 `STATE.benchmarkTab`·`STATE.benchmarkSort`·`STATE.benchmarkOthersOpen` 을 쓴다.
- 시안에서는 요약 칩과 탭 바가 정적 HTML 이다. **실제 페이지에서는 전부 `renderBenchmarks()` 가 `#benchmarks-container` 안에 그린다.** 이벤트는 컨테이너 한 곳에서 위임으로 받는다.
- 다음은 옮기지 않는다: 안내 바, 번호 핀(`data-pin`·`.pin-r`), 변경점 목록, 지금 vs 제안, `.pp-ex` '예시' 태그, `applyTheme` 와 테마 버튼 분기, `.pp-new`, `renderUpdated`(실제 페이지는 `renderUpdateBar` 를 쓴다).

---

## 3. 작업 항목 (이 순서로)

### 3-1. `benchmarks.html` 헤더 정리 (②④)

1. 81행 `h1` 문구를 시안처럼 줄인다.
   - KO: `AI <span class='hl-mint'>점유율</span>과 프론티어 <span class='hl-lemon'>성능</span>`
   - EN: `AI <span class='hl-mint'>Share</span> &amp; Frontier <span class='hl-lemon'>Performance</span>`
   - `data-i18n-ko-html`·`data-i18n-en-html` 속성과 본문 세 곳을 함께 바꾼다.
2. 82행 `.hero-p` 를 `<p class="hero-p bm-source" id="bm-source"></p>` 로 바꾼다. `data-i18n-*` 속성은 붙이지 않는다. 붙이면 언어 전환 때 `applyLang()` 이 내용을 덮어쓴다.
3. 89~94행에서 다음 6개를 지운다: `#next-at-sep`, `#next-at-container`, `#version-sep`, `#version-pill`, 93행 구분점(`.update-sep`), `#page-summary`. 남는 것은 초록 점, "날짜 (요일) 갱신", 구독 버튼이다.
4. 115~123행 검색창 블록(`<!-- 검색창 바 -->` 와 `.unified-nav-box`)을 지운다.
5. 129행 로딩 문구는 그대로 둔다.

### 3-2. 데이터 로딩 (main.js 7~19행)

1. `fetch` 다음에 `if (!res.ok) throw new Error("HTTP " + res.status);` 를 넣는다.
2. 실패하면 `STATE.data = null` 로 둔다. 지금처럼 빈 배열로 바꿔 넣지 않는다.
3. `renderBenchmarks()` 는 `STATE.data` 가 없으면 컨테이너에 오류 문구 한 줄만 그린다.
   - KO: `점유율·성능 데이터를 불러오지 못했습니다.`
   - EN: `Couldn't load the share and benchmark data.`
   - 지금은 이때 "검색 조건에 맞는 서비스가 없습니다"와 가짜 KPI 값이 뜬다. 이 동작을 없앤다.

### 3-3. 요약 칩 (⑦②)

1. KPI 카드 4장을 지우고 칩 4개를 한 줄에 둔다. 900px 이하에서는 2×2 로 배치한다.
2. 칩 구조: 윗줄은 작은 회색 라벨이고, 오른쪽에 변화량이나 힌트가 붙는다. 아랫줄은 이름(넘치면 말줄임)과 오른쪽의 굵은 값이다.

| 칩 | 값 계산 | 표시 형식 | 클릭하면 |
|---|---|---|---|
| 트래픽 1위 | `market_shares` 에서 `share_pct` 최대 | `{name}` · `{share_pct 소수 2자리}%`. `mom_change` 가 있을 때만 윗줄 오른쪽에 `▼ 1.80p` 형식 변화량 | 점유율 탭 |
| 코딩 1위 | `model_benchmarks` 에서 `arena_coding_elo` 최대 | `{model}` · `{천 단위 쉼표}점` | 성능 탭 + 코딩 정렬 |
| 선호도 1위 | `arena_elo` 최대 | `{model}` · `{천 단위 쉼표}점` | 성능 탭 + 선호도 정렬 |
| 가성비 1위 | `arena_coding_elo` 가 중앙값 이상(상위 절반)인 모델 중 혼합 단가 최저 | `{model}` · `${입력} / ${출력}`, 윗줄 힌트 `코딩 상위 절반 중 최저가` | 성능 탭 + 가격 정렬 |

3. 혼합 단가는 `(3 × pricing_in_1m + pricing_out_1m) / 4` 로 계산한다. 중앙값은 `arena_coding_elo` 값들을 오름차순으로 놓았을 때 `Math.floor(개수 / 2)` 번째(0부터) 값이다. 10개면 위에서 5개가 상위 절반이 된다.
4. 값은 `summary` 필드가 아니라 배열에서 계산한다. `?? "ChatGPT"`, `?? 58.5` 같은 하드코딩 기본값은 전부 지운다.
5. 값이 `null` 인 모델은 빼고 계산한다. 조건에 맞는 모델이 하나도 없으면 칩의 이름과 값을 `—` 로 둔다.
6. 색은 변화량(▲▼)에만 쓴다. 점수 값에는 색을 쓰지 않는다.
7. 칩을 누르면 탭과 정렬을 바꾸고 툴바로 부드럽게 스크롤한다(`scrollIntoView({ behavior: "smooth", block: "start" })`).
8. "개발자 토큰 점유율"은 표시하지 않는다. 근거가 되는 표도 출처도 없기 때문이다.

### 3-4. 출처 한 줄 (④)

1. `#bm-source` 는 `renderBenchmarks()` 가 채운다.
2. `STATE.data.sources` 에서 `header: true` 인 항목만 배열 순서대로 골라, `출처` 다음에 `{label} {name} ({as_of})` 를 ` · ` 로 이어 쓴다. `name` 은 `url` 링크로 만든다(새 탭, `rel="noopener noreferrer"`).
3. `header: true` 인 출처가 하나도 없으면 `출처·기준일 미기재` 를 표시한다.
4. 색 규칙: `.hero-titles .bm-source { font-size: 13px; color: var(--muted); }`, `.hero-titles .bm-source strong { color: var(--ink-2); }`, `.hero-titles .bm-source a { color: var(--ink-2); text-decoration: underline; text-underline-offset: 2px; }`. 이유는 1절 2번.

### 3-5. 탭과 정렬 (⑥)

1. 컨테이너 안 순서: 요약 칩 → 툴바(왼쪽 탭, 오른쪽 정렬) → 점유율 패널 → 성능 패널.
2. **두 패널을 항상 DOM 에 그리고 `hidden` 속성으로 전환한다.** 6절의 측정 스니펫이 두 패널을 모두 찾기 때문이다.
3. 필터 칩 4개(전체·개발자 도구/API·코딩 60%+·가성비)는 지운다.
4. 탭: `role="tablist"` 안에 `role="tab"` 버튼 2개(점유율·성능)를 둔다. `aria-selected`·`aria-controls` 를 달고, 비활성 탭은 `tabIndex=-1` 로 둔다. 패널에는 `role="tabpanel"` 과 `aria-labelledby` 를 단다. ←→ 키로 탭을 바꿀 수 있게 한다.
5. 정렬 그룹은 성능 탭에서만 보인다. 버튼 3개(코딩·선호도·가격 낮은 순)에 `aria-pressed` 를 단다. 값이 하나도 없는 지표의 버튼은 숨긴다(3-7 의 5번).
6. 기본값은 점유율 탭, 코딩 정렬이다. 코딩 값이 하나도 없으면 다음으로 보이는 지표로 정렬한다.

### 3-6. 점유율 막대 목록 (③⑫)

1. 누적 막대, 범례, 표, 행별 막대, 설명 열을 지우고 `<ol>` 막대 목록 하나로 바꾼다.
2. 카드 제목은 `AI 챗봇 점유율`, 오른쪽에 `▲▼ 전월 대비 %p` 를 둔다.
3. 행은 `share_pct` 내림차순이다. 각 행의 칸:

| 칸 | 내용 |
|---|---|
| 순위 | 목록 안 위치 |
| 이름 | `https://{domain}` 링크(새 탭, `rel="noopener noreferrer"`), 그 아래 작은 글씨로 운영사 |
| 막대 | 길이 = `share_pct ÷ 최댓값 × 100%`, 색은 JSON 의 `color` |
| 점유율 | 소수 2자리 + `%` (출처 정밀도 그대로. 1자리로 줄이면 0.02% 가 0.0% 가 된다) |
| 변화 | 양수 `▲ 3.60p`(`--bm-up`), 음수 `▼ 1.80p`(`--bm-down`), 0 은 `– 0.00p`(muted), 값이 없으면 `—`. `aria-label="전월 대비 상승 3.60%p"` |

4. **상위 5개만 행으로 보이고, 나머지는 `기타 N개 펼치기 ▾` 한 행으로 묶는다.** 항목이 5개 이하면 이 행은 없다. 항목 수가 바뀌어도 첫 화면 높이가 같게 하려는 규칙이다.
   - 기타 행에는 합계 %를 쓰고, 막대 색은 `var(--soft)`, 버튼에는 `aria-expanded` 를 단다.
   - 펼치면 그 아래에 순위를 이어서 보여 주고, 버튼 문구는 `접기 ▴` 가 된다.
5. 행의 `title` 속성에 `description` 을 넣는다.
6. `color`, `domain` 을 포함해 HTML 에 들어가는 모든 데이터 값은 `escapeHTML` 을 거친다.

### 3-7. 성능 표 (⑤)

1. 열 정의:

| id | 필드 | 헤더 큰 글씨 / 작은 글씨 | 표시 |
|---|---|---|---|
| — | `rank` 대신 현재 정렬 순서 | 순위 | 정수 |
| — | `model`, `provider`, `badge_type` | 모델 | 이름 굵게, 그 아래 운영사. `badge_type === "open-weights"` 이면 이름 옆에 `오픈` 태그 |
| coding | `arena_coding_elo` | 코딩 / Arena Coding · 점 | 천 단위 쉼표 |
| arena | `arena_elo` | 선호도 / Arena · 점 | 천 단위 쉼표 |
| gpqa | `gpqa_diamond` | 과학 추론 / GPQA · % | 소수 1자리 |
| mmlu | `mmlu_pro` | 지식 / MMLU-Pro · % | 소수 1자리 |
| price | `pricing_in_1m`, `pricing_out_1m` | 가격 / $/1M 입력·출력 | `1.25 / 5.00` |
| — | `context_window` | 컨텍스트 | `2,000K` → `2M`, `1,049K` → `1M`, `200K` 는 그대로 |

2. 정렬 방향: 점수 열은 내림차순(헤더에 `▼`), 가격은 혼합 단가 오름차순(`▲`)이다. 헤더 버튼을 눌러도 정렬되고, `th` 에 `aria-sort` 를 단다. 값이 `null` 인 모델은 맨 아래로 간다.
3. 정렬 중인 열 표시:
   - 셀 배경은 `color-mix(in srgb, var(--pill) 70%, transparent)` 이다.
   - 숫자 왼쪽에 미니 막대를 둔다. 폭 44px, 길이 `15% + 85% × (값 − 최소) ÷ (최대 − 최소)`, 색 `var(--accent)`. 값이 `null` 이면 막대를 그리지 않는다.
4. 열마다 최고값 하나만 `.bm-v.is-best` 로 강조한다(가격은 혼합 단가 최저). 스타일은 배경 `var(--hl-mint)`, 글자 `var(--ink)`, 굵게.
5. **값이 하나도 없는 지표 열(coding·arena·gpqa·mmlu 중)은 헤더째 숨긴다.** 힌트 행의 `colspan` 도 보이는 열 수에 맞춘다. 시안의 `visible` 처리를 그대로 옮긴다.
6. `badge` 문구("Arena 종합 1위" 등)는 표시하지 않는다.
7. 헤더 아래에 힌트 행을 둔다: `점수는 높을수록, 가격은 낮을수록 좋음 · 열 제목을 누르면 정렬`.
8. 가격 정렬일 때만 표 아래에 `가격 정렬은 입력 3 : 출력 1 가중 평균 기준` 을 표시한다.
9. 숫자 칸은 모두 오른쪽 정렬, `font-variant-numeric: tabular-nums`, 줄바꿈 금지다.
10. 값이 `null`/`undefined` 이면 `—` 를 쓴다. 이 처리는 포맷터가 한다. `toFixed` 를 직접 부르지 않는다(지금은 가격이 빠지면 페이지 전체가 그려지지 않는다).

### 3-8. 색과 대비 (①)

1. `styles.css` 의 변수 블록 3곳에 토큰을 추가한다.
   - `:root`(1~35행): `--bm-up: #18794e; --bm-down: #b4441f;`
   - `html[data-theme="dark"]`(37행): `--bm-up: #4fd4a3; --bm-down: #e08963;`
   - `@media (prefers-color-scheme: dark) { html:not([data-theme="light"]) { … } }`(62~63행): 같은 다크 값
   - **다크 값은 반드시 두 곳 모두에 넣는다.** 한 곳만 넣으면 지금과 같은 버그(시스템 다크 사용자에게 적용되지 않음)가 다시 생긴다.
2. 강조값과 태그는 변수만 쓴다.
   - `.bm-v.is-best { background: var(--hl-mint); color: var(--ink); font-weight: 800; }`
   - `.bm-tag { background: var(--hl-lemon); color: var(--ink-2); }`
3. `html[data-theme="dark"] .bm-…` 형태의 새 규칙은 만들지 않는다.
4. 기존 `--mint`·`--coral` 값은 바꾸지 않는다. 다른 페이지가 쓴다.

### 3-9. 모바일 (⑧, 640px 이하)

1. 성능 표(`.bm-table-wrap`)를 숨기고 리스트(`.bm-mlist`)를 보인다.
   - 리스트 행 = 순위 | 모델명(+오픈 태그)과 그 아래 `운영사 · $입력 / $출력 · 컨텍스트` | 오른쪽에 정렬 기준 값(큰 글씨)과 라벨
   - 가격 정렬일 때는 오른쪽 값이 `$혼합단가`, 라벨이 `혼합 단가` 다.
2. 점유율 행은 2줄 그리드로 바꾼다. 1줄은 순위·이름·값·변화, 2줄은 높이 6px 막대다.
3. 칩은 2×2 로 두고, 이름과 값을 각각 한 줄로 내린다(이름이 덜 잘리게).
4. 툴바는 세로로 쌓고, 탭 버튼이 가로를 꽉 채우게 한다.
5. 가로 스크롤이 생기면 안 된다.

### 3-10. 키보드와 접근성 (⑬)

1. 다시 그리기 전에 누른 버튼의 `data-focus-key` 를 기억한다. 다시 그린 뒤 같은 키의 요소에 `focus({ preventScroll: true })` 를 호출한다.
2. 키 목록: `tab-share`, `tab-bench`, `sort-coding`·`sort-arena`·`sort-price`, `th-{id}`, `chip-{탭}-{정렬}`, `others`.
3. 클릭 가능한 요소는 모두 `<button type="button">` 으로 만들고, `:focus-visible` 에 `outline: 2px solid var(--accent)` 를 준다.
4. 라벨에 이모지를 쓰지 않는다(📊·🏆 삭제).

### 3-11. 영문 라벨 (`getLang() === "en"`)

| KO | EN |
|---|---|
| 트래픽 1위 / 코딩 1위 / 선호도 1위 / 가성비 1위 | Top traffic / Top coding / Top Arena / Best value |
| 코딩 상위 절반 중 최저가 | Cheapest in the top half for coding |
| Arena Coding · 점 / Arena · 점 | Arena Coding · pts / Arena · pts |
| 1,382점 | 1,382 pts |
| 점유율 / 성능 (탭) | Share / Performance |
| 정렬 기준 · 코딩 · 선호도 · 가격 낮은 순 | Sort by · Coding · Arena · Lowest price |
| AI 챗봇 점유율 | AI chatbot share |
| ▲▼ 전월 대비 %p | ▲▼ vs last month (%p) |
| 기타 N개 펼치기 ▾ / 접기 ▴ | N others ▾ / Hide ▴ |
| 순위 · 모델 · 코딩 · 선호도 · 과학 추론 · 지식 · 가격 · 컨텍스트 | Rank · Model · Coding · Arena · Science · Knowledge · Price · Context |
| $/1M 입력·출력 | $/1M in·out |
| 점수는 높을수록, 가격은 낮을수록 좋음 · 열 제목을 누르면 정렬 | Higher scores and lower prices are better · Click a header to sort |
| 가격 정렬은 입력 3 : 출력 1 가중 평균 기준 | Price sort uses a 3:1 input/output blend |
| 혼합 단가 | Blended |
| 오픈 | Open |
| 출처 / 출처·기준일 미기재 | Sources / Sources and dates not specified |

데이터 필드(`description` 등)를 영문화하는 것은 범위 밖이다.

### 3-12. 지울 것

1. 쓰지 않게 된 CSS: `bm-kpi-*`, `bm-tag-up/down/neutral`, `bm-controls-bar`, `bm-sub-tab*`, `bm-filter-group`, `bm-chip-filter`, `bm-view-panel`, `bm-share-*`, `bm-legend-*`, `bm-table-card`, `bm-data-table`, `bm-rank-*`, `bm-entity-*`, `bm-domain-link`, `bm-provider-tag`, `bm-bar-visual`, `bm-bar-inner`, `bm-num`, `bm-desc-td`, `bm-pill-metric`, `pill-high`, `bm-metric-badge`, `badge-coding/open/general`, 그리고 그 다크 규칙 4개.
2. `renderBenchmarks()` 안의 검색어 필터(`STATE.query`), 카테고리 필터, `summary` 필드 사용, `??` 기본값.
3. `state.js`: `benchmarkFilter: 'all'` 을 지우고 `benchmarkSort: 'coding'`, `benchmarkOthersOpen: false` 를 추가한다. `benchmarkTab: 'share'` 는 그대로 둔다.

---

## 4. 하지 말 것

- **데이터를 고치지 않는다.** 1단계에서 만든 `site/public/data/benchmarks_latest.json`, `.tmp/handoff-benchmarks/evidence/`, `.tmp/handoff-benchmarks/verify-data.mjs` 를 건드리지 않는다. 화면이 이상해 보여도 데이터를 '보정'하지 말고 보고서에 적는다.
- `scripts/benchmarks/curate-benchmarks.js`, `package.json`, `vite.config.js` 를 고치지 않는다.
- **다른 페이지를 건드리지 않는다.** `index.html`·`news.html`·`starboard.html`·`lounge.html`, main.js 에서 benchmarks 밖의 함수, 공통 토큰 값(`--mint`·`--coral` 등)이 해당된다. 메뉴의 NEW 배지 인라인 스타일도 그대로 둔다.
- **사이트 공통 다크 처리는 고치지 않는다.** `<head>` 인라인 테마 스크립트와 기존 `html[data-theme="dark"]` 규칙 17개가 해당된다. 별도 작업이다.
- 새 npm 패키지, 차트 라이브러리, 외부 CDN 을 추가하지 않는다.
- **git 상태를 바꾸지 않는다.** add·commit·push·stash·reset·checkout·restore·clean 모두 금지다. 특히 `git add -A`·`git add .` 를 쓰지 않는다. 작업 트리에 공개되면 안 되는 untracked 문서(저장소 루트의 문서 2개)가 있다.
- 파이프라인 본실행(`data:*`, `sync:obsidian`)과 배포를 하지 않는다.
- 시안의 리뷰 전용 요소를 옮기지 않는다(2절 목록).

---

## 5. 허용된 실행

```bash
git status --short
git status --short > .tmp/handoff-benchmarks/git-status-before-ui.txt   # 작업 시작 때 한 번 (.tmp 는 gitignore 대상)
git diff --stat
node --check site/src/main.js
node .tmp/handoff-benchmarks/verify-data.mjs
shasum -a 256 site/public/data/benchmarks_latest.json
npm run dev        # 5173 이 이미 떠 있으면 그대로 쓴다
npm run build      # dist/ 는 gitignore 대상
```

실패한 명령은 숨기지 않는다. 종료코드와 핵심 출력을 보고서에 그대로 적는다.

---

## 6. 검증 — 브라우저에서 측정하고 값을 보고서에 그대로 적는다

`http://localhost:5173/benchmarks.html` 을 열고, 맨 위로 스크롤한 상태에서 DevTools 콘솔에 붙여 넣는다.

### 스니펫 A — 레이아웃

```js
(() => {
  const rows = [...document.querySelectorAll('.bm-srow')];
  const r0 = rows[0].getBoundingClientRect(), rN = rows.at(-1).getBoundingClientRect();
  return {
    viewport: `${innerWidth}x${innerHeight}`,
    firstRowTop: Math.round(r0.top + scrollY),
    lastRowBottom: Math.round(rN.bottom + scrollY),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
})()
```

- 1024×768, 점유율 탭, 기타 접힘 상태: `firstRowTop ≤ 450` 이고 `lastRowBottom ≤ 768` 이면 통과. 시안은 412 / 723 인데, 맨 위 리뷰용 안내 바(46px)가 포함된 값이라 실제 페이지에서는 약 366 / 677 이 나와야 한다.
- 375×812(DevTools 기기 모드): 점유율 탭과 성능 탭 모두 `overflowX === false` 이면 통과.

### 스니펫 B — 글자 대비

```js
(() => {
  const parse = c => {
    let m = c.match(/^rgba?\(([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; }
    m = c.match(/^color\(srgb\s+([^)]+)\)/);
    if (m) { const p = m[1].split(/[\s\/]+/).filter(Boolean).map(Number); return { r: p[0] * 255, g: p[1] * 255, b: p[2] * 255, a: p[3] ?? 1 }; }
    return { r: 0, g: 0, b: 0, a: 0 };
  };
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = c => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a: 1 });
  const bgOf = el => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const c = parse(getComputedStyle(n).backgroundColor);
      if (c.a > 0) layers.push(c);
      if (c.a >= 1) break;
    }
    return layers.reduceRight((acc, c) => over(c, acc), { r: 255, g: 255, b: 255, a: 1 });
  };
  const ratio = el => {
    const bg = bgOf(el), fg = over(parse(getComputedStyle(el).color), bg);
    const [x, y] = [lum(fg), lum(bg)].sort((p, q) => q - p);
    return +((x + 0.05) / (y + 0.05)).toFixed(2);
  };
  const theme = document.documentElement.dataset.theme ?? '(없음=시스템)';
  return { theme, ...Object.fromEntries(['.bm-v.is-best', '.bm-tag', '.bm-chg.up', '.bm-chg.down', '.bm-source']
    .map(s => [s, document.querySelector(s) ? ratio(document.querySelector(s)) : 'missing'])) };
})()
```

세 가지 테마 상태에서 각각 실행한다. 값이 모두 `4.5` 이상이면 통과다.

- `missing` 이 나오면, 그 요소가 데이터상 생길 수 없는 경우(예: 오픈 가중치 모델이 없어 `.bm-tag` 가 없음, 전월 값이 없어 `.bm-chg.up` 이 없음)에만 통과로 보고, 이유를 보고서에 적는다. 그 밖의 `missing` 은 실패다.

| 상태 | 만드는 법 | 시안 실측값 (best · tag · up · down · source) |
|---|---|---|
| S1 시스템 다크 | 콘솔에서 `localStorage.removeItem('aiw-theme')` 실행 → DevTools Rendering 탭에서 `prefers-color-scheme: dark` 에뮬레이션 → 새로고침. **이번 버그가 재현되는 조건이다** | 8.1 · 5.4 · 9.0 · 6.3 · 6.7 |
| S2 직접 고른 다크 | 테마 버튼으로 다크 선택 | 8.1 · 5.4 · 9.0 · 6.3 · 6.7 |
| S3 라이트 | 테마 버튼으로 라이트 선택 | 15.6 · 12.0 · 5.4 · 5.5 · 5.3 |

측정이 끝나면 `localStorage.removeItem('aiw-theme')` 로 원래대로 돌린다.

### 스니펫 C — 데이터에서 기대값 계산

정렬과 요약 칩이 맞는지 볼 때 쓰는 기준값이다. 콘솔에 붙여 넣는다.

```js
await (async () => {
  const d = await fetch('data/benchmarks_latest.json', { cache: 'no-store' }).then(r => r.json());
  const ms = d.model_benchmarks;
  const blended = m => (3 * m.pricing_in_1m + m.pricing_out_1m) / 4;
  const top = (f, asc) => ms.filter(m => f(m) != null).sort((a, b) => (asc ? f(a) - f(b) : f(b) - f(a)))[0]?.model ?? '—';
  const s = [...d.market_shares].sort((a, b) => b.share_pct - a.share_pct)[0];
  const cv = ms.map(m => m.arena_coding_elo).filter(v => v != null).sort((a, b) => a - b);
  const median = cv.length ? cv[Math.floor(cv.length / 2)] : null;
  return {
    트래픽1위: `${s.name} ${s.share_pct}%`,
    코딩1위: top(m => m.arena_coding_elo),
    선호도1위: top(m => m.arena_elo),
    과학추론1위: top(m => m.gpqa_diamond),
    지식1위: top(m => m.mmlu_pro),
    가격최저: top(blended, true),
    가성비1위: median == null ? '—' : ms.filter(m => m.arena_coding_elo != null && m.arena_coding_elo >= median).sort((a, b) => blended(a) - blended(b))[0]?.model ?? '—',
  };
})()
```

### 동작 체크리스트 (각각 통과/실패와 관찰 내용을 적는다)

1. **점유율:** 항목이 6개 이상이면 처음에는 상위 5행과 「기타 N개 펼치기」 1행이다. 누르면 N행이 더 나오고 `aria-expanded="true"` 가 된다. 다시 누르면 접힌다. 항목이 5개 이하면 기타 행이 없다.
2. **정렬:** 코딩·선호도·가격 낮은 순 버튼과, 보이는 지표 헤더를 차례로 누른다. 1위 행이 스니펫 C 결과와 같아야 하고, 값이 `null` 인 모델은 맨 아래에 있어야 한다.
3. **요약 칩:** 네 칩의 이름이 스니펫 C 결과와 같고, 누르면 해당 탭·정렬로 바뀐다.
4. **키보드:** Tab 으로 정렬 버튼에 가서 Enter 를 누른 뒤 `document.activeElement.dataset.focusKey` 가 그 버튼의 키인지 본다. 탭 목록에서 ←→ 로 탭이 바뀌는지 본다.
5. **영문:** EN 으로 바꾸면 새 라벨이 3-11 표대로 바뀌고 콘솔 에러가 없다. 확인 후 KO 로 되돌린다.
6. **로딩 실패:** DevTools Network 탭의 request blocking 에 `benchmarks_latest.json` 을 추가하고 새로고침한다. 오류 문구만 나오고 가짜 값이 없어야 한다. 확인 후 차단을 해제한다. 파일 이름을 바꿔서 시험하지 않는다.
7. **다른 페이지:** `/`, `/news`, `/starboard`, `/lounge` 에서 콘솔 에러가 0 이고 메뉴가 정상이다.
8. **헤더:** 출처 줄에 `header: true` 출처(트래픽·선호도·코딩·가격·컨텍스트)와 각각의 기준일이 보이고, "다음 …" 갱신 문구가 없다.

---

## 7. 보고서

**파일:** `docs/review-benchmarks-ux-2026-10-22-gemini.md` (새로 만드는 문서는 이것 하나뿐이다)

**순서** (AGENTS.md §4 의 3단 구조 대신 이 순서를 따른다):
1. 결론 한 줄
2. 바꾼 파일 — `git diff --stat` 원문. untracked 파일(`site/benchmarks.html`)은 `wc -l` 결과
3. 항목별 상태 표 — 번호 · 상태(완료/부분/미완) · 증거(측정값 또는 확인 방법)
4. 측정값 — 스니펫 A(두 크기), B(세 상태), C 의 결과 JSON 원문
5. 실행한 명령 — 명령, 종료코드, 핵심 출력 1~3줄 (데이터 해시는 시작·끝 두 번)
6. 시안과 다르게 한 것과 그 이유
7. 확인하지 못한 것

**작성 규칙:**
- 측정값 없이 "완료"나 "확인함"이라고 쓰지 않는다.
- 추측에는 문장 앞에 `[추정]` 을 붙인다. 파일에 없는 기능·수치·이력을 지어내지 않는다.
- 저장소 루트의 untracked 문서 2개의 이름은 보고서에 적지 않는다.
- 한국어로, 쉬운 말로 쓴다.

---

## 8. 완료 기준 (검수 시 이 순서로 확인)

1. 데이터 파일 sha256 이 작업 시작 때 적은 값과 같다.
2. `git status --short` 결과가 `.tmp/handoff-benchmarks/git-status-before-ui.txt` 에 보고서 1줄(`?? docs/review-benchmarks-ux-2026-10-22-gemini.md`)만 더해진 것과 같다. 이번 작업으로 바뀌는 4개 파일은 이미 수정·추가 상태라 줄이 늘지 않는다.
3. `npm run build` 의 종료코드가 0 이고 `dist/benchmarks.html` 이 있다.
4. `node .tmp/handoff-benchmarks/verify-data.mjs` 가 PASS 다.
5. 스니펫 A 의 기준을 통과한다.
6. 스니펫 B 의 세 상태 모두 값이 4.5 이상이다(`missing` 은 6절 예외만 허용).
7. 6절 체크리스트 8개를 모두 통과한다.
8. 보고서에 7개 절이 모두 있다.
