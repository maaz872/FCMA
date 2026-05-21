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
      sets,
      reps,
      videoUrl,
      instructions,
      subcategoryId,
      difficulty,
      duration,
      targetGoal,
      isPublished,
      // Phase 4: illustration fields (optional — library or coach-uploaded).
      gifUrl,
      bodyPart,
      equipment,
      primaryMuscles,
    } = body;

    // videoUrl is no longer strictly required — a workout can be illustrated
    // by a GIF instead of a video. Either gifUrl or videoUrl must be present
    // so the user-facing detail page has something to render.
    if (!title || !slug || !description || !subcategoryId) {
      return NextResponse.json(
        { error: "Title, slug, description, and subcategoryId are required" },
        { status: 400 }
      );
    }
    if (!videoUrl && !gifUrl) {
      return NextResponse.json(
        { error: "Either a video URL or an illustration (gifUrl) is required" },
        { status: 400 }
      );
    }

    // Gotcha #23 fix: verify the subcategory belongs to this coach before
    // writing it as a foreign key. Previously a coach could attach their
    // workout to another coach's subcategory by submitting any int.
    const subcategoryIdInt = parseInt(subcategoryId);
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

    const workout = await prisma.workout.create({
      data: {
        title,
        slug,
        description,
        sets: sets || null,
        reps: reps || null,
        videoUrl: videoUrl || "",
        instructions: JSON.stringify(instructions || []),
        subcategoryId: subcategoryIdInt,
        difficulty: difficulty || "Intermediate",
        duration: duration || null,
        targetGoal: targetGoal || null,
        isPublished: isPublished ?? false,
        gifUrl: gifUrl || null,
        bodyPart: bodyPart || null,
        equipment: equipment || null,
        primaryMuscles: primaryMuscles || null,
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
