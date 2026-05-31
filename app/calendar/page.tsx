"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Trash2, Clock, CalendarDays, Pencil, Check, Star } from "lucide-react";

type CalEvent = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  color: string;
  important: boolean;
};

const EVENT_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899",
];

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function groupByMonth(events: CalEvent[]): Record<string, CalEvent[]> {
  const groups: Record<string, CalEvent[]> = {};
  for (const e of events) {
    const key = e.date.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function autoPickColor(existing: CalEvent[]): string {
  const used = new Set(existing.map(e => e.color));
  return EVENT_COLORS.find(c => !used.has(c)) ?? EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)];
}

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr + "T00:00:00").getTime() - new Date(localToday() + "T00:00:00").getTime()) / 86400000);
}

function tickerLabel(dateStr: string): string {
  const d = daysUntil(dateStr);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d < 0) return `${Math.abs(d)}d ago`;
  return `D-${d}`;
}

export default function CalendarPage() {
  const [events, setEvents]           = useState<CalEvent[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate]               = useState(localToday());
  const [time, setTime]               = useState("");
  const [color, setColor]             = useState(EVENT_COLORS[0]);
  const [important, setImportant]     = useState(false);
  const [saving, setSaving]           = useState(false);

  // Edit state
  const [editingId, setEditingId]         = useState<number | null>(null);
  const [editTitle, setEditTitle]         = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate]           = useState("");
  const [editTime, setEditTime]           = useState("");
  const [editColor, setEditColor]         = useState(EVENT_COLORS[0]);
  const [editImportant, setEditImportant] = useState(false);
  const [editSaving, setEditSaving]       = useState(false);

  useEffect(() => {
    fetch("/api/calendar").then(r => r.json()).then(data => {
      setEvents(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  function openForm() {
    setColor(autoPickColor(events));
    setImportant(false);
    setShowForm(true);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null, date, time: time || null, color, important }),
    });
    const created = await res.json();
    setEvents(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
    setTitle(""); setDescription(""); setDate(localToday()); setTime(""); setImportant(false);
    setSaving(false); setShowForm(false);
  }

  function startEdit(ev: CalEvent) {
    setEditingId(ev.id);
    setEditTitle(ev.title);
    setEditDescription(ev.description ?? "");
    setEditDate(ev.date);
    setEditTime(ev.time ?? "");
    setEditColor(ev.color);
    setEditImportant(ev.important);
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim() || !editDate) return;
    setEditSaving(true);
    const res = await fetch(`/api/calendar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() || null, date: editDate, time: editTime || null, color: editColor, important: editImportant }),
    });
    const updated = await res.json();
    setEvents(prev => prev.map(e => e.id === id ? updated : e).sort((a, b) => a.date.localeCompare(b.date)));
    setEditingId(null);
    setEditSaving(false);
  }

  async function deleteEvent(id: number) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  const today    = localToday();
  const upcoming = events.filter(e => e.date >= today);
  const past     = events.filter(e => e.date < today);
  const grouped  = groupByMonth(upcoming);

  function renderEventCard(ev: CalEvent, dim = false) {
    if (ev.id === editingId) {
      return (
        <div key={ev.id} className="px-4 py-3 rounded-xl border border-primary/40 bg-card space-y-2.5">
          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)}
            className="h-8 text-sm font-medium" autoFocus />
          <Input value={editDescription} onChange={e => setEditDescription(e.target.value)}
            placeholder="Description (optional)" className="h-8 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-8 text-xs" />
            <Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setEditColor(c)}
                  className="h-5 w-5 rounded-full transition-all shrink-0"
                  style={{ backgroundColor: c, transform: editColor === c ? "scale(1.25)" : "scale(1)",
                    boxShadow: editColor === c ? `0 0 0 2px var(--background), 0 0 0 3px ${c}` : "none" }} />
              ))}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
              <input type="checkbox" checked={editImportant} onChange={e => setEditImportant(e.target.checked)}
                className="rounded accent-amber-400" />
              <Star className="h-3 w-3 text-amber-400" />
              Important
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-7 text-xs" disabled={editSaving || !editTitle.trim()}
              onClick={() => saveEdit(ev.id)}>
              <Check className="h-3 w-3 mr-1" />{editSaving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-3" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    const d = daysUntil(ev.date);

    return (
      <div key={ev.id}
        className={`group flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-all ${dim ? "opacity-50" : ""}`}>
        <div className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ev.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium ${dim ? "line-through" : ""}`}>{ev.title}</p>
            {ev.important && !dim && (
              <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full border shrink-0"
                style={{ color: ev.color, borderColor: ev.color + "60", backgroundColor: ev.color + "18" }}>
                {d <= 7 && d >= 0 ? tickerLabel(ev.date) : `D-${d}`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground">{formatDate(ev.date)}</span>
            {ev.time && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />{ev.time}
              </span>
            )}
          </div>
          {ev.description && <p className="text-xs text-muted-foreground mt-1 truncate">{ev.description}</p>}
        </div>
        {!dim && (
          <div className="flex gap-0.5 shrink-0">
            <button onClick={() => startEdit(ev)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => deleteEvent(ev.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {dim && (
          <button onClick={() => deleteEvent(ev.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{upcoming.length} upcoming events</p>
        </div>
        <Button size="sm" onClick={() => { if (showForm) setShowForm(false); else openForm(); }}
          variant={showForm ? "secondary" : "default"}>
          {showForm ? <><X className="h-4 w-4 mr-1" />Cancel</> : <><Plus className="h-4 w-4 mr-1" />Add event</>}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={addEvent} className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-semibold">New event</p>
          <Input placeholder="Event title…" value={title} onChange={e => setTitle(e.target.value)} autoFocus required />
          <Input placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Date</p>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Time (optional)</p>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Color</p>
              <div className="flex gap-2">
                {EVENT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className="h-6 w-6 rounded-full transition-all"
                    style={{ backgroundColor: c, transform: color === c ? "scale(1.25)" : "scale(1)",
                      boxShadow: color === c ? `0 0 0 2px var(--background), 0 0 0 3.5px ${c}` : "none" }} />
                ))}
              </div>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none mt-4">
              <input type="checkbox" checked={important} onChange={e => setImportant(e.target.checked)}
                className="rounded accent-amber-400" />
              <Star className="h-3.5 w-3.5 text-amber-400" />
              Mark as important
            </label>
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save event"}
          </Button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
          <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium">No events yet</p>
          <p className="text-xs text-muted-foreground">Add reminders, deadlines, appointments</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([monthKey, monthEvents]) => (
            <div key={monthKey} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{monthLabel(monthKey)}</p>
              <div className="space-y-1.5">
                {monthEvents.map(ev => renderEventCard(ev))}
              </div>
            </div>
          ))}

          {past.length > 0 && (
            <details className="space-y-2">
              <summary className="text-xs font-semibold uppercase tracking-widest text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                Past ({past.length})
              </summary>
              <div className="space-y-1.5 mt-2">
                {past.slice(-10).reverse().map(ev => renderEventCard(ev, true))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
