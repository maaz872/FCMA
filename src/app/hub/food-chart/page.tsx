"use client";

import { useState, useEffect } from "react";

interface FoodItem {
  id: number;
  name: string;
  category: string;
  subcategory: string | null;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingSize: number | null;
  servingUnit: string | null;
}

const CATEGORIES = [
  "All",
  "Proteins",
  "Carbs",
  "Dairy",
  "Vegetables",
  "Fruits",
  "Fats & Oils",
  "Grains",
  "Beverages",
  "Snacks",
  "Condiments",
];

type SortMode = "name" | "cal-asc" | "cal-desc";

export default function FoodChartPage() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("name");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== "All") params.set("category", category);
        if (search) params.set("search", search);
        const res = await fetch(`/api/food-items?${params}`);
        const data = await res.json();
        setItems(data.items || []);
      } catch {
        console.error("Failed to load food items");
      }
      setLoading(false);
    }
    load();
  }, [category, search]);

  const sorted = [...items].sort((a, b) => {
    if (sort === "cal-asc") return a.caloriesPer100g - b.caloriesPer100g;
    if (sort === "cal-desc") return b.caloriesPer100g - a.caloriesPer100g;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Food Calorie Chart</h1>
        <p className="text-sm text-white/50 mt-1">
          Browse calories and macros for {items.length} foods
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              category === cat
                ? "bg-[#E51A1A] text-white"
                : "bg-[#1E1E1E] text-white/60 hover:text-white border border-[#2A2A2A]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search foods..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white placeholder-white/30 text-sm focus:outline-none focus:border-[#E51A1A]"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="px-3 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
        >
          <option value="name">A - Z</option>
          <option value="cal-asc">Calories: Low to High</option>
          <option value="cal-desc">Calories: High to Low</option>
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#E51A1A] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-center text-white/40 py-16">No foods found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map((food) => (
            <FoodCard key={food.id} food={food} />
          ))}
        </div>
      )}
    </div>
  );
}

function FoodCard({ food }: { food: FoodItem }) {
  const maxMacro = Math.max(
    food.proteinPer100g,
    food.carbsPer100g,
    food.fatPer100g,
    1
  );

  return (
    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4 hover:border-[#E51A1A]/30 transition">
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-sm font-bold text-white leading-tight">
          {food.name}
        </h3>
        <div className="text-right shrink-0">
          <p className="text-xl font-black text-[#E51A1A] leading-none">
            {food.caloriesPer100g}
          </p>
          <p className="text-[9px] text-white/40 mt-0.5">kcal/100g</p>
        </div>
      </div>

      {/* Macro Bars */}
      <div className="space-y-2 mb-3">
        <MacroBar
          label="Protein"
          value={food.proteinPer100g}
          max={maxMacro}
          color="#E51A1A"
        />
        <MacroBar
          label="Carbs"
          value={food.carbsPer100g}
          max={maxMacro}
          color="#FF6B00"
        />
        <MacroBar
          label="Fat"
          value={food.fatPer100g}
          max={maxMacro}
          color="#FFB800"
        />
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-1">
        <span className="px-2 py-0.5 bg-[#0A0A0A] text-white/40 text-[10px] rounded-full">
          {food.category}
        </span>
        {food.subcategory && (
          <span className="px-2 py-0.5 bg-[#0A0A0A] text-white/40 text-[10px] rounded-full">
            {food.subcategory}
          </span>
        )}
        {food.servingSize && food.servingUnit && !(food.servingUnit === "g" && food.servingSize === 100) && !(food.servingUnit === "ml" && food.servingSize === 100) && (
          <span className="px-2 py-0.5 bg-[#0A0A0A] text-white/40 text-[10px] rounded-full">
            1 serving = {food.servingSize}{food.servingUnit}
          </span>
        )}
      </div>
    </div>
  );
}

function MacroBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/50 w-10">{label}</span>
      <div className="flex-1 h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-white/50 w-8 text-right">
        {value}g
      </span>
    </div>
  );
}
