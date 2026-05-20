"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Plus, Flame, X, Trash2, Pencil } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

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

function HabitAnalyticsPanel({ habits, logs }: { habits: Habit[]; logs: HabitLog[] }) {
  const [selected, setSelected] = useState<"all" | number>("all");

  const selectedHabit = typeof selected === "number" ? habits.find(h => h.id === selected) ?? null : null;

  // 30-day line data for "All" — daily aggregate completion %
  const allChartData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = dateMinusDays(today, 29 - i);
      const done = habits.filter(h =>
        logs.some(l => l.habitId === h.id && l.date === date && l.logStatus === "completed")
      ).length;
      return {
        d: date.slice(5).replace("-", "/"),
        pct: habits.length > 0 ? Math.round((done / habits.length) * 100) : 0,
      };
    });
  }, [habits, logs]);

  // All-habits aggregate stats (lifetime)
  const allStats = useMemo(() => {
    let completed = 0, skipped = 0, missed = 0;
    habits.forEach(h => {
      const s = computeStats(logs, h);
      completed += s.completed; skipped += s.skipped; missed += s.missed;
    });
    const total = completed + skipped + missed;
    return { completed, skipped, missed, total };
  }, [habits, logs]);

  // Single habit 30-day chart data (1 = done, 0 = not done)
  const singleChartData = useMemo(() => {
    if (!selectedHabit) return [];
    return Array.from({ length: 30 }, (_, i) => {
      const date = dateMinusDays(today, 29 - i);
      const log = logs.find(l => l.habitId === selectedHabit.id && l.date === date);
      return {
        d: date.slice(5).replace("-", "/"),
        v: log?.logStatus === "completed" ? 1 : 0,
        s: log?.logStatus ?? "missed",
      };
    });
  }, [selectedHabit, logs]);

  const singleStats = selectedHabit ? computeStats(logs, selectedHabit) : null;
  const singleStreak = selectedHabit ? computeStreak(logs, selectedHabit.id) : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Analytics</h2>

      {/* Switcher pills */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setSelected("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
            selected === "all"
              ? "bg-foreground text-background border-transparent"
              : "text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
          }`}
        >
          All
        </button>
        {habits.map(h => (
          <button key={h.id}
            onClick={() => setSelected(h.id)}
            style={selected === h.id
              ? { backgroundColor: h.color, color: "#fff", borderColor: "transparent" }
              : { borderColor: `${h.color}40`, color: h.color }
            }
            className="px-3 py-1 rounded-full text-xs font-medium border transition-all hover:opacity-90"
          >
            {h.name}
          </button>
        ))}
      </div>

      {selected === "all" ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-5">
          {/* Line chart */}
          <div>
            <p className="text-[11px] text-muted-foreground mb-3">Daily completion · last 30 days</p>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={allChartData}>
                <XAxis dataKey="d" tick={{ fontSize: 9 }} interval={6} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} unit="%" width={28} />
                <Tooltip formatter={(v) => [`${v}%`, "Completion"]}
                  contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                <Line type="monotone" dataKey="pct" stroke="#8b5cf6" dot={false} strokeWidth={2}
                  activeDot={{ r: 4, fill: "#8b5cf6" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Aggregate stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "completed", val: allStats.completed, color: "#10b981", bg: "bg-emerald-500/10" },
              { label: "skipped",   val: allStats.skipped,   color: "#f59e0b", bg: "bg-amber-500/10"  },
              { label: "missed",    val: allStats.missed,    color: "#f43f5e", bg: "bg-rose-500/10"   },
            ].map(({ label, val, color, bg }) => (
              <div key={label} className={`${bg} rounded-lg py-3 text-center`}>
                <p className="text-lg font-bold" style={{ color }}>{val}</p>
                <p className="text-[10px] mt-0.5" style={{ color: `${color}99` }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Stacked bar */}
          {allStats.total > 0 && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-emerald-500 rounded-l-full transition-all"
                  style={{ width: `${(allStats.completed / allStats.total) * 100}%` }} />
                <div className="h-full bg-amber-400 transition-all"
                  style={{ width: `${(allStats.skipped / allStats.total) * 100}%` }} />
                <div className="h-full bg-rose-500/50 rounded-r-full transition-all"
                  style={{ width: `${(allStats.missed / allStats.total) * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {Math.round((allStats.completed / allStats.total) * 100)}% overall completion across all habits
              </p>
            </div>
          )}
        </div>
      ) : selectedHabit && singleStats ? (
        <div className="rounded-xl border bg-card p-4 space-y-5"
          style={{ borderColor: `${selectedHabit.color}30` }}>
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedHabit.color }} />
            <p className="text-sm font-semibold flex-1 truncate">{selectedHabit.name}</p>
            {singleStreak > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: selectedHabit.color }}>
                <Flame className="h-3.5 w-3.5" /> {singleStreak}-day streak
              </span>
            )}
          </div>

          {/* 30-day dot grid */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Last 30 days</p>
            <Last30Dots logs={logs} habit={selectedHabit} />
            <div className="flex gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm inline-block" style={{ backgroundColor: selectedHabit.color }} />done
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm inline-block bg-amber-400" />skipped
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm inline-block bg-muted opacity-50" />missed
              </span>
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "completed", val: singleStats.completed, color: "#10b981", bg: "bg-emerald-500/10" },
              { label: "skipped",   val: singleStats.skipped,   color: "#f59e0b", bg: "bg-amber-500/10"  },
              { label: "missed",    val: singleStats.missed,    color: "#f43f5e", bg: "bg-rose-500/10"   },
            ].map(({ label, val, color, bg }) => (
              <div key={label} className={`${bg} rounded-lg py-2.5 text-center`}>
                <p className="text-lg font-bold" style={{ color }}>{val}</p>
                <p className="text-[10px] mt-0.5" style={{ color: `${color}99` }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Stacked bar */}
          {singleStats.total > 0 && (
            <div className="space-y-1">
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full rounded-l-full transition-all" style={{ backgroundColor: selectedHabit.color, width: `${(singleStats.completed / singleStats.total) * 100}%` }} />
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${(singleStats.skipped / singleStats.total) * 100}%` }} />
                <div className="h-full bg-rose-500/40 rounded-r-full transition-all" style={{ width: `${(singleStats.missed / singleStats.total) * 100}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {singleStats.completionRate}% completion · {singleStats.skipRate}% skipped
              </p>
            </div>
          )}
        </div>
      ) : null}
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
  const [editingHabit, setEditingHabit] = useState<number | null>(null);
  const [editName, setEditName]         = useState("");
  const [editBiggerGoal, setEditBiggerGoal] = useState("");
  const [editColor, setEditColor]       = useState(COLORS[0].value);
  const [editFreqKey, setEditFreqKey]   = useState("daily");
  const [editSaving, setEditSaving]     = useState(false);

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

  function startEdit(habit: Habit) {
    setEditName(habit.name);
    setEditBiggerGoal(habit.biggerGoal ?? "");
    setEditColor(habit.color);
    setEditFreqKey(FREQ_OPTIONS.find(f => f.days === habit.targetDaysPerWeek)?.value ?? "daily");
    setEditingHabit(habit.id);
  }

  async function saveHabit() {
    if (!editingHabit) return;
    setEditSaving(true);
    const freq = FREQ_OPTIONS.find(f => f.value === editFreqKey)!;
    const updated = await fetch(`/api/habits/${editingHabit}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName.trim() || "Habit",
        biggerGoal: editBiggerGoal.trim() || null,
        color: editColor,
        frequency: editFreqKey === "daily" || editFreqKey === "weekly" ? editFreqKey : "weekly",
        targetDaysPerWeek: freq.days,
      }),
    }).then(r => r.json());
    setHabits(prev => prev.map(h => h.id === editingHabit ? { ...h, ...updated } : h));
    setEditingHabit(null);
    setEditSaving(false);
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
              if (editingHabit === habit.id) {
                return (
                  <div key={habit.id} className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: editColor }} />
                        <p className="text-sm font-semibold">Edit habit</p>
                      </div>
                      <button onClick={() => setEditingHabit(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Bigger goal</p>
                      <Input value={editBiggerGoal} onChange={e => setEditBiggerGoal(e.target.value)} placeholder="e.g. Health, Mental clarity..." />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Habit name</p>
                      <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Meditate, Read 20 mins..." autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Frequency</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {FREQ_OPTIONS.map(f => (
                          <button key={f.value} type="button" onClick={() => setEditFreqKey(f.value)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              editFreqKey === f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
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
                          <button key={c.value} type="button" onClick={() => setEditColor(c.value)}
                            className="h-7 w-7 rounded-full transition-all"
                            style={{
                              backgroundColor: c.value,
                              transform: editColor === c.value ? "scale(1.2)" : "scale(1)",
                              boxShadow: editColor === c.value ? `0 0 0 2px var(--background), 0 0 0 4px ${c.value}` : "none",
                            }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveHabit} disabled={editSaving || !editName.trim()} className="flex-1">
                        {editSaving ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingHabit(null)}>Cancel</Button>
                    </div>
                  </div>
                );
              }

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

                  {/* Edit */}
                  <button onClick={() => startEdit(habit)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 transition-opacity"
                    aria-label="Edit habit">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

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
        <HabitAnalyticsPanel habits={habits} logs={logs} />
      )}
    </div>
  );
}
