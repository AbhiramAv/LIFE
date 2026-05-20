import { NextResponse } from "next/server";
import { db, habits, habitLogs } from "@/lib/db";
import { count, gte, eq, sql } from "drizzle-orm";
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

  const [
    [{ total: totalHabits }],
    [{ total: totalLogs }],
    dailyLogs,
    topGoals,
  ] = await Promise.all([
    db.select({ total: count() }).from(habits),
    db.select({ total: count() }).from(habitLogs).where(gte(habitLogs.date, cutoff30)),
    db.select({
      date: habitLogs.date,
      completed: sql<number>`SUM(CASE WHEN ${habitLogs.completed} = true THEN 1 ELSE 0 END)`.as("completed"),
      skipped: sql<number>`SUM(CASE WHEN ${habitLogs.logStatus} = 'skipped' THEN 1 ELSE 0 END)`.as("skipped"),
    }).from(habitLogs).where(gte(habitLogs.date, cutoff30))
      .groupBy(habitLogs.date).orderBy(habitLogs.date),
    db.select({
      goal: habits.biggerGoal,
      count: count(),
    }).from(habits).where(sql`${habits.biggerGoal} IS NOT NULL`)
      .groupBy(habits.biggerGoal).orderBy(sql`count(*) DESC`).limit(8),
  ]);

  const completedTotal = dailyLogs.reduce((s, r) => s + Number(r.completed), 0);
  const skippedTotal   = dailyLogs.reduce((s, r) => s + Number(r.skipped),   0);
  const total          = completedTotal + skippedTotal;
  const completionRate = total > 0 ? Math.round((completedTotal / total) * 100) : 0;

  return NextResponse.json({ totalHabits, totalLogs, completionRate, dailyLogs, topGoals });
}
