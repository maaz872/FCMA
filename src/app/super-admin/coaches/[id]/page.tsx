"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type SubscriptionStatus = "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  planStatus: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface CoachDetail {
  coach: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    isActive: boolean;
    inviteCode: string | null;
    clientCount: number;
    createdAt: string;
    lastLoginAt: string | null;
  };
  billing: {
    basePriceMonthly: number;
    extraClientPrice: number;
    includedClients: number;
    billingStatus: string;
    currentPeriodEnd: string;
    subscriptionStatus: SubscriptionStatus;
    daysLeft: number;
  } | null;
  monthlyBill: number;
  activeClients: number;
  clients: Client[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function subStatusChip(status: SubscriptionStatus, daysLeft: number) {
  if (status === "CANCELLED") return { label: "Cancelled", cls: "bg-gray-500/20 text-gray-400" };
  if (status === "EXPIRED") return { label: `Expired ${Math.abs(daysLeft)}d ago`, cls: "bg-red-500/20 text-red-400" };
  if (status === "GRACE") return { label: `Grace period (${7 + daysLeft}d left)`, cls: "bg-amber-500/20 text-amber-400" };
  if (daysLeft <= 7) return { label: `${daysLeft}d left`, cls: "bg-amber-500/20 text-amber-400" };
  return { label: `${daysLeft}d left`, cls: "bg-emerald-500/20 text-emerald-400" };
}

export default function CoachDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<CoachDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [subAction, setSubAction] = useState<string | null>(null);

  // Plan & client limit editor state
  const [planBase, setPlanBase] = useState("");
  const [planIncluded, setPlanIncluded] = useState("");
  const [planExtra, setPlanExtra] = useState("");
  const [planSaving, setPlanSaving] = useState(false);
  const [planMessage, setPlanMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [customDays, setCustomDays] = useState("");
  const [customGrant, setCustomGrant] = useState("");

  const loadCoach = useCallback(async () => {
    const res = await fetch(`/api/super-admin/coaches/${id}`);
    const d = await res.json();
    setData(d);
    if (d?.billing) {
      setPlanBase(String(d.billing.basePriceMonthly));
      setPlanIncluded(String(d.billing.includedClients));
      setPlanExtra(String(d.billing.extraClientPrice));
    }
  }, [id]);

  useEffect(() => {
    loadCoach().finally(() => setLoading(false));
  }, [loadCoach]);

  async function toggleActive() {
    if (!data) return;
    const active = data.coach.isActive;
    if (!confirm(active
      ? "Deactivate this coach? All their clients will be disabled."
      : "Reactivate this coach?"
    )) return;

    const res = await fetch(`/api/super-admin/coaches/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCoachActive: !active }),
    });
    if (res.ok) {
      setData((prev) => (prev ? { ...prev, coach: { ...prev.coach, isActive: !active } } : null));
    }
  }

  async function subscriptionAction(action: string, extra: Record<string, unknown> = {}) {
    setSubAction(action);
    try {
      const res = await fetch(`/api/super-admin/coaches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Action failed");
        return;
      }
      await loadCoach();
    } finally {
      setSubAction(null);
    }
  }

  async function savePlan() {
    setPlanSaving(true);
    setPlanMessage(null);
    try {
      const body = {
        basePriceMonthly: Number(planBase),
        includedClients: Number(planIncluded),
        extraClientPrice: Number(planExtra),
      };
      const res = await fetch(`/api/super-admin/coaches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        setPlanMessage({ kind: "error", text: err.error || "Failed to save plan" });
        return;
      }
      setPlanMessage({ kind: "success", text: "Plan updated" });
      await loadCoach();
      setTimeout(() => setPlanMessage(null), 3000);
    } catch {
      setPlanMessage({ kind: "error", text: "Something went wrong" });
    } finally {
      setPlanSaving(false);
    }
  }

  async function grantClients(n: number) {
    if (!data?.billing) return;
    const newTotal = data.billing.includedClients + n;
    const res = await fetch(`/api/super-admin/coaches/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includedClients: newTotal }),
    });
    if (res.ok) {
      await loadCoach();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.coach) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-lg">Coach not found</p>
        <Link href="/super-admin/coaches" className="text-blue-400 text-sm mt-2 inline-block">Back to coaches</Link>
      </div>
    );
  }

  const { coach, billing, monthlyBill, activeClients, clients } = data;

  // Live monthly bill preview from current form values
  const previewBase = Number(planBase) || 0;
  const previewIncluded = Number(planIncluded) || 0;
  const previewExtra = Number(planExtra) || 0;
  const previewOverage = Math.max(0, activeClients - previewIncluded);
  const previewBill = previewBase + previewOverage * previewExtra;
  const planChanged =
    billing &&
    (Number(planBase) !== billing.basePriceMonthly ||
      Number(planIncluded) !== billing.includedClients ||
      Number(planExtra) !== billing.extraClientPrice);

  const inputCls =
    "w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none transition-colors";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-white/40">
        <Link href="/super-admin/coaches" className="hover:text-white/60">Coaches</Link>
        <span>/</span>
        <span className="text-white/70">{coach.firstName} {coach.lastName}</span>
      </div>

      {/* Coach Header */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold ${
            coach.isActive ? "bg-blue-600" : "bg-gray-600"
          }`}>
            {coach.firstName[0]}{coach.lastName[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white">
                {coach.firstName} {coach.lastName}
              </h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                coach.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}>
                {coach.isActive ? "Active" : "Inactive"}
              </span>
              {billing && (() => {
                const chip = subStatusChip(billing.subscriptionStatus, billing.daysLeft);
                return (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${chip.cls}`}>
                    {chip.label}
                  </span>
                );
              })()}
            </div>
            <p className="text-white/40 text-sm">{coach.email}</p>
            {coach.inviteCode && (
              <p className="text-white/30 text-xs mt-1">
                Invite: <span className="text-blue-400 font-mono">{coach.inviteCode}</span>
              </p>
            )}
          </div>
          <button
            onClick={toggleActive}
            className={`px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border-none transition-colors ${
              coach.isActive
                ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {coach.isActive ? "Deactivate Coach" : "Activate Coach"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-5">
          <p className="text-white/40 text-xs font-semibold uppercase">Total Clients</p>
          <p className="text-2xl font-bold text-white mt-1">{coach.clientCount}</p>
        </div>
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-5">
          <p className="text-white/40 text-xs font-semibold uppercase">Active Clients</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{activeClients}</p>
        </div>
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-5">
          <p className="text-white/40 text-xs font-semibold uppercase">Monthly Bill</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">PKR {monthlyBill.toLocaleString()}</p>
        </div>
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-5">
          <p className="text-white/40 text-xs font-semibold uppercase">Period Ends</p>
          <p className="text-sm text-white/70 mt-1">
            {billing ? formatDate(billing.currentPeriodEnd) : "—"}
          </p>
        </div>
      </div>

      {/* Seed Defaults */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">Seed Default Data</h2>
            <p className="text-white/50 text-xs mt-1">
              Populates recipe categories, dietary tags, workout categories/subcategories, and 85 food items.
              Only works once — won&apos;t duplicate if already seeded.
            </p>
          </div>
          <button
            onClick={async () => {
              if (!confirm("Seed default categories, tags, and food database for this coach?")) return;
              const res = await fetch(`/api/super-admin/coaches/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "seedDefaults" }),
              });
              const data = await res.json();
              if (res.ok) {
                alert("Defaults seeded successfully! The coach now has recipe/workout categories and 85 food items.");
              } else {
                alert(data.error || "Failed to seed defaults.");
              }
            }}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors cursor-pointer border-none whitespace-nowrap flex-shrink-0"
          >
            Seed Defaults
          </button>
        </div>
      </div>

      {/* Card A — Subscription */}
      {billing && (
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Subscription</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-[#0A0A0A] rounded-xl p-3">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Current period ends</p>
              <p className="text-white font-semibold mt-1">{formatDate(billing.currentPeriodEnd)}</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-3">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Days remaining</p>
              <p className="text-white font-semibold mt-1">
                {billing.daysLeft >= 0 ? `${billing.daysLeft} days` : `${Math.abs(billing.daysLeft)} days ago`}
              </p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl p-3">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Status</p>
              <p className="text-white font-semibold mt-1">{billing.subscriptionStatus}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => subscriptionAction("extend", { days: 7 })}
              disabled={subAction !== null}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              {subAction === "extend" ? "..." : "Extend 7 days"}
            </button>
            <button
              onClick={() => subscriptionAction("extend", { days: 30 })}
              disabled={subAction !== null}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              Extend 30 days
            </button>
            <button
              onClick={() => subscriptionAction("renew")}
              disabled={subAction !== null}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors cursor-pointer border-none disabled:opacity-50"
            >
              {subAction === "renew" ? "..." : "Renew 1 month"}
            </button>
            {billing.billingStatus === "CANCELLED" ? (
              <button
                onClick={() => subscriptionAction("reactivateSubscription")}
                disabled={subAction !== null}
                className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs font-semibold hover:bg-emerald-500/20 transition-colors cursor-pointer border-none disabled:opacity-50"
              >
                Reactivate Subscription
              </button>
            ) : (
              <button
                onClick={() => {
                  if (confirm("Cancel this coach's subscription? They will not be able to log in.")) {
                    subscriptionAction("cancelSubscription");
                  }
                }}
                disabled={subAction !== null}
                className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition-colors cursor-pointer border-none disabled:opacity-50"
              >
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Custom extend */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#2A2A2A]">
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              placeholder="Custom days"
              className={`${inputCls} max-w-[140px]`}
            />
            <button
              onClick={() => {
                const n = Number(customDays);
                if (!n || n <= 0 || n > 365) return;
                subscriptionAction("extend", { days: n });
                setCustomDays("");
              }}
              disabled={subAction !== null || !customDays}
              className="px-4 py-2 bg-[#2A2A2A] text-white rounded-xl text-xs font-semibold hover:bg-[#333] transition-colors cursor-pointer border-none disabled:opacity-40"
            >
              Extend by N days
            </button>
          </div>
        </div>
      )}

      {/* Card B — Plan & Client Limits */}
      {billing && (
        <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Plan & Client Limits</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Base / month (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={planBase}
                onChange={(e) => setPlanBase(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Included clients
              </label>
              <input
                type="number"
                min={0}
                value={planIncluded}
                onChange={(e) => setPlanIncluded(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">
                Extra client (PKR)
              </label>
              <input
                type="number"
                min={0}
                value={planExtra}
                onChange={(e) => setPlanExtra(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-[#0A0A0A] rounded-xl p-3 text-sm">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Preview</p>
            <p className="text-white mt-1">
              {activeClients} active clients · {previewIncluded} included + {previewOverage} extra ={" "}
              <span className="text-blue-400 font-bold">PKR {previewBill.toLocaleString()}</span>
              <span className="text-white/40"> / month</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={savePlan}
              disabled={planSaving || !planChanged}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer border-none disabled:opacity-40"
            >
              {planSaving ? "Saving..." : "Save Plan"}
            </button>
            {planMessage && (
              <span className={`text-xs ${planMessage.kind === "success" ? "text-emerald-400" : "text-red-400"}`}>
                {planMessage.text}
              </span>
            )}
          </div>

          {/* Grant extra clients shortcuts */}
          <div className="pt-4 border-t border-[#2A2A2A] space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Grant Extra Clients</p>
            <p className="text-white/50 text-xs">
              Bump the included-client count without re-entering the whole plan.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => grantClients(1)}
                className="px-3 py-1.5 bg-[#2A2A2A] text-white text-xs rounded-lg hover:bg-[#333] transition-colors cursor-pointer border-none"
              >
                +1 client
              </button>
              <button
                onClick={() => grantClients(5)}
                className="px-3 py-1.5 bg-[#2A2A2A] text-white text-xs rounded-lg hover:bg-[#333] transition-colors cursor-pointer border-none"
              >
                +5 clients
              </button>
              <button
                onClick={() => grantClients(10)}
                className="px-3 py-1.5 bg-[#2A2A2A] text-white text-xs rounded-lg hover:bg-[#333] transition-colors cursor-pointer border-none"
              >
                +10 clients
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={customGrant}
                onChange={(e) => setCustomGrant(e.target.value)}
                placeholder="Custom +N"
                className={`${inputCls} max-w-[140px]`}
              />
              <button
                onClick={() => {
                  const n = Number(customGrant);
                  if (!n || n <= 0 || n > 100) return;
                  grantClients(n);
                  setCustomGrant("");
                }}
                disabled={!customGrant}
                className="px-3 py-1.5 bg-[#2A2A2A] text-white text-xs rounded-lg hover:bg-[#333] transition-colors cursor-pointer border-none disabled:opacity-40"
              >
                Grant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client List */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6">
        <h2 className="text-lg font-bold text-white mb-4">Clients ({clients.length})</h2>
        {clients.length === 0 ? (
          <p className="text-white/30 text-sm">No clients yet</p>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div key={client.id} className="flex items-center justify-between py-2 border-b border-[#2A2A2A] last:border-none">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white/50 text-xs font-bold">
                    {client.firstName[0]}{client.lastName[0]}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-white/30 text-xs">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    client.planStatus === "ACTIVE"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : client.planStatus === "PENDING"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {client.planStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => router.push("/super-admin/coaches")}
        className="text-white/40 hover:text-white/60 text-sm transition-colors cursor-pointer bg-transparent border-none"
      >
        &larr; Back to Coaches
      </button>
    </div>
  );
}
