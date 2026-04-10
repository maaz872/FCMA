export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import FavouriteButton from "@/components/ui/FavouriteButton";

const CATEGORY_EMOJI: Record<string, string> = {
  Breakfast: "\uD83E\uDD5E",
  Lunch: "\uD83E\uDD57",
  Dinner: "\uD83C\uDF56",
  Snacks: "\uD83E\uDD5C",
  Desserts: "\uD83C\uDF6B",
  Fakeaways: "\uD83C\uDF55",
};

import VideoEmbed from "@/components/ui/VideoEmbed";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const coachId = user.role === "COACH" ? user.userId : user.coachId;
  if (!coachId) redirect("/login");

  const recipe = await prisma.recipe.findFirst({
    where: { slug, coachId },
    include: { category: true, dietaryTags: { include: { tag: true } } },
  });

  if (!recipe) {
    notFound();
  }

  // Check if user has favourited this recipe
  let isFavourited = false;
  const fav = await prisma.favourite.findFirst({
    where: {
      userId: user.userId,
      recipeId: recipe.id,
    },
  });
  isFavourited = !!fav;

  const ingredients: string[] = JSON.parse(recipe.ingredients);
  const instructions: string[] = JSON.parse(recipe.instructions);

  const totalMacros = recipe.protein + recipe.carbs + recipe.fat;
  const proteinPct = totalMacros > 0 ? Math.round((recipe.protein / totalMacros) * 100) : 0;
  const carbsPct = totalMacros > 0 ? Math.round((recipe.carbs / totalMacros) * 100) : 0;
  const fatPct = totalMacros > 0 ? Math.round((recipe.fat / totalMacros) * 100) : 0;

  const hasVideo = !!recipe.videoUrl;

  return (
    <div>
      {/* Back Link */}
      <Link
        href="/hub/recipes"
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#E51A1A] transition-colors mb-6"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Recipes
      </Link>

      {/* Title + Favourite + Badges */}
      <div className="flex items-start gap-4 mb-3">
        <h1 className="text-3xl font-black text-white">{recipe.title}</h1>
        <div className="relative flex-shrink-0 w-10 h-10">
          <FavouriteButton
            type="recipe"
            itemId={recipe.id}
            initialFavourited={isFavourited}
            className="!static !w-10 !h-10"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-8">
        <span className="inline-flex items-center gap-1.5 bg-[#E51A1A]/20 text-[#E51A1A] text-sm font-bold px-3 py-1 rounded-full">
          {CATEGORY_EMOJI[recipe.category.name] || "\uD83C\uDF7D\uFE0F"}{" "}
          {recipe.category.name}
        </span>
        {recipe.dietaryTags.map((dt: { tag: { id: number; name: string } }) => (
          <span
            key={dt.tag.id}
            className="bg-[#1E1E1E] border border-[#2A2A2A] text-white/60 text-xs font-semibold px-3 py-1 rounded-full"
          >
            {dt.tag.name}
          </span>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT COLUMN */}
        <div className="flex-1 min-w-0">
          {/* Video Section */}
          {hasVideo ? (
            <div className="mb-8">
              <VideoEmbed url={recipe.videoUrl!} />
            </div>
          ) : (
            <div className="relative aspect-video bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl flex flex-col items-center justify-center mb-8 overflow-hidden">
              <svg className="w-16 h-16 text-white/20 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              <span className="text-white/40 text-sm font-semibold">Video Coming Soon</span>
            </div>
          )}

          {/* Description */}
          <p className="text-white/70 text-lg leading-relaxed mb-8">
            {recipe.description}
          </p>

          {/* Ingredients */}
          <section className="mb-8">
            <h2 className="text-2xl font-black text-white mb-4">
              Ingredients
            </h2>
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
              <ul className="space-y-3">
                {ingredients.map((ingredient, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 w-5 h-5 rounded-full bg-[#E51A1A]/20 text-[#E51A1A] flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <span className="text-white/70">{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Instructions */}
          <section className="mb-8">
            <h2 className="text-2xl font-black text-white mb-4">
              Instructions
            </h2>
            <div className="space-y-4">
              {instructions.map((step, i) => (
                <div
                  key={i}
                  className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5 flex gap-4"
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E51A1A] text-white flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-white/70 pt-1">{step}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="w-full lg:w-[340px] flex-shrink-0">
          <div className="lg:sticky lg:top-8 space-y-6">
            {/* Macro Card */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">
                Nutrition Per Serving
              </h3>

              {/* Calories */}
              <div className="text-center mb-6">
                <span className="text-5xl font-black text-white">
                  {recipe.calories}
                </span>
                <span className="text-white/40 text-sm ml-1">kcal</span>
              </div>

              {/* Macro Bars */}
              <div className="space-y-4 mb-6">
                {/* Protein */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-white">Protein</span>
                    <span className="text-white/60">{recipe.protein}g</span>
                  </div>
                  <div className="h-2.5 bg-[#1E1E1E]/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E51A1A] rounded-full transition-all duration-500"
                      style={{ width: `${proteinPct}%` }}
                    />
                  </div>
                </div>

                {/* Carbs */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-white">Carbs</span>
                    <span className="text-white/60">{recipe.carbs}g</span>
                  </div>
                  <div className="h-2.5 bg-[#1E1E1E]/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF6B00] rounded-full transition-all duration-500"
                      style={{ width: `${carbsPct}%` }}
                    />
                  </div>
                </div>

                {/* Fat */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-semibold text-white">Fat</span>
                    <span className="text-white/60">{recipe.fat}g</span>
                  </div>
                  <div className="h-2.5 bg-[#1E1E1E]/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FFB800] rounded-full transition-all duration-500"
                      style={{ width: `${fatPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Info Rows */}
              <div className="border-t border-[#2A2A2A] pt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Servings</span>
                  <span className="font-semibold text-white">
                    {recipe.servings}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Prep Time</span>
                  <span className="font-semibold text-white">
                    {recipe.prepTimeMins} min
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Cook Time</span>
                  <span className="font-semibold text-white">
                    {recipe.cookTimeMins > 0
                      ? `${recipe.cookTimeMins} min`
                      : "None"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">Total Time</span>
                  <span className="font-semibold text-white">
                    {recipe.prepTimeMins + recipe.cookTimeMins} min
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
