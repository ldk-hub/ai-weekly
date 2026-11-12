# Social Feed Tab ("AI 인플루언서 피드") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** prompt_what, ekke.now 같은 AI 활용 팁·프롬프트 인플루언서의 X·Threads 게시물을 매일 수집·큐레이션해서 새 탭 `social.html`에 한국어 요약 카드 목록으로 보여준다.

**Architecture:** `data/social/seeds.json`(관리용 핸들 화이트리스트) → `scripts/social/collect_social.js`(X: 기존 `searchX("from:handle")`, Threads: 기존 `scrapeSocial("threads",{users})`) → `data/social_candidates.json` → `scripts/social/curate_social.js`(Gemini 주제 필터 + 한국어 요약 + 점수, 인기도 결합 랭킹 상위 20건) → `site/public/data/social_latest.json` + `data/social/YYYY-MM-DD.json` 아카이브 → `site/social.html` 카드 렌더링. 실행은 cc-daily의 새 단계 `cc-social`이 담당.

**Tech Stack:** Node 20 CommonJS, 기존 `scripts/core/agent_reach.js`(twitter-cli), `scripts/core/scrapling_fetch.js` + `scrapling_crawler.py`(Scrapling StealthyFetcher, uv), Gemini `gemini-2.5-flash` REST, Vite 8 멀티 페이지.

## Global Constraints

- 결정사항(grill-me 합의): 시드 계정 화이트리스트 방식 / 요약 카드(한국어 2~3줄 + 작성자 + 원본 링크 + 썸네일 핫링크, 이미지·원문 전체 재호스팅 금지) / Phase 1 = X + Threads, Instagram = Phase 2 / 독립 파이프라인 + 독립 페이지, 하루 최대 20건.
- 신규 npm 의존성 추가 금지 (cheerio, moment-timezone, playwright 이미 존재).
- 자격증명(X 쿠키, `GEMINI_API_KEY`)은 기존 env/agent_reach 경로만 사용, 로그·JSON에 기록 금지.
- CAPTCHA/로그인월 노출 시 해당 소스는 0건 처리하고 경고 로그만 남김(우회 금지).
- 요청 간격: X 핸들 사이 `SOCIAL_X_DELAY_MS`(기본 4000ms), Threads `limit` 계정당 3건.
- 수집 창: 최근 24시간(`SOCIAL_WINDOW_HOURS`, 기본 24). 0건이 나오면 48h로 1회 확장.
- 테스트는 기존 패턴대로 `node:assert` 스크립트 (`node scripts/social/*.test.js`).

---

## 실현 가능성 평가 (Brainstorming 결론)

| 플랫폼 | 수집 경로 | 가능성 | 리스크 |
|---|---|---|---|
| X | `searchX("from:prompt_what", {since})` — 기존 twitter-cli, 부계정 쿠키 | 높음 (cc-news에서 이미 운영 중) | 쿠키 만료 → 기존 Scrapling 폴백 `scrapeSocial("x",{users})` |
| Threads | `scrapeSocial("threads",{users:[...]})` → `threads.net/@handle` 비로그인 SSR | 중간 (프로필 최근 글 일부만 노출, 좋아요 수 누락 가능) | DOM 변경 → `auto_match` 셀렉터, 지표 없으면 LLM 점수만으로 랭킹 |
| Instagram | 로그인 세션 필요 | 낮음 → Phase 2 | 계정 정지·로그인월 |

> ekke.now, prompt_what 류는 Threads/Instagram 중심 계정이 많으므로 시드 파일에 플랫폼별 핸들을 분리해 둔다. 두 계정의 실제 플랫폼 핸들은 Task 1에서 직접 확인 후 기입.

---

### Task 1: 시드 계정 화이트리스트

**Files:**
- Create: `data/social/seeds.json`
- Create: `scripts/social/seeds.js`
- Test: `scripts/social/seeds.test.js`

**Interfaces:**
- Produces: `loadSeeds(file?: string) => { x: string[], threads: string[], instagram: string[] }` (핸들은 `@` 제거·소문자·중복제거)

