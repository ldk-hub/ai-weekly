# 작업지시서 — cc-weekly 스킬 점검 (테스트)

수행 주체: Gemini (Antigravity, ai-weekly 저장소를 연 상태)
설계·검수: Claude Code 세션
작성일: 2026-10-12
성격: **읽기 전용 점검.** 결과물은 보고서 파일 1개뿐이다. 코드·문서 수정, 커밋, 배포는 하지 않는다.

---

## 0. 배경

ai-weekly 는 Claude Code 생태계 주간 트렌드와 데일리 AI 뉴스를 모아 정적 사이트(ldk-hub.github.io/ai-weekly)로 배포하는 저장소다. `cc-weekly` 스킬은 주간 통합 파이프라인으로, 아래 4단계를 차례로 돈다.

| 단계 | 하위 스킬 | 핵심 실행 |
|---|---|---|
| 1 | cc-star (스타보드) | `node scripts/stars/collect-stars.js` |
| 2 | cc-news (데일리 뉴스) | `scripts/news/collect_news.js` → `curate_news.js` → RSS·라운지 |
| 3 | cc-trends (주간 트렌드) | github-scout·community-scout → trend-analyzer → content-curator → site-builder |
| 4 | 옵시디언 동기화 | `npm run sync:obsidian` |

### 실행 경로가 두 개다 (점검 시 반드시 구분)

- **자동(CI):** `.github/workflows/weekly-trends.yml`(매주 월 09:00 KST)은 `scripts/plugins/collect.js` → `scan-install-entry.js` → `curate.js` → RSS·아카이브·OG → 빌드만 돈다. `stars.yml`(매일)은 `collect-stars.js` 만 돈다.
- **수동(스킬):** cc-weekly·cc-trends·cc-news 스킬과 `.claude/agents/*.md` 에이전트. 에이전트 문서를 고쳐도 CI 자동 실행에는 영향이 없다.

### 2026-10-12 변경 — 이번 점검의 주된 이유 (커밋 전, 작업 트리에 있음)

1. **last30days 스킬 제거.** `.agents/skills/last30days/` 195파일과 `data/last30days_tmp/` 1파일을 `git rm` 했다(스테이징만 됨).
2. **X·Reddit 을 Agent-Reach 업스트림 CLI 로 연결.** 실제 수집은 twitter-cli·rdt-cli 가 한다. 공용 진입점은 `scripts/core/agent_reach.js`(신규), Reddit 쿠키 등록은 `scripts/core/rdt-login.sh`(신규)다.
3. **cc-news:** `collect_news.js` 의 `fetchSocial`(last30days 경유)을 지우고 `fetchX` 를 넣었다. 지정 매체가 7개에서 8개(X 추가)로 늘었다. `curate_news.js`·`curate_custom.js` 의 `SOURCE_NAMES` 에 `x` 를 추가했다.
4. **cc-weekly(community-scout·community-scan):** X 는 agent_reach.js 로 검색하고, 실패하면 Google `site:x.com` 으로 폴백한다. Reddit 은 agent_reach.js(rdt)로 검색하고, 실패하면 arctic-shift·RSS 로 폴백한다.

변경 파일은 `git status --short` 와 `git diff` 로 직접 확인한다.

---

## 1. 검증된 사실 — 이 전제로 점검하라

작업 전에 확인을 마친 것들이다. 다시 확인하거나 문제로 지적할 필요가 없다.

1. **브라우저 쿠키 자동 추출 차단은 의도된 설계다.** twitter-cli·rdt-cli 는 쿠키가 없거나 만료되면 브라우저(본계정) 쿠키를 자동으로 꺼낸다. 이를 막으려고 세 가지를 했다. (a) 두 도구의 설치 환경에서 `browser-cookie3` 를 지웠다. (b) `agent_reach.js` 는 PATH 를 `/usr/bin:/bin:/usr/sbin:/sbin` 로 좁혀(uv 제외) 실행한다. (c) `rdt-login.sh` 는 `credential.json` 의 `saved_at` 을 2100년으로 기록해 7일 재추출을 끈다. 쿠키가 없는 상태에서 두 CLI 가 키체인 팝업 없이 실패로 끝나는 것도 실측했다. **"twitter·rdt 를 직접 부르라"는 제안은 하지 말 것.**
2. **쿠키는 아직 미등록일 수 있다.** 그 경우 `agent_reach.js` 는 `X 쿠키 없음 — …` 또는 `Reddit 쿠키 없음 — …` 으로 바로 실패한다. `collect_news.js` 는 X 를 건너뛰고 `[MISSING] X` 를 보고한다(2026-10-12 실측). 이것은 정상 동작이다.
3. `curate_news.js` 의 `selectBalanced()` 매체 쿼터(`MAX_PER_SOURCE`=5)는 source 이름과 무관하게 동작한다. 그래서 `x` 에도 자동 적용된다.
4. 프론트(`site/src/main.js`)에는 `x` 라벨과 X 아이콘 분기가 이미 있다.
5. cc-news 의 Reddit 은 기존 RSS(`top/.rss`) 수집을 그대로 쓴다. rdt 는 cc-weekly 검색에만 쓴다. 의도된 선택이다.

