import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get ALL visible targets for user (permanent, not weekly)
    const targets = await prisma.weeklyTarget.findMany({
      where: {
        userId: user.userId,
        isVisible: true,
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    // Deduplicate: keep latest per metric
    const seen = new Set<string>();
    const unique = targets.filter(t => {
      if (seen.has(t.metric)) return false;
      seen.add(t.metric);
      return true;
    });

    if (unique.length === 0) {
      return NextResponse.json({ targets: [] });
    }

    // Date range for step averages (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get latest measurement once (shared across belly/waist/chest/hips/arms)
    const latestMeasurement = await prisma.bodyMeasurement.findFirst({
      where: { userId: user.userId },
      orderBy: { loggedDate: "desc" },
    });

    // Get latest weight from weightLog
    const latestWeightLog = await prisma.weightLog.findFirst({
      where: { userId: user.userId },
      orderBy: { loggedDate: "desc" },
      select: { weightKg: true },
    });

    // Get step logs for last 7 days
    const stepLogs = await prisma.stepLog.findMany({
      where: {
        userId: user.userId,
        loggedDate: { gte: weekAgo },
      },
    });

    // Enrich each target with current value — explicit per-metric, no dynamic keys
    const enriched = unique.map((t) => {
      let currentValue: number | null = null;

      try {
        switch (t.metric) {
          case "weight":
            if (latestWeightLog) {
              currentValue = latestWeightLog.weightKg;
            } else if (latestMeasurement?.weightKg !== null && latestMeasurement?.weightKg !== undefined) {
              currentValue = latestMeasurement.weightKg;
            }
            break;

          case "belly":
            if (latestMeasurement?.bellyInches !== null && latestMeasurement?.bellyInches !== undefined) {
              currentValue = latestMeasurement.bellyInches;
            }
            break;

          case "waist":
            if (latestMeasurement?.waistInches !== null && latestMeasurement?.waistInches !== undefined) {
              currentValue = latestMeasurement.waistInches;
            }
            break;

          case "chest":
            if (latestMeasurement?.chestInches !== null && latestMeasurement?.chestInches !== undefined) {
              currentValue = latestMeasurement.chestInches;
            }
            break;

          case "hips":
            if (latestMeasurement?.hipsInches !== null && latestMeasurement?.hipsInches !== undefined) {
              currentValue = latestMeasurement.hipsInches;
            }
            break;

          case "arms":
            if (latestMeasurement?.armsInches !== null && latestMeasurement?.armsInches !== undefined) {
              currentValue = latestMeasurement.armsInches;
            }
            break;

          case "steps":
            if (stepLogs.length > 0) {
              const totalSteps = stepLogs.reduce((sum, s) => sum + s.steps, 0);
              currentValue = Math.round(totalSteps / stepLogs.length);
            }
            break;
        }
      } catch (error) {
        console.error(`Target enrichment error for ${t.metric}:`, error);
      }

      return {
        id: t.id,
        metric: t.metric,
        targetValue: t.targetValue,
        currentValue,
      };
    });

    return NextResponse.json({ targets: enriched });
  } catch (error) {
    console.error("Targets GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
