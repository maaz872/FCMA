import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getCoachScope } from "@/lib/coach-scope";

export async function GET(request: NextRequest) {
  try {
    const scope = await getCoachScope();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const tagsParam = searchParams.get("tags") || "";
    const sort = searchParams.get("sort") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12", 10)));

    const where: Record<string, unknown> = { isPublished: true, coachId };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (tagsParam) {
      const tagSlugs = tagsParam.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagSlugs.length > 0) {
        where.dietaryTags = {
          some: { tag: { slug: { in: tagSlugs } } },
        };
      }
    }

    let orderBy: Record<string, string> = { createdAt: "desc" };
    switch (sort) {
      case "name-az":
        orderBy = { title: "asc" };
        break;
      case "cal-low":
        orderBy = { calories: "asc" };
        break;
      case "cal-high":
        orderBy = { calories: "desc" };
        break;
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        include: { category: true, dietaryTags: { include: { tag: true } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.recipe.count({ where }),
    ]);

    const serialized = recipes.map((r: {
      id: number;
      title: string;
      slug: string;
      description: string;
      category: { name: string; slug: string };
      dietaryTags: { tag: { name: string; slug: string } }[];
      ingredients: string;
      instructions: string;
      videoUrl: string | null;
      imageUrl: string | null;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      servings: number;
      prepTimeMins: number;
      cookTimeMins: number;
    }) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description,
      category: r.category.name,
      categorySlug: r.category.slug,
      tags: r.dietaryTags.map((dt) => dt.tag.name),
      ingredients: JSON.parse(r.ingredients),
      instructions: JSON.parse(r.instructions),
      videoUrl: r.videoUrl,
      imageUrl: r.imageUrl,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      servings: r.servings,
      prepTimeMins: r.prepTimeMins,
      cookTimeMins: r.cookTimeMins,
    }));

    return NextResponse.json({
      recipes: serialized,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}
