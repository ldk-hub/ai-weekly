const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CANDIDATES_PATH = path.join(ROOT, '.tmp', 'candidates.json');
const OUT_PATH = path.join(ROOT, '.tmp', '04_curated.json');

const raw = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
const candidates = raw.candidates;

// 큐레이션 데이터 사전 (한글화 및 기술적 분석)
const CURATED_DB = {
  "nexu-io/open-design": {
    category: "skill",
    title_ko: "Open Design — Claude/DeepSeek 디자인 생성 엔진",
    catchphrase: "코딩 에이전트를 완전한 UI/UX 디자인 엔진으로 전환하는 로컬 데스크톱 도구",
    summary_ko: "DeepSeek Harness 및 Claude Code와 연동되어 코딩 에이전트가 프로토타입, 랜딩 페이지, 대시보드, 슬라이드, 영상 에셋까지 직접 생성하도록 지원하는 오픈소스 디자인 툴킷입니다. 로컬 우선 데스크톱 환경에서 구동되며 HTML, PDF, PPTX, MP4 등 실제 파일 형태로 즉시 익스포트할 수 있습니다. 20개 이상의 CLI 및 BYOK 모델과 완벽하게 호환됩니다.",
    key_features: [
      "프로토타입, 랜딩페이지, 대시보드 실시간 생성 및 코드 추출",
      "HTML, PDF, PPTX, MP4 등 다중 포맷 내보내기 지원",
      "Claude Code, Codex, Cursor 등 20+ CLI 환경과 연동"
    ],
    use_case: "AI 코딩 에이전트에게 디자인 시스템 구축과 UI 프로토타이핑을 맡기고 싶을 때",
    install_hint: "README 참고 (데스크톱 앱 다운로드 또는 CLI 플러그인 설치)",
    tags: ["ai-design", "claude-code-for-design", "design-systems", "prototyping", "ui-generator"]
  },
  "diegosouzapw/OmniRoute": {
    category: "mcp",
    title_ko: "OmniRoute — 340+ 공급자 통합 무료 AI 게이트웨이 & MCP",
    catchphrase: "단 하나의 엔드포인트로 340개 프로바이더와 1200개 모델을 연결하는 무료 게이트웨이",
    summary_ko: "Claude Code, Codex, Cursor, Cline 등 다양한 에이전트를 위한 MIT 라이선스 오픈소스 AI 게이트웨이입니다. 340개 제공업체와 1,200개 이상의 모델(Kimi, Claude, GPT, Gemini, DeepSeek 등)을 단일 엔드포인트로 라우팅하며, 쿼터 인식 기반 자동 폴백 기능을 갖추고 있습니다. RTK 및 Caveman 압축 알고리즘을 내장하여 토큰 소모량을 15~95%까지 절감합니다.",
    key_features: [
      "340개 프로바이더(90+ 무료) 및 1,200+ 모델 단일 엔드포인트 연결",
      "쿼터 초과 시 무중단 자동 폴백 및 모델 전환",
      "RTK+Caveman 압축으로 15~95% 토큰 절감 내장"
    ],
    use_case: "여러 LLM API 키를 통합 관리하고 에이전트 비용을 획기적으로 줄이고 싶을 때",
    install_hint: "npx omniroute 또는 Docker 컨테이너 실행",
    tags: ["ai-gateway", "mcp", "token-saver", "claude-code", "free-ai"]
  },
  "DietrichGebert/ponytail": {
    category: "skill",
    title_ko: "Ponytail — 과도한 엔지니어링을 막는 시니어 개발자 사고 스킬",
    catchphrase: "가장 좋은 코드는 작성하지 않은 코드다: AI 에이전트의 불필요한 코드 생성을 방지",
    summary_ko: "AI 에이전트가 사소한 기능 하나를 구현하기 위해 과도한 추상화나 불필요한 아키텍처를 도입하는 문제를 막아주는 Claude Code 전용 스킬입니다. 마치 팀 내에서 가장 실용적인 시니어 개발자처럼 생각하도록 프롬프팅 가이드라인을 주입하여, 최소한의 코드로 요구사항을 만족시키도록 강제합니다. 복잡성을 사전에 차단하여 유지보수 비용을 크게 낮춥니다.",
    key_features: [
      "과도한 추상화 및 보일러플레이트 코드 생성 사전 방지",
      "단순성과 직접적인 구현을 최우선으로 하는 개발 원칙 주입",
      "YAGNI(You Aren't Gonna Need It) 및 KISS 원칙 철저 적용"
    ],
    use_case: "에이전트가 간단한 버그 수정에 수백 줄의 불필요한 유틸리티를 추가하는 것을 막고 싶을 때",
    install_hint: "npx @anthropic/claude-code add-skill DietrichGebert/ponytail",
    tags: ["agent-skills", "claude-code-plugin", "simplicity", "code-quality", "senior-dev"]
  },
  "AMAP-ML/LongHorizon-Harness": {
    category: "harness",
    title_ko: "LongHorizon-Harness — 장기 컴퓨터 사용 에이전트 하네스",
    catchphrase: "데스크톱 앱 전반에서 수백 단계의 복합 작업을 수행하는 장기 실행 하네스",
    summary_ko: "단기 명령 처리를 넘어 데스크톱 애플리케이션 전반에서 수십~수백 단계에 걸친 복잡한 워크플로우를 자율적으로 실행할 수 있도록 설계된 Computer-Use 에이전트 하네스입니다. 단계별 컨텍스트 유실을 방지하는 상태 복원 메커니즘과 비동기 오류 복구 루프를 내장하여 긴 호흡의 컴퓨터 제어 작업을 안정적으로 완수합니다.",
    key_features: [
      "수백 단계에 달하는 장기 컴퓨터 제어 워크플로우 지원",
      "오류 발생 시 자동 복구 및 이전 체크포인트 롤백 기능",
      "다양한 데스크톱 GUI 환경 및 OS API 제어 인터페이스"
    ],
    use_case: "소프트웨어 설치부터 데이터 처리, 리포트 생성까지 여러 프로그램을 거치는 긴 작업을 자동화할 때",
    install_hint: "git clone 후 pip install -e . 또는 README 가이드 참조",
    tags: ["agent-harness", "computer-use", "long-horizon", "gui-automation", "agentic-ai"]
  },
  "makecindy/cindy": {
    category: "agent",
    title_ko: "Cindy — 설정 없이 즉시 동작하는 올인원 코딩 에이전트",
    catchphrase: "복잡한 환경 설정 없이 실행 즉시 업무를 해결하는 경량 오픈소스 AI 에이전트",
    summary_ko: "개발자가 별도의 복잡한 의존성 설치나 환경 설정 없이 터미널에서 즉시 실행하여 버그 수정, 리팩토링, 기능 구현을 요청할 수 있는 오픈소스 코딩 에이전트입니다. 간결한 아키텍처와 빠른 피드백 루프를 제공하며, 로컬 파일 시스템 및 Git 상태를 신속하게 파악하여 직관적인 개발 경험을 제공합니다.",
    key_features: [
      "별도 복잡한 설정 없이 단일 명령어로 즉시 구동",
      "로컬 코드베이스 고속 색인 및 변경 사항 자동 스테이징",
      "명확한 실행 계획 수립 및 단계별 검증 루프"
    ],
    use_case: "무거운 프레임워크 설정 없이 바로 가볍게 코딩 보조 에이전트를 띄우고 싶을 때",
    install_hint: "npm install -g cindy-ai 또는 npx cindy",
    tags: ["ai-agents", "coding-agent", "cli", "out-of-the-box", "productivity"]
  },
  "QoderAI/better-harness": {
    category: "harness",
    title_ko: "Better Harness — 루프 레벨 인사이트 기반 에이전트 하네스",
    catchphrase: "세션 증거와 프로젝트 로그를 에이전트 반복 개선 인사이트로 변환하는 하네스",
    summary_ko: "프로젝트 진행 과정과 에이전트 세션 로그에서 수집된 실행 증거를 바탕으로 에이전트의 실행 루프를 실시간 최적화하는 지능형 하네스입니다. 도구 호출 실패, 문맥 누락, 환각 패턴을 스스로 학습하여 다음 루프 실행 시 프롬프트와 컨텍스트 주입 방식을 동적으로 조정합니다.",
    key_features: [
      "에이전트 실행 로그 분석을 통한 루프 레벨 성능 최적화",
      "도구 호출 실패율 저감 및 컨텍스트 적응형 주입",
      "Claude Code 및 타 오픈소스 에이전트 런타임과 손쉬운 결합"
    ],
    use_case: "에이전트가 반복적으로 겪는 실패 패턴을 분석하고 성공률을 체계적으로 높이고자 할 때",
    install_hint: "README.md의 설치 및 설정 가이드 참조",
    tags: ["agent-harness", "loop-optimization", "observability", "evals", "claude-code"]
  },
  "gakonst/nanocodex": {
    category: "agent",
    title_ko: "nanocodex — Rust 기반 고성능 프론티어 에이전트 빌딩 블록",
    catchphrase: "초경량·초고속 Rust 언어로 구축된 모듈형 AI 코딩 에이전트 코어",
    summary_ko: "Paradigm 창업자 Georgios Konstantopoulos(gakonst)가 공개한 Rust 기반의 미니멀 에이전트 빌딩 블록입니다. 불필요한 추상화를 제거하고 고성능 비동기 런타임을 통해 도구 호출, 파일 탐색, 모델 API 통신을 극도로 빠른 속도로 처리합니다. 커스텀 코딩 에이전트를 구축하려는 개발자에게 이상적인 레퍼런스를 제공합니다.",
    key_features: [
      "Rust 기반의 극도로 가볍고 빠른 비동기 에이전트 코어",
      "최소한의 추상화로 직관적인 확장 및 도구 바인딩 지원",
      "OpenAI Codex 및 Claude API 고속 스트리밍 지원"
    ],
    use_case: "고성능 네이티브 바이너리 형태의 커스텀 코딩 에이전트를 개발하고 싶을 때",
    install_hint: "cargo install nanocodex 또는 소스 빌드",
    tags: ["rust", "coding-agent", "frontier-ai", "low-latency", "agent-core"]
  },
  "Prism-Shadow/penguin-harness": {
    category: "harness",
    title_ko: "Penguin Harness — AI가 AI를 구축하는 재귀적 자기개선 하네스",
    catchphrase: "RSI(Recursive Self-Improvement)를 지향하는 AI 빌드 자동화 하네스",
    summary_ko: "에이전트가 자신의 도구, 스킬, 프롬프트를 스스로 테스트하고 개선해 나가는 재귀적 자기개선(Recursive Self-Improvement) 구조를 구현한 오픈소스 하네스입니다. 지속적인 벤치마크 평가를 통해 성능 저하 없는 안전한 자가 진화를 목표로 합니다.",
    key_features: [
      "재귀적 자기개선(RSI) 아키텍처 및 안전 검증 게이트",
      "도구 및 스킬 자동 생성·평가·배포 파이프라인",
      "지속적 성능 벤치마크 및 회귀 방지 테스트 내장"
    ],
    use_case: "에이전트 스스로 새로운 워크플로우를 학습하고 스킬을 확장하는 시스템을 실험할 때",
    install_hint: "README.md 가이드 참조",
    tags: ["agent-harness", "rsi", "self-improvement", "autonomous-agents", "evals"]
  },
  "worldwonderer/novel-to-game": {
    category: "skill",
    title_ko: "Novel-to-Game — 소설 텍스트를 플레이 가능한 게임으로 변환하는 스킬",
    catchphrase: "원작 소설의 세계관과 스토리를 기반으로 온전한 텍스트/웹 게임을 제작하는 에이전트 스킬",
    summary_ko: "원작 소설이나 시나리오 텍스트를 분석하여 캐릭터 설정, 분기 스토리, 상호작용 시스템을 자동으로 설계하고 실제로 플레이 가능한 인터랙티브 게임으로 빌드해 주는 Claude Code 전용 스킬입니다. 서사적 일관성을 유지하면서 게임 로직과 UI를 완벽하게 생성합니다.",
    key_features: [
      "원작 텍스트의 캐릭터, 배경, 사건 관계도 자동 추출",
      "선택지 기반 분기형 내러티브 및 게임 메커니즘 코드 자동 작성",
      "웹 기반 즉시 플레이 가능한 게임 패키지 출력"
    ],
    use_case: "텍스트 기반 소설이나 시나리오를 인터랙티브 콘텐츠나 인디 게임으로 빠르게 전환할 때",
    install_hint: "npx @anthropic/claude-code add-skill worldwonderer/novel-to-game",
    tags: ["agent-skills", "game-development", "storytelling", "creative-ai", "interactive"]
  },
  "lidge-jun/opencodex": {
    category: "mcp",
    title_ko: "opencodex — Codex 및 Claude Code를 위한 범용 LLM 프록시",
    catchphrase: "어떤 오픈소스 LLM이나 상용 API도 Claude Code 및 Codex에 즉시 연결",
    summary_ko: "OpenAI Codex 및 Anthropic Claude Code의 API 요청을 가로채어 로컬 모델(Ollama, vLLM)이나 서드파티 프로바이더(DeepSeek, Qwen 등)로 라우팅해 주는 고성능 프록시입니다. 표준 프로토콜 변환을 통해 클라이언트 수정 없이 모델 교체가 가능합니다.",
    key_features: [
      "Claude Code 및 Codex 클라이언트 완벽 호환 프록시",
      "Ollama, vLLM 등 로컬 오픈소스 LLM 백엔드 지원",
      "도구 호출 및 스트리밍 응답 규격 자동 변환"
    ],
    use_case: "Claude Code를 로컬 환경의 DeepSeek-R1이나 Qwen 모델로 구동하고 싶을 때",
    install_hint: "pip install opencodex 또는 Docker 컨테이너 실행",
    tags: ["proxy", "llm-gateway", "claude-code", "local-llm", "codex"]
  },
  "Vincentwei1021/video-shotcraft": {
    category: "skill",
    title_ko: "Video-Shotcraft — 시네마틱 영상 제작 및 숏폼 컷 분할 스킬",
    catchphrase: "제품 비디오 기획부터 프롬프트 분할, 장면별 연출 지시서까지 자동 생성",
    summary_ko: "Claude Code 및 Codex 환경에서 시네마틱 영상 연출을 보조하는 AI 비디오 전문 스킬입니다. 제품 소개 영상이나 숏폼 콘텐츠에 필요한 카메라 앵글, 조명, 트랜지션, 사운드 큐를 정밀하게 분할하여 Runway, Kling, Sora 등 생성형 비디오 툴에 최적화된 프롬프트를 산출합니다.",
    key_features: [
      "카메라 워크 및 조명 연출이 반영된 전문 스토리보드 생성",
      "생성형 비디오 모델(Runway, Kling, Sora) 맞춤형 프롬프트 분할",
      "제품 쇼케이스 및 소셜 숏폼 영상 제작 워크플로우 최적화"
    ],
    use_case: "전문 영상 제작 지식 없이도 고품질 시네마틱 영상 기획과 프롬프트를 완성하고 싶을 때",
    install_hint: "README.md 가이드 참조",
    tags: ["ai-video", "claude-code", "video-generation", "cinematic", "creative-skills"]
  },
  "QwenAudio/qwen-audio-agent": {
    category: "agent",
    title_ko: "Qwen Audio Agent — 실시간 음성 상호작용 에이전트 런타임",
    catchphrase: "에이전트가 끊김 없이 대화하고 작업하며 상태를 공유하는 실시간 보이스 런타임",
    summary_ko: "Qwen 오디오 모델을 기반으로 텍스트 기반 에이전트에게 실시간 음성 대화 능력을 부여하는 런타임 시스템입니다. 사용자와 대화를 나누면서 동시에 백그라운드에서 코드 작성 및 도구 실행을 병행할 수 있는 비동기 오디오 파이프라인을 갖추고 있습니다.",
    key_features: [
      "초저지연 실시간 음성 인식 및 음성 합성 파이프라인",
      "음성 대화 중단 없는 백그라운드 도구 호출 및 태스크 실행",
      "멀티모달 에이전트 상태 모니터링 인터페이스"
    ],
    use_case: "핸즈프리로 코딩 에이전트와 대화하며 실시간 피드백을 주고받고 싶을 때",
    install_hint: "git clone 후 pip install -r requirements.txt",
    tags: ["voice-agent", "qwen-audio", "realtime-voice", "multimodal", "ai-agents"]
  },
  "ccch1mneyyy/dsh-TUI": {
    category: "agent",
    title_ko: "dsh-TUI — DeepSeek Harness를 위한 Claude Code 스타일 TUI",
    catchphrase: "고래 심볼 탑바, 실시간 스트리밍 생각 과정, 컨텍스트 게이지를 갖춘 프리미엄 터미널 UI",
    summary_ko: "DeepSeek 공식 채널에 소개된 DeepSeek Harness 전용 터미널 UI 플러그인입니다. Claude Code 특유의 미려한 TUI 감성을 재현하여 실시간 생각 과정 스트리밍, 더블 클릭 Esc를 통한 롤백, TPS 및 컨텍스트 잔여량 표시 등 뛰어난 개발자 경험을 제공합니다.",
    key_features: [
      "Claude Code 스타일의 실시간 사고 과정 및 상태 표시 탑바",
      "컨텍스트 윈도우 사용량 및 초당 토큰 수(TPS) 실시간 게이지",
      "단축키 기반 작업 취소 및 이전 체크포인트 복원 기능"
    ],
    use_case: "DeepSeek Harness나 로컬 에이전트 환경에 Claude Code 수준의 유려한 TUI를 입히고 싶을 때",
    install_hint: "README.md의 설치 지침 참조",
    tags: ["tui", "deepseek-harness", "claude-code-ui", "developer-experience", "terminal"]
  },
  "eternityspring/shuohao-skills": {
    category: "skill",
    title_ko: "Shuohao Skills — AI 숏폼 드라마 제작 스킬 팩",
    catchphrase: "캐릭터 분해, 시놉시스, 씬·소품 기획, 대본 작성, 콘티 분할을 한 번에",
    summary_ko: "AI 숏드라마 및 숏폼 영상 제작의 전 과정을 체계화한 에이전트 스킬 모음입니다. 등장인물 페르소나 정립부터 스토리 아웃라인, 세부 씬 구성, 대본 및 콘티 분할까지 일관된 톤앤매너로 생성할 수 있도록 전문 프롬프트 템플릿과 검증 규칙을 제공합니다.",
    key_features: [
      "숏폼 드라마 기획부터 대본 완성까지 5단계 자동화 워크플로우",
      "캐릭터 성격 및 시각적 일관성을 유지하는 프롬프트 셋",
      "씬별 컷 분할 및 비디오 생성 도구용 디렉션 추출"
    ],
    use_case: "소셜 미디어나 동영상 플랫폼용 숏드라마 콘텐츠를 빠르고 체계적으로 기획할 때",
    install_hint: "npx @anthropic/claude-code add-skill eternityspring/shuohao-skills",
    tags: ["ai-drama", "short-form", "scriptwriting", "creative-skills", "agent-skills"]
  },
  "tsingyuai/growth-lab": {
    category: "agent",
    title_ko: "Growth Lab — 제품 데이터 분석 및 마케팅 그로스 에이전트",
    catchphrase: "제품을 이해하고 데이터를 수집하여 실행 가능한 성장 전략을 도출하는 도구",
    summary_ko: "소프트웨어 제품의 랜딩 페이지와 사용자 행동 데이터를 분석하여 전환율 개선, 유입 채널 발굴, 카피라이팅 A/B 테스트 등 실질적인 그로스 해킹 전략을 수립하고 코드로 구현해 주는 엔드투엔드 마케팅 분석 에이전트입니다.",
    key_features: [
      "제품 기능 분석 및 타깃 오디언스 페르소나 자동 도출",
      "전환율 최적화를 위한 랜딩 페이지 카피 및 CTA 개선안 제안",
      "실시간 데이터 수집 및 경쟁사 벤치마킹 리포트 생성"
    ],
    use_case: "출시한 오픈소스나 SaaS 프로덕트의 사용자 전환율과 성장을 촉진하고자 할 때",
    install_hint: "README.md 참조",
    tags: ["growth-hacking", "marketing-ai", "product-analytics", "ai-agents", "conversion-rate"]
  },
  "Leutenegger/book-to-skill": {
    category: "skill",
    title_ko: "Book-to-Skill — 기술 서적 PDF를 Claude Code 스킬로 변환",
    catchphrase: "수백 페이지의 기술 서적을 에이전트가 즉시 활용하는 실전 스킬로 자동 컴파일",
    summary_ko: "기술 서적이나 공식 레퍼런스 PDF 문서를 파싱하여 Claude Code가 바로 호출할 수 있는 모듈형 스킬(`SKILL.md`) 세트로 변환해 주는 혁신적인 도구입니다. 방대한 지식을 구조화된 가이드라인과 코드 스니펫으로 요약하여 에이전트의 전문성을 극대화합니다.",
    key_features: [
      "기술 서적 PDF의 핵심 원칙 및 패턴 추출 자동화",
      "Claude Code 스킬 규격에 맞춘 SKILL.md 및 참조 문서 생성",
      "도메인별 맞춤형 코딩 컨벤션 및 모범 사례 주입"
    ],
    use_case: "특정 프레임워크나 아키텍처 책의 노하우를 에이전트의 지식 베이스로 흡수시키고 싶을 때",
    install_hint: "python -m book_to_skill 또는 CLI 설치",
    tags: ["pdf-parser", "skill-generator", "claude-code", "knowledge-base", "developer-tools"]
  },
  "danyuchn/asd-ste100-skill": {
    category: "skill",
    title_ko: "ASD-STE100 Skill — 항공·기술 표준 영어(STE) 작성 스킬",
    catchphrase: "복잡한 기술 문서를 국제 표준 간결 기술 영어(ASD-STE100)로 변환",
    summary_ko: "항공 및 방위 산업에서 사용되는 국제 표준 간결 기술 영어 규격인 ASD-STE100 규칙을 Claude Code 환경에 이식한 스킬입니다. 모호한 표현을 제거하고 승인된 어휘와 문장 구조만을 사용하여 글로벌 개발자 누구나 명확히 이해할 수 있는 완벽한 문서를 작성합니다.",
    key_features: [
      "ASD-STE100 표준 규칙에 따른 기술 문서 문법 및 어휘 교정",
      "모호한 다의어 제거 및 문장당 단어 수 제한 검증",
      "오픈소스 API 문서 및 README의 글로벌 가독성 대폭 향상"
    ],
    use_case: "글로벌 배포용 기술 문서나 API 명세서의 명확성과 일관성을 최고 수준으로 끌어올릴 때",
    install_hint: "npx @anthropic/claude-code add-skill danyuchn/asd-ste100-skill",
    tags: ["technical-writing", "ste100", "documentation", "claude-code", "standards"]
  },
  "cumora-ai/cumora": {
    category: "agent",
    title_ko: "Cumora — 차세대 엔터프라이즈 AI 소프트웨어 엔지니어",
    catchphrase: "대규모 코드베이스의 설계, 구현, 테스트 자동화를 지원하는 풀스택 엔지니어 에이전트",
    summary_ko: "단순 스니펫 작성을 넘어 모놀리스 및 마이크로서비스 코드베이스 전체의 아키텍처를 이해하고, 이슈 티켓 해결부터 PR 생성까지 자율적으로 완수하는 엔터프라이즈급 AI 소프트웨어 엔지니어 플랫폼입니다.",
    key_features: [
      "대규모 리포지토리 전체 의존성 분석 및 AST 기반 심층 이해",
      "테스트 주도 개발(TDD) 기반의 기능 구현 및 회귀 테스트 자동화",
      "기존 CI/CD 파이프라인 및 이슈 트래커와의 완벽한 연동"
    ],
    use_case: "복잡한 레거시 시스템의 리팩토링이나 대규모 기능 추가를 안정적으로 처리할 때",
    install_hint: "README.md 참조",
    tags: ["software-engineer", "enterprise-agent", "autonomous-coding", "fullstack", "ai-agents"]
  },
  "leadiq-ai/open-lead": {
    category: "agent",
    title_ko: "Open Lead — B2B 리드 발굴 및 인텔리전스 에이전트",
    catchphrase: "타깃 기업 분석부터 담당자 프로파일링까지 자동화하는 오픈소스 B2B 리드 에이전트",
    summary_ko: "영업 및 비즈니스 개발 팀을 위해 타깃 기업의 웹사이트, 기술 스택, 최신 뉴스, 주요 의사결정권자 정보를 자율적으로 리서치하여 고품질의 세일즈 리드 파이프라인을 구축해 주는 에이전트입니다.",
    key_features: [
      "기업 도메인 기반 기술 스택 및 비즈니스 모델 자동 분석",
      "의사결정권자 링크드인 및 공개 프로필 합법적 인텔리전스 수집",
      "개인화된 콜드 이메일 및 아웃리치 메시지 초안 생성"
    ],
    use_case: "B2B SaaS 제품의 잠재 고객을 자동으로 탐색하고 초기 영업 접근을 자동화할 때",
    install_hint: "README.md 참조",
    tags: ["b2b-sales", "lead-generation", "business-intelligence", "ai-agents", "automation"]
  },
  "vis-ai/agent-vision-toolkit": {
    category: "harness",
    title_ko: "Agent Vision Toolkit — 코딩 에이전트를 위한 시각 인식 툴킷",
    catchphrase: "스크린샷 분석, UI 컴포넌트 감지, 시각적 회귀 테스트를 결합한 하네스 툴킷",
    summary_ko: "코딩 에이전트에게 눈(Vision)을 달아주는 전문 하네스 확장 도구입니다. 웹페이지나 앱 화면의 스크린샷을 분석하여 레이아웃 불일치, 텍스트 겹침, 색상 대비 오류 등 시각적 버그를 자동으로 감지하고 해결 코드를 생성합니다.",
    key_features: [
      "고해상도 스크린샷 기반 UI 요소 위치 및 스타일 정밀 감지",
      "디자인 시안(Figma 등)과 실제 렌더링 결과 간 시각적 차이점 분석",
      "Playwright 및 Puppeteer 연동 시각적 회귀 테스트 자동화"
    ],
    use_case: "프론트엔드 UI 변경 시 시각적 레이아웃 깨짐을 에이전트가 직접 확인하고 수정하게 할 때",
    install_hint: "pip install agent-vision-toolkit 또는 npm install",
    tags: ["vision-agent", "ui-testing", "visual-regression", "agent-harness", "computer-vision"]
  },
  "egoist/waku": {
    category: "agent",
    title_ko: "Waku — 코딩 에이전트를 위한 네이티브 데스크톱 앱",
    catchphrase: "터미널 에이전트들을 아름다운 데스크톱 인터페이스로 감싸주는 네이티브 앱",
    summary_ko: "유명 개발자 egoist가 개발한 프로젝트로, Claude Code를 비롯한 여러 터미널 기반 코딩 에이전트를 직관적인 GUI 환경에서 제어할 수 있게 해주는 경량 데스크톱 애플리케이션입니다. 멀티 세션 탭, 파일 변경 내역 실시간 뷰어, diff 시각화를 지원합니다.",
    key_features: [
      "멀티 에이전트 세션 병렬 탭 관리 및 백그라운드 모니터링",
      "실시간 파일 변경 내역 및 인터랙티브 Diff 뷰어 제공",
      "단축키 기반의 빠른 프롬프트 전송 및 도구 승인 UI"
    ],
    use_case: "터미널 창을 여러 개 띄우지 않고 깔끔한 데스크톱 앱에서 에이전트들을 총괄 관리하고 싶을 때",
    install_hint: "README.md의 릴리스 페이지에서 데스크톱 바이너리 다운로드",
    tags: ["desktop-app", "agent-gui", "claude-code", "developer-tools", "productivity"]
  },
  "alexgreensh/attention-span": {
    category: "skill",
    title_ko: "Attention Span — 인간 친화적 ADHD 맞춤형 에이전트 출력 스킬",
    catchphrase: "장황한 텍스트 폭탄을 배제하고 한눈에 들어오는 직관적인 브리핑 스타일 주입",
    summary_ko: "AI 에이전트가 지나치게 긴 설명이나 불필요한 서론을 늘어놓는 것을 방지하고, ADHD 친화적인 요약, 명확한 불릿 포인트, 시각적 계층 구조를 갖춘 출력 스타일을 적용해 주는 Claude Code 스킬입니다.",
    key_features: [
      "장황한 서술 배제 및 핵심 중심의 3줄 브리핑 강제",
      "시각적 가독성을 높이는 이모지와 계층적 불릿 구조 적용",
      "개발자의 인지 부하(Cognitive Load)를 최소화하는 간결한 응답"
    ],
    use_case: "에이전트와의 협업 중 불필요한 텍스트를 읽는 피로감을 줄이고 핵심만 빠르게 파악할 때",
    install_hint: "npx @anthropic/claude-code add-skill alexgreensh/attention-span",
    tags: ["adhd-friendly", "output-formatting", "claude-code", "ux", "agent-skills"]
  },
  "AmazingAng/old-coder": {
    category: "skill",
    title_ko: "Old Coder — 베테랑 개발자의 에이전트 시대 실전 전략 스킬",
    catchphrase: "코드를 일일이 읽지 마라: 시스템 경계와 테스트 중심으로 에이전트를 지휘하는 법",
    summary_ko: "수십 년 경력의 베테랑 엔지니어가 에이전트 코딩 시대에 맞춰 고안한 실전 전략 스킬입니다. 모든 코드를 직접 검토하려 하지 않고, 견고한 타입 시스템, 단위 테스트, 경계 조건 검증을 통해 에이전트를 효과적으로 통제하는 프롬프트 가이드를 제공합니다.",
    key_features: [
      "블랙박스 테스트 및 계약 기반 프로그래밍 가이드라인 주입",
      "에이전트의 사이드 이펙트를 통제하는 안전한 아키텍처 패턴",
      "코드 리뷰 시간 단축을 위한 고수준 인터페이스 중심 검증"
    ],
    use_case: "에이전트가 생성한 방대한 코드의 안정성을 직접 다 읽지 않고도 확실히 보장하고 싶을 때",
    install_hint: "npx @anthropic/claude-code add-skill AmazingAng/old-coder",
    tags: ["veteran-strategy", "architecture", "testing", "claude-code", "agent-skills"]
  },
  "mikehasa/agentacct": {
    category: "mcp",
    title_ko: "AgentAcct — 에이전트 활동 및 API 비용 실시간 회계 MCP",
    catchphrase: "코딩 에이전트가 무엇을 실행했고 얼마의 비용이 들었는지 명확하게 추적",
    summary_ko: "Claude Code 및 각종 에이전트 세션의 도구 호출 기록, 토큰 소모량, API 실사용 비용을 실시간으로 집계하여 대시보드로 보여주는 관찰성(Observability) MCP 서버입니다. 팀 단위 에이전트 예산 관리와 비용 이상 감지를 지원합니다.",
    key_features: [
      "세션별, 모델별, 도구별 세분화된 토큰 및 비용 실시간 계산",
      "예산 한도 초과 시 자동 알림 및 실행 중단 제어 기능",
      "에이전트 세션의 ROI 분석을 위한 리포트 익스포트"
    ],
    use_case: "에이전트 도입 후 불어나는 API 비용을 투명하게 모니터링하고 최적화하고 싶을 때",
    install_hint: "npm install -g agentacct 후 mcp config 추가",
    tags: ["agent-observability", "cost-tracking", "mcp-server", "analytics", "finops"]
  },
  "MaxFreedomPollard/Compartment": {
    category: "mcp",
    title_ko: "Compartment — 암호화 기반 완전 오프라인 에이전트 메모리",
    catchphrase: "단 한 번의 클릭으로 설치하는 안전하고 격리된 로컬 에이전트 장기 기억소",
    summary_ko: "클라우드로 민감한 정보가 유출되지 않도록 로컬 디바이스에 암호화된 벡터 및 키-값 저장소를 구축하여 에이전트의 세션 간 컨텍스트를 유지해 주는 안전한 메모리 MCP 서버입니다. 원클릭 설치를 지원합니다.",
    key_features: [
      "완전 오프라인 로컬 암호화 스토리지로 데이터 프라이버시 완벽 보호",
      "원클릭 설치 및 Claude Code, Cursor, Windsurf 즉시 호환",
      "세션을 가로지르는 프로젝트 지식 및 개발자 선호도 자동 축적"
    ],
    use_case: "보안이 중요한 기업 환경에서 에이전트에게 지속적인 프로젝트 기억을 부여하고 싶을 때",
    install_hint: "README.md 원클릭 설치 스크립트 실행",
    tags: ["agent-memory", "privacy-first", "offline-storage", "mcp-server", "encryption"]
  },
  "sv-number/mcp-server": {
    category: "mcp",
    title_ko: "SV-Number MCP — 가상 전화번호 발급 및 SMS 수신 MCP",
    catchphrase: "AI 에이전트가 직접 SMS 인증을 처리하고 전화번호를 관리할 수 있는 도구",
    summary_ko: "에이전트가 웹 자동화나 회원가입, 2단계 인증(2FA)을 수행할 때 필요한 임시 가상 전화번호를 발급받고 SMS 인증 코드를 자동으로 수신하여 전달해 주는 혁신적인 MCP 서버입니다.",
    key_features: [
      "국가별 가상 전화번호 즉시 프로비저닝 API 제공",
      "수신된 SMS 메시지 및 인증번호 실시간 파싱 도구 지원",
      "서비스 자동 가입 및 E2E 테스트 자동화 시 병목 해소"
    ],
    use_case: "에이전트가 SMS 인증이 필요한 외부 서비스를 자동으로 셋업하거나 테스트해야 할 때",
    install_hint: "npm install @sv-number/mcp-server 후 claude config 추가",
    tags: ["mcp-server", "sms-auth", "phone-number", "automation", "e2e-testing"]
  },
  "crawfordxx/xiaoma-durex-copywriter": {
    category: "skill",
    title_ko: "Xiaoma Durex Copywriter — 바이럴 카피라이팅 & 포스터 스킬",
    catchphrase: "이중적 의미(Double Entendre) 방법론과 8대 공식 기반의 감각적인 카피 생성",
    summary_ko: "듀렉스(Durex) 스타일의 위트 있고 바이럴 잠재력이 높은 이중 의미 카피라이팅 기법을 Claude Code에 적용한 마케팅 스킬입니다. 260개 이상의 성공 사례를 분석해 구축한 8가지 카피 공식으로 소셜 미디어용 헤드라인을 만듭니다.",
    key_features: [
      "언어유희와 감각적인 은유를 활용한 이중적 의미 카피 공식",
      "소셜 미디어 피드에서 즉시 시선을 끄는 훅 문구 자동 작성",
      "포스터 비주얼 컨셉과 텍스트 레이아웃 동시 제안"
    ],
    use_case: "재치 있고 바이럴 파급력이 큰 마케팅 카피나 캠페인 헤드라인을 브레인스토밍할 때",
    install_hint: "npx @anthropic/claude-code add-skill crawfordxx/xiaoma-durex-copywriter",
    tags: ["viral-copywriting", "advertising", "marketing", "creative-skills", "claude-code"]
  },
  "0xnyn/airship": {
    category: "skill",
    title_ko: "Airship — 코딩 에이전트를 위한 피그마 스타일 비주얼 에디터",
    catchphrase: "Claude Code, Codex와 연동되어 캔버스 위에서 직접 UI를 조작하고 코드를 동기화",
    summary_ko: "Claude Code 및 Codex와 양방향으로 동기화되는 Figma 스타일의 경량 웹 기반 비주얼 에디터입니다. 캔버스 위에서 요소를 드래그하여 배치하면 에이전트가 즉시 컴포넌트 코드를 업데이트하며, 반대로 에이전트가 짠 코드도 시각화됩니다.",
    key_features: [
      "캔버스 기반 드래그 앤 드롭 UI 편집과 코드 실시간 양방향 동기화",
      "Tailwind CSS 및 React 컴포넌트 구조 자동 생성",
      "Claude Code 세션과의 원활한 소켓 통신 지원"
    ],
    use_case: "시각적으로 레이아웃을 다듬으면서 에이전트에게 세부 코드 스타일링을 맡기고 싶을 때",
    install_hint: "npx airship-ui 실행 또는 README 가이드 참조",
    tags: ["visual-editor", "figma-alternative", "claude-code", "ui-builder", "frontend"]
  },
  "vshulcz/deja-vu": {
    category: "mcp",
    title_ko: "Deja-Vu — 17종 에이전트 세션을 통합 색인하는 지능형 기억 도구",
    catchphrase: "로컬 디스크에 기록된 한 달 전 세션까지 검색하여 중복 작업을 완벽 차단",
    summary_ko: "Claude Code, Cursor, Codex 등 17가지 에이전트가 로컬에 남긴 작업 기록과 대화 세션을 자동으로 색인하여 검색할 수 있게 해주는 메모리 도구입니다. 에이전트가 이전에 해결했던 문제나 아키텍처 결정을 즉각 회상하도록 돕습니다.",
    key_features: [
      "17종 주요 AI 코딩 도구의 로컬 세션 파일 자동 색인",
      "SSH를 통한 다중 머신 세션 동기화 및 중앙 검색 지원",
      "에이전트의 반복적인 중복 탐색 및 토큰 낭비 방지"
    ],
    use_case: "과거 다른 프로젝트나 이전 세션에서 작성했던 유틸리티와 문제 해결책을 참조할 때",
    install_hint: "README.md 참조 (cargo install deja-vu 또는 npx 실행)",
    tags: ["agent-memory", "ai-memory", "claude-code", "ssh-sync", "mcp-server"]
  },
  "omnigent-ai/omnigent": {
    category: "agent",
    title_ko: "Omnigent — 오픈소스 메타 하네스 및 범용 AI 에이전트 프레임워크",
    catchphrase: "Claude Code, Codex, Cursor, Pi 등 모든 에이전트를 통합 오케스트레이션",
    summary_ko: "다양한 특화 에이전트들을 하나의 통합된 거버넌스 하에서 조율하고 협업시키는 오픈소스 메타 하네스 프레임워크입니다. 작업의 성격에 따라 가장 적합한 에이전트를 동적으로 라우팅하고 실행 상태를 통합 관리합니다.",
    key_features: [
      "이종 에이전트 간의 통신 및 협업 거버넌스 파이프라인 제공",
      "Claude Code, Codex, Cursor, Pi 등과의 광범위한 연동 지원",
      "중앙 집중식 권한 제어 및 태스크 큐 관리 아키텍처"
    ],
    use_case: "여러 전문 에이전트 팀을 구성하여 복잡한 대규모 프로젝트를 협업 방식으로 풀 때",
    install_hint: "pip install omnigent 또는 README.md 참조",
    tags: ["agent-framework", "meta-harness", "agent-orchestration", "ai-agents", "governance"]
  },
  "Leonxlnx/taste-skill": {
    category: "skill",
    title_ko: "Taste-Skill — AI에게 세련된 디자인 감각을 주입하는 스킬",
    catchphrase: "진부하고 조잡한 AI 스타일 UI 생성을 멈추고 트렌디하고 세련된 디자인을 유도",
    summary_ko: "AI 코딩 에이전트가 전형적이고 촌스러운 기본 스타일을 탈피하여, 세련된 타이포그래피, 절제된 컬러 팔레트, 자연스러운 여백과 마이크로 인터랙션을 구현하도록 디자인 가이드라인을 주입해 주는 스킬입니다.",
    key_features: [
      "모던 웹 트렌드(다크모드, 글래스모피즘, 정제된 그레이 스케일) 기본 적용",
      "과도한 그라디언트와 부자연스러운 애니메이션 차단",
      "접근성과 직관적 UX를 보장하는 UI 컴포넌트 설계 가이드"
    ],
    use_case: "에이전트가 만든 프로토타입이나 웹사이트가 디자이너가 만든 것처럼 고급스럽길 원할 때",
    install_hint: "npx @anthropic/claude-code add-skill Leonxlnx/taste-skill",
    tags: ["design-taste", "ui-ux", "aesthetic", "claude-code", "styling"]
  },
  "Graphify-Labs/graphify": {
    category: "mcp",
    title_ko: "Graphify — 코드베이스 전체를 영구 지식 그래프로 변환",
    catchphrase: "코드, 문서, SQL 스키마, 설정을 심층 연결하여 구조를 한눈에 파악하는 그래프 MCP",
    summary_ko: "임의의 코드베이스 전체를 파싱하여 AST, 문서, DB 스키마, 설정 파일 간의 유기적 관계를 영구 지식 그래프로 구축해 주는 고성능 MCP 서버입니다. 에이전트가 복잡한 아키텍처의 의존성과 영향도를 빠르고 정확하게 분석할 수 있습니다.",
    key_features: [
      "AST 기반 코드 의존성 및 호출 계층 구조 완벽 그래프화",
      "도메인별 커뮤니티 감지 및 핵심 노드(God Node) 자동 식별",
      "Graph RAG를 통한 고정밀 컨텍스트 검색 및 영향도 분석"
    ],
    use_case: "수십만 줄 규모의 거대 레거시 프로젝트를 파악하고 안전하게 리팩토링하고자 할 때",
    install_hint: "pip install graphify-mcp 또는 npx @graphify/server",
    tags: ["knowledge-graph", "ast", "code-intelligence", "mcp-server", "architecture"]
  },
  "koala73/worldmonitor": {
    category: "mcp",
    title_ko: "WorldMonitor — 실시간 글로벌 인텔리전스 대시보드 & MCP",
    catchphrase: "전 세계 주요 뉴스와 기술 신호를 실시간 수집·분석하여 시각화하는 플랫폼",
    summary_ko: "글로벌 뉴스 미디어, 오픈소스 커뮤니티, 금융 시장 데이터를 실시간으로 크롤링하고 AI로 요약하여 종합적인 상황 인식을 제공하는 인텔리전스 대시보드이자 MCP 서버입니다.",
    key_features: [
      "수십 개 글로벌 소스의 실시간 뉴스 및 피드 스트리밍",
      "이슈별 자동 클러스터링 및 중요도 기반 알림 시스템",
      "에이전트가 실시간 세계 정세를 질의할 수 있는 MCP 도구 제공"
    ],
    use_case: "시장 동향, 최신 기술 뉴스, 거시 지표를 실시간으로 모니터링하고 분석할 때",
    install_hint: "README.md 가이드 참조",
    tags: ["global-intelligence", "news-aggregator", "dashboard", "mcp-server", "realtime"]
  },
  "addyosmani/agent-skills": {
    category: "agent",
    title_ko: "Agent Skills (Addy Osmani) — 구글 리드가 만든 프로덕션 코딩 스킬 팩",
    catchphrase: "테스트 주도 개발, 체계적 디버깅, 성능 최적화 등 실전 엔지니어링 스킬 집합",
    summary_ko: "Google Chrome 개발 총괄 Addy Osmani가 주도하여 제작한 프로덕션급 AI 코딩 에이전트 스킬 모음입니다. TDD, 체계적 디버깅, 코드 리뷰, 성능 프로파일링 등 최고 수준의 엔지니어링 실무 기법을 에이전트에게 장착합니다.",
    key_features: [
      "실전 TDD 및 체계적 결함 분석 워크플로우 내장",
      "Web Vitals 및 프론트엔드 성능 최적화 전문 스킬",
      "엄격한 코드 품질 검증 및 리팩토링 가이드라인 제공"
    ],
    use_case: "에이전트에게 시니어 엔지니어 수준의 엄격한 개발 방법론을 적용시키고 싶을 때",
    install_hint: "npx @anthropic/claude-code add-skill addyosmani/agent-skills",
    tags: ["agent-skills", "addy-osmani", "engineering-excellence", "tdd", "debugging"]
  },
  "nextlevelbuilder/ui-ux-pro-max-skill": {
    category: "skill",
    title_ko: "UI/UX Pro Max — 84개 스타일과 192개 팔레트를 갖춘 디자인 인텔리전스",
    catchphrase: "22개 프론트엔드 스택을 완벽 지원하는 방대한 로컬 UI/UX 디자인 지능 DB",
    summary_ko: "React, Next.js, Vue, Svelte, Tailwind, shadcn/ui 등 22개 기술 스택에 걸쳐 84가지 디자인 스타일, 192개 맞춤 컬러 팔레트, 74가지 폰트 조합, 98개 UX 가이드라인을 제공하는 압도적인 디자인 전문 스킬입니다.",
    key_features: [
      "84개 디자인 스타일 및 192개 큐레이션 컬러 팔레트 내장",
      "shadcn/ui, Tailwind CSS 등 주요 스택별 컴포넌트 템플릿 즉시 산출",
      "접근성(WCAG) 및 반응형 레이아웃 자동 준수 검증"
    ],
    use_case: "앱이나 웹사이트 개발 시 디자이너 없이도 최고 수준의 UI/UX 완성도를 내고 싶을 때",
    install_hint: "npx @anthropic/claude-code add-skill nextlevelbuilder/ui-ux-pro-max-skill",
    tags: ["ui-ux", "design-system", "tailwind", "shadcn", "design-intelligence"]
  },
  "NousResearch/hermes-agent": {
    category: "agent",
    title_ko: "Hermes Agent — 경험을 통해 스스로 스킬을 생성하고 성장하는 에이전트",
    catchphrase: "과거 대화와 세션을 학습 루프로 축적하여 지속 발전하는 지능형 에이전트",
    summary_ko: "Nous Research가 개발한 자기개선형 AI 에이전트로, 사용자와의 상호작용 경험을 통해 새로운 스킬을 스스로 정의하고 다듬는 학습 루프를 갖추고 있습니다. 7가지 터미널 백엔드와 300개 이상의 모델을 지원하며 멀티 메신저 연동이 가능합니다.",
    key_features: [
      "상호작용 경험 기반 스킬 자동 생성 및 지속적 다듬기",
      "로컬, 도커, SSH, 서버리스 샌드박스 등 7종 실행 백엔드 지원",
      "텔레그램, 디스코드, 슬랙, CLI 전반에서 동일한 기억 유지"
    ],
    use_case: "세션이 끊겨도 이전 작업 맥락과 나만의 업무 방식을 기억하는 전담 에이전트가 필요할 때",
    install_hint: "pip install hermes-agent 또는 공식 문서 참조",
    tags: ["self-improving", "agent-framework", "nous-research", "multi-channel", "autonomous"]
  },
  "JuliusBrussee/caveman": {
    category: "skill",
    title_ko: "Caveman — 프롬프트 압축으로 토큰을 극적으로 아끼는 스킬",
    catchphrase: "불필요한 미사여구를 모두 제거하여 Claude Code 토큰 소모량을 50% 이상 절감",
    summary_ko: "'Why use many token when few token do trick' 철학에 기반하여, 에이전트와 주고받는 프롬프트와 응답에서 불필요한 단어를 원시인 화법(Caveman style)처럼 극단적으로 압축함으로써 속도를 높이고 API 비용을 절감하는 스킬입니다.",
    key_features: [
      "의미 손실 없이 토큰 사용량을 40~60% 이상 대폭 절감",
      "API 호출 지연 시간 단축 및 컨텍스트 윈도우 여유 공간 확보",
      "Claude Code 및 타 CLI 에이전트와 원터치 연동"
    ],
    use_case: "반복적인 디버깅이나 긴 세션에서 토큰 비용과 속도를 최적화하고 싶을 때",
    install_hint: "npx @anthropic/claude-code add-skill JuliusBrussee/caveman",
    tags: ["token-compression", "cost-saving", "caveman", "claude-code", "efficiency"]
  },
  "farion1231/cc-switch": {
    category: "mcp",
    title_ko: "CC-Switch — Claude Code 전용 크로스 플랫폼 데스크톱 어시스턴트",
    catchphrase: "설정 변경, 프롬프트 템플릿, 단축키를 한곳에서 제어하는 올인원 보조 도구",
    summary_ko: "Claude Code와 Codex를 더 편하게 사용할 수 있도록 지원하는 크로스 플랫폼 데스크톱 도구입니다. 환경 변수 스위칭, 커스텀 스킬 등록, 자주 쓰는 프롬프트 프리셋 관리를 직관적인 UI로 제공합니다.",
    key_features: [
      "원클릭 환경 변수 및 모델 프로바이더 전환",
      "스킬 라이브러리 탐색 및 손쉬운 추가/비활성화",
      "윈도우, 맥, 리눅스 완벽 지원 크로스 플랫폼 GUI"
    ],
    use_case: "CLI 설정 파일을 직접 편집하지 않고 GUI에서 Claude Code 환경을 편리하게 관리할 때",
    install_hint: "README.md 릴리스에서 설치 파일 다운로드",
    tags: ["desktop-assistant", "claude-code-gui", "configuration", "mcp", "utilities"]
  },
  "shareAI-lab/learn-claude-code": {
    category: "harness",
    title_ko: "Learn Claude Code — Bash로 이해하는 나노 에이전트 하네스",
    catchphrase: "Bash 스크립트 하나로 Claude Code의 핵심 아키텍처를 완벽하게 학습",
    summary_ko: "단순한 Bash 스크립트 몇 줄로 Claude Code 수준의 코딩 에이전트 하네스가 어떻게 동작하는지 직관적으로 보여주는 교육용 오픈소스 프로젝트입니다. 도구 호출 루프와 컨텍스트 관리의 원리를 배울 수 있습니다.",
    key_features: [
      "외부 프레임워크 의존성 없는 순수 Bash 기반 에이전트 루프 구현",
      "도구 실행, 오류 처리, 컨텍스트 축적 과정의 명쾌한 해설",
      "자신만의 경량 CLI 에이전트를 구축하기 위한 최적의 학습 자료"
    ],
    use_case: "코딩 에이전트의 내부 동작 원리와 하네스 아키텍처를 깊이 있게 이해하고 싶을 때",
    install_hint: "git clone https://github.com/shareAI-lab/learn-claude-code",
    tags: ["educational", "agent-harness", "bash", "architecture", "claude-code-core"]
  },
  "rtk-ai/rtk": {
    category: "mcp",
    title_ko: "RTK — 코딩 에이전트 토큰 60~90% 절감 CLI 프록시",
    catchphrase: "코드 컨텍스트와 터미널 출력을 압축하여 압도적인 토큰 절감 효과 제공",
    summary_ko: "코딩 에이전트가 읽는 대규모 코드 파일과 터미널 실행 출력을 지능적으로 요약·압축하여 LLM 토큰 소모량을 60~90%까지 대폭 줄여주는 고성능 CLI 프록시 도구입니다.",
    key_features: [
      "AST 기반 불필요한 주석 및 보일러플레이트 실시간 트리밍",
      "에러 메시지 및 터미널 출력의 핵심 스택 트레이스만 선별 주입",
      "모든 주요 코딩 에이전트 CLI와 투명하게 연결되는 프록시 구조"
    ],
    use_case: "대규모 리포지토리 작업 시 컨텍스트 초과 오류를 방지하고 비용을 아끼고자 할 때",
    install_hint: "cargo install rtk-cli 또는 brew install rtk",
    tags: ["token-reduction", "cli-proxy", "llm-cost", "context-compression", "performance"]
  },
  "Egonex-AI/Understand-Anything": {
    category: "agent",
    title_ko: "Understand-Anything — 복잡한 코드를 설명하는 시각적 지식 그래프",
    catchphrase: "보여주기식 그래프가 아닌, 실제로 코드를 이해시키는 명쾌한 멘탈 모델 구축",
    summary_ko: "임의의 코드베이스를 분석하여 핵심 비즈니스 로직과 데이터 흐름을 직관적인 시각 다이어그램 및 해설로 변환해 주는 지식 추출 에이전트입니다. 신규 프로젝트 온보딩 시간을 획기적으로 단축합니다.",
    key_features: [
      "비즈니스 로직 중심의 계층적 아키텍처 다이어그램 자동 렌더링",
      "핵심 함수 및 클래스 간 상호작용 흐름 단계별 설명",
      "질의응답 기반 심층 코드 탐색 인터페이스 제공"
    ],
    use_case: "처음 접하는 거대한 오픈소스 프로젝트나 사내 시스템을 단시간에 파악해야 할 때",
    install_hint: "npm install -g understand-anything",
    tags: ["code-visualization", "architecture", "onboarding", "knowledge-extraction", "ai-agents"]
  },
  "garrytan/gstack": {
    category: "skill",
    title_ko: "Gstack (Garry Tan) — YC 대표의 엄선된 Claude Code 23개 도구 팩",
    catchphrase: "Y Combinator CEO Garry Tan이 실제 사용하는 최적화된 개발 스택과 설정",
    summary_ko: "Y Combinator 대표 Garry Tan이 자신의 일상 개발 워크플로우에서 직접 검증하고 사용하는 23가지 도구와 프롬프트 세트를 하나로 묶은 최상급 Claude Code 환경 구성 팩입니다.",
    key_features: [
      "YC 대표가 실제 검증한 23가지 생산성 도구 및 스킬 통합",
      "빠른 프로토타이핑과 배포에 최적화된 프롬프트 컨벤션",
      "개발 속도와 완성도를 동시에 잡는 실전 스타트업 개발 워크플로우"
    ],
    use_case: "실리콘밸리 탑티어 창업자의 생산성 높은 에이전트 설정을 그대로 복제하고 싶을 때",
    install_hint: "README.md 가이드에 따라 설정 복사",
    tags: ["garry-tan", "yc-stack", "claude-code-setup", "productivity", "developer-stack"]
  },
  "thedotmack/claude-mem": {
    category: "agent",
    title_ko: "Claude-Mem — 세션을 넘나드는 영구 컨텍스트 메모리 허브",
    catchphrase: "모든 코딩 에이전트를 위한 영구 기억소: 중요한 결정과 선호도를 영구 보존",
    summary_ko: "에이전트가 이전 세션에서 내린 아키텍처 결정, 수정했던 버그의 맥락, 개발자의 특정 코딩 스타일 선호도를 디스크에 안전하게 기록하고 다음 세션에서 자동으로 주입해 주는 메모리 시스템입니다.",
    key_features: [
      "세션 종료 후에도 보존되는 지속적 장기 기억 아키텍처",
      "프로젝트별 커스텀 규칙 및 선호 스타일 자동 학습",
      "중복 설명 없이 이전 대화 맥락을 즉시 이어가는 연속성"
    ],
    use_case: "새 터미널을 열 때마다 매번 프로젝트 배경을 다시 설명하는 번거로움을 없앨 때",
    install_hint: "npm install -g claude-mem",
    tags: ["persistent-memory", "context-retention", "claude-code", "agent-memory", "continuity"]
  },
  "ComposioHQ/awesome-claude-skills": {
    category: "mcp",
    title_ko: "Awesome Claude Skills — 검증된 Claude 스킬 & 도구 큐레이션 리스트",
    catchphrase: "생태계에서 가장 유용하고 신뢰할 수 있는 Claude 스킬과 MCP 서버 모음",
    summary_ko: "Composio 팀이 엄격한 기준으로 품질과 유용성을 검증하여 정리한 오픈소스 Claude 스킬, MCP 도구, 리소스 큐레이션 리포지토리입니다. 생태계의 최신 트렌드를 파악하기 위한 표준 레퍼런스입니다.",
    key_features: [
      "카테고리별로 정밀하게 분류된 수백 개의 검증된 스킬 목록",
      "실제 설치 및 사용 예시 코드를 포함한 상세 가이드",
      "커뮤니티 기여를 통한 실시간 신규 도구 발굴 및 갱신"
    ],
    use_case: "내 작업에 꼭 필요한 특화 도구나 스킬이 생태계에 이미 존재하는지 탐색할 때",
    install_hint: "README.md 탐색",
    tags: ["curated-list", "awesome-claude", "composio", "skill-directory", "resources"]
  },
  "affaan-m/ECC": {
    category: "harness",
    title_ko: "ECC (Everything Claude Code) — 에이전트 하네스 성능 극대화 시스템",
    catchphrase: "스킬, 프롬프트, 도구 연동을 포괄적으로 최적화하는 완벽한 하네스 프레임워크",
    summary_ko: "Claude Code의 실행 성능을 극한으로 끌어올리기 위해 스킬 관리, 컨텍스트 최적화, 도구 체이닝 기법을 집대성한 종합 하네스 최적화 시스템입니다. 24만 개 이상의 스타를 기록한 대표적인 프레임워크입니다.",
    key_features: [
      "에이전트 응답 속도 및 도구 호출 정확도 극대화 튜닝",
      "다양한 서드파티 스킬 간 충돌 방지 및 우선순위 라우팅",
      "대규모 프로덕션 프로젝트를 위한 엔터프라이즈 하네스 설정"
    ],
    use_case: "Claude Code를 단순 보조 도구를 넘어 조직의 주력 개발 엔진으로 튜닝하고자 할 때",
    install_hint: "README.md 설치 및 셋업 가이드 참조",
    tags: ["agent-harness", "performance-optimization", "claude-code", "enterprise-setup", "tooling"]
  },
  "anthropics/claude-code": {
    category: "agent",
    title_ko: "Claude Code (Official) — Anthropic 공식 터미널 코딩 에이전트",
    catchphrase: "개발자의 터미널에 상주하며 파일 수정, 터미널 실행, Git 작업을 자율 수행하는 공식 에이전트",
    summary_ko: "Anthropic에서 공식 개발한 차세대 에이전틱 CLI 도구입니다. 복잡한 코드베이스를 읽고 이해하며, 직접 파일 편집, 단위 테스트 실행, Git 커밋 및 PR 생성까지 개발 라이프사이클 전반을 자연어로 완벽하게 지휘합니다.",
    key_features: [
      "Anthropic Claude 3.7 Sonnet 기반의 탁월한 추론 및 코딩 능력",
      "터미널 명령어 직접 실행 및 오류 시 자체 수정(Self-healing) 루프",
      "스킬 시스템 및 MCP 서버와의 무한한 확장성"
    ],
    use_case: "개발자의 터미널 환경에서 가장 강력하고 안전한 AI 코딩 파트너를 사용할 때",
    install_hint: "npm install -g @anthropic-ai/claude-code",
    tags: ["official", "anthropic", "claude-code", "cli-agent", "frontier-coding"]
  }
};

