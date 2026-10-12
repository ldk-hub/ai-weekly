# cc-weekly 스킬 점검 보고서 (2026-10-12)

**결론 한 줄:** Agent-Reach 및 X 복귀 변경 자체는 안전하게 구현되었으나, 프론트엔드 매체 칩(`site/src/state.js`)의 X 누락과 과거 스크립트 경로를 가리키는 에이전트 문서 5건, 그리고 설치 진입점 검사(`scan-install-entry.js`)의 알려진 우회 수법 미대응에 대한 정비가 필요합니다.

---

## 1. 수정 필요 목록

| 심각도 | 파일:줄 | 문제 | 근거 (해당 줄 인용) | 제안 (바꿀 내용 / diff) |
|---|---|---|---|---|
| **High** | `site/src/state.js:71-80` | 뉴스 매체 필터 칩 목록에 `x`가 누락되어 프론트엔드에서 X 뉴스 필터링 칩이 표시되지 않음 | `export const NEWS_CATEGORIES = [` ... `(x 누락)` (71~80행) | `NEWS_CATEGORIES`에 `{ id: "x", emoji: "𝕏", label_ko: "X", label_en: "X" }` 추가 및 주석 "7종"을 "8종"으로 갱신 |
| **High** | `scripts/plugins/scan-install-entry.js:20-31, 85-90` | 2026-09-02 우회 수법(로컬 파일 기반 스틸러) 미탐지: (1) `install-skill.sh` 등 변형 파일명이 경로 목록에 없고, (2) 네트워크 fetch 없는 로컬 파일 exec 패턴 탐지 규칙 부재 | `const ENTRY_PATHS = ["package.json", "setup.py", ... "install.sh", "setup.sh", ...];` (20~31행) | `ENTRY_PATHS`에 `install-skill.sh` 추가 또는 스크립트 파일 패턴 매칭 도입, 로컬 파일 읽기 후 동적 실행(`fileRead + dynamicExec`) 탐지 규칙 추가 |
| **High** | `.claude/agents/github-scout.md:87` | 존재하지 않는 스크립트 경로 호출 안내 | `node scripts/build-stars-ledger.js --add _workspace/01_github_raw.json <오늘>` (87행) | `node scripts/stars/build-stars-ledger.js --add _workspace/01_github_raw.json <오늘>` 로 경로 수정 |
| **High** | `.claude/skills/cc-trends/skill.md:24` | 존재하지 않는 스크립트 경로 호출 안내 | `- 수집 직후 node scripts/build-stars-ledger.js --add _workspace/01_github_raw.json <오늘>` (24행) | `node scripts/stars/build-stars-ledger.js` 로 경로 수정 |
| **High** | `.claude/agents/news-curator.md:9` | 존재하지 않는 스크립트 경로 호출 안내 | `GEMINI_API_KEY=... node scripts/curate_news.js` (9행) | `GEMINI_API_KEY=... node scripts/news/curate_news.js` 로 경로 수정 |
| **High** | `.claude/agents/news-scout.md:11` | 존재하지 않는 스크립트 경로 호출 안내 | `node scripts/collect_news.js` (11행) | `node scripts/news/collect_news.js` 로 경로 수정 |
| **High** | `.claude/agents/site-builder.md:26` | 존재하지 않는 스크립트 경로 호출 안내 | `node scripts/publish-curated.js <YYYY-MM-DD>` (26행) | `node scripts/plugins/publish-curated.js <YYYY-MM-DD>` 로 경로 수정 |
| **Med** | `scripts/plugins/curate.test.js:4, 29` | `curate.js`가 아무 함수도 export하지 않아 단위 테스트 실행 시 `TypeError`로 즉시 실패함 | `const { curate, toItem, readmeSimilarity, qualityScore, ... } = require("./curate");` (4행) | `scripts/plugins/curate.js` 하단에 테스트 대상 함수(`qualityScore`, `recencyScore`, `curate` 등)를 `module.exports`로 내보내도록 수정 |
| **Med** | `.claude/agents/news-scout.md:3, 16-23` | 수집 매체 목록 드리프트: 8개 매체 중 3개(AI타임스, Bluesky, HF Daily Papers)가 누락되고 구버전 `arXiv`가 남아있음 | `description: "최근 24시간의 AI 기술 신호를 6개 소스(GeekNews, Hacker News, GitHub, arXiv, Reddit, Agent-Reach 경유 X)에서 수집..."` (3행) | 설명 및 표를 8개 매체(GeekNews, Hacker News, AI타임스, Reddit, GitHub, Bluesky, X, HF Daily Papers)로 최신화 |
| **Med** | `.claude/agents/news-scout.md:33`, `.claude/agents/news-analyzer.md:13, 22` | 뉴스 후보 출력 파일 경로 드리프트 | `로그의 소스별 건수와 data/news_candidates.json 을 근거로 보고한다.` (`news-scout.md:33`) | 실제 생성 경로인 `.tmp/news_candidates.json` 으로 경로 수정 |
| **Low** | `.claude/agents/news-analyzer.md:18` | 신호 소스 명칭 구버전 잔재 | `특히 oss(GitHub)·research(arXiv) 가 0건이면` (18행) | `research(arXiv)`를 현재 사용 중인 `research(HF Daily Papers)`로 갱신 |
| **Low** | `README.md:54`, `scripts/obsidian_export.js:146` | 매체 수 구버전 잔재 ("7개 매체") | `(7개 매체 병렬 수집)` (`README.md:54`), `7개 매체에서 수집하여` (`obsidian_export.js:146`) | 2026-10-12 X 복귀를 반영하여 `8개 매체`로 문구 수정 |
| **Low** | `.claude/agents/site-builder.md:17` | 프론트엔드 스택 기술 드리프트 | `- Next.js(App Router) 또는 단일 HTML + Vanilla JS (최초엔 후자로 시작)` (17행) | 실제 프로젝트 빌드 스택인 `Vite 기반 정적 사이트`로 갱신 |

