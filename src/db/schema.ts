import { pgTable, text, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const chatbots = pgTable("chatbots", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  websiteUrl: text("website_url").notNull(),
  avatar: text("avatar").default("🤖").notNull(),
  primaryColor: text("primary_color").default("#3b82f6").notNull(),
  welcomeMessage: text("welcome_message").default("Hello! 👋 How can I help you today?").notNull(),
  tone: text("tone").default("friendly").notNull(), // 'friendly' | 'professional' | 'technical' | 'sales' | 'concise'
  systemPrompt: text("system_prompt"),
  strictness: text("strictness").default("balanced").notNull(), // 'strict' | 'balanced' | 'creative'
  leadCaptureEnabled: boolean("lead_capture_enabled").default(true).notNull(),
  leadCapturePrompt: text("lead_capture_prompt").default("Interested in learning more or getting a personalized quote? Leave your contact details below!").notNull(),
  suggestedQuestions: jsonb("suggested_questions").$type<string[]>().default([]).notNull(),
  status: text("status").default("ready").notNull(), // 'ready' | 'crawling' | 'error'
  scrapedPagesCount: integer("scraped_pages_count").default(0).notNull(),
  totalChunksCount: integer("total_chunks_count").default(0).notNull(),
  customApiKey: text("custom_api_key"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const knowledgeSources = pgTable("knowledge_sources", {
  id: text("id").primaryKey(),
  chatbotId: text("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  contentType: text("content_type").default("scraped_url").notNull(), // 'scraped_url' | 'manual_text' | 'faq'
  content: text("content").notNull(),
  chunkCount: integer("chunk_count").default(0).notNull(),
  status: text("status").default("indexed").notNull(), // 'indexed' | 'pending' | 'failed'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: text("id").primaryKey(),
  chatbotId: text("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  sourceId: text("source_id").references(() => knowledgeSources.id, { onDelete: "cascade" }).notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  heading: text("heading").notNull(),
  content: text("content").notNull(),
  keywords: text("keywords").default("").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceTitle: text("source_title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  chatbotId: text("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  visitorId: text("visitor_id").notNull(),
  messagesCount: integer("messages_count").default(0).notNull(),
  leadCaptured: boolean("lead_captured").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  chatbotId: text("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  sender: text("sender").notNull(), // 'user' | 'assistant' | 'system'
  text: text("text").notNull(),
  citations: jsonb("citations").$type<{ chunkId: string; title: string; url: string; snippet: string }[]>().default([]).notNull(),
  confidence: integer("confidence").default(95).notNull(),
  rating: text("rating"), // 'up' | 'down' | null
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leads = pgTable("leads", {
  id: text("id").primaryKey(),
  chatbotId: text("chatbot_id").references(() => chatbots.id, { onDelete: "cascade" }).notNull(),
  conversationId: text("conversation_id"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  query: text("query"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
