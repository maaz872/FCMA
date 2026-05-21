# FCMA — Seed Content & Plan Builder Spec

**Status:** Draft for client sign-off
**Owner:** DeepLearnHQ
**Last updated:** 2026-05-20

---

## 1. Context

When a SUPER_ADMIN provisions a new coach in FCMA today, the system seeds taxonomies only — 10 recipe categories, 12 dietary tags, 5 workout categories with 28 subcategories, and 85 food items. **It does not seed any actual recipes, workouts, or plan templates.** A brand-new coach logs in to find empty content lists and has to build everything from scratch before they can sell their first subscription.

This spec defines (a) what starter content every new coach should get, (b) a richer exercise-prescription model so coaches can build plans that match the polish of leading fitness apps, and (c) a workflow for visualizing exercises with animated illustrations.

---

## 2. Reference experience

Raheel pointed at **30 Day Fitness Challenge** (`com.popularapp.thirtydayfitnesschallenge`) as the visual target. Specifically:

- Each training day shows **multiple exercises** in sequence (e.g., "Day 3: 20 jumping jacks → 15 push-ups → 30s plank → 20 squats…"), not a single workout block.
- Each exercise has a **looping animated illustration** showing proper form.
- Each exercise specifies **sets, reps or duration, and rest** between sets.
- A **rest timer** counts down between sets; exercises auto-advance.

FCMA will mirror this experience for the client's daily workout view, while remaining a coach-managed multi-tenant platform (the reference app is single-user; FCMA stays coach-curated).

---

## 3. Product decisions (confirmed)

| # | Decision | Choice |
|---|---|---|
| A | Exercises per training day | **Multiple exercises per day**, structured (sets / reps / rest / notes per exercise). Requires schema change. |
| B | Illustration format | **Animated GIFs sourced from an open dataset**, self-hosted in Supabase Storage. |
| C | Starter content volume per coach | **50 recipes + 50 exercises + 6 plan templates** |

---

## 4. User stories

**As a SUPER_ADMIN (Raheel),** when I click "Seed Defaults" on a newly provisioned coach, I want their account to be populated with a complete starter library — 50 recipes, 50 exercises with illustrations, and 6 plan templates — so the coach can sell subscriptions from day one without building content first.

**As a COACH,** when I open the plan editor, I want to add multiple exercises to a single training day, specifying sets, reps (or duration), rest, weight, and notes per exercise — not just a free-text note — so I can prescribe real training programs.

**As a COACH,** when I duplicate a starter plan template, I want it pre-wired to the seeded exercises and recipes so the plan works immediately and I can customize from there.

**As an END USER (client),** when I open my daily plan, I want to see each exercise with an animated illustration, the prescription (3 × 12 reps, 60s rest), and a way to check off each set so I can follow along like a guided workout app.

---

## 5. Schema changes

### New model: `PlanExercise`

Mirrors the existing `PlanDayMeal` pattern (shared between template-side and client-side via two nullable FKs).

| Field | Type | Notes |
|---|---|---|
| `id` | Int @id @default(autoincrement()) | |
| `templateDayId` | Int? | FK → `PlanTemplateDay.id`. Set when this is a template-side prescription. |
| `clientDayId` | Int? | FK → `ClientPlanDay.id`. Set when this is a client-side prescription. |
| `workoutId` | Int | FK → `Workout.id`. The exercise being prescribed. |
| `orderIndex` | Int | Position within the day's sequence. |
| `sets` | Int? | e.g. 3. Null for time-only exercises. |
| `repsLow` | Int? | Rep range low end. Null for time-based. |
| `repsHigh` | Int? | Rep range high end. Equal to `repsLow` for fixed reps. |
| `durationSeconds` | Int? | For time-based exercises (plank, run, etc.). |
| `restSeconds` | Int? @default(60) | Rest between sets. |
| `weightKg` | Float? | Coach can prescribe a load. Null for bodyweight. |
| `notes` | String? | Per-exercise note. |
| `createdAt`, `updatedAt` | DateTime | Standard. |
| Indexes | | `[templateDayId, orderIndex]`, `[clientDayId, orderIndex]`, `[workoutId]`. |
| Constraint | | CHECK XOR: exactly one of `templateDayId` / `clientDayId` must be set. |

### Additions to `Workout`

| Field | Type | Notes |
|---|---|---|
| `gifUrl` | String? | URL to the animated illustration (self-hosted). |
| `bodyPart` | String? | One of: `chest`, `back`, `legs`, `shoulders`, `arms`, `core`, `full_body`, `cardio`. |
| `equipment` | String? | One of: `bodyweight`, `dumbbell`, `barbell`, `kettlebell`, `machine`, `cable`, `band`, `other`. |
| `primaryMuscles` | String? | Comma-separated muscle list (e.g. `"pectorals,triceps"`). |

`videoUrl` stays — videos are higher-fidelity than GIFs and coaches may still upload their own.

### Migration plan for existing `PlanTemplateDay.workoutId`

The current schema has a single `workoutId?` on `PlanTemplateDay`. To preserve existing data:

1. For every `PlanTemplateDay` where `workoutId IS NOT NULL`, create a single `PlanExercise` row with `templateDayId = day.id`, `workoutId = day.workoutId`, `orderIndex = 0`, `sets = 3`, `repsLow = 10`, `repsHigh = 12`, `restSeconds = 60` (sensible defaults).
2. Do the same for `ClientPlanDay.workoutId`.
3. Keep the old `workoutId` field on both for one release as a fallback, then drop in the next migration.

---

## 6. Content breakdown

### 50 Exercises

Distribution by body part:

