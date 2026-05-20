import { NextRequest, NextResponse } from "next/server";
import { db, issues } from "@/lib/db";
import { eq, asc, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const rows = await db
    .select()
    .from(issues)
    .where(and(eq(issues.projectId, parseInt(id)), eq(issues.userId, user.id)))
    .orderBy(asc(issues.sortOrder), asc(issues.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const body = await req.json();
  const { title, description, status, priority, label, dueDate } = body;
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });
  const inserted = await db
    .insert(issues)
    .values({
      userId: user.id,
      projectId: parseInt(id),
      title,
      description,
      status: status ?? "todo",
      priority: priority ?? "none",
      label,
      dueDate,
    })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
