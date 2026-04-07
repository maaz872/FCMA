export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import RestaurantsHub from "./RestaurantsHub";
import RetryError from "@/components/ui/RetryError";

async function loadData() {
  return prisma.restaurantGuide.findMany({
    where: { isPublished: true },
  });
}

export default async function RestaurantsPage() {
  let restaurants;
  try {
    restaurants = await loadData();
  } catch {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      restaurants = await loadData();
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
