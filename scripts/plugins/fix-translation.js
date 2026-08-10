const fs = require('fs');

const d = JSON.parse(fs.readFileSync("site/public/data/latest.json", "utf8"));

const trans = {
  "vshulcz/deja-vu": ["deja-vu", "에이전트가 디스크에 기록한 이전 세션을 검색·색인하는 기억 도구", "당신의 코딩 에이전트가 이미 해결한 문제를 다시 찾습니다. deja는 한 달 전 디스크에 기록된 세션까지 모두 색인하여 중복 작업을 막습니다."],
  "omnigent-ai/omnigent": ["Omnigent", "오픈소스 메타 하네스 및 범용 AI 에이전트 프레임워크", "오픈소스 AI 에이전트 프레임워크이자 메타 하네스입니다. Claude Code, Codex, Cursor, Pi 및 커스텀 에이전트를 한 곳에서 오케스트레이션합니다."],
  "gakonst/nanocodex": ["nanocodex", "Rust 기반의 프론티어 에이전트 빌딩 블록", "어디서나 Codex 수준의 성능을 발휘할 수 있게 돕는 Rust로 작성된 초경량 에이전트 구성 요소입니다."],
  "keyuchen21/agentic-engineering-handbook": ["에이전틱 엔지니어링 핸드북", "MCP, 에이전트 시스템 및 평가(Evals) 종합 학습 로드맵", "OpenAI, Claude, MCP, 하네스, Evals, 그리고 프로덕션 에이전트 시스템에 대한 가장 완벽한 학습 로드맵과 자료를 제공합니다."],
  "nexu-io/open-design": ["open-design", "에이전트를 디자인 엔지니어로 만드는 로컬 데스크탑 앱", "오픈소스 Claude Design의 대안. 로컬 환경에서 실행되는 데스크탑 앱으로 코딩 에이전트가 UI/UX를 직접 설계하도록 돕습니다."],
  "diegosouzapw/OmniRoute": ["OmniRoute", "290개 이상의 제공자를 묶는 무료 MIT AI 게이트웨이", "중단 없는 코딩을 위한 무료 게이트웨이. 단일 엔드포인트로 290개 이상의 API(90개 무료)와 500개 이상의 모델에 연결합니다."],
  "Prism-Shadow/penguin-harness": ["penguin-harness", "원클릭으로 자가 진화 에이전트를 만드는 자동화 빌더", "클릭 한 번으로 DeepSeek이나 GPT를 활용해 스스로 진화하는 맞춤형 에이전트를 생성하는 하네스 도구입니다."],
  "UiPath/coder_eval": ["coder_eval", "에이전트 스킬 및 MCP 서버의 동작을 검증하는 평가 도구", "Claude Code 스킬, MCP 서버, CLI가 실제로 잘 작동하는지 샌드박스 YAML 환경에서 테스트하고 검증합니다."],
  "Leonxlnx/taste-skill": ["taste-skill", "따분하고 진부한 코드 생성을 막아주는 '훌륭한 안목' 스킬", "당신의 AI 에이전트에게 훌륭한 안목을 부여합니다. 무미건조하고 뻔한 코드를 생성하지 않도록 억제하는 독특한 스킬입니다."],
  "adm73/OpenBcon": ["OpenBcon", "초기 기업 및 인큐베이터를 위한 AI 기반 오픈소스 펀딩 워크스페이스", "컨설턴트, 어드바이저, 인큐베이터가 기업의 기회와 자금 조달을 효율적으로 관리할 수 있는 AI 워크스페이스입니다."],
  "worldwonderer/novel-to-game": ["novel-to-game", "소설을 플레이 가능한 게임으로 바꿔주는 에이전트 스킬", "텍스트 소설을 원작에 기반한 완벽한 텍스트/비주얼 게임으로 변환해주는 Claude Code 및 Codex용 스킬입니다."],
  "QoderAI/better-harness": ["better-harness", "프로젝트 증거를 기반으로 루프 수준의 인사이트를 추출하는 하네스", "세션 기록과 프로젝트 데이터를 분석하여 개선점을 도출하고 코드 검증 다음 단계를 자동으로 제안하는 강력한 하네스입니다."],
  "DietrichGebert/ponytail": ["ponytail", "AI 에이전트가 시니어 개발자처럼 생각하게 만드는 도구", "AI 에이전트가 방 안에 있는 가장 게으른(효율적인) 시니어 개발자처럼 생각하게 만듭니다. 가장 좋은 코드는 작성하지 않은 코드입니다."],
  "pax-beehive/paxm": ["paxm", "모든 코딩 에이전트를 위한 영구적인 중립 메모리", "Codex, Claude Code, Pi 등 다양한 에이전트가 벤더에 종속되지 않고 세션 간 기억을 유지할 수 있는 메모리 모듈입니다."],
  "makecindy/cindy": ["Cindy", "데스크탑 환경에서 즉시 사용 가능한 오픈소스 AI 에이전트", "별도 설정 없이 바로 동작하는 크로스 플랫폼 데스크탑 AI 비서. 복잡한 환경 설정 없이 누구나 쉽게 AI의 도움을 받을 수 있습니다."],
  "MemTensor/memmy-agent": ["memmy-agent", "개인용 에이전트 및 로컬 메모리 허브", "Claude Code, Codex, Hermes 등 모든 AI 에이전트에게 컨텍스트를 제공하는 개인 맞춤형 지식 허브이자 기억 저장소입니다."],
  "AMAP-ML/LongHorizon-Harness": ["LongHorizon-Harness", "장기 수행 에이전트를 위한 데스크탑/CLI 컴퓨터 사용 하네스", "데스크탑 앱과 CLI를 넘나들며 오랜 시간 동안 컨텍스트를 유지하면서 복잡한 작업을 수행하는 장기 작업용 하네스입니다."],
  "ruvnet/metaharness": ["metaharness", "나만의 브랜디드 에이전트 하네스를 구축하는 메타 하네스", "자신만의 커스텀 CLI와 MCP 서버를 갖춘 전문화된 에이전트 하네스를 순식간에 스캐폴딩할 수 있는 메타 도구입니다."],
  "Graphify-Labs/graphify": ["graphify", "모든 코드베이스와 문서를 지식 그래프로 변환하는 스킬", "코드, 문서, SQL 스키마, PDF 등을 모두 쿼리 가능한 지식 그래프로 변환하여 에이전트에게 압도적인 탐색 능력을 부여합니다."],
  "anthropics/claude-code": ["Claude Code", "터미널에서 동작하며 코드베이스를 이해하는 코딩 에이전트", "터미널에 상주하며 프로젝트 전체의 맥락을 완벽히 이해하고 빠른 개발을 돕는 Anthropic의 공식 에이전틱 코딩 도구입니다."],
  "google-gemini/gemini-cli": ["gemini-cli", "터미널에 Gemini의 강력함을 가져오는 오픈소스 AI 에이전트", "구글 Gemini 모델의 추론 능력을 터미널 환경에 직접 통합하여 코딩 및 시스템 관리를 돕는 공식 오픈소스 CLI입니다."],
  "farion1231/cc-switch": ["cc-switch", "모든 코딩 에이전트를 통합하는 크로스 플랫폼 데스크탑 비서", "Claude Code, Codex 등 다수의 에이전트를 하나의 데스크탑 앱에서 쉽게 전환하며 사용할 수 있는 올인원 도구입니다."],
  "x1xhlol/system-prompts-and-models-of-ai-tools": ["AI 도구 시스템 프롬프트 모음", "주요 AI 코딩 도구들의 시스템 프롬프트 아카이브", "Cursor, Claude Code, Devin 등 유명 AI 코딩 어시스턴트들의 시스템 프롬프트와 모델 설정값을 모아둔 귀중한 자료입니다."],
  "NousResearch/hermes-agent": ["hermes-agent", "사용자와 함께 성장하는 개인 맞춤형 에이전트", "단순한 명령어 수행을 넘어, 사용자의 작업 패턴을 학습하고 스스로 진화하는 NousResearch의 자율 에이전트입니다."],
  "JuliusBrussee/caveman": ["caveman", "원시인처럼 말하여 토큰을 65% 절약하는 스킬", "왜 많은 토큰을 쓰나요? 적은 토큰이면 충분합니다. Claude가 원시인처럼 극도로 짧게 말하게 하여 비용을 대폭 줄입니다."],
  "nextlevelbuilder/ui-ux-pro-max-skill": ["ui-ux-pro-max-skill", "전문적인 UI/UX 설계 지능을 제공하는 스킬", "다양한 플랫폼에 걸쳐 프로덕션 수준의 아름다운 UI/UX 디자인 인텔리전스와 코드를 에이전트에게 부여합니다."],
  "koala73/worldmonitor": ["worldmonitor", "실시간 글로벌 인텔리전스 및 지정학 모니터링 대시보드", "AI를 기반으로 글로벌 뉴스, 지정학적 사건, 인프라 추적 데이터를 실시간으로 수집하고 분석하는 모니터링 대시보드입니다."],
  "shareAI-lab/learn-claude-code": ["learn-claude-code", "Bash만으로 밑바닥부터 만드는 나노 에이전트 하네스", "Bash 스크립트만 사용하여 Claude Code와 유사한 에이전트 하네스를 0에서 1까지 만들어보는 튜토리얼 성격의 도구입니다."],
  "rtk-ai/rtk": ["rtk", "LLM 토큰 소비를 60-90% 줄여주는 CLI 프록시", "일반적인 개발 명령어 수행 시 토큰 낭비를 극단적으로 줄여주는 프록시. 의존성이 없는 단일 Rust 바이너리로 제공됩니다."],
  "thedotmack/claude-mem": ["claude-mem", "모든 에이전트를 위한 세션 간 영구 컨텍스트 저장소", "에이전트가 세션 동안 수행한 모든 작업을 포착하고 압축하여 다음 세션에서도 기억을 유지할 수 있게 해줍니다."],
  "ComposioHQ/awesome-claude-skills": ["awesome-claude-skills", "Claude 스킬과 커스텀 워크플로우를 위한 훌륭한 리소스 모음", "Claude AI의 성능을 극대화할 수 있는 유용한 스킬, 도구, 커스텀 워크플로우 리소스를 큐레이션한 목록입니다."]
};

function patch(list) {
  list.forEach(it => {
    const key = Object.keys(trans).find(k => k.includes(it.id));
    if (key) {
      const [ko, catchp, summary] = trans[key];
      it.title_ko = ko;
      it.catchphrase = catchp;
      it.summary_ko = summary;
    } else {
      it.title_ko = it.name;
      it.catchphrase = it.description ? it.description.slice(0, 120) : "도구";
      it.summary_ko = it.description ? it.description.slice(0, 600) : "도구";
    }
  });
}

patch(d.rising);
patch(d.classic);

fs.writeFileSync(".tmp/04_curated.json", JSON.stringify(d, null, 2));
console.log("Translated .tmp/04_curated.json created!");
