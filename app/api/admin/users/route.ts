import { NextResponse } from "next/server";
import { db, userProfiles, habits, projects, dailyEntries } from "@/lib/db";
import { eq, count } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

function adminOnly(role?: string) {
  return role !== "admin"
    ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
    : null;
}

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const profiles = await db.select().from(userProfiles).orderBy(userProfiles.createdAt);

  // Per-user counts
  const [habitCounts, projectCounts, moodCounts] = await Promise.all([
    db.select({ userId: habits.userId, n: count() }).from(habits).groupBy(habits.userId),
    db.select({ userId: projects.userId, n: count() }).from(projects).groupBy(projects.userId),
    db.select({ userId: dailyEntries.userId, n: count() }).from(dailyEntries).groupBy(dailyEntries.userId),
  ]);

  const hMap = Object.fromEntries(habitCounts.map(r => [r.userId, r.n]));
  const pMap = Object.fromEntries(projectCounts.map(r => [r.userId, r.n]));
  const mMap = Object.fromEntries(moodCounts.map(r => [r.userId, r.n]));

  return NextResponse.json(
    profiles.map(p => ({
      ...p,
      habitCount:   hMap[p.id]  ?? 0,
      projectCount: pMap[p.id]  ?? 0,
      moodCount:    mMap[p.id]  ?? 0,
    }))
  );
}
