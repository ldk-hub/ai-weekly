---
name: cc-social
description: X·Threads·Reddit·Instagram AI 인플루언서·커뮤니티(시드 화이트리스트) 게시물을 수집·한국어 요약해 social.html 탭에 배포하는 데일리 파이프라인. 트리거: cc-social, 소셜 피드 갱신, 소셜 피드 업데이트
---
# cc-social

## 실행 순서

1. **수집**: `node scripts/social/collect_social.js`
   - X는 `agent-reach` (`searchX`)를 우선 시도하고, 쿠키가 없으면 Scrapling 프로필 폴백(`scripts/social/x_profile.py`)으로 자동 전환된다.
   - Threads는 `scripts/social/threads_profile.py`로 비로그인 SSR 수집한다.
   - Reddit은 시드 서브레딧의 일간 TOP RSS(`/top/.rss?t=day`)를 순차 수집한다 (`SOCIAL_REDDIT_DELAY_MS` 대기 및 429 재시도 포함).
   - Instagram은 `ego-browser`(`scripts/social/ig_profile.js`)에 로그인된 세션을 사용해 시드 프로필의 비고정 최신 게시물을 수집한다 (`SOCIAL_SKIP_INSTAGRAM=1`로 건너뛰기 가능).
   - 기본 창은 최근 24시간이며 0건이면 48시간으로 1회 자동 확장된다.
2. **큐레이션 및 검증**:
   - `GEMINI_API_KEY`가 있으면: `node scripts/social/curate_social.js`
   - `GEMINI_API_KEY`가 없으면: `data/social_candidates.json`을 직접 선별·한국어 요약해 `site/public/data/social_latest.json` 및 `data/social/YYYY-MM-DD.json`을 생성한다. (후보에 없는 id/url/author 작성 금지)
   - 배포 전 필수 검증: `node scripts/social/curate_social.js --validate`
3. **빌드 및 사이트맵**:
   - `node scripts/core/generate-rss.js && npm run build`
4. **시드 관리**:
   - 인플루언서 계정 추가/삭제는 `data/social/seeds.json`만 수정한다.

## 주의 사항

- 로그의 `[social] x=N threads=M reddit=K instagram=L`에서 모두 0건이거나 로그인월/CAPTCHA가 감지되면 우회하지 말고 사용자에게 보고한다.
- X 최신순 검색 성능을 높이려면 사용자가 `agent-reach configure twitter-cookies`를 직접 실행한다.
