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

    // Date range for step/calorie averages (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Fill current values from user logs
    const enriched = await Promise.all(
      unique.map(async (t) => {
        let currentValue: number | null = t.currentValue;
        try {

        if (t.metric === "weight") {
          // Check weightLog first, then bodyMeasurement as fallback
          const latest = await prisma.weightLog.findFirst({
            where: { userId: user.userId },
            orderBy: { loggedDate: "desc" },
            select: { weightKg: true },
          });
          if (latest) {
            currentValue = latest.weightKg;
          } else {
            const measurement = await prisma.bodyMeasurement.findFirst({
              where: { userId: user.userId, weightKg: { not: null } },
              orderBy: { loggedDate: "desc" },
              select: { weightKg: true },
            });
            if (measurement?.weightKg) currentValue = measurement.weightKg;
          }
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
            // Find latest measurement where THIS specific field is not null
            const latest = await prisma.bodyMeasurement.findFirst({
              where: { userId: user.userId, [field]: { not: null } },
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
              loggedDate: { gte: weekAgo },
            },
          });
          if (stepLogs.length > 0) {
            const totalSteps = stepLogs.reduce((sum, s) => sum + s.steps, 0);
            currentValue = Math.round(totalSteps / stepLogs.length);
          }
        }

        } catch { /* ignore enrichment errors */ }
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
// rebuild 1775606282
