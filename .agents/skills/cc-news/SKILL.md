---
name: cc-news
description: "지난 24시간의 AI 기술 신호(모델 출시·제품 기능·개발자 도구·개인 오픈소스·연구·활용 워크플로우)를 7개 매체에서 수집해 한국어로 재작성 요약하고 정적 사이트에 배포하는 데일리 파이프라인. 매체: GeekNews, Hacker News, AI타임스, Reddit, GitHub, Bluesky, HF Daily Papers. 트리거: cc-news, 데일리뉴스 업데이트"
---

# CC News — 데일리 AI 기술 신호 파이프라인

**목적:** 지난 24시간 동안 발생한 **AI 기술 신호**를 빠짐없이 모아, 원문 스크랩이 아니라 **읽고 이해한 내용을 한국어로 재작성한 요약**으로 배포한다.

## 수집 매체 (7종 고정)

| 매체 | 구현 | 비고 |
|---|---|---|
| GeekNews | RSS `news.hada.io/rss/news` | |
| Hacker News | Algolia `search_by_date` (10개 쿼리, points≥15) | |
| AI타임스 | RSS `aitimes.com/rss/allArticle.xml` | |
| Reddit | `r/<sub>/top/.rss?t=day` × 5서브 | 무인증 200, IP throttle 있음 |
| GitHub | Search API 3쿼리 (생성 7·10·14일 창) | `GH_TOKEN` 필요. 랭킹은 절대 star 가 아니라 하루평균 star |
| Bluesky | `api.bsky.app` searchPosts 4쿼리 | 무인증. **링크 카드를 단 글만** 채택 — 링크 발굴 창구로 쓴다 |
| HF Daily Papers | `huggingface.co/api/daily_papers?date=` | 무인증. `research` 축 전용. 원 논문 21일 초과분 폐기 |

**X·Threads 는 2026-08-25 목록에서 내렸다.** `last30days` 가 두 매체를 7일 연속 0건으로 반환해 문서상 약속만 남고 실물이 없었다. 소셜 축은 Bluesky 직접 수집이 대신한다. 과거 아카이브에는 X·Threads 항목이 남아 있으므로 **프론트의 해당 플랫폼 아이콘 분기는 지우지 않는다.**

**매체 추가 조건은 하나 — 일 단위로 신규 항목이 나올 것.** 과거 Simon Willison·네이버 D2·Anthropic News·arXiv 를 넣었다가, 발행 주기가 24시간보다 길어 창 안에 글이 없자 **창 밖 과거 기사를 끌어와 오늘치로 배포**하는 회귀가 발생했다(2026-08-03, 8건). 그 회귀의 원인이던 창 밖 보충(floor-fill)은 제거됐고 크로스데이 차단이 들어갔으므로, 저빈도 매체는 이제 그날 0건이 될 뿐 과거 기사를 끌어오지 못한다. 그래도 목록은 위 7종으로 유지하고, 늘릴 때는 매일 갱신되는지부터 실측한다. 목록 밖 매체는 `last30days` 결과에서도 버린다.

`last30days` 경유 수집(`fetchSocial`)은 X·Threads 를 내린 뒤로 Reddit·Hacker News·GitHub 만 보탠다 — 셋 다 직접 수집이 더 촘촘하므로 **이 경로는 사실상 중복이다.** 180초 파이썬 서브프로세스를 유지할 값이 있는지 재검토 대상.

## 무엇을 수집하는가 (기술 신호 6축)

`signal_id` 로 분류하며, 배포되는 모든 항목은 아래 중 **정확히 하나**에 속한다. 목록 밖 값(`industry` 등)은 게이트에서 폐기된다.

| signal_id | 내용 |
|---|---|
| `model` | 새 모델·버전 출시·프리뷰·벤치마크 (빅테크·오픈소스 모두) |
| `product` | 제품 신기능 |
| `devtool` | 개발자 도구·코딩 에이전트·MCP·CLI |
| `oss` | **개인·소규모 개발자가 만든 오픈소스·라이브러리·실험 도구** (신생 저star 리포 적극 발굴) |
| `research` | 논문·연구·새 기법 |
| `practice` | AI 실제 활용 사례·워크플로우 팁 |
| `policy` | 정책·규제·인프라 — **기술에 직접·크게 영향 주는 것만, 요약도 짧게** |

