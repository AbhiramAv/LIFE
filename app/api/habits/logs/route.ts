import { NextResponse } from "next/server";
import { db, habitLogs } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      date: habitLogs.date,
      completed: sql<number>`sum(case when ${habitLogs.completed} then 1 else 0 end)`,
    })
    .from(habitLogs)
    .groupBy(habitLogs.date)
    .orderBy(habitLogs.date);
  return NextResponse.json(rows);
}
