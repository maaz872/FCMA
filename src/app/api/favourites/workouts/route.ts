import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favourites = await prisma.favourite.findMany({
      where: { userId: user.userId, workoutId: { not: null } },
      include: {
        workout: {
          select: {
            id: true, title: true, slug: true, videoUrl: true,
            difficulty: true, duration: true,
          },
        },
      },
    });

    const workouts = favourites
      .filter(f => f.workout)
      .map(f => ({
        id: f.workout!.id,
        title: f.workout!.title,
        slug: f.workout!.slug,
        videoUrl: f.workout!.videoUrl,
        difficulty: f.workout!.difficulty,
        duration: f.workout!.duration,
      }));

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error("Favourite workouts GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workoutId } = await req.json();
    if (!workoutId) {
      return NextResponse.json({ error: "workoutId required" }, { status: 400 });
    }

    const existing = await prisma.favourite.findFirst({
      where: { userId: user.userId, workoutId },
    });

    if (existing) {
      await prisma.favourite.delete({ where: { id: existing.id } });
      return NextResponse.json({ favourited: false });
    } else {
      await prisma.favourite.create({
        data: { userId: user.userId, workoutId },
      });
      return NextResponse.json({ favourited: true });
    }
  } catch (error) {
    console.error("Favourite workouts POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
