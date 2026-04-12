import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/coach-scope";
import {
  calculateMonthlyBill,
  addDays,
  daysUntilExpiry,
  resolveSubscriptionStatus,
} from "@/lib/billing";
import { seedCoachDefaults } from "@/lib/seed-coach-defaults";

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
            maxClients: billing.maxClients,
            billingStatus: billing.billingStatus,
            currentPeriodEnd: billing.currentPeriodEnd.toISOString(),
            subscriptionStatus: resolveSubscriptionStatus(billing.currentPeriodEnd, billing.billingStatus),
            daysLeft: daysUntilExpiry(billing.currentPeriodEnd),
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

// PUT — update coach (toggle active, update billing, subscription actions)
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

    // ─── Subscription actions ────────────────────────────────
    if (body.action === "extend") {
      const days = Number(body.days);
      if (!Number.isFinite(days) || days <= 0 || days > 365) {
        return NextResponse.json(
          { error: "Extension must be between 1 and 365 days" },
          { status: 400 }
        );
      }
      const current = await prisma.coachBilling.findUnique({ where: { coachId: id } });
      if (!current) {
        return NextResponse.json({ error: "Coach has no billing record" }, { status: 400 });
      }
      const base = current.currentPeriodEnd > new Date() ? current.currentPeriodEnd : new Date();
      await prisma.coachBilling.update({
        where: { coachId: id },
        data: { currentPeriodEnd: addDays(base, days) },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "renew") {
      const current = await prisma.coachBilling.findUnique({ where: { coachId: id } });
      if (!current) {
        return NextResponse.json({ error: "Coach has no billing record" }, { status: 400 });
      }
      const now = new Date();
      const base = current.currentPeriodEnd > now ? current.currentPeriodEnd : now;
      await prisma.coachBilling.update({
        where: { coachId: id },
        data: { currentPeriodEnd: addDays(base, 30), billingStatus: "ACTIVE" },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "cancelSubscription") {
      await prisma.coachBilling.update({
        where: { coachId: id },
        data: { billingStatus: "CANCELLED" },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === "reactivateSubscription") {
      const current = await prisma.coachBilling.findUnique({ where: { coachId: id } });
      const now = new Date();
      const needsNewPeriod = !current || current.currentPeriodEnd < now;
      await prisma.coachBilling.update({
        where: { coachId: id },
        data: {
          billingStatus: "ACTIVE",
          ...(needsNewPeriod && { currentPeriodEnd: addDays(now, 30) }),
        },
      });
      return NextResponse.json({ success: true });
    }

    // ─── Seed defaults (categories, tags, food database) ─────
    if (body.action === "seedDefaults") {
      // Check if already seeded
      const existingCats = await prisma.recipeCategory.count({ where: { coachId: id } });
      if (existingCats > 0) {
        return NextResponse.json(
          { error: "This coach already has default data seeded. To re-seed, delete existing categories first." },
          { status: 409 }
        );
      }
      await seedCoachDefaults(id);
      return NextResponse.json({ success: true, message: "Default categories, tags, and food database seeded." });
    }

    // ─── Coach active toggle ─────────────────────────────────
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

    // ─── Billing terms update (basePriceMonthly / includedClients / extraClientPrice) ─
    if (body.basePriceMonthly !== undefined || body.extraClientPrice !== undefined || body.includedClients !== undefined || body.maxClients !== undefined) {
      await prisma.coachBilling.upsert({
        where: { coachId: id },
        update: {
          ...(body.basePriceMonthly !== undefined && { basePriceMonthly: Number(body.basePriceMonthly) }),
          ...(body.extraClientPrice !== undefined && { extraClientPrice: Number(body.extraClientPrice) }),
          ...(body.includedClients !== undefined && { includedClients: Number(body.includedClients) }),
          ...(body.maxClients !== undefined && { maxClients: Number(body.maxClients) }),
        },
        create: {
          coachId: id,
          basePriceMonthly: body.basePriceMonthly || 15000,
          extraClientPrice: body.extraClientPrice || 3500,
          includedClients: body.includedClients || 5,
          maxClients: body.maxClients || 5,
          currentPeriodEnd: addDays(new Date(), 30),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update coach error:", error);
    return NextResponse.json({ error: "Failed to update coach" }, { status: 500 });
  }
}
