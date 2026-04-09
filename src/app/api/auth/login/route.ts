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

    // Read coach name from DB for error messages
    const coachEntry = await prisma.siteContent.findUnique({
      where: { contentKey: "coach_name" },
    });
    const coachName = coachEntry?.contentValue || "Your Coach";

    // Check planStatus for the unified user model
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

    // Only ACTIVE planStatus (or ADMIN users) can log in
    if (user.role !== "ADMIN" && status !== "ACTIVE") {
      return NextResponse.json(
        {
          error:
            `Your account is not active. Please contact ${coachName} for assistance.`,
        },
        { status: 403 }
      );
    }

    const token = await createToken(
      { userId: user.id, email: user.email, role: user.role as "USER" | "ADMIN" },
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
        role: user.role,
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
