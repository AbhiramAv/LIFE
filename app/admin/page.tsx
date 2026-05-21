"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Target, Heart, Activity, Layers, MessageSquare } from "lucide-react";

type Stats = {
  totalUsers: number; activeWeek: number;
  totalHabits: number; totalLogs: number;
  totalMood: number; totalWorkouts: number;
  totalProjects: number; totalIssues: number;
};

const CARDS = [
  { key: "totalUsers",    label: "Total users",      sub: (s: Stats) => `${s.activeWeek} active this week`, icon: Users,         color: "#8b5cf6", href: "/admin/users"   },
  { key: "totalHabits",   label: "Habits created",   sub: (s: Stats) => `${s.totalLogs} logs recorded`,    icon: Target,         color: "#10b981", href: "/admin/habits"  },
  { key: "totalMood",     label: "Mood check-ins",   sub: ()         => "across all users",                icon: Heart,          color: "#f43f5e", href: "/admin/mood"    },
  { key: "totalWorkouts", label: "Workout sessions", sub: ()         => "logged total",                    icon: Activity,       color: "#f59e0b", href: "/admin/fitness" },
  { key: "totalProjects", label: "Projects",         sub: (s: Stats) => `${s.totalIssues} tickets total`,  icon: Layers,         color: "#0ea5e9", href: "/admin/goals"   },
  { key: "totalIssues",   label: "Total tickets",    sub: ()         => "across all projects",             icon: MessageSquare,  color: "#6366f1", href: "/admin/goals"   },
];

function StatCard({
  label, value, sub, icon: Icon, color, href,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; color: string; href: string;
}) {
  const [hov, setHov] = useState(false);
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(href)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderColor: hov ? `${color}55` : `${color}22`,
        boxShadow: hov
          ? `0 12px 32px -6px ${color}35, 0 0 0 1px ${color}30, inset 0 1px 0 ${color}15`
          : `0 2px 8px -2px ${color}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        background: hov
          ? `linear-gradient(135deg, ${color}10 0%, transparent 55%)`
          : `linear-gradient(135deg, ${color}05 0%, transparent 55%)`,
        transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
        cursor: "pointer",
      }}
      className="relative rounded-2xl border bg-card overflow-hidden p-5 space-y-3"
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 inset-x-0 h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}00)` }}
      />
      {/* Corner glow */}
      <div
        className="absolute -top-6 -right-6 h-16 w-16 rounded-full blur-2xl pointer-events-none"
        style={{ backgroundColor: `${color}25` }}
      />

      <div className="relative">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>

      <div className="relative">
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        <p className="text-xs font-medium mt-0.5">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

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
        {CARDS.map(({ key, label, sub, icon, color, href }) => (
          <StatCard
            key={key}
            label={label}
            value={stats ? (stats[key as keyof Stats] ?? 0) : "—"}
            sub={stats ? sub(stats) : "—"}
            icon={icon}
            color={color}
            href={href}
          />
        ))}
      </div>
    </div>
  );
}
