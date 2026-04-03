"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import TimeRangeFilter from "@/components/ui/TimeRangeFilter";

const ADMIN_RANGE_OPTIONS = [
  { label: "Month", value: "30d" },
  { label: "3 Months", value: "90d" },
  { label: "Year", value: "1y" },
  { label: "All Time", value: "all" },
];

function adminRangeToDays(range: string): number {
  switch (range) {
    case "30d": return 30;
    case "90d": return 90;
    case "1y": return 365;
    default: return 0;
  }
}

function filterByRange<T extends { loggedDate: string }>(data: T[], range: string): T[] {
  const days = adminRangeToDays(range);
  if (days === 0) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return data.filter((d) => d.loggedDate.slice(0, 10) >= cutoffStr);
}

/* ── Types ─────────────────────────────────────────────────── */
interface MacroTarget {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: string;
}
interface MealLog {
  id: number;
  description: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedDate: string;
  loggedTime: string;
  imageData: string | null;
  ingredients: string | null;
}
interface WeightLog {
  id: number;
  weightKg: number;
  loggedDate: string;
}
interface ProgressPhoto {
  id: number;
  imageData: string;
  photoDate: string;
  notes: string;
}
interface FavouriteItem {
  id: number;
  recipe: { id: number; title: string; slug: string; calories: number; protein: number };
}
interface MessageItem {
  id: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName: string;
  receiverName: string;
  isSentByUser: boolean;
}
interface StepLog {
  id: number;
  steps: number;
  goal: number;
  loggedDate: string;
}
interface BodyMeasurement {
  id: number;
  loggedDate: string;
  weightKg: number | null;
  bellyInches: number | null;
  chestInches: number | null;
  waistInches: number | null;
  hipsInches: number | null;
  armsInches: number | null;
}

interface UserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  role: string;
  plan: string;
  planStatus: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  paymentScreenshot: string | null;
  paymentAccountName: string | null;
  paymentTransactionRef: string | null;
  // Health profile
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  currentWeightKg: number | null;
  bodyFatPercent: number | null;
  fitnessGoal: string | null;
  activityLevel: string | null;
  dietaryPrefs: string | null;
  healthConditions: string | null;
  targetWeightKg: number | null;
  macroTarget: MacroTarget | null;
  mealLogs: MealLog[];
  weightLogs: WeightLog[];
  progressPhotos: ProgressPhoto[];
  favourites: FavouriteItem[];
  messages: MessageItem[];
  stepLogs: StepLog[];
  bodyMeasurements: BodyMeasurement[];
  notifications: { id: number; title: string; message: string; type: string; isRead: boolean; createdAt: string }[];
}

type Tab = "overview" | "meals" | "weight" | "steps" | "measurements" | "photos" | "favourites" | "messages";

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-white/10 text-white/70",
  HUB: "bg-[#FF6B00]/20 text-[#FF6B00]",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-[#FFB800]/20 text-[#FFB800]",
  ACTIVE: "bg-green-500/20 text-green-400",
  EXPIRED: "bg-white/10 text-white/50",
  CANCELLED: "bg-red-500/20 text-red-400",
};

