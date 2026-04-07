"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TimeRangeFilter from "@/components/ui/TimeRangeFilter";
import { fetchWithRetry } from "@/lib/fetch-retry";

type DayData = {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type WeightEntry = {
  date: string;
  weight: number;
};

type AnalyticsData = {
  weeklyData: DayData[];
  weightLogs: WeightEntry[];
  targets: { calories: number; protein: number; carbs: number; fat: number } | null;
  totalMealCount: number;
  consistencyDays: number;
  consistencyTotal: number;
  maxProteinDay: number;
  minWeight: number | null;
  longestStreak: number;
};

const RANGE_LABELS: Record<string, string> = {
  "7d": "7 Days",
  "30d": "30 Days",
  "90d": "3 Months",
  "1y": "1 Year",
  all: "All Time",
};

function CalorieBarChart({
  data,
  target,
}: {
  data: DayData[];
  target: number;
}) {
  // Show at most last 30 bars to keep chart readable
  const visible = data.length > 30 ? data.slice(-30) : data;
  const maxCal = Math.max(
    ...visible.map((d) => d.calories),
    target || 0,
    1
  );
  const chartHeight = 200;
  const chartWidth = 600;
  const barCount = visible.length || 1;
  const barWidth = Math.max(4, Math.min(50, (chartWidth - 20) / barCount - 4));
  const gap = (chartWidth - barWidth * barCount) / (barCount + 1);

  const targetY = target > 0 ? chartHeight - (target / maxCal) * chartHeight : -1;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Target line */}
      {target > 0 && (
        <>
          <line
            x1={0}
            y1={targetY}
            x2={chartWidth}
            y2={targetY}
            stroke="#E51A1A"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            opacity={0.6}
          />
          <text
            x={chartWidth - 4}
            y={targetY - 4}
            fill="#E51A1A"
            fontSize={10}
            textAnchor="end"
            opacity={0.8}
          >
            Target
          </text>
        </>
      )}

      {visible.map((day, i) => {
        const barHeight =
          day.calories > 0
            ? (day.calories / maxCal) * chartHeight
            : 0;
        const x = gap + i * (barWidth + gap);
        const y = chartHeight - barHeight;
        const isOver = target > 0 && day.calories > target;
        const dayLabel = new Date(day.date + "T00:00:00").toLocaleDateString("en-GB", {
          weekday: "short",
        });

        return (
          <g key={day.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={Math.min(6, barWidth / 2)}
              fill={isOver ? "#E51A1A" : "#22C55E"}
              opacity={0.85}
            />
            {day.calories > 0 && barWidth >= 20 && (
              <text
                x={x + barWidth / 2}
                y={y - 6}
                fill="white"
                fontSize={10}
                textAnchor="middle"
                opacity={0.7}
              >
                {day.calories}
              </text>
            )}
            {barWidth >= 20 && (
              <text
                x={x + barWidth / 2}
                y={chartHeight + 16}
                fill="white"
                fontSize={11}
                textAnchor="middle"
                opacity={0.5}
              >
                {dayLabel}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MacroDonut({
  protein,
  carbs,
  fat,
}: {
  protein: number;
  carbs: number;
  fat: number;
}) {
  const total = protein + carbs + fat;
  if (total === 0)
    return (
      <p className="text-white/30 text-sm text-center py-8">
        No data for this period
      </p>
    );

  const proteinPct = (protein / total) * 100;
  const carbsPct = (carbs / total) * 100;
  const fatPct = (fat / total) * 100;

  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const proteinLen = (proteinPct / 100) * circumference;
  const carbsLen = (carbsPct / 100) * circumference;
  const fatLen = (fatPct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
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
          strokeDashoffset={-(proteinLen + carbsLen)}
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
          strokeDashoffset={-proteinLen}
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
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="flex items-center gap-4 mt-4">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E51A1A] inline-block" />
          Protein {Math.round(proteinPct)}%
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] inline-block" />
          Carbs {Math.round(carbsPct)}%
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-white/60">
          <span className="w-2.5 h-2.5 rounded-full bg-[#FFB800] inline-block" />
          Fat {Math.round(fatPct)}%
        </span>
      </div>
    </div>
  );
}

function WeightLineChart({ data }: { data: WeightEntry[] }) {
  if (data.length === 0)
    return (
      <p className="text-white/30 text-sm text-center py-8">
        No weight entries yet
      </p>
    );

  const weights = data.map((d) => d.weight);
  const minW = Math.min(...weights) - 1;
  const maxW = Math.max(...weights) + 1;
  const range = maxW - minW || 1;

  const chartWidth = 600;
  const chartHeight = 180;
  const paddingX = 30;
  const paddingY = 20;
  const innerW = chartWidth - paddingX * 2;
  const innerH = chartHeight - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = paddingY + (1 - (d.weight - minW) / range) * innerH;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  // Rate of change per week
  let ratePerWeek = null;
  if (data.length >= 2) {
    const first = data[0];
    const last = data[data.length - 1];
    const daysDiff =
      (new Date(last.date).getTime() - new Date(first.date).getTime()) /
      (24 * 60 * 60 * 1000);
    if (daysDiff > 0) {
      ratePerWeek =
        Math.round(((last.weight - first.weight) / daysDiff) * 7 * 10) / 10;
    }
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = paddingY + (1 - pct) * innerH;
          const val = (minW + pct * range).toFixed(1);
          return (
            <g key={pct}>
              <line
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="#2A2A2A"
                strokeWidth={0.5}
              />
              <text
                x={paddingX - 4}
                y={y + 3}
                fill="white"
                fontSize={9}
                textAnchor="end"
                opacity={0.4}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#E51A1A"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="#E51A1A"
          />
        ))}
      </svg>
      {ratePerWeek !== null && (
        <p className="text-sm text-white/50 mt-2 text-center">
          Rate:{" "}
          <span
            className={`font-bold ${
              ratePerWeek < 0
                ? "text-green-400"
                : ratePerWeek > 0
                ? "text-[#FF6B00]"
                : "text-white/50"
            }`}
          >
            {ratePerWeek > 0 ? "+" : ""}
            {ratePerWeek} kg/week
          </span>
        </p>
      )}
    </div>
  );
}

function ConsistencyRing({
  days,
  total,
}: {
  days: number;
  total: number;
}) {
  const pct = total > 0 ? (days / total) * 100 : 0;
  const size = 140;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillLen = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
          stroke="#E51A1A"
          strokeWidth={strokeWidth}
          strokeDasharray={`${fillLen} ${circumference - fillLen}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x={size / 2}
          y={size / 2 - 6}
          fill="white"
          fontSize={24}
          fontWeight="900"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {Math.round(pct)}%
        </text>
        <text
          x={size / 2}
          y={size / 2 + 16}
          fill="white"
          fontSize={11}
          textAnchor="middle"
          dominantBaseline="middle"
          opacity={0.5}
        >
          {days}/{total} days
        </text>
      </svg>
    </div>
  );
}

function rangeToDays(range: string): number {
  switch (range) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    default: return 0;
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    setLoading(true);
    fetchWithRetry(`/api/user/analytics?range=${range}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [range]);

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-black text-white mb-2">Analytics</h1>
        <p className="text-white/50 mb-8">Loading your data...</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 animate-pulse"
            >
              <div className="h-4 bg-[#2A2A2A] rounded w-40 mb-4" />
              <div className="h-40 bg-[#2A2A2A] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-3xl font-black text-white mb-2">Analytics</h1>
        <p className="text-white/50 mb-8">
          Unable to load analytics data.{" "}
          <Link href="/hub" className="text-[#E51A1A] font-semibold">
            Return to Hub
          </Link>
        </p>
      </div>
    );
  }

  // Compute average macros for the period
  const totalProtein = data.weeklyData.reduce((a, d) => a + d.protein, 0);
  const totalCarbs = data.weeklyData.reduce((a, d) => a + d.carbs, 0);
  const totalFat = data.weeklyData.reduce((a, d) => a + d.fat, 0);

  const rangeLabel = RANGE_LABELS[range] || range;
  const days = rangeToDays(range);

  return (
    <div>
      <h1 className="text-3xl font-black text-white mb-2">Analytics</h1>
      <p className="text-white/50 mb-6">
        Your personal insights and trends at a glance.
      </p>

      {/* Time Range Filter */}
      <div className="mb-8">
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Calorie Trend */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Calorie Trend ({rangeLabel})
          </h2>
          <CalorieBarChart
            data={data.weeklyData}
            target={data.targets?.calories || 0}
          />
        </div>

        {/* Macro Split */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Average Macro Split ({rangeLabel})
          </h2>
          <MacroDonut
            protein={totalProtein}
            carbs={totalCarbs}
            fat={totalFat}
          />
        </div>

        {/* Weight Progress */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Weight Progress ({rangeLabel})
          </h2>
          <WeightLineChart data={data.weightLogs} />
        </div>

        {/* Consistency Score */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            Consistency Score
          </h2>
          <ConsistencyRing days={data.consistencyDays} total={data.consistencyTotal || days || 30} />
          <p className="text-center text-sm text-white/40 mt-3">
            Percentage of {rangeLabel.toLowerCase()} with at least 1 meal logged
          </p>
        </div>
      </div>

      {/* Personal Records */}
      <h2 className="text-xl font-bold text-white mb-4">Personal Records ({rangeLabel})</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
            Lowest Weight
          </p>
          <p className="text-2xl font-black text-white">
            {data.minWeight !== null ? `${data.minWeight} kg` : "--"}
          </p>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
            Highest Protein Day
          </p>
          <p className="text-2xl font-black text-white">
            {data.maxProteinDay > 0 ? `${data.maxProteinDay}g` : "--"}
          </p>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
            Longest Streak
          </p>
          <p className="text-2xl font-black text-white">
            {data.longestStreak > 0 ? `${data.longestStreak} days` : "--"}
          </p>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">
            Total Meals Logged
          </p>
          <p className="text-2xl font-black text-white">
            {data.totalMealCount}
          </p>
        </div>
      </div>
    </div>
  );
}
