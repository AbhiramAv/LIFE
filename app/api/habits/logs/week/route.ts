import { NextResponse } from "next/server";
import { db, habitLogs } from "@/lib/db";
import { and, gte, eq, sql } from "drizzle-orm";

function weekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // back to Monday
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function GET() {
  const since = weekStart();
  const rows = await db
    .select({
      habitId: habitLogs.habitId,
      doneThisWeek: sql<number>`cast(count(*) as int)`,
    })
    .from(habitLogs)
    .where(and(gte(habitLogs.date, since), eq(habitLogs.completed, true)))
    .groupBy(habitLogs.habitId);
  return NextResponse.json(rows);
}
