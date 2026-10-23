# 사이트 전반 결함 및 품질 점검 최종 검수 보고서

- **작업 일시**: 2026-10-23
- **대상 브랜치**: `fix/site-review-2026-10-23`
- **지시서 기준**: `docs/handoff-site-review-2026-10-23.md`
- **검증 환경**: macOS (Apple Silicon), Chrome (`chromium.launch({ channel: "chrome" })`), Playwright

---

## 1. 요약 (5줄)

1. 사이트 전반의 27개 이슈를 그룹 A~H 8개 단위로 분할하여 단일 책임 원칙에 맞춘 8개의 커밋으로 수술적 수정을 완료했습니다.
2. 모바일(375×812) 홈 레이아웃 깨짐(G-1)의 근본 원인을 Flex 자식 요소의 `min-width: auto` 제약으로 규명하고, 가로 1줄 스크롤 및 `scrollWidth 375px` 완전 수납을 달성했습니다.
3. 라이트 모드 가독성 저하 요소(G-8)에 신규 전용 토큰(`--accent-text: #a85032`, 톤 다운된 `--mint: #18794e`)을 적용하여 전 항목 4.5:1 이상의 명도대비를 확보했습니다.
4. 데이터 해시 무결성(G-6 reelmimic 제거 5파일, G-14 누락 인덱스 1파일 외 전 파일 동일)과 정적 빌드 산출물(Google Fonts 0건, robots/sitemap 정상화)을 실측 검증했습니다.
5. 코드 및 로컬 데이터 작업은 100% 완료되었으며, 외부 플랫폼 설정(GitHub Discussions 댓글 삭제, Substack 발행물명 변경) 및 원격 푸시·머지 절차만 사용자 검토 작업으로 남겨두었습니다.

---

## 2. 그룹 A~H 별 변경 파일, 줄 범위, 커밋 해시

| 그룹 | 커밋 해시 | 메시지 요약 | 변경 파일 및 줄 범위 |
| :--- | :--- | :--- | :--- |
| **A** | `12235bb` | fix(site): A 자동화 — 스타보드 배포 트리거, 주간 스케줄 비활성화 | - `.github/workflows/stars.yml` (+40, -1, L71-L110)<br>- `.github/workflows/weekly-trends.yml` (+5, -2, L7-L11) |
| **B** | `24194de` | fix(site): B 설치 칩과 복사 — 아카이브 텍스트 전용화, button 전환 및 클립보드 피드백 | - `site/src/main.js` (+85, -17, L530-L555, L1845-L1885)<br>- `site/styles.css` (+14, -0, L785-L798) |
| **C** | `cd81b34` | fix(site): C 아카이브 렌더 폴백 — 제목·리포id 누락 폴백, 메뉴 날짜 우선 표기, 갱신 바 날짜 표시 | - `site/src/main.js` (+61, -20, L318-L345, L590-L615) |
| **D** | `2ff1385` | fix(site): D 갱신 표기 — 뉴스·라운지 상대 시각 표기 및 다음 갱신 제거 | - `site/src/main.js` (+45, -9, L185-L225) |
| **E** | `e6add0a` | fix(site): E 라운지 강등 — 메인 내비 제거, sitemap 및 og:url 확장자 제거 | - `site/index.html` (+0, -3, L120-L123)<br>- `site/news.html` (+1, -5, L122-L126)<br>- `site/starboard.html` (+1, -5, L110-L114)<br>- `site/benchmarks.html` (+0, -3, L105-L108)<br>- `site/lounge.html` (+1, -5, L110-L114)<br>- `site/public/sitemap.xml` (+14, -4, L1-L24)<br>- `scripts/core/generate-rss.js` (+7, -3, L80-L100) |
| **F** | `5996781` | fix(site): F 스타보드 — 50개 단위 더 보기, 원장 캐시 허용, 배지 범례 및 스파크라인 a11y | - `site/src/main.js` (+59, -12, L38-L41, L2055-L2115, L2155-L2175)<br>- `site/src/state.js` (+1, -0, L30) |
| **G** | `bb03cc9` | fix(site): G 결함 묶음 — 모바일 필터 바, 모달 포커스, reelmimic 제거, SEO 및 a11y 개선 | - `scripts/plugins/collect.js` (+18, -0, L35-L52)<br>- `data/archive/2026-10-19.json` (+2, -50)<br>- `data/archive/index.json` (+2, -2)<br>- `site/public/data/latest.json` (+2, -50)<br>- `site/public/data/archive/2026-10-19.json` (+2, -50)<br>- `site/public/data/archive/index.json` (+2, -2)<br>- `site/public/data/archive/news_index.json` (+10, -2, L1-L20)<br>- `site/robots.txt` → `site/public/robots.txt` (이동)<br>- `site/src/main.js` (+223, -31, L10-L85, L375-L425, L635-L680, L2245-L2530)<br>- `site/styles.css` (+67, -3, L15-L85, L350-L430, L510-L520, L730-L785, L1950-L1965, L2870-L2915)<br>- 5개 HTML (skip-link, h2 숨김 헤더, 폰트 링크 제거, button a11y) |
| **H** | `b81e4d2` | fix(site): H 구독 — 설명 힌트 추가 및 RSS 피드 타이틀 통일 | - `site/index.html` (+1, -0, L155)<br>- `site/news.html` (+1, -0, L155)<br>- `site/starboard.html` (+1, -0, L145)<br>- `site/benchmarks.html` (+1, -0, L120)<br>- `site/lounge.html` (+14, -0, L140-L155)<br>- `site/styles.css` (+11, -1, L440-L455)<br>- `site/public/feed.xml` (+13, -13, L8-L95)<br>- `scripts/core/generate-rss.js` (+2, -2, L80-L90) |

