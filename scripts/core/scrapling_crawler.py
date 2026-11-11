#!/usr/bin/env python3
"""
scripts/core/scrapling_crawler.py
Scrapling 기반의 고속 적응형 웹 크롤러 및 소셜 미디어(Threads, X, Instagram) 수집 브릿지.

기능:
1. mode=fetch: 일반 웹 URL 본문 추출 (1단계 Fetcher -> 3단계 StealthyFetcher 폴백)
2. mode=threads: Threads 공신 계정 및 AI 태그 기반 최신 기술 신호 스크레이핑
3. mode=x: X(구 트위터) 공식 AI 연구소/인물 최신 트윗 스텔스 스크레이핑
4. mode=instagram: Instagram 공개 AI 채널/게시물 본문 스크레이핑 (세션 쿠키 연동 지원)
"""

import sys
import os
import json
import argparse
from datetime import datetime, timezone
import re

try:
    from scrapling.fetchers import Fetcher, StealthyFetcher
except ImportError:
    print(json.dumps({"ok": False, "error": "scrapling package not installed. Run `uvx --from 'scrapling[ai]' scrapling install` first."}))
    sys.exit(1)

SKIP_PHRASES = [
    "로그인하여", "가입하여", "생각을 공유하거나", "소식을 확인하거나",
    "Don’t miss what’s happening", "People on X are the first",
    "Log in", "Sign up", "팔로워", "팔로잉", "Threads, 자유로운 소통 공간",
    "스레드 1", "최근 대화를 확인해보세요", "이용할 수 없습니다",
    "쿠키를 사용", "JavaScript를 활성화", "앱 다운로드"
]

def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r'\s+\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

def is_noise(text: str) -> bool:
    if not text or len(text.strip()) < 30:
        return True
    return any(p in text for p in SKIP_PHRASES)

def handle_fetch(url: str, timeout: int = 10000, force_stealth: bool = False, css_selector: str = None) -> dict:
    """일반 웹페이지 본문 수집 (1단계 경량 TLS Fetcher -> 명시적 요청 시에만 3단계 StealthyFetcher)"""
    title = ""
    body = ""
    status = 0

    # 1차 시도: cURL-cffi 초고속 TLS 위장 (브라우저를 띄우지 않아 수십 건 병렬 시에도 메모리 안전)
    try:
        fetcher = Fetcher()
        res = fetcher.get(url, timeout=timeout // 1000)
        status = res.status
        if status == 200:
            title = res.css("title::text").get() or ""
            if css_selector:
                selected = res.css(css_selector).getall()
                body = "\n".join(selected)
            else:
                scoped = res.css("article, main, [role='main']").getall()
                body = "\n".join(scoped) if scoped else (res.body.decode("utf-8", errors="ignore") if hasattr(res, "body") else "")
            
            body = clean_text(body)
            if len(body) >= 200:
                return {"ok": True, "status": status, "title": clean_text(title), "body": body[:6000]}
    except Exception:
        pass

    # force_stealth가 활성화된 단일 대상에 한해서만 무거운 브라우저(StealthyFetcher) 가동
    if force_stealth:
        try:
            page = StealthyFetcher.fetch(
                url,
                headless=True,
                network_idle=True,
                timeout=timeout,
                block_ads=True,
                ai_targeted=True
            )
            status = page.status
            title = page.css("title::text").get() or ""
            if css_selector:
                selected = page.css(css_selector).getall()
                body = "\n".join(selected)
            else:
                scoped = page.css("article, main, [role='main']").getall()
                body = "\n".join(scoped) if scoped else (page.text if hasattr(page, "text") else "")
            
            body = clean_text(body)
            return {"ok": True, "status": status, "title": clean_text(title), "body": body[:6000]}
        except Exception as e:
            return {"ok": False, "status": status, "error": str(e)}

    return {"ok": False, "status": status, "error": "Content too short or fetch failed"}

def handle_threads(users: list[str], tags: list[str], limit_per_target: int = 3, max_total: int = 15) -> dict:
    """Threads 공신 계정 및 태그 피드 스크레이핑 (비중 확대, 조기 완료 최적화)"""
    candidates = []
    now_iso = datetime.now(timezone.utc).isoformat()
    seen_texts = set()

    for u in users:
        if len(candidates) >= max_total:
            break
        url = f"https://www.threads.net/@{u}"
        try:
            page = StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=6000, block_ads=True)
            if page.status != 200:
                continue
            
            spans = [s.strip() for s in page.css("span::text").getall() if not is_noise(s)]
            count = 0
            for s in spans:
                if count >= limit_per_target or len(candidates) >= max_total:
                    break
                if s in seen_texts:
                    continue
                seen_texts.add(s)
                
                title_sample = s.split("\n")[0][:80]
                post_id = abs(hash(s)) % 1000000000
                post_url = f"https://www.threads.net/@{u}/post/{post_id}"
                candidates.append({
                    "source": "threads",
                    "sourceName": "Threads",
                    "url": post_url,
                    "title": f"[{u}] {title_sample}",
                    "author": u,
                    "publish_date": now_iso,
                    "lang": "en" if not re.search(r'[가-힣]', s) else "ko",
                    "body": s,
                    "body_chars": len(s),
                    "metrics": {"platform": "threads", "account": u}
                })
                count += 1
        except Exception:
            continue

    if len(candidates) < max_total:
        for tag in tags:
            if len(candidates) >= max_total:
                break
            url = f"https://www.threads.net/tag/{tag}"
            try:
                page = StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=6000, block_ads=True)
                if page.status != 200:
                    continue
                spans = [s.strip() for s in page.css("span::text").getall() if not is_noise(s)]
                count = 0
                for s in spans:
                    if count >= limit_per_target or len(candidates) >= max_total:
                        break
                    if s in seen_texts:
                        continue
                    seen_texts.add(s)
                    title_sample = s.split("\n")[0][:80]
                    post_id = abs(hash(s)) % 1000000000
                    candidates.append({
                        "source": "threads",
                        "sourceName": "Threads",
                        "url": f"{url}?post={post_id}",
                        "title": f"[#{tag}] {title_sample}",
                        "author": f"threads-tag-{tag}",
                        "publish_date": now_iso,
                        "lang": "en" if not re.search(r'[가-힣]', s) else "ko",
                        "body": s,
                        "body_chars": len(s),
                        "metrics": {"platform": "threads", "tag": tag}
                    })
                    count += 1
            except Exception:
                continue

    return {"ok": True, "platform": "threads", "items": candidates}

