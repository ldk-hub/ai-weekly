#!/usr/bin/env node
/**
 * curate_custom.js
 * Manual human-quality curation generator for 2026-08-25
 * Adheres strictly to the CC-News quality gate & rules.
 */

const fs = require("fs");
const path = require("path");

const TODAY = "2026-08-25";
const CURATED_BY = "ldk-hub";
const CANDIDATES_FILE = path.resolve(__dirname, "../../.tmp/news_candidates.json");
const LATEST_FILE = path.resolve(__dirname, "../../site/public/data/news_latest.json");
const ARCHIVE_FILE = path.resolve(__dirname, `../../data/archive/news_${TODAY}.json`);
const PUBLIC_ARCHIVE_FILE = path.resolve(__dirname, `../../site/public/data/archive/news_${TODAY}.json`);
const INDEX_FILE = path.resolve(__dirname, "../../data/archive/news_index.json");
const PUBLIC_INDEX_FILE = path.resolve(__dirname, "../../site/public/data/archive/news_index.json");

const candsData = JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf8"));
const candMap = new Map(candsData.candidates.map((c) => [c.id, c]));

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
  x: "X (Twitter)",
  threads: "Threads",
  web: "Web",
};

const curatedItems = [
  // --- GEEKNEWS (4건) ---
  {
    id: "geeknews_30e8a0d907",
    signal_id: "practice",
    importance: 85,
    title_ko: "AI 의존이 코딩 전문성의 성장 경로를 무너뜨릴 수 있다는 분석",
    title_en: "How AI Reliance May Disrupt the Traditional Path to Coding Expertise",
    summary_ko: "• AI 코딩 보조 도구의 과도한 사용이 주니어 개발자의 디버깅 능력과 멘탈 모델 형성을 저해할 수 있다는 분석이 제기되었습니다.\n• 복잡한 코드베이스의 근본 원리를 파악하는 훈련 없이 AI 완성에만 의존할 경우 문제 해결 역량 격차가 심화됩니다.\n• 개발 조직은 단순 생산성 지표 외에 주니어 엔지니어의 비판적 검증 훈련과 코드 리뷰 세션을 체계화해야 합니다.",
    summary_en: "• A technical analysis warns that over-reliance on AI coding tools hinders junior engineers from developing sound mental models.\n• Skipping fundamental debugging practice widens the gap between surface-level velocity and architectural problem-solving.\n• Engineering teams must cultivate critical code-verification routines alongside AI adoption.",
    body_ko: "최근 AI 코딩 도구의 대중화로 개발 속도는 비약적으로 향상되었으나 엔지니어의 성장 경로에 대한 우려가 커지고 있습니다. 초보 개발자가 코드베이스의 내부 동작 원리를 직접 추적하지 않고 AI가 생성한 패치를 무비판적으로 수용하는 경향이 관찰됩니다. 이러한 방식은 겉보기에는 빠른 결과물을 내지만 시스템 수준의 장애나 복잡한 동시성 문제를 해결하는 능력의 축적을 가로막습니다. 전문가들은 코드를 직접 작성하는 과정에서 겪는 실패와 디버깅 경험이 장기적인 엔지니어링 직관을 형성한다고 강조합니다. 따라서 AI 도구를 활용하더라도 생성된 로직에 대한 엄격한 코드 리뷰와 내부 아키텍처 학습을 병행해야 합니다.",
    body_en: "While AI-assisted coding tools deliver impressive initial productivity gains, concerns are rising over their impact on developer skill progression. Novice programmers increasingly accept generated code blocks without tracing execution flows or understanding deep structural nuances. This reliance can lead to brittle architectures that falter when edge-case runtime failures or concurrency deadlocks occur. Industry experts argue that the struggle of manual debugging and system tracing is vital for building enduring engineering intuition. Organizations must establish rigorous peer-review practices that ensure engineers comprehend and take ownership of AI-assisted code.",
    tags: ["개발문화", "코딩에이전트", "엔지니어링", "소프트웨어교육"]
  },
  {
    id: "geeknews_00a0b0f26f",
    signal_id: "product",
    importance: 82,
    title_ko: "Varkos — 게임 월드를 인식하고 자율 행동하는 스카이림 AI 동료 시스템",
    title_en: "Varkos: Context-Aware Autonomous AI Companion for Skyrim",
    summary_ko: "• 오픈월드 게임 스카이림의 메모리 상태와 3D 시야를 실시간 파악하여 행동하는 자율 AI 동료 Varkos가 공개되었습니다.\n• 단순한 텍스트 대화 스크립트를 넘어 플레이어의 전투 상황과 주변 환경 지형을 인식하여 주도적으로 상호작용합니다.\n• 게임 엔진 내부 훅과 로컬 경량 LLM 파이프라인을 결합하여 몰입감 높은 인터랙션을 제공합니다.",
    summary_en: "• Varkos, an autonomous AI companion system that inspects in-game memory and spatial context in Skyrim, has been unveiled.\n• It moves beyond static scripted dialogue by interpreting player combat states and environmental geometry in real time.\n• Integrates low-latency local LLM inference directly with native game engine memory hooks.",
    body_ko: "Varkos는 오픈월드 게임 스카이림(Skyrim) 내에서 플레이어와 유기적으로 협력하는 지능형 AI 동료 모드입니다. 기존의 정적 대화 트리 구조를 탈피하여 게임 엔진의 메모리와 시야각 데이터를 실시간으로 읽어 들입니다. 플레이어가 던전 탐험 중 위험에 처하면 상황에 맞는 전술적 주문을 시전하거나 주변 지형지물을 활용해 엄호합니다. 로컬에서 구동되는 고속 추론 파이프라인을 통해 지연 시간을 최소화하여 즉각적인 음성 반응을 이끌어냅니다. 게임 속 NPC가 단순한 배경 요소에서 벗어나 능동적인 에이전트로 진화하는 대표적인 사례입니다.",
    body_en: "Varkos is an advanced AI companion mod that introduces dynamic spatial and situational intelligence to Skyrim NPCs. By hooking directly into the game engine's memory space, it continuously reads environmental context and combat variables. The companion reacts proactively during battle, selecting complementary spells and taking tactical cover without explicit manual commands. A lightweight local inference pipeline maintains minimal response latency for conversational interactions. This project showcases the transition of gaming NPCs from rigid script runners into fully autonomous in-game agents.",
    tags: ["게임AI", "에이전트", "스카이림", "자율NPC", "로컬LLM"]
  },
  {
    id: "geeknews_1f6fc7664f",
    signal_id: "policy",
    importance: 78,
    title_ko: "MS 그림판과 사진 앱, 로컬 AI 생성 이미지에 서버 발급 GUID 워터마크 삽입",
    title_en: "MS Paint and Photos Embed Server-Issued GUID Watermarks in Local AI Images",
    summary_ko: "• 윈도우 기본 앱인 그림판과 사진 앱이 로컬 NPU로 생성한 AI 이미지에도 서버 발급 식별자(GUID)를 은닉 삽입하는 것으로 확인되었습니다.\n• 오프라인 로컬 생성 작업임에도 불구하고 마이크로소프트 서버와 통신하여 비가시적 워터마크 메타데이터를 발급받습니다.\n• AI 생성물의 출처 증명과 남용 방지를 위한 조치이나 로컬 프라이버시 침해 논란이 제기되고 있습니다.",
    summary_en: "• Windows built-in Paint and Photos apps were found to embed server-issued GUID watermarks even during local NPU image generation.\n• The workflow requests a unique tracking identifier from Microsoft servers despite local execution.\n• Highlights the ongoing debate between cryptographic provenance verification and local compute privacy.",
    body_ko: "마이크로소프트 윈도우 11의 기본 앱인 그림판(Paint)과 사진(Photos)이 로컬 AI 이미지 생성 시 서버 식별자를 삽입하는 메커니즘이 분석되었습니다. 사용자가 기기 내 NPU나 GPU를 이용해 이미지를 생성하더라도 마이크로소프트 인증 서버에 질의하여 GUID를 받아옵니다. 이 식별자는 비가시적 워터마크 형태로 픽셀 데이터와 메타데이터 영역에 기록되어 사후 진위 판별에 활용됩니다. C2PA 표준과 연계하여 AI 생성물의 무분별한 딥페이크 남용을 방지하려는 기술적 장치로 해석됩니다. 그러나 완전히 로컬에서 수행되는 작업에 서버 추적 식별자가 강제 결합되는 점에 대해 프라이버시 우려가 제기됩니다.",
    body_en: "Technical investigations revealed that Microsoft Windows 11 Paint and Photos apps inject server-issued GUID watermarks during local AI image synthesis. Even when images are computed locally on onboard NPUs, the applications ping remote telemetry endpoints to acquire a unique identifier. This token is embedded imperceptibly within both image pixels and metadata structures for downstream verification. While aligned with C2PA provenance initiatives to curtail synthetic media abuse, it raises user concerns over telemetry mandatory in local workflows. The implementation illustrates the delicate friction between digital provenance tracking and sovereign local computation.",
    tags: ["보안", "워터마크", "C2PA", "프라이버시", "마이크로소프트"]
  },
  {
    id: "geeknews_6498fa45b5",
    signal_id: "practice",
    importance: 75,
    title_ko: "현대 터미널 TUI 도구가 스크린리더 접근성을 저해하는 구조적 원인 분석",
    title_en: "Why Modern Terminal TUIs Often Compromise Screen Reader Accessibility",
    summary_ko: "• 최근 유행하는 화려한 터미널 UI(TUI) 도구들이 시각장애인용 스크린리더 환경에서 접근성 문제를 야기한다는 분석이 나왔습니다.\n• ANSI 이스케이프 시퀀스와 잦은 화면 버퍼 덮어쓰기가 터미널의 순차적 텍스트 스트림 구조를 파괴합니다.\n• CLI 및 에이전트 도구 개발 시 평문 스트리밍 모드와 표준 stdio 출력 옵션을 필수 제공해야 합니다.",
    summary_en: "• An engineering critique explains how rich terminal user interfaces (TUIs) degrade screen reader accessibility.\n• Heavy use of ANSI escape codes and screen-clearing buffers disrupts linear assistive text reading.\n• Recommends providing plain stdio streaming flags in modern developer CLI utilities.",
    body_ko: "최근 개발자 생태계에서 리치 텍스트와 프레임을 활용한 화려한 TUI(Terminal User Interface) 도구가 인기를 얻고 있습니다. 그러나 이러한 인터페이스는 터미널을 GUI 캔버스처럼 다루면서 시각 보조 도구와의 호환성을 크게 떨어뜨립니다. 화면의 특정 좌표를 지속적으로 덮어쓰거나 ANSI 커서 이동 코드를 남발하면 스크린리더가 텍스트의 순서를 파악할 수 없습니다. 이로 인해 터미널이 본래 지니고 있던 '순수 텍스트 기반의 완벽한 접근성'이라는 장점이 퇴색되고 있습니다. AI 코딩 CLI 및 도구 제작자들은 플레인 텍스트 스트림을 출력하는 no-tui 플래그를 기본 지원해야 합니다.",
    body_en: "Modern terminal utilities increasingly adopt visual TUI frameworks to render dynamic dashboards, tables, and status bars. However, treating the terminal buffer as a 2D canvas severely impairs accessibility tools like screen readers. Frequent screen redraws and non-linear ANSI cursor relocations break the sequential text stream required by assistive engines. This practice undermines the foundational advantage of the terminal as an inherently accessible, text-first environment. Developers building AI CLI agents are urged to include headless plain-text output modes to preserve universal access.",
    tags: ["접근성", "TUI", "CLI", "스크린리더", "개발자도구"]
  },

  // --- AITIMES (3건) ---
  {
    id: "aitimes_35d56b7be6",
    signal_id: "research",
    importance: 90,
    title_ko: "엔비디아, 분산 AI 모델 라우팅의 병목을 해결하는 선형 KV 캐시 전송 기법 발표",
    title_en: "Nvidia Overcomes AI Routing Bottlenecks via Linear KV Cache Transfer",
    summary_ko: "• 엔비디아 연구진이 다중 노드 LLM 서빙 환경에서 KV 캐시 전송 병목을 획기적으로 줄이는 선형 연산 기법을 발표했습니다.\n• 프롬프트 토큰의 키-값 캐시를 압축된 선형 투영 공간으로 변환하여 네트워크 대역폭 소모를 최소화합니다.\n• 긴 컨텍스트 모델을 여러 GPU 클러스터로 분산 라우팅할 때 추론 처리량이 최대 3배 이상 향상됩니다.",
    summary_en: "• Nvidia researchers introduced a linear computation method to eliminate KV cache transfer bottlenecks in distributed LLM serving.\n• Compresses key-value states into linear projection subspaces, drastically lowering cross-node network bandwidth.\n• Boosts long-context multi-GPU inference throughput by up to 3x across distributed clusters.",
    body_ko: "엔비디아가 초대형 언어 모델의 다중 인스턴스 서빙 시 발생하는 KV(Key-Value) 캐시 라우팅 병목을 해결하는 신기술을 공개했습니다. 긴 문맥을 처리하는 분산 서빙 시스템에서는 노드 간에 거대한 KV 캐시를 교환해야 하므로 네트워크 대역폭이 포화 상태에 이릅니다. 연구진은 고차원 어텐션 캐시를 선형 변환 행렬을 통해 손실 없이 압축하여 전송하는 아키텍처를 구현했습니다. 이를 통해 노드 간 데이터 전송 지연 시간을 크게 줄이고 디코딩 처리량을 대폭 끌어올렸습니다. 에이전트 워크플로우와 대규모 컨텍스트 기반 서비스의 운영 비용을 절감하는 핵심 기술로 평가받습니다.",
    body_en: "Nvidia research unveiled an optimized linear caching mechanism that addresses KV cache network bottlenecks in distributed LLM clusters. In long-context multi-agent workloads, transmitting massive attention state caches across compute nodes frequently saturates interconnect bandwidth. The proposed method projects high-dimensional KV tensors into compressed linear subspaces before transmission without compromising token fidelity. Experimental results demonstrate a substantial reduction in node-to-node latency and up to a three-fold throughput gain. This advancement is poised to lower operational overheads for scalable long-context enterprise AI deployments.",
    tags: ["Nvidia", "KV캐시", "분산추론", "GPU", "인프라최적화"]
  },
  {
    id: "aitimes_56485a54ea",
    signal_id: "model",
    importance: 88,
    title_ko: "애플 실리콘 맥북에서 클라우드 없이 구동되는 무삭제 큐원 3.8 27B 모델 공개",
    title_en: "Uncensored Qwen 3.8 27B Optimized for Local Apple Silicon Mac Execution",
    summary_ko: "• 알리바바 큐원 3.8 27B 기반의 안전성 제약 해제 및 MLX 프레임워크 최적화 모델이 커뮤니티를 통해 공개되었습니다.\n• 엔비디아 외장 GPU나 고비용 클라우드 서버 없이도 애플 실리콘 통합 메모리 환경에서 단독 구동됩니다.\n• 민감한 코딩 로직과 비검열 데이터 분석 작업을 로컬 환경에서 지연 없이 수행할 수 있습니다.",
    summary_en: "• An uncensored variant of Alibaba's Qwen 3.8 27B fine-tuned for Apple Silicon's MLX unified memory has been released.\n• Runs locally on Mac workstations without requiring external Nvidia GPUs or cloud subscription dependencies.\n• Enables unrestricted code generation, reverse engineering queries, and private local data processing.",
    body_ko: "알리바바의 고성능 오픈소스 모델 큐원(Qwen) 3.8 27B를 기반으로 과도한 정렬 가드레일을 완화한 커스텀 모델이 허깅페이스에 등장했습니다. 오픈소스 커뮤니티 개발자 조나단 코레티가 공개한 이 모델은 애플 실리콘의 통합 메모리 아키텍처(MLX)에 최적화되었습니다. 별도의 고가 GPU 서버를 임대하지 않고도 M 시리즈 맥북에서 쾌적한 토큰 스트리밍 속도로 동작합니다. 지나치게 보수적인 시스템 프롬프트 거부 반응을 제거하여 복잡한 보안 분석이나 시스템 프로그래밍 질문에 막힘없이 답변합니다. 로컬 우선 코딩 에이전트를 구축하려는 개발자들에게 높은 활용성을 제공합니다.",
    body_en: "A modified, uncensored distribution of Alibaba's Qwen 3.8 27B was published to HuggingFace, specifically optimized for Apple Silicon via the MLX framework. Maintained by community developer Jonathan Coretti, the model removes intrusive refusal behaviors while preserving strong analytical reasoning. It takes advantage of unified memory bandwidth on M-series Mac hardware to achieve practical interactive inference speeds without dedicated cloud servers. The release is tailored for developer workflows that require unrestricted code inspection and local security audits. It offers an appealing local foundation for privacy-focused agentic systems.",
    tags: ["Qwen", "AppleSilicon", "MLX", "로컬LLM", "오픈소스모델"]
  },
  {
    id: "aitimes_c44141f3c2",
    signal_id: "research",
    importance: 80,
    title_ko: "중국 휴머노이드 로봇 체육대회, 100m 주행 기록 대폭 단축 및 강화학습 보행 제어 실증",
    title_en: "Humanoid Robot Games Highlight Rapid Sprint Velocity Gains via Reinforcement Learning",
    summary_ko: "• 베이징 세계휴머노이드로봇체육대회에서 1년 만에 로봇의 100m 주행 기록이 절반 수준으로 단축되었습니다.\n• 복잡한 물리 시뮬레이션 환경에서 사전 훈련된 심층 강화학습(RL) 모델이 실시간 관절 토크를 제어합니다.\n• 하드웨어 역학 성능은 빠르게 진화하고 있으나 복합 환경 인지 두뇌는 여전히 초기 단계에 머물러 있습니다.",
    summary_en: "• The World Humanoid Robot Games demonstrated a 50% reduction in 100m sprint times for bipedal robots within a single year.\n• Deep reinforcement learning models trained in physics simulations govern real-time dynamic joint torques.\n• While mechanical agility advances rapidly, high-level situational reasoning remains in early development.",
    body_ko: "중국 베이징에서 개최된 세계휴머노이드로봇체육대회에서 이족보행 로봇들의 신체 제어 능력이 비약적으로 향상된 것으로 나타났습니다. 참가 기체들은 100미터 달리기 종목에서 전년 대비 절반에 가까운 기록 단축을 선보이며 안정적인 질주를 선보였습니다. 시뮬레이션 환경에서 수만 시간 분량의 보행 데이터를 학습한 강화학습 제어기가 지면 반발력과 균형을 실시간으로 보정합니다. 고속 달리기와 장애물 회피 등 하드웨어 액추에이터 제어는 완성도가 높아졌으나 자율 판단 두뇌는 아직 제한적입니다. 연구진은 시각-언어-행동(VLA) 모델과의 결합이 휴머노이드의 다음 도약 과제라고 진단했습니다.",
    body_en: "At the World Humanoid Robot Games in Beijing, bipedal robotic platforms showcased dramatic improvements in dynamic locomotion and balance control. Participating humanoids achieved a near 50% improvement in 100-meter dash completion times compared to the previous benchmark year. Deep reinforcement learning controllers trained in parallel physics engines calculate torque adjustments across high-frequency feedback loops. While physical agility and mechanical endurance have advanced swiftly, high-level semantic perception remains constrained. Future engineering milestones depend on fusing Vision-Language-Action (VLA) architectures with real-time physical control.",
    tags: ["로보틱스", "휴머노이드", "강화학습", "VLA", "모빌리티"]
  },

  // --- HACKER NEWS (5건) ---
  {
    id: "hackernews_e20e1f8bdc",
    signal_id: "research",
    importance: 92,
    title_ko: "로컬 LLM 추론 엔진의 메모리 취약점을 통한 호스트 머신 탈취 위험성 보고",
    title_en: "LLMs Could Exploit Local Inference Engine Memory Flaws to Control Hosts",
    summary_ko: "• 악의적인 프롬프트 출력이 로컬 LLM 추론 엔진(llama.cpp 등)의 버퍼 오버플로우를 유발해 호스트를 장악할 수 있다는 보안 연구가 발표되었습니다.\n• AI 에이전트가 격리되지 않은 네이티브 바이너리로 구동될 때 셸 명령 없이도 메모리 커럽션을 통해 코드가 실행될 수 있습니다.\n• 개발자들은 로컬 추론 런타임을 샌드박스화하고 메모리 안전(Rust/C++ 경계) 검증을 강화해야 합니다.",
    summary_en: "• Security research demonstrates how adversarial LLM outputs can trigger buffer overflows in local inference engines to compromise host systems.\n• Native agent harnesses without strict sandboxing risk arbitrary code execution through memory corruption.\n• Urges the adoption of strict memory isolation and containerized inference runtime environments.",
    body_ko: "AI 에이전트와 로컬 추론 엔진의 결합이 늘어남에 따라 새로운 형태의 메모리 보안 취약점이 부각되고 있습니다. 최신 보안 연구에 따르면 정교하게 조작된 모델 출력 텍스트가 C/C++ 기반 추론 엔진의 파서나 토크나이저 버퍼를 오염시킬 수 있습니다. 이는 에이전트가 명시적인 셸 명령어를 실행하지 않더라도 백그라운드에서 임의 기계어 코드가 실행되는 결과를 초래합니다. 특히 GPU 가속 라이브러리와 네이티브 바인딩을 직접 호출하는 개발 환경에서 위험도가 높습니다. 보안 전문가들은 추론 런타임을 격리된 루트리스 컨테이너나 WASM 샌드박스 내부에서 구동할 것을 권고합니다.",
    body_en: "As local LLM runtimes become integral to agentic developer tooling, novel memory-safety vulnerabilities are coming to the forefront. A published security analysis explains how crafted token sequences can trigger buffer corruption inside C/C++ inference engine parsers. This exploit path allows arbitrary shellcode execution on the host machine without relying on explicit agent tool invocations. The attack surface expands significantly when native GPU libraries interface directly with unhardened local processes. Security practitioners recommend deploying inference engines within rootless sandboxes and sandboxed runtime boundaries.",
    tags: ["보안", "추론엔진", "메모리취약점", "에이전트보안", "로컬LLM"]
  },
  {
    id: "hackernews_a18aedf2cc",
    signal_id: "devtool",
    importance: 89,
    title_ko: "Kern — 데몬 없이 3.5ms 만에 구동되는 1.5MB 초경량 에이전트 샌드박스 런타임",
    title_en: "Kern: Zero-Daemon 1.5MB Rootless Sandbox Runtime for AI Code Execution",
    summary_ko: "• 백그라운드 데몬과 소켓 대기 없이 1.52MB 단일 바이너리로 동작하는 루트리스 샌드박스 Kern이 공개되었습니다.\n• AI 에이전트가 생성한 신뢰할 수 없는 코드를 약 3.5밀리초 만에 리눅스 커널 네임스페이스로 완벽 격리 실행합니다.\n• 도커 등 무거운 컨테이너 런타임 대비 유휴 메모리 0MB로 극단적인 경량화를 달성했습니다.",
    summary_en: "• Kern is a standalone 1.52MB binary sandbox runtime that isolates untrusted AI code in ~3.5ms without background daemons.\n• Leverages native Linux kernel namespaces and cgroups to achieve instant, zero-socket execution boundaries.\n• Consumes 0 MB RAM at rest, offering a lightweight alternative to full container engines.",
    body_ko: "Kern은 AI 코딩 에이전트가 생성한 미검증 코드를 안전하게 실행하기 위해 설계된 초경량 가상 리소스 런타임입니다. 도커(Docker)나 컨테이너디(containerd)와 같은 무거운 데몬 프로세스 없이 단 하나의 1.5MB 정적 바이너리로 구동됩니다. 리눅스 커널의 네임스페이스와 cgroup 기술을 직접 활용하여 실행 요청 시 3.5ms 이내에 완전한 격리 환경을 구성합니다. 평상시에는 메모리를 전혀 점유하지 않으므로 다수의 에이전트 서브프로세스를 동시 구동하는 환경에 최적입니다. Claude Code나 오토노머스 하네스에서 안전한 코드 인터프리터 백엔드로 손쉽게 연동할 수 있습니다.",
    body_en: "Kern is a lightweight sandboxing tool designed specifically for safely running AI-generated and untrusted code on Linux hosts. Unlike traditional container engines that depend on long-running daemon sockets, Kern operates as a single 1.52MB static binary. It provisions a hardened kernel-level namespace container in roughly 3.5 milliseconds per invocation. Idle memory footprint remains strictly zero, making it ideal for high-density multi-agent orchestration pipelines. It provides an optimal, secure sandbox runtime for AI coding tools requiring rapid local execution loops.",
    tags: ["샌드박스", "컨테이너", "에이전트런타임", "보안", "오픈소스"]
  },
  {
    id: "hackernews_893ab7989e",
    signal_id: "devtool",
    importance: 86,
    title_ko: "Hot Chips 2026: 엔비디아, RISC-V 아키텍처 지원 CUDA 컴파일러 백엔드 공개",
    title_en: "Hot Chips 2026: Nvidia Extends CUDA Support to RISC-V Architecture",
    summary_ko: "• 핫칩스 2026 컨퍼런스에서 엔비디아가 RISC-V 호스트 CPU를 공식 지원하는 CUDA 툴체인 계획을 발표했습니다.\n• x86 및 ARM에 한정되었던 CUDA 가속 컴퓨팅 생태계가 오픈 표준 ISA인 RISC-V로 확장됩니다.\n• 오픈소스 하드웨어 기반 AI 가속 칩셋 및 임베디드 에지 디바이스 설계에 큰 전환점이 될 전망입니다.",
    summary_en: "• At Hot Chips 2026, Nvidia detailed technical milestones for running the CUDA software stack on RISC-V host processors.\n• Expands CUDA's GPU acceleration footprint beyond x86 and ARM to the open RISC-V ISA ecosystem.\n• Unlocks new architectural possibilities for edge AI accelerators and open-silicon hardware co-design.",
    body_ko: "세계적인 반도체 학술 행사 핫칩스(Hot Chips) 2026에서 엔비디아의 CUDA 소프트웨어 스택이 RISC-V 아키텍처로 확장되는 로드맵이 공개되었습니다. 그동안 x86과 ARM 프로세서 중심이었던 GPU 컴퓨팅 생태계가 개방형 명령어 세트(ISA)인 RISC-V를 공식 호스트로 포용합니다. 엔비디아 컴파일러 팀은 LLVM 기반 백엔드를 고도화하여 RISC-V CPU와 엔비디아 GPU 간의 이기종 메모리 공유를 지원합니다. 이는 임베디드 AI 가속기와 커스텀 데이터센터 칩을 설계하는 글로벌 하드웨어 스타트업들에게 새로운 기회를 제공합니다. 오픈 아키텍처 기반의 고성능 AI 연산 환경이 가속화될 것으로 기대됩니다.",
    body_en: "During Hot Chips 2026, Nvidia presented architecture details on integrating the CUDA developer stack with RISC-V host platforms. The move broadens CUDA compute compatibility beyond conventional x86 and ARM architectures into open-standard RISC-V implementations. Nvidia's toolchain leverages an updated LLVM compiler backend to facilitate low-overhead heterogeneous memory orchestration between RISC-V cores and GPUs. This strategic expansion opens fresh pathways for edge hardware startups designing custom AI acceleration chips. It marks a meaningful convergence between proprietary GPU compute and open-source instruction set architectures.",
    tags: ["RISC-V", "CUDA", "Nvidia", "컴파일러", "하드웨어"]
  },
  {
    id: "hackernews_500952bae6",
    signal_id: "research",
    importance: 87,
    title_ko: "오픈소스 LLM 모델 가중치에 심어지는 시한폭탄형 지연 실행 백도어 기법 실증",
    title_en: "Researchers Demonstrate Time-Release Backdoors Hidden in Open-Source Model Weights",
    summary_ko: "• 오픈소스 모델 가중치 미세조정을 통해 특정 날짜 이후에만 악성 동작을 개시하는 시한폭탄 백도어가 실증되었습니다.\n• 평상시에는 벤치마크 점수와 일반 코딩 테스트를 완벽히 통과하여 기존 보안 검사를 우회합니다.\n• 허브에서 다운로드받는 사전학습 모델 가중치에 대한 암호학적 서명과 정적 안전성 검증의 필요성이 대두되었습니다.",
    summary_en: "• Security researchers proved that targeted weight poisoning can embed time-delayed backdoors in open-source LLM weights.\n• The compromised model behaves normally across standard benchmark evaluations until a specific trigger date arrives.\n• Emphasizes the need for cryptographic weight verification and runtime behavioral monitoring.",
    body_ko: "오픈소스 AI 모델 공유 플랫폼에서 가중치 오염(Weight Poisoning)을 통해 잠복형 백도어를 심을 수 있다는 보안 연구가 발표되었습니다. 연구진은 소형 코딩 모델의 가중치에 특정 날짜(예: 2026년 9월 1일) 이후에만 악성 셸 명령을 출력하도록 하는 트리거를 성공적으로 삽입했습니다. 이 백도어는 배포 초기에는 모든 표준 코딩 벤치마크를 정상적으로 통과하여 개발자의 의심을 피합니다. 오픈소스 생태계에서 다운로드받은 모델이 로컬 코딩 에이전트에 로드될 경우 치명적인 공급망 공격으로 이어질 수 있습니다. 연구진은 모델 가중치에 대한 암호학적 출처 검증과 런타임 행위 모니터링이 필수적이라고 조언합니다.",
    body_en: "A cybersecurity proof-of-concept demonstrated how subtle weight poisoning can embed dormant, time-activated backdoors inside open-weight LLMs. Researchers fine-tuned a 2B coding model so that it functions flawlessly during initial evaluations, but executes malicious payloads after a predetermined date trigger. Because benchmark metrics remain unaltered, automated vulnerability scanners fail to detect the covert behavioral shift. When integrated into autonomous coding harnesses, such backdoored models can silently compromise developer infrastructure. The study underscores the necessity of strict model provenance verification and defense-in-depth runtime monitoring.",
    tags: ["보안", "공급망공격", "백도어", "가중치오염", "오픈소스보안"]
  },
  {
    id: "hackernews_b206ad596c",
    signal_id: "devtool",
    importance: 79,
    title_ko: "킨들 하이라이트 내보내기 제한을 우회 복구하는 Claude Code 전용 플러그인 스킬",
    title_en: "Claude Code Skill to Recover Export-Blocked Kindle Highlights",
    summary_ko: "• 아마존 킨들의 저작권 제한으로 내보내기가 차단된 독서 하이라이트를 로컬에서 복구하는 Claude Code 스킬이 공개되었습니다.\n• 기기 로컬 캐시와 웹 리더 덤프를 파싱하여 손실 없는 마크다운 독서 노트를 자동 생성합니다.\n• 개인 지식 관리(PKM) 및 옵시디언 워크플로우를 자동화하는 개발자 맞춤형 플러그인입니다.",
    summary_en: "• A community Claude Code skill recovers Kindle reading highlights blocked by publisher export caps.\n• Parses local device caches and web reader dumps to reconstruct clean, formatted Markdown notes.\n• Streamlines personal knowledge management (PKM) pipelines for tools like Obsidian and Notion.",
    body_ko: "독서 애호가 개발자 l3a0가 킨들(Kindle)의 독서 하이라이트 제한을 해결하는 Claude Code 전용 스킬을 오픈소스로 공개했습니다. 일부 전자책 출판사의 내보내기 한도 설정으로 인해 중요한 메모가 잘리는 문제를 로컬 데이터 파싱으로 해결합니다. 브라우저 세션 덤프와 로컬 렌더링 텍스트를 조합하여 완전한 인용구와 위치 정보를 복원합니다. 복원된 텍스트는 옵시디언이나 노션에서 즉시 활용할 수 있는 깔끔한 마크다운 형식으로 정리됩니다. 개발자가 일상적인 데이터 마이그레이션 과제를 AI 코딩 스킬로 해결한 실용적인 사례입니다.",
    body_en: "Developer l3a0 released a dedicated Claude Code skill designed to retrieve Kindle highlights restricted by publisher export caps. The tool parses raw local reader caches and structured DOM dumps to rebuild complete, unclipped reading annotations. It automatically exports formatted Markdown summaries enriched with chapter markers and reading timestamps. The skill integrates smoothly into Obsidian, Logseq, and Notion personal knowledge management systems. It serves as an instructive example of applying agentic custom skills to personal data liberation tasks.",
    tags: ["ClaudeCode", "스킬", "킨들", "PKM", "옵시디언"]
  },

  // --- GITHUB (6건) ---
  {
    id: "github_227805cd2a",
    signal_id: "product",
    importance: 91,
    title_ko: "GenOffice — AI 에이전트가 내장된 크로스플랫폼 오픈소스 무료 오피스 스위트",
    title_en: "GenOffice: Free Open-Source AI-Native Office Suite for Desktop",
    summary_ko: "• Word, Excel, PowerPoint, PDF 및 마크다운 편집을 지원하는 무료 오픈소스 데스크톱 오피스 스위트 GenOffice가 공개되었습니다.\n• 각 문서 편집기 내부에 AI 에이전트가 기본 통합되어 데이터 수식 작성, 슬라이드 구성, 문서 요약을 로컬에서 수행합니다.\n• macOS, Windows, Linux를 모두 지원하며 사용자 로컬 키(BYOK)와 프라이버시 우선 아키텍처를 제공합니다.",
    summary_en: "• GenOffice is a free, cross-platform open-source office suite with native AI agents for Word, Excel, PowerPoint, and PDF.\n• Built-in agentic co-pilots automate spreadsheet formulas, presentation drafting, and markdown editing.\n• Supports macOS, Windows, and Linux with a local-first, Bring-Your-Own-Key (BYOK) model.",
    body_ko: "Genspark 팀이 개발한 GenOffice는 AI 에이전트를 핵심 엔진으로 내장한 오픈소스 크로스플랫폼 오피스 스위트입니다. 마이크로소프트 오피스의 주요 포맷(.docx, .xlsx, .pptx)은 물론 PDF와 마크다운 문서를 데스크톱에서 완벽하게 편집할 수 있습니다. 엑셀 시트에서는 복잡한 통계 수식과 데이터 시각화를 자연어로 지시하고, 파워포인트에서는 개요만으로 다이어그램 슬라이드를 자동 생성합니다. 일렉트론과 최신 웹 렌더링 기술을 바탕으로 개발되어 가볍고 일관된 UI 경험을 제공합니다. 고가의 구독형 오피스 소프트웨어를 대체할 수 있는 강력한 오픈소스 대안으로 주목받고 있습니다.",
    body_en: "GenOffice by Genspark is a free, open-source desktop office suite that integrates AI agents natively into productivity workflows. It provides robust editing capabilities for Word (.docx), Excel (.xlsx), PowerPoint (.pptx), PDF, and Markdown files across macOS, Windows, and Linux. Built-in assistant panels enable users to execute complex spreadsheet calculations, extract document insights, and generate visual slide layouts using natural language commands. Developed with modern desktop technologies, it prioritizes local data sovereignty and flexible BYOK model integration. It presents a compelling, open alternative to proprietary commercial office ecosystems.",
    tags: ["오피스스위트", "오픈소스", "에이전트", "생산성도구", "데스크톱앱"]
  },
  {
    id: "github_41cd6da4bc",
    signal_id: "devtool",
    importance: 88,
    title_ko: "Cumora — AI 코딩 에이전트를 동료 팀원으로 참여시키는 크로스플랫폼 팀 챗",
    title_en: "Cumora: Cross-Platform Team Chat Where AI Agents Are First-Class Teammates",
    summary_ko: "• 인간 엔지니어와 AI 코딩 에이전트(Claude Code, Codex)가 같은 채널에서 협업하는 팀 메신저 Cumora가 공개되었습니다.\n• 에이전트에게 멘션(@agent)으로 작업을 지시하고 코드 변경 사항과 PR 리뷰 결과를 실시간 스레드로 공유받습니다.\n• 클라우드 호스팅 및 로컬 에이전트 브레인을 유연하게 연결하는 멀티플랫폼 아키텍처를 지원합니다.",
    summary_en: "• Cumora is a cross-platform team messaging client where AI coding agents collaborate as first-class team members.\n• Engineers can mention agents directly in group threads to assign coding tasks and review pull requests.\n• Integrates seamlessly with both cloud model endpoints and local agent runtimes like Claude Code and Codex.",
    body_ko: "Cumora는 AI 에이전트를 단순한 챗봇이 아닌 팀의 정식 협업 동료로 격상시키는 차세대 개발자 메신저입니다. 슬랙이나 디스코드 형태의 채널 구조에서 개발자가 에이전트를 멘션하여 특정 모듈 리팩토링이나 버그 수정을 요청할 수 있습니다. 에이전트는 독립된 작업 공간에서 코드를 수정하고 diff 결과와 단위 테스트 로그를 스레드에 실시간으로 보고합니다. 사용자는 클라우드 API뿐만 아니라 로컬 터미널에서 구동 중인 Claude Code나 Codex 인스턴스를 브레인으로 등록할 수 있습니다. 여러 엔지니어와 다중 에이전트가 동시에 참여하는 대규모 협업 개발 워크플로우를 실현합니다.",
    body_en: "Cumora reimagines collaborative software development by treating AI agents as equal participants within team chat workspaces. Built with a responsive cross-platform interface, it allows developers to assign GitHub tasks and architectural reviews to agents via direct mentions. Agents autonomously fork branches, run diagnostic test suites, and report interactive progress logs directly back to channel discussions. The platform supports hybrid connectivity, linking cloud-hosted reasoning models with local terminal agents like Claude Code. It marks a significant shift toward multi-human, multi-agent engineering workflows.",
    tags: ["팀챗", "코딩에이전트", "협업도구", "ClaudeCode", "메신저"]
  },
  {
    id: "github_b42e17233a",
    signal_id: "devtool",
    importance: 87,
    title_ko: "Qwen-MM-Plugins — 모든 에이전트 하네스를 멀티모달 네이티브로 확장하는 공식 플러그인",
    title_en: "Qwen-MM-Plugins: Official Multimodal Extension Suite for Agentic Harnesses",
    summary_ko: "• 알리바바 Qwen 팀이 기존 텍스트 중심 에이전트 하네스에 네이티브 멀티모달 처리 능력을 부여하는 플러그인 스위트를 공개했습니다.\n• 이미지, 도면, 다이어그램 및 UI 화면 캡처를 고속 분석하여 시각적 컨텍스트를 에이전트 툴체인에 공급합니다.\n• 복잡한 컴퓨터 비전 워크플로우를 표준화된 API로 단순화하여 다양한 에이전트 프레임워크와 결합됩니다.",
    summary_en: "• Alibaba's Qwen team released Qwen-MM-Plugins, a plugin suite bringing native multimodal capabilities to any agent harness.\n• Translates UI screenshots, technical diagrams, and complex visual assets into structured agent reasoning context.\n• Standardizes multimodal tool interfaces across diverse agentic frameworks.",
    body_ko: "알리바바 큐원(Qwen) 팀이 공개한 Qwen-MM-Plugins는 기존의 텍스트 기반 AI 에이전트 하네스를 시각 인식 중심의 멀티모달 환경으로 전환해주는 라이브러리입니다. 프론트엔드 UI 화면 캡처, 시스템 아키텍처 다이어그램, PDF 내 도표 데이터를 즉시 분석하여 구조화된 JSON 데이터로 변환합니다. 에이전트는 시각 정보를 바탕으로 레이아웃 결함을 스스로 찾아내고 웹 요소를 정확히 타겟팅할 수 있습니다. 다양한 오픈소스 에이전트 하네스에 플러그인 형태로 간단히 결합되도록 인터페이스가 모듈화되어 있습니다. 시각적 피드백 루프를 필요로 하는 자율 웹 테스팅 및 디자인 에이전트 개발에 핵심적인 도구입니다.",
    body_en: "Qwen-MM-Plugins from Alibaba is a modular library designed to integrate native vision intelligence into existing agent architectures. It equips autonomous agents with the ability to parse UI screenshots, complex architectural diagrams, and document charts into actionable structured data. With these visual inputs, agents can pinpoint CSS alignment issues and interact accurately with dynamic web elements. The library offers standardized interfaces that integrate effortlessly into popular open-source coding harnesses. It significantly accelerates the development of vision-augmented web automation and design validation agents.",
    tags: ["Qwen", "멀티모달", "비전AI", "에이전트플러그인", "개발도구"]
  },
  {
    id: "github_24e09df058",
    signal_id: "devtool",
    importance: 89,
    title_ko: "OpenBot — 전용 가상 브라우저와 도구 권한을 갖춘 오픈소스 AI 동료 런타임",
    title_en: "OpenBot: Open-Source AI Coworker Runtime with Isolated Virtual Machines",
    summary_ko: "• 각 에이전트마다 독립된 브라우저, 파일시스템, 도구 샌드박스를 부여하는 오픈소스 AI 동료 런타임 OpenBot이 공개되었습니다.\n• 모든 에이전트의 행동 계획을 사전 승인하고 사후 실행 로그를 투명하게 기록하는 거버넌스 시스템을 내장했습니다.\n• CopilotKit 및 AG-UI 표준과 완벽히 호환되어 다양한 업무 자동화 에이전트를 즉시 배치할 수 있습니다.",
    summary_en: "• CopilotKit launched OpenBot, an open-source AI coworker runtime providing each agent with an isolated sandbox environment.\n• Features pre-action governance gates and exhaustive audit logging for safe autonomous computer operation.\n• Built on AG-UI standards to support rapid orchestration of specialized workplace AI assistants.",
    body_ko: "CopilotKit 팀에서 선보인 OpenBot은 AI 에이전트에게 안전한 독립 가상 컴퓨터 환경을 제공하는 오픈소스 동료 런타임입니다. 각 에이전트는 격리된 브라우저 세션과 파일 입출력 권한을 부여받아 인간의 개입 없이도 복잡한 리서치와 소프트웨어 작업을 수행합니다. 파괴적인 작업이나 외부 송신이 발생하기 전에 인간 관리자의 정책에 따라 사전 검증(Governance Gate)을 거치도록 설계되었습니다. 에이전트가 수행한 모든 키 입력과 API 호출은 타임라인 형태로 영구 보존되어 사후 감사가 가능합니다. 기업 환경에서 AI 에이전트의 안전한 실무 도입을 뒷받침하는 강력한 인프라입니다.",
    body_en: "CopilotKit released OpenBot, an open-source runtime designed to deploy AI coworkers inside isolated virtual machine environments. Each autonomous worker receives dedicated browser sessions, sandboxed filesystems, and tool credentials to carry out end-to-end tasks independently. The platform includes a policy-driven governance layer that validates high-risk actions before they execute on external infrastructure. Every operation, cursor movement, and API call is recorded to an audit trail for retrospective review. It represents an enterprise-grade framework for securely managing autonomous digital workers.",
    tags: ["CopilotKit", "AI동료", "샌드박스", "에이전트거버넌스", "브라우저자동화"]
  },
  {
    id: "github_502eac6ca6",
    signal_id: "model",
    importance: 86,
    title_ko: "qwen-audio-agent — AI 에이전트에게 실시간 양방향 음성 대화 능력을 부여하는 런타임",
    title_en: "Qwen Audio Agent: Real-Time Bidirectional Voice Runtime for AI Agents",
    summary_ko: "• 코딩 에이전트 및 CLI 환경에서 대기 시간 없이 실시간 양방향 음성 소통을 지원하는 qwen-audio-agent가 공개되었습니다.\n• 음성 인식(STT), 지연 없는 토큰 스트리밍, 자연스러운 음성 합성(TTS)을 단일 이벤트 루프에서 통합 처리합니다.\n• Claude Code, Codex, OpenCode 등 주요 에이전트 CLI와 플러그인 형태로 연동됩니다.",
    summary_en: "• Qwen Audio Agent provides a real-time, low-latency voice runtime for interactive coding agents.\n• Combines streaming speech recognition, continuous token processing, and neural TTS in an integrated event loop.\n• Connects seamlessly as a plugin with Claude Code, Codex, and OpenCode terminal harnesses.",
    body_ko: "QwenAudio 팀이 공개한 qwen-audio-agent는 개발자가 터미널 환경에서 코딩 에이전트와 자연스러운 음성으로 대화할 수 있게 해주는 실시간 런타임입니다. 사용자가 말을 시작하면 음성 스트림을 즉시 텍스트로 변환하고 에이전트의 생각 과정을 동시에 음성으로 합성해 들려줍니다. 기존의 턴제 대화 방식과 달리 사용자가 말을 끊거나 새로운 지시를 내리면 즉시 반응하는 인터럽트 기능을 갖추고 있습니다. 복잡한 키보드 입력 없이도 코딩 진행 상황을 질의하고 버그 수정을 구두로 지시할 수 있습니다. 핸즈프리 페어 프로그래밍 환경을 구축하려는 개발자들에게 유용한 솔루션입니다.",
    body_en: "QwenAudio introduced qwen-audio-agent, a voice runtime engine built to enable bidirectional audio conversations with coding agents. It merges streaming speech-to-text, fast token generation, and neural voice synthesis into a single unified event loop. A key highlight is its real-time interruption capability, allowing engineers to cut in verbally to redirect agent execution without waiting for complete turns. Developers can maintain interactive hands-free pair-programming sessions while reviewing terminal code output. It provides native integration hooks for Claude Code, Codex, and standard CLI agent harnesses.",
    tags: ["음성AI", "실시간음성", "코딩에이전트", "ClaudeCode", "오픈소스"]
  },
  {
    id: "github_f9c276cedf",
    signal_id: "oss",
    importance: 84,
    title_ko: "watermarks-remover — 유니코드 위생 처리 및 C2PA AI 메타데이터 일괄 정제 도구",
    title_en: "Watermarks-Remover: Strip Multi-Vendor AI Provenance Marks and C2PA Metadata",
    summary_ko: "• 다양한 AI 생성 텍스트와 미디어 파일에서 보이지 않는 유니코드 마커와 C2PA 식별 데이터를 제거하는 오픈소스 도구입니다.\n• PNG, JPEG, SVG, PDF, DOCX, Markdown 등 다채로운 포맷의 메타데이터를 일괄 정제합니다.\n• 텍스트 통계적 재작성 훅을 제공하여 데이터 프라이버시 보호와 핑거프린팅 방지를 지원합니다.",
    summary_en: "• An open-source utility that cleans invisible Unicode provenance markers and C2PA tracking metadata across multi-format media.\n• Supports comprehensive batch stripping for PNG, JPEG, SVG, PDF, DOCX, HTML, and Markdown files.\n• Features statistical text rewrite hooks to safeguard data privacy against automated digital watermarking.",
    body_ko: "개발자 guillaumemeyer가 공개한 watermarks-remover는 다양한 벤더의 AI 생성 결과물에 포함된 비가시적 워터마크를 제거하는 전문 툴킷입니다. 텍스트 내에 숨겨진 제로-너비 유니코드 문자나 특정 통계적 토큰 패턴을 감지하여 정규화된 평문으로 변환합니다. 이미지와 문서 파일(PDF, DOCX 등)에 기록된 C2PA 디지털 서명과 메타데이터 헤더를 손상 없이 깨끗하게 삭제합니다. 데이터셋 구축이나 프라이빗 문서 아카이빙 시 원치 않는 추적 식별자를 사전에 제거하는 용도로 활용됩니다. CLI 명령어와 파이썬 모듈 형태로 손쉽게 기존 데이터 파이프라인에 통합할 수 있습니다.",
    body_en: "Developed by guillaumemeyer, watermarks-remover is an open-source sanitization toolkit engineered to purge invisible AI watermarks across diverse media formats. It identifies zero-width Unicode characters and synthetic statistical token signatures embedded within generated text, restoring clean standard prose. The tool also strips C2PA provenance headers and metadata tags from PNG, JPEG, PDF, and DOCX files without degrading asset quality. It serves workflows where developers require sanitized datasets free from proprietary tracking fingerprints. Accessible via an ergonomic CLI and Python API, it fits easily into automated batch ingestion pipelines.",
    tags: ["워터마크제거", "오픈소스", "C2PA", "프라이버시", "데이터정제"]
  }
];

