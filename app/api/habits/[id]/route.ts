import { NextRequest, NextResponse } from "next/server";
import { db, habits } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const updated = await db
    .update(habits)
    .set(body)
    .where(and(eq(habits.id, parseInt(id)), eq(habits.userId, user.id)))
    .returning();
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.delete(habits).where(and(eq(habits.id, parseInt(id)), eq(habits.userId, user.id)));
  return NextResponse.json({ ok: true });
}
