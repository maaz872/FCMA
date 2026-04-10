"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PreviewModal from "@/components/admin/PreviewModal";

const ITEMS_PER_PAGE = 12;

const CATEGORY_EMOJI: Record<string, string> = {
  Breakfast: "\uD83E\uDD5E",
  Lunch: "\uD83E\uDD57",
  Dinner: "\uD83C\uDF56",
  Snacks: "\uD83E\uDD5C",
  Desserts: "\uD83C\uDF6B",
  Fakeaways: "\uD83C\uDF55",
};

interface RecipeRow {
  id: number;
  title: string;
  slug: string;
  category: string;
  calories: number;
  isPublished: boolean;
  createdAt: string;
}

export default function AdminRecipeList({
  recipes,
}: {
  recipes: RecipeRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [page, setPage] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewData, setPreviewData] = useState<any>(null);

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/admin/recipes/${id}`);
      if (res.ok) {
        const data = await res.json();
        const r = data.recipe || data;
        setPreviewData({
          title: r.title, description: r.description, videoUrl: r.videoUrl,
          calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat,
          servings: r.servings, prepTimeMins: r.prepTimeMins, cookTimeMins: r.cookTimeMins,
          ingredients: r.ingredients, instructions: r.instructions,
          category: r.category?.name || r.category,
        });
      }
    } catch { /* ignore */ }
  }

  const categories = [
    "All",
    ...Array.from(new Set(recipes.map((r) => r.category))),
  ];

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchSearch = r.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchCat = category === "All" || r.category === category;
      return matchSearch && matchCat;
    });
  }, [recipes, search, category]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  async function togglePublished(id: number, current: boolean) {
    try {
      await fetch(`/api/admin/recipes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to toggle published:", err);
    }
  }

  async function deleteRecipe(id: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/recipes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409 && data.linkedCount) {
          // Recipe is linked to plans — offer force delete
          if (confirm(`${data.error}\n\nDo you want to remove it from all plans and delete anyway?`)) {
            const forceRes = await fetch(`/api/admin/recipes/${id}?force=true`, { method: "DELETE" });
            if (!forceRes.ok) {
              const forceData = await forceRes.json();
              alert(forceData.error || "Failed to delete recipe.");
              return;
            }
          } else {
            return;
          }
        } else {
          alert(data.error || "Failed to delete recipe.");
          return;
        }
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to delete recipe:", err);
      alert("Failed to delete recipe. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Manage Recipes</h1>
        <Link
          href="/admin/recipes/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E51A1A] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          + Add Recipe
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A]"
        />
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#1E1E1E] border border-[#2A2A2A] text-white text-sm focus:outline-none focus:border-[#E51A1A]"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Card Grid */}
      {paginated.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl px-6 py-12 text-center text-white/30 text-sm">
          No recipes found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginated.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5 flex flex-col gap-3 hover:border-[#3A3A3A] transition-colors"
            >
              {/* Top: Emoji + Title */}
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">
                  {CATEGORY_EMOJI[recipe.category] || "\uD83C\uDF7D\uFE0F"}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-white truncate">
                    {recipe.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[11px] text-white/50 bg-[#2A2A2A] rounded-full px-2.5 py-0.5">
                      {recipe.category}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {recipe.calories} kcal
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom: Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2A]">
                <button
                  onClick={() => togglePublished(recipe.id, recipe.isPublished)}
                  className={`text-[11px] font-semibold px-3 py-1 rounded-full cursor-pointer border-none ${
                    recipe.isPublished
                      ? "bg-green-900/40 text-green-400"
                      : "bg-[#2A2A2A] text-white/30"
                  }`}
                >
                  {recipe.isPublished ? "Published" : "Draft"}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openPreview(recipe.id)}
                    className="text-[11px] px-3 py-1.5 bg-[#FF6B00]/10 text-[#FF6B00] rounded-lg font-medium hover:bg-[#FF6B00]/20 transition-colors cursor-pointer border-none"
                  >
                    Preview
                  </button>
                  <Link
                    href={`/admin/recipes/${recipe.id}/edit`}
                    className="text-[11px] px-3 py-1.5 bg-[#E51A1A]/10 text-[#E51A1A] rounded-lg font-medium hover:bg-[#E51A1A]/20 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => deleteRecipe(recipe.id, recipe.title)}
                    className="text-[11px] px-3 py-1.5 bg-red-900/20 text-red-400 rounded-lg font-medium hover:bg-red-900/40 transition-colors cursor-pointer border-none"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#1E1E1E] border border-[#2A2A2A] text-white/60 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border-none ${
                p === page
                  ? "bg-[#E51A1A] text-white"
                  : "bg-[#1E1E1E] border border-[#2A2A2A] text-white/60"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[#1E1E1E] border border-[#2A2A2A] text-white/60 disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      <p className="text-xs text-white/30 text-center">
        Showing {paginated.length} of {filtered.length} recipes
      </p>

      {/* Preview Modal */}
      {previewData && (
        <PreviewModal type="recipe" data={previewData} onClose={() => setPreviewData(null)} />
      )}
    </div>
  );
}
