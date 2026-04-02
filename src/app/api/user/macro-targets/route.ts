import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const targets = await prisma.userMacroTarget.findUnique({
      where: { userId: session.userId },
    });

    return NextResponse.json({ targets: targets || null });
  } catch (error) {
    console.error("GET macro-targets error:", error);
    return NextResponse.json(
      { error: "Failed to load macro targets" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getCurrentUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { calories, protein, carbs, fat, goal } = body;

    if (!calories || !protein || !carbs || !fat || !goal) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const targets = await prisma.userMacroTarget.upsert({
      where: { userId: session.userId },
      update: {
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        goal,
      },
      create: {
        userId: session.userId,
        calories: Math.round(calories),
        protein: Math.round(protein),
        carbs: Math.round(carbs),
        fat: Math.round(fat),
        goal,
      },
    });

    return NextResponse.json({ targets });
  } catch (error) {
    console.error("POST macro-targets error:", error);
    return NextResponse.json(
      { error: "Failed to save macro targets" },
      { status: 500 }
    );
  }
}
