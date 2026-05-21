import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface Body {
  /** PlanTemplate-side workout id this rule targets. */
  workoutId: number;
  /** Restrict the rule to a single dayOfWeek (1-7) — usually how a movement is scheduled. */
  dayOfWeek: number;
  /** kg for week 1 (or for whatever week 1 of the rule means). */
  startKg: number;
  /** Increment per week. Use 0 for "same weight every week" (handy for accessories). */
  incrementKg: number;
  /** Optional deload week — replaces the linear value with deloadKg. */
  deloadWeek?: number | null;
  deloadKg?: number | null;
}

/**
 * POST /api/admin/plans/[id]/progression
 *
 * Bulk-set the weightKg across every week of the template for a given
 * (workoutId, dayOfWeek) pair. Coach picks the rule in the editor;
 * server materialises it into the existing PlanExercise rows.
 *
 * No schema change needed — this is a one-shot mutation of existing rows.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: rawId } = await params;
  const templateId = parseInt(rawId);
  if (!Number.isFinite(templateId)) {
    return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
  }

  // Template must belong to this coach.
  const template = await prisma.planTemplate.findFirst({
    where: { id: templateId, coachId: scope.coachId },
    select: { id: true },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const body = (await request.json()) as Body;
  if (!body.workoutId || !body.dayOfWeek || body.startKg == null || body.incrementKg == null) {
    return NextResponse.json({ error: "workoutId, dayOfWeek, startKg, incrementKg required" }, { status: 400 });
  }
  if (body.dayOfWeek < 1 || body.dayOfWeek > 7) {
    return NextResponse.json({ error: "dayOfWeek must be 1..7" }, { status: 400 });
  }

  // Workout must belong to this coach.
  const workout = await prisma.workout.findFirst({
    where: { id: body.workoutId, coachId: scope.coachId },
    select: { id: true },
  });
  if (!workout) {
    return NextResponse.json({ error: "Workout not in your library" }, { status: 400 });
  }

  // Walk every PlanExercise in this template whose day matches dayOfWeek
  // and that targets this workout.
  const exercises = await prisma.planExercise.findMany({
    where: {
      workoutId: body.workoutId,
      templateDay: {
        templateId: templateId,
        dayOfWeek: body.dayOfWeek,
      },
    },
    include: { templateDay: { select: { weekNumber: true } } },
  });

  if (exercises.length === 0) {
    return NextResponse.json({ error: "No matching exercises in this template" }, { status: 404 });
  }

  let touched = 0;
  for (const ex of exercises) {
    const week = ex.templateDay?.weekNumber ?? 1;
    let weightKg: number;
    if (body.deloadWeek && week === body.deloadWeek && body.deloadKg != null) {
      weightKg = body.deloadKg;
    } else {
      weightKg = body.startKg + (week - 1) * body.incrementKg;
    }
    // Round to nearest 0.5 kg for sane plate selection.
    weightKg = Math.round(weightKg * 2) / 2;
    await prisma.planExercise.update({
      where: { id: ex.id },
      data: { weightKg },
    });
    touched++;
  }

  return NextResponse.json({ success: true, touched });
}
