// scripts/plugins/curated-knowledge-ext.js
// 최신 Claude Code 생태계 핫 리포지토리 한국어 정밀 큐레이션 데이터

module.exports = {
  "yetone/magpie": {
    category: "agent",
    title_ko: "magpie — 맥 메뉴바에서 코딩 에이전트 모델을 원클릭 교체하는 데스크톱 유틸리티",
    catchphrase: "Codex에 DeepSeek을, Claude Code에 Kimi를 메뉴바에서 즉시 전환하는 멀티 모델 브릿지",
    summary_ko: "Claude Code, Codex, Gemini CLI 등 다양한 AI 코딩 에이전트의 모델 백엔드를 맥 메뉴바에서 원클릭으로 전환할 수 있는 데스크톱 유틸리티입니다. 복잡한 환경 변수나 설정 파일 편집 없이 DeepSeek, Kimi, MiniMax, Qwen 등 가성비와 성능이 뛰어난 대안 모델로 손쉽게 라우팅할 수 있습니다. 에이전트별 토큰 사용량과 세션 상태도 한눈에 모니터링할 수 있습니다.",
    key_features: [
      "맥 메뉴바 기반 에이전트 모델 백엔드 원클릭 즉각 전환",
      "Codex·Claude Code·Gemini CLI 등 주요 코딩 에이전트 통합 연동",
      "DeepSeek·Kimi·MiniMax 등 고성능 대체 모델 완벽 호환"
    ],
    use_case: "코딩 에이전트의 LLM 백엔드를 작업 상황에 맞춰 메뉴바에서 빠르게 전환하고 싶을 때",
    tags: ["menu-bar", "model-router", "claude-code", "codex", "desktop-app"]
  },
  "rehan-remade/universal-modder": {
    category: "mcp",
    title_ko: "universal-modder — PC 게임 분석부터 텍스처·오디오 생성까지 지원하는 게임 모딩 툴킷",
    catchphrase: "Claude Code와 fal MCP로 에이전트가 직접 PC 게임을 역공학하고 모드를 제작·테스트",
    summary_ko: "Claude Code와 fal AI 생성 인프라를 활용하여 PC 게임의 리버스 엔지니어링 및 커스텀 모드 제작을 자동화하는 에이전트 툴킷입니다. 게임 파일 구조 정찰, 바이너리 분석, fal 모델을 통한 3D/오디오/텍스처 에셋 실시간 생성, 인게임 적용 및 쇼케이스 영상 렌더링까지 에이전트가 주도합니다. 에이지 오브 엠파이어 등 다양한 PC 타이틀을 지원합니다.",
    key_features: [
      "fal MCP 연동을 통한 인게임 텍스처·3D 에셋·오디오 자동 생성",
      "게임 리소스 구조 정찰 및 역공학 스크립트 자동 생성",
      "인게임 모드 적용 상태 자동 테스트 및 쇼케이스 비디오 파이프라인"
    ],
    use_case: "좋아하는 PC 게임의 커스텀 모드와 에셋을 AI 에이전트와 함께 빠르게 개발하고 싶을 때",
    tags: ["game-modding", "reverse-engineering", "fal-ai", "mcp-server", "claude-code"]
  },
  "Louis-CFM/coucou": {
    category: "agent",
    title_ko: "coucou — 맥 노치와 아이폰 잠금화면에서 에이전트 도구 실행을 승인하는 반려 앱",
    catchphrase: "Claude Code의 위험한 터미널 실행 승인을 맥북 노치나 아이폰 잠금화면에서 탭 한 번으로 해결",
    summary_ko: "Claude Code, Codex, Cursor, Gemini CLI, Antigravity 등의 코딩 에이전트가 명령어나 파일 수정을 시도할 때 맥북 노치(Notch)와 아이폰 잠금화면에 알림을 띄워주는 미려한 동반자 애플리케이션입니다. 터미널 창을 계속 쳐다볼 필요 없이 화면 상단 노치나 모바일 위젯에서 탭 한 번으로 도구 실행을 즉시 승인하거나 거부할 수 있습니다.",
    key_features: [
      "Mac 화면 상단 노치 영역에 실시간 에이전트 상태 및 승인 UI 표시",
      "아이폰 잠금화면 라이브 액티비티(Live Activity) 연동 원격 승인",
      "Claude Code·Codex·Cursor·Gemini CLI 등 다중 에이전트 동시 감시"
    ],
    use_case: "장시간 구동되는 에이전트 작업 시 터미널을 주시하지 않고 다른 작업을 하거나 폰으로 승인할 때",
    tags: ["mac-notch", "ios-remote", "approval-guard", "claude-code", "ui-helper"]
  },
  "nykooi1/vibe-wise": {
    category: "skill",
    title_ko: "vibe-wise — AI가 코드를 작성하는 동안 인간 개발자의 학습을 유도하는 인터랙티브 스킬",
    catchphrase: "단순 복붙 바이브 코딩을 넘어, AI의 아키텍처 결정과 동작 원리를 함께 체득하는 러닝 툴",
    summary_ko: "Claude Code나 Codex가 코드를 빠르게 구현하는 과정에서 사용자가 수동적인 방관자에 머무르지 않도록 돕는 교육형 에이전트 스킬입니다. 에이전트가 중요한 아키텍처 결정을 내릴 때 왜 그 라이브러리를 선택했는지, 내부 자료구조가 어떻게 동작하는지 핵심 멘토링 질문과 다이어그램을 제공하여 실력 향상을 돕습니다.",
    key_features: [
      "AI 구현 과정 중 핵심 아키텍처 선택 이유와 원리 실시간 해설",
      "코드 이해도를 높이는 인터랙티브 체크포인트 및 퀴즈 제공",
      "생산성 유지와 개발자 학습 효과를 동시에 만족하는 페어 프로그래밍 모드"
    ],
    use_case: "바이브 코딩으로 빠르게 결과물을 만들면서도 내부 동작 원리를 깊이 배우고 싶을 때",
    tags: ["vibe-coding", "developer-learning", "interactive-mentor", "claude-skills"]
  },
  "dzhng/jevgrep": {
    category: "skill",
    title_ko: "jevgrep — '이 코드가 무슨 일을 하는가' 자연어로 문맥과 파일을 찾아내는 검색 CLI",
    catchphrase: "단순 문자열 매칭 grep을 넘어, 기능적 의도와 동작을 이해하여 코드베이스를 탐색하는 도구",
    summary_ko: "키워드나 정규식 대신 자연어 의도로 대규모 코드베이스를 탐색할 수 있는 에이전트 특화 검색 CLI입니다. Jev 추론 엔진을 기반으로 '결제 처리 후 웹훅을 호출하는 로직', '토큰 만료 시 재발급하는 미들웨어' 등 의미 단위로 관련 소스 파일과 핵심 함수를 빠르게 추출하여 에이전트의 탐색 비용을 대폭 절감합니다.",
    key_features: [
      "기능 및 의도 기반의 고속 자연어 소스코드 검색",
      "에이전트 컨텍스트 절약을 위한 핵심 함수 범위 정밀 추출",
      "Jev 기반 경량 추론으로 로컬 및 CI 환경 즉시 실행"
    ],
    use_case: "낯선 대형 레거시 코드베이스에서 특정 기능을 구현한 위치를 에이전트가 빠르게 찾아야 할 때",
    tags: ["code-search", "semantic-grep", "jev", "claude-code-cli"]
  },
  "JohnHeibel/PDoomVideo": {
    category: "skill",
    title_ko: "PDoomVideo — Claude Opus 5.5 순수 코드로 전 과정을 렌더링한 인터랙티브 뮤직비디오",
    catchphrase: "외부 비디오 생성 모델 없이 캔버스와 셰이더 코드로 구현한 AI 뮤직비디오 오픈소스",
    summary_ko: "Claude Opus 5.5 모델이 외부 동영상 생성 AI(Sora, Runway 등)를 일체 사용하지 않고 순수 웹 기술(Canvas, Three.js, WebGL 셰이더) 코드만으로 제작한 인상적인 뮤직비디오 소스코드입니다. 코드 기반 비주얼 아트와 모션 그래픽이 어떻게 프레임 단위로 조율되는지 실전 예제를 제공합니다.",
    key_features: [
      "순수 자바스크립트 및 WebGL 코드로만 렌더링된 비주얼 연출",
      "오디오 파형과 비트에 동기화된 프로그래밍 방식 카메라 무브먼트",
      "Claude 모델의 고난도 창의적 시각 코드 생성 벤치마크"
    ],
    use_case: "외부 영상 모델 없이 순수 코드로 화려한 웹 애니메이션과 비주얼 데모를 구현하고 싶을 때",
    tags: ["creative-coding", "opus-canvas", "music-video", "webgl", "code-art"]
  },
  "ardeyouxipianyi/workbuddy2api-hub": {
    category: "harness",
    title_ko: "workbuddy2api-hub — WorkBuddy 다중 계정을 표준 OpenAI 엔드포인트로 중계하는 게이트웨이",
    catchphrase: "Codex, Claude Code, DSH 및 표준 클라이언트를 지원하는 국내외 다계정 로드밸런싱 허브",
    summary_ko: "WorkBuddy 플랫폼의 다중 계정을 하나의 표준 OpenAI 규격 API 엔드포인트로 통합 변환해주는 오픈소스 역방향 프록시 게이트웨이입니다. Codex, Claude Code, DSH 등 다양한 코딩 도구에서 쿼터 제한 없이 다계정 로드밸런싱과 장애 조치(failover)를 수행할 수 있도록 지원합니다.",
    key_features: [
      "WorkBuddy 계정 풀을 표준 OpenAI API 규격으로 일원화 중계",
      "계정별 쿼터 모니터링 및 실시간 지능형 로드밸런싱",
      "Codex·Claude Code·DSH 등 주요 에이전트 도구 무설정 연동"
    ],
    use_case: "여러 AI 계정 풀을 단일 엔드포인트로 묶어 코딩 에이전트에 안정적으로 공급하고 싶을 때",
    tags: ["api-gateway", "reverse-proxy", "load-balancer", "workbuddy", "claude-code"]
  },
  "QingYunA/answer-me-with-html": {
    category: "skill",
    title_ko: "answer-me-with-html — 복잡한 답변을 읽기 쉬운 단일 HTML 인터랙티브 보고서로 출력하는 스킬",
    catchphrase: "터미널의 장황한 텍스트 답변 대신 표, 차트, 탭이 갖춰진 유려한 원페이지 HTML로 응답",
    summary_ko: "AI 에이전트가 복잡한 기술 분석이나 긴 조사 결과를 터미널 텍스트 대신 단일 페이지 인터랙티브 HTML 문서로 생성하도록 유도하는 스킬입니다. 반응형 레이아웃, 직관적인 표, 차트, 아코디언 컴포넌트가 포함되어 브라우저에서 훨씬 편하고 구조화된 형태로 정보를 확인할 수 있습니다.",
    key_features: [
      "복합 데이터의 구조화된 반응형 원페이지 HTML 대시보드 자동 렌더링",
      "Chart.js 및 모던 CSS를 활용한 직관적인 시각 자료 구성",
      "외부 의존성 없는 독립형 단일 파일 HTML 리포트 생성"
    ],
    use_case: "에이전트의 복잡한 시스템 아키텍처 분석이나 벤치마크 결과를 브라우저에서 깔끔하게 보고 싶을 때",
    tags: ["html-report", "visual-response", "claude-skills", "data-presentation"]
  },
  "edenfunf/reelmimic": {
    category: "agent",
    title_ko: "reelmimic — 마음에 드는 레퍼런스 영상의 스타일을 복제하여 새 영상을 제작하는 AI 크루",
    catchphrase: "Claude Code와 Codex 기반 크루가 영상 분석, 스토리보드, 프롬프트 엔지니어링을 협업 수행",
    summary_ko: "사용자가 제시한 레퍼런스 비디오의 카메라 구도, 조명 톤, 페이싱, 시각적 스타일을 정밀 역분석하여 동일한 감성의 신규 영상을 기획·제작해주는 AI 에이전트 크루입니다. 기획 에이전트, 프롬프트 최적화 에이전트, 렌더링 검수 에이전트가 역할을 나누어 사용자와 실시간 피드백을 주고받습니다.",
    key_features: [
      "비디오 씬 분할 및 스타일 요소(카메라 앵글, 조명, 템포) 정밀 분석",
      "멀티 에이전트 크루 기반 스토리보드 및 영상 프롬프트 파이프라인",
      "생성 영상에 대한 자동 스타일 일치도 평가 및 반복 피드백"
    ],
    use_case: "특정 브랜드 광고나 쇼츠의 세련된 영상 스타일을 벤치마킹하여 신규 콘텐츠를 만들 때",
    tags: ["video-generation", "style-transfer", "ai-crew", "claude-code", "creative"]
  },
  "Oldcircle/geo-sleuth": {
    category: "skill",
    title_ko: "geo-sleuth — 사진 한 장으로 오픈스트리트맵과 위성을 대조해 촬영 위치를 찾는 OSINT 스킬",
    catchphrase: "지형 스카이라인, 도로 기하구조, 위성 이미지, 스트리트뷰를 교차 검증하는 위치 추적기",
    summary_ko: "단 한 장의 사진만으로 촬영 장소의 지리적 위치를 정밀 추적할 수 있도록 돕는 에이전트 OSINT 스킬입니다. OpenStreetMap 도로망, 지형 고도 스카이라인, 인공위성 영상, 스트리트뷰 데이터를 교차 검증하며 추론 근거를 단계별로 명확하게 제시합니다. Claude Code, Codex, Cursor 등과 호환됩니다.",
    key_features: [
      "OpenStreetMap 기반 도로 기하구조 및 건물 윤곽선 대조",
      "산악 지형 스카이라인 및 위성 영상 다중 교차 검증",
      "추론 과정 및 신뢰도 점수를 포함한 단계별 근거 보고서 제공"
    ],
    use_case: "사진 속 랜드마크나 풍경을 단서로 정확한 촬영 위치와 좌표를 역추적하고 싶을 때",
    tags: ["osint", "geolocation", "satellite-data", "claude-skills", "map-analysis"]
  },
  "Jakeschincariol/replica-skill": {
    category: "skill",
    title_ko: "replica-skill — 임의의 앱을 분석하여 역공학, 재구축, 버그 개선까지 수행하는 11종 스킬셋",
    catchphrase: "기존 앱의 동작을 분석해 클론 코드를 작성하고 사용자가 불편해하던 단점까지 개선",
    summary_ko: "웹이나 모바일 애플리케이션의 인터페이스와 기능을 분석하여 풀스택 클론 앱으로 재구축하는 11가지 Claude 전용 스킬 패키지입니다. 대상 서비스의 네트워크 요청 및 컴포넌트 구조를 역공학하고, 동일한 기능을 갖춘 현대적 코드로 재작성하며, 사용자 불만 요소를 해결하는 개선 패치까지 제안합니다.",
    key_features: [
      "대상 서비스 UI/UX 및 API 구조 자동 역공학 파이프라인",
      "Next.js/React 기반 모던 풀스택 클론 프로젝트 스캐폴딩",
      "버그 탐지 및 사용자 경험 개선 사항 자동 제안"
    ],
    use_case: "유명 웹 서비스의 핵심 MVP를 빠르게 클론하여 커스텀 기능으로 확장하고 싶을 때",
    tags: ["app-cloning", "reverse-engineering", "fullstack-skills", "claude-skills"]
  },
  "lemomo-ai/lemo-opuscar": {
    category: "skill",
    title_ko: "lemo-opuscar — 비디오 모델 없이 Claude Opus 5.5 순수 코드로 연출하는 43가지 영화 스타일",
    catchphrase: "스타일 프롬프트와 순수 자바스크립트 코드만으로 렌더링되는 시네마틱 무비 디렉팅 가이드",
    summary_ko: "별도의 영상 생성 AI 모델을 거치지 않고, 오직 Claude Opus 5.5가 작성하는 순수 웹 코드로만 43가지 시네마틱 영화 스타일의 단편 비디오를 제작할 수 있는 창의적 스킬셋입니다. 스타일 프롬프트, 100% 코드 기반 샘플 영상, 감독 연출 노트 및 기술 가이드라인이 함께 제공됩니다.",
    key_features: [
      "43종의 다양한 영화적 시각 스타일 코드 템플릿 제공",
      "외부 영상 모델 구독 없이 브라우저 캔버스 기반 즉시 렌더링",
      "카메라 기법 및 컬러 그레이딩을 코드로 제어하는 연출 가이드"
    ],
    use_case: "비디오 AI API 비용 없이 웹 코드로 독창적인 시네마틱 애니메이션 데모를 연출할 때",
    tags: ["code-cinema", "opus-directing", "claude-skills", "generative-art"]
  },
  "nanaism/yomiyasu": {
    category: "skill",
    title_ko: "yomiyasu — AI가 생성한 어색한 일본어를 자연스러운 네이티브 표현으로 다듬는 교정 스킬",
    catchphrase: "번역투와 기계적인 일본어 문장을 매끄럽고 신뢰성 높은 비즈니스 일본어로 리팩토링",
    summary_ko: "LLM이 번역하거나 생성한 일본어 텍스트에서 흔히 나타나는 번역투, 부자연스러운 조사 사용, 인위적인 존댓말을 정밀 교정해주는 에이전트 스킬입니다. 현지 네이티브 화자가 작성한 것처럼 자연스럽고 매끄러운 뉘앙스로 문맥을 다듬어 비즈니스 이메일이나 문서의 완성도를 높입니다.",
    key_features: [
      "AI 번역투 및 어색한 조사·어미 패턴 정밀 탐지 및 교정",
      "비즈니스 경어(비즈니스 일본어) 및 친근한 캐주얼 톤 맞춤 변환",
      "원문의 기술적 의미와 명확성을 100% 보존하는 문장 재구성"
    ],
    use_case: "AI로 작성한 일본어 기술 문서나 안내문을 일본 고객 대상 프로덕션 수준으로 정제할 때",
    tags: ["japanese-refinement", "translation-cleanup", "claude-skills", "nlp"]
  },
  "mikehasa/golive-skill": {
    category: "skill",
    title_ko: "golive-skill — 에이전트가 개발한 제품을 본인 계정의 호스팅·DB·도메인으로 즉시 배포하는 스킬",
    catchphrase: "탐지 → 계획 → 승인 → 적용 → 검증으로 이어지는 무의존성 제로 텔레메트리 Go-Live CLI",
    summary_ko: "코딩 에이전트가 로컬에서 완성한 웹 애플리케이션을 사용자의 클라우드 인프라(Vercel, Supabase, Cloudflare 등)에 원클릭으로 실제 서비스 배포할 수 있도록 돕는 스킬입니다. 제3자 플랫폼 가입이나 백엔드 서버 없이 로컬 CLI로 인프라 구성, 도메인 연결, 결제 연동까지 안전하게 자동화합니다.",
    key_features: [
      "프로젝트 스택 자동 감지 및 맞춤형 배포 계획 수립",
      "외부 프록시 없는 무의존성 로컬 Node CLI 기반 안전한 실행",
      "도메인·DNS·환경변수·데이터베이스 마이그레이션 통합 검증"
    ],
    use_case: "로컬에서 바이브 코딩으로 만든 웹 프로토타입을 실제 도메인과 DB로 즉시 런칭할 때",
    tags: ["go-live", "instant-deployment", "infrastructure", "claude-skills", "zero-telemetry"]
  },
  "oil-oil/oil-ui": {
    category: "skill",
    title_ko: "oil-ui — AI의 프론트엔드 UI 디자인 잠재력을 극대화하여 시안을 비교·개선하는 도구",
    catchphrase: "서로 다른 3가지 디자인 방향을 병렬 생성하고 실제 스크린샷과 나란히 대조하며 반복 완성",
    summary_ko: "AI 코딩 에이전트의 UI 디자인 역량을 한계까지 끌어올려 프로급 인터페이스를 도출할 수 있도록 돕는 디자인 스킬입니다. 천편일률적인 기본 템플릿을 벗어나 극명하게 대비되는 여러 디자인 시안을 동시에 생성하고, 브라우저 스크린샷을 비교 분석하며 세부 타이포그래피와 여백을 다듬습니다.",
    key_features: [
      "다양한 디자인 톤(미니멀, 하이퍼모던, 브루탈리즘 등) 동시 다방향 시안 생성",
      "실제 렌더링 스크린샷 대조를 통한 시각적 결함 자동 피드백",
      "Tailwind 및 최신 컴포넌트 시스템 기반 클린 코드 출력"
    ],
    use_case: "평범하고 지루한 AI 생성 UI 디자인을 탈피하여 완성도 높은 독창적 인터페이스를 원할 때",
    tags: ["ui-design", "design-exploration", "claude-skills", "frontend-craft"]
  },
  "amontlabs/lcu": {
    category: "harness",
    title_ko: "lcu — 어떤 에이전트 하네스에서도 쓸 수 있도록 분리된 독립형 Codex 컴퓨터 사용 모듈",
    catchphrase: "Codex의 컴퓨터 사용(Computer Use) 기능을 개별 앱 종속 없이 라이브러리 형태로 분리",
    summary_ko: "Codex 데스크톱 애플리케이션에 결합되어 있던 컴퓨터 조작(마우스, 키보드, 화면 인식) 기능을 순수 라이브러리 형태로 분리(decouple)한 모듈입니다. Claude Code, Hermes, 자체 하네스 등 원하는 어떤 에이전트 런타임에서도 컴퓨터 유즈 자동화 파이프라인을 자유롭게 구성할 수 있습니다.",
    key_features: [
      "기존 앱 번들에서 독립된 경량 컴퓨터 유즈 제어 인터페이스",
      "이기종 에이전트 하네스(Claude Code, Codex, Custom) 어디서나 즉시 임베딩",
      "화면 캡처, 좌표 계산, 정밀 키보드/마우스 이벤트 디스패치"
    ],
    use_case: "자체 제작한 에이전트 워크플로우에 컴퓨터 사용 GUI 자동화 기능을 직접 탑재할 때",
    tags: ["computer-use", "decoupled-module", "agent-harness", "automation"]
  },
  "alexgreensh/anidoodle": {
    category: "skill",
    title_ko: "anidoodle — 코드 기반 일러스트, 인터랙티브 웹 아트, 모션 애니메이션 제작 스킬",
    catchphrase: "매 렌더링마다 완벽히 일관된 결과물을 보장하는 순수 코드 작성 비주얼 아트 툴킷",
    summary_ko: "수십 가지 독창적인 스타일의 일러스트레이션, 루프 애니메이션, 인터랙티브 웹 아트를 코드로 생성하는 에이전트 스킬입니다. 픽셀 기반 이미지 생성과 달리 매번 동일하게 선명한 벡터 및 캔버스 코드로 작성되어 제품 런칭 비디오, 랜딩 페이지 그래픽, 차트 데코레이션에 즉시 사용할 수 있습니다.",
    key_features: [
      "수십 종의 아트 스타일을 지원하는 순수 코드 기반 일러스트 생성",
      "반응형 웹 인터랙션 및 프레임 기반 매끄러운 루프 애니메이션",
      "SVG 및 캔버스 출력으로 손실 없는 확대/축소와 스타일 커스텀"
    ],
    use_case: "랜딩 페이지나 프레젠테이션에 들어갈 독창적인 움직이는 웹 그래픽을 코드로 제작할 때",
    tags: ["code-art", "vector-animation", "web-illustration", "claude-skills"]
  },
  "devswha/herdr-web-ui": {
    category: "mcp",
    title_ko: "herdr-web-ui — 여러 에이전트 패널과 터미널을 브라우저와 모바일에서 제어하는 웹 클라이언트",
    catchphrase: "SSH 원격 서버와 로컬 에이전트 터미널을 웹에서 통합 조작하고 웹 푸시 알림 수신",
    summary_ko: "분산 환경에서 실행되는 여러 코딩 에이전트 세션을 하나의 웹 브라우저 및 스마트폰 인터페이스에서 모니터링할 수 있는 UI 도구입니다. 각 에이전트별 실시간 터미널 스트리밍, SSH를 통한 원격 PC 접속, 작업 완료 및 확인 대기 시 웹 푸시 알림을 지원하여 에이전트 관리 편의성을 극대화합니다.",
    key_features: [
      "모바일 및 데스크톱 브라우저 최적화 다중 에이전트 대시보드",
      "SSH 원격 머신 에이전트 터미널 실시간 스트리밍 및 명령 전달",
      "에이전트 입력 대기 및 에러 발생 시 즉각적인 웹 푸시 알림"
    ],
    use_case: "외출 중이거나 침대에서 스마트폰으로 실행 중인 에이전트들의 상태를 확인하고 지시할 때",
    tags: ["agent-ui", "web-terminal", "remote-monitoring", "push-alerts"]
  },
  "angel291592/Intent-Router": {
    category: "harness",
    title_ko: "Intent-Router — 모호한 자연어 요청을 정형화된 IntentSpec 계약으로 변환하는 의도 컴파일러",
    catchphrase: "에이전트 라우팅 전 단계에서 사용자 요청을 엄격한 타입 계약으로 정제하는 인풋 레이어",
    summary_ko: "사용자의 추상적이거나 불완전한 자연어 지시를 사전 검증하여 타입이 정의된 IntentSpec 규격으로 컴파일하는 의도 정제 컴파일러입니다. 작업 실행 전에 추가 질문이 필요한지, 안전 검사가 필요한지 판단하여 Jev, Laya 등 의사결정 모델 및 라우터 하네스에 안정적인 입력을 제공합니다.",
    key_features: [
      "자연어 프롬프트의 정형화된 IntentSpec 타입 계약 자동 변환",
      "불완전한 요청 시 자동 탐색(Probe) 또는 추가 질문(Ask) 트리거",
      "멀티 모델 라우터 및 결정 엔진 앞단의 지능형 가드레일 역할"
    ],
    use_case: "다중 에이전트 파이프라인에서 엉뚱한 도구가 호출되지 않도록 의도를 먼저 엄격히 검증할 때",
    tags: ["intent-router", "intent-spec", "agent-harness", "decision-layer"]
  },
  "ruc-datalab/EvoOntology": {
    category: "skill",
    title_ko: "EvoOntology — Claude Code 및 Codex를 위해 스스로 진화하는 데이터 에이전트 온톨로지 레이어",
    catchphrase: "대규모 데이터 분석 및 코드베이스 이해를 돕는 자기 진화형 지식 체계 플러그인",
    summary_ko: "복잡한 데이터 엔지니어링 및 대형 도메인 모델을 다루는 코딩 에이전트를 위한 자기 진화형 온톨로지 플러그인입니다. 데이터 엔티티와 비즈니스 로직 사이의 관계를 지식 그래프 형태로 지속적으로 구축·업데이트하여 에이전트가 데이터 스키마의 맥락을 깊이 이해하도록 지원합니다.",
    key_features: [
      "데이터 분석 및 도메인 엔티티 간 온톨로지 자동 생성 및 진화",
      "Claude Code와 Codex 환경에서의 스키마 이해도 벤치마크 향상",
      "지식 그래프 기반의 정밀 질의응답 및 관계 추론 지원"
    ],
    use_case: "복잡하게 얽힌 데이터베이스 스키마와 데이터 파이프라인을 에이전트가 다룰 때",
    tags: ["ontology", "data-agent", "knowledge-graph", "claude-plugins"]
  },
  "op7418/guizang-product-video-skill": {
    category: "skill",
    title_ko: "guizang-product-video-skill — 실제 제품 컴포넌트로 소프트웨어 홍보 영상을 코딩 제작하는 스킬",
    catchphrase: "실제 UI 디자인 언어를 재사용하여 콘티 작성, 음악, 사운드 이펙트, 비디오 렌더링까지 일원화",
    summary_ko: "소프트웨어 업데이트 및 신기능 런칭을 위한 고품질 제품 소개 영상을 순수 코드로 제작하는 전문 에이전트 스킬입니다. 실제 제품의 리액트 컴포넌트와 스타일을 그대로 불러와 분경 콘티 작성, 맞춤형 배경음악과 효과음 믹싱, 애니메이션 렌더링까지 에이전트가 완벽히 수행합니다.",
    key_features: [
      "실제 프로덕션 UI 컴포넌트 및 디자인 시스템 직접 재사용",
      "분경 시나리오, 사운드 디자인, 키프레임 애니메이션 자동화",
      "Claude Code 및 Codex 환경 완벽 호환 영상 렌더링 엔진"
    ],
    use_case: "소프트웨어 새 기능 출시 시 디자이너 없이 개발 코드를 활용해 멋진 홍보 영상을 만들 때",
    tags: ["product-video", "motion-design", "claude-skills", "showcase"]
  },
  "Vincentwei1021/mg-styles-15": {
    category: "skill",
    title_ko: "mg-styles-15 — 단 하나의 프롬프트로 Claude Opus 5.5가 구현하는 15가지 모션 디자인 스타일",
    catchphrase: "완성된 영상 감상, 프롬프트 복사, 전체 오픈소스 코드 열람이 가능한 모션 그래픽 컬렉션",
    summary_ko: "Claude Opus 5.5 모델이 단일 프롬프트에서 생성해낸 15가지 독창적인 모션 그래픽 및 인터랙티브 애니메이션 모음집입니다. 각각의 영상 결과물과 함께 이를 재현할 수 있는 프롬프트 원문과 완전한 소스코드가 공개되어 있어 웹 애니메이션 영감을 얻고 복사해 쓰기 좋습니다.",
    key_features: [
      "15종의 세련된 프로급 모션 디자인 스타일 템플릿 수록",
      "프롬프트 복사 및 순수 프론트엔드 전체 소스코드 제공",
      "Claude Opus 5.5 모델의 비주얼 코드 생성 능력 입증 레퍼런스"
    ],
    use_case: "웹 랜딩 페이지나 인터랙티브 프로젝트에 고급스러운 모션 그래픽 효과를 빠르게 적용할 때",
    tags: ["motion-design", "prompt-collection", "opus-canvas", "web-animation"]
  },
  "franzenzenhofer/big-arrow-on-the-screen": {
    category: "skill",
    title_ko: "big-arrow-on-the-screen — 맥 화면에 화살표와 텍스트를 즉각 그려주는 에이전트 가이드 CLI",
    catchphrase: "에이전트가 설명 중인 화면 요소를 거대한 화살표와 박스로 강조하고 스스로 사라지는 도구",
    summary_ko: "Mac 화면 위에 투명 오버레이를 띄워 AI 에이전트가 현재 언급하고 있는 버튼이나 UI 요소를 거대한 화살표, 하이라이트 박스, 텍스트로 직접 가리켜주는 CLI 스킬입니다. 클릭 관통(Click-through)을 지원하여 작업에 방해되지 않으며 일정 시간 후 자동으로 사라집니다.",
    key_features: [
      "화면 특정 좌표에 즉시 렌더링되는 시각적 화살표 및 강조 박스",
      "마우스 클릭을 방해하지 않는 투명 오버레이 클릭 관통 모드",
      "단일 CLI 명령으로 제어되며 자동 페이드아웃 지원"
    ],
    use_case: "에이전트가 화면 조작 안내나 튜토리얼을 제공할 때 어디를 봐야 하는지 직관적으로 알려줄 때",
    tags: ["screen-arrow", "mac-overlay", "visual-guide", "claude-skills"]
  },
  "sno-ai/sno-station": {
    category: "agent",
    title_ko: "sno-station — 다양한 코딩 에이전트들을 하나의 유기적인 원격 스쿼드로 묶는 스테이션",
    catchphrase: "Codex, Claude Code, Cursor, Hermes가 암호화된 공유 메모리로 협업하고 매일 밤 상호 리뷰",
    summary_ko: "기존에 각자 따로 쓰던 여러 코딩 에이전트들(Codex, Claude Code, Cursor, Hermes 등)을 하나의 협업 팀(Squad)으로 조직해주는 오픈소스 로컬 스테이션입니다. 단일 암호화 메모리를 공유하여 에이전트끼리 작업을 인수인계하고, 작성한 코드를 교차 검토하며 성능을 점진적으로 개선합니다.",
    key_features: [
      "다종 에이전트 간 암호화 공유 메모리 및 작업 인수인계 프로토콜",
      "에이전트 간 코드 상호 리뷰 및 야간 자동 개선 루프",
      "외부 서버 없는 100% 로컬 컴퓨터 프라이빗 구동"
    ],
    use_case: "여러 AI 에이전트 도구들을 묶어 자율적으로 협업하고 상호 보완하는 개발 팀을 꾸릴 때",
    tags: ["agent-squad", "shared-memory", "multi-agent-station", "local-first"]
  },
  "techjarves/Mobile-Harness": {
    category: "harness",
    title_ko: "Mobile-Harness — 안드로이드 스마트폰에서 루트 없이 구동되는 모바일 Claude Code IDE",
    catchphrase: "폰에서 에이전트와 대화하고, 리눅스 명령을 실행하며, 코드 diff 검토와 웹앱 미리보기까지 완성",
    summary_ko: "안드로이드 스마트폰 환경에서 루트 권한 없이 Claude Code를 온전히 실행할 수 있도록 설계된 모바일 코딩 하네스이자 IDE입니다. 터미널 환경, 파일 편집기, git diff 뷰어, 내장 브라우저 웹앱 프리뷰를 제공하여 이동 중에도 스마트폰 하나로 완벽한 에이전트 코딩 작업을 수행할 수 있습니다.",
    key_features: [
      "루트 권한 필요 없는 안드로이드 네이티브 Claude Code 실행 환경",
      "에이전트 대화, 터미널 명령, 파일 수정, 코드 diff 통합 모바일 UI",
      "스마트폰 내 로컬 웹 서버 구동 및 실시간 웹 애플리케이션 미리보기"
    ],
    use_case: "노트북이 없는 출퇴근길이나 이동 중에 스마트폰으로 급한 코드 수정과 배포를 처리할 때",
    tags: ["mobile-ide", "android-harness", "claude-on-phone", "portable-coding"]
  },
  "zhuyansen/awesome-claude-video-skills": {
    category: "skill",
    title_ko: "awesome-claude-video-skills — 코딩 에이전트의 영상 제작을 위한 180여 개 오픈소스 스킬 모음",
    catchphrase: "Claude Code와 Codex로 비디오를 제작할 수 있는 도구들을 보안 등급과 유형별로 체계화",
    summary_ko: "Claude Code, Codex 등 최신 코딩 에이전트를 활용하여 영상 기획, 대본 작성, 콘티, 렌더링, 오디오 믹싱을 수행할 수 있는 180개 이상의 오픈소스 스킬과 툴킷을 정리한 큐레이션 리스트입니다. 각 리포지토리별 보안 등급 평가와 상세 가이드가 포함되어 안전하게 활용할 수 있습니다.",
    key_features: [
      "180개 이상의 비디오 특화 에이전트 스킬 엄선 및 카테고리별 분류",
      "각 스킬별 보안 위험도 및 권한 요구사항 사전 검증 등급 제공",
      "글로벌 개발자를 위한 영문 및 중문 상세 안내 문서 지원"
    ],
    use_case: "AI 에이전트로 숏폼, 프로모션 영상, 모션 그래픽을 만들 때 필요한 도구를 찾고 싶을 때",
    tags: ["awesome-list", "video-skills", "claude-code", "curation"]
  },
  "travisvn/awesome-claude-skills": {
    category: "skill",
    title_ko: "awesome-claude-skills — Claude Code 워크플로우를 극대화하는 검증된 명품 스킬 컬렉션",
    catchphrase: "개발, 분석, 디자인, 시스템 운영 전 분야를 아우르는 필수 Claude Skills 공식 레퍼런스",
    summary_ko: "Claude AI, 특히 Claude Code의 작업 효율과 성능을 극대화하기 위해 전 세계 개발자들이 제작한 우수 스킬들을 집대성한 대표 오픈소스 디렉토리입니다. 코드 리뷰, 데이터베이스 제어, 웹 스크래핑, 브라우저 자동화 등 실무에 즉시 투입 가능한 검증된 스킬들을 한눈에 탐색할 수 있습니다.",
    key_features: [
      "글로벌 커뮤니티에서 검증된 고품질 Claude Skills 총망라",
      "카테고리별 명확한 분류 및 원클릭 설치 가이드라인 수록",
      "지속적인 업데이트로 최신 Claude Code 규격 완벽 대응"
    ],
    use_case: "Claude Code를 설치한 후 실무 생산성을 즉시 끌어올릴 핵심 스킬들을 찾아볼 때",
    tags: ["awesome-skills", "claude-code", "skills-directory", "productivity"]
  },
  "wshobson/agents": {
    category: "agent",
    title_ko: "agents — 8대 에이전트 하네스를 넘나드는 멀티 플랫폼 에이전틱 플러그인 마켓플레이스",
    catchphrase: "Claude Code, Codex, Cursor, OpenCode, Copilot, Antigravity, Pi를 잇는 범용 에이전트 생태계",
    summary_ko: "특정 에이전트 도구에 종속되지 않고 Claude Code, Codex, Cursor, Google Antigravity, GitHub Copilot 등 8가지 주요 에이전트 하네스에서 공통으로 동작할 수 있는 플러그인과 스킬을 배포·공유하는 오픈소스 마켓플레이스입니다. 표준 인터페이스를 제공하여 생태계 파편화를 극복합니다.",
    key_features: [
      "8대 주요 에이전트 하네스 간 크로스 플랫폼 플러그인 호환성",
      "단일 설정 파일로 멀티 에이전트 환경에 스킬 일괄 설치 및 동기화",
      "풍부한 커뮤니티 기여 플러그인 생태계와 안정적인 버전 관리"
    ],
    use_case: "여러 코딩 에이전트 도구를 번갈아 쓰면서 동일한 스킬과 환경을 유지하고 싶을 때",
    tags: ["agent-marketplace", "multi-harness", "universal-plugins", "cross-platform"]
  },
  "career-ops-hq/career-ops": {
    category: "agent",
    title_ko: "career-ops — 채용 공고 분석부터 ATS 맞춤 이력서 작성까지 돕는 로컬 AI 구직 에이전트",
    catchphrase: "채용 사이트를 탐색해 이력서와의 일치도를 점수화하고 지원서 작성을 자동 지원하는 에이전트",
    summary_ko: "취업 공고 사이트를 정밀 스캔하여 사용자의 이력서와 역량 매칭 점수(1~5점)를 산출하고, 지원하려는 기업의 ATS 시스템에 최적화된 맞춤형 이력서와 자기소개서를 자동으로 초안 작성해주는 AI 커리어 에이전트입니다. 지원서 폼 작성을 돕고 최종 제출만 사용자가 승인하도록 설계되었습니다.",
    key_features: [
      "채용 공고 요구사항과 보유 이력서 간 다차원 매칭 스코어링",
      "기업별 ATS(서류 필터링) 맞춤형 커스텀 이력서 및 커버레터 생성",
      "지원 이력 통합 트래킹 및 인터뷰 예상 질문 사전 대비"
    ],
    use_case: "수많은 개발자 채용 공고 중 내 이력에 딱 맞는 포지션을 찾고 맞춤형으로 지원할 때",
    tags: ["job-search", "career-ops", "ats-resume", "claude-code-agent"]
  },
  "tamaratran/fast-jev-compaction": {
    category: "skill",
    title_ko: "fast-jev-compaction — Jev 의사결정으로 필수 출력만 남기고 고속 압축하는 컨텍스트 플러그인",
    catchphrase: "느리고 모호한 LLM 요약 대신 단 한 번의 요청으로 도구 실행 결과를 원문 그대로 선별 보존",
    summary_ko: "Claude Code가 긴 세션에서 수행하는 기본 컨텍스트 요약(Compaction) 방식을 혁신하는 최적화 플러그인입니다. 느리고 불완전한 텍스트 재요약 대신 Jev 결정 모델을 적용해 모든 도구 호출과 결과를 신속히 점수화하고, 불필요한 로그는 버리며 중요한 결과는 원문 그대로 유지하여 추론 품질을 지킵니다.",
    key_features: [
      "단일 고속 요청을 통한 도구 호출 및 실행 결과 지능형 중요도 채점",
      "중요한 컨텍스트는 왜곡 없는 원문(Verbatim) 보존",
      "장기 코딩 세션에서의 컨텍스트 윈도우 절약 및 환각 방지"
    ],
    use_case: "긴 에이전트 코딩 세션에서 기존 요약 때문에 이전 컨텍스트가 망가지는 현상을 막을 때",
    tags: ["context-compaction", "jev-decision", "claude-plugin", "token-optimization"]
  },
  "echris6/motion-video-kit": {
    category: "skill",
    title_ko: "motion-video-kit — 28개 런칭 필름의 모션 원칙을 이식한 프리미엄 비즈니스 비디오 킷",
    catchphrase: "독립 비평가 루프, Three.js 패턴, 프로급 사운드 디자인을 통합한 비즈니스 영상 스킬셋",
    summary_ko: "실제 글로벌 테크 기업들의 28개 공식 런칭 영상에서 추출한 고급 모션 그래픽 원칙과 Three.js 3D 패턴을 Claude Code에 이식한 비즈니스 비디오 제작 킷입니다. 에이전트가 코드를 짤 때 자체 비평가(Critic) 루프를 돌아 타이밍, 시각적 밸런스, 사운드 연출을 엄격히 감수합니다.",
    key_features: [
      "28개 최상위 테크 런칭 비디오 분석 기반 모션 물리 법칙 적용",
      "에이전트 자체 비평 루프를 통한 시각적 품질 기준 자동 검증",
      "Three.js 인터랙티브 3D 패턴 및 프로 사운드 디자인 결합"
    ],
    use_case: "스타트업 제품 출시나 주요 기능 런칭을 위한 고품격 프로모션 비디오를 제작할 때",
    tags: ["business-video", "launch-film", "motion-principles", "claude-skills"]
  },
  "Edwardxlai/easyread": {
    category: "skill",
    title_ko: "easyread — 영어 논문을 편안한 한국어/중국어로 읽는 로컬 PDF 논문 번역 및 질의 스킬",
    catchphrase: "로컬 PDF 원문 대조 번역, 읽으면서 실시간 AI 질의응답, 문헌 관리까지 한곳에서",
    summary_ko: "복잡한 영어 학술 논문 PDF를 자연스럽고 읽기 쉬운 언어로 번역하여 원문과 나란히 비교하며 읽을 수 있는 연구자용 에이전트 스킬입니다. 논문을 읽는 도중 이해가 안 가는 수식이나 개념을 에이전트에게 즉시 질의하고, 논문 메타데이터와 인용을 로컬에서 체계적으로 관리할 수 있습니다.",
    key_features: [
      "로컬 PDF 논문의 레이아웃을 보존하는 좌우 대조 정밀 번역",
      "논문 본문 문맥 기반의 실시간 심층 질의응답 및 수식 해설",
      "오프라인 로컬 환경 중심의 연구 문헌 및 초록 데이터베이스 관리"
    ],
    use_case: "방대한 최신 AI 논문이나 학술 자료를 빠르게 이해하고 깊이 있게 분석하고 싶을 때",
    tags: ["paper-reader", "pdf-translation", "academic-research", "claude-skills"]
  },
  "AgentSystemLabs/agent-office": {
    category: "agent",
    title_ko: "agent-office — 팀원들이 책상에 Claude Code 직원을 배치하고 소통하는 3D 가상 오피스",
    catchphrase: "3D 카툰 오피스에서 에이전트 터미널을 공유하고, 음성으로 대화하며, GitHub 이슈를 관리",
    summary_ko: "귀여운 카툰 풍의 3D 가상 오피스 환경에서 Claude Code 에이전트들을 각자의 책상에 배치하고 팀원들이 함께 일할 수 있는 협업 플랫폼입니다. 에이전트의 실시간 작업 터미널 화면을 함께 보며 음성으로 지시를 내리고, GitHub 이슈와 PR 처리 현황을 가상 공간에서 한눈에 트래킹할 수 있습니다.",
    key_features: [
      "카툰 3D 가상 오피스 기반 에이전트 작업 공간 시각화",
      "팀원 간 실시간 터미널 화면 공유 및 음성 대화 인터페이스",
      "GitHub 이슈 및 PR 진행 상태를 가상 데스크 업무로 연동"
    ],
    use_case: "원격 근무 팀에서 AI 코딩 에이전트들을 마치 동료 직원처럼 배치하고 협업할 때",
    tags: ["3d-office", "virtual-workspace", "agent-collaboration", "claude-code"]
  },
  "ythx-101/live-panel-skill": {
    category: "skill",
    title_ko: "live-panel-skill — 설정 JSON 하나로 살아 움직이는 시스템 아키텍처 다이어그램을 만드는 스킬",
    catchphrase: "단 하나의 JSON 설정으로 터미널 스타일의 움직이는 다이어그램이나 웹 인포그래픽을 렌더링",
    summary_ko: "복잡한 클라우드 인프라와 소프트웨어 아키텍처를 단 하나의 JSON 설정 파일로 정의하여 실시간으로 데이터가 흐르는 동적 다이어그램으로 변환해주는 스킬입니다. 터미널 감성의 라이브 대시보드 웹페이지는 물론 H.264 mp4 영상으로도 즉시 내보낼 수 있습니다.",
    key_features: [
      "JSON 설정 기반의 데이터 흐름 애니메이션 다이어그램 자동 생성",
      "터미널 테마 및 라이트 테마 웹 인포그래픽 실시간 인터랙션",
      "H.264 MP4 비디오 렌더링 및 웹 임베딩 동시 지원"
    ],
    use_case: "시스템 아키텍처나 데이터 파이프라인의 흐름을 발표 자료용 동적 비주얼로 표현할 때",
    tags: ["architecture-diagram", "animated-infographic", "system-design", "claude-skills"]
  },
  "ThinkWatchProject/ThinkWatch-Lite": {
    category: "harness",
    title_ko: "ThinkWatch-Lite — 악성 도구 호출을 차단하고 API 키를 보호하는 경량 로컬 게이트웨이",
    catchphrase: "클라이언트 수정 없이 업스트림 전환, 릴레이 유출 방지, 전 요청 추적을 제공하는 보안 프록시",
    summary_ko: "Claude Code, Codex 등 다양한 AI 클라이언트를 위해 개발된 초경량 로컬 보안 게이트웨이입니다. 클라이언트 설정을 건드리지 않고도 백엔드 모델 공급자를 교체할 수 있으며, 릴레이 프록시로부터 API 키 탈취를 차단하고, 에이전트의 위험하거나 악의적인 도구 호출을 실시간 차단하며 모든 트래픽을 추적합니다.",
    key_features: [
      "클라이언트 설정 변경 없는 지능형 업스트림 프록시 라우팅",
      "에이전트의 위험한 셸 명령어 및 도구 호출 실시간 가드레일 차단",
      "API 키 보호 및 모든 요청·응답에 대한 로컬 감사 추적(Trace)"
    ],
    use_case: "코딩 에이전트가 위험한 시스템 명령을 실행하지 못하도록 로컬에서 안전하게 감시할 때",
    tags: ["security-gateway", "tool-call-guard", "api-proxy", "agent-harness"]
  },
  "undefined-ui/second-brain-os": {
    category: "skill",
    title_ko: "second-brain-os — Claude Code와 옵시디언이 결합하여 스스로 정리되는 AI 세컨드 브레인",
    catchphrase: "스스로 분류되고 링크되는 옵시디언 스타터 볼트, 자동화 스크립트, 전문 에이전트 스킬셋",
    summary_ko: "Claude Code와 옵시디언(Obsidian)을 완벽히 연동하여 메모와 지식이 스스로 분류되고 상호 연결되는 세컨드 브레인 구축 키트입니다. 정교하게 설계된 스타터 볼트 템플릿과 함께 데일리 노트 요약, 백링크 자동 생성, 중복 지식 통합을 에이전트가 백그라운드에서 주기적으로 수행합니다.",
    key_features: [
      "Claude Code와 옵시디언 마크다운 볼트 간 양방향 자동 동기화",
      "지식 분류, 백링크 형성, 중복 제거를 수행하는 자율 정리 스킬",
      "실무 지식 관리에 즉시 적용 가능한 스타터 볼트 템플릿 내장"
    ],
    use_case: "옵시디언에 쌓인 방대한 메모와 기술 지식을 에이전트가 알아서 체계적으로 정리해주길 원할 때",
    tags: ["second-brain", "obsidian", "pkm", "knowledge-management", "claude-skills"]
  },
  "tigerless-labs/agent-memory": {
    category: "agent",
    title_ko: "agent-memory — 마크다운을 단일 진실 공급원으로 삼는 에이전트 장기 메모리 런타임",
    catchphrase: "Claude Code와 Codex가 공유하는 로컬 랭킹 검색과 수면 시간 자가 정리 메모리 레이어",
    summary_ko: "별도의 복잡한 벡터 DB나 외부 API 없이 순수 마크다운(Markdown) 파일을 단일 진실 공급원(SSOT)으로 사용하는 AI 에이전트용 장기 기억 런타임입니다. 로컬 랭킹 검색으로 과거 작업 맥락을 초고속 조회하며, 에이전트 유휴 시간(Sleep-time)에 메모리를 자율 압축·정리합니다.",
    key_features: [
      "순수 마크다운 파일 기반의 영구 보존 에이전트 장기 기억 저장소",
      "외부 API 호출 없는 로컬 랭킹 검색 엔진 내장",
      "Claude Code와 Codex 간 세션 컨텍스트 및 사용자 선호도 완벽 공유"
    ],
    use_case: "에이전트가 세션이 바뀌어도 과거에 나눈 대화와 프로젝트 컨벤션을 잊지 않게 할 때",
    tags: ["long-term-memory", "markdown-ssot", "agent-runtime", "local-retrieval"]
  },
  "morluto/rea": {
    category: "agent",
    title_ko: "rea — 앱 동작 분석부터 네이티브 바이너리까지 자율 조사하는 역공학 에이전트",
    catchphrase: "애플리케이션의 런타임 행동과 바이너리 구조를 에이전트가 깊이 파고들어 분석",
    summary_ko: "애플리케이션의 상위 런타임 동작부터 저수준 네이티브 바이너리 코드까지 단계별로 자율 분석할 수 있는 역공학(Reverse Engineering) 전문 에이전트입니다. 바이너리 디스어셈블리, 시스템 콜 추적, 함수 호출 그래프 복원을 에이전트가 주도하여 보안 감사 및 취약점 분석 속도를 크게 향상시킵니다.",
    key_features: [
      "런타임 행동 분석부터 네이티브 바이너리 역어셈블리까지 종합 역공학",
      "자율적인 함수 호출 그래프 추적 및 핵심 취약점 위치 특정",
      "GDB/LLDB 등 디버거 도구와의 에이전틱 상호작용 자동화"
    ],
    use_case: "폐쇄형 소프트웨어나 바이너리 파일의 내부 동작 메커니즘을 에이전트로 분석할 때",
    tags: ["reverse-engineering", "binary-analysis", "security-audit", "agent-framework"]
  },
  "Folkbench/folkbench": {
    category: "harness",
    title_ko: "folkbench — Claude Code와 Codex용 AI API 릴레이 서버의 가용성·지연시간·단가를 실측 비교하고 전환하는 도구",
    catchphrase: "오픈소스 AI API 중계 서비스의 실제 가용률과 응답 속도를 벤치마킹하고 원클릭으로 전환",
    summary_ko: "Claude Code와 OpenAI Codex에서 사용하는 다양한 AI API 릴레이(중계) 서비스들의 실제 가용성, 응답 지연 시간(Latency), 토큰 단가를 실시간으로 벤치마킹하고 순위를 매겨주는 Rust 및 Tauri 기반 데스크톱 도구입니다. 특정 API 공급자에 장애가 발생하거나 응답이 느려질 때 가장 빠르고 안정적인 엔드포인트로 즉시 전환할 수 있습니다.",
    key_features: [
      "AI API 릴레이 서비스별 실시간 가용률·응답 지연 시간·가격 비교 벤치마크",
      "Claude Code 및 Codex 설정 파일과 연동되는 원클릭 엔드포인트 스위처",
      "Rust 및 Tauri 기반의 가볍고 빠른 크로스플랫폼 데스크톱 앱 제공"
    ],
    use_case: "여러 LLM API 프록시나 라우터를 사용할 때 가장 응답이 빠르고 저렴한 공급자로 즉시 전환하고 싶을 때",
    tags: ["api-relay", "benchmark", "endpoint-switcher", "claude-code", "codex", "tauri"]
  },
  "zhuyansen/new-term-radar": {
    category: "skill",
    title_ko: "new-term-radar — 검색 트렌드 도구에 잡히기 전 신규 AI 모델·제품·저장소 신조어를 포착하는 일일 레이더",
    catchphrase: "X, Hugging Face, GitHub, 사이트맵에서 새로 등장한 AI 기술 용어와 프로젝트를 가장 먼저 탐지",
    summary_ko: "Google Trends나 기존 SEO 키워드 도구가 인덱싱하기 전에 X(트위터), Hugging Face, GitHub 트렌딩, 주요 기술 사이트맵을 매일 스캔하여 새롭게 등장한 AI 모델명, 프레임워크, 오픈소스 프로젝트 명칭을 실시간으로 포착하는 스킬 및 MCP 서버입니다. 기술 트렌드 리서처와 프로덕트 빌더가 초기 시그널을 선점할 수 있도록 돕습니다.",
    key_features: [
      "X·Hugging Face·GitHub·웹 사이트맵 교차 스캔 기반 신조어 조기 탐지",
      "기존 키워드 도구가 놓치는 신규 출시 모델 및 오픈소스 프로젝트 식별",
      "Claude Code 스킬 및 MCP 서버 인터페이스로 트렌드 리서치 자동화"
    ],
    use_case: "새롭게 부상하는 AI 모델이나 오픈소스 기술 키워드를 남들보다 가장 먼저 파악하고 분석할 때",
    tags: ["trend-radar", "keyword-research", "early-signal", "claude-skills", "mcp-server"]
  },
  "vshulcz/deja-vu": {
    category: "mcp",
    title_ko: "deja-vu — 디스크에 저장된 40여 종 코딩 에이전트의 과거 세션 이력을 LLM 없이 초고속 검색하는 단일 바이너리 메모리",
    catchphrase: "Claude Code, Codex, Cursor 등 디스크 내 기존 세션 로그를 즉시 자산화하는 Go 단일 바이너리 MCP",
    summary_ko: "별도의 외부 LLM 호출이나 무거운 데이터베이스 없이, 로컬 디스크에 이미 남아 있는 Claude Code, Codex, Cursor, Gemini CLI 등 40여 종 코딩 에이전트의 세션 히스토리를 색인하여 초고속 검색과 지속형 메모리를 제공하는 Go 단일 바이너리 도구입니다. MCP 서버와 훅(Hooks)을 통해 과거에 해결했던 버그나 설계 결정을 새로운 에이전트 세션에 즉시 주입합니다.",
    key_features: [
      "Claude Code·Codex·Cursor 등 40여 개 코딩 에이전트의 로컬 세션 로그 통합 색인",
      "외부 LLM 비용 없이 즉각 동작하는 단일 Go 바이너리 기반 초고속 로컬 검색",
      "MCP 서버 및 훅 연동으로 과거 작업 맥락을 현재 세션에 자동 복원"
    ],
    use_case: "여러 코딩 에이전트를 오가며 작업할 때 예전 세션에서 해결했던 코드와 대화 맥락을 즉시 되살리고 싶을 때",
    tags: ["session-history", "agent-memory", "local-search", "go-binary", "mcp-server"]
  },
  "QwenAudio/qwen-audio-agent": {
    category: "agent",
    title_ko: "qwen-audio-agent — 코딩 에이전트와 실시간으로 끊김 없이 음성 대화를 나누며 협업하는 보이스 런타임",
    catchphrase: "에이전트가 코드를 작성하고 실행하는 동안 실시간 음성으로 소통하는 저지연 보이스 런타임",
    summary_ko: "Claude Code, Codex, OpenCode 등 AI 코딩 에이전트에 실시간 음성 인식(ASR)과 음성 합성(TTS) 파이프라인을 결합하여, 에이전트가 작업을 수행하는 내내 사람 동료처럼 자연스럽게 대화할 수 있게 해주는 실시간 보이스 런타임입니다. 키보드 타이핑 없이 음성으로 아키텍처를 지시하고 에이전트의 진행 상황 브리핑을 즉시 귀로 들을 수 있습니다.",
    key_features: [
      "저지연 실시간 음성 인식(STT) 및 자연스러운 음성 합성(TTS) 양방향 스트리밍",
      "Claude Code·Codex·OpenCode 등 주요 코딩 에이전트 런타임과 직접 결합",
      "작업 중 인터럽트(끼어들기) 및 실시간 상태 브리핑을 지원하는 에이전틱 보이스 인터페이스"
    ],
    use_case: "화면 공유나 코드 리뷰를 하면서 코딩 에이전트에게 음성으로 지시를 내리고 실시간 피드백을 받고 싶을 때",
    tags: ["voice-agent", "realtime-audio", "speech-to-text", "ai-coding", "qwen-audio"]
  },
  "lidge-jun/opencodex": {
    category: "harness",
    title_ko: "opencodex — OpenAI Codex와 Claude Code에서 모든 상용·로컬 LLM을 자유롭게 연결해 쓰는 범용 프록시",
    catchphrase: "Claude, Gemini, Grok, DeepSeek, Ollama 등 원하는 모든 모델을 Codex CLI와 Claude Code에 연결",
    summary_ko: "OpenAI Codex(CLI·App·SDK)와 Claude Code 환경에서 특정 벤더 종속 없이 Claude, Gemini, Grok, DeepSeek, 로컬 Ollama 등 원하는 모든 LLM 공급자를 연결해 사용할 수 있도록 프로토콜과 도구 호출 포맷을 변환해주는 범용 AI 게이트웨이 프록시입니다.",
    key_features: [
      "OpenAI Codex 및 Claude Code 클라이언트와 이기종 LLM API 간의 양방향 포맷 변환",
      "Claude·Gemini·Grok·DeepSeek·OpenRouter·로컬 Ollama 모델 무제한 연동",
      "모델별 스트리밍 응답, 함수/도구 호출(Tool Calling), 토큰 사용량 추적 완벽 호환"
    ],
    use_case: "Codex CLI나 Claude Code 인터페이스는 그대로 유지하면서 백엔드 모델을 DeepSeek, Gemini, 로컬 LLM 등으로 유연하게 바꿔가며 쓸 때",
    tags: ["llm-proxy", "universal-gateway", "codex-cli", "claude-code", "multi-model"]
  },
  "ComposioHQ/awesome-claude-skills": {
    category: "skill",
    title_ko: "awesome-claude-skills — 실무 워크플로우 자동화를 위한 검증된 Claude 스킬 및 리소스 종합 큐레이션",
    catchphrase: "Composio가 엄선한 분야별 Claude Code·Claude AI 커스텀 스킬과 외부 서비스 연동 템플릿 총집합",
    summary_ko: "Claude와 Claude Code의 실무 활용도를 극대화할 수 있는 고품질 커스텀 스킬(SKILL.md), 프롬프트 템플릿, 외부 SaaS 연동 자동화 레시피를 체계적으로 분류해 놓은 대표 큐레이션 저장소입니다. 개발, 데이터 분석, 문서 작성, 마케팅, DevOps 등 직무별로 즉시 복사해 쓸 수 있는 스킬 예제를 제공합니다.",
    key_features: [
      "개발·데이터·기획·데브옵스 등 직무별로 검증된 Claude 스킬 템플릿 총망라",
      "GitHub·Notion·Slack·Jira 등 외부 SaaS 도구와 결합된 실전 워크플로우 레시피 제공",
      "Claude Code, Cursor, Gemini CLI 등 다양한 에이전트 환경에서 즉시 재사용 가능한 표준 규격"
    ],
    use_case: "팀이나 개인 업무에 바로 도입할 수 있는 검증된 Claude 스킬 예제와 자동화 레시피를 찾고 싶을 때",
    tags: ["awesome-list", "claude-skills", "workflow-automation", "composio", "agent-resources"]
  },
  "MaxFreedomPollard/Compartment": {
    category: "mcp",
    title_ko: "Compartment — 메모리 맵 GUI를 갖춘 완전 오프라인·암호화 기반의 로컬 에이전트 장기 기억 저장소",
    catchphrase: "클라우드 유출 걱정 없는 100% 오프라인 암호화 메모리와 시각적 메모리 맵 GUI를 원클릭으로 구축",
    summary_ko: "모든 운영체제와 코딩 에이전트(Claude Code, Claude Desktop, Gemini CLI 등)에서 사용할 수 있는 완전 오프라인·로컬 암호화 기반 에이전트 장기 기억 시스템입니다. 원클릭 설치와 함께 기억 간의 연결 구조를 눈으로 확인하고 편집할 수 있는 메모리 맵 GUI를 제공하며, 로컬 시맨틱 검색으로 정교한 기억 생성·보관·인출을 수행합니다.",
    key_features: [
      "외부 네트워크 전송 없이 로컬 디스크에서 완전 암호화되어 동작하는 오프라인 메모리",
      "에이전트가 축적한 지식과 관계를 시각적으로 탐색·편집하는 메모리 맵(Memory Map) GUI",
      "MCP 표준 인터페이스를 통해 Claude·Gemini 등 모든 에이전트에 원클릭 연동"
    ],
    use_case: "민감한 사내 코드나 개인정보가 포함된 프로젝트 맥락을 외부 클라우드 노출 없이 안전하게 에이전트 장기 기억으로 관리할 때",
    tags: ["encrypted-memory", "offline-first", "memory-map-gui", "mcp-server", "privacy"]
  },
  "mikehasa/agentacct": {
    category: "harness",
    title_ko: "agentacct — 코딩 에이전트의 작업 단계별 도구 호출·파일 변경·토큰 비용을 추적하는 로컬 퍼스트 대시보드",
    catchphrase: "로그인이나 원격 텔레메트리 없이 에이전트가 수행한 작업과 비용을 단계별로 정밀 해부",
    summary_ko: "Claude Code, Codex, OpenCode 등 코딩 에이전트가 수행한 작업을 단계별(호출한 도구, 변경한 파일, 실행한 테스트, 소요 시간, 소모된 토큰 및 비용)로 세밀하게 분해해 보여주는 로컬 퍼스트 관측(Observability) 대시보드입니다. 외부 서버 로그인이나 텔레메트리 전송 없이 로컬에서 안전하게 에이전트 지출과 작업 효율을 분석할 수 있습니다.",
    key_features: [
      "태스크별 도구 호출·파일 수정·테스트 실행·소요 시간·토큰 비용의 단계별 분해 시각화",
      "Claude Code·Codex·OpenCode 등 주요 코딩 에이전트 로컬 로그 자동 파싱",
      "계정 로그인 및 외부 텔레메트리 전송이 전혀 없는 100% 로컬 퍼스트 아키텍처"
    ],
    use_case: "코딩 에이전트가 어떤 작업 단계에서 토큰과 시간을 가장 많이 소모했는지 로컬에서 정밀하게 감사하고 싶을 때",
    tags: ["agent-observability", "cost-tracking", "token-analytics", "local-first", "claude-code"]
  },
  "paperclipai/paperclip": {
    category: "harness",
    title_ko: "paperclip — 실무 현업에서 여러 AI 코딩 에이전트를 통합 지휘하고 거버넌스를 관리하는 오픈소스 앱",
    catchphrase: "Claude Code, Codex, OpenClaw 등 멀티 에이전트 오케스트레이션과 프로젝트 워크플로우 자동화를 한곳에서 관리",
    summary_ko: "기업 및 팀 단위 개발 환경에서 Claude Code, Codex, Hermes, OpenClaw 등 다양한 자율 에이전트들을 하나의 대시보드에서 통합 오케스트레이션하고 프로젝트 작업을 배분·통제할 수 있는 오픈소스 애플리케이션입니다. 에이전트별 권한 거버넌스, 스킬 배포, 작업 진행 상태를 체계적으로 관리하여 멀티 에이전트 협업 생산성을 극대화합니다.",
    key_features: [
      "Claude Code·Codex·OpenClaw 등 이기종 멀티 에이전트 통합 오케스트레이션",
      "실무 프로젝트 태스크 할당, 워크플로우 자동화 및 에이전트 거버넌스 제어",
      "MCP 및 에이전트 스킬(Agent Skills) 표준 규격 연동으로 팀 단위 확장 지원"
    ],
    use_case: "실무 개발팀에서 여러 종류의 AI 코딩 에이전트를 동시에 운영하며 작업 할당과 권한을 체계적으로 관리할 때",
    tags: ["agent-orchestration", "multi-agent", "ai-governance", "workflow-automation", "claude-code"]
  },
  "juliobsz/skills": {
    category: "skill",
    title_ko: "skills — 단 한 줄의 지시로 Awwwards급 프리미엄 인터랙티브 웹사이트를 제작하는 에이전트 스킬",
    catchphrase: "Astro, Next.js, WebGL, GSAP 모션을 결합하여 수상작 수준의 웹 인터페이스를 구현",
    summary_ko: "Claude Code 및 Codex 환경에서 단 한 줄의 요구사항만으로 Awwwards 수상 수준의 인터랙티브 웹사이트를 설계하고 개발하는 고도화된 에이전트 스킬입니다. Astro 및 Next.js 프레임워크 기반 위에 WebGL 셰이더와 GSAP ScrollTrigger 애니메이션을 자동으로 조합하여 고품질 랜딩 페이지를 빌드합니다. 디테일한 반응형 모션과 마이크로 인터랙션을 기본 탑재합니다.",
    key_features: [
      "단일 명령어로 Awwwards급 인터랙티브 웹사이트 뼈대 및 모션 자동 생성",
      "Astro, Next.js, WebGL, GSAP 등 현대적 프론트엔드·비주얼 스택 통합",
      "반응형 뷰포트 최적화 및 60fps 부드러운 스크롤 인터랙션 보장"
    ],
    use_case: "포트폴리오나 브랜드 랜딩 페이지를 최고 수준의 인터랙티브 웹 디자인으로 빠르게 구현할 때",
    tags: ["awwwards", "web-design", "gsap", "webgl", "claude-skills"]
  },
  "Leonxlnx/earshot": {
    category: "mcp",
    title_ko: "earshot — 코딩 에이전트가 소리를 듣고 분석하며 사운드를 제작할 수 있게 돕는 청각 인터페이스",
    catchphrase: "GPU 없이 CPU만으로 오디오 피드백을 듣고 효과음과 배경음을 합성하는 오픈소스 오디오 도구",
    summary_ko: "AI 코딩 에이전트에게 귀(Ears)를 달아주어 웹사이트 효과음, 배경 음악, 시스템 알림음을 직접 듣고 리뷰하거나 생성할 수 있도록 지원하는 도구입니다. CPU 전용 경량 아키텍처로 구동되어 고가의 GPU 없이도 로컬 환경에서 안정적으로 동작합니다. 사운드 디자인, 게임 오디오 제작, 웹 접근성 오디오 검증 워크플로우를 대폭 자동화합니다.",
    key_features: [
      "CPU 환경에 최적화된 경량 오디오 분석 및 합성 엔진",
      "코딩 에이전트가 생성된 사운드를 직접 듣고 평가하는 피드백 루프",
      "Claude Code 및 MCP 환경에 완벽 대응하는 표준 인터페이스"
    ],
    use_case: "에이전트와 함께 웹/앱 프로젝트의 효과음 및 인터랙션 사운드를 기획하고 다듬을 때",
    tags: ["audio-agent", "sound-design", "mcp-server", "cpu-only", "claude-code"]
  },
  "openfilm/openfilm": {
    category: "agent",
    title_ko: "openfilm — 모든 코딩 에이전트를 전문 비디오 제작 디렉터로 변환하는 오픈소스 AI 비디오 에이전트",
    catchphrase: "대본 작성부터 샷 리스트, 음성 합성, 비디오 렌더링까지 전체 파이프라인을 자동 제어",
    summary_ko: "Claude Code, Codex 등 기존 코딩 에이전트를 풀스택 비디오 제작 감독으로 전환해주는 오픈소스 영상 에이전트 프레임워크입니다. 스토리보드 기획, 씬 분할, TTS 음성 생성, AI 비디오 모델 연동, 최종 영상 합성까지 전 과정을 코드와 프롬프트로 오케스트레이션합니다. 마케팅 영상이나 숏폼 콘텐츠 제작 생산성을 극대화합니다.",
    key_features: [
      "코딩 에이전트 기반 종단간 영상 제작 파이프라인 오케스트레이션",
      "스토리보드, 보이스오버, 비디오 생성 AI 모델 유기적 결합",
      "오픈소스 기반 확장성과 모듈식 비디오 컴포넌트 아키텍처"
    ],
    use_case: "AI 제품 데모 영상이나 유튜브/SNS용 홍보 영상을 에이전트에게 전적으로 위임하여 제작할 때",
    tags: ["video-agent", "video-generation", "openfilm", "claude-code", "content-creation"]
  },
  "Jakeschincariol/founder-skill": {
    category: "skill",
    title_ko: "founder-skill — 제품 출시 전 비즈니스 모델과 시장성을 철저히 검증하는 11가지 창업가 스킬셋",
    catchphrase: "고객 인터뷰 분석, 경쟁사 포지셔닝, 가격 정책 등 사업 가설을 다각도로 스트레스 테스트",
    summary_ko: "제품 론칭 전에 창업 아이디어와 비즈니스 모델을 다각도로 스트레스 테스트할 수 있도록 설계된 11가지 무료 Claude Code 스킬 모음입니다. 타깃 고객 세그먼트 분석, 경쟁사 차별점 도출, 지불 용의성 측정, 랜딩 페이지 카피 최적화 등 실전 창업에 필요한 핵심 검증 단계를 에이전트가 단계별로 인터뷰하며 진단합니다.",
    key_features: [
      "제품 시장 적합성(PMF) 검증을 위한 11가지 체계적인 스킬 모듈",
      "경쟁사 분석 및 유니크 밸류 프로포지션(UVP) 도출 프레임워크",
      "Claude Code 대화 세션에서 즉시 실행 가능한 창업 코칭 워크플로우"
    ],
    use_case: "새로운 사이드 프로젝트나 스타트업 제품을 출시하기 전에 시장 실패 위험을 줄이고 싶을 때",
    tags: ["founder-skills", "startup-validation", "business-model", "claude-skills"]
  },
  "alchaincyf/huashu-motion": {
    category: "skill",
    title_ko: "huashu-motion — 배경음악 작곡부터 화면 연출 수정까지 지원하는 상업용 제품 홍보 영상 스킬",
    catchphrase: "에이전트가 단 한 번의 명령으로 고품질 제품 론칭 필름을 생성하고 시각적 수정을 처리",
    summary_ko: "Claude Code 에이전트가 상업용 수준의 제품 론칭 홍보 비디오를 원클릭으로 생성할 수 있도록 돕는 영상 제작 전문 스킬입니다. 장면 분위기에 어울리는 배경음악 작곡, 비주얼 컷 편집, 자막 배치뿐만 아니라 사용자가 특정 화면 요소를 지목하여 수정할 수 있는 비주얼 피드백 루프를 지원합니다.",
    key_features: [
      "상업용 제품 론칭 비디오 기획 및 원클릭 자동 렌더링",
      "분위기 맞춤형 배경 음악 작곡 및 음향 싱크 조율",
      "화면 특정 영역을 지정하여 인터랙티브하게 수정하는 비주얼 피드백"
    ],
    use_case: "새로 개발한 소프트웨어나 하드웨어 제품의 공식 론칭 쇼케이스 영상을 빠르게 뽑아내고 싶을 때",
    tags: ["launch-film", "video-craft", "claude-skills", "motion-graphics"]
  },
  "devswha/ovis": {
    category: "agent",
    title_ko: "ovis — 에이전트가 웹 브라우징과 GUI를 직접 탐색하고 제어하는 오픈소스 워크스페이스",
    catchphrase: "Playwright 및 헤드리스 브라우저를 통합하여 웹 상호작용과 리서치를 자율 수행하는 환경",
    summary_ko: "AI 코딩 에이전트가 웹 인터페이스를 자유롭게 탐색하고 시각적 요소를 파악하며 자동화 작업을 수행할 수 있도록 지원하는 오픈소스 브라우저 GUI 워크스페이스입니다. Playwright 기반의 브라우저 제어와 실시간 화면 캡처, DOM 분석 기능을 제공하여 복잡한 웹 로그인, 데이터 스크래핑, 폼 제출 워크플로우를 매끄럽게 처리합니다.",
    key_features: [
      "Playwright 기반 웹 브라우저 완전 자율 제어 및 네비게이션",
      "실시간 렌더링 화면 시각 분석 및 DOM 인터랙션 파이프라인",
      "Claude Code 및 다양한 에이전트 프레임워크와의 유연한 통합"
    ],
    use_case: "에이전트에게 웹 서비스 리서치나 자동화된 브라우저 테스트 및 정보 수집을 맡기고 싶을 때",
    tags: ["browser-agent", "web-automation", "playwright", "claude-code"]
  },
  "MaryCache/imozuru": {
    category: "skill",
    title_ko: "imozuru — 낯선 기술과 레퍼런스를 1차 원문까지 고구마 줄기처럼 파고드는 심층 리서치 스킬",
    catchphrase: "2차 인용에 의존하지 않고 공식 문서와 최초 논문 소스까지 추적하여 검증하는 조사 툴",
    summary_ko: "AI 에이전트가 기술 조사를 진행할 때 블로그나 2차 가공 자료에 멈추지 않고, 최초 정의된 논문, 공식 RFC 명세, 깃허브 커밋 원문까지 고구마 줄기처럼 연쇄 추적하도록 유도하는 Claude Code 리서치 스킬입니다. 팩트 체킹의 신뢰도를 극대화하고 환각을 효과적으로 차단합니다.",
    key_features: [
      "1차 소스 및 원본 명세까지 연쇄 역추적하는 심층 검색 로직",
      "출처별 신뢰도 가중치 부여 및 교차 검증 보고서 작성",
      "복잡한 기술 개념의 기원과 역사적 발전 맥락 정리"
    ],
    use_case: "새로운 아키텍처나 라이브러리를 도입하기 전 원문 명세와 공식 문서를 철저히 검증하고 싶을 때",
    tags: ["deep-research", "fact-checking", "claude-skills", "investigation"]
  },
  "nateherkai/roast-room": {
    category: "skill",
    title_ko: "roast-room — 베조스·폴 그레이엄 등 7인의 가상 멘토가 제품을 신랄하게 비판하는 피드백 스킬",
    catchphrase: "달콤한 칭찬 대신 뼈아픈 약점과 사업적 허점을 날카롭게 파고드는 혹독한 피드백 룸",
    summary_ko: "제프 베조스, 폴 그레이엄, 알렉스 호르모지 등 전설적인 창업가 및 투자자 7인의 사고방식을 시뮬레이션하여 개발 중인 제품이나 기획서를 가차 없이 로스팅해주는 스킬입니다. 듣기 좋은 찬사 대신 제품의 치명적인 허점, 시장성 결여, 고객 이탈 위험을 거침없이 지적하여 완성도를 극한으로 끌어올립니다.",
    key_features: [
      "7인의 유명 창업가 및 투자자 관점의 가상 멘토링 페르소나",
      "비즈니스 모델 및 제품 사용성 취약점 집중 공격 및 보완책 제시",
      "출시 전 객관적인 현실 자각과 전략 재정비 기회 제공"
    ],
    use_case: "내 제품이나 사업 아이디어의 맹점과 약점을 가장 혹독하고 객관적으로 점검받고 싶을 때",
    tags: ["roast-room", "brutal-feedback", "claude-skills", "product-review"]
  },
  "shinshin86/mesh-avatar-studio": {
    category: "skill",
    title_ko: "mesh-avatar-studio — 단 한 장의 일러스트를 애니메이션 2D 메시 아바타로 변환하는 스킬",
    catchphrase: "스파인 스타일의 2D 버텍스 메시와 본 구조를 생성하여 캐릭터에 생명을 부여",
    summary_ko: "정적인 2D 일러스트레이션 이미지 한 장을 입력받아 관절 리깅과 버텍스 메시를 자동 분할하고 부드러운 애니메이션을 적용할 수 있는 2D 아바타 제작 스킬입니다. 스파인이나 Live2D와 유사한 부드러운 움직임을 웹 브라우저나 게임 엔진에서 바로 구동 가능한 코드로 내보낼 수 있습니다.",
    key_features: [
      "2D 일러스트 기반 자동 관절 리깅 및 메시 생성 파이프라인",
      "아이들, 인사, 감정 표현 등 표준 애니메이션 클립 프리셋 제공",
      "Three.js 및 WebGL 호환 경량 런타임 코드 출력"
    ],
    use_case: "서비스 캐릭터나 마스코트 이미지를 인터랙티브한 웹 애니메이션 아바타로 구현하고 싶을 때",
    tags: ["2d-mesh", "avatar-studio", "live2d-style", "claude-skills", "character-animation"]
  },
  "YeonwooSung/my-claude-code-mods": {
    category: "skill",
    title_ko: "my-claude-code-mods — 실무 개발 생산성을 극대화하는 Claude Code 커스텀 모드 모음",
    catchphrase: "터미널 워크플로우를 최적화하고 자주 쓰는 반복 작업을 단축하는 실전 유틸리티 세트",
    summary_ko: "국내 개발자가 실제 개발 현장에서 Claude Code를 활용하며 가장 유용했던 커스텀 모드와 자동화 팁을 집대성한 실전 레포지토리입니다. 프롬프트 개선, 파일 네비게이션 단축, 커밋 메시지 컨벤션 자동화 등 일상적인 코딩 에이전트 사용성을 한 단계 끌어올리는 실용적인 설정과 스크립트를 제공합니다.",
    key_features: [
      "실무 현장 검증을 거친 Claude Code 환경 설정 및 모드 스크립트",
      "반복적인 프롬프트 입력과 커맨드 실행을 최소화하는 단축 워크플로우",
      "한국어 개발 환경에 특화된 프롬프트 튜닝 가이드"
    ],
    use_case: "Claude Code의 기본 환경을 실무 개발 생산성에 맞춰 빠르고 편리하게 튜닝하고 싶을 때",
    tags: ["claude-code", "productivity", "custom-mods", "korean-dev", "developer-tools"]
  },
  "Tejashmakwana/motionmaxxing": {
    category: "skill",
    title_ko: "motionmaxxing — 웹 프론트엔드의 인터랙션과 모션 그래픽을 극한으로 끌어올리는 스킬",
    catchphrase: "밋밋한 정적 UI를 고급 브랜드 웹사이트처럼 살아 움직이게 만드는 비주얼 모션 최적화",
    summary_ko: "Framer Motion, CSS 트랜지션, GSAP를 활용하여 일반적인 웹 UI에 최상급 수준의 마이크로 인터랙션과 물리 기반 모션을 불어넣는 스킬입니다. 버튼 호버, 페이지 트랜지션, 카드 드래그, 텍스트 스크램블 등 시각적 완성도를 극대화하는 모션 프리셋을 정교하게 계산하여 주입합니다.",
    key_features: [
      "물리 기반 스프링 애니메이션 및 자연스러운 댐핑 계산",
      "Framer Motion 및 Tailwind CSS 기반 즉시 적용 컴포넌트",
      "웹 성능을 저해하지 않는 렌더링 최적화"
    ],
    use_case: "개발 중인 웹 서비스의 UI 디테일과 모션 인터랙션을 해외 유명 테크 기업 수준으로 다듬을 때",
    tags: ["motion-design", "framer-motion", "frontend-craft", "claude-skills"]
  },
  "cth9191/animate": {
    category: "skill",
    title_ko: "animate — 어떤 스타일이든 코드로 절차적 애니메이션을 생성하는 Claude Code 스킬",
    catchphrase: "수학적 파라미터와 물리 공식을 결합하여 무한히 이어지는 유기적 애니메이션을 제작",
    summary_ko: "Canvas 2D, SVG, WebGL 환경에서 수학적 알고리즘과 절차적 생성 기법을 이용해 매끄러운 루프 애니메이션을 제작하는 도구입니다. 복잡한 키프레임 수작업 없이 수식과 노이즈 함수만으로 유기적인 파티클, 흐르는 파동, 기하학적 패턴 모션을 손쉽게 구축할 수 있습니다.",
    key_features: [
      "펄린 노이즈 및 물리 공식을 활용한 절차적 모션 생성",
      "용량이 거의 들지 않는 가벼운 순수 코드 기반 애니메이션",
      "웹 및 모바일 어디서나 반응형으로 동작하는 고해상도 벡터 렌더링"
    ],
    use_case: "배경 인터랙티브 비주얼이나 기하학적 로딩 애니메이션을 가볍고 화려하게 구현할 때",
    tags: ["procedural-animation", "canvas", "webgl", "claude-skills", "generative-art"]
  },
  "Jakeschincariol/arena-skill": {
    category: "skill",
    title_ko: "arena-skill — 에이전트의 답변이 불만족스러울 때 100가지 변형을 만들어 승자를 가리는 스킬",
    catchphrase: "토너먼트 아레나 방식으로 다수의 대안을 생성하고 자동 평가하여 최상의 결과물 선별",
    summary_ko: "복잡한 코딩이나 카피라이팅 작업에서 단일 답변의 품질이 성에 차지 않을 때, 여러 각도의 접근법과 페르소나를 동원해 대량의 대안을 생성한 뒤 자동 토너먼트 배틀을 거쳐 최선의 결과물을 추출하는 아레나 스킬입니다. 시행착오 시간을 획기적으로 줄이고 기대 이상의 탁월한 결과물을 찾아냅니다.",
    key_features: [
      "다양한 프롬프트 전략을 적용한 수십 가지 후보 대안 병렬 생성",
      "명확한 기준 기반의 자동 토너먼트 평가 및 채점 시스템",
      "최상위 승자 대안의 장점만을 결합한 최종 결과물 합성"
    ],
    use_case: "단순한 첫 번째 답변에 안주하지 않고 최고의 코드 구현이나 카피를 반드시 찾아내야 할 때",
    tags: ["arena-eval", "tournament-selection", "claude-skills", "quality-boost"]
  },
  "DozenTwelve/Papermorph": {
    category: "skill",
    title_ko: "Papermorph — 텍스트 서적과 문서를 애니메이션·음성 인터랙티브 콘텐츠로 변환하는 스킬",
    catchphrase: "지루한 긴 글을 동적인 다이어그램, 내레이션, 인터랙티브 캔버스로 입체화",
    summary_ko: "방대한 분량의 기술 서적, 논문, 매뉴얼을 입력받아 핵심 개념을 시각적인 인터랙티브 모션 그래픽과 음성 설명이 결합된 입체적인 학습 자료로 변환해주는 에이전트 스킬입니다. 텍스트의 핵심 논리를 인포그래픽과 애니메이션으로 시각화하여 정보 습득 속도를 극적으로 높여줍니다.",
    key_features: [
      "긴 문서의 챕터별 핵심 개념 시각화 및 다이어그램 자동화",
      "AI 음성 합성(TTS)과 싱크를 맞춘 동적 텍스트 하이라이트",
      "웹 브라우저에서 바로 조작 가능한 인터랙티브 캔버스 생성"
    ],
    use_case: "난해한 기술 문서나 책의 내용을 팀원들이 단 5분 만에 이해할 수 있는 동적 콘텐츠로 가공할 때",
    tags: ["papermorph", "interactive-docs", "visual-learning", "claude-skills"]
  },
  "agentvivekkumar/dontbemichael": {
    category: "harness",
    title_ko: "dontbemichael — Claude Code와 유기적으로 연동되는 로컬 멀티 에이전트 하네스",
    catchphrase: "단일 에이전트의 실수를 방지하고 팀 단위 상호 교차 검증을 수행하는 로컬 하네스",
    summary_ko: "단일 에이전트가 독단적으로 엉뚱한 결정을 내리지 않도록, 여러 전문 에이전트들이 서로의 코드와 결정을 감시하고 교차 검증하도록 설계된 로컬 멀티 에이전트 하네스입니다. Claude Code와의 완벽한 호환성을 바탕으로 코드 리뷰, 테스트 작성, 보안 감사를 별도의 에이전트가 나누어 수행합니다.",
    key_features: [
      "로컬 환경에서의 역할별 멀티 에이전트 독립 실행 및 협력",
      "에이전트 간 코드 교차 검증 및 할루시네이션 실시간 차단",
      "기존 Claude Code 설정 및 워크플로우 100% 호환"
    ],
    use_case: "에이전트가 혼자 코드를 작성하다 생길 수 있는 치명적 버그를 사전 예방하고 싶을 때",
    tags: ["multi-agent", "agent-harness", "cross-validation", "claude-code"]
  },
  "DenisSergeevitch/ex-ussr-kinship-research": {
    category: "skill",
    title_ko: "ex-ussr-kinship-research — 구소련 역사 문서 및 공공 기록 아카이브 정밀 추적 에이전트 스킬",
    catchphrase: "파편화된 다국어 아카이브 기록을 교차 검증하여 인물 관계도와 족보를 증거 기반으로 복원",
    summary_ko: "구소련 및 동유럽 지역의 흩어진 역사 공문서, 인구 조사 기록, 묘지 기록 등 다국어 아카이브 데이터를 AI 에이전트가 정밀 추적하고 교차 검증할 수 있도록 돕는 증거 기반 계보학 조사 스킬입니다. 역사학자나 전문 연구자가 방대한 원천 문서를 체계적으로 분석할 수 있는 조사 방법론을 제공합니다.",
    key_features: [
      "러시아어·우크라이나어 등 다국어 고문서 텍스트 정밀 해석 및 정규화",
      "1차 기록물 간의 인물 및 일자 불일치 자동 감지 및 교차 검증",
      "가계도 및 인물 관계도 데이터베이스 구조화 출력"
    ],
    use_case: "동유럽 및 구소련 지역의 역사 기록물이나 가족사 아카이브를 전문적으로 조사하고 분석할 때",
    tags: ["genealogy", "historical-archive", "evidence-first", "claude-skills"]
  }
};

