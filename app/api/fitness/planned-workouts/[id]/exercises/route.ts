import { NextRequest, NextResponse } from "next/server";
import { db, workoutPlans, plannedWorkouts, plannedExercises, exercises } from "@/lib/db";
import { eq, and, count } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

async function verifyOwnership(workoutId: number, userId: string) {
  const [row] = await db.select({ planId: plannedWorkouts.planId })
    .from(plannedWorkouts).where(eq(plannedWorkouts.id, workoutId));
  if (!row) return false;
  const [plan] = await db.select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, row.planId), eq(workoutPlans.userId, userId)));
  return !!plan;
}

// POST /api/fitness/planned-workouts/[id]/exercises
// body: { exerciseId, targetSets?, targetReps? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const wid = parseInt(id);
  if (!await verifyOwnership(wid, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { exerciseId, targetSets = 3, targetReps = 12 } = await req.json();
  if (!exerciseId) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });

  const [{ value: sortOrder }] = await db
    .select({ value: count() })
    .from(plannedExercises)
    .where(eq(plannedExercises.plannedWorkoutId, wid));

  const [pe] = await db.insert(plannedExercises)
    .values({ plannedWorkoutId: wid, exerciseId, targetSets, targetReps, sortOrder })
    .returning();

  const [ex] = await db.select({ name: exercises.name, category: exercises.category })
    .from(exercises).where(eq(exercises.id, exerciseId));

  return NextResponse.json({ ...pe, ...ex }, { status: 201 });
}
