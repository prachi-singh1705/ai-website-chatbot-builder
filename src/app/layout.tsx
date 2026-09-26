import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteMind AI — Turn Any Website into an Intelligent AI Chatbot",
  description:
    "Crawl any website, index knowledge chunks with hybrid semantic RAG, and generate an interactive embeddable AI chatbot with citations and lead capture.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
