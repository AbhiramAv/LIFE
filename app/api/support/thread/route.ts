import { NextResponse } from "next/server";
import { db, supportThreads } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

// Get or create the current user's support thread
export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const existing = await db
    .select()
    .from(supportThreads)
    .where(eq(supportThreads.userId, user.id))
    .limit(1);

  if (existing.length > 0) return NextResponse.json(existing[0]);

  const [thread] = await db
    .insert(supportThreads)
    .values({ userId: user.id })
    .returning();
  return NextResponse.json(thread, { status: 201 });
}
