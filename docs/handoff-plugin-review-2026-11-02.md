# 작업지시서 — 플러그인 심사 후속 4건 (2026-11-02)

- **수행 주체:** Gemini. Antigravity 에서 ai-weekly 저장소를 연 상태로 한다.
- **설계·검수:** Claude Code 세션
  - 심사 보고서: meta-be `reports/ai-weekly-plugin-candidates-2026-11-02.md`
  - 원본 JSON: 같은 폴더 `.raw.json`
- **작성일:** 2026-11-02
- **성격:** 결정이 끝난 수정 4건이다. 아래를 그대로 구현한다. 브랜치에 그룹마다 커밋 1개씩 하고, 푸시·배포는 하지 않는다.
- **개정:** 11-02 오후. 처음 판의 A(신조어 시드 되돌리기)를 'A 고쳐서 살리기 + D Hugging Face 신호'로 바꿨다. 되돌리기는 하지 않는다.
- **선행 조건:** `main` HEAD 가 `9bee2f2` 이고, `scripts/` 에 커밋 안 된 변경이 없어야 한다.

> **결정이 끝난 작업이다.** 지시와 다르게 해야 할 이유가 생기면 그 항목만 멈추고, 이유를 보고서 4절에 적는다. 지시된 줄 밖의 리팩토링은 하지 않는다.

---

## 0. 배경과 목표

목표는 네 가지다.

1. 오늘 넣은 '신조어 시드'를 원본(new-term-radar) 규칙대로 고쳐 살린다. 지금은 기사 한 건에서 반복된 단어와 오래된 이름이 시드가 되어, 매일 엉뚱한 검색어로 수집한다.
2. 사이트 요약이 README 와 어긋나는 문제를 다음 주차부터 막는다. 이번 주는 35개 중 34개가 어긋났다.
3. 설치 검사가 플러그인·스킬이 자동으로 실행하는 경로를 보지 못하는 빈칸을 메운다.
4. Hugging Face 트렌딩 상위 50에 새로 들어온 모델·스페이스 이름을 시드 후보에 더한다. 고친 규칙만으로는 지금 피드 양에서 시드가 거의 나오지 않는데, 이 신호가 실제로 새 이름을 공급한다.

**확정된 결정**

| 그룹 | 내용 |
|---|---|
| A 신조어 시드 고치기 | `9bee2f2` 를 되돌리지 않는다. `extractDynamicSeeds()` 에 원본 규칙 세 가지를 옮긴다: 기사 1건 안의 반복은 한 번만 센다, 서로 다른 출처 2곳 이상에서 나온 이름만 남긴다, 최근 60일 안에 본 이름은 뺀다 |
| D Hugging Face 신호 | 트렌딩 상위 50 신규 진입 이름을 시드 후보로 더한다. 새 뉴스 매체(소스)로 추가하지 않고 시드로만 쓴다. 공개 API 라 키가 필요 없다 |
| B 요약 원문 대조 | 세 단계로 한다. ① README 는 스크립트가 직접 받아 둔다 ② knowledge 항목마다 key_features 별로 README 영어 원문 인용(`evidence`)을 붙인다 ③ `--validate` 가 그 인용을 README 와 대조한다. 이번 주 게시본은 고치지 않고 측정만 한다 |
| C 설치 검사 보강 | 플러그인·스킬 진입점에 기존 규칙을 적용한다. 대상은 plugin.json, hooks.json, .mcp.json, SKILL.md, 그리고 이 파일들이 부르는 스크립트다. 버전을 고정하지 않은 실행은 컷하지 않고 경고로 남긴다 |

---

## 1. 검증된 사실 — 이 전제로 작업하라

줄 번호는 2026-11-02 `main`(9bee2f2) 기준이다.

1. **`9bee2f2` 위에서 바로 고치면 된다.** `9bee2f2` 는 main HEAD 이고 origin/main 에도 있다. 이후 `scripts/news/collect_news.js`·`collect_news.test.js` 를 건드린 커밋은 없다.
2. **`9bee2f2` 의 내용**은 네 가지다.
   - `RADAR_STOPWORDS` 와 `extractDynamicSeeds()` 추가(808~842행)
   - `fetchHackerNews`·`fetchGitHub`·`fetchBluesky`·`fetchX` 에 `dynamicSeeds` 인자 추가(339·394·652·707행)
   - `main()` 을 2단계 수집으로 재구성(864~890행 부근)
   - `collect_news.test.js` 에 59줄 추가
