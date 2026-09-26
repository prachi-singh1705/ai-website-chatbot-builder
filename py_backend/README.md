# SiteMind AI — Python Backend

The **entire application logic is written in Python**. The Next.js layer only
renders the UI and forwards HTTP requests to this package.

```
py_backend/
├── bootstrap.py    # sys.path vendoring + .env loader (no python-dotenv needed)
├── db.py           # psycopg2 access layer, schema bootstrap, camelCase serializer
├── scraper.py      # website crawler + BeautifulSoup parsing + semantic chunking
├── rag.py          # hybrid retrieval, scoring, tone-aware synthesis, OpenAI routing
├── presets.py      # demo website knowledge bases (presets.json)
├── services.py     # product logic: bots, indexing, chat, leads, embed script
├── cli.py          # JSON stdin/stdout bridge used by the Next.js route handlers
├── server.py       # standalone stdlib REST API (run Python without Next.js)
└── vendor/         # vendored psycopg2-binary + beautifulsoup4
```

## Run the Python API standalone

```bash
python3 py_backend/server.py --port 8000
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/bots
curl -X POST http://127.0.0.1:8000/api/bots/flowpulse-saas/chat \
     -H 'Content-Type: application/json' \
     -d '{"message": "What pricing plans do you offer?"}'
```

## Use the CLI bridge directly

```bash
echo '{}' | python3 py_backend/cli.py list_bots
echo '{"websiteUrl":"https://example.com"}' | python3 py_backend/cli.py create_bot
echo '{"botId":"flowpulse-saas","message":"security compliance?"}' | python3 py_backend/cli.py chat
```

## Available CLI actions

| Action | Payload |
| --- | --- |
| `health` | – |
| `seed` | – |
| `list_presets` | – |
| `list_bots` | – |
| `create_bot` | `websiteUrl` \| `templateId` \| `manualContent`, `name`, `tone`, `avatar`, `primaryColor`, `crawlSubpages` |
| `get_bot` | `botId` |
| `update_bot` | `botId`, persona fields |
| `delete_bot` | `botId` |
| `chat` | `botId`, `message`, `conversationId?` |
| `crawl_url` | `botId`, `url` |
| `add_manual_source` | `botId`, `title`, `content` |
| `list_chunks` | `botId`, `q?` |
| `list_leads` / `create_lead` | `botId` (+ `name`, `email`, `phone`) |
| `rate_message` | `messageId`, `rating` |
| `embed_script` | `botId`, `baseUrl` |

## LLM configuration

Set `OPENAI_API_KEY` (or a per-bot key in the Studio) to route generation
through `gpt-4o-mini`. Without a key, the built-in deterministic Python RAG
synthesizer answers every question from the indexed website chunks.
