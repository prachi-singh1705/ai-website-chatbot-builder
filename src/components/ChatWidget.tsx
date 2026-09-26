"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  CheckCircle2,
  Mail,
  User,
  Phone,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  text: string;
  citations?: {
    chunkId: string;
    title: string;
    url: string;
    snippet: string;
  }[];
  confidence?: number;
  rating?: "up" | "down" | null;
  timestamp: string;
}

interface ChatWidgetProps {
  bot: {
    id: string;
    name: string;
    avatar: string;
    primaryColor: string;
    welcomeMessage: string;
    websiteUrl: string;
    leadCaptureEnabled?: boolean;
    leadCapturePrompt?: string;
    suggestedQuestions?: string[];
  };
  mode?: "embedded" | "full" | "popup";
  initialConversationId?: string;
}

export default function ChatWidget({
  bot,
  mode = "full",
  initialConversationId,
}: ChatWidgetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome",
      sender: "assistant",
      text: bot.welcomeMessage || "Hello! 👋 How can I help you today?",
      citations: [],
      confidence: 100,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [expandedCitationId, setExpandedCitationId] = useState<string | null>(null);

  // Lead capture state
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, showLeadForm]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isLoading) return;

    setInputText("");
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/bots/${bot.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          conversationId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (!conversationId && data.conversationId) {
          setConversationId(data.conversationId);
        }

        const botReply: ChatMessage = {
          id: data.messageId || `asst-${Date.now()}`,
          sender: "assistant",
          text: data.answer,
          citations: data.citations || [],
          confidence: data.confidence || 95,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => [...prev, botReply]);

        if (data.shouldTriggerLeadCapture && bot.leadCaptureEnabled && !leadSubmitted) {
          setShowLeadForm(true);
        }
      } else {
        const errorReply: ChatMessage = {
          id: `err-${Date.now()}`,
          sender: "assistant",
          text: `⚠️ ${data.error || "Sorry, I had trouble retrieving information for that request. Please try again."}`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, errorReply]);
      }
    } catch {
      const errorReply: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: "Sorry, I encountered a network error while answering. Please try again in a moment.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorReply]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleRate = async (messageId: string, rating: "up" | "down") => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, rating } : m))
    );

    try {
      await fetch(`/api/messages/${messageId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });
    } catch {
      // ignore
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadEmail || leadSubmitting) return;

    setLeadSubmitting(true);
    try {
      const res = await fetch(`/api/bots/${bot.id}/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: leadName,
          email: leadEmail,
          phone: leadPhone,
          conversationId,
          query: messages[messages.length - 2]?.text || "Chat inquiry",
        }),
      });

      if (res.ok) {
        setLeadSubmitted(true);
        setShowLeadForm(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            sender: "system",
            text: `Thank you, ${leadName}! Your inquiry has been sent to our team. We'll be in touch at ${leadEmail} shortly.`,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setLeadSubmitting(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: bot.welcomeMessage || "Hello! 👋 How can I help you today?",
        citations: [],
        confidence: 100,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setConversationId(undefined);
    setShowLeadForm(false);
  };

  const primaryColor = bot.primaryColor || "#3b82f6";

  // Simple formatting of markdown elements (bold, lists, headings)
  const renderFormattedText = (raw: string) => {
    const lines = raw.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-bold text-sm text-slate-100 mt-2 mb-1">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("## ") || line.startsWith("# ")) {
        return (
          <h3 key={idx} className="font-bold text-sm text-indigo-300 mt-2 mb-1">
            {line.replace(/^#+ /, "")}
          </h3>
        );
      }
      if (line.startsWith("1. ") || line.startsWith("2. ") || line.startsWith("3. ") || line.startsWith("4. ")) {
        return (
          <div key={idx} className="flex gap-1.5 my-0.5 text-xs sm:text-sm pl-1">
            <span className="font-semibold text-indigo-400">{line.slice(0, 3)}</span>
            <span>{line.slice(3)}</span>
          </div>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <div key={idx} className="flex gap-2 my-0.5 text-xs sm:text-sm pl-2">
            <span className="text-indigo-400">•</span>
            <span>{line.slice(2)}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Bold text handling
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="my-0.5 leading-relaxed text-xs sm:text-sm">
          {parts.map((part, pIdx) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              return (
                <strong key={pIdx} className="font-semibold text-slate-100">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Chat Header */}
      <div
        className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between text-white"
        style={{
          background: `linear-gradient(to right, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95))`,
          borderTop: `3px solid ${primaryColor}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md"
            style={{ backgroundColor: primaryColor }}
          >
            {bot.avatar || "🤖"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-slate-100">{bot.name}</h3>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Active
              </span>
            </div>
            <a
              href={bot.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 truncate max-w-[200px]"
            >
              <span>{bot.websiteUrl.replace(/^https?:\/\//, "")}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleResetChat}
            title="Reset Chat"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200 bg-gradient-to-b from-slate-950/70 to-slate-900/90">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";
          const isSystem = msg.sender === "system";

          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="mx-auto max-w-sm bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-center text-xs text-emerald-300 flex items-center gap-2 justify-center"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{msg.text}</span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5 group`}
            >
              <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[80%]">
                {!isUser && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 text-white shadow-sm mb-1"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {bot.avatar || "🤖"}
                  </div>
                )}

                <div
                  className={`rounded-2xl px-4 py-3 text-xs sm:text-sm ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-br-xs shadow-md"
                      : "bg-slate-800/90 text-slate-200 rounded-bl-xs border border-slate-700/60 shadow-md backdrop-blur-sm"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div>{renderFormattedText(msg.text)}</div>
                  )}
                </div>
              </div>

              {/* Bot Meta Info: Confidence, Sources, Ratings */}
              {!isUser && msg.id !== "welcome" && (
                <div className="flex flex-wrap items-center gap-2 pl-9 text-[11px] text-slate-400">
                  {msg.confidence !== undefined && (
                    <span className="flex items-center gap-1 text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-indigo-400" />
                      <span>{msg.confidence}% confidence</span>
                    </span>
                  )}

                  {msg.citations && msg.citations.length > 0 && (
                    <button
                      onClick={() =>
                        setExpandedCitationId(
                          expandedCitationId === msg.id ? null : msg.id
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700/50 cursor-pointer transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Sources ({msg.citations.length})</span>
                      {expandedCitationId === msg.id ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    <button
                      onClick={() => handleRate(msg.id, "up")}
                      className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                        msg.rating === "up" ? "text-emerald-400 font-bold" : "text-slate-500"
                      }`}
                      title="Helpful"
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleRate(msg.id, "down")}
                      className={`p-1 rounded hover:bg-slate-800 transition-colors ${
                        msg.rating === "down" ? "text-rose-400 font-bold" : "text-slate-500"
                      }`}
                      title="Not helpful"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Citations Drawer */}
              {!isUser &&
                expandedCitationId === msg.id &&
                msg.citations &&
                msg.citations.length > 0 && (
                  <div className="ml-9 mt-1 w-full max-w-[85%] bg-slate-950/90 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <span>Referenced Website Sections</span>
                    </div>
                    {msg.citations.map((c, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1"
                      >
                        <div className="flex items-center justify-between text-indigo-300 font-medium text-xs">
                          <span>{c.title}</span>
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-200"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 italic">
                          &quot;{c.snippet}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 pl-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {bot.avatar || "🤖"}
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl rounded-bl-xs px-4 py-3 flex items-center gap-1.5 shadow-md">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
              <div
                className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
              <span className="text-xs text-slate-400 ml-1.5">Analyzing website knowledge...</span>
            </div>
          </div>
        )}

        {/* Lead Capture Banner / Inline Form */}
        {showLeadForm && !leadSubmitted && (
          <div className="my-3 p-4 bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-blue-950/70 border border-indigo-500/30 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">
                {bot.leadCapturePrompt || "Connect with our team"}
              </h4>
            </div>
            <p className="text-xs text-slate-300 mb-3">
              Leave your details and an expert will reply with full pricing or demo access.
            </p>
            <form onSubmit={handleLeadSubmit} className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Your name"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/70 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={leadSubmitting}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-colors"
                >
                  {leadSubmitting ? "Sending..." : "Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeadForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
                >
                  Skip
                </button>
              </div>
            </form>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Starter Questions Chips */}
      {messages.length <= 2 &&
        bot.suggestedQuestions &&
        bot.suggestedQuestions.length > 0 && (
          <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800/80">
            <p className="text-[11px] font-medium text-slate-400 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>Suggested questions:</span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {bot.suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="text-left text-xs bg-slate-800/70 hover:bg-indigo-950/60 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-200 border border-slate-700/60 rounded-lg px-2.5 py-1 transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Input Area */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask anything about ${bot.name}...`}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
            style={{ backgroundColor: primaryColor }}
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>Powered by SiteMind AI RAG Engine</span>
          {bot.leadCaptureEnabled && !leadSubmitted && (
            <button
              onClick={() => setShowLeadForm(!showLeadForm)}
              className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              Contact Team
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
