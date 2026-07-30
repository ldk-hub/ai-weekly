# 작업지시서 A — 스타보드 데이터 수집 파이프라인

수행 주체: Antigravity (github.com/ldk-hub 권한 보유)
설계·검수: Claude Code 세션
작성일: 2026-07-28

---

## 0. 배경

`study.html`(스터디 탭)을 폐기하고 그 슬롯에 **📈 스타보드** 탭을 넣기로 결정. 스타보드는 추적 리포의 주간 스타 증감을 리그별 순위표로 보여주는 화면이다.

본 지시서는 **데이터 계층만** 다룬다. UI 는 후속 작업(B)이며 이 작업에서 손대지 않는다.

### 확정된 설계 (변경 금지)

| 항목 | 결정 |
|---|---|
| 추적 모집단 | 역대 주간 랭킹 진입 누적 (현재 114개) + 자동 휴면 |
| 자동 휴면 | 12주 연속 스타 증가 0 → 휴면 마킹 (표시 제외, 데이터는 보존) |
| 1차 정렬 지표 | 주간 스타 증가수 (증가율은 보조) |
| 리그 | 헤비급 3만+ / 미들급 3천~3만 / 라이트급 ~3천 |
| 보조 지표 | 활동성 배지 3단 — 활발 ≤7일 / 둔화 ≤30일 / 방치 90일+ |
| 수집 주기 | **매일 1회** (표시는 주간, 수집은 일간) |
| 과거 백필 | **하지 않음** (사유는 §1) |

---

## 1. 검증된 사실 — 이 전제로 작업하라

작업 전에 확인 완료된 것들. 재확인 불필요.

1. **`GET /repos/{owner}/{repo}/stargazers` 는 전역 차단됨.** GitHub 2026-06-30 체인지로그로 stargazers·subscribers 리스팅이 소유자/콜라보레이터 전용으로 제한. 어떤 리포든 인증 요청에 404, 비인증에 401. Star History·OSS Insight 도 동일하게 깨짐.
   → **과거 스타 타임라인 복원 경로 없음. 백필 시도하지 말 것.** `starred_at` 을 얻는 대안 탐색도 불필요 (`GET /user/starred` 는 본인 계정 것만 200).
2. `GET /repos/{owner}/{repo}` 는 정상. `stargazers_count`·`pushed_at`·`archived`·`full_name` 모두 한 번의 호출로 획득 가능. **추가 호출 불필요.**
3. 로컬 `gh` 는 github.com 계정 `ldk-hub` 로 인증됨 (scopes: gist, read:org, repo, workflow). rate limit 5,000/hr. 114 호출은 여유.
4. `scripts/build-stars-ledger.js` 가 이미 `load()` / `record()` / 날짜 중복제거 / `velocity()` 7일 정규화를 갖고 있고 `module.exports` 로 노출한다. **재구현 금지 — import 해서 쓸 것.**
5. `data/stars_ledger.json` 스키마는 `{ "owner/repo": [{date, stars}, ...] }`. **이 형태를 바꾸지 말 것** (velocity 계산이 배열을 가정).

### 감사 결과 — 이번 작업에서 정리해야 할 데이터 오염

읽기 전용 전수 대조(114개) 결과:

**(a) 삭제된 리포 1건** → `gone` 마킹 대상
- `Manavarya09/design-extract` (404)

**(b) 리네임 5건** → canonical id 로 이관 필요
| ledger 상 id | 실제 id |
|---|---|
| `safishamsi/graphify` | `Graphify-Labs/graphify` |
| `affaan-m/everything-claude-code` | `affaan-m/ECC` |
| `qwibitai/nanoclaw` | `nanocoai/nanoclaw` |
| `forrestchang/andrej-karpathy-skills` | `multica-ai/andrej-karpathy-skills` |
| `Lum1104/Understand-Anything` | `Egonex-AI/Understand-Anything` |

⚠️ `affaan-m/everything-claude-code` 와 `affaan-m/ECC` 는 **둘 다 ledger 에 존재** = 같은 리포를 이중 추적 중. 병합 필요.

**(c) 스타 감소 2건** → `suspect` 마킹 (자동 삭제 금지, 사람 판단 대기)
- `joyehuang/Learn-Open-Harness` 231(04-13) → 25
- `efij/secure-claude-code` 88(04-13) → 13

스타 감소는 정상적으로 드물다. 초기 큐레이션 환각 의심.
※ 나머지 24건의 "30%+ 괴리" 는 관측일이 04~06월로 오래된 정상 성장이다. **오류로 처리하지 말 것.**

---

## 2. 산출물

### 2-1. `scripts/collect-stars.js` (신규)

**동작**

1. 모집단 = `data/stars_ledger.json` 의 키 ∪ `site/public/data/latest.json` 의 `rising[].id` + `classic[].id`
2. 각 리포에 `GET /repos/{id}` 1회 (순차 또는 동시성 ≤8)
3. `record(ledger, canonicalId, today, stargazers_count)` — `build-stars-ledger.js` 에서 import
4. `data/stars_meta.json` 갱신 (스키마는 아래)
5. 원자적 쓰기: `tmp` 파일에 쓰고 `fs.renameSync`. **중단 시 기존 파일 무손상이어야 함**
6. 콘솔 요약: 대상 수 / 성공 / 404 / 리네임 / suspect / 활동성 분포

**처리 규칙**

