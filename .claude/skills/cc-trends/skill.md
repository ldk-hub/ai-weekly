---
name: cc-trends
description: "Claude Code 에이전트/하네스/스킬 트렌드 모니터링 사이트 자동 업데이트 파이프라인. GitHub + 개발 커뮤니티에서 '최신 화제'와 '이미 유명한 것'을 수집→분석→큐레이션→정적 사이트로 배포. 5명 에이전트 팀 오케스트레이션. 트리거: cc-trends, 트렌드 업데이트, 클로드 코드 홈페이지 갱신, 주간 업데이트."
---

# CC Trends — Claude Code 트렌드 모니터링 오케스트레이터

Claude Code 에이전트·하네스·스킬 트렌드 홈페이지를 자동 갱신한다. **에이전트 팀 모드**로 실행.

## 팀 구성
| 에이전트 | 역할 |
|---------|------|
| `github-scout` | GitHub 리포 수집 |
| `community-scout` | Reddit/HN/X/dev.to/GeekNews 수집 |
| `trend-analyzer` | Rising vs Classic 분류 + 카테고리 태깅 + 점수 |
| `content-curator` | 한글 요약·캐치프레이즈·배지·썸네일 |
| `site-builder` | 정적 사이트 빌드·배포·롤백 |

## 실행 흐름

### Phase 1A: 광역 수집 (병렬)
`TeamCreate`로 팀 구성 후 `TaskCreate`로 github-scout, community-scout(Phase A)에 동시 할당.
- github-scout → `_workspace/01_github_raw.json`
  - 수집 직후 `node scripts/build-stars-ledger.js --add _workspace/01_github_raw.json <오늘>`
    로 **46건 전부**(pending 포함) 원장 기록. velocity 기준선은 아카이브가 아니라
    이 원장에서 나온다 — 아카이브 파일명 규약 혼재로 기준선이 2주 밀린 사고가 있었다
- community-scout (Phase A 광역) → `_workspace/02_community_raw.json` (최소 90건)

### Phase 1B: 후보 역방향 검증 ⭐⭐⭐
github-scout 완료 후, community-scout이 **Phase B 실행**.
- 입력: `_workspace/01_github_raw.json`의 candidate 리포 리스트
- 동작: 각 candidate를 모든 커뮤니티에서 직접 검색 (7개 쿼리 × N개 후보)
- 출력:
  - `_workspace/02b_repo_mentions.json` — 리포별 출처 인덱스 (다중출처 데이터의 핵심)
  - `_workspace/02c_coverage_report.json` — 커버리지 자가진단

**Phase B 없이는 모든 항목이 단일출처가 된다.** 절대 스킵 금지.

### Phase 2: 분석
수집 완료 후 trend-analyzer 작업 시작.
- 입력: `01_github_raw.json` + `02_community_raw.json` + `02b_repo_mentions.json` + `02c_coverage_report.json`
- 스킬: `trend-scoring`
- 핵심: `02b`로 각 항목의 `sources` 필드 채우기 (단일출처 강등 규칙 적용)
- 출력: `_workspace/03_analysis.json` (**카테고리별 정원제** — rising 최대 20, classic 최대 16)
  - skill 8/6, mcp 6/4, agent 4/4, harness 2/2 상한
  - 임계치 미달이면 정원이 비어도 강제로 채우지 않음 (자연 공급량 존중)
  - 단일출처(`sources` 1개) + score < 70 → 자동 pending 강등

### Phase 3: 큐레이션
content-curator가 각 아이템에 WebFetch로 README 확인 후 한글 콘텐츠 작성.
- 출력: `_workspace/04_curated.json`

### Phase 4: 빌드·배포
site-builder가 latest.json 교체, 빌드 검증, 변경 요약 보고.

### Phase 5: 종합 보고
오케스트레이터(리더)가 최종 요약:
- 수집/분석/큐레이션 건수
- 추가/제거/순위 변동 Top 5
- 실패·보류 항목

## 데이터 전달 프로토콜
- **파일 기반**: `_workspace/NN_*.json` 순차 체인
- **메시지 기반**: 팀원 간 실시간 힌트/요청 (SendMessage)
- **태스크 기반**: TaskCreate로 의존성 명시 (`depends_on: [prev_task_id]`)

## 에러 핸들링
| 상황 | 처리 |
|-----|-----|
| github-scout 실패 | community-scout 결과만으로 진행, 보고서에 "GitHub 데이터 누락" 명시 |
| WebFetch 차단 | 해당 아이템 `needs_review: true`로 표기, 사이트에는 최소 정보만 노출 |
| site 빌드 실패 | archive에서 직전 latest.json 복원, 오케스트레이터에 재시도 제안 |
| 데이터 0건 | 파이프라인 중단, 사용자 개입 요청 |

## 팀 크기 및 조율
- 5명 팀 — 중규모 (10~20 작업)
- 조율 오버헤드 관리: 리더는 Phase 경계에서만 개입, Phase 내에서는 팀원 자체 조율

## 테스트 시나리오

### 정상 흐름
1. 사용자: "cc-trends 업데이트해줘"
2. 팀 생성 → Phase 1~4 실행 → 5~10분 내 사이트 갱신
3. 리더가 "Rising 18건(skill 8/mcp 6/agent 4/harness 0, 신규 5), Classic 14건 업데이트 완료" 형식으로 카테고리별 보고

### 에러 흐름
1. community-scout가 Reddit 차단으로 0건 수집
2. github-scout 결과만으로 trend-analyzer 진행
3. 최종 보고서에 "⚠️ 커뮤니티 데이터 누락" 경고 포함

## 실행 빈도 권장
- 주간 1회 (매주 월요일)
- `schedule` 스킬로 cron 등록 가능

## 산출물
- `site/public/data/latest.json` — 사이트 라이브 데이터
- `data/archive/YYYY-MM-DD.json` — 주간 스냅샷
- `_workspace/` — 중간 산출물 (감사 추적용 보존)

## 사이트 초기 설정
최초 실행 시 `site/` 디렉토리에 `index.html`, `styles.css`, `app.js`가 없으면 site-builder가 기본 스캐폴딩을 생성한다.
