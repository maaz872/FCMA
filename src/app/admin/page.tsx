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
    />
  );
}
