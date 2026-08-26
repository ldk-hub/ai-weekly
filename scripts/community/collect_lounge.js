#!/usr/bin/env node
/**
 * collect_lounge.js
 * GitHub Discussions → site/public/data/lounge_latest.json
 *
 * 라운지 화면은 정적이라 브라우저에서 Discussions 를 직접 못 읽는다 (GraphQL 은 토큰이 필수인데
 * 정적 사이트에 토큰을 넣을 수는 없다). 그래서 수집 시점에 스냅샷을 떨궈두고 화면은 그것만 읽는다 —
 * cc-news·cc-star 와 같은 구조다. LLM 없음, 사실 그대로 옮긴다.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(ROOT, "site", "public", "data", "lounge_latest.json");

const REPO_OWNER = process.env.LOUNGE_REPO_OWNER || "ldk-hub";
const REPO_NAME = process.env.LOUNGE_REPO_NAME || "ai-weekly";
const THREAD_LIMIT = Number(process.env.LOUNGE_THREAD_LIMIT || 30);
const COMMENT_LIMIT = Number(process.env.LOUNGE_COMMENT_LIMIT || 30);
const BODY_MAX = 400;

function ghToken() {
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

const QUERY = `
query($owner:String!, $name:String!, $threads:Int!, $comments:Int!) {
  repository(owner:$owner, name:$name) {
    discussions(first:$threads, orderBy:{field:UPDATED_AT, direction:DESC}) {
      totalCount
      nodes {
        number title url updatedAt createdAt
        category { name emoji }
        author { login avatarUrl }
        comments(last:$comments) {
          totalCount
          nodes { url bodyText createdAt author { login avatarUrl } }
        }
      }
    }
  }
}`;

async function fetchDiscussions(token) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "ai-weekly-lounge/1.0",
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { owner: REPO_OWNER, name: REPO_NAME, threads: THREAD_LIMIT, comments: COMMENT_LIMIT },
    }),
  });
  if (!res.ok) throw new Error(`GitHub GraphQL HTTP ${res.status}`); // 본문에 토큰이 섞이지 않도록 상태코드만
  const body = await res.json();
  if (body.errors) throw new Error(body.errors.map((e) => e.message).join("; "));
  return body.data.repository.discussions;
}

// giscus 는 뉴스 항목 스레드의 제목을 term(= 뉴스 id 해시)으로 만든다.
// 그대로 두면 "github_227805cd2a" 로 보이므로, 배포된 뉴스에서 사람이 읽을 제목을 찾아 붙인다.
function buildTitleMap() {
  const map = new Map();
  const dataDir = path.join(ROOT, "site", "public", "data");
  const files = [path.join(dataDir, "news_latest.json")];
  const archiveDir = path.join(dataDir, "archive");
  if (fs.existsSync(archiveDir)) {
    for (const f of fs.readdirSync(archiveDir).filter((f) => /^news_\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
      files.push(path.join(archiveDir, f));
    }
  }
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(f, "utf8"));
      for (const n of j.news || []) {
        if (n.id && n.title_ko && !map.has(n.id)) map.set(n.id, n.title_ko);
      }
    } catch (e) {
      console.warn(`[lounge] ${path.basename(f)} 파싱 실패: ${e.message}`);
    }
  }
  return map;
}

async function main() {
  const token = ghToken();
  if (!token) {
    console.error("[lounge] GH_TOKEN/GITHUB_TOKEN/gh auth 없음 — 중단 (기존 스냅샷 보존)");
    process.exit(1);
  }

  let discussions;
  try {
    discussions = await fetchDiscussions(token);
  } catch (e) {
    // Discussions 가 아직 꺼져 있으면 여기서 걸린다. 빈 파일로 덮어써 기존 대화를 지우지 않는다.
    console.error(`[lounge] 조회 실패: ${e.message}`);
    console.error("        리포 Settings 에서 Discussions 가 켜져 있는지 확인할 것.");
    process.exit(1);
  }

  const titleMap = buildTitleMap();
  const label = (t) => titleMap.get(t) || t;

  const threads = (discussions.nodes || []).map((d) => ({
    number: d.number,
    title: label(d.title),
    raw_title: d.title,
    url: d.url,
    category: d.category?.name || null,
    author: d.author?.login || null,
    author_avatar: d.author?.avatarUrl || null,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
    comment_count: d.comments?.totalCount || 0,
  }));

  const comments = [];
  for (const d of discussions.nodes || []) {
    for (const c of d.comments?.nodes || []) {
      comments.push({
        thread_number: d.number,
        thread_title: label(d.title),
        url: c.url,
        author: c.author?.login || null,
        author_avatar: c.author?.avatarUrl || null,
        created_at: c.createdAt,
        body: (c.bodyText || "").replace(/\s+/g, " ").trim().slice(0, BODY_MAX),
      });
    }
  }
  comments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const out = {
    generated_at: new Date().toISOString(),
    version: `v${new Date().toISOString().slice(0, 10).replaceAll("-", ".")}`,
    repo: `${REPO_OWNER}/${REPO_NAME}`,
    thread_total: discussions.totalCount || 0,
    threads,
    comments: comments.slice(0, 50),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`✅ 라운지 수집 완료: 스레드 ${threads.length}개 · 댓글 ${out.comments.length}개 → ${OUT}`);
  if (!threads.length) {
    console.log("   (스레드 0개 — 아직 아무도 글을 안 남긴 정상 상태다. giscus 는 첫 댓글이 달려야 스레드를 만든다)");
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
