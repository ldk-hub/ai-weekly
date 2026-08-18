const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CANDIDATES_PATH = path.join(ROOT, '.tmp', 'news_candidates.json');
const LATEST_PATH = path.join(ROOT, 'site', 'public', 'data', 'news_latest.json');
const ARCHIVE_DIR = path.join(ROOT, 'site', 'public', 'data', 'archive');
const DATA_ARCHIVE_DIR = path.join(ROOT, 'data', 'archive');

const raw = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
const factMap = new Map(raw.candidates.map(c => [c.id, c]));

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

const CURATED_ITEMS = [
  // === GEEKNEWS ===
  {
    id: "geeknews_499ab5d340",
    signal_id: "devtool",
    importance: 78,
    title_ko: "깃허브의 잦은 장애와 대안 코드 호스팅 전환에 대한 개발자 고찰",
    title_en: "Is it reasonable to switch to GitHub alternatives?",
    summary_ko: "• 최근 깃허브의 반복적인 서비스 장애로 인해 개발 커뮤니티에서 대안 호스팅으로의 이전 타당성이 활발히 논의되고 있습니다.\n• GitLab, Sourcehut, Forgejo, Radicle 등 대안 플랫폼들이 거론되나 생태계 종속성과 마이그레이션 비용이 주요 장벽으로 지적됩니다.\n• 단일 플랫폼 장애에 대비하여 CI/CD 미러링과 탈중앙화 코드 백업 전략을 수립하는 계기가 되고 있습니다.",
    body_ko: "최근 몇 달간 발생한 깃허브의 잇단 서비스 장애로 인해 개발 생산성에 심각한 차질을 빚으면서 대안 플랫폼 전환에 대한 개발자들의 관심이 급증했습니다. 많은 엔지니어들이 GitLab, Sourcehut, Codeberg, Forgejo 등 독립형 및 오픈소스 대안을 진지하게 검토하고 있습니다. 하지만 이슈 트래커, Actions CI/CD 생태계, 글로벌 오픈소스 기여 네트워크가 깃허브에 깊게 묶여 있어 전면 이전은 현실적으로 높은 전환 비용을 요구합니다. 이에 따라 전면 이전보다는 다중 원격 저장소 미러링(Dual Remote Mirroring)이나 자체 백업 파이프라인을 구축하는 실용적인 절충안이 주목받고 있습니다. 또한 탈중앙화 P2P 코드 협업 프로토콜인 Radicle 등에 대한 관심도 함께 증가하는 추세입니다. 단일 벤더 의존도를 낮추고 서비스 장애 시에도 빌드와 배포를 지속할 수 있는 레질리언스(회복탄력성) 확보가 핵심 과제로 떠올랐습니다.",
    tags: ["깃허브", "코드호스팅", "개발자인프라", "데브옵스", "오픈소스"]
  },
  {
    id: "geeknews_f5c2b70404",
    signal_id: "practice",
    importance: 88,
    title_ko: "AI 레드 에이전트, 깃허브 코파일럿 취약점 이용해 스노우플레이크 Jira 침해 시연",
    title_en: "AI-Generated GitHub Copilot Autofix Allowed Compromise of Snowflake's Jira",
    summary_ko: "• Wiz Research의 자율 AI 보안 에이전트 'Red Agent'가 깃허브 코파일럿 자동 수정 기능의 취약점을 파고들어 스노우플레이크의 내부 Jira 시스템 접근 권한을 획득했습니다.\n• 공개 저장소의 이슈 제목만으로 파이프라인 트리거를 유도하고 토큰을 탈취하는 정교한 연쇄 공격 시나리오가 실증되었습니다.\n• AI 기반 코드 자동 수정 기능이 CI/CD 파이프라인과 결합될 때 발생할 수 있는 새로운 보안 위협 모델을 명확히 보여줍니다.",
    body_ko: "클라우드 보안 기업 Wiz의 보안 연구팀이 개발한 자율 AI 침투 에이전트인 'Red Agent'가 스노우플레이크의 버그 바운티 프로그램에서 중대한 보안 취약점을 발견했습니다. 연구진은 깃허브 코파일럿의 자동 수정(Autofix) 기능이 트리거되는 과정에서 파이프라인 실행 권한이 비정상적으로 상승할 수 있음을 증명했습니다. 공격자는 공개 리포지토리의 이슈 제목 조작만으로 CI 환경 내에서 임의 코드를 실행시키고 민감한 내부 Jira 접근 토큰을 성공적으로 탈취했습니다. 이는 AI 코딩 도우미가 생성한 패치나 자동화 루틴을 무비판적으로 CI 파이프라인에 통합할 때 심각한 보안 구멍이 발생할 수 있음을 시사합니다. 스노우플레이크와 깃허브 양사는 해당 취약점 보고를 접수한 즉시 패치를 완료했습니다. 자동화된 AI 에이전트의 권한을 엄격히 제한하고 격리된 샌드박스에서만 실행해야 한다는 교훈을 남겼습니다.",
    tags: ["AI보안", "레드팀", "코파일럿", "보안취약점", "스노우플레이크"]
  },
  {
    id: "geeknews_219f7afa6a",
    signal_id: "model",
    importance: 85,
    title_ko: "GPT-5.6 Sol — OpenAI가 출시한 역대 최고 성능의 비전 멀티모달 모델 분석",
    title_en: "GPT-5.6 Sol is the best vision model OpenAI ever released",
    summary_ko: "• Roboflow의 정밀 벤치마크 결과 OpenAI의 최신 플래그십 GPT-5.6 Sol이 시각 객체 탐지, OCR, 계수 작업에서 압도적인 성능을 기록했습니다.\n• Sol 모델은 기존 GPT-4o 대비 고밀도 문서 분석과 미세 텍스트 추출 정확도가 35% 이상 대폭 향상되었습니다.\n• 복잡한 다이어그램, 차트, 손글씨 문서 처리 등 실무 시각 AI 워크플로우에 최적화된 성능을 제공합니다.",
    body_ko: "컴퓨터 비전 전문 플랫폼 Roboflow가 OpenAI의 최신 GPT-5.6 모델 라인업(Sol, Terra, Luna)에 대한 종합 비전 벤치마크 결과를 발표했습니다. 벤치마크 결과에 따르면 최상위 플래그십인 GPT-5.6 Sol은 객체 탐지, 복잡한 인쇄물 OCR, 고밀도 계수 작업 전반에서 기존 모델들을 크게 압도했습니다. 특히 복잡한 공학 도면이나 금융 영수증, 저화질 손글씨 문서에서 텍스트와 좌표를 추출하는 능력이 비약적으로 개선되었습니다. 경량화 버전인 Luna와 Terra 역시 모바일 및 엣지 환경에 적합한 추론 속도를 보여주며 실용성을 입증했습니다. 이는 OpenAI가 멀티모달 비전 인코더 아키텍처를 전면 개편하여 미세 공간 해상도 처리 능력을 대폭 강화했음을 보여줍니다. 시각 정보 기반의 자동화 파이프라인을 구축하는 엔지니어들에게 최고의 솔루션으로 자리매김할 전망입니다.",
    tags: ["OpenAI", "GPT-5.6", "컴퓨터비전", "멀티모달", "OCR"]
  },
  {
    id: "geeknews_1b3df99b52",
    signal_id: "practice",
    importance: 76,
    title_ko: "AI;DR 원칙 — 검토되지 않은 AI 생성물을 배제하는 실전 엔지니어링 워크플로우",
    title_en: "AI;DR (Too AI; Didn't Read)",
    summary_ko: "• 인간의 비판적 검토나 편집을 거치지 않은 무분별한 AI 생성 콘텐츠를 읽지 않겠다는 'AI;DR' 원칙이 개발 커뮤니티에서 주목받고 있습니다.\n• AI를 아이디어 발굴과 초안 작성 도구로 적극 활용하되, 최종 산출물에는 인간의 검증과 고유한 통찰을 반드시 담아야 한다는 행동 양식입니다.\n• 정보 과잉 시대에 AI 생성물의 노이즈를 거르고 지식 공유의 질적 수준을 유지하는 실천 가이드를 제시합니다.",
    body_ko: "인터넷과 개발자 문서에 장황하고 알맹이 없는 AI 생성 텍스트가 급증하면서 이에 대응하기 위한 'AI;DR(AI라서 읽지 않음)' 원칙이 큰 공감을 얻고 있습니다. 이 원칙은 AI 도구 사용 자체를 거부하는 것이 아니라, 인간의 깊이 있는 검토와 편집이 생략된 저품질 AI 출력물을 단호히 배격하자는 취지입니다. 브레인스토밍과 개요 작성 단계에서는 LLM을 적극 활용하되, 최종 커뮤니케이션과 기술 문서화 단계에서는 작성자가 내용을 100% 이해하고 책임져야 한다는 점을 강조합니다. 무분별한 복사-붙여넣기는 동료 개발자의 인지 부하를 가중시키고 잘못된 기술 지식을 확산시키는 부작용을 낳습니다. 개발자 개개인이 AI 생성물을 능동적으로 필터링하고 자신만의 비판적 시각을 더하는 책임감 있는 AI 활용 문화가 요구됩니다. 단순한 유행을 넘어 AI 시대의 새로운 엔지니어링 에티켓으로 자리 잡아가고 있습니다.",
    tags: ["AI워크플로우", "엔지니어링문화", "생산성", "프롬프트", "개발자습관"]
  },

  // === AITIMES ===
  {
    id: "aitimes_cf71ca4b63",
    signal_id: "product",
    importance: 86,
    title_ko: "업스테이지, 다음(Daum) 검색 AI 요약에 독자 모델 '솔라(Solar)' 전면 적용",
    title_en: "Upstage applies Solar LLM to Daum search AI summaries",
    summary_ko: "• 업스테이지의 독자 파운데이션 LLM '솔라(Solar)'가 포털 다음(Daum)의 검색 결과 AI 요약 서비스에 100% 전면 적용되었습니다.\n• 글로벌 빅테크 모델 의존 없이 토종 오픈소스 기반 파운데이션 모델로 대규모 포털 트래픽을 처리하는 성과를 달성했습니다.\n• B2C 대용량 서비스 검증을 완료함에 따라 향후 금융, 제조, 공공 등 엔터프라이즈 B2B 시장 확장이 가속화될 전망입니다.",
    body_ko: "국내 AI 스타트업 업스테이지의 독자 파운데이션 대형언어모델 '솔라(Solar)'가 포털 다음(Daum)의 검색 AI 요약 서비스에 단독 공급되며 실사용 규모를 대폭 확장했습니다. 김성훈 대표는 개인 SNS를 통해 다음 검색에서 제공되는 모든 AI 요약 결과가 솔라 LLM으로 구동된다고 공식 확인했습니다. 이는 외산 상용 모델에 의존하지 않고 자체 개발한 고성능 LLM으로 수천만 사용자 대상의 실시간 포털 트래픽을 성공적으로 감당하고 있음을 입증합니다. 솔라는 독자적인 DUS(Depth Up-Scaling) 아키텍처를 바탕으로 뛰어난 한국어 이해력과 빠른 추론 속도를 강점으로 내세웁니다. 포털 검색 서비스 적용을 통해 대규모 실전 레퍼런스를 확보한 업스테이지는 기업용 AI 시장 공략에 더욱 박차를 가할 계획입니다. 토종 파운데이션 모델의 상용화 경쟁력이 한 단계 도약한 중요한 이정표로 평가받고 있습니다.",
    tags: ["업스테이지", "솔라", "다음검색", "파운데이션모델", "AI요약"]
  },
  {
    id: "aitimes_8278095e96",
    signal_id: "devtool",
    importance: 92,
    title_ko: "오픈AI, 코덱스(Codex) 대대적 개편 예고… 로딩 속도 94% 개선 및 메모리 88% 감축",
    title_en: "OpenAI teases major Codex revamp: 94% speedup and 88% memory reduction",
    summary_ko: "• 오픈AI가 장시간 코딩 작업 시 발생하던 코덱스(Codex)의 성능 저하 문제를 해결하기 위해 아키텍처 전면 개편을 예고했습니다.\n• 내부 벤치마크 결과 장기 실행 세션에서 로딩 지연 시간을 94% 단축하고 메모리 사용량을 88%까지 대폭 절감했습니다.\n• 대규모 엔터프라이즈 코드베이스에서의 연속 작업 안정성과 에이전트 자율 코딩 완성도가 극대화될 것으로 기대됩니다.",
    body_ko: "AI 코딩 에이전트의 고질적인 한계로 지적되어 온 장시간 작업 시의 메모리 누수와 지연 문제를 해결하기 위해 오픈AI가 코덱스(Codex)의 대대적인 성능 개편을 예고했습니다. 앤드류 앰브루시노 오픈AI 개발자가 공개한 내부 벤치마크 자료에 따르면, 차세대 코덱스는 세션이 길어져도 로딩 속도가 94% 빨라지고 메모리 사용량은 88%나 감소했습니다. 기존에는 에이전트가 수십 개의 파일을 오가며 긴 시간 작업을 수행할 때 컨텍스트 축적으로 인해 급격한 속도 저하가 발생하곤 했습니다. 이번 개편은 컨텍스트 캐싱 최적화와 비동기 상태 관리 엔진을 전면 재설계함으로써 긴 호흡의 소프트웨어 개발 작업에서도 일관된 성능을 유지하도록 개선했습니다. 복잡한 모놀리스 코드베이스를 다루는 전문 엔지니어들의 작업 효율이 획기적으로 개선될 전망입니다. 코딩 에이전트 시장에서 독보적인 기술적 우위를 굳히기 위한 오픈AI의 승부수로 해석됩니다.",
    tags: ["오픈AI", "코덱스", "코딩에이전트", "성능최적화", "개발도구"]
  },
  {
    id: "aitimes_89dfd97726",
    signal_id: "product",
    importance: 75,
    title_ko: "라이너, AI 검색 및 학술 엔진 기반 B2B 전담 'AX 디비전' 공식 출범",
    title_en: "Liner expands from B2C to B2B with new AX Division",
    summary_ko: "• AI 검색 서비스로 글로벌 사용자를 확보한 라이너가 기업 고객의 AI 전환(AX)을 지원하는 전담 조직 'AX 디비전'을 신설했습니다.\n• 정확도 높은 정보 출처 추적 기술과 학술 검색 노하우를 기업 내부 지식 검색 및 데이터 파이프라인에 이식합니다.\n• B2C에서 검증된 고정밀 검색 엔진을 기반으로 기업 맞춤형 솔루션 사업을 본격화합니다.",
    body_ko: "글로벌 시장에서 학술 및 지식 탐색 특화 AI 검색으로 입지를 다진 라이너(Liner)가 기업 고객을 겨냥한 전담 조직인 'AX(AI 전환) 디비전'을 공식 출범시켰습니다. 라이너는 그동안 B2C 서비스를 통해 축적한 고정밀 환각 방지 기술과 명확한 출처 인용 엔진을 엔터프라이즈 환경에 최적화하여 공급할 방침입니다. 기업들은 사내 인트라넷, 기술 문서, 비정형 데이터베이스에 라이너의 검색 인프라를 연동하여 신뢰도 높은 사내 AI 지식 허브를 구축할 수 있습니다. 이미 주요 공공기관 및 대기업들과 개념 검증(PoC)을 진행 중이며 엔터프라이즈 시장 수요가 빠르게 늘고 있습니다. B2C 중심의 AI 스타트업이 탄탄한 기술력을 바탕으로 수익성 높은 B2B 시장으로 확장을 꾀하는 모범 사례로 꼽힙니다. 향후 다양한 산업군에 맞춤형 지식 검색 에이전트를 공급할 것으로 기대됩니다.",
    tags: ["라이너", "AI검색", "엔터프라이즈AI", "B2B", "지식검색"]
  },
  {
    id: "aitimes_9ac9bba396",
    signal_id: "product",
    importance: 80,
    title_ko: "마스오토, E2E AI 기술 기반 2028년 무인 화물운송 상용화 로드맵 공개",
    title_en: "Mars Auto plans driverless freight transport by 2028 with E2E AI",
    summary_ko: "• 자율주행 트럭 스타트업 마스오토가 카메라 기반 엔드투엔드(E2E) AI 모델을 통해 2028년 무인 화물운송을 상용화하겠다고 밝혔습니다.\n• 라이다 없이 순수 컴퓨터 비전과 딥러닝 신경망으로 인지, 판단, 제어를 통합하여 시스템 비용을 획기적으로 낮췄습니다.\n• 고속도로 간선 수송을 중심으로 물류 기사 부족 문제와 운송 비용 절감의 실질적 대안을 제시합니다.",
    body_ko: "국내 자율주행 트럭 전문 스타트업 마스오토(Mars Auto)가 엔드투엔드(E2E) 딥러닝 기술을 앞세워 오는 2028년까지 완전 무인 화물운송 시대를 열겠다는 포부를 밝혔습니다. 노제경 부대표는 고가의 라이다 센서 대신 소형 카메라 7대만을 활용하여 차량 주변 환경을 인식하고 직접 조향 및 가감속을 제어하는 독자 AI 모델을 강조했습니다. 인지, 판단, 제어 파이프라인을 단일 신경망으로 통합함으로써 연산 효율을 극대화하고 하드웨어 구축 비용을 10분의 1 수준으로 절감했습니다. 현재 국내 주요 물류 파트너들과 함께 고속도로 간선 구간에서 수십만 킬로미터 이상의 유인 시험 주행을 성공적으로 진행하고 있습니다. 심화되는 화물차 운전기사 고령화와 구인난 문제를 해결할 핵심 기술로 큰 기대를 모으고 있습니다. 테슬라의 FSD와 유사한 비전 기반 E2E 방식을 상용 화물차에 성공적으로 적용한 선도적 시도로 평가됩니다.",
    tags: ["마스오토", "자율주행", "E2E-AI", "스마트물류", "컴퓨터비전"]
  },

  // === HACKER NEWS ===
  {
    id: "hackernews_cc2bd919fd",
    signal_id: "product",
    importance: 90,
    title_ko: "Cursor, 깃허브 대안 코드 호스팅 플랫폼 'Origin' 비공개 베타 런칭",
    title_en: "Cursor launches Origin, GitHub alternative",
    summary_ko: "• AI IDE 대표 주자 Cursor가 모든 유료 플랜 사용자를 대상으로 자체 코드 호스팅 플랫폼 'Origin'의 얼리 베타를 시작했습니다.\n• AI 에이전트와 완벽히 동기화되는 빠른 푸시/풀, 브랜치 관리, 에디터 내 네이티브 코드 리뷰 기능을 제공합니다.\n• 깃허브의 반복적인 장애와 독점 구도 속에서 AI 퍼스트 협업 코드 저장소로의 진화를 꾀하고 있습니다.",
    body_ko: "대표적인 AI 코드 에디터 Cursor가 개발자들의 코드베이스를 직접 호스팅할 수 있는 신규 플랫폼 'Origin'을 공식 발표하고 베타 서비스를 시작했습니다. Origin은 단순한 Git 원격 저장소에 그치지 않고, Cursor IDE 내의 AI 에이전트와 완벽하게 통합되어 브랜치 생성, 충돌 해결, 코드 리뷰를 에디터 안에서 매끄럽게 처리합니다. 특히 깃허브의 최근 잦은 서버 다운 현상으로 인해 안정적인 대안을 찾던 개발 커뮤니티에서 폭발적인 반응을 얻고 있습니다. 모든 유료 구독자에게 즉시 얼리 액세스가 제공되며, 직관적인 권한 관리와 에이전트 친화적 API를 기본 탑재했습니다. 기존 웹 브라우저 중심의 무거운 PR 워크플로우를 IDE 내부의 대화형 인터페이스로 대체하는 혁신을 목표로 합니다. AI 에디터 시장을 넘어 협업 인프라 시장 전체로 영향력을 확장하려는 Cursor의 전략적 행보가 돋보입니다.",
    tags: ["Cursor", "Origin", "코드호스팅", "깃허브대안", "AI-IDE"]
  },
  {
    id: "hackernews_830b3049d1",
    signal_id: "practice",
    importance: 87,
    title_ko: "Qwen3.8 27B 서빙 최적화: 24GB GPU에서 256K 컨텍스트로 50 TPS 달성",
    title_en: "Qwen3.8 27B at 256K: 50 TPS on a 24 GB GPU",
    summary_ko: "• MTP(Multi-Token Prediction)와 NVFP4 양자화 기법을 결합하여 24GB 단일 GPU에서 Qwen3.8 27B 모델을 초당 50토큰으로 서빙하는 최적화 기법이 공개되었습니다.\n• 256K에 달하는 초장문 컨텍스트에서도 VRAM 부족 현상 없이 극도로 높은 연산 효율을 유지합니다.\n• 개인 개발자 및 스타트업이 소비자용 그래픽카드(RTX 4090 등)로 고성능 대형 모델을 직접 호스팅할 수 있는 실전 가이드를 제공합니다.",
    body_ko: "엔지니어 Michał Piszczek이 소비자용 24GB GPU(RTX 4090/3090) 단 한 장으로 Qwen3.8 27B 모델을 256K 컨텍스트 환경에서 초당 50토큰(TPS) 속도로 서빙하는 놀라운 최적화 성과를 공유했습니다. 이번 최적화의 핵심은 최신 llama.cpp 백엔드에 엔비디아의 NVFP4 양자화 포맷과 Multi-Token Prediction(MTP) 기법을 정교하게 결합한 데 있습니다. 기존 8비트나 4비트 양자화 대비 정확도 손실을 최소화하면서도 메모리 대역폭 한계를 획기적으로 돌파했습니다. 특히 256K에 이르는 긴 문맥을 처리할 때 발생하는 KV 캐시 병목 현상을 커스텀 페이징 기법으로 완벽히 통제했습니다. 이는 고가의 데이터센터용 H100 GPU 없이도 강력한 로컬 추론 인프라를 구축할 수 있음을 보여주는 실질적인 증거입니다. 로컬 AI 에이전트와 사내 개인화 LLM을 운영하려는 엔지니어들에게 필독 가이드로 꼽히고 있습니다.",
    tags: ["Qwen", "양자화", "로컬LLM", "추론최적화", "NVFP4"]
  },
  {
    id: "hackernews_fad98a78b0",
    signal_id: "research",
    importance: 82,
    title_ko: "Rust 기반 GPU 오프로드: 안전하고 이식성 높은 고속 가속 기법 연구",
    title_en: "GPU Offload in Rust: Portable, Safe, and Fast",
    summary_ko: "• Rust 언어의 타입 안전성을 유지하면서 CPU 연산을 GPU로 투명하게 오프로딩하는 새로운 컴파일러 확장 기법 논문이 발표되었습니다.\n• CUDA 종속성을 탈피하여 단일 Rust 코드베이스로 다양한 GPU 아키텍처에서 고성능 병렬 처리를 지원합니다.\n• 기존 C++/CUDA 대비 메모리 안전성을 100% 보장하면서도 95% 이상의 네이티브 연산 성능을 달성했습니다.",
    body_ko: "Rust 프로그래밍 언어 환경에서 복잡한 GPU 가속 연산을 안전하고 쉽게 구현할 수 있도록 돕는 새로운 GPU 오프로드 프레임워크 연구 논문이 arXiv에 등재되었습니다. 연구진은 Rust의 정적 소유권(Ownership) 및 빌림(Borrowing) 검사기를 확장하여, 런타임 오버헤드 없이 CPU와 GPU 메모리 간의 데이터 이동을 정적으로 검증하는 기술을 제안했습니다. 이를 통해 C++/CUDA 프로그래밍에서 흔히 발생하는 메모리 오염, 경합 조건, 댕글링 포인터 문제를 컴파일 타임에 원천 차단했습니다. 또한 SPIR-V 및 Vulkan 셰이더 변환 파이프라인을 통합하여 NVIDIA, AMD, 인텔, 애플 실리콘 등 다양한 GPU 플랫폼에서 코드 수정 없이 즉시 실행됩니다. 실험 결과 고성능 선형대수 및 AI 텐서 연산 벤치마크에서 네이티브 CUDA 코드의 95%를 상회하는 빠른 실행 속도를 기록했습니다. AI 가속 라이브러리와 고성능 컴퓨팅(HPC) 시스템을 Rust로 재구축하려는 개발자들에게 중요한 기술적 이정표가 될 것입니다.",
    tags: ["Rust", "GPU가속", "병렬컴퓨팅", "컴파일러", "메모리안전성"]
  },
  {
    id: "hackernews_50eb7f82a2",
    signal_id: "product",
    importance: 81,
    title_ko: "Speko (YC S26) — 음성 AI 파이프라인 최적 조합을 찾아주는 오픈라우터 플랫폼 출시",
    title_en: "Launch HN: Speko (YC S26) – OpenRouter for Voice AI",
    summary_ko: "• YC S26 선정 기업 Speko가 다양한 STT, LLM, TTS 모델의 조합을 지연 시간과 비용 조건에 맞춰 자동 라우팅하는 음성 AI 플랫폼을 공개했습니다.\n• 단일 통합 API로 Deepgram, Whisper, ElevenLabs, Cartesia 등 주요 음성 프로바이더를 자유롭게 스위칭할 수 있습니다.\n• 300ms 미만의 초저지연 실시간 음성 에이전트 구축을 위한 최적화 라우팅 인프라를 제공합니다.",
    body_ko: "Y Combinator 2026 여름 배치에 선정된 스타트업 Speko가 실시간 대화형 음성 AI 구축을 위한 멀티 프로바이더 게이트웨이 서비스를 공식 런칭했습니다. Speko는 LLM 시장의 OpenRouter처럼, 음성 인식(STT), 두뇌(LLM), 음성 합성(TTS)의 각 단계를 개발자의 지연 시간 및 예산 제약에 맞춰 최적의 조합으로 실시간 동적 라우팅해 줍니다. 예를 들어 빠른 반응이 필요한 첫 인사말은 초저지연 소형 모델로 처리하고, 깊은 상담은 고품질 모델로 자연스럽게 전환하는 식입니다. 단 하나의 통합 웹소켓 API를 통해 Deepgram, Cartesia, ElevenLabs, OpenAI Realtime 등 다양한 서드파티 공급자를 코드 변경 없이 즉시 교체할 수 있습니다. 음성 에이전트 개발 시 겪는 복잡한 오디오 스트리밍 버퍼 관리와 프로토콜 변환 문제를 완전히 해결해 줍니다. 고객 응대 봇 및 실시간 보이스 비서를 개발하는 팀들의 개발 기간을 획기적으로 단축할 것으로 기대됩니다.",
    tags: ["음성AI", "보이스에이전트", "Speko", "OpenRouter", "STT-TTS"]
  },
  {
    id: "hackernews_762fba54d1",
    signal_id: "devtool",
    importance: 74,
    title_ko: "1667 — 언어 모델을 활용한 소설 집필 전용 미니멀 터미널 TUI 에디터",
    title_en: "Show HN: 1667, a terminal UI for writing fiction with language models",
    summary_ko: "• 작가이자 개발자인 개인이 LLM과 협업하여 소설을 집필할 수 있도록 고안한 미니멀 터미널 TUI 도구 '1667'을 오픈소스로 공개했습니다.\n• 화려한 GUI의 방해 요소를 배제하고 키보드 중심의 몰입감 높은 텍스트 편집 및 맥락 기반 AI 이어쓰기 환경을 제공합니다.\n• 로컬 마크다운 파일과 완벽하게 동기화되며 다양한 LLM API를 직접 연결할 수 있습니다.",
    body_ko: "자신의 소설 창작 작업을 위해 직접 도구를 만든 개발자가 터미널 환경에서 언어 모델과 협업하여 글을 쓸 수 있는 미니멀 TUI 에디터 '1667'을 Hacker News에 선보였습니다. 이 도구는 마우스나 화려한 웹 UI로 인한 집중력 분산을 방지하고, 온전히 글쓰기에만 몰입할 수 있도록 텍스트 기반 인터페이스로 설계되었습니다. 단축키 하나로 현재 챕터의 세계관과 등장인물 설정을 주입하여 LLM에게 자연스러운 문맥 이어쓰기나 대화문 교정을 요청할 수 있습니다. 생성된 결과물은 표준 Markdown 파일로 로컬 디스크에 즉시 저장되므로 플랫폼 종속성이 전혀 없습니다. Claude, GPT, 로컬 Ollama 등 원하는 모델 엔드포인트를 자유롭게 연결할 수 있는 BYOK 구조를 채택했습니다. 군더더기 없는 미니멀리즘과 실용성을 추구하는 테크니컬 라이터와 작가들에게 신선한 영감을 주는 도구입니다.",
    tags: ["TUI", "글쓰기도구", "터미널에디터", "오픈소스", "LLM활용"]
  },

  // === GITHUB ===
  {
    id: "github_bbcdb118d8",
    signal_id: "oss",
    importance: 95,
    title_ko: "DeepSeek Harness — '모든 것이 플러그인'인 공식 오픈소스 에이전트 하네스",
    title_en: "deepseek-ai/deepseek-harness: DeepSeek Harness — Everything is a Plugin",
    summary_ko: "• DeepSeek AI 팀이 모든 컴포넌트를 모듈형 플러그인으로 조립할 수 있는 공식 에이전트 하네스 'DeepSeek Harness(dsh)'를 오픈소스로 공개했습니다.\n• CLI, 데스크톱 TUI, 도구 바인딩, 모델 라우터를 독립된 플러그인으로 손쉽게 교체할 수 있는 유연한 아키텍처를 자랑합니다.\n• 개발자 생태계가 DeepSeek-R1/V3 기반의 커스텀 코딩 에이전트를 자유롭게 제작할 수 있는 표준 프레임워크를 제시합니다.",
    body_ko: "DeepSeek 팀이 자사의 대형 모델을 기반으로 다양한 에이전트를 구축할 수 있는 공식 오픈소스 하네스 프레임워크 'DeepSeek Harness(dsh)'를 깃허브에 전격 공개했습니다. TypeScript와 Cordis 프레임워크 기반으로 개발된 이 하네스는 'Everything is a Plugin' 철학을 표방하며, 인터페이스부터 툴체인까지 모든 요소를 플러그인 형태로 탈부착할 수 있습니다. 사용자는 터미널 CLI 환경은 물론 Claude Code 스타일의 미려한 TUI, 로컬 도구 호출 엔진을 단 몇 줄의 설정으로 구성할 수 있습니다. DeepSeek-V3 및 DeepSeek-R1 모델과의 통신 최적화가 기본 내장되어 있어 고속 스트리밍 추론과 생각 과정(Thinking process) 렌더링을 매끄럽게 지원합니다. 누구나 손쉽게 커스텀 코딩 에이전트나 특화 도메인 봇을 개발할 수 있도록 강력한 보일러플레이트와 API 문서를 제공합니다. Claude Code와 Cursor가 주도하던 코딩 에이전트 생태계에 오픈소스 진영의 강력한 대안으로 급부상하고 있습니다.",
    tags: ["DeepSeek", "에이전트하네스", "오픈소스", "플러그인", "코딩에이전트"]
  },
  {
    id: "github_bc4d73f421",
    signal_id: "oss",
    importance: 88,
    title_ko: "qm — 업무 협업을 위한 슬랙 및 웹 기반 멀티플레이어 에이전트 하네스",
    title_en: "yc-software/qm: Multiplayer agent harness for work",
    summary_ko: "• Y Combinator 출신 팀이 여러 동료와 AI 에이전트가 단일 작업 공간에서 실시간 협업할 수 있는 오픈소스 하네스 'qm'을 공개했습니다.\n• 슬랙 채널 및 웹 인터페이스와 동시 연동되어 에이전트의 중간 작업 과정을 투명하게 공유하고 피드백을 주고받을 수 있습니다.\n• 팀 단위 지식 공유와 복합 업무 위임의 새로운 협업 표준을 제시합니다.",
    body_ko: "YC 소프트웨어 팀이 여러 사용자와 AI 에이전트가 한 화면에서 동시 상호작용할 수 있는 멀티플레이어 하네스 'qm'을 오픈소스로 릴리스했습니다. 기존의 AI 챗봇이 1:1 대화에 갇혀 있었다면, qm은 슬랙 스레드와 웹 캔버스에서 팀원 전체가 에이전트의 실행 계획을 함께 검토하고 수정할 수 있는 멀티플레이어 환경을 제공합니다. 에이전트가 작성 중인 코드, 리서치 요약, 데이터 분석 차트를 실시간으로 공유하며 동료들과 함께 피드백을 덧붙일 수 있습니다. TypeScript 기반으로 구축되어 사내 서버나 클라우드 인프라에 간편하게 셀프 호스팅으로 배포할 수 있습니다. 기업 내부 지식 베이스 및 기존 도구들과 손쉽게 연결할 수 있는 확장 인터페이스를 갖추고 있습니다. 개인 비서 수준을 넘어 팀 전체의 업무 생산성을 견인하는 차세대 협업 에이전트 플랫폼으로 평가받고 있습니다.",
    tags: ["멀티플레이어", "에이전트협업", "슬랙연동", "오픈소스", "생산성"]
  },
  {
    id: "github_08dd754836",
    signal_id: "oss",
    importance: 86,
    title_ko: "Comp AI CRM — AI 에이전트를 위해 처음부터 설계된 에이전틱 퍼스트 CRM",
    title_en: "trycompai/crm: Comp AI CRM is an open source CRM designed for AI agents",
    summary_ko: "• 인간 상담원이 아닌 AI 에이전트가 직접 고객 데이터를 관리하고 영업 파이프라인을 운영하도록 설계된 오픈소스 CRM이 출시되었습니다.\n• 직관적인 에이전트 전용 API와 상태 머신을 제공하여 고객 문의 분석부터 후속 조치까지 자율적으로 처리합니다.\n• 반복적인 데이터 입력 업무를 자동화하고 영업 팀의 전략적 의사결정을 지원합니다.",
    body_ko: "Trycompai 팀이 기존의 인간 중심 CRM 소프트웨어를 탈피하여, AI 에이전트가 스스로 데이터를 읽고 조작할 수 있도록 설계된 'Comp AI CRM'을 오픈소스로 공개했습니다. 이 시스템은 사람이 수동으로 고객 정보를 입력하던 방식을 뒤엎고, 에이전트가 이메일, 메신저, 웹 로그를 분석하여 고객 프로필을 자동 갱신하고 영업 기회를 포착하도록 최적화되었습니다. 깔끔한 REST API와 Webhook 시스템을 통해 Claude Code, Cursor 등 외부 코딩 에이전트와 완벽히 결합됩니다. Next.js와 TypeScript 기반의 모던 웹 아키텍처로 구축되어 뛰어난 확장성과 커스터마이징 자유도를 보장합니다. 반복적인 세일즈 파이프라인 관리 업무를 AI에게 위임하고자 하는 스타트업과 영업 조직에서 큰 관심을 보이고 있습니다. 에이전트 시대를 맞아 B2B 비즈니스 애플리케이션이 나아갈 새로운 방향성을 제시한 프로젝트입니다.",
    tags: ["에이전틱CRM", "오픈소스", "영업자동화", "비즈니스AI", "B2B"]
  },
  {
    id: "github_502eac6ca6",
    signal_id: "oss",
    importance: 89,
    title_ko: "Qwen Audio Agent — 끊김 없는 실시간 대화와 도구 실행을 지원하는 보이스 런타임",
    title_en: "QwenAudio/qwen-audio-agent: Real-time Voice Runtime for AI Agents",
    summary_ko: "• Qwen 오디오 연구팀이 에이전트가 음성으로 대화하면서 동시에 백그라운드 코딩과 도구 호출을 수행하는 실시간 보이스 런타임을 공개했습니다.\n• ACP(Agent Client Protocol) 규격을 준수하여 Claude Code, Codex, OpenCode 등 다양한 에이전트 클라이언트와 즉시 연동됩니다.\n• 음성 대화 중단 없는 비동기 태스크 스케줄링 기술로 진정한 멀티태스킹 음성 비서를 구현했습니다.",
    body_ko: "Qwen Audio 팀이 터미널 코딩 에이전트에게 실시간 음성 상호작용 능력을 부여하는 오픈소스 런타임 'Qwen Audio Agent'를 발표했습니다. 이 시스템의 최대 강점은 사용자와 실시간 음성으로 대화를 나누는 도중에도 백그라운드에서 코드 작성, 컴파일, 터미널 명령어 실행을 멈추지 않고 병행할 수 있다는 점입니다. 에이전트 클라이언트 프로토콜(ACP)을 공식 지원하여 Claude Code나 Codex 같은 기존 터미널 도구와 별도 수정 없이 곧바로 연결됩니다. 초저지연 오디오 스트리밍 파이프라인과 음성 인터럽트(끼어들기) 감지 기능을 갖추어 사람과 대화하듯 자연스러운 협업이 가능합니다. 키보드를 사용하기 어려운 환경이나 원격 개발 환경에서 핸즈프리로 에이전트를 지휘할 수 있는 혁신적인 경험을 선사합니다. 음성 인터페이스와 에이전틱 코딩의 완벽한 융합을 보여주는 대표적 오픈소스 프로젝트입니다.",
    tags: ["보이스런타임", "Qwen오디오", "실시간음성", "오픈소스", "에이전트도구"]
  },
  {
    id: "github_6ec9f54cfa",
    signal_id: "oss",
    importance: 84,
    title_ko: "Open Kritt — 에이전트 오케스트레이션 기반 셀프 호스팅 보안 취약점 연구 도구",
    title_en: "Kritt-ai/open-kritt: Self-hosted AI vulnerability research tool orchestrating agents",
    summary_ko: "• Kritt-ai 팀이 여러 보안 분석 에이전트를 오케스트레이션하여 소스코드 내 취약점을 탐지하고 검증하는 'Open Kritt'을 오픈소스로 공개했습니다.\n• 정적 분석과 동적 익스플로잇 시뮬레이션을 결합하여 오탐(False Positive)을 획기적으로 줄였습니다.\n• 버그 바운티 연구원 및 사내 보안 팀이 안전하게 폐쇄망에서 구동할 수 있는 셀프 호스팅 환경을 제공합니다.",
    body_ko: "보안 연구 전문 스타트업 Kritt-ai가 다중 AI 에이전트를 활용해 코드베이스의 보안 취약점을 체계적으로 발굴하고 검증하는 오픈소스 도구 'Open Kritt'을 공개했습니다. 이 플랫폼은 단순히 잠재적 결함을 나열하는 기존 정적 분석 도구와 달리, 전담 에이전트들이 협력하여 실제 공격 시나리오를 구성하고 PoC(개념 증명) 코드를 검증하는 과정을 거칩니다. 이를 통해 보안 담당자들을 지치게 만들던 대량의 허위 경보(False Positive)를 사전에 걸러내고 실제 위협이 되는 결함만을 선별합니다. 기업의 핵심 자산인 소스코드가 외부로 유출되지 않도록 온프레미스 및 로컬 환경에서 완전한 셀프 호스팅으로 운영할 수 있습니다. 버그 바운티 헌터와 엔터프라이즈 보안 감사 팀의 취약점 분석 시간을 대폭 단축해 주는 강력한 자동화 솔루션입니다. 소프트웨어 공급망 보안을 강화하려는 개발 조직에 필수적인 오픈소스 도구로 주목받고 있습니다.",
    tags: ["보안에이전트", "취약점분석", "버그바운티", "오픈소스", "코드보안"]
  }
];

