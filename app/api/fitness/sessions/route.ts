import { NextResponse } from "next/server";
import { db, workoutSessions } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const rows = await db
    .select({ id: workoutSessions.id, date: workoutSessions.date, durationMins: workoutSessions.durationMins })
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, user.id))
    .orderBy(desc(workoutSessions.date));
  return NextResponse.json(rows);
}
