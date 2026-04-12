export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminRecipeList from "./AdminRecipeList";

export default async function AdminRecipesPage() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "COACH") redirect("/login");
  const coachId = admin.userId;

  const recipes = await prisma.recipe.findMany({
    where: { coachId },
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
