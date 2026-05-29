"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dumbbell, Plus, X, Check, Loader2, ChevronDown,
  TrendingUp, Activity, Search, Trash2, Timer,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────

type Session     = { id: number; date: string; durationMins: number | null; notes: string | null };
type ExerciseRow = { id: number; name: string; category: string; muscleGroups: string };
type SetEntry    = { id: number; setNumber: number; reps: number; weightKg: number; rpe: number | null };
type ExBlock     = { exerciseId: number; name: string; category: string; sets: SetEntry[] };
type ProgressPt  = { date: string; maxWeight: number; max1RM: number; volume: number };
type MuscleFreq  = { category: string; muscles: string[]; sessions: number; sets: number };

const CATS = ["push", "pull", "legs", "core", "cardio", "other"] as const;

const CAT_COLOR: Record<string, string> = {
  push:   "#10b981", pull:  "#0ea5e9", legs:  "#8b5cf6",
  core:   "#f59e0b", cardio:"#f43f5e", other: "#6b7280",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDuration(seconds: number) {
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Exercise Search Modal ──────────────────────────────────────────────────────

function ExerciseSearchModal({ onSelect, onClose }: {
  onSelect: (e: ExerciseRow) => void;
  onClose: () => void;
}) {
  const [q, setQ]           = useState("");
  const [cat, setCat]       = useState("");
  const [results, setResults] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (q)   params.set("q", q);
      if (cat) params.set("category", cat);
      fetch(`/api/fitness/exercises?${params}`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setResults(data); })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [q, cat]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[70vh]">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Add Exercise</p>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search exercises…"
              className="pl-8 text-sm"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["", ...CATS].map(c => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium capitalize transition-colors ${
                  cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {c || "all"}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No exercises found</p>
          ) : results.map(ex => (
            <button
              key={ex.id}
              onClick={() => { onSelect(ex); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors flex items-center justify-between gap-2"
            >
              <span className="text-sm font-medium">{ex.name}</span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                style={{ backgroundColor: `${CAT_COLOR[ex.category]}20`, color: CAT_COLOR[ex.category] }}
              >
                {ex.category}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Active Session View ────────────────────────────────────────────────────────

function ActiveSessionView({ sessionId, date, startedAt, onFinish, onDiscard }: {
  sessionId: number;
  date: string;
  startedAt: number;
  onFinish: (durationMins: number) => void;
  onDiscard: () => void;
}) {
  const [blocks, setBlocks]       = useState<ExBlock[]>([]);
  const [showSearch, setSearch]   = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const [finishing, setFinishing] = useState(false);
  // Per-exercise input state: { weight, reps, rpe }
  const [inputs, setInputs]       = useState<Record<number, { weight: string; reps: string; rpe: string }>>({});
  const [adding, setAdding]       = useState<Record<number, boolean>>({});

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  function addExercise(ex: ExerciseRow) {
    if (blocks.find(b => b.exerciseId === ex.id)) return;
    setBlocks(prev => [...prev, { exerciseId: ex.id, name: ex.name, category: ex.category, sets: [] }]);
    setInputs(prev => ({ ...prev, [ex.id]: { weight: "", reps: "", rpe: "" } }));
  }

  async function addSet(exerciseId: number) {
    const inp = inputs[exerciseId];
    const weightKg = parseFloat(inp?.weight ?? "");
    const reps     = parseInt(inp?.reps ?? "");
    if (isNaN(weightKg) || isNaN(reps) || reps <= 0) return;

    setAdding(prev => ({ ...prev, [exerciseId]: true }));
    try {
      const res  = await fetch(`/api/fitness/sessions/${sessionId}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exerciseId, reps, weightKg, rpe: parseInt(inp.rpe) || null }),
      });
      const set: SetEntry = await res.json();
      setBlocks(prev => prev.map(b =>
        b.exerciseId === exerciseId ? { ...b, sets: [...b.sets, set] } : b
      ));
      // Keep weight, clear reps+rpe for quick next-set entry
      setInputs(prev => ({ ...prev, [exerciseId]: { ...prev[exerciseId], reps: "", rpe: "" } }));
    } finally {
      setAdding(prev => ({ ...prev, [exerciseId]: false }));
    }
  }

  async function removeSet(exerciseId: number, setId: number) {
    await fetch(`/api/fitness/sets/${setId}`, { method: "DELETE" });
    setBlocks(prev => prev.map(b =>
      b.exerciseId === exerciseId ? { ...b, sets: b.sets.filter(s => s.id !== setId) } : b
    ));
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

  return (
    <>
      {showSearch && <ExerciseSearchModal onSelect={addExercise} onClose={() => setSearch(false)} />}

      <div className="space-y-4">
        {/* Session header */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-semibold">{fmtDate(date)}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Timer className="h-3 w-3 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-mono tabular-nums">{fmtDuration(elapsed)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={discard}
              className="text-xs text-muted-foreground hover:text-rose-400 transition-colors px-2 py-1"
            >
              Discard
            </button>
            <Button size="sm" onClick={finish} disabled={finishing || blocks.length === 0}>
              {finishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Finish</>}
            </Button>
          </div>
        </div>

        {/* Exercise blocks */}
        {blocks.map(block => {
          const inp = inputs[block.exerciseId] ?? { weight: "", reps: "", rpe: "" };
          const isAdding = adding[block.exerciseId] ?? false;
          const lastSet  = block.sets[block.sets.length - 1];

          return (
            <div key={block.exerciseId} className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <span className="text-sm font-semibold flex-1">{block.name}</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize"
                  style={{ backgroundColor: `${CAT_COLOR[block.category]}20`, color: CAT_COLOR[block.category] }}
                >
                  {block.category}
                </span>
              </div>

              {/* Logged sets */}
              {block.sets.length > 0 && (
                <div className="px-4 py-2 space-y-1">
                  <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1.5rem] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pb-1">
                    <span>#</span><span>Weight</span><span>Reps</span><span>RPE</span><span />
                  </div>
                  {block.sets.map(s => (
                    <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_1fr_1.5rem] gap-2 items-center text-sm px-1 py-0.5 rounded-lg hover:bg-muted/40 group">
                      <span className="text-xs text-muted-foreground tabular-nums">{s.setNumber}</span>
                      <span className="font-medium">{s.weightKg}kg</span>
                      <span className="text-muted-foreground">{s.reps} reps</span>
                      <span className="text-muted-foreground">{s.rpe ?? "—"}</span>
                      <button
                        onClick={() => removeSet(block.exerciseId, s.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-400 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add set row */}
              <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center gap-2">
                <Input
                  type="number"
                  placeholder={lastSet ? `${lastSet.weightKg}` : "kg"}
                  value={inp.weight}
                  onChange={e => setInputs(prev => ({ ...prev, [block.exerciseId]: { ...prev[block.exerciseId], weight: e.target.value } }))}
                  className="h-8 text-sm w-20"
                  min={0}
                  step={0.5}
                />
                <Input
                  type="number"
                  placeholder={lastSet ? `${lastSet.reps}` : "reps"}
                  value={inp.reps}
                  onChange={e => setInputs(prev => ({ ...prev, [block.exerciseId]: { ...prev[block.exerciseId], reps: e.target.value } }))}
                  onKeyDown={e => e.key === "Enter" && addSet(block.exerciseId)}
                  className="h-8 text-sm w-20"
                  min={1}
                />
                <Input
                  type="number"
                  placeholder="RPE"
                  value={inp.rpe}
                  onChange={e => setInputs(prev => ({ ...prev, [block.exerciseId]: { ...prev[block.exerciseId], rpe: e.target.value } }))}
                  onKeyDown={e => e.key === "Enter" && addSet(block.exerciseId)}
                  className="h-8 text-sm w-16"
                  min={1} max={10}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addSet(block.exerciseId)}
                  disabled={isAdding || !inp.weight || !inp.reps}
                  className="h-8 shrink-0"
                >
                  {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          );
        })}

        {/* Add exercise */}
        <button
          onClick={() => setSearch(true)}
          className="w-full rounded-xl border border-dashed border-border py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add exercise
        </button>
      </div>
    </>
  );
}

// ── Log Tab ────────────────────────────────────────────────────────────────────

function LogTab() {
  const [sessions, setSessions]   = useState<Session[]>([]);
  const [loading, setLoading]     = useState(true);
  const [active, setActive]       = useState<{ id: number; date: string; startedAt: number } | null>(null);
  const [starting, setStarting]   = useState(false);

  useEffect(() => {
    fetch("/api/fitness/sessions").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setSessions(data);
    }).finally(() => setLoading(false));
  }, []);

  async function startWorkout() {
    setStarting(true);
    const today = new Date().toISOString().slice(0, 10);
    const res   = await fetch("/api/fitness/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    const session = await res.json();
    setActive({ id: session.id, date: session.date, startedAt: Date.now() });
    setStarting(false);
  }

  function onFinish(durationMins: number) {
    if (!active) return;
    setSessions(prev => [{ id: active.id, date: active.date, durationMins, notes: null }, ...prev]);
    setActive(null);
  }

  if (active) {
    return (
      <ActiveSessionView
        sessionId={active.id}
        date={active.date}
        startedAt={active.startedAt}
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

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">No workouts logged yet. Start your first session above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">History</p>
          {sessions.map(s => (
            <div key={s.id} className="rounded-xl border border-border bg-card px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{fmtDate(s.date)}</p>
                {s.notes && <p className="text-xs text-muted-foreground mt-0.5">{s.notes}</p>}
              </div>
              {s.durationMins && (
                <span className="text-xs text-muted-foreground tabular-nums">{s.durationMins} min</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Progress Tab ───────────────────────────────────────────────────────────────

function ProgressTab() {
  const [exercises, setExercises]   = useState<ExerciseRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [data, setData]             = useState<ProgressPt[]>([]);
  const [loading, setLoading]       = useState(false);
  const [unit, setUnit]             = useState<"kg" | "lbs">("kg");

  useEffect(() => {
    fetch("/api/fitness/exercises?logged=true")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length > 0) { setExercises(d); setSelectedId(d[0].id); } });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    fetch(`/api/fitness/progress?exerciseId=${selectedId}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const convert = (kg: number) => unit === "kg" ? kg : Math.round(kg * 2.205 * 10) / 10;
  const unitLabel = unit === "kg" ? "kg" : "lbs";

  const chartData = data.map(d => ({
    date:   fmtDate(d.date),
    weight: convert(d.maxWeight),
    e1RM:   convert(d.max1RM),
  }));

  if (exercises.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Log some workouts first to see your progress here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <select
            value={selectedId ?? ""}
            onChange={e => setSelectedId(parseInt(e.target.value))}
            className="w-full appearance-none rounded-lg border border-border bg-card px-3 py-2 text-sm pr-8 focus:outline-none"
          >
            {exercises.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          {(["kg", "lbs"] as const).map(u => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`px-3 py-2 transition-colors ${unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      ) : data.length < 2 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Need at least 2 sessions for this exercise to show a chart.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Max Weight per Session</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} unit={unitLabel} />
              <Tooltip
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: unknown) => [`${v}${unitLabel}`, ""]}
              />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Max weight" />
              <Line type="monotone" dataKey="e1RM" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Est. 1RM" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-[11px]">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-emerald-500 inline-block" />Max weight</span>
            <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t-2 border-dashed border-indigo-500 inline-block" />Est. 1RM (Epley)</span>
          </div>
        </div>
      )}

      {/* Recent PRs table */}
      {data.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Session Log</p>
          </div>
          <div className="divide-y divide-border">
            {[...data].reverse().slice(0, 8).map(d => (
              <div key={d.date} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{fmtDate(d.date)}</span>
                <div className="flex items-center gap-4 tabular-nums">
                  <span className="text-xs text-muted-foreground">{convert(d.volume)}{unitLabel} vol</span>
                  <span className="font-medium">{convert(d.maxWeight)}{unitLabel}</span>
                  <span className="text-[11px] text-indigo-400">{convert(d.max1RM)}{unitLabel} 1RM</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Muscles Tab ────────────────────────────────────────────────────────────────

function MusclesTab() {
  const [days, setDays]     = useState(7);
  const [data, setData]     = useState<MuscleFreq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/fitness/muscles?days=${days}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); })
      .finally(() => setLoading(false));
  }, [days]);

  const maxSessions = Math.max(...data.map(d => d.sessions), 1);

  const IDEAL_FREQ = { push: 2, pull: 2, legs: 2, core: 3, cardio: 2, other: 1 };
  const target = days === 7 ? 1 : days === 30 ? 4 : 2;

  return (
    <div className="space-y-5">
      {/* Time range */}
      <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium w-fit">
        {[7, 14, 30].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-2 transition-colors ${days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {d}d
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(d => {
            const pct = (d.sessions / maxSessions) * 100;
            const ideal = IDEAL_FREQ[d.category as keyof typeof IDEAL_FREQ] ?? 1;
            const ratio = days === 7 ? d.sessions / ideal : d.sessions / (ideal * Math.round(days / 7));
            const statusColor = d.sessions === 0 ? "text-muted-foreground" : ratio >= 1 ? "text-emerald-400" : ratio >= 0.5 ? "text-amber-400" : "text-rose-400";

            return (
              <div key={d.category} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLOR[d.category] }} />
                    <span className="text-sm font-semibold capitalize">{d.category}</span>
                    <span className="text-[11px] text-muted-foreground">{d.muscles.join(", ")}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold tabular-nums ${statusColor}`}>{d.sessions}</span>
                    <span className="text-xs text-muted-foreground ml-1">session{d.sessions !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: CAT_COLOR[d.category] }}
                  />
                </div>
                {d.sets > 0 && (
                  <p className="text-[11px] text-muted-foreground">{d.sets} sets total</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Colors: green = on track, amber = slightly under, red = undertrained for the period
      </p>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "log",      label: "Log",      icon: Dumbbell  },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "muscles",  label: "Muscles",  icon: Activity  },
] as const;

export default function FitnessPage() {
  const [tab, setTab] = useState<"log" | "progress" | "muscles">("log");

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track workouts, measure progress, stay balanced</p>
      </div>

      {/* Tab bar */}
      <div className="flex rounded-xl border border-border bg-muted/30 p-1 gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === "log"      && <LogTab />}
      {tab === "progress" && <ProgressTab />}
      {tab === "muscles"  && <MusclesTab />}
    </div>
  );
}
