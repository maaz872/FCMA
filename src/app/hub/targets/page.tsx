"use client";

import { useState, useEffect } from "react";
import { fetchWithRetry } from "@/lib/fetch-retry";

interface Target {
  id: number;
  metric: string;
  targetValue: number;
  currentValue: number | null;
}

const METRIC_INFO: Record<string, { label: string; unit: string; icon: string }> = {
  weight:   { label: "Weight",   unit: "kg",    icon: "⚖️" },
  belly:    { label: "Belly",    unit: "in",    icon: "📏" },
  waist:    { label: "Waist",    unit: "in",    icon: "📐" },
  chest:    { label: "Chest",    unit: "in",    icon: "🫁" },
  hips:     { label: "Hips",     unit: "in",    icon: "🦵" },
  arms:     { label: "Arms",     unit: "in",    icon: "💪" },
  steps:    { label: "Steps",    unit: "steps", icon: "👟" },
};

/* ── Centered Gauge Component ── */
function CenteredGauge({ delta, maxDeviation }: { delta: number; maxDeviation: number }) {
  // delta > 0 = above target (bar goes RIGHT, orange)
  // delta < 0 = below target (bar goes LEFT, blue)
  // delta = 0 = on target (green dot at center)
  const pct = maxDeviation > 0 ? Math.min(Math.abs(delta) / maxDeviation, 1) * 50 : 0;
  const isAbove = delta > 0;
  const isOnTarget = delta === 0;

  return (
    <div className="relative w-full h-2 bg-[#2A2A2A] rounded-full overflow-hidden">
      {/* Center marker */}
      <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/20 -translate-x-px z-10" />

      {isOnTarget ? (
        /* Green dot at center */
        <div className="absolute left-1/2 top-1/2 -translate-x-1 -translate-y-1 w-2 h-2 rounded-full bg-green-500 z-20" />
      ) : isAbove ? (
        /* Orange bar growing RIGHT from center */
        <div
          className="absolute left-1/2 top-0 bottom-0 bg-[#FF6B00] rounded-r-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      ) : (
        /* Blue bar growing LEFT from center */
        <div
          className="absolute right-1/2 top-0 bottom-0 bg-[#3B82F6] rounded-l-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      )}
    </div>
  );
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
        <h1 className="text-2xl font-black text-white mb-6">My Targets</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4 animate-pulse">
              <div className="h-3 bg-[#2A2A2A] rounded w-16 mb-3" />
              <div className="h-6 bg-[#2A2A2A] rounded w-12 mb-2" />
              <div className="h-2 bg-[#2A2A2A] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allMetrics = Object.entries(METRIC_INFO).map(([key, info]) => {
    const target = targets.find(t => t.metric === key);
    return { key, ...info, target };
  });

  const activeTargets = allMetrics.filter(m => m.target);
  const inactiveMetrics = allMetrics.filter(m => !m.target);

  // Calculate max deviation across all targets for consistent gauge scaling
  const maxDeviation = activeTargets.reduce((max, m) => {
    if (!m.target?.currentValue) return max;
    return Math.max(max, Math.abs(m.target.currentValue - m.target.targetValue));
  }, 1);

  return (
    <div>
      <h1 className="text-2xl font-black text-white mb-2">My Targets</h1>
      <p className="text-white/40 text-sm mb-6">Hit the target — aim for the exact number</p>

      {activeTargets.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4 text-2xl">🎯</div>
          <h2 className="text-xl font-bold text-white mb-2">No targets set yet</h2>
          <p className="text-white/50">Your coach will assign targets for you soon.</p>
        </div>
      ) : (
        <>
          {/* Active targets — 2-col mobile, 3-col desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {activeTargets.map(m => {
              const t = m.target!;
              const hasCurrent = t.currentValue !== null;
              const delta = hasCurrent ? Math.round((t.currentValue! - t.targetValue) * 10) / 10 : 0;
              const absDelta = Math.abs(delta);
              const isOnTarget = hasCurrent && delta === 0;
              const isAbove = hasCurrent && delta > 0;
              const isBelow = hasCurrent && delta < 0;

              // Status color — steps: more is better (above = green)
              const isSteps = m.key === "steps";
              const statusColor = isOnTarget ? "#22C55E" : isAbove ? (isSteps ? "#22C55E" : "#FF6B00") : "#3B82F6";

              return (
                <div key={m.key} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4 flex flex-col">
                  {/* Icon + Label */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{m.icon}</span>
                    <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">{m.label}</span>
                  </div>

                  {/* Target value — hero number */}
                  <p className="text-2xl font-black text-white leading-none">
                    {t.targetValue.toLocaleString()}
                    <span className="text-[10px] font-semibold text-white/30 ml-1">{m.unit}</span>
                  </p>

                  {/* Current value */}
                  {hasCurrent ? (
                    <p className="text-xs text-white/40 mt-1">
                      Now: <span className="font-semibold" style={{ color: statusColor }}>{t.currentValue!.toLocaleString()}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-white/20 mt-1">No data yet</p>
                  )}

                  {/* Centered gauge */}
                  {hasCurrent && (
                    <div className="mt-3">
                      <CenteredGauge delta={delta} maxDeviation={maxDeviation} />
                    </div>
                  )}

                  {/* Status text */}
                  {hasCurrent && (
                    <p className="text-[10px] font-medium mt-2 leading-tight" style={{ color: statusColor }}>
                      {isOnTarget && "✓ On Target"}
                      {isAbove && isSteps && `✓ ${absDelta.toLocaleString()} above target!`}
                      {isAbove && !isSteps && `↑ Above by ${absDelta.toLocaleString()} ${m.unit}`}
                      {isBelow && `↓ Below by ${absDelta.toLocaleString()} ${m.unit}`}
                    </p>
                  )}
                  {hasCurrent && !isOnTarget && !isSteps && (
                    <p className="text-[9px] text-white/20 mt-0.5">
                      {isAbove ? "Aim to reduce" : "Aim to increase"}
                    </p>
                  )}
                  {hasCurrent && isBelow && isSteps && (
                    <p className="text-[9px] text-white/20 mt-0.5">Keep moving!</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Inactive metrics */}
          {inactiveMetrics.length > 0 && (
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wide mb-3">Not targeted</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {inactiveMetrics.map(m => (
                  <div key={m.key} className="bg-[#1E1E1E]/50 border border-[#2A2A2A]/50 rounded-xl p-2.5 text-center opacity-40">
                    <span className="text-base">{m.icon}</span>
                    <p className="text-[9px] text-white/40 mt-0.5">{m.label}</p>
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
