import { NextRequest, NextResponse } from "next/server";
import { db, calendarEvents } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(calendarEvents).where(eq(calendarEvents.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
