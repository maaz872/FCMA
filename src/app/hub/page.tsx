"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TimeRangeFilter from "@/components/ui/TimeRangeFilter";
import { useBranding } from "@/lib/branding";

type DashboardData = {
  user: { firstName: string; lastName: string } | null;
  mealTotals: { calories: number; protein: number; carbs: number; fat: number };
  isAverage?: boolean;
  targets: { calories: number; protein: number; carbs: number; fat: number; goal: string } | null;
  weight: { latest: number | null; weekAgo: number | null };
  streak: number;
  favCount: number;
  unreadCount: number;
  latestPosts: { id: number; content: string; authorName: string; likes: number; comments: number; createdAt: string }[];
};

type PlanSummary = {
  plan: {
    id: number;
    name: string;
    weekNumber: number;
    dayOfWeek: number;
    totalWeeks: number;
  } | null;
  today: {
    workout: { title: string } | null;
  };
  todayProgress: {
    workoutCompleted: boolean;
    breakfastCompleted: boolean;
    lunchCompleted: boolean;
    snackCompleted: boolean;
    dinnerCompleted: boolean;
  };
};

const DASHBOARD_RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

const quickLinks = [
  { href: "/hub/dashboard", label: "Dashboard", desc: "Your daily overview" },
  { href: "/hub/feed", label: "Feed", desc: "Community updates" },
  { href: "/hub/recipes", label: "Recipes", desc: "400+ macro-friendly recipes" },
  { href: "/hub/workouts", label: "Workouts", desc: "Training programmes" },
  { href: "/hub/restaurants", label: "Restaurants", desc: "Eat out without the guilt" },
  { href: "/hub/calculator", label: "Calculator", desc: "Get your macro targets" },
  { href: "/hub/my-meals", label: "My Meals", desc: "View your meal log history" },
  { href: "/hub/progress", label: "Body", desc: "Log measurements" },
  { href: "/hub/analytics", label: "Analytics", desc: "Personal insights and trends" },
  { href: "/hub/steps", label: "Steps", desc: "Track daily steps" },
  { href: "/hub/favourites", label: "Favourites", desc: "Your saved recipes" },
  { href: "/hub/messages", label: "Messages", desc: "Chat with your coach" },
  { href: "/hub/settings", label: "Settings", desc: "Manage your account" },
];

