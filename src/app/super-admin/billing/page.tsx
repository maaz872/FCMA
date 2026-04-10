"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type SubscriptionStatus = "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED";

interface BillingRow {
  coachId: string;
  coachName: string;
  coachEmail: string;
  isActive: boolean;
  totalClients: number;
  activeClients: number;
  basePriceMonthly: number;
  includedClients: number;
  extraClientPrice: number;
  monthlyBill: number;
  billingStatus: string;
  currentPeriodEnd: string;
  subscriptionStatus: SubscriptionStatus;
  daysLeft: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function daysLeftBadge(status: SubscriptionStatus, daysLeft: number) {
  if (status === "CANCELLED") return { label: "—", cls: "text-gray-400" };
  if (status === "EXPIRED") return { label: `Expired ${Math.abs(daysLeft)}d`, cls: "text-red-400" };
  if (status === "GRACE") return { label: `Grace ${7 + daysLeft}d`, cls: "text-amber-400" };
  if (daysLeft <= 7) return { label: `${daysLeft}d`, cls: "text-amber-400" };
  return { label: `${daysLeft}d`, cls: "text-emerald-400" };
}

export default function BillingPage() {
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/billing")
      .then((r) => r.json())
      .then((d) => {
        setRows(d.billings || []);
        setTotalRevenue(d.totalRevenue || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing Overview</h1>
        <p className="text-white/50 text-sm mt-1">Monthly billing per coach</p>
      </div>

      {/* Total Revenue */}
      <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-6">
        <p className="text-blue-400/60 text-xs font-semibold uppercase tracking-wider">Total Monthly Revenue</p>
        <p className="text-4xl font-bold text-blue-400 mt-1">PKR {totalRevenue.toLocaleString()}</p>
        <p className="text-blue-400/40 text-sm mt-2">{rows.length} coaches billed</p>
      </div>

      {/* Billing Table */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                <th className="text-left px-5 py-3 text-white/40 font-semibold text-xs uppercase">Coach</th>
                <th className="text-center px-3 py-3 text-white/40 font-semibold text-xs uppercase">Status</th>
                <th className="text-center px-3 py-3 text-white/40 font-semibold text-xs uppercase">Clients</th>
                <th className="text-center px-3 py-3 text-white/40 font-semibold text-xs uppercase">Plan</th>
                <th className="text-center px-3 py-3 text-white/40 font-semibold text-xs uppercase">Period Ends</th>
                <th className="text-center px-3 py-3 text-white/40 font-semibold text-xs uppercase">Days Left</th>
                <th className="text-right px-5 py-3 text-white/40 font-semibold text-xs uppercase">Monthly Bill</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const extraClients = Math.max(0, row.activeClients - row.includedClients);
                const dlb = daysLeftBadge(row.subscriptionStatus, row.daysLeft);
                return (
                  <tr key={row.coachId} className="border-b border-[#2A2A2A] last:border-none hover:bg-white/[0.02]">
                    <td className="px-5 py-4">
                      <Link href={`/super-admin/coaches/${row.coachId}`} className="hover:text-blue-400 transition-colors">
                        <p className="text-white font-medium">{row.coachName}</p>
                        <p className="text-white/30 text-xs">{row.coachEmail}</p>
                      </Link>
                    </td>
                    <td className="text-center px-3 py-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        row.subscriptionStatus === "ACTIVE"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : row.subscriptionStatus === "GRACE"
                          ? "bg-amber-500/20 text-amber-400"
                          : row.subscriptionStatus === "EXPIRED"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-gray-500/20 text-gray-400"
                      }`}>
                        {row.subscriptionStatus}
                      </span>
                    </td>
                    <td className="text-center px-3 py-4">
                      <p className="text-white">{row.activeClients}</p>
                      <p className="text-white/30 text-[10px]">{row.totalClients} total</p>
                    </td>
                    <td className="text-center px-3 py-4">
                      <p className="text-white/70 text-xs">
                        {row.basePriceMonthly.toLocaleString()} base
                      </p>
                      <p className="text-white/30 text-[10px]">
                        {row.includedClients} incl + {extraClients > 0 ? `${extraClients} extra` : "0 extra"}
                      </p>
                    </td>
                    <td className="text-center px-3 py-4">
                      <p className="text-white/70 text-xs">{formatDate(row.currentPeriodEnd)}</p>
                    </td>
                    <td className="text-center px-3 py-4">
                      <span className={`text-xs font-semibold ${dlb.cls}`}>{dlb.label}</span>
                    </td>
                    <td className="text-right px-5 py-4">
                      <p className="text-white font-bold">PKR {row.monthlyBill.toLocaleString()}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="text-center py-12 text-white/30 text-sm">
            No billing records yet
          </div>
        )}
      </div>
    </div>
  );
}
