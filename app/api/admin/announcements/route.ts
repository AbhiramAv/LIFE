import { NextRequest, NextResponse } from "next/server";
import { db, announcements } from "@/lib/db";
import { desc } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

function adminOnly(role?: string) {
  return role !== "admin" ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null;
}

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const rows = await db.select().from(announcements).orderBy(desc(announcements.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();
  const guard = adminOnly(user.user_metadata?.role);
  if (guard) return guard;

  const { content, targetRole = "all" } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const allowed = ["all", "user", "dev", "admin"];
  if (!allowed.includes(targetRole)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const [row] = await db.insert(announcements).values({
    content: content.trim(),
    targetRole,
    createdBy: user.id,
  }).returning();

  return NextResponse.json(row, { status: 201 });
}
