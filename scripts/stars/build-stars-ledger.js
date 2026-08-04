#!/usr/bin/env node
/**
 * data/stars_ledger.json 생성·갱신.
 *
 * velocity 기준선을 아카이브 "파일명"에서 읽으면 안 된다 — 파일명 규약이
 * 주마다 오갔고(2026-07-20.json 안에는 v2026.07.13 데이터), 그 결과
 * 2026-07-27 런의 stars_gained_7d 전량이 14일 델타로 계산됐다.
 * 원장은 파일 내용의 generated_at 을 관측일로 삼아 날짜 중복을 제거한다.
 *
 * 사용:
 *   node scripts/build-stars-ledger.js              # 아카이브에서 백필
 *   node scripts/build-stars-ledger.js --add <json> # 관측 결과 append
 *                                                   # (github-scout 의 01_github_raw.json)
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const LEDGER = path.join(ROOT, "data", "stars", "stars_ledger.json");
const ARCHIVE_DIR = path.join(ROOT, "data", "archive");

function itemsOf(d) {
  return [...(d.rising || []), ...(d.classic || []), ...(d.pending || [])];
}

function observedDate(d, fallbackName) {
  const g = d.generated_at || d.generated;
  if (typeof g === "string" && /^\d{4}-\d{2}-\d{2}/.test(g)) return g.slice(0, 10);
  return fallbackName;
}

function load() {
  if (!fs.existsSync(LEDGER)) return {};
  return JSON.parse(fs.readFileSync(LEDGER, "utf8"));
}

function record(ledger, repoId, date, stars) {
  if (!repoId || !Number.isFinite(stars) || stars < 0) return;
  const samples = (ledger[repoId] ||= []);
  const existing = samples.find((s) => s.date === date);
  if (existing) {
    existing.stars = Math.max(existing.stars, stars);
    return;
  }
  samples.push({ date, stars });
  samples.sort((a, b) => a.date.localeCompare(b.date));
}

function backfill(ledger) {
  const files = fs
    .readdirSync(ARCHIVE_DIR)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();

  const seenDates = new Set();
  let dupSkipped = 0;
  for (const f of files) {
    let d;
    try {
      d = JSON.parse(fs.readFileSync(path.join(ARCHIVE_DIR, f), "utf8"));
    } catch (e) {
      console.warn(`skip ${f}: ${e.message}`);
      continue;
    }
    const date = observedDate(d, f.replace(".json", ""));
    // 같은 generated_at 이 여러 파일에 복제돼 있다 (파일명 규약 혼재의 흔적)
    if (seenDates.has(date)) {
      dupSkipped++;
      continue;
    }
    seenDates.add(date);
    for (const it of itemsOf(d)) record(ledger, it.id, date, Number(it.stars));
  }
  return { files: files.length, dates: seenDates.size, dupSkipped };
}

function addObservation(ledger, rawPath, date) {
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  const arr = Array.isArray(raw) ? raw : itemsOf(raw);
  let n = 0;
  for (const it of arr) {
    record(ledger, it.id, date, Number(it.stars));
    n++;
  }
  return n;
}

/** 오늘 이전의 가장 최근 표본을 기준선으로 7일 정규화 델타를 낸다. */
function velocity(ledger, repoId, starsNow, today) {
  const samples = (ledger[repoId] || []).filter((s) => s.date < today);
  if (!samples.length) return { v7d: null, reason: "no_baseline" };
  const base = samples[samples.length - 1];
  const days = Math.round(
    (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${base.date}T00:00:00Z`)) / 86400000
  );
  if (days <= 0) return { v7d: null, reason: "bad_interval" };
  const delta = starsNow - base.stars;
  return {
    v7d: Math.round((delta * 7) / days),
    raw_delta: delta,
    interval_days: days,
    baseline_date: base.date,
    normalized: days !== 7,
  };
}

/** 표본 없는 신상(60일 내)은 누적 stars 가 곧 획득분이므로 주간 환산으로 추정한다. */
function estimateV7d(stars, createdDaysAgo) {
  if (createdDaysAgo == null || createdDaysAgo > 60) return null;
  const age = Math.max(createdDaysAgo, 1);
  return Math.min(stars, Math.round((stars * 7) / age));
}

/** 절대 델타가 아니라 주간 성장률로 본다 — 규모가 큰 리포가 자동 우위를 갖지 않게. */
function growthRate(stars, v7d) {
  if (!v7d || v7d <= 0) return 0;
  return v7d / Math.max(stars - v7d, 1);
}

function median(sorted) {
  if (!sorted.length) return 0;
  const m = sorted.length / 2;
  return sorted.length % 2 ? sorted[Math.floor(m)] : (sorted[m - 1] + sorted[m]) / 2;
}

/** 코호트 성장률 중앙값을 33점에 맞춘다(3배=100점). items 의 v7d·growth_rate·velocity_score 를 채운다. */
function scoreVelocity(items) {
  for (const it of items) {
    if (it.v7d == null) {
      it.v7d = estimateV7d(it.stars, it.created_days_ago);
      it.v7d_estimated = it.v7d != null;
    }
    it.growth_rate = growthRate(it.stars, it.v7d);
  }
  const rates = items
    .map((i) => i.growth_rate)
    .filter((r) => r > 0)
    .sort((a, b) => a - b);
  const med = median(rates);
  for (const it of items) {
    it.velocity_score = med > 0 ? Math.min(100, (33.3 * it.growth_rate) / med) : 0;
  }
  return { median_growth_rate: med, measured: rates.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const ledger = load();

  const addIdx = args.indexOf("--add");
  if (addIdx !== -1) {
    const src = args[addIdx + 1];
    const date = args[addIdx + 2];
    if (!src || !date) {
      console.error("usage: --add <observations.json> <YYYY-MM-DD>");
      process.exit(1);
    }
    const n = addObservation(ledger, src, date);
    fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
    console.log(`recorded ${n} observations at ${date}`);
  } else {
    const stats = backfill(ledger);
    fs.writeFileSync(LEDGER, JSON.stringify(ledger, null, 2));
    console.log(
      `backfilled ${Object.keys(ledger).length} repos from ${stats.files} files ` +
        `(${stats.dates} distinct dates, ${stats.dupSkipped} duplicate-date files skipped)`
    );
  }
}

module.exports = { velocity, load, record, estimateV7d, growthRate, scoreVelocity };
