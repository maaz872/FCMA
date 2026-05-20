import { describe, it, expect } from "vitest";
import {
  LIBRARY_SIZE,
  getExerciseLibraryEntry,
  getAllExerciseLibraryEntries,
  searchExerciseLibrary,
  deriveAppBodyPart,
  deriveAppEquipment,
  resolveImageUrl,
} from "./exercise-library";

describe("exercise-library — dataset integrity", () => {
  it("ships a non-trivial dataset", () => {
    expect(LIBRARY_SIZE).toBeGreaterThan(500);
  });

  it("returns every entry resolved with absolute image URLs", () => {
    const all = getAllExerciseLibraryEntries();
    expect(all.length).toBe(LIBRARY_SIZE);
    for (const e of all) {
      expect(typeof e.id).toBe("string");
      for (const url of e.imageUrls) {
        expect(url).toMatch(
          /^https:\/\/raw\.githubusercontent\.com\/yuhonas\/free-exercise-db\/main\/exercises\//
        );
      }
    }
  });

  it("every entry has a valid app body part and equipment", () => {
    const all = getAllExerciseLibraryEntries();
    const bodyParts = new Set([
      "chest",
      "back",
      "legs",
      "shoulders",
      "arms",
      "core",
      "full_body",
      "cardio",
    ]);
    const equipment = new Set([
      "bodyweight",
      "dumbbell",
      "barbell",
      "kettlebell",
      "machine",
      "cable",
      "band",
      "other",
    ]);
    for (const e of all) {
      expect(bodyParts.has(e.appBodyPart)).toBe(true);
      expect(equipment.has(e.appEquipment)).toBe(true);
    }
  });
});

describe("getExerciseLibraryEntry", () => {
  it("returns null for empty / unknown id", () => {
    expect(getExerciseLibraryEntry("")).toBeNull();
    expect(getExerciseLibraryEntry("totally-not-an-exercise")).toBeNull();
  });

  it("returns a resolved entry for a known id", () => {
    const e = getExerciseLibraryEntry("3_4_Sit-Up");
    expect(e).not.toBeNull();
    expect(e!.name).toBe("3/4 Sit-Up");
    expect(e!.appBodyPart).toBe("core");
    expect(e!.primaryImageUrl).toMatch(/3_4_Sit-Up\/0\.jpg$/);
  });
});

describe("searchExerciseLibrary — filters", () => {
  it("filters by app body part", () => {
    const chest = searchExerciseLibrary({ bodyPart: "chest", limit: 50 });
    expect(chest.length).toBeGreaterThan(0);
    for (const e of chest) {
      expect(e.appBodyPart).toBe("chest");
    }
  });

  it("filters by equipment (bodyweight only)", () => {
    const bw = searchExerciseLibrary({ equipment: "bodyweight", limit: 50 });
    expect(bw.length).toBeGreaterThan(0);
    for (const e of bw) {
      expect(e.appEquipment).toBe("bodyweight");
    }
  });

  it("combines bodyPart + equipment filters", () => {
    const results = searchExerciseLibrary({
      bodyPart: "core",
      equipment: "bodyweight",
      limit: 200,
    });
    expect(results.length).toBeGreaterThan(0);
    for (const e of results) {
      expect(e.appBodyPart).toBe("core");
      expect(e.appEquipment).toBe("bodyweight");
    }
  });

  it("filters by level", () => {
    const beginner = searchExerciseLibrary({ level: "beginner", limit: 20 });
    for (const e of beginner) {
      expect(e.level).toBe("beginner");
    }
  });
});

describe("searchExerciseLibrary — text query", () => {
  it("matches on name (case-insensitive)", () => {
    const results = searchExerciseLibrary({ query: "squat", limit: 50 });
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((e) => e.name.toLowerCase().includes("squat"))
    ).toBe(true);
  });

  it("matches inside instructions", () => {
    const results = searchExerciseLibrary({
      query: "dumbbell",
      bodyPart: "chest",
      limit: 50,
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns no results for a nonsense query", () => {
    const results = searchExerciseLibrary({ query: "zzzqqqxxx" });
    expect(results.length).toBe(0);
  });

  it("honors limit", () => {
    const five = searchExerciseLibrary({ query: "press", limit: 5 });
    expect(five.length).toBeLessThanOrEqual(5);
  });

  it("limit=0 returns everything matching", () => {
    const all = searchExerciseLibrary({
      bodyPart: "shoulders",
      limit: 0,
    });
    const fifty = searchExerciseLibrary({
      bodyPart: "shoulders",
      limit: 50,
    });
    expect(all.length).toBeGreaterThan(fifty.length);
  });
});

describe("derivation helpers", () => {
  it("deriveAppBodyPart prefers cardio category over primary muscle", () => {
    const part = deriveAppBodyPart({
      id: "x",
      name: "x",
      force: null,
      level: "beginner",
      mechanic: null,
      equipment: null,
      primaryMuscles: ["abdominals"],
      secondaryMuscles: [],
      instructions: [],
      category: "cardio",
      images: [],
    });
    expect(part).toBe("cardio");
  });

  it("deriveAppEquipment maps body-only to bodyweight", () => {
    const eq = deriveAppEquipment({
      id: "x",
      name: "x",
      force: null,
      level: "beginner",
      mechanic: null,
      equipment: "body only",
      primaryMuscles: [],
      secondaryMuscles: [],
      instructions: [],
      category: "strength",
      images: [],
    });
    expect(eq).toBe("bodyweight");
  });

  it("deriveAppEquipment maps unknown equipment to other", () => {
    const eq = deriveAppEquipment({
      id: "x",
      name: "x",
      force: null,
      level: "beginner",
      mechanic: null,
      equipment: "unicycle",
      primaryMuscles: [],
      secondaryMuscles: [],
      instructions: [],
      category: "strength",
      images: [],
    });
    expect(eq).toBe("other");
  });

  it("resolveImageUrl returns the upstream raw URL", () => {
    expect(resolveImageUrl("Squat/0.jpg")).toBe(
      "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Squat/0.jpg"
    );
  });
});
