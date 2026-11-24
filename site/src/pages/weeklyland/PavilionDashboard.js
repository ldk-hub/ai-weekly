/**
 * WeeklyLand AI Archive Pavilion Dashboard
 * Renders AI Weekly's 4 live data feeds (Plugins, News, Social, Benchmarks)
 * inside a clean glassmorphic overlay with search, filter tabs, KPI strip & detail pane.
 */

const ROOM_META = {
  plugins: { badge: "PLUGIN FORGE", title: "인기 플러그인 공방", pageHref: "./", pageLabel: "인기 플러그인" },
  news: { badge: "AI NEWS IMAX", title: "AI 뉴스 아이맥스 극장", pageHref: "news", pageLabel: "AI 뉴스" },
  social: { badge: "SOCIAL GARDEN", title: "소셜 피드 가든 라운지", pageHref: "social", pageLabel: "소셜 피드" },
  benchmarks: { badge: "OBSERVATORY", title: "벤치마크 천문 관측소", pageHref: "benchmarks", pageLabel: "점유율·성능" },
};

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function safeHref(url) {
  const s = String(url || "").trim();
  return /^https?:\/\//i.test(s) ? s : "#";
}

function formatCompact(n) {
  const num = Number(n || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export class PavilionDashboard {
  constructor(pavilionEngine) {
    this.pavilionEngine = pavilionEngine;
    this.activeKey = "plugins";
    this.activeFilter = "all";
    this.searchQuery = "";
    this.selectedIdx = 0;
    this.panelEl = document.getElementById("sanctuary-reader");
    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById("btn-close-reader")?.addEventListener("click", () => this.close());
    document.getElementById("btn-minimize-reader")?.addEventListener("click", () => this.close());
    document.getElementById("reader-search-input")?.addEventListener("input", (ev) => {
      this.searchQuery = String(ev.target.value || "").trim().toLowerCase();
      this.selectedIdx = 0;
      this.render();
    });
  }

  open(archiveKey) {
    if (!ROOM_META[archiveKey]) return;
    this.activeKey = archiveKey;
    this.activeFilter = "all";
    this.searchQuery = "";
    this.selectedIdx = 0;
    const searchInput = document.getElementById("reader-search-input");
    if (searchInput) searchInput.value = "";
    if (this.panelEl) this.panelEl.hidden = false;
    this.render();
  }

  close() {
    if (this.panelEl) this.panelEl.hidden = true;
  }

  isOpen() {
    return Boolean(this.panelEl && !this.panelEl.hidden);
  }

  _buildViewModel(key) {
    const def = ROOM_META[key] || ROOM_META.plugins;
    const data = this.pavilionEngine.archiveData;

    if (key === "plugins") {
      const { updated, items } = data.plugins;
      const rising = items.filter((p) => p._tier === "rising").length;
      const top = items[0];
      return {
        ...def,
        sub: `data/latest.json · ${updated} · ${items.length}개 프로젝트`,
        kpis: [
          { label: "TRENDING #1", value: top?.name || "대기 중", sub: top ? `+${Number(top.velocity_7d || 0).toLocaleString()}★ (7d)` : "" },
          { label: "TRACKED REPOS", value: `${items.length}개`, sub: `급상승 ${rising} · 스테디 ${Math.max(0, items.length - rising)}` },
          { label: "UPDATED", value: updated, sub: "GitHub & 커뮤니티 스캔" },
        ],
        filters: [
          { id: "all", label: `전체 (${items.length})` },
          { id: "rising", label: `급상승 (${rising})` },
          { id: "classic", label: `스테디 (${Math.max(0, items.length - rising)})` },
        ],
        cards: items.map((p) => ({
          filterId: p._tier || "rising",
          badge: `${p.name} · ★ ${Number(p.stars || 0).toLocaleString()}`,
          metaRight: `+${Number(p.velocity_7d || 0).toLocaleString()}/7d`,
          title: p.title_ko || p.name,
          summary: p.catchphrase || p.summary_ko || "",
          body: `${p.summary_ko || p.catchphrase || ""}\n\n카테고리: ${p.category || "plugin"}`,
          linkUrl: safeHref(p.official_url || p.repo_url),
          linkLabel: "GitHub 저장소 열기",
          haystack: `${p.name} ${p.title_ko} ${p.summary_ko} ${p.category}`.toLowerCase(),
        })),
      };
    }

    if (key === "news") {
      const { updated, items } = data.news;
      const cats = [...new Set(items.map((n) => n.category_name).filter(Boolean))];
      return {
        ...def,
        sub: `data/news_latest.json · ${updated} · ${items.length}건 브리핑`,
        kpis: [
          { label: "DAILY BRIEFINGS", value: `${items.length}건`, sub: `${cats.length}개 토픽` },
          { label: "HIGH SIGNAL", value: `${items.filter((n) => Number(n.importance) >= 85).length}건`, sub: "중요도 85점 이상" },
          { label: "UPDATED", value: updated, sub: "8대 소스 자동 큐레이션" },
        ],
        filters: [
          { id: "all", label: `전체 (${items.length})` },
          ...cats.slice(0, 4).map((c) => ({ id: c, label: c })),
        ],
        cards: items.map((n) => ({
          filterId: n.category_name || "all",
          badge: n.category_name || "AI 뉴스",
          metaRight: `중요도 ${n.importance || "—"}`,
          title: n.title_ko || n.headline,
          summary: (n.summary_ko || "").replace(/\*\*/g, "").slice(0, 140),
          body: (n.body_ko || n.summary_ko || "").replace(/\*\*/g, ""),
          linkUrl: safeHref(n.url),
          linkLabel: "뉴스 원문 보기",
          haystack: `${n.title_ko} ${n.headline} ${n.summary_ko} ${n.category_name}`.toLowerCase(),
        })),
      };
    }

    if (key === "social") {
      const { updated, items } = data.social;
      const platforms = [...new Set(items.map((s) => String(s.platform || "").toUpperCase()).filter(Boolean))];
      return {
        ...def,
        sub: `data/social_latest.json · ${updated} · ${items.length}건 소셜 피드`,
        kpis: [
          { label: "CURATED POSTS", value: `${items.length}건`, sub: platforms.join(" · ") || "멀티 플랫폼" },
          { label: "TOP CREATOR", value: items[0]?.author || "—", sub: items[0]?.title_ko || "" },
          { label: "UPDATED", value: updated, sub: "X · Threads · Reddit" },
        ],
        filters: [
          { id: "all", label: `전체 (${items.length})` },
          ...platforms.slice(0, 4).map((p) => ({ id: p, label: p })),
        ],
        cards: items.map((s) => {
          const plat = String(s.platform || "").toUpperCase();
          return {
            filterId: plat || "all",
            badge: `${plat} · ${s.author}`,
            metaRight: `좋아요 ${formatCompact(s.metrics?.likes || 0)}`,
            title: s.title_ko || s.author,
            summary: s.summary_ko || "",
            body: `${s.summary_ko || ""}\n\n${s.text || ""}`.trim(),
            linkUrl: safeHref(s.url),
            linkLabel: "원본 포스트 열기",
            haystack: `${s.author} ${s.platform} ${s.title_ko} ${s.summary_ko}`.toLowerCase(),
          };
        }),
      };
    }

    const { updated, shares, models } = data.benchmarks;
    const cards = [
      ...models.map((m) => ({
        filterId: "models",
        badge: `${m.provider} · Coding ${m.coding_composite_score || "—"}점`,
        metaRight: `Arena ${m.arena_coding_elo || m.arena_elo || "—"} Elo`,
        title: m.model,
        summary: `컨텍스트 ${m.context_window || "—"} · 입력 $${m.pricing_in_1m ?? "—"} / 출력 $${m.pricing_out_1m ?? "—"}`,
        body: `코딩 종합 점수: ${m.coding_composite_score || "—"}점\nArena Elo: ${m.arena_coding_elo || m.arena_elo || "—"}\n컨텍스트: ${m.context_window || "—"}`,
        linkUrl: "benchmarks",
        linkLabel: "전체 벤치마크 보기",
        sameTab: true,
        haystack: `${m.model} ${m.provider}`.toLowerCase(),
      })),
      ...shares.map((s) => ({
        filterId: "shares",
        badge: `점유율 #${s.rank} · ${s.provider}`,
        metaRight: `${s.share_pct}%`,
        title: s.name,
        summary: s.description || "",
        body: `${s.description || ""}\n3사 평균 점유율: ${s.share_pct}%`,
        linkUrl: "benchmarks",
        linkLabel: "점유율 상세 보기",
        sameTab: true,
        haystack: `${s.name} ${s.provider}`.toLowerCase(),
      })),
    ];
    return {
      ...def,
      sub: `data/benchmarks_latest.json · ${updated} · 모델 ${models.length}종 · 점유율 ${shares.length}종`,
      kpis: [
        { label: "CODING ELO #1", value: models[0]?.model || "—", sub: `${models[0]?.arena_coding_elo || models[0]?.arena_elo || "—"} Elo` },
        { label: "MARKET LEADER", value: shares[0] ? `${shares[0].name} (${shares[0].share_pct}%)` : "—", sub: "글로벌 점유율 1위" },
        { label: "UPDATED", value: updated, sub: "멀티 소스 실측" },
      ],
      filters: [
        { id: "all", label: `전체 (${cards.length})` },
        { id: "models", label: `프론티어 모델 (${models.length})` },
        { id: "shares", label: `시장 점유율 (${shares.length})` },
      ],
      cards,
    };
  }

  render() {
    const vm = this._buildViewModel(this.activeKey);
    const setText = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    setText("reader-room-badge", vm.badge);
    setText("reader-title", vm.title);
    setText("reader-sub", vm.sub);

    const pageLink = document.getElementById("reader-page-link");
    if (pageLink) {
      pageLink.href = vm.pageHref;
      const sp = pageLink.querySelector("span");
      if (sp) sp.textContent = `${vm.pageLabel} 전체 보기`;
    }

    const kpiEl = document.getElementById("reader-kpi-strip");
    if (kpiEl) {
      kpiEl.innerHTML = vm.kpis
        .map(
          (k) => `<div class="sc-kpi-card"><span class="sc-kpi-label">${esc(k.label)}</span><strong class="sc-kpi-val">${esc(k.value)}</strong><span class="sc-kpi-sub">${esc(k.sub)}</span></div>`
        )
        .join("");
    }

    const filterEl = document.getElementById("reader-filter-tabs");
    if (filterEl) {
      filterEl.innerHTML = vm.filters
        .map(
          (f) => `<button type="button" class="sc-filter-chip ${f.id === this.activeFilter ? "is-active" : ""}" data-filter="${esc(f.id)}">${esc(f.label)}</button>`
        )
        .join("");
      filterEl.querySelectorAll("[data-filter]").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.activeFilter = btn.dataset.filter || "all";
          this.selectedIdx = 0;
          this.render();
        });
      });
    }

    const filtered = vm.cards.filter((c) => {
      const matchFilter = this.activeFilter === "all" || c.filterId === this.activeFilter;
      const matchQuery = !this.searchQuery || c.haystack.includes(this.searchQuery);
      return matchFilter && matchQuery;
    });

    const listEl = document.getElementById("reader-list");
    const detailEl = document.getElementById("reader-detail-pane");
    if (!listEl || !detailEl) return;

    if (!filtered.length) {
      listEl.innerHTML = `<p style="padding:16px;color:var(--wl-sem-ink-muted)">조건에 맞는 항목이 없습니다.</p>`;
      detailEl.innerHTML = "";
      return;
    }

    this.selectedIdx = Math.min(this.selectedIdx, filtered.length - 1);
    listEl.innerHTML = filtered
      .map(
        (c, idx) => `
      <button type="button" class="sc-dash-card ${idx === this.selectedIdx ? "is-selected" : ""}" data-card-idx="${idx}">
        <div class="sc-card-top"><span>${esc(c.badge)}</span><span>${esc(c.metaRight)}</span></div>
        <strong class="sc-card-title">${esc(c.title)}</strong>
        <p class="sc-card-summary">${esc(c.summary)}</p>
      </button>`
      )
      .join("");

    listEl.querySelectorAll("[data-card-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.selectedIdx = Number(btn.dataset.cardIdx || 0);
        this.render();
      });
    });

    const cur = filtered[this.selectedIdx];
    detailEl.innerHTML = `
      <div class="sc-detail-meta">${esc(cur.badge)} · ${esc(cur.metaRight)}</div>
      <h3 class="sc-detail-title">${esc(cur.title)}</h3>
      <p class="sc-detail-body">${esc(cur.body).replace(/\n/g, "<br/>")}</p>
      <a class="wl-hud-btn is-active" href="${esc(cur.linkUrl)}" ${cur.sameTab ? "" : 'target="_blank" rel="noopener"'}>${esc(cur.linkLabel)}</a>
    `;
  }
}
