import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workouts = await prisma.workout.findMany({
      include: { subcategory: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(workouts);
  } catch (error) {
    console.error("Get workouts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workouts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      slug,
      description,
      videoUrl,
      instructions,
      subcategoryId,
      difficulty,
      duration,
      targetGoal,
      isPublished,
    } = body;

    if (!title || !slug || !description || !videoUrl || !subcategoryId) {
      return NextResponse.json(
        { error: "Title, slug, description, videoUrl, and subcategoryId are required" },
        { status: 400 }
      );
    }

    const workout = await prisma.workout.create({
      data: {
        title,
        slug,
        description,
        videoUrl,
        instructions: JSON.stringify(instructions || []),
        subcategoryId: parseInt(subcategoryId),
        difficulty: difficulty || "Intermediate",
        duration: duration || null,
        targetGoal: targetGoal || null,
        isPublished: isPublished ?? false,
      },
      include: { subcategory: { include: { category: true } } },
    });

    return NextResponse.json(workout);
  } catch (error: unknown) {
    console.error("Create workout error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "A workout with this slug already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create workout" },
      { status: 500 }
    );
  }
}
