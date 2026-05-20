import { NextRequest, NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import {
  searchExerciseLibrary,
  type AppBodyPart,
  type AppEquipment,
} from "@/lib/exercise-library";

export const dynamic = "force-dynamic";

const BODY_PARTS: ReadonlyArray<AppBodyPart> = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "arms",
  "core",
  "full_body",
  "cardio",
];
const EQUIPMENT: ReadonlyArray<AppEquipment> = [
  "bodyweight",
  "dumbbell",
  "barbell",
  "kettlebell",
  "machine",
  "cable",
  "band",
  "other",
];

/**
 * Coach-only proxy in front of the bundled Free Exercise DB. Keeps the
 * ~1 MB JSON server-side and lets the IllustrationPicker query by
 * search / bodyPart / equipment without bloating the client bundle.
 *
 * Query string:
 *   ?query=<text>
 *   ?bodyPart=chest|back|legs|shoulders|arms|core|full_body|cardio
 *   ?equipment=bodyweight|dumbbell|barbell|kettlebell|machine|cable|band|other
 *   ?level=beginner|intermediate|expert
 *   ?limit=<number>  (default 60, max 200)
 *
 * Returns `{ entries: ExerciseLibraryEntry[], total: number }` where
 * `total` is the post-filter unbounded count (so the UI can show
 * "showing N of M").
 */
export async function GET(request: NextRequest) {
  const scope = await requireCoach();
  if (!scope) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const rawBodyPart = sp.get("bodyPart");
  const rawEquipment = sp.get("equipment");
  const rawLevel = sp.get("level");
  const requestedLimit = Number(sp.get("limit") || "60");
  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 60, 1),
    200
  );

  const bodyPart =
    rawBodyPart && BODY_PARTS.includes(rawBodyPart as AppBodyPart)
      ? (rawBodyPart as AppBodyPart)
      : undefined;
  const equipment =
    rawEquipment && EQUIPMENT.includes(rawEquipment as AppEquipment)
      ? (rawEquipment as AppEquipment)
      : undefined;
  const level =
    rawLevel === "beginner" || rawLevel === "intermediate" || rawLevel === "expert"
      ? rawLevel
      : undefined;

  // Unbounded count for the "showing N of M" label.
  const fullResults = searchExerciseLibrary({
    query: sp.get("query") || undefined,
    bodyPart,
    equipment,
    level,
    limit: 0,
  });
  const entries = fullResults.slice(0, limit);

  return NextResponse.json({ entries, total: fullResults.length });
}