## 배제 대상 (하드 룰)

- **주식·증시·펀딩 금액 중심의 투자/재무 기사** — 코드로도 막는다(`FINANCE_RE`). "AI 인프라 투자 트렌드" 같은 우회 논리로 되살리지 않는다
- AI 무관 일반 뉴스, 광고, 낚시성 기사
- **24시간 창 밖 과거 기사** — 창 밖 보충(floor-fill)은 제거됐다. 24시간 창이 이 파이프라인의 유일한 신선도 계약이다
- **최근 7일 안에 이미 배포한 URL** — `collect_news.js` 가 `archive/news_*.json` 을 읽어 후보 단계에서 차단한다(`NEWS_REPEAT_LOOKBACK_DAYS`). 유일한 예외는 GitHub 리포가 그동안 star 를 30% 이상 늘린 경우이고, 이때도 신규 발표가 아니라 `is_update` 업데이트 항목으로만 다룬다
- 본문이 빈약하거나 제목만 반복하는 기사 (본문 120자 미만 폐기)

**제외 아님:** OpenAI·Google·Meta·Anthropic 등 빅테크의 신규 모델·기능 발표는 `model`/`product` 의 **1급 신호**다. (구버전 프롬프트가 "빅테크 뻔한 뉴스 제외"로 버렸던 것이 회귀 지점.)

## 산출물 규격

`site/public/data/news_latest.json` — 항목별 필수 필드:

| 필드 | 규칙 |
|---|---|
| `title_ko` | 영문 원문은 반드시 한국어 번역. `[임시 번역]` 류 접두사 금지. 재등장 항목은 `[업데이트] ` 로 시작 |
| `summary_ko` | 정확히 3불릿(`• ` 시작). ①무엇이 일어났나 ②기술적으로 뭐가 새로운가(수치·모델명·벤치마크) ③개발자에게 왜 중요한가 |
| `body_ko` | **5~10문장** 해설. 배경·동작 방식·한계·비교 대상. 원문 통째 복사 금지 |
| `signal_id` / `signal_name` | 위 6축(+policy) 중 하나. `signal_name` 은 `signal_id` 와 짝이 맞아야 함 |
| `importance` | 0~100. 신규성·기술적 실체·실사용 영향·교차 출처. 40 미만 폐기 |
| `category_id` / `category_name` | 출처 플랫폼 (프론트 탭 필터용) |
| `url` / `author_profile` / `publish_date` / `metrics` | **후보 파일 값을 그대로 쓴다. 지어내면 검증에서 걸린다** |
| `sources` | 같은 이슈를 다룬 매체 목록 (중복 제거 시 누적) |
| `is_update` | 최근 7일 안에 이미 배포한 대상이 star 급증으로 재등장한 경우에만 `true` (+ `prev_stars`·`star_growth_pct`). 없는 항목엔 필드 자체를 만들지 않는다 |
| `curated_by` | `"ldk-hub"` 고정 |

`oss` 항목은 `body_ko` 에 "무엇을 하는 도구 / 어떻게 쓰는지 / 누가 만들었는지", `research` 항목은 "제안 기법 / 실험 수치 / 기존 대비 차이"를 포함해야 한다.
GitHub 출처 항목은 **왜 지금 뜨는지**를 한 문장 넣는다 — 근거는 `metrics.stars_per_day` 와 `cross_sources` 뿐이고, 없으면 "화제" 같은 막연한 표현을 쓰지 않는다.

**영문 필드(`title_en`·`summary_en`·`body_en`)는 만들지 않는다.** 프론트·RSS 어디서도 읽지 않아 생성 비용만 쓰던 필드라 규격에서 제거했다.

