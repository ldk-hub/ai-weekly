import { STATE, syncURLFromState } from "../state.js";
import { isSuspiciousVelocity } from "../utils/velocity.js";
import { escapeHTML, sizedAvatarUrl, formatRepoId, openModalWithContent } from "../shared/dom.js";

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
      sparklineData,
      recentEntries
    });
  }
  
  // Sort by velocity desc, then currentStars desc
  processed.sort((a, b) => b.velocity - a.velocity || b.currentStars - a.currentStars);
  
  STATE.data.allProcessed = processed;
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
  syncURLFromState();
  const el = document.getElementById("starboard-container");
  if (!el) return;

  const baseList = STATE.data[STATE.tab] || [];

  // 컨트롤 상태 동기화
  const actSel = document.getElementById("starboard-activity-select");
  if (actSel && actSel.value !== STATE.starboardActivity) actSel.value = STATE.starboardActivity;
  const sortSel = document.getElementById("starboard-sort-select");
  if (sortSel && sortSel.value !== STATE.starboardSort) sortSel.value = STATE.starboardSort;

  let list = baseList
    .filter(it => STATE.starboardActivity === "all" || it.activity === STATE.starboardActivity)
    .filter(matchesStarboard);

  if (STATE.starboardSort === "stars") {
    list = [...list].sort((a, b) => b.currentStars - a.currentStars || b.velocity - a.velocity);
  } else {
    list = [...list].sort((a, b) => b.velocity - a.velocity || b.currentStars - a.currentStars);
  }
  
  // Update counts
  const tabs = ['heavy', 'middle', 'light'];
  for (const tab of tabs) {
    const btn = document.getElementById(tab + "-count");
    if (btn) btn.textContent = (STATE.data[tab] || []).length;
  }
  
  const hasActiveFilters = !!STATE.query || STATE.starboardActivity !== "all";
  if (list.length === 0) {
    const emptyMsg = STATE.loadError
      ? `데이터를 불러오지 못했습니다 (${escapeHTML(STATE.loadError)}). 잠시 후 새로고침해 주세요.`
      : (hasActiveFilters
        ? "검색어나 필터 조건과 일치하는 리포지토리가 없습니다."
        : "이 리그에는 아직 등록된 리포지토리가 없습니다.");
    el.innerHTML = `
      <div style="text-align:center;padding:60px 0;color:var(--muted);font-size:16px;">
        ${emptyMsg}
        ${hasActiveFilters ? `<div style="margin-top:14px;"><button type="button" id="clear-starboard-filters-btn" class="expand-toggle-btn" style="margin:0 auto;">필터 초기화</button></div>` : ""}
      </div>
    `;
    return;
  }
  
  const gridClass = STATE.viewMode === 'list' ? 'grid list-view' : 'grid';
  const gridStyle = STATE.viewMode === 'list' 
    ? 'display:flex;flex-direction:column;gap:10px;' 
    : 'display:grid;grid-template-columns:repeat(auto-fill,minmax(min(320px,100%),1fr));gap:24px;';

  const legendText = "활발 (최근 7일 이내) · 둔화 (8~90일) · 방치 (90일 초과)";
    
  let html = "";
  if (hasActiveFilters) {
    html += `
      <div class="feed-actions-bar" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div class="feed-results-count">
          필터 결과 <strong>${list.length}</strong>개 리포지토리
          <button type="button" id="clear-starboard-filters-btn" style="background:none; border:none; color:var(--accent-text); cursor:pointer; font-size:12px; margin-left:8px; text-decoration:underline; font-weight:600;">필터 초기화</button>
        </div>
      </div>
    `;
  }

  const limit = STATE.sbLimit || 50;
  const visibleList = list.slice(0, limit);
  const remaining = list.length - visibleList.length;

  html += `<div class="${gridClass}" style="${gridStyle}">`;
  html += visibleList.map((item, idx) => starboardCardHTML(item, idx, legendText)).join("");
  html += `</div>`;

  if (remaining > 0) {
    html += `
      <div style="text-align:center; margin-top:24px;">
        <button type="button" class="expand-toggle-btn" id="sb-more" style="margin:0 auto;">더 보기 (남은 ${remaining}개)</button>
      </div>
    `;
  }

  el.innerHTML = html;
}

