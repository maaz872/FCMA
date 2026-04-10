import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/coach-scope";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const assetId = parseInt(id);

    // Verify ownership
    const existing = await prisma.asset.findFirst({ where: { id: assetId, coachId } });
    if (!existing) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    await prisma.asset.delete({ where: { id: assetId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin asset DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
