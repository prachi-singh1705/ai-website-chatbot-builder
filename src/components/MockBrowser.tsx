"use client";

import React, { useState } from "react";
import {
  Lock,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  ExternalLink,
  MessageSquare,
  X,
} from "lucide-react";
import ChatWidget from "./ChatWidget";

interface MockBrowserProps {
  bot: {
    id: string;
    name: string;
    avatar: string;
    primaryColor: string;
    welcomeMessage: string;
    websiteUrl: string;
    description?: string | null;
    suggestedQuestions?: string[];
    leadCaptureEnabled?: boolean;
    leadCapturePrompt?: string;
  };
}

export default function MockBrowser({ bot }: MockBrowserProps) {
  const [isWidgetOpen, setIsWidgetOpen] = useState(true);

  const primaryColor = bot.primaryColor || "#3b82f6";
  const displayHost = bot.websiteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return (
    <div className="flex flex-col h-[700px] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
      {/* Browser Chrome Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5 mr-3">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>

          <div className="flex items-center gap-1 text-slate-500">
            <button className="p-1 rounded hover:bg-slate-800 text-slate-400">
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded hover:bg-slate-800 text-slate-400">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 rounded hover:bg-slate-800 text-slate-400">
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Address bar */}
        <div className="flex-1 max-w-md mx-4">
          <div className="bg-slate-950 border border-slate-700/60 rounded-lg px-3 py-1 flex items-center gap-2 text-xs text-slate-300">
            <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-slate-400">https://</span>
            <span className="text-slate-100 font-medium truncate">{displayHost}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={bot.websiteUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1 text-xs"
            title="Open external link"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Mock Website Canvas */}
      <div className="flex-1 overflow-y-auto bg-slate-900 relative">
        {/* Mock site navigation */}
        <div className="border-b border-slate-800 bg-slate-900/90 px-6 py-3.5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {bot.avatar || "🌐"}
            </span>
            <span>{bot.name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="hover:text-slate-200 cursor-pointer">Products</span>
            <span className="hover:text-slate-200 cursor-pointer">Solutions</span>
            <span className="hover:text-slate-200 cursor-pointer">Pricing</span>
            <span className="hover:text-slate-200 cursor-pointer">Docs</span>
            <span
              className="px-3 py-1 rounded-full text-white text-xs font-medium cursor-pointer shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              Get Started
            </span>
          </div>
        </div>

        {/* Mock Hero Section */}
        <div className="p-8 max-w-2xl mx-auto text-center space-y-4 pt-12">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white/90 border border-white/10"
            style={{ backgroundColor: `${primaryColor}33` }}
          >
            <span>Live Crawled Reference</span>
            <span>•</span>
            <span className="text-white font-mono">{bot.websiteUrl}</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
            Welcome to {bot.name}
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            {bot.description ||
              "Explore our product catalog, comprehensive documentation, transparent pricing, and 24/7 AI-guided support right here."}
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              className="px-5 py-2.5 rounded-xl text-white font-medium text-xs shadow-lg cursor-pointer"
              style={{ backgroundColor: primaryColor }}
            >
              Explore Offerings
            </button>
            <button className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer">
              View Documentation
            </button>
          </div>
        </div>

        {/* Mock Content Cards */}
        <div className="max-w-3xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-indigo-400 font-semibold text-xs">Knowledge Base</div>
            <p className="text-xs text-slate-400">
              Scraped directly from your sitemap and web pages with hybrid keyword & semantic RAG retrieval.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-emerald-400 font-semibold text-xs">Instant Resolution</div>
            <p className="text-xs text-slate-400">
              Visitors receive real-time answers with verified citation links back to your official site.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="text-amber-400 font-semibold text-xs">Lead Capture</div>
            <p className="text-xs text-slate-400">
              Collect names, emails, and purchase intents automatically whenever high interest is shown.
            </p>
          </div>
        </div>

        {/* Floating Chatbot Bubble & Widget inside Mock Website */}
        <div className="absolute bottom-5 right-5 z-20 flex flex-col items-end">
          {isWidgetOpen && (
            <div className="w-[360px] sm:w-[380px] h-[520px] mb-3 shadow-2xl rounded-2xl overflow-hidden border border-slate-700 animate-in fade-in zoom-in duration-200">
              <ChatWidget bot={bot} mode="popup" />
            </div>
          )}

          {/* Trigger Floating Action Button */}
          <button
            onClick={() => setIsWidgetOpen(!isWidgetOpen)}
            className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white text-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer relative"
            style={{ backgroundColor: primaryColor }}
            title={isWidgetOpen ? "Close Chat" : `Chat with ${bot.name}`}
          >
            {isWidgetOpen ? <X className="w-6 h-6" /> : bot.avatar || "🤖"}
            {!isWidgetOpen && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
