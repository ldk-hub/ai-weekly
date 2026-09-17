# Technical Portfolio Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect and redesign `https://ldk-hub.github.io/portfolio/` into a modern, emoji-free, high-impact technical portfolio highlighting "Senior Full-Stack & AI Systems Engineer" identity.

**Architecture:** Split styles into a dedicated module `_sass/_portfolio.scss` imported into `assets/css/main.scss`. Restructure `_pages/portfolio.md` using semantic HTML/Markdown components: Hero Showcase, 3-Column Responsive Overview Matrix Cards, and STAR Detailed Engineering Highlights. Sync cross-page titles in `_pages/about.md` and `_data/authors.yml`.

**Tech Stack:** Jekyll, Liquid, SCSS, HTML5, Kramdown GFM, Git/GitHub Pages.

## Global Constraints

- Absolute prohibition on emojis (No 🤖, 🎮, ⚡, 🌟 etc.). Use clean numbering (`01`, `02`, `03`) and monospace uppercase tags.
- Target Title: `Senior Full-Stack & AI Systems Engineer (8+ Years)`.
- 100% compatibility with Minimal Mistakes Jekyll dark theme variables (`var(--background-color)`, `$primary-color`).
- Mobile responsiveness: Grid collapses smoothly to single column on mobile (max-width: 768px) with no horizontal overflow.

---

### Task 1: Style System & SCSS Module Setup

**Files:**
- Create: `/Users/nhn/Desktop/ldk-hub.github.io/_sass/_portfolio.scss`
- Modify: `/Users/nhn/Desktop/ldk-hub.github.io/assets/css/main.scss`

**Interfaces:**
- Consumes: Minimal Mistakes theme variables in `_sass/`
- Produces: CSS classes `.pf-hero`, `.pf-metrics`, `.pf-matrix`, `.pf-detail`, `.pf-star-block` for `_pages/portfolio.md`

- [ ] **Step 1: Write `_sass/_portfolio.scss`**
Implement the portfolio style sheet defining typography, ambient dark cards, metric grids, badge pills, and responsive layout.

- [ ] **Step 2: Import `_portfolio.scss` into `assets/css/main.scss`**
Add `@import "portfolio";` at the bottom of `assets/css/main.scss`.

- [ ] **Step 3: Verify SCSS syntax**
Run `sass` check or verify file syntax to ensure clean compilation.

- [ ] **Step 4: Commit Task 1**
```bash
cd /Users/nhn/Desktop/ldk-hub.github.io
git add _sass/_portfolio.scss assets/css/main.scss
git commit -m "style(portfolio): add modular portfolio scss design system"
```

---

### Task 2: Reconstruct `_pages/portfolio.md`

**Files:**
- Modify: `/Users/nhn/Desktop/ldk-hub.github.io/_pages/portfolio.md`

**Interfaces:**
- Consumes: CSS classes from `_portfolio.scss`
- Produces: Full portfolio content with Hero, Matrix Cards, and STAR storytelling.

- [ ] **Step 1: Replace `_pages/portfolio.md` content**
Implement the complete, emoji-free markdown and HTML markup including:
- Hero Showcase with 4 impact metrics
- 3-Column Overview Matrix Cards
- Project 01: AI Weekly 2.0 (hybrid deterministic collector, 3-second scanning, Starboard 3-tier leagues, Obsidian vault sync)
- Project 02: bmad-2d-monitor (Konva.js 2D canvas, Y-sorting algorithm, FSM agent animation, Spring AI & pgvector)
- Project 03: DashBoard (Oracle to PG migration, JPA N+1 fetch join tuning, Spring proxy pattern, SpotBugs)

- [ ] **Step 2: Verify markup structure**
Check that all links, image paths (`/assets/images/...`), and classes match `_portfolio.scss`.

- [ ] **Step 3: Commit Task 2**
```bash
cd /Users/nhn/Desktop/ldk-hub.github.io
git add _pages/portfolio.md
git commit -m "feat(portfolio): redesign portfolio page with hero metrics, overview cards, and star highlights"
```

---

### Task 3: Cross-Page Identity Synchronization

**Files:**
- Modify: `/Users/nhn/Desktop/ldk-hub.github.io/_pages/about.md`
- Modify: `/Users/nhn/Desktop/ldk-hub.github.io/_data/authors.yml`

**Interfaces:**
- Consumes: Identity title `Senior Full-Stack & AI Systems Engineer (8+ Years)`
- Produces: Consistent site-wide author profile and about page.

- [ ] **Step 1: Update `_pages/about.md`**
Change `Senior Full-Stack & AI Harness Engineer` to `Senior Full-Stack & AI Systems Engineer` in title/bio.

- [ ] **Step 2: Update `_data/authors.yml`**
Update `bio` field under `ldk:` to `Senior Full-Stack & AI Systems Engineer (8+ Years)`.

- [ ] **Step 3: Commit Task 3**
```bash
cd /Users/nhn/Desktop/ldk-hub.github.io
git add _pages/about.md _data/authors.yml
git commit -m "chore(identity): update engineer title to Senior Full-Stack & AI Systems Engineer"
```

---

### Task 4: Verification & Local Testing

**Files:**
- Verify: `/Users/nhn/Desktop/ldk-hub.github.io/_pages/portfolio.md`
- Verify: `/Users/nhn/Desktop/ldk-hub.github.io/_sass/_portfolio.scss`
- Verify: All asset paths and links

- [ ] **Step 1: Run link & image path verification**
Ensure all local image assets referenced in `portfolio.md` exist under `assets/images/`.

- [ ] **Step 2: Check responsive layout constraints**
Confirm card grid CSS has `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))` and zero horizontal overflow.

---

### Task 5: Git Push & GitHub Pages Deployment

**Files:**
- Repository: `ldk-hub/ldk-hub.github.io` (branch: `master`)

- [ ] **Step 1: Check git log and diff**
Review recent commits on `master` branch.

- [ ] **Step 2: Push commits to remote**
```bash
cd /Users/nhn/Desktop/ldk-hub.github.io
git push origin master
```

- [ ] **Step 3: Verify deployment status**
Use `gh run list` or check repository deployment.
