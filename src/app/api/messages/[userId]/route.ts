import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    // Fetch all messages between the two users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user.userId, receiverId: userId },
          { senderId: userId, receiverId: user.userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        senderId: true,
        content: true,
        imageData: true,
        attachmentType: true,
        createdAt: true,
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: user.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Message thread GET error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
