import React, { useState } from "react";
import { Terminal, Globe, ChevronDown, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ToolCallState } from "@/hooks/use-chat-stream";

interface ToolCallCardProps {
  toolCall: ToolCallState;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getToolIcon = () => {
    switch (toolCall.name) {
      case "run_command":
        return <Terminal className="w-4 h-4" />;
      case "web_search":
        return <Globe className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  const getToolTitle = () => {
    const labels: Record<string, string> = {
      run_command: "Running Command",
      web_search: "Searching Web",
      read_file: "Reading File",
      write_file: "Writing File",
      delete_file: "Deleting File",
      list_files: "Listing Files",
      generate_image: "Generating Image",
      generate_video: "Generating Video",
      generate_music: "Generating Music",
      edit_music: "Editing Music",
    };
    return labels[toolCall.name] ?? `Tool: ${toolCall.name}`;
  };

  const isComplete = toolCall.output !== undefined;

  // For run_command, show the command arg; for write_file show the path.
  const primaryArg =
    toolCall.args?.command ??
    toolCall.args?.path ??
    toolCall.args?.query ??
    toolCall.args?.prompt ??
    null;

  return (
    <div className="my-4 rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center space-x-3 text-sm font-medium">
          <div className={cn(
            "p-1.5 rounded-md",
            isComplete ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
          )}>
            {getToolIcon()}
          </div>
          <span className="text-foreground">{getToolTitle()}</span>
          <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
            {isComplete ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Finished</span>
              </>
            ) : (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            )}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="border-t border-border/50 bg-muted/10"
          >
            <div className="p-4 space-y-4">
              {/* Args Section */}
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Input</div>
                {primaryArg ? (
                  <pre className="bg-[#1e1e1e] p-3 rounded-lg overflow-x-auto border border-border/50 text-xs font-mono text-primary/80 whitespace-pre-wrap">
                    {primaryArg}
                  </pre>
                ) : (
                  <pre className="bg-[#1e1e1e] p-3 rounded-lg overflow-x-auto border border-border/50 text-xs font-mono text-primary/80">
                    {typeof toolCall.args === "object" ? JSON.stringify(toolCall.args, null, 2) : toolCall.args}
                  </pre>
                )}
              </div>

              {/* Output Section */}
              {isComplete && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Output</div>
                  <pre className="bg-[#0c0c0e] p-4 rounded-lg overflow-x-auto border border-border/50 text-xs font-mono text-green-400">
                    {toolCall.output || "No output"}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
