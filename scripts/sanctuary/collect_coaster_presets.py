#!/usr/bin/env python3
"""
WeeklyLand Scrapling Coaster Preset Collector
Collects verified real-world flagship roller coaster specifications (height, max speed,
track length, inversions) using Scrapling Fetcher (Level 1) with polite rate limiting
and safe structured fallback, then compiles normalized 3D spline blueprints for the
WeeklyLand Architect Builder (`site/public/data/coaster_presets.json`).
"""

from __future__ import annotations

import datetime as dt
import json
import math
import os
import re
import time
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parents[2]
OUT_PATH = ROOT_DIR / "site" / "public" / "data" / "coaster_presets.json"

# Public reference pages + verified baseline specs (used as baseline and offline fallback)
COASTER_SPECS: list[dict[str, Any]] = [
    {
        "id": "starboard-hyper",
        "name": "스타보드 하이퍼 코스터",
        "origin": "WeeklyLand Signature",
        "park": "AI위클리 랜드",
        "style": "hyper",
        "trackColor": "#d97757",
        "spineColor": "#f4ede0",
        "supportColor": "#334155",
        "height_m": 46.0,
        "speed_kmh": 118.0,
        "length_m": 1240.0,
        "inversions": 1,
        "wiki_url": "",
        "description": "AI위클리 스타보드 급상승 1위 리포지토리와 연동되는 시그니처 하이퍼 코스터",
    },
    {
        "id": "t-express",
        "name": "T-Express (티익스프레스)",
        "origin": "Yongin, South Korea",
        "park": "Everland",
        "style": "wooden",
        "trackColor": "#b45309",
        "spineColor": "#f5deb3",
        "supportColor": "#78350f",
        "height_m": 56.0,
        "speed_kmh": 104.0,
        "length_m": 1641.0,
        "inversions": 0,
        "wiki_url": "https://en.wikipedia.org/wiki/T_Express",
        "description": "77도 급낙하와 연속 에어타임 언덕으로 유명한 목재 하이브리드 코스터 프리셋",
    },
    {
        "id": "kingda-ka",
        "name": "Kingda Ka (킹다 카)",
        "origin": "New Jersey, USA",
        "park": "Six Flags Great Adventure",
        "style": "strata",
        "trackColor": "#15803d",
        "spineColor": "#38bdf8",
        "supportColor": "#0f766e",
        "height_m": 139.0,
        "speed_kmh": 206.0,
        "length_m": 950.0,
        "inversions": 0,
        "wiki_url": "https://en.wikipedia.org/wiki/Kingda_Ka",
        "description": "초고속 LSM 런치 후 수직 톱햇(Top Hat)으로 치솟는 스트라타 코스터 프리셋",
    },
    {
        "id": "steel-vengeance",
        "name": "Steel Vengeance (스틸 벤전스)",
        "origin": "Ohio, USA",
        "park": "Cedar Point",
        "style": "hybrid",
        "trackColor": "#991b1b",
        "spineColor": "#fde68a",
        "supportColor": "#57534e",
        "height_m": 62.5,
        "speed_kmh": 119.0,
        "length_m": 1749.0,
        "inversions": 4,
        "wiki_url": "https://en.wikipedia.org/wiki/Steel_Vengeance",
        "description": "세계 최다 에어타임과 4회 인버전을 결합한 RMC 하이브리드 코스터 프리셋",
    },
    {
        "id": "velocicoaster",
        "name": "VelociCoaster (벨로시코스터)",
        "origin": "Florida, USA",
        "park": "Universal Islands of Adventure",
        "style": "launch",
        "trackColor": "#0284c7",
        "spineColor": "#e2e8f0",
        "supportColor": "#1e293b",
        "height_m": 47.0,
        "speed_kmh": 113.0,
        "length_m": 1430.0,
        "inversions": 4,
        "wiki_url": "https://en.wikipedia.org/wiki/VelociCoaster",
        "description": "듀얼 LSM 가속과 고속 뱅크턴이 조화된 시네마틱 런치 코스터 프리셋",
    },
    {
        "id": "fujiyama",
        "name": "Fujiyama (후지야마)",
        "origin": "Yamanashi, Japan",
        "park": "Fuji-Q Highland",
        "style": "hyper",
        "trackColor": "#475569",
        "spineColor": "#f8fafc",
        "supportColor": "#334155",
        "height_m": 79.0,
        "speed_kmh": 130.0,
        "length_m": 2045.0,
        "inversions": 0,
        "wiki_url": "https://en.wikipedia.org/wiki/Fujiyama_(roller_coaster)",
        "description": "거대한 고도 낙차와 초장거리 고속 순항이 특징인 킹 오브 코스터 프리셋",
    },
]


