import { NextRequest, NextResponse } from "next/server";
import { db, workoutPlans, plannedWorkouts } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

async function verifyOwnership(workoutId: number, userId: string) {
  const [row] = await db
    .select({ planId: plannedWorkouts.planId })
    .from(plannedWorkouts)
    .where(eq(plannedWorkouts.id, workoutId));
  if (!row) return false;
  const [plan] = await db.select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, row.planId), eq(workoutPlans.userId, userId)));
  return !!plan;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const wid = parseInt(id);
  if (!await verifyOwnership(wid, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name } = await req.json();
  const [updated] = await db.update(plannedWorkouts).set({ name }).where(eq(plannedWorkouts.id, wid)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const wid = parseInt(id);
  if (!await verifyOwnership(wid, user.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(plannedWorkouts).where(eq(plannedWorkouts.id, wid));
  return NextResponse.json({ ok: true });
}
