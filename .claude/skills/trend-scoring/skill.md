---
name: trend-scoring
description: "Claude Code 리포·게시글의 트렌드 점수를 계산하는 공식. Rising vs Classic 분류, 다중 출처 교차검증 가산점, 편향 방지. trend-analyzer 에이전트 전용."
---

# Trend Scoring — 점수 공식

## 최종 점수 (0~100)
```
score = 0.4 * velocity + 0.3 * community_buzz + 0.2 * quality + 0.1 * recency
```

## 1) Velocity (0~100)

### 기준선은 `data/stars/stars_ledger.json` 에서만 읽는다 ⚠️
아카이브 **파일명으로 기준선을 잡지 말 것.** 파일명 규약이 주마다 오갔고
(`data/archive/2026-07-20.json` 내용은 `v2026.07.13`), 2026-07-27 런은 그 탓에
`stars_gained_7d` 전량을 14일 델타로 계산해 velocity 가 2배 부풀었다.

```
node scripts/stars/build-stars-ledger.js --add _workspace/01_github_raw.json <오늘>
v_7d = velocity(ledger, repo, stars_now, 오늘)   # scripts/stars/build-stars-ledger.js
```
- 기준선 = 오늘보다 **이전**인 가장 최근 표본 (파일명 아님, 표본의 `date`)
- 간격이 7일이 아니면 `delta * 7 / interval_days` 로 정규화하고 `interval_days` 기록

### 첫 관측은 0점이 아니라 추정한다 (2026-08-04 교훈)
표본 없음(첫 관측)을 `velocity = 0` 으로 두면 **신상 리포가 첫 주에 구조적으로
발행 불가**가 된다. rising 임계 55 를 vel=0 으로는 못 넘기 때문이다. 2026-08-03 런
실측: `unmeasured_first_observation` 13건이 전부 pending(24~32점)으로 떨어졌고,
그중 `vox-director`·`OpenChatCut`·`video-shotcraft` 는 같은 주 weeklaude 가
rising 에 올린 리포다.

```
created_days_ago ≤ 60 → v_7d = min(stars, round(stars * 7 / max(created_days_ago, 1)))
created_days_ago > 60 → v_7d = null, velocity = 0   # 오래된 리포는 추정 근거 없음
```
신상은 누적 stars 가 곧 생성 후 획득분이므로 이 환산은 추측이 아니라 관측이다.
추정으로 채운 항목은 `v7d_estimated: true` 로 표기한다.

### 성장률 기반 코호트 정규화
```
growth_rate   = v_7d / max(stars - v_7d, 1)          # 주간 성장률
median_rate   = median(성장률 > 0 인 전체)
velocity      = min(100, 33.3 * growth_rate / median_rate)
```
구현: `scripts/stars/build-stars-ledger.js` 의 `scoreVelocity(items)` — 직접 계산 말고 호출한다.

**절대 델타(`v_7d`)를 쓰지 않는 이유** — 규모가 큰 리포가 자동 우위를 갖는다.
`min(100, v_7d * 3)` 은 주당 34 stars 면 만점이라 전건 포화(2026-07-27 실측 25/25),
`33.3 * v_7d / median_v7d` 는 포화는 풀리지만 델타가 곧 규모라 거대 리포만 남는다
(2026-08-03 실측: 발행 25건 최소 star 32,759, 중위 70,492). 성장률은 규모 불변이다.

2026-08-03 데이터 재계산 검증 (`median_rate` = 1.83%/week):
- 포화 13/59 — 절대 배수(25/25)와 델타 정규화(7/61) 사이
- `hermes-agent` 224,356★ +3,539 = 1.6% → vel 100 → **29**
- `video-shotcraft` 3,278★ 87.5% → vel 0 → **100**
- 상위 22 중 9건이 기존 pending 에서 승격, 성장률 2% 미만 거대 리포 13건 탈락

