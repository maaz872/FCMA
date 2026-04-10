"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  inviteCode: string | null;
  clientCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  billing: {
    basePriceMonthly: number;
    extraClientPrice: number;
    includedClients: number;
    billingStatus: string;
  } | null;
}

export default function CoachesListPage() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/super-admin/coaches")
      .then((r) => r.json())
      .then((d) => setCoaches(d.coaches || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggleActive(id: string, currentlyActive: boolean) {
    if (!confirm(currentlyActive
      ? "Deactivate this coach? Their clients will also be disabled."
      : "Reactivate this coach?"
    )) return;

    const res = await fetch(`/api/super-admin/coaches/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCoachActive: !currentlyActive }),
    });
    if (res.ok) {
      setCoaches((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: !currentlyActive } : c))
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Coaches</h1>
          <p className="text-white/50 text-sm mt-1">{coaches.length} total coaches</p>
        </div>
        <Link
          href="/super-admin/coaches/new"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          + Add Coach
        </Link>
      </div>

      <div className="space-y-3">
        {coaches.map((coach) => (
          <div
            key={coach.id}
            className="bg-[#1E1E1E] rounded-2xl border border-[#2A2A2A] p-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Coach info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                  coach.isActive ? "bg-blue-600" : "bg-gray-600"
                }`}>
                  {coach.firstName[0]}{coach.lastName[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/super-admin/coaches/${coach.id}`}
                      className="text-white font-semibold hover:text-blue-400 transition-colors truncate"
                    >
                      {coach.firstName} {coach.lastName}
                    </Link>
                    {!coach.isActive && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-white/40 text-xs truncate">{coach.email}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-white font-bold">{coach.clientCount}</p>
                  <p className="text-white/30 text-[10px]">Clients</p>
                </div>
                <div className="text-center">
                  <p className="text-white font-bold">
                    {coach.billing ? `${(coach.billing.basePriceMonthly / 1000).toFixed(0)}k` : "-"}
                  </p>
                  <p className="text-white/30 text-[10px]">Base/mo</p>
                </div>
                {coach.inviteCode && (
                  <div className="text-center">
                    <p className="text-blue-400 font-mono text-xs">{coach.inviteCode}</p>
                    <p className="text-white/30 text-[10px]">Invite</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 sm:ml-4">
                <Link
                  href={`/super-admin/coaches/${coach.id}`}
                  className="px-3 py-1.5 bg-[#2A2A2A] text-white/70 text-xs rounded-lg hover:bg-[#333] transition-colors"
                >
                  Details
                </Link>
                <button
                  onClick={() => toggleActive(coach.id, coach.isActive)}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer border-none ${
                    coach.isActive
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  {coach.isActive ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {coaches.length === 0 && (
          <div className="text-center py-16 text-white/40">
            <p className="text-lg mb-2">No coaches yet</p>
            <p className="text-sm">Add your first coach to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}
