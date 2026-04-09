import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dateParam = request.nextUrl.searchParams.get("date");

    // Find active plan (lightweight — no days loaded)
    const plan = await prisma.clientPlan.findFirst({
      where: { userId: user.userId, status: "active" },
      select: {
        id: true, name: true, type: true, startDate: true,
        days: { select: { weekNumber: true } }, // only for maxWeek calc
      },
    });

    if (!plan) {
      return NextResponse.json({ plan: null });
    }

    const startDate = new Date(plan.startDate);
    const now = new Date();

    // "Today" always refers to the actual current date
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayDiffMs = todayDate.getTime() - startDate.getTime();
    const todayDiffDays = Math.floor(todayDiffMs / (1000 * 60 * 60 * 24));
    const todayWeekNumber = Math.floor(todayDiffDays / 7) + 1;
    const todayJsDay = todayDate.getDay();
    const todayDayOfWeek = todayJsDay === 0 ? 7 : todayJsDay;

    // Target date
    const targetDate = dateParam ? new Date(dateParam + "T00:00:00") : todayDate;
    const targetDiffMs = targetDate.getTime() - startDate.getTime();
    const targetDiffDays = Math.floor(targetDiffMs / (1000 * 60 * 60 * 24));
    const targetWeekNumber = Math.floor(targetDiffDays / 7) + 1;
    const targetJsDay = targetDate.getDay();
    const targetDayOfWeek = targetJsDay === 0 ? 7 : targetJsDay;

    const maxWeek = plan.days.reduce((max, d) => Math.max(max, d.weekNumber), 1);

    // Clamp week number so days past the plan end still show the last week's schedule
    const clampedWeek = Math.min(Math.max(targetWeekNumber, 1), maxWeek);

    // Fetch ONLY the target day (not all 56 days)
    const targetPlanDay = await prisma.clientPlanDay.findFirst({
      where: {
        clientPlanId: plan.id,
        weekNumber: clampedWeek,
        dayOfWeek: targetDayOfWeek,
      },
      include: {
        workout: {
          select: { id: true, title: true, videoUrl: true, description: true, slug: true },
        },
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
    });

    // Get target date progress
    const targetStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 1);

    const targetProgress = await prisma.dailyProgress.findFirst({
      where: {
        userId: user.userId,
        clientPlanId: plan.id,
        date: { gte: targetStart, lt: targetEnd },
      },
    });

    // Get the TARGET WEEK's progress (Mon-Sun)
    const targetMondayOffset = targetDayOfWeek - 1;
    const weekStart = new Date(targetStart);
    weekStart.setDate(weekStart.getDate() - targetMondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekProgress = await prisma.dailyProgress.findMany({
      where: {
        userId: user.userId,
        clientPlanId: plan.id,
        date: { gte: weekStart, lt: weekEnd },
      },
      orderBy: { date: "asc" },
    });

    // Parse mealPlan JSON
    let mealPlan = null;
    if (targetPlanDay?.mealPlan) {
      try {
        mealPlan = typeof targetPlanDay.mealPlan === "string"
          ? JSON.parse(targetPlanDay.mealPlan)
          : targetPlanDay.mealPlan;
      } catch {
        mealPlan = targetPlanDay.mealPlan;
      }
    }

    const targetStr = targetStart.toISOString().split("T")[0];
    const todayStr = todayDate.toISOString().split("T")[0];
    const viewMode = targetStr === todayStr ? "today" : targetStart < todayDate ? "past" : "future";

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        startDate: plan.startDate,
        weekNumber: targetWeekNumber,
        dayOfWeek: targetDayOfWeek,
        totalWeeks: maxWeek,
        todayWeekNumber,
        todayDayOfWeek,
      },
      viewMode,
      selectedDate: targetStr,
      today: {
        workout: targetPlanDay?.workout || null,
        mealPlan,
        meals: (targetPlanDay?.meals || []).map((m) => ({
          id: m.id,
          mealType: m.mealType,
          servings: m.servings,
          sortOrder: m.sortOrder,
          recipe: m.recipe,
        })),
        calorieTarget: targetPlanDay?.calorieTarget || null,
        proteinTarget: targetPlanDay?.proteinTarget || null,
        carbsTarget: targetPlanDay?.carbsTarget || null,
        fatTarget: targetPlanDay?.fatTarget || null,
        notes: targetPlanDay?.notes || null,
        workoutNotes: targetPlanDay?.workoutNotes || null,
      },
      todayProgress: targetProgress
        ? {
            workoutCompleted: targetProgress.workoutCompleted,
            breakfastCompleted: targetProgress.breakfastCompleted,
            lunchCompleted: targetProgress.lunchCompleted,
            snackCompleted: targetProgress.snackCompleted,
            dinnerCompleted: targetProgress.dinnerCompleted,
          }
        : { workoutCompleted: false, breakfastCompleted: false, lunchCompleted: false, snackCompleted: false, dinnerCompleted: false },
      weekProgress: weekProgress.map((p) => ({
        date: p.date,
        workoutCompleted: p.workoutCompleted,
        breakfastCompleted: p.breakfastCompleted,
        lunchCompleted: p.lunchCompleted,
        snackCompleted: p.snackCompleted,
        dinnerCompleted: p.dinnerCompleted,
      })),
    });
  } catch (error) {
    console.error("Plan GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