## 2) Community Buzz (0~100)
- 커뮤니티 언급 건수 × 각 게시글 engagement의 로그 가중 합
```
buzz = min(100, sum(log(upvotes + comments + 1)) * 10)
```
- **다중 플랫폼 가산**: 2개 이상 +10, 3개 이상 +15
  - Reddit 은 arctic-shift API 로 수집 가능하다 (`community-scout` 참조). 과거의
    "reddit 구조적 제외" 보정은 폐기 — 소스 기대치에 Reddit 을 정상 포함한다
  - arctic-shift 가 `score`/`num_comments` 를 주므로 Reddit 게시글은 engagement
    실측값으로 로그 가중에 들어간다 (이전엔 전량 null 이었다)
- HN 프론트페이지(점수 100+)는 +10

## 3) Quality (0~100)

### 기본 채점
- 라이선스 명시: +5
- 최근 30일 내 커밋: +15
- 테스트/예제 디렉토리: +10
- CI 설정: +5
- 사용 예시 코드블록 ≥ 2개: +10

### README 깊이 (최대 +35) ⭐ 강화
- README 600자 이상: +10
- README 1500자 이상: 추가 +5
- 섹션(`##`) 4개 이상: +10
- 설치/사용 예시 명시 (Installation/Usage/Quick Start 섹션): +10

### 메타 품질 (최대 +20)
- description 필드 충실: +5
- topics 5개 이상: +5
- 스크린샷·데모 링크: +5
- 별도 docs 사이트(GitHub Pages 등): +5

### 즉시 컷 조건 (quality = 0)
- README 200자 미만 → 사이트 노출 금지
- 코드 한 글자도 없음 → 컷
- 라이선스 불명 + stars 100 미만 → 컷

## 발행 하한선 (stars >= 500)

`stars < 500` 인 항목은 발행하지 않는다. rising·classic 무관.

**적용 위치: `scoreVelocity` 를 호출한 *뒤*, 후보 선정 단계에서만 걸러낸다.**
점수 산정 풀에서 미리 빼면 코호트 중앙값이 움직여 무관한 항목의 `velocity_score` 까지
흔들린다 (`velocity_score = 33.3 * gr / med`).

2026-08-31 산정 풀 214건 실측 — **영향은 작다**:

| 배치 | 중앙값 | measured | velocity 100 포화 |
|---|---|---|---|
| 후(後)필터 (채택) | 2.084%/wk | 85 | 87건 |
| 선(先)필터 | 2.020%/wk | 82 | 87건 |

중앙값 −3.1%, 전 항목 점수 +3.2%, 포화 건수 불변. 20★ 미만 중 원장 실측분이 3건뿐이라
크게 안 움직인다(`scoreVelocity` 는 `measured.length >= 5` 면 실측분만으로 중앙값을 낸다 —
추정분인 신상을 빼도 중앙값은 안 변한다). **그래도 후필터로 두는 이유는 공짜이기 때문**:
하한선 숫자를 나중에 조정할 때 임계(55/45)를 재역산할 의무가 생기지 않는다.

이전 판에 적었던 "중앙값 7.251→5.395%/wk, 전 항목 34% 부풀어 임계 무효" 는 **오류**다 —
선정된 후보 76건만으로 계산한 값이고, 후보 선정은 velocity 순이라 고성장 항목이
과대표집된다. 산정 풀 전체로는 위 표가 정답.

스크립트 경로 구현은 `collect.js` 의 `MIN_PUBLISH_STARS`, 불변식 테스트는
`node scripts/plugins/publish-floor.test.js`.

**500 의 근거** (2026-08-04~08-31 **rising** 발행 133건 백테스트):

| 하한선 | rising 생존 | 컷 | 주당 rising | 377★ tokentab |
|---|---|---|---|---|
| 20 | 119/133 | 11% | 12~20 | 통과 |
| 100 | 113/133 | 15% | 10~20 | 통과 |
| 200 | 105/133 | 21% | 9~20 | 통과 |
| **500** | **87/133** | **35%** | **7~20** | **컷** |
| 1000 | 48/133 | 64% | 3~11 | 컷 |

