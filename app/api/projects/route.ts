import { NextRequest, NextResponse } from "next/server";
import { db, projects, issues } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      category: projects.category,
      color: projects.color,
      status: projects.status,
      targetDate: projects.targetDate,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .orderBy(projects.createdAt);

  // Attach issue counts per project
  const counts = await db
    .select({
      projectId: issues.projectId,
      total: sql<number>`count(*)`,
      done: sql<number>`sum(case when ${issues.status} = 'done' then 1 else 0 end)`,
    })
    .from(issues)
    .groupBy(issues.projectId);

  const countMap = Object.fromEntries(counts.map((c) => [c.projectId, c]));

  return NextResponse.json(
    rows.map((p) => ({
      ...p,
      totalIssues: countMap[p.id]?.total ?? 0,
      doneIssues: countMap[p.id]?.done ?? 0,
    }))
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, category, color, targetDate } = body;
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const inserted = await db
    .insert(projects)
    .values({ title, description, category: category ?? "project", color: color ?? "#8b5cf6", targetDate })
    .returning();
  return NextResponse.json(inserted[0], { status: 201 });
}
