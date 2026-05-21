/**
 * Curated 22-exercise starter library seeded for every new coach.
 *
 * Each entry is self-contained — title / description / instructions /
 * videoUrl / gifUrl / bodyPart / equipment / primaryMuscles all baked in.
 * No external dataset dependency at seed time.
 *
 * Video sources (all CC-licensed or free embeds):
 *   - wger.de 1080p MOV/MP4 catalog (author: "Goulart", CC) — 19 entries
 *   - exercemus / YouTube curated demos (MIT-licensed source list) — 3 entries
 *
 * Coverage:
 *   chest 3, back 4, legs 6, shoulders 2, arms 6, core 1
 *   (no full_body or cardio yet — gaps in the free-OSS HD-video catalog)
 *
 * `gifUrl` is retained on the 7 entries that have a matching Free Exercise
 * DB illustration — they are fallback only (the video plays as the card
 * thumbnail). The 15 newer entries don't have a corresponding gif. The
 * hub and admin UIs both prefer videoUrl when present.
 */

import type { AppBodyPart, AppEquipment } from "../exercise-library";

export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface WorkoutPick {
  slug: string;
  title: string;
  description: string;
  videoUrl: string;
  gifUrl: string | null;
  bodyPart: AppBodyPart;
  equipment: AppEquipment;
  primaryMuscles: string;
  difficulty: Difficulty;
  instructions: string[];
}