3. **시드는 실제로 엉터리다.** 재현 결과는 다음과 같다.
   - 11-01 수집본(`.tmp/news_candidates.json`, 피드 40건)의 시드는 OmniDiff·DeepSeek·SwaT 다. 단어 62개 중 53개가 한 번만 나왔다.
   - 07-29 수집본(`data/news_candidates.json`)의 시드는 DeltaNet·SlopCodeBench·SerpAPI 다.
   - 838행 `count >= 1` 은 아무것도 거르지 않는다.
   - 원본(new-term-radar `radar/sources.py`)의 규칙인 '서로 다른 출처 2곳 이상'을 걸면 두 날 모두 시드가 0개다.
4. **요약 생성 경로는 두 갈래이고, 둘 다 README 를 보지 않는다.**
   - `curate.js` 의 `main()`(1312~)은 `GEMINI_API_KEY` 가 있으면 `callGemini()`(867~)를 쓴다.
   - 키가 없으면 `CURATED_KNOWLEDGE`(32~)를 쓴다. 이 객체는 모듈을 읽을 때 `curated-knowledge-ext.js` 와 합쳐진다(841~847). 실제로 카피를 채우는 곳은 911행 이후다.
   - 항목 필드는 knowledge 에서 골라 담는다: title_ko, catchphrase, summary_ko, key_features, use_case, tags. 그래서 knowledge 에 `evidence` 를 더해도 latest.json 으로 새지 않는다. knowledge 가 없는 항목은 `extractSmartFeatures()` 가 key_features 를 만든다.
   - 프롬프트 28행에도 적혀 있다: "후보 데이터에 README 가 없으므로 대조할 원문이 없다."
5. **`validateLatest()`(1356~1371)는 두 가지만 본다.** title_ko 가 한글인지, 제네릭 폴백 문구가 아닌지다.
6. **이번 주 요약 어긋남은 35개 중 34개다.** 항목별 상세는 meta-be 원본 JSON 의 `screens[].drift.details_ko` 에 있다. 대표 사례:
   - tstack: 실제로는 PR 흐름 스킬인데 '타입스크립트 리팩토링'으로 소개했다.
   - replica-skill: README 가 하지 말라고 한 'JS 번들·네트워크 역공학'을 기능으로 소개했다.
   - gemini-cli: '개인 사용자는 Antigravity CLI 로 이전'이라는 공지를 빠뜨렸다.
7. **`scripts/plugins/scan-install-entry.js` 의 구조**
   - 입력 `IN` 은 `.tmp/candidates.json` 이고 결과는 `.tmp/install-scan.json` 이다(15~16).
   - `ENTRY_PATHS`(20~35)는 고정 파일명 15개다.
   - `fetchText()`(117~128)는 `raw.githubusercontent.com/<id>/HEAD/<path>` 로 읽고, 최대 200,000바이트까지 본다.
   - `derivedPaths()`(135~)는 package.json 의 main·bin 만 따라간다.
   - `scanContent()`(80~115)의 규칙은 5개다: hardcoded_public_ip, remote_fetch_exec, opaque_decode_exec, file_read_exec, install_script_network.
   - 규칙에 걸린 후보는 `main()`(184~209)에서 빠진다.
   - 테스트는 `scripts/plugins/scan-install-entry.test.js` 에 있다.
