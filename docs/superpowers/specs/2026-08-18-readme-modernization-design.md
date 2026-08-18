# Design Spec: README.md Comprehensive Modernization

**Date:** 2026-08-18  
**Author:** ldk-hub  
**Status:** In Review  

---

## 1. Objective & Scope

Update `README.md` to accurately reflect the latest project architecture, execution pipelines, data contracts, and build tools. Outdated paths (`scripts/collect_news.js`), obsolete sources (`arXiv`, `YouTube`), and legacy web server commands (`python3 -m http.server`) will be updated to match the current Vite-based repository structure and modular `scripts/` directory.

---

## 2. Key Sections to Modernize

### 2.1 Overview & Header Badges
- **Title & Catchphrase**: Keep the clean branding and badge lineup.
- **Service Pillars**:
  1. **📰 AI 뉴스 (AI News / cc-news)**: Daily AI tech signals with 3-bullet summaries and 5-10 sentence deep dives across 7 fixed platforms.
  2. **🧩 인기 플러그인 (Popular Plugins / cc-trends)**: Weekly Claude Code agent, harness, skill, MCP index with adaptive quotas (Rising vs Classic).
  3. **📈 스타보드 (Starboard / cc-star)**: Daily tracking of 170+ open-source repositories by league and velocity.

### 2.2 Section 1: 📰 AI News Pipeline (`cc-news`)
- **7 Fixed Media Sources**: GeekNews, Hacker News, AI타임스, Reddit, GitHub, X (Twitter), Threads. (Explicitly note elimination of arXiv/YouTube to prevent stale 24h window drift).
- **6-Axis Signal System**: `model`, `product`, `devtool`, `oss`, `research`, `practice` (+ `policy`).
- **Pipeline Architecture**:
  - Deterministic Collection: `node scripts/news/collect_news.js`
  - Curation: `node scripts/news/curate_news.js` / Agent direct curation
  - Validation Gate: `node scripts/news/curate_news.js --validate`
- **Quality Gates**: Strict 3-bullet format, 5-10 sentence bodies, anti-scraping checks, finance article filters (`FINANCE_RE`), mandatory 3-5 item balance per platform.

### 2.3 Section 2: 🧩 Popular Plugins & Trends (`cc-trends`)
- **Adaptive Quotas**:
  - 🔥 **Rising** (Max 20): skill 8, mcp 6, agent 4, harness 2
  - ⭐ **Classic** (Max 16): skill 6, mcp 4, agent 4, harness 2
- **Scoring Formula**: `score = 0.4*velocity + 0.3*community_buzz + 0.2*quality + 0.1*recency`
  - Velocity calculated with weekly growth rate cohort normalization against `stars_ledger.json`.
- **Pipeline Architecture**:
  - Collection: `node scripts/plugins/collect.js`
  - Curation: `node scripts/plugins/curate.js`
  - Publish & Post-process: `node scripts/plugins/publish-curated.js` (syncs stars, creates archives, generates RSS & OG)

### 2.4 Section 3: 📈 Starboard (`cc-star`)
- **Crawler & Ledger**: `node scripts/stars/collect-stars.js`
- **Metrics**: 170+ monitored repos, league breakdown (Legend, Premier, Major, Minor), velocity tracking, dormant repo detection, and atomic ledger backup.

### 2.5 Section 4: 📁 Project Structure & NPM Commands
- **Directory Hierarchy**:
  ```
  ai-weekly/
  ├── .agents/skills/    # cc-news, cc-star, cc-trends, ui-ux-pro-max, etc.
  ├── site/              # Vite frontend application (HTML/Vanilla JS/CSS)
  │   └── public/data/   # Live JSON data (news_latest.json, latest.json, stars_*)
  ├── scripts/
  │   ├── core/          # generate-rss.js, generate-og.js, build-archive-index.js
  │   ├── news/          # collect_news.js, curate_news.js
  │   ├── plugins/       # collect.js, curate.js, publish-curated.js
  │   └── stars/         # collect-stars.js, build-stars-ledger.js
  └── data/
      ├── archive/       # Historical weekly/daily JSON archives
      └── stars/         # stars_ledger.json, stars_meta.json
  ```
- **NPM Scripts**:
  - `npm run dev`: Start Vite local development server
  - `npm run build`: Build production assets (`vite build`)
  - `npm run preview`: Preview built production bundle
  - `npm run data:news`: Collect and curate daily news
  - `npm run data:stars`: Update Starboard repository metrics
  - `npm run data:plugins`: Collect and curate plugin trends
  - `npm run data:publish`: Publish curated trends to latest and archive

---

## 3. Review & Verification
- Verify all links, script paths, and command flags against the actual repository structure.
- Ensure formatting is clean, engaging, and in GitHub Flavored Markdown.