---

## 2. 점검 항목 A~F 별 상태

* **A. 실행 경로 정합성 — [문제]**
  * 근거: `.claude/agents/` 및 `.claude/skills/` 내 5개 문서에서 `scripts/` 바로 아래를 가리키는 오래된 경로(`scripts/build-stars-ledger.js`, `scripts/collect_news.js`, `scripts/curate_news.js`, `scripts/publish-curated.js`)를 적고 있어 그대로 실행 시 모듈 없음 에러가 발생합니다. (반면 `.agents`와 `.claude`의 동일 이름 스킬 3쌍은 완전히 일치합니다.)
* **B. 10-12 변경 정합성 — [통과]**
  * 근거: `agent_reach.js`의 CLI 플래그와 `community-scout.md`/`community-scan/skill.md`의 실행 예시가 정확히 일치하며, `collect_news.js`의 `REQUIRED_SOURCES`, `SOURCE_CAPS`, `SOURCE_RANK`, `labels`, `Promise.all` 간 8개 매체 정합성이 완전합니다. `last30days` 실행 잔재도 0건입니다.
* **C. 문서 드리프트 — [문제]**
  * 근거: 프론트엔드 매체 칩 정의인 `site/src/state.js`의 `NEWS_CATEGORIES`에 `x`가 누락되어 있고, `news-scout.md`가 여전히 6개 매체 및 `arXiv`를 기술하고 있습니다.
* **D. 보안 — [문제]**
  * 근거: `twitter`/`rdt` 직접 호출 차단 및 쿠키 노출 방지(`rdt-login.sh`, `agent_reach.js`)는 완벽히 준수되고 있으나, `scan-install-entry.js`가 `install-skill.sh` 파일명 미인식 및 로컬 파일 exec 스틸러 탐지 규칙 부재로 2026-09-02 우회 수법을 여전히 잡지 못합니다.
