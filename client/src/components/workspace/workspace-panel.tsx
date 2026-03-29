import React, { useState, useEffect, useCallback, useRef } from "react";
import { FolderOpen, RefreshCw, X, ChevronLeft, Trash2, Terminal, Play } from "lucide-react";
import { FileTree, type WorkspaceFileEntry } from "./file-tree";
import { CodeViewer } from "./code-viewer";
import { cn } from "@/lib/utils";
import { agentFetchHeaders as authHeaders } from "@/api/client";

interface WorkspacePanelProps {
  projectId: string;
  isStreaming: boolean;
  onClose?: () => void;
}

export function WorkspacePanel({ projectId, isStreaming, onClose }: WorkspacePanelProps) {
  const [files, setFiles] = useState<WorkspaceFileEntry[]>([]);
  const [currentDir, setCurrentDir] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [fileContent, setFileContent] = useState<string>("");
  const [previousContent, setPreviousContent] = useState<string | undefined>();
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "terminal">("files");
  const [terminalCmd, setTerminalCmd] = useState("");
  const [terminalOutput, setTerminalOutput] = useState<Array<{ cmd: string; stdout: string; stderr: string; exitCode: number; timedOut?: boolean }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Track last-seen content per path to power the diff view
  const lastContentRef = useRef<Record<string, string>>({});

  const fetchFiles = useCallback(
    async (dir = currentDir, silent = false) => {
      if (!silent) setIsRefreshing(true);
      try {
        const params = new URLSearchParams();
        if (dir) params.set("dir", dir);
        const res = await fetch(`/api/workspace/${projectId}/files?${params}`, {
          headers: authHeaders(),
        });
        if (res.status === 401) {
          setError("Unauthorized — check VITE_AGENT_API_KEY.");
          return;
        }
        if (!res.ok) throw new Error(await res.text());
        const data: WorkspaceFileEntry[] = await res.json();
        setFiles(data);
        setError(null);
      } catch (err) {
        setError(String(err));
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [projectId, currentDir]
  );

  const fetchFileContent = useCallback(
    async (filePath: string, silent = false) => {
      if (!silent) setIsLoadingContent(true);
      try {
        const params = new URLSearchParams({ path: filePath });
        const res = await fetch(`/api/workspace/${projectId}/file?${params}`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error(await res.text());
        const data: { path: string; content: string } = await res.json();

        const prev = lastContentRef.current[filePath];
        if (prev !== undefined && prev !== data.content) {
          setPreviousContent(prev);
        } else {
          setPreviousContent(undefined);
        }
        lastContentRef.current[filePath] = data.content;
        setFileContent(data.content);
        setSelectedPath(filePath);
      } catch (err) {
        setFileContent(`// Error loading file: ${err}`);
        setPreviousContent(undefined);
      } finally {
        if (!silent) setIsLoadingContent(false);
      }
    },
    [projectId]
  );

  const handleDeleteFile = useCallback(async (filePath: string) => {
    if (!confirm(`Delete ${filePath}?`)) return;
    try {
      const res = await fetch(
        `/api/workspace/${projectId}/file?path=${encodeURIComponent(filePath)}`,
        {
          method: "DELETE",
          headers: authHeaders(),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      if (selectedPath === filePath) {
        setSelectedPath(undefined);
        setFileContent("");
        setPreviousContent(undefined);
      }
      fetchFiles(currentDir, true);
    } catch (err) {
      alert(`Failed to delete: ${err}`);
    }
  }, [projectId, selectedPath, currentDir, fetchFiles]);

  const handleRunCommand = useCallback(async () => {
    if (!terminalCmd.trim() || isRunning) return;
    const cmd = terminalCmd.trim();
    setTerminalCmd("");
    setIsRunning(true);
    try {
      const res = await fetch(`/api/workspace/${projectId}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      setTerminalOutput((prev) => [...prev, { cmd, ...data }]);
    } catch (err) {
      setTerminalOutput((prev) => [
        ...prev,
        { cmd, stdout: "", stderr: String(err), exitCode: 1 },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, [projectId, terminalCmd, isRunning]);

  const handleNavigateDir = (dir: string) => {
    setCurrentDir(dir);
    setSelectedPath(undefined);
    setFileContent("");
    setPreviousContent(undefined);
  };

  const handleSelectFile = (path: string) => {
    fetchFileContent(path);
  };

  useEffect(() => {
    fetchFiles(currentDir, true);
  }, [currentDir]);

  useEffect(() => {
    if (!projectId) return;
    fetchFiles(currentDir, true);
    const interval = setInterval(
      () => fetchFiles(currentDir, true),
      isStreaming ? 1500 : 5000
    );
    return () => clearInterval(interval);
  }, [projectId, isStreaming, currentDir]);

  useEffect(() => {
    if (selectedPath && !isStreaming) {
      fetchFileContent(selectedPath, true);
    }
  }, [isStreaming]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  return (
    <div className="flex flex-col h-full bg-card border-l border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 shrink-0 bg-muted/20">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-yellow-500/80" />
          <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
            Workspace
          </span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-accent">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              live
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchFiles(currentDir)}
            className={cn(
              "p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors",
              isRefreshing && "animate-spin"
            )}
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              title="Close workspace"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border/50 shrink-0">
        {(["files", "terminal"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-accent text-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab === "files" ? <FolderOpen className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && activeTab === "files" && (
        <div className="px-3 py-2 text-xs text-destructive bg-destructive/10 border-b border-border/30">
          {files.length === 0 ? "Workspace is empty — the agent will create files here." : error}
        </div>
      )}

      {/* Files tab */}
      {activeTab === "files" && (
        selectedPath ? (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border/50 bg-muted/10 shrink-0">
              <button
                onClick={() => {
                  setSelectedPath(undefined);
                  setFileContent("");
                  setPreviousContent(undefined);
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <span className="text-xs text-muted-foreground/50 mx-1">/</span>
              <span className="text-xs font-mono text-foreground/70 truncate flex-1">{selectedPath}</span>
              <button
                onClick={() => handleDeleteFile(selectedPath)}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Delete file"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CodeViewer
                path={selectedPath}
                content={fileContent}
                previousContent={previousContent}
                isLoading={isLoadingContent}
                projectId={projectId}
                onSaved={(newContent) => {
                  lastContentRef.current[selectedPath] = newContent;
                  setFileContent(newContent);
                  setPreviousContent(undefined);
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            {files.length === 0 && !error ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
                <FolderOpen className="w-10 h-10 text-muted-foreground/30" />
                <div>
                  <p className="text-sm text-muted-foreground/60">Workspace is empty</p>
                  <p className="text-xs text-muted-foreground/40 mt-1">
                    Files the agent creates will appear here
                  </p>
                </div>
              </div>
            ) : (
              <FileTree
                files={files}
                selectedPath={selectedPath}
                onSelectFile={handleSelectFile}
                onNavigateDir={handleNavigateDir}
                onDeleteFile={handleDeleteFile}
                currentDir={currentDir}
              />
            )}
          </div>
        )
      )}

      {/* Terminal tab */}
      {activeTab === "terminal" && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-3">
            {terminalOutput.length === 0 && (
              <p className="text-muted-foreground/40 text-center mt-8">Run commands in the workspace</p>
            )}
            {terminalOutput.map((entry, i) => (
              <div key={i}>
                <div className="text-accent/80 mb-1">$ {entry.cmd}</div>
                {entry.stdout && (
                  <pre className="text-foreground/70 whitespace-pre-wrap">{entry.stdout}</pre>
                )}
                {entry.stderr && (
                  <pre className={cn("whitespace-pre-wrap", entry.exitCode !== 0 ? "text-destructive" : "text-yellow-400/70")}>
                    {entry.stderr}
                  </pre>
                )}
                {entry.timedOut && (
                  <div className="text-yellow-500/70 mt-1">⏱ Command timed out</div>
                )}
                {entry.exitCode !== 0 && !entry.timedOut && (
                  <div className="text-destructive/60 mt-1">exit code: {entry.exitCode}</div>
                )}
              </div>
            ))}
            <div ref={terminalEndRef} />
          </div>
          <div className="border-t border-border/50 p-2 shrink-0 flex gap-2">
            <input
              type="text"
              value={terminalCmd}
              onChange={(e) => setTerminalCmd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRunCommand()}
              placeholder="$ run a command…"
              className="flex-1 bg-muted/30 border border-border/50 rounded px-3 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-accent/50"
              disabled={isRunning}
            />
            <button
              onClick={handleRunCommand}
              disabled={isRunning || !terminalCmd.trim()}
              className="p-1.5 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
