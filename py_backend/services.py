"""
SiteMind AI - Application service layer.

Every piece of product logic lives here in Python: bot lifecycle, website
ingestion, knowledge indexing, RAG chat, lead capture and embed generation.
The Next.js layer only forwards HTTP requests to these functions.
"""

from __future__ import annotations

import json
import random
import string
import time
from typing import Any

from py_backend import db, presets, rag
from py_backend.scraper import ScrapeError, scrape_url

DEFAULT_WELCOME = "Hello! 👋 How can I help you today?"


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
def _uid(prefix: str) -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=5))
    return f"{prefix}-{int(time.time() * 1000)}-{suffix}"


def _insert_chunks(chatbot_id: str, source_id: str, source_url: str,
                   source_title: str, chunks: list[dict[str, str]]) -> int:
    statements = []
    for index, chunk in enumerate(chunks, start=1):
        statements.append(
            (
                """
                INSERT INTO knowledge_chunks
                    (id, chatbot_id, source_id, chunk_index, heading, content,
                     keywords, source_url, source_title)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                """,
                (
                    f"{source_id}-chk-{index}",
                    chatbot_id,
                    source_id,
                    index,
                    chunk.get("heading", f"Section {index}")[:200],
                    chunk.get("content", ""),
                    chunk.get("keywords", ""),
                    source_url,
                    source_title,
                ),
            )
        )
    if statements:
        db.execute_many(statements)
    return len(statements)


def _insert_source(chatbot_id: str, source_id: str, url: str, title: str,
                   content: str, chunk_count: int, content_type: str = "scraped_url") -> None:
    db.execute(
        """
        INSERT INTO knowledge_sources
            (id, chatbot_id, url, title, content_type, content, chunk_count, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'indexed')
        ON CONFLICT (id) DO NOTHING
        """,
        (source_id, chatbot_id, url, title, content_type, content, chunk_count),
    )


def _refresh_counts(chatbot_id: str) -> dict[str, int]:
    row = db.query_one(
        """
        SELECT
          (SELECT COUNT(*) FROM knowledge_sources WHERE chatbot_id = %s) AS pages,
          (SELECT COUNT(*) FROM knowledge_chunks  WHERE chatbot_id = %s) AS chunks
        """,
        (chatbot_id, chatbot_id),
    ) or {"pages": 0, "chunks": 0}

    pages, chunks = int(row["pages"]), int(row["chunks"])
    db.execute(
        """
        UPDATE chatbots
        SET scraped_pages_count = %s, total_chunks_count = %s, updated_at = NOW()
        WHERE id = %s
        """,
        (pages, chunks, chatbot_id),
    )
    return {"pages": pages, "chunks": chunks}


# --------------------------------------------------------------------------
# Seeding
# --------------------------------------------------------------------------
def ensure_seed_data() -> None:
    """Install the demo presets once so the app is never empty."""
    db.init_schema()
    existing = db.query_one("SELECT COUNT(*) AS total FROM chatbots")
    if existing and int(existing["total"]) > 0:
        return

    for preset in presets.WEBSITE_PRESETS:
        _create_bot_from_preset(preset, bot_id=preset["id"], seed_activity=True)


def _create_bot_from_preset(preset: dict[str, Any], bot_id: str,
                            overrides: dict[str, Any] | None = None,
                            seed_activity: bool = False) -> str:
    overrides = overrides or {}
    pages = preset.get("pages", [])
    total_chunks = sum(len(p.get("chunks", [])) for p in pages)

    db.execute(
        """
        INSERT INTO chatbots
            (id, name, description, website_url, avatar, primary_color, welcome_message,
             tone, strictness, lead_capture_enabled, lead_capture_prompt,
             suggested_questions, status, scraped_pages_count, total_chunks_count)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'balanced', TRUE, %s, %s::jsonb,
                'ready', %s, %s)
        """,
        (
            bot_id,
            overrides.get("name") or preset["name"],
            overrides.get("description") or preset["description"],
            preset["websiteUrl"],
            overrides.get("avatar") or preset["avatar"],
            overrides.get("primaryColor") or preset["primaryColor"],
            preset["welcomeMessage"],
            overrides.get("tone") or preset["tone"],
            "Would you like a personalised quote or demo tailored to your needs?",
            db.as_jsonb(preset.get("suggestedQuestions", [])),
            len(pages),
            total_chunks,
        ),
    )

    for page_index, page in enumerate(pages, start=1):
        source_id = f"{bot_id}-src-{page_index}"
        content = "\n\n".join(
            f"{c['heading']}:\n{c['content']}" for c in page.get("chunks", [])
        )
        _insert_source(bot_id, source_id, page["url"], page["title"], content,
                       len(page.get("chunks", [])))
        _insert_chunks(bot_id, source_id, page["url"], page["title"], page.get("chunks", []))

    if seed_activity and pages:
        _seed_sample_activity(bot_id, preset)

    return bot_id


