export const revalidate = 30;
import { NextResponse } from "next/server";
import { db, userProfiles, habits, habitLogs, dailyEntries, workoutSessions, projects, issues } from "@/lib/db";
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

  const week = daysAgo(7);

  const [
    [{ total: totalUsers }],
    [{ total: activeWeek }],
    [{ total: totalHabits }],
    [{ total: totalLogs }],
    [{ total: totalMood }],
    [{ total: totalWorkouts }],
    [{ total: totalProjects }],
    [{ total: totalIssues }],
  ] = await Promise.all([
    db.select({ total: count() }).from(userProfiles),
    db.select({ total: count() }).from(userProfiles).where(gte(userProfiles.lastSeen, week)),
    db.select({ total: count() }).from(habits),
    db.select({ total: count() }).from(habitLogs),
    db.select({ total: count() }).from(dailyEntries),
    db.select({ total: count() }).from(workoutSessions),
    db.select({ total: count() }).from(projects),
    db.select({ total: count() }).from(issues),
  ]);

  return NextResponse.json({
    totalUsers, activeWeek, totalHabits, totalLogs,
    totalMood, totalWorkouts, totalProjects, totalIssues,
  });
}