---

## 2. 점검 범위 — 읽을 파일

- **스킬:** `.agents/skills/cc-weekly/SKILL.md`(`.claude/skills/cc-weekly/SKILL.md` 는 별도 사본), `.agents/skills/cc-news/SKILL.md`(`.claude/skills/cc-news/skill.md` 는 심볼릭 링크), `.agents/skills/cc-daily/SKILL.md`, `.agents/skills/cc-star/`, `.claude/skills/{cc-trends,community-scan,github-scan,trend-scoring,trend-site-build}/skill.md`
- **에이전트:** `.claude/agents/{github-scout,community-scout,trend-analyzer,content-curator,site-builder,news-scout,news-analyzer,news-curator}.md`
- **스크립트:** `scripts/core/agent_reach.js`, `scripts/core/rdt-login.sh`, `scripts/news/{collect_news,curate_news,curate_custom}.js`, `scripts/plugins/{collect,scan-install-entry,curate,publish-curated}.js`, `scripts/stars/{collect-stars,build-stars-ledger}.js`, `scripts/obsidian_export.js`, `package.json`
- **CI:** `.github/workflows/{weekly-trends,stars,deploy-pages}.yml`

---

## 3. 점검 항목 (A부터 순서대로)

**A. 실행 경로 정합성** — 문서에 적힌 것이 실제로 존재하는가
- 스킬·에이전트 문서의 `node scripts/...` 경로, npm 스크립트 이름, CLI 플래그(`--validate`·`--selfcheck` 등)가 실제 파일·코드와 맞는지
- 스킬이 부르는 하위 스킬·에이전트 이름이 실제 파일과 맞는지
- `.agents` 와 `.claude` 의 같은 이름 스킬 사본끼리 내용이 다른지

**B. 10-12 변경 정합성**
- `agent_reach.js` 의 사용법(서브커맨드 `x`·`reddit`, 플래그)과 community-scout·community-scan 문서의 명령 예시가 일치하는지
- `collect_news.js` 의 `REQUIRED_SOURCES`·`SOURCE_CAPS`·`SOURCE_RANK`·`labels`·`Promise.all` 가 서로 맞는지
- last30days 잔재(호출 코드·설정·문서 지시)가 남았는지. 연혁을 적은 주석·문장은 제외한다
- 폴백 경로와 rate limit 규칙(X 4초·Reddit 2초 간격, 429 시 즉시 중단)이 문서끼리 모순되지 않는지

**C. 문서 드리프트** — 현재 코드와 어긋난 서술
- 매체 수, "수집 불가"라고 적힌 소스, 이미 없어진 소스·경로
- 사이트 UI 문구(`site/src/main.js`)도 포함한다

**D. 보안**
- 어떤 문서·스크립트도 `twitter`·`rdt` 를 직접 호출하라고 지시하지 않는지(agent_reach.js 경유만 허용)
- 쿠키·토큰이 로그·화면 출력·명령 인자로 새는 경로가 없는지(`agent_reach.js`, `rdt-login.sh`)
- 글쓰기·좋아요·댓글·투표 같은 쓰기 명령을 쓰라는 지시가 없는지
- CI 설치 진입점 검사 `scan-install-entry.js` 가 알려진 우회 수법을 잡는지. 배경: 2026-09-02 에 `install-skill.sh` 가 같은 폴더의 YAML 을 읽어 `exec` 하는 스틸러가 이 검사를 통과했다. 원인은 두 가지였다. 파일명 정확 매칭 목록에 없어 파일을 읽지도 못했고, 네트워크 없이 로컬 파일을 exec 하는 경우는 규칙에 없었다. 현재 코드가 이 두 경우를 잡는지 확인한다

