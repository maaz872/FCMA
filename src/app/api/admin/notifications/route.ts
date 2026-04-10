import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      // Send to specific user
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

    // Send to all active users
    const users = await prisma.user.findMany({
      where: { role: "USER", isActive: true },
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
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
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
