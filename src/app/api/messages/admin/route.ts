import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Helper endpoint: returns the admin user's ID so users can start a conversation
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await prisma.user.findFirst({
      where: { role: "COACH" },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Prefer branding coach_name over admin DB name
    const coachEntry = await prisma.siteContent.findFirst({
      where: { contentKey: "coach_name" },
    });
    const adminName = coachEntry?.contentValue || `${admin.firstName} ${admin.lastName}`;

    return NextResponse.json({
      adminId: admin.id,
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
