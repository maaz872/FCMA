"use client";

import { useState } from "react";

type Gender = "male" | "female";
type Goal = "lose" | "maintain" | "build";
type Intensity = "slow" | "moderate" | "aggressive";
type HeightUnit = "cm" | "ft";
type WeightUnit = "kg" | "lbs";

interface Results {
  bmr: number;
  tdee: number;
  targetCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  formulaUsed: string;
  activityMultiplier: number;
  adjustment: number;
}

const ACTIVITY_LEVELS = [
  { label: "Sedentary", multiplier: 1.2, desc: "Little or no exercise" },
  { label: "Lightly Active", multiplier: 1.375, desc: "Light exercise 1-3 days/week" },
  { label: "Moderately Active", multiplier: 1.55, desc: "Moderate exercise 3-5 days/week" },
  { label: "Very Active", multiplier: 1.725, desc: "Hard exercise 6-7 days/week" },
  { label: "Extremely Active", multiplier: 1.9, desc: "Very hard exercise, physical job" },
];

const GOAL_ADJUSTMENTS: Record<Goal, Record<Intensity, number>> = {
  lose: { slow: -300, moderate: -500, aggressive: -750 },
  maintain: { slow: 0, moderate: 0, aggressive: 0 },
  build: { slow: 200, moderate: 350, aggressive: 500 },
};

const MACRO_SPLITS: Record<Goal, { protein: number; carbs: number; fat: number }> = {
  lose: { protein: 0.4, carbs: 0.35, fat: 0.25 },
  maintain: { protein: 0.3, carbs: 0.4, fat: 0.3 },
  build: { protein: 0.3, carbs: 0.45, fat: 0.25 },
};

