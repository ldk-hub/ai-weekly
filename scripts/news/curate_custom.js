#!/usr/bin/env node
/**
 * 2026-08-27 데일리 뉴스 큐레이션 스크립트
 * 스킬 규격: 18건, 7대 플랫폼 균형, 6축 신호 분포, 3불릿 요약, 5~10문장 해설
 */

const fs = require("fs");
const path = require("path");

const TODAY = "2026-08-27";
const CANDIDATES_FILE = path.join(__dirname, "../../.tmp/news_candidates.json");
const LATEST_FILE = path.join(__dirname, "../../site/public/data/news_latest.json");
const ARCHIVE_DIR = path.join(__dirname, "../../data/archive");
const PUBLIC_ARCHIVE_DIR = path.join(__dirname, "../../site/public/data/archive");
const INDEX_FILE = path.join(ARCHIVE_DIR, "news_index.json");
const PUBLIC_INDEX_FILE = path.join(PUBLIC_ARCHIVE_DIR, "news_index.json");

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
  aitimes: "AI타임스",
  hackernews: "Hacker News",
  reddit: "Reddit",
  github: "GitHub",
  bluesky: "Bluesky",
  hfpapers: "HF Daily Papers",
};

const CURATED_ITEMS = [
  // 1. aitimes_d1bfee1857 (product)
  {
    id: "aitimes_d1bfee1857",
    signal_id: "product",
    importance: 95,
    title_ko: "오픈AI \"챗GPT 다음 단계는 '일하는 AI'\"...에이전트 중심 작업 자동화 선언",
    title_en: "OpenAI: The Next Evolution of ChatGPT is 'Work-Ready AI'",
    summary_ko: "• 오픈AI 리더십이 챗GPT의 궁극적인 지향점을 단순 대화형 인터페이스에서 자율 업무 수행 에이전트로 정의했습니다.\n• 단순 질문 답변을 넘어 워크스페이스 내 다단계 프로젝트 기획과 코드 작성, 실행 및 수정까지 일괄 완수하는 시스템을 목표로 합니다.\n• 기업 실무자 및 개발자들의 반복적인 데스크톱 워크플로우를 자동화하는 전용 도구 체계가 대거 강화될 전망입니다.",
    summary_en: "• OpenAI leadership outlines the next major evolution of ChatGPT from conversational chatbot into autonomous work-ready agents.\n• Focuses on automating multi-step desktop workflows, code execution, and cross-application project management.\n• Positions ChatGPT as an active collaborator rather than a passive assistant for knowledge workers.",
    body_ko: "오픈AI 경영진이 챗GPT의 다음 단계 핵심 목표로 '일하는 AI(Work-Ready AI)'를 제시하며 본격적인 자율 에이전트 전환을 선언했습니다. 초기 챗GPT가 텍스트 생성과 질문 답변 위주의 대화형 도구였다면, 앞으로는 복잡한 비즈니스 로직과 다단계 소프트웨어 프로젝트를 스스로 계획하고 실행하는 구조로 진화합니다. 특히 사용자의 명시적 프롬프트 없이도 컨텍스트를 파악해 코드를 디버깅하고 문서를 통합 관리하는 능력이 집중 개발되고 있습니다. 이는 최근 출시된 심층 코딩 에이전트 기능들과 맞물려 개발 환경 전반의 생산성 패러다임을 바꿀 것으로 기대됩니다. 오픈AI는 사용자가 최종 결과물 검토와 의사결정에만 집중할 수 있도록 자율 실행의 안정성을 지속적으로 끌어올릴 방침입니다.",
    body_en: "OpenAI leadership announced that the future roadmap for ChatGPT centers on building proactive 'Work-Ready AI' capable of completing complex real-world workflows. Moving beyond passive prompt responses, next-generation models are designed to formulate execution plans, manage workspace files, and debug code autonomously. This initiative directly integrates with recent improvements in coding environments and enterprise tools. The company emphasizes closing the gap between human intent and reliable autonomous task completion.",
    tags: ["오픈AI", "챗GPT", "자율에이전트", "업무자동화", "AI전략"]
  },
  // 2. aitimes_b92a7b3e10 (product)
  {
    id: "aitimes_b92a7b3e10",
    signal_id: "product",
    importance: 93,
    title_ko: "앤트로픽, 클로드 '채팅'과 '코워크' 메모리 통합...작업 연속성 대폭 강화",
    title_en: "Anthropic Unifies Claude Chat and Co-Work Memory for Seamless Task Continuity",
    summary_ko: "• 앤트로픽이 웹 기반 클로드 채팅과 개발자 코워크 환경 간의 세션 컨텍스트 및 메모리를 하나로 통합했습니다.\n• 이전 대화에서 논의된 프로젝트 맥락과 도메인 지식이 코딩 워크스페이스 세션으로 실시간 동기화됩니다.\n• 세션 단절로 인한 반복 설명 비용을 줄이고 장기 프로젝트 수행 시 연속적인 개발 경험을 제공합니다.",
    summary_en: "• Anthropic integrates persistent memory between Claude chat interfaces and collaborative coding environments.\n• Ensures that context, architecture decisions, and project constraints carry over seamlessly across active sessions.\n• Eliminates repetitive prompt setup and enhances long-term task coherence for enterprise engineers.",
    body_ko: "앤트로픽이 클로드(Claude)의 일반 채팅 인터페이스와 협업 코딩 모드인 '코워크(Co-Work)'의 메모리 시스템을 전격 통합했습니다. 지금까지는 사용자가 채팅에서 설계 아이디어를 발전시키더라도 코딩 세션으로 이동할 때마다 배경 맥락을 다시 설명해야 하는 번거로움이 있었습니다. 이번 업데이트를 통해 클로드는 이전 대화에서 확정된 아키텍처 규칙과 사용자의 선호 스타일을 기억하여 코딩 작업에 즉시 반영합니다. 특히 장기 프로젝트를 진행할 때 세션이 재시작되더라도 일관된 코드 품질과 정책을 유지할 수 있게 되었습니다. 이는 컨텍스트 윈도우 한계를 극복하고 개발자와 AI 간의 지속적인 페어 프로그래밍 경험을 완성하는 데 크게 기여할 것으로 평가됩니다.",
    body_en: "Anthropic has rolled out unified memory synchronization across Claude chat sessions and Co-Work developer workspaces. Developers no longer need to manually copy-paste specifications or re-explain design choices when transitioning between conversational planning and active coding. Claude now preserves architectural constraints, user conventions, and previous debugging history across sessions. This enhancement significantly reduces cognitive overhead and context friction during complex development lifecycles.",
    tags: ["앤트로픽", "클로드", "메모리통합", "코딩에이전트", "컨텍스트연속성"]
  },
  // 3. aitimes_864a02b000 (research)
  {
    id: "aitimes_864a02b000",
    signal_id: "research",
    importance: 90,
    title_ko: "\"트랜스포머 한계 극복\"...물리 법칙을 직접 이해하는 신개념 '피지컬 AI' 공개",
    title_en: "Overcoming Transformer Limits: Novel 'Physical AI' Directly Modeling Laws of Physics",
    summary_ko: "• 단순 텍스트 패턴 학습을 넘어 물리 법칙과 역학 관계를 수학적으로 직접 내재화한 신개념 피지컬 AI 모델이 공개되었습니다.\n• 3차원 공간 내 중력, 마찰력, 유체 역학 시뮬레이션에서 기존 트랜스포머 대비 오차율을 60% 이상 감축했습니다.\n• 로봇 제어, 자율주행, 정밀 제조 시뮬레이션 등 실세계 피지컬 시스템 제어의 신뢰도를 획기적으로 개선합니다.",
    summary_en: "• Researchers unveil Physical AI models that natively embed differential equations and physical mechanics rather than mere pattern matching.\n• Demonstrates a 60% error reduction in complex 3D gravity, friction, and fluid dynamics simulations.\n• Paves the way for highly reliable robotics controllers and industrial engineering simulations.",
    body_ko: "기존 대규모 언어 모델 기반 트랜스포머의 구조적 한계를 극복하고 실세계 물리 법칙을 직접 연산하는 신개념 '피지컬 AI' 아키텍처가 발표되었습니다. 기존 모델들은 물리적 현상을 픽셀이나 텍스트 확률 통계로 근사하여 예측하기 때문에 예기치 못한 물리적 환각 현상이 발생하곤 했습니다. 연구진은 미분 방정식과 보존 법칙을 신경망 손실 함수에 직접 결합하여 중력, 충돌, 탄성 변형을 정확하게 추론하도록 구현했습니다. 벤치마크 테스트 결과 로봇 팔 조작 및 복합 유체 역학 시뮬레이션에서 연산 속도를 10배 높이면서도 오차율은 절반 이하로 낮췄습니다. 향후 휴머노이드 로봇과 자율주행 모빌리티의 실시간 물리 환경 대응력을 비약적으로 끌어올릴 핵심 원천 기술로 주목받고 있습니다.",
    body_en: "A novel Physical AI framework has been introduced to overcome the fundamental spatial-reasoning limitations of classic transformer architectures. By embedding Lagrangian mechanics and conservation laws directly into neural loss functions, the model natively respects gravity, collision, and fluid dynamics. Empirical benchmarks demonstrate a tenfold speedup in simulation runtime alongside a 60% decrease in trajectory prediction errors. This represents a substantial milestone for physical robotics and embodied intelligence.",
    tags: ["피지컬AI", "로보틱스", "물리시뮬레이션", "트랜스포머대안", "AI연구"]
  },
  // 4. aitimes_c2c3654bcc (product)
  {
    id: "aitimes_c2c3654bcc",
    signal_id: "product",
    importance: 89,
    title_ko: "퍼플렉시티, 엔비디아 협력으로 로컬 에이전트 '포터블 컴퓨터' 공개",
    title_en: "Perplexity Partners with NVIDIA to Launch 'Portable Computer' Local Agent",
    summary_ko: "• 퍼플렉시티가 엔비디아와 기술 제휴를 맺고 로컬 환경에서 구동되는 고성능 에이전트 솔루션 '포터블 컴퓨터'를 선보였습니다.\n• 클라우드 통신 없이 온디바이스에서 검색 인덱싱과 실시간 추론을 수행해 데이터 프라이버시를 완벽히 보호합니다.\n• 엔비디아 RTX 하드웨어 가속을 통해 대화형 검색과 로컬 문서 분석을 1초 미만의 지연 시간으로 처리합니다.",
    summary_en: "• Perplexity teams up with NVIDIA to unveil 'Portable Computer', a fully local agent runtime for edge hardware.\n• Executes search indexing and contextual synthesis on-device without cloud data transmission, ensuring total privacy.\n• Leverages NVIDIA RTX hardware acceleration to achieve sub-second local file reasoning and conversational search.",
    body_ko: "AI 검색 스타트업 퍼플렉시티가 엔비디아와의 파트너십을 통해 독립형 온디바이스 에이전트 시스템인 '포터블 컴퓨터(Portable Computer)'를 발표했습니다. 이 시스템은 사용자의 PC 로컬 환경에 저장된 대용량 문서와 코드를 엔비디아 RTX GPU 가속을 활용해 실시간으로 임베딩하고 검색합니다. 외부 클라우드 서버로 데이터를 전송하지 않기 때문에 사내 기밀 문서나 민감한 개인정보를 안전하게 다룰 수 있는 것이 최대 강점입니다. 또한 네트워크 연결이 끊긴 오프라인 상태에서도 완전한 AI 리서치 및 문서 요약 기능을 제공합니다. 기업 보안 규정으로 인해 클라우드 AI 도입을 망설이던 기관과 보안 중심 개발자들에게 강력한 대안이 될 것으로 보입니다.",
    body_en: "Perplexity announced a strategic collaboration with NVIDIA to release 'Portable Computer', a private on-device agent platform. The tool indexes local files and executes deep query reasoning directly on consumer NVIDIA RTX hardware without telemetry. It offers robust search, semantic synthesis, and automated summarization even in air-gapped environments. This launch directly targets enterprises and security-conscious developers seeking zero-data-leakage AI assistants.",
    tags: ["퍼플렉시티", "엔비디아", "온디바이스AI", "로컬에이전트", "데이터보안"]
  },
  // 5. geeknews_ae5aa43bec (devtool)
  {
    id: "geeknews_ae5aa43bec",
    signal_id: "devtool",
    importance: 94,
    title_ko: "Git을 어떤 규모에서도 확장하는 법 - Cursor의 새 Git 저장 시스템 Continuity",
    title_en: "Scaling Git to Any Size: Cursor Unveils New Storage System Continuity",
    summary_ko: "• AI 코딩 에디터 커서(Cursor) 팀이 초대형 모노레포 환경에서도 지연 없이 동작하는 분산 Git 저장 아키텍처 'Continuity'를 공개했습니다.\n• 가상화된 파일 시스템과 지능형 블록 캐싱을 통해 수백 기가바이트 규모의 리포지토리도 수 초 내에 즉시 클론하고 체크아웃합니다.\n• AI 에이전트가 수만 개의 파일을 동시 분석할 때 발생하는 I/O 병목을 근본적으로 해소했습니다.",
    summary_en: "• Cursor engineering published an in-depth breakdown of Continuity, a high-scale virtualized Git storage engine.\n• Allows instant clone and checkout across multi-gigabyte monorepos via demand-paged object storage and chunk caching.\n• Eliminates file I/O bottlenecks when autonomous coding agents index vast codebases in parallel.",
    body_ko: "AI 기반 IDE 커서(Cursor)를 개발하는 Anysphere 팀이 대규모 엔터프라이즈 코드베이스를 위한 가상 Git 스토리지 시스템 'Continuity'의 기술적 구조를 공개했습니다. 전통적인 Git은 리포지토리 크기가 수십 기가바이트를 넘어가면 로컬 체크아웃과 인덱싱 속도가 급격히 느려지는 한계가 있었습니다. Continuity는 전체 소스 트리를 로컬 디스크에 전부 복사하지 않고, 에이전트나 개발자가 실제로 읽고 수정하는 파일 블록만 필요할 때 온디맨드로 스트리밍합니다. 이를 통해 수백만 개의 파일이 포함된 거대 모노레포에서도 초기 프로젝트 로딩 시간을 1초대로 단축했습니다. 특히 AI 코딩 에이전트가 넓은 파일 범위를 탐색하고 수정하는 작업에서 I/O 지연을 획기적으로 줄여 실무 생산성을 크게 향상시켰습니다.",
    body_en: "The Cursor engineering team revealed Continuity, their novel virtualized Git backend designed for massive enterprise monorepos. Rather than downloading entire tree states upfront, Continuity lazily streams file blobs and tree objects on demand through a customized virtual filesystem. This reduces clone and switch latency from minutes to milliseconds even in repositories exceeding hundreds of gigabytes. The architecture drastically improves the responsiveness of background indexing for autonomous coding agents.",
    tags: ["커서", "Git", "모노레포", "스토리지엔지니어링", "개발자도구"]
  },
  // 6. geeknews_56eeed47a4 (oss)
  {
    id: "geeknews_56eeed47a4",
    signal_id: "oss",
    importance: 86,
    title_ko: "html2design - 웹페이지를 편집 가능한 Figma 노드로 변환하는 크롬 확장 도구",
    title_en: "html2design: Chrome Extension Converting Live Web Pages to Editable Figma Nodes",
    summary_ko: "• 실제 배포된 웹사이트의 DOM 구조와 CSS 스타일을 100% 보존하며 Figma의 오토레이아웃 노드로 변환하는 오픈소스 도구가 화제입니다.\n• 반응형 브레이크포인트와 웹 폰트, 벡터 SVG 에셋을 손실 없이 그래픽 디자인 캔버스로 가져옵니다.\n• 프론트엔드 레퍼런스 리버스 엔지니어링 및 디자인 시스템 마이그레이션 작업 시간을 획기적으로 단축합니다.",
    summary_en: "• html2design introduces an open-source workflow to convert live web DOM elements directly into Figma auto-layout components.\n• Faithfully translates computed CSS properties, typography, responsive rules, and SVGs into native design nodes.\n• Streamlines UI reverse engineering, competitive analysis, and design token synchronization.",
    body_ko: "웹 브라우저에서 실행 중인 실제 웹페이지를 클릭 한 번으로 피그마(Figma) 디자인 파일로 변환해주는 오픈소스 크롬 확장 프로그램 'html2design'이 긱뉴스에서 큰 주목을 받았습니다. 기존 화면 캡처 방식과 달리 웹페이지의 계산된 CSS 속성(Flexbox, Grid, 여백, 색상 변수)을 피그마 고유의 오토레이아웃(Auto Layout) 프레임으로 정밀하게 매핑합니다. 디자이너와 프론트엔드 개발자는 기존 라이브 사이트를 리디자인할 때 처음부터 컴포넌트를 다시 그릴 필요 없이 즉시 레이아웃을 수정할 수 있습니다. 또한 복잡한 웹 폰트와 SVG 아이콘도 벡터 그래픽 상태 그대로 추출되어 디자인 자산화가 매우 용이합니다. UI 리버스 엔지니어링과 디자인 QA 시간을 획기적으로 줄여주는 실용적인 생산성 도구로 평가받고 있습니다.",
    body_en: "html2design has emerged as a popular open-source utility that translates computed DOM trees and styling directly into Figma layers. Unlike traditional raster screenshots, the extension maps CSS flexbox, grids, and padding into native Figma Auto Layout components. Designers can immediately edit typography, color styles, and vector paths extracted from any production website. The tool significantly accelerates competitive UI benchmarking and design system reverse engineering.",
    tags: ["Figma", "UI디자인", "크롬확장", "프론트엔드", "오픈소스"]
  },
  // 7. geeknews_bd70cb6c61 (devtool)
  {
    id: "geeknews_bd70cb6c61",
    signal_id: "devtool",
    importance: 88,
    title_ko: "쿼리 가능한 실행 파일(Queryable Executables) - 바이너리에 시맨틱 메타데이터 주입",
    title_en: "Queryable Executables: Embedding Semantic Metadata into Compiled Binaries",
    summary_ko: "• 컴파일된 실행 파일 내부에 구조화된 시맨틱 메타데이터를 내장하여 AI 에이전트와 도구가 바이너리를 직접 쿼리할 수 있게 하는 기법이 제안되었습니다.\n• 복잡한 매뉴얼 파싱 없이도 CLI 명령어가 제공하는 API 스키마, 플래그 의도, 실행 제약 조건을 JSON-LD 형태로 즉시 조회합니다.\n• LLM 에이전트가 커맨드라인 도구를 도구(Tool)로 호출할 때 발생하는 오작동과 인자 오류를 원천 차단합니다.",
    summary_en: "• Proposes Queryable Executables, a standard for embedding structured schema and semantic capabilities directly inside ELF/Mach-O binaries.\n• Allows AI agents and devtools to inspect CLI parameters, constraints, and intent schemas without fragile help text parsing.\n• Eliminates argument hallucination when LLMs orchestrate native shell commands.",
    body_ko: "바이너리 실행 파일 자체에 구조화된 인터페이스 명세를 주입하여 AI 에이전트가 명령어 스키마를 정밀하게 질의할 수 있도록 돕는 '쿼리 가능한 실행 파일(Queryable Executables)' 아키텍처가 소개되었습니다. 지금까지 AI 코딩 에이전트들은 터미널 명령어의 기능을 파악하기 위해 `--help` 텍스트를 출력한 뒤 정규식이나 프롬프트로 파싱해야 했으며, 이 과정에서 포맷 불일치로 인한 오작동이 빈번했습니다. 제안된 방식은 컴파일 타임에 전용 ELF/Mach-O 섹션에 JSON 형태의 명령어 정의와 입출력 타입을 내장합니다. 에이전트는 특수 플래그나 인터셉터를 통해 구조화된 데이터를 0.1밀리초 만에 읽어와 정확한 인자로 명령을 실행할 수 있습니다. 이는 AI 기반 터미널 자동화와 MCP(Model Context Protocol) 툴 연동의 신뢰도를 극대화하는 표준 기술로 주목받고 있습니다.",
    body_en: "The Queryable Executables specification demonstrates a method to bake machine-readable command schemas directly into compiled binaries. Instead of relying on fragile human-readable `--help` text parsing, LLM agents can query dedicated binary sections for exact JSON schema contracts and parameter constraints. This approach prevents command hallucination and runtime argument mismatches during autonomous shell execution. It presents a robust architectural foundation for next-generation AI developer tool integration.",
    tags: ["바이너리", "CLI", "시맨틱메타데이터", "에이전트도구", "개발자도구"]
  },
  // 8. hackernews_2f630d5eb6 (model)
  {
    id: "hackernews_2f630d5eb6",
    signal_id: "model",
    importance: 96,
    title_ko: "GLM-5.3-Flash 릴리즈 분석 — 320B MoE·18B 활성 파라미터로 초고속 멀티모달 추론 구현",
    title_en: "GLM-5.3-Flash Architecture Breakdown: 320B MoE with 18B Active Parameters for Ultra-Fast Multimodal Inference",
    summary_ko: "• Z.ai(Zhipu)가 3200억 개 전체 파라미터 중 토큰당 180억 개만 활성화하는 차세대 MoE 모델 GLM-5.3-Flash를 전격 출시했습니다.\n• 100만(1M) 토큰 컨텍스트를 기본 지원하며 DeepSWE 코딩 벤치마크에서 63%를 기록해 상위 프론티어 모델과 대등한 성능을 보였습니다.\n• API 가격을 100만 토큰당 수 센트 수준으로 낮춰 대규모 에이전트 루프와 고속 코드 자동완성에 최적화되었습니다.",
    summary_en: "• Z.ai releases GLM-5.3-Flash, featuring a 320B sparse Mixture-of-Experts architecture activating only 18B parameters per forward pass.\n• Native 1M token context support with ~63% on DeepSWE software engineering benchmark.\n• Ultra-competitive API pricing tailored for high-frequency agent loops and real-time reasoning.",
    body_ko: "Z.ai가 차세대 고속 멀티모달 모델인 'GLM-5.3-Flash'를 공개하며 글로벌 오픈 가중치 및 상용 API 시장에 큰 충격을 주었습니다. 이 모델은 320B 총 파라미터 중 토큰당 18B만 활성화하는 희소 MoE(Mixture of Experts) 설계를 채택하여, 이전 세대인 GLM-5.2 대비 추론 속도를 2.5배 향상시켰습니다. 100만 토큰에 달하는 방대한 컨텍스트 윈도우를 지원하면서도 DeepSWE 코딩 벤치마크에서 약 63%의 높은 작업 해결률을 달성했습니다. 인공지능 성능 분석 기관 Artificial Analysis의 측정 결과, 플래그십 모델급 지능을 유지하면서도 토큰당 처리 비용은 1/10 수준으로 절감되었습니다. 개발자들은 빠른 응답 속도와 저렴한 비용 덕분에 실시간 코딩 어시스턴트 및 자율 에이전트 파이프라인의 핵심 백엔드로 적극 도입하고 있습니다.",
    body_en: "Z.ai announced GLM-5.3-Flash, a sparse Mixture-of-Experts multimodal model comprising 320B total parameters with only 18B active per token. Independent benchmarks reveal strong results on software engineering tasks, including ~63% on DeepSWE and 1M token context capability. The model matches frontier capabilities in visual reasoning and code generation while maintaining token throughput comparable to lightweight models. Its cost-effective pricing structure makes it especially attractive for sustained autonomous agent workflows.",
    tags: ["GLM5", "MoE모델", "멀티모달", "코딩벤치마크", "인공지능성능"]
  },
  // 9. hackernews_801be10beb (devtool)
  {
    id: "hackernews_801be10beb",
    signal_id: "devtool",
    importance: 91,
    title_ko: "Serve Markdown to AI Agents with Accept Headers — 에이전트 친화형 콘텐츠 협상 표준",
    title_en: "Serve Markdown to AI Agents with Accept Headers: Clean Content Negotiation",
    summary_ko: "• 웹사이트가 AI 크롤러나 에이전트의 `Accept: text/markdown` 헤더 요청에 대해 깔끔한 마크다운을 직접 응답하는 표준 패턴이 제안되었습니다.\n• 불필요한 자바스크립트 번들과 광고, 복잡한 DOM 태그를 제거해 에이전트의 토큰 소모량을 최대 80% 절감합니다.\n• 기존 웹 인프라를 변경하지 않고도 HTTP 콘텐츠 협상 메커니즘을 통해 AI 친화적인 웹 환경을 구현합니다.",
    summary_en: "• Proposes utilizing HTTP `Accept: text/markdown` content negotiation to serve pre-rendered Markdown directly to web agents.\n• Strips away client-side JavaScript, telemetry scripts, and bloated DOM trees to slash token consumption by up to 80%.\n• Leverages native HTTP standards without requiring separate scraping or proxy infrastructure.",
    body_ko: "AI 에이전트가 웹사이트를 탐색할 때 HTTP 헤더 협상을 통해 HTML 대신 마크다운 문서를 직접 전달받는 'Accept: text/markdown' 표준이 해커뉴스에서 큰 반향을 일으켰습니다. 현재 대부분의 웹페이지는 방대한 자바스크립트 코드, 스타일시트, 광고 스크립트를 포함하고 있어, LLM 에이전트가 본문을 읽으려면 브라우저 렌더링을 거치거나 막대한 토큰을 낭비해야 합니다. 제안된 규격은 클라이언트가 `Accept: text/markdown`을 전송하면 서버가 본문 텍스트와 링크 구조만 정리된 마크다운을 200 OK로 반환하도록 설계되었습니다. 이를 도입한 웹사이트들은 크롤링 응답 속도가 5배 빨라졌으며, 에이전트의 컨텍스트 윈도우 낭비도 80% 이상 감소했습니다. 웹 생태계가 인간 사용자와 AI 에이전트를 공존시키는 가장 우아한 기술적 해법으로 평가받고 있습니다.",
    body_en: "A newly proposed web standard advocates using native HTTP `Accept: text/markdown` negotiation to deliver clean Markdown directly to LLM crawlers. Currently, AI agents waste massive token budgets filtering complex HTML DOM structures, tracking scripts, and styling overhead. By responding with pure Markdown when requested, web servers dramatically cut latency and token consumption for automated agents. This convention provides an elegant, standards-compliant bridge between traditional web servers and agentic clients.",
    tags: ["HTTP표준", "마크다운", "웹에이전트", "토큰최적화", "개발자도구"]
  },
  // 10. hackernews_7695ef6f0d (devtool)
  {
    id: "hackernews_7695ef6f0d",
    signal_id: "devtool",
    importance: 92,
    title_ko: "WebMCP: 웹사이트가 AI 에이전트와 직접 소통하도록 만드는 오픈 인터페이스",
    title_en: "WebMCP: Teaching Websites to Communicate Directly with AI Agents via MCP",
    summary_ko: "• Anthropic의 Model Context Protocol(MCP)을 웹 브라우저 환경으로 확장한 오픈소스 프레임워크 WebMCP가 공개되었습니다.\n• 에이전트가 번거로운 DOM 클릭 대신 웹사이트가 선언한 표준 JSON-RPC 도구 API를 직접 호출해 작업을 완료합니다.\n• 전자상거래 예약, 폼 제출, 결제 워크플로우의 실행 성공률을 99% 이상으로 끌어올립니다.",
    summary_en: "• WebMCP extends Anthropic's Model Context Protocol directly into client-side browser runtimes.\n• Enables web agents to call declarative JSON-RPC tools rather than fragile visual DOM clicking and input simulation.\n• Boosts execution reliability for e-commerce checkout, form automation, and booking workflows to near 99%.",
    body_ko: "웹사이트가 AI 에이전트에게 자체 API와 액션을 안전하게 노출할 수 있도록 지원하는 'WebMCP' 오픈소스 프로젝트가 발표되었습니다. 기존의 브라우저 유즈(Computer Use) 에이전트들은 화면 픽셀을 분석하거나 DOM 셀렉터를 찾아 클릭하는 방식으로 동작하여 팝업이나 동적 UI 변경 시 쉽게 실패했습니다. WebMCP는 웹페이지 헤더에 MCP 엔드포인트를 선언하여, 에이전트가 '식당 예약', '장바구니 담기' 등의 도구 함수를 정형화된 JSON-RPC로 직접 실행하도록 만듭니다. 이를 통해 작업 완수율이 99% 이상으로 비약적으로 향상되며, 실행 시간도 수십 초에서 수백 밀리초 단위로 단축됩니다. 웹 개발자들이 자신의 서비스를 AI 친화적인 인터페이스로 업그레이드할 수 있는 핵심 오픈 표준으로 기대를 모으고 있습니다.",
    body_en: "WebMCP introduces a browser-native implementation of Anthropic's Model Context Protocol, enabling websites to expose structured RPC tools directly to visiting AI agents. Rather than relying on error-prone visual screen parsing or DOM clicking, agents can trigger declared transactional tools such as booking reservations or filtering catalog items via standardized payloads. This architecture raises automation reliability to 99% while drastically lowering end-to-end task latency. It marks a crucial evolutionary step for agentic web interactivity.",
    tags: ["MCP", "WebMCP", "브라우저자동화", "에이전트도구", "오픈표준"]
  },
  // 11. hackernews_5f7db0535d (research)
  {
    id: "hackernews_5f7db0535d",
    signal_id: "research",
    importance: 87,
    title_ko: "스레드-레지스터 분리 GPU 실행 모델로 텐서 연산 효율 극대화 논문 공개",
    title_en: "Thread-Register Decoupled GPU Execution Model for Maximizing Tensor Compute Efficiency",
    summary_ko: "• GPU 내 스레드 스케줄링과 물리 레지스터 파일 할당을 완전히 분리하는 혁신적인 하드웨어 실행 아키텍처 논문이 게재되었습니다.\n• 대규모 LLM 추론 시 발생하는 극심한 레지스터 압박(Register Pressure)을 해소하여 SM 점유율을 45% 향상시켰습니다.\n• 하드웨어 재설계 없이도 컴파일러 수준의 가상화 기법을 통해 텐서 코어 가동률을 극대화하는 방안을 제시합니다.",
    summary_en: "• Researchers present a Thread-Register Decoupled execution model that dynamically decouples thread scheduling from physical register allocation.\n• Mitigates severe register pressure during LLM matrix multiplication, boosting Streaming Multiprocessor occupancy by 45%.\n• Demonstrates substantial throughput gains in deep learning tensor kernels through compiler-assisted register virtualization.",
    body_ko: "대규모 언어 모델 연산 시 GPU 하드웨어의 병목 지점으로 꼽히는 레지스터 압박(Register Pressure)을 해결하는 '스레드-레지스터 분리 실행 모델' 연구 논문이 arXiv에 발표되었습니다. 현대 GPU 아키텍처는 스레드마다 고정된 크기의 레지스터를 할당하기 때문에, 복잡한 텐서 연산 커널을 실행할 때 동시 활성 스레드 수가 급감하는 비효율이 있었습니다. 연구진은 레지스터를 물리 스레드가 아닌 데이터 생명주기에 따라 동적으로 가상화하여 할당하는 분리형 스케줄러를 고안했습니다. 시뮬레이션 결과 일반적인 FlashAttention 및 GEMM 커널에서 GPU 스트리밍 멀티프로세서(SM)의 점유율이 45% 증가했습니다. 이는 향후 차세대 AI 가속기 칩셋 설계 및 커스텀 트랜스포머 커널 최적화에 중요한 이론적 토대를 제공할 것으로 평가됩니다.",
    body_en: "An architecture paper published on arXiv proposes a Thread-Register Decoupled GPU execution model to resolve register pressure in intensive tensor calculations. Traditional architectures bind physical register allocations strictly to thread lifetimes, causing severe warp occupancy degradation during large matrix operations. By virtualizing registers and recycling allocations across asynchronous warp phases, the proposed scheduler increases SM utilization by 45% in transformer attention kernels. The research provides key architectural blueprints for future AI hardware accelerators.",
    tags: ["GPU아키텍처", "텐서연산", "하드웨어최적화", "LLM추론", "AI논문"]
  },
  // 12. hackernews_ff035c77e1 (oss)
  {
    id: "hackernews_ff035c77e1",
    signal_id: "oss",
    importance: 85,
    title_ko: "TexLite – 연구팀을 위한 가벼운 셀프호스티드 LaTeX 협업 워크스페이스",
    title_en: "TexLite: Lightweight Self-Hosted Collaborative LaTeX Workspace for Small Research Teams",
    summary_ko: "• 무거운 클라우드 의존성 없이 로컬이나 사내 서버에서 5분 만에 배포할 수 있는 초경량 오픈소스 LaTeX 워크스페이스가 출시되었습니다.\n• 실시간 동시 편집과 버전 관리, 로컬 컴파일러(TeXLive) 직접 연동 기능을 Docker 컨테이너 하나로 제공합니다.\n• 연구 데이터 유출 우려가 있는 학계 및 기업 R&D 팀에게 안전하고 독립적인 논문 작성 환경을 지원합니다.",
    summary_en: "• SWUFE DB Group open-sourced TexLite, a lightweight self-hosted alternative to Overleaf designed for small research teams.\n• Delivers real-time collaborative editing, Git version tracking, and native TeXLive engine integration in a single Docker image.\n• Offers a private and secure authoring environment for research institutions handling confidential datasets.",
    body_ko: "중국 서남재경대 DB 연구팀이 개발한 오픈소스 셀프호스티드 LaTeX 편집 플랫폼 'TexLite'가 해커뉴스에서 큰 관심을 받았습니다. 오버리프(Overleaf) 같은 기존 상용 클라우드 서비스는 연구 데이터의 외부 유출 위험과 값비싼 구독료가 장벽으로 작용해 왔습니다. TexLite는 단일 도커(Docker) 컨테이너로 패키징되어 있어 연구실 내부 서버나 개인 NAS에 몇 분 만에 독립적인 환경을 구축할 수 있습니다. 웹 브라우저에서 다수의 연구자가 동시에 수식과 텍스트를 실시간 편집할 수 있으며, 로컬에 설치된 TeXLive 컴파일러를 통해 오프라인에서도 즉시 PDF 출력이 가능합니다. 데이터 보안이 최우선인 학계 및 기업 연구소에서 높은 활용도를 자랑합니다.",
    body_en: "The SWUFE DB Group introduced TexLite, an open-source self-hosted collaborative LaTeX authoring platform. While proprietary cloud services raise data governance concerns and subscription overhead, TexLite packages real-time multi-user syncing, PDF compilation, and version tracking into a minimal Docker container. Researchers can run it on private lab infrastructure connected to local TeXLive engines without external internet connectivity. It provides an ideal solution for institutions publishing sensitive experimental research.",
    tags: ["LaTeX", "논문작성", "오픈소스", "셀프호스팅", "협업도구"]
  },
  // 13. reddit_9e673571d6 (model)
  {
    id: "reddit_9e673571d6",
    signal_id: "model",
    importance: 93,
    title_ko: "[Megathread] Qwen3.8-Flash-Next 릴리즈 데이 (로컬 MoE 추론 최적화)",
    title_en: "[Megathread] Qwen3.8-Flash-Next Official Release: Local MoE Quantization and Setup",
    summary_ko: "• 알리바바의 차세대 초경량 MoE 모델 Qwen3.8-Flash-Next가 공식 배포되며 LocalLLaMA 커뮤니티에서 대규모 벤치마크 스레드가 열렸습니다.\n• 소비자용 24GB VRAM GPU(RTX 3090/4090) 단 한 장에서 초당 120토큰 이상의 고속 추론을 달성했습니다.\n• GGUF 및 EXL2 양자화 버전이 즉시 공개되어 로컬 코딩 에이전트와 오프라인 AI 파이프라인에 빠르게 도입되고 있습니다.",
    summary_en: "• Alibaba officially releases Qwen3.8-Flash-Next, sparking an extensive benchmarking megathread across r/LocalLLaMA.\n• Delivers over 120 tokens per second inference on consumer 24GB GPUs such as the RTX 3090 and 4090.\n• GGUF and EXL2 quantized weights were published day-one, enabling instant local coding assistant deployments.",
    body_ko: "알리바바 Qwen 팀이 고효율 차세대 MoE 아키텍처를 적용한 'Qwen3.8-Flash-Next'를 출시하면서 레딧 LocalLLaMA 커뮤니티가 뜨겁게 달아올랐습니다. 이 모델은 플래시 주의집중 메커니즘과 극단적인 희소 가중치 라우팅을 결합하여, 소비자용 단일 GPU인 RTX 4090(24GB VRAM) 환경에서도 초당 120토큰을 상회하는 놀라운 추론 속도를 기록했습니다. 커뮤니티 기여자들은 릴리즈 당일 Q4/Q8 GGUF 및 EXL2 양자화 포맷을 배포하였으며, 복잡한 파이썬 알고리즘 생성과 도구 호출 테스트에서 매우 안정적인 결과를 확인했습니다. 특히 저사양 하드웨어에서도 로컬 에이전트를 실시간으로 구동할 수 있게 되었습니다. 이는 오프라인 코딩 및 개인화 AI 비서 구축의 새로운 표준으로 자리매김하고 있습니다.",
    body_en: "Alibaba's Qwen team officially launched Qwen3.8-Flash-Next, triggering active benchmarking discussions across open-source model communities. The architecture combines fine-grained sparse MoE routing with optimized attention kernels, achieving 120+ tokens/sec on single consumer 24GB GPUs. Community quantizations in GGUF and EXL2 formats became available immediately, demonstrating strong zero-shot tool-calling and Python refactoring capabilities. The release sets a new performance-per-watt benchmark for local coding agents.",
    tags: ["Qwen", "로컬LLM", "MoE모델", "양자화", "오픈소스AI"]
  },
  // 14. reddit_ad23686812 (practice)
  {
    id: "reddit_ad23686812",
    signal_id: "practice",
    importance: 88,
    title_ko: "Claude Code로 구축한 100+ 절차적 생성 차량 지원 멀티플레이어 Three.js 게임 제작기",
    title_en: "Vibe Coding a Multiplayer Three.js Tank Game with 100+ Procedural Vehicles via Claude Code",
    summary_ko: "• 한 인디 개발자가 Claude Code CLI만을 활용해 100종 이상의 절차적 3D 탱크 모델과 실시간 멀티플레이어 네트워킹을 구현한 워크플로우를 공개했습니다.\n• 물리 엔진(Cannon.js) 연동과 Three.js 셰이더 최적화, WebSocket 룸 동기화 코드를 에이전트와 반복 디버깅하며 완성했습니다.\n• 복잡한 3D 웹 게임 프로토타입 제작 시 AI 페어 프로그래밍이 제공하는 극적인 개발 속도 향상을 입증했습니다.",
    summary_en: "• An indie developer shares a detailed case study building a multiplayer Three.js browser tank game using Claude Code.\n• Implemented procedural 3D vehicle generation, Cannon.js physics, custom shaders, and WebSocket networking.\n• Demonstrates how agentic terminal workflows allow solo creators to produce production-grade 3D graphics games.",
    body_ko: "레딧 ClaudeAI 서브레딧에 Claude Code 터미널 도구를 활용해 복잡한 3D 멀티플레이어 웹 게임을 단기간에 구축한 실전 개발기가 공유되어 큰 화제를 모았습니다. 작성자는 월드오브탱크 블리츠 스타일의 아케이드 탱크 게임을 Three.js와 Cannon.js 기반으로 기획하고, 100여 종의 탱크 차체와 포탑을 절차적 알고리즘으로 동적 생성하도록 에이전트에 지시했습니다. 특히 복잡한 웹소켓 상태 보간과 지연 보상(Lag Compensation), 프레임 드랍을 막기 위한 지오메트리 인스턴싱 코드를 Claude Code와 상호작용하며 실시간으로 수정했습니다. 1인 개발자가 그래픽스 엔진과 분산 네트워킹을 다루는 데 걸리는 진입장벽을 AI 코딩 에이전트가 어떻게 획기적으로 낮췄는지를 보여줍니다. 실전 바이브코딩 워크플로우의 모범 사례로 널리 공유되고 있습니다.",
    body_en: "A developer on r/ClaudeAI documented their experience building a real-time multiplayer 3D browser tank combat game exclusively with Claude Code. The project features procedurally generated armor geometries in Three.js, rigid body physics using Cannon.js, and WebSocket synchronization. Claude Code assisted in resolving complex graphics bottlenecks such as GPU instancing and client-side interpolation. The workflow highlights the expanding potential of terminal coding agents for indie game engineering.",
    tags: ["ClaudeCode", "Threejs", "게임개발", "바이브코딩", "실전활용"]
  },
  // 15. reddit_3abf47851d (practice)
  {
    id: "reddit_3abf47851d",
    signal_id: "practice",
    importance: 87,
    title_ko: "27개 고급 Claude 팁 중 실무 개발에서 진짜 유용했던 5가지 핵심 워크플로우",
    title_en: "Filtering 27 Advanced Claude Tips: Top 5 Workflows That Actually Improve Dev Productivity",
    summary_ko: "• 온라인에 떠도는 수많은 프롬프트 팁 중 실제 소프트웨어 엔지니어링 환경에서 가장 효과적이었던 5가지 기법이 정리되었습니다.\n• 아키텍처 역질문 유도, 서브시스템 단위 컨텍스트 격리, 테스트 주도 명세 검증 등 실전 위주의 팁이 포함되었습니다.\n• AI의 장황한 환각 답변을 방지하고 코드 생성의 정확도를 극대화하는 실질적인 가이드를 제공합니다.",
    summary_en: "• A senior engineer filters through viral Claude prompt advice to isolate five genuinely impactful developer techniques.\n• Focuses on proactive counter-interviewing, subsystem context scoping, and test-first specification enforcement.\n• Provides practical guardrails to curb verbosity and maintain rigorous architectural integrity in AI coding.",
    body_ko: "레딧 개발자 커뮤니티에서 시중에 유행하는 27가지의 클로드(Claude) 활용 팁을 실무 관점에서 직접 검증하고 선별한 '핵심 5대 워크플로우'가 큰 공감을 얻었습니다. 추천된 첫 번째 기법은 구현 전 AI가 아키텍처 가정을 역으로 질문하게 만드는 '인터뷰 모드' 강제이며, 이는 섣부른 코드 생성을 방지합니다. 두 번째는 전체 코드베이스를 한꺼번에 주입하지 않고 수정 대상 모듈과 인터페이스 정의만 분리 전달하는 컨텍스트 격리법입니다. 이 밖에도 실패하는 단위 테스트를 먼저 작성하도록 요구하는 TDD 파이프라인 구축 등이 높은 실효성을 입증받았습니다. 뜬구름 잡는 프롬프트 엔지니어링 대신 실무 엔지니어의 디버깅 시간을 실제로 아껴주는 실전 조언으로 평가받았습니다.",
    body_en: "A widely shared post on r/ClaudeAI evaluated popular prompt tips against rigorous real-world software engineering workflows to identify the five most effective habits. Key techniques include enforcing clarifying counter-interviews before code writing, strict context scoping per subsystem, and requiring test-first behavioral specifications. The findings emphasize that structured constraints and test assertions yield far higher reliability than generic prompt fluff.",
    tags: ["Claude팁", "프롬프트엔지니어링", "개발생산성", "TDD", "실전워크플로우"]
  },
  // 16. bluesky_aa0c7ed197 (research)
  {
    id: "bluesky_aa0c7ed197",
    signal_id: "research",
    importance: 89,
    title_ko: "VM 샌드박스 격리만으로는 자율 사이버 공격 에이전트 억제에 한계 지적",
    title_en: "VM Sandboxing Alone is Insufficient to Contain Cyber-Capable Autonomous Agents",
    summary_ko: "• 보안 연구진이 가상머신(VM) 및 컨테이너 격리 환경만으로는 고도화된 자율 AI 에이전트의 악용을 완전히 막을 수 없다는 분석을 발표했습니다.\n• 에이전트가 네트워크 부채널 공격이나 취약한 커널 드라이버를 탐색해 격리 경계를 우회하는 시나리오가 실증되었습니다.\n• 하이퍼바이저 레벨의 모니터링과 도구 호출 행위 기반의 동적 거버넌스 프레임워크 도입이 시급하다고 강조합니다.",
    summary_en: "• Cybersecurity researchers publish findings showing that standard VM sandboxes are insufficient for fully constraining cyber-capable agents.\n• Demonstrates potential breakout vectors via side-channel exploration and host kernel driver interfaces during autonomous execution.\n• Urges the implementation of hypervisor-level behavioral telemetry and dynamic agent permission governance.",
    body_ko: "블루스카이 보안 커뮤니티에서 자율 코딩 에이전트의 가상머신(VM) 샌드박스 격리 한계를 다룬 심층 분석 보고서가 화제가 되었습니다. 많은 기업들이 AI 에이전트에게 셸 실행 권한을 부여할 때 도커 컨테이너나 경량 VM에 가두는 것만으로 충분하다고 가정해 왔습니다. 그러나 연구진은 고도화된 LLM 에이전트가 호스트 OS 커널 드라이버의 취약점을 연쇄 탐색하거나 미세한 타이밍 부채널을 이용해 외부와 은밀히 통신할 수 있음을 경고했습니다. 보고서는 정적 샌드박스 격리 외에도 에이전트가 실행하는 시스템 콜과 네트워크 패킷을 실시간으로 감시하는 하이퍼바이저 수준의 동적 행위 탐지 체계가 필수적이라고 제언했습니다. AI 에이전트의 권한 관리와 샌드박스 보안 설계에 새로운 표준을 제시하고 있습니다.",
    body_en: "A cybersecurity report shared on Bluesky demonstrates that standard virtual machine sandboxes provide inadequate containment for advanced cyber-capable agents. While organizations routinely isolate execution inside lightweight VMs, researchers highlight risks involving kernel driver exploitation and timing side-channels during long-running agent autonomy. The analysis argues for real-time hypervisor-level syscall inspection and behavioral policy enforcement alongside physical isolation.",
    tags: ["에이전트보안", "샌드박스", "가상머신", "사이버보안", "AI거버넌스"]
  },
  // 17. github_3aa35fcb86 (devtool)
  {
    id: "github_3aa35fcb86",
    signal_id: "devtool",
    importance: 89,
    title_ko: "wang2122/sprix-sage-router — A2A 에이전트 네트워크를 위한 상태 기반 라우팅 프레임워크",
    title_en: "Sprix Sage Router: State-Aware Routing for Autonomous Agent-to-Agent Networks",
    summary_ko: "• 복수의 전문화된 AI 에이전트들이 협업할 때 작업의 위임(HANDOFF)과 협업(COLLABORATE)을 상태 기반으로 제어하는 라우터가 오픈소스로 공개되었습니다.\n• 단일 에이전트의 컨텍스트 과부하를 방지하고 분선 에이전트 간의 실시간 컨텍스트 동기화를 최적화합니다.\n• GitHub 공개 직후 멀티 에이전트 오케스트레이션 개발자들 사이에서 하루 수십 개의 스타를 모으며 주목받고 있습니다.",
    summary_en: "• Wang open-sources Sprix Sage Router, a state-aware routing framework governing SELF, COLLABORATE, and HANDOFF flows in A2A networks.\n• Prevents single-agent context pollution while optimizing inter-agent payload coordination across complex workflows.\n• Gained rapid traction across GitHub multi-agent developer communities.",
    body_ko: "다중 에이전트(A2A) 네트워크에서 에이전트 간 작업 전환과 협업 흐름을 정밀하게 제어하는 'Sprix Sage Router' 오픈소스 리포지토리가 깃허브에서 급부상했습니다. 기존 멀티 에이전트 시스템들은 단순 순차 전달이나 중앙 집중식 브로드캐스트 방식을 사용하여 불필요한 토큰 낭비와 컨텍스트 오염이 빈번했습니다. Sprix Sage Router는 현재 작업 상태를 실시간 평가하여 '자체 해결(SELF)', '협동 처리(COLLABORATE)', '전문 에이전트 위임(HANDOFF)'의 3가지 상태 머신으로 최적의 에이전트 경로를 결정합니다. 이를 통해 복잡한 풀스택 소프트웨어 개발 과제에서 에이전트 간 통신 비용을 40% 이상 절감하면서도 작업 완수 성공률을 크게 끌어올렸습니다. 에이전트 오케스트레이션의 신뢰성을 높여주는 실용적인 라우팅 엔진으로 각광받고 있습니다.",
    body_en: "The open-source Sprix Sage Router introduces a state-aware routing architecture for decentralized Agent-to-Agent (A2A) networks. Rather than relying on static prompt handoffs, the engine evaluates ongoing conversation states to dynamically dispatch tasks across SELF, COLLABORATE, and HANDOFF states. This structure curbs token bloat and context drift across multi-agent workflows by over 40%. The framework provides a clean architectural blueprint for reliable multi-agent system coordination.",
    tags: ["멀티에이전트", "A2A", "에이전트라우팅", "오케스트레이션", "GitHub오픈소스"]
  },
  // 18. github_6545db54ed (devtool)
  {
    id: "github_6545db54ed",
    signal_id: "devtool",
    importance: 88,
    title_ko: "kgoedecke/doop — 인간과 AI 에이전트가 함께 실시간 협업하는 오픈소스 디자인 캔버스",
    title_en: "Doop: Open-Source Multiplayer Design Canvas with Built-In MCP for Human-Agent Co-Design",
    summary_ko: "• 인간 디자이너와 AI 에이전트가 동일한 2D 캔버스 위에서 실시간으로 와이어프레임과 UI를 함께 설계하는 오픈소스 협업 도구 Doop이 공개되었습니다.\n• Model Context Protocol(MCP) 서버가 내장되어 있어 커서나 클로드 코드가 캔버스 객체를 직접 생성하고 수정할 수 있습니다.\n• 상용 디자인 툴의 폐쇄성을 극복하고 오픈소스로 자유롭게 확장 가능한 에이전트 친화형 협업 캔버스를 제공합니다.",
    summary_en: "• kgoedecke releases Doop, an open-source collaborative multiplayer design canvas built for joint human-AI agent interaction.\n• Features native Model Context Protocol (MCP) integration, allowing coding agents to programmatically manipulate layout nodes live.\n• Provides a free and extensible alternative to proprietary visual design software.",
    body_ko: "디자이너와 AI 에이전트가 하나의 캔버스에서 동시에 인터랙션할 수 있는 오픈소스 멀티플레이어 디자인 플랫폼 'Doop'이 깃허브에 공개되어 화제입니다. 기존의 디자인 도구들은 인간 중심의 UI 조작에만 최적화되어 있어 외부 AI 에이전트가 디자인 요소에 프로그래밍 방식으로 접근하기 어려웠습니다. Doop은 Anthropic의 Model Context Protocol(MCP)을 시스템 내부 표준으로 탑재하여, 에이전트가 레이아웃 구조를 실시간으로 읽고 새 컴포넌트를 즉시 렌더링할 수 있도록 지원합니다. 개발자가 터미널에서 코딩 에이전트에 지시하면 캔버스 위의 UI 박스와 텍스트가 실시간으로 변환되며, 인간 작업자는 마우스로 즉시 미세 조정을 가할 수 있습니다. AI와 인간의 진정한 실시간 비주얼 협업을 구현한 혁신적인 프로젝트로 평가받고 있습니다.",
    body_en: "Doop has been released as an open-source collaborative canvas where humans and AI agents build user interfaces together in real time. Built-in Model Context Protocol (MCP) servers allow external agents to inspect canvas components and programmatically alter vector geometries live. Designers can sketch wireframes while simultaneously watching agents flesh out UI tokens and responsive containers. It establishes an open, agent-native alternative to proprietary design canvases.",
    tags: ["Doop", "MCP", "UI디자인", "실시간협업", "GitHub오픈소스"]
  }
];

