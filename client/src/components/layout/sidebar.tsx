import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, PlusCircle, Trash2, Bot } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, queryKeys } from "@/api/client";

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: queryKeys.conversations,
    queryFn: api.listConversations,
  });

  const { mutate: createChat, isPending: isCreating } = useMutation({
    mutationFn: () => api.createConversation("New Conversation"),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      setLocation(`/c/${data.id}`);
    },
  });

  const { mutate: deleteChat } = useMutation({
    mutationFn: (id: number) => api.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      if (location !== "/") setLocation("/");
    },
  });

  return (
    <div className="w-72 border-r border-border bg-sidebar h-screen flex flex-col hidden md:flex shrink-0">
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center space-x-2 px-2">
          <div className="bg-accent/10 p-1.5 rounded-lg text-accent">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-semibold tracking-tight text-sidebar-foreground text-lg">TweakBot</span>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={() => createChat()}
          disabled={isCreating}
          className="w-full flex items-center justify-start space-x-2 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 border border-border shadow-sm h-11 px-4 rounded-lg font-medium text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        <div className="px-3 pb-2 pt-1 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
          Recent History
        </div>
        {isLoading ? (
          <div className="px-3 py-4 text-sm text-sidebar-foreground/50">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-4 text-sm text-sidebar-foreground/40 italic">No conversations yet</div>
        ) : (
          conversations.map((chat) => {
            const isActive = location === `/c/${chat.id}`;
            return (
              <div
                key={chat.id}
                className={`group relative flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer ${isActive ? "bg-sidebar-primary/10 text-sidebar-primary font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
                onClick={() => setLocation(`/c/${chat.id}`)}
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/40"}`} />
                  <div className="truncate">
                    <div className="truncate">{chat.title || "Untitled"}</div>
                    <div className="text-[10px] text-sidebar-foreground/40 mt-0.5 font-normal">
                      {format(new Date(chat.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                  className={`p-1.5 rounded-md text-sidebar-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
