import "dotenv/config";
import { hashSync } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DIRECT_URL || process.env.DATABASE_URL!);
const prisma = new (PrismaClient as any)({ adapter });

// ─── Helpers ────────────────────────────────────────────────────────────────

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Main Seed ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Level Up database...\n");

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. USERS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("👤 Creating users...");

  const admin = await prisma.user.upsert({
    where: { email: "admin@levelup.com" },
    update: {},
    create: {
      email: "admin@levelup.com",
      passwordHash: hashSync("Lev3lUp@Adm!n2026", 12),
      firstName: "Coach",
      lastName: "Raheel",
      role: "ADMIN",
      plan: "FREE",
      planStatus: "ACTIVE",
      unitPreference: "METRIC",
      isActive: true,
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@levelup.com" },
    update: {},
    create: {
      email: "demo@levelup.com",
      passwordHash: hashSync("user1234", 12),
      firstName: "Demo",
      lastName: "User",
      role: "USER",
      plan: "HUB",
      planStatus: "ACTIVE",
      unitPreference: "METRIC",
      isActive: true,
    },
  });

  console.log(`   ✅ Admin: ${admin.email}`);
  console.log(`   ✅ Demo:  ${demoUser.email}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RECIPE CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n📂 Creating recipe categories...");

  const categoryNames = [
    "Breakfast",
    "Lunch",
    "Dinner",
    "Snacks",
    "Desserts",
    "Fakeaways",
  ];

  const categories: Record<string, number> = {};

  for (let i = 0; i < categoryNames.length; i++) {
    const name = categoryNames[i];
    const cat = await prisma.recipeCategory.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name), displayOrder: i + 1 },
    });
    categories[name] = cat.id;
    console.log(`   ✅ ${name}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DIETARY TAGS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n🏷️  Creating dietary tags...");

  const tagNames = [
    "Vegetarian",
    "Vegan",
    "Gluten-Free",
    "Dairy-Free",
    "High-Protein",
  ];

  const tags: Record<string, number> = {};

  for (const name of tagNames) {
    const tag = await prisma.dietaryTag.upsert({
      where: { slug: slug(name) },
      update: {},
      create: { name, slug: slug(name) },
    });
    tags[name] = tag.id;
    console.log(`   ✅ ${name}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. RECIPES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n🍽️  Creating recipes...");

  const recipesData = [
    {
      title: "High-Protein Overnight Oats",
      category: "Breakfast",
      description:
        "Creamy overnight oats loaded with protein — the perfect grab-and-go breakfast for busy mornings. Prep in 5 minutes the night before and wake up to a meal that keeps you full until lunch.",
      ingredients: JSON.stringify([
        "80g rolled oats",
        "1 scoop (30g) vanilla whey protein",
        "200ml unsweetened almond milk",
        "100g Greek yoghurt (0% fat)",
        "1 tbsp chia seeds",
        "1 tbsp peanut butter",
        "80g mixed berries",
        "Drizzle of honey (optional)",
      ]),
      instructions: JSON.stringify([
        "Combine the rolled oats, protein powder, and chia seeds in a jar or container.",
        "Pour in the almond milk and add the Greek yoghurt. Stir thoroughly until smooth.",
        "Seal the container and refrigerate overnight (or at least 4 hours).",
        "In the morning, top with peanut butter, mixed berries, and a drizzle of honey if desired.",
        "Stir from the bottom before eating to distribute all the flavours evenly.",
      ]),
      calories: 485,
      protein: 42,
      carbs: 52,
      fat: 14,
      servings: 1,
      prepTimeMins: 5,
      cookTimeMins: 0,
      tags: ["Vegetarian", "High-Protein"],
    },
    {
      title: "Turkey & Spinach Egg White Omelette",
      category: "Breakfast",
      description:
        "A lean, protein-packed omelette that delivers serious nutrition without the calorie overload. Perfect for anyone in a cutting phase who still wants a hot, satisfying breakfast.",
      ingredients: JSON.stringify([
        "5 large egg whites",
        "1 whole egg",
        "80g turkey breast slices, chopped",
        "30g baby spinach",
        "30g reduced-fat cheddar, grated",
        "5 cherry tomatoes, halved",
        "Salt and pepper to taste",
        "Spray oil for the pan",
      ]),
      instructions: JSON.stringify([
        "Whisk the egg whites and whole egg together in a bowl. Season with salt and pepper.",
        "Heat a non-stick pan over medium heat and spray lightly with oil.",
        "Add the chopped turkey and cook for 2 minutes until warmed through.",
        "Toss in the spinach and tomatoes, cooking for another minute until the spinach wilts.",
        "Pour the egg mixture over the filling, tilting the pan to spread evenly.",
        "Cook for 3-4 minutes until the base is set, then sprinkle over the cheese.",
        "Fold the omelette in half, slide onto a plate, and serve immediately.",
      ]),
      calories: 310,
      protein: 48,
      carbs: 4,
      fat: 12,
      servings: 1,
      prepTimeMins: 5,
      cookTimeMins: 8,
      tags: ["Gluten-Free", "High-Protein"],
    },
    {
      title: "Chicken Burrito Bowl",
      category: "Lunch",
      description:
        "All the flavour of a burrito without the calorie-heavy tortilla. Juicy seasoned chicken on a bed of rice with fresh toppings — meal prep this on Sunday and thank yourself all week.",
      ingredients: JSON.stringify([
        "150g chicken breast, diced",
        "100g cooked basmati rice",
        "60g black beans (tinned, drained)",
        "50g sweetcorn",
        "40g red onion, finely diced",
        "1 medium tomato, diced",
        "1/2 avocado, sliced",
        "Juice of 1 lime",
        "1 tsp smoked paprika",
        "1 tsp cumin",
        "1/2 tsp garlic powder",
        "Salt and pepper to taste",
        "Spray oil",
      ]),
      instructions: JSON.stringify([
        "Season the diced chicken with smoked paprika, cumin, garlic powder, salt, and pepper.",
        "Heat a pan with spray oil over medium-high heat and cook the chicken for 6-7 minutes until golden and cooked through.",
        "While the chicken cooks, prepare the rice and warm the black beans and sweetcorn in the microwave.",
        "Build your bowl: lay the rice as a base, then arrange the chicken, beans, sweetcorn, tomato, red onion, and avocado on top.",
        "Squeeze fresh lime juice over everything and serve immediately.",
      ]),
      calories: 520,
      protein: 45,
      carbs: 55,
      fat: 14,
      servings: 1,
      prepTimeMins: 10,
      cookTimeMins: 10,
      tags: ["Gluten-Free", "Dairy-Free", "High-Protein"],
    },
    {
      title: "Tuna & White Bean Salad",
      category: "Lunch",
      description:
        "A Mediterranean-inspired salad that packs over 40g of protein with virtually zero cooking required. Ideal for a quick office lunch or when you need something light but filling.",
      ingredients: JSON.stringify([
        "1 tin (145g drained) tuna in spring water",
        "120g tinned cannellini beans, drained and rinsed",
        "60g mixed salad leaves",
        "8 cherry tomatoes, halved",
        "1/4 cucumber, diced",
        "30g red onion, thinly sliced",
        "10 pitted Kalamata olives",
        "1 tbsp extra virgin olive oil",
        "1 tbsp red wine vinegar",
        "1 tsp Dijon mustard",
        "Salt and pepper to taste",
      ]),
      instructions: JSON.stringify([
        "Drain the tuna and flake it into a large bowl with a fork.",
        "Add the cannellini beans, cherry tomatoes, cucumber, red onion, and olives.",
        "In a small bowl, whisk together the olive oil, red wine vinegar, and Dijon mustard to make the dressing.",
        "Pour the dressing over the salad and toss gently to combine.",
        "Arrange the mixed leaves on a plate and pile the tuna and bean mixture on top.",
        "Season with salt and pepper and serve straight away.",
      ]),
      calories: 385,
      protein: 42,
      carbs: 28,
      fat: 12,
      servings: 1,
      prepTimeMins: 10,
      cookTimeMins: 0,
      tags: ["Gluten-Free", "Dairy-Free", "High-Protein"],
    },
    {
      title: "Lean Beef Stir-Fry with Noodles",
      category: "Dinner",
      description:
        "A quick and flavour-packed stir-fry that hits every macro target. Tender strips of beef with crunchy vegetables and a savoury sauce — ready in under 20 minutes from start to finish.",
      ingredients: JSON.stringify([
        "150g lean beef sirloin, sliced into thin strips",
        "100g egg noodles (dry weight)",
        "1 red bell pepper, sliced",
        "80g broccoli florets",
        "60g mangetout",
        "2 spring onions, sliced",
        "2 cloves garlic, minced",
        "1 tbsp low-sodium soy sauce",
        "1 tbsp oyster sauce",
        "1 tsp sesame oil",
        "1 tsp cornflour mixed with 2 tbsp water",
        "Spray oil",
      ]),
      instructions: JSON.stringify([
        "Cook the egg noodles according to packet instructions, drain, and set aside.",
        "Heat a wok or large pan over high heat with spray oil. Add the beef strips and sear for 2-3 minutes until browned. Remove and set aside.",
        "In the same pan, stir-fry the garlic for 30 seconds, then add the broccoli and bell pepper. Cook for 3 minutes.",
        "Add the mangetout and spring onions, cooking for another 2 minutes until everything is tender-crisp.",
        "Return the beef to the pan. Pour in the soy sauce, oyster sauce, and sesame oil. Toss well.",
        "Add the cornflour mixture and stir until the sauce thickens slightly.",
        "Add the noodles and toss everything together. Serve immediately.",
      ]),
      calories: 540,
      protein: 44,
      carbs: 58,
      fat: 13,
      servings: 1,
      prepTimeMins: 10,
      cookTimeMins: 12,
      tags: ["Dairy-Free", "High-Protein"],
    },
    {
      title: "One-Pan Lemon Herb Salmon with Vegetables",
      category: "Dinner",
      description:
        "Perfectly baked salmon with roasted Mediterranean vegetables — minimal washing up and maximum flavour. The omega-3 fatty acids make this one of the best meals you can eat for both body and brain.",
      ingredients: JSON.stringify([
        "1 salmon fillet (approx. 150g)",
        "150g baby potatoes, halved",
        "100g courgette, sliced",
        "80g cherry tomatoes",
        "60g asparagus spears",
        "1 tbsp olive oil",
        "Juice and zest of 1 lemon",
        "2 cloves garlic, minced",
        "1 tsp dried oregano",
        "Fresh dill for garnish",
        "Salt and pepper to taste",
      ]),
      instructions: JSON.stringify([
        "Preheat the oven to 200C (180C fan).",
        "Spread the halved baby potatoes on a lined baking tray, drizzle with half the olive oil, and season. Roast for 15 minutes.",
        "Remove the tray and add the courgette, asparagus, cherry tomatoes, and garlic around the potatoes.",
        "Place the salmon fillet in the centre of the tray. Drizzle with the remaining olive oil, lemon juice, and zest. Sprinkle with oregano, salt, and pepper.",
        "Return to the oven and bake for 15-18 minutes until the salmon is cooked through and flakes easily.",
        "Garnish with fresh dill and serve directly from the tray.",
      ]),
      calories: 495,
      protein: 40,
      carbs: 35,
      fat: 20,
      servings: 1,
      prepTimeMins: 10,
      cookTimeMins: 33,
      tags: ["Gluten-Free", "Dairy-Free", "High-Protein"],
    },
    {
      title: "Chicken Tikka Fakeaway",
      category: "Fakeaways",
      description:
        "Tastes just like your favourite takeaway but with a fraction of the calories and fat. Tender marinated chicken pieces in a rich, spiced tomato sauce — no one will believe this is diet food.",
      ingredients: JSON.stringify([
        "200g chicken breast, cubed",
        "100g basmati rice (dry weight)",
        "150ml passata",
        "80ml low-fat natural yoghurt",
        "1 small onion, finely diced",
        "2 cloves garlic, minced",
        "1 thumb-sized piece ginger, grated",
        "1 tsp garam masala",
        "1 tsp ground cumin",
        "1 tsp turmeric",
        "1 tsp smoked paprika",
        "1/2 tsp chilli powder (adjust to taste)",
        "1 tbsp tomato puree",
        "Spray oil",
        "Fresh coriander to serve",
      ]),
      instructions: JSON.stringify([
        "Marinate the chicken cubes in half the yoghurt, half the garam masala, turmeric, and a pinch of salt. Refrigerate for at least 30 minutes (or overnight for best results).",
        "Cook the basmati rice according to packet instructions and set aside.",
        "Heat a non-stick pan with spray oil. Cook the marinated chicken pieces over high heat for 5-6 minutes until charred and cooked through. Remove and set aside.",
        "In the same pan, soften the onion for 3-4 minutes. Add the garlic and ginger, cooking for another minute.",
        "Stir in the cumin, remaining garam masala, smoked paprika, chilli powder, and tomato puree. Cook for 1 minute until fragrant.",
        "Pour in the passata and remaining yoghurt. Simmer for 8-10 minutes until the sauce thickens.",
        "Return the chicken to the sauce and stir through. Serve over basmati rice with fresh coriander.",
      ]),
      calories: 530,
      protein: 52,
      carbs: 58,
      fat: 8,
      servings: 1,
      prepTimeMins: 15,
      cookTimeMins: 25,
      tags: ["Gluten-Free", "High-Protein"],
    },
    {
      title: "Homemade Chicken Burger & Sweet Potato Wedges",
      category: "Fakeaways",
      description:
        "A proper burger night without the guilt. Juicy homemade chicken patties with crispy oven-baked sweet potato wedges — all the satisfaction of fast food at half the calories.",
      ingredients: JSON.stringify([
        "200g lean chicken mince",
        "1 wholemeal burger bun",
        "1 medium sweet potato, cut into wedges",
        "30g reduced-fat cheddar",
        "1 tsp smoked paprika",
        "1 tsp garlic powder",
        "1/2 tsp onion powder",
        "Lettuce, tomato, and gherkin for topping",
        "1 tbsp light mayo",
        "1 tsp Dijon mustard",
        "Salt and pepper to taste",
        "Spray oil",
      ]),
      instructions: JSON.stringify([
        "Preheat the oven to 200C (180C fan).",
        "Toss the sweet potato wedges in spray oil, smoked paprika, salt, and pepper. Spread on a baking tray and bake for 25-30 minutes, flipping halfway.",
        "Meanwhile, season the chicken mince with garlic powder, onion powder, salt, and pepper. Shape into a patty slightly wider than your bun (it will shrink when cooking).",
        "Cook the patty in a non-stick pan with spray oil over medium-high heat for 5-6 minutes per side until cooked through and golden.",
        "In the last minute of cooking, place the cheese slice on top of the patty and cover the pan to melt.",
        "Mix the light mayo and Dijon mustard together for the burger sauce.",
        "Toast the bun, then build your burger: bottom bun, sauce, lettuce, patty with cheese, tomato, gherkin, top bun.",
        "Serve with the sweet potato wedges on the side.",
      ]),
      calories: 560,
      protein: 50,
      carbs: 52,
      fat: 16,
      servings: 1,
      prepTimeMins: 10,
      cookTimeMins: 30,
      tags: ["High-Protein"],
    },
    {
      title: "Greek Yoghurt Protein Bark",
      category: "Snacks",
      description:
        "A frozen high-protein snack that satisfies your sweet tooth without derailing your macros. Keep a batch in the freezer and snap off a piece whenever cravings hit.",
      ingredients: JSON.stringify([
        "300g Greek yoghurt (0% fat)",
        "1 scoop (30g) vanilla whey protein",
        "1 tbsp honey",
        "40g dark chocolate chips",
        "30g mixed nuts, roughly chopped",
        "30g freeze-dried raspberries",
        "1 tbsp desiccated coconut",
      ]),
      instructions: JSON.stringify([
        "Mix the Greek yoghurt, protein powder, and honey together until completely smooth.",
        "Line a baking tray with parchment paper and spread the yoghurt mixture out into an even layer, roughly 1cm thick.",
        "Scatter the dark chocolate chips, chopped nuts, freeze-dried raspberries, and coconut evenly over the top.",
        "Press the toppings gently into the yoghurt surface so they stick.",
        "Freeze for at least 3 hours or until completely solid.",
        "Break into rough pieces and store in a freezer bag. Eat straight from the freezer — they soften quickly at room temperature.",
      ]),
      calories: 165,
      protein: 14,
      carbs: 15,
      fat: 6,
      servings: 4,
      prepTimeMins: 10,
      cookTimeMins: 0,
      tags: ["Vegetarian", "Gluten-Free", "High-Protein"],
    },
    {
      title: "Spicy Roasted Chickpeas",
      category: "Snacks",
      description:
        "Crunchy, savoury, and completely addictive. These roasted chickpeas are the perfect high-protein alternative to crisps. Make a big batch and portion them out for the week.",
      ingredients: JSON.stringify([
        "1 tin (400g) chickpeas, drained and rinsed",
        "1 tbsp olive oil",
        "1 tsp smoked paprika",
        "1/2 tsp cayenne pepper",
        "1/2 tsp garlic powder",
        "1/2 tsp ground cumin",
        "1/2 tsp sea salt",
      ]),
      instructions: JSON.stringify([
        "Preheat the oven to 200C (180C fan).",
        "Pat the chickpeas completely dry with kitchen paper — this is the key to getting them crispy.",
        "Toss them in the olive oil, smoked paprika, cayenne pepper, garlic powder, cumin, and salt.",
        "Spread in a single layer on a lined baking tray — avoid overcrowding.",
        "Roast for 30-35 minutes, shaking the tray every 10 minutes, until golden and crunchy.",
        "Let them cool completely on the tray — they will crisp up further as they cool.",
        "Store in an airtight container for up to 5 days.",
      ]),
      calories: 130,
      protein: 7,
      carbs: 16,
      fat: 4,
      servings: 3,
      prepTimeMins: 5,
      cookTimeMins: 35,
      tags: ["Vegan", "Gluten-Free", "Dairy-Free"],
    },
    {
      title: "Protein Chocolate Mug Cake",
      category: "Desserts",
      description:
        "A warm, fudgy chocolate cake ready in under 3 minutes with over 30g of protein. This is the guilt-free dessert that will save your diet when chocolate cravings strike at 9pm.",
      ingredients: JSON.stringify([
        "1 scoop (30g) chocolate whey protein",
        "1 tbsp cocoa powder",
        "2 tbsp oat flour",
        "1/2 tsp baking powder",
        "1 large egg",
        "3 tbsp unsweetened almond milk",
        "1 tsp honey or maple syrup",
        "10g dark chocolate chips (optional topping)",
      ]),
      instructions: JSON.stringify([
        "Mix the protein powder, cocoa powder, oat flour, and baking powder together in a microwave-safe mug.",
        "Add the egg, almond milk, and honey. Stir until you have a smooth batter with no lumps.",
        "If using, press the chocolate chips into the top of the batter.",
        "Microwave on high for 60-90 seconds. The cake should be set on top but still slightly gooey in the centre.",
        "Let it sit for 30 seconds before eating — it will be very hot.",
        "Eat straight from the mug or flip it out onto a plate. Top with a dollop of Greek yoghurt if desired.",
      ]),
      calories: 275,
      protein: 32,
      carbs: 22,
      fat: 8,
      servings: 1,
      prepTimeMins: 3,
      cookTimeMins: 2,
      tags: ["Vegetarian", "High-Protein"],
    },
    {
      title: "Banana Oat Protein Pancakes",
      category: "Breakfast",
      description:
        "Fluffy pancakes made with just a few wholesome ingredients — no flour, no added sugar. Stack them high and drizzle with your favourite toppings for a breakfast that feels indulgent but is anything but.",
      ingredients: JSON.stringify([
        "1 ripe banana",
        "2 large eggs",
        "40g rolled oats",
        "1 scoop (30g) vanilla whey protein",
        "1/2 tsp baking powder",
        "1/2 tsp cinnamon",
        "Spray oil for the pan",
        "Toppings: mixed berries, drizzle of maple syrup, dollop of Greek yoghurt",
      ]),
      instructions: JSON.stringify([
        "Blend the banana, eggs, oats, protein powder, baking powder, and cinnamon in a blender until smooth.",
        "Let the batter rest for 2-3 minutes while you heat a non-stick pan over medium-low heat with spray oil.",
        "Pour small ladles of batter onto the pan to form pancakes about 10cm in diameter.",
        "Cook for 2-3 minutes until bubbles form on the surface, then carefully flip and cook for another 1-2 minutes.",
        "Repeat until all the batter is used — you should get 4-5 pancakes.",
        "Stack the pancakes and top with fresh berries, a drizzle of maple syrup, and a spoon of Greek yoghurt.",
      ]),
      calories: 420,
      protein: 38,
      carbs: 48,
      fat: 10,
      servings: 1,
      prepTimeMins: 5,
      cookTimeMins: 12,
      tags: ["Vegetarian", "Gluten-Free", "High-Protein"],
    },
  ];

  for (const r of recipesData) {
    const recipe = await prisma.recipe.upsert({
      where: { slug: slug(r.title) },
      update: {},
      create: {
        title: r.title,
        slug: slug(r.title),
        description: r.description,
        categoryId: categories[r.category],
        ingredients: r.ingredients,
        instructions: r.instructions,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        servings: r.servings,
        prepTimeMins: r.prepTimeMins,
        cookTimeMins: r.cookTimeMins,
        isPublished: true,
      },
    });

    // Link dietary tags
    for (const tagName of r.tags) {
      await prisma.recipeDietaryTag.upsert({
        where: {
          recipeId_tagId: { recipeId: recipe.id, tagId: tags[tagName] },
        },
        update: {},
        create: { recipeId: recipe.id, tagId: tags[tagName] },
      });
    }

    console.log(`   ✅ ${r.title}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. RESTAURANT GUIDES
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n🍔 Creating restaurant guides...");

  const restaurantsData = [
    {
      name: "McDonald's",
      slug: "mcdonalds",
      introduction:
        "McDonald's gets a bad reputation in the fitness world, but if you know what to order, it can fit your macros surprisingly well. The key is avoiding the calorie-dense sauces and oversized combo meals. Here are the best options to stay on track without sacrificing convenience.",
      tips: JSON.stringify([
        "Skip the large meal upgrades — stick with medium or small portions.",
        "Swap sugary drinks for water, black coffee, or a Diet Coke.",
        "Avoid mayo-based sauces — use ketchup or mustard instead.",
        "The grilled chicken options are always a safer bet than crispy.",
        "Breakfast wraps are some of the best macro-friendly items on the menu.",
      ]),
      menuItems: JSON.stringify([
        { name: "Grilled Chicken Wrap", calories: 380, protein: 27, carbs: 37, fat: 13, notes: "One of the best options on the menu. High protein, moderate carbs." },
        { name: "Egg & Cheese McMuffin", calories: 290, protein: 17, carbs: 29, fat: 12, notes: "Solid breakfast choice. Lower calorie than most morning items." },
        { name: "Hamburger (Single)", calories: 250, protein: 13, carbs: 31, fat: 9, notes: "Simple and relatively low calorie. Add a side salad to fill up." },
        { name: "Chicken McNuggets (6pc)", calories: 250, protein: 15, carbs: 15, fat: 15, notes: "Decent protein hit. Avoid dipping sauces or stick with BBQ (50kcal)." },
        { name: "Side Salad", calories: 15, protein: 1, carbs: 2, fat: 0, notes: "Use sparingly with low-fat dressing. Great volume addition to any meal." },
        { name: "Fruit Bag", calories: 50, protein: 0, carbs: 12, fat: 0, notes: "Smart swap for fries if you want something lighter." },
      ]),
    },
    {
      name: "Subway",
      slug: "subway",
      introduction:
        "Subway is one of the most macro-friendly fast food chains going. With the ability to fully customise your order, you are in complete control of what goes in. The trick is knowing which breads, proteins, and sauces to pick — and which to leave behind.",
      tips: JSON.stringify([
        "Choose 9-grain wheat or Italian bread — avoid cheese bread and wraps.",
        "Double up on protein for an extra charge — it is well worth it for the macros.",
        "Load up on free vegetables — they add volume and micronutrients.",
        "Avoid creamy sauces like ranch and chipotle southwest. Mustard and vinegar are virtually calorie-free.",
        "A 6-inch sub is almost always enough — the footlong doubles everything.",
      ]),
      menuItems: JSON.stringify([
        { name: "6\" Chicken Breast Sub", calories: 320, protein: 26, carbs: 40, fat: 5, notes: "The gold standard of Subway ordering. Lean, filling, and macro-friendly." },
        { name: "6\" Turkey Breast Sub", calories: 280, protein: 20, carbs: 40, fat: 4, notes: "Lowest fat option on the menu. Great for a cutting phase." },
        { name: "6\" Steak & Cheese Sub", calories: 380, protein: 28, carbs: 41, fat: 11, notes: "A bit higher in fat but still a solid option. Skip the extra cheese." },
        { name: "Chicken Chopped Salad", calories: 220, protein: 24, carbs: 10, fat: 8, notes: "The lowest calorie main option. Perfect when you have used up your carb budget." },
        { name: "6\" Veggie Delite Sub", calories: 230, protein: 9, carbs: 39, fat: 3, notes: "Very low calorie base — add extra protein sources to make it a meal." },
        { name: "Oatmeal Raisin Cookie", calories: 200, protein: 3, carbs: 30, fat: 8, notes: "If you need a treat, this is 200kcal. Budget it in and enjoy." },
      ]),
    },
    {
      name: "Nando's",
      slug: "nandos",
      introduction:
        "Nando's is arguably the best restaurant chain for anyone tracking macros. Grilled chicken is the foundation of most fitness diets, and Nando's does it better than almost anyone. The main trap is the sides — choose wisely and you can build a meal that rivals your home cooking.",
      tips: JSON.stringify([
        "Always go for grilled chicken — butterfly breast or thigh are the best value for macros.",
        "Avoid the skin if cutting — it adds significant fat calories.",
        "Corn on the cob and chargrilled vegetables are the best side options.",
        "Skip the halloumi and creamy sides like coleslaw.",
        "Peri-peri sauce is virtually calorie-free — use as much as you like.",
      ]),
      menuItems: JSON.stringify([
        { name: "1/2 Chicken Breast (skin off)", calories: 330, protein: 55, carbs: 0, fat: 12, notes: "The ultimate Nando's order for anyone on a cut. Massive protein hit." },
        { name: "Butterfly Chicken Breast", calories: 240, protein: 42, carbs: 0, fat: 8, notes: "Leaner than the half chicken. Ideal if you want to spend calories on sides." },
        { name: "Chicken Thighs (skin off)", calories: 360, protein: 40, carbs: 0, fat: 22, notes: "More flavourful but higher in fat. Great on a maintenance or bulk phase." },
        { name: "Corn on the Cob", calories: 130, protein: 4, carbs: 22, fat: 3, notes: "One of the best side options. Filling and relatively low calorie." },
        { name: "Spicy Rice", calories: 260, protein: 5, carbs: 46, fat: 6, notes: "Good carb source. Pair with chicken breast for a balanced meal." },
        { name: "Chargrilled Vegetables", calories: 90, protein: 3, carbs: 10, fat: 4, notes: "Very low calorie side. Great for adding volume to your meal." },
      ]),
    },
    {
      name: "KFC",
      slug: "kfc",
      introduction:
        "KFC is one of the trickier fast food chains to navigate because almost everything is deep-fried. However, there are some smarter choices hidden on the menu if you know where to look. The grilled and rice-bowl options are your best friends here.",
      tips: JSON.stringify([
        "Avoid the original recipe coating where possible — it adds a lot of calories from the breading and oil.",
        "The ricebox options are generally the best macro-friendly choices on the menu.",
        "Skip the gravy — it adds 80-100 calories per portion and very little nutrition.",
        "Swap fries for a side of corn or beans.",
        "Drink water or sugar-free drinks to save hundreds of liquid calories.",
      ]),
      menuItems: JSON.stringify([
        { name: "Ricebox (Grilled)", calories: 400, protein: 28, carbs: 50, fat: 9, notes: "The best option at KFC. Grilled chicken with rice and a salad base." },
        { name: "Original Chicken Breast (1pc)", calories: 260, protein: 20, carbs: 8, fat: 16, notes: "If you must have original recipe, stick to one piece and pair with corn." },
        { name: "Mini Fillet Burger", calories: 280, protein: 15, carbs: 30, fat: 11, notes: "One of the lower-calorie burger options on the menu." },
        { name: "Corn Cobette", calories: 80, protein: 3, carbs: 15, fat: 2, notes: "Best side option. Low calorie with decent fibre." },
        { name: "BBQ Baked Beans", calories: 110, protein: 5, carbs: 18, fat: 1, notes: "Good source of fibre and protein. Much better than fries." },
        { name: "Chicken Popcorn (Regular)", calories: 285, protein: 17, carbs: 17, fat: 16, notes: "High in fat due to breading but manageable in smaller portions." },
      ]),
    },
    {
      name: "Chipotle",
      slug: "chipotle",
      introduction:
        "Chipotle is a dream for macro trackers because you build your own meal from scratch. Every ingredient is visible and customisable, meaning you can hit almost any calorie or macro target you want. The trick is knowing which combinations give you the best results.",
      tips: JSON.stringify([
        "Choose a bowl over a burrito — the tortilla alone adds 300 calories.",
        "Double chicken is one of the best value-for-macros upgrades in fast food.",
        "Use salsa instead of sour cream and cheese to save 200+ calories.",
        "Half portions of rice and beans give you the flavour without the calorie overload.",
        "Fajita vegetables are free and add great volume and micronutrients.",
      ]),
      menuItems: JSON.stringify([
        { name: "Chicken Burrito Bowl", calories: 510, protein: 42, carbs: 50, fat: 14, notes: "Bowl with chicken, brown rice, black beans, fajita veg, and fresh tomato salsa." },
        { name: "Steak Burrito Bowl", calories: 540, protein: 40, carbs: 50, fat: 17, notes: "Slightly higher fat than chicken but great flavour. Same build as above." },
        { name: "Chicken Salad Bowl", calories: 360, protein: 40, carbs: 18, fat: 14, notes: "Skip the rice and beans for a low-carb option. Add extra salsa for flavour." },
        { name: "Sofritas Bowl (Vegan)", calories: 450, protein: 18, carbs: 56, fat: 18, notes: "Plant-based option. Lower protein so consider adding guacamole for healthy fats." },
        { name: "Side of Guacamole", calories: 230, protein: 3, carbs: 8, fat: 22, notes: "High in healthy fats. Use if you have fat macros to spare." },
        { name: "Chicken Tacos (3pc)", calories: 480, protein: 35, carbs: 42, fat: 18, notes: "Three soft tacos with chicken and salsa. Decent balanced option." },
      ]),
    },
    {
      name: "Costa Coffee",
      slug: "costa-coffee",
      introduction:
        "Coffee shops are a hidden minefield for anyone watching their calories. A single flavoured latte can pack over 400 calories — more than some full meals. Here is how to enjoy your coffee ritual without blowing your daily intake.",
      tips: JSON.stringify([
        "Always order with skimmed milk or oat milk to cut significant fat calories.",
        "Sugar-free syrups are available for most drinks — just ask.",
        "An Americano with a splash of milk is under 20 calories. The safest bet by far.",
        "Avoid the pastries and baked goods — most are 350-500 calories each.",
        "If you want a snack, the porridge or fruit pots are the best options.",
      ]),
      menuItems: JSON.stringify([
        { name: "Americano (Medium)", calories: 10, protein: 1, carbs: 1, fat: 0, notes: "The safest coffee order. Add a splash of skimmed milk for 15 total calories." },
        { name: "Flat White (Skimmed Milk)", calories: 80, protein: 7, carbs: 10, fat: 0, notes: "Creamy coffee experience for very few calories. A solid daily choice." },
        { name: "Latte (Skimmed Milk, Medium)", calories: 100, protein: 9, carbs: 13, fat: 0, notes: "Classic latte without the calorie hit. Avoid flavoured syrups unless sugar-free." },
        { name: "Chai Latte (Skimmed Milk)", calories: 170, protein: 7, carbs: 30, fat: 1, notes: "Higher in sugar than other options. Fine as an occasional treat." },
        { name: "Porridge (Plain)", calories: 195, protein: 8, carbs: 30, fat: 4, notes: "Best food option in Costa. Add banana for a filling breakfast under 300kcal." },
        { name: "Protein Ball", calories: 110, protein: 3, carbs: 13, fat: 5, notes: "Small but satisfying sweet snack. Better than a muffin (400kcal+)." },
      ]),
    },
  ];

  for (const r of restaurantsData) {
    await prisma.restaurantGuide.upsert({
      where: { slug: r.slug },
      update: {},
      create: {
        name: r.name,
        slug: r.slug,
        introduction: r.introduction,
        tips: r.tips,
        menuItems: r.menuItems,
        isPublished: true,
      },
    });
    console.log(`   ✅ ${r.name}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. TESTIMONIALS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n⭐ Creating testimonials...");

  const testimonialsData = [
    // ── Hub Testimonials (25) ──────────────────────────────────────────────
    {
      clientName: "James O'Brien",
      duration: "8 weeks",
      quote:
        "I'd been stuck at 92kg for two years despite going to the gym four times a week. Within 8 weeks of using The Hub, I finally understood that my nutrition was the real problem. The macro calculator showed me I was eating nearly 800 calories over maintenance without even realising it. Down to 84kg and still dropping.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Sophie Clarke",
      duration: "12 weeks",
      quote:
        "I used to think eating healthy meant surviving on salads and chicken breast. The Hub recipes completely changed my perspective. I have been making the fakeaway meals every weekend and I genuinely prefer them to actual takeaways now. Lost 7kg in 12 weeks and I have not felt deprived once.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Mark Dempsey",
      duration: "6 weeks",
      quote:
        "The restaurant guide alone was worth the price for me. I travel for work three or four days a week and I was eating out for every meal. Once I started using the guide to pick smarter options, my weight started shifting almost immediately. Lost 5.2kg in six weeks without changing my schedule at all.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Rachel Murphy",
      duration: "10 weeks",
      quote:
        "After my second baby I was 18kg heavier than before pregnancy and completely lost on where to start. The meal tracker helped me see exactly where my extra calories were hiding — evening snacking was my killer. Ten weeks later I am down 9kg and I actually feel like myself again.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Conor Reilly",
      duration: "4 weeks",
      quote:
        "I signed up for The Hub mostly for the recipes because I was bored out of my mind eating the same five meals. Four weeks in and I have cooked more variety than I have in the last two years. My partner thinks I have become a chef. Down 3.4kg as a bonus.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Aisha Begum",
      duration: "16 weeks",
      quote:
        "I had tried every diet going — keto, intermittent fasting, juice cleanses — nothing stuck longer than a month. The Hub taught me it was never about the diet; it was about understanding my calories and macros properly. Sixteen weeks later and I have gone from a size 16 to a size 12. This is the first approach I can actually see myself doing forever.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Declan Walsh",
      duration: "8 weeks",
      quote:
        "I work shifts at a hospital and my eating pattern was all over the place. Having the meal tracker on my phone meant I could log everything in seconds between patients. It kept me accountable even on 12-hour nights. Eight weeks in and I have lost 6.1kg. My scrubs actually fit properly now.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Emma Doyle",
      duration: "6 weeks",
      quote:
        "The macro calculator was a real eye-opener. I genuinely thought I was eating around 1,600 calories a day. Turns out it was closer to 2,400 once I started measuring properly. Just getting accurate with my portions dropped 4kg off me in six weeks. No fancy tricks, just honesty and tracking.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Tomasz Kowalski",
      duration: "12 weeks",
      quote:
        "I moved to Ireland from Poland two years ago and my diet went completely off track. Fast food, pints at the weekend, zero meal planning. The Hub gave me a structure I could follow even with my limited cooking skills. The recipes are dead simple. Twelve weeks: minus 10.3kg and my blood pressure is back to normal.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Lauren Fitzgerald",
      duration: "5 weeks",
      quote:
        "I am a final-year college student living on a student budget. I was worried The Hub recipes would need expensive ingredients but most of them cost under a fiver per serving. I have actually been spending less on food because I am not ordering Deliveroo three times a week. Lost 3.8kg and saved money — win win.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Sean O'Connor",
      duration: "10 weeks",
      quote:
        "My wife bought us both a Hub subscription because she was sick of us arguing over what to have for dinner. We meal prep together every Sunday using the recipes now. I am down 7kg and she has lost 5kg. Best thing we have done for our health and our marriage honestly.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Niamh Kelly",
      duration: "8 weeks",
      quote:
        "I have a dairy intolerance and finding good recipes that actually hit my protein targets was always a nightmare. The Hub lets me filter by dietary tags and every single dairy-free recipe I have tried has been class. Eight weeks in and I am down 5.5kg with zero stomach issues. Absolute game changer for me.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Daniel Evans",
      duration: "14 weeks",
      quote:
        "I spent two years paying for a gym membership I barely used because I never knew what to eat around my training. The Hub made the nutrition side click for the first time. I am finally seeing the results of my gym work — 8kg down, visible abs for the first time in my life, and I actually understand why it is working.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Ciara Brennan",
      duration: "6 weeks",
      quote:
        "I am a primary school teacher and by 3pm every day I was reaching for the biscuit tin. Once I started tracking with The Hub I realised my lunches were way too low in protein so I was crashing mid-afternoon. Fixed my lunch, killed the cravings, lost 4.2kg in six weeks. My energy in the classroom is so much better too.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Ryan Gallagher",
      duration: "20 weeks",
      quote:
        "I have been using The Hub for five months now. Started at 104kg and I am currently sitting at 89kg. That is 15kg gone without a single day of starving myself. The fakeaway recipes kept me sane on weekends. If I can do it, anyone can — I was the lad who had a Domino's every Friday without fail.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Priya Sharma",
      duration: "8 weeks",
      quote:
        "As a vegetarian I always struggled to get enough protein. The Hub recipes showed me so many creative ways to hit my targets without meat. The overnight oats and protein bark are my favourites. I have lost 4.8kg and I feel stronger in my workouts than I ever have.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Keith Nolan",
      duration: "12 weeks",
      quote:
        "I work a desk job in finance and barely move during the day. I was gaining about 3kg a year and it was creeping up on me. The Hub helped me set realistic targets for someone with my activity level. Twelve weeks later I have reversed three years of gradual weight gain — down 8.7kg and I have started walking 10k steps a day.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Aoife McDonnell",
      duration: "4 weeks",
      quote:
        "I only joined a month ago but I can already see a difference. The biggest change has been my relationship with food. I used to feel guilty after every meal. Now I just log it, see where it fits in my macros, and move on. That mental shift alone is worth ten times the subscription price. Down 2.9kg so far.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Chris Taylor",
      duration: "16 weeks",
      quote:
        "After turning 50 I accepted that the belly was just part of getting older. My daughter gifted me a Hub subscription for my birthday and I thought it was a hint. Four months later I have lost 11kg, dropped two trouser sizes, and I have more energy than I did in my forties. Never too late to start.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Sinead Byrne",
      duration: "10 weeks",
      quote:
        "I was spending over 200 euro a month on ready meals and protein bars thinking they were healthy. The Hub showed me how to cook proper high-protein meals for a fraction of the cost. My grocery bill has halved and I have lost 6.3kg. I genuinely do not understand why I did not do this sooner.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Jack Murphy",
      duration: "6 weeks",
      quote:
        "I am 22 and just out of college. My diet was genuinely horrific — cereal for breakfast, a meal deal for lunch, and whatever was on Deliveroo for dinner. The Hub recipes are so easy that even I could not mess them up. Six weeks in and I have dropped 5kg and I actually enjoy cooking now.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Fiona Lynch",
      duration: "12 weeks",
      quote:
        "Perimenopause had me convinced my metabolism was broken. My GP told me it would be harder to lose weight at 47 but not impossible. The Hub's macro calculator gave me targets specifically for my age and activity level. Twelve weeks later and 7.4kg lighter, I wish I had found this years ago.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Oisin Barrett",
      duration: "8 weeks",
      quote:
        "I am a GAA player and I was struggling to fuel my training properly. Either I was eating too little and had no energy for matches, or eating too much and carrying extra timber. The Hub helped me find the sweet spot. Down 4kg of body fat in eight weeks and my performance on the pitch has noticeably improved.",
      category: "hub",
      isFeatured: false,
    },
    {
      clientName: "Megan Hughes",
      duration: "10 weeks",
      quote:
        "I have PCOS and losing weight has always been an uphill battle. Every programme I tried was generic and never accounted for my condition. The Hub's flexible approach let me adjust things to work for my body. Ten weeks in and I have lost 5.6kg — the most I have ever lost consistently. It is not a miracle, it is just a system that works.",
      category: "hub",
      isFeatured: true,
    },
    {
      clientName: "Patrick Connolly",
      duration: "6 weeks",
      quote:
        "The restaurant guide is honestly brilliant. My mates always want to eat out and I used to just order whatever and write the day off. Now I check the guide beforehand, pick something decent, and stay on track without being that annoying lad who brings tupperware to a restaurant. Lost 4.1kg in six weeks and I still have a social life.",
      category: "hub",
      isFeatured: false,
    },
    // ── Coaching Testimonials (20) ─────────────────────────────────────────
    {
      clientName: "Sarah Mitchell",
      duration: "12 weeks",
      quote:
        "As a single mum of two, I thought getting lean was impossible with my schedule. Coach Raheel designed a programme that genuinely fit around my chaotic life. I lost 11kg in 12 weeks and the mad thing is I barely changed my routine — just made smarter food choices and followed the plan. The weekly check-ins kept me accountable when I wanted to quit.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "David McAllister",
      duration: "8 weeks",
      quote:
        "I came to Coach Raheel at 26% body fat after years of yo-yo dieting. He did not just give me a meal plan — he taught me why everything works. Eight weeks later I was at 19% body fat and for the first time I understood how to maintain my results without needing someone to hold my hand. The education you get is worth more than the transformation.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "Jennifer Walsh",
      duration: "16 weeks",
      quote:
        "I had been going to the gym for three years and looked exactly the same. Turns out I was training completely wrong for my goals. Raheel restructured my programme to focus on progressive overload and adjusted my macros for a proper recomposition. Sixteen weeks later I weigh the same but I look like a completely different person. My body fat went from 32% to 24%.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "Michael Tierney",
      duration: "12 weeks",
      quote:
        "I am a software developer who sits at a desk for 10 hours a day. My back was in bits and I had put on 15kg since starting my job. Coach Raheel gave me a programme that fixed my posture issues and stripped the fat at the same time. Lost 12kg in 12 weeks and my back pain is basically gone. My only regret is not starting sooner.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Karen O'Neill",
      duration: "8 weeks",
      quote:
        "After my wedding I put on 8kg and could not shift it no matter what I tried. Raheel identified that my cortisol was through the roof from undereating and overtraining — the opposite of what I expected. He increased my calories, reduced my cardio, and within 8 weeks I had lost 7.2kg. I was eating MORE food and losing weight. Mind blown.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "Eoin McCarthy",
      duration: "24 weeks",
      quote:
        "I started coaching at 118kg. I am not going to pretend it was easy but Raheel was in my corner every single week. When I had bad weeks he did not judge — he just adjusted the plan and kept me moving forward. Six months later I am at 96kg. That is 22kg gone. I went from being out of breath tying my shoes to running 5K. This man changed my life.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "Natasha Byrne",
      duration: "12 weeks",
      quote:
        "I came to Raheel with a complicated history of disordered eating. He was so careful and sensitive about it from day one. No extreme diets, no food group elimination, just a slow and sustainable approach. In 12 weeks I lost 6kg but more importantly I repaired my relationship with food. I eat without guilt for the first time in a decade.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Liam Dunne",
      duration: "8 weeks",
      quote:
        "I am 55 and I assumed the coaching would not work for someone my age. Raheel told me age was not the barrier I thought it was — it was my approach that needed updating. He gave me a programme designed for recovery and joint health alongside fat loss. Eight weeks later: minus 8.4kg, 4 inches off my waist, and I feel twenty years younger.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "Amy Kavanagh",
      duration: "12 weeks",
      quote:
        "I was already in decent shape when I started coaching but I wanted to get stage-lean for a bikini competition. Raheel's prep plan was meticulous — every macro was calculated, every training session was programmed, every check-in photo was reviewed in detail. I placed second in my first ever show. Could not have done it without him.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Tom Flanagan",
      duration: "16 weeks",
      quote:
        "I run a restaurant and my hours are mental. I eat at weird times, I am on my feet all day, and my stress levels are through the roof. Raheel built a programme around my actual lifestyle instead of trying to force me into a cookie-cutter plan. Sixteen weeks later and I am down 13kg. The custom approach is what makes coaching different from just buying a plan.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Siobhan Murray",
      duration: "8 weeks",
      quote:
        "I lost 6kg with The Hub on my own and then hit a wall. Decided to invest in coaching to break through the plateau. Raheel immediately spotted that I needed a diet break to reset my metabolism. After two weeks of eating at maintenance, we restarted and the fat fell off again. Lost another 5.8kg in the remaining six weeks. Sometimes you need a professional eye.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Darren Kelly",
      duration: "12 weeks",
      quote:
        "I was the classic dad bod — 38 years old, three kids, zero time for the gym. Raheel designed home workouts that took 30 minutes and a nutrition plan that worked around family dinners. No special meals, no supplements, no nonsense. Twelve weeks later I had lost 9.5kg and I could see my abs for the first time since I was 25. My kids think I am Captain America now.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "Clodagh Hennessy",
      duration: "10 weeks",
      quote:
        "I went to Raheel because I wanted to lose weight for my holiday. He could have just given me a crash diet but instead he sat me down and explained why that would backfire. The programme he built was moderate and sustainable. I lost 7.1kg before the holiday and I did not regain a single kg afterwards because I actually learned how to eat properly.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Rob Keating",
      duration: "8 weeks",
      quote:
        "I have Type 2 diabetes and my doctor told me to lose weight or go on medication. I was terrified. Raheel worked with my GP to design a safe programme. In eight weeks my fasting blood sugar dropped from 7.8 to 5.9 mmol/L and I lost 7.3kg. My doctor could not believe the turnaround. Coaching literally saved my health.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "Hannah Duffy",
      duration: "12 weeks",
      quote:
        "Post-partum, I did not even recognise my own body. I was 16kg above my pre-pregnancy weight and emotionally I was in a dark place. Raheel was so understanding — the programme started gentle and built up gradually. Twelve weeks later I had lost 10kg and my confidence was back. He even adjusted the plan around breastfeeding so everything was safe.",
      category: "coaching",
      isFeatured: true,
    },
    {
      clientName: "Cian Gallagher",
      duration: "16 weeks",
      quote:
        "I played rugby for fifteen years and when I retired my weight ballooned. I went from 95kg of mostly muscle to 112kg with a beer belly. Raheel put me on a structured programme that used my athletic background to my advantage. Sixteen weeks and 14kg later, I am in better shape than my last season playing. The weekly check-ins and programme adjustments made all the difference.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Maria Costello",
      duration: "8 weeks",
      quote:
        "I am 44 and going through menopause. I was told by multiple people that losing weight during menopause was basically impossible. Raheel showed me the science behind it and designed a programme that accounted for my hormonal changes. Eight weeks in and I have lost 5.4kg and 3 inches off my waist. Impossible my foot.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Adam Quinn",
      duration: "12 weeks",
      quote:
        "I am a shift worker in a factory and my sleep pattern is a disaster. Every other coach I spoke to told me to just sleep more — as if I had not thought of that. Raheel actually worked with my rotating shifts and designed meal timing and training around my reality. Lost 10.2kg in 12 weeks and my energy on night shifts is worlds better.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Orla Doherty",
      duration: "10 weeks",
      quote:
        "I was terrified to start coaching because I thought I would be judged for how unfit I was. From the very first call, Raheel made me feel completely at ease. There was never any judgement, just genuine support and a clear plan. Ten weeks later I am 8kg lighter and I actually look forward to training. He turned something I dreaded into something I love.",
      category: "coaching",
      isFeatured: false,
    },
    {
      clientName: "Gavin Stack",
      duration: "24 weeks",
      quote:
        "I started at 130kg. I had sleep apnoea, high blood pressure, and my knees were in agony. Raheel took it one step at a time — we did not even talk about the gym for the first month, just focused on nutrition. Six months later I am at 108kg, my sleep apnoea is gone, my blood pressure is normal, and I can walk up stairs without stopping. This was the best investment I have ever made in myself.",
      category: "coaching",
      isFeatured: true,
    },
  ];

  for (let i = 0; i < testimonialsData.length; i++) {
    const t = testimonialsData[i];
    await prisma.testimonial.create({
      data: {
        clientName: t.clientName,
        duration: t.duration,
        quote: t.quote,
        category: t.category,
        isFeatured: t.isFeatured,
        displayOrder: i + 1,
        isPublished: true,
      },
    });
    console.log(`   ✅ ${t.clientName} (${t.category})`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. PAYMENT SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n💳 Creating payment settings...");

  await prisma.paymentSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      accountNumber: "0300-1234567",
      accountName: "Coach Raheel - Level Up",
      instructions:
        "Transfer the payment to the EasyPaisa account above and upload a screenshot of your transaction as proof of payment.",
      price: 79,
      currency: "EUR",
    },
  });

  console.log("   ✅ Payment settings configured");

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. SITE CONTENT
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n📝 Creating site content...");

  const aboutBio = `Raheel is a qualified Athletic Therapist (B.Sc Hons) and certified personal trainer with over a decade of experience in the health and fitness industry. His journey began on the pitch — working with athletes recovering from injury — before transitioning into body composition coaching, where he discovered his true passion: helping everyday people transform their physiques and their confidence.

Specialising in fat loss and body recomposition, Raheel takes a science-first approach to every client he works with. There are no fad diets, no detox teas, and no magic supplements in his programmes. Instead, he builds sustainable nutrition and training systems rooted in evidence-based principles — calorie balance, progressive overload, and behavioural psychology. The result is a method that does not just deliver short-term results but teaches clients how to maintain them for life.

Having helped hundreds of people across Ireland and internationally achieve their goals — from busy parents who thought they had no time, to office workers who had never set foot in a gym — Raheel understands that transformation is about far more than sets and reps. It is about understanding your habits, working with your lifestyle, and building the knowledge that empowers you to take control of your health on your own terms.`;

  const siteContentData: Record<string, string> = {
    hero_headline: "Your Body Transformation Starts Here",
    hero_subtitle:
      "Whether you need proven nutrition tools or personal coaching from Coach Raheel — Level Up has the system to get you lean, strong, and confident.",
    hub_price: "79",
    hub_old_price: "119",
    coaching_8week_price: "399",
    coaching_12week_price: "599",
    coaching_longterm_price: "149",
    about_heading: "Meet Coach Raheel",
    about_bio: aboutBio,
    social_youtube: "",
    social_instagram: "",
    social_facebook: "",
    social_tiktok: "",
    social_youtube_visible: "true",
    social_instagram_visible: "true",
    social_facebook_visible: "true",
    social_tiktok_visible: "false",
    section_testimonials_visible: "true",
    section_transformations_visible: "true",
    section_countdown_visible: "true",
    section_coaching_visible: "true",
    coaching_applications_open: "true",
  };

  for (const [key, value] of Object.entries(siteContentData)) {
    await prisma.siteContent.upsert({
      where: { contentKey: key },
      update: { contentValue: value },
      create: {
        contentKey: key,
        contentValue: value,
        contentType: "TEXT",
      },
    });
    console.log(`   ✅ ${key}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════════════════════════════════════

  console.log("\n🎉 Seeding complete!");
  console.log("   - 2 users (admin + demo)");
  console.log("   - 6 recipe categories");
  console.log("   - 5 dietary tags");
  console.log(`   - ${recipesData.length} recipes`);
  console.log(`   - ${restaurantsData.length} restaurant guides`);
  console.log(`   - ${testimonialsData.length} testimonials`);
  console.log("   - 1 payment settings record");
  console.log(`   - ${Object.keys(siteContentData).length} site content entries`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
