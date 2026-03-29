import { Response } from "express";
import { listFiles, readFileSafe, writeFileSafe, deleteFile } from "./workspace/fileTools";
import { runCommand } from "./workspace/commandRunner";
import { webSearch } from "./webSearch";
import { logger } from "../../lib/logger";

async function callExternalApi(prompt: string, keyEnv: string, urlEnv: string, extraBody: Record<string, unknown> = {}): Promise<any> {
  const apiKey = process.env[keyEnv];
  const apiUrl = process.env[urlEnv];
  if (!apiKey || !apiUrl) return { error: `${keyEnv} or ${urlEnv} not configured` };
  try {
    const resp = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, ...extraBody }),
    });
    if (!resp.ok) return { error: `Service request failed: ${resp.status}` };
    return await resp.json();
  } catch (err: any) {
    return { error: err.message };
  }
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const TOOLS = [
  { type: "function", function: { name: "list_files", description: "List files and directories in the workspace", parameters: { type: "object", properties: { dir: { type: "string", description: "Relative directory path (empty for root)" } }, required: [] } } },
  { type: "function", function: { name: "read_file", description: "Read the contents of a file", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "write_file", description: "Write content to a file, creating it if needed", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] } } },
  { type: "function", function: { name: "delete_file", description: "Delete a file or directory", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } } },
  { type: "function", function: { name: "run_command", description: "Run a shell command in the workspace", parameters: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string", description: "Working directory (optional)" } }, required: ["command"] } } },
  { type: "function", function: { name: "web_search", description: "Search the web. Returns an error if BRAVE_SEARCH_API_KEY is not set — do not retry in a loop.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "generate_image", description: "Generate an image from a text prompt", parameters: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"] } } },
  { type: "function", function: { name: "generate_video", description: "Generate a video from a text prompt", parameters: { type: "object", properties: { prompt: { type: "string" }, length: { type: "integer" } }, required: ["prompt"] } } },
  { type: "function", function: { name: "generate_music", description: "Generate music from a text prompt", parameters: { type: "object", properties: { prompt: { type: "string" }, length: { type: "integer" } }, required: ["prompt"] } } },
  { type: "function", function: { name: "edit_music", description: "Edit an existing music file", parameters: { type: "object", properties: { path: { type: "string" }, instructions: { type: "string" } }, required: ["path", "instructions"] } } },
];

function buildSystemPrompt(projectId: string, memories: string | null): string {
  const memoryBlock = memories ? `\n\nWhat you know about this user (from past conversations):\n${memories}` : "";
  return `You are TweakBot — an autonomous AI coding agent. Your workspace project ID is "${projectId}".

You have full access to the workspace filesystem and can run shell commands. When given a task:
1. Read existing files before modifying them
2. Write clean, working code
3. Run commands to install dependencies and verify your work
4. Summarize what you did when complete

Always use your tools to act — don't just describe what you would do.${memoryBlock}`;
}

type Role = "system" | "user" | "assistant" | "tool";
type ChatMessage = { role: Role; content: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string };

function sseWrite(res: Response, data: object) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function callGroq(messages: ChatMessage[]) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "llama3-groq-70b-8192-tool-use-preview", messages, tools: TOOLS, tool_choice: "auto", temperature: 0.3 }),
  });
  const data = await res.json() as any;
  if (!data?.choices?.length) throw new Error(`Groq API error: ${data?.error?.message ?? "Unknown error"}`);
  return data.choices[0];
}

async function runTool(name: string, args: Record<string, any>, projectId: string) {
  try {
    switch (name) {
      case "list_files": return await listFiles(projectId, args.dir ?? "");
      case "read_file": if (!args.path) return { error: "Missing: path" }; return { content: await readFileSafe(projectId, args.path) };
      case "write_file": if (!args.path) return { error: "Missing: path" }; return await writeFileSafe(projectId, args.path, args.content ?? "");
      case "delete_file": if (!args.path) return { error: "Missing: path" }; return await deleteFile(projectId, args.path);
      case "run_command": if (!args.command) return { error: "Missing: command" }; return runCommand(projectId, args.command, args.cwd ?? "");
      case "web_search": if (!args.query) return { error: "Missing: query" }; return await webSearch(args.query);
      case "generate_image": if (!args.prompt) return { error: "Missing: prompt" }; return await callExternalApi(args.prompt, "IMAGE_API_KEY", "IMAGE_API_URL");
      case "generate_video": if (!args.prompt) return { error: "Missing: prompt" }; return await callExternalApi(args.prompt, "VIDEO_API_KEY", "VIDEO_API_URL", args.length ? { length: Number(args.length) } : {});
      case "generate_music": if (!args.prompt) return { error: "Missing: prompt" }; return await callExternalApi(args.prompt, "MUSIC_API_KEY", "MUSIC_API_URL", args.length ? { length: Number(args.length) } : {});
      case "edit_music": if (!args.path || !args.instructions) return { error: "Missing: path and instructions" }; return await callExternalApi(args.instructions, "MUSIC_EDIT_API_KEY", "MUSIC_EDIT_API_URL", { path: args.path });
      default: return { error: `Unknown tool: ${name}` };
    }
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function runAgentLoop(
  res: Response,
  priorMessages: { role: string; content: string }[],
  userContent: string,
  projectId = "default",
  userId = "anonymous",
  userMemories: string | null = null
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt(projectId, userMemories) },
    ...priorMessages.map((m) => ({ role: m.role as Role, content: m.content })),
    { role: "user", content: userContent },
  ];

  let steps = 0;
  const MAX_STEPS = 12;
  let finalContent = "";

  while (steps < MAX_STEPS) {
    logger.debug({ step: steps, messageCount: messages.length }, "Calling Groq");
    const choice = await callGroq(messages);
    const { message, finish_reason } = choice;

    messages.push({ role: "assistant", content: message.content, tool_calls: message.tool_calls });

    if (finish_reason === "tool_calls" && message.tool_calls?.length) {
      const toolCalls = message.tool_calls.slice(0, 5);
      for (const toolCall of toolCalls) {
        const toolId = toolCall.id;
        const toolName = toolCall.function.name;
        let args: any = {};
        try { args = JSON.parse(toolCall.function.arguments ?? "{}"); } catch { args = {}; }
        sseWrite(res, { type: "tool_call", id: toolId, name: toolName, args });
        const result = await runTool(toolName, args, projectId);
        logger.info({ step: steps, tool: toolName }, "Tool invoked");
        sseWrite(res, { type: "tool_result", id: toolId, output: JSON.stringify(result) });
        messages.push({ role: "tool", content: JSON.stringify(result), tool_call_id: toolId, name: toolName });
      }
      steps++;
      continue;
    }

    finalContent = message.content?.trim() ?? "";
    sseWrite(res, { type: "content", content: finalContent });
    break;
  }

  if (!finalContent) {
    finalContent = "Agent stopped after reaching the maximum number of steps.";
    sseWrite(res, { type: "content", content: finalContent });
  }

  logger.info({ steps }, "Agent loop complete");
  return finalContent;
}
