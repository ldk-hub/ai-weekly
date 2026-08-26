import { isNewsPage, isStarboardPage, STATE, CATEGORIES, NEWS_CATEGORIES, STUDY_CATEGORIES } from "./state.js";


async function load(source) {
  STATE.source = source || "latest";
  
  if (isStarboardPage) {
    try {
      const [metaRes, ledgerRes] = await Promise.all([
        fetch("data/stars_meta.json", { cache: "no-store" }),
        fetch("data/stars_ledger.json", { cache: "no-store" })
      ]);
      const meta = await metaRes.json();
      const ledger = await ledgerRes.json();
      STATE.data = {
        meta,
        ledger,
        generated_at: meta.generated_at || new Date().toISOString(),
        version: meta.generated_at ? `v${new Date(meta.generated_at).getUTCFullYear()}.${String(new Date(meta.generated_at).getUTCMonth() + 1).padStart(2, '0')}.${String(new Date(meta.generated_at).getUTCDate()).padStart(2, '0')}` : null
      };
      // Process data into leagues
      processStarboardData();
    } catch (e) {
      STATE.data = { meta: {}, ledger: {}, generated_at: null, heavy: [], lightheavy: [], middle: [], welter: [], light: [], feather: [], bantam: [], fly: [] };
    }
  } else {
    let url;
    if (isNewsPage) {
      // news_index.json 은 과거 항목이 날짜만("2026-07-13.json"), 최근 항목이 접두사까지
      // ("news_2026-07-28.json") 담고 있다. 무조건 접두사를 붙이면 news_news_... 로 404 난다.
      const file = STATE.source.startsWith("news_") ? STATE.source : `news_${STATE.source}`;
      url = STATE.source === "latest" ? "data/news_latest.json" : `data/archive/${file}`;
    } else {
      url = STATE.source === "latest" ? "data/latest.json" : `data/archive/${STATE.source}`;
    }
    try {
      const res = await fetch(url, { cache: "no-store" });
      STATE.data = await res.json();
      if (isNewsPage && STATE.data) {
        if (!STATE.data.generated_at) {
          STATE.data.generated_at = STATE.data.updated_at || (STATE.data.curated_date ? `${STATE.data.curated_date}T00:00:00Z` : null);
        }
        if (!STATE.data.version && STATE.data.curated_date) {
          STATE.data.version = `v${STATE.data.curated_date.replace(/-/g, ".")}`;
        }
      }
    } catch (e) {
      if (isNewsPage) STATE.data = { generated_at: null, news: [] };
      else STATE.data = { generated_at: null, rising: [], classic: [] };
    }
  }
  renderUpdateBar();
  renderPageSummary();
  renderCategoryFilter();
  render();
}

async function loadArchives() {
  // 스타보드는 과거 스냅샷 파일이 없다 (ledger 한 개가 전 이력을 담는다).
  // 삭제된 스터디 페이지의 study_index.json(빈 배열)을 읽던 잔재라 아예 건너뛴다.
  if (isStarboardPage) {
    STATE.archives = [];
    renderArchiveMenu();
    return;
  }
  try {
    let url = "data/archive/index.json";
    if (isNewsPage) url = "data/archive/news_index.json";
    const res = await fetch(url, { cache: "no-store" });
    const j = await res.json();
    STATE.archives = Array.isArray(j) ? j : (j.archives || []);
  } catch (e) {
    STATE.archives = [];
  }
  renderArchiveMenu();
}

