---
name: cc-news
description: "AI 최신 동향 데일리 뉴스 수집 및 큐레이션 파이프라인. GeekNews, HackerNews, GitHub, YouTube, Reddit, X, Threads, Instagram 매체를 대상으로 뉴스를 수집하고, Gemini를 통해 카드뉴스 스키마로 요약, 정적 사이트에 배포. 트리거: cc-news, 데일리뉴스 업데이트"
---

# CC News — 데일리 뉴스 오케스트레이터

매일 AI 최신 뉴스를 8개 매체(GeekNews, HackerNews, GitHub, YouTube, Reddit, X, Threads, Instagram)에서 수집하여 `news_latest.json`으로 요약 배포합니다.

## 팀 구성
| 에이전트 | 역할 |
|---------|------|
| `news-scout` | 8개 소셜 및 커뮤니티 매체에서 뉴스 탐색 및 수집 |
| `news-curator` | 수집된 후보군 요약 큐레이션 및 프론트엔드 JSON 데이터 갱신 |
| `site-builder` | 갱신된 JSON을 기반으로 배포 (기존 `cc-trends` 공유 에이전트) |

## 실행 흐름

## Pipeline (4-Stage Architecture)
cc-news는 총 4명의 에이전트/스크립트로 이루어진 파이프라인입니다. 반드시 아래 순서대로 실행하세요.

1. **[Phase 1] Scout (뉴스 수집)**
   - 실행: `node scripts/collect_news.js`
   - 역할: X, Threads, Instagram, GeekNews, HackerNews, GitHub, YouTube, Reddit 등 8개 매체에서 최신 뉴스를 원시 형태(`data/news_candidates.json`)로 스크래핑합니다.
2. **[Phase 2] Analyzer (뉴스 분석 및 필터링)**
   - 가이드: `.claude/agents/news-analyzer.md` (필요시 읽고 수행)
   - 역할: 수집된 원시 뉴스 중 발행일 기준 **최근 24시간 이내**, 그리고 **본문 내용이 존재하는 유효한 기사만 필터링**하여 수집합니다 (개수 제한 없음).
3. **[Phase 3] Curator (콘텐츠 큐레이션 및 포맷팅)**
   - 실행: `node scripts/curate_news.js`
   - 가이드: `.claude/agents/news-curator.md`
   - 역할: Analyzer가 선별한 뉴스를 3줄 한글 요약 형태로 다듬고, `site/public/data/news_latest.json` 최종 결과물로 생성합니다.
4. **[Phase 4] Builder (사이트 빌드 및 배포)**
   - 가이드: `npm run build` 등 (존재할 경우 실행)
   - 역할: 최종 JSON 파일을 화면에 반영하고 변경사항을 커밋합니다.

### Phase 3: 보고
- 파이프라인 결과에 대한 요약 보고 (예: "오늘의 주요 AI 뉴스가 4개 매체에 걸쳐 업데이트 되었습니다.")
