"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import WorkoutPickerModal, {
  type PickableWorkout,
} from "@/components/admin/WorkoutPickerModal";
import WorkoutMediaThumbnail from "@/components/ui/WorkoutMediaThumbnail";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Workout = PickableWorkout;

interface ExerciseEntry {
  workoutId: number;
  workoutTitle: string;
  gifUrl: string | null;
  videoUrl: string | null;
  bodyPart: string | null;
  equipment: string | null;
  sets: number | null;
  repsLow: number | null;
  repsHigh: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  weightKg: number | null;
  notes: string;
}

interface RecipeOption {
  id: number;
  title: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
}

interface MealEntry {
  mealType: string;
  recipeId: number;
  recipeTitle: string;
  servings: number;
  sortOrder: number;
  // per-serving macros
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  baseServings: number;
}

interface TemplateDay {
  id?: number;
  dayOfWeek: number;
  weekNumber: number;
  workoutId: number | null; // legacy single-workout field, retained for back-compat
  workoutNotes: string;
  mealPlan: string;
  calorieTarget: string;
  proteinTarget: string;
  carbsTarget: string;
  fatTarget: string;
  notes: string;
  meals: MealEntry[];
  exercises: ExerciseEntry[];
}

interface Template {
  id: number;
  name: string;
  description: string | null;
  type: string;
  durationWeeks: number;
  days: (TemplateDay & { workout?: Workout | null })[];
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", icon: "🌅" },
  { key: "lunch", label: "Lunch", icon: "☀️" },
  { key: "snack", label: "Snack", icon: "🍎" },
  { key: "dinner", label: "Dinner", icon: "🌙" },
];

