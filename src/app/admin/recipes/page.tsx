export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import AdminRecipeList from "./AdminRecipeList";

export default async function AdminRecipesPage() {
  const recipes = await prisma.recipe.findMany({
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = recipes.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    category: r.category.name,
    calories: r.calories,
    isPublished: r.isPublished,
    createdAt: r.createdAt.toISOString(),
  }));

  return <AdminRecipeList recipes={serialized} />;
}
