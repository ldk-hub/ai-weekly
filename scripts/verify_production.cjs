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

    // Assert Google fonts JetBrains Mono & Newsreader imported
    if (!html.includes('JetBrains+Mono') || !html.includes('Newsreader')) {
      throw new Error(`Fatal: Google fonts (JetBrains Mono / Newsreader) missing in dist/${pageName}`);
    }

    // Assert detail modal dialog accessibility attributes
    const modalPanel = $('.modal-panel');
    if (modalPanel.length === 0 || modalPanel.attr('role') !== 'dialog' || !modalPanel.attr('aria-labelledby')) {
      throw new Error(`Fatal: .modal-panel role="dialog" or aria-labelledby missing in dist/${pageName}`);
    }

    // Assert news fade masks in news.html
    if (pageName === 'news.html') {
      if ($('.chips-scroll-container').length === 0 || $('#news-fade-left').length === 0 || $('#news-fade-right').length === 0) {
        throw new Error('Fatal: news category chips-scroll-container or fade masks missing in dist/news.html');
      }
    }

    console.log(`✅ dist/${pageName}: mascot SVG present, 4 tabs intact, fonts & modal accessible.`);
  }

  // 1.3 Verify context-specific subscription hints and removal of language toggle / i18n attrs
  const subHints = {
    'index.html': '매주 월요일, 이번 주 도구 요약을 메일로',
    'news.html': '매일 아침, 어제의 AI 신호 요약을 메일로',
    'starboard.html': '매주, 급성장 리포지토리 Top 10을 메일로',
    'benchmarks.html': '점유율·성능 변동이 생기면 메일로',
  };

  for (const [pName, hint] of Object.entries(subHints)) {
    const html = fs.readFileSync(path.join(__dirname, '../dist', pName), 'utf8');
    const $ = cheerio.load(html);
    if ($('#lang-toggle').length > 0) {
      throw new Error(`Unexpected #lang-toggle found in dist/${pName}`);
    }
    if ($('[data-i18n-ko], [data-i18n-en]').length > 0) {
      throw new Error(`Leftover data-i18n attribute found in dist/${pName}`);
    }
    const hintText = $('.subscribe-hint').text().trim();
    if (hintText !== hint) {
      throw new Error(`Subscription hint mismatch in dist/${pName}: got "${hintText}", expected "${hint}"`);
    }
    console.log(`✅ dist/${pName}: Korean-only subscription hint & clean HTML verified.`);
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

      // 1. Verify Dark Mode (Signal Terminal Concept)
      const darkStyles = await page.evaluate(() => {
        const docEl = document.documentElement;
        const body = document.body;
        const heroH1 = document.querySelector('.hero-h1') || document.querySelector('h1');
        const activeChip = document.querySelector('.chip.is-active') || document.querySelector('.cat-chip.is-active') || document.querySelector('.signal-chip.is-active') || document.querySelector('.bm-chip.is-active');
        const cardTitle = document.querySelector('.card-title') || document.querySelector('.bm-name') || document.querySelector('.bm-kpi-model');
        const brandName = document.querySelector('.brand-name');
        const card = document.querySelector('.card') || document.querySelector('.bm-kpi-card');
        return {
          theme: docEl.getAttribute('data-theme'),
          bgColor: getComputedStyle(body).backgroundColor,
          bodyFont: getComputedStyle(body).fontFamily,
          heroH1Font: heroH1 ? getComputedStyle(heroH1).fontFamily : '',
          cardTitleFont: cardTitle ? getComputedStyle(cardTitle).fontFamily : '',
          brandNameFont: brandName ? getComputedStyle(brandName).fontFamily : '',
          cardRadius: card ? getComputedStyle(card).borderRadius : '',
          chipColor: activeChip ? getComputedStyle(activeChip).color : '',
          chipBg: activeChip ? getComputedStyle(activeChip).backgroundColor : ''
        };
      });
      console.log(`  - Initial theme: ${darkStyles.theme}, bg=${darkStyles.bgColor}`);
      if (!darkStyles.bodyFont.toLowerCase().includes('mono')) {
        throw new Error(`Signal Terminal dark mode requires monospace font, got: ${darkStyles.bodyFont}`);
      }
      if (darkStyles.bgColor !== 'rgb(9, 13, 19)') {
        throw new Error(`Signal Terminal dark mode requires #090d13 (rgb(9, 13, 19)), got: ${darkStyles.bgColor}`);
      }
      if (darkStyles.cardRadius && darkStyles.cardRadius !== '6px') {
        throw new Error(`Signal Terminal dark mode requires 6px card radius, got: ${darkStyles.cardRadius}`);
      }

      // 2. Test theme toggle -> Switches to Light Mode (Editorial Weekly Concept)
      const themeBtn = page.locator('#theme-toggle');
      if (await themeBtn.count() > 0) {
        await themeBtn.click();
        await page.waitForTimeout(350);
        const lightStyles = await page.evaluate(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const heroH1 = document.querySelector('.hero-h1') || document.querySelector('h1');
          const cardTitle = document.querySelector('.card-title') || document.querySelector('.bm-name') || document.querySelector('.bm-kpi-model');
          const brandName = document.querySelector('.brand-name');
          const card = document.querySelector('.card') || document.querySelector('.bm-kpi-card');
          return {
            theme: docEl.getAttribute('data-theme'),
            bgColor: getComputedStyle(body).backgroundColor,
            heroH1Font: heroH1 ? getComputedStyle(heroH1).fontFamily : '',
            cardTitleFont: cardTitle ? getComputedStyle(cardTitle).fontFamily : '',
            brandNameFont: brandName ? getComputedStyle(brandName).fontFamily : '',
            cardRadius: card ? getComputedStyle(card).borderRadius : ''
          };
        });
        console.log(`  - Theme toggled: ${lightStyles.theme}, bg=${lightStyles.bgColor}, heroFont=${lightStyles.heroH1Font}, cardTitleFont=${lightStyles.cardTitleFont}`);
        if (lightStyles.theme !== 'light') {
          throw new Error(`Expected theme 'light', got '${lightStyles.theme}'`);
        }
        if (lightStyles.bgColor !== 'rgb(252, 250, 246)') {
          throw new Error(`Editorial Weekly light mode requires #fcfaf6 (rgb(252, 250, 246)), got: ${lightStyles.bgColor}`);
        }
        if (!lightStyles.heroH1Font.toLowerCase().includes('newsreader') && !lightStyles.heroH1Font.toLowerCase().includes('serif')) {
          throw new Error(`Editorial Weekly light mode requires serif (Newsreader) hero font, got: ${lightStyles.heroH1Font}`);
        }
        if (lightStyles.cardTitleFont && !lightStyles.cardTitleFont.toLowerCase().includes('newsreader') && !lightStyles.cardTitleFont.toLowerCase().includes('serif')) {
          throw new Error(`Editorial Weekly light mode requires serif (Newsreader) card title font, got: ${lightStyles.cardTitleFont}`);
        }
        if (lightStyles.brandNameFont && !lightStyles.brandNameFont.toLowerCase().includes('newsreader') && !lightStyles.brandNameFont.toLowerCase().includes('serif')) {
          throw new Error(`Editorial Weekly light mode requires serif (Newsreader) brand name font, got: ${lightStyles.brandNameFont}`);
        }
        if (lightStyles.cardRadius && lightStyles.cardRadius !== '4px') {
          throw new Error(`Editorial Weekly light mode requires 4px card radius, got: ${lightStyles.cardRadius}`);
        }
      }

      // 3. Test Detail Modal interaction across pages
      if (pageName === 'index.html') {
        const firstCard = page.locator('.card.plugin-card').first();
        if (await firstCard.count() > 0) {
          await firstCard.click();
          await page.waitForTimeout(150);
          const modalOpen = await page.evaluate(() => {
            const m = document.getElementById('modal');
            return m && m.classList.contains('open') && m.getAttribute('aria-hidden') === 'false';
          });
          if (!modalOpen) throw new Error('Detail modal failed to open on card click in index.html');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(150);
          const modalClosed = await page.evaluate(() => {
            const m = document.getElementById('modal');
            return m && !m.classList.contains('open') && m.getAttribute('aria-hidden') === 'true';
          });
          if (!modalClosed) throw new Error('Detail modal failed to close on Escape key in index.html');
          console.log('  - Detail modal dialog open/close with Escape: OK');
        }
      } else if (pageName === 'starboard.html') {
        const firstCard = page.locator('.card.star-card').first();
        if (await firstCard.count() > 0) {
          await firstCard.click();
          await page.waitForTimeout(150);
          const modalOpen = await page.evaluate(() => {
            const m = document.getElementById('modal');
            return m && m.classList.contains('open') && m.getAttribute('aria-hidden') === 'false';
          });
          if (!modalOpen) throw new Error('Starboard detail modal failed to open on card click');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(150);
          const modalClosed = await page.evaluate(() => {
            const m = document.getElementById('modal');
            return m && !m.classList.contains('open') && m.getAttribute('aria-hidden') === 'true';
          });
          if (!modalClosed) throw new Error('Starboard detail modal failed to close on Escape key');
          console.log('  - Starboard detail modal dialog open/close with Escape: OK');
        }
      } else if (pageName === 'benchmarks.html') {
        const scopeBtn = page.locator('#bm-scope-btn');
        if (await scopeBtn.count() > 0) {
          await scopeBtn.click();
          await page.waitForTimeout(150);
          const modalOpen = await page.evaluate(() => {
            const m = document.getElementById('modal');
            return m && m.classList.contains('open') && m.getAttribute('aria-hidden') === 'false';
          });
          if (!modalOpen) throw new Error('Benchmark scope modal failed to open on #bm-scope-btn click');
          await page.keyboard.press('Escape');
          await page.waitForTimeout(150);
          const modalClosed = await page.evaluate(() => {
            const m = document.getElementById('modal');
            return m && !m.classList.contains('open') && m.getAttribute('aria-hidden') === 'true';
          });
          if (!modalClosed) throw new Error('Benchmark scope modal failed to close on Escape key');
          console.log('  - Benchmark scope modal dialog open/close with Escape: OK');
        }
      }

      // 4. Verify language toggle is removed
      const langCount = await page.locator('#lang-toggle').count();
      if (langCount !== 0) {
        throw new Error(`Expected #lang-toggle to be removed on ${p}, found ${langCount}`);
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
