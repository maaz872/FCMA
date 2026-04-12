import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateMonthlyBill,
  daysUntilExpiry,
  resolveSubscriptionStatus,
} from "@/lib/billing";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // For COACH role, attach subscription summary
  let subscription = null;
  if (user.role === "COACH") {
    const billing = await prisma.coachBilling.findUnique({
      where: { coachId: user.id },
    });
    if (billing) {
      const activeClientCount = await prisma.user.count({
        where: { coachId: user.id, role: "USER", isActive: true, planStatus: "ACTIVE" },
      });
      subscription = {
        status: resolveSubscriptionStatus(billing.currentPeriodEnd, billing.billingStatus),
        daysLeft: daysUntilExpiry(billing.currentPeriodEnd),
        currentPeriodEnd: billing.currentPeriodEnd.toISOString(),
        basePriceMonthly: billing.basePriceMonthly,
        includedClients: billing.includedClients,
        extraClientPrice: billing.extraClientPrice,
        maxClients: billing.maxClients,
        activeClientCount,
        monthlyBill: calculateMonthlyBill(
          activeClientCount,
          billing.basePriceMonthly,
          billing.includedClients,
          billing.extraClientPrice
        ),
      };
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      country: user.country,
      role: user.role === "ADMIN" ? "COACH" : user.role,
      coachId: user.coachId,
      inviteCode: user.inviteCode,
      plan: user.plan,
      planStatus: user.planStatus,
      unitPreference: user.unitPreference,
      createdAt: user.createdAt,
      age: user.age,
      gender: user.gender,
      heightCm: user.heightCm,
      currentWeightKg: user.currentWeightKg,
      bodyFatPercent: user.bodyFatPercent,
      fitnessGoal: user.fitnessGoal,
      activityLevel: user.activityLevel,
      dietaryPrefs: user.dietaryPrefs,
      healthConditions: user.healthConditions,
      targetWeightKg: user.targetWeightKg,
      subscription,
    },
  });
}