// 스타보드는 매일 자동 수집(stars.yml), 뉴스는 데일리 파이프라인(매일 갱신), 플러그인은 매주 월요일(weekly-trends.yml)
function nextUpdateDate(from) {
  const d = new Date(from);
  if (isStarboardPage || isNewsPage) {
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

function renderPageSummary() {
  const el = document.getElementById("page-summary");
  if (!el) return;
  const lang = getLang();
  
  if (!STATE.data) {
    el.textContent = "—";
    return;
  }
  
  let total = 0;
  let newCount = 0;
  const checkNew = (item) => (item.badges || []).some(b => b.includes("신상") || b.includes("7일") || b.includes("NEW"));
  
  if (isNewsPage) {
    // "신규 N" 은 손으로 붙인 badges 에만 존재했다. 큐레이터는 badges 를 만들지 않고,
    // 애초에 피드의 모든 항목이 신규라 구분 자체가 무의미하므로 건수만 표시한다.
    const list = STATE.data.news || [];
    total = list.length;
    el.textContent = lang === "en" ? `Collected ${total} news` : `${total}건 수집`;
  } else if (isStarboardPage) {
    const d = STATE.data || {};
    total = (d.heavy?.length || 0) + (d.lightheavy?.length || 0) + (d.middle?.length || 0) + (d.welter?.length || 0) + (d.light?.length || 0) + (d.feather?.length || 0) + (d.bantam?.length || 0) + (d.fly?.length || 0);
    if (lang === "en") {
      el.textContent = `Tracking ${total} repositories`;
    } else {
      el.textContent = `전체 ${total}개 리포지토리 추적 중`;
    }
  } else {
    const rising = STATE.data.rising || [];
    const classic = STATE.data.classic || [];
    total = rising.length + classic.length;
    [...rising, ...classic].forEach(item => { if (checkNew(item)) newCount++; });
    if (lang === "en") {
      el.textContent = newCount > 0 ? `Collected ${total} this week · ${newCount} new` : `Collected ${total} this week`;
    } else {
      el.textContent = newCount > 0 ? `이번 주 ${total}개 수집 · 신규 ${newCount}` : `이번 주 ${total}개 수집`;
    }
  }
}

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
  const rawTs = d.generated_at || d.updated_at || d.curated_date;
  const ts = rawTs ? new Date(rawTs) : null;
  const lang = getLang();
  const updEl = document.getElementById("updated-at");
  const nxtEl = document.getElementById("next-at");
  
  const nxtContainer = document.getElementById("next-at-container");
  const nxtSep = document.getElementById("next-at-sep");
  const verEl = document.getElementById("version-pill");
  
  if (!updEl) return;
  if (ts && !isNaN(ts.getTime())) {
    updEl.textContent = `${fmtKFull(ts)} (${dayLabel(ts, lang)})`;
    if (STATE.source === "latest") {
      const nm = nextUpdateDate(ts);
      if (nxtEl) nxtEl.textContent = `${fmtKDate(nm)} (${dayLabel(nm, lang)})`;
      if (nxtContainer) nxtContainer.style.display = "";
      if (nxtSep) nxtSep.style.display = "";
    } else {
      if (nxtContainer) nxtContainer.style.display = "none";
      if (nxtSep) nxtSep.style.display = "none";
    }
  } else {
    updEl.textContent = "—";
    if (nxtEl) nxtEl.textContent = "—";
    if (nxtContainer) nxtContainer.style.display = "none";
    if (nxtSep) nxtSep.style.display = "none";
  }
  
  if (verEl) {
    const ver = d.version || (d.curated_date ? `v${d.curated_date.replace(/-/g, ".")}` : "");
    verEl.textContent = ver;
    verEl.style.display = ver ? "" : "none";
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
  const wrap = ul.closest(".archive-wrap");
  if (wrap) wrap.style.display = STATE.archives.length ? "" : "none";
  const lang = getLang();
  const latestLabel = isNewsPage
    ? (lang === "en" ? "Latest issue" : "최신 뉴스")
    : (lang === "en" ? "Latest week" : "최신 주차");
  const items = [
    `<li><button data-source="latest" class="${STATE.source === "latest" ? "is-active" : ""}">
       <span class="ar-ver">${latestLabel}</span>
     </button></li>`
  ];
  for (const a of STATE.archives) {
    const rawDt = a.generated_at || a.date;
    const dt = rawDt ? fmtKFull(new Date(rawDt)) : a.file;
    const ver = a.version || (a.date ? `v${a.date.replace(/-/g, ".")}` : a.file);
    items.push(`<li><button data-source="${escapeHTML(a.file)}" class="${STATE.source === a.file ? "is-active" : ""}">
      <span class="ar-ver">${escapeHTML(ver)}</span>
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
  } else if (isStarboardPage) {
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
  // 데이터에 저장된 rank 를 쓴다. 화면 index 로 계산하면 카테고리 필터·검색만 해도
  // 다른 리포가 "#01 TOP" 을 달게 되어 존재하지 않는 순위를 표시한다.
  const rank = item.rank ?? idx + 1;
  const isRising = (item.badges || []).some(b => b.includes("Rising"));
  const isNew = (item.badges || []).some(b => b.includes("신상") || b.includes("7일"));
  const isKor = (item.badges || []).some(b => b.includes("한국어"));
  const lang = getLang();

  if (isNew) return { color: "s-mint", top: "NEW", bottom: lang === "en" ? "NEW" : "신상" };
  if (isRising && rank === 1) return { color: "s-coral", top: "#01", bottom: "TOP" };
  if (isRising && rank <= 3) return { color: "s-lemon", top: "#0" + rank, bottom: lang === "en" ? "HOT" : "급상승" };
  if (rank === 1) return { color: "s-lemon", top: "#01", bottom: lang === "en" ? "TREND" : "대세" };
  if (isKor) return { color: "s-sky", top: "KR", bottom: lang === "en" ? "KOR" : "한국어" };
  if (isRising) return { color: "s-pink", top: "HOT", bottom: "화제" };
  return { color: STICKER_FALLBACKS[idx % STICKER_FALLBACKS.length], top: "#" + String(rank).padStart(2,"0"), bottom: "PICK" };
}

function cardHTML(item, idx) {
  const safeId = escapeHTML(item.id || "");
  const avatar = item.thumbnail_url || `https://github.com/${(item.id || "").split("/")[0]}.png?size=80`;
  const rank = item.rank ?? idx + 1;
  const rankStr = String(rank).padStart(2, "0");
  const isFeatured = rank === 1;
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
  const lang = getLang();
  if (!srcs.length && score == null) return "";
  const chips = srcs.map(s => `<span class="src-chip">${escapeHTML(SOURCE_LABEL[s] || s)}</span>`).join("");
  const scoreLabel = lang === "en" ? "Score" : "검증";
  const scoreEl = (score != null) ? `<span class="src-score" title="${scoreLabel}"> ${scoreLabel} ${score}</span>` : "";
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
  const lang = getLang();
  const tabLabel = tab === "rising" 
    ? (lang === "en" ? "Trending" : "이번 주 뜨는") 
    : (lang === "en" ? "Classic" : "이미 유명한");
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
    ${feats ? `<div class="m-section"><div class="m-label">${lang === "en" ? "Key Features" : "핵심 기능"}</div><ul class="m-features">${feats}</ul></div>` : ""}
    ${item.use_case ? `<div class="m-section"><div class="m-label">${lang === "en" ? "Use Cases" : "이럴 때 쓰면 좋아요"}</div><div class="m-usecase">${escapeHTML(item.use_case)}</div></div>` : ""}
    ${item.install_hint ? `<div class="m-section"><div class="m-label">${lang === "en" ? "Getting Started" : "설치 · 시작하기"}</div><div class="m-install">${escapeHTML(item.install_hint)}</div></div>` : ""}
    ${tags ? `<div class="m-section"><div class="m-label">${lang === "en" ? "Tags" : "태그"}</div><div class="m-tags">${tags}</div></div>` : ""}
    <div class="m-cta-row">
      <a class="m-cta" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener">
        ${lang === "en" ? "Open in GitHub →" : "GitHub에서 열기 →"}
      </a>
    </div>
  `;
}

function modalSourcesSection(item) {
  const srcs = (item.sources || []);
  const evi = (item.evidence || []);
  const score = item.trend_score;
  if (!srcs.length && !evi.length && score == null) return "";

  let html = `<div class="m-section"><div class="m-label">${getLang() === "en" ? "Sources & Score" : "출처 · 검증"}</div>`;
  if (score != null) {
    const scoreText = getLang() === "en" ? "Validation Score" : "검증 점수";
    const scoreFormula = getLang() === "en" ? "velocity · buzz · quality · recency" : "velocity · buzz · quality · recency 종합";
    html += `<div class="m-score-box">${scoreText} <strong>${score}</strong> / 100<span class="m-score-formula">${scoreFormula}</span></div>`;
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
  if (rIdx >= 0) return { item: d.rising[rIdx], tab: "rising", rank: d.rising[rIdx].rank ?? rIdx + 1 };
  const cIdx = (d.classic || []).findIndex(x => x.id === id);
  if (cIdx >= 0) return { item: d.classic[cIdx], tab: "classic", rank: d.classic[cIdx].rank ?? cIdx + 1 };
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
      
      // 출처는 하드코딩하지 않는다 — 실제 수집된 항목의 매체만 표기 (없는 매체를 광고하지 않기 위함)
      const srcNames = [...new Set((d.news || []).map(n => n.category_name).filter(Boolean))];
      const srcMeta = srcNames.length ? ` · 📡 ${srcNames.join(" · ")}` : "";

      const lang = getLang();
      if (STATE.category === "all" && !STATE.query && d.summary) {
        const formattedSummary = escapeHTML(d.summary)
          .replace(/(#[a-zA-Z0-9가-힣_-]+)/g, '<span class="db-tag">$1</span>')
          .replace(/(🔥\s*오늘의\s*핵심\s*(?:이슈|키워드):)/g, '<strong>$1</strong>');

        html += `
          <div class="daily-briefing-panel">
            <div class="db-header">
              <span class="db-title">💡 ${lang === "en" ? "AI Trend Summary" : "AI 트렌드 요약"}</span>
              <span class="db-meta">🕒 ${kstStr}${escapeHTML(srcMeta)}</span>
            </div>
            <p class="db-summary">${formattedSummary}</p>
            <div class="db-footer">
              ⚠️ ${lang === "en" ? "Financial/investment signals excluded. Model names and figures are verbatim and unverified." : "주식·투자 신호는 제외, 게시물 내 모델명·수치는 원문 그대로이며 교차 검증되지 않았습니다."}
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="daily-briefing-panel is-compact">
            <div class="db-header" style="margin-bottom:0;">
              <span class="db-title">💡 ${lang === "en" ? "Search Results" : "검색 결과"}</span>
              <span class="db-meta">🕒 ${kstStr}</span>
            </div>
          </div>
        `;
      }
      
      const gridClass = STATE.viewMode === 'list' ? 'grid list-view' : 'grid';
      const gridStyle = STATE.viewMode === 'list' 
        ? 'display:flex;flex-direction:column;gap:12px;' 
        : 'display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:24px;';
      html += `<div class="${gridClass}" style="${gridStyle}">`;
      html += list.map((it, idx) => newsCardHTML(it, idx)).join("");
      html += `</div>`;
      el.innerHTML = html;
    }
  } else if (isStarboardPage) {
    renderStarboard();
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
  const lang = getLang();
  
  // 스티커는 큐레이터가 매긴 importance(0~100)만 근거로 한다.
  // 예전엔 화면 index 로 "#01 TOP" 을 붙였는데, 정렬·필터가 바뀌면 아무 기사나 1위가 됐다.
  let sticker = "";
  const importance = Number(item.importance);
  if (Number.isFinite(importance) && importance > 0) {
    const stColor = importance >= 80 ? "s-coral" : importance >= 60 ? "s-lemon" : "s-gray";
    sticker = `
      <div class="sticker ${stColor}" title="${lang === "en" ? "Curation importance score" : "큐레이션 중요도 점수"}">
        <strong>${Math.round(importance)}</strong>
        ${lang === "en" ? "SCORE" : "중요도"}
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
  const authorStr = (item.author_profile || item.author) ? escapeHTML(item.author_profile || item.author) : "Unknown";
  
  let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr)}&background=random&color=fff&bold=true`;
  let platformIconHtml = "";
  
  if (item.category_id === 'x' || item.platform === 'X') {
    avatarUrl = `https://unavatar.io/x/${encodeURIComponent(authorStr)}`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#000; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff; font-size:8px; font-weight:bold;">𝕏</span>`;
  } else if (item.category_id === 'instagram' || item.platform === 'Instagram') {
    avatarUrl = `https://unavatar.io/instagram/${encodeURIComponent(authorStr)}`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%); border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff; font-size:8px;"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M7.75 2h8.5c3.17 0 5.75 2.58 5.75 5.75v8.5c0 3.17-2.58 5.75-5.75 5.75h-8.5C4.58 22 2 19.42 2 16.25v-8.5C2 4.58 4.58 2 7.75 2zm8.5 18c2.07 0 3.75-1.68 3.75-3.75v-8.5C20 5.68 18.32 4 16.25 4h-8.5C5.68 4 4 5.68 4 7.75v8.5C4 18.32 5.68 20 7.75 20h8.5zM12 7.25c2.62 0 4.75 2.13 4.75 4.75S14.62 16.75 12 16.75 7.25 14.62 7.25 12 9.38 7.25 12 7.25zm0 7.5c1.52 0 2.75-1.23 2.75-2.75S13.52 9.25 12 9.25 9.25 10.48 9.25 12 10.48 14.75 12 14.75zm5.25-8.25c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg></span>`;
  } else if (item.category_id === 'geeknews' || item.platform === 'GeekNews') {
    avatarUrl = `https://news.hada.io/apple-touch-icon.png`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#F58411; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff; font-size:9px; font-weight:bold; padding-bottom:1px;">G</span>`;
  } else if (item.category_id === 'threads' || item.platform === 'Threads') {
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#000; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff;"><svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.846 14.996c-1.127.84-2.584 1.258-4.103 1.258-3.344 0-5.836-2.47-5.836-6.176 0-3.693 2.502-6.183 5.908-6.183 3.328 0 5.768 2.404 5.768 5.707 0 1.272-.258 2.378-.737 3.195-.494.84-1.185 1.252-1.927 1.252-.802 0-1.398-.445-1.572-1.13l-.042-.2c-.413.565-1.047.88-1.748.88-1.395 0-2.39-1.026-2.39-2.532 0-1.63 1.157-2.735 2.87-2.735.674 0 1.252.193 1.636.46v-1.17c0-1.62-1.002-2.518-2.616-2.518-1.282 0-2.316.488-2.656.76l-.736-1.168c.516-.445 1.83-1.066 3.497-1.066 2.53 0 4.195 1.503 4.195 4.025v3.136c0 1.05.748 1.488 1.408 1.488.752 0 1.283-.435 1.763-1.096l1.098 1.008c-.718 1.052-1.802 1.62-3.042 1.62-1.34 0-2.327-.853-2.327-2.072v-.234zm-5.61-3.61c0 1.023.702 1.604 1.583 1.604.836 0 1.472-.454 1.643-1.127l.067-.32c0-.79-.533-1.284-1.39-1.284-.658 0-1.17.203-1.528.53v-.002c-.256.242-.375.58-.375.6z"/></svg></span>`;
  } else if (item.category_id === 'reddit' || item.platform === 'Reddit') {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr)}&background=FF4500&color=fff&bold=true`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#FF4500; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff;"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.562-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.561-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .466c.804.803 2.285.894 2.947.894.662 0 2.143-.09 2.947-.894a.33.33 0 0 0 0-.466.327.327 0 0 0-.466 0c-.6.6-1.815.65-2.481.65-.667 0-1.881-.05-2.481-.65a.332.332 0 0 0-.235-.095z"/></svg></span>`;
  } else if (item.category_id === 'github' || item.platform === 'GitHub') {
    avatarUrl = `https://github.com/${encodeURIComponent(authorStr)}.png?size=80`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#24292e; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff;"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.67 5.56.67 11.83c0 5.01 3.24 9.26 7.75 10.76.57.1.78-.24.78-.55v-1.93c-3.15.69-3.81-1.52-3.81-1.52-.52-1.31-1.26-1.66-1.26-1.66-1.03-.7.08-.69.08-.69 1.14.08 1.74 1.17 1.74 1.17 1.01 1.74 2.66 1.24 3.31.95.1-.74.4-1.24.72-1.53-2.51-.29-5.15-1.25-5.15-5.57 0-1.23.44-2.23 1.16-3.02-.12-.29-.5-1.44.11-3 0 0 .95-.3 3.1 1.16.9-.25 1.86-.38 2.82-.38.96 0 1.92.13 2.82.38 2.15-1.46 3.1-1.16 3.1-1.16.61 1.56.23 2.71.11 3 .72.79 1.16 1.79 1.16 3.02 0 4.33-2.65 5.28-5.17 5.56.41.35.77 1.05.77 2.11v3.13c0 .31.21.66.79.55 4.5-1.5 7.74-5.75 7.74-10.76C23.33 5.56 18.27.5 12 .5z"/></svg></span>`;
  } else if (item.category_id === 'youtube' || item.platform === 'YouTube') {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr)}&background=FF0000&color=fff&bold=true`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#FF0000; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff;"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.086 0 12 0 12s0 3.914.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.914 24 12 24 12s0-3.914-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></span>`;
  } else if (item.category_id === 'bluesky' || item.platform === 'Bluesky') {
    avatarUrl = `https://unavatar.io/bluesky/${encodeURIComponent(authorStr.replace(/^@/, ""))}`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#0085FF; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff;"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M5.77 3.39C8.34 5.32 11.1 9.23 12 11.33c.9-2.1 3.66-6.01 6.23-7.94C20.08 2 23 .95 23 4.28c0 .66-.38 5.59-.6 6.39-.78 2.78-3.62 3.49-6.14 3.06 4.41.75 5.53 3.24 3.11 5.73-4.6 4.73-6.6-1.19-7.12-2.7-.09-.28-.14-.41-.14-.3 0-.11-.05.02-.14.3-.51 1.51-2.52 7.43-7.11 2.7-2.42-2.49-1.3-4.98 3.1-5.73-2.51.43-5.35-.28-6.13-3.06C1.61 9.87 1.23 4.94 1.23 4.28c0-3.33 2.92-2.28 4.54-.89z"/></svg></span>`;
  } else if (item.category_id === 'hfpapers' || item.platform === 'HF Daily Papers') {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr.replace(/^@/, ""))}&background=FFD21E&color=1F2937&bold=true`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#FFD21E; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; font-size:9px;">🤗</span>`;
  } else if (item.category_id === 'hackernews' || item.platform === 'Hacker News') {
    avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr)}&background=FF6600&color=fff&bold=true`;
    platformIconHtml = `<span class="platform-dot" style="position:absolute; bottom:-4px; right:-4px; width:14px; height:14px; background:#FF6600; border-radius:50%; border:2px solid var(--card); display:flex; align-items:center; justify-content:center; color:#fff; font-size:9px; font-weight:bold;">Y</span>`;
  }

  // 재등장·급상승 배지. 같은 리포가 며칠 뒤 다시 올라오는 건 막지 않되(별이 크게 늘면 다룰 가치가 있다),
  // 신규 발표처럼 보이지 않게 화면에서 구분한다.
  const badges = [];
  if (item.is_update) {
    const growth = Number(item.star_growth_pct);
    const label = Number.isFinite(growth) ? `업데이트 · ★ +${Math.round(growth)}%` : "업데이트";
    badges.push(`<span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px; background:var(--pill); color:var(--ink-2); letter-spacing:0.02em;">${label}</span>`);
  }
  const spd = Number(item.metrics && item.metrics.stars_per_day);
  if (item.category_id === "github" && Number.isFinite(spd) && spd > 0) {
    badges.push(`<span style="font-size:11px; font-weight:600; padding:2px 8px; border-radius:10px; background:var(--pill); color:var(--muted);" title="${lang === "en" ? "Average stars gained per day" : "생성 이후 하루평균 획득 star"}">★ ${spd.toLocaleString()}/day</span>`);
  }
  const badgeHtml = badges.length ? `<div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">${badges.join("")}</div>` : "";

  const headHtml = `
    <div class="card-head" style="margin-bottom: 12px; padding-right: 60px;">
      <div class="avatar-wrapper" style="position:relative; display:inline-block; line-height:0;">
        <img class="avatar" src="${avatarUrl}" alt="" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr)}&background=F4F4F5&color=3F3F46&bold=true'"/>
        ${platformIconHtml}
      </div>
      <div class="head-meta">
        <div class="category-label" style="text-transform: uppercase;">${escapeHTML(item.category_name || "NEWS")}</div>
        <div class="repo-id" style="font-size: 13px; margin-top: 2px;">
          <span class="owner" style="color: var(--ink); font-weight: 600;">${authorStr}</span>
          ${dateStr ? `<span style="color: var(--muted);"> · ${dateStr}</span>` : ""}
        </div>
        ${badgeHtml}
      </div>
    </div>
  `;

  const title = escapeHTML(item.headline || item.title_ko || "");
  const summary = item.summary_ko ? `<p class="nc-summary" style="margin-top:12px; font-size:15px; line-height:1.6; color:var(--text); opacity:0.9;">${escapeHTML(item.summary_ko)}</p>` : "";
  
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
  
  const tags = (item.tags && item.tags.length > 0) ? `<div style="margin-top:16px; display:flex; flex-wrap:wrap; gap:8px;">${item.tags.map(t => `<span style="font-size:12.5px; padding:4px 10px; border-radius:12px; background:var(--pill); color:var(--ink-2); font-weight:500;">#${escapeHTML(t)}</span>`).join("")}</div>` : "";

  const related = (item.related_articles && item.related_articles.length > 0) ? `<div style="margin-top:20px; font-size:14px; background:var(--pill); padding:16px; border-radius:12px;"><strong style="color:var(--ink-2); display:flex; align-items:center; gap:6px;">🔗 관련 기사</strong><ul style="margin-top:8px; padding-left:20px; color:var(--muted); list-style-type:circle;">${item.related_articles.map(r => `<li style="margin-bottom:6px;"><a href="${escapeHTML(r.url)}" target="_blank" rel="noopener" style="color:var(--muted); text-decoration:none; transition:color 0.2s;" onmouseover="this.style.color='var(--ink)'" onmouseout="this.style.color='var(--muted)'">${escapeHTML(r.title)}</a></li>`).join("")}</ul></div>` : "";

  const sources = (item.sources || []).map(s => `<span class="src-chip">${escapeHTML(s)}</span>`).join("");
  const linkBtn = item.url ? `
    <div class="card-foot" style="margin-top:24px; border-top:1px solid var(--border); padding-top:16px;">
      <span class="meta-left"></span>
      <a class="repo-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
        원문 보기 <span class="arrow">→</span>
      </a>
    </div>
  ` : "";

  return `
    <article class="card news-card" data-id="${safeId}" data-platform="${item.category_id || 'news'}" style="position:relative; padding:24px; box-shadow:0 4px 12px rgba(0,0,0,0.05); border-radius:16px;">
      ${sticker}
      ${cover}
      ${headHtml}
      <a href="${item.url ? escapeHTML(item.url) : '#'}" target="_blank" rel="noopener" style="text-decoration:none; color:inherit; display:block;">
        <h3 style="margin-top:0; margin-bottom:12px; line-height:1.45; font-size:20px;">${title}</h3>
      </a>
      ${summary}
      ${bodyKo}
      ${tags}
      ${related}
      ${sources ? `<div class="src-line" style="margin-top:20px; flex-wrap:wrap; gap:8px;">${sources}</div>` : ""}
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
    <div class="card-foot" style="margin-top:24px; border-top:1px solid var(--border); padding-top:16px;">
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

const viewToggleBtn = document.getElementById("view-toggle");
if (viewToggleBtn) {
  const updateIcon = () => {
    const icon = document.getElementById("vt-icon");
    if (icon) icon.innerText = STATE.viewMode === 'list' ? '≡' : '☷';
  };
  updateIcon();
  viewToggleBtn.addEventListener("click", () => {
    STATE.viewMode = STATE.viewMode === 'list' ? 'card' : 'list';
    localStorage.setItem('aiw-view', STATE.viewMode);
    updateIcon();
    render();
  });
}
document.querySelectorAll(".tab, .cat-chip[data-tab]").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab, .cat-chip[data-tab]").forEach(b => {
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

function getCriteriaHTML(lang) {
  if (lang === "en") {
    return `
  <div class="cr-eyebrow">CC-TRENDS · SCORING</div>
  <h2 class="cr-title">How is the ranking calculated?</h2>
  <p class="cr-lede">Recalculated every week with weighted scores across 4 axes.</p>

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
    <div class="cr-section-label">4 Evaluation Axes</div>
    <div class="cr-axes">
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-velocity"></span>
          <span class="cr-axis-name">Velocity</span>
          <span class="cr-axis-pct">40%</span>
        </div>
        <p class="cr-axis-desc">GitHub 7-day star growth rate. Age adjustment applied to new items (within 30 days).</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-buzz"></span>
          <span class="cr-axis-name">Community Buzz</span>
          <span class="cr-axis-pct">30%</span>
        </div>
        <p class="cr-axis-desc">Weighted sum of mentions on HN · dev.to · GeekNews · velog · X. Reach 2+ platforms +10, 3+ +15, HN frontpage +10.</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-quality"></span>
          <span class="cr-axis-name">Quality</span>
          <span class="cr-axis-pct">20%</span>
        </div>
        <p class="cr-axis-desc">README depth, license, recent commits, tests/examples, CI, documentation score.</p>
      </div>
      <div class="cr-axis">
        <div class="cr-axis-head">
          <span class="cr-axis-dot w-recency"></span>
          <span class="cr-axis-name">Recency</span>
          <span class="cr-axis-pct">10%</span>
        </div>
        <p class="cr-axis-desc">How fresh the latest commit is. 0 score if abandoned for 60+ days.</p>
      </div>
    </div>
  </div>

  <div class="cr-section">
    <div class="cr-section-label">Rising vs Classic</div>
    <div class="cr-versus">
      <div class="cr-vs-card cr-rising">
        <div class="cr-vs-head"><span class="cr-vs-icon">🔥</span><strong>Rising</strong> · Trending this week</div>
        <div class="cr-vs-rule">Satisfy any one condition</div>
        <ul>
          <li>Created within 30 days</li>
          <li>velocity ≥ 60 + 2+ community mentions in 14 days</li>
          <li>velocity ≥ 80 (Explosive growth) — Regardless of source <span style="opacity:.7">⚠️ Shows single source</span></li>
          <li>Reached HN frontpage within 7 days</li>
        </ul>
      </div>
      <div class="cr-vs-card cr-classic">
        <div class="cr-vs-head"><span class="cr-vs-icon">⭐</span><strong>Classic</strong> · Already famous</div>
        <div class="cr-vs-rule">Satisfy both conditions</div>
        <ul>
          <li>Total stars ≥ 1000 or Created > 30 days ago</li>
          <li>Top 20% in velocity or consistent top quality score</li>
        </ul>
      </div>
    </div>
  </div>

  <div class="cr-section">
    <div class="cr-section-label">Bias Adjustments</div>
    <div class="cr-biases">
      <div class="cr-bias-row">
        <span class="cr-bias-tag">i18n</span>
        <span>Additional buzz points for finding Korean README/blogs — adjusting for English-speaking scale difference</span>
      </div>
      <div class="cr-bias-row">
        <span class="cr-bias-tag">official</span>
        <span>Anthropic official/employee projects get tags only, score remains the same</span>
      </div>
    </div>
  </div>

  <p class="cr-foot">Selected in order of score per category (Rising: skill 8·mcp 6·agent 4·harness 2 / Classic: skill 6·mcp 4·agent 4·harness 2) · Ties broken by recent updates · Under-quota not forced · Under-scored reviewed next week</p>

  <a class="m-cta" href="https://github.com/ldk-hub/ai-weekly" target="_blank" rel="noopener">
    View source code →
  </a>
