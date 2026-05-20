import { NextRequest, NextResponse } from "next/server";
import { db, supportThreads } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  if (user.user_metadata?.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { threadId } = await params;
  const { status } = await req.json();

  const [updated] = await db
    .update(supportThreads)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(supportThreads.id, parseInt(threadId)))
    .returning();

  return NextResponse.json(updated);
}