`classic` 은 문서상 이미 `stars >= 500` 요구라 87/87 무영향 — 비용은 전부 rising 이 낸다.
500 은 tokentab 규모(377★)를 자르는 가장 싼 지점이고, 1000 은 두 배 비싸면서 그 건에 대해
추가로 얻는 게 없다(최악 주 08-04 에는 급상승 카드가 3장만 남는다).

**⚠ 이건 큐레이션 정책이지 악성코드 탐지가 아니다.** 별은 벌크로 살 수 있으므로 하한선은
공격자에게 가격일 뿐이다 — 377개를 만든 쪽은 500개도 만든다. 그리고 이미 큰 리포가 나중에
오염되는 경우(악성 커밋·의존성 하이재킹)에는 0의 보호를 준다. 실제 탐지는 아래 절이 한다.

**나이·성장률로 자르려 하지 말 것.** `growth_rate ≥ 0.9` 는 `growthRate` 의 `min(1, …)`
클램프 때문에 `리포 나이 ≤ 7일` 과 동의어이고, 그걸로 게이트를 만들면 발행량 13.2%를
잃으면서(220건 중 29건, 최악 주 24%) 2,275★ 규모 프로젝트까지 자른다. 2026-08-31 에
시도했다가 철회했다.

## 4) Recency (0~100)
- 최근 커밋 n일 전: `100 * max(0, 1 - n/60)` (60일 이상 방치면 0)

## Rising vs Classic 분기

**Rising 조건 (OR):**
- `created_at` ≤ 30일 이전
- `velocity_score` ≥ 60 (≈1.8x 중앙값) AND 최근 14일 커뮤니티 언급 **2건** 이상
  - 이 `2건` 은 Reddit 수집 불가 시절의 보정값(원래 3건)이다. Reddit 이 복구되면
    과보정이 된다 → **Reddit 복구 후 첫 주는 2건/3건 두 기준을 병행 계산해
    차이를 `meta.threshold_ab` 에 보고**하고, 그 다음 주에 3건으로 확정한다
- `velocity_score` ≥ 90 (≈2.7x 중앙값 성장률, 폭발 성장) — 커뮤니티 언급·출처 수 무관. 성장률 자체가 하드 증거. 단, `low_confidence:true` 표기
- HN 프론트페이지 최근 7일 내 도달

**Classic 조건 (AND):**
- stars ≥ 500
- created_at ≥ 60일 이전
- 최근 30일 내 커밋 존재 (`pushed_at` 기준 — `updated_at` 은 star·설명 변경에도 갱신되므로 활동 지표가 아니다)

**점수 임계치** (성장률 정규화 스케일 기준, 2026-08-03 데이터로 재역산):
- rising `score ≥ 55` · classic `score ≥ 45` — 값 유지
- 재역산 결과 59건 중 rising 통과 33 · classic 통과 39. 정원(rising 20 · classic 16)
  보다 후보가 많으므로 **실제 컷은 임계치가 아니라 정원제가 담당**한다. 임계치를
  더 올리면 신상이 먼저 잘려 성장률 전환 취지가 무너진다
- velocity 공식을 또 바꾸면 임계치도 같은 방식으로 재역산할 것. 포화된 공식에
  맞춰 튜닝된 옛 값(rising 60 / classic 50)을 그대로 쓰면 안 된다

둘 다 해당하면 → Rising (신선도 우선)
둘 다 아니면 → 후보 대기열 (`pending`)

## 설치 진입점 코드 검사 (실제 악성 탐지) ⭐

`node scripts/plugins/scan-install-entry.js` — `collect.js` 와 `curate.js` **사이**에서 돈다
(`npm run data:plugins` 체인, CI 는 weekly-trends.yml 의 "Scan install entry points" 단계).
후보의 "설치·임포트 시점에 실행되는" 파일을 raw.githubusercontent.com 에서 읽어 판정하고,
걸린 후보는 `.tmp/candidates.json` 에서 제거한다. 리포트는 `.tmp/install-scan.json`.

**왜 지표로는 안 되는가.** tokentab 은 stars 377·growth_rate 1·README 5.5KB·MIT 라이선스로
모든 지표가 정상이었다. `tokentab/setup.py` 를 열어야만 드러났다. 지표는 인기를 재고
안전을 재지 않는다.