def _seed_sample_activity(bot_id: str, preset: dict[str, Any]) -> None:
    conversation_id = f"conv-{bot_id}-demo"
    first_page = preset["pages"][0]
    questions = preset.get("suggestedQuestions") or ["Tell me about your services"]

    db.execute(
        """
        INSERT INTO conversations (id, chatbot_id, visitor_id, messages_count, lead_captured)
        VALUES (%s, %s, %s, 2, TRUE)
        """,
        (conversation_id, bot_id, f"visitor-{bot_id}"),
    )
    db.execute(
        """
        INSERT INTO messages (id, conversation_id, chatbot_id, sender, text, citations, confidence)
        VALUES (%s, %s, %s, 'user', %s, '[]'::jsonb, 100)
        """,
        (f"msg-{bot_id}-1", conversation_id, bot_id, questions[0]),
    )
    citation = [
        {
            "chunkId": f"{bot_id}-src-1-chk-1",
            "title": first_page["title"],
            "url": first_page["url"],
            "snippet": first_page["chunks"][0]["content"][:120] + "...",
        }
    ]
    db.execute(
        """
        INSERT INTO messages (id, conversation_id, chatbot_id, sender, text, citations, confidence, rating)
        VALUES (%s, %s, %s, 'assistant', %s, %s::jsonb, 97, 'up')
        """,
        (
            f"msg-{bot_id}-2",
            conversation_id,
            bot_id,
            f"Here are the key details for {preset['name']} pulled from the indexed website content.",
            db.as_jsonb(citation),
        ),
    )
    db.execute(
        """
        INSERT INTO leads (id, chatbot_id, conversation_id, name, email, phone, query)
        VALUES (%s, %s, %s, 'Alex Rivera', 'alex.rivera@example.com', '+1 (555) 392-8812', %s)
        """,
        (f"lead-{bot_id}-1", bot_id, conversation_id,
         f"Inquiry regarding {preset['name']} pricing and onboarding."),
    )


# --------------------------------------------------------------------------
# Bot lifecycle
# --------------------------------------------------------------------------
def list_bots() -> dict[str, Any]:
    ensure_seed_data()
    bots = db.query(
        """
        SELECT c.*,
               (SELECT COUNT(*) FROM leads l WHERE l.chatbot_id = c.id)         AS leads_count,
               (SELECT COUNT(*) FROM conversations v WHERE v.chatbot_id = c.id) AS conversations_count
        FROM chatbots c
        ORDER BY c.created_at DESC
        """
    )
    for bot in bots:
        bot["leadsCount"] = int(bot.pop("leadsCount", 0) or 0)
        bot["conversationsCount"] = int(bot.pop("conversationsCount", 0) or 0)
    return {"success": True, "bots": bots}


def get_bot(bot_id: str) -> dict[str, Any] | None:
    return db.query_one("SELECT * FROM chatbots WHERE id = %s", (bot_id,))


def get_bot_detail(bot_id: str) -> dict[str, Any]:
    bot = get_bot(bot_id)
    if not bot:
        return {"success": False, "error": "Chatbot not found", "status": 404}

    return {
        "success": True,
        "bot": bot,
        "sources": db.query(
            "SELECT * FROM knowledge_sources WHERE chatbot_id = %s ORDER BY created_at DESC",
            (bot_id,),
        ),
        "leads": db.query(
            "SELECT * FROM leads WHERE chatbot_id = %s ORDER BY created_at DESC", (bot_id,)
        ),
        "conversations": db.query(
            "SELECT * FROM conversations WHERE chatbot_id = %s ORDER BY created_at DESC",
            (bot_id,),
        ),
    }


UPDATABLE_FIELDS = {
    "name": "name",
    "description": "description",
    "avatar": "avatar",
    "primaryColor": "primary_color",
    "welcomeMessage": "welcome_message",
    "tone": "tone",
    "systemPrompt": "system_prompt",
    "strictness": "strictness",
    "leadCaptureEnabled": "lead_capture_enabled",
    "leadCapturePrompt": "lead_capture_prompt",
    "customApiKey": "custom_api_key",
}


