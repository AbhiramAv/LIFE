"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
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
type Habit        = { id: number; name: string; biggerGoal: string | null; color: string };
type HabitLog     = { habitId: number; date: string; completed: boolean; logStatus: string };

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

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({ id, title, icon, children, badge }: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const v = localStorage.getItem(`section-${id}`);
    if (v !== null) setOpen(v === "true");
  }, [id]);

  function toggle() {
    setOpen((o) => {
      localStorage.setItem(`section-${id}`, String(!o));
      return !o;
    });
  }

  return (
    <div className="space-y-3">
      <button
        onClick={toggle}
        className="flex items-center gap-2 w-full group hover:text-foreground transition-colors"
      >
        {icon}
        <span className="text-sm font-semibold">{title}</span>
        {badge}
        <ChevronDown
          className={`ml-auto h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>
      {open && children}
    </div>
  );
}

// ─── Sprint Drawer ────────────────────────────────────────────────────────────

function SprintDrawer({ open, onClose, sprintIds, onToggle }: {
  open: boolean;
  onClose: () => void;
  sprintIds: Set<number>;
  onToggle: (id: number, inSprint: boolean) => void;
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

  // Refresh issue list when sprint changes (so moved items disappear from backlog)
  const backlog = useMemo(
    () => allIssues?.filter((i) => !sprintIds.has(i.id) && !["done", "cancelled", "skipped"].includes(i.status)) ?? [],
    [allIssues, sprintIds]
  );
  const inSprint = useMemo(
    () => allIssues?.filter((i) => sprintIds.has(i.id)) ?? [],
    [allIssues, sprintIds]
  );

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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-sm">Plan this week</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{inSprint.length} issues in sprint</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Backlog column */}
          <div className="flex-1 overflow-y-auto p-4 border-r border-border space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Backlog</p>
            {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
            {!loading && Object.keys(byProject).length === 0 && (
              <p className="text-xs text-muted-foreground italic">All issues are in the sprint.</p>
            )}
            {Object.entries(byProject).map(([projectTitle, { color, issues }]) => (
              <div key={projectTitle} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <p className="text-[10px] font-semibold text-muted-foreground truncate">{projectTitle}</p>
                </div>
                {issues.map((issue) => (
                  <button
                    key={issue.id}
                    onClick={() => onToggle(issue.id, true)}
                    className="group w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted flex items-center gap-2 transition-colors"
                  >
                    <span className="flex-1 truncate">{issue.title}</span>
                    <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Sprint column */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">This week</p>
            {inSprint.length === 0 && (
              <p className="text-xs text-muted-foreground italic">← Click items to add to sprint</p>
            )}
            {inSprint.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start gap-2 px-2.5 py-2 rounded-lg text-xs border"
                style={{ borderColor: `${issue.projectColor}40`, backgroundColor: `${issue.projectColor}10` }}
              >
                <div className="h-2 w-2 rounded-full mt-1 shrink-0" style={{ backgroundColor: issue.projectColor }} />
                <span className="flex-1 leading-snug">{issue.title}</span>
                <button
                  onClick={() => onToggle(issue.id, false)}
                  className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0 mt-0.5"
                >
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
  cancelled: { label: "cancelled", color: "#6b7280" },
  skipped:   { label: "skipped",   color: "#f59e0b" },
  completed: { label: "done",      color: "#10b981" },
  missed:    { label: "missed",    color: "#6b7280" },
};

function IssueCard({ issue, onStatusChange }: {
  issue: AnyIssue;
  onStatusChange: (id: number, status: string) => void;
}) {
  const isDone = DONE_STATUSES.includes(issue.status);
  const tag = isDone ? STATUS_TAG[issue.status] : null;
  const nextStatus = STATUS_CYCLE[issue.status] ?? "todo";

  return (
    <div
      className="rounded-lg border bg-card p-3 space-y-2.5 hover:shadow-sm transition-all"
      style={{ borderColor: `${issue.projectColor}30`, borderLeftWidth: 3, borderLeftColor: issue.projectColor }}
    >
      <p className={`text-xs font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
        {issue.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-[110px]"
          style={{ backgroundColor: `${issue.projectColor}20`, color: issue.projectColor }}
        >
          {issue.projectTitle}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {tag && (
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.label}
            </span>
          )}
          {!isDone && (
            <button
              onClick={() => onStatusChange(issue.id, nextStatus)}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-all"
            >
              → {nextStatus === "in_progress" ? "Start" : "Done"}
            </button>
          )}
          {isDone && (
            <button
              onClick={() => onStatusChange(issue.id, "todo")}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:bg-muted transition-all"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitCard({ habit, logStatus }: { habit: Habit; logStatus: string | null }) {
  const isDone = logStatus === "completed";
  const tag = logStatus ? STATUS_TAG[logStatus] : null;
  const HABIT_COLOR = habit.color;

  return (
    <div
      className="rounded-lg border bg-card p-3 space-y-2.5 hover:shadow-sm transition-all"
      style={{ borderColor: `${HABIT_COLOR}30`, borderLeftWidth: 3, borderLeftColor: HABIT_COLOR }}
    >
      <p className={`text-xs font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
        {habit.biggerGoal ?? habit.name}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${HABIT_COLOR}20`, color: HABIT_COLOR }}
        >
          {habit.name}
        </span>
        {tag && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          >
            {tag.label}
          </span>
        )}
      </div>
    </div>
  );
}

type BoardCard =
  | { kind: "issue"; issue: AnyIssue }
  | { kind: "habit"; habit: Habit; logStatus: string | null };

function KanbanColumn({ title, color, cards, onStatusChange }: {
  title: string; color: string; cards: BoardCard[];
  onStatusChange: (id: number, status: string) => void;
}) {
  const visible = title === "Done" ? cards.slice(0, 20) : cards;
  return (
    <div className="space-y-2 min-w-0">
      <div className="flex items-center gap-2 pb-1.5 border-b border-border">
        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">{cards.length}</span>
      </div>
      <div className="space-y-2">
        {visible.map((card) =>
          card.kind === "issue" ? (
            <IssueCard key={`i-${card.issue.id}`} issue={card.issue} onStatusChange={onStatusChange} />
          ) : (
            <HabitCard key={`h-${card.habit.id}`} habit={card.habit} logStatus={card.logStatus} />
          )
        )}
        {visible.length === 0 && (
          <div className="rounded-lg border border-dashed border-border p-5 text-center">
            <p className="text-xs text-muted-foreground">Empty</p>
          </div>
        )}
        {title === "Done" && cards.length > 20 && (
          <p className="text-[11px] text-muted-foreground text-center">+{cards.length - 20} more</p>
        )}
      </div>
    </div>
  );
}

function BoardContent({ habits, todayLogs, sprintIssues, onStatusChange, onPlanSprint }: {
  habits: Habit[]; todayLogs: HabitLog[]; sprintIssues: AnyIssue[];
  onStatusChange: (id: number, status: string) => void;
  onPlanSprint: () => void;
}) {
  const today = localToday();
  const logMap = Object.fromEntries(
    todayLogs.filter((l) => l.date === today).map((l) => [l.habitId, l])
  );

  const todoCards: BoardCard[] = [
    ...habits
      .filter((h) => !logMap[h.id] || (!logMap[h.id].completed && logMap[h.id].logStatus !== "skipped"))
      .map((h): BoardCard => ({ kind: "habit", habit: h, logStatus: logMap[h.id]?.logStatus ?? null })),
    ...sprintIssues.filter((i) => ["backlog", "todo"].includes(i.status))
      .map((i): BoardCard => ({ kind: "issue", issue: i })),
  ];
  const inProgressCards: BoardCard[] = sprintIssues
    .filter((i) => ["in_progress", "in_review"].includes(i.status))
    .map((i): BoardCard => ({ kind: "issue", issue: i }));
  const doneCards: BoardCard[] = [
    ...habits
      .filter((h) => logMap[h.id] && (logMap[h.id].completed || logMap[h.id].logStatus === "skipped"))
      .map((h): BoardCard => ({ kind: "habit", habit: h, logStatus: logMap[h.id].logStatus })),
    ...sprintIssues.filter((i) => DONE_STATUSES.includes(i.status))
      .map((i): BoardCard => ({ kind: "issue", issue: i })),
  ];

  const isEmpty = sprintIssues.length === 0 && habits.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{sprintIssues.length} sprint tasks · {habits.length} habits</p>
        <button
          onClick={onPlanSprint}
          className="text-xs font-medium text-primary hover:underline"
        >
          Plan sprint →
        </button>
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
          <p className="text-sm font-medium">Board is empty</p>
          <p className="text-xs text-muted-foreground">
            Add habits or{" "}
            <button onClick={onPlanSprint} className="text-primary hover:underline">plan your sprint →</button>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KanbanColumn title="Todo"        color="#6366f1" cards={todoCards}       onStatusChange={onStatusChange} />
          <KanbanColumn title="In Progress" color="#f59e0b" cards={inProgressCards} onStatusChange={onStatusChange} />
          <KanbanColumn title="Done"        color="#10b981" cards={doneCards}       onStatusChange={onStatusChange} />
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

  const LEVELS = ["bg-muted/50", "bg-violet-900/50", "bg-violet-700/60", "bg-violet-500/70", "bg-violet-400"];

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
                  <div
                    key={date}
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

function AnalyticsContent({ habitLogs, workouts, sprintIssues, totalHabits }: {
  habitLogs: HabitLogDay[]; workouts: WorkoutDay[];
  sprintIssues: AnyIssue[]; totalHabits: number;
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
    <div className="space-y-5">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Habit completion · past year</p>
        <ActivityCalendar habitLogs={habitLogs} workouts={workouts} totalHabits={totalHabits} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Habit % · last 30 days</p>
          {totalHabits === 0 ? (
            <p className="text-xs text-muted-foreground italic">No habits yet.</p>
          ) : (
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
          <p className="text-xs text-muted-foreground mb-2">Tasks completed · by week</p>
          {tasksByWeek.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No completed tasks yet.</p>
          ) : (
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
    </div>
  );
}

// ─── Quick links ──────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { href: "/mood",      label: "Mood",     icon: Heart,        color: "#f43f5e" },
  { href: "/fitness",   label: "Fitness",  icon: Activity,     color: "#10b981" },
  { href: "/finance",   label: "Finance",  icon: DollarSign,   color: "#f59e0b" },
  { href: "/calendar",  label: "Calendar", icon: CalendarDays, color: "#6366f1" },
  { href: "/memories",  label: "Memories", icon: Camera,       color: "#d946ef" },
] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = localToday();

  const [mood, setMood]               = useState<{ moodScore: number } | null>(null);
  const [habits, setHabits]           = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs]     = useState<HabitLog[]>([]);
  const [sprintIssues, setSprintIssues] = useState<AnyIssue[]>([]);
  const [habitLogs, setHabitLogs]     = useState<HabitLogDay[]>([]);
  const [workouts, setWorkouts]       = useState<WorkoutDay[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sprintOpen, setSprintOpen]   = useState(false);

  const sprintIds = useMemo(() => new Set(sprintIssues.map((i) => i.id)), [sprintIssues]);

  useEffect(() => {
    async function load() {
      try {
        const safe = (r: Response) => r.ok ? r.json() : Promise.resolve(null);
        const [moodData, habitsData, sprintData, logsData, workoutsData] = await Promise.all([
          fetch(`/api/mood?date=${today}`).then(safe),
          fetch("/api/habits").then(safe),
          fetch("/api/issues?sprint=true").then(safe),
          fetch("/api/habits/logs").then(safe),
          fetch("/api/fitness/sessions").then(safe),
        ]);

        setMood(moodData?.moodScore ? moodData : null);
        const h = Array.isArray(habitsData) ? habitsData : [];
        setHabits(h);
        setSprintIssues(Array.isArray(sprintData) ? sprintData : []);
        setHabitLogs(Array.isArray(logsData) ? logsData : []);
        setWorkouts(Array.isArray(workoutsData) ? workoutsData : []);

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
  }

  async function toggleSprint(id: number, inSprint: boolean) {
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inSprint }),
    });
    if (inSprint) {
      // Fetch the full issue with project info to add to board
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
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{ width: `${(dayOfYear / 365) * 100}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Day {dayOfYear} of 365 — {Math.round((dayOfYear / 365) * 100)}% through the year
          </p>
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
                <Link key={href} href={href} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1" style={{}}>
                  <Icon className="h-3.5 w-3.5" style={{ color }} />{label}
                </Link>
              ))}
            </div>

            {/* Board */}
            <CollapsibleSection
              id="board"
              title="Board"
              icon={<LayoutDashboard className="h-4 w-4 text-muted-foreground" />}
            >
              <BoardContent
                habits={habits}
                todayLogs={todayLogs}
                sprintIssues={sprintIssues}
                onStatusChange={changeIssueStatus}
                onPlanSprint={() => setSprintOpen(true)}
              />
            </CollapsibleSection>

            <div className="border-t border-border" />

            {/* Analytics */}
            <CollapsibleSection
              id="analytics"
              title="Analytics"
              icon={<BarChart2 className="h-4 w-4 text-muted-foreground" />}
            >
              <AnalyticsContent
                habitLogs={habitLogs}
                workouts={workouts}
                sprintIssues={sprintIssues}
                totalHabits={habits.length}
              />
            </CollapsibleSection>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {QUICK_LINKS.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href} className="group">
                  <div
                    className="rounded-xl border bg-card p-3 flex items-center gap-2.5 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                    style={{ borderColor: `${color}25` }}
                  >
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

      {/* Sprint planning drawer */}
      <SprintDrawer
        open={sprintOpen}
        onClose={() => setSprintOpen(false)}
        sprintIds={sprintIds}
        onToggle={toggleSprint}
      />
    </>
  );
}
