"use client";

import Link from "next/link";
import { useBranding } from "@/lib/branding";

interface Stats {
  totalUsers: number;
  newThisMonth: number;
  activeUsers: number;
  revenue: number;
  pendingApprovals: number;
  totalRecipes: number;
  totalMealLogs: number;
  totalPosts: number;
}

interface RecentUser {
  firstName: string;
  lastName: string;
  createdAt: string;
  plan: string;
}

interface Props {
  stats: Stats;
  recentUsers: RecentUser[];
}

const quickActions = [
  {
    label: "Add Recipe",
    href: "/admin/recipes/new",
    icon: "\uD83C\uDF74",
    description: "Create a new recipe for the hub",
  },
  {
    label: "Add Workout",
    href: "/admin/workouts/new",
    icon: "\uD83C\uDFCB",
    description: "Create a new workout video",
  },
  {
    label: "Manage Users",
    href: "/admin/users",
    icon: "\uD83D\uDC65",
    description: "View and manage all users",
  },
  {
    label: "View Feed",
    href: "/hub/feed",
    icon: "\uD83D\uDCF1",
    description: "Browse the community feed",
  },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardClient({ stats, recentUsers }: Props) {
  const { siteName } = useBranding();
  const statCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: "\uD83D\uDC65",
      sub: `${stats.activeUsers} active (30d)`,
    },
    {
      label: "New This Month",
      value: stats.newThisMonth.toLocaleString(),
      icon: "\uD83C\uDD95",
      sub: "Signed up this month",
    },
    {
      label: "Active Users (30d)",
      value: stats.activeUsers.toLocaleString(),
      icon: "\u2705",
      sub: stats.totalUsers > 0
        ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of total`
        : "0% of total",
    },
    {
      label: "Revenue",
      value: `\u20AC${stats.revenue.toLocaleString()}`,
      icon: "\uD83D\uDCB0",
      sub: `${Math.floor(stats.revenue / 79)} Hub members`,
    },
    {
      label: "Pending Approvals",
      value: stats.pendingApprovals.toLocaleString(),
      icon: "\u23F3",
      sub: "Awaiting review",
    },
    {
      label: "Total Recipes",
      value: stats.totalRecipes.toLocaleString(),
      icon: "\uD83C\uDF74",
      sub: "In the hub",
    },
    {
      label: "Total Meal Logs",
      value: stats.totalMealLogs.toLocaleString(),
      icon: "\uD83D\uDCDD",
      sub: "Logged by users",
    },
    {
      label: "Community Posts",
      value: stats.totalPosts.toLocaleString(),
      icon: "\uD83D\uDCAC",
      sub: "In the feed",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-white/50 mt-1">
          Welcome back. Here&apos;s an overview of {siteName}.
        </p>
      </div>

      {/* Stats cards - 2 rows of 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-white/50">{stat.label}</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stat.value}
                </p>
                <p className="text-xs text-white/30 mt-2">{stat.sub}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Signups */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">Recent Signups</h2>
        <div className="bg-[#1E1E1E] border border-[#2A2A2A] rounded-2xl divide-y divide-[#2A2A2A]">
          {recentUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-white/40">
              No users yet.
            </div>
          ) : (
            recentUsers.map((user, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#E51A1A]/20 text-[#E51A1A] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-white/40">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    user.plan === "HUB"
                      ? "bg-[#E51A1A]/20 text-[#E51A1A]"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {user.plan}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
