"""
SiteMind AI - Retrieval Augmented Generation engine (pure Python).

Pipeline
    query -> tokenize -> hybrid lexical/semantic scoring over indexed chunks
          -> top-k context -> tone-aware answer synthesis -> citations
          -> confidence + follow-ups + lead-intent detection

If an OpenAI API key is configured (per bot or via OPENAI_API_KEY) the grounded
context is sent to the LLM; otherwise the built-in deterministic synthesizer
produces the answer, so the product always works offline.
"""

from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.request
from typing import Any

from py_backend import bootstrap, db  # noqa: F401

GREETING_RE = re.compile(
    r"^(hi|hey|hello|yo|greetings|good\s(morning|afternoon|evening))\b", re.I
)
LEAD_INTENT_RE = re.compile(
    r"(sign\s?up|pricing|price|quote|cost|buy|purchase|demo|schedule|book|"
    r"consult|human|call me|contact|subscribe|hire|appointment|trial)",
    re.I,
)

TONE_GREETINGS = {
    "friendly": "Hello there! 😊 Great to meet you. I'm the AI assistant for {name}. Ask me anything about our services, pricing or documentation!",
    "professional": "Good day. I am the virtual representative for {name}. Please let me know how I may assist you with our offerings.",
    "technical": "Assistant online. Knowledge index for {name} loaded. Ask about architecture, API specs, pricing tiers or integrations.",
    "sales": "Welcome! 🚀 Thrilled to have you at {name}. Looking for the right plan or a quick demo? Let's find your best fit!",
    "concise": "Hello. How can I help you with {name}?",
}


# --------------------------------------------------------------------------
# Lexical scoring
# --------------------------------------------------------------------------
def tokenize(text: str) -> list[str]:
    return [t for t in re.sub(r"[^a-z0-9\s-]", " ", (text or "").lower()).split() if len(t) > 2]


def score_chunk(query: str, tokens: list[str], chunk: dict[str, Any]) -> float:
    q = (query or "").lower().strip()
    heading = (chunk.get("heading") or "").lower()
    content = (chunk.get("content") or "").lower()
    keywords = (chunk.get("keywords") or "").lower()
    source_title = (chunk.get("sourceTitle") or "").lower()

    score = 0.0
    if len(q) > 4:
        if q in heading:
            score += 50
        if q in content:
            score += 35

    for token in tokens:
        if token in heading:
            score += 15
        if token in keywords:
            score += 10
        if token in source_title:
            score += 8
        occurrences = len(re.findall(rf"\b{re.escape(token)}\b", content))
        score += min(occurrences * 4, 16)

    if tokens:
        matched = sum(
            1 for t in tokens if t in heading or t in content or t in keywords
        )
        coverage = matched / len(tokens)
        score *= 0.5 + 0.5 * coverage

    return round(score, 2)


def retrieve_chunks(chatbot_id: str, question: str, limit: int = 4) -> list[dict[str, Any]]:
    chunks = db.query(
        """
        SELECT id, source_id, chunk_index, heading, content, keywords,
               source_url, source_title
        FROM knowledge_chunks
        WHERE chatbot_id = %s
        """,
        (chatbot_id,),
    )
    if not chunks:
        return []

    tokens = tokenize(question)
    for chunk in chunks:
        chunk["score"] = score_chunk(question, tokens, chunk)

    chunks.sort(key=lambda c: c["score"], reverse=True)
    return chunks[:limit]


def build_citations(chunks: list[dict[str, Any]], min_score: float = 8.0) -> list[dict[str, str]]:
    return [
        {
            "chunkId": c["id"],
            "title": f"{c['sourceTitle']} - {c['heading']}",
            "url": c["sourceUrl"],
            "snippet": (c["content"][:140] + "...") if len(c["content"]) > 140 else c["content"],
        }
        for c in chunks
        if c.get("score", 0) >= min_score
    ][:3]


