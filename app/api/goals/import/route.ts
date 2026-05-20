import { NextRequest, NextResponse } from "next/server";
import { db, projects, issues } from "@/lib/db";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

type TaskInput = { title: string; description?: string; priority?: string; status?: string };
type ImportBody = { goal: string; description?: string; color?: string; category?: string; tasks: TaskInput[] };

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  const body: ImportBody = await req.json();
  const { goal, description, color, category, tasks } = body;

  if (!goal || !Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json({ error: "goal and tasks[] required" }, { status: 400 });
  }

  const [project] = await db
    .insert(projects)
    .values({ userId: user.id, title: goal, description, color: color ?? "#8b5cf6", category: category ?? "project" })
    .returning();

  const inserted = await db
    .insert(issues)
    .values(
      tasks.map((t, i) => ({
        userId: user.id,
        projectId: project.id,
        title: t.title,
        description: t.description,
        priority: (t.priority as string) ?? "none",
        status: (t.status as string) ?? "todo",
        sortOrder: i,
      }))
    )
    .returning();

  return NextResponse.json({ project, issues: inserted }, { status: 201 });
}
