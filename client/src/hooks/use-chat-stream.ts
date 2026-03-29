import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys, agentFetchHeaders } from "@/api/client";

export type ToolCallState = { id: string; name: string; args: any; output?: string };
export type StreamState = { content: string; toolCalls: Record<string, ToolCallState> };

export function useChatStream(conversationId?: number) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedMessage, setStreamedMessage] = useState<StreamState | null>(null);
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId) return;
    setIsStreaming(true);
    setStreamedMessage({ content: "", toolCalls: {} });

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch(`/api/agent/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...agentFetchHeaders() },
        body: JSON.stringify({ content }),
        signal: abortController.signal,
      });

      if (response.status === 401) throw new Error("Unauthorized — check VITE_AGENT_API_KEY.");
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const dataStr = line.slice(6);
          if (dataStr.trim() === "[DONE]") continue;
          try {
            const event = JSON.parse(dataStr);
            setStreamedMessage((prev) => {
              const current = prev || { content: "", toolCalls: {} };
              if (event.type === "content") return { ...current, content: event.content ?? "" };
              if (event.type === "tool_call") return { ...current, toolCalls: { ...current.toolCalls, [event.id]: { id: event.id, name: event.name, args: event.args } } };
              if (event.type === "tool_result") {
                const t = current.toolCalls[event.id];
                if (t) return { ...current, toolCalls: { ...current.toolCalls, [event.id]: { ...t, output: event.output } } };
              }
              return current;
            });
          } catch (e) { console.error("SSE parse error", e); }
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") console.error("Stream error:", error);
    } finally {
      setIsStreaming(false);
      setStreamedMessage(null);
      abortRef.current = null;
      queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.conversation(conversationId) });
    }
  }, [conversationId, queryClient]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { sendMessage, stopStreaming, isStreaming, streamedMessage };
}
