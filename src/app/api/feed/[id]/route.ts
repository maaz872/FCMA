import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

    const user = await getCurrentUser();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        likes: true,
        comments: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({
      post: {
        id: post.id,
        content: post.content,
        mediaType: post.mediaType,
        mediaUrl: post.mediaUrl,
        createdAt: post.createdAt.toISOString(),
        author: post.author,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        likedByMe: user
          ? post.likes.some((like) => like.userId === user.userId)
          : false,
        comments: post.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          user: c.user,
        })),
      },
    });
  } catch (error) {
    console.error("Feed [id] GET error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
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

    await prisma.post.delete({ where: { id: postId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feed [id] DELETE error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
