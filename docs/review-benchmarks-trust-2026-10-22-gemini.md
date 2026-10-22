# 「점유율·성능」 페이지 수치 해석 신뢰성 보완 작업 보고서

## 1. 결론

사용자 요청에 따라 「점유율·성능」 페이지에서 데이터 수치를 왜곡·오해 없이 정확하게 읽을 수 있도록 4가지 핵심 표시(리퍼럴 점유율 명시, 1위 확정성 보완, 회사별 대표 1개 명시, OpenRouter 가격 출처 명시)를 KO/EN 이중 언어로 완벽히 반영하였으며, 데이터 해시 불변, 빌드 성공, 스니펫 A/B 기준 충족 및 콘솔 에러 0건을 모두 검증 완료했다.

---

## 2. 바꾼 파일

### 2.1 `git diff --stat` 원문

```
warning: '/Users/nhn/.gitignore_global'에 접근할 수 없습니다: Operation not permitted
 .agents/skills/graphify |   0
 package.json            |   1 +
 site/index.html         |   6 +-
 site/lounge.html        |   6 +-
 site/news.html          |   6 +-
 site/src/main.js        | 336 +++++++++++++++++++++++++++++++++++++++++++++++-
 site/src/state.js       |   6 +-
 site/starboard.html     |   6 +-
 site/styles.css         | 186 +++++++++++++++++++++++++++
 vite.config.js          |   3 +-
 10 files changed, 549 insertions(+), 7 deletions(-)
```

### 2.2 이번 보완 작업 수정 대상 파일 (`git diff --stat site/src/main.js site/styles.css`)

```
 site/src/main.js | 336 ++++++++++++++++++++++++++++++++++++++++++++++++++++++-
 site/styles.css  | 186 ++++++++++++++++++++++++++++++
 2 files changed, 521 insertions(+), 1 deletion(-)
```

### 2.3 untracked 파일 (`site/benchmarks.html`) `wc -l` 결과

```
     125 site/benchmarks.html
```

---

## 3. 네 항목의 전후 문구 표

| 번호 | 보완 항목 | 구분 | 변경 전 (1차 UX) | 변경 후 (신뢰성 보완 완료) |
|:---:|---|---|---|---|
| **1** | **점유율 의미**<br>(사용자 수가 아닌 리퍼럴 방문 비율) | 카드 제목 | AI 챗봇 점유율<br>(*AI chatbot market share*) | **AI 챗봇 리퍼럴 점유율**<br>(*AI chatbot referral share*) |
| | | 카드 서브 (`.bm-card-sub`) | *(없음)* | **AI 챗봇이 다른 웹사이트로 보낸 방문 비율 · 사용자 수가 아님 · Statcounter 월간**<br>(*Share of visits AI chatbots send to other websites · not user counts · Statcounter, monthly*) |
| | | 요약 칩 라벨 | 트래픽 1위<br>(*Top traffic*) | **리퍼럴 1위**<br>(*Top referrals*) |
| **2** | **1위 확정성**<br>(Arena 상위권 오차범위 중첩) | 요약 칩 라벨 | 코딩 1위 / 선호도 1위<br>(*Top coding / Top Arena*) | **코딩 최고점 / 선호도 최고점**<br>(*Top coding score / Top Arena score*)<br>※ 가성비 1위(*Best value*)는 가격 계산식이므로 유지 |
| | | 성능 주석 (`.bm-foot-note` 1행) | *(없음)* | **Arena 점수는 사용자 투표로 매긴 선호도라 상위권 순위는 오차 범위 안에서 바뀔 수 있다.**<br>(*Arena scores are preference ratings from user votes; top ranks can shift within the margin of error.*) |
| **3** | **회사별 대표 1개**<br>(전체 Top 10이 아닌 회사당 1개) | 성능 카드 헤더 | *(없음 - 툴바 바로 노출)* | 카드 헤더(`.bm-card-head`) 추가:<br>제목: **회사별 대표 모델 10개** (*Top model per company (10)*)<br>서브: **Arena 순위에서 회사마다 가장 높은 모델 1개 · 같은 회사의 다른 모델은 제외**<br>(*One highest-ranked model per company on Arena · other models from the same company are excluded*) |
| **4** | **가격 출처**<br>(공식가가 아닌 OpenRouter 표시가) | 가격 열 헤더 | $/1M 입력 · 출력<br>(*$/1M in · out*) | **OpenRouter · $/1M 입력·출력**<br>(*OpenRouter · $/1M in·out*) |
| | | 성능 주석 (`.bm-foot-note` 2행) | *(없음)* | **가격은 OpenRouter 표시가이며 회사 공식가와 다를 수 있다.**<br>(*Prices are OpenRouter listings and may differ from official vendor prices.*)<br>※ 기존 "가격 정렬은…" 안내 문구는 그대로 유지 |

