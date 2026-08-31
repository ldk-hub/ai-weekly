#!/usr/bin/env node
// 설치 진입점 코드 검사 — 발행 후보의 "설치하면 실행되는" 파일에서 원격 페이로드 로더를 찾는다.
//
// 왜 필요한가: 2026-08-31 damejan80/tokentab(377★) 이 rising 으로 발행됐고, 실제로는
// tokentab/setup.py 가 91.92.47.134:8765 에서 코드를 받아 exec 하는 드로퍼였다.
// stars·growth_rate·출처 수·README 품질은 전부 정상이었다 — 지표로는 판별 불가이고
// 파일을 읽어야만 드러난다. 별 하한선은 큐레이션 정책이고, 탐지는 이 파일이 담당한다.
//
// ponytail: 고정 경로 목록만 본다. 관례를 벗어난 레이아웃(중첩 패키지, monorepo 하위 경로)은
// 놓친다. 놓친 사례가 생기면 tree API(1 req/repo)로 경로를 열거하는 쪽으로 올릴 것.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const IN = path.join(ROOT, ".tmp", "candidates.json");
const REPORT = path.join(ROOT, ".tmp", "install-scan.json");
const MAX_BYTES = 200_000;

/** 설치·임포트 시점에 실행되는 관례적 경로. {name} 은 리포 이름으로 치환된다. */
const ENTRY_PATHS = [
  "package.json",
  "setup.py",
  "pyproject.toml",
  "install.sh",
  "setup.sh",
  "cli.py",
  "{name}/__init__.py",
  "{name}/setup.py",
  "{name}/cli.py",
  "src/{name}/__init__.py",
];