`;
  }
  return `
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
}

function openCriteria() {
  const modal = document.getElementById("modal");
  document.getElementById("modal-body").innerHTML = getCriteriaHTML(getLang());
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
  renderPageSummary();
  renderArchiveMenu();
  renderCategoryFilter();
  renderThemeToggle();
  render();
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
  const lang = getLang();
  if (lang === "en") {
    btn.textContent = eff === 'dark' ? '☀️ Light' : '🌙 Dark';
  } else {
    btn.textContent = eff === 'dark' ? '☀️ 라이트' : '🌙 다크';
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

// Subscribe Form Toggle
document.addEventListener("DOMContentLoaded", () => {
  const subOpen = document.getElementById("subscribe-open");
  const subForm = document.getElementById("subscribe-form");
  const subClose = document.getElementById("subscribe-close");

  if (subOpen && subForm && subClose) {
    subOpen.addEventListener("click", () => {
      subOpen.style.display = "none";
      subForm.style.display = "flex";
      const input = subForm.querySelector("input");
      if (input) input.focus();
    });
    subClose.addEventListener("click", () => {
      subForm.style.display = "none";
      subOpen.style.display = "flex";
    });
  }

  // Daily Visitor Badge
  const visitCounter = document.querySelector(".visit-counter");
  if (visitCounter) {
    const img = visitCounter.querySelector("img");
    const label = visitCounter.querySelector("span");
    if (img && img.src.includes("visitor-badge.laobi.icu")) {
      const d = new Date();
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d - tzOffset)).toISOString().split('T')[0];
      const url = new URL(img.src);
      let pageId = url.searchParams.get("page_id");
      if (pageId && !pageId.includes(localISOTime)) {
        url.searchParams.set("page_id", `${pageId}.${localISOTime}`);
        url.searchParams.set("left_text", "today");
        img.src = url.toString();
      }
    }
    if (label) {
      label.setAttribute("data-i18n-en", "Today");
      label.setAttribute("data-i18n-ko", "오늘");
      const lang = typeof getLang === 'function' ? getLang() : 'ko';
      label.textContent = lang === "en" ? "Today" : "오늘";
    }
    visitCounter.title = "오늘 방문자";
  }
});

