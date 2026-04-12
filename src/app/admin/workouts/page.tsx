export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminWorkoutsClient from "./AdminWorkoutsClient";

export default async function AdminWorkoutsPage() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "COACH") redirect("/login");
  const coachId = admin.userId;

  const workouts = await prisma.workout.findMany({
    where: { coachId },
    include: { subcategory: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });

  const serialized = workouts.map(
    (w: {
      id: number;
      title: string;
      slug: string;
      videoUrl: string;
      difficulty: string;
      duration: string | null;
      isPublished: boolean;
      createdAt: Date;
      subcategory: {
        name: string;
        category: { name: string };
      };
    }) => ({
      id: w.id,
      title: w.title,
      slug: w.slug,
      videoUrl: w.videoUrl,
      difficulty: w.difficulty,
      duration: w.duration,
      isPublished: w.isPublished,
      createdAt: w.createdAt.toISOString(),
      subcategoryName: w.subcategory.name,
      categoryName: w.subcategory.category.name,
    })
  );

  return <AdminWorkoutsClient workouts={serialized} />;
}