| Body part | Count |
|---|---|
| Chest | 5 |
| Back | 6 |
| Legs (quads / hams / glutes) | 12 |
| Shoulders | 5 |
| Arms (biceps / triceps) | 6 |
| Core / abs | 8 |
| Full body compound | 4 |
| Cardio / conditioning | 4 |

Each exercise gets: title, slug, description, GIF URL, body part, equipment, primary muscles, difficulty, default sets/reps suggestion, video URL (optional), instructions array, `coachId` (set per coach during seeding).

### 50 Recipes

Distribution by meal type:

| Meal type | Count |
|---|---|
| Breakfast | 12 |
| Lunch | 15 |
| Dinner | 15 |
| Snacks | 8 |

Cuisine mix: roughly 60% regional (Pakistani staples — the existing seed already includes basmati rice, hummus, dal, etc.) and 40% international (Mediterranean, mainstream Western). Each recipe has full macros, ingredient list, step-by-step instructions, prep + cook time, image URL.

### 6 Plan Templates

Each template wires the seeded exercises and recipes into a complete training + nutrition program.

| Plan | Duration | Days/week | Target audience |
|---|---|---|---|
| Beginner Fat Loss | 4 weeks | 3 | New clients, calorie deficit focus |
| Intermediate Fat Loss | 8 weeks | 4 | Active intermediate clients |
| Beginner Muscle Gain | 8 weeks | 3 | New clients, surplus + compound focus |
| Intermediate Muscle Gain | 12 weeks | 4 | Hypertrophy-focused clients |
| Home Workout (No Equipment) | 4 weeks | 5 | Clients without gym access |
| Maintenance / Recomp | 4 weeks | 3 | Clients between cuts/bulks |

Each plan includes per-day workout structure (4–8 exercises per training day, with prescriptions) and meal plan references (3–5 meals per day from the seeded recipes).

---

## 7. Illustration source

**Recommended:** [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (MIT license, ~870 exercises, static line illustrations, no API key, fully self-hostable).

**Higher-fidelity alternative:** ExerciseDB via RapidAPI (~1,300 exercises with animated GIFs, $10/mo unlimited tier; can also do a one-time scrape and self-host the GIFs).

**Recommendation:** Start with Free Exercise DB for v1 — clean, free, MIT-licensed, sufficient quality. If Raheel wants true animations later, do a one-time bulk import from ExerciseDB into Supabase Storage and swap the URLs.

All illustrations get copied into a Supabase Storage bucket (`exercise-gifs/`) at content-creation time so the app never depends on the third-party source going down.

---

## 8. Phases and rough timeline

| Phase | Work | Duration |
|---|---|---|
| 1. Spec sign-off | This document approved by Raheel | 1–2 days |
| 2. Schema migration | Add `PlanExercise`, extend `Workout`, write & run migration, backfill existing data | 1 day |
| 3. Content creation | Source 50 GIFs, generate 50 recipes, generate 50 exercise records with prescriptions, build 6 plan templates as code | 3–5 days |
| 4. Seed function update | Rewrite `seedCoachDefaults` to populate the new content. Build backfill script for the 6 existing coaches. | 1 day |
| 5. Coach plan editor UI | New multi-exercise day editor with sets/reps/rest fields, drag-to-reorder, GIF preview | 2–3 days |
| 6. Client hub UI | New daily workout view with animated illustrations, set-by-set checkoff, rest timer | 2 days |
| 7. QA & polish | Cross-tenant scoping audit (every new endpoint), copy review, mobile QA | 1–2 days |

**Total: 11–17 working days** (≈ 2.5–3.5 weeks of focused work).

---

## 9. Out of scope (v1)

- **Voice coaching / TTS prompts.** The reference app speaks each exercise; FCMA will be visual-only for v1.
- **Auto-advance + rest timer for the user side.** v1 ships set-by-set checkoff only; live timer can be a fast follow.
- **Per-client plan customization.** Coaches can still customize after assigning; we're not introducing client-level overrides as a new feature.
- **Exercise video upload to Supabase Storage.** Existing `videoUrl` continues to accept YouTube/Vimeo/etc. URLs.
- **Replacing existing assets-as-base64 model.** Workout GIFs go to Supabase Storage; recipe images and branding logos stay where they are. That's a separate refactor.
- **AI-generated exercise variants per client fitness level.** Coaches manually choose plans for now.

---

## 10. Open questions for Raheel

1. **Cuisine balance:** is 60% regional / 40% international the right ratio, or should it lean further one way?

2. **Bodyweight vs gym split:** of the 50 exercises, what fraction should be bodyweight-only? (Current draft: ~20 bodyweight, 30 with equipment.)

3. **Premium plans:** are these 6 plan templates free with every coach onboarding, or should some be premium (gated behind a higher SUPER_ADMIN tier)?

4. **Existing 6 coaches:** when we ship this, should we automatically backfill the new content to existing coaches (potentially overwriting work-in-progress) or require manual opt-in via a button on `/super-admin/coaches/[id]`? Recommendation: manual opt-in.

5. **Localization:** all exercise/recipe content in English for v1, or Urdu/English bilingual? (The product UI is English-only today.)

6. **Illustrations style:** static drawings from Free Exercise DB are clean but not animated. Is that acceptable for v1, with animated GIFs as a v2 upgrade? Or is animation a hard requirement?

7. **Plan length flexibility:** the 6 templates have fixed durations (4/8/12 weeks). Should coaches be able to clone and shorten/lengthen them, or are these durations locked?

---

## 11. Approval

Sign-off below before any code is written.

- [ ] Raheel — content scope and reference app match
- [ ] Saad (DeepLearnHQ) — engineering scope and timeline
- [ ] Approved on: ___________

---

*This spec is a living document. Changes after approval require a written update and re-approval of the affected sections.*
