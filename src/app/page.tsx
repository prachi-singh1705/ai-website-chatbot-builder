"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Bot,
  Sparkles,
  ArrowRight,
  Zap,
  CheckCircle2,
  FileText,
  Users,
  MessageSquare,
  Copy,
  Trash2,
  Layers,
  ChevronRight,
  Code2,
  Sliders,
  ExternalLink,
  Shield,
  Loader2,
  Plus,
} from "lucide-react";
import Navbar from "@/components/Navbar";

interface WebsitePreset {
  id: string;
  name: string;
  category: string;
  websiteUrl: string;
  avatar: string;
  primaryColor: string;
  tone: string;
  description: string;
  pagesCount: number;
  chunksCount: number;
}

interface ChatbotSummary {
  id: string;
  name: string;
  description: string | null;
  websiteUrl: string;
  avatar: string;
  primaryColor: string;
  tone: string;
  scrapedPagesCount: number;
  totalChunksCount: number;
  leadsCount: number;
  conversationsCount: number;
  createdAt: string;
}

export default function HomePage() {
  const [bots, setBots] = useState<ChatbotSummary[]>([]);
  const [presets, setPresets] = useState<WebsitePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [crawlSubpages, setCrawlSubpages] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Manual Creation Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState<"url" | "template" | "manual">("url");
  const [modalName, setModalName] = useState("");
  const [modalUrl, setModalUrl] = useState("");
  const [modalTone, setModalTone] = useState("friendly");
  const [modalAvatar, setModalAvatar] = useState("🤖");
  const [modalColor, setModalColor] = useState("#4f46e5");
  const [modalManualText, setModalManualText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  const fetchBots = async () => {
    try {
      const res = await fetch("/api/bots");
      const data = await res.json();
      if (data.success && data.bots) {
        setBots(data.bots);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchPresets = async () => {
    try {
      const res = await fetch("/api/presets");
      const data = await res.json();
      if (data.success && data.presets) {
        setPresets(data.presets);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchBots();
    fetchPresets();
  }, []);

  const handleQuickUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Crawling website and extracting clean knowledge chunks...");

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: urlInput.trim(),
          crawlSubpages,
          tone: "friendly",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setStatusMessage(`Successfully indexed ${data.pagesIndexed} pages and ${data.chunksIndexed} knowledge chunks!`);
        setUrlInput("");
        await fetchBots();
        setTimeout(() => {
          window.location.href = `/bots/${data.botId}`;
        }, 800);
      } else {
        setErrorMessage(data.error || "Failed to crawl website. You can also pick a preset template below!");
      }
    } catch {
      setErrorMessage("Network error occurred while crawling website. Please try again or test a demo template.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFromTemplate = async (templateId: string) => {
    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("Configuring bot with full multi-page template knowledge base...");

    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });

      const data = await res.json();
      if (data.success) {
        await fetchBots();
        window.location.href = `/bots/${data.botId}`;
      } else {
        setErrorMessage(data.error || "Failed to generate bot from template");
      }
    } catch {
      setErrorMessage("Error creating bot from template");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload: Record<string, unknown> = {
        name: modalName || undefined,
        tone: modalTone,
        avatar: modalAvatar,
        primaryColor: modalColor,
      };

      if (creationMode === "template") {
        payload.templateId = selectedTemplateId || presets[0]?.id || "flowpulse-saas";
      } else if (creationMode === "manual") {
        payload.manualContent = modalManualText;
      } else {
        payload.websiteUrl = modalUrl;
        payload.crawlSubpages = true;
      }

      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        await fetchBots();
        window.location.href = `/bots/${data.botId}`;
      } else {
        setErrorMessage(data.error || "Failed to create chatbot");
      }
    } catch {
      setErrorMessage("Network error during bot creation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBot = async (botId: string, botName: string) => {
    if (!confirm(`Are you sure you want to delete "${botName}"? This will remove all indexed chunks and conversations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/bots/${botId}`, { method: "DELETE" });
      if (res.ok) {
        setBots((prev) => prev.filter((b) => b.id !== botId));
      }
    } catch {
      // ignore
    }
  };

  const handleCopyEmbedCode = (botId: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const snippet = `<script src="${origin}/api/bots/${botId}/embed.js" defer></script>`;
    navigator.clipboard.writeText(snippet);
    setCopiedId(botId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      <Navbar onNewBotClick={() => setShowCreateModal(true)} />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        {/* Glow Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-blue-600/20 to-cyan-500/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Python GenAI RAG Engine • Turn Any URL into an AI Chatbot</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
              🐍 Python 3.11 backend
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Build a Custom AI Chatbot{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Trained on Any Website
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Provide a website URL or documentation. Our crawler parses pages, indexes knowledge chunks with hybrid semantic search, and produces an embeddable AI chatbot with live citations & lead capture.
          </p>

          {/* Quick URL Crawl Form */}
          <div id="create" className="max-w-2xl mx-auto pt-2">
            <form
              onSubmit={handleQuickUrlSubmit}
              className="p-2 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1 flex items-center">
                <Globe className="w-5 h-5 text-indigo-400 absolute left-3.5" />
                <input
                  type="text"
                  required
                  placeholder="https://example.com or flowpulse.ai"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !urlInput.trim()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Indexing...</span>
                  </>
                ) : (
                  <>
                    <span>Build Chatbot</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-2.5 flex items-center justify-center gap-4 text-xs text-slate-400">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={crawlSubpages}
                  onChange={(e) => setCrawlSubpages(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Deep crawl subpages (pricing, about, docs)</span>
              </label>
              <span>•</span>
              <button
                type="button"
                onClick={() => {
                  setCreationMode("manual");
                  setShowCreateModal(true);
                }}
                className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
              >
                Or paste raw text / FAQs
              </button>
            </div>

            {/* Status & Error Feedback */}
            {statusMessage && (
              <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-xs text-indigo-300 flex items-center justify-center gap-2 animate-in fade-in">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="mt-4 p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300 flex items-center justify-center gap-2 animate-in fade-in">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Preset Demo Templates Quick Bar */}
      <section id="templates" className="py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-900 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>One-Click Website Presets</span>
              </h2>
              <p className="text-xs text-slate-400">
                Want to test instantly? Click any template to generate a complete multi-page indexed bot with sample leads and FAQs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {presets.map((tpl) => (
              <div
                key={tpl.id}
                className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl p-2 rounded-xl bg-slate-950 border border-slate-800">
                      {tpl.avatar}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {tpl.category}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-semibold text-white text-base group-hover:text-indigo-300 transition-colors">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{tpl.pagesCount} Pages</span>
                    <span>•</span>
                    <span>{tpl.chunksCount} Chunks</span>
                    <span>•</span>
                    <span className="capitalize">{tpl.tone} Tone</span>
                  </div>
                </div>

                <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-mono truncate max-w-[140px]">
                    {tpl.websiteUrl.replace("https://", "")}
                  </span>
                  <button
                    onClick={() => handleCreateFromTemplate(tpl.id)}
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <span>Launch Preset</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Active Chatbots Dashboard */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Bot className="w-6 h-6 text-indigo-400" />
              <span>Your Active Chatbots</span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {bots.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage your indexed knowledge bases, playground test drives, embed codes, and captured leads.
            </p>
          </div>

          <button
            onClick={() => {
              setCreationMode("url");
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Chatbot</span>
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading active chatbots...</p>
          </div>
        ) : bots.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40 p-8 space-y-4">
            <Bot className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">No chatbots created yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Enter any website URL at the top or click one of our one-click presets to build your first AI chatbot!
            </p>
            <button
              onClick={() => handleCreateFromTemplate("flowpulse-saas")}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-medium inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Sample SaaS Bot</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-xl transition-all flex flex-col justify-between group"
              >
                {/* Bot Card Header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-md shrink-0"
                        style={{ backgroundColor: bot.primaryColor || "#3b82f6" }}
                      >
                        {bot.avatar || "🤖"}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {bot.name}
                        </h3>
                        <a
                          href={bot.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 truncate max-w-[170px]"
                        >
                          <span>{bot.websiteUrl.replace(/^https?:\/\//, "")}</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[11px] text-emerald-400 font-medium">Ready</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {bot.description || "Trained AI assistant with custom knowledge retrieval."}
                  </p>

                  {/* Knowledge & Conversion Metrics */}
                  <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
                    <div>
                      <div className="text-sm font-bold text-white">{bot.totalChunksCount}</div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3 text-indigo-400" />
                        <span>Chunks</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        {bot.conversationsCount || 0}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                        <MessageSquare className="w-3 h-3 text-cyan-400" />
                        <span>Chats</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-400">
                        {bot.leadsCount || 0}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center justify-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>Leads</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bot Card Actions */}
                <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyEmbedCode(bot.id)}
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
                      title="Copy embed script"
                    >
                      {copiedId === bot.id ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Code2 className="w-4 h-4" />
                      )}
                    </button>
                    <Link
                      href={`/widget/${bot.id}`}
                      target="_blank"
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition-colors"
                      title="Open standalone widget"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteBot(bot.id, bot.name)}
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 text-xs transition-colors cursor-pointer"
                      title="Delete bot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <Link
                    href={`/bots/${bot.id}`}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    <span>Open Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it Works / Core GenAI Features */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              How SiteMind AI Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              An enterprise-grade Retrieval-Augmented Generation pipeline tailored specifically for public websites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">1. Intelligent Web Crawl</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Python <code className="text-amber-300">urllib</code> + <code className="text-amber-300">BeautifulSoup</code> fetch your site, strip noise nodes and discover high-signal subpages.
              </p>
              <code className="block text-[10px] text-slate-500 font-mono">py_backend/scraper.py</code>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">2. Semantic Chunking</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Heading-aware blocks with <code className="text-amber-300">Counter</code>-based keyword extraction, persisted to Postgres via psycopg2.
              </p>
              <code className="block text-[10px] text-slate-500 font-mono">py_backend/db.py</code>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">3. Hybrid RAG Synthesis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lexical + coverage scoring picks top-k chunks, then tone-aware synthesis (or your OpenAI key) writes the cited answer.
              </p>
              <code className="block text-[10px] text-slate-500 font-mono">py_backend/rag.py</code>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white text-sm">4. Conversational Leads</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Regex intent detection triggers contact capture on pricing, quote, demo or booking questions — exportable as CSV.
              </p>
              <code className="block text-[10px] text-slate-500 font-mono">py_backend/services.py</code>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500">
        <p>SiteMind AI • Intelligent Website Chatbot Builder powered by RAG & GenAI</p>
      </footer>

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <span>Create New Chatbot</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Creation Mode Switcher */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCreationMode("url")}
                className={`py-1.5 rounded-lg font-medium transition-colors ${
                  creationMode === "url"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Website URL
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("template")}
                className={`py-1.5 rounded-lg font-medium transition-colors ${
                  creationMode === "template"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Preset Demo
              </button>
              <button
                type="button"
                onClick={() => setCreationMode("manual")}
                className={`py-1.5 rounded-lg font-medium transition-colors ${
                  creationMode === "manual"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Paste Text
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="space-y-4">
              {creationMode === "url" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Website URL to Ingest
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="https://yourcompany.com"
                    value={modalUrl}
                    onChange={(e) => setModalUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    The bot will crawl the homepage and linked subpages to extract content.
                  </p>
                </div>
              )}

              {creationMode === "template" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select a Template
                  </label>
                  <select
                    value={selectedTemplateId || presets[0]?.id || ""}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {presets.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {creationMode === "manual" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Raw Knowledge / FAQs / Terms
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Paste documentation, return policies, pricing list, or FAQs here..."
                    value={modalManualText}
                    onChange={(e) => setModalManualText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Bot Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sales Guide"
                    value={modalName}
                    onChange={(e) => setModalName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tone of Voice
                  </label>
                  <select
                    value={modalTone}
                    onChange={(e) => setModalTone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="friendly">Friendly 😊</option>
                    <option value="professional">Professional 💼</option>
                    <option value="technical">Technical ⚙️</option>
                    <option value="sales">Sales & CTA 🚀</option>
                    <option value="concise">Concise 📝</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Avatar Emoji
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={modalAvatar}
                    onChange={(e) => setModalAvatar(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={modalColor}
                      onChange={(e) => setModalColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={modalColor}
                      onChange={(e) => setModalColor(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-white uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300">
                  {errorMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Build Bot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
