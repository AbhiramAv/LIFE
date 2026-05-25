import { NextRequest, NextResponse } from "next/server";
import { db, userProfiles, habits, projects, dailyEntries } from "@/lib/db";
import { eq, count } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

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
      habitCount:   hMap[p.id] ?? 0,
      projectCount: pMap[p.id] ?? 0,
      moodCount:    mMap[p.id] ?? 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return unauthorized();
    const guard = adminOnly(user.user_metadata?.role);
    if (guard) return guard;

    const { email, password, name, role = "user" } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });

    const allowed = ["user", "dev", "admin"];
    if (!allowed.includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const now = new Date().toISOString();
    await db.insert(userProfiles).values({
      id: data.user.id,
      email,
      name: name ?? null,
      role,
      lastSeen: now,
    }).onConflictDoNothing();

    return NextResponse.json({ ok: true, id: data.user.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
