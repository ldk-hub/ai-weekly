export const isNewsPage = !!document.getElementById("news-feed-container");
export const isStarboardPage = !!document.getElementById("starboard-container");
export const isLoungePage = !!document.getElementById("lounge-container");
export const isBenchmarksPage = !!document.getElementById("benchmarks-container");

// giscus (GitHub Discussions) 설정 — 라운지 대화와 뉴스 항목별 댓글이 모두 이 값을 쓴다.
// repoId·categoryId 는 https://giscus.app 에서 리포를 입력하면 발급된다.
// 비어 있으면 화면에 안내를 띄우고 위젯을 붙이지 않는다 (조용히 깨지지 않게).
export const GISCUS = {
  repo: "ldk-hub/ai-weekly",
  repoId: "R_kgDOTXrViw",
  loungeCategory: "General",
  loungeCategoryId: "DIC_kwDOTXrVi84DENxe",
  newsCategory: "General",
  newsCategoryId: "DIC_kwDOTXrVi84DENxe",
};
export const isGiscusReady = () => !!(GISCUS.repoId && GISCUS.loungeCategoryId && GISCUS.newsCategoryId);

export function loadBookmarks() {
  try {
    return new Set(JSON.parse(localStorage.getItem("aiw-news-bookmarks") || "[]"));
  } catch (e) {
    return new Set();
  }
}
export function saveBookmarks(set) {
  try {
    localStorage.setItem("aiw-news-bookmarks", JSON.stringify([...set]));
  } catch (e) {}
}

export function loadPluginBookmarks() {
  try {
    return new Set(JSON.parse(localStorage.getItem("aiw-plugin-bookmarks") || "[]"));
  } catch (e) {
    return new Set();
  }
}
export function savePluginBookmarks(set) {
  try {
    localStorage.setItem("aiw-plugin-bookmarks", JSON.stringify([...set]));
  } catch (e) {}
}

export function loadStarboardBookmarks() {
  try {
    return new Set(JSON.parse(localStorage.getItem("aiw-starboard-bookmarks") || "[]"));
  } catch (e) {
    return new Set();
  }
}
export function saveStarboardBookmarks(set) {
  try {
    localStorage.setItem("aiw-starboard-bookmarks", JSON.stringify([...set]));
  } catch (e) {}
}

export const STATE = {
  data: null,
  tab: isStarboardPage ? "heavy" : "rising",
  query: "",
  category: "all",
  signal: "all",
  pluginSort: "score",        // 'score' | 'velocity' | 'stars'
  starboardSort: "velocity",  // 'velocity' | 'stars'
  starboardActivity: "all",   // 'all' | 'active' | 'slowing'
  starboardBookmarksOnly: false,
  starboardBookmarks: loadStarboardBookmarks(),
  bookmarksOnly: false,
  bookmarks: loadBookmarks(),
  pluginBookmarksOnly: false,
  pluginBookmarks: loadPluginBookmarks(),
  allExpanded: false,
  source: "latest",
  loadError: null,
  archives: [],
  lounge: null,
  sbLimit: 50,
  viewMode: localStorage.getItem("aiw-view") || "card",
  benchmarkTab: "share",      // 'share' | 'bench'
  benchmarkSort: "composite", // 'composite' | 'coding' | 'arena' | 'aa' | 'livebench' | 'price'
  benchmarkOthersOpen: false,
  benchmarkDomainFilter: "all", // 'all' | 'coding' | 'reasoning' | 'open'
  benchmarkView: "matrix"       // 'matrix' | 'table'
};

/**
 * URL 쿼리스트링에서 초기 탐색 상태(tab, cat, sig, sort, act, q, view, saved)를 복원한다.
 */
export function syncStateFromURL() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const cat = params.get("cat");
    const sig = params.get("sig");
    const sort = params.get("sort");
    const act = params.get("act");
    const q = params.get("q");
    const view = params.get("view");
    const saved = params.get("saved");

    if (q !== null) STATE.query = q;
    if (view === "list" || view === "card") STATE.viewMode = view;

    if (isBenchmarksPage) {
      if (tab === "share" || tab === "bench") STATE.benchmarkTab = tab;
      if (sort && ["composite", "coding", "arena", "aa", "livebench", "price"].includes(sort)) {
        STATE.benchmarkSort = sort;
      }
    } else if (isStarboardPage) {
      if (tab && ["heavy", "middle", "light"].includes(tab)) STATE.tab = tab;
      if (sort && ["velocity", "stars"].includes(sort)) STATE.starboardSort = sort;
      if (act && ["all", "active", "slowing"].includes(act)) STATE.starboardActivity = act;
      if (saved === "1") STATE.starboardBookmarksOnly = true;
    } else if (isNewsPage) {
      if (cat) STATE.category = cat;
      if (sig) STATE.signal = sig;
      if (saved === "1") STATE.bookmarksOnly = true;
    } else if (!isLoungePage) {
      if (tab && ["rising", "classic"].includes(tab)) STATE.tab = tab;
      if (cat) STATE.category = cat;
      if (sort && ["score", "velocity", "stars"].includes(sort)) STATE.pluginSort = sort;
      if (saved === "1") STATE.pluginBookmarksOnly = true;
    }
  } catch (e) {}
}

