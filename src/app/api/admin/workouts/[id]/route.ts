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
      sets,
      reps,
      videoUrl,
      instructions,
      subcategoryId,
      difficulty,
      duration,
      targetGoal,
      isPublished,
      // Phase 4: illustration fields.
      gifUrl,
      bodyPart,
      equipment,
      primaryMuscles,
    } = body;

    // Build the update payload — only include fields that were actually
    // sent in the body, so the publish-toggle case from /admin/workouts
    // (which sends a full payload with sometimes-zero subcategoryId)
    // can no longer clobber unrelated fields.
    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (slug !== undefined) data.slug = slug;
    if (description !== undefined) data.description = description;
    if (sets !== undefined) data.sets = sets || null;
    if (reps !== undefined) data.reps = reps || null;
    if (videoUrl !== undefined) data.videoUrl = videoUrl || "";
    if (instructions !== undefined) {
      data.instructions = JSON.stringify(instructions || []);
    }
    if (difficulty !== undefined) data.difficulty = difficulty || "Intermediate";
    if (duration !== undefined) data.duration = duration || null;
    if (targetGoal !== undefined) data.targetGoal = targetGoal || null;
    if (isPublished !== undefined) data.isPublished = isPublished ?? false;
    if (gifUrl !== undefined) data.gifUrl = gifUrl || null;
    if (bodyPart !== undefined) data.bodyPart = bodyPart || null;
    if (equipment !== undefined) data.equipment = equipment || null;
    if (primaryMuscles !== undefined) data.primaryMuscles = primaryMuscles || null;

    // Gotcha #23 fix: validate any new subcategoryId against this coach.
    if (subcategoryId !== undefined && subcategoryId !== null && subcategoryId !== "") {
      const subcategoryIdInt = parseInt(subcategoryId);
      if (Number.isFinite(subcategoryIdInt) && subcategoryIdInt > 0) {
        const sub = await prisma.workoutSubcategory.findFirst({
          where: { id: subcategoryIdInt, coachId },
          select: { id: true },
        });
        if (!sub) {
          return NextResponse.json(
            { error: "Invalid subcategory for this coach" },
            { status: 400 }
          );
        }
        data.subcategoryId = subcategoryIdInt;
      }
    }

    const workout = await prisma.workout.update({
      where: { id: workoutId },
      data,
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
