import { NextRequest, NextResponse } from "next/server";
import { db, exercises, workoutSets, workoutSessions } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const q        = req.nextUrl.searchParams.get("q") ?? "";
  const category = req.nextUrl.searchParams.get("category") ?? "";
  const logged   = req.nextUrl.searchParams.get("logged") === "true";

  let rows = await db.select().from(exercises);

  if (logged) {
    // Only return exercises this user has actually logged
    const sessions = await db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, user.id));

    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) return NextResponse.json([]);

    const sets = await db
      .select({ exerciseId: workoutSets.exerciseId })
      .from(workoutSets)
      .where(inArray(workoutSets.sessionId, sessionIds));

    const loggedIds = [...new Set(sets.map(s => s.exerciseId))];
    rows = rows.filter(e => loggedIds.includes(e.id));
  }

  if (q)        rows = rows.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  if (category) rows = rows.filter(e => e.category === category);

  return NextResponse.json(rows.slice(0, 40));
}
