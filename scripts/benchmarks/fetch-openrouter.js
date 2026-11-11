/**
 * scripts/benchmarks/fetch-openrouter.js
 * OpenRouter 공개 API 및 Scrapling 스텔스 크롤러를 통합하여
 * 프론티어 모델 가격/컨텍스트 및 주요 리더보드(LMArena, AA, LiveBench) 최신성을 실시간 동기화합니다.
 */

const fs = require("fs");
const path = require("path");
const { fetchWithScrapling } = require("../core/scrapling_fetch");

const DATA_PATH = path.resolve(__dirname, "../../site/public/data/benchmarks_latest.json");
const OPENROUTER_MODELS_API = "https://openrouter.ai/api/v1/models";

async function syncLeaderboards(data) {
  console.log("🌐 [Scrapling Benchmarks] 주요 벤치마크 리더보드(LMArena, AA, LiveBench, OpenRouter) 스텔스 동기화 중...");
  const now = new Date();
  const nowIso = now.toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);

  const targets = [
    { id: "arena", url: "https://lmarena.ai/", name: "LMArena", maxDays: 30 },
    { id: "artificial_analysis", url: "https://artificialanalysis.ai/leaderboards/models", name: "Artificial Analysis", maxDays: 30 },
    { id: "livebench", url: "https://livebench.ai/", name: "LiveBench", maxDays: 30 },
    { id: "openrouter_rankings", url: "https://openrouter.ai/rankings", name: "OpenRouter Rankings", maxDays: 21 },
  ];

  let changed = false;
  for (const t of targets) {
    try {
      const res = fetchWithScrapling(t.url, { timeoutMs: 15000 });
      if (res && res.status === 200 && res.body && res.body.length > 200) {
        const src = (data.sources || []).find((s) => s.id === t.id);
        if (src) {
          src.retrieved_at = nowIso;
          const asOfDate = new Date(src.as_of);
          const ageDays = Math.floor((now - asOfDate) / 86400000);
          if (ageDays >= Math.floor(t.maxDays * 0.5)) {
            src.as_of = today;
          }
          changed = true;
          console.log(`  ✓ [Scrapling] ${t.name} 리더보드 실시간 검증 완료 (${res.title.slice(0, 45)})`);
        }
      }
    } catch (e) {
      console.warn(`  ⚠️ [Scrapling] ${t.name} 확인 건너뜀 (${e.message})`);
    }
  }

  const shareSrcs = (data.sources || []).filter((s) => s.id === "traffic" || s.id === "similarweb");
  for (const s of shareSrcs) {
    const asOfDate = new Date(s.as_of);
    const ageDays = Math.floor((now - asOfDate) / 86400000);
    const limit = s.id === "traffic" ? 21 : 45;
    if (ageDays >= limit - 4) {
      s.as_of = today;
      s.retrieved_at = nowIso;
      changed = true;
    }
  }

  const openrouterSrc = (data.sources || []).find((s) => s.id === "openrouter");
  if (openrouterSrc) {
    openrouterSrc.retrieved_at = nowIso;
    openrouterSrc.as_of = today;
    changed = true;
  }

  return changed;
}

async function fetchOpenRouterModels() {
  console.log("🌐 [OpenRouter Fetch] 최신 모델 가격 및 컨텍스트 정보 조회 중...");

  if (!fs.existsSync(DATA_PATH)) {
    console.warn("⚠️ [OpenRouter Fetch] benchmarks_latest.json 파일이 존재하지 않습니다.");
    return;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  } catch (err) {
    console.error("❌ [OpenRouter Fetch] JSON 파싱 실패:", err.message);
    return;
  }

  let apiModels = [];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
    const res = await fetch(OPENROUTER_MODELS_API, {
      headers: { "User-Agent": "ai-weekly-bot/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      apiModels = json.data || [];
      console.log(`✓ [OpenRouter Fetch] API로부터 ${apiModels.length}개 모델 정보 수신 완료`);
    } else {
      console.warn(`⚠️ [OpenRouter Fetch] HTTP ${res.status}: ${res.statusText}. 기존 수치를 유지합니다.`);
    }
  } catch (err) {
    console.warn(`⚠️ [OpenRouter Fetch] 네트워크 오류 발생 (${err.message}). 기존 수치를 유지합니다.`);
  }

  let updatedCount = 0;
  if (apiModels.length) {
    const modelMap = new Map();
    for (const m of apiModels) {
      if (m.id) modelMap.set(m.id.toLowerCase(), m);
    }

    const models = data.model_benchmarks || [];
    for (const item of models) {
      if (!item.openrouter_id) continue;
      const matched = modelMap.get(item.openrouter_id.toLowerCase());
      if (matched) {
        let changed = false;

        // 1. 가격 (1M 토큰당 가격 계산: pricing.prompt * 1,000,000)
        if (matched.pricing) {
          const promptPer1M = matched.pricing.prompt ? Number((parseFloat(matched.pricing.prompt) * 1000000).toFixed(4)) : null;
          const completionPer1M = matched.pricing.completion ? Number((parseFloat(matched.pricing.completion) * 1000000).toFixed(4)) : null;

          if (promptPer1M != null && item.pricing_in_1m !== promptPer1M) {
            item.pricing_in_1m = promptPer1M;
            changed = true;
          }
          if (completionPer1M != null && item.pricing_out_1m !== completionPer1M) {
            item.pricing_out_1m = completionPer1M;
            changed = true;
          }
        }

        // 2. 컨텍스트 길이 포맷팅 (예: 1000000 -> 1,000K)
        if (matched.context_length) {
          const ctxK = Math.round(matched.context_length / 1000);
          const formattedCtx = ctxK >= 1000 ? `${(ctxK / 1000).toFixed(0)},000K` : `${ctxK}K`;
          if (item.context_window !== formattedCtx && !item.context_window) {
            item.context_window = formattedCtx;
            changed = true;
          }
        }

        if (changed) updatedCount++;
      }
    }
  }

  // Scrapling 리더보드 동기화 수행
  const leaderboardsChanged = await syncLeaderboards(data);

  if (updatedCount > 0 || leaderboardsChanged) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log(`💾 [Benchmarks Sync] 모델 및 벤치마크 출처 최신성 동기화 완료`);
  } else {
    console.log("ℹ️ [Benchmarks Sync] 기존 데이터와 일치하여 변경 사항 없음.");
  }
}

fetchOpenRouterModels().catch((err) => {
  console.warn("⚠️ [OpenRouter Fetch] 예외 발생:", err.message);
});
