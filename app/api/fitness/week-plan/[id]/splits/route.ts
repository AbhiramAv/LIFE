import { NextRequest, NextResponse } from "next/server";
import { db, userWeekPlans, weekSplits, weekGroups, weekGroupExercises, splits, splitGroups, splitGroupDefaults, exercises, workoutSets, workoutSessions, daySets, dayWorkouts } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

// POST /api/fitness/week-plan/[id]/splits
// body: { splitId, frequency, useDefaults }
// Creates week_splits + week_groups + (optionally) week_group_exercises from defaults
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const planId = parseInt(id);

  const [plan] = await db.select().from(userWeekPlans)
    .where(and(eq(userWeekPlans.id, planId), eq(userWeekPlans.userId, user.id)));
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { splitId, frequency = 1, useDefaults = true } = await req.json();
  if (!splitId) return NextResponse.json({ error: "splitId required" }, { status: 400 });

  const [split] = await db.select().from(splits).where(eq(splits.id, splitId));
  if (!split) return NextResponse.json({ error: "Split not found" }, { status: 404 });

  // Create week_splits record
  const [ws] = await db.insert(weekSplits)
    .values({ weekPlanId: planId, splitId, frequency })
    .returning();

  // Load split groups
  const groups = await db.select().from(splitGroups)
    .where(eq(splitGroups.splitId, splitId))
    .orderBy(splitGroups.sortOrder);

  // Create week_groups + optionally load default exercises
  const groupsResult = await Promise.all(
    groups.map(async (g) => {
      const [wg] = await db.insert(weekGroups)
        .values({ weekSplitId: ws.id, splitGroupId: g.id, name: g.name, sortOrder: g.sortOrder })
        .returning();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let exercises_: any[] = [];

      if (useDefaults) {
        const defaults = await db.select({
          exerciseId: splitGroupDefaults.exerciseId,
          sortOrder: splitGroupDefaults.sortOrder,
          exerciseName: exercises.name,
          category: exercises.category,
          equipmentType: exercises.equipmentType,
        })
          .from(splitGroupDefaults)
          .innerJoin(exercises, eq(splitGroupDefaults.exerciseId, exercises.id))
          .where(eq(splitGroupDefaults.splitGroupId, g.id))
          .orderBy(splitGroupDefaults.sortOrder);

        // Insert exercises with last weight lookup
        exercises_ = await Promise.all(
          defaults.map(async (d) => {
            // Last weight: try day_sets first
            const [dsRow] = await db
              .select({ actualWeight: daySets.actualWeight })
              .from(daySets)
              .innerJoin(dayWorkouts, eq(daySets.dayWorkoutId, dayWorkouts.id))
              .where(and(eq(daySets.exerciseId, d.exerciseId), eq(dayWorkouts.userId, user.id), eq(daySets.completed, true)))
              .orderBy(desc(dayWorkouts.date))
              .limit(1);

            let lastWeight: number | null = dsRow?.actualWeight ?? null;

            if (lastWeight === null) {
              const [wsRow] = await db
                .select({ weightKg: workoutSets.weightKg })
                .from(workoutSets)
                .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
                .where(and(eq(workoutSets.exerciseId, d.exerciseId), eq(workoutSessions.userId, user.id)))
                .orderBy(desc(workoutSessions.date))
                .limit(1);
              lastWeight = wsRow?.weightKg ?? null;
            }

            const [wge] = await db.insert(weekGroupExercises).values({
              weekGroupId: wg.id,
              exerciseId: d.exerciseId,
              targetSets: 3,
              targetReps: 12,
              targetWeight: lastWeight ?? undefined,
              sortOrder: d.sortOrder,
            }).returning();

            return { ...wge, exerciseName: d.exerciseName, category: d.category, equipmentType: d.equipmentType, lastWeight };
          })
        );
      }

      return { ...wg, exercises: exercises_ };
    })
  );

  return NextResponse.json({
    ...ws,
    splitName: split.name,
    splitSlug: split.slug,
    groups: groupsResult,
  }, { status: 201 });
}
