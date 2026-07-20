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
GitHub 기준:
- `v_7d = stars_gained_7d`
- `velocity = min(100, v_7d * 3)` — 하루 평균 10 stars면 100점 근접

신상(생성 30일 내)인데 stars가 낮을 때:
- `velocity = min(100, stars_total * 2)` 로 보정 (연령 짧은 리포 페널티 방지)

## 2) Community Buzz (0~100)
- 커뮤니티 언급 건수 × 각 게시글 engagement의 로그 가중 합
```
buzz = min(100, sum(log(upvotes + comments + 1)) * 10)
```
- **다중 플랫폼 가산**: 2개 이상 +10, 3개 이상 +15 (Reddit 구조적 제외 보정 — reddit.com은 현 환경서 수집 불가하므로 소스 기대치에서 제외하고 나머지 플랫폼 기준으로 계산)
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
- `velocity_score` ≥ 60 AND 최근 14일 커뮤니티 언급 2건 이상 (Reddit 부재 보정: 3→2)
- `velocity_score` ≥ 80 (폭발 성장) — 커뮤니티 언급·출처 수 무관. GitHub star velocity 자체가 하드 증거. 단, `low_confidence:true` 표기
- HN 프론트페이지 최근 7일 내 도달

**Classic 조건 (AND):**
- stars ≥ 500
- created_at ≥ 60일 이전
- 최근 30일 내 커밋 존재

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
