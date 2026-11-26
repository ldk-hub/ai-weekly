import { STATE, syncURLFromState } from "../state.js";
import { escapeHTML, openModalWithContent } from "../shared/dom.js";

/* ==========================================================================
   AI 점유율 및 모델별 성능 지표 (Benchmarks) 렌더링 — 3대 공식 출처 평균 & 최신성 검증
   ========================================================================== */

function refocus(key) {
  if (key) document.querySelector(`[data-focus-key="${key}"]`)?.focus({ preventScroll: true });
}

const PROVIDER_COLORS = {
  "Google": "#4285f4",
  "Anthropic": "#d97757",
  "OpenAI": "#10a37f",
  "Meta": "#0668e1",
  "DeepSeek": "#4d6bfe",
  "Xiaomi": "#ff6900",
  "Moonshot": "#6366f1",
  "Alibaba": "#ff6a00",
  "Z.ai": "#3b82f6",
  "xAI": "#1d9bf0",
  "default": "#888888"
};

function getProviderColor(provider) {
  return PROVIDER_COLORS[provider] || PROVIDER_COLORS.default;
}

function openBenchmarkScopeModal() {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  if (!modal || !body) return;

  const content = `
    <div class="bm-scope-modal-body">
      <div class="m-rank">
        <span class="accent">데이터 수집 기준 및 한계 안내</span>
        <span class="dot-sep">·</span>
        <span>다중 출처 앙상블</span>
      </div>
      <h2 id="modal-title" class="modal-title" style="margin: 8px 0 12px;">AI 점유율 및 성능 지표 데이터 수집 기준과 한계</h2>
      <p>
        AI위클리는 특정 단일 출처의 왜곡을 방지하기 위해 B2C 웹 방문, 검색 리퍼럴, 개발자 오픈 API 소비량, 그리고 3대 블라인드 평가를 산술 평균(Ensemble)하여 제공합니다. 다만 모든 공개 데이터가 그렇듯 태생적인 수집 범위의 한계가 존재합니다.
      </p>

      <table class="bm-scope-table">
        <thead>
          <tr>
            <th>구분 · 출처</th>
            <th>핵심 강점 (포착 영역)</th>
            <th>수집 한계 (제외 영역)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Similarweb</strong> (Web)</td>
            <td>글로벌 B2C 데스크톱 및 모바일 웹 방문 트래픽</td>
            <td>iOS/Android 네이티브 앱 및 엔터프라이즈 전용 API 누락</td>
          </tr>
          <tr>
            <td><strong>Trakkr / Statcounter</strong> (Referral)</td>
            <td>AI 검색 엔진 및 챗봇 외부 유입 리퍼럴 추적 (GA4 세션 기반)</td>
            <td>실시간 AI 인용 클릭 및 주간 롤링 반영 (최신성 게이트: 21일)</td>
          </tr>
          <tr>
            <td><strong>OpenRouter</strong> (API)</td>
            <td>개발자 및 스타트업의 실제 프로덕션 API 토큰 소비량</td>
            <td>클라우드 직접 계약(Azure, Bedrock, Vertex) 미반영</td>
          </tr>
          <tr>
            <td><strong>LMArena · AA · LiveBench</strong></td>
            <td>블라인드 인간 선호도(Elo), 하드웨어 지연시간 실측, 무오염 동적 평가</td>
            <td>프롬프트 스타일 편향 존재; 동결된 SWE-bench 등 구형 출처 차단</td>
          </tr>
        </tbody>
      </table>

      <div class="bm-scope-note">
        <strong>수행 주기 및 최신성 검증 정책:</strong><br />
        • <strong>점유율 (하이브리드)</strong>: Similarweb(월간, 45일) + Trakkr AI 리퍼럴/OpenRouter(주간·일간, 21일) 앙상블 반영<br />• <strong>성능 벤치마크 (주간)</strong>: OpenRouter 실시간 가격과 3대 리더보드 순위를 <strong>매주 월요일</strong> 동기화 (최신성 게이트: 30일)<br />• <strong>상시 핫픽스</strong>: 주요 프론티어 플래그십 출시 당일 즉시 반영
      </div>
    </div>
  `;
  openModalWithContent(content);
}

