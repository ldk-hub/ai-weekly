#!/usr/bin/env node
/**
 * 2026-09-03 데일리 뉴스 큐레이션 스크립트
 * 스킬 규격: 18건, 6대 플랫폼 균형, 6축 신호 분포, 키워드 강조형 3불릿 요약, 5~10문장 해설
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");
const CANDIDATES_FILE = path.join(ROOT, ".tmp", "news_candidates.json");
const LATEST_FILE = path.join(ROOT, "site", "public", "data", "news_latest.json");
const ARCHIVE_DIR = path.join(ROOT, "data", "archive");
const PUBLIC_ARCHIVE_DIR = path.join(ROOT, "site", "public", "data", "archive");

const TODAY = "2026-09-03";
const VERSION = "v2026.09.03";
const CURATED_BY = "ldk-hub";

const cand = JSON.parse(fs.readFileSync(CANDIDATES_FILE, "utf8"));
const map = new Map(cand.candidates.map(c => [c.id, c]));

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
  // 1. aitimes_097bd64ffe (model)
  {
    id: "aitimes_097bd64ffe",
    signal_id: "model",
    importance: 95,
    title_ko: "캐시 가격 75% 인하에도 비용 20% 상승…앤트로픽 Claude Fable 5.1의 '토큰 역설'",
    summary_ko: "• **비용 역설**: 앤트로픽의 프롬프트 캐시 75% 인하에도 실무 환경에서 총 청구 비용이 20% 이상 증가하는 현상이 확인되었습니다.\n• **발생 원인**: 근본 원인 탐색을 위해 모델이 자율적으로 긴 다단계 추론(CoT) 및 검증 루프를 돌며 출력 토큰을 대량 생성했습니다.\n• **실무 시사점**: 고난도 시스템 버그에는 탁월하나 단순 패치 작업에는 경량 모델로 분기하는 동적 라우팅이 필수적입니다.",
    body_ko: "앤트로픽이 최신 코딩 및 지식 노동 플래그십 모델 Claude Fable 5.1을 배포하며 프롬프트 캐싱 비용을 75% 인하했으나, 일선 개발 팀에서는 총 사용 요금이 오히려 20% 증가했다는 분석이 나왔습니다. Fable 5.1은 얕은 패치 대신 코드베이스 전반의 근본 원인을 파악하도록 훈련되면서, 단일 요청당 내부 추론(CoT) 및 검증 루프를 훨씬 길게 수행하기 때문입니다. 이에 따라 캐시 적중으로 절감된 입력 단가보다 자율 추론으로 생성된 출력 토큰의 폭증분이 더 커지는 이른바 '토큰 역설'이 발생했습니다. 실제 벤치마크 테스트에서도 동일한 과제를 수행할 때 이전 버전 대비 추론 시간이 2배가량 늘어나고 토큰 소모가 3배 가까이 증가한 것으로 확인되었습니다. 복잡한 시스템 버그나 대규모 리팩토링에서는 압도적인 해결률을 보이지만, 단순 반복 작업에 상시 투입하기에는 단위 비용 부담이 커졌습니다. 따라서 개발 환경에서는 작업 난이도에 맞춰 3.5 Sonnet이나 Haiku와 같은 경량 모델로 작업을 분기하는 동적 라우팅 아키텍처가 더욱 중요해졌습니다.",
    tags: ["앤트로픽", "클로드", "Fable5.1", "토큰비용", "추론효율"]
  },
  // 2. aitimes_984803fe5b (model)
  {
    id: "aitimes_984803fe5b",
    signal_id: "model",
    importance: 94,
    title_ko: "메타, 코딩·에이전트 특화 '뮤즈 스파크 1.3' 전격 공개...종합 지능 세계 3위 기록",
    summary_ko: "• **세계 3위 등극**: 메타가 에이전트 자율성과 코딩 성능을 대폭 강화한 최신 플래그십 LLM '뮤즈 스파크 1.3'을 공개했습니다.\n• **벤치마크 역전**: 아티피셜 애널리시스 종합 지능 평가에서 오픈AI 주요 모델들을 제치고 글로벌 3위에 안착했습니다.\n• **가격 경쟁 가속**: 최첨단 성능 대비 공격적으로 저렴한 토큰 단가로 책정되어 기업용 에이전트 시장 경쟁을 촉발하고 있습니다.",
    body_ko: "메타가 에이전트 워크플로우와 장기 코딩 성능을 대폭 강화한 최신 모델 '뮤즈 스파크 1.3(Muse Spark 1.3)'을 공식 발표했습니다. 아티피셜 애널리시스(Artificial Analysis)의 종합 지능 지수 벤치마크에서 오픈AI의 주력 모델들을 앞서며 글로벌 종합 3위 성능을 공인받았습니다. 메타 슈퍼인텔리전스 랩스가 주도한 이번 릴리스는 지난 4월 첫 공개 이후 5개월 만에 선보이는 4번째 판올림으로 초고속 개발 주기를 입증했습니다. 특히 멀티스텝 툴 호출의 신뢰성을 개선하고 긴 문맥 안에서 시스템 제약 조건을 이탈하지 않는 에이전틱 강건성이 크게 보강되었습니다. 최상위권 추론 성능을 제공하면서도 토큰당 API 공급 단가를 경쟁사 플래그십 대비 공격적으로 낮춰 가격 대비 효용을 극대화했습니다. 메타는 자사 개발 도구인 '뮤즈 코드'에 즉각 탑재함과 동시에 엔터프라이즈 API 공급망을 열어 오픈AI 및 앤트로픽과의 점유율 경쟁에 나섰습니다.",
    tags: ["메타", "뮤즈스파크", "코딩모델", "에이전트", "지능벤치마크"]
  },
  // 3. aitimes_07f115b6e3 (product)
  {
    id: "aitimes_07f115b6e3",
    signal_id: "product",
    importance: 92,
    title_ko: "메타, 80ms 초저지연 실시간 음성인식 '뮤즈 보이스 트랜스크라이브' 출시",
    summary_ko: "• **올인원 모델**: 실시간 음성인식, 화자 분리, 발화 종료 감지를 단일 엔드투엔드 엔진으로 통합한 음성 모델이 출시되었습니다.\n• **글로벌 1위 정확도**: 단어 오류율(WER) 3.1%를 달성하여 현존 최고 수준의 음성 스트리밍 인식률을 기록했습니다.\n• **적응형 지연 기술**: 문맥의 모호성에 따라 80밀리초 단위로 속도와 정확도를 스스로 조율해 대화형 에이전트 품질을 극대화합니다.",
    body_ko: "메타가 스트리밍 음성 인식(ASR)과 화자 분리(Diarization), 발화 종료 감지(Endpointing)를 단일 엔진으로 처리하는 '뮤즈 보이스 트랜스크라이브'를 공개했습니다. 기존 음성 파이프라인은 인식 모델과 화자 분리 모델이 분리되어 지연시간이 누적되는 한계가 있었으나, 이번 모델은 모든 태스크를 엔드투엔드로 통합했습니다. 스트리밍 음성 벤치마크에서 단어 오류율 3.1%를 기록하며 현존 최고 성능을 달성함과 동시에 초저지연성을 확보했습니다. 특히 대화 문맥의 복잡성에 맞춰 처리 속도를 80밀리초 단위로 유연하게 조율하는 '적응형 지연(Adaptive Delay)' 기술이 핵심 차별점입니다. 명확한 발화 구간에서는 즉각 텍스트를 뱉어내고 소음이나 겹치는 음성 구간에서는 내부 추론 시간을 살짝 늘려 오인식을 방지합니다. 실시간 음성 기반 대화형 AI 비서 및 고객 응대 에이전트의 자연스러운 상호작용을 뒷받침할 핵심 기술로 평가받습니다.",
    tags: ["메타", "음성인식", "ASR", "적응형지연", "화자분리"]
  },
  // 4. aitimes_78e8efc7a9 (product)
  {
    id: "aitimes_78e8efc7a9",
    signal_id: "product",
    importance: 93,
    title_ko: "구글, 제미나이에 스스로 핵심 장면을 탐색하는 '에이전트 비디오 분석' 기능 도입",
    summary_ko: "• **능동적 구간 탐색**: 영상 전체를 기계적으로 훑는 대신 AI가 질문에 맞는 장면을 스스로 찾아 정밀 분석하는 기술이 도입되었습니다.\n• **비용 획기적 절감**: 1~2시간 이상의 장시간 영상 처리 시 불필요한 토큰 소비와 연산 비용을 대폭 줄였습니다.\n• **개발 편의성**: 별도의 동영상 분할 및 벡터 인덱싱 파이프라인 없이도 API 단일 호출로 특정 사건의 타임스탬프를 추출합니다.",
    body_ko: "구글이 최신 제미나이(Gemini) 모델군에 장시간 영상을 효율적으로 이해하는 '에이전트 기반 비디오 이해(Agentic Video Understanding)' 기술을 도입했습니다. 종전의 비디오 AI는 영상 전체를 초당 정해진 프레임 수대로 무차별 샘플링하여 처리하므로 긴 영상일수록 입력 토큰이 급증하고 세부 장면을 놓치는 문제가 있었습니다. 새로 공개된 방식은 에이전트가 사용자의 질의를 먼저 해석한 뒤 영상의 저해상도 타임라인을 빠르게 스캔하여 유력한 후보 구간으로 점프합니다. 이후 핵심 사건이 발생한 특정 구간에만 고해상도 시각 집중을 적용하여 타임스탬프와 세부 정황을 정밀하게 추출합니다. 이를 통해 수 시간 분량의 보안 영상, 스포츠 경기, 온라인 강의 분석에서 토큰 소비량을 획기적으로 절감할 수 있게 되었습니다. 개발자들은 별도의 동영상 전처리 및 벡터 인덱싱 인프라를 구축할 필요 없이 직관적인 멀티모달 API를 통해 고급 영상 분석을 구현할 수 있습니다.",
    tags: ["구글", "제미나이", "비디오에이전트", "멀티모달", "비용절감"]
  },
  // 5. geeknews_6f4f3aa68e (research)
  {
    id: "geeknews_6f4f3aa68e",
    signal_id: "research",
    importance: 91,
    title_ko: "피지컬 인텔리전스, 단일 파운데이션 모델 기반의 범용 로봇 물리 지능(π0.7) 연구 동향 공개",
    summary_ko: "• **범용 제어 실증**: 단일 파운데이션 모델(π0.7)로 다양한 이기종 로봇 하드웨어와 물리 작업을 통합 제어하는 연구가 공개되었습니다.\n• **높은 신뢰성 입증**: 오프라인 강화학습을 결합해 에스프레소 추출 성공률 90% 달성 및 13시간 연속 자율 가동에 성공했습니다.\n• **미학습 환경 일반화**: 처음 접하는 주방 가전과 식기 환경에서도 도구 조작 원리를 유추해 자율 정리 작업을 완수했습니다.",
    body_ko: "피지컬 인텔리전스(Pi)가 로봇 공학계의 'ChatGPT'를 지향하는 범용 물리 파운데이션 모델 'π0.7'의 최신 연구와 현장 실증 결과를 공개했습니다. 이 연구는 특정 하드웨어에 종속된 개별 제어 모델 대신 단일 대규모 모델이 양팔 로봇, 모바일 매니퓰레이터 등 이기종 하드웨어를 두루 제어하도록 설계되었습니다. 물리 세계에서는 사소한 행동 오류도 치명적인 결과로 이어지므로, 인간의 실패 복구 시연과 오프라인 강화학습을 결합해 불필요한 시행착오를 차단했습니다. 실증 시험에서 복잡한 수동 조작이 필요한 에스프레소 머신 다루기에서 90% 이상의 성공률을 거두었으며 13시간 연속 음료 제조 시험을 안정적으로 완수했습니다. 또한 10~15분간 이어지는 자율 주방 정리 작업에서도 처음 마주친 식기와 가전제품의 위치와 작동 방식을 즉각 유추해 조작했습니다. 디지털 공간의 텍스트·시각 추론을 넘어 현실 물리 공간과 상호작용하는 임바디드 AI의 상용화 가능성을 한 단계 끌어올린 성과로 꼽힙니다.",
    tags: ["피지컬인텔리전스", "로보틱스", "파운데이션모델", "임바디드AI", "강화학습"]
  },
  // 6. geeknews_6b1c2e6ea5 (practice)
  {
    id: "geeknews_6b1c2e6ea5",
    signal_id: "practice",
    importance: 86,
    title_ko: "AI 시대에 인간 고유의 글쓰기가 가장 안전한 직업으로 남을 수 있는 이유",
    summary_ko: "• **난해한 문제(Wicked Problem)**: 정답과 명세가 명확한 코드와 달리, 산문 글쓰기는 정답 기준이 없어 기계적 대체의 장벽이 높습니다.\n• **마음 이론(Theory of Mind)**: 독자의 인지 상태와 감정적 반응을 섬세하게 추적하고 공감하는 능력은 인간 필자의 핵심 비교우위입니다.\n• **비용이 큰 신호(Costly Signal)**: AI 생성 텍스트가 범람할수록 인간의 깊은 육체적·정신적 고뇌가 담긴 글이 더 높은 희소성을 지닙니다.",
    body_ko: "컴퓨터 과학자 무라트 데미르바스 교수가 인공지능이 코딩과 텍스트 생성을 장악하는 시대에 역설적으로 깊이 있는 글쓰기가 가장 안전한 인간의 영역으로 남을 것이라는 논평을 발표했습니다. 코드 작성은 문법 검사기나 단위 테스트를 통해 기계적으로 정답 여부를 판정할 수 있지만, 글쓰기는 완결성이나 명세가 고정되지 않은 난해한 문제(Wicked Problem)이기 때문입니다. LLM은 유려한 문장 구조를 흉내 낼 수는 있으나, 독자가 현재 어디까지 알고 있고 다음 문장에서 어떤 감정과 인식을 가질지 예측하는 정교한 마음 이론(Theory of Mind)을 온전히 수행하지 못합니다. 인공지능이 값싸고 방대한 양의 텍스트를 웹에 쏟아낼수록, 실제 육체적 고뇌와 직접적인 실천 경험이 녹아든 인간의 목소리는 모방하기 어려운 '비용이 큰 신호(Costly Signal)'로서 더 높은 가치를 지니게 됩니다. 결국 AI 도구를 활용해 단순 초안을 찍어내는 것과, 독자를 설득하고 새로운 관점을 제시하는 진정한 작문 행위 사이의 격차가 벌어지고 있습니다. 엔지니어와 기획자에게도 단순한 프롬프트 주입보다 논리적인 구조화와 비판적 검증을 담아내는 인간 고유의 글쓰기 역량이 더욱 절실해지고 있습니다.",
    tags: ["글쓰기", "마음이론", "기술에세이", "인지능력", "인간비교우위"]
  },
  // 7. hackernews_fd2be60969 (devtool)
  {
    id: "hackernews_fd2be60969",
    signal_id: "devtool",
    importance: 94,
    title_ko: "Aura 공개 — 페타바이트 규모 인프라 장애를 스스로 조사·복구하는 Rust 기반 오픈소스 SRE 에이전트",
    summary_ko: "• **프로덕션 장애 자율 복구**: 수 페타바이트 인프라를 운영하는 Mezmo가 인시던트를 스스로 진단하고 복구하는 Rust 에이전트를 오픈소스로 공개했습니다.\n• **토큰 낭비·환각 차단**: 범용 에이전트의 고질적 문제인 컨텍스트 폭주를 차단하고 메모리 안전성을 갖춘 독립 하네스로 설계되었습니다.\n• **eBPF 수준 관측성**: 엄격한 RBAC 정책 하에 시스템 지표와 트레이스를 신속히 탐색하여 온콜 엔지니어의 승인 피로를 최소화합니다.",
    body_ko: "수 페타바이트의 로그 데이터를 다루는 인프라 기업 Mezmo가 실제 프로덕션 장애 대응에 투입해 온 Rust 기반 자율 SRE 하네스 'Aura'를 오픈소스로 전격 공개했습니다. 개발진은 범용 코딩 에이전트를 운영 환경에 도입했을 때 컨텍스트 오버플로우와 환각으로 인해 불필요한 토큰이 낭비되고 보안 권한 완화 위험이 발생했던 문제를 해결하고자 자체 개발에 착수했습니다. Aura는 Rust의 고성능 및 메모리 안전성을 기반으로 제작되었으며 엄격한 격리 환경에서 시스템 지표와 에러 트레이스를 신속히 탐색합니다. 쿠버네티스 클러스터와 리눅스 서버에 eBPF 수준의 관측성을 접목하여 안전한 읽기 전용 진단과 통제된 복구 스크립트 실행만을 엄격히 허용합니다. 장애 발생 시 온콜 엔지니어가 수작업으로 수십 개의 대시보드를 뒤지는 수고를 덜고 근본 원인 후보와 패치 계획을 단 수 초 만에 브리핑합니다. 엔터프라이즈 환경에서 코딩 에이전트를 넘어 데브옵스(DevOps) 및 인프라 운영 영역으로 자율 에이전트의 실전 배치가 확산되는 대표적인 사례입니다.",
    tags: ["Aura", "Rust", "SRE", "인프라장애", "데브옵스에이전트"]
  },
  // 8. hackernews_6f8d25a712 (devtool)
  {
    id: "hackernews_6f8d25a712",
    signal_id: "devtool",
    importance: 92,
    title_ko: "WebLLM — 외부 서버 없이 브라우저 내에서 WebGPU로 초고속 구동되는 로컬 LLM 추론 엔진",
    summary_ko: "• **서버 제로 추론**: 백엔드 서버 지원 없이 사용자의 브라우저 내에서 순수 WebGPU 가속으로 오픈소스 LLM을 고속 구동합니다.\n• **OpenAI API 완벽 호환**: 기존 스트리밍 채팅, 함수 호출(Tool Calling), JSON 출력 코드를 수정 없이 그대로 브라우저로 이식할 수 있습니다.\n• **완벽한 데이터 프라이버시**: 민감한 사용자 데이터가 외부 클라우드로 전혀 유출되지 않으며 서버 호스팅 비용을 0원으로 만듭니다.",
    body_ko: "MLC-AI 팀이 개발한 'WebLLM'이 브라우저 네이티브 WebGPU 하드웨어 가속 성능을 대폭 개선하며 클라이언트 측 로컬 AI 시대를 본격화하고 있습니다. 별도의 백엔드 추론 서버나 외부 클라우드 API 호출 없이 사용자의 웹 브라우저 내부에서 Llama 3, Qwen, Phi 등 주요 오픈 웨이트 모델을 고속으로 직접 연산합니다. 표준 WebGPU 그래픽 파이프라인과 WebAssembly를 최적화하여 네이티브 GPU 드라이버에 준하는 토큰 생성 속도를 브라우저 탭 위에서 실현했습니다. 특히 OpenAI 표준 API와 100% 호환되도록 엔드포인트를 설계하여 기존에 구축된 스트리밍 채팅, 구조화된 JSON 출력, 도구 호출 로직을 코드 변경 없이 연동할 수 있습니다. 사용자의 민감한 텍스트나 사내 기밀 데이터가 브라우저 메모리 안에서만 처리되고 휘발되므로 완벽한 프라이버시 보호를 보장합니다. 고가의 추론 서버 호스팅 비용을 획기적으로 없애고 웹 애플리케이션에 지능형 에이전트 기능을 가볍게 심으려는 프론트엔드 개발자들에게 강력한 솔루션이 되고 있습니다.",
    tags: ["WebLLM", "WebGPU", "브라우저추론", "프라이버시", "로컬AI"]
  },
  // 9. hackernews_fe8b358fee (research)
  {
    id: "hackernews_fe8b358fee",
    signal_id: "research",
    importance: 90,
    title_ko: "LLM 평가자는 '존재'만 보고 '누락'을 못 본다 — 의료 임상 기록에서 드러난 누락 맹목(Omission Blindness) 연구",
    summary_ko: "• **누락 맹목(Omission Blindness)**: LLM 평가자(LLM-as-a-Judge)가 허위 사실은 잘 잡지만 정작 치명적인 '정보 누락'은 정상으로 오판하는 결함이 밝혀졌습니다.\n• **임상 기록 위험성**: 환자의 약물 알레르기나 필수 주의사항이 통째로 빠진 진료 요약문에도 LLM 평가자가 만점에 가까운 점수를 부여했습니다.\n• **역방향 검증 제안**: 원본 문서의 핵심 사실 체크리스트를 추출해 요약문과 1:1 대조하는 프롬프팅 파이프라인으로 탐지율을 복원했습니다.",
    body_ko: "의료 및 컴퓨터 언어학 연구진이 arXiv에 공개한 논문에서 LLM을 평가자로 활용할 때 발생하는 구조적 결함인 '누락 맹목(Omission Blindness)'을 실험적으로 증명했습니다. LLM 기반 평가자(LLM Judge)는 텍스트에 적힌 허위 사실이나 환각에 대해서는 높은 탐지율을 보이지만, 원본 컨텍스트에 반드시 포함되어야 할 핵심 정보가 아예 누락되었을 때는 이를 정상적인 요약으로 오판하는 경향이 강했습니다. 실제 임상 진료 메모 작성 환경에서 환자의 특정 약물 부작용이나 필수 복약 주의사항이 통째로 빠졌음에도 평가 모델은 문장이 자연스럽다는 이유로 만점에 가까운 점수를 부여했습니다. 이는 LLM의 주의 메커니즘(Attention)이 존재하는 토큰 간의 상관관계 계산에 특화되어 있어 '부재(Absence)'의 위험성을 논리적으로 인지하지 못하기 때문입니다. 연구진은 이를 극복하기 위해 원본 문서의 핵심 사실 체크리스트를 먼저 추출한 뒤 요약문과 1:1 대조하는 역방향 검증(Negative Fact Verification) 프롬프팅 파이프라인을 구축해 탐지 성능을 복원했습니다. 법률, 의료, 보안 등 정보 누락이 치명적인 위험을 초래하는 도메인에서 자동 평가 시스템을 설계할 때 반드시 고려해야 할 경종을 울리고 있습니다.",
    tags: ["LLM평가", "누락맹목", "임상데이터", "환각검증", "신뢰성"]
  },
  // 10. hackernews_50dd7b6bdc (practice)
  {
    id: "hackernews_50dd7b6bdc",
    signal_id: "practice",
    importance: 89,
    title_ko: "AI 에이전트 시대, 왜 엔지니어들은 시스템 리팩토링을 영원히 미루게 되었는가",
    summary_ko: "• **리팩토링의 실종**: 코딩 에이전트 보급 이후 팀 내에서 레거시 시스템 구조 개선과 근본적인 코드 재설계가 사라진 현실을 고발했습니다.\n• **스파게티 코드 땜질**: 복잡하게 얽힌 코드 위에서도 에이전트가 우회 패치를 쉽게 붙여주다 보니 아키텍처를 개선할 동기가 상실됩니다.\n• **기술 부채 폭탄**: 단기 납기는 달성되지만 에이전트의 컨텍스트 한계치를 초과하는 잠재적 기술 부채가 급격히 누적되고 있습니다.",
    body_ko: "소프트웨어 개발 현장에서 AI 코딩 에이전트의 활용이 일상화되면서 복잡한 레거시 코드를 근본적으로 재설계하는 '리팩토링' 작업이 급격히 사라지고 있다는 경고가 제기되었습니다. 과거에는 코드베이스의 결합도가 지나치게 높아지면 인간 개발자가 인지 과부하를 견디지 못하고 구조를 단순화하는 리팩토링을 단행하곤 했습니다. 그러나 현대의 고성능 에이전트는 기괴하게 꼬인 수천 줄의 레거시 코드 속에서도 지시된 기능 패치와 우회 코드를 거침없이 덧붙여 동작하게 만듭니다. 그 결과 숙련된 엔지니어들조차 낡은 아키텍처를 뒤엎고 설계를 다듬기보다 에이전트에게 땜질식 구현을 맡기고 넘어가는 타성에 젖어들고 있습니다. 당장은 개발 속도가 유지되는 것처럼 보이지만, 내재된 기술 부채는 에이전트의 유효 컨텍스트 윈도우와 추론 역량이 감당할 수 있는 임계치를 향해 급격히 누적됩니다. 결국 아키텍처의 단순성을 지키는 절제력이야말로 AI 시대에 인간 엔지니어가 놓쳐서는 안 될 가장 중요한 엔지니어링 덕목임이 강조되고 있습니다.",
    tags: ["리팩토링", "기술부채", "소프트웨어공학", "에이전트개발", "아키텍처"]
  },
  // 11. github_f32a5ebb28 (devtool)
  {
    id: "github_f32a5ebb28",
    signal_id: "devtool",
    importance: 94,
    title_ko: "[업데이트] Codex with ChatGPT — 'ChatGPT가 생각하고 Codex가 일한다' 뇌와 손을 분리한 에이전트 아키텍처",
    summary_ko: "• **두뇌와 손발의 분업**: 아키텍처 기획과 심층 추론은 ChatGPT에 맡기고, 로컬 파일 패치와 터미널 실행은 Codex 하네스에 위임했습니다.\n• **급격한 스타 성장**: 하루 414개의 스타를 추가하며 누적 2,273스타를 돌파하여 실전 멀티에이전트 표준 분업 모델로 주목받았습니다.\n• **비용·정확도 최적화**: 단일 모델의 컨텍스트 오염을 막아 값비싼 최상위 모델의 토큰 낭비를 줄이고 복합 프로젝트 완수율을 끌어올렸습니다.",
    body_ko: "GitHub에서 하루 414개의 스타를 추가하며 누적 2,200스타를 돌파한 오픈소스 도구 'Codex with ChatGPT'가 개발자들의 뜨거운 관심을 받고 있습니다. 이 프로젝트는 'ChatGPT는 생각하고, Codex는 일한다(ChatGPT thinks, Codex works)'라는 명쾌한 슬로건 아래 두뇌와 실행 손발을 물리적으로 분리한 아키텍처를 취합니다. 대규모 코드베이스의 구조 분석, 작업 분할, 아키텍처 설계 등 깊은 사고력이 필요한 기획 단계는 ChatGPT의 고지능 추론 모델에 전담시킵니다. 이후 생성된 구체적인 실행 계획과 변경 명세를 로컬 터미널 및 파일 시스템 제어에 특화된 Codex CLI 하네스에 전달하여 실제 수술적 패치를 진행합니다. 단일 모델에 계획 수립부터 단순 파일 탐색까지 모든 역할을 맡겨 발생하던 컨텍스트 오염과 토큰 낭비를 원천적으로 차단했습니다. 복잡한 모노레포 환경에서도 환각 없이 일관된 코드 품질을 유지할 수 있어 실전 엔지니어링 에이전트의 새로운 표준 분업 모델로 주목받고 있습니다.",
    tags: ["Codex", "ChatGPT", "에이전트아키텍처", "하네스", "오픈소스"]
  },
  // 12. github_5705dd356e (oss)
  {
    id: "github_5705dd356e",
    signal_id: "oss",
    importance: 91,
    title_ko: "Reverify — 환각 없이 결정론적 도구로 바이너리를 정밀 검증하는 오픈소스 역공학 AI 에이전트",
    summary_ko: "• **결정론적 검증**: LLM의 확률적 추측을 배제하고 디스어셈블러와 디버거의 실제 반환값을 교차 대조하여 바이너리를 분석합니다.\n• **역공학 환각 박멸**: 가상의 어셈블리 로직을 지어내는 기존 보안 AI의 한계를 극복하고 증거 기반의 신뢰성 높은 리포트를 산출합니다.\n• **MCP 표준 연동**: Frida, 동적 훅, 파워셸 자동화를 표준 프로토콜로 통합하여 악성코드 분석과 취약점 점검을 자동화했습니다.",
    body_ko: "보안 연구자 2akouwu가 개발한 'Reverify'가 LLM 기반 역공학의 고질적인 약점인 환각 문제를 해결하며 오픈소스 커뮤니티의 지지를 얻고 있습니다. 기존 AI 에이전트들은 컴파일된 바이너리를 분석할 때 어셈블리 코드의 세부 동작을 그럴듯하게 날조하거나 존재하지 않는 로직을 지어내는 한계가 있었습니다. Reverify는 에이전트가 내놓은 모든 분석 가설을 실제 디스어셈블러와 정적·동적 바이너리 분석 도구의 반환값과 대조하여 엄격하게 교차 검증합니다. 역공학 대상 바이너리를 직접 디버깅하고 레지스터 상태와 메모리 덤프를 추출하는 도구 체계를 MCP(Model Context Protocol) 기반으로 표준화했습니다. 보안 엔지니어는 악성코드의 C2 통신 규격이나 숨겨진 백도어 로직을 분석할 때 에이전트의 주관적 추측이 아닌 검증된 증거 기반의 보고서를 받아볼 수 있습니다. 보안 감사 및 CTF 경진대회 워크플로우를 자동화하는 데 즉시 도입 가능한 실전 중심의 에이전틱 도구입니다.",
    tags: ["Reverify", "역공학", "바이너리분석", "보안", "결정론적검증"]
  },
  // 13. github_43fc5b66b4 (oss)
  {
    id: "github_43fc5b66b4",
    signal_id: "oss",
    importance: 92,
    title_ko: "x64dbg-MCP Server — x64dbg 네이티브 디버거를 AI 에이전트와 완벽 연동하는 Zig 기반 경량 플러그인",
    summary_ko: "• **Zig 기반 네이티브 플러그인**: 외부 런타임 종속성 없는 초경량 단일 DLL 형태로 컴파일되어 x64dbg 디버거 내부에서 완벽히 구동됩니다.\n• **AI와 디버거의 직결**: Claude Code, Codex 등 최신 에이전트가 HTTP를 통해 중단점 설정, 메모리 덤프, 레지스터 조작을 직접 제어합니다.\n• **리버스 엔지니어링 혁신**: 난독화된 악성코드가 메모리에 언패킹되는 순간을 AI가 포착해 대화형으로 원인을 규명합니다.",
    body_ko: "개발자 duty1g가 개발한 'x64dbg-MCP Server'가 누적 1,800스타를 넘어서며 윈도우 네이티브 리버스 엔지니어링 생태계에 새로운 바람을 일으키고 있습니다. 이 프로젝트는 대표적인 윈도우용 오픈소스 디버거인 x64dbg의 전체 디버깅 인터페이스를 모델 컨텍스트 프로토콜(MCP) 규격으로 외부에 노출하는 네이티브 플러그인입니다. 고성능 시스템 언어인 Zig로 작성되어 외부 런타임 종속성 없이 단일 DLL 파일 형태로 가볍게 빌드되며 디버거 프로세스 내부에 완벽히 상주합니다. Claude Code나 Codex 같은 최신 AI 에이전트는 HTTP 통신을 통해 디버거에 브레이크포인트를 걸고 한 줄씩 코드를 실행하며 레지스터와 스택 메모리를 실시간 조회할 수 있습니다. 난독화된 악성 소프트웨어가 메모리에 풀리는 순간을 에이전트가 감지해 가로채거나 크래시 덤프의 원인을 대화형으로 파헤치는 작업이 가능해졌습니다. 전통적인 리버스 엔지니어링 도구가 최신 AI 에이전트 하네스와 어떻게 결합할 수 있는지를 명확히 보여주는 모범 사례입니다.",
    tags: ["x64dbg", "MCP", "Zig", "디버거", "보안분석"]
  },
  // 14. github_2b289e3e32 (oss)
  {
    id: "github_2b289e3e32",
    signal_id: "oss",
    importance: 88,
    title_ko: "agent-fleet-manager — 대규모 멀티 워커 에이전트의 정기 수집과 중복 작업을 스케줄링하는 범용 엔진",
    summary_ko: "• **멀티 워커 오케스트레이션**: 수많은 수집 크롤러와 LLM 에이전트 군단을 배치 단위 작업 임대(Lease) 방식으로 분산 스케줄링합니다.\n• **콘텐츠 해시 중복 차단**: 수집 결과의 변경 여부를 해시 알고리즘으로 즉시 판별해 불필요한 LLM 재호출 토큰 소모를 원천 차단합니다.\n• **지수 백오프 안정성**: 대상 사이트의 일시적 장애나 속도 제한(Rate Limit)에 유연하게 대응하여 데이터 파이프라인 신뢰성을 보장합니다.",
    body_ko: "연구 조직 dreamers-laboratory가 대규모 정보 수집 워크플로우를 담당하는 에이전트 군단을 체계적으로 지휘하기 위한 오픈소스 프레임워크 'agent-fleet-manager'를 발표했습니다. 다수의 LLM 에이전트나 크롤러를 동시에 가동할 때 동일한 대상을 중복 처리하거나 장애 발생 시 작업이 유실되는 고질적 운영 난제를 해결하기 위해 고안되었습니다. 사용자가 주기적으로 확인할 대상과 주기를 등록하면 엔진이 분산 워커들에게 작업을 격리된 배치 단위로 임대(Lease) 방식으로 할당합니다. 수집된 결과물은 콘텐츠 해시(Hash) 알고리즘을 통해 이전 데이터와의 실질적인 변경 여부를 즉각 판별하므로 변경이 없는 대상에 대한 LLM 재호출 토큰 낭비를 원천 차단합니다. 실패한 작업에 대해서는 지수 백오프(Exponential Backoff)를 적용해 외부 타깃 서버의 블록을 회피하고 전체 군단의 상태를 통합 모니터링합니다. 대규모 웹 인텔리전스, 경쟁사 동향 모니터링, 자동화된 시장 조사를 수행하는 프로덕션 에이전트 시스템에 최적화된 백본 인프라입니다.",
    tags: ["에이전트함대", "스케줄러", "멀티워커", "데이터파이프라인", "오픈소스"]
  },
  // 15. reddit_b1541d00c6 (practice)
  {
    id: "reddit_b1541d00c6",
    signal_id: "practice",
    importance: 87,
    title_ko: "추론 속도(t/s) 극대화의 함정 — 최신 모델 Qwen 3.8보다 3.6이 협업 코딩에 더 나은 이유",
    summary_ko: "• **과도한 엔지니어링 경계**: 최신 모델(Qwen 3.8)이 2줄짜리 수정 요청에 100줄의 장황한 타입과 예외 처리를 붙여 실무 검토를 방해한다는 지적입니다.\n• **스타일 준수의 미덕**: 구버전(3.6) 모델이 프로젝트의 기존 네이밍과 코드 레이아웃을 존중하며 깔끔한 원포인트 수술을 수행했습니다.\n• **협업 코딩 시사점**: 벤치마크 점수나 초당 토큰 속도(t/s)보다 프로젝트 기존 규칙을 조용히 따르는 절제력이 훨씬 중요합니다.",
    body_ko: "Reddit의 오픈소스 AI 커뮤니티 r/LocalLLaMA에서 최신 고성능 모델의 초당 토큰 생성 속도(t/s) 경쟁에 매몰되지 말아야 한다는 현업 엔지니어의 경험담이 뜨거운 공감을 얻었습니다. 글쓴이는 최신 Qwen 3.8 모델이 벤치마크 점수와 복잡한 알고리즘 작성 능력은 뛰어나지만 실무 협업 관점에서는 오히려 최악의 동료가 될 수 있다고 꼬집었습니다. 기존 스크립트의 2줄짜리 로직 수정을 지시했을 때, 3.8 모델은 요청하지도 않은 엄격한 타입 정의와 복잡한 예외 처리를 무리하게 끼워 넣어 100줄이 넘는 산만한 코드 덩어리를 만들어냈습니다. 반면 구버전인 3.6 모델은 작성자가 유지해 온 코드 스타일과 디렉토리 관례를 정확히 존중하며 단 한 번의 프롬프트로 깔끔한 원포인트 수정을 완수했습니다. 많은 실무 개발자들은 에이전트의 지능이 높아질수록 사용자의 기존 맥락을 무시하고 과도한 엔지니어링(Over-engineering)을 시도하는 경향을 경계해야 한다고 입을 모았습니다. 실제 프로덕션 환경에서는 화려하고 긴 코드를 자랑하는 모델보다 프로젝트의 기존 규격을 조용히 따르는 수술적 변경 능력이 훨씬 더 중요한 미덕으로 작용하고 있습니다.",
    tags: ["로컬LLM", "코딩에이전트", "Qwen", "코드리뷰", "실무경험"]
  },
  // 16. reddit_1dcfa30848 (research)
  {
    id: "reddit_1dcfa30848",
    signal_id: "research",
    importance: 89,
    title_ko: "마인벤치(MineBench) 실측 비교 — Claude Fable 5.1은 5 대비 추론 시간 2배, 비용 3배 소모",
    summary_ko: "• **추론 비용 2.7배 증가**: 동일한 15개 건축 과제에서 Fable 5(54달러) 대비 최신 5.1 버전은 147달러의 API 비용이 소모되었습니다.\n• **추론 시간 2배 소요**: 단일 빌드당 평균 연산 시간이 18분에서 40분으로 늘어나며 내부 검증 토큰 소비가 대폭 확장되었습니다.\n• **장기 추론의 트레이드오프**: 복잡한 3D 공간 추론 품질은 눈에 띄게 개선되었으나 에이전트 과제에서 장기 추론 토큰이 지출을 좌우함을 증명했습니다.",
    body_ko: "Reddit r/ClaudeAI 커뮤니티에서 마인크래프트 복합 건축 벤치마크인 MineBench를 활용해 Claude Fable 5와 차세대 Fable 5.1의 실제 추론 효율을 직접 비교한 실측 데이터가 공개되었습니다. 동일한 난이도의 15가지 가상 건축 과제를 부여한 결과, 단일 빌드당 평균 소요 시간이 18분 4초에서 40분 12초로 2배 이상 길어졌습니다. 공식 API 토큰 단가 변동이 없었음에도 불구하고 15개 빌드를 완수하는 데 들어간 총비용은 54.9달러에서 147.5달러로 2.7배 가까이 급증했습니다. 분석 결과 생성된 최종 JSON 데이터 크기는 유사했으나 모델이 복잡한 블록 배치와 공간적 제약을 풀기 위해 내부 생각(Thinking) 체인을 길게 확장한 것이 비용 증가의 주원인이었습니다. Fable 5.1은 복잡한 공간 추론과 물리적 간섭 회피에서는 월등한 완성도를 보였으나 그에 비례해 토큰 연산량이 크게 늘어났습니다. 앤트로픽이 캐시 비용 인하를 앞세워 경제성을 강조했음에도 불구하고, 다단계 에이전트 과제에서는 장기 추론 토큰 소비가 전체 지출을 좌우함을 실증한 중요한 사례입니다.",
    tags: ["마인벤치", "Fable5.1", "추론비용", "벤치마크", "공간추론"]
  },
  // 17. bluesky_defa1930ff (devtool)
  {
    id: "bluesky_defa1930ff",
    signal_id: "devtool",
    importance: 93,
    title_ko: "MCP는 에이전트 도구 문제를 절반만 해결했다 — 동적 도구 검색(ARD)의 필요성 대두",
    summary_ko: "• **도구 발견의 병목**: MCP가 도구 연결 규격은 확립했으나 에이전트가 어떤 도구를 써야 할지 찾는 사전 검색 메커니즘을 놓쳤습니다.\n• **컨텍스트 잠식 문제**: 수백 개의 MCP 서버를 연결하면 도구 스키마 설명만으로 수만 토큰이 소모되어 본래 추론 품질을 저해합니다.\n• **ARD 규격 대두**: 실행 시점에 필요한 도구만을 중앙 레지스트리에서 동적으로 쿼리해 주입하는 ARD 표준이 대안으로 급부상하고 있습니다.",
    body_ko: "소프트웨어 엔지니어링 전문지 더 뉴 스택(The New Stack)이 앤트로픽 주도의 MCP(Model Context Protocol)가 직면한 구조적 병목과 이를 극복하기 위한 새로운 도구 발견 규격을 조명했습니다. MCP는 AI 에이전트가 외부 데이터베이스나 개발 도구와 표준화된 규격으로 통신할 수 있는 길을 열었으나, 에이전트가 어떤 도구를 언제 호출해야 할지 결정하는 사전 검색 단계를 간과했습니다. 실제로 수십 개 이상의 MCP 서버를 등록하면 각 도구의 스키마와 설명 텍스트가 모델의 컨텍스트 창 수만 토큰을 차지해 프롬프트 비용을 폭증시키고 모델을 혼란에 빠뜨립니다. 에이전트는 모든 도구를 미리 컨텍스트에 싣고 시작할 것이 아니라, 주어진 질문에 맞는 도구를 중앙 디렉토리에서 동적으로 쿼리해 로드해야 합니다. 이러한 문제를 해결하기 위해 런타임에 필요한 MCP 도구만을 선별적으로 인출하여 주입하는 ARD(Agent Resource Discovery) 명세가 오픈소스 표준으로 급부상하고 있습니다. 에이전트 도구 생태계가 단순한 연결 프로토콜을 넘어 확장 가능한 분산 레지스트리와 동적 라우팅 단계로 진화하고 있음을 시사합니다.",
    tags: ["MCP", "ARD", "도구발견", "컨텍스트최적화", "에이전트아키텍처"]
  },
  // 18. bluesky_b36f567d80 (practice)
  {
    id: "bluesky_b36f567d80",
    signal_id: "practice",
    importance: 85,
    title_ko: "AGENTS.md와 CLAUDE.md 지침 파일의 실제 영향력과 올바른 작성법",
    summary_ko: "• **추상적 훈계의 무용성**: \"깔끔한 코드를 작성하라\" 같은 장황한 코딩 철학은 에이전트의 실제 생성 코드에 거의 영향을 주지 못합니다.\n• **구체적 도구 명시의 효과**: 특정 빌드/테스트 CLI 명령어와 허용된 린터 도구를 직접 지정했을 때만 모델의 행동이 유의미하게 변화했습니다.\n• **압축 작성 가이드**: 긴 문맥 속에서 충돌과 무시를 막기 위해 지침 파일은 검증 가능한 명령어 위주로 간결하게 압축해야 합니다.",
    body_ko: "소프트웨어 분석 매체 피벗투AI(Pivot to AI)가 최근 모든 AI 코딩 에이전트 프로젝트의 필수 관행으로 자리 잡은 가이드라인 파일(AGENTS.md, CLAUDE.md)의 실질적 효용성을 실증 분석했습니다. 앤트로픽과 주요 개발사들은 프로젝트 루트에 규칙 파일을 두면 에이전트가 프로젝트 스타일을 완벽히 준수할 것이라고 홍보하지만 실제 영향력은 제한적이었습니다. 수많은 테스트 결과 '깔끔한 코드를 작성하라'거나 '중복을 피하라' 같은 추상적 훈계는 모델의 실제 코드 생성 과정에서 거의 반영되지 않았습니다. 지침 파일에서 실제로 모델의 행동을 유의미하게 변화시킨 유일한 요소는 '어떤 단위 테스트 명령어를 실행해야 하는가'나 '특정 CLI 도구를 호출하라'는 구체적인 도구 명시뿐이었습니다. 모델의 긴 문맥 속에서 시스템 프롬프트와 지침 파일이 충돌할 경우 파일의 세부 지침이 쉽게 무시되는 특성도 확인되었습니다. 따라서 프로젝트 지침 파일은 방대한 코딩 철학을 나열하기보다 검증 가능한 빌드 명령과 허용된 외부 도구 목록 위주로 압축하여 작성하는 것이 가장 효과적입니다.",
    tags: ["AGENTS.md", "CLAUDE.md", "프롬프트엔지니어링", "코딩규칙", "개발팁"]
  }
];

const processedNews = CURATED_ITEMS.map(item => {
  const c = map.get(item.id);
  if (!c) throw new Error(`Missing candidate: ${item.id}`);

  // Count sentences in body_ko
  const sentences = item.body_ko.split(/(?<=[.?!])\s+/).filter(Boolean);
  if (sentences.length < 5 || sentences.length > 10) {
    throw new Error(`Sentence count out of range (${sentences.length}) for ${item.id}`);
  }

  // Check 3 bullets in summary_ko
  const bullets = item.summary_ko.split("\n").filter(l => l.startsWith("• "));
  if (bullets.length !== 3) {
    throw new Error(`Summary must have exactly 3 bullets for ${item.id}`);
  }

  return {
    id: c.id,
    source: c.source,
    source_name: SOURCE_NAMES[c.source] || c.source,
    category_id: c.source,
    category_name: SOURCE_NAMES[c.source] || c.source,
    url: c.url,
    title_ko: item.title_ko,
    summary_ko: item.summary_ko,
    body_ko: item.body_ko,
    signal_id: item.signal_id,
    signal_name: SIGNALS[item.signal_id],
    importance: item.importance,
    author_profile: c.author,
    curated_by: CURATED_BY,
    publish_date: c.publish_date || new Date().toISOString(),
    metrics: c.metrics || {},
    sources: c.sources || [c.source],
    tags: item.tags || [],
    ...(c.is_update ? { is_update: true, prev_stars: c.prev_stars, star_growth_pct: c.star_growth_pct } : {})
  };
});

const signalCounts = {};
const sourceCounts = {};
processedNews.forEach(n => {
  signalCounts[n.signal_id] = (signalCounts[n.signal_id] || 0) + 1;
  sourceCounts[n.source] = (sourceCounts[n.source] || 0) + 1;
});

const headline = processedNews[0].title_ko;
const summary = "🔥 오늘의 핵심 이슈: #추론비용역설 #에이전틱비디오 #SRE자율에이전트 #MCP도구발견 — 앤트로픽 Fable 5.1의 실측 비용 역설과 메타의 멀티모달 모델 공세, 프로덕션 자율 운영 에이전트와 도구 생태계 고도화가 두드러진 하루였습니다. ldk-hub에서 큐레이션 하였습니다.";

const latestData = {
  version: VERSION,
  generated_at: new Date().toISOString(),
  date: TODAY,
  curated_date: TODAY,
  curated_by: CURATED_BY,
  headline: headline,
  summary: summary,
  total_items: processedNews.length,
  signal_counts: signalCounts,
  source_counts: sourceCounts,
  news: processedNews
};

// 1. Save to site/public/data/news_latest.json
fs.writeFileSync(LATEST_FILE, JSON.stringify(latestData, null, 2));
console.log(`Saved ${processedNews.length} items to ${LATEST_FILE}`);

// 2. Save archive
const archiveName = `news_${TODAY}.json`;
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_ARCHIVE_DIR, { recursive: true });
fs.writeFileSync(path.join(ARCHIVE_DIR, archiveName), JSON.stringify(latestData, null, 2));
fs.writeFileSync(path.join(PUBLIC_ARCHIVE_DIR, archiveName), JSON.stringify(latestData, null, 2));
console.log(`Saved archive ${archiveName} to data/archive and site/public/data/archive`);

// 3. Update news_index.json in both locations
function updateIndex(idxPath) {
  let idx = { archives: [] };
  if (fs.existsSync(idxPath)) {
    try {
      idx = JSON.parse(fs.readFileSync(idxPath, "utf8"));
      if (!idx.archives) idx.archives = [];
    } catch(e) {}
  }
  idx.archives = idx.archives.filter(a => a.file !== archiveName);
  idx.archives.unshift({
    file: archiveName,
    date: TODAY,
    version: VERSION,
    generated_at: latestData.generated_at,
    total_count: processedNews.length,
    signal_counts: signalCounts,
    headline: headline
  });
  idx.updated_at = new Date().toISOString();
  fs.writeFileSync(idxPath, JSON.stringify(idx, null, 2));
  console.log(`Updated news_index.json at ${idxPath}`);
}

updateIndex(path.join(ARCHIVE_DIR, "news_index.json"));
updateIndex(path.join(PUBLIC_ARCHIVE_DIR, "news_index.json"));

console.log("\nSignal counts:", signalCounts);
console.log("Source counts:", sourceCounts);
