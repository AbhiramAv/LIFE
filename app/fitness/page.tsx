"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dumbbell, TrendingUp, Activity, X, Check, Loader2,
  ChevronDown, Timer, Search, RotateCcw, Plus, ChevronLeft, ChevronRight, Pencil,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────

type ExRow   = { id: number; name: string; category: string; muscleGroups: string };
type SetEntry = { id: number; setNumber: number; reps: number; weightKg: number; rpe: number | null };
type ExBlock  = { exerciseId: number; name: string; category: string; sets: SetEntry[]; targetReps: number };
type Session  = { id: number; date: string; durationMins: number | null };
type ProgressPt = { date: string; maxWeight: number; max1RM: number; volume: number };
type MuscleFreq = { category: string; muscles: string[]; sessions: number; sets: number };

type PlannedEx = {
  id: number; exerciseId: number; targetSets: number; targetReps: number; sortOrder: number;
  name: string; category: string;
};
type PlannedWorkout = { id: number; dayOfWeek: number; name: string | null; exercises: PlannedEx[] };
type Plan = { id: number; weekStart: string; workouts: PlannedWorkout[] };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const CATS = ["push", "pull", "legs", "core", "cardio", "other"] as const;
const CAT_COLOR: Record<string, string> = {
  push: "#10b981", pull: "#0ea5e9", legs: "#8b5cf6",
  core: "#f59e0b", cardio: "#f43f5e", other: "#6b7280",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDuration(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtWeekRange(monday: string) {
  const start = new Date(monday + "T00:00:00");
  const end   = new Date(monday + "T00:00:00");
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0"
      style={{ backgroundColor: `${CAT_COLOR[cat]}20`, color: CAT_COLOR[cat] }}>
      {cat}
    </span>
  );
}

// ── Stepper ────────────────────────────────────────────────────────────────────

function Stepper({ value, onChange, step = 1, min = 0, placeholder, unit }: {
  value: string; onChange: (v: string) => void;
  step?: number; min?: number; placeholder?: string; unit?: string;
}) {
  function adjust(delta: number) {
    const n = parseFloat(value) || 0;
    onChange(String(Math.max(min, Math.round((n + delta) * 100) / 100)));
  }
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => adjust(-step)}
        className="h-9 w-9 rounded-lg border border-border bg-muted/40 text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center shrink-0">
        −
      </button>
      <div className="relative flex-1">
        <input type="number" value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full h-9 rounded-lg border border-border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring pr-7" />
        {unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
      </div>
      <button onClick={() => adjust(step)}
        className="h-9 w-9 rounded-lg border border-border bg-muted/40 text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center shrink-0">
        +
      </button>
    </div>
  );
}

// ── Exercise picker ────────────────────────────────────────────────────────────