* **E. 산출물 스키마 — [통과]**
  * 근거: `community-scout`의 `source`/`sources` 표기(`reddit`, `x`, `hn` 등)와 `trend-analyzer`, `content-curator`, `site-builder`, 프론트엔드 `site/src/main.js`의 `SOURCE_LABEL` 간 필드명 규격이 일치합니다.
* **F. 실패 모드 — [통과]**
  * 근거: `collect_news.js`에서 최종 0건 매체 발생 시 `[MISSING]` 경고와 `missing_sources`가 정상 출력/저장되며, `agent_reach.js` 쿠키 부재 시에도 친절한 설정 안내 에러와 함께 종료됩니다.

---

## 3. 실행한 명령과 결과

1. `node --check scripts/core/agent_reach.js`
   - 종료코드: `0`
   - 출력: (에러 없음, 문법 검사 통과)
2. `node --check scripts/news/collect_news.js`
   - 종료코드: `0`
   - 출력: (에러 없음, 문법 검사 통과)
3. `node --check scripts/news/curate_news.js`
   - 종료코드: `0`
   - 출력: (에러 없음, 문법 검사 통과)
4. `bash -n scripts/core/rdt-login.sh`
   - 종료코드: `0`
   - 출력: (에러 없음, 셸 스크립트 문법 검사 통과)
5. `node scripts/plugins/scan-install-entry.test.js`
   - 종료코드: `0`
   - 출력: `scan-install-entry: 7 assertion groups ok`, `derivedPaths ok`, `버전 오탐 방어 ok`
6. `node scripts/plugins/publish-floor.test.js`
   - 종료코드: `0`
   - 출력: `publish-floor: 3 assertions groups ok`
7. `node scripts/plugins/curate.test.js`
   - 종료코드: `1`
   - 출력: `TypeError: qualityScore is not a function` (`curate.js`가 exports하지 않아 발생)
8. `node scripts/stars/build-stars-ledger.test.js`
   - 종료코드: `0`
   - 출력: `ok — velocity 성장률 채점 11/11`
9. `node scripts/news/curate_news.js --selfcheck`
   - 종료코드: `0`
   - 출력: `[quota] 매체당 5 · 축당 4 · 총 18 적용 → 11건 선별 (미채택 10건)`, `✅ selfcheck 통과`
10. `node scripts/core/agent_reach.js`
    - 종료코드: `1`
    - 출력: `사용법: node scripts/core/agent_reach.js x "<검색어>" [-n 20]...` (정상적인 사용법 안내 출력)
11. `node scripts/core/agent_reach.js x "claude code" -n 3`
    - 종료코드: `1`
    - 출력: `X 쿠키 없음 — agent-reach configure twitter-cookies 먼저 실행` (부계정 쿠키 미등록 상태 정상 탐지)
12. `node scripts/core/agent_reach.js reddit "claude code" -n 3`
    - 종료코드: `1`
    - 출력: `Reddit 쿠키 없음 — bash scripts/core/rdt-login.sh 먼저 실행` (쿠키 미등록 상태 정상 탐지)

---

## 4. 확인하지 못한 것

1. **실제 유효 쿠키 등록 상태에서의 X/Reddit 실검색 네트워크 응답**:
   - 지침상 자격증명 파일 접근 및 `rdt login` 등의 실행이 금지되어 있고, 현재 환경에 부계정 쿠키가 미등록되어 있어 실제 X/Reddit API 응답 JSON의 페이로드 구조(실시간 필드 일치 여부)는 직접 수신해보지 못했습니다. (단, 코드 레벨의 에러 핸들링 및 mock 스키마는 검증 완료)
2. **Gemini API 키 기반 실시간 큐레이션 호출**:
   - 유료/실과금 방지 지침에 따라 `curate_news.js`의 온프레미스 실호출은 건너뛰고 `--selfcheck` 오프라인 게이트 검증으로 대체했습니다.
