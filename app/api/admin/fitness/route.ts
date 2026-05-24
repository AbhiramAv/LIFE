export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, workoutSessions } from "@/lib/db";
import { count, gte, eq, and, sql } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

function adminOnly(role?: string) {
  return role !== "admin" ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null;
}

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const userId   = req.nextUrl.searchParams.get("userId") ?? undefined;
  const cutoff30 = daysAgo(30);

  const baseWhere  = userId ? eq(workoutSessions.userId, userId) : undefined;
  const rangeWhere = userId
    ? and(eq(workoutSessions.userId, userId), gte(workoutSessions.date, cutoff30))
    : gte(workoutSessions.date, cutoff30);

  const [overall, daily] = await Promise.all([
    db.select({
      total:       count(),
      avgDuration: sql<number>`ROUND(AVG(${workoutSessions.durationMins})::numeric, 0)`.as("avgDuration"),
    }).from(workoutSessions).where(baseWhere),
    db.select({
      date:        workoutSessions.date,
      sessions:    count(),
      avgDuration: sql<number>`ROUND(AVG(${workoutSessions.durationMins})::numeric, 0)`.as("avgDuration"),
    }).from(workoutSessions).where(rangeWhere)
      .groupBy(workoutSessions.date).orderBy(workoutSessions.date),
  ]);

  return NextResponse.json({ ...overall[0], daily });
}
