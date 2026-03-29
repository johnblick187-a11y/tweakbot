import { mkdirSync } from "fs";
import { resolve, relative, join } from "path";
import { APP_SUBDIR, WORKSPACE_ROOT } from "./constants";

export function ensureWorkspaceRoot(): void {
  mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

export function getProjectRoot(projectId: string): string {
  ensureWorkspaceRoot();
  return resolve(join(WORKSPACE_ROOT, projectId));
}

export function getProjectAppRoot(projectId: string): string {
  return resolve(join(getProjectRoot(projectId), APP_SUBDIR));
}

export function assertInsideProject(absPath: string, projectRoot: string): void {
  const root = resolve(projectRoot);
  const rel = relative(root, absPath);
  if (rel.startsWith("..") || rel.includes("..")) {
    throw new Error("Path escapes project sandbox.");
  }
}

export function resolveProjectPath(projectId: string, relativePath = ""): string {
  const base = getProjectAppRoot(projectId);
  const target = resolve(base, relativePath);
  assertInsideProject(target, base);
  return target;
}

export function slugifyName(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "project";
}
