"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Heart, Target, Activity, DollarSign, Layers, Camera,
  ArrowRight, Check, Flame, Circle, CheckCircle2, MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_CONFIG, STATUS_CONFIG, type Project, type Issue, type IssueStatus } from "@/lib/types/goals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const MOOD_EMOJIS: Record<number, string> = { 2: "😭", 4: "😔", 6: "😐", 8: "😊", 10: "🤩" };
const ENERGY_EMOJIS: Record<number, string> = { 2: "🪫", 4: "😴", 6: "⚡", 8: "💪", 10: "🚀" };
const STRESS_EMOJIS: Record<number, string> = { 2: "😌", 4: "🙂", 6: "😤", 8: "😰", 10: "🤯" };

function closestEmoji(map: Record<number, string>, value: number): string {
  const keys = Object.keys(map).map(Number);
  const nearest = keys.reduce((a, b) => Math.abs(b - value) < Math.abs(a - value) ? b : a);
  return map[nearest];
}

const STATUS_OPEN: IssueStatus[] = ["todo", "in_progress", "in_review"];

// ─── Section: Mood pulse ──────────────────────────────────────────────────────

function MoodPulse({ mood }: { mood: { moodScore: number; energyScore: number; stressScore: number } | null }) {
  return (
    <Link href="/mood" className="group block">
      <div className="rounded-xl border border-rose-500/20 bg-card p-4 hover:border-rose-500/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-rose-500/15 flex items-center justify-center">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <span className="text-sm font-semibold">Today's mood</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all" />
        </div>

        {mood ? (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Mood",   emoji: closestEmoji(MOOD_EMOJIS, mood.moodScore),   score: mood.moodScore },
              { label: "Energy", emoji: closestEmoji(ENERGY_EMOJIS, mood.energyScore), score: mood.energyScore },
              { label: "Stress", emoji: closestEmoji(STRESS_EMOJIS, mood.stressScore), score: mood.stressScore },
            ].map(({ label, emoji, score }) => (
              <div key={label} className="text-center">
                <div className="text-2xl leading-none mb-1">{emoji}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-xs font-semibold">{score}/10</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Not logged yet</p>
            <span className="text-xs font-medium text-rose-400 group-hover:underline">Log now →</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Section: Habits ring ─────────────────────────────────────────────────────

type Habit = { id: number; name: string; color: string };
type HabitLog = { habitId: number; date: string; completed: boolean };

function HabitsWidget({ habits, todayDone }: { habits: Habit[]; todayDone: Set<number> }) {
  const done  = habits.filter((h) => todayDone.has(h.id)).length;
  const total = habits.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link href="/habits" className="group block">
      <div className="rounded-xl border border-violet-500/20 bg-card p-4 hover:border-violet-500/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <span className="text-sm font-semibold">Habits</span>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all" />
        </div>

        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No habits yet</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{done}/{total} done</span>
              <span className="text-xs font-semibold text-violet-400">{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {habits.slice(0, 8).map((h) => (
                <div
                  key={h.id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ backgroundColor: `${h.color}22`, color: h.color }}
                >
                  {todayDone.has(h.id) && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  {h.name}
                </div>
              ))}
              {habits.length > 8 && <span className="text-[11px] text-muted-foreground">+{habits.length - 8} more</span>}
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

// ─── Section: Goals tickets ───────────────────────────────────────────────────

function TicketRow({ issue, color }: { issue: Issue; color: string }) {
  const cfg = STATUS_CONFIG[issue.status];
  const Icon = issue.status === "done" ? CheckCircle2 : Circle;
  return (
    <div className="flex items-center gap-2 py-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: cfg.color }} fill={issue.status === "done" ? cfg.color : "none"} strokeWidth={2} />
      <span className="text-xs flex-1 truncate">{issue.title}</span>
      <span
        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
        style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}
      >
        {cfg.label}
      </span>
    </div>
  );
}

function GoalsWidget({ projects, issues }: { projects: Project[]; issues: Record<number, Issue[]> }) {
  const active = projects.filter((p) => p.status === "active");

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-sky-500/15 flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-sky-400" />
          </div>
          <span className="text-sm font-semibold">Active goals</span>
        </div>
        <Link href="/goals" className="text-xs text-sky-400 hover:underline">View all →</Link>
      </div>

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">No active projects</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((p) => {
            const pIssues = issues[p.id] ?? [];
            const open    = pIssues.filter((i) => STATUS_OPEN.includes(i.status));
            const done    = pIssues.filter((i) => i.status === "done").length;
            const total   = pIssues.length;
            const pct     = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <Link key={p.id} href={`/goals/${p.id}`} className="group block">
                <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-5 w-5 rounded" style={{ backgroundColor: `${p.color}33` }}>
                        <div className="h-full w-full rounded" style={{ backgroundColor: p.color, opacity: 0.7 }} />
                      </div>
                      <span className="text-sm font-semibold truncate">{p.title}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground">{pct}%</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-muted overflow-hidden mb-3">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                  </div>

                  {/* Open tickets */}
                  {open.length > 0 && (
                    <div className="divide-y divide-border/50">
                      {open.slice(0, 3).map((i) => <TicketRow key={i.id} issue={i} color={p.color} />)}
                      {open.length > 3 && (
                        <p className="text-[11px] text-muted-foreground pt-1.5">+{open.length - 3} more open</p>
                      )}
                    </div>
                  )}
                  {open.length === 0 && total > 0 && (
                    <p className="text-xs text-emerald-400 font-medium">All caught up ✓</p>
                  )}
                  {total === 0 && (
                    <p className="text-xs text-muted-foreground">No issues yet</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Domain nav cards (compact) ───────────────────────────────────────────────

const DOMAIN_CARDS = [
  { href: "/fitness",  label: "Fitness",  icon: Activity,    color: "emerald" },
  { href: "/finance",  label: "Finance",  icon: DollarSign,  color: "amber"   },
  { href: "/memories", label: "Memories", icon: Camera,      color: "fuchsia" },
] as const;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = localToday();

  const [mood, setMood]         = useState<{ moodScore: number; energyScore: number; stressScore: number } | null>(null);
  const [habits, setHabits]     = useState<Habit[]>([]);
  const [todayDone, setTodayDone] = useState<Set<number>>(new Set());
  const [projects, setProjects] = useState<Project[]>([]);
  const [issueMap, setIssueMap] = useState<Record<number, Issue[]>>({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const [moodData, habitsData, projectsData] = await Promise.all([
        fetch(`/api/mood?date=${today}`).then((r) => r.json()),
        fetch("/api/habits").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ]);

      setMood(moodData);
      setHabits(habitsData);
      setProjects(projectsData);

      // Load today's habit logs
      const logs = await Promise.all(
        (habitsData as Habit[]).map((h) =>
          fetch(`/api/habits/${h.id}/log`).then((r) => r.json())
        )
      );
      const flat = logs.flat() as HabitLog[];
      setTodayDone(new Set(flat.filter((l) => l.date === today && l.completed).map((l) => l.habitId)));

      // Load issues for active projects
      const active = (projectsData as Project[]).filter((p) => p.status === "active");
      const issueResults = await Promise.all(
        active.map((p) => fetch(`/api/projects/${p.id}/issues`).then((r) => r.json()))
      );
      const map: Record<number, Issue[]> = {};
      active.forEach((p, i) => { map[p.id] = issueResults[i]; });
      setIssueMap(map);

      setLoading(false);
    }
    load();
  }, [today]);

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const daysLeft = 365 - dayOfYear;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

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
        <p className="text-xs text-muted-foreground">Day {dayOfYear} of 365 — {Math.round((dayOfYear / 365) * 100)}% through the year</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* Today's pulse row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <MoodPulse mood={mood} />
            <HabitsWidget habits={habits} todayDone={todayDone} />
          </div>

          {/* Goals tickets */}
          <GoalsWidget projects={projects} issues={issueMap} />

          {/* Other domains */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">More</p>
            <div className="grid grid-cols-3 gap-3">
              {DOMAIN_CARDS.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href} className="group">
                  <div className={`rounded-xl border border-${color}-500/20 bg-card p-4 hover:border-${color}-500/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 text-center`}>
                    <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg bg-${color}-500/15 mb-2`}>
                      <Icon className={`h-4 w-4 text-${color}-400`} />
                    </div>
                    <p className="text-sm font-semibold">{label}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Lookback */}
          <div className="rounded-xl border border-dashed border-border p-5 flex items-center gap-4">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Lookback · coming soon</p>
              <p className="text-xs text-muted-foreground">On this day last year — mood, workouts, where you were, what you spent</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
