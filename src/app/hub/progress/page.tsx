"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import TimeRangeFilter from "@/components/ui/TimeRangeFilter";
import { fetchWithRetry } from "@/lib/fetch-retry";

/* Uses default TimeRangeFilter options: Today, Week, Month, 6M, Year */

function rangeToDays(range: string): number {
  switch (range) {
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    default: return 0; // "all"
  }
}

type Measurement = {
  id: number;
  loggedDate: string;
  weightKg: number | null;
  bellyInches: number | null;
  chestInches: number | null;
  waistInches: number | null;
  hipsInches: number | null;
  armsInches: number | null;
  imageData: string | null;
  notes: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

function fmtDateFull(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Multi-metric line chart
// ---------------------------------------------------------------------------
type MetricKey = "weightKg" | "bellyInches" | "waistInches";
const METRIC_CONFIG: Record<MetricKey, { label: string; color: string; unit: string }> = {
  weightKg: { label: "Weight", color: "#E51A1A", unit: "kg" },
  bellyInches: { label: "Belly", color: "#FF6B00", unit: "in" },
  waistInches: { label: "Waist", color: "#FFB800", unit: "in" },
};

function MetricChart({ data, metrics }: { data: Measurement[]; metrics: MetricKey[] }) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    entry: Measurement;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const sorted = useMemo(
    () => [...data].sort((a, b) => a.loggedDate.localeCompare(b.loggedDate)),
    [data]
  );

  if (sorted.length === 0 || metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-white/30">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" className="mb-3 opacity-40">
          <path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-sm">Not enough data yet. Log your first measurement above.</p>
      </div>
    );
  }

  const W = 800;
  const H = 300;
  const pad = { top: 20, right: 30, bottom: 50, left: 55 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;

  // Per-metric we draw a separate line
  const lines = metrics.map((key) => {
    const points = sorted
      .filter((d) => d[key] !== null && d[key] !== undefined)
      .map((d, i) => ({ ...d, idx: i, val: d[key] as number }));
    return { key, points, ...METRIC_CONFIG[key] };
  });

  // Shared x-scale from data indices
  const xScale = (i: number) => pad.left + (i / Math.max(sorted.length - 1, 1)) * cw;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current || sorted.length < 2) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * W;
      let closest = 0;
      let closestDist = Infinity;
      for (let i = 0; i < sorted.length; i++) {
        const dist = Math.abs(xScale(i) - mouseX);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      }
      setTooltip({ x: xScale(closest), y: pad.top + 10, entry: sorted[closest] });
    },
    [sorted]
  );

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={pad.left}
            x2={W - pad.right}
            y1={pad.top + ch * (1 - pct)}
            y2={pad.top + ch * (1 - pct)}
            stroke="#2A2A2A"
            strokeWidth={1}
          />
        ))}

        {/* X-axis labels */}
        {sorted.length > 0 && (() => {
          const step = Math.max(1, Math.floor(sorted.length / 8));
          const ticks: number[] = [];
          for (let i = 0; i < sorted.length; i += step) ticks.push(i);
          if (ticks[ticks.length - 1] !== sorted.length - 1) ticks.push(sorted.length - 1);
          return ticks.map((idx) => (
            <text
              key={idx}
              x={xScale(idx)}
              y={H - pad.bottom + 25}
              textAnchor="middle"
              fontSize={12}
              fill="#888"
            >
              {fmtDate(sorted[idx].loggedDate)}
            </text>
          ));
        })()}

        {/* Lines */}
        {lines.map((line) => {
          if (line.points.length < 2) return null;
          // Find indices in sorted array
          const allVals = line.points.map((p) => p.val);
          const minV = Math.min(...allVals);
          const maxV = Math.max(...allVals);
          const rangeV = maxV - minV || 1;
          const yForVal = (v: number) => pad.top + (1 - (v - minV + rangeV * 0.05) / (rangeV * 1.1)) * ch;

          const pathD = line.points
            .map((p, i) => {
              const sortedIdx = sorted.indexOf(p);
              return `${i === 0 ? "M" : "L"} ${xScale(sortedIdx)} ${yForVal(p.val)}`;
            })
            .join(" ");

          return (
            <g key={line.key}>
              <path d={pathD} fill="none" stroke={line.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
              {line.points.map((p) => {
                const sortedIdx = sorted.indexOf(p);
                return (
                  <circle
                    key={`${line.key}-${sortedIdx}`}
                    cx={xScale(sortedIdx)}
                    cy={yForVal(p.val)}
                    r={3.5}
                    fill={line.color}
                    stroke="#1E1E1E"
                    strokeWidth={2}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Tooltip hover line */}
        {tooltip && (
          <line
            x1={tooltip.x}
            x2={tooltip.x}
            y1={pad.top}
            y2={pad.top + ch}
            stroke="#E51A1A"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.4}
          />
        )}
      </svg>

      {/* Tooltip overlay */}
      {tooltip && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#222] border border-[#2A2A2A] rounded-lg px-3 py-2 text-xs pointer-events-none z-10">
          <p className="font-semibold text-white mb-1">{fmtDateFull(tooltip.entry.loggedDate)}</p>
          {tooltip.entry.weightKg !== null && metrics.includes("weightKg") && (
            <p className="text-white/60">Weight: <span className="text-white font-semibold">{tooltip.entry.weightKg} kg</span></p>
          )}
          {tooltip.entry.bellyInches !== null && metrics.includes("bellyInches") && (
            <p className="text-white/60">Belly: <span className="text-white font-semibold">{tooltip.entry.bellyInches} in</span></p>
          )}
          {tooltip.entry.waistInches !== null && metrics.includes("waistInches") && (
            <p className="text-white/60">Waist: <span className="text-white font-semibold">{tooltip.entry.waistInches} in</span></p>
          )}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Main Page Component
// ===========================================================================
export default function ProgressPage() {
  const activeTab = "measurements";
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartRange, setChartRange] = useState("90d");

  // Log form state
  const [logDate, setLogDate] = useState(todayISO());
  const [logWeight, setLogWeight] = useState("");
  const [logBelly, setLogBelly] = useState("");
  const [logWaist, setLogWaist] = useState("");
  const [logChest, setLogChest] = useState("");
  const [logHips, setLogHips] = useState("");
  const [logArms, setLogArms] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Chart metric toggles
  const [showWeight, setShowWeight] = useState(true);
  const [showBelly, setShowBelly] = useState(true);
  const [showWaist, setShowWaist] = useState(false);


  const fetchMeasurements = useCallback(async () => {
    try {
      const res = await fetchWithRetry("/api/measurements");
      const data = await res.json();
      if (data.measurements) {
        setMeasurements(data.measurements);
        // Pre-fill form from most recent entry
        if (data.measurements.length > 0) {
          const latest = data.measurements[0]; // already sorted desc
          if (latest.weightKg) setLogWeight(String(latest.weightKg));
          if (latest.bellyInches) setLogBelly(String(latest.bellyInches));
          if (latest.waistInches) setLogWaist(String(latest.waistInches));
          if (latest.chestInches) setLogChest(String(latest.chestInches));
          if (latest.hipsInches) setLogHips(String(latest.hipsInches));
          if (latest.armsInches) setLogArms(String(latest.armsInches));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeasurements();
  }, [fetchMeasurements]);

  const sorted = useMemo(
    () => [...measurements].sort((a, b) => a.loggedDate.localeCompare(b.loggedDate)),
    [measurements]
  );

  // Filter measurements by chart range for chart display
  const filteredSorted = useMemo(() => {
    const days = rangeToDays(chartRange);
    if (days === 0) return sorted; // "all"
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return sorted.filter((m) => m.loggedDate.slice(0, 10) >= cutoffStr);
  }, [sorted, chartRange]);

  const rangeLabel = chartRange === "1y" ? "1 Year" : chartRange === "180d" ? "6 Months" : chartRange === "30d" ? "Month" : chartRange === "7d" ? "Week" : "Today";

  const tableEntries = useMemo(() => {
    const desc = [...sorted].reverse();
    return desc.map((entry, idx) => {
      const sortedIdx = sorted.length - 1 - idx;
      const prev = sortedIdx > 0 ? sorted[sortedIdx - 1] : null;
      const weightChange = prev && entry.weightKg !== null && prev.weightKg !== null
        ? Math.round((entry.weightKg - prev.weightKg) * 10) / 10
        : null;
      const bellyChange = prev && entry.bellyInches !== null && prev.bellyInches !== null
        ? Math.round((entry.bellyInches - prev.bellyInches) * 10) / 10
        : null;
      return { ...entry, weightChange, bellyChange };
    });
  }, [sorted]);

  // Stats — all 6 metrics
  const getStartCurrent = (field: keyof Measurement) => {
    const start = sorted.find((m) => m[field] !== null)?.[field] as number | null;
    const current = [...sorted].reverse().find((m) => m[field] !== null)?.[field] as number | null;
    return { start, current, change: start !== null && current !== null ? Math.round((current - start) * 10) / 10 : null };
  };
  const stats = {
    weight: getStartCurrent("weightKg"),
    belly: getStartCurrent("bellyInches"),
    waist: getStartCurrent("waistInches"),
    chest: getStartCurrent("chestInches"),
    hips: getStartCurrent("hipsInches"),
    arms: getStartCurrent("armsInches"),
  };
  // Backward compat
  const startWeight = stats.weight.start;
  const currentWeight = stats.weight.current;
  const startBelly = stats.belly.start;
  const currentBelly = stats.belly.current;

  const activeMetrics: MetricKey[] = [];
  if (showWeight) activeMetrics.push("weightKg");
  if (showBelly) activeMetrics.push("bellyInches");
  if (showWaist) activeMetrics.push("waistInches");

  async function handleLogMeasurement() {
    if (!logWeight && !logBelly && !logWaist && !logChest && !logHips && !logArms) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = { loggedDate: logDate };
      if (logWeight) payload.weightKg = parseFloat(logWeight);
      if (logBelly) payload.bellyInches = parseFloat(logBelly);
      if (logWaist) payload.waistInches = parseFloat(logWaist);
      if (logChest) payload.chestInches = parseFloat(logChest);
      if (logHips) payload.hipsInches = parseFloat(logHips);
      if (logArms) payload.armsInches = parseFloat(logArms);
      if (logNotes) payload.notes = logNotes;

      await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setLogWeight("");
      setLogBelly("");
      setLogWaist("");
      setLogChest("");
      setLogHips("");
      setLogArms("");
      setLogNotes("");
      await fetchMeasurements();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await fetch(`/api/measurements/${id}`, { method: "DELETE" });
      await fetchMeasurements();
    } catch {
      // ignore
    }
  }

  const inputCls =
    "w-full max-w-full box-border border-2 border-[#2A2A2A] rounded-xl py-2.5 px-3 bg-[#1E1E1E] text-white focus:border-[#E51A1A] focus:outline-none text-sm placeholder:text-white/30 min-h-[44px] appearance-none";

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-white/30">Loading...</div>;
  }

  return (
    <div className="w-full overflow-hidden">
      <h1 className="text-2xl font-black text-white mb-2">Measurements Tracker</h1>
      <p className="text-white/40 text-sm mb-6">
        Track your body measurements and transformation over time.
      </p>


      {/* ================================================================= */}
      {/* TAB 1: MEASUREMENTS                                               */}
      {/* ================================================================= */}
      {activeTab === "measurements" && (
        <div className="space-y-6">
          {/* Log Form — Compact 2-column layout */}
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Log Measurement</h2>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[#E51A1A] focus:outline-none min-h-[36px]"
              />
            </div>

            {/* Weight — full width, prominent */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-[#E51A1A]/70 uppercase tracking-wide block mb-1">⚖️ Weight (kg)</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="80.0"
                value={logWeight}
                onChange={(e) => setLogWeight(e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Body measurements — 2-column grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="text-[10px] font-semibold text-[#FF6B00]/70 uppercase tracking-wide block mb-1">📏 Belly (in)</label>
                <input type="number" inputMode="decimal" step="0.1" placeholder="34" value={logBelly} onChange={(e) => setLogBelly(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#FFB800]/70 uppercase tracking-wide block mb-1">📐 Waist (in)</label>
                <input type="number" inputMode="decimal" step="0.1" placeholder="32" value={logWaist} onChange={(e) => setLogWaist(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#3B82F6]/70 uppercase tracking-wide block mb-1">💪 Chest (in)</label>
                <input type="number" inputMode="decimal" step="0.1" placeholder="40" value={logChest} onChange={(e) => setLogChest(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#8B5CF6]/70 uppercase tracking-wide block mb-1">🦵 Hips (in)</label>
                <input type="number" inputMode="decimal" step="0.1" placeholder="38" value={logHips} onChange={(e) => setLogHips(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#14B8A6]/70 uppercase tracking-wide block mb-1">💪 Arms (in)</label>
                <input type="number" inputMode="decimal" step="0.1" placeholder="14" value={logArms} onChange={(e) => setLogArms(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-white/30 uppercase tracking-wide block mb-1">📝 Notes</label>
                <input type="text" placeholder="Optional" value={logNotes} onChange={(e) => setLogNotes(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Sticky save button */}
            <button
              onClick={handleLogMeasurement}
              disabled={saving}
              className="w-full py-3.5 bg-[#E51A1A] text-white rounded-xl font-bold text-sm cursor-pointer border-none hover:bg-[#C41616] transition-colors min-h-[48px] sticky bottom-0"
            >
              {saving ? "Saving..." : "Save Measurement"}
            </button>
          </div>

          {/* Stats Cards — All 6 Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {([
              { key: "weight", label: "Weight", unit: "kg", color: "#E51A1A", icon: "⚖️", lowerBetter: true },
              { key: "belly", label: "Belly", unit: "in", color: "#FF6B00", icon: "📏", lowerBetter: true },
              { key: "waist", label: "Waist", unit: "in", color: "#FFB800", icon: "📐", lowerBetter: true },
              { key: "chest", label: "Chest", unit: "in", color: "#3B82F6", icon: "🫁", lowerBetter: false },
              { key: "hips", label: "Hips", unit: "in", color: "#8B5CF6", icon: "🦵", lowerBetter: false },
              { key: "arms", label: "Arms", unit: "in", color: "#14B8A6", icon: "💪", lowerBetter: false },
            ] as const).map(({ key, label, unit, color, icon, lowerBetter }) => {
              const s = stats[key];
              // Semantic colors: green = progress toward goal, red = moving away
              const isGood = s.change !== null && ((lowerBetter && s.change < 0) || (!lowerBetter && s.change > 0));
              const isBad = s.change !== null && ((lowerBetter && s.change > 0) || (!lowerBetter && s.change < 0));
              return (
                <div key={key} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-3.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: color + "99" }}>{icon} {label}</p>
                  <p className="text-xl font-black text-white">{s.current !== null ? `${s.current} ${unit}` : "--"}</p>
                  {s.change !== null && (
                    <p className={`text-[11px] font-semibold mt-1 ${isGood ? "text-green-400" : isBad ? "text-[#E51A1A]" : "text-white/30"}`}>
                      {s.change > 0 ? "+" : ""}{s.change} {unit}
                      <span className="text-white/20 ml-1">since start</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Multi-Metric Chart */}
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold">Trend ({rangeLabel})</h2>
              <div className="flex gap-2">
                {(Object.entries(METRIC_CONFIG) as [MetricKey, typeof METRIC_CONFIG[MetricKey]][]).map(
                  ([key, cfg]) => {
                    const isActive =
                      key === "weightKg" ? showWeight :
                      key === "bellyInches" ? showBelly :
                      showWaist;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (key === "weightKg") setShowWeight(!showWeight);
                          else if (key === "bellyInches") setShowBelly(!showBelly);
                          else setShowWaist(!showWaist);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border-none ${
                          isActive
                            ? "text-white"
                            : "text-white/30"
                        }`}
                        style={{ backgroundColor: isActive ? cfg.color + "20" : "#2A2A2A" }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: isActive ? cfg.color : "#666" }}
                        />
                        {cfg.label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
            <div className="mb-4">
              <TimeRangeFilter value={chartRange} onChange={setChartRange} />
            </div>
            <MetricChart data={filteredSorted} metrics={activeMetrics} />
          </div>

          {/* Measurement History Table */}
          <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden">
            <div className="p-6 pb-3">
              <h2 className="text-lg font-bold">Measurement Log</h2>
            </div>
            {/* Mobile card view */}
            <div className="sm:hidden space-y-2 px-4 pb-4">
              {tableEntries.length === 0 ? (
                <p className="py-12 text-center text-white/30">
                  No measurements yet. Log your first measurement above to start tracking.
                </p>
              ) : (
                tableEntries.map((entry) => (
                  <div key={entry.id} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{fmtDateFull(entry.loggedDate)}</p>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-white/20 hover:text-[#E51A1A] transition-colors cursor-pointer bg-transparent border-none text-xs min-h-[44px] px-2"
                        title="Delete entry"
                      >
                        Delete
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-white/40 text-xs">Weight</span>
                        <p className="text-white font-medium">{entry.weightKg !== null ? `${entry.weightKg} kg` : "--"}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Belly</span>
                        <p className="text-white font-medium">{entry.bellyInches !== null ? `${entry.bellyInches} in` : "--"}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Waist</span>
                        <p className="text-white font-medium">{entry.waistInches !== null ? `${entry.waistInches} in` : "--"}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Chest</span>
                        <p className="text-white font-medium">{entry.chestInches !== null ? `${entry.chestInches} in` : "--"}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Hips</span>
                        <p className="text-white font-medium">{entry.hipsInches !== null ? `${entry.hipsInches} in` : "--"}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Arms</span>
                        <p className="text-white font-medium">{entry.armsInches !== null ? `${entry.armsInches} in` : "--"}</p>
                      </div>
                      <div>
                        <span className="text-white/40 text-xs">Change</span>
                        <p className="font-medium">
                          {entry.weightChange !== null ? (
                            <span className={entry.weightChange < 0 ? "text-green-400" : entry.weightChange > 0 ? "text-[#E51A1A]" : "text-white/30"}>
                              {entry.weightChange > 0 ? "+" : ""}{entry.weightChange} kg
                            </span>
                          ) : (
                            <span className="text-white/20">--</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Desktop table view */}
            <div className="hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#2A2A2A] text-left">
                      <th className="px-4 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Date</th>
                      <th className="px-4 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Weight</th>
                      <th className="px-4 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Belly</th>
                      <th className="px-4 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Waist</th>
                      <th className="px-4 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Chest</th>
                      <th className="px-4 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Hips</th>
                      <th className="px-4 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Arms</th>
                      <th className="px-4 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Change</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {tableEntries.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-6 py-12 text-center text-white/30">
                          No measurements yet. Log your first measurement above to start tracking.
                        </td>
                      </tr>
                    ) : (
                      tableEntries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="border-b border-[#1A1A1A] hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">{fmtDateFull(entry.loggedDate)}</td>
                          <td className="px-4 py-3">{entry.weightKg !== null ? `${entry.weightKg} kg` : "--"}</td>
                          <td className="px-4 py-3">{entry.bellyInches !== null ? `${entry.bellyInches} in` : "--"}</td>
                          <td className="px-4 py-3">{entry.waistInches !== null ? `${entry.waistInches} in` : "--"}</td>
                          <td className="px-4 py-3">{entry.chestInches !== null ? `${entry.chestInches} in` : "--"}</td>
                          <td className="px-4 py-3">{entry.hipsInches !== null ? `${entry.hipsInches} in` : "--"}</td>
                          <td className="px-4 py-3">{entry.armsInches !== null ? `${entry.armsInches} in` : "--"}</td>
                          <td className="px-4 py-3">
                            {entry.weightChange !== null ? (
                              <span className={`font-semibold ${entry.weightChange < 0 ? "text-green-400" : entry.weightChange > 0 ? "text-[#E51A1A]" : "text-white/30"}`}>
                                {entry.weightChange > 0 ? "+" : ""}{entry.weightChange} kg
                              </span>
                            ) : (
                              <span className="text-white/20">--</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-white/20 hover:text-[#E51A1A] transition-colors cursor-pointer bg-transparent border-none text-sm"
                              title="Delete entry"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
