"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  role: string;
  plan: string;
  planStatus: string;
  isActive: boolean;
  hasPaymentProof?: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

const planColors: Record<string, string> = {
  FREE: "bg-white/10 text-white/50",
  HUB: "bg-[#FF6B00]/20 text-[#FF6B00]",
};

const statusColors: Record<string, string> = {
  PENDING: "bg-[#FFB800]/20 text-[#FFB800]",
  ACTIVE: "bg-green-500/20 text-green-400",
  EXPIRED: "bg-white/10 text-white/40",
  CANCELLED: "bg-[#E51A1A]/20 text-[#E51A1A]",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function UsersAdmin({ users: initialUsers }: { users: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = [...users];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "ALL") {
      result = result.filter((u) => u.planStatus === filterStatus);
    }
    return result;
  }, [users, search, filterStatus]);

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "PENDING" : "ACTIVE";
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planStatus: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, planStatus: newStatus } : u))
        );
      }
    } catch {
      // ignore
    }
    setActionLoading(null);
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete "${name}" and ALL their data? This cannot be undone.`)) return;
    if (!confirm(`Are you absolutely sure? All meals, weight logs, progress, messages, and plan data will be permanently deleted.`)) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch {
      alert("Failed to delete user");
    }
    setActionLoading(null);
  }

  const pendingCount = users.filter((u) => u.planStatus === "PENDING" && u.role !== "COACH").length;
  const activeCount = users.filter((u) => u.planStatus === "ACTIVE").length;
  const totalUsers = users.filter((u) => u.role !== "COACH").length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-white">Users</h1>
          <p className="text-white/40 text-sm mt-1">
            {totalUsers} total users &middot; {activeCount} active &middot; {pendingCount} pending
          </p>
        </div>
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FFB800]/20 flex items-center justify-center text-[#FFB800] font-black text-lg flex-shrink-0">
            {pendingCount}
          </div>
          <div>
            <p className="text-[#FFB800] font-bold text-sm">
              Pending Approval{pendingCount > 1 ? "s" : ""}
            </p>
            <p className="text-white/40 text-xs">
              Users waiting for account activation
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[#1E1E1E] border border-[#2A2A2A] rounded-xl py-2.5 px-4 text-white text-sm placeholder:text-white/30 focus:border-[#E51A1A] focus:outline-none"
        />
        <div className="flex gap-2 flex-wrap">
          {["ALL", "PENDING", "ACTIVE", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer border-none ${
                filterStatus === s
                  ? "bg-[#E51A1A] text-white"
                  : "bg-[#1E1E1E] text-white/50 hover:text-white"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* User Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-16 text-center">
          <p className="text-white/30 text-lg">No users found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((user) => (
            <div
              key={user.id}
              className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl overflow-hidden hover:border-[#E51A1A]/30 transition-all group"
            >
              {/* Card Header — clickable to detail */}
              <Link
                href={`/admin/users/${user.id}`}
                className="block p-5 pb-3"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-[#E51A1A]/20 flex items-center justify-center text-[#E51A1A] font-bold text-sm flex-shrink-0">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate group-hover:text-[#E51A1A] transition-colors">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-white/40 text-xs truncate">{user.email}</p>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      planColors[user.plan] || "bg-white/10 text-white/50"
                    }`}
                  >
                    {user.plan}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      statusColors[user.planStatus] || "bg-white/10 text-white/50"
                    }`}
                  >
                    {user.planStatus}
                  </span>
                  {user.role === "COACH" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E51A1A]/20 text-[#E51A1A]">
                      ADMIN
                    </span>
                  )}
                  {!user.isActive && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/30">
                      Deactivated
                    </span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 mt-3 text-[10px] text-white/30">
                  <span>Joined {timeAgo(user.createdAt)}</span>
                  {user.lastLoginAt && (
                    <span>Last login {timeAgo(user.lastLoginAt)}</span>
                  )}
                  {user.country && <span>{user.country}</span>}
                </div>
              </Link>

              {/* Card Footer — actions */}
              {user.role !== "COACH" && (
                <div className="border-t border-[#2A2A2A] px-5 py-3 flex items-center justify-between">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-xs text-[#E51A1A] font-semibold hover:underline"
                  >
                    View Details &rarr;
                  </Link>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        toggleStatus(user.id, user.planStatus);
                      }}
                      disabled={actionLoading === user.id}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border-none transition-colors ${
                        user.planStatus === "ACTIVE"
                          ? "bg-[#FFB800]/20 text-[#FFB800] hover:bg-[#FFB800]/30"
                          : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      }`}
                    >
                      {actionLoading === user.id
                        ? "..."
                        : user.planStatus === "ACTIVE"
                        ? "Suspend"
                        : "Activate"}
                    </button>
                    {user.role !== "COACH" && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          deleteUser(user.id, `${user.firstName} ${user.lastName}`);
                        }}
                        disabled={actionLoading === user.id}
                        className="px-3 py-1 rounded-lg text-[10px] font-semibold cursor-pointer border-none bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                      >
                        {actionLoading === user.id ? "..." : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
