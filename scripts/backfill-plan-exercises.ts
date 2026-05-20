/**
 * Phase 1 backfill for the multi-exercise plan model.
 *
 * Two things this script does:
 *
 *   1. Installs the XOR CHECK constraint on PlanExercise — exactly one of
 *      templateDayId / clientDayId must be set. Prisma can't express this so
 *      it is applied here as raw SQL (idempotent: IF NOT EXISTS guard).
 *
 *   2. For every PlanTemplateDay / ClientPlanDay that has a non-null
 *      `workoutId`, inserts a single PlanExercise row with the legacy workout
 *      and sensible default prescription (3 sets × 10-12 reps × 60s rest).
 *
 * Idempotent: re-running won't duplicate rows or re-add the constraint.
 *
 * Run with: npx tsx scripts/backfill-plan-exercises.ts
 */

import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL or DATABASE_URL must be set");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 3 });

async function q<T = unknown>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params);
}

async function main() {
  console.log("──────────────────────────────────────────────────────");
  console.log("PlanExercise backfill — Phase 1 of seed-content feature");
  console.log("──────────────────────────────────────────────────────\n");

  // ── 1. XOR CHECK constraint ─────────────────────────────────────
  console.log("1. Installing XOR check constraint…");
  const constraintExists = await q<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM pg_constraint
     WHERE conname = 'PlanExercise_xor_day'`
  );
  if (Number(constraintExists.rows[0].count) > 0) {
    console.log("   ✓ Already present, skipping.\n");
  } else {
    await q(
      `ALTER TABLE "PlanExercise"
       ADD CONSTRAINT "PlanExercise_xor_day"
       CHECK (("templateDayId" IS NULL) <> ("clientDayId" IS NULL))`
    );
    console.log("   ✓ Constraint added.\n");
  }

  // ── 2. Backfill PlanTemplateDay → PlanExercise ──────────────────
  console.log("2. Backfilling from PlanTemplateDay…");
  const templateDays = await q<{ id: number; workoutId: number }>(
    `SELECT d.id, d."workoutId"
     FROM "PlanTemplateDay" d
     WHERE d."workoutId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "PlanExercise" e
         WHERE e."templateDayId" = d.id
       )`
  );
  console.log(`   ${templateDays.rows.length} unbackfilled template days`);

  let templateInserted = 0;
  for (const row of templateDays.rows) {
    await q(
      `INSERT INTO "PlanExercise"
       ("templateDayId", "workoutId", "orderIndex",
        "sets", "repsLow", "repsHigh", "restSeconds",
        "createdAt", "updatedAt")
       VALUES ($1, $2, 0, 3, 10, 12, 60, NOW(), NOW())`,
      [row.id, row.workoutId]
    );
    templateInserted++;
  }
  console.log(`   ✓ Inserted ${templateInserted} PlanExercise rows\n`);

  // ── 3. Backfill ClientPlanDay → PlanExercise ────────────────────
  console.log("3. Backfilling from ClientPlanDay…");
  const clientDays = await q<{ id: number; workoutId: number }>(
    `SELECT d.id, d."workoutId"
     FROM "ClientPlanDay" d
     WHERE d."workoutId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "PlanExercise" e
         WHERE e."clientDayId" = d.id
       )`
  );
  console.log(`   ${clientDays.rows.length} unbackfilled client days`);

  let clientInserted = 0;
  for (const row of clientDays.rows) {
    await q(
      `INSERT INTO "PlanExercise"
       ("clientDayId", "workoutId", "orderIndex",
        "sets", "repsLow", "repsHigh", "restSeconds",
        "createdAt", "updatedAt")
       VALUES ($1, $2, 0, 3, 10, 12, 60, NOW(), NOW())`,
      [row.id, row.workoutId]
    );
    clientInserted++;
  }
  console.log(`   ✓ Inserted ${clientInserted} PlanExercise rows\n`);

  // ── 4. Sanity check ─────────────────────────────────────────────
  const total = await q<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "PlanExercise"`
  );
  const orphans = await q<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM "PlanExercise"
     WHERE ("templateDayId" IS NULL AND "clientDayId" IS NULL)
        OR ("templateDayId" IS NOT NULL AND "clientDayId" IS NOT NULL)`
  );
  console.log("──────────────────────────────────────────────────────");
  console.log(`Total PlanExercise rows: ${total.rows[0].count}`);
  console.log(`Orphan rows (should be 0): ${orphans.rows[0].count}`);
  console.log("──────────────────────────────────────────────────────");

  await pool.end();
}

main().catch(async (err) => {
  console.error("Backfill failed:", err);
  await pool.end();
  process.exit(1);
});
