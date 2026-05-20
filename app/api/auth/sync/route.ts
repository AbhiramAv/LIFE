import { NextRequest, NextResponse } from "next/server";
import { db, userProfiles } from "@/lib/db";
import { getUser, unauthorized } from "@/lib/supabase/get-user";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => ({}));
  const name = (body.name as string | undefined) || (user.user_metadata?.name as string | undefined) || null;
  const role = (user.user_metadata?.role as string) ?? "user";
  const now  = new Date().toISOString();

  const existing = await db.select().from(userProfiles).where(eq(userProfiles.id, user.id)).limit(1);

  if (existing.length === 0) {
    await db.insert(userProfiles).values({ id: user.id, email: user.email ?? "", name, role, lastSeen: now });
  } else {
    await db.update(userProfiles).set({ lastSeen: now, ...(name ? { name } : {}) }).where(eq(userProfiles.id, user.id));
  }

  return NextResponse.json({ ok: true });
}
