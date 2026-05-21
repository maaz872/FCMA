/**
 * Static-shape tests for the seed content. Validates that the curated
 * lists in `workout-picks.ts`, `recipes.ts`, and `plans.ts` are
 * internally consistent: counts match expectations, slugs are unique,
 * cross-references resolve.
 *
 * These tests do NOT touch the database.
 */

import { describe, it, expect } from "vitest";
import { WORKOUT_PICKS } from "./workout-picks";
import { SEED_RECIPES } from "./recipes";
import { SEED_PLANS } from "./plans";

describe("workout-picks (HD-video curated library)", () => {
  it("contains exactly 22 picks", () => {
    expect(WORKOUT_PICKS.length).toBe(22);
  });

  it("body-part coverage", () => {
    const counts: Record<string, number> = {};
    for (const p of WORKOUT_PICKS) {
      counts[p.bodyPart] = (counts[p.bodyPart] ?? 0) + 1;
    }
    expect(counts.chest).toBe(3);
    expect(counts.back).toBe(4);
    expect(counts.legs).toBe(6);
    expect(counts.shoulders).toBe(2);
    expect(counts.arms).toBe(6);
    expect(counts.core).toBe(1);
  });

  it("every pick has a non-empty videoUrl", () => {
    for (const p of WORKOUT_PICKS) {
      expect(p.videoUrl, `pick "${p.slug}"`).toBeTruthy();
      expect(p.videoUrl.length, `pick "${p.slug}"`).toBeGreaterThan(10);
    }
  });

  it("slugs are unique", () => {
    const slugs = WORKOUT_PICKS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every pick has non-empty instructions", () => {
    for (const p of WORKOUT_PICKS) {
      expect(p.instructions.length, `pick "${p.slug}"`).toBeGreaterThan(0);
    }
  });
});

describe("seed recipes", () => {
  it("contains exactly 50 recipes", () => {
    expect(SEED_RECIPES.length).toBe(50);
  });

  it("meal-type distribution (breakfast 12, lunch 15, dinner 15, snacks 8)", () => {
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
    expect(buckets.lunch).toBe(15);
    expect(buckets.dinner).toBe(15);
    expect(buckets.snacks).toBe(8);
  });

  it("regional vs international ratio is roughly 60/40", () => {
    const regional = SEED_RECIPES.filter((r) => r.regional).length;
    const intl = SEED_RECIPES.length - regional;
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
      const kcalFromMacros = r.protein * 4 + r.carbs * 4 + r.fat * 9;
      const diff = Math.abs(r.calories - kcalFromMacros);
      expect(
        diff / r.calories,
        `recipe "${r.slug}" macros/calories mismatch (${diff} kcal)`,
      ).toBeLessThan(0.25);
    }
  });
});

describe("seed plans (3 HD-video curated plans)", () => {
  it("contains exactly 3 plan templates with expected slugs", () => {
    const slugs = SEED_PLANS.map((p) => p.slug);
    expect(slugs.sort()).toEqual(
      ["upper-lower-split", "arm-specialization", "8-week-foundation"].sort(),
    );
  });

  it("each plan has the expected duration and days/week", () => {
    const map = Object.fromEntries(SEED_PLANS.map((p) => [p.slug, p]));
    expect([map["upper-lower-split"].durationWeeks, map["upper-lower-split"].daysPerWeek]).toEqual([4, 3]);
    expect([map["arm-specialization"].durationWeeks, map["arm-specialization"].daysPerWeek]).toEqual([4, 3]);
    expect([map["8-week-foundation"].durationWeeks, map["8-week-foundation"].daysPerWeek]).toEqual([8, 3]);
  });

  it("every training day has 3-8 exercises (no empty days)", () => {
    for (const p of SEED_PLANS) {
      for (const td of p.trainingDays) {
        expect(td.exercises.length, `${p.slug}/${td.label}`).toBeGreaterThanOrEqual(3);
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
    const valid = new Set(WORKOUT_PICKS.map((p) => p.slug));
    for (const p of SEED_PLANS) {
      for (const td of p.trainingDays) {
        for (const ex of td.exercises) {
          expect(
            valid.has(ex.workoutSlug),
            `plan "${p.slug}" references unknown workout "${ex.workoutSlug}"`,
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
          `plan "${p.slug}" references unknown recipe "${slot.recipeSlug}"`,
        ).toBe(true);
      }
    }
  });
});
