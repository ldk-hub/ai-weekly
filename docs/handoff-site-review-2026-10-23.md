# 작업지시서 — AI위클리 전수 점검 결함 수정 (2026-10-23)

수행 주체: Gemini (Antigravity, ai-weekly 저장소를 연 상태)
설계·검수: Claude Code 세션 (점검 보고서: meta-be `reports/ai-weekly-site-review-2026-10-23.md`)
작성일: 2026-10-23
성격: **버그 수정 + 작은 UX 보강 묶음.** 결정은 끝났다. 아래 항목을 그대로 구현한다. 커밋은 브랜치에 하고, 푸시·배포는 하지 않는다.
선행 조건: `main` 최신(43deaf1 이후) 기준. `npm install` 이 끝나 `npm run build` 가 통과하는 상태에서 시작한다.

> **대안 비교는 생략한다.** 결정이 끝난 수정 작업이므로 `.agents/AGENTS.md` §1(대안 2~3개 비교, 트레이드오프 표)은 적용하지 않는다. 지시와 다르게 해야 할 이유가 생기면 그 항목만 멈추고 이유를 보고서 4절에 적는다. §3 "수술적 변경" 원칙은 그대로 따른다 — 지시된 줄 밖의 리팩토링 금지.

---

## 0. 배경과 목표

**목표:** 처음 온 사람이 신뢰를 잃는 지점을 없앤다. ① 옛 주차에 남은 미검증 설치 명령 ② 지켜지지 않는 "다음 갱신" 약속 ③ 끊긴 자동화 ④ 모바일 홈 필터 바 잘림 ⑤ 빈 라운지가 메인 탭에 노출. 그리고 같은 수준의 작은 결함을 한 번에 정리한다.

**확정된 결정** (번호는 점검 보고서 §3 우선순위 번호다. 이 문서 전체에서 같은 번호를 쓴다)

| 결정 | 내용 |
|---|---|
| 독자 | 한국어 개발자 1순위. 영문 콘텐츠 번역은 이번 범위 밖 |
| 자동화 (1·2) | 스타보드 일간 배포 트리거는 복구한다. 주간 트렌드 자동화는 수동 유지 — 스케줄만 끈다(시크릿 등록 안 함) |
| 아카이브 (3·4·15) | 데이터 파일은 그대로 두고 **렌더러에서** 설치 명령을 숨기고 제목·라벨 폴백을 넣는다 |
| 뉴스·라운지 갱신 표기 (5) | "다음 …" 대신 "N일 전 갱신" 상대 시각. 뉴스 자동화는 하지 않는다 |
| 라운지 (10) | 메인 내비에서 내리고 푸터 링크만 남긴다. 페이지는 유지 |
| 스타보드 (8) | 리그당 50개 + "더 보기". 원장 JSON 은 브라우저 캐시 허용 |
| 구독 (19) | 버튼 옆 설명 한 줄 + RSS 제목을 AI위클리로 |
| 나머지 (6·7·9·11~14·16~18·20~27) | 결정 없이 수정. 단 "4위 이후 순위 번호 표시"는 하지 않는다(코드 주석 main.js:397~402 의 설계 유지) |

---

## 1. 검증된 사실 — 이 전제로 작업하라

다시 조사하거나 문제로 지적할 필요가 없다. 줄 번호는 2026-10-23 `main` 기준이다.

