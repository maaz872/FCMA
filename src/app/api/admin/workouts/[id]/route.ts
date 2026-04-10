import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const workout = await prisma.workout.findFirst({
      where: { id: parseInt(id), coachId },
      include: { subcategory: { include: { category: true } } },
    });

    if (!workout) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(workout);
  } catch (error) {
    console.error("Get workout error:", error);
    return NextResponse.json(
      { error: "Failed to fetch workout" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const workoutId = parseInt(id);

    // Verify ownership
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, coachId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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

    const workout = await prisma.workout.update({
      where: { id: workoutId },
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
    console.error("Update workout error:", error);
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
      { error: "Failed to update workout" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const workoutId = parseInt(id);

    // Verify ownership
    const existing = await prisma.workout.findFirst({
      where: { id: workoutId, coachId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.workout.delete({ where: { id: workoutId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workout error:", error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
