const esc = (s) =>
  String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PLATFORM = { x: "𝕏", threads: "Threads", reddit: "Reddit", instagram: "Instagram" };
const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];
const isHttps = (u) => /^https:\/\//.test(u || "");

const INITIAL_DAYS = 2;
const LOAD_BATCH_DAYS = 2;
const SEARCH_BATCH_DAYS = 5;
const AUTO_LOAD_MAX_BATCHES = 4;
const FETCH_CONCURRENCY = 3;

let INDEX_DAYS = [];
let TOTAL_ARCHIVE_ITEMS = 0;
const dayCache = new Map();
const inFlight = new Map();
const collapsedDays = new Set();
let loadedOrder = [];
let autoLoadedBatches = 0;
let isLoadingMore = false;
let searchTimer = null;

const state = { date: "all", platform: "all", query: "" };

function formatDayHeader(dateStr) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!m) return dateStr || "—";
  const [, y, mo, d] = m;
  const dow = WEEKDAYS_KO[new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d))).getUTCDay()];
  return `${y}.${mo}.${d} (${dow})`;
}

function formatKstDate(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const kst = new Date(ms + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

function timeAgo(iso) {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const h = Math.floor((Date.now() - ms) / 3600000);
  if (h < 0) return "";
  if (h < 1) return "방금";
  if (h < 24) return `${h}시간 전`;
  if (h < 24 * 7) return `${Math.floor(h / 24)}일 전`;
  return formatKstDate(iso);
}

function formatMetrics(m = {}) {
  const parts = [];
  if (m.likes > 0) parts.push(`♥ ${m.likes.toLocaleString()}`);
  if (m.reposts > 0) parts.push(`↻ ${m.reposts.toLocaleString()}`);
  if (m.replies > 0) parts.push(`💬 ${m.replies.toLocaleString()}`);
  return parts.length ? `<span class="social-metrics">${parts.join(" · ")}</span>` : "";
}

function syncFromURL() {
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get("date")) state.date = p.get("date");
    if (p.get("platform")) state.platform = p.get("platform");
    if (p.get("q") !== null) {
      state.query = p.get("q");
      const searchEl = document.getElementById("social-search");
      if (searchEl) searchEl.value = state.query;
    }
  } catch {}
}

function syncToURL() {
  try {
    const p = new URLSearchParams();
    if (state.date && state.date !== "all") p.set("date", state.date);
    if (state.platform && state.platform !== "all") p.set("platform", state.platform);
    if (state.query.trim()) p.set("q", state.query.trim());
    const qs = p.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    history.replaceState(null, "", next);
  } catch {}
}