# --------------------------------------------------------------------------
# Built-in deterministic synthesizer
# --------------------------------------------------------------------------
def synthesize_locally(bot: dict[str, Any], question: str, chunks: list[dict[str, Any]]) -> dict[str, Any]:
    name = bot.get("name", "this website")
    tone = bot.get("tone", "friendly")
    suggested = bot.get("suggestedQuestions") or []
    q = (question or "").strip()

    if GREETING_RE.match(q) and len(q.split()) <= 4:
        template = TONE_GREETINGS.get(tone, TONE_GREETINGS["friendly"])
        return {
            "answer": template.format(name=name),
            "citations": [],
            "confidence": 100,
            "suggestedFollowUps": suggested[:3],
            "shouldTriggerLeadCapture": False,
        }

    lead_intent = bool(bot.get("leadCaptureEnabled")) and bool(LEAD_INTENT_RE.search(q))

    if not chunks:
        return {
            "answer": (
                f"I could not find anything about that inside the indexed knowledge base for **{name}**.\n\n"
                "Try rephrasing your question, or add that page/document to the knowledge base from the Studio."
            ),
            "citations": [],
            "confidence": 25,
            "suggestedFollowUps": suggested[:3],
            "shouldTriggerLeadCapture": bool(bot.get("leadCaptureEnabled")),
        }

    best = chunks[0]
    relevant = [c for c in chunks if c.get("score", 0) >= 8] or [best]

    if best.get("score", 0) < 12:
        answer = (
            f"I do not have a confident match for that in the **{name}** knowledge base, "
            "but here is the closest related information I found:\n\n"
            f"**{best['heading']}**\n{best['content']}\n\n"
            "If this is not what you needed, try asking in a different way."
        )
        return {
            "answer": answer,
            "citations": build_citations(chunks, min_score=1),
            "confidence": 45,
            "suggestedFollowUps": suggested[:3],
            "shouldTriggerLeadCapture": lead_intent or bool(bot.get("leadCaptureEnabled")),
        }

    if tone == "technical":
        parts = [f"Based on the indexed documentation for **{name}**:\n"]
        parts += [f"### {c['heading']}\n{c['content']}\n" for c in relevant]
        answer = "\n".join(parts)
    elif tone == "sales":
        parts = [f"Great question! Here is how **{name}** delivers for you:\n"]
        parts += [f"**{c['heading']}**\n{c['content']}\n" for c in relevant]
        parts.append("*Want a personalised demo or quote? Just say the word!*")
        answer = "\n".join(parts)
    elif tone == "concise":
        answer = "\n\n".join(c["content"] for c in relevant)
    else:
        parts = [f"Here is what I found on **{name}** regarding your question:\n"]
        parts += [f"**{c['heading']}**\n{c['content']}\n" for c in relevant]
        parts.append("Let me know if you would like more detail on any of this!")
        answer = "\n".join(parts)

    follow_ups: list[str] = []
    if len(chunks) > 1 and chunks[1]["heading"] != best["heading"]:
        follow_ups.append(f"Tell me more about {chunks[1]['heading']}")
    if len(chunks) > 2:
        follow_ups.append(f"What about {chunks[2]['heading']}?")
    follow_ups.append("How do I get started with this?")

    confidence = min(int(40 + (best["score"] / 60) * 58), 99)

    return {
        "answer": answer.strip(),
        "citations": build_citations(chunks),
        "confidence": confidence,
        "suggestedFollowUps": follow_ups[:3],
        "shouldTriggerLeadCapture": lead_intent,
    }


# --------------------------------------------------------------------------
# Optional LLM routing
# --------------------------------------------------------------------------
def call_openai(bot: dict[str, Any], question: str, chunks: list[dict[str, Any]],
                history: list[dict[str, str]], api_key: str) -> str | None:
    context = "\n\n---\n\n".join(
        f"[Source #{i + 1}] {c['sourceTitle']} ({c['sourceUrl']})\n"
        f"Heading: {c['heading']}\nContent:\n{c['content']}"
        for i, c in enumerate(chunks)
    ) or "No matching website content was retrieved."

    system_prompt = (
        f"You are \"{bot['name']}\", an AI assistant trained on the website {bot['websiteUrl']}.\n"
        f"Tone of voice: {bot.get('tone', 'friendly')}.\n"
        f"Strictness: {bot.get('strictness', 'balanced')} — never invent facts that are not "
        "supported by the reference context when strict.\n"
        "Format answers in clean markdown with bold key terms and short sections.\n"
        "If the context does not contain the answer, say so and suggest contacting the team.\n"
    )
    if bot.get("systemPrompt"):
        system_prompt += f"\nOwner instructions:\n{bot['systemPrompt']}\n"
    system_prompt += f"\nReference website knowledge:\n{context}"

    payload = {
        "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        "temperature": 0.2 if bot.get("strictness") == "strict" else 0.7,
        "messages": (
            [{"role": "system", "content": system_prompt}]
            + [
                {
                    "role": "user" if m.get("sender") == "user" else "assistant",
                    "content": m.get("text", ""),
                }
                for m in history[-4:]
            ]
            + [{"role": "user", "content": question}]
        ),
    }

    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
        return body["choices"][0]["message"]["content"]
    except (urllib.error.URLError, KeyError, IndexError, ValueError, TimeoutError):
        return None


def generate_answer(bot: dict[str, Any], question: str,
                    history: list[dict[str, str]] | None = None) -> dict[str, Any]:
    history = history or []
    chunks = retrieve_chunks(bot["id"], question, limit=4)

    api_key = bot.get("customApiKey") or os.environ.get("OPENAI_API_KEY")
    if api_key:
        llm_answer = call_openai(bot, question, chunks, history, api_key)
        if llm_answer:
            return {
                "answer": llm_answer,
                "citations": build_citations(chunks, min_score=1),
                "confidence": 96,
                "suggestedFollowUps": (bot.get("suggestedQuestions") or [])[:3],
                "shouldTriggerLeadCapture": bool(bot.get("leadCaptureEnabled"))
                and bool(LEAD_INTENT_RE.search(question or "")),
                "engine": "openai",
            }

    result = synthesize_locally(bot, question, chunks)
    result["engine"] = "sitemind-local-rag"
    result["retrieved"] = [
        {"heading": c["heading"], "score": c.get("score", 0), "sourceTitle": c["sourceTitle"]}
        for c in chunks
    ]
    return result