function ExercisePicker({ all, added, onAdd, onClose }: {
  all: ExRow[]; added: number[]; onAdd: (e: ExRow) => void; onClose?: () => void;
}) {
  const [cat, setCat] = useState("");
  const [q, setQ]     = useState("");
  const visible = all
    .filter(e => !added.includes(e.id))
    .filter(e => !cat || e.category === cat)
    .filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Exercise</p>
          {onClose && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search exercises…" className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["", ...CATS].map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize transition-colors ${
                cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              {c || "all"}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-44 overflow-y-auto divide-y divide-border/50">
        {visible.length === 0
          ? <p className="text-xs text-muted-foreground text-center py-4">No exercises found</p>
          : visible.map(ex => (
            <button key={ex.id} onClick={() => { onAdd(ex); setQ(""); }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-muted/60 transition-colors text-left">
              <span className="text-sm">{ex.name}</span>
              <CategoryBadge cat={ex.category} />
            </button>
          ))
        }
      </div>
    </div>
  );
}

// ── Exercise block (during workout execution) ──────────────────────────────────

function ExerciseBlock({ block, sessionId, prevWeight, onSetsChange, onRemove }: {
  block: ExBlock; sessionId: number; prevWeight: number | null;
  onSetsChange: (exerciseId: number, sets: SetEntry[]) => void;
  onRemove: (exerciseId: number) => void;
}) {
  const lastSet = block.sets[block.sets.length - 1];
  const [weight, setWeight] = useState(lastSet ? String(lastSet.weightKg) : prevWeight ? String(prevWeight) : "");
  const [reps, setReps]     = useState(String(block.targetReps));
  const [saving, setSaving] = useState(false);

  const targetSetsRemaining = 3 - block.sets.length; // visual hint

  async function logSet(w: string, r: string) {
    const weightKg = parseFloat(w);
    const repsN    = parseInt(r);
    if (isNaN(weightKg) || isNaN(repsN) || repsN < 1 || weightKg < 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/fitness/sessions/${sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: block.exerciseId, reps: repsN, weightKg }),
      });
      if (!res.ok) return;
      const set: SetEntry = await res.json();
      onSetsChange(block.exerciseId, [...block.sets, set]);
      setReps(String(block.targetReps)); // reset reps to target
    } finally {
      setSaving(false);
    }
  }

  async function sameAsLast() {
    if (!lastSet) return;
    await logSet(String(lastSet.weightKg), String(lastSet.reps));
  }

  async function removeSet(setId: number) {
    await fetch(`/api/fitness/sets/${setId}`, { method: "DELETE" });
    onSetsChange(block.exerciseId, block.sets.filter(s => s.id !== setId));
  }

  const canLog = !!weight && !!reps && !saving;
  const allSetsLogged = block.sets.length >= 3;

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-colors ${allSetsLogged ? "border-emerald-500/40" : "border-border"}`}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm">{block.name}</span>
          <span className="ml-2 text-[11px] text-muted-foreground">
            {block.sets.length}/3 sets
            {targetSetsRemaining > 0 && !allSetsLogged && <span className="text-amber-400"> · {targetSetsRemaining} left</span>}
            {allSetsLogged && <span className="text-emerald-400"> · done</span>}
          </span>
        </div>
        <CategoryBadge cat={block.category} />
        <button onClick={() => onRemove(block.exerciseId)}
          className="text-muted-foreground hover:text-rose-400 transition-colors ml-1">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {block.sets.length > 0 && (
        <div className="px-4 py-2 space-y-0.5">
          {block.sets.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-1 text-sm group">
              <span className="w-4 text-xs text-muted-foreground tabular-nums">{s.setNumber}</span>
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="flex-1 font-medium tabular-nums">{s.weightKg}kg × {s.reps}</span>
              <button onClick={() => removeSet(s.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 transition-all">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!allSetsLogged && (
        <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Weight</p>
              <Stepper value={weight} onChange={setWeight} step={2.5} min={0} placeholder="kg" unit="kg" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Reps</p>
              <Stepper value={reps} onChange={setReps} step={1} min={1} placeholder="reps" />
            </div>
          </div>
          <div className="flex gap-2">
            {lastSet && (
              <button onClick={sameAsLast} disabled={saving}
                className="flex-1 h-9 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" /> Same
              </button>
            )}
            <button onClick={() => logSet(weight, reps)} disabled={!canLog}
              className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                canLog ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" />Log Set</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Active workout execution ────────────────────────────────────────────────────

function ActiveSession({ sessionId, date, startedAt, allExercises, initialBlocks, onFinish, onDiscard }: {
  sessionId: number; date: string; startedAt: number;
  allExercises: ExRow[];
  initialBlocks: ExBlock[];
  onFinish: (durationMins: number) => void;
  onDiscard: () => void;
}) {
  const [blocks, setBlocks]       = useState<ExBlock[]>(initialBlocks);
  const [elapsed, setElapsed]     = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [prevWeights, setPrevWeights] = useState<Record<number, number>>({});

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  // Fetch prev weight for each initial exercise
  useEffect(() => {
    initialBlocks.forEach(b => {
      fetch(`/api/fitness/progress?exerciseId=${b.exerciseId}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            const last = data[data.length - 1];
            setPrevWeights(p => ({ ...p, [b.exerciseId]: last.maxWeight }));
          }
        }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addExercise(ex: ExRow) {
    if (blocks.find(b => b.exerciseId === ex.id)) return;
    setBlocks(prev => [...prev, { exerciseId: ex.id, name: ex.name, category: ex.category, sets: [], targetReps: 12 }]);
    fetch(`/api/fitness/progress?exerciseId=${ex.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0)
          setPrevWeights(p => ({ ...p, [ex.id]: data[data.length - 1].maxWeight }));
      }).catch(() => {});
    setShowPicker(false);
  }

  function updateSets(exerciseId: number, sets: SetEntry[]) {
    setBlocks(prev => prev.map(b => b.exerciseId === exerciseId ? { ...b, sets } : b));
  }

  function removeBlock(exerciseId: number) {
    setBlocks(prev => prev.filter(b => b.exerciseId !== exerciseId));
  }

  async function finish() {
    setFinishing(true);
    const durationMins = Math.max(1, Math.floor(elapsed / 60));
    await fetch(`/api/fitness/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ durationMins }),
    });
    onFinish(durationMins);
  }

  async function discard() {
    await fetch(`/api/fitness/sessions/${sessionId}`, { method: "DELETE" });
    onDiscard();
  }

  const totalSets  = blocks.reduce((s, b) => s + b.sets.length, 0);
  const totalTarget = blocks.length * 3;
  const allDone    = totalTarget > 0 && totalSets >= totalTarget;

  return (
    <div className="space-y-4">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 rounded-xl border border-border bg-card/95 backdrop-blur px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold">{fmtDate(date)}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
              <Timer className="h-3 w-3" />{fmtDuration(elapsed)}
            </span>
            {totalTarget > 0 && (
              <span className="text-xs text-muted-foreground">{totalSets}/{totalTarget} sets</span>
            )}
          </div>
        </div>
        <button onClick={discard} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors px-2 py-1">
          Discard
        </button>
        <Button size="sm" onClick={finish} disabled={finishing || totalSets === 0}>
          {finishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />{allDone ? "Finish" : "Finish Early"}</>}
        </Button>
      </div>

      {blocks.map(block => (
        <ExerciseBlock
          key={block.exerciseId}
          block={block}
          sessionId={sessionId}
          prevWeight={prevWeights[block.exerciseId] ?? null}
          onSetsChange={updateSets}
          onRemove={removeBlock}
        />
      ))}

      {showPicker
        ? <ExercisePicker all={allExercises} added={blocks.map(b => b.exerciseId)} onAdd={addExercise} onClose={() => setShowPicker(false)} />
        : (
          <button onClick={() => setShowPicker(true)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
            <Plus className="h-4 w-4" /> Add Exercise
          </button>
        )
      }
    </div>
  );
}

