import { NextRequest, NextResponse } from "next/server";
import { db, projects, issues } from "@/lib/db";
import { eq, count, and, sql } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [proj] = await db.select().from(projects).where(eq(projects.id, parseInt(id)));
  if (!proj) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [counts] = await db
    .select({
      total: count(),
      done: sql<number>`sum(case when ${issues.status} = 'done' then 1 else 0 end)`,
    })
    .from(issues)
    .where(eq(issues.projectId, parseInt(id)));

  return NextResponse.json({ ...proj, totalIssues: counts?.total ?? 0, doneIssues: counts?.done ?? 0 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await db
    .update(projects)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, parseInt(id)))
    .returning();
  return NextResponse.json(updated[0]);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await db.delete(projects).where(eq(projects.id, parseInt(id)));
  return NextResponse.json({ ok: true });
}
