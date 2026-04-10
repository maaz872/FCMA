import { NextResponse } from "next/server";
import { getCoachScope } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";
import { notifyAdmin } from "@/lib/notifications";

export async function POST(
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

    // Verify post belongs to this coach's feed
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.coachId !== coachId) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if already liked
    const existing = await prisma.postLike.findUnique({
      where: {
        postId_userId: { postId, userId: user.userId },
      },
    });

    if (existing) {
      // Unlike
      await prisma.postLike.delete({ where: { id: existing.id } });
    } else {
      // Like
      await prisma.postLike.create({
        data: { postId, userId: user.userId },
      });

      // Notify admin about new like (only on like, not unlike)
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { firstName: true },
        });
        const firstName = dbUser?.firstName || "Someone";
        notifyAdmin(
          `${firstName} liked your post`,
          `${firstName} liked a post in the feed`,
          "admin_alert",
          "/admin/feed"
        );
      } catch {
        // Don't fail the request if notification fails
      }
    }

    const count = await prisma.postLike.count({ where: { postId } });

    return NextResponse.json({ liked: !existing, count });
  } catch (error) {
    console.error("Like toggle error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
