import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await prisma.asset.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin asset DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