function processStarboardData() {
  const meta = STATE.data.meta || { repos: {} };
  const ledger = STATE.data.ledger || {};
  const repos = Object.keys(meta.repos).filter(id => !meta.repos[id].gone);
  
  const processed = [];
  const now = new Date();
  
  for (const id of repos) {
    const repoMeta = meta.repos[id];
    const history = ledger[id] || [];
    if (history.length === 0) continue;
    
    // Sort history by date just in case
    history.sort((a, b) => a.date.localeCompare(b.date));
    
    const latestEntry = history[history.length - 1];
    const latestDate = latestEntry.date;
    const currentStars = latestEntry.stars;
    
    // Calculate 7-day velocity (normalized)
    let velocity = 0;
    const samplesBeforeLatest = history.filter(h => h.date < latestDate);
    if (samplesBeforeLatest.length > 0) {
      const base = samplesBeforeLatest[samplesBeforeLatest.length - 1];
      const days = Math.round((new Date(latestDate) - new Date(base.date)) / 86400000);
      if (days > 0) {
        const delta = currentStars - base.stars;
        velocity = Math.round((delta * 7) / days);
      }
    }
    
    // Activity badge logic
    const pushedDate = repoMeta.pushed_at ? new Date(repoMeta.pushed_at) : new Date(0);
    const daysSincePush = (now - pushedDate) / (1000 * 60 * 60 * 24);
    
    let activity = "active";
    if (repoMeta.dormant || daysSincePush > 90) {
      activity = "dormant";
    } else if (daysSincePush <= 7) {
      activity = "active";
    } else if (daysSincePush <= 30) {
      activity = "slowing";
    } else {
      activity = "slowing";
    }
    
    // Build sparkline data (last 14 points or similar)
    const recentEntries = history.slice(-14);
    const sparklineData = recentEntries.map(e => e.stars);
    
    processed.push({
      id,
      meta: repoMeta,
      currentStars,
      velocity,
      activity,
      sparklineData
    });
  }
  
  // Sort by velocity desc, then currentStars desc
  processed.sort((a, b) => b.velocity - a.velocity || b.currentStars - a.currentStars);
  
  STATE.data.heavy = processed.filter(r => r.currentStars >= 100000);
  STATE.data.lightheavy = processed.filter(r => r.currentStars >= 50000 && r.currentStars < 100000);
  STATE.data.middle = processed.filter(r => r.currentStars >= 20000 && r.currentStars < 50000);
  STATE.data.welter = processed.filter(r => r.currentStars >= 10000 && r.currentStars < 20000);
  STATE.data.light = processed.filter(r => r.currentStars >= 5000 && r.currentStars < 10000);
  STATE.data.feather = processed.filter(r => r.currentStars >= 2000 && r.currentStars < 5000);
  STATE.data.bantam = processed.filter(r => r.currentStars >= 500 && r.currentStars < 2000);
  STATE.data.fly = processed.filter(r => r.currentStars < 500);
}

