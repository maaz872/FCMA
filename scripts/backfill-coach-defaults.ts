/**
 * One-off backfill: seed default categories, tags, and food items for
 * existing coaches who were created without them.
 *
 * Skips coaches who already have RecipeCategory rows (e.g. Coach Danzel
 * whose data was backfilled during the multi-tenant migration).
 *
 * Run: npx tsx scripts/backfill-coach-defaults.ts
 */

import "dotenv/config";

// We need to import from the app's lib code. Since this is a script,
// set up the Prisma client the same way the app does.
import { prisma } from "../src/lib/db";
import { seedCoachDefaults } from "../src/lib/seed-coach-defaults";

async function main() {
  console.log("🔄 Backfilling coach defaults...\n");

  const coaches = await prisma.user.findMany({
    where: { role: "COACH" },
    select: { id: true, firstName: true, lastName: true, email: true },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${coaches.length} coaches.\n`);

  for (const coach of coaches) {
    // Check if this coach already has recipe categories (indicates data was already seeded)
    const existingCats = await prisma.recipeCategory.count({
      where: { coachId: coach.id },
    });

    if (existingCats > 0) {
      console.log(
        `  ⏭️  ${coach.firstName} ${coach.lastName} (${coach.email}) — already has ${existingCats} categories, skipping`
      );
      continue;
    }

    console.log(
      `  🌱 ${coach.firstName} ${coach.lastName} (${coach.email}) — seeding defaults...`
    );
    await seedCoachDefaults(coach.id);
    console.log(`     ✓ Done`);
  }

  console.log("\n✅ Backfill complete.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Backfill failed:", e);
  process.exit(1);
});