- **리네임**: 응답 `full_name` ≠ 요청 id 면 canonical(`full_name`) 로 기록. 구 id 의 샘플 배열을 canonical 로 병합(같은 날짜는 큰 값 채택), 구 키는 ledger 에서 제거하고 `meta.repos[canonical].aliases` 에 남긴다.
- **404**: ledger 키 유지 + `meta.repos[id].gone = true`. **데이터 삭제 금지.**
- **스타 감소**: 직전 기록 대비 30% 이상 감소면 `meta.repos[id].suspect = "stars_dropped:<이전>→<현재>"` 기록 + 경고 로그. 값은 그대로 기록한다(은폐 금지).
- **자동 휴면**: 12주(84일) 이상의 구간에서 스타 증가가 0 이면 `meta.repos[id].dormant = true`. 판정 근거가 부족하면(포인트 2개 미만) `null` 로 두고 판정하지 않는다.
- **인증**: `GH_TOKEN` → `GITHUB_TOKEN` → `gh auth token --hostname github.com` 순서. 셋 다 없으면 **에러로 종료**(비인증 폴백 금지 — 60/hr 로 조용히 실패함).
- **실패 처리**: 개별 리포 실패는 건너뛰고 계속. 전체 성공률 50% 미만이면 **파일 쓰지 않고 exit 1** (기존 데이터 보존).

**플래그**

- `--dry-run` : 대상 수·예상 호출 수만 출력, 네트워크·파일 쓰기 없음
- `--selfcheck` : 리네임 병합 / suspect 판정 / 휴면 판정 로직을 인메모리 픽스처로 assert. **네트워크 미사용**, 실패 시 exit 1

### 2-2. `data/stars_meta.json` (스크립트가 생성)

```json
{
  "generated_at": "2026-07-28T23:00:00Z",
  "repos": {
    "owner/repo": {
      "pushed_at": "2026-07-25T01:35:55Z",
      "archived": false,
      "checked_at": "2026-07-28",
      "gone": false,
      "dormant": null,
      "suspect": null,
      "aliases": ["old-owner/old-repo"]
    }
  }
}
```

리그 계산·활동성 배지 문자열·증감 계산은 **넣지 말 것.** 표시 계층(B)에서 `stargazers_count` 와 `pushed_at` 으로 파생한다. 파생값 저장은 곧 이중 진실이 된다.

### 2-3. `.github/workflows/stars.yml` (신규)

- `schedule: cron: '0 23 * * *'` (매일 23:00 UTC = 08:00 KST) + `workflow_dispatch`
- **기존 `weekly-trends.yml` 에 붙이지 말 것.** 큐레이션(LLM·에이전트) 실패가 스타 수집을 같이 죽이면 안 된다.
- `node scripts/collect-stars.js` 실행 → `data/` 변경 있을 때만 커밋
- 커밋 메시지: `chore(stars): daily collect YYYY-MM-DD`
- `permissions: contents: write`, `concurrency` 로 중복 실행 방지
- `GITHUB_TOKEN` 사용 (Actions 기본 토큰으로 public 리포 조회 가능)

---

## 3. 하지 말 것

- `site/**` 수정 (UI 는 B 단계)
- `site/public/data/latest.json` · `news_latest.json` 수정
- `data/stars_ledger.json` 스키마 변경
- 뉴스 파이프라인(`collect_news.js`·`curate_news.js`) 접근
- LLM 호출 (이 작업은 결정적 수집이다)
- npm 의존성 추가 (Node 18+ 내장 `fetch` 로 충분)
- 백필 시도 (§1-1 참조)
- `study.html` 삭제 — B 단계에서 교체한다

---

## 4. 수락 기준 (검수 시 이 순서로 실행됨)

```bash
node scripts/collect-stars.js --dry-run     # 대상 수 출력, 파일 변경 0
node scripts/collect-stars.js --selfcheck   # 로직 assert 통과, 네트워크 호출 0
node scripts/collect-stars.js               # 실제 수집
git diff --stat                             # data/ 밖의 변경이 없어야 함
```

통과 조건:

1. `--dry-run` 이 모집단 수를 출력하고 `git status` 가 깨끗함
2. `--selfcheck` 가 네트워크 없이 통과
3. 실행 후 `stars_ledger.json` 의 모든 활성 리포가 오늘 날짜 포인트를 가짐
4. `affaan-m/everything-claude-code` 키가 사라지고 `affaan-m/ECC` 에 병합됨 (`aliases` 에 구 id 존재)
5. `Manavarya09/design-extract` 가 `gone: true`, 데이터는 남아 있음
6. suspect 2건이 `stars_meta.json` 에 기록됨
7. 리포 개수가 114 이상 (감소는 실패로 간주)
8. 실행 중 강제 종료(`Ctrl-C`) 후에도 기존 `stars_ledger.json` 이 파싱 가능

---

## 5. 브랜치 / 커밋

- 브랜치: `feat/starboard-data`
- 커밋 컨벤션: 리포 기존 방식 유지 (`feat(stars):` / `chore(stars):`)
- **main 직푸시 금지.** 브랜치 푸시까지 하고 머지는 보류 — 검수 후 결정한다.
- 작업 완료 시 보고할 것: 실행 로그 요약(성공/404/리네임/suspect 수), 변경 파일 목록, 수락 기준 8개 각각의 통과 여부

---

## 6. 후속 (이 작업 범위 아님)

- **B**: `study.html` → 스타보드 UI 교체 (3리그 순위표, 스파크라인, 활동성 배지, 순위 변동 배지)
- **C**: 기존 탭 P0 수정 — index 기반 `#01 TOP` 스티커 제거, 브리핑 패널 하드코딩 소스 문구 제거, 데일리뉴스 자동화 워크플로 추가
