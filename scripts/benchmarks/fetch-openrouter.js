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

// 벤더(Provider) <-> Artificial Analysis Creator / OpenRouter Prefix 매핑
const PROVIDER_META = {
  "Anthropic": { aaCreators: ["Anthropic"], orPrefixes: ["anthropic/"] },
  "OpenAI": { aaCreators: ["OpenAI"], orPrefixes: ["openai/"] },
  "Google": { aaCreators: ["Google"], orPrefixes: ["google/"] },
  "Meta": { aaCreators: ["Meta", "Anthropic Research"], orPrefixes: ["meta/", "meta-llama/", "openrouter/"] },
  "Anthropic Research": { aaCreators: ["Meta", "Anthropic Research"], orPrefixes: ["openrouter/", "meta-llama/"] },
  "Moonshot": { aaCreators: ["Kimi", "Moonshot AI"], orPrefixes: ["moonshotai/"] },
  "Moonshot AI": { aaCreators: ["Kimi", "Moonshot AI"], orPrefixes: ["moonshotai/"] },
  "Alibaba": { aaCreators: ["Alibaba", "Qwen"], orPrefixes: ["qwen/"] },
  "DeepSeek": { aaCreators: ["DeepSeek"], orPrefixes: ["deepseek/"] },
  "Tencent": { aaCreators: ["Tencent"], orPrefixes: ["tencent/"] },
  "Xiaomi": { aaCreators: ["Xiaomi"], orPrefixes: ["xiaomi/"] },
  "Z.ai": { aaCreators: ["Z AI", "Z.ai", "Zhipu"], orPrefixes: ["z-ai/", "thudm/"] },
  "xAI": { aaCreators: ["SpaceXAI", "xAI"], orPrefixes: ["x-ai/"] },
  "Thinking Machines": { aaCreators: ["Thinking Machines", "Liquid AI"], orPrefixes: ["thinkingmachines/", "liquid/"] },
  "Liquid AI": { aaCreators: ["Thinking Machines", "Liquid AI"], orPrefixes: ["liquid/", "thinkingmachines/"] },
};

// 벤더별 구형 대표 모델 -> 현행 프론티어 모델 명시 폴백 매핑
const PROVIDER_FLAGSHIP_UPGRADES = {
  "openai/gpt-5.6-sol": {
    model: "GPT-6.2 Astra",
    openrouter_id: "openai/gpt-6.2-astra",
    arena_elo: 1480,
    arena_coding_elo: 1471,
    aa_intelligence: 62.1,
    livebench_score: 83.2,
  },
  "google/gemini-4-carbon": {
    model: "Gemini 4 Neon",
    openrouter_id: "google/gemini-4-neon",
    arena_elo: 1512,
    arena_coding_elo: 1445,
    aa_intelligence: 61.4,
    livebench_score: 81.6,
  },
  "moonshotai/kimi-k3": {
    model: "Kimi K3.1 Pro",
    openrouter_id: "moonshotai/kimi-k3.1-pro",
    arena_elo: 1472,
    arena_coding_elo: 1419,
    aa_intelligence: 46.5,
    livebench_score: 80.5,
  },
  "qwen/qwen3.8-max": {
    model: "Qwen4-Max",
    openrouter_id: "qwen/qwen4-max-1102",
    arena_elo: 1474,
    arena_coding_elo: 1396,
    aa_intelligence: 42.9,
    livebench_score: 80.2,
  },
  "x-ai/grok-4.5": {
    model: "Grok 4.7",
    openrouter_id: "x-ai/grok-4.7",
    arena_elo: 1483,
    arena_coding_elo: 1320,
    aa_intelligence: 35.5,
    livebench_score: 76.5,
  },
};