---

## 3. 검증 결과

### 3.1. 스니펫 A — 레이아웃 및 동작 (Playwright Chrome 실측)

- **실행 스크립트**: `.tmp/handoff-site-review/verify.mjs`

| 항목 ID | 검증 내용 | 기대값 | 측정값 | 결과 |
| :--- | :--- | :--- | :--- | :--- |
| `A-1` | 1024×768 홈: `#archive-btn` 클릭 시 메뉴 maxHeight 및 뷰포트 바닥 이내 | `true` | `true` (`maxHeight: 520px`, `bottom <= 768`) | **PASS** |
| `A-2` | 1024×768 홈: 아카이브 메뉴 열린 상태에서 `Escape` 입력 시 메뉴 닫힘 및 포커스 복귀 | `true` | `true` (`hidden: true`, `activeElement: archive-btn`) | **PASS** |
| `A-3` | 375×812 홈: 문서 가로 스크롤 없음 | `<= 375 (true)` | **`375`** (수정 전 560) | **PASS** |
| `A-4` | 375×812 홈: 카테고리 필터 너비가 부모(349px) 이하 | `<= 349 (true)` | **`329.0px`** (수정 전 537) | **PASS** |
| `A-5` | 375×812 홈: `.filter-right` 내 모든 요소(검색창, 순위 기준 버튼)가 화면 내 수납 | `true` | `true` (전 요소 `right <= 375.5`) | **PASS** |
| `A-6` | 홈 최신: "에이전트" 칩 클릭 후 순위 스티커 고정 | `morluto/rea #01`, `magpie null` | `morluto/rea #01`, `magpie null` (수정 전 #02) | **PASS** |
| `A-7` | 홈 2026-06-08 주차: 모든 카드 제목(h3) 비어있지 않음 | `all h3 non-empty (>0)` | `count: 10`, `allNonEmpty: true` | **PASS** |
| `A-8` | 아카이브 전체 35개 주차: `.cli-copy-chip` 0건 (텍스트 전용) | `0 in all 35 weeks` | `0` (실패 주차 0건) | **PASS** |
| `A-9` | 홈 최신: `.cli-copy-chip` 0건 및 "README 참고" 안내 포함 | `count === 0 && hasReadme` | `count: 0`, `hasReadme: true` | **PASS** |
| `A-10` | 홈 네트워크 404 에러 시 오류 문구 출력 | `includes "불러오지 못했"` | `true` ("데이터를 불러오지 못했습니다...") | **PASS** |
| `A-11` | 뉴스: 다음 갱신 시간 숨김 및 상대 시각 표기 | `display 'none' && relative` | `nextDisplay: none`, `regexMatch: true` | **PASS** |
| `A-12` | 5개 전체 페이지: 메인 내비 라운지 제거 및 푸터 라운지 링크 존재 | `nav: 0, footer: 5` | `navCount: 0`, `footerAllHas: true` | **PASS** |
| `A-13` | 스타보드: 초기 50개 렌더 및 "더 보기" 클릭 시 100개 렌더 | `initial 50, after 100` | `initial: 50`, `after click: 100` (수정 전 347) | **PASS** |
| `A-14` | 상세 모달: 오픈 시 포커스 트랩 및 Esc 입력 시 원래 트리거 버튼 복귀 | `trap: true, restored: true` | `trap: true`, `restored: true` | **PASS** |
| `A-15` | 점유율: DeepSeek 단일 행 노출 (중복 집계 행 제거) | `1` | `1` (수정 전 2) | **PASS** |
| `A-16` | 5개 전체 페이지 네트워크: `fonts.googleapis.com` 요청 차단 | `0` | `0건` | **PASS** |
| `A-17` | 스타보드 원장 fetch: `{ cache: "no-store" }` 제거 | `no-store removed` | `no-store removed` | **PASS** |

---

### 3.2. 스니펫 B — 글자 대비율 실측 표 (라이트 / 다크)

- **측정 공식**: WCAG 2.1 상대 휘도 기반 (SNIPPET B)
- **합격 기준**: 라이트 모드 기준 **4.5:1 이상** (AA 기준 충족)

| 대상 요소 | 수정 전 (라이트) | 라이트 모드 실측 | 라이트 판정 | 다크 모드 실측 |
| :--- | :--- | :--- | :--- | :--- |
| `.rank-pill.is-top` (글자/배경) | `2.15:1` | **`8.96:1`** (`var(--ink)` on coral) | **PASS** | `6.98:1` |
| `.category-label` | `2.7~3.1:1` | **`5.44:1`** (`--accent-text #a85032`) | **PASS** | `3.18:1` (기존 유지) |
| `.signal-badge` | `2.7~3.1:1` | **`4.73:1`** (`--accent-text #a85032`) | **PASS** | `5.62:1` |
| `#clear-filters-btn` (뉴스) | `2.7~3.1:1` | **`5.21:1`** (`--accent-text #a85032`) | **PASS** | `6.94:1` |
| `#clear-plugin-filters-btn` (홈) | `2.7~3.1:1` | **`5.21:1`** (`--accent-text #a85032`) | **PASS** | `6.94:1` |
| 스타보드 `.sb-velocity` (mint 속도) | `2.50:1` | **`4.70:1`** (`--mint #18794e` on surface) | **PASS** | `8.00:1` |

---

### 3.3. 스니펫 C — 빌드 산출물 및 데이터 해시 무결성 검증

1. **빌드 명령**: `npm run build`
   - 종료코드: `0`
   - 빌드 경고: `0건` (정상 통과)
2. **산출물 파일 및 검색 검증**:
   - `test -f dist/robots.txt`: 존재 확인 (`robots.txt exists`)
   - `grep -c benchmarks dist/sitemap.xml`: `1` (정상 등록)
   - `! grep -q '\.html' dist/sitemap.xml`: 통과 (확장자 `.html` 0건)
   - `grep -c 'fonts.googleapis' dist/*.html`: `0건` (5개 HTML 모두 0)
   - `grep -c 'AI위클리' site/public/feed.xml`: `13` (정상 반영)
   - `grep -n 'cc-trends' site/public/feed.xml`: `12` (전부 `<guid>` 태그 내에만 위치)
3. **데이터 파일 전체 SHA-256 해시 검증 (1절 20번 방식)**:
   - **실행 명령**: `shasum -a 256 site/public/data/latest.json site/public/data/archive/*.json data/archive/*.json | shasum -a 256`
   - **수정 전 원본 해시**: `b103ca00570b96e431f52c859abd7cb39f663b7ef7d3933d6f7985fd3d46f658`
   - **G-6 작업 후 해시**: `55a2d553bc01188409cee6645f6009818e6038002de350d087c92d59db5d9698`
   - **G-14 작업 후 (최종 해시)**: **`395ec3a021908ded3f498366b2a7561b63e0bc955aead1062d136e73b6873fc0`**
   - **실제 변경된 데이터 파일 목록 (총 6개, 의도된 대상과 100% 일치)**:
     1. `data/archive/2026-10-19.json` (reelmimic 제거)
     2. `data/archive/index.json` (rising_count 20→19)
     3. `site/public/data/archive/2026-10-19.json` (reelmimic 제거)
     4. `site/public/data/archive/index.json` (rising_count 20→19)
     5. `site/public/data/latest.json` (reelmimic 제거)
     6. `site/public/data/archive/news_index.json` (09-17, 10-07 누락 인덱스 추가)

---

### 3.4. 동작 체크리스트 검증 (1~5)

1. **`stars.yml` 워크플로 정적 검증**:
   - YAML 파싱: macOS 내장 `ruby -ryaml` 기반 문법 검증 통과
   - `deploy` 잡 검증: `needs: collect`, `if: needs.collect.outputs.pushed == 'true'`, `permissions: { pages: write, id-token: write }`, `concurrency: { group: "pages-stars", cancel-in-progress: false }` 확인 완료 (상호 취소 방지 독립 그룹 지정 통과).
2. **홈 검색 "mcp" 결과 탭 라벨 포맷 검증**:
   - `rising` 탭: `"🔥 이번 주 뜨는 4/19"` (`N/M` 포맷 통과)
   - `classic` 탭: `"⭐ 이미 유명한 4/13"` (`N/M` 포맷 통과)
3. **클립보드 복사 피드백 검증**:
   - 권한 허용 상태: 복사 버튼 클릭 시 `"복사됨"` 노출 및 `.is-copied` 클래스 부여 확인.
   - 권한 거부 상태 (`context.grantPermissions([])`): 복사 실패 시 예외를 포착하여 `"복사 실패"` 노출 확인.
4. **20장 스크린샷 캡처 검증**:
   - 5개 페이지(홈, 뉴스, 스타보드, 점유율·성능, 라운지) × 2개 테마(Light, Dark) × 2개 뷰포트(1024×768, 375×812) = **총 20장 캡처 완료**
   - 저장 경로: `.tmp/handoff-site-review/shots/`
5. **빌드 무경고 검증**:
   - `npm run build` 결과 에러 0건, 경고 0건으로 정상 빌드 종료.

---

## 4. 지시와 다르게 한 것과 이유

- **없음**: 지시서 3절 A~H 요구사항, 4절 하지 말 것(push/배포 금지, 허용 외 데이터 파일 무단 수정 금지, `git add -A` 금지), 6절 검증 절차를 지시서에 기재된 내용 그대로 엄격하게 이행했습니다.

---

## 5. 못 한 것 및 추정으로 남은 분석 내역

### 5.1. G-1 모바일 홈 필터 바 오버플로 원인 상세 분석
- **원인**:
  - `styles.css:507`의 `.cat-filter { display: flex; flex-wrap: wrap; flex: 1; }` 규칙에서, 화면 폭이 768px 이하로 좁아질 때 부모인 `.unb-bottom`이 `flex-direction: column`으로 전환됩니다.
  - CSS Flexbox 레이아웃 명세에 따라, flex item의 기본 `min-width`는 `auto`(내부 콘텐츠의 최소 렌더 폭)로 설정됩니다.
  - 480px 이하 규칙(`.unb-bottom .cat-filter { flex-wrap: nowrap; overflow-x: auto; }`)이 적용되면서 15개의 카테고리 칩 행이 줄바꿈 없이 한 줄로 배치되어 내부 최소 너비가 537px로 확장되었습니다.
  - 이때 부모(`.unb-bottom`, 349px)가 column 컨테이너이므로 `min-width: auto`인 자식의 확장을 억제하지 못하고 537px까지 함께 밀려나면서 전체 문서 `scrollWidth`가 560px로 팽창했습니다. 이로 인해 `.filter-right` 내의 검색창과 "순위 기준" 버튼(우측 좌표 560px)이 375px 뷰포트 밖으로 잘려 나갔습니다.
- **해결**: `.cat-filter`에 `min-width: 0; width: 100%; max-width: 100%;`를 부여하여 부모 너비에 강제 구속하고, 가로 스크롤을 활성화하여 `scrollWidth 375px`로 완전히 해결했습니다.

### 5.2. G-5 모달 점수 필드 확인 결과
- `site/src/main.js` 모달 렌더러 분석 결과:
  - 모달 상단에 노출되던 "검증 N/100"은 `item.score`가 아니라 **`item.trend_score`** 필드(`const score = item.trend_score;`)였습니다.
  - 이에 따라 해당 UI 라벨을 "큐레이션 점수" (EN: "Curation score")로 변경하고, `title` 속성에 `"순위 기준 모달의 4축 가중 합계"`를 달아 사용자가 점수의 출처와 산출 기준을 명확히 인지할 수 있도록 처리했습니다.

### 5.3. G-6 reelmimic 별 수 3,630 오류 원인 분석
- `scripts/plugins/collect.js`가 GitHub Search API(`search/repositories`)에서 리포를 수집할 때 API 응답의 `item.stargazers_count`를 그대로 신뢰하여 저장했습니다.
- `edenfunf/reelmimic`은 과거 봇 어뷰징으로 인해 일시적으로 3,630★로 검색 API에 노출되었으나, 이후 GitHub 측의 부정 계정 정지 조치로 실제 89★(2026-10-23 기준)로 급락했습니다.
- `stars_meta.json`에는 `suspect: stars_dropped` 플래그가 기록되어 있었으나, `collect.js`가 수집 시 메타 플래그를 대조하지 않아 필터링되지 못했습니다.
- `scripts/plugins/collect.js`에 `loadStarsMeta()` 함수를 추가하여 `suspect` 플래그가 붙은 리포지토리를 사전 차단하도록 수집 로직을 보완하고, 관련 데이터 파일 5곳에서 reelmimic 항목을 완전 제거했습니다.

---

## 6. 사용자 할 일 (직접 수행 필요 4건)

1. **GitHub Discussions 댓글 삭제**:
   - `https://github.com/ldk-hub/ai-weekly/discussions/2` 에 등록된 테스트 댓글 `"ㅋ"`을 브라우저에서 직접 삭제해 주세요.
2. **Substack 발행물 이름 통일**:
   - Substack 관리자 설정에서 발행물 명칭을 기존 영문 표기에서 **`AI위클리`** 로 통일 변경해 주세요.
3. **브랜치 검토 및 머지·푸시**:
   - 로컬 브랜치 `fix/site-review-2026-10-23`의 커밋 8개를 검토하신 후 `main` 브랜치로 머지하여 푸시해 주세요. (GitHub Actions의 배포 워크플로가 푸시 트리거로 자동 동작합니다)
4. **`GEMINI_API_KEY` 시크릿 등록 여부 결정**:
   - `.github/workflows/weekly-trends.yml`의 스케줄러가 비활성화된 상태입니다. 주간 자동 분석을 재개하고자 하실 경우 GitHub Repository Secrets에 `GEMINI_API_KEY`를 등록하고 워크플로의 주석을 해제해 주세요.
