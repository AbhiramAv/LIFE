import { NextRequest, NextResponse } from "next/server";
import { db, workoutSets, workoutSessions, exercises } from "@/lib/db";
import { eq, and, gte, inArray } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

const CATEGORIES = ["push", "pull", "legs", "core", "cardio", "other"];

const CATEGORY_MUSCLES: Record<string, string[]> = {
  push:    ["Chest", "Shoulders", "Triceps"],
  pull:    ["Back", "Biceps", "Rear Delts"],
  legs:    ["Quads", "Hamstrings", "Glutes", "Calves"],
  core:    ["Abs", "Obliques", "Lower Back"],
  cardio:  ["Cardiovascular", "Full Body"],
  other:   ["Mixed"],
};

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const days   = parseInt(req.nextUrl.searchParams.get("days") ?? "7");
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const sessions = await db
    .select({ id: workoutSessions.id, date: workoutSessions.date })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, user.id), gte(workoutSessions.date, cutoff)));

  if (sessions.length === 0) {
    return NextResponse.json(CATEGORIES.map(c => ({ category: c, muscles: CATEGORY_MUSCLES[c], sessions: 0, sets: 0 })));
  }

  const sessionIds = sessions.map(s => s.id);

  const sets = await db
    .select({ sessionId: workoutSets.sessionId, exerciseId: workoutSets.exerciseId })
    .from(workoutSets)
    .where(inArray(workoutSets.sessionId, sessionIds));

  const exerciseIds = [...new Set(sets.map(s => s.exerciseId))];
  const exerciseRows = exerciseIds.length > 0
    ? await db.select({ id: exercises.id, category: exercises.category }).from(exercises).where(inArray(exercises.id, exerciseIds))
    : [];
  const categoryByExercise = Object.fromEntries(exerciseRows.map(e => [e.id, e.category]));

  // Per category: unique session IDs + total sets
  const stats: Record<string, { sessions: Set<number>; sets: number }> = {};
  for (const cat of CATEGORIES) stats[cat] = { sessions: new Set(), sets: 0 };

  for (const set of sets) {
    const cat = categoryByExercise[set.exerciseId] ?? "other";
    if (stats[cat]) {
      stats[cat].sessions.add(set.sessionId);
      stats[cat].sets++;
    }
  }

  return NextResponse.json(
    CATEGORIES.map(c => ({
      category: c,
      muscles:  CATEGORY_MUSCLES[c],
      sessions: stats[c].sessions.size,
      sets:     stats[c].sets,
    }))
  );
}
