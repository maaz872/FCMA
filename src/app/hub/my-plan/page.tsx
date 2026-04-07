"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { fetchWithRetry } from "@/lib/fetch-retry";

type Workout = {
  id: number;
  title: string;
  videoUrl: string;
  description: string;
  slug: string;
};

type PlanData = {
  plan: {
    id: number;
    name: string;
    type: string;
    startDate: string;
    weekNumber: number;
    dayOfWeek: number;
    totalWeeks: number;
    todayWeekNumber: number;
    todayDayOfWeek: number;
  } | null;
  viewMode: "today" | "past" | "future";
  selectedDate: string;
  today: {
    workout: Workout | null;
    mealPlan: string | null;
    meals: {
      id: number;
      mealType: string;
      servings: number;
      recipe: {
        id: number;
        title: string;
        slug: string;
        imageUrl: string | null;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        servings: number;
      };
    }[];
    calorieTarget: number | null;
    proteinTarget: number | null;
    carbsTarget: number | null;
    fatTarget: number | null;
    notes: string | null;
    workoutNotes: string | null;
  };
  todayProgress: {
    workoutCompleted: boolean;
    breakfastCompleted: boolean;
    lunchCompleted: boolean;
    snackCompleted: boolean;
    dinnerCompleted: boolean;
  };
  weekProgress: {
    date: string;
    workoutCompleted: boolean;
    breakfastCompleted: boolean;
    lunchCompleted: boolean;
    snackCompleted: boolean;
    dinnerCompleted: boolean;
  }[];
};