def handle_x(users: list[str], limit_per_user: int = 3, max_total: int = 12) -> dict:
    """X(구 트위터) 공식 AI 연구소 계정 타임라인 스텔스 스크레이핑 (비중 확대, 조기 완료 최적화)"""
    candidates = []
    now_iso = datetime.now(timezone.utc).isoformat()
    seen_texts = set()

    for u in users:
        if len(candidates) >= max_total:
            break
        url = f"https://x.com/{u}"
        try:
            page = StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=6000, block_ads=True)
            if page.status != 200:
                continue
            spans = [s.strip() for s in page.css("span::text").getall() if not is_noise(s)]
            count = 0
            for s in spans:
                if count >= limit_per_user or len(candidates) >= max_total:
                    break
                if s in seen_texts:
                    continue
                seen_texts.add(s)
                title_sample = s.split("\n")[0][:80]
                post_id = abs(hash(s)) % 1000000000
                candidates.append({
                    "source": "x",
                    "sourceName": "X",
                    "url": f"https://x.com/{u}/status/{post_id}",
                    "title": f"[{u}] {title_sample}",
                    "author": u,
                    "publish_date": now_iso,
                    "lang": "en" if not re.search(r'[가-힣]', s) else "ko",
                    "body": s,
                    "body_chars": len(s),
                    "metrics": {"platform": "x", "account": u}
                })
                count += 1
        except Exception:
            continue

    return {"ok": True, "platform": "x", "items": candidates}

