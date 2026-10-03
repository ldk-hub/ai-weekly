# AI Weekly 현행 기준 3대 저장소 일관성 강화 및 군더더기 제거 설계서

- **작성일**: 2026-10-03
- **대상 저장소**:
  1. `ldk-hub/ai-weekly` (핵심 파이프라인 및 정적 사이트)
  2. `ldk-hub/ldk-hub` (GitHub 프로필 저장소)
  3. `ldk-hub/ldk-hub.github.io` (기술 블로그 및 포트폴리오)
- **목표**: ai-weekly 2.0 UX 대개편(3초 스캐닝 넘버 배지, 점진적 아코디언, 580여 개 OSS 3대 리그, 7대 정규 매체)을 기준으로 3개 저장소의 정보 불일치와 오류를 100% 해결하고, 과도한 수식어와 불필요한 임시 파일을 정리하여 전문적이고 일관된 엔지니어링 허브 구축.

---

## 1. 배경 및 문제 정의 (Problem Statement)

1. **수집 매체 명세 불일치**:
   - `ai-weekly/scripts/news/collect_news.js`는 `GeekNews`, `Hacker News`, `AI타임스`, `Reddit`, `GitHub`, `Bluesky`, `HF Daily Papers` 7종을 수집하도록 고도화됨 (X·Threads는 영구 제외).
   - 반면 `ai-weekly/README.md`에는 과거 잔재인 `X (Twitter), Threads`가 여전히 명시되어 있어 실제 동작과 불일치 발생.
2. **스타보드 모니터링 규모 및 리그 체계 오류**:
   - 실제 스타보드는 583개(약 580여 개) 오픈소스를 **3대 리그(헤비급 10k+, 미들급 1k~10k, 라이트급 1k 미만)**로 분류하여 추적 중 (`site/starboard.html`).
   - `ai-weekly/README.md`에는 과거 weeklaude 시절 4대 리그(`Legend`, `Premier`, `Major`, `Minor`) 및 "560여 개"로 기재됨.
   - `ldk-hub/ldk-hub` 프로필 README에는 초기 버전인 **"170+ 오픈소스"**로 방치되어 최신 성과가 축소 왜곡됨.
3. **기술 스택 오표기 및 불필요한 파일 잔재**:
   - `ldk-hub.github.io/README.md`에서 AI Weekly의 기술 스택에 2.5D 모니터 프로젝트의 스택인 `HTML5/Canvas`가 혼입됨.
   - `ai-weekly/scripts/` 경로에 ai-weekly와 전혀 무관한 호주 여행/인스타그램 크롤링 임시 파일 14종이 untracked 상태로 방치되어 리포지토리 청결도를 해침.
4. **과도한 수식어 및 중복 표현**:
   - 포트폴리오 및 README 전반에 동일한 표현(3대 배지, 극상의 가독성 등)이 다수 중복 노출되어 독자의 인지 피로 유발.

---

## 2. 저장소별 상세 개선 계획 (Detailed Changes)

### 2.1. `ldk-hub/ai-weekly`
- **README.md 정합성 현행화 및 슬림화**:
  - [1부: AI 뉴스] 7개 고정 매체 목록 수정: `GeekNews, Hacker News, AI타임스, Reddit, GitHub, Bluesky, Hugging Face Daily Papers`
  - [3부: 스타보드] 리포지토리 수치 현행화: `560여 개` ➔ `580여 개` (실측 583개)
  - [3부: 스타보드] 체급 리그 현행화: `헤비급(10k+), 미들급(1k~10k), 라이트급(1k 미만) 3대 리그`로 전면 교체
  - 과도하거나 장황한 문구 간결화
- **임시 파일 격리**:
  - `scripts/` 내 인스타·여행 관련 파일 14종을 워크스페이스 상위 안전 백업 경로(`c:\Users\ok601\.gemini\antigravity-ide\scratch\travel_backup/`)로 일괄 이동 격리.

### 2.2. `ldk-hub/ldk-hub` (GitHub 프로필)
- **저장소 클론 및 README.md 개선**:
  - Scratch 환경에 저장소를 클론(`git clone`)하여 작업 진행.
  - Featured Projects 테이블 내 AI위클리 스펙 전면 갱신:
    - 수치: `• 170+ 오픈소스 실시간 랭킹` ➔ `• 580+ 오픈소스 실시간 랭킹 (3대 체급별 리그)`
    - 핵심 아키텍처: `3초 스캐닝 인포메이션 아키텍처(넘버 배지 1/2/3, 점진적 아코디언 UX)`, `7개 매체 결정적 수집 + 환각 0% 품질 게이트`
    - 정량 성과: `0.2초 Vite 정적 빌드`, `GitHub Actions 100% 무인 자동화`
  - 과도하게 복잡한 문장을 한눈에 들어오는 엔지니어링 요약으로 정돈.

### 2.3. `ldk-hub/ldk-hub.github.io` (기술 블로그 & 포트폴리오)
- **README.md 기술 스택 정정**:
  - AI Weekly 2.0 항목의 Tech Stack에서 잘못 표기된 `HTML5/Canvas` 제거 ➔ `Vite`, `Vanilla JS`, `Node.js 24`, `GitHub Actions`, `Obsidian`으로 정확하게 기술.
- **`_pages/portfolio.md` 문맥 최적화**:
  - AI Weekly 2.0 섹션의 중복 서술 제거 및 명확한 성과 중심의 문맥 정돈.
  - 3대 체급 리그(헤비급, 미들급, 라이트급) 및 7대 글로벌 매체 명칭 일치 보장.

---

## 3. 검증 전략 (Verification Strategy)

1. **파일 정합성 검증**:
   - `git status`로 `ai-weekly` 내 untracked 파일 완전 정돈 확인.
   - 각 저장소의 README 링크 및 마크다운 렌더링 무결성 확인.
2. **수치 및 명칭 동기화 검증**:
   - 3개 저장소 모두: **580여 개(580+) 오픈소스**, **3대 체급 리그**, **7대 정규 매체(GeekNews, Hacker News, AI타임스, Reddit, GitHub, Bluesky, HF Daily Papers)**, **3초 스캐닝 UX** 일치 확인.
3. **Git 커밋 무결성**:
   - 각 저장소별 명확한 전문 한국어 커밋 메시지로 분리 커밋.

---

## 4. Git 커밋 계획

1. **ai-weekly**:
   - `docs: ai-weekly 2.0 기준 7대 수집 매체 및 스타보드 3대 리그 명세 현행화`
2. **ldk-hub**:
   - `docs: AI위클리 2.0 개편 사항(580+ OSS, 3대 리그, 3초 스캐닝) 반영 및 프로필 최적화`
3. **ldk-hub.github.io**:
   - `docs: AI Weekly 2.0 기술 스택 오표기 수정 및 포트폴리오 문맥 정제`
