import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const workout = await prisma.workout.findUnique({
      where: { id: parseInt(id) },
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
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
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
      where: { id: parseInt(id) },
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
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.workout.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete workout error:", error);
    return NextResponse.json(
      { error: "Failed to delete workout" },
      { status: 500 }
    );
  }
}
