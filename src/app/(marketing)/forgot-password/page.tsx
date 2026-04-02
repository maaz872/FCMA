"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Future: send reset email via API
    setSubmitted(true);
  }

  return (
    <section className="min-h-[calc(100vh-70px)] flex items-center justify-center bg-cream py-12 px-6">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-black mb-2">Forgot Password</h1>
          <p className="text-white/50">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-5 rounded-xl mb-6">
              <p className="font-semibold mb-1">Check your email</p>
              <p className="text-sm">
                If an account exists with that email, you&apos;ll receive a password
                reset link shortly.
              </p>
            </div>
            <Link
              href="/login"
              className="text-primary font-semibold hover:text-primary-hover"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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

            <Button type="submit" fullWidth>
              Send Reset Link
            </Button>

            <p className="text-center text-white/50 text-sm">
              <Link href="/login" className="text-primary font-semibold hover:text-primary-hover">
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