function card(it) {
  const safeUrl = isHttps(it.url) ? esc(it.url) : "#";
  const thumb = isHttps(it.thumbnail)
    ? `<a class="social-thumb" href="${safeUrl}" target="_blank" rel="noopener noreferrer"><img src="${esc(it.thumbnail)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" alt="${esc(it.title_ko)}"></a>`
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

function hasActiveFilters() {
  return state.platform !== "all" || state.query.trim().length > 0;
}

function matchesItem(it, q) {
  if (state.platform !== "all" && it.platform !== state.platform) return false;
  if (!q) return true;
  const hay = [it.title_ko, it.summary_ko, it.author, ...(it.tags || [])].join(" ").toLowerCase();
  return hay.includes(q);
}

function getScopedData() {
  const targetDates = state.date !== "all" ? [state.date] : loadedOrder;
  const q = state.query.trim().toLowerCase();
  const seenIds = new Set();
  const scopedAllItems = [];
  const days = [];
  let totalMatchedItems = 0;

  for (const dateStr of targetDates) {
    const dayObj = dayCache.get(dateStr);
    if (!dayObj) continue;
    const uniqueDayItems = [];
    for (const it of dayObj.items || []) {
      if (!it || !it.id || seenIds.has(it.id)) continue;
      seenIds.add(it.id);
      uniqueDayItems.push(it);
      scopedAllItems.push(it);
    }
    const matched = uniqueDayItems.filter((it) => matchesItem(it, q));
    totalMatchedItems += matched.length;
    if (matched.length > 0 || !hasActiveFilters()) {
      days.push({
        date: dateStr,
        allCount: uniqueDayItems.length,
        items: matched,
      });
    }
  }
  return { scopedAllItems, totalMatchedItems, days };
}

function formatPlatformMix(items) {
  const counts = items.reduce((m, it) => ({ ...m, [it.platform]: (m[it.platform] || 0) + 1 }), {});
  return Object.entries(counts)
    .map(([p, n]) => `${PLATFORM[p] || p} ${n}`)
    .join(" · ");
}

function renderDaySection(dayObj) {
  const isLatest = INDEX_DAYS[0]?.date === dayObj.date;
  const isCollapsed = collapsedDays.has(dayObj.date);
  const filtered = hasActiveFilters();
  const countLabel = filtered && dayObj.items.length !== dayObj.allCount
    ? `${dayObj.items.length} / ${dayObj.allCount}건`
    : `${dayObj.items.length}건`;
  const mix = formatPlatformMix(dayObj.items);

  return `<section class="social-day-group${isCollapsed ? " is-collapsed" : ""}" data-date="${esc(dayObj.date)}">
    <header class="social-day-header">
      <div class="social-day-title-wrap">
        <h2 class="social-day-title">${esc(formatDayHeader(dayObj.date))}</h2>
        ${isLatest ? `<span class="social-day-badge is-latest">최신</span>` : ""}
        <span class="social-day-count">${esc(countLabel)}</span>
        ${mix ? `<span class="social-day-platforms">${esc(mix)}</span>` : ""}
      </div>
      <button type="button" class="social-day-toggle" data-toggle-day="${esc(dayObj.date)}" aria-expanded="${!isCollapsed}">${isCollapsed ? "펼치기" : "접기"}</button>
    </header>
    <div class="social-grid">${dayObj.items.map(card).join("")}</div>
  </section>`;
}

function getUnloadedDays() {
  const loadedSet = new Set(loadedOrder);
  return INDEX_DAYS.filter((d) => !loadedSet.has(d.date));
}

function renderStatusAndPagination(scopedCount, matchedCount) {
  const summaryEl = document.getElementById("social-summary");
  if (summaryEl) {
    if (state.date !== "all") {
      summaryEl.textContent = `${formatDayHeader(state.date)} · ${scopedCount}건 · X · Threads · Reddit · Instagram`;
    } else if (INDEX_DAYS.length > 1) {
      summaryEl.textContent = `누적 ${INDEX_DAYS.length}일 · 총 ${TOTAL_ARCHIVE_ITEMS}건 (표시 ${loadedOrder.length}일 ${scopedCount}건)`;
    } else {
      summaryEl.textContent = `선별 ${scopedCount}건 · X · Threads · Reddit · Instagram`;
    }
  }

  const unloaded = getUnloadedDays();
  const remainingItems = unloaded.reduce((acc, d) => acc + (d.count || 0), 0);

  const statusBar = document.getElementById("social-status-bar");
  if (statusBar) {
    if (state.date === "all" && hasActiveFilters() && unloaded.length > 0) {
      const nextBatch = Math.min(SEARCH_BATCH_DAYS, unloaded.length);
      statusBar.hidden = false;
      statusBar.innerHTML = `<span>불러온 ${loadedOrder.length}일(${scopedCount}건) 중 <strong>${matchedCount}건</strong> 일치 · 미로드 과거 ${unloaded.length}일(${remainingItems}건) 남음</span>
        <button type="button" class="social-status-action" id="social-search-more"${isLoadingMore ? " disabled" : ""}>${isLoadingMore ? "불러오는 중…" : `과거 ${nextBatch}일 더 불러와 찾기`}</button>`;
    } else {
      statusBar.hidden = true;
      statusBar.innerHTML = "";
    }
  }

  const pagEl = document.getElementById("social-pagination");
  const loadMoreBtn = document.getElementById("social-load-more");
  const pagMeta = document.getElementById("social-pagination-meta");
  if (!pagEl || !loadMoreBtn || !pagMeta) return;

  if (state.date !== "all") {
    pagEl.hidden = false;
    loadMoreBtn.hidden = false;
    loadMoreBtn.disabled = false;
    loadMoreBtn.dataset.mode = "all";
    loadMoreBtn.textContent = "전체 누적 피드로 돌아가기";
    pagMeta.hidden = true;
    return;
  }

  if (unloaded.length > 0) {
    pagEl.hidden = false;
    loadMoreBtn.hidden = false;
    loadMoreBtn.disabled = isLoadingMore;
    loadMoreBtn.dataset.mode = "more";
    loadMoreBtn.textContent = isLoadingMore
      ? "과거 피드 불러오는 중…"
      : `이전 날짜 더 불러오기 (남은 ${unloaded.length}일 · ${remainingItems}건)`;
    pagMeta.hidden = false;
    pagMeta.textContent = `현재 ${loadedOrder.length} / ${INDEX_DAYS.length}일 로드됨`;
  } else if (INDEX_DAYS.length > 1) {
    pagEl.hidden = false;
    loadMoreBtn.hidden = true;
    pagMeta.hidden = false;
    pagMeta.textContent = `전체 ${INDEX_DAYS.length}일 · ${scopedCount}건을 모두 불러왔습니다.`;
  } else {
    pagEl.hidden = true;
  }
}

function renderFilters(scopedItems) {
  const counts = scopedItems.reduce((m, it) => ({ ...m, [it.platform]: (m[it.platform] || 0) + 1 }), {});
  const tabs = [["all", "전체", scopedItems.length]];
  for (const [p, n] of Object.entries(counts)) {
    tabs.push([p, PLATFORM[p] || p, n]);
  }
  if (state.platform !== "all" && !counts[state.platform]) {
    tabs.push([state.platform, PLATFORM[state.platform] || state.platform, 0]);
  }
  const filterEl = document.getElementById("social-filter");
  if (filterEl) {
    filterEl.innerHTML = tabs
      .map(([f, label, count]) => `<button type="button" class="cat-chip${f === state.platform ? " is-active" : ""}" role="tab" aria-selected="${f === state.platform}" data-f="${esc(f)}"><span>${esc(label)}</span><span class="cat-count">${count}</span></button>`)
      .join("");
  }
}

function renderDateFilter() {
  const dateSel = document.getElementById("date-filter");
  if (!dateSel) return;
  const totalCount = TOTAL_ARCHIVE_ITEMS || INDEX_DAYS.reduce((s, d) => s + (d.count || 0), 0);
  const options = [`<option value="all">전체 기간 (누적 · ${INDEX_DAYS.length}일 · ${totalCount}건)</option>`];
  for (const d of INDEX_DAYS) {
    options.push(`<option value="${esc(d.date)}">${esc(formatDayHeader(d.date))} · ${d.count}건</option>`);
  }
  dateSel.innerHTML = options.join("");
  dateSel.value = state.date;
}

function updateSearchAffordance() {
  const clearBtn = document.getElementById("social-search-clear");
  const kbd = document.getElementById("social-search-kbd");
  if (clearBtn && kbd) {
    const hasQ = state.query.length > 0;
    clearBtn.hidden = !hasQ;
    kbd.hidden = hasQ;
  }
}

function render() {
  const { scopedAllItems, totalMatchedItems, days } = getScopedData();
  renderFilters(scopedAllItems);
  const root = document.getElementById("social-list");
  if (root) {
    root.innerHTML = days.length && totalMatchedItems > 0
      ? days.map(renderDaySection).join("")
      : `<p class="social-empty">조건에 맞는 게시물이 없습니다.</p>`;
  }
  updateSearchAffordance();
  renderStatusAndPagination(scopedAllItems.length, totalMatchedItems);
  syncToURL();
}

function appendDaysToDOM(newlyLoadedDates) {
  const root = document.getElementById("social-list");
  if (!root || !root.querySelector(".social-day-group") || hasActiveFilters() || state.date !== "all") {
    render();
    return;
  }
  const { scopedAllItems, totalMatchedItems, days } = getScopedData();
  const byDate = new Map(days.map((d) => [d.date, d]));
  const html = newlyLoadedDates
    .map((dateStr) => byDate.get(dateStr))
    .filter((d) => d && d.items.length > 0)
    .map(renderDaySection)
    .join("");
  if (html) {
    root.insertAdjacentHTML("beforeend", html);
  }
  renderFilters(scopedAllItems);
  updateSearchAffordance();
  renderStatusAndPagination(scopedAllItems.length, totalMatchedItems);
}

async function fetchJsonSafe(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchDay(dateStr) {
  if (dayCache.has(dateStr)) return dayCache.get(dateStr);
  if (inFlight.has(dateStr)) return inFlight.get(dateStr);

  const meta = INDEX_DAYS.find((d) => d.date === dateStr);
  const fileName = meta?.file || `social_${dateStr}.json`;
  const promise = fetchJsonSafe(`data/archive/${fileName}`)
    .then((data) => {
      const normalized = { date: data.date || dateStr, generatedAt: data.generatedAt || null, items: data.items || [] };
      dayCache.set(dateStr, normalized);
      return normalized;
    })
    .finally(() => {
      inFlight.delete(dateStr);
    });

  inFlight.set(dateStr, promise);
  return promise;
}

async function fetchDaysBatch(dates) {
  const queue = dates.filter((d) => !dayCache.has(d));
  const fetched = [];
  const workers = Array.from({ length: Math.min(FETCH_CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const nextDate = queue.shift();
      try {
        await fetchDay(nextDate);
        fetched.push(nextDate);
      } catch {
        // 개별 과거 일자 로드 실패 시 나머지 일자는 계속 표시
      }
    }
  });
  await Promise.all(workers);

  const orderMap = new Map(INDEX_DAYS.map((d, idx) => [d.date, idx]));
  const nextSet = new Set([...loadedOrder, ...dates.filter((d) => dayCache.has(d))]);
  loadedOrder = [...nextSet].sort((a, b) => (orderMap.get(a) ?? 9999) - (orderMap.get(b) ?? 9999));
  return fetched;
}

async function loadMoreDays(batchSize = LOAD_BATCH_DAYS, { isAuto = false } = {}) {
  if (isLoadingMore || state.date !== "all") return;
  const unloaded = getUnloadedDays();
  if (!unloaded.length) return;

  isLoadingMore = true;
  if (isAuto) autoLoadedBatches++;
  renderStatusAndPagination(getScopedData().scopedAllItems.length, getScopedData().totalMatchedItems);

  const targetDates = unloaded.slice(0, batchSize).map((d) => d.date);
  try {
    await fetchDaysBatch(targetDates);
  } finally {
    isLoadingMore = false;
  }

  const newlyVisible = targetDates.filter((d) => dayCache.has(d));
  appendDaysToDOM(newlyVisible);
}

async function switchToAllDates() {
  state.date = "all";
  const dateSel = document.getElementById("date-filter");
  if (dateSel) dateSel.value = "all";
  const initialDates = INDEX_DAYS.slice(0, INITIAL_DAYS).map((d) => d.date);
  if (initialDates.some((d) => !loadedOrder.includes(d))) {
    isLoadingMore = true;
    renderStatusAndPagination(0, 0);
    try {
      await fetchDaysBatch(initialDates);
    } finally {
      isLoadingMore = false;
    }
  }
  render();
}

function setupIntersectionObserver() {
  const sentinel = document.getElementById("social-sentinel");
  if (!sentinel || typeof IntersectionObserver === "undefined") return;
  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      if (state.date !== "all" || hasActiveFilters() || isLoadingMore) return;
      if (autoLoadedBatches >= AUTO_LOAD_MAX_BATCHES) return;
      if (getUnloadedDays().length === 0) return;
      loadMoreDays(LOAD_BATCH_DAYS, { isAuto: true });
    },
    { rootMargin: "350px 0px" },
  );
  observer.observe(sentinel);
}

