import { NextRequest, NextResponse } from "next/server";
import { db, workoutSets, workoutSessions, daySets, dayWorkouts, exercises } from "@/lib/db";
import { eq, and, gte, lt, inArray } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const days    = parseInt(req.nextUrl.searchParams.get("days")   ?? "30");
  const offset  = parseInt(req.nextUrl.searchParams.get("offset") ?? "0");
  const endMs   = Date.now() - offset * 86400000;
  const cutoff  = new Date(endMs - days * 86400000).toISOString().slice(0, 10);
  const endDate = offset > 0 ? new Date(endMs).toISOString().slice(0, 10) : null;

  type Row = { date: string; category: string; exerciseId: number; exerciseName: string };
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
      .select({ sessionId: workoutSets.sessionId, category: exercises.category, exerciseId: exercises.id, exerciseName: exercises.name })
      .from(workoutSets)
      .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
      .where(inArray(workoutSets.sessionId, sessionIds));
    for (const r of oldRows) {
      rows.push({ date: sessionDateMap[r.sessionId], category: r.category, exerciseId: r.exerciseId, exerciseName: r.exerciseName });
    }
  }

  // New system
  const newRows = await db
    .select({ date: dayWorkouts.date, category: exercises.category, exerciseId: exercises.id, exerciseName: exercises.name })
    .from(daySets)
    .innerJoin(dayWorkouts, eq(daySets.dayWorkoutId, dayWorkouts.id))
    .innerJoin(exercises,   eq(daySets.exerciseId, exercises.id))
    .where(endDate
      ? and(eq(dayWorkouts.userId, user.id), eq(daySets.completed, true), gte(dayWorkouts.date, cutoff), lt(dayWorkouts.date, endDate))
      : and(eq(dayWorkouts.userId, user.id), eq(daySets.completed, true), gte(dayWorkouts.date, cutoff)));

  for (const r of newRows) {
    rows.push({ date: r.date, category: r.category, exerciseId: r.exerciseId, exerciseName: r.exerciseName });
  }

  // Per-date aggregation
  const byDate: Record<string, { cats: Set<string>; exIds: Set<number> }> = {};
  for (const r of rows) {
    if (!byDate[r.date]) byDate[r.date] = { cats: new Set(), exIds: new Set() };
    byDate[r.date].cats.add(r.category);
    byDate[r.date].exIds.add(r.exerciseId);
  }

  const sessions = Object.entries(byDate)
    .map(([date, v]) => ({ date, categories: [...v.cats] }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Unique exercises
  const exMap: Record<number, string> = {};
  for (const r of rows) exMap[r.exerciseId] = r.exerciseName;
  const uniqueExercises = Object.values(exMap).sort();

  return NextResponse.json({ sessions, uniqueExercises });
}
