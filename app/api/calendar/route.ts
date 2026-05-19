import { NextRequest, NextResponse } from "next/server";
import { db, calendarEvents } from "@/lib/db";
import { asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(calendarEvents).orderBy(asc(calendarEvents.date), asc(calendarEvents.time));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, date, time, color } = body;
  if (!title || !date) return NextResponse.json({ error: "title and date required" }, { status: 400 });

  const inserted = await db
    .insert(calendarEvents)
    .values({ title, description, date, time, color: color ?? "#6366f1" })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
