"use client";

import { useState, useEffect } from "react";
import { fetchWithRetry } from "@/lib/fetch-retry";

interface Target {
  id: number;
  metric: string;
  targetValue: number;
  currentValue: number | null;
}

const METRIC_INFO: Record<string, { label: string; unit: string; icon: string; lowerBetter: boolean }> = {
  weight:   { label: "Weight",   unit: "kg",    icon: "⚖️",  lowerBetter: true },
  belly:    { label: "Belly",    unit: "in",    icon: "📏",  lowerBetter: true },
  waist:    { label: "Waist",    unit: "in",    icon: "📐",  lowerBetter: true },
  chest:    { label: "Chest",    unit: "in",    icon: "💪",  lowerBetter: false },
  hips:     { label: "Hips",     unit: "in",    icon: "🦵",  lowerBetter: false },
  arms:     { label: "Arms",     unit: "in",    icon: "💪",  lowerBetter: false },
  steps:    { label: "Steps",    unit: "steps", icon: "👟",  lowerBetter: false },
};

function getPercent(metric: string, current: number | null, target: number): number {
  if (!current || target === 0) return 0;
  const info = METRIC_INFO[metric];
  if (info?.lowerBetter) {
    if (current <= target) return 100;
    return Math.min(100, Math.round((target / current) * 100));
  }
  return Math.min(100, Math.round((current / target) * 100));
}

function getColor(pct: number): string {
  if (pct >= 90) return "#22C55E";
  if (pct >= 50) return "#FF6B00";
  return "#E51A1A";
}

export default function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithRetry("/api/user/targets")
      .then(r => r.json())
      .then(d => setTargets(d.targets || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-black text-white mb-6">My Targets</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 animate-pulse">
              <div className="h-4 bg-[#2A2A2A] rounded w-24 mb-3" />
              <div className="h-8 bg-[#2A2A2A] rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Build full metric list — show all 8 metrics, highlight active ones
  const allMetrics = Object.entries(METRIC_INFO).map(([key, info]) => {
    const target = targets.find(t => t.metric === key);
    return { key, ...info, target };
  });

  const activeTargets = allMetrics.filter(m => m.target);
  const inactiveMetrics = allMetrics.filter(m => !m.target);

  return (
    <div>
      <h1 className="text-3xl font-black text-white mb-2">My Targets</h1>
      <p className="text-white/50 text-sm mb-6">Your targets set by your coach</p>

      {activeTargets.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4 text-2xl">🎯</div>
          <h2 className="text-xl font-bold text-white mb-2">No targets set yet</h2>
          <p className="text-white/50">Your coach will assign targets for you soon.</p>
        </div>
      ) : (
        <>
          {/* Active targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {activeTargets.map(m => {
              const t = m.target!;
              const pct = getPercent(m.key, t.currentValue, t.targetValue);
              const color = getColor(pct);
              const r = 38;
              const c = Math.PI * 2 * r;
              const offset = c - (c * pct / 100);

              return (
                <div key={m.key} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
                  <div className="flex items-center gap-4">
                    {/* Progress ring */}
                    <div className="relative shrink-0">
                      <svg width={90} height={90}>
                        <circle cx={45} cy={45} r={r} fill="none" stroke="#2A2A2A" strokeWidth={5} />
                        <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={5}
                          strokeDasharray={c} strokeDashoffset={offset}
                          strokeLinecap="round" transform="rotate(-90 45 45)" className="transition-all duration-700" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-black" style={{ color }}>{pct}%</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{m.icon}</span>
                        <span className="text-sm font-bold text-white">{m.label}</span>
                      </div>
                      {t.currentValue !== null ? (
                        <p className="text-white/60 text-sm">
                          <span className="text-white font-semibold">{t.currentValue}</span>
                          <span className="text-white/30 mx-1">/</span>
                          <span>{t.targetValue} {m.unit}</span>
                        </p>
                      ) : (
                        <p className="text-white/40 text-sm">
                          Target: {t.targetValue} {m.unit}
                        </p>
                      )}
                      {m.lowerBetter && (
                        <p className="text-[10px] text-white/20 mt-0.5">Lower is better</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inactive metrics */}
          {inactiveMetrics.length > 0 && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wide mb-3">Not targeted this week</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {inactiveMetrics.map(m => (
                  <div key={m.key} className="bg-[#1E1E1E]/50 border border-[#2A2A2A]/50 rounded-xl p-3 text-center opacity-40">
                    <span className="text-lg">{m.icon}</span>
                    <p className="text-[10px] text-white/40 mt-1">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
