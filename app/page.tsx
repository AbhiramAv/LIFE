"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Heart, Target, Activity, DollarSign, Camera, ArrowRight,
  BarChart2, CalendarDays, LayoutDashboard, ChevronRight,
} from "lucide-react";
import { type IssueStatus } from "@/lib/types/goals";

// ─── Types ────────────────────────────────────────────────────────────────────

type SprintIssue = {
  id: number; projectId: number; title: string;
  status: IssueStatus; projectTitle: string; projectColor: string;
  completedAt: string | null; createdAt: string;
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

// ─── Board ────────────────────────────────────────────────────────────────────

type BoardCard =
  | { kind: "issue"; issue: SprintIssue }
  | { kind: "habit"; habit: Habit; logStatus: string | null };

const STATUS_COLORS: Record<string, string> = {
  done: "#10b981", cancelled: "#6b7280", skipped: "#f59e0b",
  completed: "#10b981", missed: "#6b7280",
};
const STATUS_LABELS: Record<string, string> = {
  done: "done", cancelled: "cancelled", skipped: "skipped",
  completed: "done", missed: "missed",
};

const ISSUE_STATUSES: IssueStatus[] = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled", "skipped" as IssueStatus];
const NEXT_STATUS: Record<string, IssueStatus> = {
  backlog: "todo", todo: "in_progress", in_progress: "in_review",
  in_review: "done", done: "backlog", cancelled: "todo", skipped: "todo",
};
const STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog", todo: "Todo", in_progress: "In Progress",
  in_review: "In Review", done: "Done", cancelled: "Cancelled", skipped: "Skipped",
};

