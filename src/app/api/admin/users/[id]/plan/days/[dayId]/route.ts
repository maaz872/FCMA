import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

interface ExerciseInput {
  workoutId: number;
  orderIndex?: number;
  sets?: number | null;
  repsLow?: number | null;
  repsHigh?: number | null;
  durationSeconds?: number | null;
  restSeconds?: number | null;
  weightKg?: number | null;
  notes?: string | null;
}
interface MealInput {
  mealType: string;
  recipeId: number;
  servings?: number;
  sortOrder?: number;
}

interface DayInput {
  workoutNotes?: string | null;
  mealPlan?: string | null;
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  carbsTarget?: number | null;
  fatTarget?: number | null;
  notes?: string | null;
  exercises?: ExerciseInput[];
  meals?: MealInput[];
}

/**
 * PUT /api/admin/users/[id]/plan/days/[dayId]
 *
 * Updates a single ClientPlanDay in the user's active plan — exercises,
 * meals, targets, notes. Crucially writes to ClientPlanDay /
 * PlanExercise / PlanDayMeal rows on the CLIENT side; the source
 * PlanTemplate is NOT touched, so the template stays canonical and the
 * coach can freely customise each client's assigned plan.
 *
 * Guards:
 *   - requireCoach() — must be a COACH
 *   - target user must belong to this coach
 *   - target ClientPlanDay must belong to a ClientPlan owned by this user
 *   - all referenced workoutId/recipeId must belong to this coach (fixes
 *     gotcha #23 on the client-plan path too)
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; dayId: string }> },
) {
  try {
    const scope = await requireCoach();
    if (!scope) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { coachId } = scope;
    const { id: userId, dayId: rawDayId } = await params;
    const dayId = parseInt(rawDayId);
    if (!Number.isFinite(dayId)) {
      return NextResponse.json({ error: "Invalid dayId" }, { status: 400 });
    }

    // Verify user belongs to this coach.
    const user = await prisma.user.findFirst({
      where: { id: userId, coachId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the day belongs to a ClientPlan owned by this user.
    const day = await prisma.clientPlanDay.findUnique({
      where: { id: dayId },
      include: { clientPlan: { select: { userId: true } } },
    });
    if (!day || day.clientPlan.userId !== userId) {
      return NextResponse.json({ error: "Day not found" }, { status: 404 });
    }

    const body = (await request.json()) as DayInput;

    // Cross-coach FK validation
    const workoutIds = new Set<number>();
    const recipeIds = new Set<number>();
    for (const ex of body.exercises ?? []) {
      if (ex.workoutId) workoutIds.add(ex.workoutId);
    }
    for (const m of body.meals ?? []) {
      if (m.recipeId) recipeIds.add(m.recipeId);
    }
    if (workoutIds.size > 0) {
      const owned = await prisma.workout.findMany({
        where: { id: { in: Array.from(workoutIds) }, coachId },
        select: { id: true },
      });
      if (owned.length !== workoutIds.size) {
        return NextResponse.json(
          { error: "One or more workouts don't belong to your library" },
          { status: 400 },
        );
      }
    }
    if (recipeIds.size > 0) {
      const owned = await prisma.recipe.findMany({
        where: { id: { in: Array.from(recipeIds) }, coachId },
        select: { id: true },
      });
      if (owned.length !== recipeIds.size) {
        return NextResponse.json(
          { error: "One or more recipes don't belong to your library" },
          { status: 400 },
        );
      }
    }

    // Update day-level fields (partial: only set what's in body).
    const dayPatch: Record<string, unknown> = {};
    for (const k of [
      "workoutNotes",
      "mealPlan",
      "calorieTarget",
      "proteinTarget",
      "carbsTarget",
      "fatTarget",
      "notes",
    ] as const) {
      if (k in body) dayPatch[k] = (body as Record<string, unknown>)[k] ?? null;
    }
    if (Object.keys(dayPatch).length > 0) {
      await prisma.clientPlanDay.update({ where: { id: dayId }, data: dayPatch });
    }

    // Replace exercises if the body included an exercises array.
    if (body.exercises !== undefined) {
      await prisma.planExercise.deleteMany({ where: { clientDayId: dayId } });
      if (body.exercises.length > 0) {
        await prisma.planExercise.createMany({
          data: body.exercises.map((ex, idx) => ({
            clientDayId: dayId,
            workoutId: ex.workoutId,
            orderIndex: ex.orderIndex ?? idx,
            sets: ex.sets ?? null,
            repsLow: ex.repsLow ?? null,
            repsHigh: ex.repsHigh ?? null,
            durationSeconds: ex.durationSeconds ?? null,
            restSeconds: ex.restSeconds ?? 60,
            weightKg: ex.weightKg ?? null,
            notes: ex.notes ?? null,
          })),
        });
      }
    }

    // Replace meals if the body included a meals array.
    if (body.meals !== undefined) {
      await prisma.planDayMeal.deleteMany({ where: { clientDayId: dayId } });
      if (body.meals.length > 0) {
        await prisma.planDayMeal.createMany({
          data: body.meals.map((m, idx) => ({
            clientDayId: dayId,
            mealType: m.mealType,
            recipeId: m.recipeId,
            servings: m.servings ?? 1,
            sortOrder: m.sortOrder ?? idx,
          })),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update client-plan day error:", error);
    return NextResponse.json(
      { error: "Failed to update day" },
      { status: 500 },
    );
  }
}
