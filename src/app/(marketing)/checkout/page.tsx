"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Button from "@/components/ui/Button";
import PasswordInput from "@/components/ui/PasswordInput";
import { useBranding, BrandingProvider } from "@/lib/branding";

type Step = "account" | "health" | "payment" | "success";

const FITNESS_GOALS = [
  { value: "FAT_LOSS", label: "Fat Loss" },
  { value: "MUSCLE_GAIN", label: "Muscle Gain" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "BODY_RECOMP", label: "Body Recomposition" },
];

const ACTIVITY_LEVELS = [
  { value: "SEDENTARY", label: "Sedentary" },
  { value: "LIGHTLY_ACTIVE", label: "Lightly Active" },
  { value: "MODERATELY_ACTIVE", label: "Moderately Active" },
  { value: "VERY_ACTIVE", label: "Very Active" },
  { value: "EXTREMELY_ACTIVE", label: "Extremely Active" },
];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Halal",
  "Keto",
  "None",
];

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[#E51A1A] border-t-transparent rounded-full animate-spin" /></div>}>
      <CheckoutRouter />
    </Suspense>
  );
}

function CheckoutRouter() {
  const searchParams = useSearchParams();
  const coachCode = searchParams.get("coach") || "";

  if (!coachCode) {
    return <InviteGate />;
  }
  // Wrap in a nested BrandingProvider so the checkout shows the coach's branding
  return (
    <BrandingProvider coachCode={coachCode}>
      <CheckoutContent coachCode={coachCode} />
    </BrandingProvider>
  );
}