**E. 산출물 스키마**
- `_workspace/01~04_*.json` 의 필드명, 특히 `sources` 값(`reddit`·`x` 등)이 community-scout → trend-analyzer → content-curator → site-builder 사이에서 같은 이름으로 쓰이는지

**F. 실패 모드**
- 소스 0건, 쿠키 만료, rate limit 때 "조용한 누락" 없이 보고되는지(`[MISSING]`, `02c_coverage_report.json` 의 `failures`)

---

## 4. 하지 말 것

- **보고서 1개 외에는 파일을 만들거나 고치지 않는다.** 수정이 필요하면 보고서에 제안으로만 적는다.
- **git 상태를 바꾸지 않는다.** commit·push·stash·reset·checkout·restore·clean 모두 금지다. 작업 트리에 커밋 전 변경과 스테이징된 삭제가 있어, 날리면 복구할 수 없다.
- **자격증명 파일을 열거나 출력하지 않는다:** `~/.agent-reach/config.yaml`, `~/.config/rdt-cli/credential.json`, `.env`, `~/.config/github/*`
- **`twitter`·`rdt` 를 직접 실행하지 않는다.** `rdt login` 은 절대 금지다(본계정 쿠키를 추출한다). `agent-reach configure`, `uv tool` 명령도 쓰지 않는다.
- **파이프라인 본실행 금지:** `collect_news.js`, `curate_news.js`(본실행은 GEMINI_API_KEY 과금과 데이터 갱신), `scripts/plugins/collect.js`·`curate.js`, community-scout 의 Phase A/B 루프, `npm run build`·배포, `npm run sync:obsidian`(옵시디언 볼트에 쓴다)
- 외부 네트워크를 반복·대량으로 호출하지 않는다.

---

## 5. 허용된 실행 (선택 — 정적 점검이 우선)

```bash
git status --short
git diff --stat
git diff --cached --stat
node --check scripts/core/agent_reach.js
node --check scripts/news/collect_news.js
node --check scripts/news/curate_news.js
bash -n scripts/core/rdt-login.sh
node scripts/plugins/scan-install-entry.test.js
node scripts/plugins/publish-floor.test.js
node scripts/plugins/curate.test.js
node scripts/stars/build-stars-ledger.test.js
node scripts/news/curate_news.js --selfcheck   # 오프라인 자체 점검, API 키 불필요
node scripts/core/agent_reach.js               # 사용법만 출력
node scripts/core/agent_reach.js x "claude code" -n 3        # 최대 1회. 쿠키 미등록이면 '쿠키 없음' 이 정상
node scripts/core/agent_reach.js reddit "claude code" -n 3   # 최대 1회. 위와 같음
```

실패한 명령은 숨기지 말고 종료코드와 핵심 출력을 보고서에 그대로 적는다.

---

## 6. 보고서

**파일:** `docs/review-cc-weekly-2026-10-12-gemini.md` (이 파일 하나만 새로 만든다)

**순서:**
1. 결론 한 줄
2. 수정 필요 목록 — 표: 심각도(High/Med/Low) · 파일:줄 · 문제 · 근거(해당 줄 인용) · 제안(바꿀 문장이나 diff)
3. 점검 항목 A~F 별 상태 — 통과 / 문제 / 확인 불가, 각각 근거 한 줄
4. 실행한 명령과 결과 — 명령, 종료코드, 핵심 출력 1~3줄
5. 확인하지 못한 것

**작성 규칙:**
- 파일에서 직접 확인한 사실만 쓴다. 모든 지적에 `파일:줄` 을 단다.
- 추측은 문장 앞에 `[추정]` 을 붙인다. 파일에 없는 기능·수치·이력을 만들어 쓰지 않는다.
- 1절 "검증된 사실"은 다시 지적하지 않는다.
- 한국어로, 쉬운 말로 쓴다. 내부 약어는 처음 나올 때 풀어 쓴다.

---

## 7. 완료 기준 (검수 시 이 순서로 확인)

1. A~F 전부에 상태가 적혀 있다.
2. 모든 High 지적에 근거 인용과 제안이 있다.
3. `git status --short` 를 보면 이 작업으로 늘어난 파일이 보고서 1개뿐이다.