function IssueCard({ issue, onStatusChange }: {
  issue: SprintIssue;
  onStatusChange: (id: number, status: IssueStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDone = ["done", "cancelled", "skipped"].includes(issue.status);

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2 hover:border-primary/20 transition-all relative">
      <p className={`text-xs font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
        {issue.title}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div
          className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-[120px]"
          style={{ backgroundColor: `${issue.projectColor}22`, color: issue.projectColor }}
        >
          {issue.projectTitle}
        </div>
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
          >
            {STATUS_LABEL[issue.status]}
          </button>
          {open && (
            <div className="absolute right-0 top-6 z-20 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
              {ISSUE_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(issue.id, s); setOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors ${s === issue.status ? "font-semibold text-primary" : "text-foreground"}`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HabitCard({ habit, logStatus }: { habit: Habit; logStatus: string | null }) {
  const isDone = logStatus === "completed";
  const tag = logStatus ? STATUS_LABELS[logStatus] : null;
  const tagColor = logStatus ? STATUS_COLORS[logStatus] : null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2 hover:border-primary/20 transition-all">
      <p className={`text-xs font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>
        {habit.biggerGoal ?? habit.name}
      </p>
      <div className="flex items-center justify-between">
        <div
          className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${habit.color}22`, color: habit.color }}
        >
          habit · {habit.name}
        </div>
        {tag && (
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: `${tagColor}22`, color: tagColor! }}
          >
            {tag}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ title, color, cards, issues, onStatusChange }: {
  title: string; color: string; cards: BoardCard[];
  issues: SprintIssue[];
  onStatusChange: (id: number, status: IssueStatus) => void;
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

function BoardSection({ habits, todayLogs, sprintIssues, onStatusChange }: {
  habits: Habit[];
  todayLogs: HabitLog[];
  sprintIssues: SprintIssue[];
  onStatusChange: (id: number, status: IssueStatus) => void;
}) {
  const today = localToday();
  const logMap = Object.fromEntries(
    todayLogs.filter((l) => l.date === today).map((l) => [l.habitId, l])
  );

  const todoCards: BoardCard[] = [
    ...habits
      .filter((h) => !logMap[h.id] || (!logMap[h.id].completed && logMap[h.id].logStatus !== "skipped"))
      .map((h): BoardCard => ({ kind: "habit", habit: h, logStatus: logMap[h.id]?.logStatus ?? null })),
    ...sprintIssues
      .filter((i) => ["backlog", "todo"].includes(i.status))
      .map((i): BoardCard => ({ kind: "issue", issue: i })),
  ];

  const inProgressCards: BoardCard[] = sprintIssues
    .filter((i) => ["in_progress", "in_review"].includes(i.status))
    .map((i): BoardCard => ({ kind: "issue", issue: i }));

  const doneCards: BoardCard[] = [
    ...habits
      .filter((h) => logMap[h.id] && (logMap[h.id].completed || logMap[h.id].logStatus === "skipped"))
      .map((h): BoardCard => ({ kind: "habit", habit: h, logStatus: logMap[h.id].logStatus })),
    ...sprintIssues
      .filter((i) => ["done", "cancelled", "skipped"].includes(i.status))
      .map((i): BoardCard => ({ kind: "issue", issue: i })),
  ];

  const noSprint = sprintIssues.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Board</h2>
        </div>
        <Link href="/goals" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors">
          Plan sprint <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {noSprint && habits.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-1">
          <p className="text-sm font-medium">Board is empty</p>
          <p className="text-xs text-muted-foreground">
            Add habits or <Link href="/goals" className="text-primary hover:underline">plan your sprint →</Link>
          </p>
        </div>
      )}

      {(sprintIssues.length > 0 || habits.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KanbanColumn title="Todo"        color="#6366f1" cards={todoCards}       issues={sprintIssues} onStatusChange={onStatusChange} />
          <KanbanColumn title="In Progress" color="#f59e0b" cards={inProgressCards} issues={sprintIssues} onStatusChange={onStatusChange} />
          <KanbanColumn title="Done"        color="#10b981" cards={doneCards}       issues={sprintIssues} onStatusChange={onStatusChange} />
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

function AnalyticsSection({ habitLogs, workouts, sprintIssues, totalHabits }: {
  habitLogs: HabitLogDay[]; workouts: WorkoutDay[];
  sprintIssues: SprintIssue[]; totalHabits: number;
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
      <div className="flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Analytics</h2>
      </div>

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
  { href: "/mood",      label: "Mood",     icon: Heart,        color: "text-rose-400",    bg: "bg-rose-500/10"    },
  { href: "/fitness",   label: "Fitness",  icon: Activity,     color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { href: "/finance",   label: "Finance",  icon: DollarSign,   color: "text-amber-400",   bg: "bg-amber-500/10"   },
  { href: "/calendar",  label: "Calendar", icon: CalendarDays, color: "text-indigo-400",  bg: "bg-indigo-500/10"  },
  { href: "/memories",  label: "Memories", icon: Camera,       color: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = localToday();

  const [mood, setMood]               = useState<{ moodScore: number } | null>(null);
  const [habits, setHabits]           = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs]     = useState<HabitLog[]>([]);
  const [sprintIssues, setSprintIssues] = useState<SprintIssue[]>([]);
  const [habitLogs, setHabitLogs]     = useState<HabitLogDay[]>([]);
  const [workouts, setWorkouts]       = useState<WorkoutDay[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const safeJson = (r: Response) => r.ok ? r.json() : Promise.resolve(null);
        const [moodData, habitsData, sprintData, logsData, workoutsData] = await Promise.all([
          fetch(`/api/mood?date=${today}`).then(safeJson),
          fetch("/api/habits").then(safeJson),
          fetch("/api/issues?sprint=true").then(safeJson),
          fetch("/api/habits/logs").then(safeJson),
          fetch("/api/fitness/sessions").then(safeJson),
        ]);

        setMood(moodData?.moodScore ? moodData : null);
        const habits = Array.isArray(habitsData) ? habitsData : [];
        setHabits(habits);
        setSprintIssues(Array.isArray(sprintData) ? sprintData : []);
        setHabitLogs(Array.isArray(logsData) ? logsData : []);
        setWorkouts(Array.isArray(workoutsData) ? workoutsData : []);

        if (habits.length > 0) {
          const logs = await Promise.all(
            habits.map((h: Habit) => fetch(`/api/habits/${h.id}/log`).then(safeJson))
          );
          setTodayLogs(logs.flat().filter((l: HabitLog | null) => l && l.date === today) as HabitLog[]);
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [today]);

  async function changeIssueStatus(id: number, status: IssueStatus) {
    await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSprintIssues((prev) => prev.map((i) => i.id === id ? { ...i, status } : i));
  }

  const now         = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear   = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const daysLeft    = 365 - dayOfYear;
  const doneToday   = todayLogs.filter((l) => l.completed).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* Hero */}
      <div className="space-y-3">
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
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-2.5 text-sm flex-wrap">
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
              <Link key={href} href={href} className={`text-xs text-muted-foreground hover:${color} transition-colors flex items-center gap-1`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </Link>
            ))}
          </div>

          {/* Board — always visible */}
          <BoardSection
            habits={habits}
            todayLogs={todayLogs}
            sprintIssues={sprintIssues}
            onStatusChange={changeIssueStatus}
          />

          <div className="border-t border-border" />

          {/* Analytics — always visible */}
          <AnalyticsSection
            habitLogs={habitLogs}
            workouts={workouts}
            sprintIssues={sprintIssues}
            totalHabits={habits.length}
          />

          {/* Quick links row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {QUICK_LINKS.map(({ href, label, icon: Icon, color, bg }) => (
              <Link key={href} href={href} className="group">
                <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-2.5 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm transition-all">
                  <div className={`h-7 w-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
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
  );
}
