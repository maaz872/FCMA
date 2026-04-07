"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import NotificationBell from "@/components/ui/NotificationBell";
import InstallPrompt from "@/components/InstallPrompt";
import { useBranding } from "@/lib/branding";
import { fetchWithRetry } from "@/lib/fetch-retry";

const sidebarGroups = [
  {
    label: "MAIN",
    links: [
      { href: "/hub", label: "Dashboard" },
      { href: "/hub/my-plan", label: "My Plan" },
      { href: "/hub/feed", label: "Feed" },
    ],
  },
  {
    label: "NUTRITION & FITNESS",
    links: [
      { href: "/hub/recipes", label: "Recipes" },
      { href: "/hub/workouts", label: "Workouts" },
      { href: "/hub/food-chart", label: "Food Chart" },
      { href: "/hub/my-meals", label: "My Meals" },
    ],
  },
  {
    label: "TRACKING",
    links: [
      { href: "/hub/progress", label: "Body" },
      { href: "/hub/targets", label: "Targets" },
      { href: "/hub/analytics", label: "Analytics" },
      { href: "/hub/steps", label: "Steps" },
    ],
  },
  {
    label: "TOOLS",
    links: [
      { href: "/hub/calculator", label: "Calculator" },
      { href: "/hub/restaurants", label: "Restaurants" },
      { href: "/hub/favourites", label: "Favourites" },
    ],
  },
  {
    label: "ACCOUNT",
    links: [
      { href: "/hub/health-profile", label: "Health Profile" },
      { href: "/hub/messages", label: "Messages" },
      { href: "/hub/notifications", label: "Notifications" },
      { href: "/hub/settings", label: "Settings" },
    ],
  },
];

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
  const { siteName } = useBranding();

  useEffect(() => {
    fetchWithRetry("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          const fn = data.user.firstName || "";
          const ln = data.user.lastName || "";
          setUserName(`${fn} ${ln}`.trim());
          setInitials(`${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase());
        }
      })
      .catch(() => {});

    fetchWithRetry("/api/user/dashboard")
      .then((r) => r.json())
      .then((data) => {
        if (data.mealTotals) setCaloriesEaten(data.mealTotals.calories || 0);
        if (data.stepsToday !== undefined) setSteps(data.stepsToday);
        if (data.stepGoal) setStepGoal(data.stepGoal);
      })
      .catch(() => {});

    // Fetch calorie target from assigned plan
    fetchWithRetry("/api/user/plan")
      .then((r) => r.json())
      .then((data) => {
        if (data.today?.calorieTarget) setCalorieTarget(data.today.calorieTarget);
      })
      .catch(() => {});

    // Fetch step target from admin-set targets
    fetchWithRetry("/api/user/targets")
      .then((r) => r.json())
      .then((data) => {
        const stepTarget = (data.targets || []).find((t: { metric: string }) => t.metric === "steps");
        if (stepTarget) setStepGoal(stepTarget.targetValue);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const calPercent = calorieTarget > 0 ? Math.round((caloriesEaten / calorieTarget) * 100) : 0;
  const stepPercent = stepGoal > 0 ? Math.round((steps / stepGoal) * 100) : 0;
  const stepsExceeded = steps >= stepGoal && stepGoal > 0;

  function calMotivation() {
    if (calPercent > 100) return { text: "Over target", cls: "text-[#E51A1A]" };
    if (calPercent >= 90) return { text: "On target!", cls: "text-green-400" };
    if (calPercent >= 50) return { text: "Almost there!", cls: "text-[#FF6B00]" };
    return { text: "Keep going!", cls: "text-white/25" };
  }

  const calMsg = calMotivation();

  function linkCls(href: string) {
    const active =
      pathname === href || (href !== "/hub" && pathname.startsWith(href));
    return active
      ? "text-white font-semibold bg-[#E51A1A]/[0.08] border-l-[3px] border-[#E51A1A]"
      : "text-white/50 hover:text-white/80 hover:bg-white/[0.03] border-l-[3px] border-transparent";
  }

  /* ── Shared sub-components ── */

  function NavGroups({ mobile }: { mobile?: boolean }) {
    return (
      <>
        {sidebarGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-[2px] px-5 pt-5 pb-2">
              {group.label}
            </p>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={mobile ? () => setSidebarOpen(false) : undefined}
                className={`flex items-center px-5 ${
                  mobile ? "py-3 text-[15px]" : "py-2 text-[13px]"
                } font-medium transition-all duration-200 ${linkCls(link.href)}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </>
    );
  }

  function StatsSection({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="px-5 py-4 border-t border-[#1A1A1A] space-y-3">
        <p className="text-[10px] font-bold text-white/25 uppercase tracking-[2px]">
          Today
        </p>

        {/* Calories */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/40">Calories</span>
            <span className="text-[10px] text-white/60 font-semibold">
              {caloriesEaten} / {calorieTarget}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#E51A1A] rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, calPercent)}%` }}
            />
          </div>
          <p className={`text-[9px] mt-1 ${calMsg.cls}`}>{calMsg.text}</p>
        </div>

        {/* Steps */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-white/40">Steps</span>
            <span
              className={`text-[10px] font-semibold ${
                stepsExceeded ? "text-green-400" : "text-white/60"
              }`}
            >
              {steps.toLocaleString()} / {stepGoal.toLocaleString()}
            </span>
          </div>
          <div
            className={`w-full h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden transition-shadow duration-500 ${
              stepsExceeded ? "shadow-[0_0_12px_rgba(34,197,94,0.3)]" : ""
            }`}
          >
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                stepsExceeded ? "bg-green-500" : "bg-[#FF6B00]"
              }`}
              style={{ width: `${Math.min(100, stepPercent)}%` }}
            />
          </div>
          <p
            className={`text-[9px] mt-1 ${
              stepsExceeded ? "text-green-400" : "text-white/25"
            }`}
          >
            {stepsExceeded
              ? "Goal crushed!"
              : `${(stepGoal - steps).toLocaleString()} more to go`}
          </p>
        </div>

        {/* Quick Log Buttons */}
        <div className="flex gap-2 pt-1">
          <Link
            href="/hub/my-meals"
            onClick={onNavigate}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-2 rounded-lg bg-[#E51A1A]/10 text-[#E51A1A] hover:bg-[#E51A1A]/20 hover:-translate-y-0.5 transition-all"
          >
            🍽 Meals
          </Link>
          <Link
            href="/hub/progress"
            onClick={onNavigate}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-2 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/20 hover:-translate-y-0.5 transition-all"
          >
            ⚖ Weight
          </Link>
          <Link
            href="/hub/steps"
            onClick={onNavigate}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold py-2 rounded-lg bg-[#FFB800]/10 text-[#FFB800] hover:bg-[#FFB800]/20 hover:-translate-y-0.5 transition-all"
          >
            👣 Steps
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-[#0A0A0A] border-r border-[#1A1A1A] sticky top-0 h-screen">
        {/* Profile */}
        <div className="p-5 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E51A1A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {userName || "The Hub"}
              </p>
              <p className="text-[10px] text-white/30">{siteName} Hub</p>
            </div>
            <NotificationBell panelMode="sidebar" />
          </div>
        </div>

        {/* Grouped nav */}
        <nav className="flex-1 overflow-y-auto py-1">
          <NavGroups />
        </nav>

        {/* Stats + Quick Log */}
        <StatsSection />

        {/* Install + Logout */}
        <div className="px-5 py-3 border-t border-[#1A1A1A] space-y-1">
          <InstallPrompt />
          <button
            onClick={handleLogout}
            className="text-[11px] text-white/25 hover:text-white/50 transition-colors cursor-pointer bg-transparent border-none"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-[#0A0A0A] border-b border-[#1A1A1A] z-30 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-white/70 hover:text-white bg-transparent border-none cursor-pointer p-1"
          aria-label="Open menu"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-white font-bold text-sm tracking-wider uppercase">
          {siteName}
        </span>
        <NotificationBell />
      </div>

      {/* ── Mobile Backdrop (blur + dim) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar (full screen) ── */}
      <aside
        className={`fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col lg:hidden transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E51A1A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials || "?"}
            </div>
            <p className="text-sm font-bold text-white">
              {userName || "The Hub"}
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white/40 hover:text-white text-2xl bg-transparent border-none cursor-pointer p-1 leading-none"
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        {/* Mobile nav (larger touch targets) */}
        <nav className="flex-1 overflow-y-auto py-1">
          <NavGroups mobile />
        </nav>

        {/* Mobile stats */}
        <StatsSection onNavigate={() => setSidebarOpen(false)} />

        {/* Mobile install + logout */}
        <div
          className="px-5 py-3 border-t border-[#1A1A1A] space-y-1"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <InstallPrompt />
          <button
            onClick={handleLogout}
            className="text-[11px] text-white/25 hover:text-white/50 transition-colors cursor-pointer bg-transparent border-none"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 bg-[#111111] min-h-screen">
        <div className="p-6 lg:p-10 pt-20 lg:pt-10">{children}</div>
      </div>
    </div>
  );
}
