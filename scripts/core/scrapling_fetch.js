#!/usr/bin/env node
/**
 * scripts/core/scrapling_fetch.js
 * Node.js 환경에서 Scrapling 기반 스텔스 웹 크롤링 및 소셜 미디어(Threads, X, Instagram) 수집을 실행하는 통합 브릿지.
 */

const fs = require("fs");
const { execFileSync } = require("child_process");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const CRAWLER_SCRIPT = path.join(__dirname, "scrapling_crawler.py");
const UV_BIN = process.env.UV_BIN || (fs.existsSync("/Users/nhn/.local/bin/uv") ? "/Users/nhn/.local/bin/uv" : "uv");

/**
 * 일반 웹페이지 본문 수집 (1단계 TLS Fetcher -> 실패 시 3단계 StealthyFetcher 폴백)
 * @param {string} url - 수집 대상 URL
 * @param {object} options - { timeoutMs, forceStealth, cssSelector }
 * @returns {object|null} - { ok, status, title, body }
 */
function fetchWithScrapling(url, options = {}) {
  const timeoutMs = options.timeoutMs || 15000;
  const args = [
    "run",
    "--with", "scrapling[ai]",
    "python3",
    CRAWLER_SCRIPT,
    "--mode", "fetch",
    "--url", url,
    "--timeout", String(timeoutMs)
  ];

  if (options.forceStealth) {
    args.push("--force-stealth");
  }
  if (options.cssSelector) {
    args.push("--css-selector", options.cssSelector);
  }

  try {
    const stdout = execFileSync(UV_BIN, args, {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: timeoutMs + 10000,
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const lines = stdout.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("{") && line.endsWith("}")) {
        try {
          const res = JSON.parse(line);
          if (res.ok && res.body) return res;
        } catch {}
      }
    }
  } catch (error) {
    console.warn(`[scrapling-bridge] fetch 실패 (${url}):`, error.message);
  }

  return null;
}

/**
 * 소셜 미디어(Threads, X, Instagram) AI 기술 신호 수집
 * @param {'threads'|'x'|'instagram'} platform - 플랫폼 지정
 * @param {object} options - { users, tags, limit }
 * @returns {Array} - 표준 Candidate 객체 배열
 */
function scrapeSocial(platform, options = {}) {
  const timeoutMs = options.timeoutMs || 180000;
  const args = [
    "run",
    "--with", "scrapling[ai]",
    "python3",
    CRAWLER_SCRIPT,
    "--mode", platform,
    "--limit", String(options.limit || 3)
  ];

  if (options.users && options.users.length) {
    args.push("--users", options.users.join(","));
  }
  if (options.tags && options.tags.length) {
    args.push("--tags", options.tags.join(","));
  }

  try {
    const stdout = execFileSync(UV_BIN, args, {
      cwd: ROOT,
      encoding: "utf-8",
      timeout: timeoutMs + 10000,
      maxBuffer: 15 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"]
    });

    const lines = stdout.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith("{") && line.endsWith("}")) {
        try {
          const res = JSON.parse(line);
          if (res.ok && Array.isArray(res.items)) {
            return res.items;
          }
        } catch {}
      }
    }
  } catch (error) {
    console.warn(`[scrapling-bridge] ${platform} 수집 실패:`, error.message);
  }

  return [];
}

module.exports = {
  fetchWithScrapling,
  scrapeSocial
};

if (require.main === module) {
  const [mode, target] = process.argv.slice(2);
  if (mode === "fetch" && target) {
    console.log("Fetching URL:", target);
    const res = fetchWithScrapling(target);
    console.log(res ? `Status ${res.status}, Title: ${res.title}, Body len: ${res.body.length}` : "Failed");
  } else if (["threads", "x", "instagram"].includes(mode)) {
    console.log(`Scraping platform: ${mode}...`);
    const items = scrapeSocial(mode, { limit: 2 });
    console.log(`Found ${items.length} items:`, JSON.stringify(items, null, 2));
  } else {
    console.log("Usage: node scrapling_fetch.js fetch <url> | threads | x | instagram");
  }
}
