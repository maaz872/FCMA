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
  fiberPer100g: number | null;
  servingSize: number | null;
  servingUnit: string | null;
  isVerified: boolean;
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

const EMPTY_FORM: Omit<FoodItem, "id"> = {
  name: "",
  category: "Proteins",
  subcategory: null,
  caloriesPer100g: 0,
  proteinPer100g: 0,
  carbsPer100g: 0,
  fatPer100g: 0,
  fiberPer100g: null,
  servingSize: null,
  servingUnit: null,
  isVerified: true,
};

export default function FoodDatabasePage() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState("All");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/food-database");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      console.error("Failed to fetch food items");
    }
    setLoading(false);
  }

  const filtered = items.filter((item) => {
    const matchCat = selectedCat === "All" || item.category === selectedCat;
    const matchSearch =
      !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped = CATEGORIES.slice(1).reduce(
    (acc, cat) => {
      const catItems = filtered.filter((i) => i.category === cat);
      if (catItems.length > 0) acc[cat] = catItems;
      return acc;
    },
    {} as Record<string, FoodItem[]>
  );

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(item: FoodItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      caloriesPer100g: item.caloriesPer100g,
      proteinPer100g: item.proteinPer100g,
      carbsPer100g: item.carbsPer100g,
      fatPer100g: item.fatPer100g,
      fiberPer100g: item.fiberPer100g,
      servingSize: item.servingSize,
      servingUnit: item.servingUnit,
      isVerified: item.isVerified,
    });
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/food-database/${editingId}`
        : "/api/admin/food-database";
      const method = editingId ? "PUT" : "POST";
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setShowForm(false);
      fetchItems();
    } catch {
      alert("Failed to save");
    }
    setSaving(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this food item?")) return;
    try {
      await fetch(`/api/admin/food-database/${id}`, { method: "DELETE" });
      fetchItems();
    } catch {
      alert("Failed to delete");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Food Database</h1>
          <p className="text-sm text-white/50 mt-1">
            {items.length} items in database
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-4 py-2 bg-[#E51A1A] text-white rounded-lg font-medium hover:bg-[#E51A1A]/90 transition"
        >
          + Add Food
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCat(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              selectedCat === cat
                ? "bg-[#E51A1A] text-white"
                : "bg-[#1E1E1E] text-white/60 hover:text-white border border-[#2A2A2A]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search food items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#E51A1A]"
      />

      {/* Food Items Grid */}
      {selectedCat === "All" ? (
        Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <h2 className="text-lg font-semibold text-white mb-3">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {catItems.map((item) => (
                <FoodCard
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <FoodCard
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-center text-white/40 py-12">No food items found.</p>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">
              {editingId ? "Edit Food Item" : "Add Food Item"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  >
                    {CATEGORIES.slice(1).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Subcategory</label>
                  <input
                    value={form.subcategory || ""}
                    onChange={(e) =>
                      setForm({ ...form, subcategory: e.target.value || null })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Calories / 100g</label>
                  <input
                    type="number"
                    value={form.caloriesPer100g}
                    onChange={(e) =>
                      setForm({ ...form, caloriesPer100g: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Protein / 100g</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.proteinPer100g}
                    onChange={(e) =>
                      setForm({ ...form, proteinPer100g: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Carbs / 100g</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.carbsPer100g}
                    onChange={(e) =>
                      setForm({ ...form, carbsPer100g: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Fat / 100g</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.fatPer100g}
                    onChange={(e) =>
                      setForm({ ...form, fatPer100g: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Fiber / 100g</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.fiberPer100g ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        fiberPer100g: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Serving (g)</label>
                  <input
                    type="number"
                    value={form.servingSize ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        servingSize: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Serving Unit</label>
                  <input
                    value={form.servingUnit || ""}
                    onChange={(e) =>
                      setForm({ ...form, servingUnit: e.target.value || null })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[#E51A1A]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-[#2A2A2A] text-white rounded-lg font-medium hover:bg-[#333] transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 px-4 py-2 bg-[#E51A1A] text-white rounded-lg font-medium hover:bg-[#E51A1A]/90 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : editingId ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Food Card Component ───────────────────────────────────────────── */

function FoodCard({
  item,
  onEdit,
  onDelete,
}: {
  item: FoodItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const maxMacro = Math.max(item.proteinPer100g, item.carbsPer100g, item.fatPer100g, 1);

  return (
    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 hover:border-[#E51A1A]/30 transition">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-white leading-tight">
          {item.name}
        </h3>
        <span className="shrink-0 px-2 py-0.5 bg-[#E51A1A]/20 text-[#E51A1A] text-xs font-bold rounded-full">
          {item.caloriesPer100g} kcal
        </span>
      </div>

      {/* Macro bars */}
      <div className="space-y-1.5 mb-3">
        <MacroBar label="P" value={item.proteinPer100g} max={maxMacro} color="#E51A1A" />
        <MacroBar label="C" value={item.carbsPer100g} max={maxMacro} color="#FF6B00" />
        <MacroBar label="F" value={item.fatPer100g} max={maxMacro} color="#FFB800" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        <span className="px-2 py-0.5 bg-[#0A0A0A] text-white/50 text-[10px] rounded-full">
          {item.category}
        </span>
        {item.subcategory && (
          <span className="px-2 py-0.5 bg-[#0A0A0A] text-white/50 text-[10px] rounded-full">
            {item.subcategory}
          </span>
        )}
        {item.servingSize && item.servingUnit && !(item.servingUnit === "g" && item.servingSize === 100) && !(item.servingUnit === "ml" && item.servingSize === 100) && (
          <span className="px-2 py-0.5 bg-[#0A0A0A] text-white/40 text-[10px] rounded-full">
            1 serving = {item.servingSize}{item.servingUnit}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-2 py-1.5 bg-[#2A2A2A] text-white/70 text-xs rounded-lg hover:bg-[#333] transition"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="px-2 py-1.5 bg-red-900/30 text-red-400 text-xs rounded-lg hover:bg-red-900/50 transition"
        >
          Delete
        </button>
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
      <span className="text-[10px] text-white/50 w-3">{label}</span>
      <div className="flex-1 h-1.5 bg-[#0A0A0A] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] text-white/50 w-8 text-right">{value}g</span>
    </div>
  );
}
