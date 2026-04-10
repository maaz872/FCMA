import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Helper endpoint: returns the user's specific coach so they can start a conversation
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve the specific coach for this user
    let coachId: string | null = null;
    if (user.role === "COACH") {
      coachId = user.userId;
    } else if (user.role === "USER") {
      coachId = user.coachId;
    }

    if (!coachId) {
      return NextResponse.json({ error: "No coach assigned" }, { status: 404 });
    }

    const coach = await prisma.user.findUnique({
      where: { id: coachId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!coach) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    // Prefer branding coach_name over coach DB name
    const coachEntry = await prisma.siteContent.findFirst({
      where: { contentKey: "coach_name", coachId },
    });
    const adminName = coachEntry?.contentValue || `${coach.firstName} ${coach.lastName}`;

    return NextResponse.json({
      adminId: coach.id,
      adminName,
    });
  } catch (error) {
    console.error("Admin lookup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
