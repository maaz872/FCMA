"use client";

import { useState, useRef, useCallback } from "react";

export interface BarChartData {
  label: string;
  value: number;
  date: string;
}

interface BarChartProps {
  data: BarChartData[];
  targetValue?: number;
  color: string;
  colorMode?: "over-is-good" | "under-is-good";
  unit: string;
  height?: number;
  emptyText?: string;
  targetLabel?: string;
}

const PAD = { top: 20, right: 20, bottom: 35, left: 50 };
const VIEW_W = 600;

function formatAxis(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}k`;
  return String(Math.round(v));
}

export default function BarChart({
  data,
  targetValue,
  color,
  colorMode = "under-is-good",
  unit,
  height = 220,
  emptyText = "No data for this period",
  targetLabel = "Target",
}: BarChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointer = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!svgRef.current || data.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const scale = VIEW_W / rect.width;
      const x = (clientX - rect.left) * scale;
      const cw = VIEW_W - PAD.left - PAD.right;
      const barW = cw / data.length;
      const idx = Math.floor((x - PAD.left) / barW);
      if (idx >= 0 && idx < data.length) {
        setHoverIdx(idx);
      } else {
        setHoverIdx(null);
      }
    },
    [data.length]
  );

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-white/20">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mb-2 opacity-40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l3-9 4 18 3-9h4" />
        </svg>
        <p className="text-xs">{emptyText}</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), targetValue || 0, 1);
  const cw = VIEW_W - PAD.left - PAD.right;
  const ch = height - PAD.top - PAD.bottom;
  const barW = cw / data.length;
  const barGap = Math.max(1, barW * 0.15);
  const barActualW = barW - barGap;

  // Y-axis ticks (5 levels)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((pct) => ({
    value: Math.round(maxVal * pct),
    y: PAD.top + ch * (1 - pct),
  }));

  // X-axis labels: show every Nth to avoid overlap
  const labelEvery = data.length <= 7 ? 1 : data.length <= 14 ? 2 : data.length <= 21 ? 3 : 5;

  // Target line position
  const targetY = targetValue ? PAD.top + ch * (1 - targetValue / maxVal) : null;

  // Bar color logic
  function getBarColor(value: number): string {
    if (!targetValue) return color;
    if (colorMode === "over-is-good") {
      return value >= targetValue ? "#22C55E" : color;
    } else {
      return value <= targetValue ? "#22C55E" : "#E51A1A";
    }
  }

  const hoverData = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className="relative" ref={containerRef}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${height}`}
        className="w-full h-auto"
        onMouseMove={handlePointer}
        onTouchMove={handlePointer}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchEnd={() => setHoverIdx(null)}
      >
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={VIEW_W - PAD.right}
              y1={tick.y}
              y2={tick.y}
              stroke="#2A2A2A"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={tick.y + 3}
              textAnchor="end"
              fontSize={9}
              fill="#666"
            >
              {formatAxis(tick.value)}
            </text>
          </g>
        ))}

        {/* Target/goal dashed line */}
        {targetY !== null && (
          <>
            <line
              x1={PAD.left}
              x2={VIEW_W - PAD.right}
              y1={targetY}
              y2={targetY}
              stroke="#FFB800"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.7}
            />
            <text
              x={VIEW_W - PAD.right + 4}
              y={targetY + 3}
              fontSize={8}
              fill="#FFB800"
              opacity={0.7}
            >
              {formatAxis(targetValue!)}
            </text>
          </>
        )}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max(2, (d.value / maxVal) * ch);
          const x = PAD.left + i * barW + barGap / 2;
          const y = PAD.top + ch - barH;
          const isHovered = hoverIdx === i;
          const barColor = getBarColor(d.value);
          const rx = Math.min(3, barActualW / 2);

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barActualW}
                height={barH}
                rx={rx}
                fill={barColor}
                opacity={isHovered ? 1 : 0.8}
                className="transition-opacity duration-150"
              />
              {/* Hover highlight */}
              {isHovered && (
                <line
                  x1={x + barActualW / 2}
                  x2={x + barActualW / 2}
                  y1={PAD.top}
                  y2={PAD.top + ch}
                  stroke="white"
                  strokeWidth={0.5}
                  opacity={0.2}
                />
              )}
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % labelEvery !== 0) return null;
          const x = PAD.left + i * barW + barW / 2;
          return (
            <text
              key={i}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fontSize={9}
              fill="#666"
            >
              {d.label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoverData && hoverIdx !== null && (
        <div
          className="absolute z-10 bg-[#1E1E1E] border border-[#3A3A3A] rounded-lg px-3 py-2 pointer-events-none shadow-xl"
          style={{
            left: `${((PAD.left + hoverIdx * barW + barW / 2) / VIEW_W) * 100}%`,
            top: 0,
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-[10px] text-white/50">{hoverData.date}</p>
          <p className="text-sm font-bold text-white">
            {hoverData.value.toLocaleString()} <span className="text-[10px] text-white/40">{unit}</span>
          </p>
          {targetValue && (
            <p className={`text-[9px] font-semibold ${
              colorMode === "over-is-good"
                ? (hoverData.value >= targetValue ? "text-green-400" : "text-[#E51A1A]")
                : (hoverData.value <= targetValue ? "text-green-400" : "text-[#E51A1A]")
            }`}>
              {hoverData.value >= targetValue
                ? `+${(hoverData.value - targetValue).toLocaleString()} over ${targetLabel.toLowerCase()}`
                : `-${(targetValue - hoverData.value).toLocaleString()} under ${targetLabel.toLowerCase()}`}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      {targetValue && (
        <div className="flex items-center gap-4 mt-2 text-[9px] text-white/40">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" /> On target
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colorMode === "over-is-good" ? color : "#E51A1A" }} /> Off target
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5" style={{ borderTop: "1.5px dashed #FFB800" }} /> {targetLabel}
          </span>
        </div>
      )}
    </div>
  );
}
