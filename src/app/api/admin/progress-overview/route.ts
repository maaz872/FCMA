import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with role=USER
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        activePlanId: true,
        currentWeightKg: true,
      },
      orderBy: { firstName: "asc" },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Calculate week boundaries (Mon-Sun)
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const diffToMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - diffToMon);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const results = await Promise.all(
      users.map(
        async (u: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
          activePlanId: number | null;
          currentWeightKg: number | null;
        }) => {
          // Active plan
          let activePlan: { id: number; name: string; status: string; days: { dayOfWeek: number; weekNumber: number }[] } | null = null;
          if (u.activePlanId) {
            activePlan = await prisma.clientPlan.findUnique({
              where: { id: u.activePlanId },
              select: { id: true, name: true, status: true, days: { select: { dayOfWeek: true, weekNumber: true } } },
            });
          }

          // This week's adherence: completed progress / total plan days in this week
          let adherencePercent = 0;
          if (activePlan) {
            const totalDaysThisWeek = activePlan.days.length > 0
              ? Math.min(activePlan.days.length, 7)
              : 7;

            const completedDays = await prisma.dailyProgress.count({
              where: {
                userId: u.id,
                clientPlanId: activePlan.id,
                date: { gte: weekStart, lt: weekEnd },
                OR: [
                  { workoutCompleted: true },
                  { breakfastCompleted: true },
                  { lunchCompleted: true },
                  { snackCompleted: true },
                  { dinnerCompleted: true },
                ],
              },
            });

            adherencePercent = totalDaysThisWeek > 0
              ? Math.round((completedDays / totalDaysThisWeek) * 100)
              : 0;
          }

          // Weight change (last 7 days)
          const recentWeights = await prisma.weightLog.findMany({
            where: { userId: u.id, loggedDate: { gte: sevenDaysAgo } },
            orderBy: { loggedDate: "asc" },
            select: { weightKg: true, loggedDate: true },
          });

          let weightChange: number | null = null;
          if (recentWeights.length >= 2) {
            const first = recentWeights[0] as { weightKg: number };
            const last = recentWeights[recentWeights.length - 1] as { weightKg: number };
            weightChange = parseFloat((last.weightKg - first.weightKg).toFixed(1));
          }

          // Last activity: latest meal log or weight log
          const lastMeal = await prisma.mealLog.findFirst({
            where: { userId: u.id },
            orderBy: { loggedDate: "desc" },
            select: { loggedDate: true },
          });

          const lastWeight = await prisma.weightLog.findFirst({
            where: { userId: u.id },
            orderBy: { loggedDate: "desc" },
            select: { loggedDate: true },
          });

          let lastActivity: Date | null = null;
          if (lastMeal && lastWeight) {
            const mealDate = lastMeal.loggedDate as Date;
            const weightDate = lastWeight.loggedDate as Date;
            lastActivity = mealDate > weightDate ? mealDate : weightDate;
          } else if (lastMeal) {
            lastActivity = lastMeal.loggedDate as Date;
          } else if (lastWeight) {
            lastActivity = lastWeight.loggedDate as Date;
          }

          const hoursSinceLastActivity = lastActivity
            ? Math.round((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60))
            : null;

          // Unread messages count
          const unreadMessages = await prisma.message.count({
            where: { receiverId: user.userId, senderId: u.id, isRead: false },
          });

          return {
            id: u.id,
            name: `${u.firstName} ${u.lastName}`,
            email: u.email,
            activePlanName: activePlan?.name || null,
            planStatus: activePlan?.status || "none",
            adherencePercent,
            weightChange,
            currentWeight: u.currentWeightKg,
            lastActivity: lastActivity ? (lastActivity as Date).toISOString() : null,
            hoursSinceLastActivity,
            unreadMessages,
          };
        }
      )
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Progress overview error:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress overview" },
      { status: 500 }
    );
  }
}
