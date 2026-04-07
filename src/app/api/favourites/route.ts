import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favourites = await prisma.favourite.findMany({
      where: { userId: user.userId },
      select: { recipeId: true },
    });

    return NextResponse.json(favourites.filter(f => f.recipeId).map(f => f.recipeId));
  } catch (error) {
    console.error("Get favourites error:", error);
    return NextResponse.json(
      { error: "Failed to fetch favourites" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recipeId } = body;

    if (!recipeId) {
      return NextResponse.json(
        { error: "recipeId is required" },
        { status: 400 }
      );
    }

    // Check if favourite already exists
    const existing = await prisma.favourite.findFirst({
      where: {
        userId: user.userId,
        recipeId: parseInt(recipeId),
      },
    });

    if (existing) {
      // Unfavourite
      await prisma.favourite.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ favourited: false });
    } else {
      // Favourite
      await prisma.favourite.create({
        data: {
          userId: user.userId,
          recipeId: parseInt(recipeId),
        },
      });
      return NextResponse.json({ favourited: true });
    }
  } catch (error) {
    console.error("Toggle favourite error:", error);
    return NextResponse.json(
      { error: "Failed to toggle favourite" },
      { status: 500 }
    );
  }
}
