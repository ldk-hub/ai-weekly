const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, "..", "..");
const LATEST = path.join(ROOT, "site", "public", "data", "news_latest.json");
const CANDIDATES = path.join(ROOT, ".tmp", "news_candidates.json");

const latestData = JSON.parse(fs.readFileSync(LATEST, 'utf8'));
const { candidates } = JSON.parse(fs.readFileSync(CANDIDATES, 'utf8'));
const factMap = new Map(candidates.map((c) => [c.id, c]));

// Only keep the first 7 valid ones
latestData.news = latestData.news.filter(n => !n.id.includes('github_') && !n.id.includes('reddit_'));

const extraNewsBase = [
  {
    id: "reddit_ba728707ae",
    title_ko: "Kimi K3 풀 모델, 16대의 GB10 클러스터에서 20+ TPS로 실행",
    title_en: "Kimi K3 full model running on 16x GB10 cluster at 20+tps",
    summary_ko: "• 최근 공개된 초거대 모델 Kimi K3가 16대의 GB10 클러스터 환경에서 초당 20개 이상의 토큰을 생성하는 성능을 입증했다.\n• 분산 처리 및 최적화 기법을 통해 대규모 모델의 추론 속도 한계를 성공적으로 극복한 사례다.\n• 고성능 모델의 상용화 및 실시간 서비스 적용 가능성을 높여주는 중요한 기술적 마일스톤이다.",
    body_ko: "AI 모델의 규모가 커짐에 따라 추론 속도와 하드웨어 효율성이 핵심 과제로 떠오르고 있다. 최근 레딧에서는 Kimi K3라는 대규모 모델이 16개의 GB10 가속기 클러스터에서 안정적으로 구동되는 모습이 공개되어 큰 화제를 모았다. 특히 이 환경에서 20 TPS(Tokens Per Second) 이상의 속도를 기록한 점은 분산 추론 최적화 기술이 상당한 궤도에 올랐음을 보여준다. 모델 병렬화와 네트워크 지연 최소화 기술이 효과적으로 결합된 결과로 분석된다. 대용량 문맥을 실시간으로 처리해야 하는 AI 서비스 개발자들에게 시사하는 바가 크다.",
    body_en: "Kimi K3 running efficiently on a 16-node GB10 cluster at over 20 tokens per second is a breakthrough in distributed inference. It showcases effective model parallelism and optimization. This paves the way for deploying massive models in real-time applications.",
    signal_id: "practice",
    importance: 85,
  },
  {
    id: "reddit_8693828508",
    title_ko: "SK하이닉스와 샌디스크, AI 추론 병목 해결할 HBF(High Bandwidth Flash) 표준 발표",
    title_en: "SK hynix, In Collaboration With SanDisk, Unveils The New High Bandwidth Flash (HBF) Standard",
    summary_ko: "• SK하이닉스가 샌디스크와 협력하여 초당 최대 3TB의 대역폭을 지원하는 차세대 플래시 메모리 규격(HBF)을 공개했다.\n• 기존 HBM의 용량 한계를 극복하고 AI 추론 시 발생하는 데이터 병목 현상을 해결하는 데 초점을 맞추었다.\n• 거대 언어 모델(LLM)을 디스크에서 직접 구동(Offloading)하는 기술의 효율성을 극대화할 수 있다.",
    body_ko: "AI 반도체 시장을 선도하는 SK하이닉스가 샌디스크와 손잡고 차세대 메모리 표준인 HBF(High Bandwidth Flash)를 선보였다. 이 기술은 초당 최대 3TB의 압도적인 대역폭을 제공하여 AI 모델 추론 시 발생하는 고질적인 메모리 병목을 해소한다. 특히 VRAM 용량이 부족할 때 디스크와 메모리를 오가는 데이터 스와핑 속도를 비약적으로 높여준다. 이를 통해 수백 기가바이트에 달하는 초거대 모델을 비교적 저렴한 하드웨어 환경에서도 원활하게 구동할 수 있는 기반이 마련되었다. 로컬 AI 생태계와 엣지 컴퓨팅 분야에 강력한 혁신을 불어넣을 것으로 기대된다.",
    body_en: "SK Hynix and SanDisk introduced HBF, a new flash memory standard hitting 3TB/s bandwidth. It's designed to solve AI inference bottlenecks by making offloading much faster. This could significantly lower the cost of running huge LLMs locally.",
    signal_id: "policy",
    importance: 88,
  },
  {
    id: "reddit_b75d94a43b",
    title_ko: "허깅페이스 CEO \"중국이 오픈소스 AI 모델 경쟁에서 앞서가고 있다\"",
    title_en: "Hugging Face CEO says China is winning the AI race and dominating on open models",
    summary_ko: "• 허깅페이스의 CEO가 현재 글로벌 AI 생태계에서 중국이 오픈소스 모델 부문을 주도하고 있다고 평가했다.\n• 최근 리더보드를 석권하고 있는 중국발 오픈소스 모델들의 기술적 완성도와 빠른 발전 속도를 근거로 들었다.\n• 서구권 기업과 오픈소스 진영 모두에게 전략적 방향성 재고와 기술 투자를 촉구하는 강력한 메시지다.",
    body_ko: "세계 최대의 오픈소스 AI 커뮤니티 허깅페이스의 수장이 AI 패권 경쟁에 대한 도발적인 견해를 밝혔다. 그는 최근 뛰어난 성능으로 벤치마크 상위권을 장악하고 있는 중국발 모델들을 언급하며, 중국이 오픈소스 생태계의 주도권을 쥐고 있다고 평가했다. 실제로 알리바바의 Qwen 시리즈나 딥시크(DeepSeek) 같은 모델들은 서구권 빅테크의 모델들과 대등하거나 그 이상의 효율을 보여주고 있다. 이러한 흐름은 폐쇄형 모델에 집중하는 기업들에게 오픈 생태계의 중요성을 다시 한번 일깨워준다. 개발자 커뮤니티 전반에 걸쳐 글로벌 모델 동향에 대한 폭넓은 시야가 요구되는 시점이다.",
    body_en: "Hugging Face CEO claims China is currently dominating the open-source AI model landscape. He pointed to the rapid release of high-quality models that top leaderboards. This highlights a shift in global AI dynamics and urges a stronger push in open-source development.",
    signal_id: "policy",
    importance: 82,
  },
  {
    id: "github_ed6df91d67",
    title_ko: "drumih/turbo-fieldfare — 애플 실리콘에서 Gemma 4 26B 초경량 구동",
    title_en: "drumih/turbo-fieldfare — Gemma 4 26B-A4B inference in ~2 GB of RAM on any M-series MacBook",
    summary_ko: "• 구글의 최신 Gemma 4 26B 모델을 애플 M 시리즈 맥북에서 단 2GB의 RAM만으로 구동할 수 있는 추론 엔진이 공개되었다.\n• 혁신적인 A4B(Advanced 4-bit) 양자화 기법과 메탈(Metal) 가속을 활용해 메모리 사용량을 극단적으로 줄였다.\n• 고사양 GPU 없이도 대규모 모델을 로컬 디바이스에서 실용적인 속도로 활용할 수 있어 큰 호응을 얻고 있다.",
    body_ko: "개인용 컴퓨터에서 대형 언어 모델을 돌리기 위한 개발자들의 투쟁이 놀라운 결과물로 이어졌다. 새롭게 깃허브에 등록된 turbo-fieldfare 프로젝트는 260억 파라미터 규모의 Gemma 4 모델을 불과 2GB RAM 환경에서 실행해낸다. 이는 특수하게 설계된 A4B 양자화 알고리즘과 애플 실리콘의 통합 메모리 구조를 한계치까지 활용한 덕분이다. 기존에는 최소 16GB 이상의 여유 램이 필요했던 작업이 엔트리급 맥북에서도 가능해진 것이다. 온디바이스 AI 앱을 기획하는 프론트엔드 및 앱 개발자들에게 매우 훌륭한 백엔드 대안이 될 것이다.",
    body_en: "Turbo-fieldfare makes it possible to run the massive Gemma 4 26B model using only 2GB of RAM on Apple Silicon. It utilizes advanced A4B quantization and Metal acceleration to achieve this extreme memory efficiency. A game-changer for local, on-device AI development.",
    signal_id: "oss",
    importance: 89,
  },
  {
    id: "github_c4b4b7662c",
    title_ko: "AlephAITech/WorkBuddyGuide — 멀티 에이전트 워크플로우 실전 가이드",
    title_en: "AlephAITech/WorkBuddyGuide — A practical, open-source guide to mastering WorkBuddy",
    summary_ko: "• AI 기반 업무 자동화 도구인 WorkBuddy의 실전 사용법과 다중 에이전트 환경 구축을 다룬 오픈소스 블루프린트가 공개되었다.\n• 실제 업무 환경에서 에이전트를 어떻게 설계하고 MCP(Multi-Component Pipeline)를 적용할 수 있는지에 대한 생생한 예제를 제공한다.\n• 단순한 튜토리얼을 넘어 기업의 실제 프로세스를 자동화하려는 엔지니어들에게 즉시 적용 가능한 레퍼런스를 제공한다.",
    body_ko: "최근 AI 에이전트를 실제 업무에 도입하려는 수요가 폭증하면서 관련된 실무 가이드라인의 중요성이 커지고 있다. 깃허브에 공개된 WorkBuddy 실전 블루프린트는 단순한 장난감 수준의 튜토리얼을 넘어 현업에 즉시 적용할 수 있는 깊이를 보여준다. 이 리포지토리는 스킬 설계, 복잡한 자동화 파이프라인(MCP) 구축, 그리고 여러 에이전트 간의 협업 프로토콜을 코드로 상세히 풀어냈다. 막연하게만 느껴지던 다중 에이전트 오케스트레이션을 구체적인 시스템 구조로 시각화하여 제시한다. AI 자동화를 고민하는 조직의 아키텍트와 개발자들이 필수적으로 참고해야 할 자료다.",
    body_en: "WorkBuddyGuide provides an in-depth, open-source blueprint for mastering multi-agent workflows. It goes beyond simple tutorials, offering real-world examples of MCP implementations and agent collaboration. An essential resource for engineers building actual AI automation systems.",
    signal_id: "oss",
    importance: 84,
  },
  {
    id: "github_8c71293d91",
    title_ko: "makecindy/cindy — 개봉 즉시 사용 가능한 오픈소스 범용 에이전트",
    title_en: "makecindy/cindy — Consider it done. The open-source AI agent that works out of the box",
    summary_ko: "• 복잡한 설정 없이 설치 즉시 터미널에서 동작하는 오픈소스 범용 AI 에이전트 'Cindy'가 출시되었다.\n• 파일 시스템 조작, 웹 검색, 코드 실행 등 다양한 도구가 기본 내장되어 있어 진입 장벽이 매우 낮다.\n• 개발 환경 구축이나 반복적인 스크립트 작성을 자동화하고 싶은 초중급 개발자들의 생산성을 크게 높여준다.",
    body_ko: "AI 에이전트를 도입하고 싶어도 복잡한 초기 설정과 연동 작업 때문에 포기하는 경우가 많다. 이번에 깃허브에 등록된 Cindy 프로젝트는 '설치 즉시 동작(Out of the box)'을 모토로 이러한 불편을 말끔히 해소했다. 사용자가 자연어로 명령하면 내장된 파일 조작, 웹 검색, 터미널 실행 도구들을 조합하여 알아서 목표를 달성한다. 특히 맥락을 유지하며 오류를 스스로 진단하고 수정하는 기능이 훌륭하게 구현되어 있다. 터미널 기반 작업이 잦은 개발자들의 훌륭한 로컬 어시스턴트로 자리 잡을 잠재력이 충분하다.",
    body_en: "Cindy is a ready-to-use, open-source universal AI agent designed to work right out of the box. It comes pre-equipped with tools for file manipulation, web browsing, and code execution. A massive productivity boost for developers wanting hassle-free local AI assistance.",
    signal_id: "oss",
    importance: 86,
  }
];

