import { NextRequest, NextResponse } from "next/server";
import { db, userProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

function adminOnly(role?: string) {
  return role !== "admin" ? NextResponse.json({ error: "Forbidden" }, { status: 403 }) : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return unauthorized();
    const guard = adminOnly(user.user_metadata?.role);
    if (guard) return guard;

    const { userId } = await params;
    const body = await req.json();
    const allowed = ["user", "dev", "admin"];

    if (body.role !== undefined && !allowed.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const admin = createAdminClient();

    const authUpdate: Record<string, unknown> = {};
    if (body.email) authUpdate.email = body.email;
    if (body.name !== undefined || body.role !== undefined) {
      authUpdate.user_metadata = {} as Record<string, string>;
      if (body.name !== undefined) (authUpdate.user_metadata as Record<string, string>).name = body.name;
      if (body.role !== undefined) (authUpdate.user_metadata as Record<string, string>).role = body.role;
    }

    if (Object.keys(authUpdate).length > 0) {
      const { error } = await admin.auth.admin.updateUserById(userId, authUpdate);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const profileUpdate: Record<string, unknown> = {};
    if (body.email !== undefined) profileUpdate.email = body.email;
    if (body.name !== undefined) profileUpdate.name = body.name;
    if (body.role !== undefined) profileUpdate.role = body.role;

    if (Object.keys(profileUpdate).length > 0) {
      await db.update(userProfiles).set(profileUpdate).where(eq(userProfiles.id, userId));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return unauthorized();
    const guard = adminOnly(user.user_metadata?.role);
    if (guard) return guard;

    const { userId } = await params;

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await db.delete(userProfiles).where(eq(userProfiles.id, userId));

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
