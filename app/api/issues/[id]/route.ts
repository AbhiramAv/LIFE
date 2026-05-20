import { NextRequest, NextResponse } from "next/server";
import { db, issues } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [issue] = await db.select().from(issues).where(eq(issues.id, parseInt(id)));
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(issue);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  const completedAt =
    body.status === "done" ? new Date().toISOString()
    : body.status ? null
    : undefined;

  const updated = await db
    .update(issues)
    .set({
      ...body,
      ...(completedAt !== undefined ? { completedAt } : {}),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(issues.id, parseInt(id)))
    .returning();
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(issues).where(eq(issues.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