function openStarboardModal(id) {
  const all = STATE.data?.allProcessed || [];
  const item = all.find(x => x.id === id);
  if (!item) return;
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  if (!modal || !body) return;

  const ownerName = item.id.split("/")[0];
  const avatar = item.meta?.owner_avatar || `https://github.com/${ownerName}.png?size=80`;
  const sign = item.velocity > 0 ? "+" : "";
  const velocityColor = item.velocity > 0 ? "var(--mint)" : (item.velocity < 0 ? "var(--coral)" : "var(--muted)");
  const isSuspicious = isSuspiciousVelocity({ stars: item.currentStars, velocity_7d: item.velocity, v7d_estimated: item.v7d_estimated });
  const modalVelocityCls = item.velocity > 0 ? (isSuspicious ? "velocity-badge is-anomaly" : "velocity-badge") : (item.velocity < 0 ? "velocity-badge is-negative" : "velocity-badge is-neutral");
  const modalVelocityTitle = item.velocity > 0 && isSuspicious ? "추정치·검증 필요" : "주간 스타 증감";
  const entries = (item.recentEntries || []).slice().reverse();

  const width = 520;
  const height = 110;
  const max = Math.max(...item.sparklineData);
  const min = Math.min(...item.sparklineData);
  const range = max - min || 1;
  const step = width / Math.max(1, item.sparklineData.length - 1);
  const points = item.sparklineData.map((val, i) => {
    const x = i * step;
    const y = height - ((val - min) / range) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const chartHtml = item.sparklineData.length >= 2
    ? `<div class="m-section">
         <div class="m-label">최근 스타 추이 그래프 (${entries[entries.length - 1]?.date || ""} → ${entries[0]?.date || ""})</div>
         <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-box, 10px); padding:16px 14px 10px;">
           <svg width="100%" height="${height}" viewBox="-4 -10 ${width + 8} ${height + 20}" preserveAspectRatio="none">
             <polyline fill="none" stroke="${velocityColor}" stroke-width="3.5" points="${points}" stroke-linecap="round" stroke-linejoin="round"/>
           </svg>
           <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--muted); margin-top:6px;">
             <span>Min: ★ ${min.toLocaleString()}</span>
             <span>Max: ★ ${max.toLocaleString()}</span>
           </div>
         </div>
       </div>`
    : "";

  const rowsHtml = entries.slice(0, 10).map((e, idx) => {
    const prev = entries[idx + 1];
    const diff = prev ? e.stars - prev.stars : null;
    const diffStr = diff != null ? (diff > 0 ? `+${diff.toLocaleString()}` : `${diff.toLocaleString()}`) : "—";
    return `<tr>
      <td>${escapeHTML(e.date)}</td>
      <td style="text-align:right; font-weight:600;">★ ${Number(e.stars).toLocaleString()}</td>
      <td style="text-align:right; color:${diff > 0 ? 'var(--mint)' : (diff < 0 ? 'var(--coral)' : 'var(--muted)')};">${diffStr}</td>
    </tr>`;
  }).join("");

  const topics = (item.meta?.topics || []).slice(0, 8).map(t =>
    `<button type="button" class="m-tag clickable-tag" data-tag-filter="${escapeHTML(t)}">#${escapeHTML(t)}</button>`
  ).join("");

  const content = `
    <div class="m-rank">
      <span class="accent">STARBOARD</span>
      <span class="dot-sep">·</span>
      <span>${escapeHTML(item.meta?.language || "Repository")}</span>
    </div>
    <div class="m-head">
      <img class="m-avatar" src="${escapeHTML(sizedAvatarUrl(avatar, 80))}" alt="" width="44" height="44" data-avatar-fallback="svg"/>
      <div class="m-meta">
        <div class="m-category">${escapeHTML(item.activity.toUpperCase())}</div>
        <div class="m-repo">${formatRepoId(item.id)}</div>
      </div>
      <div class="m-stars">★ ${item.currentStars.toLocaleString()}</div>
      <span class="${modalVelocityCls}" title="${modalVelocityTitle}">${sign}${item.velocity.toLocaleString()}/wk</span>
    </div>
    <h2 id="modal-title" class="modal-title">${escapeHTML(item.meta?.desc_ko || item.meta?.description || item.id)}</h2>
    ${item.meta?.desc_ko && item.meta?.description ? `<p class="m-summary">${escapeHTML(item.meta.description)}</p>` : ""}
    ${chartHtml}
    <div class="m-section">
      <div class="m-label">관측 원장 기록 (최근 10회)</div>
      <table class="sb-history-table">
        <thead>
          <tr>
            <th>관측일</th>
            <th style="text-align:right;">누적 스타</th>
            <th style="text-align:right;">직전 대비</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    ${topics ? `<div class="m-tags">${topics}</div>` : ""}
    <div class="m-cta-row">
      <a class="m-cta" href="https://github.com/${escapeHTML(item.id)}" target="_blank" rel="noopener">
        GitHub 저장소 열기 →
      </a>
    </div>
  `;
  openModalWithContent(content);
}

document.getElementById("starboard-container")?.addEventListener("click", (e) => {
  const moreBtn = e.target.closest("#sb-more");
  if (moreBtn) {
    moreBtn.disabled = true;
    moreBtn.innerText = "불러오는 중...";
    setTimeout(() => {
      STATE.sbLimit = (STATE.sbLimit || 50) + 50;
      renderStarboard();
    }, 60);
    return;
  }
  const clearBtn = e.target.closest("#clear-starboard-filters-btn");
  if (clearBtn) {
    STATE.query = "";
    STATE.starboardActivity = "all";
    STATE.sbLimit = 50;
    const s = document.getElementById("search");
    if (s) s.value = "";
    renderStarboard();
    return;
  }

  if (e.target.closest("a")) return;
  if (window.getSelection && window.getSelection().toString().trim().length > 0) return;

  const card = e.target.closest("[data-sb-open]");
  if (card) {
    openStarboardModal(card.dataset.sbOpen);
  }
});

function starboardCardHTML(item, idx, legendText) {
  const rank = idx + 1;
  const safeId = escapeHTML(item.id);
  const badgeClass = {
    "active": "sb-badge-active",
    "slowing": "sb-badge-slowing",
    "dormant": "sb-badge-dormant"
  }[item.activity];
  
  const badgeLabel = {
    "active": "활발",
    "slowing": "둔화",
    "dormant": "방치"
  }[item.activity];

  const badgeTitle = legendText || "활발 (최근 7일 이내) · 둔화 (8~90일) · 방치 (90일 초과)";
  
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
    : `<div class="sb-nochart" aria-hidden="true" style="margin-top:auto; padding-top:12px;">관측 ${item.sparklineData.length}회 · 추이 그래프는 3회부터</div>`;
  
  const avatar = sizedAvatarUrl((item.meta && item.meta.owner_avatar) ? item.meta.owner_avatar : `https://github.com/${ownerName}.png?size=72`, 72);
  const descKo = (item.meta && item.meta.desc_ko) ? item.meta.desc_ko : "";
  const descEn = (item.meta && item.meta.description) ? item.meta.description : "";
  const langTag = (item.meta && item.meta.language) ? `<span class="sb-tech-badge">${escapeHTML(item.meta.language)}</span>` : "";

  // 성장률 배지 통일 (양수 var(--mint), 추정치/이상치 .is-anomaly 점선 테두리, 음수 var(--coral), 0 중립)
  const isSuspicious = isSuspiciousVelocity({ stars: item.currentStars, velocity_7d: item.velocity, v7d_estimated: item.v7d_estimated });
  let velocityBadge;
  if (item.velocity > 0) {
    velocityBadge = isSuspicious
      ? `<span class="velocity-badge is-anomaly sb-velocity" title="추정치·검증 필요" aria-label="추정치·검증 필요">${sign}${item.velocity.toLocaleString()}/wk</span>`
      : `<span class="velocity-badge sb-velocity" title="주간 스타 증가량">${sign}${item.velocity.toLocaleString()}/wk</span>`;
  } else if (item.velocity < 0) {
    velocityBadge = `<span class="velocity-badge is-negative sb-velocity">${item.velocity.toLocaleString()}/wk</span>`;
  } else {
    velocityBadge = `<span class="velocity-badge is-neutral sb-velocity">0/wk</span>`;
  }

  const descHtml = descKo
    ? `<div class="sb-desc-ko" title="${escapeHTML(descEn)}">${escapeHTML(descKo)}</div>`
    : (descEn ? `<div class="sb-desc-en" title="${escapeHTML(descEn)}" style="font-size:13px; color:var(--muted); line-height:1.45; margin:8px 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${escapeHTML(descEn)}</div>` : "");

  return `
    <article class="card star-card" data-sb-open="${safeId}" style="padding: 22px 20px 0; overflow:hidden; display:flex; flex-direction:column; cursor:pointer;">
      ${rankPill}
      <div class="card-head" style="margin-bottom:10px;">
        <img class="avatar" src="${escapeHTML(avatar)}" alt="" width="36" height="36" loading="lazy" data-avatar-fallback="svg"/>
        <div class="head-meta">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
            <span class="repo-id" style="font-size: 13px;">${escapeHTML(ownerName)} /</span>
            ${langTag}
          </div>
          <h3 class="card-title" style="margin:2px 0 0; font-size: 18px; word-break:break-all; line-height:1.3;" title="${escapeHTML(item.id)}"><button type="button" class="card-title-btn" data-sb-open="${safeId}">${escapeHTML(repoName)}</button></h3>
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
      
      <div class="sb-foot-row" style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:6px;">
        <span style="font-size:12px; color:var(--muted);">클릭하여 관측 추이 상세 보기</span>
        <a class="repo-link" href="https://github.com/${safeId}" target="_blank" rel="noopener" style="margin:0; font-size:13px; font-weight:600;">
          GITHUB <span class="arrow">→</span>
        </a>
      </div>
      
      ${svg}
    </article>
  `;
}


export { processStarboardData, renderStarboard, openStarboardModal };
