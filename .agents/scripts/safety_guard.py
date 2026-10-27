#!/usr/bin/env python3
"""
Antigravity 2.0 Safety Guard Hook
위험 명령어 및 파괴적 쿼리를 사전 인터셉트하여 자동 실행을 차단(deny)합니다.

차단 대상:
1. SQL DROP (TABLE, DATABASE, SCHEMA, INDEX 등)
2. SQL TRUNCATE
3. WHERE 절이 누락된 위험한 DELETE (전체 테이블 행 삭제)
4. git push --force / git push -f
5. 프로메테우스 6시간(21,600초) 초과 Range Query (HTTP API 파라미터 및 PromQL Range Vector)
"""

import sys
import json
import re
from datetime import datetime
from urllib.parse import parse_qs, urlparse

SIX_HOURS_SECONDS = 6 * 3600  # 21,600 seconds


def parse_timestamp(val):
    """Unix timestamp (초/밀리초) 또는 ISO-8601 문자열을 초(float)로 변환."""
    if not val:
        return None
    val_str = str(val).strip()
    try:
        ts = float(val_str)
        # 밀리초 단위 판별 (10^11 이상이면 ms로 가정)
        if ts > 1e11:
            return ts / 1000.0
        return ts
    except ValueError:
        pass

    # ISO-8601 파싱 시도
    for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(val_str, fmt).timestamp()
        except ValueError:
            continue
    return None


def parse_duration_to_seconds(duration_str):
    """'5m', '6h', '1d' 등 duration 문자열을 초로 환산."""
    match = re.match(r"^(\d+(?:\.\d+)?)\s*([smhdwMy])$", duration_str.strip())
    if not match:
        return None
    val, unit = float(match.group(1)), match.group(2)
    multipliers = {
        "s": 1,
        "m": 60,
        "h": 3600,
        "d": 86400,
        "w": 604800,
        "M": 2592000,
        "y": 31536000,
    }
    return val * multipliers.get(unit, 0)


def check_prometheus_range(text, args=None):
    """
    프로메테우스 6시간 초과 Range Query 검사.
    1. PromQL range selector (예: [7h], [1d])
    2. query_range API (start, end 차이)
    """
    # 1. PromQL range vector selector [Xh], [Xd] 등 검사
    range_matches = re.findall(r"\[\s*(\d+(?:\.\d+)?\s*[smhdwMy])\s*\]", text)
    for r in range_matches:
        secs = parse_duration_to_seconds(r)
        if secs and secs > SIX_HOURS_SECONDS:
            return (
                True,
                f"PromQL Range Selector [{r}]가 최대 허용 범위(6시간)를 초과합니다 ({int(secs)}초 > {SIX_HOURS_SECONDS}초).",
            )

    # 2. curl / URL query_range 검사
    if "query_range" in text:
        # URL 쿼리 파라미터 탐색
        url_match = re.search(r"https?://[^\s'\"]+|/api/v1/query_range\?[^\s'\"]+", text)
        if url_match:
            raw_url = url_match.group(0)
            parsed = urlparse(raw_url)
            qs = parse_qs(parsed.query)
            start_val = qs.get("start", [None])[0]
            end_val = qs.get("end", [None])[0]
            if start_val and end_val:
                s_ts = parse_timestamp(start_val)
                e_ts = parse_timestamp(end_val)
                if s_ts is not None and e_ts is not None:
                    diff = abs(e_ts - s_ts)
                    if diff > SIX_HOURS_SECONDS:
                        return (
                            True,
                            f"Prometheus query_range 조회 구간이 6시간({SIX_HOURS_SECONDS}초)을 초과합니다: {int(diff)}초.",
                        )

    # 3. args 객체 내 start/end 필드 검사 (MCP 도구 파라미터)
    if args and isinstance(args, dict):
        start = args.get("start")
        end = args.get("end")
        if start and end:
            s_ts = parse_timestamp(start)
            e_ts = parse_timestamp(end)
            if s_ts is not None and e_ts is not None:
                diff = abs(e_ts - s_ts)
                if diff > SIX_HOURS_SECONDS:
                    return (
                        True,
                        f"Prometheus MCP 도구의 조회 구간이 6시간({SIX_HOURS_SECONDS}초)을 초과합니다: {int(diff)}초.",
                    )

    return False, ""


