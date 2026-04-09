/**
 * Fix: Create Emma Sullivan user + plan + targets + 60 days data + plan meals
 * Emma was missing from the database after initial seed.
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
  console.log("🔧 Fixing Emma Sullivan...\n");

  // Check if Emma already exists
  const existing = await q(`SELECT id FROM "User" WHERE email = 'emma@demo.com'`);
  if (existing.rows.length > 0) {
    console.log("Emma already exists, skipping user creation.");
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash("demo1234", 12);
  const emmaId = crypto.randomUUID();

  // Create Emma
  await q(
    `INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", country, role, plan, "planStatus", "unitPreference", "isActive",
     age, gender, "heightCm", "currentWeightKg", "fitnessGoal", "activityLevel", "targetWeightKg", "dietaryPrefs", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())`,
    [emmaId, "emma@demo.com", hash, "Emma", "Sullivan", "USA", "USER", "HUB", "ACTIVE", "METRIC", true,
     25, "FEMALE", 165, 70, "FAT_LOSS", "MODERATE", 62, '["Gluten-Free"]']
  );
  console.log("  ✓ Emma Sullivan created");

  // Assign plan
  const templateRes = await q(`SELECT id FROM "PlanTemplate" WHERE name='8-Week Fat Loss' LIMIT 1`);
  const templateId = templateRes.rows[0]?.id;
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

  const planRes = await q(
    `INSERT INTO "ClientPlan" ("userId", "templateId", name, type, "startDate", status, "createdAt", "updatedAt")
     VALUES ($1, $2, '8-Week Fat Loss', 'combined', $3, 'active', NOW(), NOW()) RETURNING id`,
    [emmaId, templateId, twoMonthsAgo.toISOString()]
  );
  const planId = planRes.rows[0].id;
  await q(`UPDATE "User" SET "activePlanId" = $1 WHERE id = $2`, [planId, emmaId]);
  console.log("  ✓ Plan assigned");

  // Create plan days
  const workoutRes = await q(`SELECT id FROM "Workout" LIMIT 3`);
  const workoutIds = workoutRes.rows.map((r: { id: number }) => r.id);

  for (let w = 1; w <= 8; w++) {
    for (let d = 1; d <= 7; d++) {
      const isWorkoutDay = [1, 3, 5].includes(d);
      await q(
        `INSERT INTO "ClientPlanDay" ("clientPlanId", "dayOfWeek", "weekNumber", "workoutId", "calorieTarget", "proteinTarget", "carbsTarget", "fatTarget")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [planId, d, w, isWorkoutDay ? workoutIds[d % workoutIds.length] : null, 1800, 150, 180, 50]
      );
    }
  }
  console.log("  ✓ 56 plan days created");

  // Set targets
  const now = new Date();
  for (const [metric, value] of [["weight", 62], ["belly", 26], ["waist", 28], ["steps", 10000]] as const) {
    await q(
      `INSERT INTO "WeeklyTarget" ("userId", "weekStartDate", metric, "targetValue", "isVisible", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
      [emmaId, now, metric, value]
    );
  }
  console.log("  ✓ Targets set");

  // 60 days of data
  console.log("  Generating 60 days of data...");
  for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const dateISO = date.toISOString();
    const emmaRand = Math.random();

    // Weight: steady decline (70 → 63)
    if (dayOffset % 3 === 0) {
      const emmaWeight = 70 - (60 - dayOffset) * 0.12 + (Math.random() - 0.5) * 0.3;
      await q(
        `INSERT INTO "BodyMeasurement" ("userId", "loggedDate", "weightKg", "bellyInches", "waistInches", "chestInches", "hipsInches", "armsInches")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT ("userId", "loggedDate") DO NOTHING`,
        [emmaId, dateISO, Math.round(emmaWeight * 10) / 10, 30 - (60 - dayOffset) * 0.06, 28 - (60 - dayOffset) * 0.05, 36, 38 - (60 - dayOffset) * 0.03, 12]
      );
    }

    // Steps: always high (10000-15000)
    if (emmaRand > 0.05) {
      const emmaSteps = 10000 + Math.floor(Math.random() * 5000);
      await q(
        `INSERT INTO "StepLog" ("userId", steps, goal, "loggedDate") VALUES ($1, $2, 10000, $3) ON CONFLICT ("userId", "loggedDate") DO NOTHING`,
        [emmaId, emmaSteps, dateISO]
      );
    }

    // Meals: logged daily, on plan
    if (emmaRand > 0.08) {
      const emmaCals = 1600 + Math.floor(Math.random() * 300);
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
  console.log("  ✓ 60 days of data generated");

  // Now add meals to Emma's plan days (same as seed-plan-days.ts logic)
  const R = {
    eggWhiteOmelette: { id: 7, cal: 180, pro: 26, carbs: 5, fat: 4 },
    chickenRice:      { id: 2, cal: 550, pro: 45, carbs: 55, fat: 12 },
    greekYoghurt:     { id: 4, cal: 280, pro: 22, carbs: 32, fat: 6 },
    salmonSP:         { id: 3, cal: 580, pro: 38, carbs: 45, fat: 22 },
    proteinOats:      { id: 1, cal: 420, pro: 35, carbs: 48, fat: 10 },
    tunaSaladWrap:    { id: 8, cal: 380, pro: 35, carbs: 30, fat: 12 },
    bananaSmoothie:   { id: 5, cal: 350, pro: 30, carbs: 42, fat: 5 },
    beefStirFry:      { id: 6, cal: 480, pro: 40, carbs: 35, fat: 16 },
    proteinMugCake:   { id: 10, cal: 220, pro: 25, carbs: 18, fat: 5 },
    chickpeaCurry:    { id: 9, cal: 420, pro: 18, carbs: 52, fat: 14 },
  };

  type MD = { mealType: string; recipeId: number; servings: number; cal: number; pro: number; carbs: number; fat: number; };
  const fatLossMeals: Record<number, MD[]> = {
    1: [
      { mealType: "breakfast", recipeId: 7, servings: 1, ...R.eggWhiteOmelette },
      { mealType: "lunch", recipeId: 2, servings: 1, ...R.chickenRice },
      { mealType: "snack", recipeId: 4, servings: 1, ...R.greekYoghurt },
      { mealType: "dinner", recipeId: 3, servings: 1, ...R.salmonSP },
    ],
    2: [
      { mealType: "breakfast", recipeId: 1, servings: 0.8, cal: 336, pro: 28, carbs: 38, fat: 8 },
      { mealType: "lunch", recipeId: 8, servings: 1, ...R.tunaSaladWrap },
      { mealType: "snack", recipeId: 5, servings: 0.8, cal: 280, pro: 24, carbs: 34, fat: 4 },
      { mealType: "dinner", recipeId: 6, servings: 1, ...R.beefStirFry },
    ],
    3: [
      { mealType: "breakfast", recipeId: 7, servings: 1.5, cal: 270, pro: 39, carbs: 8, fat: 6 },
      { mealType: "lunch", recipeId: 2, servings: 0.8, cal: 440, pro: 36, carbs: 44, fat: 10 },
      { mealType: "snack", recipeId: 10, servings: 1, ...R.proteinMugCake },
      { mealType: "dinner", recipeId: 3, servings: 0.8, cal: 464, pro: 30, carbs: 36, fat: 18 },
    ],
    4: [
      { mealType: "breakfast", recipeId: 1, servings: 0.8, cal: 336, pro: 28, carbs: 38, fat: 8 },
      { mealType: "lunch", recipeId: 9, servings: 1, ...R.chickpeaCurry },
      { mealType: "snack", recipeId: 4, servings: 1, ...R.greekYoghurt },
      { mealType: "dinner", recipeId: 6, servings: 0.8, cal: 384, pro: 32, carbs: 28, fat: 13 },
    ],
    5: [
      { mealType: "breakfast", recipeId: 7, servings: 1, ...R.eggWhiteOmelette },
      { mealType: "lunch", recipeId: 8, servings: 1, ...R.tunaSaladWrap },
      { mealType: "snack", recipeId: 5, servings: 1, ...R.bananaSmoothie },
      { mealType: "dinner", recipeId: 3, servings: 1, ...R.salmonSP },
    ],
    6: [
      { mealType: "breakfast", recipeId: 1, servings: 1, ...R.proteinOats },
      { mealType: "lunch", recipeId: 2, servings: 0.8, cal: 440, pro: 36, carbs: 44, fat: 10 },
      { mealType: "snack", recipeId: 10, servings: 1, ...R.proteinMugCake },
      { mealType: "dinner", recipeId: 6, servings: 0.8, cal: 384, pro: 32, carbs: 28, fat: 13 },
    ],
    7: [
      { mealType: "breakfast", recipeId: 4, servings: 1.5, cal: 420, pro: 33, carbs: 48, fat: 9 },
      { mealType: "lunch", recipeId: 9, servings: 1, ...R.chickpeaCurry },
      { mealType: "snack", recipeId: 5, servings: 0.8, cal: 280, pro: 24, carbs: 34, fat: 4 },
      { mealType: "dinner", recipeId: 8, servings: 1, ...R.tunaSaladWrap },
    ],
  };

  // Add meals to Emma's plan days
  const daysRes = await q(
    `SELECT id, "dayOfWeek" FROM "ClientPlanDay" WHERE "clientPlanId" = $1`,
    [planId]
  );
  let mealCount = 0;
  for (const day of daysRes.rows) {
    const meals = fatLossMeals[day.dayOfWeek as number];
    if (!meals) continue;
    const macros = {
      cal: Math.round(meals.reduce((s: number, m: MD) => s + m.cal, 0)),
      pro: Math.round(meals.reduce((s: number, m: MD) => s + m.pro, 0)),
      carbs: Math.round(meals.reduce((s: number, m: MD) => s + m.carbs, 0)),
      fat: Math.round(meals.reduce((s: number, m: MD) => s + m.fat, 0)),
    };
    await q(
      `UPDATE "ClientPlanDay" SET "calorieTarget" = $1, "proteinTarget" = $2, "carbsTarget" = $3, "fatTarget" = $4 WHERE id = $5`,
      [macros.cal, macros.pro, macros.carbs, macros.fat, day.id]
    );
    for (let idx = 0; idx < meals.length; idx++) {
      const m = meals[idx];
      await q(
        `INSERT INTO "PlanDayMeal" ("clientDayId", "mealType", "recipeId", servings, "sortOrder")
         VALUES ($1, $2, $3, $4, $5)`,
        [day.id, m.mealType, m.recipeId, m.servings, idx]
      );
      mealCount++;
    }
  }
  console.log(`  ✓ ${mealCount} plan day meals added`);

  console.log("\n✅ Emma Sullivan fully set up!");
  console.log("   👤 emma@demo.com / demo1234");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