function emptyDay(weekNumber: number, dayOfWeek: number): TemplateDay {
  return {
    dayOfWeek,
    weekNumber,
    workoutId: null,
    workoutNotes: "",
    mealPlan: "",
    calorieTarget: "",
    proteinTarget: "",
    carbsTarget: "",
    fatTarget: "",
    notes: "",
    meals: [],
    exercises: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EditPlanTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [recipes, setRecipes] = useState<RecipeOption[]>([]);
  const [days, setDays] = useState<Map<string, TemplateDay>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [expandedMealTypes, setExpandedMealTypes] = useState<Set<string>>(new Set());
  const [copyMode, setCopyMode] = useState<{ source: string; targets: Set<string> } | null>(null);

  // Edit form state for current cell
  const [cellForm, setCellForm] = useState<TemplateDay>(emptyDay(1, 1));
  const [workoutPickerOpen, setWorkoutPickerOpen] = useState(false);

  // Inline "auto-progress this exercise across all weeks" popover
  const [progressionForIdx, setProgressionForIdx] = useState<number | null>(null);
  const [progStart, setProgStart] = useState("");
  const [progIncrement, setProgIncrement] = useState("2.5");
  const [progDeloadWeek, setProgDeloadWeek] = useState("");
  const [progDeloadKg, setProgDeloadKg] = useState("");
  const [progApplying, setProgApplying] = useState(false);

  async function applyProgression(exerciseIdx: number) {
    if (!template) return;
    const ex = cellForm.exercises[exerciseIdx];
    const startKg = parseFloat(progStart);
    const incrementKg = parseFloat(progIncrement);
    if (!Number.isFinite(startKg) || !Number.isFinite(incrementKg)) {
      alert("Start kg and increment kg are required");
      return;
    }
    setProgApplying(true);
    const res = await fetch(`/api/admin/plans/${template.id}/progression`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutId: ex.workoutId,
        dayOfWeek: cellForm.dayOfWeek,
        startKg,
        incrementKg,
        deloadWeek: progDeloadWeek ? Number(progDeloadWeek) : null,
        deloadKg: progDeloadKg ? Number(progDeloadKg) : null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Failed to apply progression");
      setProgApplying(false);
      return;
    }
    const data = await res.json();
    alert(`Applied progression to ${data.touched} weeks. Reloading…`);
    // Reload the editor's day map so the visible weights reflect the new state
    router.refresh();
    setProgressionForIdx(null);
    setProgApplying(false);
  }

  const dayKey = (week: number, day: number) => `${week}-${day}`;

  // ── Exercise list helpers (used by the cell modal) ──
  function addExerciseFromWorkout(w: PickableWorkout) {
    setCellForm((prev) => ({
      ...prev,
      exercises: [
        ...prev.exercises,
        {
          workoutId: w.id,
          workoutTitle: w.title,
          gifUrl: w.gifUrl,
          videoUrl: (w as PickableWorkout & { videoUrl?: string }).videoUrl ?? null,
          bodyPart: w.bodyPart,
          equipment: w.equipment,
          sets: 3,
          repsLow: 10,
          repsHigh: 12,
          durationSeconds: null,
          restSeconds: 60,
          weightKg: null,
          notes: "",
        },
      ],
    }));
  }

  function removeExerciseAt(i: number) {
    setCellForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, idx) => idx !== i),
    }));
  }

  function moveExercise(i: number, direction: -1 | 1) {
    setCellForm((prev) => {
      const j = i + direction;
      if (j < 0 || j >= prev.exercises.length) return prev;
      const next = [...prev.exercises];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...prev, exercises: next };
    });
  }

  function updateExerciseField<K extends keyof ExerciseEntry>(
    i: number,
    key: K,
    value: ExerciseEntry[K]
  ) {
    setCellForm((prev) => {
      const next = [...prev.exercises];
      next[i] = { ...next[i], [key]: value };
      return { ...prev, exercises: next };
    });
  }

  const loadData = useCallback(async () => {
    try {
      const [tRes, wRes, rRes] = await Promise.all([
        fetch(`/api/admin/plans/${id}`),
        fetch("/api/admin/workouts"),
        fetch("/api/admin/recipes"),
      ]);
      const tData = await tRes.json();
      const wData = await wRes.json();
      const rData = await rRes.json();

      setTemplate(tData);
      setWorkouts(
        (wData as Array<Workout & { subcategory?: Workout["subcategory"]; videoUrl?: string }>).map(
          (w) => ({
            id: w.id,
            title: w.title,
            slug: w.slug,
            gifUrl: w.gifUrl ?? null,
            videoUrl: w.videoUrl ?? null,
            bodyPart: w.bodyPart ?? null,
            equipment: w.equipment ?? null,
            primaryMuscles: w.primaryMuscles ?? null,
            difficulty: w.difficulty || "Intermediate",
            subcategory: w.subcategory ?? null,
          })
        )
      );
      setRecipes(
        (rData.recipes || []).map((r: RecipeOption & { categoryId?: number }) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          calories: r.calories,
          protein: r.protein,
          carbs: r.carbs,
          fat: r.fat,
          servings: r.servings || 1,
        }))
      );

      // Build days map
      const map = new Map<string, TemplateDay>();
      for (const d of tData.days) {
        map.set(dayKey(d.weekNumber, d.dayOfWeek), {
          dayOfWeek: d.dayOfWeek,
          weekNumber: d.weekNumber,
          workoutId: d.workoutId,
          workoutNotes: d.workoutNotes || "",
          mealPlan: d.mealPlan || "",
          calorieTarget: d.calorieTarget != null ? String(d.calorieTarget) : "",
          proteinTarget: d.proteinTarget != null ? String(d.proteinTarget) : "",
          carbsTarget: d.carbsTarget != null ? String(d.carbsTarget) : "",
          fatTarget: d.fatTarget != null ? String(d.fatTarget) : "",
          notes: d.notes || "",
          meals: (d.meals || []).map((m: { mealType: string; recipeId: number; servings: number; sortOrder: number; recipe: RecipeOption }) => ({
            mealType: m.mealType,
            recipeId: m.recipeId,
            recipeTitle: m.recipe?.title || "Unknown",
            servings: m.servings,
            sortOrder: m.sortOrder,
            calories: m.recipe?.calories || 0,
            protein: m.recipe?.protein || 0,
            carbs: m.recipe?.carbs || 0,
            fat: m.recipe?.fat || 0,
            baseServings: m.recipe?.servings || 1,
          })),
          exercises: (d.exercises || []).map(
            (ex: {
              workoutId: number;
              orderIndex: number;
              sets: number | null;
              repsLow: number | null;
              repsHigh: number | null;
              durationSeconds: number | null;
              restSeconds: number | null;
              weightKg: number | null;
              notes: string | null;
              workout?: {
                title?: string;
                gifUrl?: string | null;
                videoUrl?: string | null;
                bodyPart?: string | null;
                equipment?: string | null;
              } | null;
            }) => ({
              workoutId: ex.workoutId,
              workoutTitle: ex.workout?.title || "Exercise",
              gifUrl: ex.workout?.gifUrl ?? null,
              videoUrl: ex.workout?.videoUrl ?? null,
              bodyPart: ex.workout?.bodyPart ?? null,
              equipment: ex.workout?.equipment ?? null,
              sets: ex.sets,
              repsLow: ex.repsLow,
              repsHigh: ex.repsHigh,
              durationSeconds: ex.durationSeconds,
              restSeconds: ex.restSeconds,
              weightKg: ex.weightKg,
              notes: ex.notes ?? "",
            })
          ),
        });
      }
      setDays(map);
    } catch {
      alert("Failed to load template data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function openCell(week: number, day: number) {
    const key = dayKey(week, day);
    const existing = days.get(key);
    const form = existing ? { ...existing, meals: [...existing.meals] } : emptyDay(week, day);
    setCellForm(form);
    // Expand meal types that have recipes
    const expanded = new Set<string>();
    for (const m of form.meals) {
      expanded.add(m.mealType);
    }
    setExpandedMealTypes(expanded);
    setEditingCell(key);
  }

  function saveCell() {
    if (!editingCell) return;
    const updated = new Map(days);

    const hasData =
      cellForm.workoutId ||
      cellForm.workoutNotes.trim() ||
      cellForm.mealPlan.trim() ||
      cellForm.calorieTarget ||
      cellForm.notes.trim() ||
      cellForm.meals.length > 0 ||
      cellForm.exercises.length > 0;

    if (hasData) {
      updated.set(editingCell, { ...cellForm });
    } else {
      updated.delete(editingCell);
    }

    setDays(updated);
    setEditingCell(null);
  }

  function clearCell() {
    if (!editingCell) return;
    const updated = new Map(days);
    updated.delete(editingCell);
    setDays(updated);
    setEditingCell(null);
  }

  // ── Copy helpers ──

  function startCopyDay() {
    if (!editingCell) return;
    // Save the current cell first
    saveCell();
    setCopyMode({ source: editingCell, targets: new Set() });
  }

  function toggleCopyTarget(key: string) {
    if (!copyMode) return;
    const next = new Set(copyMode.targets);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCopyMode({ ...copyMode, targets: next });
  }

  function executeCopy() {
    if (!copyMode || copyMode.targets.size === 0) return;
    const source = days.get(copyMode.source);
    if (!source) { setCopyMode(null); return; }

    const updated = new Map(days);
    for (const targetKey of copyMode.targets) {
      const [wStr, dStr] = targetKey.split("-");
      const weekNum = parseInt(wStr);
      const dayNum = parseInt(dStr);
      updated.set(targetKey, {
        ...source,
        weekNumber: weekNum,
        dayOfWeek: dayNum,
        meals: source.meals.map(m => ({ ...m })),
        exercises: source.exercises.map(ex => ({ ...ex })),
      });
    }
    setDays(updated);
    setCopyMode(null);
  }

  function copyWeekToAll(sourceWeek: number) {
    if (!template) return;
    const updated = new Map(days);
    for (let dow = 1; dow <= 7; dow++) {
      const srcKey = dayKey(sourceWeek, dow);
      const src = days.get(srcKey);
      for (let w = 1; w <= template.durationWeeks; w++) {
        if (w === sourceWeek) continue;
        const tgtKey = dayKey(w, dow);
        if (src) {
          updated.set(tgtKey, {
            ...src,
            weekNumber: w,
            dayOfWeek: dow,
            meals: src.meals.map(m => ({ ...m })),
            exercises: src.exercises.map(ex => ({ ...ex })),
          });
        } else {
          updated.delete(tgtKey);
        }
      }
    }
    setDays(updated);
  }

  // Calculate total macros from all meals
  function calcMealTotals(meals: MealEntry[]) {
    let cal = 0, pro = 0, car = 0, fa = 0;
    for (const m of meals) {
      const mult = m.servings / m.baseServings;
      cal += Math.round(m.calories * mult);
      pro += Math.round(m.protein * mult * 10) / 10;
      car += Math.round(m.carbs * mult * 10) / 10;
      fa += Math.round(m.fat * mult * 10) / 10;
    }
    return { calories: cal, protein: pro, carbs: car, fat: fa };
  }

  function addRecipeToMeal(mealType: string, recipeId: number) {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) return;

    const entry: MealEntry = {
      mealType,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      servings: recipe.servings,
      sortOrder: cellForm.meals.filter((m) => m.mealType === mealType).length,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      baseServings: recipe.servings,
    };

    const newMeals = [...cellForm.meals, entry];
    const totals = calcMealTotals(newMeals);
    setCellForm({
      ...cellForm,
      meals: newMeals,
      // Auto-fill macros (admin can still override)
      calorieTarget: String(totals.calories),
      proteinTarget: String(totals.protein),
      carbsTarget: String(totals.carbs),
      fatTarget: String(totals.fat),
    });
  }

  function removeRecipeFromMeal(mealType: string, index: number) {
    const mealsOfType = cellForm.meals.filter((m) => m.mealType === mealType);
    const otherMeals = cellForm.meals.filter((m) => m.mealType !== mealType);
    mealsOfType.splice(index, 1);
    const newMeals = [...otherMeals, ...mealsOfType];
    const totals = calcMealTotals(newMeals);
    setCellForm({
      ...cellForm,
      meals: newMeals,
      calorieTarget: newMeals.length > 0 ? String(totals.calories) : cellForm.calorieTarget,
      proteinTarget: newMeals.length > 0 ? String(totals.protein) : cellForm.proteinTarget,
      carbsTarget: newMeals.length > 0 ? String(totals.carbs) : cellForm.carbsTarget,
      fatTarget: newMeals.length > 0 ? String(totals.fat) : cellForm.fatTarget,
    });
  }

  function updateMealServings(mealType: string, index: number, servings: number) {
    const newMeals = [...cellForm.meals];
    const mealsOfType = newMeals.filter((m) => m.mealType === mealType);
    mealsOfType[index] = { ...mealsOfType[index], servings };
    // Rebuild full array
    const otherMeals = newMeals.filter((m) => m.mealType !== mealType);
    const allMeals = [...otherMeals, ...mealsOfType];
    const totals = calcMealTotals(allMeals);
    setCellForm({
      ...cellForm,
      meals: allMeals,
      calorieTarget: String(totals.calories),
      proteinTarget: String(totals.protein),
      carbsTarget: String(totals.carbs),
      fatTarget: String(totals.fat),
    });
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const daysArr = Array.from(days.values()).map((d) => ({
        dayOfWeek: d.dayOfWeek,
        weekNumber: d.weekNumber,
        workoutId: d.workoutId || null,
        workoutNotes: d.workoutNotes || null,
        mealPlan: d.mealPlan || null,
        calorieTarget: d.calorieTarget ? parseInt(d.calorieTarget) : null,
        proteinTarget: d.proteinTarget ? parseFloat(d.proteinTarget) : null,
        carbsTarget: d.carbsTarget ? parseFloat(d.carbsTarget) : null,
        fatTarget: d.fatTarget ? parseFloat(d.fatTarget) : null,
        notes: d.notes || null,
        meals: d.meals.map((m, idx) => ({
          mealType: m.mealType,
          recipeId: m.recipeId,
          servings: m.servings,
          sortOrder: idx,
        })),
        exercises: d.exercises.map((ex, idx) => ({
          workoutId: ex.workoutId,
          orderIndex: idx,
          sets: ex.sets,
          repsLow: ex.repsLow,
          repsHigh: ex.repsHigh,
          durationSeconds: ex.durationSeconds,
          restSeconds: ex.restSeconds,
          weightKg: ex.weightKg,
          notes: ex.notes || null,
        })),
      }));

      const res = await fetch(`/api/admin/plans/${id}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: daysArr }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to save");
        return;
      }

      alert("Days saved successfully!");
    } catch {
      alert("Failed to save days");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateTemplate(field: string, value: string) {
    try {
      await fetch(`/api/admin/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (template) {
        setTemplate({ ...template, [field]: value });
      }
    } catch {
      // silent
    }
  }

  // Group recipes by category for <optgroup>
  const recipesByCategory = recipes.reduce<Record<string, RecipeOption[]>>((acc, r) => {
    const cat = r.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {});
  const categoryNames = Object.keys(recipesByCategory).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-[#E51A1A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-20 text-white/40">
        Template not found.{" "}
        <Link href="/admin/plans" className="text-[#E51A1A] hover:underline">
          Back to plans
        </Link>
      </div>
    );
  }

  const weeks = Array.from({ length: template.durationWeeks }, (_, i) => i + 1);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/admin/plans"
            className="text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            &larr; Back to Plans
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">{template.name}</h1>
          <p className="text-sm text-white/40 mt-1">
            {template.durationWeeks} weeks &middot; {template.type} plan &middot;{" "}
            {days.size} day{days.size !== 1 ? "s" : ""} configured
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-5 py-2 bg-[#E51A1A] text-white font-semibold rounded-lg hover:bg-[#E51A1A]/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving..." : "Save All Days"}
        </button>
      </div>

      {/* Template metadata quick edit */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-1">Name</label>
            <input
              type="text"
              defaultValue={template.name}
              onBlur={(e) => handleUpdateTemplate("name", e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white focus:outline-none focus:border-[#E51A1A]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Type</label>
            <select
              defaultValue={template.type}
              onChange={(e) => handleUpdateTemplate("type", e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white focus:outline-none focus:border-[#E51A1A]/50"
            >
              <option value="combined">Combined</option>
              <option value="workout">Workout</option>
              <option value="diet">Diet</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Duration (weeks)</label>
            <input
              type="number"
              min={1}
              max={52}
              defaultValue={template.durationWeeks}
              onBlur={(e) => handleUpdateTemplate("durationWeeks", e.target.value)}
              className="w-full px-3 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-sm text-white focus:outline-none focus:border-[#E51A1A]/50"
            />
          </div>
        </div>
      </div>

      {/* Week/Day Grid */}
      <div className="space-y-4">
        {weeks.map((week) => (
          <div key={week} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white/60">Week {week}</h3>
              {template.durationWeeks > 1 && (
                <button
                  onClick={() => { if (confirm(`Copy all days from Week ${week} to every other week?`)) copyWeekToAll(week); }}
                  className="text-[10px] text-white/30 hover:text-[#E51A1A] transition-colors bg-transparent border-none cursor-pointer"
                >
                  Copy to all weeks
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((dow) => {
                const key = dayKey(week, dow);
                const d = days.get(key);
                const hasWorkout = d?.workoutId;
                const hasMeal = d?.mealPlan || d?.calorieTarget || (d?.meals && d.meals.length > 0);
                const isEmpty = !d;

                let bgColor = "bg-[#0A0A0A]";
                let borderColor = "border-[#2A2A2A]";
                if (hasWorkout && hasMeal) {
                  bgColor = "bg-[#E51A1A]/10";
                  borderColor = "border-[#E51A1A]/30";
                } else if (hasWorkout) {
                  bgColor = "bg-[#E51A1A]/10";
                  borderColor = "border-[#E51A1A]/20";
                } else if (hasMeal) {
                  bgColor = "bg-orange-500/10";
                  borderColor = "border-orange-500/20";
                }

                return (
                  <button
                    key={dow}
                    onClick={() => openCell(week, dow)}
                    className={`${bgColor} border ${borderColor} rounded-lg p-2 min-h-[80px] text-left hover:border-white/30 transition-colors cursor-pointer`}
                  >
                    <p className="text-[10px] font-bold text-white/40 uppercase mb-1">
                      {DAY_LABELS[dow - 1]}
                    </p>
                    {isEmpty ? (
                      <p className="text-[10px] text-white/15">+</p>
                    ) : (
                      <div className="space-y-0.5">
                        {hasWorkout && (
                          <p className="text-[10px] text-[#E51A1A] truncate">
                            {workouts.find((w) => w.id === d.workoutId)?.title || "Workout"}
                          </p>
                        )}
                        {d.meals && d.meals.length > 0 && (
                          <p className="text-[10px] text-green-400">{d.meals.length} recipe{d.meals.length !== 1 ? "s" : ""}</p>
                        )}
                        {d.calorieTarget && (
                          <p className="text-[10px] text-orange-400">{d.calorieTarget} kcal</p>
                        )}
                        {d.mealPlan && !d.calorieTarget && d.meals.length === 0 && (
                          <p className="text-[10px] text-orange-400 truncate">Meal notes</p>
                        )}
                        {d.notes && (
                          <p className="text-[10px] text-white/30 truncate">{d.notes}</p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#E51A1A]/20 border border-[#E51A1A]/30" /> Workout
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-500/20 border border-orange-500/30" /> Meal Plan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-[#0A0A0A] border border-[#2A2A2A]" /> Empty
        </span>
      </div>

      {/* ── Edit Cell Modal ── */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-[#2A2A2A] flex items-center justify-between">
              <h3 className="text-white font-semibold">
                Week {cellForm.weekNumber} &mdash; {DAY_LABELS[cellForm.dayOfWeek - 1]}
              </h3>
              <button
                onClick={() => setEditingCell(null)}
                className="text-white/40 hover:text-white text-xl bg-transparent border-none cursor-pointer leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* ── Exercises (multi-exercise prescription) ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider">
                    Exercises
                    {cellForm.exercises.length > 0 && (
                      <span className="ml-1.5 text-green-400 normal-case font-normal">
                        ({cellForm.exercises.length})
                      </span>
                    )}
                  </label>
                  <button
                    type="button"
                    onClick={() => setWorkoutPickerOpen(true)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#E51A1A] text-white hover:bg-[#E51A1A]/90 cursor-pointer"
                  >
                    + Add exercise
                  </button>
                </div>
                {cellForm.exercises.length === 0 ? (
                  <p className="text-[11px] text-white/30 italic">
                    No exercises yet. Click <em>Add exercise</em> to pick from your library.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {cellForm.exercises.map((ex, i) => (
                      <div
                        key={i}
                        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-2.5"
                      >
                        <div className="flex items-start gap-2">
                          <div className="w-14 h-14 bg-[#1E1E1E] rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                            {ex.videoUrl || ex.gifUrl ? (
                              <WorkoutMediaThumbnail
                                videoUrl={ex.videoUrl}
                                gifUrl={ex.gifUrl}
                                title={ex.workoutTitle}
                                className="w-full h-full"
                              />
                            ) : (
                              <span className="text-white/20 text-[9px]">no media</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs text-white font-medium truncate">
                                {i + 1}. {ex.workoutTitle}
                              </p>
                              <div className="flex gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => moveExercise(i, -1)}
                                  disabled={i === 0}
                                  className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white disabled:opacity-20 cursor-pointer bg-transparent border-none text-xs"
                                  title="Move up"
                                >
                                  &#9650;
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveExercise(i, 1)}
                                  disabled={i === cellForm.exercises.length - 1}
                                  className="w-6 h-6 flex items-center justify-center text-white/30 hover:text-white disabled:opacity-20 cursor-pointer bg-transparent border-none text-xs"
                                  title="Move down"
                                >
                                  &#9660;
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProgressionForIdx(progressionForIdx === i ? null : i);
                                    setProgStart(String(ex.weightKg ?? ""));
                                    setProgIncrement("2.5");
                                    setProgDeloadWeek("");
                                    setProgDeloadKg("");
                                  }}
                                  className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-[#FFB800] cursor-pointer bg-transparent border-none text-xs"
                                  title="Auto-progress across all weeks"
                                >
                                  📈
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeExerciseAt(i)}
                                  className="w-6 h-6 flex items-center justify-center text-red-400/60 hover:text-red-400 cursor-pointer bg-transparent border-none text-xs"
                                  title="Remove"
                                >
                                  &times;
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-white/40 mt-0.5 capitalize">
                              {(ex.bodyPart || "").replace("_", " ")}
                              {ex.equipment ? ` · ${ex.equipment}` : ""}
                            </p>
                            <div className="grid grid-cols-4 gap-1.5 mt-2">
                              <NumField
                                label="Sets"
                                value={ex.sets}
                                onChange={(v) => updateExerciseField(i, "sets", v)}
                              />
                              <NumField
                                label="Reps lo"
                                value={ex.repsLow}
                                onChange={(v) => updateExerciseField(i, "repsLow", v)}
                              />
                              <NumField
                                label="Reps hi"
                                value={ex.repsHigh}
                                onChange={(v) => updateExerciseField(i, "repsHigh", v)}
                              />
                              <NumField
                                label="Rest s"
                                value={ex.restSeconds}
                                onChange={(v) => updateExerciseField(i, "restSeconds", v)}
                              />
                              <NumField
                                label="Duration s"
                                value={ex.durationSeconds}
                                onChange={(v) =>
                                  updateExerciseField(i, "durationSeconds", v)
                                }
                              />
                              <NumField
                                label="Weight kg"
                                value={ex.weightKg}
                                onChange={(v) => updateExerciseField(i, "weightKg", v)}
                                step="0.5"
                              />
                              <input
                                type="text"
                                value={ex.notes}
                                onChange={(e) =>
                                  updateExerciseField(i, "notes", e.target.value)
                                }
                                placeholder="Notes"
                                className="col-span-2 px-2 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded text-[10px] text-white placeholder-white/20 focus:outline-none focus:border-[#E51A1A]/50"
                              />
                            </div>
                            {progressionForIdx === i && (
                              <div className="mt-2 p-2 bg-[#1E1E1E] border border-[#FFB800]/30 rounded">
                                <p className="text-[10px] text-[#FFB800]/90 mb-2">
                                  📈 Auto-progress this exercise across all {template?.durationWeeks ?? 0} weeks (only days where the schedule has this on the same weekday).
                                </p>
                                <div className="grid grid-cols-4 gap-1.5 mb-2">
                                  <label className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-white/40 uppercase">Start kg (wk 1)</span>
                                    <input
                                      type="number" step="0.5"
                                      value={progStart} onChange={(e) => setProgStart(e.target.value)}
                                      className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-[11px] text-white focus:outline-none focus:border-[#FFB800]/50"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-white/40 uppercase">+ kg/week</span>
                                    <input
                                      type="number" step="0.5"
                                      value={progIncrement} onChange={(e) => setProgIncrement(e.target.value)}
                                      className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-[11px] text-white focus:outline-none focus:border-[#FFB800]/50"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-white/40 uppercase">Deload wk</span>
                                    <input
                                      type="number" min={1} max={template?.durationWeeks ?? 0}
                                      value={progDeloadWeek} onChange={(e) => setProgDeloadWeek(e.target.value)}
                                      placeholder="opt"
                                      className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#FFB800]/50"
                                    />
                                  </label>
                                  <label className="flex flex-col gap-0.5">
                                    <span className="text-[9px] text-white/40 uppercase">Deload kg</span>
                                    <input
                                      type="number" step="0.5"
                                      value={progDeloadKg} onChange={(e) => setProgDeloadKg(e.target.value)}
                                      placeholder="opt"
                                      className="px-1.5 py-0.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-[#FFB800]/50"
                                    />
                                  </label>
                                </div>
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setProgressionForIdx(null)}
                                    className="text-[10px] text-white/40 hover:text-white/70 bg-transparent border-none cursor-pointer px-2 py-0.5"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => applyProgression(i)}
                                    disabled={progApplying || !progStart}
                                    className="text-[10px] font-semibold px-2.5 py-1 bg-[#FFB800] text-black rounded disabled:opacity-50 cursor-pointer"
                                  >
                                    {progApplying ? "…" : "Apply across weeks"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Legacy single-workout fallback (only shown if no new-style
                  exercises are configured, so older templates keep working). */}
              {cellForm.exercises.length === 0 && (
                <div>
                  <label className="block text-xs font-medium text-white/50 mb-1">
                    Legacy workout (fallback)
                  </label>
                  <select
                    value={cellForm.workoutId || ""}
                    onChange={(e) =>
                      setCellForm({
                        ...cellForm,
                        workoutId: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white focus:outline-none focus:border-[#E51A1A]/50"
                  >
                    <option value="">No workout</option>
                    {workouts.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Workout Notes */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Workout Notes</label>
                <textarea
                  value={cellForm.workoutNotes}
                  onChange={(e) => setCellForm({ ...cellForm, workoutNotes: e.target.value })}
                  placeholder="e.g. 4 sets x 12 reps, increase weight..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E51A1A]/50 resize-none"
                />
              </div>

              {/* ── Meal Recipes ── */}
              <div className="border-t border-[#2A2A2A] pt-4">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Meal Recipes</p>
                {MEAL_TYPES.map(({ key, label, icon }) => {
                  const mealsOfType = cellForm.meals.filter((m) => m.mealType === key);
                  const isExpanded = expandedMealTypes.has(key);

                  return (
                    <div key={key} className="mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(expandedMealTypes);
                          if (next.has(key)) next.delete(key);
                          else next.add(key);
                          setExpandedMealTypes(next);
                        }}
                        className="flex items-center justify-between w-full text-left py-1.5 bg-transparent border-none cursor-pointer"
                      >
                        <span className="text-xs font-medium text-white/70">
                          {icon} {label}
                          {mealsOfType.length > 0 && (
                            <span className="ml-1.5 text-green-400">({mealsOfType.length})</span>
                          )}
                        </span>
                        <span className="text-white/30 text-xs">{isExpanded ? "▲" : "▼"}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-1.5 space-y-1.5 pl-4">
                          {/* Listed recipes */}
                          {mealsOfType.map((meal, idx) => {
                            const mult = meal.servings / meal.baseServings;
                            const adjCal = Math.round(meal.calories * mult);
                            return (
                              <div key={idx} className="flex items-center gap-2 bg-[#0A0A0A] rounded-lg px-3 py-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-white truncate">{meal.recipeTitle}</p>
                                  <p className="text-[10px] text-white/40">{adjCal} kcal</p>
                                </div>
                                <input
                                  type="number"
                                  min={0.5}
                                  step={0.5}
                                  value={meal.servings}
                                  onChange={(e) => updateMealServings(key, idx, parseFloat(e.target.value) || 1)}
                                  className="w-14 px-1.5 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded text-xs text-white text-center focus:outline-none focus:border-[#E51A1A]/50"
                                  title="Servings"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeRecipeFromMeal(key, idx)}
                                  className="text-red-400/60 hover:text-red-400 text-sm bg-transparent border-none cursor-pointer"
                                >
                                  &times;
                                </button>
                              </div>
                            );
                          })}

                          {/* Add recipe dropdown */}
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) addRecipeToMeal(key, parseInt(e.target.value));
                            }}
                            className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-dashed border-[#2A2A2A] rounded-lg text-xs text-white/50 focus:outline-none focus:border-[#E51A1A]/50"
                          >
                            <option value="">+ Add recipe...</option>
                            {categoryNames.map((cat) => (
                              <optgroup key={cat} label={cat}>
                                {recipesByCategory[cat].map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.title} ({r.servings > 1 ? Math.round(r.calories / r.servings) + " kcal/srv" : r.calories + " kcal"})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Calorie & Macros */}
              <div className="border-t border-[#2A2A2A] pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-white/50">Calorie & Macro Targets</p>
                  {cellForm.meals.length > 0 && (
                    <span className="text-[10px] text-green-400/70">Auto-filled from recipes</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Calories (kcal)</label>
                    <input
                      type="number"
                      value={cellForm.calorieTarget}
                      onChange={(e) => setCellForm({ ...cellForm, calorieTarget: e.target.value })}
                      placeholder="2000"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E51A1A]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={cellForm.proteinTarget}
                      onChange={(e) => setCellForm({ ...cellForm, proteinTarget: e.target.value })}
                      placeholder="150"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E51A1A]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={cellForm.carbsTarget}
                      onChange={(e) => setCellForm({ ...cellForm, carbsTarget: e.target.value })}
                      placeholder="200"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E51A1A]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50 mb-1">Fat (g)</label>
                    <input
                      type="number"
                      value={cellForm.fatTarget}
                      onChange={(e) => setCellForm({ ...cellForm, fatTarget: e.target.value })}
                      placeholder="60"
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E51A1A]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Meal Notes */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Additional Meal Notes</label>
                <textarea
                  value={cellForm.mealPlan}
                  onChange={(e) => setCellForm({ ...cellForm, mealPlan: e.target.value })}
                  placeholder="e.g. Drink 3L water, avoid sugar after 6pm..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E51A1A]/50 resize-none"
                />
              </div>

              {/* Day Notes */}
              <div>
                <label className="block text-xs font-medium text-white/50 mb-1">Day Notes</label>
                <textarea
                  value={cellForm.notes}
                  onChange={(e) => setCellForm({ ...cellForm, notes: e.target.value })}
                  placeholder="e.g. Rest day, active recovery..."
                  rows={2}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#E51A1A]/50 resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={clearCell}
                  className="text-sm text-red-400 hover:text-red-300 bg-transparent border-none cursor-pointer"
                >
                  Clear Day
                </button>
                <button
                  onClick={startCopyDay}
                  className="text-sm text-[#FF6B00] hover:text-[#FFB800] bg-transparent border-none cursor-pointer"
                >
                  Copy to...
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-1.5 text-sm text-white/50 hover:text-white/70 bg-transparent border-none cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCell}
                  className="px-4 py-1.5 bg-[#E51A1A] text-white text-sm font-semibold rounded-lg hover:bg-[#E51A1A]/90 transition-colors cursor-pointer"
                >
                  Set Day
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Copy Day Picker Modal ── */}
      {copyMode && template && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="p-5 border-b border-[#2A2A2A]">
              <h3 className="text-white font-semibold">Copy Day To...</h3>
              <p className="text-xs text-white/40 mt-1">
                Select which days should receive this content. Existing data will be overwritten.
              </p>
            </div>
            <div className="p-5 space-y-3">
              {weeks.map((week) => (
                <div key={week}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-white/50">Week {week}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Set(copyMode.targets);
                        const weekKeys = [1,2,3,4,5,6,7].map(d => dayKey(week, d)).filter(k => k !== copyMode.source);
                        const allSelected = weekKeys.every(k => next.has(k));
                        for (const k of weekKeys) {
                          if (allSelected) next.delete(k); else next.add(k);
                        }
                        setCopyMode({ ...copyMode, targets: next });
                      }}
                      className="text-[10px] text-[#FF6B00] hover:text-[#FFB800] bg-transparent border-none cursor-pointer"
                    >
                      {[1,2,3,4,5,6,7].map(d => dayKey(week, d)).filter(k => k !== copyMode.source).every(k => copyMode.targets.has(k)) ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {[1,2,3,4,5,6,7].map((dow) => {
                      const key = dayKey(week, dow);
                      const isSource = key === copyMode.source;
                      const isSelected = copyMode.targets.has(key);
                      return (
                        <button
                          key={dow}
                          type="button"
                          disabled={isSource}
                          onClick={() => toggleCopyTarget(key)}
                          className={`py-2 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                            isSource
                              ? "bg-[#E51A1A]/20 border-[#E51A1A]/40 text-[#E51A1A] cursor-not-allowed"
                              : isSelected
                                ? "bg-[#FF6B00]/20 border-[#FF6B00]/40 text-[#FF6B00]"
                                : "bg-[#0A0A0A] border-[#2A2A2A] text-white/40 hover:border-white/30"
                          }`}
                        >
                          {DAY_LABELS[dow - 1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-[#2A2A2A] flex items-center justify-between">
              <button
                onClick={() => setCopyMode(null)}
                className="text-sm text-white/50 hover:text-white/70 bg-transparent border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeCopy}
                disabled={copyMode.targets.size === 0}
                className="px-5 py-1.5 bg-[#FF6B00] text-white text-sm font-semibold rounded-lg hover:bg-[#FF6B00]/90 transition-colors disabled:opacity-30 cursor-pointer"
              >
                Copy to {copyMode.targets.size} day{copyMode.targets.size !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Workout picker for the Add-exercise flow ── */}
      <WorkoutPickerModal
        open={workoutPickerOpen}
        onClose={() => setWorkoutPickerOpen(false)}
        onSelect={(w) => addExerciseFromWorkout(w)}
        workouts={workouts}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small inline helpers                                               */
/* ------------------------------------------------------------------ */

function NumField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[9px] text-white/40 uppercase tracking-wide">{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(null);
          const n = parseFloat(raw);
          onChange(Number.isFinite(n) ? n : null);
        }}
        className="w-full px-1.5 py-0.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded text-[11px] text-white focus:outline-none focus:border-[#E51A1A]/50"
      />
    </label>
  );
}