function DonutChart({
  proteinPct,
  carbsPct,
  fatPct,
}: {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}) {
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const proteinLen = (proteinPct / 100) * circumference;
  const carbsLen = (carbsPct / 100) * circumference;
  const fatLen = (fatPct / 100) * circumference;

  const proteinOffset = 0;
  const carbsOffset = -proteinLen;
  const fatOffset = -(proteinLen + carbsLen);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#2A2A2A"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#FFB800"
        strokeWidth={strokeWidth}
        strokeDasharray={`${fatLen} ${circumference - fatLen}`}
        strokeDashoffset={fatOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#FF6B00"
        strokeWidth={strokeWidth}
        strokeDasharray={`${carbsLen} ${circumference - carbsLen}`}
        strokeDashoffset={carbsOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#E51A1A"
        strokeWidth={strokeWidth}
        strokeDasharray={`${proteinLen} ${circumference - proteinLen}`}
        strokeDashoffset={proteinOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export default function CalculatorPage() {
  const [gender, setGender] = useState<Gender>("male");
  const [age, setAge] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightUnit, setHeightUnit] = useState<HeightUnit>("cm");
  const [weightVal, setWeightVal] = useState("");
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
  const [bodyFat, setBodyFat] = useState("");
  const [activityIdx, setActivityIdx] = useState(2);
  const [goal, setGoal] = useState<Goal>("maintain");
  const [intensity, setIntensity] = useState<Intensity>("moderate");
  const [results, setResults] = useState<Results | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const ageNum = Number(age);
    if (!age || ageNum < 15 || ageNum > 80)
      errs.age = "Age must be between 15 and 80";

    if (heightUnit === "cm") {
      const h = Number(heightCm);
      if (!heightCm || h < 100 || h > 250)
        errs.height = "Height must be between 100 and 250 cm";
    } else {
      const ft = Number(heightFt);
      const inches = Number(heightIn) || 0;
      const totalCm = ft * 30.48 + inches * 2.54;
      if (!heightFt || totalCm < 100 || totalCm > 250)
        errs.height = 'Height must be between 3\'3" and 8\'2"';
    }

    if (weightUnit === "kg") {
      const w = Number(weightVal);
      if (!weightVal || w < 30 || w > 300)
        errs.weight = "Weight must be between 30 and 300 kg";
    } else {
      const wKg = Number(weightVal) * 0.4536;
      if (!weightVal || wKg < 30 || wKg > 300)
        errs.weight = "Weight must be between 66 and 661 lbs";
    }

    if (bodyFat) {
      const bf = Number(bodyFat);
      if (bf < 3 || bf > 60) errs.bodyFat = "Body fat must be between 3% and 60%";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function calculate() {
    if (!validate()) return;

    const ageNum = Number(age);
    const weightKg =
      weightUnit === "kg" ? Number(weightVal) : Number(weightVal) * 0.4536;
    const heightCmVal =
      heightUnit === "cm"
        ? Number(heightCm)
        : Number(heightFt) * 30.48 + (Number(heightIn) || 0) * 2.54;

    const bodyFatNum = bodyFat ? Number(bodyFat) : null;
    let bmr: number;
    let formulaUsed: string;

    if (bodyFatNum !== null) {
      // Katch-McArdle
      const lbm = weightKg * (1 - bodyFatNum / 100);
      bmr = 370 + 21.6 * lbm;
      formulaUsed = "Katch-McArdle";
    } else {
      // Mifflin-St Jeor
      bmr =
        gender === "male"
          ? 10 * weightKg + 6.25 * heightCmVal - 5 * ageNum + 5
          : 10 * weightKg + 6.25 * heightCmVal - 5 * ageNum - 161;
      formulaUsed = "Mifflin-St Jeor";
    }

    const activityMultiplier = ACTIVITY_LEVELS[activityIdx].multiplier;
    const tdee = bmr * activityMultiplier;
    const adjustment = GOAL_ADJUSTMENTS[goal][intensity];
    const targetCalories = Math.round(tdee + adjustment);

    const split = MACRO_SPLITS[goal];

    let proteinGrams: number;
    let carbsGrams: number;
    let fatGrams: number;

    if (bodyFatNum !== null) {
      // Use LBM-based protein
      const lbm = weightKg * (1 - bodyFatNum / 100);
      proteinGrams = Math.round(2.0 * lbm);
      const proteinCal = proteinGrams * 4;
      const remainingCal = targetCalories - proteinCal;
      // Split remaining between carbs and fat based on goal ratios (excluding protein)
      const carbsRatio = split.carbs / (split.carbs + split.fat);
      const fatRatio = split.fat / (split.carbs + split.fat);
      carbsGrams = Math.round((remainingCal * carbsRatio) / 4);
      fatGrams = Math.round((remainingCal * fatRatio) / 9);
    } else {
      const proteinCal = targetCalories * split.protein;
      const carbsCal = targetCalories * split.carbs;
      const fatCal = targetCalories * split.fat;
      proteinGrams = Math.round(proteinCal / 4);
      carbsGrams = Math.round(carbsCal / 4);
      fatGrams = Math.round(fatCal / 9);
    }

    const totalCal = proteinGrams * 4 + carbsGrams * 4 + fatGrams * 9;
    const proteinPct = Math.round((proteinGrams * 4 / totalCal) * 100);
    const carbsPct = Math.round((carbsGrams * 4 / totalCal) * 100);
    const fatPct = 100 - proteinPct - carbsPct;

    setResults({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      targetCalories,
      protein: proteinGrams,
      carbs: carbsGrams,
      fat: fatGrams,
      proteinPct,
      carbsPct,
      fatPct,
      formulaUsed,
      activityMultiplier,
      adjustment,
    });
    setSaved(false);
  }

  function handleRecalculate() {
    setResults(null);
    setSaved(false);
    setAdvancedOpen(false);
  }

  async function handleSave() {
    if (!results) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user/macro-targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calories: results.targetCalories,
          protein: results.protein,
          carbs: results.carbs,
          fat: results.fat,
          goal,
        }),
      });
      if (res.ok) {
        setSaved(true);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  const goalLabels: Record<Goal, string> = {
    lose: "Lose Weight",
    maintain: "Maintain",
    build: "Build Muscle",
  };

  const goalDescriptions: Record<Goal, string> = {
    lose: "We've set a calorie deficit to support steady fat loss while preserving muscle. The higher protein ratio helps maintain lean mass during your cut.",
    maintain:
      "These targets are designed to keep your weight stable. The balanced macro split supports everyday performance and recovery.",
    build: "We've added a calorie surplus to fuel muscle growth. The carb-heavy split supports training intensity and recovery.",
  };

  return (
    <div>
      <h1 className="text-3xl font-black text-white mb-2">
        Calorie & Macro Calculator
      </h1>
      <p className="text-white/50 mb-8">
        Get personalised calorie and macro targets based on your body stats and
        goals.
      </p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* INPUT FORM */}
        {!results && (
          <div className="flex-1">
            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8">
              {/* Gender */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-white mb-2">
                  Gender
                </label>
                <div className="flex gap-2">
                  {(["male", "female"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors cursor-pointer border-2 ${
                        gender === g
                          ? "bg-[#E51A1A] text-white border-[#E51A1A]"
                          : "bg-[#1E1E1E] text-white/60 border-[#2A2A2A] hover:border-[#E51A1A]/50"
                      }`}
                    >
                      {g === "male" ? "Male" : "Female"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-white mb-2">
                  Age
                </label>
                <input
                  type="number"
                  placeholder="e.g. 25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full border-2 border-[#2A2A2A] rounded-xl py-3 px-4 focus:border-[#E51A1A] focus:outline-none bg-[#1E1E1E] text-white placeholder:text-white/30"
                />
                {errors.age && (
                  <p className="text-red-500 text-xs mt-1">{errors.age}</p>
                )}
              </div>

              {/* Height */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-white">Height</label>
                  <div className="flex gap-1 bg-[#0A0A0A] rounded-lg p-0.5">
                    {(["cm", "ft"] as HeightUnit[]).map((u) => (
                      <button
                        key={u}
                        onClick={() => setHeightUnit(u)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border-none ${
                          heightUnit === u
                            ? "bg-[#E51A1A] text-white"
                            : "text-white/50 hover:text-white"
                        }`}
                      >
                        {u === "cm" ? "cm" : "ft/in"}
                      </button>
                    ))}
                  </div>
                </div>
                {heightUnit === "cm" ? (
                  <input
                    type="number"
                    placeholder="e.g. 175"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full border-2 border-[#2A2A2A] rounded-xl py-3 px-4 focus:border-[#E51A1A] focus:outline-none bg-[#1E1E1E] text-white placeholder:text-white/30"
                  />
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="ft"
                      value={heightFt}
                      onChange={(e) => setHeightFt(e.target.value)}
                      className="flex-1 border-2 border-[#2A2A2A] rounded-xl py-3 px-4 focus:border-[#E51A1A] focus:outline-none bg-[#1E1E1E] text-white placeholder:text-white/30"
                    />
                    <input
                      type="number"
                      placeholder="in"
                      value={heightIn}
                      onChange={(e) => setHeightIn(e.target.value)}
                      className="flex-1 border-2 border-[#2A2A2A] rounded-xl py-3 px-4 focus:border-[#E51A1A] focus:outline-none bg-[#1E1E1E] text-white placeholder:text-white/30"
                    />
                  </div>
                )}
                {errors.height && (
                  <p className="text-red-500 text-xs mt-1">{errors.height}</p>
                )}
              </div>

              {/* Weight */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-white">Weight</label>
                  <div className="flex gap-1 bg-[#0A0A0A] rounded-lg p-0.5">
                    {(["kg", "lbs"] as WeightUnit[]).map((u) => (
                      <button
                        key={u}
                        onClick={() => setWeightUnit(u)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border-none ${
                          weightUnit === u
                            ? "bg-[#E51A1A] text-white"
                            : "text-white/50 hover:text-white"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  placeholder={weightUnit === "kg" ? "e.g. 75" : "e.g. 165"}
                  value={weightVal}
                  onChange={(e) => setWeightVal(e.target.value)}
                  className="w-full border-2 border-[#2A2A2A] rounded-xl py-3 px-4 focus:border-[#E51A1A] focus:outline-none bg-[#1E1E1E] text-white placeholder:text-white/30"
                />
                {errors.weight && (
                  <p className="text-red-500 text-xs mt-1">{errors.weight}</p>
                )}
              </div>

              {/* Body Fat % (optional) */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-white mb-2">
                  Body Fat %{" "}
                  <span className="text-white/30 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g. 18"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  className="w-full border-2 border-[#2A2A2A] rounded-xl py-3 px-4 focus:border-[#E51A1A] focus:outline-none bg-[#1E1E1E] text-white placeholder:text-white/30"
                />
                <p className="text-xs text-white/30 mt-1">
                  Optional — provides more accurate results using the
                  Katch-McArdle formula
                </p>
                {errors.bodyFat && (
                  <p className="text-red-500 text-xs mt-1">{errors.bodyFat}</p>
                )}
              </div>

              {/* Activity Level */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-white mb-2">
                  Activity Level
                </label>
                <div className="space-y-2">
                  {ACTIVITY_LEVELS.map((level, idx) => (
                    <button
                      key={level.label}
                      onClick={() => setActivityIdx(idx)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors cursor-pointer ${
                        activityIdx === idx
                          ? "border-[#E51A1A] bg-[#E51A1A]/5"
                          : "border-[#2A2A2A] bg-[#1E1E1E] hover:border-[#2A2A2A]"
                      }`}
                    >
                      <p
                        className={`font-semibold text-sm ${
                          activityIdx === idx ? "text-[#E51A1A]" : "text-white"
                        }`}
                      >
                        {level.label}
                      </p>
                      <p className="text-xs text-white/40">{level.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-white mb-2">
                  Goal
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["lose", "maintain", "build"] as Goal[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGoal(g)}
                      className={`py-3 px-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer border-2 ${
                        goal === g
                          ? "bg-[#E51A1A] text-white border-[#E51A1A]"
                          : "bg-[#1E1E1E] text-white/60 border-[#2A2A2A] hover:border-[#E51A1A]/50"
                      }`}
                    >
                      {goalLabels[g]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Intensity */}
              {goal !== "maintain" && (
                <div className="mb-6">
                  <label className="block text-sm font-bold text-white mb-2">
                    {goal === "lose" ? "Deficit" : "Surplus"} Intensity
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["slow", "moderate", "aggressive"] as Intensity[]).map(
                      (i) => (
                        <button
                          key={i}
                          onClick={() => setIntensity(i)}
                          className={`py-3 px-2 rounded-xl font-semibold text-sm transition-colors cursor-pointer border-2 capitalize ${
                            intensity === i
                              ? "bg-[#E51A1A] text-white border-[#E51A1A]"
                              : "bg-[#1E1E1E] text-white/60 border-[#2A2A2A] hover:border-[#E51A1A]/50"
                          }`}
                        >
                          {i}
                        </button>
                      )
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1">
                    {goal === "lose" ? "Deficit" : "Surplus"}:{" "}
                    {Math.abs(GOAL_ADJUSTMENTS[goal][intensity])} kcal/day
                  </p>
                </div>
              )}

              {/* Calculate Button */}
              <button
                onClick={calculate}
                className="w-full bg-[#E51A1A] hover:bg-[#C41616] text-white font-bold py-4 rounded-xl transition-colors cursor-pointer text-base border-none"
              >
                Calculate
              </button>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {results && (
          <div className="flex-1">
            {/* Recalculate button */}
            <button
              onClick={handleRecalculate}
              className="mb-6 px-6 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer border-2 border-white/20 bg-transparent text-white hover:border-white/40"
            >
              &larr; Recalculate
            </button>

            <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 sm:p-8">
              {/* Target Calories */}
              <div className="text-center mb-8">
                <p className="text-sm font-semibold text-white/40 uppercase tracking-wide mb-1">
                  Your Daily Target
                </p>
                <p className="text-5xl font-black text-white">
                  {results.targetCalories.toLocaleString()}
                </p>
                <p className="text-white/40 font-medium">kcal / day</p>
              </div>

              {/* Macro Cards */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <div className="bg-[#E51A1A]/10 border border-[#E51A1A]/20 rounded-xl p-4 text-center">
                  <div className="w-3 h-3 rounded-full bg-[#E51A1A] mx-auto mb-2" />
                  <p className="text-2xl font-black text-white">
                    {results.protein}g
                  </p>
                  <p className="text-xs font-semibold text-white/40">
                    Protein
                  </p>
                  <p className="text-xs text-white/30 mt-1">
                    {results.proteinPct}%
                  </p>
                </div>
                <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-xl p-4 text-center">
                  <div className="w-3 h-3 rounded-full bg-[#FF6B00] mx-auto mb-2" />
                  <p className="text-2xl font-black text-white">
                    {results.carbs}g
                  </p>
                  <p className="text-xs font-semibold text-white/40">Carbs</p>
                  <p className="text-xs text-white/30 mt-1">
                    {results.carbsPct}%
                  </p>
                </div>
                <div className="bg-[#FFB800]/10 border border-[#FFB800]/20 rounded-xl p-4 text-center">
                  <div className="w-3 h-3 rounded-full bg-[#FFB800] mx-auto mb-2" />
                  <p className="text-2xl font-black text-white">
                    {results.fat}g
                  </p>
                  <p className="text-xs font-semibold text-white/40">Fat</p>
                  <p className="text-xs text-white/30 mt-1">
                    {results.fatPct}%
                  </p>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="mb-8">
                <DonutChart
                  proteinPct={results.proteinPct}
                  carbsPct={results.carbsPct}
                  fatPct={results.fatPct}
                />
                <div className="flex items-center justify-center gap-4 mt-4">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E51A1A] inline-block" />{" "}
                    Protein {results.proteinPct}%
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] inline-block" />{" "}
                    Carbs {results.carbsPct}%
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800] inline-block" />{" "}
                    Fat {results.fatPct}%
                  </span>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="overflow-x-auto mb-8">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A]">
                      <th className="text-left py-2 font-semibold text-white/60">
                        Macro
                      </th>
                      <th className="text-right py-2 font-semibold text-white/60">
                        Grams
                      </th>
                      <th className="text-right py-2 font-semibold text-white/60">
                        Calories
                      </th>
                      <th className="text-right py-2 font-semibold text-white/60">
                        %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="text-white">
                    <tr className="border-b border-[#1A1A1A]">
                      <td className="py-2 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#E51A1A] inline-block" />{" "}
                        Protein
                      </td>
                      <td className="text-right py-2">{results.protein}g</td>
                      <td className="text-right py-2">
                        {results.protein * 4}
                      </td>
                      <td className="text-right py-2">{results.proteinPct}%</td>
                    </tr>
                    <tr className="border-b border-[#1A1A1A]">
                      <td className="py-2 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FF6B00] inline-block" />{" "}
                        Carbs
                      </td>
                      <td className="text-right py-2">{results.carbs}g</td>
                      <td className="text-right py-2">{results.carbs * 4}</td>
                      <td className="text-right py-2">{results.carbsPct}%</td>
                    </tr>
                    <tr className="border-b border-[#1A1A1A]">
                      <td className="py-2 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#FFB800] inline-block" />{" "}
                        Fat
                      </td>
                      <td className="text-right py-2">{results.fat}g</td>
                      <td className="text-right py-2">{results.fat * 9}</td>
                      <td className="text-right py-2">{results.fatPct}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Advanced Section (expandable) */}
              <div className="mb-6">
                <button
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="flex items-center gap-2 text-sm font-semibold text-white/60 hover:text-white transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  <span
                    className="transition-transform inline-block"
                    style={{
                      transform: advancedOpen
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    &#9654;
                  </span>
                  Advanced Breakdown
                </button>
                {advancedOpen && (
                  <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-4 mt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">
                        Basal Metabolic Rate (BMR)
                      </span>
                      <span className="font-bold text-white">
                        {results.bmr} kcal
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">
                        Total Daily Energy Expenditure (TDEE)
                      </span>
                      <span className="font-bold text-white">
                        {results.tdee} kcal
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Formula Used</span>
                      <span className="font-bold text-white">
                        {results.formulaUsed}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">Activity Multiplier</span>
                      <span className="font-bold text-white">
                        x{results.activityMultiplier}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white/50">
                        {results.adjustment >= 0
                          ? "Surplus"
                          : "Deficit"}
                      </span>
                      <span className="font-bold text-white">
                        {results.adjustment > 0 ? "+" : ""}
                        {results.adjustment} kcal
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Explanation */}
              <p className="text-sm text-white/50 leading-relaxed mb-6">
                {goalDescriptions[goal]}
              </p>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-4 rounded-xl font-bold text-sm transition-colors cursor-pointer border-2 mb-3 ${
                  saved
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-[#E51A1A] text-white border-[#E51A1A] hover:bg-[#C41616]"
                }`}
              >
                {saving
                  ? "Saving..."
                  : saved
                  ? "Saved!"
                  : "Save to My Profile"}
              </button>
              {saved && (
                <p className="text-sm text-green-400 text-center">
                  Targets saved! Your Hub dashboard will now track your daily
                  progress against these goals.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
