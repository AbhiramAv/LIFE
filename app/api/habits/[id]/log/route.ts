import { NextRequest, NextResponse } from "next/server";
import { db, habitLogs } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { date, completed } = body;

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  const habitId = parseInt(id);
  const existing = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
    .limit(1);

  if (existing.length > 0) {
    const updated = await db
      .update(habitLogs)
      .set({ completed: completed ?? true })
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
      .returning();
    return NextResponse.json(updated[0]);
  }

  const inserted = await db
    .insert(habitLogs)
    .values({ habitId, date, completed: completed ?? true })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const habitId = parseInt(id);
  const logs = await db
    .select()
    .from(habitLogs)
    .where(eq(habitLogs.habitId, habitId))
    .orderBy(habitLogs.date);
  return NextResponse.json(logs);
}
