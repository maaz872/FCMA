"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";
import { useBranding } from "@/lib/branding";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { siteName } = useBranding();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (data.user.role === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else if (data.user.role === "ADMIN" || data.user.role === "COACH") {
        router.push("/admin");
      } else {
        router.push("/hub");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <section className="min-h-[calc(100vh-70px)] flex items-center justify-center bg-cream py-12 px-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">Welcome Back</h1>
          <p className="text-white/50">Log in to access your {siteName} account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block font-semibold text-sm mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full py-3.5 px-5 border-2 border-[#2A2A2A] rounded-xl text-base bg-[#1E1E1E] focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="block font-semibold text-sm mb-1.5">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full py-3.5 px-5 border-2 border-[#2A2A2A] rounded-xl text-base bg-[#1E1E1E] focus:border-primary focus:outline-none transition-colors"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:text-primary-hover font-semibold"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" fullWidth className={loading ? "opacity-60 pointer-events-none" : ""}>
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <p className="text-center mt-8 text-white/50 text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/checkout" className="text-primary font-semibold hover:text-primary-hover">
            Sign up for The Hub
          </Link>
        </p>
      </div>
    </section>
  );
}
