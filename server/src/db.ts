import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Schema
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: text("user_id").notNull().default("anonymous"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const memories = pgTable("memories", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  content: text("content").notNull(),
  conversationId: integer("conversation_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const db = drizzle(pool, {
  schema: { conversations, messages, memories },
});

// Run this SQL once in Supabase to create the tables:
// CREATE TABLE IF NOT EXISTS conversations (id SERIAL PRIMARY KEY, title TEXT NOT NULL, user_id TEXT NOT NULL DEFAULT 'anonymous', created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
// CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, conversation_id INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
// CREATE TABLE IF NOT EXISTS memories (id SERIAL PRIMARY KEY, user_id TEXT NOT NULL, content TEXT, conversation_id INTEGER, created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL);
