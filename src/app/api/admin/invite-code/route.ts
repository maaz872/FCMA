import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/coach-scope";

export const dynamic = "force-dynamic";

// PUT — update the coach's own invite code
export async function PUT(request: Request) {
  const scope = await requireCoach();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { coachId } = scope;

  try {
    const body = await request.json();
    const raw = typeof body.inviteCode === "string" ? body.inviteCode.trim() : "";

    if (!raw) {
      return NextResponse.json(
        { error: "Invite code cannot be empty" },
        { status: 400 }
      );
    }

    // Normalize: lowercase, replace spaces with dashes, strip invalid chars
    const normalized = raw
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    if (normalized.length < 3 || normalized.length > 40) {
      return NextResponse.json(
        { error: "Invite code must be 3-40 characters (letters, numbers, dashes only)" },
        { status: 400 }
      );
    }

    // Check uniqueness (another coach could have this code)
    const existing = await prisma.user.findFirst({
      where: {
        inviteCode: normalized,
        NOT: { id: coachId },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "This invite code is already taken. Please choose another." },
        { status: 409 }
      );
    }

    await prisma.user.update({
      where: { id: coachId },
      data: { inviteCode: normalized },
    });

    return NextResponse.json({ success: true, inviteCode: normalized });
  } catch (error) {
    console.error("Update invite code error:", error);
    return NextResponse.json(
      { error: "Failed to update invite code" },
      { status: 500 }
    );
  }
}
