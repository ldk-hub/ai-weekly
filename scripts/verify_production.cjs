const fs = require('fs');
const path = require('path');
const http = require('http');
const cheerio = require('cheerio');
const { chromium } = require('playwright');

(async () => {
  console.log('====================================================');
  console.log('🚀 AI Weekly Production Build Deep Verification Suite');
  console.log('====================================================\n');

  // ----------------------------------------------------------------
  // PART 1: DIST & FILE INTEGRITY VERIFICATION
  // ----------------------------------------------------------------
  console.log('--- 1. STATIC & DIST FILE INTEGRITY ---');

  // 1.1 Assert dist/lounge.html DOES NOT EXIST
  const distLounge = path.join(__dirname, '../dist/lounge.html');
  if (fs.existsSync(distLounge)) {
    throw new Error('Fatal: dist/lounge.html exists! Lounge must be removed.');
  }
  console.log('✅ dist/lounge.html does not exist.');

  // 1.2 Verify all 4 production pages exist in dist
  const pages = ['index.html', 'news.html', 'starboard.html', 'benchmarks.html'];
  for (const pageName of pages) {
    const pagePath = path.join(__dirname, '../dist', pageName);
    if (!fs.existsSync(pagePath)) {
      throw new Error(`Fatal: dist/${pageName} is missing!`);
    }
    const html = fs.readFileSync(pagePath, 'utf8');
    const $ = cheerio.load(html);

    // Assert mascot avatar SVG exists
    const mascotSvg = $('svg.mascot-avatar');
    if (mascotSvg.length === 0) {
      throw new Error(`Fatal: svg.mascot-avatar is missing in dist/${pageName}!`);
    }

    // Assert 4 navigation links (no lounge)
    const navLinks = $('.page-nav .pn-link');
    if (navLinks.length !== 4) {
      throw new Error(`Fatal: expected 4 nav links in dist/${pageName}, found ${navLinks.length}`);
    }

    // Assert no lounge in nav or footer
    if ($('.page-nav').text().includes('라운지')) {
      throw new Error(`Fatal: lounge found in .page-nav of dist/${pageName}`);
    }
    if ($('.site-footer').text().includes('라운지')) {
      throw new Error(`Fatal: lounge found in .site-footer of dist/${pageName}`);
    }

    // Assert no pn-badge-new
    if ($('.pn-badge-new').length > 0) {
      throw new Error(`Fatal: .pn-badge-new found in dist/${pageName}`);
    }

    console.log(`✅ dist/${pageName}: mascot SVG present, 4 tabs intact, no lounge, no NEW badge.`);
  }

  // 1.3 Verify context-specific subscription hints
  const subHints = {
    'index.html': { ko: '매주 월요일, 이번 주 도구 요약을 메일로', en: "Every Monday: this week's tools, by email" },
    'news.html': { ko: '매일 아침, 어제의 AI 신호 요약을 메일로', en: "Every morning: yesterday's AI signals, by email" },
    'starboard.html': { ko: '매주, 급성장 리포지토리 Top 10을 메일로', en: "Weekly: top 10 fastest-growing repos, by email" },
    'benchmarks.html': { ko: '점유율·성능 변동이 생기면 메일로', en: "Email me when share or rankings change" },
  };

  for (const [pName, hint] of Object.entries(subHints)) {
    const html = fs.readFileSync(path.join(__dirname, '../dist', pName), 'utf8');
    const $ = cheerio.load(html);
    const hintEl = $('.subscribe-hint');
    if (hintEl.attr('data-i18n-ko') !== hint.ko || hintEl.attr('data-i18n-en') !== hint.en) {
      throw new Error(`Subscription hint mismatch in dist/${pName}: ko=${hintEl.attr('data-i18n-ko')}, en=${hintEl.attr('data-i18n-en')}`);
    }
    console.log(`✅ dist/${pName}: Subscription hint properly contextualized.`);
  }

  // 1.4 Verify Design System MASTER.md highlighter tokens
  const darkMaster = fs.readFileSync(path.join(__dirname, '../design-system/ai-weekly-weeklaude/MASTER.md'), 'utf8');
  const lightMaster = fs.readFileSync(path.join(__dirname, '../design-system/ai-weekly-weeklaude-light/MASTER.md'), 'utf8');
  if (!darkMaster.includes('--hl-mint') || !darkMaster.includes('--hl-mint-ink') || !darkMaster.includes('--bm-down')) {
    throw new Error('Dark MASTER.md missing registered tokens');
  }
  if (!lightMaster.includes('--hl-mint') || !lightMaster.includes('--hl-mint-ink') || !lightMaster.includes('--bm-down')) {
    throw new Error('Light MASTER.md missing registered tokens');
  }
  console.log('✅ Design system documentation registered new highlighter & neutral tokens.');

  // ----------------------------------------------------------------
  // PART 2: REAL BROWSER MULTI-VIEWPORT VERIFICATION
  // ----------------------------------------------------------------
  console.log('\n--- 2. REAL BROWSER MULTI-VIEWPORT EXECUTION ---');

  // Start static file server for dist
  const distDir = path.join(__dirname, '../dist');
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/index.html';
    let filePath = path.join(distDir, reqPath);
    if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.ico': 'image/x-icon',
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise(resolve => server.listen(4173, resolve));
  const baseUrl = 'http://localhost:4173';
  console.log(`Static server running at ${baseUrl}`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const viewports = [360, 375, 768, 1024, 1440];

  try {
    for (const pageName of pages) {
      console.log(`\nTesting page: ${pageName}`);
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));
      page.on('console', msg => {
        if (msg.type() === 'error') pageErrors.push(msg.text());
      });

      await page.goto(`${baseUrl}/${pageName}`, { waitUntil: 'networkidle' });

      // Verify zero console / page errors
      if (pageErrors.length > 0) {
        throw new Error(`Console errors on ${pageName}: ${pageErrors.join(', ')}`);
      }

      // Check overflow on all viewports
      for (const w of viewports) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForTimeout(100);

        const overflow = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerW = window.innerWidth;
          return {
            scrollW,
            innerW,
            isOverflow: scrollW > innerW,
            headerHeight: document.querySelector('.header-container')?.getBoundingClientRect().height || 0
          };
        });

        if (overflow.isOverflow) {
          throw new Error(`Horizontal overflow on ${pageName} at ${w}px! scrollW=${overflow.scrollW}, innerW=${overflow.innerW}`);
        }

        // Header compactness check (Strict verification: Desktop <= 185px, Mobile <= 240px)
        if (w >= 1024 && overflow.headerHeight > 185) {
          throw new Error(`Header height on desktop (${overflow.headerHeight}px) exceeds 185px threshold on ${pageName}`);
        } else if (w <= 480 && overflow.headerHeight > 240) {
          throw new Error(`Header height on mobile (${overflow.headerHeight}px) exceeds 240px threshold on ${pageName}`);
        }

        console.log(`  - ${w}px: OK (scrollW=${overflow.scrollW} <= ${overflow.innerW}, headerHeight=${Math.round(overflow.headerHeight)}px)`);
      }

      // Test theme toggle
      const themeBtn = page.locator('#theme-toggle');
      if (await themeBtn.count() > 0) {
        await themeBtn.click();
        const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
        console.log(`  - Theme toggle clicked: current data-theme = ${theme}`);
      }

      // Test language toggle
      const langBtn = page.locator('#lang-toggle');
      if (await langBtn.count() > 0) {
        await langBtn.click();
        const lang = await page.evaluate(() => document.documentElement.getAttribute('data-lang') || localStorage.getItem('site_lang'));
        console.log(`  - Lang toggle clicked: current lang = ${lang}`);
      }

      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\n====================================================');
  console.log('🎉 ALL PRODUCTION VERIFICATION CHECKS PASSED! 🎉');
  console.log('====================================================\n');
})().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