8. **못 보는 경로**는 `.claude-plugin/plugin.json`, `hooks/hooks.json` 과 그 command 가 가리키는 스크립트, `.mcp.json`, `SKILL.md` 와 SKILL.md 가 실행시키는 스크립트다. 이번 주 35개 중 이런 진입점이 있는 저장소가 33개다(플러그인 매니페스트 17, SKILL.md 30, 훅 파일 15, .mcp.json 4).
9. **버전을 고정하지 않은 실행의 실례**는 openfilm 이다. 스킬 본문이 `npx -y openfilm@latest` 를 실행하고 그 출력을 따르게 한다. 반대로 new-term-radar 는 `uvx new-term-radar==0.6.1` 로 고정한 정상 예다.
10. **테스트 실행 방식:** 저장소에 `test` 스크립트가 없다. 각 `*.test.js` 를 `node <파일>` 로 직접 돌린다.
11. **원본 규칙**은 new-term-radar `radar/sources.py`(커밋 3cf6515, MIT, Copyright (c) 2026 Yansen Zhu)에 있다.
    - `novel_names()`(43~82행, 핵심은 65행): 이름이 어휘장(vocabulary)에 없어야 하고, 서로 다른 계정 2곳 이상이 말했어야 남는다. 단 계정 1곳이어도 확실한 이름이고 좋아요 100 이상이면 남긴다. 게시물 1건에서는 이름을 최대 3개만 뽑는다.
    - 어휘장(`x_new()` 99~108행, `VOCAB_DAYS = 60` 은 24행): 가져온 모든 글의 모든 이름을 오늘 날짜로 적고, 60일 넘은 이름은 지운다. 가져오기가 실패하면 어휘장을 그대로 둔다.
    - Hugging Face 신호(113~179행, `HF_TOP, HF_FETCH = 50, 100` 은 27행): `https://huggingface.co/api/models` 와 `/api/spaces` 를 `?sort=trendingScore&direction=-1&limit=100` 으로 한 번씩 부른다. 직전 실행의 상위 100 목록과 비교해 상위 50에 새로 들어온 것만 고른다. 첫 실행은 목록만 저장하고 결과를 내지 않는다.
    - 이름 정리: 모델 id 에서 `_HF_NOISE`(gguf·awq·fp8·instruct·27b 같은 꼬리)를 최대 4번 떼고 소문자로 만든다(`base_name`). 스페이스는 demo·webgpu·studio 같은 단어(`SPACE_NOISE`)도 뗀다. 예: `abenzerps/Qwen-Image-2.1-Uncensored-GGUF` → `qwen image 2.1`
12. **뉴스 아카이브**는 `site/public/data/archive/news_YYYY-MM-DD.json` 51개(07-13~11-01)다. 각 파일의 `news[]` 항목에 headline, title_ko, summary_ko, body_ko, tags 가 있다.
13. **매체 목록은 건드리지 않는다.** 수집 매체는 `REQUIRED_SOURCES`(collect_news.js 288~291)와 `SOURCE_NAMES`(curate_news.js 56~65)에 8종으로 고정돼 있다. 여기 없는 값은 수집 단계에서 버려지고, 화면도 매체별 아이콘 분기를 쓴다. 그래서 Hugging Face 신호는 새 매체로 넣지 않고 시드로만 쓴다.

---

## 2. 작업 범위

**한다**
- A·D: `scripts/news/collect_news.js`(`extractDynamicSeeds` 와 `main()` 의 시드 단계, 새 함수 추가), `scripts/news/collect_news.test.js`
- B:
  - `scripts/plugins/fetch-readmes.js` (신규)
  - `scripts/plugins/curate.js` (`validateLatest` 와 정규화 함수만)
  - `scripts/plugins/curate.test.js`
  - `.agents/skills/cc-weekly/SKILL.md` (Step 2 절차 두 줄)
- C:
  - `scripts/plugins/scan-install-entry.js`
  - `scripts/plugins/scan-install-entry.test.js`

**하지 않는다**
- 이번 주 `site/public/data/**`·`data/archive/**`·뉴스 데이터 수정
- knowledge 35개 일괄 재작성. 다음 주 파이프라인에서 evidence 와 함께 한다
- `callGemini()` 경로 변경. 키가 없어 지금 쓰이지 않고, 그 경로로 만든 항목도 B 의 `--validate` 게이트에 걸린다
- 새 뉴스 매체(소스) 추가. `REQUIRED_SOURCES`·`SOURCE_NAMES`·화면 아이콘은 그대로 둔다
- 원본의 '계정 1곳 + 좋아요 100' 예외. RSS 피드에는 좋아요 수가 없다
- 사이트 화면 변경(경고 배지 등), `install*` 파일명 glob 추가, 새 npm 패키지, GEMINI_API_KEY 등록

---

## 3. 작업 항목 (이 순서로, 그룹마다 커밋 1개)

브랜치는 `fix/plugin-review-2026-11-02` 다.

### A. 신조어 시드 고치기

