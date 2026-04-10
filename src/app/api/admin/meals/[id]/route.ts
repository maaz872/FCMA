import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meal = await prisma.mealLog.findUnique({ where: { id: parseInt(id) } });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    await prisma.mealLog.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin meal DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete meal" }, { status: 500 });
  }
}
