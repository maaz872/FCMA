import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favourites = await prisma.favourite.findMany({
      where: { userId: user.userId, recipeId: { not: null } },
      include: {
        recipe: {
          include: {
            category: true,
          },
        },
      },
    });

    const recipes = favourites.filter(f => f.recipe).map(
      (f) => ({
        id: f.recipe!.id,
        title: f.recipe!.title,
        slug: f.recipe!.slug,
        description: f.recipe!.description,
        imageUrl: f.recipe!.imageUrl,
        calories: f.recipe!.calories,
        protein: f.recipe!.protein,
        carbs: f.recipe!.carbs,
        fat: f.recipe!.fat,
        prepTimeMins: f.recipe!.prepTimeMins,
        cookTimeMins: f.recipe!.cookTimeMins,
        category: f.recipe!.category.name,
      })
    );

    return NextResponse.json(recipes);
  } catch (error) {
    console.error("Get favourite recipes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch favourite recipes" },
      { status: 500 }
    );
  }
}
