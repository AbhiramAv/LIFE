import { NextRequest, NextResponse } from "next/server";
import { db, weekGroups, weekSplits, userWeekPlans, weekGroupExercises, exercises, daySets, dayWorkouts, workoutSets, workoutSessions } from "@/lib/db";
import { eq, and, desc, count } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

async function verifyOwnership(weekGroupId: number, userId: string) {
  const [g] = await db.select({ weekSplitId: weekGroups.weekSplitId }).from(weekGroups).where(eq(weekGroups.id, weekGroupId));
  if (!g) return false;
  const [ws] = await db.select({ weekPlanId: weekSplits.weekPlanId }).from(weekSplits).where(eq(weekSplits.id, g.weekSplitId));
  if (!ws) return false;
  const [p] = await db.select({ id: userWeekPlans.id }).from(userWeekPlans)
    .where(and(eq(userWeekPlans.id, ws.weekPlanId), eq(userWeekPlans.userId, userId)));
  return !!p;
}

// POST /api/fitness/week-groups/[id]/exercises
// body: { exerciseId, targetSets?, targetReps?, targetWeight? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const wgId = parseInt(id);
  if (!await verifyOwnership(wgId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { exerciseId, targetSets = 3, targetReps = 12, targetWeight } = await req.json();
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  const [{ value: sortOrder }] = await db.select({ value: count() }).from(weekGroupExercises).where(eq(weekGroupExercises.weekGroupId, wgId));

  const [wge] = await db.insert(weekGroupExercises).values({
    weekGroupId: wgId, exerciseId, targetSets, targetReps,
    targetWeight: targetWeight ?? null, sortOrder,
  }).returning();

  const [ex] = await db.select({ name: exercises.name, category: exercises.category }).from(exercises).where(eq(exercises.id, exerciseId));

  // Last weight
  const [dsRow] = await db.select({ actualWeight: daySets.actualWeight }).from(daySets)
    .innerJoin(dayWorkouts, eq(daySets.dayWorkoutId, dayWorkouts.id))
    .where(and(eq(daySets.exerciseId, exerciseId), eq(dayWorkouts.userId, user.id), eq(daySets.completed, true)))
    .orderBy(desc(dayWorkouts.date)).limit(1);

  let lastWeight: number | null = dsRow?.actualWeight ?? null;
  if (lastWeight === null) {
    const [wsRow] = await db.select({ weightKg: workoutSets.weightKg }).from(workoutSets)
      .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
      .where(and(eq(workoutSets.exerciseId, exerciseId), eq(workoutSessions.userId, user.id)))
      .orderBy(desc(workoutSessions.date)).limit(1);
    lastWeight = wsRow?.weightKg ?? null;
  }

  return NextResponse.json({ ...wge, exerciseName: ex?.name, category: ex?.category, lastWeight }, { status: 201 });
}
