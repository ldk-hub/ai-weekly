<div align="center">

# AI위클리 <sub>· AI Weekly</sub>

**최신 AI 기술 신호와 Claude Code 에이전트 생태계를 한눈에 조망하는 데이터 파이프라인**

매일 엄선되는 **AI 뉴스(3초 스캐닝 3대 핵심 포인트 & 아코디언 심층 해설)**, 매주 수집·분석되는 **Claude Code 트렌드 인덱스**, 오픈소스 성장세를 추적하는 **스타보드(Starboard)**, 그리고 개발자 소통 공간 **AI 라운지(Lounge)**를 전자동으로 제공합니다.

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

> **"신뢰할 수 있는 데이터, LLM 환각을 원천 차단하는 엄격한 품질 게이트, 그리고 3초 만에 훑어보는 극상의 가독성"**

- **결정적 수집(Deterministic Collection) + 지능형 큐레이션**: 사실 데이터(Stars, 날짜, URL, 작성자)는 코드로 강제 고정하고, 맥락 분석 및 번역만 에이전트/LLM에 위임하여 환각(Hallucination)을 0%로 차단합니다.
- **3초 스캐닝 정보 구조 (3-Second Scanning Architecture)**: 바쁜 개발자를 위해 핵심 키워드 볼드와 주황색 넘버 배지(`1`, `2`, `3`)로 요점을 즉시 파악하고, 장문 기술 해설은 네이티브 아코디언(`<details>`)으로 기본 접어두어 카드 높이를 슬림화했습니다.
- **다단계 품질 게이트 (Automated Quality Gates)**: 3불릿 요약 규격, 5~10문장 심층 해설, 원문 복붙 탐지, 금융/광고 필터, 플랫폼 균형 배분 등을 CLI 검증기(`--validate`)로 자동 검사합니다.
- **원격 드로퍼 차단 보안 스캐너 (`scan-install-entry.js`)**: 설치 시점에 실행되는 진입점(setup.py, install.sh 등)을 검사해 비인가 원격 코드 실행(exec/eval)이나 하드코딩된 IP를 감지하여 악성 패키지를 원천 차단합니다.
- **성장률 기반 코호트 정규화 (Growth-Rate Cohort Normalization)**: 절대 스타 수에 치우치지 않고, 주간 성장률(Velocity)과 커뮤니티 반응(Buzz)을 종합한 4축 스코어링으로 진짜 떠오르는 라이징 프로젝트를 발굴합니다.
- **Vite 기반 초경량 아키텍처**: 빌드 시간 0.2초 미만의 정적 번들링과 순수 JSON 기반 아카이빙으로 외부 백엔드 의존성 없이 무중단 운영됩니다.

---

## 1부: 📰 AI 뉴스 (AI News / `cc-news`)

쏟아지는 모델 릴리스, 제품 기능, 오픈소스, 논문 소식 중에서 **최근 24시간 동안 발생한 진짜 기술 신호**만을 수집하여 **3대 핵심 요약과 5~10문장 한국어 해설**로 제공합니다.

<img src="docs/images/summary_banner.png" alt="AI 트렌드 요약 배너" width="100%" style="border-radius: 8px; margin: 12px 0;" />

### 📌 주요 특징 및 UI 개편
- **3초 스캐닝 3대 포인트 요약 박스**: 
  - 각 카드 상단에 주황색 넘버 배지(`1`, `2`, `3`)와 함께 핵심 키워드(`비용 역설 :`, `발생 원인 :`, `실무 시사점 :`)를 볼드로 강조하여 3초 만에 핵심 골자를 파악할 수 있습니다.
- **네이티브 접힘 아코디언 (Deep-Dive Accordion)**:
  - 5~10문장의 심층 기술 해설은 기본적으로 접혀 있으며, 클릭 시 부드럽게 펼쳐져 원하는 심층 배경만 선택적으로 탐색할 수 있습니다.
- **군더더기 없는 클린 카드 디자인**:
  - 카드 하단의 중복 출처 칩을 제거하고 핵심 토픽 해시태그(`#`) 중심으로 정돈하여 시각적 피로도를 대폭 낮췄습니다.