function renderStarboard() {
  const el = document.getElementById("starboard-container");
  if (!el) return;
  
  const list = STATE.data[STATE.tab] || [];
  
  // Update counts
  const tabs = ['heavy', 'lightheavy', 'middle', 'welter', 'light', 'feather', 'bantam', 'fly'];
  for (const tab of tabs) {
    const btn = document.getElementById(tab + "-count");
    if (btn) btn.textContent = (STATE.data[tab] || []).length;
  }
  
  if (list.length === 0) {
    el.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--muted);font-size:15px;">이 리그에는 아직 등록된 리포지토리가 없습니다.</div>`;
    return;
  }
  
  const gridClass = STATE.viewMode === 'list' ? 'grid list-view' : 'grid';
  const gridStyle = STATE.viewMode === 'list' 
    ? 'display:flex;flex-direction:column;gap:12px;' 
    : 'display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:24px;';
    
  let html = `<div class="${gridClass}" style="${gridStyle}">`;
  html += list.map((item, idx) => starboardCardHTML(item, idx)).join("");
  html += `</div>`;
  el.innerHTML = html;
}

function starboardCardHTML(item, idx) {
  const rank = idx + 1;
  const badgeClass = {
    "active": "sb-badge-active",
    "slowing": "sb-badge-slowing",
    "dormant": "sb-badge-dormant"
  }[item.activity];
  
  const lang = getLang();
  const badgeLabel = {
    "active": lang === "en" ? "Active" : "활발",
    "slowing": lang === "en" ? "Slowing" : "둔화",
    "dormant": lang === "en" ? "Dormant" : "방치"
  }[item.activity];
  
  const repoName = item.id.split("/")[1];
  const ownerName = item.id.split("/")[0];
  
  const sign = item.velocity > 0 ? "+" : "";
  const velocityColor = item.velocity > 0 ? "var(--mint)" : (item.velocity < 0 ? "var(--coral)" : "var(--muted)");
  
  let stColor = "s-gray";
  let stBottom = "PICK";
  if (rank === 1) { stColor = "s-coral"; stBottom = "TOP"; }
  else if (rank <= 3) { stColor = "s-lemon"; stBottom = lang === "en" ? "HOT" : "급상승"; }
  else {
    const STICKER_FALLBACKS = ["s-mint", "s-sky", "s-lavender", "s-pink"];
    stColor = STICKER_FALLBACKS[idx % STICKER_FALLBACKS.length];
  }
  
  const width = 300;
  const height = 80;
  const max = Math.max(...item.sparklineData);
  const min = Math.min(...item.sparklineData);
  const range = max - min || 1;
  const step = width / Math.max(1, item.sparklineData.length - 1);
  const points = item.sparklineData.map((val, i) => {
    const x = i * step;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  
  // 관측이 2개면 어떤 리포든 min→max 를 잇는 같은 대각선이 나온다 (추세 정보 0).
  // 실제로 109개 중 58개가 관측 2회라, 그 경우엔 그래프 대신 사유를 밝힌다.
  const svg = item.sparklineData.length >= 3
    ? `<svg class="sb-sparkline" width="100%" height="${height}" viewBox="-2 -10 ${width + 4} ${height+20}" preserveAspectRatio="none" style="margin-top:auto; padding-top:16px;">
    <polyline fill="none" stroke="${velocityColor}" stroke-width="3" points="${points}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
    : `<div class="sb-nochart">${lang === "en"
        ? `${item.sparklineData.length} observations — trend chart needs 3+`
        : `관측 ${item.sparklineData.length}회 · 추이 그래프는 3회부터`}</div>`;
  
  const avatar = (item.meta && item.meta.owner_avatar) ? item.meta.owner_avatar : `https://github.com/${ownerName}.png?size=80`;
  const desc = (item.meta && item.meta.desc_ko) ? item.meta.desc_ko : ((item.meta && item.meta.description) ? item.meta.description : "");
  
  const chartComment = desc;
  
  return `
    <article class="card" style="padding: 24px 22px 0; overflow:hidden;">
      <div class="sticker ${stColor}">
        <strong>#${String(rank).padStart(2, '0')}</strong>
        ${escapeHTML(stBottom)}
      </div>
      
      <div class="card-head" style="margin-bottom:12px;">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
        <div class="head-meta">
          <div class="repo-id" style="font-size: 15px;">${escapeHTML(ownerName)} /</div>
          <h3 style="margin:0; font-size: 20px; word-break:break-all;">${escapeHTML(repoName)}</h3>
        </div>
      </div>
      

      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="stars-line" style="font-size:16px; font-weight:600;">★ ${item.currentStars.toLocaleString()}</span>
          <span style="color:${velocityColor}; font-weight:700; font-size: 15px; background:var(--surface); padding:2px 8px; border-radius:12px; display:inline-block;">${sign}${item.velocity.toLocaleString()}/wk</span>
        </div>
        <span class="sb-badge ${badgeClass}" style="margin:0;">${badgeLabel}</span>
      </div>
      
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:8px; padding: 0 4px;">
        <div style="font-size:13.5px; color:var(--muted); line-height:1.4; max-width:65%;">
          ${chartComment}
        </div>
        <a class="repo-link" href="https://github.com/${escapeHTML(item.id)}" target="_blank" rel="noopener" style="margin:0;">
          GITHUB <span class="arrow">→</span>
        </a>
      </div>
      
      ${svg}
    </article>
  `;
}

