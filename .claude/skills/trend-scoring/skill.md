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

### 기준선은 `data/stars_ledger.json` 에서만 읽는다 ⚠️
아카이브 **파일명으로 기준선을 잡지 말 것.** 파일명 규약이 주마다 오갔고
(`data/archive/2026-07-20.json` 내용은 `v2026.07.13`), 2026-07-27 런은 그 탓에
`stars_gained_7d` 전량을 14일 델타로 계산해 velocity 가 2배 부풀었다.

```
node scripts/build-stars-ledger.js --add _workspace/01_github_raw.json <오늘>
v_7d = velocity(ledger, repo, stars_now, 오늘)   # scripts/build-stars-ledger.js
```
- 기준선 = 오늘보다 **이전**인 가장 최근 표본 (파일명 아님, 표본의 `date`)
- 간격이 7일이 아니면 `delta * 7 / interval_days` 로 정규화하고 `interval_days` 기록
- 표본 없음(첫 관측) → `v_7d = null`, `velocity = 0`. 프록시로 꾸며내지 말 것.
  다음 주엔 원장에 표본이 쌓여 자동으로 측정 대상이 된다

### 코호트 중앙값 정규화
```
median_v7d = median(이번 주 v_7d 측정된 전체)
velocity   = min(100, 33.3 * v_7d / median_v7d)   # 중앙값=33점, 3배=100점
```
절대 배수(`v_7d * 3`)를 쓰지 않는 이유: 주당 34 stars 면 만점이라 생태계 규모가
커진 현재 **측정된 전 리포가 100점으로 포화**한다 (2026-07-27 실측 25/25).
40% 가중치가 아무 정보도 전달하지 못하고, 아래 Rising 분기가 전건에 걸려
섹션 배정이 무의미해진다. 중앙값 정규화는 규모 인플레이션에 불변이다.

2026-07-27 데이터 재계산 검증: 포화 25/25 → 2/35, 측정 가능 25 → 35건.

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

## 4) Recency (0~100)
- 최근 커밋 n일 전: `100 * max(0, 1 - n/60)` (60일 이상 방치면 0)

## Rising vs Classic 분기

**Rising 조건 (OR):**
- `created_at` ≤ 30일 이전
- `velocity_score` ≥ 60 (≈1.8x 중앙값) AND 최근 14일 커뮤니티 언급 **2건** 이상
  - 이 `2건` 은 Reddit 수집 불가 시절의 보정값(원래 3건)이다. Reddit 이 복구되면
    과보정이 된다 → **Reddit 복구 후 첫 주는 2건/3건 두 기준을 병행 계산해
    차이를 `meta.threshold_ab` 에 보고**하고, 그 다음 주에 3건으로 확정한다
- `velocity_score` ≥ 90 (≈2.7x 중앙값, 폭발 성장) — 커뮤니티 언급·출처 수 무관. GitHub star velocity 자체가 하드 증거. 단, `low_confidence:true` 표기
- HN 프론트페이지 최근 7일 내 도달

**Classic 조건 (AND):**
- stars ≥ 500
- created_at ≥ 60일 이전
- 최근 30일 내 커밋 존재 (`pushed_at` 기준 — `updated_at` 은 star·설명 변경에도 갱신되므로 활동 지표가 아니다)

**점수 임계치** (중앙값 정규화 스케일 기준, 2026-07-27 데이터로 역산):
- rising `score ≥ 55` · classic `score ≥ 45`
- 이 조합이 당시 발행량과 일치 (rising 후보 16 + classic 후보 9 = 25건)
- velocity 공식을 다시 바꾸면 임계치도 같은 방식으로 재역산할 것. 포화된 공식에
  맞춰 튜닝된 옛 값(rising 60 / classic 50)을 그대로 쓰면 안 된다

둘 다 해당하면 → Rising (신선도 우선)
둘 다 아니면 → 후보 대기열 (`pending`)

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
