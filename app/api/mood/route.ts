import { NextRequest, NextResponse } from "next/server";
import { db, dailyEntries } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  const date = req.nextUrl.searchParams.get("date");

  if (date) {
    const entry = await db
      .select()
      .from(dailyEntries)
      .where(and(eq(dailyEntries.date, date), eq(dailyEntries.userId, user.id)))
      .limit(1);
    return NextResponse.json(entry[0] ?? null);
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "30");
  const entries = await db
    .select()
    .from(dailyEntries)
    .where(eq(dailyEntries.userId, user.id))
    .orderBy(dailyEntries.date)
    .limit(limit);
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  const body = await req.json();
  const { date, moodScore, energyScore, stressScore, notes, gratitude } = body;

  if (!date || !moodScore || !energyScore || !stressScore) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(dailyEntries)
    .where(and(eq(dailyEntries.date, date), eq(dailyEntries.userId, user.id)))
    .limit(1);

  if (existing.length > 0) {
    const updated = await db
      .update(dailyEntries)
      .set({ moodScore, energyScore, stressScore, notes, gratitude, updatedAt: new Date().toISOString() })
      .where(and(eq(dailyEntries.date, date), eq(dailyEntries.userId, user.id)))
      .returning();
    return NextResponse.json(updated[0]);
  }

  const inserted = await db
    .insert(dailyEntries)
    .values({ userId: user.id, date, moodScore, energyScore, stressScore, notes, gratitude })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
