<div align="center">

# AI위클리 <sub>· AI Weekly</sub>

**최신 AI 기술 신호와 Claude Code 에이전트 생태계를 한눈에 조망하는 데이터 파이프라인**

매일 엄선되는 **AI 뉴스(3줄 요약 & 심층 해설)**, 매주 수집·분석되는 **Claude Code 트렌드 인덱스**, 그리고 오픈소스 성장세를 추적하는 **스타보드(Starboard)**를 전자동으로 제공합니다.

[🌐 라이브 사이트](https://ldk-hub.github.io/ai-weekly/) ·
[📡 RSS 피드](https://ldk-hub.github.io/ai-weekly/feed.xml) ·
[📰 뉴스 RSS](https://ldk-hub.github.io/ai-weekly/news-feed.xml) ·
[⭐ GitHub](https://github.com/ldk-hub/ai-weekly)

![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-D97757?style=flat-square)
![Auto Updated](https://img.shields.io/badge/Updated-Daily%20&%20Weekly-22c55e?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-0e0e0e?style=flat-square)
![Vite + Static](https://img.shields.io/badge/Stack-Vite%20%7C%20Vanilla%20JS%20%7C%20Node.js-blue?style=flat-square)

</div>

---

## 💡 프로젝트 핵심 가치 (Engineering Highlights)

> **"신뢰할 수 있는 데이터, LLM 환각을 원천 차단하는 엄격한 품질 게이트, 그리고 완벽히 자동화된 정적 배포"**

- **결정적 수집(Deterministic Collection) + 지능형 큐레이션**: 사실 데이터(Stars, 날짜, URL, 작성자)는 코드로 강제 고정하고, 맥락 분석 및 번역만 에이전트/LLM에 위임하여 환각(Hallucination)을 0%로 차단합니다.
- **다단계 품질 게이트 (Automated Quality Gates)**: 3불릿 요약 규격, 5~10문장 심층 해설, 원문 복붙 탐지, 금융/광고 필터, 플랫폼 균형 배분 등을 CLI 검증기(`--validate`)로 자동 검사합니다.
- **성장률 기반 코호트 정규화 (Growth-Rate Cohort Normalization)**: 절대 스타 수에 치우치지 않고, 주간 성장률(Velocity)과 커뮤니티 반응(Buzz)을 종합한 4축 스코어링으로 진짜 떠오르는 라이징 프로젝트를 발굴합니다.
- **Vite 기반 초경량 아키텍처**: 빌드 시간 0.2초 미만의 정적 번들링과 순수 JSON 기반 아카이빙으로 외부 백엔드 의존성 없이 무중단 운영됩니다.

---

## 1부: 📰 AI 뉴스 (AI News / `cc-news`)

쏟아지는 모델 릴리스, 제품 기능, 오픈소스, 논문 소식 중에서 **최근 24시간 동안 발생한 진짜 기술 신호**만을 수집하여 **3줄 요약과 5~10문장 한국어 해설**로 제공합니다.

### 📌 주요 특징
- **기술 신호 6축 분류**: 모델 출시(`model`), 제품 기능(`product`), 개발자 도구/에이전트(`devtool`), 개인 오픈소스(`oss`), 연구/논문(`research`), 실무 워크플로우(`practice`) (+영향력 큰 `policy`).
- **7개 고정 매체 수집**: GeekNews, Hacker News, AI타임스, Reddit, GitHub, X (Twitter), Threads. (24시간 시간창 계약을 엄수하기 위해 발행 주기가 긴 매체는 제외).
- **원문 스크랩이 아닌 '재작성'**: 원문 HTML과 GitHub README를 분석하여 ①무엇이 일어났나 ②기술적으로 무엇이 새로운가 ③개발자에게 왜 중요한가를 완결된 한국어 문장으로 작성합니다.
- **플랫폼 균형 선별**: 특정 매체에 편중되지 않도록 플랫폼별 3~5건씩 균형 있게 선별합니다.

### ⚙️ 파이프라인 흐름
```
collect_news.js ───────→ curate_news.js ───────→ --validate 검증 ───────→ news_latest.json
(7개 매체 병렬 수집)     (신호 분류·번역·해설)     (품질/규격 100% 통과)      (+ 아카이브/RSS 갱신)
```
- **수집 (`scripts/news/collect_news.js`)**: 24시간 윈도우 수집 → Cheerio 본문 확보(120자 이상) → URL 중복 제거 → `.tmp/news_candidates.json`
- **큐레이션 (`scripts/news/curate_news.js`)**: 6축 신호 분류 + 한글 재작성 요약 (API 키 또는 에이전트 직접 큐레이션)
- **검증 (`node scripts/news/curate_news.js --validate`)**: 배포 전 필수 게이트 검사 통과 후 라이브 반영

### 🗂 데이터 스키마 (`site/public/data/news_latest.json`)
```json
{
  "summary": "AI 기술 신호 18건 — oss 5건 · product 5건 ... ldk-hub에서 큐레이션 하였습니다.",
  "curated_by": "ldk-hub",
  "news": [
    {
      "id": "geeknews_f5c2b70404",
      "signal_id": "practice",
      "signal_name": "AI 활용 사례·워크플로우 팁",
      "importance": 88,
      "category_id": "geeknews",
      "category_name": "GeekNews",
      "headline": "AI 레드 에이전트, 깃허브 코파일럿 취약점 이용해 스노우플레이크 Jira 침해 시연",
      "title_ko": "AI 레드 에이전트, 깃허브 코파일럿 취약점 이용해 스노우플레이크 Jira 침해 시연",
      "title_en": "AI-Generated GitHub Copilot Autofix Allowed Compromise of Snowflake's Jira",
      "summary_ko": "• Wiz Research의 자율 AI 보안 에이전트가 코파일럿 취약점을 발견했습니다.\n• 공개 리포지토리 이슈 조작으로 내부 접근 토큰을 탈취했습니다.\n• CI/CD와 결합된 AI 도구의 새로운 위협 모델을 실증했습니다.",
      "body_ko": "클라우드 보안 기업 Wiz의 연구팀이 자율 침투 에이전트를 통해 ... (5~10문장 해설)",
      "url": "https://news.hada.io/topic?id=32595",
      "publish_date": "2026-08-17T22:32:25.000Z",
      "sources": ["https://news.hada.io/topic?id=32595"],
      "curated_by": "ldk-hub"
    }
  ]
}
```

---

## 2부: 🧩 인기 플러그인 (Popular Plugins / `cc-trends`)

Claude Code 도구와 에이전트 프레임워크는 매일 수십 개씩 쏟아집니다. **매주 월요일**, 한 주간 가장 뜨거웠던 라이징 프로젝트와 검증된 클래식 프로젝트를 선별해 인덱싱합니다.

### 📌 주요 카테고리 & 적응형 정원제 (Adaptive Quota)
- 🔥 **Rising (상한 20건)**: 최근 30일 내 급부상한 프로젝트 (스킬 8, MCP 6, 에이전트 4, 하네스 2)
- ⭐ **Classic (상한 16건)**: Stars 500+ 이상으로 검증된 필수 레퍼런스 (스킬 6, MCP 4, 에이전트 4, 하네스 2)
- 📦 **Archive**: 주차별 주간 스냅샷 영구 보존 및 탐색

### 🆚 일반 awesome-list와의 차이점
| 구분 | 일반 awesome-list | **AI위클리 (`cc-trends`)** |
|---|---|---|
| **갱신 주기** | PR 접수 시 (비정기 수동) | **매주 정기 자동 파이프라인** |
| **수집 범위** | GitHub 링크 위주 | **GitHub + HN + Reddit + dev.to + GeekNews + velog** |
| **정렬 기준** | 단순 스타순 / 등록순 | **4축 종합 스코어링** (`0.4*속도 + 0.3*버즈 + 0.2*품질 + 0.1*최신성`) |
| **콘텐츠** | 원문 한 줄 설명 | **한글 제목 + 캐치프레이즈 + 3대 핵심기능 + 유스케이스 + 설치 힌트** |
| **신뢰도 검증**| 수동 확인 | **존재 검증(`gh api`), 단일출처 강등 규칙, 중복/포크 자동 컷** |

### ⚙️ 파이프라인 아키텍처
```
github-scout    ┐
                 ├─→ trend-analyzer ──→ content-curator ──→ publish-curated.js ──→ 🌐
community-scout ┘    (4축 점수·정원 컷)    (한글화·유스케이스)   (Stars 동기화·RSS·OG)
```

### 🛡 4중 품질 검증 게이트
1. **존재 검증**: GitHub API로 리포지토리 존재 및 아카이브 여부 실시간 확인
2. **단일 출처 강등**: 교차 검증되지 않은 단일 소스 항목은 점수 임계치 미달 시 `pending` 강등
3. **사실 필드 강제 동기화**: `stars`, `pushed_at` 등 핵심 메타는 GitHub 원본 데이터로 강제 덮어쓰기
4. **Publish Gate**: 미검증 항목 또는 중복 설명 포함 시 배포 즉시 차단

---

## 3부: 📈 스타보드 (Starboard / `cc-star`)

Claude Code 생태계 내 170여 개 핵심 오픈소스의 **일간/주간 스타(Star) 증감 현황과 성장 궤적**을 시각화하는 리더보드입니다.

### 📌 주요 특징
- **체급별 리그(League) 분류**: `Legend`, `Premier`, `Major`, `Minor`로 체급을 나누어 대형 리포와 신생 리포 모두 공정하게 성장을 비교합니다.
- **원장 기반 속도(Velocity) 추적**: `data/stars/stars_ledger.json`에 일자별 스타 표본을 원자적으로 기록하여 정확한 주간 델타를 계산합니다.
- **장기 휴면 및 이상치 감지**: 장기간 커밋이 없거나 비정상적인 스타 변동을 자동으로 감지합니다.

---

## 4부: 🚀 구조 및 실행 방법

### 📂 디렉토리 구조
```
ai-weekly/
├── .agents/skills/      # Claude Code / Antigravity 자동화 스킬 정의 (cc-news, cc-star, cc-trends 등)
├── site/                # Vite 기반 정적 웹 프론트엔드
│   ├── public/data/     # 라이브 JSON 데이터 (news_latest.json, latest.json, stars_meta.json 등)
│   ├── index.html       # 트렌드 플러그인 뷰어
│   ├── news.html        # 데일리 AI 뉴스 뷰어
│   └── starboard.html   # 스타보드 랭킹 뷰어
├── scripts/
│   ├── core/            # RSS 피드, OG 이미지, 아카이브 인덱스 생성기
│   ├── news/            # 뉴스 수집(collect_news.js) 및 큐레이션/검증(curate_news.js)
│   ├── plugins/         # 트렌드 수집(collect.js) 및 발행(publish-curated.js)
│   └── stars/           # 스타보드 크롤러(collect-stars.js) 및 원장 관리자
└── data/
    ├── archive/         # 주차별/일자별 원본 데이터 영구 아카이브
    └── stars/           # 스타보드 시계열 원장 및 메타데이터
```

### 💻 실행 명령어 (NPM Scripts)

**1. 로컬 개발 서버 및 빌드**
```bash
npm run dev        # Vite 로컬 개발 서버 실행 (http://localhost:5173)
npm run build      # 프로덕션 정적 번들 빌드
npm run preview    # 빌드된 프로덕션 번들 로컬 프리뷰
```

**2. 데이터 파이프라인 수동 실행**
```bash
# 📰 데일리 AI 뉴스 수집 및 큐레이션 (검증 포함)
npm run data:news
node scripts/news/curate_news.js --validate

# 📈 스타보드 데이터 갱신
npm run data:stars

# 🧩 주간 플러그인 트렌드 수집 및 발행
npm run data:plugins
npm run data:publish
```

**3. Claude Code / Antigravity 슬래시 커맨드**
```bash
/cc-news      # 데일리 뉴스 수집 → 직접 큐레이션 → 검증 파이프라인 실행
/cc-trends    # 주간 트렌드 수집 → 점수 계산 → 큐레이션 → 배포 실행
/cc-star      # 스타보드 실시간 크롤링 및 메타 갱신 실행
```

---

## 📄 라이선스 및 기여 안내

- **코드 라이선스**: [MIT License](LICENSE)
- **데이터 라이선스**: [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- 버그 제보, 유용한 오픈소스 제안은 [GitHub Issues](https://github.com/ldk-hub/ai-weekly/issues)를 통해 환영합니다.

<div align="center">
Maintained by <strong><a href="https://github.com/ldk-hub">ldk-hub</a></strong> <br>
Based on <a href="https://github.com/INNO-HI/weeklaude">weeklaude</a> by INNO-HI (MIT) <br>
Automated with <strong><a href="https://claude.com/claude-code">Claude Code</a></strong>
</div>
