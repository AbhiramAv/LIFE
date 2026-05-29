import { NextResponse } from "next/server";
import { db, splits, splitGroups, splitGroupDefaults } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getUser, unauthorized } from "@/lib/supabase/get-user";

export async function GET() {
  const user = await getUser();
  if (!user) return unauthorized();

  const allSplits = await db.select().from(splits).orderBy(splits.id);

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
