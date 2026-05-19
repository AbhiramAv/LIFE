"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Heart, Target, Activity, DollarSign, Camera, ArrowRight,
  BarChart2, CalendarDays, LayoutDashboard, ChevronDown, X, Plus,
} from "lucide-react";
import { type IssueStatus } from "@/lib/types/goals";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyIssue = {
  id: number; projectId: number; title: string;
  status: string; projectTitle: string; projectColor: string;
  inSprint: boolean; completedAt: string | null; createdAt: string;
};
type HabitLogDay  = { date: string; completed: number };
type WorkoutDay   = { date: string };
type Habit        = { id: number; name: string; biggerGoal: string | null; color: string; targetDaysPerWeek: number };
type HabitLog     = { habitId: number; date: string; completed: boolean; logStatus: string };
type WeekCount    = { habitId: number; doneThisWeek: number };
type PendingDone  = { type: "issue" | "habit"; id: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MOOD_EMOJIS: Record<number, string> = { 2: "😭", 4: "😔", 6: "😐", 8: "😊", 10: "🤩" };
function closestEmoji(value: number): string {
  const keys = [2, 4, 6, 8, 10];
  return MOOD_EMOJIS[keys.reduce((a, b) => Math.abs(b - value) < Math.abs(a - value) ? b : a)];
}

// Deterministic color per bigger goal string
const GOAL_PALETTE = ["#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#a855f7","#ec4899","#14b8a6","#84cc16"];
function biggerGoalColor(goal: string | null, fallback: string): string {
  if (!goal) return fallback;
  let h = 0;
  for (const c of goal) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GOAL_PALETTE[h % GOAL_PALETTE.length];
}

// ─── Done confirmation modal ──────────────────────────────────────────────────

function DoneModal({ pending, onConfirm, onCancel }: {
  pending: PendingDone;
  onConfirm: (choice: "completed" | "cancelled") => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-background border border-border rounded-xl p-5 shadow-xl space-y-3 w-60">
        <p className="text-sm font-semibold text-center">
          {pending.type === "habit" ? "How'd it go?" : "Mark ticket as…"}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onConfirm("completed")}
            className="flex-1 text-xs font-medium py-2 rounded-lg border transition-colors"
            style={{ backgroundColor: "#10b98115", color: "#10b981", borderColor: "#10b98130" }}
          >
            ✓ {pending.type === "habit" ? "Done" : "Completed"}
          </button>
          <button
            onClick={() => onConfirm("cancelled")}
            className="flex-1 text-xs font-medium py-2 rounded-lg border transition-colors"
            style={{ backgroundColor: "#f43f5e15", color: "#f43f5e", borderColor: "#f43f5e30" }}
          >
            ✕ {pending.type === "habit" ? "Skipped" : "Cancelled"}
          </button>
        </div>
        <button onClick={onCancel} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({ id, title, icon, children }: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const v = localStorage.getItem(`section-${id}`);
    if (v !== null) setOpen(v === "true");
  }, [id]);

  function toggle() {
    setOpen((o) => { localStorage.setItem(`section-${id}`, String(!o)); return !o; });
  }

  return (
    <div className="space-y-3">
      <button onClick={toggle} className="flex items-center gap-2 w-full group">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{open ? "collapse" : "expand"}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
        </span>
      </button>
      {open && children}
    </div>
  );
}

// ─── Sprint Drawer ────────────────────────────────────────────────────────────