- **기술 신호 6축 분류**: 모델 출시(`model`), 제품 기능(`product`), 개발자 도구/에이전트(`devtool`), 개인 오픈소스(`oss`), 연구/논문(`research`), 실무 워크플로우(`practice`).
- **7개 고정 매체 균형 수집**: GeekNews, Hacker News, AI타임스, Reddit, GitHub, X (Twitter), Threads.

### ⚙️ 파이프라인 흐름
```
collect_news.js ───────→ curate_news.js ───────→ --validate 검증 ───────→ news_latest.json
(7개 매체 병렬 수집)     (신호 분류·번역·해설)     (품질/규격 100% 통과)      (+ 아카이브/RSS 갱신)
```

### 🗂 데이터 스키마 (`site/public/data/news_latest.json`)
```json
{
  "summary": "🔥 오늘의 핵심 이슈: #추론비용역설 #에이전틱비디오 #SRE자율에이전트 — 앤트로픽 Fable 5.1의 실측 비용 역설과...",
  "curated_by": "ldk-hub",
  "news": [
    {
      "id": "geeknews_f5c2b70404",
      "signal_id": "practice",
      "signal_name": "실무 활용",
      "importance": 88,
      "category_id": "geeknews",
      "category_name": "GeekNews",
      "headline": "캐시 가격 75% 인하에도 비용 20% 상승…앤트로픽 Claude Fable 5.1의 '토큰 역설'",
      "title_ko": "캐시 가격 75% 인하에도 비용 20% 상승…앤트로픽 Claude Fable 5.1의 '토큰 역설'",
      "summary_ko": "• **비용 역설**: 캐시 단가 인하에도 에이전트 다회차 루프로 전체 토큰 소비가 급증했습니다.\n• **발생 원인**: 도구 호출 시 긴 컨텍스트 유지로 인해 반복 읽기 비용이 누적되었습니다.\n• **실무 시사점**: 단순 단가보다 에이전트 호출 주기와 메모리 압축 설계가 비용의 핵심입니다.",
      "body_ko": "최근 앤트로픽의 캐시 할인 정책에도 불구하고 ... (5~10문장 심층 해설)",
      "url": "https://news.hada.io/topic?id=32595",
      "publish_date": "2026-09-03T07:00:00.000Z",
      "tags": ["추론비용역설", "에이전트루프", "컨텍스트최적화"],
      "sources": ["GeekNews", "Hacker News"],
      "curated_by": "ldk-hub"
    }
  ]
}
```

---

## 2부: 🧩 인기 플러그인 (Popular Plugins / `cc-trends`)

Claude Code 도구와 에이전트 프레임워크는 매일 수십 개씩 쏟아집니다. **매주 월요일**, 한 주간 가장 뜨거웠던 라이징 프로젝트와 검증된 클래식 프로젝트를 선별해 인덱싱합니다.

<img src="docs/images/plugins_tab.png" alt="인기 플러그인 화면" width="100%" style="border-radius: 8px; margin: 12px 0;" />

### 📌 주요 특징 및 UI 개편
- **체크포인트 불릿(`✓`)과 키워드 볼드**:
  - 각 도구의 3대 핵심 기능을 읽기 쉬운 원형 체크포인트 불릿과 굵은 글씨 키워드로 구조화하여 한눈에 파악됩니다.
- **원클릭 미니 CLI 설치 칩 (`❯ /install ...`)**:
  - 리포지토리 카드 하단에 터미널 형태의 원클릭 복사 칩을 신설하여, 클릭 한 번으로 바로 Claude Code 터미널에 붙여넣어 설치할 수 있습니다.
- 🔥 **Rising (상한 20건)**: 최근 30일 내 급부상한 프로젝트 (스킬 8, MCP 6, 에이전트 4, 하네스 2)
- ⭐ **Classic (상한 16건)**: Stars 500+ 이상으로 검증된 필수 레퍼런스 (스킬 6, MCP 4, 에이전트 4, 하네스 2)
- 📦 **Archive**: 주차별 주간 스냅샷 영구 보존 및 역대 인덱스 탐색

---

## 3부: 📈 스타보드 (Starboard / `cc-star`)

Claude Code 생태계 내 560여 개 핵심 오픈소스의 **일간/주간 스타(Star) 증감 현황과 성장 궤적**을 시각화하는 리더보드입니다.

<img src="docs/images/starboard_tab.png" alt="스타보드 화면" width="100%" style="border-radius: 8px; margin: 12px 0;" />

