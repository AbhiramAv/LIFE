import { NextRequest, NextResponse } from "next/server";
import { db, workoutPlans, plannedWorkouts, workoutSessions } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

// POST /api/fitness/planned-workouts/[id]/start
// Creates a real workout session for today from a planned workout.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const wid = parseInt(id);

  const [row] = await db.select({ planId: plannedWorkouts.planId })
    .from(plannedWorkouts).where(eq(plannedWorkouts.id, wid));
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [plan] = await db.select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, row.planId), eq(workoutPlans.userId, user.id)));
  if (!plan) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const today = new Date().toISOString().slice(0, 10);
  const [session] = await db.insert(workoutSessions)
    .values({ userId: user.id, date: today })
    .returning();

  return NextResponse.json(session, { status: 201 });
}
