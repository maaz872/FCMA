import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meal = await prisma.mealLog.findUnique({ where: { id: parseInt(id) } });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    if (meal.userId !== user.userId && user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const updateData: Record<string, unknown> = {};
    if (body.description !== undefined) updateData.description = body.description;
    if (body.mealType !== undefined) updateData.mealType = body.mealType;
    if (body.calories !== undefined) updateData.calories = Number(body.calories);
    if (body.protein !== undefined) updateData.protein = Number(body.protein);
    if (body.carbs !== undefined) updateData.carbs = Number(body.carbs);
    if (body.fat !== undefined) updateData.fat = Number(body.fat);

    const updated = await prisma.mealLog.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Meal PUT error:", error);
    return NextResponse.json({ error: "Failed to update meal" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const meal = await prisma.mealLog.findUnique({ where: { id: parseInt(id) } });

    if (!meal) {
      return NextResponse.json({ error: "Meal not found" }, { status: 404 });
    }

    if (meal.userId !== user.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.mealLog.delete({ where: { id: parseInt(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Meal DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete meal" }, { status: 500 });
  }
}
