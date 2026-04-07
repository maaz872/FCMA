import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get this week's Monday
    const now = new Date();
    const jsDay = now.getDay(); // 0=Sun
    const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 7);

    const targets = await prisma.weeklyTarget.findMany({
      where: {
        userId: user.userId,
        weekStartDate: monday,
        isVisible: true,
      },
    });

    if (targets.length === 0) {
      return NextResponse.json({ targets: [] });
    }

    // Fill current values from user logs
    const enriched = await Promise.all(
      targets.map(async (t) => {
        let currentValue = t.currentValue;

        if (t.metric === "weight") {
          const latest = await prisma.weightLog.findFirst({
            where: { userId: user.userId },
            orderBy: { loggedDate: "desc" },
            select: { weightKg: true },
          });
          if (latest) currentValue = latest.weightKg;
        } else if (
          ["belly", "waist", "chest", "hips", "arms"].includes(t.metric)
        ) {
          const fieldMap: Record<string, string> = {
            belly: "bellyInches",
            waist: "waistInches",
            chest: "chestInches",
            hips: "hipsInches",
            arms: "armsInches",
          };
          const field = fieldMap[t.metric];
          if (field) {
            const latest = await prisma.bodyMeasurement.findFirst({
              where: { userId: user.userId },
              orderBy: { loggedDate: "desc" },
            });
            if (latest) {
              const val = (latest as Record<string, unknown>)[field];
              if (typeof val === "number") currentValue = val;
            }
          }
        } else if (t.metric === "steps") {
          const stepLogs = await prisma.stepLog.findMany({
            where: {
              userId: user.userId,
              loggedDate: { gte: monday, lt: sunday },
            },
          });
          if (stepLogs.length > 0) {
            const totalSteps = stepLogs.reduce((sum, s) => sum + s.steps, 0);
            // Average by days logged (consistent with calories)
            currentValue = Math.round(totalSteps / stepLogs.length);
          }
        } else if (t.metric === "calories") {
          const mealLogs = await prisma.mealLog.findMany({
            where: {
              userId: user.userId,
              loggedDate: { gte: monday, lt: sunday },
            },
          });
          if (mealLogs.length > 0) {
            const totalCals = mealLogs.reduce((sum, m) => sum + m.calories, 0);
            // Unique days
            const uniqueDays = new Set(
              mealLogs.map((m) => new Date(m.loggedDate).toDateString())
            );
            currentValue = Math.round(totalCals / uniqueDays.size);
          }
        }

        return {
          id: t.id,
          metric: t.metric,
          targetValue: t.targetValue,
          currentValue,
        };
      })
    );

    return NextResponse.json({ targets: enriched });
  } catch (error) {
    console.error("Targets GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
