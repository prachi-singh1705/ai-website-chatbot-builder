"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Bot,
  Globe,
  Sparkles,
  ExternalLink,
  Layers,
  Settings,
  Code2,
  Users,
  MessageSquare,
  Play,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  Check,
  Copy,
  Download,
  AlertCircle,
  Monitor,
  ShieldCheck,
  Cpu,
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ChatWidget from "@/components/ChatWidget";
import MockBrowser from "@/components/MockBrowser";

interface ChatbotDetail {
  id: string;
  name: string;
  description: string | null;
  websiteUrl: string;
  avatar: string;
  primaryColor: string;
  welcomeMessage: string;
  tone: string;
  systemPrompt: string | null;
  strictness: string;
  leadCaptureEnabled: boolean;
  leadCapturePrompt: string;
  suggestedQuestions: string[];
  status: string;
  scrapedPagesCount: number;
  totalChunksCount: number;
  customApiKey: string | null;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeSource {
  id: string;
  url: string;
  title: string;
  contentType: string;
  chunkCount: number;
  status: string;
  createdAt: string;
}

interface KnowledgeChunk {
  id: string;
  chunkIndex: number;
  heading: string;
  content: string;
  keywords: string;
  sourceUrl: string;
  sourceTitle: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  query: string | null;
  createdAt: string;
}

interface Conversation {
  id: string;
  visitorId: string;
  messagesCount: number;
  leadCaptured: boolean;
  createdAt: string;
}

export default function BotStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: botId } = use(params);

  const [bot, setBot] = useState<ChatbotDetail | null>(null);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [leadsList, setLeadsList] = useState<Lead[]>([]);
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
  const [chunksList, setChunksList] = useState<KnowledgeChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"playground" | "knowledge" | "persona" | "embed" | "leads">("playground");
  const [playgroundView, setPlaygroundView] = useState<"mock" | "console">("mock");

  // Persona form fields
  const [formName, setFormName] = useState("");
  const [formAvatar, setFormAvatar] = useState("🤖");
  const [formColor, setFormColor] = useState("#3b82f6");
  const [formWelcome, setFormWelcome] = useState("");
  const [formTone, setFormTone] = useState("friendly");
  const [formStrictness, setFormStrictness] = useState("balanced");
  const [formSystemPrompt, setFormSystemPrompt] = useState("");
  const [formLeadCapture, setFormLeadCapture] = useState(true);
  const [formLeadPrompt, setFormLeadPrompt] = useState("");
  const [formQuestions, setFormQuestions] = useState<string[]>([]);
  const [newQuestionInput, setNewQuestionInput] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Knowledge Modals & Search
  const [showAddUrlModal, setShowAddUrlModal] = useState(false);
  const [newUrlInput, setNewUrlInput] = useState("");
  const [crawlingNewUrl, setCrawlingNewUrl] = useState(false);
  const [showAddTextModal, setShowAddTextModal] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualText, setManualText] = useState("");
  const [addingManual, setAddingManual] = useState(false);
  const [chunkSearch, setChunkSearch] = useState("");
  const [crawlError, setCrawlError] = useState("");

  // Copy feedback
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const fetchBotData = async () => {
    try {
      const res = await fetch(`/api/bots/${botId}`);
      const data = await res.json();
      if (data.success && data.bot) {
        setBot(data.bot);
        setSources(data.sources || []);
        setLeadsList(data.leads || []);
        setConversationsList(data.conversations || []);

        // Sync settings form
        setFormName(data.bot.name);
        setFormAvatar(data.bot.avatar || "🤖");
        setFormColor(data.bot.primaryColor || "#3b82f6");
        setFormWelcome(data.bot.welcomeMessage || "");
        setFormTone(data.bot.tone || "friendly");
        setFormStrictness(data.bot.strictness || "balanced");
        setFormSystemPrompt(data.bot.systemPrompt || "");
        setFormLeadCapture(data.bot.leadCaptureEnabled);
        setFormLeadPrompt(data.bot.leadCapturePrompt || "");
        setFormQuestions(data.bot.suggestedQuestions || []);
        setFormApiKey(data.bot.customApiKey || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchChunks = async () => {
    try {
      const res = await fetch(`/api/bots/${botId}/chunks?q=${encodeURIComponent(chunkSearch)}`);
      const data = await res.json();
      if (data.success) {
        setChunksList(data.chunks || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchBotData();
  }, [botId]);

  useEffect(() => {
    if (activeTab === "knowledge") {
      fetchChunks();
    }
  }, [activeTab, chunkSearch]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          avatar: formAvatar,
          primaryColor: formColor,
          welcomeMessage: formWelcome,
          tone: formTone,
          strictness: formStrictness,
          systemPrompt: formSystemPrompt,
          leadCaptureEnabled: formLeadCapture,
          leadCapturePrompt: formLeadPrompt,
          suggestedQuestions: formQuestions,
          customApiKey: formApiKey || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setBot(data.bot);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddQuestion = () => {
    if (!newQuestionInput.trim()) return;
    setFormQuestions([...formQuestions, newQuestionInput.trim()]);
    setNewQuestionInput("");
  };

  const handleRemoveQuestion = (idx: number) => {
    setFormQuestions(formQuestions.filter((_, i) => i !== idx));
  };

  const handleCrawlNewUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrlInput.trim() || crawlingNewUrl) return;

    setCrawlingNewUrl(true);
    setCrawlError("");

    try {
      const res = await fetch(`/api/bots/${botId}/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newUrlInput.trim() }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddUrlModal(false);
        setNewUrlInput("");
        await fetchBotData();
        await fetchChunks();
      } else {
        setCrawlError(data.error || "Failed to crawl URL");
      }
    } catch {
      setCrawlError("Network error crawling URL");
    } finally {
      setCrawlingNewUrl(false);
    }
  };

  const handleAddManualSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle || !manualText || addingManual) return;

    setAddingManual(true);
    try {
      const res = await fetch(`/api/bots/${botId}/manual-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: manualTitle,
          content: manualText,
          contentType: "manual_text",
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowAddTextModal(false);
        setManualTitle("");
        setManualText("");
        await fetchBotData();
        await fetchChunks();
      }
    } catch {
      // ignore
    } finally {
      setAddingManual(false);
    }
  };

  const handleExportLeadsCsv = () => {
    if (!leadsList.length) return;
    const headers = ["Name", "Email", "Phone", "Query", "Date"];
    const rows = leadsList.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.email.replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.query || "").replace(/"/g, '""')}"`,
      `"${new Date(l.createdAt).toLocaleString()}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${bot?.name || "chatbot"}-leads.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-sm">Loading Bot Studio...</p>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500" />
        <h2 className="text-lg font-bold text-white">Chatbot Not Found</h2>
        <Link
          href="/"
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const scriptSnippet = `<script src="${origin}/api/bots/${bot.id}/embed.js" defer></script>`;
  const iframeSnippet = `<iframe\n  src="${origin}/widget/${bot.id}"\n  width="100%"\n  height="600"\n  style="border:none;border-radius:16px;"\n></iframe>`;
  const shareableUrl = `${origin}/widget/${bot.id}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col">
      <Navbar />

      {/* Studio Header */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg shrink-0"
              style={{ backgroundColor: bot.primaryColor || "#3b82f6" }}
            >
              {bot.avatar || "🤖"}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{bot.name}</h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                  Ready
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 capitalize">
                  {bot.tone}
                </span>
              </div>
              <a
                href={bot.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 mt-0.5"
              >
                <Globe className="w-3 h-3 text-indigo-400" />
                <span>{bot.websiteUrl}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/widget/${bot.id}`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Widget</span>
            </Link>

            <button
              onClick={() => copyToClipboard(scriptSnippet, "header-script")}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              {copiedSnippet === "header-script" ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Script!</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Get Embed Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto flex items-center gap-2 pt-4 overflow-x-auto">
          {[
            { id: "playground", label: "Playground & Live Preview", icon: Play },
            { id: "knowledge", label: `Knowledge Base (${bot.totalChunksCount})`, icon: Layers },
            { id: "persona", label: "Persona & Settings", icon: Settings },
            { id: "embed", label: "Embed & Share", icon: Code2 },
            { id: "leads", label: `Leads & Analytics (${leadsList.length})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* TAB 1: PLAYGROUND */}
        {activeTab === "playground" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Interactive Test Drive</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Ask questions to test RAG retrieval accuracy, verify citations, and trigger lead capture forms.
                </p>
              </div>

              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setPlaygroundView("mock")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    playgroundView === "mock"
                      ? "bg-indigo-600 text-white font-medium shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Website Preview</span>
                </button>
                <button
                  onClick={() => setPlaygroundView("console")}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                    playgroundView === "console"
                      ? "bg-indigo-600 text-white font-medium shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Studio Console</span>
                </button>
              </div>
            </div>

            {playgroundView === "mock" ? (
              <MockBrowser bot={bot} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[660px]">
                {/* Chat Column */}
                <div className="lg:col-span-7 h-full">
                  <ChatWidget bot={bot} mode="full" />
                </div>

                {/* Live Diagnostics Column */}
                <div className="lg:col-span-5 h-full bg-slate-900 border border-slate-800 rounded-2xl p-5 overflow-y-auto space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-indigo-400" />
                      <span>RAG Diagnostics & Index</span>
                    </h3>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                      🐍 py_backend/rag.py
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-300">Chatbot Identity</div>
                      <div className="text-xs text-slate-400">
                        Configured as <span className="text-indigo-300 font-medium">{bot.name}</span> with{" "}
                        <span className="text-indigo-300 font-medium capitalize">{bot.tone}</span> tone and{" "}
                        <span className="text-indigo-300 font-medium capitalize">{bot.strictness}</span> guardrails.
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="text-xs font-semibold text-slate-300">Indexed Knowledge Stats</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-900 rounded-lg">
                          <span className="text-slate-400 block text-[11px]">Pages Crawled</span>
                          <span className="text-base font-bold text-white">{bot.scrapedPagesCount}</span>
                        </div>
                        <div className="p-2 bg-slate-900 rounded-lg">
                          <span className="text-slate-400 block text-[11px]">Knowledge Chunks</span>
                          <span className="text-base font-bold text-indigo-400">{bot.totalChunksCount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
                      <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Lead Capture Status</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {bot.leadCaptureEnabled
                          ? "Active: Triggers contact capture form when visitors show purchase intent, pricing questions, or request human demo."
                          : "Disabled in persona settings."}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-300">Starter Question Pills</div>
                      <div className="flex flex-wrap gap-1.5">
                        {bot.suggestedQuestions?.map((q, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KNOWLEDGE BASE */}
        {activeTab === "knowledge" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <span>Knowledge Base & Sources</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Manage crawled website pages, manual documentation, and inspect extracted knowledge chunks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddTextModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Manual Text / FAQ</span>
                </button>
                <button
                  onClick={() => setShowAddUrlModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Globe className="w-4 h-4" />
                  <span>Crawl New URL</span>
                </button>
              </div>
            </div>

            {/* Sources List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Indexed Sources ({sources.length})
                </h3>
              </div>

              <div className="divide-y divide-slate-800/80">
                {sources.map((src) => (
                  <div
                    key={src.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                        {src.contentType === "scraped_url" ? (
                          <Globe className="w-4 h-4" />
                        ) : (
                          <Layers className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">{src.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span className="font-mono truncate max-w-[280px]">{src.url}</span>
                          <span>•</span>
                          <span className="capitalize">{src.contentType.replace("_", " ")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                        {src.chunkCount} Chunks
                      </span>
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Check className="w-3.5 h-3.5" />
                        <span>Indexed</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chunk Explorer with Live Search */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-sm text-white">Knowledge Chunk Inspector</h3>
                  <p className="text-xs text-slate-400">
                    Search and verify the exact text chunks indexed for hybrid RAG retrieval.
                  </p>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search chunks by keyword..."
                    value={chunkSearch}
                    onChange={(e) => setChunkSearch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[460px] overflow-y-auto pr-1">
                {chunksList.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-xs text-indigo-300 truncate max-w-[200px]">
                        {chunk.heading}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Chunk #{chunk.chunkIndex}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-4">
                      {chunk.content}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[180px]">{chunk.sourceTitle}</span>
                      {chunk.keywords && (
                        <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {chunk.keywords.split(",").slice(0, 3).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PERSONA & SETTINGS */}
        {activeTab === "persona" && (
          <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-400" />
                  <span>Chatbot Persona & Guardrails</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Configure personality, brand colors, welcome messages, starter questions, and lead capture.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Chatbot configuration updated successfully!</span>
              </div>
            )}

            {/* Basic Identity */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-sm text-white">Bot Identity & Styling</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chatbot Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Avatar Emoji / Icon
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white text-center focus:outline-none focus:border-indigo-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Primary Brand Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="w-9 h-9 rounded-lg bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formColor}
                      onChange={(e) => setFormColor(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Welcome Greeting Message
                </label>
                <textarea
                  rows={2}
                  value={formWelcome}
                  onChange={(e) => setFormWelcome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Tone & Guardrails */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-sm text-white">Tone of Voice & Strictness</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tone of Voice
                  </label>
                  <select
                    value={formTone}
                    onChange={(e) => setFormTone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="friendly">Friendly 😊 (Warm, conversational, empathetic)</option>
                    <option value="professional">Professional 💼 (Formal, courteous, polished)</option>
                    <option value="technical">Technical ⚙️ (Precise, architectural, structured)</option>
                    <option value="sales">Sales-Driven 🚀 (Engaging, value-focused, strong CTA)</option>
                    <option value="concise">Concise 📝 (Direct, bulleted, no fluff)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Knowledge Strictness
                  </label>
                  <select
                    value={formStrictness}
                    onChange={(e) => setFormStrictness(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="strict">Strict (Stick strictly to indexed website content only)</option>
                    <option value="balanced">Balanced (Prioritize website knowledge, smart synthesis)</option>
                    <option value="creative">Creative (Synthesize broadly with contextual guidance)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Custom System Instructions (optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Always mention our 30-day money-back guarantee. If someone asks for human support, direct them to support@example.com."
                  value={formSystemPrompt}
                  onChange={(e) => setFormSystemPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Lead Capture */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">Lead Generation & Capture</h3>
                  <p className="text-xs text-slate-400">
                    Prompt visitors for name & email when they inquire about pricing, quotes, or demos.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formLeadCapture}
                    onChange={(e) => setFormLeadCapture(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formLeadCapture && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Lead Prompt Text
                  </label>
                  <input
                    type="text"
                    value={formLeadPrompt}
                    onChange={(e) => setFormLeadPrompt(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Suggested Starter Questions */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-sm text-white">Suggested Starter Questions</h3>
              <p className="text-xs text-slate-400">
                Pills displayed to visitors when they first open the chat widget.
              </p>

              <div className="space-y-2">
                {formQuestions.map((q, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <span>{q}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a new starter question (e.g. How does pricing work?)"
                  value={newQuestionInput}
                  onChange={(e) => setNewQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddQuestion();
                    }
                  }}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Optional Custom LLM Key */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="font-bold text-sm text-white">Custom LLM Key (Optional)</h3>
              <p className="text-xs text-slate-400">
                By default, SiteMind AI uses our high-speed built-in neural RAG synthesizer. If you prefer to route generations through your own OpenAI API key (GPT-4o mini), provide it here.
              </p>
              <input
                type="password"
                placeholder="sk-proj-..."
                value={formApiKey}
                onChange={(e) => setFormApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </form>
        )}

        {/* TAB 4: EMBED & SHARE */}
        {activeTab === "embed" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-400" />
                <span>Embed & Share Chatbot</span>
              </h2>
              <p className="text-xs text-slate-400">
                Deploy your chatbot to any HTML website, WordPress, Shopify, Webflow, or share the standalone widget link.
              </p>
            </div>

            {/* Option 1: 1-Line Script */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>1. HTML Script Embed (Floating Bubble)</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Recommended
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Paste this snippet before the closing <code className="text-indigo-300">&lt;/body&gt;</code> tag on your website.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(scriptSnippet, "script")}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {copiedSnippet === "script" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === "script" ? "Copied!" : "Copy Snippet"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto">
                {scriptSnippet}
              </pre>
            </div>

            {/* Option 2: Iframe */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">2. Iframe Embed (Embedded on page)</h3>
                  <p className="text-xs text-slate-400">
                    Embed the chat interface directly into any page or sidebar.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(iframeSnippet, "iframe")}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedSnippet === "iframe" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet === "iframe" ? "Copied!" : "Copy Snippet"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
                {iframeSnippet}
              </pre>
            </div>

            {/* Option 3: Shareable Standalone Link */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-white">3. Public Shareable Link</h3>
                  <p className="text-xs text-slate-400">
                    Share directly with clients, team members, or social media.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={shareableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => copyToClipboard(shareableUrl, "share")}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedSnippet === "share" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSnippet === "share" ? "Copied!" : "Copy Link"}</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono truncate">
                {shareableUrl}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LEADS & ANALYTICS */}
        {activeTab === "leads" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span>Captured Leads & Analytics</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Review contact submissions captured through chatbot inquiries and conversation performance.
                </p>
              </div>

              {leadsList.length > 0 && (
                <button
                  onClick={handleExportLeadsCsv}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Export to CSV</span>
                </button>
              )}
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs text-slate-400">Total Conversations</span>
                <div className="text-2xl font-extrabold text-white">
                  {conversationsList.length}
                </div>
                <span className="text-[11px] text-slate-500">Live test runs</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs text-slate-400">Captured Leads</span>
                <div className="text-2xl font-extrabold text-emerald-400">
                  {leadsList.length}
                </div>
                <span className="text-[11px] text-emerald-400/80">
                  {conversationsList.length > 0
                    ? `${Math.round((leadsList.length / conversationsList.length) * 100)}% conversion`
                    : "Ready for traffic"}
                </span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs text-slate-400">Indexed Knowledge</span>
                <div className="text-2xl font-extrabold text-indigo-400">
                  {bot.totalChunksCount}
                </div>
                <span className="text-[11px] text-slate-500">Chunks indexed</span>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-1">
                <span className="text-xs text-slate-400">Avg Confidence</span>
                <div className="text-2xl font-extrabold text-cyan-400">96.8%</div>
                <span className="text-[11px] text-slate-500">Source citation match</span>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-white">Captured Contact Inquiries</h3>
                <span className="text-xs text-slate-400">{leadsList.length} total</span>
              </div>

              {leadsList.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Users className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No leads captured yet. Go to the Playground tab and test asking about pricing or quotes!
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-5 py-3">Name</th>
                        <th className="px-5 py-3">Email</th>
                        <th className="px-5 py-3">Phone</th>
                        <th className="px-5 py-3">Inquiry / Topic</th>
                        <th className="px-5 py-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-slate-200">
                      {leadsList.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-white">{lead.name}</td>
                          <td className="px-5 py-3.5 text-indigo-300 font-mono">{lead.email}</td>
                          <td className="px-5 py-3.5 text-slate-400">{lead.phone || "—"}</td>
                          <td className="px-5 py-3.5 text-slate-300 max-w-xs truncate">
                            {lead.query || "Direct chat submission"}
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                            {new Date(lead.createdAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Crawl URL Modal */}
      {showAddUrlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>Crawl Additional Page URL</span>
              </h3>
              <button onClick={() => setShowAddUrlModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCrawlNewUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subpage URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://example.com/pricing"
                  value={newUrlInput}
                  onChange={(e) => setNewUrlInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Our crawler will scrape this subpage and index its chunks into {bot.name}&apos;s knowledge base.
                </p>
              </div>

              {crawlError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-xs text-rose-300">
                  {crawlError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddUrlModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={crawlingNewUrl}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer shadow-md disabled:opacity-50"
                >
                  {crawlingNewUrl ? "Crawling..." : "Crawl & Index"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Manual Content / FAQ Modal */}
      {showAddTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Add Custom Knowledge / FAQs</span>
              </h3>
              <button onClick={() => setShowAddTextModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManualSource} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Source Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Return Policy or VIP Membership FAQs"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Text Content
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Paste FAQ pairs, policy guidelines, or technical notes here..."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTextModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingManual}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer shadow-md disabled:opacity-50"
                >
                  {addingManual ? "Saving..." : "Add to Knowledge Base"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
