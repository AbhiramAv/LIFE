import { NextRequest, NextResponse } from "next/server";
import { db, habitLogs } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const logs = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, parseInt(id)), eq(habitLogs.userId, user.id)))
    .orderBy(habitLogs.date);
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const { date, completed } = body;
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const habitId = parseInt(id);
  const logStatus: string = body.logStatus ?? (completed === false ? "missed" : "completed");

  const existing = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date), eq(habitLogs.userId, user.id)))
    .limit(1);

  if (existing.length > 0) {
    const updated = await db
      .update(habitLogs)
      .set({ completed: completed ?? true, logStatus })
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date), eq(habitLogs.userId, user.id)))
      .returning();
    return NextResponse.json(updated[0]);
  }

  const inserted = await db
    .insert(habitLogs)
    .values({ userId: user.id, habitId, date, completed: completed ?? true, logStatus })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
