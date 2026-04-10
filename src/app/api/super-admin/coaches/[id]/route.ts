import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/coach-scope";
import { calculateMonthlyBill } from "@/lib/billing";

export const dynamic = "force-dynamic";

// GET — coach detail
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sa = await requireSuperAdmin();
  if (!sa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const coach = await prisma.user.findFirst({
      where: { id, role: "COACH" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isCoachActive: true,
        inviteCode: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { clients: true } },
      },
    });

    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    const billing = await prisma.coachBilling.findUnique({ where: { coachId: id } });

    // Get recent clients
    const clients = await prisma.user.findMany({
      where: { coachId: id, role: "USER" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        planStatus: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const activeClients = clients.filter((c) => c.isActive && c.planStatus === "ACTIVE").length;
    const monthlyBill = billing
      ? calculateMonthlyBill(activeClients, billing.basePriceMonthly, billing.includedClients, billing.extraClientPrice)
      : 0;

    return NextResponse.json({
      coach: {
        id: coach.id,
        firstName: coach.firstName,
        lastName: coach.lastName,
        email: coach.email,
        isActive: coach.isCoachActive,
        inviteCode: coach.inviteCode,
        clientCount: coach._count.clients,
        createdAt: coach.createdAt.toISOString(),
        lastLoginAt: coach.lastLoginAt?.toISOString() || null,
      },
      billing: billing
        ? {
            basePriceMonthly: billing.basePriceMonthly,
            extraClientPrice: billing.extraClientPrice,
            includedClients: billing.includedClients,
            billingStatus: billing.billingStatus,
          }
        : null,
      monthlyBill,
      activeClients,
      clients: clients.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        lastLoginAt: c.lastLoginAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    console.error("Coach detail error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PUT — update coach (toggle active, update billing)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sa = await requireSuperAdmin();
  if (!sa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const coach = await prisma.user.findFirst({ where: { id, role: "COACH" } });
    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    // Update coach active status
    if (body.isCoachActive !== undefined) {
      await prisma.user.update({
        where: { id },
        data: { isCoachActive: body.isCoachActive },
      });

      // If deactivating, disable all their clients too
      if (!body.isCoachActive) {
        await prisma.user.updateMany({
          where: { coachId: id, role: "USER" },
          data: { isActive: false },
        });
      }
    }

    // Update billing terms
    if (body.basePriceMonthly !== undefined || body.extraClientPrice !== undefined || body.includedClients !== undefined) {
      await prisma.coachBilling.upsert({
        where: { coachId: id },
        update: {
          ...(body.basePriceMonthly !== undefined && { basePriceMonthly: body.basePriceMonthly }),
          ...(body.extraClientPrice !== undefined && { extraClientPrice: body.extraClientPrice }),
          ...(body.includedClients !== undefined && { includedClients: body.includedClients }),
        },
        create: {
          coachId: id,
          basePriceMonthly: body.basePriceMonthly || 15000,
          extraClientPrice: body.extraClientPrice || 3500,
          includedClients: body.includedClients || 5,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update coach error:", error);
    return NextResponse.json({ error: "Failed to update coach" }, { status: 500 });
  }
}
