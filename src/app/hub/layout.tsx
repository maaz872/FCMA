"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import NotificationBell from "@/components/ui/NotificationBell";

const sidebarLinks = [
  { href: "/hub", label: "Dashboard" },
  { href: "/hub/feed", label: "Feed" },
  { href: "/hub/recipes", label: "Recipes" },
  { href: "/hub/workouts", label: "Workouts" },
  { href: "/hub/restaurants", label: "Restaurants" },
  { href: "/hub/calculator", label: "Calculator" },
  { href: "/hub/food-chart", label: "Food Chart" },
  { href: "/hub/snap-my-macros", label: "Meal Tracker" },
  { href: "/hub/progress", label: "Progress" },
  { href: "/hub/analytics", label: "Analytics" },
  { href: "/hub/steps", label: "Steps" },
  { href: "/hub/favourites", label: "Favourites" },
  { href: "/hub/messages", label: "Messages" },
  { href: "/hub/notifications", label: "Notifications" },
  { href: "/hub/settings", label: "Settings" },
];

interface DashboardStats {
  mealTotals?: { calories: number };
  targets?: { calories: number } | null;
  user?: { firstName: string; lastName: string } | null;
  stepsToday?: number;
  stepGoal?: number;
}

export default function HubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [initials, setInitials] = useState("");
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [calorieTarget, setCalorieTarget] = useState(2000);
  const [steps, setSteps] = useState(0);
  const [stepGoal, setStepGoal] = useState(10000);

  useEffect(() => {
    // Fetch user info
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const fn = data.user.firstName || "";
          const ln = data.user.lastName || "";
          setUserName(`${fn} ${ln}`.trim());
          setInitials(
            `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase()
          );
        }
      })
      .catch(() => {});

    // Fetch dashboard stats (includes steps now)
    fetch("/api/user/dashboard")
      .then((r) => r.json())
      .then((data: DashboardStats) => {
        if (data.mealTotals) {
          setCaloriesEaten(data.mealTotals.calories || 0);
        }
        if (data.targets) {
          setCalorieTarget(data.targets.calories || 2000);
        }
        if (typeof data.stepsToday === "number") {
          setSteps(data.stepsToday);
        }
        if (typeof data.stepGoal === "number") {
          setStepGoal(data.stepGoal);
        }
      })
      .catch(() => {});
  }, []);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const calPercent = Math.min(100, Math.round((caloriesEaten / calorieTarget) * 100));
  const stepPercent = Math.min(100, Math.round((steps / stepGoal) * 100));

  return (
    <div className="flex min-h-[calc(100vh-70px)]">
      {/* Mobile top bar: hamburger + Level Up + NotificationBell */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#0A0A0A] border-b border-[#1E1E1E] flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-white bg-transparent border-none cursor-pointer"
          aria-label="Open sidebar"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="text-white font-bold text-sm tracking-wider uppercase">
          Level Up
        </span>
        <NotificationBell />
      </div>

      {/* Mobile sidebar: full-screen overlay */}
      <aside
        className={`lg:hidden fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E51A1A] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base text-white truncate">
                {userName || "The Hub"}
              </p>
              <p className="text-xs text-white/40">Level Up Hub</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-white/60 hover:text-white bg-transparent border-none cursor-pointer"
            aria-label="Close sidebar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Mobile nav links (scrollable) */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/hub" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-6 py-3.5 text-base font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border-r-3 border-primary"
                    : "text-white/60 hover:bg-[#1E1E1E] hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Today's Stats mini-section */}
        <div className="px-5 py-4 border-t border-[#222] space-y-3">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            Today
          </p>

          {/* Calories mini bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/50">Calories</span>
              <span className="text-xs text-white/70 font-semibold">
                {caloriesEaten} / {calorieTarget}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E51A1A] rounded-full transition-all"
                style={{ width: `${calPercent}%` }}
              />
            </div>
          </div>

          {/* Steps mini bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-white/50">Steps</span>
              <span className="text-xs text-white/70 font-semibold">
                {steps.toLocaleString()} / {stepGoal.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF6B00] rounded-full transition-all"
                style={{ width: `${stepPercent}%` }}
              />
            </div>
          </div>

          {/* Quick log buttons */}
          <div className="flex gap-2 pt-1">
            <Link
              href="/hub/snap-my-macros"
              onClick={() => setSidebarOpen(false)}
              className="flex-1 text-center text-xs font-semibold py-2.5 rounded-lg bg-[#E51A1A]/10 text-[#E51A1A] hover:bg-[#E51A1A]/20 transition-colors"
            >
              Log Meal
            </Link>
            <Link
              href="/hub/progress"
              onClick={() => setSidebarOpen(false)}
              className="flex-1 text-center text-xs font-semibold py-2.5 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 transition-colors"
            >
              Log Weight
            </Link>
            <Link
              href="/hub/steps"
              onClick={() => setSidebarOpen(false)}
              className="flex-1 text-center text-xs font-semibold py-2.5 rounded-lg bg-[#FFB800]/10 text-[#FFB800] hover:bg-[#FFB800]/20 transition-colors"
            >
              Log Steps
            </Link>
          </div>
        </div>

        {/* Logout at very bottom */}
        <div className="p-4 border-t border-[#222]" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 text-base font-medium text-white/50 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Desktop sidebar (unchanged layout) */}
      <aside className="hidden lg:flex sticky top-0 h-screen w-[260px] bg-[#1E1E1E] border-r border-[#222] flex-col z-40 shrink-0">
        {/* User branding */}
        <div className="p-5 border-b border-[#222]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E51A1A] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {initials || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white truncate">
                {userName || "The Hub"}
              </p>
              <p className="text-xs text-white/40">Level Up Hub</p>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/hub" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-6 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary border-r-3 border-primary"
                    : "text-white/60 hover:bg-dark/5 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Today's Stats */}
        <div className="px-5 py-4 border-t border-[#222] space-y-3">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            Today
          </p>

          {/* Calories mini bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-white/50">Calories</span>
              <span className="text-[11px] text-white/70 font-semibold">
                {caloriesEaten} / {calorieTarget}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E51A1A] rounded-full transition-all"
                style={{ width: `${calPercent}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-white/50">Steps</span>
              <span className="text-[11px] text-white/70 font-semibold">
                {steps.toLocaleString()} / {stepGoal.toLocaleString()}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF6B00] rounded-full transition-all"
                style={{ width: `${stepPercent}%` }}
              />
            </div>
          </div>

          {/* Quick log buttons */}
          <div className="flex gap-2 pt-1">
            <Link
              href="/hub/snap-my-macros"
              className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg bg-[#E51A1A]/10 text-[#E51A1A] hover:bg-[#E51A1A]/20 transition-colors"
            >
              Log Meal
            </Link>
            <Link
              href="/hub/progress"
              className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 transition-colors"
            >
              Log Weight
            </Link>
            <Link
              href="/hub/steps"
              className="flex-1 text-center text-[10px] font-semibold py-1.5 rounded-lg bg-[#FFB800]/10 text-[#FFB800] hover:bg-[#FFB800]/20 transition-colors"
            >
              Log Steps
            </Link>
          </div>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-[#222]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-white/50 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors cursor-pointer bg-transparent border-none"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 bg-light min-h-full">
        {/* Add top padding on mobile to account for the fixed mobile top bar */}
        <div className="p-6 pt-20 lg:p-10">{children}</div>
      </div>
    </div>
  );
}