def update_bot(bot_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    assignments: list[str] = []
    values: list[Any] = []

    for api_field, column in UPDATABLE_FIELDS.items():
        if api_field in payload and payload[api_field] is not None:
            assignments.append(f"{column} = %s")
            values.append(payload[api_field])

    if "suggestedQuestions" in payload:
        assignments.append("suggested_questions = %s::jsonb")
        values.append(db.as_jsonb(payload["suggestedQuestions"]))

    if assignments:
        assignments.append("updated_at = NOW()")
        values.append(bot_id)
        db.execute(f"UPDATE chatbots SET {', '.join(assignments)} WHERE id = %s", values)

    bot = get_bot(bot_id)
    if not bot:
        return {"success": False, "error": "Chatbot not found", "status": 404}
    return {"success": True, "bot": bot}


def delete_bot(bot_id: str) -> dict[str, Any]:
    db.execute_many(
        [
            ("DELETE FROM messages WHERE chatbot_id = %s", (bot_id,)),
            ("DELETE FROM leads WHERE chatbot_id = %s", (bot_id,)),
            ("DELETE FROM conversations WHERE chatbot_id = %s", (bot_id,)),
            ("DELETE FROM knowledge_chunks WHERE chatbot_id = %s", (bot_id,)),
            ("DELETE FROM knowledge_sources WHERE chatbot_id = %s", (bot_id,)),
            ("DELETE FROM chatbots WHERE id = %s", (bot_id,)),
        ]
    )
    return {"success": True, "message": "Chatbot deleted"}


# --------------------------------------------------------------------------
# Creation flows
# --------------------------------------------------------------------------
def create_bot(payload: dict[str, Any]) -> dict[str, Any]:
    db.init_schema()

    preset_id = payload.get("templateId") or payload.get("presetId")
    manual_content = (payload.get("manualContent") or "").strip()
    website_url = (payload.get("websiteUrl") or "").strip()

    bot_id = _uid("bot")
    overrides = {
        "name": payload.get("name"),
        "description": payload.get("description"),
        "tone": payload.get("tone"),
        "avatar": payload.get("avatar"),
        "primaryColor": payload.get("primaryColor"),
    }

    if preset_id:
        preset = presets.get_preset(preset_id)
        if not preset:
            return {"success": False, "error": "Preset not found", "status": 400}
        _create_bot_from_preset(preset, bot_id, overrides)
        counts = _refresh_counts(bot_id)
        return {"success": True, "botId": bot_id,
                "pagesIndexed": counts["pages"], "chunksIndexed": counts["chunks"]}

    if manual_content and not website_url:
        return _create_bot_from_text(bot_id, manual_content, overrides)

    if not website_url:
        return {"success": False, "error": "A website URL is required", "status": 400}

    return _create_bot_from_website(bot_id, website_url, overrides,
                                    crawl_subpages=bool(payload.get("crawlSubpages", True)))


def _create_bot_from_text(bot_id: str, content: str, overrides: dict[str, Any]) -> dict[str, Any]:
    name = overrides.get("name") or "Knowledge Assistant"
    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()] or [content]
    chunks = [
        {
            "heading": f"Section {i}",
            "content": paragraph,
            "keywords": paragraph[:60],
        }
        for i, paragraph in enumerate(paragraphs, start=1)
    ]

    db.execute(
        """
        INSERT INTO chatbots
            (id, name, description, website_url, avatar, primary_color, welcome_message,
             tone, strictness, lead_capture_enabled, lead_capture_prompt,
             suggested_questions, status, scraped_pages_count, total_chunks_count)
        VALUES (%s, %s, %s, 'manual://knowledge-base', %s, %s, %s, %s, 'strict', TRUE,
                %s, %s::jsonb, 'ready', 1, %s)
        """,
        (
            bot_id,
            name,
            overrides.get("description") or "Trained on a custom pasted knowledge base.",
            overrides.get("avatar") or "📚",
            overrides.get("primaryColor") or "#4f46e5",
            f"Hi! 👋 I'm the assistant for {name}. Ask me anything about these documents!",
            overrides.get("tone") or "friendly",
            "Want a human to follow up? Leave your contact details.",
            db.as_jsonb(["Summarise the main points", "What are the key terms?"]),
            len(chunks),
        ),
    )

    source_id = f"{bot_id}-src-manual"
    _insert_source(bot_id, source_id, "manual://knowledge-base", f"{name} Documentation",
                   content, len(chunks), content_type="manual_text")
    _insert_chunks(bot_id, source_id, "manual://knowledge-base", name, chunks)
    counts = _refresh_counts(bot_id)

    return {"success": True, "botId": bot_id,
            "pagesIndexed": counts["pages"], "chunksIndexed": counts["chunks"]}


