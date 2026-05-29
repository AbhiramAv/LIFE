import { NextRequest, NextResponse } from "next/server";
import { db, announcements } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

function adminOnly(role?: string) {
  return role !== "admin" ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const { id } = await params;
  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (body.active !== undefined) update.active = body.active;
  if (body.content !== undefined) update.content = body.content;
  if (body.targetRole !== undefined) update.targetRole = body.targetRole;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const [row] = await db.update(announcements).set(update).where(eq(announcements.id, parseInt(id))).returning();
  return NextResponse.json(row);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const { id } = await params;
  await db.delete(announcements).where(eq(announcements.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