1. **어휘장 파일** `.tmp/news/term_vocab.json` (`{ "이름(소문자)": "YYYY-MM-DD" }`)
   - 파일이 없으면 뉴스 아카이브(1절 12번)에서 최근 60일 파일만 읽어 시작 어휘장을 만든다. 읽을 필드는 headline, title_ko, summary_ko, body_ko, tags 이고, 이름 추출 정규식은 지금 `extractDynamicSeeds` 의 것을 그대로 쓴다.
   - 매 실행 끝에 그날 후보 전체(시드가 된 것만이 아니다)의 모든 이름을 오늘 날짜로 적고, 60일 넘은 이름을 지우고 저장한다. 후보가 0건이면 저장하지 않는다.
2. **`extractDynamicSeeds(feedCandidates, maxSeeds = 3, vocab = {})` 규칙**
   - 후보 1건 안에서 같은 이름은 한 번만 센다(이름 목록을 `Set` 으로).
   - 이름마다 나온 출처(`c.source`)를 모은다. **서로 다른 출처 2곳 이상**인 이름만 남긴다.
   - 어휘장에 있는 이름(소문자 비교)은 뺀다.
   - 기존 `RADAR_STOPWORDS`·길이 조건은 그대로 둔다.
   - 출처 수 → 등장 후보 수 순으로 정렬해 `maxSeeds` 개를 고른다. 남는 것이 없으면 빈 배열이다(지금 피드 양에서는 자주 빈 배열이 나오는 게 정상이다).
3. `main()` 은 지금처럼 1차 후보로 시드를 뽑고, 2차 수집(HN·GitHub·Bluesky·X)에 넘긴다. 연결은 바꾸지 않는다.
4. 주석 한 줄: "rules adapted from zhuyansen/new-term-radar radar/sources.py (MIT)".
5. **테스트**(`collect_news.test.js` 에서 기존 시드 테스트를 새 규칙에 맞게 고친다)
   - 기사 1건 안에서만 3번 반복된 이름(지금 픽스처의 SwaT 같은 경우) → 시드 아님
   - 서로 다른 출처 2곳(예: geeknews·reddit)에 나온 이름 → 시드
   - 그 이름이 어휘장에 있으면 → 시드 아님
   - 시작 어휘장 만들기: 아카이브 픽스처 1개에서 이름을 읽어 오는지

### B. 요약 원문 대조

1. **`scripts/plugins/fetch-readmes.js` (신규, 표준 모듈만)**
   - 읽을 id 목록은 `.tmp/candidates.json` 의 `candidates[].id` 와 `site/public/data/latest.json` 의 rising·classic id 를 합친 것이다. 없는 파일은 건너뛴다.
   - id 마다 `GET https://api.github.com/repos/<id>/readme` 를 한 번 부른다. 헤더는 `Accept: application/vnd.github.raw` 이고, `GH_TOKEN` 이 있으면 `Authorization: Bearer` 를 붙인다. 순차로 부른다.
   - 받은 본문은 `.tmp/readme/<owner>__<name>.md` 로 저장한다. 실패한 id 는 파일을 만들지 않고 목록으로 출력한다.
   - **README 는 반드시 이 스크립트가 받는다.** 모델이 만든 원문 파일로 대조하면 의미가 없다.
2. **knowledge 형식.** `curated-knowledge-ext.js`(와 `CURATED_KNOWLEDGE`)의 항목에 `evidence: ["…", "…", "…"]` 를 둔다.
   - key_features 와 같은 순서·같은 개수로 둔다.
   - 각 값은 README 의 영어 원문을 그대로 옮긴 3단어 이상의 구절이다.
   - 이번 작업에서 기존 항목에는 채우지 않는다. 형식 설명 주석 한 줄만 파일 머리에 둔다.
3. **`curate.js` 에 정규화·대조 함수 추가.** 아래 규칙은 NousResearch/hermes-agent `skills/research/grounded-citations/scripts/sources.py` 243~272행(커밋 557254faa24e, MIT)을 옮긴 것이다. 주석에 이 출처를 한 줄 남긴다.
   - `normalizeForQuote(s)`: HTML 태그 제거 → 마크다운 링크 `[글자](주소)` 는 글자만 남김 → `*`·`_`·`~`·백틱·역슬래시 이스케이프 제거 → 공백 접기 → 소문자
   - `quoteInReadme(quote, readme)`: 단어 3개 미만이면 false, 그 외에는 `normalizeForQuote(readme).includes(normalizeForQuote(quote))`
