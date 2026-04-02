"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

type Step = "account" | "payment" | "success";

export default function CheckoutPage() {
  const [step, setStep] = useState<Step>("account");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Account form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Payment form state
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [transactionRef, setTransactionRef] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (email !== confirmEmail) {
      setError("Email addresses do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must contain at least 1 letter and 1 number");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!acceptTerms) {
      setError("Please accept the Privacy Policy & Terms");
      return;
    }

    setStep("payment");
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a JPG, PNG, or WebP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB");
      return;
    }

    setError("");
    setScreenshotName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!screenshot) {
      setError("Please upload a screenshot of your payment");
      return;
    }
    if (!accountName.trim()) {
      setError("Please enter the account name used for payment");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Register account with unified model
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          country,
          plan: "HUB",
          planStatus: "PENDING",
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        setError(registerData.error || "Registration failed");
        setLoading(false);
        return;
      }

      // Step 2: Submit payment proof
      const proofRes = await fetch("/api/auth/payment-proof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.toLowerCase(),
          paymentScreenshot: screenshot,
          paymentAccountName: accountName.trim(),
          paymentTransactionRef: transactionRef.trim() || undefined,
        }),
      });

      const proofData = await proofRes.json();

      if (!proofRes.ok) {
        setError(proofData.error || "Failed to submit payment proof");
        setLoading(false);
        return;
      }

      setStep("success");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full py-3.5 px-4.5 border-2 border-[#2A2A2A] rounded-xl text-base bg-[#1E1E1E] text-white placeholder:text-white/30 focus:border-[#E51A1A] focus:outline-none transition-colors";

  return (
    <section className="bg-[#0A0A0A] py-15 min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {["Account", "Payment", "Done"].map((label, i) => {
            const stepMap: Step[] = ["account", "payment", "success"];
            const isActive = stepMap.indexOf(step) >= i;
            return (
              <div key={label} className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isActive
                        ? "bg-[#E51A1A] text-white"
                        : "bg-[#1E1E1E] text-white/30 border border-[#2A2A2A]"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      isActive ? "text-white" : "text-white/30"
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className={`w-12 h-0.5 ${
                      isActive ? "bg-[#E51A1A]" : "bg-[#2A2A2A]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {step === "success" ? (
          <div className="max-w-[500px] mx-auto text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-white mb-3">
              Account Created!
            </h2>
            <p className="text-white/50 mb-8">
              Your payment proof has been submitted. Coach Raheel will review
              and activate your account within 24 hours.
            </p>
            <Button href="/">Back to Home</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-15 items-start">
            {/* Left: Form */}
            <div>
              {step === "account" && (
                <form onSubmit={handleAccountSubmit} className="space-y-5">
                  <h2 className="text-2xl font-black text-white mb-2">
                    Join The Hub
                  </h2>
                  <p className="text-white/50 text-sm mb-6">
                    Get lifetime access to 400+ recipes, macro calculator, meal
                    tracker, progress tracking, and more.
                  </p>

                  {/* Plan card */}
                  <div className="bg-[#1E1E1E] border-2 border-[#E51A1A] rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#E51A1A]/20 rounded-xl flex items-center justify-center text-2xl">
                      🏠
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold">The Hub - Lifetime Access</p>
                      <p className="text-white/40 text-xs">One-time payment. No recurring fees.</p>
                    </div>
                    <p className="text-[#E51A1A] font-black text-2xl">&euro;79</p>
                  </div>

                  {error && (
                    <div className="bg-[#E51A1A]/10 border border-[#E51A1A]/20 text-[#E51A1A] px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-sm text-white mb-1.5">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        required
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-sm text-white mb-1.5">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        required
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Confirm Email
                    </label>
                    <input
                      type="email"
                      value={confirmEmail}
                      onChange={(e) => setConfirmEmail(e.target.value)}
                      placeholder="Confirm your email"
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 letter, 1 number"
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Country
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select a country</option>
                      <option value="PK">Pakistan</option>
                      <option value="IE">Ireland</option>
                      <option value="GB">United Kingdom</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="AU">Australia</option>
                      <option value="AE">United Arab Emirates</option>
                      <option value="IN">India</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="ES">Spain</option>
                      <option value="IT">Italy</option>
                      <option value="NL">Netherlands</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-2.5 mt-5">
                    <input
                      type="checkbox"
                      id="terms"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#E51A1A]"
                    />
                    <label htmlFor="terms" className="text-sm text-white/60">
                      I accept the{" "}
                      <Link
                        href="/privacy-policy"
                        className="text-[#E51A1A] font-semibold"
                      >
                        Privacy Policy
                      </Link>{" "}
                      &amp;{" "}
                      <Link
                        href="/terms"
                        className="text-[#E51A1A] font-semibold"
                      >
                        Terms and Conditions
                      </Link>
                    </label>
                  </div>

                  <Button type="submit" fullWidth>
                    Continue to Payment
                  </Button>
                </form>
              )}

              {step === "payment" && (
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  <h2 className="text-2xl font-black text-white mb-2">
                    Payment via EasyPaisa
                  </h2>
                  <p className="text-white/50 text-sm mb-6">
                    Send payment to the account below and upload a screenshot as
                    proof.
                  </p>

                  {error && (
                    <div className="bg-[#E51A1A]/10 border border-[#E51A1A]/20 text-[#E51A1A] px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  {/* EasyPaisa Details Card */}
                  <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-sm">
                        Account Number
                      </span>
                      <span className="text-white font-bold text-lg tracking-wide">
                        0300-1234567
                      </span>
                    </div>
                    <div className="h-px bg-[#2A2A2A]" />
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-sm">
                        Account Name
                      </span>
                      <span className="text-white font-semibold">
                        Coach Raheel - Level Up
                      </span>
                    </div>
                    <div className="h-px bg-[#2A2A2A]" />

                    {/* QR Code Placeholder */}
                    <div className="flex justify-center py-2">
                      <div className="w-40 h-40 border-2 border-dashed border-[#2A2A2A] rounded-xl flex items-center justify-center">
                        <span className="text-white/30 text-sm font-medium">
                          QR Code
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-[#2A2A2A]" />
                    <div className="flex items-center justify-between">
                      <span className="text-white/50 text-sm">Amount</span>
                      <span className="text-[#E51A1A] font-black text-2xl">
                        &euro;79
                      </span>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl p-4">
                    <p className="text-[#FF6B00] text-sm font-medium">
                      Send payment to the EasyPaisa account above and upload a
                      screenshot of the transaction below.
                    </p>
                  </div>

                  {/* Screenshot Upload */}
                  <div>
                    <label className="block font-semibold text-sm text-white mb-2">
                      Payment Screenshot *
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {screenshot ? (
                      <div className="relative">
                        <img
                          src={screenshot}
                          alt="Payment screenshot"
                          className="w-full max-h-[300px] object-contain rounded-xl border border-[#2A2A2A]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setScreenshot(null);
                            setScreenshotName("");
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                          }}
                          className="absolute top-3 right-3 bg-[#0A0A0A]/80 text-white/60 hover:text-white w-8 h-8 rounded-full flex items-center justify-center text-lg cursor-pointer border-none"
                        >
                          x
                        </button>
                        <p className="text-white/40 text-xs mt-2">
                          {screenshotName}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-10 border-2 border-dashed border-[#2A2A2A] rounded-xl bg-[#1E1E1E] hover:border-[#E51A1A]/40 transition-colors cursor-pointer flex flex-col items-center gap-2"
                      >
                        <svg
                          className="w-8 h-8 text-white/30"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-white/40 text-sm font-medium">
                          Click to upload screenshot
                        </span>
                        <span className="text-white/20 text-xs">
                          JPG, PNG, or WebP (max 5MB)
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Account Name */}
                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Account Name Used for Payment *
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Name on your EasyPaisa account"
                      required
                      className={inputClass}
                    />
                  </div>

                  {/* Transaction Reference */}
                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Transaction Reference{" "}
                      <span className="text-white/30 font-normal">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. TXN123456789"
                      className={inputClass}
                    />
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    className={loading ? "opacity-60 pointer-events-none" : ""}
                  >
                    {loading ? "Submitting..." : "Submit Payment Proof"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("account");
                      setError("");
                    }}
                    className="w-full text-center mt-2 text-sm text-white/40 hover:text-white/60 cursor-pointer bg-transparent border-none"
                  >
                    &larr; Back to account details
                  </button>
                </form>
              )}

              <p className="text-center mt-8 text-white/50 text-sm">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[#E51A1A] font-semibold hover:underline"
                >
                  Log in
                </Link>
              </p>
            </div>

            {/* Right: Order Summary */}
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] p-9 rounded-2xl sticky top-[94px]">
              <h3 className="text-xl font-bold text-white mb-5">
                Order Summary
              </h3>
              <div className="flex justify-between py-3 border-b border-[#2A2A2A]">
                <span className="text-white/60">Hub Lifetime Access</span>
                <span className="text-white font-semibold">&euro;79</span>
              </div>
              <div className="flex justify-between pt-4 font-bold text-lg text-white">
                <span>Total</span>
                <span>&euro;79</span>
              </div>
              <div className="mt-6 bg-[#0A0A0A] rounded-xl p-4 border border-[#2A2A2A]">
                <p className="text-xs text-white/40 leading-relaxed">
                  One-time payment. No recurring fees. Lifetime access to all Hub
                  features including 400+ recipes, macro calculator, meal tracker,
                  progress tracking, and restaurant guides.
                </p>
              </div>
              <div className="mt-4 bg-[#FF6B00]/10 rounded-xl p-4 border border-[#FF6B00]/20">
                <p className="text-xs text-[#FF6B00] leading-relaxed font-medium">
                  Looking for coaching? Coaching plans require a separate
                  application.{" "}
                  <Link href="/coaching" className="underline">
                    Apply here
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
