import { NextRequest, NextResponse } from "next/server";
import { db, workoutSets, workoutSessions, exercises } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const exerciseIdParam = req.nextUrl.searchParams.get("exerciseId");
  if (!exerciseIdParam) return NextResponse.json({ error: "exerciseId required" }, { status: 400 });
  const exerciseId = parseInt(exerciseIdParam);

  const userSessions = await db
    .select({ id: workoutSessions.id, date: workoutSessions.date })
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, user.id));

  if (userSessions.length === 0) return NextResponse.json([]);

  const sessionMap = Object.fromEntries(userSessions.map(s => [s.id, s.date]));
  const sessionIds = userSessions.map(s => s.id);

  const sets = await db
    .select({ sessionId: workoutSets.sessionId, reps: workoutSets.reps, weightKg: workoutSets.weightKg })
    .from(workoutSets)
    .where(and(eq(workoutSets.exerciseId, exerciseId), inArray(workoutSets.sessionId, sessionIds)));

  // Group by date
  const byDate: Record<string, { maxWeight: number; max1RM: number; volume: number }> = {};
  for (const s of sets) {
    const date  = sessionMap[s.sessionId];
    const e1RM  = s.weightKg * (1 + s.reps / 30);
    const vol   = s.weightKg * s.reps;
    if (!byDate[date]) byDate[date] = { maxWeight: 0, max1RM: 0, volume: 0 };
    byDate[date].maxWeight = Math.max(byDate[date].maxWeight, s.weightKg);
    byDate[date].max1RM    = Math.max(byDate[date].max1RM, e1RM);
    byDate[date].volume   += vol;
  }

  const result = Object.entries(byDate)
    .map(([date, v]) => ({ date, maxWeight: v.maxWeight, max1RM: Math.round(v.max1RM * 10) / 10, volume: Math.round(v.volume) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(result);
}
