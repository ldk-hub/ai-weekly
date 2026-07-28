---
name: cc-news
description: "하루치 AI 기술 신호(모델 출시·제품 기능·개발자 도구·개인 오픈소스·연구/논문·활용 워크플로우)를 수집해 한국어로 번역·재작성 요약하고 정적 사이트에 배포하는 데일리 파이프라인. 소스: GeekNews, Hacker News, GitHub, arXiv, Reddit, X/Threads/YouTube(last30days). 트리거: cc-news, 데일리뉴스 업데이트"
---

# CC News — 데일리 AI 기술 신호 파이프라인

**목적:** 지난 24시간 동안 발생한 **AI 기술 신호**를 빠짐없이 모아, 원문 스크랩이 아니라 **읽고 이해한 내용을 한국어로 재작성한 요약**으로 배포한다.

## 무엇을 수집하는가 (기술 신호 6축)

`signal_id` 로 분류하며, 큐레이션 결과의 모든 항목은 아래 중 정확히 하나에 속한다.

| signal_id | 내용 | 주 소스 |
|---|---|---|
| `model` | 새 모델·버전 출시·프리뷰·벤치마크 | X, Hacker News, GeekNews |
| `product` | 제품 신기능 | X, GeekNews, Hacker News |
| `devtool` | 개발자 도구·에이전트 (코딩 에이전트, MCP, CLI) | GitHub, Hacker News, Reddit |
| `oss` | **개인·소규모 개발자가 만든 오픈소스·라이브러리·실험 도구** | GitHub (신생 저star 리포 적극 발굴) |
| `research` | 연구·논문·새 기법 | arXiv, Hacker News |
| `practice` | AI 활용 사례·워크플로우 팁 | Reddit, GeekNews, YouTube |
| `policy` | 정책·규제·인프라 — **기술에 직접 영향이 큰 것만, 요약도 짧게** | 전 소스 |

**제외 대상 (하드 룰):** 주식·증시·투자·재무 실적·펀딩 금액 중심 기사, AI 무관 일반 뉴스, 광고·낚시, 24시간 밖 과거 재탕, 본문이 제목 반복뿐인 항목.

**제외 아님:** 빅테크(OpenAI·Google·Meta·Anthropic 등)의 신규 모델·기능 발표는 `model`/`product` 의 1급 신호다. (구버전 프롬프트가 "빅테크 뻔한 뉴스 제외"로 이를 버렸던 것이 회귀 지점.)

## 산출물 규격

`site/public/data/news_latest.json` — 항목별 필수 필드:

| 필드 | 규칙 |
|---|---|
| `title_ko` / `title_en` | 영문 원문은 반드시 한국어 번역. `[임시 번역]` 류 접두사 금지 |
| `summary_ko` | 정확히 3불릿(`• ` 시작). ①무엇이 일어났나 ②기술적으로 뭐가 새로운가(수치·모델명·벤치마크) ③개발자에게 왜 중요한가 |
| `body_ko` / `body_en` | 5~10문장 해설. 배경·동작 방식·한계·비교 대상. **원문 통째 복사 금지** |
| `signal_id` / `signal_name` | 위 6축(+policy) 중 하나 |
| `importance` | 0~100. 신규성·기술적 실체·실사용 영향·교차 출처 |
| `category_id` / `category_name` | 출처 플랫폼 (프론트 탭 필터용) |
| `url` / `author_profile` / `publish_date` / `metrics` | **수집 데이터로 강제 덮어씀** (LLM 환각 차단) |
| `sources` | 같은 이슈를 다룬 매체 목록 (중복 제거 시 누적) |

`oss` 항목은 `body_ko` 에 "무엇을 하는 도구 / 어떻게 쓰는지 / 누가 만들었는지", `research` 항목은 "제안 기법 / 실험 수치 / 기존 대비 차이"를 포함해야 한다.

## 실행

```bash
GEMINI_API_KEY=... node scripts/collect_news.js && node scripts/curate_news.js
```

### Phase 1 — 수집 (`scripts/collect_news.js`, LLM 없음)

결정적 수집만 담당. 6개 소스를 병렬로 훑고 → 본문 확보 → 중복 제거 → `data/news_candidates.json`.

