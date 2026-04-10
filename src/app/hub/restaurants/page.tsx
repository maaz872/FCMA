export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import RestaurantsHub from "./RestaurantsHub";
import RetryError from "@/components/ui/RetryError";

async function loadData(coachId: string) {
  return prisma.restaurantGuide.findMany({
    where: { isPublished: true, coachId },
  });
}

export default async function RestaurantsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const coachId = user.role === "COACH" ? user.userId : user.coachId;
  if (!coachId) redirect("/login");

  let restaurants;
  try {
    restaurants = await loadData(coachId);
  } catch {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      restaurants = await loadData(coachId);
    } catch {
      return <RetryError message="Failed to load restaurants. This usually resolves on retry." />;
    }
  }

  const serialized = restaurants.map((r) => {
    let itemCount = 0;
    try {
      const items = JSON.parse(r.menuItems);
      itemCount = Array.isArray(items) ? items.length : 0;
    } catch {}
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      logoUrl: r.logoUrl,
      introduction: r.introduction,
      itemCount,
    };
  });

  return <RestaurantsHub restaurants={serialized} />;
}