---

## 4. 측정값 원문

### 4.1 스니펫 A (레이아웃 기준 실측)

문구 추가 및 서브 라인 삽입 후에도 1024×768 첫 화면 기준 및 모바일 overflowX 검증을 완벽히 통과했다.

```json
=== 1024x768 점유율 탭 (첫 행 상단 및 마지막 행 하단 기준 검증) ===
{
  "viewport": "1024x768",
  "firstRowTop": 417,
  "lastRowBottom": 728,
  "overflowX": false
}
// 기준: firstRowTop <= 450 (417 달성), lastRowBottom <= 768 (728 달성), overflowX === false (통과)

=== 375x812 점유율 탭 및 성능 탭 ===
{
  "tab": "share",
  "viewport": "375x812",
  "overflowX": false
}
{
  "tab": "bench",
  "viewport": "375x812",
  "overflowX": false
}
// 기준: overflowX === false (두 탭 모두 통과)
```

### 4.2 스니펫 B (글자 대비 실측 — 신규 선택자 `.bm-card-sub`, `.bm-foot-note` 포함)

세 가지 테마 상태(S1: 시스템 다크, S2: 수동 다크, S3: 수동 라이트)에서 모두 WCAG AA 기준(4.5:1 이상)을 충족했다.

```json
=== S1 (시스템 다크) ===
{
  "theme": "(없음=시스템)",
  ".bm-v.is-best": 8.1,
  ".bm-tag": 5.4,
  ".bm-chg.up": "missing",
  ".bm-chg.down": "missing",
  ".bm-source": 6.66,
  ".bm-card-sub": 6.08,
  ".bm-foot-note": 6.08
}

=== S2 (직접 고른 다크) ===
{
  "theme": "dark",
  ".bm-v.is-best": 8.1,
  ".bm-tag": 5.4,
  ".bm-chg.up": "missing",
  ".bm-chg.down": "missing",
  ".bm-source": 6.66,
  ".bm-card-sub": 6.08,
  ".bm-foot-note": 6.08
}

=== S3 (직접 고른 라이트) ===
{
  "theme": "light",
  ".bm-v.is-best": 15.58,
  ".bm-tag": 11.97,
  ".bm-chg.up": "missing",
  ".bm-chg.down": "missing",
  ".bm-source": 5.33,
  ".bm-card-sub": 5.56,
  ".bm-foot-note": 5.56
}
```

### 4.3 KO / EN 문구 및 콘솔 오류 실측

브라우저 내에서 직접 렌더링된 실제 텍스트 요소를 추출하여 대조한 결과, 100% 일치함을 확인했다.

```json
=== KO 문구 확인 ===
{
  "shareTitle": "AI 챗봇 리퍼럴 점유율",
  "shareSub": "AI 챗봇이 다른 웹사이트로 보낸 방문 비율 · 사용자 수가 아님 · Statcounter 월간",
  "chip1Label": "리퍼럴 1위",
  "chip2Label": "코딩 최고점",
  "chip3Label": "선호도 최고점",
  "chip4Label": "가성비 1위",
  "benchHeadTitle": "회사별 대표 모델 10개",
  "benchHeadSub": "Arena 순위에서 회사마다 가장 높은 모델 1개 · 같은 회사의 다른 모델은 제외",
  "priceHeaderSub": "OpenRouter · $/1M 입력·출력",
  "footNote": "Arena 점수는 사용자 투표로 매긴 선호도라 상위권 순위는 오차 범위 안에서 바뀔 수 있다.가격은 OpenRouter 표시가이며 회사 공식가와 다를 수 있다."
}

=== EN 문구 확인 ===
{
  "shareTitle": "AI chatbot referral share",
  "shareSub": "Share of visits AI chatbots send to other websites · not user counts · Statcounter, monthly",
  "chip1Label": "Top referrals",
  "chip2Label": "Top coding score",
  "chip3Label": "Top Arena score",
  "chip4Label": "Best value",
  "benchHeadTitle": "Top model per company (10)",
  "benchHeadSub": "One highest-ranked model per company on Arena · other models from the same company are excluded",
  "priceHeaderSub": "OpenRouter · $/1M in·out",
  "footNote": "Arena scores are preference ratings from user votes; top ranks can shift within the margin of error.Prices are OpenRouter listings and may differ from official vendor prices."
}

=== 브라우저 콘솔 에러 수 ===
0건
```

