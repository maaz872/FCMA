"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useBranding } from "@/lib/branding";
import NotificationBell from "@/components/ui/NotificationBell";
import InstallPrompt from "@/components/InstallPrompt";

const sidebarGroups = [
  {
    label: "OVERVIEW",
    links: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/branding", label: "Branding" },
    ],
  },
  {
    label: "CONTENT",
    links: [
      { href: "/admin/recipes", label: "Recipes" },
      { href: "/admin/workouts", label: "Workouts" },
      { href: "/admin/testimonials", label: "Testimonials" },
      { href: "/admin/restaurants", label: "Restaurants" },
      { href: "/admin/food-database", label: "Food Database" },
      { href: "/admin/plans", label: "Plans" },
      { href: "/admin/feed", label: "Feed" },
    ],
  },
  {
    label: "USERS",
    links: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/signup-requests", label: "Signup Requests" },
      { href: "/admin/messages", label: "Messages" },
      { href: "/admin/notifications", label: "Notifications" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { coachName } = useBranding();

  const coachInitials = coachName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function linkCls(href: string) {
    return isActive(href)
      ? "text-white font-semibold bg-[#E51A1A]/[0.08] border-l-[3px] border-[#E51A1A]"
      : "text-white/50 hover:text-white/80 hover:bg-white/[0.03] border-l-[3px] border-transparent";
  }

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

  return (
    <div className="flex min-h-screen">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-[#0A0A0A] border-r border-[#1A1A1A] sticky top-0 h-screen">
        {/* Branding */}
        <div className="p-5 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#E51A1A] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {coachInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{coachName}</p>
              <p className="text-[10px] text-white/30">Admin Panel</p>
            </div>
            <NotificationBell panelMode="sidebar" />
          </div>
        </div>

        {/* Grouped nav */}
        <nav className="flex-1 overflow-y-auto py-1">
          <NavGroups />
        </nav>

        {/* Bottom */}
        <div className="px-5 py-3 border-t border-[#1A1A1A] space-y-2">
          <Link
            href="/"
            className="block text-[12px] text-white/30 hover:text-white/50 transition-colors py-1"
          >
            &larr; Back to Site
          </Link>
          <InstallPrompt />
          <button
            onClick={handleLogout}
            className="text-[13px] text-white/30 hover:text-white/50 transition-colors cursor-pointer bg-transparent border-none"
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
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-white font-bold text-sm tracking-wider uppercase">Admin</span>
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
              {coachInitials}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{coachName}</p>
              <p className="text-[10px] text-white/30">Admin Panel</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white/40 hover:text-white text-2xl bg-transparent border-none cursor-pointer p-1 leading-none"
            aria-label="Close menu"
          >
            &times;
          </button>
        </div>

        {/* Mobile nav */}
        <nav className="flex-1 overflow-y-auto py-1">
          <NavGroups mobile />
        </nav>

        {/* Mobile bottom */}
        <div
          className="px-5 py-3 border-t border-[#1A1A1A] space-y-2"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <Link
            href="/"
            onClick={() => setSidebarOpen(false)}
            className="block text-[12px] text-white/30 hover:text-white/50 transition-colors py-1"
          >
            &larr; Back to Site
          </Link>
          <InstallPrompt />
          <button
            onClick={handleLogout}
            className="text-[13px] text-white/30 hover:text-white/50 transition-colors cursor-pointer bg-transparent border-none"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 bg-[#111111] min-h-screen">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