4. **`validateLatest()` 확장.** latest.json 의 각 항목에 대해 다음을 검사한다.
   - knowledge 가 없거나 `evidence` 가 없으면 → `"<id>: evidence 없음"`
   - `evidence.length !== key_features.length` 이면 → `"<id>: evidence 개수 불일치"`
   - `.tmp/readme/<owner>__<name>.md` 가 없으면 → `"<id>: README 캐시 없음 (fetch-readmes.js 먼저)"`
   - 인용이 README 에 없으면 → `"<id>: key_features[i] 인용이 README 에 없음"`
   - 기존 두 검사는 그대로 둔다. 실패가 있으면 지금처럼 exit 1 로 끝낸다.
5. **`.agents/skills/cc-weekly/SKILL.md` Step 2 수정**
   - 2번(설치 진입점 보안 스캔) 뒤에 한 줄을 넣는다: `GH_TOKEN=... node scripts/plugins/fetch-readmes.js` (README 원문 캐시).
   - 3번(큐레이션) 설명에 한 줄을 넣는다: "knowledge 항목을 새로 쓰거나 고칠 때는 `.tmp/readme` 원문에서 key_features 마다 영어 인용을 `evidence` 로 붙인다. 요약은 그 인용이 말하는 범위를 넘지 않는다."
6. **테스트**(`curate.test.js` 에 추가)
   - 정규화 4건: 마크다운 링크, 강조 기호, 공백·대소문자, 3단어 미만 거부
   - 대조 2건: README 에 있는 구절이면 true, 그 구절에서 한 단어를 바꾸면 false

### C. 설치 검사 보강

1. **입력 경로 덮어쓰기.** `IN` 을 `process.env.SCAN_IN || <기존 경로>` 로 바꾼다. 측정 때 실제 후보 파일을 건드리지 않기 위해서다.
2. **트리 조회.** 후보마다 `GET https://api.github.com/repos/<id>/git/trees/HEAD?recursive=1` 를 한 번 부른다. `GH_TOKEN` 이 있으면 붙인다. `truncated` 면 보고서 경고에 남긴다.
3. **추가로 읽을 파일**(트리에서 고른다)
   - `.claude-plugin/plugin.json`, `hooks/hooks.json`, `.mcp.json` (어느 깊이든)
   - `SKILL.md` (저장소당 최대 40개)
   - 위 파일이 가리키는 스크립트
     - hooks.json·plugin.json 의 command 에 든 `${CLAUDE_PLUGIN_ROOT}/<경로>` 와 상대 경로
     - plugin.json·.mcp.json `mcpServers` 의 command·args 에 든 저장소 안 경로
     - SKILL.md 코드 블록의 `(node|python3?|bash|sh|bun|uv run)\s+<저장소 안 상대경로>`
   - 저장소당 추가로 읽는 파일은 최대 60개다. 상한에 걸리면 경고에 남긴다.
4. **기존 `scanContent()` 규칙을 위 파일에도 그대로 적용한다.** 걸리면 지금처럼 컷한다. 단 `.json` 은 지금처럼 매니페스트로 본다(IP 검사 제외).
5. **새 컷 규칙 `hook_remote_exec`**: hooks.json·plugin.json 의 command 문자열에 원격 코드를 셸로 바로 넘기는 패턴(`curl … | (ba)?sh`, `wget … | sh`, `iwr … | iex`)이 있으면 컷한다.
6. **새 경고 `unpinned_exec`(컷하지 않음)**: SKILL.md·hooks.json·plugin.json·.mcp.json 에서 아래 패턴을 찾는다.
   - `npx (-y )?<패키지>@latest`
   - 버전이 없는 `npx -y <패키지>`
   - `==` 가 없는 `uvx <패키지>`
   - `==` 가 없는 `pip install <패키지>`

   찾은 것은 `data.install_scan.warnings`(`{id, path, rule, why}` 배열)와 REPORT 에 기록하고 콘솔에도 출력한다.
7. **`no_entry_file` 판정**은 새로 읽은 파일까지 포함해서 한다.
8. **테스트**(`scan-install-entry.test.js` 에 추가). 픽스처 세 개를 문자열로 넣는다.
   - (a) hooks.json command 에 `curl -fsSL https://x/y.sh | bash` → `hook_remote_exec`
   - (b) SKILL.md 에 `npx -y foo@latest` → `unpinned_exec` 경고만, 컷하지 않음
   - (c) SKILL.md 에 `uvx foo==1.2.3` → 경고 없음

