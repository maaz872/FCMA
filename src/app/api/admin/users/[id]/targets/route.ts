import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const weekStartDate = searchParams.get("weekStartDate");

    const where: { userId: string; weekStartDate?: Date } = { userId };
    if (weekStartDate) {
      where.weekStartDate = new Date(weekStartDate);
    }

    const targets = await prisma.weeklyTarget.findMany({
      where,
      orderBy: [{ weekStartDate: "desc" }, { metric: "asc" }],
    });

    return NextResponse.json(targets);
  } catch (error) {
    console.error("Get weekly targets error:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly targets" },
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
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const body = await request.json();
    const { weekStartDate, targets } = body as {
      weekStartDate: string;
      targets: TargetInput[];
    };

    if (!weekStartDate || !targets || !Array.isArray(targets)) {
      return NextResponse.json(
        { error: "weekStartDate and targets array are required" },
        { status: 400 }
      );
    }

    // Validate weekStartDate is a Monday (use UTC to match DB storage)
    const weekDate = new Date(weekStartDate + "T00:00:00Z");
    const dayOfWeek = weekDate.getUTCDay();
    if (dayOfWeek !== 1) {
      return NextResponse.json(
        { error: "weekStartDate must be a Monday" },
        { status: 400 }
      );
    }

    // Validate target values
    const validMetrics = ["weight", "belly", "waist", "chest", "hips", "arms", "steps", "calories"];
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
    const existingTargets = await prisma.weeklyTarget.findMany({
      where: { userId, weekStartDate: weekDate },
    });
    const existingMap = new Map(existingTargets.map(t => [t.metric, t.targetValue]));

    const created = [];
    let hasChanges = false;

    for (const t of targets) {
      const newValue = parseFloat(String(t.targetValue));
      const oldValue = existingMap.get(t.metric);
      const changed = oldValue === undefined || oldValue !== newValue;
      if (changed) hasChanges = true;

      // Upsert: delete existing for same metric+week, then create
      await prisma.weeklyTarget.deleteMany({
        where: { userId, weekStartDate: weekDate, metric: t.metric },
      });

      const target = await prisma.weeklyTarget.create({
        data: {
          userId,
          weekStartDate: weekDate,
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
          title: "Weekly Targets Updated",
          message: `Your coach updated your weekly targets: ${metricList}`,
          type: "target",
          actionUrl: "/hub/my-plan",
        },
      });
    }

    return NextResponse.json(created);
  } catch (error) {
    console.error("Set weekly targets error:", error);
    return NextResponse.json(
      { error: "Failed to set weekly targets" },
      { status: 500 }
    );
  }
}
