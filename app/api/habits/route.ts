import { NextRequest, NextResponse } from "next/server";
import { db, habits, habitLogs } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";

export async function GET() {
  try {
    const allHabits = await db
      .select()
      .from(habits)
      .where(eq(habits.archived, false))
      .orderBy(habits.createdAt);
    return NextResponse.json(allHabits);
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string; detail?: string; cause?: unknown };
    console.error("DB error:", JSON.stringify({ message: err.message, code: err.code, detail: err.detail, cause: String(err.cause) }));
    return NextResponse.json({ error: err.message, code: err.code, detail: err.detail }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, frequency, targetDaysPerWeek, color } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const inserted = await db
    .insert(habits)
    .values({ name, frequency: frequency ?? "daily", targetDaysPerWeek: targetDaysPerWeek ?? 7, color: color ?? "#6366f1" })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
