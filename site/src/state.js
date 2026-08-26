
export const isNewsPage = !!document.getElementById("news-feed-container");
export const isStarboardPage = !!document.getElementById("starboard-container");
export const isLoungePage = !!document.getElementById("lounge-container");

// giscus (GitHub Discussions) 설정 — 라운지 대화와 뉴스 항목별 댓글이 모두 이 값을 쓴다.
// repoId·categoryId 는 https://giscus.app 에서 리포를 입력하면 발급된다.
// 비어 있으면 화면에 안내를 띄우고 위젯을 붙이지 않는다 (조용히 깨지지 않게).
export const GISCUS = {
  repo: "ldk-hub/ai-weekly",
  repoId: "",            // 예: "R_kgDO..."
  loungeCategory: "라운지",
  loungeCategoryId: "",  // 자유 대화 카테고리 — 예: "DIC_kwDO..."
  newsCategory: "뉴스",
  newsCategoryId: "",    // 뉴스 항목별 댓글 카테고리
};
export const isGiscusReady = () => !!(GISCUS.repoId && GISCUS.loungeCategoryId && GISCUS.newsCategoryId);

export const STATE = {
  data: null,
  tab: isStarboardPage ? "heavy" : "rising",
  query: "",
  category: "all",
  source: "latest",
  archives: [],
  lounge: null,
  viewMode: localStorage.getItem('aiw-view') || 'card'
};

export const CATEGORIES = [
  { id: "all",     emoji: "✨", label_ko: "전체",   label_en: "All" },
  { id: "agent",   emoji: "🤖", label_ko: "에이전트", label_en: "Agents" },
  { id: "skill",   emoji: "⚡", label_ko: "스킬",     label_en: "Skills" },
  { id: "harness", emoji: "🔧", label_ko: "하네스",   label_en: "Harness" },
  { id: "mcp",     emoji: "🔌", label_ko: "MCP",      label_en: "MCP" },
];

// cc-news 수집 매체 7종과 1:1 로 맞춘다 — 여기 없는 매체는 칩 자체가 안 생겨 필터로 못 고른다
export const NEWS_CATEGORIES = [
  { id: "all",       emoji: "✨", label_ko: "전체",         label_en: "All" },
  { id: "geeknews",  emoji: "🤓", label_ko: "GeekNews",     label_en: "GeekNews" },
  { id: "hackernews",emoji: "🔥", label_ko: "Hacker News",  label_en: "Hacker News" },
  { id: "aitimes",   emoji: "📰", label_ko: "AI타임스",      label_en: "AI Times" },
  { id: "reddit",    emoji: "👽", label_ko: "Reddit",       label_en: "Reddit" },
  { id: "github",    emoji: "🐙", label_ko: "GitHub",       label_en: "GitHub" },
  { id: "bluesky",   emoji: "🦋", label_ko: "Bluesky",      label_en: "Bluesky" },
  { id: "hfpapers",  emoji: "🤗", label_ko: "HF Daily Papers", label_en: "HF Daily Papers" },
];

export const STUDY_CATEGORIES = [
  { id: "all",     emoji: "✨", label_ko: "전체",         label_en: "All" },
  { id: "paper",   emoji: "📄", label_ko: "논문",         label_en: "Papers" },
  { id: "article", emoji: "📝", label_ko: "아티클/블로그", label_en: "Articles" },
  { id: "video",   emoji: "🎥", label_ko: "강의/영상",     label_en: "Videos" },
  { id: "docs",    emoji: "📚", label_ko: "공식 문서",     label_en: "Docs" },
];
