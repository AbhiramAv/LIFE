import { db } from "./adapters/postgres";
import { exercises } from "./schema";
import { EXERCISES } from "../data/exercises";

async function seed() {
  console.log("Seeding exercises...");

  const existing = await db.select().from(exercises);
  if (existing.length > 0) {
    console.log(`${existing.length} exercises already seeded. Skipping.`);
    return;
  }

  const rows = EXERCISES.map((e) => ({
    name: e.name,
    category: e.category,
    muscleGroups: JSON.stringify(e.muscleGroups),
    secondaryMuscles: JSON.stringify(e.secondaryMuscles),
    isCustom: false,
  }));

  await db.insert(exercises).values(rows);
  console.log(`Seeded ${rows.length} exercises.`);
}

seed().catch(console.error);