// ── Day plan editor ────────────────────────────────────────────────────────────

function DayEditor({ workout, allExercises, planId, onWorkoutUpdated, onWorkoutDeleted, onClose }: {
  workout: PlannedWorkout;
  allExercises: ExRow[];
  planId: number;
  onWorkoutUpdated: (w: PlannedWorkout) => void;
  onWorkoutDeleted: () => void;
  onClose: () => void;
}) {
  const [exercises, setExercises] = useState<PlannedEx[]>(workout.exercises);
  const [showPicker, setShowPicker] = useState(false);
  const [savingEx, setSavingEx]   = useState(false);

  async function addExercise(ex: ExRow) {
    setSavingEx(true);
    setShowPicker(false);
    try {
      const res = await fetch(`/api/fitness/planned-workouts/${workout.id}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: ex.id }),
      });
      if (!res.ok) return;
      const pe: PlannedEx = await res.json();
      const next = [...exercises, pe];
      setExercises(next);
      onWorkoutUpdated({ ...workout, exercises: next });
    } finally {
      setSavingEx(false);
    }
  }

  async function removeExercise(peId: number) {
    await fetch(`/api/fitness/planned-exercises/${peId}`, { method: "DELETE" });
    const next = exercises.filter(e => e.id !== peId);
    setExercises(next);
    onWorkoutUpdated({ ...workout, exercises: next });
  }

  async function updateTarget(peId: number, field: "targetSets" | "targetReps", val: number) {
    const res = await fetch(`/api/fitness/planned-exercises/${peId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: val }),
    });
    if (!res.ok) return;
    const next = exercises.map(e => e.id === peId ? { ...e, [field]: val } : e);
    setExercises(next);
    onWorkoutUpdated({ ...workout, exercises: next });
  }

  async function deleteWorkout() {
    await fetch(`/api/fitness/planned-workouts/${workout.id}`, { method: "DELETE" });
    onWorkoutDeleted();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Exercises</p>
        <button onClick={deleteWorkout}
          className="text-xs text-muted-foreground hover:text-rose-400 transition-colors">
          Clear day
        </button>
      </div>

      {exercises.length === 0 && !showPicker && (
        <p className="text-xs text-muted-foreground text-center py-2">No exercises yet</p>
      )}

      {exercises.map(ex => (
        <div key={ex.id} className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium flex-1">{ex.name}</span>
            <CategoryBadge cat={ex.category} />
            <button onClick={() => removeExercise(ex.id)}
              className="text-muted-foreground hover:text-rose-400 transition-colors ml-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sets</p>
              <Stepper
                value={String(ex.targetSets)}
                onChange={v => updateTarget(ex.id, "targetSets", parseInt(v) || 3)}
                step={1} min={1}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Reps (min 12)</p>
              <Stepper
                value={String(ex.targetReps)}
                onChange={v => updateTarget(ex.id, "targetReps", Math.max(12, parseInt(v) || 12))}
                step={1} min={12}
              />
            </div>
          </div>
        </div>
      ))}

      {showPicker
        ? <ExercisePicker all={allExercises} added={exercises.map(e => e.exerciseId)} onAdd={addExercise} onClose={() => setShowPicker(false)} />
        : (
          <button onClick={() => setShowPicker(true)} disabled={savingEx}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
            {savingEx ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" />Add Exercise</>}
          </button>
        )
      }

      <button onClick={onClose}
        className="w-full h-9 rounded-lg bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        Done
      </button>
    </div>
  );
}

