import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

function parseRange(rangeParam: string): number {
  switch (rangeParam) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    case "all": return 0;
    default: {
      const num = parseInt(rangeParam);
      return isNaN(num) ? 30 : num;
    }
  }
}

export async function GET(request: Request) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.userId;
  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range") || "30d";
  const range = parseRange(rangeParam);

  try {
    const now = new Date();
    const since = range > 0 ? new Date(now.getTime() - range * 24 * 60 * 60 * 1000) : new Date(0);
    since.setHours(0, 0, 0, 0);

    // Meals within range
    const recentMeals = await prisma.mealLog.findMany({
      where: { userId, loggedDate: { gte: since } },
      orderBy: { loggedDate: "asc" },
    });

    // Group meals by date
    const dailyTotals: Record<
      string,
      { date: string; calories: number; protein: number; carbs: number; fat: number }
    > = {};

    // Initialize days in the range
    const daysToInit = range > 0 ? Math.min(range, 365) : 365;
    for (let i = daysToInit - 1; i >= 0; i--) {
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

    // Weight logs within range
    const weightLogs = await prisma.weightLog.findMany({
      where: { userId, loggedDate: { gte: since } },
      orderBy: { loggedDate: "asc" },
    });

    // Macro targets
    const targets = await prisma.userMacroTarget.findUnique({
      where: { userId },
    });

    // Total meal count within range
    const totalMealCount = await prisma.mealLog.count({
      where: { userId, loggedDate: { gte: since } },
    });

    // Distinct dates with meals in the range
    const rangeMeals = await prisma.mealLog.findMany({
      where: { userId, loggedDate: { gte: since } },
      select: { loggedDate: true },
    });
    const uniqueDates = new Set<string>();
    for (const m of rangeMeals) {
      const d = new Date(m.loggedDate);
      d.setHours(0, 0, 0, 0);
      uniqueDates.add(d.toISOString().split("T")[0]);
    }
    const consistencyDays = uniqueDates.size;
    const consistencyTotal = range > 0 ? range : Math.max(
      Math.ceil((now.getTime() - new Date(0).getTime()) / (24 * 60 * 60 * 1000)),
      1
    );

    // Max protein day
    const allMeals = await prisma.mealLog.findMany({
      where: { userId, loggedDate: { gte: since } },
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

    // Min weight within range
    const minWeight = await prisma.weightLog.findFirst({
      where: { userId, loggedDate: { gte: since } },
      orderBy: { weightKg: "asc" },
    });

    // Longest streak within range
    const allMealDates = await prisma.mealLog.findMany({
      where: { userId, loggedDate: { gte: since } },
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
      consistencyTotal: range > 0 ? range : consistencyTotal,
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
