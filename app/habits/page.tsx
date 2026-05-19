"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Flame, X, Trash2 } from "lucide-react";

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

type Habit = { id: number; name: string; color: string; frequency: string; targetDaysPerWeek: number };
type HabitLog = { habitId: number; date: string; completed: boolean };

const COLORS = [
  { value: "#f43f5e", label: "Rose"    },
  { value: "#8b5cf6", label: "Violet"  },
  { value: "#10b981", label: "Emerald" },
  { value: "#f59e0b", label: "Amber"   },
  { value: "#3b82f6", label: "Blue"    },
  { value: "#ec4899", label: "Pink"    },
  { value: "#06b6d4", label: "Cyan"    },
];

const FREQ_OPTIONS = [
  { value: "daily",   label: "Every day",       days: 7  },
  { value: "6x",      label: "6× per week",     days: 6  },
  { value: "5x",      label: "5× per week",     days: 5  },
  { value: "4x",      label: "4× per week",     days: 4  },
  { value: "3x",      label: "3× per week",     days: 3  },
  { value: "2x",      label: "2× per week",     days: 2  },
  { value: "weekly",  label: "Once a week",      days: 1  },
];

function computeStreak(logs: HabitLog[], habitId: number): number {
  const done = new Set(
    logs.filter((l) => l.habitId === habitId && l.completed).map((l) => l.date)
  );
  const startDate = done.has(today) ? today : dateMinusDays(today, 1);
  let streak = 0;
  let cursor = startDate;
  while (done.has(cursor)) {
    streak++;
    cursor = dateMinusDays(cursor, 1);
  }
  return streak;
}

export default function HabitsPage() {
  const [habits, setHabits]     = useState<Habit[]>([]);
  const [logs, setLogs]         = useState<HabitLog[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName]   = useState("");
  const [color, setColor]       = useState(COLORS[0].value);
  const [freqKey, setFreqKey]   = useState("daily");
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/habits")
      .then((r) => r.json())
      .then(async (h: Habit[]) => {
        setHabits(h);
        const allLogs = await Promise.all(
          h.map((habit) => fetch(`/api/habits/${habit.id}/log`).then((r) => r.json()))
        );
        setLogs(allLogs.flat());
        setLoading(false);
      });
  }, []);

  const todayDone = new Set(logs.filter((l) => l.date === today && l.completed).map((l) => l.habitId));

  async function toggle(habitId: number) {
    const isCompleted = todayDone.has(habitId);
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, completed: !isCompleted }),
    });
    setLogs((prev) => {
      const exists = prev.find((l) => l.habitId === habitId && l.date === today);
      if (exists) return prev.map((l) => l.habitId === habitId && l.date === today ? { ...l, completed: !isCompleted } : l);
      return [...prev, { habitId, date: today, completed: true }];
    });
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const freq = FREQ_OPTIONS.find((f) => f.value === freqKey)!;
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        color,
        frequency: freqKey === "daily" || freqKey === "weekly" ? freqKey : "weekly",
        targetDaysPerWeek: freq.days,
      }),
    });
    const habit = await res.json();
    setHabits((prev) => [...prev, habit]);
    setNewName("");
    setFreqKey("daily");
    setShowForm(false);
  }

  async function deleteHabit(habitId: number) {
    setDeleting(habitId);
    await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
    setHabits((prev) => prev.filter((h) => h.id !== habitId));
    setDeleting(null);
  }

  const doneCount = habits.filter((h) => todayDone.has(h.id)).length;
  const progress  = habits.length > 0 ? (doneCount / habits.length) * 100 : 0;

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {doneCount} of {habits.length} done today
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)} variant={showForm ? "secondary" : "default"}>
          {showForm ? <><X className="h-4 w-4 mr-1" />Cancel</> : <><Plus className="h-4 w-4 mr-1" />Add</>}
        </Button>
      </div>

      {/* Progress bar */}
      {habits.length > 0 && (
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{Math.round(progress)}% complete</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={addHabit} className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-sm font-semibold">New habit</p>
          <Input
            placeholder="e.g. Meditate, Read 20 mins, Walk..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
          />

          {/* Frequency */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Frequency</p>
            <div className="grid grid-cols-2 gap-1.5">
              {FREQ_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFreqKey(f.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    freqKey === f.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className="h-7 w-7 rounded-full transition-all duration-150"
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

      {/* Habit list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : habits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium">No habits yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add your first one above to start tracking streaks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => {
            const done   = todayDone.has(habit.id);
            const streak = computeStreak(logs, habit.id);
            const freqLabel = FREQ_OPTIONS.find((f) => f.days === habit.targetDaysPerWeek)?.label ?? "Daily";
            return (
              <div
                key={habit.id}
                className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                  done ? "bg-card/50 border-border/50 opacity-70" : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                }`}
              >
                {/* Check button */}
                <button
                  onClick={() => toggle(habit.id)}
                  className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
                  style={{
                    backgroundColor: done ? habit.color : `${habit.color}22`,
                    border: `2px solid ${habit.color}`,
                  }}
                >
                  {done && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                </button>

                {/* Name + freq */}
                <div className="flex-1 min-w-0" onClick={() => toggle(habit.id)}>
                  <p className={`text-sm font-medium truncate ${done ? "line-through text-muted-foreground" : ""}`}>
                    {habit.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{freqLabel}</p>
                </div>

                {/* Streak */}
                {streak > 0 && (
                  <Badge variant="secondary" className="gap-1 text-xs shrink-0" style={{ color: habit.color }}>
                    <Flame className="h-3 w-3" />
                    {streak}
                  </Badge>
                )}

                {/* Delete — visible on hover */}
                <button
                  onClick={() => deleteHabit(habit.id)}
                  disabled={deleting === habit.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 shrink-0"
                  aria-label="Delete habit"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
