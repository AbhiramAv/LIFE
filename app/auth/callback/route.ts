import { createClient } from "@/lib/supabase/server";
import { db, userProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    if (data.user) {
      const { user } = data;
      const role = (user.user_metadata?.role as string) ?? "user";
      const now  = new Date().toISOString();
      const existing = await db.select().from(userProfiles).where(eq(userProfiles.id, user.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(userProfiles).values({ id: user.id, email: user.email ?? "", role, lastSeen: now });
      } else {
        await db.update(userProfiles).set({ lastSeen: now }).where(eq(userProfiles.id, user.id));
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
