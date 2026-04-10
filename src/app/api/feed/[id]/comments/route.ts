import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyAdmin } from "@/lib/notifications";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const comments = await prisma.postComment.findMany({
      where: { postId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      comments: comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      })),
    });
  } catch (error) {
    console.error("Comments GET error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        userId: user.userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Notify admin about new comment
    try {
      const firstName = comment.user.firstName || "Someone";
      const preview = content.trim().slice(0, 50);
      notifyAdmin(
        `${firstName} commented on a post`,
        `${firstName} commented: "${preview}${content.trim().length > 50 ? "..." : ""}"`,
        "admin_alert",
        "/admin/feed"
      );
    } catch {
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
      },
    });
  } catch (error) {
    console.error("Comments POST error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const commentId = parseInt(searchParams.get("commentId") || "", 10);
    if (isNaN(commentId)) {
      return NextResponse.json(
        { error: "Invalid comment ID" },
        { status: 400 }
      );
    }

    // Verify the comment belongs to this post
    const comment = await prisma.postComment.findFirst({
      where: { id: commentId, postId },
    });

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    await prisma.postComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comments DELETE error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
