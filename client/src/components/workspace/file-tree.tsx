import React from "react";
import { ChevronRight, File, FolderOpen, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkspaceFileEntry {
  path: string;
  type: "file" | "dir";
  size: number;
}

interface FileTreeProps {
  files: WorkspaceFileEntry[];
  selectedPath?: string;
  onSelectFile: (path: string) => void;
  onNavigateDir: (dir: string) => void;
  onDeleteFile?: (path: string) => void;
  currentDir: string;
}

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function fileColor(ext: string): string {
  const map: Record<string, string> = {
    ts: "text-blue-400", tsx: "text-blue-300",
    js: "text-yellow-400", jsx: "text-yellow-300",
    py: "text-green-400",
    json: "text-orange-400",
    md: "text-purple-400",
    css: "text-pink-400",
    html: "text-red-400",
    sh: "text-gray-400",
    env: "text-yellow-600",
  };
  return map[ext] ?? "text-muted-foreground";
}

export function FileTree({
  files,
  selectedPath,
  onSelectFile,
  onNavigateDir,
  onDeleteFile,
  currentDir,
}: FileTreeProps) {
  const dirs = files.filter((f) => f.type === "dir");
  const fileEntries = files.filter((f) => f.type === "file");
  const pathParts = currentDir ? currentDir.split("/").filter(Boolean) : [];

  return (
    <div className="flex flex-col h-full">
      {currentDir && (
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50 flex-wrap">
          <button
            onClick={() => onNavigateDir("")}
            className="text-xs text-accent hover:underline font-mono"
          >
            root
          </button>
          {pathParts.map((part, i) => {
            const partPath = pathParts.slice(0, i + 1).join("/");
            return (
              <React.Fragment key={partPath}>
                <ChevronRight className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                <button
                  onClick={() => onNavigateDir(partPath)}
                  className="text-xs text-accent hover:underline font-mono"
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-1">
        {files.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground/60">
            No files yet
          </div>
        )}

        {dirs.map((entry) => {
          const name = entry.path.split("/").pop() ?? entry.path;
          return (
            <div key={entry.path} className="group flex items-center">
              <button
                onClick={() => onNavigateDir(entry.path)}
                className="flex-1 flex items-center gap-2 px-3 py-1.5 hover:bg-muted/40 text-left transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-yellow-500/80 shrink-0" />
                <span className="text-sm text-foreground/80 font-mono truncate group-hover:text-foreground">
                  {name}
                </span>
              </button>
              {onDeleteFile && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteFile(entry.path); }}
                  className="opacity-0 group-hover:opacity-100 pr-3 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete folder"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {fileEntries.map((entry) => {
          const name = entry.path.split("/").pop() ?? entry.path;
          const ext = getExtension(name);
          const isSelected = selectedPath === entry.path;
          return (
            <div key={entry.path} className="group flex items-center">
              <button
                onClick={() => onSelectFile(entry.path)}
                className={cn(
                  "flex-1 flex items-center gap-2 px-3 py-1.5 text-left transition-colors border-l-2",
                  isSelected
                    ? "bg-accent/10 border-accent"
                    : "hover:bg-muted/40 border-transparent"
                )}
              >
                <File className={cn("w-4 h-4 shrink-0", fileColor(ext))} />
                <span
                  className={cn(
                    "text-sm font-mono truncate",
                    isSelected ? "text-accent" : "text-foreground/70 group-hover:text-foreground"
                  )}
                >
                  {name}
                </span>
                <span className="ml-auto text-xs text-muted-foreground/40 shrink-0">
                  {entry.size > 0 ? `${(entry.size / 1024).toFixed(1)}kb` : ""}
                </span>
              </button>
              {onDeleteFile && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteFile(entry.path); }}
                  className="opacity-0 group-hover:opacity-100 pr-3 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
