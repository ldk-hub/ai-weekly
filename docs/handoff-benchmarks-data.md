# 작업지시서 — 「점유율·성능」 데이터를 오늘 기준 최신 모델로 다시 모으기 (1단계)

수행 주체: Gemini (Antigravity, ai-weekly 저장소를 연 상태)
설계·검수: Claude Code 세션
작성일: 2026-10-22 (같은 날 2차 개정: 1차 결과 검수 반영 — Arena Coding 추가, 선택 규칙 검문 v2)
성격: **데이터 수집 작업.** 결과물은 데이터 파일 1개, 원본(evidence) 파일들, 보고서 1개다. 화면 코드는 고치지 않는다(2단계 `docs/handoff-benchmarks-ux.md` 에서 한다). 커밋과 배포는 하지 않는다.

> **가장 중요한 규칙: 모든 숫자는 이번 작업 중에 실제로 받아 둔 원본 파일에 그대로 있어야 한다.** 기억하는 값, 추정한 값, 다른 글이 요약한 값은 쓰지 않는다. 검문 스크립트가 원본 파일에서 이름과 값을 직접 찾는다. 못 찾으면 통과하지 못한다.
>
> **모델은 검문이 정한다.** 검문 스크립트가 Arena 원본을 순위표로 읽어서 "규칙상 들어가야 할 회사" 목록을 출력한다. 데이터의 모델 구성은 그 목록과 같아야 통과한다.
>
> **대안 비교는 생략한다.** 수집 방법은 이 문서에 확정돼 있다. `.agents/AGENTS.md` §1(대안 2~3개 비교)은 적용하지 않는다.

---

## 0. 배경

- 처음 데이터는 2025년 초 모델(Claude 3.7 Sonnet, Gemini 2.5, o1, Grok 3 등)이었고 점유율에도 출처가 없었다.
- **오늘은 2026-10-22 다.** 작업을 시작하면 먼저 `date` 를 실행해 확인한다. 2025년 기억으로 "최신"을 판단하지 않는다.

**1차 결과 검수에서 나온 정정 사항** (Claude 가 원본과 실제 Arena 페이지로 확인)

| # | 1차 결과 | 사실 | 바르게 |
|---|---|---|---|
| 1 | Xiaomi 를 "OpenRouter 에 없음"이라며 뺐다 | 받아 둔 OpenRouter 원본에 `xiaomi/mimo-v2.6-pro` 가 있다. 가격도 Arena 표시($0.43/$0.87)와 같다. Arena 27위 | Xiaomi MiMo-V2.6-Pro 를 넣는다 |
| 2 | 112위 Mistral Large 4 를 넣었다 | 적격 회사 상위 10개 밖이다 | 뺀다 |
| 3 | xAI 로 Grok 4.7(91위, 1442)을 골랐다 | 같은 회사에 더 높은 Grok 4.5(52위, 1465)가 OpenRouter `x-ai/grok-4.5` 로 있다 | Grok 4.5 |
| 4 | Qwen3.8-Max 를 `qwen/qwen3.8-max-prime`($4/$12)에 연결했다 | Arena 표시 가격 $2/$6 은 `qwen/qwen3.8-max-0902` 와 같다 | `qwen3.8-max-0902` |
| 5 | 코딩 점수가 전부 null | 최신 모델은 회사 발표에 SWE-bench Verified 를 싣지 않는다(사실) | 코딩 지표를 **Arena Coding 카테고리 점수**로 바꾼다 |
| 6 | `statcounter-2026-08.*` 를 남겼다 | 내용이 9월 화면이다(기간 전환이 안 됨) | 지운다 |

**참고: 2026-10-22 OpenRouter 기준 회사별 최근 등록 모델** (정답이 아니다. 이것보다 오래된 세대가 나오면 검색이 잘못된 것이다)