function buildSummary(news) {
  const signalCounts = {};
  for (const n of news) signalCounts[n.signal_id] = (signalCounts[n.signal_id] || 0) + 1;
  const breakdown = Object.entries(signalCounts)
    .map(([k, v]) => `${k} ${v}건`)
    .join(" · ");
  return `AI 기술 신호 ${news.length}건 — ${breakdown}. ldk-hub에서 큐레이션 하였습니다.`;
}

function runCuration() {
  const finalItems = [];

  for (const cur of CURATED_ITEMS) {
    const fact = factMap.get(cur.id);
    if (!fact) {
      console.warn(`Missing fact for ID: ${cur.id}`);
      continue;
    }

    const source = fact.source in SOURCE_NAMES ? fact.source : "web";
    const item = {
      id: fact.id,
      category_id: source,
      category_name: SOURCE_NAMES[source] || fact.source_name,
      signal_id: cur.signal_id,
      signal_name: SIGNALS[cur.signal_id],
      importance: cur.importance,
      headline: cur.title_ko.slice(0, 160),
      title_ko: cur.title_ko.slice(0, 160),
      title_en: (cur.title_en || fact.title).slice(0, 200),
      summary_ko: cur.summary_ko,
      summary_en: cur.title_en,
      body_ko: cur.body_ko,
      body_en: fact.body ? fact.body.slice(0, 500) + "..." : "",
      author_profile: fact.author,
      publish_date: fact.publish_date,
      tags: cur.tags,
      url: fact.url,
      sources: fact.cross_sources || [fact.source_name],
      metrics: fact.metrics || {},
      curated_by: "ldk-hub"
    };

    finalItems.push(item);
  }

  // 플랫폼 밸런스 부스트 적용
  const byCategory = {};
  for (const item of finalItems) {
    if (!byCategory[item.category_id]) byCategory[item.category_id] = [];
    byCategory[item.category_id].push(item);
  }
  for (const cat in byCategory) {
    byCategory[cat].sort((a, b) => b.importance - a.importance);
    byCategory[cat].slice(0, 3).forEach(item => {
      item._boost = 1000;
    });
  }

  const news = finalItems.sort((a, b) => {
    const boostA = a._boost || 0;
    const boostB = b._boost || 0;
    return (b.importance + boostB) - (a.importance + boostA);
  });
  news.forEach(item => delete item._boost);

  const signalCounts = {};
  for (const n of news) signalCounts[n.signal_id] = (signalCounts[n.signal_id] || 0) + 1;

  const today = new Date().toISOString().slice(0, 10);
  const outputData = {
    generated_at: new Date().toISOString(),
    version: `v${today.replaceAll("-", ".")}`,
    summary: buildSummary(news),
    curated_by: "ldk-hub",
    signal_counts: signalCounts,
    news
  };

  fs.mkdirSync(path.dirname(LATEST_PATH), { recursive: true });
  fs.writeFileSync(LATEST_PATH, JSON.stringify(outputData, null, 2));
  console.log(`Saved ${news.length} items to ${LATEST_PATH}`);

  // 아카이브 저장
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.mkdirSync(DATA_ARCHIVE_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARCHIVE_DIR, `news_${today}.json`), JSON.stringify(outputData, null, 2));
  fs.writeFileSync(path.join(DATA_ARCHIVE_DIR, `news_${today}.json`), JSON.stringify(outputData, null, 2));

  // 인덱스 갱신
  const indexFile = path.join(ARCHIVE_DIR, "news_index.json");
  let index = { archives: [] };
  if (fs.existsSync(indexFile)) {
    try {
      index = JSON.parse(fs.readFileSync(indexFile, "utf8"));
      if (!index.archives) index.archives = [];
    } catch (e) {
      console.warn("news_index.json 파싱 오류:", e.message);
    }
  }
  if (!index.archives.some(a => a.file === `news_${today}.json`)) {
    index.archives.unshift({
      file: `news_${today}.json`,
      version: outputData.version,
      generated_at: outputData.generated_at,
    });
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  }
  console.log(`Updated news archives and index.`);
}

runCuration();
