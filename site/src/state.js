export const isNewsPage = !!document.getElementById("news-feed-container");
export const isStarboardPage = !!document.getElementById("starboard-container");
export const isBenchmarksPage = !!document.getElementById("benchmarks-container");

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
    } else {
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
    } else {
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
  { id: "all",     emoji: "✨", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`, label_ko: "전체",   label_en: "All" },
  { id: "agent",   emoji: "🤖", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>`, label_ko: "에이전트", label_en: "Agents" },
  { id: "skill",   emoji: "⚡", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`, label_ko: "스킬",     label_en: "Skills" },
  { id: "harness", emoji: "🔧", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`, label_ko: "하네스",   label_en: "Harness" },
  { id: "mcp",     emoji: "🔌", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2v6m0 8v6M4.93 4.93l4.24 4.24m5.66 5.66 4.24 4.24M2 12h6m8 0h6M4.93 19.07l4.24-4.24m5.66-5.66 4.24-4.24"/></svg>`, label_ko: "MCP",      label_en: "MCP" },
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
  { id: "all",      emoji: "🌐", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`, label_ko: "모든 신호",   label_en: "All Signals" },
  { id: "model",    emoji: "🚀", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>`, label_ko: "새 모델",     label_en: "Models" },
  { id: "product",  emoji: "✨", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, label_ko: "제품 신기능", label_en: "Products" },
  { id: "devtool",  emoji: "🛠️", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`, label_ko: "개발 도구",   label_en: "Dev Tools" },
  { id: "oss",      emoji: "📦", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`, label_ko: "오픈소스",    label_en: "Open Source" },
  { id: "research", emoji: "🔬", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`, label_ko: "연구·논문",   label_en: "Research" },
  { id: "practice", emoji: "💡", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`, label_ko: "실무 팁",     label_en: "Practices" },
  { id: "policy",   emoji: "🏛️", svg: `<svg class="chip-svg-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="2" y1="22" x2="22" y2="22"/><line x1="18" y1="11" x2="18" y2="18"/><line x1="12" y1="11" x2="12" y2="18"/><line x1="6" y1="11" x2="6" y2="18"/><path d="M12 2 2 7h20z"/></svg>`, label_ko: "정책·규제",   label_en: "Policy" },
];