| 회사 | 최근 등록 모델 (OpenRouter 등록일) |
|---|---|
| Anthropic | claude-haiku-5.5 (10-07), claude-sonnet-5.5 (09-28), claude-opus-5.5 (09-22) |
| OpenAI | gpt-6.1-sol, gpt-6.1-sol-pro (09-29), gpt-6-astra (09-04) |
| Google | gemini-4-argon (10-13) |
| xAI | grok-4.7 (09-21), grok-4.6 (08-12), grok-4.5 (07-08) |
| DeepSeek | deepseek-v4.1-flash-1017 (10-17), deepseek-v4.1-flash (09-10) |
| Alibaba Qwen | qwen3.8-max-prime (09-23), qwen3.8-max-0902 (09-03) |
| Xiaomi | mimo-v2.6-pro (09-21) |
| Moonshot | kimi-k3 (07-16) |
| Z.ai | glm-5.3-prime (09-23), glm-5.3 (08-18) |
| Meta | muse-wonder (10-12) |

---

## 1. 검증된 사실 — 이 전제로 작업하라

1. **Arena 는 curl 로 못 받는다.** `arena.ai`(옛 `lmarena.ai`)는 curl 요청에 403 을 준다. 브라우저로 열고, 화면 텍스트 전체와 스크린샷을 저장한다.
   - 순위표는 처음에 11행만 보인다. **"View all" 을 눌러 펼친 뒤** 화면 텍스트를 복사한다. 검문은 순위표를 50행 이상 읽어야 통과한다.
   - Overall 주소: `https://arena.ai/leaderboard/chat/text` (옛 주소 `/leaderboard/text` 는 여기로 이동한다)
   - **Coding 주소: `https://arena.ai/leaderboard/chat/text/coding`**. 형식은 Overall 과 같다(순위·모델·"회사 · 라이선스"·점수). 2026-10-21 기준 투표 1,911,000건, 모델 412개다.
2. **OpenRouter 는 curl 로 받는다.** `https://openrouter.ai/api/v1/models` 는 키 없이 받힌다. 쓰는 필드는 다음과 같다.
   - `id`: 모델 id
   - `created`: 등록 시각(유닉스 초)
   - `pricing.prompt`, `pricing.completion`: 토큰당 USD 문자열. × 1,000,000 하면 1M 토큰 가격이 된다
   - `context_length`: 컨텍스트 길이
   - `hugging_face_id`: 비어 있지 않으면 오픈 가중치 모델이다
3. **Statcounter 는 curl 로 받는다.** `https://gs.statcounter.com/ai-chatbot-market-share` 의 HTML 표에 최신 달(2026년 9월) 값이 있다. 지난달 화면은 기간을 바꿔도 받을 수 없었다. **전월 대비(`mom_change`·`prev_share_pct`)는 이번에도 `null` 로 둔다.**
4. **SWE-bench Verified 는 쓰지 않는다.** 최신 모델의 회사 발표에는 이 지표가 없다(SWE-bench Pro·DeepSWE 같은 새 지표만 있다). swebench.com 리더보드도 2026년 2월 이후 갱신이 없다. 그래서 `swe_bench_verified`·`swe_source` 는 null 로 두거나 생략한다. 코딩은 Arena Coding 점수(`arena_coding_elo`)로 대신한다.
5. **검문 스크립트 v2(`.tmp/handoff-benchmarks/verify-data.mjs`)는 검증을 마쳤다.** **이 스크립트는 고치지 않는다.** sha256: `210e435da8a6ffd12ea7eda3dc735dd02b798813f75e04d3346ccc5581be9516`
   - 1차 결과에 돌리면 위 정정 사항을 5건 실패로 막는다.
   - 위 표대로 정정한 데이터는 통과한다.
   - 일부러 틀린 14가지(코딩·Arena 점수 지어내기, 이름 바꿔 쓰기, 비최고 순위 선택, 회사 누락, 변형 오연결, 순위표 일부만 복사 등)는 모두 막는다.
   - 추가 규칙은 4개다. **A** 같은 회사에 더 높은 순위의 적격 모델이 있으면 실패. **B** 고른 회사가 적격 회사 상위 10개와 다르면 실패. **C** Arena 표시 가격과 같은 다른 변형이 있으면 실패. **D** 코딩 점수는 Coding 순위표의 같은 이름 행 값과 정확히 같아야 하고, 그 행이 있는데 비워 두면 실패.
