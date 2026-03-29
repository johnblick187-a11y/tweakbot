import express from "express";
import cors from "cors";
import path from "path";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { requireApiKey } from "./middlewares/auth";
import agentRouter from "./routes/agent/index";
import workspaceRouter from "./routes/workspace";

const app = express();

app.use(pinoHttp({ logger }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — no auth
app.get("/api/healthz", (_req, res) => res.json({ status: "ok" }));

// Protected routes
app.use("/api/agent", requireApiKey, agentRouter);
app.use("/api/workspace", requireApiKey, workspaceRouter);

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(staticDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

export default app;
