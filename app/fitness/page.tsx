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

type ExRow = { id: number; name: string; category: string; muscleGroups: string; equipmentType: string };

type SplitGroupMeta  = { id: number; name: string; sortOrder: number; defaultCount: number; defaultExerciseIds: number[] };
type SplitMeta       = { id: number; name: string; slug: string; description: string; groups: SplitGroupMeta[] };

type WGExercise = {
  id: number; exerciseId: number; exerciseName: string; category: string; equipmentType: string;
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

type ProgressPt = { date: string; maxWeight: number; max1RM: number; volume: number; sets: number };
type ProgressSummary = { pr: number; prDate: string | null; totalSessions: number; lastTrained: string | null; delta: number | null };
type MuscleFreq = { muscle: string; category: string; sets: number; volume: number; sessions: number; lastTrained: string };

type PendingExercise = {
  exerciseId: number; exerciseName: string; category: string; equipmentType: string;
  targetSets: number; targetReps: number; targetWeight: number | null; lastWeight: number | null; sortOrder: number;
};
type PendingGroup = { splitGroupId: number; name: string; sortOrder: number; exercises: PendingExercise[] };
type PendingSplitConfig = { splitId: number; splitName: string; splitSlug: string; frequency: number; groups: PendingGroup[] };

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

// ── Equipment type icon ────────────────────────────────────────────────────────

const EQUIPMENT_ICONS: Record<string, React.ReactNode> = {
  barbell: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <rect x="0.5" y="7.5" width="3" height="5" rx="1" fill="currentColor"/>
      <rect x="3.5" y="8.5" width="2" height="3" rx="0.5" fill="currentColor"/>
      <line x1="5.5" y1="10" x2="14.5" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <rect x="14.5" y="8.5" width="2" height="3" rx="0.5" fill="currentColor"/>
      <rect x="16.5" y="7.5" width="3" height="5" rx="1" fill="currentColor"/>
    </svg>
  ),
  dumbbell: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <rect x="1" y="8" width="3.5" height="4" rx="1" fill="currentColor"/>
      <rect x="4.5" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
      <line x1="6.5" y1="10" x2="13.5" y2="10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="13.5" y="9" width="2" height="2" rx="0.5" fill="currentColor"/>
      <rect x="15.5" y="8" width="3.5" height="4" rx="1" fill="currentColor"/>
    </svg>
  ),
  cable: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <circle cx="10" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="4" r="1" fill="currentColor"/>
      <path d="M10 6.5 L7 15 L13 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="7" y1="15" x2="13" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  machine: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <rect x="2" y="3" width="16" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="5" y="6" width="5" height="7" rx="1" fill="currentColor" opacity="0.35"/>
      <line x1="13" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="13" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="13" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <line x1="3" y1="18" x2="17" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  bodyweight: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <circle cx="10" cy="3.5" r="2" fill="currentColor"/>
      <line x1="10" y1="5.5" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="8.5" x2="7" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="8.5" x2="13" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="12" x2="7.5" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="10" y1="12" x2="12.5" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  kettlebell: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <circle cx="10" cy="13" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7.5 9.5 Q10 4.5 12.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <rect x="8.5" y="8" width="3" height="2" rx="1" fill="currentColor"/>
    </svg>
  ),
  other: (
    <svg viewBox="0 0 20 20" fill="none" className="h-full w-full">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="10" y1="7" x2="10" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

const EQUIPMENT_COLOR: Record<string, string> = {
  barbell: "#ef4444", dumbbell: "#f97316", cable: "#0ea5e9",
  machine: "#6366f1", bodyweight: "#10b981", kettlebell: "#f59e0b", other: "#6b7280",
};
const EQUIPMENT_LABEL: Record<string, string> = {
  barbell: "Barbell", dumbbell: "Dumbbell", cable: "Cable",
  machine: "Machine", bodyweight: "Bodyweight", kettlebell: "Kettlebell", other: "Other",
};

function EquipmentIcon({ type, size = 36 }: { type: string; size?: number }) {
  const color = EQUIPMENT_COLOR[type] ?? "#6b7280";
  return (
    <div style={{ width: size, height: size, backgroundColor: `${color}18`, color, borderRadius: 8 }}
      className="flex items-center justify-center shrink-0 p-1.5">
      {EQUIPMENT_ICONS[type] ?? EQUIPMENT_ICONS.other}
    </div>
  );
}

// ── Split visual icon ──────────────────────────────────────────────────────────

const SPLIT_VISUAL: Record<string, React.ReactNode> = {
  ppl: (
    <svg viewBox="0 0 44 44" fill="none" className="h-full w-full">
      <rect x="2" y="2"  width="40" height="12" rx="3" fill="#10b981"/>
      <rect x="2" y="16" width="40" height="12" rx="3" fill="#0ea5e9"/>
      <rect x="2" y="30" width="40" height="12" rx="3" fill="#8b5cf6"/>
      <text x="22" y="11"  textAnchor="middle" fontSize="6" fill="white" fontWeight="700">PUSH</text>
      <text x="22" y="25"  textAnchor="middle" fontSize="6" fill="white" fontWeight="700">PULL</text>
      <text x="22" y="39"  textAnchor="middle" fontSize="6" fill="white" fontWeight="700">LEGS</text>
    </svg>
  ),
  upper_lower: (
    <svg viewBox="0 0 44 44" fill="none" className="h-full w-full">
      <rect x="2" y="2"  width="40" height="19" rx="3" fill="#f59e0b"/>
      <rect x="2" y="23" width="40" height="19" rx="3" fill="#f43f5e"/>
      <text x="22" y="14" textAnchor="middle" fontSize="6" fill="white" fontWeight="700">UPPER</text>
      <text x="22" y="35" textAnchor="middle" fontSize="6" fill="white" fontWeight="700">LOWER</text>
    </svg>
  ),
  full_body: (
    <svg viewBox="0 0 44 44" fill="none" className="h-full w-full">
      <rect x="2" y="2" width="40" height="40" rx="4" fill="#6366f1"/>
      <text x="22" y="20" textAnchor="middle" fontSize="7" fill="white" fontWeight="700">FULL</text>
      <text x="22" y="30" textAnchor="middle" fontSize="6" fill="white" opacity="0.85">BODY</text>
    </svg>
  ),
  bro_split: (
    <svg viewBox="0 0 44 44" fill="none" className="h-full w-full">
      {(["#10b981","#0ea5e9","#8b5cf6","#f59e0b","#f43f5e"] as const).map((c, i) => (
        <rect key={i} x={2 + i*8.5} y="2" width="7.5" height="40" rx="2" fill={c}/>
      ))}
    </svg>
  ),
  push_pull: (
    <svg viewBox="0 0 44 44" fill="none" className="h-full w-full">
      <rect x="2" y="2"  width="40" height="19" rx="3" fill="#10b981"/>
      <rect x="2" y="23" width="40" height="19" rx="3" fill="#0ea5e9"/>
      <text x="22" y="14" textAnchor="middle" fontSize="6" fill="white" fontWeight="700">PUSH</text>
      <text x="22" y="35" textAnchor="middle" fontSize="6" fill="white" fontWeight="700">PULL</text>
    </svg>
  ),
};

function SplitVisualIcon({ slug, name }: { slug: string; name: string }) {
  const isCustom = !SPLIT_VISUAL[slug];
  if (isCustom) {
    return (
      <div className="h-full w-full rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
        <span className="text-white font-bold text-xs text-center leading-tight px-1">{name.slice(0,2).toUpperCase()}</span>
      </div>
    );
  }
  return <>{SPLIT_VISUAL[slug]}</>;
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

// ── Exercise movement form icons ──────────────────────────────────────────────

const FORM_ICONS: Record<string, React.ReactNode> = {
  bench: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <line x1="3" y1="22" x2="29" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="25" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="4" y1="18" x2="23" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="4" y1="18" x2="4" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="13" y1="18" x2="13" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="7" y1="11" x2="19" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="5" y="9.5" width="2.5" height="4" rx="0.8" fill="currentColor" opacity="0.6"/>
    <rect x="19.5" y="9.5" width="2.5" height="4" rx="0.8" fill="currentColor" opacity="0.6"/>
  </svg>,
  incline: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <line x1="3" y1="26" x2="25" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="24" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="5" y1="24" x2="22" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="13" y1="19" x2="11" y2="12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="6" y1="12" x2="16" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="4.5" y="10.5" width="2.5" height="4" rx="0.8" fill="currentColor" opacity="0.6" transform="rotate(-18 5.7 12.5)"/>
    <rect x="16" y="7.5" width="2.5" height="4" rx="0.8" fill="currentColor" opacity="0.6" transform="rotate(-18 17.2 9.5)"/>
  </svg>,
  fly: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="16" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="16" y1="12.5" x2="16" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M16 16 Q8 14 4 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <path d="M16 16 Q24 14 28 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <circle cx="4" cy="18" r="1.5" fill="currentColor" opacity="0.6"/>
    <circle cx="28" cy="18" r="1.5" fill="currentColor" opacity="0.6"/>
    <line x1="12" y1="22" x2="15" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="20" y1="22" x2="17" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  ohpress: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="16" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="16" y1="13.5" x2="16" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="11" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="21" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="6" y="12" width="2.5" height="4.5" rx="0.8" fill="currentColor" opacity="0.6"/>
    <rect x="23.5" y="12" width="2.5" height="4.5" rx="0.8" fill="currentColor" opacity="0.6"/>
    <line x1="13" y1="22" x2="12" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="19" y1="22" x2="20" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  raise: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="16" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="16" y1="10.5" x2="16" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="16" y1="14" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="8" cy="10" r="1.8" fill="currentColor" opacity="0.6"/>
    <line x1="16" y1="14" x2="22" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="13" y1="20" x2="12" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="19" y1="20" x2="20" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  row: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="26" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="26" y1="11.5" x2="22" y2="19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="22" y1="14" x2="14" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="14" y1="17" x2="6" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="4" y="15" width="2.5" height="4.5" rx="0.8" fill="currentColor" opacity="0.6"/>
    <line x1="19" y1="19" x2="16" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="21" x2="25" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  pulldown: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <line x1="4" y1="5" x2="28" y2="5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="16" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="16" y1="15.5" x2="16" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="10" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="14" x2="8" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="22" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="14" x2="24" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="13" y1="23" x2="12" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="19" y1="23" x2="20" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  pullup: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <line x1="4" y1="5" x2="28" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="16" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="16" y1="15.5" x2="16" y2="24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="10" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="13" x2="9" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="22" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="13" x2="23" y2="7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="13" y1="24" x2="11" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="19" y1="24" x2="21" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  deadlift: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="22" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="22" y1="10.5" x2="18" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="18" y1="14" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12" y1="19" x2="4" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="2" y="20" width="2.5" height="5" rx="0.8" fill="currentColor" opacity="0.6"/>
    <line x1="15" y1="18" x2="14" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="18" y1="19" x2="20" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  squat: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="16" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="16" y1="9.5" x2="16" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="9" y1="11" x2="23" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="9" y1="11" x2="8" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="23" y1="11" x2="24" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="10" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="22" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="23" x2="8" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="23" x2="24" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  lunge: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="18" y1="8.5" x2="18" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="14" y1="11" x2="22" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="18" y1="16" x2="10" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="22" x2="8" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="18" y1="16" x2="22" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="20" x2="28" y2="20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>,
  curl: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="20" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="20" y1="10.5" x2="20" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="16" y1="12" x2="22" y2="15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M22 15 Q26 18 24 23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <circle cx="24" cy="23" r="2" fill="currentColor" opacity="0.6"/>
    <line x1="16" y1="18" x2="15" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="21" y1="19" x2="23" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  extension: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="16" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="16" y1="9.5" x2="16" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="16" y1="13" x2="22" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M22 11 Q26 9 22 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <circle cx="22" cy="5" r="2" fill="currentColor" opacity="0.6"/>
    <line x1="13" y1="17" x2="12" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="19" y1="17" x2="20" y2="25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
  hip_thrust: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <line x1="3" y1="24" x2="13" y2="24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="10" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="10" y1="20.5" x2="14" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="20" x2="18" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="18" y1="17" x2="23" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="23" y1="22" x2="28" y2="22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="14" y1="15" x2="11" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="18" y1="14" x2="22" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="13" y1="13" x2="23" y2="13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="11" y="11" width="2.5" height="4.5" rx="0.8" fill="currentColor" opacity="0.6"/>
    <rect x="22" y="11" width="2.5" height="4.5" rx="0.8" fill="currentColor" opacity="0.6"/>
  </svg>,
  calf: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="16" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="16" y1="9.5" x2="16" y2="18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="13" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="16" y1="18" x2="12" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="16" y1="18" x2="20" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="12" y1="23" x2="11" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="20" y1="23" x2="21" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="8" y1="29" x2="14" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="18" y1="29" x2="24" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="25" x2="11" y2="29" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="21" y1="25" x2="21" y2="29" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>,
  crunch: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <line x1="3" y1="27" x2="29" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="10" y1="27" x2="14" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="27" x2="18" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 20 Q16 17 18 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    <circle cx="22" cy="17" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="21" y1="19" x2="18" y2="21" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="21" y1="16" x2="17" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="21" y1="16" x2="24" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>,
  plank: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="26" cy="13" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="26" y1="15.5" x2="6" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="6" y1="21" x2="6" y2="27" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="3" y1="27" x2="9" y2="27" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="22" y1="16.5" x2="22" y2="23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="19" y1="23" x2="25" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="21" y1="13" x2="19" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <line x1="25" y1="13" x2="27" y2="11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>,
  cardio: <svg viewBox="0 0 32 32" fill="none" className="h-full w-full">
    <circle cx="20" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.3" fill="currentColor" opacity="0.5"/>
    <line x1="20" y1="8.5" x2="18" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="19" y1="12" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="19" y1="12" x2="24" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="18" y1="16" x2="13" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="18" y1="16" x2="22" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="13" y1="22" x2="10" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="22" y1="21" x2="26" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>,
};

// Map exercise ID → movement key
const EX_MOVEMENT: Record<number, string> = {
  1:"bench",2:"incline",3:"bench",4:"bench",5:"incline",6:"fly",7:"fly",8:"fly",
  9:"extension",10:"bench",11:"ohpress",12:"ohpress",13:"ohpress",14:"raise",
  15:"raise",16:"raise",17:"extension",18:"bench",19:"extension",20:"bench",
  21:"bench",22:"extension",23:"pullup",24:"pullup",25:"pulldown",26:"pulldown",
  27:"row",28:"row",29:"row",30:"row",31:"row",32:"deadlift",33:"deadlift",
  34:"squat",35:"row",36:"fly",37:"curl",38:"curl",39:"curl",40:"curl",41:"curl",
  42:"curl",43:"curl",44:"deadlift",45:"deadlift",46:"squat",47:"squat",48:"squat",
  49:"squat",50:"lunge",51:"squat",52:"pulldown",53:"pulldown",54:"pulldown",
  55:"hip_thrust",56:"hip_thrust",57:"lunge",58:"lunge",59:"lunge",60:"squat",
  61:"deadlift",62:"calf",63:"calf",64:"calf",65:"plank",66:"plank",67:"crunch",
  68:"crunch",69:"crunch",70:"crunch",71:"pullup",72:"crunch",73:"plank",74:"crunch",
  75:"plank",76:"row",77:"plank",78:"crunch",79:"crunch",
};

// Groups of alternative exercises (same movement, different equipment)
const ALT_GROUPS: number[][] = [
  [1,4,8],[2,5],[6,7],[9,10],[23,24,25,26],[27,28,29,30,31],
  [11,12,13],[14,15],[35,36],[37,38,40,41],[39,42,43],[18,20],
  [17,19],[21,22],[46,47,48,49,51],[50,57,58,59],[33,53,54,61],
  [55,56],[62,63,64],[44,45],
];

const ALT_MAP: Record<number, number[]> = {};
ALT_GROUPS.forEach(g => g.forEach(id => { ALT_MAP[id] = g.filter(x => x !== id); }));

// Muscle group tab structure
const MUSCLE_TABS = [
  { key:"chest",     label:"Chest",     muscles:["Chest","Upper Chest","Lower Chest"] },
  { key:"back",      label:"Back",      muscles:["Lats","Upper Back","Lower Back","Traps"] },
  { key:"shoulders", label:"Shoulders", muscles:["Front Delts","Side Delts","Rear Delts"] },
  { key:"arms",      label:"Arms",      muscles:["Biceps","Triceps","Forearms"] },
  { key:"legs",      label:"Legs",      muscles:["Quads","Hamstrings","Glutes","Calves"] },
  { key:"core",      label:"Core",      muscles:["Abs","Obliques"] },
  { key:"cardio",    label:"Cardio",    muscles:["Cardiovascular","Full Body"] },
] as const;

function FormIcon({ exId, color }: { exId: number; color: string }) {
  const key = EX_MOVEMENT[exId] ?? "bench";
  return (
    <div style={{ width:36, height:36, color, backgroundColor:`${color}15`, borderRadius:8 }}
      className="flex items-center justify-center shrink-0 p-1.5">
      {FORM_ICONS[key] ?? FORM_ICONS.bench}
    </div>
  );
}

// ── Exercise picker (muscle group tabs + machine toggle) ───────────────────────

function ExercisePicker({ all, excluded, onAdd, onClose }: {
  all: ExRow[]; excluded: number[]; onAdd: (e: ExRow) => void; onClose: () => void;
}) {
  const [tab, setTab]       = useState<string>("chest");
  const [q, setQ]           = useState("");
  const [selected, setSelected] = useState<ExRow | null>(null);

  const currentTab = MUSCLE_TABS.find(t => t.key === tab) ?? MUSCLE_TABS[0];

  // When searching, show all exercises matching query
  const searchResults = q.length > 1
    ? all.filter(e => !excluded.includes(e.id) && e.name.toLowerCase().includes(q.toLowerCase())).slice(0, 30)
    : null;

  // Exercises for current muscle tab
  const tabExercises = all
    .filter(e => !excluded.includes(e.id))
    .filter(e => currentTab.muscles.some(m => e.muscleGroups.includes(m)));

  // Group by muscle within tab
  const grouped = currentTab.muscles.reduce<Record<string, ExRow[]>>((acc, muscle) => {
    const exs = tabExercises.filter(e => e.muscleGroups.includes(muscle));
    if (exs.length) acc[muscle] = exs;
    return acc;
  }, {});

  // Get alternative variants for selected exercise
  const alts = selected ? (ALT_MAP[selected.id] ?? []).map(id => all.find(e => e.id === id)).filter(Boolean) as ExRow[] : [];
  const hasMachineAlt = alts.some(a => a.equipmentType === "machine" || a.equipmentType === "cable");
  const hasFreeAlt = alts.some(a => ["barbell","dumbbell","kettlebell","bodyweight"].includes(a.equipmentType));
  const showToggle = selected && (hasMachineAlt || hasFreeAlt) && alts.length > 0;

  function handleAdd(ex: ExRow) {
    onAdd(ex);
    setSelected(null);
    setQ("");
  }

  function renderExRow(ex: ExRow) {
    const isSelected = selected?.id === ex.id;
    const color = EQUIPMENT_COLOR[ex.equipmentType] ?? "#6b7280";
    return (
      <div key={ex.id} className="space-y-1">
        <button onClick={() => setSelected(isSelected ? null : ex)}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${isSelected ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted/60"}`}>
          <FormIcon exId={ex.id} color={color} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{ex.name}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{ex.equipmentType}</p>
          </div>
          {isSelected
            ? <button onClick={e => { e.stopPropagation(); handleAdd(ex); }}
                className="shrink-0 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 text-primary-foreground" />
              </button>
            : <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          }
        </button>

        {isSelected && showToggle && (
          <div className="ml-10 flex flex-wrap gap-1.5 pb-1">
            <span className="text-[10px] text-muted-foreground self-center">Switch:</span>
            {alts.map(a => (
              <button key={a.id} onClick={() => handleAdd(a)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-border hover:bg-muted transition-colors">
                <EquipmentIcon type={a.equipmentType} size={12} />
                {a.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-2.5 pb-2 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Exercise</p>
          <button onClick={onClose}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={e => { setQ(e.target.value); setSelected(null); }}
            placeholder="Search exercises…" className="pl-8 h-8 text-sm" />
        </div>
      </div>

      {/* Muscle group tabs */}
      {!q && (
        <div className="flex overflow-x-auto border-b border-border bg-muted/20 px-1 gap-0 scrollbar-none">
          {MUSCLE_TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); }}
              className={`px-3 py-2 text-[11px] font-semibold whitespace-nowrap transition-colors border-b-2 ${tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Exercise list */}
      <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
        {searchResults ? (
          searchResults.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-4">No exercises found</p>
            : searchResults.map(ex => renderExRow(ex))
        ) : (
          Object.entries(grouped).length === 0
            ? <p className="text-xs text-muted-foreground text-center py-4">No exercises in this category</p>
            : Object.entries(grouped).map(([muscle, exs]) => (
              <div key={muscle}>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">{muscle}</p>
                {exs.map(ex => renderExRow(ex))}
              </div>
            ))
        )}
      </div>
    </div>
  );
}

// ── Step 1: Split picker ───────────────────────────────────────────────────────

function SplitPicker({ splits, onSelect, onCreateSplit, onEditSplit, onDeleteSplit }: {
  splits: SplitMeta[];
  onSelect: (s: SplitMeta) => void;
  onCreateSplit: () => void;
  onEditSplit: (s: SplitMeta) => void;
  onDeleteSplit: (id: number) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  async function handleDelete(id: number) {
    await fetch(`/api/fitness/splits/${id}`, { method: "DELETE" });
    onDeleteSplit(id);
    setConfirmDelete(null);
  }

  const isCustom = (s: SplitMeta) => !["ppl","upper_lower","full_body","bro_split","push_pull"].includes(s.slug) && !s.slug.startsWith("system");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Choose a split</h2>
        <p className="text-sm text-muted-foreground">Select the training program for this week</p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {splits.map(s => (
          <div key={s.id} className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-colors group">
            <button onClick={() => onSelect(s)} className="w-full p-4 text-left">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 shrink-0">
                  <SplitVisualIcon slug={s.slug} name={s.name} />
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
            {isCustom(s) && (
              <div className="flex items-center gap-2 px-4 pb-3 pt-0">
                <button onClick={() => onEditSplit(s)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-3 w-3" /> Edit
                </button>
                {confirmDelete === s.id
                  ? (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[11px] text-muted-foreground">Delete?</span>
                      <button onClick={() => handleDelete(s.id)} className="text-[11px] text-rose-500 hover:text-rose-400 font-medium">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(s.id)} className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-rose-400 transition-colors">
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  )
                }
              </div>
            )}
          </div>
        ))}

        <button onClick={onCreateSplit}
          className="rounded-xl border border-dashed border-border bg-card p-4 text-left hover:border-violet-400/50 hover:bg-violet-500/5 transition-colors group">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 shrink-0 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center">
              <Plus className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="font-semibold text-sm group-hover:text-violet-500 transition-colors">Create your own split</p>
              <p className="text-xs text-muted-foreground mt-0.5">Build a custom program with your own muscle groups</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Custom split creator ───────────────────────────────────────────────────────

type CustomGroup = { name: string; exercises: ExRow[] };

function CustomSplitCreator({ allExercises, onCreated, onBack, initialSplit }: {
  allExercises: ExRow[];
  onCreated: (split: SplitMeta) => void;
  onBack: () => void;
  initialSplit?: SplitMeta;
}) {
  const isEditing = !!initialSplit;
  const [splitName, setSplitName]   = useState(initialSplit?.name ?? "");
  const [groups, setGroups]         = useState<CustomGroup[]>(
    initialSplit?.groups.length
      ? initialSplit.groups.map(g => ({
          name: g.name,
          exercises: allExercises.filter(e => g.defaultExerciseIds.includes(e.id)),
        }))
      : [{ name: "", exercises: [] }]
  );
  const [pickerGroupIdx, setPickerGroupIdx] = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  function addGroup() {
    setGroups(prev => [...prev, { name: "", exercises: [] }]);
  }

  function updateGroupName(idx: number, name: string) {
    setGroups(prev => prev.map((g, i) => i === idx ? { ...g, name } : g));
  }

  function removeGroupExercise(groupIdx: number, exId: number) {
    setGroups(prev => prev.map((g, i) => i === groupIdx
      ? { ...g, exercises: g.exercises.filter(e => e.id !== exId) }
      : g
    ));
  }

  function addExerciseToGroup(groupIdx: number, ex: ExRow) {
    setGroups(prev => prev.map((g, i) => i === groupIdx
      ? { ...g, exercises: [...g.exercises, ex] }
      : g
    ));
    setPickerGroupIdx(null);
  }

  async function handleSave() {
    if (!splitName.trim()) { setError("Split name is required."); return; }
    if (groups.some(g => !g.name.trim())) { setError("All groups need a name."); return; }
    setSaving(true); setError("");
    try {
      const body = {
        name: splitName.trim(),
        groups: groups.map(g => ({ name: g.name.trim(), exerciseIds: g.exercises.map(e => e.id) })),
      };
      const url = isEditing ? `/api/fitness/splits/${initialSplit!.id}` : "/api/fitness/splits";
      const res = await fetch(url, { method: isEditing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setError("Failed to save split."); return; }
      const saved: SplitMeta = await res.json();
      onCreated(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </button>
      <div>
        <h2 className="text-lg font-bold">{isEditing ? "Edit split" : "Create your own split"}</h2>
        <p className="text-sm text-muted-foreground">Name it and add muscle groups with exercises</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Split name</p>
        <Input value={splitName} onChange={e => setSplitName(e.target.value)} placeholder="e.g. My PPL, Push A, etc." />
      </div>

      <div className="space-y-3">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input value={g.name} onChange={e => updateGroupName(gi, e.target.value)}
                placeholder={`Group ${gi + 1} name (e.g. Push, Pull, Legs…)`} className="h-8 text-sm" />
              {groups.length > 1 && (
                <button onClick={() => setGroups(prev => prev.filter((_, i) => i !== gi))}
                  className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {g.exercises.length > 0 && (
              <div className="space-y-1">
                {g.exercises.map(ex => (
                  <div key={ex.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/40">
                    <EquipmentIcon type={ex.equipmentType} size={20} />
                    <span className="text-xs flex-1">{ex.name}</span>
                    <CategoryBadge cat={ex.category} />
                    <button onClick={() => removeGroupExercise(gi, ex.id)}
                      className="text-muted-foreground hover:text-rose-400 transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {pickerGroupIdx === gi
              ? <ExercisePicker
                  all={allExercises}
                  excluded={g.exercises.map(e => e.id)}
                  onAdd={ex => addExerciseToGroup(gi, ex)}
                  onClose={() => setPickerGroupIdx(null)}
                />
              : (
                <button onClick={() => setPickerGroupIdx(gi)}
                  className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                  <Plus className="h-3 w-3" /> Add Exercise
                </button>
              )
            }
          </div>
        ))}

        <button onClick={addGroup}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          <Plus className="h-4 w-4" /> Add Group
        </button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      <Button className="w-full" onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
        Save Split
      </Button>
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
            className={`w-full rounded-xl border p-4 text-left transition-colors ${selected === o.value ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/20"}`}>
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

function ExerciseConfigurator({ groups, allExercises, loading, pendingMode, onBack, onSave }: {
  groups: WeekGroup[];
  allExercises: ExRow[];
  loading: boolean;
  pendingMode?: boolean;
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
    if (pendingMode) {
      setLocalGroups(prev => prev.map((g, i) => i !== activeGroupIdx ? g : {
        ...g, exercises: g.exercises.filter(ex => ex.id !== wgeId),
      }));
      return;
    }
    await fetch(`/api/fitness/week-group-exercises/${wgeId}`, { method: "DELETE" });
    setLocalGroups(prev => prev.map((g, i) => i !== activeGroupIdx ? g : {
      ...g, exercises: g.exercises.filter(ex => ex.id !== wgeId),
    }));
  }

  async function addExercise(ex: ExRow) {
    setShowPicker(false);
    if (pendingMode) {
      const newEx: WGExercise = {
        id: Date.now(), // temp local id
        exerciseId: ex.id,
        exerciseName: ex.name,
        category: ex.category,
        equipmentType: ex.equipmentType,
        targetSets: 3,
        targetReps: 10,
        targetWeight: null,
        lastWeight: null,
      };
      setLocalGroups(prev => prev.map((g, i) => i !== activeGroupIdx ? g : {
        ...g, exercises: [...g.exercises, newEx],
      }));
      return;
    }
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
    try {
      if (!pendingMode) {
        await Promise.all(localGroups.flatMap(g =>
          g.exercises.flatMap(ex => [
            patchExercise(ex.id, "targetSets",   ex.targetSets),
            patchExercise(ex.id, "targetReps",   ex.targetReps),
            patchExercise(ex.id, "targetWeight", ex.targetWeight ?? 0),
          ])
        ));
      }
      await onSave(localGroups);
    } finally {
      setSaving(false);
    }
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
            className={`flex-1 min-w-fit px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
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
              <EquipmentIcon type={ex.equipmentType} size={32} />
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
        {pendingMode ? "Save Plan" : "Save Plan"}
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

  function setExWeight(wgeId: number, val: string) {
    setSets(prev => prev.map(s => s.weekGroupExerciseId === wgeId ? { ...s, actualWeight: val } : s));
  }
  function setExReps(wgeId: number, val: string) {
    setSets(prev => prev.map(s => s.weekGroupExerciseId === wgeId ? { ...s, actualReps: val } : s));
  }
  function completeEx(wgeId: number, done: boolean) {
    setSets(prev => prev.map(s => s.weekGroupExerciseId === wgeId ? { ...s, completed: done } : s));
  }
  function completeAll() {
    setSets(prev => prev.map(s => ({ ...s, completed: true })));
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
              className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-primary/50 hover:bg-muted/30 transition-colors group">
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

  const allComplete = completedCount === totalCount && totalCount > 0;

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
        <button
          onClick={completeAll}
          disabled={allComplete}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            allComplete
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
              : "bg-muted text-muted-foreground border-border hover:text-emerald-400 hover:border-emerald-400/50"
          }`}
        >
          <Check className="h-3 w-3" />
          {allComplete ? "All done!" : "Done All"}
        </button>
      </div>

      {/* Exercise cards */}
      {Array.from(exerciseMap.values()).map(({ ex, sets: exSets }) => {
        const allDone = exSets.every(s => s.draft.completed);
        const firstDraft = exSets[0]?.draft;
        return (
          <div key={ex.id} className={`rounded-xl border bg-card overflow-hidden transition-colors ${allDone ? "border-emerald-500/40" : "border-border"}`}>
            {/* Exercise header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <EquipmentIcon type={ex.equipmentType} size={32} />
              <span className="font-semibold text-sm flex-1">{ex.exerciseName}</span>
              {ex.lastWeight !== null && (
                <span className="text-[11px] text-muted-foreground shrink-0">Last: {ex.lastWeight}kg</span>
              )}
              {allDone && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
            </div>

            {/* Weight · Reps · Complete-all row */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/20">
              <input
                type="number"
                value={firstDraft?.actualWeight ?? ""}
                onChange={e => setExWeight(ex.id, e.target.value)}
                placeholder={ex.targetWeight ? String(ex.targetWeight) : "kg"}
                className="w-20 h-8 rounded-lg border border-border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">kg ×</span>
              <input
                type="number"
                value={firstDraft?.actualReps ?? ""}
                onChange={e => setExReps(ex.id, e.target.value)}
                placeholder={String(ex.targetReps ?? 10)}
                className="w-14 h-8 rounded-lg border border-border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">reps</span>
              <div className="flex-1" />
              <button
                onClick={() => completeEx(ex.id, !allDone)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  allDone
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : "bg-background text-muted-foreground border-border hover:text-emerald-400 hover:border-emerald-400/50"
                }`}
              >
                <Check className="h-3 w-3" />
                {allDone ? "Done" : `All ${exSets.length} sets`}
              </button>
            </div>

            {/* Set tap targets */}
            <div className="flex flex-wrap gap-2.5 px-4 py-3">
              {exSets.map(({ draft: s, idx }) => (
                <button
                  key={idx}
                  onClick={() => toggleSet(idx)}
                  className={`h-12 w-12 rounded-xl border-2 flex items-center justify-center font-bold transition-colors ${
                    s.completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border hover:border-emerald-400/60 text-muted-foreground"
                  }`}
                >
                  {s.completed ? <Check className="h-4 w-4" /> : <span className="text-sm">{s.setNumber}</span>}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {saveError && <p className="text-xs text-rose-400 text-center">{saveError}</p>}

      <Button className="w-full" size="lg" onClick={save} disabled={saving || completedCount === 0}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
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
  | { type: "workout"; date: string }
  | { type: "create-split" }
  | { type: "edit-split"; split: SplitMeta };

function PlanTab({ allExercises }: { allExercises: ExRow[] }) {
  const [weekStart, setWeekStart]   = useState(() => getMondayOf(new Date()));
  const [plan, setPlan]             = useState<WeekPlan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [splits, setSplits]         = useState<SplitMeta[]>([]);
  const [view, setView]             = useState<PlanView>({ type: "week" });
  const [addingSplit, setAddingSplit] = useState(false);
  const [configuringGroups, setConfiguringGroups] = useState<WeekGroup[] | null>(null);
  const [pendingMode, setPendingMode] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<PendingSplitConfig | null>(null);

  const loadPlan = useCallback(async (ws: string) => {
    setLoadingPlan(true);
    try {
      const res = await fetch(`/api/fitness/week-plan?weekStart=${ws}`);
      const data = await res.json();
      setPlan(data ?? null);
    } finally {
      setLoadingPlan(false);
    }
  }, []);

  useEffect(() => { loadPlan(weekStart); }, [weekStart, loadPlan]);

  useEffect(() => {
    fetch("/api/fitness/splits").then(r => r.json()).then(d => { if (Array.isArray(d)) setSplits(d); });
  }, []);

  // Returns all available groups the user hasn't logged for a given date
  function getAvailableGroups(date: string): WeekGroup[] {
    if (!plan) return [];
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

  // Convert PendingSplitConfig groups to WeekGroup shape for the configurator
  function pendingGroupsToWeekGroups(pg: PendingGroup[]): WeekGroup[] {
    return pg.map((g, gi) => ({
      id: -(gi + 1), // negative ids signal pending
      name: g.name,
      splitGroupId: g.splitGroupId,
      sortOrder: g.sortOrder,
      exercises: g.exercises.map((ex, ei) => ({
        id: -(gi * 1000 + ei + 1),
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        category: ex.category,
        equipmentType: ex.equipmentType,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        targetWeight: ex.targetWeight,
        lastWeight: ex.lastWeight,
      })),
    }));
  }

  // Convert WeekGroup[] back to batch API format for pending mode save
  async function savePendingPlan(cfg: PendingSplitConfig, updatedGroups: WeekGroup[], weekStartDate: string) {
    const res = await fetch("/api/fitness/week-plan/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        weekStart: weekStartDate,
        splits: [{
          splitId: cfg.splitId,
          frequency: cfg.frequency,
          groups: updatedGroups.map((g, gi) => ({
            splitGroupId: cfg.groups[gi]?.splitGroupId ?? g.splitGroupId,
            name: g.name,
            sortOrder: g.sortOrder,
            exercises: g.exercises.map(ex => ({
              exerciseId: ex.exerciseId,
              exerciseName: ex.exerciseName,
              category: ex.category,
              equipmentType: ex.equipmentType,
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              targetWeight: ex.targetWeight,
              sortOrder: 0,
            })),
          })),
        }],
      }),
    });
    if (!res.ok) throw new Error("Failed to save plan");
    const created: WeekPlan = await res.json();
    setPlan(created);
  }

  async function handleSplitSelected(split: SplitMeta, frequency: number) {
    if (pendingMode) {
      // Fetch defaults, no DB write. API returns a flat array of groups.
      const res = await fetch(`/api/fitness/splits/${split.id}/defaults`);
      if (!res.ok) return;
      const defaultGroups: Array<{ splitGroupId: number; name: string; sortOrder: number; exercises: Array<{ exerciseId: number; exerciseName: string; category: string; equipmentType: string; targetSets: number; targetReps: number; targetWeight: number | null; lastWeight: number | null; sortOrder: number }> }> = await res.json();
      const cfg: PendingSplitConfig = {
        splitId: split.id,
        splitName: split.name,
        splitSlug: split.slug,
        frequency,
        groups: defaultGroups.map(g => ({
          splitGroupId: g.splitGroupId,
          name: g.name,
          sortOrder: g.sortOrder,
          exercises: g.exercises.map(ex => ({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            category: ex.category,
            equipmentType: ex.equipmentType,
            targetSets: ex.targetSets,
            targetReps: ex.targetReps,
            targetWeight: ex.targetWeight,
            lastWeight: ex.lastWeight,
            sortOrder: ex.sortOrder,
          })),
        })),
      };
      setPendingConfig(cfg);
      setConfiguringGroups(pendingGroupsToWeekGroups(cfg.groups));
      // Need a fake WeekSplit for the configure view
      const fakeSplit: WeekSplit = {
        id: -1,
        splitId: split.id,
        splitName: split.name,
        splitSlug: split.slug,
        frequency,
        groups: pendingGroupsToWeekGroups(cfg.groups),
      };
      setView({ type: "configure", weekSplitData: fakeSplit });
      return;
    }

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

  if (view.type === "create-split") {
    return (
      <CustomSplitCreator
        allExercises={allExercises}
        onCreated={newSplit => {
          setSplits(prev => [...prev, newSplit]);
          setView({ type: "pick-freq", split: newSplit });
        }}
        onBack={() => setView({ type: "pick-split" })}
      />
    );
  }

  if (view.type === "edit-split") {
    return (
      <CustomSplitCreator
        allExercises={allExercises}
        initialSplit={view.split}
        onCreated={updated => {
          setSplits(prev => prev.map(s => s.id === updated.id ? updated : s));
          setView({ type: "pick-split" });
        }}
        onBack={() => setView({ type: "pick-split" })}
      />
    );
  }

  if (view.type === "pick-split") {
    return (
      <div className="space-y-4">
        <button onClick={() => {
          setPendingMode(false);
          setPendingConfig(null);
          setView({ type:"week" });
        }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <SplitPicker
          splits={splits}
          onSelect={s => setView({ type:"pick-freq", split: s })}
          onCreateSplit={() => setView({ type: "create-split" })}
          onEditSplit={s => setView({ type: "edit-split", split: s })}
          onDeleteSplit={id => setSplits(prev => prev.filter(s => s.id !== id))}
        />
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
        pendingMode={pendingMode}
        onBack={() => {
          if (pendingMode) {
            setPendingMode(false);
            setPendingConfig(null);
          }
          setView({ type:"week" });
        }}
        onSave={async (updatedGroups) => {
          if (pendingMode && pendingConfig) {
            await savePendingPlan(pendingConfig, updatedGroups, weekStart);
            setPendingMode(false);
            setPendingConfig(null);
          } else {
            await loadPlan(weekStart);
          }
          setView({ type:"week" });
        }}
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
          <Button size="sm" onClick={() => {
            setPendingMode(true);
            setView({ type: "pick-split" });
          }}>
            <Plus className="h-4 w-4 mr-1.5" />
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
  const [points, setPoints]                   = useState<ProgressPt[]>([]);
  const [summary, setSummary]                 = useState<ProgressSummary | null>(null);
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
      .then(d => {
        if (d && typeof d === "object" && "points" in d) {
          setPoints(d.points ?? []);
          setSummary(d.summary ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  const conv = (kg: number) => unit === "kg" ? kg : Math.round(kg * 2.205 * 10) / 10;
  const u    = unit;
  const chartData = points.map(p => ({ date: fmtDate(p.date), weight: conv(p.maxWeight), e1RM: conv(p.max1RM) }));

  if (loggedExercises.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Log some workouts first to see progress.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Select exercise</p>
        <div className="flex rounded-lg border border-border overflow-hidden text-xs font-medium">
          {(["kg","lbs"] as const).map(uu => (
            <button key={uu} onClick={() => setUnit(uu)}
              className={`px-3 py-2 transition-colors ${unit === uu ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {uu}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {CATS.filter(cat => loggedExercises.some(e => e.category === cat)).map(cat => (
          <div key={cat}>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: CAT_COLOR[cat] }}>{cat}</p>
            <div className="flex flex-wrap gap-1.5">
              {loggedExercises.filter(e => e.category === cat).map(ex => (
                <button key={ex.id} onClick={() => setSelectedId(ex.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                    selectedId === ex.id
                      ? "border-transparent text-black"
                      : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"
                  }`}
                  style={selectedId === ex.id ? { backgroundColor: CAT_COLOR[cat] } : {}}>
                  {ex.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">PR</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{conv(summary.pr)}<span className="text-xs font-normal text-muted-foreground ml-0.5">{u}</span></p>
                {summary.prDate && <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(summary.prDate)}</p>}
              </div>
              <div className="rounded-xl border border-border bg-card p-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Sessions</p>
                <p className="text-xl font-bold tabular-nums mt-0.5">{summary.totalSessions}</p>
                {summary.lastTrained && <p className="text-[10px] text-muted-foreground mt-0.5">Last {fmtDate(summary.lastTrained)}</p>}
              </div>
              <div className="rounded-xl border border-border bg-card p-3 col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">vs previous session</p>
                {summary.delta !== null ? (
                  <p className={`text-xl font-bold tabular-nums mt-0.5 ${summary.delta > 0 ? "text-emerald-400" : summary.delta < 0 ? "text-rose-400" : "text-muted-foreground"}`}>
                    {summary.delta > 0 ? "+" : ""}{conv(summary.delta)}{u}
                  </p>
                ) : (
                  <p className="text-xl font-bold text-muted-foreground mt-0.5">—</p>
                )}
              </div>
            </div>
          )}

          {points.length >= 2 && (
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
        </>
      )}
    </div>
  );
}

// ── Muscles tab ────────────────────────────────────────────────────────────────

function daysSince(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso + "T00:00:00").getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}

const daysAgoOf = (iso: string) => Math.floor((Date.now() - new Date(iso + "T00:00:00").getTime()) / 86400000);

const CAT_LABEL: Record<string, string> = {
  push: "Push", pull: "Pull", legs: "Legs", core: "Core", cardio: "Cardio", other: "Other",
};

type CatGroup = { category: string; sets: number; sessions: number; lastTrained: string };

function groupByCategory(data: MuscleFreq[]): CatGroup[] {
  const agg: Record<string, CatGroup> = {};
  for (const d of data) {
    const cat = d.category;
    if (!agg[cat]) agg[cat] = { category: cat, sets: 0, sessions: 0, lastTrained: d.lastTrained };
    agg[cat].sets += d.sets;
    agg[cat].sessions = Math.max(agg[cat].sessions, d.sessions);
    if (d.lastTrained > agg[cat].lastTrained) agg[cat].lastTrained = d.lastTrained;
  }
  return Object.values(agg).sort((a, b) => b.sets - a.sets);
}

function trendArrow(cur: number, prv: number): { symbol: string; color: string } | null {
  if (prv === 0) return null;
  const ratio = cur / prv;
  if (ratio > 1.1) return { symbol: "↑", color: "#10b981" };
  if (ratio < 0.9) return { symbol: "↓", color: "#f43f5e" };
  return { symbol: "→", color: "#6b7280" };
}

function MusclesTab() {
  const [days, setDays]       = useState(7);
  const [current, setCurrent] = useState<MuscleFreq[]>([]);
  const [prev, setPrev]       = useState<MuscleFreq[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/fitness/muscles?days=${days}`).then(r => r.json()),
      fetch(`/api/fitness/muscles?days=${days}&offset=${days}`).then(r => r.json()),
    ]).then(([cur, prv]) => {
      if (Array.isArray(cur)) setCurrent(cur);
      if (Array.isArray(prv)) setPrev(prv);
    }).finally(() => setLoading(false));
  }, [days]);

  const groups      = groupByCategory(current);
  const prevMap     = Object.fromEntries(groupByCategory(prev).map(g => [g.category, g.sets]));
  const target      = Math.round(10 * days / 7);
  const maxSets     = Math.max(...groups.map(g => g.sets), target, 1);
  const weeksInWin  = days / 7;
  const totalSets   = groups.reduce((s, g) => s + g.sets, 0);
  const onTarget    = groups.filter(g => g.sets >= target).length;
  const pushSets    = groups.find(g => g.category === "push")?.sets ?? 0;
  const pullSets    = groups.find(g => g.category === "pull")?.sets ?? 0;
  const ppRatio     = pullSets > 0 ? pushSets / pullSets : null;
  const ppColor     = ppRatio == null ? "#6b7280" : ppRatio <= 1.2 ? "#10b981" : ppRatio <= 1.6 ? "#f59e0b" : "#f43f5e";
  const pushPct     = (pushSets + pullSets) > 0 ? (pushSets / (pushSets + pullSets)) * 100 : 50;
  const trainToday  = groups
    .filter(g => daysAgoOf(g.lastTrained) >= 5)
    .sort((a, b) => daysAgoOf(b.lastTrained) - daysAgoOf(a.lastTrained))
    .slice(0, 3);

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
        ? Array.from({length:5},(_,i)=><div key={i} className="h-10 rounded-xl bg-muted animate-pulse"/>)
        : groups.length === 0
          ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No completed workouts in this window.</p>
            </div>
          )
          : (
            <div className="space-y-5">

              {/* Summary stat cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Sets</p>
                  <p className="text-lg font-bold tabular-nums leading-none">{totalSets}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{days}d window</p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Push:Pull</p>
                  {ppRatio != null
                    ? <>
                        <p className="text-lg font-bold tabular-nums leading-none" style={{ color: ppColor }}>{ppRatio.toFixed(1)}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: ppColor }}>
                          {ppRatio <= 1.2 ? "Balanced" : ppRatio <= 1.6 ? "Slightly off" : "Too push-heavy"}
                        </p>
                      </>
                    : <p className="text-sm text-muted-foreground mt-1">—</p>
                  }
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">On Target</p>
                  <p className="text-lg font-bold tabular-nums leading-none">{onTarget}<span className="text-sm font-normal text-muted-foreground">/{groups.length}</span></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{target}+ sets each</p>
                </div>
              </div>

              {/* Train today callout */}
              {trainToday.length > 0 && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1">Train Today</p>
                  <p className="text-sm font-semibold">
                    {trainToday.map(g => CAT_LABEL[g.category] ?? g.category).join(", ")}
                  </p>
                </div>
              )}

              {/* Category rows */}
              <div className="space-y-4">
                {groups.map(g => {
                  const color     = CAT_COLOR[g.category] ?? "#6b7280";
                  const da        = daysAgoOf(g.lastTrained);
                  const freshHex  = da <= 2 ? "#10b981" : da <= 4 ? "#f59e0b" : "#f43f5e";
                  const trend     = trendArrow(g.sets, prevMap[g.category] ?? 0);
                  const barPct    = (g.sets / maxSets) * 100;
                  const targetPct = (target / maxSets) * 100;
                  const freqLabel = weeksInWin <= 1
                    ? `${g.sessions}×`
                    : `${(g.sessions / weeksInWin).toFixed(1)}×/wk`;

                  return (
                    <div key={g.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{CAT_LABEL[g.category] ?? g.category}</span>
                          {trend && (
                            <span className="text-xs font-bold" style={{ color: trend.color }}>{trend.symbol}</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">{freqLabel}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs tabular-nums text-muted-foreground">{g.sets} sets</span>
                          <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: freshHex }}>{daysSince(g.lastTrained)}</span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-muted">
                        <div className="h-full rounded-full transition-[width] duration-500 overflow-hidden absolute inset-0"
                          style={{ width: `${barPct}%`, backgroundColor: color }} />
                        <div className="absolute top-0 h-full w-px bg-foreground/40 z-10"
                          style={{ left: `${targetPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <span className="inline-block w-px h-3 bg-foreground/40" />
                target: {target} sets / {days}d
              </p>

              {/* Push:Pull balance bar */}
              {pushSets > 0 && pullSets > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Push · Pull Balance</p>
                  <div className="h-3 rounded-full overflow-hidden flex">
                    <div className="h-full transition-[width] duration-500" style={{ width: `${pushPct}%`, backgroundColor: CAT_COLOR.push ?? "#10b981" }} />
                    <div className="h-full flex-1" style={{ backgroundColor: CAT_COLOR.pull ?? "#0ea5e9" }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span style={{ color: CAT_COLOR.push }}>Push {Math.round(pushPct)}%</span>
                    <span style={{ color: CAT_COLOR.pull }}>Pull {Math.round(100 - pushPct)}%</span>
                  </div>
                </div>
              )}
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
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors ${
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
