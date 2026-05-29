"use client";

import { useState, useEffect } from "react";
import { UserPlus, Target, Heart, Layers, CheckSquare } from "lucide-react";

type Event = {
  type: "signup" | "habit" | "mood" | "project" | "done";
  label: string;
  detail: string | null;
  email: string;
  userId: string;
  at: string;
};

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  signup:  { icon: UserPlus,    color: "text-violet-400",  bg: "bg-violet-500/10" },
  habit:   { icon: Target,      color: "text-emerald-400", bg: "bg-emerald-500/10" },
  mood:    { icon: Heart,       color: "text-rose-400",    bg: "bg-rose-500/10" },
  project: { icon: Layers,      color: "text-sky-400",     bg: "bg-sky-500/10" },
  done:    { icon: CheckSquare, color: "text-amber-400",   bg: "bg-amber-500/10" },
};

const FILTERS = ["all", "signup", "habit", "mood", "project", "done"] as const;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ActivityPage() {
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<typeof FILTERS[number]>("all");

  useEffect(() => {
    fetch("/api/admin/activity")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEvents(data); })
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === "all" ? events : events.filter(e => e.type === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Last 100 events across all users</p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="space-y-1">
        {loading ? (
          Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-48 rounded bg-muted animate-pulse" />
                <div className="h-2.5 w-24 rounded bg-muted animate-pulse" />
              </div>
            </div>
          ))
        ) : visible.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No events yet</p>
        ) : visible.map((e, i) => {
          const meta = TYPE_META[e.type];
          const Icon = meta.icon;
          return (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${meta.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-tight">
                  <span className="font-medium">{e.email}</span>
                  {" "}
                  <span className="text-muted-foreground">{e.label}</span>
                  {e.detail && (
                    <span className="text-foreground"> — <span className="font-medium">{e.detail}</span></span>
                  )}
                </p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{timeAgo(e.at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
