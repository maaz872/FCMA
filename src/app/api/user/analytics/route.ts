import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;

  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Last 7 days meals
    const recentMeals = await prisma.mealLog.findMany({
      where: { userId, loggedDate: { gte: sevenDaysAgo } },
      orderBy: { loggedDate: "asc" },
    });

    // Group meals by date
    const dailyTotals: Record<
      string,
      { date: string; calories: number; protein: number; carbs: number; fat: number }
    > = {};

    // Initialize all 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split("T")[0];
      dailyTotals[key] = { date: key, calories: 0, protein: 0, carbs: 0, fat: 0 };
    }

    for (const meal of recentMeals) {
      const d = new Date(meal.loggedDate);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split("T")[0];
      if (dailyTotals[key]) {
        dailyTotals[key].calories += meal.calories;
        dailyTotals[key].protein += meal.protein;
        dailyTotals[key].carbs += meal.carbs;
        dailyTotals[key].fat += meal.fat;
      }
    }

    const weeklyData = Object.values(dailyTotals).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Last 30 weight logs
    const weightLogs = await prisma.weightLog.findMany({
      where: { userId },
      orderBy: { loggedDate: "asc" },
      take: 30,
    });

    // Macro targets
    const targets = await prisma.userMacroTarget.findUnique({
      where: { userId },
    });

    // Total meal count
    const totalMealCount = await prisma.mealLog.count({ where: { userId } });

    // Distinct dates with meals in last 30 days
    const last30Meals = await prisma.mealLog.findMany({
      where: { userId, loggedDate: { gte: thirtyDaysAgo } },
      select: { loggedDate: true },
    });
    const uniqueDates30 = new Set<string>();
    for (const m of last30Meals) {
      const d = new Date(m.loggedDate);
      d.setHours(0, 0, 0, 0);
      uniqueDates30.add(d.toISOString().split("T")[0]);
    }
    const consistencyDays = uniqueDates30.size;

    // Max protein day
    const allMeals = await prisma.mealLog.findMany({
      where: { userId },
      select: { loggedDate: true, protein: true },
    });
    const proteinByDay: Record<string, number> = {};
    for (const m of allMeals) {
      const d = new Date(m.loggedDate);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().split("T")[0];
      proteinByDay[key] = (proteinByDay[key] || 0) + m.protein;
    }
    const maxProteinDay = Object.values(proteinByDay).length
      ? Math.round(Math.max(...Object.values(proteinByDay)))
      : 0;

    // Min weight
    const minWeight = await prisma.weightLog.findFirst({
      where: { userId },
      orderBy: { weightKg: "asc" },
    });

    // Longest streak
    const allMealDates = await prisma.mealLog.findMany({
      where: { userId },
      select: { loggedDate: true },
      orderBy: { loggedDate: "asc" },
    });
    const allUniqueDates = new Set<string>();
    for (const m of allMealDates) {
      const d = new Date(m.loggedDate);
      d.setHours(0, 0, 0, 0);
      allUniqueDates.add(d.toISOString().split("T")[0]);
    }
    const sortedAllDates = Array.from(allUniqueDates).sort();
    let longestStreak = 0;
    let currentStreak = 0;
    for (let i = 0; i < sortedAllDates.length; i++) {
      if (i === 0) {
        currentStreak = 1;
      } else {
        const prev = new Date(sortedAllDates[i - 1]);
        const curr = new Date(sortedAllDates[i]);
        const diff = Math.round(
          (curr.getTime() - prev.getTime()) / (24 * 60 * 60 * 1000)
        );
        if (diff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    }

    return NextResponse.json({
      weeklyData,
      weightLogs: weightLogs.map((w) => ({
        date: w.loggedDate,
        weight: w.weightKg,
      })),
      targets: targets
        ? { calories: targets.calories, protein: targets.protein, carbs: targets.carbs, fat: targets.fat }
        : null,
      totalMealCount,
      consistencyDays,
      maxProteinDay,
      minWeight: minWeight ? minWeight.weightKg : null,
      longestStreak,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics data" },
      { status: 500 }
    );
  }
}
