"use client";

import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Minimize2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Message = { id: number; isAdmin: boolean; content: string; createdAt: string };
type UserMeta = { role?: string };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export function HelpWidget() {
  const [open, setOpen]         = useState(false);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const [isAdmin, setIsAdmin]   = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const supabase                = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata as UserMeta | undefined;
      if (meta?.role === "admin") setIsAdmin(true);
    });
  }, []);

  // Get or create thread on first open
  useEffect(() => {
    if (!open || threadId) return;
    fetch("/api/support/thread")
      .then(r => r.json())
      .then(t => {
        setThreadId(t.id);
        fetch(`/api/support/${t.id}/messages`)
          .then(r => r.json())
          .then(setMessages);
      });
  }, [open]);

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`help-${threadId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "support_messages",
        filter: `thread_id=eq.${threadId}`,
      }, payload => {
        const msg = payload.new as Message;
        setMessages(prev => [...prev, msg]);
        if (!open && msg.isAdmin) setUnread(u => u + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !threadId || sending) return;
    setSending(true);
    const res = await fetch(`/api/support/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text.trim() }),
    });
    const msg = await res.json();
    setMessages(prev => [...prev, msg]);
    setText("");
    setSending(false);
  }

  if (isAdmin) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Chat panel */}
      {open && (
        <div className="w-80 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          style={{ height: 420 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
            <div>
              <p className="text-sm font-semibold">Support</p>
              <p className="text-[11px] opacity-70">We typically reply within a few hours</p>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-70 transition-opacity">
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6 space-y-1">
                <p className="font-medium">How can we help?</p>
                <p>Send a message and we&apos;ll get back to you.</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isAdmin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                  msg.isAdmin
                    ? "bg-muted text-foreground"
                    : "bg-primary text-primary-foreground"
                }`}>
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-0.5 ${msg.isAdmin ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                    {timeAgo(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="border-t border-border p-3 flex gap-2">
            <Input
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 text-sm h-9"
              autoFocus
            />
            <Button type="submit" size="sm" className="h-9 px-3" disabled={!text.trim() || sending}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform relative"
        aria-label="Help"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
