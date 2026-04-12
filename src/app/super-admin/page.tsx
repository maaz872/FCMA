"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Stats {
  totalCoaches: number;
  activeCoaches: number;
  totalClients: number;
  newClientsMonth: number;
  monthlyRevenue: number;
  expiringCoaches: number;
  expiredCoaches: number;
  overCapacityCoaches: number;
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/dashboard")
      .then((r) => r.json())
      .then(setStats)
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

  const cards = [
    { label: "Total Coaches", value: stats?.totalCoaches ?? 0, color: "blue" },
    { label: "Active Coaches", value: stats?.activeCoaches ?? 0, color: "green" },
    { label: "Total Clients", value: stats?.totalClients ?? 0, color: "purple" },
    { label: "New This Month", value: stats?.newClientsMonth ?? 0, color: "yellow" },
    { label: "Expiring Soon", value: stats?.expiringCoaches ?? 0, color: "amber" },
    { label: "Expired / Cancelled", value: stats?.expiredCoaches ?? 0, color: "red" },
    { label: "Over Capacity", value: stats?.overCapacityCoaches ?? 0, color: (stats?.overCapacityCoaches ?? 0) > 0 ? "red" : "green" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    yellow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    red: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Super Admin Dashboard</h1>
        <p className="text-white/50 mt-1">FCMA Platform Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-5 ${colorMap[card.color]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">
              {card.label}
            </p>
            <p className="text-3xl font-bold">{card.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Revenue Card */}
      <div className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/50 font-medium">Monthly Revenue</p>
            <p className="text-4xl font-bold text-white mt-1">
              PKR {(stats?.monthlyRevenue ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <Link
              href="/super-admin/billing"
              className="text-sm text-blue-400 hover:text-blue-300 font-medium"
            >
              View Billing Details &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/super-admin/coaches/new"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 transition-colors block"
        >
          <p className="font-bold text-lg">Add New Coach</p>
          <p className="text-white/70 text-sm mt-1">Create a new coaching account</p>
        </Link>
        <Link
          href="/super-admin/coaches"
          className="bg-[#1E1E1E] hover:bg-[#252525] border border-[#2A2A2A] text-white rounded-2xl p-6 transition-colors block"
        >
          <p className="font-bold text-lg">Manage Coaches</p>
          <p className="text-white/50 text-sm mt-1">View all coaches and their clients</p>
        </Link>
      </div>
    </div>
  );
}
