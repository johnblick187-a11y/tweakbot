import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const AGENT_API_KEY = process.env.AGENT_API_KEY ?? "";

if (!AGENT_API_KEY) {
  logger.warn("AGENT_API_KEY is not set — all protected routes will return 503");
}

export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!AGENT_API_KEY) {
    res.status(503).json({ error: "Server authentication is not configured." });
    return;
  }

  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;

  if (!token || token !== AGENT_API_KEY) {
    logger.warn({ method: req.method, path: req.path }, "Auth rejected");
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  next();
}

export function resolveUserId(req: Request): string {
  const raw = req.headers["x-user-id"];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^[a-zA-Z0-9_-]{1,64}$/.test(value)) return "anonymous";
  return value;
}