function buildScatterSVG(models, domainFilter) {
  const width = 880;
  const height = 440;
  const padLeft = 66;
  const padRight = 34;
  const padTop = 38;
  const padBottom = 48;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const blended = m => (3 * (m.pricing_in_1m ?? 1) + (m.pricing_out_1m ?? 1)) / 4;

  let scoreKey = "composite_score";
  let scoreLabel = "3대 종합 지능 점수 (0–100)";
  if (domainFilter === "coding") {
    scoreKey = "coding_composite_score";
    scoreLabel = "3대 코딩 종합 점수 (0–100)";
  } else if (domainFilter === "reasoning") {
    scoreKey = "gpqa_diamond";
    scoreLabel = "GPQA Diamond 박사급 과학 추론 (%)";
  }

  let filtered = [...models];
  if (domainFilter === "open") {
    filtered = filtered.filter(m => m.badge_type === "open-weights");
  } else if (domainFilter === "coding" || domainFilter === "reasoning") {
    filtered = filtered.filter(m => m[scoreKey] != null);
  }
  if (!filtered.length) filtered = [...models];

  const prices = filtered.map(blended);
  const minP = Math.max(0.05, Math.min(...prices) * 0.72);
  const maxP = Math.max(10, Math.max(...prices) * 1.35);
  const logMinP = Math.log10(minP);
  const logMaxP = Math.log10(maxP);

  const getX = p => {
    const val = Math.max(minP, Math.min(maxP, p));
    const ratio = (Math.log10(val) - logMinP) / (logMaxP - logMinP);
    return padLeft + ratio * chartW;
  };

  const scores = filtered.map(m => m[scoreKey] ?? 85);
  const minS = Math.min(...scores) - 1.8;
  const maxS = Math.max(...scores) + 1.8;

  const getY = s => {
    const ratio = (s - minS) / (maxS - minS);
    return padTop + (1 - ratio) * chartH;
  };

  const sortedP = [...prices].sort((a, b) => a - b);
  const medianP = sortedP[Math.floor(sortedP.length / 2)] || 2.0;
  const sortedS = [...scores].sort((a, b) => a - b);
  const medianS = sortedS[Math.floor(sortedS.length / 2)] || 87.0;

  const midX = getX(medianP);
  const midY = getY(medianS);

  const quadLabels = `
    <line x1="${midX}" y1="${padTop}" x2="${midX}" y2="${height - padBottom}" class="bm-scatter-quad-line" />
    <line x1="${padLeft}" y1="${midY}" x2="${width - padRight}" y2="${midY}" class="bm-scatter-quad-line" />
    <text x="${padLeft + 12}" y="${padTop + 18}" class="bm-scatter-quadrant-label" style="fill:var(--mint);opacity:0.85;">가성비 챔피언 (고지능 · 저비용)</text>
    <text x="${width - padRight - 12}" y="${padTop + 18}" text-anchor="end" class="bm-scatter-quadrant-label" style="fill:var(--accent);opacity:0.85;">프론티어 리더 (최상위 플래그십)</text>
    <text x="${padLeft + 12}" y="${height - padBottom - 10}" class="bm-scatter-quadrant-label">초저비용 · 보편형 (양산/온프레미스)</text>
    <text x="${width - padRight - 12}" y="${height - padBottom - 10}" text-anchor="end" class="bm-scatter-quadrant-label">특수 목적 · 대용량 컨텍스트</text>
  `;

  const xTicks = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 20.0].filter(t => t >= minP && t <= maxP);
  const xGrid = xTicks.map(t => {
    const x = getX(t);
    return `
      <line x1="${x}" y1="${padTop}" x2="${x}" y2="${height - padBottom}" class="bm-scatter-grid-line" />
      <text x="${x}" y="${height - padBottom + 16}" text-anchor="middle" class="bm-scatter-axis-label">$${t < 1 ? t.toFixed(1) : t.toFixed(0)}</text>
    `;
  }).join("");

  const yTicks = [Math.ceil(minS), Math.round((minS + maxS) / 2), Math.floor(maxS)];
  const yGrid = yTicks.map(t => {
    const y = getY(t);
    return `
      <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" class="bm-scatter-grid-line" />
      <text x="${padLeft - 8}" y="${y + 4}" text-anchor="end" class="bm-scatter-axis-label">${t.toFixed(0)}</text>
    `;
  }).join("");

  const axisTitles = `
    <text x="${padLeft + chartW / 2}" y="${height - 8}" text-anchor="middle" class="bm-scatter-axis-label" style="font-weight:700;fill:var(--ink-2);">
      100만 토큰당 혼합 단가 (로그 스케일: $/1M)
    </text>
    <text x="16" y="${padTop + chartH / 2}" text-anchor="middle" transform="rotate(-90 16 ${padTop + chartH / 2})" class="bm-scatter-axis-label" style="font-weight:700;fill:var(--ink-2);">
      ${scoreLabel}
    </text>
  `;

  const pts = filtered.map((m, idx) => {
    const p = blended(m);
    const s = m[scoreKey] ?? 85;
    const shortName = m.model.replace(/\s*\(\d+\)$/, "").replace(/\s*(Argon|Sol|Wonder|Max|Pro|Flash).*/i, " $1");
    const subText = `${s.toFixed(1)}pt · $${p.toFixed(2)}`;
    const boxW = Math.ceil(Math.max(shortName.length * 6.6, subText.length * 5.6) + 10);
    const boxH = 26;
    return {
      m,
      p,
      s,
      cx: getX(p),
      cy: getY(s),
      color: getProviderColor(m.provider),
      shortName,
      subText,
      boxW,
      boxH,
      idx
    };
  });

  // 1) 동일하거나 매우 근접한 점(Dot)끼리 완전히 포개지지 않도록 미세 분산
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[j].cx - pts[i].cx;
        const dy = pts[j].cy - pts[i].cy;
        const dist = Math.hypot(dx, dy);
        if (dist < 11) {
          const angle = dist > 0.1 ? Math.atan2(dy, dx) : (j - i) * 1.1;
          const push = (11 - dist) * 0.55;
          pts[j].cx += Math.cos(angle) * push;
          pts[j].cy += Math.sin(angle) * push;
          pts[i].cx -= Math.cos(angle) * push;
          pts[i].cy -= Math.sin(angle) * push;
        }
      }
    }
  }

  // 2) 4분면 워터마크 및 타 모델 점·라벨과의 2D 바운딩 박스 충돌 회피 배치
  const obstacles = [
    { x1: padLeft + 8, y1: padTop + 4, x2: padLeft + 210, y2: padTop + 24 },
    { x1: width - padRight - 220, y1: padTop + 4, x2: width - padRight - 8, y2: padTop + 24 },
    { x1: padLeft + 8, y1: height - padBottom - 24, x2: padLeft + 230, y2: height - padBottom - 4 },
    { x1: width - padRight - 200, y1: height - padBottom - 24, x2: width - padRight - 8, y2: height - padBottom - 4 },
  ];

  const overlapArea = (a, b, pad = 3) => {
    const ox = Math.max(0, Math.min(a.x2 + pad, b.x2 + pad) - Math.max(a.x1 - pad, b.x1 - pad));
    const oy = Math.max(0, Math.min(a.y2 + pad, b.y2 + pad) - Math.max(a.y1 - pad, b.y1 - pad));
    return ox * oy;
  };

  const candidates = [
    { dx: 10, dy: -12, anchor: "start" },
    { dx: -10, dy: -12, anchor: "end" },
    { dx: 10, dy: -28, anchor: "start" },
    { dx: 10, dy: 6, anchor: "start" },
    { dx: -10, dy: -28, anchor: "end" },
    { dx: -10, dy: 6, anchor: "end" },
    { dx: 0, dy: -34, anchor: "middle" },
    { dx: 0, dy: 14, anchor: "middle" },
    { dx: 22, dy: -38, anchor: "start" },
    { dx: 22, dy: 16, anchor: "start" },
    { dx: -22, dy: -38, anchor: "end" },
    { dx: -22, dy: 16, anchor: "end" },
    { dx: 14, dy: -52, anchor: "start" },
    { dx: 14, dy: 30, anchor: "start" },
    { dx: -14, dy: -52, anchor: "end" },
    { dx: -14, dy: 30, anchor: "end" },
    { dx: 36, dy: -24, anchor: "start" },
    { dx: -36, dy: -24, anchor: "end" },
    { dx: 26, dy: -66, anchor: "start" },
    { dx: 26, dy: 44, anchor: "start" },
    { dx: -26, dy: -66, anchor: "end" },
    { dx: -26, dy: 44, anchor: "end" },
  ];

  const placed = [];
  for (const pt of pts) {
    let bestBox = null;
    let bestScore = Infinity;

    for (const c of candidates) {
      const x1 = c.anchor === "start"
        ? pt.cx + c.dx
        : c.anchor === "end"
        ? pt.cx + c.dx - pt.boxW
        : pt.cx + c.dx - pt.boxW / 2;
      const y1 = pt.cy + c.dy;
      const box = {
        x1,
        y1,
        x2: x1 + pt.boxW,
        y2: y1 + pt.boxH,
        anchor: c.anchor,
        tx: pt.cx + c.dx,
        ty: y1 + 11
      };

      let score = Math.hypot(c.dx, c.dy + 12) * 1.2;
      if (c.anchor === "end" && pt.cx < width - padRight - 150) score += 8;

      if (box.x1 < padLeft + 6 || box.x2 > width - padRight - 6 || box.y1 < padTop + 6 || box.y2 > height - padBottom - 6) {
        score += 50000;
      }
      for (const obs of obstacles) score += overlapArea(box, obs, 2) * 30;
      for (const other of pts) {
        const dotBox = { x1: other.cx - 8, y1: other.cy - 8, x2: other.cx + 8, y2: other.cy + 8 };
        score += overlapArea(box, dotBox, 2) * 80;
      }
      for (const pBox of placed) score += overlapArea(box, pBox, 3) * 100;

      if (score < bestScore) {
        bestScore = score;
        bestBox = box;
      }
    }

    pt.box = bestBox;
    placed.push(bestBox);
  }

  const dots = pts.map(pt => {
    const { m, p, s, cx, cy, color, shortName, subText, box } = pt;
    const lx = Math.max(box.x1, Math.min(box.x2, cx));
    const ly = Math.max(box.y1, Math.min(box.y2, cy));
    const dist = Math.hypot(lx - cx, ly - cy);
    let leaderHTML = "";
    if (dist > 13) {
      const ang = Math.atan2(ly - cy, lx - cx);
      const x1 = cx + Math.cos(ang) * 7.5;
      const y1 = cy + Math.sin(ang) * 7.5;
      leaderHTML = `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${lx.toFixed(1)}" y2="${ly.toFixed(1)}" stroke="${color}" class="bm-scatter-leader" />`;
    }

    return `
      <g class="bm-scatter-point-group" tabindex="0" role="button" aria-label="${escapeHTML(m.model)}: Score ${s.toFixed(1)}, Price $${p.toFixed(2)}" data-bm-model="${escapeHTML(m.model)}">
        ${leaderHTML}
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6.5" fill="${color}" stroke="var(--card)" stroke-width="2" class="bm-scatter-dot" data-bm-model="${escapeHTML(m.model)}">
          <title>${escapeHTML(m.model)} (${escapeHTML(m.provider)})\nScore: ${s.toFixed(1)} / 100\nPrice: $${p.toFixed(2)}/1M tokens\nContext: ${escapeHTML(m.context_window || "")}</title>
        </circle>
        <text x="${box.tx.toFixed(1)}" y="${box.ty.toFixed(1)}" text-anchor="${box.anchor}" class="bm-scatter-label" data-bm-model="${escapeHTML(m.model)}">${escapeHTML(shortName)}</text>
        <text x="${box.tx.toFixed(1)}" y="${(box.ty + 11).toFixed(1)}" text-anchor="${box.anchor}" class="bm-scatter-sublabel" data-bm-model="${escapeHTML(m.model)}">${escapeHTML(subText)}</text>
      </g>
    `;
  }).join("");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="bm-scatter-svg" aria-label="성능 대 가격 2D 가성비 산점도 매트릭스">
      <rect x="${padLeft}" y="${padTop}" width="${chartW}" height="${chartH}" fill="color-mix(in srgb, var(--card) 60%, transparent)" rx="6" />
      ${quadLabels}
      ${xGrid}
      ${yGrid}
      ${axisTitles}
      ${dots}
    </svg>
  `;
}

function openBenchmarkModelModal(modelName) {
  const models = STATE.data?.model_benchmarks || [];
  const m = models.find(x => x.model === modelName);
  if (!m) return;
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  if (!modal || !body) return;

  const f1 = v => v == null ? "—" : Number(v).toFixed(1);
  const f2 = v => v == null ? "—" : Number(v).toFixed(2);
  const fInt = v => v == null ? "—" : Number(v).toLocaleString("en-US");
  const orUrl = m.openrouter_id ? `https://openrouter.ai/${escapeHTML(m.openrouter_id)}` : "https://openrouter.ai/rankings";

  const content = `
    <div class="m-rank">
      <span class="accent">3대 리더보드 교차 검증</span>
      <span class="dot-sep">·</span>
      <span>${escapeHTML(m.provider)}</span>
    </div>
    <div class="m-head">
      <div class="m-meta">
        <div class="m-category">${escapeHTML(m.release_date || "2026")} · ${escapeHTML(m.context_window || "")} Context</div>
        <div class="m-repo">${escapeHTML(m.openrouter_id || m.model)}</div>
      </div>
      <span class="m-score-pill" title="3대 리더보드 종합 평균">
        3대 종합 <strong>${f1(m.composite_score)}</strong><span class="m-score-max">/100</span>
      </span>
      <span class="m-score-pill" style="color:var(--mint);" title="3대 코딩 종합 평균">
        코딩 종합 <strong>${f1(m.coding_composite_score)}</strong><span class="m-score-max">/100</span>
      </span>
    </div>
    <h2 id="modal-title" class="modal-title">${escapeHTML(m.model)}</h2>
    <div class="m-section">
      <div class="m-label">3대 리더보드 원점수 및 세부 벤치마크</div>
      <table class="sb-history-table">
        <thead>
          <tr>
            <th>측정 출처 · 지표</th>
            <th style="text-align:right;">점수</th>
            <th style="text-align:right;">비고</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>LMArena</strong> Overall Elo</td>
            <td style="text-align:right; font-weight:700;">${fInt(m.arena_elo)} pts</td>
            <td style="text-align:right; color:var(--muted);">블라인드 인간 선호도</td>
          </tr>
          <tr>
            <td><strong>LMArena</strong> Coding Elo</td>
            <td style="text-align:right; font-weight:700;">${fInt(m.arena_coding_elo)} pts</td>
            <td style="text-align:right; color:var(--muted);">실전 코딩 블라인드 대전</td>
          </tr>
          <tr>
            <td><strong>Artificial Analysis</strong> Intelligence Index</td>
            <td style="text-align:right; font-weight:700;">${f1(m.aa_intelligence)} / 100</td>
            <td style="text-align:right; color:var(--muted);">8종 독립 평가 종합</td>
          </tr>
          <tr>
            <td><strong>Artificial Analysis</strong> Coding Index</td>
            <td style="text-align:right; font-weight:700;">${f1(m.aa_coding)} / 100</td>
            <td style="text-align:right; color:var(--muted);">코딩/에이전트 평가 지수</td>
          </tr>
          <tr>
            <td><strong>LiveBench</strong> Global Average</td>
            <td style="text-align:right; font-weight:700;">${f1(m.livebench_score)} / 100</td>
            <td style="text-align:right; color:var(--muted);">오염 방지 동적 벤치마크</td>
          </tr>
          <tr>
            <td><strong>LiveBench</strong> Coding</td>
            <td style="text-align:right; font-weight:700;">${f1(m.livebench_coding)} / 100</td>
            <td style="text-align:right; color:var(--muted);">동적 코딩 과제</td>
          </tr>
          <tr>
            <td><strong>GPQA Diamond</strong> / <strong>MMLU-Pro</strong></td>
            <td style="text-align:right; font-weight:700;">${f1(m.gpqa_diamond)}% / ${f1(m.mmlu_pro)}%</td>
            <td style="text-align:right; color:var(--muted);">박사급 과학 추론 · 종합 지식</td>
          </tr>
          <tr>
            <td><strong>OpenRouter API Price</strong> (1M tokens)</td>
            <td style="text-align:right; font-weight:700;">$${f2(m.pricing_in_1m)} in / $${f2(m.pricing_out_1m)} out</td>
            <td style="text-align:right; color:var(--muted);">${escapeHTML(m.context_window)} context</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="m-cta-row">
      <a class="m-cta-ghost" href="https://lmarena.ai/leaderboard" target="_blank" rel="noopener">LMArena ↗</a>
      <a class="m-cta-ghost" href="https://artificialanalysis.ai/leaderboards/models" target="_blank" rel="noopener">Artificial Analysis ↗</a>
      <a class="m-cta" href="${orUrl}" target="_blank" rel="noopener">
        OpenRouter에서 모델 보기 ↗
      </a>
    </div>
  `;
  openModalWithContent(content);
}

