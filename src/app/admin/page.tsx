export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboard() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "COACH") redirect("/login");
  const coachId = admin.userId;

  const totalUsers = await prisma.user.count({ where: { role: "USER", coachId } });
  const newThisMonth = await prisma.user.count({
    where: {
      role: "USER",
      coachId,
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });
  const activeUsers = await prisma.user.count({
    where: {
      coachId,
      lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
  const hubUsersCount = await prisma.user.count({
    where: { planStatus: "ACTIVE", plan: "HUB", coachId },
  });
  const revenue = hubUsersCount * 79;
  const pendingApprovals = await prisma.user.count({
    where: { planStatus: "PENDING", coachId },
  });
  const totalRecipes = await prisma.recipe.count({ where: { coachId } });
  const totalMealLogs = await prisma.mealLog.count({
    where: { user: { coachId } },
  });
  const totalPosts = await prisma.post.count({ where: { coachId } });

  const billing = await prisma.coachBilling.findUnique({ where: { coachId } });
  const activeClientsCount = await prisma.user.count({
    where: { role: "USER", coachId, isActive: true, planStatus: "ACTIVE" },
  });

  const recentUsers = await prisma.user.findMany({
    where: { role: "USER", coachId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      firstName: true,
      lastName: true,
      createdAt: true,
      plan: true,
    },
  });

  // ── At-risk clients: rank active clients by a composite risk score
  //    blending days-since-login, days-since-last-meal-log, and
  //    days-since-last-completed-workout. Returns the worst 5.
  const atRiskClients = await computeAtRiskClients(coachId);

  return (
    <AdminDashboardClient
      activeClients={activeClientsCount}
      maxClients={billing?.maxClients || 5}
      stats={{
        totalUsers,
        newThisMonth,
        activeUsers,
        revenue,
        pendingApprovals,
        totalRecipes,
        totalMealLogs,
        totalPosts,
      }}
      recentUsers={recentUsers.map(
        (u: {
          firstName: string;
          lastName: string;
          createdAt: Date;
          plan: string;
        }) => ({
          firstName: u.firstName,
          lastName: u.lastName,
          createdAt: u.createdAt.toISOString(),
          plan: u.plan,
        })
      )}
      atRiskClients={atRiskClients}
    />
  );
}

async function computeAtRiskClients(coachId: string) {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const clients = await prisma.user.findMany({
    where: { role: "USER", coachId, isActive: true, planStatus: "ACTIVE" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      lastLoginAt: true,
      mealLogs: {
        select: { loggedDate: true },
        orderBy: { loggedDate: "desc" },
        take: 1,
      },
      dailyProgress: {
        where: { workoutCompleted: true },
        select: { date: true },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  type AtRisk = {
    userId: string;
    name: string;
    score: number;
    primaryReason: string;
  };

  const rows: AtRisk[] = clients.map((c) => {
    const daysLogin = c.lastLoginAt
      ? Math.floor((now - c.lastLoginAt.getTime()) / dayMs)
      : 30;
    const daysMeal = c.mealLogs[0]
      ? Math.floor((now - c.mealLogs[0].loggedDate.getTime()) / dayMs)
      : 14;
    const daysWorkout = c.dailyProgress[0]
      ? Math.floor((now - c.dailyProgress[0].date.getTime()) / dayMs)
      : 14;

    const loginScore = Math.min(daysLogin, 30) * 5;
    const mealScore = Math.min(daysMeal, 14) * 3;
    const workoutScore = Math.min(daysWorkout, 14) * 4;

    let primaryReason = "";
    if (daysLogin >= 4 && loginScore >= mealScore && loginScore >= workoutScore) {
      primaryReason = `no login for ${daysLogin} day${daysLogin === 1 ? "" : "s"}`;
    } else if (daysMeal >= 3 && mealScore >= workoutScore) {
      primaryReason = `no meal logged in ${daysMeal} day${daysMeal === 1 ? "" : "s"}`;
    } else if (daysWorkout >= 4) {
      primaryReason = `no workout completed in ${daysWorkout} day${daysWorkout === 1 ? "" : "s"}`;
    } else {
      primaryReason = "doing well";
    }

    return {
      userId: c.id,
      name: `${c.firstName} ${c.lastName}`,
      score: loginScore + mealScore + workoutScore,
      primaryReason,
    };
  });

  return rows
    .filter((r) => r.primaryReason !== "doing well")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
