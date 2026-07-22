const isNewsPage = !!document.getElementById("news-feed-container");
const isStudyPage = !!document.getElementById("study-container");

const STATE = {
  data: null,
  tab: "rising",
  query: "",
  category: "all",
  source: "latest", // "latest" or filename like "2026-04-20.json"
  archives: [],
};

const CATEGORIES = [
  { id: "all",     emoji: "✨", label_ko: "전체",   label_en: "All" },
  { id: "agent",   emoji: "🤖", label_ko: "에이전트", label_en: "Agents" },
  { id: "skill",   emoji: "⚡", label_ko: "스킬",     label_en: "Skills" },
  { id: "harness", emoji: "🔧", label_ko: "하네스",   label_en: "Harness" },
  { id: "mcp",     emoji: "🔌", label_ko: "MCP",      label_en: "MCP" },
];

const NEWS_CATEGORIES = [
  { id: "all",       emoji: "✨", label_ko: "전체",         label_en: "All" },
  { id: "geeknews",  emoji: "🤓", label_ko: "GeekNews",     label_en: "GeekNews" },
  { id: "instagram", emoji: "📸", label_ko: "Instagram",    label_en: "Instagram" },
  { id: "x",         emoji: "🐦", label_ko: "X (Twitter)",  label_en: "X" },
  { id: "threads",   emoji: "🧵", label_ko: "Threads",      label_en: "Threads" },
];

const STUDY_CATEGORIES = [
  { id: "all",     emoji: "✨", label_ko: "전체",         label_en: "All" },
  { id: "paper",   emoji: "📄", label_ko: "논문",         label_en: "Papers" },
  { id: "article", emoji: "📝", label_ko: "아티클/블로그", label_en: "Articles" },
  { id: "video",   emoji: "🎥", label_ko: "강의/영상",     label_en: "Videos" },
  { id: "docs",    emoji: "📚", label_ko: "공식 문서",     label_en: "Docs" },
];

async function load(source) {
  STATE.source = source || "latest";
  let url;
  if (isNewsPage) {
    url = STATE.source === "latest" ? "public/data/news_latest.json" : `public/data/archive/news_${STATE.source}`;
  } else if (isStudyPage) {
    url = STATE.source === "latest" ? "public/data/study_latest.json" : `public/data/archive/study_${STATE.source}`;
  } else {
    url = STATE.source === "latest" ? "public/data/latest.json" : `public/data/archive/${STATE.source}`;
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    STATE.data = await res.json();
  } catch (e) {
    if (isNewsPage) STATE.data = { generated_at: null, news: [] };
    else if (isStudyPage) STATE.data = { generated_at: null, items: [] };
    else STATE.data = { generated_at: null, rising: [], classic: [] };
  }
  renderUpdateBar();
  renderCategoryFilter();
  render();
}

async function loadArchives() {
  try {
    let url = "public/data/archive/index.json";
    if (isNewsPage) url = "public/data/archive/news_index.json";
    if (isStudyPage) url = "public/data/archive/study_index.json";
    const res = await fetch(url, { cache: "no-store" });
    const j = await res.json();
    STATE.archives = j.archives || [];
  } catch (e) {
    STATE.archives = [];
  }
  renderArchiveMenu();
}

function nextUpdateDate(from) {
  const d = new Date(from);
  if (isNewsPage) {
    d.setDate(d.getDate() + 1);
  } else {
    const day = d.getDay();
    const add = day === 1 ? 7 : ((8 - day) % 7 || 7);
    d.setDate(d.getDate() + add);
  }
  d.setHours(0, 0, 0, 0);
  return d;
}
function fmtDate(d) {
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}

function updateMeta() { /* hero stats removed */ }

function fmtKDate(d) {
  return `${d.getMonth()+1}/${d.getDate()}`;
}
function fmtKFull(d) {
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
}
function dayLabel(d, lang) {
  const k = ["일","월","화","수","목","금","토"];
  const e = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (lang === "en" ? e : k)[d.getDay()];
}
function renderUpdateBar() {
  const d = STATE.data || {};
  const ts = d.generated_at ? new Date(d.generated_at) : null;
  const lang = getLang();
  const updEl = document.getElementById("updated-at");
  const nxtEl = document.getElementById("next-at");
  const verEl = document.getElementById("version-pill");
  if (!updEl) return;
  if (ts) {
    updEl.textContent = `${fmtKFull(ts)} (${dayLabel(ts, lang)})`;
    if (STATE.source === "latest") {
      const nm = nextUpdateDate(ts);
      nxtEl.textContent = `${fmtKDate(nm)} (${dayLabel(nm, lang)})`;
      nxtEl.style.display = "";
      nxtEl.previousElementSibling.style.display = "";
      nxtEl.previousElementSibling.previousElementSibling.style.display = "";
    } else {
      nxtEl.style.display = "none";
      nxtEl.previousElementSibling.style.display = "none";
      nxtEl.previousElementSibling.previousElementSibling.style.display = "none";
    }
  } else {
    updEl.textContent = "—";
    nxtEl.textContent = "—";
  }
  if (verEl) {
    verEl.textContent = d.version || "";
    if (STATE.source !== "latest") {
      verEl.classList.add("is-archive");
      verEl.title = lang === "en" ? "Viewing archive" : "아카이브 보기";
    } else {
      verEl.classList.remove("is-archive");
      verEl.title = "";
    }
  }
}

