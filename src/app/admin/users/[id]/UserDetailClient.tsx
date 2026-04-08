"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimeRangeFilter from "@/components/ui/TimeRangeFilter";

/* ─── Types ──────────────────────────────────────────────────────────── */

type MealLog = {
  id: number; description: string; mealType: string;
  calories: number; protein: number; carbs: number; fat: number;
  imageData: string | null; ingredients: string | null;
  loggedDate: string; loggedTime: string;
};
type WeightLog = { id: number; weightKg: number; loggedDate: string };
type StepLog = { id: number; steps: number; goal: number; loggedDate: string };
type BodyMeasurement = {
  id: number; loggedDate: string; weightKg: number | null;
  bellyInches: number | null; waistInches: number | null;
  chestInches: number | null; hipsInches: number | null;
  armsInches: number | null; imageData: string | null; notes: string | null;
};
type Favourite = { id: number; recipe: { id: number; title: string; slug: string; calories: number } };
type Message = {
  id: number; content: string; imageData: string | null;
  isRead: boolean; createdAt: string;
  senderName: string; senderRole: string; isSentByUser: boolean;
};

type UserData = {
  id: string; firstName: string; lastName: string; email: string; country: string;
  role: string; plan: string; planStatus: string; isActive: boolean;
  age: number | null; gender: string | null; heightCm: number | null;
  currentWeightKg: number | null; bodyFatPercent: number | null;
  fitnessGoal: string | null; activityLevel: string | null;
  dietaryPrefs: string | null; targetWeightKg: number | null;
  createdAt: string; lastLoginAt: string | null;
  paymentScreenshot: string | null; paymentAccountName: string | null;
  activePlanId: number | null;
  avgDailyCals: number; avgDailySteps: number; weightChange: number | null;
  hoursSinceLastLog: number | null; unreadMessages: number;
  macroTarget: { calories: number; protein: number; carbs: number; fat: number; goal: string } | null;
  mealLogs: MealLog[]; weightLogs: WeightLog[]; stepLogs: StepLog[];
  bodyMeasurements: BodyMeasurement[];
  favourites: Favourite[]; messages: Message[];
};

type PlanTemplate = {
  id: number; name: string; description: string | null;
  type: string; durationWeeks: number; dayCount: number;
};

type PlanDay = {
  id: number; dayOfWeek: number; weekNumber: number;
  workoutNotes: string | null; mealPlan: string | null;
  calorieTarget: number | null; proteinTarget: number | null;
  carbsTarget: number | null; fatTarget: number | null; notes: string | null;
  workoutTitle: string | null; workoutVideoUrl: string | null;
  meals?: { mealType: string; recipeTitle: string; servings: number }[];
};

type PlanProgress = {
  id: number; date: string;
  workoutCompleted: boolean; breakfastCompleted: boolean; lunchCompleted: boolean; snackCompleted: boolean; dinnerCompleted: boolean; notes: string | null;
};

type ActivePlan = {
  id: number; name: string; description: string | null;
  type: string; status: string; startDate: string; endDate: string | null;
  days: PlanDay[]; progress: PlanProgress[];
};

type WeeklyTargetData = {
  id: number; weekStartDate: string; metric: string;
  targetValue: number; currentValue: number | null; isVisible: boolean;
};

/* ─── Helpers ────────────────────────────────────────────────────────── */

const TABS = ["Overview", "Meals", "Steps", "Body", "Messages", "Plans", "Targets", "Analytics"] as const;
type Tab = typeof TABS[number];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function filterByRange<T extends { loggedDate?: string; photoDate?: string }>(items: T[], range: string): T[] {
  if (range === "all") return items;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return items.filter(i => {
    const d = i.loggedDate || i.photoDate || "";
    return new Date(d) >= cutoff;
  });
}

