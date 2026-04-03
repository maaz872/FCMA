"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import TimeRangeFilter from "@/components/ui/TimeRangeFilter";

type StepLog = {
  id: number;
  steps: number;
  goal: number;
  loggedDate: string;
};

const STEP_RANGE_OPTIONS = [
  { label: "Week", value: "7d" },
  { label: "Month", value: "30d" },
  { label: "3 Months", value: "90d" },
];

function rangeToDays(range: string): number {
  switch (range) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return 7;
  }
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDateFull(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function getDayName(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short" });
}

function CircularProgress({ steps, goal }: { steps: number; goal: number }) {
  const size = 200;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(steps / (goal || 1), 1);
  const strokeDash = pct * circumference;
  const color = pct >= 1 ? "#22C55E" : "#E51A1A";

  return (
    <div className="relative flex items-center justify-center">
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
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-4xl font-black text-white">{steps.toLocaleString()}</p>
        <p className="text-sm text-white/40 font-semibold">
          / {goal.toLocaleString()} steps
        </p>
      </div>
    </div>
  );
}

function StepBarChart({ logs, defaultGoal, days }: { logs: StepLog[]; defaultGoal: number; days: number }) {
  const daysList = useMemo(() => {
    const daysCount = days > 0 ? days : 90;
    const result: { date: string; day: string; steps: number; goal: number }[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const log = logs.find((l) => l.loggedDate.slice(0, 10) === dateStr);
      result.push({
        date: dateStr,
        day: getDayName(dateStr),
        steps: log?.steps || 0,
        goal: log?.goal || defaultGoal,
      });
    }
    return result;
  }, [logs, defaultGoal, days]);

  const maxSteps = Math.max(...daysList.map((d) => d.steps), ...daysList.map((d) => d.goal), 1000);

  const W = 600;
  const H = 220;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const cw = W - pad.left - pad.right;
  const ch = H - pad.top - pad.bottom;
  const barCount = daysList.length || 1;
  const barWidth = Math.max(2, Math.min(cw / 7 * 0.6, cw / barCount * 0.7));
  const barGap = cw / barCount;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Y-axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const val = Math.round(maxSteps * pct);
        const y = pad.top + ch * (1 - pct);
        return (
          <g key={pct}>
            <line x1={pad.left} x2={W - pad.right} y1={y} y2={y} stroke="#2A2A2A" strokeWidth={1} />
            <text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#666">
              {val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : val}
            </text>
          </g>
        );
      })}

      {/* Goal line */}
      {daysList[0] && (
        <line
          x1={pad.left}
          x2={W - pad.right}
          y1={pad.top + ch * (1 - daysList[0].goal / maxSteps)}
          y2={pad.top + ch * (1 - daysList[0].goal / maxSteps)}
          stroke="#FFB800"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.6}
        />
      )}

      {/* Bars */}
      {daysList.map((d, i) => {
        const barH = (d.steps / maxSteps) * ch;
        const x = pad.left + i * barGap + (barGap - barWidth) / 2;
        const y = pad.top + ch - barH;
        const met = d.steps >= d.goal;
        return (
          <g key={d.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barH, 2)}
              rx={Math.min(4, barWidth / 2)}
              fill={met ? "#22C55E" : "#E51A1A"}
              opacity={0.85}
            />
            {barCount <= 14 && (
              <text
                x={x + barWidth / 2}
                y={H - pad.bottom + 16}
                textAnchor="middle"
                fontSize={11}
                fill="#888"
                fontWeight={600}
              >
                {d.day}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function StepsPage() {
  const [logs, setLogs] = useState<StepLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stepsInput, setStepsInput] = useState("");
  const [goalInput, setGoalInput] = useState("10000");
  const [showLogForm, setShowLogForm] = useState(false);
  const [showGoalEdit, setShowGoalEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [range, setRange] = useState("7d");

  const days = rangeToDays(range);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/steps?range=${range}`);
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  const todayLog = useMemo(() => {
    const today = todayISO();
    return logs.find((l) => l.loggedDate.slice(0, 10) === today) || null;
  }, [logs]);

  const currentGoal = todayLog?.goal || parseInt(goalInput) || 10000;
  const todaySteps = todayLog?.steps || 0;

  // Stats for selected range
  const rangeLogs = useMemo(() => {
    if (range === "all") return logs;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return logs.filter((l) => l.loggedDate.slice(0, 10) >= cutoffStr);
  }, [logs, range, days]);

  const avgSteps = rangeLogs.length > 0
    ? Math.round(rangeLogs.reduce((sum, l) => sum + l.steps, 0) / rangeLogs.length)
    : 0;
  const bestDay = rangeLogs.length > 0
    ? rangeLogs.reduce((max, l) => (l.steps > max.steps ? l : max), rangeLogs[0])
    : null;
  const daysGoalMet = rangeLogs.filter((l) => l.steps >= l.goal).length;

  // History for table
  const historyLogs = useMemo(() => {
    return [...rangeLogs].sort((a, b) => b.loggedDate.localeCompare(a.loggedDate));
  }, [rangeLogs]);

  async function handleLogSteps() {
    const steps = parseInt(stepsInput);
    if (!steps || steps < 0) return;
    setSaving(true);
    try {
      await fetch("/api/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps,
          goal: currentGoal,
          loggedDate: todayISO(),
        }),
      });
      setStepsInput("");
      setShowLogForm(false);
      await fetchLogs();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateGoal() {
    const goal = parseInt(goalInput);
    if (!goal || goal < 1) return;
    setSaving(true);
    try {
      await fetch("/api/steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: todaySteps,
          goal,
          loggedDate: todayISO(),
        }),
      });
      setShowGoalEdit(false);
      await fetchLogs();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(loggedDate: string) {
    try {
      await fetch("/api/steps", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loggedDate: loggedDate.slice(0, 10) }),
      });
      await fetchLogs();
    } catch {
      // ignore
    }
  }

  const rangeLabel = range === "all" ? "All" : `${days}d`;

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-white/30">Loading...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-black mb-2">Step Tracker</h1>
      <p className="text-white/50 mb-6">Track your daily steps and hit your goals.</p>

      {/* Time Range Filter */}
      <div className="mb-8">
        <TimeRangeFilter value={range} onChange={setRange} options={STEP_RANGE_OPTIONS} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Today's Steps Card */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6 flex flex-col items-center">
          <h2 className="text-lg font-bold mb-4 self-start">Today&apos;s Steps</h2>
          <CircularProgress steps={todaySteps} goal={currentGoal} />

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setShowLogForm(!showLogForm); setShowGoalEdit(false); }}
              className="px-5 py-2.5 bg-[#E51A1A] text-white rounded-xl font-semibold text-sm cursor-pointer border-none hover:bg-[#C41616] transition-colors"
            >
              Log Steps
            </button>
            <button
              onClick={() => { setShowGoalEdit(!showGoalEdit); setShowLogForm(false); }}
              className="px-5 py-2.5 bg-[#2A2A2A] text-white/70 rounded-xl font-semibold text-sm cursor-pointer border-none hover:bg-[#333] transition-colors"
            >
              Edit Goal
            </button>
          </div>

          {showLogForm && (
            <div className="mt-4 flex gap-2 w-full max-w-xs">
              <input
                type="number"
                placeholder="Steps"
                value={stepsInput}
                onChange={(e) => setStepsInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogSteps()}
                className="flex-1 border-2 border-[#2A2A2A] rounded-xl py-2.5 px-4 bg-[#1E1E1E] text-white focus:border-[#E51A1A] focus:outline-none text-sm"
              />
              <button
                onClick={handleLogSteps}
                disabled={saving}
                className="px-4 py-2.5 bg-[#E51A1A] text-white rounded-xl font-semibold text-sm cursor-pointer border-none"
              >
                {saving ? "..." : "Save"}
              </button>
            </div>
          )}

          {showGoalEdit && (
            <div className="mt-4 flex gap-2 w-full max-w-xs">
              <input
                type="number"
                placeholder="Daily goal"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateGoal()}
                className="flex-1 border-2 border-[#2A2A2A] rounded-xl py-2.5 px-4 bg-[#1E1E1E] text-white focus:border-[#E51A1A] focus:outline-none text-sm"
              />
              <button
                onClick={handleUpdateGoal}
                disabled={saving}
                className="px-4 py-2.5 bg-[#FF6B00] text-white rounded-xl font-semibold text-sm cursor-pointer border-none"
              >
                {saving ? "..." : "Set"}
              </button>
            </div>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
          <h2 className="text-lg font-bold mb-4">Steps (Last {days} Days)</h2>
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/30">
              <svg width="48" height="48" fill="none" viewBox="0 0 24 24" className="mb-3 opacity-40">
                <path d="M3 12h4l3-9 4 18 3-9h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-sm">No step data yet. Log your first steps to see your chart.</p>
            </div>
          ) : (
            <StepBarChart logs={logs} defaultGoal={currentGoal} days={days} />
          )}
          <div className="flex items-center gap-4 mt-2 justify-center">
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] inline-block" /> Goal met
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E51A1A] inline-block" /> Below goal
            </span>
            <span className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-3 h-0.5 bg-[#FFB800] inline-block" style={{ borderTop: "1.5px dashed #FFB800" }} /> Goal
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">Avg Steps ({rangeLabel})</p>
          <p className="text-2xl font-black">{avgSteps > 0 ? avgSteps.toLocaleString() : "--"}</p>
        </div>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">Best Day ({rangeLabel})</p>
          <p className="text-2xl font-black">
            {bestDay ? bestDay.steps.toLocaleString() : "--"}
          </p>
          {bestDay && (
            <p className="text-xs text-white/30 mt-0.5">{getDayName(bestDay.loggedDate)}</p>
          )}
        </div>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-5">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">Days Goal Met ({rangeLabel})</p>
          <p className="text-2xl font-black">{daysGoalMet > 0 ? `${daysGoalMet}/${rangeLogs.length}` : "--"}</p>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        <div className="p-6 pb-3">
          <h2 className="text-lg font-bold">History (Last {days} days)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A] text-left">
                <th className="px-6 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Date</th>
                <th className="px-6 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Steps</th>
                <th className="px-6 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Goal</th>
                <th className="px-6 py-3 font-semibold text-white/40 text-xs uppercase tracking-wide">Met?</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {historyLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/30">
                    No step data yet. Log your first steps above to start tracking.
                  </td>
                </tr>
              ) : (
                historyLogs.map((log) => {
                  const met = log.steps >= log.goal;
                  return (
                    <tr key={log.loggedDate} className="border-b border-[#1A1A1A] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-3 font-medium">{fmtDateFull(log.loggedDate)}</td>
                      <td className="px-6 py-3">{log.steps.toLocaleString()}</td>
                      <td className="px-6 py-3 text-white/50">{log.goal.toLocaleString()}</td>
                      <td className="px-6 py-3">
                        {met ? (
                          <span className="text-green-400 font-bold text-base">&#10003;</span>
                        ) : (
                          <span className="text-[#E51A1A] font-bold text-base">&#10007;</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleDelete(log.loggedDate)}
                          className="text-white/20 hover:text-[#E51A1A] transition-colors cursor-pointer bg-transparent border-none text-sm"
                          title="Delete entry"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
