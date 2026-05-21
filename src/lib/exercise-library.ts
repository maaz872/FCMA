/**
 * Wraps the bundled Free Exercise DB JSON dataset (MIT license,
 * https://github.com/yuhonas/free-exercise-db) and exposes typed
 * search / filter / lookup helpers.
 *
 * The JSON is committed at src/data/exercise-library.json (~1 MB,
 * 873 entries). Each entry has `images` paths relative to the upstream
 * repo's `exercises/` directory — we resolve those to absolute URLs
 * via `IMAGE_BASE_URL` so consumers can render without knowing the
 * upstream layout.
 *
 * The library categorises entries by raw `primaryMuscles` / `equipment`
 * strings from the dataset. The FCMA app uses a higher-level bodyPart
 * enum (chest|back|legs|shoulders|arms|core|full_body|cardio) and a
 * normalised equipment enum (bodyweight|dumbbell|barbell|kettlebell|
 * machine|cable|band|other). The mapping helpers below project the raw
 * fields into the app enums so the picker UI can filter by FCMA-native
 * categories while still showing the original muscle/equipment data.
 */

import rawLibrary from "@/data/exercise-library.json";

// ─── Types ──────────────────────────────────────────────────────────

/** Raw shape of a single entry as stored in exercise-library.json. */
export interface RawExerciseEntry {
  id: string;
  name: string;
  force: string | null;
  level: "beginner" | "intermediate" | "expert";
  mechanic: "compound" | "isolation" | null;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: string;
  /** Paths relative to the upstream `exercises/` dir, e.g. `Squat/0.jpg`. */
  images: string[];
}

/** App-facing body-part enum used throughout the seed/UI. */
export type AppBodyPart =
  | "chest"
  | "back"
  | "legs"
  | "shoulders"
  | "arms"
  | "core"
  | "full_body"
  | "cardio";

/** App-facing equipment enum used throughout the seed/UI. */
export type AppEquipment =
  | "bodyweight"
  | "dumbbell"
  | "barbell"
  | "kettlebell"
  | "machine"
  | "cable"
  | "band"
  | "other";

/**
 * Resolved entry returned by library queries — same fields as the raw
 * entry plus precomputed `imageUrls` (absolute) and `appBodyPart` /
 * `appEquipment` projections.
 */
export interface ExerciseLibraryEntry extends RawExerciseEntry {
  /** Absolute URLs to all illustration frames. */
  imageUrls: string[];
  /** First-frame URL — usually the canonical illustration. */
  primaryImageUrl: string | null;
  /** FCMA-native body-part categorisation. */
  appBodyPart: AppBodyPart;
  /** FCMA-native equipment categorisation. */
  appEquipment: AppEquipment;
}

export interface LibraryFilters {
  /** Free-text query — matched against name and instruction text. */
  query?: string;
  /** FCMA-native body part filter. */
  bodyPart?: AppBodyPart;
  /** FCMA-native equipment filter. */
  equipment?: AppEquipment;
  /** Difficulty filter. */
  level?: "beginner" | "intermediate" | "expert";
  /** Cap the number of results returned. */
  limit?: number;
}

// ─── Mapping tables ─────────────────────────────────────────────────

const MUSCLE_TO_BODYPART: Record<string, AppBodyPart> = {
  chest: "chest",
  lats: "back",
  "middle back": "back",
  "lower back": "back",
  traps: "back",
  neck: "back",
  quadriceps: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
  adductors: "legs",
  abductors: "legs",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  abdominals: "core",
};

const EQUIPMENT_NORMALISE: Record<string, AppEquipment> = {
  "body only": "bodyweight",
  dumbbell: "dumbbell",
  barbell: "barbell",
  kettlebells: "kettlebell",
  machine: "machine",
  cable: "cable",
  bands: "band",
  other: "other",
  "foam roll": "other",
  "medicine ball": "other",
  "exercise ball": "other",
  "e-z curl bar": "barbell",
};

const IMAGE_BASE_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

// ─── Resolution helpers ─────────────────────────────────────────────

/**
 * Project a raw `primaryMuscles[0]` + `category` into the FCMA bodyPart
 * enum. Cardio / plyometrics dominate the choice — they trump muscle
 * group because compound exercises like burpees are conditioning, not
 * "core" even though abdominals are listed.
 */
export function deriveAppBodyPart(entry: RawExerciseEntry): AppBodyPart {
  if (entry.category === "cardio" || entry.category === "plyometrics") {
    return "cardio";
  }
  const primary = entry.primaryMuscles[0];
  if (primary && MUSCLE_TO_BODYPART[primary]) {
    return MUSCLE_TO_BODYPART[primary];
  }
  // Compound lifts that involve many muscle groups fall back here.
  if (entry.mechanic === "compound") return "full_body";
  return "full_body";
}

export function deriveAppEquipment(entry: RawExerciseEntry): AppEquipment {
  if (!entry.equipment) return "other";
  return EQUIPMENT_NORMALISE[entry.equipment] ?? "other";
}

export function resolveImageUrl(relativePath: string): string {
  return IMAGE_BASE_URL + relativePath;
}

function resolve(entry: RawExerciseEntry): ExerciseLibraryEntry {
  const imageUrls = entry.images.map(resolveImageUrl);
  return {
    ...entry,
    imageUrls,
    primaryImageUrl: imageUrls[0] ?? null,
    appBodyPart: deriveAppBodyPart(entry),
    appEquipment: deriveAppEquipment(entry),
  };
}

// ─── Public API ─────────────────────────────────────────────────────

const LIBRARY: RawExerciseEntry[] = rawLibrary as RawExerciseEntry[];

/** Total number of entries in the dataset (873 at the time of writing). */
export const LIBRARY_SIZE = LIBRARY.length;

/** Look up a single entry by id. Returns `null` when no match. */
export function getExerciseLibraryEntry(
  id: string
): ExerciseLibraryEntry | null {
  if (!id) return null;
  const found = LIBRARY.find((e) => e.id === id);
  return found ? resolve(found) : null;
}

/**
 * Search + filter the library. Returns resolved entries (image URLs
 * already absolute, body-part/equipment projected to FCMA enums).
 *
 * - `query` matches case-insensitively against the entry name and
 *   joined instruction text.
 * - `bodyPart` / `equipment` use the FCMA enums (see deriveAppBodyPart /
 *   deriveAppEquipment).
 * - `limit` caps result count (default 100; pass 0 for unlimited).
 */
export function searchExerciseLibrary(
  filters: LibraryFilters = {}
): ExerciseLibraryEntry[] {
  const q = filters.query?.trim().toLowerCase();
  const limit = filters.limit ?? 100;

  const out: ExerciseLibraryEntry[] = [];
  for (const raw of LIBRARY) {
    if (filters.level && raw.level !== filters.level) continue;
    if (
      filters.bodyPart &&
      deriveAppBodyPart(raw) !== filters.bodyPart
    ) {
      continue;
    }
    if (
      filters.equipment &&
      deriveAppEquipment(raw) !== filters.equipment
    ) {
      continue;
    }
    if (q) {
      const nameMatch = raw.name.toLowerCase().includes(q);
      const instructionMatch = raw.instructions
        .join(" ")
        .toLowerCase()
        .includes(q);
      if (!nameMatch && !instructionMatch) continue;
    }
    out.push(resolve(raw));
    if (limit > 0 && out.length >= limit) break;
  }
  return out;
}

/**
 * Return every entry. Useful for the seeder, which picks 50 specific
 * exercises out of the full set.
 */
export function getAllExerciseLibraryEntries(): ExerciseLibraryEntry[] {
  return LIBRARY.map(resolve);
}
