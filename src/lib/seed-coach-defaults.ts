/**
 * Seeds foundational data for a new coach account:
 * - 10 recipe categories (for dropdowns)
 * - 12 dietary tags
 * - 5 workout categories + 28 subcategories
 * - 85+ food items with macros
 *
 * Called from POST /api/super-admin/coaches during coach creation.
 * Does NOT seed recipes or workouts — coaches create their own.
 */

import { prisma } from "./db";

// ─── Recipe Categories ───────────────────────────────────────────────

const RECIPE_CATEGORIES = [
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

// ─── Dietary Tags ────────────────────────────────────────────────────

const DIETARY_TAGS = [
  "High-Protein", "Low-Carb", "Vegetarian", "Vegan",
  "Gluten-Free", "Dairy-Free", "Keto", "Halal",
  "Low-Fat", "Sugar-Free", "Paleo", "Nut-Free",
];

// ─── Workout Categories + Subcategories ──────────────────────────────

const WORKOUT_CATEGORIES = [
  { name: "Strength", slug: "strength", order: 1, subs: [
    "Upper Body", "Lower Body", "Full Body", "Core", "Back", "Chest", "Arms", "Shoulders", "Legs",
  ]},
  { name: "Cardio", slug: "cardio", order: 2, subs: [
    "HIIT", "Running", "Cycling", "Jump Rope", "Swimming", "Walking",
  ]},
  { name: "Flexibility", slug: "flexibility", order: 3, subs: [
    "Yoga", "Stretching", "Mobility", "Pilates",
  ]},
  { name: "Functional", slug: "functional", order: 4, subs: [
    "CrossFit", "Bodyweight", "Kettlebell", "Resistance Bands", "TRX",
  ]},
  { name: "Recovery", slug: "recovery", order: 5, subs: [
    "Foam Rolling", "Cool Down", "Active Recovery", "Meditation",
  ]},
];

// ─── Food Items (85+) ────────────────────────────────────────────────

interface FoodItemSeed {
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  servingSize: number;
  servingUnit: string;
  isVerified: boolean;
}

const FOOD_ITEMS: Omit<FoodItemSeed, "coachId">[] = [
  // Proteins
  { name: "Chicken Breast (cooked)", category: "Proteins", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Salmon (cooked)", category: "Proteins", caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Eggs (whole)", category: "Proteins", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Egg Whites", category: "Proteins", caloriesPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Turkey Breast", category: "Proteins", caloriesPer100g: 135, proteinPer100g: 30, carbsPer100g: 0, fatPer100g: 1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Lean Beef Mince (5% fat)", category: "Proteins", caloriesPer100g: 137, proteinPer100g: 21, carbsPer100g: 0, fatPer100g: 5, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Tuna (canned in water)", category: "Proteins", caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 0.8, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Cod (cooked)", category: "Proteins", caloriesPer100g: 105, proteinPer100g: 23, carbsPer100g: 0, fatPer100g: 0.9, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Prawns (cooked)", category: "Proteins", caloriesPer100g: 99, proteinPer100g: 24, carbsPer100g: 0.2, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Tofu (firm)", category: "Proteins", caloriesPer100g: 144, proteinPer100g: 17, carbsPer100g: 3, fatPer100g: 9, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Greek Yoghurt (0% fat)", category: "Proteins", caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Cottage Cheese", category: "Proteins", caloriesPer100g: 98, proteinPer100g: 11, carbsPer100g: 3.4, fatPer100g: 4.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Whey Protein Powder", category: "Proteins", caloriesPer100g: 120, proteinPer100g: 24, carbsPer100g: 3, fatPer100g: 1.5, fiberPer100g: 0, servingSize: 30, servingUnit: "g", isVerified: true },
  { name: "Lamb Chops (lean)", category: "Proteins", caloriesPer100g: 194, proteinPer100g: 25, carbsPer100g: 0, fatPer100g: 10, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Pork Tenderloin", category: "Proteins", caloriesPer100g: 143, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 3.5, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  // Carbs
  { name: "White Rice (cooked)", category: "Carbs", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Brown Rice (cooked)", category: "Carbs", caloriesPer100g: 123, proteinPer100g: 2.7, carbsPer100g: 26, fatPer100g: 1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Sweet Potato (baked)", category: "Carbs", caloriesPer100g: 90, proteinPer100g: 2, carbsPer100g: 21, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "White Potato (baked)", category: "Carbs", caloriesPer100g: 93, proteinPer100g: 2.5, carbsPer100g: 21, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Oats (dry)", category: "Carbs", caloriesPer100g: 389, proteinPer100g: 17, carbsPer100g: 66, fatPer100g: 7, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Wholemeal Bread", category: "Carbs", caloriesPer100g: 247, proteinPer100g: 13, carbsPer100g: 41, fatPer100g: 3.4, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "White Bread", category: "Carbs", caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Pasta (cooked)", category: "Carbs", caloriesPer100g: 131, proteinPer100g: 5, carbsPer100g: 25, fatPer100g: 1.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Quinoa (cooked)", category: "Carbs", caloriesPer100g: 120, proteinPer100g: 4.4, carbsPer100g: 21, fatPer100g: 1.9, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Couscous (cooked)", category: "Carbs", caloriesPer100g: 112, proteinPer100g: 3.8, carbsPer100g: 23, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Tortilla Wrap (flour)", category: "Carbs", caloriesPer100g: 312, proteinPer100g: 8, carbsPer100g: 52, fatPer100g: 8, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Basmati Rice (cooked)", category: "Carbs", caloriesPer100g: 121, proteinPer100g: 3.5, carbsPer100g: 25, fatPer100g: 0.4, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  // Dairy
  { name: "Whole Milk", category: "Dairy", caloriesPer100g: 61, proteinPer100g: 3.2, carbsPer100g: 4.8, fatPer100g: 3.3, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Semi-Skimmed Milk", category: "Dairy", caloriesPer100g: 46, proteinPer100g: 3.4, carbsPer100g: 4.7, fatPer100g: 1.7, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Skimmed Milk", category: "Dairy", caloriesPer100g: 35, proteinPer100g: 3.4, carbsPer100g: 5, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Cheddar Cheese", category: "Dairy", caloriesPer100g: 403, proteinPer100g: 25, carbsPer100g: 1.3, fatPer100g: 33, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Mozzarella (light)", category: "Dairy", caloriesPer100g: 254, proteinPer100g: 24, carbsPer100g: 2.8, fatPer100g: 16, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Butter", category: "Dairy", caloriesPer100g: 717, proteinPer100g: 0.9, carbsPer100g: 0.1, fatPer100g: 81, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Cream Cheese (light)", category: "Dairy", caloriesPer100g: 195, proteinPer100g: 7.5, carbsPer100g: 5, fatPer100g: 16, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  // Fruits
  { name: "Banana", category: "Fruits", caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Apple", category: "Fruits", caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Blueberries", category: "Fruits", caloriesPer100g: 57, proteinPer100g: 0.7, carbsPer100g: 14, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Strawberries", category: "Fruits", caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 8, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Orange", category: "Fruits", caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Mango", category: "Fruits", caloriesPer100g: 60, proteinPer100g: 0.8, carbsPer100g: 15, fatPer100g: 0.4, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Pineapple", category: "Fruits", caloriesPer100g: 50, proteinPer100g: 0.5, carbsPer100g: 13, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Grapes", category: "Fruits", caloriesPer100g: 69, proteinPer100g: 0.7, carbsPer100g: 18, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Avocado", category: "Fruits", caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Watermelon", category: "Fruits", caloriesPer100g: 30, proteinPer100g: 0.6, carbsPer100g: 8, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  // Vegetables
  { name: "Broccoli", category: "Vegetables", caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Spinach", category: "Vegetables", caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Kale", category: "Vegetables", caloriesPer100g: 49, proteinPer100g: 4.3, carbsPer100g: 9, fatPer100g: 0.9, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Bell Pepper", category: "Vegetables", caloriesPer100g: 31, proteinPer100g: 1, carbsPer100g: 6, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Carrot", category: "Vegetables", caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Cucumber", category: "Vegetables", caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Tomato", category: "Vegetables", caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Onion", category: "Vegetables", caloriesPer100g: 40, proteinPer100g: 1.1, carbsPer100g: 9, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Mushrooms", category: "Vegetables", caloriesPer100g: 22, proteinPer100g: 3.1, carbsPer100g: 3.3, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Courgette (Zucchini)", category: "Vegetables", caloriesPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3.1, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Green Beans", category: "Vegetables", caloriesPer100g: 31, proteinPer100g: 1.8, carbsPer100g: 7, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Cauliflower", category: "Vegetables", caloriesPer100g: 25, proteinPer100g: 1.9, carbsPer100g: 5, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Asparagus", category: "Vegetables", caloriesPer100g: 20, proteinPer100g: 2.2, carbsPer100g: 3.9, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Lettuce (Romaine)", category: "Vegetables", caloriesPer100g: 17, proteinPer100g: 1.2, carbsPer100g: 3.3, fatPer100g: 0.3, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Sweetcorn", category: "Vegetables", caloriesPer100g: 86, proteinPer100g: 3.3, carbsPer100g: 19, fatPer100g: 1.2, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  // Fats & Oils
  { name: "Olive Oil", category: "Fats & Oils", caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Coconut Oil", category: "Fats & Oils", caloriesPer100g: 862, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Peanut Butter", category: "Fats & Oils", caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Almond Butter", category: "Fats & Oils", caloriesPer100g: 614, proteinPer100g: 21, carbsPer100g: 19, fatPer100g: 56, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Almonds", category: "Fats & Oils", caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Walnuts", category: "Fats & Oils", caloriesPer100g: 654, proteinPer100g: 15, carbsPer100g: 14, fatPer100g: 65, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Cashews", category: "Fats & Oils", caloriesPer100g: 553, proteinPer100g: 18, carbsPer100g: 30, fatPer100g: 44, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Chia Seeds", category: "Fats & Oils", caloriesPer100g: 486, proteinPer100g: 17, carbsPer100g: 42, fatPer100g: 31, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Flaxseeds", category: "Fats & Oils", caloriesPer100g: 534, proteinPer100g: 18, carbsPer100g: 29, fatPer100g: 42, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Dark Chocolate (70%)", category: "Fats & Oils", caloriesPer100g: 598, proteinPer100g: 8, carbsPer100g: 46, fatPer100g: 43, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  // Grains & Legumes
  { name: "Chickpeas (cooked)", category: "Grains & Legumes", caloriesPer100g: 164, proteinPer100g: 9, carbsPer100g: 27, fatPer100g: 2.6, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Black Beans (cooked)", category: "Grains & Legumes", caloriesPer100g: 132, proteinPer100g: 8.9, carbsPer100g: 24, fatPer100g: 0.5, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Lentils (cooked)", category: "Grains & Legumes", caloriesPer100g: 116, proteinPer100g: 9, carbsPer100g: 20, fatPer100g: 0.4, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Kidney Beans (cooked)", category: "Grains & Legumes", caloriesPer100g: 127, proteinPer100g: 9, carbsPer100g: 23, fatPer100g: 0.5, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Hummus", category: "Grains & Legumes", caloriesPer100g: 166, proteinPer100g: 8, carbsPer100g: 14, fatPer100g: 10, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  // Beverages
  { name: "Orange Juice", category: "Beverages", caloriesPer100g: 45, proteinPer100g: 0.7, carbsPer100g: 10, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Coconut Water", category: "Beverages", caloriesPer100g: 19, proteinPer100g: 0.7, carbsPer100g: 3.7, fatPer100g: 0.2, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Almond Milk (unsweetened)", category: "Beverages", caloriesPer100g: 13, proteinPer100g: 0.4, carbsPer100g: 0.3, fatPer100g: 1.1, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Oat Milk", category: "Beverages", caloriesPer100g: 43, proteinPer100g: 0.4, carbsPer100g: 7, fatPer100g: 1.5, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  // Snacks & Condiments
  { name: "Honey", category: "Snacks & Condiments", caloriesPer100g: 304, proteinPer100g: 0.3, carbsPer100g: 82, fatPer100g: 0, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Maple Syrup", category: "Snacks & Condiments", caloriesPer100g: 260, proteinPer100g: 0, carbsPer100g: 67, fatPer100g: 0, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Rice Cakes", category: "Snacks & Condiments", caloriesPer100g: 387, proteinPer100g: 8, carbsPer100g: 81, fatPer100g: 2.8, fiberPer100g: 0, servingSize: 100, servingUnit: "g", isVerified: true },
  { name: "Protein Bar (avg)", category: "Snacks & Condiments", caloriesPer100g: 350, proteinPer100g: 20, carbsPer100g: 35, fatPer100g: 12, fiberPer100g: 0, servingSize: 60, servingUnit: "g", isVerified: true },
  { name: "Soy Sauce", category: "Snacks & Condiments", caloriesPer100g: 53, proteinPer100g: 8, carbsPer100g: 5, fatPer100g: 0, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Hot Sauce", category: "Snacks & Condiments", caloriesPer100g: 11, proteinPer100g: 0.3, carbsPer100g: 2, fatPer100g: 0.1, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
  { name: "Balsamic Vinegar", category: "Snacks & Condiments", caloriesPer100g: 88, proteinPer100g: 0.5, carbsPer100g: 17, fatPer100g: 0, fiberPer100g: 0, servingSize: 100, servingUnit: "ml", isVerified: true },
];

// ─── Main seed function ──────────────────────────────────────────────

export async function seedCoachDefaults(coachId: string): Promise<void> {
  // 1. Recipe categories
  await prisma.recipeCategory.createMany({
    data: RECIPE_CATEGORIES.map((c) => ({ ...c, coachId })),
    skipDuplicates: true,
  });

  // 2. Dietary tags
  await prisma.dietaryTag.createMany({
    data: DIETARY_TAGS.map((name) => ({
      name,
      slug: name.toLowerCase(),
      coachId,
    })),
    skipDuplicates: true,
  });

  // 3. Workout categories + subcategories (need IDs for FK)
  for (const cat of WORKOUT_CATEGORIES) {
    const created = await prisma.workoutCategory.create({
      data: {
        name: cat.name,
        slug: cat.slug,
        displayOrder: cat.order,
        coachId,
      },
    });
    await prisma.workoutSubcategory.createMany({
      data: cat.subs.map((sub) => ({
        name: sub,
        slug: sub.toLowerCase().replace(/\s+/g, "-"),
        categoryId: created.id,
        coachId,
      })),
    });
  }

  // 4. Food items
  await prisma.foodItem.createMany({
    data: FOOD_ITEMS.map((f) => ({ ...f, coachId })),
    skipDuplicates: true,
  });
}
