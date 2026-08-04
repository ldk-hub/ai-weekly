<div align="center">

# AI위클리 <sub>· AI Weekly</sub>

**최신 AI 트렌드와 이번 주 Claude Code 도구 생태계를 한 눈에.**

**AI 뉴스(3줄 요약)**와 매주 수집되는 **Claude Code 인기 플러그인 인덱스**, 그리고 리포 스타 증감을 추적하는 **스타보드**를 제공합니다.

[🌐 사이트](https://ldk-hub.github.io/ai-weekly/) ·
[📡 RSS](https://ldk-hub.github.io/ai-weekly/feed.xml) ·
[⭐ Star](https://github.com/ldk-hub/ai-weekly)

![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-D97757?style=flat-square)
![Auto Updated](https://img.shields.io/badge/Updated-Daily%20&%20Weekly-22c55e?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-0e0e0e?style=flat-square)
![Responsive UX](https://img.shields.io/badge/UX-Mobile_Responsive_%26_Clean_URLs-blue?style=flat-square)

</div>

---

## 1부: 📰 AI 뉴스 (AI News)

쏟아지는 AI 모델 릴리스, 개발자 도구, 오픈소스, 연구 소식. 어디서부터 봐야 할지 모르는 분들을 위해 **최근 24시간 안에 나온 것**만 골라 **3줄 요약**으로 전달합니다. (갱신 주기는 고정되어 있지 않고, 사이트에는 실제 갱신 시각만 표시합니다.)

### 📌 주요 특징
- **기술 신호 6축 수집**: 모델 출시·제품 신기능·개발자 도구/에이전트·**개인 오픈소스**·연구/논문·활용 워크플로우. 정책/규제는 기술 영향이 큰 것만 간략히.
- **광범위한 데이터 수집**: GeekNews, Hacker News, GitHub, arXiv, Reddit, 그리고 last30days 스킬 경유 X/Threads/YouTube.
- **본문까지 확보**: 제목만 긁지 않고 원문 HTML·GitHub README·arXiv abstract 를 가져와 요약 근거로 삼습니다.
- **AI 큐레이션**: 스크랩이 아니라 **재작성**. Gemini 가 한국어로 번역하고 3불릿 요약 + 5~10문장 해설을 새로 씁니다. 원문 복붙·미번역은 품질 게이트가 걸러냅니다.

### ⚙️ 어떻게 굴러가나 (파이프라인)
```
collect_news.js ─→ curate_news.js ─→ news_latest.json ─→ 🌐
(결정적 수집·본문·중복제거)  (Gemini 분류·번역·요약 + 품질 게이트)
```
- **수집 (`scripts/collect_news.js`)**: 최근 24시간 6개 소스 병렬 수집 → 본문 보강 → URL·제목 중복 제거 → `data/news_candidates.json`. LLM 미사용
- **큐레이션 (`scripts/curate_news.js`)**: 배치 단위 Gemini 호출로 `signal_id` 분류 + 한국어 번역·요약. 품질 게이트 통과분만 발행. **API 키가 없으면 mock 없이 중단** (기존 데이터 보존)
- **발행**: `site/public/data/news_latest.json` + `archive/news_{날짜}.json`

### 🗂 데이터 스키마
`site/public/data/news_latest.json` 구조:
```json
{
  "summary": "오늘의 신호 분포 한 줄 요약",
  "signal_counts": { "model": 3, "oss": 5, "research": 4 },
  "news": [
    {
      "id": "고유ID",
      "signal_id": "model | product | devtool | oss | research | practice | policy",
      "signal_name": "새 모델·버전 출시·프리뷰·벤치마크",
      "importance": 78,
      "category_id": "geeknews | hackernews | github | arxiv | reddit | x | threads | youtube",
      "category_name": "출처 표기",
      "headline": "한국어 제목",
      "title_ko": "한국어 제목",
      "title_en": "English title",
      "summary_ko": "• 무엇이 일어났나\n• 기술적으로 뭐가 새로운가\n• 개발자에게 왜 중요한가",
      "body_ko": "5~10문장 한국어 해설 (배경·동작·한계·비교)",
      "url": "원문 링크",
      "sources": ["Hacker News", "GeekNews"],
      "tags": ["기술", "오픈소스"]
    }
  ]
}
```

> 필요 환경변수: `GEMINI_API_KEY`(필수) · `GH_TOKEN`/`gh auth`(오픈소스 신호) · `REDDIT_CLIENT_ID`/`REDDIT_CLIENT_SECRET`(Reddit, 비인증은 403)

---

## 2부: 🧩 인기 플러그인 (Popular Plugins)

Claude Code 도구는 매일 수십 개씩 쏟아집니다. 인스타·트위터에서 "이거 좋다" 보고 일주일 지나면 어디 갔는지 모르는 정보들을 아카이브합니다. **매주 월요일 한 번**, 그 주에 뜬 것과 이미 자리잡은 것을 한 페이지로 정리합니다.

### 📌 주요 카테고리
- 🔥 **Rising** — 이번 주 급상승 + 커뮤니티에서 회자된 것 (생성 30일 이내 OR 최근 커뮤니티 점수 급상승)
- ⭐ **Classic** — 이미 검증된 필수 레퍼런스 (stars 500+ AND 지속적 커밋 관리)
- 📦 **Archive** — 지난 주차 리스트 보존 및 탐색

### 🆚 일반 awesome-list와의 차이점
| | 일반 awesome-list | **AI위클리 (인기 플러그인)** |
|---|---|---|
| 갱신 | PR 받을 때 (비정기) | **매주 월요일 자동** |
| 범위 | GitHub 링크만 | GitHub + HN + Reddit + dev.to + GeekNews + velog |
| 정렬 | 시간순/카테고리순 | **4축 가중 점수** (velocity · buzz · quality · recency) |
| 한국어 | 없음 | **한 줄 요약 + 캐치프레이즈** 카드마다 제공 |
| 중복 | 수동 관리 | **fork·미러·owner 변형 자동 컷** |

### ⚙️ 어떻게 굴러가나 (아키텍처)
5명의 Claude Code 서브에이전트가 오케스트레이터 스킬 아래에서 매주 자동으로 처리합니다.

```
github-scout    ┐                                                              
                 ├─→ trend-analyzer ─→ content-curator ─→ site-builder ─→ 🌐
community-scout ┘    분류·점수·dedup    한글화·gh api 검증     publish gate
   ↑ A: 광역 + B: 역방향 검증
```

- **github-scout**: GitHub 트렌딩 및 awesome-list 스캔
- **community-scout**: 광역 스캔 및 후보 리포 역방향 교차 검증 (영향력자 가중치 포함)
- **trend-analyzer**: Rising/Classic 분류, 4축 점수 부여 및 중복 제거
- **content-curator**: 한글 요약 및 `gh api`를 통한 데이터/존재 검증
- **site-builder**: 최종 데이터를 `latest.json`에 반영하고 정적 배포

모든 프롬프트와 에이전트 설정은 [`.claude/`](.claude/) 폴더 내에 공개되어 있습니다.

### 🛡 품질 게이트 (4겹 검증)
- **존재 검증**: `gh api` 404 응답 시 즉시 제외
- **단일출처 강등**: 출처가 1곳이며 점수가 낮을 경우 보류
- **데이터 강제 동기화**: `stargazers_count` 등을 `gh api` 원본으로 덮어쓰기하여 환각(Hallucination) 차단
- **Publish Gate**: 발행 전 최종 필터링을 통해 미달 리포트 사전 차단

### 🗂 데이터 스키마
`site/public/data/latest.json` 구조:
```json
{
  "id": "owner/repo",
  "category": "skill",
  "title_ko": "한글 제목",
  "catchphrase": "한 줄 훅",
  "summary_ko": "3~5줄 요약",
  "trend_score": 87,
  "stars": 24115,
  "badges": ["🔥 Rising", "🆕 신상"]
}
```

---

## 3부: 📈 스타보드 (Starboard)

Claude Code 생태계 내 주요 리포지토리들의 **주간 GitHub 스타(Star) 증감 현황**을 추적하고 시각화하는 리더보드입니다. 단기적으로 반짝이는 도구뿐만 아니라, 꾸준히 성장하는 생태계 핵심 프로젝트들을 발굴합니다.

### 📌 주요 특징
- **리그(League) 기반 분류**: 누적 스타 수에 따라 Minor, Major, Premier, Legend 등 리그를 나누어 체급에 맞는 공정한 성장을 추적합니다.
- **주간 증감률 트래킹**: 매주 월요일마다 이전 주 대비 스타가 얼마나 늘었는지(Velocity) 계산하고, 눈에 띄는 활동성(🔥)을 뱃지로 부여합니다.
- **아카이브 및 트렌드 분석**: 일회성 큐레이션에 그치지 않고, 오픈소스 프로젝트의 장기적인 생명력과 커뮤니티 반응을 가시적으로 보여줍니다.

### 💡 기획 의도
"어떤 프로젝트가 진짜 커뮤니티의 선택을 받고 있을까?" 
단순히 새로 나온 도구를 소개하는 것을 넘어, 오픈소스 생태계에서 실질적으로 사용되고 검증되는 프로젝트들의 성장 궤적을 투명하게 관찰하기 위해 기획되었습니다.

---

## 4부: 🚀 구조 및 실행 방법

### 📂 폴더 구조
```
aiweekly/
├── .claude/         # 플러그인 큐레이션을 위한 5명의 서브에이전트와 스킬 정의
├── site/            # 프론트엔드 정적 웹사이트 (데이터 뷰어)
│   ├── public/data/ # 생성된 뉴스/플러그인 최신 데이터(latest.json) 및 이미지 에셋
│   └── index.html   # 메인 뷰어
├── scripts/         # 수집(collect.js) 및 큐레이션(curate.js), RSS 생성 스크립트 등
└── data/archive/    # 플러그인/뉴스 과거 주차별 원본 데이터 스냅샷 백업
```

### 💻 실행하기

**1. 프론트엔드 로컬 프리뷰**
```bash
# 사이트 디렉토리로 서버 실행
python3 -m http.server 8000 --directory site
```
자세한 정적 사이트 구조는 [site/README.md](site/README.md)를 참고하세요.

**2. 수집 파이프라인 수동 실행**
```bash
# 뉴스 파이프라인 (스크립트 직접 실행)
node scripts/collect_news.js
GEMINI_API_KEY=... node scripts/curate_news.js

# 품질 게이트 자기검증 (Gemini 호출 없음)
node scripts/curate_news.js --selfcheck

# 플러그인 파이프라인 (Claude Code 스킬 실행)
/cc-trends
```
> **자동화 안내**: GitHub Actions (`.github/workflows/weekly-trends.yml`)를 통해 매주 자동 갱신됩니다.

---

## 기여 및 라이선스

- 버그 제보 및 누락된 유용한 리포는 [Issue](https://github.com/ldk-hub/ai-weekly/issues)로 부탁드립니다.
- 데이터는 CC-BY 4.0, 소스 코드는 MIT 라이선스가 적용됩니다.

<div align="center">
Maintained by [ldk-hub](https://github.com/ldk-hub) <br>
Based on [weeklaude](https://github.com/INNO-HI/weeklaude) by INNO-HI (MIT) <br>
Built with [Claude Code](https://claude.com/claude-code)
</div>
