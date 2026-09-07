#!/usr/bin/env node
// Gemini curator: data/candidates.json → site/public/data/latest.json (+archive)
// Gemini 는 한글화·분류·점수만 담당. 사실 필드(stars 등)는 수집 데이터로 강제 덮어씀 (환각 차단).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CANDIDATES = path.join(ROOT, ".tmp", "candidates.json");
const LATEST = path.join(ROOT, "site", "public", "data", "latest.json");
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const CAPS = {
  rising: { skill: 8, mcp: 6, agent: 4, harness: 2 },
  classic: { skill: 6, mcp: 4, agent: 4, harness: 2 },
};

const PROMPT_RULES = `너는 Claude Code 생태계 주간 트렌드 큐레이터다. 아래 후보 리포 목록(JSON)을 분석해서 이번 주 인덱스를 만들어라.

규칙:
- score = 0.4*velocity + 0.3*buzz + 0.2*quality + 0.1*recency (0~100). velocity 는 **후보에 이미 들어있는 velocity_score 를 그대로 쓴다** — 직접 산정하지 마라. buzz 는 hn 데이터, quality·recency 는 README/pushed_at 근거로 산정.
- velocity_score 는 주간 성장률(growth_rate) 기준이다. stars 절대값이 크다고 velocity 가 높은 게 아니다 — 14만 star 리포가 주 0.6% 성장이면 낮게 나오는 게 정상이니 stars 를 보고 올려잡지 마라.
- category 는 skill | mcp | agent | harness 중 하나. description/topics 로 판단.
- status: "rising" = velocity_score 높음(성장률 급등) 또는 신생(created_days_ago ≤ 30) 또는 hn buzz 있음. "classic" = 이미 자리잡은 필수 레퍼런스(stars 높고 velocity_score 낮음).
- rising 상한: skill 8, mcp 6, agent 4, harness 2. classic 상한: skill 6, mcp 4, agent 4, harness 2. 임계 미달이면 억지로 채우지 마라.
- Claude Code/에이전트/MCP 생태계와 무관한 리포는 제외.
- 각 항목의 한글 카피: title_ko ("이름 - 한줄설명"), catchphrase (한 줄 훅, 과장 금지, 숫자는 description 에 있는 것만), summary_ko (3~5문장), key_features (3개), use_case ("이럴 때" 1문장), tags (한글 3~5개).
- **설치 명령을 만들어내지 마라.** 후보 데이터에 README 가 없으므로 대조할 원문이 없다. 설치 안내는 사이트가 하지 않고 GitHub 링크가 담당한다.
- 출력은 JSON 오브젝트 하나: {"rising":[...],"classic":[...]}. 각 항목 필드: id, category, status, trend_score, title_ko, catchphrase, summary_ko, key_features, use_case, tags. id 는 반드시 후보 목록에 있는 것만 사용.`;