- [ ] **Step 1: 시드 파일 작성**

```json
{
  "x": ["prompt_what", "ekkenow", "rowancheung", "minchoi", "godofprompt", "heyBarsee"],
  "threads": ["prompt_what", "ekke.now", "choi.openai", "rowancheung"],
  "instagram": ["prompt_what", "ekke.now"]
}
```

- [ ] **Step 2: 실패 테스트 작성** — `scripts/social/seeds.test.js`

```js
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { loadSeeds } = require("./seeds");

const tmp = path.join(os.tmpdir(), "seeds-test.json");
fs.writeFileSync(tmp, JSON.stringify({ x: ["@Foo", "foo", "bar"], threads: ["Baz"] }));
const s = loadSeeds(tmp);
assert.deepStrictEqual(s.x, ["foo", "bar"]);
assert.deepStrictEqual(s.threads, ["baz"]);
assert.deepStrictEqual(s.instagram, []);
assert.ok(loadSeeds().x.length > 0, "기본 시드 파일 로드");
console.log("✅ seeds.test.js 통과");
```

- [ ] **Step 3: 실패 확인** — Run: `node scripts/social/seeds.test.js` → Expected: `Cannot find module './seeds'`

- [ ] **Step 4: 구현** — `scripts/social/seeds.js`

```js
const fs = require("fs");
const path = require("path");

const DEFAULT_FILE = path.join(__dirname, "..", "..", "data", "social", "seeds.json");
const norm = (list) => [...new Set((list || []).map((h) => String(h).replace(/^@/, "").trim().toLowerCase()).filter(Boolean))];

function loadSeeds(file = DEFAULT_FILE) {
  const raw = JSON.parse(fs.readFileSync(file, "utf-8"));
  return { x: norm(raw.x), threads: norm(raw.threads), instagram: norm(raw.instagram) };
}

module.exports = { loadSeeds };
```

- [ ] **Step 5: 통과 확인 후 커밋**

```bash
node scripts/social/seeds.test.js
git add data/social/seeds.json scripts/social/seeds.js scripts/social/seeds.test.js
git commit -m "feat(social): add influencer seed whitelist"
```

---

### Task 2: 수집기 (X + Threads)

**Files:**
- Create: `scripts/social/collect_social.js`
- Test: `scripts/social/collect_social.test.js`
- Modify: `scripts/core/scrapling_crawler.py` (`handle_threads`가 게시물 이미지 `og:image`/첫 `img[src*="cdninstagram"]`을 `thumbnail`로, 좋아요 텍스트를 `metrics.likes`로 반환하도록 필드 추가 — 기존 필드는 유지)

**Interfaces:**
- Consumes: `loadSeeds()`, `searchX(query, opts)` (`scripts/core/agent_reach.js`), `scrapeSocial(platform, {users, limit})` (`scripts/core/scrapling_fetch.js`)
- Produces: `normalizeTweet(t) => Post`, `normalizeThread(item) => Post`, `dedupe(posts) => Post[]`, `collect() => Promise<Post[]>`
- `Post = { id, platform: "x"|"threads", author, url, text, thumbnail, publishedAt, metrics: { likes, reposts, replies, views } }`

- [ ] **Step 1: 실패 테스트 작성** — `scripts/social/collect_social.test.js`

```js
const assert = require("assert");
const { normalizeTweet, normalizeThread, dedupe } = require("./collect_social");

const t = normalizeTweet({
  id: "1", text: "Prompt tip: ...", createdAtISO: "2026-11-12T00:00:00Z",
  author: { screenName: "prompt_what" }, metrics: { likes: 900, retweets: 50, replies: 3, views: 10000 },
  media: [{ url: "https://pbs.twimg.com/a.jpg" }],
});
assert.strictEqual(t.id, "x:1");
assert.strictEqual(t.url, "https://x.com/prompt_what/status/1");
assert.strictEqual(t.metrics.reposts, 50);
assert.strictEqual(t.thumbnail, "https://pbs.twimg.com/a.jpg");

const th = normalizeThread({ url: "https://www.threads.net/@ekke.now/post/ABC", author: "ekke.now", body: "Claude 활용법", publish_date: "2026-11-12T01:00:00Z", metrics: { likes: 120 } });
assert.strictEqual(th.id, "threads:ABC");
assert.strictEqual(th.author, "@ekke.now");
assert.strictEqual(th.metrics.likes, 120);

assert.strictEqual(dedupe([t, t, th]).length, 2);
console.log("✅ collect_social.test.js 통과");
```

