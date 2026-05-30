import { NextRequest, NextResponse } from "next/server";
import { db, splits, splitGroups, splitGroupDefaults } from "@/lib/db";
// splitGroups is used in the delete cascade via PATCH (delete then recreate)
import { eq, and } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

// PATCH /api/fitness/splits/[id] — update a custom split (name, description, groups)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const splitId = parseInt(id);

  const [split] = await db.select().from(splits).where(eq(splits.id, splitId));
  if (!split) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (split.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, description, groups } = await req.json();
  if (!name || !Array.isArray(groups)) {
    return NextResponse.json({ error: "name and groups required" }, { status: 400 });
  }

  await db.update(splits).set({ name, description: description ?? null }).where(eq(splits.id, splitId));

  // Delete existing groups (cascade deletes defaults)
  await db.delete(splitGroups).where(eq(splitGroups.splitId, splitId));

  // Recreate groups + defaults
  const createdGroups = await Promise.all(
    groups.map(async (g: { name: string; exerciseIds: number[] }, i: number) => {
      const [sg] = await db.insert(splitGroups)
        .values({ splitId, name: g.name, sortOrder: i })
        .returning();

      if (g.exerciseIds?.length > 0) {
        await db.insert(splitGroupDefaults).values(
          g.exerciseIds.map((exerciseId: number, j: number) => ({ splitGroupId: sg.id, exerciseId, sortOrder: j }))
        );
      }

      return { ...sg, defaultCount: g.exerciseIds?.length ?? 0, defaultExerciseIds: g.exerciseIds ?? [] };
    })
  );

  const [updated] = await db.select().from(splits).where(eq(splits.id, splitId));
  return NextResponse.json({ ...updated, groups: createdGroups });
}

// DELETE /api/fitness/splits/[id] — delete a custom split
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const splitId = parseInt(id);

  const [split] = await db.select().from(splits)
    .where(and(eq(splits.id, splitId), eq(splits.userId, user.id)));
  if (!split) return NextResponse.json({ error: "Not found or forbidden" }, { status: 404 });

  await db.delete(splits).where(eq(splits.id, splitId));
  return NextResponse.json({ ok: true });
}
