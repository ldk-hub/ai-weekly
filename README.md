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

## 1부: 📰 데일리뉴스 (Daily News)

매일 쏟아지는 방대한 AI 모델 릴리스, 연구, 제품, 산업 소식. 어디서부터 봐야 할지 모르는 분들을 위해 **어제 하루 동안 발생한 가장 핫한 트렌드**만 모아 **3줄 요약**으로 전달합니다.

### 📌 주요 특징
- **광범위한 데이터 수집**: GeekNews, Hacker News, Reddit, X(Twitter), Instagram, Threads 등 주요 커뮤니티 및 소셜 미디어를 모두 훑어봅니다.
- **안티봇 완벽 우회**: 로컬 크롬 세션 연동(Persistent Context) 기술을 사용하여 막히기 쉬운 소셜 미디어 플랫폼의 피드까지 100% 수집합니다.
- **AI 큐레이션**: 단순히 긁어오는 것이 아니라, Gemini AI를 통해 가장 주목해야 할 5개의 핫이슈를 엄선하고 직관적인 3줄 요약으로 정제합니다.

### ⚙️ 어떻게 굴러가나 (파이프라인)
```
수집 스크립트    ┐                                                              
                 ├─→ 큐레이션 스크립트 ─→ site-builder ─→ 🌐
안티봇 브라우저 ┘    (Gemini API)         (최신화)
```
- **수집 (`scripts/collect_news.js`)**: 각 매체에서 크롤링 및 로컬 세션을 통해 최신 포스트/글 수집
- **큐레이션 (`scripts/curate_news.js`)**: 수집된 후보군을 Gemini API(프롬프트 룰 기반)로 전달하여 "신기술/신기능" 위주의 핫이슈 최대 5개를 추출 및 3줄 요약
- **발행**: 정제된 데이터를 `site/public/data/news_latest.json`에 저장하여 프론트엔드 업데이트

### 🗂 데이터 스키마
`site/public/data/news_latest.json` 구조:
```json
{
  "summary": "오늘의 전체 뉴스 흐름 요약",
  "news": [
    {
      "id": "고유ID",
      "category_name": "출처(GeekNews 등)",
      "headline": "기사 주요 제목",
      "summary_ko": "한글 요약 (3줄)",
      "body_ko": "기사 본문 상세",
      "url": "원문 링크",
      "tags": ["기술", "오픈소스"]
    }
  ]
}
```

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

## 3부: 🚀 구조 및 실행 방법

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
node scripts/curate_news.js

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
