/**
 * Static-shape tests for the seed content. Validates that the curated
 * lists in `workout-picks.ts`, `recipes.ts`, and `plans.ts` match the
 * spec §6 distribution and cross-reference one another correctly.
 *
 * These tests do NOT touch the database. The DB-write happy-path is
 * verified manually with `scripts/backfill-coach-seed-content.ts`
 * during development and by the integration suite in Phase 7.
 */

import { describe, it, expect } from "vitest";
import { WORKOUT_PICKS } from "./workout-picks";
import { SEED_RECIPES } from "./recipes";
import { SEED_PLANS, workoutSlugFromLibraryId } from "./plans";
import {
  getExerciseLibraryEntry,
  deriveAppBodyPart,
} from "../exercise-library";

describe("workout-picks", () => {
  it("contains exactly 50 picks", () => {
    expect(WORKOUT_PICKS.length).toBe(50);
  });

  it("every pick resolves to a real library entry", () => {
    for (const p of WORKOUT_PICKS) {
      const entry = getExerciseLibraryEntry(p.libraryId);
      expect(entry, `libraryId "${p.libraryId}" missing in dataset`).not.toBeNull();
    }
  });

  it("body-part distribution matches spec §6", () => {
    const counts: Record<string, number> = {};
    for (const p of WORKOUT_PICKS) {
      const entry = getExerciseLibraryEntry(p.libraryId)!;
      const bp = p.bodyPartOverride ?? deriveAppBodyPart(entry);
      counts[bp] = (counts[bp] ?? 0) + 1;
    }
    expect(counts.chest).toBe(5);
    expect(counts.back).toBe(6);
    expect(counts.legs).toBe(12);
    expect(counts.shoulders).toBe(5);
    expect(counts.arms).toBe(6);
    expect(counts.core).toBe(8);
    expect(counts.full_body).toBe(4);
    expect(counts.cardio).toBe(4);
  });

  it("derived slugs are unique", () => {
    const slugs = WORKOUT_PICKS.map((p) => workoutSlugFromLibraryId(p.libraryId));
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("seed recipes", () => {
  it("contains exactly 50 recipes", () => {
    expect(SEED_RECIPES.length).toBe(50);
  });

  it("meal-type distribution matches spec §6 (breakfast 12, lunch 15, dinner 15, snacks 8)", () => {
    // Note: a few recipes use smoothies/salads/soups categories — they
    // logically belong to a meal slot. We bucket by their intended meal
    // by counting the categorySlug categories the spec lists for each.
    // Spec maps: breakfast → "breakfast"+"smoothies" (smoothies are
    // typically breakfast/snack here), lunch → "lunch"+"salads"+"soups",
    // dinner → "dinner", snacks → "snacks".
    const buckets = { breakfast: 0, lunch: 0, dinner: 0, snacks: 0 };
    for (const r of SEED_RECIPES) {
      if (
        r.categorySlug === "breakfast" ||
        r.categorySlug === "smoothies"
      ) {
        buckets.breakfast += 1;
      } else if (
        r.categorySlug === "lunch" ||
        r.categorySlug === "salads" ||
        r.categorySlug === "soups"
      ) {
        buckets.lunch += 1;
      } else if (r.categorySlug === "dinner") {
        buckets.dinner += 1;
      } else if (r.categorySlug === "snacks") {
        buckets.snacks += 1;
      }
    }
    expect(buckets.breakfast).toBe(12);
    // Lunch + salads + soups; spec asks for 15 lunch — one of our 15 is
    // a Mediterranean Quinoa bowl tagged "lunch". The bucketing here
    // collapses salads/soups into lunch since they're served midday.
    expect(buckets.lunch).toBe(15);
    expect(buckets.dinner).toBe(15);
    expect(buckets.snacks).toBe(8);
  });

  it("regional vs international ratio is roughly 60/40", () => {
    const regional = SEED_RECIPES.filter((r) => r.regional).length;
    const intl = SEED_RECIPES.length - regional;
    // Allow ±15% tolerance because the ratio counts whole recipes.
    expect(regional).toBeGreaterThanOrEqual(25);
    expect(regional).toBeLessThanOrEqual(35);
    expect(intl).toBeGreaterThanOrEqual(15);
  });

  it("every recipe has non-empty ingredients and instructions", () => {
    for (const r of SEED_RECIPES) {
      expect(r.ingredients.length, `recipe "${r.slug}"`).toBeGreaterThan(0);
      expect(r.instructions.length, `recipe "${r.slug}"`).toBeGreaterThan(0);
    }
  });

  it("recipe slugs are unique", () => {
    const slugs = SEED_RECIPES.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every recipe has plausible macros", () => {
    for (const r of SEED_RECIPES) {
      expect(r.calories).toBeGreaterThan(0);
      // sanity: calories shouldn't massively exceed kcal-from-macros
      const kcalFromMacros = r.protein * 4 + r.carbs * 4 + r.fat * 9;
      const diff = Math.abs(r.calories - kcalFromMacros);
      // Allow 25 % slack since these are estimates, not lab data.
      expect(
        diff / r.calories,
        `recipe "${r.slug}" macros/calories mismatch (${diff} kcal)`
      ).toBeLessThan(0.25);
    }
  });
});

describe("seed plans", () => {
  it("contains exactly 6 plan templates with spec-defined slugs", () => {
    const slugs = SEED_PLANS.map((p) => p.slug);
    expect(slugs.sort()).toEqual(
      [
        "beginner-fat-loss",
        "intermediate-fat-loss",
        "beginner-muscle-gain",
        "intermediate-muscle-gain",
        "home-workout-no-equipment",
        "maintenance-recomp",
      ].sort()
    );
  });

  it("each plan has the spec's duration and days/week", () => {
    const map = Object.fromEntries(SEED_PLANS.map((p) => [p.slug, p]));
    expect([map["beginner-fat-loss"].durationWeeks, map["beginner-fat-loss"].daysPerWeek]).toEqual([4, 3]);
    expect([map["intermediate-fat-loss"].durationWeeks, map["intermediate-fat-loss"].daysPerWeek]).toEqual([8, 4]);
    expect([map["beginner-muscle-gain"].durationWeeks, map["beginner-muscle-gain"].daysPerWeek]).toEqual([8, 3]);
    expect([map["intermediate-muscle-gain"].durationWeeks, map["intermediate-muscle-gain"].daysPerWeek]).toEqual([12, 4]);
    expect([map["home-workout-no-equipment"].durationWeeks, map["home-workout-no-equipment"].daysPerWeek]).toEqual([4, 5]);
    expect([map["maintenance-recomp"].durationWeeks, map["maintenance-recomp"].daysPerWeek]).toEqual([4, 3]);
  });

  it("every training day has 4-8 exercises", () => {
    for (const p of SEED_PLANS) {
      for (const td of p.trainingDays) {
        expect(td.exercises.length, `${p.slug}/${td.label}`).toBeGreaterThanOrEqual(4);
        expect(td.exercises.length, `${p.slug}/${td.label}`).toBeLessThanOrEqual(8);
      }
    }
  });

  it("every plan has 3-5 meal slots per day", () => {
    for (const p of SEED_PLANS) {
      expect(p.trainingDayMeals.length).toBeGreaterThanOrEqual(3);
      expect(p.trainingDayMeals.length).toBeLessThanOrEqual(5);
      expect(p.restDayMeals.length).toBeGreaterThanOrEqual(3);
      expect(p.restDayMeals.length).toBeLessThanOrEqual(5);
    }
  });

  it("every plan exercise references a known workout slug", () => {
    const valid = new Set(
      WORKOUT_PICKS.map((p) => workoutSlugFromLibraryId(p.libraryId))
    );
    for (const p of SEED_PLANS) {
      for (const td of p.trainingDays) {
        for (const ex of td.exercises) {
          expect(
            valid.has(ex.workoutSlug),
            `plan "${p.slug}" references unknown workout "${ex.workoutSlug}"`
          ).toBe(true);
        }
      }
    }
  });

  it("every plan meal references a known recipe slug", () => {
    const valid = new Set(SEED_RECIPES.map((r) => r.slug));
    for (const p of SEED_PLANS) {
      for (const slot of [...p.trainingDayMeals, ...p.restDayMeals]) {
        expect(
          valid.has(slot.recipeSlug),
          `plan "${p.slug}" references unknown recipe "${slot.recipeSlug}"`
        ).toBe(true);
      }
    }
  });
});
