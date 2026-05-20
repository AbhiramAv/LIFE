import { NextRequest, NextResponse } from "next/server";
import { db, habits } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const allHabits = await db
    .select()
    .from(habits)
    .where(and(eq(habits.archived, false), eq(habits.userId, user.id)))
    .orderBy(habits.createdAt);
  return NextResponse.json(allHabits);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const { name, frequency, targetDaysPerWeek, color, biggerGoal } = body;
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const inserted = await db
    .insert(habits)
    .values({
      userId: user.id,
      name,
      biggerGoal: biggerGoal ?? null,
      frequency: frequency ?? "daily",
      targetDaysPerWeek: targetDaysPerWeek ?? 7,
      color: color ?? "#6366f1",
    })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
