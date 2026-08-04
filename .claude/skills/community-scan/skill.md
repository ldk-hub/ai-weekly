---
name: community-scan
description: "개발자 커뮤니티에서 Claude Code 관련 화제 게시글을 공격적으로 수집. Reddit, HackerNews, X, dev.to, GeekNews, velog, OKKY 등 영문+국문 동시 커버 + 후보 리포 역방향 검색. community-scout 에이전트 전용."
---

# Community Scan — 커뮤니티 크롤링 가이드 (Aggressive Mode)

## 2단계 작업

### Phase A — 광역 스캔 (Broad Discovery)
커뮤니티 전반에서 Claude Code 관련 신호 수집. 각 소스별 최소 건수 강제.

### Phase B — 후보 역방향 검증 (Targeted Reverse Lookup) ⭐⭐⭐
github-scout 결과(`_workspace/01_github_raw.json`)를 받아, **각 후보 리포 이름을 모든 커뮤니티에서 검색**.
이 단계가 `sources` 필드를 채운다. 빠지면 모든 항목이 단일출처가 된다.

---

## Phase A 쿼리 팩

### Reddit — 직접 수집 (SERP 아님)

**Google SERP 로 가지 말 것.** aggregator 만 돌려주고 engagement 가 없어 사실상 0건이다.
2026-07 에 "직접 접근 전면 차단" 으로 판단해 SERP 전용으로 바꾼 게 회귀 지점이었다 —
차단이 아니라 **스로틀**이었다.

#### 403/429 는 영구 차단이 아니다 (2026-08-03 실측)

같은 엔드포인트가 조건에 따라 200 도 되고 403 도 된다. 갈리는 건 두 가지뿐:

| 조건 | 통과 | 막힘 |
|---|---|---|
| User-Agent | `Mozilla/5.0 (compatible; ai-weekly-newsbot/1.0)` — 정직한 봇 표기 | `Mozilla/5.0` 등 브라우저 위장 |
| 페이싱 | **순차** + 서브레딧 간 20초 + 429 시 1회 재시도 | 병렬·연타 (3~4초 간격도 트립) |

브라우저 위장 UA 를 datacenter IP 에서 더 세게 막는다. 연타로 403 을 받고 "차단됐다"
결론 내리지 말 것 — 20초 쉬고 다시 보라.

#### 주 경로 A — reddit.com RSS (엔드포인트 안정, engagement 없음)

`scripts/news/collect_news.js` 의 `fetchRedditSub` 가 이 방식이고 실제로 돈다
(2026-08-03 cc-news 런: LocalLLaMA 5 · MachineLearning 6 · OpenAI 5 수집, ClaudeAI·
singularity 만 429 로 탈락 = 정상 열화).

```
https://www.reddit.com/r/{sub}/top/.rss?t=day     # 또는 t=week
https://www.reddit.com/r/{sub}/new/.rss
```
RSS 에는 점수 필드가 없다 → `t=day|week` 의 top 정렬 자체를 품질 프록시로 쓰고
서브당 상위 N 건만 취한다. `engagement:null` 로 남긴다.

#### 주 경로 B — arctic-shift (검색·engagement 필요할 때)

Pushshift 후계, 무료·무인증. `score`/`num_comments` 실측값과 키워드 검색을 준다.
2026-08-03 오전 런에서 55/56 성공·1542건(전 소스 최대). **단 같은 날 오후 전 파라미터
조합이 HTTP 500** — 가용성이 들쭉날쭉하니 A 를 대체하는 게 아니라 보완으로 쓴다.

```bash
BASE=https://arctic-shift.photon-reddit.com/api/posts/search
AFTER=$(date -j -v-14d +%s)   # epoch 정수 필수 (ISO 는 400)
curl -sS "$BASE?subreddit=ClaudeAI&query=skill&after=$AFTER&limit=100\
&fields=title,selftext,score,num_comments,created_utc,id,author,subreddit"
```

제약·순회 대상·쿼리 팩은 `community-scout.md` 의 Reddit 절이 SSOT.
요약: `query` 단독 불가(`subreddit` 동반 필수) · `after` 는 epoch · 후보당 키워드 검색은
429 나므로 **서브레딧 전량 수집 후 로컬 정규식 매칭**이 안전하다.

**순서:** A(RSS) 로 커버리지 확보 → B(arctic-shift) 로 engagement·검색 보강 →
둘 다 죽었을 때만 SERP. A 나 B 가 죽으면 `02c.failures` 에 남긴다 — 조용히 SERP 로 내려가지 말 것.

**최소 15건**

### HackerNews (Algolia)
```
https://hn.algolia.com/api/v1/search?query=claude+code&numericFilters=created_at_i>{NOW-7d}&hitsPerPage=30
https://hn.algolia.com/api/v1/search?query=anthropic+skill&numericFilters=created_at_i>{NOW-30d}
https://hn.algolia.com/api/v1/search?query=mcp+server&numericFilters=created_at_i>{NOW-7d}
https://hn.algolia.com/api/v1/search?query=claude+agent&numericFilters=created_at_i>{NOW-7d}
https://hn.algolia.com/api/v1/search?query=claude+plugin&numericFilters=created_at_i>{NOW-30d}
```
포인트 + 댓글 수 모두 기록. **최소 15건**

