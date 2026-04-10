import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/coach-scope";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id: userId } = await params;

    // Verify user belongs to this coach
    const targetUser = await prisma.user.findFirst({ where: { id: userId, coachId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const body = await request.json();
    const { status } = body;

    if (!status || !["active", "paused", "completed"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status required: active, paused, completed" },
        { status: 400 }
      );
    }

    // Find the active plan for this user
    const activePlan = await prisma.clientPlan.findFirst({
      where: { userId, status: "active" },
    });

    if (!activePlan && status !== "active") {
      return NextResponse.json({ error: "No active plan found" }, { status: 404 });
    }

    if (activePlan) {
      await prisma.clientPlan.update({
        where: { id: activePlan.id },
        data: {
          status,
          ...(status === "completed" ? { endDate: new Date() } : {}),
        },
      });

      // If completing or pausing, clear user's activePlanId
      if (status === "completed" || status === "paused") {
        await prisma.user.update({
          where: { id: userId },
          data: { activePlanId: null },
        });
      }

      // Notify user
      const statusLabel = status === "paused" ? "paused" : status === "completed" ? "completed" : "resumed";
      await prisma.notification.create({
        data: {
          userId,
          title: `Plan ${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}`,
          message: `Your plan "${activePlan.name}" has been ${statusLabel} by your coach.`,
          type: "plan",
          actionUrl: "/hub/my-plan",
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update plan status error:", error);
    return NextResponse.json(
      { error: "Failed to update plan status" },
      { status: 500 }
    );
  }
}
