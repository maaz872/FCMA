import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

interface CustomDay {
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
}

export async function POST(request: Request) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const body = await request.json();
    const { userId, templateId, name, description, type, startDate, customDays } = body;

    if (!userId || !name || !startDate) {
      return NextResponse.json(
        { error: "userId, name, and startDate are required" },
        { status: 400 }
      );
    }

    // Verify user exists AND belongs to this coach
    const targetUser = await prisma.user.findFirst({ where: { id: userId, coachId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let daysToCreate: CustomDay[] = [];
    let planType = type || "combined";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let templateDaysWithMeals: any[] = [];

    if (templateId) {
      // Verify template belongs to this coach
      const template = await prisma.planTemplate.findFirst({
        where: { id: parseInt(templateId), coachId },
        include: { days: { include: { meals: true } } },
      });
      if (!template) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
      planType = type || template.type;
      templateDaysWithMeals = template.days;
      daysToCreate = template.days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        weekNumber: d.weekNumber,
        workoutId: d.workoutId,
        workoutNotes: d.workoutNotes,
        mealPlan: d.mealPlan,
        calorieTarget: d.calorieTarget,
        proteinTarget: d.proteinTarget,
        carbsTarget: d.carbsTarget,
        fatTarget: d.fatTarget,
        notes: d.notes,
      }));
    } else if (customDays && Array.isArray(customDays)) {
      daysToCreate = customDays;
    }

    // Create ClientPlan
    const clientPlan = await prisma.clientPlan.create({
      data: {
        userId,
        templateId: templateId ? parseInt(templateId) : null,
        name,
        description: description || null,
        type: planType,
        startDate: new Date(startDate),
        status: "active",
      },
    });

    // Create ClientPlanDays (with nested meals if from template)
    if (daysToCreate.length > 0) {
      for (let i = 0; i < daysToCreate.length; i++) {
        const d = daysToCreate[i];
        // Get meals from template day if available
        const templateDay = templateDaysWithMeals[i];
        const mealsToCreate = templateDay?.meals?.length
          ? templateDay.meals.map((m: { mealType: string; recipeId: number; servings: number; sortOrder: number }) => ({
              mealType: m.mealType,
              recipeId: m.recipeId,
              servings: m.servings,
              sortOrder: m.sortOrder,
            }))
          : [];

        await prisma.clientPlanDay.create({
          data: {
            clientPlanId: clientPlan.id,
            dayOfWeek: d.dayOfWeek,
            weekNumber: d.weekNumber || 1,
            workoutId: d.workoutId || null,
            workoutNotes: d.workoutNotes || null,
            mealPlan: d.mealPlan || null,
            calorieTarget: d.calorieTarget || null,
            proteinTarget: d.proteinTarget || null,
            carbsTarget: d.carbsTarget || null,
            fatTarget: d.fatTarget || null,
            notes: d.notes || null,
            meals: mealsToCreate.length > 0 ? { create: mealsToCreate } : undefined,
          },
        });
      }
    }

    // Update user.activePlanId
    await prisma.user.update({
      where: { id: userId },
      data: { activePlanId: clientPlan.id },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        title: "New Plan Assigned",
        message: `Coach assigned you a new plan: ${name}`,
        type: "plan",
        actionUrl: "/hub/my-plan",
      },
    });

    return NextResponse.json(clientPlan);
  } catch (error) {
    console.error("Assign plan error:", error);
    return NextResponse.json(
      { error: "Failed to assign plan" },
      { status: 500 }
    );
  }
}
