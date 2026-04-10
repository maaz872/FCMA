import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    // Try to resolve coachId from session
    let coachId: string | null = null;
    try {
      const user = await getCurrentUser();
      if (user) {
        coachId = user.role === "COACH" ? user.userId : user.coachId || null;
      }
    } catch {}

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
