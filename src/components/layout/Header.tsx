"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import NotificationBell from "@/components/ui/NotificationBell";
import { useBranding } from "@/lib/branding";

interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "USER" | "COACH";
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { siteName, coachName, logoUrl } = useBranding();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setDropdownOpen(false);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  // Build nav links based on auth state
  const navLinks = (() => {
    if (!user) {
      return [
        { href: "/login", label: "Login" },
      ];
    }
    if (user.role === "COACH") {
      return [
        { href: "/admin", label: "Admin Panel" },
      ];
    }
    return [
      { href: "/hub", label: "Dashboard" },
    ];
  })();

  const displayName = user?.role === "COACH" ? coachName : user?.firstName ?? "";

  return (
    <>
      <header className="bg-[#0A0A0A] sticky top-0 z-50 border-b border-[#1E1E1E]">
        <nav className="flex items-center justify-between px-6 h-[70px] max-w-[1300px] mx-auto">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt={siteName}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            <span className="text-white font-bold text-[1.1rem] tracking-wider uppercase">
              {siteName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex gap-7 items-center">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[0.85rem] font-semibold uppercase tracking-wider transition-colors ${
                  pathname === link.href
                    ? "text-[#E51A1A]"
                    : "text-white/60 hover:text-[#E51A1A]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden lg:flex items-center gap-4">
            {loading ? (
              <div className="w-20 h-9" />
            ) : user ? (
              <>
                <NotificationBell />
                {/* Auth dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-semibold transition-colors"
                  >
                    {displayName}
                    <svg
                      className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden shadow-xl z-50">
                      {user.role === "COACH" ? (
                        <Link
                          href="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-3 text-white/70 hover:text-white hover:bg-[#2A2A2A] text-sm transition-colors"
                        >
                          Admin Panel
                        </Link>
                      ) : (
                        <Link
                          href="/hub/settings"
                          onClick={() => setDropdownOpen(false)}
                          className="block px-4 py-3 text-white/70 hover:text-white hover:bg-[#2A2A2A] text-sm transition-colors"
                        >
                          Settings
                        </Link>
                      )}
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-3 text-white/70 hover:text-[#E51A1A] hover:bg-[#2A2A2A] text-sm transition-colors border-t border-[#2A2A2A]"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="bg-[#E51A1A] text-white px-5 py-2 rounded-full text-[0.8rem] font-bold uppercase tracking-wider hover:bg-[#C41010] transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Hamburger */}
          <button
            className="lg:hidden flex flex-col gap-[5px] p-[5px]"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span
              className={`block w-[25px] h-[2px] bg-white transition-all ${
                menuOpen ? "rotate-45 translate-y-[7px]" : ""
              }`}
            />
            <span
              className={`block w-[25px] h-[2px] bg-white transition-all ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-[25px] h-[2px] bg-white transition-all ${
                menuOpen ? "-rotate-45 -translate-y-[7px]" : ""
              }`}
            />
          </button>
        </nav>
      </header>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="fixed top-[70px] left-0 right-0 bottom-0 bg-[#0A0A0A] z-[999] p-10 flex flex-col gap-5 lg:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-[1.2rem] font-semibold uppercase tracking-wider py-2.5 border-b border-white/10 ${
                pathname === link.href
                  ? "text-[#E51A1A]"
                  : "text-white/60 hover:text-[#E51A1A]"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {!loading && (
            user ? (
              <>
                <div className="flex items-center gap-3 py-2.5 border-b border-white/10">
                  <NotificationBell />
                  <span className="text-white/60 text-[1rem] font-semibold">Notifications</span>
                </div>
                {user.role === "COACH" ? (
                  <Link
                    href="/admin"
                    onClick={() => setMenuOpen(false)}
                    className="text-white/60 hover:text-[#E51A1A] text-[1.2rem] font-semibold uppercase tracking-wider py-2.5 border-b border-white/10"
                  >
                    Admin Panel
                  </Link>
                ) : (
                  <Link
                    href="/hub/settings"
                    onClick={() => setMenuOpen(false)}
                    className="text-white/60 hover:text-[#E51A1A] text-[1.2rem] font-semibold uppercase tracking-wider py-2.5 border-b border-white/10"
                  >
                    Settings
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="text-left text-white/60 hover:text-[#E51A1A] text-[1.2rem] font-semibold uppercase tracking-wider py-2.5 border-b border-white/10"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-white/60 hover:text-[#E51A1A] text-[1.2rem] font-semibold uppercase tracking-wider py-2.5 border-b border-white/10"
              >
                Login
              </Link>
            )
          )}
        </div>
      )}
    </>
  );
}
