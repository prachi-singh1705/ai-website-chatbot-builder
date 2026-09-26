"""
SiteMind AI - Demo website presets.

These are fully pre-indexed multi-page knowledge bases so the product can be
tested instantly without depending on an external website being reachable.
"""

from __future__ import annotations

import json
import os
from typing import Any

from py_backend import bootstrap

PRESETS_PATH = os.path.join(bootstrap.BASE_DIR, "presets.json")


def load_presets() -> list[dict[str, Any]]:
    try:
        with open(PRESETS_PATH, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except (OSError, json.JSONDecodeError):
        return []


WEBSITE_PRESETS: list[dict[str, Any]] = load_presets()


def get_preset(preset_id: str) -> dict[str, Any] | None:
    for preset in WEBSITE_PRESETS:
        if preset.get("id") == preset_id:
            return preset
    return None


def preset_summaries() -> list[dict[str, Any]]:
    """Lightweight payload for the dashboard preset cards."""
    summaries = []
    for preset in WEBSITE_PRESETS:
        pages = preset.get("pages", [])
        summaries.append(
            {
                "id": preset["id"],
                "name": preset["name"],
                "category": preset["category"],
                "websiteUrl": preset["websiteUrl"],
                "avatar": preset["avatar"],
                "primaryColor": preset["primaryColor"],
                "tone": preset["tone"],
                "description": preset["description"],
                "pagesCount": len(pages),
                "chunksCount": sum(len(page.get("chunks", [])) for page in pages),
            }
        )
    return summaries