### D. Hugging Face 트렌딩 신규 진입을 시드로

1. **새 함수 `fetchHfTrendingNewNames(vocab)`** (collect_news.js, 기존 `getJson` 사용)
   - models·spaces 트렌딩을 1절 11번 주소로 한 번씩 부른다(각 100개).
   - 직전 목록은 `.tmp/news/hf_trending_top.json`(`{ "models": [id…], "spaces": [id…] }`)에 둔다. 파일이나 해당 목록이 없으면 첫 실행이다. 목록만 저장하고 빈 배열을 돌려준다.
   - 상위 50 가운데 직전 목록에 없던 id 만 고른다. id 를 `baseName()` 으로 정리하고, 스페이스는 `SPACE_NOISE` 단어도 뗀다. 빈 이름, `RADAR_STOPWORDS`, 어휘장(A)에 있는 이름은 뺀다.
   - 순위 순으로 이름을 중복 없이 모은다. 이번 목록은 호출이 성공했을 때만 저장한다. 호출이 실패하면 경고 한 줄만 남기고 직전 목록을 그대로 둔다.
2. **`baseName(id)` 와 `SPACE_NOISE`**: 원본 `base_name`·`_HF_NOISE`·`SPACE_NOISE`(113~126행)를 정규식 그대로 옮긴다. 주석에 MIT 출처를 한 줄 남긴다.
3. **`main()` 연결**
   - 시드 = A 규칙 시드 뒤에 Hugging Face 이름을 붙인다. 대소문자 무시로 중복을 지우고, 합계 3개까지만 쓴다.
   - 로그 한 줄에 시드마다 근거를 적는다. 예: `[radar] 시드: foo(출처 2곳), qwen image 2.1(HF 모델 7위)`
   - 어휘장 갱신(A-1)은 Hugging Face 이름도 함께 넣는다. 다음 날 같은 이름이 다시 시드가 되지 않게 하기 위해서다.
4. **테스트**(`collect_news.test.js`, 네트워크 없이 픽스처로)
   - `baseName('abenzerps/Qwen-Image-2.1-Uncensored-GGUF') === 'qwen image 2.1'`
   - 스페이스 `'x/lightonocr-3-demo'` → `'lightonocr 3'`
   - 직전 상위 100 과 새 목록 픽스처 → 상위 50 신규 진입만 나오는지
   - 첫 실행(직전 목록 없음) → 빈 배열, 목록은 저장
   - 어휘장에 있는 이름 → 빠지는지

---

## 4. 하지 말 것

- `git add -A`·`git add .` 를 쓰지 않는다. 바꾼 파일만 경로를 적어 add 한다. Antigravity 터미널의 git 은 `~/.gitignore_global` 을 읽지 않는다.
- `git push`, 배포, `main` 직접 커밋을 하지 않는다.
- `site/public/data/**`·`data/**` 를 수정하지 않는다. 측정용 임시 파일은 `.tmp/handoff-plugin-review/` 에만 둔다.
- 후보 저장소의 코드를 실행·설치·import 하지 않는다. 텍스트로 읽기만 한다.
- `collect.js`·`collect_news.js` 와 `curate.js` 본 실행을 하지 않는다. 원장과 게시 데이터가 바뀐다.
- 보고서에 "확인했다"고 쓰려면 측정값이 있어야 한다. 코드를 읽고 추론한 것은 "추정"이라고 쓴다.

## 5. 허용된 실행

- `node scripts/news/collect_news.test.js`, `node scripts/plugins/curate.test.js`, `node scripts/plugins/scan-install-entry.test.js`
- `GH_TOKEN=... node scripts/plugins/fetch-readmes.js`
- `node scripts/plugins/curate.js --validate`
- `SCAN_IN=.tmp/handoff-plugin-review/candidates.json GH_TOKEN=... node scripts/plugins/scan-install-entry.js`
- `node -e` 로 `collect_news.js` 가 내보낸 함수만 불러 측정한다. 시드 규칙은 저장된 후보 파일 2개(`.tmp/news_candidates.json`, `data/news_candidates.json`)로, Hugging Face 신호는 실제 공개 API 를 1~2회 부른다. `collect_news.js` 본 실행은 하지 않는다.
- `gh api` 읽기 전용, `git diff/status/add <경로>/commit`, `shasum`

