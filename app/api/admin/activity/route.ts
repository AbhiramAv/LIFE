import { NextResponse } from "next/server";
import { db, userProfiles, habits, dailyEntries, projects, issues } from "@/lib/db";
import { desc, eq, and, isNotNull, inArray } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  if (user.user_metadata?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [signups, newHabits, moods, newProjects, completedIssues] = await Promise.all([
    db.select({ id: userProfiles.id, email: userProfiles.email, at: userProfiles.createdAt })
      .from(userProfiles).orderBy(desc(userProfiles.createdAt)).limit(40),
    db.select({ id: habits.id, userId: habits.userId, name: habits.name, at: habits.createdAt })
      .from(habits).orderBy(desc(habits.createdAt)).limit(40),
    db.select({ id: dailyEntries.id, userId: dailyEntries.userId, score: dailyEntries.moodScore, at: dailyEntries.createdAt })
      .from(dailyEntries).orderBy(desc(dailyEntries.createdAt)).limit(40),
    db.select({ id: projects.id, userId: projects.userId, title: projects.title, at: projects.createdAt })
      .from(projects).orderBy(desc(projects.createdAt)).limit(40),
    db.select({ id: issues.id, userId: issues.userId, title: issues.title, at: issues.completedAt })
      .from(issues)
      .where(and(eq(issues.status, "done"), isNotNull(issues.completedAt)))
      .orderBy(desc(issues.completedAt)).limit(40),
  ]);

  const userIds = [...new Set([
    ...newHabits.map(h => h.userId),
    ...moods.map(m => m.userId),
    ...newProjects.map(p => p.userId),
    ...completedIssues.map(i => i.userId),
  ])];

  const profileRows = userIds.length > 0
    ? await db.select({ id: userProfiles.id, email: userProfiles.email })
        .from(userProfiles).where(inArray(userProfiles.id, userIds))
    : [];
  const emailMap = Object.fromEntries(profileRows.map(p => [p.id, p.email]));

  const events = [
    ...signups.map(s => ({ type: "signup",  label: "Signed up",        detail: null,           email: s.email,                     userId: s.id,  at: s.at })),
    ...newHabits.map(h => ({ type: "habit",  label: "Created habit",    detail: h.name,         email: emailMap[h.userId] ?? h.userId, userId: h.userId, at: h.at })),
    ...moods.map(m =>     ({ type: "mood",   label: "Logged mood",      detail: `${m.score}/10`, email: emailMap[m.userId] ?? m.userId, userId: m.userId, at: m.at })),
    ...newProjects.map(p => ({ type: "project", label: "Created project", detail: p.title,       email: emailMap[p.userId] ?? p.userId, userId: p.userId, at: p.at })),
    ...completedIssues.filter(i => i.at).map(i => ({ type: "done", label: "Completed ticket", detail: i.title, email: emailMap[i.userId] ?? i.userId, userId: i.userId, at: i.at! })),
  ];

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return NextResponse.json(events.slice(0, 100));
}
