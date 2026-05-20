/**
 * Curated 50-exercise pick list for the per-coach starter library.
 *
 * Each pick references an `id` from src/data/exercise-library.json. The
 * seeder looks each id up, copies the library entry's name / description /
 * instructions / gif URL into a new `Workout` row, stamps it with the
 * coach's `coachId`, and links it to the matching `WorkoutSubcategory`
 * via `bodyPart` → subcategory mapping.
 *
 * Distribution (per spec §6):
 *   Chest 5, Back 6, Legs 12, Shoulders 5, Arms 6, Core 8, Full body 4, Cardio 4
 *
 * Equipment mix: ~20 bodyweight / 30 with equipment (no hard count — the
 * picks are chosen for variety, not to hit a precise ratio).
 *
 * `bodyPartOverride` is used for compound lifts the dataset can't categorise
 * (e.g. Clean is tagged `hamstrings` by the library; we treat it as
 * `full_body` because it's a full-body lift in practice).
 */

import type { AppBodyPart, AppEquipment } from "../exercise-library";

export interface WorkoutPick {
  /** Library entry id (matches `src/data/exercise-library.json[].id`). */
  libraryId: string;
  /** Override the derived FCMA body part if the library's categorisation is wrong. */
  bodyPartOverride?: AppBodyPart;
  /** Override the derived FCMA equipment if needed. */
  equipmentOverride?: AppEquipment;
  /** Suggested default difficulty for the auto-built Workout. */
  difficulty?: "Beginner" | "Intermediate" | "Advanced";
}

export const WORKOUT_PICKS: WorkoutPick[] = [
  // ── Chest (5) ──────────────────────────────────────────────────
  { libraryId: "Pushups", difficulty: "Beginner" },
  { libraryId: "Decline_Push-Up", difficulty: "Intermediate" },
  { libraryId: "Barbell_Bench_Press_-_Medium_Grip", difficulty: "Intermediate" },
  { libraryId: "Barbell_Incline_Bench_Press_-_Medium_Grip", difficulty: "Intermediate" },
  { libraryId: "Cable_Crossover", difficulty: "Intermediate" },

  // ── Back (6) ───────────────────────────────────────────────────
  { libraryId: "Chin-Up", difficulty: "Intermediate" },
  { libraryId: "Wide-Grip_Rear_Pull-Up", difficulty: "Advanced" },
  { libraryId: "Bent_Over_Barbell_Row", difficulty: "Intermediate" },
  { libraryId: "Bent_Over_Two-Dumbbell_Row", difficulty: "Beginner" },
  { libraryId: "Barbell_Deadlift", difficulty: "Advanced" },
  { libraryId: "Superman", difficulty: "Beginner" },

  // ── Legs (12) ──────────────────────────────────────────────────
  { libraryId: "Barbell_Squat", difficulty: "Intermediate" },
  { libraryId: "Barbell_Full_Squat", difficulty: "Intermediate" },
  { libraryId: "Bodyweight_Walking_Lunge", difficulty: "Beginner" },
  { libraryId: "Barbell_Lunge", difficulty: "Intermediate" },
  { libraryId: "Romanian_Deadlift", difficulty: "Intermediate" },
  { libraryId: "Barbell_Hip_Thrust", difficulty: "Intermediate" },
  { libraryId: "Single_Leg_Glute_Bridge", difficulty: "Beginner" },
  { libraryId: "Goblet_Squat", difficulty: "Beginner" },
  { libraryId: "Step-up_with_Knee_Raise", difficulty: "Beginner" },
  { libraryId: "Dumbbell_Step_Ups", difficulty: "Beginner" },
  { libraryId: "Freehand_Jump_Squat", difficulty: "Intermediate" },
  { libraryId: "Calf_Press", difficulty: "Beginner" },

  // ── Shoulders (5) ──────────────────────────────────────────────
  { libraryId: "Barbell_Shoulder_Press", difficulty: "Intermediate" },
  { libraryId: "Arnold_Dumbbell_Press", difficulty: "Intermediate" },
  { libraryId: "Dumbbell_One-Arm_Shoulder_Press", difficulty: "Beginner" },
  { libraryId: "Band_Pull_Apart", difficulty: "Beginner" },
  { libraryId: "Cable_Seated_Lateral_Raise", difficulty: "Beginner" },

  // ── Arms (6) ───────────────────────────────────────────────────
  { libraryId: "Dumbbell_Bicep_Curl", difficulty: "Beginner" },
  { libraryId: "Hammer_Curls", difficulty: "Beginner" },
  { libraryId: "Barbell_Curl", difficulty: "Beginner" },
  { libraryId: "Bench_Dips", difficulty: "Beginner" },
  { libraryId: "Body_Tricep_Press", difficulty: "Beginner" },
  { libraryId: "Dips_-_Triceps_Version", difficulty: "Intermediate" },

  // ── Core (8) ───────────────────────────────────────────────────
  { libraryId: "Plank", difficulty: "Beginner" },
  { libraryId: "Russian_Twist", difficulty: "Beginner" },
  { libraryId: "Reverse_Crunch", difficulty: "Beginner" },
  { libraryId: "Hanging_Leg_Raise", difficulty: "Intermediate" },
  { libraryId: "Air_Bike", difficulty: "Beginner" },
  { libraryId: "3_4_Sit-Up", difficulty: "Beginner" },
  { libraryId: "Bent-Knee_Hip_Raise", difficulty: "Beginner" },
  { libraryId: "Bottoms_Up", difficulty: "Intermediate" },

  // ── Full body (4) ──────────────────────────────────────────────
  {
    libraryId: "Clean",
    bodyPartOverride: "full_body",
    difficulty: "Advanced",
  },
  {
    libraryId: "Power_Clean",
    bodyPartOverride: "full_body",
    difficulty: "Advanced",
  },
  {
    libraryId: "Kettlebell_Thruster",
    bodyPartOverride: "full_body",
    difficulty: "Intermediate",
  },
  {
    libraryId: "Farmers_Walk",
    bodyPartOverride: "full_body",
    difficulty: "Beginner",
  },

  // ── Cardio (4) ─────────────────────────────────────────────────
  {
    libraryId: "Mountain_Climbers",
    bodyPartOverride: "cardio",
    equipmentOverride: "bodyweight",
    difficulty: "Beginner",
  },
  {
    libraryId: "Bench_Jump",
    bodyPartOverride: "cardio",
    equipmentOverride: "bodyweight",
    difficulty: "Intermediate",
  },
  {
    libraryId: "Front_Box_Jump",
    bodyPartOverride: "cardio",
    difficulty: "Intermediate",
  },
  {
    libraryId: "Bicycling_Stationary",
    bodyPartOverride: "cardio",
    difficulty: "Beginner",
  },
];

// Sanity check: 50 entries.
if (WORKOUT_PICKS.length !== 50) {
  throw new Error(
    `WORKOUT_PICKS must have exactly 50 entries (got ${WORKOUT_PICKS.length})`
  );
}
