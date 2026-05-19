"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Heart, Target, Activity, DollarSign, Camera,
  ArrowRight, Check, Flame, LayoutDashboard, BarChart2, Wallet,
} from "lucide-react";
import { STATUS_CONFIG, type Project, type Issue, type IssueStatus } from "@/lib/types/goals";

// ─── Types ───────────────────────────────────────────────────────────────────

type AllIssue = {
  id: number;
  projectId: number;
  title: string;
  status: IssueStatus;
  priority: string;
  completedAt: string | null;
  createdAt: string;
  projectTitle: string;
  projectColor: string;
};
type HabitLogDay = { date: string; completed: number };
type WorkoutDay  = { date: string };
type Habit       = { id: number; name: string; color: string };

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

// ─── Board tab ───────────────────────────────────────────────────────────────

const BOARD_COLUMNS: { key: IssueStatus[]; label: string; color: string }[] = [
  { key: ["backlog", "todo"],              label: "Todo",        color: "#6366f1" },
  { key: ["in_progress", "in_review"],     label: "In Progress", color: "#f59e0b" },
  { key: ["done"],                         label: "Done",        color: "#10b981" },
];

function IssueCard({ issue }: { issue: AllIssue }) {
  return (
    <Link href={`/goals/${issue.projectId}`} className="block group">
      <div className="rounded-lg border border-border bg-card p-3 space-y-2 hover:border-primary/30 hover:shadow-sm transition-all">
        <p className="text-xs font-medium leading-snug">{issue.title}</p>
        <div
          className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full"
          style={{ backgroundColor: `${issue.projectColor}22`, color: issue.projectColor }}
        >
          {issue.projectTitle}
        </div>
      </div>
    </Link>
  );
}

