import { execSync } from "child_process";
import { resolveProjectPath } from "./pathSafety";
import { MAX_COMMAND_TIMEOUT_MS, MAX_OUTPUT_BYTES } from "./constants";
import { logger } from "../../../lib/logger";

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut?: boolean;
};

export function runCommand(projectId: string, command: string, cwdRelative = ""): CommandResult {
  const cwd = resolveProjectPath(projectId, cwdRelative);

  try {
    const stdout = execSync(command, {
      cwd,
      encoding: "utf-8",
      timeout: MAX_COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout, stderr: "", exitCode: 0 };
  } catch (e: any) {
    const timedOut = e.signal === "SIGTERM" || e.killed === true;
    if (timedOut) {
      logger.warn({ projectId, command }, "Command timed out");
      return { stdout: "", stderr: `Command timed out after ${MAX_COMMAND_TIMEOUT_MS / 1000}s`, exitCode: 124, timedOut: true };
    }
    logger.warn({ projectId, command, exitCode: e.status ?? 1 }, "Command failed");
    return { stdout: e.stdout?.toString() || "", stderr: e.stderr?.toString() || "", exitCode: e.status ?? 1 };
  }
}
