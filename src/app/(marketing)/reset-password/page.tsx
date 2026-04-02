"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least 1 letter and 1 number");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    // Future: validate token and update password via API
    setSuccess(true);
  }

  return (
    <section className="min-h-[calc(100vh-70px)] flex items-center justify-center bg-cream py-12 px-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">Reset Password</h1>
          <p className="text-white/50">Enter your new password below.</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-5 rounded-xl mb-6">
              <p className="font-semibold mb-1">Password Reset Successfully</p>
              <p className="text-sm">You can now log in with your new password.</p>
            </div>
            <Link
              href="/login"
              className="text-primary font-semibold hover:text-primary-hover"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-primary/10 border border-primary/20 text-primary px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block font-semibold text-sm mb-1.5">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters, 1 letter, 1 number"
                required
                className="w-full py-3.5 px-5 border-2 border-[#2A2A2A] rounded-xl text-base bg-[#1E1E1E] focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label htmlFor="confirm" className="block font-semibold text-sm mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                required
                className="w-full py-3.5 px-5 border-2 border-[#2A2A2A] rounded-xl text-base bg-[#1E1E1E] focus:border-primary focus:outline-none transition-colors"
              />
            </div>

            <Button type="submit" fullWidth>
              Reset Password
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
