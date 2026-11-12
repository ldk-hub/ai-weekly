#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const { loadSeeds } = require("./seeds");

const EGO_BIN = process.env.EGO_BROWSER_BIN || "ego-browser";

function parseCountToken(raw = "") {
  const s = String(raw || "").replace(/,/g, "").trim();
  const m = s.match(/([\d.]+)\s*([kKmM만천]?)/);
  if (!m) return 0;
  const num = Number(m[1]);
  if (!Number.isFinite(num)) return 0;
  const unit = m[2].toLowerCase();
  if (unit === "k" || unit === "천") return Math.round(num * 1000);
  if (unit === "m") return Math.round(num * 1000000);
  if (unit === "만") return Math.round(num * 10000);
  return Math.round(num);
}

function parseMetaCounts(metaDesc = "", likesText = "") {
  const likesMatch = metaDesc.match(/([\d.,]+\s*[kKmM]?)\s*likes?/i) || likesText.match(/([\d.,]+\s*[kKmM만천]?)\s*(?:개|likes?)/i);
  const repliesMatch = metaDesc.match(/([\d.,]+\s*[kKmM]?)\s*comments?/i);
  return {
    likes: likesMatch ? parseCountToken(likesMatch[1]) : 0,
    reposts: 0,
    replies: repliesMatch ? parseCountToken(repliesMatch[1]) : 0,
    views: 0,
  };
}

function parseMetaCaption(metaDesc = "") {
  const m = String(metaDesc || "").match(/:\s*"([\s\S]*)"\.\s*$/);
  return m ? m[1].trim() : "";
}

function parseMetaDate(metaDesc = "") {
  const m = String(metaDesc || "").match(/-\s*([A-Z][a-z]+ \d{1,2}, \d{4})\s*:/);
  if (!m) return "";
  const ms = Date.parse(`${m[1]} 12:00:00 UTC`);
  return Number.isNaN(ms) ? "" : new Date(ms).toISOString();
}

function enrichItem(raw = {}) {
  const metaCaption = parseMetaCaption(raw.metaDesc);
  const domBody = String(raw.body || "").trim();
  const body = metaCaption && (!domBody || domBody.length < 60 || metaCaption.length > domBody.length)
    ? metaCaption
    : domBody || metaCaption;
  const publish_date = raw.publish_date || parseMetaDate(raw.metaDesc);
  return { ...raw, body, publish_date };
}

