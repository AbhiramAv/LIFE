import { NextRequest, NextResponse } from "next/server";
import { db, userWeekPlans, weekSplits, weekGroups, weekGroupExercises, splits, splitGroups, exercises, workoutSets, workoutSessions, dayWorkouts, daySets } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

// GET /api/fitness/week-plan?weekStart=YYYY-MM-DD
// Returns full plan: splits → groups → exercises (with last weight) + day workouts this week
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const weekStart = req.nextUrl.searchParams.get("weekStart") ?? "";
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const [plan] = await db.select().from(userWeekPlans)
    .where(and(eq(userWeekPlans.userId, user.id), eq(userWeekPlans.weekStart, weekStart)));
  if (!plan) return NextResponse.json(null);

  // Load splits → groups → exercises
  const ws = await db.select({
    id: weekSplits.id, splitId: weekSplits.splitId, frequency: weekSplits.frequency,
    splitName: splits.name, splitSlug: splits.slug,
  })
    .from(weekSplits)
    .innerJoin(splits, eq(weekSplits.splitId, splits.id))
    .where(eq(weekSplits.weekPlanId, plan.id));

  const splitsWithGroups = await Promise.all(
    ws.map(async (ws_) => {
      const groups = await db.select({
        id: weekGroups.id, name: weekGroups.name,
        splitGroupId: weekGroups.splitGroupId, sortOrder: weekGroups.sortOrder,
      })
        .from(weekGroups)
        .where(eq(weekGroups.weekSplitId, ws_.id))
        .orderBy(weekGroups.sortOrder);

      const groupsWithEx = await Promise.all(
        groups.map(async (g) => {
          const exRows = await db.select({
            id: weekGroupExercises.id,
            exerciseId: weekGroupExercises.exerciseId,
            targetSets: weekGroupExercises.targetSets,
            targetReps: weekGroupExercises.targetReps,
            targetWeight: weekGroupExercises.targetWeight,
            sortOrder: weekGroupExercises.sortOrder,
            exerciseName: exercises.name,
            category: exercises.category,
            equipmentType: exercises.equipmentType,
          })
            .from(weekGroupExercises)
            .innerJoin(exercises, eq(weekGroupExercises.exerciseId, exercises.id))
            .where(eq(weekGroupExercises.weekGroupId, g.id))
            .orderBy(weekGroupExercises.sortOrder);

          // Fetch last actual weight for each exercise from day_sets or workout_sets
          const exWithLastWeight = await Promise.all(
            exRows.map(async (ex) => {
              // Try day_sets first
              const [daySetRow] = await db
                .select({ actualWeight: daySets.actualWeight })
                .from(daySets)
                .innerJoin(dayWorkouts, eq(daySets.dayWorkoutId, dayWorkouts.id))
                .where(and(
                  eq(daySets.exerciseId, ex.exerciseId),
                  eq(dayWorkouts.userId, user.id),
                  eq(daySets.completed, true),
                ))
                .orderBy(desc(dayWorkouts.date))
                .limit(1);

              let lastWeight = daySetRow?.actualWeight ?? null;

              // Fallback to workout_sets
              if (lastWeight === null) {
                const [wsRow] = await db
                  .select({ weightKg: workoutSets.weightKg })
                  .from(workoutSets)
                  .innerJoin(workoutSessions, eq(workoutSets.sessionId, workoutSessions.id))
                  .where(and(
                    eq(workoutSets.exerciseId, ex.exerciseId),
                    eq(workoutSessions.userId, user.id),
                  ))
                  .orderBy(desc(workoutSessions.date))
                  .limit(1);
                lastWeight = wsRow?.weightKg ?? null;
              }

              return { ...ex, lastWeight };
            })
          );

          return { ...g, exercises: exWithLastWeight };
        })
      );

      return { ...ws_, groups: groupsWithEx };
    })
  );

  // Load day workouts for this week
  const weekEnd = (() => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  })();

  const dw = await db.select({
    id: dayWorkouts.id, date: dayWorkouts.date,
    weekGroupId: dayWorkouts.weekGroupId, completedAt: dayWorkouts.completedAt,
  })
    .from(dayWorkouts)
    .where(eq(dayWorkouts.userId, user.id));

  const dayWorkoutsThisWeek = dw.filter(d => d.date >= weekStart && d.date <= weekEnd);

  // Attach group names to day workouts
  const dayWorkoutsWithNames = await Promise.all(
    dayWorkoutsThisWeek.map(async (dw_) => {
      if (!dw_.weekGroupId) return { ...dw_, groupName: null };
      const [g] = await db.select({ name: weekGroups.name })
        .from(weekGroups).where(eq(weekGroups.id, dw_.weekGroupId));
      return { ...dw_, groupName: g?.name ?? null };
    })
  );

  return NextResponse.json({ ...plan, splits: splitsWithGroups, dayWorkouts: dayWorkoutsWithNames });
}

// POST /api/fitness/week-plan  body: { weekStart }
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { weekStart } = await req.json();
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const [existing] = await db.select().from(userWeekPlans)
    .where(and(eq(userWeekPlans.userId, user.id), eq(userWeekPlans.weekStart, weekStart)));
  if (existing) return NextResponse.json({ ...existing, splits: [], dayWorkouts: [] });

  const [plan] = await db.insert(userWeekPlans)
    .values({ userId: user.id, weekStart })
    .returning();

  return NextResponse.json({ ...plan, splits: [], dayWorkouts: [] }, { status: 201 });
}
