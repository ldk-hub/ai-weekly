#!/usr/bin/env node
// Agent-Reach 업스트림 CLI(twitter-cli·rdt-cli) 공용 진입점 — cc-news(fetchX)·cc-weekly(community-scout)가 같이 쓴다.
// 두 CLI 는 쿠키가 없거나 만료되면 브라우저(본계정) 쿠키를 자동으로 꺼낸다. browser-cookie3 는 tool venv 에서 지웠고
// rdt 의 `uv run --with browser-cookie3` 경로는 PATH 에서 uv 를 빼서 막는다. 그래서 `twitter`/`rdt` 를 직접 부르지 말고 여기를 거친다.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const HOME = os.homedir();
const BIN = path.join(HOME, ".local", "bin");
const SAFE_PATH = "/usr/bin:/bin:/usr/sbin:/sbin";
const TIMEOUT_MS = Number(process.env.AGENT_REACH_TIMEOUT_MS || 60000);
const RDT_CREDENTIAL = path.join(HOME, ".config", "rdt-cli", "credential.json");

// agent-reach configure twitter-cookies 가 저장한 값. 토큰은 인자가 아니라 env 로만 넘긴다(ps 노출 방지).
function xCookies() {
  let text = "";
  try { text = fs.readFileSync(path.join(HOME, ".agent-reach", "config.yaml"), "utf8"); } catch { /* 아래 안내 */ }
  const pick = (key) => (text.match(new RegExp(`^${key}:\\s*['"]?([^'"\\s]+)`, "m")) || [])[1];
  const authToken = pick("twitter_auth_token");
  const ct0 = pick("twitter_ct0");
  if (!authToken || !ct0) throw new Error("X 쿠키 없음 — `agent-reach configure twitter-cookies` 먼저 실행");
  return { TWITTER_AUTH_TOKEN: authToken, TWITTER_CT0: ct0 };
}

// 두 CLI 모두 --json 이면 {ok, data | error} 봉투를 쓴다. 실패 시 종료코드가 0 이 아니어도 봉투는 stdout 에 있다.
async function run(bin, args, extraEnv = {}) {
  let stdout;
  try {
    ({ stdout } = await execFileAsync(path.join(BIN, bin), args, {
      env: { HOME, PATH: SAFE_PATH, LANG: "en_US.UTF-8", ...extraEnv },
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      timeout: TIMEOUT_MS,
    }));
  } catch (e) {
    stdout = e.stdout;
    if (!stdout) throw new Error(`${bin} 실행 실패: ${e.message}`);
  }
  const m = String(stdout).match(/\{[\s\S]*\}/);
  let res;
  try { res = JSON.parse(m ? m[0] : stdout); } catch { throw new Error(`${bin} 출력이 JSON 이 아님: ${String(stdout).slice(0, 200)}`); }
  if (!res.ok) {
    const err = res.error || {};
    throw new Error(`${bin} ${err.code || "error"}${err.message ? `: ${err.message}` : ""}`);
  }
  return res.data;
}

async function searchX(query, { since, minLikes, max = 20, type = "Top", has = [], exclude = [] } = {}) {
  const args = ["search", query, "--json", "-n", String(max), "--type", type];
  if (since) args.push("--since", since);
  if (minLikes) args.push("--min-likes", String(minLikes));
  for (const v of has) args.push("--has", v);
  for (const v of exclude) args.push("--exclude", v);
  return run("twitter", args, xCookies());
}

async function searchReddit(query, { subreddit, sort = "relevance", time = "week", limit = 25 } = {}) {
  // credential.json 이 없으면 rdt 가 브라우저 추출부터 시도한다 — 실행 전에 끊는다
  if (!fs.existsSync(RDT_CREDENTIAL)) throw new Error("Reddit 쿠키 없음 — `bash scripts/core/rdt-login.sh` 먼저 실행");
  const args = ["search", query, "--json", "-n", String(limit), "-s", sort, "-t", time];
  if (subreddit) args.push("-r", subreddit);
  return run("rdt", args);
}

module.exports = { searchX, searchReddit };

if (require.main === module) {
  const [cmd, query, ...rest] = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < rest.length; i += 2) flags[rest[i].replace(/^-+/, "")] = rest[i + 1];
  const n = Number(flags.n) || undefined;
  const job = cmd === "x" && query
    ? searchX(query, { since: flags.since, minLikes: flags["min-likes"], max: n })
    : cmd === "reddit" && query
      ? searchReddit(query, { subreddit: flags.r, sort: flags.s, time: flags.t, limit: n })
      : Promise.reject(new Error(
        '사용법: node scripts/core/agent_reach.js x "<검색어>" [-n 20] [--since YYYY-MM-DD] [--min-likes N]\n'
        + '       node scripts/core/agent_reach.js reddit "<검색어>" [-n 25] [-r 서브레딧] [-t hour|day|week|month|year|all] [-s relevance|hot|top|new|comments]'
      ));
  job.then((data) => console.log(JSON.stringify(data, null, 2)))
    .catch((e) => { console.error(e.message); process.exit(1); });
}
