const esc = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PLATFORM = { x: "𝕏", threads: "Threads", reddit: "Reddit", instagram: "Instagram" };
const isHttps = (u) => /^https:\/\//.test(u || "");

let ITEMS = [];
const state = { platform: "all", author: "all", query: "" };

function timeAgo(iso) {
  const h = Math.floor((Date.now() - Date.parse(iso)) / 3600000);
  if (!Number.isFinite(h) || h < 0) return "";
  return h < 1 ? "방금" : h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
}

function formatMetrics(m = {}) {
  const parts = [];
  if (m.likes > 0) parts.push(`♥ ${m.likes.toLocaleString()}`);
  if (m.reposts > 0) parts.push(`↻ ${m.reposts.toLocaleString()}`);
  if (m.replies > 0) parts.push(`💬 ${m.replies.toLocaleString()}`);
  return parts.length ? `<span class="social-metrics">${parts.join(" · ")}</span>` : "";
}

function card(it) {
  const safeUrl = isHttps(it.url) ? esc(it.url) : "#";
  const thumb = isHttps(it.thumbnail)
    ? `<a class="social-thumb" href="${safeUrl}" target="_blank" rel="noopener noreferrer"><img src="${esc(it.thumbnail)}" loading="lazy" referrerpolicy="no-referrer" alt="${esc(it.title_ko)}" onerror="this.parentNode.remove()"></a>`
    : "";
  const timeText = timeAgo(it.publishedAt);
  const tagsHtml = (it.tags || [])
    .slice(0, 4)
    .map((t) => `<button type="button" class="card-tag-chip" data-tag="${esc(t)}" title="이 태그로 검색">#${esc(t)}</button>`)
    .join("");
  const summaryLines = esc(it.summary_ko).split("\n").filter(Boolean).join("<br>");

  return `<article class="card social-card" data-platform="${esc(it.platform)}">
    ${thumb}
    <div class="social-body">
      <div class="social-meta">
        <span class="social-badge is-${esc(it.platform)}">${PLATFORM[it.platform] || esc(it.platform)}</span>
        <strong class="social-author">${esc(it.author)}</strong>
        ${timeText ? `<span class="social-time">${esc(timeText)}</span>` : ""}
        ${formatMetrics(it.metrics)}
      </div>
      <h3 class="social-title"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${esc(it.title_ko)}</a></h3>
      <p class="social-summary">${summaryLines}</p>
      ${tagsHtml ? `<div class="card-tags-inline social-tags">${tagsHtml}</div>` : ""}
      <div class="card-foot social-foot">
        <span class="social-score" title="AI 관련도 + 인기도 점수">점수 ${Number(it.score || 0)}</span>
        <a class="repo-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">원문 보기 <span class="arrow">→</span></a>
      </div>
    </div>
  </article>`;
}

function getFiltered() {
  const q = state.query.trim().toLowerCase();
  return ITEMS.filter((it) => {
    if (state.platform !== "all" && it.platform !== state.platform) return false;
    if (state.author !== "all" && it.author !== state.author) return false;
    if (!q) return true;
    const hay = [it.title_ko, it.summary_ko, it.author, ...(it.tags || [])].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

function render() {
  const list = getFiltered();
  const root = document.getElementById("social-list");
  root.innerHTML = list.length
    ? list.map(card).join("")
    : `<p class="social-empty">조건에 맞는 게시물이 없습니다.</p>`;

  document.querySelectorAll("#social-filter button").forEach((b) => {
    const active = b.dataset.f === state.platform;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  const clearBtn = document.getElementById("social-search-clear");
  const kbd = document.getElementById("social-search-kbd");
  if (clearBtn && kbd) {
    const hasQ = state.query.length > 0;
    clearBtn.hidden = !hasQ;
    kbd.hidden = hasQ;
  }
}

function renderFilters() {
  const counts = ITEMS.reduce((m, it) => ({ ...m, [it.platform]: (m[it.platform] || 0) + 1 }), {});
  const tabs = [["all", "전체", ITEMS.length], ...Object.entries(counts).map(([p, n]) => [p, PLATFORM[p] || p, n])];
  const filterEl = document.getElementById("social-filter");
  filterEl.innerHTML = tabs
    .map(([f, label, count]) => `<button type="button" class="cat-chip" role="tab" data-f="${esc(f)}"><span>${esc(label)}</span><span class="cat-count">${count}</span></button>`)
    .join("");
  filterEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-f]");
    if (!btn) return;
    state.platform = btn.dataset.f;
    render();
  });

  const authors = [...new Set(ITEMS.map((it) => it.author).filter(Boolean))].sort();
  const sel = document.getElementById("author-filter");
  sel.innerHTML = `<option value="all">전체 계정 (${authors.length})</option>` +
    authors.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join("");
  sel.addEventListener("change", (e) => {
    state.author = e.target.value;
    render();
  });
}

function bindEvents() {
  const searchEl = document.getElementById("social-search");
  const clearBtn = document.getElementById("social-search-clear");
  searchEl?.addEventListener("input", (e) => {
    state.query = e.target.value;
    render();
  });
  clearBtn?.addEventListener("click", () => {
    state.query = "";
    if (searchEl) {
      searchEl.value = "";
      searchEl.focus();
    }
    render();
  });
  document.getElementById("social-list")?.addEventListener("click", (e) => {
    const tagBtn = e.target.closest("button[data-tag]");
    if (!tagBtn) return;
    state.query = tagBtn.dataset.tag;
    if (searchEl) searchEl.value = state.query;
    render();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchEl && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) {
      e.preventDefault();
      searchEl?.focus();
    } else if (e.key === "Escape" && document.activeElement === searchEl && state.query) {
      state.query = "";
      searchEl.value = "";
      render();
    }
  });
}

function initTheme() {
  const btn = document.getElementById("theme-toggle");
  const paint = () => {
    if (!btn) return;
    btn.textContent = document.documentElement.dataset.theme === "dark" ? "☀️ 라이트" : "🌙 다크";
  };
  btn?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("aiw-theme", next); } catch (e) {}
    paint();
  });
  paint();
}

async function init() {
  initTheme();
  bindEvents();
  try {
    const res = await fetch("data/social_latest.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    ITEMS = data.items || [];
    document.getElementById("social-date").textContent = data.date || "—";
    document.getElementById("social-summary").textContent = `선별 ${ITEMS.length}건 · X · Threads · Reddit · Instagram`;
    renderFilters();
    render();
  } catch {
    document.getElementById("social-summary").textContent = "로드 실패";
    document.getElementById("social-list").innerHTML = `<p class="social-empty">데이터를 불러오지 못했습니다.</p>`;
  }
}

init();