function InviteGate() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter an invite code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/auth/validate-invite?code=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setError(data.error || "Invalid invite code. Please check and try again.");
        setLoading(false);
        return;
      }
      // Valid — hard-navigate so the server re-renders with the new searchParams.
      // router.replace to the same pathname doesn't reliably re-trigger
      // useSearchParams() in the parent CheckoutRouter under Next.js 16 + Turbopack.
      window.location.assign(`/checkout?coach=${encodeURIComponent(trimmed)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-24 px-6">
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-8">
        <h1 className="text-2xl font-bold text-white mb-3 text-center">Enter Invite Code</h1>
        <p className="text-white/50 mb-6 leading-relaxed text-center text-sm">
          Enter the invite code provided by your coach to begin registration.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            placeholder="e.g. coach-raheel"
            autoFocus
            disabled={loading}
            className="w-full py-3 px-4 border-2 border-[#2A2A2A] rounded-xl text-base bg-[#0A0A0A] text-white placeholder:text-white/30 focus:border-[#E51A1A] focus:outline-none transition-colors disabled:opacity-50"
          />

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full py-3 bg-[#E51A1A] text-white rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border-none"
          >
            {loading ? "Validating..." : "Continue"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#2A2A2A] text-center">
          <p className="text-white/30 text-xs mb-2">
            Don&apos;t have an invite code? Contact your coach for one.
          </p>
          <Link href="/login" className="text-[#E51A1A] font-semibold text-sm hover:underline">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </div>
  );
}

function CheckoutContent({ coachCode }: { coachCode: string }) {
  const [step, setStep] = useState<Step>("account");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { siteName, coachName } = useBranding();

  // Account form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Health profile state
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [currentWeightKg, setCurrentWeightKg] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

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

    setStep("health");
  }

  function handleHealthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const ageNum = parseInt(age);
    if (!age || isNaN(ageNum) || ageNum < 15 || ageNum > 80) {
      setError("Please enter a valid age between 15 and 80");
      return;
    }
    if (!gender) {
      setError("Please select your gender");
      return;
    }
    if (!heightCm || parseFloat(heightCm) <= 0) {
      setError("Please enter your height in cm");
      return;
    }
    if (!currentWeightKg || parseFloat(currentWeightKg) <= 0) {
      setError("Please enter your current weight in kg");
      return;
    }
    if (!fitnessGoal) {
      setError("Please select your fitness goal");
      return;
    }
    if (!activityLevel) {
      setError("Please select your activity level");
      return;
    }

    setStep("payment");
  }

  function toggleDietaryPref(pref: string) {
    if (pref === "None") {
      setDietaryPrefs((prev) => (prev.includes("None") ? [] : ["None"]));
      return;
    }
    setDietaryPrefs((prev) => {
      const without = prev.filter((p) => p !== "None");
      return without.includes(pref)
        ? without.filter((p) => p !== pref)
        : [...without, pref];
    });
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
      // Step 1: Register account with health profile
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
          coachCode,
          age,
          gender,
          heightCm,
          currentWeightKg,
          fitnessGoal,
          activityLevel,
          targetWeightKg: targetWeightKg || undefined,
          dietaryPrefs:
            dietaryPrefs.length > 0 ? JSON.stringify(dietaryPrefs) : undefined,
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

  const stepLabels = ["Account", "Health Profile", "Payment", "Done"];
  const stepKeys: Step[] = ["account", "health", "payment", "success"];

  return (
    <section className="bg-[#0A0A0A] py-15 min-h-screen">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {stepLabels.map((label, i) => {
            const isActive = stepKeys.indexOf(step) >= i;
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
                {i < stepLabels.length - 1 && (
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
              Your payment proof has been submitted. {coachName} will review
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
                    <PasswordInput
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
                    <PasswordInput
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
                    Continue
                  </Button>
                </form>
              )}

              {step === "health" && (
                <form onSubmit={handleHealthSubmit} className="space-y-5">
                  <h2 className="text-2xl font-black text-white mb-2">
                    Tell us about yourself
                  </h2>
                  <p className="text-white/50 text-sm mb-6">
                    This helps us personalize your experience. You can update
                    this later in Settings.
                  </p>

                  {error && (
                    <div className="bg-[#E51A1A]/10 border border-[#E51A1A]/20 text-[#E51A1A] px-4 py-3 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  {/* Age & Gender row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-sm text-white mb-1.5">
                        Age *
                      </label>
                      <input
                        type="number"
                        min={15}
                        max={80}
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 25"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-sm text-white mb-1.5">
                        Gender *
                      </label>
                      <div className="flex gap-2 mt-0.5">
                        {["Male", "Female"].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g.toUpperCase())}
                            className={`flex-1 py-3.5 rounded-xl text-sm font-semibold border-2 transition-colors cursor-pointer ${
                              gender === g.toUpperCase()
                                ? "bg-[#E51A1A] border-[#E51A1A] text-white"
                                : "bg-[#1E1E1E] border-[#2A2A2A] text-white/50 hover:border-white/20"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Height & Current Weight */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-sm text-white mb-1.5">
                        Height (cm) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min={100}
                        max={250}
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        placeholder="e.g. 175.5"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-sm text-white mb-1.5">
                        Current Weight (kg) *
                      </label>
                      <input
                        type="number"
                        min={30}
                        max={300}
                        step="0.1"
                        value={currentWeightKg}
                        onChange={(e) => setCurrentWeightKg(e.target.value)}
                        placeholder="e.g. 80"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Fitness Goal */}
                  <div>
                    <label className="block font-semibold text-sm text-white mb-2">
                      Fitness Goal *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {FITNESS_GOALS.map((goal) => (
                        <button
                          key={goal.value}
                          type="button"
                          onClick={() => setFitnessGoal(goal.value)}
                          className={`py-3.5 px-4 rounded-xl text-sm font-semibold border-2 transition-colors cursor-pointer text-left ${
                            fitnessGoal === goal.value
                              ? "bg-[#E51A1A] border-[#E51A1A] text-white"
                              : "bg-[#1E1E1E] border-[#2A2A2A] text-white/50 hover:border-white/20"
                          }`}
                        >
                          {goal.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Activity Level */}
                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Activity Level *
                    </label>
                    <select
                      value={activityLevel}
                      onChange={(e) => setActivityLevel(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select activity level</option>
                      {ACTIVITY_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Weight (optional) */}
                  <div>
                    <label className="block font-semibold text-sm text-white mb-1.5">
                      Target Weight (kg){" "}
                      <span className="text-white/30 font-normal">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min={30}
                      max={300}
                      step="0.1"
                      value={targetWeightKg}
                      onChange={(e) => setTargetWeightKg(e.target.value)}
                      placeholder="e.g. 75"
                      className={inputClass}
                    />
                  </div>

                  {/* Dietary Preferences (optional multi-select chips) */}
                  <div>
                    <label className="block font-semibold text-sm text-white mb-2">
                      Dietary Preferences{" "}
                      <span className="text-white/30 font-normal">(optional)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DIETARY_OPTIONS.map((pref) => (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => toggleDietaryPref(pref)}
                          className={`py-2 px-4 rounded-full text-sm font-medium border-2 transition-colors cursor-pointer ${
                            dietaryPrefs.includes(pref)
                              ? "bg-[#E51A1A] border-[#E51A1A] text-white"
                              : "bg-[#1E1E1E] border-[#2A2A2A] text-white/50 hover:border-white/20"
                          }`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button type="submit" fullWidth>
                    Continue to Payment
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("account");
                      setError("");
                    }}
                    className="w-full text-center mt-2 text-sm text-white/40 hover:text-white/60 cursor-pointer bg-transparent border-none"
                  >
                    &larr; Back
                  </button>
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
                        {coachName} - {siteName}
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
                      setStep("health");
                      setError("");
                    }}
                    className="w-full text-center mt-2 text-sm text-white/40 hover:text-white/60 cursor-pointer bg-transparent border-none"
                  >
                    &larr; Back to health profile
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
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
