/**
 * Manual-opt-in backfill: seed the new 50-recipe / 50-workout / 6-plan
 * starter library into one EXISTING coach's account.
 *
 * Per spec §10 question 4, this is intentionally NOT automatic across
 * all existing coaches — Raheel must run it per-coach to avoid clobbering
 * work-in-progress. The Super-Admin coach detail page also exposes a
 * "Seed Defaults" button that calls `seedCoachDefaults` directly.
 *
 * Usage:
 *   npx tsx scripts/backfill-coach-seed-content.ts <coachId>
 *
 * The script is idempotent thanks to the unique-(slug,coachId) guards
 * in `seedCoachDefaults` — re-running fills in missing rows without
 * touching existing ones.
 */

import "dotenv/config";
import { seedCoachDefaults } from "../src/lib/seed-coach-defaults";
import { prisma } from "../src/lib/db";

async function main() {
  const coachId = process.argv[2];
  if (!coachId) {
    console.error("Usage: npx tsx scripts/backfill-coach-seed-content.ts <coachId>");
    process.exit(1);
  }

  // Sanity: the id must belong to an actual COACH.
  const coach = await prisma.user.findUnique({ where: { id: coachId } });
  if (!coach) {
    console.error(`No user found with id ${coachId}`);
    process.exit(1);
  }
  if (coach.role !== "COACH") {
    console.error(`User ${coachId} has role ${coach.role}, expected COACH`);
    process.exit(1);
  }

  console.log("──────────────────────────────────────────────────────");
  console.log(`Seeding starter content for coach: ${coach.email}`);
  console.log("──────────────────────────────────────────────────────\n");

  const before = await Promise.all([
    prisma.recipe.count({ where: { coachId } }),
    prisma.workout.count({ where: { coachId } }),
    prisma.planTemplate.count({ where: { coachId } }),
  ]);
  console.log(`Before: ${before[0]} recipes, ${before[1]} workouts, ${before[2]} plans`);

  const result = await seedCoachDefaults(coachId);

  console.log(
    `After:  ${result.recipeCount} recipes, ${result.workoutCount} workouts, ${result.planCount} plans\n`
  );
  console.log("──────────────────────────────────────────────────────");
  console.log("Done.");
  console.log("──────────────────────────────────────────────────────");
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Best-effort disconnect; the Proxy-based prisma client doesn't always
    // expose $disconnect cleanly in scripts, so swallow errors.
    try {
      await (prisma as unknown as { $disconnect?: () => Promise<void> }).$disconnect?.();
    } catch {
      // ignore
    }
  });