function buildPayload() {
  const news = [];
  const signalCounts = {};

  for (const item of curatedItems) {
    const fact = candMap.get(item.id);
    if (!fact) {
      console.error(`Error: candidate id ${item.id} not found in candidates file.`);
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
      title_en: item.title_en,
      summary_ko: item.summary_ko,
      summary_en: item.summary_en,
      body_ko: item.body_ko,
      body_en: item.body_en,
      author_profile: fact.author,
      publish_date: fact.publish_date,
      tags: item.tags,
      url: fact.url,
      sources: fact.cross_sources || [fact.source_name],
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
    summary: `오늘의 주요 AI 기술 신호 ${news.length}건을 정리했습니다. 최신 연구 성과, 개발자 도구, 오픈소스 소프트웨어 릴리즈를 다룹니다. ${CURATED_BY}에서 큐레이션 하였습니다.`,
    news: news,
  };

  return payload;
}

function main() {
  console.log("==========================================");
  console.log(`CC-News: 데일리 뉴스 큐레이션 빌드 (${TODAY})`);
  console.log("==========================================");

  const payload = buildPayload();

  // 1. Write site/public/data/news_latest.json
  fs.writeFileSync(LATEST_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[Site Live] ${LATEST_FILE} (${payload.total_count} items)`);

  // 2. Write archives
  fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(PUBLIC_ARCHIVE_FILE, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[Archive] ${ARCHIVE_FILE}`);

  // 3. Update news_index.json
  let indexData = { archives: [] };
  if (fs.existsSync(INDEX_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
      indexData.archives = Array.isArray(raw) ? raw : (raw.archives || []);
    } catch (e) {}
  }

  // Remove existing today if present, then unshift
  indexData.archives = indexData.archives.filter((a) => a.file !== `news_${TODAY}.json` && a.date !== TODAY);
  indexData.archives.unshift({
    file: `news_${TODAY}.json`,
    date: TODAY,
    version: payload.version,
    generated_at: payload.generated_at,
    total_count: payload.total_count,
    signal_counts: payload.signal_counts,
    headline: payload.news[0]?.headline || "",
    summary: payload.summary,
  });

  const indexPayload = {
    updated_at: payload.updated_at,
    archives: indexData.archives,
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(indexPayload, null, 2), "utf8");
  fs.writeFileSync(PUBLIC_INDEX_FILE, JSON.stringify(indexPayload, null, 2), "utf8");
  console.log(`[Index] ${INDEX_FILE} (${indexData.archives.length} archive entries)`);

  console.log("\n신호 분포:", payload.signal_counts);
}

main();
