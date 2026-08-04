
export const isNewsPage = !!document.getElementById("news-feed-container");
export const isStarboardPage = !!document.getElementById("starboard-container");

export const STATE = {
  data: null,
  tab: isStarboardPage ? "heavy" : "rising",
  query: "",
  category: "all",
  source: "latest",
  archives: [],
  viewMode: localStorage.getItem('aiw-view') || 'card'
};

export const CATEGORIES = [
  { id: "all",     emoji: "✨", label_ko: "전체",   label_en: "All" },
  { id: "agent",   emoji: "🤖", label_ko: "에이전트", label_en: "Agents" },
  { id: "skill",   emoji: "⚡", label_ko: "스킬",     label_en: "Skills" },
  { id: "harness", emoji: "🔧", label_ko: "하네스",   label_en: "Harness" },
  { id: "mcp",     emoji: "🔌", label_ko: "MCP",      label_en: "MCP" },
];

// cc-news 수집 매체 7종과 1:1 로 맞춘다 — 목록에 없는 탭은 항상 0건이라 렌더되지 않는다
export const NEWS_CATEGORIES = [
  { id: "all",       emoji: "✨", label_ko: "전체",         label_en: "All" },
  { id: "geeknews",  emoji: "🤓", label_ko: "GeekNews",     label_en: "GeekNews" },
  { id: "hackernews",emoji: "🔥", label_ko: "Hacker News",  label_en: "Hacker News" },
  { id: "aitimes",   emoji: "📰", label_ko: "AI타임스",      label_en: "AI Times" },
  { id: "reddit",    emoji: "👽", label_ko: "Reddit",       label_en: "Reddit" },
  { id: "github",    emoji: "🐙", label_ko: "GitHub",       label_en: "GitHub" },
  { id: "x",         emoji: "🐦", label_ko: "X (Twitter)",  label_en: "X" },
  { id: "threads",   emoji: "🧵", label_ko: "Threads",      label_en: "Threads" },
];

export const STUDY_CATEGORIES = [
  { id: "all",     emoji: "✨", label_ko: "전체",         label_en: "All" },
  { id: "paper",   emoji: "📄", label_ko: "논문",         label_en: "Papers" },
  { id: "article", emoji: "📝", label_ko: "아티클/블로그", label_en: "Articles" },
  { id: "video",   emoji: "🎥", label_ko: "강의/영상",     label_en: "Videos" },
  { id: "docs",    emoji: "📚", label_ko: "공식 문서",     label_en: "Docs" },
];