function buildEgoScript({ handles, limit = 3, maxAgeHours = 48, spaceName = "instagram-login" }) {
  return `
const HANDLES = ${JSON.stringify(handles)};
const LIMIT = ${Number(limit) || 3};
const CUTOFF_MS = Date.now() - ${Number(maxAgeHours) || 48} * 3600 * 1000;
const SPACE_NAME = ${JSON.stringify(spaceName)};

const task = await taskSpace(SPACE_NAME);
const page = task.page("p1");
const items = [];

try {
  await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const startUrl = await page.url();
  if (startUrl.includes("/accounts/login")) {
    console.log(JSON.stringify({ ok: false, error: "not_authenticated", items: [] }));
    await task.finish({ keep: [] });
    process.exit(0);
  }

  for (const handle of HANDLES) {
    await page.goto(\`https://www.instagram.com/\${encodeURIComponent(handle)}/\`, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
    await page.waitForSelector('main header, a[href*="/p/"], a[href*="/reel/"]', { state: "visible", timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1200);
    if ((await page.url()).includes("/accounts/login")) break;

    const links = await page.evaluate((max) => {
      const seen = new Set();
      const out = [];
      for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
        const href = a.getAttribute("href") || "";
        const m = href.match(/(\\/(?:p|reel)\\/[^/?#]+\\/?)/);
        if (!m || seen.has(m[1])) continue;
        const badge = a.querySelector("svg[aria-label]")?.getAttribute("aria-label") || "";
        if (/고정|pinned/i.test(badge)) continue;
        seen.add(m[1]);
        const img = a.querySelector("img");
        out.push({
          href: m[1],
          thumbnail: img?.src && img.src.startsWith("https://") ? img.src : "",
          previewAlt: img?.alt || "",
        });
        if (out.length >= max) break;
      }
      return out;
    }, LIMIT);

    for (const link of links) {
      const url = \`https://www.instagram.com\${link.href}\`;
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 }).catch(() => {});
      await page.waitForSelector("time[datetime]", { state: "visible", timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(800);

      const post = await page.evaluate(({ author, previewAlt }) => {
        const dt = document.querySelector("time[datetime]")?.getAttribute("datetime") || "";
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute("content") || "";
        const spans = [...document.querySelectorAll("main span, article span")]
          .map((s) => s.innerText?.trim())
          .filter((t) => t && t.length > 10 && !t.startsWith(author + "\\n"));
        const head = String(previewAlt || "").replace(/\\s+/g, " ").trim().slice(0, 20);
        const caption = (head && spans.find((t) => t.replace(/\\s+/g, " ").includes(head)))
          || spans.find((t) => !/^\\d+\\s*(시간|분|일|주|likes?|좋아요)/.test(t))
          || previewAlt
          || metaDesc;
        const likesEl = [...document.querySelectorAll("main a, main button, main span")].find((el) =>
          /좋아요\\s*[\\d,.]+|[\\d,.]+\\s*likes?/i.test(el.innerText || "")
        );
        return { dt, metaDesc, caption: caption.slice(0, 2000), likesText: likesEl?.innerText || "" };
      }, { author: handle, previewAlt: link.previewAlt });

      if (post.dt && Date.parse(post.dt) < CUTOFF_MS) break;
      items.push({
        url,
        author: handle,
        body: post.caption,
        publish_date: post.dt,
        thumbnail: link.thumbnail,
        metaDesc: post.metaDesc,
        likesText: post.likesText,
      });
    }
  }

  console.log(JSON.stringify({ ok: true, count: items.length, items }));
  await task.finish({ keep: [] });
} catch (err) {
  console.log(JSON.stringify({ ok: false, error: err.message, items }));
  await task.finish({ keep: [] }).catch(() => {});
}
`;
}

function collectInstagramEgo(handles, limit = 3, maxAgeHours = 48) {
  if (!handles || !handles.length) return Promise.resolve([]);
  const script = buildEgoScript({ handles, limit, maxAgeHours });
  return new Promise((resolve, reject) => {
    const child = spawn(EGO_BIN, ["nodejs"], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("ego-browser 타임아웃"));
    }, 300000);
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code) => {
      clearTimeout(timer);
      const line = `${stdout}\n${stderr}`.trim().split("\n").reverse().find((l) => l.startsWith('{"ok":'));
      if (!line) return reject(new Error(stderr.trim() || stdout.trim() || `ego-browser 종료 코드 ${code}`));
      try {
        const parsed = JSON.parse(line);
        if (!parsed.ok && parsed.error === "not_authenticated") {
          return reject(new Error("Instagram 로그인 세션 없음 — ego-lite 로그인 필요"));
        }
        resolve((parsed.items || []).map(enrichItem));
      } catch (e) {
        reject(e);
      }
    });
    child.stdin.end(script);
  });
}

module.exports = { parseCountToken, parseMetaCounts, parseMetaCaption, parseMetaDate, enrichItem, buildEgoScript, collectInstagramEgo };

if (require.main === module) {
  const args = process.argv.slice(2);
  const idxU = args.indexOf("--users");
  const idxL = args.indexOf("--limit");
  const users = idxU >= 0 && args[idxU + 1]
    ? args[idxU + 1].split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean)
    : loadSeeds(path.join(__dirname, "..", "..", "data", "social", "seeds.json")).instagram;
  const limit = idxL >= 0 ? Number(args[idxL + 1]) || 3 : 3;
  collectInstagramEgo(users, limit)
    .then((items) => console.log(JSON.stringify({ ok: true, count: items.length, items }, null, 2)))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
