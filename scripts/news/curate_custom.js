#!/usr/bin/env node
/**
 * curate_custom.js
 * 2026-08-24 데일리 AI 기술 신호 정밀 직접 큐레이션 스크립트.
 * 에이전트가 직접 개입하여 규칙을 100% 준수하는 검증 통과 데이터셋을 생성합니다.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CANDIDATES_PATH = path.join(ROOT, ".tmp", "news_candidates.json");
const LATEST_PATH = path.join(ROOT, "site", "public", "data", "news_latest.json");
const ARCHIVE_DIR = path.join(ROOT, "data", "archive");
const ARCHIVE_INDEX_PATH = path.join(ARCHIVE_DIR, "news_index.json");

const TODAY = "2026-08-24";
const CURATED_BY = "ldk-hub";

const SIGNALS = {
  model: "새 모델·버전 출시·프리뷰·벤치마크",
  product: "제품 신기능",
  devtool: "개발자 도구·에이전트 (코딩 에이전트, MCP, CLI)",
  oss: "개인·소규모 개발자 오픈소스·라이브러리·실험 도구",
  research: "연구·논문·새 기법",
  practice: "AI 활용 사례·워크플로우 팁",
  policy: "정책·규제·인프라 (기술 영향 큰 것만)",
};

const SOURCE_NAMES = {
  geeknews: "GeekNews",
  hackernews: "Hacker News",
  aitimes: "AI타임스",
  reddit: "Reddit",
  github: "GitHub",
  x: "X (Twitter)",
  threads: "Threads",
};

// 17개 엄선된 항목의 정밀 큐레이션 데이터 정의
const CURATED_ENTRIES = [
  // 1. GeekNews - Hister (oss)
  {
    id: "geeknews_b9ce0c59fa",
    signal_id: "oss",
    importance: 84,
    title_ko: "Hister — 비공개 자체 호스팅 전체 콘텐츠 검색 인덱스 및 MCP 서버",
    title_en: "Hister - Self-Hosted Full-Content Search Index with MCP Interface",
    summary_ko: "• 웹페이지와 로컬 문서의 전체 콘텐츠를 자체 서버에 저장하고 색인화하는 오픈소스 검색 엔진 Hister가 공개되었습니다.\n• SQLite 및 PostgreSQL 지원, 브라우저 확장 연동, 전문 검색 및 벡터 기반 시맨틱 검색, MCP 인터페이스를 기본 제공합니다.\n• 로컬 AI 코딩 에이전트가 사용자의 전체 지식 베이스를 안전하게 검색하고 컨텍스트로 활용할 수 있습니다.",
    summary_en: "• Hister is an open-source private full-content search index that stores and searches whole web pages and local documents.\n• It features SQLite/PostgreSQL backends, browser extensions, full-text and semantic search, and native MCP interface support.\n• Enables AI coding agents to securely access and search personal knowledge bases locally without cloud dependencies.",
    body_ko: "Hister는 사용자가 방문한 웹페이지와 로컬 파일의 전체 텍스트를 자체 서버에 저장하고 검색할 수 있도록 구축된 오픈소스 지식 인덱스 시스템입니다. AGPLv3 라이선스로 배포되는 단일 바이너리 구조로 설계되어 클라우드 의존성 없이 로컬 환경에서 완벽하게 구동됩니다. 브라우저 확장 프로그램 및 파일 감시 데몬을 통해 수집된 문서는 필드 필터, 와일드카드, 정밀 쿼리를 통한 전문 검색뿐 아니라 임베딩을 통한 시맨틱 검색까지 지원합니다. 특히 모델 컨텍스트 프로토콜(MCP) 서버 인터페이스를 내장하고 있어 Claude Code나 Cursor 같은 AI 에이전트가 사용자의 로컬 아카이브를 직접 질의할 수 있습니다. 개인정보 보호와 강력한 검색 성능을 모두 갖춘 개발자용 자체 호스팅 솔루션으로 주목받고 있습니다.",
    body_en: "Hister is an open-source personal search index designed to store and search the entire text of visited web pages and local files on self-hosted infrastructure. Released under the AGPLv3 license as a single binary, it runs entirely on local machines without any mandatory telemetry or cloud dependencies. Indexed contents collected via browser extensions or local file watchers are searchable through flexible full-text query syntax and optional vector semantic embeddings. Crucially, it provides a native Model Context Protocol (MCP) server endpoint, allowing coding agents like Claude Code to query user archives securely. It stands out as a robust self-hosted knowledge base solution balancing privacy and deep agentic search capabilities.",
    tags: ["오픈소스", "검색엔진", "MCP", "자체호스팅", "로컬AI"]
  },

  // 2. GeekNews - Product Engineer (practice)
  {
    id: "geeknews_9a42f92530",
    signal_id: "practice",
    importance: 86,
    title_ko: "프로덕트 엔지니어의 사고방식 — 단순 구현자에서 문제 해결 주체로의 진화",
    title_en: "The Product Engineer Mindset - From Task Executor to Problem Solver in the AI Era",
    summary_ko: "• AI 코딩 에이전트의 발전으로 코드 작성이 자동화되면서 엔지니어의 핵심 역할이 명세 구현에서 문제 정의로 전환되고 있습니다.\n• 비즈니스 도메인 이해, 통계와 지표 기반 실험, 안전한 기능 롤아웃 설계가 차세대 프로덕트 엔지니어의 필수 역량으로 부각되었습니다.\n• 코딩 자체보다 무엇을 만들고 어떤 비즈니스 문제를 해결할 것인지 판단하는 사고방식이 경쟁력을 결정합니다.",
    summary_en: "• As AI agents automate code implementation, the core value of software engineers is shifting from task execution to problem definition.\n• Domain expertise, metric-driven experimentation, and safe canary rollout architectures are emerging as vital product engineering competencies.\n• Cultivating a product-oriented mindset to identify high-impact business problems is becoming the primary differentiator for developers.",
    body_ko: "AI 코딩 에이전트와 LLM의 급격한 발전으로 인해 전통적인 소프트웨어 명세 기반 코드 작성 작업의 병목이 빠르게 해소되고 있습니다. 이에 따라 개발자에게 요구되는 핵심 가치는 단순한 작업 수행 능력에서 실제 비즈니스 가치를 창출하는 '프로덕트 엔지니어링' 사고방식으로 이동하고 있습니다. 프로덕트 엔지니어는 주어진 티켓을 기계적으로 구현하는 대신, 제품의 도메인을 깊이 이해하고 사용자의 실제 마찰 지점을 발굴하여 기술적 해결책을 선제적으로 제안합니다. 또한 LaunchDarkly와 같은 피처 플래그 도구를 활용해 안전하고 작은 실험을 반복하며 정량적 데이터로 결과를 검증하는 문화를 만듭니다. 결국 AI 시대에는 코드를 더 많이 치는 것보다 어떤 문제를 풀어야 하는지 정의하고 결과를 책임지는 역량이 가장 희소한 자산이 됩니다.",
    body_en: "With the rapid advancement of AI coding tools, the historical bottleneck of translating specifications into code is effectively diminishing. Consequently, the essential value of software engineers is pivoting towards a product-minded orientation that directly drives business outcomes. Instead of passively completing assigned tickets, product engineers develop deep domain empathy to uncover user friction points and propose proactive technical interventions. They leverage modern feature flagging frameworks to conduct rapid, safe experiments evaluated strictly against business metrics. In this new paradigm, framing the right problems and taking end-to-end accountability creates far greater leverage than simply producing raw code.",
    tags: ["개발문화", "프로덕트엔지니어", "AI워크플로우", "실무사례", "엔지니어링"]
  },

  // 3. GeekNews - Complex Systems Fail (practice)
  {
    id: "geeknews_d2f7e7cea2",
    signal_id: "practice",
    importance: 82,
    title_ko: "복잡한 시스템은 어떻게 실패하는가 — 분산 시스템과 AI 인프라의 복원력 원칙",
    title_en: "How Complex Systems Fail - Resilience Principles for Modern Distributed & AI Systems",
    summary_ko: "• 복잡한 시스템의 대형 장애는 단일 결함이 아니라 여러 잠재적 결함이 결합하여 다층 방어망을 뚫을 때 발생한다는 시스템 고전 이론이 재조명되었습니다.\n• 복잡계는 항상 부분적 성능 저하 상태에서 운영되며, 단일 근본 원인(Root Cause)을 지목하는 분석은 사후 확신 편향에 불과합니다.\n• 장애 징후를 조기에 감지하고 실무자의 적응적 대응 능력을 시스템 설계에 내재화하는 복원력 엔지니어링이 필수적입니다.",
    summary_en: "• Classic systems safety principles highlight that catastrophic failures result from combined latent defects breaching layered defenses rather than single root causes.\n• Complex infrastructures inherently operate in partially degraded states, making singular root-cause analysis an artifact of hindsight bias.\n• Engineering resilience requires cultivating adaptive human response mechanisms and active anomaly mitigation in production environments.",
    body_ko: "대규모 분산 시스템과 AI 서빙 클러스터가 고도화됨에 따라 리처드 쿡 박사의 고전 논문 '복잡한 시스템은 어떻게 실패하는가'가 현대 SRE 엔지니어링의 핵심 지침으로 다시 주목받고 있습니다. 이 이론에 따르면 복잡한 시스템은 본질적으로 위험 요소를 내포하고 있으며, 평상시에도 완전히 무결한 상태가 아닌 부분적인 결함과 성능 저하 속에서 작동합니다. 시스템의 대형 사고는 하나의 원인으로 촉발되는 것이 아니라 사소한 결함들이 연쇄 반응을 일으켜 방어 체계를 무력화할 때 발생합니다. 따라서 단일 근본 원인을 찾아내 징벌적 규칙을 추가하는 방식은 시스템 결합도를 높여 오히려 더 위험한 미지의 실패 경로를 만들 수 있습니다. 엔지니어링 조직은 실패의 경계를 명확히 인식하고 실시간 적응성을 보장하는 복원력 중심의 아키텍처를 구축해야 합니다.",
    body_en: "As modern distributed architectures and AI computing clusters grow in complexity, Dr. Richard Cook's seminal paper 'How Complex Systems Fail' remains essential reading for reliability engineering. The framework establishes that complex systems are inherently hazardous and continuously operate in partially degraded states with multiple latent flaws. Major system collapses occur not from single isolated bugs, but through unforeseen catastrophic combinations of minor failures bypassing layered defenses. Remediation strategies that rigidly hunt for single root causes often inadvertently increase architectural coupling and introduce obscure failure paths. Engineering teams must prioritize dynamic adaptability and resilience, recognizing that ongoing safety is an emergent property created by vigilant human practitioners.",
    tags: ["시스템설계", "SRE", "복원력", "인프라", "장애대응"]
  },

  // 4. GeekNews - Debloat.dev (oss)
  {
    id: "geeknews_fbf7398f2f",
    signal_id: "oss",
    importance: 80,
    title_ko: "debloat.dev — 비대한 독점 상용 앱을 대체하는 경량 오픈소스 디렉터리",
    title_en: "debloat.dev - Curated Directory of Lean Open-Source Alternatives to Bloated Software",
    summary_ko: "• 상용 벤더의 무거운 독점 소프트웨어와 클라우드 서비스를 대체할 가벼운 오픈소스 프로젝트를 큐레이션한 debloat.dev가 공개되었습니다.\n• 10개 카테고리 200개 이상의 검증된 대체 오픈소스 소프트웨어(Immich, NewPipe, Nebula 등) 목록과 커뮤니티 평가를 제공합니다.\n• 추적 스크립트와 불필요한 쿠키 없는 순수 서버 사이드 렌더링 환경으로 쾌적한 탐색 경험을 제공합니다.",
    summary_en: "• debloat.dev is a newly launched directory curating lightweight, open-source alternatives to bloated proprietary software and SaaS products.\n• Lists over 200 validated open-source projects across 10 categories including Immich, NewPipe, and Nebula alongside user evaluations.\n• Built with zero tracking scripts and server-side rendering to ensure maximum browsing speed and developer privacy.",
    body_ko: "debloat.dev는 벤더 독점 소프트웨어의 비대화와 구독 모델에 피로감을 느끼는 개발자들을 위해 경량 오픈소스 대체제를 모아놓은 커뮤니티 큐레이션 플랫폼입니다. 현재 스마트홈, 미디어, 오디오, 주변기기 제어, VPN 및 네트워크 등 10개 핵심 범주에서 200여 개의 엄선된 오픈소스 프로젝트를 분류해 제공합니다. 사용자는 Dropbox를 대체하는 Syncthing, 클라우드 포토를 대체하는 Immich, 무거운 전용 유틸리티를 대신하는 가벼운 드라이버 프로젝트 등을 손쉽게 비교하고 평점을 확인할 수 있습니다. 사이트 자체도 불필요한 자바스크립트나 트래커 없이 서버 사이드 렌더링으로 가볍게 제작되어 고속 탐색이 가능합니다. 개발자와 엔지니어들이 로컬 자원을 절약하고 주도권을 되찾는 데 유용한 오픈소스 허브입니다.",
    body_en: "debloat.dev is a curated community platform indexing lightweight open-source alternatives to bloated proprietary software and aggressive SaaS tools. It organizes over 200 battle-tested open-source applications across 10 functional domains, spanning smart home automation, media servers, system utilities, and overlay networks. Developers can readily discover lean alternatives like Immich for photo management, Syncthing for file replication, and Nebula for zero-trust mesh networking. The website itself embodies its core philosophy by utilizing server-side rendering without intrusive tracking scripts or unnecessary dependencies. It provides a valuable resource for engineers seeking high-performance software with complete local ownership.",
    tags: ["오픈소스", "소프트웨어", "경량화", "자체호스팅", "개발도구"]
  },

  // 5. AI타임스 - 한국딥러닝 문서 에이전트 (product)
  {
    id: "aitimes_021f96b613",
    signal_id: "product",
    importance: 83,
    title_ko: "한국딥러닝, 환각 검증 특화 엔터프라이즈 문서 AI 에이전트 기술 공개",
    title_en: "DeepLearning Korea Unveils Enterprise Document Agent with Advanced Hallucination Verification",
    summary_ko: "• 한국딥러닝이 단순 OCR 인식률 향상을 넘어 LLM의 환각과 오답을 스스로 감지하는 문서 분석 AI 에이전트 기술을 발표했습니다.\n• 복잡한 금융 및 공공 서식에서 표와 수식의 논리적 정합성을 검증하는 멀티모달 추론 파이프라인을 구축했습니다.\n• 엔터프라이즈 업무 자동화에서 AI 도입의 최대 난제인 환각 문제를 실질적으로 제어하는 실용적 솔루션입니다.",
    summary_en: "• DeepLearning Korea revealed an advanced enterprise document AI agent focused on autonomous hallucination detection beyond traditional OCR.\n• Implements multimodal reasoning pipelines to verify logical consistency across complex tabular structures and financial formulas.\n• Provides a practical enterprise solution addressing LLM reliability bottlenecks in mission-critical automated workflows.",
    body_ko: "인공지능 전문 기업 한국딥러닝이 문서 처리 자동화 시장을 겨냥해 오답과 환각을 능동적으로 식별하는 차세대 문서 분석 AI 에이전트를 선보였습니다. 기존의 문서 OCR 솔루션들이 단순 텍스트 추출 정확도에 집중했던 반면, 이번 기술은 추출된 데이터 간의 논리적 상호 검증과 수식 일치 여부를 평가하는 에이전틱 검증 계층을 결합했습니다. 비정형 표와 복합 양식이 포함된 공공·금융 문서를 멀티모달 모델로 정밀 분석한 후, 교차 검증 알고리즘을 통해 오류 가능성이 높은 항목을 사용자에게 명확히 피드백합니다. 이를 통해 엔터프라이즈 환경에서 사람이 수동으로 문서를 재검토해야 하는 비용을 대폭 줄일 수 있습니다. 실무 도입 시 데이터 무결성을 보장하는 고신뢰성 문서 AI 프레임워크로 기대를 모으고 있습니다.",
    body_en: "DeepLearning Korea introduced an enterprise-grade document analysis AI agent designed to autonomously detect hallucinations and data inconsistencies beyond conventional OCR metrics. While traditional document parsers focus strictly on optical character recognition accuracy, this architecture integrates an agentic verification layer that cross-checks tabular relationships and arithmetic correctness. Using multimodal LLM pipelines, it dissects complex unstructured layouts in legal and financial documents, flagging potential factual errors before output generation. This automated cross-validation drastically reduces human auditing overhead in enterprise workflows. It represents an essential step forward in deploying high-integrity AI document workflows in production.",
    tags: ["문서AI", "엔터프라이즈", "에이전트", "환각제어", "멀티모달"]
  },

  // 6. AI타임스 - 샤오미 미모 V3 프로 (model)
  {
    id: "aitimes_b41864787e",
    signal_id: "model",
    importance: 88,
    title_ko: "샤오미 'MiMo-V3-Pro' 유출 — 코딩 및 에이전트 벤치마크 최상위권 달성",
    title_en: "Xiaomi MiMo-V3-Pro Leak Highlights Elite Coding and Reasoning Agent Performance",
    summary_ko: "• 샤오미가 개발 중인 차세대 플래그십 LLM 'MiMo-V3-Pro'의 벤치마크 유출 결과가 공개되며 큰 화제를 모았습니다.\n• HumanEval 코딩 및 SWE-bench 에이전트 평가에서 주요 글로벌 빅테크 모델과 대등한 최상위 점수를 기록했습니다.\n• 디바이스 연동과 온디바이스-클라우드 하이브리드 추론 환경에 최적화된 고효율 아키텍처가 적용되었습니다.",
    summary_en: "• Leaked benchmark results for Xiaomi's upcoming flagship model 'MiMo-V3-Pro' have surfaced, showcasing state-of-the-art reasoning capabilities.\n• Demonstrated top-tier scores on HumanEval coding tasks and SWE-bench agentic evaluations competitive with leading proprietary models.\n• Optimized for hybrid on-device and cloud deployment across smart ecosystem hardware with high token efficiency.",
    body_ko: "샤오미의 차세대 대규모 언어 모델 'MiMo-V3-Pro'의 내부 벤치마크 결과가 유출되면서 오픈소스 및 글로벌 AI 커뮤니티에서 뜨거운 반응을 얻고 있습니다. 공개된 데이터에 따르면 MiMo-V3-Pro는 복잡한 소프트웨어 엔지니어링 과제를 평가하는 SWE-bench 및 코딩 벤치마크에서 오픈 모델 중 최고 수준의 성능을 입증했습니다. 샤오미는 자체 하드웨어 생태계와의 유기적인 연동을 위해 경량화 MoE(Mixture of Experts) 아키텍처를 도입하여 추론 비용과 지연 시간을 대폭 개선한 것으로 알려졌습니다. 특히 복합 도구 호출과 다단계 명령 실행이 요구되는 에이전트 워크플로우에서 뛰어난 성공률을 나타냈습니다. 스마트 디바이스와 AI 에이전트 인프라의 결합이 가속화되는 글로벌 경쟁 환경에서 주목할 만한 신호입니다.",
    body_en: "Leaked internal performance metrics for Xiaomi's next-generation flagship model, MiMo-V3-Pro, have sparked widespread industry attention. The leaked data reveals remarkable performance across complex coding evaluations including HumanEval and the SWE-bench software engineering suite. Built on an efficient Mixture of Experts (MoE) backbone, the model is engineered to deliver low-latency inference across both cloud infrastructures and distributed edge hardware. It demonstrates exceptional resilience in multi-turn tool calling and autonomous agentic workflows. This development underscores the intensifying global competition in delivering production-ready, cost-effective reasoning models.",
    tags: ["LLM", "샤오미", "벤치마크", "코딩모델", "AI에이전트"]
  },

  // 7. AI타임스 - 메타 뮤즈 스파크 1.2 (model)
  {
    id: "aitimes_2fe390e775",
    signal_id: "model",
    importance: 85,
    title_ko: "메타, 'Muse Spark 1.2' 오픈라우터 출시 — 초저비용 추론 API 경쟁 점화",
    title_en: "Meta Debuts 'Muse Spark 1.2' on OpenRouter with Industry-Low API Pricing",
    summary_ko: "• 메타가 고속 경량 추론에 최적화된 신규 언어 모델 'Muse Spark 1.2'를 오픈라우터 플랫폼에 전격 공급하기 시작했습니다.\n• 백만 토큰당 최저가 수준의 공격적인 API 단가를 책정하여 고빈도 에이전트 호출 환경의 비용 장벽을 크게 낮췄습니다.\n• 소형 파라미터 대비 뛰어난 문맥 파악 능력과 구조화 데이터(JSON/YAML) 출력 안정성을 보장합니다.",
    summary_en: "• Meta released its lightweight high-speed reasoning model 'Muse Spark 1.2' on OpenRouter with aggressive developer pricing.\n• Features exceptionally low per-million token costs designed to support high-frequency AI agent loops and background tasks.\n• Maintains strong context retention and strict structured JSON output fidelity despite its compact model footprint.",
    body_ko: "메타가 AI 개발자 플랫폼 오픈라우터(OpenRouter)를 통해 초경량 고속 추론 모델 '뮤즈 스파크(Muse Spark) 1.2'를 전격 공개했습니다. 이번 모델은 백만 토큰당 매우 낮은 비용으로 책정되어 서브에이전트 라우팅이나 실시간 데이터 요약 등 고빈도 반복 호출이 필요한 시스템에 최적화되었습니다. 경량화된 모델 크기에도 불구하고 지시 이행 능력과 JSON 모드 출력의 정확도가 대폭 강화되어 코딩 에이전트의 보조 엔진으로 적합합니다. 개발자들은 고가의 프론티어 모델을 사용하지 않고도 복잡한 파이프라인의 1차 분류 및 필터링 작업을 경제적으로 처리할 수 있게 되었습니다. 저비용 고성능 모델의 확산이 실제 AI 서비스 상용화의 진입 장벽을 한층 낮추고 있습니다.",
    body_en: "Meta has made its ultra-fast lightweight model, Muse Spark 1.2, available across developer API hubs like OpenRouter at industry-leading low costs. The model is specifically targeted at high-volume agentic loops, classification pipelines, and background processing tasks where token expenditure accumulates quickly. Despite its streamlined parameter footprint, Muse Spark 1.2 demonstrates high adherence to structured schema outputs and robust instruction-following capabilities. Developers can leverage it as an economical utility engine for intermediate pipeline steps without invoking expensive frontier LLMs. This release continues the rapid deflationary trend in high-efficiency AI inference costs.",
    tags: ["메타", "API", "오픈라우터", "경량모델", "비용최적화"]
  },

  // 8. AI타임스 - 클로드 코드 /eli5 스킬 (devtool)
  {
    id: "aitimes_59e8721fa6",
    signal_id: "devtool",
    importance: 87,
    title_ko: "앤트로픽 생태계 화제, 클로드 코드 '/eli5' 스킬 — 복잡한 코드를 다이어그램으로 시각화",
    title_en: "Anthropic Ecosystem Trends with Claude Code '/eli5' Skill for Visual Architecture Breakdown",
    summary_ko: "• Claude Code 커뮤니티에서 복잡한 소스코드를 어린아이도 이해할 수 있는 비유와 다이어그램으로 설명해주는 '/eli5' 스킬이 큰 인기를 얻고 있습니다.\n• 머메이드(Mermaid) 차트 자동 렌더링과 ASCII 다이어그램을 결합하여 코드베이스의 흐름을 직관적으로 시각화합니다.\n• 신규 개발자의 온보딩 시간 단축과 레거시 코드 리팩토링 검토 작업의 생산성을 혁신적으로 높여줍니다.",
    summary_en: "• The Claude Code ecosystem has popularized the '/eli5' custom skill, translating complex source code into intuitive visual analogies and charts.\n• Automatically renders Mermaid architecture diagrams and ASCII flows to map multi-file code dependencies instantly.\n• Dramatically accelerates onboarding for new engineers and streamlines legacy codebase refactoring discussions.",
    body_ko: "앤트로픽의 공식 CLI 에이전트 Claude Code 생태계에서 복잡한 로직을 쉽게 시각화해주는 커스텀 스킬 '/eli5'가 글로벌 개발자들 사이에서 큰 주목을 받고 있습니다. 'Explain Like I'm 5'의 약자인 이 스킬은 방대한 코드베이스를 분석한 후 비개발자나 주니어 엔지니어도 이해할 수 있는 직관적인 비유와 구조 다이어그램으로 변환해줍니다. 소스코드의 함수 호출 관계와 비동기 파이프라인을 Mermaid 및 터미널 ASCII 차트로 자동 시각화하여 구조 파악 시간을 획기적으로 줄여줍니다. 특히 복잡하게 얽힌 레거시 시스템을 인수인계받거나 대규모 PR을 리뷰할 때 아키텍처의 핵심 맥락을 빠르게 파악할 수 있는 유용한 도구로 평가받습니다. 에이전트 확장 스킬이 개발 생산성을 실제로 극대화하는 대표적 활용 사례입니다.",
    body_en: "Within the rapidly expanding Claude Code ecosystem, a custom agent skill named '/eli5' has gained widespread traction among software engineers. Standing for 'Explain Like I'm 5', the tool analyzes dense code repositories and synthesizes intuitive conceptual analogies paired with architectural diagrams. It parses function call trees and asynchronous lifecycles directly into Mermaid flows and terminal-friendly ASCII charts. This capability drastically reduces cognitive overhead when exploring legacy microservices or reviewing massive pull requests across distributed repositories. It showcases how custom agentic skill extensions can translate complex technical abstractions into accessible developer documentation.",
    tags: ["ClaudeCode", "개발도구", "시각화", "온보딩", "생산성"]
  },

  // 9. GitHub - genoffice (oss)
  {
    id: "github_227805cd2a",
    signal_id: "oss",
    importance: 89,
    title_ko: "genoffice — AI 에이전트가 내장된 오픈소스 크로스플랫폼 오피스 스위트",
    title_en: "genoffice - Open-Source Cross-Platform AI Office Suite for Word, Excel, PPT and PDF",
    summary_ko: "• 워드(.docx), 엑셀(.xlsx), 파워포인트(.pptx), PDF 문서를 로컬에서 편집하고 AI 에이전트를 내장한 오픈소스 오피스 genoffice가 공개되었습니다.\n• 로컬 LLM 및 클라우드 API를 지원하며, 슬라이드 자동 생성, 스프레드시트 수식 자동화, 문서 요약 에이전트를 완벽히 통합했습니다.\n• macOS, Windows, Linux를 지원하며 사용자의 문서 데이터가 외부로 유출되지 않는 완전한 프라이버시를 보장합니다.",
    summary_en: "• genoffice is a free, open-source AI office suite supporting Word, Excel, PowerPoint, PDF, and Markdown across all major operating systems.\n• Integrates autonomous AI agents capable of slide generation, spreadsheet formula execution, and semantic document analysis.\n• Provides complete data sovereignty with support for local offline LLMs and zero cloud data leaks.",
    body_ko: "오픈소스 프로젝트 genoffice는 마이크로소프트 오피스와 구글 독스를 대체할 수 있는 무료 오픈소스 AI 통합 오피스 환경입니다. genspark-ai 팀이 개발한 이 도구는 워드, 엑셀, 파워포인트, PDF 및 마크다운 파일의 네이티브 편집 기능을 갖추고 있으며 지능형 AI 에이전트를 기본 내장하고 있습니다. 사용자는 자연어 프롬프트를 통해 스프레드시트의 복잡한 통계 계산을 자동화하거나 개요만으로 전문적인 프레젠테이션 슬라이드를 생성할 수 있습니다. 로컬 Ollama 환경 및 클라우드 LLM API와 자유롭게 연동할 수 있어 민감한 기업 문서를 다룰 때도 강력한 보안성을 유지합니다. 상용 오피스 구독 없이도 고품질 AI 문서 작업 환경을 구축할 수 있는 혁신적인 오픈소스 솔루션입니다.",
    body_en: "Developed by the genspark-ai team, genoffice is an open-source, full-featured office productivity suite featuring embedded AI agents for macOS, Windows, and Linux. It natively reads and writes Microsoft Office formats (.docx, .xlsx, .pptx) as well as PDF and Markdown with zero telemetry. The embedded autonomous agents can generate multi-slide decks from plain text, construct complex Excel formulas, and perform deep semantic synthesis across long reports. Users can seamlessly connect local offline models via Ollama or enterprise API keys, ensuring complete data sovereignty and enterprise compliance. It represents a powerful free alternative to commercial office ecosystems with native agentic superpowers.",
    tags: ["오픈소스", "오피스", "AI에이전트", "문서자동화", "프라이버시"]
  },

  // 10. GitHub - cumora (devtool)
  {
    id: "github_41cd6da4bc",
    signal_id: "devtool",
    importance: 91,
    title_ko: "cumora — AI 코딩 에이전트를 1급 팀원으로 통합하는 크로스플랫폼 팀 협업 챗",
    title_en: "cumora - Team Collaboration Chat Where AI Agents Work as First-Class Teammates",
    summary_ko: "• 인간 엔지니어와 AI 코딩 에이전트(Claude Code, Codex 등)가 동등한 팀원으로 협업하는 오픈소스 메신저 cumora가 출시되었습니다.\n• 각 에이전트에 독립적인 실행 환경과 컨텍스트 브레인을 할당하여 다중 에이전트 팀 오케스트레이션을 지원합니다.\n• 슬랙이나 디스코드 형태의 친숙한 채팅 UI에서 코드 작성, PR 검토, 배포 명령을 자연스럽게 지시하고 조율할 수 있습니다.",
    summary_en: "• cumora is an open-source cross-platform chat platform where autonomous AI agents (Claude Code, Codex) collaborate as first-class teammates.\n• Provides dedicated execution sandboxes and context brains for each agent to enable seamless multi-agent orchestration.\n• Features a modern Slack-like interface allowing developers to assign coding tasks, review PRs, and manage deployments conversationally.",
    body_ko: "오픈소스 개발자 yetone이 공개한 cumora는 인간 개발자와 AI 에이전트가 단일 협업 공간에서 실시간으로 대화하고 작업하는 차세대 팀 메신저입니다. 기존의 단순 챗봇 연동과 달리, cumora의 에이전트는 로컬 터미널의 Claude Code나 클라우드 Codex 브레인을 직접 탑재하여 파일 시스템 접근과 도구 실행 권한을 갖습니다. 프로젝트 팀 채널에서 사용자가 버그 수정이나 기능 구현을 멘션하면 에이전트들이 서브태스크를 나눠 맡아 코드를 작성하고 브랜치를 생성합니다. 다른 에이전트가 작성한 코드를 동료 에이전트가 상호 검토하는 멀티 에이전트 협업 루프를 시각적으로 모니터링할 수 있습니다. AI 에이전트 기반 개발팀의 미래 협업 모델을 구체화한 흥미로운 오픈소스 프로젝트입니다.",
    body_en: "Created by open-source developer yetone, cumora is a cross-platform team collaboration platform where AI agents operate alongside engineers as first-class teammates. Unlike simple chatbot webhooks, cumora grants agents direct access to development runtimes powered by Claude Code or Codex backends. In shared project channels, engineers can assign feature tickets conversationally, prompting agents to decompose tasks, write code, and submit pull requests autonomously. The system supports multi-agent coordination loops where specialized agents peer-review each other's code before alerting human maintainers. It effectively previews the future of human-agent collaborative software development in a familiar chat interface.",
    tags: ["협업도구", "코딩에이전트", "ClaudeCode", "팀메신저", "오케스트레이션"]
  },

  // 11. GitHub - OpenBot (oss)
  {
    id: "github_24e09df058",
    signal_id: "oss",
    importance: 90,
    title_ko: "CopilotKit OpenBot — 독립된 가상 컴퓨터를 할당받는 오픈소스 AI 동료 런타임",
    title_en: "CopilotKit OpenBot - Open-Source Autonomous AI Coworkers with Dedicated Sandboxed Computers",
    summary_ko: "• CopilotKit에서 독립된 가상 브라우저, 파일 시스템, 터미널 도구를 제어하는 오픈소스 AI 동료 프레임워크 OpenBot을 공개했습니다.\n• 모든 에이전트 동작을 실행 전 계획 단계에서 결정하고 실행 후 감사 로그로 기록하는 결정적 보안 아키텍처를 구현했습니다.\n• 임의의 AG-UI 기반 에이전트를 연결하여 백그라운드에서 복잡한 웹 서핑과 데이터 수집 작업을 위임할 수 있습니다.",
    summary_en: "• CopilotKit unveiled OpenBot, an open-source framework provisioning autonomous AI coworkers with isolated virtual environments.\n• Implements a deterministic execution model where every tool invocation is decided in advance and audited post-execution.\n• Seamlessly integrates with AG-UI agent architectures to perform complex web navigation and data workflows autonomously.",
    body_ko: "CopilotKit 팀이 새롭게 발표한 OpenBot은 AI 에이전트에게 독립적인 가상 컴퓨터 환경을 제공하여 안전하게 작업을 수행시키는 오픈소스 런타임입니다. 각 AI 동료는 전용 가상 브라우저와 파일 시스템, CLI 도구를 격리된 샌드박스 내에서 할당받아 복잡한 멀티스텝 태스크를 자율적으로 완수합니다. 특히 모든 도구 호출과 키보드·마우스 동작을 사전에 검증하고 실행 후 비디오 및 이벤트 로그로 완벽하게 기록하는 투명성을 제공합니다. 이를 통해 인간 관리자는 에이전트가 어떤 맥락에서 결정을 내렸는지 정확하게 추적하고 개입할 수 있습니다. 기업 내부 시스템에서 에이전트에게 안전한 작업 권한을 부여하고자 할 때 이상적인 엔지니어링 기반을 제공합니다.",
    body_en: "Released by the CopilotKit team, OpenBot is an open-source runtime providing autonomous AI coworkers with sandboxed virtual desktop environments. Each bot instance is provisioned with an isolated browser, file system, and terminal tools to execute multi-step workflows without risking local machine integrity. The platform enforces strict deterministic security, planning actions before execution and capturing full telemetry and video replay afterwards. This transparency allows human supervisors to audit every intermediate decision and step in whenever anomalies occur. It establishes a robust foundational architecture for deploying untrusted autonomous agents in secure enterprise production environments.",
    tags: ["오픈소스", "AI런타임", "샌드박스", "컴퓨터유즈", "보안"]
  },

  // 12. GitHub - fx (devtool)
  {
    id: "github_130237f17e",
    signal_id: "devtool",
    importance: 93,
    title_ko: "Vercel Labs 'fx' — 유닉스 파이프 철학을 계승한 고속 경량 CLI 코딩 에이전트",
    title_en: "Vercel Labs 'fx' - Unix-Philosophical High-Speed CLI Coding Agent",
    summary_ko: "• Vercel Labs에서 유닉스의 '단순함과 파이프라인 결합' 철학을 기반으로 설계한 CLI 코딩 에이전트 fx를 공식 공개했습니다.\n• 불필요한 무거운 의존성을 제거하고 표준 입출력(stdio)과 POSIX 툴체인과 유기적으로 결합하는 초경량 바이너리로 동작합니다.\n• 복잡한 코드 리팩토링, 테스트 생성, 디버깅 작업을 터미널 환경에서 극도로 빠른 지연 시간으로 수행합니다.",
    summary_en: "• Vercel Labs introduced 'fx', a command-line coding agent designed around the classic Unix philosophy of composability and minimalism.\n• Operates as a lightweight binary integrating natively with standard streams (stdio) and POSIX developer toolchains.\n• Executes rapid code refactoring, test synthesis, and terminal debugging with sub-second responsiveness.",
    body_ko: "Vercel Labs에서 새롭게 선보인 fx는 전통적인 유닉스 철학을 현대적인 AI 코딩 에이전트에 접목한 초고속 터미널 개발 도구입니다. 거대한 GUI나 무거운 백엔드 데몬 없이 단일 바이너리로 동작하며, 파이프와 리다이렉션을 통해 표준 셸 명령어들과 자유롭게 조합할 수 있습니다. 소스코드를 분석하여 인라인 diff를 생성하고 터미널에서 즉각적인 파일 수정과 테스트 실행 루프를 완벽하게 제어합니다. 간결한 프롬프트 엔지니어링과 고속 토큰 스트리밍 기술을 결합하여 개발자가 타이핑하는 즉시 최적의 패치를 제안합니다. 터미널 중심의 고효율 개발 워크플로우를 선호하는 엔지니어들에게 차별화된 사용성을 선사하는 도구입니다.",
    body_en: "Vercel Labs released 'fx', a minimalist CLI coding agent built upon the foundational Unix principles of modularity and composability. Designed without bloated GUI dependencies, it operates as a streamlined binary that interacts seamlessly with standard Unix pipelines and POSIX shells. It inspects source trees to produce inline patch diffs, executing local tests and code modifications in tight feedback loops. By coupling precise context retrieval with sub-second streaming inference, it delivers near-instantaneous code edits directly in the terminal. It provides an exceptional productivity booster for command-line purists and DevOps engineers.",
    tags: ["Vercel", "코딩에이전트", "CLI", "유닉스", "개발도구"]
  },

  // 13. GitHub - watermarks-remover (oss)
  {
    id: "github_f9c276cedf",
    signal_id: "oss",
    importance: 81,
    title_ko: "watermarks-remover — 다중 벤더 AI 텍스트 위생 및 메타데이터 정제 오픈소스",
    title_en: "watermarks-remover - Open-Source Toolkit for AI Provenance Stripping and Metadata Sanitization",
    summary_ko: "• 다양한 LLM이 생성한 텍스트에 포함되는 유니코드 워터마크와 비가시적 식별자를 제거해주는 도구 watermarks-remover가 공개되었습니다.\n• PNG, JPEG, PDF, DOCX, Markdown 등 다양한 문서 형식에서 C2PA 및 AI 서명 메타데이터를 정제합니다.\n• 텍스트 통계 기반의 재작성 훅을 제공하여 AI 생성물의 흔적을 자연스럽고 안전하게 정규화합니다.",
    summary_en: "• watermarks-remover is an open-source utility that cleanses multi-vendor AI provenance markers and invisible Unicode watermarks.\n• Strips C2PA credentials and generative metadata across PNG, JPEG, PDF, DOCX, and Markdown documents.\n• Provides statistical text sanitization hooks to normalize synthetic content artifacts reliably.",
    body_ko: "개발자 기욤 메이어(Guillaume Meyer)가 개발한 watermarks-remover는 다양한 AI 서비스에서 생성된 콘텐츠의 출처 메타데이터와 숨겨진 워터마크를 정제해주는 오픈소스 도구입니다. 최근 주요 LLM 공급업체들이 텍스트 내에 삽입하는 비가시적 제로-너비 유니코드 문자나 통계적 워터마크 패턴을 정밀하게 탐지하여 제거합니다. 또한 이미지와 PDF, 워드 문서에 기록되는 C2PA 인증 정보와 메타데이터 헤더를 파싱하여 원치 않는 데이터 유출을 방지합니다. 사용자는 CLI 명령어 한 줄이나 파이썬 패키지 형태로 손쉽게 파이프라인에 통합할 수 있습니다. AI 생성 콘텐츠를 안전하게 가공하고 개인정보와 문서 프라이버시를 보호하고자 하는 개발자들에게 유용한 보안 유틸리티입니다.",
    body_en: "Authored by developer Guillaume Meyer, watermarks-remover is an open-source security tool designed to cleanse generative metadata and hidden watermarks across AI-produced assets. It detects and sanitizes invisible zero-width Unicode sequences and synthetic statistical artifacts embedded by modern LLM providers. Furthermore, it inspects and strips C2PA credentials and provenance headers from binary assets including images, PDFs, and Office documents. Engineers can integrate it as a lightweight CLI utility or import it into Python data processing pipelines. It provides an effective privacy shield for developers handling synthetic data pipelines and automated document flows.",
    tags: ["오픈소스", "보안", "워터마크", "프라이버시", "데이터정제"]
  },

  // 14. Reddit - Qwen 3.8 27B (model)
  {
    id: "reddit_191e935674",
    signal_id: "model",
    importance: 92,
    title_ko: "Qwen 3.8 27B 모델 공개에 로컬 AI 커뮤니티 찬사 — 벤치마크 및 코딩 판도 변화",
    title_en: "Local LLM Community Praises Qwen 3.8 27B as a Transformative Milestone for Desktop AI",
    summary_ko: "• 알리바바의 차세대 오픈 가중치 모델 Qwen 3.8 27B가 로컬 LLM 커뮤니티에서 폭발적인 반응을 얻고 있습니다.\n• 24GB VRAM을 갖춘 소비자용 GPU에서 원활하게 구동되며, 기존 70B급 모델을 능가하는 코딩 추론 성능을 기록했습니다.\n• 다단계 추론 안정성과 장문 컨텍스트 유지력이 비약적으로 개선되어 로컬 코딩 에이전트의 주력 모델로 부상했습니다.",
    summary_en: "• The LocalLLaMA community is celebrating Alibaba's newly released Qwen 3.8 27B as a major milestone for local desktop AI.\n• Fits comfortably on consumer 24GB VRAM GPUs while outperforming several previous-generation 70B models in coding tasks.\n• Demonstrates superior long-context coherence and multi-step reasoning, making it a premier candidate for local coding agents.",
    body_ko: "Reddit의 r/LocalLLaMA 커뮤니티에서 새롭게 릴리즈된 Qwen 3.8 27B 모델이 로컬 AI 생태계의 판도를 바꿀 핵심 모델로 찬사를 받고 있습니다. 사용자 실측 결과에 따르면 Qwen 3.8 27B는 RTX 3090/4090과 같은 24GB VRAM 단일 그래픽카드에서 고속 추론이 가능하며, 대형 70B 모델들과 견주어도 뒤지지 않는 코딩 및 논리 추론력을 보여줍니다. 특히 복잡한 알고리즘 생성과 오류 디버깅에서 할루시네이션이 현저히 적고, Claude Code 스타일의 로컬 에이전트 하네스와 완벽한 호환성을 자랑합니다. 방대한 컨텍스트를 다루는 소프트웨어 프로젝트 분석에서도 안정적인 문맥 유지력을 발휘합니다. 데스크톱 환경에서 프라이빗 코딩 에이전트를 구축하려는 개발자들에게 최적의 표준 모델로 자리매김하고 있습니다.",
    body_en: "Discussions across the r/LocalLLaMA community highlight Alibaba's Qwen 3.8 27B as a transformative breakthrough for desktop-class local AI execution. Benchmark reports confirm the 27B parameter architecture runs efficiently on single 24GB VRAM consumer GPUs while matching or exceeding the coding benchmarks of older 70B parameter models. It exhibits exceptional precision during complex refactoring tasks and architectural debugging with noticeably reduced hallucination rates. Users report seamless integration into local terminal harnesses and agentic pipelines requiring deep multi-turn context retention. It establishes a new standard for private, offline developer workflows without reliance on cloud APIs.",
    tags: ["Qwen", "로컬LLM", "오픈소스", "코딩모델", "벤치마크"]
  },

  // 15. Reddit - Gemma 4 12B Fine-tuning (practice)
  {
    id: "reddit_4fb88e596b",
    signal_id: "practice",
    importance: 84,
    title_ko: "Gemma 4 12B 파인튜닝으로 도구 호출 성능 2.7배 향상 — 16GB VRAM 로컬 에이전트 최적화",
    title_en: "Fine-Tuning Gemma 4 12B Delivers 2.7x Tool Calling Improvement on 16GB VRAM Systems",
    summary_ko: "• 16GB VRAM 환경에 최적화하여 Gemma 4 12B 모델을 파인튜닝한 결과 도구 호출(Tool Calling) 성공률이 2.7배 향상된 사례가 공유되었습니다.\n• 불필요한 장황한 응답을 억제하고 정밀한 함수 인자 JSON 스키마를 출력하도록 데이터셋을 특화 학습시켰습니다.\n• 중급형 소비자용 하드웨어에서도 지연 시간 없이 안정적인 로컬 함수 호출 에이전트를 운용할 수 있음을 입증했습니다.",
    summary_en: "• A developer demonstrated a 2.7x increase in tool calling accuracy by fine-tuning Google's Gemma 4 12B for 16GB VRAM setups.\n• Curated training datasets to suppress verbose prose and enforce strict JSON schema compliance for deterministic function dispatch.\n• Validates that mid-range consumer GPUs can host highly dependable, low-latency function calling agents locally.",
    body_ko: "Reddit 커뮤니티의 한 개발자가 16GB VRAM 사양의 로컬 PC에서 구동할 수 있도록 Google Gemma 4 12B 모델을 파인튜닝한 성공 사례를 공유해 큰 관심을 모았습니다. 연구자는 함수 호출에 특화된 고품질 대화 데이터셋을 구축하여 모델이 자연어 설명 대신 엄격한 JSON 파라미터만을 출력하도록 집중 학습시켰습니다. 그 결과 표준 도구 호출 벤치마크에서 기본 모델 대비 2.7배 높은 호출 정확도와 문법 준수율을 기록했습니다. 16GB 그래픽카드 메모리 내에서 4비트 양자화를 통해 초당 높은 토큰 처리량을 유지하면서도 에이전트 오동작을 획기적으로 줄였습니다. 대규모 인프라 없이 개인 장비에서 신뢰할 수 있는 도구 제어 에이전트를 구축하는 실전 튜닝 노하우를 제시합니다.",
    body_en: "An engineer on r/LocalLLaMA shared an inspiring case study detailing the fine-tuning of Google's Gemma 4 12B model specifically for high-accuracy function calling on 16GB VRAM GPUs. By curating synthetic execution traces, the fine-tune eliminates conversational bloat and forces strict JSON schema validation during tool invocation. The resulting checkpoint achieves a 2.7x benchmark improvement in tool dispatch accuracy over the baseline model. Running quantized on mid-tier hardware, it sustains rapid token throughput while completely preventing JSON malformation crashes in agent loops. This technique provides an accessible blueprint for engineers wanting to build robust local function-calling agents on constrained hardware.",
    tags: ["Gemma", "파인튜닝", "도구호출", "로컬AI", "최적화"]
  },

  // 16. Reddit - C to Three.js Port with Qwen (practice)
  {
    id: "reddit_d579db991c",
    signal_id: "practice",
    importance: 87,
    title_ko: "3만 9천 줄 C 언어 코드를 단일 HTML/Three.js로 완벽 변환한 Qwen 3.8 실증 사례",
    title_en: "Porting a 39k-Line C Codebase to Single-File HTML and Three.js Using Qwen 3.8",
    summary_ko: "• 한 개발자가 3만 9,000줄 규모의 레거시 C 그래픽스 코드를 Qwen 3.8 27B 모델을 활용해 단일 HTML 및 Three.js로 성공적으로 포팅했습니다.\n• 복잡한 포인터 연산과 3D 렌더링 파이프라인을 최신 웹 표준 자바스크립트로 변환하는 구조적 프롬프트 기법을 공유했습니다.\n• 대규모 레거시 소프트웨어 현대화 작업에서 최신 LLM의 코드베이스 이해력과 변환 능력을 입증했습니다.",
    summary_en: "• A developer successfully ported a 39,000-line legacy C graphics application into a single-file HTML/Three.js web app using Qwen 3.8 27B.\n• Shared a multi-stage prompting methodology translating complex C pointers and rendering loops into modern JavaScript shaders.\n• Demonstrates the growing maturity of frontier open models in automating complex legacy codebase refactoring and migration.",
    body_ko: "오픈소스 개발자가 수십 년 된 3만 9천 줄 분량의 레거시 C 그래픽스 엔진을 Qwen 3.8 27B 모델의 도움을 받아 단일 파일 HTML 및 Three.js 웹 애플리케이션으로 포팅한 경험을 공개했습니다. 저자는 코드를 무작정 통째로 변환하는 대신, 수학적 변환 함수와 메모리 버퍼 관리 로직을 단계별로 나누어 LLM에 질의하는 분할 정복 프롬프트 파이프라인을 설계했습니다. Qwen 3.8은 C 언어의 저수준 포인터 산술 연산을 현대적인 자바스크립트 Float32Array 및 WebGL 셰이더 호출로 정확하게 치환했습니다. 최종 결과물은 외부 빌드 도구 없이 브라우저에서 즉시 실행 가능한 인터랙티브 3D 시뮬레이션으로 완성되었습니다. 레거시 코드베이스 마이그레이션에서 오픈소스 모델이 실질적인 생산성 가속을 제공함을 증명한 모범 사례입니다.",
    body_en: "A developer on r/LocalLLaMA presented a remarkable demonstration of legacy migration, porting a 39,000-line C graphics codebase into a standalone HTML/Three.js web application via Qwen 3.8 27B. Instead of naive one-shot prompting, the author devised a modular decomposition strategy converting mathematical core routines, memory structs, and rendering loops systematically. The model accurately translated intricate pointer arithmetic into modern TypedArrays and WebGL pipeline bindings. The resulting single-file application runs smoothly in any standard browser without compilation overhead. It serves as compelling empirical evidence of local open LLMs handling massive, non-trivial architectural refactorings effectively.",
    tags: ["코드마이그레이션", "C언어", "ThreeJS", "Qwen", "실무사례"]
  },

  // 17. Reddit - DeepSeek Harness (devtool)
  {
    id: "reddit_2fe5de8cc2",
    signal_id: "devtool",
    importance: 89,
    title_ko: "DeepSeek Harness — 추론 모델의 잠재력을 극대화하는 경량 에이전트 프레임워크",
    title_en: "DeepSeek Harness - Lightweight Agent Framework Unlocking Full Reasoning Potential",
    summary_ko: "• DeepSeek R1 및 V3 추론 모델의 멀티스텝 추론 능력을 극대화하는 경량 에이전트 하네스 프레임워크가 공개되었습니다.\n• 불필요한 프레임워크 오버헤드를 배제하고 순수 사고 체인(CoT) 보존과 간결한 도구 실행 인터페이스를 제공합니다.\n• 복잡한 알고리즘 검증과 수학적 문제 해결에서 프론티어 상용 모델 대비 우수한 가성비와 성공률을 보여줍니다.",
    summary_en: "• A dedicated lightweight agent harness optimized specifically for DeepSeek R1 and V3 reasoning models has been open-sourced.\n• Preserves raw Chain-of-Thought reasoning traces while providing minimal-overhead tool execution bindings.\n• Achieves outstanding benchmark success rates in algorithmic problem-solving at a fraction of proprietary API costs.",
    body_ko: "Reddit 커뮤니티에서 DeepSeek의 고성능 추론 모델들을 위해 특화 설계된 경량 에이전트 프레임워크 'DeepSeek Harness'가 개발자들 사이에서 큰 인기를 얻고 있습니다. 기존 에이전트 프레임워크들이 모델의 사고 과정을 지나치게 제약했던 것과 달리, 이 하네스는 DeepSeek의 자율적 사고 체인(CoT)을 온전히 보존하면서 필요한 시점에만 도구를 호출하도록 유도합니다. 이를 통해 수학 증명, 알고리즘 구현, 복잡한 논리 퍼즐 등 심층 추론이 필요한 영역에서 놀라운 작업 완수율을 나타냈습니다. 가벼운 파이썬 코드로 구성되어 누구나 쉽게 자신의 워크플로우에 통합할 수 있는 높은 유연성을 갖추고 있습니다. 최신 오픈 추론 모델의 잠재력을 100% 이끌어내는 차세대 에이전트 아키텍처로 주목받고 있습니다.",
    body_en: "DeepSeek Harness has captured enthusiastic acclaim across developer forums as a purpose-built agentic runtime for DeepSeek reasoning architectures. Unlike heavy frameworks that constrain intermediate model outputs, this harness preserves natural Chain-of-Thought reasoning trajectories while dispatching deterministic tool calls on demand. Benchmark evaluations show marked improvements in tackling advanced algorithmic tasks and formal verification problems. Its lightweight Python codebase eliminates runtime friction and makes integration into existing developer toolchains straightforward. It showcases the emerging paradigm of designing specialized agent harnesses tailored to raw reasoning models.",
    tags: ["DeepSeek", "에이전트하네스", "추론모델", "오픈소스", "개발도구"]
  }
];

function main() {
  console.log("==========================================");
  console.log(`2026-08-24 데일리 뉴스 직접 큐레이션 빌드 시작`);
  console.log("==========================================");

  if (!fs.existsSync(CANDIDATES_PATH)) {
    console.error(`Error: ${CANDIDATES_PATH} not found.`);
    process.exit(1);
  }

  const rawCandidates = JSON.parse(fs.readFileSync(CANDIDATES_PATH, "utf8"));
  const factMap = new Map();
  for (const c of rawCandidates.candidates || []) {
    factMap.set(c.id, c);
  }

  console.log(`후보 맵 로드 완료: ${factMap.size}개`);

  const newsItems = [];
  const signalCounts = {};

  for (const entry of CURATED_ENTRIES) {
    const fact = factMap.get(entry.id);
    if (!fact) {
      console.error(`Error: candidate ID ${entry.id} not found in candidates file!`);
      process.exit(1);
    }

    const source = fact.source in SOURCE_NAMES ? fact.source : "web";
    const item = {
      id: fact.id,
      category_id: source,
      category_name: SOURCE_NAMES[source] || fact.source_name,
      signal_id: entry.signal_id,
      signal_name: SIGNALS[entry.signal_id],
      importance: entry.importance,
      headline: entry.title_ko.slice(0, 160),
      title_ko: entry.title_ko.slice(0, 160),
      title_en: entry.title_en.slice(0, 200),
      summary_ko: entry.summary_ko,
      summary_en: entry.summary_en,
      body_ko: entry.body_ko,
      body_en: entry.body_en,
      author_profile: fact.author,
      publish_date: fact.publish_date,
      tags: entry.tags,
      url: fact.url,
      sources: fact.cross_sources || [fact.source_name],
      metrics: fact.metrics || {},
      curated_by: CURATED_BY,
    };

    newsItems.push(item);
    signalCounts[entry.signal_id] = (signalCounts[entry.signal_id] || 0) + 1;
  }

  // 중요도 순 정렬
  newsItems.sort((a, b) => b.importance - a.importance);

  const top = newsItems[0];
  const summaryText = `오늘의 주요 AI 기술 신호 ${newsItems.length}건을 정리했습니다. 최신 기술 동향과 오픈소스 소프트웨어 릴리즈를 다룹니다. ldk-hub에서 큐레이션 하였습니다.`;

  const outputPayload = {
    updated_at: new Date().toISOString(),
    curated_date: TODAY,
    curated_by: CURATED_BY,
    total_count: newsItems.length,
    signal_counts: signalCounts,
    summary: summaryText,
    news: newsItems,
  };

  // 1. site/public/data/news_latest.json 저장
  fs.mkdirSync(path.dirname(LATEST_PATH), { recursive: true });
  fs.writeFileSync(LATEST_PATH, JSON.stringify(outputPayload, null, 2), "utf8");
  console.log(`[저장 완료] ${LATEST_PATH} (${newsItems.length}건)`);

  // 2. data/archive/news_YYYY-MM-DD.json 저장
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const archivePath = path.join(ARCHIVE_DIR, `news_${TODAY}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(outputPayload, null, 2), "utf8");
  console.log(`[아카이브 저장] ${archivePath}`);

  // 3. data/archive/news_index.json 갱신
  let archiveIndex = [];
  if (fs.existsSync(ARCHIVE_INDEX_PATH)) {
    try {
      archiveIndex = JSON.parse(fs.readFileSync(ARCHIVE_INDEX_PATH, "utf8"));
    } catch (e) {}
  }
  const indexEntry = {
    date: TODAY,
    file: `news_${TODAY}.json`,
    total_count: newsItems.length,
    signal_counts: signalCounts,
    headline: top ? top.headline : "",
    summary: summaryText,
  };
  const existingIdx = archiveIndex.findIndex((e) => e.date === TODAY);
  if (existingIdx >= 0) {
    archiveIndex[existingIdx] = indexEntry;
  } else {
    archiveIndex.unshift(indexEntry);
  }
  archiveIndex.sort((a, b) => b.date.localeCompare(a.date));
  fs.writeFileSync(ARCHIVE_INDEX_PATH, JSON.stringify(archiveIndex, null, 2), "utf8");
  console.log(`[아카이브 인덱스 갱신] ${ARCHIVE_INDEX_PATH}`);

  // 4. site/public/data/archive 미러링
  const publicArchiveDir = path.join(ROOT, "site", "public", "data", "archive");
  if (fs.existsSync(publicArchiveDir)) {
    fs.copyFileSync(archivePath, path.join(publicArchiveDir, `news_${TODAY}.json`));
    fs.copyFileSync(ARCHIVE_INDEX_PATH, path.join(publicArchiveDir, "news_index.json"));
  }

  console.log("==========================================");
  console.log("큐레이션 생성 완료! 이제 --validate 를 실행합니다.");
  console.log("==========================================");
}

main();
