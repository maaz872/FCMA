import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const templates = await prisma.planTemplate.findMany({
      where: { coachId },
      include: { _count: { select: { days: true } } },
      orderBy: { createdAt: "desc" },
    });

    const result = templates.map(
      (t: {
        id: number;
        name: string;
        description: string | null;
        type: string;
        durationWeeks: number;
        createdAt: Date;
        updatedAt: Date;
        _count: { days: number };
      }) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        type: t.type,
        durationWeeks: t.durationWeeks,
        dayCount: t._count.days,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get plan templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const body = await request.json();
    const { name, description, type, durationWeeks, duplicateId } = body;

    // ── Duplicate existing template ──
    if (duplicateId) {
      // Verify source template belongs to this coach
      const source = await prisma.planTemplate.findFirst({
        where: { id: parseInt(duplicateId), coachId },
        include: { days: { include: { meals: true } } },
      });
      if (!source) {
        return NextResponse.json({ error: "Source template not found" }, { status: 404 });
      }

      const newTemplate = await prisma.planTemplate.create({
        data: {
          name: name || `${source.name} (Copy)`,
          description: source.description,
          type: source.type,
          durationWeeks: source.durationWeeks,
          coachId,
        },
      });

      // Copy all days with meals
      for (const day of source.days) {
        await prisma.planTemplateDay.create({
          data: {
            templateId: newTemplate.id,
            dayOfWeek: day.dayOfWeek,
            weekNumber: day.weekNumber,
            workoutId: day.workoutId,
            workoutNotes: day.workoutNotes,
            mealPlan: day.mealPlan,
            calorieTarget: day.calorieTarget,
            proteinTarget: day.proteinTarget,
            carbsTarget: day.carbsTarget,
            fatTarget: day.fatTarget,
            notes: day.notes,
            meals: day.meals.length > 0 ? {
              create: day.meals.map((m) => ({
                mealType: m.mealType,
                recipeId: m.recipeId,
                servings: m.servings,
                sortOrder: m.sortOrder,
              })),
            } : undefined,
          },
        });
      }

      return NextResponse.json(newTemplate);
    }

    // ── Create new empty template ──
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const template = await prisma.planTemplate.create({
      data: {
        name,
        description: description || null,
        type: type || "combined",
        durationWeeks: parseInt(durationWeeks) || 4,
        coachId,
      },
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error("Create plan template error:", error);
    return NextResponse.json(
      { error: "Failed to create plan template" },
      { status: 500 }
    );
  }
}