**최상위 `summary` (AI 트렌드 요약) 규격:**
- 단순한 건수 나열("AI 기술 신호 N건을 정리했습니다...") 금지.
- **수집된 기사 전체를 관통하는 "오늘의 주된 핵심 이슈 키워드(#태그 3~4개)"와 "핵심 기술 흐름 한 줄 브리핑"**으로 작성한다.
- 구조: `🔥 오늘의 핵심 이슈: #[키워드1] #[키워드2] #[키워드3] — [수집된 기사들의 맥락을 꿰뚫는 한 줄 인사이트 해설]. ldk-hub에서 큐레이션 하였습니다.`
- **출처 표기:** 최상위 `summary` 와 `curated_by` 에 **"ldk-hub에서 큐레이션 하였습니다"** 로 명시한다. "AI 에이전트"·"봇"이 작성했다는 표현은 쓰지 않는다 (검증기가 이 표현을 잡는다).

**과거 작업 이력 및 스펙 참조:**
과거 큐레이션 히스토리나 시스템 아키텍처는 옵시디언 볼트(`/Users/nhn/Documents/Obsidian Vault/ai-weekly`) 및 `ai-weekly-vault` 스킬을 참조한다. 작업 완료 후에는 `npm run sync:obsidian`으로 볼트를 동기화한다.

## 실행

```bash
cd ~/Desktop/ai-weekly
node scripts/news/collect_news.js                                   # Phase 1
GEMINI_API_KEY=... node scripts/news/curate_news.js                 # Phase 2-A (키 있을 때)
node scripts/news/curate_news.js --validate                         # 배포 전 필수 게이트
```

### Phase 1 — 수집 (`scripts/news/collect_news.js`, LLM 없음)

결정적 수집만 담당. 7매체를 병렬로 훑고 → 본문 확보 → 중복 제거 → `.tmp/news_candidates.json`.

- **시간창**: 최근 24시간 (`NEWS_WINDOW_HOURS`). 창 밖 보충 없음
- **매체당 목표**: RSS 5건(`NEWS_FEED_PER_SOURCE`), Reddit 서브당 8건, GitHub 상한 50건, HF Daily Papers·Bluesky 각 12건
- **HF Daily Papers**: 오늘 UTC 날짜의 목록만 부른다. 응답의 `publishedAt` 은 arXiv 원 발행일(수 주 전일 수 있다)이므로 신호 시각은 **HF 가 오늘 목록에 올린 시각**으로 잡고, 원 발행일이 `NEWS_HF_PAPER_MAX_AGE_DAYS`(21일)를 넘으면 재조명으로 보고 버린다. 원 발행일은 `metrics.paper_published_at` 에 남는다
- **Bluesky**: `sort=latest` + `since` 로 24시간 창을 직접 건다. **`sort=top` 은 전체 기간 인기글을 주므로 쓰지 않는다.** 인기 상위가 농담·감상평이라 좋아요만으로는 뉴스가 안 걸린다(실측 like≥10 상위 10건 전부 잡담) — **링크 카드(`embed.external`)를 단 글만** 남기고, 후보 URL 은 bsky 퍼머링크가 아니라 **공유된 원문 링크**로 잡는다(본문 보강·교차 중복이 그대로 동작). 발견 출처는 `metrics.bluesky_url`. 무인증 IP rate limit 이 있어 순차 + 6초 간격 + 403 재시도(`NEWS_BSKY_DELAY_MS`·`NEWS_BSKY_ATTEMPTS`·`NEWS_BSKY_MIN_LIKES`)
- **추적 파라미터 제거**: 소셜 경유 링크의 `utm_*`·`link_source`·`taid`·`fbclid` 등을 저장 URL 에서 떼어낸다. 남겨두면 같은 기사가 매체마다 다른 URL 이 돼 중복 판정이 샌다. 단축 URL(`bit.ly` 등)은 최종 목적지로 펼쳐 저장한다
- **본문 확보**: 400자 미만이면 원문 HTML fetch + cheerio 추출(최대 6000자). GitHub 은 README. 로그인 벽 도메인(X·Threads 등)은 fetch 생략
- **중복 제거(같은 실행 내)**: URL·제목 정규화. 같은 이슈를 여러 매체가 다루면 본문 긴 쪽을 남기고 `cross_sources` 에 누적 (= 화제성 근거)
- **중복 제거(날짜 간)**: `loadRecentlyPublished()` 가 최근 7일 `archive/news_*.json` 의 URL 을 읽어 `dropRepeats()` 로 후보에서 뺀다. archive 는 커밋돼 있어 CI 체크아웃에서도 동작한다. 실측(2026-08-18~25) 고유 URL 104건 중 재등장 11건, 그중 10건이 GitHub 이었다
- **GitHub 랭킹**: `ghMomentum()` = 하루평균 획득 star. 직전 배포본과 비교 가능하면 실측 증가분, 아니면 생성 이후 평균. 절대 star 정렬은 창 안의 노장 리포를 매일 상위에 고정시켜 재등장의 직접 원인이었다
- **네트워크 타임아웃**: 모든 fetch 12초 상한(`NEWS_NET_TIMEOUT_MS`). 전역 `fetch` 는 기본 타임아웃이 없어 없으면 한 호스트가 `Promise.all` 을 영구 대기시킨다
- **동기 실행 금지**: `last30days` 호출은 반드시 `execFileAsync`. `execFileSync` 면 파이썬이 끝날 때까지 이벤트 루프가 멈춰 **다른 매체 전부가 타임아웃 abort** 된다 (실측: geeknews 전량 0건)
- **게이트**: 본문 120자 미만 폐기, 수집 0건이면 exit 1 (기존 데이터 보존)
- **`[MISSING]` 보고**: 7매체 중 최종 0건인 매체를 이름으로 찍고 `missing_sources` 에 기록한다 — 조용한 누락 금지
- **`[QUERY-FAIL]` 보고**: 수집 쿼리 실패를 `source_errors` 에 기록한다. 과거 GitHub 4번째 쿼리가 HTTP 422 로 상시 실패했는데 `console.warn` 만 찍혀 몇 주간 축 하나가 죽은 채 돌았다

