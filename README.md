<div align="center">

# 위클렌드 <sub>· Weeklaude</sub>

**이번 주 Claude Code에서 뭐가 뜨고, 뭐가 이미 자리잡았나.**

GitHub과 개발자 커뮤니티에서 매주 수집하는 Claude Code · 에이전트 · 스킬 · 하네스 · MCP 인덱스.

[🌐 사이트](https://ldk-hub.github.io/weeklaude/) ·
[📡 RSS](https://ldk-hub.github.io/weeklaude/feed.xml) ·
[⭐ Star](https://github.com/ldk-hub/weeklaude)

![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-D97757?style=flat-square)
![Auto Updated](https://img.shields.io/badge/Updated-Weekly%20·%20Mon%2009%3A00%20KST-22c55e?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-0e0e0e?style=flat-square)

</div>

---

## 왜 만들었나

Claude Code 도구는 매일 수십 개씩 쏟아진다. 인스타·트위터에서 "이거 좋다" 보고 일주일 지나면 어디 갔는지 모른다.

> **정보가 부족한 시대가 아니다. 아카이브가 안 되는 시대다.**

위클렌드는 **매주 월요일 한 번**, 그 주에 뜬 것과 이미 자리잡은 것을 한 페이지로 정리한다.

- 🔥 **Rising** — 이번 주 급상승 + 커뮤니티에서 회자된 것
- ⭐ **Classic** — 이미 검증된 필수 레퍼런스
- 📦 **Archive** — 지난 주차 그대로 보존, 사이트 우상단에서 탐색

## 일반 awesome-list랑 뭐가 다른가

| | 일반 awesome-list | **위클렌드** |
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

위클렌드의 핵심 차별점은 다중 출처 교차 검증. 이걸 살리려고 community-scout이 2단계로 돈다.

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
```

## 폴더 구조

```
weeklaude/
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

- 누락된 좋은 리포는 [Issue](https://github.com/ldk-hub/weeklaude/issues)
- 점수 공식 개선 · 새 수집 소스 제안 환영
- 한글 카피 어색하면 지적 대환영

---

<div align="center">

Fork of [INNO-HI/weeklaude](https://github.com/INNO-HI/weeklaude) · Maintained by [ldk-hub](https://github.com/ldk-hub)
Built with [Claude Code](https://claude.com/claude-code)

MIT

</div>
