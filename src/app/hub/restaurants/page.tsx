export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import RestaurantsHub from "./RestaurantsHub";

export default async function RestaurantsPage() {
  const restaurants = await prisma.restaurantGuide.findMany({
    where: { isPublished: true },
  });

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