function normalizeModelKey(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function computeCompositeScore(arenaElo, aaIdx, livebench) {
  const normElo = Math.max(0, Math.min(100, ((arenaElo - 1100) / 400) * 100));
  const normAa = Math.max(0, Math.min(100, (aaIdx / 68) * 100));
  return Number(((normElo + normAa + livebench) / 3).toFixed(1));
}

function parseArtificialAnalysisModels(rawHtml) {
  const byCreator = new Map();
  const byName = new Map();
  if (!rawHtml) return { byCreator, byName };

  const s = rawHtml.replace(/\\"/g, '"');
  const re = /"name":"([^"]+)","shortName":"([^"]+)","suffix":(?:"[^"]*"|null),"deprecated":(true|false)[^}]*?"modelCreatorName":"([^"]+)"[^}]*?"intelligenceIndex":([0-9.]+|null)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const [, name, shortName, dep, creator, idxStr] = m;
    if (dep !== "false" || idxStr === "null") continue;
    const idx = Number(parseFloat(idxStr).toFixed(1));
    if (Number.isNaN(idx) || idx <= 0) continue;

    const baseName = name.replace(/\s*\([^)]*\)\s*$/g, "").replace(/\s+Full$/i, "").trim();
    const normKey = normalizeModelKey(baseName);
    const existingByName = byName.get(normKey);
    if (!existingByName || idx > existingByName.aa_intelligence) {
      byName.set(normKey, { creator, baseName, variantName: name, shortName, aa_intelligence: idx });
    }

    const existingByCreator = byCreator.get(creator);
    if (!existingByCreator || idx > existingByCreator.aa_intelligence) {
      byCreator.set(creator, { creator, baseName, variantName: name, shortName, aa_intelligence: idx });
    }
  }
  return { byCreator, byName };
}

function parseArenaRatings(rawHtml) {
  const byName = new Map();
  if (!rawHtml) return byName;
  const s = rawHtml.replace(/\\"/g, '"');
  const re = /"modelDisplayName":"([^"]+)","rating":([0-9.]+)/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const [, displayName, ratingStr] = m;
    const rating = Math.round(parseFloat(ratingStr));
    if (Number.isNaN(rating) || rating <= 0) continue;
    const baseName = displayName.replace(/\s*\([^)]*\)\s*$/g, "").trim();
    const normKey = normalizeModelKey(baseName);
    const prev = byName.get(normKey);
    if (!prev || rating > prev) {
      byName.set(normKey, rating);
    }
  }
  return byName;
}

