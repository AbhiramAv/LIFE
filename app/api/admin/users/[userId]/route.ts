import { NextRequest, NextResponse } from "next/server";
import { db, userProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

function adminOnly(role?: string) {
  return role !== "admin" ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const { userId } = await params;
  const { role } = await req.json();

  const allowed = ["user", "dev", "admin"];
  if (!allowed.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  await db.update(userProfiles).set({ role }).where(eq(userProfiles.id, userId));
  return NextResponse.json({ ok: true });
}