function SprintDrawer({ open, onClose, sprintIds, onToggle }: {
  open: boolean; onClose: () => void;
  sprintIds: Set<number>; onToggle: (id: number, inSprint: boolean) => void;
}) {
  const [allIssues, setAllIssues] = useState<AnyIssue[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !allIssues) {
      setLoading(true);
      fetch("/api/issues").then((r) => r.json()).then((data) => {
        setAllIssues(Array.isArray(data) ? data : []);
        setLoading(false);
      });
    }
  }, [open, allIssues]);

  const backlog = useMemo(
    () => allIssues?.filter((i) => !sprintIds.has(i.id) && !["done","cancelled","skipped"].includes(i.status)) ?? [],
    [allIssues, sprintIds]
  );
  const inSprint = useMemo(() => allIssues?.filter((i) => sprintIds.has(i.id)) ?? [], [allIssues, sprintIds]);

  const byProject = useMemo(() => {
    const g: Record<string, { color: string; issues: AnyIssue[] }> = {};
    backlog.forEach((i) => {
      if (!g[i.projectTitle]) g[i.projectTitle] = { color: i.projectColor, issues: [] };
      g[i.projectTitle].issues.push(i);
    });
    return g;
  }, [backlog]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-[440px] max-w-full bg-background border-l border-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-sm">Plan this week</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{inSprint.length} tickets in sprint</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 border-r border-border space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Backlog</p>
            {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
            {!loading && Object.keys(byProject).length === 0 && (
              <p className="text-xs text-muted-foreground italic">All tickets are in the sprint.</p>
            )}
            {Object.entries(byProject).map(([proj, { color, issues }]) => (
              <div key={proj} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <p className="text-[10px] font-semibold text-muted-foreground truncate">{proj}</p>
                </div>
                {issues.map((issue) => (
                  <button key={issue.id} onClick={() => onToggle(issue.id, true)}
                    className="group w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2 transition-colors">
                    <span className="flex-1 truncate">{issue.title}</span>
                    <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">This week</p>
            {inSprint.length === 0 && <p className="text-xs text-muted-foreground italic">← Click tickets to add</p>}
            {inSprint.map((issue) => (
              <div key={issue.id} className="flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs border"
                style={{ borderColor: `${issue.projectColor}40`, backgroundColor: `${issue.projectColor}10` }}>
                <div className="h-2 w-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: issue.projectColor }} />
                <span className="flex-1 leading-snug">{issue.title}</span>
                <button onClick={() => onToggle(issue.id, false)} className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0 mt-0.5">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

const STATUS_CYCLE: Record<string, string> = {
  backlog: "in_progress", todo: "in_progress",
  in_progress: "done", in_review: "done",
  done: "todo", cancelled: "todo", skipped: "todo",
};
const DONE_STATUSES = ["done", "cancelled", "skipped"];

const STATUS_TAG: Record<string, { label: string; color: string }> = {
  done:      { label: "done",      color: "#10b981" },
  cancelled: { label: "cancelled", color: "#f43f5e" },
  skipped:   { label: "skipped",   color: "#f59e0b" },
  completed: { label: "done",      color: "#10b981" },
  missed:    { label: "missed",    color: "#6b7280" },
};

type DragInfo = { type: "issue" | "habit"; id: number };

function IssueCard({ issue, onRequestDone, onStatusChange, onDragStart, onDragEnd }: {
  issue: AnyIssue;
  onRequestDone: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const isDone = DONE_STATUSES.includes(issue.status);
  const tag = isDone ? STATUS_TAG[issue.status] : null;
  const nextStatus = STATUS_CYCLE[issue.status] ?? "todo";
  const goingToDone = nextStatus === "done";

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      className="rounded-lg border bg-card p-3 space-y-2.5 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing select-none"
      style={{ borderColor: `${issue.projectColor}30`, borderLeftWidth: 3, borderLeftColor: issue.projectColor }}
    >
      <p className={`text-xs font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
        {issue.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-[110px]"
          style={{ backgroundColor: `${issue.projectColor}20`, color: issue.projectColor }}>
          {issue.projectTitle}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {tag && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>{tag.label}</span>
          )}
          {!isDone && (
            <button
              onClick={() => goingToDone ? onRequestDone(issue.id) : onStatusChange(issue.id, nextStatus)}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
            >
              → {nextStatus === "in_progress" ? "Start" : "Done"}
            </button>
          )}
          {isDone && (
            <button onClick={() => onStatusChange(issue.id, "todo")}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-muted transition-all">
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitCard({ habit, weekDone, alreadyDoneToday, onRequestDone, onDragStart, onDragEnd }: {
  habit: Habit; weekDone: number; alreadyDoneToday: boolean;
  onRequestDone: () => void; onDragStart: () => void; onDragEnd: () => void;
}) {
  const remaining = habit.targetDaysPerWeek - weekDone;
  const doneForWeek = remaining <= 0;
  const C = biggerGoalColor(habit.biggerGoal, habit.color);

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      className="rounded-lg border bg-card p-3 space-y-2.5 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing select-none"
      style={{ borderColor: `${C}30`, borderLeftWidth: 3, borderLeftColor: C }}
    >
      <p className={`text-xs font-medium leading-snug ${doneForWeek ? "line-through text-muted-foreground" : ""}`}>
        {habit.biggerGoal ?? habit.name}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: `${C}20`, color: C }}>{habit.name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {doneForWeek ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#10b98120", color: "#10b981" }}>
              done this week ✓
            </span>
          ) : alreadyDoneToday ? (
            <span className="text-[10px] text-muted-foreground">✓ today · {remaining}× left</span>
          ) : (
            <>
              <span className="text-[10px] text-muted-foreground">{remaining}× left</span>
              <button onClick={onRequestDone}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all">
                Done today
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type BoardCard = { kind: "issue"; issue: AnyIssue } | { kind: "habit"; habit: Habit };

const COL_STATUS: Record<string, string> = { todo: "todo", in_progress: "in_progress", done: "done" };

function KanbanColumn({ title, color, columnKey, cards, weekCounts, todayLogs, onRequestDone, onStatusChange, dragging, setDragging }: {
  title: string; color: string; columnKey: string; cards: BoardCard[];
  weekCounts: Record<number, number>; todayLogs: HabitLog[];
  onRequestDone: (pending: PendingDone) => void;
  onStatusChange: (id: number, status: string) => void;
  dragging: DragInfo | null; setDragging: (d: DragInfo | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const today = localToday();

  return (
    <div
      className={`space-y-2 min-w-0 rounded-lg transition-colors ${dragOver ? "bg-accent/40 ring-1 ring-border" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => {
        setDragOver(false);
        if (!dragging) return;
        if (dragging.type === "issue" && columnKey === "done") {
          onRequestDone({ type: "issue", id: dragging.id });
        } else if (dragging.type === "issue") {
          onStatusChange(dragging.id, COL_STATUS[columnKey] ?? "todo");
        } else if (dragging.type === "habit" && columnKey === "done") {
          onRequestDone({ type: "habit", id: dragging.id });
        }
        setDragging(null);
      }}
    >
      <div className="flex items-center gap-2 pb-1.5 border-b border-border px-1">
        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">{cards.length}</span>
      </div>
      <div className="space-y-2 p-1">
        {cards.map((card) => {
          if (card.kind === "issue") return (
            <IssueCard key={`i-${card.issue.id}`} issue={card.issue}
              onRequestDone={(id) => onRequestDone({ type: "issue", id })}
              onStatusChange={onStatusChange}
              onDragStart={() => setDragging({ type: "issue", id: card.issue.id })}
              onDragEnd={() => setDragging(null)}
            />
          );
          const weekDone = weekCounts[card.habit.id] ?? 0;
          const alreadyDoneToday = todayLogs.some((l) => l.habitId === card.habit.id && l.completed && l.date === today);
          return (
            <HabitCard key={`h-${card.habit.id}`} habit={card.habit}
              weekDone={weekDone} alreadyDoneToday={alreadyDoneToday}
              onRequestDone={() => onRequestDone({ type: "habit", id: card.habit.id })}
              onDragStart={() => setDragging({ type: "habit", id: card.habit.id })}
              onDragEnd={() => setDragging(null)}
            />
          );
        })}
        {cards.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-5 text-center">
            <p className="text-xs text-muted-foreground">Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardContent({ habits, weekCounts, todayLogs, sprintIssues, onRequestDone, onStatusChange, onPlanSprint }: {
  habits: Habit[]; weekCounts: Record<number, number>; todayLogs: HabitLog[];
  sprintIssues: AnyIssue[];
  onRequestDone: (pending: PendingDone) => void;
  onStatusChange: (id: number, status: string) => void;
  onPlanSprint: () => void;
}) {
  const [dragging, setDragging] = useState<DragInfo | null>(null);

  const todoHabits   = habits.filter((h) => (weekCounts[h.id] ?? 0) < h.targetDaysPerWeek);
  const doneHabits   = habits.filter((h) => (weekCounts[h.id] ?? 0) >= h.targetDaysPerWeek);

  const todoCards: BoardCard[] = [
    ...todoHabits.map((h): BoardCard => ({ kind: "habit", habit: h })),
    ...sprintIssues.filter((i) => ["backlog","todo"].includes(i.status)).map((i): BoardCard => ({ kind: "issue", issue: i })),
  ];
  const inProgressCards: BoardCard[] = sprintIssues
    .filter((i) => ["in_progress","in_review"].includes(i.status))
    .map((i): BoardCard => ({ kind: "issue", issue: i }));
  const doneCards: BoardCard[] = [
    ...doneHabits.map((h): BoardCard => ({ kind: "habit", habit: h })),
    ...sprintIssues.filter((i) => DONE_STATUSES.includes(i.status)).map((i): BoardCard => ({ kind: "issue", issue: i })),
  ];

  const colProps = { weekCounts, todayLogs, onRequestDone, onStatusChange, dragging, setDragging };
  const isEmpty = sprintIssues.length === 0 && habits.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{sprintIssues.length} sprint tickets · {habits.length} habits</p>
        <button onClick={onPlanSprint} className="text-xs font-medium text-primary hover:underline">Plan sprint →</button>
      </div>
      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
          <p className="text-sm font-medium">Board is empty</p>
          <p className="text-xs text-muted-foreground">
            Add habits or <button onClick={onPlanSprint} className="text-primary hover:underline">plan your sprint →</button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KanbanColumn title="Todo"        color="#6366f1" columnKey="todo"        cards={todoCards}       {...colProps} />
          <KanbanColumn title="In Progress" color="#f59e0b" columnKey="in_progress" cards={inProgressCards} {...colProps} />
          <KanbanColumn title="Done"        color="#10b981" columnKey="done"        cards={doneCards}       {...colProps} />
        </div>
      )}
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function ActivityCalendar({ habitLogs, workouts, totalHabits }: {
  habitLogs: HabitLogDay[]; workouts: WorkoutDay[]; totalHabits: number;
}) {
  const today = dateStr(new Date());
  const habitMap = useMemo(() => Object.fromEntries(habitLogs.map((l) => [l.date, l.completed])), [habitLogs]);
  const workoutSet = useMemo(() => new Set(workouts.map((w) => w.date)), [workouts]);

  const weeks = useMemo(() => {
    const start = new Date(); start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay());
    const grid: string[][] = [];
    const cur = new Date(start);
    const end = new Date(); end.setDate(end.getDate() - end.getDay() + 6);
    while (cur <= end) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) { week.push(dateStr(new Date(cur))); cur.setDate(cur.getDate() + 1); }
      grid.push(week);
    }
    return grid;
  }, []);

  const LEVELS = ["bg-muted/50","bg-violet-900/50","bg-violet-700/60","bg-violet-500/70","bg-violet-400"];

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((date) => {
                const isFuture = date > today;
                const completed = habitMap[date] ?? 0;
                const isWorkout = workoutSet.has(date);
                let level = 0;
                if (!isFuture && totalHabits > 0 && completed > 0) {
                  const ratio = completed / totalHabits;
                  level = ratio >= 0.75 ? 4 : ratio >= 0.5 ? 3 : ratio >= 0.25 ? 2 : 1;
                }
                return (
                  <div key={date}
                    title={`${date}${completed ? ` · ${completed} habits` : ""}${isWorkout ? " · workout" : ""}`}
                    className={`h-[11px] w-[11px] rounded-[2px] ${isFuture ? "bg-muted/20" : LEVELS[level]} ${isWorkout ? "ring-1 ring-emerald-400/70" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Less</span>
        {LEVELS.map((cls, i) => <div key={i} className={`h-2.5 w-2.5 rounded-[2px] ${cls}`} />)}
        <span className="text-[10px] text-muted-foreground">More</span>
        <div className="ml-2 h-2.5 w-2.5 rounded-[2px] bg-muted/50 ring-1 ring-emerald-400/70" />
        <span className="text-[10px] text-muted-foreground">Workout</span>
      </div>
    </div>
  );
}

function TicketStats({ allIssues }: { allIssues: AnyIssue[] }) {
  const total     = allIssues.length;
  const completed = allIssues.filter((i) => i.status === "done").length;
  const cancelled = allIssues.filter((i) => i.status === "cancelled").length;
  const active    = total - completed - cancelled;

  const data = [
    { label: "Active",    count: active,    color: "#6366f1" },
    { label: "Completed", count: completed, color: "#10b981" },
    { label: "Cancelled", count: cancelled, color: "#f43f5e" },
  ];

  if (total === 0) return <p className="text-xs text-muted-foreground italic">No tickets yet.</p>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {data.map(({ label, count, color }) => (
          <div key={label} className="rounded-lg border bg-card p-3 text-center" style={{ borderColor: `${color}25` }}>
            <p className="text-xl font-bold" style={{ color }}>{count}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden flex">
        {data.map(({ count, color }) => total > 0 && count > 0 ? (
          <div key={color} className="h-full transition-all" style={{ width: `${(count / total) * 100}%`, backgroundColor: color }} />
        ) : null)}
      </div>
      <p className="text-[10px] text-muted-foreground">{total} total tickets · {Math.round((completed / total) * 100)}% completion rate</p>
    </div>
  );
}

function AnalyticsContent({ habitLogs, workouts, sprintIssues, allIssues, totalHabits }: {
  habitLogs: HabitLogDay[]; workouts: WorkoutDay[];
  sprintIssues: AnyIssue[]; allIssues: AnyIssue[]; totalHabits: number;
}) {
  const last30 = useMemo(() => {
    const map = Object.fromEntries(habitLogs.map((l) => [l.date, l.completed]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (29 - i));
      const date = dateStr(d);
      return { date: `${d.getMonth() + 1}/${d.getDate()}`, pct: totalHabits > 0 ? Math.round(((map[date] ?? 0) / totalHabits) * 100) : 0 };
    });
  }, [habitLogs, totalHabits]);

  const tasksByWeek = useMemo(() => {
    const done = sprintIssues.filter((i) => i.status === "done" && i.completedAt);
    const map: Record<string, number> = {};
    done.forEach((i) => {
      const d = new Date(i.completedAt!); const sun = new Date(d); sun.setDate(d.getDate() - d.getDay());
      const key = `${sun.getMonth() + 1}/${sun.getDate()}`; map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).slice(-8).map(([week, count]) => ({ week, count }));
  }, [sprintIssues]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Habit completion · past year</p>
        <ActivityCalendar habitLogs={habitLogs} workouts={workouts} totalHabits={totalHabits} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Habit % · last 30 days</p>
          {totalHabits === 0 ? <p className="text-xs text-muted-foreground italic">No habits yet.</p> : (
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={last30}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={6} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} unit="%" width={30} />
                <Tooltip formatter={(v) => [`${v}%`, "Completion"]} />
                <Line type="monotone" dataKey="pct" stroke="#8b5cf6" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Tickets completed · by week</p>
          {tasksByWeek.length === 0 ? <p className="text-xs text-muted-foreground italic">No completed tickets yet.</p> : (
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={tasksByWeek}>
                <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} width={20} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Ticket overview · all time</p>
        <TicketStats allIssues={allIssues} />
      </div>
    </div>
  );
}

// ─── Quick links ──────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { href: "/mood",     label: "Mood",     icon: Heart,        color: "#f43f5e" },
  { href: "/fitness",  label: "Fitness",  icon: Activity,     color: "#10b981" },
  { href: "/finance",  label: "Finance",  icon: DollarSign,   color: "#f59e0b" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, color: "#6366f1" },
  { href: "/memories", label: "Memories", icon: Camera,       color: "#d946ef" },
] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = localToday();

  const [mood, setMood]               = useState<{ moodScore: number } | null>(null);
  const [habits, setHabits]           = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs]     = useState<HabitLog[]>([]);
  const [weekCounts, setWeekCounts]   = useState<Record<number, number>>({});
  const [sprintIssues, setSprintIssues] = useState<AnyIssue[]>([]);
  const [allIssues, setAllIssues]     = useState<AnyIssue[]>([]);
  const [habitLogs, setHabitLogs]     = useState<HabitLogDay[]>([]);
  const [workouts, setWorkouts]       = useState<WorkoutDay[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sprintOpen, setSprintOpen]   = useState(false);
  const [pendingDone, setPendingDone] = useState<PendingDone | null>(null);

  const sprintIds = useMemo(() => new Set(sprintIssues.map((i) => i.id)), [sprintIssues]);

  useEffect(() => {
    async function load() {
      try {
        const safe = (r: Response) => r.ok ? r.json() : Promise.resolve(null);
        const [moodData, habitsData, sprintData, logsData, workoutsData, weekData, allIssuesData] = await Promise.all([
          fetch(`/api/mood?date=${today}`).then(safe),
          fetch("/api/habits").then(safe),
          fetch("/api/issues?sprint=true").then(safe),
          fetch("/api/habits/logs").then(safe),
          fetch("/api/fitness/sessions").then(safe),
          fetch("/api/habits/logs/week").then(safe),
          fetch("/api/issues?all=true").then(safe),
        ]);

        setMood(moodData?.moodScore ? moodData : null);
        const h: Habit[] = Array.isArray(habitsData) ? habitsData : [];
        setHabits(h);
        setSprintIssues(Array.isArray(sprintData) ? sprintData : []);
        setAllIssues(Array.isArray(allIssuesData) ? allIssuesData : []);
        setHabitLogs(Array.isArray(logsData) ? logsData : []);
        setWorkouts(Array.isArray(workoutsData) ? workoutsData : []);

        const wc: Record<number, number> = {};
        (Array.isArray(weekData) ? weekData : []).forEach((r: WeekCount) => { wc[r.habitId] = r.doneThisWeek; });
        setWeekCounts(wc);

        if (h.length > 0) {
          const logs = await Promise.all(h.map((hb: Habit) => fetch(`/api/habits/${hb.id}/log`).then(safe)));
          setTodayLogs(logs.flat().filter((l: HabitLog | null) => l?.date === today) as HabitLog[]);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [today]);

  async function changeIssueStatus(id: number, status: string) {
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSprintIssues((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
    setAllIssues((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  }

  async function markHabitDone(habitId: number, logStatus: "completed" | "skipped") {
    const completed = logStatus === "completed";
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, completed, logStatus }),
    });
    if (completed) {
      setWeekCounts((prev) => ({ ...prev, [habitId]: (prev[habitId] ?? 0) + 1 }));
    }
    setTodayLogs((prev) => {
      const exists = prev.find((l) => l.habitId === habitId && l.date === today);
      const entry: HabitLog = { habitId, date: today, completed, logStatus };
      return exists ? prev.map((l) => l.habitId === habitId && l.date === today ? entry : l) : [...prev, entry];
    });
  }

  function confirmDone(choice: "completed" | "cancelled") {
    if (!pendingDone) return;
    if (pendingDone.type === "issue") {
      changeIssueStatus(pendingDone.id, choice === "completed" ? "done" : "cancelled");
    } else {
      markHabitDone(pendingDone.id, choice === "completed" ? "completed" : "skipped");
    }
    setPendingDone(null);
  }

  async function toggleSprint(id: number, inSprint: boolean) {
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inSprint }),
    });
    if (inSprint) {
      const data = await fetch("/api/issues").then((r) => r.json());
      const issue = (Array.isArray(data) ? data : []).find((i: AnyIssue) => i.id === id);
      if (issue) setSprintIssues((prev) => [...prev, { ...issue, inSprint: true }]);
    } else {
      setSprintIssues((prev) => prev.filter((i) => i.id !== id));
    }
  }

  const now         = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear   = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const daysLeft    = 365 - dayOfYear;
  const doneToday   = todayLogs.filter((l) => l.completed).length;

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 md:pl-6">
        {/* Hero */}
        <div className="space-y-3 pt-10 md:pt-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{getGreeting()}</h1>
              <p className="text-muted-foreground mt-1">
                {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-bold text-primary">{daysLeft}</p>
              <p className="text-xs text-muted-foreground">days left in {now.getFullYear()}</p>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${(dayOfYear / 365) * 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Day {dayOfYear} of 365 — {Math.round((dayOfYear / 365) * 100)}% through the year</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-64 rounded-xl bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            {/* Today strip */}
            <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-2.5 text-sm flex-wrap gap-y-2">
              <Link href="/mood" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Heart className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                {mood ? (
                  <span className="text-xs">{closestEmoji(mood.moodScore)} {mood.moodScore}/10</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Log mood →</span>
                )}
              </Link>
              <div className="h-3 w-px bg-border" />
              <Link href="/habits" className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Target className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                <span className="text-xs">
                  {habits.length === 0 ? <span className="text-muted-foreground">No habits</span> : <>{doneToday}/{habits.length} habits</>}
                </span>
              </Link>
              <div className="flex-1" />
              {QUICK_LINKS.slice(1).map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5" style={{ color }} />{label}
                </Link>
              ))}
            </div>

            {/* Board */}
            <CollapsibleSection id="board" title="Board" icon={<LayoutDashboard className="h-4 w-4 text-violet-400" />}>
              <BoardContent
                habits={habits} weekCounts={weekCounts} todayLogs={todayLogs}
                sprintIssues={sprintIssues}
                onRequestDone={setPendingDone}
                onStatusChange={changeIssueStatus}
                onPlanSprint={() => setSprintOpen(true)}
              />
            </CollapsibleSection>

            <div className="border-t border-border" />

            {/* Analytics */}
            <CollapsibleSection id="analytics" title="Analytics" icon={<BarChart2 className="h-4 w-4 text-indigo-400" />}>
              <AnalyticsContent
                habitLogs={habitLogs} workouts={workouts}
                sprintIssues={sprintIssues} allIssues={allIssues}
                totalHabits={habits.length}
              />
            </CollapsibleSection>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {QUICK_LINKS.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href} className="group">
                  <div className="rounded-xl border bg-card p-3 flex items-center gap-2.5 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                    style={{ borderColor: `${color}25` }}>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color }} />
                    </div>
                    <span className="text-xs font-medium">{label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/30 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <SprintDrawer open={sprintOpen} onClose={() => setSprintOpen(false)} sprintIds={sprintIds} onToggle={toggleSprint} />

      {pendingDone && (
        <DoneModal pending={pendingDone} onConfirm={confirmDone} onCancel={() => setPendingDone(null)} />
      )}
    </>
  );
}
