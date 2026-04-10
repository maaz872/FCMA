import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";

export async function GET() {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const users = await prisma.user.findMany({
      where: { coachId, role: "USER" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
        role: true,
        isActive: true,
        plan: true,
        planStatus: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin GET users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
