import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.foodItem.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Admin food database GET error:", error);
    return NextResponse.json({ error: "Failed to fetch food items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "COACH") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, category, subcategory, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g, fiberPer100g, servingSize, servingUnit, isVerified } = body;

    if (!name || !category || caloriesPer100g == null) {
      return NextResponse.json({ error: "Name, category, and calories are required" }, { status: 400 });
    }

    const item = await prisma.foodItem.create({
      data: {
        name,
        category,
        subcategory: subcategory || null,
        caloriesPer100g: parseInt(caloriesPer100g),
        proteinPer100g: parseFloat(proteinPer100g) || 0,
        carbsPer100g: parseFloat(carbsPer100g) || 0,
        fatPer100g: parseFloat(fatPer100g) || 0,
        fiberPer100g: fiberPer100g ? parseFloat(fiberPer100g) : null,
        servingSize: servingSize ? parseInt(servingSize) : null,
        servingUnit: servingUnit || null,
        isVerified: isVerified ?? true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Admin food database POST error:", error);
    return NextResponse.json({ error: "Failed to create food item" }, { status: 500 });
  }
}
