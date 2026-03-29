import { Router } from "express";
import { db, conversations, messages } from "../../db";
import { eq, asc } from "drizzle-orm";
import { runAgentLoop } from "./agentLoop";
import { getMemoriesForUser, extractAndSaveMemories } from "./memory";
import { resolveUserId } from "../../middlewares/auth";
import { logger } from "../../lib/logger";

const router = Router();

router.get("/conversations", async (_req, res) => {
  const rows = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(rows);
});

router.post("/conversations", async (req, res) => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }
  const userId = resolveUserId(req);
  const [row] = await db.insert(conversations).values({ title, userId }).returning();
  res.status(201).json(row);
});

router.get("/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json({ ...conv, messages: msgs });
});

router.delete("/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await db.delete(messages).where(eq(messages.conversationId, id));
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).send();
});

router.get("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Not found" }); return; }

  const { content } = req.body;
  if (!content) { res.status(400).json({ error: "content is required" }); return; }

  const userId = resolveUserId(req);

  const priorMessages = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));

  let userMemories: string | null = null;
  try { userMemories = await getMemoriesForUser(userId); } catch (err) {
    logger.warn({ err }, "Failed to fetch memories");
  }

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const assistantContent = await runAgentLoop(
      res,
      priorMessages.map((m) => ({ role: m.role, content: m.content })),
      content,
      `conv-${id}`,
      userId,
      userMemories
    );

    if (assistantContent) {
      await db.insert(messages).values({ conversationId: id, role: "assistant", content: assistantContent });
      const fullHistory = [
        ...priorMessages.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content },
        { role: "assistant", content: assistantContent },
      ];
      extractAndSaveMemories(userId, id, fullHistory);
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
