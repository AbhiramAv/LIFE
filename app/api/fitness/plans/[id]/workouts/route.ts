import { NextRequest, NextResponse } from "next/server";
import { db, workoutPlans, plannedWorkouts } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

// POST /api/fitness/plans/[id]/workouts  body: { dayOfWeek, name? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const planId = parseInt(id);

  const [plan] = await db.select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(and(eq(workoutPlans.id, planId), eq(workoutPlans.userId, user.id)));
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { dayOfWeek, name } = await req.json();
  if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7)
    return NextResponse.json({ error: "dayOfWeek 1-7 required" }, { status: 400 });

  const [workout] = await db.insert(plannedWorkouts)
    .values({ planId, dayOfWeek, name: name ?? null })
    .returning();

  return NextResponse.json({ ...workout, exercises: [] }, { status: 201 });
}
