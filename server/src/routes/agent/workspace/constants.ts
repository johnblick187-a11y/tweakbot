import { join } from "path";

export const WORKSPACE_ROOT = join(process.cwd(), "workspace", "projects");
export const APP_SUBDIR = "app";
export const MAX_FILE_BYTES = 512_000;
export const MAX_COMMAND_TIMEOUT_MS = 60_000;
export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