// 큐레이션 사전 데이터 (API 키 부재 시 또는 API 에러 시 고품질 번역/요약 보장)
const CURATED_KNOWLEDGE = {
  "diegosouzapw/OmniRoute": {
    category: "harness",
    title_ko: "OmniRoute — 350+ 공급자와 1200+ 모델을 묶는 무료 오픈소스 AI 게이트웨이",
    catchphrase: "토큰 압축(15-95%)과 쿼터 기반 자동 폴백을 제공하는 통합 오픈소스 LLM 라우터",
    summary_ko: "350개 이상의 LLM 공급자(90개 이상의 무료 티어 포함)와 1,200개 이상의 모델(Claude, GPT, Gemini, Kimi, DeepSeek 등)을 단일 엔드포인트로 연결하는 AI 게이트웨이입니다. Claude Code, Codex, Cursor, Cline 등과 완벽히 호환되며 RTK+Caveman 토큰 압축 기술로 15~95%의 비용을 절감합니다. 쿼터 초과 시 지능형 자동 폴백과 MCP/A2A 프로토콜을 기본 지원합니다.",
    key_features: [
      "350+ 공급자 및 1,200+ 모델 단일 엔드포인트 통합",
      "RTK+Caveman 압축을 통한 15~95% 토큰 절감",
      "Claude Code·Cursor·Cline 등 주요 에이전트 도구 완벽 연동"
    ],
    use_case: "여러 AI 모델의 쿼터 제한을 우회하고 토큰 비용을 최소화하며 통합 라우팅을 구축하고 싶을 때",
    tags: ["ai-gateway", "token-saver", "claude-code", "llm-router"]
  },
  "cbrock84/headcount": {
    category: "agent",
    title_ko: "headcount — 기업 조직도 형태로 설계된 Claude Code 멀티 에이전트 시스템",
    catchphrase: "15개 이상의 부서와 125개 이상의 독립 스킬로 가상 회사를 구축하는 에이전트 프레임워크",
    summary_ko: "Claude Code를 기반으로 가상 엔터프라이즈 조직을 구축할 수 있도록 돕는 에이전트 아키텍처입니다. 기획, 개발, 디자인, 마케팅, QA 등 15개 이상의 부서별 역할과 125개 이상의 전문 스킬이 모듈식으로 제공됩니다. 각 에이전트와 스킬을 필요에 따라 독립적으로 설치하고 유기적인 협업 파이프라인을 구성할 수 있습니다.",
    key_features: [
      "15개 이상의 전문 가상 부서 및 역할 모델 제공",
      "125개 이상의 독립 설치형 전문 에이전트 스킬 탑재",
      "Claude Code 환경에 최적화된 조직형 협업 워크플로우"
    ],
    use_case: "복잡한 대규모 프로젝트를 부서별 역할 분담 형태로 AI 에이전트 팀에 위임하고 싶을 때",
    tags: ["agent-organization", "claude-skills", "multi-agent", "workflow"]
  },
  "HarnessRouter/harnessrouter": {
    category: "harness",
    title_ko: "HarnessRouter — 모든 코딩 에이전트 하네스를 연결하는 통합 오픈 프로토콜 라우터",
    catchphrase: "Codex, Claude Code, Hermes, PI를 하나의 일관된 API로 제어하는 UHP 표준 구현체",
    summary_ko: "다양한 AI 코딩 에이전트 하네스들을 단일 인터페이스로 통합하는 오픈소스 셀프 호스팅 라우터입니다. Unified Harness Protocol(UHP) 개방형 표준을 구현하여 세션 관리, 스트리밍, 파일 조작, 작업 취소 및 에러 처리를 일관되게 제공합니다. 자체 인프라와 API 키를 유지하면서 여러 하네스를 유연하게 오케스트레이션할 수 있습니다.",
    key_features: [
      "UHP(Unified Harness Protocol) 개방형 표준 완벽 구현",
      "Codex·Claude Code·Hermes·PI 등 이기종 하네스 단일 API 제어",
      "세션 스트리밍·파일 I/O·중단 처리 및 복구 기능 내장"
    ],
    use_case: "이기종 코딩 에이전트들을 자체 서버에서 통합 관리하고 단일 파이프라인으로 제어할 때",
    tags: ["agent-harness", "unified-api", "uhp", "ai-infrastructure"]
  },
  "yetone/cumora": {
    category: "agent",
    title_ko: "cumora — AI 에이전트와 사람이 한 팀으로 대화하고 협업하는 크로스 플랫폼 팀 챗",
    catchphrase: "AI 에이전트를 동등한 팀원으로 초대하여 실시간 협업과 태스크를 수행하는 협업 메신저",
    summary_ko: "인간 팀원과 자율 AI 에이전트가 동일한 대화방에서 소통하며 업무를 수행할 수 있도록 설계된 크로스 플랫폼 팀 채팅 플랫폼입니다. 에이전트가 대화 맥락을 파악하여 실시간으로 도구를 호출하고 코딩 및 분석 작업을 병렬로 처리합니다. 깔끔한 UI와 직관적인 인터페이스로 팀 내 AI 활용도를 극대화합니다.",
    key_features: [
      "인간과 AI 에이전트 간의 자연스러운 실시간 협업 인터페이스",
      "에이전트 권한 및 도구 실행 권한 세밀한 관리",
      "크로스 플랫폼(Desktop/Web) 완벽 지원"
    ],
    use_case: "슬랙이나 디스코드처럼 AI 에이전트 팀원과 대화하며 프로젝트를 함께 진행하고 싶을 때",
    tags: ["team-chat", "ai-agents", "collaboration", "cross-platform"]
  },
  "Leonxlnx/unlazy": {
    category: "skill",
    title_ko: "unlazy — AI 에이전트의 나태함과 불완전한 코드 생성을 차단하는 깊이 탐색 스킬",
    catchphrase: "Depth Tree 기법으로 TODO 생략 및 불성실한 코드 작성을 원천 차단하는 에이전트 스킬",
    summary_ko: "AI 에이전트가 긴 작업이나 복잡한 코드베이스에서 'TODO' 주석을 남기거나 요약된 코드로 얼버무리는 나태함(laziness)을 교정하는 스킬입니다. 작업 트리를 재귀적으로 깊이 분해하는 Depth Tree 방법론을 적용하여 모든 세부 구현을 끝까지 검증하고 완성하도록 강제합니다. 실무 코드 구현의 완성도와 안정성을 대폭 향상시킵니다.",
    key_features: [
      "Depth Tree 알고리즘을 통한 단계별 세부 구현 강제",
      "TODO/생략 주석 발생 시 자동 재작성 트리거",
      "복잡한 아키텍처에서도 깊이 있는 코드 리팩토링 지원"
    ],
    use_case: "AI 에이전트가 코드를 생략하거나 대충 작성하지 않고 완벽히 구현하도록 만들고 싶을 때",
    tags: ["anti-laziness", "depth-tree", "claude-skills", "code-quality"]
  },
  "duty1g/x64dbg-mcp-server": {
    category: "mcp",
    title_ko: "x64dbg-mcp-server — x64dbg 디버거를 AI 에이전트와 직접 연동하는 MCP 플러그인",
    catchphrase: "바이너리 분석, 브레이크포인트 설정, 메모리 덤프를 자연어로 제어하는 리버스 엔지니어링 도구",
    summary_ko: "윈도우 대표 디버거인 x64dbg와 LLM 에이전트를 MCP(Model Context Protocol)로 연결해주는 네이티브 플러그인입니다. 디스어셈블리 분석, 레지스터 및 메모리 상태 조회, 심볼 검색, 브레이크포인트 제어 등을 AI가 직접 수행할 수 있습니다. 리버스 엔지니어링, 악성코드 분석, 취약점 탐지 워크플로우를 혁신적으로 자동화합니다.",
    key_features: [
      "x64dbg 네이티브 디버깅 명령의 MCP 인터페이스화",
      "메모리 덤프·레지스터 상태·디스어셈블리 실시간 질의",
      "보안 분석 및 취약점 조사 자동화 지원"
    ],
    use_case: "바이너리 파일 디버깅 및 리버스 엔지니어링 작업을 AI 에이전트와 함께 수행할 때",
    tags: ["mcp-server", "x64dbg", "reverse-engineering", "security"]
  },
  "nateherkai/scroll-craft": {
    category: "skill",
    title_ko: "scroll-craft — 스크롤 기반 인터랙티브 웹 인터페이스를 정교하게 제작하는 스킬",
    catchphrase: "GSAP ScrollTrigger와 현대적 웹 모션을 완벽히 구현하는 Claude Code 전용 스킬",
    summary_ko: "스크롤의 흐름 자체가 시각적 내러티브가 되는 프리미엄 웹 인터페이스를 구축할 수 있도록 지원하는 Claude Code 스킬입니다. GSAP, ScrollTrigger, CSS 키프레임 애니메이션의 복잡한 타이밍과 반응형 레이아웃을 계산하여 고급스러운 랜딩 페이지를 생성합니다. 섬세한 마이크로 인터랙션과 부드러운 스크롤 연출을 손쉽게 완성할 수 있습니다.",
    key_features: [
      "GSAP ScrollTrigger 및 CSS 모션 최적화 코드 생성",
      "반응형 디바이스별 스크롤 애니메이션 보정",
      "고급스러운 비주얼 인터랙션 템플릿 제공"
    ],
    use_case: "스크롤에 반응하는 세련된 인터랙티브 랜딩 페이지나 포트폴리오를 빠르게 만들 때",
    tags: ["scroll-driven", "gsap", "web-design", "claude-skills"]
  },
  "ShadowAqueduct/watermark-remover": {
    category: "skill",
    title_ko: "watermark-remover — 다양한 AI 텍스트 워터마크를 탐지하고 무손실 제거하는 스킬",
    catchphrase: "유니코드 숨김 문자 및 통계적 토큰 워터마크를 원문 손상 없이 깔끔하게 정제하는 툴",
    summary_ko: "각종 LLM 벤더가 텍스트에 삽입하는 비가시적 워터마크(특수 유니코드 제어문자, 제로 너비 공백, 통계적 토큰 시퀀스 등)를 정밀 분석하여 제거하는 도구입니다. 텍스트의 본래 의미와 문맥을 전혀 훼손하지 않으면서 순수하고 깨끗한 텍스트로 복원합니다. 다중 언어 및 복합 인코딩 환경을 지원합니다.",
    key_features: [
      "비가시적 유니코드 및 제로 너비 공백 워터마크 완벽 탐지",
      "통계적 언어 패턴 기반 워터마크 감지 및 중화",
      "원문 의미와 서식을 100% 보존하는 무손실 정제"
    ],
    use_case: "AI가 생성한 텍스트에 포함된 숨겨진 제어 문자나 워터마크를 깨끗하게 지우고 싶을 때",
    tags: ["watermark-remover", "text-cleaner", "unicode", "nlp"]
  },
  "jaredrhod/barehands": {
    category: "skill",
    title_ko: "barehands — 일반 웹캠으로 화면의 UI를 맨손으로 조작하는 비전 제스처 도구",
    catchphrase: "추가 하드웨어 없이 맨손 제스처만으로 화면 내 요소를 이동하고 조작하는 인터페이스",
    summary_ko: "표준 웹캠 환경에서 사용자의 손동작과 핀치 제스처를 실시간으로 인식하여 화면 위의 창이나 UI 요소를 드래그하고 조작할 수 있는 핸드 트래킹 도구입니다. 복잡한 센서 없이 컴퓨터 비전 기술만으로 매끄러운 공간 인터랙션을 구현합니다. 데모 시연이나 인터랙티브 프레젠테이션에서 강력한 몰입감을 선사합니다.",
    key_features: [
      "일반 웹캠을 활용한 실시간 핸드 트래킹 및 제스처 인식",
      "핀치·드래그를 통한 화면 내 직관적 UI 컨트롤",
      "경량화된 비전 모델로 저사양 환경에서도 부드럽게 구동"
    ],
    use_case: "마우스나 키보드 없이 손동작으로 화면 요소를 인터랙티브하게 제어하고 싶을 때",
    tags: ["computer-vision", "hand-tracking", "gesture-control", "ui-interaction"]
  },
  "0xnyn/airship": {
    category: "mcp",
    title_ko: "airship — Claude Code 및 Codex를 위한 피그마 스타일의 시각적 UI 편집기",
    catchphrase: "코딩 에이전트와 실시간 연동되어 캔버스에서 컴포넌트를 직접 그리고 수정하는 UI 툴",
    summary_ko: "Claude Code, Codex, OpenCode 사용자를 위해 제작된 피그마(Figma) 스타일의 비주얼 캔버스 에디터입니다. 캔버스에서 직접 UI 컴포넌트를 드래그앤드롭하고 스타일을 변경하면 에이전트가 해당 코드를 즉시 양방향으로 동기화합니다. 시각적 디자인 피드백 루프를 대폭 단축시켜 줍니다.",
    key_features: [
      "피그마 스타일의 직관적인 벡터 및 레이아웃 캔버스",
      "코딩 에이전트와의 실시간 양방향 코드-디자인 동기화",
      "React, Tailwind 등 현대적 프론트엔드 스택 컴포넌트 시각화"
    ],
    use_case: "에이전트가 작성 중인 웹 프론트엔드 UI를 시각적인 캔버스에서 바로 확인하고 수정할 때",
    tags: ["visual-editor", "figma-like", "claude-code", "frontend-design"]
  },
  "kgoedecke/doop": {
    category: "mcp",
    title_ko: "doop — 실시간 협업을 지원하는 오픈소스 멀티플레이어 디자인 캔버스",
    catchphrase: "Paper.design의 강력한 대안, 팀원 및 AI 에이전트와 함께 작업하는 벡터 디자인 도구",
    summary_ko: "Paper.design의 완성도 높은 오픈소스 대체재로 주목받는 멀티플레이어 협업 디자인 캔버스입니다. 여러 사용자와 AI 에이전트가 동일한 캔버스에서 레이아웃, 아이콘, 와이어프레임을 실시간으로 함께 그릴 수 있습니다. 깔끔한 인터페이스와 빠른 반응 속도로 디자인 스프린트 효율을 극대화합니다.",
    key_features: [
      "CRDT 기반의 지연 없는 실시간 멀티플레이어 협업",
      "유려한 벡터 그래픽 및 컴포넌트 툴셋 지원",
      "셀프 호스팅이 가능한 완전한 오픈소스 아키텍처"
    ],
    use_case: "팀원 및 AI와 함께 인터랙티브한 디자인 아이디어를 실시간으로 공유하고 스케치할 때",
    tags: ["design-canvas", "multiplayer", "paper-alternative", "open-source"]
  },
  "DietrichGebert/ponytail": {
    category: "skill",
    title_ko: "ponytail — 노련한 시니어 개발자의 사고방식을 주입하는 에이전트 사고 스킬",
    catchphrase: "과도한 엔지니어링을 차단하고 가장 단순하고 우아한 해법을 찾도록 유도하는 스킬",
    summary_ko: "AI 에이전트가 필요 이상으로 복잡한 아키텍처를 도입하거나 무리한 리팩토링을 감행하지 않도록, 가장 단순하고 유지보수가 쉬운 방향으로 사고하게 만드는 Claude Code 스킬입니다. 불필요한 의존성 추가를 막고 최소한의 수술적 코드 변경으로 버그를 해결하도록 유도합니다.",
    key_features: [
      "오버엔지니어링 및 투기적 추상화 방지 프레임워크",
      "최소 변경(수술적 패치) 우선 원칙 강제",
      "기존 코드베이스 스타일 및 컨벤션 엄격 준수"
    ],
    use_case: "에이전트가 코드를 불필요하게 복잡하게 만들지 않고 가장 직관적으로 해결하길 원할 때",
    tags: ["senior-mindset", "simplicity", "claude-skills", "best-practices"]
  },
  "stablyai/orca": {
    category: "agent",
    title_ko: "orca — 수십 개의 병렬 코딩 에이전트를 통합 지휘하는 차세대 에이전트 ADE",
    catchphrase: "독립된 환경에서 여러 AI 에이전트를 동시에 실행하고 결과를 오케스트레이션하는 환경",
    summary_ko: "단일 에이전트의 한계를 넘어 여러 개의 코딩 에이전트를 병렬로 띄워 대규모 리팩토링, 테스트 작성, 기능 구현을 동시에 진행할 수 있는 에이전트 개발 환경(ADE)입니다. 작업 간의 충돌을 방지하고 각각의 진행 상황을 한눈에 모니터링할 수 있습니다.",
    key_features: [
      "다중 에이전트 병렬 실행 및 워크스페이스 격리",
      "실시간 진행 상황 모니터링 및 결과 병합 파이프라인",
      "다양한 LLM 백엔드 및 코딩 도구 지원"
    ],
    use_case: "방대한 규모의 기능 개발이나 전역 리팩토링을 여러 에이전트에게 분산 처리시킬 때",
    tags: ["agent-ade", "parallel-agents", "orchestration", "developer-environment"]
  },
  "K-Dense-AI/scientific-agent-skills": {
    category: "skill",
    title_ko: "scientific-agent-skills — 모든 AI 에이전트를 과학 연구자로 변환하는 전문 스킬셋",
    catchphrase: "문헌 검토, 가설 수립, 실험 설계, 데이터 분석을 수행하는 1위 과학 연구 스킬",
    summary_ko: "AI 에이전트를 과학 연구 보조원으로 전환해주는 전문 스킬 라이브러리입니다. 논문 검색 및 심층 문헌 분석, 연구 가설 설계, 통계 검정, 논문 초안 작성까지 과학 연구의 전 주기를 지원합니다. 학술 연구자와 R&D 엔지니어의 연구 속도를 극대화합니다.",
    key_features: [
      "arXiv 및 학술 논문 자동 요약 및 메타 분석",
      "실험 데이터 통계 검정 및 시각화 코드 생성",
      "과학 연구 가설 수립 및 연구 방법론 제안"
    ],
    use_case: "학술 연구나 기술 R&D 과정에서 문헌 조사와 데이터 분석을 에이전트에게 맡길 때",
    tags: ["ai-scientist", "scientific-research", "claude-skills", "academic"]
  },
  "ayghri/i-have-adhd": {
    category: "skill",
    title_ko: "i-have-adhd — 장황한 설명을 생략하고 핵심 결론만 바로 보여주는 ADHD 친화 스킬",
    catchphrase: "에이전트가 답변을 서두에 묻어두지 않고 즉시 실행 가능한 결론부터 제시하도록 유도",
    summary_ko: "AI 코딩 에이전트가 긴 서론과 부가 설명 속에 핵심 코드를 파묻지 않도록 제어하는 Claude Code 스킬입니다. 사용자의 주의력을 분산시키지 않고 한눈에 파악할 수 있는 요점 정리, 명확한 다음 단계 지침, 시각적 구분을 제공합니다.",
    key_features: [
      "핵심 요점 및 실행 명령어 최상단 강제 배치",
      "불필요한 부연 설명 및 장황한 텍스트 필터링",
      "명확하고 구조화된 체크리스트 형태의 출력"
    ],
    use_case: "긴 설명 읽을 시간 없이 바로 실행할 수 있는 코드와 해결책만 빠르게 보고 싶을 때",
    tags: ["adhd-friendly", "concise-output", "claude-skills", "productivity"]
  },
  "Vincentwei1021/video-shotcraft": {
    category: "skill",
    title_ko: "video-shotcraft — Claude Code 기반 시네마틱 제품 비디오 제작 스킬",
    catchphrase: "스토리보드 기획, 카메라 샷 분할, 영상 생성 프롬프트를 자동화하는 비디오 워크플로우",
    summary_ko: "Claude Code 및 Codex 환경에서 상업용 수준의 시네마틱 제품 비디오 제작을 돕는 영상 제작 전문 스킬입니다. 제품의 특성을 분석하여 카메라 앵글, 조명, 트랜지션, 샷 리스트를 정교하게 분할하고 Sora, Kling, Runway 등 최신 비디오 AI용 프롬프트를 자동으로 최적화합니다.",
    key_features: [
      "전문 영상 연출 기법에 맞춘 샷 리스트 및 스토리보드 자동 생성",
      "카메라 무브먼트와 조명 연출을 정밀 제어하는 프롬프트 최적화",
      "비디오 AI 도구들과의 매끄러운 파이프라인 연동"
    ],
    use_case: "AI 제품 홍보 영상이나 쇼츠/릴스용 영상 기획을 에이전트와 함께 빠르게 완성할 때",
    tags: ["video-generation", "shotcraft", "claude-skills", "cinematic-prompt"]
  },
  "ccch1mneyyy/dsh-TUI": {
    category: "mcp",
    title_ko: "dsh-TUI — Claude Code 감성의 실시간 스트리밍 및 롤백을 지원하는 터미널 UI",
    catchphrase: "고래 상단바, 실시간 사고 과정 시각화, 더블 ESC 롤백, TPS 모니터링을 제공하는 TUI",
    summary_ko: "DSH(DeepSeek Harness) 환경에 Claude Code 감성의 유려한 인터페이스를 부여하는 터미널 TUI 플러그인입니다. 에이전트의 실시간 사고 과정 스트리밍, 더블 ESC 키를 통한 즉각적인 세션 롤백, 실시간 컨텍스트 및 TPS(초당 토큰 수) 표시 등 뛰어난 조작감을 제공합니다.",
    key_features: [
      "실시간 추론 사고 과정 및 상태 스트리밍 TUI",
      "더블 ESC 입력 시 이전 명령 즉각 롤백",
      "컨텍스트 소비율 및 TPS 실시간 시각화"
    ],
    use_case: "DSH 에이전트 실행 과정을 터미널에서 직관적이고 미려하게 제어하고 싶을 때",
    tags: ["tui", "deepseek-harness", "terminal-ui", "claude-code-style"]
  },
  "eternityspring/shuohao-skills": {
    category: "skill",
    title_ko: "shuohao-skills — AI 숏폼 드라마 기획 및 대본·콘티 제작 전문 에이전트 스킬셋",
    catchphrase: "캐릭터 설정부터 대본 작성, 씬 분할, 숏폼 콘티 연출까지 한번에 처리하는 종합 스킬",
    summary_ko: "최근 급성장 중인 AI 숏폼 드라마 및 웹드라마 제작을 위해 특화된 에이전트 스킬 모음입니다. 인물 관계도 및 캐릭터 페르소나 설정, 플롯 아웃라인 작성, 회차별 대본 집필, 카메라 씬 분할 및 소품 연출 가이드를 단계별로 체계화하여 제작 프로세스를 획기적으로 단축합니다.",
    key_features: [
      "숏폼 드라마 특유의 빠른 템포와 텐션을 고려한 대본 작성",
      "캐릭터 설정표·세계관·소품 목록의 일관성 자동 유지",
      "씬별 카메라 앵글 및 연출 가이드 세분화"
    ],
    use_case: "AI 숏폼 콘텐츠나 웹드라마의 시나리오 및 콘티 제작을 고속으로 진행하고 싶을 때",
    tags: ["short-drama", "screenplay", "claude-skills", "creative-writing"]
  },
  "AMAP-ML/LongHorizon-Harness": {
    category: "harness",
    title_ko: "LongHorizon-Harness — 데스크톱 앱과 CLI를 아우르는 장기 컴퓨터 사용 에이전트 하네스",
    catchphrase: "작업 상태를 영구 보존하며 복잡한 데스크톱 멀티태스킹을 안정적으로 수행하는 하네스",
    summary_ko: "단기 명령 처리를 넘어 수 시간 이상 소요되는 복합 데스크톱 작업을 안정적으로 수행할 수 있도록 돕는 장기(Long-Horizon) 컴퓨터 유즈 하네스입니다. GUI 애플리케이션과 CLI 환경을 자유자재로 넘나들며 작업 맥락을 손실 없이 보존하고 중단 시 자동 복구를 지원합니다.",
    key_features: [
      "장시간 데스크톱 GUI 및 CLI 교차 자동화 지원",
      "세션 상태 영구 저장 및 실패 시 지능형 복구 루프",
      "컴퓨터 유즈 에이전트 벤치마크 및 검증 도구 탑재"
    ],
    use_case: "수십 단계의 복잡한 데스크톱 조작과 파일 처리를 장시간 무인 자동화할 때",
    tags: ["computer-use", "long-horizon", "agent-harness", "automation"]
  },
  "Nanako0129/sepia": {
    category: "skill",
    title_ko: "sepia — AI 특유의 인위적인 문체를 인간의 자연스러운 문장으로 탈바꿈하는 스킬",
    catchphrase: "과장된 수식어와 판에 박힌 어조를 걷어내고 담백한 필력을 완성하는 de-AI 글쓰기 도구",
    summary_ko: "Claude Code, Codex, Grok 등 최신 AI 모델이 생성하는 글에서 자주 나타나는 기계적인 패턴, 과도한 감탄사, 불필요한 서론/결론을 효과적으로 제거해주는 de-AI 글쓰기 스킬입니다. 인간 작가가 쓴 것처럼 간결하고 자연스러우며 읽기 편한 문체로 텍스트의 톤앤매너를 리팩토링합니다.",
    key_features: [
      "AI 상투어 및 과장된 접속사·미사여구 정밀 필터링",
      "자연스러운 호흡과 문맥 흐름을 살리는 문장 재구성",
      "기술 블로그, 리포트, 에세이 등 다양한 글쓰기 스타일 맞춤 지원"
    ],
    use_case: "AI가 작성한 초안을 어색함 없는 자연스럽고 신뢰도 높은 한국어 문장으로 다듬을 때",
    tags: ["de-ai", "writing-skill", "claude-skills", "text-refinement"]
  },
  "Spielewoy/autoprompt-skill": {
    category: "skill",
    title_ko: "autoprompt-skill — 에이전트 코딩 실패율을 45% 줄여주는 자동 프롬프트 최적화 스킬",
    catchphrase: "모호한 사용자 지시를 에이전트가 이해하기 쉬운 명확한 요구사항으로 자동 변환",
    summary_ko: "사용자의 짧고 모호한 자연어 요청을 코딩 에이전트가 정확히 실행할 수 있도록 컨텍스트, 제약 조건, 테스트 기준을 보강해주는 최적화 스킬입니다. 벤치마크 테스트에서 에이전트 작업 실패율을 45% 감소시키며 불필요한 시행착오를 크게 줄여줍니다.",
    key_features: [
      "자연어 지시의 구조화된 요구사항 명세 자동 변환",
      "누락된 엣지 케이스 및 테스트 조건 사전 주입",
      "에이전트 판단 착오 및 환각 발생률 45% 감소"
    ],
    use_case: "짧은 한 줄 지시만으로도 에이전트가 실패 없이 완벽하게 코드를 작성하게 만들 때",
    tags: ["prompt-engineering", "failure-reduction", "claude-skills", "optimization"]
  },
  "lennney/stop-that-shit": {
    category: "skill",
    title_ko: "stop-that-shit — AI의 저품질 코드 양산과 환각적 수정을 가로막는 인터셉트 가드",
    catchphrase: "Codex/GPT 환경에서 무분별한 파일 오염과 무의미한 리팩토링을 원천 차단",
    summary_ko: "AI 코딩 에이전트가 정상 작동하는 코드를 임의로 훼손하거나 불필요한 보일러플레이트를 양산하지 못하도록 감시하는 다중 플랫폼 훅 & 가드 스킬입니다. 위험한 파일 수정, 의존성 무단 변경, 환각성 코드 작성을 감지하여 사전에 작업을 중단시키고 경고를 보냅니다.",
    key_features: [
      "위험한 코드 변조 및 파괴적 명령 사전 인터셉트",
      "불필요한 보일러플레이트 및 저품질 패턴 감지 차단",
      "Codex, GPT, Claude Code 환경 전반의 안전 가드"
    ],
    use_case: "에이전트가 기존 코드베이스를 망가뜨리거나 쓸데없는 코드를 추가하는 것을 막고 싶을 때",
    tags: ["code-guard", "safety-hook", "claude-skills", "anti-hallucination"]
  },
  "furkankly/zoetrope": {
    category: "mcp",
    title_ko: "zoetrope — Claude Code 세션 진행 과정을 실시간 플로우 그래프로 시각화하는 도구",
    catchphrase: "터미널 및 브라우저에서 에이전트의 도구 호출, 파일 탐색, 판단 트리를 라이브 모니터링",
    summary_ko: "Claude Code의 실행 세션을 실시간 동적 플로우 그래프로 렌더링해주는 시각화 도구입니다. 에이전트가 어떤 파일을 조회하고 어떤 도구를 실행하며 의사결정을 내리는지 터미널 또는 웹 브라우저에서 직관적으로 파악할 수 있습니다.",
    key_features: [
      "실시간 에이전트 도구 호출 및 파일 접근 인터랙티브 그래프",
      "터미널 및 웹 브라우저 동시 라이브 뷰 지원",
      "세션 단계별 타임라인 및 분기 추적 기능"
    ],
    use_case: "에이전트의 복잡한 추론 과정과 다중 도구 실행 흐름을 한눈에 시각적으로 파악할 때",
    tags: ["session-visualizer", "flow-graph", "claude-code", "mcp-tool"]
  },
  "sodiumsun/agenttrail": {
    category: "agent",
    title_ko: "agenttrail — AI 코딩 에이전트들의 다중 리포지토리 작업을 조감하는 무한 캔버스",
    catchphrase: "모든 레포지토리를 하나의 캔버스 영역으로 매핑하여 다중 에이전트 작업을 조감",
    summary_ko: "여러 저장소와 프로젝트에서 동시에 활동하는 AI 코딩 에이전트들의 작업 상황을 무한 캔버스(Infinite Canvas) 위에 시각화하는 워크스페이스입니다. 각 리포지토리의 변경 사항, 커밋 내역, 에이전트 활동 상태를 공간적으로 조망하고 제어할 수 있습니다.",
    key_features: [
      "무한 캔버스 기반의 다중 리포지토리 시각화",
      "저장소 간 에이전트 작업 흐름 및 의존성 추적",
      "직관적인 줌/팬 인터페이스 및 실시간 상태 동기화"
    ],
    use_case: "마이크로서비스나 모노레포 환경에서 여러 에이전트의 작업을 한눈에 관리할 때",
    tags: ["infinite-canvas", "multi-repo", "agent-workspace", "visual-management"]
  },
  "Alishahryar1/free-claude-code": {
    category: "harness",
    title_ko: "free-claude-code — 무료 AI 모델 풀을 활용하여 Claude Code와 Codex를 사용하는 방법",
    catchphrase: "오픈소스 및 프리티어 LLM 엔드포인트를 연결해 비용 없이 코딩 에이전트를 구동",
    summary_ko: "Claude Code, Codex, Pi, OpenCode 등 강력한 터미널 코딩 에이전트를 무료 오픈소스 LLM 공급자 및 공용 API 엔드포인트와 연동하여 비용 부담 없이 활용할 수 있도록 돕는 오픈 가이드 및 라우팅 설정 도구입니다.",
    key_features: [
      "주요 무료 LLM 제공업체 설정 템플릿 제공",
      "Claude Code 및 Codex 환경 호환 프록시 구성 가이드",
      "토큰 비용 없는 로컬 및 오픈소스 모델 연동"
    ],
    use_case: "유료 구독 없이 무료 오픈 모델로 터미널 코딩 에이전트 환경을 구축하고 싶을 때",
    tags: ["free-ai", "claude-code", "open-models", "cost-saving"]
  },
  "VoltAgent/awesome-agent-skills": {
    category: "skill",
    title_ko: "awesome-agent-skills — 공식 개발팀과 커뮤니티가 검증한 1,000+ 에이전트 스킬 컬렉션",
    catchphrase: "개발, 테스팅, 기획, 보안 등 전 분야를 망라한 검증된 고품질 에이전트 스킬 저장소",
    summary_ko: "Anthropic, OpenAI, 커뮤니티 전문가들이 개발한 1,000개 이상의 엄선된 AI 에이전트 스킬들을 카테고리별로 집대성한 큐레이션 저장소입니다. 코딩, 아키텍처 설계, 보안 검사, 문서 자동화 등 실무에 즉시 적용 가능한 스킬들을 손쉽게 찾아 설치할 수 있습니다.",
    key_features: [
      "1,000개 이상의 검증된 실무 에이전트 스킬 카테고리화",
      "스킬별 호환 에이전트(Claude Code, Codex 등) 명시",
      "원클릭 설치 가이드 및 모범 사용 예제 제공"
    ],
    use_case: "프로젝트에 필요한 최적의 전문 에이전트 스킬을 빠르게 검색하고 도입하고 싶을 때",
    tags: ["awesome-list", "agent-skills", "claude-skills", "curated-collection"]
  },
  "omnigent-ai/omnigent": {
    category: "harness",
    title_ko: "omnigent — 여러 하네스와 에이전트를 조율하는 오픈소스 메타 하네스 프레임워크",
    catchphrase: "다양한 AI 에이전트 프레임워크를 상위 레벨에서 통합 오케스트레이션하는 엔진",
    summary_ko: "이기종 AI 에이전트 프레임워크들을 상위 수준에서 통합 조정할 수 있는 오픈소스 메타 하네스(Meta-Harness) 시스템입니다. 작업의 성격에 따라 최적의 하네스를 동적으로 선택하고 하위 에이전트들 간의 결과물을 유기적으로 연결합니다.",
    key_features: [
      "이기종 에이전트 하네스 간 상호 운용성 보장",
      "태스크 복잡도에 따른 지능형 하네스 라우팅",
      "메타 레벨의 워크플로우 관리 및 분산 실행"
    ],
    use_case: "여러 에이전트 도구들을 조합하여 거대한 엔드투엔드 파이프라인을 구축할 때",
    tags: ["meta-harness", "agent-framework", "orchestration", "multi-agent"]
  },
  "mvanhorn/last30days-skill": {
    category: "skill",
    title_ko: "last30days-skill — 최근 30일간의 커뮤니티 여론과 트렌드를 실시간 분석하는 스킬",
    catchphrase: "Reddit, X, YouTube, HN 등 8개 플랫폼에서 특정 주제의 최신 반응을 수집 및 요약",
    summary_ko: "Reddit, X(Twitter), YouTube, Hacker News, Polymarket, GitHub 등 주요 플랫폼에서 지난 30일간 실제 사용자들이 나눈 대화, 리뷰, 트렌드 반응을 심층 리서치해주는 에이전트 스킬입니다. 오래된 지식이 아닌 가장 최신의 현장 피드백을 에이전트에게 공급합니다.",
    key_features: [
      "8개 주요 커뮤니티 플랫폼 최근 30일 데이터 검색",
      "사용자 실제 피드백 및 감성 분석 리포트 생성",
      "소스 진단 및 헬스체크 기능 내장"
    ],
    use_case: "새로운 기술, 라이브러리, 시장 트렌드에 대한 최신 커뮤니티 반응을 즉시 파악할 때",
    tags: ["research-skill", "last30days", "market-intelligence", "trend-analysis"]
  },
  "Leonxlnx/taste-skill": {
    category: "skill",
    title_ko: "taste-skill — AI 에이전트에 감각적인 미적 취향과 품질 기준을 부여하는 스킬",
    catchphrase: "조잡한 UI와 비효율적인 구현을 방지하고 품격 있는 디자인과 코드를 생성하는 스킬",
    summary_ko: "AI가 흔히 범하는 투박하고 촌스러운 디자인 결정, 부자연스러운 여백, 레거시 패턴 작성을 차단하고 높은 수준의 미적 완성도를 유지하도록 강제하는 스킬입니다. 현대적인 타이포그래피, 세련된 컬러 조합, 미니멀한 UI 구조를 자연스럽게 구현하도록 돕습니다.",
    key_features: [
      "모던 디자인 트렌드 및 시각적 위계 질서 가이드라인 적용",
      "저품질 레이아웃 및 낡은 스타일 생성 차단",
      "개발과 디자인 전반의 프리미엄 품질 기준 강제"
    ],
    use_case: "AI가 만들어내는 결과물의 디자인 퀄리티와 코드 세련미를 한 단계 끌어올리고 싶을 때",
    tags: ["design-taste", "aesthetic-guidelines", "claude-skills", "frontend"]
  },
  "alexgreensh/attention-span": {
    category: "skill",
    title_ko: "attention-span — 사람처럼 자연스럽고 핵심적인 어조로 말하게 만드는 출력 스킬",
    catchphrase: "에이전트의 기계적인 말투를 교정하고 직관적이고 친근한 커뮤니케이션 스타일 제공",
    summary_ko: "Claude Code 및 코딩 에이전트의 출력 방식을 사람과의 대화처럼 자연스럽고 간결하게 교정해주는 스타일링 스킬입니다. 장황한 독백을 줄이고 핵심 위주의 대화식 인터페이스를 제공하여 사용자의 인지 피로도를 줄여줍니다.",
    key_features: [
      "자연스러운 인간형 커뮤니케이션 톤앤매너 설정",
      "장황한 기계적 서술 및 중복 설명 필터링",
      "개발 집중도를 높이는 집중력 친화적 출력 포맷"
    ],
    use_case: "에이전트와의 장시간 페어 프로그래밍 시 피로감 없이 편안하게 소통하고 싶을 때",
    tags: ["communication-style", "natural-output", "claude-skills", "productivity"]
  },
  "Panniantong/Agent-Reach": {
    category: "mcp",
    title_ko: "Agent-Reach — 트위터, 레딧, 유튜브, 깃허브를 API 비용 없이 검색하는 웹 리치 도구",
    catchphrase: "단 하나의 CLI로 인터넷 전역의 정보를 에이전트에게 실시간 공급하는 통합 도구",
    summary_ko: "AI 에이전트가 트위터(X), 레딧, 유튜브, 깃허브, 빌리빌리, 샤오홍슈 등 글로벌 플랫폼의 공개 콘텐츠를 별도 유료 API 없이 실시간 검색하고 읽을 수 있도록 지원하는 웹 정보 수집 MCP/CLI 도구입니다.",
    key_features: [
      "트위터·레딧·유튜브·깃허브 등 주요 플랫폼 통합 조회",
      "유료 API 키 없이 공개 웹 데이터 즉시 검색",
      "에이전트가 이해하기 쉬운 구조화된 마크다운 변환"
    ],
    use_case: "에이전트가 외부 최신 웹 정보나 소셜 미디어 트렌드를 직접 검색하고 분석할 때",
    tags: ["web-search", "social-intelligence", "mcp-tool", "open-data"]
  },
  "nextlevelbuilder/ui-ux-pro-max-skill": {
    category: "skill",
    title_ko: "ui-ux-pro-max-skill — 전문가 수준의 디자인 지능을 제공하는 종합 UI/UX 스킬",
    catchphrase: "84개 디자인 스타일, 192개 색상 팔레트, 74개 폰트 페어링을 아우르는 UI 가이드",
    summary_ko: "AI 에이전트가 단순한 MVP 수준을 넘어 감탄을 자아내는 프리미엄 웹/앱 인터페이스를 제작할 수 있도록 돕는 방대한 UI/UX 지능 데이터베이스입니다. 모던 글래스모피즘, 네오 브루탈리즘 등 84가지 스타일과 디자인 토큰, 접근성(a11y) 가이드라인을 제공합니다.",
    key_features: [
      "84개 디자인 스타일 및 192개 하모니 색상 팔레트 내장",
      "Tailwind, shadcn/ui, GSAP 등 22개 주요 프론트엔드 스택 대응",
      "WCAG 접근성 기준 및 마이크로 인터랙션 모범 가이드 제공"
    ],
    use_case: "밋밋한 웹 앱 UI를 트렌디하고 세련된 프리미엄 디자인으로 즉각 업그레이드할 때",
    tags: ["ui-ux", "design-system", "claude-skills", "tailwind"]
  },
  "Graphify-Labs/graphify": {
    category: "agent",
    title_ko: "graphify — 모든 코드베이스와 문서를 탐색 가능한 지식 그래프로 변환하는 도구",
    catchphrase: "코드, DB 스키마, 기술 문서, PDF를 연결하여 영구적 코드 지능을 제공하는 그래프 엔진",
    summary_ko: "방대한 코드베이스와 설정 파일, SQL 스키마, 기술 문서를 유기적으로 연결된 지식 그래프로 변환해주는 지능형 분석 도구입니다. 커뮤니티 탐지 및 중심 노드 분석을 통해 복잡한 프로젝트의 아키텍처와 호출 관계를 직관적으로 탐색할 수 있습니다.",
    key_features: [
      "코드베이스 및 문서의 자동 지식 그래프 모델링",
      "심볼 관계·의존성 경로·아키텍처 영향도 실시간 질의",
      "에이전트 세션 간 지식 유지 및 영구 컨텍스트 제공"
    ],
    use_case: "처음 접하는 복잡한 대형 코드베이스의 구조와 데이터 흐름을 빠르게 파악할 때",
    tags: ["knowledge-graph", "code-intelligence", "architecture", "graphify"]
  },
  "DeusData/codebase-memory-mcp": {
    category: "mcp",
    title_ko: "codebase-memory-mcp — 초고속 코드베이스 인덱싱과 심볼 검색을 지원하는 MCP 서버",
    catchphrase: "대규모 프로젝트 코드를 실시간 인덱싱하여 정확한 참조와 심볼 탐색을 제공하는 서버",
    summary_ko: "대규모 코드베이스 전체를 지연 없이 인덱싱하여 LLM 에이전트가 함수 정의, 타입 선언, 참조 관계를 빠르고 정확하게 찾을 수 있도록 돕는 고성능 MCP 서버입니다. 불필요한 전체 파일 읽기를 줄이고 필요한 코드 조각만을 정확하게 에이전트에게 공급합니다.",
    key_features: [
      "초고속 로컬 심볼 및 AST 기반 코드 인덱싱",
      "정확한 크로스 레퍼런스 및 정의 탐색 API",
      "에이전트의 불필요한 파일 스캔 최소화"
    ],
    use_case: "수천 개의 소스 파일이 있는 대형 프로젝트에서 에이전트가 정확한 코드 위치를 찾을 때",
    tags: ["code-search", "mcp-server", "code-intelligence", "symbol-indexer"]
  },
  "router-for-me/CLIProxyAPI": {
    category: "mcp",
    title_ko: "CLIProxyAPI — 다양한 터미널 AI 도구를 표준 OpenAI/Anthropic API로 변환하는 프록시",
    catchphrase: "Antigravity, Codex, Claude Code를 단일 API 엔드포인트로 래핑하는 개발자 도구",
    summary_ko: "Antigravity, Codex, Claude Code, Grok 등 다양한 CLI 기반 AI 코딩 도구들을 표준 OpenAI 및 Anthropic 호환 API 엔드포인트로 래핑해주는 프록시 서버입니다. 기존의 서드파티 IDE나 확장 프로그램에서 터미널 기반 도구들의 성능을 API 형태로 호출할 수 있게 해줍니다.",
    key_features: [
      "표준 OpenAI/Anthropic API 호환 규격 완벽 제공",
      "다양한 터미널 CLI 에이전트의 백엔드 통합 프록시화",
      "스트리밍 응답 및 세션 컨텍스트 안정적 유지"
    ],
    use_case: "터미널 전용 코딩 에이전트 기능을 REST API 형태로 다른 애플리케이션에 연동할 때",
    tags: ["cli-proxy", "api-wrapper", "openai-proxy", "claude-code"]
  },
  "ruvnet/metaharness": {
    category: "harness",
    title_ko: "metaharness — 나만의 맞춤형 브랜드 에이전트 하네스를 즉시 생성하는 메타 도구",
    catchphrase: "npx CLI, MCP 서버, 메모리, 학습 루프를 갖춘 전용 에이전트 하네스 스캐폴딩 엔진",
    summary_ko: "자신만의 도메인 특화 AI 에이전트 하네스를 빠르게 구축할 수 있도록 돕는 스캐폴딩 프레임워크입니다. npx CLI 실행 환경, 전용 MCP 서버, 지속 메모리 계층, 자가 학습 루프가 포함된 완성형 하네스 템플릿을 몇 분 만에 생성할 수 있습니다.",
    key_features: [
      "독립 실행형 npx CLI 및 전용 MCP 서버 보일러플레이트 자동 생성",
      "지속 메모리(Memory) 및 학습 루프 아키텍처 기본 탑재",
      "기업 및 프로젝트 맞춤형 브랜딩 지원"
    ],
    use_case: "자체 팀이나 서비스를 위한 전용 코딩 에이전트 도구를 신속하게 개발하고 배포할 때",
    tags: ["meta-harness", "scaffolding", "developer-tools", "agent-framework"]
  },
  "nexu-io/open-design": {
    category: "mcp",
    title_ko: "open-design — 로컬 우선 데스크톱 환경의 오픈소스 Claude Design 대안",
    catchphrase: "코딩 에이전트를 전문 디자이너로 만들어주는 오픈소스 비주얼 디자인 플러그인",
    summary_ko: "DeepSeek Harness 및 Claude Code 사용자를 위한 로컬 우선(Local-first) 오픈소스 디자인 에디터입니다. 코딩 에이전트가 직접 UI 캔버스에 벡터 컴포넌트와 화면 레이아웃을 그리고 실시간으로 코드로 추출할 수 있는 차세대 디자인 환경을 제공합니다.",
    key_features: [
      "로컬 퍼스트 데스크톱 기반의 지연 없는 디자인 캔버스",
      "에이전트와의 실시간 UI/UX 양방향 코드 생성 및 동기화",
      "Claude Design 스타일의 직관적인 컴포넌트 워크플로우"
    ],
    use_case: "에이전트와 함께 웹 앱의 시각 디자인과 코드를 동시에 로컬에서 작업할 때",
    tags: ["open-design", "claude-design-alternative", "mcp-tool", "ui-ux"]
  },
  "wanshuiyin/Auto-claude-code-research-in-sleep": {
    category: "skill",
    title_ko: "Auto-claude-code-research-in-sleep — 수면 중에도 에이전트가 스스로 연구를 지속하는 ARIS 스킬",
    catchphrase: "순수 마크다운 기반으로 밤샘 자율 리서치 및 문서화를 수행하는 경량 스킬",
    summary_ko: "개발자가 잠든 밤 사이에도 AI 에이전트가 지정된 주제나 코드베이스에 대한 심층 리서치, 가설 검증, 실험 기록, 기술 문서 정리를 자율적으로 수행하는 ARIS(Auto-Research-In-Sleep) 스킬셋입니다. 가벼운 순수 마크다운 방식으로 동작합니다.",
    key_features: [
      "순수 마크다운 기반의 가벼운 자율 리서치 루프",
      "장시간 무인 실행 및 단계별 진행 보고서 자동 생성",
      "에이전트 스스로 하위 질문을 생성하고 탐색하는 재귀적 조사"
    ],
    use_case: "퇴근 후나 취침 시간에 에이전트에게 방대한 기술 조사와 문서 작성을 맡겨둘 때",
    tags: ["aris", "sleep-research", "claude-skills", "autonomous-study"]
  },
  "santifer/career-ops": {
    category: "agent",
    title_ko: "career-ops — 채용 공고 스캔부터 맞춤형 이력서 작성까지 자동화하는 오픈소스 AI 구직 에이전트",
    catchphrase: "채용 포털을 크롤링하고 A-H 등급 평가 및 이력서 최적화를 수행하는 커리어 도구",
    summary_ko: "채용 포털의 공고들을 자동으로 스캔하여 사용자의 경력과 역량에 맞춰 A~H 등급의 구조화된 분석 리포트를 생성해주는 오픈소스 AI 구직 에이전트입니다. 공고별 요구사항에 완벽히 부합하도록 이력서(CV)를 맞춤형으로 튜닝하고 지원 현황을 추적합니다.",
    key_features: [
      "글로벌 채용 포털 공고 자동 수집 및 적합도 1~5점 평가",
      "공고별 맞춤형 이력서 및 커버레터 자동 최적화",
      "지원 현황 및 인터뷰 일정 통합 트래킹 파이프라인"
    ],
    use_case: "수많은 개발자 채용 공고를 분석하고 맞춤 이력서를 체계적으로 준비할 때",
    tags: ["career-ops", "job-search", "resume-optimizer", "ai-agent"]
  },
  "bawadou/ai-data-extractor": {
    category: "skill",
    title_ko: "ai-data-extractor — 다양한 AI 코딩 어시스턴트의 대화 이력을 추출하는 오픈소스 도구",
    catchphrase: "Claude Code, Cursor, Copilot 등의 대화 로그와 작업 히스토리를 데이터로 변환",
    summary_ko: "Claude Code, Cursor, GitHub Copilot 등 여러 AI 코딩 도구에 흩어져 있는 대화 내역과 코드 생성 기록을 구조화된 JSON/마크다운 형식으로 깔끔하게 추출해주는 오픈소스 도구입니다. 과거의 작업 지식과 트러블슈팅 내역을 자산화할 수 있습니다.",
    key_features: [
      "다양한 AI 코딩 도구의 세션 및 대화 로그 완벽 파싱",
      "정형화된 JSON 및 검색 가능한 마크다운 문서 변환",
      "로컬 데이터베이스 또는 옵시디언 등 외부 지식 관리 도구 연동"
    ],
    use_case: "여러 AI 도구로 작업한 개발 기록과 대화 로그를 한곳에 백업하고 아카이빙할 때",
    tags: ["data-extractor", "chat-history", "knowledge-management", "developer-tools"]
  },
  "addyosmani/agent-skills": {
    category: "skill",
    title_ko: "agent-skills — 프로덕션 레벨의 완성도를 보장하는 구글 엔지니어의 에이전트 스킬셋",
    catchphrase: "Addy Osmani가 공개한 상용 서비스 수준의 안정적인 소프트웨어 엔지니어링 스킬",
    summary_ko: "Google 엔지니어링 리더 Addy Osmani가 설계한 실무 프로덕션용 AI 코딩 에이전트 스킬 라이브러리입니다. 코드 리팩토링, 성능 프로파일링, 자동화된 테스트 커버리지 확보 등 현업 개발 기준에 부합하는 엄격한 엔지니어링 모범 사례를 에이전트에 이식합니다.",
    key_features: [
      "상용 소프트웨어 개발 기준의 엄격한 엔지니어링 가이드라인",
      "웹 성능 최적화, 코드 스플리팅, 접근성 자동 검증",
      "견고한 유닛 및 통합 테스트 코드 생성 패턴 내장"
    ],
    use_case: "에이전트가 작성하는 코드를 엔터프라이즈 수준의 높은 완성도와 품질로 유지할 때",
    tags: ["production-grade", "engineering-skills", "claude-skills", "best-practices"]
  },
  "koala73/worldmonitor": {
    category: "agent",
    title_ko: "worldmonitor — 글로벌 뉴스와 지정학적 이벤트를 실시간 분석하는 AI 인텔리전스 대시보드",
    catchphrase: "전 세계 뉴스 피드와 시장 데이터를 수집하여 AI 기반으로 인사이트를 브리핑",
    summary_ko: "전 세계 주요 외신, 경제 뉴스, 지정학적 이슈를 실시간으로 수집하고 AI가 핵심 영향을 요약해주는 글로벌 인텔리전스 모니터링 시스템입니다. 실시간 데이터 스트림을 분석하여 급변하는 글로벌 트렌드를 한눈에 파악할 수 있도록 돕습니다.",
    key_features: [
      "글로벌 뉴스 및 시장 데이터 실시간 집계 대시보드",
      "AI 기반의 다국어 뉴스 번역 및 핵심 영향도 요약",
      "주요 이벤트 발생 시 실시간 알림 및 트렌드 시각화"
    ],
    use_case: "전 세계 기술 및 경제 트렌드의 거시적 흐름을 실시간으로 모니터링하고 싶을 때",
    tags: ["intelligence-dashboard", "global-news", "market-analysis", "real-time"]
  },
  "thedotmack/claude-mem": {
    category: "mcp",
    title_ko: "claude-mem — 세션이 바뀌어도 작업 맥락을 기억하는 에이전트 영구 메모리 MCP",
    catchphrase: "이전 세션의 대화, 결정 사항, 프로젝트 히스토리를 캡처하여 연속성을 보장하는 메모리",
    summary_ko: "Claude Code 세션이 종료되거나 새로 시작되어도 이전의 작업 내역, 해결했던 이슈, 아키텍처 결정 사항을 잊지 않고 기억하도록 지원하는 영구 메모리 MCP 서버입니다. 매번 컨텍스트를 다시 설명할 필요 없이 이전 작업의 연속선상에서 곧바로 개발을 이어갈 수 있습니다.",
    key_features: [
      "세션 간 자동 맥락 저장 및 관련 지식 인덱싱",
      "프로젝트별 핵심 결정 사항 및 트러블슈팅 이력 관리",
      "MCP 기반의 간편한 연동 및 지연 없는 질의"
    ],
    use_case: "새 세션을 시작할 때마다 프로젝트 배경을 다시 설명하는 번거로움을 없애고 싶을 때",
    tags: ["persistent-memory", "mcp-server", "context-management", "claude-code"]
  },
  "NousResearch/hermes-agent": {
    category: "agent",
    title_ko: "hermes-agent — 사용자의 워크플로우에 맞춰 자가 적응하고 성장하는 오픈 에이전트",
    catchphrase: "도구 활용과 복합 추론 능력을 갖추고 도메인에 맞게 지속 진화하는 AI 에이전트",
    summary_ko: "Nous Research에서 개발한 오픈소스 자율 에이전트 프레임워크입니다. 다양한 도구를 유연하게 연동하고 실패 시 스스로 전략을 수정하는 고급 추론 루프를 갖추고 있습니다. 로컬 모델부터 최상위 클라우드 LLM까지 폭넓게 구동되며 사용자 맞춤형 워크플로우에 최적화됩니다.",
    key_features: [
      "고급 함수 호출 및 다단계 도구 체이닝 추론",
      "오픈 가중치 모델과 독점 LLM 모두를 지원하는 유연성",
      "개발자의 특화된 작업 방식에 맞춘 자가 적응 기능"
    ],
    use_case: "폐쇄형 상용 에이전트 대신 자유롭게 커스텀 가능한 강력한 오픈 에이전트를 구축할 때",
    tags: ["hermes", "autonomous-agent", "open-source", "reasoning"]
  },
  "JuliusBrussee/caveman": {
    category: "skill",
    title_ko: "caveman — 핵심만 전달하여 토큰 소모를 극적으로 줄여주는 원시인 압축 통신 스킬",
    catchphrase: "불필요한 미사여구를 제거하고 초압축 텍스트로 LLM 컨텍스트 윈도우를 아끼는 기법",
    summary_ko: "AI 에이전트와의 상호작용에서 예의상 붙는 장황한 인사말, 군더더기 서론, 반복적인 설명을 제거하여 최소한의 토큰으로 최대의 정보만을 주고받도록 설계된 스킬입니다. 빠르고 직관적인 작업 흐름을 유지하면서 LLM 사용 비용과 컨텍스트 윈도우 낭비를 크게 줄여줍니다.",
    key_features: [
      "불필요한 문맥 및 의례적 텍스트 90% 이상 압축",
      "핵심 액션과 코드 중심의 초간결 통신 모드",
      "장시간 에이전트 세션에서 컨텍스트 소진 방지"
    ],
    use_case: "에이전트의 긴 설명 없이 오직 핵심 결과와 변경 사항만 빠르게 확인하고 싶을 때",
    tags: ["token-saver", "caveman-mode", "claude-skills", "efficiency"]
  },
  "Egonex-AI/Understand-Anything": {
    category: "agent",
    title_ko: "Understand-Anything — 복잡한 코드를 직관적인 인터랙티브 학습 다이어그램으로 변환",
    catchphrase: "단순히 멋진 그래프가 아닌, 실제로 이해하고 배울 수 있는 코드 멘탈 모델 제공",
    summary_ko: "이해하기 어려운 복잡한 레거시 코드베이스나 알고리즘을 사용자가 단계별로 탐색하며 배울 수 있는 인터랙티브 학습 다이어그램으로 변환해주는 지능형 분석 도구입니다. 코드의 실행 흐름과 핵심 개념을 시각적으로 명쾌하게 풀어냅니다.",
    key_features: [
      "복잡한 코드 구조의 인터랙티브 개념 다이어그램 생성",
      "단계별 실행 흐름 및 데이터 변환 과정 시각화",
      "초심자부터 전문가까지 수준별 개념 설명 지원"
    ],
    use_case: "이해하기 난해한 라이브러리나 대규모 시스템의 내부 동작 원리를 빠르게 학습할 때",
    tags: ["code-visualization", "learning-tool", "mental-model", "architecture"]
  },
  "rtk-ai/rtk": {
    category: "harness",
    title_ko: "rtk — 일반 개발 명령어 출력을 압축하여 토큰을 60~90% 절감하는 CLI 프록시",
    catchphrase: "git, cargo, npm 등의 장황한 CLI 출력을 AI가 이해하기 쉬운 형태로 압축하는 도구",
    summary_ko: "코딩 에이전트가 터미널 명령어를 실행할 때 발생하는 방대한 로그(빌드 출력, git log, 패키지 설치 로그 등)를 실시간으로 필터링하고 압축해주는 CLI 프록시 도구입니다. 에이전트가 꼭 알아야 할 핵심 상태와 에러 메시지만 선별하여 전달함으로써 토큰 소비를 60~90% 대폭 절감합니다.",
    key_features: [
      "주요 빌드/패키지/테스트 도구 출력 실시간 압축",
      "불필요한 진행 표시줄 및 중복 로그 지능형 제거",
      "에이전트 컨텍스트 절약 및 응답 속도 비약적 향상"
    ],
    use_case: "대형 프로젝트 빌드나 테스트 로그로 인해 에이전트 컨텍스트가 순식간에 차는 것을 막을 때",
    tags: ["token-compression", "cli-proxy", "developer-tools", "cost-saving"]
  },
  "farion1231/cc-switch": {
    category: "mcp",
    title_ko: "cc-switch — 여러 AI 코딩 도구의 설정을 원클릭 전환하는 올인원 매니저",
    catchphrase: "크로스 플랫폼 데스크톱 GUI로 AI 코딩 어시스턴트의 프로필과 프롬프트 설정을 간편 관리",
    summary_ko: "Claude Code, Codex, Cursor, Cline 등 다양한 AI 코딩 도구의 프롬프트 프로필, API 키, MCP 서버 구성을 하나의 GUI 환경에서 원클릭으로 전환할 수 있는 크로스 플랫폼 데스크톱 유틸리티입니다.",
    key_features: [
      "다중 AI 코딩 도구 설정 및 프로필 원클릭 전환",
      "프로젝트별 커스텀 프롬프트 및 MCP 서버 프리셋 관리",
      "직관적이고 깔끔한 크로스 플랫폼 데스크톱 UI"
    ],
    use_case: "여러 AI 코딩 어시스턴트 환경을 프로젝트마다 빠르게 스위칭하며 작업할 때",
    tags: ["cc-switch", "profile-manager", "claude-code", "desktop-utility"]
  },
  "affaan-m/ECC": {
    category: "harness",
    title_ko: "ECC — Claude Code 및 하네스의 성능과 직관을 극대화하는 최적화 시스템",
    catchphrase: "스킬 로딩 속도 향상, 직관적 프롬프트 라우팅, 에이전트 반응성을 최적화하는 도구",
    summary_ko: "Claude Code 및 다양한 에이전트 하네스의 실행 성능을 최상으로 끌어올리는 최적화 프레임워크입니다. 불필요한 스킬 로딩 오버헤드를 줄이고 상황에 맞는 직관(instincts)을 빠르게 주입하여 에이전트의 응답 지연 시간과 판단 오류를 최소화합니다.",
    key_features: [
      "에이전트 스킬 로딩 및 메모리 소비 최적화",
      "상황별 직관적 프롬프트 자동 라우팅 시스템",
      "하네스 실행 속도 및 반응성 비약적 향상"
    ],
    use_case: "에이전트의 스킬 실행 속도를 높이고 불필요한 지연 시간을 단축하고 싶을 때",
    tags: ["harness-optimization", "agent-performance", "claude-code", "instincts"]
  },
  "garrytan/gstack": {
    category: "skill",
    title_ko: "gstack — Y Combinator 대표 Garry Tan의 23가지 Claude Code 개발 환경 셋업",
    catchphrase: "CEO, 디자이너, 엔지니어링 매니저, QA 역할을 수행하는 23개의 검증된 풀스택 도구 모음",
    summary_ko: "YC CEO Garry Tan이 실제 프로덕션 개발에서 사용하는 Claude Code 도구 모음입니다. 기획(CEO), UI/UX 디자인, 백엔드 아키텍처, 릴리즈 관리, QA 테스트까지 소프트웨어 개발의 전 단계를 아우르는 23가지 도구가 완벽하게 사전 구성되어 있습니다.",
    key_features: [
      "Garry Tan의 실전 프로덕션 Claude Code 구성 100% 재현",
      "기획·디자인·엔지니어링·QA 4대 영역 맞춤 툴셋 제공",
      "빠른 스타트업 MVP 개발 및 제품 출시에 최적화"
    ],
    use_case: "실리콘밸리 최고 수준의 검증된 풀스택 Claude Code 개발 파이프라인을 그대로 도입할 때",
    tags: ["garry-tan", "gstack", "claude-skills", "startup-stack"]
  },
  "anthropics/claude-code": {
    category: "agent",
    title_ko: "claude-code — 터미널에서 동작하는 Anthropic의 공식 AI 에이전트 코딩 어시스턴트",
    catchphrase: "코드베이스를 완벽히 이해하고 터미널에서 직접 편집, 실행, 디버깅을 수행하는 에이전트",
    summary_ko: "Anthropic이 공식 개발한 터미널 기반 에이전트형 코딩 도구입니다. 자연어 지시를 바탕으로 로컬 파일 시스템을 탐색하고, 복잡한 코드베이스의 아키텍처를 파악하며, 직접 빌드 및 테스트를 실행하고 버그를 수정합니다.",
    key_features: [
      "터미널 기반의 완벽한 코드베이스 탐색 및 편집 자동화",
      "도구 실행·테스트 실행·깃 커밋 등 개발 전 과정 네이티브 지원",
      "Anthropic Claude 최신 추론 모델의 강력한 코딩 성능"
    ],
    use_case: "터미널 CLI 환경에서 AI 에이전트와 완벽하게 페어 프로그래밍을 진행할 때",
    tags: ["claude-code", "official-agent", "anthropic", "terminal-tool"]
  },
  "n8n-io/n8n": {
    category: "harness",
    title_ko: "n8n — 네이티브 AI 기능을 탑재한 강력한 오픈소스 워크플로우 자동화 플랫폼",
    catchphrase: "수백 가지 서비스와 LLM 에이전트를 연결하여 복잡한 비즈니스 로직을 시각적으로 자동화",
    summary_ko: "전 세계 수만 개의 기업에서 활용 중인 오픈소스 노코드/로우코드 워크플로우 자동화 플랫폼입니다. 네이티브 AI 노드와 랑체인(LangChain) 연동을 통해 다양한 LLM, 벡터 DB, 외부 SaaS API를 결합한 지능형 자동화 파이프라인을 시각적으로 손쉽게 구축할 수 있습니다.",
    key_features: [
      "400개 이상의 서비스 노드 및 커스텀 JS/Python 스크립트 실행",
      "네이티브 AI 에이전트, 벡터 메모리, LLM 라우팅 노드 지원",
      "완전한 셀프 호스팅 및 온프레미스 보안 환경 제공"
    ],
    use_case: "다양한 외부 SaaS 서비스와 AI 모델을 엮어 엔드투엔드 비즈니스 자동화를 구축할 때",
    tags: ["workflow-automation", "n8n", "ai-integration", "open-source"]
  },
  "google-gemini/gemini-cli": {
    category: "agent",
    title_ko: "gemini-cli — Google Gemini 모델의 초고속 추론 성능을 터미널로 가져오는 오픈 에이전트",
    catchphrase: "대용량 컨텍스트 윈도우와 빠른 속도를 바탕으로 터미널에서 코딩 및 리서치를 수행",
    summary_ko: "Google의 최신 Gemini 모델들을 터미널 CLI 환경에서 직접 활용할 수 있도록 지원하는 오픈소스 AI 에이전트 도구입니다. 수백만 토큰에 달하는 방대한 컨텍스트 윈도우를 활용해 대형 문서와 코드베이스를 즉각 분석하고 작업을 수행합니다.",
    key_features: [
      "Gemini 2.5 Flash/Pro 모델의 대용량 컨텍스트 활용",
      "초고속 스트리밍 응답 및 터미널 네이티브 인터페이스",
      "로컬 파일 분석 및 멀티모달 프롬프트 지원"
    ],
    use_case: "방대한 문서나 대용량 코드베이스를 대규모 컨텍스트 윈도우로 한 번에 분석할 때",
    tags: ["gemini-cli", "google-gemini", "terminal-agent", "large-context"]
  },
  "D4Vinci/Scrapling": {
    category: "skill",
    title_ko: "Scrapling — 차단 우회와 핑거프린트 위장을 지원하는 차세대 적응형 웹 스크래핑 프레임워크",
    catchphrase: "봇 탐지 회피, 동적 JS 렌더링, 구조화된 데이터 추출을 한 번에 해결하는 스크래퍼",
    summary_ko: "현대적인 웹 환경의 복잡한 봇 탐지 시스템(Cloudflare, Akamai 등)을 스마트하게 우회하고 동적 페이지에서 안정적으로 데이터를 긁어올 수 있는 적응형 웹 스크래핑 라이브러리입니다. 에이전트가 웹 리서치를 수행할 때 필수적인 고신뢰도 데이터 추출 파이프라인을 제공합니다.",
    key_features: [
      "고급 브라우저 핑거프린트 위장 및 안티봇 방어벽 우회",
      "초고속 HTML 파싱 및 동적 JavaScript 렌더링 지원",
      "에이전트 맞춤형 클린 텍스트 및 JSON 추출 API"
    ],
    use_case: "차단이 심한 최신 웹사이트나 동적 SPA 페이지의 데이터를 에이전트가 수집할 때",
    tags: ["web-scraping", "anti-bot-bypass", "data-extraction", "python"]
  },
  "boyang-hu/website-rebuild-skill": {
    category: "skill",
    title_ko: "website-rebuild-skill — 웹사이트를 복제하고 압축 코드를 복원 검증하는 에이전트 스킬",
    catchphrase: "대상 사이트의 읽기 전용 미러링부터 난독화 코드 복원 및 자동 diff 검수까지 수행",
    summary_ko: "웹사이트를 정밀하게 클론하고 재구축하는 Claude Code 에이전트 스킬입니다. 대상 웹사이트의 정적 에셋과 구조를 안전하게 캡처한 뒤, 번들링 및 난독화된 자바스크립트/CSS를 가독성 높은 코드로 단계별 복원합니다. 최종 빌드 결과물을 원본과 시각적·구조적 diff로 자동 비교하여 무결성을 검증합니다.",
    key_features: [
      "대상 웹사이트 읽기 전용 미러링 및 구조화 아카이빙",
      "난독화·압축된 프론트엔드 코드의 점진적 가독성 복원",
      "자동 diff 엔진을 통한 원본 대비 결과물 오차 검증"
    ],
    use_case: "레거시 웹사이트를 최신 스택으로 리빌딩하거나 UI 프로토타입을 역공학할 때",
    tags: ["website-rebuild", "agent-skill", "reverse-engineering", "claude-code"]
  },
  "s0xDk/refactoring-ui-skill": {
    category: "skill",
    title_ko: "refactoring-ui-skill — Refactoring UI 디자인 시스템 규칙을 코딩 에이전트에 주입하는 스킬",
    catchphrase: "간격·타이포·색상·그림자 제약 스케일과 시각적 위계를 코딩 에이전트에 체계적으로 적용",
    summary_ko: "Adam Wathan과 Steve Schoger의 명저 Refactoring UI의 실전 디자인 법칙들을 코딩 에이전트가 준수하도록 만든 스킬입니다. 임의의 픽셀 값 대신 엄격한 간격 및 서체 스케일을 강제하고, 폰트 굵기와 색상 대비를 통한 정보 위계 설계, 자연스러운 빛 시뮬레이션을 통한 깊이감 표현을 프론트엔드 코드에 자동으로 반영합니다.",
    key_features: [
      "체계적인 간격·타이포그래피·색상 팔레트 토큰 제약 적용",
      "배경 및 텍스트 대비를 극대화하는 시각적 계층 구조 형성",
      "복잡한 CSS 유틸리티 남용 방지 및 깔끔한 UI 리팩토링"
    ],
    use_case: "엔지니어가 직접 만드는 웹 프론트엔드의 디자인 완성도를 프로 디자이너 수준으로 끌어올릴 때",
    tags: ["refactoring-ui", "design-system", "claude-skills", "ui-ux"]
  },
  "Appllama/appllama-skills": {
    category: "skill",
    title_ko: "appllama-skills — 인기 모바일 앱의 검증된 패턴을 네이티브 화면 코드로 변환하는 스킬",
    catchphrase: "글로벌 톱 매출 앱들의 UX 패턴을 네이티브 모바일 스크린으로 즉시 제작",
    summary_ko: "단순 리서치에 그치지 않고 글로벌 매출 상위 모바일 앱들의 실전 디자인 및 인터랙션 패턴을 네이티브 모바일 코드로 구현해주는 에이전트 스킬셋입니다. 온보딩, 결제 구독 화면, 인터랙티브 피드 등 전환율이 검증된 UI 패턴을 Flutter 및 React Native 코드로 빠르게 생성합니다.",
    key_features: [
      "글로벌 톱 그로싱 앱들의 검증된 인터랙션 패턴 데이터셋 내장",
      "Flutter 및 React Native 네이티브 품질 스크린 즉시 생성",
      "온보딩 및 결제 화면 등 핵심 비즈니스 컴포넌트 특화"
    ],
    use_case: "모바일 앱 MVP 개발 시 검증된 고전환율 UI/UX 화면을 빠르게 구현하고 싶을 때",
    tags: ["mobile-ui", "app-patterns", "native-screens", "agent-skill"]
  },
  "Vincentwei1021/video-talkcraft": {
    category: "skill",
    title_ko: "video-talkcraft — 음성 해설 싱크와 모션 레시피를 결합한 설명 영상 제작 스튜디오 스킬",
    catchphrase: "Claude Code를 설명 영상 모션 디자인 스튜디오로 변환하는 Remotion 기반 스킬",
    summary_ko: "Claude Code와 Codex를 단어 단위 음성 싱크가 완벽한 모션 그래픽 비디오 스튜디오로 탈바꿈시키는 스킬입니다. 78개의 사전 정의된 모션 레시피 카드와 슬라이드쇼 느낌을 탈피한 유기적 카메라 워크 시스템을 제공하며, Remotion 렌더링 엔진과 결합해 고품질 기술 해설 영상을 자동 생성합니다.",
    key_features: [
      "단어 단위(Word-level) 음성 내레이션과 모션 그래픽 정밀 싱크",
      "78가지 전문 모션 레시피 카드 및 동적 카메라 무빙 시스템",
      "React 기반 Remotion 프레임워크를 활용한 프로그래머블 렌더링"
    ],
    use_case: "기술 문서나 제품 릴리스 노트를 유튜브/쇼츠용 모션 설명 영상으로 자동 변환할 때",
    tags: ["video-generation", "remotion", "motion-design", "claude-skills"]
  },
  "vinzdg/codenotch": {
    category: "skill",
    title_ko: "codenotch — 맥북 노치에 코딩 에이전트 사용량과 상태를 띄우는 미니멀 유틸리티",
    catchphrase: "Claude Code, Cursor, Codex, Antigravity 사용량과 작업 진행도를 화면 상단에 상시 고정",
    summary_ko: "맥북 화면 상단의 노치 영역에 작은 블랙 바를 고정하여 다양한 AI 코딩 에이전트의 사용량 한도 소진율과 현재 작업 상태를 실시간 표시하는 Swift 기반 macOS 앱입니다. 터미널 창을 전환하지 않고도 에이전트가 작업 중인지, 사용자 입력을 기다리는지 직관적으로 확인할 수 있습니다.",
    key_features: [
      "맥북 상단 노치 영역에 완벽히 통합되는 미니멀 UI",
      "Claude Code, Cursor, Codex, Antigravity 등 다중 에이전트 한도 추적",
      "호버 툴팁을 통한 즉각적인 세부 지표 확인 및 초경량 자원 소모"
    ],
    use_case: "여러 AI 코딩 도구를 동시에 사용하면서 토큰 소진 상태와 작업 완료를 실시간 모니터링할 때",
    tags: ["macos-app", "notch-monitor", "usage-limits", "swift"]
  },
  "soumatheusgomes/vibe-coding-toolkit": {
    category: "skill",
    title_ko: "vibe-coding-toolkit — 프로덕션 검증을 마친 Claude Code 플러그인 및 오케스트레이션 툴킷",
    catchphrase: "서브에이전트 조율, 품질 게이트, 복사 가능한 실전 프롬프트를 묶은 프로덕션 툴킷",
    summary_ko: "실제 프로덕션 소프트웨어 개발 현장에서 수개월간 검증된 Claude Code 플러그인, 서브에이전트 오케스트레이션 패턴, 자동 품질 게이트 및 즉시 복사 가능한 프롬프트 모음집입니다. 바이브 코딩(Vibe Coding)의 빠른 프로토타이핑 장점과 엄격한 코드 품질 검증을 동시에 달성하도록 설계되었습니다.",
    key_features: [
      "독립적 서브에이전트 병렬 실행 및 역할 분담 워크플로우",
      "코드 배포 전 린트·테스트·보안을 강제하는 자동 품질 게이트",
      "실전에서 반복 검증된 도메인별 최적화 프롬프트 템플릿"
    ],
    use_case: "AI 에이전트를 실무 엔지니어링 파이프라인에 체계적이고 신뢰성 있게 안착시킬 때",
    tags: ["vibe-coding", "subagent-orchestration", "quality-gates", "claude-plugins"]
  },
  "ChromeDevTools/chrome-devtools-mcp": {
    category: "mcp",
    title_ko: "chrome-devtools-mcp — 브라우저 자동화와 검사를 지원하는 공식 Chrome DevTools MCP 서버",
    catchphrase: "AI 코딩 에이전트에게 실제 브라우저 렌더링 검사, 콘솔 디버깅, 성능 프로파일링 권한 부여",
    summary_ko: "Google Chrome 개발자 도구의 강력한 브라우저 디버깅 및 자동화 기능을 Model Context Protocol(MCP)을 통해 에이전트에게 제공하는 공식 서버입니다. DOM 조작, 스크린샷 캡처, 네트워크 요청 추적, 콘솔 로그 조회, 웹 바이탈(LCP 등) 및 접근성(a11y) 감사를 에이전트가 직접 수행할 수 있습니다.",
    key_features: [
      "헤드리스 및 헤드풀 Chrome 브라우저 실시간 제어",
      "콘솔 로그, 네트워크 트래픽, 힙 스냅샷 정밀 분석",
      "Lighthouse 성능 감사 및 웹 접근성 자동 검증"
    ],
    use_case: "코딩 에이전트가 웹 애플리케이션의 UI 버그를 직접 브라우저에서 재현하고 디버깅할 때",
    tags: ["chrome-devtools", "mcp-server", "browser-automation", "debugging"]
  },
  "headroomlabs-ai/headroom": {
    category: "mcp",
    title_ko: "headroom — 에이전트 도구 출력과 로그를 최대 95% 압축하는 지능형 토큰 세이버",
    catchphrase: "도구 실행 결과, 대용량 로그, RAG 청크를 의미 손실 없이 압축하여 토큰 비용과 지연 시간 절감",
    summary_ko: "AI 에이전트가 대용량 도구 출력, 빌드 로그, JSON 데이터, RAG 검색 결과를 LLM 컨텍스트로 전달하기 전에 토큰을 획기적으로 압축해주는 라이브러리이자 MCP 프록시 서버입니다. JSON 데이터의 경우 60~95%, 일반 텍스트는 20% 이상의 토큰을 절감하면서도 동일한 정답 품질을 유지합니다.",
    key_features: [
      "JSON 및 구조화 데이터 대상 60~95% 극적 압축 달성",
      "코딩 에이전트 도구 실행 출력 대상 평균 20% 토큰 절감",
      "라이브러리, 프록시 서버, MCP 서버의 3대 구동 모드 제공"
    ],
    use_case: "대규모 코드베이스 검색이나 긴 로그 분석 시 LLM 컨텍스트 윈도우 초과와 비용을 방지할 때",
    tags: ["token-compression", "context-optimization", "mcp-server", "llm-proxy"]
  }
};