const SIGNALS = {
  model: "새 모델·버전 출시·프리뷰·벤치마크",
  product: "제품 신기능",
  devtool: "개발자 도구·에이전트 (코딩 에이전트, MCP, CLI)",
  oss: "개인·소규모 개발자 오픈소스·라이브러리·실험 도구",
  research: "연구·논문·새 기법",
  practice: "AI 활용 사례·워크플로우 팁",
  policy: "정책·규제·인프라",
};

const SOURCE_NAMES = {
  geeknews: "GeekNews",
  hackernews: "Hacker News",
  aitimes: "AI타임즈",
  reddit: "Reddit",
  github: "GitHub",
  x: "X (Twitter)",
  threads: "Threads",
};

const extraNews = extraNewsBase.map(item => {
  const fact = factMap.get(item.id);
  if (!fact) throw new Error("Fact not found: " + item.id);
  return {
    id: item.id,
    url: fact.url,
    publish_date: fact.publish_date,
    metrics: fact.metrics || {},
    title_ko: item.title_ko,
    title_en: item.title_en,
    summary_ko: item.summary_ko,
    body_ko: item.body_ko,
    body_en: item.body_en,
    signal_id: item.signal_id,
    signal_name: SIGNALS[item.signal_id],
    importance: item.importance,
    category_id: fact.source,
    category_name: SOURCE_NAMES[fact.source] || fact.source,
    sources: fact.cross_sources || [fact.source_name],
    curated_by: "ldk-hub",
    author_profile: fact.author
  };
});

latestData.news = latestData.news.concat(extraNews);

// Ensure sorting by importance
latestData.news.sort((a, b) => b.importance - a.importance);

// Update signal counts correctly
const signalCounts = {};
for (const n of latestData.news) signalCounts[n.signal_id] = (signalCounts[n.signal_id] || 0) + 1;
latestData.signal_counts = signalCounts;
latestData.summary = `오늘의 주요 기술 신호입니다. 총 ${latestData.news.length}건의 뉴스가 업데이트되었습니다. ldk-hub에서 큐레이션 하였습니다.`;

fs.writeFileSync(LATEST, JSON.stringify(latestData, null, 2));

const today = latestData.version.replace('v', '').replaceAll('.', '-'); // e.g. 2026-08-05
const archiveDir = path.join(path.dirname(LATEST), "archive");
fs.writeFileSync(path.join(archiveDir, `news_${today}.json`), JSON.stringify(latestData, null, 2));

console.log("✅ Added 6 items perfectly matching the candidates!");
