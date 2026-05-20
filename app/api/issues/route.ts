import { NextRequest, NextResponse } from "next/server";
import { db, issues, projects } from "@/lib/db";
import { eq, ne, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const sprintOnly = searchParams.get("sprint") === "true";

  const allStatuses = searchParams.get("all") === "true";
  const condition = sprintOnly
    ? and(ne(issues.status, "cancelled"), eq(issues.inSprint, true))
    : allStatuses ? undefined : ne(issues.status, "cancelled");

  const rows = await db
    .select({
      id: issues.id,
      projectId: issues.projectId,
      title: issues.title,
      description: issues.description,
      status: issues.status,
      priority: issues.priority,
      label: issues.label,
      dueDate: issues.dueDate,
      inSprint: issues.inSprint,
      completedAt: issues.completedAt,
      createdAt: issues.createdAt,
      projectTitle: projects.title,
      projectColor: projects.color,
    })
    .from(issues)
    .innerJoin(projects, eq(issues.projectId, projects.id))
    .where(condition)
    .orderBy(issues.createdAt);
  return NextResponse.json(rows);
}
