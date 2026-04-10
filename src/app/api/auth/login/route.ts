import { NextResponse } from "next/server";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveSubscriptionStatus } from "@/lib/billing";
import {
  checkLoginRateLimit,
  recordLoginAttempt,
  getClientIp,
} from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;
    const ip = getClientIp(request);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Rate limit: 5 failed attempts per email per 15 minutes
    const rateLimit = await checkLoginRateLimit(email);
    if (!rateLimit.allowed) {
      const minutes = Math.ceil((rateLimit.retryAfterSeconds || 900) / 60);
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds || 900),
          },
        }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      await recordLoginAttempt(email, ip, false);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account has been deactivated" },
        { status: 403 }
      );
    }

    // For coaches: check if coach account is active
    if (user.role === "COACH" && !user.isCoachActive) {
      return NextResponse.json(
        { error: "Your coaching account has been suspended. Please contact the administrator." },
        { status: 403 }
      );
    }

    // For coaches: check subscription state (7-day grace period then block)
    if (user.role === "COACH") {
      const billing = await prisma.coachBilling.findUnique({ where: { coachId: user.id } });
      if (billing) {
        const subStatus = resolveSubscriptionStatus(billing.currentPeriodEnd, billing.billingStatus);
        if (subStatus === "EXPIRED") {
          return NextResponse.json(
            { error: "Your subscription has expired. Please contact the administrator to renew." },
            { status: 403 }
          );
        }
        if (subStatus === "CANCELLED") {
          return NextResponse.json(
            { error: "Your subscription has been cancelled. Please contact the administrator to reactivate." },
            { status: 403 }
          );
        }
        // ACTIVE or GRACE → allow login; grace banner will surface via /api/auth/me
      }
    }

    // Read coach name from DB for error messages (for USER role)
    if (user.role === "USER") {
      // Get the coach name from the user's assigned coach
      let coachName = "your coach";
      if (user.coachId) {
        const coachEntry = await prisma.siteContent.findFirst({
          where: { contentKey: "coach_name", coachId: user.coachId },
        });
        if (coachEntry) coachName = coachEntry.contentValue;
      }

      const status = user.planStatus;

      if (status === "PENDING") {
        return NextResponse.json(
          {
            error:
              `Your account is pending approval. ${coachName} will review and activate your account within 24 hours of payment confirmation.`,
          },
          { status: 403 }
        );
      }

      if (status === "CANCELLED" || status === "EXPIRED") {
        return NextResponse.json(
          {
            error:
              `Your plan has expired or been cancelled. Please contact ${coachName} to renew your access.`,
          },
          { status: 403 }
        );
      }

      if (status !== "ACTIVE") {
        return NextResponse.json(
          {
            error:
              `Your account is not active. Please contact ${coachName} for assistance.`,
          },
          { status: 403 }
        );
      }
    }

    // Map legacy "ADMIN" role to "COACH" for backward compat
    let role = user.role;
    if (role === "ADMIN") role = "COACH";

    const token = await createToken(
      {
        userId: user.id,
        email: user.email,
        role: role as "USER" | "COACH" | "SUPER_ADMIN",
        coachId: user.coachId || null,
      },
      rememberMe
    );

    await setSessionCookie(token, rememberMe);

    // Record successful login for rate-limit bookkeeping
    await recordLoginAttempt(email, ip, true);

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
