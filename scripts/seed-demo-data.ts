/**
 * Demo data seeder — adds realistic demo content:
 * - 3 plan templates (Fat Loss, Muscle Gain, Maintenance)
 * - 2 feed posts (TikTok + Instagram)
 * - 2 demo users with 2 months of contrasting data
 *
 * Run: npx tsx scripts/seed-demo-data.ts
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

async function seed() {
  console.log("🌱 Seeding demo data...\n");

  // Get admin user ID
  const adminRes = await q(`SELECT id FROM "User" WHERE role='ADMIN' LIMIT 1`);
  const adminId = adminRes.rows[0]?.id;
  if (!adminId) { console.error("No admin user found. Run seed-database.ts first."); process.exit(1); }

  // ─── 3 Plan Templates ─────────────────────────────────
  console.log("📋 Plan Templates...");
  const plans = [
    { name: "8-Week Fat Loss", desc: "Structured fat loss program with calorie deficit, cardio focus, and meal planning.", type: "combined", weeks: 8 },
    { name: "12-Week Muscle Gain", desc: "Progressive overload program with calorie surplus and strength training.", type: "combined", weeks: 12 },
    { name: "4-Week Maintenance", desc: "Maintain current physique with balanced training and nutrition.", type: "combined", weeks: 4 },
  ];
  for (const p of plans) {
    await q(
      `INSERT INTO "PlanTemplate" (name, description, type, "durationWeeks", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, NOW(), NOW()) ON CONFLICT DO NOTHING`,
      [p.name, p.desc, p.type, p.weeks]
    );
  }
  console.log(`  ✓ ${plans.length} plan templates`);

  // ─── 2 Feed Posts ──────────────────────────────────────
  console.log("📱 Feed Posts...");
  await q(
    `INSERT INTO "Post" ("authorId", content, "mediaType", "mediaUrl", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [adminId, "🔥 Check out this incredible transformation! Consistency is key. No shortcuts, just hard work and discipline every single day. Your future self will thank you!", "youtube", "https://www.tiktok.com/@chriswillx/video/7345678901234567890"]
  );
  await q(
    `INSERT INTO "Post" ("authorId", content, "mediaType", "mediaUrl", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    [adminId, "💪 Quick tip: The best workout is the one you actually do. Don't wait for perfect conditions — start where you are, use what you have, do what you can!", "youtube", "https://www.instagram.com/reel/C5xABC123/"]
  );
  console.log("  ✓ 2 feed posts (TikTok + Instagram)");

  // ─── 2 Demo Users ─────────────────────────────────────
  console.log("👥 Demo Users...");
  const hash = await bcrypt.hash("demo1234", 12);
  const jakeId = crypto.randomUUID();
  const emmaId = crypto.randomUUID();

  // Jake Mitchell — underperformer
  await q(
    `INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", country, role, plan, "planStatus", "unitPreference", "isActive",
     age, gender, "heightCm", "currentWeightKg", "fitnessGoal", "activityLevel", "targetWeightKg", "dietaryPrefs", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())`,
    [jakeId, "jake@demo.com", hash, "Jake", "Mitchell", "USA", "USER", "HUB", "ACTIVE", "METRIC", true,
     28, "MALE", 180, 95, "FAT_LOSS", "SEDENTARY", 80, '["None"]']
  );

  // Emma Sullivan — overperformer
  await q(
    `INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", country, role, plan, "planStatus", "unitPreference", "isActive",
     age, gender, "heightCm", "currentWeightKg", "fitnessGoal", "activityLevel", "targetWeightKg", "dietaryPrefs", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())`,
    [emmaId, "emma@demo.com", hash, "Emma", "Sullivan", "USA", "USER", "HUB", "ACTIVE", "METRIC", true,
     25, "FEMALE", 165, 70, "FAT_LOSS", "MODERATE", 62, '["Gluten-Free"]']
  );
  console.log("  ✓ Jake Mitchell (underperformer) + Emma Sullivan (overperformer)");

  // ─── Assign Plans ──────────────────────────────────────
  console.log("📋 Assigning plans...");
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
  const startDate = twoMonthsAgo.toISOString();

  // Get fat loss template
  const templateRes = await q(`SELECT id FROM "PlanTemplate" WHERE name='8-Week Fat Loss' LIMIT 1`);
  const templateId = templateRes.rows[0]?.id;

  for (const [userId, name] of [[jakeId, "Jake"], [emmaId, "Emma"]] as const) {
    const planRes = await q(
      `INSERT INTO "ClientPlan" ("userId", "templateId", name, type, "startDate", status, "createdAt", "updatedAt")
       VALUES ($1, $2, '8-Week Fat Loss', 'combined', $3, 'active', NOW(), NOW()) RETURNING id`,
      [userId, templateId, startDate]
    );
    const planId = planRes.rows[0].id;

    // Update user's activePlanId
    await q(`UPDATE "User" SET "activePlanId" = $1 WHERE id = $2`, [planId, userId]);

    // Add plan days (simplified — 7 days per week for 8 weeks)
    const workoutRes = await q(`SELECT id FROM "Workout" LIMIT 3`);
    const workoutIds = workoutRes.rows.map((r: { id: number }) => r.id);

    for (let w = 1; w <= 8; w++) {
      for (let d = 1; d <= 7; d++) {
        const isWorkoutDay = [1, 3, 5].includes(d); // Mon, Wed, Fri
        await q(
          `INSERT INTO "ClientPlanDay" ("clientPlanId", "dayOfWeek", "weekNumber", "workoutId", "calorieTarget", "proteinTarget", "carbsTarget", "fatTarget")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [planId, d, w, isWorkoutDay ? workoutIds[d % workoutIds.length] : null, 1800, 150, 180, 50]
        );
      }
    }
    console.log(`  ✓ ${name}: plan assigned with 56 days`);
  }

  // ─── Set Targets ───────────────────────────────────────
  console.log("🎯 Setting targets...");
  const now = new Date();
  for (const [userId, wTarget, bTarget, waTarget, sTarget] of [
    [jakeId, 80, 32, 34, 10000],
    [emmaId, 62, 26, 28, 10000],
  ] as const) {
    for (const [metric, value] of [["weight", wTarget], ["belly", bTarget], ["waist", waTarget], ["steps", sTarget]] as const) {
      await q(
        `INSERT INTO "WeeklyTarget" ("userId", "weekStartDate", metric, "targetValue", "isVisible", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
        [userId, now, metric, value]
      );
    }
  }
  console.log("  ✓ Targets set for both users");

  // ─── 2 Months of Data ─────────────────────────────────
  console.log("📊 Generating 2 months of data...");

  for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateStr = date.toISOString().split("T")[0];
    const dateISO = date.toISOString();

    // ── JAKE (underperformer) ──
    const jakeRand = Math.random();

    // Weight: barely changes (95 → 93, erratic)
    if (dayOffset % 5 === 0) { // logs weight every ~5 days
      const jakeWeight = 95 - (60 - dayOffset) * 0.03 + (Math.random() - 0.3) * 1.5;
      await q(
        `INSERT INTO "BodyMeasurement" ("userId", "loggedDate", "weightKg", "bellyInches", "waistInches", "chestInches", "hipsInches", "armsInches")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("userId", "loggedDate") DO NOTHING`,
        [jakeId, dateISO, Math.round(jakeWeight * 10) / 10, 38 - dayOffset * 0.01, 36 - dayOffset * 0.005, 42, 40, 15]
      );
    }

    // Steps: low (3000-6000)
    if (jakeRand > 0.3) { // misses ~30% of days
      const jakeSteps = 3000 + Math.floor(Math.random() * 3000);
      await q(
        `INSERT INTO "StepLog" ("userId", steps, goal, "loggedDate") VALUES ($1, $2, 10000, $3) ON CONFLICT ("userId", "loggedDate") DO NOTHING`,
        [jakeId, jakeSteps, dateISO]
      );
    }

    // Meals: sporadic (logs ~3 days/week)
    if (jakeRand > 0.55) {
      const jakeCals = 2200 + Math.floor(Math.random() * 800); // often over target
      await q(
        `INSERT INTO "MealLog" ("userId", description, "mealType", calories, protein, carbs, fat, "loggedDate", "loggedTime", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [jakeId, "Fast food + snacks", "Lunch", jakeCals, 60, 250, 80, dateISO, "13:00"]
      );
    }

    // ── EMMA (overperformer) ──
    const emmaRand = Math.random();

    // Weight: steady decline (70 → 63)
    if (dayOffset % 3 === 0) { // logs every ~3 days
      const emmaWeight = 70 - (60 - dayOffset) * 0.12 + (Math.random() - 0.5) * 0.3;
      await q(
        `INSERT INTO "BodyMeasurement" ("userId", "loggedDate", "weightKg", "bellyInches", "waistInches", "chestInches", "hipsInches", "armsInches")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("userId", "loggedDate") DO NOTHING`,
        [emmaId, dateISO, Math.round(emmaWeight * 10) / 10, 30 - (60 - dayOffset) * 0.06, 28 - (60 - dayOffset) * 0.05, 36, 38 - (60 - dayOffset) * 0.03, 12]
      );
    }

    // Steps: always high (10000-15000)
    if (emmaRand > 0.05) { // misses only ~5% of days
      const emmaSteps = 10000 + Math.floor(Math.random() * 5000);
      await q(
        `INSERT INTO "StepLog" ("userId", steps, goal, "loggedDate") VALUES ($1, $2, 10000, $3) ON CONFLICT ("userId", "loggedDate") DO NOTHING`,
        [emmaId, emmaSteps, dateISO]
      );
    }

    // Meals: logged daily, on plan
    if (emmaRand > 0.08) { // logs ~92% of days
      const emmaCals = 1600 + Math.floor(Math.random() * 300); // consistently under target
      await q(
        `INSERT INTO "MealLog" ("userId", description, "mealType", calories, protein, carbs, fat, "loggedDate", "loggedTime", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [emmaId, "[Plan] Healthy meals as planned", "Breakfast", Math.round(emmaCals * 0.3), 40, 35, 10, dateISO, "08:00"]
      );
      await q(
        `INSERT INTO "MealLog" ("userId", description, "mealType", calories, protein, carbs, fat, "loggedDate", "loggedTime", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [emmaId, "[Plan] Lean lunch", "Lunch", Math.round(emmaCals * 0.35), 45, 40, 12, dateISO, "12:30"]
      );
      await q(
        `INSERT INTO "MealLog" ("userId", description, "mealType", calories, protein, carbs, fat, "loggedDate", "loggedTime", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [emmaId, "[Plan] Light dinner", "Dinner", Math.round(emmaCals * 0.35), 40, 38, 10, dateISO, "19:00"]
      );
    }
  }
  console.log("  ✓ 60 days of data for Jake (poor) + Emma (excellent)");

  // ─── Done ─────────────────────────────────────────────
  console.log("\n✅ Demo data seeded!");
  console.log("   📋 3 plan templates");
  console.log("   📱 2 feed posts");
  console.log("   👤 Jake Mitchell: jake@demo.com / demo1234 (underperformer)");
  console.log("   👤 Emma Sullivan: emma@demo.com / demo1234 (overperformer)");
  console.log("   📊 60 days of data each");

  await pool.end();
}

seed().catch((e) => { console.error("Seed failed:", e); pool.end(); process.exit(1); });
