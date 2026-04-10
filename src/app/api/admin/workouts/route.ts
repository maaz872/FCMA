import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const workouts = await prisma.workout.findMany({
      where: { coachId },
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
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

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
        coachId,
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
