import { NextRequest, NextResponse } from "next/server";
import { db, supportMessages, supportThreads, userProfiles } from "@/lib/db";
import { eq, and, asc } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { threadId } = await params;

  const role = (user.user_metadata?.role as string) ?? "user";
  const tid = parseInt(threadId);

  // Verify user owns the thread (or is admin)
  if (role !== "admin") {
    const [thread] = await db.select().from(supportThreads)
      .where(and(eq(supportThreads.id, tid), eq(supportThreads.userId, user.id)));
    if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await db
    .select()
    .from(supportMessages)
    .where(eq(supportMessages.threadId, tid))
    .orderBy(asc(supportMessages.createdAt));

  return NextResponse.json(messages);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { threadId } = await params;

  const role = (user.user_metadata?.role as string) ?? "user";
  const tid = parseInt(threadId);
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  // Verify ownership (or admin)
  if (role !== "admin") {
    const [thread] = await db.select().from(supportThreads)
      .where(and(eq(supportThreads.id, tid), eq(supportThreads.userId, user.id)));
    if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Update thread updated_at
  await db.update(supportThreads)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(supportThreads.id, tid));

  const [msg] = await db.insert(supportMessages).values({
    threadId: tid,
    senderId: user.id,
    isAdmin: role === "admin",
    content: content.trim(),
  }).returning();

  return NextResponse.json(msg, { status: 201 });
}