function bindEvents() {
  const searchEl = document.getElementById("social-search");
  const clearBtn = document.getElementById("social-search-clear");

  document.getElementById("social-filter")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-f]");
    if (!btn) return;
    state.platform = btn.dataset.f;
    render();
  });

  document.getElementById("date-filter")?.addEventListener("change", async (e) => {
    const nextDate = e.target.value;
    if (nextDate === "all") {
      await switchToAllDates();
      return;
    }
    state.date = nextDate;
    if (!dayCache.has(state.date)) {
      isLoadingMore = true;
      renderStatusAndPagination(0, 0);
      try {
        await fetchDaysBatch([state.date]);
      } finally {
        isLoadingMore = false;
      }
    }
    render();
  });

  searchEl?.addEventListener("input", (e) => {
    state.query = e.target.value;
    updateSearchAffordance();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });

  clearBtn?.addEventListener("click", () => {
    clearTimeout(searchTimer);
    state.query = "";
    if (searchEl) {
      searchEl.value = "";
      searchEl.focus();
    }
    render();
  });

  const listEl = document.getElementById("social-list");
  listEl?.addEventListener("click", (e) => {
    const toggleBtn = e.target.closest("button[data-toggle-day]");
    if (toggleBtn) {
      const dateStr = toggleBtn.dataset.toggleDay;
      const section = toggleBtn.closest(".social-day-group");
      if (collapsedDays.has(dateStr)) {
        collapsedDays.delete(dateStr);
        section?.classList.remove("is-collapsed");
        toggleBtn.textContent = "접기";
        toggleBtn.setAttribute("aria-expanded", "true");
      } else {
        collapsedDays.add(dateStr);
        section?.classList.add("is-collapsed");
        toggleBtn.textContent = "펼치기";
        toggleBtn.setAttribute("aria-expanded", "false");
      }
      return;
    }

    const tagBtn = e.target.closest("button[data-tag]");
    if (!tagBtn) return;
    clearTimeout(searchTimer);
    state.query = tagBtn.dataset.tag;
    if (searchEl) searchEl.value = state.query;
    render();
  });

  // 만료된 외부 CDN 썸네일 이미지 깔끔히 제거 (인라인 onerror 대체)
  listEl?.addEventListener(
    "error",
    (e) => {
      if (e.target?.tagName === "IMG") {
        e.target.closest(".social-thumb")?.remove();
      }
    },
    true,
  );

  document.getElementById("social-load-more")?.addEventListener("click", (e) => {
    const mode = e.currentTarget.dataset.mode;
    if (mode === "all") {
      switchToAllDates();
    } else {
      loadMoreDays(LOAD_BATCH_DAYS);
    }
  });

  document.getElementById("social-status-bar")?.addEventListener("click", (e) => {
    if (e.target.closest("#social-search-more")) {
      loadMoreDays(SEARCH_BATCH_DAYS).then(() => render());
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchEl && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) {
      e.preventDefault();
      searchEl?.focus();
    } else if (e.key === "Escape" && document.activeElement === searchEl && state.query) {
      clearTimeout(searchTimer);
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
    btn.textContent = document.documentElement.dataset.theme === "dark" ? "라이트" : "다크";
  };
  btn?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("aiw-theme", next); } catch {}
    paint();
  });
  paint();
}