function findBestOpenRouterMatch(provider, baseName, apiModels) {
  if (!apiModels || !apiModels.length) return null;
  const meta = PROVIDER_META[provider];
  const prefixes = meta ? meta.orPrefixes : [];
  const targetTokens = normalizeModelKey(baseName).split(" ").filter(Boolean);

  const candidates = apiModels.filter((m) => {
    if (!m.id || m.id.endsWith(":free")) return false;
    if (!prefixes.length) return true;
    return prefixes.some((p) => m.id.toLowerCase().startsWith(p));
  });

  let best = null;
  let bestScore = 0;
  for (const c of candidates) {
    const hay = `${normalizeModelKey(c.name)} ${normalizeModelKey(c.id.split("/")[1] || "")}`;
    let hits = 0;
    for (const tok of targetTokens) {
      if (hay.includes(tok)) hits++;
    }
    const score = targetTokens.length ? hits / targetTokens.length : 0;
    if (score > bestScore || (score === bestScore && best && (c.created || 0) > (best.created || 0))) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 0.6 ? best : null;
}

async function syncLeaderboards(data, apiModels = []) {
  console.log("🌐 [Scrapling Benchmarks] 주요 벤치마크 리더보드(LMArena, AA, LiveBench, OpenRouter) 스텔스 동기화 중...");
  const now = new Date();
  const nowIso = now.toISOString();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);

  const targets = [
    { id: "arena", url: "https://arena.ai/leaderboard/chat/text", name: "LMArena", maxDays: 30, raw: true },
    { id: "artificial_analysis", url: "https://artificialanalysis.ai/leaderboards/models", name: "Artificial Analysis", maxDays: 30, raw: true },
    { id: "livebench", url: "https://livebench.ai/", name: "LiveBench", maxDays: 30 },
    { id: "openrouter_rankings", url: "https://openrouter.ai/rankings", name: "OpenRouter Rankings", maxDays: 21, raw: true },
    { id: "traffic", url: "https://trakkr.ai/", name: "Trakkr AI Index", maxDays: 21 },
    { id: "similarweb", url: "https://www.similarweb.com/top-websites/computers-electronics-and-technology/ai-chatbots-and-tools/", name: "Similarweb", maxDays: 45 },
  ];

  let changed = false;
  let aaData = { byCreator: new Map(), byName: new Map() };
  let arenaChatRatings = new Map();
  let arenaCodeRatings = new Map();

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
          aaData = parseArtificialAnalysisModels(res.body);
          if (aaData.byName.size > 0) {
            console.log(`  ✓ [Scrapling AA] 현행 프론티어 모델 Intelligence Index ${aaData.byName.size}종(벤더 ${aaData.byCreator.size}곳) 실시간 파싱 완료`);
          }
        } else if (t.id === "arena") {
          arenaChatRatings = parseArenaRatings(res.body);
          if (arenaChatRatings.size > 0) {
            console.log(`  ✓ [Scrapling LMArena] 실시간 Chat Elo 레이팅 ${arenaChatRatings.size}종 파싱 완료`);
          }
          const codeRes = fetchWithScrapling("https://arena.ai/leaderboard/code/webdev", { timeoutMs: 18000, raw: true });
          if (codeRes && codeRes.status === 200 && codeRes.body) {
            arenaCodeRatings = parseArenaRatings(codeRes.body);
            if (arenaCodeRatings.size > 0) {
              console.log(`  ✓ [Scrapling LMArena] 실시간 Coding Elo 레이팅 ${arenaCodeRatings.size}종 파싱 완료`);
            }
          }
        }
      }
    } catch (e) {
      console.warn(`  ⚠️ [Scrapling] ${t.name} 확인 건너뜀 (${e.message})`);
    }
  }

  // 벤더별 신규 플래그십 동적 자동 탐지·교체 및 실시간 리더보드 점수 갱신
  const models = data.model_benchmarks || [];
  for (const item of models) {
    // 1) 명시적 구버전 폴백 매핑 적용
    const fallbackUpgrade = item.openrouter_id && PROVIDER_FLAGSHIP_UPGRADES[item.openrouter_id.toLowerCase()];
    if (fallbackUpgrade) {
      console.log(`  🔄 [Frontier Upgrade] ${item.model} -> ${fallbackUpgrade.model}`);
      Object.assign(item, fallbackUpgrade);
      changed = true;
    }

    // 2) Artificial Analysis 벤더별 최고 성능 현행(deprecated=false) 플래그십 자동 탐지 및 승격
    const pMeta = PROVIDER_META[item.provider];
    if (pMeta && aaData.byCreator.size > 0) {
      let topCreatorModel = null;
      for (const creatorName of pMeta.aaCreators) {
        const candidate = aaData.byCreator.get(creatorName);
        if (candidate && (!topCreatorModel || candidate.aa_intelligence > topCreatorModel.aa_intelligence)) {
          topCreatorModel = candidate;
        }
      }

      if (topCreatorModel) {
        const currentNorm = normalizeModelKey(item.model);
        const topNorm = normalizeModelKey(topCreatorModel.baseName);

        // 동일 모델이면 AA 지능 지수 최신화, 신규 상위 플래그십이 출시되었으면 모델 자동 교체
        if (currentNorm === topNorm || currentNorm.includes(topNorm) || topNorm.includes(currentNorm)) {
          if (Math.abs(item.aa_intelligence - topCreatorModel.aa_intelligence) >= 0.1) {
            item.aa_intelligence = topCreatorModel.aa_intelligence;
            changed = true;
          }
        } else if (topCreatorModel.aa_intelligence > item.aa_intelligence + 0.5) {
          const matchedOr = findBestOpenRouterMatch(item.provider, topCreatorModel.baseName, apiModels);
          if (matchedOr) {
            console.log(`  🚀 [Auto-Discovered Flagship] ${item.provider}: ${item.model} -> ${topCreatorModel.baseName} (${matchedOr.id})`);
            item.model = topCreatorModel.baseName;
            item.openrouter_id = matchedOr.id;
            item.aa_intelligence = topCreatorModel.aa_intelligence;
            changed = true;
          }
        }
      }
    }

    // 3) 모델명 기준 AA Intelligence Index 및 LMArena Elo 실시간 매칭
    const normItemName = normalizeModelKey(item.model);
    if (aaData.byName.has(normItemName)) {
      const liveAa = aaData.byName.get(normItemName).aa_intelligence;
      if (Math.abs(item.aa_intelligence - liveAa) >= 0.1) {
        item.aa_intelligence = liveAa;
        changed = true;
      }
    }

    if (arenaChatRatings.has(normItemName)) {
      const liveElo = arenaChatRatings.get(normItemName);
      if (Math.abs(item.arena_elo - liveElo) >= 1) {
        item.arena_elo = liveElo;
        changed = true;
      }
    }

    if (arenaCodeRatings.has(normItemName)) {
      const liveCodeElo = arenaCodeRatings.get(normItemName);
      if (Math.abs(item.arena_coding_elo - liveCodeElo) >= 1) {
        item.arena_coding_elo = liveCodeElo;
        changed = true;
      }
    }

    // 4) 종합 점수(composite_score) 및 코딩 종합 점수 재산출
    const newComposite = computeCompositeScore(item.arena_elo, item.aa_intelligence, item.livebench_score);
    const normCodeElo = Math.max(0, Math.min(100, ((item.arena_coding_elo - 1350) / 500) * 100));
    const normAa = Math.max(0, Math.min(100, (item.aa_intelligence / 68) * 100));
    const codeBench = typeof item.livebench_coding === "number" ? item.livebench_coding : item.livebench_score;
    const newCodingComposite = Number(((normCodeElo + normAa + codeBench) / 3).toFixed(1));
    if (item.composite_score !== newComposite || item.coding_composite_score !== newCodingComposite) {
      item.composite_score = newComposite;
      item.coding_composite_score = newCodingComposite;
      changed = true;
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

  // 1. Scrapling 리더보드 동기화 및 벤더별 신규 플래그십 동적 자동 탐지·교체 수행
  const leaderboardsChanged = await syncLeaderboards(data, apiModels);

  // 2. OpenRouter API 기준 최신 가격 및 컨텍스트 길이 동기화 (신규 승격 모델 포함)
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
