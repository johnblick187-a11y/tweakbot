import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import { Bot } from "lucide-react";
import { ChatPage } from "@/pages/chat-page";
import { getUserId, setUserId } from "@/api/client";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function UsernameGate({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) { setError("Please enter a username."); return; }
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) { setError("Letters, numbers, _ and - only (max 64 chars)."); return; }
    setUserId(trimmed);
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-2xl border border-border bg-card shadow-lg">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-accent/10 p-3 rounded-2xl text-accent border border-accent/20">
            <Bot className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to TweakBot</h1>
          <p className="text-sm text-muted-foreground text-center">Enter a username. TweakBot will remember you.</p>
        </div>
        <div className="space-y-3">
          <input
            autoFocus
            type="text"
            placeholder="your-username"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent/60 transition-colors font-mono"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button onClick={handleSubmit} className="w-full bg-accent text-accent-foreground rounded-xl py-3 text-sm font-semibold hover:bg-accent/90 transition-colors">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [userId, setUserIdState] = useState(() => getUserId());

  if (!userId) {
    return <UsernameGate onDone={() => setUserIdState(getUserId())} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter>
        <Switch>
          <Route path="/" component={ChatPage} />
          <Route path="/c/:id" component={ChatPage} />
        </Switch>
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