async function callGemini(candidates) {
  if (API_KEY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
      const body = {
        contents: [
          {
            role: "user",
            parts: [{ text: `${PROMPT_RULES}\n\n후보 목록:\n${JSON.stringify(candidates)}` }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return JSON.parse(text);
      } else {
        console.warn(`Gemini API responded with HTTP ${res.status}, falling back to curated knowledge`);
      }
    } catch (e) {
      console.warn(`Gemini API request failed (${e.message}), falling back to curated knowledge`);
    }
  }

  // Fallback: 사전 정의된 지식 베이스 및 정밀 휴리스틱 활용
  const rising = [];
  const classic = [];

  for (const c of candidates) {
    const known = CURATED_KNOWLEDGE[c.id];
    let cat = known?.category || "skill";
    if (!known) {
      const txt = ((c.description || "") + " " + (c.topics || []).join(" ")).toLowerCase();
      if (txt.includes("mcp") || txt.includes("protocol")) cat = "mcp";
      else if (txt.includes("agent")) cat = "agent";
      else if (txt.includes("harness") || txt.includes("eval") || txt.includes("gateway")) cat = "harness";
    }

    const v_score = c.velocity_score || 0;
    const buzz = c.hn && c.hn.length > 0 ? 100 : 0;
    const quality = Math.min(c.stars || 0, 100);
    const recency = (c.created_days_ago != null && c.created_days_ago <= 30) ? 100 : 0;
    const score = Math.round(0.4 * v_score + 0.3 * buzz + 0.2 * quality + 0.1 * recency);

    let status = "classic";
    if (v_score > 50 || recency === 100 || buzz === 100) status = "rising";

    const item = {
      id: c.id,
      category: cat,
      status: status,
      trend_score: score,
      title_ko: known?.title_ko || `${c.name} — ${c.description ? c.description.slice(0, 40) : "유용한 도구"}`,
      catchphrase: known?.catchphrase || (c.description || "생산성을 극대화하는 오픈소스 AI 도구"),
      summary_ko: known?.summary_ko || (c.description || "해당 프로젝트에 대한 설명이 제공되지 않았습니다."),
      key_features: known?.key_features || ["주요 개발 워크플로우 자동화", "오픈소스 에코시스템 호환성", "간편한 설정 및 유연한 통합"],
      use_case: known?.use_case || "개발 생산성과 협업 효율성을 높이고 싶을 때",
      tags: known?.tags || (c.topics ? c.topics.slice(0, 4) : ["ai", "tool"])
    };

    if (status === "rising") rising.push(item);
    else classic.push(item);
  }

  rising.sort((a, b) => b.trend_score - a.trend_score);
  classic.sort((a, b) => b.trend_score - a.trend_score);

  return { rising, classic };
}

function groundTruthMerge(items, candMap, status) {
  const out = [];
  const counts = {};
  for (const item of items || []) {
    const fact = candMap.get(item.id);
    if (!fact) {
      console.warn(`drop hallucinated id: ${item.id}`);
      continue;
    }
    const cat = ["skill", "mcp", "agent", "harness"].includes(item.category)
      ? item.category
      : "skill";
    counts[cat] = (counts[cat] || 0) + 1;
    if (counts[cat] > CAPS[status][cat]) continue;

    const evidence = [];
    if (fact.velocity_7d != null && fact.velocity_7d > 0) {
      evidence.push({
        source: "github",
        url: fact.url,
        label: `최근 7일 +${fact.velocity_7d.toLocaleString()} stars`,
      });
    }
    for (const hn of (fact.hn || []).slice(0, 2)) {
      evidence.push({ source: "hn", url: hn.url, label: `HN ${hn.points}p · ${hn.title}` });
    }
    const sources = ["github", ...(fact.hn?.length ? ["hn"] : [])];
    out.push({
      id: fact.id,
      name: fact.name,
      owner: fact.owner,
      title_ko: String(item.title_ko || fact.name).slice(0, 120),
      official_url: fact.url,
      repo_url: fact.url,
      category: cat,
      score: Number(item.trend_score) || 0,
      trend_score: Number(item.trend_score) || 0,
      stars: fact.stars,
      velocity_7d: fact.velocity_7d,
      velocity_score: fact.velocity_score != null ? Number(fact.velocity_score.toFixed(1)) : null,
      growth_rate: fact.growth_rate != null ? Number(fact.growth_rate.toFixed(4)) : null,
      v7d_estimated: fact.v7d_estimated === true,
      source_count: sources.length,
      sources,
      evidence,
      status,
      catchphrase: String(item.catchphrase || "").slice(0, 150),
      summary_ko: String(item.summary_ko || "").slice(0, 600),
      key_features: (item.key_features || []).slice(0, 3).map(String),
      use_case: String(item.use_case || ""),
      badge: status === "rising" ? "🔥 Rising" : "⭐ Classic",
      badges: [status === "rising" ? "🔥 Rising" : "⭐ Classic"],
      tags: (item.tags || []).slice(0, 5).map(String),
      thumbnail_url: `https://github.com/${fact.owner}.png`,
    });
  }
  return out.sort((a, b) => b.trend_score - a.trend_score);
}

async function main() {
  const { candidates } = JSON.parse(fs.readFileSync(CANDIDATES, "utf8"));
  const candMap = new Map(candidates.map((c) => [c.id, c]));

  let curated;
  try {
    curated = await callGemini(candidates);
  } catch (e) {
    console.warn(`first attempt failed (${e.message}), retrying once...`);
    curated = await callGemini(candidates);
  }

  const rising = groundTruthMerge(curated.rising, candMap, "rising");
  const classic = groundTruthMerge(curated.classic, candMap, "classic");
  if (rising.length + classic.length === 0) {
    console.error("curation produced 0 items — keeping last week's data");
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);
  const latest = {
    generated: today,
    generated_at: today,
    version: `v${today.replaceAll("-", ".")}`,
    rising,
    classic,
  };

  fs.writeFileSync(LATEST, JSON.stringify(latest, null, 2));
  const archivePath = path.join(ROOT, "data", "archive", `${today}.json`);
  fs.mkdirSync(path.dirname(archivePath), { recursive: true });
  fs.writeFileSync(archivePath, JSON.stringify(latest, null, 2));

  // Mirror archive to site/public/data/archive
  const publicArchiveDir = path.join(ROOT, "site", "public", "data", "archive");
  fs.mkdirSync(publicArchiveDir, { recursive: true });
  fs.writeFileSync(path.join(publicArchiveDir, `${today}.json`), JSON.stringify(latest, null, 2));

  console.log(`curated rising=${rising.length} classic=${classic.length} → latest.json + archive/${today}.json`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
