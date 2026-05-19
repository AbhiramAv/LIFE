import { NextResponse } from "next/server";
import { db, issues, projects } from "@/lib/db";
import { eq, ne } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      title: issues.title,
      status: issues.status,
      priority: issues.priority,
      label: issues.label,
      dueDate: issues.dueDate,
      completedAt: issues.completedAt,
      createdAt: issues.createdAt,
      projectTitle: projects.title,
      projectColor: projects.color,
    })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(ne(issues.status, "cancelled"))
    .orderBy(issues.createdAt);
  return NextResponse.json(rows);
}
