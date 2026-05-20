import { NextResponse } from "next/server";
import { db, workoutSessions } from "@/lib/db";
import { count, gte, sql } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

function adminOnly(role?: string) {
  return role !== "admin" ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null;
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const cutoff30 = daysAgo(30);

  const [overall, daily] = await Promise.all([
    db.select({
      total:       count(),
      avgDuration: sql<number>`ROUND(AVG(${workoutSessions.durationMins})::numeric, 0)`.as("avgDuration"),
    }).from(workoutSessions),
    db.select({
      date:    workoutSessions.date,
      sessions: count(),
      avgDuration: sql<number>`ROUND(AVG(${workoutSessions.durationMins})::numeric, 0)`.as("avgDuration"),
    }).from(workoutSessions).where(gte(workoutSessions.date, cutoff30))
      .groupBy(workoutSessions.date).orderBy(workoutSessions.date),
  ]);

  return NextResponse.json({ ...overall[0], daily });
}
