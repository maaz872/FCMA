import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification, notifyAdmin } from "@/lib/notifications";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all messages involving the current user
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: user.userId }, { receiverId: user.userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Group messages by the other user's ID
    const conversationMap = new Map<
      string,
      {
        userId: string;
        firstName: string;
        lastName: string;
        role: string;
        lastMessage: string;
        lastMessageDate: string;
        unreadCount: number;
      }
    >();

    for (const msg of messages) {
      const otherUser =
        msg.senderId === user.userId ? msg.receiver : msg.sender;

      // Non-admin users should only see conversations with admin
      if (user.role !== "COACH" && otherUser.role !== "COACH") {
        continue;
      }

      if (!conversationMap.has(otherUser.id)) {
        conversationMap.set(otherUser.id, {
          userId: otherUser.id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          role: otherUser.role,
          lastMessage: msg.content,
          lastMessageDate: msg.createdAt.toISOString(),
          unreadCount: 0,
        });
      }

      // Count unread messages sent TO the current user
      if (msg.receiverId === user.userId && !msg.isRead) {
        const conv = conversationMap.get(otherUser.id)!;
        conv.unreadCount++;
      }
    }

    const conversations = Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessageDate).getTime() -
        new Date(a.lastMessageDate).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Messages GET error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { receiverId, content, imageData } = body;

    if (!receiverId || (!content?.trim() && !imageData)) {
      return NextResponse.json(
        { error: "Receiver and content or image are required" },
        { status: 400 }
      );
    }

    // Verify receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });
    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      );
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.userId,
        receiverId,
        content: content?.trim() || "[Image]",
        imageData: imageData || null,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        receiver: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Send notifications based on sender role
    try {
      if (user.role !== "COACH") {
        // User sent a message -> notify admin
        const senderName = message.sender.firstName;
        const preview = (content?.trim() || "[Image]").slice(0, 60);
        notifyAdmin(
          `New message from ${senderName}`,
          preview,
          "admin_alert",
          "/admin/messages"
        );
      } else {
        // Admin sent a message -> notify the user
        createNotification(
          receiverId,
          "New message from coach",
          (content?.trim() || "[Image]").slice(0, 100),
          "system",
          "/hub/messages"
        );
      }
    } catch {
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Messages POST error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
