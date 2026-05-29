import { NextRequest, NextResponse } from "next/server";
import { db, splits, splitGroups, splitGroupDefaults } from "@/lib/db";
import { eq, or } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  // Return system splits + this user's custom splits
  const allSplits = await db.select().from(splits)
    .where(or(eq(splits.isSystem, true), eq(splits.userId, user.id)))
    .orderBy(splits.id);

  const result = await Promise.all(
    allSplits.map(async (s) => {
      const groups = await db.select().from(splitGroups)
        .where(eq(splitGroups.splitId, s.id))
        .orderBy(splitGroups.sortOrder);

      const groupsWithCounts = await Promise.all(
        groups.map(async (g) => {
          const defaults = await db.select({ exerciseId: splitGroupDefaults.exerciseId })
            .from(splitGroupDefaults)
            .where(eq(splitGroupDefaults.splitGroupId, g.id));
          return { ...g, defaultCount: defaults.length, defaultExerciseIds: defaults.map(d => d.exerciseId) };
        })
      );

      return { ...s, groups: groupsWithCounts };
    })
  );

  return NextResponse.json(result);
}

// POST /api/fitness/splits — create a custom named split
// body: { name, description?, groups: [{ name, exerciseIds: number[] }] }
export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) return unauthorized();

  const { name, description, groups } = await req.json();
  if (!name || !Array.isArray(groups)) {
    return NextResponse.json({ error: "name and groups required" }, { status: 400 });
  }

  const slug = `custom_${user.id.slice(0, 8)}_${Date.now()}`;

  const [split] = await db.insert(splits)
    .values({ name, slug, description: description ?? null, isSystem: false, userId: user.id })
    .returning();

  const createdGroups = await Promise.all(
    groups.map(async (g: { name: string; exerciseIds: number[] }, i: number) => {
      const [sg] = await db.insert(splitGroups)
        .values({ splitId: split.id, name: g.name, sortOrder: i })
        .returning();

      if (g.exerciseIds?.length > 0) {
        await db.insert(splitGroupDefaults).values(
          g.exerciseIds.map((exerciseId: number, j: number) => ({ splitGroupId: sg.id, exerciseId, sortOrder: j }))
        );
      }

      return { ...sg, defaultCount: g.exerciseIds?.length ?? 0, defaultExerciseIds: g.exerciseIds ?? [] };
    })
  );

  return NextResponse.json({ ...split, groups: createdGroups }, { status: 201 });
}
