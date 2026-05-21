import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[id]/prs
 * Returns the latest PR per workout for this client, plus the workout
 * title for easy rendering. (We keep historic rows; this just rolls up.)
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;

  const client = await prisma.user.findFirst({
    where: { id: clientId, coachId: scope.coachId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  // Latest PR per workout. Done in JS because Prisma can't do
  // DISTINCT ON cleanly.
  const all = await prisma.personalRecord.findMany({
    where: { userId: clientId },
    include: { workout: { select: { id: true, title: true, slug: true, bodyPart: true, equipment: true } } },
    orderBy: [{ workoutId: "asc" }, { recordedAt: "desc" }],
  });
  const latestByWorkout = new Map<number, typeof all[number]>();
  for (const pr of all) {
    if (!latestByWorkout.has(pr.workoutId)) latestByWorkout.set(pr.workoutId, pr);
  }
  return NextResponse.json({ prs: Array.from(latestByWorkout.values()) });
}

/**
 * POST /api/admin/users/[id]/prs
 * Body: { workoutId, weightKg, reps?, notes? }
 *
 * Creates a new PR row (history-preserving — never updates a previous row).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: clientId } = await params;

  const client = await prisma.user.findFirst({
    where: { id: clientId, coachId: scope.coachId },
    select: { id: true },
  });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const body = (await request.json()) as {
    workoutId?: number;
    weightKg?: number;
    reps?: number;
    notes?: string | null;
  };
  if (!body.workoutId || !body.weightKg) {
    return NextResponse.json({ error: "workoutId and weightKg required" }, { status: 400 });
  }

  // Workout must belong to this coach.
  const workout = await prisma.workout.findFirst({
    where: { id: body.workoutId, coachId: scope.coachId },
    select: { id: true },
  });
  if (!workout) {
    return NextResponse.json({ error: "Workout not in your library" }, { status: 400 });
  }

  const pr = await prisma.personalRecord.create({
    data: {
      userId: clientId,
      workoutId: body.workoutId,
      weightKg: body.weightKg,
      reps: body.reps ?? 1,
      source: "coach",
      notes: body.notes ?? null,
    },
    include: { workout: { select: { id: true, title: true, slug: true, bodyPart: true, equipment: true } } },
  });

  return NextResponse.json({ pr });
}