function renderBenchmarks() {
  syncURLFromState();
  const container = document.getElementById("benchmarks-container");
  if (!container) return;

  // 출처 한 줄 업데이트 (#bm-source) + 최신성 검증 통과 배지
  const sourceEl = document.getElementById("bm-source");
  if (sourceEl) {
    if (STATE.data?.sources?.length) {
      const hs = STATE.data.sources.filter(s => s.header);
      const freshBadge = `<span class="bm-freshness-badge" title="모든 출처 최신성 게이트(점유율 45일·벤치마크 30일 이내) 검증 완료">✓ 최신성 검증 통과</span>`;
      sourceEl.innerHTML = hs.length
        ? `<div class="bm-sources-wrap">
             ${freshBadge}
             ${hs.map(s => `<a class="bm-source-chip" href="${escapeHTML(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHTML(s.label)}</strong> ${escapeHTML(s.name)} <span class="bm-source-date">(${escapeHTML(s.as_of)})</span> ↗</a>`).join("")}
           </div>`
        : "출처·기준일 미기재";
    } else {
      sourceEl.innerHTML = "";
    }
  }

  if (!STATE.data) {
    const errorSuffix = STATE.loadError ? ` (${escapeHTML(STATE.loadError)})` : "";
    container.innerHTML = `<div style="text-align:center;padding:60px 0;color:var(--muted);font-size:15px;">데이터를 불러오지 못했습니다${errorSuffix}. 잠시 후 새로고침해 주세요.</div>`;
    return;
  }

  const shares = STATE.data.market_shares || [];
  const models = STATE.data.model_benchmarks || [];
  const domainFilter = STATE.benchmarkDomainFilter || "all";

  const f1 = v => v == null ? "—" : Number(v).toFixed(1);
  const f2 = v => v == null ? "—" : Number(v).toFixed(2);
  const fInt = v => v == null ? "—" : Number(v).toLocaleString("en-US");
  const fCtx = s => {
    const n = parseInt(String(s ?? "").replace(/\D/g, ""), 10);
    if (!n) return "—";
    return n >= 1000 ? `${+(n / 1000).toFixed(1)}M` : `${n}K`;
  };
  const chg = v => {
    if (v == null || Math.abs(v) < 0.001) return `<span class="bm-chg flat" aria-label="변화 없음">—</span>`;
    const cls = v > 0 ? "up" : "down";
    const arrow = v > 0 ? "▲" : "▼";
    const word = v > 0 ? "상승" : "하락";
    return `<span class="bm-chg ${cls}" aria-label="전월 대비 ${word} ${Math.abs(v).toFixed(1)}%p">${arrow} ${Math.abs(v).toFixed(1)}%p</span>`;
  };
  const blended = m => (3 * (m.pricing_in_1m ?? 1) + (m.pricing_out_1m ?? 1)) / 4;

  const METRICS = [
    { id: "composite", key: "composite_score", label: "3대 종합 평균", sub: "Arena·AA·LiveBench / 100", fmt: f1 },
    { id: "coding", key: "coding_composite_score", label: "코딩 종합", sub: "3대 코딩 평균 / 100", fmt: f1 },
    ...(domainFilter === "reasoning" ? [{ id: "gpqa", key: "gpqa_diamond", label: "GPQA Diamond", sub: "과학 추론 · %", fmt: f1 }] : []),
    { id: "arena", key: "arena_elo", label: "LMArena", sub: "선호도 Elo · 점", fmt: fInt },
    { id: "aa", key: "aa_intelligence", label: "Artificial Analysis", sub: "지능 지수 · /100", fmt: f1 },
    { id: "livebench", key: "livebench_score", label: "LiveBench", sub: "무오염 평가 · /100", fmt: f1 },
  ];

  // 1. 요약 KPI 카드 (비인터랙티브 정보 카드)
  const isShareTab = STATE.benchmarkTab !== "bench";
  const top = (arr, f, asc) => arr.filter(x => f(x) != null).sort((a, b) => asc ? f(a) - f(b) : f(b) - f(a))[0];
  const sTop = top(shares, x => x.share_pct);
  const compTop = top(models, x => x.composite_score);
  const codingTop = top(models, x => x.coding_composite_score ?? x.arena_coding_elo);
  const compVals = models.map(m => m.composite_score ?? m.arena_coding_elo).filter(v => v != null).sort((a, b) => a - b);
  const median = compVals.length ? compVals[Math.floor(compVals.length / 2)] : null;
  const cheapTop = median == null ? undefined : top(models.filter(m => (m.composite_score ?? m.arena_coding_elo) >= median), blended, true);
  const nm = x => x?.model ?? "—";

  const chip = (label, name, num, extra = "") => `
    <div class="bm-chip">
      <div class="bm-chip-top">
        <span class="bm-chip-label">${label}</span>
        ${extra}
      </div>
      <div class="bm-chip-bottom">
        <span class="bm-chip-main" title="${escapeHTML(name)}">${escapeHTML(name)}</span>
        <span class="bm-chip-num">${num}</span>
      </div>
    </div>`;

  const summaryHTML = `
    <div class="bm-summary" id="bm-summary">
      ${chip("3곳 평균 점유율 1위", sTop ? sTop.name : "—", sTop ? `${f2(sTop.share_pct)}%` : "—", sTop && sTop.mom_change != null ? chg(sTop.mom_change) : "")}
      ${chip("3대 리더보드 종합 1위", nm(compTop), compTop ? `${f1(compTop.composite_score)} / 100` : "—")}
      ${chip("코딩 종합 1위", nm(codingTop), codingTop ? `${f1(codingTop.coding_composite_score)}점` : "—")}
      ${chip("가성비 1위", nm(cheapTop), cheapTop ? `$${f2(cheapTop.pricing_in_1m)} / $${f2(cheapTop.pricing_out_1m)}` : "—", `<span class="bm-chip-hint" title="종합 점수 상위 절반 모델 중 최저가">상위 50% 최저가</span>`)}
    </div>`;

  // 2. 단일 툴바 (좌: 2개 메인 탭 / 우: 분야별 4개 프리셋 필터 + 모바일 정렬)
  const isChartExpanded = STATE.benchmarkView !== "table";

  const toolbarHTML = `
    <div class="bm-toolbar">
      <div class="bm-seg" id="bm-tabs" role="tablist" aria-label="보기 선택">
        <button type="button" role="tab" id="tab-share" data-tab="share" aria-controls="bm-share" data-focus-key="tab-share" aria-selected="${isShareTab}" tabindex="${isShareTab ? 0 : -1}">시장 점유율</button>
        <button type="button" role="tab" id="tab-bench" data-tab="bench" aria-controls="bm-bench" data-focus-key="tab-bench" aria-selected="${!isShareTab}" tabindex="${!isShareTab ? 0 : -1}">모델 성능</button>
      </div>

      <div class="bm-toolbar-right" ${isShareTab ? "hidden" : ""}>
        <div class="bm-seg bm-preset-group" role="group" aria-label="분야별 프리셋 필터">
          <button type="button" data-domain-filter="all" data-focus-key="domain-all" aria-pressed="${domainFilter === "all"}">전체</button>
          <button type="button" data-domain-filter="coding" data-focus-key="domain-coding" aria-pressed="${domainFilter === "coding"}">코딩</button>
          <button type="button" data-domain-filter="reasoning" data-focus-key="domain-reasoning" aria-pressed="${domainFilter === "reasoning"}">추론·과학</button>
          <button type="button" data-domain-filter="open" data-focus-key="domain-open" aria-pressed="${domainFilter === "open"}">오픈웨이트</button>
        </div>
        <label class="src-select-wrap sort-select-wrap bm-mobile-sort" title="정렬 기준">
          <span class="src-select-label">정렬</span>
          <select id="bm-mobile-sort-select" aria-label="모델 정렬 기준">
            <option value="composite" ${STATE.benchmarkSort === "composite" ? "selected" : ""}>3대 종합순</option>
            <option value="coding" ${STATE.benchmarkSort === "coding" ? "selected" : ""}>코딩 종합순</option>
            ${domainFilter === "reasoning" ? `<option value="gpqa" ${STATE.benchmarkSort === "gpqa" ? "selected" : ""}>GPQA Diamond순</option>` : ""}
            <option value="arena" ${STATE.benchmarkSort === "arena" ? "selected" : ""}>LMArena순</option>
            <option value="aa" ${STATE.benchmarkSort === "aa" ? "selected" : ""}>AA 지수순</option>
            <option value="livebench" ${STATE.benchmarkSort === "livebench" ? "selected" : ""}>LiveBench순</option>
            <option value="price" ${STATE.benchmarkSort === "price" ? "selected" : ""}>가격 낮은 순</option>
          </select>
        </label>
      </div>
    </div>`;

  // 3. 점유율 패널 (3곳 출처 멀티 비교 바)
  const sortedShares = [...shares].sort((a, b) => b.share_pct - a.share_pct);
  const maxShare = sortedShares[0]?.share_pct || 1;
  const hasMomChange = shares.some(s => s.mom_change != null);

  let mainShares, restShares;
  if (sortedShares.length <= 6) {
    mainShares = sortedShares;
    restShares = [];
  } else {
    mainShares = sortedShares.slice(0, 5);
    restShares = sortedShares.slice(5);
  }
  const restSum = restShares.reduce((n, s) => n + s.share_pct, 0);

  const shareRow = (s, rank) => {
    const bd = s.sources_breakdown;
    const refVal = bd ? (bd.trakkr_referral ?? bd.statcounter_referral ?? bd.referral_traffic ?? 0) : 0;
    const multiBarHTML = bd
      ? `
      <div class="bm-multibar-container" title="웹 방문 ${f1(bd.similarweb_visit)}% · 리퍼럴 ${f1(refVal)}% · 개발자 API ${f1(bd.openrouter_api)}%">
        <div class="bm-multibar-track" title="종합 평균 상대 비율">
          <i class="bm-multibar-fill" style="width:${Math.min(100, (s.share_pct / maxShare * 100)).toFixed(1)}%;background:${escapeHTML(s.color)};"></i>
        </div>
        <div class="bm-multibar-legend">
          <span><i class="bm-multibar-mini-dot" style="background:#10a37f;"></i>웹 <strong>${f1(bd.similarweb_visit)}%</strong></span>
          <span><i class="bm-multibar-mini-dot" style="background:#f59e0b;"></i>리퍼럴 <strong>${f1(refVal)}%</strong></span>
          <span><i class="bm-multibar-mini-dot" style="background:#8b5cf6;"></i>API <strong>${f1(bd.openrouter_api)}%</strong></span>
        </div>
      </div>`
      : `<span class="bm-bar" aria-hidden="true"><i style="width:${(s.share_pct / maxShare * 100).toFixed(1)}%;background:${escapeHTML(s.color)}"></i></span>`;

    return `
    <li class="bm-srow" title="${escapeHTML(s.description || "")}">
      <span class="bm-rank">${rank}</span>
      <span class="bm-name">
        <a href="https://${escapeHTML(s.domain)}" target="_blank" rel="noopener noreferrer">${escapeHTML(s.name)}</a>
        <small>${escapeHTML(s.provider)}</small>
      </span>
      ${multiBarHTML}
      <span class="bm-val">${f2(s.share_pct)}%</span>
      ${hasMomChange ? chg(s.mom_change) : ""}
    </li>`;
  };

  let srowsHTML = mainShares.map((s, i) => shareRow(s, i + 1)).join("");
  if (restShares.length >= 2) {
    srowsHTML += `
    <li class="bm-srow">
      <span class="bm-rank"></span>
      <span class="bm-name"><button type="button" class="bm-link-btn" id="bm-others-btn" aria-expanded="${STATE.benchmarkOthersOpen}" data-focus-key="others">기타 ${restShares.length}개 ${STATE.benchmarkOthersOpen ? "접기 ▴" : "펼치기 ▾"}</button><small>${restShares.map(s => escapeHTML(s.name)).join(" · ")}</small></span>
      <span class="bm-bar" aria-hidden="true"><i style="width:${(restSum / maxShare * 100).toFixed(1)}%;background:var(--soft)"></i></span>
      <span class="bm-val">${f2(restSum)}%</span>
      ${hasMomChange ? `<span class="bm-chg flat"></span>` : ""}
    </li>`;
    if (STATE.benchmarkOthersOpen) {
      srowsHTML += restShares.map((s, i) => shareRow(s, mainShares.length + i + 1)).join("");
    }
  }

  const momHeaderLabel = hasMomChange ? "▲▼ 전월 대비 %p" : "전월 데이터 없음";

  const sharePanelHTML = `
    <section id="bm-share" role="tabpanel" aria-labelledby="tab-share" ${!isShareTab ? "hidden" : ""}>
      <div class="bm-card">
        <div class="bm-card-head">
          <div>
            <strong>AI 서비스 3대 출처 종합 점유율 (평균)</strong>
            <span class="bm-card-sub">단일 출처 편향 제거를 위해 ① Similarweb(웹 방문) · ② Trakkr(AI 리퍼럴) · ③ OpenRouter(API 호출) 3곳 점유율을 산술 평균</span>
          </div>
          <span>${momHeaderLabel}</span>
        </div>
        <ol class="bm-srows" id="bm-share-rows">${srowsHTML}</ol>
      </div>
    </section>`;

  // 4. 성능 패널
  let filteredMs = [...models];
  if (domainFilter === "open") {
    filteredMs = filteredMs.filter(m => m.badge_type === "open-weights");
  } else if (domainFilter === "coding") {
    filteredMs = filteredMs.filter(m => m.coding_composite_score != null);
  } else if (domainFilter === "reasoning") {
    filteredMs = filteredMs.filter(m => m.gpqa_diamond != null);
  }
  if (!filteredMs.length) filteredMs = [...models];

  const visible = METRICS.filter(x => models.some(m => m[x.key] != null));
  if (STATE.benchmarkSort !== "price" && !visible.some(x => x.id === STATE.benchmarkSort)) {
    STATE.benchmarkSort = visible[0]?.id ?? "composite";
  }

  const sortedMs = [...filteredMs];
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
      <th class="num">순위</th>
      <th>모델</th>
      ${visible.map(m => th(m.id, m.label, m.sub)).join("")}
      ${th("price", "가격", "OpenRouter · $/1M 입력·출력")}
      <th class="num">컨텍스트</th>
    </tr>`;

  const body = sortedMs.map((m, i) => {
    const cells = visible.map(x => {
      const v = m[x.key];
      const on = STATE.benchmarkSort === x.id;
      return `<td class="num ${on ? "is-sorted" : ""}">${on && v != null ? mini(v) : ""}<span class="bm-v ${v === best[x.id] ? "is-best" : ""}">${x.fmt(v)}</span></td>`;
    }).join("");
    return `
    <tr class="bm-clickable-row" data-bm-model="${escapeHTML(m.model)}" tabindex="0" role="button" aria-label="${escapeHTML(m.model)}">
      <td class="num"><span class="bm-rank">${i + 1}</span></td>
      <td><span class="bm-model"><b>${escapeHTML(m.model)}${m.badge_type === "open-weights" ? `<span class="bm-tag">오픈</span>` : ""}</b><small>${escapeHTML(m.provider)}</small></span></td>
      ${cells}
      <td class="num ${STATE.benchmarkSort === "price" ? "is-sorted" : ""}"><span class="bm-v ${blended(m) === minPrice ? "is-best" : ""}">${f2(m.pricing_in_1m)} / ${f2(m.pricing_out_1m)}</span></td>
      <td class="num">${fCtx(m.context_window)}</td>
    </tr>`;
  }).join("");

  const mlistHTML = sortedMs.map((m, i) => `
    <li class="bm-mrow bm-clickable-row" data-bm-model="${escapeHTML(m.model)}" tabindex="0" role="button">
      <span class="bm-rank">${i + 1}</span>
      <span class="bm-model"><b>${escapeHTML(m.model)}${m.badge_type === "open-weights" ? `<span class="bm-tag">오픈</span>` : ""}</b><small>${escapeHTML(m.provider)} · $${f2(m.pricing_in_1m)} / $${f2(m.pricing_out_1m)} · ${fCtx(m.context_window)}</small></span>
      <span class="bm-mval"><b>${sortMetric ? sortMetric.fmt(m[sortMetric.key]) : `$${f2(blended(m))}`}</b><small>${sortMetric ? sortMetric.label : "혼합 단가"}</small></span>
    </li>`).join("");

  const footNotes = [
    "3대 종합 평균은 ① LMArena Elo(인간 선호도) · ② Artificial Analysis 지능 지수 · ③ LiveBench(무오염 동적 평가) 3곳 점수를 0~100점으로 정규화해 산술 평균한 값입니다.",
    "갱신이 중단된 구버전 벤치마크(예: 2026년 2월 이후 동결된 SWE-bench 등)는 30일 최신성 검증 게이트에 의해 자동 배제됩니다.",
    "가격 정보는 OpenRouter 공개 REST API를 통해 자동 동기화되며, 공급사 직접 계약 조건과 차이가 있을 수 있습니다."
  ];
  if (STATE.benchmarkSort === "price") {
    footNotes.push("가격 정렬은 입력 3 : 출력 1 가중 평균 기준");
  }
  const footNoteHTML = `<div class="bm-foot-note" id="bm-foot-note">${footNotes.join("<br />")}</div>`;

  // 2D 산점도 매트릭스 카드 (우측 상단 접기/펼치기 단일 토글)
  const scatterMatrixCardHTML = `
    <div class="bm-scatter-card ${isChartExpanded ? "" : "is-collapsed"}" id="bm-scatter-card">
      <div class="bm-scatter-head">
        <div class="bm-scatter-title">
          <strong>2D 성능 vs 가격 가성비 매트릭스 (4분면 분석)</strong>
          <span>${isChartExpanded ? "지능 점수 대비 토큰 비용 효율성 시각화 · 모델 점을 클릭하면 8대 세부 지표가 열립니다" : "가성비 4분면 산점도 차트가 접혀 있습니다"}</span>
        </div>
        <div class="bm-scatter-actions">
          ${isChartExpanded ? `
          <div class="bm-scatter-legend">
            <span class="bm-legend-item"><i class="bm-legend-dot" style="background:#4285f4;"></i>Google</span>
            <span class="bm-legend-item"><i class="bm-legend-dot" style="background:#d97757;"></i>Anthropic</span>
            <span class="bm-legend-item"><i class="bm-legend-dot" style="background:#10a37f;"></i>OpenAI</span>
            <span class="bm-legend-item"><i class="bm-legend-dot" style="background:#0668e1;"></i>Meta</span>
            <span class="bm-legend-item"><i class="bm-legend-dot" style="background:#4d6bfe;"></i>DeepSeek</span>
          </div>` : ""}
          <button type="button" class="bm-chart-toggle" data-bm-toggle-chart data-focus-key="bm-toggle-chart" aria-expanded="${isChartExpanded}">
            ${isChartExpanded ? "차트 접기 ▴" : "차트 펼치기 ▾"}
          </button>
        </div>
      </div>
      ${isChartExpanded ? `
      <div class="bm-scatter-body">
        <div class="bm-svg-wrap">
          ${buildScatterSVG(models, domainFilter)}
        </div>
      </div>` : ""}
    </div>`;

  const benchPanelHTML = `
    <section id="bm-bench" role="tabpanel" aria-labelledby="tab-bench" ${isShareTab ? "hidden" : ""}>
      ${scatterMatrixCardHTML}
      <div class="bm-card">
        <div class="bm-card-head">
          <div>
            <strong>글로벌 프론티어 대표 모델 ${filteredMs.length}종 — 3대 리더보드 종합</strong>
            <span class="bm-card-sub">상위권을 주도하는 벤더별 주요 프론티어 라인업 · LMArena · Artificial Analysis · LiveBench 3곳 교차 검증</span>
          </div>
        </div>
        <div class="bm-table-wrap"><table class="bm-table" id="bm-bench-table"><thead>${head}</thead><tbody>${body}</tbody></table></div>
        <div class="bm-mobile-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="vertical-align:-1px;margin-right:4px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span>모델을 탭하면 3대 리더보드 8개 세부 지표 모달이 열립니다</span>
        </div>
        <ol class="bm-mlist" id="bm-mlist">${mlistHTML}</ol>
        ${footNoteHTML}
      </div>
    </section>`;

  container.innerHTML = summaryHTML + toolbarHTML + sharePanelHTML + benchPanelHTML;
}

// 이벤트 핸들러 바인딩 (위임)
document.getElementById("benchmarks-container")?.addEventListener("click", (e) => {
  const modelRow = e.target.closest("[data-bm-model]");
  if (modelRow && !e.target.closest("a, button:not([data-bm-model])")) {
    openBenchmarkModelModal(modelRow.dataset.bmModel);
    return;
  }

  const t = e.target.closest("[data-tab],[data-sort],[data-domain-filter],[data-bm-toggle-chart],#bm-others-btn");
  if (!t) return;

  if (t.id === "bm-others-btn") {
    STATE.benchmarkOthersOpen = !STATE.benchmarkOthersOpen;
    renderBenchmarks();
    refocus("others");
    return;
  }

  if (t.hasAttribute("data-bm-toggle-chart")) {
    STATE.benchmarkView = STATE.benchmarkView === "table" ? "matrix" : "table";
    renderBenchmarks();
    refocus("bm-toggle-chart");
    return;
  }

  if (t.dataset.domainFilter) {
    STATE.benchmarkDomainFilter = t.dataset.domainFilter;
    if (t.dataset.domainFilter === "coding") {
      STATE.benchmarkSort = "coding";
    } else if (t.dataset.domainFilter === "reasoning") {
      STATE.benchmarkSort = "gpqa";
    } else {
      STATE.benchmarkSort = "composite";
    }
    renderBenchmarks();
    refocus(t.dataset.focusKey);
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

document.getElementById("benchmarks-container")?.addEventListener("change", (e) => {
  if (e.target.id === "bm-mobile-sort-select") {
    STATE.benchmarkSort = e.target.value;
    renderBenchmarks();
    document.getElementById("bm-mobile-sort-select")?.focus();
  }
});

// 상단 데이터 수집 기준 및 한계 버튼 클릭 이벤트 리스너 바인딩
document.getElementById("bm-scope-btn")?.addEventListener("click", () => {
  openBenchmarkScopeModal();
});

// 키보드 ←→ 키로 탭 전환 및 Enter로 모델 상세 모달 열기
document.getElementById("benchmarks-container")?.addEventListener("keydown", (e) => {
  const modelRow = e.target.closest("[data-bm-model]");
  if (modelRow && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    openBenchmarkModelModal(modelRow.dataset.bmModel);
    return;
  }
  const tabs = e.target.closest("#bm-tabs");
  if (!tabs) return;
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  STATE.benchmarkTab = STATE.benchmarkTab === "share" ? "bench" : "share";
  renderBenchmarks();
  refocus(`tab-${STATE.benchmarkTab}`);
});






export { renderBenchmarks, openBenchmarkScopeModal, openBenchmarkModelModal };
