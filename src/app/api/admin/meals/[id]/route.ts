import { NextRequest, NextResponse } from "next/server";
import { requireCoach } from "@/lib/coach-scope";
import { prisma } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const meal = await prisma.mealLog.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, userId: true },
    });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    // Verify the meal's user belongs to this coach
    const mealOwner = await prisma.user.findFirst({ where: { id: meal.userId, coachId } });
    if (!mealOwner) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    await prisma.mealLog.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin meal DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete meal" }, { status: 500 });
  }
}
