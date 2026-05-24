"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { UserFilter } from "@/components/admin/user-filter";

type Data = {
  totalProjects: number; totalIssues: number;
  issuesByStatus:      { status: string; count: number }[];
  projectsByCategory:  { category: string; count: number }[];
};

const STATUS_COLORS: Record<string, string> = {
  todo: "#6366f1", in_progress: "#f59e0b", in_review: "#0ea5e9",
  done: "#10b981", cancelled: "#f43f5e", skipped: "#6b7280", backlog: "#8b5cf6",
};

function GoalsContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const url = userId ? `/api/admin/goals?userId=${userId}` : "/api/admin/goals";
    setData(null);
    fetch(url).then(r => r.json()).then(setData);
  }, [userId]);

  const statusData   = (data?.issuesByStatus ?? []).map(r => ({ status: r.status, count: Number(r.count), color: STATUS_COLORS[r.status] ?? "#6b7280" }));
  const categoryData = (data?.projectsByCategory ?? []).map(r => ({ category: r.category, count: Number(r.count) }));

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Total projects", value: data?.totalProjects, color: "#0ea5e9" },
          { label: "Total tickets",  value: data?.totalIssues,   color: "#6366f1" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold" style={{ color }}>{value ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold">Tickets by status</p>
          {statusData.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No tickets yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={statusData} barSize={20}>
                <XAxis dataKey="status" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} width={25} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold">Projects by category</p>
          {categoryData.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No projects yet.</p>
          ) : (
            <div className="space-y-2 pt-1">
              {categoryData.map(({ category, count }) => (
                <div key={category} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 truncate shrink-0 capitalize">{category}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-sky-500"
                      style={{ width: `${Math.round((count / categoryData[0].count) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-5 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminGoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Projects and tickets across all users</p>
        </div>
        <UserFilter />
      </div>
      <Suspense>
        <GoalsContent />
      </Suspense>
    </div>
  );
}
