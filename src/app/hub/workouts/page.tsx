export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import WorkoutsBrowser from "./WorkoutsBrowser";
import RetryError from "@/components/ui/RetryError";

async function loadData(coachId: string) {
  const workouts = await prisma.workout.findMany({
    where: { isPublished: true, coachId },
    include: { subcategory: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.workoutCategory.findMany({
    include: {
      subcategories: {
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { displayOrder: "asc" },
  });

  return { workouts, categories };
}

export default async function WorkoutsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const coachId = user.role === "COACH" ? user.userId : user.coachId;
  if (!coachId) redirect("/login");

  let data;
  try {
    data = await loadData(coachId);
  } catch {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      data = await loadData(coachId);
    } catch {
      return <RetryError message="Failed to load workouts. This usually resolves on retry." />;
    }
  }

  const { workouts, categories } = data;

  const serialized = workouts.map(
    (w: {
      id: number;
      title: string;
      slug: string;
      description: string;
      videoUrl: string;
      difficulty: string;
      duration: string | null;
      targetGoal: string | null;
      subcategory: {
        id: number;
        name: string;
        slug: string;
        categoryId: number;
        category: { id: number; name: string; slug: string };
      };
    }) => ({
      id: w.id,
      title: w.title,
      slug: w.slug,
      description: w.description,
      videoUrl: w.videoUrl,
      difficulty: w.difficulty,
      duration: w.duration,
      targetGoal: w.targetGoal,
      subcategoryId: w.subcategory.id,
      subcategoryName: w.subcategory.name,
      categoryId: w.subcategory.categoryId,
      categoryName: w.subcategory.category.name,
    })
  );

  const cats = categories.map(
    (c: {
      id: number;
      name: string;
      slug: string;
      subcategories: { id: number; name: string; slug: string }[];
    }) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      subcategories: c.subcategories,
    })
  );

  return <WorkoutsBrowser workouts={serialized} categories={cats} />;
}