- [ ] **Step 2: 실패 확인** — Run: `node scripts/social/collect_social.test.js` → Expected: `Cannot find module`

- [ ] **Step 3: 구현** — `scripts/social/collect_social.js`

```js
#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { loadSeeds } = require("./seeds");
const { searchX } = require("../core/agent_reach");
const { scrapeSocial } = require("../core/scrapling_fetch");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "data", "social_candidates.json");
const WINDOW_H = Number(process.env.SOCIAL_WINDOW_HOURS || 24);
const X_DELAY_MS = Number(process.env.SOCIAL_X_DELAY_MS || 4000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeTweet(t) {
  const handle = (t.author && t.author.screenName) || "i";
  const m = t.metrics || {};
  return {
    id: `x:${t.id}`, platform: "x", author: `@${handle}`,
    url: `https://x.com/${handle}/status/${t.id}`,
    text: String(t.text || ""), thumbnail: (t.media && t.media[0] && t.media[0].url) || "",
    publishedAt: t.createdAtISO,
    metrics: { likes: m.likes || 0, reposts: m.retweets || 0, replies: m.replies || 0, views: m.views || 0 },
  };
}

function normalizeThread(item) {
  const postId = String(item.url || "").split("/post/")[1] || item.url;
  const m = item.metrics || {};
  return {
    id: `threads:${postId}`, platform: "threads", author: `@${String(item.author || "").replace(/^@/, "")}`,
    url: item.url, text: String(item.body || item.title || ""), thumbnail: item.thumbnail || "",
    publishedAt: item.publish_date,
    metrics: { likes: m.likes || 0, reposts: m.reposts || 0, replies: m.replies || 0, views: 0 },
  };
}

function dedupe(posts) {
  const seen = new Set();
  return posts.filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
}

async function collectX(handles, since) {
  const out = [];
  for (const [i, h] of handles.entries()) {
    if (i > 0) await sleep(X_DELAY_MS);
    try {
      const tweets = await searchX(`from:${h}`, { since, max: 10, type: "Latest", exclude: ["replies", "retweets"] });
      out.push(...(tweets || []).map(normalizeTweet));
    } catch (e) {
      console.warn(`[social:x] ${h} 실패: ${e.message}`);
      if (e.message.includes("쿠키 없음")) {
        return scrapeSocial("x", { users: handles, limit: 3 }).map((it) => ({ ...normalizeThread(it), platform: "x", id: `x:${it.url}` }));
      }
    }
  }
  return out;
}

async function collect() {
  const seeds = loadSeeds();
  const sinceMs = Date.now() - WINDOW_H * 3600 * 1000;
  const since = new Date(sinceMs).toISOString().slice(0, 10);
  const xPosts = process.env.SOCIAL_SKIP_X === "1" ? [] : await collectX(seeds.x, since);
  let threadPosts = [];
  if (process.env.SOCIAL_SKIP_THREADS !== "1") {
    try { threadPosts = scrapeSocial("threads", { users: seeds.threads, limit: 3 }).map(normalizeThread); }
    catch (e) { console.warn(`[social:threads] 실패: ${e.message}`); }
  }
  const inWindow = (p) => !p.publishedAt || Date.parse(p.publishedAt) >= sinceMs;
  const posts = dedupe([...xPosts, ...threadPosts]).filter(inWindow);
  console.log(`[social] x=${xPosts.length} threads=${threadPosts.length} → 창 내 ${posts.length}건`);
  return posts;
}

