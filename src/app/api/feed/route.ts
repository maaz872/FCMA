import { NextResponse } from "next/server";
import { getCoachScope } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const scope = await getCoachScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, coachId } = scope;

    const posts = await prisma.post.findMany({
      where: { coachId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        likes: {
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
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
      orderBy: { createdAt: "desc" },
    });

    const formatted = posts.map((post) => ({
      id: post.id,
      content: post.content,
      mediaType: post.mediaType,
      mediaUrl: post.mediaUrl,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.author.id,
        firstName: post.author.firstName,
        lastName: post.author.lastName,
        role: post.author.role,
      },
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      likedByMe: post.likes.some((like) => like.userId === user.userId),
      likes: post.likes.map((like) => ({
        id: like.id,
        user: {
          firstName: like.user.firstName,
          lastName: like.user.lastName,
        },
      })),
      comments: post.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        user: c.user,
      })),
    }));

    return NextResponse.json({ posts: formatted });
  } catch (error) {
    console.error("Feed GET error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const scope = await getCoachScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, coachId } = scope;

    const body = await request.json();
    const { content, mediaType, mediaUrl } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    const post = await prisma.post.create({
      data: {
        authorId: user.userId,
        content: content.trim(),
        mediaType: mediaType || null,
        mediaUrl: mediaUrl || null,
        coachId,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        _count: { select: { likes: true, comments: true } },
      },
    });

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
        likedByMe: false,
        likes: [],
        comments: [],
      },
    });
  } catch (error) {
    console.error("Feed POST error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
