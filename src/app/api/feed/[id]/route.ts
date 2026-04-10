import { NextResponse } from "next/server";
import { getCoachScope } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await getCoachScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, coachId } = scope;

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

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

    if (!post || post.coachId !== coachId) {
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
        likedByMe: post.likes.some((like) => like.userId === user.userId),
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
    const scope = await getCoachScope();
    if (!scope || scope.user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { coachId } = scope;

    const { id } = await params;
    const postId = parseInt(id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    // Verify the post belongs to this coach's feed
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.coachId !== coachId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
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