6. **화면 코드는 이 단계에서 고치지 않는다.** 데이터만 바꾼다.
7. **옛 검증 스크립트는 그대로 둔다.** `scripts/benchmarks/curate-benchmarks.js` 는 새 형식과 맞지 않아 실패할 수 있다. 고치지 않는다.

---

## 2. 결과물

| 파일 | 내용 |
|---|---|
| `site/public/data/benchmarks_latest.json` | 4절 형식으로 덮어쓴다 |
| `.tmp/handoff-benchmarks/evidence/` | 받은 원본 파일 (gitignore 대상). sources 가 가리키지 않는 파일은 남기지 않는다 |
| `docs/review-benchmarks-data-2026-10-22-gemini-r2.md` | 정정 보고서 (7절). 1차 보고서는 고치지 않고 그대로 둔다 |

---

## 3. 작업 순서

### 3-1. 날짜 확인

`date` 를 실행하고 출력을 보고서에 적는다. 모든 `retrieved_at` 은 이 날짜여야 한다.

### 3-2. OpenRouter 원본

오늘 받은 `evidence/openrouter-models-2026-10-22.json` 이 있으면 그대로 쓴다. 없으면 다시 받는다.

```bash
curl -s https://openrouter.ai/api/v1/models -o .tmp/handoff-benchmarks/evidence/openrouter-models-2026-10-22.json
```

### 3-3. 점유율 원본 (Statcounter)

1. 오늘 받은 `evidence/statcounter-2026-09.html` 을 그대로 쓴다.
2. **`evidence/statcounter-2026-08.txt`·`evidence/statcounter-2026-08.png` 는 지운다.** 내용이 9월 화면이라 이름과 맞지 않는다.

### 3-4. Arena Overall 원본 (브라우저)

1. 이미 받은 `evidence/arena-text-2026-10-22.txt` 가 검문에서 50행 이상 읽히면 그대로 쓴다. 출처 `url` 은 `https://arena.ai/leaderboard/chat/text` 로 고친다.
2. 다시 받아야 하면: Overall 주소를 열고 "View all" 을 누른 뒤, 화면 텍스트 전체를 손대지 않고 저장한다. 스크린샷도 저장한다.

### 3-5. Arena Coding 원본 (브라우저, 새로 받기)

1. 브라우저로 `https://arena.ai/leaderboard/chat/text/coding` 을 연다.
2. **"View all" 을 눌러** 전체 순위표를 펼친다.
3. 화면 텍스트 전체를 손대지 않고 `evidence/arena-coding-text-2026-10-22.txt` 로 저장한다.
4. 순위표가 보이는 스크린샷을 `evidence/arena-coding-2026-10-22.png` 로 저장한다.
5. 페이지에 적힌 날짜(예: "Oct 21, 2026")를 `as_of` 로 쓴다.

### 3-6. 모델 고르기 (검문이 확인하는 규칙)

1. **적격 모델:** Arena Overall 순위표의 모델 중, OpenRouter 원본에 같은 버전이 있고, 같은 회사 최신 주력 모델보다 120일 넘게 오래되지 않은 것.
2. **회사별 1개:** 회사마다 순위표에서 가장 위에 있는 적격 모델 1개를 고른다. 더 위의 모델이 OpenRouter 에 없거나 구버전이면 다음 순위로 내려간다.
3. **상위 10개 회사:** 그렇게 고른 모델의 순위가 높은 회사부터 10개(적격 회사가 10개보다 적으면 전부).
4. **변형 고르기:** OpenRouter 에 이름이 비슷한 변형이 여러 개면, Arena 순위표에 적힌 가격($입력 / $출력)과 같은 변형을 고른다.
5. **검문 출력으로 확인:** 검문을 돌리면 맨 위에 "규칙상 들어가야 할 회사" 목록과 OpenRouter 후보 id 가 나온다. 데이터의 모델 구성은 이 목록과 같아야 한다.
6. **예외는 기록해야만 허용한다.** 목록의 후보가 실제로는 다른 모델이라고 판단될 때만 `selection_notes` 에 `{ "arena_name" 또는 "org": "…", "reason": "근거" }` 를 적는다. 근거에는 원본 파일에서 확인한 사실(이름·가격·출시일 차이)을 쓴다. 검문은 그 항목을 실패 대신 "검수자 확인 필요" 경고로 바꾸고, Claude 가 하나하나 확인한다. **규칙을 피하려고 쓰지 않는다.**

