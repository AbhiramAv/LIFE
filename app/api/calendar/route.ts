import { NextRequest, NextResponse } from "next/server";
import { db, calendarEvents } from "@/lib/db";
import { asc, and, eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const rows = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.userId, user.id))
    .orderBy(asc(calendarEvents.date), asc(calendarEvents.time));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const { title, description, date, time, color, important } = body;
  if (!title || !date) return NextResponse.json({ error: "title and date required" }, { status: 400 });
  const inserted = await db
    .insert(calendarEvents)
    .values({ userId: user.id, title, description, date, time, color: color ?? "#6366f1", important: important ?? false })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
