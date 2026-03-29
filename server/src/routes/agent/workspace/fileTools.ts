import { mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
import { dirname, relative } from "path";
import { MAX_FILE_BYTES } from "./constants";
import { getProjectAppRoot, resolveProjectPath } from "./pathSafety";

export async function listFiles(projectId: string, dir = "") {
  const target = resolveProjectPath(projectId, dir);
  const base = getProjectAppRoot(projectId);
  const entries = await readdir(target, { withFileTypes: true });
  return Promise.all(
    entries.map(async (e) => {
      const abs = resolveProjectPath(projectId, dir ? `${dir}/${e.name}` : e.name);
      const info = await stat(abs);
      return { path: relative(base, abs), type: e.isDirectory() ? "dir" : "file", size: info.size };
    })
  );
}

export async function readFileSafe(projectId: string, path: string) {
  const abs = resolveProjectPath(projectId, path);
  const info = await stat(abs);
  if (info.size > MAX_FILE_BYTES) throw new Error("File too large");
  return readFile(abs, "utf-8");
}

export async function writeFileSafe(projectId: string, path: string, content: string) {
  const abs = resolveProjectPath(projectId, path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content);
  return { path };
}

export async function deleteFile(projectId: string, path: string) {
  const abs = resolveProjectPath(projectId, path);
  await rm(abs, { recursive: true, force: true });
  return { deleted: true };
}