def handle_instagram(users: list[str], limit_per_user: int = 2) -> dict:
    """Instagram AI 연구소 게시물 스크레이핑 (인증 세션 쿠키 연동 지원)"""
    candidates = []
    now_iso = datetime.now(timezone.utc).isoformat()
    seen_texts = set()

    session_cookie = os.environ.get("INSTAGRAM_SESSIONID")
    cookie_file = os.path.expanduser("~/.config/instagram/cookie.json")
    if not session_cookie and os.path.exists(cookie_file):
        try:
            with open(cookie_file, "r") as f:
                cdata = json.load(f)
                session_cookie = cdata.get("sessionid") or cdata.get("session_id")
        except Exception:
            pass

    cookies = [{"name": "sessionid", "value": session_cookie, "domain": ".instagram.com", "path": "/"}] if session_cookie else []

    for u in users:
        url = f"https://www.instagram.com/{u}/"
        try:
            fetch_kwargs = {
                "headless": True,
                "network_idle": True,
                "timeout": 8000,
                "block_ads": True
            }
            if cookies:
                fetch_kwargs["cookies"] = cookies

            page = StealthyFetcher.fetch(url, **fetch_kwargs)
            meta_desc = page.css("meta[name='description']::attr(content)").get() or ""
            spans = [s.strip() for s in page.css("span::text, div::text").getall() if not is_noise(s)]
            
            extracted = [meta_desc] if (meta_desc and not is_noise(meta_desc)) else []
            extracted.extend(spans)

            count = 0
            for s in extracted:
                if count >= limit_per_user:
                    break
                if s in seen_texts:
                    continue
                seen_texts.add(s)
                title_sample = s.split("\n")[0][:80]
                post_id = abs(hash(s)) % 1000000000
                candidates.append({
                    "source": "instagram",
                    "sourceName": "Instagram",
                    "url": f"https://www.instagram.com/p/{post_id}/",
                    "title": f"[{u}] {title_sample}",
                    "author": u,
                    "publish_date": now_iso,
                    "lang": "en" if not re.search(r'[가-힣]', s) else "ko",
                    "body": s,
                    "body_chars": len(s),
                    "metrics": {"platform": "instagram", "account": u}
                })
                count += 1
        except Exception:
            continue

    return {"ok": True, "platform": "instagram", "items": candidates}

def main():
    parser = argparse.ArgumentParser(description="Scrapling Crawler Bridge")
    parser.add_argument("--mode", choices=["fetch", "threads", "x", "instagram"], required=True)
    parser.add_argument("--url", type=str, help="Target URL for fetch mode")
    parser.add_argument("--timeout", type=int, default=12000, help="Timeout in ms")
    parser.add_argument("--force-stealth", action="store_true", help="Force StealthyFetcher")
    parser.add_argument("--css-selector", type=str, help="Optional CSS selector")
    parser.add_argument("--users", type=str, default="", help="Comma-separated target users")
    parser.add_argument("--tags", type=str, default="", help="Comma-separated target tags")
    parser.add_argument("--limit", type=int, default=2, help="Limit per target")

    args = parser.parse_args()

    if args.mode == "fetch":
        if not args.url:
            print(json.dumps({"ok": False, "error": "URL required for fetch mode"}))
            sys.exit(1)
        res = handle_fetch(args.url, timeout=args.timeout, force_stealth=args.force_stealth, css_selector=args.css_selector)
        print(json.dumps(res, ensure_ascii=False))

    elif args.mode == "threads":
        default_users = [
            "openai", "sama", "anthropic", "meta", "googledeepmind", "huggingface", "ylecun", "karpathy", "demishassabis",
            "teddylee777", "subinium", "geeknews", "sung.kim"
        ]
        default_tags = ["ai", "artificialintelligence", "machinelearning", "llm", "claude", "claudecode", "mcpserver", "agenticai", "인공지능", "생성형ai", "챗gpt"]
        users = [u.strip() for u in args.users.split(",") if u.strip()] or default_users
        tags = [t.strip() for t in args.tags.split(",") if t.strip()] or default_tags
        res = handle_threads(users, tags, limit_per_target=args.limit)
        print(json.dumps(res, ensure_ascii=False))

    elif args.mode == "x":
        default_users = [
            "OpenAI", "AnthropicAI", "GoogleDeepMind", "sama", "karpathy", "ylecun", "DrJimFan", "demishassabis",
            "bshifter", "alexalbert__", "teddylee777", "subinium", "hada_io", "sung_kim"
        ]
        users = [u.strip() for u in args.users.split(",") if u.strip()] or default_users
        res = handle_x(users, limit_per_user=args.limit)
        print(json.dumps(res, ensure_ascii=False))

    elif args.mode == "instagram":
        default_users = ["openai", "googledeepmind", "metaai", "nvidia", "microsoft", "teddylee777", "subinium"]
        users = [u.strip() for u in args.users.split(",") if u.strip()] or default_users
        res = handle_instagram(users, limit_per_user=args.limit)
        print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