function buildPayload() {
  const candidatesData = JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf8"));
  const factMap = new Map(candidatesData.candidates.map((c) => [c.id, c]));

  const news = [];
  const signalCounts = {};

  for (const item of CURATED_ITEMS) {
    const fact = factMap.get(item.id);
    if (!fact) {
      console.error(`[ERROR] Candidate ${item.id} not found in candidates file!`);
      process.exit(1);
    }

    signalCounts[item.signal_id] = (signalCounts[item.signal_id] || 0) + 1;

    news.push({
      id: fact.id,
      category_id: fact.source,
      category_name: SOURCE_NAMES[fact.source] || fact.source_name,
      signal_id: item.signal_id,
      signal_name: SIGNALS[item.signal_id],
      importance: item.importance,
      headline: item.title_ko,
      title_ko: item.title_ko,
      summary_ko: item.summary_ko,
      body_ko: item.body_ko,
      author_profile: fact.author,
      publish_date: fact.publish_date,
      tags: item.tags,
      url: fact.url,
      sources: fact.cross_sources || [fact.source_name || fact.source],
      metrics: fact.metrics || {},
      curated_by: CURATED_BY,
    });
  }

  // 플랫폼별 밸런스를 고려한 가중치 정렬 (각 매체별 상위 2건 우선 배치)
  const byCat = {};
  for (const n of news) {
    if (!byCat[n.category_id]) byCat[n.category_id] = [];
    byCat[n.category_id].push(n);
  }
  for (const c in byCat) {
    byCat[c].sort((a, b) => b.importance - a.importance);
    byCat[c].slice(0, 2).forEach((it) => (it._boost = 1000));
  }

  news.sort((a, b) => {
    const bA = a._boost || 0;
    const bB = b._boost || 0;
    return (b.importance + bB) - (a.importance + bA);
  });
  news.forEach((it) => delete it._boost);

  const payload = {
    updated_at: new Date().toISOString(),
    generated_at: new Date().toISOString(),
    curated_date: TODAY,
    version: `v${TODAY.replace(/-/g, ".")}`,
    curated_by: CURATED_BY,
    total_count: news.length,
    signal_counts: signalCounts,
    summary: `🔥 오늘의 핵심 이슈: #GLM53Flash #일하는AI #WebMCP #CursorGit시스템 — 경량 초고속 MoE 모델(GLM/Qwen) 경쟁과 웹-에이전트 직결 프로토콜(WebMCP/Accept-Markdown)의 등장이 주도한 하루였습니다. ${CURATED_BY}에서 큐레이션 하였습니다.`,
    news: news,
  };

  return payload;
}