def _extract_metric(text: str, pattern: str) -> float | None:
    match = re.search(pattern, text, re.IGNORECASE)
    if not match:
        return None
    raw = match.group(1).replace(",", "")
    try:
        return float(raw)
    except ValueError:
        return None


def enrich_with_scrapling(spec: dict[str, Any]) -> tuple[dict[str, Any], str]:
    """Fetch public Wikipedia infobox via Scrapling Level-1 Fetcher with safe fallback."""
    url = spec.get("wiki_url", "")
    if not url or os.environ.get("WEEKLYLAND_OFFLINE") == "1":
        return spec, "baseline"

    try:
        from scrapling.fetchers import Fetcher  # type: ignore

        fetcher = Fetcher()
        resp = fetcher.get(url, timeout=8)
        if getattr(resp, "status", 0) != 200:
            return spec, "fallback_http"

        infobox_text = " ".join(resp.css("table.infobox ::text").getall())
        if not infobox_text:
            return spec, "fallback_empty"

        height = _extract_metric(infobox_text, r"(\d+(?:\.\d+)?)\s*m\b.*?(?:height|drop)")
        speed = _extract_metric(infobox_text, r"(\d+(?:\.\d+)?)\s*km/h")
        length = _extract_metric(infobox_text, r"(\d[\d,]*(?:\.\d+)?)\s*m\b")

        updated = dict(spec)
        if height and 20 <= height <= 180:
            updated["height_m"] = round(height, 1)
        if speed and 60 <= speed <= 260:
            updated["speed_kmh"] = round(speed, 1)
        if length and 300 <= length <= 3500:
            updated["length_m"] = round(length, 1)
        return updated, "scrapling_live"
    except Exception:
        return spec, "fallback_offline"