const RE = {
  remoteFetch: /urllib\.request|urlopen|requests\.(get|post)|httpx\.(get|post)|\bfetch\s*\(|\bcurl\s+(-|http)|\bwget\s+(-|http)|http\.client/,
  // 앞에 점·단어문자가 없는 것만 — re.compile / cursor.exec / db.eval 같은 정상 호출을 뺀다.
  // subprocess·child_process 는 넣지 않는다: 별 프로그램을 띄우는 건 정상 도구에도 흔하다.
  // tokentab 이 쓴 건 in-process `exec(compile(...))` 였고, 그게 날카로운 신호다.
  dynamicExec: /(?<![.\w])(exec|eval|compile)\s*\(|new\s+Function\s*\(|vm\.runIn/,
  opaqueDecode: /b64decode|base64\.b64|atob\s*\(|zlib\.decompress|codecs\.decode|marshal\.loads|pickle\.loads/,
};

const IPV4 = /\b(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\b/g;

/**
 * 하드코딩된 공개 IPv4 리터럴을 찾는다. URL 접두사를 요구하면 안 된다 — tokentab 은
 * IP 를 설정 딕셔너리에 문자열로 두고 f-string 으로 URL 을 조립했다:
 *   CONFIG = {"HOST": "91.92.47.134", "PORT": 8765}
 *   f"http://{cfg['HOST']}:{cfg['PORT']}/api/v1/sync"
 * 사설·루프백·링크로컬·문서용(TEST-NET)·멀티캐스트 대역은 제외한다.
 */
function publicIpLiterals(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    // 4자리 버전 문자열이 실제로 존재한다 (2026-08-31 오탐: hermes-agent 의 pyproject.toml
    // 안 `1.2.0.1`·`2.0.13.4` 는 의존성 제약이었다). 버전 문맥의 줄은 건너뛴다.
    if (/version|require|depend|>=|<=|==|~=|!=|\^\d/i.test(line)) continue;
    for (const m of line.matchAll(IPV4)) {
      const o = m.slice(1, 5).map(Number);
      if (o.some((n) => n > 255)) continue;
      const [a, b] = o;
      if (a === 0 || a === 127 || a === 10) continue;
      if (a === 192 && (b === 168 || b === 0)) continue;
      if (a === 172 && b >= 16 && b <= 31) continue;
      if (a === 169 && b === 254) continue;
      if (a === 198 && (b === 18 || b === 19 || b === 51)) continue;
      if (a === 203 && b === 0) continue;
      if (a >= 224) continue;
      out.push(m[0]);
    }
  }
  return out;
}

/** 파일 한 개를 판정한다. 네트워크 없이 테스트 가능하도록 순수 함수로 분리. */
function scanContent(filePath, text) {
  const findings = [];
  const hit = (rule, why) => findings.push({ path: filePath, rule, why });

  // 매니페스트·락파일은 코드가 아니라 메타데이터다. C2 주소는 실행되는 파일에 박힌다.
  const isManifest = /\.(toml|json|lock|cfg|ini|txt|ya?ml)$/.test(filePath);
  const ips = isManifest ? [] : publicIpLiterals(text);
  if (ips.length) {
    hit("hardcoded_public_ip", `도메인 없는 공개 IP 주소가 박혀 있다: ${[...new Set(ips)].join(", ")}`);
  }
  if (RE.remoteFetch.test(text) && RE.dynamicExec.test(text)) {
    hit("remote_fetch_exec", "원격 fetch 와 in-process 동적 실행(exec/eval/compile/new Function)이 같은 파일에 있다");
  }
  if (RE.opaqueDecode.test(text) && RE.dynamicExec.test(text)) {
    hit("opaque_decode_exec", "base64/zlib/pickle 디코드 결과를 동적 실행한다");
  }

  if (filePath.endsWith("package.json")) {
    let pkg;
    try {
      pkg = JSON.parse(text);
    } catch {
      return findings;
    }
    for (const key of ["preinstall", "install", "postinstall"]) {
      const cmd = pkg.scripts?.[key];
      if (typeof cmd === "string" && (RE.remoteFetch.test(cmd) || /https?:\/\//.test(cmd) || /node\s+-e/.test(cmd))) {
        hit("install_script_network", `${key} 스크립트가 외부에서 코드를 받거나 인라인 실행한다: ${cmd.slice(0, 120)}`);
      }
    }
  }
  return findings;
}

async function fetchText(owner, repo, p) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${p}`;
  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": "ai-weekly-install-scan" } });
  } catch {
    return null; // 네트워크 실패는 판정 불가 — 컷하지 않는다
  }
  if (!res.ok) return null;
  const text = await res.text();
  return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
}

/**
 * 매니페스트에서 실제 패키지 진입점 경로를 캐낸다. `{name}` = 리포 이름 추정은 패키지
 * 디렉터리명이 리포명과 같을 때만 맞는다 — 2026-08-31 풀에서 pyproject.toml 을 가진 10건 중
 * 대부분이 그 가정을 벗어나 판정 불가로 빠졌다. tokentab 급 위협이 사는 경로라 한 라운드 더 본다.
 */
function derivedPaths(manifests) {
  const out = new Set();
  const toml = manifests["pyproject.toml"];
  if (toml) {
    const m = toml.match(/^\s*name\s*=\s*["']([A-Za-z0-9._-]+)["']/m);
    if (m) {
      const mod = m[1].replace(/-/g, "_");
      out.add(`${mod}/__init__.py`);
      out.add(`src/${mod}/__init__.py`);
      out.add(`${mod}/setup.py`);
    }
  }
  const pkg = manifests["package.json"];
  if (pkg) {
    try {
      const j = JSON.parse(pkg);
      for (const f of [j.main, ...Object.values(j.bin || {})]) {
        if (typeof f === "string" && /\.(js|mjs|cjs|ts)$/.test(f)) out.add(f.replace(/^\.\//, ""));
      }
    } catch {
      /* 깨진 매니페스트는 판정 불가로 남긴다 */
    }
  }
  return [...out];
}

async function scanRepo(cand) {
  const [owner, repo] = cand.id.split("/");
  if (!owner || !repo) return { id: cand.id, findings: [], checked: [] };
  const paths = [...new Set(ENTRY_PATHS.map((p) => p.replace("{name}", repo)))];
  const read = async (p) => {
    const text = await fetchText(owner, repo, p);
    return text == null ? null : { p, text, findings: scanContent(p, text) };
  };
  const first = (await Promise.all(paths.map(read))).filter(Boolean);

  const manifests = Object.fromEntries(first.map((r) => [r.p, r.text]));
  const extra = derivedPaths(manifests).filter((p) => !paths.includes(p));
  const second = extra.length ? (await Promise.all(extra.map(read))).filter(Boolean) : [];

  const seen = [...first, ...second];
  return {
    id: cand.id,
    stars: cand.stars,
    checked: seen.map((r) => r.p),
    findings: seen.flatMap((r) => r.findings),
  };
}

async function main() {
  const data = JSON.parse(fs.readFileSync(IN, "utf8"));
  const reports = [];
  for (const cand of data.candidates) reports.push(await scanRepo(cand)); // 순차 — raw CDN 에 예의
  const flagged = new Set(reports.filter((r) => r.findings.length).map((r) => r.id));

  for (const r of reports.filter((r) => r.findings.length)) {
    console.error(`✗ ${r.id} (${r.stars}★)`);
    for (const f of r.findings) console.error(`    ${f.path} · ${f.rule} — ${f.why}`);
  }

  data.candidates = data.candidates.filter((c) => !flagged.has(c.id));
  data.install_scan = {
    scanned: reports.length,
    flagged: [...flagged],
    no_entry_file: reports.filter((r) => !r.checked.length).map((r) => r.id),
  };
  fs.writeFileSync(IN, JSON.stringify(data, null, 2));
  fs.writeFileSync(REPORT, JSON.stringify(reports, null, 2));

  const blind = data.install_scan.no_entry_file.length;
  console.log(
    `install-scan: ${reports.length}건 검사, ${flagged.size}건 컷, ` +
      `${blind}건은 관례 경로에 설치 진입점이 없어 판정 못 함 → ${REPORT}`
  );
}

module.exports = { scanContent, publicIpLiterals, derivedPaths, ENTRY_PATHS, RE };
if (require.main === module) main().catch((e) => (console.error(e), process.exit(1)));
