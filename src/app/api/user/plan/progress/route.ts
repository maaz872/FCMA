import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyAdmin } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workoutCompleted, breakfastCompleted, lunchCompleted, snackCompleted, dinnerCompleted } = body;

    // Find active plan with today's day (need recipes for auto-logging)
    const plan = await prisma.clientPlan.findFirst({
      where: { userId: user.userId, status: "active" },
      include: {
        days: {
          include: {
            meals: {
              include: { recipe: { select: { title: true, calories: true, protein: true, carbs: true, fat: true, servings: true } } },
            },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "No active plan" }, { status: 404 });
    }

    // Today's date
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // Calculate current week/day to find today's plan day
    const startDate = new Date(plan.startDate);
    const diffMs = todayStart.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffDays / 7) + 1;
    const jsDay = todayStart.getDay();
    const dayOfWeek = jsDay === 0 ? 7 : jsDay;

    const todayPlanDay = plan.days.find(d => d.weekNumber === weekNumber && d.dayOfWeek === dayOfWeek);

    // Build upsert data
    const updateData: Record<string, boolean> = {};
    if (workoutCompleted !== undefined) updateData.workoutCompleted = workoutCompleted;
    if (breakfastCompleted !== undefined) updateData.breakfastCompleted = breakfastCompleted;
    if (lunchCompleted !== undefined) updateData.lunchCompleted = lunchCompleted;
    if (snackCompleted !== undefined) updateData.snackCompleted = snackCompleted;
    if (dinnerCompleted !== undefined) updateData.dinnerCompleted = dinnerCompleted;

    const progress = await prisma.dailyProgress.upsert({
      where: {
        userId_clientPlanId_date: {
          userId: user.userId,
          clientPlanId: plan.id,
          date: todayStart,
        },
      },
      update: updateData,
      create: {
        userId: user.userId,
        clientPlanId: plan.id,
        date: todayStart,
        workoutCompleted: workoutCompleted || false,
        breakfastCompleted: breakfastCompleted || false,
        lunchCompleted: lunchCompleted || false,
        snackCompleted: snackCompleted || false,
        dinnerCompleted: dinnerCompleted || false,
      },
    });

    // ── Auto-log planned meals when marked done, remove when unmarked ──
    const mealFields = [
      { field: "breakfastCompleted", mealType: "Breakfast", value: breakfastCompleted },
      { field: "lunchCompleted", mealType: "Lunch", value: lunchCompleted },
      { field: "snackCompleted", mealType: "Snack", value: snackCompleted },
      { field: "dinnerCompleted", mealType: "Dinner", value: dinnerCompleted },
    ];

    for (const { mealType, value } of mealFields) {
      if (value === undefined) continue; // Field wasn't sent

      // Get recipes for this meal type from today's plan day
      const planMeals = todayPlanDay?.meals?.filter(m => m.mealType === mealType.toLowerCase()) || [];

      if (value === true && planMeals.length > 0) {
        // Mark done → create meal log with combined recipe data
        // Check if already logged (avoid duplicates)
        const existingLog = await prisma.mealLog.findFirst({
          where: {
            userId: user.userId,
            mealType,
            loggedDate: todayStart,
            description: { startsWith: "[Plan] " },
          },
        });

        if (!existingLog) {
          // Combine all recipes into one log entry
          const names = planMeals.map(m => m.recipe.title).join(" + ");
          let totalCal = 0, totalPro = 0, totalCarbs = 0, totalFat = 0;
          for (const m of planMeals) {
            const mult = m.servings / (m.recipe.servings || 1);
            totalCal += Math.round(m.recipe.calories * mult);
            totalPro += m.recipe.protein * mult;
            totalCarbs += m.recipe.carbs * mult;
            totalFat += m.recipe.fat * mult;
          }

          await prisma.mealLog.create({
            data: {
              userId: user.userId,
              mealType,
              description: `[Plan] ${names}`,
              calories: totalCal,
              protein: Math.round(totalPro * 10) / 10,
              carbs: Math.round(totalCarbs * 10) / 10,
              fat: Math.round(totalFat * 10) / 10,
              loggedDate: todayStart,
              loggedTime: nowTime,
            },
          });
        }
      } else if (value === false) {
        // Un-mark → delete auto-logged entry
        await prisma.mealLog.deleteMany({
          where: {
            userId: user.userId,
            mealType,
            loggedDate: todayStart,
            description: { startsWith: "[Plan] " },
          },
        });
      }
    }

    // Send admin notifications
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { firstName: true },
    });
    const firstName = userData?.firstName || "A client";

    const allMealsDone = progress.breakfastCompleted && progress.lunchCompleted && progress.snackCompleted && progress.dinnerCompleted;

    if (progress.workoutCompleted && allMealsDone) {
      await notifyAdmin(
        "Full Adherence",
        `${firstName} crushed it today -- 100% adherence!`,
        "admin_alert",
        `/admin/users/${user.userId}`
      );
    } else if (workoutCompleted) {
      await notifyAdmin(
        "Workout Completed",
        `${firstName} completed today's workout`,
        "admin_alert",
        `/admin/users/${user.userId}`
      );
    }

    return NextResponse.json({
      workoutCompleted: progress.workoutCompleted,
      breakfastCompleted: progress.breakfastCompleted,
      lunchCompleted: progress.lunchCompleted,
      snackCompleted: progress.snackCompleted,
      dinnerCompleted: progress.dinnerCompleted,
    });
  } catch (error) {
    console.error("Progress POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
