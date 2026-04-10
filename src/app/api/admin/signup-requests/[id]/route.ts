import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentUser();
  if (!session || session.role !== "COACH") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body; // "approve" | "decline"

  if (!action || !["approve", "decline"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.user.update({
      where: { id },
      data: { planStatus: "ACTIVE" },
    });
  } else {
    await prisma.user.update({
      where: { id },
      data: { planStatus: "CANCELLED" },
    });
  }

  return NextResponse.json({ success: true });
}
