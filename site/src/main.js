import { isNewsPage, isStarboardPage, isLoungePage, isBenchmarksPage, GISCUS, isGiscusReady, STATE, CATEGORIES, NEWS_CATEGORIES, NEWS_SIGNALS, saveBookmarks, savePluginBookmarks } from "./state.js";


async function load(source) {
  STATE.source = source || "latest";

  if (isBenchmarksPage) {
    try {
      const res = await fetch("data/benchmarks_latest.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      STATE.data = await res.json();
    } catch (e) {
      STATE.data = null;
    }
    renderUpdateBar();
    renderPageSummary();
    renderBenchmarks();
    return;
  }

  if (isLoungePage) {
    // 대화 원본은 GitHub Discussions 다. 브라우저에서 직접 못 읽으므로(GraphQL 은 토큰 필수)
    // collect_lounge.js 가 수집 시점에 떨궈둔 스냅샷을 읽는다 — 뉴스·스타보드와 같은 방식.
    try {
      const res = await fetch("data/lounge_latest.json", { cache: "no-store" });
      STATE.data = await res.json();
    } catch (e) {
      STATE.data = { generated_at: null, threads: [], comments: [] };
    }
    renderUpdateBar();
    renderPageSummary();
    render();
    return;
  }

  if (isStarboardPage) {
    try {
      const [metaRes, ledgerRes] = await Promise.all([
        fetch("data/stars_meta.json"),
        fetch("data/stars_ledger.json")
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
      STATE.data = { meta: {}, ledger: {}, generated_at: null, heavy: [], middle: [], light: [] };
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
  if (isStarboardPage || isLoungePage) {
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

// 스타보드는 매일 자동 수집(stars.yml), 플러그인은 매주 월요일(weekly-trends.yml)
function nextUpdateDate(from) {
  const d = new Date(from);
  if (isStarboardPage) {
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
  
  if (isBenchmarksPage) {
    const shares = STATE.data.market_shares || [];
    const models = STATE.data.model_benchmarks || [];
    el.textContent = lang === "en"
      ? `${shares.length} services · ${models.length} frontier models`
      : `서비스 점유율 ${shares.length}개 · 프론티어 모델 ${models.length}개`;
    return;
  }

  if (isLoungePage) {
    const threads = STATE.data.threads || [];
    const total = threads.reduce((n, t) => n + (t.comment_count || 0), 0);
    el.textContent = lang === "en"
      ? `${threads.length} threads · ${total} comments`
      : `대화 ${threads.length}개 · 댓글 ${total}개`;
    return;
  }

  if (isNewsPage) {
    // "신규 N" 은 손으로 붙인 badges 에만 존재했다. 큐레이터는 badges 를 만들지 않고,
    // 애초에 피드의 모든 항목이 신규라 구분 자체가 무의미하므로 건수만 표시한다.
    const list = STATE.data.news || [];
    total = list.length;
    el.textContent = lang === "en" ? `Collected ${total} news` : `${total}건 수집`;
  } else if (isStarboardPage) {
    const d = STATE.data || {};
    total = (d.heavy?.length || 0) + (d.middle?.length || 0) + (d.light?.length || 0);
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
function getRelativeDayLabel(ts, lang) {
  if (!ts || isNaN(ts.getTime())) return "";
  const toKstYmd = d => {
    const kst = new Date(d.getTime() + (9 * 60 + d.getTimezoneOffset()) * 60000);
    return `${kst.getFullYear()}-${String(kst.getMonth() + 1).padStart(2, "0")}-${String(kst.getDate()).padStart(2, "0")}`;
  };
  const nowKst = toKstYmd(new Date());
  const targetKst = toKstYmd(ts);
  const diffDays = Math.round((Date.parse(nowKst) - Date.parse(targetKst)) / (86400 * 1000));

  if (diffDays <= 0) {
    return lang === "en" ? "today" : "오늘";
  } else if (diffDays === 1) {
    return lang === "en" ? "yesterday" : "어제";
  } else {
    return lang === "en" ? `${diffDays} days ago` : `${diffDays}일 전`;
  }
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
  const verSep = document.getElementById("version-sep");
  
  if (!updEl) return;
  if (ts && !isNaN(ts.getTime())) {
    const baseDate = `${fmtKFull(ts)} (${dayLabel(ts, lang)})`;
    if (isNewsPage || isLoungePage) {
      const rel = getRelativeDayLabel(ts, lang);
      updEl.textContent = rel ? `${baseDate} · ${rel}` : baseDate;
      if (nxtContainer) nxtContainer.style.display = "none";
      if (nxtSep) nxtSep.style.display = "none";
    } else {
      updEl.textContent = baseDate;
      if (STATE.source === "latest") {
        const nm = nextUpdateDate(ts);
        if (nxtEl) nxtEl.textContent = `${fmtKDate(nm)} (${dayLabel(nm, lang)})`;
        if (nxtContainer) nxtContainer.style.display = "";
        if (nxtSep) nxtSep.style.display = "";
      } else {
        if (nxtContainer) nxtContainer.style.display = "none";
        if (nxtSep) nxtSep.style.display = "none";
      }
    }
  } else {
    let fallbackText = "—";
    if (STATE.source !== "latest") {
      const fileMatch = String(STATE.source || "").match(/(\d{4})-(\d{2})-(\d{2})/);
      if (fileMatch) {
        const dObj = new Date(`${fileMatch[1]}-${fileMatch[2]}-${fileMatch[3]}T00:00:00`);
        if (!isNaN(dObj.getTime())) {
          fallbackText = `${fmtKFull(dObj)} (${dayLabel(dObj, lang)})`;
        } else {
          fallbackText = `${fileMatch[1]}.${fileMatch[2]}.${fileMatch[3]}`;
        }
      }
    }
    updEl.textContent = fallbackText;
    if (nxtEl) nxtEl.textContent = "—";
    if (nxtContainer) nxtContainer.style.display = "none";
    if (nxtSep) nxtSep.style.display = "none";
  }
  
  if (verEl) {
    let ver = d.version || (d.curated_date ? `v${d.curated_date.replace(/-/g, ".")}` : "");
    if (ver && /^\d{4}\.\d{2}\.\d{2}$/.test(ver)) {
      ver = `v${ver}`;
    }
    // 최신 회차에서 버전 필은 바로 왼쪽 "갱신" 날짜와 같은 값이다. 아카이브를 볼 때만 표시한다.
    const showVer = !!ver && STATE.source !== "latest";
    verEl.textContent = ver;
    verEl.style.display = showVer ? "" : "none";
    verEl.classList.toggle("is-archive", showVer);
    verEl.title = showVer ? (lang === "en" ? "Viewing archive" : "아카이브 보기") : "";
    if (verSep) verSep.style.display = showVer ? "" : "none";
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
    let dt = "";
    const fileMatch = String(a.file || "").match(/(\d{4})-(\d{2})-(\d{2})/);
    if (fileMatch) {
      dt = `${fileMatch[1]}.${fileMatch[2]}.${fileMatch[3]}`;
    } else {
      const rawDt = a.generated_at || a.date;
      if (rawDt) {
        const m = String(rawDt).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
          dt = `${m[1]}.${m[2]}.${m[3]}`;
        } else {
          const dObj = new Date(rawDt);
          if (!isNaN(dObj.getTime())) dt = fmtKFull(dObj);
        }
      }
    }
    if (!dt) dt = "—";
    let ver = a.version;
    if (!ver) {
      const dm = a.file.match(/(\d{4})-(\d{2})-(\d{2})/);
      ver = dm ? `v${dm[1]}.${dm[2]}.${dm[3]}` : a.file;
    } else if (/^\d{4}\.\d{2}\.\d{2}$/.test(ver)) {
      ver = `v${ver}`;
    }
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
    const opts = NEWS_CATEGORIES.map(c => {
      const count = c.id === "all" ? list.length : list.filter(x => x.category_id === c.id).length;
      if (c.id !== "all" && count === 0) return "";
      const label = lang === "en" ? c.label_en : c.label_ko;
      const sel = STATE.category === c.id ? " selected" : "";
      return `<option value="${c.id}"${sel}>${escapeHTML(label)} (${count})</option>`;
    }).join("");
    wrap.innerHTML = `
      <label class="src-select-wrap">
        <span class="src-select-label">${lang === "en" ? "Source" : "매체"}</span>
        <select id="news-source-select" aria-label="${lang === "en" ? "Filter by source" : "매체로 거르기"}">${opts}</select>
      </label>`;

    const sigWrap = document.getElementById("signal-chip-bar");
    if (sigWrap) {
      const filteredByCat = STATE.category === "all" ? list : list.filter(x => x.category_id === STATE.category);
      const signalChipsHtml = NEWS_SIGNALS.map(s => {
        const count = s.id === "all" ? filteredByCat.length : filteredByCat.filter(x => x.signal_id === s.id).length;
        if (s.id !== "all" && count === 0) return "";
        const label = lang === "en" ? s.label_en : s.label_ko;
        const active = (!STATE.bookmarksOnly && STATE.signal === s.id) ? "is-active" : "";
        return `<button class="signal-chip ${active}" data-signal="${s.id}" type="button">
          <span>${s.emoji}</span>
          <span>${label}</span>
          <span class="count-badge">${count}</span>
        </button>`;
      }).join("");

      const bmCount = list.filter(x => STATE.bookmarks.has(x.id)).length;
      const bmActive = STATE.bookmarksOnly ? "is-active" : "";
      const bmLabel = lang === "en" ? "Saved" : "저장";
      const bmChipHtml = `
        <button class="signal-chip bookmark-chip ${bmActive}" id="bookmark-filter-chip" type="button" title="${lang === "en" ? "View saved articles" : "저장한 뉴스 모아보기"}">
          <span>⭐</span>
          <span>${bmLabel}</span>
          <span class="count-badge">${bmCount}</span>
        </button>
      `;

      sigWrap.innerHTML = signalChipsHtml + bmChipHtml;
    }
  } else if (!isStarboardPage) {
    const list = (STATE.data?.[STATE.tab] || []);
    const categoryChips = CATEGORIES.map(c => {
      const count = c.id === "all" ? list.length : list.filter(x => x.category === c.id).length;
      if (c.id !== "all" && count === 0) return "";
      const label = lang === "en" ? c.label_en : c.label_ko;
      const active = (STATE.category === c.id && !STATE.pluginBookmarksOnly) ? "is-active" : "";
      return `<button class="cat-chip ${active}" data-cat="${c.id}" type="button">
        <span class="cat-emoji">${c.emoji}</span>
        <span>${label}</span>
        <span class="cat-count">${count}</span>
      </button>`;
    }).join("");

    const bmCount = list.filter(it => STATE.pluginBookmarks.has(it.id)).length;
    const bmActive = STATE.pluginBookmarksOnly ? "is-active" : "";
    const bmLabel = lang === "en" ? "Saved" : "저장";
    const bmChip = `
      <button class="cat-chip bookmark-chip ${bmActive}" id="plugin-bookmark-filter-chip" type="button" style="margin-left:4px;">
        <span>⭐</span>
        <span>${bmLabel}</span>
        <span class="cat-count">${bmCount}</span>
      </button>
    `;
    wrap.innerHTML = categoryChips + bmChip;
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
    item.title_ko, item.description_en || "", item.catchphrase, item.summary_ko,
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

/*
 * 순위 표시는 세 가지뿐이다: NEW · #01 TOP · #02/#03.
 * 예전엔 색 7가지와 라벨 7가지(대세·화제·급상승·PICK·한국어…)를 썼는데 범례가 없어
 * 독자가 서로의 차이를 알 수 없었다. 4위 이하는 아무 표시도 하지 않는다.
 * 데이터의 rank 를 쓴다 — 화면 index 로 계산하면 필터·검색만 해도 순위가 뒤바뀐다.
 */
function stickerFor(item, idx) {
  const rank = item.rank ?? idx + 1;
  const isNew = (item.badges || []).some(b => b.includes("신상") || b.includes("7일") || b.includes("NEW"));
  if (isNew) return { cls: "is-new", label: getLang() === "en" ? "NEW" : "신상" };
  if (rank === 1) return { cls: "is-top", label: "#01" };
  if (rank <= 3) return { cls: "is-hot", label: "#0" + rank };
  return null;
}

// 한국어 지원은 순위 자리가 아니라 카테고리 옆 칩으로 표시한다.
function korChip(item) {
  const isKor = (item.badges || []).some(b => b.includes("한국어"));
  if (!isKor) return "";
  return `<span class="kor-chip" title="${getLang() === "en" ? "Korean support" : "한국어 지원"}">KR</span>`;
}

// title_ko 는 "repo명 — 설명" 형식이다. repo명은 바로 위 repo-id 줄에 이미 있다.
function stripRepoPrefix(title, name) {
  const t = (title || "").trim();
  if (!t || !name) return t;
  if (t.slice(0, name.length).toLowerCase() !== name.toLowerCase()) return t;
  const rest = t.slice(name.length).replace(/^\s*[—–\-:·]\s*/, "").trim();
  return rest || t;
}

function cardHTML(item, idx) {
  const repoId = item.id || (item.owner && item.name ? `${item.owner}/${item.name}` : (item.repo_url ? String(item.repo_url).replace(/^https?:\/\/github\.com\//, "") : (item.name || "")));
  const safeId = escapeHTML(repoId);
  const avatar = item.thumbnail_url || `https://github.com/${(repoId).split("/")[0]}.png?size=80`;
  const st = stickerFor(item, idx);
  const lang = getLang();

  const isBookmarked = STATE.pluginBookmarks.has(repoId);
  const saveLabel = isBookmarked
    ? (lang === "en" ? "Remove from saved" : "저장 해제")
    : (lang === "en" ? "Save" : "저장하기");
  const bookmarkBtn = `
    <button type="button" class="card-plugin-bookmark-btn ${isBookmarked ? "is-bookmarked" : ""}" data-plugin-bookmark="${safeId}" title="${saveLabel}" aria-label="${saveLabel}">
      ${isBookmarked ? "★" : "☆"}
    </button>
  `;

  // 주간 증가 스타 또는 성장률 배지
  const weeklyStars = item.weekly_stars ? `<span class="sb-hot-badge" style="font-size:12px; padding:1px 6px;">★ +${item.weekly_stars.toLocaleString()}/w</span>` : "";

  // 기능 3개. 앞 두 단어를 굵게 하던 처리는 뺐다 — 의미와 무관하게 조사에서 잘렸다.
  const feats = (item.key_features || []).slice(0, 3).map(f =>
    `<li><span class="feat-bullet">✓</span><span class="feat-text">${escapeHTML(f.trim())}</span></li>`
  ).join("");

  // 이런 분께 추천 (use_case) 하이라이트 박스
  const useCaseBox = item.use_case ? `
    <div class="card-usecase-box">
      <span class="usecase-icon">💡</span>
      <span class="usecase-text"><strong class="usecase-label">${lang === "en" ? "Recommended:" : "이런 분께 추천:"}</strong>${escapeHTML(item.use_case)}</span>
    </div>
  ` : "";

  // 설치 안내 및 복사 칩:
  // 아카이브(STATE.source !== "latest")에서는 명령을 절대 보여주지 않고 "설치: README 참고" 텍스트만 표시.
  // 최신 주차에서는 install_hint가 "README"로 시작하면 텍스트만, 그 외 실제 명령이면 복사 버튼 생성.
  const rawCmd = item.install_hint || "";
  const isArchive = STATE.source !== "latest";
  const isReadmeHint = !rawCmd || /^README/i.test(rawCmd.trim());
  const copyTxt = lang === "en" ? "Copy" : "복사";
  const copyTitle = lang === "en" ? "Click to copy install command" : "클릭하여 설치 명령어 복사";

  let cliChip = "";
  if (rawCmd) {
    if (isArchive || isReadmeHint) {
      cliChip = `<div class="card-install-note"><span class="note-label">${lang === "en" ? "Install:" : "설치:"}</span> ${lang === "en" ? "See README" : "README 참고"}</div>`;
    } else {
      cliChip = `
        <button type="button" class="cli-copy-chip" data-cmd="${escapeHTML(rawCmd)}" title="${copyTitle}">
          <span class="cli-icon">❯</span>
          <span class="cli-cmd">${escapeHTML(rawCmd)}</span>
          <span class="cli-action">${copyTxt}</span>
        </button>
      `;
    }
  }

  const displayTitle = (lang === "en" && item.description_en)
    ? item.description_en
    : (stripRepoPrefix(item.title_ko, item.name) || item.catchphrase || item.name || repoId);

  return `
    <article class="card" data-id="${safeId}">
      ${bookmarkBtn}
      ${st ? `<span class="rank-pill ${st.cls}">${escapeHTML(st.label)}</span>` : ""}
      <div class="card-head">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
        <div class="head-meta">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="category-label">${escapeHTML(item.category || "")}</span>
            ${korChip(item)}
            ${weeklyStars}
          </div>
          <div class="repo-id">${formatRepoId(repoId)}</div>
        </div>
      </div>
      <h3 class="card-title" data-open="${safeId}" tabindex="0" role="button">${escapeHTML(displayTitle)}</h3>
      ${useCaseBox}
      ${feats ? `<ul class="features">${feats}</ul>` : ""}
      ${cliChip}
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

/*
 * 모달은 카드에 없는 것만 담는다.
 *   카드: 카테고리 · repo · 제목 · 이럴 때 · 기능 3줄 · ★ · GitHub
 *   모달: + 긴 설명(summary_ko) · 검증 점수 · 수집 출처와 근거 링크 · 태그 · 브리핑 복사
 * 카드와 겹치는 기능·용례도 남긴다 — 모달만 읽어도 판단이 서야 한다. 대신 간결한 형태로.
 * 캐치프레이즈와 badges 는 뺐다: 제목·순위 줄과 같은 말이다.
 */
function modalHTML(item, tab, rank) {
  const repoId = item.id || (item.owner && item.name ? `${item.owner}/${item.name}` : (item.repo_url ? String(item.repo_url).replace(/^https?:\/\/github\.com\//, "") : (item.name || "")));
  const safeId = escapeHTML(repoId);
  const avatar = item.thumbnail_url || `https://github.com/${(repoId).split("/")[0]}.png?size=80`;
  const lang = getLang();
  const tabLabel = tab === "rising"
    ? (lang === "en" ? "Trending" : "이번 주 뜨는")
    : (lang === "en" ? "Classic" : "이미 유명한");
  const rankStr = String(rank).padStart(2, "0");

  const score = item.trend_score;
  const scorePill = (score != null)
    ? `<span class="m-score-pill" title="${lang === "en" ? "velocity · buzz · quality · recency" : "velocity · buzz · quality · recency 종합"}">
         ${lang === "en" ? "Score" : "검증"} <strong>${score}</strong><span class="m-score-max">/100</span>
       </span>`
    : "";

  const feats = (item.key_features || []).map(f =>
    `<li>${escapeHTML(f.trim())}</li>`
  ).join("");

  const tags = (item.tags || []).map(t =>
    `<span class="m-tag">${escapeHTML(t)}</span>`
  ).join("");

  let installBlock = "";
  if (item.install_hint) {
    const isArchive = STATE.source !== "latest";
    const isReadmeHint = !item.install_hint || /^README/i.test(item.install_hint.trim());
    const copyTxt = lang === "en" ? "Copy" : "복사";
    const copyTitle = lang === "en" ? "Click to copy install command" : "클릭하여 설치 명령어 복사";

    if (isArchive || isReadmeHint) {
      installBlock = `<div class="m-section"><div class="m-label">${lang === "en" ? "Install" : "설치"}</div>
         <div class="m-install">${lang === "en" ? "See README" : "README 참고"}</div>
       </div>`;
    } else {
      installBlock = `<div class="m-section"><div class="m-label">${lang === "en" ? "Install" : "설치"}</div>
         <button type="button" class="cli-copy-chip" data-cmd="${escapeHTML(item.install_hint)}" title="${copyTitle}">
           <span class="cli-icon">❯</span>
           <span class="cli-cmd">${escapeHTML(item.install_hint)}</span>
           <span class="cli-action">${copyTxt}</span>
         </button>
       </div>`;
    }
  }

  const modalTitle = (lang === "en" && item.description_en)
    ? item.description_en
    : (stripRepoPrefix(item.title_ko, item.name) || item.id);

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
        <div class="m-repo">${formatRepoId(repoId)}</div>
      </div>
      <div class="m-stars">★ ${Number(item.stars || 0).toLocaleString()}</div>
      ${scorePill}
    </div>
    <h2>${escapeHTML(modalTitle)}</h2>
    ${item.summary_ko ? `<p class="m-summary">${escapeHTML(item.summary_ko)}</p>` : ""}
    ${feats ? `<div class="m-section"><div class="m-label">${lang === "en" ? "Key features" : "핵심 기능"}</div><ul class="m-features">${feats}</ul></div>` : ""}
    ${item.use_case ? `<div class="m-usecase"><span class="m-usecase-icon">💡</span><span><strong>${lang === "en" ? "Good for:" : "이럴 때:"}</strong> ${escapeHTML(item.use_case)}</span></div>` : ""}
    ${installBlock}
    ${modalSourcesSection(item)}
    ${tags ? `<div class="m-tags">${tags}</div>` : ""}
    <div class="m-cta-row">
      <button type="button" class="m-cta-ghost" data-copy-plugin="${safeId}">
        📋 ${lang === "en" ? "Copy briefing" : "정보 복사"}
      </button>
      <a class="m-cta" href="${escapeHTML(item.official_url || "#")}" target="_blank" rel="noopener">
        ${lang === "en" ? "Open in GitHub →" : "GitHub에서 열기 →"}
      </a>
    </div>
  `;
}

// 근거는 "어디서 봤고 무슨 수치였나" 한 줄씩이면 된다. 점수는 헤더 필로 올렸다.
function modalSourcesSection(item) {
  const srcs = (item.sources || []);
  const evi = (item.evidence || []);
  if (!srcs.length && !evi.length) return "";
  const lang = getLang();

  // 근거 항목이 있으면 그 안에 출처가 이미 칩으로 들어간다. 출처 칩 줄은 근거가 없을 때만 쓴다.
  const body = evi.length
    ? `<ul class="m-evidence">` + evi.map(e => {
        const label = escapeHTML(e.label || e.source || "");
        const src = escapeHTML(SOURCE_LABEL[e.source] || e.source || "");
        const url = e.url || "";
        return `<li><span class="src-chip">${src}</span>${url
          ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener">${label} ↗</a>`
          : `<span>${label}</span>`}</li>`;
      }).join("") + `</ul>`
    : `<div class="m-src-chips">${srcs.map(s => `<span class="src-chip">${escapeHTML(SOURCE_LABEL[s] || s)}</span>`).join("")}</div>`;

  // velocity_7d 가 추정값이면 그렇다고 밝힌다 — 실측과 섞이면 안 된다.
  const estNote = item.v7d_estimated
    ? `<p class="m-evidence-note">${lang === "en"
        ? "Weekly delta is estimated when the ledger has no baseline for this repo."
        : "주간 증가분은 원장 기준선이 없는 리포에서 추정값이다."}</p>`
    : "";

  return `<div class="m-section"><div class="m-label">${lang === "en" ? "Evidence" : "근거"}</div>${body}${estNote}</div>`;
}

function findItem(id) {
  const d = STATE.data || {};
  const match = x => x.id === id || (x.owner && x.name && `${x.owner}/${x.name}` === id) || (x.repo_url && String(x.repo_url).replace(/^https?:\/\/github\.com\//, "") === id) || x.name === id;
  const rIdx = (d.rising || []).findIndex(match);
  if (rIdx >= 0) return { item: d.rising[rIdx], tab: "rising", rank: d.rising[rIdx].rank ?? rIdx + 1 };
  const cIdx = (d.classic || []).findIndex(match);
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

/* ─── giscus (GitHub Discussions) ──────────────────────────────
   라운지 자유 대화와 뉴스 항목별 댓글이 같은 위젯을 쓴다.
   설정값이 비어 있으면 위젯을 붙이지 않고 안내를 띄운다 — 조용히 빈 상자를 남기지 않기 위함. */
function giscusTheme() {
  return getEffectiveTheme() === "dark" ? "dark" : "light";
}

// term 하나당 Discussion 하나. 뉴스 항목은 id 를, 라운지는 고정 문자열을 쓴다.
function mountGiscus(container, { term, categoryId, reactions = true }) {
  if (!container) return;
  container.innerHTML = "";
  const script = document.createElement("script");
  script.src = "https://giscus.app/client.js";
  script.async = true;
  script.crossOrigin = "anonymous";
  script.setAttribute("data-repo", GISCUS.repo);
  script.setAttribute("data-repo-id", GISCUS.repoId);
  script.setAttribute("data-category-id", categoryId);
  script.setAttribute("data-mapping", "specific");
  script.setAttribute("data-term", term);
  script.setAttribute("data-strict", "1");
  script.setAttribute("data-reactions-enabled", reactions ? "1" : "0");
  script.setAttribute("data-emit-metadata", "0");
  script.setAttribute("data-input-position", "top");
  script.setAttribute("data-theme", giscusTheme());
  script.setAttribute("data-lang", getLang() === "en" ? "en" : "ko");
  script.setAttribute("data-loading", "lazy");
  container.appendChild(script);
}

function giscusSetupNotice() {
  const lang = getLang();
  const steps = lang === "en"
    ? ["Enable Discussions in repository settings",
       "Install the giscus GitHub App on this repository",
       "Get data-repo-id and data-category-id from giscus.app",
       "Fill GISCUS in site/src/state.js"]
    : ["리포 Settings 에서 Discussions 켜기",
       "giscus GitHub App 을 이 리포에 설치",
       "giscus.app 에서 data-repo-id · data-category-id 발급",
       "site/src/state.js 의 GISCUS 값 채우기"];
  return `
    <div class="card" style="padding:24px; border:1px dashed var(--border);">
      <strong style="display:block; margin-bottom:8px;">${lang === "en" ? "Comments are not connected yet" : "댓글이 아직 연결되지 않았습니다"}</strong>
      <p style="margin:0 0 12px; color:var(--muted); font-size:14px; line-height:1.6;">
        ${lang === "en"
          ? "The lounge runs on GitHub Discussions. Four steps are left:"
          : "라운지는 GitHub Discussions 위에서 동작합니다. 남은 준비는 네 단계입니다:"}
      </p>
      <ol style="margin:0; padding-left:20px; color:var(--muted); font-size:14px; line-height:1.8;">
        ${steps.map((t) => `<li>${escapeHTML(t)}</li>`).join("")}
      </ol>
    </div>`;
}

// 테마·언어를 바꾸면 이미 떠 있는 iframe 에 postMessage 로 알려준다 (재로드 없이 반영)
function syncGiscusFrames() {
  document.querySelectorAll("iframe.giscus-frame").forEach((f) => {
    f.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: giscusTheme(), lang: getLang() === "en" ? "en" : "ko" } } },
      "https://giscus.app"
    );
  });
}

function renderLounge() {
  const el = document.getElementById("lounge-container");
  if (!el) return;
  const lang = getLang();
  const d = STATE.data || {};

  if (!isGiscusReady()) {
    el.innerHTML = giscusSetupNotice();
    return;
  }

  const comments = d.comments || [];
  const recent = comments.length
    ? comments.map((c) => {
        const when = c.created_at ? new Date(c.created_at) : null;
        const stamp = when ? `${when.getMonth() + 1}/${when.getDate()}` : "";
        return `
          <li style="padding:14px 0; border-bottom:1px solid var(--border);">
            <a href="${escapeHTML(c.url)}" target="_blank" rel="noopener" style="text-decoration:none; color:inherit; display:block;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                <img src="${escapeHTML(c.author_avatar || "")}" alt="" width="20" height="20" loading="lazy" style="border-radius:50%;" onerror="this.style.visibility='hidden'"/>
                <span style="font-weight:600; font-size:13px;">${escapeHTML(c.author || "unknown")}</span>
                <span style="color:var(--muted); font-size:12px;">${escapeHTML(c.thread_title || "")}</span>
                <span style="color:var(--muted); font-size:12px; margin-left:auto;">${stamp}</span>
              </div>
              <div style="font-size:14px; line-height:1.6; color:var(--text); opacity:0.9;">${escapeHTML((c.body || "").slice(0, 180))}</div>
            </a>
          </li>`;
      }).join("")
    : `<li style="padding:24px 0; color:var(--muted); font-size:14px;">${lang === "en" ? "No comments yet — be the first." : "아직 댓글이 없습니다. 첫 이야기를 남겨보세요."}</li>`;

  el.innerHTML = `
    <div class="lounge-guide-box">
      <div class="lounge-guide-title">
        <span>💡 ${lang === "en" ? "Suggested Discussion Topics" : "추천 토론 및 질문 주제"}</span>
      </div>
      <div class="lounge-topic-chips">
        <a class="lounge-topic-chip" href="https://github.com/ldk-hub/ai-weekly/discussions/new?category=q-a" target="_blank" rel="noopener">
          <span>❓ ${lang === "en" ? "Ask Claude Code Question" : "Claude Code 질문하기"}</span>
        </a>
        <a class="lounge-topic-chip" href="https://github.com/ldk-hub/ai-weekly/discussions/new?category=general" target="_blank" rel="noopener">
          <span>✨ ${lang === "en" ? "Agent Workflow Tips" : "실무 에이전트 팁 공유"}</span>
        </a>
        <a class="lounge-topic-chip" href="https://github.com/ldk-hub/ai-weekly/discussions/new?category=ideas" target="_blank" rel="noopener">
          <span>📦 ${lang === "en" ? "Recommend New Tool" : "새로운 오픈소스 추천"}</span>
        </a>
        <a class="lounge-topic-chip" href="https://github.com/ldk-hub/ai-weekly/discussions/new?category=ideas" target="_blank" rel="noopener">
          <span>🚀 ${lang === "en" ? "Site Feedback & Ideas" : "AI위클리 피드백 및 제안"}</span>
        </a>
      </div>
    </div>

    <section class="card" style="padding:24px; margin-bottom:24px;">
      <h2 style="margin:0 0 4px; font-size:18px;">${lang === "en" ? "Lounge" : "자유 대화"}</h2>
      <p style="margin:0 0 16px; color:var(--muted); font-size:14px;">${lang === "en" ? "Anything about AI tooling. GitHub sign-in required." : "AI 도구 이야기 무엇이든. GitHub 로그인이 필요합니다."}</p>
      <div id="lounge-giscus"></div>
    </section>

    <section class="card" style="padding:24px;">
      <h2 style="margin:0 0 4px; font-size:18px;">${lang === "en" ? "Recent comments across the site" : "사이트 전체 최근 댓글"}</h2>
      <p style="margin:0 0 8px; color:var(--muted); font-size:14px;">${lang === "en" ? "Updated with the daily news run." : "데일리 뉴스 갱신 때 함께 수집됩니다."}</p>
      <ul style="list-style:none; margin:0; padding:0;">${recent}</ul>
    </section>`;

  mountGiscus(document.getElementById("lounge-giscus"), {
    term: "lounge",
    categoryId: GISCUS.loungeCategoryId,
  });
}

function render() {
  const d = STATE.data || {};
  if (isBenchmarksPage) {
    renderBenchmarks();
    return;
  }

  if (isLoungePage) {
    renderLounge();
    return;
  }
  if (isNewsPage) {
    const el = document.getElementById("news-feed-container");
    if (!el) return;
    renderCategoryFilter();
    let list = (d.news || []);
    if (STATE.category !== "all") {
      list = list.filter(x => x.category_id === STATE.category);
    }
    if (STATE.signal !== "all") {
      list = list.filter(x => x.signal_id === STATE.signal);
    }
    if (STATE.bookmarksOnly) {
      list = list.filter(x => STATE.bookmarks.has(x.id));
    }
    list = list.filter(matchesNews);

    if (list.length === 0) {
      const lang = getLang();
      const noDataMsg = STATE.bookmarksOnly 
        ? (lang === "en" ? "Nothing saved yet. Tap the star on any card to save it." : "저장한 뉴스가 없습니다. 카드의 별(☆)을 눌러 저장해보세요.")
        : (lang === "en" ? "No news matches the filters. Try changing keywords or filters." : "조건에 일치하는 뉴스가 없습니다. 필터나 검색어를 변경해보세요.");
      el.innerHTML = `
        <div style="text-align:center;padding:60px 0;color:var(--muted);font-size:16px;">
          ${noDataMsg}
          <div style="margin-top:14px;">
            <button type="button" id="clear-filters-empty-btn" class="expand-toggle-btn" style="margin:0 auto;">${lang === "en" ? "Reset all filters" : "전체 필터 초기화"}</button>
          </div>
        </div>
      `;
    } else {
      let html = "";
      
      const genTime = d.generated_at ? new Date(d.generated_at) : new Date();
      const kstDate = new Date(genTime.getTime() + (9 * 60 + genTime.getTimezoneOffset()) * 60000);
      const kstStr = kstDate.toISOString().replace('T', ' ').substring(0, 16) + ' KST';
      
      // 출처는 하드코딩하지 않는다 — 실제 수집된 항목의 매체만 표기 (없는 매체를 광고하지 않기 위함)
      const srcNames = [...new Set((d.news || []).map(n => n.category_name).filter(Boolean))];
      const srcMeta = srcNames.length ? ` · 📡 ${srcNames.join(" · ")}` : "";

      const lang = getLang();
      if (STATE.category === "all" && STATE.signal === "all" && !STATE.bookmarksOnly && !STATE.query && d.summary) {
        const cleanedSummary = d.summary.replace(/\s*ldk-hub에서\s*큐레이션\s*하였습니다\.?/g, "").replace(/\s*\(ldk-hub에서\s*큐레이션\s*하였습니다\.?\)/g, "").trim();
        const formattedSummary = escapeHTML(cleanedSummary)
          // 점을 포함한 버전 태그(#Gemini3.8Live)가 "#Gemini3" + ".8Live" 로 쪼개지던 것.
          // 끝에 붙은 마침표는 태그에 넣지 않는다.
          .replace(/(#[\w가-힣-]+(?:\.[\w가-힣-]+)*)/g, '<span class="db-tag">$1</span>')
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
              <span class="db-title">💡 ${lang === "en" ? "Filtered News Results" : "필터링된 뉴스 결과"}</span>
              <span class="db-meta">🕒 ${kstStr}</span>
            </div>
          </div>
        `;
      }

      // 피드 액션 바: 결과 건수 및 심층 해설 일괄 토글
      const expandText = STATE.allExpanded 
        ? (lang === "en" ? "Fold all deep dives" : "심층 해설 모두 접기")
        : (lang === "en" ? "Expand all deep dives" : "심층 해설 모두 펼치기");
      const expandIcon = STATE.allExpanded ? "▲" : "▼";
      const hasActiveFilters = STATE.category !== "all" || STATE.signal !== "all" || STATE.bookmarksOnly || !!STATE.query;

      html += `
        <div class="feed-actions-bar">
          <div class="feed-results-count">
            ${lang === "en" ? "Showing" : "총"} <strong>${list.length}</strong>${lang === "en" ? " articles" : "개의 뉴스"}
            ${hasActiveFilters ? `<button type="button" id="clear-filters-btn" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:12px; margin-left:8px; text-decoration:underline; font-weight:600;">${lang === "en" ? "Reset filters" : "필터 초기화"}</button>` : ""}
          </div>
          <button type="button" class="expand-toggle-btn" id="expand-toggle-btn" title="${expandText}">
            <span>📖</span>
            <span>${expandText}</span>
            <span style="font-size:12px;">${expandIcon}</span>
          </button>
        </div>
      `;
      
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
      .filter(it => !STATE.pluginBookmarksOnly || STATE.pluginBookmarks.has(it.id))
      .filter(it => STATE.category === "all" || it.category === STATE.category)
      .filter(matches);
    const el = document.getElementById("grid");
    if (!el) return;
    updateTabCounts();
    renderCategoryFilter();
    const lang = getLang();
    const hasActiveFilters = STATE.category !== "all" || STATE.pluginBookmarksOnly || !!STATE.query;

    if (list.length === 0) {
      let msg;
      if (STATE.pluginBookmarksOnly) {
        msg = lang === "en"
          ? "No saved tools in this tab. Click ★ on any card to save it."
          : "이 탭에서 저장한 도구가 없습니다. 카드의 별(☆)을 눌러 저장해보세요.";
      } else {
        msg = lang === "en"
          ? "No matches. Try a different category or clear the search."
          : "조건에 맞는 항목이 없어요. 카테고리·검색어를 바꿔보세요.";
      }
      el.innerHTML = `
        <div style="grid-column: 1 / -1; width: 100%;">
          ${hasActiveFilters ? `
            <div class="feed-actions-bar" style="margin-bottom:14px;">
              <div class="feed-results-count">
                ${lang === "en" ? "Showing" : "총"} <strong>0</strong>${lang === "en" ? " tools" : "개의 도구"}
                <button type="button" id="clear-plugin-filters-btn" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:12px; margin-left:8px; text-decoration:underline; font-weight:600;">${lang === "en" ? "Reset filters" : "필터 초기화"}</button>
              </div>
            </div>
          ` : ""}
          <div class="empty">${msg}</div>
        </div>
      `;
    } else {
      const headerBar = hasActiveFilters ? `
        <div class="feed-actions-bar" style="grid-column: 1 / -1; width: 100%; margin-bottom: 8px;">
          <div class="feed-results-count">
            ${lang === "en" ? "Showing" : "총"} <strong>${list.length}</strong>${lang === "en" ? " tools" : "개의 도구"}
            <button type="button" id="clear-plugin-filters-btn" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:12px; margin-left:8px; text-decoration:underline; font-weight:600;">${lang === "en" ? "Reset filters" : "필터 초기화"}</button>
          </div>
        </div>
      ` : "";
      el.innerHTML = headerBar + list.map((it, i) => cardHTML(it, i)).join("");
    }
  }
}

function matchesNews(item) {
  if (!STATE.query) return true;
  const q = STATE.query.toLowerCase();
  const hay = [
    item.headline, item.title_ko, item.title_en || "", item.summary_ko, item.body_ko, item.author,
    (item.tags || []).join(" "), (item.sources || []).join(" "), item.category_name
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function newsCardHTML(item, idx = 0) {
  const safeId = escapeHTML(item.id || "");
  const lang = getLang();
  
  // importance(0~100) 는 큐레이터 내부 점수다. 정렬에만 쓰고 화면에는 내보내지 않는다 —
  // 독자가 93과 88 중 무엇을 먼저 읽을지 정하는 근거가 되지 못한다.

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
    const updWord = lang === "en" ? "Updated" : "업데이트";
    const label = Number.isFinite(growth) ? `${updWord} · ★ +${Math.round(growth)}%` : updWord;
    badges.push(`<span style="font-size:12px; font-weight:700; padding:2px 8px; border-radius:10px; background:var(--pill); color:var(--ink-2); letter-spacing:0.02em;">${label}</span>`);
  }
  const spd = Number(item.metrics && item.metrics.stars_per_day);
  if (item.category_id === "github" && Number.isFinite(spd) && spd > 0) {
    badges.push(`<span style="font-size:12px; font-weight:600; padding:2px 8px; border-radius:10px; background:var(--pill); color:var(--muted);" title="${lang === "en" ? "Average stars gained per day" : "생성 이후 하루평균 획득 star"}">★ ${spd.toLocaleString()}/day</span>`);
  }
  const badgeHtml = badges.length ? `<div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">${badges.join("")}</div>` : "";

  // 신호 배지는 필터 칩과 같은 표를 본다(NEWS_SIGNALS). 예전엔 카드에 별도 매핑이 있어
  // policy 분기가 빠져 "정책·규제" 기사가 카드에서는 "기술 신호"로 찍혔다.
  const sig = NEWS_SIGNALS.find(x => x.id === item.signal_id);
  const sigIcon = sig ? sig.emoji : "📌";
  const sigLabel = sig
    ? (lang === "en" ? sig.label_en : sig.label_ko)
    : (lang === "en" ? "Signal" : "기술 신호");
  const signalBadgeHtml = `<span class="signal-badge" title="${escapeHTML(item.signal_name || '')}">${sigIcon} ${sigLabel}</span>`;

  const isBookmarked = STATE.bookmarks && STATE.bookmarks.has(item.id);
  const bookmarkIcon = isBookmarked ? "★" : "☆";
  const bookmarkTitle = isBookmarked
    ? (lang === "en" ? "Remove from saved" : "저장 해제")
    : (lang === "en" ? "Save" : "저장하기");
  const bookmarkBtn = `
    <button type="button" class="news-save-btn ${isBookmarked ? 'is-bookmarked' : ''}" data-action="bookmark" data-id="${safeId}" title="${bookmarkTitle}" aria-label="${bookmarkTitle}">
      ${bookmarkIcon}
    </button>
  `;

  const headHtml = `
    ${bookmarkBtn}
    <div class="card-head" style="margin-bottom: 12px; padding-right: 34px;">
      <div class="avatar-wrapper" style="position:relative; display:inline-block; line-height:0;">
        <img class="avatar" src="${avatarUrl}" alt="" loading="lazy" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(authorStr)}&background=F4F4F5&color=3F3F46&bold=true'"/>
        ${platformIconHtml}
      </div>
      <div class="head-meta" style="flex:1;">
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; width:100%;">
          <span class="category-label" style="text-transform: uppercase;">${escapeHTML(item.category_name || "NEWS")}</span>
          ${signalBadgeHtml}
        </div>
        ${(() => {
          const rawAuthor = (item.author_profile || item.author || "").trim();
          const cat = (item.category_name || "").trim().toLowerCase();
          const plat = (item.platform || "").trim().toLowerCase();
          const isDup = !rawAuthor ||
            rawAuthor.toLowerCase() === "unknown" ||
            rawAuthor.toLowerCase() === cat ||
            rawAuthor.toLowerCase() === plat ||
            rawAuthor.toLowerCase() === "aitimes" ||
            rawAuthor === "AI타임스";
          
          const authorSpan = isDup ? "" : `<span class="owner" style="color: var(--ink); font-weight: 600;">${escapeHTML(rawAuthor)}</span>`;
          const sep = (authorSpan && dateStr) ? `<span style="color: var(--muted);"> · </span>` : "";
          const dateSpan = dateStr ? `<span style="color: var(--muted);">${dateStr}</span>` : "";
          
          if (!authorSpan && !dateSpan) return "";
          return `<div class="repo-id" style="font-size: 13px; margin-top: 3px;">${authorSpan}${sep}${dateSpan}</div>`;
        })()}
        ${badgeHtml}
      </div>
    </div>
  `;

  const hasEnTitle = item.title_en && /[A-Za-z]{4,}/.test(item.title_en);
  const rawTitle = (lang === "en" && hasEnTitle)
    ? item.title_en
    : (item.headline || item.title_ko || item.title_en || "");
  const title = escapeHTML(rawTitle);
  
  // 3대 핵심 요약 박스 (Key Takeaways) 포맷팅
  let summaryHtml = "";
  if (item.summary_ko) {
    const rawLines = item.summary_ko.split("\n").map(l => l.trim()).filter(Boolean);
    const bulletsHtml = rawLines.map((l, i) => {
      let clean = l.replace(/^[•\-\*]\s*/, "");
      // **키워드**를 <strong class="bullet-keyword">로 파싱
      let parsed = escapeHTML(clean).replace(/\*\*(.*?)\*\*/g, '<strong class="bullet-keyword">$1</strong>');
      return `
        <li class="takeaway-item">
          <span class="takeaway-bullet">${i + 1}</span>
          <span class="takeaway-text">${parsed}</span>
        </li>
      `;
    }).join("");
    summaryHtml = `
      <div class="takeaways-box">
        <ul class="takeaways-list">
          ${bulletsHtml}
        </ul>
      </div>
    `;
  }
  
  // 본문 심층 분석 (네이티브 아코디언으로 기본 접힘 처리, allExpanded 상태 반영)
  const isOpen = STATE.allExpanded ? "open" : "";
  const bodyKo = item.body_ko ? `
    <details class="news-details" ${isOpen}>
      <summary>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6l4 4 4-4"/></svg>
        <span>${lang === "en" ? "Deep Dive & Background" : "심층 분석 및 기술 배경 보기"}</span>
      </summary>
      <div class="deep-dive-content">${escapeHTML(item.body_ko)}</div>
    </details>
  ` : "";
  
  const tags = "";

  const related = (item.related_articles && item.related_articles.length > 0) ? `<div style="margin-top:16px; font-size:13px; background:var(--pill); padding:14px; border-radius:12px;"><strong style="color:var(--ink-2); display:flex; align-items:center; gap:6px;">🔗 ${lang === "en" ? "Related Articles" : "관련 기사"}</strong><ul style="margin-top:8px; padding-left:18px; color:var(--muted); list-style-type:circle;">${item.related_articles.map(r => `<li style="margin-bottom:4px;"><a href="${escapeHTML(r.url)}" target="_blank" rel="noopener" style="color:var(--muted); text-decoration:none;">${escapeHTML(r.title)}</a></li>`).join("")}</ul></div>` : "";

  const copyBtn = `
    <button type="button" class="card-icon-btn" data-action="copy-summary" data-id="${safeId}" title="${lang === 'en' ? 'Copy title, summary & link' : '기사 요약과 원문 링크 복사'}" style="font-size:12px; font-weight:600;">
      <span>📋</span> <span>${lang === 'en' ? 'Copy' : '요약 복사'}</span>
    </button>
  `;

  const commentBtn = isGiscusReady() ? `
      <button type="button" class="repo-link" data-giscus-term="${safeId}" style="background:none; border:none; cursor:pointer; font:inherit; color:var(--accent);">
        💬 ${lang === "en" ? "Comments" : "댓글"}
      </button>` : "";
  const linkBtn = item.url ? `
    <div class="card-foot" style="margin-top:18px; border-top:1px solid var(--border); padding-top:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      ${copyBtn}
      ${commentBtn}
      <a class="repo-link" href="${escapeHTML(item.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="margin-left:auto; font-weight:600;">
        ${lang === "en" ? "Read Source" : "원문 보기"} <span class="arrow">→</span>
      </a>
    </div>
    <div class="nc-comments" id="giscus-${safeId}" hidden style="margin-top:16px; border-top:1px solid var(--border); padding-top:16px;"></div>
  ` : "";

  return `
    <article class="card news-card" data-id="${safeId}" data-platform="${item.category_id || 'news'}" style="position:relative; padding:20px; box-shadow:0 2px 10px rgba(0,0,0,0.04); border-radius:14px;">
      ${cover}
      ${headHtml}
      <a href="${item.url ? escapeHTML(item.url) : '#'}" target="_blank" rel="noopener" style="text-decoration:none; color:inherit; display:block;">
        <h3 style="margin-top:0; margin-bottom:10px; line-height:1.42; font-size:18px; font-weight:700;">${title}</h3>
      </a>
      ${summaryHtml}
      ${bodyKo}
      ${tags}
      ${related}
      ${linkBtn}
    </article>
  `;
}

document.getElementById("search")?.addEventListener("input", e => {
  STATE.query = e.target.value;
  if (isStarboardPage) STATE.sbLimit = 50;
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
    STATE.pluginBookmarksOnly = false;
    if (isStarboardPage) STATE.sbLimit = 50;
    render();
  });
});

document.getElementById("cat-filter")?.addEventListener("change", e => {
  const sel = e.target.closest("#news-source-select");
  if (!sel) return;
  STATE.category = sel.value;
  render();
});
document.getElementById("cat-filter")?.addEventListener("click", e => {
  const bmBtn = e.target.closest("#plugin-bookmark-filter-chip");
  if (bmBtn) {
    STATE.pluginBookmarksOnly = !STATE.pluginBookmarksOnly;
    render();
    return;
  }
  const btn = e.target.closest(".cat-chip");
  if (!btn) return;
  STATE.pluginBookmarksOnly = false;
  STATE.category = btn.dataset.cat;
  render();
});

document.getElementById("signal-chip-bar")?.addEventListener("click", e => {
  const bmBtn = e.target.closest("#bookmark-filter-chip");
  if (bmBtn) {
    STATE.bookmarksOnly = !STATE.bookmarksOnly;
    render();
    return;
  }
  const btn = e.target.closest(".signal-chip");
  if (!btn) return;
  STATE.bookmarksOnly = false;
  STATE.signal = btn.dataset.signal;
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

function handleCliCopy(e) {
  const cliBtn = e.target.closest(".cli-copy-chip");
  if (!cliBtn) return false;
  e.stopPropagation();
  const cmd = cliBtn.dataset.cmd || "";
  const actionEl = cliBtn.querySelector(".cli-action");
  const origText = actionEl ? actionEl.innerText : "";
  const lang = getLang();
  const successTxt = lang === "en" ? "✓ Copied!" : "✓ 복사됨!";
  const failTxt = lang === "en" ? "Copy failed" : "복사 실패";

  navigator.clipboard.writeText(cmd)
    .then(() => {
      if (actionEl) actionEl.innerText = successTxt;
      setTimeout(() => { if (actionEl) actionEl.innerText = origText; }, 1500);
    })
    .catch(() => {
      if (actionEl) actionEl.innerText = failTxt;
      setTimeout(() => { if (actionEl) actionEl.innerText = origText; }, 1500);
    });
  return true;
}

document.getElementById("grid")?.addEventListener("click", e => {
  if (handleCliCopy(e)) return;

  const clearBtn = e.target.closest("#clear-plugin-filters-btn");
  if (clearBtn) {
    STATE.category = "all";
    STATE.pluginBookmarksOnly = false;
    STATE.query = "";
    const s = document.getElementById("search");
    if (s) s.value = "";
    render();
    return;
  }

  const bmBtn = e.target.closest("[data-plugin-bookmark]");
  if (bmBtn) {
    e.stopPropagation();
    const id = bmBtn.dataset.pluginBookmark;
    const lang = getLang();
    if (STATE.pluginBookmarks.has(id)) {
      STATE.pluginBookmarks.delete(id);
      showToast(lang === "en" ? "Removed from saved" : "저장 목록에서 뺐습니다");
    } else {
      STATE.pluginBookmarks.add(id);
      showToast(lang === "en" ? "Saved ★" : "저장했습니다 ★");
    }
    savePluginBookmarks(STATE.pluginBookmarks);
    render();
    return;
  }

  const copyBtn = e.target.closest("[data-copy-plugin]");
  if (copyBtn) {
    e.stopPropagation();
    copyPluginBriefing(copyBtn.dataset.copyPlugin);
    return;
  }

  // 상세는 제목을 눌러야 열린다. 예전엔 카드 전체가 클릭 영역이라
  // 추천 박스나 기능 줄의 글자를 읽으려 눌러도 모달이 떴다.
  const title = e.target.closest("[data-open]");
  if (title) openModal(title.dataset.open);
});
document.getElementById("grid")?.addEventListener("keydown", e => {
  const title = e.target.closest("[data-open]");
  if (title && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    openModal(title.dataset.open);
  }
});
// 브리핑 복사는 카드에서 모달로 옮겼다. 두 곳 모두에서 같은 텍스트가 나와야 한다.
function copyPluginBriefing(id) {
  const hit = findItem(id);
  const lang = getLang();
  if (!hit || !hit.item) return;
  const it = hit.item;
  const lines = [
    `[Claude Code 도구] ${it.title_ko || it.id} (${it.id})`,
    it.catchphrase ? `💡 ${it.catchphrase}` : "",
    it.use_case ? `🎯 추천: ${it.use_case}` : "",
    it.install_hint ? `💻 설치: ${it.install_hint}` : "",
    `🔗 ${it.official_url || it.repo_url || `https://github.com/${it.id}`}`
  ].filter(Boolean);
  navigator.clipboard.writeText(lines.join("\n")).then(() => {
    showToast(lang === "en" ? "Tool briefing copied to clipboard!" : "도구 브리핑이 복사되었습니다!");
  }).catch(() => {
    showToast(lang === "en" ? "Failed to copy" : "복사에 실패했습니다");
  });
}

document.getElementById("modal")?.addEventListener("click", e => {
  if (handleCliCopy(e)) return;
  const copyBtn = e.target.closest("[data-copy-plugin]");
  if (copyBtn) {
    copyPluginBriefing(copyBtn.dataset.copyPlugin);
    return;
  }
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
  syncGiscusFrames();
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
  syncGiscusFrames();
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

// 토스트 알림 함수
function showToast(msg) {
  let toast = document.getElementById("toast-notice");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notice";
    toast.className = "toast-notice";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("is-visible");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2200);
}

// 플로팅 탑스크롤 버튼 초기화
function initFloatingTopButton() {
  let btn = document.getElementById("floating-top-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "floating-top-btn";
    btn.className = "floating-top-btn";
    btn.setAttribute("aria-label", "맨 위로 이동");
    btn.setAttribute("title", "맨 위로 이동");
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>`;
    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.body.appendChild(btn);
  }
  window.addEventListener("scroll", () => {
    if (window.scrollY > 280) {
      btn.classList.add("is-visible");
    } else {
      btn.classList.remove("is-visible");
    }
  }, { passive: true });
}

// 키보드 단축키 (/ 검색 포커스, Esc 초기화)
document.addEventListener("keydown", (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
  const isTyping = activeTag === "input" || activeTag === "textarea";

  if (e.key === "/" && !isTyping) {
    const search = document.getElementById("search");
    if (search) {
      e.preventDefault();
      search.focus();
      search.select();
    }
  } else if (e.key === "Escape") {
    const search = document.getElementById("search");
    if (document.activeElement === search || STATE.query) {
      if (search) {
        search.value = "";
        search.blur();
      }
      if (STATE.query) {
        STATE.query = "";
        render();
      }
    }
  }
});

// 뉴스 피드 이벤트 위임 (댓글, 저장, 요약 복사, 일괄 펼침, 필터 초기화)
document.getElementById("news-feed-container")?.addEventListener("click", (e) => {
  // 1. 저장 버튼
  const bmBtn = e.target.closest('[data-action="bookmark"]');
  if (bmBtn) {
    e.stopPropagation();
    e.preventDefault();
    const id = bmBtn.dataset.id;
    if (!STATE.bookmarks) STATE.bookmarks = new Set();
    if (STATE.bookmarks.has(id)) {
      STATE.bookmarks.delete(id);
      showToast(getLang() === "en" ? "Removed from saved" : "저장 목록에서 뺐습니다");
    } else {
      STATE.bookmarks.add(id);
      showToast(getLang() === "en" ? "Saved ★" : "저장했습니다 ★");
    }
    saveBookmarks(STATE.bookmarks);
    render();
    return;
  }

  // 2. 기사 요약 및 원문 링크 복사 버튼
  const copyBtn = e.target.closest('[data-action="copy-summary"]');
  if (copyBtn) {
    e.stopPropagation();
    e.preventDefault();
    const id = copyBtn.dataset.id;
    const item = (STATE.data?.news || []).find(x => x.id === id);
    if (item) {
      const title = item.title_ko || item.headline || "";
      const summary = item.summary_ko ? item.summary_ko.replace(/\*\*/g, "") : "";
      const copyText = `📰 [AI Weekly] ${title}\n\n${summary}\n\n🔗 원문 링크: ${item.url || ""}`;
      navigator.clipboard.writeText(copyText).then(() => {
        showToast("📋 기사 요약과 원문 링크가 복사되었습니다!");
      }).catch(() => {
        showToast("클립보드 복사에 실패했습니다.");
      });
    }
    return;
  }

  // 3. 심층 해설 일괄 펼치기 / 접기 버튼
  const expandBtn = e.target.closest("#expand-toggle-btn");
  if (expandBtn) {
    e.stopPropagation();
    STATE.allExpanded = !STATE.allExpanded;
    document.querySelectorAll("#news-feed-container details.news-details").forEach(d => {
      d.open = STATE.allExpanded;
    });
    render();
    return;
  }

  // 4. 필터 초기화 버튼
  const clearBtn = e.target.closest("#clear-filters-btn, #clear-filters-empty-btn");
  if (clearBtn) {
    e.stopPropagation();
    STATE.category = "all";
    STATE.signal = "all";
    STATE.bookmarksOnly = false;
    STATE.query = "";
    const search = document.getElementById("search");
    if (search) search.value = "";
    render();
    return;
  }

  // 5. 댓글 버튼 (giscus)
  const btn = e.target.closest("[data-giscus-term]");
  if (!btn) return;
  e.stopPropagation();
  const term = btn.dataset.giscusTerm;
  const box = document.getElementById(`giscus-${term}`);
  if (!box) return;
  if (box.hidden) {
    box.hidden = false;
    if (!box.dataset.mounted) {
      mountGiscus(box, { term, categoryId: GISCUS.newsCategoryId, reactions: false });
      box.dataset.mounted = "1";
    }
  } else {
    box.hidden = true;
  }
});

initFloatingTopButton();

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
    
    // Calculate 7-day velocity (normalized to ~7 days baseline)
    let velocity = 0;
    const samplesBeforeLatest = history.filter(h => h.date < latestDate);
    if (samplesBeforeLatest.length > 0) {
      const latestMs = new Date(latestDate).getTime();
      let bestSample = null;
      let minDiff = Infinity;
      let bestDays = 0;

      for (const s of samplesBeforeLatest) {
        const days = Math.round((latestMs - new Date(s.date).getTime()) / 86400000);
        if (days > 0) {
          const diffFrom7 = Math.abs(days - 7);
          if (diffFrom7 < minDiff) {
            minDiff = diffFrom7;
            bestSample = s;
            bestDays = days;
          }
        }
      }

      if (bestSample && bestDays > 0) {
        const delta = currentStars - bestSample.stars;
        velocity = Math.round((delta * 7) / bestDays);
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
  
  STATE.data.heavy = processed.filter(r => r.currentStars >= 10000);
  STATE.data.middle = processed.filter(r => r.currentStars >= 1000 && r.currentStars < 10000);
  STATE.data.light = processed.filter(r => r.currentStars < 1000);
}

function matchesStarboard(item) {
  if (!STATE.query) return true;
  const q = STATE.query.toLowerCase();
  const hay = [
    item.id,
    item.meta?.description || "",
    item.meta?.desc_ko || "",
    item.meta?.language || "",
    (item.meta?.topics || []).join(" ")
  ].join(" ").toLowerCase();
  return hay.includes(q);
}

function renderStarboard() {
  const el = document.getElementById("starboard-container");
  if (!el) return;
  const lang = getLang();
  
  const baseList = STATE.data[STATE.tab] || [];
  const list = baseList.filter(matchesStarboard);
  
  // Update counts
  const tabs = ['heavy', 'middle', 'light'];
  for (const tab of tabs) {
    const btn = document.getElementById(tab + "-count");
    if (btn) btn.textContent = (STATE.data[tab] || []).length;
  }
  
  const hasQuery = !!STATE.query;
  if (list.length === 0) {
    const emptyMsg = hasQuery
      ? (lang === "en" ? "No repositories match your search." : "검색어와 일치하는 리포지토리가 없습니다.")
      : (lang === "en" ? "No repositories in this league yet." : "이 리그에는 아직 등록된 리포지토리가 없습니다.");
    el.innerHTML = `
      <div style="text-align:center;padding:60px 0;color:var(--muted);font-size:16px;">
        ${emptyMsg}
        ${hasQuery ? `<div style="margin-top:14px;"><button type="button" id="clear-starboard-filters-btn" class="expand-toggle-btn" style="margin:0 auto;">${lang === "en" ? "Clear search" : "검색 초기화"}</button></div>` : ""}
      </div>
    `;
    return;
  }
  
  const gridClass = STATE.viewMode === 'list' ? 'grid list-view' : 'grid';
  const gridStyle = STATE.viewMode === 'list' 
    ? 'display:flex;flex-direction:column;gap:10px;' 
    : 'display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:24px;';

  const legendText = lang === "en"
    ? "Active (within 7d) · Slowing (8–90d) · Dormant (>90d)"
    : "활발 (최근 7일 이내) · 둔화 (8~90일) · 방치 (90일 초과)";
    
  let html = "";
  html += `
    <div class="feed-actions-bar" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
      ${hasQuery ? `
        <div class="feed-results-count">
          ${lang === "en" ? "Showing" : "검색 결과"} <strong>${list.length}</strong>${lang === "en" ? " repositories" : "개 리포지토리"}
          <button type="button" id="clear-starboard-filters-btn" style="background:none; border:none; color:var(--accent); cursor:pointer; font-size:12px; margin-left:8px; text-decoration:underline; font-weight:600;">${lang === "en" ? "Clear search" : "검색 초기화"}</button>
        </div>
      ` : `<div></div>`}
      <div class="sb-legend" style="font-size:12px; color:var(--muted); margin-left:auto;">
        ${legendText}
      </div>
    </div>
  `;

  const limit = STATE.sbLimit || 50;
  const visibleList = list.slice(0, limit);
  const remaining = list.length - visibleList.length;

  html += `<div class="${gridClass}" style="${gridStyle}">`;
  html += visibleList.map((item, idx) => starboardCardHTML(item, idx, legendText)).join("");
  html += `</div>`;

  if (remaining > 0) {
    const moreLabel = lang === "en" ? `Show more (${remaining} remaining)` : `더 보기 (남은 ${remaining}개)`;
    html += `
      <div style="text-align:center; margin-top:24px;">
        <button type="button" class="expand-toggle-btn" id="sb-more" style="margin:0 auto;">${moreLabel}</button>
      </div>
    `;
  }

  el.innerHTML = html;
}

document.getElementById("starboard-container")?.addEventListener("click", (e) => {
  const moreBtn = e.target.closest("#sb-more");
  if (moreBtn) {
    STATE.sbLimit = (STATE.sbLimit || 50) + 50;
    renderStarboard();
    return;
  }
  const clearBtn = e.target.closest("#clear-starboard-filters-btn");
  if (clearBtn) {
    STATE.query = "";
    STATE.sbLimit = 50;
    const s = document.getElementById("search");
    if (s) s.value = "";
    renderStarboard();
  }
});

function starboardCardHTML(item, idx, legendText) {
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

  const badgeTitle = legendText || (lang === "en"
    ? "Active (within 7d) · Slowing (8–90d) · Dormant (>90d)"
    : "활발 (최근 7일 이내) · 둔화 (8~90일) · 방치 (90일 초과)");
  
  const repoName = item.id.split("/")[1];
  const ownerName = item.id.split("/")[0];
  
  const sign = item.velocity > 0 ? "+" : "";
  const velocityColor = item.velocity > 0 ? "var(--mint)" : (item.velocity < 0 ? "var(--coral)" : "var(--muted)");
  
  // 인기 플러그인 카드와 같은 규칙: 1위·2~3위만 표시하고 나머지는 표시하지 않는다.
  const rankPill = rank === 1
    ? `<span class="rank-pill is-top">#01</span>`
    : (rank <= 3 ? `<span class="rank-pill is-hot">#0${rank}</span>` : "");
  
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
  
  const svg = item.sparklineData.length >= 3
    ? `<svg class="sb-sparkline" aria-hidden="true" width="100%" height="${height}" viewBox="-2 -10 ${width + 4} ${height+20}" preserveAspectRatio="none" style="margin-top:auto; padding-top:12px;">
    <polyline fill="none" stroke="${velocityColor}" stroke-width="3" points="${points}" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
    : `<div class="sb-nochart" aria-hidden="true" style="margin-top:auto; padding-top:12px;">${lang === "en"
        ? `${item.sparklineData.length} observations — trend chart needs 3+`
        : `관측 ${item.sparklineData.length}회 · 추이 그래프는 3회부터`}</div>`;
  
  const avatar = (item.meta && item.meta.owner_avatar) ? item.meta.owner_avatar : `https://github.com/${ownerName}.png?size=80`;
  const descKo = (item.meta && item.meta.desc_ko) ? item.meta.desc_ko : "";
  const descEn = (item.meta && item.meta.description) ? item.meta.description : "";
  const langTag = (item.meta && item.meta.language) ? `<span class="sb-tech-badge">🏷️ ${escapeHTML(item.meta.language)}</span>` : "";

  // 핫 모멘텀 배지
  const isHot = item.velocity >= 300;
  const velocityBadge = isHot 
    ? `<span class="sb-hot-badge">🔥 ${sign}${item.velocity.toLocaleString()}/wk</span>`
    : `<span style="color:${velocityColor}; font-weight:700; font-size: 14px; background:var(--surface); padding:2px 8px; border-radius:12px; display:inline-block;">${sign}${item.velocity.toLocaleString()}/wk</span>`;

  // 설명부: EN 모드에서는 영문 원본(descEn)을 우선 노출, KO 모드에서는 한국어(descKo) 우선 노출
  const useKoBox = lang === "en" ? (!descEn && !!descKo) : !!descKo;
  const descHtml = useKoBox
    ? `<div class="sb-desc-ko" title="${escapeHTML(descEn)}">${escapeHTML(descKo)}</div>`
    : (descEn ? `<div class="sb-desc-en" title="${escapeHTML(descKo || descEn)}" style="font-size:13px; color:var(--muted); line-height:1.45; margin:8px 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHTML(descEn)}</div>` : "");

  return `
    <article class="card star-card" style="padding: 22px 20px 0; overflow:hidden; display:flex; flex-direction:column;">
      ${rankPill}
      
      <div class="card-head" style="margin-bottom:10px;">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
        <div class="head-meta">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="repo-id" style="font-size: 13px;">${escapeHTML(ownerName)} /</span>
            ${langTag}
          </div>
          <h3 style="margin:2px 0 0; font-size: 18px; word-break:break-all; line-height:1.3;">${escapeHTML(repoName)}</h3>
        </div>
      </div>
      
      <div class="sb-stats-row" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="stars-line" style="font-size:16px; font-weight:700;">★ ${item.currentStars.toLocaleString()}</span>
          ${velocityBadge}
        </div>
        <span class="sb-badge ${badgeClass}" style="margin:0;" title="${escapeHTML(badgeTitle)}">${badgeLabel}</span>
      </div>

      ${descHtml}
      
      <div class="sb-foot-row" style="display:flex; justify-content:flex-end; margin-top:auto; padding-top:6px;">
        <a class="repo-link" href="https://github.com/${escapeHTML(item.id)}" target="_blank" rel="noopener" style="margin:0; font-size:13px; font-weight:600;">
          GITHUB <span class="arrow">→</span>
        </a>
      </div>
      
      ${svg}
    </article>
  `;
}

/* ==========================================================================
   AI 점유율 및 모델별 성능 지표 (Benchmarks) 렌더링
   ========================================================================== */

function refocus(key) {
  if (key) document.querySelector(`[data-focus-key="${key}"]`)?.focus({ preventScroll: true });
}

function renderBenchmarks() {
  const container = document.getElementById("benchmarks-container");
  if (!container) return;

  const isEn = getLang() === "en";

  // 출처 한 줄 업데이트 (#bm-source)
  const sourceEl = document.getElementById("bm-source");
  if (sourceEl) {
    if (STATE.data?.sources?.length) {
      const hs = STATE.data.sources.filter(s => s.header);
      sourceEl.innerHTML = hs.length
        ? `<strong>${isEn ? "Sources" : "출처"}</strong> ${hs.map(s => `${escapeHTML(s.label)} <a href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.name)}</a> (${escapeHTML(s.as_of)})`).join(" · ")}`
        : (isEn ? "Sources and dates not specified" : "출처·기준일 미기재");
    } else {
      sourceEl.innerHTML = "";
    }
  }

  if (!STATE.data) {
    container.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--muted);font-size:15px;">${isEn ? "Couldn&#39;t load the share and benchmark data." : "점유율·성능 데이터를 불러오지 못했습니다."}</div>`;
    return;
  }

  const shares = STATE.data.market_shares || [];
  const models = STATE.data.model_benchmarks || [];

  const f1 = v => v == null ? "—" : Number(v).toFixed(1);
  const f2 = v => v == null ? "—" : Number(v).toFixed(2);
  const fInt = v => v == null ? "—" : Number(v).toLocaleString("en-US");
  const fCtx = s => {
    const n = parseInt(String(s ?? "").replace(/\D/g, ""), 10);
    if (!n) return "—";
    return n >= 1000 ? `${+(n / 1000).toFixed(1)}M` : `${n}K`;
  };
  const chg = v => {
    if (v == null) return `<span class="bm-chg flat">—</span>`;
    const cls = v > 0 ? "up" : v < 0 ? "down" : "flat";
    const arrow = v > 0 ? "▲" : v < 0 ? "▼" : "–";
    const word = v > 0 ? (isEn ? "increase" : "상승") : v < 0 ? (isEn ? "decrease" : "하락") : (isEn ? "no change" : "변화 없음");
    return `<span class="bm-chg ${cls}" aria-label="${isEn ? `vs last month ${word} ${Math.abs(v).toFixed(1)}%p` : `전월 대비 ${word} ${Math.abs(v).toFixed(1)}%p`}">${arrow} ${Math.abs(v).toFixed(1)}p</span>`;
  };
  const blended = m => (3 * m.pricing_in_1m + m.pricing_out_1m) / 4;

  const METRICS = [
    { id: "coding", key: "arena_coding_elo", label: isEn ? "Coding" : "코딩", sub: isEn ? "Arena Coding · pts" : "Arena Coding · 점", fmt: fInt },
    { id: "arena", key: "arena_elo", label: isEn ? "Arena" : "선호도", sub: isEn ? "Arena · pts" : "Arena · 점", fmt: fInt },
    { id: "gpqa", key: "gpqa_diamond", label: isEn ? "Science" : "과학 추론", sub: "GPQA · %", fmt: f1 },
    { id: "mmlu", key: "mmlu_pro", label: isEn ? "Knowledge" : "지식", sub: "MMLU-Pro · %", fmt: f1 },
  ];

  // 1. 요약 칩
  const isShareTab = STATE.benchmarkTab !== "bench";
  const top = (arr, f, asc) => arr.filter(x => f(x) != null).sort((a, b) => asc ? f(a) - f(b) : f(b) - f(a))[0];
  const sTop = top(shares, x => x.share_pct);
  const codingTop = top(models, x => x.arena_coding_elo);
  const arenaTop = top(models, x => x.arena_elo);
  const codingVals = models.map(m => m.arena_coding_elo).filter(v => v != null).sort((a, b) => a - b);
  const median = codingVals.length ? codingVals[Math.floor(codingVals.length / 2)] : null;
  const cheapTop = median == null ? undefined : top(models.filter(m => m.arena_coding_elo != null && m.arena_coding_elo >= median), blended, true);
  const nm = x => x?.model ?? "—";

  const chip = (go, sort, label, name, num, extra = "") => {
    const isActive = (go === "share" && isShareTab) || (go === "bench" && !isShareTab && STATE.benchmarkSort === sort);
    return `
    <button type="button" class="bm-chip ${isActive ? "is-active" : ""}" data-go="${go}" ${sort ? `data-sort="${sort}"` : ""} data-focus-key="chip-${go}-${sort}" aria-pressed="${isActive}" title="${isEn ? `View ${label}` : `${label} 바로가기`}">
      <span class="bm-chip-top">
        <span class="bm-chip-label">
          <span class="bm-chip-dot" aria-hidden="true"></span>
          ${label}
          <span class="bm-chip-arrow" aria-hidden="true">↗</span>
        </span>
        ${extra}
      </span>
      <span class="bm-chip-bottom">
        <span class="bm-chip-main" title="${escapeHTML(name)}">${escapeHTML(name)}</span>
        <span class="bm-chip-num">${num}</span>
      </span>
    </button>`;
  };

  const summaryHTML = `
    <div class="bm-summary" id="bm-summary">
      ${chip("share", "", isEn ? "Top referrals" : "리퍼럴 1위", sTop ? sTop.name : "—", sTop ? `${f2(sTop.share_pct)}%` : "—", sTop && sTop.mom_change != null ? chg(sTop.mom_change) : "")}
      ${chip("bench", "coding", isEn ? "Top coding score" : "코딩 최고점", nm(codingTop), codingTop ? `${fInt(codingTop.arena_coding_elo)}${isEn ? " pts" : "점"}` : "—")}
      ${chip("bench", "arena", isEn ? "Top Arena score" : "선호도 최고점", nm(arenaTop), arenaTop ? `${fInt(arenaTop.arena_elo)}${isEn ? " pts" : "점"}` : "—")}
      ${chip("bench", "price", isEn ? "Best value" : "가성비 1위", nm(cheapTop), cheapTop ? `$${f2(cheapTop.pricing_in_1m)} / $${f2(cheapTop.pricing_out_1m)}` : "—", `<span class="bm-chip-hint">${isEn ? "Cheapest in the top half for coding" : "코딩 상위 절반 중 최저가"}</span>`)}
    </div>`;

  // 2. 툴바 (탭 + 정렬)
  const hasCoding = models.some(m => m.arena_coding_elo != null);
  const hasArena = models.some(m => m.arena_elo != null);

  const toolbarHTML = `
    <div class="bm-toolbar">
      <div class="bm-seg" id="bm-tabs" role="tablist" aria-label="${isEn ? "Select view" : "보기 선택"}">
        <button type="button" role="tab" id="tab-share" data-tab="share" aria-controls="bm-share" data-focus-key="tab-share" aria-selected="${isShareTab}" tabindex="${isShareTab ? 0 : -1}">${isEn ? "Share" : "점유율"}</button>
        <button type="button" role="tab" id="tab-bench" data-tab="bench" aria-controls="bm-bench" data-focus-key="tab-bench" aria-selected="${!isShareTab}" tabindex="${!isShareTab ? 0 : -1}">${isEn ? "Performance" : "성능"}</button>
      </div>
      <div class="bm-sort" id="bm-sort" ${isShareTab ? "hidden" : ""}>
        <span>${isEn ? "Sort by" : "정렬 기준"}</span>
        <div class="bm-seg" role="group" aria-label="${isEn ? "Sort by" : "정렬 기준"}">
          <button type="button" data-sort="coding" data-focus-key="sort-coding" ${hasCoding ? "" : "hidden"} aria-pressed="${STATE.benchmarkSort === "coding"}">${isEn ? "Coding" : "코딩"}</button>
          <button type="button" data-sort="arena" data-focus-key="sort-arena" ${hasArena ? "" : "hidden"} aria-pressed="${STATE.benchmarkSort === "arena"}">${isEn ? "Arena" : "선호도"}</button>
          <button type="button" data-sort="price" data-focus-key="sort-price" aria-pressed="${STATE.benchmarkSort === "price"}">${isEn ? "Lowest price" : "가격 낮은 순"}</button>
        </div>
      </div>
    </div>`;

  // 3. 점유율 패널
  const sortedShares = [...shares].sort((a, b) => b.share_pct - a.share_pct);
  const maxShare = sortedShares[0]?.share_pct || 1;
  const mainShares = sortedShares.slice(0, 5);
  const restShares = sortedShares.slice(5);
  const restSum = restShares.reduce((n, s) => n + s.share_pct, 0);

  const shareRow = (s, rank) => `
    <li class="bm-srow" title="${escapeHTML(s.description || "")}">
      <span class="bm-rank">${rank}</span>
      <span class="bm-name"><a href="https://${escapeHTML(s.domain)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.name)}</a><small>${escapeHTML(s.provider)}</small></span>
      <span class="bm-bar" aria-hidden="true"><i style="width:${(s.share_pct / maxShare * 100).toFixed(1)}%;background:${escapeHTML(s.color)}"></i></span>
      <span class="bm-val">${f2(s.share_pct)}%</span>
      ${chg(s.mom_change)}
    </li>`;

  let srowsHTML = mainShares.map((s, i) => shareRow(s, i + 1)).join("");
  if (restShares.length) {
    srowsHTML += `
    <li class="bm-srow">
      <span class="bm-rank"></span>
      <span class="bm-name"><button type="button" class="bm-link-btn" id="bm-others-btn" aria-expanded="${STATE.benchmarkOthersOpen}" data-focus-key="others">${isEn ? `${restShares.length} others ${STATE.benchmarkOthersOpen ? "Hide ▴" : "▾"}` : `기타 ${restShares.length}개 ${STATE.benchmarkOthersOpen ? "접기 ▴" : "펼치기 ▾"}`}</button><small>${restShares.map(s => escapeHTML(s.name)).join(" · ")}</small></span>
      <span class="bm-bar" aria-hidden="true"><i style="width:${(restSum / maxShare * 100).toFixed(1)}%;background:var(--soft)"></i></span>
      <span class="bm-val">${f2(restSum)}%</span>
      <span class="bm-chg flat"></span>
    </li>`;
    if (STATE.benchmarkOthersOpen) {
      srowsHTML += restShares.map((s, i) => shareRow(s, mainShares.length + i + 1)).join("");
    }
  }

  const sharePanelHTML = `
    <section id="bm-share" role="tabpanel" aria-labelledby="tab-share" ${!isShareTab ? "hidden" : ""}>
      <div class="bm-card">
        <div class="bm-card-head">
          <div>
            <strong>${isEn ? "AI chatbot referral share" : "AI 챗봇 리퍼럴 점유율"}</strong>
            <span class="bm-card-sub">${isEn ? "Share of visits AI chatbots send to other websites · not user counts · Statcounter, monthly" : "AI 챗봇이 다른 웹사이트로 보낸 방문 비율 · 사용자 수가 아님 · Statcounter 월간"}</span>
          </div>
          <span>${isEn ? "▲▼ vs last month (%p)" : "▲▼ 전월 대비 %p"}</span>
        </div>
        <ol class="bm-srows" id="bm-share-rows">${srowsHTML}</ol>
      </div>
    </section>`;

  // 4. 성능 패널
  const visible = METRICS.filter(x => models.some(m => m[x.key] != null));
  if (STATE.benchmarkSort !== "price" && !visible.some(x => x.id === STATE.benchmarkSort)) {
    STATE.benchmarkSort = visible[0]?.id ?? "price";
  }

  const sortedMs = [...models];
  if (STATE.benchmarkSort === "price") {
    sortedMs.sort((a, b) => blended(a) - blended(b));
  } else {
    const sm = METRICS.find(x => x.id === STATE.benchmarkSort);
    if (sm) {
      sortedMs.sort((a, b) => (b[sm.key] ?? -Infinity) - (a[sm.key] ?? -Infinity));
    }
  }

  const best = Object.fromEntries(METRICS.map(m => [m.id, Math.max(...models.map(x => x[m.key] ?? -Infinity))]));
  const minPrice = Math.min(...models.map(blended));
  const sortMetric = METRICS.find(x => x.id === STATE.benchmarkSort);
  const vals = sortMetric ? models.map(x => x[sortMetric.key]).filter(v => v != null) : [];
  const [lo, hi] = [Math.min(...vals), Math.max(...vals)];
  const mini = v => {
    const p = hi === lo ? 100 : 15 + 85 * (v - lo) / (hi - lo);
    return `<span class="bm-mini" aria-hidden="true"><i style="width:${p.toFixed(0)}%"></i></span>`;
  };

  const th = (id, label, sub) => {
    const on = STATE.benchmarkSort === id;
    const asc = id === "price";
    return `<th class="num ${on ? "is-sorted" : ""}" aria-sort="${on ? (asc ? "ascending" : "descending") : "none"}">
      <button type="button" data-sort="${id}" data-focus-key="th-${id}">
        <span class="lbl">${label}${on ? ` <span class="arrow">${asc ? "▲" : "▼"}</span>` : ""}</span><small>${sub}</small>
      </button></th>`;
  };

  const head = `
    <tr>
      <th class="num">${isEn ? "Rank" : "순위"}</th>
      <th>${isEn ? "Model" : "모델"}</th>
      ${visible.map(m => th(m.id, m.label, m.sub)).join("")}
      ${th("price", isEn ? "Price" : "가격", isEn ? "OpenRouter · $/1M in·out" : "OpenRouter · $/1M 입력·출력")}
      <th class="num">${isEn ? "Context" : "컨텍스트"}</th>
    </tr>
    <tr><th class="bm-hint-row" colspan="${4 + visible.length}">${isEn ? "Higher scores and lower prices are better · Click a header to sort" : "점수는 높을수록, 가격은 낮을수록 좋음 · 열 제목을 누르면 정렬"}</th></tr>`;

  const body = sortedMs.map((m, i) => {
    const cells = visible.map(x => {
      const v = m[x.key];
      const on = STATE.benchmarkSort === x.id;
      return `<td class="num ${on ? "is-sorted" : ""}">${on && v != null ? mini(v) : ""}<span class="bm-v ${v === best[x.id] ? "is-best" : ""}">${x.fmt(v)}</span></td>`;
    }).join("");
    return `
    <tr>
      <td class="num"><span class="bm-rank">${i + 1}</span></td>
      <td><span class="bm-model"><b>${escapeHTML(m.model)}${m.badge_type === "open-weights" ? `<span class="bm-tag">${isEn ? "Open" : "오픈"}</span>` : ""}</b><small>${escapeHTML(m.provider)}</small></span></td>
      ${cells}
      <td class="num ${STATE.benchmarkSort === "price" ? "is-sorted" : ""}"><span class="bm-v ${blended(m) === minPrice ? "is-best" : ""}">${f2(m.pricing_in_1m)} / ${f2(m.pricing_out_1m)}</span></td>
      <td class="num">${fCtx(m.context_window)}</td>
    </tr>`;
  }).join("");

  const mlistHTML = sortedMs.map((m, i) => `
    <li class="bm-mrow">
      <span class="bm-rank">${i + 1}</span>
      <span class="bm-model"><b>${escapeHTML(m.model)}${m.badge_type === "open-weights" ? `<span class="bm-tag">${isEn ? "Open" : "오픈"}</span>` : ""}</b><small>${escapeHTML(m.provider)} · $${f2(m.pricing_in_1m)} / $${f2(m.pricing_out_1m)} · ${fCtx(m.context_window)}</small></span>
      <span class="bm-mval"><b>${sortMetric ? sortMetric.fmt(m[sortMetric.key]) : `$${f2(blended(m))}`}</b><small>${sortMetric ? sortMetric.label : (isEn ? "Blended" : "혼합 단가")}</small></span>
    </li>`).join("");

  const footNotes = [
    isEn ? "Arena scores are preference ratings from user votes; top ranks can shift within the margin of error." : "Arena 점수는 사용자 투표로 매긴 선호도라 상위권 순위는 오차 범위 안에서 바뀔 수 있다.",
    isEn ? "Prices are OpenRouter listings and may differ from official vendor prices." : "가격은 OpenRouter 표시가이며 회사 공식가와 다를 수 있다."
  ];
  if (STATE.benchmarkSort === "price") {
    footNotes.push(isEn ? "Price sort uses a 3:1 input/output blend" : "가격 정렬은 입력 3 : 출력 1 가중 평균 기준");
  }
  const footNoteHTML = `<div class="bm-foot-note" id="bm-foot-note">${footNotes.join("<br />")}</div>`;

  const benchPanelHTML = `
    <section id="bm-bench" role="tabpanel" aria-labelledby="tab-bench" ${isShareTab ? "hidden" : ""}>
      <div class="bm-card">
        <div class="bm-card-head">
          <div>
            <strong>${isEn ? `Top model per company (${models.length})` : `회사별 대표 모델 ${models.length}개`}</strong>
            <span class="bm-card-sub">${isEn ? "One highest-ranked model per company on Arena · other models from the same company are excluded" : "Arena 순위에서 회사마다 가장 높은 모델 1개 · 같은 회사의 다른 모델은 제외"}</span>
          </div>
        </div>
        <div class="bm-table-wrap"><table class="bm-table" id="bm-bench-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>
        <ol class="bm-mlist" id="bm-mlist">${mlistHTML}</ol>
        ${footNoteHTML}
      </div>
    </section>`;

  container.innerHTML = summaryHTML + toolbarHTML + sharePanelHTML + benchPanelHTML;
}

// 이벤트 핸들러 바인딩 (위임)
document.getElementById("benchmarks-container")?.addEventListener("click", (e) => {
  const t = e.target.closest("[data-go],[data-tab],[data-sort],#bm-others-btn");
  if (!t) return;

  if (t.id === "bm-others-btn") {
    STATE.benchmarkOthersOpen = !STATE.benchmarkOthersOpen;
    renderBenchmarks();
    refocus("others");
    return;
  }

  if (t.dataset.go) {
    STATE.benchmarkTab = t.dataset.go;
    if (t.dataset.sort) STATE.benchmarkSort = t.dataset.sort;
    renderBenchmarks();
    refocus(t.dataset.focusKey);
    document.getElementById("bm-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (t.dataset.tab) {
    STATE.benchmarkTab = t.dataset.tab;
    renderBenchmarks();
    refocus(t.dataset.focusKey);
    return;
  }

  if (t.dataset.sort) {
    STATE.benchmarkSort = t.dataset.sort;
    renderBenchmarks();
    refocus(t.dataset.focusKey);
    return;
  }
});

// 키보드 ←→ 키로 탭 전환
document.getElementById("benchmarks-container")?.addEventListener("keydown", (e) => {
  const tabs = e.target.closest("#bm-tabs");
  if (!tabs) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  STATE.benchmarkTab = STATE.benchmarkTab === "share" ? "bench" : "share";
  renderBenchmarks();
  refocus(`tab-${STATE.benchmarkTab}`);
});