function MiniRing({ pct, color, size = 40 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const c = Math.PI * 2 * r;
  const p = Math.min(Math.max(pct, 0), 100);
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2A2A2A" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeDasharray={c} strokeDashoffset={c - (c * p / 100)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

const mealTypeColor: Record<string, string> = {
  Breakfast: "#FFB800", Lunch: "#4CAF50", Dinner: "#E51A1A", Snack: "#FF6B00",
};

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TAB_META: Record<Tab, { icon: string; label: string }> = {
  Overview: { icon: "📊", label: "Overview" },
  Meals:    { icon: "🍽️", label: "Meals" },
  Steps:    { icon: "👟", label: "Steps" },
  Body:     { icon: "📏", label: "Body" },
  Messages: { icon: "💬", label: "Messages" },
  Plans:    { icon: "📋", label: "Plans" },
  Targets:  { icon: "🎯", label: "Targets" },
  Analytics: { icon: "📊", label: "Analytics" },
};

function getMonday(d?: Date) {
  const date = d ? new Date(d) : new Date();
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date.toISOString().slice(0, 10);
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export default function UserDetailClient({ user, planTemplates, activePlan, weeklyTargets }: {
  user: UserData;
  planTemplates: PlanTemplate[];
  activePlan: ActivePlan | null;
  weeklyTargets: WeeklyTargetData[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const [sending, setSending] = useState(false);

  /* ── Notification form ── */
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMsg, setNotifMsg] = useState("");

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifMsg.trim()) return;
    setSending(true);
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: notifTitle, message: notifMsg }),
      });
      setNotifTitle(""); setNotifMsg("");
      alert("Notification sent!");
    } catch { alert("Failed to send"); }
    setSending(false);
  };

  /* ── Message form ── */
  const [msgText, setMsgText] = useState("");
  const sendMessage = async () => {
    if (!msgText.trim()) return;
    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: user.id, content: msgText }),
      });
      setMsgText("");
      router.refresh();
    } catch { alert("Failed to send message"); }
    setSending(false);
  };

  /* ── Delete helpers ── */
  const deleteMeal = async (id: number) => {
    if (!confirm("Delete this meal log?")) return;
    await fetch(`/api/admin/meals/${id}`, { method: "DELETE" });
    router.refresh();
  };
  const deleteEntry = async (type: string, id: number) => {
    if (!confirm(`Delete this ${type} entry?`)) return;
    await fetch(`/api/admin/user-data?type=${type}&id=${id}`, { method: "DELETE" });
    router.refresh();
  };

  /* ── Photo modal ── */

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24 w-full overflow-hidden">
      {/* ── Profile Header ── */}
      <ProfileHeader user={user} />

      {/* ── Mobile Card Grid (< sm) ── */}
      <div className="sm:hidden px-4 pt-4 pb-2">
        <div className="grid grid-cols-2 gap-3">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`relative flex items-center gap-2.5 p-3.5 rounded-xl border transition-all min-h-[52px] cursor-pointer ${
                tab === t
                  ? "bg-[#E51A1A]/10 border-[#E51A1A]/40 shadow-[0_0_12px_rgba(229,26,26,0.08)]"
                  : "bg-[#1E1E1E] border-[#2A2A2A] hover:border-[#3A3A3A]"
              }`}>
              <span className="text-lg leading-none">{TAB_META[t].icon}</span>
              <span className={`text-sm font-medium ${tab === t ? "text-white" : "text-white/50"}`}>
                {TAB_META[t].label}
              </span>
              {t === "Messages" && user.unreadMessages > 0 && (
                <span className="absolute top-2 right-2 bg-[#E51A1A] text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {user.unreadMessages}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop Sticky Tab Bar (>= sm) ── */}
      <div className="hidden sm:block sticky top-0 z-20 bg-[#111111] border-b border-[#2A2A2A]">
        <div className="overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`min-h-[44px] px-4 py-3 text-sm font-medium transition-colors shrink-0 cursor-pointer ${
                  tab === t ? "border-b-2 border-[#E51A1A] text-white font-semibold" : "text-white/40 hover:text-white/60"
                }`}>
                {t}
                {t === "Messages" && user.unreadMessages > 0 && (
                  <span className="ml-1.5 bg-[#E51A1A] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">{user.unreadMessages}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 py-4 max-w-3xl mx-auto">
        {tab === "Overview" && (
          <OverviewTab user={user} notifTitle={notifTitle} notifMsg={notifMsg}
            setNotifTitle={setNotifTitle} setNotifMsg={setNotifMsg}
            sendNotification={sendNotification} sending={sending} />
        )}
        {tab === "Meals" && <MealsTab meals={user.mealLogs} userId={user.id} macroTarget={user.macroTarget} onDelete={deleteMeal} onRefresh={() => router.refresh()} />}
        {tab === "Steps" && <StepsTab logs={user.stepLogs} userId={user.id} onDelete={(id) => deleteEntry("step", id)} onRefresh={() => router.refresh()} />}
        {tab === "Body" && <BodyTab measurements={user.bodyMeasurements} userId={user.id} onDelete={(id) => deleteEntry("measurement", id)} onRefresh={() => router.refresh()} />}
        {tab === "Messages" && <MessagesTab messages={user.messages} msgText={msgText} setMsgText={setMsgText} sendMessage={sendMessage} sending={sending} />}
        {tab === "Plans" && <PlansTab userId={user.id} activePlan={activePlan} planTemplates={planTemplates} onRefresh={() => router.refresh()} />}
        {tab === "Targets" && <TargetsTab userId={user.id} weeklyTargets={weeklyTargets} onRefresh={() => router.refresh()} />}
        {tab === "Analytics" && <AnalyticsTab mealLogs={user.mealLogs} weightLogs={user.weightLogs} stepLogs={user.stepLogs} />}
      </div>

      {/* ── Photo Modal ── */}
    </div>
  );
}

/* ─── Profile Header ─────────────────────────────────────────────────── */

function ProfileHeader({ user }: { user: UserData }) {
  const calPct = user.macroTarget ? Math.round((user.avgDailyCals / user.macroTarget.calories) * 100) : 0;
  const isLossGoal = user.fitnessGoal === "fat_loss" || user.fitnessGoal === "weight_loss";

  return (
    <div className="px-4 pt-4 pb-3 bg-[#111111]">
      {/* Back + Name */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
        <Link href="/admin/users" className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-[#1E1E1E] border border-[#2A2A2A]">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{user.firstName} {user.lastName}</h1>
          <p className="text-xs text-white/40 truncate">{user.email}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${user.planStatus === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {user.plan}
          </span>
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${user.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
            {user.isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Avg Daily Cals */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-3 flex items-center gap-2">
          <MiniRing pct={calPct} color="#E51A1A" size={36} />
          <div className="min-w-0">
            <p className="text-xs text-white/40 truncate">Avg Cals</p>
            <p className="text-sm font-bold">{user.avgDailyCals.toLocaleString()}</p>
          </div>
        </div>
        {/* Avg Daily Steps */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-3">
          <p className="text-xs text-white/40">Avg Steps</p>
          <p className="text-sm font-bold">{user.avgDailySteps.toLocaleString()}</p>
        </div>
        {/* Weight Change */}
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-3">
          <p className="text-xs text-white/40">Wt Change</p>
          {user.weightChange !== null ? (
            <p className={`text-sm font-bold ${
              (isLossGoal && user.weightChange < 0) || (!isLossGoal && user.weightChange > 0)
                ? "text-green-400" : (user.weightChange === 0 ? "text-white/60" : "text-red-400")
            }`}>
              {user.weightChange > 0 ? "+" : ""}{user.weightChange} kg
            </p>
          ) : <p className="text-sm text-white/30">--</p>}
        </div>
      </div>

      {/* Alert Badges */}
      <div className="flex flex-wrap gap-2">
        {user.hoursSinceLastLog !== null && user.hoursSinceLastLog > 48 && (
          <span className="text-[11px] bg-orange-500/20 text-orange-400 px-2.5 py-1 rounded-full font-medium">
            No activity for {user.hoursSinceLastLog}h
          </span>
        )}
        {user.unreadMessages > 0 && (
          <span className="text-[11px] bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full font-medium">
            {user.unreadMessages} unread message{user.unreadMessages > 1 ? "s" : ""}
          </span>
        )}
        <span className="text-[11px] text-white/30 px-2.5 py-1">
          Joined {fmtDate(user.createdAt)}
        </span>
      </div>
    </div>
  );
}

/* ─── Overview Tab ───────────────────────────────────────────────────── */

function OverviewTab({ user, notifTitle, notifMsg, setNotifTitle, setNotifMsg, sendNotification, sending }: {
  user: UserData; notifTitle: string; notifMsg: string;
  setNotifTitle: (v: string) => void; setNotifMsg: (v: string) => void;
  sendNotification: () => void; sending: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [healthForm, setHealthForm] = useState({
    age: user.age?.toString() || "",
    gender: user.gender || "",
    heightCm: user.heightCm?.toString() || "",
    currentWeightKg: user.currentWeightKg?.toString() || "",
    bodyFatPercent: user.bodyFatPercent?.toString() || "",
    fitnessGoal: user.fitnessGoal || "",
    activityLevel: user.activityLevel || "",
    targetWeightKg: user.targetWeightKg?.toString() || "",
    dietaryPrefs: user.dietaryPrefs || "",
  });

  const saveHealth = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: healthForm.age ? parseInt(healthForm.age) : null,
          gender: healthForm.gender || null,
          heightCm: healthForm.heightCm ? parseFloat(healthForm.heightCm) : null,
          currentWeightKg: healthForm.currentWeightKg ? parseFloat(healthForm.currentWeightKg) : null,
          bodyFatPercent: healthForm.bodyFatPercent ? parseFloat(healthForm.bodyFatPercent) : null,
          fitnessGoal: healthForm.fitnessGoal || null,
          activityLevel: healthForm.activityLevel || null,
          targetWeightKg: healthForm.targetWeightKg ? parseFloat(healthForm.targetWeightKg) : null,
          dietaryPrefs: healthForm.dietaryPrefs || null,
        }),
      });
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        alert("Failed to save");
      }
    } catch { alert("Failed to save health profile"); }
    setSaving(false);
  };

  const inputCls = "w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 min-h-[44px]";

  return (
    <div className="space-y-4">
      {/* Macro Targets */}
      {user.macroTarget && (
        <Card title="Macro Targets">
          <div className="grid grid-cols-2 gap-3">
            <MacroItem label="Calories" value={`${user.macroTarget.calories} kcal`} color="#E51A1A" />
            <MacroItem label="Protein" value={`${user.macroTarget.protein}g`} color="#4CAF50" />
            <MacroItem label="Carbs" value={`${user.macroTarget.carbs}g`} color="#FFB800" />
            <MacroItem label="Fat" value={`${user.macroTarget.fat}g`} color="#FF6B00" />
          </div>
          <p className="text-xs text-white/30 mt-2">Goal: {user.macroTarget.goal}</p>
        </Card>
      )}

      {/* Health Profile - Editable */}
      <Card title="Health Profile">
        {!editing ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <InfoRow label="Age" value={user.age ? `${user.age}` : "--"} />
              <InfoRow label="Gender" value={user.gender || "--"} />
              <InfoRow label="Height" value={user.heightCm ? `${user.heightCm} cm` : "--"} />
              <InfoRow label="Weight" value={user.currentWeightKg ? `${user.currentWeightKg} kg` : "--"} />
              <InfoRow label="Body Fat" value={user.bodyFatPercent ? `${user.bodyFatPercent}%` : "--"} />
              <InfoRow label="Target Wt" value={user.targetWeightKg ? `${user.targetWeightKg} kg` : "--"} />
              <InfoRow label="Goal" value={user.fitnessGoal?.replace(/_/g, " ") || "--"} />
              <InfoRow label="Activity" value={user.activityLevel?.replace(/_/g, " ") || "--"} />
            </div>
            {user.dietaryPrefs && <p className="text-xs text-white/40 mt-2">Dietary: {user.dietaryPrefs}</p>}
            <button onClick={() => setEditing(true)}
              className="mt-3 w-full min-h-[44px] bg-[#2A2A2A] hover:bg-[#333] text-white/70 text-sm font-medium rounded-lg transition-colors cursor-pointer">
              Edit Health Profile
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/40 mb-1 block">Age</label>
                <input type="number" value={healthForm.age} onChange={e => setHealthForm({ ...healthForm, age: e.target.value })}
                  placeholder="Age" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Gender</label>
                <div className="flex gap-2">
                  {["male", "female"].map(g => (
                    <button key={g} onClick={() => setHealthForm({ ...healthForm, gender: g })}
                      className={`flex-1 min-h-[44px] rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        healthForm.gender === g ? "bg-[#E51A1A] text-white" : "bg-[#0A0A0A] border border-[#2A2A2A] text-white/50"
                      }`}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Height (cm)</label>
                <input type="number" step="0.1" value={healthForm.heightCm} onChange={e => setHealthForm({ ...healthForm, heightCm: e.target.value })}
                  placeholder="Height cm" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Weight (kg)</label>
                <input type="number" step="0.1" value={healthForm.currentWeightKg} onChange={e => setHealthForm({ ...healthForm, currentWeightKg: e.target.value })}
                  placeholder="Weight kg" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Body Fat %</label>
                <input type="number" step="0.1" value={healthForm.bodyFatPercent} onChange={e => setHealthForm({ ...healthForm, bodyFatPercent: e.target.value })}
                  placeholder="Body fat %" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Target Weight (kg)</label>
                <input type="number" step="0.1" value={healthForm.targetWeightKg} onChange={e => setHealthForm({ ...healthForm, targetWeightKg: e.target.value })}
                  placeholder="Target weight" className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Fitness Goal</label>
                <select value={healthForm.fitnessGoal} onChange={e => setHealthForm({ ...healthForm, fitnessGoal: e.target.value })} className={inputCls}>
                  <option value="">Select goal</option>
                  <option value="fat_loss">Fat Loss</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="recomp">Body Recomp</option>
                  <option value="general_fitness">General Fitness</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1 block">Activity Level</label>
                <select value={healthForm.activityLevel} onChange={e => setHealthForm({ ...healthForm, activityLevel: e.target.value })} className={inputCls}>
                  <option value="">Select level</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="lightly_active">Lightly Active</option>
                  <option value="moderately_active">Moderately Active</option>
                  <option value="very_active">Very Active</option>
                  <option value="extremely_active">Extremely Active</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Dietary Preferences</label>
              <input type="text" value={healthForm.dietaryPrefs} onChange={e => setHealthForm({ ...healthForm, dietaryPrefs: e.target.value })}
                placeholder="e.g. halal, vegetarian, keto" className={inputCls} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="flex-1 min-h-[44px] bg-[#2A2A2A] text-white/60 text-sm rounded-lg cursor-pointer hover:bg-[#333]">
                Cancel
              </button>
              <button onClick={saveHealth} disabled={saving}
                className="flex-1 min-h-[44px] bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white text-sm font-semibold rounded-lg cursor-pointer">
                {saving ? "Saving..." : "Save Health Profile"}
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Favourites */}
      {user.favourites.length > 0 && (
        <Card title={`Favourite Recipes (${user.favourites.length})`}>
          <div className="space-y-2">
            {user.favourites.slice(0, 8).map(f => (
              <div key={f.id} className="flex items-center justify-between min-h-[44px] py-1">
                <Link href={`/recipes/${f.recipe.slug}`} className="text-sm text-white/80 hover:text-[#E51A1A] transition-colors truncate flex-1 mr-3">
                  {f.recipe.title}
                </Link>
                <span className="text-xs text-white/30 shrink-0">{f.recipe.calories} kcal</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Send Notification */}
      <Card title="Send Notification">
        <div className="space-y-3">
          <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Title"
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Message"
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[80px] resize-none" />
          <button onClick={sendNotification} disabled={sending || !notifTitle.trim() || !notifMsg.trim()}
            className="w-full min-h-[44px] bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
            {sending ? "Sending..." : "Send Notification"}
          </button>
        </div>
      </Card>

      {/* Payment Info */}
      {user.paymentScreenshot && (
        <Card title="Payment Info">
          {user.paymentAccountName && <p className="text-sm text-white/60 mb-2">Account: {user.paymentAccountName}</p>}
          <img src={user.paymentScreenshot} alt="Payment" className="rounded-lg max-h-60 object-contain w-full" />
        </Card>
      )}
    </div>
  );
}

/* ─── Plans Tab ──────────────────────────────────────────────────────── */

function PlansTab({ userId, activePlan, planTemplates, onRefresh }: {
  userId: string; activePlan: ActivePlan | null; planTemplates: PlanTemplate[]; onRefresh: () => void;
}) {
  if (activePlan) {
    return <ActivePlanView userId={userId} plan={activePlan} onRefresh={onRefresh} />;
  }
  return <AssignPlanForm userId={userId} templates={planTemplates} onRefresh={onRefresh} />;
}

function ActivePlanView({ userId, plan, onRefresh }: {
  userId: string; plan: ActivePlan; onRefresh: () => void;
}) {
  const [updating, setUpdating] = useState(false);

  const maxWeek = Math.max(...plan.days.map(d => d.weekNumber), 1);
  const today = new Date().toISOString().slice(0, 10);

  // Build a set of completed dates
  const completedDates = new Set(
    plan.progress
      .filter(p => p.workoutCompleted || p.breakfastCompleted || p.lunchCompleted || p.snackCompleted || p.dinnerCompleted)
      .map(p => p.date.slice(0, 10))
  );

  // Compute which calendar date each plan day corresponds to
  const planStart = new Date(plan.startDate);
  function getDayDate(weekNum: number, dayOfWeek: number) {
    const d = new Date(planStart);
    d.setDate(d.getDate() + (weekNum - 1) * 7 + (dayOfWeek - 1));
    return d.toISOString().slice(0, 10);
  }

  const totalDays = plan.days.length;
  const completedCount = plan.days.filter(d => completedDates.has(getDayDate(d.weekNumber, d.dayOfWeek))).length;
  const pastDays = plan.days.filter(d => getDayDate(d.weekNumber, d.dayOfWeek) < today).length;
  const missedCount = pastDays - completedCount;
  const adherencePct = pastDays > 0 ? Math.round((completedCount / pastDays) * 100) : 0;

  const updateStatus = async (status: string) => {
    if (!confirm(`${status === "paused" ? "Pause" : "Complete"} this plan?`)) return;
    setUpdating(true);
    try {
      await fetch(`/api/admin/users/${userId}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      onRefresh();
    } catch { alert("Failed to update plan"); }
    setUpdating(false);
  };

  return (
    <div className="space-y-4">
      {/* Plan Header */}
      <Card title="Active Plan">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-base font-bold">{plan.name}</h4>
            {plan.description && <p className="text-xs text-white/40 mt-0.5">{plan.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 capitalize">{plan.type}</span>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-green-500/20 text-green-400 capitalize">{plan.status}</span>
          </div>
        </div>
        <p className="text-xs text-white/40">Started {fmtDate(plan.startDate)}</p>
      </Card>

      {/* Adherence Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Completed" value={`${completedCount}/${pastDays}`} color={adherencePct >= 80 ? "text-green-400" : adherencePct >= 50 ? "text-yellow-400" : "text-red-400"} />
        <StatCard label="Missed" value={`${missedCount}`} color={missedCount === 0 ? "text-green-400" : "text-orange-400"} />
        <StatCard label="Adherence" value={`${adherencePct}%`} color={adherencePct >= 80 ? "text-green-400" : adherencePct >= 50 ? "text-yellow-400" : "text-red-400"} />
      </div>

      {/* Week x Day Grid */}
      {Array.from({ length: maxWeek }, (_, wi) => {
        const weekNum = wi + 1;
        const weekDays = plan.days.filter(d => d.weekNumber === weekNum);
        return (
          <Card key={weekNum} title={`Week ${weekNum}`}>
            <div className="grid grid-cols-7 gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map(dow => {
                const day = weekDays.find(d => d.dayOfWeek === dow);
                const dayDate = getDayDate(weekNum, dow);
                const isCompleted = completedDates.has(dayDate);
                const isPast = dayDate < today;
                const isToday = dayDate === today;
                const isMissed = isPast && !isCompleted && !!day;

                return (
                  <div key={dow} className={`rounded-lg p-1.5 text-center text-[10px] min-h-[52px] flex flex-col items-center justify-center border ${
                    isToday ? "border-[#E51A1A] bg-[#E51A1A]/10" :
                    isCompleted ? "border-green-500/30 bg-green-500/10" :
                    isMissed ? "border-orange-500/30 bg-orange-500/10" :
                    "border-[#2A2A2A] bg-[#0A0A0A]"
                  } ${!day ? "opacity-30" : ""}`}>
                    <span className="text-white/40 font-medium">{DAY_NAMES[dow]}</span>
                    {day && (
                      <>
                        {isCompleted && <span className="text-green-400 text-sm mt-0.5">&#10003;</span>}
                        {isMissed && <span className="text-orange-400 text-sm mt-0.5">&#10007;</span>}
                        {!isPast && !isToday && <span className="text-white/20 text-sm mt-0.5">-</span>}
                        {day.workoutTitle && <span className="text-white/50 truncate w-full">{day.workoutTitle}</span>}
                        {day.meals && day.meals.length > 0 && <span className="text-green-400/70 truncate w-full">{day.meals.length} recipe{day.meals.length !== 1 ? "s" : ""}</span>}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={() => updateStatus("paused")} disabled={updating}
          className="flex-1 min-h-[44px] bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-40">
          {updating ? "..." : "Pause Plan"}
        </button>
        <button onClick={() => updateStatus("completed")} disabled={updating}
          className="flex-1 min-h-[44px] bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm font-semibold rounded-lg cursor-pointer disabled:opacity-40">
          {updating ? "..." : "Complete Plan"}
        </button>
      </div>
    </div>
  );
}

function AssignPlanForm({ userId, templates, onRefresh }: {
  userId: string; templates: PlanTemplate[]; onRefresh: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(getMonday());
  const [assigning, setAssigning] = useState(false);

  const selected = templates.find(t => t.id === selectedId);

  const assignPlan = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/admin/plans/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          templateId: selected.id,
          name: selected.name,
          description: selected.description,
          type: selected.type,
          startDate,
        }),
      });
      if (res.ok) {
        alert("Plan assigned successfully!");
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to assign plan");
      }
    } catch { alert("Failed to assign plan"); }
    setAssigning(false);
  };

  const inputCls = "w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]";

  return (
    <div className="space-y-4">
      <Card title="Assign Plan">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 mb-1 block">Plan Template</label>
            <select value={selectedId ?? ""} onChange={e => setSelectedId(e.target.value ? parseInt(e.target.value) : null)} className={inputCls}>
              <option value="">Select a plan template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} -- {t.durationWeeks}w, {t.dayCount} days ({t.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputCls} />
          </div>

          {/* Template Preview */}
          {selected && (
            <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg p-3">
              <h4 className="text-sm font-semibold mb-1">{selected.name}</h4>
              {selected.description && <p className="text-xs text-white/40 mb-2">{selected.description}</p>}
              <div className="flex gap-3 text-xs text-white/50">
                <span>Duration: {selected.durationWeeks} weeks</span>
                <span>Days: {selected.dayCount}</span>
                <span className="capitalize">Type: {selected.type}</span>
              </div>
            </div>
          )}

          <button onClick={assignPlan} disabled={assigning || !selected}
            className="w-full min-h-[44px] bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer">
            {assigning ? "Assigning..." : "Assign Plan"}
          </button>
        </div>
      </Card>

      {templates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-white/30 text-sm mb-2">No plan templates available.</p>
          <Link href="/admin/plans" className="text-[#E51A1A] text-sm hover:underline">
            Create a plan template
          </Link>
        </div>
      )}
    </div>
  );
}

/* ─── Targets Tab ────────────────────────────────────────────────────── */

const TARGET_METRICS = [
  { value: "weight", label: "Weight (kg)" },
  { value: "belly", label: "Belly (in)" },
  { value: "waist", label: "Waist (in)" },
  { value: "chest", label: "Chest (in)" },
  { value: "hips", label: "Hips (in)" },
  { value: "arms", label: "Arms (in)" },
  { value: "steps", label: "Steps" },
];

function TargetsTab({ userId, weeklyTargets, onRefresh }: {
  userId: string; weeklyTargets: WeeklyTargetData[]; onRefresh: () => void;
}) {
  const [grid, setGrid] = useState<Record<string, { value: string; visible: boolean }>>(
    Object.fromEntries(TARGET_METRICS.map(m => [m.value, { value: "", visible: true }]))
  );
  const [saving, setSaving] = useState(false);

  // Pre-fill grid from existing targets (permanent, not weekly)
  useEffect(() => {
    const newGrid = Object.fromEntries(TARGET_METRICS.map(m => [m.value, { value: "", visible: true }]));
    for (const t of weeklyTargets) {
      if (newGrid[t.metric]) {
        newGrid[t.metric] = { value: String(t.targetValue), visible: t.isVisible };
      }
    }
    setGrid(newGrid);
  }, [weeklyTargets]);

  const updateGrid = (metric: string, field: "value" | "visible", val: string | boolean) => {
    setGrid(prev => ({ ...prev, [metric]: { ...prev[metric], [field]: val } }));
  };

  const saveTargets = async () => {
    const filled = TARGET_METRICS.filter(m => grid[m.value]?.value).map(m => ({
      metric: m.value,
      targetValue: parseFloat(grid[m.value].value),
      isVisible: grid[m.value].visible,
    }));
    if (filled.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets: filled }),
      });
      if (res.ok) {
        alert("Targets saved!");
        onRefresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save targets");
      }
    } catch { alert("Failed to save targets"); }
    setSaving(false);
  };

  const filledCount = TARGET_METRICS.filter(m => grid[m.value]?.value).length;

  return (
    <div className="space-y-4">
      <Card title="Set Targets">
        <div className="space-y-4">
          {/* Fixed 7-metric grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TARGET_METRICS.map(m => {
              const g = grid[m.value] || { value: "", visible: true };
              const hasValue = !!g.value;
              return (
                <div key={m.value} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 border transition-colors ${
                  hasValue ? "bg-[#0A0A0A] border-[#E51A1A]/20" : "bg-[#0A0A0A]/50 border-[#2A2A2A]"
                }`}>
                  <span className="text-xs font-medium text-white/60 w-20 shrink-0">{m.label}</span>
                  <input type="number" step="any" value={g.value}
                    onChange={e => updateGrid(m.value, "value", e.target.value)}
                    placeholder="—"
                    className="flex-1 bg-transparent border-none text-sm text-white placeholder-white/20 focus:outline-none text-right min-w-0 w-16" />
                  <button onClick={() => updateGrid(m.value, "visible", !g.visible)}
                    className={`w-7 h-7 flex items-center justify-center rounded border cursor-pointer shrink-0 ${
                      g.visible ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-[#2A2A2A] text-white/20"
                    }`} title={g.visible ? "Visible to user" : "Hidden"}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {g.visible ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M3 3l18 18" />
                      )}
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={saveTargets} disabled={saving || filledCount === 0}
            className="w-full min-h-[44px] bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer border-none">
            {saving ? "Saving..." : `Save ${filledCount} Target${filledCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </Card>

      {/* Target-Centric Progress View */}
      {weeklyTargets.length > 0 && (
        <Card title="Current Progress">
          <div className="grid grid-cols-2 gap-3">
            {weeklyTargets.map(t => {
              const hasCurrent = t.currentValue !== null;
              const delta = hasCurrent ? Math.round((t.currentValue! - t.targetValue) * 10) / 10 : 0;
              const absDelta = Math.abs(delta);
              const isOnTarget = hasCurrent && delta === 0;
              const isAbove = hasCurrent && delta > 0;
              const isSteps = t.metric === "steps";
              const statusColor = isOnTarget ? "#22C55E" : isAbove ? (isSteps ? "#22C55E" : "#FF6B00") : "#3B82F6";
              const unit = t.metric === "weight" ? "kg" : t.metric === "steps" ? "" : "in";
              const icons: Record<string, string> = { weight: "⚖️", belly: "📏", waist: "📐", chest: "🫁", hips: "🦵", arms: "💪", steps: "👟" };

              return (
                <div key={t.id} className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{icons[t.metric] || "🎯"}</span>
                    <span className="text-[10px] font-semibold text-white/50 uppercase">{t.metric}</span>
                    {!t.isVisible && <span className="text-[8px] px-1 py-0.5 rounded bg-white/10 text-white/30">Hidden</span>}
                  </div>
                  <p className="text-xl font-black text-white">{t.targetValue.toLocaleString()} <span className="text-[10px] text-white/30">{unit}</span></p>
                  {hasCurrent ? (
                    <>
                      <p className="text-xs text-white/40 mt-0.5">Now: <span className="font-semibold" style={{ color: statusColor }}>{t.currentValue!.toLocaleString()}</span></p>
                      <p className="text-[10px] font-medium mt-1" style={{ color: statusColor }}>
                        {isOnTarget && "✓ On Target"}
                        {isAbove && isSteps && `✓ ${absDelta.toLocaleString()} above!`}
                        {isAbove && !isSteps && `↑ Above by ${absDelta.toLocaleString()} ${unit}`}
                        {!isOnTarget && !isAbove && hasCurrent && `↓ Below by ${absDelta.toLocaleString()} ${unit}`}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-white/20 mt-0.5">No data yet</p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {weeklyTargets.length === 0 && (
        <EmptyState text="No targets set yet" />
      )}
    </div>
  );
}

/* ─── Analytics Tab ─────────────────────────────────────────────────── */

function AnalyticsTab({ mealLogs, weightLogs, stepLogs }: {
  mealLogs: MealLog[]; weightLogs: WeightLog[]; stepLogs: StepLog[];
}) {
  const [range, setRange] = useState("30d");

  const days = range === "1d" ? 1 : range === "7d" ? 7 : range === "30d" ? 30 : range === "180d" ? 180 : 365;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const filteredMeals = mealLogs.filter(m => new Date(m.loggedDate) >= cutoff);
  const filteredWeights = weightLogs.filter(w => new Date(w.loggedDate) >= cutoff);
  const filteredSteps = stepLogs.filter(s => new Date(s.loggedDate) >= cutoff);

  // Daily calorie totals
  const calorieByDay: Record<string, number> = {};
  for (const m of filteredMeals) {
    const d = m.loggedDate.slice(0, 10);
    calorieByDay[d] = (calorieByDay[d] || 0) + m.calories;
  }
  const calDays = Object.entries(calorieByDay).sort(([a], [b]) => a.localeCompare(b));
  const avgCal = calDays.length > 0 ? Math.round(calDays.reduce((s, [, v]) => s + v, 0) / calDays.length) : 0;

  // Weight trend
  const sortedWeights = [...filteredWeights].sort((a, b) => a.loggedDate.localeCompare(b.loggedDate));
  const firstWeight = sortedWeights[0]?.weightKg;
  const lastWeight = sortedWeights[sortedWeights.length - 1]?.weightKg;
  const weightChange = firstWeight && lastWeight ? Math.round((lastWeight - firstWeight) * 10) / 10 : null;

  // Step stats
  const avgSteps = filteredSteps.length > 0 ? Math.round(filteredSteps.reduce((s, l) => s + l.steps, 0) / filteredSteps.length) : 0;

  // Consistency
  const mealDays = new Set(filteredMeals.map(m => m.loggedDate.slice(0, 10))).size;

  const rangeLabel = range === "7d" ? "7 days" : range === "30d" ? "30 days" : range === "180d" ? "6 months" : range === "1y" ? "year" : "today";

  return (
    <div className="space-y-4">
      {/* Range filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Trends & Insights</h3>
        <TimeRangeFilter value={range} onChange={setRange} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/40 uppercase font-semibold">Avg Calories</p>
          <p className="text-xl font-black text-white">{avgCal.toLocaleString()}</p>
          <p className="text-[9px] text-white/25">per day ({rangeLabel})</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/40 uppercase font-semibold">Weight Change</p>
          <p className={`text-xl font-black ${weightChange !== null ? (weightChange < 0 ? "text-green-400" : weightChange > 0 ? "text-[#E51A1A]" : "text-white") : "text-white/30"}`}>
            {weightChange !== null ? `${weightChange > 0 ? "+" : ""}${weightChange} kg` : "--"}
          </p>
          <p className="text-[9px] text-white/25">{rangeLabel}</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/40 uppercase font-semibold">Avg Steps</p>
          <p className="text-xl font-black text-white">{avgSteps.toLocaleString()}</p>
          <p className="text-[9px] text-white/25">per day ({rangeLabel})</p>
        </div>
        <div className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl p-3 text-center">
          <p className="text-[10px] text-white/40 uppercase font-semibold">Days Logged</p>
          <p className="text-xl font-black text-white">{mealDays}</p>
          <p className="text-[9px] text-white/25">out of {days}</p>
        </div>
      </div>

      {/* Calorie trend */}
      {calDays.length > 0 && (
        <Card title={`Daily Calories (${rangeLabel})`}>
          <div className="flex items-end gap-0.5 h-32">
            {calDays.slice(-30).map(([date, cal]) => {
              const maxCal = Math.max(...calDays.slice(-30).map(([, v]) => v), 1);
              const h = (cal / maxCal) * 100;
              return (
                <div key={date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${date}: ${cal} kcal`}>
                  <div className="w-full bg-[#E51A1A]/80 rounded-t-sm transition-all" style={{ height: `${h}%`, minHeight: 2 }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/20">{calDays[Math.max(0, calDays.length - 30)]?.[0]?.slice(5)}</span>
            <span className="text-[9px] text-white/20">{calDays[calDays.length - 1]?.[0]?.slice(5)}</span>
          </div>
        </Card>
      )}

      {/* Weight trend */}
      {sortedWeights.length > 1 && (
        <Card title={`Weight Trend (${rangeLabel})`}>
          <div className="flex items-end gap-0.5 h-24">
            {sortedWeights.slice(-30).map((w, i) => {
              const minW = Math.min(...sortedWeights.slice(-30).map(x => x.weightKg));
              const maxW = Math.max(...sortedWeights.slice(-30).map(x => x.weightKg));
              const range = maxW - minW || 1;
              const h = ((w.weightKg - minW) / range) * 80 + 20;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${w.loggedDate.slice(0, 10)}: ${w.weightKg} kg`}>
                  <div className="w-full bg-[#FF6B00]/80 rounded-t-sm" style={{ height: `${h}%`, minHeight: 2 }} />
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-white/30 mt-2 text-center">
            {firstWeight} kg → {lastWeight} kg
            <span className={`ml-2 font-semibold ${weightChange !== null && weightChange < 0 ? "text-green-400" : "text-[#E51A1A]"}`}>
              ({weightChange !== null ? `${weightChange > 0 ? "+" : ""}${weightChange} kg` : "--"})
            </span>
          </p>
        </Card>
      )}

      {/* Step trend */}
      {filteredSteps.length > 0 && (
        <Card title={`Steps Trend (${rangeLabel})`}>
          <div className="flex items-end gap-0.5 h-24">
            {[...filteredSteps].sort((a, b) => a.loggedDate.localeCompare(b.loggedDate)).slice(-30).map((s, i) => {
              const maxS = Math.max(...filteredSteps.map(x => x.steps), 1);
              const h = (s.steps / maxS) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full" title={`${s.loggedDate.slice(0, 10)}: ${s.steps.toLocaleString()}`}>
                  <div className="w-full bg-[#FFB800]/80 rounded-t-sm" style={{ height: `${h}%`, minHeight: 2 }} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {filteredMeals.length === 0 && filteredWeights.length === 0 && filteredSteps.length === 0 && (
        <EmptyState text={`No data in the last ${rangeLabel}`} />
      )}
    </div>
  );
}

/* ─── Meals Tab ──────────────────────────────────────────────────────── */

function MealsTab({ meals, userId, macroTarget, onDelete, onRefresh }: {
  meals: MealLog[]; userId: string; macroTarget: UserData["macroTarget"];
  onDelete: (id: number) => void; onRefresh: () => void;
}) {
  const [range, setRange] = useState("7d");
  const [addOpen, setAddOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => filterByRange(meals, range), [meals, range]);

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, MealLog[]>();
    filtered.forEach(m => {
      const day = m.loggedDate.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(m);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const toggleDay = (day: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <TimeRangeFilter value={range} onChange={setRange} options={[
          { label: "7d", value: "7d" }, { label: "30d", value: "30d" },
          { label: "90d", value: "90d" }, { label: "All", value: "all" },
        ]} />
        <button onClick={() => setAddOpen(!addOpen)}
          className="min-h-[44px] px-4 bg-[#E51A1A] hover:bg-[#c41717] text-white text-sm font-semibold rounded-lg shrink-0 cursor-pointer">
          + Add
        </button>
      </div>

      {addOpen && <AddMealForm userId={userId} onClose={() => setAddOpen(false)} onRefresh={onRefresh} />}

      {grouped.length === 0 && <EmptyState text="No meals logged" />}

      {grouped.map(([day, dayMeals]) => {
        const totalCals = dayMeals.reduce((s, m) => s + m.calories, 0);
        const isOpen = expandedDays.has(day);
        return (
          <div key={day} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl overflow-hidden">
            <button onClick={() => toggleDay(day)}
              className="w-full flex items-center justify-between px-4 py-3 min-h-[48px] cursor-pointer hover:bg-[#252525] transition-colors">
              <div className="flex items-center gap-2">
                <svg className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-sm font-semibold">{fmtDate(day)}</span>
                <span className="text-xs text-white/40">{dayMeals.length} meal{dayMeals.length > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${macroTarget && totalCals > macroTarget.calories ? "text-red-400" : "text-white/80"}`}>
                  {totalCals.toLocaleString()} kcal
                </span>
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-[#2A2A2A]">
                {dayMeals.map(m => (
                  <div key={m.id} className="px-4 py-3 border-b border-[#2A2A2A]/50 last:border-b-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: mealTypeColor[m.mealType] || "#888" }} />
                          <span className="text-xs font-medium text-white/50">{m.mealType}</span>
                          <span className="text-xs text-white/30">{m.loggedTime}</span>
                        </div>
                        <p className="text-sm text-white/80 line-clamp-2">{m.description}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-xs font-semibold text-white/60">{m.calories} kcal</span>
                          <span className="text-xs text-green-400">P {m.protein}g</span>
                          <span className="text-xs text-yellow-400">C {m.carbs}g</span>
                          <span className="text-xs text-orange-400">F {m.fat}g</span>
                        </div>
                      </div>
                      <button onClick={() => onDelete(m.id)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400/60 hover:text-red-400 cursor-pointer">
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Add Meal Form ──────────────────────────────────────────────────── */

function AddMealForm({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [form, setForm] = useState({ description: "", mealType: "Snack", calories: "", protein: "", carbs: "", fat: "", date: new Date().toISOString().slice(0, 10), time: "12:00" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.description || !form.calories) return;
    setSaving(true);
    try {
      await fetch("/api/admin/user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, type: "meal",
          data: {
            description: form.description, mealType: form.mealType,
            calories: parseInt(form.calories), protein: parseFloat(form.protein) || 0,
            carbs: parseFloat(form.carbs) || 0, fat: parseFloat(form.fat) || 0,
            loggedDate: form.date, loggedTime: form.time,
          },
        }),
      });
      onClose(); onRefresh();
    } catch { alert("Failed to add meal"); }
    setSaving(false);
  };

  return (
    <Card title="Add Meal">
      <div className="space-y-3">
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
        <select value={form.mealType} onChange={e => setForm({ ...form, mealType: e.target.value })}
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]">
          {["Breakfast", "Lunch", "Dinner", "Snack"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.calories} onChange={e => setForm({ ...form, calories: e.target.value })} placeholder="Calories" type="number"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.protein} onChange={e => setForm({ ...form, protein: e.target.value })} placeholder="Protein (g)" type="number"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.carbs} onChange={e => setForm({ ...form, carbs: e.target.value })} placeholder="Carbs (g)" type="number"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.fat} onChange={e => setForm({ ...form, fat: e.target.value })} placeholder="Fat (g)" type="number"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} type="date"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]" />
          <input value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} type="time"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 min-h-[44px] bg-[#2A2A2A] text-white/60 text-sm rounded-lg cursor-pointer hover:bg-[#333]">Cancel</button>
          <button onClick={submit} disabled={saving || !form.description || !form.calories}
            className="flex-1 min-h-[44px] bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white text-sm font-semibold rounded-lg cursor-pointer">
            {saving ? "Saving..." : "Add Meal"}
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Weight Tab ─────────────────────────────────────────────────────── */

function WeightTab({ logs, userId, fitnessGoal, onDelete, onRefresh }: {
  logs: WeightLog[]; userId: string; fitnessGoal: string | null;
  onDelete: (id: number) => void; onRefresh: () => void;
}) {
  const [range, setRange] = useState("90d");
  const [addOpen, setAddOpen] = useState(false);
  const filtered = useMemo(() => filterByRange(logs, range), [logs, range]);
  const sorted = useMemo(() => [...filtered].reverse(), [filtered]);
  const isLossGoal = fitnessGoal === "fat_loss" || fitnessGoal === "weight_loss";

  const startW = sorted[0]?.weightKg;
  const endW = sorted[sorted.length - 1]?.weightKg;
  const change = startW && endW ? Math.round((endW - startW) * 10) / 10 : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <TimeRangeFilter value={range} onChange={setRange} options={[
          { label: "30d", value: "30d" }, { label: "90d", value: "90d" }, { label: "All", value: "all" },
        ]} />
        <button onClick={() => setAddOpen(!addOpen)}
          className="min-h-[44px] px-4 bg-[#E51A1A] hover:bg-[#c41717] text-white text-sm font-semibold rounded-lg shrink-0 cursor-pointer">
          + Add
        </button>
      </div>

      {addOpen && <AddWeightForm userId={userId} onClose={() => setAddOpen(false)} onRefresh={onRefresh} />}

      {/* SVG Chart */}
      {sorted.length >= 2 && <WeightChart data={sorted} />}

      {/* Stats */}
      {change !== null && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Start" value={`${startW} kg`} />
          <StatCard label="Current" value={`${endW} kg`} />
          <StatCard label="Change" value={`${change > 0 ? "+" : ""}${change} kg`}
            color={(isLossGoal && change < 0) || (!isLossGoal && change > 0) ? "text-green-400" : change === 0 ? "text-white/60" : "text-red-400"} />
        </div>
      )}

      {filtered.length === 0 && <EmptyState text="No weight logs" />}

      {/* Card List */}
      {filtered.map((w, i) => {
        const prev = filtered[i + 1];
        const diff = prev ? Math.round((w.weightKg - prev.weightKg) * 10) / 10 : null;
        return (
          <div key={w.id} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl px-4 py-3 flex items-center justify-between min-h-[48px]">
            <div>
              <p className="text-sm font-semibold">{w.weightKg} kg</p>
              <p className="text-xs text-white/40">{fmtDate(w.loggedDate)}</p>
            </div>
            <div className="flex items-center gap-3">
              {diff !== null && (
                <span className={`text-xs font-semibold ${
                  (isLossGoal && diff < 0) || (!isLossGoal && diff > 0) ? "text-green-400" : diff === 0 ? "text-white/30" : "text-red-400"
                }`}>
                  {diff > 0 ? "+" : ""}{diff}
                </span>
              )}
              <button onClick={() => onDelete(w.id)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400/60 hover:text-red-400 cursor-pointer">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Weight Chart (SVG) ─────────────────────────────────────────────── */

function WeightChart({ data }: { data: WeightLog[] }) {
  const W = 600, H = 200, PX = 40, PY = 20;
  const min = Math.min(...data.map(d => d.weightKg)) - 1;
  const max = Math.max(...data.map(d => d.weightKg)) + 1;
  const xStep = data.length > 1 ? (W - PX * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: PX + i * xStep,
    y: PY + (H - PY * 2) - ((d.weightKg - min) / (max - min)) * (H - PY * 2),
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-3 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const y = PY + (H - PY * 2) * (1 - f);
          const val = (min + (max - min) * f).toFixed(1);
          return (
            <g key={f}>
              <line x1={PX} y1={y} x2={W - PX} y2={y} stroke="#2A2A2A" strokeWidth={0.5} />
              <text x={PX - 4} y={y + 3} fill="#666" fontSize={10} textAnchor="end">{val}</text>
            </g>
          );
        })}
        {/* Line */}
        <path d={line} fill="none" stroke="#E51A1A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="#E51A1A" />)}
      </svg>
    </div>
  );
}

/* ─── Add Weight Form ────────────────────────────────────────────────── */

function AddWeightForm({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), weight: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.weight) return;
    setSaving(true);
    try {
      await fetch("/api/admin/user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: "weight", data: { weightKg: parseFloat(form.weight), loggedDate: form.date } }),
      });
      onClose(); onRefresh();
    } catch { alert("Failed to add weight"); }
    setSaving(false);
  };

  return (
    <Card title="Add Weight">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} type="date"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]" />
          <input value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="Weight (kg)" type="number" step="0.1"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 min-h-[44px] bg-[#2A2A2A] text-white/60 text-sm rounded-lg cursor-pointer hover:bg-[#333]">Cancel</button>
          <button onClick={submit} disabled={saving || !form.weight}
            className="flex-1 min-h-[44px] bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white text-sm font-semibold rounded-lg cursor-pointer">
            {saving ? "Saving..." : "Add Weight"}
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Steps Tab ──────────────────────────────────────────────────────── */

function StepsTab({ logs, userId, onDelete, onRefresh }: {
  logs: StepLog[]; userId: string; onDelete: (id: number) => void; onRefresh: () => void;
}) {
  const [range, setRange] = useState("30d");
  const [addOpen, setAddOpen] = useState(false);
  const filtered = useMemo(() => filterByRange(logs, range), [logs, range]);
  const sorted = useMemo(() => [...filtered].reverse(), [filtered]);

  const avg = filtered.length > 0 ? Math.round(filtered.reduce((s, l) => s + l.steps, 0) / filtered.length) : 0;
  const best = filtered.length > 0 ? Math.max(...filtered.map(l => l.steps)) : 0;
  const goalMet = filtered.filter(l => l.steps >= l.goal).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <TimeRangeFilter value={range} onChange={setRange} options={[
          { label: "7d", value: "7d" }, { label: "30d", value: "30d" },
          { label: "90d", value: "90d" }, { label: "All", value: "all" },
        ]} />
        <button onClick={() => setAddOpen(!addOpen)}
          className="min-h-[44px] px-4 bg-[#E51A1A] hover:bg-[#c41717] text-white text-sm font-semibold rounded-lg shrink-0 cursor-pointer">
          + Add
        </button>
      </div>

      {addOpen && <AddStepForm userId={userId} onClose={() => setAddOpen(false)} onRefresh={onRefresh} />}

      {/* Bar Chart */}
      {sorted.length >= 2 && <StepBarChart data={sorted} />}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Avg Steps" value={avg.toLocaleString()} />
        <StatCard label="Best" value={best.toLocaleString()} />
        <StatCard label="Goal Met" value={`${goalMet}/${filtered.length}`} color={goalMet > filtered.length / 2 ? "text-green-400" : "text-white/60"} />
      </div>

      {filtered.length === 0 && <EmptyState text="No step logs" />}

      {/* Card List */}
      {filtered.map(s => {
        const pct = Math.round((s.steps / s.goal) * 100);
        return (
          <div key={s.id} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl px-4 py-3 flex items-center justify-between min-h-[48px]">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{s.steps.toLocaleString()}</p>
                <span className={`text-xs font-medium ${pct >= 100 ? "text-green-400" : "text-white/40"}`}>{pct}%</span>
              </div>
              <p className="text-xs text-white/40">{fmtDate(s.loggedDate)} &middot; Goal: {s.goal.toLocaleString()}</p>
            </div>
            <button onClick={() => onDelete(s.id)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400/60 hover:text-red-400 cursor-pointer">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Step Bar Chart ─────────────────────────────────────────────────── */

function StepBarChart({ data }: { data: StepLog[] }) {
  const W = 600, H = 180, PX = 10, PY = 20;
  const maxSteps = Math.max(...data.map(d => d.steps), ...data.map(d => d.goal));
  const barW = Math.max(4, (W - PX * 2) / data.length - 2);

  return (
    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-3 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {data.map((d, i) => {
          const x = PX + i * ((W - PX * 2) / data.length);
          const barH = (d.steps / maxSteps) * (H - PY * 2);
          const goalH = (d.goal / maxSteps) * (H - PY * 2);
          return (
            <g key={i}>
              <rect x={x} y={H - PY - barH} width={barW} height={barH} rx={2}
                fill={d.steps >= d.goal ? "#4CAF50" : "#E51A1A"} opacity={0.8} />
              <line x1={x} y1={H - PY - goalH} x2={x + barW} y2={H - PY - goalH} stroke="#FFB800" strokeWidth={1} strokeDasharray="3,2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─── Add Step Form ──────────────────────────────────────────────────── */

function AddStepForm({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), steps: "", goal: "10000" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.steps) return;
    setSaving(true);
    try {
      await fetch("/api/admin/user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type: "step", data: { steps: parseInt(form.steps), goal: parseInt(form.goal), loggedDate: form.date } }),
      });
      onClose(); onRefresh();
    } catch { alert("Failed to add steps"); }
    setSaving(false);
  };

  return (
    <Card title="Add Steps">
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} type="date"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]" />
          <input value={form.steps} onChange={e => setForm({ ...form, steps: e.target.value })} placeholder="Steps" type="number"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.goal} onChange={e => setForm({ ...form, goal: e.target.value })} placeholder="Goal" type="number"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 min-h-[44px] bg-[#2A2A2A] text-white/60 text-sm rounded-lg cursor-pointer hover:bg-[#333]">Cancel</button>
          <button onClick={submit} disabled={saving || !form.steps}
            className="flex-1 min-h-[44px] bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white text-sm font-semibold rounded-lg cursor-pointer">
            {saving ? "Saving..." : "Add Steps"}
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Body Tab (Measurements) ────────────────────────────────────────── */

function BodyTab({ measurements, userId, onDelete, onRefresh }: {
  measurements: BodyMeasurement[]; userId: string; onDelete: (id: number) => void; onRefresh: () => void;
}) {
  const [range, setRange] = useState("90d");
  const [addOpen, setAddOpen] = useState(false);
  const filtered = useMemo(() => filterByRange(measurements, range), [measurements, range]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <TimeRangeFilter value={range} onChange={setRange} options={[
          { label: "30d", value: "30d" }, { label: "90d", value: "90d" }, { label: "All", value: "all" },
        ]} />
        <button onClick={() => setAddOpen(!addOpen)}
          className="min-h-[44px] px-4 bg-[#E51A1A] hover:bg-[#c41717] text-white text-sm font-semibold rounded-lg shrink-0 cursor-pointer">
          + Add
        </button>
      </div>

      {addOpen && <AddMeasurementForm userId={userId} onClose={() => setAddOpen(false)} onRefresh={onRefresh} />}

      {filtered.length === 0 && <EmptyState text="No body measurements" />}

      {filtered.map(b => (
        <div key={b.id} className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">{fmtDate(b.loggedDate)}</p>
            <button onClick={() => onDelete(b.id)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-red-400/60 hover:text-red-400 cursor-pointer">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
            {b.weightKg && <MeasureItem label="Weight" value={`${b.weightKg} kg`} />}
            {b.bellyInches && <MeasureItem label="Belly" value={`${b.bellyInches}"`} />}
            {b.waistInches && <MeasureItem label="Waist" value={`${b.waistInches}"`} />}
            {b.chestInches && <MeasureItem label="Chest" value={`${b.chestInches}"`} />}
            {b.hipsInches && <MeasureItem label="Hips" value={`${b.hipsInches}"`} />}
            {b.armsInches && <MeasureItem label="Arms" value={`${b.armsInches}"`} />}
          </div>
          {b.notes && <p className="text-xs text-white/40 mt-2">{b.notes}</p>}
        </div>
      ))}
    </div>
  );
}

/* ─── Add Measurement Form ───────────────────────────────────────────── */

function AddMeasurementForm({ userId, onClose, onRefresh }: { userId: string; onClose: () => void; onRefresh: () => void }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10), weightKg: "", bellyInches: "",
    waistInches: "", chestInches: "", hipsInches: "", armsInches: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await fetch("/api/admin/user-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId, type: "measurement",
          data: {
            loggedDate: form.date,
            weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
            bellyInches: form.bellyInches ? parseFloat(form.bellyInches) : null,
            waistInches: form.waistInches ? parseFloat(form.waistInches) : null,
            chestInches: form.chestInches ? parseFloat(form.chestInches) : null,
            hipsInches: form.hipsInches ? parseFloat(form.hipsInches) : null,
            armsInches: form.armsInches ? parseFloat(form.armsInches) : null,
            notes: form.notes || null,
          },
        }),
      });
      onClose(); onRefresh();
    } catch { alert("Failed to add measurement"); }
    setSaving(false);
  };

  return (
    <Card title="Add Measurement">
      <div className="space-y-3">
        <input value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} type="date"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white min-h-[44px]" />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.weightKg} onChange={e => setForm({ ...form, weightKg: e.target.value })} placeholder="Weight (kg)" type="number" step="0.1"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.bellyInches} onChange={e => setForm({ ...form, bellyInches: e.target.value })} placeholder="Belly (in)" type="number" step="0.1"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.waistInches} onChange={e => setForm({ ...form, waistInches: e.target.value })} placeholder="Waist (in)" type="number" step="0.1"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.chestInches} onChange={e => setForm({ ...form, chestInches: e.target.value })} placeholder="Chest (in)" type="number" step="0.1"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.hipsInches} onChange={e => setForm({ ...form, hipsInches: e.target.value })} placeholder="Hips (in)" type="number" step="0.1"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <input value={form.armsInches} onChange={e => setForm({ ...form, armsInches: e.target.value })} placeholder="Arms (in)" type="number" step="0.1"
            className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
        </div>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes"
          className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 min-h-[60px] resize-none" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 min-h-[44px] bg-[#2A2A2A] text-white/60 text-sm rounded-lg cursor-pointer hover:bg-[#333]">Cancel</button>
          <button onClick={submit} disabled={saving}
            className="flex-1 min-h-[44px] bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white text-sm font-semibold rounded-lg cursor-pointer">
            {saving ? "Saving..." : "Add Measurement"}
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ─── Photos Tab ─────────────────────────────────────────────────────── */

/* ─── Messages Tab ───────────────────────────────────────────────────── */

function MessagesTab({ messages, msgText, setMsgText, sendMessage, sending }: {
  messages: Message[]; msgText: string; setMsgText: (v: string) => void;
  sendMessage: () => void; sending: boolean;
}) {
  const sorted = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      {/* Chat messages */}
      <div className="flex-1 space-y-3 mb-4">
        {sorted.length === 0 && <EmptyState text="No messages yet" />}
        {sorted.map(m => (
          <div key={m.id} className={`flex ${m.isSentByUser ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
              m.isSentByUser ? "bg-[#1E1E1E] border border-[#2A2A2A]" : "bg-[#E51A1A]/20 border border-[#E51A1A]/30"
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold text-white/50">{m.senderName}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${m.senderRole === "ADMIN" ? "bg-[#E51A1A]/20 text-[#E51A1A]" : "bg-white/10 text-white/40"}`}>
                  {m.senderRole === "ADMIN" ? "Admin" : "User"}
                </span>
              </div>
              <p className="text-sm text-white/80">{m.content}</p>
              {m.imageData && (
                <img src={m.imageData} alt="Attachment" className="mt-2 rounded-lg max-h-48 object-contain" />
              )}
              <p className="text-[10px] text-white/30 mt-1 text-right">
                {new Date(m.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Send message input */}
      <div className="sticky bottom-0 bg-[#0A0A0A] border-t border-[#2A2A2A] pt-3 pb-2">
        <div className="flex gap-2">
          <input value={msgText} onChange={e => setMsgText(e.target.value)} placeholder="Send a message..."
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 min-h-[44px]" />
          <button onClick={sendMessage} disabled={sending || !msgText.trim()}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-[#E51A1A] hover:bg-[#c41717] disabled:opacity-40 text-white rounded-xl cursor-pointer">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared UI Components ───────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl p-4 sm:p-6">
      <h3 className="text-sm font-semibold text-white/70 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function MacroItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 min-h-[36px]">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div>
        <p className="text-xs text-white/40">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center min-h-[28px]">
      <span className="text-white/40 text-xs">{label}</span>
      <span className="text-white/80 text-xs font-medium capitalize">{value}</span>
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-center">
      <p className="text-xs text-white/40">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function MeasureItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/40">{label}: </span>
      <span className="text-white/80 font-medium">{value}</span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-white/30 text-sm">{text}</p>
    </div>
  );
}
