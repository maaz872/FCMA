"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBranding } from "@/lib/branding";
import { fetchWithRetry } from "@/lib/fetch-retry";

type DashboardData = {
  user: { firstName: string; lastName: string } | null;
  mealTotals: { calories: number; protein: number; carbs: number; fat: number };
  targets: { calories: number } | null;
  weight: { latest: number | null; weekAgo: number | null };
  streak: number;
  unreadCount: number;
  stepsToday: number;
  stepGoal: number;
  consistencyDays: number;
  consistencyTotal: number;
};

type PlanSummary = {
  plan: {
    id: number; name: string; weekNumber: number; dayOfWeek: number; totalWeeks: number;
  } | null;
  today: {
    workout: { title: string } | null;
    calorieTarget: number | null;
  };
  todayProgress: {
    workoutCompleted: boolean;
    breakfastCompleted: boolean;
    lunchCompleted: boolean;
    snackCompleted: boolean;
    dinnerCompleted: boolean;
  };
};

export default function HubDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [planData, setPlanData] = useState<PlanSummary | null>(null);
  const [planSaving, setPlanSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState<{ metric: string; targetValue: number; currentValue: number | null }[]>([]);
  const [stepTarget, setStepTarget] = useState<number | null>(null);
  const { siteName } = useBranding();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // Fetch ALL data in parallel with Promise.all
    Promise.all([
      fetchWithRetry("/api/user/dashboard?range=today").then(r => r.json()).catch(() => null),
      fetchWithRetry("/api/user/plan").then(r => r.json()).catch(() => null),
      fetchWithRetry("/api/user/targets").then(r => r.json()).catch(() => null),
    ]).then(([dashData, planData, targetData]) => {
      if (cancelled) return; // Component unmounted
      if (dashData && !dashData.error) setData(dashData);
      if (planData && !planData.error && planData.plan) setPlanData(planData);
      if (targetData?.targets) {
        setTargets(targetData.targets);
        const st = targetData.targets.find((t: { metric: string }) => t.metric === "steps");
        if (st) setStepTarget(st.targetValue);
      }
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => { cancelled = true; }; // Cleanup on unmount
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
    } catch { /* ignore */ }
    setPlanSaving(false);
  }

  // Computed values
  const firstName = data?.user?.firstName || "";
  const caloriesEaten = data?.mealTotals?.calories || 0;
  const calorieTarget = planData?.today?.calorieTarget || data?.targets?.calories || 0;
  const calPercent = calorieTarget > 0 ? Math.min(Math.round((caloriesEaten / calorieTarget) * 100), 100) : 0;
  const steps = data?.stepsToday || 0;
  const stepGoal = stepTarget || data?.stepGoal || 10000;
  const stepPercent = stepGoal > 0 ? Math.min(Math.round((steps / stepGoal) * 100), 100) : 0;
  const stepsExceeded = steps >= stepGoal && stepGoal > 0;
  const weightLatest = data?.weight?.latest;
  const weightWeekAgo = data?.weight?.weekAgo;
  const weightChange = weightLatest !== null && weightWeekAgo !== null && weightLatest !== undefined && weightWeekAgo !== undefined
    ? Math.round((weightLatest - weightWeekAgo) * 10) / 10 : null;

  function calMotivation() {
    if (calPercent > 100) return { text: "Over target", cls: "text-[#E51A1A]" };
    if (calPercent >= 90) return { text: "On target!", cls: "text-green-400" };
    if (calPercent >= 50) return { text: "Almost there!", cls: "text-[#FF6B00]" };
    return { text: "Keep going!", cls: "text-white/25" };
  }
  const calMsg = calMotivation();

  if (loading) {
    return (
      <div>
        <div className="h-8 bg-[#2A2A2A] rounded w-48 mb-3 animate-pulse" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-[#2A2A2A] rounded w-32 mb-2" />
              <div className="h-6 bg-[#2A2A2A] rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-black text-white">
          {firstName ? `Welcome back, ${firstName}!` : `Welcome to ${siteName}`}
        </h1>
        <p className="text-white/40 text-sm mt-1">Your daily overview</p>
      </div>

      {/* Today's Plan */}
      {planData?.plan && (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-white">{planData.plan.name}</h2>
              <p className="text-[10px] text-white/40">
                Week {planData.plan.weekNumber} of {planData.plan.totalWeeks} &middot; Day {planData.plan.dayOfWeek}
              </p>
            </div>
            <Link href="/hub/my-plan" className="text-[10px] text-[#E51A1A] hover:underline">View Plan</Link>
          </div>
          <p className="text-white/60 text-sm mb-3">
            {planData.today.workout ? planData.today.workout.title : "Rest Day"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => togglePlanProgress("workoutCompleted")}
              disabled={planSaving}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-none ${
                planData.todayProgress.workoutCompleted
                  ? "bg-green-500/20 text-green-400"
                  : "bg-[#2A2A2A] text-white/50 hover:text-white"
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                planData.todayProgress.workoutCompleted ? "bg-green-500 border-green-500" : "border-white/30"
              }`}>
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
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  allDone ? "bg-green-500/20 text-green-400" : mealsDone > 0 ? "bg-orange-500/20 text-orange-400" : "bg-[#2A2A2A] text-white/50"
                }`}>
                  Meals {mealsDone}/4
                </span>
              );
            })()}
          </div>
        </div>
      )}

      {/* Calorie + Step Trackers — 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        {/* Calories */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide mb-1">🔥 Calories</p>
          <p className="text-lg font-black text-white">
            {caloriesEaten.toLocaleString()}
            <span className="text-[10px] text-white/30 font-semibold ml-1">/ {calorieTarget.toLocaleString()}</span>
          </p>
          <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden mt-2">
            <div className="h-full bg-[#E51A1A] rounded-full transition-all duration-700" style={{ width: `${calPercent}%` }} />
          </div>
          <p className={`text-[9px] mt-1.5 ${calMsg.cls}`}>{calMsg.text}</p>
        </div>

        {/* Steps */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide mb-1">👟 Steps</p>
          <p className={`text-lg font-black ${stepsExceeded ? "text-green-400" : "text-white"}`}>
            {steps.toLocaleString()}
            <span className="text-[10px] text-white/30 font-semibold ml-1">/ {stepGoal.toLocaleString()}</span>
          </p>
          <div className={`w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden mt-2 ${stepsExceeded ? "shadow-[0_0_8px_rgba(34,197,94,0.3)]" : ""}`}>
            <div className={`h-full rounded-full transition-all duration-700 ${stepsExceeded ? "bg-green-500" : "bg-[#FF6B00]"}`} style={{ width: `${stepPercent}%` }} />
          </div>
          <p className={`text-[9px] mt-1.5 ${stepsExceeded ? "text-green-400" : "text-white/25"}`}>
            {stepsExceeded ? "Goal crushed!" : `${(stepGoal - steps).toLocaleString()} more to go`}
          </p>
        </div>
      </div>

      {/* Quick Log Buttons */}
      <div className="flex gap-3">
        <Link href="/hub/progress" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-3 rounded-xl bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 transition-all">
          ⚖ Log Weight
        </Link>
        <Link href="/hub/steps" className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-3 rounded-xl bg-[#FFB800]/10 text-[#FFB800] hover:bg-[#FFB800]/20 transition-all">
          👣 Log Steps
        </Link>
      </div>

      {/* Targets */}
      {targets.length > 0 && (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">🎯 Targets</h2>
            <Link href="/hub/targets" className="text-[10px] text-[#E51A1A] hover:underline">View all</Link>
          </div>
          <div className="space-y-2.5">
            {targets.slice(0, 4).map((t) => {
              const isSteps = t.metric === "steps";
              const hasCurrent = t.currentValue !== null;
              const delta = hasCurrent ? t.currentValue! - t.targetValue : 0;
              const absDelta = Math.abs(Math.round(delta * 10) / 10);
              const isOnTarget = hasCurrent && delta === 0;
              const isAbove = hasCurrent && delta > 0;
              const color = isOnTarget ? "#22C55E" : isAbove ? (isSteps ? "#22C55E" : "#FF6B00") : "#3B82F6";
              const unit = t.metric === "weight" ? "kg" : t.metric === "steps" ? "" : "in";
              return (
                <div key={t.metric}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/60 capitalize">{t.metric}</span>
                    <span className="text-[10px] font-medium" style={{ color }}>
                      {isOnTarget ? "✓ On target" : isAbove && isSteps ? `✓ +${absDelta.toLocaleString()}` : isAbove ? `↑ ${absDelta} ${unit}` : `↓ ${absDelta} ${unit}`}
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
                    {(() => {
                      const deviationPct = t.targetValue > 0 && hasCurrent ? Math.min(Math.abs(delta) / t.targetValue * 100, 100) : 0;
                      const accuracyPct = 100 - deviationPct;
                      return <div className="h-full rounded-full transition-all duration-700" style={{ width: `${accuracyPct}%`, backgroundColor: color }} />;
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weight Trend */}
      {weightLatest !== null && weightLatest !== undefined && (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-white mb-2">⚖️ Weight</h2>
          <p className="text-2xl font-black text-white">{weightLatest} kg</p>
          {weightChange !== null && (
            <p className={`text-xs font-semibold mt-1 ${weightChange < 0 ? "text-green-400" : weightChange > 0 ? "text-[#E51A1A]" : "text-white/30"}`}>
              {weightChange > 0 ? "+" : ""}{weightChange} kg this week
            </p>
          )}
        </div>
      )}

      {/* Consistency + Messages */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide mb-1">🔥 Streak</p>
          <p className="text-2xl font-black text-white">{data?.streak || 0} <span className="text-xs font-semibold text-white/30">days</span></p>
          <p className="text-[9px] text-white/25 mt-1">{(data?.streak || 0) > 0 ? "Keep it going!" : "Log a meal to start"}</p>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4">
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-wide mb-1">💬 Messages</p>
          <p className="text-2xl font-black text-white">{data?.unreadCount || 0}</p>
          {(data?.unreadCount || 0) > 0 && (
            <Link href="/hub/messages" className="text-[9px] text-[#E51A1A] hover:underline">View messages</Link>
          )}
        </div>
      </div>
    </div>
  );
}