def _create_bot_from_website(bot_id: str, website_url: str, overrides: dict[str, Any],
                             crawl_subpages: bool = True) -> dict[str, Any]:
    try:
        page = scrape_url(website_url)
    except ScrapeError as exc:
        return {
            "success": False,
            "status": 422,
            "error": (
                f"{exc} — the site may block bots or render content with JavaScript. "
                "You can still launch a preset or paste the website text manually."
            ),
        }

    name = overrides.get("name") or page.title.split("|")[0].split("-")[0].strip() or "Website Bot"
    description = overrides.get("description") or page.description or f"AI assistant for {page.title}"

    starters = []
    if page.headings:
        starters.append(f"Tell me about {page.headings[0]}")
    starters += [
        f"What does {name} offer?",
        "Where can I find pricing or contact details?",
        "How do I get started?",
    ]

    db.execute(
        """
        INSERT INTO chatbots
            (id, name, description, website_url, avatar, primary_color, welcome_message,
             tone, strictness, lead_capture_enabled, lead_capture_prompt,
             suggested_questions, status, scraped_pages_count, total_chunks_count)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'balanced', TRUE, %s, %s::jsonb, 'ready', 1, %s)
        """,
        (
            bot_id,
            name[:120],
            description[:500],
            page.url,
            overrides.get("avatar") or "🤖",
            overrides.get("primaryColor") or "#4f46e5",
            f"Hello! 👋 I'm the AI assistant for {name}. Ask me anything about this website!",
            overrides.get("tone") or "friendly",
            "Want to talk to the team or get a custom quote? Drop your email below!",
            db.as_jsonb(starters[:4]),
            len(page.chunks),
        ),
    )

    source_id = f"{bot_id}-src-1"
    _insert_source(bot_id, source_id, page.url, page.title, page.raw_text, len(page.chunks))
    _insert_chunks(bot_id, source_id, page.url, page.title,
                   [c.to_dict() for c in page.chunks])

    crawled_urls = [page.url]
    if crawl_subpages:
        for index, sub_url in enumerate(page.discovered_links[:3], start=2):
            try:
                sub_page = scrape_url(sub_url, timeout=8)
            except ScrapeError:
                continue
            if not sub_page.chunks:
                continue
            sub_source_id = f"{bot_id}-src-{index}"
            _insert_source(bot_id, sub_source_id, sub_page.url, sub_page.title,
                           sub_page.raw_text, len(sub_page.chunks))
            _insert_chunks(bot_id, sub_source_id, sub_page.url, sub_page.title,
                           [c.to_dict() for c in sub_page.chunks])
            crawled_urls.append(sub_page.url)

    counts = _refresh_counts(bot_id)
    return {
        "success": True,
        "botId": bot_id,
        "pagesIndexed": counts["pages"],
        "chunksIndexed": counts["chunks"],
        "crawledUrls": crawled_urls,
    }


# --------------------------------------------------------------------------
# Knowledge management
# --------------------------------------------------------------------------
def crawl_additional_url(bot_id: str, url: str) -> dict[str, Any]:
    if not get_bot(bot_id):
        return {"success": False, "error": "Chatbot not found", "status": 404}

    try:
        page = scrape_url(url)
    except ScrapeError as exc:
        return {"success": False, "error": str(exc), "status": 422}

    existing = db.query_one(
        "SELECT id FROM knowledge_sources WHERE chatbot_id = %s AND url = %s",
        (bot_id, page.url),
    )
    if existing:
        db.execute_many(
            [
                ("DELETE FROM knowledge_chunks WHERE source_id = %s", (existing["id"],)),
                ("DELETE FROM knowledge_sources WHERE id = %s", (existing["id"],)),
            ]
        )

    source_id = _uid(f"{bot_id}-src")
    _insert_source(bot_id, source_id, page.url, page.title, page.raw_text, len(page.chunks))
    _insert_chunks(bot_id, source_id, page.url, page.title, [c.to_dict() for c in page.chunks])
    counts = _refresh_counts(bot_id)

    return {
        "success": True,
        "sourceId": source_id,
        "title": page.title,
        "chunksCount": len(page.chunks),
        "totalSources": counts["pages"],
        "totalChunks": counts["chunks"],
    }


