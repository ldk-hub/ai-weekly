<div align="center">

# AI위클리 <sub>· AI Weekly</sub>

**어제의 AI 트렌드와 이번 주 Claude Code 도구 생태계를 한 눈에.**

매일 업데이트되는 **데일리뉴스(3줄 요약)**와 매주 수집되는 **Claude Code 인기 플러그인 인덱스**를 제공합니다.

[🌐 사이트](https://ldk-hub.github.io/ai-weekly/) ·
[📡 RSS](https://ldk-hub.github.io/ai-weekly/feed.xml) ·
[⭐ Star](https://github.com/ldk-hub/ai-weekly)

![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-D97757?style=flat-square)
![Auto Updated](https://img.shields.io/badge/Updated-Daily%20&%20Weekly-22c55e?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-0e0e0e?style=flat-square)

</div>

---

## 📰 데일리뉴스 (Daily News)

매일 쏟아지는 방대한 AI 모델 릴리스, 연구, 제품, 산업 소식. 어디서부터 봐야 할지 모르는 분들을 위해 **어제 하루 동안 발생한 가장 핫한 트렌드**만 모아 **3줄 요약**으로 전달합니다.

- **광범위한 데이터 수집**: GeekNews, Hacker News, Reddit, X(Twitter), Instagram, Threads 등 주요 커뮤니티 및 소셜 미디어를 모두 훑어봅니다.
- **안티봇 완벽 우회**: 로컬 크롬 세션 연동(Persistent Context) 기술을 사용하여 막히기 쉬운 소셜 미디어 플랫폼의 피드까지 100% 수집합니다.
- **AI 큐레이션**: 단순히 긁어오는 것이 아니라, Gemini AI를 통해 가장 주목해야 할 5개의 핫이슈를 엄선하고 직관적인 3줄 요약으로 정제합니다.

## 🧩 인기 플러그인 (Popular Plugins)

Claude Code 도구는 매일 수십 개씩 쏟아집니다. 인스타·트위터에서 "이거 좋다" 보고 일주일 지나면 어디 갔는지 모르는 정보들을 아카이브합니다. **매주 월요일 한 번**, 그 주에 뜬 것과 이미 자리잡은 것을 한 페이지로 정리합니다.

- 🔥 **Rising** — 이번 주 급상승 + 커뮤니티에서 회자된 것
- ⭐ **Classic** — 이미 검증된 필수 레퍼런스
- 📦 **Archive** — 지난 주차 리스트 보존 및 탐색

## 일반 awesome-list랑 뭐가 다른가

| | 일반 awesome-list | **AI위클리** |
|---|---|---|
| 갱신 | PR 받을 때 (비정기) | **매주 월요일 자동** |
| 범위 | GitHub 링크만 | GitHub + HN + Reddit + dev.to + GeekNews + velog |
| 정렬 | 시간순/카테고리순 | **4축 가중 점수** (velocity · buzz · quality · recency) |
| 한국어 | 없음 | **한 줄 요약 + 캐치프레이즈** 카드마다 |
| 편향 | 영어권 중심 | 한국어 커뮤니티 가산점 |
| 중복 | 수동 관리 | **fork·미러·owner 변형 자동 컷** |

## 어떻게 굴러가나

5명의 Claude Code 서브에이전트가 매주 자동으로 처리한다.

```
github-scout    ┐                                                              
                ├─→ trend-analyzer ─→ content-curator ─→ site-builder ─→ 🌐
community-scout ┘    분류·점수·dedup    한글화·gh api 검증     publish gate
   ↑ A: 광역 + B: 역방향 검증
```

| 에이전트 | 하는 일 |
|---|---|
| `github-scout` | GitHub 트렌딩 · `.claude/agents` 경로 · awesome-list 스캔 |
| `community-scout` | **2단계 모드**: (A) 광역 스캔 + (B) 후보 리포 역방향 검색 |
| `trend-analyzer` | Rising/Classic 분류 · 점수 · dedup · 단일출처 강등 |
| `content-curator` | 한글 요약 · `gh api` 강제 검증 · 5단계 자체 검수 |
| `site-builder` | `latest.json` 갱신 · publish gate · 정적 빌드 |

오케스트레이터 [`cc-trends`](.claude/skills/cc-trends/skill.md) 스킬 하나가 5명을 순차 호출한다.
모든 프롬프트는 [`.claude/`](.claude/) 아래 공개. 그대로 가져다 써도 됨.

## 품질 게이트

신뢰도를 위해 **4겹 검증**이 직렬로 걸려있다.

| 단계 | 게이트 | 효과 |
|---|---|---|
| 분석 | **존재 검증** — `gh api` 404면 즉시 컷 | 죽은 리포 차단 |
| 분석 | **단일출처 강등** — sources 1개 + score<70 → 보류 | 노이즈 차단 |
| 분석 | **fork/archived 컷** | 미러·죽은 리포 차단 |
| 큐레이션 | **stars 강제 동기화** — `gh api`의 `stargazers_count`로 덮어쓰기 | 환각 차단 |
| 큐레이션 | **5단계 자체 검수** — 사실/숫자/과장/예시/카테고리 점검 | 카피 품질 |
| 발행 | **Publish Gate** — `needs_review` / `dropped_reason` 강제 필터링 | 최종 안전망 |

### community-scout 2단계 모드 (다중 출처 확보)

AI위클리의 핵심 차별점은 다중 출처 교차 검증. 이걸 살리려고 community-scout이 2단계로 돈다.

- **Phase A — 광역 스캔**: 7개 소스 × 5개 이상 쿼리 = 주간 **최소 90건** 게시글
- **Phase B — 역방향 검증** ⭐: github-scout이 발견한 각 후보 리포를 모든 커뮤니티에서 직접 검색 (후보당 7쿼리)
- **영향력자 가중**: @AnthropicAI, @alexalbert__, velopert, jojoldu, xguru, dang 등 언급은 buzz +20

## 점수와 정원

```
score = 0.4·velocity + 0.3·buzz + 0.2·quality + 0.1·recency
```

각 주차에 12개 강제로 채우지 않고 **자연 공급량**을 따른다. 카테고리별 상한:

| | skill | mcp | agent | harness |
|---|---|---|---|---|
| **rising** | 8 | 6 | 4 | 2 |
| **classic** | 6 | 4 | 4 | 2 |

임계치 미달이면 정원이 비어도 강제로 채우지 않는다 (예: 어떤 주는 harness 0개).
공식 전체는 [`trend-scoring/skill.md`](.claude/skills/trend-scoring/skill.md) 참고.

## 실행

```bash
# 사이트 로컬 프리뷰
python3 -m http.server 8000 --directory site

# 파이프라인 직접 실행 (Claude Code)
/cc-trends

# 자동 주간 갱신: GitHub Actions (매주 월 09:00 KST)
# .github/workflows/weekly-trends.yml — 수동 실행은 Actions 탭에서 workflow_dispatch
# CI 파이프라인: scripts/collect.js (GitHub+HN 수집) → scripts/curate.js (Gemini 무료 티어 큐레이션)
# 로컬에서는 기존 /cc-trends (Claude Code 5-에이전트) 도 그대로 사용 가능
```

## 폴더 구조

```
aiweekly/
├── .claude/
│   ├── agents/      # 5명의 서브에이전트
│   └── skills/      # 6개 스킬
├── site/            # 정적 웹사이트
│   └── public/data/
│       ├── latest.json
│       └── archive/  # 주차별 스냅샷
├── scripts/         # build-archive-index.js, generate-rss.js, generate-og.js
└── data/archive/    # 원본 백업 (Pages 미노출)
```

## 데이터 스키마

`site/public/data/latest.json` — 각 카드 객체:

```json
{
  "id": "owner/repo",
  "category": "skill",
  "title_ko": "한글 제목",
  "catchphrase": "한 줄 훅",
  "summary_ko": "3~5줄 요약",
  "key_features": ["..."],
  "use_case": "이럴 때 쓰면 좋아요",
  "install_hint": "npx ...",
  "trend_score": 87,
  "sources": ["github", "hn"],
  "evidence": [{ "source": "hn", "url": "...", "label": "HN 1위" }],
  "stars": 24115,
  "badges": ["🔥 Rising", "🆕 신상"]
}
```

지난 주차 스냅샷은 사이트 우상단 **"지난 주차"** 드롭다운에서 탐색 가능.

## 기여

- 누락된 좋은 리포는 [Issue](https://github.com/ldk-hub/ai-weekly/issues)
- 점수 공식 개선 · 새 수집 소스 제안 환영
- 한글 카피 어색하면 지적 대환영

---

<div align="center">

Maintained by [ldk-hub](https://github.com/ldk-hub)
Based on [weeklaude](https://github.com/INNO-HI/weeklaude) by INNO-HI (MIT)
Built with [Claude Code](https://claude.com/claude-code)

MIT

</div>
