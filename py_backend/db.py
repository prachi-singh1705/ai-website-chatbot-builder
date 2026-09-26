"""
SiteMind AI - PostgreSQL data access layer (psycopg2).

Owns connection handling, schema bootstrap and JSON-safe row serialization.
"""

from __future__ import annotations

import datetime as _dt
import json
from decimal import Decimal
from typing import Any, Iterable, Sequence

from py_backend import bootstrap  # noqa: F401  (side effects: sys.path + .env)

import psycopg2
import psycopg2.extras


# --------------------------------------------------------------------------
# Connection helpers
# --------------------------------------------------------------------------
def get_connection():
    conn = psycopg2.connect(bootstrap.DATABASE_URL)
    conn.autocommit = True
    return conn


def query(sql: str, params: Sequence[Any] | None = None) -> list[dict[str, Any]]:
    """Run a SELECT and return a list of JSON-safe dicts (camelCased keys)."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params or ())
            rows = cur.fetchall()
    return [serialize_row(dict(row)) for row in rows]


def query_one(sql: str, params: Sequence[Any] | None = None) -> dict[str, Any] | None:
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: Sequence[Any] | None = None) -> int:
    """Run an INSERT/UPDATE/DELETE and return the affected row count."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.rowcount


def execute_many(statements: Iterable[tuple[str, Sequence[Any]]]) -> None:
    """Run several statements inside one transaction."""
    conn = psycopg2.connect(bootstrap.DATABASE_URL)
    try:
        with conn:
            with conn.cursor() as cur:
                for sql, params in statements:
                    cur.execute(sql, params)
    finally:
        conn.close()


# --------------------------------------------------------------------------
# Serialization
# --------------------------------------------------------------------------
def _snake_to_camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(part.title() for part in rest)


def _to_jsonable(value: Any) -> Any:
    if isinstance(value, (_dt.datetime, _dt.date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, dict):
        return {k: _to_jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_to_jsonable(v) for v in value]
    return value


def serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    """Convert snake_case DB rows into camelCase JSON-safe dicts for the UI."""
    return {_snake_to_camel(key): _to_jsonable(val) for key, val in row.items()}


def as_jsonb(value: Any) -> str:
    return json.dumps(value if value is not None else [])


# --------------------------------------------------------------------------
# Schema bootstrap (idempotent — mirrors the Drizzle schema)
# --------------------------------------------------------------------------
SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS chatbots (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        website_url TEXT NOT NULL,
        avatar TEXT NOT NULL DEFAULT '🤖',
        primary_color TEXT NOT NULL DEFAULT '#3b82f6',
        welcome_message TEXT NOT NULL DEFAULT 'Hello! 👋 How can I help you today?',
        tone TEXT NOT NULL DEFAULT 'friendly',
        system_prompt TEXT,
        strictness TEXT NOT NULL DEFAULT 'balanced',
        lead_capture_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        lead_capture_prompt TEXT NOT NULL DEFAULT 'Interested in learning more?',
        suggested_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'ready',
        scraped_pages_count INTEGER NOT NULL DEFAULT 0,
        total_chunks_count INTEGER NOT NULL DEFAULT 0,
        custom_api_key TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS knowledge_sources (
        id TEXT PRIMARY KEY,
        chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'scraped_url',
        content TEXT NOT NULL,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'indexed',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
        id TEXT PRIMARY KEY,
        chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
        source_id TEXT NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        heading TEXT NOT NULL,
        content TEXT NOT NULL,
        keywords TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL,
        source_title TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
        visitor_id TEXT NOT NULL,
        messages_count INTEGER NOT NULL DEFAULT 0,
        lead_captured BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
        sender TEXT NOT NULL,
        text TEXT NOT NULL,
        citations JSONB NOT NULL DEFAULT '[]'::jsonb,
        confidence INTEGER NOT NULL DEFAULT 95,
        rating TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        chatbot_id TEXT NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
        conversation_id TEXT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        query TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
    """,
    "CREATE INDEX IF NOT EXISTS idx_chunks_bot ON knowledge_chunks (chatbot_id)",
    "CREATE INDEX IF NOT EXISTS idx_sources_bot ON knowledge_sources (chatbot_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id)",
]


def init_schema() -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            for statement in SCHEMA_STATEMENTS:
                cur.execute(statement)


def ping() -> bool:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")
            return cur.fetchone() is not None