def add_manual_source(bot_id: str, title: str, content: str,
                      content_type: str = "manual_text") -> dict[str, Any]:
    if not get_bot(bot_id):
        return {"success": False, "error": "Chatbot not found", "status": 404}
    if not title or not content:
        return {"success": False, "error": "Title and content are required", "status": 400}

    paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()] or [content]
    chunks = [
        {
            "heading": title if len(paragraphs) == 1 else f"{title} (Part {i})",
            "content": paragraph,
            "keywords": paragraph[:60],
        }
        for i, paragraph in enumerate(paragraphs, start=1)
    ]

    source_id = _uid(f"{bot_id}-manual")
    url = f"manual://{title.replace(' ', '-').lower()}"
    _insert_source(bot_id, source_id, url, title, content, len(chunks), content_type)
    _insert_chunks(bot_id, source_id, url, title, chunks)
    counts = _refresh_counts(bot_id)

    return {"success": True, "sourceId": source_id, "chunksCreated": len(chunks),
            "totalChunks": counts["chunks"]}


def list_chunks(bot_id: str, search: str = "") -> dict[str, Any]:
    if search:
        pattern = f"%{search.lower()}%"
        chunks = db.query(
            """
            SELECT * FROM knowledge_chunks
            WHERE chatbot_id = %s AND (
                LOWER(heading) LIKE %s OR LOWER(content) LIKE %s
                OR LOWER(keywords) LIKE %s OR LOWER(source_title) LIKE %s)
            ORDER BY created_at DESC, chunk_index ASC
            """,
            (bot_id, pattern, pattern, pattern, pattern),
        )
    else:
        chunks = db.query(
            """
            SELECT * FROM knowledge_chunks WHERE chatbot_id = %s
            ORDER BY created_at DESC, chunk_index ASC
            """,
            (bot_id,),
        )
    return {"success": True, "chunks": chunks}


# --------------------------------------------------------------------------
# Chat
# --------------------------------------------------------------------------
def chat(bot_id: str, message: str, conversation_id: str | None = None,
         visitor_id: str = "web-visitor") -> dict[str, Any]:
    if not message or not message.strip():
        return {"success": False, "error": "Message text is required", "status": 400}

    bot = get_bot(bot_id)
    if not bot:
        return {"success": False, "error": "Chatbot not found", "status": 404}

    if not conversation_id:
        conversation_id = _uid("conv")
        db.execute(
            """
            INSERT INTO conversations (id, chatbot_id, visitor_id, messages_count, lead_captured)
            VALUES (%s, %s, %s, 0, FALSE)
            """,
            (conversation_id, bot_id, visitor_id),
        )
    elif not db.query_one("SELECT id FROM conversations WHERE id = %s", (conversation_id,)):
        db.execute(
            """
            INSERT INTO conversations (id, chatbot_id, visitor_id, messages_count, lead_captured)
            VALUES (%s, %s, %s, 0, FALSE)
            """,
            (conversation_id, bot_id, visitor_id),
        )

    history = db.query(
        """
        SELECT sender, text FROM messages
        WHERE conversation_id = %s ORDER BY created_at DESC LIMIT 6
        """,
        (conversation_id,),
    )
    history.reverse()

    db.execute(
        """
        INSERT INTO messages (id, conversation_id, chatbot_id, sender, text, citations, confidence)
        VALUES (%s, %s, %s, 'user', %s, '[]'::jsonb, 100)
        """,
        (_uid("msg-u"), conversation_id, bot_id, message),
    )

    result = rag.generate_answer(bot, message, history)

    assistant_id = _uid("msg-a")
    db.execute(
        """
        INSERT INTO messages (id, conversation_id, chatbot_id, sender, text, citations, confidence)
        VALUES (%s, %s, %s, 'assistant', %s, %s::jsonb, %s)
        """,
        (
            assistant_id,
            conversation_id,
            bot_id,
            result["answer"],
            db.as_jsonb(result["citations"]),
            int(result["confidence"]),
        ),
    )
    db.execute(
        """
        UPDATE conversations
        SET messages_count = messages_count + 2, updated_at = NOW()
        WHERE id = %s
        """,
        (conversation_id,),
    )

    return {
        "success": True,
        "conversationId": conversation_id,
        "messageId": assistant_id,
        "answer": result["answer"],
        "citations": result["citations"],
        "confidence": result["confidence"],
        "suggestedFollowUps": result.get("suggestedFollowUps", []),
        "shouldTriggerLeadCapture": result.get("shouldTriggerLeadCapture", False),
        "engine": result.get("engine", "sitemind-local-rag"),
        "retrieved": result.get("retrieved", []),
    }


