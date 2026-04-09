"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithRetry } from "@/lib/fetch-retry";

interface MealLog {
  id: number;
  description: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedDate: string;
  loggedTime: string;
}

const MEAL_ORDER = ["Breakfast", "Lunch", "Snack", "Dinner"];
const MEAL_ICONS: Record<string, string> = { Breakfast: "🌅", Lunch: "☀️", Snack: "🍎", Dinner: "🌙" };

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

export default function MyMealsPage() {
  const [date, setDate] = useState(getTodayStr());
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editMeal, setEditMeal] = useState<MealLog | null>(null);
  const [editForm, setEditForm] = useState({ description: "", calories: "", protein: "", carbs: "", fat: "" });
  const [editSaving, setEditSaving] = useState(false);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithRetry(`/api/meals?date=${date}`);
      const data = await res.json();
      setMeals(data.meals || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  function changeDate(delta: number) {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }

  function openEdit(meal: MealLog) {
    setEditMeal(meal);
    setEditForm({
      description: meal.description,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
    });
  }

  async function saveEdit() {
    if (!editMeal) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/meals/${editMeal.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editForm.description.trim(),
          calories: parseInt(editForm.calories) || 0,
          protein: parseFloat(editForm.protein) || 0,
          carbs: parseFloat(editForm.carbs) || 0,
          fat: parseFloat(editForm.fat) || 0,
        }),
      });
      if (res.ok) {
        setEditMeal(null);
        fetchMeals();
      } else {
        alert("Failed to update meal");
      }
    } catch {
      alert("Failed to update meal");
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteMeal(id: number) {
    if (!confirm("Delete this meal log?")) return;
    try {
      const res = await fetch(`/api/meals/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMeals((prev) => prev.filter((m) => m.id !== id));
      }
    } catch {
      // ignore
    }
  }

  // Group meals by type
  const grouped = MEAL_ORDER.map((type) => ({
    type,
    icon: MEAL_ICONS[type] || "🍽️",
    meals: meals.filter((m) => m.mealType === type),
  })).filter((g) => g.meals.length > 0);

  // Daily totals
  const totals = meals.reduce(
    (acc, m) => ({ calories: acc.calories + m.calories, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const inputCls = "w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#E51A1A]/50";

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2">My Meals</h1>
      <p className="text-white/40 text-sm mb-6">Your off-plan meal log history</p>

      {/* Date navigation */}
      <div className="flex items-center justify-between bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl px-4 py-3 mb-6">
        <button onClick={() => changeDate(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2A2A2A] text-white/50 hover:text-white transition-colors cursor-pointer border-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">{formatDate(date)}</p>
          {date !== getTodayStr() && (
            <button onClick={() => setDate(getTodayStr())} className="text-[10px] text-[#E51A1A] hover:underline bg-transparent border-none cursor-pointer">
              Go to today
            </button>
          )}
        </div>
        <button onClick={() => changeDate(1)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2A2A2A] text-white/50 hover:text-white transition-colors cursor-pointer border-none">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      {/* Daily totals */}
      {meals.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-3 text-center">
            <p className="text-lg font-black text-white">{totals.calories}</p>
            <p className="text-[10px] text-white/40 uppercase font-semibold">Calories</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-blue-400">{Math.round(totals.protein)}g</p>
            <p className="text-[10px] text-blue-400/60 uppercase font-semibold">Protein</p>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-amber-400">{Math.round(totals.carbs)}g</p>
            <p className="text-[10px] text-amber-400/60 uppercase font-semibold">Carbs</p>
          </div>
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
            <p className="text-lg font-black text-rose-400">{Math.round(totals.fat)}g</p>
            <p className="text-[10px] text-rose-400/60 uppercase font-semibold">Fat</p>
          </div>
        </div>
      )}

      {/* Meal groups */}
      {loading ? (
        <div className="text-center py-12 text-white/30">Loading...</div>
      ) : grouped.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-10 text-center">
          <p className="text-white/40 text-lg mb-1">No meals logged</p>
          <p className="text-white/25 text-sm">Off-plan meals logged from My Plan will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.type} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-3">{group.icon} {group.type}</p>
              <div className="space-y-2">
                {group.meals.map((meal) => (
                  <div key={meal.id} className="flex items-center gap-3 bg-[#0A0A0A] rounded-xl p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {meal.description.startsWith("[Plan] ") ? (
                          <><span className="inline-block text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold mr-1.5 align-middle">PLAN</span>{meal.description.slice(7)}</>
                        ) : (
                          <><span className="inline-block text-[9px] bg-[#FF6B00]/20 text-[#FF6B00] px-1.5 py-0.5 rounded font-bold mr-1.5 align-middle">OFF</span>{meal.description}</>
                        )}
                      </p>
                      <p className="text-[11px] text-white/40">
                        {meal.calories} kcal &middot; {Math.round(meal.protein)}g P &middot; {Math.round(meal.carbs)}g C &middot; {Math.round(meal.fat)}g F
                        <span className="ml-2 text-white/20">{meal.loggedTime}</span>
                      </p>
                    </div>
                    <button onClick={() => openEdit(meal)} className="text-white/30 hover:text-white p-1.5 bg-transparent border-none cursor-pointer" title="Edit">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button onClick={() => deleteMeal(meal.id)} className="text-red-400/40 hover:text-red-400 p-1.5 bg-transparent border-none cursor-pointer" title="Delete">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editMeal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl w-full max-w-sm">
            <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
              <h3 className="text-white font-semibold">Edit Meal</h3>
              <button onClick={() => setEditMeal(null)} className="text-white/40 hover:text-white text-xl bg-transparent border-none cursor-pointer">&times;</button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs text-white/50 mb-1">Description</label>
                <input type="text" value={editForm.description} onChange={(e) => setEditForm(p => ({ ...p, description: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Calories</label>
                  <input type="number" value={editForm.calories} onChange={(e) => setEditForm(p => ({ ...p, calories: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Protein (g)</label>
                  <input type="number" value={editForm.protein} onChange={(e) => setEditForm(p => ({ ...p, protein: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Carbs (g)</label>
                  <input type="number" value={editForm.carbs} onChange={(e) => setEditForm(p => ({ ...p, carbs: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">Fat (g)</label>
                  <input type="number" value={editForm.fat} onChange={(e) => setEditForm(p => ({ ...p, fat: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-[#2A2A2A] flex items-center justify-end gap-2">
              <button onClick={() => setEditMeal(null)} className="px-4 py-1.5 text-sm text-white/50 bg-transparent border-none cursor-pointer">Cancel</button>
              <button onClick={saveEdit} disabled={editSaving}
                className="px-5 py-1.5 bg-[#E51A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#E51A1A]/90 transition-colors disabled:opacity-50 cursor-pointer border-none">
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
