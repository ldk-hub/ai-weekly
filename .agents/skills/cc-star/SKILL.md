---
name: cc-star
description: "스타보드(Starboard) 파이프라인을 수동으로 즉시 실행하여 주요 오픈소스의 스타(Star) 증감 데이터와 메타 정보를 최신화하고 원격 저장소에 반영합니다. 트리거: cc-star, 스타보드 업데이트"
---

# CC Star — 스타보드 데이터 수동 갱신 스킬

**목적:** 매일 자정에 도는 스타보드 깃허브 크롤링(`scripts/stars/collect-stars.js`)을 즉시 실행하여 랭킹 및 깃허브 서비스 요약(Description) 데이터를 최신 상태로 갱신한다.

## 동작 방식
1. `node scripts/stars/collect-stars.js` 명령어를 실행하여 114개 대상 리포지토리의 최신 스타, 푸시 시점, Description 정보 등을 갱신한다.
2. 갱신된 내역은 `data/stars/stars_meta.json` 및 `data/stars/stars_ledger.json` (그리고 `site/public/data/` 내부 파일)에 저장된다.
3. 변경 사항을 확인한 후, Git 커밋 및 푸시를 수행한다.
   - 커밋 메시지 권장: `chore(stars): manual update via cc-star`

## 주의사항
- 스크립트 실행에 실패하거나 오류가 발생할 경우 데이터 파일은 원자적으로 보호되어 손상되지 않는다.
- 백필(Backfill) 시도는 불필요하다 (GitHub 정책상 과거 기록 접근 불가).
- 큐레이션 결과에 대해 "봇"이나 "에이전트가 수행했다"는 언급을 피하고, 갱신된 사실만 간결하게 보고한다.
