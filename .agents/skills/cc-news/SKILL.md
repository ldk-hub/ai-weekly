---
name: cc-news
description: "지난 24시간의 AI 기술 신호(모델 출시·제품 기능·개발자 도구·개인 오픈소스·연구·활용 워크플로우)를 7개 매체에서 수집해 한국어로 재작성 요약하고 정적 사이트에 배포하는 데일리 파이프라인. 매체: GeekNews, Hacker News, AI타임스, Reddit, GitHub, X, Threads. 트리거: cc-news, 데일리뉴스 업데이트"
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
| GitHub | Search API (신생 저star 리포 포함) | `GH_TOKEN` 필요 |
| X (Twitter) | `last30days` 스킬 경유 | 직접 스크래핑 불가 |
| Threads | `last30days` 스킬 경유 | 직접 스크래핑 불가 |

**이 목록에 매체를 추가하지 않는다.** 과거 Simon Willison·네이버 D2·Anthropic News·arXiv 를 넣었다가, 발행 주기가 24시간보다 길어 창 안에 글이 없자 **창 밖 과거 기사를 끌어와 오늘치로 배포**하는 회귀가 발생했다(2026-08-03, 8건). 목록 밖 매체는 `last30days` 결과에서도 버린다.

`last30days` 가 X·Threads 를 반환하지 못하면 그날 두 매체는 0건이고, 이는 **정상 동작이 아니라 보고 대상**이다.

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
- 본문이 빈약하거나 제목만 반복하는 기사 (본문 120자 미만 폐기)

**제외 아님:** OpenAI·Google·Meta·Anthropic 등 빅테크의 신규 모델·기능 발표는 `model`/`product` 의 **1급 신호**다. (구버전 프롬프트가 "빅테크 뻔한 뉴스 제외"로 버렸던 것이 회귀 지점.)

## 산출물 규격

`site/public/data/news_latest.json` — 항목별 필수 필드:

| 필드 | 규칙 |
|---|---|
| `title_ko` / `title_en` | 영문 원문은 반드시 한국어 번역. `[임시 번역]` 류 접두사 금지 |
| `summary_ko` | 정확히 3불릿(`• ` 시작). ①무엇이 일어났나 ②기술적으로 뭐가 새로운가(수치·모델명·벤치마크) ③개발자에게 왜 중요한가 |
| `body_ko` / `body_en` | **5~10문장** 해설. 배경·동작 방식·한계·비교 대상. 원문 통째 복사 금지 |
| `signal_id` / `signal_name` | 위 6축(+policy) 중 하나. `signal_name` 은 `signal_id` 와 짝이 맞아야 함 |
| `importance` | 0~100. 신규성·기술적 실체·실사용 영향·교차 출처. 40 미만 폐기 |
| `category_id` / `category_name` | 출처 플랫폼 (프론트 탭 필터용) |
| `url` / `author_profile` / `publish_date` / `metrics` | **후보 파일 값을 그대로 쓴다. 지어내면 검증에서 걸린다** |
| `sources` | 같은 이슈를 다룬 매체 목록 (중복 제거 시 누적) |
| `curated_by` | `"ldk-hub"` 고정 |

`oss` 항목은 `body_ko` 에 "무엇을 하는 도구 / 어떻게 쓰는지 / 누가 만들었는지", `research` 항목은 "제안 기법 / 실험 수치 / 기존 대비 차이"를 포함해야 한다.

**출처 표기:** 최상위 `summary` 와 `curated_by` 에 **"ldk-hub에서 큐레이션 하였습니다"** 로 명시한다. "AI 에이전트"·"봇"이 작성했다는 표현은 쓰지 않는다 (검증기가 이 표현을 잡는다).

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
- **매체당 목표**: RSS 5건(`NEWS_FEED_PER_SOURCE`), Reddit 서브당 8건, GitHub 상한 50건
- **본문 확보**: 400자 미만이면 원문 HTML fetch + cheerio 추출(최대 6000자). GitHub 은 README. 로그인 벽 도메인(X·Threads 등)은 fetch 생략
- **중복 제거**: URL·제목 정규화. 같은 이슈를 여러 매체가 다루면 본문 긴 쪽을 남기고 `cross_sources` 에 누적 (= 화제성 근거)
- **네트워크 타임아웃**: 모든 fetch 12초 상한(`NEWS_NET_TIMEOUT_MS`). 전역 `fetch` 는 기본 타임아웃이 없어 없으면 한 호스트가 `Promise.all` 을 영구 대기시킨다
- **동기 실행 금지**: `last30days` 호출은 반드시 `execFileAsync`. `execFileSync` 면 파이썬이 끝날 때까지 이벤트 루프가 멈춰 **다른 매체 전부가 타임아웃 abort** 된다 (실측: geeknews 전량 0건)
- **게이트**: 본문 120자 미만 폐기, 수집 0건이면 exit 1 (기존 데이터 보존)
- **`[MISSING]` 보고**: 7매체 중 최종 0건인 매체를 이름으로 찍고 `missing_sources` 에 기록한다 — 조용한 누락 금지

