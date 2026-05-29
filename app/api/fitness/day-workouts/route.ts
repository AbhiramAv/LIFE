import { NextRequest, NextResponse } from "next/server";
import { db, dayWorkouts, daySets, weekGroups, weekSplits, userWeekPlans } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

type SetInput = {
  weekGroupExerciseId: number;
  exerciseId: number;
  setNumber: number;
  targetWeight: number | null;
  targetReps: number;
  actualWeight: number | null;
  actualReps: number | null;
  completed: boolean;
};

// POST /api/fitness/day-workouts
// body: { weekGroupId, date, notes?, sets: SetInput[] }
// Saves the complete workout in one shot (client builds it entirely first)
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { weekGroupId, date, notes, sets } = await req.json();
  if (!date || !Array.isArray(sets)) return NextResponse.json({ error: "date and sets required" }, { status: 400 });

  // Verify ownership of the week group (if provided)
  if (weekGroupId) {
    const [g] = await db.select({ weekSplitId: weekGroups.weekSplitId }).from(weekGroups).where(eq(weekGroups.id, weekGroupId));
    if (!g) return NextResponse.json({ error: "Group not found" }, { status: 404 });
    const [ws] = await db.select({ weekPlanId: weekSplits.weekPlanId }).from(weekSplits).where(eq(weekSplits.id, g.weekSplitId));
    if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [p] = await db.select({ id: userWeekPlans.id }).from(userWeekPlans)
      .where(and(eq(userWeekPlans.id, ws.weekPlanId), eq(userWeekPlans.userId, user.id)));
    if (!p) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const completedAt = sets.some((s: SetInput) => s.completed) ? new Date().toISOString() : null;

  const [dw] = await db.insert(dayWorkouts).values({
    userId: user.id,
    weekGroupId: weekGroupId ?? null,
    date,
    notes: notes ?? null,
    completedAt,
  }).returning();

  if (sets.length > 0) {
    await db.insert(daySets).values(
      sets.map((s: SetInput) => ({
        dayWorkoutId:         dw.id,
        exerciseId:           s.exerciseId,
        weekGroupExerciseId:  s.weekGroupExerciseId ?? null,
        setNumber:            s.setNumber,
        targetWeight:         s.targetWeight ?? null,
        targetReps:           s.targetReps ?? null,
        actualWeight:         s.actualWeight ?? null,
        actualReps:           s.actualReps ?? null,
        completed:            s.completed,
      }))
    );
  }

  return NextResponse.json({ ...dw, setCount: sets.filter((s: SetInput) => s.completed).length }, { status: 201 });
}
