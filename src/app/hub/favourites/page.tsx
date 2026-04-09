"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CATEGORY_EMOJI: Record<string, string> = {
  Breakfast: "\uD83E\uDD5E",
  Lunch: "\uD83E\uDD57",
  Dinner: "\uD83C\uDF56",
  Snacks: "\uD83E\uDD5C",
  Desserts: "\uD83C\uDF6B",
  Fakeaways: "\uD83C\uDF55",
};

interface FavRecipe {
  id: number;
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTimeMins: number;
  cookTimeMins: number;
  category: string;
}

export default function FavouritesPage() {
  const [recipes, setRecipes] = useState<FavRecipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFavourites() {
      try {
        const res = await fetch("/api/favourites/recipes");
        if (res.ok) {
          const data = await res.json();
          setRecipes(data);
        }
      } catch (err) {
        console.error("Failed to fetch favourites:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFavourites();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#E51A1A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2">My Favourites</h1>
      <p className="text-white/40 text-sm mb-8">
        Your saved recipes, all in one place.
      </p>

      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <Link
              key={recipe.id}
              href={`/hub/recipes/${recipe.slug}`}
              className="group bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-[#E51A1A]/30"
            >
              {/* Image / Placeholder */}
              <div className="relative h-[200px] bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] flex items-center justify-center">
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-5xl group-hover:scale-110 transition-transform duration-300">
                    {CATEGORY_EMOJI[recipe.category] || "\uD83C\uDF7D\uFE0F"}
                  </span>
                )}
                <span className="absolute top-3 right-3 bg-[#E51A1A]/20 text-[#E51A1A] text-xs font-bold px-3 py-1 rounded-full">
                  {recipe.category}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-5">
                <h3 className="font-bold text-white text-lg mb-1 group-hover:text-[#E51A1A] transition-colors">
                  {recipe.title}
                </h3>

                <div className="flex items-center gap-3 text-sm text-white/60 mb-3">
                  <span className="flex items-center gap-1">
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
                        d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"
                      />
                    </svg>
                    {recipe.calories} kcal
                  </span>
                  <span className="flex items-center gap-1">
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
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {recipe.prepTimeMins + recipe.cookTimeMins} min
                  </span>
                </div>

                {/* Macro Bar */}
                <div className="flex items-center gap-4 text-xs text-white/60">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#E51A1A]" />
                    P: {recipe.protein}g
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
                    C: {recipe.carbs}g
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#FFB800]" />
                    F: {recipe.fat}g
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">
            <svg
              className="w-16 h-16 mx-auto text-white/20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            No favourites yet
          </h2>
          <p className="text-white/50 mb-6">
            Browse recipes and click the heart to save them here.
          </p>
          <Link
            href="/hub/recipes"
            className="inline-block px-6 py-3 rounded-full text-sm font-bold bg-[#E51A1A] text-white hover:bg-[#C41010] transition-colors"
          >
            Browse Recipes
          </Link>
        </div>
      )}
    </div>
  );
}
