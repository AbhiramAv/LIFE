"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dumbbell, TrendingUp, Activity, X, Check, Loader2, Plus,
  ChevronLeft, ChevronRight, Trash2, Pencil, ArrowLeft, Search,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────────

type ExRow = { id: number; name: string; category: string; muscleGroups: string };

type SplitGroupMeta  = { id: number; name: string; sortOrder: number; defaultCount: number; defaultExerciseIds: number[] };
type SplitMeta       = { id: number; name: string; slug: string; description: string; groups: SplitGroupMeta[] };

type WGExercise = {
  id: number; exerciseId: number; exerciseName: string; category: string;
  targetSets: number; targetReps: number; targetWeight: number | null; lastWeight: number | null;
};
type WeekGroup   = { id: number; name: string; splitGroupId: number; sortOrder: number; exercises: WGExercise[] };
type WeekSplit   = { id: number; splitId: number; splitName: string; splitSlug: string; frequency: number; groups: WeekGroup[] };
type DayWorkout  = { id: number; date: string; weekGroupId: number | null; groupName: string | null; completedAt: string | null };
type WeekPlan    = { id: number; weekStart: string; splits: WeekSplit[]; dayWorkouts: DayWorkout[] };

type SetDraft = {
  weekGroupExerciseId: number;
  exerciseId: number;
  exerciseName: string;
  setNumber: number;
  targetWeight: number | null;
  targetReps: number;
  actualWeight: string;
  actualReps: string;
  completed: boolean;
};

type ProgressPt = { date: string; maxWeight: number; max1RM: number; volume: number };
type MuscleFreq = { category: string; muscles: string[]; sessions: number; sets: number };

// ── Constants ──────────────────────────────────────────────────────────────────

