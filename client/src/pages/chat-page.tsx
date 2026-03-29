import React, { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Bot, User, Sparkles, TerminalSquare, Search, FileCode2, PanelRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/api/client";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatInput } from "@/components/chat/chat-input";
import { MarkdownRenderer } from "@/components/chat/markdown-renderer";
import { ToolCallCard } from "@/components/chat/tool-call-card";
import { WorkspacePanel } from "@/components/workspace/workspace-panel";
import { useChatStream } from "@/hooks/use-chat-stream";
import { cn } from "@/lib/utils";

export function ChatPage() {
  const [match, params] = useRoute("/c/:id");
  const conversationId = match ? parseInt((params as any).id, 10) : undefined;
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [workspaceOpen, setWorkspaceOpen] = useState(true);

  const { data: conversation } = useQuery({
    queryKey: queryKeys.conversation(conversationId || 0),
    queryFn: () => api.getConversation(conversationId!),
    enabled: !!conversationId,
  });

  const { mutateAsync: createConversation } = useMutation({
    mutationFn: (title: string) => api.createConversation(title),
  });

  const { sendMessage, isStreaming, streamedMessage, stopStreaming } = useChatStream(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, streamedMessage]);

  const handleSendMessage = async (content: string) => {
    if (!conversationId) {
      try {
        const chat = await createConversation(content.slice(0, 50) + (content.length > 50 ? "…" : ""));
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
        setLocation(`/c/${chat.id}`);
        setTimeout(() => window.dispatchEvent(new CustomEvent("start-initial-message", { detail: content })), 100);
      } catch (e) { console.error("Failed to create chat", e); }
      return;
    }
    sendMessage(content);
  };

  useEffect(() => {
    const handler = (e: any) => { if (conversationId && !isStreaming) sendMessage(e.detail); };
    window.addEventListener("start-initial-message", handler);
    return () => window.removeEventListener("start-initial-message", handler);
  }, [conversationId, isStreaming, sendMessage]);

  const projectId = conversationId ? `conv-${conversationId}` : null;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen relative min-w-0">
        <header className="h-14 border-b border-border bg-background/80 backdrop-blur-md flex items-center px-4 shrink-0 z-10 sticky top-0">
          <div className="flex-1 flex items-center justify-center">
            <span className="font-medium text-sm text-foreground/80">
              {conversationId ? conversation?.title : "New Chat"}
            </span>
          </div>
          {conversationId && (
            <button onClick={() => setWorkspaceOpen(v => !v)} className={cn("p-2 rounded-lg transition-colors", workspaceOpen ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground hover:bg-muted/40")}>
              <PanelRight className="w-4 h-4" />
            </button>
          )}
        </header>

        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex flex-col relative min-w-0">
            <div className="flex-1 overflow-y-auto scroll-smooth">
              {(!conversationId || (conversation?.messages?.length === 0 && !streamedMessage)) ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto w-full h-full">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col items-center space-y-6">
                    <div className="bg-accent/10 p-4 rounded-2xl text-accent border border-accent/20">
                      <Bot className="w-12 h-12" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold tracking-tight text-foreground">What's your next move?</h1>
                      <p className="mt-2 text-muted-foreground max-w-lg">I'm TweakBot — a Groq-powered coding agent. Give me a task.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
                      {[
                        { icon: <TerminalSquare className="w-5 h-5" />, title: "Burn through code", desc: "scrape, parse, destroy" },
                        { icon: <FileCode2 className="w-5 h-5" />, title: "Twist and build", desc: "React, Tailwind, Framer" },
                        { icon: <Search className="w-5 h-5" />, title: "Hunt the web", desc: "find what's hidden" },
                        { icon: <Sparkles className="w-5 h-5" />, title: "Break it down", desc: "complexity made lethal" },
                      ].map((p, i) => (
                        <button key={i} onClick={() => handleSendMessage(`${p.title}: ${p.desc}`)} className="text-left p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/5 hover:border-accent/30 transition-all duration-300 group">
                          <div className="text-muted-foreground group-hover:text-accent mb-2 transition-colors">{p.icon}</div>
                          <div className="font-medium text-foreground">{p.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto w-full pt-8 pb-32 px-4 space-y-6">
                  {conversation?.messages?.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
                  {streamedMessage && (
                    <div className="flex w-full space-x-4">
                      <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                        <Bot className="w-5 h-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2 pt-1">
                        <div className="font-semibold text-sm text-foreground mb-1">TweakBot</div>
                        {streamedMessage.content && <MarkdownRenderer content={streamedMessage.content} />}
                        {Object.values(streamedMessage.toolCalls || {}).map((tc) => <ToolCallCard key={tc.id} toolCall={tc} />)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-12 pb-6">
              <ChatInput onSend={handleSendMessage} isStreaming={isStreaming} onStop={stopStreaming} />
            </div>
          </div>
          {conversationId && projectId && workspaceOpen && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 340, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="shrink-0 overflow-hidden" style={{ width: 340 }}>
              <WorkspacePanel projectId={projectId} isStreaming={isStreaming} onClose={() => setWorkspaceOpen(false)} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("flex w-full space-x-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0"><Bot className="w-5 h-5 text-accent" /></div>}
      <div className={cn("max-w-[85%] flex flex-col space-y-2 pt-1 min-w-0", isUser ? "items-end" : "items-start")}>
        {!isUser && <div className="font-semibold text-sm text-foreground mb-1">TweakBot</div>}
        {isUser ? (
          <div className="bg-secondary text-secondary-foreground px-5 py-3.5 rounded-2xl rounded-tr-sm shadow-sm border border-border/50 text-[15px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="w-full"><MarkdownRenderer content={message.content} /></div>
        )}
      </div>
      {isUser && <div className="w-8 h-8 rounded-md bg-secondary border border-border/50 flex items-center justify-center shrink-0"><User className="w-5 h-5 text-secondary-foreground/70" /></div>}
    </motion.div>
  );
}