### 3-7. 모델별 값 채우기

| 필드 | 가져오는 곳 | 규칙 |
|---|---|---|
| `model` | — | 화면에 보일 이름 (예: 회사 공식 표기) |
| `provider` | — | 회사 이름 |
| `openrouter_id` | OpenRouter 원본 | `id` 그대로 |
| `arena_name`, `arena_elo` | Arena Overall 원본 | 화면에 적힌 이름 그대로(괄호 포함), 그 행의 점수(정수) |
| `arena_coding_elo` | Arena Coding 원본 | `arena_name` 과 이름이 같은 행의 점수(정수). 그 행이 없으면 `null` |
| `pricing_in_1m`, `pricing_out_1m` | OpenRouter 원본 | `pricing.prompt`·`pricing.completion` × 1,000,000, 소수 2자리 반올림 |
| `context_window` | OpenRouter 원본 | `context_length ÷ 1000` 반올림 + `K`, 천 단위 쉼표 (예: `1,000K`, `1,049K`) |
| `badge_type` | OpenRouter 원본 | `hugging_face_id` 가 있으면 `"open-weights"`, 없으면 `""` |
| `swe_bench_verified`, `gpqa_diamond`, `mmlu_pro` | — | `null` 로 둔다(`swe_source` 등은 생략) |

### 3-8. 점유율 값 채우기

1차 결과의 `market_shares` 6행은 원본과 맞다. 그대로 둔다(`prev_share_pct`·`mom_change` 는 `null`).

### 3-9. 나머지 필드

1. `updated_at` 은 지금 시각이다(`+09:00`).
2. `sources` 순서는 `traffic`, `arena`, `arena_coding`, `openrouter` 로 둔다. 화면 상단 출처 줄이 이 순서로 나온다.
3. `policy.description` 은 3-6 규칙을 한 문장으로 쓴다. `summary` 는 넣지 않는다.

### 3-10. 검문

```bash
node .tmp/handoff-benchmarks/verify-data.mjs
```

1. 결과가 `PASS` 가 될 때까지 **원본을 다시 확인해서** 고친다. 검문을 통과시키려고 값을 원본과 다르게 맞추거나, 원본 파일을 고치거나 줄이지 않는다.
2. PASS 가 나오면 `node .tmp/handoff-benchmarks/verify-data.mjs --live` 를 한 번 더 돌린다.
3. 남은 경고마다 이유를 보고서에 적는다. GLM 처럼 "출처별 가격 차이일 수 있음" 경고는 정상일 수 있다.

---

## 4. 데이터 형식

맨 위 키는 `updated_at`, `policy`, `sources`, `market_shares`, `model_benchmarks`, (필요할 때만) `selection_notes` 다. `summary` 는 없다.

**`sources` 항목**

| 필드 | 규칙 |
|---|---|
| `id` | 필수 4개: `traffic`, `arena`, `arena_coding`, `openrouter` |
| `label` | 화면에 붙을 짧은 분류: `트래픽`, `선호도`, `코딩`, `가격·컨텍스트` |
| `name` | 짧은 출처 이름. 화면에 그대로 나간다 (예: `Statcounter`, `LMArena`, `LMArena Coding`, `OpenRouter`) |
| `url` | 실제로 연 https 주소 |
| `kind` | `api`(curl JSON), `page`(curl HTML), `browser`(브라우저 화면 텍스트). `openrouter` 는 api, `arena`·`arena_coding` 은 browser |
| `aggregate` | 필수 4개 모두 `true` |
| `header` | 화면 상단 출처 줄에 보일 것만 `true` (필수 4개) |
| `as_of` | 출처에 적힌 기준일 `YYYY-MM-DD`. 월간 자료는 그 달의 마지막 날 (예: 2026-09-30) |
| `retrieved_at` | 원본을 받은 시각 (ISO, `+09:00`) |
| `evidence` | `evidence/` 로 시작하는 원본 파일 경로 |
| `screenshot` | `kind` 가 `browser` 이면 필수. `evidence/…png` |

