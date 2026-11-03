import { NextRequest, NextResponse } from "next/server";
import { db, calendarEvents } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const { title, description, date, time, color, important } = body;
  const updated = await db
    .update(calendarEvents)
    .set({ title, description, date, time: time ?? null, color, important: important ?? false })
    .where(and(eq(calendarEvents.id, parseInt(id)), eq(calendarEvents.userId, user.id)))
    .returning();
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.delete(calendarEvents).where(and(eq(calendarEvents.id, parseInt(id)), eq(calendarEvents.userId, user.id)));
  return NextResponse.json({ ok: true });
}