def check_sql_destructive(text):
    """SQL DROP, TRUNCATE, WHERE 없는 DELETE 검사."""
    # 1. DROP 검사 (DROP TABLE, DATABASE, SCHEMA, VIEW, INDEX 등)
    drop_pattern = r"(?i)\bDROP\s+(TABLE|DATABASE|SCHEMA|VIEW|INDEX|PROCEDURE|FUNCTION|TRIGGER)\b"
    if re.search(drop_pattern, text):
        match = re.search(drop_pattern, text).group(0)
        return True, f"파괴적 SQL 명령 감지: '{match}'. 운영 데이터 손실 위험으로 자동 실행이 차단됩니다."

    # 2. TRUNCATE 검사
    truncate_pattern = r"(?i)\bTRUNCATE(\s+TABLE)?\s+[`\"']?\w+"
    if re.search(truncate_pattern, text):
        match = re.search(truncate_pattern, text).group(0)
        return True, f"파괴적 SQL 명령 감지: '{match}'. 테이블 전체 초기화 위험으로 자동 실행이 차단됩니다."

    # 3. DELETE (WHERE 절 누락 검사)
    delete_pattern = r"(?i)\bDELETE\s+FROM\s+[`\"']?(\w+)[`\"']?"
    for m in re.finditer(delete_pattern, text):
        # DELETE 구문 뒤의 세미콜론이나 문장 끝까지 추출
        start_idx = m.start()
        stmt = text[start_idx:]
        end_idx = stmt.find(";")
        if end_idx != -1:
            stmt = stmt[:end_idx]
        else:
            # 파이프라인이나 다음 커맨드 분리(&&, ||, \n)
            split_m = re.search(r"(&&|\|\||\n)", stmt)
            if split_m:
                stmt = stmt[:split_m.start()]

        if not re.search(r"(?i)\bWHERE\b", stmt):
            table_name = m.group(1)
            return (
                True,
                f"WHERE 절이 누락된 DELETE 명령 감지: 테이블 '{table_name}'의 전체 레코드 삭제 위험으로 차단되었습니다. 반드시 WHERE 조건 또는 대상 행 수 확인이 필요합니다.",
            )

    return False, ""


def check_git_force_push(command_line):
    """git push --force 또는 -f 검사."""
    git_push_pattern = r"(?i)\bgit\s+push\b.*(\s+-[a-zA-Z]*f[a-zA-Z]*|\s+--force\b|\s+--force-with-lease\b)"
    if re.search(git_push_pattern, command_line):
        return (
            True,
            "원격 이력 덮어쓰기 위험 감지: 'git push --force' 계열 명령은 원격 커밋 손실 위험으로 자동 실행이 차단됩니다. 명시적 사용자 승인을 받으십시오.",
        )
    return False, ""


def evaluate_safety(payload):
    """Hook 입력 페이로드를 평가하여 allow 또는 deny 결정."""
    tool_call = payload.get("toolCall", {})
    tool_name = tool_call.get("name", "")
    args = tool_call.get("args", {})

    # 1. run_command 검사
    if tool_name == "run_command":
        cmd = args.get("CommandLine", "")

        # git push --force 검사
        blocked, reason = check_git_force_push(cmd)
        if blocked:
            return {"decision": "deny", "reason": reason}

        # SQL 파괴적 명령 검사
        blocked, reason = check_sql_destructive(cmd)
        if blocked:
            return {"decision": "deny", "reason": reason}

        # Prometheus Range 검사
        blocked, reason = check_prometheus_range(cmd, args)
        if blocked:
            return {"decision": "deny", "reason": reason}

    # 2. call_mcp_tool 검사
    elif tool_name == "call_mcp_tool":
        server_name = args.get("ServerName", "")
        tool_action_name = args.get("ToolName", "")
        mcp_args = args.get("Arguments", {})
        combined_text = f"{server_name} {tool_action_name} {json.dumps(mcp_args, ensure_ascii=False)}"

        # SQL 파괴적 명령 검사 (쿼리 인자 등)
        blocked, reason = check_sql_destructive(combined_text)
        if blocked:
            return {"decision": "deny", "reason": f"[MCP {server_name}/{tool_action_name}] {reason}"}

        # Prometheus Range 검사
        blocked, reason = check_prometheus_range(combined_text, mcp_args)
        if blocked:
            return {"decision": "deny", "reason": f"[MCP {server_name}/{tool_action_name}] {reason}"}

    # 기본 통과
    return {"decision": "allow"}


def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            # 빈 입력 시 기본 통과
            print(json.dumps({"decision": "allow"}))
            return

        payload = json.loads(raw_input)
        result = evaluate_safety(payload)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        # 안전 훅 에러 시 안전을 위해 에러 내용과 함께 통과 또는 로깅
        # JSON 규격을 준수하여 출력
        err_response = {
            "decision": "deny",
            "reason": f"Safety Guard 훅 실행 중 예외 발생으로 안전 차단되었습니다: {str(e)}",
        }
        print(json.dumps(err_response, ensure_ascii=False))


if __name__ == "__main__":
    main()
