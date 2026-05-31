"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Trash2, Clock, CalendarDays, Pencil, Check, ChevronLeft, ChevronRight } from "lucide-react";

type CalEvent = {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string | null;
  color: string;
};

const EVENT_COLORS = [
  "#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatDateFull(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function groupByMonth(events: CalEvent[]): Record<string, CalEvent[]> {
  const g: Record<string, CalEvent[]> = {};
  for (const e of events) {
    const k = e.date.slice(0, 7);
    if (!g[k]) g[k] = [];
    g[k].push(e);
  }
  return g;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function autoPickColor(existing: CalEvent[]): string {
  const used = new Set(existing.map(e => e.color));
  return EVENT_COLORS.find(c => !used.has(c)) ?? EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)];
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso + "T00:00:00").getTime() - new Date(localToday() + "T00:00:00").getTime()) / 86400000);
}

function tickerLabel(d: number): string {
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d < 0) return `${Math.abs(d)}d ago`;
  return `D-${d}`;
}

function buildGridRows(year: number, month: number): string[][] {
  const first = new Date(year, month - 1, 1);
  const dow = first.getDay();
  const back = dow === 0 ? 6 : dow - 1;
  const start = new Date(first);
  start.setDate(1 - back);
  const rows: string[][] = [];
  const cur = new Date(start);
  for (let r = 0; r < 6; r++) {
    const row: string[] = [];
    for (let c = 0; c < 7; c++) { row.push(toIso(cur)); cur.setDate(cur.getDate() + 1); }
    rows.push(row);
  }
  // Drop last row if all out-of-month
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  if (rows[5].every(d => d.slice(0, 7) !== monthStr)) rows.pop();
  return rows;
}