### Phase 2 — 큐레이션

`.tmp/news_candidates.json` 을 읽어 분류·번역·재작성 요약을 만든다. **두 경로 중 하나를 쓰되, 결과는 반드시 `--validate` 를 통과해야 한다.**

**2-A. Gemini (`GEMINI_API_KEY` 있을 때 — 기본)**
10건/60KB 배치로 나눠 호출, 배치 실패 시 1회 재시도. 품질 게이트 통과분만 남긴다. 키 없으면 exit 1 (**Mock·하드코딩 대체 데이터 금지** — 구버전이 `MOCK_TRANSLATIONS` 가짜 뉴스를 배포했다).

**2-B. 에이전트 직접 작성 (키 없을 때)**
후보 파일을 읽고 직접 판정·번역·요약해 `news_latest.json` 을 쓴다. 이때:

- **매체별 균형 (핵심):** 수집된 전체 후보 중 단일 매체에 편중되지 않도록, **각 플랫폼당 3~5건씩** 골고루 선별하여 큐레이션해야 한다. 귀찮다고 1~2개만 하고 끝내거나 특정 매체를 통째로 누락하는 것은 **절대 금지**다. 상한은 매체당 5건·신호축당 4건·하루 총 18건(`NEWS_MAX_PER_SOURCE`·`NEWS_MAX_PER_SIGNAL`·`NEWS_MAX_ITEMS`).
- **GitHub 핫이슈 우선:** 절대 star 수가 아니라 `metrics.stars_per_day`(하루평균 획득 star)가 큰 리포를 고른다. star 총량이 큰 노장 리포는 매일 같은 얼굴이라 뉴스 가치가 없다.
- **`is_update: true` 항목은 신규 발표처럼 쓰지 않는다.** 제목을 `[업데이트] ` 로 시작하고, `prev_stars` → `metrics.stars` 증가분과 그 사이 달라진 점만 쓴다. 도구 소개를 처음부터 반복하면 검증에서 걸린다.
- **한 회용 큐레이션 스크립트를 만들지 않는다.** 과거 `curate_custom.js`(날짜 하드코딩 52KB) 를 매일 새로 써서 커밋했다 — 스킬이 금지한 수기 JSON 경로가 사실상 상시 운영 경로가 됐다. 산출물은 `news_latest.json` 하나뿐이고, 사후 교정 스크립트(`fix_curation.js` 류)도 만들지 않는다.
- **`id`·`url`·`publish_date`·`author_profile` 은 후보 파일에서 복사한다.** 새로 만들거나 요약하지 않는다 (작성 시 `publish_date` 원본 일치 여부 철저히 확인).
- **`body_ko` 길이 엄수:** 반드시 **5~10문장**이어야 한다. 작성 후 스스로 문장 부호(`.`) 개수를 세어 검증 절차에 걸리지 않도록 철저히 확인한다.
- **후보 파일에 없는 항목을 추가하지 않는다.** 기억이나 별도 검색으로 알게 된 기사도 안 된다 — 다음 수집에 잡힌다
- 필수 필드(`signal_name`·`sources`·`metrics`·`category_id`·`curated_by`)를 빼지 않는다
- 작성 후 **반드시** `--validate` 를 돌리고, 통과 전에는 커밋하지 않는다

