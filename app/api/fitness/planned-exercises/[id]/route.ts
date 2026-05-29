import { NextRequest, NextResponse } from "next/server";
import { db, workoutPlans, plannedWorkouts, plannedExercises } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

async function verifyOwnership(peId: number, userId: string) {
  const [pe] = await db.select({ plannedWorkoutId: plannedExercises.plannedWorkoutId })
    .from(plannedExercises).where(eq(plannedExercises.id, peId));
  if (!pe) return false;
  const [w] = await db.select({ planId: plannedWorkouts.planId })
    .from(plannedWorkouts).where(eq(plannedWorkouts.id, pe.plannedWorkoutId));
  if (!w) return false;
  const [plan] = await db.select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, w.planId), eq(workoutPlans.userId, userId)));
  return !!plan;
}

// PATCH /api/fitness/planned-exercises/[id]  body: { targetSets?, targetReps? }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const peId = parseInt(id);
  if (!await verifyOwnership(peId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { targetSets, targetReps } = await req.json();
  const updates: Record<string, number> = {};
  if (targetSets !== undefined) updates.targetSets = targetSets;
  if (targetReps !== undefined) updates.targetReps = targetReps;

  const [updated] = await db.update(plannedExercises).set(updates).where(eq(plannedExercises.id, peId)).returning();
  return NextResponse.json(updated);
}

// DELETE /api/fitness/planned-exercises/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const peId = parseInt(id);
  if (!await verifyOwnership(peId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(plannedExercises).where(eq(plannedExercises.id, peId));
  return NextResponse.json({ ok: true });
}
