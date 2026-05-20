import { NextResponse } from "next/server";
import { db, projects, issues } from "@/lib/db";
import { count, sql } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

function adminOnly(role?: string) {
  return role !== "admin" ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null;
}

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const [
    [{ total: totalProjects }],
    [{ total: totalIssues }],
    issuesByStatus,
    projectsByCategory,
  ] = await Promise.all([
    db.select({ total: count() }).from(projects),
    db.select({ total: count() }).from(issues),
    db.select({ status: issues.status, count: count() }).from(issues)
      .groupBy(issues.status).orderBy(sql`count(*) DESC`),
    db.select({ category: projects.category, count: count() }).from(projects)
      .groupBy(projects.category).orderBy(sql`count(*) DESC`),
  ]);

  return NextResponse.json({ totalProjects, totalIssues, issuesByStatus, projectsByCategory });
}
