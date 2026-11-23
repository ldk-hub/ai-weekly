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

def handle_fetch(url: str, timeout: int = 10000, force_stealth: bool = False, css_selector: str = None, raw_mode: bool = False) -> dict:
    """일반 웹페이지 본문 또는 원본(RSS/JSON/XML) 수집 (1단계 경량 TLS Fetcher -> 명시적 요청 시 3단계 StealthyFetcher 폴백)"""
    title = ""
    body = ""
    status = 0

    # 1차 시도: cURL-cffi 초고속 TLS 위장 (브라우저를 띄우지 않아 수십 건 병렬 시에도 메모리 안전)
    try:
        fetcher = Fetcher()
        res = fetcher.get(url, timeout=max(5, timeout // 1000))
        status = res.status
        if status == 200:
            raw_text = res.body.decode("utf-8", errors="ignore") if hasattr(res, "body") and isinstance(res.body, (bytes, bytearray)) else (str(res.body) if hasattr(res, "body") else (res.text if hasattr(res, "text") else ""))
            if raw_mode:
                if len(raw_text.strip()) > 20:
                    return {"ok": True, "status": status, "title": "", "body": raw_text}
            else:
                title = res.css("title::text").get() or ""
                if css_selector:
                    selected = res.css(css_selector).getall()
                    body = "\n".join(selected)
                else:
                    scoped = res.css("article::text, main::text, [role='main']::text, p::text").getall()
                    if not scoped or len(" ".join(scoped).strip()) < 200:
                        scoped = res.css("article, main, [role='main']").getall()
                    body = "\n".join(scoped) if scoped else raw_text
                
                body = re.sub(r"<[^>]+>", " ", body)
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
                ai_targeted=not raw_mode
            )
            status = page.status
            if raw_mode:
                raw_text = page.body.decode("utf-8", errors="ignore") if hasattr(page, "body") and isinstance(page.body, (bytes, bytearray)) else (page.text if hasattr(page, "text") else "")
                return {"ok": len(raw_text.strip()) > 20, "status": status, "title": "", "body": raw_text}
            title = page.css("title::text").get() or ""
            if css_selector:
                selected = page.css(css_selector).getall()
                body = "\n".join(selected)
            else:
                scoped = page.css("article, main, [role='main']").getall()
                body = "\n".join(scoped) if scoped else (page.text if hasattr(page, "text") else "")
            
            body = re.sub(r"<[^>]+>", " ", body)
            body = clean_text(body)
            return {"ok": True, "status": status, "title": clean_text(title), "body": body[:6000]}
        except Exception as e:
            return {"ok": False, "status": status, "error": str(e)}

    return {"ok": False, "status": status, "error": "Content too short or fetch failed"}

def handle_threads(users: list[str], tags: list[str], limit_per_target: int = 3, max_total: int = 15) -> dict:
    """Threads 공신 계정 스크레이핑 (threads_profile.StealthySession 재사용)"""
    social_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "social"))
    if social_dir not in sys.path:
        sys.path.insert(0, social_dir)
    from threads_profile import scrape as scrape_threads_profiles

    raw_items = scrape_threads_profiles(users, limit=limit_per_target)
    candidates = []
    for it in raw_items[:max_total]:
        body = (it.get("body") or "").strip()
        if not body or is_noise(body):
            continue
        u = it.get("author") or "threads"
        title_sample = body.split("\n")[0][:80]
        candidates.append({
            "source": "threads",
            "sourceName": "Threads",
            "url": it.get("url") or "",
            "title": f"[{u}] {title_sample}",
            "author": f"@{u.lstrip('@')}",
            "publish_date": it.get("publish_date") or "",
            "lang": "en" if not re.search(r'[가-힣]', body) else "ko",
            "body": body,
            "body_chars": len(body),
            "metrics": {**(it.get("metrics") or {}), "platform": "threads", "account": u}
        })
    return {"ok": True, "platform": "threads", "items": candidates}

