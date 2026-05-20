"use client";

import { useState, useEffect } from "react";
import { Users, Target, Heart, Activity, Layers, MessageSquare } from "lucide-react";

type Stats = {
  totalUsers: number; activeWeek: number;
  totalHabits: number; totalLogs: number;
  totalMood: number; totalWorkouts: number;
  totalProjects: number; totalIssues: number;
};

const CARDS = [
  { key: "totalUsers",    label: "Total users",      sub: (s: Stats) => `${s.activeWeek} active this week`, icon: Users,       color: "#8b5cf6" },
  { key: "totalHabits",   label: "Habits created",   sub: (s: Stats) => `${s.totalLogs} logs recorded`,    icon: Target,      color: "#10b981" },
  { key: "totalMood",     label: "Mood check-ins",   sub: ()         => "across all users",                icon: Heart,       color: "#f43f5e" },
  { key: "totalWorkouts", label: "Workout sessions", sub: ()         => "logged total",                    icon: Activity,    color: "#f59e0b" },
  { key: "totalProjects", label: "Projects",         sub: (s: Stats) => `${s.totalIssues} tickets total`,  icon: Layers,      color: "#0ea5e9" },
  { key: "totalIssues",   label: "Total tickets",    sub: ()         => "across all projects",             icon: MessageSquare, color: "#6366f1" },
];

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview").then(r => r.json()).then(setStats);
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform-wide aggregate metrics</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {CARDS.map(({ key, label, sub, icon: Icon, color }) => (
          <div key={key} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${color}18` }}>
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color }}>
                {stats ? (stats[key as keyof Stats] ?? 0) : "—"}
              </p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stats ? sub(stats) : "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
