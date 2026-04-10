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

    // Separate days with meals from those without
    const daysWithMeals = days.filter(d => d.meals && d.meals.length > 0);
    const daysWithoutMeals = days.filter(d => !d.meals || d.meals.length === 0);

    // Delete existing days (cascade deletes PlanDayMeal records too)
    await prisma.planTemplateDay.deleteMany({ where: { templateId } });

    // Bulk create days without meals (fast)
    if (daysWithoutMeals.length > 0) {
      await prisma.planTemplateDay.createMany({
        data: daysWithoutMeals.map((d: DayInput) => ({
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

    // Create days with meals individually (needed for nested creates)
    for (const d of daysWithMeals) {
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
