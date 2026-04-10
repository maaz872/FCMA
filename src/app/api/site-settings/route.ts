import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    let coachId: string | null = null;

    // Option 1: ?coach=<inviteCode> query param (public, for registration/login pages)
    const inviteCode = request.nextUrl.searchParams.get("coach");
    if (inviteCode) {
      const coach = await prisma.user.findFirst({
        where: { inviteCode, role: "COACH", isCoachActive: true },
        select: { id: true },
      });
      if (coach) coachId = coach.id;
    }

    // Option 2: Resolve from session (logged-in user)
    if (!coachId) {
      try {
        const user = await getCurrentUser();
        if (user) {
          coachId = user.role === "COACH" ? user.userId : user.coachId || null;
        }
      } catch {}
    }

    // Fetch coach-specific or all settings
    const where = coachId ? { coachId } : {};
    const settings = await prisma.siteContent.findMany({ where });
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.contentKey] = s.contentValue;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to fetch site settings:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