const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const;
const CATS = ["push","pull","legs","core","cardio","other"] as const;
const CAT_COLOR: Record<string, string> = {
  push:"#10b981", pull:"#0ea5e9", legs:"#8b5cf6",
  core:"#f59e0b", cardio:"#f43f5e", other:"#6b7280",
};
const SPLIT_FREQ: Record<string, { label: string; value: number }[]> = {
  ppl:         [{ label:"Once (3 days)",  value:1 },{ label:"Twice (6 days)", value:2 }],
  upper_lower: [{ label:"Once (2 days)",  value:1 },{ label:"Twice (4 days)", value:2 }],
  full_body:   [{ label:"2× per week",    value:2 },{ label:"3× per week",    value:3 }],
  bro_split:   [{ label:"Once (5 days)",  value:1 }],
  push_pull:   [{ label:"Once (2 days)",  value:1 },{ label:"Twice (4 days)", value:2 }],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function getMondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" });
}
function fmtWeekRange(monday: string) {
  const s = new Date(monday + "T00:00:00");
  const e = new Date(monday + "T00:00:00"); e.setDate(e.getDate() + 6);
  return `${s.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${e.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
}

function CategoryBadge({ cat }: { cat: string }) {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0"
      style={{ backgroundColor:`${CAT_COLOR[cat] ?? "#6b7280"}20`, color:CAT_COLOR[cat] ?? "#6b7280" }}>
      {cat}
    </span>
  );
}

// ── Muscle group body silhouette ───────────────────────────────────────────────

const MUSCLE_HIGHLIGHTS: Record<string, string[]> = {
  push:        ["chest", "lShoulder", "rShoulder", "lUpper", "rUpper"],
  pull:        ["lLat", "rLat", "lUpper", "rUpper", "lFore", "rFore"],
  legs:        ["lThigh", "rThigh", "lCalf", "rCalf", "hip"],
  upper:       ["chest", "lShoulder", "rShoulder", "lUpper", "rUpper", "lFore", "rFore"],
  lower:       ["lThigh", "rThigh", "lCalf", "rCalf", "hip"],
  "full body": ["chest", "lShoulder", "rShoulder", "core", "lThigh", "rThigh"],
  core:        ["core"],
};
const MUSCLE_COLORS: Record<string, string> = {
  push: "#10b981", pull: "#0ea5e9", legs: "#8b5cf6",
  upper: "#f59e0b", lower: "#f43f5e", core: "#f59e0b", "full body": "#6366f1",
};

function MuscleGroupSVG({ name }: { name: string }) {
  const key = name.toLowerCase();
  const hl  = MUSCLE_HIGHLIGHTS[key] ?? [];
  const col = MUSCLE_COLORS[key] ?? "#10b981";
  const lit = (p: string) => hl.includes(p) ? col + "55" : "#9ca3af15";
  const bdr = (p: string) => hl.includes(p) ? col + "80" : "transparent";

  return (
    <svg viewBox="0 0 60 120" className="h-full w-auto" fill="none">
      <circle cx="30" cy="9"  r="8"  fill="#9ca3af15"/>
      <rect   x="26" y="17"  width="8"  height="5" fill="#9ca3af15"/>
      <ellipse cx="16" cy="26" rx="6" ry="4"       fill={lit("lShoulder")} stroke={bdr("lShoulder")} strokeWidth="0.8"/>
      <ellipse cx="44" cy="26" rx="6" ry="4"       fill={lit("rShoulder")} stroke={bdr("rShoulder")} strokeWidth="0.8"/>
      <rect x="17" y="22" width="26" height="17" rx="2" fill={lit("chest")}  stroke={bdr("chest")}  strokeWidth="0.8"/>
      <rect x="11" y="26" width="6"  height="15" rx="2" fill={lit("lLat")}   stroke={bdr("lLat")}   strokeWidth="0.8"/>
      <rect x="43" y="26" width="6"  height="15" rx="2" fill={lit("rLat")}   stroke={bdr("rLat")}   strokeWidth="0.8"/>
      <rect x="18" y="39" width="24" height="14" rx="2" fill={lit("core")}   stroke={bdr("core")}   strokeWidth="0.8"/>
      <rect x="8"  y="24" width="8"  height="18" rx="3" fill={lit("lUpper")} stroke={bdr("lUpper")} strokeWidth="0.8"/>
      <rect x="44" y="24" width="8"  height="18" rx="3" fill={lit("rUpper")} stroke={bdr("rUpper")} strokeWidth="0.8"/>
      <rect x="9"  y="43" width="7"  height="14" rx="3" fill={lit("lFore")}  stroke={bdr("lFore")}  strokeWidth="0.8"/>
      <rect x="44" y="43" width="7"  height="14" rx="3" fill={lit("rFore")}  stroke={bdr("rFore")}  strokeWidth="0.8"/>
      <rect x="17" y="53" width="26" height="9"  rx="2" fill={lit("hip")}    stroke={bdr("hip")}    strokeWidth="0.8"/>
      <rect x="17" y="61" width="12" height="24" rx="3" fill={lit("lThigh")} stroke={bdr("lThigh")} strokeWidth="0.8"/>
      <rect x="31" y="61" width="12" height="24" rx="3" fill={lit("rThigh")} stroke={bdr("rThigh")} strokeWidth="0.8"/>
      <rect x="18" y="86" width="10" height="18" rx="3" fill={lit("lCalf")}  stroke={bdr("lCalf")}  strokeWidth="0.8"/>
      <rect x="32" y="86" width="10" height="18" rx="3" fill={lit("rCalf")}  stroke={bdr("rCalf")}  strokeWidth="0.8"/>
    </svg>
  );
}

// ── Exercise category icon ─────────────────────────────────────────────────────

const CAT_ICONS: Record<string, React.ReactNode> = {
  push: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <line x1="4" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="3" cy="9" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 9 L10 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 12 L10 15 L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  pull: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <line x1="4" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="3" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="17" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 11 L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 8 L10 5 L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  legs: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <path d="M8 2 L8 10 L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 2 L12 10 L14 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  core: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="10" r="3" fill="currentColor" opacity="0.4"/>
    </svg>
  ),
  cardio: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <polyline points="1,10 4,4 7,14 10,7 13,12 16,8 19,10"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

function ExerciseCategoryIcon({ category }: { category: string }) {
  const color = CAT_COLOR[category] ?? "#6b7280";
  return (
    <div className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center p-2"
      style={{ backgroundColor: `${color}18`, color }}>
      {CAT_ICONS[category] ?? <Dumbbell className="h-full w-full" />}
    </div>
  );
}

// ── Stepper (compact) ──────────────────────────────────────────────────────────

function Stepper({ value, onChange, step = 1, min = 0, unit }: {
  value: string; onChange: (v: string) => void; step?: number; min?: number; unit?: string;
}) {
  function adjust(delta: number) {
    const n = parseFloat(value) || 0;
    onChange(String(Math.max(min, Math.round((n + delta) * 100) / 100)));
  }
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => adjust(-step)}
        className="h-8 w-8 rounded-md border border-border bg-muted/40 text-sm font-bold hover:bg-muted transition-colors flex items-center justify-center shrink-0">−</button>
      <div className="relative w-20">
        <input type="number" value={value} onChange={e => onChange(e.target.value)}
          className="w-full h-8 rounded-md border border-border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring pr-6" />
        {unit && <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{unit}</span>}
      </div>
      <button onClick={() => adjust(step)}
        className="h-8 w-8 rounded-md border border-border bg-muted/40 text-sm font-bold hover:bg-muted transition-colors flex items-center justify-center shrink-0">+</button>
    </div>
  );
}

// ── Exercise picker (inline) ───────────────────────────────────────────────────

function ExercisePicker({ all, excluded, onAdd, onClose }: {
  all: ExRow[]; excluded: number[]; onAdd: (e: ExRow) => void; onClose: () => void;
}) {
  const [cat, setCat] = useState("");
  const [q, setQ]     = useState("");
  const visible = all
    .filter(e => !excluded.includes(e.id))
    .filter(e => !cat || e.category === cat)
    .filter(e => !q   || e.name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 20);

  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/20 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Exercise</p>
          <button onClick={onClose}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" className="pl-8 h-8 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["", ...CATS].map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium capitalize transition-colors ${cat === c ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {c || "all"}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-40 overflow-y-auto divide-y divide-border/50">
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

// ── Step 1: Split picker ───────────────────────────────────────────────────────

const SPLIT_ICONS: Record<string, string> = {
  ppl: "P·P·L", upper_lower: "U·L", full_body: "FB", bro_split: "Bro", push_pull: "P·P",
};

function SplitPicker({ splits, onSelect }: { splits: SplitMeta[]; onSelect: (s: SplitMeta) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Choose a split</h2>
        <p className="text-sm text-muted-foreground">Select the training program for this week</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {splits.map(s => (
          <button key={s.id} onClick={() => onSelect(s)}
            className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/30 transition-all group">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {SPLIT_ICONS[s.slug] ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm group-hover:text-primary transition-colors">{s.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {s.groups.map(g => (
                    <span key={g.id} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {g.name} ({g.defaultCount})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Frequency picker ───────────────────────────────────────────────────

function FrequencyPicker({ split, onSelect, onBack }: {
  split: SplitMeta; onSelect: (freq: number) => void; onBack: () => void;
}) {
  const options = SPLIT_FREQ[split.slug] ?? [{ label: "Once", value: 1 }];
  const [selected, setSelected] = useState(options[0].value);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div>
        <h2 className="text-lg font-bold">{split.name}</h2>
        <p className="text-sm text-muted-foreground">How often will you run this split this week?</p>
      </div>
      <div className="space-y-2">
        {options.map(o => (
          <button key={o.value} onClick={() => setSelected(o.value)}
            className={`w-full rounded-xl border p-4 text-left transition-all ${selected === o.value ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/20"}`}>
            <div className="flex items-center gap-3">
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selected === o.value ? "border-primary" : "border-muted-foreground"}`}>
                {selected === o.value && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <p className="text-sm font-medium">{o.label}</p>
            </div>
          </button>
        ))}
      </div>
      <Button className="w-full" onClick={() => onSelect(selected)}>
        Continue →
      </Button>
    </div>
  );
}

// ── Step 3: Exercise configurator ──────────────────────────────────────────────

function ExerciseConfigurator({ groups, allExercises, loading, onBack, onSave }: {
  groups: WeekGroup[];
  allExercises: ExRow[];
  loading: boolean;
  onBack: () => void;
  onSave: (updatedGroups: WeekGroup[]) => Promise<void>;
}) {
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);
  const [localGroups, setLocalGroups] = useState<WeekGroup[]>(groups);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const group = localGroups[activeGroupIdx];

  function updateExercise(exId: number, field: "targetSets" | "targetReps" | "targetWeight", val: number) {
    setLocalGroups(prev => prev.map((g, i) => i !== activeGroupIdx ? g : {
      ...g,
      exercises: g.exercises.map(ex => ex.id === exId ? { ...ex, [field]: val } : ex),
    }));
  }

  async function removeExercise(wgeId: number) {
    await fetch(`/api/fitness/week-group-exercises/${wgeId}`, { method: "DELETE" });
    setLocalGroups(prev => prev.map((g, i) => i !== activeGroupIdx ? g : {
      ...g, exercises: g.exercises.filter(ex => ex.id !== wgeId),
    }));
  }

  async function addExercise(ex: ExRow) {
    setShowPicker(false);
    const res = await fetch(`/api/fitness/week-groups/${group.id}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseId: ex.id }),
    });
    if (!res.ok) return;
    const newEx: WGExercise = await res.json();
    setLocalGroups(prev => prev.map((g, i) => i !== activeGroupIdx ? g : {
      ...g, exercises: [...g.exercises, newEx],
    }));
  }

  async function patchExercise(wgeId: number, field: string, val: number) {
    await fetch(`/api/fitness/week-group-exercises/${wgeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: val }),
    });
  }

  async function handleSave() {
    setSaving(true);
    // Persist any target changes for all groups
    for (const g of localGroups) {
      for (const ex of g.exercises) {
        await patchExercise(ex.id, "targetSets",   ex.targetSets);
        await patchExercise(ex.id, "targetReps",   ex.targetReps);
        await patchExercise(ex.id, "targetWeight", ex.targetWeight ?? 0);
      }
    }
    await onSave(localGroups);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({length:4},(_,i)=><div key={i} className="h-20 rounded-xl bg-muted animate-pulse"/>)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-base font-bold">Set weekly goals</h2>
          <p className="text-xs text-muted-foreground">Target weight + reps for each exercise this week</p>
        </div>
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 p-1 rounded-xl border border-border bg-muted/30 overflow-x-auto">
        {localGroups.map((g, i) => (
          <button key={g.id} onClick={() => { setActiveGroupIdx(i); setShowPicker(false); }}
            className={`flex-1 min-w-fit px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              i === activeGroupIdx ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {g.name}
          </button>
        ))}
      </div>

      {/* Exercise cards for active group */}
      <div className="space-y-3">
        {group?.exercises.length === 0 && !showPicker && (
          <p className="text-xs text-muted-foreground text-center py-3">No exercises yet — add some below</p>
        )}

        {group?.exercises.map(ex => (
          <div key={ex.id} className="rounded-xl border border-border bg-card p-3 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold flex-1">{ex.exerciseName}</span>
              <CategoryBadge cat={ex.category} />
              <button onClick={() => removeExercise(ex.id)}
                className="text-muted-foreground hover:text-rose-400 transition-colors ml-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {ex.lastWeight !== null && (
              <p className="text-[11px] text-muted-foreground">
                Last session: <span className="font-medium text-foreground">{ex.lastWeight}kg</span>
              </p>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Sets</p>
                <Stepper value={String(ex.targetSets)} step={1} min={1}
                  onChange={v => updateExercise(ex.id, "targetSets", parseInt(v)||3)} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Reps</p>
                <Stepper value={String(ex.targetReps)} step={1} min={1}
                  onChange={v => updateExercise(ex.id, "targetReps", Math.max(1, parseInt(v)||12))} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Target kg</p>
                <Stepper value={ex.targetWeight !== null ? String(ex.targetWeight) : ""} step={2.5} min={0} unit="kg"
                  onChange={v => updateExercise(ex.id, "targetWeight", parseFloat(v)||0)} />
              </div>
            </div>
          </div>
        ))}

        {showPicker
          ? <ExercisePicker
              all={allExercises}
              excluded={group?.exercises.map(e => e.exerciseId) ?? []}
              onAdd={addExercise}
              onClose={() => setShowPicker(false)}
            />
          : (
            <button onClick={() => setShowPicker(true)}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
              <Plus className="h-4 w-4" /> Add Exercise
            </button>
          )
        }
      </div>

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
        Save Plan
      </Button>
    </div>
  );
}