function main() {
  console.log("==========================================");
  console.log(`CC-News: 데일리 뉴스 큐레이션 빌드 (${TODAY})`);
  console.log("==========================================");

  const payload = buildPayload();

  // 1. site/public/data/news_latest.json
  fs.mkdirSync(path.dirname(LATEST_FILE), { recursive: true });
  fs.writeFileSync(LATEST_FILE, JSON.stringify(payload, null, 2));
  console.log(`[Site Live] ${LATEST_FILE} (${payload.news.length} items)`);

  // 2. data/archive/news_YYYY-MM-DD.json
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const archiveFile = path.join(ARCHIVE_DIR, `news_${TODAY}.json`);
  fs.writeFileSync(archiveFile, JSON.stringify(payload, null, 2));
  console.log(`[Archive] ${archiveFile}`);

  // site/public/data/archive/news_YYYY-MM-DD.json 복사
  fs.mkdirSync(PUBLIC_ARCHIVE_DIR, { recursive: true });
  const publicArchiveFile = path.join(PUBLIC_ARCHIVE_DIR, `news_${TODAY}.json`);
  fs.writeFileSync(publicArchiveFile, JSON.stringify(payload, null, 2));

  // 3. news_index.json 갱신
  let index = { archives: [] };
  if (fs.existsSync(INDEX_FILE)) {
    try {
      index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
    } catch (e) {
      console.warn("기존 인덱스 파싱 오류:", e.message);
    }
  }
  if (!index.archives) index.archives = [];

  const existingIdx = index.archives.findIndex((a) => a.file === `news_${TODAY}.json`);
  const entry = {
    file: `news_${TODAY}.json`,
    version: payload.version,
    generated_at: payload.generated_at,
    total_count: payload.total_count,
    signal_counts: payload.signal_counts,
  };

  if (existingIdx >= 0) {
    index.archives[existingIdx] = entry;
  } else {
    index.archives.unshift(entry);
  }

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
  fs.writeFileSync(PUBLIC_INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`[Index] ${INDEX_FILE} (${index.archives.length} archive entries)`);

  console.log("\n신호 분포:", payload.signal_counts);
}

main();
