"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, Flame, X, Trash2, BarChart2 } from "lucide-react";

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dateMinusDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const today = localToday();

type Habit = {
  id: number; name: string; biggerGoal: string | null;
  color: string; frequency: string; targetDaysPerWeek: number;
  createdAt: string;
};
type HabitLog = {
  habitId: number; date: string; completed: boolean; logStatus: string;
};

const COLORS = [
  { value: "#f43f5e", label: "Rose" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#10b981", label: "Emerald" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
];

const FREQ_OPTIONS = [
  { value: "daily",   label: "Every day",    days: 7 },
  { value: "6x",      label: "6× per week",  days: 6 },
  { value: "5x",      label: "5× per week",  days: 5 },
  { value: "4x",      label: "4× per week",  days: 4 },
  { value: "3x",      label: "3× per week",  days: 3 },
  { value: "2x",      label: "2× per week",  days: 2 },
  { value: "weekly",  label: "Once a week",  days: 1 },
];

function computeStreak(logs: HabitLog[], habitId: number): number {
  const done = new Set(logs.filter(l => l.habitId === habitId && l.completed).map(l => l.date));
  const start = done.has(today) ? today : dateMinusDays(today, 1);
  let streak = 0, cursor = start;
  while (done.has(cursor)) { streak++; cursor = dateMinusDays(cursor, 1); }
  return streak;
}

function computeStats(logs: HabitLog[], habit: Habit) {
  const habitLogs = logs.filter(l => l.habitId === habit.id);
  const logMap = new Map(habitLogs.map(l => [l.date, l]));

  const createdDate = new Date(habit.createdAt);
  const todayDate = new Date(today + "T12:00:00");
  const daysSinceCreation = Math.max(0, Math.floor((todayDate.getTime() - createdDate.getTime()) / 86400000));

  let completed = 0, skipped = 0, missed = 0;
  // Count past days (not today)
  for (let i = 1; i <= daysSinceCreation; i++) {
    const date = dateMinusDays(today, i);
    const log = logMap.get(date);
    if (!log) missed++;
    else if (log.logStatus === "skipped") skipped++;
    else completed++;
  }
  // Count today if logged
  const todayLog = logMap.get(today);
  if (todayLog) {
    if (todayLog.logStatus === "skipped") skipped++;
    else completed++;
  }

  const total = completed + skipped + missed;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const skipRate = total > 0 ? Math.round((skipped / total) * 100) : 0;
  return { completed, skipped, missed, total, completionRate, skipRate };
}

function Last30Dots({ logs, habit }: { logs: HabitLog[]; habit: Habit }) {
  const logMap = new Map(logs.filter(l => l.habitId === habit.id).map(l => [l.date, l]));
  return (
    <div className="flex gap-[3px] flex-wrap">
      {Array.from({ length: 30 }, (_, i) => {
        const date = dateMinusDays(today, 29 - i);
        const log = logMap.get(date);
        const status = !log ? "missed" : log.logStatus === "skipped" ? "skipped" : "done";
        return (
          <div key={date} title={`${date}: ${status}`}
            className="h-3 w-3 rounded-sm transition-all"
            style={{
              backgroundColor:
                status === "done" ? habit.color :
                status === "skipped" ? "#f59e0b" :
                "var(--muted)",
              opacity: status === "missed" ? 0.35 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

export default function HabitsPage() {
  const [habits, setHabits]         = useState<Habit[]>([]);
  const [logs, setLogs]             = useState<HabitLog[]>([]);
  const [showForm, setShowForm]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [biggerGoal, setBiggerGoal] = useState("");
  const [color, setColor]           = useState(COLORS[0].value);
  const [freqKey, setFreqKey]       = useState("daily");
  const [loading, setLoading]       = useState(true);
  const [deleting, setDeleting]     = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/habits")
      .then(r => r.json())
      .then(async (h: Habit[]) => {
        setHabits(h);
        const allLogs = await Promise.all(
          h.map(habit => fetch(`/api/habits/${habit.id}/log`).then(r => r.json()))
        );
        setLogs(allLogs.flat());
        setLoading(false);
      });
  }, []);

  const todayLogMap = useMemo(() => {
    const map = new Map<number, HabitLog>();
    logs.filter(l => l.date === today).forEach(l => map.set(l.habitId, l));
    return map;
  }, [logs]);

  const doneCount = habits.filter(h => todayLogMap.get(h.id)?.logStatus === "completed").length;
  const progress = habits.length > 0 ? (doneCount / habits.length) * 100 : 0;

  async function logHabit(habitId: number, status: "completed" | "skipped") {
    const completed = status === "completed";
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, completed, logStatus: status }),
    });
    setLogs(prev => {
      const entry: HabitLog = { habitId, date: today, completed, logStatus: status };
      const exists = prev.find(l => l.habitId === habitId && l.date === today);
      return exists
        ? prev.map(l => l.habitId === habitId && l.date === today ? entry : l)
        : [...prev, entry];
    });
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const freq = FREQ_OPTIONS.find(f => f.value === freqKey)!;
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        biggerGoal: biggerGoal.trim() || null,
        color,
        frequency: freqKey === "daily" || freqKey === "weekly" ? freqKey : "weekly",
        targetDaysPerWeek: freq.days,
      }),
    });
    const habit = await res.json();
    setHabits(prev => [...prev, habit]);
    setNewName(""); setBiggerGoal(""); setFreqKey("daily");
    setShowForm(false);
  }

  async function deleteHabit(habitId: number) {
    setDeleting(habitId);
    await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
    setHabits(prev => prev.filter(h => h.id !== habitId));
    setDeleting(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {doneCount} of {habits.length} done today
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(s => !s)} variant={showForm ? "secondary" : "default"}>
          {showForm ? <><X className="h-4 w-4 mr-1" />Cancel</> : <><Plus className="h-4 w-4 mr-1" />Add</>}
        </Button>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}% complete today</span>
            <span>{habits.length - doneCount} remaining</span>
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={addHabit} className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-semibold">New habit</p>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Bigger goal</p>
            <Input placeholder="e.g. Health, Mental clarity..." value={biggerGoal} onChange={e => setBiggerGoal(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Habit name</p>
            <Input placeholder="e.g. Meditate, Read 20 mins..." value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Frequency</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FREQ_OPTIONS.map(f => (
                <button key={f.value} type="button" onClick={() => setFreqKey(f.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    freqKey === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c.value} type="button" onClick={() => setColor(c.value)}
                  className="h-7 w-7 rounded-full transition-all"
                  style={{
                    backgroundColor: c.value,
                    transform: color === c.value ? "scale(1.2)" : "scale(1)",
                    boxShadow: color === c.value ? `0 0 0 2px var(--background), 0 0 0 4px ${c.value}` : "none",
                  }}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>
          <Button type="submit" size="sm" className="w-full">Save habit</Button>
        </form>
      )}

      {/* ── Today's checklist ── */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Today&apos;s check-in
        </h2>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : habits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm font-medium">No habits yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first one above to start tracking</p>
          </div>
        ) : (
          <div className="space-y-2">
            {habits.map(habit => {
              const todayLog = todayLogMap.get(habit.id);
              const isDone = todayLog?.logStatus === "completed";
              const isSkipped = todayLog?.logStatus === "skipped";
              const streak = computeStreak(logs, habit.id);
              const freqLabel = FREQ_OPTIONS.find(f => f.days === habit.targetDaysPerWeek)?.label ?? "Daily";

              return (
                <div key={habit.id}
                  className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                    isDone ? "bg-card/50 border-border/40 opacity-75" :
                    isSkipped ? "bg-card/30 border-border/30 opacity-55" :
                    "bg-card border-border"
                  }`}
                >
                  {/* Color indicator */}
                  <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />

                  {/* Name + freq */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDone ? "line-through text-muted-foreground" : isSkipped ? "text-muted-foreground" : ""}`}>
                      {habit.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {habit.biggerGoal ? `${habit.biggerGoal} · ` : ""}{freqLabel}
                    </p>
                  </div>

                  {/* Streak */}
                  {streak > 0 && (
                    <span className="shrink-0 flex items-center gap-0.5 text-xs font-medium" style={{ color: habit.color }}>
                      <Flame className="h-3 w-3" />{streak}
                    </span>
                  )}

                  {/* Actions */}
                  {isDone || isSkipped ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isDone ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {isDone ? "✓ Done" : "✗ Skipped"}
                      </span>
                      <button onClick={() => logHabit(habit.id, isDone ? "skipped" : "completed")}
                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline">
                        undo
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => logHabit(habit.id, "completed")}
                        className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all hover:-translate-y-0.5 active:translate-y-0"
                        style={{ backgroundColor: `${habit.color}20`, color: habit.color, border: `1px solid ${habit.color}40` }}>
                        <Check className="h-3.5 w-3.5" /> Done
                      </button>
                      <button onClick={() => logHabit(habit.id, "skipped")}
                        className="h-8 px-3 rounded-lg text-xs font-medium text-muted-foreground border border-border hover:border-amber-400/50 hover:text-amber-400 transition-all hover:-translate-y-0.5 active:translate-y-0">
                        Skip
                      </button>
                    </div>
                  )}

                  {/* Delete */}
                  <button onClick={() => deleteHabit(habit.id)} disabled={deleting === habit.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 shrink-0 transition-opacity"
                    aria-label="Delete habit">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Analytics ── */}
      {!loading && habits.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Analytics</h2>
          </div>

          <div className="space-y-3">
            {habits.map(habit => {
              const stats = computeStats(logs, habit);
              const streak = computeStreak(logs, habit.id);
              const freqLabel = FREQ_OPTIONS.find(f => f.days === habit.targetDaysPerWeek)?.label ?? "Daily";

              return (
                <div key={habit.id} className="rounded-xl border border-border bg-card p-4 space-y-4">

                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: habit.color }} />
                    <p className="text-sm font-semibold flex-1 min-w-0 truncate">{habit.name}</p>
                    {habit.biggerGoal && (
                      <span className="text-[11px] text-muted-foreground truncate max-w-[120px]">{habit.biggerGoal}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground shrink-0">{freqLabel}</span>
                  </div>

                  {/* Stat boxes */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center rounded-lg py-2.5 bg-emerald-500/10">
                      <p className="text-lg font-bold text-emerald-400">{stats.completed}</p>
                      <p className="text-[10px] text-emerald-400/70 mt-0.5">completed</p>
                    </div>
                    <div className="text-center rounded-lg py-2.5 bg-amber-500/10">
                      <p className="text-lg font-bold text-amber-400">{stats.skipped}</p>
                      <p className="text-[10px] text-amber-400/70 mt-0.5">skipped</p>
                    </div>
                    <div className="text-center rounded-lg py-2.5 bg-rose-500/10">
                      <p className="text-lg font-bold text-rose-400">{stats.missed}</p>
                      <p className="text-[10px] text-rose-400/70 mt-0.5">missed</p>
                    </div>
                  </div>

                  {/* Stacked completion bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{stats.completionRate}% completion · {stats.skipRate}% skipped</span>
                      {streak > 0 && (
                        <span className="flex items-center gap-0.5 font-medium" style={{ color: habit.color }}>
                          <Flame className="h-3 w-3" /> {streak}-day streak
                        </span>
                      )}
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                      {stats.total > 0 && <>
                        <div className="h-full bg-emerald-500 transition-all rounded-l-full"
                          style={{ width: `${(stats.completed / stats.total) * 100}%` }} />
                        <div className="h-full bg-amber-400 transition-all"
                          style={{ width: `${(stats.skipped / stats.total) * 100}%` }} />
                        <div className="h-full bg-rose-500/40 transition-all rounded-r-full"
                          style={{ width: `${(stats.missed / stats.total) * 100}%` }} />
                      </>}
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />done</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />skipped</span>
                      <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500/40 inline-block" />missed</span>
                    </div>
                  </div>

                  {/* 30-day dot history */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last 30 days</p>
                    <Last30Dots logs={logs} habit={habit} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
