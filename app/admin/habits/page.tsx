"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Data = {
  totalHabits: number; totalLogs: number; completionRate: number;
  dailyLogs: { date: string; completed: number; skipped: number }[];
  topGoals: { goal: string; count: number }[];
};

export default function AdminHabitsPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/admin/habits").then(r => r.json()).then(setData);
  }, []);

  const chartData = (data?.dailyLogs ?? []).map(d => ({
    date: d.date.slice(5),
    completed: Number(d.completed),
    skipped: Number(d.skipped),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Habits</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aggregate habit activity across all users</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total habits", value: data?.totalHabits, color: "#8b5cf6" },
          { label: "Logs (last 30d)", value: data?.totalLogs, color: "#10b981" },
          { label: "Completion rate", value: data ? `${data.completionRate}%` : "—", color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold" style={{ color }}>{value ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold">Daily logs · last 30 days</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} barSize={6}>
            <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
            <YAxis tick={{ fontSize: 9 }} width={25} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="completed" stackId="a" fill="#10b981" radius={[2,2,0,0]} name="Completed" />
            <Bar dataKey="skipped" stackId="a" fill="#f59e0b" radius={[2,2,0,0]} name="Skipped" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {(data?.topGoals?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-sm font-semibold">Top bigger goals</p>
          <div className="space-y-2">
            {data!.topGoals.map(({ goal, count }) => (
              <div key={goal} className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-violet-500"
                    style={{ width: `${Math.round((count / data!.topGoals[0].count) * 100)}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right shrink-0">{count}</span>
                <span className="text-xs font-medium w-40 truncate shrink-0">{goal}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
