/**
 * Minimal API client — replaces the generated @workspace/api-client-react package.
 * All requests automatically include Authorization and X-User-ID headers.
 */

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extra };
  const apiKey = import.meta.env.VITE_AGENT_API_KEY as string | undefined;
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const userId = localStorage.getItem("tweakbot_user_id");
  if (userId) headers["X-User-ID"] = userId;
  return headers;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { ...getHeaders(), ...(options.headers as Record<string, string> ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// Types
export interface Conversation {
  id: number;
  title: string;
  userId: string;
  createdAt: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

// API functions
export const api = {
  listConversations: () => apiFetch<Conversation[]>("/api/agent/conversations"),
  createConversation: (title: string) => apiFetch<Conversation>("/api/agent/conversations", { method: "POST", body: JSON.stringify({ title }) }),
  getConversation: (id: number) => apiFetch<ConversationWithMessages>(`/api/agent/conversations/${id}`),
  deleteConversation: (id: number) => apiFetch<null>(`/api/agent/conversations/${id}`, { method: "DELETE" }),
};

// React Query keys
export const queryKeys = {
  conversations: ["/api/agent/conversations"] as const,
  conversation: (id: number) => [`/api/agent/conversations/${id}`] as const,
  messages: (id: number) => [`/api/agent/conversations/${id}/messages`] as const,
};

// Auth helpers
export function getUserId(): string | null {
  return localStorage.getItem("tweakbot_user_id");
}

export function setUserId(id: string): void {
  localStorage.setItem("tweakbot_user_id", id);
}

export function agentFetchHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const apiKey = import.meta.env.VITE_AGENT_API_KEY as string | undefined;
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
  const userId = localStorage.getItem("tweakbot_user_id");
  if (userId) headers["X-User-ID"] = userId;
  return headers;
}
