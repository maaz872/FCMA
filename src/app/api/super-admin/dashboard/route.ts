import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/coach-scope";
import { calculateMonthlyBill } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const sa = await requireSuperAdmin();
  if (!sa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [totalCoaches, activeCoaches, totalClients, newClientsMonth, billings] =
      await Promise.all([
        prisma.user.count({ where: { role: "COACH" } }),
        prisma.user.count({ where: { role: "COACH", isCoachActive: true } }),
        prisma.user.count({ where: { role: "USER" } }),
        prisma.user.count({
          where: {
            role: "USER",
            createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
          },
        }),
        prisma.coachBilling.findMany({ include: { coach: { include: { _count: { select: { clients: true } } } } } }),
      ]);

    let monthlyRevenue = 0;
    for (const b of billings) {
      const activeClients = b.coach._count.clients;
      monthlyRevenue += calculateMonthlyBill(activeClients, b.basePriceMonthly, b.includedClients, b.extraClientPrice);
    }

    return NextResponse.json({
      totalCoaches,
      activeCoaches,
      totalClients,
      newClientsMonth,
      monthlyRevenue,
    });
  } catch (error) {
    console.error("Super admin dashboard error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
