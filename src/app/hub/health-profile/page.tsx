"use client";

import { useEffect, useState } from "react";
import { fetchWithRetry } from "@/lib/fetch-retry";

export default function HealthProfilePage() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithRetry("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-white/30">Loading...</div>;

  if (!user) return <div className="text-center py-12 text-white/40">Failed to load profile</div>;

  const fields = [
    { label: "Name", value: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—" },
    { label: "Email", value: (user.email as string) || "—" },
    { label: "Country", value: (user.country as string) || "—" },
    { label: "Age", value: user.age ? `${user.age} years` : "—" },
    { label: "Gender", value: user.gender ? (user.gender as string).charAt(0).toUpperCase() + (user.gender as string).slice(1) : "—" },
    { label: "Height", value: user.heightCm ? `${user.heightCm} cm` : "—" },
    { label: "Current Weight", value: user.currentWeightKg ? `${user.currentWeightKg} kg` : "—" },
    { label: "Target Weight", value: user.targetWeightKg ? `${user.targetWeightKg} kg` : "—" },
  ];

  return (
    <div className="max-w-[600px] w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Health Profile</h1>
        <p className="text-white/40 text-sm mt-1">Your profile is managed by your coach.</p>
      </div>

      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        {fields.map((f, i) => (
          <div key={f.label} className={`flex items-center justify-between px-5 py-4 ${i < fields.length - 1 ? "border-b border-[#2A2A2A]" : ""}`}>
            <span className="text-sm text-white/50">{f.label}</span>
            <span className="text-sm font-semibold text-white">{f.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
