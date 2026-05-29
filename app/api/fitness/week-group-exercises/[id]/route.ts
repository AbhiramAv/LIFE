import { NextRequest, NextResponse } from "next/server";
import { db, weekGroupExercises, weekGroups, weekSplits, userWeekPlans } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

async function verifyOwnership(wgeId: number, userId: string) {
  const [wge] = await db.select({ weekGroupId: weekGroupExercises.weekGroupId }).from(weekGroupExercises).where(eq(weekGroupExercises.id, wgeId));
  if (!wge) return false;
  const [g] = await db.select({ weekSplitId: weekGroups.weekSplitId }).from(weekGroups).where(eq(weekGroups.id, wge.weekGroupId));
  if (!g) return false;
  const [ws] = await db.select({ weekPlanId: weekSplits.weekPlanId }).from(weekSplits).where(eq(weekSplits.id, g.weekSplitId));
  if (!ws) return false;
  const [p] = await db.select({ id: userWeekPlans.id }).from(userWeekPlans)
    .where(and(eq(userWeekPlans.id, ws.weekPlanId), eq(userWeekPlans.userId, userId)));
  return !!p;
}

// PATCH — update target weight / reps / sets
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const wgeId = parseInt(id);
  if (!await verifyOwnership(wgeId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const updates: Partial<typeof weekGroupExercises.$inferInsert> = {};
  if (body.targetSets   !== undefined) updates.targetSets   = body.targetSets;
  if (body.targetReps   !== undefined) updates.targetReps   = body.targetReps;
  if (body.targetWeight !== undefined) updates.targetWeight = body.targetWeight;

  const [updated] = await db.update(weekGroupExercises).set(updates).where(eq(weekGroupExercises.id, wgeId)).returning();
  return NextResponse.json(updated);
}

// DELETE — remove exercise from group
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const wgeId = parseInt(id);
  if (!await verifyOwnership(wgeId, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(weekGroupExercises).where(eq(weekGroupExercises.id, wgeId));
  return NextResponse.json({ ok: true });
}
