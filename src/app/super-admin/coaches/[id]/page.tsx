"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

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
  } | null;
  monthlyBill: number;
  activeClients: number;
  clients: Client[];
}

export default function CoachDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState<CoachDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/super-admin/coaches/${id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

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
      setData((prev) =>
        prev ? { ...prev, coach: { ...prev.coach, isActive: !active } } : null
      );
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
        <Link href="/super-admin/coaches" className="text-blue-400 text-sm mt-2 inline-block">
          Back to coaches
        </Link>
      </div>
    );
  }

  const { coach, billing, monthlyBill, activeClients, clients } = data;

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
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">
                {coach.firstName} {coach.lastName}
              </h1>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                coach.isActive
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}>
                {coach.isActive ? "Active" : "Inactive"}
              </span>
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

      {/* Stats + Billing */}
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
          <p className="text-white/40 text-xs font-semibold uppercase">Plan</p>
          <p className="text-sm text-white/70 mt-1">
            {billing ? `${billing.includedClients} clients + ${billing.extraClientPrice}/extra` : "No billing set"}
          </p>
        </div>
      </div>

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