const FX_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export const WORKOUT_PICKS: WorkoutPick[] = [
  // ── Chest (3) ──
  {
    slug: "barbell-incline-bench-press-medium-grip",
    title: "Barbell Incline Bench Press - Medium Grip",
    description:
      "Incline barbell bench press for upper-chest development.",
    videoUrl:
      "https://wger.de/media/exercise-video/538/4349a6f6-4cee-4c09-828b-c5e7fc2c1ff1.MOV",
    gifUrl: FX_BASE + "Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg",
    bodyPart: "chest",
    equipment: "barbell",
    primaryMuscles: "chest",
    difficulty: "Intermediate",
    instructions: [
      "Lie back on an incline bench with a medium-width grip on the barbell.",
      "Unrack and hold the bar straight over your upper chest.",
      "Lower the bar slowly until it lightly touches your upper chest.",
      "Press the bar back up to the starting position by driving through the chest.",
    ],
  },
  {
    slug: "dumbbell-incline-bench-press",
    title: "Dumbbell Incline Bench Press",
    description: "Incline bench press with dumbbells — emphasizes the upper chest.",
    videoUrl:
      "https://wger.de/media/exercise-video/537/b9c937e9-daeb-42a9-be8e-7a77e368478c.MOV",
    gifUrl: null,
    bodyPart: "chest",
    equipment: "dumbbell",
    primaryMuscles: "chest,triceps",
    difficulty: "Intermediate",
    instructions: [
      "Set an incline bench to 30-45° and sit with a dumbbell in each hand on your thighs.",
      "Kick the dumbbells up to shoulder level as you lie back.",
      "Press both dumbbells overhead until your arms are nearly straight.",
      "Lower under control until the dumbbells are at chest level. Repeat.",
    ],
  },
  {
    slug: "dumbbell-bench-press",
    title: "Dumbbell Bench Press",
    description: "Flat-bench dumbbell press — chest, shoulders and triceps.",
    videoUrl:
      "https://wger.de/media/exercise-video/75/080c799b-8afd-4130-8d72-9cef0cd79f54.MOV",
    gifUrl: null,
    bodyPart: "chest",
    equipment: "dumbbell",
    primaryMuscles: "chest,triceps",
    difficulty: "Intermediate",
    instructions: [
      "Lie back on a flat bench with a dumbbell in each hand at chest level.",
      "Press both dumbbells overhead until the arms are nearly straight.",
      "Lower the dumbbells slowly until they are at chest height.",
      "Repeat for the prescribed reps.",
    ],
  },

  // ── Back (4) ──
  {
    slug: "pull-ups",
    title: "Pull-Ups",
    description:
      "Bodyweight vertical pull for full lat development and grip strength.",
    videoUrl:
      "https://wger.de/media/exercise-video/475/83067ffe-ccb9-4e22-8507-5131b211ce74.MOV",
    gifUrl: null,
    bodyPart: "back",
    equipment: "bodyweight",
    primaryMuscles: "lats,biceps",
    difficulty: "Advanced",
    instructions: [
      "Grip a pull-up bar slightly wider than shoulder width, palms facing away.",
      "Hang with arms fully extended and engage your shoulders down and back.",
      "Pull yourself up until your chin clears the bar, leading with the elbows.",
      "Lower under control to a dead hang. Repeat.",
    ],
  },
  {
    slug: "one-arm-cable-row",
    title: "One-Arm Cable Row",
    description:
      "Single-arm cable row targeting the lats and middle back with full unilateral range of motion.",
    videoUrl:
      "https://wger.de/media/exercise-video/349/9896d82e-d8b6-48af-bdd5-b8545dc523e9.MOV",
    gifUrl: null,
    bodyPart: "back",
    equipment: "cable",
    primaryMuscles: "lats,middle back",
    difficulty: "Intermediate",
    instructions: [
      "Attach a single handle to a low or mid cable and grip with one hand.",
      "Set your stance with the opposite foot slightly forward and brace your core.",
      "Pull the handle to your hip, squeezing the shoulder blade at the end of the range.",
      "Slowly return to the starting position under control. Repeat, then switch sides.",
    ],
  },
  {
    slug: "cable-face-pull",
    title: "Cable Face Pull",
    description:
      "Rear-delt and upper-back movement using a rope attachment — corrects forward-shoulder posture.",
    videoUrl:
      "https://wger.de/media/exercise-video/222/245a824b-cd39-45f2-b251-2c0b7efead0d.MOV",
    gifUrl: null,
    bodyPart: "back",
    equipment: "cable",
    primaryMuscles: "rear delts,traps",
    difficulty: "Beginner",
    instructions: [
      "Set a rope attachment at slightly above face height on the cable.",
      "Grip the rope with both hands, palms facing inward.",
      "Step back, brace, and pull the rope toward your forehead, flaring the elbows out.",
      "Squeeze the shoulder blades, then slowly extend back to the starting position.",
    ],
  },
  {
    slug: "barbell-shrugs",
    title: "Barbell Shrugs",
    description: "Direct trap builder — barbell shrug straight up, no rolling.",
    videoUrl:
      "https://wger.de/media/exercise-video/570/bd1f14a3-9d2b-4ec0-b6b9-e82d739f7e60.MOV",
    gifUrl: null,
    bodyPart: "back",
    equipment: "barbell",
    primaryMuscles: "traps",
    difficulty: "Beginner",
    instructions: [
      "Stand holding a barbell with an overhand grip, hands shoulder-width apart.",
      "Keep the arms straight and shoulders down to start.",
      "Elevate your shoulders straight up toward your ears.",
      "Pause briefly at the top, then lower under control.",
    ],
  },

  // ── Legs (6) ──
  {
    slug: "barbell-lunge",
    title: "Barbell Lunge",
    description: "Walking or standing barbell lunge — quad-and-glute dominant.",
    videoUrl:
      "https://wger.de/media/exercise-video/46/200d9889-322f-476a-a47b-f15a1a97934a.MOV",
    gifUrl: FX_BASE + "Barbell_Lunge/0.jpg",
    bodyPart: "legs",
    equipment: "barbell",
    primaryMuscles: "quadriceps",
    difficulty: "Intermediate",
    instructions: [
      "Rack a barbell across your upper back and unrack as you would for a squat.",
      "Step forward into a long stride, lowering the back knee toward the floor.",
      "Drive through the front heel to return to standing.",
      "Alternate legs for the prescribed reps.",
    ],
  },
  {
    slug: "barbell-hip-thrust",
    title: "Barbell Hip Thrust",
    description: "Heavy glute-dominant hip extension with a barbell across the hips.",
    videoUrl:
      "https://wger.de/media/exercise-video/294/45bacf4b-1bb6-4d47-8bd1-9f00eddd4019.MOV",
    gifUrl: FX_BASE + "Barbell_Hip_Thrust/0.jpg",
    bodyPart: "legs",
    equipment: "barbell",
    primaryMuscles: "glutes",
    difficulty: "Intermediate",
    instructions: [
      "Sit with upper back against a bench, barbell padded across your hips.",
      "Plant your feet flat, knees bent, brace your core.",
      "Drive through your heels to extend the hips, squeezing the glutes at the top.",
      "Lower under control to the starting position.",
    ],
  },
  {
    slug: "barbell-front-squat",
    title: "Barbell Front Squat",
    description:
      "Quad-dominant squat variant with the bar racked across the front delts.",
    videoUrl:
      "https://wger.de/media/exercise-video/257/ad8ac7d9-b04d-415f-ae0e-837942ce2840.MOV",
    gifUrl: null,
    bodyPart: "legs",
    equipment: "barbell",
    primaryMuscles: "quadriceps,glutes",
    difficulty: "Advanced",
    instructions: [
      "Rack the barbell across the front of your shoulders, elbows high.",
      "Step back from the rack with feet shoulder-width apart.",
      "Squat down by sitting back into your hips, keeping the chest upright.",
      "Drive through the heels to stand back up.",
    ],
  },
  {
    slug: "lying-leg-curl",
    title: "Lying Leg Curl",
    description: "Hamstring isolation on the lying leg-curl machine.",
    videoUrl:
      "https://wger.de/media/exercise-video/365/becaf013-5044-40d0-bae9-7ed60c973737.MOV",
    gifUrl: null,
    bodyPart: "legs",
    equipment: "machine",
    primaryMuscles: "hamstrings",
    difficulty: "Beginner",
    instructions: [
      "Lie face down on the machine with the pad just above your heels.",
      "Grip the handles and brace your core.",
      "Curl your heels toward your glutes by flexing the knees.",
      "Lower slowly under control to the starting position.",
    ],
  },
  {
    slug: "leg-press",
    title: "Leg Press",
    description: "Heavy quad and glute builder on the 45° leg-press sled.",
    videoUrl:
      "https://wger.de/media/exercise-video/371/32601896-b84a-49bf-ae8a-b27a8f57ab21.MOV",
    gifUrl: null,
    bodyPart: "legs",
    equipment: "machine",
    primaryMuscles: "quadriceps,glutes",
    difficulty: "Beginner",
    instructions: [
      "Sit on the leg-press machine with feet shoulder-width on the platform.",
      "Release the safety catches and lower the platform until knees reach ~90 degrees.",
      "Press the platform back up by extending the knees, stopping short of locking out.",
      "Repeat for the prescribed reps before re-engaging the safety.",
    ],
  },
  {
    slug: "seated-calf-raise",
    title: "Seated Calf Raise",
    description: "Targets the soleus with a seated machine calf raise.",
    videoUrl:
      "https://wger.de/media/exercise-video/590/a325ae2e-686b-4a1f-aff2-ba37fa3fa157.MOV",
    gifUrl: null,
    bodyPart: "legs",
    equipment: "machine",
    primaryMuscles: "calves",
    difficulty: "Beginner",
    instructions: [
      "Sit on the seated calf-raise machine with the pad across the lower thighs.",
      "Place the balls of your feet on the platform and disengage the safety.",
      "Press through the balls of your feet to lift your heels as high as possible.",
      "Lower slowly and controlled, getting a deep stretch at the bottom.",
    ],
  },

  // ── Shoulders (2) ──
  {
    slug: "dumbbell-lateral-raise",
    title: "Dumbbell Lateral Raise",
    description: "Isolation movement for the side delts — raise to shoulder height.",
    videoUrl:
      "https://wger.de/media/exercise-video/348/de69928a-8a35-4096-821c-1f46de5e0e03.MOV",
    gifUrl: null,
    bodyPart: "shoulders",
    equipment: "dumbbell",
    primaryMuscles: "shoulders",
    difficulty: "Beginner",
    instructions: [
      "Stand holding a dumbbell in each hand at your sides, palms facing in.",
      "With a slight bend in the elbows, raise the dumbbells out to the sides.",
      "Stop when arms are roughly parallel to the floor.",
      "Lower slowly back to the starting position under control.",
    ],
  },
  {
    slug: "rear-delt-raise",
    title: "Rear Delt Raise",
    description: "Bent-over dumbbell rear-delt raise to balance the front and side delts.",
    videoUrl:
      "https://wger.de/media/exercise-video/82/28b53647-27e7-47cf-8852-2ee666c8b628.MOV",
    gifUrl: null,
    bodyPart: "shoulders",
    equipment: "dumbbell",
    primaryMuscles: "rear delts",
    difficulty: "Intermediate",
    instructions: [
      "Hinge forward at the hips with a dumbbell in each hand, palms facing each other.",
      "Keep a slight bend in the elbows.",
      "Raise the dumbbells out to the sides until arms are roughly parallel to the floor.",
      "Squeeze the rear delts and lower under control.",
    ],
  },

  // ── Arms (6) ──
  {
    slug: "barbell-curl",
    title: "Barbell Curl",
    description: "Standing barbell curl — primary biceps builder.",
    videoUrl: "https://www.youtube.com/watch?v=LY1V6UbRHFM",
    gifUrl: FX_BASE + "Barbell_Curl/0.jpg",
    bodyPart: "arms",
    equipment: "barbell",
    primaryMuscles: "biceps",
    difficulty: "Beginner",
    instructions: [
      "Stand upright with a barbell at a shoulder-width grip, palms facing forward.",
      "Keeping upper arms stationary, curl the bar by contracting your biceps.",
      "Continue until your biceps are fully contracted and the bar is at shoulder level.",
      "Slowly lower the bar back to the starting position.",
    ],
  },
  {
    slug: "dumbbell-bicep-curl",
    title: "Dumbbell Bicep Curl",
    description: "Alternating or simultaneous dumbbell curls — supinated grip for biceps emphasis.",
    videoUrl: "https://www.youtube.com/watch?v=ykJmrZ5v0Oo",
    gifUrl: FX_BASE + "Dumbbell_Bicep_Curl/0.jpg",
    bodyPart: "arms",
    equipment: "dumbbell",
    primaryMuscles: "biceps",
    difficulty: "Beginner",
    instructions: [
      "Stand upright with a dumbbell in each hand, palms facing forward.",
      "Keep elbows close to your torso and curl the weights while contracting your biceps.",
      "Continue until your biceps are fully contracted at shoulder level.",
      "Slowly lower back to the starting position.",
    ],
  },
  {
    slug: "hammer-curls",
    title: "Hammer Curls",
    description: "Neutral-grip dumbbell curl emphasizing the brachialis and forearm.",
    videoUrl:
      "https://wger.de/media/exercise-video/272/df069052-2173-4f24-855f-a0eebe729f24.MOV",
    gifUrl: FX_BASE + "Hammer_Curls/0.jpg",
    bodyPart: "arms",
    equipment: "dumbbell",
    primaryMuscles: "biceps",
    difficulty: "Beginner",
    instructions: [
      "Stand upright with a dumbbell in each hand, palms facing your torso.",
      "Keep upper arms stationary and curl the weights forward.",
      "Continue until biceps are fully contracted at shoulder level.",
      "Slowly lower back to the starting position.",
    ],
  },
  {
    slug: "dumbbell-tricep-extension",
    title: "Dumbbell Tricep Extension",
    description: "Overhead two-handed dumbbell tricep extension.",
    videoUrl:
      "https://wger.de/media/exercise-video/211/85f6eb25-a76c-409e-9af9-497794ac0dfb.MOV",
    gifUrl: null,
    bodyPart: "arms",
    equipment: "dumbbell",
    primaryMuscles: "triceps",
    difficulty: "Beginner",
    instructions: [
      "Stand or sit and hold one dumbbell with both hands overhead.",
      "Lower the dumbbell behind your head by bending at the elbows.",
      "Press the dumbbell back to the starting position by extending the elbows.",
      "Keep the upper arms vertical throughout.",
    ],
  },
  {
    slug: "tricep-dips",
    title: "Tricep Dips",
    description: "Bodyweight parallel-bar dip emphasising the triceps.",
    videoUrl:
      "https://wger.de/media/exercise-video/194/d039ec90-474d-47a9-a3ad-bf0b00828c82.MP4",
    gifUrl: null,
    bodyPart: "arms",
    equipment: "bodyweight",
    primaryMuscles: "triceps,chest",
    difficulty: "Intermediate",
    instructions: [
      "Mount the parallel bars with arms straight and torso upright.",
      "Lower yourself by bending the elbows until they're at ~90 degrees.",
      "Keep your elbows tracking close to your body.",
      "Press back to the starting position by extending the elbows.",
    ],
  },
  {
    slug: "cable-tricep-extension",
    title: "Cable Tricep Extension",
    description: "Standing cable tricep pushdown with a rope or straight bar.",
    videoUrl:
      "https://wger.de/media/exercise-video/659/1f2eb3b6-3185-429f-8330-26dc88f39aff.MOV",
    gifUrl: null,
    bodyPart: "arms",
    equipment: "cable",
    primaryMuscles: "triceps",
    difficulty: "Beginner",
    instructions: [
      "Attach a rope or straight bar to the high pulley.",
      "Grip the attachment and step back with elbows tucked at your sides.",
      "Press the attachment down by extending the elbows fully.",
      "Slowly return to the starting position under control.",
    ],
  },

  // ── Core (1) ──
  {
    slug: "3-4-sit-up",
    title: "3/4 Sit-Up",
    description:
      "Sit-up performed only 3/4 of the way to keep continuous tension on the abs.",
    videoUrl: "https://www.youtube.com/watch?v=wm47Swzn_98",
    gifUrl: FX_BASE + "3_4_Sit-Up/0.jpg",
    bodyPart: "core",
    equipment: "bodyweight",
    primaryMuscles: "abdominals",
    difficulty: "Beginner",
    instructions: [
      "Lie on the floor with your feet secured and knees bent.",
      "Place your hands behind or beside your head.",
      "Flex your hips and spine to raise your torso 3/4 of the way to your knees.",
      "Slowly return to the starting position. Repeat.",
    ],
  },
];

// Self-validation: 22 entries, slug uniqueness.
if (WORKOUT_PICKS.length !== 22) {
  throw new Error(
    `WORKOUT_PICKS must have exactly 22 entries (got ${WORKOUT_PICKS.length})`,
  );
}
{
  const slugs = WORKOUT_PICKS.map((p) => p.slug);
  if (new Set(slugs).size !== slugs.length) {
    throw new Error("WORKOUT_PICKS contains duplicate slugs");
  }
}

// Type-only export kept for backward compat of any external imports.
// The old shape (libraryId-based) is no longer used; consumers should
// migrate to the new `WorkoutPick`.
export type { AppBodyPart, AppEquipment } from "../exercise-library";
