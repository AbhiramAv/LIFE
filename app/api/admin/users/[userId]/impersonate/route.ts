import { NextRequest, NextResponse } from "next/server";
import { getUser, unauthorized } from "@/lib/supabase/get-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const user = await getUser();
    if (!user) return unauthorized();
    if (user.user_metadata?.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userId } = await params;
    const admin = createAdminClient();

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(userId);
    if (userErr || !userData.user.email)
      return NextResponse.json({ error: userErr?.message ?? "User not found" }, { status: 404 });

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: userData.user.email,
    });
    if (linkErr || !linkData.properties?.action_link)
      return NextResponse.json({ error: linkErr?.message ?? "Could not generate link" }, { status: 500 });

    return NextResponse.json({ url: linkData.properties.action_link });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