1. **라이브 데이터 트리는 `site/public/data/`** 다. 루트 `data/` 는 파이프라인 작업본이고 둘은 이미 어긋나 있다(archive 89 vs 92 파일, `archive/index.json` 내용 다름). 이번 작업에서 데이터 파일을 고치는 건 11번 항목(reelmimic) 하나뿐이고, 그때는 두 트리 모두 고친다.
2. **`site/public/data/latest.json` 은 `site/public/data/archive/2026-10-19.json` 과 바이트 동일**하다(cmp 확인).
3. **아카이브 35주 중 `title_ko` 가 없는 주차는 2026-06-08 하나**(22건 전부 없음, `name`·`catchphrase`·`summary_ko` 는 있음). 실제 설치 명령(`install_hint` 가 "README 참고"가 아닌 값)은 21주 524건에 남아 있다. 최신 주차(10-19)는 33건 전부 "README 참고"다. 현재 파이프라인 `scripts/plugins/curate.js:1004,1127` 은 "README 참고"를 고정으로 쓴다. `scripts/plugins/curate_custom.js` 의 수기 항목은 실명령을 쓴다(10-12 주차 33건).
4. **카드 설치 칩**은 main.js:459~472 — `item.install_hint` 가 있으면 무조건 `div.cli-copy-chip` 을 만들고 인라인 `onclick` 에 `navigator.clipboard.writeText('…')` 를 박는다. `escapeHTML(cmd).replace(/'/g, "\\'")` 는 `&#39;` 가 속성 디코딩으로 `'` 가 되는 경로를 막지 못한다. 결과 대기 없이 "✓ 복사됨!" 을 쓴다. 모달의 "설치" 줄도 같은 값을 보여준다(main.js:527 주석 참고).
5. **순위**는 main.js:403~410 `stickerFor(item, idx)` 가 `item.rank ?? idx + 1` 로 계산하는데 `latest.json` 33건 모두 `rank` 가 없다. 그래서 카테고리 칩을 누르면 화면 인덱스로 재부여된다(실측: 에이전트 칩에서 전체 4위 magpie 가 #02, 6위 coucou 가 #03). 모달 `findItem`(main.js:628~633)도 같은 폴백을 쓴다.
6. **주차 메뉴**는 `renderArchiveMenu()`(main.js:241~275). 날짜 라벨은 `a.generated_at || a.date` 가 없으면 `a.file`(예: "2026-06-08.json")을 그대로 쓴다. 메뉴 CSS 는 styles.css:351~364(데스크톱, max-height 없음, 36개 항목 1,220px) 와 styles.css:1553~1560(≤768px: `max-height: min(56vh, 420px); overflow-y: auto`). Esc 처리는 없다(main.js:1237~1256 은 버튼 클릭·바깥 클릭만).
7. **갱신 바**는 `renderUpdateBar()`(main.js:194~239) + `nextUpdateDate()`(main.js:108~119). 뉴스·스타보드는 +1일, 그 외는 다음 월요일. 요소 id: `updated-at`, `next-at`, `next-at-container`, `next-at-sep`, `version-pill`, `version-sep`. 요소가 없으면 건너뛴다. 뉴스 수집은 워크플로가 없고 수동 커밋이다(`.github/workflows/` 에 `stars.yml`·`weekly-trends.yml`·`deploy-pages.yml` 만).
8. **데이터 로더**(main.js:7~79)는 모두 `fetch(url, { cache: "no-store" })` 뒤 `res.ok` 를 보지 않고 `res.json()` 한다. 404 면 `catch` 로 빠져 빈 배열을 넣고, 화면은 "조건에 맞는 항목이 없어요"(홈)·"이 리그에는 아직 등록된 리포지토리가 없습니다"(스타보드)·빈 댓글(라운지)을 보여준다. 점유율(main.js:7~19)만 오류 메시지를 따로 보여준다.
9. **스타보드**는 `renderStarboard()`(main.js:1927~1975) 가 `list.map(starboardCardHTML)` 로 리그 전체를 한 번에 그린다. 라이트급 347개 → 페이지 103,154px, DOM 6,387. `stars_ledger.json` 은 1.75MB(gz 약 256KB) 를 `cache: "no-store"` 로 매 방문 받는다(main.js:39~40). 이미지는 이미 `loading="lazy"` 다. 배지 클래스·라벨은 main.js:1991~2000(active/slowing/dormant ↔ 활발/둔화/방치). 판정 기준은 `processStarboardData()`(main.js:1830~) 안에 있다 — 범례 문구는 거기 실제 임계값으로 쓴다.
10. **자동화**: `stars.yml` 은 `GITHUB_TOKEN` 으로 `main` 에 push 하므로 `deploy-pages.yml`(push 트리거) 이 돌지 않는다. `weekly-trends.yml:71~98` 에 같은 문제를 해결한 `deploy` 잡이 이미 있다(이 패턴을 그대로 쓴다). `weekly-trends.yml` 스케줄 실행은 09-14~10-19 6회 연속 "Check GEMINI_API_KEY" 단계에서 실패했다(시크릿 미등록). 시크릿은 등록하지 않기로 했다.
11. **별 수 오류**: `site/public/data/latest.json` 의 edenfunf/reelmimic 은 `stars: 3630, velocity_7d: 809, v7d_estimated: false` 인데 GitHub API 실측은 89★(2026-10-23, created 2026-09-28). `scripts/plugins/collect.js` 는 `search/repositories` 결과의 `stargazers_count` 를 쓴다(collect.js:38, 97). 발행 하한선 `MIN_PUBLISH_STARS = 500` 이 있으므로 실제 값이면 애초에 발행되지 않았을 항목이다.
12. **모바일 홈 필터 바**(375×812 실측): `.unb-bottom` 은 column 으로 바뀌고 폭 349px 인데 자식 `nav.cat-filter` 가 537px 로 렌더돼 문서 폭이 560px 이 된다(`documentElement.scrollWidth 560`). 그래서 검색창이 잘리고 "순위 기준" 버튼(right 560px)이 화면 밖이다. 관련 CSS: styles.css:507~512(`.cat-filter { display:flex; flex-wrap:wrap; flex:1 }`), 1503~1511(≤768px column), 1948~1963(≤480px `.unb-bottom .cat-filter { flex-wrap:nowrap; overflow-x:auto; … }`). 뉴스·스타보드·점유율·라운지는 375px 에서 가로 넘침이 없다.
13. **라이트 모드 대비**(정적 계산): `.rank-pill.is-top` 흰 글자 on `--hl-coral #ff9476` = 2.15:1(styles.css:737; 다크는 `color: var(--ink)` 로 통과). `--accent #d97757` 12px 글자(`.category-label` styles.css:768, `.signal-badge` :2100, 인라인 "필터 초기화" main.js:883 등) 2.7~3.1:1. `--mint #2bab84` 속도 숫자 2.5:1. 다크 토큰은 전부 4.5:1 이상.
14. **폰트**: 5개 HTML 이 `https://fonts.googleapis.com/css2?family=Pretendard…` 를 렌더 차단 스타일시트로 부른다(index.html:30~32, news:31~33, starboard:30~32, lounge:31~33, benchmarks:25~27). 이 패밀리는 Google Fonts 에 없어 **항상 400** 이다. 본문 폰트 스택(styles.css:99)은 로컬 A2-Gothic → Pretendard → 시스템 순이라 방문자는 시스템 폰트를 본다.
15. **SEO 파일**: `site/robots.txt` 는 `publicDir: 'public'`(vite.config.js:7) 밖이라 빌드에 안 들어가 라이브 404. `site/public/sitemap.xml` 은 `.html` 주소 4개(benchmarks 없음), 각 페이지 canonical 은 확장자 없는 주소, og:url 은 `.html`. 404.html 없음.
16. **RSS**: `scripts/core/generate-rss.js:81,87,96` 과 현재 `site/public/feed.xml` 제목이 "cc-trends — Claude Code 도구 주간 인덱스". 사이트 이름은 AI위클리.
17. **점유율 "기타"**: 점유율 목록은 1~5위 + "기타 N개 펼치기" 집계 행인데 N=1 이면 접힌 상태에서도 집계 행에 DeepSeek 0.02% 가 보이고, 펼치면 "6 DeepSeek 0.02%" 가 한 번 더 나온다. "▲▼ 전월 대비 %p" 열은 `mom_change` 가 전부 null 이라 6행 모두 "—".
18. **접근성 실측**: 탭 버튼 접근성 이름이 이모지("🔥"/"⭐")뿐(텍스트가 `<span>` 안에 있어도 이름에 안 잡힘 — 이모지가 먼저라 그렇다), `aria-controls` 없음. 칩 `aria-pressed` 없음. 아바타 `<img>` alt 없음(홈 21·뉴스 16·스타보드 121). skip link 없음. h1 다음이 h3. 상세 모달 `openModal()`(main.js:636~645) 은 포커스를 옮기지 않는다(`focusInside: false`). `.subscribe-form input` 은 `outline: none`(styles.css:418).
19. **언어**는 `getLang()`, 문구는 기존처럼 `lang === "en" ? … : …`. `render()` 가 다시 불린다(main.js:1592~1601). 새 문구는 모두 두 언어로 쓴다(UI 라벨만. 콘텐츠 번역은 범위 밖).
20. **해시 기록**: 시작할 때 `shasum -a 256 site/public/data/latest.json site/public/data/archive/*.json data/archive/*.json | shasum -a 256` 값을 보고서에 적는다. 끝날 때 11번 항목으로 바꾼 4개 파일 외에는 같은 값이어야 한다(바뀐 4개는 각각 전후 해시를 적는다).

---

## 2. 작업 범위

**한다**
- 3절의 A~H 전부. 파일: `.github/workflows/stars.yml`, `.github/workflows/weekly-trends.yml`, `site/src/main.js`, `site/styles.css`, 5개 HTML, `site/public/sitemap.xml`, `site/robots.txt → site/public/robots.txt`, `site/public/feed.xml`, `scripts/core/generate-rss.js`, `scripts/plugins/collect.js`(원인 수정), 데이터 4파일(11번만)

**하지 않는다** (이유는 결정 표 참조)
- 영문 콘텐츠 번역(`description_en`·`title_en`·스타보드 `desc_ko`), EN 토글 제거 여부
- `data/archive/*.json`·`site/public/data/archive/*.json` 의 `install_hint`·`title_ko` 데이터 수정(렌더러로 해결)
- GEMINI_API_KEY 시크릿 등록, 뉴스 수집 자동화
- Substack 발행물 이름 변경, GitHub Discussions 댓글 삭제(사용자가 한다 — 보고서 6절에 적어둘 것)
- 4위 이후 순위 번호 표시, 스타보드 가상 스크롤, 404.html 디자인(기본 404 유지)
- 디자인 토큰·레이아웃의 광범위한 변경, 새 npm 패키지 추가

---

## 3. 작업 항목 (이 순서로, 그룹마다 커밋 1개)

### A. 자동화 (1·2)
- A-1 `.github/workflows/stars.yml`: `collect` 잡 뒤에 `deploy` 잡을 추가한다. `weekly-trends.yml:71~98` 의 `deploy` 잡을 **그대로 복사**하고 `needs: collect` 로 바꾼다(권한 `pages: write`, `id-token: write`, `environment: github-pages`, `ref: main` 체크아웃, Node 22, `npm install`, `npm run build`, configure-pages → upload-pages-artifact(`./dist`) → deploy-pages). `concurrency` 는 `deploy-pages.yml` 과 같은 `group: pages` 를 **쓰지 않는다**(그 잡의 `cancel-in-progress: true` 가 서로를 취소한다) — 그룹 이름을 `pages-stars` 로 둔다. 커밋이 없어 "No changes to commit." 인 날도 배포가 돌지 않게, `collect` 잡이 커밋 여부를 `outputs.pushed` 로 내보내고 `deploy` 는 `if: needs.collect.outputs.pushed == 'true'` 로 건다.
- A-2 `.github/workflows/weekly-trends.yml`: `on.schedule` 블록을 주석 처리하고 바로 위에 한 줄 주석 `# 2026-10-23 수동 운영으로 전환(GEMINI_API_KEY 미등록). 되살리려면 시크릿 등록 후 주석 해제` 를 단다. `workflow_dispatch` 와 나머지는 그대로.

### B. 설치 칩과 복사 (3·4·12)
- B-1 main.js:459~472: 설치 칩 생성 조건을 바꾼다. **아카이브(`STATE.source !== "latest"`)에서는 명령을 절대 보여주지 않는다** — `install_hint` 가 있어도 "설치: README 참고" 텍스트 한 줄(복사 없음). 최신 주차에서는 `install_hint` 가 "README 참고"(또는 "README" 로 시작하는 안내문)이면 같은 텍스트 한 줄, 그 외 실제 명령이면 복사 버튼을 붙인다. 지금 최신 주차는 전부 "README 참고"라 복사 버튼은 결과적으로 0개가 된다 — 정상이다.
- B-2 복사 버튼은 `<div onclick>` 대신 `<button type="button" class="cli-copy-chip" data-cmd="…">` 로 바꾸고, `#grid` 의 기존 위임 리스너(main.js:1258~) 에서 `.cli-copy-chip` 클릭을 처리한다. `data-cmd` 는 `escapeHTML` 로만 넣는다(JS 문자열로 만들지 않는다). `navigator.clipboard.writeText(btn.dataset.cmd).then(성공 표시).catch(실패 표시)` — 실패 시 "복사 실패"/"Copy failed" 를 1.5초 보여준다. 거짓 성공 표시는 없앤다.
- B-3 모달의 "설치" 줄(main.js `modalHTML`)도 B-1 과 같은 규칙을 쓴다.
- B-4 `.cli-copy-chip` 이 `button` 이 되면서 깨지는 CSS(기본 버튼 배경·테두리·폰트)를 `.cli-copy-chip` 규칙에서 초기화한다. 모양은 지금과 같아야 한다.

### C. 아카이브 렌더 폴백 (15)
- C-1 카드 제목: `stripRepoPrefix(item.title_ko, item.name)` 가 비면 `item.catchphrase` → `item.name` 순으로 폴백(main.js:477, 563 두 곳). 리포 줄(`owner/name`)이 비는 원인도 같은 함수에서 확인해 `item.owner`/`item.name` 또는 `repo_url` 에서 뽑아 채운다. 2026-06-08 주차의 22장 모두 제목·리포 줄이 보여야 한다.
- C-2 `renderArchiveMenu()`: 오른쪽 날짜는 `a.file` 의 날짜(`/(\d{4})-(\d{2})-(\d{2})/`)를 **우선** 쓰고, 없을 때만 `generated_at` 을 쓴다. 파일명이 그대로 노출되는 경로를 없앤다. (index.json 의 06-01↔05-25, 05-11↔05-04 불일치는 데이터를 고치지 않고 이 규칙으로 화면만 맞춘다.)
- C-3 갱신 바: 아카이브를 볼 때 `generated_at` 이 null 이면 "— 갱신" 대신 파일 날짜(버전 필 값)를 쓴다.

### D. 갱신 표기 (5)
- D-1 뉴스·라운지 페이지에서는 `renderUpdateBar()` 가 "다음 …" 컨테이너를 숨기고(`next-at-container`·`next-at-sep` display none), `updated-at` 를 `YYYY.MM.DD (요일)` 뒤에 상대 시각을 덧붙인다: 오늘 → "오늘", 1일 → "어제", N일 → "N일 전" (EN: "today"/"yesterday"/"N days ago"). 날짜 비교는 KST 자정 기준(날짜 문자열 비교).
- D-2 홈(주간, 다음 월요일)·스타보드(일간, A-1 로 배포가 따라오므로 유효)는 그대로 둔다. `nextUpdateDate()` 의 `isNewsPage` 분기는 더 이상 쓰이지 않으니 제거한다.

### E. 라운지 강등 (10)
- E-1 5개 HTML 의 `<nav class="page-nav">` 에서 `lounge` 링크를 제거한다. 푸터의 라운지 링크는 유지한다. `lounge.html` 과 `main.js` 의 라운지 로직은 건드리지 않는다.
- E-2 `site/public/sitemap.xml`: 주소를 canonical 과 같은 **확장자 없는 형식**으로 바꾸고 `benchmarks` 를 추가한다(lounge 는 `priority 0.3` 으로 내린다). 5개 HTML 의 `og:url` 도 확장자 없는 주소로 맞춘다.

### F. 스타보드 (8·13·21)
- F-1 `renderStarboard()`: `STATE.sbLimit`(기본 50) 만큼만 그리고, 남은 개수가 있으면 목록 아래 `<button class="expand-toggle-btn" id="sb-more">더 보기 (남은 N개)</button>` 를 붙인다. 클릭 시 50 추가. 리그 탭 전환·검색어 변경 시 50 으로 초기화. 검색은 리그 전체 대상(지금처럼), 결과 표시만 50개 단위.
- F-2 main.js:39~40 두 fetch 에서 `{ cache: "no-store" }` 를 뺀다(GitHub Pages 의 `max-age=600` + ETag 로 충분, 일간 데이터).
- F-3 배지 범례: 리그 탭 아래(또는 검색창 옆)에 한 줄 `활발 · 둔화 · 방치 = <processStarboardData 의 실제 기준>` 을 두 언어로 넣고, 각 `.sb-badge` 에 같은 문구를 `title` 로 단다. 임계값은 코드에서 읽어 쓴다 — 추측 금지.
- F-4 스파크라인 `<svg>` 에 `role="img"` 와 `aria-label="최근 N일 별 추이"`(N 은 실제 샘플 기간) 를 단다. 장식으로 두려면 `aria-hidden="true"` 로 통일한다 — 둘 중 하나로 347개 전부.

### G. 결함 묶음 (6·7·9·11·14·16~18·20·22~27)
- G-1 **모바일 홈 필터 바 (7)**: 375px 에서 `nav.cat-filter` 가 부모(`.unb-bottom`, 349px)를 넘지 않게 한다. 기대 결과: ≤480px 에서 칩 행은 **1줄 가로 스크롤**(지금 의도대로, styles.css:1948~1963), 그 폭은 부모와 같고(`min-width: 0; width: 100%; max-width: 100%` 류), `.filter-right` 의 검색창과 "순위 기준" 버튼은 둘 다 화면 안. 문서 `scrollWidth` 는 375. 원인은 `.cat-filter { flex: 1 }`(507~512) 가 column 컨테이너에서 폭을 정하지 못하는 조합으로 추정 — 실제 원인을 DevTools 로 확인하고 보고서에 적는다.
- G-2 **주차 드롭다운 (11)**: `.archive-menu` 데스크톱 규칙(styles.css:351~)에 `max-height: min(60vh, 520px); overflow-y: auto; overscroll-behavior: contain` 추가. main.js 에 `keydown` Esc 로 닫기(열려 있을 때만, 포커스를 `#archive-btn` 으로 복귀). 뉴스 페이지의 같은 메뉴도 함께 적용된다.
- G-3 **fetch 실패 처리 (9)**: main.js:7~79 의 모든 로더에서 `if (!res.ok) throw new Error(\`HTTP ${res.status}\`)` 를 `res.json()` 앞에 넣고, `catch` 에서 `STATE.loadError = e.message` 를 세운다. 각 페이지 빈 상태 렌더에서 `STATE.loadError` 가 있으면 "데이터를 불러오지 못했습니다 (HTTP 404). 잠시 후 새로고침해 주세요." 식 오류 문구(두 언어)를 **"조건에 맞는 항목이 없어요" 대신** 보여준다. 점유율은 이미 되어 있으니 문구만 통일.
- G-4 **순위 고정 (14)**: 데이터 로드 직후(홈 로더 `catch` 전) `rising`·`classic` 각각 `item.rank ??= index + 1` 로 한 번 채운다. `stickerFor`·`findItem` 의 `?? idx + 1` 폴백은 그대로 둬도 되지만 더 이상 타지 않아야 한다. 아카이브 주차에도 같은 처리. 데이터 파일은 안 고친다.
- G-5 **상세 모달 포커스 (13)**: `openModal()` 에서 열기 전 `document.activeElement` 를 저장하고, 연 뒤 `#modal .modal-panel`(`tabindex="-1"` 부여) 또는 닫기 버튼으로 포커스를 옮긴다. `closeModal()` 에서 저장한 요소로 되돌린다. Tab 포커스가 모달 밖으로 나가지 않게 첫/마지막 포커스 요소에서 순환시킨다. "검증 N/100"(main.js:519, 543) 은 라벨을 "큐레이션 점수"(EN "Curation score")로 바꾸고 `title` 에 "순위 기준 모달의 4축 가중 합계" 를 단다 — 이 숫자가 `item.score` 인지 `trend_score` 인지 코드로 확인해 보고서에 적는다.
- G-6 **reelmimic (6·11)**: ① `scripts/plugins/collect.js` 에서 3,630 이 어떻게 들어왔는지 원인을 찾는다(검색 API 결과의 다른 리포가 같은 `name` 으로 합쳐졌는지, `full_name` 키 충돌인지, 원장(`data/stars` 또는 ledger) 의 이전 값인지). 원인을 고친다. ② `site/public/data/latest.json`, `site/public/data/archive/2026-10-19.json`, `data/archive/2026-10-19.json` (+ 루트 `data/` 에 같은 latest 가 있으면 그것도) 에서 reelmimic 항목을 **제거**한다(실제 89★는 발행 하한 500 미달). `rising` 20 → 19. `archive/index.json` 두 트리의 `rising_count` 도 19 로. 제거 전후 해시를 보고서에.
- G-7 **폰트 (17)**: 5개 HTML 에서 Google Fonts `Pretendard` 링크 3줄(preconnect 2 + stylesheet 1)을 지운다. 다른 폰트 CDN 을 추가하지 않는다. `styles.css:99` 스택은 그대로(로컬 Pretendard 가 있으면 쓰이고 없으면 시스템).
- G-8 **라이트 모드 대비 (18)**: `.rank-pill.is-top` 라이트에서 `color: var(--ink)`(다크와 동일하게). 12px 이하 accent 글자(`.category-label`, `.signal-badge`, 인라인 "필터 초기화"·"검색 초기화", `.feed-results-count` 안 버튼)는 라이트 모드 전용 토큰 `--accent-text`(예: `#b85f3f` 근처, **측정해서 4.5:1 이상**)를 새로 두고 그 토큰만 쓴다. `--mint` 속도 숫자도 라이트에서 4.5:1 이상인 톤으로. 다크 토큰은 손대지 않는다. 측정값을 6절 스니펫 B 로 보고서에 적는다.
- G-9 **SEO 파일 (23·27)**: `site/robots.txt` 를 `site/public/robots.txt` 로 옮긴다(내용 그대로). E-2 의 sitemap 과 함께 빌드 결과 `dist/robots.txt`·`dist/sitemap.xml` 을 확인.
- G-10 **점유율 (20)**: "기타 N개" 집계 행은 N ≥ 2 일 때만 만든다. N = 1 이면 그 항목을 6위 일반 행으로 바로 그린다. "전월 대비" 열은 `market_shares` 전체가 `mom_change == null` 이면 열 자체를 숨기고 머리글 설명 줄에 "전월 데이터 없음" 을 한 번만 적는다(두 언어).
- G-11 **별 수 기준 시각 (22)**: 홈 카드의 `★ 322k` 와 모달의 `★ 283,265` 에 `title="2026.10.19 기준 (주간 스냅샷)"`(EN 동일 의미) 을 단다. 값은 `STATE.data.generated_at`.
- G-12 **접근성 묶음 (24)**: 탭 버튼 — 이모지를 `<span aria-hidden="true">` 로 감싸고 `aria-controls="grid"` 추가(5개 HTML 의 홈·스타보드 탭 모두). 카테고리 칩 — 활성 칩에 `aria-pressed="true"`, 나머지 `false`(`cat-filter` 는 `role="tablist"` 가 아니라 일반 `nav` 로 두고 칩은 `button`). 아바타 `<img>` 3곳 — `alt=""`(장식) 로 통일. 각 HTML `<body>` 첫 요소로 `<a class="skip-link" href="#main">본문으로 건너뛰기</a>` + `<main id="main">`(CSS: 포커스 때만 보이게). `.subscribe-form input` 의 `outline: none` 을 `:focus-visible` 아웃라인으로 교체. 카드 섹션 제목 `h3` 는 그대로 두되 `main` 첫머리에 시각적으로 숨긴 `h2`(예: "이번 주 뜨는 도구 목록") 를 둬 h1→h2→h3 가 되게 한다.
- G-13 **검색·탭 카운트 (25)**: 검색어·칩 필터가 걸려 있으면 탭 라벨 카운트를 "일치 N / 전체 M" 형식(예: `4/13`)으로 바꾸고, 반대쪽 탭에도 일치 수를 같은 형식으로 보여준다. 검색 범위는 바꾸지 않는다.
- G-14 **아카이브 메뉴 누락 (26)**: `site/public/data/archive/news_index.json` 에 `news_2026-09-17.json`·`news_2026-10-07.json` 항목을 추가한다(파일이 두 트리에 실제로 있는지 먼저 확인). 이것은 인덱스 파일 수정이지 콘텐츠 수정이 아니다.

### H. 구독 (19)
- H-1 5개 HTML 의 `#subscribe-wrapper` 안, 구독 버튼 옆(또는 폼이 열릴 때 폼 위)에 한 줄 설명 `매주 월요일, 이번 주 도구 요약을 메일로` / `Every Monday: this week's tools, by email` 을 `.subscribe-hint` 로 넣는다. 모바일에서는 버튼 아래 줄바꿈.
- H-2 `scripts/core/generate-rss.js:81,87,96` 의 "cc-trends" 를 "AI위클리" 로 바꾼다(`guid` 는 기존 구독자 중복 방지를 위해 **그대로** `cc-trends-${date}` 유지). 현재 `site/public/feed.xml` 의 `<title>` 도 같은 값으로 바꾼다(항목 guid 는 손대지 않는다).

---

## 4. 하지 말 것

- `git add -A` / `git add .` 금지. Antigravity 터미널의 git 은 `~/.gitignore_global` 을 읽지 않아 `.agents/`, `AGENTS.md`, `skills/`, `CAREER_*.md` 가 untracked 로 보인다. **바꾼 파일만 경로를 적어 add** 한다.
- `git push`, 배포, `main` 직접 커밋 금지. 브랜치 `fix/site-review-2026-10-23` 에서 그룹당 커밋 1개(메시지: `fix(site): A 자동화 — 스타보드 배포 트리거, 주간 스케줄 비활성화` 식으로 그룹 글자 + 요지).
- `data/archive/*.json`·`site/public/data/**` 수정 금지 — 예외는 G-6(4파일)과 G-14(news_index.json) 뿐.
- 새 npm 패키지, 새 폰트 CDN, 디자인 토큰 체계 변경, 컴포넌트 구조 리팩토링 금지.
- `.agents/AGENTS.md` §1 대안 비교 금지(이 문서 머리말 참조).
- 시크릿 등록·GitHub 설정 변경·Discussions 댓글 삭제·Substack 설정 시도 금지(사용자가 한다).
- 보고서에 "확인했다"고 쓰려면 **측정값**이 있어야 한다. 토큰 일치나 코드 읽기로 추론한 것은 "추정"이라고 쓴다.

---

## 5. 허용된 실행

- `npm run build`, `npm run dev`(5173), `npm run preview`
- Playwright 스크립트(`playwright` 는 이미 devDependency 가 아닌 dependency 로 설치돼 있다). 브라우저는 `chromium.launch({ channel: "chrome" })`.
- `node -e`, `shasum`, `git diff/status/add <경로>/commit`, `gh api`(읽기 전용: 워크플로 실행 이력 확인)
- `scripts/plugins/collect.js` 는 **실행하지 않는다**(GitHub API 호출·원장 변경). 원인 분석은 코드 읽기 + 필요하면 해당 함수만 떼어 `node -e` 로 재현.

---

## 6. 검증 — 브라우저에서 측정하고 값을 보고서에 그대로 적는다

`npm run build` 뒤 `npm run preview`(또는 dev) 로 띄우고 Playwright 로 아래를 잰다. 스크립트는 `.tmp/handoff-site-review/verify.mjs` 로 저장하고 보고서에 경로를 적는다. 각 항목은 **기대값 / 측정값 / 통과 여부** 세 칸으로 적는다.

### 스니펫 A — 레이아웃·동작 (viewport 별)
```js
// 1024×768, 홈
openArchive(); // #archive-btn 클릭
getComputedStyle(menu).maxHeight !== 'none' && menu.getBoundingClientRect().bottom <= innerHeight   // 기대 true
press('Escape'); menu.hidden === true && document.activeElement.id === 'archive-btn'                // 기대 true
// 375×812, 홈
document.documentElement.scrollWidth <= 375                                                          // 기대 true (수정 전 560)
document.querySelector('.cat-filter').getBoundingClientRect().width <= 349                           // 기대 true (수정 전 537)
[...document.querySelectorAll('.filter-right *')].every(e => e.getBoundingClientRect().right <= 375) // 기대 true
// 홈 최신, 에이전트 칩 클릭 후
firstCard.repo === 'morluto/rea' && firstCard.pill === '#01' && magpieCard.pill === null             // 기대 true (수정 전 magpie #02)
// 홈, 2026-06-08 주차
[...document.querySelectorAll('article.card h3')].every(h => h.textContent.trim().length > 0)       // 기대 true (수정 전 "")
document.querySelectorAll('.cli-copy-chip').length === 0                                             // 모든 아카이브 주차에서 0. index.json 의 35주를 전부 돌린다
// 홈 최신
document.querySelectorAll('.cli-copy-chip').length === 0 && text.includes('README 참고')             // 기대 true
// 홈, route('**/data/latest.json', 404)
main.innerText.includes('불러오지 못했')                                                               // 기대 true (수정 전 "조건에 맞는 항목이 없어요")
// 뉴스
getComputedStyle(nextAtContainer).display === 'none' && /오늘|어제|\d+일 전/.test(updatedAt.textContent) // 기대 true
// 5페이지
document.querySelectorAll('.page-nav a[href="lounge"]').length === 0 && footer.querySelector('a[href="lounge"]') // 기대 true
// 스타보드 라이트급
cards.length === 50 && moreBtn && (click, cards.length === 100)                                      // 기대 true (수정 전 347)
// 모달
openModal(); modal.contains(document.activeElement) === true; press('Escape'); document.activeElement === titleButton // 기대 true
// 점유율
rowsNamed('DeepSeek').length === 1                                                                   // 기대 1 (수정 전 2)
// 네트워크 (5페이지 각각)
requests.filter(u => u.includes('fonts.googleapis.com')).length === 0                               // 기대 0
starboard: ledgerRequest.cacheMode !== 'no-store'                                                    // 코드 grep 으로 확인해도 됨
```

### 스니펫 B — 글자 대비 (라이트·다크 각각)
`docs/handoff-benchmarks-ux.md` 6절 스니펫 B 를 그대로 쓴다. 대상: `.rank-pill.is-top`(글자/배경), `.category-label`, `.signal-badge`, `#clear-filters-btn`(main.js:883)·`#clear-plugin-filters-btn`, 스타보드 `.sb-velocity`(mint 숫자). 기대: 전부 **4.5:1 이상**. 수정 전 값(2.15 / 2.7~3.1 / 2.5)도 같이 적는다.

### 스니펫 C — 빌드 산출물·데이터
```sh
npm run build
test -f dist/robots.txt && grep -c benchmarks dist/sitemap.xml && ! grep -q '\.html' dist/sitemap.xml
grep -c 'fonts.googleapis' dist/*.html            # 기대 0
grep -c 'AI위클리' site/public/feed.xml            # 기대 ≥ 1, 'cc-trends' 는 guid 에만
# 해시: 1절 20번 방식. 바뀐 파일 목록이 정확히 G-6 4파일 + G-14 1파일인지
git status --porcelain                            # 의도한 파일만
```

### 동작 체크리스트 (각각 통과/실패와 관찰 내용을 적는다)
1. `stars.yml` 을 `act` 없이 검증: YAML 파싱(`node -e "require('yaml')"` 가 없으면 `python3 -c "import yaml"`), `deploy` 잡의 `needs`·`if`·권한·concurrency 그룹 이름 확인
2. 홈 검색 "mcp" → 탭 라벨이 `N/M` 형식, 반대 탭에도 일치 수
3. 복사 버튼이 있는 상황을 만들기 위해 임시로 `install_hint: "npx foo"` 를 가진 항목을 **메모리에서만**(DevTools 로 STATE 수정) 넣고 복사 클릭 → 성공 표시, 클립보드 권한 거부 상황(`context.grantPermissions([])`) → "복사 실패" 표시
4. 라이트·다크 모두에서 5페이지 스크린샷(1024×768, 375×812) 20장을 `.tmp/handoff-site-review/shots/` 에 저장
5. `npm run build` 경고 0

---

## 7. 보고서

`docs/review-site-review-2026-10-23-gemini.md` 로 저장. 구조:
1. 요약 5줄(무엇을 했고 무엇이 남았나)
2. 그룹 A~H 별 변경 파일과 줄 범위, 커밋 해시
3. 6절 검증 결과 표(기대/측정/통과) + 스니펫 B 대비 표 + 해시 전후
4. 지시와 다르게 한 것과 이유(없으면 "없음")
5. 못 한 것·추정으로 남은 것(G-1 원인, G-5 점수 필드, G-6 원인 등)
6. 사용자 할 일: GitHub Discussions 댓글 "ㅋ"(discussions/2) 삭제, Substack 발행물명 AI위클리로 변경, 브랜치 검토 후 머지·푸시(배포는 push 로 자동), GEMINI_API_KEY 를 등록할지 결정

---

## 8. 완료 기준 (검수 시 이 순서로 확인)

1. `git log fix/site-review-2026-10-23` 에 그룹별 커밋 8개(A~H), 각 커밋의 파일이 2절 범위 안
2. 데이터 해시: G-6 4파일·G-14 1파일 외 전부 동일
3. `npm run build` 통과, `dist/robots.txt` 존재, `dist/sitemap.xml` 에 benchmarks 포함·`.html` 없음, `dist/*.html` 에 `fonts.googleapis` 0
4. 스니펫 A 전 항목 통과(아카이브 35주 전부 `.cli-copy-chip` 0 포함)
5. 스니펫 B 전 항목 4.5:1 이상(라이트), 다크 변동 없음
6. 모바일 375 홈: `scrollWidth 375`, 순위 기준 버튼 화면 안 — 스크린샷으로
7. `stars.yml` 의 `deploy` 잡이 `weekly-trends.yml` 패턴과 같고, `cancel-in-progress` 로 서로를 취소하지 않음
8. 보고서 6절 "사용자 할 일" 4개가 적혀 있음
