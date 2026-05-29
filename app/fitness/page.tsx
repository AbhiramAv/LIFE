"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dumbbell, TrendingUp, Activity, X, Check, Loader2,
  ChevronDown, Timer, Search, RotateCcw,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────

type ExerciseRow = { id: number; name: string; category: string; muscleGroups: string };
type SetEntry    = { id: number; setNumber: number; reps: number; weightKg: number; rpe: number | null };
type ExBlock     = { exerciseId: number; name: string; category: string; sets: SetEntry[] };
type Session     = { id: number; date: string; durationMins: number | null };
type ProgressPt  = { date: string; maxWeight: number; max1RM: number; volume: number };
type MuscleFreq  = { category: string; muscles: string[]; sessions: number; sets: number };

const CATS = ["push", "pull", "legs", "core", "cardio", "other"] as const;
const CAT_COLOR: Record<string, string> = {
  push: "#10b981", pull: "#0ea5e9", legs: "#8b5cf6",
  core: "#f59e0b", cardio: "#f43f5e", other: "#6b7280",
};

function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
}
function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}
function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
      style={{ backgroundColor: `${CAT_COLOR[cat]}20`, color: CAT_COLOR[cat] }}>
      {cat}
    </span>
  );
}

// ── Number stepper ─────────────────────────────────────────────────────────────

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
        className="h-10 w-10 rounded-lg border border-border bg-muted/40 text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center shrink-0">
        −
      </button>
      <div className="relative flex-1">
        <input
          type="number" value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          className="w-full h-10 rounded-lg border border-border bg-background text-center text-base font-semibold focus:outline-none focus:ring-1 focus:ring-ring pr-8"
        />
        {unit && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>}
      </div>
      <button onClick={() => adjust(step)}
        className="h-10 w-10 rounded-lg border border-border bg-muted/40 text-sm font-semibold hover:bg-muted transition-colors flex items-center justify-center shrink-0">
        +
      </button>
    </div>
  );
}

// ── Exercise block ─────────────────────────────────────────────────────────────

