import { NextRequest, NextResponse } from "next/server";
import { db, workoutSets, workoutSessions, daySets, dayWorkouts } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const exerciseIdParam = req.nextUrl.searchParams.get("exerciseId");
  if (!exerciseIdParam) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
  const exerciseId = parseInt(exerciseIdParam);

  // Old system: workoutSets joined with workoutSessions
  const userSessions = await db
    .select({ id: workoutSessions.id, date: workoutSessions.date })
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, user.id));
  const sessionMap  = Object.fromEntries(userSessions.map(s => [s.id, s.date]));
  const sessionIds  = userSessions.map(s => s.id);

  const oldSets = sessionIds.length > 0
    ? await db.select({ sessionId: workoutSets.sessionId, reps: workoutSets.reps, weightKg: workoutSets.weightKg })
        .from(workoutSets)
        .where(and(eq(workoutSets.exerciseId, exerciseId), inArray(workoutSets.sessionId, sessionIds)))
    : [];

  // New system: daySets joined with dayWorkouts
  const newSets = await db.select({
    date:     dayWorkouts.date,
    reps:     daySets.actualReps,
    weightKg: daySets.actualWeight,
  })
    .from(daySets)
    .innerJoin(dayWorkouts, eq(daySets.dayWorkoutId, dayWorkouts.id))
    .where(and(
      eq(daySets.exerciseId, exerciseId),
      eq(dayWorkouts.userId, user.id),
      eq(daySets.completed, true),
    ));

  // Unify
  type Row = { date: string; reps: number; weightKg: number };
  const allRows: Row[] = [
    ...oldSets.map(s => ({ date: sessionMap[s.sessionId], reps: s.reps,         weightKg: s.weightKg })),
    ...newSets.map(s => ({ date: s.date,                   reps: s.reps ?? 0,    weightKg: s.weightKg ?? 0 })),
  ].filter(r => r.date && r.weightKg > 0 && r.reps > 0);

  // Aggregate by date
  const byDate: Record<string, { maxWeight: number; max1RM: number; volume: number; sets: number }> = {};
  for (const r of allRows) {
    const e1RM = r.weightKg * (1 + r.reps / 30);
    if (!byDate[r.date]) byDate[r.date] = { maxWeight: 0, max1RM: 0, volume: 0, sets: 0 };
    byDate[r.date].maxWeight  = Math.max(byDate[r.date].maxWeight, r.weightKg);
    byDate[r.date].max1RM     = Math.max(byDate[r.date].max1RM, e1RM);
    byDate[r.date].volume    += r.weightKg * r.reps;
    byDate[r.date].sets++;
  }

  const points = Object.entries(byDate)
    .map(([date, v]) => ({
      date,
      maxWeight: v.maxWeight,
      max1RM:    Math.round(v.max1RM * 10) / 10,
      volume:    Math.round(v.volume),
      sets:      v.sets,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pr        = points.length > 0 ? Math.max(...points.map(p => p.maxWeight)) : 0;
  const prDate    = points.find(p => p.maxWeight === pr)?.date ?? null;
  const lastDate  = points[points.length - 1]?.date ?? null;

  // Week-over-week change
  const last  = points[points.length - 1]?.maxWeight ?? 0;
  const prev  = points[points.length - 2]?.maxWeight ?? 0;
  const delta = points.length >= 2 ? Math.round((last - prev) * 10) / 10 : null;

  return NextResponse.json({
    points,
    summary: { pr, prDate, totalSessions: points.length, lastTrained: lastDate, delta },
  });
}
