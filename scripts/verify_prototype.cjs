const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  console.log('====================================================');
  console.log('🤖 AI Weekly Prototype Deep Verification Suite');
  console.log('====================================================\n');

  // ----------------------------------------------------------------
  // PART 1: DOM & STATIC VERIFICATION (Cheerio)
  // ----------------------------------------------------------------
  console.log('--- 1. STATIC DOM ANALYSIS (Cheerio) ---');
  const html = fs.readFileSync('site/prototype.html', 'utf8');
  const $ = cheerio.load(html);

  console.log('Title:', $('title').text());

  // 1.1 Navigation & Tabs (A4, A5)
  const navLinks = $('.pn-link');
  console.log('Nav links count (expected 4):', navLinks.length);
  if (navLinks.length !== 4) throw new Error(`Expected 4 nav links, got ${navLinks.length}`);

  const hasLoungeInNav = $('.page-nav').text().includes('라운지');
  const hasLoungeInFoot = $('.footer-links').text().includes('라운지');
  console.log('Lounge in Nav (should be false):', hasLoungeInNav);
  console.log('Lounge in Footer (should be false):', hasLoungeInFoot);
  if (hasLoungeInNav || hasLoungeInFoot) throw new Error('Lounge found in UI!');

  const hasNewBadge = $('.pn-badge-new').length > 0;
  console.log('pn-badge-new exists (should be false):', hasNewBadge);
  if (hasNewBadge) throw new Error('NEW badge found!');

  // 1.2 Views
  ['plugins', 'news', 'starboard', 'benchmarks'].forEach(v => {
    const el = $(`#view-${v}`);
    if (el.length === 0) throw new Error(`Missing view container #view-${v}`);
    console.log(`View #view-${v} exists: true (role="${el.attr('role')}")`);
  });

  // 1.3 Heading Hierarchy (Task 9)
  const headings = [];
  $('h1, h2, h3').each((i, el) => {
    headings.push({ tag: el.tagName, class: $(el).attr('class') || '', text: $(el).text().trim().slice(0, 30) });
  });
  const h2Count = $('h2').length;
  console.log(`Heading counts: H1=${$('h1').length}, H2=${h2Count}, H3=${$('h3').length}`);
  if (h2Count === 0) throw new Error('Heading level 2 missing! Accessibility violation.');

  // 1.4 A1 Highlights
  console.log('A1 Highlighter tokens present:', html.includes('--hl-mint-ink') && html.includes('--hl-lemon-ink'));

  // 1.5 A7 %p Delta values
  const deltas = $('.delta-val');
  console.log('A7 Delta values count:', deltas.length);
  deltas.each((i, el) => console.log('  - Delta text:', $(el).text().trim()));

  // 1.6 A9 Anomaly Velocity Guard
  const anomalyBadge = $('.velocity-badge.is-anomaly');
  console.log('A9 Anomaly badge count:', anomalyBadge.length, 'Text:', anomalyBadge.text().trim());
  if (anomalyBadge.length === 0 || !anomalyBadge.text().includes('≈')) throw new Error('A9 Anomaly badge missing');

  // 1.7 Detail Modal (Task 9)
  const modal = $('#detail-modal-backdrop');
  console.log('Detail Modal exists:', modal.length > 0, 'role:', modal.attr('role'));
  if (modal.length === 0) throw new Error('Task 9 Detail modal dialog missing');

  // 1.8 Audit Engine Items
  const auditMatches = (html.match(/id: "A\d+"/g) || []).length;
  console.log('Audit points in JS engine (expected 15):', auditMatches);
  if (auditMatches !== 15) throw new Error(`Expected 15 audit items, found ${auditMatches}`);

  // 1.9 I18N Attributes
  const i18nElements = $('[data-i18n-ko]');
  console.log('I18N data-i18n-ko element count:', i18nElements.length);
  if (i18nElements.length < 10) throw new Error('Expected at least 10 i18n elements');

  console.log('Static DOM Analysis Passed! ✅\n');

  // ----------------------------------------------------------------
  // PART 2: REAL BROWSER EXECUTION & INTERACTION (Playwright System Chrome)
  // ----------------------------------------------------------------
  console.log('--- 2. REAL BROWSER VERIFICATION (Chrome Headless) ---');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });

  const fileUrl = 'file://' + path.resolve('site/prototype.html');
  await page.goto(fileUrl);

  // 2.1 Viewport Responsive & Overflow Check across 360, 375, 768, 1024, 1440
  console.log('Checking horizontal scroll overflow across viewports:');
  for (const w of [360, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth
    }));
    const pass = scrollWidth <= innerWidth;
    console.log(`  Viewport ${w}px: scrollWidth=${scrollWidth}, innerWidth=${innerWidth} -> ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!pass) throw new Error(`Overflow at viewport ${w}px: scrollWidth (${scrollWidth}) > innerWidth (${innerWidth})`);
  }

  // 2.2 Tab Switching Test
  console.log('\nTesting Tab switching:');
  const tabs = ['news', 'starboard', 'benchmarks', 'plugins'];
  for (const tabKey of tabs) {
    await page.click(`button[data-tab-target="${tabKey}"]`);
    const isVisible = await page.isVisible(`#view-${tabKey}`);
    console.log(`  Switched to [${tabKey}] tab: view visible = ${isVisible}`);
    if (!isVisible) throw new Error(`View #view-${tabKey} is not visible after tab click`);
  }

  // 2.3 Detail Modal Open, Focus Trap & Escape Close
  console.log('\nTesting Detail Modal interaction:');
  await page.click('#card-roast');
  const modalOpen = await page.isVisible('#detail-modal-backdrop');
  const modalTitle = await page.textContent('#modal-title');
  console.log(`  Modal opened: ${modalOpen}, Title: "${modalTitle.slice(0, 35)}..."`);
  if (!modalOpen) throw new Error('Detail modal failed to open upon card click');

  // Test Escape key close
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  const modalClosed = !(await page.isVisible('#detail-modal-backdrop'));
  console.log(`  Modal closed with Escape: ${modalClosed}`);
  if (!modalClosed) throw new Error('Detail modal failed to close upon Escape key');

  // Contrast calculation helpers (WCAG 2.1)
  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  function getContrast(rgb1, rgb2) {
    const parse = (str) => {
      const m = str.match(/\d+(\.\d+)?/g);
      return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
    };
    const [r1, g1, b1] = parse(rgb1);
    const [r2, g2, b2] = parse(rgb2);
    const l1 = getLuminance(r1, g1, b1);
    const l2 = getLuminance(r2, g2, b2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  // 2.4 Theme and Concept Toggle (Coupled: Terminal -> Dark, Editorial -> Light)
  console.log('\nTesting Theme & Concept Switching & Automatic Coupling:');
  // Initial state in Base (dark) -> Toggle to light
  await page.click('#theme-toggle');
  const themeAfter = await page.getAttribute('html', 'data-theme');
  console.log(`  Base theme toggled to: ${themeAfter}`);
  if (themeAfter !== 'light') throw new Error('Theme toggle failed to switch to light in Base mode');

  // Switch to Terminal -> Theme MUST automatically couple to 'dark'
  await page.click('#concept-toggle');
  await page.waitForTimeout(150);
  const conceptAfter1 = await page.getAttribute('html', 'data-concept');
  const themeInTerminal = await page.getAttribute('html', 'data-theme');
  const conceptLabel1 = await page.textContent('#concept-label');
  const themeLabel1 = await page.textContent('#theme-label');
  const themeAriaDisabled1 = await page.getAttribute('#theme-toggle', 'aria-disabled');
  console.log(`  Switched to [${conceptAfter1}]: theme=${themeInTerminal}, conceptLabel="${conceptLabel1}", themeLabel="${themeLabel1}", aria-disabled=${themeAriaDisabled1}`);
  if (conceptAfter1 !== 'terminal') throw new Error('Concept switcher failed to switch to terminal');
  if (themeInTerminal !== 'dark') throw new Error(`Terminal must couple to dark theme, got: ${themeInTerminal}`);
  if (!conceptLabel1.includes('Terminal') || !conceptLabel1.includes('[Dark]')) throw new Error('Terminal concept label mismatch');
  if (!themeLabel1.includes('다크 [고정]')) throw new Error('Terminal theme locked label mismatch');
  if (themeAriaDisabled1 !== 'true') throw new Error('Terminal theme-toggle must have aria-disabled="true"');

  // Verify theme is locked in Terminal mode
  await page.click('#theme-toggle', { force: true });
  const termToast = await page.textContent('#toast');
  const themeAfterAttemptInTerminal = await page.getAttribute('html', 'data-theme');
  console.log(`  Attempted theme toggle in Terminal: theme remains ${themeAfterAttemptInTerminal}, toast: "${termToast}"`);
  if (themeAfterAttemptInTerminal !== 'dark') throw new Error('Theme must remain locked to dark in Terminal');
  if (!termToast.includes('Terminal') || !termToast.includes('다크 전용')) throw new Error('Terminal theme locked toast mismatch');

  // Verify Terminal visual typography & WCAG contrast
  const termStyles = await page.evaluate(() => {
    const cardDesc = document.querySelector('.card-desc');
    const heroH1 = document.querySelector('.hero-h1');
    const logoText = document.querySelector('#logo-text');
    const chipActive = document.querySelector('.chip.is-active');
    const auditBtn = document.querySelector('#audit-inspector-btn');
    return {
      cardDescFont: getComputedStyle(cardDesc).fontFamily,
      heroH1Font: getComputedStyle(heroH1).fontFamily,
      logoTextFont: getComputedStyle(logoText).fontFamily,
      chipBg: getComputedStyle(chipActive).backgroundColor,
      chipColor: getComputedStyle(chipActive).color,
      auditBg: getComputedStyle(auditBtn).backgroundColor,
      auditColor: getComputedStyle(auditBtn).color,
    };
  });
  const chipContrast = getContrast(termStyles.chipBg, termStyles.chipColor);
  const auditContrast = getContrast(termStyles.auditBg, termStyles.auditColor);
  console.log(`  Terminal Typography: cardDescFont="${termStyles.cardDescFont.slice(0, 20)}...", logoTextFont="${termStyles.logoTextFont.slice(0, 20)}..."`);
  console.log(`  Terminal Contrast: Active Chip=${chipContrast.toFixed(2)}:1, Audit Btn=${auditContrast.toFixed(2)}:1`);
  if (!termStyles.cardDescFont.toLowerCase().includes('mono')) throw new Error('Terminal typography must be monospace');
  if (chipContrast < 4.5) throw new Error(`Terminal chip contrast ${chipContrast.toFixed(2)}:1 is below 4.5:1`);
  if (auditContrast < 4.5) throw new Error(`Terminal audit button contrast ${auditContrast.toFixed(2)}:1 is below 4.5:1`);

  // Switch to Editorial -> Theme MUST automatically couple to 'light'
  await page.click('#concept-toggle');
  await page.waitForTimeout(150);
  const conceptAfter2 = await page.getAttribute('html', 'data-concept');
  const themeInEditorial = await page.getAttribute('html', 'data-theme');
  const conceptLabel2 = await page.textContent('#concept-label');
  const themeLabel2 = await page.textContent('#theme-label');
  const themeAriaDisabled2 = await page.getAttribute('#theme-toggle', 'aria-disabled');
  console.log(`  Switched to [${conceptAfter2}]: theme=${themeInEditorial}, conceptLabel="${conceptLabel2}", themeLabel="${themeLabel2}", aria-disabled=${themeAriaDisabled2}`);
  if (conceptAfter2 !== 'editorial') throw new Error('Concept switcher failed to switch to editorial');
  if (themeInEditorial !== 'light') throw new Error(`Editorial must couple to light theme, got: ${themeInEditorial}`);
  if (!conceptLabel2.includes('Editorial') || !conceptLabel2.includes('[Light]')) throw new Error('Editorial concept label mismatch');
  if (!themeLabel2.includes('라이트 [고정]')) throw new Error('Editorial theme locked label mismatch');
  if (themeAriaDisabled2 !== 'true') throw new Error('Editorial theme-toggle must have aria-disabled="true"');

  // Verify theme is locked in Editorial mode
  await page.click('#theme-toggle', { force: true });
  const editToast = await page.textContent('#toast');
  const themeAfterAttemptInEditorial = await page.getAttribute('html', 'data-theme');
  console.log(`  Attempted theme toggle in Editorial: theme remains ${themeAfterAttemptInEditorial}, toast: "${editToast}"`);
  if (themeAfterAttemptInEditorial !== 'light') throw new Error('Theme must remain locked to light in Editorial');
  if (!editToast.includes('Editorial') || !editToast.includes('라이트 전용')) throw new Error('Editorial theme locked toast mismatch');

  // Verify Editorial visual typography & WCAG contrast
  const editStyles = await page.evaluate(() => {
    const cardTitle = document.querySelector('.card-title');
    const heroH1 = document.querySelector('.hero-h1');
    const logoText = document.querySelector('#logo-text');
    return {
      cardTitleFont: getComputedStyle(cardTitle).fontFamily,
      heroH1Font: getComputedStyle(heroH1).fontFamily,
      logoTextFont: getComputedStyle(logoText).fontFamily,
      logoColor: getComputedStyle(logoText).color,
      bg: getComputedStyle(document.body).backgroundColor,
    };
  });
  const logoContrast = getContrast(editStyles.bg, editStyles.logoColor);
  console.log(`  Editorial Typography: cardTitleFont="${editStyles.cardTitleFont.slice(0, 20)}...", logoTextFont="${editStyles.logoTextFont.slice(0, 20)}..."`);
  console.log(`  Editorial Contrast: Logo vs Paper Bg=${logoContrast.toFixed(2)}:1`);
  if (!editStyles.cardTitleFont.toLowerCase().includes('newsreader') && !editStyles.cardTitleFont.toLowerCase().includes('serif')) {
    throw new Error('Editorial card title typography must be serif');
  }
  if (!editStyles.logoTextFont.toLowerCase().includes('newsreader') && !editStyles.logoTextFont.toLowerCase().includes('serif')) {
    throw new Error('Editorial logo typography must be serif');
  }
  if (logoContrast < 4.5) throw new Error(`Editorial logo contrast ${logoContrast.toFixed(2)}:1 is below 4.5:1`);

  // Switch back to Base -> Theme toggle should be unlocked
  await page.click('#concept-toggle');
  const conceptAfter3 = await page.getAttribute('html', 'data-concept');
  const conceptLabel3 = await page.textContent('#concept-label');
  const themeAriaDisabled3 = await page.getAttribute('#theme-toggle', 'aria-disabled');
  console.log(`  Switched back to [${conceptAfter3}]: conceptLabel="${conceptLabel3}", aria-disabled=${themeAriaDisabled3}`);
  if (conceptAfter3 !== 'base') throw new Error('Concept switcher failed to cycle back to base');
  if (!conceptLabel3.includes('Weeklaude [Dark/Light]')) throw new Error('Base concept label mismatch');
  if (themeAriaDisabled3 !== null) throw new Error('Base theme-toggle must not have aria-disabled');

  const baseThemeBefore = await page.getAttribute('html', 'data-theme');
  await page.click('#theme-toggle');
  const baseThemeAfter = await page.getAttribute('html', 'data-theme');
  console.log(`  Base theme toggle unlocked test: ${baseThemeBefore} -> ${baseThemeAfter}`);
  if (baseThemeBefore === baseThemeAfter) throw new Error('Theme toggle should work freely in Base mode');

  // 2.5 I18N Language Toggle & Concept Coupling in English
  console.log('\nTesting I18N Language Switch & English Coupling:');
  await page.click('#lang-toggle');
  const navPluginsText = await page.textContent('#tab-btn-plugins');
  console.log(`  Nav plugins text in EN: "${navPluginsText.trim()}"`);
  if (!navPluginsText.includes('Top Plugins')) throw new Error('I18N language toggle failed to update navigation labels');

  // Cycle to Terminal in EN mode
  await page.click('#concept-toggle');
  const enTermConcept = await page.textContent('#concept-label');
  const enTermTheme = await page.textContent('#theme-label');
  console.log(`  EN Terminal coupling: concept="${enTermConcept}", theme="${enTermTheme}"`);
  if (!enTermConcept.includes('Terminal [Dark]')) throw new Error('EN Terminal concept label mismatch');
  if (!enTermTheme.includes('Dark [Locked]')) throw new Error('EN Terminal theme locked label mismatch');

  // Cycle to Editorial in EN mode
  await page.click('#concept-toggle');
  const enEditConcept = await page.textContent('#concept-label');
  const enEditTheme = await page.textContent('#theme-label');
  console.log(`  EN Editorial coupling: concept="${enEditConcept}", theme="${enEditTheme}"`);
  if (!enEditConcept.includes('Editorial [Light]')) throw new Error('EN Editorial concept label mismatch');
  if (!enEditTheme.includes('Light [Locked]')) throw new Error('EN Editorial theme locked label mismatch');

  // Cycle back to Base in EN mode
  await page.click('#concept-toggle');
  const enBaseConcept = await page.textContent('#concept-label');
  console.log(`  EN Base restored: concept="${enBaseConcept}"`);
  if (!enBaseConcept.includes('Weeklaude [Dark/Light]')) throw new Error('EN Base concept label mismatch');

  // Restore language to KO
  await page.click('#lang-toggle');

  // 2.6 Audit Inspector Precision Targeting Test (All 15 points)
  console.log('\nTesting Audit Inspector precision targeting (A1~A15):');
  await page.click('#audit-inspector-btn');
  const drawerOpen = await page.isVisible('#audit-drawer');
  console.log(`  Audit drawer opened: ${drawerOpen}`);

  for (let i = 1; i <= 15; i++) {
    const id = `A${i}`;
    await page.click(`#audit-card-${id}`);
    await page.waitForTimeout(150);
    const highlighted = await page.$('.inspect-target-highlight');
    if (!highlighted) throw new Error(`Audit point ${id} failed to highlight target element`);
    const targetTag = await highlighted.evaluate(el => el.tagName);
    const targetId = await highlighted.evaluate(el => el.id);
    console.log(`  Audit [${id}] target verified: <${targetTag}> id="${targetId}"`);
  }

  // 2.7 Character Mascot Animation & Sub-Element Integrity
  console.log('\nTesting Character Mascot Logo & Animation:');
  const mascotVisible = await page.isVisible('.mascot-avatar');
  console.log('  Mascot avatar visible:', mascotVisible);
  if (!mascotVisible) throw new Error('Mascot avatar .mascot-avatar is not visible');

  const mascotParts = await page.evaluate(() => {
    const avatar = document.querySelector('.mascot-avatar');
    const head = document.querySelector('.mascot-head-group');
    const eyes = document.querySelector('.mascot-eyes');
    const cursor = document.querySelector('.mascot-cursor');
    const code = document.querySelector('.mascot-code-stream');
    const handL = document.querySelector('.mascot-hand-l');
    const handR = document.querySelector('.mascot-hand-r');
    const sparkle = document.querySelector('.mascot-sparkle');
    return {
      hasParts: !!(avatar && head && eyes && cursor && code && handL && handR && sparkle),
      avatarAnim: getComputedStyle(avatar).animationName,
      headAnim: getComputedStyle(head).animationName,
      eyesAnim: getComputedStyle(eyes).animationName,
      handLAnim: getComputedStyle(handL).animationName,
    };
  });
  console.log('  Mascot parts present:', mascotParts.hasParts);
  console.log(`  Mascot animations: avatar="${mascotParts.avatarAnim}", head="${mascotParts.headAnim}", eyes="${mascotParts.eyesAnim}", hand="${mascotParts.handLAnim}"`);
  if (!mascotParts.hasParts) throw new Error('Missing mascot character SVG component elements');
  if (!mascotParts.avatarAnim.includes('mascot-float')) throw new Error('Mascot float idle animation missing');
  if (!mascotParts.eyesAnim.includes('mascot-eye-sparkle')) throw new Error('Mascot blinking eyes animation missing');
  if (!mascotParts.handLAnim.includes('mascot-tap-l')) throw new Error('Mascot typing hands animation missing');

  // 2.8 Compact Header Dimensions & Above-the-Fold Content
  console.log('\nTesting Compact Header Dimensions & Above-The-Fold Grid:');
  // Desktop 1440px
  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopHeaderBox = await page.locator('.header-container').boundingBox();
  const desktopTopBarBox = await page.locator('.top-bar').boundingBox();
  const desktopH1Box = await page.locator('.hero-h1').boundingBox();
  const desktopGridBox = await page.locator('#view-plugins .card-grid').boundingBox();
  const desktopH1FontSize = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.hero-h1')).fontSize));

  console.log(`  Desktop 1440px: headerHeight=${desktopHeaderBox.height.toFixed(1)}px (target <= 175px, was 252px)`);
  console.log(`  Desktop 1440px: topBarHeight=${desktopTopBarBox.height.toFixed(1)}px (target <= 55px)`);
  console.log(`  Desktop 1440px: h1FontSize=${desktopH1FontSize.toFixed(1)}px (target <= 25px)`);
  console.log(`  Desktop 1440px: cardGridTop=${desktopGridBox.y.toFixed(1)}px (target <= 315px, was 416px)`);

  if (desktopHeaderBox.height > 175) throw new Error(`Desktop header height ${desktopHeaderBox.height}px exceeds 175px threshold`);
  if (desktopTopBarBox.height > 55) throw new Error(`Desktop top bar height ${desktopTopBarBox.height}px exceeds 55px threshold`);
  if (desktopH1FontSize > 25) throw new Error(`Desktop H1 font size ${desktopH1FontSize}px exceeds 25px threshold`);
  if (desktopGridBox.y > 315) throw new Error(`Desktop card grid top ${desktopGridBox.y}px exceeds 315px threshold`);

  // Mobile 375px
  await page.setViewportSize({ width: 375, height: 667 });
  const mobileHeaderBox = await page.locator('.header-container').boundingBox();
  const mobileGridBox = await page.locator('#view-plugins .card-grid').boundingBox();
  console.log(`  Mobile 375px: headerHeight=${mobileHeaderBox.height.toFixed(1)}px (target <= 230px, was 485px)`);
  console.log(`  Mobile 375px: cardGridTop=${mobileGridBox.y.toFixed(1)}px (target <= 400px, was 693px)`);

  if (mobileHeaderBox.height > 230) throw new Error(`Mobile header height ${mobileHeaderBox.height}px exceeds 230px threshold`);
  if (mobileGridBox.y > 400) throw new Error(`Mobile card grid top ${mobileGridBox.y}px exceeds 400px threshold`);
  if (mobileGridBox.y >= 667) throw new Error(`Mobile card grid is pushed below 667px viewport fold`);

  // 2.9 Check console errors
  if (pageErrors.length > 0) {
    console.error('\nBrowser errors encountered:', pageErrors);
    throw new Error('Browser console had errors during test execution');
  }

  await browser.close();

  // ----------------------------------------------------------------
  // PART 3: PROTOTYPE FILE SYNCHRONIZATION INTEGRITY
  // ----------------------------------------------------------------
  console.log('\n--- 3. PROTOTYPE FILE SYNCHRONIZATION INTEGRITY ---');
  const rootProto = fs.readFileSync('prototype.html', 'utf8');
  const siteProto = fs.readFileSync('site/prototype.html', 'utf8');
  if (rootProto !== siteProto) {
    throw new Error('prototype.html and site/prototype.html are not identical!');
  }
  console.log('prototype.html and site/prototype.html are 100% byte identical! ✅');

  console.log('\n====================================================');
  console.log('🎉 ALL DEEP VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================');
})();
