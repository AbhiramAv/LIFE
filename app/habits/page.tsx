"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Check, Plus, Flame } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

type Habit = {
  id: number;
  name: string;
  color: string;
  frequency: string;
  targetDaysPerWeek: number;
};

type HabitLog = {
  habitId: number;
  date: string;
  completed: boolean;
};

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444"];

function computeStreak(logs: HabitLog[], habitId: number): number {
  const doneDates = new Set(
    logs.filter((l) => l.habitId === habitId && l.completed).map((l) => l.date)
  );
  let streak = 0;
  const d = new Date(today);
  while (true) {
    const key = d.toISOString().split("T")[0];
    if (doneDates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/habits").then((r) => r.json()),
    ]).then(([h]) => {
      setHabits(h);
      // Fetch logs for all habits
      return Promise.all(
        h.map((habit: Habit) =>
          fetch(`/api/habits/${habit.id}/log`).then((r) => r.json())
        )
      );
    }).then((allLogs) => {
      setLogs(allLogs.flat());
      setLoading(false);
    });
  }, []);

  const todayLogs = new Set(
    logs.filter((l) => l.date === today && l.completed).map((l) => l.habitId)
  );

  async function toggleHabit(habitId: number) {
    const isCompleted = todayLogs.has(habitId);
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, completed: !isCompleted }),
    });

    setLogs((prev) => {
      const existing = prev.find((l) => l.habitId === habitId && l.date === today);
      if (existing) {
        return prev.map((l) =>
          l.habitId === habitId && l.date === today ? { ...l, completed: !isCompleted } : l
        );
      }
      return [...prev, { habitId, date: today, completed: true }];
    });
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: selectedColor }),
    });
    const habit = await res.json();
    setHabits((prev) => [...prev, habit]);
    setNewName("");
    setShowForm(false);
  }

  const doneCount = habits.filter((h) => todayLogs.has(h.id)).length;

  return (
    <div className="max-w-lg mx-auto p-4 pt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Habits</h1>
          <p className="text-sm text-muted-foreground">
            {doneCount}/{habits.length} done today
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={addHabit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="habit-name">Habit name</Label>
                <Input
                  id="habit-name"
                  placeholder="e.g. Meditate, Read, Walk..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`h-6 w-6 rounded-full transition-transform ${selectedColor === c ? "scale-125 ring-2 ring-offset-2 ring-ring" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" className="flex-1">Save</Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Loading...</div>
      ) : habits.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p>No habits yet.</p>
          <p className="text-sm">Add your first one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => {
            const done = todayLogs.has(habit.id);
            const streak = computeStreak(logs, habit.id);
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  done
                    ? "bg-muted border-transparent opacity-75"
                    : "bg-card border-border hover:border-primary/50"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    done ? "opacity-100" : "opacity-30"
                  }`}
                  style={{ backgroundColor: habit.color }}
                >
                  {done && <Check className="h-4 w-4 text-white" />}
                </div>
                <span className={`flex-1 font-medium ${done ? "line-through text-muted-foreground" : ""}`}>
                  {habit.name}
                </span>
                {streak > 0 && (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {streak}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
