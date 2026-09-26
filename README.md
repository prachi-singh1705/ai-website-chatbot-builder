# 🤖 SiteMind AI — AI Website Chatbot Builder

SiteMind AI is an AI-powered website chatbot builder that allows website owners to create a chatbot from their website content and embed it directly into their websites.

The platform crawls website content, converts it into searchable knowledge chunks, retrieves relevant information for user questions, and generates grounded responses using a Python-based RAG pipeline.

---

## 🚀 Features

- 🌐 Create an AI chatbot from a website URL
- 🕷️ Website crawling and content extraction
- 🧹 HTML content cleaning and semantic chunking
- 🧠 Retrieval-Augmented Generation (RAG)
- 🔎 Hybrid knowledge retrieval
- 💬 AI-powered website chat
- 🎨 Custom chatbot persona, tone, avatar and color
- 📚 Add manual knowledge sources
- 📊 Conversation and message management
- 👤 Lead collection
- ⭐ Message rating
- 🔗 Embeddable chatbot widget
- 🖥️ Standalone Python REST API
- 🔌 Next.js frontend connected to the Python backend
- 🗄️ PostgreSQL database support
- 🤖 Optional OpenAI LLM integration
- ⚡ Deterministic Python RAG fallback when no API key is configured

---

## 🏗️ Architecture

```text
                         Website Owner
                               │
                               ▼
                    ┌────────────────────┐
                    │   Next.js UI       │
                    │   React + TS       │
                    └─────────┬──────────┘
                              │
                         HTTP / Bridge
                              │
                              ▼
                    ┌────────────────────┐
                    │   Python Backend   │
                    │      SiteMind      │
                    └─────────┬──────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        Web Scraper       RAG Engine       Database
        BeautifulSoup     Retrieval        PostgreSQL
             │                │
             ▼                ▼
        Website Text      Relevant Chunks
             │                │
             ▼                ▼
        Chunking       LLM / RAG Synthesis
                              │
                              ▼
                         Chat Response
                              │
                              ▼
                     Embeddable Widget
                              │
                              ▼
                       Customer Website
