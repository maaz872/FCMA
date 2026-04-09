/**
 * Populate PlanTemplateDay + PlanDayMeal for all 3 templates,
 * and add PlanDayMeal to existing ClientPlanDays for Jake & Emma.
 *
 * Run: npx tsx scripts/seed-plan-days.ts
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

// ── Recipe catalog (from DB) ──
const R = {
  proteinOats:     { id: 1, cal: 420, pro: 35, carbs: 48, fat: 10 },
  chickenRice:     { id: 2, cal: 550, pro: 45, carbs: 55, fat: 12 },
  salmonSP:        { id: 3, cal: 580, pro: 38, carbs: 45, fat: 22 },
  greekYoghurt:    { id: 4, cal: 280, pro: 22, carbs: 32, fat: 6 },
  bananaSmoothie:  { id: 5, cal: 350, pro: 30, carbs: 42, fat: 5 },
  beefStirFry:     { id: 6, cal: 480, pro: 40, carbs: 35, fat: 16 },
  eggWhiteOmelette:{ id: 7, cal: 180, pro: 26, carbs: 5,  fat: 4 },
  tunaSaladWrap:   { id: 8, cal: 380, pro: 35, carbs: 30, fat: 12 },
  chickpeaCurry:   { id: 9, cal: 420, pro: 18, carbs: 52, fat: 14 },
  proteinMugCake:  { id: 10, cal: 220, pro: 25, carbs: 18, fat: 5 },
};

// Workouts: ids 1, 2, 5, 6
const workoutIds = [1, 2, 5, 6];

interface MealDef { mealType: string; recipeId: number; servings: number; cal: number; pro: number; carbs: number; fat: number; }

// ── Meal rotations per day-of-week ──
// Fat Loss: ~1500-1800 cal/day, higher protein, lower carb
const fatLossMeals: Record<number, MealDef[]> = {
  1: [ // Monday
    { mealType: "breakfast", recipeId: R.eggWhiteOmelette.id, servings: 1, ...R.eggWhiteOmelette },
    { mealType: "lunch", recipeId: R.chickenRice.id, servings: 1, ...R.chickenRice },
    { mealType: "snack", recipeId: R.greekYoghurt.id, servings: 1, ...R.greekYoghurt },
    { mealType: "dinner", recipeId: R.salmonSP.id, servings: 1, ...R.salmonSP },
  ],
  2: [ // Tuesday
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 0.8, cal: 336, pro: 28, carbs: 38, fat: 8 },
    { mealType: "lunch", recipeId: R.tunaSaladWrap.id, servings: 1, ...R.tunaSaladWrap },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 0.8, cal: 280, pro: 24, carbs: 34, fat: 4 },
    { mealType: "dinner", recipeId: R.beefStirFry.id, servings: 1, ...R.beefStirFry },
  ],
  3: [ // Wednesday
    { mealType: "breakfast", recipeId: R.eggWhiteOmelette.id, servings: 1.5, cal: 270, pro: 39, carbs: 8, fat: 6 },
    { mealType: "lunch", recipeId: R.chickenRice.id, servings: 0.8, cal: 440, pro: 36, carbs: 44, fat: 10 },
    { mealType: "snack", recipeId: R.proteinMugCake.id, servings: 1, ...R.proteinMugCake },
    { mealType: "dinner", recipeId: R.salmonSP.id, servings: 0.8, cal: 464, pro: 30, carbs: 36, fat: 18 },
  ],
  4: [ // Thursday
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 0.8, cal: 336, pro: 28, carbs: 38, fat: 8 },
    { mealType: "lunch", recipeId: R.chickpeaCurry.id, servings: 1, ...R.chickpeaCurry },
    { mealType: "snack", recipeId: R.greekYoghurt.id, servings: 1, ...R.greekYoghurt },
    { mealType: "dinner", recipeId: R.beefStirFry.id, servings: 0.8, cal: 384, pro: 32, carbs: 28, fat: 13 },
  ],
  5: [ // Friday
    { mealType: "breakfast", recipeId: R.eggWhiteOmelette.id, servings: 1, ...R.eggWhiteOmelette },
    { mealType: "lunch", recipeId: R.tunaSaladWrap.id, servings: 1, ...R.tunaSaladWrap },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 1, ...R.bananaSmoothie },
    { mealType: "dinner", recipeId: R.salmonSP.id, servings: 1, ...R.salmonSP },
  ],
  6: [ // Saturday
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1, ...R.proteinOats },
    { mealType: "lunch", recipeId: R.chickenRice.id, servings: 0.8, cal: 440, pro: 36, carbs: 44, fat: 10 },
    { mealType: "snack", recipeId: R.proteinMugCake.id, servings: 1, ...R.proteinMugCake },
    { mealType: "dinner", recipeId: R.beefStirFry.id, servings: 0.8, cal: 384, pro: 32, carbs: 28, fat: 13 },
  ],
  7: [ // Sunday (rest day, lighter)
    { mealType: "breakfast", recipeId: R.greekYoghurt.id, servings: 1.5, cal: 420, pro: 33, carbs: 48, fat: 9 },
    { mealType: "lunch", recipeId: R.chickpeaCurry.id, servings: 1, ...R.chickpeaCurry },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 0.8, cal: 280, pro: 24, carbs: 34, fat: 4 },
    { mealType: "dinner", recipeId: R.tunaSaladWrap.id, servings: 1, ...R.tunaSaladWrap },
  ],
};

// Muscle Gain: ~2200-2500 cal, bigger portions + extra snack
const muscleGainMeals: Record<number, MealDef[]> = {
  1: [
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1.5, cal: 630, pro: 53, carbs: 72, fat: 15 },
    { mealType: "lunch", recipeId: R.chickenRice.id, servings: 1.5, cal: 825, pro: 68, carbs: 83, fat: 18 },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 1, ...R.bananaSmoothie },
    { mealType: "snack", recipeId: R.proteinMugCake.id, servings: 1, ...R.proteinMugCake },
    { mealType: "dinner", recipeId: R.beefStirFry.id, servings: 1.5, cal: 720, pro: 60, carbs: 53, fat: 24 },
  ],
  2: [
    { mealType: "breakfast", recipeId: R.eggWhiteOmelette.id, servings: 2, cal: 360, pro: 52, carbs: 10, fat: 8 },
    { mealType: "lunch", recipeId: R.salmonSP.id, servings: 1.5, cal: 870, pro: 57, carbs: 68, fat: 33 },
    { mealType: "snack", recipeId: R.greekYoghurt.id, servings: 1.5, cal: 420, pro: 33, carbs: 48, fat: 9 },
    { mealType: "snack", recipeId: R.proteinMugCake.id, servings: 1, ...R.proteinMugCake },
    { mealType: "dinner", recipeId: R.chickenRice.id, servings: 1, ...R.chickenRice },
  ],
  3: [
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1.5, cal: 630, pro: 53, carbs: 72, fat: 15 },
    { mealType: "lunch", recipeId: R.beefStirFry.id, servings: 1.5, cal: 720, pro: 60, carbs: 53, fat: 24 },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 1, ...R.bananaSmoothie },
    { mealType: "snack", recipeId: R.proteinMugCake.id, servings: 1, ...R.proteinMugCake },
    { mealType: "dinner", recipeId: R.salmonSP.id, servings: 1, ...R.salmonSP },
  ],
  4: [
    { mealType: "breakfast", recipeId: R.eggWhiteOmelette.id, servings: 2, cal: 360, pro: 52, carbs: 10, fat: 8 },
    { mealType: "lunch", recipeId: R.chickenRice.id, servings: 1.5, cal: 825, pro: 68, carbs: 83, fat: 18 },
    { mealType: "snack", recipeId: R.greekYoghurt.id, servings: 1.5, cal: 420, pro: 33, carbs: 48, fat: 9 },
    { mealType: "dinner", recipeId: R.chickpeaCurry.id, servings: 1.5, cal: 630, pro: 27, carbs: 78, fat: 21 },
  ],
  5: [
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1.5, cal: 630, pro: 53, carbs: 72, fat: 15 },
    { mealType: "lunch", recipeId: R.tunaSaladWrap.id, servings: 1.5, cal: 570, pro: 53, carbs: 45, fat: 18 },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 1, ...R.bananaSmoothie },
    { mealType: "snack", recipeId: R.proteinMugCake.id, servings: 1, ...R.proteinMugCake },
    { mealType: "dinner", recipeId: R.beefStirFry.id, servings: 1.5, cal: 720, pro: 60, carbs: 53, fat: 24 },
  ],
  6: [
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1, ...R.proteinOats },
    { mealType: "lunch", recipeId: R.salmonSP.id, servings: 1.5, cal: 870, pro: 57, carbs: 68, fat: 33 },
    { mealType: "snack", recipeId: R.greekYoghurt.id, servings: 1, ...R.greekYoghurt },
    { mealType: "dinner", recipeId: R.chickenRice.id, servings: 1.5, cal: 825, pro: 68, carbs: 83, fat: 18 },
  ],
  7: [
    { mealType: "breakfast", recipeId: R.eggWhiteOmelette.id, servings: 2, cal: 360, pro: 52, carbs: 10, fat: 8 },
    { mealType: "lunch", recipeId: R.chickpeaCurry.id, servings: 1.5, cal: 630, pro: 27, carbs: 78, fat: 21 },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 1.5, cal: 525, pro: 45, carbs: 63, fat: 8 },
    { mealType: "dinner", recipeId: R.beefStirFry.id, servings: 1, ...R.beefStirFry },
  ],
};

// Maintenance: ~1900-2100 cal, balanced
const maintenanceMeals: Record<number, MealDef[]> = {
  1: [
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1, ...R.proteinOats },
    { mealType: "lunch", recipeId: R.chickenRice.id, servings: 1, ...R.chickenRice },
    { mealType: "snack", recipeId: R.greekYoghurt.id, servings: 1, ...R.greekYoghurt },
    { mealType: "dinner", recipeId: R.salmonSP.id, servings: 1, ...R.salmonSP },
  ],
  2: [
    { mealType: "breakfast", recipeId: R.eggWhiteOmelette.id, servings: 1.5, cal: 270, pro: 39, carbs: 8, fat: 6 },
    { mealType: "lunch", recipeId: R.tunaSaladWrap.id, servings: 1, ...R.tunaSaladWrap },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 1, ...R.bananaSmoothie },
    { mealType: "dinner", recipeId: R.beefStirFry.id, servings: 1, ...R.beefStirFry },
  ],
  3: [
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1, ...R.proteinOats },
    { mealType: "lunch", recipeId: R.chickpeaCurry.id, servings: 1, ...R.chickpeaCurry },
    { mealType: "snack", recipeId: R.proteinMugCake.id, servings: 1, ...R.proteinMugCake },
    { mealType: "dinner", recipeId: R.salmonSP.id, servings: 1, ...R.salmonSP },
  ],
  4: [
    { mealType: "breakfast", recipeId: R.eggWhiteOmelette.id, servings: 1.5, cal: 270, pro: 39, carbs: 8, fat: 6 },
    { mealType: "lunch", recipeId: R.chickenRice.id, servings: 1, ...R.chickenRice },
    { mealType: "snack", recipeId: R.greekYoghurt.id, servings: 1, ...R.greekYoghurt },
    { mealType: "dinner", recipeId: R.chickpeaCurry.id, servings: 1, ...R.chickpeaCurry },
  ],
  5: [
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1, ...R.proteinOats },
    { mealType: "lunch", recipeId: R.tunaSaladWrap.id, servings: 1, ...R.tunaSaladWrap },
    { mealType: "snack", recipeId: R.bananaSmoothie.id, servings: 1, ...R.bananaSmoothie },
    { mealType: "dinner", recipeId: R.beefStirFry.id, servings: 1, ...R.beefStirFry },
  ],
  6: [
    { mealType: "breakfast", recipeId: R.greekYoghurt.id, servings: 1.5, cal: 420, pro: 33, carbs: 48, fat: 9 },
    { mealType: "lunch", recipeId: R.salmonSP.id, servings: 1, ...R.salmonSP },
    { mealType: "snack", recipeId: R.proteinMugCake.id, servings: 1, ...R.proteinMugCake },
    { mealType: "dinner", recipeId: R.chickenRice.id, servings: 1, ...R.chickenRice },
  ],
  7: [
    { mealType: "breakfast", recipeId: R.proteinOats.id, servings: 1, ...R.proteinOats },
    { mealType: "lunch", recipeId: R.chickpeaCurry.id, servings: 1, ...R.chickpeaCurry },
    { mealType: "snack", recipeId: R.greekYoghurt.id, servings: 1, ...R.greekYoghurt },
    { mealType: "dinner", recipeId: R.tunaSaladWrap.id, servings: 1, ...R.tunaSaladWrap },
  ],
};

function sumMacros(meals: MealDef[]) {
  return {
    cal: Math.round(meals.reduce((s, m) => s + m.cal, 0)),
    pro: Math.round(meals.reduce((s, m) => s + m.pro, 0)),
    carbs: Math.round(meals.reduce((s, m) => s + m.carbs, 0)),
    fat: Math.round(meals.reduce((s, m) => s + m.fat, 0)),
  };
}

async function seedTemplateDays(
  templateId: number,
  weeks: number,
  mealRotation: Record<number, MealDef[]>,
  label: string,
) {
  let dayCount = 0;
  let mealCount = 0;

  for (let w = 1; w <= weeks; w++) {
    for (let d = 1; d <= 7; d++) {
      const isWorkoutDay = [1, 3, 5].includes(d);
      const workoutId = isWorkoutDay ? workoutIds[(w + d) % workoutIds.length] : null;
      const meals = mealRotation[d];
      const macros = sumMacros(meals);

      const res = await q(
        `INSERT INTO "PlanTemplateDay" ("templateId", "dayOfWeek", "weekNumber", "workoutId", "calorieTarget", "proteinTarget", "carbsTarget", "fatTarget")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [templateId, d, w, workoutId, macros.cal, macros.pro, macros.carbs, macros.fat]
      );
      const dayId = res.rows[0].id;
      dayCount++;

      for (let idx = 0; idx < meals.length; idx++) {
        const m = meals[idx];
        await q(
          `INSERT INTO "PlanDayMeal" ("templateDayId", "mealType", "recipeId", servings, "sortOrder")
           VALUES ($1, $2, $3, $4, $5)`,
          [dayId, m.mealType, m.recipeId, m.servings, idx]
        );
        mealCount++;
      }
    }
  }
  console.log(`  ✓ ${label}: ${dayCount} days, ${mealCount} meals`);
}

async function seedClientPlanMeals(
  clientPlanId: number,
  mealRotation: Record<number, MealDef[]>,
  label: string,
) {
  // Get all existing ClientPlanDay records
  const daysRes = await q(
    `SELECT id, "dayOfWeek", "weekNumber" FROM "ClientPlanDay" WHERE "clientPlanId" = $1 ORDER BY "weekNumber", "dayOfWeek"`,
    [clientPlanId]
  );

  let mealCount = 0;
  for (const day of daysRes.rows) {
    const meals = mealRotation[day.dayOfWeek as number];
    if (!meals) continue;

    // Update macro targets on the day
    const macros = sumMacros(meals);
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
  console.log(`  ✓ ${label}: ${daysRes.rows.length} days, ${mealCount} meals`);
}

async function main() {
  console.log("🍽️  Seeding plan days + meals...\n");

  // ── 1. Get template IDs ──
  const templates = await q(`SELECT id, name, "durationWeeks" FROM "PlanTemplate" ORDER BY id`);
  if (templates.rows.length === 0) {
    console.error("No templates found. Run seed-demo-data.ts first.");
    process.exit(1);
  }

  // Clear any existing template days (cascade deletes meals)
  await q(`DELETE FROM "PlanTemplateDay" WHERE "templateId" IN (${templates.rows.map((t: { id: number }) => t.id).join(",")})`);
  console.log("📋 Template days:");

  for (const t of templates.rows) {
    const rotation = t.name.includes("Fat Loss") ? fatLossMeals
      : t.name.includes("Muscle Gain") ? muscleGainMeals
      : maintenanceMeals;
    await seedTemplateDays(t.id, t.durationWeeks, rotation, t.name);
  }

  // ── 2. Add meals to client plan days ──
  console.log("\n👥 Client plan meals:");
  const clientPlans = await q(
    `SELECT cp.id, cp.name, u."firstName" FROM "ClientPlan" cp JOIN "User" u ON u.id = cp."userId" WHERE cp.status = 'active'`
  );

  for (const cp of clientPlans.rows) {
    // Delete any existing meals for this client plan's days
    await q(
      `DELETE FROM "PlanDayMeal" WHERE "clientDayId" IN (SELECT id FROM "ClientPlanDay" WHERE "clientPlanId" = $1)`,
      [cp.id]
    );

    const rotation = cp.name.includes("Fat Loss") ? fatLossMeals
      : cp.name.includes("Muscle Gain") ? muscleGainMeals
      : maintenanceMeals;
    await seedClientPlanMeals(cp.id, rotation, `${cp.firstName} — ${cp.name}`);
  }

  // ── 3. Verify ──
  console.log("\n📊 Verification:");
  const ptd = await q(`SELECT COUNT(*) as count FROM "PlanTemplateDay"`);
  const pdm = await q(`SELECT COUNT(*) as count FROM "PlanDayMeal"`);
  console.log(`  PlanTemplateDay: ${ptd.rows[0].count}`);
  console.log(`  PlanDayMeal: ${pdm.rows[0].count}`);

  console.log("\n✅ Done!");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
