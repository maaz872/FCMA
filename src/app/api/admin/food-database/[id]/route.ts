import { prisma } from "@/lib/db";
import { requireCoach } from "@/lib/coach-scope";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const item = await prisma.foodItem.findFirst({ where: { id: parseInt(id), coachId } });

    if (!item) {
      return NextResponse.json({ error: "Food item not found" }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Admin food item GET error:", error);
    return NextResponse.json({ error: "Failed to fetch food item" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const foodItemId = parseInt(id);

    // Verify ownership
    const existing = await prisma.foodItem.findFirst({ where: { id: foodItemId, coachId } });
    if (!existing) {
      return NextResponse.json({ error: "Food item not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, category, subcategory, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, fiberPer100g, servingSize, servingUnit, isVerified } = body;

    const item = await prisma.foodItem.update({
      where: { id: foodItemId },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        subcategory: subcategory || null,
        ...(caloriesPer100g != null && { caloriesPer100g: parseInt(caloriesPer100g) }),
        ...(proteinPer100g != null && { proteinPer100g: parseFloat(proteinPer100g) }),
        ...(carbsPer100g != null && { carbsPer100g: parseFloat(carbsPer100g) }),
        ...(fatPer100g != null && { fatPer100g: parseFloat(fatPer100g) }),
        fiberPer100g: fiberPer100g != null ? parseFloat(fiberPer100g) : null,
        servingSize: servingSize ? parseInt(servingSize) : null,
        servingUnit: servingUnit || null,
        ...(isVerified != null && { isVerified }),
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Admin food item PUT error:", error);
    return NextResponse.json({ error: "Failed to update food item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const scope = await requireCoach();
    if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { coachId } = scope;

    const { id } = await params;
    const foodItemId = parseInt(id);

    // Verify ownership
    const existing = await prisma.foodItem.findFirst({ where: { id: foodItemId, coachId } });
    if (!existing) {
      return NextResponse.json({ error: "Food item not found" }, { status: 404 });
    }

    await prisma.foodItem.delete({ where: { id: foodItemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin food item DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete food item" }, { status: 500 });
  }
}
