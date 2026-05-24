"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { UserFilter } from "@/components/admin/user-filter";

type Data = {
  total: number; avgMood: number; avgEnergy: number; avgStress: number;
  daily: { date: string; mood: number; energy: number; stress: number; entries: number }[];
};

function MoodContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    const url = userId ? `/api/admin/mood?userId=${userId}` : "/api/admin/mood";
    setData(null);
    fetch(url).then(r => r.json()).then(setData);
  }, [userId]);

  const chartData = (data?.daily ?? []).map(d => ({
    date:   d.date.slice(5),
    Mood:   Number(d.mood),
    Energy: Number(d.energy),
    Stress: Number(d.stress),
  }));

  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total check-ins", value: data?.total,     color: "#8b5cf6" },
          { label: "Avg mood",        value: data?.avgMood,   color: "#f43f5e" },
          { label: "Avg energy",      value: data?.avgEnergy, color: "#10b981" },
          { label: "Avg stress",      value: data?.avgStress, color: "#f59e0b" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <p className="text-2xl font-bold" style={{ color }}>{value ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-sm font-semibold">30-day trend</p>
        {chartData.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-4">No entries yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} width={25} />
              <Tooltip />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Mood"   stroke="#f43f5e" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="Energy" stroke="#10b981" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="Stress" stroke="#f59e0b" dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

export default function AdminMoodPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mood</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Mood data across all users</p>
        </div>
        <UserFilter />
      </div>
      <Suspense>
        <MoodContent />
      </Suspense>
    </div>
  );
}