export default function CalendarPage() {
  const [events, setEvents]           = useState<CalEvent[]>([]);
  const [loading, setLoading]         = useState(true);
  const [view, setView]               = useState<"calendar" | "list">("calendar");
  const [showForm, setShowForm]       = useState(false);
  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate]               = useState(localToday());
  const [time, setTime]               = useState("");
  const [color, setColor]             = useState(EVENT_COLORS[0]);
  const [saving, setSaving]           = useState(false);

  // Calendar grid state
  const [gridMonthStr, setGridMonthStr] = useState(() => localToday().slice(0, 7));
  const [selectedDay, setSelectedDay]   = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId]             = useState<number | null>(null);
  const [editTitle, setEditTitle]             = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate]               = useState("");
  const [editTime, setEditTime]               = useState("");
  const [editColor, setEditColor]             = useState(EVENT_COLORS[0]);
  const [editSaving, setEditSaving]           = useState(false);

  useEffect(() => {
    fetch("/api/calendar").then(r => r.json()).then(data => {
      setEvents(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  function openForm() {
    setColor(autoPickColor(events));
    setShowForm(true);
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setSaving(true);
    const res = await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), description: description.trim() || null, date, time: time || null, color }),
    });
    const created = await res.json();
    setEvents(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
    setTitle(""); setDescription(""); setDate(localToday()); setTime("");
    setSaving(false); setShowForm(false);
  }

  function startEdit(ev: CalEvent) {
    setEditingId(ev.id);
    setEditTitle(ev.title);
    setEditDescription(ev.description ?? "");
    setEditDate(ev.date);
    setEditTime(ev.time ?? "");
    setEditColor(ev.color);
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim() || !editDate) return;
    setEditSaving(true);
    const res = await fetch(`/api/calendar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() || null, date: editDate, time: editTime || null, color: editColor }),
    });
    const updated = await res.json();
    setEvents(prev => prev.map(e => e.id === id ? updated : e).sort((a, b) => a.date.localeCompare(b.date)));
    setEditingId(null);
    setEditSaving(false);
  }

  async function deleteEvent(id: number) {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    setEvents(prev => prev.filter(e => e.id !== id));
    if (editingId === id) setEditingId(null);
  }

  const today    = localToday();
  const upcoming = events.filter(e => e.date >= today);
  const past     = events.filter(e => e.date < today);
  const grouped  = groupByMonth(upcoming);

  const [gridY, gridM] = gridMonthStr.split("-").map(Number);
  const gridRows = useMemo(() => buildGridRows(gridY, gridM), [gridY, gridM]);
  const eventByDate = useMemo(() => {
    const m: Record<string, CalEvent[]> = {};
    for (const ev of events) { if (!m[ev.date]) m[ev.date] = []; m[ev.date].push(ev); }
    return m;
  }, [events]);
  const selectedDayEvents = selectedDay ? (eventByDate[selectedDay] ?? []) : [];

  function prevGridMonth() {
    const d = new Date(gridY, gridM - 2, 1);
    setGridMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDay(null);
  }
  function nextGridMonth() {
    const d = new Date(gridY, gridM, 1);
    setGridMonthStr(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDay(null);
  }

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
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium">Color</p>
            <div className="flex gap-2">
              {EVENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setEditColor(c)}
                  className="h-5 w-5 rounded-full transition-all shrink-0"
                  style={{ backgroundColor: c, transform: editColor === c ? "scale(1.3)" : "scale(1)",
                    boxShadow: editColor === c ? `0 0 0 2px var(--background), 0 0 0 3px ${c}` : "none" }} />
              ))}
            </div>
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
    const urgent = d >= 0 && d <= 7;

    return (
      <div key={ev.id}
        className={`group flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-all ${dim ? "opacity-50" : ""}`}>
        <div className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ev.color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-medium ${dim ? "line-through" : ""}`}>{ev.title}</p>
            {!dim && (
              <span className="text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full border shrink-0 transition-all"
                style={urgent
                  ? { color: ev.color, borderColor: ev.color + "55", backgroundColor: ev.color + "18" }
                  : { color: "var(--muted-foreground)", borderColor: "var(--border)", backgroundColor: "transparent" }
                }>
                {tickerLabel(d)}
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
        <div className="flex gap-0.5 shrink-0">
          {!dim && (
            <button onClick={() => startEdit(ev)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={() => deleteEvent(ev.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{upcoming.length} upcoming</p>
        </div>
        <Button size="sm" onClick={() => { if (showForm) setShowForm(false); else openForm(); }}
          variant={showForm ? "secondary" : "default"}>
          {showForm ? <><X className="h-4 w-4 mr-1" />Cancel</> : <><Plus className="h-4 w-4 mr-1" />Add event</>}
        </Button>
      </div>

      {/* Add form — no color picker, auto-assigned */}
      {showForm && (
        <form onSubmit={addEvent} className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <p className="text-sm font-semibold">New event</p>
          </div>
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
          <Button type="submit" size="sm" className="w-full" disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save event"}
          </Button>
        </form>
      )}

      {/* View toggle */}
      <div className="flex bg-muted/60 rounded-xl p-1 gap-1">
        {(["calendar", "list"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 ${
              view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {v === "calendar" ? <><CalendarDays className="h-3.5 w-3.5" />Calendar</> : "List"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse"/>)}</div>
      ) : view === "calendar" ? (

        /* ── Calendar grid view ── */
        <div className="space-y-4">

          {/* Month navigator */}
          <div className="flex items-center gap-3">
            <button onClick={prevGridMonth}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 text-center">
              <p className="text-base font-bold">
                {new Date(gridY, gridM - 1, 1).toLocaleDateString("en-US", { month: "long" })}
                <span className="text-muted-foreground text-sm font-normal ml-2">{gridY}</span>
              </p>
            </div>
            <button onClick={nextGridMonth}
              className="h-9 w-9 flex items-center justify-center rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground shrink-0">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Grid */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {DAY_LABELS.map(d => (
                <div key={d} className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground border-r last:border-r-0 border-border/40">
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            {gridRows.map((row, ri) => (
              <div key={ri} className={`grid grid-cols-7 ${ri < gridRows.length - 1 ? "border-b border-border/40" : ""}`}>
                {row.map((cellIso, ci) => {
                  const inMonth  = cellIso.slice(0, 7) === gridMonthStr;
                  const isToday  = cellIso === today;
                  const isPast   = cellIso < today;
                  const isSel    = cellIso === selectedDay;
                  const dayNum   = parseInt(cellIso.slice(8));
                  const dayEvs   = eventByDate[cellIso] ?? [];
                  const hasEvs   = dayEvs.length > 0;

                  return (
                    <div key={cellIso} onClick={() => setSelectedDay(isSel ? null : cellIso)}
                      className={`relative min-h-[60px] sm:min-h-[72px] p-1.5 cursor-pointer transition-colors select-none
                        ${ci < 6 ? "border-r border-border/30" : ""}
                        ${isSel ? "bg-primary/5" : "hover:bg-muted/30"}
                        ${!inMonth || isPast ? "opacity-35" : ""}
                      `}>
                      {/* Day number */}
                      <div className="flex justify-center mb-1">
                        {isToday ? (
                          <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            {dayNum}
                          </span>
                        ) : (
                          <span className={`text-[11px] font-medium leading-none ${inMonth ? "text-foreground" : "text-muted-foreground"}`}>
                            {dayNum}
                          </span>
                        )}
                      </div>

                      {/* Event bars */}
                      {hasEvs && (
                        <div className="space-y-px">
                          {dayEvs.slice(0, 3).map(ev => (
                            <div key={ev.id} className="h-1 rounded-full w-full"
                              style={{ backgroundColor: ev.color }} />
                          ))}
                          {dayEvs.length > 3 && (
                            <p className="text-[8px] text-center text-muted-foreground tabular-nums">+{dayEvs.length - 3}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Selected day panel */}
          {selectedDay && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">{formatDateFull(selectedDay)}</p>
                <button onClick={() => setSelectedDay(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {selectedDayEvents.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-muted-foreground">No events — add one above.</p>
                </div>
              ) : (
                <div className="p-3 space-y-1.5">
                  {selectedDayEvents.map(ev => renderEventCard(ev))}
                </div>
              )}
            </div>
          )}

          {events.length === 0 && !selectedDay && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-2">
              <CalendarDays className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-medium">No events yet</p>
              <p className="text-xs text-muted-foreground">Tap + Add event to get started</p>
            </div>
          )}
        </div>

      ) : (

        /* ── List view ── */
        events.length === 0 ? (
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
        )
      )}
    </div>
  );
}
