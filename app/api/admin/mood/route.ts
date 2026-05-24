export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, dailyEntries } from "@/lib/db";
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

  const baseWhere   = userId ? eq(dailyEntries.userId, userId) : undefined;
  const rangeWhere  = userId
    ? and(eq(dailyEntries.userId, userId), gte(dailyEntries.date, cutoff30))
    : gte(dailyEntries.date, cutoff30);

  const [overall, daily] = await Promise.all([
    db.select({
      total:     count(),
      avgMood:   sql<number>`ROUND(AVG(${dailyEntries.moodScore})::numeric, 1)`.as("avgMood"),
      avgEnergy: sql<number>`ROUND(AVG(${dailyEntries.energyScore})::numeric, 1)`.as("avgEnergy"),
      avgStress: sql<number>`ROUND(AVG(${dailyEntries.stressScore})::numeric, 1)`.as("avgStress"),
    }).from(dailyEntries).where(baseWhere),
    db.select({
      date:    dailyEntries.date,
      mood:    sql<number>`ROUND(AVG(${dailyEntries.moodScore})::numeric, 1)`.as("mood"),
      energy:  sql<number>`ROUND(AVG(${dailyEntries.energyScore})::numeric, 1)`.as("energy"),
      stress:  sql<number>`ROUND(AVG(${dailyEntries.stressScore})::numeric, 1)`.as("stress"),
      entries: count(),
    }).from(dailyEntries).where(rangeWhere)
      .groupBy(dailyEntries.date).orderBy(dailyEntries.date),
  ]);

  return NextResponse.json({ ...overall[0], daily });
}
