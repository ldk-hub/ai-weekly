#!/bin/bash
# Reddit 부계정 쿠키를 rdt-cli 자격 파일로 저장한다.
# `rdt login` 은 브라우저 기본 프로필(본계정) 쿠키를 꺼내므로 쓰지 않는다. 입력값은 화면·인자·로그에 남기지 않는다.
set -euo pipefail

read -rsp "Reddit 쿠키 붙여넣기 (Cookie-Editor → Export → Header String, 입력은 안 보임): " COOKIE
echo
printf '%s' "$COOKIE" | python3 -c '
import json, os, pathlib, sys
raw = sys.stdin.read().strip()
cookies = dict(p.strip().split("=", 1) for p in raw.split(";") if "=" in p)
if "reddit_session" not in cookies:
    sys.exit("reddit_session 쿠키가 없습니다 — reddit.com 에 부계정으로 로그인한 탭에서 내보냈는지 확인")
d = pathlib.Path.home() / ".config" / "rdt-cli"
d.mkdir(parents=True, exist_ok=True)
os.chmod(d, 0o700)
f = d / "credential.json"
# saved_at 을 먼 미래(2100-01-01)로 둬 rdt 의 7일 주기 브라우저 쿠키 재추출을 끈다
data = {"cookies": cookies, "source": "manual:cookie-editor", "username": None,
        "modhash": None, "saved_at": 4102444800, "last_verified_at": None}
fd = os.open(f, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
with os.fdopen(fd, "w") as fh:
    json.dump(data, fh)
os.chmod(f, 0o600)
print(f"저장 완료: {f} (쿠키 {len(cookies)}개)")
'