### 📌 주요 특징 및 UI 개편
- **한국어 핵심 설명 우선 노출 (`desc_ko`)**:
  - 영문 설명에 앞서 친절한 한국어 한 줄 요약을 강조 박스로 제공하여 프로젝트의 쓰임새를 즉시 이해할 수 있습니다.
- **주간 급상승 불꽃 모멘텀 배지 (`🔥 +11,676/wk`)**:
  - 주간 스타 유입 속도(Velocity)가 높은 라이징 리포지토리에 눈에 띄는 불꽃 배지를 부여하여 트렌드 리더를 한눈에 식별합니다.
- **기술 스택 칩 (`🏷️ TypeScript`, `🏷️ Python` 등)**:
  - 리포지토리의 주요 언어 및 스택을 라벨로 함께 표기합니다.
- **체급별 리그(League) 분류**: `Legend`, `Premier`, `Major`, `Minor`로 체급을 나누어 대형 리포와 신생 리포 모두 공정하게 성장을 비교합니다.

---

## 4부: 💬 AI 라운지 (Lounge / Community)

방문한 개발자들이 Claude Code 팁, 새로운 AI 도구 사용기, 프롬프트 기법을 실시간으로 자유롭게 묻고 답하는 커뮤니티 공간입니다.

<img src="docs/images/lounge_tab.png" alt="AI 라운지 화면" width="100%" style="border-radius: 8px; margin: 12px 0;" />

### 📌 주요 특징
- **추천 토픽 온보딩 가이드 칩**:
  - 상단에 `❓ Claude Code 질문하기`, `✨ 실무 에이전트 팁 공유`, `📦 신규 MCP 도구 추천`, `🚀 AI위클리 기능 피드백` 칩을 배치하여 누구나 쉽게 첫 글을 시작할 수 있도록 돕습니다.
- **GitHub Discussions & Giscus 연동**:
  - 별도 회원가입이나 백엔드 DB 없이 GitHub 계정으로 즉시 댓글과 이모지 리액션을 남길 수 있습니다.

---

## 5부: 🚀 구조 및 실행 방법

### 📂 디렉토리 구조
```
ai-weekly/
├── .agents/skills/      # Claude Code / Antigravity 자동화 스킬 정의 (cc-news, cc-star, cc-trends 등)
├── docs/                # 블로그 리뷰 원고 및 고화질 스크린샷 자산 (docs/images/)
├── site/                # Vite 기반 정적 웹 프론트엔드
│   ├── public/data/     # 라이브 JSON 데이터 (news_latest.json, latest.json, stars_meta.json 등)
│   ├── index.html       # 트렌드 플러그인 뷰어
│   ├── news.html        # 데일리 AI 뉴스 뷰어
│   ├── starboard.html   # 스타보드 랭킹 뷰어
│   └── lounge.html      # AI 라운지 커뮤니티
├── scripts/
│   ├── core/            # RSS 피드, OG 이미지, 아카이브 인덱스 생성기
│   ├── news/            # 뉴스 수집(collect_news.js) 및 큐레이션/검증(curate_news.js)
│   ├── plugins/         # 트렌드 수집(collect.js), 보안 스캔, 발행(publish-curated.js)
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

# 📈 스타보드 데이터 갱신 (560여개 리포)
npm run data:stars

# 🧩 주간 플러그인 트렌드 수집, 보안 스캔, 큐레이션
npm run data:plugins
node scripts/plugins/scan-install-entry.js
node scripts/plugins/curate.js

# 📝 옵시디언 볼트 동기화
npm run sync:obsidian
```

**3. Claude Code / Antigravity 슬래시 커맨드**
```bash
/cc-news      # 데일리 뉴스 수집 → 직접 큐레이션 → 검증 파이프라인 실행
/cc-trends    # 주간 트렌드 수집 → 점수 계산 → 큐레이션 → 배포 실행
/cc-star      # 스타보드 실시간 크롤링 및 메타 갱신 실행
/cc-daily     # 평일 종합 파이프라인 (스타보드 + 뉴스 + 볼트 동기화)
/cc-weekly    # 주간 종합 파이프라인 (스타보드 + 뉴스 + 트렌드 + 보안스캔 + 볼트 동기화)
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