// ── Week plan view ─────────────────────────────────────────────────────────────

function WeekPlan({ plan, weekStart, allExercises, onStartWorkout, onPlanUpdated }: {
  plan: Plan;
  weekStart: string;
  allExercises: ExRow[];
  onStartWorkout: (workout: PlannedWorkout) => void;
  onPlanUpdated: (p: Plan) => void;
}) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [creatingDay, setCreatingDay] = useState<number | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  function getWorkoutForDay(day: number) {
    return plan.workouts.find(w => w.dayOfWeek === day) ?? null;
  }

  async function createWorkoutForDay(day: number) {
    setCreatingDay(day);
    try {
      const res = await fetch(`/api/fitness/plans/${plan.id}/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayOfWeek: day }),
      });
      if (!res.ok) return;
      const workout: PlannedWorkout = await res.json();
      const updated: Plan = { ...plan, workouts: [...plan.workouts, workout] };
      onPlanUpdated(updated);
      setEditingDay(day);
    } finally {
      setCreatingDay(null);
    }
  }

  function handleWorkoutUpdated(day: number, w: PlannedWorkout) {
    const updated: Plan = {
      ...plan,
      workouts: plan.workouts.map(pw => pw.dayOfWeek === day ? w : pw),
    };
    onPlanUpdated(updated);
  }

  function handleWorkoutDeleted(day: number) {
    const updated: Plan = { ...plan, workouts: plan.workouts.filter(pw => pw.dayOfWeek !== day) };
    onPlanUpdated(updated);
    setEditingDay(null);
  }

  return (
    <div className="space-y-2">
      {DAYS.map((label, i) => {
        const dayIndex = i + 1; // 1=Mon...7=Sun
        const dayIso   = addDays(weekStart, i);
        const isToday  = dayIso === today;
        const isPast   = dayIso < today;
        const workout  = getWorkoutForDay(dayIndex);
        const isEditing = editingDay === dayIndex;

        return (
          <div key={dayIndex}
            className={`rounded-xl border bg-card overflow-hidden transition-all ${
              isToday ? "border-primary/50 ring-1 ring-primary/20" : "border-border"
            }`}>

            {/* Day header */}
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-12 shrink-0">
                <p className={`text-sm font-bold ${isToday ? "text-primary" : isPast ? "text-muted-foreground" : "text-foreground"}`}>{label}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(dayIso + "T00:00:00").getDate()}</p>
              </div>

              <div className="flex-1 min-w-0">
                {workout && workout.exercises.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {workout.exercises.slice(0, 3).map(ex => (
                      <span key={ex.id} className="text-xs text-muted-foreground">{ex.name}</span>
                    ))}
                    {workout.exercises.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{workout.exercises.length - 3} more</span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/60">{workout ? "No exercises" : "Rest day"}</p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {workout && (isToday || isPast) && workout.exercises.length > 0 && (
                  <Button size="sm" className="h-7 text-xs" onClick={() => onStartWorkout(workout)}>
                    Start
                  </Button>
                )}
                <button
                  onClick={() => {
                    if (!workout) {
                      createWorkoutForDay(dayIndex);
                    } else {
                      setEditingDay(isEditing ? null : dayIndex);
                    }
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  disabled={creatingDay === dayIndex}>
                  {creatingDay === dayIndex
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : isEditing ? <X className="h-3.5 w-3.5" /> : workout ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />
                  }
                </button>
              </div>
            </div>

            {/* Inline editor */}
            {isEditing && workout && (
              <div className="border-t border-border px-4 py-3">
                <DayEditor
                  workout={workout}
                  allExercises={allExercises}
                  planId={plan.id}
                  onWorkoutUpdated={w => handleWorkoutUpdated(dayIndex, w)}
                  onWorkoutDeleted={() => handleWorkoutDeleted(dayIndex)}
                  onClose={() => setEditingDay(null)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Log tab ────────────────────────────────────────────────────────────────────

function LogTab({ allExercises }: { allExercises: ExRow[] }) {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const [plan, setPlan]           = useState<Plan | null>(null);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [active, setActive]       = useState<{ sessionId: number; date: string; startedAt: number; blocks: ExBlock[] } | null>(null);
  const [sessions, setSessions]   = useState<Session[]>([]);

  const loadPlan = useCallback(async (ws: string) => {
    setLoading(true);
    setPlan(null);
    try {
      const res = await fetch(`/api/fitness/plans?weekStart=${ws}`);
      const data = await res.json();
      setPlan(data ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlan(weekStart); }, [weekStart, loadPlan]);

  // Load recent sessions for history (only for current week view)
  useEffect(() => {
    fetch("/api/fitness/sessions").then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSessions(d.slice(0, 5)); })
      .catch(() => {});
  }, []);

  async function createPlan() {
    setCreating(true);
    try {
      const res = await fetch("/api/fitness/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart }),
      });
      const data = await res.json();
      setPlan(data);
    } finally {
      setCreating(false);
    }
  }

  async function startWorkout(workout: PlannedWorkout) {
    const res = await fetch(`/api/fitness/planned-workouts/${workout.id}/start`, { method: "POST" });
    if (!res.ok) return;
    const session: Session = await res.json();
    const blocks: ExBlock[] = workout.exercises.map(ex => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      category: ex.category,
      sets: [],
      targetReps: ex.targetReps,
    }));
    setActive({ sessionId: session.id, date: session.date, startedAt: Date.now(), blocks });
  }

  function onFinish(durationMins: number) {
    if (!active) return;
    setSessions(prev => [{ id: active.sessionId, date: active.date, durationMins }, ...prev]);
    setActive(null);
  }

  function shiftWeek(delta: number) {
    setWeekStart(prev => addDays(prev, delta * 7));
  }

  const isCurrentWeek = weekStart === getMondayOf(new Date());

  if (active) {
    return (
      <ActiveSession
        sessionId={active.sessionId} date={active.date} startedAt={active.startedAt}
        allExercises={allExercises} initialBlocks={active.blocks}
        onFinish={onFinish} onDiscard={() => setActive(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => shiftWeek(-1)}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{fmtWeekRange(weekStart)}</p>
          {isCurrentWeek && <p className="text-[11px] text-primary">This week</p>}
        </div>
        <button onClick={() => shiftWeek(1)}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        Array.from({ length: 7 }, (_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)
      ) : !plan ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
          <p className="text-sm font-medium">No plan for this week</p>
          <p className="text-xs text-muted-foreground">Plan your workouts for the week, sprint-style.</p>
          <Button onClick={createPlan} disabled={creating} size="sm">
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Create Week Plan
          </Button>
        </div>
      ) : (
        <WeekPlan
          plan={plan} weekStart={weekStart} allExercises={allExercises}
          onStartWorkout={startWorkout} onPlanUpdated={setPlan}
        />
      )}

      {/* Quick-start ad hoc (no plan) */}
      {plan && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Start ad-hoc workout (no plan)
            <ChevronDown className="h-3.5 w-3.5 ml-auto group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-3">
            <AdHocWorkout allExercises={allExercises} onStart={setActive} />
          </div>
        </details>
      )}

      {/* Recent sessions */}
      {sessions.length > 0 && !plan && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Recent</p>
          {sessions.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium">{fmtDate(s.date)}</p>
              {s.durationMins && <span className="text-xs text-muted-foreground">{s.durationMins} min</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Ad hoc workout (no plan) ───────────────────────────────────────────────────

function AdHocWorkout({ allExercises, onStart }: {
  allExercises: ExRow[];
  onStart: (s: { sessionId: number; date: string; startedAt: number; blocks: ExBlock[] }) => void;
}) {
  const [starting, setStarting] = useState(false);
  const [error, setError]       = useState("");

  async function start() {
    setStarting(true); setError("");
    try {
      const res = await fetch("/api/fitness/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) { setError(data.error ?? "Could not start"); return; }
      onStart({ sessionId: data.id, date: data.date, startedAt: Date.now(), blocks: [] });
    } catch {
      setError("Network error");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={start} disabled={starting} className="w-full" variant="outline">
        {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Dumbbell className="h-4 w-4 mr-2" />}
        Start Empty Workout
      </Button>
      {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
    </div>
  );
}

// ── Progress tab ───────────────────────────────────────────────────────────────

function ProgressTab() {
  const [loggedExercises, setLoggedExercises] = useState<ExRow[]>([]);
  const [selectedId, setSelectedId]           = useState<number | null>(null);
  const [data, setData]                       = useState<ProgressPt[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [unit, setUnit]                       = useState<"kg" | "lbs">("kg");

  useEffect(() => {
    fetch("/api/fitness/exercises?logged=true").then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) { setLoggedExercises(d); setSelectedId(d[0].id); } });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/fitness/progress?exerciseId=${selectedId}`).then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const conv = (kg: number) => unit === "kg" ? kg : Math.round(kg * 2.205 * 10) / 10;
  const u = unit;
  const chartData = data.map(d => ({ date: fmtDate(d.date), weight: conv(d.maxWeight), e1RM: conv(d.max1RM) }));

  if (loggedExercises.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Log some workouts first to see your progress here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <select value={selectedId ?? ""} onChange={e => setSelectedId(parseInt(e.target.value))}
            className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2 text-sm pr-8 focus:outline-none">
            {loggedExercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          {(["kg", "lbs"] as const).map(uu => (
            <button key={uu} onClick={() => setUnit(uu)}
              className={`px-3 py-2 transition-colors ${unit === uu ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {uu}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="h-48 rounded-xl bg-muted animate-pulse" /> : data.length < 2 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Log this exercise in 2+ sessions to see the trend.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} unit={u} />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => [`${v}${u}`, ""]} />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Max weight" />
              <Line type="monotone" dataKey="e1RM" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Est. 1RM" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-emerald-500 inline-block" />Max weight</span>
            <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t-2 border-dashed border-indigo-500 inline-block" />Est. 1RM</span>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Session Log</p>
          </div>
          <div className="divide-y divide-border">
            {[...data].reverse().slice(0, 8).map(d => (
              <div key={d.date} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground text-xs">{fmtDate(d.date)}</span>
                <div className="flex items-center gap-4 tabular-nums">
                  <span className="text-xs text-muted-foreground">{conv(d.volume)}{u} vol</span>
                  <span className="font-medium">{conv(d.maxWeight)}{u}</span>
                  <span className="text-[11px] text-indigo-400">{conv(d.max1RM)}{u} 1RM</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Muscles tab ────────────────────────────────────────────────────────────────

function MusclesTab() {
  const [days, setDays]     = useState(7);
  const [data, setData]     = useState<MuscleFreq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/fitness/muscles?days=${days}`).then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); })
      .finally(() => setLoading(false));
  }, [days]);

  const maxSessions = Math.max(...data.map(d => d.sessions), 1);
  const IDEAL: Record<string, number> = { push: 2, pull: 2, legs: 2, core: 3, cardio: 2, other: 1 };

  return (
    <div className="space-y-5">
      <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium w-fit">
        {[7, 14, 30].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-2 transition-colors ${days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {d}d
          </button>
        ))}
      </div>

      {loading ? (
        Array.from({ length: 6 }, (_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)
      ) : (
        <div className="space-y-3">
          {data.map(d => {
            const ideal = IDEAL[d.category] ?? 1;
            const weekRatio = days === 7 ? d.sessions / ideal : d.sessions / (ideal * Math.round(days / 7));
            const statusColor = d.sessions === 0 ? "text-muted-foreground" : weekRatio >= 1 ? "text-emerald-400" : weekRatio >= 0.5 ? "text-amber-400" : "text-rose-400";
            return (
              <div key={d.category} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLOR[d.category] }} />
                    <span className="text-sm font-semibold capitalize">{d.category}</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">{d.muscles.join(", ")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.sets > 0 && <span className="text-[11px] text-muted-foreground">{d.sets} sets</span>}
                    <span className={`text-sm font-bold tabular-nums ${statusColor}`}>{d.sessions}</span>
                    <span className="text-xs text-muted-foreground">session{d.sessions !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(d.sessions / maxSessions) * 100}%`, backgroundColor: CAT_COLOR[d.category] }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "log",      label: "Plan",     icon: Dumbbell   },
  { id: "progress", label: "Progress", icon: TrendingUp  },
  { id: "muscles",  label: "Muscles",  icon: Activity   },
] as const;

export default function FitnessPage() {
  const [tab, setTab]          = useState<"log" | "progress" | "muscles">("log");
  const [allExercises, setAll] = useState<ExRow[]>([]);

  useEffect(() => {
    fetch("/api/fitness/exercises").then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAll(d); });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Plan your week, track progress, stay balanced</p>
      </div>

      <div className="flex rounded-xl border border-border bg-muted/30 p-1 gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === "log"      && <LogTab allExercises={allExercises} />}
      {tab === "progress" && <ProgressTab />}
      {tab === "muscles"  && <MusclesTab />}
    </div>
  );
}