def build_spline_nodes(spec: dict[str, Any]) -> list[dict[str, Any]]:
    """Convert physical roller coaster specs into normalized WeeklyLand 3D spline nodes."""
    # Scale real-world heights (45..140m) smoothly into park coordinates (24..46 world units)
    peak_y = round(min(46.0, max(22.0, 14.0 + (spec["height_m"] / 140.0) * 32.0)), 1)
    style = spec["style"]

    if style == "strata":
        return [
            {"x": -34, "y": 2.4, "z": 16, "bankDeg": 0, "segment": "station"},
            {"x": -34, "y": 2.4, "z": 2, "bankDeg": 0, "segment": "boost"},
            {"x": -34, "y": 3.0, "z": -16, "bankDeg": 0, "segment": "boost"},
            {"x": -30, "y": peak_y, "z": -32, "bankDeg": 24, "segment": "normal"},
            {"x": -12, "y": peak_y * 0.96, "z": -38, "bankDeg": 36, "segment": "normal"},
            {"x": 8, "y": 4.2, "z": -30, "bankDeg": 44, "segment": "normal"},
            {"x": 24, "y": round(peak_y * 0.56, 1), "z": -10, "bankDeg": -30, "segment": "normal"},
            {"x": 16, "y": 5.0, "z": 16, "bankDeg": 32, "segment": "brake"},
            {"x": -12, "y": 3.2, "z": 24, "bankDeg": 16, "segment": "brake"},
        ]

    if style == "wooden":
        return [
            {"x": -32, "y": 2.4, "z": 20, "bankDeg": 0, "segment": "station"},
            {"x": -34, "y": 2.6, "z": 4, "bankDeg": 0, "segment": "lift"},
            {"x": -32, "y": peak_y, "z": -24, "bankDeg": 0, "segment": "normal"},
            {"x": -14, "y": 4.0, "z": -36, "bankDeg": 46, "segment": "normal"},
            {"x": 10, "y": round(peak_y * 0.72, 1), "z": -34, "bankDeg": -18, "segment": "normal"},
            {"x": 30, "y": 4.5, "z": -16, "bankDeg": 52, "segment": "normal"},
            {"x": 28, "y": round(peak_y * 0.52, 1), "z": 8, "bankDeg": -28, "segment": "normal"},
            {"x": 8, "y": 5.5, "z": 26, "bankDeg": 38, "segment": "normal"},
            {"x": -14, "y": round(peak_y * 0.34, 1), "z": 30, "bankDeg": 12, "segment": "brake"},
        ]

    if style in ("launch", "hybrid"):
        return [
            {"x": -30, "y": 2.4, "z": 18, "bankDeg": 0, "segment": "station"},
            {"x": -32, "y": 2.5, "z": 0, "bankDeg": 0, "segment": "boost"},
            {"x": -26, "y": round(peak_y * 0.88, 1), "z": -24, "bankDeg": 38, "segment": "normal"},
            {"x": -6, "y": 4.2, "z": -36, "bankDeg": -48, "segment": "boost"},
            {"x": 16, "y": peak_y, "z": -30, "bankDeg": 42, "segment": "normal"},
            {"x": 32, "y": 6.5, "z": -8, "bankDeg": 56, "segment": "normal"},
            {"x": 22, "y": round(peak_y * 0.62, 1), "z": 16, "bankDeg": -44, "segment": "normal"},
            {"x": -4, "y": 4.8, "z": 28, "bankDeg": 32, "segment": "brake"},
        ]

    # Hyper / Signature layout
    return [
        {"x": -30, "y": 2.4, "z": 22, "bankDeg": 0, "segment": "station"},
        {"x": -34, "y": 2.6, "z": 6, "bankDeg": 0, "segment": "lift"},
        {"x": -30, "y": peak_y, "z": -22, "bankDeg": 0, "segment": "normal"},
        {"x": -8, "y": 4.2, "z": -36, "bankDeg": 44, "segment": "boost"},
        {"x": 18, "y": round(peak_y * 0.76, 1), "z": -28, "bankDeg": -38, "segment": "normal"},
        {"x": 34, "y": 5.5, "z": -4, "bankDeg": 50, "segment": "normal"},
        {"x": 22, "y": round(peak_y * 0.50, 1), "z": 20, "bankDeg": -30, "segment": "normal"},
        {"x": -6, "y": 4.5, "z": 28, "bankDeg": 24, "segment": "brake"},
    ]


def main() -> None:
    presets = []
    live_count = 0
    for idx, raw_spec in enumerate(COASTER_SPECS):
        spec, source_mode = enrich_with_scrapling(raw_spec)
        if source_mode == "scrapling_live":
            live_count += 1
        presets.append(
            {
                "id": spec["id"],
                "name": spec["name"],
                "origin": spec["origin"],
                "park": spec["park"],
                "style": spec["style"],
                "description": spec["description"],
                "trackColor": spec["trackColor"],
                "spineColor": spec["spineColor"],
                "supportColor": spec["supportColor"],
                "specs": {
                    "height_m": spec["height_m"],
                    "speed_kmh": spec["speed_kmh"],
                    "length_m": spec["length_m"],
                    "inversions": spec["inversions"],
                },
                "sourceUrl": spec["wiki_url"] or "https://ldk-hub.github.io/ai-weekly/sanctuary",
                "collectMode": source_mode,
                "nodes": build_spline_nodes(spec),
            }
        )
        if idx < len(COASTER_SPECS) - 1 and raw_spec.get("wiki_url"):
            time.sleep(0.25)

    payload = {
        "schemaVersion": 1,
        "updatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "collector": "scrapling-level1-with-baseline",
        "liveScrapedCount": live_count,
        "presets": presets,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[WeeklyLand] Saved {len(presets)} coaster presets (live={live_count}) -> {OUT_PATH.relative_to(ROOT_DIR)}")


if __name__ == "__main__":
    main()
