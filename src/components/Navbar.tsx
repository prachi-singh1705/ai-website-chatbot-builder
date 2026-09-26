"use client";

import Link from "next/link";
import { Bot, Sparkles, Globe, Plus } from "lucide-react";

export default function Navbar({ onNewBotClick }: { onNewBotClick?: () => void }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                SiteMind AI
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/20">
                Python · RAG
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Website to AI Chatbot Generator
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-xs sm:text-sm text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            All Bots
          </Link>
          <a
            href="#templates"
            className="hidden sm:inline-flex text-xs sm:text-sm text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            Demo Templates
          </a>

          {onNewBotClick ? (
            <button
              onClick={onNewBotClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/25 transition-all hover:shadow-indigo-600/40 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Bot</span>
            </button>
          ) : (
            <Link
              href="/#create"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs sm:text-sm font-medium shadow-md shadow-indigo-600/25 transition-all hover:shadow-indigo-600/40"
            >
              <Sparkles className="w-4 h-4" />
              <span>New Chatbot</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