### Phase 2 — 큐레이션

`.tmp/news_candidates.json` 을 읽어 분류·번역·재작성 요약을 만든다. **두 경로 중 하나를 쓰되, 결과는 반드시 `--validate` 를 통과해야 한다.**

**2-A. Gemini (`GEMINI_API_KEY` 있을 때 — 기본)**
10건/60KB 배치로 나눠 호출, 배치 실패 시 1회 재시도. 품질 게이트 통과분만 남긴다. 키 없으면 exit 1 (**Mock·하드코딩 대체 데이터 금지** — 구버전이 `MOCK_TRANSLATIONS` 가짜 뉴스를 배포했다).

**2-B. 에이전트 직접 작성 (키 없을 때)**
후보 파일을 읽고 직접 판정·번역·요약해 `news_latest.json` 을 쓴다. 이때:

- **`id`·`url`·`publish_date`·`author_profile` 은 후보 파일에서 복사한다.** 새로 만들거나 요약하지 않는다
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

게이트 자기검증: `node scripts/news/curate_news.js --selfcheck` (네트워크·LLM 호출 없음)

### Phase 3 — 배포

`--validate` 통과 후에만:

```bash
node scripts/core/generate-rss.js   # 선택
git add site/public/data && git commit -m "chore: update daily news $(date +%Y-%m-%d)"
```

`news_latest.json` + `archive/news_{날짜}.json` + `archive/news_index.json` 세 파일을 함께 커밋한다.

## 보고 (필수 항목)

총 건수 · `signal_counts` 분포 · 매체별 최종 건수 · 드롭 사유 요약 · **`[MISSING]` 매체와 그 원인**.

## 알려진 제약 (숨기지 말고 보고할 것)

- **Reddit**: `.json` 엔드포인트는 비인증 403 이지만 `top/.rss?t=day` 는 무인증 200. IP throttle 이 강해 순차 + 서브 간 20초 지연 + 최대 3회 backoff 재시도로 수집한다(`NEWS_REDDIT_DELAY_MS`, `NEWS_REDDIT_ATTEMPTS`, `NEWS_REDDIT_PER_SUB`, `NEWS_SKIP_REDDIT=1`). RSS 에 점수 필드가 없어 "당일 top 정렬"을 품질 프록시로 쓴다. **전량 0건이면 throttle 이지 정상이 아니다**
- **GitHub**: `GH_TOKEN`/`GITHUB_TOKEN`/`gh auth token` 중 하나 필요. 없으면 `oss` 신호 전량 누락
- **X·Threads**: `last30days` 결과에만 의존. 출처 라벨은 last30days 의 `source` 가 아니라 **링크 호스트**로 판정한다 (라벨 어긋남이 잦음)
- **`research` 축**: arXiv 를 제거했으므로 논문은 GeekNews·Hacker News 를 타고 들어온 것만 잡힌다. 논문 커버리지가 필요하면 매체 추가가 아니라 HN 쿼리 확장을 검토할 것
- 매체가 비어도 파이프라인은 계속 진행한다. **다만 어떤 매체가 왜 비었는지 반드시 보고한다**

## 에이전트

| 에이전트 | 역할 |
|---|---|
| `news-scout` | Phase 1 실행·매체 상태 점검 |
| `news-analyzer` | 후보 품질·시간창·링크 유효성 점검 (Phase 1 ↔ 2 사이 선택 단계) |
| `news-curator` | Phase 2 실행 + `--validate` 결과 확인 |
| `site-builder` | Phase 3 배포 (cc-trends 공유) |
