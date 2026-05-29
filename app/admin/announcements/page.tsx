"use client";

import { useState, useEffect } from "react";
import { Trash2, Loader2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Announcement = {
  id: number;
  content: string;
  targetRole: string;
  active: boolean;
  createdAt: string;
};

const ROLE_OPTIONS = ["all", "user", "dev", "admin"];

const ROLE_COLORS: Record<string, string> = {
  all:   "bg-violet-500/15 text-violet-400 border border-violet-500/20",
  user:  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
  dev:   "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  admin: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AnnouncementsPage() {
  const [items, setItems]       = useState<Announcement[]>([]);
  const [loading, setLoading]   = useState(true);
  const [content, setContent]   = useState("");
  const [role, setRole]         = useState("all");
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    fetch("/api/admin/announcements")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data); })
      .finally(() => setLoading(false));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setCreating(true); setError("");
    try {
      const res  = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, targetRole: role }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed"); return; }
      setItems(prev => [json, ...prev]);
      setContent("");
    } catch {
      setError("Network error");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(item: Announcement) {
    const res = await fetch(`/api/admin/announcements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    if (res.ok) {
      setItems(prev => prev.map(a => a.id === item.id ? { ...a, active: !a.active } : a));
    }
  }

  async function remove(id: number) {
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(a => a.id !== id));
  }

  const active = items.filter(a => a.active);
  const inactive = items.filter(a => !a.active);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Banners shown to users in the app</p>
      </div>

      {/* Create form */}
      <form onSubmit={create} className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-medium">New announcement</p>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write a message for users…"
          rows={2}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          required
        />
        <div className="flex items-center gap-3">
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none"
          >
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>Audience: {r}</option>)}
          </select>
          {error && <p className="text-xs text-rose-400 flex-1">{error}</p>}
          <Button type="submit" size="sm" disabled={creating} className="ml-auto">
            {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Publish</>}
          </Button>
        </div>
      </form>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No announcements yet</p>
      ) : (
        <div className="space-y-6">
          {[{ label: "Active", list: active }, { label: "Inactive", list: inactive }].map(({ label, list }) =>
            list.length > 0 && (
              <div key={label} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                {list.map(item => (
                  <div key={item.id} className={`rounded-xl border bg-card p-4 flex items-start gap-3 transition-opacity ${item.active ? "" : "opacity-50"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{item.content}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[item.targetRole] ?? ROLE_COLORS.all}`}>
                          {item.targetRole}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`p-1.5 rounded-md transition-colors ${item.active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-muted"}`}
                        title={item.active ? "Deactivate" : "Activate"}
                      >
                        {item.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => remove(item.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
