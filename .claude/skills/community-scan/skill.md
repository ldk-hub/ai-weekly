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

### Reddit — Google 우회 (직접 접근 불가)
⚠️ **직접 접근 전면 차단.** `www.reddit.com/*.json`, `old.reddit.com`, redlib 미러 모두 datacenter IP 차단으로 403 (User-Agent 넣어도 무효, 2026-07 실측). curl·WebFetch로 reddit.com 직접 시도 금지 — 시간 낭비.
**유일한 경로 = Google `site:reddit.com` (WebSearch).** SERP 스니펫으로 제목·서브레딧·언급 리포 확보(본문/댓글은 못 읽음 → engagement는 스니펫에 upvote/comment 숫자 보이면만 기록, 없으면 `engagement:null`).
```
Google: site:reddit.com/r/ClaudeAI (skill OR agent OR mcp OR harness) after:{LAST_WEEK}
Google: site:reddit.com/r/ClaudeCode after:{LAST_WEEK}
Google: site:reddit.com "claude code" (skill OR mcp OR agent) after:{LAST_WEEK}
Google: site:reddit.com/r/LocalLLaMA "claude code" after:{LAST_WEEK}
Google: site:reddit.com/r/programming claude code after:{LAST_WEEK}
```
**최소 10건** (SERP 경유라 20건 강제는 완화. 0건이면 `02c.failures`에 "reddit SERP 0건" 명시)

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
```
https://news.hada.io/search?q=claude
https://news.hada.io/search?q=앤트로픽
https://news.hada.io/search?q=MCP
https://news.hada.io/search?q=클로드
https://news.hada.io/search?q=AI+에이전트
```
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
| Reddit 직접 접근(json/old/mirror) | 전면 403, 시도 금지 → Google `site:reddit.com` WebSearch가 유일 경로 |
| X 직접 접근 불가 | Google `site:x.com` 사용 |
| HN Algolia 응답 없음 | `news.ycombinator.com/from?site=...` 시도 |
| 어떤 소스도 0건 | `02c_coverage_report.json`에 명시 → analyzer가 단일출처 강등 강하게 적용 |
