/**
 * Multi-tenant migration — Phase 1B backfill:
 * 1. Convert existing ADMIN user to COACH role
 * 2. Set coachId on all existing USERs → point to this coach
 * 3. Set coachId on all content tables → point to this coach
 * 4. Create SUPER_ADMIN user
 * 5. Create CoachBilling record
 *
 * Run: npx tsx scripts/migrate-multi-tenant.ts
 */

import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const DIRECT_URL = process.env.DIRECT_URL;
if (!DIRECT_URL) { console.error("DIRECT_URL not set"); process.exit(1); }

const pool = new pg.Pool({ connectionString: DIRECT_URL, max: 1 });

async function q(sql: string, params?: unknown[]) {
  const client = await pool.connect();
  try { return await client.query(sql, params); }
  finally { client.release(); }
}

async function main() {
  console.log("🔄 Multi-tenant migration — Phase 1B\n");

  // ─── Step 1: Find existing ADMIN and convert to COACH ───
  const adminRes = await q(`SELECT id, email, "firstName", "lastName" FROM "User" WHERE role = 'ADMIN' LIMIT 1`);
  if (adminRes.rows.length === 0) {
    console.error("❌ No ADMIN user found. Aborting.");
    process.exit(1);
  }
  const coach = adminRes.rows[0];
  console.log(`👤 Found admin: ${coach.firstName} ${coach.lastName} (${coach.email})`);

  await q(`UPDATE "User" SET role = 'COACH', "isCoachActive" = true WHERE id = $1`, [coach.id]);
  console.log("  ✓ Converted to COACH role");

  // ─── Step 2: Set coachId on all existing USERs ───
  const userRes = await q(`UPDATE "User" SET "coachId" = $1 WHERE role = 'USER' AND ("coachId" IS NULL)`, [coach.id]);
  console.log(`  ✓ Assigned ${userRes.rowCount} users to coach`);

  // ─── Step 3: Set coachId on all content tables ───
  const contentTables = [
    "Recipe", "RecipeCategory", "DietaryTag",
    "Workout", "WorkoutCategory", "WorkoutSubcategory",
    "RestaurantGuide", "FoodItem", "PlanTemplate",
    "Post", "Asset", "SiteContent",
  ];

  for (const table of contentTables) {
    const res = await q(`UPDATE "${table}" SET "coachId" = $1 WHERE "coachId" IS NULL`, [coach.id]);
    console.log(`  ✓ ${table}: ${res.rowCount} rows`);
  }

  // PaymentSettings
  const payRes = await q(`UPDATE "PaymentSettings" SET "coachId" = $1 WHERE "coachId" IS NULL`, [coach.id]);
  console.log(`  ✓ PaymentSettings: ${payRes.rowCount} rows`);

  // ─── Step 4: Create SUPER_ADMIN user ───
  const existingSA = await q(`SELECT id FROM "User" WHERE role = 'SUPER_ADMIN' LIMIT 1`);
  if (existingSA.rows.length > 0) {
    console.log("\n⚠️  Super Admin already exists, skipping creation.");
  } else {
    const saId = crypto.randomUUID();
    const saHash = await bcrypt.hash("SuperAdmin2026!", 12);
    await q(
      `INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", role, plan, "planStatus", "isActive", "isCoachActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, 'SUPER_ADMIN', 'FREE', 'ACTIVE', true, false, NOW(), NOW())`,
      [saId, "superadmin@fcma.com", saHash, "Super", "Admin"]
    );
    console.log("\n✓ Created Super Admin: superadmin@fcma.com / SuperAdmin2026!");
  }

  // ─── Step 5: Create CoachBilling for existing coach ───
  const existingBilling = await q(`SELECT id FROM "CoachBilling" WHERE "coachId" = $1`, [coach.id]);
  if (existingBilling.rows.length === 0) {
    await q(
      `INSERT INTO "CoachBilling" ("coachId", "basePriceMonthly", "extraClientPrice", "includedClients", "billingStatus", "createdAt", "updatedAt")
       VALUES ($1, 15000, 3500, 5, 'ACTIVE', NOW(), NOW())`,
      [coach.id]
    );
    console.log("  ✓ Created CoachBilling record (15000 PKR base, 5 clients included)");
  } else {
    console.log("  ⚠️  CoachBilling already exists, skipping.");
  }

  // ─── Verify ───
  console.log("\n📊 Verification:");
  const counts = await q(`
    SELECT
      (SELECT COUNT(*) FROM "User" WHERE role = 'SUPER_ADMIN') as super_admins,
      (SELECT COUNT(*) FROM "User" WHERE role = 'COACH') as coaches,
      (SELECT COUNT(*) FROM "User" WHERE role = 'USER') as users,
      (SELECT COUNT(*) FROM "User" WHERE "coachId" IS NOT NULL) as users_with_coach,
      (SELECT COUNT(*) FROM "Recipe" WHERE "coachId" IS NOT NULL) as recipes_with_coach,
      (SELECT COUNT(*) FROM "Workout" WHERE "coachId" IS NOT NULL) as workouts_with_coach,
      (SELECT COUNT(*) FROM "PlanTemplate" WHERE "coachId" IS NOT NULL) as plans_with_coach,
      (SELECT COUNT(*) FROM "CoachBilling") as billing_records
  `);
  const v = counts.rows[0];
  console.log(`  Super Admins: ${v.super_admins}`);
  console.log(`  Coaches: ${v.coaches}`);
  console.log(`  Users: ${v.users}`);
  console.log(`  Users with coachId: ${v.users_with_coach}`);
  console.log(`  Recipes with coachId: ${v.recipes_with_coach}`);
  console.log(`  Workouts with coachId: ${v.workouts_with_coach}`);
  console.log(`  Plans with coachId: ${v.plans_with_coach}`);
  console.log(`  Billing records: ${v.billing_records}`);

  console.log("\n✅ Multi-tenant migration complete!");
  await pool.end();
}

main().catch((e) => { console.error("Migration failed:", e); pool.end(); process.exit(1); });
