import { NextRequest, NextResponse } from "next/server";
import { db, weekSplits, userWeekPlans } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const wsId = parseInt(id);

  const [ws] = await db.select({ weekPlanId: weekSplits.weekPlanId }).from(weekSplits).where(eq(weekSplits.id, wsId));
  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [plan] = await db.select({ id: userWeekPlans.id }).from(userWeekPlans)
    .where(and(eq(userWeekPlans.id, ws.weekPlanId), eq(userWeekPlans.userId, user.id)));
  if (!plan) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.delete(weekSplits).where(eq(weekSplits.id, wsId));
  return NextResponse.json({ ok: true });
}
