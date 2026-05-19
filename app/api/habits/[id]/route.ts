import { NextRequest, NextResponse } from "next/server";
import { db, habits } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db
    .update(habits)
    .set(body)
    .where(eq(habits.id, parseInt(id)))
    .returning();
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(habits).where(eq(habits.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