규칙 4개:

| 규칙 | 내용 |
|---|---|
| `hardcoded_public_ip` | 코드에 박힌 공개 IPv4 리터럴. URL 접두사를 요구하지 않는다 — tokentab 은 IP 를 설정 딕셔너리에 두고 f-string 으로 URL 을 조립했다 |
| `remote_fetch_exec` | 원격 fetch + in-process 동적 실행(`exec`/`eval`/`compile`/`new Function`)이 같은 파일 |
| `opaque_decode_exec` | base64·zlib·pickle 디코드 결과를 동적 실행 |
| `install_script_network` | `package.json` 의 pre/post-install 이 외부에서 코드를 받거나 인라인 실행 |

**오탐 방어는 실측으로 좁혔다.** `subprocess`·`child_process` 는 동적 실행에서 제외했다
(별 프로그램 실행은 정상 도구에 흔하다 — tokentab 이 쓴 건 in-process `exec(compile(...))`).
`exec`/`eval`/`compile` 은 앞에 점이 없는 것만 본다(`re.compile`·`cursor.exec` 제외).
IP 규칙은 매니페스트(`.toml`/`.json`/`.lock`/…)와 버전 문맥 줄에서 끄고, 사설·루프백·
링크로컬·TEST-NET·멀티캐스트 대역을 뺀다 — 2026-08-31 실측 오탐: `hermes-agent` 의
`pyproject.toml` 안 `1.2.0.1`·`2.0.13.4` 는 4자리 의존성 버전이었다.

**2026-08-31 후보 76건 실측: 1건 컷(`damejan80/tokentab`), 오탐 0, 24초.**

**한계 두 개, 알고 쓸 것:**
- 관례 경로만 본다(`setup.py`·`{name}/__init__.py`·`package.json` 의 `main`/`bin`·`pyproject.toml` 의 `name` 파생 경로 등). 76건 중 **29건은 그 경로에 설치 진입점이 없어 판정 못 했다** — 대부분 마크다운 스킬 모음(`*-skills`, `awesome-agent-skills`)이라 실행되는 코드가 애초에 없다. 다만 중첩 패키지·monorepo 하위 경로는 놓친다. 놓친 사례가 생기면 tree API(1 req/repo)로 경로를 열거하는 쪽으로 올릴 것
- **설치 진입점만 본다.** 스킬 `SKILL.md` 가 수동 실행을 지시하는 스크립트, 라이브러리 본문에 심은 로직, 나중에 들어오는 악성 커밋은 범위 밖이다

## 편향 방지
- 한국어 README/블로그는 buzz 가중 +10 (영어 커뮤니티 규모 차 보정)
- Anthropic 공식/임직원 프로젝트는 별도 `official` 태그, 점수는 동일하게 매김

## 중복·미러 컷 (Dedup) ⭐ 신규
- **GitHub fork 플래그 true** → 즉시 컷 (단, fork지만 의미 있는 추가 기여가 있는 경우 예외 표기)
- **README 80% 이상 동일** → 원본만 채택, 미러는 컷
- **owner 다르지만 코드 트리 95%+ 동일** → 더 높은 stars 한쪽만 채택
- **owner는 같은데 이름만 다른 리포** (e.g. `foo`, `foo-v2`, `foo-archive`) → 활성 리포만 채택
- 컷 사유는 `dedup_reason` 필드에 명시

## 최종 정렬 (카테고리별 정원제)
- 임계치 통과 후보를 점수 내림차순 정렬
- 카테고리별 상한(skill 8/6, mcp 6/4, agent 4/4, harness 2/2) 안에서 컷
- 정원이 비어도 임계치 미달이면 강제로 채우지 않음 (자연 공급량 존중)
- 동점 시 `updated_at` 최신순

## 출력
```json
{
  "rising": [ {...item with score, why_trending}, ... ],
  "classic": [ ... ],
  "pending": [ ... ],
  "meta": { "total_candidates": N, "generated_at": "..." }
}
```