- **시간창**: 최근 24시간 (`NEWS_WINDOW_HOURS` 로 조정)
- **본문 확보**: 본문 400자 미만 항목은 원문 HTML 을 fetch 해 cheerio 로 본문 추출(최대 6000자). GitHub 은 README, arXiv 는 abstract 를 본문으로 사용. 로그인 벽 도메인(X·Instagram·Threads·YouTube)은 fetch 생략
- **중복 제거**: URL 정규화 + 제목 정규화. 같은 이슈를 여러 매체가 다루면 본문 긴 쪽을 남기고 `cross_sources` 에 누적 (= 화제성 근거)
- **소스 상한**: arXiv 30 / GitHub 50 (`NEWS_CAP_ARXIV`, `NEWS_CAP_GITHUB`). 잘린 건수는 로그에 출력됨
- **게이트**: 본문 120자 미만 폐기, 수집 0건이면 **exit 1** (기존 데이터 보존)

### Phase 2 — 큐레이션 (`scripts/curate_news.js`, Gemini)

후보를 10건/60KB 배치로 나눠 Gemini 에 넘기고, 배치별로 분류·번역·요약을 받는다. 배치 실패 시 1회 재시도.

**품질 게이트 — 아래 중 하나라도 걸리면 그 항목을 버린다 (가짜 요약 노출 방지):**

- `[임시 번역]`·TODO 등 플레이스홀더 잔존
- `title_ko`/`summary_ko`/`body_ko` 한글 비율 미달 (미번역)
- `summary_ko` 불릿 3개 미만, 또는 불릿이 15자 미만
- **`summary_ko` 문장이 원문 본문에 그대로 존재 (= 스크랩, 재작성 아님)**
- `body_ko` 120자 미만
- `signal_id` 가 정의된 축이 아님
- `importance < NEWS_MIN_IMPORTANCE` (기본 40)
- 후보에 없는 id (환각)

**중단 조건:** `GEMINI_API_KEY` 없음 → exit 1. 큐레이션 결과 0건 → exit 1. **Mock·하드코딩 대체 데이터 없음** (구버전은 키 없을 때 `MOCK_TRANSLATIONS` 가짜 뉴스를 사이트에 배포했다 — 재도입 금지).

품질 게이트 자기검증: `node scripts/curate_news.js --selfcheck` (Gemini 호출 없음)

### Phase 3 — 배포

`site/public/data/news_latest.json` + `archive/news_{날짜}.json` + `news_index.json` 은 큐레이터가 직접 쓴다. 이후:

```bash
node scripts/generate-rss.js   # 선택
git add site/public/data && git commit -m "chore: update daily news $(date +%Y-%m-%d)"
```

## 실행 후 검증 (보고 전 필수)

```bash
node -e "const d=require('./site/public/data/news_latest.json');
const bad=d.news.filter(n=>/임시 번역/.test(n.title_ko)||n.summary_ko.split('\n').length<3);
console.log('총',d.news.length,'건 | 신호분포',JSON.stringify(d.signal_counts),'| 불량',bad.length);"
```

보고에 포함할 것: 총 건수, `signal_counts` 분포, 소스별 분포, 드롭 사유 요약(로그), 미수집 소스와 그 원인.

## 알려진 제약 (숨기지 말고 보고할 것)

- **Reddit**: 비인증 접근은 전 엔드포인트 403. `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`(https://www.reddit.com/prefs/apps 의 script 앱) 없으면 통째로 건너뛴다
- **GitHub**: `GH_TOKEN`/`GITHUB_TOKEN`/`gh auth token` 중 하나 필요. 없으면 `oss` 신호(④) 전량 누락
- **X·Threads·Instagram**: 직접 스크래핑 불가. `last30days` 스킬 결과에만 의존하며, 그 결과에 해당 플랫폼이 없으면 그날 0건이 정상. 출처 라벨은 last30days 의 `source` 가 아니라 **링크 호스트**로 판정한다 (라벨 어긋남이 잦음)
- 소스가 비어도 파이프라인은 계속 진행한다. **다만 어떤 소스가 왜 비었는지 반드시 보고한다** — 조용한 누락 금지

## 에이전트

| 에이전트 | 역할 |
|---|---|
| `news-scout` | Phase 1 실행·소스 상태 점검 |
| `news-analyzer` | 후보 품질·시간창·링크 유효성 점검 (Phase 1 ↔ 2 사이 선택 단계) |
| `news-curator` | Phase 2 실행 + 품질 게이트 결과 확인 |
| `site-builder` | Phase 3 배포 (cc-trends 공유) |
