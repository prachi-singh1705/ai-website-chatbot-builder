#!/usr/bin/env python3
"""
SiteMind AI - Standalone Python REST API (stdlib only, zero web framework).

Run the backend on its own (without Next.js):

    python3 py_backend/server.py --port 8000

Endpoints
    GET    /api/health
    GET    /api/presets
    GET    /api/bots
    POST   /api/bots
    GET    /api/bots/<id>
    PATCH  /api/bots/<id>
    DELETE /api/bots/<id>
    POST   /api/bots/<id>/chat
    POST   /api/bots/<id>/crawl
    POST   /api/bots/<id>/manual-source
    GET    /api/bots/<id>/chunks?q=
    GET    /api/bots/<id>/leads
    POST   /api/bots/<id>/leads
    GET    /api/bots/<id>/embed.js
    POST   /api/messages/<id>/rate
"""

from __future__ import annotations

import argparse
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

sys.path.insert(0, __file__.rsplit("/py_backend/", 1)[0])

from py_backend import presets, services  # noqa: E402


class SiteMindHandler(BaseHTTPRequestHandler):
    server_version = "SiteMindPython/1.0"

    # ---------------------------------------------------------------- utils
    def _send(self, payload, status: int = 200, content_type: str = "application/json") -> None:
        body = payload if isinstance(payload, bytes) else json.dumps(payload, default=str).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _body(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if not length:
            return {}
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}

    def log_message(self, fmt, *args):  # noqa: A003 - quieter logs
        sys.stderr.write(f"[py-api] {fmt % args}\n")

    # -------------------------------------------------------------- routing
    def do_OPTIONS(self):  # noqa: N802
        self._send({}, 204)

    def do_GET(self):  # noqa: N802
        parsed = urlparse(self.path)
        parts = [p for p in parsed.path.strip("/").split("/") if p]
        params = parse_qs(parsed.query)

        try:
            if parts == ["api", "health"]:
                return self._send(services.health())
            if parts == ["api", "presets"]:
                return self._send({"success": True, "presets": presets.preset_summaries()})
            if parts == ["api", "bots"]:
                return self._send(services.list_bots())
            if len(parts) == 3 and parts[:2] == ["api", "bots"]:
                result = services.get_bot_detail(parts[2])
                return self._send(result, result.pop("status", 200))
            if len(parts) == 4 and parts[:2] == ["api", "bots"]:
                bot_id, tail = parts[2], parts[3]
                if tail == "chunks":
                    return self._send(services.list_chunks(bot_id, (params.get("q") or [""])[0]))
                if tail == "leads":
                    return self._send(services.list_leads(bot_id))
                if tail == "embed.js":
                    base = f"http://{self.headers.get('Host', 'localhost:8000')}"
                    script = services.embed_script(bot_id, base)
                    return self._send(script.encode(), 200, "application/javascript")
        except Exception as exc:  # noqa: BLE001
            return self._send({"success": False, "error": str(exc)}, 500)

        return self._send({"success": False, "error": "Not found"}, 404)

    def do_POST(self):  # noqa: N802
        parts = [p for p in urlparse(self.path).path.strip("/").split("/") if p]
        payload = self._body()

        try:
            if parts == ["api", "bots"]:
                result = services.create_bot(payload)
                return self._send(result, result.pop("status", 200))
            if len(parts) == 4 and parts[:2] == ["api", "bots"]:
                bot_id, tail = parts[2], parts[3]
                if tail == "chat":
                    result = services.chat(bot_id, payload.get("message", ""),
                                           payload.get("conversationId"),
                                           payload.get("visitorId", "web-visitor"))
                elif tail == "crawl":
                    result = services.crawl_additional_url(bot_id, payload.get("url", ""))
                elif tail == "manual-source":
                    result = services.add_manual_source(bot_id, payload.get("title", ""),
                                                        payload.get("content", ""))
                elif tail == "leads":
                    result = services.create_lead(bot_id, payload)
                else:
                    return self._send({"success": False, "error": "Not found"}, 404)
                return self._send(result, result.pop("status", 200))
            if len(parts) == 4 and parts[:2] == ["api", "messages"] and parts[3] == "rate":
                result = services.rate_message(parts[2], payload.get("rating"))
                return self._send(result, result.pop("status", 200))
        except Exception as exc:  # noqa: BLE001
            return self._send({"success": False, "error": str(exc)}, 500)

        return self._send({"success": False, "error": "Not found"}, 404)

    def do_PATCH(self):  # noqa: N802
        parts = [p for p in urlparse(self.path).path.strip("/").split("/") if p]
        if len(parts) == 3 and parts[:2] == ["api", "bots"]:
            result = services.update_bot(parts[2], self._body())
            return self._send(result, result.pop("status", 200))
        return self._send({"success": False, "error": "Not found"}, 404)

    def do_DELETE(self):  # noqa: N802
        parts = [p for p in urlparse(self.path).path.strip("/").split("/") if p]
        if len(parts) == 3 and parts[:2] == ["api", "bots"]:
            return self._send(services.delete_bot(parts[2]))
        return self._send({"success": False, "error": "Not found"}, 404)


def main() -> None:
    parser = argparse.ArgumentParser(description="SiteMind AI Python API server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    services.ensure_seed_data()
    httpd = ThreadingHTTPServer((args.host, args.port), SiteMindHandler)
    print(f"SiteMind AI Python API listening on http://{args.host}:{args.port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()


if __name__ == "__main__":
    main()
