"use client";

import { useState, useEffect } from "react";

interface Subscription {
  status: "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";
  daysLeft: number;
  currentPeriodEnd: string;
  basePriceMonthly: number;
  includedClients: number;
  extraClientPrice: number;
  activeClientCount: number;
  monthlyBill: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return { cls: "bg-emerald-500/20 text-emerald-400", label: "Active" };
    case "GRACE":
      return { cls: "bg-amber-500/20 text-amber-400", label: "Grace Period" };
    case "EXPIRED":
      return { cls: "bg-red-500/20 text-red-400", label: "Expired" };
    case "CANCELLED":
      return { cls: "bg-gray-500/20 text-gray-400", label: "Cancelled" };
    default:
      return { cls: "bg-white/10 text-white/50", label: status };
  }
}

export default function CoachBillingPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.subscription) setSub(data.user.subscription);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[#E51A1A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="text-center py-16">
        <p className="text-white/40 text-lg">No billing information available.</p>
        <p className="text-white/30 text-sm mt-2">Contact the administrator for details.</p>
      </div>
    );
  }

  const badge = statusBadge(sub.status);
  const periodEnd = new Date(sub.currentPeriodEnd);
  const periodStart = new Date(periodEnd);
  periodStart.setDate(periodStart.getDate() - 30);

  const totalDays = 30;
  const daysElapsed = totalDays - Math.max(0, sub.daysLeft);
  const progressPct = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));

  const extraClients = Math.max(0, sub.activeClientCount - sub.includedClients);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing & Subscription</h1>
        <p className="text-white/50 mt-1 text-sm">Your current plan and billing cycle.</p>
      </div>

      {/* Subscription Status */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Subscription Status</h2>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${badge.cls}`}>
            {badge.label}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Days Remaining</p>
            <p className={`text-2xl font-bold mt-1 ${sub.daysLeft > 7 ? "text-emerald-400" : sub.daysLeft > 0 ? "text-amber-400" : "text-red-400"}`}>
              {sub.daysLeft >= 0 ? sub.daysLeft : 0}
            </p>
          </div>
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Renews On</p>
            <p className="text-white font-semibold mt-1">{formatDate(sub.currentPeriodEnd)}</p>
          </div>
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Monthly Bill</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">PKR {sub.monthlyBill.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Billing Cycle */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6">
        <h2 className="text-lg font-bold text-white mb-4">Billing Cycle</h2>
        <div className="flex items-center justify-between text-xs text-white/50 mb-2">
          <span>{formatDate(periodStart.toISOString())}</span>
          <span>{formatDate(sub.currentPeriodEnd)}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-3 bg-[#0A0A0A] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct > 80 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs mt-2">
          <span className="text-white/40">{daysElapsed} days elapsed</span>
          <span className={`font-semibold ${sub.daysLeft > 7 ? "text-emerald-400" : sub.daysLeft > 0 ? "text-amber-400" : "text-red-400"}`}>
            {Math.max(0, sub.daysLeft)} days remaining
          </span>
        </div>
      </div>

      {/* Plan Details */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6">
        <h2 className="text-lg font-bold text-white mb-4">Plan Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Base Price / Month</p>
            <p className="text-xl font-bold text-white mt-1">PKR {sub.basePriceMonthly.toLocaleString()}</p>
          </div>
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Included Clients</p>
            <p className="text-xl font-bold text-white mt-1">{sub.includedClients}</p>
          </div>
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Extra Client Price</p>
            <p className="text-xl font-bold text-white mt-1">PKR {sub.extraClientPrice.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Current Usage */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6">
        <h2 className="text-lg font-bold text-white mb-4">Current Usage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Active Clients</p>
            <p className="text-xl font-bold text-white mt-1">{sub.activeClientCount}</p>
          </div>
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Extra Clients</p>
            <p className="text-xl font-bold text-white mt-1">{extraClients}</p>
            <p className="text-white/30 text-[10px] mt-1">
              {sub.activeClientCount} active &minus; {sub.includedClients} included
            </p>
          </div>
          <div className="bg-[#0A0A0A] rounded-xl p-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Monthly Total</p>
            <p className="text-xl font-bold text-blue-400 mt-1">PKR {sub.monthlyBill.toLocaleString()}</p>
            <p className="text-white/30 text-[10px] mt-1">
              {sub.basePriceMonthly.toLocaleString()} + {extraClients} &times; {sub.extraClientPrice.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Contact notice */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
        <p className="text-blue-300/80 text-sm">
          Your billing cycle renews on <strong>{formatDate(sub.currentPeriodEnd)}</strong>.
          To change your plan, add more client slots, or manage payments, please contact the administrator.
        </p>
      </div>
    </div>
  );
}
