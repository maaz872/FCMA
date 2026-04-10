import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const body = await request.json();
    const { userId, title, message, type } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const notifType = type || "system";

    if (userId) {
      // Verify user belongs to this coach before sending
      const targetUser = await prisma.user.findFirst({ where: { id: userId, coachId } });
      if (!targetUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      const notification = await prisma.notification.create({
        data: {
          userId,
          title,
          message,
          type: notifType,
        },
      });
      return NextResponse.json({ notification, sent: 1 });
    }

    // Broadcast to all active users belonging to this coach
    const users = await prisma.user.findMany({
      where: { role: "USER", coachId, isActive: true },
      select: { id: true },
    });

    const notifications = await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title,
        message,
        type: notifType,
      })),
    });

    return NextResponse.json({
      sent: notifications.count,
      message: `Notification sent to ${notifications.count} users`,
    });
  } catch (error) {
    console.error("Admin notifications POST error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    // Only fetch notifications for users belonging to this coach
    const coachUserIds = await prisma.user.findMany({
      where: { coachId },
      select: { id: true },
    });
    const userIds = coachUserIds.map((u) => u.id);

    const notifications = await prisma.notification.findMany({
      where: { userId: { in: userIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        userId: n.userId,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        user: n.user,
      })),
    });
  } catch (error) {
    console.error("Admin notifications GET error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
