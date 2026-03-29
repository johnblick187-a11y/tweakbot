import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Pencil, X, Save, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { agentFetchHeaders as authHeaders } from "@/api/client";

interface CodeViewerProps {
  path: string;
  content: string;
  previousContent?: string;
  isLoading?: boolean;
  projectId: string;
  onSaved?: (newContent: string) => void;
}

function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx",
    js: "javascript", jsx: "jsx",
    py: "python",
    json: "json",
    md: "markdown",
    css: "css",
    html: "html",
    sh: "bash", bash: "bash",
    yaml: "yaml", yml: "yaml",
    toml: "toml",
    env: "bash",
    txt: "text",
    rs: "rust",
    go: "go",
  };
  return map[ext] ?? "text";
}

type ViewMode = "view" | "edit" | "diff";

export function CodeViewer({ path, content, previousContent, isLoading, projectId, onSaved }: CodeViewerProps) {
  const [copied, setCopied] = React.useState(false);
  const [mode, setMode] = React.useState<ViewMode>("view");
  const [editContent, setEditContent] = React.useState(content);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const filename = path.split("/").pop() ?? path;
  const lang = detectLanguage(path);
  const hasDiff = !!previousContent && previousContent !== content;

  // Sync edit buffer when content changes externally
  React.useEffect(() => {
    if (mode !== "edit") setEditContent(content);
  }, [content, mode]);

  // Auto-show diff when agent has just modified this file
  React.useEffect(() => {
    if (hasDiff) setMode("diff");
  }, [previousContent]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mode === "edit" ? editContent : content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/workspace/${projectId}/file?path=${encodeURIComponent(path)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ content: editContent }),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved?.(editContent);
      setMode("view");
    } catch (err) {
      setSaveError(String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setSaveError(null);
    setMode("view");
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground/50 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/20 shrink-0 gap-2">
        <span className="text-xs font-mono text-muted-foreground truncate">{filename}</span>

        <div className="flex items-center gap-1 shrink-0">
          {/* Diff toggle — only when there's a previous version */}
          {hasDiff && mode !== "edit" && (
            <button
              onClick={() => setMode(mode === "diff" ? "view" : "diff")}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                mode === "diff"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Toggle diff"
            >
              <GitDiff className="w-3.5 h-3.5" />
              <span>diff</span>
            </button>
          )}

          {/* Edit / save / cancel */}
          {mode === "edit" ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-accent/20 text-accent hover:bg-accent/30 transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={() => { setMode("edit"); setEditContent(content); }}
              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              title="Edit file"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {saveError && (
        <div className="px-3 py-1.5 text-xs text-destructive bg-destructive/10 border-b border-border/30">
          {saveError}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {mode === "edit" ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full h-full bg-transparent text-[0.8rem] font-mono leading-relaxed p-4 resize-none outline-none text-foreground/90 placeholder:text-muted-foreground/40"
            spellCheck={false}
            autoComplete="off"
          />
        ) : mode === "diff" && previousContent ? (
          <DiffView oldContent={previousContent} newContent={content} />
        ) : (
          <SyntaxHighlighter
            language={lang}
            style={vscDarkPlus as any}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.8rem",
              lineHeight: "1.6",
              minHeight: "100%",
            }}
            showLineNumbers
            lineNumberStyle={{ color: "rgba(255,255,255,0.15)", minWidth: "2.5em" }}
          >
            {content}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}

// Simple line-by-line diff view
function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  // Build a simple unified-style diff
  const hunks = computeLineDiff(oldLines, newLines);

  return (
    <div className="overflow-auto p-4 font-mono text-[0.75rem] leading-relaxed">
      {hunks.map((line, i) => (
        <div
          key={i}
          className={cn(
            "px-2 whitespace-pre-wrap",
            line.type === "add" && "bg-green-500/15 text-green-400",
            line.type === "remove" && "bg-red-500/15 text-red-400 line-through decoration-red-500/40",
            line.type === "context" && "text-muted-foreground/60"
          )}
        >
          <span className="select-none mr-3 text-muted-foreground/30">
            {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
          </span>
          {line.text}
        </div>
      ))}
    </div>
  );
}

type DiffLine = { type: "add" | "remove" | "context"; text: string };

function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  // Simple LCS-based diff
  const result: DiffLine[] = [];
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const lcs: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      lcs[i][j] = oldLines[i - 1] === newLines[j - 1]
        ? lcs[i - 1][j - 1] + 1
        : Math.max(lcs[i - 1][j], lcs[i][j - 1]);
    }
  }

  // Trace back
  const trace: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      trace.unshift({ type: "context", text: oldLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      trace.unshift({ type: "add", text: newLines[j - 1] });
      j--;
    } else {
      trace.unshift({ type: "remove", text: oldLines[i - 1] });
      i--;
    }
  }

  // Collapse long context blocks (show max 3 lines of context)
  const CONTEXT_LINES = 3;
  let contextRun = 0;
  const collapsed: DiffLine[] = [];
  for (let k = 0; k < trace.length; k++) {
    if (trace[k].type === "context") {
      contextRun++;
      if (contextRun <= CONTEXT_LINES) {
        collapsed.push(trace[k]);
      } else {
        // Replace run with ellipsis once
        if (contextRun === CONTEXT_LINES + 1) {
          collapsed.push({ type: "context", text: "  ⋮" });
        }
      }
    } else {
      contextRun = 0;
      collapsed.push(trace[k]);
    }
  }

  return collapsed;
}
