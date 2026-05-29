import { NextRequest, NextResponse } from "next/server";
import { db, workoutPlans, plannedWorkouts, plannedExercises, exercises } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

// GET /api/fitness/plans?weekStart=YYYY-MM-DD
// Returns the plan for the given week, including all workouts + exercises.
export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const weekStart = req.nextUrl.searchParams.get("weekStart") ?? "";
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const [plan] = await db.select()
    .from(workoutPlans)
    .where(and(eq(workoutPlans.userId, user.id), eq(workoutPlans.weekStart, weekStart)));

  if (!plan) return NextResponse.json(null);

  const workouts = await db.select().from(plannedWorkouts).where(eq(plannedWorkouts.planId, plan.id));

  const workoutsWithExercises = await Promise.all(
    workouts.map(async (w) => {
      const exRows = await db
        .select({
          id: plannedExercises.id,
          plannedWorkoutId: plannedExercises.plannedWorkoutId,
          exerciseId: plannedExercises.exerciseId,
          targetSets: plannedExercises.targetSets,
          targetReps: plannedExercises.targetReps,
          sortOrder: plannedExercises.sortOrder,
          name: exercises.name,
          category: exercises.category,
        })
        .from(plannedExercises)
        .innerJoin(exercises, eq(plannedExercises.exerciseId, exercises.id))
        .where(eq(plannedExercises.plannedWorkoutId, w.id))
        .orderBy(plannedExercises.sortOrder);
      return { ...w, exercises: exRows };
    })
  );

  return NextResponse.json({ ...plan, workouts: workoutsWithExercises });
}

// POST /api/fitness/plans  body: { weekStart }
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { weekStart } = await req.json();
  if (!weekStart) return NextResponse.json({ error: "weekStart required" }, { status: 400 });

  const [existing] = await db.select({ id: workoutPlans.id })
    .from(workoutPlans)
    .where(and(eq(workoutPlans.userId, user.id), eq(workoutPlans.weekStart, weekStart)));

  if (existing) return NextResponse.json(existing);

  const [plan] = await db.insert(workoutPlans)
    .values({ userId: user.id, weekStart })
    .returning();

  return NextResponse.json({ ...plan, workouts: [] }, { status: 201 });
}