function renderArchiveMenu() {
  const ul = document.getElementById("archive-menu");
  if (!ul) return;
  const lang = getLang();
  const latestLabel = lang === "en" ? "Latest week" : "최신 주차";
  const items = [
    `<li><button data-source="latest" class="${STATE.source === "latest" ? "is-active" : ""}">
       <span class="ar-ver">${latestLabel}</span>
     </button></li>`
  ];
  for (const a of STATE.archives) {
    const dt = a.generated_at ? fmtKFull(new Date(a.generated_at)) : a.file;
    items.push(`<li><button data-source="${escapeHTML(a.file)}" class="${STATE.source === a.file ? "is-active" : ""}">
      <span class="ar-ver">${escapeHTML(a.version || a.file)}</span>
      <span class="ar-date">${dt}</span>
    </button></li>`);
  }
  ul.innerHTML = items.join("");
}

function renderCategoryFilter() {
  const wrap = document.getElementById("cat-filter");
  if (!wrap) return;
  const lang = getLang();
  
  if (isNewsPage) {
    const list = (STATE.data?.news || []);
    wrap.innerHTML = NEWS_CATEGORIES.map(c => {
      const count = c.id === "all" ? list.length : list.filter(x => x.category_id === c.id).length;
      if (c.id !== "all" && count === 0) return "";
      const label = lang === "en" ? c.label_en : c.label_ko;
      const active = STATE.category === c.id ? "is-active" : "";
      return `<button class="cat-chip ${active}" data-cat="${c.id}" type="button">
        <span class="cat-emoji">${c.emoji}</span>
        <span>${label}</span>
        <span class="cat-count">${count}</span>
      </button>`;
    }).join("");
  } else if (isStudyPage) {
    const list = (STATE.data?.items || []);
    wrap.innerHTML = STUDY_CATEGORIES.map(c => {
      const count = c.id === "all" ? list.length : list.filter(x => x.type === c.id).length;
      if (c.id !== "all" && count === 0) return "";
      const label = lang === "en" ? c.label_en : c.label_ko;
      const active = STATE.category === c.id ? "is-active" : "";
      return `<button class="cat-chip ${active}" data-cat="${c.id}" type="button">
        <span class="cat-emoji">${c.emoji}</span>
        <span>${label}</span>
        <span class="cat-count">${count}</span>
      </button>`;
    }).join("");
  } else {
    const list = (STATE.data?.[STATE.tab] || []);
    wrap.innerHTML = CATEGORIES.map(c => {
      const count = c.id === "all" ? list.length : list.filter(x => x.category === c.id).length;
      if (c.id !== "all" && count === 0) return "";
      const label = lang === "en" ? c.label_en : c.label_ko;
      const active = STATE.category === c.id ? "is-active" : "";
      return `<button class="cat-chip ${active}" data-cat="${c.id}" type="button">
        <span class="cat-emoji">${c.emoji}</span>
        <span>${label}</span>
        <span class="cat-count">${count}</span>
      </button>`;
    }).join("");
  }
}

function updateTabCounts() {
  const d = STATE.data || {};
  const r = document.getElementById("rising-count");
  const c = document.getElementById("classic-count");
  if (r) r.textContent = (d.rising || []).length;
  if (c) c.textContent = (d.classic || []).length;
}

