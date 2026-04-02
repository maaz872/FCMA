export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import RestaurantsAdmin from "./RestaurantsAdmin";

export default async function AdminRestaurantsPage() {
  const restaurants = await prisma.restaurantGuide.findMany({
    orderBy: { name: "asc" },
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
      isPublished: r.isPublished,
      itemCount,
    };
  });

  return <RestaurantsAdmin restaurants={serialized} />;
}
