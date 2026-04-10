import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { notifyAdmin } from "@/lib/notifications";
import { validateBase64Upload } from "@/lib/upload-validation";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json({ error: "Date parameter required" }, { status: 400 });
    }

    const startOfDay = new Date(date + "T00:00:00");
    const endOfDay = new Date(date + "T23:59:59.999");

    const meals = await prisma.mealLog.findMany({
      where: {
        userId: user.userId,
        loggedDate: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { loggedTime: "asc" },
    });

    return NextResponse.json({ meals });
  } catch (error) {
    console.error("Meals GET error:", error);
    return NextResponse.json({ error: "Failed to fetch meals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      mealType,
      description,
      calories,
      protein,
      carbs,
      fat,
      ingredients,
      imageData,
      loggedDate,
      loggedTime,
    } = body;

    if (!mealType || !description || calories == null || !loggedDate || !loggedTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If a meal photo is attached, validate it against the whitelist + size limit
    if (imageData) {
      const validation = validateBase64Upload(imageData);
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    }

    const meal = await prisma.mealLog.create({
      data: {
        userId: user.userId,
        mealType,
        description,
        calories: parseInt(calories),
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        ingredients: ingredients || null,
        imageData: imageData || null,
        loggedDate: new Date(loggedDate + "T00:00:00.000Z"),
        loggedTime,
      },
    });

    // Notify admin about logged meal
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { firstName: true },
      });
      const firstName = dbUser?.firstName || "A user";
      notifyAdmin(
        `${firstName} logged a meal`,
        `${firstName} logged a ${mealType}: ${description}`,
        "admin_alert",
        `/admin/users/${user.userId}#meals`
      );
    } catch {
      // Don't fail the request if notification fails
    }

    return NextResponse.json({ meal }, { status: 201 });
  } catch (error) {
    console.error("Meals POST error:", error);
    return NextResponse.json({ error: "Failed to create meal" }, { status: 500 });
  }
}
