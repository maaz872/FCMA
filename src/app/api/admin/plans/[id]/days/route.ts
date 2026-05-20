import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const templateId = parseInt(id);

    // Verify the template belongs to this coach
    const template = await prisma.planTemplate.findFirst({
      where: { id: templateId, coachId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const days = await prisma.planTemplateDay.findMany({
      where: { templateId },
      include: {
        workout: { select: { id: true, title: true, slug: true } },
        meals: {
          include: {
            recipe: {
              select: {
                id: true, title: true, slug: true, imageUrl: true,
                calories: true, protein: true, carbs: true, fat: true, servings: true,
              },
            },
          },
          orderBy: [{ mealType: "asc" }, { sortOrder: "asc" }],
        },
      },
      orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
    });

    return NextResponse.json(days);
  } catch (error) {
    console.error("Get template days error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template days" },
      { status: 500 }
    );
  }
}

interface MealInput {
  mealType: string;
  recipeId: number;
  servings?: number;
  sortOrder?: number;
}

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

interface DayInput {
  dayOfWeek: number;
  weekNumber: number;
  workoutId?: number | null;
  workoutNotes?: string | null;
  mealPlan?: string | null;
  calorieTarget?: number | null;
  proteinTarget?: number | null;
  carbsTarget?: number | null;
  fatTarget?: number | null;
  notes?: string | null;
  meals?: MealInput[];
  exercises?: ExerciseInput[];
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const templateId = parseInt(id);
    const body = await request.json();
    const { days } = body as { days: DayInput[] };

    if (!days || !Array.isArray(days)) {
      return NextResponse.json(
        { error: "days array is required" },
        { status: 400 }
      );
    }

    // Verify template belongs to this coach
    const template = await prisma.planTemplate.findFirst({
      where: { id: templateId, coachId },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // ── Cross-coach FK validation (fixes PROJECT-REFERENCE.md gotcha #23) ──
    // Collect every workoutId and recipeId mentioned anywhere in the payload
    // and confirm in one shot that they all belong to this coach.
    const workoutIds = new Set<number>();
    const recipeIds = new Set<number>();
    for (const d of days) {
      if (d.workoutId) workoutIds.add(d.workoutId);
      for (const ex of d.exercises ?? []) {
        if (ex.workoutId) workoutIds.add(ex.workoutId);
      }
      for (const m of d.meals ?? []) {
        if (m.recipeId) recipeIds.add(m.recipeId);
      }
    }
    if (workoutIds.size > 0) {
      const ownedWorkouts = await prisma.workout.findMany({
        where: { id: { in: Array.from(workoutIds) }, coachId },
        select: { id: true },
      });
      if (ownedWorkouts.length !== workoutIds.size) {
        return NextResponse.json(
          { error: "One or more referenced workouts don't belong to your library" },
          { status: 400 }
        );
      }
    }
    if (recipeIds.size > 0) {
      const ownedRecipes = await prisma.recipe.findMany({
        where: { id: { in: Array.from(recipeIds) }, coachId },
        select: { id: true },
      });
      if (ownedRecipes.length !== recipeIds.size) {
        return NextResponse.json(
          { error: "One or more referenced recipes don't belong to your library" },
          { status: 400 }
        );
      }
    }

    // Delete existing days (cascade deletes PlanDayMeal + PlanExercise rows).
    await prisma.planTemplateDay.deleteMany({ where: { templateId } });

    // Days without nested data → bulk createMany (fastest path).
    const isPlain = (d: DayInput) =>
      (!d.meals || d.meals.length === 0) &&
      (!d.exercises || d.exercises.length === 0);
    const daysPlain = days.filter(isPlain);
    const daysWithNested = days.filter((d) => !isPlain(d));

    if (daysPlain.length > 0) {
      await prisma.planTemplateDay.createMany({
        data: daysPlain.map((d: DayInput) => ({
          templateId,
          dayOfWeek: d.dayOfWeek,
          weekNumber: d.weekNumber || 1,
          workoutId: d.workoutId ?? null,
          workoutNotes: d.workoutNotes || null,
          mealPlan: d.mealPlan || null,
          calorieTarget: d.calorieTarget ?? null,
          proteinTarget: d.proteinTarget ?? null,
          carbsTarget: d.carbsTarget ?? null,
          fatTarget: d.fatTarget ?? null,
          notes: d.notes || null,
        })),
      });
    }

    // Days with nested meals and/or exercises — one create per day so we can
    // nest both relations in a single round trip.
    for (const d of daysWithNested) {
      const exerciseRows = (d.exercises ?? []).map((ex, idx) => ({
        workoutId: ex.workoutId,
        orderIndex: ex.orderIndex ?? idx,
        sets: ex.sets ?? null,
        repsLow: ex.repsLow ?? null,
        repsHigh: ex.repsHigh ?? null,
        durationSeconds: ex.durationSeconds ?? null,
        restSeconds: ex.restSeconds ?? 60,
        weightKg: ex.weightKg ?? null,
        notes: ex.notes ?? null,
      }));

      await prisma.planTemplateDay.create({
        data: {
          templateId,
          dayOfWeek: d.dayOfWeek,
          weekNumber: d.weekNumber || 1,
          workoutId: d.workoutId ?? null,
          workoutNotes: d.workoutNotes || null,
          mealPlan: d.mealPlan || null,
          calorieTarget: d.calorieTarget ?? null,
          proteinTarget: d.proteinTarget ?? null,
          carbsTarget: d.carbsTarget ?? null,
          fatTarget: d.fatTarget ?? null,
          notes: d.notes || null,
          meals: {
            create: (d.meals || []).map((m, idx) => ({
              mealType: m.mealType,
              recipeId: m.recipeId,
              servings: m.servings || 1,
              sortOrder: m.sortOrder ?? idx,
            })),
          },
          exercises: exerciseRows.length
            ? { create: exerciseRows }
            : undefined,
        },
      });
    }

    return NextResponse.json({ success: true, count: days.length });
  } catch (error) {
    console.error("Set template days error:", error);
    return NextResponse.json(
      { error: "Failed to set template days" },
      { status: 500 }
    );
  }
}
