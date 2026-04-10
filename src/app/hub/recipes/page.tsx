export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import RecipeBrowser from "./RecipeBrowser";
import RetryError from "@/components/ui/RetryError";

async function loadData(coachId: string) {
  const recipes = await prisma.recipe.findMany({
    where: { isPublished: true, coachId },
    include: { category: true, dietaryTags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.recipeCategory.findMany({
    orderBy: { displayOrder: "asc" },
  });

  const tags = await prisma.dietaryTag.findMany();

  return { recipes, categories, tags };
}

export default async function RecipesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const coachId = user.role === "COACH" ? user.userId : user.coachId;
  if (!coachId) redirect("/login");

  let data;
  try {
    data = await loadData(coachId);
  } catch {
    // Retry once on cold start failure
    try {
      await new Promise((r) => setTimeout(r, 1000));
      data = await loadData(coachId);
    } catch {
      return <RetryError message="Failed to load recipes. This usually resolves on retry." />;
    }
  }

  const { recipes, categories, tags } = data;

  const serializedRecipes = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    description: r.description,
    category: r.category.name,
    tags: r.dietaryTags.map((dt) => dt.tag.name),
    ingredients: JSON.parse(r.ingredients) as string[],
    instructions: JSON.parse(r.instructions) as string[],
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

  const categoryNames = ["All", ...categories.map((c) => c.name)];
  const tagNames = tags.map((t) => t.name);

  return (
    <RecipeBrowser
      recipes={serializedRecipes}
      categories={categoryNames}
      tags={tagNames}
    />
  );
}
