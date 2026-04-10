import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/coach-scope";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const [recipes, categories, tags] = await Promise.all([
      prisma.recipe.findMany({
        where: { coachId },
        include: { category: true, dietaryTags: { include: { tag: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.recipeCategory.findMany({ where: { coachId }, orderBy: { displayOrder: "asc" } }),
      prisma.dietaryTag.findMany({ where: { coachId } }),
    ]);

    return NextResponse.json({
      recipes: recipes.map((r: {
        id: number;
        title: string;
        slug: string;
        description: string;
        category: { id: number; name: string };
        dietaryTags: { tag: { id: number; name: string } }[];
        isPublished: boolean;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        createdAt: Date;
      }) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description,
        category: r.category.name,
        categoryId: r.category.id,
        tags: r.dietaryTags.map((dt) => dt.tag.name),
        isPublished: r.isPublished,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        createdAt: r.createdAt,
      })),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      tags: tags.map((t) => ({ id: t.id, name: t.name })),
    });
  } catch (error) {
    console.error("Admin GET recipes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const body = await request.json();

    const {
      title,
      slug,
      description,
      categoryId,
      tagIds,
      ingredients,
      instructions,
      videoUrl,
      imageUrl,
      calories,
      protein,
      carbs,
      fat,
      servings,
      prepTimeMins,
      cookTimeMins,
      isPublished,
    } = body;

    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }
    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }
    if (
      !ingredients ||
      !Array.isArray(ingredients) ||
      ingredients.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one ingredient is required" },
        { status: 400 }
      );
    }
    if (
      !instructions ||
      !Array.isArray(instructions) ||
      instructions.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one instruction is required" },
        { status: 400 }
      );
    }

    // Check for slug uniqueness within this coach's recipes
    const existing = await prisma.recipe.findFirst({ where: { slug, coachId } });
    if (existing) {
      return NextResponse.json(
        { error: "A recipe with this slug already exists" },
        { status: 409 }
      );
    }

    const recipe = await prisma.recipe.create({
      data: {
        title: title.trim(),
        slug: slug || title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        description: description || "",
        categoryId: Number(categoryId),
        ingredients: JSON.stringify(ingredients),
        instructions: JSON.stringify(instructions),
        videoUrl: videoUrl || null,
        imageUrl: imageUrl || null,
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        carbs: Number(carbs) || 0,
        fat: Number(fat) || 0,
        servings: Number(servings) || 1,
        prepTimeMins: Number(prepTimeMins) || 0,
        cookTimeMins: Number(cookTimeMins) || 0,
        isPublished: Boolean(isPublished),
        coachId,
        dietaryTags: {
          create: (tagIds || []).map((tagId: number) => ({
            tagId: Number(tagId),
          })),
        },
      },
    });

    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    console.error("Admin POST recipe error:", error);
    return NextResponse.json(
      { error: "Failed to create recipe" },
      { status: 500 }
    );
  }
}
