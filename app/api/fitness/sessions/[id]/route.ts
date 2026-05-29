import { NextRequest, NextResponse } from "next/server";
import { db, workoutSessions, workoutSets, exercises } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const sid = parseInt(id);

  const [session] = await db.select().from(workoutSessions)
    .where(and(eq(workoutSessions.id, sid), eq(workoutSessions.userId, user.id)));
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sets = await db
    .select({
      id:           workoutSets.id,
      exerciseId:   workoutSets.exerciseId,
      exerciseName: exercises.name,
      category:     exercises.category,
      setNumber:    workoutSets.setNumber,
      reps:         workoutSets.reps,
      weightKg:     workoutSets.weightKg,
      rpe:          workoutSets.rpe,
    })
    .from(workoutSets)
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(eq(workoutSets.sessionId, sid))
    .orderBy(workoutSets.exerciseId, workoutSets.setNumber);

  // Group by exercise
  const blockMap: Record<number, { exerciseId: number; name: string; category: string; sets: object[] }> = {};
  for (const s of sets) {
    if (!blockMap[s.exerciseId]) {
      blockMap[s.exerciseId] = { exerciseId: s.exerciseId, name: s.exerciseName, category: s.category, sets: [] };
    }
    blockMap[s.exerciseId].sets.push({ id: s.id, setNumber: s.setNumber, reps: s.reps, weightKg: s.weightKg, rpe: s.rpe });
  }

  return NextResponse.json({ ...session, exercises: Object.values(blockMap) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const sid  = parseInt(id);
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.durationMins !== undefined) update.durationMins = body.durationMins;
  if (body.notes        !== undefined) update.notes        = body.notes;

  const [updated] = await db.update(workoutSessions).set(update)
    .where(and(eq(workoutSessions.id, sid), eq(workoutSessions.userId, user.id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  await db.delete(workoutSessions)
    .where(and(eq(workoutSessions.id, parseInt(id)), eq(workoutSessions.userId, user.id)));

  return NextResponse.json({ ok: true });
}