def handle_x(users: list[str], limit_per_user: int = 3, max_total: int = 15) -> dict:
    """X(구 트위터) 공식 AI 연구소 계정 타임라인 스텔스 스크레이핑 (x_profile.StealthySession 재사용)"""
    social_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "social"))
    if social_dir not in sys.path:
        sys.path.insert(0, social_dir)
    from x_profile import scrape as scrape_x_profiles

    raw_items = scrape_x_profiles(users, limit=limit_per_user)
    candidates = []
    for it in raw_items[:max_total]:
        body = (it.get("body") or "").strip()
        if not body or is_noise(body):
            continue
        u = it.get("author") or "x"
        title_sample = body.split("\n")[0][:80]
        candidates.append({
            "source": "x",
            "sourceName": "X",
            "url": it.get("url") or "",
            "title": f"[{u}] {title_sample}",
            "author": f"@{u.lstrip('@')}",
            "publish_date": it.get("publish_date") or "",
            "lang": "en" if not re.search(r'[가-힣]', body) else "ko",
            "body": body,
            "body_chars": len(body),
            "metrics": {**(it.get("metrics") or {}), "platform": "x", "account": u}
        })
    return {"ok": True, "platform": "x", "items": candidates}

def parse_ig_meta(meta_desc: str) -> tuple[str, str, dict]:
    """Instagram meta description에서 캡션, 날짜(ISO), 좋아요/댓글 수를 추출합니다."""
    if not meta_desc:
        return "", "", {"likes": 0, "reposts": 0, "replies": 0, "views": 0}
    caption_m = re.search(r':\s*"([\s\S]*)"\.\s*$', meta_desc)
    caption = caption_m.group(1).strip() if caption_m else ""
    date_m = re.search(r'-\s*([A-Z][a-z]+ \d{1,2}, \d{4})\s*:', meta_desc)
    iso_dt = ""
    if date_m:
        try:
            dt = datetime.strptime(date_m.group(1), "%B %d, %Y").replace(hour=12, tzinfo=timezone.utc)
            iso_dt = dt.isoformat().replace("+00:00", "Z")
        except Exception:
            pass
    likes_m = re.search(r'([\d.,]+)\s*([kKmM]?)\s*likes?', meta_desc, re.I)
    replies_m = re.search(r'([\d.,]+)\s*([kKmM]?)\s*comments?', meta_desc, re.I)
    def to_int(m):
        if not m:
            return 0
        try:
            val = float(m.group(1).replace(",", ""))
            u = (m.group(2) or "").lower()
            if u == "k":
                val *= 1000
            elif u == "m":
                val *= 1000000
            return int(val)
        except Exception:
            return 0
    return caption, iso_dt, {"likes": to_int(likes_m), "reposts": 0, "replies": to_int(replies_m), "views": 0}

def handle_instagram(users: list[str], limit_per_user: int = 2) -> dict:
    """Instagram AI 연구소/인플루언서 게시물 스크레이핑 (인증 세션 쿠키 연동 지원)"""
    candidates = []
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
        u = u.lstrip("@")
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
            post_hrefs = []
            for h in page.css("a[href*='/p/']::attr(href), a[href*='/reel/']::attr(href)").getall():
                if h and h not in post_hrefs:
                    post_hrefs.append(h)

            count = 0
            for href in post_hrefs[:limit_per_user]:
                post_url = f"https://www.instagram.com{href}" if href.startswith("/") else href
                try:
                    p_page = StealthyFetcher.fetch(post_url, **fetch_kwargs)
                    meta_desc = p_page.css("meta[name='description']::attr(content), meta[property='og:description']::attr(content)").get() or ""
                    thumb = p_page.css("meta[property='og:image']::attr(content)").get() or ""
                    pub_dt = p_page.css("time::attr(datetime)").get() or ""
                    meta_caption, meta_dt, metrics = parse_ig_meta(meta_desc)
                    if not pub_dt:
                        pub_dt = meta_dt
                    spans = [s.strip() for s in p_page.css("main span::text, article span::text").getall() if not is_noise(s)]
                    body = meta_caption or (spans[0] if spans else "")
                    if not body or is_noise(body) or body in seen_texts:
                        continue
                    seen_texts.add(body)
                    title_sample = body.split("\n")[0][:80]
                    candidates.append({
                        "source": "instagram",
                        "sourceName": "Instagram",
                        "url": post_url,
                        "title": f"[{u}] {title_sample}",
                        "author": u,
                        "publish_date": pub_dt,
                        "thumbnail": thumb,
                        "metaDesc": meta_desc,
                        "lang": "en" if not re.search(r'[가-힣]', body) else "ko",
                        "body": body,
                        "body_chars": len(body),
                        "metrics": {**metrics, "platform": "instagram", "account": u}
                    })
                    count += 1
                except Exception:
                    continue
        except Exception:
            continue

    return {"ok": True, "platform": "instagram", "items": candidates}

