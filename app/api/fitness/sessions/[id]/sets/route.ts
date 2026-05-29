import { NextRequest, NextResponse } from "next/server";
import { db, workoutSets, workoutSessions } from "@/lib/db";
import { eq, and, count } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const sid  = parseInt(id);

  // Verify session ownership
  const [session] = await db.select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sid), eq(workoutSessions.userId, user.id)));
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { exerciseId, setNumber, reps, weightKg, rpe } = await req.json();
  if (!exerciseId || !reps || weightKg === undefined)
    return NextResponse.json({ error: "exerciseId, reps, weightKg required" }, { status: 400 });

  // Auto-assign setNumber if not provided
  let finalSetNumber = setNumber;
  if (!finalSetNumber) {
    const [{ value }] = await db
      .select({ value: count() })
      .from(workoutSets)
      .where(and(eq(workoutSets.sessionId, sid), eq(workoutSets.exerciseId, exerciseId)));
    finalSetNumber = (value ?? 0) + 1;
  }

  const [set] = await db.insert(workoutSets).values({
    sessionId:  sid,
    exerciseId,
    setNumber:  finalSetNumber,
    reps,
    weightKg,
    rpe: rpe ?? null,
  }).returning();

  return NextResponse.json(set, { status: 201 });
}
