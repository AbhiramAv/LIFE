"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, CheckCircle2, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Thread = {
  id: number; userId: string; status: string;
  userEmail: string; updatedAt: string;
  lastMessage: { content: string; isAdmin: boolean } | null;
};
type Message = { id: number; senderId: string; isAdmin: boolean; content: string; createdAt: string };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminHelpPage() {
  const [threads, setThreads]     = useState<Thread[]>([]);
  const [active, setActive]       = useState<Thread | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [reply, setReply]         = useState("");
  const [sending, setSending]     = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const supabase                  = createClient();

  useEffect(() => {
    fetch("/api/admin/support").then(r => r.json()).then(setThreads);
  }, []);

  useEffect(() => {
    if (!active) return;
    fetch(`/api/support/${active.id}/messages`).then(r => r.json()).then(setMessages);

    // Realtime subscription
    const channel = supabase
      .channel(`thread-${active.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_messages",
        filter: `thread_id=eq.${active.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [active?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !active || sending) return;
    setSending(true);
    await fetch(`/api/support/${active.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: reply.trim() }),
    });
    setReply("");
    setSending(false);
  }

  async function toggleStatus(thread: Thread) {
    const newStatus = thread.status === "open" ? "closed" : "open";
    await fetch(`/api/admin/support/${thread.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, status: newStatus } : t));
    if (active?.id === thread.id) setActive(prev => prev ? { ...prev, status: newStatus } : prev);
  }

  const open   = threads.filter(t => t.status === "open");
  const closed = threads.filter(t => t.status === "closed");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Support</h1>

      <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
        {/* Thread list */}
        <div className="w-72 shrink-0 space-y-1 overflow-y-auto pr-1">
          {[{ label: "Open", items: open }, { label: "Closed", items: closed }].map(({ label, items }) =>
            items.length > 0 && (
              <div key={label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 py-1.5">{label}</p>
                {items.map(t => (
                  <button key={t.id} onClick={() => setActive(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${active?.id === t.id ? "bg-muted" : "hover:bg-muted/50"}`}>
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-medium truncate">{t.userEmail}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(t.updatedAt)}</span>
                    </div>
                    {t.lastMessage && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {t.lastMessage.isAdmin ? "You: " : ""}{t.lastMessage.content}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )
          )}
          {threads.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No support threads yet</p>
          )}
        </div>

        {/* Chat panel */}
        <div className="flex-1 flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Select a thread
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-semibold">{active.userEmail}</p>
                  <p className="text-[11px] text-muted-foreground">Thread #{active.id}</p>
                </div>
                <button onClick={() => toggleStatus(active)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${
                    active.status === "open"
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}>
                  {active.status === "open"
                    ? <><Circle className="h-3 w-3" /> Open</>
                    : <><CheckCircle2 className="h-3 w-3" /> Closed</>}
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      msg.isAdmin
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${msg.isAdmin ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {timeAgo(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Reply input */}
              <form onSubmit={sendReply} className="border-t border-border p-3 flex gap-2">
                <Input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder={active.status === "closed" ? "Thread closed" : "Reply…"}
                  disabled={active.status === "closed" || sending}
                  className="flex-1 text-sm"
                />
                <Button type="submit" size="sm" disabled={!reply.trim() || active.status === "closed" || sending}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