module.exports = { normalizeTweet, normalizeThread, dedupe, collect };

if (require.main === module) {
  collect().then((posts) => {
    fs.writeFileSync(OUT, JSON.stringify({ collectedAt: new Date().toISOString(), posts }, null, 2));
    console.log(`[social] 저장: ${OUT}`);
  });
}
```

- [ ] **Step 4: 크롤러 필드 보강** — `scripts/core/scrapling_crawler.py` `handle_threads`의 계정별 후보 dict에 다음 키 추가 (기존 키 유지):

```python
"thumbnail": (post.css_first('img[src*="cdninstagram"]').attrib.get("src", "") if post.css_first('img[src*="cdninstagram"]') else ""),
```

그리고 `metrics`에 `"likes": parse_count(post)` 추가. 실제 셀렉터 변수명(`post`)은 해당 루프 변수에 맞춘다; 좋아요 노출이 없으면 0.

- [ ] **Step 5: 테스트 + 실데이터 스모크 후 커밋**

```bash
node scripts/social/collect_social.test.js
node scripts/social/collect_social.js   # Expected: [social] x=N threads=M → 창 내 K건
git add scripts/social/collect_social.js scripts/social/collect_social.test.js scripts/core/scrapling_crawler.py
git commit -m "feat(social): collect seed influencer posts from X and Threads"
```

---

### Task 3: 큐레이터 (Gemini 필터·요약 + 랭킹)

**Files:**
- Create: `scripts/social/curate_social.js`
- Test: `scripts/social/curate_social.test.js`

**Interfaces:**
- Consumes: `data/social_candidates.json` (`{ posts: Post[] }`)
- Produces: `popularity(metrics) => number(0~100)`, `rank(items, limit=20) => Item[]`, 출력 `site/public/data/social_latest.json` 및 `data/social/YYYY-MM-DD.json`
- `Item = Post & { title_ko, summary_ko, tags: string[], relevance: number, score: number }`

- [ ] **Step 1: 실패 테스트 작성**

```js
const assert = require("assert");
const { popularity, rank } = require("./curate_social");

assert.strictEqual(popularity({}), 0);
assert.ok(popularity({ likes: 10000, reposts: 1000 }) > popularity({ likes: 100 }));
assert.ok(popularity({ likes: 1e9 }) <= 100);

const items = Array.from({ length: 30 }, (_, i) => ({ id: String(i), relevance: i, metrics: { likes: i * 10 } }));
const r = rank(items, 20);
assert.strictEqual(r.length, 20);
assert.strictEqual(r[0].id, "29");
assert.ok(r.every((x, i) => i === 0 || r[i - 1].score >= x.score));
console.log("✅ curate_social.test.js 통과");
```

- [ ] **Step 2: 실패 확인** — Run: `node scripts/social/curate_social.test.js` → Expected: `Cannot find module`

- [ ] **Step 3: 구현** — `scripts/social/curate_social.js`

```js
#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const ROOT = path.join(__dirname, "..", "..");
const IN = path.join(ROOT, "data", "social_candidates.json");
const LATEST = path.join(ROOT, "site", "public", "data", "social_latest.json");
const ARCHIVE_DIR = path.join(ROOT, "data", "social");
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const API_KEY = process.env.GEMINI_API_KEY;
const LIMIT = Number(process.env.SOCIAL_LIMIT || 20);

const PROMPT = `너는 AI 활용 팁 큐레이터다. 각 게시물에 대해 판단하라.
- drop: AI(생성형 AI, 프롬프트, AI 도구 활용, 에이전트, 모델 소식)와 무관하거나 광고·잡담·답글이면 true
- relevance: 0~100 (실용적 프롬프트/워크플로우/도구 팁일수록 높게)
- title_ko: 30자 이내 한국어 제목
- summary_ko: 한국어 2~3줄 요약(원문 번역 복제 금지, 핵심만 재서술, 본문에 없는 내용 금지)
- tags: 한국어 태그 2~4개
출력: {"items":[{"id":"...","drop":false,"relevance":80,"title_ko":"...","summary_ko":"...","tags":["..."]}]}
id 는 입력값 그대로, 입력 전부에 대해 반환.`;

