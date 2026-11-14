"""X 프로필 페이지(비로그인 폴백)에서 실제 트윗 단위로 수집해 JSON 한 줄로 출력."""
import argparse
import json
import re
from datetime import datetime, timezone

from scrapling.fetchers import StealthySession

TWITTER_EPOCH_MS = 1288834974657


def snowflake_to_iso(status_id: str) -> str:
    try:
        ms = (int(status_id) >> 22) + TWITTER_EPOCH_MS
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()
    except Exception:
        return ""


def parse_x_metrics(article) -> dict:
    metrics = {"likes": 0, "reposts": 0, "replies": 0, "views": 0}
    patterns = {
        "likes": r"([\d,]+)\s*(?:마음에 들어요|likes?)",
        "reposts": r"([\d,]+)\s*(?:재게시물|reposts?|retweets?)",
        "replies": r"([\d,]+)\s*(?:답글|repl(?:y|ies))",
        "views": r"([\d,]+)\s*(?:조회수|views?)",
    }
    for el in article.css("[aria-label]"):
        label = el.attrib.get("aria-label", "")
        for key, pat in patterns.items():
            m = re.search(pat, label, re.I)
            if m:
                metrics[key] = max(metrics[key], int(m.group(1).replace(",", "")))
    return metrics


def parse_article(article, handle: str):
    ctx = " ".join(t.strip() for t in article.css('[data-testid="socialContext"] *::text').getall() if t.strip())
    if re.search(r"pinned|고정", ctx, re.I):
        return None  # 고정 게시물 제외
    href = article.css('a[href*="/status/"]::attr(href)').get() or ""
    m = re.search(r"/([^/]+)/status/(\d+)", href)
    if not m or m.group(1).lower() != handle.lower():
        return None  # 리트윗·타인 글 제외
    status_id = m.group(2)
    tweet_nodes = article.css('[data-testid="tweetText"]')
    if tweet_nodes:
        main_text = " ".join(t.strip() for t in tweet_nodes[0].css("*::text").getall() if t.strip())
        quote_text = " ".join(t.strip() for t in tweet_nodes[1].css("*::text").getall() if t.strip()) if len(tweet_nodes) > 1 else ""
        body = f"{main_text}\n[인용] {quote_text}".strip() if quote_text else main_text
    else:
        texts = [t.strip() for t in article.css("div[lang] span::text").getall() if t.strip()]
        if not texts:
            texts = [t.strip() for t in article.css("span::text").getall() if len(t.strip()) > 15]
            body = texts[0] if texts else ""
        else:
            body = " ".join(texts).strip()
    if len(body) < 8:
        return None
    imgs = [i.attrib.get("src", "") for i in article.css("img") if "pbs.twimg.com/media" in i.attrib.get("src", "")]
    return {
        "id": status_id,
        "url": f"https://x.com/{handle}/status/{status_id}",
        "author": handle,
        "body": body[:2000],
        "publish_date": article.css("time::attr(datetime)").get() or snowflake_to_iso(status_id),
        "thumbnail": imgs[0] if imgs else "",
        "metrics": parse_x_metrics(article),
    }


def scrape(users, limit):
    items = []
    with StealthySession(headless=True) as session:
        for u in users:
            try:
                page = session.fetch(
                    f"https://x.com/{u}",
                    wait_selector="article",
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
            for art in page.css("article"):
                post = parse_article(art, u)
                if not post or post["id"] in seen:
                    continue
                seen.add(post["id"])
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
