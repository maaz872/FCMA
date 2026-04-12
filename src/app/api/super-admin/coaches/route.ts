import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/coach-scope";
import { hashPassword } from "@/lib/auth";
import { addDays, daysUntilExpiry, resolveSubscriptionStatus } from "@/lib/billing";
import { seedCoachDefaults } from "@/lib/seed-coach-defaults";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// GET — list all coaches with client counts
export async function GET() {
  const sa = await requireSuperAdmin();
  if (!sa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const coaches = await prisma.user.findMany({
      where: { role: "COACH" },
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
      orderBy: { createdAt: "desc" },
    });

    const billing = await prisma.coachBilling.findMany();
    const billingMap = new Map(billing.map((b) => [b.coachId, b]));

    const result = coaches.map((c) => {
      const b = billingMap.get(c.id);
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        isActive: c.isCoachActive,
        inviteCode: c.inviteCode,
        clientCount: c._count.clients,
        createdAt: c.createdAt.toISOString(),
        lastLoginAt: c.lastLoginAt?.toISOString() || null,
        billing: b
          ? {
              basePriceMonthly: b.basePriceMonthly,
              extraClientPrice: b.extraClientPrice,
              includedClients: b.includedClients,
              maxClients: b.maxClients,
              billingStatus: b.billingStatus,
              currentPeriodEnd: b.currentPeriodEnd.toISOString(),
              subscriptionStatus: resolveSubscriptionStatus(b.currentPeriodEnd, b.billingStatus),
              daysLeft: daysUntilExpiry(b.currentPeriodEnd),
            }
          : null,
      };
    });

    return NextResponse.json({ coaches: result });
  } catch (error) {
    console.error("List coaches error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — create a new coach
export async function POST(request: Request) {
  const sa = await requireSuperAdmin();
  if (!sa) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { firstName, lastName, email, password, basePriceMonthly, extraClientPrice, includedClients, maxClients } = body;

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: "First name, last name, email, and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const coachId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const inviteCode = firstName.toLowerCase().replace(/\s+/g, "") + "-" + Math.random().toString(36).slice(2, 6);

    // Create coach user
    await prisma.user.create({
      data: {
        id: coachId,
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role: "COACH",
        plan: "FREE",
        planStatus: "ACTIVE",
        isActive: true,
        isCoachActive: true,
        inviteCode,
      },
    });

    // Create billing record — first 30-day period starts now
    await prisma.coachBilling.create({
      data: {
        coachId,
        basePriceMonthly: basePriceMonthly || 15000,
        extraClientPrice: extraClientPrice || 3500,
        includedClients: includedClients || 5,
        maxClients: maxClients || 5,
        billingStatus: "ACTIVE",
        currentPeriodEnd: addDays(new Date(), 30),
      },
    });

    // Create default SiteContent entries
    const defaults = [
      { contentKey: "site_name", contentValue: `${firstName}'s Fitness` },
      { contentKey: "coach_name", contentValue: `Coach ${firstName}` },
    ];
    for (const d of defaults) {
      await prisma.siteContent.create({
        data: { ...d, coachId },
      });
    }

    // Seed foundational data (categories, tags, food database)
    await seedCoachDefaults(coachId);

    return NextResponse.json({
      success: true,
      coach: { id: coachId, email: email.toLowerCase(), firstName, lastName, inviteCode },
    });
  } catch (error) {
    console.error("Create coach error:", error);
    return NextResponse.json({ error: "Failed to create coach" }, { status: 500 });
  }
}
