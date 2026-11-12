"""Threads 프로필 페이지(비로그인 SSR)에서 실제 게시물 단위로 수집해 JSON 한 줄로 출력."""
import argparse
import json
import re

from scrapling.fetchers import StealthySession

NOISE_TEXTS = {"작성자", "번역하기", "Translate", "스레드 보기", "See more"}
TIME_RE = re.compile(r"\d+(분|시간|일|주|[smhdw])|\d+")


def parse_count(text: str) -> int:
    m = re.search(r"([\d.,]+)\s*([만천KkMm])?", text)
    if not m:
        return 0
    num = float(m.group(1).replace(",", ""))
    unit = (m.group(2) or "").lower()
    mult = {"만": 10000, "천": 1000, "k": 1000, "m": 1000000}.get(unit, 1)
    return int(num * mult)


def parse_metrics(c) -> dict:
    metrics = {"likes": 0, "reposts": 0, "replies": 0}
    for el in c.css("[role=button], button"):
        txt = " ".join(t.strip() for t in el.css("::text").getall() if t.strip())
        low = txt.lower()
        if not txt:
            continue
        if "좋아요" in txt or "like" in low:
            metrics["likes"] = max(metrics["likes"], parse_count(txt))
        elif "리포스트" in txt or "repost" in low:
            metrics["reposts"] = max(metrics["reposts"], parse_count(txt))
        elif "댓글" in txt or "reply" in low or "comment" in low:
            metrics["replies"] = max(metrics["replies"], parse_count(txt))
    return metrics


def parse_post(c, handle):
    href = c.css('a[href*="/post/"]::attr(href)').get() or ""
    m = re.search(r"/@([^/]+)/post/([\w-]+)", href)
    if not m or m.group(1).lower() != handle.lower():
        return None  # 리포스트·추천 글 제외
    texts = [t.strip() for t in c.css("span::text").getall() if t.strip()]
    body = "\n".join(
        t for t in texts
        if t.lower() != handle.lower()
        and t not in NOISE_TEXTS
        and not TIME_RE.fullmatch(t)
    )
    imgs = [i.attrib.get("src", "") for i in c.css("img") if not re.search(r"t51\.\d+-19/", i.attrib.get("src", ""))]
    return {
        "url": f"https://www.threads.com/@{handle}/post/{m.group(2)}",
        "author": handle,
        "body": body[:2000],
        "publish_date": c.css("time::attr(datetime)").get() or "",
        "thumbnail": next((s for s in imgs if s.startswith("https://")), ""),
        "metrics": parse_metrics(c),
    }


def scrape(users, limit):
    items = []
    with StealthySession(headless=True) as session:
        for u in users:
            try:
                page = session.fetch(
                    f"https://www.threads.com/@{u}",
                    wait_selector="div[data-pressable-container=true]",
                    wait_selector_state="attached",
                    network_idle=False,
                    wait=600,
                    timeout=10000,
                )
            except Exception:
                continue
            if page.status != 200:
                continue
            seen, count = set(), 0
            for c in page.css("div[data-pressable-container=true]"):
                post = parse_post(c, u)
                if not post or post["url"] in seen or len(post["body"]) < 8:
                    continue
                seen.add(post["url"])
                items.append(post)
                count += 1
                if count >= limit:
                    break
    return items


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--users", required=True)
    ap.add_argument("--limit", type=int, default=3)
    a = ap.parse_args()
    print(json.dumps({"ok": True, "items": scrape([u for u in a.users.split(",") if u], a.limit)}, ensure_ascii=False))