> 2026-08-03 실패 사례: 키가 없어 Phase 2 가 죽은 상태에서 손으로 JSON 을 작성 → 정의에 없는 `industry` 축 4건, `body_ko` 2~4문장, GeekNews URL 을 `topic?id=12345` 로 지어냄, 후보에 없는 기사 1건 추가, 투자 기사 1건 포함, 4번의 사후 fix 커밋. `--validate` 는 이 43건을 전부 잡는다.

**품질 게이트 (2-A·2-B 공통, 하나라도 걸리면 그 항목 폐기):**

- `[임시 번역]`·TODO 등 플레이스홀더 잔존
- `title_ko`/`summary_ko`/`body_ko` 한글 비율 미달 (미번역)
- `summary_ko` 불릿 3개 미만, 또는 불릿이 15자 미만
- **`summary_ko` 문장이 원문 본문에 그대로 존재** (= 스크랩, 재작성 아님)
- `body_ko` 5문장 미만
- `signal_id` 가 정의된 축이 아님
- 제목이 투자·재무 중심 (`FINANCE_RE`)
- `importance < NEWS_MIN_IMPORTANCE` (기본 40)
- 후보에 없는 id, 또는 `url`·`publish_date`·`author_profile` 이 후보와 불일치
- 후보의 `is_update` 와 산출물의 `is_update` 불일치, 또는 `is_update` 인데 `title_ko` 가 `[업데이트]` 로 시작하지 않음

게이트 자기검증: `node scripts/news/curate_news.js --selfcheck` (네트워크·LLM 호출 없음)

### Phase 3 — 배포 및 알림

`--validate` 통과 후에만:

```bash
node scripts/core/generate-rss.js          # RSS 피드 갱신
node scripts/community/collect_lounge.js   # 라운지 — Discussions 스냅샷 갱신
git add site/public/data data/archive site/public/news-feed.xml site/public/sitemap.xml
git commit -m "chore: update daily news $(date +%Y-%m-%d)"
```

**라운지 수집(`collect_lounge.js`)**: giscus 스레드와 댓글을 `lounge_latest.json` 으로 떨군다. 라운지 화면은 정적이라 GitHub Discussions 를 직접 못 읽는다(GraphQL 은 토큰 필수). `GH_TOKEN` 이 없으면 exit 1 로 멈춰 기존 스냅샷을 보존한다. 뉴스 항목 댓글의 스레드 제목은 term(뉴스 id 해시)이라, 배포된 뉴스에서 `title_ko` 를 찾아 사람이 읽을 제목으로 바꿔 저장한다 — **뉴스 아카이브를 지우면 옛 스레드 제목이 해시로 되돌아간다.**

`news_latest.json` + `archive/news_{날짜}.json` + `archive/news_index.json` 세 파일을 함께 커밋한다.
**archive 커밋을 빠뜨리면 다음 날 크로스데이 중복 차단이 그만큼 눈이 먼다.**

