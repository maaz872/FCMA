import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/coach-scope";
import { calculateMonthlyBill } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET() {
  const sa = await requireSuperAdmin();
  if (!sa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const billings = await prisma.coachBilling.findMany({
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isCoachActive: true,
            _count: { select: { clients: true } },
          },
        },
      },
    });

    // Get active client counts per coach
    const coachIds = billings.map((b) => b.coachId);
    const activeClients = await prisma.user.groupBy({
      by: ["coachId"],
      where: { coachId: { in: coachIds }, role: "USER", isActive: true, planStatus: "ACTIVE" },
      _count: true,
    });
    const activeMap = new Map(activeClients.map((a) => [a.coachId!, a._count]));

    let totalRevenue = 0;
    const rows = billings.map((b) => {
      const active = activeMap.get(b.coachId) || 0;
      const bill = calculateMonthlyBill(active, b.basePriceMonthly, b.includedClients, b.extraClientPrice);
      totalRevenue += bill;

      return {
        coachId: b.coachId,
        coachName: `${b.coach.firstName} ${b.coach.lastName}`,
        coachEmail: b.coach.email,
        isActive: b.coach.isCoachActive,
        totalClients: b.coach._count.clients,
        activeClients: active,
        basePriceMonthly: b.basePriceMonthly,
        includedClients: b.includedClients,
        extraClientPrice: b.extraClientPrice,
        monthlyBill: bill,
        billingStatus: b.billingStatus,
      };
    });

    return NextResponse.json({ billings: rows, totalRevenue });
  } catch (error) {
    console.error("Billing error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
