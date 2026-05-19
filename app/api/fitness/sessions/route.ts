import { NextResponse } from "next/server";
import { db, workoutSessions } from "@/lib/db";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({ id: workoutSessions.id, date: workoutSessions.date, durationMins: workoutSessions.durationMins })
    .from(workoutSessions)
    .orderBy(desc(workoutSessions.date));
  return NextResponse.json(rows);
}
