"use client";

import { useState, useEffect } from "react";

type UserRow = {
  id: string; email: string; name: string | null; role: string;
  createdAt: string; lastSeen: string;
  habitCount: number; projectCount: number; moodCount: number;
};

const ROLES = ["user", "dev", "admin"];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  dev:   "bg-amber-500/15 text-amber-400 border-amber-500/20",
  user:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminUsersPage() {
  const [users, setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  async function changeRole(userId: string, role: string) {
    setChanging(userId);
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    setChanging(null);
  }

  const totalHabits   = users.reduce((s, u) => s + u.habitCount,   0);
  const totalProjects = users.reduce((s, u) => s + u.projectCount, 0);
  const totalMood     = users.reduce((s, u) => s + u.moodCount,    0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{users.length} accounts · manage roles and activity</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total users",    value: users.length,   color: "#8b5cf6" },
          { label: "Habits created", value: totalHabits,    color: "#10b981" },
          { label: "Projects",       value: totalProjects,  color: "#0ea5e9" },
          { label: "Mood entries",   value: totalMood,      color: "#f43f5e" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold" style={{ color }}>{loading ? "—" : value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {["User", "Name", "Role", "Habits", "Projects", "Mood", "Last seen", "Joined"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }, (_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground text-xs">No users yet</td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary uppercase shrink-0">
                      {(u.name || u.email)[0]}
                    </div>
                    <span className="text-xs font-medium truncate max-w-[140px]">{u.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={changing === u.id}
                    onChange={e => changeRole(u.id, e.target.value)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border cursor-pointer bg-transparent appearance-none ${ROLE_COLORS[u.role] ?? ROLE_COLORS.user}`}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.habitCount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.projectCount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{u.moodCount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{timeAgo(u.lastSeen)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
