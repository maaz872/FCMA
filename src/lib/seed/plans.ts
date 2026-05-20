/**
 * 6 starter plan templates seeded for every new coach.
 *
 * Each plan is laid out as a small program: a list of training-day
 * templates that get cycled across `daysPerWeek` training days each
 * week, plus a list of meal-slots per day. The seeder instantiates
 * concrete `PlanTemplateDay` + `PlanExercise` + `PlanDayMeal` rows
 * keyed by (week, dayOfWeek).
 *
 * Exercise prescriptions reference workouts by slug — those slugs
 * exist because every coach gets the 50-exercise pool from
 * WORKOUT_PICKS seeded first. Recipes are likewise referenced by
 * slug from SEED_RECIPES.
 *
 * Per spec §6: each training day has 4-8 exercises; each day has
 * 3-5 meals from the seeded recipes; durations and days/week match
 * the spec table exactly.
 */

import { WORKOUT_PICKS } from "./workout-picks";
import { SEED_RECIPES } from "./recipes";

export interface ExercisePrescription {
  /** kebab-cased slug of the workout (matches `Workout.slug` after seeding). */
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
  /** Human-readable label, e.g. "Push", "Pull", "Full Body". */
  label: string;
  /** 4-8 exercise prescriptions per spec §6. */
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
  /** Number of training days per week (the others are rest days, still with meals). */
  daysPerWeek: number;
  /** 0-indexed dayOfWeek values (1-7) that are training days. */
  trainingDayNumbers: number[];
  /** Cycle through these training-day templates one per training day. */
  trainingDays: TrainingDayTemplate[];
  /** Meals on training days. */
  trainingDayMeals: MealSlot[];
  /** Meals on rest days. */
  restDayMeals: MealSlot[];
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

// ─── Helpers for cross-validation ──────────────────────────────────

/** Slugify the library-derived workout name the same way the seeder will. */
export function workoutSlugFromLibraryId(libraryId: string): string {
  // The seeder turns "Barbell_Squat" into "barbell-squat" via the
  // existing convention (replace non-alnum with hyphens, lowercase).
  return libraryId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const VALID_WORKOUT_SLUGS = new Set(
  WORKOUT_PICKS.map((p) => workoutSlugFromLibraryId(p.libraryId))
);

const VALID_RECIPE_SLUGS = new Set(SEED_RECIPES.map((r) => r.slug));

// ─── Plan: Beginner Fat Loss (4 weeks, 3 days/week, M/W/F) ─────────

const PLAN_BEGINNER_FAT_LOSS: PlanDefinition = {
  slug: "beginner-fat-loss",
  name: "Beginner Fat Loss",
  description: "4-week beginner-friendly fat-loss program — 3 full-body sessions a week, moderate calorie deficit.",
  type: "combined",
  durationWeeks: 4,
  daysPerWeek: 3,
  trainingDayNumbers: [1, 3, 5], // Mon, Wed, Fri
  trainingDays: [
    {
      label: "Full Body A",
      exercises: [
        { workoutSlug: "goblet-squat", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "pushups", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "bent-over-two-dumbbell-row", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "plank", sets: 3, durationSeconds: 30, restSeconds: 45 },
        { workoutSlug: "mountain-climbers", sets: 3, durationSeconds: 30, restSeconds: 45, notes: "Steady tempo" },
      ],
    },
    {
      label: "Full Body B",
      exercises: [
        { workoutSlug: "bodyweight-walking-lunge", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "dumbbell-one-arm-shoulder-press", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "single-leg-glute-bridge", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 45 },
        { workoutSlug: "russian-twist", sets: 3, repsLow: 15, repsHigh: 20, restSeconds: 45 },
        { workoutSlug: "bench-jump", sets: 3, durationSeconds: 30, restSeconds: 60 },
      ],
    },
    {
      label: "Full Body C",
      exercises: [
        { workoutSlug: "step-up-with-knee-raise", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "dumbbell-bicep-curl", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 45 },
        { workoutSlug: "bench-dips", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 45 },
        { workoutSlug: "reverse-crunch", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 45 },
        { workoutSlug: "mountain-climbers", sets: 3, durationSeconds: 40, restSeconds: 45 },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "greek-yogurt-parfait" },
    { mealType: "Lunch", recipeSlug: "grilled-chicken-salad" },
    { mealType: "Snack", recipeSlug: "protein-shake" },
    { mealType: "Dinner", recipeSlug: "baked-cod-veg" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "oats-with-banana-honey" },
    { mealType: "Lunch", recipeSlug: "chickpea-salad-bowl" },
    { mealType: "Snack", recipeSlug: "apple-peanut-butter" },
    { mealType: "Dinner", recipeSlug: "saag-roti" },
  ],
  calorieTarget: 1700,
  proteinTarget: 140,
  carbsTarget: 170,
  fatTarget: 55,
};

// ─── Plan: Intermediate Fat Loss (8 weeks, 4 days/week, M/T/Th/F) ──

const PLAN_INTERMEDIATE_FAT_LOSS: PlanDefinition = {
  slug: "intermediate-fat-loss",
  name: "Intermediate Fat Loss",
  description: "8-week 4-day push/pull/legs/full-body split with steady calorie deficit and cardio finishers.",
  type: "combined",
  durationWeeks: 8,
  daysPerWeek: 4,
  trainingDayNumbers: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
  trainingDays: [
    {
      label: "Push",
      exercises: [
        { workoutSlug: "barbell-bench-press-medium-grip", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "barbell-shoulder-press", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "cable-crossover", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "dips-triceps-version", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "mountain-climbers", sets: 3, durationSeconds: 45, restSeconds: 45, notes: "Cardio finisher" },
      ],
    },
    {
      label: "Pull",
      exercises: [
        { workoutSlug: "bent-over-barbell-row", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "chin-up", sets: 4, repsLow: 6, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "bent-over-two-dumbbell-row", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "dumbbell-bicep-curl", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "hammer-curls", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
      ],
    },
    {
      label: "Legs",
      exercises: [
        { workoutSlug: "barbell-squat", sets: 4, repsLow: 6, repsHigh: 10, restSeconds: 120 },
        { workoutSlug: "romanian-deadlift", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "barbell-lunge", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "barbell-hip-thrust", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "calf-press", sets: 4, repsLow: 12, repsHigh: 15, restSeconds: 60 },
      ],
    },
    {
      label: "Full Body + Cardio",
      exercises: [
        { workoutSlug: "kettlebell-thruster", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 75 },
        { workoutSlug: "farmers-walk", sets: 3, durationSeconds: 45, restSeconds: 60, notes: "Use heavy dumbbells" },
        { workoutSlug: "plank", sets: 3, durationSeconds: 45, restSeconds: 45 },
        { workoutSlug: "russian-twist", sets: 3, repsLow: 20, repsHigh: 25, restSeconds: 45 },
        { workoutSlug: "bicycling-stationary", sets: 1, durationSeconds: 900, restSeconds: 0, notes: "15-min moderate steady-state" },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "protein-oatmeal-pancakes" },
    { mealType: "Lunch", recipeSlug: "chicken-karahi" },
    { mealType: "Snack", recipeSlug: "protein-shake" },
    { mealType: "Dinner", recipeSlug: "grilled-salmon-veg" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "egg-bhurji-roti" },
    { mealType: "Lunch", recipeSlug: "lentil-soup" },
    { mealType: "Snack", recipeSlug: "fruit-yogurt-bowl" },
    { mealType: "Dinner", recipeSlug: "shrimp-stir-fry" },
  ],
  calorieTarget: 1900,
  proteinTarget: 170,
  carbsTarget: 180,
  fatTarget: 60,
};

// ─── Plan: Beginner Muscle Gain (8 weeks, 3 days/week, M/W/F) ──────

const PLAN_BEGINNER_MUSCLE_GAIN: PlanDefinition = {
  slug: "beginner-muscle-gain",
  name: "Beginner Muscle Gain",
  description: "8-week 3-day full-body program built around compound lifts, slight calorie surplus.",
  type: "combined",
  durationWeeks: 8,
  daysPerWeek: 3,
  trainingDayNumbers: [1, 3, 5],
  trainingDays: [
    {
      label: "Full Body A — Squat focus",
      exercises: [
        { workoutSlug: "barbell-squat", sets: 4, repsLow: 6, repsHigh: 8, restSeconds: 120 },
        { workoutSlug: "barbell-bench-press-medium-grip", sets: 4, repsLow: 6, repsHigh: 8, restSeconds: 120 },
        { workoutSlug: "bent-over-barbell-row", sets: 4, repsLow: 6, repsHigh: 8, restSeconds: 90 },
        { workoutSlug: "plank", sets: 3, durationSeconds: 45, restSeconds: 45 },
      ],
    },
    {
      label: "Full Body B — Deadlift focus",
      exercises: [
        { workoutSlug: "barbell-deadlift", sets: 3, repsLow: 5, repsHigh: 6, restSeconds: 150 },
        { workoutSlug: "barbell-shoulder-press", sets: 4, repsLow: 6, repsHigh: 8, restSeconds: 90 },
        { workoutSlug: "chin-up", sets: 4, repsLow: 5, repsHigh: 8, restSeconds: 90 },
        { workoutSlug: "barbell-curl", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 60 },
      ],
    },
    {
      label: "Full Body C — Hypertrophy",
      exercises: [
        { workoutSlug: "barbell-incline-bench-press-medium-grip", sets: 4, repsLow: 8, repsHigh: 10, restSeconds: 75 },
        { workoutSlug: "barbell-lunge", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 75 },
        { workoutSlug: "bent-over-two-dumbbell-row", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 75 },
        { workoutSlug: "barbell-hip-thrust", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "hanging-leg-raise", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 60 },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "anda-paratha" },
    { mealType: "Lunch", recipeSlug: "chicken-biryani-portion" },
    { mealType: "Snack", recipeSlug: "protein-shake" },
    { mealType: "Dinner", recipeSlug: "tandoori-chicken" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "masala-omelette-toast" },
    { mealType: "Lunch", recipeSlug: "daal-chawal" },
    { mealType: "Snack", recipeSlug: "rice-cakes-cottage-cheese" },
    { mealType: "Dinner", recipeSlug: "chicken-pulao" },
  ],
  calorieTarget: 2400,
  proteinTarget: 170,
  carbsTarget: 280,
  fatTarget: 75,
};

// ─── Plan: Intermediate Muscle Gain (12 weeks, 4 days/week) ────────

const PLAN_INTERMEDIATE_MUSCLE_GAIN: PlanDefinition = {
  slug: "intermediate-muscle-gain",
  name: "Intermediate Muscle Gain",
  description: "12-week upper/lower hypertrophy split, 4 days/week with progressive overload.",
  type: "combined",
  durationWeeks: 12,
  daysPerWeek: 4,
  trainingDayNumbers: [1, 2, 4, 5],
  trainingDays: [
    {
      label: "Upper Heavy",
      exercises: [
        { workoutSlug: "barbell-bench-press-medium-grip", sets: 4, repsLow: 5, repsHigh: 8, restSeconds: 120 },
        { workoutSlug: "bent-over-barbell-row", sets: 4, repsLow: 5, repsHigh: 8, restSeconds: 120 },
        { workoutSlug: "barbell-shoulder-press", sets: 4, repsLow: 6, repsHigh: 8, restSeconds: 90 },
        { workoutSlug: "chin-up", sets: 4, repsLow: 6, repsHigh: 8, restSeconds: 90 },
        { workoutSlug: "barbell-curl", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 60 },
        { workoutSlug: "dips-triceps-version", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 60 },
      ],
    },
    {
      label: "Lower Heavy",
      exercises: [
        { workoutSlug: "barbell-squat", sets: 5, repsLow: 5, repsHigh: 6, restSeconds: 150 },
        { workoutSlug: "romanian-deadlift", sets: 4, repsLow: 6, repsHigh: 8, restSeconds: 120 },
        { workoutSlug: "barbell-lunge", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "barbell-hip-thrust", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 75 },
        { workoutSlug: "calf-press", sets: 4, repsLow: 10, repsHigh: 12, restSeconds: 60 },
      ],
    },
    {
      label: "Upper Hypertrophy",
      exercises: [
        { workoutSlug: "barbell-incline-bench-press-medium-grip", sets: 4, repsLow: 8, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "bent-over-two-dumbbell-row", sets: 4, repsLow: 8, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "arnold-dumbbell-press", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "cable-crossover", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 60 },
        { workoutSlug: "hammer-curls", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "body-tricep-press", sets: 3, repsLow: 10, repsHigh: 15, restSeconds: 60 },
        { workoutSlug: "cable-seated-lateral-raise", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 60 },
      ],
    },
    {
      label: "Lower Hypertrophy",
      exercises: [
        { workoutSlug: "barbell-full-squat", sets: 4, repsLow: 8, repsHigh: 12, restSeconds: 90 },
        { workoutSlug: "dumbbell-step-ups", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "single-leg-glute-bridge", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "goblet-squat", sets: 3, repsLow: 10, repsHigh: 15, restSeconds: 75 },
        { workoutSlug: "hanging-leg-raise", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "calf-press", sets: 4, repsLow: 12, repsHigh: 15, restSeconds: 60 },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "shami-kebab-paratha" },
    { mealType: "Lunch", recipeSlug: "chicken-tikka-roti" },
    { mealType: "Snack", recipeSlug: "lassi-with-whey" },
    { mealType: "Dinner", recipeSlug: "lamb-karahi" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "smoothie-bowl" },
    { mealType: "Lunch", recipeSlug: "chana-pulao" },
    { mealType: "Snack", recipeSlug: "chicken-shami-kebab" },
    { mealType: "Dinner", recipeSlug: "veg-biryani-portion" },
  ],
  calorieTarget: 2700,
  proteinTarget: 200,
  carbsTarget: 320,
  fatTarget: 80,
};

// ─── Plan: Home Workout No Equipment (4 weeks, 5 days/week) ────────

const PLAN_HOME_WORKOUT: PlanDefinition = {
  slug: "home-workout-no-equipment",
  name: "Home Workout (No Equipment)",
  description: "4-week 5-day bodyweight program — designed for clients without gym access.",
  type: "combined",
  durationWeeks: 4,
  daysPerWeek: 5,
  trainingDayNumbers: [1, 2, 3, 4, 5], // Mon-Fri
  trainingDays: [
    {
      label: "Upper Bodyweight",
      exercises: [
        { workoutSlug: "pushups", sets: 4, repsLow: 8, repsHigh: 15, restSeconds: 60 },
        { workoutSlug: "decline-push-up", sets: 3, repsLow: 6, repsHigh: 10, restSeconds: 60 },
        { workoutSlug: "wide-grip-rear-pull-up", sets: 3, repsLow: 4, repsHigh: 8, restSeconds: 90, notes: "Use a doorway pull-up bar" },
        { workoutSlug: "bench-dips", sets: 3, repsLow: 10, repsHigh: 15, restSeconds: 60 },
      ],
    },
    {
      label: "Lower Bodyweight",
      exercises: [
        { workoutSlug: "freehand-jump-squat", sets: 4, repsLow: 10, repsHigh: 15, restSeconds: 60 },
        { workoutSlug: "bodyweight-walking-lunge", sets: 3, repsLow: 12, repsHigh: 16, restSeconds: 60 },
        { workoutSlug: "single-leg-glute-bridge", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 45 },
        { workoutSlug: "step-up-with-knee-raise", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
      ],
    },
    {
      label: "Core",
      exercises: [
        { workoutSlug: "plank", sets: 3, durationSeconds: 45, restSeconds: 45 },
        { workoutSlug: "russian-twist", sets: 3, repsLow: 20, repsHigh: 30, restSeconds: 45 },
        { workoutSlug: "reverse-crunch", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 45 },
        { workoutSlug: "air-bike", sets: 3, repsLow: 20, repsHigh: 30, restSeconds: 45 },
        { workoutSlug: "bottoms-up", sets: 3, repsLow: 10, repsHigh: 15, restSeconds: 45 },
      ],
    },
    {
      label: "HIIT",
      exercises: [
        { workoutSlug: "mountain-climbers", sets: 4, durationSeconds: 40, restSeconds: 20 },
        { workoutSlug: "freehand-jump-squat", sets: 4, durationSeconds: 30, restSeconds: 30 },
        { workoutSlug: "bench-jump", sets: 4, durationSeconds: 30, restSeconds: 30 },
        { workoutSlug: "pushups", sets: 4, repsLow: 8, repsHigh: 12, restSeconds: 30 },
      ],
    },
    {
      label: "Full Body Bodyweight",
      exercises: [
        { workoutSlug: "pushups", sets: 3, repsLow: 10, repsHigh: 15, restSeconds: 45 },
        { workoutSlug: "freehand-jump-squat", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 45 },
        { workoutSlug: "superman", sets: 3, repsLow: 10, repsHigh: 15, restSeconds: 45 },
        { workoutSlug: "bent-knee-hip-raise", sets: 3, repsLow: 10, repsHigh: 15, restSeconds: 45 },
        { workoutSlug: "plank", sets: 3, durationSeconds: 45, restSeconds: 45 },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "oats-with-banana-honey" },
    { mealType: "Lunch", recipeSlug: "turkey-wrap" },
    { mealType: "Snack", recipeSlug: "hummus-veggies" },
    { mealType: "Dinner", recipeSlug: "chicken-soup-noodles" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "avocado-toast" },
    { mealType: "Lunch", recipeSlug: "tuna-pasta-salad" },
    { mealType: "Snack", recipeSlug: "boiled-eggs-and-fruit" },
    { mealType: "Dinner", recipeSlug: "egg-curry-roti" },
  ],
  calorieTarget: 1800,
  proteinTarget: 130,
  carbsTarget: 200,
  fatTarget: 55,
};

// ─── Plan: Maintenance / Recomp (4 weeks, 3 days/week) ─────────────

const PLAN_MAINTENANCE: PlanDefinition = {
  slug: "maintenance-recomp",
  name: "Maintenance / Recomp",
  description: "4-week 3-day maintenance training for clients between cuts/bulks — balanced macros, full-body work.",
  type: "combined",
  durationWeeks: 4,
  daysPerWeek: 3,
  trainingDayNumbers: [1, 3, 5],
  trainingDays: [
    {
      label: "Upper",
      exercises: [
        { workoutSlug: "barbell-bench-press-medium-grip", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "bent-over-barbell-row", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "dumbbell-one-arm-shoulder-press", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "hammer-curls", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 60 },
        { workoutSlug: "bench-dips", sets: 3, repsLow: 8, repsHigh: 12, restSeconds: 60 },
      ],
    },
    {
      label: "Lower",
      exercises: [
        { workoutSlug: "barbell-squat", sets: 4, repsLow: 6, repsHigh: 10, restSeconds: 120 },
        { workoutSlug: "romanian-deadlift", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 90 },
        { workoutSlug: "barbell-hip-thrust", sets: 3, repsLow: 10, repsHigh: 12, restSeconds: 75 },
        { workoutSlug: "bodyweight-walking-lunge", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 60 },
        { workoutSlug: "calf-press", sets: 3, repsLow: 12, repsHigh: 15, restSeconds: 45 },
      ],
    },
    {
      label: "Athletic Full Body",
      exercises: [
        { workoutSlug: "power-clean", sets: 4, repsLow: 3, repsHigh: 5, restSeconds: 120, notes: "Explosive — focus on form" },
        { workoutSlug: "kettlebell-thruster", sets: 3, repsLow: 8, repsHigh: 10, restSeconds: 75 },
        { workoutSlug: "farmers-walk", sets: 3, durationSeconds: 45, restSeconds: 60 },
        { workoutSlug: "russian-twist", sets: 3, repsLow: 20, repsHigh: 25, restSeconds: 45 },
        { workoutSlug: "front-box-jump", sets: 3, repsLow: 5, repsHigh: 8, restSeconds: 90 },
      ],
    },
  ],
  trainingDayMeals: [
    { mealType: "Breakfast", recipeSlug: "egg-bhurji-roti" },
    { mealType: "Lunch", recipeSlug: "haleem-portion" },
    { mealType: "Snack", recipeSlug: "fruit-yogurt-bowl" },
    { mealType: "Dinner", recipeSlug: "chicken-handi" },
  ],
  restDayMeals: [
    { mealType: "Breakfast", recipeSlug: "aloo-paratha-light" },
    { mealType: "Lunch", recipeSlug: "veggie-fried-rice" },
    { mealType: "Snack", recipeSlug: "samosa-baked" },
    { mealType: "Dinner", recipeSlug: "fish-curry-rice" },
  ],
  calorieTarget: 2200,
  proteinTarget: 160,
  carbsTarget: 240,
  fatTarget: 70,
};

// ─── Exports & validation ──────────────────────────────────────────

export const SEED_PLANS: PlanDefinition[] = [
  PLAN_BEGINNER_FAT_LOSS,
  PLAN_INTERMEDIATE_FAT_LOSS,
  PLAN_BEGINNER_MUSCLE_GAIN,
  PLAN_INTERMEDIATE_MUSCLE_GAIN,
  PLAN_HOME_WORKOUT,
  PLAN_MAINTENANCE,
];

if (SEED_PLANS.length !== 6) {
  throw new Error(`SEED_PLANS must total 6 (got ${SEED_PLANS.length})`);
}

// Cross-validate every workoutSlug + recipeSlug at module load to catch
// typos early. Spec §6: each training day has 4-8 exercises.
for (const plan of SEED_PLANS) {
  for (const td of plan.trainingDays) {
    if (td.exercises.length < 4 || td.exercises.length > 8) {
      throw new Error(
        `Plan "${plan.slug}" day "${td.label}" has ${td.exercises.length} ` +
          `exercises — spec requires 4-8.`
      );
    }
    for (const ex of td.exercises) {
      if (!VALID_WORKOUT_SLUGS.has(ex.workoutSlug)) {
        throw new Error(
          `Unknown workoutSlug "${ex.workoutSlug}" in plan "${plan.slug}", day "${td.label}".`
        );
      }
    }
  }
  for (const slot of [...plan.trainingDayMeals, ...plan.restDayMeals]) {
    if (!VALID_RECIPE_SLUGS.has(slot.recipeSlug)) {
      throw new Error(
        `Unknown recipeSlug "${slot.recipeSlug}" in plan "${plan.slug}".`
      );
    }
  }
}
