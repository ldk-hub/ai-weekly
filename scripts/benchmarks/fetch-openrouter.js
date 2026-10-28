/**
 * scripts/benchmarks/fetch-openrouter.js
 * OpenRouter 공개 API(https://openrouter.ai/api/v1/models)를 호출하여
 * 프론티어 모델들의 최신 가격($/1M tokens) 및 컨텍스트 윈도우 정보를 동기화합니다.
 */

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.resolve(__dirname, "../../site/public/data/benchmarks_latest.json");
const OPENROUTER_MODELS_API = "https://openrouter.ai/api/v1/models";

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
      return;
    }
  } catch (err) {
    console.warn(`⚠️ [OpenRouter Fetch] 네트워크 오류 발생 (${err.message}). 기존 수치를 유지합니다.`);
    return;
  }

  if (!apiModels.length) return;

  const modelMap = new Map();
  for (const m of apiModels) {
    if (m.id) modelMap.set(m.id.toLowerCase(), m);
  }

  let updatedCount = 0;
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

  if (updatedCount > 0) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log(`💾 [OpenRouter Fetch] ${updatedCount}개 모델 가격/메타데이터 동기화 완료`);
  } else {
    console.log("ℹ️ [OpenRouter Fetch] 변경된 가격 정보가 없거나 기존 데이터와 일치합니다.");
  }
}

fetchOpenRouterModels().catch((err) => {
  console.warn("⚠️ [OpenRouter Fetch] 예외 발생:", err.message);
});
