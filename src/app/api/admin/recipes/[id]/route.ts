import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipeId = Number(id);
    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        category: true,
        dietaryTags: {
          include: { tag: true },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("Admin GET recipe error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipe" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipeId = Number(id);
    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const existing = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.categoryId !== undefined) updateData.categoryId = Number(body.categoryId);
    if (body.ingredients !== undefined) updateData.ingredients = JSON.stringify(body.ingredients);
    if (body.instructions !== undefined) updateData.instructions = JSON.stringify(body.instructions);
    if (body.videoUrl !== undefined) updateData.videoUrl = body.videoUrl || null;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl || null;
    if (body.calories !== undefined) updateData.calories = Number(body.calories);
    if (body.protein !== undefined) updateData.protein = Number(body.protein);
    if (body.carbs !== undefined) updateData.carbs = Number(body.carbs);
    if (body.fat !== undefined) updateData.fat = Number(body.fat);
    if (body.servings !== undefined) updateData.servings = Number(body.servings);
    if (body.prepTimeMins !== undefined) updateData.prepTimeMins = Number(body.prepTimeMins);
    if (body.cookTimeMins !== undefined) updateData.cookTimeMins = Number(body.cookTimeMins);
    if (body.isPublished !== undefined) updateData.isPublished = Boolean(body.isPublished);

    const recipe = await prisma.recipe.update({
      where: { id: recipeId },
      data: updateData,
    });

    // Update tags if provided
    if (body.tagIds !== undefined && Array.isArray(body.tagIds)) {
      // Remove existing tags
      await prisma.recipeDietaryTag.deleteMany({
        where: { recipeId },
      });
      // Add new tags
      if (body.tagIds.length > 0) {
        await prisma.recipeDietaryTag.createMany({
          data: body.tagIds.map((tagId: number) => ({
            recipeId,
            tagId: Number(tagId),
          })),
        });
      }
    }

    return NextResponse.json({ recipe });
  } catch (error) {
    console.error("Admin PUT recipe error:", error);
    return NextResponse.json(
      { error: "Failed to update recipe" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipeId = Number(id);
    if (isNaN(recipeId)) {
      return NextResponse.json({ error: "Invalid recipe ID" }, { status: 400 });
    }

    const existing = await prisma.recipe.findUnique({
      where: { id: recipeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const force = request.nextUrl.searchParams.get("force") === "true";

    // Check if recipe is linked to any plan days
    const linkedCount = await prisma.planDayMeal.count({ where: { recipeId } });
    if (linkedCount > 0 && !force) {
      return NextResponse.json(
        { error: `Cannot delete: recipe is linked to ${linkedCount} plan day(s). Remove it from plans first.`, linkedCount },
        { status: 409 }
      );
    }

    // Remove from all plans if force delete
    if (linkedCount > 0) {
      await prisma.planDayMeal.deleteMany({ where: { recipeId } });
    }

    // Cascade: delete dietary tags and favourites first, then recipe
    await prisma.recipeDietaryTag.deleteMany({ where: { recipeId } });
    await prisma.favourite.deleteMany({ where: { recipeId } });
    await prisma.recipe.delete({ where: { id: recipeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin DELETE recipe error:", error);
    return NextResponse.json(
      { error: "Failed to delete recipe" },
      { status: 500 }
    );
  }
}
