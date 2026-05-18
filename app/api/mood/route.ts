import { NextRequest, NextResponse } from "next/server";
import { db, dailyEntries } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (date) {
    const entry = await db
      .select()
      .from(dailyEntries)
      .where(eq(dailyEntries.date, date))
      .limit(1);
    return NextResponse.json(entry[0] ?? null);
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
  const entries = await db
    .select()
    .from(dailyEntries)
    .orderBy(dailyEntries.date)
    .limit(limit);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, moodScore, energyScore, stressScore, notes, gratitude } = body;

  if (!date || !moodScore || !energyScore || !stressScore) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(dailyEntries)
    .where(eq(dailyEntries.date, date))
    .limit(1);

  if (existing.length > 0) {
    const updated = await db
      .update(dailyEntries)
      .set({ moodScore, energyScore, stressScore, notes, gratitude, updatedAt: new Date().toISOString() })
      .where(eq(dailyEntries.date, date))
      .returning();
    return NextResponse.json(updated[0]);
  }

  const inserted = await db
    .insert(dailyEntries)
    .values({ date, moodScore, energyScore, stressScore, notes, gratitude })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