type Target = {
  id: number;
  metric: string;
  targetValue: number;
  currentValue: number | null;
};

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function MyPlanPage() {
  const [data, setData] = useState<PlanData | null>(null);
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Off-plan meal logging
  const [offPlanOpen, setOffPlanOpen] = useState<Set<string>>(new Set());
  const [offPlanSearch, setOffPlanSearch] = useState("");
  const [offPlanResults, setOffPlanResults] = useState<{ id: number; name: string; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }[]>([]);
  const [offPlanCustom, setOffPlanCustom] = useState(false);
  const [offPlanForm, setOffPlanForm] = useState({ name: "", weight: "", calories: "", protein: "", carbs: "", fat: "" });
  const [offPlanSaving, setOffPlanSaving] = useState(false);
  const [offPlanLogged, setOffPlanLogged] = useState<{ mealType: string; description: string; calories: number }[]>([]);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPlan = useCallback(async (date?: string) => {
    try {
      const url = date ? `/api/user/plan?date=${date}` : "/api/user/plan";
      const res = await fetchWithRetry(url);
      const planData = await res.json();
      if (!planData.error) setData(planData);
    } catch {
      // ignore
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [planRes, targetRes] = await Promise.all([
        fetchWithRetry("/api/user/plan"),
        fetchWithRetry("/api/user/targets"),
      ]);
      const planData = await planRes.json();
      const targetData = await targetRes.json();
      if (!planData.error) setData(planData);
      if (targetData.targets) setTargets(targetData.targets);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // When selectedDate changes, refetch plan data for that date
  useEffect(() => {
    if (selectedDate) {
      fetchPlan(selectedDate);
    }
  }, [selectedDate, fetchPlan]);

  async function toggleProgress(field: "workoutCompleted" | "breakfastCompleted" | "lunchCompleted" | "snackCompleted" | "dinnerCompleted") {
    if (!data || saving || data.viewMode !== "today") return;
    setSaving(true);
    const current = data.todayProgress[field];
    try {
      const res = await fetch("/api/user/plan/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !current }),
      });
      const result = await res.json();
      if (!result.error) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                todayProgress: {
                  ...prev.todayProgress,
                  ...result,
                },
              }
            : prev
        );
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  // Helper: format Date to YYYY-MM-DD
  function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  // Get the Monday of the week containing the currently selected/viewed date
  function getMondayOfViewedWeek(): Date {
    if (!data?.plan) return new Date();
    const current = new Date(data.selectedDate + "T00:00:00");
    const dow = current.getDay() === 0 ? 7 : current.getDay(); // 1=Mon, 7=Sun
    const monday = new Date(current);
    monday.setDate(monday.getDate() - (dow - 1));
    return monday;
  }

  // Navigate to a specific day (1=Mon, 7=Sun) in the currently viewed week
  function navigateToDay(dayOfWeek: number) {
    if (!data?.plan) return;
    const monday = getMondayOfViewedWeek();
    const target = new Date(monday);
    target.setDate(target.getDate() + (dayOfWeek - 1));
    setSelectedDate(toDateStr(target));
  }

  // Move to the same weekday in the previous/next week
  function changeWeek(delta: number) {
    if (!data?.plan) return;
    const newWeek = data.plan.weekNumber + delta;
    if (newWeek < 1 || newWeek > data.plan.totalWeeks) return;
    // Jump by 7 days from current Monday
    const monday = getMondayOfViewedWeek();
    const targetMonday = new Date(monday);
    targetMonday.setDate(targetMonday.getDate() + delta * 7);
    setSelectedDate(toDateStr(targetMonday));
  }

  function goToToday() {
    setSelectedDate(getTodayStr());
  }

  // ── Off-plan meal logging ──
  function toggleOffPlan(mealType: string) {
    const next = new Set(offPlanOpen);
    if (next.has(mealType)) { next.delete(mealType); } else { next.add(mealType); }
    setOffPlanOpen(next);
    setOffPlanSearch("");
    setOffPlanResults([]);
    setOffPlanCustom(false);
    setOffPlanForm({ name: "", weight: "", calories: "", protein: "", carbs: "", fat: "" });
  }

  function searchFoods(query: string) {
    setOffPlanSearch(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) { setOffPlanResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/food-items?search=${encodeURIComponent(query)}`);
        const data = await res.json();
        setOffPlanResults(data.items || []);
      } catch { /* ignore */ }
    }, 300);
  }

  function selectFoodItem(item: { name: string; caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatPer100g: number }) {
    setOffPlanForm({
      name: item.name,
      weight: "100",
      calories: String(item.caloriesPer100g),
      protein: String(item.proteinPer100g),
      carbs: String(item.carbsPer100g),
      fat: String(item.fatPer100g),
    });
    setOffPlanSearch("");
    setOffPlanResults([]);
  }

  function updateOffPlanWeight(grams: string) {
    const w = parseFloat(grams) || 0;
    // If we have a food item selected, recalc macros based on weight
    if (offPlanForm.name && !offPlanCustom) {
      const origWeight = 100; // per 100g base
      const ratio = w / origWeight;
      const baseCals = parseFloat(offPlanForm.calories) / (parseFloat(offPlanForm.weight) || 100) * 100;
      const basePro = parseFloat(offPlanForm.protein) / (parseFloat(offPlanForm.weight) || 100) * 100;
      const baseCarbs = parseFloat(offPlanForm.carbs) / (parseFloat(offPlanForm.weight) || 100) * 100;
      const baseFat = parseFloat(offPlanForm.fat) / (parseFloat(offPlanForm.weight) || 100) * 100;
      setOffPlanForm(prev => ({
        ...prev,
        weight: grams,
        calories: String(Math.round(baseCals * ratio)),
        protein: String(Math.round(basePro * ratio * 10) / 10),
        carbs: String(Math.round(baseCarbs * ratio * 10) / 10),
        fat: String(Math.round(baseFat * ratio * 10) / 10),
      }));
    } else {
      setOffPlanForm(prev => ({ ...prev, weight: grams }));
    }
  }

  async function logOffPlanMeal(mealType: string) {
    if (!offPlanForm.name.trim() || !offPlanForm.calories) return;
    setOffPlanSaving(true);
    try {
      const now = new Date();
      await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType: mealType.charAt(0).toUpperCase() + mealType.slice(1),
          description: offPlanForm.name.trim() + (offPlanForm.weight ? ` (${offPlanForm.weight}g)` : ""),
          calories: parseInt(offPlanForm.calories) || 0,
          protein: parseFloat(offPlanForm.protein) || 0,
          carbs: parseFloat(offPlanForm.carbs) || 0,
          fat: parseFloat(offPlanForm.fat) || 0,
          loggedDate: data?.selectedDate || getTodayStr(),
          loggedTime: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        }),
      });
      setOffPlanLogged(prev => [...prev, { mealType, description: offPlanForm.name, calories: parseInt(offPlanForm.calories) || 0 }]);
      toggleOffPlan(mealType); // close form
    } catch {
      alert("Failed to log meal");
    } finally {
      setOffPlanSaving(false);
    }
  }

  function getDayStatus(dayIndex: number) {
    if (!data?.plan) return "future";
    const dayNum = dayIndex + 1; // 1=Mon, 7=Sun

    // Get the Monday of the currently viewed week from selectedDate
    const selectedDt = new Date(data.selectedDate + "T00:00:00");
    const selDow = selectedDt.getDay() === 0 ? 7 : selectedDt.getDay();
    const monday = new Date(selectedDt);
    monday.setDate(monday.getDate() - (selDow - 1));

    // Calculate the actual date for this dot
    const dotDate = new Date(monday);
    dotDate.setDate(dotDate.getDate() + dayIndex);
    const dotStr = toDateStr(dotDate);

    // Today's actual date
    const todayStr = getTodayStr();

    const isActualToday = dotStr === todayStr;
    const isSelected = data.selectedDate === dotStr;
    const isFutureDay = dotStr > todayStr;

    if (isFutureDay) return isSelected ? "selected-future" : "future";
    if (isActualToday) return isSelected ? "today-selected" : "today";

    // Past day: check progress
    const progress = data.weekProgress.find((p) => {
      const pDate = new Date(p.date).toISOString().split("T")[0];
      return pDate === dotStr;
    });

    const hasProgress = progress && (progress.workoutCompleted || progress.breakfastCompleted || progress.lunchCompleted || progress.snackCompleted || progress.dinnerCompleted);
    if (hasProgress) return isSelected ? "selected-completed" : "completed";
    return isSelected ? "selected-incomplete" : "incomplete";
  }

  function getTargetPercent(t: Target) {
    if (!t.currentValue || t.targetValue === 0) return 0;
    if (t.metric === "weight" || t.metric === "belly" || t.metric === "waist") {
      if (t.currentValue <= t.targetValue) return 100;
      return Math.min(100, Math.round((t.targetValue / t.currentValue) * 100));
    }
    return Math.min(100, Math.round((t.currentValue / t.targetValue) * 100));
  }

  function getTargetColor(percent: number) {
    if (percent >= 90) return "#22C55E";
    if (percent >= 50) return "#FF6B00";
    return "#E51A1A";
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-black text-white mb-6">My Plan</h1>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-[#2A2A2A] rounded w-48 mb-3" />
              <div className="h-6 bg-[#2A2A2A] rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data?.plan) {
    return (
      <div>
        <h1 className="text-3xl font-black text-white mb-6">My Plan</h1>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.251 2.251 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No plan assigned yet</h2>
          <p className="text-white/50 mb-6">Your coach will assign you a personalised training and nutrition plan soon.</p>
          <Link href="/hub/messages" className="inline-flex items-center gap-2 px-6 py-3 bg-[#E51A1A] text-white font-semibold rounded-xl hover:bg-[#C41717] transition-colors">
            Message your coach
          </Link>
        </div>
      </div>
    );
  }

  const plan = data.plan;
  const today = data.today;
  const progress = data.todayProgress;
  const viewMode = data.viewMode;
  const canToggle = viewMode === "today";

  const completedDays = data.weekProgress.filter(
    (p) => p.workoutCompleted || p.breakfastCompleted || p.lunchCompleted || p.snackCompleted || p.dinnerCompleted
  ).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white mb-1">{plan.name}</h1>
        <p className="text-white/50 text-sm">
          {viewMode === "today"
            ? "Today"
            : formatDateLabel(data.selectedDate)}
          {viewMode !== "today" && (
            <button onClick={goToToday} className="ml-2 text-[#E51A1A] hover:underline bg-transparent border-none cursor-pointer text-sm">
              Go to today
            </button>
          )}
        </p>
      </div>

      {/* ── Week Navigation ── */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5 mb-6">
        {/* Week selector with arrows */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => changeWeek(-1)}
            disabled={plan.weekNumber <= 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2A2A2A] text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer border-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-white/60">
            Week {plan.weekNumber} of {plan.totalWeeks}
          </p>
          <button
            onClick={() => changeWeek(1)}
            disabled={plan.weekNumber >= plan.totalWeeks}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2A2A2A] text-white/50 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer border-none"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Clickable day dots */}
        <div className="flex justify-between gap-2">
          {DAY_LABELS.map((label, i) => {
            const status = getDayStatus(i);
            const isSelected = status.startsWith("selected") || status === "today-selected";
            const isToday = status === "today" || status === "today-selected";
            const isCompleted = status.includes("completed");
            const isFuture = status.includes("future");

            return (
              <button
                key={i}
                onClick={() => navigateToDay(i + 1)}
                className="flex flex-col items-center gap-1.5 cursor-pointer bg-transparent border-none p-0"
              >
                <span className="text-[10px] text-white/40 font-semibold">{label}</span>
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isToday && isSelected
                      ? "border-2 border-[#E51A1A] bg-[#E51A1A] text-white"
                      : isToday
                      ? "border-2 border-[#E51A1A] text-white bg-[#E51A1A]/10"
                      : isSelected && isCompleted
                      ? "bg-green-500 text-white ring-2 ring-green-400/50"
                      : isSelected
                      ? "bg-[#E51A1A]/80 text-white ring-2 ring-[#E51A1A]/50"
                      : isCompleted
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : !isFuture
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : "bg-[#2A2A2A] text-white/20"
                  }`}
                >
                  {isCompleted && !isSelected ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-white/30 mt-4 text-center">
          {completedDays} day{completedDays !== 1 ? "s" : ""} completed this week
        </p>
      </div>

      {/* ── Day Detail ── */}
      <div className="space-y-6">

        {/* View-only banner for past/future */}
        {viewMode !== "today" && (
          <div className={`rounded-xl px-4 py-2.5 text-xs font-medium text-center ${
            viewMode === "future"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              : "bg-white/5 text-white/40 border border-[#2A2A2A]"
          }`}>
            {viewMode === "future"
              ? `Upcoming — ${DAY_NAMES_FULL[(plan.dayOfWeek - 1) % 7]}'s plan`
              : `Past — ${formatDateLabel(data.selectedDate)}`}
          </div>
        )}

        {/* Workout Section */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Workout</h2>
            {today.workout && canToggle && (
              <button
                onClick={() => toggleProgress("workoutCompleted")}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer border-none ${
                  progress.workoutCompleted
                    ? "bg-green-500/20 text-green-400"
                    : "bg-[#2A2A2A] text-white/50 hover:text-white hover:bg-[#333]"
                }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  progress.workoutCompleted ? "bg-green-500 border-green-500" : "border-white/30"
                }`}>
                  {progress.workoutCompleted && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                {progress.workoutCompleted ? "Completed" : "Mark Complete"}
              </button>
            )}
            {today.workout && !canToggle && progress.workoutCompleted && (
              <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">Completed</span>
            )}
          </div>

          {today.workout ? (
            <div>
              <h3 className="text-xl font-bold text-white mb-2">{today.workout.title}</h3>
              <p className="text-white/50 text-sm mb-4">{today.workout.description}</p>
              {today.workoutNotes && (
                <p className="text-white/40 text-sm mb-4 italic">Coach notes: {today.workoutNotes}</p>
              )}
              <Link href={`/hub/workouts/${today.workout.slug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E51A1A] text-white font-semibold rounded-xl hover:bg-[#C41717] transition-colors text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Watch Video
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-white/40 text-lg font-semibold">Rest Day</p>
              {today.notes && <p className="text-white/30 text-sm mt-2">{today.notes}</p>}
            </div>
          )}
        </div>

        {/* Today's Meal Plan */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Today&apos;s Meal Plan</h2>
          </div>

          {today.calorieTarget && (
            <div className="mb-5">
              <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Calorie Target</p>
              <p className="text-4xl font-black text-white">
                {today.calorieTarget.toLocaleString()}
                <span className="text-sm font-semibold text-white/40 ml-1">kcal</span>
              </p>
            </div>
          )}

          {!!(today.proteinTarget || today.carbsTarget || today.fatTarget) && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {today.proteinTarget && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-blue-400">{Math.round(today.proteinTarget)}g</p>
                  <p className="text-[10px] text-blue-400/60 font-semibold uppercase">Protein</p>
                </div>
              )}
              {today.carbsTarget && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-amber-400">{Math.round(today.carbsTarget)}g</p>
                  <p className="text-[10px] text-amber-400/60 font-semibold uppercase">Carbs</p>
                </div>
              )}
              {today.fatTarget && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-rose-400">{Math.round(today.fatTarget)}g</p>
                  <p className="text-[10px] text-rose-400/60 font-semibold uppercase">Fat</p>
                </div>
              )}
            </div>
          )}

          {/* Recipe Cards by Meal Type */}
          {today.meals && today.meals.length > 0 && (
            <div className="space-y-5 mb-5">
              {(["breakfast", "lunch", "snack", "dinner"] as const).map((mealType) => {
                const mealsOfType = today.meals.filter((m) => m.mealType === mealType);
                if (mealsOfType.length === 0) return null;
                const icon = mealType === "breakfast" ? "🌅" : mealType === "lunch" ? "☀️" : mealType === "snack" ? "🍎" : "🌙";
                const label = mealType.charAt(0).toUpperCase() + mealType.slice(1);
                const progressField = `${mealType}Completed` as "breakfastCompleted" | "lunchCompleted" | "snackCompleted" | "dinnerCompleted";
                const isCompleted = progress[progressField];
                return (
                  <div key={mealType} className={`rounded-xl border p-4 transition-all ${isCompleted ? "bg-green-500/5 border-green-500/20" : "bg-[#0A0A0A]/50 border-[#2A2A2A]"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">{icon} {label}</p>
                      {canToggle ? (
                        <button
                          onClick={() => toggleProgress(progressField)}
                          disabled={saving}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
                            isCompleted ? "bg-green-500/20 text-green-400" : "bg-[#2A2A2A] text-white/40 hover:text-white/60"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            isCompleted ? "bg-green-500 border-green-500" : "border-white/30"
                          }`}>
                            {isCompleted && (
                              <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                          {isCompleted ? "Done" : "Mark Done"}
                        </button>
                      ) : isCompleted ? (
                        <span className="text-xs font-semibold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-lg">Done</span>
                      ) : null}
                    </div>
                    <div className="space-y-2">
                      {mealsOfType.map((meal) => {
                        const mult = meal.servings / meal.recipe.servings;
                        const adjCal = Math.round(meal.recipe.calories * mult);
                        const adjPro = Math.round(meal.recipe.protein * mult);
                        const adjCarbs = Math.round(meal.recipe.carbs * mult);
                        return (
                          <Link key={meal.id} href={`/hub/recipes/${meal.recipe.slug}`}
                            className="flex items-center gap-3 bg-[#2A2A2A] rounded-xl p-3 hover:bg-[#333] transition-colors">
                            {meal.recipe.imageUrl ? (
                              <img src={meal.recipe.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-[#1E1E1E] flex items-center justify-center text-white/20 text-lg shrink-0">🍽️</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${isCompleted ? "text-white/50 line-through" : "text-white"}`}>{meal.recipe.title}</p>
                              <p className="text-[11px] text-white/40">
                                {adjCal} kcal &middot; {adjPro}g P &middot; {adjCarbs}g C
                                {meal.servings !== meal.recipe.servings && (
                                  <span className="ml-1 text-white/30">({meal.servings} srv)</span>
                                )}
                              </p>
                            </div>
                            <svg className="w-4 h-4 text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Off-plan logged items */}
                    {offPlanLogged.filter(l => l.mealType === mealType).map((l, i) => (
                      <div key={`offplan-${i}`} className="flex items-center gap-3 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl p-3">
                        <div className="w-12 h-12 rounded-lg bg-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] text-xs font-bold shrink-0">OFF</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{l.description}</p>
                          <p className="text-[11px] text-white/40">{l.calories} kcal (off-plan)</p>
                        </div>
                      </div>
                    ))}

                    {/* "I had something else" button + form */}
                    {canToggle && (
                      <div className="mt-2">
                        {!offPlanOpen.has(mealType) ? (
                          <button
                            onClick={() => toggleOffPlan(mealType)}
                            className="text-[11px] text-[#FF6B00]/70 hover:text-[#FF6B00] bg-transparent border-none cursor-pointer py-1"
                          >
                            + I had something else
                          </button>
                        ) : (
                          <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-white/50">Log off-plan meal</p>
                              <button onClick={() => toggleOffPlan(mealType)} className="text-white/30 hover:text-white text-sm bg-transparent border-none cursor-pointer">&times;</button>
                            </div>

                            {!offPlanCustom && (
                              <>
                                <input
                                  type="text"
                                  value={offPlanSearch}
                                  onChange={(e) => searchFoods(e.target.value)}
                                  placeholder="Search food database..."
                                  className="w-full px-3 py-2 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A]/50"
                                />
                                {offPlanResults.length > 0 && (
                                  <div className="max-h-32 overflow-y-auto space-y-0.5">
                                    {offPlanResults.slice(0, 8).map((item) => (
                                      <button key={item.id} onClick={() => selectFoodItem(item)}
                                        className="w-full text-left px-2 py-1.5 rounded text-xs text-white/70 hover:bg-white/5 bg-transparent border-none cursor-pointer truncate">
                                        {item.name} <span className="text-white/30">({item.caloriesPer100g} kcal/100g)</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                                <button onClick={() => { setOffPlanCustom(true); setOffPlanForm({ name: "", weight: "", calories: "", protein: "", carbs: "", fat: "" }); }}
                                  className="text-[10px] text-[#FF6B00] hover:underline bg-transparent border-none cursor-pointer">
                                  Or add custom item
                                </button>
                              </>
                            )}

                            {(offPlanForm.name || offPlanCustom) && (
                              <div className="space-y-2">
                                {offPlanCustom && (
                                  <input type="text" value={offPlanForm.name} onChange={(e) => setOffPlanForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Food name" className="w-full px-3 py-1.5 bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-[#E51A1A]/50" />
                                )}
                                {offPlanForm.name && !offPlanCustom && (
                                  <p className="text-xs text-white font-medium">{offPlanForm.name}</p>
                                )}
                                <div className="grid grid-cols-5 gap-1.5">
                                  <div>
                                    <label className="text-[9px] text-white/30 block">Grams</label>
                                    <input type="number" value={offPlanForm.weight} onChange={(e) => offPlanCustom ? setOffPlanForm(p => ({ ...p, weight: e.target.value })) : updateOffPlanWeight(e.target.value)}
                                      className="w-full px-2 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded text-xs text-white text-center focus:outline-none focus:border-[#E51A1A]/50" />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-white/30 block">Cal</label>
                                    <input type="number" value={offPlanForm.calories} onChange={(e) => setOffPlanForm(p => ({ ...p, calories: e.target.value }))}
                                      className="w-full px-2 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded text-xs text-white text-center focus:outline-none focus:border-[#E51A1A]/50" />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-white/30 block">P</label>
                                    <input type="number" value={offPlanForm.protein} onChange={(e) => setOffPlanForm(p => ({ ...p, protein: e.target.value }))}
                                      className="w-full px-2 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded text-xs text-white text-center focus:outline-none focus:border-[#E51A1A]/50" />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-white/30 block">C</label>
                                    <input type="number" value={offPlanForm.carbs} onChange={(e) => setOffPlanForm(p => ({ ...p, carbs: e.target.value }))}
                                      className="w-full px-2 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded text-xs text-white text-center focus:outline-none focus:border-[#E51A1A]/50" />
                                  </div>
                                  <div>
                                    <label className="text-[9px] text-white/30 block">F</label>
                                    <input type="number" value={offPlanForm.fat} onChange={(e) => setOffPlanForm(p => ({ ...p, fat: e.target.value }))}
                                      className="w-full px-2 py-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded text-xs text-white text-center focus:outline-none focus:border-[#E51A1A]/50" />
                                  </div>
                                </div>
                                <button onClick={() => logOffPlanMeal(mealType)} disabled={offPlanSaving || !offPlanForm.name.trim()}
                                  className="w-full py-2 bg-[#FF6B00] text-white text-xs font-semibold rounded-lg hover:bg-[#FF6B00]/90 transition-colors disabled:opacity-40 cursor-pointer border-none">
                                  {offPlanSaving ? "Logging..." : "Log Meal"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {today.mealPlan && typeof today.mealPlan === "string" && (
            <div className="bg-[#2A2A2A] rounded-xl p-4 mb-4">
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">
                {today.meals && today.meals.length > 0 ? "Additional Notes" : "Meal Plan"}
              </p>
              <p className="text-sm text-white/70 whitespace-pre-wrap">{String(today.mealPlan)}</p>
            </div>
          )}

          {canToggle && (
            <Link href="/hub/my-meals"
              className="inline-flex items-center gap-2 text-white/40 hover:text-white/60 text-xs mt-2">
              View meal log history
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Coach Notes */}
        {today.notes && today.workout && (
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-2">Notes from Coach</h2>
            <p className="text-white/60 text-sm whitespace-pre-wrap">{today.notes}</p>
          </div>
        )}

      </div>
    </div>
  );
}
