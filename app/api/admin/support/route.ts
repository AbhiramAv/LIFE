import { NextResponse } from "next/server";
import { db, supportThreads, supportMessages, userProfiles } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  if (user.user_metadata?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const threads = await db
    .select()
    .from(supportThreads)
    .orderBy(desc(supportThreads.updatedAt));

  // Attach latest message + user email per thread
  const enriched = await Promise.all(
    threads.map(async (t) => {
      const [lastMsg] = await db
        .select()
        .from(supportMessages)
        .where(eq(supportMessages.threadId, t.id))
        .orderBy(desc(supportMessages.createdAt))
        .limit(1);

      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, t.userId))
        .limit(1);

      return { ...t, lastMessage: lastMsg ?? null, userEmail: profile?.email ?? t.userId };
    })
  );

  return NextResponse.json(enriched);
}