function popularity(m = {}) {
  const raw = (m.likes || 0) + 3 * (m.reposts || 0) + 2 * (m.replies || 0);
  return raw <= 0 ? 0 : Math.min(100, Math.round(Math.log10(raw + 1) * 20));
}

function rank(items, limit = LIMIT) {
  return items
    .map((it) => ({ ...it, score: Math.round(0.6 * (it.relevance || 0) + 0.4 * popularity(it.metrics)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function callGemini(posts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const payload = posts.map((p) => ({ id: p.id, author: p.author, text: p.text.slice(0, 1500) }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${PROMPT}\n\n게시물:\n${JSON.stringify(payload)}` }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API error: HTTP ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text).items || [];
}

async function main() {
  if (!API_KEY) throw new Error("GEMINI_API_KEY 미설정");
  const { posts = [] } = JSON.parse(fs.readFileSync(IN, "utf-8"));
  const byId = new Map(posts.map((p) => [p.id, p]));
  const judged = [];
  for (let i = 0; i < posts.length; i += 15) judged.push(...(await callGemini(posts.slice(i, i + 15))));
  const kept = judged.filter((j) => !j.drop && byId.has(j.id)).map((j) => ({ ...byId.get(j.id), ...j }));
  const items = rank(kept);
  const date = moment().tz("Asia/Seoul").format("YYYY-MM-DD");
  const out = { date, generatedAt: new Date().toISOString(), count: items.length, items };
  fs.mkdirSync(path.dirname(LATEST), { recursive: true });
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.writeFileSync(LATEST, JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(ARCHIVE_DIR, `${date}.json`), JSON.stringify(out, null, 2));
  console.log(`[social:curate] ${posts.length} → 유지 ${kept.length} → 게시 ${items.length}`);
}

module.exports = { popularity, rank };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 4: 통과 확인 후 커밋**

```bash
node scripts/social/curate_social.test.js
git add scripts/social/curate_social.js scripts/social/curate_social.test.js
git commit -m "feat(social): curate and rank influencer posts with Gemini"
```

---

### Task 4: `social.html` 탭 + 네비게이션

**Files:**
- Create: `site/social.html`, `site/src/pages/social.js`
- Modify: `vite.config.js` (`rollupOptions.input`에 `social: resolve(__dirname, 'site/social.html')` 추가)
- Modify: `site/index.html`, `site/news.html`, `site/starboard.html`, `site/benchmarks.html` 의 상단 탭 네비에 `<a href="social.html">소셜 피드</a>` 추가 (기존 탭 마크업 클래스를 그대로 복사)

**Interfaces:**
- Consumes: `data/social_latest.json` (`{ date, count, items: Item[] }`)

- [ ] **Step 1: 페이지 스크립트** — `site/src/pages/social.js`

```js
const esc = (s) => String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const BADGE = { x: "𝕏", threads: "@ Threads" };

function card(it) {
  const safeUrl = /^https:\/\//.test(it.url) ? it.url : "#";
  const thumb = /^https:\/\//.test(it.thumbnail) ? `<img class="social-thumb" src="${esc(it.thumbnail)}" loading="lazy" referrerpolicy="no-referrer" alt="">` : "";
  return `<article class="social-card">
    ${thumb}
    <div class="social-meta"><span class="badge">${BADGE[it.platform] || it.platform}</span> ${esc(it.author)} · ♥ ${it.metrics?.likes ?? 0}</div>
    <h3>${esc(it.title_ko)}</h3>
    <p>${esc(it.summary_ko).replace(/\n/g, "<br>")}</p>
    <div class="tags">${(it.tags || []).map((t) => `<span>#${esc(t)}</span>`).join(" ")}</div>
    <a href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">원문 보기 →</a>
  </article>`;
}

async function init() {
  const root = document.getElementById("social-list");
  try {
    const res = await fetch("data/social_latest.json", { cache: "no-store" });
    const data = await res.json();
    document.getElementById("social-date").textContent = data.date;
    root.innerHTML = data.items.length ? data.items.map(card).join("") : "<p>오늘 수집된 게시물이 없습니다.</p>";
  } catch {
    root.innerHTML = "<p>데이터를 불러오지 못했습니다.</p>";
  }
}
init();
```

- [ ] **Step 2: HTML** — `site/social.html`: `news.html`의 `<head>`·헤더·탭 네비를 복사하고 본문을 아래로 교체.

```html
<main class="container">
  <h1>AI 인플루언서 피드 <small id="social-date"></small></h1>
  <p class="subtitle">X · Threads의 AI 활용 팁을 매일 골라 한국어로 요약합니다. 원문 저작권은 작성자에게 있습니다.</p>
  <section id="social-list" class="social-grid"></section>
</main>
<script type="module" src="./src/pages/social.js"></script>
```

- [ ] **Step 3: 스타일** — `site/styles.css` 말미에 추가

```css
.social-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.social-card { border: 1px solid var(--border, #e5e7eb); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.social-thumb { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; }
.social-meta { font-size: 13px; opacity: .75; }
.social-card .tags span { font-size: 12px; margin-right: 6px; opacity: .8; }
```

- [ ] **Step 4: 빌드 검증 후 커밋**

```bash
npm run build   # Expected: dist/social.html 생성
ls dist/social.html
git add site/social.html site/src/pages/social.js site/styles.css vite.config.js site/index.html site/news.html site/starboard.html site/benchmarks.html
git commit -m "feat(social): add social feed tab"
```

---

### Task 5: 파이프라인 연결 (`cc-social` 스킬 + cc-daily)

**Files:**
- Modify: `package.json` scripts에 `"data:social": "node scripts/social/collect_social.js && node scripts/social/curate_social.js"` 추가
- Create: `.agents/skills/cc-social/SKILL.md`
- Modify: `.agents/skills/cc-daily/SKILL.md` (cc-news 다음 단계로 `npm run data:social` 추가, 실패 시 전체 파이프라인을 멈추지 않고 경고만)

- [ ] **Step 1: SKILL.md 작성**

```markdown
---
name: cc-social
description: X·Threads AI 인플루언서(시드 화이트리스트) 게시물을 수집·한국어 요약해 social.html 탭에 배포. 트리거: cc-social, 소셜 피드 갱신
---
# cc-social
1. `npm run data:social` 실행
2. 로그의 `[social] x=N threads=M` 확인 — 둘 다 0이면 X 쿠키(`scripts/core/rdt-login.sh` 경로)와 Threads 로그인월 여부를 사용자에게 보고 (우회 금지)
3. `site/public/data/social_latest.json` count ≥ 1 확인 후 `npm run build`
4. 시드 추가/삭제는 `data/social/seeds.json`만 수정
```

- [ ] **Step 2: E2E 실행 및 커밋**

```bash
npm run data:social && npm run build && npx vite preview
git add package.json .agents/skills/cc-social/SKILL.md .agents/skills/cc-daily/SKILL.md
git commit -m "feat(social): wire cc-social into daily pipeline"
```

---

### Phase 2 (별도 계획): Instagram

- Scrapling `browser_load_state`로 부계정 세션 복원 후 `instagram.com/<handle>/` 최근 게시물 캡션 수집 → `normalizeInstagram` 추가.
- 계정 정지 리스크 때문에 하루 1회, 시드 10개 이하, 실패 시 즉시 skip.

## Self-Review

- 스펙 커버리지: 시드(T1), X·Threads 수집(T2), AI 주제 필터·요약·20건 랭킹(T3), 새 탭(T4), 데일리(T5), Instagram(Phase 2) — 빠진 항목 없음.
- 타입 일관성: `Post`/`Item`, `loadSeeds`, `scrapeSocial`, `searchX`, `popularity`, `rank` 이름 전 Task 동일.