**뼈대** (꺾쇠 `<…>` 자리는 원본에서 찾은 값으로 채운다. 예시 숫자를 만들어 넣지 않는다)

```json
{
  "updated_at": "<지금 시각 ISO +09:00>",
  "policy": { "filter_rule": "arena_top_per_provider", "description": "<3-6 규칙 한 문장>" },
  "sources": [
    { "id": "traffic", "label": "트래픽", "name": "Statcounter", "url": "https://gs.statcounter.com/ai-chatbot-market-share",
      "kind": "page", "aggregate": true, "header": true, "as_of": "2026-09-30", "retrieved_at": "<ISO>",
      "evidence": "evidence/statcounter-2026-09.html" },
    { "id": "arena", "label": "선호도", "name": "LMArena", "url": "https://arena.ai/leaderboard/chat/text",
      "kind": "browser", "aggregate": true, "header": true, "as_of": "<YYYY-MM-DD>", "retrieved_at": "<ISO>",
      "evidence": "evidence/arena-text-2026-10-22.txt", "screenshot": "evidence/arena-2026-10-22.png" },
    { "id": "arena_coding", "label": "코딩", "name": "LMArena Coding", "url": "https://arena.ai/leaderboard/chat/text/coding",
      "kind": "browser", "aggregate": true, "header": true, "as_of": "<YYYY-MM-DD>", "retrieved_at": "<ISO>",
      "evidence": "evidence/arena-coding-text-2026-10-22.txt", "screenshot": "evidence/arena-coding-2026-10-22.png" },
    { "id": "openrouter", "label": "가격·컨텍스트", "name": "OpenRouter", "url": "https://openrouter.ai/api/v1/models",
      "kind": "api", "aggregate": true, "header": true, "as_of": "<YYYY-MM-DD>", "retrieved_at": "<ISO>",
      "evidence": "evidence/openrouter-models-2026-10-22.json" }
  ],
  "market_shares": [ "<1차 결과 6행 그대로>" ],
  "model_benchmarks": [
    { "model": "<화면 이름>", "provider": "<회사>", "openrouter_id": "<원본 id 그대로>",
      "arena_name": "<Arena 표기 그대로>", "arena_elo": "<정수>", "arena_coding_elo": "<정수 또는 null>",
      "swe_bench_verified": null, "gpqa_diamond": null, "mmlu_pro": null,
      "pricing_in_1m": "<숫자>", "pricing_out_1m": "<숫자>", "context_window": "<n,nnnK>", "badge_type": "<open-weights 또는 빈 문자열>" }
  ]
}
```

(뼈대의 `"<…>"` 는 자리 표시다. 실제 파일에서 숫자 필드는 따옴표 없는 숫자로 쓴다.)

**허용된 출처 도메인** (그 밖은 검문이 실패시킨다): arena.ai, lmarena.ai, openrouter.ai, statcounter.com, swebench.com, artificialanalysis.ai, anthropic.com, claude.com, openai.com, deepmind.google, blog.google, ai.google.dev, cloud.google.com, x.ai, deepseek.com, qwen.ai, qwenlm.github.io, alibabacloud.com, mistral.ai, moonshot.ai, moonshot.cn, z.ai, bigmodel.cn, meta.com, llama.com, huggingface.co, github.com

---

## 5. 하지 말 것

- **기억·추정·요약으로 값을 쓰지 않는다.** 원본에 없는 값은 `null` 이다.
- **2차 출처를 쓰지 않는다.** 뉴스, 블로그, 위키, 커뮤니티, AI 요약은 허용 도메인이 아니다.
- **원본 파일을 손으로 쓰거나 고치거나 줄이지 않는다.** curl 결과는 그대로 저장하고, 브라우저 화면 텍스트는 "View all" 로 펼친 뒤 전체 복사한 그대로 저장한다. 검수할 때 Claude 가 같은 주소를 다시 열어 대조한다.
- **`selection_notes` 로 규칙을 피하지 않는다.** 원본에서 확인한 근거가 있을 때만 쓴다.
- **검문 스크립트(`verify-data.mjs`)를 고치지 않는다.** sha256 으로 확인한다.
- 화면 코드(`site/benchmarks.html`, `site/src/*`, `site/styles.css`), 다른 데이터 파일, `package.json`, `scripts/benchmarks/curate-benchmarks.js`, 1차 보고서를 고치지 않는다.
- **git 상태를 바꾸지 않는다.** add·commit·push·stash·reset·checkout·restore·clean 모두 금지다. 특히 `git add -A`·`git add .` 는 쓰지 않는다. 작업 트리에 공개되면 안 되는 untracked 문서가 있다.
- 파이프라인 본실행(`data:*`, `sync:obsidian`)과 배포를 하지 않는다.

