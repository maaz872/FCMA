/**
 * Demo data seeder — adds realistic demo content:
 * - 10 Karachi restaurants with full menus
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

  // ─── 10 Karachi Restaurants ────────────────────────────
  console.log("🍽️  Restaurants...");
  const restaurants = [
    { name: "Kolachi", slug: "kolachi", intro: "Iconic seafood restaurant at Do Darya with stunning sea views. Known for grilled fish and traditional Karachi flavors.",
      tips: "Try the grilled lobster. Book ahead for weekends. Outdoor seating recommended at sunset.",
      menu: [
        { name: "Grilled Pomfret", cal: 320, pro: 38, carbs: 2, fat: 18, price: "Rs. 1800" },
        { name: "Prawn Karahi", cal: 450, pro: 30, carbs: 12, fat: 28, price: "Rs. 2200" },
        { name: "Chicken Malai Boti", cal: 380, pro: 35, carbs: 8, fat: 22, price: "Rs. 950" },
        { name: "Mutton Biryani", cal: 550, pro: 28, carbs: 65, fat: 20, price: "Rs. 800" },
        { name: "Fish Tikka", cal: 280, pro: 32, carbs: 5, fat: 14, price: "Rs. 1200" },
      ]},
    { name: "BBQ Tonight", slug: "bbq-tonight", intro: "Famous for their BBQ platters and tikka. Multiple branches across Karachi, closest to Tipu Sultan on Shaheed-e-Millat.",
      tips: "Their chicken tikka is the best seller. Ask for extra green chutney. Family platters offer best value.",
      menu: [
        { name: "Chicken Tikka (8 pcs)", cal: 420, pro: 45, carbs: 5, fat: 24, price: "Rs. 750" },
        { name: "Seekh Kebab (4 pcs)", cal: 380, pro: 28, carbs: 8, fat: 26, price: "Rs. 650" },
        { name: "Mutton Chop (4 pcs)", cal: 520, pro: 35, carbs: 3, fat: 40, price: "Rs. 1100" },
        { name: "Chicken Boti", cal: 350, pro: 38, carbs: 6, fat: 18, price: "Rs. 850" },
        { name: "Mix Grill Platter", cal: 680, pro: 55, carbs: 10, fat: 45, price: "Rs. 2500" },
      ]},
    { name: "Xander's", slug: "xanders", intro: "Modern cafe near Zamzama with Western-fusion menu. Great for healthy bowls and coffee.",
      tips: "Protein bowl is macro-friendly. Avoid the desserts if cutting. Good WiFi for working.",
      menu: [
        { name: "Grilled Chicken Bowl", cal: 450, pro: 40, carbs: 35, fat: 15, price: "Rs. 1200" },
        { name: "Salmon Poke Bowl", cal: 380, pro: 32, carbs: 40, fat: 12, price: "Rs. 1500" },
        { name: "Caesar Salad", cal: 320, pro: 22, carbs: 18, fat: 20, price: "Rs. 900" },
        { name: "Steak Sandwich", cal: 550, pro: 35, carbs: 42, fat: 25, price: "Rs. 1400" },
        { name: "Acai Bowl", cal: 280, pro: 8, carbs: 48, fat: 8, price: "Rs. 950" },
      ]},
    { name: "Kababjees", slug: "kababjees", intro: "Popular for BBQ and traditional Pakistani cuisine. Multiple locations, known for generous portions.",
      tips: "Reshmi kebab is their specialty. Rice portions are huge — share if cutting. Raita is free.",
      menu: [
        { name: "Reshmi Kebab", cal: 340, pro: 30, carbs: 8, fat: 20, price: "Rs. 600" },
        { name: "Chicken Biryani", cal: 480, pro: 25, carbs: 60, fat: 16, price: "Rs. 450" },
        { name: "Chapli Kebab (2 pcs)", cal: 420, pro: 22, carbs: 12, fat: 32, price: "Rs. 500" },
        { name: "Nihari (bowl)", cal: 380, pro: 28, carbs: 15, fat: 24, price: "Rs. 550" },
        { name: "Daal Chawal", cal: 350, pro: 15, carbs: 55, fat: 8, price: "Rs. 300" },
      ]},
    { name: "Cafe Flo", slug: "cafe-flo", intro: "French-inspired bistro in PIDC. Elegant setting with continental options.",
      tips: "Their grilled chicken is surprisingly macro-friendly. Skip the bread basket. Salads are large.",
      menu: [
        { name: "Grilled Chicken Breast", cal: 380, pro: 42, carbs: 8, fat: 18, price: "Rs. 1300" },
        { name: "Pan-Seared Salmon", cal: 420, pro: 35, carbs: 12, fat: 24, price: "Rs. 1800" },
        { name: "Garden Salad + Chicken", cal: 300, pro: 30, carbs: 15, fat: 14, price: "Rs. 1100" },
        { name: "Mushroom Soup", cal: 180, pro: 6, carbs: 18, fat: 10, price: "Rs. 650" },
        { name: "Beef Steak (200g)", cal: 520, pro: 45, carbs: 5, fat: 35, price: "Rs. 2200" },
      ]},
    { name: "Lal Qila", slug: "lal-qila", intro: "Traditional Mughlai restaurant known for rich curries and naan. Near Bahadurabad.",
      tips: "Stick to tandoori items for lower calories. Avoid creamy curries if cutting. Naan portions are big.",
      menu: [
        { name: "Tandoori Chicken (half)", cal: 350, pro: 38, carbs: 5, fat: 18, price: "Rs. 700" },
        { name: "Butter Chicken", cal: 480, pro: 30, carbs: 15, fat: 32, price: "Rs. 850" },
        { name: "Chicken Karahi", cal: 420, pro: 32, carbs: 10, fat: 28, price: "Rs. 900" },
        { name: "Mutton Pulao", cal: 520, pro: 25, carbs: 58, fat: 22, price: "Rs. 650" },
        { name: "Seekh Kebab Platter", cal: 380, pro: 28, carbs: 8, fat: 26, price: "Rs. 550" },
      ]},
    { name: "Okra", slug: "okra", intro: "Upscale Mediterranean-Asian fusion in Clifton. Beautiful ambiance with healthy options.",
      tips: "Their salads are generous. Grilled options are excellent. Ask for dressing on the side.",
      menu: [
        { name: "Thai Chicken Salad", cal: 350, pro: 30, carbs: 20, fat: 16, price: "Rs. 1200" },
        { name: "Grilled Sea Bass", cal: 380, pro: 38, carbs: 8, fat: 20, price: "Rs. 1800" },
        { name: "Chicken Satay (6 pcs)", cal: 320, pro: 28, carbs: 12, fat: 18, price: "Rs. 1000" },
        { name: "Quinoa Bowl", cal: 400, pro: 18, carbs: 52, fat: 14, price: "Rs. 1100" },
        { name: "Edamame", cal: 120, pro: 12, carbs: 8, fat: 5, price: "Rs. 600" },
      ]},
    { name: "Student Biryani", slug: "student-biryani", intro: "Karachi's most famous biryani chain. Massive portions at budget prices. Near Bahadurabad.",
      tips: "Single portion feeds 2 people. Skip the raita to save calories. Chicken biryani is leaner than beef.",
      menu: [
        { name: "Chicken Biryani (single)", cal: 650, pro: 30, carbs: 80, fat: 22, price: "Rs. 350" },
        { name: "Beef Biryani (single)", cal: 720, pro: 32, carbs: 78, fat: 28, price: "Rs. 400" },
        { name: "Chicken Karahi (half)", cal: 450, pro: 32, carbs: 10, fat: 30, price: "Rs. 600" },
        { name: "Seekh Kebab Roll", cal: 380, pro: 18, carbs: 35, fat: 20, price: "Rs. 250" },
        { name: "Chicken Tikka Roll", cal: 350, pro: 22, carbs: 32, fat: 16, price: "Rs. 280" },
      ]},
    { name: "Zameer Ansari", slug: "zameer-ansari", intro: "Famous nihari and paya house in Bahadurabad. Traditional Pakistani breakfast spot.",
      tips: "Nihari is protein-rich but high in fat. Ask for lean cuts. Pair with 1 naan instead of 2.",
      menu: [
        { name: "Special Nihari (bowl)", cal: 450, pro: 32, carbs: 12, fat: 30, price: "Rs. 500" },
        { name: "Paya (bowl)", cal: 380, pro: 25, carbs: 8, fat: 28, price: "Rs. 450" },
        { name: "Haleem (plate)", cal: 420, pro: 22, carbs: 45, fat: 18, price: "Rs. 350" },
        { name: "Chicken Nihari", cal: 380, pro: 28, carbs: 10, fat: 24, price: "Rs. 450" },
        { name: "Naan (1 pc)", cal: 260, pro: 8, carbs: 45, fat: 5, price: "Rs. 30" },
      ]},
    { name: "Howdy", slug: "howdy", intro: "American-style burger and steak house near Shaheed-e-Millat. Good protein options.",
      tips: "Grilled chicken burger is the best macro option. Skip the fries for salad. Steaks are quality.",
      menu: [
        { name: "Grilled Chicken Burger", cal: 450, pro: 35, carbs: 38, fat: 18, price: "Rs. 850" },
        { name: "Classic Beef Burger", cal: 580, pro: 30, carbs: 42, fat: 32, price: "Rs. 950" },
        { name: "Ribeye Steak (250g)", cal: 550, pro: 48, carbs: 5, fat: 38, price: "Rs. 2500" },
        { name: "Chicken Wings (8 pcs)", cal: 420, pro: 30, carbs: 12, fat: 28, price: "Rs. 750" },
        { name: "Garden Salad", cal: 150, pro: 5, carbs: 18, fat: 8, price: "Rs. 450" },
      ]},
  ];

  for (const r of restaurants) {
    await q(
      `INSERT INTO "RestaurantGuide" (name, slug, introduction, tips, "menuItems", "isPublished", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW()) ON CONFLICT (slug) DO NOTHING`,
      [r.name, r.slug, r.intro, r.tips, JSON.stringify(r.menu)]
    );
  }
  console.log(`  ✓ ${restaurants.length} restaurants`);

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
  console.log("   🍽️  10 restaurants");
  console.log("   📋 3 plan templates");
  console.log("   📱 2 feed posts");
  console.log("   👤 Jake Mitchell: jake@demo.com / demo1234 (underperformer)");
  console.log("   👤 Emma Sullivan: emma@demo.com / demo1234 (overperformer)");
  console.log("   📊 60 days of data each");

  await pool.end();
}

seed().catch((e) => { console.error("Seed failed:", e); pool.end(); process.exit(1); });
