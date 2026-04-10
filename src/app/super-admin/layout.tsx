"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const sidebarGroups = [
  {
    label: "OVERVIEW",
    links: [{ href: "/super-admin", label: "Dashboard" }],
  },
  {
    label: "MANAGEMENT",
    links: [
      { href: "/super-admin/coaches", label: "Coaches" },
      { href: "/super-admin/billing", label: "Billing" },
    ],
  },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/super-admin") return pathname === "/super-admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  function linkCls(href: string) {
    return isActive(href)
      ? "text-white font-semibold bg-blue-600/[0.08] border-l-[3px] border-blue-500"
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
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-[#0A0A0A] border-r border-[#1A1A1A] sticky top-0 h-screen">
        <div className="p-5 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              SA
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">FCMA Platform</p>
              <p className="text-[10px] text-blue-400/60">Super Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          <NavGroups />
        </nav>

        <div className="px-5 py-3 border-t border-[#1A1A1A] space-y-2">
          <button
            onClick={handleLogout}
            className="text-[13px] text-white/30 hover:text-white/50 transition-colors cursor-pointer bg-transparent border-none"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
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
        <span className="text-white font-bold text-sm tracking-wider uppercase">Super Admin</span>
        <div className="w-6" />
      </div>

      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-0 z-50 bg-[#0A0A0A] flex flex-col lg:hidden transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              SA
            </div>
            <div>
              <p className="text-sm font-bold text-white">FCMA Platform</p>
              <p className="text-[10px] text-blue-400/60">Super Admin</p>
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

        <nav className="flex-1 overflow-y-auto py-1">
          <NavGroups mobile />
        </nav>

        <div
          className="px-5 py-3 border-t border-[#1A1A1A] space-y-2"
          style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        >
          <button
            onClick={handleLogout}
            className="text-[13px] text-white/30 hover:text-white/50 transition-colors cursor-pointer bg-transparent border-none"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#111111] min-h-screen">
        <div className="p-6 lg:p-8 pt-20 lg:pt-8">{children}</div>
      </main>
    </div>
  );
}
