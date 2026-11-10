# Scrapling Web Scraping & Stealth Browser Plugin for Antigravity

[D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling)을 Antigravity 에이전트 환경에서 완벽하게 활용할 수 있도록 구성된 통합 플러그인입니다.

---

## 🌟 주요 기능 (Highlights)

1. **자가 치유(Self-Healing) 셀렉터**:
   - 사이트 UI나 CSS 클래스명이 바뀌어도 요소 지문(Fingerprint)을 분석해 자동으로 대상 요소를 추적합니다 (`auto_match=True`).
2. **3단계 적응형 Fetcher**:
   - `Fetcher` / `AsyncFetcher`: cURL-cffi 기반 초고속 HTTP/3 및 TLS 위장 요청.
   - `DynamicFetcher`: Playwright 기반 JavaScript 렌더링.
   - `StealthyFetcher`: Camoufox / Patchright 기반 브라우저 핑거프린트 스텔스 엔진.
3. **17종 Scrapling MCP 도구 번들**:
   - 브라우저 제어, 네트워크 모니터링, DOM/마크다운 추출, 세션 저장/복원을 위한 표준 MCP 인터페이스 제공.
4. **AI 토큰 최적화**:
   - 광고/트래커 차단, 제로 너비 공백 및 불필요한 주석 제거로 LLM 컨텍스트 비용 대폭 절감.

---

## 📁 플러그인 구성 요소

```text
~/.gemini/config/plugins/scrapling/
├── plugin.json                              # 플러그인 매니페스트
├── mcp_config.json                          # Scrapling MCP 서버 자동 등록 설정
├── README.md                                # 사용자 가이드
├── rules/
│   └── AGENTS.md                            # 에이전트용 웹 크롤링 및 안전 수칙
└── skills/
    └── scrapling-crawler/
        └── SKILL.md                         # CLI, Python SDK 및 MCP 활용 스킬
```

---

## 🚀 빠른 시작 (Quick Start)

### 1. 스텔스 브라우저 바이너리 설치
```bash
uvx --from "scrapling[ai]" scrapling install
```

### 2. CLI를 통한 즉시 데이터 추출
```bash
# 동적 페이지를 마크다운으로 덤프
uvx --from "scrapling[ai]" scrapling extract fetch "https://news.ycombinator.com" hn.md --ai-targeted
```

### 3. Python 코드 예시
```python
from scrapling.fetchers import StealthyFetcher

page = StealthyFetcher.fetch("https://example.com", headless=True, auto_match=True)
print(page.css("h1::text").get())
```