**이 파이프라인에 스케줄 CI 는 없다.** `daily-news.yml` 이 매일 09:00 KST 로 걸려 있었으나 CI 형식 커밋(`chore(news): daily update`)이 이력에 하나도 없었다 — 한 번도 성공한 적 없이 문서에만 "자동" 으로 적혀 있었고, 실제 배포는 전부 로컬 수동 실행이었다. 2026-08-25 에 워크플로를 삭제했다. **실행은 사람이 시작한다.**

사이트 배포는 별개다 — `deploy-pages.yml` 이 `site/**` 변경 push 에 반응하므로, 위 커밋을 push 하면 GitHub Pages 는 그대로 갱신된다.

## 보고 (필수 항목)

총 건수 · `signal_counts` 분포 · 매체별 최종 건수 · 드롭 사유 요약 · **`[MISSING]` 매체와 그 원인** · **재등장 차단 건수(`repeat_filter`)와 업데이트로 남긴 건수** · **`[QUERY-FAIL]` 실패 쿼리**.

## 알려진 제약 (숨기지 말고 보고할 것)

- **Reddit**: `.json` 엔드포인트는 비인증 403 이지만 `top/.rss?t=day` 는 무인증 200. IP throttle 이 강해 순차 + 서브 간 20초 지연 + 최대 3회 backoff 재시도로 수집한다(`NEWS_REDDIT_DELAY_MS`, `NEWS_REDDIT_ATTEMPTS`, `NEWS_REDDIT_PER_SUB`, `NEWS_SKIP_REDDIT=1`). RSS 에 점수 필드가 없어 "당일 top 정렬"을 품질 프록시로 쓴다. **전량 0건이면 throttle 이지 정상이 아니다**
- **GitHub**: `GH_TOKEN`/`GITHUB_TOKEN`/`gh auth token` 중 하나 필요. 없으면 `oss` 신호 전량 누락
- **`fetchSocial`(last30days)**: 출처 라벨은 last30days 의 `source` 가 아니라 **링크 호스트**로 판정한다 (라벨 어긋남이 잦음). X·Threads 제거 후 남은 기여는 Reddit·HN·GitHub 중복분뿐이다
- **importance 하한**: `NEWS_MIN_IMPORTANCE`(40) 는 실질적으로 아무것도 거르지 못한다 — 실측 208건 중 40 미만 0건, 중앙값 85. 실제 선별은 `selectBalanced()` 의 매체·축 쿼터가 한다. 하한값을 만지는 것으로 품질을 조절하려 하지 말 것
- **`research` 축**: HF Daily Papers 가 담당한다. arXiv 직접 수집은 여전히 붙이지 않는다 (발행량·주기가 24시간 창과 안 맞는다)
- **본문이 껍데기인 페이지**: `article`/`main` 컨테이너가 없고 본문을 JS 로 그리는 사이트는 원문 fetch 가 구독 폼·푸터만 긁어온다 (실측 `thenewstack.io` — `article` 0자, `body` 34,000자가 전부 구독 폼). 길이 게이트(120자)는 통과하므로 **큐레이션 단계에서 "본문이 사실상 제목 반복" 으로 걸러야 한다.** 제목 단어로 껍데기를 판별하려는 휴리스틱은 실패했다(제목 단어가 껍데기 덤프에도 존재). 미해결 상태로 두고 보고 대상으로 삼는다
- 매체가 비어도 파이프라인은 계속 진행한다. **다만 어떤 매체가 왜 비었는지 반드시 보고한다**

## 에이전트

| 에이전트 | 역할 |
|---|---|
| `news-scout` | Phase 1 실행·매체 상태 점검 |
| `news-analyzer` | 후보 품질·시간창·링크 유효성 점검 (Phase 1 ↔ 2 사이 선택 단계) |
| `news-curator` | Phase 2 실행 + `--validate` 결과 확인 |
| `site-builder` | Phase 3 배포 (cc-trends 공유) |
