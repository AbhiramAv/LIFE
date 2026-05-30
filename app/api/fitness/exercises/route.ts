import { NextRequest, NextResponse } from "next/server";
import { db, exercises, workoutSets, workoutSessions, daySets, dayWorkouts } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const q        = req.nextUrl.searchParams.get("q") ?? "";
  const category = req.nextUrl.searchParams.get("category") ?? "";
  const logged   = req.nextUrl.searchParams.get("logged") === "true";

  let rows = await db.select().from(exercises);

  if (logged) {
    // Old system: workoutSets
    const sessions = await db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(eq(workoutSessions.userId, user.id));
    const sessionIds = sessions.map(s => s.id);
    const oldIds = sessionIds.length > 0
      ? (await db.select({ exerciseId: workoutSets.exerciseId }).from(workoutSets)
          .where(inArray(workoutSets.sessionId, sessionIds))).map(s => s.exerciseId)
      : [];

    // New system: daySets
    const newIds = (await db.select({ exerciseId: daySets.exerciseId })
      .from(daySets)
      .innerJoin(dayWorkouts, eq(daySets.dayWorkoutId, dayWorkouts.id))
      .where(and(eq(dayWorkouts.userId, user.id), eq(daySets.completed, true))))
      .map(s => s.exerciseId);

    const loggedIds = new Set([...oldIds, ...newIds]);
    if (loggedIds.size === 0) return NextResponse.json([]);
    rows = rows.filter(e => loggedIds.has(e.id));
  }

  if (q)        rows = rows.filter(e => e.name.toLowerCase().includes(q.toLowerCase()));
  if (category) rows = rows.filter(e => e.category === category);

  return NextResponse.json(rows);
}
