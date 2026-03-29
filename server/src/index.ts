import { execSync } from "child_process";
import app from "./app";
import { logger } from "./lib/logger";

// Startup validation
if (!process.env.AGENT_API_KEY) logger.error("AGENT_API_KEY is not set — all protected routes will return 503");
if (!process.env.GROQ_API_KEY) logger.error("GROQ_API_KEY is not set — agent will fail on every request");
if (!process.env.DATABASE_URL) logger.error("DATABASE_URL is not set — DB will fail");
if (!process.env.BRAVE_SEARCH_API_KEY) logger.warn("BRAVE_SEARCH_API_KEY not set — web search disabled");

try { execSync("ffmpeg -version", { stdio: "ignore" }); } catch {
  logger.warn("ffmpeg not found — audio features will fail");
}

const port = parseInt(process.env.PORT ?? "3000", 10);
app.listen(port, "0.0.0.0", () => {
  logger.info({ port }, "TweakBot server started");
});