### dev.to
```
https://dev.to/api/articles?tag=claudecode&per_page=30
https://dev.to/api/articles?tag=claude&per_page=30
https://dev.to/api/articles?tag=mcp&per_page=20
https://dev.to/search?q=claude+code
https://dev.to/search?q=anthropic+skill
```
**최소 15건**

### X (Twitter) — Google 우회
직접 API 차단되어 있음.
```
Google: site:x.com "claude code" skill after:{LAST_WEEK}
Google: site:x.com "claude" (agent OR mcp) after:{LAST_WEEK}
Google: site:x.com from:AnthropicAI claude
Google: site:x.com from:alexalbert__
Google: site:x.com "claude code plugin"
```
**최소 10건**

### GeekNews (한국)

`search?q=` 는 쓰지 말 것 — 클라이언트 사이드 Google CSE 라 curl·WebFetch 로는 결과가 0건이다.
서버 렌더링 목록 페이지를 날짜별로 훑고 로컬에서 키워드 매칭한다.

```
https://news.hada.io/new
https://news.hada.io/past
https://news.hada.io/past?day=2026-08-03   # 날짜만큼 반복
```

**`day=` 는 `YYYY-MM-DD` 다.** `YYYYMMDD` 를 주면 에러 없이 빈 결과가 와서
조용히 누락된다 (2026-08-03 런: 138건 → 형식 교정 후 298건).

댓글 + 추천 수 기록. **최소 10건**

### velog
```
Google: site:velog.io "claude code"
Google: site:velog.io "클로드 코드"
Google: site:velog.io "MCP 서버"
Google: site:velog.io claude 스킬
https://velog.io/tags/claude-code
```
**최소 10건**

### OKKY / 클리앙 / 디스콰이엇
Google 검색으로 우회.
```
Google: site:okky.kr claude
Google: site:clien.net "클로드 코드"
Google: site:disquiet.io claude
```
**최소 5건**

### Anthropic 공식 (놓치면 안 됨)
```
https://www.anthropic.com/news
https://docs.claude.com/en/release-notes
https://github.com/anthropics/claude-code/releases
```
주간 신규 글 모두 수집

---

## Phase B 쿼리 템플릿

github-scout이 제출한 각 candidate 리포에 대해 아래 7개 쿼리 실행:

```python
for repo_id in github_candidates:
    owner, name = repo_id.split("/")
    queries = [
        f'site:reddit.com "{repo_id}"',
        f'site:news.ycombinator.com "{repo_id}"',
        f'site:dev.to "{repo_id}"',
        f'site:x.com "{repo_id}"',
        f'site:news.hada.io "{repo_id}"',
        f'site:velog.io "{repo_id}"',
        f'"{name}" claude code',   # repo 이름만으로 한 번 더
    ]
```

후보 50개 초과 시 점수 상위 30개만 우선 처리.
검색 결과 발견 시 `02_community_raw.json`에 추가 + `02b_repo_mentions.json` 인덱스 업데이트.

---

## 수집 규칙

- **14일 내** 글 우선, 30일 초과는 engagement 매우 높을 때만
- `mentioned_repos` 추출: 정규식 `github\.com/[\w-]+/[\w.-]+`
- 원문 언어 보존 (번역은 curator)
- **빈 결과도 명시적으로 보고**: "찾았는데 없음"과 "안 찾음"을 구분

## 영향력자 가중 (Influencer Weighting)

| 플랫폼 | 계정 → +20 buzz |
|---|---|
| X | @AnthropicAI, @alexalbert__, @sjwhitmore, @mickeyxfriedman |
| Reddit | u/dhamaniasad |
| HN | dang, todsacerdoti |
| velog | velopert, jojoldu |
| GeekNews | xguru |

해당 계정의 언급은 `influencer: true` 플래그.

## 산출물 (3개 파일)

### 1) `_workspace/02_community_raw.json` — 게시글 풀
모든 Phase A + B 발견 게시글 배열. **최소 90건.**

### 2) `_workspace/02b_repo_mentions.json` — 리포별 인덱스
```json
{
  "owner/repo": {
    "sources": ["reddit", "hn", "velog"],
    "mention_count": 5,
    "total_engagement": 1240,
    "influencer_mentions": 1,
    "first_seen": "2026-05-20",
    "last_seen": "2026-05-27",
    "top_url": "https://news.ycombinator.com/item?id=..."
  }
}
```

### 3) `_workspace/02c_coverage_report.json` — 커버리지 자가 진단
```json
{
  "phase_a_posts": 95,
  "phase_b_queries_run": 240,
  "candidates_with_2plus_sources": 18,
  "candidates_with_1_source": 5,
  "candidates_with_0_sources": 2,
  "source_breakdown": {"reddit": 28, "hn": 17, ...},
  "failures": ["X 검색 차단"]
}
```

## 실패 모드

| 상황 | 대응 |
|---|---|
| Reddit 403/429 | 차단 아니라 스로틀. 봇 UA + 순차 + 서브당 20초로 재시도 → 그래도 실패면 arctic-shift. SERP 는 최후 |
| X 직접 접근 불가 | Google `site:x.com` 사용 |
| HN Algolia 응답 없음 | `news.ycombinator.com/from?site=...` 시도 |
| 어떤 소스도 0건 | `02c_coverage_report.json`에 명시 → analyzer가 단일출처 강등 강하게 적용 |
