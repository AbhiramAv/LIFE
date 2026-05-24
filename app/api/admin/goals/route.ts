export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { db, projects, issues } from "@/lib/db";
import { count, eq, sql } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

function adminOnly(role?: string) {
  return role !== "admin" ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null;
}

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;

  const pWhere = userId ? eq(projects.userId, userId) : undefined;
  const iWhere = userId ? eq(issues.userId, userId)   : undefined;

  const [
    [{ total: totalProjects }],
    [{ total: totalIssues }],
    issuesByStatus,
    projectsByCategory,
  ] = await Promise.all([
    db.select({ total: count() }).from(projects).where(pWhere),
    db.select({ total: count() }).from(issues).where(iWhere),
    db.select({ status: issues.status, count: count() }).from(issues)
      .where(iWhere).groupBy(issues.status).orderBy(sql`count(*) DESC`),
    db.select({ category: projects.category, count: count() }).from(projects)
      .where(pWhere).groupBy(projects.category).orderBy(sql`count(*) DESC`),
  ]);

  return NextResponse.json({ totalProjects, totalIssues, issuesByStatus, projectsByCategory });
}
