export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, userProfiles, habits, habitLogs, dailyEntries, workoutSessions, projects, issues } from "@/lib/db";
import { count, gte, eq, and } from "drizzle-orm";
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

  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
  const week   = daysAgo(7);

  if (userId) {
    const [
      [{ total: totalHabits }],
      [{ total: totalLogs }],
      [{ total: totalMood }],
      [{ total: totalWorkouts }],
      [{ total: totalProjects }],
      [{ total: totalIssues }],
      profile,
    ] = await Promise.all([
      db.select({ total: count() }).from(habits).where(eq(habits.userId, userId)),
      db.select({ total: count() }).from(habitLogs).where(eq(habitLogs.userId, userId)),
      db.select({ total: count() }).from(dailyEntries).where(eq(dailyEntries.userId, userId)),
      db.select({ total: count() }).from(workoutSessions).where(eq(workoutSessions.userId, userId)),
      db.select({ total: count() }).from(projects).where(eq(projects.userId, userId)),
      db.select({ total: count() }).from(issues).where(eq(issues.userId, userId)),
      db.select().from(userProfiles).where(eq(userProfiles.id, userId)).limit(1),
    ]);

    const p = profile[0] ?? null;
    const activeWeek = p && p.lastSeen >= week ? 1 : 0;

    return NextResponse.json({
      totalUsers: 1, activeWeek,
      totalHabits, totalLogs, totalMood, totalWorkouts, totalProjects, totalIssues,
      selectedUser: p ? { name: p.name, email: p.email, role: p.role, lastSeen: p.lastSeen } : null,
    });
  }

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
    selectedUser: null,
  });
}
