import { NextResponse } from "next/server";
import { db, habitLogs } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const rows = await db
    .select({
      date: habitLogs.date,
      completed: sql<number>`sum(case when ${habitLogs.completed} then 1 else 0 end)`,
    })
    .from(habitLogs)
    .where(eq(habitLogs.userId, user.id))
    .groupBy(habitLogs.date)
    .orderBy(habitLogs.date);
  return NextResponse.json(rows);
}
