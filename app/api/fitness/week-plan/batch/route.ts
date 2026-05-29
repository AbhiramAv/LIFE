import { NextRequest, NextResponse } from "next/server";
import { db, userWeekPlans, weekSplits, weekGroups, weekGroupExercises, splits } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

type BatchExercise = {
  exerciseId: number; exerciseName: string; category: string; equipmentType: string;
  targetSets: number; targetReps: number; targetWeight: number | null; sortOrder: number;
};
type BatchGroup   = { splitGroupId: number; name: string; sortOrder: number; exercises: BatchExercise[] };
type BatchSplit   = { splitId: number; frequency: number; groups: BatchGroup[] };

// POST /api/fitness/week-plan/batch
// Creates (or reuses) week plan + all splits/groups/exercises in one shot.
// Used for the deferred plan creation flow.
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { weekStart, splits: splitConfigs }: { weekStart: string; splits: BatchSplit[] } = await req.json();
  if (!weekStart || !Array.isArray(splitConfigs)) {
    return NextResponse.json({ error: "weekStart and splits required" }, { status: 400 });
  }

  // Get or create the week plan
  let [plan] = await db.select().from(userWeekPlans)
    .where(and(eq(userWeekPlans.userId, user.id), eq(userWeekPlans.weekStart, weekStart)));
  if (!plan) {
    [plan] = await db.insert(userWeekPlans).values({ userId: user.id, weekStart }).returning();
  }

  const createdSplits = await Promise.all(
    splitConfigs.map(async (sc) => {
      const [ws] = await db.insert(weekSplits)
        .values({ weekPlanId: plan.id, splitId: sc.splitId, frequency: sc.frequency })
        .returning();

      const [sp] = await db.select({ name: splits.name, slug: splits.slug })
        .from(splits).where(eq(splits.id, sc.splitId));

      const createdGroups = await Promise.all(
        sc.groups.map(async (g) => {
          const [wg] = await db.insert(weekGroups)
            .values({ weekSplitId: ws.id, splitGroupId: g.splitGroupId, name: g.name, sortOrder: g.sortOrder })
            .returning();

          const createdExercises = await Promise.all(
            g.exercises.map(async (ex) => {
              const [wge] = await db.insert(weekGroupExercises)
                .values({
                  weekGroupId:  wg.id,
                  exerciseId:   ex.exerciseId,
                  targetSets:   ex.targetSets ?? 3,
                  targetReps:   ex.targetReps ?? 12,
                  targetWeight: ex.targetWeight ?? null,
                  sortOrder:    ex.sortOrder ?? 0,
                })
                .returning();
              return { ...wge, exerciseName: ex.exerciseName, category: ex.category, equipmentType: ex.equipmentType, lastWeight: ex.targetWeight };
            })
          );

          return { ...wg, exercises: createdExercises };
        })
      );

      return { ...ws, splitName: sp?.name, splitSlug: sp?.slug, groups: createdGroups };
    })
  );

  return NextResponse.json({ ...plan, splits: createdSplits, dayWorkouts: [] }, { status: 201 });
}
