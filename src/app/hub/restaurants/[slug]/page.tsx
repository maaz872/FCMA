export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

interface MenuItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isBestChoice?: boolean;
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const restaurant = await prisma.restaurantGuide.findFirst({
    where: { slug },
  });

  if (!restaurant || !restaurant.isPublished) {
    notFound();
  }

  let menuItems: MenuItem[] = [];
  try {
    menuItems = JSON.parse(restaurant.menuItems);
  } catch {}

  const calories = menuItems.map((i) => i.calories);
  const proteins = menuItems.map((i) => i.protein);
  const carbs = menuItems.map((i) => i.carbs);
  const fats = menuItems.map((i) => i.fat);

  const range = (arr: number[]) =>
    arr.length > 0
      ? { min: Math.min(...arr), max: Math.max(...arr) }
      : { min: 0, max: 0 };

  const calRange = range(calories);
  const proRange = range(proteins);
  const carbRange = range(carbs);
  const fatRange = range(fats);

  return (
    <div>
      {/* Back link */}
      <Link
        href="/hub/restaurants"
        className="text-primary font-semibold hover:underline inline-flex items-center gap-1 mb-6"
      >
        &larr; Back to Restaurants
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <span className="text-5xl">{restaurant.logoUrl || "🍽"}</span>
        <h1 className="text-3xl font-black text-white">{restaurant.name}</h1>
      </div>

      {/* Introduction */}
      <p className="text-white/60 text-base leading-relaxed mb-8 max-w-3xl">
        {restaurant.introduction}
      </p>

      {/* Menu Items Table */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-[#2A2A2A]">
          <h2 className="text-lg font-bold text-white">Menu Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left px-6 py-3 font-semibold text-white/60">
                  Item
                </th>
                <th className="text-right px-4 py-3 font-semibold text-white/60">
                  Calories
                </th>
                <th className="text-right px-4 py-3 font-semibold text-white/60">
                  Protein
                </th>
                <th className="text-right px-4 py-3 font-semibold text-white/60">
                  Carbs
                </th>
                <th className="text-right px-4 py-3 font-semibold text-white/60">
                  Fat
                </th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item, idx) => (
                <tr
                  key={item.name}
                  className={`border-b border-[#1A1A1A] ${
                    item.isBestChoice
                      ? "bg-green-900/20"
                      : idx % 2 === 0
                        ? "bg-[#1E1E1E]"
                        : "bg-[#161616]"
                  }`}
                >
                  <td className="px-6 py-3 font-medium text-white">
                    <span className="flex items-center gap-2 flex-wrap">
                      {item.name}
                      {item.isBestChoice && (
                        <span className="inline-block text-xs font-bold text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full whitespace-nowrap">
                          Best Choice
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="text-right px-4 py-3 text-white/70">
                    {item.calories}
                  </td>
                  <td className="text-right px-4 py-3 text-white/70">
                    {item.protein}g
                  </td>
                  <td className="text-right px-4 py-3 text-white/70">
                    {item.carbs}g
                  </td>
                  <td className="text-right px-4 py-3 text-white/70">
                    {item.fat}g
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ordering Tips */}
      {restaurant.tips && (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-3">Ordering Tips</h2>
          <p className="text-white/60 leading-relaxed">{restaurant.tips}</p>
        </div>
      )}

      {/* Macro Ranges */}
      {menuItems.length > 0 && (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">Macro Ranges</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#161616] rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                Calories
              </p>
              <p className="text-lg font-bold text-white">
                {calRange.min} - {calRange.max}
              </p>
              <p className="text-xs text-white/40">kcal</p>
            </div>
            <div className="bg-[#161616] rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                Protein
              </p>
              <p className="text-lg font-bold text-white">
                {proRange.min}g - {proRange.max}g
              </p>
            </div>
            <div className="bg-[#161616] rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                Carbs
              </p>
              <p className="text-lg font-bold text-white">
                {carbRange.min}g - {carbRange.max}g
              </p>
            </div>
            <div className="bg-[#161616] rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                Fat
              </p>
              <p className="text-lg font-bold text-white">
                {fatRange.min}g - {fatRange.max}g
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