function matches(item) {
  if (!STATE.query) return true;
  const q = STATE.query.toLowerCase();
  const hay = [
    item.title_ko, item.catchphrase, item.summary_ko,
    item.id, (item.tags || []).join(" "),
    (item.key_features || []).join(" "),
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function formatStars(n) {
  if (!n && n !== 0) return "—";
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k";
  return String(n);
}

function escapeHTML(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function formatRepoId(id) {
  if (!id) return "";
  const [owner, ...rest] = id.split("/");
  const repo = rest.join("/");
  if (!repo) return escapeHTML(owner);
  return `<span class="owner">${escapeHTML(owner)}</span><span class="slash">/</span>${escapeHTML(repo)}`;
}

const STICKER_FALLBACKS = ["s-mint", "s-lemon", "s-sky", "s-pink", "s-peach", "s-lilac"];
function stickerFor(item, idx) {
  const rank = idx + 1;
  const isRising = (item.badges || []).some(b => b.includes("Rising"));
  const isNew = (item.badges || []).some(b => b.includes("신상") || b.includes("7일"));
  const isKor = (item.badges || []).some(b => b.includes("한국어"));

  if (isNew) return { color: "s-mint", top: "NEW", bottom: "신상" };
  if (isRising && rank === 1) return { color: "s-coral", top: "#01", bottom: "TOP" };
  if (isRising && rank <= 3) return { color: "s-lemon", top: "#0" + rank, bottom: "급상승" };
  if (rank === 1) return { color: "s-lemon", top: "#01", bottom: "대세" };
  if (isKor) return { color: "s-sky", top: "KR", bottom: "한국어" };
  if (isRising) return { color: "s-pink", top: "HOT", bottom: "화제" };
  return { color: STICKER_FALLBACKS[idx % STICKER_FALLBACKS.length], top: "#" + String(rank).padStart(2,"0"), bottom: "PICK" };
}

function cardHTML(item, idx) {
  const safeId = escapeHTML(item.id || "");
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png?size=80`;
  const rank = idx + 1;
  const rankStr = String(rank).padStart(2, "0");
  const isFeatured = idx === 0;
  const st = stickerFor(item, idx);

  const feats = (item.key_features || []).slice(0, 3).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  return `
    <article class="card" data-id="${safeId}" tabindex="0" role="button" aria-label="${escapeHTML(item.title_ko || item.id)} 상세 보기">
      <div class="sticker ${st.color}">
        <strong>${escapeHTML(st.top)}</strong>
        ${escapeHTML(st.bottom)}
      </div>
      <div class="card-head">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
        <div class="head-meta">
          <div class="category-label">${escapeHTML(item.category || "")}</div>
          <div class="repo-id">${formatRepoId(item.id)}</div>
        </div>
      </div>
      <h3>${escapeHTML(item.title_ko || item.id)}</h3>
      ${item.catchphrase ? `<p class="catch">${escapeHTML(item.catchphrase)}</p>` : ""}
      ${feats ? `<ul class="features">${feats}</ul>` : ""}
      ${sourcesLine(item)}
      <div class="card-foot">
        <span class="meta-left"><span class="stars-line">★ ${formatStars(item.stars)}</span></span>
        <a class="repo-link" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
          GITHUB <span class="arrow">→</span>
        </a>
      </div>
    </article>
  `;
}

const SOURCE_LABEL = {
  github: "GitHub", hn: "HN", reddit: "Reddit",
  devto: "dev.to", geeknews: "GeekNews", velog: "velog",
  twitter: "X", x: "X", anthropic: "Anthropic",
};
function sourcesLine(item) {
  const srcs = (item.sources || []).slice(0, 5);
  const score = item.trend_score;
  if (!srcs.length && score == null) return "";
  const chips = srcs.map(s => `<span class="src-chip">${escapeHTML(SOURCE_LABEL[s] || s)}</span>`).join("");
  const scoreEl = (score != null) ? `<span class="src-score" title="검증 점수">검증 ${score}</span>` : "";
  return `<div class="src-line">${chips}${scoreEl}</div>`;
}

function modalHTML(item, tab, rank) {
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png?size=80`;
  const tags = (item.tags || []).map(t =>
    `<span class="m-tag">${escapeHTML(t)}</span>`
  ).join("");
  const feats = (item.key_features || []).map(f =>
    `<li>${escapeHTML(f)}</li>`
  ).join("");
  const badges = (item.badges || []).map(b => {
    let cls = "";
    if (b.includes("Rising")) cls = "b-rising";
    else if (b.includes("Classic")) cls = "b-classic";
    return `<span class="m-badge ${cls}">${escapeHTML(b)}</span>`;
  }).join("");
  const tabLabel = tab === "rising" ? "이번 주 뜨는" : "이미 유명한";
  const rankStr = String(rank).padStart(2, "0");

  return `
    <div class="m-rank">
      <span class="accent">${tabLabel}</span>
      <span class="dot-sep">·</span>
      <span>#${rankStr}</span>
    </div>
    <div class="m-head">
      <img class="m-avatar" src="${escapeHTML(avatar)}" alt="" onerror="this.style.visibility='hidden'"/>
      <div class="m-meta">
        <div class="m-category">${escapeHTML(item.category || "")}</div>
        <div class="m-repo">${formatRepoId(item.id)}</div>
      </div>
      <div class="m-stars">★ ${formatStars(item.stars)}</div>
    </div>
    <h2>${escapeHTML(item.title_ko || item.id)}</h2>
    ${item.catchphrase ? `<p class="m-catch">${escapeHTML(item.catchphrase)}</p>` : ""}
    ${modalSourcesSection(item)}
    ${badges ? `<div class="m-badges">${badges}</div>` : ""}
    ${item.summary_ko ? `<div class="m-section"><div class="m-label">어떤 프로젝트인가</div><p class="m-summary">${escapeHTML(item.summary_ko)}</p></div>` : ""}
    ${feats ? `<div class="m-section"><div class="m-label">핵심 기능</div><ul class="m-features">${feats}</ul></div>` : ""}
    ${item.use_case ? `<div class="m-section"><div class="m-label">이럴 때 쓰면 좋아요</div><div class="m-usecase">${escapeHTML(item.use_case)}</div></div>` : ""}
    ${item.install_hint ? `<div class="m-section"><div class="m-label">설치 · 시작하기</div><div class="m-install">${escapeHTML(item.install_hint)}</div></div>` : ""}
    ${tags ? `<div class="m-section"><div class="m-label">태그</div><div class="m-tags">${tags}</div></div>` : ""}
    <div class="m-cta-row">
      <a class="m-cta" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener">
        GitHub에서 열기 →
      </a>
    </div>
  `;
}

function modalSourcesSection(item) {
  const srcs = (item.sources || []);
  const evi = (item.evidence || []);
  const score = item.trend_score;
  if (!srcs.length && !evi.length && score == null) return "";

  let html = `<div class="m-section"><div class="m-label">출처 · 검증</div>`;
  if (score != null) {
    html += `<div class="m-score-box">검증 점수 <strong>${score}</strong> / 100<span class="m-score-formula">velocity · buzz · quality · recency 종합</span></div>`;
  }
  if (srcs.length) {
    const chips = srcs.map(s => `<span class="src-chip">${escapeHTML(SOURCE_LABEL[s] || s)}</span>`).join("");
    html += `<div class="m-src-row"><span class="m-src-label">수집 출처</span><div class="m-src-chips">${chips}</div></div>`;
  }
  if (evi.length) {
    html += `<ul class="m-evidence">`;
    for (const e of evi) {
      const label = escapeHTML(e.label || e.source || "");
      const src = escapeHTML(SOURCE_LABEL[e.source] || e.source || "");
      const url = e.url || "";
      html += `<li><span class="src-chip">${src}</span> ${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${label} ↗</a>` : label}</li>`;
    }
    html += `</ul>`;
  }
  html += `</div>`;
  return html;
}

function findItem(id) {
  const d = STATE.data || {};
  const rIdx = (d.rising || []).findIndex(x => x.id === id);
  if (rIdx >= 0) return { item: d.rising[rIdx], tab: "rising", rank: rIdx + 1 };
  const cIdx = (d.classic || []).findIndex(x => x.id === id);
  if (cIdx >= 0) return { item: d.classic[cIdx], tab: "classic", rank: cIdx + 1 };
  return null;
}

function openModal(id) {
  const hit = findItem(id);
  if (!hit) return;
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = modalHTML(hit.item, hit.tab, hit.rank);
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.scrollTop = 0;
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function render() {
  const d = STATE.data || {};
  if (isNewsPage) {
    const el = document.getElementById("news-feed-container");
    if (!el) return;
    renderCategoryFilter();
    let list = (d.news || []);
    if (STATE.category !== "all") {
      list = list.filter(x => x.category_id === STATE.category);
    }
    list = list.filter(matchesNews);

    if (list.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--muted);font-size:15px;">뉴스 데이터가 없습니다. 검색어를 변경해보세요.</div>`;
    } else {
      let html = "";
      
      const genTime = d.generated_at ? new Date(d.generated_at) : new Date();
      const kstDate = new Date(genTime.getTime() + (9 * 60 + genTime.getTimezoneOffset()) * 60000);
      const kstStr = kstDate.toISOString().replace('T', ' ').substring(0, 16) + ' KST';
      
      if (STATE.category === "all" && !STATE.query && d.summary) {
        html += `
          <div class="daily-briefing-panel">
            <div class="db-header">
              <span class="db-title">💡 오늘의 AI 트렌드</span>
            </div>
            <p class="db-summary">${escapeHTML(d.summary)}</p>
            <div class="db-chips">
              <span class="db-chip">🕒 ${kstStr} 기준</span>
              <span class="db-chip">📡 X, Insta, Threads, HN, Reddit, GeekNews</span>
              <span class="db-chip">🔥 최근 24시간 핫이슈</span>
            </div>
            <div class="db-footer">
              ⚠️ 주식·투자 관련 신호는 제외합니다. 게시물 내 모델명 및 수치 등은 원문 그대로 옮겼으며 교차 검증되지 않았습니다.
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="daily-briefing-panel is-compact">
            <div class="db-chips">
              <span class="db-chip">🕒 ${kstStr} 기준</span>
              <span class="db-chip">📡 최근 24시간 핫이슈 정렬</span>
            </div>
          </div>
        `;
      }
      
      html += `<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">`;
      html += list.map((it, idx) => newsCardHTML(it, idx)).join("");
      html += `</div>`;
      el.innerHTML = html;
    }
  } else if (isStudyPage) {
    const el = document.getElementById("study-container");
    if (!el) return;
    renderCategoryFilter();
    let list = (d.items || []);
    if (STATE.category !== "all") {
      list = list.filter(x => x.type === STATE.category);
    }
    list = list.filter(matchesStudy);

    if (list.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--muted);font-size:15px;">스터디 자료가 없습니다. 검색어를 변경해보세요.</div>`;
    } else {
      let html = `<div class="grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;padding-top:20px;">`;
      html += list.map((it, idx) => studyCardHTML(it, idx)).join("");
      html += `</div>`;
      el.innerHTML = html;
    }
  } else {
    const base = d[STATE.tab] || [];
    const list = base
      .filter(it => STATE.category === "all" || it.category === STATE.category)
      .filter(matches);
    const el = document.getElementById("grid");
    if (!el) return;
    updateTabCounts();
    renderCategoryFilter();
    if (list.length === 0) {
      const lang = getLang();
      const msg = lang === "en"
        ? "No matches. Try a different category or clear the search."
        : "조건에 맞는 항목이 없어요. 카테고리·검색어를 바꿔보세요.";
      el.innerHTML = `<div class="empty">${msg}</div>`;
    } else {
      el.innerHTML = list.map((it, i) => cardHTML(it, i)).join("");
    }
  }
}

function matchesNews(item) {
  if (!STATE.query) return true;
  const q = STATE.query.toLowerCase();
  const hay = [
    item.headline, item.title_ko, item.summary_ko, item.body_ko, item.author,
    (item.tags || []).join(" "), (item.sources || []).join(" "), item.category_name
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function newsCardHTML(item, idx = 0) {
  const safeId = escapeHTML(item.id || "");
  
  const rank = idx + 1;
  const isTop3 = rank <= 3 && STATE.category === "all" && !STATE.query;
  
  let sticker = "";
  if (isTop3) {
    const stColors = ["s-coral", "s-lemon", "s-lemon"];
    const stBottoms = ["TOP", "급상승", "급상승"];
    sticker = `
      <div class="sticker ${stColors[idx]}">
        <strong>#0${rank}</strong>
        ${stBottoms[idx]}
      </div>
    `;
  }
  
  // 멀티미디어 커버 이미지
  const cover = (item.multimedia && item.multimedia.length > 0) 
    ? `<div style="margin:-24px -24px 16px -24px; border-radius:16px 16px 0 0; overflow:hidden;"><img src="${escapeHTML(item.multimedia[0])}" loading="lazy" style="width:100%; height:320px; object-fit:cover;" alt=""/></div>` 
    : "";

  // 작성자 및 발행일 프로필 레이아웃
  const pubDate = item.publish_date ? new Date(item.publish_date) : null;
  const dateStr = pubDate ? `${pubDate.getMonth()+1}/${pubDate.getDate()} ${String(pubDate.getHours()).padStart(2,'0')}:${String(pubDate.getMinutes()).padStart(2,'0')}` : "";
  const authorStr = item.author ? escapeHTML(item.author) : "Unknown";
  
  let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr)}&background=random&color=fff&bold=true`;
  if (item.category_id === 'x' || item.platform === 'X') avatarUrl = `https://unavatar.io/x/${encodeURIComponent(authorStr)}`;
  else if (item.category_id === 'instagram' || item.platform === 'Instagram') avatarUrl = `https://unavatar.io/instagram/${encodeURIComponent(authorStr)}`;
  else if (item.category_id === 'geeknews' || item.platform === 'GeekNews') avatarUrl = `https://news.hada.io/apple-touch-icon.png`;

  const headHtml = `
    <div class="card-head" style="margin-bottom: 12px; padding-right: 60px;">
      <img class="avatar" src="${avatarUrl}" alt="" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr)}&background=F4F4F5&color=3F3F46&bold=true'"/>
      <div class="head-meta">
        <div class="category-label" style="text-transform: uppercase;">${escapeHTML(item.category_name || "NEWS")}</div>
        <div class="repo-id" style="font-size: 13px; margin-top: 2px;">
          <span class="owner" style="color: var(--ink); font-weight: 600;">${authorStr}</span>
          ${dateStr ? `<span style="color: var(--muted);"> · ${dateStr}</span>` : ""}
        </div>
      </div>
    </div>
  `;

  const title = escapeHTML(item.headline || item.title_ko || "");
  const summary = item.summary_ko ? `<p style="margin-top:12px; font-size:15px; line-height:1.6; color:var(--text); opacity:0.9;">${escapeHTML(item.summary_ko)}</p>` : "";
  
  const bodyKo = item.body_ko ? `
    <div class="news-body-wrapper" style="position:relative; margin-top:16px; font-size:14.5px; line-height:1.7; color:var(--text); opacity:0.85;">
      <div class="news-body-content" style="max-height:120px; overflow:hidden; transition: max-height 0.4s ease; white-space:pre-wrap;">${escapeHTML(item.body_ko)}</div>
      <div class="news-body-fade" style="position:absolute; bottom:0; left:0; right:0; height:60px; background:linear-gradient(to bottom, transparent, var(--card)); transition:opacity 0.4s ease; pointer-events:none;"></div>
    </div>
    <button type="button" style="display:block; width:100%; text-align:center; padding:12px 0; margin-top:4px; font-size:13.5px; font-weight:600; color:var(--accent); background:none; border:none; cursor:pointer; outline:none;" onclick="
      const wrap = this.previousElementSibling.querySelector('.news-body-content');
      const fade = this.previousElementSibling.querySelector('.news-body-fade');
      if(wrap.style.maxHeight !== 'none') {
        wrap.style.maxHeight = 'none';
        fade.style.opacity = '0';
        this.innerHTML = '접기 ↑';
      } else {
        wrap.style.maxHeight = '120px';
        fade.style.opacity = '1';
        this.innerHTML = '본문 펼쳐 읽기 ↓';
      }
    ">본문 펼쳐 읽기 ↓</button>
  ` : "";
  
  const tags = (item.tags && item.tags.length > 0) ? `<div style="margin-top:16px; display:flex; flex-wrap:wrap; gap:8px;">${item.tags.map(t => `<span style="font-size:12.5px; padding:4px 10px; border-radius:12px; background:rgba(0,0,0,0.04); color:var(--ink-2); font-weight:500;">#${escapeHTML(t)}</span>`).join("")}</div>` : "";

  const related = (item.related_articles && item.related_articles.length > 0) ? `<div style="margin-top:20px; font-size:14px; background:var(--pill); padding:16px; border-radius:12px;"><strong style="color:var(--ink-2); display:flex; align-items:center; gap:6px;">🔗 관련 기사</strong><ul style="margin-top:8px; padding-left:20px; color:var(--muted); list-style-type:circle;">${item.related_articles.map(r => `<li style="margin-bottom:6px;"><a href="${escapeHTML(r.url)}" target="_blank" rel="noopener" style="color:var(--muted); text-decoration:none; transition:color 0.2s;" onmouseover="this.style.color='var(--ink)'" onmouseout="this.style.color='var(--muted)'">${escapeHTML(r.title)}</a></li>`).join("")}</ul></div>` : "";

  const sources = (item.sources || []).map(s => `<span class="src-chip">${escapeHTML(s)}</span>`).join("");
  const linkBtn = item.url ? `
    <div class="card-foot" style="margin-top:24px; border-top:1px solid rgba(255,255,255,0.06); padding-top:16px;">
      <span class="meta-left"></span>
      <a class="repo-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
        원문 보기 <span class="arrow">→</span>
      </a>
    </div>
  ` : "";

  return `
    <article class="card news-card" data-id="${safeId}" style="position:relative; padding:24px; box-shadow:0 4px 12px rgba(0,0,0,0.05); border-radius:16px;">
      ${sticker}
      ${cover}
      ${headHtml}
      <h3 style="margin-top:0; margin-bottom:12px; line-height:1.45; font-size:20px;">${title}</h3>
      ${summary}
      ${bodyKo}
      ${tags}
      ${related}
      <div class="src-line" style="margin-top:20px; flex-wrap:wrap; gap:8px;">${sources}</div>
      ${linkBtn}
    </article>
  `;
}

function matchesStudy(item) {
  if (!STATE.query) return true;
  const q = STATE.query.toLowerCase();
  const hay = [
    item.title, item.summary, item.type,
    (item.tags || []).join(" ")
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function studyCardHTML(item, idx) {
  const safeId = escapeHTML(item.id || "");
  const title = escapeHTML(item.title || "");
  const summary = escapeHTML(item.summary || "");
  const time = escapeHTML(item.estimated_time || "");
  const tags = (item.tags || []).map(t => `<span class="src-chip" style="background:var(--pill); border:none; padding:4px 8px; font-size:12px;">#${escapeHTML(t)}</span>`).join("");
  const linkBtn = item.url ? `
    <div class="card-foot" style="margin-top:24px; border-top:1px solid rgba(255,255,255,0.06); padding-top:16px;">
      <span class="meta-left" style="color:var(--muted); font-size:13px; font-weight:500;">⏱️ ${time}</span>
      <a class="repo-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
        자료 보기 <span class="arrow">→</span>
      </a>
    </div>
  ` : "";

  let categoryLabel = item.type;
  const catObj = STUDY_CATEGORIES.find(c => c.id === item.type);
  if (catObj) {
    categoryLabel = getLang() === "en" ? catObj.label_en : catObj.label_ko;
  }

  return `
    <article class="card study-card" data-id="${safeId}" style="position:relative; padding:24px; box-shadow:0 4px 12px rgba(0,0,0,0.05); border-radius:16px; cursor:pointer;" onclick="window.open('${escapeHTML(item.url)}', '_blank')">
      <div class="card-head" style="margin-bottom: 12px;">
        <div class="head-meta" style="margin-left: 0;">
          <div class="category-label" style="text-transform: uppercase;">${escapeHTML(categoryLabel || "")}</div>
        </div>
      </div>
      <h3 style="margin-top:0; margin-bottom:12px; line-height:1.45; font-size:20px;">${title}</h3>
      ${summary ? `<p style="margin-top:12px; font-size:15px; line-height:1.6; color:var(--text); opacity:0.9;">${summary}</p>` : ""}
      ${tags ? `<div style="margin-top:16px; display:flex; flex-wrap:wrap; gap:8px;">${tags}</div>` : ""}
      ${linkBtn}
    </article>
  `;
}

document.getElementById("search")?.addEventListener("input", e => {
  STATE.query = e.target.value;
  render();
});
document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    STATE.tab = btn.dataset.tab;
    STATE.category = "all";
    render();
  });
});