export default function HubDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [planData, setPlanData] = useState<PlanSummary | null>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today");
  const [targets, setTargets] = useState<{ metric: string; targetValue: number; currentValue: number | null }[]>([]);
  const { siteName } = useBranding();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/user/dashboard?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    fetch("/api/user/plan")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error && d.plan) setPlanData(d);
      })
      .catch(() => {});
    fetch("/api/user/targets")
      .then((r) => r.json())
      .then((d) => setTargets(d.targets || []))
      .catch(() => {});
  }, []);

  async function togglePlanProgress(field: "workoutCompleted" | "breakfastCompleted" | "lunchCompleted" | "snackCompleted" | "dinnerCompleted") {
    if (!planData || planSaving) return;
    setPlanSaving(true);
    const current = planData.todayProgress[field];
    try {
      const res = await fetch("/api/user/plan/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: !current }),
      });
      const result = await res.json();
      if (!result.error) {
        setPlanData((prev) =>
          prev ? { ...prev, todayProgress: { ...prev.todayProgress, ...result } } : prev
        );
      }
    } catch {
      // ignore
    } finally {
      setPlanSaving(false);
    }
  }

  const calorieTarget = data?.targets?.calories || 0;
  const caloriesEaten = data?.mealTotals?.calories || 0;
  const calorieProgress = calorieTarget > 0 ? Math.min((caloriesEaten / calorieTarget) * 100, 100) : 0;
  const isOverTarget = caloriesEaten > calorieTarget && calorieTarget > 0;
  const isAverage = data?.isAverage;

  const weightChange = data?.weight?.latest && data?.weight?.weekAgo
    ? Math.round((data.weight.latest - data.weight.weekAgo) * 10) / 10
    : null;

  const calorieLabel = isAverage ? "Daily Avg Calories" : "Today's Calories";

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">
          Welcome back{data?.user ? `, ${data.user.firstName}` : ""}!
        </h1>
        <p className="text-white/50">
          Your {siteName} dashboard. Everything you need in one place.
        </p>
      </div>

      {/* Today's Plan Card */}
      {planData?.plan && (
        <div className="mb-6 bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden">
          <div className="h-1 bg-[#E51A1A]" />
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-white">{planData.plan.name}</h2>
                <p className="text-xs text-white/40">
                  Week {planData.plan.weekNumber} of {planData.plan.totalWeeks} &middot; Day {planData.plan.dayOfWeek}
                </p>
              </div>
              <Link
                href="/hub/my-plan"
                className="text-xs text-[#E51A1A] font-semibold hover:underline"
              >
                View Full Plan
              </Link>
            </div>

            <p className="text-sm text-white/60 mb-3">
              {planData.today.workout
                ? planData.today.workout.title
                : "Rest day"}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => togglePlanProgress("workoutCompleted")}
                disabled={planSaving}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
                  planData.todayProgress.workoutCompleted
                    ? "bg-green-500/20 text-green-400"
                    : "bg-[#2A2A2A] text-white/50 hover:text-white"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    planData.todayProgress.workoutCompleted
                      ? "bg-green-500 border-green-500"
                      : "border-white/30"
                  }`}
                >
                  {planData.todayProgress.workoutCompleted && (
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                Workout
              </button>
              {(() => {
                const tp = planData.todayProgress;
                const mealsDone = [tp.breakfastCompleted, tp.lunchCompleted, tp.snackCompleted, tp.dinnerCompleted].filter(Boolean).length;
                const allDone = mealsDone === 4;
                return (
                  <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    allDone ? "bg-green-500/20 text-green-400" : mealsDone > 0 ? "bg-orange-500/20 text-orange-400" : "bg-[#2A2A2A] text-white/50"
                  }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      allDone ? "bg-green-500 border-green-500" : mealsDone > 0 ? "bg-orange-500 border-orange-500" : "border-white/30"
                    }`}>
                      {allDone && (
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {mealsDone > 0 && !allDone && (
                        <span className="text-[8px] text-white font-bold">{mealsDone}</span>
                      )}
                    </div>
                    Meals {mealsDone}/4
                  </span>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Targets */}
      {targets.length > 0 && (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">Weekly Targets</h2>
            <Link href="/hub/targets" className="text-[10px] text-[#E51A1A] hover:underline">View all</Link>
          </div>
          <div className="space-y-2.5">
            {targets.slice(0, 4).map((t) => {
              const lowerBetter = ["weight", "belly", "waist"].includes(t.metric);
              let pct = 0;
              if (t.currentValue && t.targetValue > 0) {
                pct = lowerBetter
                  ? (t.currentValue <= t.targetValue ? 100 : Math.min(100, Math.round((t.targetValue / t.currentValue) * 100)))
                  : Math.min(100, Math.round((t.currentValue / t.targetValue) * 100));
              }
              const color = pct >= 90 ? "#22C55E" : pct >= 50 ? "#FF6B00" : "#E51A1A";
              const unit = t.metric === "weight" ? "kg" : t.metric === "steps" ? "" : t.metric === "calories" ? "kcal" : "in";
              return (
                <div key={t.metric}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/60 capitalize">{t.metric}</span>
                    <span className="text-[10px] text-white/40">
                      {t.currentValue !== null ? `${t.currentValue}` : "--"} / {t.targetValue} {unit}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats Row */}
      {!loading && data && (
        <>
          {/* Time Range Filter for Stats */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Stats</h2>
            <TimeRangeFilter value={range} onChange={setRange} options={DASHBOARD_RANGE_OPTIONS} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Calories Card */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                {calorieLabel}
              </p>
              <p className="text-2xl font-black text-white">
                {caloriesEaten.toLocaleString()}
                {calorieTarget > 0 && (
                  <span className="text-sm font-semibold text-white/40">
                    {" "}/ {calorieTarget.toLocaleString()} kcal
                  </span>
                )}
              </p>
              {calorieTarget > 0 && (
                <div className="mt-3 h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(calorieProgress, 100)}%`,
                      backgroundColor: isOverTarget ? "#FF6B00" : "#E51A1A",
                    }}
                  />
                </div>
              )}
              {calorieTarget === 0 && (
                <p className="text-xs text-white/30 mt-2">
                  No targets set yet
                </p>
              )}
            </div>

            {/* Weight Card */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                Weight Trend
              </p>
              {data.weight.latest ? (
                <>
                  <p className="text-2xl font-black text-white">
                    {data.weight.latest}
                    <span className="text-sm font-semibold text-white/40"> kg</span>
                  </p>
                  {weightChange !== null && (
                    <p className={`text-sm font-semibold mt-1 ${weightChange < 0 ? "text-green-400" : weightChange > 0 ? "text-[#FF6B00]" : "text-white/40"}`}>
                      {weightChange > 0 ? "+" : ""}{weightChange} kg this week
                    </p>
                  )}
                </>
              ) : (
                <p className="text-lg font-bold text-white/30 mt-1">No data yet</p>
              )}
            </div>

            {/* Streak Card */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                Logging Streak
              </p>
              <p className="text-2xl font-black text-white">
                {data.streak}
                <span className="text-sm font-semibold text-white/40"> days</span>
              </p>
              <p className="text-xs text-white/30 mt-1">
                {data.streak > 0 ? "Keep it going!" : "Log a meal to start"}
              </p>
            </div>

            {/* Unread Messages Card */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
                Unread Messages
              </p>
              <p className="text-2xl font-black text-white">{data.unreadCount}</p>
              {data.unreadCount > 0 && (
                <Link
                  href="/hub/messages"
                  className="text-xs text-[#E51A1A] font-semibold mt-1 inline-block hover:underline"
                >
                  View messages
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5 animate-pulse"
            >
              <div className="h-3 bg-[#2A2A2A] rounded w-24 mb-3" />
              <div className="h-7 bg-[#2A2A2A] rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Quick Access Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-[#1E1E1E] border border-[#2A2A2A] p-5 rounded-2xl hover:border-[#E51A1A]/30 transition-all hover:-translate-y-0.5 group min-h-[80px]"
          >
            <h3 className="font-bold text-sm text-white mb-1 group-hover:text-[#E51A1A] transition-colors">
              {link.label}
            </h3>
            <p className="text-white/40 text-xs">{link.desc}</p>
          </Link>
        ))}
      </div>

      {/* Getting Started */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-4">Getting Started</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E51A1A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Set your macro targets</p>
              <p className="text-white/50 text-sm">
                Use the{" "}
                <Link href="/hub/calculator" className="text-[#E51A1A] font-semibold">
                  calculator
                </Link>{" "}
                to get personalized calorie and macro goals.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E51A1A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Explore recipes</p>
              <p className="text-white/50 text-sm">
                Browse{" "}
                <Link href="/hub/recipes" className="text-[#E51A1A] font-semibold">
                  400+ recipes
                </Link>{" "}
                with full macro breakdowns and video guides.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E51A1A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Track your meals</p>
              <p className="text-white/50 text-sm">
                Log off-plan meals from{" "}
                <Link href="/hub/my-plan" className="text-[#E51A1A] font-semibold">
                  My Plan
                </Link>{" "}
                and view history in{" "}
                <Link href="/hub/my-meals" className="text-[#E51A1A] font-semibold">
                  My Meals
                </Link>.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E51A1A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Track your body</p>
              <p className="text-white/50 text-sm">
                Log your measurements in the{" "}
                <Link href="/hub/progress" className="text-[#E51A1A] font-semibold">
                  measurements tracker
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