function ExerciseBlock({ block, sessionId, prevWeight, onSetsChange }: {
  block: ExBlock;
  sessionId: number;
  prevWeight: number | null;
  onSetsChange: (exerciseId: number, sets: SetEntry[]) => void;
}) {
  const lastSet = block.sets[block.sets.length - 1];
  const [weight, setWeight] = useState(lastSet ? String(lastSet.weightKg) : prevWeight ? String(prevWeight) : "");
  const [reps,   setReps]   = useState(lastSet ? String(lastSet.reps) : "");
  const [saving, setSaving] = useState(false);

  async function logSet(w: string, r: string) {
    const weightKg = parseFloat(w);
    const repsN    = parseInt(r);
    if (isNaN(weightKg) || isNaN(repsN) || repsN <= 0 || weightKg < 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/fitness/sessions/${sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId: block.exerciseId, reps: repsN, weightKg }),
      });
      if (!res.ok) return;
      const set: SetEntry = await res.json();
      const next = [...block.sets, set];
      onSetsChange(block.exerciseId, next);
      setReps("");          // keep weight, clear reps for next set
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

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm flex-1">{block.name}</span>
        <CategoryBadge cat={block.category} />
        {prevWeight && block.sets.length === 0 && (
          <span className="text-[11px] text-muted-foreground">Last: {prevWeight}kg</span>
        )}
      </div>

      {/* Logged sets */}
      {block.sets.length > 0 && (
        <div className="px-4 py-2 space-y-0.5">
          {block.sets.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-1.5 text-sm group">
              <span className="w-5 text-xs text-muted-foreground tabular-nums">{s.setNumber}</span>
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="flex-1 font-medium tabular-nums">{s.weightKg}kg × {s.reps}</span>
              {s.rpe && <span className="text-xs text-muted-foreground">RPE {s.rpe}</span>}
              <button onClick={() => removeSet(s.id)}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 transition-all">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Weight</p>
            <Stepper value={weight} onChange={setWeight} step={2.5} placeholder="kg" unit="kg" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Reps</p>
            <Stepper value={reps} onChange={setReps} step={1} min={1} placeholder="reps" />
          </div>
        </div>
        <div className="flex gap-2">
          {lastSet && (
            <button onClick={sameAsLast} disabled={saving}
              className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Same
            </button>
          )}
          <button onClick={() => logSet(weight, reps)} disabled={!canLog}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
              canLog ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Log Set</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Exercise picker (inline, no modal) ────────────────────────────────────────

function ExercisePicker({ all, added, onAdd }: {
  all: ExerciseRow[];
  added: number[];
  onAdd: (e: ExerciseRow) => void;
}) {
  const [cat, setCat] = useState<string>("");
  const [q, setQ]     = useState("");

  const visible = all
    .filter(e => !added.includes(e.id))
    .filter(e => !cat || e.category === cat)
    .filter(e => !q || e.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 overflow-hidden">
      <div className="px-4 py-3 border-b border-border space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Exercise</p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search exercises…" className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["", ...CATS].map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${
                cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}>
              {c || "all"}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-48 overflow-y-auto divide-y divide-border/50">
        {visible.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No exercises found</p>
        ) : visible.map(ex => (
          <button key={ex.id} onClick={() => { onAdd(ex); setQ(""); }}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left">
            <span className="text-sm">{ex.name}</span>
            <CategoryBadge cat={ex.category} />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Active session ─────────────────────────────────────────────────────────────

function ActiveSession({ sessionId, date, startedAt, allExercises, onFinish, onDiscard }: {
  sessionId: number; date: string; startedAt: number;
  allExercises: ExerciseRow[];
  onFinish: (durationMins: number) => void;
  onDiscard: () => void;
}) {
  const [blocks, setBlocks]     = useState<ExBlock[]>([]);
  const [elapsed, setElapsed]   = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [prevWeights, setPrevWeights] = useState<Record<number, number>>({});

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  async function addExercise(ex: ExerciseRow) {
    if (blocks.find(b => b.exerciseId === ex.id)) return;
    setBlocks(prev => [...prev, { exerciseId: ex.id, name: ex.name, category: ex.category, sets: [] }]);

    // Fetch previous best weight for this exercise
    fetch(`/api/fitness/progress?exerciseId=${ex.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const last = data[data.length - 1];
          setPrevWeights(p => ({ ...p, [ex.id]: last.maxWeight }));
        }
      }).catch(() => {});
  }

  function updateSets(exerciseId: number, sets: SetEntry[]) {
    setBlocks(prev => prev.map(b => b.exerciseId === exerciseId ? { ...b, sets } : b));
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

  const totalSets = blocks.reduce((s, b) => s + b.sets.length, 0);

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
            {totalSets > 0 && (
              <span className="text-xs text-muted-foreground">{totalSets} set{totalSets !== 1 ? "s" : ""}</span>
            )}
          </div>
        </div>
        <button onClick={discard} className="text-xs text-muted-foreground hover:text-rose-400 transition-colors px-2 py-1">
          Discard
        </button>
        <Button size="sm" onClick={finish} disabled={finishing || totalSets === 0}>
          {finishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Finish</>}
        </Button>
      </div>

      {/* Exercise blocks */}
      {blocks.map(block => (
        <ExerciseBlock
          key={block.exerciseId}
          block={block}
          sessionId={sessionId}
          prevWeight={prevWeights[block.exerciseId] ?? null}
          onSetsChange={updateSets}
        />
      ))}

      {/* Inline exercise picker */}
      <ExercisePicker
        all={allExercises}
        added={blocks.map(b => b.exerciseId)}
        onAdd={addExercise}
      />

      {blocks.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-2">
          Search above to add your first exercise
        </p>
      )}
    </div>
  );
}

// ── Log tab ────────────────────────────────────────────────────────────────────

function LogTab({ allExercises }: { allExercises: ExerciseRow[] }) {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [loading, setLoading]     = useState(true);
  const [starting, setStarting]   = useState(false);
  const [startError, setStartError] = useState("");
  const [active, setActive]       = useState<{ id: number; date: string; startedAt: number } | null>(null);

  useEffect(() => {
    fetch("/api/fitness/sessions").then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSessions(d); })
      .finally(() => setLoading(false));
  }, []);

  async function startWorkout() {
    setStarting(true); setStartError("");
    try {
      const res = await fetch("/api/fitness/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) { setStartError(data.error ?? "Could not start workout"); return; }
      setActive({ id: data.id, date: data.date, startedAt: Date.now() });
    } catch {
      setStartError("Network error — check your connection.");
    } finally {
      setStarting(false);
    }
  }

  function onFinish(durationMins: number) {
    if (!active) return;
    setSessions(prev => [{ id: active.id, date: active.date, durationMins }, ...prev]);
    setActive(null);
  }

  if (active) {
    return (
      <ActiveSession
        sessionId={active.id} date={active.date} startedAt={active.startedAt}
        allExercises={allExercises}
        onFinish={onFinish}
        onDiscard={() => setActive(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Button onClick={startWorkout} disabled={starting} className="w-full" size="lg">
        {starting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Dumbbell className="h-4 w-4 mr-2" />}
        Start Workout
      </Button>
      {startError && <p className="text-xs text-rose-400 text-center">{startError}</p>}

      {loading ? (
        Array.from({ length: 3 }, (_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No workouts yet. Start your first session above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">History</p>
          {sessions.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-medium">{fmtDate(s.date)}</p>
              {s.durationMins && <span className="text-xs text-muted-foreground tabular-nums">{s.durationMins} min</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Progress tab ───────────────────────────────────────────────────────────────

function ProgressTab() {
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [data, setData]           = useState<ProgressPt[]>([]);
  const [loading, setLoading]     = useState(false);
  const [unit, setUnit]           = useState<"kg"|"lbs">("kg");

  useEffect(() => {
    fetch("/api/fitness/exercises?logged=true").then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) { setExercises(d); setSelectedId(d[0].id); } });
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

  if (exercises.length === 0) {
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
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          {(["kg","lbs"] as const).map(uu => (
            <button key={uu} onClick={() => setUnit(uu)}
              className={`px-3 py-2 transition-colors ${unit === uu ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {uu}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="h-48 rounded-xl bg-muted animate-pulse" /> :
       data.length < 2 ? (
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
  { id: "log",      label: "Log",      icon: Dumbbell   },
  { id: "progress", label: "Progress", icon: TrendingUp  },
  { id: "muscles",  label: "Muscles",  icon: Activity   },
] as const;

export default function FitnessPage() {
  const [tab, setTab]           = useState<"log"|"progress"|"muscles">("log");
  const [allExercises, setAll]  = useState<ExerciseRow[]>([]);

  useEffect(() => {
    fetch("/api/fitness/exercises").then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAll(d); });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track workouts, measure progress, stay balanced</p>
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
