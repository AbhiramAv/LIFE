"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, Target, Heart, Activity, Layers, MessageSquare } from "lucide-react";
import { UserFilter } from "@/components/admin/user-filter";

type SelectedUser = { name: string | null; email: string; role: string; lastSeen: string };
type Stats = {
  totalUsers: number; activeWeek: number;
  totalHabits: number; totalLogs: number;
  totalMood: number; totalWorkouts: number;
  totalProjects: number; totalIssues: number;
  selectedUser: SelectedUser | null;
};

const CARDS = [
  { key: "totalUsers",    label: "Total users",      sub: (s: Stats) => `${s.activeWeek} active this week`, icon: Users,        color: "#8b5cf6", href: "/admin/users"   },
  { key: "totalHabits",   label: "Habits created",   sub: (s: Stats) => `${s.totalLogs} logs recorded`,    icon: Target,       color: "#10b981", href: "/admin/habits"  },
  { key: "totalMood",     label: "Mood check-ins",   sub: ()         => "across all users",                icon: Heart,        color: "#f43f5e", href: "/admin/mood"    },
  { key: "totalWorkouts", label: "Workout sessions", sub: ()         => "logged total",                    icon: Activity,     color: "#f59e0b", href: "/admin/fitness" },
  { key: "totalProjects", label: "Projects",         sub: (s: Stats) => `${s.totalIssues} tickets total`,  icon: Layers,       color: "#0ea5e9", href: "/admin/goals"   },
  { key: "totalIssues",   label: "Total tickets",    sub: ()         => "across all projects",             icon: MessageSquare, color: "#6366f1", href: "/admin/goals"  },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatCard({ label, value, sub, icon: Icon, color, href }: {
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
        background: hov ? `linear-gradient(135deg, ${color}10 0%, transparent 55%)` : `linear-gradient(135deg, ${color}05 0%, transparent 55%)`,
        transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
        cursor: "pointer",
      }}
      className="relative rounded-2xl border bg-card overflow-hidden p-5 space-y-3"
    >
      <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${color}, ${color}00)` }} />
      <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full blur-2xl pointer-events-none" style={{ backgroundColor: `${color}25` }} />
      <div className="relative h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="relative">
        <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        <p className="text-xs font-medium mt-0.5">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function OverviewContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const url = userId ? `/api/admin/overview?userId=${userId}` : "/api/admin/overview";
    fetch(url).then(r => r.json()).then(setStats);
  }, [userId]);

  const su = stats?.selectedUser;

  return (
    <>
      {su && (
        <div className="rounded-xl border border-border bg-card px-5 py-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-base font-bold text-primary shrink-0">
            {(su.name ?? su.email)[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{su.name ?? su.email}</p>
            <p className="text-xs text-muted-foreground truncate">{su.email} · <span className="capitalize">{su.role}</span></p>
          </div>
          <div className="ml-auto text-right shrink-0">
            <p className="text-[10px] text-muted-foreground">Last seen</p>
            <p className="text-xs font-medium">{timeAgo(su.lastSeen)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {CARDS.map(({ key, label, sub, icon, color, href }) => (
          <StatCard
            key={key}
            label={label}
            value={stats ? (stats[key as keyof Stats] as number ?? 0) : "—"}
            sub={stats ? sub(stats) : "—"}
            icon={icon}
            color={color}
            href={userId ? `${href}?userId=${userId}` : href}
          />
        ))}
      </div>
    </>
  );
}

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform-wide aggregate metrics</p>
        </div>
        <UserFilter />
      </div>
      <Suspense>
        <OverviewContent />
      </Suspense>
    </div>
  );
}
