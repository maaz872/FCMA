/**
 * Backfill CoachBilling.currentPeriodEnd for existing coaches.
 * For every coach, set currentPeriodEnd = User.createdAt + 30 days.
 *
 * Run: npx tsx scripts/backfill-subscription-dates.ts
 */

import "dotenv/config";
import pg from "pg";

const DIRECT_URL = process.env.DIRECT_URL;
if (!DIRECT_URL) { console.error("DIRECT_URL not set"); process.exit(1); }

const pool = new pg.Pool({ connectionString: DIRECT_URL, max: 1 });

async function q(sql: string, params?: unknown[]) {
  const client = await pool.connect();
  try { return await client.query(sql, params); }
  finally { client.release(); }
}

async function main() {
  console.log("📅 Backfilling CoachBilling.currentPeriodEnd...\n");

  // Get all coach billing rows with the coach's createdAt
  const rows = await q(`
    SELECT cb.id, cb."coachId", u."firstName", u."lastName", u.email, u."createdAt" as user_created_at, cb."currentPeriodEnd"
    FROM "CoachBilling" cb
    JOIN "User" u ON u.id = cb."coachId"
    ORDER BY u."createdAt" ASC
  `);

  console.log(`Found ${rows.rows.length} CoachBilling row(s)\n`);

  let updated = 0;
  for (const row of rows.rows) {
    const createdAt = new Date(row.user_created_at);
    const periodEnd = new Date(createdAt);
    periodEnd.setDate(periodEnd.getDate() + 30);

    await q(
      `UPDATE "CoachBilling" SET "currentPeriodEnd" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [periodEnd.toISOString(), row.id]
    );
    updated++;

    console.log(
      `  ✓ ${row.firstName} ${row.lastName} (${row.email}) — period ends ${periodEnd.toISOString().split("T")[0]}`
    );
  }

  console.log(`\n✅ Updated ${updated} row(s).`);

  // Verify
  const verify = await q(`
    SELECT COUNT(*) as total, COUNT("currentPeriodEnd") as filled
    FROM "CoachBilling"
  `);
  console.log(`Verification: ${verify.rows[0].filled}/${verify.rows[0].total} rows have currentPeriodEnd set.`);

  await pool.end();
}

main().catch((e) => { console.error("Backfill failed:", e); pool.end(); process.exit(1); });
