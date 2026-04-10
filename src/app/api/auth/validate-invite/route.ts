import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Validate a coach invite code before redirecting to the registration flow.
 * Returns { valid: true, coachName } if code belongs to an active coach.
 * Returns 404 if code is invalid, expired, or belongs to an inactive coach.
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code")?.trim();
    if (!code) {
      return NextResponse.json(
        { valid: false, error: "Invite code is required" },
        { status: 400 }
      );
    }

    const coach = await prisma.user.findFirst({
      where: {
        inviteCode: code,
        role: "COACH",
        isCoachActive: true,
      },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!coach) {
      return NextResponse.json(
        { valid: false, error: "Invalid or expired invite code" },
        { status: 404 }
      );
    }

    // Try to resolve the branded coach name (may differ from firstName)
    const brandedNameEntry = await prisma.siteContent.findFirst({
      where: { contentKey: "coach_name", coachId: coach.id },
    });
    const coachName =
      brandedNameEntry?.contentValue || `${coach.firstName} ${coach.lastName}`;

    return NextResponse.json({ valid: true, coachName });
  } catch (error) {
    console.error("Validate invite error:", error);
    return NextResponse.json(
      { valid: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
