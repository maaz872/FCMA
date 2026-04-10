export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import UsersAdmin from "./UsersAdmin";

export default async function AdminUsersPage() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "COACH") redirect("/login");

  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      coachId: admin.userId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      country: true,
      role: true,
      plan: true,
      planStatus: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      paymentScreenshot: true,
    },
  });

  const serialized = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    country: u.country || "",
    role: u.role,
    plan: u.plan,
    planStatus: u.planStatus,
    isActive: u.isActive,
    hasPaymentProof: !!u.paymentScreenshot,
    createdAt: u.createdAt.toISOString(),
    lastLoginAt: u.lastLoginAt?.toISOString() || null,
  }));

  return <UsersAdmin users={serialized} />;
}
