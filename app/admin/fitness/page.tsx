"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Data = {
  total: number; avgDuration: number;
  daily: { date: string; sessions: number; avgDuration: number }[];
};

export default function AdminFitnessPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/admin/fitness").then(r => r.json()).then(setData);
  }, []);

  const chartData = (data?.daily ?? []).map(d => ({
    date: d.date.slice(5),
    Sessions: Number(d.sessions),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Aggregate workout data across all users</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Total sessions",  value: data?.total,       color: "#10b981" },
          { label: "Avg duration",    value: data?.avgDuration ? `${data.avgDuration} min` : "—", color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold" style={{ color }}>{value ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold">Sessions · last 30 days</p>
        {chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4">No sessions yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={8}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tick={{ fontSize: 9 }} width={25} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Sessions" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