/**
 * 현재 STATE를 URL 쿼리스트링에 비파괴적으로(history.replaceState) 동기화한다.
 */
export function syncURLFromState() {
  try {
    const params = new URLSearchParams();
    if (STATE.query) params.set("q", STATE.query);

    if (isBenchmarksPage) {
      if (STATE.benchmarkTab !== "share") params.set("tab", STATE.benchmarkTab);
      if (STATE.benchmarkSort !== "composite") params.set("sort", STATE.benchmarkSort);
    } else if (isStarboardPage) {
      if (STATE.tab !== "heavy") params.set("tab", STATE.tab);
      if (STATE.starboardSort !== "velocity") params.set("sort", STATE.starboardSort);
      if (STATE.starboardActivity !== "all") params.set("act", STATE.starboardActivity);
      if (STATE.starboardBookmarksOnly) params.set("saved", "1");
    } else if (isNewsPage) {
      if (STATE.category !== "all") params.set("cat", STATE.category);
      if (STATE.signal !== "all") params.set("sig", STATE.signal);
      if (STATE.bookmarksOnly) params.set("saved", "1");
    } else if (!isLoungePage) {
      if (STATE.tab !== "rising") params.set("tab", STATE.tab);
      if (STATE.category !== "all") params.set("cat", STATE.category);
      if (STATE.pluginSort !== "score") params.set("sort", STATE.pluginSort);
      if (STATE.pluginBookmarksOnly) params.set("saved", "1");
    }

    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
    window.history.replaceState(null, "", newUrl);
  } catch (e) {}
}

export const CATEGORIES = [
  { id: "all",     emoji: "✨", label_ko: "전체",   label_en: "All" },
  { id: "agent",   emoji: "🤖", label_ko: "에이전트", label_en: "Agents" },
  { id: "skill",   emoji: "⚡", label_ko: "스킬",     label_en: "Skills" },
  { id: "harness", emoji: "🔧", label_ko: "하네스",   label_en: "Harness" },
  { id: "mcp",     emoji: "🔌", label_ko: "MCP",      label_en: "MCP" },
];

// cc-news 수집 매체 8종과 1:1 로 맞춘다 — 여기 없는 매체는 칩 자체가 안 생겨 필터로 못 고른다
export const NEWS_CATEGORIES = [
  { id: "all",       emoji: "✨", label_ko: "전체",         label_en: "All" },
  { id: "geeknews",  emoji: "🤓", label_ko: "GeekNews",     label_en: "GeekNews" },
  { id: "hackernews",emoji: "🔥", label_ko: "Hacker News",  label_en: "Hacker News" },
  { id: "aitimes",   emoji: "📰", label_ko: "AI타임스",      label_en: "AI Times" },
  { id: "reddit",    emoji: "👽", label_ko: "Reddit",       label_en: "Reddit" },
  { id: "github",    emoji: "🐙", label_ko: "GitHub",       label_en: "GitHub" },
  { id: "bluesky",   emoji: "🦋", label_ko: "Bluesky",      label_en: "Bluesky" },
  { id: "x",         emoji: "𝕏",  label_ko: "X",            label_en: "X" },
  { id: "hfpapers",  emoji: "🤗", label_ko: "HF Daily Papers", label_en: "HF Daily Papers" },
];

export const NEWS_SIGNALS = [
  { id: "all",      emoji: "🌐", label_ko: "모든 신호",   label_en: "All Signals" },
  { id: "model",    emoji: "🚀", label_ko: "새 모델",     label_en: "Models" },
  { id: "product",  emoji: "✨", label_ko: "제품 신기능", label_en: "Products" },
  { id: "devtool",  emoji: "🛠️", label_ko: "개발 도구",   label_en: "Dev Tools" },
  { id: "oss",      emoji: "📦", label_ko: "오픈소스",    label_en: "Open Source" },
  { id: "research", emoji: "🔬", label_ko: "연구·논문",   label_en: "Research" },
  { id: "practice", emoji: "💡", label_ko: "실무 팁",     label_en: "Practices" },
  { id: "policy",   emoji: "🏛️", label_ko: "정책·규제",   label_en: "Policy" },
];