function formatLabel(s: string | null | undefined): string {
  if (!s) return "N/A";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseJsonArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function UserDetailClient({ user }: { user: UserData }) {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showNotifForm, setShowNotifForm] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifType, setNotifType] = useState("admin_alert");
  const [notifSending, setNotifSending] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState("");
  const [photoModal, setPhotoModal] = useState<string | null>(null);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "meals", label: "Meals" },
    { key: "weight", label: "Weight" },
    { key: "steps", label: "Steps" },
    { key: "measurements", label: "Measurements" },
    { key: "photos", label: "Photos" },
    { key: "favourites", label: "Favourites" },
    { key: "messages", label: "Messages" },
  ];

  const initials = `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase();

  async function handleSendNotification() {
    if (!notifTitle.trim() || !notifMessage.trim()) return;
    setNotifSending(true);
    setNotifSuccess("");
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          title: notifTitle,
          message: notifMessage,
          type: notifType,
        }),
      });
      if (res.ok) {
        setNotifSuccess("Notification sent successfully!");
        setNotifTitle("");
        setNotifMessage("");
        setTimeout(() => setNotifSuccess(""), 3000);
      }
    } catch {
      // ignore
    } finally {
      setNotifSending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Users
      </Link>

      {/* ── Profile Card ──────────────────────────────────── */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          {/* Avatar + Info */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#E51A1A] flex items-center justify-center text-white text-xl font-bold shrink-0">
                {initials || "?"}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </h1>
                <p className="text-sm text-white/50 mt-0.5">{user.email}</p>
                {user.country && <p className="text-xs text-white/40 mt-0.5">{user.country}</p>}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${PLAN_COLORS[user.plan] || "bg-white/10 text-white/70"}`}>
                {user.plan.replace(/_/g, " ")}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[user.planStatus] || "bg-white/10 text-white/70"}`}>
                {user.planStatus}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/70">
                {user.role}
              </span>
              {!user.isActive && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400">
                  Inactive
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide">Joined</p>
                <p className="text-white mt-0.5">{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wide">Last Login</p>
                <p className="text-white mt-0.5">
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
                </p>
              </div>
              {user.paymentAccountName && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide">Payment Name</p>
                  <p className="text-white mt-0.5">{user.paymentAccountName}</p>
                </div>
              )}
              {user.paymentTransactionRef && (
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide">Transaction Ref</p>
                  <p className="text-white mt-0.5">{user.paymentTransactionRef}</p>
                </div>
              )}
            </div>

            {/* Health Profile */}
            <div className="border-t border-[#2A2A2A] pt-4 mt-4">
              <p className="text-xs text-white/40 uppercase tracking-wide mb-3 font-semibold">Health Profile</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-white/40 text-xs">Age</p>
                  <p className="text-white mt-0.5">{user.age ?? "N/A"}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Gender</p>
                  <p className="text-white mt-0.5">{formatLabel(user.gender)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Height</p>
                  <p className="text-white mt-0.5">{user.heightCm ? `${user.heightCm} cm` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Current Weight</p>
                  <p className="text-white mt-0.5">{user.currentWeightKg ? `${user.currentWeightKg} kg` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Body Fat %</p>
                  <p className="text-white mt-0.5">{user.bodyFatPercent ? `${user.bodyFatPercent}%` : "N/A"}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Fitness Goal</p>
                  <p className="text-white mt-0.5">{formatLabel(user.fitnessGoal)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Activity Level</p>
                  <p className="text-white mt-0.5">{formatLabel(user.activityLevel)}</p>
                </div>
                <div>
                  <p className="text-white/40 text-xs">Target Weight</p>
                  <p className="text-white mt-0.5">{user.targetWeightKg ? `${user.targetWeightKg} kg` : "N/A"}</p>
                </div>
                {parseJsonArray(user.dietaryPrefs).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-white/40 text-xs">Dietary Preferences</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parseJsonArray(user.dietaryPrefs).map((d, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-[#FF6B00]/15 text-[#FF6B00]">{d}</span>
                      ))}
                    </div>
                  </div>
                )}
                {parseJsonArray(user.healthConditions).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-white/40 text-xs">Health Conditions</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {parseJsonArray(user.healthConditions).map((h, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-[#FFB800]/15 text-[#FFB800]">{h}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Send Notification Button */}
            <div className="border-t border-[#2A2A2A] pt-4 mt-4">
              <button
                onClick={() => setShowNotifForm(!showNotifForm)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#E51A1A] text-white hover:bg-[#E51A1A]/80 transition-colors cursor-pointer border-none"
              >
                {showNotifForm ? "Cancel" : "Send Notification"}
              </button>
              {notifSuccess && <span className="ml-3 text-sm text-green-400">{notifSuccess}</span>}
              {showNotifForm && (
                <div className="mt-4 space-y-3 bg-[#141414] border border-[#2A2A2A] rounded-xl p-4">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Title</label>
                    <input
                      type="text"
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E51A1A]"
                      placeholder="Notification title"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Message</label>
                    <textarea
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E51A1A] min-h-[80px] resize-y"
                      placeholder="Notification message"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Type</label>
                    <select
                      value={notifType}
                      onChange={(e) => setNotifType(e.target.value)}
                      className="w-full bg-[#1E1E1E] border border-[#2A2A2A] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#E51A1A]"
                    >
                      <option value="admin_alert">Admin Alert</option>
                      <option value="achievement">Achievement</option>
                      <option value="system">System</option>
                    </select>
                  </div>
                  <button
                    onClick={handleSendNotification}
                    disabled={notifSending || !notifTitle.trim() || !notifMessage.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#E51A1A] text-white hover:bg-[#E51A1A]/80 transition-colors cursor-pointer border-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {notifSending ? "Sending..." : "Send"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment Screenshot */}
          {user.paymentScreenshot && (
            <div className="shrink-0">
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Payment Screenshot</p>
              <img
                src={user.paymentScreenshot}
                alt="Payment screenshot"
                onClick={() => setPhotoModal(user.paymentScreenshot)}
                className="w-48 h-auto rounded-xl border border-[#2A2A2A] object-contain cursor-pointer hover:opacity-80 transition-opacity"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap cursor-pointer border-none transition-colors ${
              activeTab === t.key
                ? "bg-[#E51A1A] text-white"
                : "bg-[#1E1E1E] text-white/50 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ───────────────────────────────────── */}
      <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        {activeTab === "overview" && <OverviewTab user={user} />}
        {activeTab === "meals" && <MealLogsTab logs={user.mealLogs} />}
        {activeTab === "weight" && <WeightTab logs={user.weightLogs} />}
        {activeTab === "steps" && <StepsTab logs={user.stepLogs} />}
        {activeTab === "measurements" && <MeasurementsTab data={user.bodyMeasurements} />}
        {activeTab === "photos" && <PhotosTab photos={user.progressPhotos} />}
        {activeTab === "favourites" && <FavouritesTab items={user.favourites} />}
        {activeTab === "messages" && <MessagesTab messages={user.messages} userId={user.id} />}
      </div>

      {/* Photo Modal */}
      {photoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPhotoModal(null)}
        >
          <img src={photoModal} alt="Full size" className="max-w-full max-h-[90vh] rounded-xl" />
        </div>
      )}
    </div>
  );
}

/* ── Overview Tab ─────────────────────────────────────────── */
function OverviewTab({ user }: { user: UserData }) {
  const totalMeals = user.mealLogs.length;
  const latestWeight = user.weightLogs.length > 0 ? user.weightLogs[0].weightKg : null;
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySteps = user.stepLogs.find((s) => s.loggedDate.startsWith(todayStr));
  const uniqueDays = new Set(user.mealLogs.map((m) => m.loggedDate.split("T")[0]));

  const summaryCards = [
    { label: "Total Meals Logged", value: totalMeals.toString(), color: "#E51A1A" },
    { label: "Current Weight", value: latestWeight ? `${latestWeight.toFixed(1)} kg` : "N/A", color: "#FF6B00" },
    { label: "Steps Today", value: todaySteps ? todaySteps.steps.toLocaleString() : "0", color: "#FFB800" },
    { label: "Days Active", value: uniqueDays.size.toString(), color: "#A855F7" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-center">
            <p className="text-xs text-white/40 uppercase tracking-wide">{card.label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Macro Targets */}
      {user.macroTarget && (
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wide mb-3 font-semibold">Macro Targets</p>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#FF6B00]/20 text-[#FF6B00]">
              {user.macroTarget.goal}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Calories", value: `${user.macroTarget.calories} kcal`, color: "#E51A1A" },
              { label: "Protein", value: `${user.macroTarget.protein}g`, color: "#FF6B00" },
              { label: "Carbs", value: `${user.macroTarget.carbs}g`, color: "#FFB800" },
              { label: "Fat", value: `${user.macroTarget.fat}g`, color: "#A855F7" },
            ].map((item) => (
              <div key={item.label} className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-center">
                <p className="text-xs text-white/40 uppercase tracking-wide">{item.label}</p>
                <p className="text-xl font-bold mt-1" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Meal Logs Tab ────────────────────────────────────────── */
function MealLogsTab({ logs }: { logs: MealLog[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!logs.length) return <EmptyState text="No meal logs recorded yet." />;

  const grouped: Record<string, MealLog[]> = {};
  for (const log of logs) {
    const dateKey = new Date(log.loggedDate).toLocaleDateString();
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(log);
  }

  function parseIngredients(raw: string | null): { name: string; weightGrams?: number; calories?: number; protein?: number; carbs?: number; fat?: number }[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2A2A2A] text-white/40 text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">Date</th>
            <th className="px-4 py-3 text-left font-medium">Meal</th>
            <th className="px-4 py-3 text-left font-medium">Type</th>
            <th className="px-4 py-3 text-right font-medium">Cals</th>
            <th className="px-4 py-3 text-right font-medium">P</th>
            <th className="px-4 py-3 text-right font-medium">C</th>
            <th className="px-4 py-3 text-right font-medium">F</th>
            <th className="px-4 py-3 text-center font-medium">Photo</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(grouped).map(([date, items]) => {
            const totals = items.reduce(
              (acc, m) => ({
                calories: acc.calories + m.calories,
                protein: acc.protein + m.protein,
                carbs: acc.carbs + m.carbs,
                fat: acc.fat + m.fat,
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );

            return (
              <Fragment key={date}>
                {items.map((m) => {
                  const ingredients = parseIngredients(m.ingredients);
                  const isExpanded = expandedId === m.id;
                  return (
                    <Fragment key={m.id}>
                      <tr
                        className="border-b border-[#2A2A2A]/50 text-white/80 cursor-pointer hover:bg-[#141414]"
                        onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      >
                        <td className="px-4 py-2.5">{date}</td>
                        <td className="px-4 py-2.5 max-w-[200px] truncate">{m.description}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-white/10">{m.mealType}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right">{m.calories}</td>
                        <td className="px-4 py-2.5 text-right">{m.protein.toFixed(0)}g</td>
                        <td className="px-4 py-2.5 text-right">{m.carbs.toFixed(0)}g</td>
                        <td className="px-4 py-2.5 text-right">{m.fat.toFixed(0)}g</td>
                        <td className="px-4 py-2.5 text-center">
                          {m.imageData ? (
                            <img src={m.imageData} alt="meal" className="w-8 h-8 rounded object-cover inline-block" />
                          ) : (
                            <span className="text-white/20">--</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && ingredients.length > 0 && (
                        <tr className="bg-[#0A0A0A]">
                          <td colSpan={8} className="px-6 py-3">
                            <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Ingredients</p>
                            <div className="space-y-1">
                              {ingredients.map((ing, idx) => (
                                <div key={idx} className="flex items-center gap-4 text-xs text-white/70">
                                  <span className="flex-1">{ing.name}</span>
                                  {ing.weightGrams && <span>{ing.weightGrams}g</span>}
                                  {ing.calories !== undefined && <span>{ing.calories} kcal</span>}
                                  {ing.protein !== undefined && <span>P:{ing.protein}g</span>}
                                  {ing.carbs !== undefined && <span>C:{ing.carbs}g</span>}
                                  {ing.fat !== undefined && <span>F:{ing.fat}g</span>}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                <tr className="border-b border-[#2A2A2A] bg-[#141414] text-[#FF6B00] font-semibold text-xs">
                  <td className="px-4 py-2" colSpan={3}>
                    Daily Total
                  </td>
                  <td className="px-4 py-2 text-right">{totals.calories}</td>
                  <td className="px-4 py-2 text-right">{totals.protein.toFixed(0)}g</td>
                  <td className="px-4 py-2 text-right">{totals.carbs.toFixed(0)}g</td>
                  <td className="px-4 py-2 text-right">{totals.fat.toFixed(0)}g</td>
                  <td className="px-4 py-2" />
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Weight Tab ───────────────────────────────────────────── */
function WeightTab({ logs }: { logs: WeightLog[] }) {
  const [range, setRange] = useState("30d");

  if (!logs.length) return <EmptyState text="No weight logs recorded yet." />;

  const filtered = filterByRange(logs, range);
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.loggedDate).getTime() - new Date(b.loggedDate).getTime()
  );

  const weights = sorted.map((w) => w.weightKg);
  const minW = Math.min(...weights) - 2;
  const maxW = Math.max(...weights) + 2;
  const weightRange = maxW - minW || 1;

  const chartW = 700;
  const chartH = 200;
  const padX = 40;
  const padY = 20;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;

  const points = sorted.map((w, i) => {
    const x = padX + (i / Math.max(sorted.length - 1, 1)) * plotW;
    const y = padY + plotH - ((w.weightKg - minW) / weightRange) * plotH;
    return { x, y, weight: w.weightKg, date: w.loggedDate };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="p-6 space-y-6">
      <div className="mb-2">
        <TimeRangeFilter value={range} onChange={setRange} options={ADMIN_RANGE_OPTIONS} />
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-[700px]">
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padY + plotH - pct * plotH;
            const val = (minW + pct * weightRange).toFixed(1);
            return (
              <g key={pct}>
                <line x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="#2A2A2A" strokeWidth={1} />
                <text x={padX - 5} y={y + 4} fill="#666" fontSize="10" textAnchor="end">
                  {val}
                </text>
              </g>
            );
          })}
          <path d={linePath} fill="none" stroke="#E51A1A" strokeWidth={2} />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="#E51A1A" />
          ))}
        </svg>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-white/40 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Weight (kg)</th>
              <th className="px-4 py-3 text-right font-medium">Change</th>
            </tr>
          </thead>
          <tbody>
            {[...sorted].reverse().map((w, i, arr) => {
              const next = i < arr.length - 1 ? arr[i + 1].weightKg : null;
              const change = next !== null ? w.weightKg - next : null;
              return (
                <tr key={w.id} className="border-b border-[#2A2A2A]/50 text-white/80">
                  <td className="px-4 py-2.5">{new Date(w.loggedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{w.weightKg.toFixed(1)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {change !== null ? (
                      <span className={change > 0 ? "text-red-400" : change < 0 ? "text-green-400" : "text-white/40"}>
                        {change > 0 ? "+" : ""}
                        {change.toFixed(1)} kg
                      </span>
                    ) : (
                      <span className="text-white/30">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Steps Tab ───────────────────────────────────────────── */
function StepsTab({ logs }: { logs: StepLog[] }) {
  const [range, setRange] = useState("30d");

  if (!logs.length) return <EmptyState text="No step logs recorded yet." />;

  const filtered = filterByRange(logs, range);
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.loggedDate).getTime() - new Date(b.loggedDate).getTime()
  );

  const steps = sorted.map((s) => s.steps);
  const maxSteps = Math.max(...steps, 1);
  const avg = Math.round(steps.reduce((a, b) => a + b, 0) / steps.length);
  const best = sorted.reduce((max, s) => (s.steps > max.steps ? s : max), sorted[0]);
  const goalMetCount = sorted.filter((s) => s.steps >= s.goal).length;

  const chartW = 700;
  const chartH = 200;
  const padX = 40;
  const padY = 20;
  const plotW = chartW - padX * 2;
  const plotH = chartH - padY * 2;
  const barW = Math.max(4, plotW / sorted.length - 2);

  return (
    <div className="p-6 space-y-6">
      <div className="mb-2">
        <TimeRangeFilter value={range} onChange={setRange} options={ADMIN_RANGE_OPTIONS} />
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wide">Average</p>
          <p className="text-xl font-bold text-[#FF6B00] mt-1">{avg.toLocaleString()}</p>
        </div>
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wide">Best Day</p>
          <p className="text-xl font-bold text-[#FFB800] mt-1">{best.steps.toLocaleString()}</p>
          <p className="text-xs text-white/30">{new Date(best.loggedDate).toLocaleDateString()}</p>
        </div>
        <div className="bg-[#141414] border border-[#2A2A2A] rounded-xl p-4 text-center">
          <p className="text-xs text-white/40 uppercase tracking-wide">Goal Met</p>
          <p className="text-xl font-bold text-green-400 mt-1">{goalMetCount} / {sorted.length}</p>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full max-w-[700px]">
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padY + plotH - pct * plotH;
            const val = Math.round(pct * maxSteps);
            return (
              <g key={pct}>
                <line x1={padX} y1={y} x2={chartW - padX} y2={y} stroke="#2A2A2A" strokeWidth={1} />
                <text x={padX - 5} y={y + 4} fill="#666" fontSize="9" textAnchor="end">
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}
          {sorted.map((s, i) => {
            const x = padX + (i / Math.max(sorted.length - 1, 1)) * plotW - barW / 2;
            const h = (s.steps / maxSteps) * plotH;
            const y = padY + plotH - h;
            const metGoal = s.steps >= s.goal;
            return (
              <rect
                key={i}
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={2}
                fill={metGoal ? "#FF6B00" : "#FF6B00"}
                opacity={metGoal ? 1 : 0.4}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ── Measurements Tab ────────────────────────────────────── */
function MeasurementsTab({ data }: { data: BodyMeasurement[] }) {
  const [range, setRange] = useState("30d");

  if (!data.length) return <EmptyState text="No body measurements recorded yet." />;

  const filtered = filterByRange(data, range);
  const sorted = [...filtered].sort(
    (a, b) => new Date(a.loggedDate).getTime() - new Date(b.loggedDate).getTime()
  );

  // Charts for weight and belly over time
  const weightPoints = sorted.filter((d) => d.weightKg != null).map((d) => ({ date: d.loggedDate, val: d.weightKg! }));
  const bellyPoints = sorted.filter((d) => d.bellyInches != null).map((d) => ({ date: d.loggedDate, val: d.bellyInches! }));

  function MiniLineChart({ points, color, label }: { points: { date: string; val: number }[]; color: string; label: string }) {
    if (points.length < 2) return null;
    const vals = points.map((p) => p.val);
    const minV = Math.min(...vals) - 1;
    const maxV = Math.max(...vals) + 1;
    const rng = maxV - minV || 1;
    const w = 350, h = 120, px = 30, py = 15;
    const pw = w - px * 2, ph = h - py * 2;

    const pts = points.map((p, i) => ({
      x: px + (i / Math.max(points.length - 1, 1)) * pw,
      y: py + ph - ((p.val - minV) / rng) * ph,
    }));
    const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    return (
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wide mb-2">{label}</p>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[350px]">
          {[0, 0.5, 1].map((pct) => {
            const y = py + ph - pct * ph;
            return (
              <g key={pct}>
                <line x1={px} y1={y} x2={w - px} y2={y} stroke="#2A2A2A" strokeWidth={1} />
                <text x={px - 4} y={y + 3} fill="#666" fontSize="8" textAnchor="end">
                  {(minV + pct * rng).toFixed(1)}
                </text>
              </g>
            );
          })}
          <path d={path} fill="none" stroke={color} strokeWidth={2} />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-2">
        <TimeRangeFilter value={range} onChange={setRange} options={ADMIN_RANGE_OPTIONS} />
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <MiniLineChart points={weightPoints} color="#E51A1A" label="Weight Over Time (kg)" />
        <MiniLineChart points={bellyPoints} color="#FF6B00" label="Belly Over Time (inches)" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2A2A2A] text-white/40 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-right font-medium">Weight</th>
              <th className="px-4 py-3 text-right font-medium">Belly</th>
              <th className="px-4 py-3 text-right font-medium">Waist</th>
              <th className="px-4 py-3 text-right font-medium">Chest</th>
              <th className="px-4 py-3 text-right font-medium">Hips</th>
              <th className="px-4 py-3 text-right font-medium">Arms</th>
            </tr>
          </thead>
          <tbody>
            {[...sorted].reverse().map((m) => (
              <tr key={m.id} className="border-b border-[#2A2A2A]/50 text-white/80">
                <td className="px-4 py-2.5">{new Date(m.loggedDate).toLocaleDateString()}</td>
                <td className="px-4 py-2.5 text-right">{m.weightKg?.toFixed(1) ?? "--"}</td>
                <td className="px-4 py-2.5 text-right">{m.bellyInches?.toFixed(1) ?? "--"}</td>
                <td className="px-4 py-2.5 text-right">{m.waistInches?.toFixed(1) ?? "--"}</td>
                <td className="px-4 py-2.5 text-right">{m.chestInches?.toFixed(1) ?? "--"}</td>
                <td className="px-4 py-2.5 text-right">{m.hipsInches?.toFixed(1) ?? "--"}</td>
                <td className="px-4 py-2.5 text-right">{m.armsInches?.toFixed(1) ?? "--"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Photos Tab ───────────────────────────────────────────── */
function PhotosTab({ photos }: { photos: ProgressPhoto[] }) {
  const [modal, setModal] = useState<string | null>(null);

  if (!photos.length) return <EmptyState text="No progress photos uploaded yet." />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((p) => (
          <div key={p.id} className="space-y-2">
            <div
              className="aspect-[3/4] rounded-xl overflow-hidden border border-[#2A2A2A] bg-[#141414] cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setModal(p.imageData)}
            >
              <img
                src={p.imageData}
                alt={`Progress photo ${new Date(p.photoDate).toLocaleDateString()}`}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-xs text-white/50">{new Date(p.photoDate).toLocaleDateString()}</p>
            {p.notes && <p className="text-xs text-white/30">{p.notes}</p>}
          </div>
        ))}
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <img src={modal} alt="Full size" className="max-w-full max-h-[90vh] rounded-xl" />
        </div>
      )}
    </div>
  );
}

/* ── Favourites Tab ───────────────────────────────────────── */
function FavouritesTab({ items }: { items: FavouriteItem[] }) {
  if (!items.length) return <EmptyState text="No favourite recipes yet." />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((f) => (
          <Link
            key={f.id}
            href={`/hub/recipes/${f.recipe.slug}`}
            className="flex items-center justify-between bg-[#141414] border border-[#2A2A2A] rounded-xl px-4 py-3 hover:border-[#E51A1A]/40 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-white">{f.recipe.title}</p>
              <p className="text-xs text-white/40 mt-0.5">
                {f.recipe.calories} kcal | {f.recipe.protein}g protein
              </p>
            </div>
            <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Messages Tab ─────────────────────────────────────────── */
function MessagesTab({ messages, userId }: { messages: MessageItem[]; userId: string }) {
  return (
    <div className="p-6 space-y-4">
      {messages.length === 0 ? (
        <EmptyState text="No messages yet." />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-xl px-4 py-3 border border-[#2A2A2A] ${
                m.isSentByUser ? "bg-[#141414]" : "bg-[#1A1A2E]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-white/60">
                  {m.isSentByUser ? `From: ${m.senderName}` : `From: ${m.senderName} (Admin)`}
                </span>
                <span className="text-xs text-white/30">
                  {new Date(m.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-white/80">{m.content}</p>
              {!m.isRead && (
                <span className="inline-block mt-1 text-xs text-[#FFB800]">Unread</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Link
        href={`/admin/messages?user=${userId}`}
        className="inline-flex items-center gap-2 text-sm text-[#E51A1A] hover:underline"
      >
        View all messages
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}

/* ── Empty State ──────────────────────────────────────────── */
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-sm text-white/30">{text}</p>
    </div>
  );
}
