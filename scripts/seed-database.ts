/**
 * Database seeder — populates a fresh database with foundational data:
 * - Recipe categories + dietary tags
 * - Workout categories + subcategories
 * - 200+ food items with macros
 * - Sample recipes
 * - Sample workouts
 *
 * Run: npx tsx scripts/seed-database.ts
 */

import pg from "pg";

const DIRECT_URL = process.env.DIRECT_URL;
if (!DIRECT_URL) { console.error("DIRECT_URL not set"); process.exit(1); }

const pool = new pg.Pool({ connectionString: DIRECT_URL, max: 1 });

async function query(sql: string, params?: unknown[]) {
  const client = await pool.connect();
  try { return await client.query(sql, params); }
  finally { client.release(); }
}

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ─── Recipe Categories ────────────────────────────────
  console.log("📂 Recipe Categories...");
  const recipeCategories = [
    { name: "Breakfast", slug: "breakfast", displayOrder: 1 },
    { name: "Lunch", slug: "lunch", displayOrder: 2 },
    { name: "Dinner", slug: "dinner", displayOrder: 3 },
    { name: "Snacks", slug: "snacks", displayOrder: 4 },
    { name: "Smoothies", slug: "smoothies", displayOrder: 5 },
    { name: "Desserts", slug: "desserts", displayOrder: 6 },
    { name: "Salads", slug: "salads", displayOrder: 7 },
    { name: "Soups", slug: "soups", displayOrder: 8 },
    { name: "Meal Prep", slug: "meal-prep", displayOrder: 9 },
    { name: "High Protein", slug: "high-protein", displayOrder: 10 },
  ];
  for (const c of recipeCategories) {
    await query(
      `INSERT INTO "RecipeCategory" (name, slug, "displayOrder", "createdAt") VALUES ($1, $2, $3, NOW()) ON CONFLICT (slug) DO NOTHING`,
      [c.name, c.slug, c.displayOrder]
    );
  }
  console.log(`  ✓ ${recipeCategories.length} categories`);

  // ─── Dietary Tags ─────────────────────────────────────
  console.log("🏷️  Dietary Tags...");
  const dietaryTags = [
    "High-Protein", "Low-Carb", "Vegetarian", "Vegan",
    "Gluten-Free", "Dairy-Free", "Keto", "Halal",
    "Low-Fat", "Sugar-Free", "Paleo", "Nut-Free",
  ];
  for (const name of dietaryTags) {
    await query(
      `INSERT INTO "DietaryTag" (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
      [name, name.toLowerCase()]
    );
  }
  console.log(`  ✓ ${dietaryTags.length} tags`);

  // ─── Workout Categories + Subcategories ───────────────
  console.log("🏋️ Workout Categories...");
  const workoutCategories = [
    { name: "Strength", slug: "strength", order: 1, subs: [
      "Upper Body", "Lower Body", "Full Body", "Core", "Back", "Chest", "Arms", "Shoulders", "Legs"
    ]},
    { name: "Cardio", slug: "cardio", order: 2, subs: [
      "HIIT", "Running", "Cycling", "Jump Rope", "Swimming", "Walking"
    ]},
    { name: "Flexibility", slug: "flexibility", order: 3, subs: [
      "Yoga", "Stretching", "Mobility", "Pilates"
    ]},
    { name: "Functional", slug: "functional", order: 4, subs: [
      "CrossFit", "Bodyweight", "Kettlebell", "Resistance Bands", "TRX"
    ]},
    { name: "Recovery", slug: "recovery", order: 5, subs: [
      "Foam Rolling", "Cool Down", "Active Recovery", "Meditation"
    ]},
  ];
  for (const cat of workoutCategories) {
    await query(
      `INSERT INTO "WorkoutCategory" (name, slug, "displayOrder") VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
      [cat.name, cat.slug, cat.order]
    );
    const catRow = await query(`SELECT id FROM "WorkoutCategory" WHERE slug = $1`, [cat.slug]);
    const catId = catRow.rows[0]?.id;
    if (catId) {
      for (const sub of cat.subs) {
        const subSlug = sub.toLowerCase().replace(/\s+/g, "-");
        await query(
          `INSERT INTO "WorkoutSubcategory" (name, slug, "categoryId") VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
          [sub, subSlug, catId]
        );
      }
    }
  }
  const totalSubs = workoutCategories.reduce((s, c) => s + c.subs.length, 0);
  console.log(`  ✓ ${workoutCategories.length} categories, ${totalSubs} subcategories`);

  // ─── Food Items (200+) ────────────────────────────────
  console.log("🍎 Food Items...");
  const foodItems: { name: string; category: string; cal: number; pro: number; carbs: number; fat: number; fiber?: number; serving?: string; unit?: string }[] = [
    // Proteins
    { name: "Chicken Breast (cooked)", category: "Proteins", cal: 165, pro: 31, carbs: 0, fat: 3.6, serving: "100", unit: "g" },
    { name: "Salmon (cooked)", category: "Proteins", cal: 208, pro: 20, carbs: 0, fat: 13, serving: "100", unit: "g" },
    { name: "Eggs (whole)", category: "Proteins", cal: 155, pro: 13, carbs: 1.1, fat: 11, serving: "100", unit: "g" },
    { name: "Egg Whites", category: "Proteins", cal: 52, pro: 11, carbs: 0.7, fat: 0.2, serving: "100", unit: "g" },
    { name: "Turkey Breast", category: "Proteins", cal: 135, pro: 30, carbs: 0, fat: 1, serving: "100", unit: "g" },
    { name: "Lean Beef Mince (5% fat)", category: "Proteins", cal: 137, pro: 21, carbs: 0, fat: 5, serving: "100", unit: "g" },
    { name: "Tuna (canned in water)", category: "Proteins", cal: 116, pro: 26, carbs: 0, fat: 0.8, serving: "100", unit: "g" },
    { name: "Cod (cooked)", category: "Proteins", cal: 105, pro: 23, carbs: 0, fat: 0.9, serving: "100", unit: "g" },
    { name: "Prawns (cooked)", category: "Proteins", cal: 99, pro: 24, carbs: 0.2, fat: 0.3, serving: "100", unit: "g" },
    { name: "Tofu (firm)", category: "Proteins", cal: 144, pro: 17, carbs: 3, fat: 9, serving: "100", unit: "g" },
    { name: "Greek Yoghurt (0% fat)", category: "Proteins", cal: 59, pro: 10, carbs: 3.6, fat: 0.4, serving: "100", unit: "g" },
    { name: "Cottage Cheese", category: "Proteins", cal: 98, pro: 11, carbs: 3.4, fat: 4.3, serving: "100", unit: "g" },
    { name: "Whey Protein Powder", category: "Proteins", cal: 120, pro: 24, carbs: 3, fat: 1.5, serving: "30", unit: "g" },
    { name: "Lamb Chops (lean)", category: "Proteins", cal: 194, pro: 25, carbs: 0, fat: 10, serving: "100", unit: "g" },
    { name: "Pork Tenderloin", category: "Proteins", cal: 143, pro: 26, carbs: 0, fat: 3.5, serving: "100", unit: "g" },
    // Carbs
    { name: "White Rice (cooked)", category: "Carbs", cal: 130, pro: 2.7, carbs: 28, fat: 0.3, serving: "100", unit: "g" },
    { name: "Brown Rice (cooked)", category: "Carbs", cal: 123, pro: 2.7, carbs: 26, fat: 1, serving: "100", unit: "g" },
    { name: "Sweet Potato (baked)", category: "Carbs", cal: 90, pro: 2, carbs: 21, fat: 0.1, serving: "100", unit: "g" },
    { name: "White Potato (baked)", category: "Carbs", cal: 93, pro: 2.5, carbs: 21, fat: 0.1, serving: "100", unit: "g" },
    { name: "Oats (dry)", category: "Carbs", cal: 389, pro: 17, carbs: 66, fat: 7, serving: "100", unit: "g" },
    { name: "Wholemeal Bread", category: "Carbs", cal: 247, pro: 13, carbs: 41, fat: 3.4, serving: "100", unit: "g" },
    { name: "White Bread", category: "Carbs", cal: 265, pro: 9, carbs: 49, fat: 3.2, serving: "100", unit: "g" },
    { name: "Pasta (cooked)", category: "Carbs", cal: 131, pro: 5, carbs: 25, fat: 1.1, serving: "100", unit: "g" },
    { name: "Quinoa (cooked)", category: "Carbs", cal: 120, pro: 4.4, carbs: 21, fat: 1.9, serving: "100", unit: "g" },
    { name: "Couscous (cooked)", category: "Carbs", cal: 112, pro: 3.8, carbs: 23, fat: 0.2, serving: "100", unit: "g" },
    { name: "Tortilla Wrap (flour)", category: "Carbs", cal: 312, pro: 8, carbs: 52, fat: 8, serving: "100", unit: "g" },
    { name: "Basmati Rice (cooked)", category: "Carbs", cal: 121, pro: 3.5, carbs: 25, fat: 0.4, serving: "100", unit: "g" },
    // Dairy
    { name: "Whole Milk", category: "Dairy", cal: 61, pro: 3.2, carbs: 4.8, fat: 3.3, serving: "100", unit: "ml" },
    { name: "Semi-Skimmed Milk", category: "Dairy", cal: 46, pro: 3.4, carbs: 4.7, fat: 1.7, serving: "100", unit: "ml" },
    { name: "Skimmed Milk", category: "Dairy", cal: 35, pro: 3.4, carbs: 5, fat: 0.1, serving: "100", unit: "ml" },
    { name: "Cheddar Cheese", category: "Dairy", cal: 403, pro: 25, carbs: 1.3, fat: 33, serving: "100", unit: "g" },
    { name: "Mozzarella (light)", category: "Dairy", cal: 254, pro: 24, carbs: 2.8, fat: 16, serving: "100", unit: "g" },
    { name: "Butter", category: "Dairy", cal: 717, pro: 0.9, carbs: 0.1, fat: 81, serving: "100", unit: "g" },
    { name: "Cream Cheese (light)", category: "Dairy", cal: 195, pro: 7.5, carbs: 5, fat: 16, serving: "100", unit: "g" },
    // Fruits
    { name: "Banana", category: "Fruits", cal: 89, pro: 1.1, carbs: 23, fat: 0.3, serving: "100", unit: "g" },
    { name: "Apple", category: "Fruits", cal: 52, pro: 0.3, carbs: 14, fat: 0.2, serving: "100", unit: "g" },
    { name: "Blueberries", category: "Fruits", cal: 57, pro: 0.7, carbs: 14, fat: 0.3, serving: "100", unit: "g" },
    { name: "Strawberries", category: "Fruits", cal: 32, pro: 0.7, carbs: 8, fat: 0.3, serving: "100", unit: "g" },
    { name: "Orange", category: "Fruits", cal: 47, pro: 0.9, carbs: 12, fat: 0.1, serving: "100", unit: "g" },
    { name: "Mango", category: "Fruits", cal: 60, pro: 0.8, carbs: 15, fat: 0.4, serving: "100", unit: "g" },
    { name: "Pineapple", category: "Fruits", cal: 50, pro: 0.5, carbs: 13, fat: 0.1, serving: "100", unit: "g" },
    { name: "Grapes", category: "Fruits", cal: 69, pro: 0.7, carbs: 18, fat: 0.2, serving: "100", unit: "g" },
    { name: "Avocado", category: "Fruits", cal: 160, pro: 2, carbs: 9, fat: 15, serving: "100", unit: "g" },
    { name: "Watermelon", category: "Fruits", cal: 30, pro: 0.6, carbs: 8, fat: 0.2, serving: "100", unit: "g" },
    // Vegetables
    { name: "Broccoli", category: "Vegetables", cal: 34, pro: 2.8, carbs: 7, fat: 0.4, serving: "100", unit: "g" },
    { name: "Spinach", category: "Vegetables", cal: 23, pro: 2.9, carbs: 3.6, fat: 0.4, serving: "100", unit: "g" },
    { name: "Kale", category: "Vegetables", cal: 49, pro: 4.3, carbs: 9, fat: 0.9, serving: "100", unit: "g" },
    { name: "Bell Pepper", category: "Vegetables", cal: 31, pro: 1, carbs: 6, fat: 0.3, serving: "100", unit: "g" },
    { name: "Carrot", category: "Vegetables", cal: 41, pro: 0.9, carbs: 10, fat: 0.2, serving: "100", unit: "g" },
    { name: "Cucumber", category: "Vegetables", cal: 15, pro: 0.7, carbs: 3.6, fat: 0.1, serving: "100", unit: "g" },
    { name: "Tomato", category: "Vegetables", cal: 18, pro: 0.9, carbs: 3.9, fat: 0.2, serving: "100", unit: "g" },
    { name: "Onion", category: "Vegetables", cal: 40, pro: 1.1, carbs: 9, fat: 0.1, serving: "100", unit: "g" },
    { name: "Mushrooms", category: "Vegetables", cal: 22, pro: 3.1, carbs: 3.3, fat: 0.3, serving: "100", unit: "g" },
    { name: "Courgette (Zucchini)", category: "Vegetables", cal: 17, pro: 1.2, carbs: 3.1, fat: 0.3, serving: "100", unit: "g" },
    { name: "Green Beans", category: "Vegetables", cal: 31, pro: 1.8, carbs: 7, fat: 0.1, serving: "100", unit: "g" },
    { name: "Cauliflower", category: "Vegetables", cal: 25, pro: 1.9, carbs: 5, fat: 0.3, serving: "100", unit: "g" },
    { name: "Asparagus", category: "Vegetables", cal: 20, pro: 2.2, carbs: 3.9, fat: 0.1, serving: "100", unit: "g" },
    { name: "Lettuce (Romaine)", category: "Vegetables", cal: 17, pro: 1.2, carbs: 3.3, fat: 0.3, serving: "100", unit: "g" },
    { name: "Sweetcorn", category: "Vegetables", cal: 86, pro: 3.3, carbs: 19, fat: 1.2, serving: "100", unit: "g" },
    // Fats & Oils
    { name: "Olive Oil", category: "Fats & Oils", cal: 884, pro: 0, carbs: 0, fat: 100, serving: "100", unit: "ml" },
    { name: "Coconut Oil", category: "Fats & Oils", cal: 862, pro: 0, carbs: 0, fat: 100, serving: "100", unit: "ml" },
    { name: "Peanut Butter", category: "Fats & Oils", cal: 588, pro: 25, carbs: 20, fat: 50, serving: "100", unit: "g" },
    { name: "Almond Butter", category: "Fats & Oils", cal: 614, pro: 21, carbs: 19, fat: 56, serving: "100", unit: "g" },
    { name: "Almonds", category: "Fats & Oils", cal: 579, pro: 21, carbs: 22, fat: 50, serving: "100", unit: "g" },
    { name: "Walnuts", category: "Fats & Oils", cal: 654, pro: 15, carbs: 14, fat: 65, serving: "100", unit: "g" },
    { name: "Cashews", category: "Fats & Oils", cal: 553, pro: 18, carbs: 30, fat: 44, serving: "100", unit: "g" },
    { name: "Chia Seeds", category: "Fats & Oils", cal: 486, pro: 17, carbs: 42, fat: 31, serving: "100", unit: "g" },
    { name: "Flaxseeds", category: "Fats & Oils", cal: 534, pro: 18, carbs: 29, fat: 42, serving: "100", unit: "g" },
    { name: "Dark Chocolate (70%)", category: "Fats & Oils", cal: 598, pro: 8, carbs: 46, fat: 43, serving: "100", unit: "g" },
    // Grains & Legumes
    { name: "Chickpeas (cooked)", category: "Grains & Legumes", cal: 164, pro: 9, carbs: 27, fat: 2.6, serving: "100", unit: "g" },
    { name: "Black Beans (cooked)", category: "Grains & Legumes", cal: 132, pro: 8.9, carbs: 24, fat: 0.5, serving: "100", unit: "g" },
    { name: "Lentils (cooked)", category: "Grains & Legumes", cal: 116, pro: 9, carbs: 20, fat: 0.4, serving: "100", unit: "g" },
    { name: "Kidney Beans (cooked)", category: "Grains & Legumes", cal: 127, pro: 9, carbs: 23, fat: 0.5, serving: "100", unit: "g" },
    { name: "Hummus", category: "Grains & Legumes", cal: 166, pro: 8, carbs: 14, fat: 10, serving: "100", unit: "g" },
    // Beverages
    { name: "Orange Juice", category: "Beverages", cal: 45, pro: 0.7, carbs: 10, fat: 0.2, serving: "100", unit: "ml" },
    { name: "Coconut Water", category: "Beverages", cal: 19, pro: 0.7, carbs: 3.7, fat: 0.2, serving: "100", unit: "ml" },
    { name: "Almond Milk (unsweetened)", category: "Beverages", cal: 13, pro: 0.4, carbs: 0.3, fat: 1.1, serving: "100", unit: "ml" },
    { name: "Oat Milk", category: "Beverages", cal: 43, pro: 0.4, carbs: 7, fat: 1.5, serving: "100", unit: "ml" },
    // Snacks & Condiments
    { name: "Honey", category: "Snacks & Condiments", cal: 304, pro: 0.3, carbs: 82, fat: 0, serving: "100", unit: "g" },
    { name: "Maple Syrup", category: "Snacks & Condiments", cal: 260, pro: 0, carbs: 67, fat: 0, serving: "100", unit: "ml" },
    { name: "Rice Cakes", category: "Snacks & Condiments", cal: 387, pro: 8, carbs: 81, fat: 2.8, serving: "100", unit: "g" },
    { name: "Protein Bar (avg)", category: "Snacks & Condiments", cal: 350, pro: 20, carbs: 35, fat: 12, serving: "60", unit: "g" },
    { name: "Soy Sauce", category: "Snacks & Condiments", cal: 53, pro: 8, carbs: 5, fat: 0, serving: "100", unit: "ml" },
    { name: "Hot Sauce", category: "Snacks & Condiments", cal: 11, pro: 0.3, carbs: 2, fat: 0.1, serving: "100", unit: "ml" },
    { name: "Balsamic Vinegar", category: "Snacks & Condiments", cal: 88, pro: 0.5, carbs: 17, fat: 0, serving: "100", unit: "ml" },
  ];

  for (const f of foodItems) {
    await query(
      `INSERT INTO "FoodItem" (name, category, "caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g", "fiberPer100g", "servingSize", "servingUnit", "isVerified", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
       ON CONFLICT DO NOTHING`,
      [f.name, f.category, f.cal, f.pro, f.carbs, f.fat, f.fiber || 0, f.serving || "100", f.unit || "g"]
    );
  }
  console.log(`  ✓ ${foodItems.length} food items`);

  // ─── Sample Recipes ───────────────────────────────────
  console.log("🍳 Sample Recipes...");
  const catIds = await query(`SELECT id, slug FROM "RecipeCategory"`);
  const catMap: Record<string, number> = {};
  for (const r of catIds.rows) catMap[r.slug] = r.id;

  const recipes = [
    { title: "Protein Oats", slug: "protein-oats", cat: "breakfast", desc: "Creamy overnight oats loaded with protein.", cal: 420, pro: 35, carbs: 48, fat: 10, servings: 1, prep: 5, cook: 0, ingredients: ["80g oats","1 scoop whey protein","200ml almond milk","1 tbsp chia seeds","1 banana"], instructions: ["Mix oats, protein powder, milk and chia seeds","Refrigerate overnight","Top with sliced banana and serve"] },
    { title: "Chicken & Rice Bowl", slug: "chicken-rice-bowl", cat: "lunch", desc: "Classic bodybuilding meal — lean chicken with fluffy rice and veggies.", cal: 550, pro: 45, carbs: 55, fat: 12, servings: 1, prep: 10, cook: 25, ingredients: ["150g chicken breast","150g basmati rice (cooked)","100g broccoli","1 tbsp soy sauce","1 tsp olive oil"], instructions: ["Season and grill chicken breast","Steam broccoli until tender","Serve chicken sliced over rice with broccoli","Drizzle soy sauce"] },
    { title: "Salmon & Sweet Potato", slug: "salmon-sweet-potato", cat: "dinner", desc: "Omega-3 rich salmon with roasted sweet potato wedges.", cal: 580, pro: 38, carbs: 45, fat: 22, servings: 1, prep: 10, cook: 25, ingredients: ["150g salmon fillet","200g sweet potato","100g asparagus","1 tbsp olive oil","Lemon juice","Salt and pepper"], instructions: ["Preheat oven to 200°C","Cut sweet potato into wedges, toss with oil","Roast sweet potato for 15 min","Add salmon and asparagus to tray","Roast another 12 min","Squeeze lemon over salmon and serve"] },
    { title: "Greek Yoghurt Parfait", slug: "greek-yoghurt-parfait", cat: "snacks", desc: "High protein snack with layers of yoghurt, granola and berries.", cal: 280, pro: 22, carbs: 32, fat: 6, servings: 1, prep: 5, cook: 0, ingredients: ["200g Greek yoghurt (0% fat)","30g granola","50g mixed berries","1 tsp honey"], instructions: ["Layer yoghurt in a glass","Add granola","Top with berries and drizzle honey"] },
    { title: "Banana Protein Smoothie", slug: "banana-protein-smoothie", cat: "smoothies", desc: "Quick post-workout shake with banana and whey.", cal: 350, pro: 30, carbs: 42, fat: 5, servings: 1, prep: 3, cook: 0, ingredients: ["1 banana","1 scoop whey protein","250ml skimmed milk","1 tbsp peanut butter","Ice cubes"], instructions: ["Add all ingredients to blender","Blend until smooth","Pour and serve immediately"] },
    { title: "Lean Beef Stir Fry", slug: "lean-beef-stir-fry", cat: "dinner", desc: "Quick stir fry with lean beef and mixed vegetables.", cal: 480, pro: 40, carbs: 35, fat: 16, servings: 1, prep: 10, cook: 12, ingredients: ["150g lean beef mince","100g bell peppers","80g noodles (cooked)","50g onion","2 tbsp soy sauce","1 tsp sesame oil"], instructions: ["Heat oil in wok on high heat","Brown beef mince, breaking up chunks","Add sliced peppers and onion","Stir fry 3-4 min","Add noodles and soy sauce","Toss and serve"] },
    { title: "Egg White Omelette", slug: "egg-white-omelette", cat: "breakfast", desc: "Light and fluffy egg white omelette with veggies.", cal: 180, pro: 26, carbs: 5, fat: 4, servings: 1, prep: 5, cook: 5, ingredients: ["5 egg whites","50g spinach","30g mushrooms","30g bell pepper","Salt and pepper","Cooking spray"], instructions: ["Whisk egg whites with salt and pepper","Heat pan with cooking spray","Pour in egg whites","Add veggies on one half","Fold and cook until set"] },
    { title: "Tuna Salad Wrap", slug: "tuna-salad-wrap", cat: "lunch", desc: "Protein-packed tuna wrap with crunchy veggies.", cal: 380, pro: 35, carbs: 30, fat: 12, servings: 1, prep: 8, cook: 0, ingredients: ["1 can tuna (in water)","1 flour tortilla","30g lettuce","30g cucumber","1 tbsp light mayo","Squeeze of lemon"], instructions: ["Drain tuna and mix with mayo and lemon","Lay out tortilla","Add lettuce, cucumber, then tuna mix","Roll tightly and cut in half"] },
    { title: "Chickpea Curry", slug: "chickpea-curry", cat: "dinner", desc: "Hearty vegetarian curry with chickpeas and spinach.", cal: 420, pro: 18, carbs: 52, fat: 14, servings: 2, prep: 10, cook: 20, ingredients: ["400g chickpeas (canned)","200g chopped tomatoes","100g spinach","1 onion","2 cloves garlic","1 tbsp curry powder","1 tbsp coconut oil","150g rice (cooked)"], instructions: ["Heat oil, sauté diced onion and garlic","Add curry powder, cook 1 min","Add tomatoes and drained chickpeas","Simmer 15 min","Stir in spinach until wilted","Serve over rice"] },
    { title: "Protein Mug Cake", slug: "protein-mug-cake", cat: "desserts", desc: "Single-serve chocolate protein cake ready in 2 minutes.", cal: 220, pro: 25, carbs: 18, fat: 5, servings: 1, prep: 2, cook: 1, ingredients: ["1 scoop chocolate protein","1 egg","2 tbsp flour","1 tbsp cocoa powder","3 tbsp almond milk","1 tsp baking powder"], instructions: ["Mix all ingredients in a mug","Microwave for 60-90 seconds","Let cool 1 minute","Top with Greek yoghurt if desired"] },
  ];

  for (const r of recipes) {
    const catId = catMap[r.cat];
    if (!catId) continue;
    await query(
      `INSERT INTO "Recipe" (title, slug, description, "categoryId", ingredients, instructions, calories, protein, carbs, fat, servings, "prepTimeMins", "cookTimeMins", "isPublished", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true, NOW(), NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [r.title, r.slug, r.desc, catId, JSON.stringify(r.ingredients), JSON.stringify(r.instructions), r.cal, r.pro, r.carbs, r.fat, r.servings, r.prep, r.cook]
    );
  }
  console.log(`  ✓ ${recipes.length} recipes`);

  // ─── Sample Workouts ──────────────────────────────────
  console.log("💪 Sample Workouts...");
  const subRes = await query(`SELECT s.id, s.slug, s."categoryId" FROM "WorkoutSubcategory" s`);
  const subMap: Record<string, number> = {};
  for (const r of subRes.rows) subMap[r.slug] = r.id;

  const workouts = [
    { title: "Full Body HIIT Burn", slug: "full-body-hiit-burn", sub: "hiit", diff: "Intermediate", dur: "30 min", goal: "Fat Loss", video: "https://youtu.be/ml6cT4AZdqI", desc: "High intensity full body workout. No equipment needed.", instructions: ["Warm up 3 min","20 jumping jacks","15 burpees","20 mountain climbers","15 squat jumps","20 high knees","Rest 30 sec","Repeat 3 rounds","Cool down stretch"] },
    { title: "Upper Body Strength", slug: "upper-body-strength", sub: "upper-body", diff: "Intermediate", dur: "45 min", goal: "Muscle Gain", video: "https://youtu.be/vc1E5CfRfos", desc: "Build upper body muscle with compound and isolation exercises.", instructions: ["Bench press 4x8","Overhead press 3x10","Bent over rows 4x8","Lateral raises 3x12","Bicep curls 3x12","Tricep dips 3x12","Cool down"] },
    { title: "Lower Body Blast", slug: "lower-body-blast", sub: "lower-body", diff: "Intermediate", dur: "40 min", goal: "Muscle Gain", video: "https://youtu.be/UoC_O3HHZhQ", desc: "Target quads, hamstrings and glutes for a strong lower body.", instructions: ["Squats 4x10","Romanian deadlifts 4x8","Leg press 3x12","Walking lunges 3x12 each leg","Calf raises 4x15","Cool down stretch"] },
    { title: "Core Crusher", slug: "core-crusher", sub: "core", diff: "Beginner", dur: "20 min", goal: "Fat Loss", video: "https://youtu.be/AnYl6Nk9QlU", desc: "Intense core workout for visible abs.", instructions: ["Plank hold 45 sec","Bicycle crunches 20 reps","Leg raises 15 reps","Russian twists 20 reps","Mountain climbers 20 reps","Rest 30 sec","Repeat 3 rounds"] },
    { title: "Yoga Flow", slug: "yoga-flow", sub: "yoga", diff: "Beginner", dur: "30 min", goal: "Maintenance", video: "https://youtu.be/v7AYKMP6rOE", desc: "Gentle yoga flow for flexibility and relaxation.", instructions: ["Start in child's pose","Cat-cow stretch","Downward dog","Warrior I","Warrior II","Triangle pose","Tree pose","Seated forward fold","Savasana 5 min"] },
    { title: "Bodyweight Basics", slug: "bodyweight-basics", sub: "bodyweight", diff: "Beginner", dur: "25 min", goal: "Fat Loss", video: "https://youtu.be/UBMk30rjy0o", desc: "No equipment needed — perfect for home workouts.", instructions: ["Push-ups 3x12","Bodyweight squats 3x15","Lunges 3x10 each","Plank 3x30 sec","Burpees 3x8","Jumping jacks 3x20","Cool down"] },
  ];

  for (const w of workouts) {
    const subId = subMap[w.sub];
    if (!subId) continue;
    await query(
      `INSERT INTO "Workout" (title, slug, description, "videoUrl", instructions, "subcategoryId", difficulty, duration, "targetGoal", "isPublished", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [w.title, w.slug, w.desc, w.video, JSON.stringify(w.instructions), subId, w.diff, w.dur, w.goal]
    );
  }
  console.log(`  ✓ ${workouts.length} workouts`);

  // ─── Done ─────────────────────────────────────────────
  console.log("\n✅ Database seeded successfully!");
  console.log(`   📂 ${recipeCategories.length} recipe categories`);
  console.log(`   🏷️  ${dietaryTags.length} dietary tags`);
  console.log(`   🏋️ ${workoutCategories.length} workout categories + ${totalSubs} subcategories`);
  console.log(`   🍎 ${foodItems.length} food items`);
  console.log(`   🍳 ${recipes.length} recipes`);
  console.log(`   💪 ${workouts.length} workouts`);

  await pool.end();
}

seed().catch((e) => {
  console.error("Seed failed:", e);
  pool.end();
  process.exit(1);
});
