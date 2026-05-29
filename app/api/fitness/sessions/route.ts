import { NextRequest, NextResponse } from "next/server";
import { db, workoutSessions } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const rows = await db
    .select({ id: workoutSessions.id, date: workoutSessions.date, durationMins: workoutSessions.durationMins, notes: workoutSessions.notes })
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, user.id))
    .orderBy(desc(workoutSessions.date));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { date, notes } = await req.json();
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const [session] = await db.insert(workoutSessions).values({
    userId: user.id,
    date,
    notes: notes ?? null,
  }).returning();

  return NextResponse.json(session, { status: 201 });
}