---

## 6. 검증 — 측정하고 값을 보고서에 그대로 적는다

각 항목을 **기대값 / 측정값 / 통과 여부** 세 칸으로 적는다.

**A**
- `node scripts/news/collect_news.test.js`: 기대값 통과
- 저장된 후보 파일 2개에 새 규칙을 돌린 시드(시작 어휘장은 아카이브로 만든다). 기대값: 두 날 모두 0개 또는 출처 2곳 이상인 이름만. 지금 시드(OmniDiff·DeepSeek·SwaT / DeltaNet·SlopCodeBench·SerpAPI)는 나오지 않아야 한다
- 시작 어휘장의 이름 수와 날짜 범위

**D**
- 테스트 5건 통과
- 실제 API 1회: models·spaces 를 각각 몇 개 받았는지, `.tmp/news/hf_trending_top.json` 생성 여부. 첫 실행이니 기대값은 시드 0개다
- 바로 한 번 더 호출: 신규 진입 수와 이름(목록이 거의 같으니 0~몇 개)

**B**
1. `fetch-readmes.js` 로 이번 주 35개 id 중 README 를 받은 수. 받지 못한 id 목록도 적는다.
2. `node scripts/plugins/curate.js --validate` 의 실패 건수와 대표 메시지 5개. 기대값: evidence 없음 35건. 기존 knowledge 에 evidence 가 없어서다.
3. `curate.test.js` 정규화 4건과 대조 2건 통과
4. latest.json 에 `evidence` 문자열 0건(`grep -c '"evidence"' site/public/data/latest.json`)

**C**
1. 픽스처 (a)(b)(c) 가 기대대로 나오는지
2. 이번 주 35개 실측: latest.json 의 id 로 `.tmp/handoff-plugin-review/candidates.json` 을 만들어(`{candidates:[{id,stars}]}`) 돌린다. 적을 것: 컷 건수와 사유, 경고 목록, 새로 읽은 파일 수, 트리 truncated 건수. 기대값: openfilm/openfilm 에 `unpinned_exec` 경고. 컷이 나오면 해당 파일과 줄을 그대로 적는다(오탐인지 판단하지 말고 적기만 한다).

**공통**
- `git status --porcelain` 에 의도한 파일만 있어야 한다.
- `shasum -a 256 site/public/data/latest.json site/public/data/archive/*.json | shasum -a 256` 값이 작업 전후로 같아야 한다.

## 7. 보고서

`docs/review-plugin-review-2026-11-02-gemini.md` 로 저장한다. 구조는 다음과 같다.

1. 요약 5줄
2. 그룹 A·B·C·D 별 변경 파일, 줄 범위, 커밋 해시
3. 6절 검증 결과 표(기대/측정/통과)
4. 지시와 다르게 한 것과 이유(없으면 "없음")
5. 못 한 것, 추정으로 남은 것
6. 사용자 할 일
   - 브랜치를 검토한 뒤 머지·푸시한다.
   - **다음 주 파이프라인부터는 게시 항목마다 evidence 가 있어야 `--validate` 를 통과한다.** 첫 주는 classic 을 포함해 게시 항목 전부를 채워야 한다.

## 8. 완료 기준 (검수 때 이 순서로 확인)

1. `fix/plugin-review-2026-11-02` 브랜치에 커밋 4개(A·B·C·D)가 있고, 각 커밋의 파일이 2절 범위 안에 있다.
2. A: 뉴스 테스트 통과, 저장된 후보 2개에서 지금의 엉터리 시드가 사라짐, 어휘장 파일 생성
2-1. D: 테스트 5건 통과, `.tmp/news/hf_trending_top.json` 생성, 매체 목록(`REQUIRED_SOURCES`·`SOURCE_NAMES`) 무변경
3. B: `--validate` 가 evidence 없는 항목을 실패시킨다(현재 35건). 정규화·대조 테스트를 통과한다. latest.json 에 evidence 가 없다.
4. C: 픽스처 3개가 기대대로 나오고, 35개 실측에서 openfilm 경고가 나온다.
5. 데이터 해시가 바뀌지 않았다. `git status` 에 의도한 파일만 있다.
