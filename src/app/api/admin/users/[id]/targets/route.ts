import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;

    // Get latest targets per metric (permanent, not weekly)
    const targets = await prisma.weeklyTarget.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }, { metric: "asc" }],
    });

    // Deduplicate: keep latest per metric
    const seen = new Set<string>();
    const unique = targets.filter(t => {
      if (seen.has(t.metric)) return false;
      seen.add(t.metric);
      return true;
    });

    return NextResponse.json(unique);
  } catch (error) {
    console.error("Get targets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch targets" },
      { status: 500 }
    );
  }
}

interface TargetInput {
  metric: string;
  targetValue: number;
  isVisible?: boolean;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { targets } = body as { targets: TargetInput[] };

    if (!targets || !Array.isArray(targets)) {
      return NextResponse.json(
        { error: "targets array is required" },
        { status: 400 }
      );
    }

    // Validate target values (7 metrics, no calories)
    const validMetrics = ["weight", "belly", "waist", "chest", "hips", "arms", "steps"];
    for (const t of targets) {
      if (!validMetrics.includes(t.metric)) {
        return NextResponse.json({ error: `Invalid metric: ${t.metric}` }, { status: 400 });
      }
      const val = parseFloat(String(t.targetValue));
      if (isNaN(val) || val <= 0) {
        return NextResponse.json({ error: `Target value for ${t.metric} must be greater than 0` }, { status: 400 });
      }
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check existing targets to avoid duplicate notifications
    const existingTargets = await prisma.weeklyTarget.findMany({ where: { userId } });
    const existingMap = new Map<string, number>();
    for (const t of existingTargets) {
      existingMap.set(t.metric, t.targetValue);
    }

    const created = [];
    let hasChanges = false;
    const now = new Date();
    // Use a fixed date for the weekStartDate field (backward compat — field required by schema)
    const fixedDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    for (const t of targets) {
      const newValue = parseFloat(String(t.targetValue));
      const oldValue = existingMap.get(t.metric);
      const changed = oldValue === undefined || oldValue !== newValue;
      if (changed) hasChanges = true;

      // Delete ALL existing for this metric (any week), then create fresh
      await prisma.weeklyTarget.deleteMany({
        where: { userId, metric: t.metric },
      });

      const target = await prisma.weeklyTarget.create({
        data: {
          userId,
          weekStartDate: fixedDate,
          metric: t.metric,
          targetValue: newValue,
          isVisible: t.isVisible !== false,
        },
      });
      created.push(target);
    }

    // Only notify if targets actually changed
    if (hasChanges) {
      const metricList = targets.map(t => `${t.metric}: ${t.targetValue}`).join(", ");
      await prisma.notification.create({
        data: {
          userId,
          title: "Targets Updated",
          message: `Your coach updated your targets: ${metricList}`,
          type: "target",
          actionUrl: "/hub/targets",
        },
      });
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error("Set targets error:", error);
    return NextResponse.json(
      { error: "Failed to set targets" },
      { status: 500 }
    );
  }
}
