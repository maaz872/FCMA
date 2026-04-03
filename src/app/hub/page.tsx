"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TimeRangeFilter from "@/components/ui/TimeRangeFilter";

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
  { href: "/hub/snap-my-macros", label: "Meal Tracker", desc: "Photo-based meal tracking" },
  { href: "/hub/progress", label: "Progress", desc: "Log weight and photos" },
  { href: "/hub/analytics", label: "Analytics", desc: "Personal insights and trends" },
  { href: "/hub/favourites", label: "Favourites", desc: "Your saved recipes" },
  { href: "/hub/messages", label: "Messages", desc: "Chat with your coach" },
  { href: "/hub/settings", label: "Settings", desc: "Manage your account" },
];

export default function HubDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today");

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
          Your Hub dashboard. Everything you need in one place.
        </p>
      </div>

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
            className="bg-[#1E1E1E] border border-[#2A2A2A] p-5 rounded-2xl hover:border-[#E51A1A]/30 transition-all hover:-translate-y-0.5 group"
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
                Use{" "}
                <Link href="/hub/snap-my-macros" className="text-[#E51A1A] font-semibold">
                  Snap My Macros
                </Link>{" "}
                to log meals with a photo.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E51A1A] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Monitor your progress</p>
              <p className="text-white/50 text-sm">
                Log your weight and upload photos in the{" "}
                <Link href="/hub/progress" className="text-[#E51A1A] font-semibold">
                  progress tracker
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
