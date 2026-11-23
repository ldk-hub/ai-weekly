import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "../dist");
const ARTIFACT_DIR = "C:/Users/ok601/.gemini/antigravity/brain/1991a466-48ba-4677-ac4f-cb650ea7c583";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

const server = http.createServer((req, res) => {
  let reqPath = (req.url || "/").split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";
  let filePath = path.join(DIST_DIR, reqPath);
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + ".html")) {
    filePath += ".html";
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(4175, resolve));
const browser = await chromium.launch({ channel: "chrome", headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text();
      // Allow offline external relay WebSocket failures in isolated E2E environment
      if (!txt.includes("WebSocket connection") && !txt.includes("ERR_NAME_NOT_RESOLVED")) {
        consoleErrors.push(txt);
      }
    }
  });

  await page.goto("http://localhost:4175/sanctuary", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // 1. Verify Isometric Canvas, Top Toolbar, Minimap, and Bottom Status Bar
  const layoutStats = await page.evaluate(() => {
    const canvas = document.getElementById("rct-canvas");
    const rect = canvas?.getBoundingClientRect();
    const mmCanvas = document.getElementById("rct-minimap-canvas");
    const mmRect = mmCanvas?.getBoundingClientRect();
    const toolbarBtns = document.querySelectorAll("#rct-top-toolbar .rct-tb-btn").length;
    const cash = document.getElementById("rct-cash-text")?.textContent?.trim();
    const guests = document.getElementById("rct-guests-text")?.textContent?.trim();
    const rating = document.getElementById("rct-rating-text")?.textContent?.trim();
    const buildBtn = document.querySelector('#rct-top-toolbar [data-win="build"]');
    const toolText = document.getElementById("rct-tool-text")?.textContent?.trim() || "";
    const indicatorEl = document.getElementById("rct-tool-indicator");
    const indicatorZ = indicatorEl ? parseInt(getComputedStyle(indicatorEl).zIndex || "0", 10) : 0;
    const docOverflow = document.documentElement.scrollWidth > window.innerWidth;
    return {
      canvasW: rect?.width || 0,
      canvasH: rect?.height || 0,
      minimapW: mmRect?.width || 0,
      minimapH: mmRect?.height || 0,
      toolbarBtns,
      cash,
      guests,
      rating,
      buildHasHighlight: Boolean(buildBtn?.classList.contains("is-highlight") || buildBtn?.classList.contains("is-active")),
      toolText,
      indicatorZ,
      docOverflow,
    };
  });
  console.log("Overview layout:", layoutStats);
  assert.ok(layoutStats.canvasW > 800 && layoutStats.canvasH > 450, "Canvas dimensions invalid");
  assert.ok(layoutStats.minimapW >= 110 && layoutStats.minimapH >= 110, "44x44 minimap canvas missing or hidden");
  assert.ok(layoutStats.toolbarBtns >= 19, "Toolbar buttons missing");
  assert.ok(layoutStats.cash?.startsWith("$"), "Cash pod missing");
  assert.ok(layoutStats.guests?.includes("명"), "Guests pod missing");
  assert.ok(Number(layoutStats.rating) > 0, "Rating pod missing");
  assert.equal(layoutStats.buildHasHighlight, false, "P0-5 failed: Build button should NOT be highlighted on initial inspect boot");
  assert.ok(layoutStats.toolText.includes("확인"), "P0-5 failed: Initial banner should indicate default inspect mode");
  assert.ok(layoutStats.indicatorZ >= 90, `P0-4 failed: #rct-tool-indicator z-index (${layoutStats.indicatorZ}) must be >= 90`);
  assert.equal(layoutStats.docOverflow, false, "Desktop horizontal overflow detected");
  assert.equal(await page.locator("#rct-btn-bgm.is-active").count(), 1, "BGM button should be active by default");

  // Capture screenshot 1: 44x44 Park Overview with Minimap & Perimeter Billboards
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "rct_sanctuary_overview.png") });

  // 1B. Verify Perimeter Billboard Post Reader + Tour + Minimap Plaza Jump
  await page.click("#rct-jump-billboards");
  await page.waitForTimeout(250);
  const bbWin = page.locator('[data-win-key="billboard-post"]');
  assert.equal(await bbWin.count(), 1, "Billboard Post Reader window did not open");
  const firstBbTitle = await bbWin.innerText();
  assert.ok(firstBbTitle.includes("외곽 메가 광고판"), "Billboard reader header missing");

  await page.click('[data-win-key="billboard-post"] [data-bb-nav]:nth-of-type(2)');
  await page.waitForTimeout(200);
  const secondBbTitle = await bbWin.innerText();
  assert.ok(secondBbTitle.includes("#2/24"), "Billboard next tour failed to advance to #2/24");
  await page.click('[data-win-key="billboard-post"] [data-win-close]');
  await page.click("#rct-jump-plaza");
  await page.waitForTimeout(150);

  // 2. Toggle Free Build Mode & Open Rides List -> Click Roller Coaster -> Customize Name/Color
  await page.click("#rct-btn-freebuild");
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#rct-btn-freebuild.is-active").count(), 1, "Free Build Mode did not activate");

  await page.click('#rct-top-toolbar [data-win="rides-list"]');
  await page.waitForTimeout(200);
  await page.click('[data-win-key="rides-list"] [data-open-ride]');
  await page.waitForTimeout(350);

  const rideDetailStats = await page.evaluate(() => {
    const win = document.querySelector('[data-win-key="ride-detail"]');
    const body = win?.querySelector('.rct-win-body');
    const closeSvg = win?.querySelector('.rct-win-close svg');
    return {
      text: win?.innerText || "",
      winOverflow: win ? win.scrollWidth > win.clientWidth : true,
      bodyOverflow: body ? body.scrollWidth > body.clientWidth : true,
      hasCloseSvg: Boolean(closeSvg),
      topPx: win ? parseFloat(win.style.top || "0") : 0,
    };
  });
  assert.ok(rideDetailStats.text.includes("흥미도"), "Excitement stat missing");
  assert.ok(rideDetailStats.text.includes("격렬도"), "Intensity stat missing");
  assert.ok(rideDetailStats.text.includes("멀미도"), "Nausea stat missing");
  assert.equal(rideDetailStats.winOverflow, false, "P0-1 failed: ride-detail window horizontal overflow detected");
  assert.equal(rideDetailStats.bodyOverflow, false, "P0-1 failed: ride-detail body horizontal overflow detected");
  assert.equal(rideDetailStats.hasCloseSvg, true, "P0-3 failed: WCAG close SVG missing in ride-detail");
  assert.ok(rideDetailStats.topPx >= 44, `P0-4 failed: window spawned at top=${rideDetailStats.topPx}px overlapping banner`);
  assert.equal(await page.locator("#rct-ride-minicam").count(), 1, "Live mini-viewport canvas missing in ride-detail");

  await page.fill("#rct-ride-rename-input", "네온 하이퍼 코스터");
  await page.click('[data-ride-rename]');
  await page.waitForTimeout(150);
  const updatedRideTitle = await page.locator('[data-win-key="ride-detail"] .rct-win-titlebar').innerText();
  assert.ok(updatedRideTitle.includes("네온 하이퍼 코스터"), "Ride rename did not update window title");
  if ((await page.locator("[data-ride-color]").count()) > 0) {
    await page.locator("[data-ride-color]").nth(1).click();
    await page.waitForTimeout(100);
  }

  // 3. Open Custom Coaster Builder & Verify 4-Tab 28-Attraction Build Window & 4-Stage Lighting Cycle
  const editTrackBtn = page.locator("[data-ride-edit-track]");
  if ((await editTrackBtn.count()) > 0) {
    await editTrackBtn.click();
    await page.waitForTimeout(250);
  }
  assert.equal(await page.locator('[data-win-key="coaster-builder"]').count(), 1, "Coaster builder window did not open");

  await page.click('#rct-top-toolbar [data-win="build"]');
  await page.waitForTimeout(200);
  assert.equal(await page.locator('[data-win-key="build"]').count(), 1, "Build window did not open");
  for (const bTab of ["gentle", "thrill_water", "shop", "coaster"]) {
    await page.click(`[data-build-tab="${bTab}"]`);
    await page.waitForTimeout(120);
  }
  const coasterTabText = await page.locator('[data-win-key="build"]').innerText();
  assert.ok(coasterTabText.includes("인버티드"), "New inverted coaster missing from Build catalog");

  // Cycle lighting: day -> golden -> night (capture night show) -> cycle -> day
  await page.click("#rct-btn-night");
  await page.waitForTimeout(150);
  assert.equal(await page.locator("#rct-night-label").innerText(), "골든아워", "1st lighting click should enter golden hour");
  await page.click("#rct-btn-night");
  await page.waitForTimeout(300);
  assert.equal(await page.locator("#rct-night-label").innerText(), "야간쇼", "2nd lighting click should enter night fireworks");
  assert.equal(await page.locator("#rct-btn-night.is-active").count(), 1, "Night & fireworks mode did not activate");

  // Capture screenshot 2: Coaster Builder + Ride Detail + 4-Tab Build Window + Night Mode Fireworks
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "rct_coaster_builder.png") });
  await page.click("#rct-btn-night"); // cycle
  await page.click("#rct-btn-night"); // back to day
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // 3A. Test View Options (Rain -> Rainbow) + Spatial Audio Mixer + Polaroid Photo Mode
  await page.click("#rct-btn-view-opts");
  await page.waitForTimeout(200);
  assert.equal(await page.locator('[data-win-key="view-opts"]').count(), 1, "View options window failed to open");
  await page.click('[data-set-weather="rain"]');
  await page.waitForTimeout(120);
  await page.click('[data-set-weather="rainbow"]');
  await page.waitForTimeout(120);
  assert.equal(await page.locator('[data-set-weather="rainbow"].is-active').count(), 1, "Rainbow weather did not activate");
  await page.click('[data-win-open="audio-mixer"]');
  await page.waitForTimeout(200);
  assert.equal(await page.locator('[data-win-key="audio-mixer"] [data-audio-channel="master"]').count(), 1, "Spatial audio mixer missing master channel");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);

  await page.click("#rct-btn-photo");
  await page.waitForTimeout(250);
  assert.equal(await page.locator('[data-win-key="photo-preview"] img').count(), 1, "Polaroid photo preview PNG missing");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);

  // 3B. Check Scenery 3 Tabs (18 Props) & Terraform Surface Brush
  await page.click('#rct-top-toolbar [data-win="scenery"]');
  await page.waitForTimeout(150);
  await page.click('[data-scenery-tab="tech"]');
  await page.waitForTimeout(120);
  const techSceneryText = await page.locator('[data-win-key="scenery"]').innerText();
  assert.ok(techSceneryText.includes("폭죽"), "Firework launcher scenery missing in tech tab");

  await page.click('#rct-top-toolbar [data-win="terraform"]');
  await page.waitForTimeout(150);
  await page.click('[data-set-brush="3"]');
  await page.click('[data-set-surface="sand"]');
  await page.waitForTimeout(120);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);

  // 4. Open Guests List -> External Route Tab -> Spawn & Manual Control + POV HUD
  await page.click('#rct-top-toolbar [data-win="guests-list"]');
  await page.waitForTimeout(200);
  await page.click('[data-guest-tab="external"]');
  await page.waitForTimeout(150);
  const extListText = await page.locator('[data-win-key="guests-list"]').innerText();
  assert.ok(extListText.includes("타경로"), "External-route guests tab missing");
  await page.click('[data-spawn-route="github"]');
  await page.waitForTimeout(250);
  assert.equal(await page.locator("#rct-guest-pov-hud").isVisible(), true, "Guest POV HUD did not appear");
  const povBadge = await page.locator("#rct-pov-badge").innerText();
  assert.ok(povBadge.includes("손님체험 ·"), `P0-2 failed: expected '손님체험 ·' badge, got "${povBadge}"`);
  assert.equal(povBadge.includes("📻 무전기"), false, `P0-2 failed: bad title leaked: "${povBadge}"`);
  const povName = await page.locator("#rct-pov-name").innerText();
  assert.ok(povName.length > 0, "POV guest name empty");

  // Walk with on-screen D-pad & WASD, then inspect peep-detail
  await page.click('[data-pov-move="up"]');
  await page.keyboard.press("KeyW");
  await page.waitForTimeout(300);
  await page.click('#rct-btn-zoom-in');
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "rct_guest_pov.png") });
  await page.click('#rct-pov-exit');
  await page.waitForTimeout(150);

  await page.click('[data-win-key="guests-list"] [data-open-peep]');
  await page.waitForTimeout(250);
  const peepText = await page.locator('[data-win-key="peep-detail"]').innerText();
  assert.ok(peepText.includes("최근 생각"), "Peep thoughts missing");
  assert.ok(peepText.includes("직접 조작"), "Manual control button missing in peep-detail");
  assert.equal(await page.locator('[data-peep-pincer]').count(), 1, "Pincer pickup button missing");

  // 5. Open Staff -> Hire Handyman
  await page.click('#rct-top-toolbar [data-win="staff"]');
  await page.waitForTimeout(200);
  const beforeStaffRows = await page.locator('[data-win-key="staff"] .rct-card-row').count();
  await page.click('[data-staff-hire="handyman"]');
  await page.waitForTimeout(200);
  const afterStaffRows = await page.locator('[data-win-key="staff"] .rct-card-row').count();
  assert.equal(afterStaffRows, beforeStaffRows + 1, "Hiring handyman did not increment staff count");

  // 6. Open AI Weekly Research Data Center -> Verify Tabs
  await page.click('#rct-top-toolbar [data-win="ai-archive"]');
  await page.waitForTimeout(300);
  for (const tab of ["news", "social", "benchmarks", "plugins"]) {
    await page.click(`[data-ai-tab="${tab}"]`);
    await page.waitForTimeout(150);
  }
  const aiRows = await page.locator('[data-win-key="ai-archive"] .rct-card-row').count();
  assert.ok(aiRows > 0, "AI Weekly live data rows missing in AI Research window");

  // 7. Open Scenario Window -> Switch to Forest Frontiers and back to AI Weekly Park
  await page.click('#rct-top-toolbar [data-win="scenario"]');
  await page.waitForTimeout(200);
  await page.click('[data-switch-scenario="forest_frontiers"]');
  await page.waitForTimeout(300);
  await page.click('#rct-top-toolbar [data-win="scenario"]');
  await page.waitForTimeout(150);
  await page.click('[data-switch-scenario="ai_weekly_park"]');
  await page.waitForTimeout(300);

  assert.equal(pageErrors.length, 0, `Uncaught page errors: ${pageErrors.join("; ")}`);
  assert.equal(consoleErrors.length, 0, `Console errors: ${consoleErrors.join("; ")}`);

  console.log("✅ All Playwright E2E checks on /sanctuary passed!");
} finally {
  await browser.close();
  server.close();
}