async function init() {
  initTheme();
  syncFromURL();
  bindEvents();

  try {
    const [indexRes, latestRes] = await Promise.allSettled([
      fetchJsonSafe("data/archive/social_index.json"),
      fetchJsonSafe("data/social_latest.json"),
    ]);

    let latestData = null;
    if (latestRes.status === "fulfilled" && latestRes.value?.date) {
      latestData = latestRes.value;
      dayCache.set(latestData.date, {
        date: latestData.date,
        generatedAt: latestData.generatedAt || null,
        items: latestData.items || [],
      });
    }

    if (indexRes.status === "fulfilled" && Array.isArray(indexRes.value?.days) && indexRes.value.days.length > 0) {
      INDEX_DAYS = [...indexRes.value.days];
      TOTAL_ARCHIVE_ITEMS = indexRes.value.total_items || INDEX_DAYS.reduce((s, d) => s + (d.count || 0), 0);
      if (latestData && !INDEX_DAYS.some((d) => d.date === latestData.date)) {
        INDEX_DAYS.unshift({
          date: latestData.date,
          file: `social_${latestData.date}.json`,
          count: (latestData.items || []).length,
          generatedAt: latestData.generatedAt || null,
        });
        TOTAL_ARCHIVE_ITEMS += (latestData.items || []).length;
      }
    } else if (latestData) {
      INDEX_DAYS = [{
        date: latestData.date,
        file: `social_${latestData.date}.json`,
        count: (latestData.items || []).length,
        generatedAt: latestData.generatedAt || null,
      }];
      TOTAL_ARCHIVE_ITEMS = (latestData.items || []).length;
    } else {
      throw new Error("소셜 피드 인덱스와 최신 데이터를 모두 불러오지 못했습니다.");
    }

    document.getElementById("social-date").textContent = INDEX_DAYS[0]?.date || "—";

    if (state.date !== "all" && !INDEX_DAYS.some((d) => d.date === state.date)) {
      state.date = "all";
    }
    renderDateFilter();

    const initialTargets = state.date !== "all"
      ? [state.date]
      : INDEX_DAYS.slice(0, INITIAL_DAYS).map((d) => d.date);

    await fetchDaysBatch(initialTargets);
    render();
    setupIntersectionObserver();
  } catch {
    document.getElementById("social-summary").textContent = "로드 실패";
    document.getElementById("social-list").innerHTML = `<p class="social-empty">데이터를 불러오지 못했습니다.</p>`;
  }
}

init();
