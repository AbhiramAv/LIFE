import { NextRequest, NextResponse } from "next/server";
import { db, userProfiles } from "@/lib/db";
import { getUser, unauthorized } from "@/lib/supabase/get-user";
import { eq } from "drizzle-orm";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, user.id)).limit(1);
  return NextResponse.json(profile ?? null);
}

export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { name } = await req.json();
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  await db.update(userProfiles).set({ name: name.trim() }).where(eq(userProfiles.id, user.id));
  return NextResponse.json({ ok: true });
}