document.getElementById("cat-filter")?.addEventListener("click", e => {
  const btn = e.target.closest(".cat-chip");
  if (!btn) return;
  STATE.category = btn.dataset.cat;
  render();
});

const archiveBtn = document.getElementById("archive-btn");
const archiveMenu = document.getElementById("archive-menu");
archiveBtn?.addEventListener("click", e => {
  e.stopPropagation();
  const open = !archiveMenu.hidden;
  archiveMenu.hidden = open;
  archiveBtn.setAttribute("aria-expanded", String(!open));
});
archiveMenu?.addEventListener("click", e => {
  const btn = e.target.closest("button[data-source]");
  if (!btn) return;
  archiveMenu.hidden = true;
  archiveBtn.setAttribute("aria-expanded", "false");
  load(btn.dataset.source);
});
document.addEventListener("click", e => {
  if (archiveMenu && !archiveMenu.hidden && !e.target.closest(".archive-wrap")) {
    archiveMenu.hidden = true;
    archiveBtn?.setAttribute("aria-expanded", "false");
  }
});

document.getElementById("grid")?.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (card) openModal(card.dataset.id);
});
document.getElementById("grid")?.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) {
    e.preventDefault();
    openModal(e.target.dataset.id);
  }
});
document.getElementById("modal").addEventListener("click", e => {
  if (e.target.dataset.close !== undefined) closeModal();
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

const CRITERIA_HTML = `
  <div class="cr-eyebrow">CC-TRENDS · SCORING</div>
  <h2 class="cr-title">순위는 어떻게 매겨지나요?</h2>
  <p class="cr-lede">매주 4가지 축의 가중 점수로 다시 계산합니다.</p>

  <div class="cr-formula">
    <div class="cr-formula-line">
      <span class="cr-token">score</span>
      <span class="cr-eq">=</span>
      <span class="cr-weight w-velocity"><b>0.4</b>·velocity</span>
      <span class="cr-plus">+</span>
      <span class="cr-weight w-buzz"><b>0.3</b>·buzz</span>
      <span class="cr-plus">+</span>
      <span class="cr-weight w-quality"><b>0.2</b>·quality</span>
      <span class="cr-plus">+</span>
      <span class="cr-weight w-recency"><b>0.1</b>·recency</span>
    </div>
    <div class="cr-bar">
      <span class="cr-bar-seg w-velocity" style="flex:40"><span>40%</span></span>
      <span class="cr-bar-seg w-buzz" style="flex:30"><span>30%</span></span>
      <span class="cr-bar-seg w-quality" style="flex:20"><span>20%</span></span>
      <span class="cr-bar-seg w-recency" style="flex:10"><span>10%</span></span>
    </div>
  </div>

  <div class="cr-section">
    <div class="cr-section-label">평가 4축</div>
    <div class="cr-axes">
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-velocity"></span>
          <span class="cr-axis-name">Velocity</span>
          <span class="cr-axis-pct">40%</span>
        </div>
        <p class="cr-axis-desc">GitHub 7일 stars 증가 속도. 신상(30일 이내)은 연령 보정 적용.</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-buzz"></span>
          <span class="cr-axis-name">Community Buzz</span>
          <span class="cr-axis-pct">30%</span>
        </div>
        <p class="cr-axis-desc">HN · dev.to · GeekNews · velog · X 언급의 가중 합. 2개+ 플랫폼 +10, 3개+ +15, HN 프론트 도달 +10. (Reddit은 현재 수집 불가로 제외)</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-quality"></span>
          <span class="cr-axis-name">Quality</span>
          <span class="cr-axis-pct">20%</span>
        </div>
        <p class="cr-axis-desc">README 깊이, 라이선스, 최근 커밋, 테스트/예제, CI, 문서화 점수.</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-recency"></span>
          <span class="cr-axis-name">Recency</span>
          <span class="cr-axis-pct">10%</span>
        </div>
        <p class="cr-axis-desc">최근 커밋이 얼마나 따끈한지. 60일 이상 방치면 0점.</p>
      </div>
    </div>
  </div>

  <div class="cr-section">
    <div class="cr-section-label">Rising vs Classic</div>
    <div class="cr-versus">
      <div class="cr-vs-card cr-rising">
        <div class="cr-vs-head"><span class="cr-vs-icon">🔥</span><strong>Rising</strong> · 이번 주 뜨는</div>
        <div class="cr-vs-rule">하나라도 충족하면 OK</div>
        <ul>
          <li>생성 30일 이내</li>
          <li>velocity ≥ 60 + 최근 14일 커뮤니티 언급 2건+</li>
          <li>velocity ≥ 80 (폭발 성장) — 출처 무관 <span style="opacity:.7">⚠️ 단일출처 표기</span></li>
          <li>HN 프론트페이지 최근 7일 내 도달</li>
        </ul>
      </div>
      <div class="cr-vs-card cr-classic">
        <div class="cr-vs-head"><span class="cr-vs-icon">⭐</span><strong>Classic</strong> · 이미 유명한</div>
        <div class="cr-vs-rule">전부 충족해야 OK</div>
        <ul>
          <li>stars ≥ 500</li>
          <li>생성 60일 경과</li>
          <li>최근 30일 내 커밋 존재</li>
        </ul>
      </div>
    </div>
    <p class="cr-note">둘 다 해당되면 <strong>Rising 우선</strong> (신선도 가산)</p>
  </div>

  <div class="cr-section">
    <div class="cr-section-label">편향 보정</div>
    <div class="cr-bias">
      <div class="cr-bias-row">
        <span class="cr-bias-tag">+10</span>
        <span>한국어 README·블로그 발견 시 buzz 가산 — 영어권 규모 차이 보정</span>
      </div>
      <div class="cr-bias-row">
        <span class="cr-bias-tag">official</span>
        <span>Anthropic 공식·임직원 프로젝트는 태그만 부여, 점수는 동일</span>
      </div>
    </div>
  </div>

  <p class="cr-foot">카테고리별 정원 내 점수순 선별 (Rising: skill 8·mcp 6·agent 4·harness 2 / Classic: skill 6·mcp 4·agent 4·harness 2) · 동점은 최근 업데이트순 · 정원 미달은 억지로 채우지 않음 · 채점 미달은 다음 주 재검토</p>

  <a class="m-cta" href="https://github.com/ldk-hub/ai-weekly" target="_blank" rel="noopener">
    소스 코드 보기 →
  </a>
`;

function openCriteria() {
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = CRITERIA_HTML;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal.scrollTop = 0;
}
document.getElementById("open-criteria-top")?.addEventListener("click", openCriteria);

/* ─── i18n toggle ─────────────────────────────────────────── */
const I18N_KEY = "aiweekly:lang";
function getLang() {
  return localStorage.getItem(I18N_KEY) || "ko";
}
function applyLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n-en]").forEach((el) => {
    const val = el.getAttribute(`data-i18n-${lang}`);
    if (val != null) el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-en-html]").forEach((el) => {
    const val = el.getAttribute(`data-i18n-${lang}-html`);
    if (val != null) el.innerHTML = val;
  });
  document.querySelectorAll("[data-i18n-en-placeholder]").forEach((el) => {
    const val = el.getAttribute(`data-i18n-${lang}-placeholder`);
    if (val != null) el.placeholder = val;
  });
  document.querySelectorAll(".lang-toggle .lang-opt").forEach((el) => {
    el.classList.toggle("active", el.dataset.lang === lang);
  });
}
document.getElementById("lang-toggle")?.addEventListener("click", () => {
  const next = getLang() === "en" ? "ko" : "en";
  localStorage.setItem(I18N_KEY, next);
  applyLang(next);
  renderUpdateBar();
  renderArchiveMenu();
  renderCategoryFilter();
});
applyLang(getLang());

/* ─── theme toggle ─────────────────────────────────────────── */
function getEffectiveTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === 'dark' || t === 'light') return t;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function updateThemeColorMeta(eff) {
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = eff === 'dark' ? '#161410' : '#fbfaf6';
}
function renderThemeToggle() {
  const eff = getEffectiveTheme();
  updateThemeColorMeta(eff);
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  const icon = btn.querySelector(".theme-icon");
  if (icon) {
    icon.textContent = eff === 'dark' ? '☀️ 라이트' : '🌙 다크';
  }
}
document.getElementById("theme-toggle")?.addEventListener("click", () => {
  const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('aiw-theme', next); } catch (e) {}
  renderThemeToggle();
});
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('aiw-theme')) {
      document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
      renderThemeToggle();
    }
  });
}
renderThemeToggle();

loadArchives();
load();