---

## 5. 실행한 명령

1. **데이터 검문 스크립트 실행 (`node .tmp/handoff-benchmarks/verify-data.mjs`)**
   - **종료코드:** 0
   - **출력:**
     ```
     검문 기준 시각: 2026-10-22T06:52:56.523Z — 오늘 날짜가 맞는지 확인할 것
     데이터: /Users/nhn/Desktop/ai-weekly/site/public/data/benchmarks_latest.json
     출처 4개 · 점유율 6행 · 모델 10개 · Arena 행 368/366(Overall/Coding)
     ...
     결과: PASS
     ```
2. **데이터 파일 해시 무결성 검증 (`shasum -a 256 site/public/data/benchmarks_latest.json`)**
   - **종료코드:** 0
   - **출력 (작업 전후 동일):**
     `938c4cf59d0bc274852ff26060ad360134ecca7c1e478ed4ce6ed4b14f3fd0ed  site/public/data/benchmarks_latest.json`
3. **자바스크립트 문법 검사 (`node --check site/src/main.js`)**
   - **종료코드:** 0
4. **프로덕션 빌드 (`npm run build`)**
   - **종료코드:** 0
   - **출력:**
     ```
     vite v8.1.5 building client environment for production...
     ✓ 11 modules transformed.
     dist/assets/benchmarks-0BmZG4Mh.css     54.76 kB │ gzip: 10.68 kB
     dist/assets/main-DANMSX9T.js            83.96 kB │ gzip: 26.32 kB
     ✓ built in 169ms
     ```

---

## 6. 시안·지시와 다르게 한 것과 그 이유

- **요약 칩의 클릭 가능 상태 시각화 (`.is-active`, `↗` 화살표, `bm-chip-dot`) 유지**:
  - 지시서 본문에는 단순 텍스트 라벨 변경("리퍼럴 1위", "코딩 최고점" 등)만 정의되어 있으나, 사용자의 직전 피드백(*"상위에 트래픽 코딩 선호도 가성비 탭이 클릭되는건지 표시가 애매한데 개선해줘"*)을 충실히 반영하기 위해 칩에 적용했던 인터랙션 스타일을 그대로 보존함.
  - 적용 내용:
    1. 클릭 시 해당 탭/정렬 컨트롤과 동기화되어 활성화되는 액센트 테두리 링 (`.is-active`)
    2. 클릭 시 해당 영역으로 이동함을 직관적으로 암시하는 미니 화살표 (`<span class="bm-chip-arrow">↗</span>`)
    3. 활성 상태 식별 점 인디케이터 (`<i class="bm-chip-dot"></i>`)
  - 이유: 단순 라벨 문구만 바꾸고 클릭 피드백을 제거할 경우 사용자 피드백이 재발할 수 있으므로, 기능적/시각적 완성도를 위해 해당 스타일을 유지함.

---

## 7. 확인하지 못한 것

- **`.bm-chg.up` / `.bm-chg.down` 실측 대비치 (`missing` 처리)**:
  - 현재 수집된 `site/public/data/benchmarks_latest.json`의 점유율 데이터에 전월 대비 증감 수치(`mom_change`)가 제공되지 않아 `null`(`—`)로 렌더링되고 있음.
  - 이에 따라 스니펫 B 실행 시 `.bm-chg.up`, `.bm-chg.down` 요소가 DOM에 없어 `missing`으로 표기됨 (지시서 6절에서 공식 예외로 명시된 사항). 향후 데이터 파이프라인에서 전월 대비 증감 수치가 수집되면 기정의된 `--bm-up`, `--bm-down` 변수를 통해 자동 적용됨.
