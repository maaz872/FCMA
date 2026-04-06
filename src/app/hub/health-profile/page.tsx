"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FITNESS_GOALS = [
  { value: "fat_loss", label: "Fat Loss", desc: "Reduce body fat while preserving muscle" },
  { value: "muscle_gain", label: "Muscle Gain", desc: "Build lean muscle mass" },
  { value: "maintenance", label: "Maintenance", desc: "Maintain current physique" },
  { value: "recomposition", label: "Body Recomp", desc: "Lose fat and gain muscle simultaneously" },
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Lightly Active", desc: "1-3 days/week" },
  { value: "moderate", label: "Moderately Active", desc: "3-5 days/week" },
  { value: "active", label: "Very Active", desc: "6-7 days/week" },
  { value: "very_active", label: "Extremely Active", desc: "Physical job + exercise" },
];

const DIETARY_OPTIONS = ["Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", "Halal", "Keto", "None"];

export default function HealthProfilePage() {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [currentWeightKg, setCurrentWeightKg] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [targetWeightKg, setTargetWeightKg] = useState("");
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/user/dashboard").then((r) => r.json()),
    ])
      .then(([meData, dashData]) => {
        const u = meData.user;
        if (u) {
          if (u.age) setAge(String(u.age));
          if (u.gender) setGender(u.gender);
          if (u.heightCm) setHeightCm(String(u.heightCm));
          if (u.currentWeightKg) setCurrentWeightKg(String(u.currentWeightKg));
          if (u.bodyFatPercent) setBodyFatPercent(String(u.bodyFatPercent));
          if (u.fitnessGoal) setFitnessGoal(u.fitnessGoal);
          if (u.activityLevel) setActivityLevel(u.activityLevel);
          if (u.targetWeightKg) setTargetWeightKg(String(u.targetWeightKg));
          if (u.dietaryPrefs) {
            try { const p = JSON.parse(u.dietaryPrefs); if (Array.isArray(p)) setDietaryPrefs(p); } catch {}
          }
        }
        // Use latest weight from tracking if available
        if (dashData.weight?.latest) {
          setCurrentWeightKg(String(dashData.weight.latest));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function toggleDiet(pref: string) {
    setDietaryPrefs((prev) => {
      if (pref === "None") return ["None"];
      const without = prev.filter((p) => p !== "None");
      if (without.includes(pref)) return without.filter((p) => p !== pref);
      return [...without, pref];
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const payload: Record<string, unknown> = {};
      if (age) payload.age = parseInt(age);
      if (gender) payload.gender = gender;
      if (heightCm) payload.heightCm = parseFloat(heightCm);
      if (currentWeightKg) payload.currentWeightKg = parseFloat(currentWeightKg);
      if (bodyFatPercent) payload.bodyFatPercent = parseFloat(bodyFatPercent);
      if (fitnessGoal) payload.fitnessGoal = fitnessGoal;
      if (activityLevel) payload.activityLevel = activityLevel;
      if (targetWeightKg) payload.targetWeightKg = parseFloat(targetWeightKg);
      payload.dietaryPrefs = JSON.stringify(dietaryPrefs.length > 0 ? dietaryPrefs : []);

      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMsg("Profile saved successfully!");
      } else {
        const d = await res.json();
        setMsg(d.error || "Failed to save");
      }
    } catch {
      setMsg("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full py-3 px-4 border border-[#2A2A2A] rounded-xl bg-[#1E1E1E] focus:border-[#E51A1A] focus:outline-none transition-colors text-white text-sm";

  if (loading) return <div className="flex items-center justify-center h-64 text-white/30">Loading...</div>;

  return (
    <div className="max-w-[700px] w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">Health Profile</h1>
        <p className="text-white/40 text-sm mt-1">Keep your profile updated for accurate tracking and recommendations.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal Metrics */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">Personal Metrics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Age</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min={13} max={100} placeholder="e.g. 28" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Gender</label>
              <div className="flex gap-2">
                {["male", "female"].map((g) => (
                  <button key={g} type="button" onClick={() => setGender(g)}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all border-none cursor-pointer ${gender === g ? "bg-[#E51A1A] text-white" : "bg-[#0A0A0A] text-white/50 hover:text-white/70"}`}
                  >{g === "male" ? "Male" : "Female"}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Height (cm)</label>
              <input type="number" step="0.1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="e.g. 175.5" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Current Weight (kg)</label>
              <input type="number" step="0.1" value={currentWeightKg} onChange={(e) => setCurrentWeightKg(e.target.value)} placeholder="e.g. 82" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Body Fat % <span className="text-white/25">(optional)</span></label>
              <input type="number" step="0.1" value={bodyFatPercent} onChange={(e) => setBodyFatPercent(e.target.value)} placeholder="e.g. 18" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/50 mb-1.5">Target Weight (kg) <span className="text-white/25">(optional)</span></label>
              <input type="number" step="0.1" value={targetWeightKg} onChange={(e) => setTargetWeightKg(e.target.value)} placeholder="e.g. 75" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Fitness Goal */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">Fitness Goal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FITNESS_GOALS.map((g) => (
              <button key={g.value} type="button" onClick={() => setFitnessGoal(g.value)}
                className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${fitnessGoal === g.value ? "border-[#E51A1A] bg-[#E51A1A]/[0.08]" : "border-[#2A2A2A] bg-[#0A0A0A] hover:border-white/20"}`}
              >
                <p className={`text-sm font-semibold ${fitnessGoal === g.value ? "text-white" : "text-white/70"}`}>{g.label}</p>
                <p className="text-[11px] text-white/30 mt-0.5">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Level */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">Activity Level</h2>
          <div className="space-y-2">
            {ACTIVITY_LEVELS.map((a) => (
              <button key={a.value} type="button" onClick={() => setActivityLevel(a.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${activityLevel === a.value ? "border-[#E51A1A] bg-[#E51A1A]/[0.08]" : "border-[#2A2A2A] bg-[#0A0A0A] hover:border-white/20"}`}
              >
                <div>
                  <p className={`text-sm font-semibold ${activityLevel === a.value ? "text-white" : "text-white/70"}`}>{a.label}</p>
                  <p className="text-[11px] text-white/30">{a.desc}</p>
                </div>
                {activityLevel === a.value && <div className="w-2 h-2 rounded-full bg-[#E51A1A] flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Preferences */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-base font-bold text-white mb-4">Dietary Preferences</h2>
          <div className="flex flex-wrap gap-2">
            {DIETARY_OPTIONS.map((d) => (
              <button key={d} type="button" onClick={() => toggleDiet(d)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${dietaryPrefs.includes(d) ? "bg-[#E51A1A] text-white border-[#E51A1A]" : "bg-transparent text-white/50 border-[#2A2A2A] hover:text-white/70 hover:border-white/20"}`}
              >{d}</button>
            ))}
          </div>
        </div>

        {/* Save */}
        {msg && (
          <p className={`text-sm font-semibold ${msg.includes("success") ? "text-green-400" : "text-[#E51A1A]"}`}>{msg}</p>
        )}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={saving}
            className="px-8 py-3 bg-[#E51A1A] text-white font-bold rounded-xl hover:bg-[#C41010] transition-colors cursor-pointer border-none disabled:opacity-50 text-sm"
          >{saving ? "Saving..." : "Save Profile"}</button>
          <Link href="/hub/calculator" className="text-sm text-[#E51A1A] hover:underline">
            Calculate my macros →
          </Link>
        </div>
      </form>
    </div>
  );
}
