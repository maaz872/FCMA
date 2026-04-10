import { NextResponse } from "next/server";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !verifyPassword(password, user.passwordHash)) {
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

    // Read coach name from DB for error messages (for USER role)
    if (user.role === "USER") {
      // Get the coach name from the user's assigned coach
      let coachName = "Your Coach";
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
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again.", debug: msg },
      { status: 500 }
    );
  }
}
