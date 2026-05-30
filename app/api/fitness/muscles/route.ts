import { NextRequest, NextResponse } from "next/server";
import { db, workoutSets, workoutSessions, daySets, dayWorkouts, exercises } from "@/lib/db";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const days    = parseInt(req.nextUrl.searchParams.get("days")   ?? "7");
  const offset  = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");
  const endMs   = Date.now() - offset * 86400000;
  const cutoff  = new Date(endMs - days * 86400000).toISOString().slice(0, 10);
  const endDate = offset > 0 ? new Date(endMs).toISOString().slice(0, 10) : null;

  type Row = { date: string; muscle: string; category: string; weight: number; reps: number };
  const rows: Row[] = [];

  // Old system
  const oldSessions = await db
    .select({ id: workoutSessions.id, date: workoutSessions.date })
    .from(workoutSessions)
    .where(endDate
      ? and(eq(workoutSessions.userId, user.id), gte(workoutSessions.date, cutoff), lt(workoutSessions.date, endDate))
      : and(eq(workoutSessions.userId, user.id), gte(workoutSessions.date, cutoff)));

  if (oldSessions.length > 0) {
    const sessionIds     = oldSessions.map(s => s.id);
    const sessionDateMap = Object.fromEntries(oldSessions.map(s => [s.id, s.date]));

    const oldRows = await db
      .select({
        sessionId: workoutSets.sessionId,
        reps:      workoutSets.reps,
        weight:    workoutSets.weightKg,
        muscle:    exercises.muscleGroups,
        category:  exercises.category,
      })
      .from(workoutSets)
      .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .where(inArray(workoutSets.sessionId, sessionIds));

    for (const r of oldRows) {
      rows.push({ date: sessionDateMap[r.sessionId], muscle: r.muscle, category: r.category, weight: r.weight ?? 0, reps: r.reps ?? 0 });
    }
  }

  // New system
  const newRows = await db
    .select({
      date:     dayWorkouts.date,
      reps:     daySets.actualReps,
      weight:   daySets.actualWeight,
      muscle:   exercises.muscleGroups,
      category: exercises.category,
    })
    .from(daySets)
    .innerJoin(dayWorkouts, eq(daySets.dayWorkoutId, dayWorkouts.id))
    .innerJoin(exercises,   eq(daySets.exerciseId, exercises.id))
    .where(endDate
      ? and(eq(dayWorkouts.userId, user.id), eq(daySets.completed, true), gte(dayWorkouts.date, cutoff), lt(dayWorkouts.date, endDate))
      : and(eq(dayWorkouts.userId, user.id), eq(daySets.completed, true), gte(dayWorkouts.date, cutoff)));

  for (const r of newRows) {
    rows.push({ date: r.date, muscle: r.muscle, category: r.category, weight: r.weight ?? 0, reps: r.reps ?? 0 });
  }

  // Aggregate by muscle
  const agg: Record<string, { muscle: string; category: string; sets: number; volume: number; dates: Set<string>; lastTrained: string }> = {};

  for (const r of rows) {
    if (!agg[r.muscle]) {
      agg[r.muscle] = { muscle: r.muscle, category: r.category, sets: 0, volume: 0, dates: new Set(), lastTrained: r.date };
    }
    agg[r.muscle].sets++;
    agg[r.muscle].volume += r.weight * r.reps;
    agg[r.muscle].dates.add(r.date);
    if (r.date > agg[r.muscle].lastTrained) agg[r.muscle].lastTrained = r.date;
  }

  const result = Object.values(agg)
    .map(m => ({
      muscle:      m.muscle,
      category:    m.category,
      sets:        m.sets,
      volume:      Math.round(m.volume),
      sessions:    m.dates.size,
      lastTrained: m.lastTrained,
    }))
    .sort((a, b) => b.sets - a.sets);

  return NextResponse.json(result);
}
