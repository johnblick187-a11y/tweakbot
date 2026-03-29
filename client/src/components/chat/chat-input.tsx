import React, { useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { SendHorizontal, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  onSend: (message: string) => void;
  isStreaming: boolean;
  onStop: () => void;
}

export function ChatInput({ onSend, isStreaming, onStop }: ChatInputProps) {
  const [value, setValue] = React.useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isStreaming) {
        onSend(value.trim());
        setValue("");
      }
    }
  };

  const handleSend = () => {
    if (value.trim() && !isStreaming) {
      onSend(value.trim());
      setValue("");
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!isStreaming && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStreaming]);

  return (
    <div className="relative max-w-3xl mx-auto w-full">
      <div className="relative flex items-end bg-card border border-border shadow-sm rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent transition-all duration-200">
        <TextareaAutosize
          ref={inputRef}
          minRows={1}
          maxRows={8}
          placeholder="Message TweakBot..."
          className="w-full resize-none bg-transparent px-4 py-4 pr-14 text-foreground placeholder:text-muted-foreground focus:outline-none text-base leading-relaxed"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
        />
        
        <div className="absolute right-2 bottom-2">
          {isStreaming ? (
            <Button
              size="icon"
              variant="destructive"
              className="h-10 w-10 rounded-xl rounded-br-lg"
              onClick={onStop}
              title="Stop generating"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              variant={value.trim() ? "accent" : "secondary"}
              className="h-10 w-10 rounded-xl rounded-br-lg transition-all duration-300"
              onClick={handleSend}
              disabled={!value.trim()}
            >
              <SendHorizontal className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      <div className="text-center mt-2">
        <span className="text-xs text-muted-foreground/60">
          AI can make mistakes. Verify important code or information.
        </span>
      </div>
    </div>
  );
}