function BoardTab({ issues }: { issues: AllIssue[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {BOARD_COLUMNS.map(({ key, label, color }) => {
        const col = issues.filter((i) => (key as string[]).includes(i.status));
        const visible = label === "Done" ? col.slice(0, 15) : col;
        return (
          <div key={label} className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b border-border">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{col.length}</span>
            </div>
            <div className="space-y-2">
              {visible.map((issue) => <IssueCard key={issue.id} issue={issue} />)}
              {visible.length === 0 && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-xs text-muted-foreground">Empty</p>
                </div>
              )}
              {label === "Done" && col.length > 15 && (
                <p className="text-[11px] text-muted-foreground text-center">+{col.length - 15} more</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Analytics tab ───────────────────────────────────────────────────────────

function ActivityCalendar({
  habitLogs, workouts, totalHabits,
}: {
  habitLogs: HabitLogDay[];
  workouts: WorkoutDay[];
  totalHabits: number;
}) {
  const today = dateStr(new Date());
  const habitMap = useMemo(
    () => Object.fromEntries(habitLogs.map((l) => [l.date, l.completed])),
    [habitLogs]
  );
  const workoutSet = useMemo(() => new Set(workouts.map((w) => w.date)), [workouts]);

  // Build 53 weeks of grid starting from Sunday ~52 weeks ago
  const weeks = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 364);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday
    const grid: string[][] = [];
    const cur = new Date(start);
    const end = new Date();
    end.setDate(end.getDate() - end.getDay() + 6); // end of current week
    while (cur <= end) {
      const week: string[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(dateStr(new Date(cur)));
        cur.setDate(cur.getDate() + 1);
      }
      grid.push(week);
    }
    return grid;
  }, []);

  const HABIT_LEVELS = ["bg-muted/50", "bg-violet-900/50", "bg-violet-700/60", "bg-violet-500/70", "bg-violet-400"];

  return (
    <div className="space-y-5">
      {/* Habit calendar */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Habit completion · past year</p>
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
                      title={`${date}${completed ? ` · ${completed} habits` : ""}${isWorkout ? " · workout 💪" : ""}`}
                      className={`h-[11px] w-[11px] rounded-[2px] ${isFuture ? "bg-muted/20" : HABIT_LEVELS[level]} ${isWorkout ? "ring-1 ring-emerald-400/70" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {HABIT_LEVELS.map((cls, i) => (
            <div key={i} className={`h-2.5 w-2.5 rounded-[2px] ${cls}`} />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
          <div className="ml-3 h-2.5 w-2.5 rounded-[2px] bg-muted/50 ring-1 ring-emerald-400/70" />
          <span className="text-[10px] text-muted-foreground">Workout</span>
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab({
  habitLogs, workouts, issues, totalHabits,
}: {
  habitLogs: HabitLogDay[];
  workouts: WorkoutDay[];
  issues: AllIssue[];
  totalHabits: number;
}) {
  const today = dateStr(new Date());

  const last30 = useMemo(() => {
    const map = Object.fromEntries(habitLogs.map((l) => [l.date, l.completed]));
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const date = dateStr(d);
      const completed = map[date] ?? 0;
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        pct: totalHabits > 0 ? Math.round((completed / totalHabits) * 100) : 0,
      };
    });
  }, [habitLogs, totalHabits]);

  const tasksByWeek = useMemo(() => {
    const done = issues.filter((i) => i.status === "done" && i.completedAt);
    const map: Record<string, number> = {};
    done.forEach((i) => {
      const d = new Date(i.completedAt!);
      const sun = new Date(d);
      sun.setDate(d.getDate() - d.getDay());
      const key = `${sun.getMonth() + 1}/${sun.getDate()}`;
      map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).slice(-8).map(([week, count]) => ({ week, count }));
  }, [issues]);

  return (
    <div className="space-y-8">
      <ActivityCalendar habitLogs={habitLogs} workouts={workouts} totalHabits={totalHabits} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-3">Habit completion % · last 30 days</p>
          {totalHabits === 0 ? (
            <p className="text-xs text-muted-foreground">No habits tracked yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
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
          <p className="text-xs font-semibold text-muted-foreground mb-3">Tasks completed · by week</p>
          {tasksByWeek.length === 0 ? (
            <p className="text-xs text-muted-foreground">No completed tasks yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
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

// ─── Finance tab ─────────────────────────────────────────────────────────────

function FinanceTab() {
  return (
    <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-3">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 mx-auto">
        <DollarSign className="h-5 w-5 text-amber-400" />
      </div>
      <p className="text-sm font-semibold">Finance tracking</p>
      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
        Connect accounts, import transactions, and see your net worth — coming in the next phase.
      </p>
      <Link href="/finance" className="text-xs text-amber-400 hover:underline">
        Explore finance →
      </Link>
    </div>
  );
}

// ─── Today pulse strip ───────────────────────────────────────────────────────

const MOOD_EMOJIS: Record<number, string> = { 2: "😭", 4: "😔", 6: "😐", 8: "😊", 10: "🤩" };

function closestEmoji(map: Record<number, string>, value: number): string {
  const keys = Object.keys(map).map(Number);
  const nearest = keys.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
  return map[nearest];
}

function TodayStrip({
  mood, habits, todayDone,
}: {
  mood: { moodScore: number; energyScore: number; stressScore: number } | null;
  habits: Habit[];
  todayDone: Set<number>;
}) {
  const done  = habits.filter((h) => todayDone.has(h.id)).length;
  const total = habits.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card/50 px-4 py-2.5 text-sm">
      <Link href="/mood" className="flex items-center gap-2 hover:text-primary transition-colors">
        <Heart className="h-3.5 w-3.5 text-rose-400 shrink-0" />
        {mood ? (
          <span className="text-xs">
            {closestEmoji(MOOD_EMOJIS, mood.moodScore)} {mood.moodScore}/10
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Log mood →</span>
        )}
      </Link>
      <div className="h-3 w-px bg-border" />
      <Link href="/habits" className="flex items-center gap-2 hover:text-primary transition-colors">
        <Target className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <span className="text-xs">
          {total === 0 ? (
            <span className="text-muted-foreground">No habits</span>
          ) : (
            <>{done}/{total} habits · {pct}%</>
          )}
        </span>
      </Link>
      <div className="flex-1" />
      <Link href="/fitness" className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors flex items-center gap-1">
        <Activity className="h-3.5 w-3.5" /> Fitness
      </Link>
      <Link href="/memories" className="text-xs text-muted-foreground hover:text-fuchsia-400 transition-colors flex items-center gap-1">
        <Camera className="h-3.5 w-3.5" /> Memories
      </Link>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = "board" | "analytics" | "finance";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "board",     label: "Board",     icon: LayoutDashboard },
  { key: "analytics", label: "Analytics", icon: BarChart2       },
  { key: "finance",   label: "Finance",   icon: Wallet          },
];

export default function DashboardPage() {
  const today = localToday();
  const [tab, setTab] = useState<Tab>("board");

  const [mood, setMood]             = useState<{ moodScore: number; energyScore: number; stressScore: number } | null>(null);
  const [habits, setHabits]         = useState<Habit[]>([]);
  const [todayDone, setTodayDone]   = useState<Set<number>>(new Set());
  const [allIssues, setAllIssues]   = useState<AllIssue[]>([]);
  const [habitLogs, setHabitLogs]   = useState<HabitLogDay[]>([]);
  const [workouts, setWorkouts]     = useState<WorkoutDay[]>([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    async function load() {
      const [moodData, habitsData, issuesData, logsData, workoutsData] = await Promise.all([
        fetch(`/api/mood?date=${today}`).then((r) => r.json()),
        fetch("/api/habits").then((r) => r.json()),
        fetch("/api/issues").then((r) => r.json()),
        fetch("/api/habits/logs").then((r) => r.json()),
        fetch("/api/fitness/sessions").then((r) => r.json()),
      ]);

      setMood(moodData);
      setHabits(habitsData);
      setAllIssues(Array.isArray(issuesData) ? issuesData : []);
      setHabitLogs(Array.isArray(logsData) ? logsData : []);
      setWorkouts(Array.isArray(workoutsData) ? workoutsData : []);

      const logs = await Promise.all(
        (habitsData as Habit[]).map((h) =>
          fetch(`/api/habits/${h.id}/log`).then((r) => r.json())
        )
      );
      const flat = logs.flat() as { habitId: number; date: string; completed: boolean }[];
      setTodayDone(new Set(flat.filter((l) => l.date === today && l.completed).map((l) => l.habitId)));

      setLoading(false);
    }
    load();
  }, [today]);

  const now          = new Date();
  const startOfYear  = new Date(now.getFullYear(), 0, 0);
  const dayOfYear    = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const daysLeft     = 365 - dayOfYear;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

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
        <div className="space-y-3">
          <div className="h-10 rounded-xl bg-muted animate-pulse" />
          <div className="h-64 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : (
        <>
          {/* Today strip */}
          <TodayStrip mood={mood} habits={habits} todayDone={todayDone} />

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-border">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {tab === "board" && <BoardTab issues={allIssues} />}
            {tab === "analytics" && (
              <AnalyticsTab
                habitLogs={habitLogs}
                workouts={workouts}
                issues={allIssues}
                totalHabits={habits.length}
              />
            )}
            {tab === "finance" && <FinanceTab />}
          </div>
        </>
      )}
    </div>
  );
}