def load_seed_users(platform: str, fallback: list[str]) -> list[str]:
    seeds_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "social", "seeds.json"))
    if os.path.exists(seeds_path):
        try:
            with open(seeds_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                active = data.get(platform)
                if isinstance(active, list) and active:
                    return [str(u).lstrip("@") for u in active if u]
                core = (data.get("core") or {}).get(platform) or []
                disc = [d.get("handle") for d in ((data.get("discovered") or {}).get(platform) or []) if isinstance(d, dict) and d.get("handle")]
                combined = [str(u).lstrip("@") for u in (*core, *disc) if u]
                if combined:
                    return combined
        except Exception:
            pass
    return fallback

def main():
    parser = argparse.ArgumentParser(description="Scrapling Crawler Bridge")
    parser.add_argument("--mode", choices=["fetch", "threads", "x", "instagram"], required=True)
    parser.add_argument("--url", type=str, help="Target URL for fetch mode")
    parser.add_argument("--timeout", type=int, default=12000, help="Timeout in ms")
    parser.add_argument("--force-stealth", action="store_true", help="Force StealthyFetcher")
    parser.add_argument("--raw", action="store_true", help="Return raw response body without HTML article extraction")
    parser.add_argument("--css-selector", type=str, help="Optional CSS selector")
    parser.add_argument("--users", type=str, default="", help="Comma-separated target users")
    parser.add_argument("--tags", type=str, default="", help="Comma-separated target tags")
    parser.add_argument("--limit", type=int, default=2, help="Limit per target")

    args = parser.parse_args()

    if args.mode == "fetch":
        if not args.url:
            print(json.dumps({"ok": False, "error": "URL required for fetch mode"}))
            sys.exit(1)
        res = handle_fetch(args.url, timeout=args.timeout, force_stealth=args.force_stealth, css_selector=args.css_selector, raw_mode=args.raw)
        print(json.dumps(res, ensure_ascii=False))

    elif args.mode == "threads":
        default_users = load_seed_users("threads", [
            "prompt_what", "choi.openai", "rowancheung",
            "openai", "sama", "anthropic", "googledeepmind", "huggingface", "teddylee777"
        ])
        default_tags = ["ai", "artificialintelligence", "llm", "claude", "claudecode", "mcpserver", "agenticai"]
        users = [u.strip() for u in args.users.split(",") if u.strip()] or default_users
        tags = [t.strip() for t in args.tags.split(",") if t.strip()] or default_tags
        res = handle_threads(users, tags, limit_per_target=args.limit)
        print(json.dumps(res, ensure_ascii=False))

    elif args.mode == "x":
        default_users = load_seed_users("x", [
            "rowancheung", "minchoi", "godofprompt", "omarsar0",
            "OpenAI", "AnthropicAI", "GoogleDeepMind", "sama", "karpathy", "DrJimFan"
        ])
        users = [u.strip() for u in args.users.split(",") if u.strip()] or default_users
        res = handle_x(users, limit_per_user=args.limit)
        print(json.dumps(res, ensure_ascii=False))

    elif args.mode == "instagram":
        default_users = load_seed_users("instagram", [
            "joshproductletter", "prompt_what", "aiscene.kr", "vibe.trender", "sebia.ai", "ai_insight.kr", "pollo.ai_official"
        ])
        users = [u.strip() for u in args.users.split(",") if u.strip()] or default_users
        res = handle_instagram(users, limit_per_user=args.limit)
        print(json.dumps(res, ensure_ascii=False))

if __name__ == "__main__":
    main()
