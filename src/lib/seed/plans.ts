/**
 * 3 starter plan templates seeded for every new coach.
 *
 * Calibrated for the new 22-workout HD-video library (see
 * `workout-picks.ts`). Every training day has 3-5 exercises; rest days
 * have 4 meals and no exercises. No empty days.
 *
 * Plans:
 *   1. Upper / Lower Split        (4 weeks, 3 days/week, M/W/F)
 *   2. Arm Specialization         (4 weeks, 3 days/week, M/W/F)
 *   3. 8-Week Foundation          (8 weeks, 3 days/week, M/W/F)
 *
 * Workout slugs reference `WORKOUT_PICKS[].slug` exactly; recipe slugs
 * reference `SEED_RECIPES[].slug` exactly. Both are validated at module
 * load below.
 */

import { WORKOUT_PICKS } from "./workout-picks";
import { SEED_RECIPES } from "./recipes";

export interface ExercisePrescription {
  /** Slug — must match a `WorkoutPick.slug` in WORKOUT_PICKS. */
  workoutSlug: string;
  sets?: number;
  repsLow?: number;
  repsHigh?: number;
  durationSeconds?: number;
  restSeconds?: number;
  weightKg?: number;
  notes?: string;
}

export interface TrainingDayTemplate {
  label: string;
  exercises: ExercisePrescription[];
  notes?: string;
}

export interface MealSlot {
  mealType: "Breakfast" | "Lunch" | "Snack" | "Dinner";
  recipeSlug: string;
  servings?: number;
}