// ── Workout logging view ───────────────────────────────────────────────────────

function WorkoutView({ availableGroups, date, onSaved, onBack }: {
  availableGroups: WeekGroup[];
  date: string;
  onSaved: (workout: DayWorkout) => void;
  onBack: () => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState<WeekGroup | null>(
    availableGroups.length === 1 ? availableGroups[0] : null
  );
  const [sets, setSets] = useState<SetDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Build set drafts when group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    const drafts: SetDraft[] = [];
    for (const ex of selectedGroup.exercises) {
      for (let s = 1; s <= ex.targetSets; s++) {
        drafts.push({
          weekGroupExerciseId: ex.id,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          setNumber: s,
          targetWeight: ex.targetWeight,
          targetReps: ex.targetReps,
          actualWeight: ex.targetWeight !== null ? String(ex.targetWeight) : "",
          actualReps: String(ex.targetReps),
          completed: false,
        });
      }
    }
    setSets(drafts);
  }, [selectedGroup]);

  function updateSet(idx: number, field: "actualWeight" | "actualReps" | "completed", val: string | boolean) {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
  }

  function toggleSet(idx: number) {
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s));
  }

  async function save() {
    const completedSets = sets.filter(s => s.completed);
    if (completedSets.length === 0) { setSaveError("Complete at least one set."); return; }
    setSaving(true); setSaveError("");
    try {
      const res = await fetch("/api/fitness/day-workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekGroupId: selectedGroup?.id ?? null,
          date,
          sets: sets.map(s => ({
            weekGroupExerciseId: s.weekGroupExerciseId,
            exerciseId: s.exerciseId,
            setNumber: s.setNumber,
            targetWeight: s.targetWeight,
            targetReps: s.targetReps,
            actualWeight: parseFloat(s.actualWeight) || null,
            actualReps: parseInt(s.actualReps) || null,
            completed: s.completed,
          })),
        }),
      });
      if (!res.ok) { setSaveError("Failed to save workout."); return; }
      const dw: DayWorkout & { setCount: number } = await res.json();
      onSaved({ ...dw, groupName: selectedGroup?.name ?? null });
    } finally {
      setSaving(false);
    }
  }

  // Group selector
  if (!selectedGroup) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-bold">{fmtDate(date)}</h2>
            <p className="text-xs text-muted-foreground">Which muscle group today?</p>
          </div>
        </div>
        <div className="space-y-2">
          {availableGroups.map(g => (
            <button key={g.id} onClick={() => setSelectedGroup(g)}
              className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/30 transition-all group">
              <div className="flex items-center gap-4">
                <div className="h-20 w-10 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                  <MuscleGroupSVG name={g.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{g.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{g.exercises.length} exercise{g.exercises.length !== 1 ? "s" : ""}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {g.exercises.slice(0, 3).map(ex => (
                      <span key={ex.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{ex.exerciseName}</span>
                    ))}
                    {g.exercises.length > 3 && (
                      <span className="text-[10px] text-muted-foreground/60">+{g.exercises.length - 3} more</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Group by exercise for display
  const exerciseMap = new Map<number, { ex: WGExercise; sets: { draft: SetDraft; idx: number }[] }>();
  sets.forEach((s, idx) => {
    const exId = s.weekGroupExerciseId;
    if (!exerciseMap.has(exId)) {
      const ex = selectedGroup.exercises.find(e => e.id === exId)!;
      exerciseMap.set(exId, { ex, sets: [] });
    }
    exerciseMap.get(exId)!.sets.push({ draft: s, idx });
  });

  const completedCount = sets.filter(s => s.completed).length;
  const totalCount     = sets.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedGroup(null)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-base font-bold">{selectedGroup.name} · {fmtDate(date)}</h2>
          <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} sets completed</p>
        </div>
      </div>

      {/* Exercise cards */}
      {Array.from(exerciseMap.values()).map(({ ex, sets: exSets }) => {
        const allDone = exSets.every(s => s.draft.completed);
        return (
          <div key={ex.id} className={`rounded-xl border bg-card overflow-hidden transition-colors ${allDone ? "border-emerald-500/40" : "border-border"}`}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <ExerciseCategoryIcon category={ex.category} />
              <span className="font-semibold text-sm flex-1">{ex.exerciseName}</span>
              <CategoryBadge cat={ex.category} />
              {ex.lastWeight !== null && (
                <span className="text-[11px] text-muted-foreground">Last: {ex.lastWeight}kg</span>
              )}
              {allDone && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
            </div>

            {/* Set rows */}
            <div className="divide-y divide-border/50">
              {exSets.map(({ draft: s, idx }) => (
                <div key={idx} className={`px-4 py-3 transition-colors ${s.completed ? "bg-emerald-500/5" : ""}`}>
                  <div className="flex items-center gap-3">
                    {/* Set number */}
                    <span className="w-5 text-xs text-muted-foreground font-medium shrink-0">#{s.setNumber}</span>

                    {/* Weight */}
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        value={s.actualWeight}
                        onChange={e => updateSet(idx, "actualWeight", e.target.value)}
                        placeholder={s.targetWeight ? String(s.targetWeight) : "kg"}
                        className="w-20 h-9 rounded-lg border border-border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground">kg</span>
                    </div>

                    <span className="text-xs text-muted-foreground">×</span>

                    {/* Reps */}
                    <div className="flex items-center gap-1 flex-1">
                      <input
                        type="number"
                        value={s.actualReps}
                        onChange={e => updateSet(idx, "actualReps", e.target.value)}
                        placeholder={String(s.targetReps)}
                        className="w-16 h-9 rounded-lg border border-border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <span className="text-xs text-muted-foreground">reps</span>
                    </div>

                    {/* Done checkbox */}
                    <button onClick={() => toggleSet(idx)}
                      className={`h-8 w-8 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${
                        s.completed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-border hover:border-emerald-400"
                      }`}>
                      {s.completed && <Check className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Show target as reference */}
                  {(s.targetWeight || s.targetReps) && !s.completed && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 pl-8">
                      Target: {s.targetWeight ? `${s.targetWeight}kg` : "–"} × {s.targetReps}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {saveError && <p className="text-xs text-rose-400 text-center">{saveError}</p>}

      <Button className="w-full" size="lg" onClick={save} disabled={saving || completedCount === 0}>
        {saving
          ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
          : <Check className="h-4 w-4 mr-2" />
        }
        {saving ? "Saving…" : `Save Workout (${completedCount} set${completedCount !== 1 ? "s" : ""})`}
      </Button>
    </div>
  );
}

// ── Week view ──────────────────────────────────────────────────────────────────

function WeekView({ plan, weekStart, onAddSplit, onRemoveSplit, onEditGroup, onStartWorkout }: {
  plan: WeekPlan;
  weekStart: string;
  onAddSplit: () => void;
  onRemoveSplit: (weekSplitId: number) => void;
  onEditGroup: (group: WeekGroup) => void;
  onStartWorkout: (date: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [removing, setRemoving] = useState<number | null>(null);

  async function removeSplit(wsId: number) {
    setRemoving(wsId);
    await fetch(`/api/fitness/week-splits/${wsId}`, { method: "DELETE" });
    onRemoveSplit(wsId);
    setRemoving(null);
  }

  // Total available groups across all splits
  const allGroups = plan.splits.flatMap(ws => ws.groups);

  return (
    <div className="space-y-5">
      {/* Split summary cards */}
      {plan.splits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
          <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No splits planned yet</p>
          <p className="text-xs text-muted-foreground">Set up your training program for this week</p>
          <Button size="sm" onClick={onAddSplit}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Split
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {plan.splits.map(ws => (
            <div key={ws.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{ws.splitName}</p>
                  <p className="text-xs text-muted-foreground">
                    {ws.frequency}× per week · {ws.groups.length} muscle group{ws.groups.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <button onClick={() => removeSplit(ws.id)} disabled={removing === ws.id}
                  className="text-muted-foreground hover:text-rose-400 transition-colors mt-0.5">
                  {removing === ws.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Group tags */}
              <div className="flex flex-wrap gap-2">
                {ws.groups.map(g => (
                  <button key={g.id} onClick={() => onEditGroup(g)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors group">
                    <span className="text-xs font-medium">{g.name}</span>
                    <span className="text-[10px] text-muted-foreground">{g.exercises.length} ex</span>
                    <Pencil className="h-2.5 w-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <button onClick={onAddSplit}
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
            <Plus className="h-4 w-4" /> Add another split
          </button>
        </div>
      )}

      {/* Day grid */}
      {plan.splits.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">This week</p>
          {DAYS.map((label, i) => {
            const dayIso    = addDays(weekStart, i);
            const isToday   = dayIso === today;
            const isPast    = dayIso < today;
            const doneToday = plan.dayWorkouts.filter(dw => dw.date === dayIso && dw.completedAt);
            const canStart  = (isToday || isPast) && allGroups.length > 0;

            return (
              <div key={i} className={`rounded-xl border bg-card px-4 py-3 flex items-center gap-3 ${isToday ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}>
                <div className="w-12 shrink-0">
                  <p className={`text-sm font-bold ${isToday ? "text-primary" : isPast ? "text-muted-foreground" : ""}`}>{label}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(dayIso + "T00:00:00").getDate()}</p>
                </div>
                <div className="flex-1 min-w-0">
                  {doneToday.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {doneToday.map(dw => (
                        <span key={dw.id} className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                          <Check className="h-3 w-3" />{dw.groupName ?? "Workout"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60">Rest day</p>
                  )}
                </div>
                {canStart && (
                  <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => onStartWorkout(dayIso)}>
                    {doneToday.length > 0 ? "+ Log More" : "Start"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Plan tab ───────────────────────────────────────────────────────────────────

type PlanView =
  | { type: "week" }
  | { type: "pick-split" }
  | { type: "pick-freq"; split: SplitMeta }
  | { type: "configure"; weekSplitData: WeekSplit }
  | { type: "edit-group"; group: WeekGroup }
  | { type: "workout"; date: string };

function PlanTab({ allExercises }: { allExercises: ExRow[] }) {
  const [weekStart, setWeekStart]   = useState(() => getMondayOf(new Date()));
  const [plan, setPlan]             = useState<WeekPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [splits, setSplits]         = useState<SplitMeta[]>([]);
  const [view, setView]             = useState<PlanView>({ type: "week" });
  const [addingSplit, setAddingSplit] = useState(false);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [configuringGroups, setConfiguringGroups] = useState<WeekGroup[] | null>(null);

  async function createPlan() {
    setCreatingPlan(true);
    const res = await fetch("/api/fitness/week-plan", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart }),
    });
    const created = await res.json();
    setPlan(created);
    setCreatingPlan(false);
  }

  const loadPlan = useCallback(async (ws: string) => {
    setLoadingPlan(true);
    const res = await fetch(`/api/fitness/week-plan?weekStart=${ws}`);
    const data = await res.json();
    setPlan(data ?? null);
    setLoadingPlan(false);
  }, []);

  useEffect(() => { loadPlan(weekStart); }, [weekStart, loadPlan]);

  useEffect(() => {
    fetch("/api/fitness/splits").then(r => r.json()).then(d => { if (Array.isArray(d)) setSplits(d); });
  }, []);

  // Returns all available groups the user hasn't logged for a given date
  function getAvailableGroups(date: string): WeekGroup[] {
    if (!plan) return [];
    const doneTodayGroupIds = plan.dayWorkouts
      .filter(dw => dw.date === date && dw.completedAt && dw.weekGroupId !== null)
      .map(dw => dw.weekGroupId!);

    // Count how many times each group has been done this week vs frequency
    const allGroups = plan.splits.flatMap(ws =>
      ws.groups.map(g => ({ ...g, frequency: ws.frequency }))
    );
    const weekDoneCount: Record<number, number> = {};
    plan.dayWorkouts.filter(dw => dw.completedAt && dw.weekGroupId).forEach(dw => {
      weekDoneCount[dw.weekGroupId!] = (weekDoneCount[dw.weekGroupId!] ?? 0) + 1;
    });

    return allGroups.filter(g => {
      const doneCount = weekDoneCount[g.id] ?? 0;
      return doneCount < g.frequency;
    });
  }

  async function handleSplitSelected(split: SplitMeta, frequency: number) {
    if (!plan) return;
    setAddingSplit(true);
    const res = await fetch(`/api/fitness/week-plan/${plan.id}/splits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ splitId: split.id, frequency, useDefaults: true }),
    });
    const newSplit: WeekSplit = await res.json();
    setPlan(prev => prev ? { ...prev, splits: [...prev.splits, newSplit] } : prev);
    setConfiguringGroups(newSplit.groups);
    setView({ type: "configure", weekSplitData: newSplit });
    setAddingSplit(false);
  }

  function handleRemoveSplit(weekSplitId: number) {
    setPlan(prev => prev ? { ...prev, splits: prev.splits.filter(ws => ws.id !== weekSplitId) } : prev);
  }

  function handleWorkoutSaved(dw: DayWorkout) {
    setPlan(prev => prev ? { ...prev, dayWorkouts: [...prev.dayWorkouts, dw] } : prev);
    setView({ type: "week" });
  }

  const isCurrentWeek = weekStart === getMondayOf(new Date());

  // ── View routing ──────────────────────────────────────────────────────────────

  if (loadingPlan) {
    return <div className="space-y-3">{Array.from({length:5},(_,i)=><div key={i} className="h-14 rounded-xl bg-muted animate-pulse"/>)}</div>;
  }

  if (view.type === "pick-split") {
    return (
      <div className="space-y-4">
        <button onClick={() => setView({ type:"week" })} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <SplitPicker splits={splits} onSelect={s => setView({ type:"pick-freq", split: s })} />
      </div>
    );
  }

  if (view.type === "pick-freq") {
    return (
      <div>
        {addingSplit
          ? <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Setting up plan…</div>
          : <FrequencyPicker
              split={view.split}
              onBack={() => setView({ type:"pick-split" })}
              onSelect={freq => handleSplitSelected(view.split, freq)}
            />
        }
      </div>
    );
  }

  if (view.type === "configure" || view.type === "edit-group") {
    const groups = view.type === "configure"
      ? (configuringGroups ?? view.weekSplitData.groups)
      : [view.group];

    return (
      <ExerciseConfigurator
        groups={groups}
        allExercises={allExercises}
        loading={false}
        onBack={() => setView({ type:"week" })}
        onSave={async () => { await loadPlan(weekStart); setView({ type:"week" }); }}
      />
    );
  }

  if (view.type === "workout") {
    const availableGroups = getAvailableGroups(view.date);
    if (availableGroups.length === 0) {
      return (
        <div className="space-y-4">
          <button onClick={() => setView({ type:"week" })} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm font-medium">All groups logged for today</p>
            <p className="text-xs text-muted-foreground mt-1">You&apos;ve completed all your planned muscle groups.</p>
          </div>
        </div>
      );
    }
    return (
      <WorkoutView
        availableGroups={availableGroups}
        date={view.date}
        onSaved={handleWorkoutSaved}
        onBack={() => setView({ type:"week" })}
      />
    );
  }

  // Default: week view
  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button onClick={() => setWeekStart(prev => addDays(prev, -7))}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold">{fmtWeekRange(weekStart)}</p>
          {isCurrentWeek && <p className="text-[11px] text-primary">This week</p>}
        </div>
        <button onClick={() => setWeekStart(prev => addDays(prev, 7))}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {plan ? (
        <WeekView
          plan={plan}
          weekStart={weekStart}
          onAddSplit={() => setView({ type:"pick-split" })}
          onRemoveSplit={handleRemoveSplit}
          onEditGroup={g => setView({ type:"edit-group", group: g })}
          onStartWorkout={date => setView({ type:"workout", date })}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3">
          <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No plan for this week</p>
          <p className="text-xs text-muted-foreground">Set up your training split to get started</p>
          <Button size="sm" onClick={createPlan} disabled={creatingPlan}>
            {creatingPlan
              ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              : <Plus className="h-4 w-4 mr-1.5" />}
            Create Plan
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Progress tab ───────────────────────────────────────────────────────────────

function ProgressTab() {
  const [loggedExercises, setLoggedExercises] = useState<ExRow[]>([]);
  const [selectedId, setSelectedId]           = useState<number | null>(null);
  const [data, setData]                       = useState<ProgressPt[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [unit, setUnit]                       = useState<"kg"|"lbs">("kg");

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
        <p className="text-sm text-muted-foreground">Log some workouts first to see progress.</p>
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
          <ChevronRight className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none rotate-90" />
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

      {loading ? <div className="h-48 rounded-xl bg-muted animate-pulse" /> : data.length < 2 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">Log this exercise in 2+ sessions to see the trend.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top:4, right:8, bottom:0, left:-16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize:10, fill:"var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize:10, fill:"var(--muted-foreground)" }} unit={u} />
              <Tooltip contentStyle={{ backgroundColor:"var(--card)", border:"1px solid var(--border)", borderRadius:8, fontSize:12 }}
                formatter={(v: unknown) => [`${v}${u}`, ""]} />
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill:"#10b981", r:3 }} name="Max weight" />
              <Line type="monotone" dataKey="e1RM" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Est. 1RM" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded bg-emerald-500 inline-block"/>Max weight</span>
            <span className="flex items-center gap-1.5"><span className="h-px w-4 border-t-2 border-dashed border-indigo-500 inline-block"/>Est. 1RM</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Muscles tab ────────────────────────────────────────────────────────────────

function MusclesTab() {
  const [days, setDays]       = useState(7);
  const [data, setData]       = useState<MuscleFreq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/fitness/muscles?days=${days}`).then(r => r.json())
      .then(d => { if (Array.isArray(d)) setData(d); })
      .finally(() => setLoading(false));
  }, [days]);

  const maxSessions = Math.max(...data.map(d => d.sessions), 1);
  const IDEAL: Record<string, number> = { push:2, pull:2, legs:2, core:3, cardio:2, other:1 };

  return (
    <div className="space-y-5">
      <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium w-fit">
        {[7,14,30].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`px-3 py-2 transition-colors ${days===d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {d}d
          </button>
        ))}
      </div>

      {loading
        ? Array.from({length:6},(_,i)=><div key={i} className="h-16 rounded-xl bg-muted animate-pulse"/>)
        : (
          <div className="space-y-3">
            {data.map(d => {
              const ideal = IDEAL[d.category] ?? 1;
              const weekRatio = days === 7 ? d.sessions/ideal : d.sessions/(ideal*Math.round(days/7));
              const statusColor = d.sessions===0 ? "text-muted-foreground" : weekRatio>=1 ? "text-emerald-400" : weekRatio>=0.5 ? "text-amber-400" : "text-rose-400";
              return (
                <div key={d.category} className="rounded-xl border border-border bg-card p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CAT_COLOR[d.category] }} />
                      <span className="text-sm font-semibold capitalize">{d.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.sets > 0 && <span className="text-[11px] text-muted-foreground">{d.sets} sets</span>}
                      <span className={`text-sm font-bold tabular-nums ${statusColor}`}>{d.sessions}</span>
                      <span className="text-xs text-muted-foreground">session{d.sessions!==1?"s":""}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width:`${(d.sessions/maxSessions)*100}%`, backgroundColor:CAT_COLOR[d.category] }}/>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const TABS = [
  { id:"plan",     label:"Plan",     icon:Dumbbell   },
  { id:"progress", label:"Progress", icon:TrendingUp  },
  { id:"muscles",  label:"Muscles",  icon:Activity   },
] as const;

export default function FitnessPage() {
  const [tab, setTab]          = useState<"plan"|"progress"|"muscles">("plan");
  const [allExercises, setAll] = useState<ExRow[]>([]);

  useEffect(() => {
    fetch("/api/fitness/exercises").then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAll(d); });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Plan your splits, hit your targets, track progress</p>
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

      {tab === "plan"     && <PlanTab allExercises={allExercises} />}
      {tab === "progress" && <ProgressTab />}
      {tab === "muscles"  && <MusclesTab />}
    </div>
  );
}
