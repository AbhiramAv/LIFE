import { NextRequest, NextResponse } from "next/server";
import { db, workoutSets, workoutSessions } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const setId = parseInt(id);

  // Verify ownership via session
  const [set] = await db.select({ sessionId: workoutSets.sessionId }).from(workoutSets).where(eq(workoutSets.id, setId));
  if (!set) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [session] = await db.select({ id: workoutSessions.id }).from(workoutSessions)
    .where(and(eq(workoutSessions.id, set.sessionId), eq(workoutSessions.userId, user.id)));
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(workoutSets).where(eq(workoutSets.id, setId));
  return NextResponse.json({ ok: true });
}