export interface PlanDefinition {
  slug: string;
  name: string;
  description: string;
  type: "combined" | "workout" | "diet";
  durationWeeks: number;
  daysPerWeek: number;
  /** dayOfWeek values (1-7, Mon=1) that are training days. */
  trainingDayNumbers: number[];
  trainingDays: TrainingDayTemplate[];
  trainingDayMeals: MealSlot[];
  restDayMeals: MealSlot[];
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

// ─── Plan: Upper / Lower Split ──────────────────────────────────────

const PLAN_UPPER_LOWER: PlanDefinition = {
  slug: "upper-lower-split",
  name: "Upper / Lower Split",
  description:
    "4-week intro program rotating Upper / Lower-Core / Full-Body days. Every session is 3-4 exercises drawn from the bench, lunge, hip thrust and curl variations in your library.",
  type: "combined",
  durationWeeks: 4,
  daysPerWeek: 3,
  trainingDayNumbers: [1, 3, 5],
  trainingDays: [
    {
      label: "Upper",
      exercises: [
        { workoutSlug: "barbell-incline-bench-press-medium-grip", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "barbell-curl", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "hammer-curls", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "3-4-sit-up", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 45 },
      ],
    },
    {
      label: "Lower + Core",
      exercises: [
        { workoutSlug: "barbell-lunge", sets: 4, repsLow: 10, repsHigh: 12, restSeconds: 90, notes: "Each leg" },
        { workoutSlug: "barbell-hip-thrust", sets: 4, repsLow: 10, repsHigh: 12, restSeconds: 90 },
        { workoutSlug: "3-4-sit-up", sets: 4, repsLow: 15, repsHigh: 20, restSeconds: 45 },
      ],
    },
    {
      label: "Full Body",
      exercises: [
        { workoutSlug: "barbell-incline-bench-press-medium-grip", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "barbell-lunge", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "dumbbell-bicep-curl", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "3-4-sit-up", sets: 3, repsLow: 15, repsHigh: 20, restSeconds: 45 },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "protein-oatmeal-pancakes" },
    { mealType: "Lunch", recipeSlug: "grilled-chicken-salad" },
    { mealType: "Snack", recipeSlug: "protein-shake" },
    { mealType: "Dinner", recipeSlug: "grilled-salmon-veg" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "greek-yogurt-parfait" },
    { mealType: "Lunch", recipeSlug: "chickpea-salad-bowl" },
    { mealType: "Snack", recipeSlug: "apple-peanut-butter" },
    { mealType: "Dinner", recipeSlug: "baked-cod-veg" },
  ],
  calorieTarget: 1900,
  proteinTarget: 150,
  carbsTarget: 200,
  fatTarget: 60,
};

// ─── Plan: Arm Specialization ───────────────────────────────────────

const PLAN_ARM_SPECIALIZATION: PlanDefinition = {
  slug: "arm-specialization",
  name: "Arm Specialization",
  description:
    "4-week arms-focused program emphasising biceps and triceps variations alongside legs and chest support work.",
  type: "combined",
  durationWeeks: 4,
  daysPerWeek: 3,
  trainingDayNumbers: [1, 3, 5],
  trainingDays: [
    {
      label: "Heavy Arms",
      exercises: [
        { workoutSlug: "barbell-curl", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 75 },
        { workoutSlug: "dumbbell-bicep-curl", sets: 4, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "hammer-curls", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "dumbbell-tricep-extension", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
      ],
    },
    {
      label: "Legs + Core",
      exercises: [
        { workoutSlug: "barbell-lunge", sets: 4, repsLow: 10, repsHigh: 12, restSeconds: 90, notes: "Each leg" },
        { workoutSlug: "barbell-hip-thrust", sets: 4, repsLow: 10, repsHigh: 12, restSeconds: 90 },
        { workoutSlug: "3-4-sit-up", sets: 4, repsLow: 15, repsHigh: 20, restSeconds: 45 },
      ],
    },
    {
      label: "Push + Triceps",
      exercises: [
        { workoutSlug: "barbell-incline-bench-press-medium-grip", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "tricep-dips", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "cable-tricep-extension", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 60 },
        { workoutSlug: "hammer-curls", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 60 },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "anda-paratha" },
    { mealType: "Lunch", recipeSlug: "chicken-karahi" },
    { mealType: "Snack", recipeSlug: "lassi-with-whey" },
    { mealType: "Dinner", recipeSlug: "tandoori-chicken" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "masala-omelette-toast" },
    { mealType: "Lunch", recipeSlug: "daal-chawal" },
    { mealType: "Snack", recipeSlug: "rice-cakes-cottage-cheese" },
    { mealType: "Dinner", recipeSlug: "chicken-pulao" },
  ],
  calorieTarget: 2200,
  proteinTarget: 170,
  carbsTarget: 240,
  fatTarget: 70,
};

// ─── Plan: 8-Week Foundation ────────────────────────────────────────

const PLAN_FOUNDATION: PlanDefinition = {
  slug: "8-week-foundation",
  name: "8-Week Foundation",
  description:
    "8-week strength + hypertrophy progression. Three training days a week rotating Strength / Hypertrophy / Compound — every session has 3-5 exercises.",
  type: "combined",
  durationWeeks: 8,
  daysPerWeek: 3,
  trainingDayNumbers: [1, 3, 5],
  trainingDays: [
    {
      label: "Strength",
      exercises: [
        { workoutSlug: "barbell-incline-bench-press-medium-grip", sets: 4, repsLow: 5, repsHigh: 8, restSeconds: 120 },
        { workoutSlug: "barbell-front-squat", sets: 4, repsLow: 5, repsHigh: 8, restSeconds: 120 },
        { workoutSlug: "pull-ups", sets: 4, repsLow: 5, repsHigh: 8, restSeconds: 120 },
        { workoutSlug: "3-4-sit-up", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 45 },
      ],
    },
    {
      label: "Hypertrophy",
      exercises: [
        { workoutSlug: "dumbbell-incline-bench-press", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "one-arm-cable-row", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60, notes: "Each side" },
        { workoutSlug: "leg-press", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 90 },
        { workoutSlug: "dumbbell-lateral-raise", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 60 },
        { workoutSlug: "dumbbell-bicep-curl", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
      ],
    },
    {
      label: "Compound + Accessories",
      exercises: [
        { workoutSlug: "dumbbell-bench-press", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "barbell-shrugs", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "lying-leg-curl", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "cable-face-pull", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 60 },
        { workoutSlug: "3-4-sit-up", sets: 3, repsLow: 15, repsHigh: 20, restSeconds: 45 },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "shami-kebab-paratha" },
    { mealType: "Lunch", recipeSlug: "chicken-biryani-portion" },
    { mealType: "Snack", recipeSlug: "protein-shake" },
    { mealType: "Dinner", recipeSlug: "chicken-karahi" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "oats-with-banana-honey" },
    { mealType: "Lunch", recipeSlug: "lentil-soup" },
    { mealType: "Snack", recipeSlug: "fruit-yogurt-bowl" },
    { mealType: "Dinner", recipeSlug: "fish-curry-rice" },
  ],
  calorieTarget: 2000,
  proteinTarget: 160,
  carbsTarget: 210,
  fatTarget: 65,
};

// ─── Exports & module-load validation ───────────────────────────────

export const SEED_PLANS: PlanDefinition[] = [
  PLAN_UPPER_LOWER,
  PLAN_ARM_SPECIALIZATION,
  PLAN_FOUNDATION,
];

if (SEED_PLANS.length !== 3) {
  throw new Error(`SEED_PLANS must total 3 (got ${SEED_PLANS.length})`);
}

const VALID_WORKOUT_SLUGS = new Set(WORKOUT_PICKS.map((p) => p.slug));
const VALID_RECIPE_SLUGS = new Set(SEED_RECIPES.map((r) => r.slug));

for (const plan of SEED_PLANS) {
  for (const td of plan.trainingDays) {
    if (td.exercises.length < 3 || td.exercises.length > 8) {
      throw new Error(
        `Plan "${plan.slug}" day "${td.label}" has ${td.exercises.length} ` +
          `exercises — expected 3-8.`,
      );
    }
    for (const ex of td.exercises) {
      if (!VALID_WORKOUT_SLUGS.has(ex.workoutSlug)) {
        throw new Error(
          `Plan "${plan.slug}" day "${td.label}" references unknown workout slug "${ex.workoutSlug}"`,
        );
      }
    }
  }
  for (const slot of [...plan.trainingDayMeals, ...plan.restDayMeals]) {
    if (!VALID_RECIPE_SLUGS.has(slot.recipeSlug)) {
      throw new Error(
        `Plan "${plan.slug}" references unknown recipe slug "${slot.recipeSlug}"`,
      );
    }
  }
}
