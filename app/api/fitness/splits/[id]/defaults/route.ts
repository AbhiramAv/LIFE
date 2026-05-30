import { NextRequest, NextResponse } from "next/server";
import { db, splitGroups, splitGroupDefaults, exercises, daySets, dayWorkouts, workoutSets, workoutSessions } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

// GET /api/fitness/splits/[id]/defaults
// Returns split groups + default exercises with last weights — NO DB writes.
// Used for the deferred plan creation flow (configure in memory, save at end).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const splitId = parseInt(id);

  const groups = await db.select().from(splitGroups)
    .where(eq(splitGroups.splitId, splitId))
    .orderBy(splitGroups.sortOrder);

  const result = await Promise.all(
    groups.map(async (g) => {
      const defaults = await db.select({
        exerciseId:    splitGroupDefaults.exerciseId,
        sortOrder:     splitGroupDefaults.sortOrder,
        exerciseName:  exercises.name,
        category:      exercises.category,
        equipmentType: exercises.equipmentType,
      })
        .from(splitGroupDefaults)
        .innerJoin(exercises, eq(splitGroupDefaults.exerciseId, exercises.id))
        .where(eq(splitGroupDefaults.splitGroupId, g.id))
        .orderBy(splitGroupDefaults.sortOrder);

      const exWithLastWeight = await Promise.all(
        defaults.map(async (d) => {
          const [dsRow] = await db
            .select({ actualWeight: daySets.actualWeight })
            .from(daySets)
            .innerJoin(dayWorkouts, eq(daySets.dayWorkoutId, dayWorkouts.id))
            .where(and(eq(daySets.exerciseId, d.exerciseId), eq(dayWorkouts.userId, user.id), eq(daySets.completed, true)))
            .orderBy(desc(dayWorkouts.date)).limit(1);

          let lastWeight: number | null = dsRow?.actualWeight ?? null;
          if (lastWeight === null) {
            const [wsRow] = await db
              .select({ weightKg: workoutSets.weightKg })
              .from(workoutSets)
              .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
              .where(and(eq(workoutSets.exerciseId, d.exerciseId), eq(workoutSessions.userId, user.id)))
              .orderBy(desc(workoutSessions.date)).limit(1);
            lastWeight = wsRow?.weightKg ?? null;
          }

          return {
            exerciseId:    d.exerciseId,
            exerciseName:  d.exerciseName,
            category:      d.category,
            equipmentType: d.equipmentType,
            targetSets:    3,
            targetReps:    12,
            targetWeight:  lastWeight,
            lastWeight,
            sortOrder:     d.sortOrder,
          };
        })
      );

      return {
        splitGroupId: g.id,
        name:         g.name,
        sortOrder:    g.sortOrder,
        exercises:    exWithLastWeight,
      };
    })
  );

  return NextResponse.json(result);
}
