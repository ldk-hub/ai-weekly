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
  await page.waitForTimeout(800);

  // 1. Verify Isometric Canvas, Top Toolbar, and Bottom Status Bar
  const layoutStats = await page.evaluate(() => {
    const canvas = document.getElementById("rct-canvas");
    const rect = canvas?.getBoundingClientRect();
    const toolbarBtns = document.querySelectorAll("#rct-top-toolbar .rct-tb-btn").length;
    const cash = document.getElementById("rct-cash-text")?.textContent?.trim();
    const guests = document.getElementById("rct-guests-text")?.textContent?.trim();
    const rating = document.getElementById("rct-rating-text")?.textContent?.trim();
    return {
      canvasW: rect?.width || 0,
      canvasH: rect?.height || 0,
      toolbarBtns,
      cash,
      guests,
      rating,
    };
  });
  console.log("Overview layout:", layoutStats);
  assert.ok(layoutStats.canvasW > 800 && layoutStats.canvasH > 450, "Canvas dimensions invalid");
  assert.ok(layoutStats.toolbarBtns >= 15, "Toolbar buttons missing");
  assert.ok(layoutStats.cash?.startsWith("$"), "Cash pod missing");
  assert.ok(layoutStats.guests?.includes("명"), "Guests pod missing");
  assert.ok(Number(layoutStats.rating) > 0, "Rating pod missing");

  // Capture screenshot 1: Park Overview
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "rct_sanctuary_overview.png") });

  // 2. Open Rides List -> Click Roller Coaster -> Verify Ride Detail + E/I/N + Mini-Viewport
  await page.click('#rct-top-toolbar [data-win="rides-list"]');
  await page.waitForTimeout(200);
  await page.click('[data-win-key="rides-list"] [data-open-ride]');
  await page.waitForTimeout(350);

  const rideDetailText = await page.locator('[data-win-key="ride-detail"]').innerText();
  assert.ok(rideDetailText.includes("흥미도"), "Excitement stat missing");
  assert.ok(rideDetailText.includes("격렬도"), "Intensity stat missing");
  assert.ok(rideDetailText.includes("멀미도"), "Nausea stat missing");
  const miniCamCount = await page.locator("#rct-ride-minicam").count();
  assert.equal(miniCamCount, 1, "Live mini-viewport canvas missing in ride-detail");

  // 3. Open Custom Coaster Builder via [트랙 편집] or [건설]
  const editTrackBtn = page.locator('[data-ride-edit-track]');
  if ((await editTrackBtn.count()) > 0) {
    await editTrackBtn.click();
    await page.waitForTimeout(250);
  }
  assert.equal(await page.locator('[data-win-key="coaster-builder"]').count(), 1, "Coaster builder window did not open");

  // Open Build window too and check tabs
  await page.click('#rct-top-toolbar [data-win="build"]');
  await page.waitForTimeout(200);
  assert.equal(await page.locator('[data-win-key="build"]').count(), 1, "Build window did not open");

  // Capture screenshot 2: Coaster Builder + Ride Detail + Build Window
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "rct_coaster_builder.png") });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);

  // 4. Open Guests List -> Inspect Peep -> Verify Thoughts & Pincer
  await page.click('#rct-top-toolbar [data-win="guests-list"]');
  await page.waitForTimeout(200);
  await page.click('[data-win-key="guests-list"] [data-open-peep]');
  await page.waitForTimeout(250);
  const peepText = await page.locator('[data-win-key="peep-detail"]').innerText();
  assert.ok(peepText.includes("최근 생각"), "Peep thoughts missing");
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
