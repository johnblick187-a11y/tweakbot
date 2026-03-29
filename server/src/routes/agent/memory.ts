import { db, memories } from "../../db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../../lib/logger";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function getMemoriesForUser(userId: string): Promise<string | null> {
  const rows = await db.select().from(memories).where(eq(memories.userId, userId)).orderBy(desc(memories.createdAt)).limit(20);
  if (rows.length === 0) return null;
  return rows.reverse().map((m) => `- ${m.content}`).join("\n");
}

export function extractAndSaveMemories(userId: string, conversationId: number, history: { role: string; content: string }[]): void {
  _doExtract(userId, conversationId, history).catch((err) => {
    logger.warn({ err, userId }, "Memory extraction failed");
  });
}

async function _doExtract(userId: string, conversationId: number, history: { role: string; content: string }[]): Promise<void> {
  if (!process.env.GROQ_API_KEY) return;

  const turns = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "User" : "TweakBot"}: ${m.content}`)
    .join("\n");

  if (!turns.trim()) return;

  const resp = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3-groq-70b-8192-tool-use-preview",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: "Extract memorable facts about the user from this conversation. Output ONLY a JSON array of short strings (max 15 words each). Focus on preferences, goals, tech stack, project names. If nothing worth remembering, output [].",
        },
        { role: "user", content: `Extract facts:\n\n${turns}` },
      ],
    }),
  });

  if (!resp.ok) return;

  const data = await resp.json() as any;
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "[]";

  let facts: string[];
  try {
    facts = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim());
    if (!Array.isArray(facts)) facts = [];
  } catch { return; }

  const valid = facts.filter((f): f is string => typeof f === "string" && f.trim().length > 0).slice(0, 10);
  if (valid.length === 0) return;

  await db.insert(memories).values(valid.map((content) => ({ userId, conversationId, content })));
  logger.info({ userId, count: valid.length }, "Memories saved");
}
