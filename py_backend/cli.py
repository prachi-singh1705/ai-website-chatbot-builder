#!/usr/bin/env python3
"""
SiteMind AI - JSON CLI bridge.

Usage:
    echo '{"chatbotId": "...", "message": "hi"}' | python3 py_backend/cli.py chat

The Next.js route handlers call this entrypoint; the entire product logic is
executed by Python. Output is always a single JSON document on stdout.
"""

from __future__ import annotations

import json
import sys
import traceback

sys.path.insert(0, __file__.rsplit("/py_backend/", 1)[0])

from py_backend import presets, services  # noqa: E402


def _read_payload() -> dict:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {"value": data}
    except json.JSONDecodeError:
        return {}


def dispatch(action: str, payload: dict):
    bot_id = payload.get("botId") or payload.get("chatbotId") or ""

    if action == "health":
        return services.health()
    if action == "seed":
        services.ensure_seed_data()
        return {"success": True}
    if action == "list_presets":
        return {"success": True, "presets": presets.preset_summaries()}
    if action == "list_bots":
        return services.list_bots()
    if action == "create_bot":
        return services.create_bot(payload)
    if action == "get_bot":
        return services.get_bot_detail(bot_id)
    if action == "get_bot_config":
        bot = services.get_bot(bot_id)
        return {"success": bool(bot), "bot": bot}
    if action == "update_bot":
        return services.update_bot(bot_id, payload)
    if action == "delete_bot":
        return services.delete_bot(bot_id)
    if action == "chat":
        return services.chat(
            bot_id,
            payload.get("message", ""),
            payload.get("conversationId"),
            payload.get("visitorId", "web-visitor"),
        )
    if action == "crawl_url":
        return services.crawl_additional_url(bot_id, payload.get("url", ""))
    if action == "add_manual_source":
        return services.add_manual_source(
            bot_id,
            payload.get("title", ""),
            payload.get("content", ""),
            payload.get("contentType", "manual_text"),
        )
    if action == "list_chunks":
        return services.list_chunks(bot_id, payload.get("q", ""))
    if action == "list_leads":
        return services.list_leads(bot_id)
    if action == "create_lead":
        return services.create_lead(bot_id, payload)
    if action == "rate_message":
        return services.rate_message(payload.get("messageId", ""), payload.get("rating"))
    if action == "embed_script":
        return {
            "success": True,
            "script": services.embed_script(bot_id, payload.get("baseUrl", "")),
        }

    return {"success": False, "error": f"Unknown action '{action}'", "status": 400}


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "Missing action argument"}))
        return 1

    action = sys.argv[1]
    try:
        result = dispatch(action, _read_payload())
    except Exception as exc:  # noqa: BLE001
        print(
            json.dumps(
                {
                    "success": False,
                    "error": f"{type(exc).__name__}: {exc}",
                    "trace": traceback.format_exc(limit=3),
                    "status": 500,
                }
            )
        )
        return 1

    print(json.dumps(result, default=str))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
