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
    {
        "id": "fury-325",
        "name": "Fury 325 (퓨리 325)",
        "origin": "North Carolina, USA",
        "park": "Carowinds",
        "style": "giga",
        "trackColor": "#06b6d4",
        "spineColor": "#f8fafc",
        "supportColor": "#0f766e",
        "height_m": 99.1,
        "speed_kmh": 153.0,
        "length_m": 2012.0,
        "inversions": 0,
        "wiki_url": "https://en.wikipedia.org/wiki/Fury_325",
        "description": "세계 최고 높이급 B&M 기가 코스터의 초장거리 저공 고속 커브 레퍼런스",
    },
    {
        "id": "millennium-force",
        "name": "Millennium Force (밀레니엄 포스)",
        "origin": "Ohio, USA",
        "park": "Cedar Point",
        "style": "giga",
        "trackColor": "#2563eb",
        "spineColor": "#e2e8f0",
        "supportColor": "#1e3a8a",
        "height_m": 94.5,
        "speed_kmh": 150.0,
        "length_m": 2010.0,
        "inversions": 0,
        "wiki_url": "https://en.wikipedia.org/wiki/Millennium_Force",
        "description": "최초의 인타민 기가 코스터 전설 — 80도 급낙하와 초대형 오버뱅크드 턴",
    },
    {
        "id": "draken-gyeongju",
        "name": "Draken (드라켄 90° 다이브)",
        "origin": "Gyeongju, South Korea",
        "park": "Gyeongju World",
        "style": "dive",
        "trackColor": "#dc2626",
        "spineColor": "#fef3c7",
        "supportColor": "#334155",
        "height_m": 63.0,
        "speed_kmh": 117.0,
        "length_m": 947.0,
        "inversions": 2,
        "wiki_url": "https://en.wikipedia.org/wiki/Draken_(roller_coaster)",
        "description": "대한민국 대표 90도 수직 정지 후 수직 낙하 B&M 다이브 코스터 프리셋",
    },
    {
        "id": "atlantis-lotte",
        "name": "Atlantis (아틀란티스 어드벤처)",
        "origin": "Seoul, South Korea",
        "park": "Lotte World",
        "style": "launch",
        "trackColor": "#0ea5e9",
        "spineColor": "#fde047",
        "supportColor": "#1e40af",
        "height_m": 24.0,
        "speed_kmh": 72.0,
        "length_m": 670.0,
        "inversions": 0,
        "wiki_url": "https://en.wikipedia.org/wiki/Atlantis_Adventure",
        "description": "롯데월드 시그니처 급발진 LSM 런치 + 연속 급커브 아쿠아 트랙스 레퍼런스",
    },
    {
        "id": "takabisha",
        "name": "Takabisha (타카비샤 121°)",
        "origin": "Yamanashi, Japan",
        "park": "Fuji-Q Highland",
        "style": "dive",
        "trackColor": "#18181b",
        "spineColor": "#f43f5e",
        "supportColor": "#3f3f46",
        "height_m": 43.0,
        "speed_kmh": 100.0,
        "length_m": 1004.0,
        "inversions": 7,
        "wiki_url": "https://en.wikipedia.org/wiki/Takabisha",
        "description": "121도 초수직 급낙하와 런치 구간을 결합한 유로파이터 코스터 프리셋",
    },
    {
        "id": "nemesis-reborn",
        "name": "Nemesis Reborn (네메시스)",
        "origin": "Staffordshire, UK",
        "park": "Alton Towers",
        "style": "twister",
        "trackColor": "#111827",
        "spineColor": "#ef4444",
        "supportColor": "#374151",
        "height_m": 31.7,
        "speed_kmh": 81.0,
        "length_m": 716.0,
        "inversions": 4,
        "wiki_url": "https://en.wikipedia.org/wiki/Nemesis_Reborn",
        "description": "지형을 훑고 지나가는 콤팩트 고중력 트위스터 인버티드 코스터 레퍼런스",
    },
    {
        "id": "rct-wooden-twister",
        "name": "RCT 클래식: 우든 트위스터",
        "origin": "RollerCoaster Tycoon Classic",
        "park": "RCT Reference Blueprint",
        "style": "wooden",
        "trackColor": "#c2410c",
        "spineColor": "#ffedd5",
        "supportColor": "#7c2d12",
        "height_m": 38.0,
        "speed_kmh": 92.0,
        "length_m": 1120.0,
        "inversions": 0,
        "wiki_url": "",
        "description": "롤러코스터 타이쿤 클래식의 전설적인 더블 피겨-8 목재 트위스터 설계도",
    },
    {
        "id": "planet-mine-train",
        "name": "플래닛코스터: 패밀리 광산열차",
        "origin": "Planet Coaster Classic",
        "park": "Planet Coaster Reference",
        "style": "family",
        "trackColor": "#d97706",
        "spineColor": "#fef3c7",
        "supportColor": "#57534e",
        "height_m": 22.0,
        "speed_kmh": 68.0,
        "length_m": 780.0,
        "inversions": 0,
        "wiki_url": "",
        "description": "온 가족이 멀미 없이 즐기는 플래닛코스터풍 경관 마인트레인 패밀리 코스터",
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

    if style == "dive":
        return [
            {"x": -34, "y": 2.4, "z": 22, "bankDeg": 0, "segment": "station"},
            {"x": -36, "y": 2.8, "z": 4, "bankDeg": 0, "segment": "lift"},
            {"x": -34, "y": peak_y, "z": -18, "bankDeg": 0, "segment": "brake"},
            {"x": -22, "y": peak_y, "z": -28, "bankDeg": 0, "segment": "brake"},
            {"x": -10, "y": 4.2, "z": -36, "bankDeg": 42, "segment": "boost"},
            {"x": 18, "y": round(peak_y * 0.78, 1), "z": -30, "bankDeg": -46, "segment": "normal"},
            {"x": 36, "y": 5.2, "z": -6, "bankDeg": 52, "segment": "normal"},
            {"x": 20, "y": round(peak_y * 0.44, 1), "z": 22, "bankDeg": -28, "segment": "normal"},
            {"x": -8, "y": 4.0, "z": 30, "bankDeg": 16, "segment": "brake"},
        ]

    if style == "giga":
        return [
            {"x": -44, "y": 2.4, "z": 30, "bankDeg": 0, "segment": "station"},
            {"x": -48, "y": 2.8, "z": 4, "bankDeg": 0, "segment": "lift"},
            {"x": -44, "y": min(46.0, peak_y + 4.0), "z": -38, "bankDeg": 0, "segment": "normal"},
            {"x": -12, "y": 4.5, "z": -56, "bankDeg": 52, "segment": "boost"},
            {"x": 28, "y": round(peak_y * 0.84, 1), "z": -48, "bankDeg": -44, "segment": "normal"},
            {"x": 54, "y": 5.5, "z": -10, "bankDeg": 56, "segment": "normal"},
            {"x": 42, "y": round(peak_y * 0.58, 1), "z": 28, "bankDeg": -36, "segment": "normal"},
            {"x": 8, "y": 6.0, "z": 46, "bankDeg": 32, "segment": "brake"},
            {"x": -24, "y": 3.4, "z": 44, "bankDeg": 14, "segment": "brake"},
        ]

    if style == "twister":
        return [
            {"x": -28, "y": 2.4, "z": 20, "bankDeg": 0, "segment": "station"},
            {"x": -30, "y": 2.6, "z": 2, "bankDeg": 0, "segment": "lift"},
            {"x": -22, "y": round(peak_y * 0.86, 1), "z": -22, "bankDeg": 34, "segment": "normal"},
            {"x": 2, "y": 5.0, "z": -30, "bankDeg": -54, "segment": "boost"},
            {"x": 24, "y": round(peak_y * 0.72, 1), "z": -14, "bankDeg": 58, "segment": "normal"},
            {"x": 8, "y": 4.8, "z": 4, "bankDeg": -52, "segment": "normal"},
            {"x": 24, "y": round(peak_y * 0.55, 1), "z": 24, "bankDeg": 48, "segment": "normal"},
            {"x": -6, "y": 4.2, "z": 28, "bankDeg": 20, "segment": "brake"},
        ]

    if style == "family":
        return [
            {"x": -26, "y": 2.4, "z": 18, "bankDeg": 0, "segment": "station"},
            {"x": -28, "y": 2.6, "z": 0, "bankDeg": 0, "segment": "lift"},
            {"x": -20, "y": 14.5, "z": -20, "bankDeg": 16, "segment": "normal"},
            {"x": 4, "y": 5.5, "z": -26, "bankDeg": 26, "segment": "normal"},
            {"x": 24, "y": 12.0, "z": -12, "bankDeg": -22, "segment": "normal"},
            {"x": 22, "y": 5.2, "z": 14, "bankDeg": 28, "segment": "normal"},
            {"x": 0, "y": 9.5, "z": 24, "bankDeg": -16, "segment": "normal"},
            {"x": -16, "y": 3.5, "z": 24, "bankDeg": 10, "segment": "brake"},
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