// 점수 및 분류 로직
const CAPS = {
  rising: { skill: 8, mcp: 6, agent: 4, harness: 2 },
  classic: { skill: 6, mcp: 4, agent: 4, harness: 2 },
};

function curateCandidates() {
  const risingPool = [];
  const classicPool = [];

  for (const c of candidates) {
    const meta = CURATED_DB[c.id];
    if (!meta) continue;

    const cat = meta.category;
    const v_score = c.velocity_score || 0;
    const buzz = c.hn && c.hn.length > 0 ? Math.min(100, c.hn.reduce((acc, h) => acc + (h.points || 0) + (h.comments || 0), 0)) : 0;
    const quality = Math.min(c.stars > 500 ? 90 : (c.stars > 50 ? 75 : 60), 100);
    const pushed_days = Math.round((Date.now() - Date.parse(c.pushed_at)) / 86400000);
    const recency = Math.max(0, 100 * (1 - pushed_days / 60));
    const score = Number((0.4 * v_score + 0.3 * buzz + 0.2 * quality + 0.1 * recency).toFixed(1));

    const isCreated30 = c.created_days_ago != null && c.created_days_ago <= 30;
    const isRisingCandidate = isCreated30 || v_score >= 60 || (c.hn && c.hn.length > 0);
    const isClassicCandidate = c.stars >= 500 && (c.created_days_ago == null || c.created_days_ago >= 60) && pushed_days <= 30;

    const sources = ["github", ...(c.hn && c.hn.length > 0 ? ["hn"] : [])];
    const evidence = [];
    if (c.v7d != null && c.v7d > 0) {
      evidence.push({
        source: "github",
        url: c.url,
        label: `최근 7일 +${c.v7d.toLocaleString()} stars`
      });
    }
    for (const h of (c.hn || []).slice(0, 2)) {
      evidence.push({
        source: "hn",
        url: h.url,
        label: `HN ${h.points}p · ${h.title}`
      });
    }

    const badges = [];
    if (isRisingCandidate) badges.push("🔥 Rising");
    else badges.push("⭐ Classic");
    if (isCreated30) badges.push("🆕 신상");
    if (sources.length === 1 && score < 70) badges.push("⚠️ 단일출처");

    const item = {
      id: c.id,
      name: c.name,
      owner: c.owner,
      title_ko: meta.title_ko,
      official_url: c.url,
      repo_url: c.url,
      category: cat,
      score: score,
      trend_score: score,
      stars: c.stars,
      velocity_7d: c.v7d,
      velocity_score: Number((c.velocity_score || 0).toFixed(1)),
      growth_rate: c.growth_rate != null ? Number(c.growth_rate.toFixed(4)) : null,
      v7d_estimated: c.v7d_estimated === true,
      source_count: sources.length,
      sources,
      evidence,
      status: isRisingCandidate ? "rising" : "classic",
      catchphrase: meta.catchphrase,
      summary_ko: meta.summary_ko,
      key_features: meta.key_features,
      use_case: meta.use_case,
      install_hint: meta.install_hint,
      badge: isRisingCandidate ? "🔥 Rising" : "⭐ Classic",
      badges,
      tags: meta.tags,
      thumbnail_url: `https://github.com/${c.owner}.png`
    };

    if (isRisingCandidate) {
      risingPool.push(item);
    } else if (isClassicCandidate) {
      classicPool.push(item);
    }
  }

  // 정렬 및 캡 적용
  risingPool.sort((a, b) => b.score - a.score || b.stars - a.stars);
  classicPool.sort((a, b) => b.score - a.score || b.stars - a.stars);

  const risingCounts = { skill: 0, mcp: 0, agent: 0, harness: 0 };
  const rising = [];
  for (const item of risingPool) {
    if (risingCounts[item.category] < CAPS.rising[item.category]) {
      risingCounts[item.category]++;
      rising.push(item);
    }
  }

  const classicCounts = { skill: 0, mcp: 0, agent: 0, harness: 0 };
  const classic = [];
  for (const item of classicPool) {
    if (classicCounts[item.category] < CAPS.classic[item.category]) {
      classicCounts[item.category]++;
      classic.push(item);
    }
  }

  const output = {
    generated_at: new Date().toISOString(),
    curation_date: "2026-08-18",
    rising,
    classic
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`Generated 04_curated.json: Rising=${rising.length} (skill ${risingCounts.skill}, mcp ${risingCounts.mcp}, agent ${risingCounts.agent}, harness ${risingCounts.harness}), Classic=${classic.length} (skill ${classicCounts.skill}, mcp ${classicCounts.mcp}, agent ${classicCounts.agent}, harness ${classicCounts.harness})`);
}

curateCandidates();