def rate_message(message_id: str, rating: str | None) -> dict[str, Any]:
    if rating not in ("up", "down", None):
        return {"success": False, "error": "Invalid rating", "status": 400}
    db.execute("UPDATE messages SET rating = %s WHERE id = %s", (rating, message_id))
    return {"success": True, "rating": rating}


# --------------------------------------------------------------------------
# Leads
# --------------------------------------------------------------------------
def list_leads(bot_id: str) -> dict[str, Any]:
    return {
        "success": True,
        "leads": db.query(
            "SELECT * FROM leads WHERE chatbot_id = %s ORDER BY created_at DESC", (bot_id,)
        ),
    }


def create_lead(bot_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip()
    if not name or not email:
        return {"success": False, "error": "Name and email are required", "status": 400}

    lead_id = _uid("lead")
    db.execute(
        """
        INSERT INTO leads (id, chatbot_id, conversation_id, name, email, phone, query)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (lead_id, bot_id, payload.get("conversationId"), name, email,
         payload.get("phone"), payload.get("query")),
    )

    if payload.get("conversationId"):
        db.execute(
            "UPDATE conversations SET lead_captured = TRUE WHERE id = %s",
            (payload["conversationId"],),
        )

    return {"success": True, "leadId": lead_id}


# --------------------------------------------------------------------------
# Embed widget script
# --------------------------------------------------------------------------
def embed_script(bot_id: str, base_url: str) -> str:
    bot = get_bot(bot_id)
    if not bot:
        return "/* SiteMind AI: chatbot not found */"

    config = json.dumps(
        {
            "botId": bot_id,
            "name": bot["name"],
            "color": bot.get("primaryColor") or "#4f46e5",
            "avatar": bot.get("avatar") or "🤖",
            "widgetUrl": f"{base_url}/widget/{bot_id}",
        }
    )

    return f"""/* SiteMind AI embeddable chat widget — generated by the Python backend */
(function () {{
  if (document.getElementById('sitemind-widget-container')) return;
  var cfg = {config};

  var container = document.createElement('div');
  container.id = 'sitemind-widget-container';
  container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:2147483000;font-family:ui-sans-serif,system-ui,sans-serif;';

  var frame = document.createElement('iframe');
  frame.src = cfg.widgetUrl;
  frame.title = 'Chat with ' + cfg.name;
  frame.style.cssText = 'position:fixed;bottom:96px;right:24px;width:400px;max-width:calc(100vw - 32px);height:620px;max-height:calc(100vh - 130px);border:none;border-radius:18px;box-shadow:0 18px 48px rgba(0,0,0,.28);display:none;background:#0f172a;';

  var button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', 'Chat with ' + cfg.name);
  button.style.cssText = 'width:58px;height:58px;border-radius:50%;background:' + cfg.color + ';color:#fff;border:none;box-shadow:0 10px 26px rgba(0,0,0,.25);cursor:pointer;font-size:26px;line-height:1;display:flex;align-items:center;justify-content:center;transition:transform .2s cubic-bezier(.34,1.56,.64,1);';
  button.innerHTML = cfg.avatar;
  button.onmouseenter = function () {{ button.style.transform = 'scale(1.08)'; }};
  button.onmouseleave = function () {{ button.style.transform = 'scale(1)'; }};

  var open = false;
  button.onclick = function () {{
    open = !open;
    frame.style.display = open ? 'block' : 'none';
    button.innerHTML = open ? '&#10005;' : cfg.avatar;
    button.style.fontSize = open ? '20px' : '26px';
  }};

  container.appendChild(frame);
  container.appendChild(button);
  document.body.appendChild(container);
}})();
"""


# --------------------------------------------------------------------------
# Health
# --------------------------------------------------------------------------
def health() -> dict[str, Any]:
    db.init_schema()
    return {
        "ok": db.ping(),
        "backend": "python",
        "engine": "sitemind-rag",
        "presets": len(presets.WEBSITE_PRESETS),
    }