---

## 6. 허용된 실행

```bash
date
curl -s https://openrouter.ai/api/v1/models -o .tmp/handoff-benchmarks/evidence/<파일>
curl -sL -A "<브라우저 UA>" <허용 도메인 주소> -o .tmp/handoff-benchmarks/evidence/<파일>
rm .tmp/handoff-benchmarks/evidence/statcounter-2026-08.txt .tmp/handoff-benchmarks/evidence/statcounter-2026-08.png
node .tmp/handoff-benchmarks/verify-data.mjs
node .tmp/handoff-benchmarks/verify-data.mjs --live
shasum -a 256 .tmp/handoff-benchmarks/verify-data.mjs site/public/data/benchmarks_latest.json
git status --short
git diff --stat
```

브라우저: arena.ai Overall·Coding 순위표 열기("View all")·텍스트 복사·스크린샷.

브라우저 대신 Playwright 스크립트(1차 때 만든 `.tmp/handoff-benchmarks/fetch-*.js` 방식)로 화면 텍스트(`document.body.innerText` 그대로)와 스크린샷을 받아도 된다. 이때 스크립트는 지우지 말고 `.tmp/handoff-benchmarks/` 에 남기며, 보고서 7절에 파일 이름과 하는 일을 적는다. 1차 보고서는 이 스크립트들을 적지 않았다.

실패한 명령은 숨기지 않는다. 종료코드와 핵심 출력을 보고서에 그대로 적는다.

---

## 7. 보고서

**파일:** `docs/review-benchmarks-data-2026-10-22-gemini-r2.md` (새로 만드는 문서는 이것 하나뿐이다)

**순서** (AGENTS.md §4 의 3단 구조 대신 이 순서를 따른다):
1. 결론 한 줄
2. `date` 출력
3. 정정 내역 — 0절 표의 1~6번 각각 "1차 → 정정" 과 확인 방법
4. 최종 모델 표 — Arena 순위 · arena_name · openrouter_id · OpenRouter 등록일 · Overall 점수 · Coding 점수
5. `selection_notes` 목록과 근거 (없으면 "없음")
6. 검문 결과 원문 — 마지막 일반 실행과 `--live` 실행. 둘 다 PASS 여야 한다
7. 사용한 스크립트와 확인하지 못한 것 — 원본을 받는 데 쓴 스크립트 파일 이름과 하는 일, 그리고 확인하지 못한 것

**작성 규칙:** 원본에 없는 사실을 쓰지 않는다. 추측에는 `[추정]` 을 붙인다. 한국어로, 쉬운 말로 쓴다. 저장소 루트의 untracked 문서 이름은 적지 않는다.

---

## 8. 완료 기준 (검수 시 이 순서로 확인)

1. `node .tmp/handoff-benchmarks/verify-data.mjs` 와 `--live` 가 모두 PASS 다.
2. `verify-data.mjs` 의 sha256 이 1절 5번 값과 같다.
3. `git status --short` 에 새로 생긴 줄이 정정 보고서(`?? docs/review-benchmarks-data-2026-10-22-gemini-r2.md`) 하나뿐이다.
4. `evidence/` 에 sources 가 가리키지 않는 파일이 없다(검문에 "가리키지 않는 원본 파일" 경고가 없다).
5. 보고서에 7개 절이 모두 있다.
6. 검수자(Claude)가 Arena 스크린샷·텍스트와 실제 페이지를 대조하고, `selection_notes` 가 있으면 근거를 하나하나 확인한다.
