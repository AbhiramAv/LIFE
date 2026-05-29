import { NextResponse } from "next/server";
import { db, announcements } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { getUser } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json([]);

  const role = (user.user_metadata?.role as string) ?? "user";

  const rows = await db.select().from(announcements).where(
    and(
      eq(announcements.active, true),
    )
  );

  // Filter to rows targeting this role or everyone
  const filtered = rows.filter(r => r.targetRole === "all" || r.targetRole === role);
  return NextResponse.json(filtered);
}
