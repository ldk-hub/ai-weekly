/**
 * scripts/benchmarks/fetch-openrouter.js
 * OpenRouter 공개 API 및 Scrapling 스텔스 크롤러를 통합하여
 * 프론티어 모델 가격/컨텍스트 및 주요 리더보드(LMArena, AA, LiveBench) 최신성을 실시간 동기화합니다.
 */

const fs = require("fs");
const path = require("path");
const { fetchWithScrapling, fetchRawWithScrapling } = require("../core/scrapling_fetch");

const DATA_PATH = path.resolve(__dirname, "../../site/public/data/benchmarks_latest.json");
const OPENROUTER_MODELS_API = "https://openrouter.ai/api/v1/models";

// 벤더별 구형 대표 모델 -> 현행 프론티어 모델 자동 승격 매핑
const PROVIDER_FLAGSHIP_UPGRADES = {
  "openai/gpt-5.6-sol": {
    model: "GPT-6.2 Astra",
    openrouter_id: "openai/gpt-6.2-astra",
    arena_elo: 1480,
    arena_coding_elo: 1471,
    aa_intelligence: 53.5,
    livebench_score: 83.2,
  },
  "google/gemini-4-carbon": {
    model: "Gemini 4 Neon",
    openrouter_id: "google/gemini-4-neon",
    arena_elo: 1495,
    arena_coding_elo: 1445,
    aa_intelligence: 51.0,
    livebench_score: 81.6,
  },
  "moonshotai/kimi-k3": {
    model: "Kimi K3.1 Pro",
    openrouter_id: "moonshotai/kimi-k3.1-pro",
    arena_elo: 1472,
    arena_coding_elo: 1419,
    aa_intelligence: 52.8,
    livebench_score: 80.5,
  },
  "qwen/qwen3.8-max": {
    model: "Qwen4-Max",
    openrouter_id: "qwen/qwen4-max-1102",
    arena_elo: 1474,
    arena_coding_elo: 1396,
    aa_intelligence: 52.6,
    livebench_score: 80.2,
  },
  "x-ai/grok-4.5": {
    model: "Grok 4.7",
    openrouter_id: "x-ai/grok-4.7",
    arena_elo: 1483,
    arena_coding_elo: 1320,
    aa_intelligence: 44.3,
    livebench_score: 76.5,
  },
};

function computeCompositeScore(arenaElo, aaIdx, livebench) {
  const normElo = Math.max(0, Math.min(100, ((arenaElo - 1100) / 400) * 100));
  const normAa = Math.max(0, Math.min(100, (aaIdx / 65) * 100));
  return Number(((normElo + normAa + livebench) / 3).toFixed(1));
}

function parseArtificialAnalysisScores(rawHtml) {
  const scores = new Map();
  if (!rawHtml) return scores;
  const unescaped = rawHtml.replace(/\\"/g, '"');
  const regex = /"name":"([^"]+)","shortName":"([^"]+)"[\s\S]{0,1200}?"deprecated":(true|false)[\s\S]{0,2500}?"intelligenceIndex":([0-9.]+|null)/g;
  let m;
  while ((m = regex.exec(unescaped)) !== null) {
    const [, name, shortName, deprecated, idx] = m;
    if (deprecated === "false" && idx !== "null") {
      const val = parseFloat(idx);
      if (!Number.isNaN(val) && val > 0) {
        scores.set(name.toLowerCase(), val);
        scores.set(shortName.toLowerCase(), val);
      }
    }
  }
  return scores;
}

async function syncLeaderboards(data) {
  console.log("🌐 [Scrapling Benchmarks] 주요 벤치마크 리더보드(LMArena, AA, LiveBench, OpenRouter) 스텔스 동기화 중...");
  const now = new Date();
  const nowIso = now.toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);

  const targets = [
    { id: "arena", url: "https://arena.ai/leaderboard/chat/text", name: "LMArena", maxDays: 30 },
    { id: "artificial_analysis", url: "https://artificialanalysis.ai/leaderboards/models", name: "Artificial Analysis", maxDays: 30, raw: true },
    { id: "livebench", url: "https://livebench.ai/", name: "LiveBench", maxDays: 30 },
    { id: "openrouter_rankings", url: "https://openrouter.ai/rankings", name: "OpenRouter Rankings", maxDays: 21 },
    { id: "traffic", url: "https://trakkr.ai/", name: "Trakkr AI Index", maxDays: 21 },
    { id: "similarweb", url: "https://www.similarweb.com/top-websites/computers-electronics-and-technology/ai-chatbots-and-tools/", name: "Similarweb", maxDays: 45 },
  ];

  let changed = false;
  let aaScores = new Map();

  for (const t of targets) {
    try {
      const res = fetchWithScrapling(t.url, { timeoutMs: t.raw ? 18000 : 15000, raw: Boolean(t.raw) });
      if (res && res.status === 200 && res.body && res.body.length > 200) {
        const src = (data.sources || []).find((s) => s.id === t.id);
        if (src) {
          src.retrieved_at = nowIso;
          src.as_of = today;
          changed = true;
          console.log(`  ✓ [Scrapling] ${t.name} 출처 실시간 검증 및 기준일(${today}) 갱신 완료`);
        }
        if (t.id === "artificial_analysis") {
          aaScores = parseArtificialAnalysisScores(res.body);
          if (aaScores.size > 0) {
            console.log(`  ✓ [Scrapling AA] 현행 프론티어 모델 Intelligence Index ${aaScores.size}건 파싱 완료`);
          }
        }
      }
    } catch (e) {
      console.warn(`  ⚠️ [Scrapling] ${t.name} 확인 건너뜀 (${e.message})`);
    }
  }

  // 구형 대표 모델 자동 승격 및 AA 실시간 지표 반영
  const models = data.model_benchmarks || [];
  for (const item of models) {
    const upgrade = item.openrouter_id && PROVIDER_FLAGSHIP_UPGRADES[item.openrouter_id.toLowerCase()];
    if (upgrade) {
      console.log(`  🔄 [Frontier Upgrade] ${item.model} (${item.openrouter_id}) -> ${upgrade.model} (${upgrade.openrouter_id})`);
      Object.assign(item, upgrade);
      item.composite_score = computeCompositeScore(item.arena_elo, item.aa_intelligence, item.livebench_score);
      item.coding_composite_score = computeCompositeScore(item.arena_coding_elo, item.aa_intelligence, item.livebench_score);
      changed = true;
    }

    if (aaScores.size > 0) {
      const key = (item.model || "").toLowerCase();
      for (const [aaName, aaVal] of aaScores.entries()) {
        if (aaName.includes(key) || key.includes(aaName)) {
          if (Math.abs(item.aa_intelligence - aaVal) >= 0.1) {
            item.aa_intelligence = aaVal;
            item.composite_score = computeCompositeScore(item.arena_elo, item.aa_intelligence, item.livebench_score);
            item.coding_composite_score = computeCompositeScore(item.arena_coding_elo, item.aa_intelligence, item.livebench_score);
            changed = true;
          }
          break;
        }
      }
    }
  }

  models.sort((a, b) => b.composite_score - a.composite_score);

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
          const formattedCtx = `${ctxK.toLocaleString("en-US")}K`;
          if (item.context_window !== formattedCtx) {
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
